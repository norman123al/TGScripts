#engine v8
// ImageView imports AstrometricMetadata, whose constructor needs this module
// name. Define library constants before the FIRST include, including ImageView.
// A test that includes this script can hide an incorrect standalone load order.
// VERSION belongs to each imported library; do not inherit or leak it.
#ifdef VERSION
#undef VERSION
#endif
#define VERSION "2.2.0"
#define SETTINGS_VERSION 2
#define SETTINGS_MODULE "SQRPhotometry"
#define SOLVER_SETTINGS_MODULE "SQRPhotometrySolver"
#include <pjsr/controls/ImageView.js>
#include <pjsr/KeyCodes.jsh>
#include <pjsr/controls/DateTimeEditor.js>
#ifndef SQR_NO_PHOTOMETRY
#include <../src/scripts/AperturePhotometry/AperturePhotometryConfig.js>
#include <../src/scripts/AperturePhotometry/AperturePhotometryEngine.js>
#undef VERSION
#define VERSION "6.5.0"
#include <../src/scripts/ImageSolver/ImageSolverEngine.js>
#endif
#undef VERSION
#ifndef SQR_LIBRARY
#feature-id SubframeQualityReview : TG Scripts > Subframe Quality Review
#feature-info Review registered WBPP lights against a filter master or the best subframe, measure field quality with optional corners, and move manually rejected original light files.
#endif

/* Subframe Quality Review 0.42.3 -- PixInsight 1.9.5+, V8.
 * Original implementation for the TGScripts workflow, 2026.
 * Source images are opened for reading only. All rejection decisions are manual.
 * Uses native SubframeSelector measurements, including independent regional fits.
 */
/*
 * Workflow and data ownership
 * --------------------------
 * sqrScan builds session.groups from registered WBPP lights and verifies each
 * row.original against the raw-light root. A row holds source metadata, cached
 * regional metrics, ranking results and a separate manual reject flag.
 *
 * sqrAnalyze measures registered pixels; sqrRank only recomputes derived data.
 * Metrics use region indices: 0 field, 1 center, 2..5 the four named corners.
 * A master's comparison row is kept outside group.rows so it cannot enter the
 * subframe baselines, REVIEW quota, or original-file move loop accidentally.
 *
 * The dialog owns the in-memory session, rendered preview bitmaps and timers.
 * sqrMove and sqrRestore change original-file locations after plan confirmation.
 * Process instances store options, not measured sessions or pending decisions.
 */
// Release policy: PATCH for fixes/performance; MINOR for new features or
// meaningful behavior changes (reset PATCH to zero). Use 1.0.0 for the stable
// release milestone, then MAJOR for incompatible changes (reset MINOR/PATCH).
const SQR_VERSION='0.42.3';
const SQR_FILE=#__FILE__;
const SQR_REGIONS=['Field','Center','Top left','Top right','Bottom left','Bottom right'];

/** Defaults shared by the UI and saved process instances. Weights are relative;
 * corner measurement is opt-in, and no rejection flag is an option. */
function sqrDefaults(){return {wbpp:'',originals:'',destination:'',percent:10,measureCorners:false,reference:'best',
   patch:22,margin:2,minStars:10,signalWeight:40,starsWeight:15,fwhmWeight:25,eccentricityWeight:20,cornerWeight:20,backgroundWeight:20,skyScoreKPI:'skyQuality',belowMeanWeight:20,guideWeight:25,correlationOnly:false,rankOfRanks:false,
   maxFits:2000,displaySTF:true,alignBrightness:true,blinkInterval:.75,regionRotation:'off',reviewOrder:0,reviewReverse:false,histogramOrder:'value',scatterX:'0:fwhm',scatterY:'0:signal',logFolder:'',logTimeZone:'auto',logUTCOffset:0,guidingMode:'available',qualityCollapsed:false,inputsCollapsed:false,reviewInfoCollapsed:false,
   fwhmEnabled:true,fwhmAperture:0,fwhmSeeing:0,fwhmGoodPercent:115,fwhmMediumPercent:135,fwhmSeeingGood:1.5,fwhmSeeingMedium:2.5,fwhmAltitude:45,fwhmOptics:0,fwhmWavelengths:{},
   bortleClass:6,sqmReading:0,sqmTime:'',sqmTimeFromLog:false};}

// Approximate visual-class / surface-brightness correspondence, in mag/arcsec²:
// https://www.handprint.com/ASTRO/bortle.html . The end classes are open-ended.
// Classes 8 and 9 share one photometric range; do not invent a separating limit.
const SQR_BORTLE_RANGES=[null,[null,21.99],[21.99,21.89],[21.89,21.69],[21.69,20.49],
   [20.49,19.50],[19.50,18.94],[18.94,18.38],[18.38,null],[18.38,null]];
function sqrBortleOptions(o={}){let value=o.bortleClass??sqrDefaults().bortleClass;
   return {bortleClass:Number.isInteger(value)&&value>=0&&value<=9?value:0};}
function sqrSQMReading(o={}){return Number.isFinite(o.sqmReading)&&o.sqmReading>0&&o.sqmReading<=30?o.sqmReading:0;}
function sqrSkyComparisonEnabled(o){return !!sqrBortleOptions(o).bortleClass||sqrSQMReading(o)>0;}
function sqrBortleLabel(value){return String(value);}
// The final brightness interval covers both visual classes 8 and 9. Report
// that ambiguity rather than inventing a distinction from one meter reading.
function sqrSQMBortle(value){if(!(value>0))return 0;for(let i=1;i<=7;++i)if(value>=SQR_BORTLE_RANGES[i][1])return i;return 8;}
function sqrSkyBortleLabel(model){return model.autoBortle&&model.bortleClass===8?'8–9':sqrBortleLabel(model.bortleClass);}
/** Parse local acquisition-site time using the same evidence as the logs.
 * Require the date too: an observing session can cross midnight or span nights.
 * Never substitute this computer's timezone or silently fall back to Gaia. */
function sqrSQMTime(options,session){
   let stamp=String(options.sqmTime||'').trim().replace('T',' ');
   if(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(stamp))stamp+=':00';
   let wall=sqrLogTime(stamp,'utc');
   if(wall===null)return {time:null,reason:'Enter the SQM local date and time as YYYY-MM-DD HH:MM[:SS].'};
   let clock=sqrInferLogClock(session,options.logTimeZone,options.logUTCOffset),time=sqrLocalToUTC(wall,clock);
   return {time,reason:time===null?'SQM time has no unambiguous UTC offset. Scan images or set a custom UTC offset.':'',clock};
}
function sqrExposureMidpoint(row){let start=sqrAcquisitionTime(row),exposure=sqrExposure(row);return start===null||exposure===null?null:start+exposure*500;}
/** Suggest a picker value without claiming that it was the reading time.
 * Date arithmetic uses UTC components solely as a timezone-free wall clock. */
function sqrSQMTimeSeed(session,row,imagingStart=null){
   if(imagingStart?.text)return imagingStart.text;
   if(!session)return '';
   let candidate=row&&!row.isMaster?row:session?.groups.flatMap(g=>g.rows).find(r=>sqrExposureMidpoint(r)!==null),time=candidate?sqrExposureMidpoint(candidate):null;
   if(time===null)return '';
   let o=session.options,clock=sqrInferLogClock(session,o.logTimeZone,o.logUTCOffset);
   let offsets=clock.offsets.filter(offset=>sqrLocalToUTC(time+offset,clock)===time);
   return offsets.length===1?new Date(time+offsets[0]).toISOString().slice(0,19).replace('T',' '):'';
}
/** Convert surface brightness to the reference frame's linear pixel units.
 * ZP uses integrated stellar flux, not flux/second, so exposure is already in
 * the zero point. Pixel area is arcsec^2. The calibration pedestal is additive.
 * The selected Bortle class never sets the photometric zero point. With SQM,
 * intensity ratios instead transfer the reading from its timed reference. */
function sqrSkyToImage(magnitude,c){return c.method==='sqm'?c.pedestal+(c.anchorBackground-c.pedestal)*Math.pow(10,.4*(c.sqmReading-magnitude)):
   c.pedestal+c.pixelArea*Math.pow(10,.4*(c.zeroPoint-magnitude));}
function sqrImageToSky(value,c){return value>c.pedestal?c.method==='sqm'?c.sqmReading-2.5*Math.log10((value-c.pedestal)/(c.anchorBackground-c.pedestal)):
   c.zeroPoint-2.5*Math.log10((value-c.pedestal)/c.pixelArea):null;}
/** Gaia EDR3/DR3 to Johnson V, Riello et al. 2021, table C.2.
 * Restrict the colour range conservatively to limit L/green passband mismatch.
 * This is a V estimate, not a synthetic SQM passband measurement. */
function sqrGaiaV(m){let g=Number(m?.Gmag),bp=Number(m?.BPmag),rp=Number(m?.RPmag),x=bp-rp;
   if(![m?.Gmag,m?.BPmag,m?.RPmag].every(v=>v!==null&&v!==undefined&&String(v).trim()!==''))return null;
   return [g,bp,rp].every(Number.isFinite)&&g>0&&g<25&&bp>0&&rp>0&&x>=.5&&x<=1.5?g-(-.02704+.01424*x-.2156*x*x+.01426*x*x*x):null;}
function sqrSkyZeroPoint(stars){
   let points=stars.filter(s=>s.valid&&s.flags===0&&!s.isObject&&s.flux>0).map(s=>({star:s,v:sqrGaiaV(s.catalogMagnitudes)}))
      .filter(p=>p.v!==null).map(p=>({...p,z:p.v+2.5*Math.log10(p.star.flux)}));
   for(let i=0;i<3&&points.length;++i){let center=sqrMedian(points.map(p=>p.z)),sigma=1.4826*sqrMedian(points.map(p=>Math.abs(p.z-center))),limit=Math.max(.05,3*sigma);
      points=points.filter(p=>Math.abs(p.z-center)<=limit);}
   if(points.length<20)throw new Error('Fewer than 20 reliable Gaia colour-matched stars. No sky calibration was applied.');
   let zeroPoint=sqrMedian(points.map(p=>p.z)),scatter=1.4826*sqrMedian(points.map(p=>Math.abs(p.z-zeroPoint)));
   if(scatter>.35)throw new Error('Stellar calibration scatter exceeds 0.35 mag. No sky calibration was applied.');
   return {zeroPoint,stars:points.length,scatter};
}
function sqrSkyPixelArea(metadata,width,height){
   let x=width/2,y=height/2,a=metadata.Convert_I_RD(new Point(x,y)),b=metadata.Convert_I_RD(new Point(x+1,y)),c=metadata.Convert_I_RD(new Point(x,y+1));
   if(!a||!b||!c)throw new Error('The reference frame needs a valid astrometric solution.');
   let dra=p=>((p.x-a.x+540)%360-180)*Math.cos(a.y*Math.PI/180),area=Math.abs(dra(b)*(c.y-a.y)-dra(c)*(b.y-a.y))*3600*3600;
   if(!Number.isFinite(area)||area<=0)throw new Error('Cannot determine the reference pixel area.');return area;
}
function sqrSkyPedestal(metadata){let raw=metadata.keywords?.PEDESTAL;if(raw===undefined)return 0;
   let value=Number(String(raw).replace(/[dD]/,'e'));if(!Number.isFinite(value))throw new Error('Invalid PEDESTAL keyword.');return Math.abs(value)/65535;}
function sqrSkyColorTransfer(group){return !!group&&group.channels!==3&&['R','B'].includes(sqrFilterWavelength(group.filter).key);}
function sqrSkyFilterSupported(group){return !!group&&(group.channels===3||['L','G','R','B'].includes(sqrFilterWavelength(group.filter).key)||/^V$/i.test(String(group.filter).trim()));}
/** One reference per comparable group: nearest exposure midpoint for SQM,
 * otherwise the original default field score. Work on copies: display score
 * modes, weights and table order must not change reference selection. */
// Cache only the default-score reference, not the calibration or display score.
// Compare the ranking inputs on every lookup so in-place edits, remeasurement,
// guiding updates and rejection changes cannot leave a stale reference. A
// WeakMap keeps this transient state out of saved sessions and releases old groups.
const SQR_SKY_REFERENCES=new WeakMap;
function sqrSkyReference(session,group){
   if(!session||!group)return null;
   if(sqrSQMReading(session.options)){
      let {time}=sqrSQMTime(session.options,session);if(time===null)return null;
      // Choose by exposure midpoint, independently of display score/order.
      // Exclude masters, rejected/moved frames and unusable backgrounds.
      let rows=group.rows.filter(r=>!r.isMaster&&!r.reject&&!r.moved&&sqrExposureMidpoint(r)!==null&&
         sqrSkyBackground(r,!!session.options.measureCorners)>sqrSkyPedestal(r.registered));
      rows.sort((a,b)=>Math.abs(sqrExposureMidpoint(a)-time)-Math.abs(sqrExposureMidpoint(b)-time)||
         sqrExposureMidpoint(a)-sqrExposureMidpoint(b)||a.registered.path.localeCompare(b.registered.path));
      return rows[0]||null;
   }
   let minStars=session.options.minStars??sqrDefaults().minStars;
   let signature=JSON.stringify([minStars,!!session.guiding?.enabled,group.rows.map(r=>[
      r.registered.path,r.registered.fingerprint,r.registered.channels,r.isMaster,r.reject,r.moved,
      r.metrics,r.backgroundMeans,r.relativeTransparency,r.transparencyInfo,r.guiding,r.guideQuality,r.guidePenalty])]);
   let cached=SQR_SKY_REFERENCES.get(group);
   if(cached?.signature===signature)return cached.path===null?null:group.rows.find(r=>r.registered.path===cached.path)||null;
   let options={...sqrDefaults(),minStars},copy={...group,master:null,masterRow:null,rows:group.rows.map(r=>({...r,metrics:Object.fromEntries(Object.entries(r.metrics||{}).map(([k,v])=>[k,{...v}]))}))};
   sqrRank({options,groups:[copy],guiding:session.guiding});
   let best=copy.rows.filter(r=>!r.isMaster&&!r.reject&&!r.moved&&Number.isFinite(r.scoreWithoutCorners)&&sqrSkyBackground(r,false)>0)
      .sort((a,b)=>b.scoreWithoutCorners-a.scoreWithoutCorners||a.registered.path.localeCompare(b.registered.path))[0];
   let path=best?best.registered.path:null;SQR_SKY_REFERENCES.set(group,{signature,path});
   return best?group.rows.find(r=>r.registered.path===path):null;
}
/** A single zero point cannot be transferred between exposures, cameras,
 * gains, filters or sampling geometries. Refuse a misleading shared overlay. */
function sqrSkyComparable(a,b){
   return ['camera','filter','gain','binX','binY','width','height','channels'].every(k=>String(a[k]??'')===String(b[k]??''))&&
      a.exposure>0&&b.exposure>0&&Math.abs(a.exposure-b.exposure)<.001&&sqrSkyPedestal(a)===sqrSkyPedestal(b);
}
function sqrSkyCalibration(group){let c=group?.skyCalibration;if(!c?.valid)return null;
   let row=group.rows.find(r=>r.registered.path===c.path);
   return row&&row.registered.fingerprint===c.fingerprint&&group.rows.every(r=>sqrSkyComparable(row.registered,r.registered))?c:null;}
/** Transfer only between separate RGB filters from the same setup and field.
 * Each group must remain internally comparable. Exposure and pedestal can
 * differ between groups: the measured, pedestal-subtracted ratio includes
 * their relative response. This is a relative sky estimate, not R/B photometry. */
function sqrSkyTransferCompatible(a,b){
   return !!a.camera&&a.camera===b.camera&&['gain','binX','binY','width','height','channels','object'].every(k=>String(a[k]??'')===String(b[k]??''));
}
function sqrSkyTimedBackgrounds(group,withCorners){
   return group.rows.filter(r=>!r.isMaster&&!r.reject&&!r.moved).map(row=>({row,time:sqrExposureMidpoint(row),background:sqrSkyBackground(row,withCorners)}))
      .filter(p=>p.time!==null&&Number.isFinite(p.background)&&p.background>sqrSkyPedestal(p.row.registered))
      .sort((a,b)=>a.time-b.time||a.row.registered.path.localeCompare(b.row.registered.path));
}
/** Find the nearest-in-time G/colour pair using sorted lists and a moving
 * pointer. Do not compare every frame with every other frame. Re-evaluate
 * cached means/eligibility on lookup so remeasurement, corner toggles and
 * rejection cannot retain an obsolete transfer. No image pixels are reread. */
function sqrSkyTransferPlan(session,group){
   const fail=reason=>({valid:false,reason});
   let target=sqrSkyTimedBackgrounds(group,!!session.options.measureCorners);
   if(!target.length)return fail('Measure this group first; no eligible frame has a usable timestamp and background.');
   if(!group.rows.every(r=>sqrSkyComparable(target[0].row.registered,r.registered)))return fail('This filter group needs matching camera, gain, exposure, binning, pedestal and image dimensions.');
   let greenGroups=session.groups.filter(g=>g.channels===1&&sqrFilterWavelength(g.filter).key==='G');
   if(!greenGroups.length)return fail('Red and blue sky shading requires a measured green-filter group.');
   let best=null;
   for(let greenGroup of greenGroups){
      // Equal timestamps prefer the first path, consistently on either side
      // of the moving pointer and independently of the Review sort order.
      let green=sqrSkyTimedBackgrounds(greenGroup,!!session.options.measureCorners).filter((p,i,a)=>i===0||p.time!==a[i-1].time),reference=sqrSkyReference(session,greenGroup);
      if(!green.length||!reference||!sqrSkyTransferCompatible(target[0].row.registered,green[0].row.registered)||
         !greenGroup.rows.every(r=>sqrSkyComparable(green[0].row.registered,r.registered)))continue;
      let anchor=sqrExposureMidpoint(reference),j=0;
      for(let colour of target){
         while(j<green.length&&green[j].time<colour.time)++j;
         for(let index of [j-1,j])if(index>=0&&index<green.length){
            let g=green[index],gap=Math.abs(g.time-colour.time),distance=anchor===null?0:Math.abs(g.time-anchor),
               key=[colour.row.registered.path,g.row.registered.path].join('\n');
            if(!best||gap<best.gap||gap===best.gap&&(distance<best.distance||distance===best.distance&&
               (colour.time<best.colour.time||colour.time===best.colour.time&&key<best.key)))
               best={valid:true,greenGroup,green:g,colour,gap,distance,key};
         }
      }
   }
   return best||fail('No compatible measured green-filter group has usable timestamps and backgrounds.');
}
function sqrSkyTransferCalibration(session,plan,source){
   if(!plan?.valid||!source)return null;
   let r=plan.colour.row.registered,g=plan.green.row.registered,pedestal=sqrSkyPedestal(r),greenPedestal=sqrSkyPedestal(g),
      factor=(plan.colour.background-pedestal)/(plan.green.background-greenPedestal);
   if(!(factor>0)||!Number.isFinite(factor))return null;
   let c={...source,path:r.path,fingerprint:r.fingerprint,pedestal,channel:sqrFilterWavelength(r.filter).name,
      referenceMidpoint:plan.colour.time,backgroundBasis:session.options.measureCorners?'preview minimum':'whole image',
      transfer:{sourcePath:source.path,greenPath:g.path,greenTime:plan.green.time,colourTime:plan.colour.time,
         gap:plan.gap,factor,greenBackground:plan.green.background,colourBackground:plan.colour.background}};
   if(source.method==='sqm'){
      c.anchorBackground=pedestal+factor*(source.anchorBackground-source.pedestal);
      if(!Number.isFinite(c.anchorBackground)||!(c.anchorBackground>pedestal))return null;
   }else{
      c.zeroPoint=source.zeroPoint+2.5*Math.log10(factor);
      if(!Number.isFinite(c.zeroPoint))return null;
   }
   return c;
}
/** Keep the two calibration sources independently reusable. A change in SQM,
 * time/offset, reference eligibility or file identity cannot reuse a stale
 * overlay. Corner scoring uses the same cached background basis as the plot. */
function sqrCurrentSkyCalibration(session,group){
   if(!session||!group)return null;
   if(sqrSkyColorTransfer(group)){let plan=sqrSkyTransferPlan(session,group);return plan.valid?sqrSkyTransferCalibration(session,plan,sqrCurrentSkyCalibration(session,plan.greenGroup)):null;}
   let o=session.options,sqm=sqrSQMReading(o),stored=sqm?group.skySQMCalibration:group.skyGaiaCalibration;
   let c=sqrSkyCalibration({...group,skyCalibration:stored||group.skyCalibration});if(!c)return null;
   if((c.method==='sqm')!==!!sqm)return null;
   let row=sqrSkyReference(session,group);if(!row||row.registered.path!==c.path)return null;
   if(!sqm)return c;
   let time=sqrSQMTime(o,session).time,bg=sqrSkyBackground(row,!!o.measureCorners);
   if(time===null||c.sqmReading!==sqm||c.measurementTime!==time||!(bg>c.pedestal))return null;
   return {...c,anchorBackground:bg,backgroundBasis:o.measureCorners?'preview minimum':'whole image'};
}
function sqrBortleModel(options,group=null,session=null,calibration=undefined){
   let sqmReading=sqrSQMReading(options),autoBortle=sqmReading>0,bortleClass=autoBortle?sqrSQMBortle(sqmReading):sqrBortleOptions(options).bortleClass;
   let m={bortleClass,sqmReading,autoBortle,enabled:bortleClass>0,valid:false,reason:''};
   session={...(session||{groups:group?[group]:[]}),options};
   if(!m.enabled)return {...m,reason:'Select a Bortle class beside Calibrate sky, or enter Session SQM and its reading time.'};
   if(group&&!sqrSkyFilterSupported(group))return {...m,reason:'Sky comparison supports luminance, green, V, RGB, and red/blue estimates transferred from green.'};
   if(autoBortle){let t=sqrSQMTime(options,session);if(t.time===null)return {...m,reason:t.reason};}
   // A caller drawing the sky plot can share its already validated calibration
   // with the Calibrate sky button. Explicit null means validation found none.
   let c=calibration===undefined?sqrCurrentSkyCalibration(session,group):calibration;
   if(!c)return {...m,reason:group?.skyCalibrationError||(sqrSkyColorTransfer(group)?sqrSkyTransferPlan(session,group).reason||'Calibrate the compatible green-filter group to enable red/blue sky shading.':autoBortle?'Measure images to match an eligible exposure to the SQM reading time.':'Sky-background calibration runs after measurements, or when Bortle is selected for measured images.')};
   let [dark,bright]=SQR_BORTLE_RANGES[bortleClass]||[null,null],goodValue=dark===null?null:sqrSkyToImage(dark,c),mediumValue=bright===null?null:sqrSkyToImage(bright,c);
   // With SQM the reference background is the anchor; Gaia is not involved.
   let sqmValue=sqmReading>0?sqrSkyToImage(sqmReading,c):null;
   if(![goodValue,mediumValue,sqmValue].filter(v=>v!==null).every(v=>Number.isFinite(v)&&v>c.pedestal))return {...m,reason:'Sky conversion is outside the usable numeric range.'};
   return {...m,valid:true,calibration:c,dark,bright,goodValue,mediumValue,sqmValue};
}
function sqrBortleGrade(value,m){return m.goodValue!==null&&value<m.goodValue?'Good':m.mediumValue!==null&&value>m.mediumValue?'Bad':'Medium';}
function sqrSkyPlotDetails(m){
   if(!m?.valid)return m?.reason||'Sky calibration unavailable.';let c=m.calibration;
   if(c.transfer){let t=c.transfer;return c.channel+' relative estimate from green\nGreen calibration reference: '+sqrFileName(t.sourcePath)+
      '\nGreen transfer frame: '+sqrFileName(t.greenPath)+'\n'+c.channel+' transfer frame: '+sqrFileName(c.path)+
      '\nExposure midpoints (UTC): '+new Date(t.greenTime).toISOString()+' / '+new Date(t.colourTime).toISOString()+
      '\nPair time gap: '+(t.gap/60000).toFixed(1)+' min\nBackground basis: '+c.backgroundBasis+
      '\nMeasured backgrounds (green / '+c.channel.toLowerCase()+'): '+sqrFmt(t.greenBackground,6)+' / '+sqrFmt(t.colourBackground,6)+
      '\nRelative response: '+sqrFmt(t.factor,6)+(c.method==='sqm'?'\nSQM reading: '+c.sqmReading.toFixed(2)+' mag/arcsec² at '+new Date(c.measurementTime).toISOString()+' (UTC)':'\nGreen calibration: '+c.stars+' local Gaia stars; scatter '+c.scatter.toFixed(3)+' mag')+
      '\nAssumes similar sky brightness between the paired exposures and a stable filter response across the group. Larger time gaps, changing sky colour or transparency make this estimate less reliable. This is not independent red/blue sky photometry.';}
   return 'Reference: '+sqrFileName(c.path)+'\n'+(c.method==='sqm'?
      'Reading: '+new Date(c.measurementTime).toISOString()+' (UTC)\nExposure midpoint: '+new Date(c.referenceMidpoint).toISOString()+' (UTC)\nTime difference: '+(Math.abs(c.referenceMidpoint-c.measurementTime)/60000).toFixed(1)+' min\nBackground: '+sqrFmt(c.anchorBackground,6)+' image units ('+c.backgroundBasis+')':
      c.stars+' local Gaia stars\nCalibration scatter: '+c.scatter.toFixed(3)+' mag\nChannel: '+c.channel+(c.astrometryRebuilt?'\nSky coordinates rebuilt':''));
}
// Describe only the bands the plot can shade. Classes 8 and 9 share an
// interval, including when either class is selected manually.
function sqrBortleShading(model){
   if(!model?.valid)return [];
   let first=Math.min(8,model.bortleClass),last=first===8?9:first;
   return [{label:'Good',first:1,last:first-1,color:'#a6e3a1'},
      {label:'Medium',first,last,color:'#f9e2af'},
      {label:'Bad',first:last+1,last:9,color:'#f38ba8'}].filter(b=>b.first<=b.last);
}
/** Explain the exact automatic lookup from the same static limits that drive
 * calibration and shading. Reuse the plot's validated calibration, including
 * its current field/corner background basis; never measure again for help. */
function sqrBortleRangeInformation(model=null){
   let rows=[],calibration=model?.valid?model.calibration:null,shading=sqrBortleShading(model);
   for(let i=1;i<=8;++i){let [upper,lower]=SQR_BORTLE_RANGES[i],range=upper===null?'SQM ≥ '+lower.toFixed(2):lower===null?'SQM < '+upper.toFixed(2):lower.toFixed(2)+' ≤ SQM < '+upper.toFixed(2);
      let imageRange='—';
      if(calibration){
         let low=upper===null?null:sqrSkyToImage(upper,calibration),high=lower===null?null:sqrSkyToImage(lower,calibration);
         // Significant digits keep faint-image ranges readable without rounding
         // them all to zero. Display formatting never changes the band limits.
         const value=x=>String(Number(x.toPrecision(6)));
         if([low,high].filter(x=>x!==null).every(Number.isFinite))
            imageRange=low===null?'sky ≤ '+value(high):high===null?'sky > '+value(low):value(low)+' < sky ≤ '+value(high);
      }
      let band=shading.find(b=>i>=b.first&&i<=b.last),shade=band?
         '<td width="76" align="center" bgcolor="'+band.color+'"><font color="#263746">'+band.label+'</font></td>':'<td width="76" align="center">—</td>';
      rows.push('<tr><td>'+sqrHTML(i===8?'8–9':String(i))+'</td><td>'+sqrHTML(range)+'</td><td>'+sqrHTML(imageRange)+'</td>'+shade+'</tr>');}
   return '<h3>SQM-to-Bortle ranges</h3><p>Ranges used by this script, in mag/arcsec². Higher SQM values mean darker skies.</p>'+
      '<table width="100%" cellspacing="6" cellpadding="3"><tr><th align="left">Bortle class</th><th align="left">SQM reading</th><th align="left">Sky brightness<br/>(image units)</th><th width="76" align="center">Shading</th></tr>'+rows.join('')+'</table>'+
      '<p>'+(calibration?'Calibrated sky values use the current plot calibration; lower values mean darker skies. Values are rounded for display.':'Calibrated sky values and shading are unavailable until the plot has a usable sky calibration.')+'</p>'+
      '<p>These are approximate brightness equivalents. At an exact boundary, the automatic lookup chooses the darker class. Shading includes both boundary values in Medium. Classes 8 and 9 share one range; a reading alone cannot distinguish them.</p>';
}
/** Native rich-text tables keep samples, marker names and meanings aligned.
 * Color names remain explicit so the legend also works without color vision.
 * Only reference markers and shading relevant to this plot are included. */
function sqrPlotReadingGuide(data){
   let k=data.kpi,sky=k.key==='skyBackground';
   let axis=k.metric==='eccentricity'?'Fits all plotted eccentricities, including the master, with headroom within 0–1.':k.metric==='fwhm'&&data.fwhmBands?'Includes measured values and all grading ranges.':
      data.guideBands&&k.key==='guideMax'?'Includes zero, measured values and all guiding ranges.':
      sky?'Fits all plotted backgrounds, including the master, with headroom. Bortle and SQM limits do not expand it.':
      'Fits subframes with headroom. An outlying master is clipped and marked by an arrow; hover for its true value.';
   if(k.key==='belowMeanFraction')axis='Fits subframes with headroom, within 0–100%.';
   let order=data.order==='time'?'Earliest first; '+(data.hasMaster?'master first; ':'')+'unknown times last. Spacing shows image sequence, not elapsed time.':'Lowest to highest KPI value, independently of the Review table.';
   let tips=[['Bars',k.key==='belowMeanFraction'?'One bar per subframe; the master is excluded. A blank position means no measurement.':'One bar per image. A blank position means no measurement.'],['Inspect','Hover for image values. Click a bar to select that image in Review and measurements.'],['Order',order],['Vertical axis',axis]];
   let html='<h3>Reading the plot</h3><table width="100%" cellspacing="3" cellpadding="4">'+tips.map(([name,text])=>'<tr><td width="94" valign="top"><b>'+name+'</b></td><td>'+sqrHTML(text)+'</td></tr>').join('')+'</table>';
   html+='<h4>Colors and markers</h4><table width="100%" cellspacing="4" cellpadding="5"><tr><th width="56" align="left">Sample</th><th width="140" align="left">Marker</th><th align="left">Meaning</th></tr>';
   const group=label=>'<tr><td colspan="3" bgcolor="#e8edf2"><font color="#263746"><b>'+label+'</b></font></td></tr>';
   const item=(color,label,meaning,line=false)=>'<tr><td width="56" align="center" bgcolor="'+(line?'#252536':color)+'">'+(line?'<font color="'+color+'"><b>━ ━ ━</b></font>':'&nbsp;')+'</td><td width="140"><b>'+sqrHTML(label)+'</b></td><td>'+sqrHTML(meaning)+'</td></tr>';
   html+=group('Image bars')+[
      ['#89dceb','Cyan bar','Selected image'],['#cba6f7','Purple bar','REVIEW candidate'],['#2d6cb5','Blue bar','Other kept subframe'],['#e57373','Red bar','Rejected or moved original']
   ].map(row=>item(...row)).join('')+(data.hasMaster?item('#f9a825','Gold bar','Comparison master'):'');
   html+=group('Reference lines')+item('#a6e3a1','Green dashed','Mean of measured, unrejected subframes; excludes the master.',true);
   if(sky&&data.skyModel?.valid&&data.skyModel.sqmValue!==null)html+=item('#f5c2e7','Pink dashed','Session SQM: below the line is darker; above is brighter.',true);
   if(data.showAutofocus&&data.autofocus?.length)html+=item('#fab387','Orange / AF','Autofocus start; AF shows the final focus position when known. Hover over a tag for details. '+data.autofocus.length+' starts in range.',true);
   let shaded=!!(data.skyBands||data.guideBands||data.eccentricityBands||data.fwhmBands)?.length;
   if(shaded){
      html+=group('Background shading');
      if(sky)for(let band of sqrBortleShading(data.skyModel)){
         let classes=band.first===band.last?String(band.first):band.first+'–'+band.last;
         html+=item(band.color,(band.label==='Good'?'Green':band.label==='Medium'?'Amber':'Red')+' shading',band.label+' · Bortle '+classes);
      }else html+=item('#a6e3a1','Green shading','Good')+item('#f9e2af','Amber shading','Medium')+item('#f38ba8','Red shading','Bad');
   }
   return html+'</table><p><i>Selection overrides the bar color with cyan. A status outline may remain visible.'+(shaded?' Background shading grades the measurement; it does not indicate selection or rejection.':'')+'</i></p>';
}
function sqrPlotInformation(data){
   if(!data?.kpi)return null;let k=data.kpi,sky=k.key==='skyBackground',parts=[];
   const paragraph=text=>text?'<p>'+sqrHTML(text).replace(/\n/g,'<br/>')+'</p>':'';
   // Explanations live here only: never duplicate them in the chart header,
   // native control tooltips or footer. Bar hovers retain per-image data.
   let definition=data.scoreDefinition||k.definition;
   if(k.metric==='fwhm')definition='Full width at half maximum of the fitted star profiles in '+(k.region===0?'the usable field':SQR_REGIONS[k.region].toLowerCase())+', measured in pixels. Displayed values use one decimal place; grading and scoring use the full precision.';
   if(definition)parts.push(paragraph(definition));
   if(data.detail)parts.push(paragraph(data.detail));
   if(k.corners)parts.push(paragraph('Requires regional measurements. Stored measurements remain available for plotting when corner scoring is disabled. '+(k.region===1?'Center FWHM supplies the corner-to-center size ratios.':k.region>=2?'Individual corner measurements contribute through Corner quality with manual weights; strongly correlated KPI scoring can also select them independently.':'')));
   if(k.guiding){
      parts.push(paragraph('Guiding measurements use the log samples matched to each exposure. Missing or incomplete coverage does not count as zero error. The master has no guiding interval.'));
      if(k.key==='guideQuality')parts.push(paragraph('This combined error determines the guiding penalty in Score. It has no Good / Medium / Bad background bands.'));
      else parts.push(paragraph(Number.isFinite(data.guideScale)&&data.guideScale>0?
         'Category limits use the imaging pixel scale: Good up to one pixel scale; Medium up to 1.75 times that scale; Bad above. The smaller X/Y scale is used if they differ. These errors contribute to Score through Guiding quality.':
         'Guiding thresholds unavailable: a valid imaging pixel scale is required. These errors contribute to Score through Guiding quality.'));
   }
   if(sky){
      parts.push(paragraph('With Session SQM, the nearest eligible exposure midpoint supplies the broadband reference and its background is assigned the reading directly. Without SQM, local Gaia photometry calibrates the best default-scoring eligible subframe. Separate red and blue groups use a relative transfer from green, based on the closest-in-time pair of measured backgrounds. Choose a Bortle class to enable shading, or — to disable it. Calibrate sky appears only while a current calibration is unavailable.'));
   }
   if(!parts.length&&!data.items)return null;
   if(data.items)parts.push(sqrPlotReadingGuide(data));
   if(sky)parts.push(sqrBortleRangeInformation(data.skyModel));
   return {title:k.label+' — information',sky,plot:!!data.items,html:'<html><body>'+parts.join('')+'</body></html>'};
}
function sqrSkyMeasurementImage(window){let source=window.mainView.image;if(source.numberOfNominalChannels<3)return source;
   let green=new Image;green.assign(source,new Rect(0,0,source.width,source.height),1,1);return green;}
/** Some acquisition/WBPP headers contain approximate or stale WCS data.
 * Re-solve only the engine-owned reference window, using the local catalogue
 * that just answered the query. ImageSolver updates in-memory metadata only;
 * no save operation or diagnostic output is enabled. Keep measured fluxes. */
function sqrSkyRecoverCoordinates(engine,target,catalogId){
   console.writeln('Rebuilding reference sky coordinates with the configured local Gaia catalog...');
   let solver=new ImageSolver,window=engine.currentWindow;
   solver.metadata.ExtractMetadata(window);solver.metadata.ensureValidReferenceSystemForSolution();
   let cfg=solver.solverCfg;cfg.catalogMode=CatalogMode.LocalXPSDServer;cfg.catalog=catalogId;cfg.autoMagnitude=false;cfg.magnitude=18;
   cfg.maxIterations=20;cfg.showStars=cfg.showStarMatches=cfg.showSimplifiedSurfaces=cfg.showDistortion=false;
   cfg.generateDistortModel=cfg.generateErrorImg=false;
   solver.solveImage(window);
   target.metadata=solver.metadata;target.skyAstrometryRebuilt=true;
   // Clear accidental old associations before matching the same fluxes again.
   for(let star of target.stars){star.catalogMagnitude=null;star.catalogMagnitudes=null;star.flags|=StarFlag.Unmatched;}
}
/** Reuse the installed official AperturePhotometry engine. Query only local
 * configured Gaia databases; catalogue fallbacks reuse the measured stars.
 * The engine owns and closes its temporary image. Source files stay unchanged. */
function sqrSkyWorker(job){let result={valid:false},originalMeasurement=AperturePhotometryEngine.MeasurementImage;
   try{
      let config=new PhotometryConfiguration('SQRPhotometry');config.starSource=StarSource.Catalog;config.calibrateMagnitudes=true;
      config.catalogId='GaiaDR3_XPSD';config.catalogBand='G';config.maxStars=500;config.normalizeByExposure=false;
      config.backgroundMode=BackgroundMode.Annulus;config.photometryMode=PhotometryMode.AutoAperture;config.apertureFWHM=5;
      config.annulusInner=2.5;config.annulusOuter=4;config.detection.minSNR=20;config.detection.upperLimit=.95;
      // Photometry and the plotted background both use G for an RGB image.
      AperturePhotometryEngine.MeasurementImage=sqrSkyMeasurementImage;
      let engine=new AperturePhotometryEngine(config),catalogSources=engine.CatalogSources.bind(engine),catalogName='Gaia DR3 (local)',catalogId='GaiaDR3_XPSD';
      engine.CatalogSources=function(target){let descriptor=PhotometricCatalogById('GaiaDR3_XPSD'),create=descriptor.create;
         try{for(let [name,factory] of [['Gaia DR3/SP (local)',()=>new GaiaDR3SPXPSDCatalog],['Gaia DR3 (local)',create],['Gaia EDR3 (local)',()=>new GaiaEDR3XPSDCatalog]]){
            if(console.abortRequested)throw new Error('Operation aborted.');descriptor.create=factory;catalogName=name;catalogId=factory().name;let sources=catalogSources(target);if(sources?.length)return sources;
         }return null;}finally{descriptor.create=create;}};
      let identify=engine.Identify.bind(engine);
      engine.Identify=function(target){identify(target);
         if(!Number.isFinite(target.catalogMatched))throw new Error(engine.catalogErrors?.join('\n')||'The configured local Gaia databases returned no catalog matches.');
         if(target.catalogMatched<20&&target.stars.filter(s=>s.valid).length>=20){
            sqrSkyRecoverCoordinates(engine,target,catalogId);identify(target);
         }
      };
      engine.SetTargetFiles([job.path]);
      engine.monitor={header:s=>console.writeln(s),begin:s=>console.writeln(s),end:()=>{},note:s=>console.writeln(s),aborted:()=>console.abortRequested};
      engine.Measure((index,target)=>{
         if(target.error)throw new Error(target.error);
         // The engine's median > .05 heuristic also flags bright, long linear
         // exposures. It cannot establish a stretch; use unmodified WBPP data.
         let calibration=sqrSkyZeroPoint(target.stars),area=sqrSkyPixelArea(target.metadata,job.width,job.height);
         result={...calibration,valid:true,pixelArea:area,pedestal:job.pedestal,path:job.path,fingerprint:job.fingerprint,catalog:catalogName,channel:job.channels===3?'Green':'Mono',astrometryRebuilt:!!target.skyAstrometryRebuilt,date:new Date().toISOString()};return true;
      });
      if(!result.valid)throw new Error(engine.catalogErrors?.join('\n')||'No photometric calibration returned. Check the astrometric solution and local Gaia databases.');
   }catch(e){result={valid:false,error:e.message||String(e)};}finally{AperturePhotometryEngine.MeasurementImage=originalMeasurement;}
   return result;
}
function sqrCalibrateSky(session,group,notify){
   if(!sqrSkyFilterSupported(group))throw new Error('Sky comparison supports luminance, green, V, RGB, and red/blue estimates transferred from green.');
   if(sqrSkyColorTransfer(group)){
      let plan=sqrSkyTransferPlan(session,group);if(!plan.valid)throw new Error(plan.reason);
      let source=sqrCalibrateSky(session,plan.greenGroup,notify);
      for(let row of [plan.colour.row,plan.green.row])if(sqrFingerprint(row.registered.path)!==row.registered.fingerprint)throw new Error('A sky-transfer reference file has changed. Scan and measure again.');
      let result=sqrSkyTransferCalibration(session,plan,source);if(!result)throw new Error('The green-to-colour background conversion is outside the usable numeric range.');
      group.skyCalibration=result;delete group.skyCalibrationError;return result;
   }
   let sqm=sqrSQMReading(session.options),readingTime=sqm?sqrSQMTime(session.options,session):null;
   if(sqm&&readingTime.time===null)throw new Error(readingTime.reason);
   let row=sqrSkyReference(session,group);if(!row)throw new Error(sqm?'No eligible measured frame has a valid exposure time and background for SQM calibration.':'Measure the group first; no eligible reference has a valid default field score and background.');
   if(!group.rows.every(r=>sqrSkyComparable(row.registered,r.registered)))throw new Error('A shared sky calibration requires the same camera, filter, gain, exposure, binning, pedestal and image dimensions.');
   let path=row.registered.path,fingerprint=sqrFingerprint(path);
   if(fingerprint!==row.registered.fingerprint)throw new Error('The reference file has changed. Scan and measure again.');
   let current=sqrCurrentSkyCalibration(session,group);
   if(current){delete group.skyCalibrationError;group.skyCalibration=current;return current;}
   let job={...row.registered,path,fingerprint,pedestal:sqrSkyPedestal(row.registered)};
   if(sqm){
      if(group.skyCalibration?.valid&&group.skyCalibration.method!=='sqm'&&!group.skyGaiaCalibration)
         group.skyGaiaCalibration=group.skyCalibration;
      // A measured relative intensity needs no catalog, WCS or pixel area:
      // I(mu)-pedestal = (Iref-pedestal) * 10^[0.4*(SQM-mu)].
      // Use cached means on the same field/corner basis as the plotted KPI.
      let anchorBackground=sqrSkyBackground(row,!!session.options.measureCorners);
      let result={valid:true,method:'sqm',path,fingerprint,pedestal:job.pedestal,sqmReading:sqm,
         measurementTime:readingTime.time,referenceMidpoint:sqrExposureMidpoint(row),anchorBackground,
         backgroundBasis:session.options.measureCorners?'preview minimum':'whole image',channel:job.channels===3?'Green':'Mono'};
      group.skySQMCalibration=result;group.skyCalibration=result;delete group.skyCalibrationError;return result;
   }
   sqrTick(notify,'Calibrating sky from '+sqrFileName(path)+' — local Gaia');
   let result=sqrSkyWorker(job);if(!result.valid)throw new Error(result.error||'No sky calibration returned.');
   result.method='gaia';group.skyGaiaCalibration=result;group.skyCalibration=result;delete group.skyCalibrationError;return result;
}
/** One calibration reference per measured, compatible group. Failed/unsupported
 * groups keep their quality measurements; repeat requests reuse a valid result.
 * Called after measurement or when Bortle/SQM is specified afterwards. */
function sqrAutoCalibrateSky(session,notify){
   let result={calibrated:0,reused:0,failed:0,skipped:0};
   if(!session||!sqrSkyComparisonEnabled(session.options))return result;
   // Prepare direct calibrations first, independently of the visible group order.
   // R/B reuse green; they never launch their own photometry.
   for(let group of session.groups.slice().sort((a,b)=>Number(sqrSkyColorTransfer(a))-Number(sqrSkyColorTransfer(b)))){
      if(!sqrSkyFilterSupported(group)||!group.rows.some(r=>r.metrics[0])){++result.skipped;continue;}
      if(console.abortRequested)throw new Error('Sky-background calibration aborted.');
      try{
         // A failed green calibration must not be retried once for every colour
         // during the same measurement run. The manual button can retry later.
         if(sqrSkyColorTransfer(group)){let plan=sqrSkyTransferPlan(session,group);if(!plan.valid)throw new Error(plan.reason);
            if(!sqrCurrentSkyCalibration(session,plan.greenGroup))throw new Error(plan.greenGroup.skyCalibrationError||'The compatible green group has no usable sky calibration.');}
         let previous=sqrCurrentSkyCalibration(session,group);sqrCalibrateSky(session,group,notify);++result[previous?'reused':'calibrated'];}
      catch(e){if(console.abortRequested)throw e;group.skyCalibrationError=e.message||String(e);++result.failed;
         console.warningln('Sky brightness · '+(group.label||group.filter)+': '+group.skyCalibrationError);}
   }
   return result;
}
function sqrSkyCalibrationSummary(result){return !result?'':result.calibrated||result.reused||result.failed?
   ' Sky brightness: '+result.calibrated+' calibrated, '+result.reused+' reused'+(result.failed?', '+result.failed+' unavailable (see console)':'')+'.':'';}
function sqrSkyCalibrationText(c){if(c.transfer)return 'Sky calibrated: '+c.channel+' relative estimate from green · paired frames '+(c.transfer.gap/60000).toFixed(1)+' min apart.';
   return 'Sky calibrated: '+sqrFileName(c.path)+(c.method==='sqm'?
   ' · SQM '+c.sqmReading.toFixed(2)+' · exposure midpoint '+new Date(c.referenceMidpoint).toISOString()+' · '+
   (Math.abs(c.referenceMidpoint-c.measurementTime)/60000).toFixed(1)+' min from reading':
   ' · '+c.stars+' local Gaia stars · '+c.channel+' · scatter '+c.scatter.toFixed(3)+' mag'+(c.astrometryRebuilt?' · sky coordinates rebuilt':''));}


const SQR_FWHM_KEYS=['fwhmEnabled','fwhmAperture','fwhmSeeing','fwhmGoodPercent','fwhmMediumPercent','fwhmSeeingGood','fwhmSeeingMedium','fwhmAltitude','fwhmOptics','fwhmWavelengths'];
function sqrFWHMOptions(o={}){let defaults=sqrDefaults(),result=Object.fromEntries(SQR_FWHM_KEYS.map(key=>[key,o[key]??defaults[key]]));
   // Draft edits and process instances must not share a mutable override map.
   result.fwhmWavelengths=o.fwhmWavelengths&&typeof o.fwhmWavelengths==='object'&&!Array.isArray(o.fwhmWavelengths)?{...o.fwhmWavelengths}:{};return result;}
/** Exact filter aliases only: an unfamiliar name uses the green default.
 * Broadband values represent a passband; SII represents its two-line blend. */
function sqrFilterWavelength(filter){
   let name=String(filter??'').trim(),key=name.toUpperCase().replace(/Α/g,'A').replace(/[\s_\-\[\]]/g,'');
   let bands=[['Luminance',550,['L','LUMINANCE']],['Red',650,['R','RED']],['Green',550,['G','GREEN']],['Blue',450,['B','BLUE']],
      ['H-alpha',656.3,['H','HA','HALPHA','HYDROGENALPHA']],['OIII',500.7,['O','OIII','O3']],['SII',672.4,['S','SII','S2']]];
   let band=bands.find(b=>b[2].includes(key));return {filter:name,key:band?band[2][0]:'?'+key,name:band?band[0]:'Green default',nm:band?band[1]:550,known:!!band};
}
function sqrFilterWavelengthText(band,wavelength=band.nm,custom=false){return 'Filter '+(band.filter||'(not selected)')+' → '+band.name+': '+sqrFmt(wavelength,1)+' nm'+(custom?' (custom)':'');}
/** Fixed, user-selected acceptance limits, not a fit to each exposure's blur.
 * Independent Gaussian variances add; applying this to atmospheric/Airy/Moffat
 * FWHM is only an approximation. Guiding and guide-camera autofocus data do not
 * enter this model. The optional optical allowance is supplied independently.
 * Aperture and reference altitude are always explicit user parameters.
 * Optical/seeing model: https://www.eso.org/observing/etc/doc/helperis.html
 * Seeing exponents: https://www.gtc.iac.es/observing/toolbox.php
 * Our zenith seeing reference is 550 nm instead of these sources' 500 nm. */
function sqrFWHMModel(options,scale,filter=''){
   let o=sqrFWHMOptions(options),m={enabled:!!o.fwhmEnabled,valid:false,parametersValid:false,reason:''};
   const fail=reason=>({...m,reason});
   if(!m.enabled)return {...m,parametersValid:true,reason:'FWHM quality bands are disabled.'};
   for(let key of SQR_FWHM_KEYS.filter(k=>!['fwhmEnabled','fwhmWavelengths'].includes(k)))if(!Number.isFinite(o[key]))return fail('FWHM grading parameters must be finite numbers.');
   if(o.fwhmAperture<=0||o.fwhmAperture>50000)return fail('Enter the telescope aperture in Input files and observing conditions (greater than 0 mm).');
   if(o.fwhmSeeing<0)return fail('Zenith seeing must not be negative; use zero when no estimate is available.');
   m.mode=o.fwhmSeeing>0?'relative':'fixed';m.seeing=o.fwhmSeeing;
   if(m.mode==='fixed'&&(o.fwhmSeeingGood<=0||o.fwhmSeeingMedium<=o.fwhmSeeingGood))return fail('Seeing limits must be positive, with Medium greater than Good.');
   if(m.mode==='relative'&&(o.fwhmGoodPercent<=0||o.fwhmMediumPercent<=o.fwhmGoodPercent))return fail('Relative limits must be positive, with Medium greater than Good.');
   if(o.fwhmAltitude<15||o.fwhmAltitude>90)return fail('Reference target altitude must be between 15° and 90°.');
   if(o.fwhmOptics<0)return fail('Extra optical blur must not be negative.');
   m.aperture=o.fwhmAperture;m.altitude=o.fwhmAltitude;m.filter=sqrFilterWavelength(filter);
   m.customWavelength=Object.prototype.hasOwnProperty.call(o.fwhmWavelengths,m.filter.key);m.wavelength=m.customWavelength?o.fwhmWavelengths[m.filter.key]:m.filter.nm;
   if(!Number.isFinite(m.wavelength)||m.wavelength<300||m.wavelength>2500)return fail('Effective wavelength must be between 300 and 2500 nm.');
   m.parametersValid=true;
   m.airmass=1/Math.sin(o.fwhmAltitude*Math.PI/180);
   let seeingCorrection=Math.pow(m.airmass,.6)*Math.pow(m.wavelength/550,-.2);
   m.diffraction=1.028*(180*3600/Math.PI)*m.wavelength*1e-6/o.fwhmAperture;
   m.seeingGood=o.fwhmSeeingGood*seeingCorrection;m.seeingMedium=o.fwhmSeeingMedium*seeingCorrection;
   m.optics=o.fwhmOptics;
   if(m.mode==='relative'){
      m.correctedSeeing=o.fwhmSeeing*seeingCorrection;m.expectedArcsec=Math.hypot(m.diffraction,m.correctedSeeing,m.optics);
      m.goodPercent=o.fwhmGoodPercent;m.mediumPercent=o.fwhmMediumPercent;
      m.goodArcsec=m.expectedArcsec*m.goodPercent/100;m.mediumArcsec=m.expectedArcsec*m.mediumPercent/100;
   }else{
      m.goodArcsec=Math.hypot(m.diffraction,m.seeingGood,m.optics);
      m.mediumArcsec=Math.hypot(m.diffraction,m.seeingMedium,m.optics);
   }
   if(!Number.isFinite(m.goodArcsec)||!Number.isFinite(m.mediumArcsec)||m.mediumArcsec<=m.goodArcsec)return fail('The FWHM limits are not numerically distinguishable. Check the input values.');
   // The measured scalar FWHM has no angular axis information. Do not silently
   // use the conservative min(X,Y) scale intended for the guiding thresholds.
   if(scale?.reason)return fail('Image pixel scale unavailable: '+scale.reason+'.');
   if(!Number.isFinite(scale?.x)||!Number.isFinite(scale?.y)||scale.x<=0||scale.y<=0)return fail('A valid image pixel scale on both axes is required. Scan images with matching masters.');
   if(Math.abs(scale.x-scale.y)/Math.max(scale.x,scale.y)>.001)return fail('X/Y pixel scales differ by more than 0.1%; scalar FWHM grading is unavailable.');
   m.scale=(scale.x+scale.y)/2;m.good=m.goodArcsec/m.scale;m.medium=m.mediumArcsec/m.scale;
   if(m.mode==='relative')m.expected=m.expectedArcsec/m.scale;
   if(!Number.isFinite(m.good)||!Number.isFinite(m.medium)||m.medium<=m.good)return fail('The calculated FWHM limits are invalid for this pixel scale.');
   return {...m,valid:true};
}
function sqrFWHMCategory(value,model){return model?.valid&&Number.isFinite(value)&&value>=0?(value<=model.good?'Good':value<=model.medium?'Medium':'Bad'):'Unavailable';}
function sqrFWHMDescription(model,includeLimits=true){
   if(!model?.valid)return model?.reason||'Set the telescope aperture and reference conditions in FWHM grading.';
   return (model.mode==='relative'?'Expected FWHM '+sqrFmt(model.expected,1)+' px for zenith seeing '+sqrFmt(model.seeing,2)+'″. ':'')+(includeLimits?'Model limits: Good ≤ '+sqrFmt(model.good,1)+' px · Medium ≤ '+sqrFmt(model.medium,1)+' px · Bad above. ':'')+'Aperture '+sqrFmt(model.aperture,0)+' mm, altitude '+sqrFmt(model.altitude,1)+'°. '+sqrFilterWavelengthText(model.filter,model.wavelength,model.customWavelength)+'.';
}
/** Keep the model explanation readable in PixInsight's native rich-text view.
 * Values come from the current model; rounding is presentation-only. */
function sqrFWHMModelInformation(m){
   const table=rows=>'<table width="100%" cellspacing="3" cellpadding="4">'+rows.map(([label,value])=>'<tr><td width="210"><b>'+sqrHTML(label)+'</b></td><td>'+sqrHTML(value)+'</td></tr>').join('')+'</table>';
   let html='<html><body><h3>Current grading</h3>';
   if(m?.valid){
      html+='<p>'+(m.mode==='relative'?'<b>Expected FWHM: '+sqrFmt(m.expected,1)+' px</b><br/>Limits are '+sqrFmt(m.goodPercent,1)+'% and '+sqrFmt(m.mediumPercent,1)+'% of the expected width.':'Limits use the chosen Good and Medium seeing conditions.')+'</p>';
      html+='<table width="100%" cellspacing="3" cellpadding="5"><tr><th align="left" width="210">Grade</th><th align="left">Measured FWHM</th></tr>'+[
         ['Good','#e0f0e4','≤ '+sqrFmt(m.good,1)+' px'],['Medium','#fff0cd','> '+sqrFmt(m.good,1)+' to '+sqrFmt(m.medium,1)+' px'],['Bad','#f9dfe2','> '+sqrFmt(m.medium,1)+' px']
      ].map(([label,color,value])=>'<tr><td bgcolor="'+color+'"><font color="#263746"><b>'+label+'</b></font></td><td>'+sqrHTML(value)+'</td></tr>').join('')+'</table>';
      html+='<h3>Reference conditions</h3>'+table([
         ['Telescope aperture',sqrFmt(m.aperture,0)+' mm'],['Target altitude',sqrFmt(m.altitude,1)+'° · airmass '+sqrFmt(m.airmass,2)],
         ['Filter and wavelength',(m.filter.filter||'Not selected')+' · '+m.filter.name+' · '+sqrFmt(m.wavelength,1)+' nm'+(m.customWavelength?' (custom)':'')],
         ['Image scale',sqrFmt(m.scale,3)+' arcsec/pixel'],
         ['Zenith seeing (550 nm)',m.mode==='relative'?sqrFmt(m.seeing,2)+' arcsec':'Good: '+sqrFmt(m.seeingGood/Math.pow(m.airmass,.6)/Math.pow(m.wavelength/550,-.2),2)+' arcsec; Medium: '+sqrFmt(m.seeingMedium/Math.pow(m.airmass,.6)/Math.pow(m.wavelength/550,-.2),2)+' arcsec']
      ]);
      html+='<h3>Blur contributions</h3>'+table([
         ['Diffraction',sqrFmt(m.diffraction/m.scale,1)+' px'],
         ['Seeing at target',m.mode==='relative'?sqrFmt(m.correctedSeeing/m.scale,1)+' px':'Good boundary: '+sqrFmt(m.seeingGood/m.scale,1)+' px; Medium boundary: '+sqrFmt(m.seeingMedium/m.scale,1)+' px'],
         ['Additional optical blur',sqrFmt(m.optics/m.scale,1)+' px']
      ]);
   }else html+='<p>'+sqrHTML(m?.reason||'Set the telescope aperture and reference conditions.')+'</p>';
   html+='<h3>How the limits are calculated</h3><p><b>Total FWHM = √(diffraction² + corrected seeing² + optical blur²)</b></p>'+
      '<p>Seeing is adjusted for altitude and wavelength. The image scale converts the resulting width to pixels. Values are shown with one decimal place; grading uses full precision.</p>'+
      '<h3>Where the inputs come from</h3><p>Set aperture and zenith seeing in <b>Input files and observing conditions</b>. Image scale comes from the master metadata. Set altitude, wavelength and optional optical blur in <b>FWHM grading</b>.</p>'+
      '<h3>Filter wavelength defaults</h3>'+table([['L / G / unknown','550.0 nm'],['R','650.0 nm'],['B','450.0 nm'],['H (H-alpha)','656.3 nm'],['O (OIII)','500.7 nm'],['S (SII)','672.4 nm']])+
      '<p>Broadband wavelengths are representative values.</p><h3>Using the model</h3><p>This is an approximate visual grading guide. Real star profiles and image sampling can differ. Guide-camera data are excluded. The bands do not change scores or rejection decisions.</p></body></html>';
   return {title:'FWHM grading — model information',model:true,html};
}
// Validate saved intervals as well as UI input; legacy instances use the default.
function sqrBlinkInterval(value){return Number.isFinite(value)?Math.max(.1,Math.min(10,value)):sqrDefaults().blinkInterval;}
// Normalize paths for I/O, then compare case-insensitively for this Windows
// workflow. The trailing slash in sqrUnder prevents matching a sibling prefix.
function sqrPath(p){return File.fullPath(String(p).trim()).replace(/\\/g,'/').replace(/\/$/,'');}
function sqrKey(p){let s=String(p).replace(/\\/g,'/').replace(/\/$/,'');return s.toLowerCase();}
function sqrUnder(p,root){return sqrKey(p)===sqrKey(root)||sqrKey(p).startsWith(sqrKey(root)+'/');}
function sqrDir(p){return File.extractDrive(p)+File.extractDirectory(p);}
// New instances save one shared log folder. Import an older single-log setting
// as its parent folder; an explicit new (even empty) folder takes precedence.
function sqrLogFolderOption(o={}){
   if(typeof o.logFolder==='string')return o.logFolder.trim();
   let old=String(o.autorunLog||'').trim();return old?sqrDir(old):'';
}
/** Resolve the standard installed PIDoc manual first. The remaining paths
 * support a repository checkout or a local bundle without registering it.
 * Explicit parameters make the same path rules usable by validation harnesses. */
function sqrDocumentationPath(scriptFile=SQR_FILE,docDirectory=CoreApplication.docDirPath){
   let relative='/scripts/SubframeQualityReview/SubframeQualityReview.html',dir=sqrDir(scriptFile);
   let candidates=[docDirectory.replace(/[\\/]+$/,'')+relative,
      File.fullPath(dir+'/../../../doc'+relative),dir+'/doc'+relative,dir+'/SubframeQualityReview.html'];
   return candidates.find(path=>File.exists(path))||'';
}
function sqrShowDocumentation(){
   let page=sqrDocumentationPath();
   if(page)Dialog.openBrowser(page,'Subframe Quality Review - User Guide');
   else new MessageBox('The Subframe Quality Review user guide is missing. Check that the TGScripts installation includes its documentation.',
      'User documentation not found',StdIcon.Warning,StdButton.Ok).execute();
}
function sqrBase(p){return File.extractName(p);}
function sqrFileName(p){return File.extractNameAndSuffix(p);}
function sqrImageFile(p){return /\.(xisf|fit|fits|fts)$/i.test(p);}
// Robust group statistics ignore unavailable values. The scale floor prevents
// a nearly identical set of measurements from producing unbounded penalties.
function sqrMedian(a){let s=a.filter(Number.isFinite).sort((a,b)=>a-b),n=s.length;return n?(n%2?s[(n-1)/2]:(s[n/2-1]+s[n/2])/2):NaN;}
function sqrSummary(a){let m=sqrMedian(a),mad=sqrMedian(a.map(x=>Math.abs(x-m)));return {median:m,scale:Math.max(1.4826*mad,Math.abs(m)*0.02,1e-12)};}
/** Convert a measurement to a nonnegative, capped poor-quality deviation.
 * lower=true means a smaller value is worse; better-than-median values add zero.
 * Missing-data flags are handled separately by sqrRank, not inferred from zero. */
function sqrBad(x,s,lower){return Number.isFinite(x)&&Number.isFinite(s.median)?Math.min(10,Math.max(0,(lower?s.median-x:x-s.median)/s.scale)):0;}
function sqrFmt(x,n=3){return Number.isFinite(x)?x.toFixed(n):'n/a';}
// Report guiding to tenths, including decimal half-way values such as 0.95.
// This is presentation only; never feed rounded values back into scoring.
function sqrGuideNumber(x){return Number.isFinite(x)?(Math.round((x+Number.EPSILON)*10)/10).toFixed(1):'n/a';}
function sqrStamp(){return new Date().toISOString().replace(/[:.]/g,'-');}
// Size and modification time detect changes since scanning; this is a cheap
// identity check for cache/move validation, not a cryptographic content hash.
function sqrFingerprint(path){let f=new FileInfo(path);if(!f.exists||!f.isFile)throw new Error('Missing file: '+path);return String(f.size)+'|'+f.lastModified.toISOString();}
// Long loops yield to PixInsight, report progress and honor console aborts.
function sqrTick(notify,text){if(notify)notify(text);CoreApplication.processEvents();if(console.abortRequested)throw new Error('Operation aborted.');}
/** Recursively collect supported image paths, skipping explicit exclusions
 * and symbolic links so a scan does not escape through a linked directory. */
function sqrWalk(root,exclude=[]){
   let files=[];let visit=dir=>{
      if(exclude.some(p=>p&&sqrUnder(dir,p)))return;
      let f=new FileFind;
      if(f.begin(dir+'/*'))try{do{
         if(f.name==='.'||f.name==='..'||f.isSymbolicLink)continue;
         let p=dir+'/'+f.name;if(f.isDirectory)visit(p);else if(sqrImageFile(p))files.push(p);
      }while(f.next());}finally{f.end();}
   };visit(sqrPath(root));return files.sort();
}
function sqrUnquote(v){let s=String(v||'').trim();return (s.startsWith("'")&&s.endsWith("'")?s.slice(1,-1).replace(/''/g,"'"):s).trim();}
/** Read headers and image geometry without loading pixels. Multi-image files
 * are rejected by default; master reading may explicitly allow the first image.
 * The format instance is always closed, including on malformed-file errors. */
function sqrMetadata(path,allowMultiple=false){
   let f=new FileFormatInstance(new FileFormat(File.extractExtension(path),true,false));
   try{
      let d=f.open(path,'verbosity 0');if(!d||!d.length||(!allowMultiple&&d.length!==1))throw new Error('Expected one image: '+path);
      let k={};for(let v of f.keywords)k[v.name.toUpperCase()]=sqrUnquote(v.value);
      // Camera identification may be stored only as an XISF property. Masters
      // additionally need three scalar scale properties; never load pixels.
      let ids=['Instrument:Camera:Name'];if(allowMultiple)ids.push('Instrument:Telescope:FocalLength','Instrument:Sensor:XPixelSize','Instrument:Sensor:YPixelSize','Instrument:FrameExposureTime');
      let properties={};if(f.format.canStoreImageProperties)for(let p of f.imageProperties){
         // Installed PJSR returns [id,type]; accept named descriptors as well.
         let id=Array.isArray(p)?p[0]:p.id;
         if(ids.includes(id))properties[id]=f.readImageProperty(id);
      }
      return {path:path,fingerprint:sqrFingerprint(path),width:d[0].width,height:d[0].height,
         channels:d[0].numberOfChannels,keywords:k,properties,date:k['DATE-OBS']||k.DATEOBS||'',
         camera:sqrUnquote(properties['Instrument:Camera:Name'])||k.INSTRUME||'',filter:k.FILTER||'',
         // An averaged WBPP master retains the normalization frame's exposure.
         // Total integration time is NOT the exposure represented by its pixels.
         exposure:sqrPositiveMetadata(properties['Instrument:FrameExposureTime'])??sqrPositiveMetadata(k.EXPTIME)??sqrPositiveMetadata(k.EXPOSURE)??0,
         binX:k.XBINNING||k.CCDXBIN||'',binY:k.YBINNING||k.CCDYBIN||'',gain:k.GAIN||'',
         object:k.OBJECT||'',type:k.IMAGETYP||k.FRAME||''};
   }finally{f.close();}
}
// FITS may use D for a scientific-notation exponent. Reject missing, nonnumeric,
// zero and negative values instead of producing a plausible but incorrect scale.
function sqrPositiveMetadata(value){let n=Number(sqrUnquote(value).replace(/[dD]/,'e'));return Number.isFinite(n)&&n>0?n:null;}
/** Nominal angular sampling from focal length and effective image-pixel size.
 * XISF focal lengths are in metres; FITS FOCALLEN is in millimetres. Both pixel
 * sizes are in micrometres and already include binning (PixInsight convention).
 * Never multiply by XBINNING/YBINNING again or assume a missing axis is square. */
function sqrPixelScale(metadata){
   let p=metadata.properties||{},k=metadata.keywords||{},f=sqrPositiveMetadata(p['Instrument:Telescope:FocalLength']);
   let focalLength=f!==null?f*1000:sqrPositiveMetadata(k.FOCALLEN);
   let pixelSizeX=sqrPositiveMetadata(p['Instrument:Sensor:XPixelSize'])??sqrPositiveMetadata(k.XPIXSZ)??sqrPositiveMetadata(k.PIXSIZE);
   let pixelSizeY=sqrPositiveMetadata(p['Instrument:Sensor:YPixelSize'])??sqrPositiveMetadata(k.YPIXSZ)??sqrPositiveMetadata(k.PIXSIZE);
   const arcsecPerRadian=180*3600/Math.PI;
   const scale=pixel=>{let n=focalLength&&pixel?arcsecPerRadian*pixel/(1000*focalLength):null;return Number.isFinite(n)&&n>0?n:null;};
   return {x:scale(pixelSizeX),y:scale(pixelSizeY),focalLength,pixelSizeX,pixelSizeY,camera:metadata.camera||'',width:metadata.width,height:metadata.height,
      reason:!focalLength?'missing or invalid focal length':!pixelSizeX&&!pixelSizeY?'missing or invalid pixel size':''};
}
// Cache one header read per matched master/group. Status updates and blinking
// reuse this result; rescanning builds fresh groups and refreshes the metadata.
function sqrMasterScale(group){
   if(!group)return {x:null,y:null,reason:'no group selected'};
   let path=group.master||'';if(group.pixelScale?.path===path)return group.pixelScale;
   let result={x:null,y:null,reason:'no matched master'};
   if(path)try{result=sqrPixelScale(sqrMetadata(path,true));}
   catch(e){if(console.abortRequested)throw e;result.reason='master metadata could not be read';result.error=String(e);}
   return group.pixelScale={...result,path};
}
/** One camera and one nominal sampling for the entire review, independent of
 * filter selection. Verify every registered frame, associated original and
 * matched master. Missing identities remain explicitly unverified. */
function sqrSessionPixelScale(session){
   let result={x:null,y:null,cameras:[],missingCamera:[],masters:[],reason:'no images scanned'},names={},seen=new Set;
   if(!session?.groups?.length)return result;
   const camera=m=>{if(!m?.path||seen.has(sqrKey(m.path)))return;seen.add(sqrKey(m.path));
      let name=String(m.camera||'').trim().replace(/\s+/g,' ');if(name)names[name.toLowerCase()]??=name;else result.missingCamera.push(m.path);};
   let mismatch=false;
   for(let g of session.groups){
      for(let r of g.rows){camera(r.registered);camera(r.original);}
      let s=sqrMasterScale(g);if(s.path){camera(s);if(!result.masters.some(m=>sqrKey(m.path)===sqrKey(s.path)))result.masters.push(s);
         mismatch||=(g.width>0&&s.width>0&&s.width!==g.width)||(g.height>0&&s.height>0&&s.height!==g.height);}
   }
   result.cameras=Object.values(names).sort();
   if(result.cameras.length>1){result.reason='different cameras in the input images';return result;}
   if(mismatch){result.reason='master and registered image dimensions differ';return result;}
   // Compare at the displayed precision, allowing insignificant header rounding.
   // A shared camera alone cannot guarantee equal sampling with different optics
   // or binning, so conflicting master scales are never silently combined.
   for(let axis of ['x','y']){let values=result.masters.map(m=>m[axis]).filter(v=>Number.isFinite(v)&&v>0);
      if(new Set(values.map(v=>v.toFixed(3))).size>1){result.reason='master scales disagree; check focal length, pixel size and binning';return result;}
      result[axis]=values.length?sqrMedian(values):null;
   }
   result.reason=result.x===null&&result.y===null?(result.masters[0]?.reason||'no matched master'):'';return result;
}
function sqrPixelScaleText(s){
   let value=s.reason?'unavailable — '+s.reason:s.x!==null&&s.y!==null&&s.x.toFixed(3)===s.y.toFixed(3)?s.x.toFixed(3)+' arcsec/pixel':
      'X '+(s.x===null?'unavailable':s.x.toFixed(3))+' · Y '+(s.y===null?'unavailable':s.y.toFixed(3))+' arcsec/pixel';
   let camera=s.cameras.length?s.cameras.join(', '):'unavailable';if(s.missingCamera.length)camera+=' (not fully verified)';
   return 'Pixel scale: '+value+' · Camera: '+camera;
}
function sqrIsLight(m){
   if(/master|flat|dark|bias/i.test(m.type)||/^master/i.test(sqrBase(m.path)))return false;
   return /light|science|object/i.test(m.type)||(!m.type&&/^light[_ -]/i.test(sqrBase(m.path)));
}
// Optional header fields constrain a match when both sides provide them.
// sqrFindOriginal adds mandatory date, camera and exposure requirements.
function sqrCompatible(a,b){
   if(a.date&&b.date&&a.date!==b.date)return false;
   for(let k of ['camera','filter','binX','binY','gain','object'])if(a[k]&&b[k]&&a[k]!==b[k])return false;
   return !(a.exposure&&b.exposure&&Math.abs(a.exposure-b.exposure)>0.001);
}
function sqrSourceStem(p){return sqrBase(p).replace(/(?:_(?:c|cc|d|r|a|ln|n))+$/i,'').toLowerCase();}
// Build once per scan. Buckets retain duplicates and input order; they narrow
// the lookup only, leaving identity and ambiguity checks to sqrFindOriginal.
function sqrIndexOriginals(raws){
   let names=new Map,dates=new Map;
   for(let r of raws){let name=sqrBase(r.path).toLowerCase();
      if(!names.has(name))names.set(name,[]);names.get(name).push(r);
      if(r.date){if(!dates.has(r.date))dates.set(r.date,[]);dates.get(r.date).push(r);}}
   return {names,dates};
}
/** Match a processed light to exactly one original. A stripped WBPP filename
 * is a candidate lookup, not proof of identity: acquisition metadata must agree.
 * Ambiguity remains unresolved and blocks moving that original. */
function sqrFindOriginal(reg,raws,index=null){
   let stem=sqrSourceStem(reg.path),named=index?(index.names.get(stem)||[]):raws.filter(r=>sqrBase(r.path).toLowerCase()===stem);
   // Retain all duplicates and the original name-before-date rule. An
   // incompatible name match must not fall back to another exposure by date.
   let candidates=named.length?named:index?(reg.date?index.dates.get(reg.date)||[]:[]):raws.filter(r=>reg.date&&r.date===reg.date);
   candidates=candidates.filter(r=>sqrCompatible(reg,r)&&reg.date&&r.date===reg.date&&reg.camera&&r.camera===reg.camera&&reg.exposure>0&&r.exposure>0);
   return candidates.length===1?{raw:candidates[0],state:'Verified'}:
      {raw:null,state:candidates.length>1?'Ambiguous original':'Original not verified'};
}
/** Find a filter master, using the WBPP group name to resolve multiple masters
 * for one filter. An empty result is deliberate when the association is unclear. */
function sqrMasterFor(group,masters){
   let filter=String(group.filter||'').trim().toLowerCase();if(!filter)return '';
   let matches=masters.filter(p=>/^masterLight(?:_|$)/i.test(sqrBase(p))&&sqrFilterFromName(p).toLowerCase()===filter);
   if(matches.length===1)return matches[0];
   // Several integrations can share a filter, e.g. distinct exposure groups.
   let name=group.directoryName.replace(/^Light_/i,'masterLight_');
   let exact=matches.filter(p=>sqrBase(p).toLowerCase()===name.toLowerCase());
   return exact.length===1?exact[0]:'';
}
function sqrFilterFromName(path){let name=sqrFileName(path).replace(/\.(xisf|fit|fits|fts)$/i,'');return ((name.match(/(?:^|_)FILTER[-_](.+?)(?:_(?:mono|cfa|rgb)(?:_|$)|$)/i)||[])[1]||'').trim();}
// Reuse the master row object while its path is unchanged: selection and cached
// measurements refer to this same object across table and plot refreshes.
function sqrMasterRow(group){
   if(!group.master){group.masterRow=null;return null;}
   if(!group.masterRow||sqrKey(group.masterRow.registered.path)!==sqrKey(group.master))group.masterRow={isMaster:true,
      registered:{path:group.master},original:null,match:'Integrated master',reject:false,moved:false,candidate:false,score:null,metrics:{},
      reasons:['Integrated master: comparison only; cannot be rejected.']};
   return group.masterRow;
}
function sqrGroupRows(group){let master=sqrMasterRow(group);return master?[...group.rows,master]:group.rows;}
/** Return UTC epoch milliseconds, or null when neither metadata source is valid.
 * Prefer the verified original, then the registered header; combine DATE-OBS and
 * TIME-OBS when needed. Offset-free observation times are interpreted as UTC.
 * Filename counters and local-clock filename strings never break timestamp ties. */
function sqrAcquisitionTime(row){
   for(let meta of [row.original,row.registered]){
      if(!meta)continue;let stamp=String(meta.date||'').trim();
      if(/^\d{4}-\d{2}-\d{2}$/.test(stamp))stamp+='T'+String(meta.keywords?.['TIME-OBS']||meta.keywords?.TIMEOBS||'').trim();
      let m=stamp.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})(\.\d+)?(Z|[+-]\d{2}:?\d{2})?$/i);
      if(!m)continue;
      let [year,month,day,hour,minute,second]=m.slice(1,7).map(Number);
      if(month<1||month>12||day<1||day>new Date(Date.UTC(year,month,0)).getUTCDate()||hour>23||minute>59||second>59)continue;
      let zone=m[8]||'Z';if(/^[+-]\d{4}$/.test(zone))zone=zone.slice(0,3)+':'+zone.slice(3);
      let value=Date.parse(m[1]+'-'+m[2]+'-'+m[3]+'T'+m[4]+':'+m[5]+':'+m[6]+(m[7]||'')+zone.toUpperCase());
      if(Number.isFinite(value))return value;
   }return null;
}
function sqrAcquisitionLabel(row){let time=sqrAcquisitionTime(row);return time===null?'Acquisition time unavailable':'Acquired: '+new Date(time).toISOString()+' (UTC)';}
function sqrAcquisitionText(row){let time=row.isMaster?null:sqrAcquisitionTime(row);return time===null?'—':new Date(time).toISOString().replace('T',' ').replace('Z','');}
// Logs carry local wall time. The UI supplies the inferred/custom conversion;
// legacy local/UTC modes remain available only to callers of this helper.
function sqrLogTime(stamp,zone='local',offset=0){
   let m=stamp.match(/^(\d{4})[-/](\d{2})[-/](\d{2}) (\d{2}):(\d{2}):(\d{2})$/);if(!m)return null;
   let [year,month,day,hour,minute,second]=m.slice(1).map(Number);
   if(month<1||month>12||day<1||day>new Date(Date.UTC(year,month,0)).getUTCDate()||hour>23||minute>59||second>59)return null;
   let wall=Date.UTC(year,month-1,day,hour,minute,second);if(typeof zone==='function')return zone(wall);
   if(zone==='auto')return null;
   if(zone==='local')return new Date(year,month-1,day,hour,minute,second).getTime();
   if(zone==='offset'&&(!Number.isFinite(offset)||offset<-12||offset>14))return null;
   return wall-(zone==='offset'?offset*3600000:0);
}
// Read supported logs once, directly in the selected folder. Translations,
// subdirectories and symlinks do not add duplicate or unrelated observations.
function sqrIsAutorunLog(name){return /^Autorun_log(?:_|\.|$)/i.test(name);}
function sqrIsGuideLog(name){return /^PHD2_GuideLog(?:_|\.|$)/i.test(name);}
function sqrIsTranslatedLog(name){return /_CHN(?:_|\.|$)/i.test(name);}
function sqrReadLogFolder(folder){
   let dir=sqrPath(folder),paths=[],ignoredCHN=0;
   if(!File.directoryExists(dir))throw new Error('Log folder does not exist or is not accessible: '+folder);
   let find=new FileFind;
   if(find.begin(dir+'/*'))try{do{
      if(find.isDirectory||find.isSymbolicLink||(!sqrIsAutorunLog(find.name)&&!sqrIsGuideLog(find.name)))continue;
      if(sqrIsTranslatedLog(find.name)){++ignoredCHN;continue;}
      paths.push(dir+'/'+find.name);
   }while(find.next());}finally{find.end();}
   paths.sort((a,b)=>sqrKey(a).localeCompare(sqrKey(b)));
   let files=paths.map(path=>{
      try{return {path,text:File.readTextFile(path)};}
      catch(e){return {path,text:'',error:e.message||String(e)};}
   });
   return {files:files.filter(f=>sqrIsAutorunLog(sqrFileName(f.path))),guideFiles:files.filter(f=>sqrIsGuideLog(sqrFileName(f.path))),ignoredCHN};
}
/** Use the first explicitly logged LIGHT sequence, not the log's creation,
 * an Autorun start that may shoot flats, or a focusing/plate-solving exposure.
 * UTC components represent local wall time only; no timezone conversion is
 * needed to fill the local SQM editor. Parse cached text once per folder load. */
function sqrAutorunImagingStart(files){
   let first=null;
   for(let file of files){
      let name=sqrFileName(file.path);if(file.error||!sqrIsAutorunLog(name)||sqrIsTranslatedLog(name))continue;
      for(let line of String(file.text||'').split(/\r?\n|\r/)){
         let m=line.match(/^\s*(\d{4}[-/]\d{2}[-/]\d{2} \d{2}:\d{2}:\d{2})\s+Shooting\s+[1-9]\d*\s+light\s+frames?\b/i);if(!m)continue;
         let wallTime=sqrLogTime(m[1],'utc');if(wallTime===null)continue;
         if(!first||wallTime<first.wallTime||wallTime===first.wallTime&&sqrKey(file.path)<sqrKey(first.path))
            first={wallTime,text:new Date(wallTime).toISOString().slice(0,19).replace('T',' '),path:file.path};
      }
   }
   return first;
}
/** Filename clocks can refer to exposure start or completion. Compare both
 * against DATE-OBS and EXPTIME, allowing five seconds for rounding/readout.
 * Modern UTC offsets use 15-minute increments. Ambiguous candidates are kept
 * unresolved instead of guessing an offset from this computer's timezone. */
function sqrFilenameClock(path){
   let name=sqrFileName(path),matches=Array.from(name.matchAll(/(?:^|_)(\d{4})(\d{2})(\d{2})[-_](\d{2})(\d{2})(\d{2})(?=_|\.|$)/g));
   if(matches.length!==1)return null;let m=matches[0];return sqrLogTime(m[1]+'/'+m[2]+'/'+m[3]+' '+m[4]+':'+m[5]+':'+m[6],'utc');
}
function sqrExposure(row){let n=Number(row.original?.exposure||row.registered?.exposure);return Number.isFinite(n)&&n>0?n:null;}
function sqrInferLogClock(session,mode='auto',hours=0){
   let clock={mode,anchors:[],offsets:[],unresolved:0,endNames:0};
   if(mode==='offset'){if(Number.isFinite(hours)&&hours>=-12&&hours<=14)clock.offsets=[hours*3600000];return clock;}
   let candidates=[];
   for(let row of session?.groups.flatMap(g=>g.rows)||[]){let utc=sqrAcquisitionTime(row),local=sqrFilenameClock(row.original?.path||row.registered.path),exposure=sqrExposure(row),options=[];
      if(utc!==null&&local!==null)for(let [basis,duration] of [['start',0],['end',exposure]]){
         if(duration===null)continue;let difference=local-utc-duration*1000,offset=Math.round(difference/900000)*900000;
         if(offset>=-12*3600000&&offset<=14*3600000&&Math.abs(difference-offset)<=5000&&!options.some(v=>v.offset===offset))options.push({utc,offset,basis});
      }
      candidates.push(options);
   }
   let known=new Set(candidates.filter(c=>c.length===1).map(c=>c[0].offset));
   for(let options of candidates){if(options.length>1&&known.size===1)options=options.filter(o=>known.has(o.offset));
      if(options.length!==1){++clock.unresolved;continue;}clock.anchors.push(options[0]);if(options[0].basis==='end')++clock.endNames;}
   clock.anchors.sort((a,b)=>a.utc-b.utc);clock.offsets=Array.from(new Set(clock.anchors.map(a=>a.offset))).sort((a,b)=>a-b);return clock;
}
function sqrOffsetText(ms){let minutes=Math.round(Math.abs(ms)/60000);return 'UTC'+(ms<0?'-':'+')+String(Math.floor(minutes/60)).padStart(2,'0')+':'+String(minutes%60).padStart(2,'0');}
function sqrClockText(clock){return clock.offsets.length?clock.offsets.map(sqrOffsetText).join(' / ')+(clock.mode==='offset'?' (custom)':' (inferred)'):'UTC offset unavailable — scan images or set a custom offset';}
// When offsets change between nights, accept a conversion only when nearby UTC
// anchors agree. Repeated local times at a clock change stay ambiguous.
function sqrLocalToUTC(wall,clock){
   if(wall===null||!clock.offsets.length)return null;if(clock.offsets.length===1)return wall-clock.offsets[0];
   let candidates=[];
   for(let offset of clock.offsets){let utc=wall-offset,i=sqrLowerBound(clock.anchors,utc,'utc'),a=clock.anchors[i-1],b=clock.anchors[i];
      if((!a||a.offset===offset)&&(!b||b.offset===offset))candidates.push(utc);}
   return candidates.length===1?candidates[0]:null;
}
function sqrLowerBound(rows,time,key='time'){let lo=0,hi=rows.length;while(lo<hi){let m=(lo+hi)>>>1;if(rows[m][key]<time)lo=m+1;else hi=m;}return lo;}
function sqrCSVLine(line){let fields=[],value='',quoted=false;for(let i=0;i<line.length;++i){let c=line[i];
   if(c==='"'){if(quoted&&line[i+1]==='"'){value+='"';++i;}else quoted=!quoted;}
   else if(c===','&&!quoted){fields.push(value);value='';}else value+=c;}fields.push(value);return quoted?null:fields;}
function sqrCSVNumber(value){if(value===undefined||String(value).trim()==='')return null;let n=Number(value);return Number.isFinite(n)?n:null;}
/** Parse local section starts and elapsed sample times separately. Each section
 * has its own guider scale and cadence. INFO records do not masquerade as CSV;
 * valid samples during in-exposure settling remain real guiding measurements. */
function sqrParseGuideFiles(files){
   let sections=[],invalid=0,errors=0;
   for(let file of files){if(file.error){++errors;continue;}let section=null,header=null,settling=false;
      for(let line of file.text.split(/\r?\n|\r/)){let m;
         if((m=line.match(/^Guiding Begins at (.+)$/))){section={start:sqrLogTime(m[1],'utc'),path:file.path,scale:null,exposure:null,rows:[],camera:''};sections.push(section);header=null;settling=false;continue;}
         if(/^Guiding Ends at |^Calibration Begins/.test(line)){section=null;header=null;continue;}if(!section)continue;
         if((m=line.match(/^Pixel scale = ([\d.]+) arc-sec\/px/)))section.scale=sqrPositiveMetadata(m[1]);
         else if((m=line.match(/^Exposure = ([\d.]+) ms/)))section.exposure=sqrPositiveMetadata(m[1])/1000;
         else if((m=line.match(/^Camera = ([^,]+)/)))section.camera=m[1].trim();
         else if(/^Frame,Time,/.test(line))header=sqrCSVLine(line);
         else if(/^INFO:/.test(line)){if(/Settling started/.test(line))settling=true;else if(/Settling complete|Settling failed/.test(line))settling=false;}
         else if(/^\d+,/.test(line)&&header){let fields=sqrCSVLine(line);if(!fields){++invalid;continue;}
            let get=name=>fields[header.indexOf(name)],elapsed=sqrCSVNumber(get('Time')),frame=sqrCSVNumber(get('Frame')),mount=get('mount');
            if(elapsed===null||elapsed<0||frame===null||section.start===null){++invalid;continue;}if(mount!=='Mount'&&mount!=='DROP')continue;
            let ra=sqrCSVNumber(get('RARawDistance')),dec=sqrCSVNumber(get('DECRawDistance')),code=sqrCSVNumber(get('ErrorCode'));
            let valid=mount==='Mount'&&code===0&&ra!==null&&dec!==null&&section.scale!==null;
            section.rows.push({elapsed,frame,error:valid?Math.hypot(ra,dec)*section.scale:null,dropped:mount==='DROP'||code!==0,settling});
         }
      }
   }
   for(let s of sections){let gaps=[];for(let i=1;i<s.rows.length;++i){let dt=s.rows[i].elapsed-s.rows[i-1].elapsed;if(dt>0)gaps.push(dt);}
      s.cadence=sqrMedian(gaps);if(!Number.isFinite(s.cadence))s.cadence=s.exposure||2;}
   return {sections,invalid,errors};
}
function sqrGuideTimeline(parsed,clock){
   let seen=new Map,duplicates=0,conflicts=0,unresolved=0;
   for(let s of parsed.sections){let start=sqrLocalToUTC(s.start,clock);if(start===null){++unresolved;continue;}
      for(let r of s.rows){let key=start+'|'+r.elapsed+'|'+r.frame,sample={...r,time:start+r.elapsed*1000,cadence:s.cadence,path:s.path},old=seen.get(key);
         if(old){++duplicates;if(old.error!==sample.error||old.dropped!==sample.dropped){if(!old.conflict)++conflicts;old.error=null;old.conflict=true;}continue;}seen.set(key,sample);}
   }
   return {rows:Array.from(seen.values()).sort((a,b)=>a.time-b.time),duplicates,conflicts,unresolved};
}
function sqrGuideCategory(ratio){return ratio<=1+1e-12?'Good guiding':ratio<=1.75+1e-12?'Medium guiding':'Bad guiding';}
function sqrGuidingScale(setup){let value=setup.reason?NaN:Math.min(setup.x??Infinity,setup.y??Infinity);return Number.isFinite(value)&&value>0?value:null;}
// Display the category boundaries in angular units, using the same scale as
// classification. Keep the internal scale-normalized penalty for Score.
function sqrGuideThresholdText(scale){return Number.isFinite(scale)&&scale>0?'Good ≤ '+sqrGuideNumber(scale)+'″ · Medium > '+sqrGuideNumber(scale)+'″ to '+sqrGuideNumber(1.75*scale)+'″ · Bad > '+sqrGuideNumber(1.75*scale)+'″':'Guiding thresholds unavailable (image scale unavailable)';}
// Exclusion is per frame in available-only mode, or global in ignore mode.
// Keep statistics visible; this policy affects Score, completeness and flags.
function sqrIgnoreGuiding(row,options){return options.guidingMode==='ignore'||options.guideWeight===0||options.guidingMode==='available'&&!row.guiding?.scorable;}
/** Match only samples inside the exposure's half-open UTC interval. Coverage
 * uses short, cadence-limited support intervals, never bridges long guide gaps.
 * Partial statistics remain visible, but unreliable coverage has no score. */
function sqrGuideMeasurement(row,timeline,pixelScale){
   let start=sqrAcquisitionTime(row),duration=sqrExposure(row),result={min:null,max:null,avg:null,count:0,dropped:0,coverage:0,scorable:false,reason:''};
   if(start===null||duration===null){result.reason='Exposure timestamp or duration unavailable';return result;}
   let end=start+duration*1000,from=sqrLowerBound(timeline.rows,start),to=sqrLowerBound(timeline.rows,end),samples=timeline.rows.slice(from,to),valid=samples.filter(s=>s.error!==null);
   result.count=valid.length;result.dropped=samples.filter(s=>s.dropped).length;result.settling=valid.filter(s=>s.settling).length;result.conflicts=samples.filter(s=>s.conflict).length;
   if(!valid.length){result.reason=!timeline.rows.length?'No guide samples with resolved timestamps':end<=timeline.rows[0].time||start>timeline.rows[timeline.rows.length-1].time?'Exposure outside loaded guide-log coverage':samples.length?'No valid guide samples during this exposure':'Gap in loaded guide logs';return result;}
   let values=valid.map(s=>s.error);result.min=Math.min(...values);result.max=Math.max(...values);result.avg=values.reduce((a,b)=>a+b,0)/values.length;
   let covered=0,cursor=start,maxGap=0,cadence=sqrMedian(valid.map(s=>s.cadence));
   for(let s of valid){let a=Math.max(start,s.time-s.cadence*750),b=Math.min(end,s.time+s.cadence*750);maxGap=Math.max(maxGap,a-cursor);if(b>cursor){covered+=b-Math.max(cursor,a);cursor=b;}}
   maxGap=Math.max(maxGap,end-cursor);result.coverage=Math.min(1,covered/(end-start));result.maxGap=maxGap/1000;
   result.scorable=valid.length>=3&&result.coverage>=.9&&result.maxGap<=Math.max(10,3*cadence)&&!result.conflicts;
   result.reason=result.scorable?'':'Incomplete guiding coverage';result.composite=(result.min+2*result.avg+result.max)/4;
   if(!Number.isFinite(pixelScale)||pixelScale<=0){result.scorable=false;result.reason='Image pixel scale unavailable';}
   else{result.ratio=result.composite/pixelScale;result.category=sqrGuideCategory(result.ratio);result.pixelScale=pixelScale;}
   return result;
}
function sqrApplyGuiding(session,parsed,clock,enabled){
   if(!session)return;let scale=sqrGuidingScale(sqrSessionPixelScale(session)),timeline=sqrGuideTimeline(parsed,clock);
   session.guiding={enabled,clock:sqrClockText(clock),samples:timeline.rows.length,duplicates:timeline.duplicates,conflicts:timeline.conflicts,unresolved:timeline.unresolved,errors:parsed.errors};
   for(let g of session.groups)for(let r of sqrGroupRows(g)){
      r.guideMin=r.guideMax=r.guideAvg=r.guideQuality=r.guidePenalty=null;r.guiding=null;r.guidingIgnored=false;
      if(!enabled||r.isMaster)continue;let m=sqrGuideMeasurement(r,timeline,scale);r.guiding=m;r.guideMin=m.min;r.guideMax=m.max;r.guideAvg=m.avg;
      if(m.scorable){r.guideQuality=m.composite;r.guidePenalty=Math.min(10,Math.max(0,(m.ratio-1)/.75));}
      r.guidingIgnored=sqrIgnoreGuiding(r,session.options);
   }
}
function sqrGuideReport(row){let m=row.guiding;if(!m)return row.isMaster?'Integrated master: no single exposure interval.':'No PHD2 guide log loaded.';
   return (m.scorable?m.category:m.reason)+(row.guidingIgnored?' (excluded from Score)':'')+(m.count?' · min / max / average: '+sqrGuideNumber(m.min)+' / '+sqrGuideNumber(m.max)+' / '+sqrGuideNumber(m.avg)+' arcsec':'')+
      '\n'+m.count+' valid samples · '+(m.coverage*100).toFixed(1)+'% time coverage · '+m.dropped+' rejected guide samples'+(m.settling?' · '+m.settling+' samples while settling':'')+
      (m.pixelScale?'\n'+sqrGuideThresholdText(m.pixelScale)+'. Composite = (min + 2 × average + max) / 4.':'');}
function sqrGuideCell(row,key){let value=row[key];return Number.isFinite(value)?sqrGuideNumber(value)+(row.guiding?.scorable?'':'*'):'—';}
/** Pair each unique autofocus start with its final successful focus position.
 * Intermediate EAF samples are not results. A new start, end, or failure closes
 * the previous run so an incomplete run cannot borrow another run's position.
 * Only the start timestamp is retained for marker placement and reporting. */
function sqrParseAutorun(text,zone='local',offset=0){
   let runs=[],seen=new Set,invalid=0,active=null;
   for(let line of String(text).split(/\r?\n|\r/)){
      let m=line.match(/^\s*(\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2})\s+(.*)$/);if(!m)continue;
      let begin=m[2].match(/^\[AutoFocus\|Begin\]\s*(.*)$/i);
      if(begin){
         let time=sqrLogTime(m[1],zone,offset);
         if(time===null){++invalid;active=null;continue;}
         // An adjacent duplicate start keeps its open run; an old duplicate must
         // not reopen a finished run or attach its result to a different start.
         if(seen.has(time)){if(active?.start!==time)active=null;continue;}
         seen.add(time);active={start:time,startText:m[1],reason:begin[1],focusPosition:null};runs.push(active);
      }else if(/^\[AutoFocus\|End\]|^Auto focus failed\b/i.test(m[2]))active=null;
      else if(active){
         let result=m[2].match(/^Auto focus succeeded,\s*the focused position is\s+(\d+)\s*$/i);
         if(result){let position=Number(result[1]),time=sqrLogTime(m[1],zone,offset);
            if(Number.isSafeInteger(position)&&time!==null&&time>=active.start){active.focusPosition=position;active=null;}}
      }
   }
   return {runs:runs.sort((a,b)=>a.start-b.start),invalid};
}
/** Parse each log independently: an unfinished run must not borrow a focus
 * result from the next file. Merge duplicate starts after parsing, retaining
 * provenance and any available result. Conflicting results stay unavailable. */
function sqrParseAutorunFiles(files,zone='local',offset=0){
   let merged=new Map,invalid=0,duplicates=0,details=[];
   for(let file of files.slice().sort((a,b)=>sqrKey(a.path).localeCompare(sqrKey(b.path)))){
      if(file.error){details.push({path:file.path,error:file.error,starts:0,invalid:0});continue;}
      let parsed=sqrParseAutorun(file.text,zone,offset);invalid+=parsed.invalid;
      details.push({path:file.path,starts:parsed.runs.length,invalid:parsed.invalid});
      for(let run of parsed.runs){
         let known=merged.get(run.start);
         if(!known){merged.set(run.start,{...run,sourcePaths:[file.path]});continue;}
         ++duplicates;if(!known.sourcePaths.includes(file.path))known.sourcePaths.push(file.path);
         if(!known.reason)known.reason=run.reason;
         if(!known.focusConflict&&run.focusPosition!==null){
            if(known.focusPosition===null)known.focusPosition=run.focusPosition;
            else if(known.focusPosition!==run.focusPosition){known.focusPosition=null;known.focusConflict=true;}
         }
      }
   }
   let runs=Array.from(merged.values()).sort((a,b)=>a.start-b.start);
   return {runs,invalid,duplicates,conflicts:runs.filter(r=>r.focusConflict).length,files:details,errors:details.filter(f=>f.error).length};
}
function sqrFocusPositionText(run){return run.focusConflict?'conflicting log results':run.focusPosition??'not reported';}
function sqrAutofocusMarkers(items,runs){
   // Frame slots are equally spaced. Interpolate AF times between the surrounding
   // acquisition timestamps; master and unknown-time slots never set the range.
   let timed=items.map((item,i)=>({time:item.time,slot:i+.5,master:item.master})).filter(item=>!item.master&&Number.isFinite(item.time)).sort((a,b)=>a.time-b.time);
   if(!timed.length)return [];
   let points=[];for(let item of timed){let last=points[points.length-1];
      if(last&&last.time===item.time){last.slot=(last.slot*last.count+item.slot)/++last.count;}
      else points.push({...item,count:1});}
   let earliest=points[0].time,latest=points[points.length-1].time;
   let position=time=>{for(let i=0;i<points.length-1;++i){let a=points[i],b=points[i+1];
      if(time>=a.time&&time<=b.time)return a.slot+(time-a.time)/(b.time-a.time)*(b.slot-a.slot);}
      return time<=earliest?points[0].slot:points[points.length-1].slot;};
   return runs.filter(run=>run.start>=earliest&&run.start<=latest).map(run=>({...run,startSlot:position(run.start)}));
}
// Report all extracted starts. Time-range clipping belongs to the plot only,
// so an event outside the current filter group remains visible in the report.
function sqrAutofocusReport(path,result,zone,offset,error='',timeDescription=''){
   let convention=timeDescription||(zone==='local'?'Computer local time':zone==='utc'?'UTC':'UTC offset '+(offset>=0?'+':'')+offset+' hours');
   let lines=[(result.files?'Log folder: ':'Autorun log: ')+path,'Log timestamps: '+convention,''];
   if(error)return lines.concat(error).join('\n');
   if(result.files){
      lines.push('Autorun logs read: '+(result.files.length-result.errors)+' / '+result.files.length);
      for(let file of result.files)lines.push('  '+sqrFileName(file.path)+': '+(file.error?'could not read — '+file.error:file.starts+' autofocus starts'+(file.invalid?' · '+file.invalid+' invalid timestamps skipped':'')));
      if(!result.files.length)lines.push('No matching Autorun_log files found in this folder.');
      if(result.ignoredCHN)lines.push('Ignored _CHN translations: '+result.ignoredCHN);
      if(result.duplicates)lines.push('Duplicate starts merged: '+result.duplicates);
      if(result.conflicts)lines.push('Starts with conflicting focus positions: '+result.conflicts);
      lines.push('');
   }
   lines.push(result.runs.length+' autofocus start'+(result.runs.length===1?'':'s')+' extracted'+(result.invalid?' · '+result.invalid+' invalid timestamp'+(result.invalid===1?'':'s')+' skipped':''),
      'Log start → UTC (used in histograms) · Final focus position');
   for(let i=0;i<result.runs.length;++i){let run=result.runs[i];lines.push((i+1)+'. '+run.startText+' → '+new Date(run.start).toISOString()+' · Focus position: '+sqrFocusPositionText(run)+(run.sourcePaths?.length?' · Logs: '+run.sourcePaths.map(sqrFileName).join(', '):''));}
   if(!result.runs.length)lines.push('No valid [AutoFocus|Begin] timestamps found.');
   lines.push('','All extracted starts are listed. Histograms show only starts within the current group’s subframe time range.');
   return lines.join('\n');
}
/** Return a filtered/sorted copy without changing group membership or decisions.
 * Reverse measured values while retaining the default missing-data priorities.
 * Acquisition-time sorting keeps undated frames and the master at the end;
 * incomplete Below-mean Quality comparisons remain last in either direction.
 * Stable timestamp ties and filename tie-breaks are independent of direction.
 */
// Display order is independent of saved mode numbers, so rearranging the menu
// preserves the sorting criterion in existing process instances and sessions.
const SQR_REVIEW_SORTS=[
   [0,'Score'],[1,'PSF signal weight'],[2,'Star count'],[3,'Field FWHM'],[4,'Corner quality'],[5,'Filename'],
   [6,'R1: field rank'],[7,'R2: rank with corners'],[13,'R3: correlation rank'],[15,'R4: rank of ranks'],[8,'Acquisition time'],
   [9,'Below-mean Quality'],[10,'Guide minimum'],[11,'Guide maximum'],[12,'Guide average'],[14,'Sky brightness'],[16,'Transparency'],[17,'Sky quality']
];
function sqrReviewOrderIndex(mode){return Math.max(0,SQR_REVIEW_SORTS.findIndex(item=>item[0]===mode));}
function sqrReviewRows(group,candidatesOnly,mode,reverse=false){
   if(!group)return [];
   const direction=reverse?-1:1;
   const compare=(x,y)=>{
      // Signed infinity encodes existing unavailable-value placement. Do not
      // reverse these sentinels or subtract equal infinities (which yields NaN).
      if(x===y)return 0;
      if(!Number.isFinite(x)||!Number.isFinite(y))return x<y?-1:x>y?1:0;
      return direction*(x-y);
   };
   return sqrGroupRows(group).filter(r=>!candidatesOnly||(!r.isMaster&&r.candidate)).sort((a,b)=>{
      // Score and rank sorts keep the unscored comparison master last in both directions.
      if([0,6,7,13,15].includes(mode)&&!!a.isMaster!==!!b.isMaster)return a.isMaster?1:-1;
      let x,y;if(mode===1){x=a.metrics[0]?.signal??Infinity;y=b.metrics[0]?.signal??Infinity;}
      else if(mode===2){x=a.metrics[0]?.stars??Infinity;y=b.metrics[0]?.stars??Infinity;}
      else if(mode===3){x=-(a.metrics[0]?.fwhm??-Infinity);y=-(b.metrics[0]?.fwhm??-Infinity);}
      else if(mode===4){x=-(a.cornerSeverity??-Infinity);y=-(b.cornerSeverity??-Infinity);}
      else if(mode===14){x=Number.isFinite(a.skyBackground)?-a.skyBackground:Infinity;y=Number.isFinite(b.skyBackground)?-b.skyBackground:Infinity;}
      else if(mode===16){x=a.relativeTransparency??Infinity;y=b.relativeTransparency??Infinity;}
      else if(mode===17){x=a.skyQuality??Infinity;y=b.skyQuality??Infinity;}
      else if(mode===5)return direction*a.registered.path.localeCompare(b.registered.path);
      else if(mode===6){x=a.rankWithoutCorners??Infinity;y=b.rankWithoutCorners??Infinity;}
      else if(mode===7){x=a.rankWithCorners??Infinity;y=b.rankWithCorners??Infinity;}
      else if(mode===13){x=a.rankCorrelated??Infinity;y=b.rankCorrelated??Infinity;}
      else if(mode===15){x=a.rankOfRanks??Infinity;y=b.rankOfRanks??Infinity;}
      else if(mode===8){
         if(!!a.isMaster!==!!b.isMaster)return a.isMaster?1:-1;
         let aTime=sqrAcquisitionTime(a),bTime=sqrAcquisitionTime(b);
         if((aTime===null)!==(bTime===null))return aTime===null?1:-1;
         // Reverse only known timestamps; undated subframes follow, then the master.
         // Equal timestamps retain their input order; filename suffixes do not rank them.
         return direction*((aTime??0)-(bTime??0));
      }
      else if(mode===9){if(!!a.belowMeanComplete!==!!b.belowMeanComplete)return a.belowMeanComplete?-1:1;
         x=-(a.belowMeanFraction??-Infinity);y=-(b.belowMeanFraction??-Infinity);
         return compare(x,y)||compare(a.score??Infinity,b.score??Infinity)||a.registered.path.localeCompare(b.registered.path);}
      else if(mode>=10&&mode<=12){
         // Guide values are numeric arcseconds, including displayed partial
         // measurements. Missing values follow in both directions; master last.
         if(!!a.isMaster!==!!b.isMaster)return a.isMaster?1:-1;
         let key=['guideMin','guideMax','guideAvg'][mode-10];
         x=Number.isFinite(a[key])?-a[key]:Infinity;y=Number.isFinite(b[key])?-b[key]:Infinity;
      }
      else{x=a.score??Infinity;y=b.score??Infinity;}
      return compare(x,y)||a.registered.path.localeCompare(b.registered.path);
   });
}
// Plot descriptors separate stored metrics from derived row-level indicators.
// Corner descriptors are offered only when actual values exist in the group.
// These absolute shape ranges guide visual inspection; they do not change the
// relative eccentricity penalties used by manual or correlation-based scoring.
const SQR_ECCENTRICITY_LIMITS={good:.42,medium:.60};
const SQR_ECCENTRICITY_DEFINITION='Eccentricity: 0 = round; closer to 1 = elongated. Bands are practical guidelines; Score compares measurements within the group.';
function sqrEccentricityCategory(value){return value<=SQR_ECCENTRICITY_LIMITS.good?'Good':value<=SQR_ECCENTRICITY_LIMITS.medium?'Medium':'Bad';}
const SQR_KPIS=[
   {label:'Score',key:'score',noMaster:true,direction:'Higher is better (0–1)',definition:'For manual or strongly correlated KPI scoring: Score = 1 − weighted mean penalty / 10. For rank-of-ranks scoring: Score is the mean of the available normalized R1, R2 and R3 ranks. Only subframes receive scores and ranks; the integrated master is excluded.'},
   {label:'PSF signal weight',metric:'signal',region:0,direction:'Higher is better',definition:'The PSF signal weight measured by SubframeSelector in the usable field. Score compares this measurement with the other supported images in the same group.'},
   {label:'Star count',metric:'stars',region:0,integer:true,direction:'Higher is better',definition:'Number of detected stars reported by SubframeSelector for the usable field. Comparisons use the other supported images in the same group.'},
   {label:'Field FWHM (px)',metric:'fwhm',region:0,direction:'Lower is better'},
   {label:'Corner quality',key:'cornerSeverity',corners:true,direction:'Lower is better',definition:'Corner quality is the worst penalty for star size, corner-to-center size ratio, or elongation across the four corners. Missing measurements are assessed separately.'},
   {label:'Field eccentricity',metric:'eccentricity',region:0,direction:'Lower is rounder',definition:SQR_ECCENTRICITY_DEFINITION},
   ...[1,2,3,4,5].map(region=>({label:SQR_REGIONS[region]+' FWHM (px)',metric:'fwhm',region,corners:true,direction:'Lower is better'})),
   ...[2,3,4,5].map(region=>({label:SQR_REGIONS[region]+' eccentricity',metric:'eccentricity',region,corners:true,direction:'Lower is rounder',definition:SQR_ECCENTRICITY_DEFINITION})),
   {label:'Below-mean Quality',key:'belowMeanFraction',percentage:true,direction:'Lower is better',definition:'Percentage of assessed indicators with worse-than-mean quality: worse indicators / available indicators. The manual KPI weights and corner/guiding settings define the indicators; selecting R3 or R4 does not change this KPI. Means use the supported subframes in the group, including rejected frames. An asterisk in the Review table marks incomplete coverage; unavailable measurements do not count as good.'},
   {label:'Guide minimum (arcsec)',key:'guideMin',guiding:true,direction:'Lower is better',definition:'Minimum combined RA/Dec displacement during the exposure, in arcseconds.'},
   {label:'Guide maximum (arcsec)',key:'guideMax',guiding:true,direction:'Lower is better',definition:'Maximum combined RA/Dec displacement during the exposure, in arcseconds.'},
   {label:'Guide average (arcsec)',key:'guideAvg',guiding:true,direction:'Lower is better',definition:'Arithmetic mean of the combined RA/Dec displacements during the exposure, in arcseconds.'},
   {label:'Guiding quality (arcsec)',key:'guideQuality',guiding:true,direction:'Lower is better',definition:'Guiding quality G = (minimum + 2 × average + maximum) / 4, in arcseconds.'},
   {label:'Sky brightness',key:'skyBackground',direction:'Lower is better',definition:'With corner scoring enabled: the lowest mean of the center and four corner previews. Otherwise: the whole-image mean. Values are in image units; RGB uses green.'},
   {label:'Transparency',key:'relativeTransparency',percentage:true,unboundedPercentage:true,direction:'Higher is better',definition:'Relative stellar throughput: the median exposure-corrected flux ratio of matching, unsaturated stars after local background subtraction. The group reference is 100%; this is not absolute atmospheric transmission. RGB uses green. Clouds, airmass, changing focus and prior image normalization can affect the result. The master uses its recorded frame exposure, not total integration time; its value describes the normalized integration, not the session atmosphere. Select one sky KPI in Score weights; only that choice can contribute to scoring.'},
   {label:'Sky quality',key:'skyQuality',percentage:true,unboundedPercentage:true,direction:'Higher is better',definition:'Combines the existing Transparency and Sky brightness KPIs: Q = (T / Tref) × sqrt(Bref / B), shown as a percentage. B is Sky brightness minus any recorded pedestal, divided by exposure time. Higher transparency and a darker background improve Q. The transparency reference is 100%; values above 100% are allowed. This is an approximate relative quality indicator, not an absolute sky-brightness or transmission measurement. The master uses its recorded frame exposure and is affected by integration normalization; this value does not measure the SNR gain from stacking. No separate noise measurement is used. Select one sky KPI in Score weights; the combined Sky quality is the default.'}
];
// One shared scoring slot prevents counting all three related sky indicators.
// Keep backgroundWeight as the saved weight key so existing process settings
// retain their chosen numeric weight. A missing/invalid selection uses combined Q.
const SQR_SKY_SCORE_CHOICES=[
   {key:'skyQuality',label:'Sky quality',name:'Sky quality',higher:true,issue:'Low sky quality'},
   {key:'relativeTransparency',label:'Transparency',name:'Transparency',higher:true,issue:'Low transparency'},
   {key:'skyBackground',label:'Sky brightness',name:'Sky brightness',higher:false,issue:'High sky brightness'}
];
function sqrSkyScoreChoice(o){return SQR_SKY_SCORE_CHOICES.find(c=>c.key===o?.skyScoreKPI)||SQR_SKY_SCORE_CHOICES[0];}
function sqrSkyScoreValue(row,o,withCorners){
   let key=sqrSkyScoreChoice(o).key,value=key==='skyBackground'?sqrSkyBackground(row,withCorners):key==='skyQuality'?row.skyQualityModes?.[withCorners?'corners':'field']?.value:row.relativeTransparency;
   return Number.isFinite(value)?value:null;
}
// Stable component identities connect manual weights, automatic selection and
// the public KPI descriptors. Manual scoring uses the corner-quality composite.
const SQR_SCORE_COMPONENTS=[
   {weight:'signalWeight',kpi:'0:signal',label:'PSF signal weight'},
   {weight:'starsWeight',kpi:'0:stars',label:'Star count'},
   {weight:'fwhmWeight',kpi:'0:fwhm',label:'Field FWHM'},
   {weight:'eccentricityWeight',kpi:'0:eccentricity',label:'Field eccentricity'},
   {weight:'cornerWeight',kpi:'cornerSeverity',label:'Corner quality'},
   {weight:'guideWeight',kpi:'guideQuality',label:'Guiding quality'},
   {weight:'backgroundWeight',kpi:'skyQuality',label:'Sky quality'},
   {weight:'belowMeanWeight',kpi:'belowMeanFraction',label:'Below-mean Quality'}
];
function sqrScoreComponents(o){let sky=sqrSkyScoreChoice(o);return SQR_SCORE_COMPONENTS.map(c=>c.weight==='backgroundWeight'?{...c,kpi:sky.key,label:sky.name}:c);}
// Automatic-only components: assess each measured corner independently. Their
// effective 0/1 weights are derived per group, never saved as manual settings.
const SQR_CORNER_COMPONENTS=[2,3,4,5].flatMap(region=>['fwhm','eccentricity'].map(metric=>({
   weight:'corner'+region+'_'+metric,kpi:region+':'+metric,region,metric,corner:true,
   label:SQR_REGIONS[region]+(metric==='fwhm'?' FWHM':' eccentricity')
})));
function sqrEccentricityValid(m){return !!m?.valid&&Number.isFinite(m.eccentricity)&&m.eccentricity>=0&&m.eccentricity<1;}
// null means unavailable, while zero is a real value. Stored corner quality
// stays inspectable even when corner scoring is temporarily disabled.
function sqrKPIValue(row,kpi){
   if(!row)return null;
   if(kpi.metric==='eccentricity'&&!sqrEccentricityValid(row.metrics[kpi.region]))return null;
   let value=kpi.key==='cornerSeverity'?row.measuredCornerSeverity??row.cornerSeverity:kpi.key?row[kpi.key]:row.metrics[kpi.region]?.valid?row.metrics[kpi.region][kpi.metric]:null;
   return Number.isFinite(value)?value:null;
}
function sqrAvailableKPIs(group,includeMaster=true){
   let rows=group?(includeMaster?sqrGroupRows(group):group.rows.filter(row=>!row.isMaster)):[];
   return SQR_KPIS.filter(kpi=>!kpi.corners||rows.some(row=>sqrKPIValue(row,kpi)!==null));
}
// Describe the current scoring configuration, independently of plot availability.
// Automatic scoring can include a corner metric directly; manual scoring and
// the center/individual guiding values retain their composite contribution.
function sqrKPIScoreInfo(kpi,o,guidingEnabled=false,correlation=null){
   let sky=SQR_SKY_SCORE_CHOICES.some(c=>c.key===kpi.key);
   if(sky&&kpi.key!==sqrSkyScoreChoice(o).key)return 'Excluded from Score (sky KPI not selected)';
   if(kpi.key==='score')return 'Combined Score';
   if(o.rankOfRanks){
      let manual=sqrKPIScoreInfo(kpi,{...o,rankOfRanks:false,correlationOnly:false},guidingEnabled,correlation);
      let automatic=correlation?.available===false?'Excluded from R3':sqrKPIScoreInfo(kpi,{...o,rankOfRanks:false,correlationOnly:true},guidingEnabled,correlation);
      let via=[];if(manual.startsWith('Included'))via.push(kpi.corners?'R2':o.measureCorners?'R1/R2':'R1');
      if(automatic.startsWith('Included')||automatic.includes('; included via'))via.push('R3');
      return via.length?'Included via '+via.join(' and ')+' in R4; available ranks have equal weight':'Excluded from R4';
   }
   if(o.correlationOnly){
      if(correlation?.available===false)return sqrKPIScoreInfo(kpi,{...o,correlationOnly:false},guidingEnabled,correlation)+' (manual score; R3 unavailable)';
      let key=kpi.corners&&!(kpi.region>=2)?'cornerSeverity':kpi.guiding?'guideQuality':sqrKPIKey(kpi),component=correlation?.components.find(c=>c.kpi===key);
      if(!component)return 'Correlation selection pending';
      let viaComposite=kpi.region>=2&&correlation.weights.cornerWeight>0;
      if(!component.included)return viaComposite?'Excluded as an individual KPI ('+component.reason+'); included via corner quality':'Excluded from Score ('+component.reason+')';
      return (sqrKPIKey(kpi)===key?'Included in Score':kpi.corners?'Included via corner quality':'Included via guiding quality')+' (equal weight)';
   }
   if(kpi.corners){
      if(!o.measureCorners)return 'Excluded from Score (corner scoring off)';
      if(!(o.cornerWeight>0))return 'Excluded from Score (corner weight 0)';
      return kpi.region===1?'Included via corner / center FWHM ratios':kpi.key==='cornerSeverity'?'Included in Score':'Included via corner quality';
   }
   if(kpi.guiding){
      if(o.guidingMode==='ignore')return 'Excluded from Score (guiding ignored)';
      if(!(o.guideWeight>0))return 'Excluded from Score (guiding weight 0)';
      if(!guidingEnabled)return 'Excluded from Score (no guiding logs)';
      return kpi.key==='guideQuality'?'Included in Score':'Included via guiding quality';
   }
   let weight=sky?o.backgroundWeight:kpi.key==='belowMeanFraction'?o.belowMeanWeight:o[({signal:'signalWeight',stars:'starsWeight',fwhm:'fwhmWeight',eccentricity:'eccentricityWeight'})[kpi.metric]];
   return weight>0?'Included in Score':'Excluded from Score (weight 0)';
}
/** Build a plot model independent of the review-table filter and sort order.
 * One slot represents one image; this is a WBPP-style metric plot, not frequency
 * binning. The visible mean excludes rejected rows, unlike scoring baselines. */
function sqrMetricPlot(group,kpi,measureCorners,selectedRow=null,order='value',autofocusRuns=[],guideScale=null,fwhmModel=null,skyModel=null){
   let chronological=order==='time',includeMaster=kpi.key!=='belowMeanFraction'&&!kpi.noMaster;
   let data={kpi,order:chronological?'time':'value',showAutofocus:chronological&&!kpi.guiding,items:[],autofocus:[],guideScale,master:null,hasMaster:includeMaster&&!!group?.master,missing:0,message:'',average:null};
   if(kpi.metric==='fwhm'&&fwhmModel){data.fwhmModel=fwhmModel;data.detail=sqrFWHMDescription(fwhmModel,false);}
   if(kpi.key==='skyBackground'&&skyModel){data.skyModel=skyModel;data.detail=sqrSkyPlotDetails(skyModel);}
   if(kpi.key==='relativeTransparency')data.detail=group?.transparencySummary||'Measure the subframes to establish a transparency reference.';
   if(kpi.key==='skyQuality')data.detail=group?.skyQualitySummary||'Measure sky background and relative transparency to calculate Sky quality.';
   if(!group){data.message='Scan files and measure a group to view its quality indicators.';return data;}
   // WBPP's metric plots use one slot per frame, ascending metric order and
   // 10% vertical padding. They do not aggregate values into frequency bins.
   // Score and Below-mean Quality describe subframe comparisons only: remove the master
   // before ordering and spacing, so it leaves neither a bar nor an empty slot.
   data.items=(includeMaster?sqrGroupRows(group):group.rows.filter(row=>!row.isMaster)).map(row=>({row,value:sqrKPIValue(row,kpi),time:sqrAcquisitionTime(row),master:!!row.isMaster,selected:row===selectedRow,review:!row.isMaster&&!!row.candidate,rejected:!row.isMaster&&!!(row.reject||row.moved)}))
      .sort((a,b)=>chronological?Number(b.master)-Number(a.master)||(a.time===null)-(b.time===null)||(a.time??0)-(b.time??0):
         (a.value===null)-(b.value===null)||(a.value??0)-(b.value??0)||a.row.registered.path.localeCompare(b.row.registered.path));
   if(data.showAutofocus)data.autofocus=sqrAutofocusMarkers(data.items,autofocusRuns);
   let valid=data.items.filter(item=>item.value!==null);
   data.master=includeMaster?sqrKPIValue(sqrMasterRow(group),kpi):null;data.missing=data.items.filter(item=>!item.master&&item.value===null).length;
   data.count=valid.filter(item=>!item.master).length;
   if(!valid.length){data.message='No valid measurements for '+kpi.label+'. Use the magnifier to measure.';return data;}
   // Keep subframe differences readable when the integration has much higher signal.
   let subframes=valid.filter(item=>!item.master),values=(subframes.length?subframes:valid).map(item=>item.value),min=Math.min(...values),max=Math.max(...values);
   let padding=(max-min||max*.1||1)*.1;data.low=min-padding;data.high=max+padding;
   if(data.low<0&&min>=0)data.low=0;
   if(kpi.percentage&&!kpi.unboundedPercentage||kpi.key==='score')data.high=Math.min(1,data.high);
   // Apply absolute categories to the measured min/average/max errors. The
   // combined guiding quality is a derived indicator with a separate definition.
   // Only a validated imaging scale can define these limits.
   if(['guideMin','guideAvg','guideMax'].includes(kpi.key)&&Number.isFinite(guideScale)&&guideScale>0){
      // Minimum and average errors can occupy a small range below the thresholds.
      // Keep their measured range and headroom; clip grading bands to the axis.
      // Maximum errors retain the overview of all three guiding categories.
      if(kpi.key==='guideMax'){data.low=0;data.high=Math.max(data.high,2*guideScale);}
      data.guideBands=[
         {label:'Good',low:0,high:guideScale,color:'#a6e3a1'},
         {label:'Medium',low:guideScale,high:1.75*guideScale,color:'#f9e2af'},
         {label:'Bad',low:1.75*guideScale,high:null,color:'#f38ba8'}];
   }
   // Fit all eccentricity regions to the actual bars, including the master. Keep
   // category thresholds fixed; off-axis bands are clipped by the renderer.
   if(kpi.metric==='eccentricity'){
      let plotted=valid.map(item=>item.value),bottom=Math.min(...plotted),top=Math.max(...plotted),pad=(top-bottom||top*.1||.01)*.1;
      data.low=Math.max(0,bottom-pad);data.high=Math.min(1,top+pad);
      data.eccentricityBands=[
         {label:'Good',low:0,high:SQR_ECCENTRICITY_LIMITS.good,color:'#a6e3a1'},
         {label:'Medium',low:SQR_ECCENTRICITY_LIMITS.good,high:SQR_ECCENTRICITY_LIMITS.medium,color:'#f9e2af'},
         {label:'Bad',low:SQR_ECCENTRICITY_LIMITS.medium,high:1,color:'#f38ba8'}];
   }
   // All FWHM regions use the same reference model. The bands never alter
   // measurements, score penalties, rejection choices or the REVIEW quota.
   if(kpi.metric==='fwhm'&&fwhmModel?.valid&&fwhmModel.enabled){
      data.low=0;data.high=Math.max(data.high,1.15*fwhmModel.medium);
      data.fwhmBands=[
         {label:'Good',low:0,high:fwhmModel.good,color:'#a6e3a1'},
         {label:'Medium',low:fwhmModel.good,high:fwhmModel.medium,color:'#f9e2af'},
         {label:'Bad',low:fwhmModel.medium,high:data.high,color:'#f38ba8'}];
   }
   if(kpi.metric==='fwhm'){
      data.low=Math.floor(data.low*10)/10;data.high=Math.ceil(data.high*10)/10;if(data.high<=data.low)data.high=data.low+.1;
      if(data.fwhmBands)data.fwhmBands[data.fwhmBands.length-1].high=data.high;
   }
   if(kpi.key==='skyBackground'){
      // Fit the actual histogram bars, including a plotted master. Neither
      // Bortle limits nor SQM may stretch the axis into an empty bright range.
      let plotted=valid.map(item=>item.value),bottom=Math.min(...plotted),top=Math.max(...plotted),pad=(top-bottom||Math.abs(top)*.1||.00001)*.1;
      data.low=bottom-pad;if(bottom>=0)data.low=Math.max(0,data.low);data.high=top+pad;
      if(!(data.high>data.low))data.high=data.low+.000001;
   }
   if(kpi.key==='skyBackground'&&skyModel?.valid){
      if(skyModel.bortleClass){
         data.skyBands=[];
         if(skyModel.goodValue!==null)data.skyBands.push({label:'Good',low:null,high:skyModel.goodValue,color:'#a6e3a1'});
         data.skyBands.push({label:'Medium',low:skyModel.goodValue,high:skyModel.mediumValue,color:'#f9e2af'});
         if(skyModel.mediumValue!==null)data.skyBands.push({label:'Bad',low:skyModel.mediumValue,high:null,color:'#f38ba8'});
      }
   }
   data.masterClipped=data.master===null?'':data.master>data.high?'above':data.master<data.low?'below':'';
   let kept=valid.filter(item=>!item.master&&!item.rejected);
   if(kept.length)data.average=kept.reduce((sum,item)=>sum+item.value,0)/kept.length;
   return data;
}
function sqrPlotNumber(value){if(!Number.isFinite(value))return 'unavailable';let a=Math.abs(value);return value.toFixed(a>=1000?0:a>=100?1:a>=10?2:a>=1?3:4);}
function sqrPercent(value){return Number.isFinite(value)?(100*value).toFixed(1).replace(/\.0$/,'')+'%':'unavailable';}
function sqrKPIPlotNumber(value,kpi){return kpi?.percentage?sqrPercent(value):Number.isFinite(value)&&kpi?.guiding?sqrGuideNumber(value):Number.isFinite(value)&&kpi?.metric==='fwhm'?value.toFixed(1):kpi?.key==='score'&&Number.isFinite(value)?value.toFixed(3):sqrPlotNumber(value);}
// Use tenths of a pixel or larger steps so rounded FWHM ticks stay distinct.
function sqrHistogramTicks(data){
   if(data.kpi.metric!=='fwhm')return Array.from({length:6},(_,i)=>data.low+(data.high-data.low)*i/5);
   let step=Math.max(1,Math.ceil((data.high-data.low)*2)),first=Math.ceil(data.low*10/step)*step,values=[];
   for(let value=first;value<=data.high*10+1e-9;value+=step)values.push(value/10);return values;
}
function sqrHTML(text){return String(text).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
// Save metric identities, not menu positions, so new indicators do not change
// the axes in an existing process instance. Regional choices require measurements.
function sqrKPIKey(kpi){return kpi.key||kpi.region+':'+kpi.metric;}
function sqrScatterAxis(values,kpi){
   let min=Math.min(...values),max=Math.max(...values),padding=(max-min||Math.abs(min)||1)*.08;
   return {low:min>=0?Math.max(0,min-padding):min-padding,high:kpi.percentage&&!kpi.unboundedPercentage||kpi.key==='score'?Math.min(1,max+padding):max+padding};
}
/** Pearson correlation of the exact paired sample used for the plot. Rescaling
 * each axis before centering preserves r while avoiding cancellation from a
 * large common offset and squared overflow/underflow for different KPI units.
 * A constant axis makes r undefined, not zero. No row weights are applied. */
function sqrPearson(items){
   let count=items.length,result={r:null,count,reason:''};
   if(count<2){result.reason='At least two paired subframes are needed.';return result;}
   let ranges=['x','y'].map(key=>{
      let values=items.map(item=>item[key]),low=Math.min(...values),high=Math.max(...values);
      return {low,high,span:high-low,scale:Math.max(Math.abs(low),Math.abs(high))};
   });
   let constant=ranges.map(range=>range.high===range.low);
   if(constant[0]||constant[1]){result.reason=(constant[0]&&constant[1]?'X and Y have':constant[0]?'X has':'Y has')+' no variation.';return result;}
   let normalize=(value,range)=>Number.isFinite(range.span)?(value-range.low)/range.span:value/range.scale;
   // Score changes reorder rows. Keep summation order fixed so even the full
   // precision tooltip remains unchanged for the same paired measurements.
   let pairs=items.map(item=>[normalize(item.x,ranges[0]),normalize(item.y,ranges[1])]).sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
   let meanX=pairs.reduce((sum,pair)=>sum+pair[0],0)/count,meanY=pairs.reduce((sum,pair)=>sum+pair[1],0)/count;
   let xx=0,yy=0,xy=0;for(let pair of pairs){let x=pair[0]-meanX,y=pair[1]-meanY;xx+=x*x;yy+=y*y;xy+=x*y;}
   let r=Math.max(-1,Math.min(1,(xy/Math.sqrt(xx))/Math.sqrt(yy)));
   // Remove only floating-point roundoff at the mathematical endpoints/zero.
   if(Math.abs(r)>=1-8*Number.EPSILON)r=r<0?-1:1;else if(Math.abs(r)<=8*Number.EPSILON)r=0;
   result.r=r;return result;
}
function sqrCorrelationStrength(r){let a=Math.abs(r);return a===1?'Perfect':a>=.7?'Strong':a>=.3?'Moderate':a>0?'Weak':'None';}
function sqrCorrelationText(correlation){
   let r=correlation.r;if(r===null)return 'Correlation (Pearson): unavailable · '+correlation.reason;
   // Round only the visible coefficient; interpretation retains full precision.
   let value=(r>0?'+':r<0?'-':'')+Math.abs(r).toFixed(4);
   if(r===0)return 'Correlation (Pearson) = '+value+' · None · No linear relationship';
   return 'Correlation (Pearson) = '+value+' · '+sqrCorrelationStrength(r)+' · '+(r>0?'Positive (both increase together)':'Negative (as X increases, Y decreases)');
}
/** Pair only finite measurements from the same subframe. Table filtering and
 * sort order never change the sample; rejection only changes point color.
 * Masters never enter the points, axes, counts, or correlation calculation. */
function sqrScatterPlot(group,xKPI,yKPI,selectedRow=null){
   let rows=(group?.rows||[]).filter(row=>!row.isMaster);
   let data={xKPI,yKPI,items:[],count:0,missing:0,total:rows.length,correlation:sqrPearson([]),message:''};
   if(!group){data.message='Scan files and measure a group to compare two quality indicators.';return data;}
   for(let row of rows){
      let x=sqrKPIValue(row,xKPI),y=sqrKPIValue(row,yKPI),paired=x!==null&&y!==null;
      if(paired)++data.count;else ++data.missing;
      if(paired)data.items.push({row,x,y,selected:row===selectedRow,review:!!row.candidate,rejected:!!(row.reject||row.moved)});
   }
   data.correlation=sqrPearson(data.items);
   if(!data.items.length){data.message='No images have both selected measurements. Measure the images, click Measure corners for regional indicators, or load guiding logs as needed.';return data;}
   data.xAxis=sqrScatterAxis(data.items.map(item=>item.x),xKPI);data.yAxis=sqrScatterAxis(data.items.map(item=>item.y),yKPI);
   return data;
}
// Retain meaningful digits for small signal weights as well as ordinary values.
function sqrScatterNumber(value,kpi){return kpi.metric==='fwhm'?sqrFmt(value,1):kpi.guiding?sqrGuideNumber(value):kpi.key==='score'?sqrFmt(value,3):kpi.percentage?sqrPercent(value):value!==0&&(Math.abs(value)<.001||Math.abs(value)>=1e6)?value.toExponential(2):sqrPlotNumber(value);}
/** Scatter coordinates remain numeric and unmodified, including overlapping
 * measurements. Draw the selected point last; all points support keyboard
 * focus and tooltips. Click messages use the same generation guard as bars. */
function sqrScatterHTML(data,generation=0){
   let body='';
   if(data.message)body='<div class="empty">'+sqrHTML(data.message)+'</div>';
   else{
      let svg=[],left=88,right=932,top=20,bottom=300;
      let x=value=>left+(value-data.xAxis.low)/(data.xAxis.high-data.xAxis.low)*(right-left),y=value=>bottom-(value-data.yAxis.low)/(data.yAxis.high-data.yAxis.low)*(bottom-top);
      svg.push('<rect x="'+left+'" y="'+top+'" width="'+(right-left)+'" height="'+(bottom-top)+'" rx="3" fill="#252536"/>');
      for(let i=0;i<=5;++i){
         let xv=data.xAxis.low+(data.xAxis.high-data.xAxis.low)*i/5,yv=data.yAxis.low+(data.yAxis.high-data.yAxis.low)*i/5,px=x(xv),py=y(yv);
         svg.push('<path d="M'+px+' '+top+'V'+bottom+' M'+left+' '+py+'H'+right+'" stroke="#45475a" stroke-width=".7" stroke-dasharray="3,3"/>');
         svg.push('<text x="'+px+'" y="322" text-anchor="middle">'+sqrScatterNumber(xv,data.xKPI)+'</text><text x="78" y="'+(py+4)+'" text-anchor="end">'+sqrScatterNumber(yv,data.yKPI)+'</text>');
      }
      // Preserve model indices for asynchronous selection despite drawing order.
      data.items.map((item,index)=>({item,index})).sort((a,b)=>Number(a.item.selected)-Number(b.item.selected)).forEach(({item,index})=>{
         let color=item.selected?'#89dceb':item.rejected?'#e57373':item.review?'#cba6f7':'#2d6cb5';
         let tip=(item.selected?'SELECTED · ':'')+(item.review?'REVIEW · ':'')+(item.rejected?'REJECTED · ':'')+sqrFileName(item.row.registered.path)+'\n'+data.xKPI.label+': '+sqrScatterNumber(item.x,data.xKPI)+'\n'+data.yKPI.label+': '+sqrScatterNumber(item.y,data.yKPI);
         if((data.xKPI.guiding||data.yKPI.guiding)&&item.row.guiding&&!item.row.guiding.scorable)tip+='\nPartial guiding data: '+item.row.guiding.reason;
         tip+='\nClick to select in Review and measurements';
         svg.push('<g class="point" data-index="'+index+'" tabindex="0" role="button" aria-label="'+sqrHTML(tip)+'"><title>'+sqrHTML(tip)+'</title>');
         svg.push('<circle cx="'+x(item.x)+'" cy="'+y(item.y)+'" r="8" fill="transparent" pointer-events="all"/>');
         svg.push('<circle data-point="'+index+'" cx="'+x(item.x)+'" cy="'+y(item.y)+'" r="'+(item.selected?5:4)+'" fill="'+color+'" stroke="'+(item.rejected?'#e57373':item.selected?'#cdd6f4':'#1e1e2e')+'" stroke-width="'+(item.selected?2:1)+'"/></g>');
      });
      svg.push('<path d="M'+left+' '+top+'V'+bottom+'H'+right+'" fill="none" stroke="#9399b2"/><text x="510" y="351" text-anchor="middle" class="axis">'+sqrHTML(data.xKPI.label)+'</text><text transform="translate(20 160) rotate(-90)" text-anchor="middle" class="axis">'+sqrHTML(data.yKPI.label)+'</text>');
      body='<svg viewBox="0 0 960 365" role="img" aria-label="'+sqrHTML(data.yKPI.label+' versus '+data.xKPI.label)+'">'+svg.join('')+'</svg>';
   }
   let script='window.sqrSelection=null;document.querySelectorAll(".point").forEach(function(el){function select(){window.sqrSelection={generation:'+generation+',index:Number(el.dataset.index)};}el.addEventListener("click",select);el.addEventListener("keydown",function(e){if(e.key==="Enter"||e.key===" "){e.preventDefault();select();}});});';
   return '<!doctype html><html><head><meta charset="UTF-8"><style>*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#1e1e2e;color:#cdd6f4;font-family:"Segoe UI",system-ui,sans-serif}body{display:flex;align-items:center;justify-content:center}svg{width:100%;height:100%}text{fill:#bac2de;font-size:12px}.axis{fill:#cdd6f4;font-size:14px}.point{cursor:pointer}.point:hover>[data-point],.point:focus>[data-point]{stroke:#fff;stroke-width:2}.empty{padding:24px;text-align:center;color:#bac2de}</style></head><body>'+body+'<script>'+script+'</script></body></html>';
}
/** Render the model as SVG inside a WebView. Escape image names and labels.
 * Clicks carry a plot-generation id so delayed browser callbacks cannot select
 * a row from an outdated group or indicator after the plot has been rebuilt. */
function sqrPlotHTML(data,generation=0){
   // Independent SVG renderer matching WBPP 3.1.2 metric-plot geometry/palette.
   let body='',message=data?.message||'',title=data?.kpi.label||'Quality indicators';
   if(message)body='<div class="empty">'+sqrHTML(message)+'</div>';
   else if(data){
      let svg=[],y=value=>175-(value-data.low)/(data.high-data.low)*140,number=value=>sqrKPIPlotNumber(value,data.kpi);
      let bands=data.skyBands||data.guideBands||data.eccentricityBands||data.fwhmBands||[],bandClass=data.skyBands?'sky':data.guideBands?'guide':data.fwhmBands?'fwhm':'eccentricity';
      svg.push('<defs><filter id="shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="1" dy="2" stdDeviation="2" flood-color="#000" flood-opacity=".4"/></filter></defs><rect x="55" y="35" width="330" height="140" rx="3" fill="#252536"/>');
      
      // Clip overlays to the data axis. A class can be wholly outside the
      // visible range; do not draw reversed rectangles or rescale the data.
      for(let band of bands){let low=Math.max(data.low,band.low??data.low),high=Math.min(data.high,band.high??data.high);
         if(high>low)svg.push('<rect class="'+bandClass+'-band" data-category="'+band.label+'" x="55" y="'+y(high)+'" width="330" height="'+(y(low)-y(high))+'" fill="'+band.color+'" fill-opacity=".18" pointer-events="none"/>');}
      for(let value of sqrHistogramTicks(data)){let py=y(value);
         svg.push('<path d="M50 '+py+'H55" stroke="#585b70"/><path d="M55 '+py+'H385" stroke="#3a3a4a" stroke-width=".5" stroke-dasharray="3,3"/><text x="47" y="'+(py+3)+'" text-anchor="end" fill="#6c7086" font-size="9">'+number(value)+'</text>');}
      let spacing=330/data.items.length,width=Math.max(2,spacing-1);
      data.items.forEach((item,i)=>{if(item.value===null)return;let x=55+i*spacing+(spacing-width)/2,py=y(Math.max(data.low,Math.min(data.high,item.value))),cx=x+width/2;
         let color=item.selected?'#89dceb':item.master?'#f9a825':item.rejected?'#e57373':item.review?'#cba6f7':'#2d6cb5';
         let outline=item.selected&&item.rejected?'#e57373':item.review?'#cba6f7':item.selected&&item.master?'#f9a825':'';
         let tip=(item.selected?'SELECTED · ':'')+(item.master?'MASTER: ':item.review?'REVIEW: ':'')+(item.rejected?'REJECTED · ':'')+sqrFileName(item.row.registered.path)+' — '+title+': '+number(item.value)+(data.kpi.key==='belowMeanFraction'?' ('+item.row.belowMeanCount+' worse; '+item.row.belowMeanAvailable+' assessed of '+item.row.belowMeanTotal+' enabled'+(item.row.belowMeanComplete?'':'; incomplete')+')':'')+(item.master&&data.masterClipped?' (clipped '+data.masterClipped+' axis range)':'')+(item.master?'':' — '+sqrAcquisitionLabel(item.row));
         if(data.skyModel?.valid&&!item.master){let m=data.skyModel,mu=sqrImageToSky(item.value,m.calibration);
            if(mu!==null)tip+=' — '+(m.calibration.transfer?'Green-relative estimate ':m.calibration.method==='sqm'?'SQM-based estimate ':'Approx. V-equivalent ')+mu.toFixed(2)+' mag/arcsec²'+(m.bortleClass?' — '+sqrBortleGrade(item.value,m)+' relative to Bortle '+sqrSkyBortleLabel(m):'')+
               (m.sqmValue!==null?' — '+(item.value<m.sqmValue?'Darker than':item.value>m.sqmValue?'Brighter than':'Equal to')+' session SQM':'');}
         if(data.eccentricityBands)tip+=' — '+sqrEccentricityCategory(item.value)+' eccentricity';
         if(data.fwhmBands)tip+=' — '+sqrFWHMCategory(item.value,data.fwhmModel)+' FWHM';
         svg.push('<g class="frame" data-index="'+i+'" tabindex="0" role="button" aria-label="'+sqrHTML(tip)+'"><title>'+sqrHTML(tip)+'</title>');
         // A full-height hit area also makes zero-valued bars selectable.
         svg.push('<rect x="'+(55+i*spacing)+'" y="35" width="'+spacing+'" height="140" fill="'+(item.selected?'#89dceb':'transparent')+'" fill-opacity=".12" pointer-events="all"/>');
         svg.push('<rect data-frame="'+i+'" x="'+x.toFixed(1)+'" y="'+py.toFixed(1)+'" width="'+width.toFixed(1)+'" height="'+(175-py).toFixed(1)+'" rx="3" fill="'+color+'" opacity="'+(item.rejected&&!item.selected ? .6 : 1)+'"'+(outline?' stroke="'+outline+'" stroke-width=".8"':'')+' filter="url(#shadow)"/>');
         if(item.selected)svg.push('<path data-selected="true" d="M'+(cx-3)+' 183L'+cx+' 178L'+(cx+3)+' 183Z" fill="#89dceb"/>');
         if(item.master){
            if(data.masterClipped){let top=data.masterClipped==='above',edge=top?35:175,tipY=top?edge-5:edge+5;
               svg.push('<path d="M'+(cx-3)+' '+edge+'L'+cx+' '+tipY+'L'+(cx+3)+' '+edge+'" fill="none" stroke="#f9a825" stroke-width="1.5"/>');}
            else svg.push('<circle cx="'+cx.toFixed(1)+'" cy="'+(py-5).toFixed(1)+'" r="3" fill="#f9a825"/>');
         }
         svg.push('</g>');});
      for(let band of bands.slice(0,2))if(band.high!==null&&band.high>=data.low&&band.high<=data.high)
         svg.push('<path class="'+bandClass+'-limit" d="M55 '+y(band.high)+'H385" stroke="'+band.color+'" stroke-width="1" stroke-dasharray="2,3" pointer-events="none"/>');
      if(data.average!==null){let py=y(data.average);svg.push('<g pointer-events="none"><path d="M55 '+py+'H385" stroke="#a6e3a1" stroke-width="1.5" stroke-dasharray="5,3"/><text x="60" y="'+(py-4)+'" fill="#a6e3a1" font-size="9" font-weight="bold">'+number(data.average)+'</text></g>');}
      if(data.skyModel?.valid&&data.skyModel.sqmValue!==null&&data.skyModel.sqmValue>=data.low&&data.skyModel.sqmValue<=data.high){let m=data.skyModel,py=y(m.sqmValue);
         svg.push('<g class="sqm-reference" pointer-events="none"><path d="M55 '+py+'H385" stroke="#f5c2e7" stroke-width="2" stroke-dasharray="7,3"/><text x="382" y="'+Math.max(44,py-4)+'" text-anchor="end" fill="#f5c2e7" font-size="10">SQM '+m.sqmReading.toFixed(2)+'</text></g>');}
      for(let run of data.autofocus||[]){
         let start=55+run.startSlot*spacing;
         let label='AF'+(run.focusPosition==null?'':' '+run.focusPosition),tagWidth=label.length*5+6;
         // Widen the tag for the position and keep it inside the SVG viewport.
         // The dashed line stays at the exact start slot even near an edge.
         let tagX=Math.max(tagWidth/2+2,Math.min(398-tagWidth/2,start));
         let tip='Autofocus start: '+run.startText+' (log time)\nUTC: '+new Date(run.start).toISOString()+'\nFocus position: '+sqrFocusPositionText(run)+'\n'+run.reason+(run.sourcePaths?.length?'\nLogs: '+run.sourcePaths.map(sqrFileName).join(', '):'');
         svg.push('<g class="autofocus" pointer-events="none"><path d="M'+start+' 35V175" stroke="#fab387" stroke-width="1" stroke-dasharray="2,2"/></g>');
         // Hover the AF tag below the axis; overlays leave all frame bars clickable.
         svg.push('<g class="af-tag"><title>'+sqrHTML(tip)+'</title><rect x="'+(tagX-tagWidth/2)+'" y="185" width="'+tagWidth+'" height="14" rx="2" fill="#252536"/><text x="'+tagX+'" y="195" text-anchor="middle" fill="#fab387" font-size="8" font-weight="bold">'+sqrHTML(label)+'</text></g>');
      }
      svg.push('<path d="M55 35V175H385" fill="none" stroke="#585b70"/>'+(data.master!==null?'<text x="385" y="17" text-anchor="end" fill="#f9a825" font-size="9">Master: '+number(data.master)+(data.masterClipped?' '+(data.masterClipped==='above'?'↑':'↓')+' clipped':'')+'</text>':''));
      let limit=value=>data.eccentricityBands?value.toFixed(2):number(value),unit=data.guideBands?'″':data.fwhmBands?' px':'';
      let legend=bands.length?'<div class="category-legend" style="text-align:center;font-size:12px;flex-shrink:0;padding:0 8px 4px">'+bands.map((band,i)=>{
         let range=data.skyBands?(band.label==='Good'?'< '+limit(band.high):band.label==='Bad'?'> '+limit(band.low):band.low===null?'≤ '+limit(band.high):band.high===null?'≥ '+limit(band.low):limit(band.low)+'–'+limit(band.high)):
            i===0?'≤ '+limit(band.high):i===1?'> '+limit(band.low)+' to '+limit(band.high):'> '+limit(band.low);
         return '<span style="color:'+band.color+'">'+band.label+' '+range+unit+'</span>';}).join(' &nbsp;·&nbsp; ')+'</div>':'';
      if(data.skyModel?.valid){let m=data.skyModel;
         legend+='<div class="bortle-legend'+(m.sqmValue!==null?' sqm-legend':'')+'" style="text-align:center;font-size:12px;padding:0 8px 4px">Bortle '+sqrSkyBortleLabel(m)+' · '+(m.sqmValue!==null?'SQM '+m.sqmReading.toFixed(2)+' mag/arcsec²':'Gaia calibration')+(m.calibration.transfer?' · relative to green':'')+'</div>';}
      body=legend+'<div class="chart"><svg viewBox="0 0 400 200" preserveAspectRatio="none">'+svg.join('')+'</svg></div>';
   }
   let script='window.sqrSelection=null;document.querySelectorAll(".frame").forEach(function(el){function select(){window.sqrSelection={generation:'+generation+',index:Number(el.dataset.index)};}el.addEventListener("click",select);el.addEventListener("keydown",function(e){if(e.key==="Enter"||e.key===" "){e.preventDefault();select();}});});';
   return '<!doctype html><html><head><meta charset="UTF-8"><style>*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#1e1e2e;color:#cdd6f4;font-family:"Segoe UI",system-ui,sans-serif}.container{height:100%;display:flex;flex-direction:column}.title{height:28px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;letter-spacing:.5px}.chart{flex:1;min-height:0;padding:0 5px 5px}svg{width:100%;height:100%}.frame{cursor:pointer}.frame:hover>[data-frame],.frame:focus>[data-frame]{stroke:#cdd6f4;stroke-width:1.2}.empty{margin:auto;padding:24px;text-align:center;color:#6c7086}</style></head><body><div class="container"><div class="title">'+sqrHTML(title)+'</div>'+body+'</div><script>'+script+'</script></body></html>';
}
/** Build an in-memory session from header reads. Group registered lights by
 * WBPP directory, exposure and geometry, then attach uniquely verified originals
 * and masters. The destination is excluded so previously moved lights stay out.
 * This stage does not load image pixels or move any files. */
function sqrScan(o,notify){
   let wbpp=sqrPath(o.wbpp),rawRoot=sqrPath(o.originals);
   if(!File.directoryExists(wbpp+'/registered'))throw new Error('Select a WBPP output folder containing registered/.');
   if(!File.directoryExists(rawRoot))throw new Error('Select the folder containing original lights.');
   if(sqrUnder(rawRoot,wbpp))throw new Error('The originals folder must be outside the WBPP output folder.');
   let registered=sqrWalk(wbpp+'/registered').filter(p=>!p.toLowerCase().includes('/ln_reference_frame_data/'));
   let masterFiles=File.directoryExists(wbpp+'/master')?sqrWalk(wbpp+'/master').filter(p=>/^masterLight_/i.test(sqrBase(p))):[];
   let rawFiles=sqrWalk(rawRoot,[wbpp,o.destination? sqrPath(o.destination):'']).filter(p=>!/^master/i.test(sqrBase(p)));
   let raws=[],warnings=[];
   for(let i=0;i<rawFiles.length;++i){
      sqrTick(notify,'Reading original headers '+(i+1)+' / '+rawFiles.length);
      try{let m=sqrMetadata(rawFiles[i]);if(sqrIsLight(m))raws.push(m);}catch(e){warnings.push(rawFiles[i]+': '+String(e));}
   }
   let groups=[],byGroup={},originalIndex=sqrIndexOriginals(raws);
   for(let i=0;i<registered.length;++i){
      sqrTick(notify,'Matching registered lights '+(i+1)+' / '+registered.length);
      let m=sqrMetadata(registered[i]);if(!sqrIsLight(m))continue;
      let dir=sqrDir(m.path),directoryName=dir.split('/').pop(),key=dir+'|'+m.exposure+'|'+m.width+'x'+m.height+'|'+m.channels;
      let g=byGroup[key];if(!g){g={id:key,directory:dir,directoryName:directoryName,
         label:directoryName,width:m.width,height:m.height,channels:m.channels,exposure:m.exposure,
         filter:m.filter||sqrFilterFromName(directoryName),
         master:'',rows:[],roi:null,regions:null};groups.push(g);byGroup[key]=g;}
      let found=sqrFindOriginal(m,raws,originalIndex);
      g.rows.push({registered:m,original:found.raw,match:found.state,reject:false,moved:false,candidate:false,metrics:{}});
   }
   if(!groups.length)throw new Error('No registered light images found. Supported formats: XISF and FITS.');
   for(let g of groups){g.master=sqrMasterFor(g,masterFiles);
      sqrMasterRow(g);
      sqrMasterScale(g);
      if(!g.master)warnings.push('No unique integrated master for filter '+(g.filter||'(unknown)')+' in master/: '+g.directoryName);}
   // A source exposure must not be moved once for several processed products.
   let occurrences={};for(let g of groups)for(let r of g.rows)if(r.original){let k=sqrKey(r.original.path);(occurrences[k]??=[]).push(r);}
   for(let k of Object.keys(occurrences))if(occurrences[k].length>1)for(let r of occurrences[k]){r.match='Original used more than once';r.original=null;}
   let session={schema:1,version:SQR_VERSION,created:new Date().toISOString(),options:{...o},groups:groups,warnings:warnings};
   let setup=sqrSessionPixelScale(session);
   if(setup.cameras.length>1)throw new Error('The reviewed images must come from one camera. Found: '+setup.cameras.join(', ')+'. Select input folders for a single camera.');
   if(setup.missingCamera.length)warnings.push('Camera identity is missing in '+setup.missingCamera.length+' reviewed image header(s); the single-camera condition could not be fully verified.');
   return session;
}
/** Load owned floating-point image data. The caller must free the returned
 * Image; failed reads free it here, and the file reader closes in all cases. */
function sqrReadImage(path,allowMultiple=false){
   let f=new FileFormatInstance(new FileFormat(File.extractExtension(path),true,false)),im=new Image;
   try{let d=f.open(path,'verbosity 0');if(!d||!d.length||(!allowMultiple&&d.length!==1)||!f.readImage(im))throw new Error('Cannot read image: '+path);return im;}
   catch(e){im.free();throw e;}finally{f.close();}
}
/** Choose a preparation budget from this computer's CURRENT free RAM and the
 * largest image. Honor existing CPU/file-concurrency preferences, changing none.
 * Reserve at most one eighth of available RAM (up to 8 GiB), estimating source,
 * crop and scratch pixels at 16 bytes per nominal sample. Unknown geometry or
 * memory status uses the serial path. This is a conservative working-set
 * estimate, not a limit on memory allocated inside file-format modules. */
function sqrPreparationThreads(items){
   if(items.length<2||typeof Thread==='undefined')return 1;
   try{
      if(!Settings.readGlobal('Process/EnableParallelProcessing',DataType.Boolean)||
         !Settings.readGlobal('Process/EnableParallelModuleProcessing',DataType.Boolean))return 1;
      let pixels=Math.max(...items.map(item=>item.width*item.height*item.channels));
      if(!(pixels>0)||!Number.isFinite(pixels))return 1;
      let memory=typeof System!=='undefined'?System.physicalMemoryStatus():null;
      if(!memory||!(memory.availableBytes>0)||!Number.isFinite(memory.availableBytes))return 1;
      let budget=Math.min(8*1024*1024*1024,memory.availableBytes/8);
      let count=Math.max(1,Math.min(8,items.length,Thread.numberOfProcessors,
         Math.max(1,Settings.readGlobal('Process/MaxFileReadThreads',DataType.Int32)),
         Math.max(1,Settings.readGlobal('Process/MaxFileWriteThreads',DataType.Int32)),
         Math.floor(budget/(16*pixels))));
      return Number.isFinite(count)?Math.floor(count):1;
   }catch(e){return 1;}
}
// Workers own their Images and file handles. Only ordinary cloned data crosses
// the thread boundary; no GUI, row objects or Image pointers are shared.
function sqrPreparationAbort(){
   // Console abort state belongs to the root script; workers use their own flag.
   let current=typeof Thread!=='undefined'?Thread.current:null;
   if(current?current.isAborted:console.abortRequested)throw new Error('Operation aborted.');
}
/** Bounded queue with deterministic result order. Pump events on the main
 * thread, propagate worker errors, and ALWAYS join every started worker before
 * returning or removing temporary files, including on abort or startup failure. */
function sqrMapPreparation(items,worker,helpers,notify,label){
   let count=sqrPreparationThreads(items),results=new Array(items.length);
   if(count===1){for(let i=0;i<items.length;++i){sqrTick(notify,label+' '+(i+1)+' / '+items.length);results[i]=worker(items[i]);}return results;}
   let source='(function(item){\n'+helpers.map(fn=>fn.toString()).join('\n')+'\nreturn ('+worker.toString()+')(item);\n})';
   let active=[],next=0,done=0;
   try{
      while(next<items.length||active.length){
         sqrTick(notify,label+' '+done+' / '+items.length);
         while(active.length<count&&next<items.length){let index=next++,thread=new Thread(source,items[index],{pooled:true});
            thread.start();active.push({index,thread});}
         // One bounded wait avoids busy polling. Check every worker afterwards,
         // so a slow first file never prevents finished slots from being reused.
         active[0].thread.wait(25);
         // In the installed runtime wait(0) waits indefinitely. Use a positive
         // timeout here as well, keeping cancellation and slot reuse responsive.
         for(let i=active.length-1;i>=0;--i){let job=active[i];if(!job.thread.wait(1))continue;
            if(job.thread.error)throw new Error(job.thread.error);
            results[job.index]=job.thread.result;active.splice(i,1);++done;}
      }
      sqrTick(notify,label+' '+done+' / '+items.length);return results;
   }finally{
      for(let job of active)job.thread.abort();
      for(let job of active)while(!job.thread.wait(25))CoreApplication.processEvents();
   }
}
function sqrPrepareBounds(item){
   let im=null;
   try{sqrPreparationAbort();im=sqrReadImage(item.path);let bounds=sqrBounds(im,item.margin);sqrPreparationAbort();return {bounds};}
   catch(e){sqrPreparationAbort();return {error:String(e)};}
   finally{if(im)im.free();}
}
/** Estimate usable bounds as [left, top, right, bottom], right/bottom exclusive.
 * Sample edges for zero padding and shrink inward; reject very small fields.
 * sqrAnalyze intersects these bounds so every frame uses identical coordinates. */
function sqrBounds(im,margin){
   let w=im.width,h=im.height,step=Math.max(4,Math.round(Math.min(w,h)/500));
   let r=[Math.ceil(w*margin/100),Math.ceil(h*margin/100),Math.floor(w*(1-margin/100)),Math.floor(h*(1-margin/100))];
   let valid=(x,y)=>{for(let c=0;c<im.numberOfNominalChannels;++c)if(Math.abs(im.sample(x,y,c))>1e-12)return true;return false;};
   // Exact-zero padding is tested along each edge; the margin guards sampling gaps.
   let edge=(side)=>{for(let j=0;j<=128;++j){let x=Math.round(r[0]+(r[2]-r[0]-1)*j/128),y=Math.round(r[1]+(r[3]-r[1]-1)*j/128);
      if(!valid(side===0?r[0]:side===2?r[2]-1:x,side===1?r[1]:side===3?r[3]-1:y))return false;}return true;};
   for(let pass=0;pass<1000;++pass){let changed=false;
      sqrPreparationAbort();
      for(let side=0;side<4;++side)if(!edge(side)){r[side]+=(side<2?step:-step);changed=true;}
      if(r[2]-r[0]<w*.5||r[3]-r[1]<h*.5)throw new Error('Less than half the field is free of sampled registration padding. Review this frame manually.');
      if(!changed)return r;
   }throw new Error('Could not determine usable field.');
}
// Derive the field, center and four corner rectangles in SQR_REGIONS order.
// Corner/center dimensions are percentages of the common usable field.
function sqrRegions(roi,patch){let [x0,y0,x1,y1]=roi,w=x1-x0,h=y1-y0,pw=Math.round(w*patch/100),ph=Math.round(h*patch/100),cx=Math.round((x0+x1-pw)/2),cy=Math.round((y0+y1-ph)/2);
   return [roi,[cx,cy,cx+pw,cy+ph],[x0,y0,x0+pw,y0+ph],[x1-pw,y0,x1,y0+ph],[x0,y1-ph,x0+pw,y1],[x1-pw,y1-ph,x1,y1]];}
// Field scoring requires valid signal and PSF support. Regional shape checks
// can remain useful when a small crop has no independent signal/noise estimate.
function sqrMetricValid(m,minStars,requireSignal){return Number.isFinite(m.fwhm)&&m.fwhm>0&&m.stars>=minStars&&(!requireSignal||(Number.isFinite(m.signal)&&m.signal>0&&m.psfCount>=minStars));}
/** Decode native SubframeSelector measurement columns into named properties.
 * Column indices belong to the PJSR process schema, not the review table.
 * Missing or insufficient results remain explicit invalid metrics for REVIEW. */
function sqrMeasurement(row,minStars,requireSignal=true){
   if(!row||row.length<26)return {valid:false,error:'No measurement returned'};
   let m={fwhm:row[5],eccentricity:row[6],signal:row[7],stars:row[14],psfCount:row[25]};
   m.valid=sqrMetricValid(m,minStars,requireSignal);
   if(!m.valid)m.error='Insufficient valid PSF measurements';return m;
}
/** Detect a compact, spatially distributed star catalogue ONCE per group. The
 * aligned master supplies positions only, never the transparency zero point.
 * Without a usable master, try up to three deterministic subframes. Native
 * StarDetector avoids another full-image JavaScript PSF fit for every light. */
function sqrPrepareTransparency(group,notify){
   let signature=group.measureSignature+'|'+(group.master?sqrMasterRow(group)?.measureSignature:'');
   if(group.transparencyCatalogue?.signature===signature)return;
   for(let row of sqrGroupRows(group)){delete row.transparencyPhotometry;row.relativeTransparency=null;row.transparencyInfo=null;row.skyQuality=null;row.skyQualityInfo=null;delete row.skyQualityModes;}
   let catalogue=group.transparencyCatalogue={signature,stars:[],error:''};
   const paths=[...(group.master?[group.master]:[]),...group.rows.filter(r=>!r.measureError).slice().sort((a,b)=>a.registered.path.localeCompare(b.registered.path)).slice(0,3).map(r=>r.registered.path)];
   let best=[],errors=[];
   for(let path of paths){let image=null,green=null;
      try{sqrTick(notify,'Selecting transparency stars — '+group.label);image=sqrReadImage(path,path===group.master);
         if(image.width!==group.width||image.height!==group.height)throw Error('Reference dimensions differ.');
         if(image.numberOfNominalChannels===3){green=new Image;green.assign(image,image.bounds,1,1);}
         let detector=new StarDetector;detector.fitPSF=false;detector.upperLimit=.9;detector.allowClusteredSources=false;
         let stars=detector.stars(green||image).map(s=>({x:s.pos.x,y:s.pos.y,r:Math.max(10,Math.ceil(2*Math.sqrt(s.size))),flux:s.flux}));
         let [x0,y0,x1,y1]=group.roi,cells=new Map,selected=[];
         for(let s of stars){sqrPreparationAbort();let outer=2*s.r;
            if(![s.x,s.y,s.r,s.flux].every(Number.isFinite)||s.r>24||s.x-outer<x0||s.y-outer<y0||s.x+outer>=x1||s.y+outer>=y1)continue;
            // Exclude neighbours from both the aperture and background annulus.
            if(stars.some(t=>t!==s&&Math.hypot(t.x-s.x,t.y-s.y)<outer+Math.min(t.r,24)))continue;
            let cell=Math.floor(4*(s.x-x0)/(x1-x0))+4*Math.floor(4*(s.y-y0)/(y1-y0)),count=cells.get(cell)||0;
            if(count>=10)continue;cells.set(cell,count+1);selected.push({x:s.x,y:s.y,r:s.r});
            if(selected.length>=160)break;
         }
         if(selected.length>best.length){best=selected;catalogue.source=path;}
         if(best.length>=20)break;
      }catch(e){sqrPreparationAbort();errors.push(String(e));}finally{if(green)green.free();if(image)image.free();}
   }
   catalogue.stars=best;
   if(best.length<10)catalogue.error='Fewer than 10 isolated transparency stars.'+(errors.length?' '+errors.join(' '):'');
}
/** Forced aperture photometry at common registered coordinates. Read small
 * sample blocks in bulk; no additional full-image read or per-frame detection.
 * A large fixed aperture reduces seeing sensitivity. The surrounding annulus
 * supplies a robust local background and noise estimate. Saturated, misplaced,
 * nonfinite and weak detections remain null, never zero throughput. */
function sqrTransparencyPhotometry(image,catalogue){
   if(catalogue.error)return {fluxes:[],error:catalogue.error};
   let channel=image.numberOfNominalChannels===3?1:0,fluxes=[];
   const median=a=>{a.sort((a,b)=>a-b);let m=a.length>>1;return a.length%2?a[m]:(a[m-1]+a[m])/2;};
   for(let star of catalogue.stars){sqrPreparationAbort();let {x,y,r}=star,outer=2*r;
      let x0=Math.floor(x-outer),y0=Math.floor(y-outer),x1=Math.ceil(x+outer)+1,y1=Math.ceil(y+outer)+1;
      if(x0<0||y0<0||x1>image.width||y1>image.height){fluxes.push(null);continue;}
      let w=x1-x0,h=y1-y0,pixels=new Float32Array(w*h);image.getSamples(pixels,new Rect(x0,y0,x1,y1),channel);
      let sky=[],core=[],bad=false,peak=-Infinity;
      for(let iy=0;iy<h;++iy)for(let ix=0;ix<w;++ix){let dx=x0+ix-x,dy=y0+iy-y,d2=dx*dx+dy*dy;
         if(d2>outer*outer)continue;let v=pixels[iy*w+ix];if(!Number.isFinite(v)){bad=true;continue;}
         if(d2<=r*r){core.push([v,dx,dy]);peak=Math.max(peak,v);}else if(d2>=2.25*r*r)sky.push(v);
      }
      if(bad||peak>=.95||sky.length<30||!core.length){fluxes.push(null);continue;}
      let background=median(sky),noise=1.4826*median(sky.map(v=>Math.abs(v-background)));
      // Clipping protects the background from faint unselected stars.
      if(noise>0){let clipped=sky.filter(v=>Math.abs(v-background)<=3*noise);if(clipped.length>=30){sky=clipped;background=median(sky);noise=1.4826*median(sky.map(v=>Math.abs(v-background)));}}
      let flux=0,sx=0,sy=0,positive=0;
      for(let [v,dx,dy] of core){let signal=v-background;flux+=signal;if(signal>0){positive+=signal;sx+=dx*signal;sy+=dy*signal;}}
      let uncertainty=Math.max(noise,1e-8)*Math.sqrt(core.length*(1+core.length/sky.length));
      let centered=positive>0&&Math.hypot(sx,sy)/positive<=Math.max(1.5,.2*r);
      fluxes.push(centered&&flux>10*uncertainty?flux:null);
   }
   return {fluxes,error:fluxes.filter(v=>v>0).length<10?'Fewer than 10 usable unsaturated stars.':''};
}
// Clip multiplicative outliers in log space: variable stars, cosmic rays and
// residual blends must not determine the throughput of the entire exposure.
function sqrTransparencyRatio(ratios){
   let values=ratios.filter(v=>Number.isFinite(v)&&v>0).map(Math.log);
   for(let pass=0;pass<3&&values.length;++pass){let center=sqrMedian(values),sigma=1.4826*sqrMedian(values.map(v=>Math.abs(v-center)));
      values=values.filter(v=>Math.abs(v-center)<=Math.max(.03,3*sigma));}
   if(values.length<10)return null;
   let center=sqrMedian(values);return {ratio:Math.exp(center),count:values.length,scatter:1.4826*sqrMedian(values.map(v=>Math.abs(v-center)))};
}
/** Establish one stable subframe reference independently of scores, rejection
 * flags, corner scoring and UI sort order. Ensemble-normalized stellar rates
 * select the strongest frame; final values use direct matched-star ratios to
 * that frame. Measure the master against this SAME subframe reference without
 * letting it influence reference selection. Its recorded frame exposure gives
 * an effective throughput of the normalized integration, not atmospheric
 * transparency or the SNR benefit of stacking many exposures. */
function sqrFinalizeTransparency(group){
   let all=sqrGroupRows(group),measured=all.filter(r=>sqrExposure(r)>0&&!r.transparencyPhotometry?.error&&r.transparencyPhotometry?.fluxes?.length),rows=measured.filter(r=>!r.isMaster);
   for(let r of all){r.relativeTransparency=null;r.transparencyInfo={error:!sqrExposure(r)?(r.isMaster?'Master frame exposure is unavailable; total integration time cannot replace it.':'Exposure time is unavailable.'):r.transparencyPhotometry?.error||'Insufficient matching stars.'};}
   let count=group.transparencyCatalogue?.stars.length||0;
   let ensemble=Array.from({length:count},(_,i)=>{let values=rows.map(r=>r.transparencyPhotometry.fluxes[i]/sqrExposure(r)).filter(v=>v>0&&Number.isFinite(v));return values.length?sqrMedian(values):null;});
   let levels=rows.map(row=>({row,level:sqrTransparencyRatio(row.transparencyPhotometry.fluxes.map((v,i)=>v>0&&ensemble[i]>0?v/sqrExposure(row)/ensemble[i]:null))})).filter(x=>x.level);
   levels.sort((a,b)=>b.level.ratio-a.level.ratio||a.row.registered.path.localeCompare(b.row.registered.path));
   let reference=levels[0]?.row;
   group.transparencySummary=reference?'Reference (100%): '+sqrFileName(reference.registered.path)+'. Selected by the strongest ensemble-normalized stellar flux per second, independently of Score. Values can exceed 100% through measurement scatter or differing matched stars.':group.transparencyCatalogue?.error||'No reliable transparency reference is available.';
   if(!reference){for(let row of measured)row.transparencyInfo={error:'No reliable subframe transparency reference is available.'};return;}
   for(let row of measured){let result=sqrTransparencyRatio(row.transparencyPhotometry.fluxes.map((v,i)=>{let ref=reference.transparencyPhotometry.fluxes[i];return v>0&&ref>0?(v/sqrExposure(row))/(ref/sqrExposure(reference)):null;}));
      if(result){row.relativeTransparency=result.ratio;row.transparencyInfo={reference:reference.registered.path,matched:result.count,scatter:result.scatter,error:''};}}
}
function sqrMasterQualityNote(row){return row.isMaster?'\nMaster comparison: recorded frame exposure '+sqrFmt(sqrExposure(row),2)+' s, not total integration time. Integration normalization affects these values; they do not measure the session atmosphere or the SNR gain from stacking.':'';}
function sqrTransparencyDescription(row){
   let info=row.transparencyInfo;
   return Number.isFinite(row.relativeTransparency)?'Transparency: '+sqrPercent(row.relativeTransparency)+'\nReference (100%): '+sqrFileName(info.reference)+'\nMatched stars: '+info.matched+'; robust log-ratio scatter: '+sqrFmt(info.scatter,4)+'.\nExposure-corrected stellar flux; RGB uses green.'+sqrMasterQualityNote(row):info?.error||'Measure the subframes to estimate relative transparency.';
}
/** Arithmetic pixel means are independent of star detection. Read all nominal
 * channels (green for RGB, no alpha), with no stretch, clipping or star rejection.
 * Cache during existing image reads; reranking and blinking never read pixels.
 * Whole-image really means the entire registered image, including its borders. */
function sqrBackgroundComplete(row,withCorners){
   let b=row.backgroundMeans;
   return !!b&&(row.registered?.channels!==3||b.channel===1)&&Object.prototype.hasOwnProperty.call(b,'whole')&&(!withCorners||[1,2,3,4,5].every(i=>Object.prototype.hasOwnProperty.call(b.previews||{},i)));
}
function sqrMeasureBackground(row,image,regions,withCorners){
   let channel=image.numberOfNominalChannels===3?1:0;
   if(row.backgroundMeans&&image.numberOfNominalChannels===3&&row.backgroundMeans.channel!==1)delete row.backgroundMeans;
   let b=row.backgroundMeans??={previews:{},channel};b.previews??={};
   const mean=rect=>{let value=image.mean(new Rect(...rect),channel,channel);return Number.isFinite(value)?value:null;};
   if(!Object.prototype.hasOwnProperty.call(b,'whole'))b.whole=mean([0,0,image.width,image.height]);
   if(withCorners)for(let i=1;i<=5;++i)if(!Object.prototype.hasOwnProperty.call(b.previews,i))b.previews[i]=mean(regions[i]);
}
// A partial set cannot establish the minimum of all five previews. Missing
// background values stay unavailable even if the corresponding PSF fit succeeds.
function sqrSkyBackground(row,withCorners){
   let b=row.backgroundMeans;if(!b||(row.registered?.channels===3&&b.channel!==1))return null;
   if(!withCorners)return Number.isFinite(b.whole)?b.whole:null;
   let means=[1,2,3,4,5].map(i=>b.previews?.[i]);
   return means.every(Number.isFinite)?Math.min(...means):null;
}
function sqrBackgroundDescription(row,withCorners){
   let b=row.backgroundMeans;
   return (withCorners?'Minimum of the center and four corner preview means.':'Mean of the whole registered image, including registration borders.')+
      ' In image units; RGB uses the green channel. Lower is better.'+
      (withCorners?'\nPreview means: '+[1,2,3,4,5].map(i=>SQR_REGIONS[i]+' '+sqrFmt(b?.previews?.[i],6)).join(' · '):'');
}
/** Combine existing brightness and transmission measurements only; no pixel
 * access and no new noise estimate. For a faint background-limited source,
 * relative SNR at equal exposure is proportional to transmission/sqrt(sky rate).
 * The reported pixel mean is a sky-brightness proxy, not a noise measurement.
 * Use the same transparency reference rather than choosing a score-dependent
 * optimum. Missing/nonpositive backgrounds are not clamped to an artificial
 * floor, which could incorrectly reward subtracted or invalid images. */
function sqrSkyQualityInputs(row,withCorners){
   let transparency=row.relativeTransparency;
   if(!Number.isFinite(transparency)||transparency<=0)return {error:'Transparency is unavailable.'};
   let brightness=sqrSkyBackground(row,withCorners),exposure=sqrExposure(row);
   if(brightness===null)return {error:'Sky brightness is unavailable'+(withCorners?'; all five preview means are required.':'.')};
   if(exposure===null)return {error:'Exposure time is unavailable.'};
   let pedestal;
   try{pedestal=sqrSkyPedestal(row.registered);}catch(e){return {error:String(e)};}
   let rate=(brightness-pedestal)/exposure;
   if(!Number.isFinite(rate)||rate<=0)return {error:'Sky brightness must be positive after removing the recorded pedestal.'};
   return {transparency,brightness,pedestal,exposure,rate,error:''};
}
function sqrUpdateSkyQuality(group,withCorners){
   let all=sqrGroupRows(group);
   let referenceKeys=new Set(group.rows.filter(r=>Number.isFinite(r.relativeTransparency)&&r.transparencyInfo?.reference).map(r=>sqrKey(r.transparencyInfo.reference)));
   let reference=referenceKeys.size===1?group.rows.find(r=>sqrKey(r.registered.path)===[...referenceKeys][0]):null;
   // R1 and R2 need independent background bases even when the other mode is
   // displayed. Compute both cheaply from cached means; never remeasure pixels.
   for(let row of all)row.skyQualityModes={};
   for(let corners of [false,true]){
      let inputs=new Map(all.map(r=>[r,sqrSkyQualityInputs(r,corners)])),ref=reference?inputs.get(reference):null;
      let reason=!ref?'A unique transparency reference is unavailable.':ref.error?'The transparency reference has no usable Sky brightness: '+ref.error:'';
      for(let row of all){let values=inputs.get(row),result={value:null,info:{error:values.error||reason}};
         if(!result.info.error){
            // Evaluate in log space to avoid overflowing intermediate ratios.
            let value=Math.exp(Math.log(values.transparency)-Math.log(ref.transparency)+.5*(Math.log(ref.rate)-Math.log(values.rate)));
            result=Number.isFinite(value)&&value>0?{value,info:{...values,reference:reference.registered.path,referenceTransparency:ref.transparency,referenceRate:ref.rate,withCorners:corners,error:''}}:
               {value:null,info:{error:'The combined quality ratio is outside the supported numeric range.'}};
         }
         row.skyQualityModes[corners?'corners':'field']=result;
         if(corners===!!withCorners){row.skyQuality=result.value;row.skyQualityInfo=result.info;}
      }
      if(corners===!!withCorners)group.skyQualitySummary='Background basis: '+(corners?'minimum of the five preview means.':'whole-image mean.')+' '+(reason||
         'Reference (100%): '+sqrFileName(reference.registered.path)+'. Uses the current Sky brightness KPI; changing corner scoring updates this combined indicator. Values above 100% indicate a better transparency/background balance than the reference.');
   }
}
function sqrSkyQualityDescription(row){
   let info=row.skyQualityInfo;
   return Number.isFinite(row.skyQuality)&&info?'Sky quality: '+sqrPercent(row.skyQuality)+'\nQ = (T / Tref) × sqrt(Bref / B).\nReference (100%): '+sqrFileName(info.reference)+
      '\nTransparency: '+sqrPercent(info.transparency)+'; reference: '+sqrPercent(info.referenceTransparency)+'.\nSky brightness rate: '+sqrPlotNumber(info.rate)+'; reference: '+sqrPlotNumber(info.referenceRate)+' image units/s.'+
      '\nBackground basis: '+(info.withCorners?'minimum of five preview means':'whole-image mean')+'.'+sqrMasterQualityNote(row):info?.error||'Measure Sky brightness and Transparency to calculate Sky quality.';
}
function sqrActiveRegions(o){return o.measureCorners?[0,1,2,3,4,5]:[0];}
// An attempted but invalid measurement is still a result. Do not repeatedly
// launch the same unsuccessful measurement when clicking Measure corners again.
function sqrMissingCornerMeasurements(session){return !session||session.groups.some(g=>sqrGroupRows(g).some(r=>[1,2,3,4,5].some(i=>!r.metrics[i])||!sqrBackgroundComplete(r,true)));}
// Corner inclusion is session data, never a saved preference. Partial results
// count too, so unavailable regions remain visible for review after an abort.
function sqrHasCornerMeasurements(session){return !!session?.groups.some(g=>sqrGroupRows(g).some(r=>[1,2,3,4,5].some(i=>!!r.metrics[i]||Object.prototype.hasOwnProperty.call(r.backgroundMeans?.previews||{},i))));}
/** Bound regional concurrency by this machine's permitted CPU count and current
 * free memory. Extra native workers hide scheduling waits for small crops; they
 * do not increase the application's CPU or file-I/O limits. Reserve at most a
 * half of free RAM / 64 GiB, estimating 64 bytes per sample plus 16 MiB per
 * job for native image/statistics scratch space. Limit the queue to eight workers
 * per permitted processor, at most 512, to avoid excessive thread overhead.
 * These are conservative estimates, not a hard memory limit. Unknown capacity
 * keeps the original native defaults. Respect PixInsight's file-I/O limits.
 * Full-field batches retain their original scheduling and measurement settings. */
function sqrMeasurementPlan(jobs){
   let unchanged={batchSize:Math.max(1,jobs.length),overload:1,fileThreads:true};
   if(jobs.length<2||jobs.some(j=>j.region===0))return unchanged;
   try{
      if(!Settings.readGlobal('Process/EnableParallelProcessing',DataType.Boolean)||
         !Settings.readGlobal('Process/EnableParallelModuleProcessing',DataType.Boolean))
         return {batchSize:1,overload:1,fileThreads:false};
      let processors=Math.min(Thread.numberOfProcessors,Settings.readGlobal('Process/MaxProcessors',DataType.Int32));
      let pixels=Math.max(...jobs.map(j=>j.pixels)),memory=System.physicalMemoryStatus();
      if(!Number.isFinite(processors)||processors<1||!Number.isFinite(pixels)||pixels<=0||
         !memory||!Number.isFinite(memory.availableBytes)||memory.availableBytes<=0)return unchanged;
      processors=Math.floor(processors);
      if(processors===1)return {batchSize:1,overload:1,fileThreads:false};
      let budget=Math.min(64*1024*1024*1024,memory.availableBytes/2);
      let capacity=Math.max(1,Math.floor(budget/(64*pixels+16*1024*1024)));
      let workers=Math.max(1,Math.min(jobs.length,512,8*processors,capacity));
      return {batchSize:workers,overload:Math.max(1,Math.min(8,Math.floor(100*workers/processors)/100)),fileThreads:workers>1};
   }catch(e){return unchanged;}
}
/** Measure every submitted job with native SubframeSelector. Each job
 * identifies a temporary path and its destination row/region. Disable the file
 * cache because temporary crop paths must not reuse another image's metrics.
 * Bound corner batches so extra workers cannot multiply memory use without limit. */
function sqrMeasureBatch(jobs,o){
   let plan=sqrMeasurementPlan(jobs);
   for(let first=0;first<jobs.length;first+=plan.batchSize){
      if(console.abortRequested)throw new Error('Operation aborted.');
      let batch=jobs.slice(first,first+plan.batchSize);
      let p=new SubframeSelector;p.routine=SubframeSelector.MeasureSubframes;p.nonInteractive=true;p.fileCache=false;
      p.subframeScale=1;p.noNoiseAndSignalWarnings=true;p.maxPSFFits=o.maxFits;p.psfFit=SubframeSelector.Moffat4;
      p.useFileThreads=plan.fileThreads;p.fileThreadOverload=plan.overload;
      p.psfFitCircular=false;p.onError=SubframeSelector.Continue;
      p.subframes=batch.map(j=>[true,j.path,'','']);
      let ok=p.executeGlobal();
      if(console.abortRequested)throw new Error('Operation aborted.');
      // Parallel processing and failed files can change output order and length.
      // Match the returned file path (column 3), never the result's row position.
      let results=new Map;for(let m of p.measurements)results.set(sqrKey(m[3]),m);
      for(let j of batch){let m=results.get(sqrKey(j.path));
         j.row.metrics[j.region]=m?sqrMeasurement(m,o.minStars,j.region===0):
            {valid:false,error:ok?'No measurement returned':'Measurement failed'};}
   }
}
/** Prepare one image with independently owned handles. Read failures remain
 * per-image unavailable measurements; write failures stop the run. The caller
 * registers every output path before starting workers, so cleanup also covers
 * partially written files and workers interrupted before returning results. */
function sqrPrepareCrops(item){
   let im=null,row={backgroundMeans:item.backgroundMeans},photometry=item.transparencyPhotometry;
   try{sqrPreparationAbort();im=sqrReadImage(item.path,item.isMaster);
      if(im.width!==item.width||im.height!==item.height||im.numberOfNominalChannels!==item.channels)throw new Error('Image dimensions or channels do not match this group: '+item.path);
      sqrMeasureBackground(row,im,item.regions,item.withCorners);
   }catch(e){if(im)im.free();sqrPreparationAbort();
      let b=row.backgroundMeans??={previews:{}};if(!Object.prototype.hasOwnProperty.call(b,'whole'))b.whole=null;
      if(item.withCorners)for(let i=1;i<=5;++i)if(!Object.prototype.hasOwnProperty.call(b.previews,i))b.previews[i]=null;
      return {backgroundMeans:row.backgroundMeans,transparencyPhotometry:photometry||{fluxes:[],error:String(e)},error:String(e)};
   }
   try{if(item.transparencyCatalogue&&!photometry){let start=Date.now();
      try{photometry=sqrTransparencyPhotometry(im,item.transparencyCatalogue);}
      catch(e){sqrPreparationAbort();photometry={fluxes:[],error:String(e)};}
      photometry.milliseconds=Date.now()-start;
   }
   for(let job of item.jobs){sqrPreparationAbort();let crop=new Image,writer=null;
      try{crop.assign(im,new Rect(...item.regions[job.region]),0,im.numberOfNominalChannels-1);
         // Pixel-only files prevent reuse of calibration-stage signal/noise metadata.
         writer=new FileFormatInstance(new FileFormat('.xisf',false,true));
         if(!writer.create(job.path,'compression-codec none'))throw new Error('Cannot create temporary measurement image.');
         let description=new ImageDescription;description.bitsPerSample=im.bitsPerSample;description.ieeefpSampleFormat=true;
         writer.setOptions(description);
         if(!writer.writeImage(crop))throw new Error('Cannot write temporary measurement image.');
      }finally{if(writer)writer.close();crop.free();}
   }sqrPreparationAbort();return {backgroundMeans:row.backgroundMeans,transparencyPhotometry:photometry};}
   finally{im.free();}
}
/** Stage missing field/regional crops and means with bounded parallelism. Native
 * measurement batches retain the original field/region ordering regardless of
 * worker completion order. The UI/session is updated only on the main thread. */
function sqrMeasureGroups(groups,o,active,notify){
   let eligible=groups.flatMap(g=>sqrGroupRows(g).filter(r=>!r.measureError&&(active.some(i=>!r.metrics[i])||!sqrBackgroundComplete(r,o.measureCorners)||!r.transparencyPhotometry)).map(r=>({r,g})));
   if(!eligible.length){for(let g of groups)sqrFinalizeTransparency(g);return;}
   let scratch=sqrPath(File.systemTempDirectory)+'/.sqr-work-'+sqrStamp();File.createDirectory(scratch,true);
   let passes=[[],[]],files=new Set,completed=0;
   let total=eligible.reduce((n,item)=>n+active.filter(i=>!item.r.metrics[i]).length,0);
   let clean=paths=>{for(let path of paths){if(File.exists(path))File.remove(path);files.delete(path);}};
   let measurePass=jobs=>{if(!jobs.length)return;
      sqrTick(notify,'Measuring '+(jobs[0].region===0?'full fields':'center/corner regions')+' · '+jobs.length+' images · '+completed+' / '+total+' completed');
      sqrMeasureBatch(jobs,o);completed+=jobs.length;clean(jobs.map(j=>j.path));
      sqrTick(notify,'Measured '+completed+' / '+total+' regions');
   };
   try{
      let items=eligible.map(({r,g},index)=>({path:r.registered.path,isMaster:!!r.isMaster,
         width:g.width,height:g.height,channels:g.channels,regions:g.regions,withCorners:o.measureCorners,backgroundMeans:r.backgroundMeans,
         transparencyCatalogue:g.transparencyCatalogue,transparencyPhotometry:r.transparencyPhotometry,
         jobs:active.filter(i=>!r.metrics[i]).map(region=>{let path=scratch+'/frame-'+index+'-region-'+region+'.xisf',rect=g.regions[region];files.add(path);
            return {path,region,pixels:(rect[2]-rect[0])*(rect[3]-rect[1])*g.channels};})}));
      let results=sqrMapPreparation(items,sqrPrepareCrops,[sqrReadImage,sqrPreparationAbort,sqrMeasureBackground,sqrTransparencyPhotometry],notify,'Preparing images');
      for(let index=0;index<items.length;++index){let r=eligible[index].r,result=results[index];r.backgroundMeans=result.backgroundMeans;r.transparencyPhotometry=result.transparencyPhotometry;
         for(let job of items[index].jobs){if(result.error){r.metrics[job.region]={valid:false,error:result.error};++completed;}
            else passes[job.region===0?0:1].push({...job,row:r});}}
      for(let g of groups)sqrFinalizeTransparency(g);
      for(let jobs of passes)measurePass(jobs);
   }finally{clean(files);if(File.directoryExists(scratch))File.removeDirectory(scratch);}
}
// Invalidate a master's measurement cache when the file or shared crop changes.
// Master failures are retained as invalid comparison data, not rejection flags.
function sqrPrepareMaster(g,o,active){
   let master=sqrMasterRow(g);if(!master)return;
   try{
      let fingerprint=sqrFingerprint(g.master);
      // Read the small header once per file revision. Keep header failures
      // diagnostic: PSF and pixel measurements can still be useful on their own.
      if(master.metadataFingerprint!==fingerprint){
         try{master.registered=sqrMetadata(g.master,true);}
         catch(e){if(console.abortRequested)throw e;master.registered={path:g.master};}
         master.metadataFingerprint=fingerprint;
      }
      let signature=JSON.stringify({version:SQR_VERSION,file:[g.master,fingerprint],roi:g.roi,
         patch:o.patch,maxFits:o.maxFits});
      if(master.measureSignature!==signature){master.metrics={};delete master.backgroundMeans;delete master.measureError;master.measureSignature=signature;}
   }catch(e){if(console.abortRequested)throw e;master.measureSignature='';delete master.backgroundMeans;
      for(let i of active)master.metrics[i]={valid:false,error:String(e)};}
}
/** Coordinate border discovery, cache validation, measurement and ranking.
 * Signatures include file fingerprints and measurement settings. Weights and
 * the REVIEW percentage are excluded because they only affect derived scores.
 * Measuring corners fills missing regions without discarding valid field metrics. */
function sqrAnalyze(session,notify){
   let o=session.options,active=sqrActiveRegions(o);
   for(let g of session.groups){
      let signature=JSON.stringify({version:SQR_VERSION,method:'clean-crops-v1',patch:o.patch,margin:o.margin,maxFits:o.maxFits,
         files:g.rows.map(r=>[r.registered.path,sqrFingerprint(r.registered.path)]).sort((a,b)=>a[0].localeCompare(b[0]))});
      if(g.measureSignature===signature&&g.rows.every(r=>active.every(i=>r.metrics[i]))){
         sqrTick(notify,'Using existing subframe measurements: '+g.label);sqrPrepareMaster(g,o,active);
         continue;}
      if(g.measureSignature!==signature){
       let roi=[0,0,g.width,g.height];
       for(let r of g.rows){r.metrics={};delete r.backgroundMeans;delete r.measureError;}
       let items=g.rows.map(r=>({path:r.registered.path,width:g.width,height:g.height,channels:g.channels,margin:o.margin}));
       let bounds=sqrMapPreparation(items,sqrPrepareBounds,[sqrReadImage,sqrPreparationAbort,sqrBounds],notify,'Checking registered borders — '+g.label);
       for(let i=0;i<g.rows.length;++i){let result=bounds[i];if(result.error)g.rows[i].measureError=result.error;
          else{let b=result.bounds;roi=[Math.max(roi[0],b[0]),Math.max(roi[1],b[1]),Math.min(roi[2],b[2]),Math.min(roi[3],b[3])];}}
       if(roi[2]-roi[0]<g.width*.5||roi[3]-roi[1]<g.height*.5)throw new Error('Insufficient common field: '+g.label);
       g.roi=roi;g.regions=sqrRegions(roi,o.patch);g.measureSignature=signature;
      }
      for(let r of g.rows)if(r.measureError){r.backgroundMeans={whole:null,previews:Object.fromEntries(active.filter(i=>i>0).map(i=>[i,null]))};for(let i of active)r.metrics[i]={valid:false,error:r.measureError};}
      sqrPrepareMaster(g,o,active);
   }
   for(let g of session.groups)sqrPrepareTransparency(g,notify);
   sqrMeasureGroups(session.groups,o,active,notify);
   sqrRank(session);return session;
}
const SQR_MASTER_SCORE_INFO='Integrated master: measurements only; excluded from Score and R1–R4 ranks.';
// Clear legacy cached scores as well as current assessments, without touching
// measurements or their comparison diagnostics. A master is never a candidate.
function sqrExcludeMasterScore(row){
   for(let key of ['score','scoreWithoutCorners','scoreWithCorners','scoreCorrelated','scoreRankOfRanks',
      'rank','rankWithoutCorners','rankWithCorners','rankCorrelated','rankOfRanks'])row[key]=null;
   row.rankComponents=[];row.rankOfRanksDetail=SQR_MASTER_SCORE_INFO;
   row.reject=false;row.candidate=false;row.guidingIgnored=true;row.needsDataReview=false;row.insufficientCorners=0;
   row.scoreContributions=[];row.dataReviewReasons=[];row.reasons=[SQR_MASTER_SCORE_INFO];
   row.mainIssue='';row.mainIssueDetail=SQR_MASTER_SCORE_INFO;
}
// Rank 1 is the lowest (worst) finite subframe score. Missing scores and masters
// receive no rank. Table filtering happens after this complete population.
function sqrAssignRanks(rows,scoreKey,rankKey){
   for(let r of rows){r[rankKey]=null;if(r.isMaster)r[scoreKey]=null;}
   let ranked=rows.filter(r=>!r.isMaster&&Number.isFinite(r[scoreKey])).sort((a,b)=>a[scoreKey]-b[scoreKey]||a.registered.path.localeCompare(b.registered.path));
   for(let i=0;i<ranked.length;++i)ranked[i][rankKey]=i+1;
}
// R4 combines the displayed ranks, normalized separately for each available
// subframe population. The master contributes neither a rank nor a population slot.
// Missing ranks are omitted, never interpreted as best or worst measurements.
function sqrRankOfRanks(rows,withCorners){
   let sources=[['rankWithoutCorners','R1: field rank'],...(withCorners?[['rankWithCorners','R2: rank with corners']]:[]),['rankCorrelated','R3: correlation rank']]
      .map(([key,name])=>({key,name,count:rows.filter(r=>!r.isMaster&&Number.isFinite(r[key])).length}));
   for(let r of rows){
      if(r.isMaster){sqrExcludeMasterScore(r);continue;}
      r.rankComponents=sources.filter(c=>Number.isFinite(r[c.key])).map(c=>({...c,rank:r[c.key],value:c.count>1?(r[c.key]-1)/(c.count-1):.5}));
      r.scoreRankOfRanks=r.rankComponents.length?r.rankComponents.reduce((sum,c)=>sum+c.value,0)/r.rankComponents.length:null;
      r.rankOfRanksDetail='R4 averages normalized ranks with equal weight. For each rank: (rank − 1) / (ranked images − 1); a single ranked image uses 0.5. Higher is better.\n'+
         r.rankComponents.map(c=>c.name+': '+c.rank+' of '+c.count+' → '+sqrFmt(c.value)).join('\n');
      let omitted=sources.filter(c=>!Number.isFinite(r[c.key])).map(c=>c.name);
      if(!withCorners)omitted.push('R2 (corner scoring off)');
      if(omitted.length)r.rankOfRanksDetail+='\nOmitted: '+omitted.join(', ')+'.';
      r.rankOfRanksDetail+='\nCombined Score: '+sqrFmt(r.scoreRankOfRanks)+'. Ranks include subframes only; equal scores are ordered by filename.';
   }
   sqrAssignRanks(rows,'scoreRankOfRanks','rankOfRanks');
}
// Preserve manual evaluation while computing the independent R3 comparison.
// Arrays are replaced by scoring functions, so shallow snapshots retain them.
const SQR_ACTIVE_SCORE_FIELDS=['score','guidingIgnored','reasons','dataReviewReasons','needsDataReview','scoreContributions','mainIssue','mainIssueDetail','insufficientCorners'];
function sqrScoreState(row){return Object.fromEntries(SQR_ACTIVE_SCORE_FIELDS.map(key=>[key,row[key]]));}
function sqrApplyRankOfRanks(row,automatic){
   if(row.isMaster){sqrExcludeMasterScore(row);return;}
   row.score=row.scoreRankOfRanks;
   // Guiding can participate through R3 even when its manual R1/R2 weight is 0.
   row.guidingIgnored=row.guidingIgnored&&automatic.guidingIgnored;
   row.dataReviewReasons=[...new Set([...(row.dataReviewReasons||[]),...(automatic.dataReviewReasons||[])])];row.needsDataReview=row.dataReviewReasons.length>0;
   let count=row.rankComponents.length;
   row.scoreContributions=row.rankComponents.filter(c=>c.value<1).map(c=>({key:c.key,name:c.name,issue:'Low '+c.name.slice(0,2)+' rank',w:1,z:10*(1-c.value),contribution:(1-c.value)/count})).sort((a,b)=>b.contribution-a.contribution);
   row.mainIssue=row.scoreContributions[0]?.issue||(row.needsDataReview?'Missing data':'None');
   row.mainIssueDetail=row.rankOfRanksDetail+(row.needsDataReview?'\nSome component measurements require inspection.':'');
   row.reasons=row.scoreContributions.map(c=>c.name+' (−'+sqrFmt(c.contribution)+' from Score)');
   if(!row.reasons.length)row.reasons.push('No rank penalty');
   if(row.needsDataReview)row.reasons.unshift('Insufficient measurements: inspect manually');
}
/** Calculate the breadth of poor quality before Score, avoiding a dependency
 * cycle. Only underlying KPIs with positive manual weights count; R3's effective
 * weights never redefine this measurement. Score and this fraction itself never
 * count. A fraction uses available comparisons, while completeness
 * records missing ones so a partial percentage cannot look fully assessed.
 * Keep separate field-only and corner-inclusive fractions for independent R1/R2.
 * Baselines include rejected subframes but exclude the integrated master. */
function sqrMeanComparisons(group,o,guideEnabled=false){
   let sky=sqrSkyScoreChoice(o),components=[
      {label:'PSF signal weight',weight:o.signalWeight,lower:true,value:r=>sqrKPIValue(r,SQR_KPIS[1])},
      {label:'Star count',weight:o.starsWeight,lower:true,value:r=>sqrKPIValue(r,SQR_KPIS[2])},
      {label:'Field FWHM',weight:o.fwhmWeight,value:r=>sqrKPIValue(r,SQR_KPIS[3])},
      {label:'Field eccentricity',weight:o.eccentricityWeight,value:r=>sqrKPIValue(r,SQR_KPIS[5])},
      {label:sky.name,backgroundMode:'field',lower:sky.higher,weight:o.backgroundWeight,value:r=>sqrSkyScoreValue(r,o,false)},
      {label:sky.name,backgroundMode:'corners',lower:sky.higher,weight:o.backgroundWeight,value:r=>sqrSkyScoreValue(r,o,true)},
      {label:'Corner quality',corner:true,weight:o.cornerWeight,value:r=>r.metrics[0]?.valid&&r.metrics[1]?.valid&&[2,3,4,5].every(i=>sqrEccentricityValid(r.metrics[i]))?r.measuredCornerSeverity:null}
   ];if(guideEnabled)components.push({label:'Guiding quality (arcsec)',guiding:true,weight:o.guideWeight,value:r=>r.guideQuality});
   components=components.filter(c=>c.weight>0);
   // Ranking reorders rows; sum in a fixed order so displayed means stay stable.
   for(let c of components){let values=group.rows.map(c.value).filter(Number.isFinite).sort((a,b)=>a-b);c.mean=values.length?values.reduce((sum,v)=>sum+v,0)/values.length:null;}
   for(let r of sqrGroupRows(group)){
      let allComparisons=components.filter(c=>!c.guiding||!r.isMaster&&!r.guidingIgnored).map(c=>{let value=c.value(r),available=Number.isFinite(value)&&Number.isFinite(c.mean);
         // Ignore rounding noise at equality; the criterion is a strict worse-than-mean comparison.
         let delta=available?(c.lower?c.mean-value:value-c.mean):0,tolerance=available?1e-12*Math.max(1,Math.abs(value),Math.abs(c.mean)):0;
         return {label:c.label,corner:c.corner,backgroundMode:c.backgroundMode,lower:c.lower,value,mean:c.mean,available,worse:available&&delta>tolerance};});
      let fieldComparisons=allComparisons.filter(c=>!c.corner&&c.backgroundMode!=='corners');
      allComparisons=allComparisons.filter(c=>c.backgroundMode!=='field');
      let fraction=items=>{let available=items.filter(c=>c.available);return available.length?available.filter(c=>c.worse).length/available.length:null;};
      r.belowMeanFieldFraction=fraction(fieldComparisons);r.belowMeanCornerFraction=fraction(allComparisons);
      let comparisons=o.measureCorners?allComparisons:fieldComparisons;
      r.belowMeanAvailable=comparisons.filter(c=>c.available).length;r.belowMeanTotal=comparisons.length;
      r.belowMeanComplete=r.belowMeanAvailable===comparisons.length&&comparisons.length>0;
      r.belowMeanCount=r.belowMeanAvailable?comparisons.filter(c=>c.worse).length:null;
      r.belowMeanFraction=r.belowMeanAvailable?r.belowMeanCount/r.belowMeanAvailable:null;
      r.belowMeanDetail=(r.belowMeanFraction===null?'No comparable measurements.':'Below-mean Quality: '+sqrPercent(r.belowMeanFraction)+' ('+r.belowMeanCount+' of '+r.belowMeanAvailable+' assessed indicators have worse-than-mean quality). Lower percentages are better.')+
         '\nEnabled underlying indicators: '+r.belowMeanTotal+'. The manual KPI weights and corner/guiding settings define this comparison; selecting R3 or R4 does not change it. Score and Below-mean Quality itself are excluded. Arithmetic means use all supported subframes in this group, including rejects; the master is excluded.\n'+
         comparisons.map(c=>c.label+': '+(c.available?sqrFmt(c.value)+' vs mean '+sqrFmt(c.mean)+' — '+(c.worse?'worse':'at or better than mean'):'unavailable')+' ('+(c.lower?'below':'above')+' mean is worse)').join('\n')+
         (r.belowMeanComplete?'':'\nIncomplete comparison; unavailable KPIs are not counted as good.');
   }
}
function sqrMeanQualityLabel(row){return Number.isFinite(row.belowMeanFraction)?sqrPercent(row.belowMeanFraction)+(row.belowMeanComplete?'':'*'):'—';}
/** Convert the existing capped penalties to a quality score. Using a fixed cap
 * (not a group min/max) preserves relative manual weights and ranking ties. */
function sqrWeightedScore(parts){
   let weight=parts.reduce((sum,p)=>sum+p.w,0);
   return weight>0?Math.max(0,Math.min(1,1-parts.reduce((sum,p)=>sum+p.z*p.w,0)/(10*weight))):null;
}
// Compare other components with PSF signal weight using paired subframes only.
// Three pairs are the minimum: two points always give a spurious perfect r.
function sqrScoreCorrelation(group,component,o,guideAvailable){
   // The reference is not a candidate: its self-correlation is not evidence
   // for selection, even when no other KPI passes the threshold.
   if(component.weight==='signalWeight')return {...component,r:null,count:0,included:false,reason:'correlation reference only; self-correlation excluded'};
   let kpi=SQR_KPIS.find(k=>sqrKPIKey(k)===component.kpi),pairs=[];
   for(let r of group.rows.filter(r=>!r.isMaster)){
      let x=sqrKPIValue(r,SQR_KPIS[1]),y=sqrKPIValue(r,kpi);
      if(component.weight==='cornerWeight'&&(!r.metrics[1]?.valid||![2,3,4,5].every(i=>sqrEccentricityValid(r.metrics[i]))))y=null;
      if(component.weight==='guideWeight'&&!r.guiding?.scorable)y=null;
      if(Number.isFinite(x)&&Number.isFinite(y))pairs.push({x,y});
   }
   let result=sqrPearson(pairs),included=false,reason='';
   if((component.weight==='cornerWeight'||component.corner)&&!o.measureCorners)reason='corner scoring off';
   else if(component.weight==='guideWeight'&&o.guidingMode==='ignore')reason='guiding ignored';
   else if(component.weight==='guideWeight'&&!guideAvailable)reason='no guiding logs';
   else if(result.count<3)reason='fewer than 3 paired subframes';
   else if(!Number.isFinite(result.r))reason='constant or unavailable measurements';
   else if(Math.abs(result.r)<.7-1e-12)reason='|r| < 0.7';
   else {included=true;reason='|r| ≥ 0.7';}
   return {...component,...result,included,reason};
}
function sqrScoreCorrelationReport(selection){
   if(!selection)return 'Enable correlation scoring after measuring the group.';
   return (selection.available===false?'No strongly correlated KPIs. R3 unavailable; selecting R3 keeps the manual score. R4 omits R3.\n':'')+
      'Equal weights; |r| ≥ 0.7; at least 3 paired subframes. The master is excluded from correlation. PSF signal weight is the correlation reference only and is excluded from R3.\n'+
      selection.components.map(c=>c.weight==='signalWeight'?c.label+': reference only; self-correlation excluded':c.label+': '+(c.included?'included':'excluded')+'; r = '+sqrFmt(c.r)+', n = '+c.count+' ('+c.reason+')').join('\n');
}
// Build the same components for manual and correlation scoring. Missing values
// never become zero-quality measurements; the UI retains explicit review flags.
function sqrScoreParts(r,data,o,withCorners){
   let parts=data.parts.map(p=>({...p,w:o[p.key]}));
   let sky=withCorners?data.skyCorner:data.skyField;
   if(sky)parts.push({...sky,w:o.backgroundWeight});
   if(data.corner&&withCorners)parts.push({key:'cornerWeight',issue:data.corner.issue,name:data.corner.name,z:data.corner.value,w:o.cornerWeight});
   if(o.correlationOnly&&withCorners)for(let part of data.regionalParts||[])parts.push({...part,w:o[part.key]});
   let fraction=withCorners?r.belowMeanCornerFraction:r.belowMeanFieldFraction;
   if(Number.isFinite(fraction))parts.push({key:'belowMeanWeight',issue:'Below-mean Quality',name:'Below-mean Quality',z:fraction,w:o.belowMeanWeight,percentage:true});
   return parts;
}
function sqrApplyScore(r,data,o,guideEnabled){
   if(r.isMaster){sqrExcludeMasterScore(r);return;}
   let cornerRequired=o.measureCorners&&(!o.correlationOnly||o.cornerWeight>0),missingFieldShape=o.eccentricityWeight>0&&!sqrEccentricityValid(r.metrics[0]);
   r.guidingIgnored=sqrIgnoreGuiding(r,o);
   // Record the same checks that set the REVIEW flag so its tooltip explains
   // the active scoring mode, including equal-weight correlation selection.
   let reasons=[];
   if(!r.metrics[0]?.valid)reasons.push('Field PSF measurements are unavailable or insufficient.');
   if(missingFieldShape)reasons.push('Field eccentricity is unavailable.');
   if(cornerRequired){
      if(!r.metrics[1]?.valid)reasons.push('Center PSF measurements are unavailable or insufficient.');
      let missing=[2,3,4,5].filter(i=>!r.metrics[i]?.valid);
      if(missing.length)reasons.push('Corner PSF measurements are unavailable or insufficient: '+missing.map(i=>SQR_REGIONS[i]).join(', ')+'.');
      let shape=[2,3,4,5].filter(i=>r.metrics[i]?.valid&&!sqrEccentricityValid(r.metrics[i]));
      if(shape.length)reasons.push('Corner eccentricity is unavailable: '+shape.map(i=>SQR_REGIONS[i]).join(', ')+'.');
   }
   // A selected corner KPI requires only its own measurement. Missing unrelated
   // corners or eccentricities do not invalidate an independently usable FWHM.
   if(o.correlationOnly&&o.measureCorners){let missing=SQR_CORNER_COMPONENTS.filter(c=>o[c.weight]>0&&sqrKPIValue(r,c)===null);
      if(missing.length)reasons.push('Selected corner KPIs are unavailable: '+missing.map(c=>c.label).join(', ')+'.');}
   if(o.backgroundWeight>0&&sqrSkyScoreValue(r,o,o.measureCorners)===null){let sky=sqrSkyScoreChoice(o);
      reasons.push(sky.key==='skyBackground'?(o.measureCorners?
         'Sky brightness is unavailable; missing preview means: '+[1,2,3,4,5].filter(i=>!Number.isFinite(r.backgroundMeans?.previews?.[i])).map(i=>SQR_REGIONS[i]).join(', ')+'.':
         'Sky brightness is unavailable; the whole-image mean is missing.'):
         sky.name+' is unavailable: '+(sky.key==='skyQuality'?r.skyQualityInfo?.error:r.transparencyInfo?.error||'measure matching stars.'));
   }
   if(guideEnabled&&!r.isMaster&&!r.guidingIgnored){
      if(!r.guiding?.scorable)reasons.push('Guiding: '+(r.guiding?.reason||'usable guiding measurements are missing')+'.');
      if(r.guiding?.dropped>0)reasons.push('Guiding contains '+r.guiding.dropped+' rejected guide samples during this exposure.');
   }
   if(o.belowMeanWeight>0&&!r.belowMeanComplete)reasons.push('Below-mean Quality is incomplete: '+r.belowMeanAvailable+' of '+r.belowMeanTotal+' enabled indicators could be assessed.');
   r.dataReviewReasons=reasons;r.needsDataReview=reasons.length>0;
   let parts=sqrScoreParts(r,data,o,o.measureCorners),denominator=parts.reduce((sum,p)=>sum+p.w,0);
   r.score=sqrWeightedScore(parts);
   let impacts=parts.filter(p=>p.z>0&&p.w>0).sort((a,b)=>b.z*b.w-a.z*a.w);
   r.scoreContributions=impacts.map(p=>({...p,contribution:p.z*p.w/(10*denominator)}));
   r.mainIssue=impacts.length?impacts[0].issue:r.needsDataReview?'Missing data':guideEnabled&&r.guiding?.scorable?r.guiding.category:'None';
   let penaltyText=p=>p.percentage?sqrPercent(p.z):p.z.toFixed(2)+(p.guiding?' guiding penalty':' robust deviations');
   r.mainIssueDetail='Score: '+sqrFmt(r.score)+' (higher is better, 0–1). '+(impacts.length?impacts[0].name+': '+penaltyText(impacts[0])+' × weight '+impacts[0].w+'; subtracts '+sqrFmt(r.scoreContributions[0].contribution)+' from Score.':'No enabled quality penalty.');
   if(r.guiding)r.mainIssueDetail+='\n'+sqrGuideReport(r);
   if(r.needsDataReview)r.mainIssueDetail+=' Some enabled measurements are unavailable; inspect manually.';
   if(missingFieldShape)r.mainIssueDetail+=' Field eccentricity is unavailable.';
   r.reasons=impacts.map(p=>p.name+' ('+penaltyText(p)+')');
   if(r.guiding&&!r.guidingIgnored&&!impacts.some(p=>p.guiding))r.reasons.push(r.guiding.scorable?r.guiding.category:r.guiding.reason);
   if(!r.reasons.length)r.reasons.push('No enabled quality penalty');
   r.insufficientCorners=cornerRequired?4-data.cornerCount:0;
   if(r.needsDataReview)r.reasons.unshift('Insufficient measurements: inspect manually');
   if(cornerRequired&&data.missingShape)r.reasons.unshift('Corner eccentricity unavailable: inspect manually');
   if(missingFieldShape)r.reasons.unshift('Field eccentricity unavailable: inspect manually');
}
/** Explain a missing regional result from the recorded measurements or error.
 * The regional validity rule uses detected stars and FWHM, not the field-only
 * PSF signal/count threshold. Never infer an optical cause from a failed fit. */
function sqrRegionMeasurementReason(row,region,minStars){
   let m=row.metrics[region];
   if(!m)return 'Not measured: no result is available.';
   if(m.error&&m.error!=='Insufficient valid PSF measurements'){
      if(m.error==='No measurement returned')return 'SubframeSelector returned no measurement for this preview.';
      if(m.error==='Measurement failed')return 'SubframeSelector failed to measure this preview; no detailed cause was returned.';
      return 'Measurement error: '+m.error;
   }
   let reasons=[];
   if(!Number.isFinite(m.stars))reasons.push('the detected-star count was not returned');
   else if(m.stars<minStars)reasons.push(sqrFmt(m.stars,0)+' detected stars; Minimum stars requires '+minStars);
   if(!Number.isFinite(m.fwhm)||m.fwhm<=0)reasons.push('no valid FWHM was returned'+(Number.isFinite(m.psfCount)?' ('+sqrFmt(m.psfCount,0)+' accepted PSF fits)':''));
   if(region>=2&&!reasons.length&&!sqrEccentricityValid(m)){
      if(!Number.isFinite(m.eccentricity))reasons.push('no eccentricity value was returned');
      else if(m.eccentricity<0||m.eccentricity>=1)reasons.push('eccentricity '+sqrFmt(m.eccentricity)+' is outside the usable range 0 ≤ e < 1');
   }
   if(!reasons.length&&!m.valid)reasons.push('no usable PSF measurement is available; no detailed cause was recorded');
   return reasons.length?reasons.join('; ')+'.':'';
}
/** Explain selection from its actual group rank and measurement checks, never
 * from the current table sort or visible row number. No image reads are needed. */
function sqrReviewToolTip(row,group,options){
   if(row.isMaster)return SQR_MASTER_SCORE_INFO;
   if(!row.candidate)return '';
   let sections=['Marked REVIEW for the following reasons:'];
   if(Number.isFinite(row.rank)&&row.rank<=group.shortlistCount){
      let text='Review worst ('+Number(options.percent.toFixed(1))+'%): rank '+row.rank+' of '+group.shortlistPopulation+
         ' subframes with valid field measurements; '+group.shortlistCount+' shortlisted (rounded up).';
      if(Number.isFinite(row.score))text+='\nScore: '+sqrFmt(row.score)+' (higher is better).';
      let penalties=(row.scoreContributions||[]).slice(0,3);
      if(penalties.length)text+='\nLargest score penalties: '+penalties.map(p=>p.name+' (−'+sqrFmt(p.contribution)+')').join('; ')+'.';
      else text+='\nNo measured score penalty. The percentage shortlist still applies.';
      text+='\nEqual scores are ordered by filename.';sections.push(text);
   }
   if(row.needsDataReview)sections.push('Measurements require inspection:\n'+(row.dataReviewReasons?.length?row.dataReviewReasons:['Required measurements are unavailable or insufficient.']).map(reason=>'• '+reason).join('\n'));
   if(options.measureCorners){
      let missing=[1,2,3,4,5].map(i=>({region:i,reason:sqrRegionMeasurementReason(row,i,options.minStars)})).filter(item=>item.reason);
      // Also explain missing regional data on a quota-selected row, even when
      // correlation scoring has excluded that particular regional indicator.
      if(missing.length)sections.push('Unavailable preview measurements:\n'+missing.map(item=>'• '+SQR_REGIONS[item.region]+': '+item.reason).join('\n'));
   }
   sections.push('Review this image before deciding whether to reject it.');return sections.join('\n\n');
}
/** Compact, aligned selected-image information. Keep long explanations and
 * full paths in tooltips so selection changes never stretch the dialog. All
 * filenames and measurement messages are escaped before rich-text rendering. */
function sqrReviewDetails(row){
   let headers=['Field','Center','Top left','Top right','Bottom left','Bottom right'];
   let metrics='<table width="100%" cellspacing="2" cellpadding="0"><tr><td></td>'+headers.map(h=>'<th>'+h+'</th>').join('')+'</tr>';
   for(let [label,key,digits] of [['FWHM (px)','fwhm',1],['Eccentricity','eccentricity',2],['Stars','stars',0]])
      metrics+='<tr><td><b>'+label+'</b></td>'+headers.map((h,i)=>{let m=row?.metrics[i],value=m?.[key];
         let valid=Number.isFinite(value)&&(key==='stars'||key==='eccentricity'&&sqrEccentricityValid(m)||key==='fwhm'&&m?.valid);
         return '<td align="center">'+(valid?sqrFmt(value,digits):'—')+'</td>';}).join('')+'</tr>';
   metrics+='</table>';
   if(!row)return {summary:'No image selected.',summaryTip:'Select an image in the table to see its assessment and regional measurements.',metrics,metricsTip:'No image selected.',source:'<b>File:</b> —',sourceTip:''};
   let state=row.isMaster?'Master · comparison only':row.moved?'Original moved':row.reject?'Reject original':'Keep original';
   if(!row.isMaster&&row.candidate)state+=' · REVIEW';
   let guide=row.isMaster?'':row.guiding?(row.guiding.scorable?row.guiding.category:'Unavailable')+(row.guidingIgnored?' (excluded)':''):'';
   let summary=row.isMaster?'<b>'+sqrHTML(state)+'</b><br/>Excluded from Score and R1–R4 ranks.':
      '<b>'+sqrHTML(state)+'</b> · Score: '+sqrFmt(row.score)+'<br/><b>Main issue:</b> '+sqrHTML(row.mainIssue||'Not measured')+(guide?' · <b>Guiding:</b> '+sqrHTML(guide):'');
   let summaryTip=row.isMaster?SQR_MASTER_SCORE_INFO:[row.mainIssueDetail,...(row.reasons||[]),...(row.dataReviewReasons||[])].filter(Boolean).join('\n');
   if(row.guiding)summaryTip+='\n'+sqrGuideReport(row);
   let metricsTip='FWHM is in pixels. Eccentricity: 0 = round, toward 1 = elongated. Stars is the detected count. — = unavailable.\n'+headers.map((h,i)=>{
      let m=row.metrics[i];return h+': '+(m?.valid?'FWHM '+sqrFmt(m.fwhm,1)+' px; eccentricity '+sqrFmt(m.eccentricity,2)+'; '+sqrFmt(m.stars,0)+' stars.':m?(m.error||'Insufficient valid star measurements.'):'Not measured.');}).join('\n');
   let label=row.isMaster?'Master':row.moved?'Moved to':'Original',path=row.isMaster?row.registered.path:row.moved?row.movedTo:row.original?.path;
   let name=path?sqrFileName(path):row.match||'No associated original';if(name.length>90)name=name.slice(0,54)+'…'+name.slice(-30);
   return {summary,summaryTip,metrics,metricsTip,source:'<b>'+label+':</b> '+sqrHTML(name),
      sourceTip:label+': '+(path||row.match||'No associated original')+'\nRegistered: '+row.registered.path};
}
/** Recompute derived data from cached measurements. Manual weights always produce
 * R1/R2 first. R3 requires a qualifying KPI; R4 combines available ranks.
 * The chosen mode controls Score without changing weights or rereading pixels.
 * Below-mean Quality is computed once from the manual KPI selection. R3 assesses
 * and weights that same composite, keeping its values and plotted correlations
 * independent of the active scoring mode. */
function sqrRank(session){
   let o=session.options;
   o.skyScoreKPI=sqrSkyScoreChoice(o).key;
   for(let c of SQR_SCORE_COMPONENTS)o[c.weight]??=sqrDefaults()[c.weight];
   let guideAvailable=!!session.guiding?.enabled,guideEnabled=guideAvailable&&o.guideWeight>0&&o.guidingMode!=='ignore';
   if(!o.correlationOnly&&!o.rankOfRanks&&o.signalWeight+o.starsWeight+o.fwhmWeight+o.eccentricityWeight+o.backgroundWeight+(o.measureCorners?o.cornerWeight:0)+(guideEnabled?o.guideWeight:0)<=0)throw new Error('At least one underlying quality indicator must have a positive weight.');
   for(let g of session.groups){
      let all=sqrGroupRows(g);g.correlationScoring=null;
      for(let r of all)r.skyBackground=sqrSkyBackground(r,o.measureCorners);
      sqrUpdateSkyQuality(g,o.measureCorners);
      let sky=sqrSkyScoreChoice(o),skyField=sqrSummary(g.rows.map(r=>sqrSkyScoreValue(r,o,false)).filter(Number.isFinite)),skyCorner=sqrSummary(g.rows.map(r=>sqrSkyScoreValue(r,o,true)).filter(Number.isFinite));
      for(let r of all)for(let i=0;i<6;++i)if(r.metrics[i]){let m=r.metrics[i];m.valid=sqrMetricValid(m,o.minStars,i===0);if(m.valid)delete m.error;else if('fwhm' in m)m.error='Insufficient valid PSF measurements';}
      let valid=g.rows.filter(r=>r.metrics[0]?.valid);
      let signal=sqrSummary(valid.map(r=>r.metrics[0].signal)),stars=sqrSummary(valid.map(r=>r.metrics[0].stars)),fwhm=sqrSummary(valid.map(r=>r.metrics[0].fwhm));
      let eccentricity=sqrSummary(valid.filter(r=>sqrEccentricityValid(r.metrics[0])).map(r=>r.metrics[0].eccentricity));
      let corners=[2,3,4,5].map(i=>({width:sqrSummary(valid.filter(r=>r.metrics[i]?.valid).map(r=>r.metrics[i].fwhm)),
         ratio:sqrSummary(valid.filter(r=>r.metrics[i]?.valid&&r.metrics[1]?.valid).map(r=>r.metrics[i].fwhm/r.metrics[1].fwhm)),
         eccentricity:sqrSummary(valid.filter(r=>sqrEccentricityValid(r.metrics[i])).map(r=>r.metrics[i].eccentricity))}));
      let scoring=new Map;
      for(let r of all){r.candidate=false;r.score=null;r.scoreWithoutCorners=null;r.scoreWithCorners=null;r.scoreCorrelated=null;r.rankCorrelated=null;r.rank=null;r.reasons=[];r.cornerSeverity=null;r.measuredCornerSeverity=null;r.worstCorner='';
         r.mainIssue='Missing data';r.mainIssueDetail='Field measurement unavailable.';r.scoreContributions=[];r.dataReviewReasons=[];r.needsDataReview=true;r.insufficientCorners=0;
         r.guidingIgnored=sqrIgnoreGuiding(r,o);
         let m=r.metrics[0];if(!m?.valid){r.candidate=!r.isMaster;r.reasons.push('Field measurement unavailable');
            r.dataReviewReasons=['Field PSF measurements are unavailable or insufficient'+(m?.error?': '+m.error:'.')];
            if(m&&(Number.isFinite(m.stars)||Number.isFinite(m.psfCount)))r.dataReviewReasons.push('Detected stars: '+sqrFmt(m.stars,0)+'; PSF fits: '+sqrFmt(m.psfCount,0)+'; required minimum for each: '+o.minStars+'.');
            if(r.guiding)r.reasons.push(r.guiding.scorable?r.guiding.category:r.guiding.reason);continue;}
         let cs=[];for(let i=2;i<6;++i)if(r.metrics[i]?.valid){let c=corners[i-2],region=SQR_REGIONS[i],tests=[
            {issue:'Large corner stars',name:'Large '+region.toLowerCase()+' FWHM',value:sqrBad(r.metrics[i].fwhm,c.width,false)},
            {issue:'Large corner stars',name:'High '+region.toLowerCase()+' / center FWHM ratio',value:r.metrics[1]?.valid?sqrBad(r.metrics[i].fwhm/r.metrics[1].fwhm,c.ratio,false):0},
            {issue:'Elongated stars',name:'High '+region.toLowerCase()+' eccentricity',value:sqrEccentricityValid(r.metrics[i])?sqrBad(r.metrics[i].eccentricity,c.eccentricity,false):0}];
            tests.sort((a,b)=>b.value-a.value);cs.push({...tests[0],region});}
         cs.sort((a,b)=>b.value-a.value);let corner=cs.length?cs[0].value:null;
         r.measuredCornerSeverity=corner;r.cornerSeverity=o.measureCorners?corner:null;r.worstCorner=o.measureCorners&&cs.length?cs[0].region:'';
         // Retain the master's corner diagnostic, but never build scoring parts for it.
         if(r.isMaster)continue;
         let parts=[{key:'signalWeight',issue:'Weak signal',name:'Low PSF signal weight',z:sqrBad(m.signal,signal,true)},
            {key:'starsWeight',issue:'Few stars',name:'Low star count',z:sqrBad(m.stars,stars,true)},
            {key:'fwhmWeight',issue:'Large stars',name:'Large field FWHM',z:sqrBad(m.fwhm,fwhm,false)}];
         if(sqrEccentricityValid(m))parts.push({key:'eccentricityWeight',issue:'Elongated stars',name:'High field eccentricity',z:sqrBad(m.eccentricity,eccentricity,false)});
         if(guideAvailable&&!r.isMaster&&r.guiding?.scorable)parts.push({key:'guideWeight',issue:r.guiding.category,name:r.guiding.category,z:r.guidePenalty,guiding:true});
         let skyPart=withCorners=>{let value=sqrSkyScoreValue(r,o,withCorners);return value===null?null:{key:'backgroundWeight',kpi:sky.key,issue:sky.issue,name:sky.issue,z:sqrBad(value,withCorners?skyCorner:skyField,sky.higher)};};
         scoring.set(r,{parts,skyField:skyPart(false),skyCorner:skyPart(true),corner:cs[0],cornerCount:cs.length,missingShape:[2,3,4,5].some(i=>!sqrEccentricityValid(r.metrics[i]))});
      }
      let manual={...o,correlationOnly:false,guideWeight:guideEnabled?o.guideWeight:0};
      sqrMeanComparisons(g,manual,guideEnabled);
      for(let r of all){let data=scoring.get(r);if(!data)continue;
         let missingFieldShape=o.eccentricityWeight>0&&!sqrEccentricityValid(r.metrics[0]);
         r.scoreWithoutCorners=missingFieldShape||o.backgroundWeight>0&&!data.skyField?null:sqrWeightedScore(sqrScoreParts(r,data,manual,false));
         if(data.cornerCount===4&&!data.missingShape&&!missingFieldShape&&r.metrics[1]?.valid&&(!(o.backgroundWeight>0)||data.skyCorner))r.scoreWithCorners=sqrWeightedScore(sqrScoreParts(r,data,manual,true));
         sqrApplyScore(r,data,manual,guideEnabled);
      }
      sqrAssignRanks(all,'scoreWithoutCorners','rankWithoutCorners');sqrAssignRanks(all,'scoreWithCorners','rankWithCorners');
      let manualStates=new Map(all.map(r=>[r,sqrScoreState(r)]));
      {
         let components=[...sqrScoreComponents(o).slice(0,-1),...SQR_CORNER_COMPONENTS].map(c=>sqrScoreCorrelation(g,c,o,guideAvailable));
         let auto={...o,correlationOnly:true,rankOfRanks:false};for(let c of [...SQR_SCORE_COMPONENTS,...SQR_CORNER_COMPONENTS])auto[c.weight]=0;
         for(let c of components)auto[c.weight]=c.included?1:0;
         let autoGuide=auto.guideWeight>0;
         // Select the already defined composite, just like every other KPI.
         // Recomputing it from R3's selected components would change its meaning.
         let breadth=sqrScoreCorrelation(g,SQR_SCORE_COMPONENTS[SQR_SCORE_COMPONENTS.length-1],o,guideAvailable);
         components.push(breadth);auto.belowMeanWeight=breadth.included?1:0;
         g.correlationScoring={components,available:components.some(c=>c.included),weights:Object.fromEntries([...SQR_SCORE_COMPONENTS,...SQR_CORNER_COMPONENTS].map(c=>[c.weight,auto[c.weight]]))};
         let selectedCorners=SQR_CORNER_COMPONENTS.filter(c=>auto[c.weight]>0);
         // With no eligible KPIs, preserve manual evaluation and leave the R3
         // score/rank null. R4 must omit R3 rather than count manual ranks twice.
         if(g.correlationScoring.available)for(let r of all){let data=scoring.get(r);if(data){
            data.regionalParts=[];
            for(let c of selectedCorners){let value=sqrKPIValue(r,c);if(value===null)continue;
               // Reuse the already computed per-corner robust baselines.
               let baseline=corners[c.region-2][c.metric==='fwhm'?'width':'eccentricity'];
               data.regionalParts.push({key:c.weight,kpi:c.kpi,issue:c.metric==='fwhm'?'Large corner stars':'Elongated stars',name:c.label,z:sqrBad(value,baseline,false)});
            }
            sqrApplyScore(r,data,auto,autoGuide);r.scoreCorrelated=r.score;
         }}
         sqrAssignRanks(all,'scoreCorrelated','rankCorrelated');
      }
      sqrRankOfRanks(all,o.measureCorners);
      // Restore every manual tooltip and missing-data flag when R3 is only a
      // comparison column. R4 combines the ranks and retains both data checks.
      for(let r of all){let automatic=sqrScoreState(r);
         // Also discard legacy scores/flags when a cached master has missing measurements.
         if(r.isMaster){sqrExcludeMasterScore(r);continue;}
         if(!o.correlationOnly||o.rankOfRanks||!g.correlationScoring.available)Object.assign(r,manualStates.get(r));
         if(o.rankOfRanks)sqrApplyRankOfRanks(r,automatic);
      }
      // Worst-first ranks and REVIEW quotas retain their meaning after inversion.
      let sorted=valid.slice().sort((a,b)=>(a.score??Infinity)-(b.score??Infinity)||a.registered.path.localeCompare(b.registered.path));
      let count=Math.ceil(sorted.length*o.percent/100);for(let i=0;i<sorted.length;++i){sorted[i].rank=i+1;sorted[i].candidate=i<count||sorted[i].needsDataReview;}
      g.shortlistCount=count;g.shortlistPopulation=sorted.length;g.rows.sort((a,b)=>Number(b.candidate)-Number(a.candidate)||(a.score??-1)-(b.score??-1)||a.registered.path.localeCompare(b.registered.path));
   }
}
function sqrWriteJSON(path,value){File.writeTextFile(path,JSON.stringify(value,null,2));}
// Choose the highest-scoring kept subframe. Signal strength and filename provide
// deterministic tie-breaks; the master can never become a "best subframe".
function sqrBestRow(group){return group.rows.filter(r=>!r.isMaster&&r.metrics[0]?.valid&&Number.isFinite(r.score)&&!r.reject&&!r.moved)
   .sort((a,b)=>b.score-a.score||b.metrics[0].signal-a.metrics[0].signal||a.registered.path.localeCompare(b.registered.path))[0]||null;}
function sqrReference(group,choice){
   if(choice==='best'){let best=sqrBestRow(group);return {path:best?.registered.path||'',label:'BEST SUBFRAME'};}
   return {path:group.master||'',label:'MASTER'};
}
/** Preflight every manually rejected original before any move begins.
 * Check source containment, light-frame identity, unchanged fingerprints and
 * destination collisions. Preserve relative paths and refuse overwrites.
 * Returned entries retain row references for updating the in-memory review. */
function sqrMovePlan(session){
   let o=session.options;if(!o.destination.trim())throw new Error('Choose a rejected-originals folder.');
   let root=sqrPath(o.originals),dest=sqrPath(o.destination);
   if(sqrKey(dest)===sqrKey(root))throw new Error('The destination must differ from the originals folder.');
   if(sqrUnder(dest,sqrPath(o.wbpp)))throw new Error('Choose a destination outside the WBPP output folder.');
   let plan=[],sources={},targets={};
   for(let g of session.groups)for(let r of g.rows)if(r.reject&&!r.moved){
      if(r.isMaster)throw new Error('Integrated masters cannot be rejected or moved.');
      if(!r.original||!['Verified','Manually verified'].includes(r.match))throw new Error('Resolve the original-file association for '+sqrFileName(r.registered.path));
      let source=sqrPath(r.original.path);if(!sqrUnder(source,root)||sqrUnder(source,sqrPath(o.wbpp)))throw new Error('Original lies outside the selected original-light root.');
      if(sqrFingerprint(source)!==r.original.fingerprint)throw new Error('Original changed since scanning: '+source);
      let meta=sqrMetadata(source);if(!sqrIsLight(meta)||!sqrCompatible(r.registered,meta))throw new Error('Original metadata no longer matches: '+source);
      let relative=source.slice(root.length+1),target=dest+'/'+relative;
      if(!sqrUnder(target,dest)||sources[sqrKey(source)]||targets[sqrKey(target)]||File.exists(target))throw new Error('Duplicate source or occupied destination: '+target);
      sources[sqrKey(source)]=true;targets[sqrKey(target)]=true;plan.push({source:source,target:target,fingerprint:r.original.fingerprint,registered:r.registered.path,status:'planned',row:r});
   }
   if(!plan.length)throw new Error('No manually rejected originals are selected.');return plan;
}
/** Execute a validated plan with a journal written before the first file move.
 * Per-file rechecks catch changes since preflight. Journal states distinguish
 * planned, in-progress and completed files; failures do not imply a rollback.
 * Only verified original paths are moved; processed frames remain available. */
function sqrMove(session,notify){
   let plan=sqrMovePlan(session),dest=sqrPath(session.options.destination);if(!File.directoryExists(dest))File.createDirectory(dest,true);
   let journalPath=dest+'/SQR-moves-'+sqrStamp()+'.json';
   if(File.exists(journalPath))throw new Error('Move journal already exists: '+journalPath);
   let journal={schema:1,created:new Date().toISOString(),originals:sqrPath(session.options.originals),destination:dest,wbpp:sqrPath(session.options.wbpp),
      moves:plan.map(p=>({source:p.source,target:p.target,fingerprint:p.fingerprint,registered:p.registered,status:'planned'}))};
   sqrWriteJSON(journalPath,journal);
   session.lastMoveJournal=journalPath;
   try{for(let i=0;i<plan.length;++i){
      let p=plan[i];sqrTick(notify,'Moving original '+(i+1)+' / '+plan.length);
      if(sqrFingerprint(p.source)!==p.fingerprint||File.exists(p.target))throw new Error('Files changed after move-plan validation.');
      let dir=sqrDir(p.target);if(!File.directoryExists(dir))File.createDirectory(dir,true);
      journal.moves[i].status='moving';sqrWriteJSON(journalPath,journal);
      File.moveFile(p.target,p.source);
      // Update memory before writing the completed entry, so reporting errors do not re-enable a moved source.
      p.row.moved=true;p.row.movedTo=p.target;p.row.moveJournal=journalPath;journal.moves[i].status='moved';
      journal.moves[i].destinationFingerprint=sqrFingerprint(p.target);sqrWriteJSON(journalPath,journal);
   }}catch(e){journal.error=String(e);sqrWriteJSON(journalPath,journal);throw new Error(String(e)+'\nMove journal: '+journalPath);}
   return {count:plan.length,journal:journalPath};
}

// Restore only paths recorded by a move journal. Resolve each path before
// containment checks, and refuse linked files/directories along either route.
function sqrRestorePath(value){
   if(typeof value!=='string'||!/^([a-z]:[\\/]|[\\/]{2}|\/)/i.test(value))throw new Error('Move journal contains a non-absolute path.');
   return sqrPath(value);
}
function sqrNoLinkedPath(path){
   for(let p=path;p;){let info=new FileInfo(p);if(info.isSymbolicLink)throw new Error('Linked restore paths are not supported: '+p);
      let parent=sqrDir(p).replace(/\/$/,'');if(!parent||sqrKey(parent)===sqrKey(p)||/^[a-z]:$/i.test(parent))break;p=parent;}
}
function sqrRestoreAvailability(entry){
   try{
      sqrNoLinkedPath(entry.source);sqrNoLinkedPath(entry.target);
      if(!['moved','moving'].includes(entry.status))return 'No completed move recorded';
      if(File.exists(entry.source)||File.directoryExists(entry.source)){
         if(!File.exists(entry.target)&&!File.directoryExists(entry.target)&&sqrFingerprint(entry.source)===entry.fingerprint)return 'Already restored';
         return 'Original path is occupied; no overwrite';
      }
      if(sqrFingerprint(entry.target)!==(entry.destinationFingerprint||entry.fingerprint))return 'Moved file has changed';
      return '';
   }catch(e){return String(e).replace(/^Error: /,'');}
}
/** A journal is data, not an instruction to move arbitrary files. Require the
 * exact preserved relative path and reject duplicate/overlapping destinations.
 * Older journals without wbpp remain usable; image identity is checked below. */
function sqrReadMoveJournal(path){
   path=sqrPath(path);let journal=JSON.parse(File.readTextFile(path));
   if(journal.schema!==1||!Array.isArray(journal.moves)||!journal.moves.length)throw new Error('Choose an SQR-moves journal containing original-light moves.');
   let root=sqrRestorePath(journal.originals),dest=sqrRestorePath(journal.destination),wbpp=journal.wbpp?sqrRestorePath(journal.wbpp):'',seen=new Set;
   if(sqrKey(root)===sqrKey(dest)||sqrKey(sqrPath(sqrDir(path)))!==sqrKey(dest))throw new Error('The move journal must be in its recorded rejection folder.');
   let entries=journal.moves.map((move,index)=>{
      let source=sqrRestorePath(move.source),target=sqrRestorePath(move.target);
      if(!sqrUnder(source,root)||sqrKey(source)===sqrKey(root)||
         sqrKey(target)!==sqrKey(dest+'/'+source.slice(root.length+1))||!sqrImageFile(source)||
         (wbpp&&(sqrUnder(source,wbpp)||sqrUnder(target,wbpp)))||
         typeof move.fingerprint!=='string'||!/^\d+\|.+/.test(move.fingerprint))throw new Error('Invalid original-light path or fingerprint in move journal: '+source);
      for(let p of [source,target]){if(seen.has(sqrKey(p)))throw new Error('Duplicate path in move journal: '+p);seen.add(sqrKey(p));}
      let entry={...move,source,target,index};entry.problem=sqrRestoreAvailability(entry);return entry;
   });
   return {path,root,dest,entries};
}
/** Validate every selected file before restoring any. A changed file, occupied
 * original path or non-light image blocks the selected plan without data loss. */
function sqrRestorePlan(record,indices){
   if(!indices.length)throw new Error('Select at least one moved original to restore.');
   let seen=new Set;
   return indices.map(index=>{
      if(!Number.isInteger(index)||!record.entries[index]||seen.has(index))throw new Error('Invalid restore selection.');seen.add(index);
      let entry=record.entries[index],problem=sqrRestoreAvailability(entry);if(problem)throw new Error(problem+': '+entry.source);
      let metadata=sqrMetadata(entry.target);if(!sqrIsLight({...metadata,path:entry.source}))throw new Error('The moved file is not an original light: '+entry.target);
      return {...entry,metadata};
   });
}
function sqrRestoreIdentity(plan){return JSON.stringify(plan.map(p=>[p.source,p.target,p.fingerprint,p.destinationFingerprint||'',p.registered||'']));}
function sqrMarkRestored(session,entry){
   for(let group of session?.groups||[])for(let row of group.rows){
      if(row.isMaster)continue;
      let sameOriginal=row.original&&sqrKey(row.original.path)===sqrKey(entry.source),sameRegistered=sqrKey(row.registered.path)===sqrKey(entry.registered||'');
      if((sameOriginal||sameRegistered)&&sqrCompatible(row.registered,entry.metadata)){
         row.original={...entry.metadata,path:entry.source,fingerprint:sqrFingerprint(entry.source)};row.match='Verified';
         row.moved=false;row.reject=false;delete row.movedTo;delete row.moveJournal;
      }
   }
}
/** Retain the original move journal. Each undo has its own progress journal,
 * so partial restores can be retried from the original journal after restart.
 * Actual source/target presence and fingerprints determine eligibility. */
function sqrRestore(journalPath,indices,session,notify,expectedPlan){
   let record=sqrReadMoveJournal(journalPath),plan=sqrRestorePlan(record,indices);
   if(expectedPlan&&sqrRestoreIdentity(plan)!==sqrRestoreIdentity(expectedPlan))throw new Error('The move journal changed. Review the restore plan again.');
   let path=record.dest+'/SQR-undo-'+sqrStamp()+'.json';
   if(File.exists(path))throw new Error('Undo journal already exists: '+path);
   let journal={schema:1,operation:'undo',created:new Date().toISOString(),moveJournal:record.path,
      restores:plan.map(p=>({source:p.target,target:p.source,fingerprint:p.destinationFingerprint||p.fingerprint,status:'planned'}))};
   sqrWriteJSON(path,journal);
   try{for(let i=0;i<plan.length;++i){
      let entry=plan[i];sqrTick(notify,'Restoring original '+(i+1)+' / '+plan.length);
      let problem=sqrRestoreAvailability(entry);if(problem)throw new Error(problem+': '+entry.source);
      let dir=sqrDir(entry.source);if(!File.directoryExists(dir))File.createDirectory(dir,true);
      journal.restores[i].status='restoring';sqrWriteJSON(path,journal);
      File.moveFile(entry.source,entry.target);
      // Reflect a successful move before journal/reporting failures can occur.
      journal.restores[i].status='restored';sqrMarkRestored(session,entry);
      journal.restores[i].restoredFingerprint=sqrFingerprint(entry.source);sqrWriteJSON(path,journal);
   }}catch(e){journal.error=String(e);try{sqrWriteJSON(path,journal);}catch(writeError){journal.error+='\nUnable to update undo journal: '+String(writeError);}
      throw new Error(journal.error+'\nUndo journal: '+path+'\nReopen the original move journal to check remaining files.');}
   return {count:plan.length,journal:path};
}

// UI is below. Defining SQR_LIBRARY lets read-only test harnesses use the engine.
function sqrTool(parent,resource,tip,action){let b=new ToolButton(parent);b.icon=parent.scaledResource(resource);b.setScaledFixedSize(24,24);b.toolTip=tip;if(action)b.onClick=action;return b;}
function sqrButton(parent,text,fn){let b=new PushButton(parent);b.text=text;b.onClick=fn;return b;}
class SQRPlotInfoDialog extends Dialog {
   constructor(info){super();this.windowTitle=info.title;
      this.content=new TextBox(this);this.content.readOnly=true;this.content.font=this.font;this.content.setScaledMinSize(info.plot||info.model?780:720,info.plot||info.model?640:info.sky?620:480);this.content.text=info.html;this.content.home();
      this.closeButton=sqrButton(this,'Close',()=>this.ok());this.closeButton.defaultButton=true;this.closeButton.escapeButton=true;
      let buttons=new HorizontalSizer;buttons.addStretch();buttons.add(this.closeButton);
      this.sizer=new VerticalSizer;this.sizer.margin=10;this.sizer.spacing=10;this.sizer.add(this.content,100);this.sizer.add(buttons);this.adjustToContents();
   }
}
function sqrRejectIcon(parent,checked){
   let scale=parent.displayPixelRatio||1,size=Math.round(16*scale),bitmap=new Bitmap(size,size);bitmap.fill(0x00000000);
   let p=new Graphics(bitmap);try{p.pen=new Pen(0xff536475,scale);p.fillRect(2*scale,2*scale,14*scale,14*scale,new Brush(0xfff8fafc));p.drawRect(2*scale,2*scale,14*scale,14*scale);
      if(checked){p.pen=new Pen(0xffa12b2b,2*scale);p.drawLine(4*scale,8*scale,7*scale,11*scale);p.drawLine(7*scale,11*scale,12*scale,5*scale);}
   }finally{p.end();}return bitmap;
}
function sqrGroup(parent,title){let g=new GroupBox(parent);g.title=title;g.sizer=new VerticalSizer;g.sizer.margin=10;g.sizer.spacing=8;return g;}
function sqrNumber(parent,label,value,low,high,precision=0){let n=new NumericEdit(parent);n.label.text=label;n.setRange(low,high);n.setPrecision(precision);n.setValue(value);return n;}
/** Edit a draft only. Cancel leaves the main dialog, scores and plots intact.
 * Physical assumptions can be saved before a pixel scale becomes available. */
/** Use PixInsight's native date/time selector, but read its numeric fields as
 * civil wall time. Its Date object would otherwise normalize an acquisition
 * site's time using this computer's timezone/DST rules. Clamp day ranges here
 * so moving from January 31 to February stays in the month the user selected. */
class SQRSQMTimeDialog extends Dialog {
   constructor(value,seed=''){
      super();this.windowTitle='SQM reading time';this.setting=true;
      this.editor=new DateTimeEditor(this,2451545,0,70,true,55);this.editor.dateTime_Label.text='Local date and time:';
      this.editor.dateTimeToolTip='Local date and time at the observing site. The review’s inferred or custom UTC offset is applied after you choose Apply.';
      this.fields=['year','month','day','hour','minute','second'].map(k=>this.editor[k+'_SpinBox']);
      this.fields[0].setRange(100,9999);
      for(let field of this.fields)field.onValueUpdated=()=>this.updateDays();
      let normalize=s=>{let text=String(s||'').trim().replace('T',' ');if(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(text))text+=':00';return sqrLogTime(text,'utc')!==null?text:null;};
      let initial=normalize(value)||normalize(seed),now=new Date;
      let values=initial?initial.match(/\d+/g).map(Number):[now.getFullYear(),now.getMonth()+1,now.getDate(),now.getHours(),now.getMinutes(),now.getSeconds()];
      this.fields.forEach((field,i)=>field.value=values[i]);this.setting=false;this.updateDays();
      this.applyButton=sqrButton(this,'Apply',()=>this.ok());this.applyButton.defaultButton=true;
      this.cancelButton=sqrButton(this,'Cancel',()=>this.cancel());this.cancelButton.escapeButton=true;
      let buttons=new HorizontalSizer;buttons.spacing=8;buttons.addStretch();buttons.add(this.applyButton);buttons.add(this.cancelButton);
      this.sizer=new VerticalSizer;this.sizer.margin=12;this.sizer.spacing=12;this.sizer.add(this.editor);this.sizer.add(buttons);this.adjustToContents();
   }
   updateDays(){if(this.setting)return;this.setting=true;try{
      this.fields[2].maxValue=new Date(Date.UTC(this.fields[0].value,this.fields[1].value,0)).getUTCDate();
   }finally{this.setting=false;}}
   value(){let v=this.fields.map(f=>f.value);return String(v[0]).padStart(4,'0')+'-'+String(v[1]).padStart(2,'0')+'-'+String(v[2]).padStart(2,'0')+' '+v.slice(3).map(n=>String(n).padStart(2,'0')).join(':');}
}
class SQRFWHMDialog extends Dialog {
   constructor(options,scale,filter=''){
      super();this.windowTitle='FWHM grading';this.scale=scale;this.filter=filter;this.fields={};let o=sqrFWHMOptions(options);
      this.baseOptions=o;this.apertureValue=o.fwhmAperture;this.seeingValue=o.fwhmSeeing;this.wavelengths={...o.fwhmWavelengths};this.filterBand=sqrFilterWavelength(filter);
      this.intro=new Label(this);this.intro.wordWrapping=true;this.intro.text='Set the Good, Medium and Bad bands for the FWHM plots.';
      this.enabledCheck=new CheckBox(this);this.enabledCheck.text='Show FWHM quality bands';this.enabledCheck.checked=o.fwhmEnabled;
      this.modelInfo=sqrTool(this,':/icons/info.png','About this grading model',()=>this.showModelInformation());
      let enabledRow=new HorizontalSizer;enabledRow.spacing=8;enabledRow.add(this.enabledCheck);enabledRow.addStretch();enabledRow.add(this.modelInfo);

      // Read-only inputs from the main window stay separate from editable
      // reference conditions. All form rows share one label and editor width.
      let current=sqrGroup(this,'Telescope and image');
      this.setupSummary=new Label(current);this.setupSummary.useRichText=true;this.setupSummary.wordWrapping=true;
      let scaleOK=!scale?.reason&&Number.isFinite(scale?.x)&&Number.isFinite(scale?.y)&&scale.x>0&&scale.y>0&&Math.abs(scale.x-scale.y)/Math.max(scale.x,scale.y)<=.001;
      this.setupSummary.text='<table width="100%" cellpadding="3"><tr>'+[
         ['Aperture',this.apertureValue>0?sqrFmt(this.apertureValue,0)+' mm':'Not set'],
         ['Zenith seeing',this.seeingValue>0?sqrFmt(this.seeingValue,2)+' arcsec':'Not supplied'],
         ['Image scale',scaleOK?sqrFmt((scale.x+scale.y)/2,3)+' arcsec/pixel':'Unavailable']
      ].map(([name,value])=>'<td width="33%"><b>'+name+'</b><br/>'+sqrHTML(value)+'</td>').join('')+'</tr></table>';
      current.sizer.add(this.setupSummary);
      this.parameters=new Control(this);this.parameters.sizer=new VerticalSizer;this.parameters.sizer.spacing=10;
      let setup=sqrGroup(this.parameters,'Observing conditions'),limits=sqrGroup(this.parameters,this.seeingValue>0?'Limits relative to expected FWHM':'Seeing limits at zenith');
      this.parameters.sizer.add(setup);this.parameters.sizer.add(limits);
      const field=(parent,key,label,value,low,high,precision,unit,tip)=>{
         let n=sqrNumber(parent,label,value,low,high,precision);n.enableFixedPrecision(true);n.label.setScaledFixedWidth(180);n.label.textAlignment=TextAlignment.Left|TextAlignment.VertCenter;n.edit.setScaledFixedWidth(80);n.toolTip=tip;n.onValueUpdated=()=>this.refreshModel();
         let row=new HorizontalSizer;row.spacing=8;row.add(n);let units=new Label(parent);units.text=unit;units.textAlignment=TextAlignment.Left|TextAlignment.VertCenter;row.add(units);
         parent.sizer.add(row);this.fields[key]=n;return {n,row};
      };
      field(setup,'fwhmAltitude','Target altitude',o.fwhmAltitude,15,90,1,'degrees','One reference altitude for the session; 90 degrees is zenith.').row.addStretch();
      let wavelength=Object.prototype.hasOwnProperty.call(this.wavelengths,this.filterBand.key)?this.wavelengths[this.filterBand.key]:this.filterBand.nm;
      let {n:wave,row:wavelengthRow}=field(setup,'fwhmWavelength','Wavelength',wavelength,300,2500,1,'nm','Starts at the filter default. Custom values are saved for this filter.');
      this.wavelengthReset=sqrTool(setup,':/icons/reload.png','Use filter default',()=>{wave.setValue(this.filterBand.nm);this.refreshModel();});
      this.wavelengthInfo=new Label(setup);this.wavelengthInfo.wordWrapping=true;this.wavelengthInfo.text='Default: '+sqrFilterWavelengthText(this.filterBand);
      wavelengthRow.add(this.wavelengthReset);wavelengthRow.add(this.wavelengthInfo,100);
      let optics=field(setup,'fwhmOptics','Additional optical blur',o.fwhmOptics,0,20,3,'arcsec','Optional allowance for independently calibrated focus or optical blur in the imaging telescope. Normally leave at zero.');
      let optional=new Label(setup);optional.text='Optional; normally 0';optics.row.addSpacing(12);optics.row.add(optional);optics.row.addStretch();
      if(this.seeingValue>0){
         field(limits,'fwhmGoodPercent','Good up to',o.fwhmGoodPercent,1,500,1,'% of expected FWHM','Upper boundary for Good.').row.addStretch();
         field(limits,'fwhmMediumPercent','Medium up to',o.fwhmMediumPercent,1,500,1,'% of expected FWHM','Upper boundary for Medium. Must be greater than the Good limit; larger values are Bad.').row.addStretch();
      }else{
         field(limits,'fwhmSeeingGood','Good up to',o.fwhmSeeingGood,.01,20,2,'arcsec','Chosen seeing boundary at zenith and 550 nm; not a measurement of the current atmosphere.').row.addStretch();
         field(limits,'fwhmSeeingMedium','Medium up to',o.fwhmSeeingMedium,.01,20,2,'arcsec','Seeing boundary at zenith and 550 nm. Must be greater than the Good limit.').row.addStretch();
      }
      let mode=new Label(limits);mode.wordWrapping=true;mode.text=this.seeingValue>0?'Uses the seeing estimate from Input files and observing conditions.':'No seeing estimate supplied. These limits define your acceptance criteria.';limits.sizer.add(mode);

      let result=sqrGroup(this,'FWHM limits in pixels');
      this.preview=new Label(result);this.preview.useRichText=true;this.preview.wordWrapping=true;this.preview.setFixedHeight(3*this.font.height+4);result.sizer.add(this.preview);
      this.gradeRows=[];
      for(let [name,color] of [['Good','#24753b'],['Medium','#946000'],['Bad','#b33333']]){
         let row=new HorizontalSizer;row.spacing=12;
         let label=new Label(result);label.useRichText=true;label.text='<b><font color="'+color+'">'+name+'</font></b>';label.textAlignment=TextAlignment.Left|TextAlignment.VertCenter;label.setScaledFixedWidth(120);
         let range=new Label(result);range.useRichText=true;range.textAlignment=TextAlignment.Left|TextAlignment.VertCenter;range.setFixedHeight(this.font.height+10);
         row.add(label);row.add(range,100);result.sizer.add(row);this.gradeRows.push(range);
      }
      this.note=new Label(this);this.note.wordWrapping=true;this.note.text='Bands guide visual review. Scores and rejection choices stay unchanged.';
      this.applyButton=sqrButton(this,'Apply',()=>this.ok());this.cancelButton=sqrButton(this,'Cancel',()=>this.cancel());this.applyButton.defaultButton=true;this.cancelButton.escapeButton=true;
      let buttons=new HorizontalSizer;buttons.spacing=8;buttons.addStretch();buttons.add(this.applyButton);buttons.add(this.cancelButton);
      this.sizer=new VerticalSizer;this.sizer.margin=12;this.sizer.spacing=10;this.sizer.add(this.intro);this.sizer.add(enabledRow);this.sizer.add(current);this.sizer.add(this.parameters);this.sizer.add(result);this.sizer.add(this.note);this.sizer.add(buttons);
      this.enabledCheck.onCheck=()=>this.refreshModel();this.setScaledFixedWidth(680);this.refreshModel();this.adjustToContents();
   }
   options(){let wavelengths={...this.wavelengths},value=this.fields.fwhmWavelength.value;
      if(value===this.filterBand.nm)delete wavelengths[this.filterBand.key];else wavelengths[this.filterBand.key]=value;
      return {...this.baseOptions,fwhmEnabled:this.enabledCheck.checked,fwhmAperture:this.apertureValue,fwhmSeeing:this.seeingValue,fwhmWavelengths:wavelengths,
         ...Object.fromEntries(Object.entries(this.fields).filter(([key])=>key!=='fwhmWavelength').map(([key,control])=>[key,control.value]))};}
   refreshModel(){
      let m=this.model=sqrFWHMModel(this.options(),this.scale,this.filter);this.parameters.enabled=this.enabledCheck.checked;this.applyButton.enabled=m.parametersValid;
      this.preview.text=m.valid?(m.mode==='relative'?'<b>Expected FWHM: '+sqrFmt(m.expected,1)+' px</b>':'Limits for the current telescope and observing conditions.')+'<br/>One decimal place; grading uses full precision.':sqrHTML(m.reason);
      let values=m.valid?['Up to '+sqrFmt(m.good,1)+' px','Above '+sqrFmt(m.good,1)+' to '+sqrFmt(m.medium,1)+' px','Above '+sqrFmt(m.medium,1)+' px']:['—','—','—'];
      this.gradeRows.forEach((row,i)=>row.text='<b>'+values[i]+'</b>');
   }
   showModelInformation(){(new SQRPlotInfoDialog(sqrFWHMModelInformation(this.model))).execute();}
}

// Use current PJSR dialog path properties; text edits and browsing invoke the
// same invalidation callback when an input directory changes.
function sqrFolderRow(parent,label,value,changed){
   let row=new HorizontalSizer;row.spacing=8;let l=new Label(parent);l.text=label;l.setScaledFixedWidth(135);
   let edit=new Edit(parent);edit.text=value;edit.onEditCompleted=()=>changed(edit.text);
   let browse=sqrTool(parent,':/icons/select-file.png','Choose '+label.toLowerCase(),()=>{let d=new GetDirectoryDialog;d.caption=label;d.initialPath=edit.text;if(d.execute()){edit.text=d.directoryPath;changed(edit.text);}});
   row.add(l);row.add(edit,100);row.add(browse);parent.sizer.add(row);return {edit:edit,browse:browse};
}
/** Review individual files before an undo. Selecting a moved Review row
 * preselects only that original; otherwise all eligible files start selected.
 * A journal chooser keeps undo available after rescanning or restarting. */
class SQRRestoreDialog extends Dialog {
   constructor(path='',selectedSource='',directory=''){
      super();this.windowTitle='Undo moved originals';this.record=null;this.plan=null;this.selectedSource=selectedSource;this.directory=directory;
      this.note=new Label(this);this.note.wordWrapping=true;this.note.text='Choose the original SQR-moves journal, then select the files to return to their original folders. Restored files will be marked as kept in the current review.';
      this.path=new Edit(this);this.path.readOnly=true;
      this.browse=sqrTool(this,':/icons/select-file.png','Choose an SQR-moves journal from a rejection folder.',()=>this.chooseJournal());
      let files=new HorizontalSizer;files.spacing=8;files.add(this.path,100);files.add(this.browse);
      this.table=new TreeBox(this);this.table.numberOfColumns=4;this.table.headerVisible=true;this.table.alternateRowColor=true;this.table.rootDecoration=false;this.table.setScaledMinSize(850,280);
      ['Restore','Original file','Restore to','Status'].forEach((text,i)=>this.table.setHeaderText(i,text));this.icons=[sqrRejectIcon(this,false),sqrRejectIcon(this,true)];
      this.table.onNodeClicked=(node,column)=>{if(column===0&&node?.entry&&!node.entry.problem){node.restore=!node.restore;this.refreshSelection();}};
      this.table.onKeyPress=key=>{if(key!==Key_Space)return false;let node=this.table.currentNode;if(node?.entry&&!node.entry.problem){node.restore=!node.restore;this.refreshSelection();}return true;};
      this.all=sqrButton(this,'Select available',()=>this.selectAll(true));this.none=sqrButton(this,'Clear selection',()=>this.selectAll(false));
      this.summary=new Label(this);this.summary.wordWrapping=true;this.summary.text='Choose a move journal to list its files.';
      this.restore=sqrButton(this,'Restore selected',()=>{try{this.plan=sqrRestorePlan(this.record,this.indices());this.ok();}catch(e){this.error(e);}});this.restore.enabled=false;
      this.close=sqrButton(this,'Cancel',()=>this.cancel());
      let actions=new HorizontalSizer;actions.spacing=8;actions.add(this.all);actions.add(this.none);actions.addStretch();actions.add(this.restore);actions.add(this.close);
      this.sizer=new VerticalSizer;this.sizer.margin=10;this.sizer.spacing=10;this.sizer.add(this.note);this.sizer.add(files);this.sizer.add(this.table,100);this.sizer.add(this.summary);this.sizer.add(actions);
      this.all.enabled=this.none.enabled=false;
      if(path)try{this.loadJournal(path);}catch(e){this.path.text=path;this.summary.text='Unable to read this move journal: '+String(e)+' Choose another journal.';}
      this.adjustToContents();
   }
   error(e){new MessageBox(String(e),'Restore originals',StdIcon.Error,StdButton.Ok).execute();}
   chooseJournal(){let d=new OpenFileDialog;d.multipleSelections=false;d.caption='Choose original SQR-moves journal';d.filters=[['SQR move journals','SQR-moves-*.json'],['JSON files','*.json']];d.initialPath=this.path.text||this.directory;
      if(d.execute())try{this.loadJournal(d.filePaths[0]);}catch(e){this.error(e);}}
   loadJournal(path){let record=sqrReadMoveJournal(path);this.record=record;this.path.text=record.path;this.table.clear();
      let selected=this.selectedSource&&record.entries.some(entry=>sqrKey(entry.source)===sqrKey(this.selectedSource));
      for(let entry of record.entries){let node=new TreeBoxNode(this.table);node.entry=entry;node.restore=!entry.problem&&(!selected||sqrKey(entry.source)===sqrKey(this.selectedSource));
         node.setText(1,sqrFileName(entry.source));node.setText(2,entry.source);node.setText(3,entry.problem||'Ready to restore');node.setToolTip(1,'Moved file: '+entry.target);node.setToolTip(2,entry.source);node.setToolTip(3,entry.problem||'Return this unchanged light file to its unoccupied original path.');}
      for(let i=0;i<4;++i)this.table.adjustColumnWidthToContents(i);this.table.setColumnWidth(0,65);this.refreshSelection();
   }
   indices(){let indices=[];for(let i=0;i<this.table.numberOfChildren;++i){let node=this.table.child(i);if(node.restore)indices.push(node.entry.index);}return indices;}
   selectAll(value){for(let i=0;i<this.table.numberOfChildren;++i){let node=this.table.child(i);node.restore=value&&!node.entry.problem;}this.refreshSelection();}
   refreshSelection(){let available=0;for(let i=0;i<this.table.numberOfChildren;++i){let node=this.table.child(i);if(!node.entry.problem){++available;node.setIcon(0,this.icons[node.restore?1:0]);}else node.setText(0,'—');}
      let count=this.indices().length;this.restore.enabled=count>0;this.all.enabled=this.none.enabled=available>0;
      this.summary.text=count+' selected · '+available+' available · '+(this.table.numberOfChildren-available)+' unavailable or already restored. Existing files are never overwritten.';
   }
}
// Read the displayed, unscaled bitmap without copying an Image or rereading a
// source file. The channel tag distinguishes grayscale from neutral RGB pixels.
function sqrPreviewPixel(bitmap,x,y){
   if(!bitmap||x<0||y<0||x>=bitmap.width||y>=bitmap.height)return null;
   let pixel=bitmap.pixel(x,y),rgb=[(pixel>>>16)&255,(pixel>>>8)&255,pixel&255];
   return (bitmap.sqrChannels===1?[rgb[0]]:rgb).map(v=>v/255);
}
// Extend the bundled viewer while preserving its navigation handlers. Repaint
// refreshes a stationary pointer after zoom, pan, blinking or region changes.
function sqrInstallPixelReadout(viewer,bitmapProvider){
   viewer.pixelName_Label=new Label(viewer);viewer.pixelName_Label.text='Value:';
   viewer.pixelValue_Label=new Label(viewer);viewer.pixelValue_Label.text='---';
   let row=viewer.coords_Control.sizer;row.insert(row.numberOfItems-1,viewer.pixelName_Label);row.insert(row.numberOfItems-1,viewer.pixelValue_Label);
   viewer.pixelValue_Label.toolTip='Displayed preview pixel value, normalized to 0–1, with 8-bit display precision. Includes Display STF and preview brightness alignment when enabled. X/Y are relative to the selected region. RGB images show all three channels.';
   let pointer=null;
   const label=(control,text)=>{if(control.text!==text)control.text=text;};
   viewer.refreshPixelReadout=()=>{
      let pos=pointer&&viewer.isValid?viewer.viewportToImage(pointer.x,pointer.y):null;
      let values=pos?sqrPreviewPixel(bitmapProvider(),Math.floor(pos.x),Math.floor(pos.y)):null;
      label(viewer.xValue_Label,values?format('%8.2f',pos.x):'---');label(viewer.yValue_Label,values?format('%8.2f',pos.y):'---');
      label(viewer.pixelValue_Label,values?values.map((v,c)=>(values.length===3?['R ','G ','B '][c]:'')+v.toFixed(6)).join('  '):'---');
   };
   viewer.clearPixelReadout=()=>{pointer=null;viewer.refreshPixelReadout();};
   let viewport=viewer.scrollbox.viewport,move=viewport.onMouseMove,wheel=viewport.onMouseWheel,leave=viewport.onLeave,paint=viewport.onPaint,hide=viewport.onHide;
   viewport.tracking=true;
   viewport.onMouseMove=function(x,y,buttons,modifiers){if(move)move.call(this,x,y,buttons,modifiers);pointer={x,y};viewer.refreshPixelReadout();};
   viewport.onMouseWheel=function(x,y,delta,buttons,modifiers){if(wheel)wheel.call(this,x,y,delta,buttons,modifiers);pointer={x,y};viewer.refreshPixelReadout();};
   viewport.onLeave=function(){if(leave)leave.call(this);viewer.clearPixelReadout();};
   viewport.onHide=function(){if(hide)hide.call(this);viewer.clearPixelReadout();};
   viewport.onPaint=function(x0,y0,x1,y1){if(paint)paint.call(this,x0,y0,x1,y1);viewer.refreshPixelReadout();};
}
/** Return two rendered preview bitmaps for identical image coordinates.
 * Brightness alignment and the shared reference-derived stretch modify temporary
 * images only. The dialog owns the returned bitmaps and releases them on reload. */
function sqrRenderFrames(a,b,o,rect){
   let da=new Image,db=b?new Image:null,frames=[];
   try{
      if(b&&(a.width!==b.width||a.height!==b.height||a.numberOfNominalChannels!==b.numberOfNominalChannels))
         throw new Error('Reference and registered frame must have identical dimensions and channels.');
      let r=new Rect(...rect);da.assign(a,r,0,a.numberOfNominalChannels-1);if(b)db.assign(b,r,0,b.numberOfNominalChannels-1);
      if(b&&o.alignBrightness){
         // Robust affine background/contrast alignment for display only.
         for(let c=0;c<da.numberOfNominalChannels;++c){
            let whole=new Rect(0,0,da.width,da.height),ma=da.median(whole,c,c),mb=db.median(whole,c,c),sa=da.MAD(ma,whole,c,c),sb=db.MAD(mb,whole,c,c);
            let scale=sa>0&&sb>0?Math.max(.1,Math.min(10,sb/sa)):1;
            da.apply(ma,ImageOp.Sub,whole,c,c);da.apply(scale,ImageOp.Mul,whole,c,c);da.apply(mb,ImageOp.Add,whole,c,c);
         }
      }
      if(o.displaySTF){let stretch=(db||da).computeAutoStretch();da.applyDisplayFunction(stretch);if(db)db.applyDisplayFunction(stretch);}
      da.truncate();frames.push(da.render());if(db){db.truncate();frames.push(db.render());}for(let frame of frames)frame.sqrChannels=da.numberOfNominalChannels;return frames;
   }catch(e){for(let frame of frames)frame.clear();throw e;}finally{da.free();if(db)db.free();}
}
/** Keep one reference bitmap and its numeric display calibration. No Image is
 * retained. The fingerprint, crop and display options invalidate the entry;
 * returned reference bitmaps are borrowed and released by the dialog cache. */
function sqrReferenceDisplay(path,o,rect,cache){
   let key=JSON.stringify([sqrKey(path),sqrFingerprint(path),rect,!!o.alignBrightness,!!o.displaySTF]);
   if(cache.data?.key===key)return cache.data;
   if(cache.data){cache.data.bitmap.clear();cache.data=null;}
   let source=null,crop=new Image,bitmap=null;
   try{
      source=sqrReadImage(path,true);
      let width=source.width,height=source.height,channels=source.numberOfNominalChannels;
      crop.assign(source,new Rect(...rect),0,channels-1);source.free();source=null;
      let whole=new Rect(0,0,crop.width,crop.height),stats=[];
      if(o.alignBrightness)for(let c=0;c<channels;++c){let median=crop.median(whole,c,c);stats.push({median,mad:crop.MAD(median,whole,c,c)});}
      let stretch=o.displaySTF?crop.computeAutoStretch():null;
      if(o.displaySTF)crop.applyDisplayFunction(stretch);
      crop.truncate();bitmap=crop.render();bitmap.sqrChannels=channels;
      return cache.data={key,width,height,channels,stats,stretch,bitmap};
   }catch(e){if(bitmap)bitmap.clear();throw e;}finally{if(source)source.free();crop.free();}
}
function sqrFrames(path,reference,o,rect,isMaster=false,cache=null){
   if(cache){let display=sqrReferenceDisplay(reference,o,rect,cache);
      return [sqrRotationFrame(path,o,rect,display,isMaster).bitmap,display.bitmap];}
   let a=null,b=null;
   try{a=sqrReadImage(path,isMaster);b=sqrReadImage(reference,true);return sqrRenderFrames(a,b,o,rect);}
   finally{if(a)a.free();if(b)b.free();}
}
// Read each source once for a complete regional cycle. Keep only rendered
// bitmaps afterwards; temporary images are released on success and failure.
function sqrRegionFrames(path,reference,o,regions,isMaster=false){
   let a=null,b=null,frames=[];
   try{a=sqrReadImage(path,isMaster);if(reference)b=sqrReadImage(reference,true);
      for(let rect of regions)frames.push(sqrRenderFrames(a,b,o,rect));return frames;
   }catch(e){for(let pair of frames)for(let frame of pair)frame.clear();throw e;}
   finally{if(a)a.free();if(b)b.free();}
}

/** Render one subframe for rotation, retaining only numeric display calibration.
 * The first displayed subframe supplies the common brightness/STF baseline.
 * Subsequent steps read only their own image; no master or full sequence is held.
 * A changed group, region or display option starts a new calibration. */
function sqrRotationFrame(path,o,rect,display=null,isMaster=false){
   let source=null,image=new Image;
   try{
      source=sqrReadImage(path,isMaster);let channels=source.numberOfNominalChannels;
      if(display&&(source.width!==display.width||source.height!==display.height||channels!==display.channels))
         throw new Error(display.bitmap?'Reference and registered frame must have identical dimensions and channels.':'Rotating subframes must have identical dimensions and channels.');
      image.assign(source,new Rect(...rect),0,channels-1);
      let whole=new Rect(0,0,image.width,image.height),stats=[];
      if(o.alignBrightness)for(let c=0;c<channels;++c){let median=image.median(whole,c,c);stats.push({median,mad:image.MAD(median,whole,c,c)});}
      if(!display)display={width:source.width,height:source.height,channels,stats,stretch:o.displaySTF?image.computeAutoStretch():null};
      else if(o.alignBrightness)for(let c=0;c<channels;++c){
         let a=stats[c],b=display.stats[c],scale=a.mad>0&&b.mad>0?Math.max(.1,Math.min(10,b.mad/a.mad)):1;
         image.apply(a.median,ImageOp.Sub,whole,c,c);image.apply(scale,ImageOp.Mul,whole,c,c);image.apply(b.median,ImageOp.Add,whole,c,c);
      }
      if(o.displaySTF)image.applyDisplayFunction(display.stretch);
      image.truncate();let bitmap=image.render();bitmap.sqrChannels=channels;return {bitmap,display};
   }finally{if(source)source.free();image.free();}
}

/** Own UI state and keep selection, REVIEW candidacy and rejection independent.
 * current points to a row object; visibleRows is only the current table view.
 * populating guards programmatic table changes against selection callbacks.
 * selectionCleared preserves an intentional deselection across refreshes.
 * running prevents conflicting operations while processEvents keeps the UI alive.
 * frames holds rendered previews; frame selects image/reference; blinking and
 * the timer control pair alternation without rereading files. Subframe rotation
 * loads one image per tick with a common numeric display calibration. Regional
 * playback borrows frames from regionFrames; the cache owns their lifetime. */
class SQRDialog extends Dialog {
   constructor(o,session=null){
      super();o={...sqrDefaults(),...o,logFolder:sqrLogFolderOption(o)};this.windowTitle='Subframe Quality Review '+SQR_VERSION;
      this.fwhmOptions=sqrFWHMOptions(o);
      this.session=session;this.scanRequired=!session;this.running=false;this.frames=null;this.blinking=false;this.frame=0;this.current=null;this.selectionCleared=false;this.qualityCollapsed=!!o.qualityCollapsed;this.inputsCollapsed=!!o.inputsCollapsed;this.reviewInfoCollapsed=!!o.reviewInfoCollapsed;this.fitPreviewOnShow=false;
      this.referenceDisplay={};
      this.useCornerMeasurements=sqrHasCornerMeasurements(session)&&session.options.measureCorners!==false;
      this.timer=new Timer(sqrBlinkInterval(o.blinkInterval),false,this);this.timer.onTimeout=()=>{if(this.blinking&&!this.running)this.advancePlayback();};
      this.intro=new Label(this);this.intro.wordWrapping=true;
      this.intro.text='Rank registered WBPP lights, blink against the filter master or best subframe, and move the originals you manually reject. Corner measurements are optional.';
      this.inputs=new Control(this);this.inputs.sizer=new VerticalSizer;this.inputs.sizer.margin=10;this.inputs.sizer.spacing=8;
      this.inputsBar=new SectionBar(this,'Input files and observing conditions');this.inputsBar.setSection(this.inputs);
      this.inputsBar.toolTip='Click to collapse or expand input folders, log controls, telescope aperture, seeing, Session SQM and its reading time. Your paths, settings and measurements are retained.';
      this.inputsBar.toggleSection=()=>this.setInputsCollapsed(!this.inputsCollapsed);
      let apertureRow=new HorizontalSizer;apertureRow.spacing=8;
      let apertureLabel=new Label(this.inputs);apertureLabel.text='Telescope aperture:';apertureLabel.setScaledFixedWidth(135);
      this.aperture=sqrNumber(this.inputs,'',this.fwhmOptions.fwhmAperture,0,50000,0);this.aperture.setReal(false);this.aperture.label.hide();this.aperture.edit.setScaledFixedWidth(80);
      this.fwhmOptions.fwhmAperture=this.aperture.value;
      let apertureUnit=new Label(this.inputs);apertureUnit.text='mm';
      this.aperture.toolTip='Enter the imaging telescope aperture diameter. Required for the FWHM grading bands; zero means not configured. This does not repeat image measurements or change scores.';
      this.aperture.onValueUpdated=()=>{this.fwhmOptions.fwhmAperture=this.aperture.value;this.syncOptions();if(this.histogram)this.updateHistogram();};
      this.seeing=sqrNumber(this.inputs,'Zenith seeing (″):',this.fwhmOptions.fwhmSeeing,0,20,2);this.seeing.enableFixedPrecision(true);this.seeing.label.setScaledFixedWidth(130);this.seeing.edit.setScaledFixedWidth(68);
      this.seeing.toolTip='Optional seeing estimate at zenith and a reference wavelength of 550 nm, in arcseconds. Zero keeps fixed seeing limits. A positive value grades FWHM relative to expected blur; adjust the Good/Medium percentages in FWHM grading. Forecasts are approximate; a value already corrected for target altitude must first be converted to zenith.';
      this.seeing.onValueUpdated=()=>{this.fwhmOptions.fwhmSeeing=this.seeing.value;this.syncOptions();if(this.histogram)this.updateHistogram();};
      this.sqm=sqrNumber(this.inputs,'Session SQM:',sqrSQMReading(o),0,30,2);this.sqm.enableFixedPrecision(true);this.sqm.label.setScaledFixedWidth(95);this.sqm.edit.setScaledFixedWidth(68);
      this.sqm.toolTip='Optional sky-brightness reading in mag/arcsec². With a reading and its local date/time, the nearest eligible exposure midpoint selects a reference whose measured background is assigned this SQM value. Bortle class is estimated automatically; Gaia is not used. Zero enables manual Bortle selection and Gaia calibration on the Sky brightness plot. Scores are unchanged.';
      this.sqm.onValueUpdated=()=>this.bortleChanged();
      let sqmUnit=new Label(this.inputs);sqmUnit.text='mag/arcsec²';
      let sqmTimeLabel=new Label(this.inputs);sqmTimeLabel.text='SQM time (local):';
      this.sqmTime=new Edit(this.inputs);this.sqmTime.text=String(o.sqmTime||'');this.sqmTimePreset=o.sqmTimeFromLog?this.sqmTime.text.trim():'';this.sqmTime.setScaledFixedWidth(185);this.sqmTime.enabled=sqrSQMReading(o)>0;
      this.sqmTime.toolTip='Reading date and local time: YYYY-MM-DD HH:MM[:SS]. The earliest light-frame sequence in the Autorun logs supplies the preset. Edit it to the actual SQM reading time. The inferred/custom UTC offset converts it to image UTC timestamps. A missing or ambiguous time does not fall back to Gaia.';
      this.sqmTime.onEditCompleted=()=>this.sqmTimeChanged();
      this.sqmTimePicker=sqrButton(this.inputs,'Choose…',()=>this.editSQMTime());this.sqmTimePicker.toolTip='Choose the reading date and time. An empty value starts at the Autorun light-frame sequence, or at the selected exposure midpoint if no log preset is available. Apply confirms; Cancel leaves it unchanged.';this.sqmTimePicker.enabled=this.sqm.value>0;
      apertureRow.add(apertureLabel);apertureRow.add(this.aperture);apertureRow.add(apertureUnit);apertureRow.addSpacing(24);apertureRow.add(this.seeing);apertureRow.addSpacing(24);apertureRow.add(this.sqm);apertureRow.add(sqmUnit);apertureRow.addSpacing(24);apertureRow.add(sqmTimeLabel);apertureRow.add(this.sqmTime);apertureRow.add(this.sqmTimePicker);apertureRow.addStretch();
      this.folders={};for(let [key,label] of [['wbpp','WBPP output:'],['originals','Original-light root:']])
         this.folders[key]=sqrFolderRow(this.inputs,label,o[key],value=>{if(['wbpp','originals'].includes(key)&&this.session&&sqrKey(value.trim())!==sqrKey(this.session.options[key].trim()))this.invalidate();});
      this.inputControls=[this.aperture,this.seeing,this.sqm,this.sqmTime,this.sqmTimePicker,...Object.values(this.folders).flatMap(x=>[x.edit,x.browse])];
      this.autofocusRuns=[];this.autorunFiles=[];this.autorunImagingStart=null;this.guideFiles=[];this.parsedGuideLog={sections:[],invalid:0,errors:0};this.loadedLogFolder='';
      this.logFolder=sqrFolderRow(this.inputs,'Log folder (optional):',o.logFolder,()=>this.loadAutorun());
      this.logFolder.edit.toolTip='Read all Autorun_log and PHD2_GuideLog files directly in this folder, excluding _CHN translations. Logs use acquisition-computer local time. Select the folder again to refresh. Clear it to remove autofocus and guiding results; image measurements are retained.';
      this.folders.destination=sqrFolderRow(this.inputs,'Rejected originals:',o.destination,()=>{this.syncOptions();this.updateButtons();});
      this.folders.destination.edit.onTextUpdated=()=>this.updateButtons();
      this.folders.destination.edit.toolTip='Choose the folder for rejected originals to enable Move and Undo after scanning. Leave it blank to review and measure without moving files.';
      this.inputControls.push(this.folders.destination.edit,this.folders.destination.browse);
      let logTools=new HorizontalSizer;logTools.spacing=8;let logLabel=new Label(this.inputs);logLabel.text='Log timestamps:';logLabel.setScaledFixedWidth(135);
      this.logTimeZone=new ComboBox(this.inputs);for(let name of ['Infer from image timestamps','Custom UTC offset'])this.logTimeZone.addItem(name);
      this.logTimeZone.currentItem=o.logTimeZone==='offset'?1:0;
      this.logTimeZone.toolTip='Infer local time minus UTC from filenames and UTC exposure metadata, accounting for filenames written at exposure completion. Ambiguous or missing evidence requires a custom UTC offset; this computer’s timezone is never assumed.';
      // Keep the original offset editor visible. A unique inferred offset
      // seeds its value so switching to Custom starts with that estimate.
      this.logUTCOffset=sqrNumber(this.inputs,'UTC offset (hours):',o.logUTCOffset,-12,14,2);
      this.logUTCOffset.edit.setScaledFixedWidth(58);
      this.logUTCOffset.toolTip='Log time minus UTC: for example, +2 for UTC+02:00, or +5.5 for UTC+05:30.';this.logUTCOffset.enabled=this.logTimeZone.currentItem===1;
      this.autorunStatus=new Label(this.inputs);this.autorunStatus.text='No log folder selected.';
      this.autorunTimes=sqrButton(this.inputs,'Autofocus times…',()=>this.showAutofocusTimes());
      this.autorunTimes.toolTip='Show all extracted autofocus start times, as written in the log and converted to UTC, with their final focus positions.';
      this.logTimeZone.onItemSelected=()=>{this.parseAutorun();if(this.sqm.value>0)this.bortleChanged();};
      this.logUTCOffset.onValueUpdated=()=>{if(!this.settingLogOffset){this.parseAutorun();if(this.sqm.value>0)this.bortleChanged();}};
      logTools.add(logLabel);logTools.add(this.logTimeZone);logTools.add(this.logUTCOffset);logTools.add(this.autorunStatus,100);logTools.add(this.autorunTimes);this.inputs.sizer.add(logTools);
      this.inputControls.push(this.logFolder.edit,this.logFolder.browse,this.logTimeZone,this.logUTCOffset,this.autorunTimes);
      this.updateLogOffsetControls();
      this.inputs.sizer.add(apertureRow);
      // One native collapsible section, with measurement controls separated
      // from ranking weights. Hiding it never changes measurement state.
      this.settings=new Control(this);this.settings.sizer=new HorizontalSizer;this.settings.sizer.spacing=8;
      this.measurementColumn=new Control(this.settings);this.measurementColumn.sizer=new VerticalSizer;this.measurementColumn.sizer.spacing=6;
      this.measurementSettings=sqrGroup(this.measurementColumn,'Measurements and review');
      this.scoreSelection=sqrGroup(this.measurementColumn,'Score selection');
      this.measurementColumn.sizer.add(this.measurementSettings);this.measurementColumn.sizer.add(this.scoreSelection);this.measurementColumn.sizer.addStretch();
      this.scoreSettings=sqrGroup(this.settings,'Score weights');
      this.guideSettings=sqrGroup(this.settings,'Guiding');
      for(let group of [this.measurementSettings,this.scoreSelection,this.scoreSettings,this.guideSettings]){group.sizer.margin=8;group.sizer.spacing=6;}
      for(let group of [this.measurementColumn,this.scoreSettings,this.guideSettings])this.settings.sizer.add(group,100);
      this.qualityBar=new SectionBar(this,'Quality evaluation');this.qualityBar.setSection(this.settings);
      this.qualityBar.toolTip='Click to collapse or expand the quality controls. Your settings and measurements are retained.';
      this.qualityBar.toggleSection=()=>this.setQualityCollapsed(!this.qualityCollapsed);
      const qualityRow=(parent,controls,spacing=12)=>{let row=new HorizontalSizer;row.spacing=spacing;for(let c of controls)row.add(c);row.addStretch();parent.sizer.add(row);};
      this.percent=sqrNumber(this.measurementSettings,'Review worst (%):',o.percent,0,100,1);
      this.patch=sqrNumber(this.measurementSettings,'Corner size (%):',o.patch,10,40,0);
      this.margin=sqrNumber(this.measurementSettings,'Edge guard (%):',o.margin,0,15,1);
      this.minStars=sqrNumber(this.measurementSettings,'Minimum stars:',o.minStars,5,1000,0);
      for(let n of [this.percent,this.minStars,this.margin,this.patch])n.label.setScaledFixedWidth(115);
      for(let n of [this.percent,this.patch,this.margin,this.minStars])n.edit.setScaledFixedWidth(42);
      this.percent.toolTip='Shortlist this percentage independently in each comparable WBPP group, rounded up. Review flags do not select files for moving.';
      this.patch.toolTip='Width and height of each corner and center patch as a percentage of the common usable field.';
      this.margin.toolTip='Minimum edge guard. Exact-zero registration padding can increase the common inset.';
      // Review criteria and preview geometry form separate aligned columns.
      let measurementGrid=new HorizontalSizer;measurementGrid.spacing=16;
      for(let controls of [[this.percent,this.minStars],[this.margin,this.patch]]){
         let column=new VerticalSizer;column.spacing=6;for(let control of controls)column.add(control);measurementGrid.add(column);
      }
      measurementGrid.addStretch();this.measurementSettings.sizer.add(measurementGrid);
      this.cornerScoring=new CheckBox(this.scoreSelection);this.cornerScoring.text='Include corner measurements (R2)';
      this.cornerScoring.toolTip='With manual weights, choose R2 including corners instead of R1 field-only Score. In R3 mode, make corner KPIs eligible for correlation selection; in R4 mode, include R2 in the rank combination. Existing measurements are reused. Off uses field-only evaluation and whole-image sky background; no measurements are repeated.';
      this.cornerScoring.onCheck=()=>this.toggleCornerScoring();qualityRow(this.scoreSelection,[this.cornerScoring]);
      this.manualWeights=Object.fromEntries(SQR_SCORE_COMPONENTS.map(c=>[c.weight,o[c.weight]]));
      this.correlationOnly=new CheckBox(this.scoreSelection);this.correlationOnly.text='Use R3: strongly correlated KPIs';this.correlationOnly.checked=!!o.correlationOnly&&!o.rankOfRanks;
      this.correlationOnly.toolTip='Use the R3 correlation score as the current Score. Include KPIs with strong correlation (|r| ≥ 0.7) to PSF signal weight, with equal weights. PSF signal weight is the reference only and is excluded from R3. If no KPI qualifies, keep the manual score and leave R3 unavailable. R3 is evaluated from existing measurements even when this option is off. Manual weights are retained. Selecting this mode turns off R4 rank-of-ranks scoring.';
      this.correlationOnly.onCheck=()=>this.toggleCorrelationScoring();
      qualityRow(this.scoreSelection,[this.correlationOnly]);
      this.rankScoring=new CheckBox(this.scoreSelection);this.rankScoring.text='Use R4: rank of ranks';this.rankScoring.checked=!!o.rankOfRanks;
      this.rankScoring.toolTip='Use R4 as the current Score: the equal-weight mean of normalized R1, R2 and R3 ranks. Omit unavailable ranks and omit R2 while corner scoring is off. R4 remains visible when this option is off. Selecting this mode turns off correlation scoring.';
      this.rankScoring.onCheck=()=>this.toggleRankScoring();qualityRow(this.scoreSelection,[this.rankScoring]);
      this.scoreModeStatus=new Label(this.scoreSelection);this.scoreModeStatus.useRichText=true;this.scoreModeStatus.wordWrapping=true;this.scoreModeStatus.setFixedHeight(2*this.font.height);
      this.scoreModeStatus.toolTip='The Score column, REVIEW shortlist and current-score sort use this selection. With R3 and R4 off, the corner checkbox chooses R1 or R2. R3 and R4 are alternative scoring modes.';this.scoreSelection.sizer.add(this.scoreModeStatus);
      this.weights={};
      for(let [key,label] of [['signalWeight','PSF signal:'],['starsWeight','Star count:'],['fwhmWeight','Field FWHM:'],['eccentricityWeight','Field eccentricity:'],['cornerWeight','Corner quality:'],['backgroundWeight','Weight:'],['belowMeanWeight','Below-mean Quality:']]){
         let n=sqrNumber(this.scoreSettings,label,o[key],0,100,0);this.weights[key]=n;n.label.setScaledFixedWidth(130);n.edit.setScaledFixedWidth(36);n.toolTip='Relative influence on the ranking. Zero disables this component.';
         n.onValueUpdated=()=>this.rerank();
      }
      let skyRow=new HorizontalSizer;skyRow.spacing=this.weights.signalWeight.sizer.spacing;
      this.skyScoreKPI=new ComboBox(this.scoreSettings);for(let choice of SQR_SKY_SCORE_CHOICES)this.skyScoreKPI.addItem(choice.label);
      this.skyScoreKPI.setScaledFixedWidth(125);
      this.skyScoreKPI.currentItem=SQR_SKY_SCORE_CHOICES.findIndex(c=>c.key===sqrSkyScoreChoice(o).key);
      this.skyScoreKPI.toolTip='Choose one sky indicator for Score. Sky quality (default) combines Transparency and Sky brightness. Transparency is relative stellar throughput: exposure-corrected flux of matching stars, with the group reference at 100%; it is not absolute atmospheric transmission. Sky brightness is the measured background in image units, using the whole-image mean or lowest preview mean. R1/R2 and Below-mean Quality use the adjacent weight. R3 may select only this sky KPI if strongly correlated; R4 uses the resulting ranks. Changing this choice reuses measurements.';
      this.skyScoreKPI.onItemSelected=()=>this.rerank();this.weights.backgroundWeight.label.hide();
      // The compact selector occupies the label area of the left column. Its
      // right edge and the weight edit align with the NumericEdits above it.
      let skyLabel=new HorizontalSizer;skyLabel.addStretch();skyLabel.add(this.skyScoreKPI);
      skyRow.add(skyLabel,100);skyRow.add(this.weights.backgroundWeight);
      let weightGrid=new HorizontalSizer;weightGrid.spacing=16;weightGrid.addStretch();
      for(let keys of [['signalWeight','fwhmWeight','cornerWeight'],['starsWeight','eccentricityWeight','belowMeanWeight']]){
         let column=new VerticalSizer;column.spacing=6;for(let k of keys)column.add(this.weights[k]);
         if(keys[0]==='signalWeight')column.add(skyRow);else column.addStretch();weightGrid.add(column);
      }
      weightGrid.addStretch();this.scoreSettings.sizer.add(weightGrid);this.scoreSettings.sizer.addStretch();
      this.weights.eccentricityWeight.toolTip='Weight of field star elongation compared with the group. Higher eccentricity reduces Score. Zero disables this component; no extra measurement pass is needed.';
      this.weights.backgroundWeight.toolTip='Shared manual weight for the selected sky KPI. Higher combined Sky quality or Transparency is better; lower Sky brightness is better. Zero disables its manual contribution. R3 uses equal weights for qualifying KPIs and considers only the selected sky indicator.';
      this.weights.cornerWeight.toolTip='Weight of the worst corner deviation in FWHM, corner/center FWHM ratio or eccentricity. Each metric is compared with that same corner across the group. Zero disables the corner contribution.';
      this.weights.belowMeanWeight.toolTip='Relative weight of the fraction of underlying indicators with worse-than-mean quality. For example, 75% contributes 0.75 times this weight before normalization. Score and this fraction itself are excluded from the comparison. Zero removes this Score component without hiding the percentage.';
      this.guideModeLabel=new Label(this.guideSettings);this.guideModeLabel.text='Guiding in Score:';this.guideModeLabel.setScaledFixedWidth(115);
      this.guidingMode=new ComboBox(this.guideSettings);for(let label of ['Require guiding data','Use available guiding data','Ignore guiding KPI'])this.guidingMode.addItem(label);
      this.guidingMode.currentItem=Math.max(0,['require','available','ignore'].indexOf(o.guidingMode));
      this.guidingMode.toolTip='Require: missing or incomplete guiding data flags the frame for review. Use available: omit missing guiding from that frame’s Score and Below-mean Quality, without a missing-guiding review flag. Ignore: omit guiding from all scores and review flags. Measurements remain visible in every mode.';
      this.weights.guideWeight=sqrNumber(this.guideSettings,'Weight:',o.guideWeight,0,100,0);this.weights.guideWeight.label.setScaledFixedWidth(115);this.weights.guideWeight.edit.setScaledFixedWidth(36);this.weights.guideWeight.onValueUpdated=()=>this.rerank();
      this.guideHint=new Label(this.guideSettings);this.guideHint.wordWrapping=true;this.guideHint.text=sqrGuideThresholdText(null);
      this.guidingMode.onItemSelected=()=>this.rerank();this.weights.guideWeight.enabled=this.guidingMode.currentItem!==2;
      // Match both the label alignment and label-to-control spacing of NumericEdit.
      this.guideModeLabel.textAlignment=this.weights.guideWeight.label.textAlignment;
      qualityRow(this.guideSettings,[this.guideModeLabel,this.guidingMode],this.weights.guideWeight.sizer.spacing);
      qualityRow(this.guideSettings,[this.weights.guideWeight]);this.guideSettings.sizer.addStretch();this.guideSettings.sizer.add(this.guideHint);
      this.guideHint.setFixedHeight(2*this.font.height);
      this.updateCornerControls();
      this.maxFits=o.maxFits;
      this.percent.onValueUpdated=()=>this.rerank();
      for(let n of [this.patch,this.margin])n.onValueUpdated=()=>this.invalidateMeasurements();
      // Minimum stars only validates stored detector/PSF counts. Keep pixels,
      // corner measurements and manual decisions, and refresh all derived ranks.
      this.minStars.onValueUpdated=()=>{this.rerank();if(this.session)this.status.text='Minimum stars changed. Existing measurements re-evaluated; no images remeasured.';};
      this.groupRow=new HorizontalSizer;this.groupRow.spacing=8;
      let groupLabel=new Label(this);groupLabel.text='Filter / group:';
      this.groupSelect=new ComboBox(this);this.groupSelect.onItemSelected=()=>{this.clearFrames();this.current=null;this.selectionCleared=false;this.populateRows();};
      this.scanButton=sqrButton(this,'Scan files',()=>this.scan());
      this.scanButton.setScaledFixedSize(116,26);
      this.groupRow.add(groupLabel);this.groupRow.add(this.groupSelect,100);this.groupRow.add(this.scanButton);
      this.tabs=new TabBox(this);this.reviewPage=new Control(this.tabs);this.blinkPage=new Control(this.tabs);this.histogramPage=new Control(this.tabs);this.scatterPage=new Control(this.tabs);
      this.table=new TreeBox(this.reviewPage);this.table.numberOfColumns=25;this.table.headerVisible=true;this.table.rootDecoration=false;
      this.table.alternateRowColor=true;this.table.multipleSelection=false;this.table.setScaledMinSize(1280,320);
      let headers=['R1','R2','R3','R4','Reject','Review','Image','Acquisition time (UTC)','Score','PSF weight','FWHM (px)','Stars','Main issue','Field eccentricity','Corner quality','Below-mean Quality','Guiding quality (″)','Guide avg (″)','Guide min (″)','Guide max (″)','Worst corner','Original association','Sky brightness','Transparency','Sky quality'];
      this.baseReviewColumnCount=headers.length;
      for(let i=0;i<headers.length;++i)this.table.setHeaderText(i,headers[i]);
      this.rejectIcons=[sqrRejectIcon(this,false),sqrRejectIcon(this,true)];
      // Native mouse focus changes precede onMousePress/onNodeClicked. Mouse selection
      // is committed by the click handler; keyboard navigation is synchronized separately.
      this.table.onMousePress=()=>{this.keyboardNavigation=false;return false;};
      this.table.onCurrentNodeUpdated=node=>{if(this.keyboardNavigation&&!this.populating&&node?.row)this.selectRow(node.row);};
      this.table.onNodeClicked=(node,column)=>{if(!node?.row||this.populating)return;
         if(column===4){this.selectRow(node.row);this.decide(!node.row.reject);}
         else if(this.current===node.row)this.clearSelection();else this.selectRow(node.row);};
      this.table.onKeyPress=key=>{if(key===Key_Space){if(this.current)this.decide(!this.current.reject);return true;}
         this.keyboardNavigation=true;if(this.table.currentNode?.row)this.selectRow(this.table.currentNode.row);return false;};
      this.table.onKeyRelease=key=>{this.keyboardNavigation=false;if(key!==Key_Space&&this.table.currentNode?.row)this.selectRow(this.table.currentNode.row);return false;};
      this.table.onNodeDoubleClicked=(node,column)=>{if(node?.row&&column!==4){this.selectRow(node.row);this.populating=true;this.table.currentNode=node;node.selected=true;this.populating=false;this.inspect();}};
      this.reviewOptions=sqrGroup(this.reviewPage,'Sort and filter');
      let reviewTools=new HorizontalSizer;reviewTools.spacing=10;
      let sortLabel=new Label(this.reviewOptions);sortLabel.text='Sort by:';
      this.order=new ComboBox(this.reviewOptions);for(let item of SQR_REVIEW_SORTS)this.order.addItem(item[1]);
      this.order.setScaledMinWidth(165);this.order.toolTip='Choose a criterion, then use the direction button to switch ascending or descending order. A new criterion starts in its default direction: poorest quality first, filename A to Z, or earliest acquisition first. R1–R4 use rank 1 for worst. Score is higher-is-better; the default sort lists the lowest scores first. Acquisition time uses the original observation timestamp, then registered metadata; filename suffixes do not affect this order.';
      this.order.toolTip+=' Guide minimum, maximum and average start with the largest error first. Missing values follow in either direction, with the master last.';
      this.order.currentItem=sqrReviewOrderIndex(o.reviewOrder);
      this.reviewReverse=!!o.reviewReverse;
      this.sortDirection=sqrButton(this.reviewOptions,'',()=>{if(this.running)return;this.reviewReverse=!this.reviewReverse;this.changeReviewSort();});
      this.sortDirection.setScaledMinWidth(125);
      let filterLabel=new Label(this.reviewOptions);filterLabel.text='Filter:';
      this.candidatesOnly=new CheckBox(this.reviewOptions);this.candidatesOnly.text='REVIEW candidates only';this.candidatesOnly.onCheck=()=>this.populateRows();
      this.candidatesOnly.toolTip='Show only subframes flagged REVIEW. The master is hidden. This does not select originals for rejection.';
      this.order.onItemSelected=()=>{this.reviewReverse=false;this.changeReviewSort();};
      reviewTools.add(sortLabel);reviewTools.add(this.order);reviewTools.add(this.sortDirection);reviewTools.addStretch();reviewTools.add(filterLabel);reviewTools.add(this.candidatesOnly);
      this.reviewSummary=new Label(this.reviewOptions);this.reviewOptions.sizer.add(reviewTools);this.reviewOptions.sizer.add(this.reviewSummary);
      // Stable guidance and the selected image have separate visual groups.
      // Fixed content heights prevent long reasons/paths from moving the table.
      this.reviewInfo=new Control(this.reviewPage);this.reviewInfo.sizer=new HorizontalSizer;this.reviewInfo.sizer.spacing=8;
      this.reviewInfoBar=new SectionBar(this.reviewPage,'Review information');this.reviewInfoBar.setSection(this.reviewInfo);
      this.reviewInfoBar.toolTip='Collapse or expand Reading the table and Selected image together. The window size and selected image are retained.';
      this.reviewInfoBar.toggleSection=()=>this.setReviewInfoCollapsed(!this.reviewInfoCollapsed);
      this.reviewGuide=sqrGroup(this.reviewInfo,'Reading the table');this.reviewGuide.setScaledFixedWidth(350);
      this.reviewLegend=new Label(this.reviewGuide);this.reviewLegend.useRichText=true;this.reviewLegend.wordWrapping=true;
      this.reviewLegend.text='<b>R1</b> Manual field &nbsp; · &nbsp; <b>R2</b> Manual with corners<br/><b>R3</b> Correlation &nbsp; · &nbsp; <b>R4</b> Rank of ranks<br/><b>Rank:</b> 1 = worst &nbsp; · &nbsp; <b>Score:</b> higher is better (0–1)<br/><b>Below-mean:</b> % of assessed indicators worse than mean<br/><b>*</b> Incomplete &nbsp; · &nbsp; <b>—</b> Unavailable';
      this.reviewLegend.toolTip='Click a selected row to deselect it. Click Reject or press Space to mark an original. Double-click an image to blink. Hover over REVIEW, Score or a rank for its full explanation.';
      this.reviewGuide.sizer.add(this.reviewLegend);this.reviewGuide.sizer.addStretch();
      this.detailsGroup=sqrGroup(this.reviewInfo,'Selected image');this.detailsGroup.sizer.spacing=4;
      this.details=new Label(this.detailsGroup);this.details.useRichText=true;this.details.setFixedHeight(2*this.font.height+4);
      this.detailMetrics=new Label(this.detailsGroup);this.detailMetrics.useRichText=true;this.detailMetrics.setFixedHeight(4*this.font.height+12);
      this.detailSource=new Label(this.detailsGroup);this.detailSource.useRichText=true;this.detailSource.setFixedHeight(this.font.height+4);
      this.detailsGroup.sizer.add(this.details);this.detailsGroup.sizer.add(this.detailMetrics);this.detailsGroup.sizer.add(this.detailSource);this.detailsGroup.sizer.addStretch();
      this.reviewInfo.sizer.add(this.reviewGuide);this.reviewInfo.sizer.add(this.detailsGroup,100);
      this.table.toolTip='Click a selected row to deselect it. Click Reject or press Space to mark an original. Double-click an image to blink. Hover over a cell for its explanation.';
      this.reviewPage.sizer=new VerticalSizer;this.reviewPage.sizer.margin=6;this.reviewPage.sizer.spacing=8;
      this.reviewPage.sizer.add(this.reviewOptions);this.reviewPage.sizer.add(this.table,100);this.reviewPage.sizer.add(this.reviewInfoBar);this.reviewPage.sizer.add(this.reviewInfo);
      this.viewer=new ImageView(this.blinkPage);this.viewer.setScaledMinSize(1280,320);this.viewer.setStatusMessage('Double-click a registered frame in the Review table.');
      sqrInstallPixelReadout(this.viewer,()=>this.frames?.[this.frame]||null);
      // ImageView normally fits on every reveal. Fit a newly loaded hidden
      // preview once its viewport is visible, then retain zoom on later tab visits.
      this.viewer.onShow=()=>{if(this.fitPreviewOnShow&&this.viewer.isValid){this.fitPreviewOnShow=false;this.viewer.zoomToFit();}this.viewer.scrollbox.viewport.update();};
      this.displaySTF=new CheckBox(this.blinkPage);this.displaySTF.text='Display STF';this.displaySTF.checked=o.displaySTF;
      this.alignBrightness=new CheckBox(this.blinkPage);this.alignBrightness.text='Align preview brightness';this.alignBrightness.checked=o.alignBrightness;
      this.alignBrightness.toolTip='Display-only background and contrast alignment. Turn off to compare transparency differences. Source pixels and quality measurements are unchanged.';
      this.reference=new ComboBox(this.blinkPage);for(let n of ['Filter master','Best scoring subframe','Rotate subframes (Review order)'])this.reference.addItem(n);this.reference.currentItem=Math.max(0,['master','best','sequence'].indexOf(o.reference));
      this.reference.toolTip='Compare with the filter master or best scoring kept subframe, or rotate through the visible subframes in Review order. Rotation follows the current sort direction and REVIEW-only filter, always skips the master, and wraps at the end.';
      this.reference.onItemSelected=()=>{if(this.running)return;if(this.reference.currentItem===2)this.regionRotation.currentItem=0;this.updateButtons();this.reloadBlink(true);this.syncOptions();};
      this.region=new ComboBox(this.blinkPage);for(let n of ['Usable field','Center','Top left','Top right','Bottom left','Bottom right'])this.region.addItem(n);
      this.region.onItemSelected=()=>this.reloadBlink(true);
      this.regionRotation=new ComboBox(this.blinkPage);for(let n of ['Off','Image only','Blink with reference'])this.regionRotation.addItem(n);
      this.regionRotation.currentItem=Math.max(0,['off','image','blink'].indexOf(o.regionRotation));this.normalizeRegionRotation();
      this.regionRotation.toolTip='Image only cycles Center, Top left, Top right, Bottom left and Bottom right, skipping Usable field; no reference is needed. Blink with reference includes Usable field and shows image then reference in each region before advancing. Rotation keeps the selected image and zoom. Choosing Rotate subframes switches region rotation off.';
      this.regionRotation.onItemSelected=()=>{if(this.running)return;this.normalizeRegionRotation();this.updateButtons();this.reloadBlink(true);this.syncOptions();};
      this.displaySTF.onCheck=this.alignBrightness.onCheck=()=>{if(this.current)this.inspect();};
      this.blinkInterval=sqrNumber(this.blinkPage,'Interval (s):',this.timer.interval,.1,10,2);this.blinkInterval.edit.setScaledFixedWidth(64);
      this.blinkInterval.toolTip='Time each image is displayed before switching: 0.10–10 seconds. Applies to blinking, subframe rotation and region rotation. Region blinking spends one interval on the image and one on its reference before advancing. Subframe rotation adds the time needed to load each image.';
      this.blinkInterval.onValueUpdated=value=>{this.setBlinkInterval(value);this.syncOptions();};
      this.play=sqrTool(this.blinkPage,':/icons/play.png','Start blinking.',()=>{if(this.blinking)this.stopBlink();else this.startBlink();});
      this.step=sqrTool(this.blinkPage,':/icons/step-forward.png','Pause and advance the preview.',()=>{this.stopBlink();this.advancePlayback();});
      this.frameLabel=new Label(this.blinkPage);this.frameLabel.text='No frame loaded';this.frameLabel.minHeight=2*this.font.height;this.frameLabel.wordWrapping=true;
      let referenceLabel=new Label(this.blinkPage);referenceLabel.text='Blink mode:';
      let rotationLabel=new Label(this.blinkPage);rotationLabel.text='Rotate regions:';
      let display=new HorizontalSizer;display.spacing=8;display.add(referenceLabel);display.add(this.reference);display.add(rotationLabel);display.add(this.regionRotation);display.add(this.region);display.add(this.displaySTF);display.add(this.alignBrightness);display.addStretch();display.add(this.blinkInterval);display.add(this.play);display.add(this.step);
      let decisions=new HorizontalSizer;decisions.spacing=8;
      this.previous=sqrButton(this.blinkPage,'Previous',()=>this.navigate(-1));this.next=sqrButton(this.blinkPage,'Next',()=>this.navigate(1));
      this.rejectButton=sqrButton(this.blinkPage,'Reject original',()=>this.decide(true));this.keepButton=sqrButton(this.blinkPage,'Keep original',()=>this.decide(false));
      decisions.add(this.previous);decisions.add(this.next);decisions.addStretch();decisions.add(this.keepButton);decisions.add(this.rejectButton);
      this.blinkPage.sizer=new VerticalSizer;this.blinkPage.sizer.margin=6;this.blinkPage.sizer.spacing=8;
      this.blinkPage.sizer.add(this.viewer,100);this.blinkPage.sizer.add(display);this.blinkPage.sizer.add(this.frameLabel);this.blinkPage.sizer.add(decisions);
      let histogramTools=new HorizontalSizer;histogramTools.spacing=10;
      let kpiLabel=new Label(this.histogramPage);kpiLabel.text='Quality indicator:';
      this.availableKPIs=[];this.kpiSelect=new ComboBox(this.histogramPage);this.kpiSelect.setScaledMinWidth(200);
      this.kpiSelect.onItemSelected=()=>{if(!this.updatingKPIs)this.updateHistogram();};
      this.fwhmSettings=sqrTool(this.histogramPage,':/icons/gear.png','FWHM grading',()=>this.editFWHMGrading());
      this.kpiDirection=new Label(this.histogramPage);this.kpiDirection.wordWrapping=true;histogramTools.add(kpiLabel);histogramTools.add(this.kpiSelect);histogramTools.add(this.kpiDirection,100);
      this.bortleControls=new Control(this.histogramPage);this.bortleControls.sizer=new HorizontalSizer;this.bortleControls.sizer.spacing=6;
      let bortleLabel=new Label(this.bortleControls);bortleLabel.text='Bortle class:';
      this.bortle=new ComboBox(this.bortleControls);this.bortle.editEnabled=false;this.bortle.addItem('—');
      for(let i=1;i<=9;++i)this.bortle.addItem(sqrBortleLabel(i));this.bortle.currentItem=sqrBortleOptions(o).bortleClass;this.bortle.setScaledFixedWidth(65);
      this.bortle.toolTip='Choose the Bortle class.';
      this.bortle.onItemSelected=()=>this.bortleChanged();this.bortleControls.sizer.add(bortleLabel);this.bortleControls.sizer.add(this.bortle);histogramTools.add(this.bortleControls);
      this.calibrateSkyButton=sqrButton(this.histogramPage,'Calibrate sky',()=>this.calibrateSky());this.calibrateSkyButton.toolTip='Calibrate sky background.';histogramTools.add(this.calibrateSkyButton);histogramTools.add(this.fwhmSettings);
      this.plotInfoButton=sqrTool(this.histogramPage,':/icons/info.png','Histogram information',()=>this.showPlotInformation());this.plotInfoButton.hide();histogramTools.add(this.plotInfoButton);
      let plotOrderLabel=new Label(this.histogramPage);plotOrderLabel.text='Order by:';
      this.histogramOrder=new ComboBox(this.histogramPage);this.histogramOrder.addItem('KPI value');this.histogramOrder.addItem('Acquisition time');
      this.histogramOrder.currentItem=o.histogramOrder==='time'?1:0;this.histogramOrder.setScaledMinWidth(150);
      this.histogramOrder.toolTip='';
      this.histogramOrder.onItemSelected=()=>this.updateHistogram();histogramTools.add(plotOrderLabel);histogramTools.add(this.histogramOrder);
      this.histogram=new WebView(this.histogramPage);this.histogram.setScaledMinSize(1280,320);
      this.histogram.toolTip='';
      this.plotGeneration=0;this.plotReady=false;this.plotDirty=false;this.plotRequestPending=false;
      this.plotTimer=new Timer(.15,true,this);
      this.plotTimer.onTimeout=()=>{
         let scatter=this.tabs.currentPageIndex===3;if(this.running||(!scatter&&this.tabs.currentPageIndex!==2))return;
         if(scatter?(!this.scatterReady||this.scatterRequestPending):(!this.plotReady||this.plotRequestPending))return;
         if(scatter)this.scatterRequestPending=true;else this.plotRequestPending=true;
         (scatter?this.scatter:this.histogram).evaluateScript('(function(){var selection=window.sqrSelection;window.sqrSelection=null;return selection?JSON.stringify(selection):null;})()');};
      this.histogram.onLoadFinished=ok=>{this.plotReady=ok&&!this.plotDirty;};
      this.histogram.onScriptResultAvailable=value=>{this.plotRequestPending=false;if(typeof value!=='string')return;
         try{this.selectPlotImage(JSON.parse(value));}catch(e){this.error(e);}};
      this.histogram.onShow=()=>this.plotTimer.start();this.histogram.onHide=()=>this.plotTimer.stop();
      this.histogramSummary=new Label(this.histogramPage);this.histogramSummary.wordWrapping=true;this.histogramSummary.minHeight=2*this.font.height;
      this.histogramPage.sizer=new VerticalSizer;this.histogramPage.sizer.margin=6;this.histogramPage.sizer.spacing=10;
      this.histogramPage.sizer.add(histogramTools);this.histogramPage.sizer.add(this.histogram,100);this.histogramPage.sizer.add(this.histogramSummary);
      let scatterTools=new HorizontalSizer;scatterTools.spacing=10;
      this.scatterKPIs=[];this.updatingScatterKPIs=false;
      this.scatterX=new ComboBox(this.scatterPage);this.scatterY=new ComboBox(this.scatterPage);
      for(let [control,label] of [[this.scatterX,'X axis:'],[this.scatterY,'Y axis:']]){
         let caption=new Label(this.scatterPage);caption.text=label;scatterTools.add(caption);
         control.setScaledMinWidth(230);scatterTools.add(control);
         control.onItemSelected=()=>{if(!this.updatingScatterKPIs){this.updateScatter();this.syncOptions();}};
      }
      this.scatterSwap=new PushButton(this.scatterPage);this.scatterSwap.text='Swap axes';
      this.scatterSwap.onClick=()=>{let x=this.scatterX.currentItem;this.scatterX.currentItem=this.scatterY.currentItem;this.scatterY.currentItem=x;this.updateScatter();this.syncOptions();};
      scatterTools.add(this.scatterSwap);scatterTools.addStretch();
      this.setScatterOptions(o);
      this.correlationSummary=new Label(this.scatterPage);this.correlationSummary.wordWrapping=true;
      this.correlationSummary.setScaledMinHeight(48);
      this.correlationSummary.styleSheet=this.correlationSummary.scaledStyleSheet('QLabel { font-size: '+(this.font.pointSize*1.35).toFixed(2)+'pt; font-weight: bold; background-color: #252536; color: #e8eaf6; border: 1px solid #585b70; border-left: 4px solid #89dceb; border-radius: 4px; padding: 8px 12px; }');
      this.scatter=new WebView(this.scatterPage);this.scatter.setScaledMinSize(1280,320);
      this.scatter.toolTip='Hover over a point for its image name and values. Click to select it in Review and measurements. Each point uses two measurements from the same image.';
      this.scatterGeneration=0;this.scatterReady=false;this.scatterDirty=false;this.scatterRequestPending=false;
      this.scatter.onLoadFinished=ok=>{this.scatterReady=ok&&!this.scatterDirty;};
      this.scatter.onScriptResultAvailable=value=>{this.scatterRequestPending=false;if(typeof value!=='string')return;
         try{this.selectPlotImage(JSON.parse(value),true);}catch(e){this.error(e);}};
      this.scatter.onShow=()=>this.plotTimer.start();this.scatter.onHide=()=>this.plotTimer.stop();
      this.scatterSummary=new Label(this.scatterPage);this.scatterSummary.wordWrapping=true;this.scatterSummary.minHeight=2*this.font.height;
      this.scatterPage.sizer=new VerticalSizer;this.scatterPage.sizer.margin=6;this.scatterPage.sizer.spacing=10;
      this.scatterPage.sizer.add(scatterTools);this.scatterPage.sizer.add(this.correlationSummary);this.scatterPage.sizer.add(this.scatter,100);this.scatterPage.sizer.add(this.scatterSummary);
      this.tabs.addPage(this.reviewPage,'Review and measurements');this.tabs.addPage(this.blinkPage,'Blink frame / reference');this.tabs.addPage(this.histogramPage,'Quality indicators');this.tabs.addPage(this.scatterPage,'Correlation plot');
      this.status=new Label(this);this.status.wordWrapping=true;this.status.minHeight=this.font.height;
      this.status.text='Scan files to verify original associations. Magnifier: measure. Green checkmark: move manually rejected originals.';
      this.scoreInclusionStatus=new Label(this);this.scoreInclusionStatus.wordWrapping=true;this.scoreInclusionStatus.minHeight=2*this.font.height;
      this.pixelScaleStatus=new Label(this);this.pixelScaleStatus.wordWrapping=true;this.pixelScaleStatus.minHeight=this.font.height;
      let messages=new VerticalSizer;messages.spacing=2;messages.add(this.status);messages.add(this.scoreInclusionStatus);messages.add(this.pixelScaleStatus);
      this.instance=sqrTool(this,':/process-interface/new-instance.png','Drag to save folder and evaluation settings as a process icon.');
      this.instance.onMousePress=()=>{Parameters.clear();Parameters.set('configJSON',JSON.stringify(this.savedOptions()));this.newInstance();};
      this.calculate=sqrTool(this,':/toolbar/view-zoom.png','Measure registered frames and rank review candidates.',()=>this.analyze());
      this.measureCornersButton=sqrTool(this,':/icons/grid.png','Measure corners: measure the center and four corners for all groups and matched masters. Reuse existing full-image and regional results; measure the full image only when its results are missing or invalidated.',()=>this.measureCornerRegions());
      this.reset=sqrTool(this,':/process-interface/reset.png','Reset evaluation and display settings. Folder paths are retained.',()=>this.resetSettings());
      this.moveButton=sqrTool(this,':/process-interface/execute.png','Review the move plan, then move only manually rejected original lights.',()=>this.moveRejected());
      this.undoMoveButton=sqrTool(this,':/icons/undo.png','Undo moved originals. Select a moved row to restore that file, or choose a move journal to restore several files, including after reopening the script.',()=>this.restoreRejected());
      this.closeButton=sqrTool(this,':/process-interface/cancel.png','Close the review. Measurements and pending decisions are kept only while this dialog is open.',()=>this.cancel());
      this.helpButton=sqrTool(this,':/process-interface/browse-documentation.png','Open the PIDoc user guide.',sqrShowDocumentation);
      let actions=new HorizontalSizer;actions.spacing=8;actions.add(this.instance);actions.add(this.calculate);actions.add(this.measureCornersButton);actions.add(this.reset);actions.addStretch();actions.add(this.moveButton);actions.add(this.undoMoveButton);actions.add(this.closeButton);actions.add(this.helpButton);
      // The action row stays visible while the body can scroll independently.
      // Its natural minimum no longer fixes the whole window at expanded height.
      this.bodyScroll=new ScrollBox(this);this.bodyScroll.autoScroll=false;this.bodyScroll.tracking=true;
      this.bodyScroll.horizontalScrollBarVisible=false;this.bodyScroll.verticalScrollBarVisible=false;
      this.bodyScroll.setScaledMinSize(900,400);this.body=new Control(this.bodyScroll.viewport);
      for(let control of [this.intro,this.inputsBar,this.inputs,this.qualityBar,this.settings,groupLabel,this.groupSelect,this.scanButton,this.tabs,this.status,this.scoreInclusionStatus,this.pixelScaleStatus]){
         control.parent=this.body;control.show();
      }
      let content=new VerticalSizer;content.spacing=8;content.add(this.intro);content.add(this.inputsBar);content.add(this.inputs);content.add(this.qualityBar);content.add(this.settings);content.add(this.groupRow);content.add(this.tabs,100);content.add(messages);this.body.sizer=content;
      this.sizer=new VerticalSizer;this.sizer.margin=10;this.sizer.spacing=8;this.sizer.add(this.bodyScroll,100);this.sizer.add(actions);
      this.bodyScroll.viewport.onResize=()=>this.layoutBody();
      this.body.onResize=()=>this.layoutBody();
      this.bodyScroll.onHorizontalScrollPosUpdated=()=>this.positionBody();this.bodyScroll.onVerticalScrollPosUpdated=()=>this.positionBody();
      this.onShow=()=>this.layoutBody();
      this.onClose=()=>{if(this.running)return false;this.plotTimer.stop();this.stopBlink();this.clearFrames();return true;};
      this.onHide=()=>{this.plotTimer.stop();this.stopBlink();};
      this.tabs.onPageSelected=()=>{this.stopBlink();this.plotTimer.stop();if(this.tabs.currentPageIndex===2)this.updateHistogram();else if(this.tabs.currentPageIndex===3)this.updateScatter();if(this.tabs.currentPageIndex===2||this.tabs.currentPageIndex===3)this.plotTimer.start();this.ensurePreview();this.layoutBody();};this.loadAutorun(false);if(this.session){this.syncOptions();if(this.session.groups.some(g=>g.rows.some(r=>r.metrics[0])))sqrRank(this.session);}this.populateGroups();this.updateButtons();
      this.setInputsCollapsed(o.inputsCollapsed);this.setQualityCollapsed(o.qualityCollapsed);this.setReviewInfoCollapsed(o.reviewInfoCollapsed);
      let available=this.availableScreenRect,scale=this.displayPixelRatio;
      // Hidden controls can report a zero smart minimum before first show.
      // Use a useful preferred width, then let the screen constrain both axes.
      this.resize(Math.min(1360*scale,available.width-40*scale),Math.min(1000*scale,available.height-80*scale));this.layoutBody();
   }
   positionBody(){if(this.body)this.body.move(-this.bodyScroll.horizontalScrollPosition,-this.bodyScroll.verticalScrollPosition);}
   // Reflow only the virtual contents. Section toggles keep the user's window
   // size, and scroll positions clamp when formerly hidden space disappears.
   layoutBody(){
      if(!this.body?.sizer||this.layingOutBody)return;this.layingOutBody=true;
      try{
         let scroll=this.bodyScroll,view=scroll.viewport;this.body.ensureLayoutUpdated();
         let minWidth=this.body.smartMinWidth,minHeight=this.body.smartMinHeight;
         // Account for viewport space consumed by a newly visible scrollbar.
         for(let pass=0;pass<2;++pass){scroll.horizontalScrollBarVisible=minWidth>view.width;scroll.verticalScrollBarVisible=minHeight>view.height;}
         let width=Math.max(view.width,minWidth),height=Math.max(view.height,minHeight);
         scroll.pageWidth=view.width;scroll.pageHeight=view.height;scroll.lineWidth=scroll.lineHeight=3*this.font.height;
         scroll.setHorizontalScrollRange(0,Math.max(0,width-view.width));scroll.setVerticalScrollRange(0,Math.max(0,height-view.height));
         this.body.resize(width,height);this.positionBody();
      }finally{this.layingOutBody=false;}
   }
   // Snapshot controls into serializable settings; derived measurements and
   // rejection decisions stay in the session and are never process parameters.
   options(){let o={...sqrDefaults(),...sqrFWHMOptions(this.fwhmOptions),bortleClass:this.bortle.currentItem,sqmReading:this.sqm.value,sqmTime:this.sqmTime.text.trim(),sqmTimeFromLog:!!this.sqmTimePreset&&this.sqmTime.text.trim()===this.sqmTimePreset};o.fwhmAperture=this.aperture.value;o.fwhmSeeing=this.seeing.value;for(let k of Object.keys(this.folders))o[k]=this.folders[k].edit.text.trim();
      for(let k of ['percent','patch','margin','minStars'])o[k]=this[k].value;o.rankOfRanks=this.rankScoring.checked;o.correlationOnly=this.correlationOnly.checked&&!o.rankOfRanks;for(let k of Object.keys(this.weights))o[k]=o.correlationOnly?this.manualWeights[k]:this.weights[k].value;
      o.skyScoreKPI=SQR_SKY_SCORE_CHOICES[this.skyScoreKPI.currentItem].key;
      o.measureCorners=this.useCornerMeasurements;o.reference=['master','best','sequence'][this.reference.currentItem];o.blinkInterval=this.blinkInterval.value;
      o.regionRotation=['off','image','blink'][this.regionRotation.currentItem];
      o.logFolder=this.logFolder.edit.text.trim();o.logTimeZone=['auto','offset'][this.logTimeZone.currentItem];o.logUTCOffset=this.logUTCOffset.value;
      o.guidingMode=['require','available','ignore'][this.guidingMode.currentItem];
      o.qualityCollapsed=this.qualityCollapsed;o.inputsCollapsed=this.inputsCollapsed;o.reviewInfoCollapsed=this.reviewInfoCollapsed;
      o.scatterX=sqrKPIKey(this.scatterKPIs[this.scatterX.currentItem]);o.scatterY=sqrKPIKey(this.scatterKPIs[this.scatterY.currentItem]);
      o.reviewOrder=SQR_REVIEW_SORTS[this.order.currentItem][0];o.reviewReverse=this.reviewReverse;
      o.maxFits=this.maxFits;o.displaySTF=this.displaySTF.checked;o.alignBrightness=this.alignBrightness.checked;o.histogramOrder=this.histogramOrder.currentItem===1?'time':'value';return o;}
   savedOptions(){let o=this.options();delete o.measureCorners;return o;}
   showPlotInformation(){if(this.running)return;let info=this.plotInformation;if(info)(new SQRPlotInfoDialog(info)).execute();}
   editSQMTime(){if(this.running||!this.sqm.value)return;let dialog=new SQRSQMTimeDialog(this.sqmTime.text,sqrSQMTimeSeed(this.session,this.current,this.autorunImagingStart));
      if(dialog.execute()){this.sqmTime.text=dialog.value();this.sqmTimeChanged();}}
   sqmTimeChanged(){if(this.sqmTime.text.trim()!==this.sqmTimePreset)this.sqmTimePreset='';this.bortleChanged();}
   // Replace an empty value or our untouched preset; never overwrite a manual
   // reading time. Remember ownership in saved settings so a new log folder
   // can update an inherited preset after reopening the script as well.
   applySQMTimePreset(){let current=this.sqmTime.text.trim();
      if(current&&current!==this.sqmTimePreset){this.sqmTimePreset='';return false;}
      let preset=this.autorunImagingStart?.text||'';this.sqmTime.text=preset;this.sqmTimePreset=preset;return current!==preset;
   }
   calibrateSky(){
      if(this.running||!this.group()||!sqrSkyComparisonEnabled(this.options()))return;this.stopBlink();this.busy(true);let abort=console.abortEnabled;console.abortEnabled=true;console.show();
      try{this.syncOptions();let c=sqrCalibrateSky(this.session,this.group(),text=>this.setStatus(text));this.setStatus(sqrSkyCalibrationText(c));}
      catch(e){this.group().skyCalibrationError=e.message||String(e);this.error(e);}finally{console.abortEnabled=abort;this.busy(false);this.updateHistogram();}
   }
   bortleChanged(){
      if(this.running)return;this.sqmTime.enabled=this.sqmTimePicker.enabled=this.sqm.value>0;this.syncOptions();this.updateHistogram();
      if(!sqrSkyComparisonEnabled(this.options())||!this.session?.groups.some(g=>g.rows.some(r=>r.metrics[0])))return;
      if(this.sqm.value>0&&sqrSQMTime(this.options(),this.session).time===null)return;
      // A changed comparison value only redraws the plot when calibration is
      // already available. Avoid flashing disabled controls for a cache hit.
      let pending=this.session.groups.some(g=>sqrSkyFilterSupported(g)&&g.rows.some(r=>r.metrics[0])&&!sqrCurrentSkyCalibration(this.session,g));
      if(!pending){for(let g of this.session.groups){let c=sqrCurrentSkyCalibration(this.session,g);if(c){g.skyCalibration=c;delete g.skyCalibrationError;}}return;}
      // SQM calibration only rescales cached means: no PSF fitting, catalog
      // query, image opening or modal busy transition is needed.
      if(this.sqm.value>0){try{let result=sqrAutoCalibrateSky(this.session);this.setStatus(sqrSkyCalibrationSummary(result).trim());}
         catch(e){this.error(e);}finally{this.updateHistogram();}return;}
      this.stopBlink();this.busy(true);let abort=console.abortEnabled;console.abortEnabled=true;console.show();
      try{let result=sqrAutoCalibrateSky(this.session,s=>this.setStatus(s));this.setStatus(sqrSkyCalibrationSummary(result).trim()||'No measured broadband group is available for sky calibration.');}
      catch(e){this.error(e);}finally{console.abortEnabled=abort;this.busy(false);this.updateHistogram();}
   }
   editFWHMGrading(){if(this.running)return;let dialog=new SQRFWHMDialog(this.fwhmOptions,sqrSessionPixelScale(this.session),this.group()?.filter);if(dialog.execute())this.applyFWHMGrading(dialog.options());}
   // Only plot settings change: do not invalidate measurements or rerank.
   applyFWHMGrading(options){this.fwhmOptions=sqrFWHMOptions(options);this.aperture.setValue(this.fwhmOptions.fwhmAperture);this.fwhmOptions.fwhmAperture=this.aperture.value;this.seeing.setValue(this.fwhmOptions.fwhmSeeing);this.syncOptions();this.updateHistogram();}
   updateCornerControls(){this.patch.enabled=true;let available=sqrHasCornerMeasurements(this.session);
      if(!available)this.useCornerMeasurements=false;
      this.cornerScoring.checked=this.useCornerMeasurements;this.cornerScoring.enabled=available&&!this.running;
      this.updateScoreWeightControls();}
   toggleCornerScoring(){
      if(this.running)return;
      this.useCornerMeasurements=this.cornerScoring.checked&&sqrHasCornerMeasurements(this.session);
      this.updateCornerControls();this.rerank();
      this.status.text=this.useCornerMeasurements?'Corner measurements included in Score. Existing results reused.':'Field-only scoring active. Corner measurements retained; no remeasurement.';
   }
   measureCornerRegions(){
      if(this.running||!this.session||this.scanRequired)return;
      this.analyze(true);
   }
   // Keep saved manual values independent of the displayed effective 0/1 weights.
   toggleCorrelationScoring(){
      if(this.correlationOnly.checked){this.rankScoring.checked=false;for(let k of Object.keys(this.weights))this.manualWeights[k]=this.weights[k].value;}
      else for(let k of Object.keys(this.weights))this.weights[k].setValue(this.manualWeights[k]);
      this.rerank();
   }
   toggleRankScoring(){
      if(this.rankScoring.checked&&this.correlationOnly.checked){this.correlationOnly.checked=false;for(let k of Object.keys(this.weights))this.weights[k].setValue(this.manualWeights[k]);}
      this.rerank();
   }
   updateScoreWeightControls(){
      let auto=this.correlationOnly.checked,selection=this.groupSelect?this.group()?.correlationScoring:null;
      let fallback=auto&&selection?.available===false;
      let activeScore=this.rankScoring.checked?'R4 · rank of ranks':auto&&!fallback?'R3 · strongly correlated KPIs':this.useCornerMeasurements?'R2 · manual weights, with corners':'R1 · manual weights, field only';
      if(fallback)activeScore+=' (R3 unavailable)';
      this.scoreModeStatus.text='<b>Current Score: '+activeScore+'</b>';
      for(let [k,control] of Object.entries(this.weights)){
         if(auto)control.setValue(fallback?this.manualWeights[k]:selection?.weights[k]??0);
         control.enabled=!auto&&(k!=='cornerWeight'||this.useCornerMeasurements)&&(k!=='guideWeight'||this.guidingMode?.currentItem!==2);
      }
      // This report stays visible on every tab, even with Quality evaluation
      // collapsed. It follows the current group and each fresh correlation pass.
      if(this.scoreInclusionStatus){
         let mode='Score: '+activeScore+'.';
         this.scoreInclusionStatus.text=mode+(selection?selection.available?' R3 KPIs (equal weights): '+selection.components.filter(c=>c.included).map(c=>c.label).join(', '):' No strongly correlated KPIs. R3 unavailable.':' R3/R4: pending measurements.');
         this.scoreInclusionStatus.toolTip=(this.rankScoring.checked?'R4 averages normalized available ranks, omitting R2 when corner scoring is off. Manual weights still control R1 and R2.\n':'')+sqrScoreCorrelationReport(selection);
      }
   }
   // Visibility also depends on ancestors: before the dialog is shown, every
   // child reports hidden. Persist the requested state independently, and set
   // the body visibility explicitly when restoring a saved process instance.
   // SectionBar normally calls dialog.adjustToContents(), resizing the window.
   // Our toggles reflow the virtual body without resizing the window itself.
   setQualityCollapsed(collapsed){this.qualityCollapsed=!!collapsed;this.settings.visible=!this.qualityCollapsed;this.qualityBar.updateIcon();this.layoutBody();this.syncOptions();}
   setInputsCollapsed(collapsed){this.inputsCollapsed=!!collapsed;this.inputs.visible=!this.inputsCollapsed;this.inputsBar.updateIcon();this.layoutBody();this.syncOptions();}
   setReviewInfoCollapsed(collapsed){this.reviewInfoCollapsed=!!collapsed;this.reviewInfo.visible=!this.reviewInfoCollapsed;this.reviewInfoBar.updateIcon();this.layoutBody();this.syncOptions();}
   syncOptions(){if(this.session)this.session.options=this.options();}
   group(){return this.session?.groups[this.groupSelect.currentItem]||null;}
   updatePixelScale(){let s=sqrSessionPixelScale(this.session);this.pixelScaleStatus.text=sqrPixelScaleText(s);
      this.guideHint.text=sqrGuideThresholdText(sqrGuidingScale(s));
      this.guideHint.toolTip='Category thresholds in arcseconds, derived from the image scale. Medium includes its upper boundary. For unequal X/Y scales, the smaller available scale is used.';
      this.weights.guideWeight.toolTip='Relative Score weight for guiding. Composite error = (minimum + 2 × average + maximum) / 4, in arcseconds. '+this.guideHint.text+'. Zero disables guiding in Score. Missing or incomplete data never counts as zero error.';
      this.pixelScaleStatus.toolTip='Shared nominal scale across all filters, from master focal length and effective pixel size, including binning.\n'+
         'Scale (arcsec/pixel) = 206.264806 × pixel size (µm) / focal length (mm).\n'+
         s.masters.map(m=>'Master: '+m.path+'\nFocal length: '+sqrFmt(m.focalLength,3)+' mm · Pixel size X/Y: '+sqrFmt(m.pixelSizeX,3)+' / '+sqrFmt(m.pixelSizeY,3)+' µm'+(m.error?'\n'+m.error:'')).join('\n')+
         (s.missingCamera.length?'\nMissing camera identity in '+s.missingCamera.length+' image(s):\n'+s.missingCamera.slice(0,10).join('\n')+(s.missingCamera.length>10?'\n…':''):'')+
         '\nScan files again to refresh the metadata and camera check.';}
   // sqrTick pumps events once after notifying us, retaining progress and abort
   // handling without a second redraw/event dispatch for every status change.
   setStatus(s){if(this.status.text!==s)this.status.text=s;}
   error(e){this.status.text='Error: '+(e.message||String(e));new MessageBox(this.status.text,'Subframe Quality Review',StdIcon.Error,StdButton.Ok).execute();}
   isRegionRotating(){return this.regionRotation?.currentItem>0;}
   isRotating(){return this.reference?.currentItem===2&&!this.isRegionRotating();}
   // Region and subframe rotation are alternatives. Restore a usable comparison
   // reference when entering regional playback from the subframe sequence.
   normalizeRegionRotation(){if(this.isRegionRotating()&&this.reference.currentItem===2)this.reference.currentItem=1;if(this.regionRotation.currentItem===1&&this.region.currentItem===0)this.region.currentItem=1;}
   rotationRows(){return (this.visibleRows||[]).filter(r=>!r.isMaster);}
   updateBlinkButton(){if(this.play){this.play.icon=this.scaledResource(this.blinking?':/icons/media-stop.png':':/icons/play.png');
      let interval=this.timer.interval.toFixed(2);
      this.play.toolTip=this.blinking?'Stop playback.':this.isRegionRotating()?(this.regionRotation.currentItem===1?'Rotate Center and the four corners every '+interval+' seconds, skipping Usable field.':'Show the selected image and reference for '+interval+' seconds each, then advance to the next region.'):this.isRotating()?'Rotate through subframes in Review order, skipping the master. Each image is shown for '+interval+' seconds before loading the next.':'Start blinking the selected image and reference every '+interval+' seconds.';
      this.step.toolTip=this.isRegionRotating()?(this.regionRotation.currentItem===1?'Pause and show the next region of this image.':'Pause and advance one step: image, reference, then next region.'):this.isRotating()?'Pause and show the next subframe in Review order. The master is skipped.':'Pause and switch frame / reference.';}}
   // One timer drives every playback mode. In regional blink mode a complete
   // image/reference pair is shown before advancing the region, with wraparound.
   advancePlayback(){
      if(this.running)return;
      if(this.isRotating()){this.navigate(1);return;}
      if(!this.frames)return;
      if(this.isRegionRotating()&&(this.regionRotation.currentItem===1||this.frame===1)){
         let next=(this.region.currentItem+1)%this.region.numberOfItems;this.region.currentItem=this.regionRotation.currentItem===1&&next===0?1:next;
         if(!this.inspect(true,true,this.blinking))return;
      }else this.showFrame(1-this.frame);
      if(this.blinking)this.timer.start();
   }
   // Restart the current dwell time without reloading images, changing selection,
   // toggling controls, or disturbing zoom/pan and the active Stop symbol.
   setBlinkInterval(value){this.timer.stop();this.blinkInterval.setValue(sqrBlinkInterval(value));this.timer.interval=this.blinkInterval.value;
      if(this.blinking&&!this.running)this.timer.start();this.updateBlinkButton();}
   startBlink(){
      if(this.running)return;
      if(this.isRotating()){
         if(this.rotationRows().length<2){this.stopBlink();return;}
         if((!this.frames||!this.rotationRows().includes(this.current))&&!this.inspect(true,true))return;
      }else if(this.isRegionRotating()){
         if(this.regionRotation.currentItem===1&&this.region.currentItem===0){this.region.currentItem=1;if(!this.inspect(true,true))return;}
         else if(!this.frames&&!this.inspect(true,true))return;
      }
      if(this.frames){this.blinking=true;this.updateBlinkButton();this.timer.start();}
   }
   stopBlink(){this.blinking=false;this.timer.stop();this.updateBlinkButton();}
   // Stop the timer before releasing its bitmaps. Navigation can retain the
   // ImageView transform while replacing pixels by passing resetView=false.
   // Preview reloads can pause only the timer, keeping the Stop icon steady.
   clearFrames(resetView=true,preserveRotation=false,preservePlayback=false,preserveRegions=false){if(preservePlayback)this.timer.stop();else this.stopBlink();if(!preserveRotation)this.rotationDisplay=null;if(resetView){this.viewer.reset();this.viewer.clearPixelReadout();this.fitPreviewOnShow=false;this.savedPreviewView=null;}if(this.frames&&!this.framesFromRegions)for(let b of this.frames)if(b!==this.referenceDisplay?.data?.bitmap)b.clear();this.frames=null;this.framesFromRegions=false;this.loadedReference=null;if(!preserveRegions)this.clearRegionFrames();
      // Navigation keeps the single reference. Reset/close and other playback
      // modes release it after any borrowed frame array has been detached.
      if(resetView||preserveRotation||preserveRegions)this.clearReferenceDisplay();}
   clearReferenceDisplay(){if(this.referenceDisplay?.data)this.referenceDisplay.data.bitmap.clear();this.referenceDisplay={};}
   // Regional views borrow cached bitmaps. Release each exactly once when the
   // image, reference, geometry, display settings or playback mode changes.
   clearRegionFrames(){if(this.regionFrames)for(let pair of this.regionFrames)for(let frame of pair)frame.clear();this.regionFrames=null;this.regionFramesKey='';}
   // A hidden tab can still have a provisional viewport size. Refit only this
   // initial view when it becomes visible; navigation keeps the established view.
   fitPreview(){this.fitPreviewOnShow=!this.viewer.visible;this.viewer.zoomToFit();}
   // Deselecting clears the displayed bitmap, but a following selection (including
   // the click sequence of a double-click) can still restore its view. Derive zoom
   // from the public coordinate mapping rather than reading ImageView internals.
   previewTransform(){if(!this.viewer.isValid)return this.savedPreviewView||null;
      let scale=this.viewer.imageToViewport(1,0).x-this.viewer.imageToViewport(0,0).x;
      return {zoom:scale>=1?Math.round(scale):-Math.round(1/scale),x:this.viewer.scrollbox.horizontalScrollPosition,y:this.viewer.scrollbox.verticalScrollPosition,fitOnShow:this.fitPreviewOnShow};}
   setPreviewImage(bitmap,keepView){
      if(keepView&&this.viewer.isValid)this.viewer.regenerate(bitmap);
      else{this.viewer.setImage(bitmap);let saved=keepView?this.savedPreviewView:null;
         if(saved){this.viewer.regenerate(null,saved.zoom);this.viewer.scrollbox.horizontalScrollPosition=saved.x;this.viewer.scrollbox.verticalScrollPosition=saved.y;this.fitPreviewOnShow=saved.fitOnShow;}
         else this.fitPreview();}
      this.savedPreviewView=null;
   }
   // ImageView owns a separate bitmap copy. Retain its transform while releasing
   // the old frame cache; the next load replaces its pixels at the same zoom/pan.
   selectRow(row){let changed=this.current!==row;if(changed)this.clearFrames(false);this.current=row;this.selectionCleared=false;
      this.updateDetails();this.updateButtons();if(changed&&this.histogram)this.updatePlots();if(changed)this.ensurePreview();}
   clearSelection(){let view=this.previewTransform();this.clearFrames();this.savedPreviewView=view;this.current=null;this.selectionCleared=true;this.populating=true;
      this.table.deselectAllNodes();this.populating=false;this.updateDetails();this.updateButtons();this.updatePlots();}
   ensurePreview(){if(!this.running&&this.tabs.currentPageIndex===1&&!this.frames&&this.group()?.regions&&(this.isRotating()?this.rotationRows().length:this.current?.metrics[0]))this.inspect(false);}
   // Compare the data behind an existing preview before/after measurement.
   // A new ROI, changed file signature, selected row or best reference makes
   // it stale. Re-ranking identical results must not reload/stretch the images.
   measurementPreviewSignature(useLoaded=false){let g=this.group();if(!g)return '';
      let noReference=this.isRotating()||(this.isRegionRotating()&&this.regionRotation.currentItem===1);
      let reference=noReference?'':useLoaded&&this.frames?this.loadedReference?.path||'':sqrReference(g,this.options().reference).path;
      return JSON.stringify([g.measureSignature,g.masterRow?.measureSignature,this.current?.registered.path,g.regions,reference]);}
   loadAutorun(refresh=true){
      if(this.running)return;
      this.autofocusRuns=[];this.autorunFiles=[];this.guideFiles=[];this.ignoredAutorunCHN=0;this.autorunError='';this.loadedLogFolder=this.logFolder.edit.text.trim();
      if(this.loadedLogFolder)try{let loaded=sqrReadLogFolder(this.loadedLogFolder);this.autorunFiles=loaded.files;this.guideFiles=loaded.guideFiles;this.ignoredAutorunCHN=loaded.ignoredCHN;}
      catch(e){this.autorunError='Cannot read log folder: '+(e.message||String(e));}
      this.autorunImagingStart=sqrAutorunImagingStart(this.autorunFiles);let presetChanged=this.applySQMTimePreset();
      this.parsedGuideLog=sqrParseGuideFiles(this.guideFiles);
      this.parseAutorun(refresh);
      if(refresh&&presetChanged&&this.sqm.value>0)this.bortleChanged();
   }
   // A unique inferred offset becomes the editor's default. Unknown or multiple
   // offsets have no single numeric representation; keep the evidence in the
   // tooltip and show a dash, without changing the clock conversion itself.
   updateLogOffsetControls(){
      let manual=this.logTimeZone.currentItem===1,clock=this.logClock;
      this.logUTCOffset.enabled=manual&&!this.running;
      this.settingLogOffset=true;
      try{
         if(manual)this.logUTCOffset.setValue(this.logUTCOffset.value);
         else if(clock?.offsets.length===1)this.logUTCOffset.setValue(clock.offsets[0]/3600000);
         else this.logUTCOffset.edit.text='—';
      }finally{this.settingLogOffset=false;}
      let detail=clock?clock.mode==='offset'?'Custom offset applied to both Autorun and PHD2 logs.':
         clock.anchors.length+' image timestamps support the offset; '+clock.endNames+' filenames use exposure completion; '+clock.unresolved+' unresolved image timestamps. Logs and SQM reading time use this same conversion.':
         'Scan images to infer local time minus UTC from image filenames and UTC metadata, or select a custom UTC offset.';
      if(clock?.offsets.length)detail=sqrClockText(clock)+'\n'+detail;
      if(!manual)detail+='\nA single inferred offset fills this field. Select Custom UTC offset to edit it.';
      if(!manual&&(!clock||clock.offsets.length!==1))detail+='\nNo single inferred value is available; the field shows a dash. Multiple offsets, when known, are still applied to their matching exposures.';
      this.logUTCOffset.toolTip='Local log/SQM time minus UTC, in hours (for example +2 or +5.5).\n'+detail;
   }
   // Convert both log types with the same camera-derived clock. Guide CSV is
   // cached; rematching/ranking never repeats PSF measurements or pixel reads.
   parseAutorun(refresh=true){
      let zone=['auto','offset'][this.logTimeZone.currentItem],clock=sqrInferLogClock(this.session,zone,this.logUTCOffset.value);
      let result=sqrParseAutorunFiles(this.autorunFiles,wall=>sqrLocalToUTC(wall,clock));
      this.logClock=clock;this.updateLogOffsetControls();
      let hadGuiding=!!this.session?.guiding?.enabled;
      this.syncOptions();sqrApplyGuiding(this.session,this.parsedGuideLog,clock,this.guideFiles.length>0);
      if(this.session&&(hadGuiding||this.guideFiles.length)&&this.session.groups.some(g=>g.rows.some(r=>r.metrics[0])))sqrRank(this.session);
      result.ignoredCHN=this.ignoredAutorunCHN;this.autofocusRuns=result.runs;this.autorunResult=result;
      let measured=this.session?.groups.flatMap(g=>g.rows).filter(r=>r.guiding?.scorable).length||0;
      this.autorunStatus.text=this.autorunError?'Log folder could not be read.':!this.loadedLogFolder?'No log folder selected.':
         result.files.length+' Autorun · '+result.runs.length+' AF · '+this.guideFiles.length+' PHD2 · guiding: '+measured+'/'+(this.session?.groups.reduce((n,g)=>n+g.rows.length,0)||0)+' frames';
      this.autorunStatus.toolTip=this.autorunError||'Ignored '+result.ignoredCHN+' _CHN translations; '+result.duplicates+' duplicate autofocus starts merged; '+result.invalid+' unresolved/invalid autofocus times; '+result.errors+' Autorun read errors. PHD2: '+this.parsedGuideLog.errors+' read errors; '+this.parsedGuideLog.invalid+' invalid rows; '+(this.session?.guiding?.duplicates||0)+' duplicate samples merged; '+(this.session?.guiding?.conflicts||0)+' conflicts; '+(this.session?.guiding?.unresolved||0)+' sections with unresolved clocks. Hover over guiding measurements for coverage and quality details.';
      this.autorunReport=this.loadedLogFolder?sqrAutofocusReport(this.loadedLogFolder,result,zone,this.logUTCOffset.value,this.autorunError,'Local log time → UTC: '+sqrClockText(clock)):'';
      this.autorunTimes.enabled=!!this.loadedLogFolder&&!this.running;
      if(this.autorunReport&&this.autorunReport!==this.reportedAutorunText)console.writeln('<end><cbr><b>Extracted autofocus start times</b>\n'+sqrHTML(this.autorunReport));
      this.reportedAutorunText=this.autorunReport;
      if(refresh&&this.histogram)this.populateRows(false);
   }
   showAutofocusTimes(){
      if(!this.autorunReport)return;
      let dialog=new Dialog;dialog.windowTitle='Extracted autofocus start times';
      let text=new TextBox(dialog);text.readOnly=true;text.setScaledMinSize(760,280);text.text=sqrHTML(this.autorunReport);
      let close=sqrButton(dialog,'Close',()=>dialog.ok()),buttons=new HorizontalSizer;buttons.addStretch();buttons.add(close);
      dialog.sizer=new VerticalSizer;dialog.sizer.margin=10;dialog.sizer.spacing=8;dialog.sizer.add(text,100);dialog.sizer.add(buttons);dialog.adjustToContents();dialog.execute();
   }
   invalidate(){if(this.running)return;this.session=null;this.scanRequired=true;this.useCornerMeasurements=false;this.current=null;this.clearFrames();this.updateCornerControls();this.parseAutorun(false);this.populateGroups();this.status.text='Folder selection changed. Scan files again.';}
   // Geometry/measurement changes invalidate metrics and derived scores, but
   // keep original associations and the user's manual rejection decisions.
   invalidateMeasurements(){
      if(this.running)return;
      let hadCorners=sqrHasCornerMeasurements(this.session);this.useCornerMeasurements=false;
      if(this.session){for(let g of this.session.groups){g.measureSignature='';g.correlationScoring=null;delete g.transparencyCatalogue;g.transparencySummary='';g.skyQualitySummary='';for(let r of sqrGroupRows(g)){r.measureSignature='';r.metrics={};delete r.transparencyPhotometry;r.relativeTransparency=null;r.transparencyInfo=null;r.skyQuality=null;r.skyQualityInfo=null;delete r.skyQualityModes;delete r.backgroundMeans;r.skyBackground=null;r.score=null;r.scoreWithoutCorners=null;r.scoreWithCorners=null;r.scoreCorrelated=null;r.rankCorrelated=null;r.scoreRankOfRanks=null;r.rankOfRanks=null;r.rankComponents=[];r.rankOfRanksDetail='';r.rankWithoutCorners=null;r.rankWithCorners=null;r.candidate=false;r.reasons=[];r.dataReviewReasons=[];r.mainIssue='';r.mainIssueDetail='';r.scoreContributions=[];r.cornerSeverity=null;r.measuredCornerSeverity=null;r.worstCorner='';r.belowMeanCount=null;r.belowMeanFraction=null;r.belowMeanFieldFraction=null;r.belowMeanCornerFraction=null;r.belowMeanAvailable=0;r.belowMeanTotal=0;r.belowMeanComplete=false;r.belowMeanDetail='';}}}
      this.updateCornerControls();this.syncOptions();this.clearFrames();this.populateRows();
      this.status.text='Measurement settings changed.'+(hadCorners?' Corner measurements were cleared.':'')+' Click Measure corners beside the magnifier to measure the previews, or use the magnifier for field measurements.';
   }
   rerank(){if(this.running)return;if(!this.session){this.updateScoreWeightControls();this.updateHistogram();return;}try{this.syncOptions();for(let g of this.session.groups)for(let r of sqrGroupRows(g))r.guidingIgnored=sqrIgnoreGuiding(r,this.session.options);if(this.session.groups.some(g=>g.rows.some(r=>r.metrics[0])))sqrRank(this.session);this.populateRows();}catch(e){this.error(e);}}
   busy(value){this.running=value;for(let c of [...this.inputControls,this.inputsBar,this.qualityBar,this.settings,this.scanButton,this.groupSelect,this.tabs,this.instance,this.calculate,this.measureCornersButton,this.reset,this.moveButton,this.undoMoveButton,this.closeButton,this.helpButton])c.enabled=!value;this.updateLogOffsetControls();this.autorunTimes.enabled=!value&&!!this.loadedLogFolder;this.updateButtons();}
   // Override only the face color. PixInsight supplies the standard border,
   // font and interactive states; clearing the style restores its normal face.
   updateScanButton(){
      let needed=this.scanRequired||!this.session,highlight=needed&&!this.running;
      if(this.scanHighlighted!==highlight){
         this.scanHighlighted=highlight;
         this.scanButton.styleSheet=highlight?'QPushButton { background-color: #b9c6d0; }':'';
      }
      this.scanButton.toolTip=needed?'Scan required: select the WBPP output and original-light root, then click to scan files.':'Files scanned. Click to refresh the file list and original associations.';
   }
   updateButtons(){let ready=!!this.session&&!this.running,selected=!!this.current,original=selected&&!this.current.isMaster&&!this.current.moved;
      this.updateScanButton();
      this.calculate.enabled=this.measureCornersButton.enabled=ready&&!this.scanRequired;
      if(this.plotInfoButton)this.plotInfoButton.enabled=!this.running&&!!this.plotInformation;
      if(this.sqmTime)this.sqmTime.enabled=this.sqmTimePicker.enabled=!this.running&&this.sqm.value>0;
      if(this.calibrateSkyButton)this.calibrateSkyButton.enabled=ready&&sqrSkyComparisonEnabled(this.options())&&!!this.group()&&sqrSkyFilterSupported(this.group())&&
         (!this.sqm.value||sqrSQMTime(this.options(),this.session).time!==null);
      this.cornerScoring.enabled=!this.running&&sqrHasCornerMeasurements(this.session);
      this.reference.enabled=!this.running&&this.regionRotation.currentItem!==1;this.regionRotation.enabled=!this.running;
      // A typed or browsed destination enables file actions without rescanning.
      // Whitespace is empty; the move preflight still validates the actual path.
      let destinationSet=!!this.folders.destination.edit.text.trim(),scanned=!!this.session&&!this.scanRequired;
      let pending=!!this.session?.groups.some(g=>g.rows.some(r=>r.reject&&!r.moved));
      this.moveButton.enabled=!this.running&&scanned&&destinationSet&&pending;
      this.undoMoveButton.enabled=!this.running&&scanned&&destinationSet;
      let unavailable=!destinationSet?'Choose a folder in Rejected originals under Input files and observing conditions.':
         !scanned?'Scan files successfully first.':this.running?'Wait for the current operation to finish.':'';
      this.moveButton.toolTip=unavailable?'Move rejected originals: '+unavailable:!pending?'Mark at least one original as rejected, then click here to review the move plan.':'Review the move plan, then move only manually rejected original lights to the Rejected originals folder.';
      this.undoMoveButton.toolTip=unavailable?'Undo moved originals: '+unavailable:'Undo moved originals. Select a moved row to restore that file, or choose a move journal to restore several files, including after reopening the script.';
      let rotation=this.isRotating(),count=rotation?this.rotationRows().length:0,canRotate=ready&&!!this.group()?.regions;
      this.play.enabled=rotation?canRotate&&count>1:!!this.frames&&!this.running;
      this.step.enabled=rotation?canRotate&&count>0:!!this.frames&&!this.running;
      this.rejectButton.enabled=this.keepButton.enabled=ready&&original;
      this.previous.enabled=this.next.enabled=rotation?canRotate&&count>0:ready&&selected;
      this.updateBlinkButton();
      this.sortDirection.enabled=ready&&this.visibleRows?.length>1;}
   populateGroups(){this.selectionCleared=false;this.groupSelect.clear();for(let g of this.session?.groups||[])this.groupSelect.addItem((g.filter||'Group')+' · '+g.exposure+' s · '+g.rows.length+' frames — '+g.directoryName);
      if(this.groupSelect.numberOfItems)this.groupSelect.currentItem=0;this.populateRows();}
   // Sort presentation only: retain selection, decisions, measurements and the
   // existing blink frames. The next/previous controls use the rebuilt row order.
   changeReviewSort(){
      if(this.running)return;
      this.syncOptions();this.populateRows(false);
      // TreeBox needs its native node-scrolling method to expose the new start.
      if(this.table.numberOfChildren)this.table.setNodeAtViewportTop(this.table.child(0));
   }
   // Rebuild native nodes while preserving row-object selection. Respect an
   // explicit deselection, or choose a visible fallback if a filter hides it.
   populateRows(loadPreview=true){
      this.populating=true;this.table.clear();this.reviewNodes=new Map;let g=this.group();
      // Append only corner KPIs that actually contribute. Keep every established
      // column index stable for selection, rejection, tooltips and saved sorting.
      let extraKPIs=(this.correlationOnly.checked||this.rankScoring.checked)&&this.useCornerMeasurements?g?.correlationScoring?.components.filter(c=>c.corner&&c.included)||[]:[];
      this.table.numberOfColumns=this.baseReviewColumnCount+extraKPIs.length;
      for(let i=0;i<extraKPIs.length;++i)this.table.setHeaderText(this.baseReviewColumnCount+i,extraKPIs[i].label+(extraKPIs[i].metric==='fwhm'?' (px)':''));
      this.updatePixelScale();this.updateScoreWeightControls();
      let mode=SQR_REVIEW_SORTS[this.order.currentItem][0],rows=sqrReviewRows(g,this.candidatesOnly.checked,mode,this.reviewReverse);
      this.visibleRows=rows;
      let descending=[3,4,9,10,11,12,14].includes(mode)!==this.reviewReverse;
      this.sortDirection.text=descending?'Descending ↓':'Ascending ↑';
      let directions=this.reviewReverse?
         ['Highest first (best first)','Highest first (best first)','Most first (best first)','Smallest first (best first)','Lowest first (best first)','Z to A','Highest rank first (best first)','Highest rank first (best first)','Latest first · undated frames next · master last','Lowest % first · incomplete last']:
         ['Lowest first (worst first)','Lowest first (worst first)','Fewest first (worst first)','Largest first (worst first)','Highest first (worst first)','A to Z','Rank 1 first (worst first)','Rank 1 first (worst first)','Earliest first · undated frames next · master last','Highest % first · incomplete last'];
      let guideDirection=(this.reviewReverse?'Smallest error first (best first)':'Largest error first (worst first)')+' · unavailable next · master last';
      this.sortDirection.toolTip=([13,15].includes(mode)?(this.reviewReverse?'Highest rank first (best first)':'Rank 1 first (worst first)'):mode===14?(this.reviewReverse?'Lowest background first (best first)':'Highest background first (worst first)')+' · unavailable last':mode>=10?guideDirection:directions[mode])+'. Click to reverse the order. Sorting preserves the selected image and rejection decisions.';
      this.reviewSummary.text=g?'Showing '+rows.filter(r=>!r.isMaster).length+' of '+g.rows.length+' subframes · '+g.rows.filter(r=>r.candidate).length+' REVIEW candidates'+(g.master?(this.candidatesOnly.checked?' · master hidden by filter':' · master included for comparison'):''):'Scan files to populate the review list.';
      let kpiCell=(value,digits=3)=>Number.isFinite(value)?sqrFmt(value,digits):'—';
      let correlationReport=sqrScoreCorrelationReport(g?.correlationScoring);
      if(g)for(let r of rows){let node=new TreeBoxNode(this.table);node.row=r;this.reviewNodes.set(r,node);if(!r.isMaster&&!r.moved)node.setIcon(4,this.rejectIcons[r.reject?1:0]);
         let scoreInfo=kpi=>r.isMaster?SQR_MASTER_SCORE_INFO:sqrKPIScoreInfo(kpi,this.session.options,!!this.session.guiding?.enabled,g.correlationScoring);
         let guideReport=sqrGuideReport(r)+(r.guiding&&!r.guiding.scorable?'\n* Partial/unusable for Score.'+(r.guidingIgnored?'':' Inspect manually.'):'');
         let m=r.metrics[0]||{},cells=[r.rankWithoutCorners===null||r.rankWithoutCorners===undefined?'—':String(r.rankWithoutCorners),r.rankWithCorners===null||r.rankWithCorners===undefined?'—':String(r.rankWithCorners),Number.isFinite(r.rankCorrelated)?String(r.rankCorrelated):'—',Number.isFinite(r.rankOfRanks)?String(r.rankOfRanks):'—',r.isMaster?'—':r.moved?'Moved':'',r.isMaster?'Master':r.candidate?'REVIEW':'',sqrFileName(r.registered.path),sqrAcquisitionText(r),sqrFmt(r.score,3),sqrFmt(m.signal),sqrFmt(m.fwhm,1),Number.isFinite(m.stars)?String(m.stars):'—',r.mainIssue||'—',kpiCell(sqrEccentricityValid(m)?m.eccentricity:null),kpiCell(sqrKPIValue(r,SQR_KPIS.find(k=>k.key==='cornerSeverity'))),sqrMeanQualityLabel(r),(Number.isFinite(r.guideQuality)?sqrGuideNumber(r.guideQuality):'—'),sqrGuideCell(r,'guideAvg'),sqrGuideCell(r,'guideMin'),sqrGuideCell(r,'guideMax'),r.worstCorner||'—',r.match,Number.isFinite(r.skyBackground)?sqrFmt(r.skyBackground,6):'—',Number.isFinite(r.relativeTransparency)?sqrPercent(r.relativeTransparency):'—',Number.isFinite(r.skyQuality)?sqrPercent(r.skyQuality):'—'];
         if(r.isMaster)cells[8]='—'; // Score is inapplicable, not an unmeasured subframe value.
         cells.push(...extraKPIs.map(c=>kpiCell(sqrKPIValue(r,c),c.metric==='fwhm'?1:3)));
         for(let i=0;i<cells.length;++i){node.setText(i,cells[i]);node.setToolTip(i,i===6?r.registered.path+(r.isMaster?'':'\n'+sqrAcquisitionLabel(r)):i===21?(r.original?.path||r.match):cells[i]);}
         for(let i=0;i<extraKPIs.length;++i){let c=extraKPIs[i];node.setToolTip(this.baseReviewColumnCount+i,c.label+(c.metric==='fwhm'?' in pixels':' (0 = round, toward 1 = elongated)')+'. Lower is better.'+(r.isMaster?'\n'+SQR_MASTER_SCORE_INFO:(this.rankScoring.checked?'\nIncluded via R3 in R4':'\nIncluded in Score with equal weight')+'; correlation with PSF signal weight: '+sqrFmt(c.r)+' ('+c.count+' subframes).')+(sqrKPIValue(r,c)===null?'\nMeasurement unavailable for this image; inspect manually.':''));}
         node.setToolTip(0,'Field-only rank: 1 = worst Score. Subframes only; independent of table filters. Field-only Score: '+sqrFmt(r.scoreWithoutCorners));
         node.setToolTip(1,Number.isFinite(r.rankWithCorners)?'Rank including corner FWHM and eccentricity: 1 = worst Score. Subframes only; computed from available measurements. Score: '+sqrFmt(r.scoreWithCorners):'Requires valid field, center and all four corner measurements including corner eccentricity, and a positive enabled weight.');
         node.setToolTip(2,Number.isFinite(r.rankCorrelated)?'Correlation rank: 1 = worst Score. Higher Score is better. Score: '+sqrFmt(r.scoreCorrelated)+'\n'+correlationReport:g.correlationScoring?.available===false?correlationReport:'R3 unavailable for this image; check the field and selected KPI measurements.\n'+correlationReport);
         node.setToolTip(3,r.rankOfRanksDetail||'Measure this image to calculate R4 from its available ranks.');
         node.setToolTip(4,r.isMaster?'The master cannot be rejected.':r.moved?'Original moved to: '+r.movedTo+'\nSelect this row, then click Undo moved originals beside the green checkmark to restore it.':'Click to '+(r.reject?'keep':'reject')+' this original, or select the row and press Space.');
         node.setToolTip(5,sqrReviewToolTip(r,g,this.session.options));
         node.setToolTip(7,r.isMaster?'Integrated master: no single acquisition time.':sqrAcquisitionLabel(r)+'\nSame timestamp used for acquisition-time sorting and histograms. Original observation time, with registered metadata as fallback.');
         for(let i=17;i<=19;++i)node.setToolTip(i,['Arithmetic average','Minimum','Maximum'][i-17]+' combined RA/Dec displacement during the exposure, in arcseconds; not RMS.\n'+guideReport);
         for(let [column,key,meaning] of [
            [13,'0:eccentricity','Field star eccentricity, from 0 (round) toward 1 (elongated). Lower is rounder.'],
            [14,'cornerSeverity','Largest corner-quality penalty from corner FWHM, corner/center FWHM ratio, or eccentricity, relative to the group. Lower is better. Stored measurements remain visible when corner scoring is off.'],
            [16,'guideQuality','Combined guiding quality = (minimum + 2 × average + maximum) / 4, in arcseconds. Lower is better. Only usable exposure coverage produces a value.']]){
            let kpi=SQR_KPIS.find(k=>sqrKPIKey(k)===key);
            let inclusion=scoreInfo(kpi);
            node.setToolTip(column,meaning+'\n'+inclusion+'.'+(column===16?'\n'+sqrGuideReport(r):'')+(sqrKPIValue(r,kpi)===null?'\nMeasurement unavailable for this image.':''));
         }
         node.setToolTip(22,sqrBackgroundDescription(r,this.useCornerMeasurements)+'\n'+scoreInfo(SQR_KPIS.find(k=>k.key==='skyBackground'))+(r.skyBackground===null?'\nMeasurement unavailable; measure the images.':''));
         node.setToolTip(23,sqrTransparencyDescription(r)+'\n'+scoreInfo(SQR_KPIS.find(k=>k.key==='relativeTransparency')));
         node.setToolTip(24,sqrSkyQualityDescription(r)+'\n'+scoreInfo(SQR_KPIS.find(k=>k.key==='skyQuality')));
         node.setToolTip(8,r.mainIssueDetail||'Measure the image to calculate its weighted quality Score.');
         node.setToolTip(15,r.belowMeanDetail||'Measure the image to calculate the percentage of assessed indicators with worse-than-mean quality. Score is excluded.');
         node.setToolTip(12,r.mainIssueDetail||'Measure the image to identify the largest weighted contribution to Score.');
         if(r.isMaster)for(let column of [0,1,2,3,8,12])node.setToolTip(column,SQR_MASTER_SCORE_INFO);
      }
      for(let i=0;i<this.table.numberOfColumns;++i)this.table.adjustColumnWidthToContents(i);this.table.setColumnWidth(6,Math.round(250*this.displayPixelRatio));
      let found=false;for(let i=0;i<this.table.numberOfChildren;++i)if(this.table.child(i).row===this.current){this.table.currentNode=this.table.child(i);found=true;break;}
      if(!found){let next=this.selectionCleared?null:rows[0]||null;if(this.current!==next)this.clearFrames(!next);this.current=next;if(next)this.table.currentNode=this.table.child(0);else this.table.deselectAllNodes();}
      this.populating=false;
      this.updateDetails();this.updateButtons();this.updatePlots();
      if(loadPreview)this.ensurePreview();
   }
   setScatterOptions(o){this.refreshScatterKPIs(o,this.session?.groups[0]||null);}
   // Regional values must exist in the plotted subframes, not just the master.
   // Match identities across list changes so guiding and other surviving choices
   // never move to a different KPI. Only an unavailable axis falls back to default.
   refreshScatterKPIs(saved=null,group=this.group()){
      let defaults=sqrDefaults(),selected=saved||{};
      if(!saved)for(let name of ['scatterX','scatterY']){let kpi=this.scatterKPIs[this[name].currentItem];selected[name]=kpi?sqrKPIKey(kpi):defaults[name];}
      let available=sqrAvailableKPIs(group,false),changed=available.length!==this.scatterKPIs.length||available.some((kpi,i)=>kpi!==this.scatterKPIs[i]);
      this.updatingScatterKPIs=true;
      try{
         this.scatterKPIs=available;
         for(let name of ['scatterX','scatterY']){
            if(changed){this[name].clear();for(let kpi of available)this[name].addItem(kpi.label);}
            let index=available.findIndex(kpi=>sqrKPIKey(kpi)===selected[name]);
            this[name].currentItem=index>=0?index:available.findIndex(kpi=>sqrKPIKey(kpi)===defaults[name]);
         }
      }finally{this.updatingScatterKPIs=false;}
   }
   updatePlots(){this.updateHistogram();this.updateScatter();}
   updateScatter(){
      this.refreshScatterKPIs();
      // Build each page once for its initial layout. Later hidden refreshes
      // reconcile selectors but defer statistics/HTML until the tab is opened.
      // Invalidate any queued click from the previously rendered generation.
      if(this.scatterData&&this.tabs&&this.tabs.currentPageIndex!==3){
         if(!this.scatterDirty)++this.scatterGeneration;this.scatterDirty=true;this.scatterReady=false;return;}
      this.scatterDirty=false;
      let xKPI=this.scatterKPIs[this.scatterX.currentItem],yKPI=this.scatterKPIs[this.scatterY.currentItem];
      for(let [control,kpi] of [[this.scatterX,xKPI],[this.scatterY,yKPI]])control.toolTip=kpi.direction+(kpi.corners?' · Requires regional measurements; stored values remain available with corner scoring off.':kpi.guiding?' · Requires guiding logs matched to the exposure.':'');
      let data=this.scatterData=sqrScatterPlot(this.group(),xKPI,yKPI,this.current);
      this.correlationSummary.text=sqrCorrelationText(data.correlation);
      this.correlationSummary.toolTip=(data.correlation.r===null?'':'Correlation (full precision): '+String(data.correlation.r)+'\nThe displayed coefficient is rounded to four decimal places. Strength and direction use the unrounded value.\n')+'Pearson correlation uses the '+data.count+' plotted subframe pairs, including rejected frames. The master is excluded.\nStrength by |r|: 0 = none; above 0 and below 0.3 = weak; 0.3 to below 0.7 = moderate; 0.7 to below 1 = strong; 1 = perfect.\nPositive: both values increase together. Negative: as X increases, Y decreases. Direction refers to KPI values, not whether image quality improves. Zero means no linear relationship.\nAt least two paired subframes and variation in both KPIs are required.';
      this.scatterSummary.text=data.count+' of '+data.total+' subframes plotted'+(data.missing?' · '+data.missing+' missing one or both measurements':'')+'. Hover for values; click a point to select its image.\nCyan: selected · purple: REVIEW · blue: other kept · red: rejected.';
      this.scatterReady=false;++this.scatterGeneration;this.scatter.setHTML(sqrScatterHTML(data,this.scatterGeneration));
   }
   // Reconcile available KPI choices, then publish a new plot generation.
   // Separate chart ordering and filtering from the table's visible row list.
   updateHistogram(){
      let g=this.group(),kpi=this.availableKPIs[this.kpiSelect.currentItem]||SQR_KPIS[0],available=sqrAvailableKPIs(g);
      if(available.length!==this.availableKPIs.length||available.some((item,i)=>item!==this.availableKPIs[i])){
         this.updatingKPIs=true;this.kpiSelect.clear();for(let item of available)this.kpiSelect.addItem(item.label);
         this.availableKPIs=available;this.kpiSelect.currentItem=Math.max(0,available.indexOf(kpi));this.updatingKPIs=false;
         kpi=available[this.kpiSelect.currentItem];
      }
      if(this.histogramData&&this.tabs&&this.tabs.currentPageIndex!==2){
         if(!this.plotDirty)++this.plotGeneration;this.plotDirty=true;this.plotReady=false;return;}
      this.plotDirty=false;
      let options=this.options(),scale=sqrSessionPixelScale(this.session),fwhmModel=sqrFWHMModel(this.fwhmOptions,scale,g?.filter);
      let sky=kpi.key==='skyBackground',calibration=sky?sqrCurrentSkyCalibration(this.session,g):null;
      let skyModel=sky?sqrBortleModel(options,g,this.session,calibration):null;
      let data=this.histogramData=sqrMetricPlot(g,kpi,this.useCornerMeasurements,this.current,this.histogramOrder.currentItem===1?'time':'value',this.autofocusRuns||[],sqrGuidingScale(scale),fwhmModel,skyModel);
      if(kpi.key==='score')data.scoreDefinition=options.rankOfRanks?
         'Score is the equal-weight mean of the available normalized R1, R2 and R3 ranks. Each rank is normalized as (rank − 1) / (ranked images − 1); a single ranked image uses 0.5. R2 is omitted when corner scoring is off or unavailable.':
         'Score = 1 − weighted mean penalty / 10. '+(options.correlationOnly&&g?.correlationScoring?.available!==false?'The selected strongly correlated KPIs receive equal weight.':'The configured manual KPI weights are used.'+(options.correlationOnly?' No strongly correlated KPIs; R3 is unavailable.':''))+' A value of 1.000 means no measured penalty.';
      let info=this.plotInformation=sqrPlotInformation(data);this.plotInfoButton.visible=!!info;this.plotInfoButton.enabled=!this.running&&!!info;
      this.plotInfoButton.toolTip=info?'Histogram information':'';
      this.bortleControls.visible=kpi.key==='skyBackground'&&this.sqm.value===0;
      this.calibrateSkyButton.visible=sky&&!calibration;
      this.calibrateSkyButton.enabled=!this.running&&sqrSkyComparisonEnabled(this.options())&&!!g&&sqrSkyFilterSupported(g)&&
         (!this.sqm.value||sqrSQMTime(this.options(),this.session).time!==null);
      this.fwhmSettings.visible=kpi.metric==='fwhm';
      this.fwhmSettings.enabled=!this.running;
      this.fwhmSettings.toolTip='FWHM grading';
      this.kpiDirection.text=kpi.direction+' · '+sqrKPIScoreInfo(kpi,options,!!this.session?.guiding?.enabled,g?.correlationScoring);
      this.kpiDirection.toolTip='';
      this.histogramSummary.text=data.message?'':data.count+' subframes'+(data.missing?' · '+data.missing+' unavailable':'')+(data.hasMaster?' · master included':'')+' · '+(data.order==='time'?'acquisition order':'value order');
      this.histogramSummary.toolTip='';
      this.plotReady=false;++this.plotGeneration;this.histogram.setHTML(sqrPlotHTML(data,this.plotGeneration));
   }
   // Validate asynchronous WebView messages against the current generation.
   // Reveal a hidden row before selecting it; this action never changes rejection.
   selectPlotImage(selection,scatter=false){
      if(this.running||this.tabs.currentPageIndex!==(scatter?3:2)||selection?.generation!==(scatter?this.scatterGeneration:this.plotGeneration)||!Number.isInteger(selection.index))return false;
      let item=(scatter?this.scatterData:this.histogramData)?.items[selection.index],g=this.group();if(!item||!g||!sqrGroupRows(g).includes(item.row))return false;
      let reveal=this.candidatesOnly.checked&&(item.row.isMaster||!item.row.candidate);
      if(reveal)this.candidatesOnly.checked=false;
      this.clearFrames(false);this.current=item.row;this.selectionCleared=false;this.tabs.currentPageIndex=0;this.plotTimer.stop();this.populateRows();this.table.hasFocus=true;
      this.status.text='Selected '+sqrFileName(item.row.registered.path)+' from the plot.'+(reveal?' REVIEW-only filter cleared to show this image.':'');
      return true;
   }
   updateDetails(){let r=this.current,info=sqrReviewDetails(r);
      for(let [control,key] of [[this.details,'summary'],[this.detailMetrics,'metrics'],[this.detailSource,'source']]){control.text=info[key];control.toolTip=info[key+'Tip'];}
      if(!r){this.frameLabel.text='No frame selected';return;}
      this.frameLabel.text=(this.isRotating()?'SUBFRAME '+(this.rotationRows().indexOf(r)+1)+' / '+this.rotationRows().length+': ':this.frame===0?(r.isMaster?'MASTER: ':'REGISTERED: '):(this.loadedReference?.label||'REFERENCE')+': ')+(this.frame===0?sqrFileName(r.registered.path):sqrFileName(this.loadedReference?.path||''))+(this.isRegionRotating()?' · '+(this.region.currentItem?SQR_REGIONS[this.region.currentItem]:'Usable field'):'')+'\n'+(r.isMaster?'INTEGRATED MASTER · cannot be rejected':r.reject?'REJECT ORIGINAL':'KEEP ORIGINAL')+(r.moved?' · already moved':'');
   }
   scan(){this.stopBlink();this.scanRequired=true;this.busy(true);let abort=console.abortEnabled;console.abortEnabled=true;
      try{this.clearFrames();let options=this.options();options.measureCorners=false;this.session=sqrScan(options,s=>this.setStatus(s));this.useCornerMeasurements=false;this.current=null;this.updateCornerControls();this.parseAutorun(false);this.populateGroups();let rows=this.session.groups.flatMap(g=>g.rows);
         let masters=this.session.groups.filter(g=>g.master).length;
         this.status.text=rows.length+' registered lights · '+rows.filter(r=>r.original).length+' verified originals · '+this.session.groups.length+' groups · '+masters+' masters matched by filter. Use the magnifier to measure.';
         this.scanRequired=false;
      }catch(e){this.error(e);}finally{console.abortEnabled=abort;this.busy(false);}}
   // Restore abort/UI state in finally, then prepare the initial comparison
   // without switching away from the user's review tab after measurement.
   analyze(withCorners=this.useCornerMeasurements){
      if(this.running||!this.session||this.scanRequired)return;
      let hadCorners=sqrHasCornerMeasurements(this.session),useCorners=this.useCornerMeasurements,previewSignature=this.measurementPreviewSignature(true);
      this.syncOptions();
      this.session.options.measureCorners=withCorners;
      this.stopBlink();this.busy(true);let abort=console.abortEnabled,measured=false,skyResult=null,calibrationError='';console.abortEnabled=true;console.show();
      try{sqrAnalyze(this.session,s=>this.setStatus(s));
         measured=true;
         skyResult=sqrAutoCalibrateSky(this.session,s=>this.setStatus(s));
      }catch(e){
         // Preserve completed regions after a failure or abort, but refresh the
         // selection so the report cannot retain an obsolete corner decision.
         if(measured)calibrationError=e.message||String(e);this.error(e);
      }finally{
         // First regional measurement activates corner scoring. Later runs
         // preserve an explicit exclusion, even when filling missing regions.
         this.useCornerMeasurements=sqrHasCornerMeasurements(this.session)&&(hadCorners?useCorners:withCorners);this.syncOptions();
         if(!measured||withCorners!==this.useCornerMeasurements)try{sqrRank(this.session);}catch(rankError){for(let g of this.session.groups)g.correlationScoring=null;}
         this.updateCornerControls();this.populateRows(false);
         if(previewSignature!==this.measurementPreviewSignature())this.clearFrames(false);
         console.abortEnabled=abort;this.busy(false);
      }
      if(measured){let n=this.session.groups.reduce((s,g)=>s+g.rows.filter(r=>r.candidate).length,0);
         let summary='Measured. '+n+' review candidates; no originals selected automatically.'+sqrSkyCalibrationSummary(skyResult)+(calibrationError?' Sky brightness: '+calibrationError:'');this.status.text=summary;
         // Full-resolution display alignment and STF are expensive. Build them
         // only when Blink is visible; a cached preview remains ready to reuse.
         if(!calibrationError)this.ensurePreview();this.status.text=summary+(this.frames?' Blink preview ready.':' Open the Blink tab to preview an image.');
      }}
   // Load both comparison bitmaps once. Use only a reentry guard during these
   // synchronous reads, just as in rotation: do not disable controls or pump
   // events midway through a preview replacement. Retain zoom/pan on navigation.
   inspect(openBlink=true,preserveView=true,preservePlayback=false){
      if(this.isRegionRotating())return this.inspectRegions(openBlink,preserveView,preservePlayback);
      if(this.isRotating())return this.inspectRotation(openBlink,preserveView,preservePlayback);
      let r=this.current,g=this.group();if(!r||!g||this.running)return false;
      let keepView=preserveView&&(this.viewer.isValid||!!this.savedPreviewView);
      this.running=true;try{
         this.clearFrames(!keepView,false,preservePlayback);let reference=sqrReference(g,this.options().reference);
         if(!reference.path){this.clearFrames();if(openBlink&&this.tabs.currentPageIndex!==1)this.tabs.currentPageIndex=1;this.status.text=this.reference.currentItem===1?'No scored, kept subframe is available. Measure the group or choose Filter master.':'No unique master matches this filter in WBPP/master. Check master filenames or choose Best scoring subframe.';return false;}
         if(!g.regions){this.clearFrames();this.status.text='Measure this group before using the registered comparison regions.';return false;}
         this.frames=sqrFrames(r.registered.path,reference.path,this.options(),g.regions[this.region.currentItem],!!r.isMaster,this.referenceDisplay);this.loadedReference=reference;this.frame=0;
         // ImageView.regenerate replaces pixels while retaining its native zoom and
         // scroll positions, clamped to the new bounds when changing regions.
         this.setPreviewImage(this.frames[0],keepView);
         if(openBlink&&this.tabs.currentPageIndex!==1)this.tabs.currentPageIndex=1;this.showFrame(0);
         this.viewer.setStatusMessage('Blink against '+reference.label.toLowerCase()+': '+sqrFileName(reference.path));
         this.status.text=sqrKey(reference.path)===sqrKey(r.registered.path)?'This image is also the selected blink reference.':r.isMaster?'Integrated master compared with the selected reference. The master cannot be rejected.':'Blink uses identical coordinates and zoom. Mark Keep or Reject, then review the next frame.';
         return true;
      }catch(e){this.clearFrames();this.error(e);return false;}finally{this.running=false;this.updateButtons();}}
   // Synchronize selection without rebuilding the table or hidden quality plot
   // on every timer tick. The plot is refreshed when its tab is opened.
   selectBlinkRow(row){
      this.current=row;this.selectionCleared=false;this.populating=true;
      try{this.table.deselectAllNodes();let node=this.reviewNodes?.get(row);if(node){this.table.currentNode=node;node.selected=true;}}
      finally{this.populating=false;}
   }
   inspectRegions(openBlink=true,preserveView=true,preservePlayback=false){
      let r=this.current,g=this.group();if(this.running||!r||!g)return false;
      let keepView=preserveView&&(this.viewer.isValid||!!this.savedPreviewView);this.running=true;
      try{
         this.clearFrames(!keepView,false,preservePlayback,true);
         if(!g.regions){this.clearFrames();this.status.text='Measure this group before rotating its preview regions.';return false;}
         let reference=this.regionRotation.currentItem===2?sqrReference(g,this.options().reference):null;
         if(reference&&!reference.path){this.clearFrames();this.status.text='No matching reference is available. Choose another reference or Rotate regions: Image only.';return false;}
         let o=this.options(),key=JSON.stringify([r.registered.path,!!r.isMaster,reference?.path||'',g.regions,o.displaySTF,o.alignBrightness]);
         if(this.regionFramesKey!==key){this.clearRegionFrames();this.regionFrames=sqrRegionFrames(r.registered.path,reference?.path||'',o,g.regions,!!r.isMaster);this.regionFramesKey=key;}
         this.frames=this.regionFrames[this.region.currentItem];this.framesFromRegions=true;this.loadedReference=reference;this.frame=0;
         this.setPreviewImage(this.frames[0],keepView);
         if(openBlink&&this.tabs.currentPageIndex!==1)this.tabs.currentPageIndex=1;
         this.viewer.refreshPixelReadout();this.updateDetails();this.viewer.setStatusMessage('Rotate regions · '+(reference?'blink against '+reference.label.toLowerCase():'selected image only'));
         this.status.text='Region rotation keeps the selected image and zoom. '+(reference?'Image and reference are shown in each region before advancing.':'Each interval advances to the next region.');return true;
      }catch(e){this.clearFrames();this.error(e);return false;}finally{this.running=false;this.updateButtons();}
   }
   inspectRotation(openBlink=true,preserveView=true,preservePlayback=false){
      if(this.running)return false;
      let rows=this.rotationRows(),g=this.group();
      if(!rows.length||!g?.regions){this.clearFrames();this.updateDetails();this.updateButtons();this.status.text=rows.length?'Measure this group before rotating subframes.':'No subframes are visible in the Review list.';return false;}
      let r=rows.includes(this.current)?this.current:rows[0];this.selectBlinkRow(r);
      let keepView=preserveView&&(this.viewer.isValid||!!this.savedPreviewView),o=this.options(),rect=g.regions[this.region.currentItem];
      let key=JSON.stringify([g.directoryName,g.rows[0]?.registered.path,rect,o.displaySTF,o.alignBrightness]);
      let display=this.rotationDisplay?.key===key?this.rotationDisplay.data:null;
      // A synchronous frame read needs the reentry guard, not the whole-dialog
      // busy state. Do not pump UI events or change enabled states mid-frame.
      this.clearFrames(!keepView,true,preservePlayback);this.running=true;
      try{
         let rendered=sqrRotationFrame(r.registered.path,o,rect,display);
         this.rotationDisplay={key,data:rendered.display};this.frames=[rendered.bitmap];this.frame=0;
         this.setPreviewImage(this.frames[0],keepView);
         if(openBlink&&this.tabs.currentPageIndex!==1)this.tabs.currentPageIndex=1;
         this.viewer.refreshPixelReadout();this.updateDetails();this.viewer.setStatusMessage('Subframes in Review order · master excluded');
         this.status.text='Subframe '+(rows.indexOf(r)+1)+' / '+rows.length+' in Review order. Keep and Reject apply to the displayed subframe.';
         return true;
      }catch(e){this.clearFrames();this.error(e);return false;}finally{this.running=false;this.updateButtons();}
   }
   showFrame(index){if(!this.frames||!this.frames[index])return;this.frame=index;this.viewer.regenerate(this.frames[index]);this.viewer.refreshPixelReadout();this.updateDetails();}
   // Save blink status before loading the next visible row, then resume only
   // if the replacement preview succeeded. Navigation wraps at either list end.
   navigate(step){let rows=this.isRotating()?this.rotationRows():this.visibleRows;if(this.running||!rows?.length)return;let resume=this.blinking,i=rows.indexOf(this.current);
      let preservePlayback=resume;
      if(preservePlayback)this.timer.stop();else this.stopBlink();this.selectBlinkRow(rows[i<0?(step<0?rows.length-1:0):(i+step+rows.length)%rows.length]);
      if(this.inspect(true,true,preservePlayback)&&resume)this.startBlink();}
   // Reference/region changes share this path so active blinking survives them.
   reloadBlink(preserveView=false){if(this.running)return;if(!this.current&&!this.isRotating()){this.updateButtons();return;}let resume=this.blinking;this.rotationDisplay=null;
      if(this.inspect(true,preserveView,resume)&&resume)this.startBlink();}
   decide(reject){if(!this.current||this.current.isMaster||this.current.moved)return;this.current.reject=reject;
      // Rejection changes neither scores nor the Review filter/sort keys. Keep
      // all nodes, column widths and the selection; update just this decision.
      let node=this.reviewNodes?.get(this.current);
      if(!node){this.populateRows();return;}
      this.populating=true;try{this.table.currentNode=node;}finally{this.populating=false;}
      node.setIcon(4,this.rejectIcons[reject?1:0]);
      node.setToolTip(4,'Click to '+(reject?'keep':'reject')+' this original, or select the row and press Space.');
      this.updateDetails();this.updateButtons();this.updatePlots();this.ensurePreview();}
   setSession(s){this.clearFrames();this.session=s;this.scanRequired=false;this.useCornerMeasurements=sqrHasCornerMeasurements(s)&&s.options.measureCorners!==false;this.current=null;let o={...sqrDefaults(),...s.options,logFolder:sqrLogFolderOption(s.options)};
      this.fwhmOptions=sqrFWHMOptions(o);
      this.aperture.setValue(this.fwhmOptions.fwhmAperture);this.fwhmOptions.fwhmAperture=this.aperture.value;
      this.seeing.setValue(this.fwhmOptions.fwhmSeeing);
      this.bortle.currentItem=sqrBortleOptions(o).bortleClass;
      this.sqm.setValue(sqrSQMReading(o));
      this.sqmTime.text=String(o.sqmTime||'');this.sqmTimePreset=o.sqmTimeFromLog?this.sqmTime.text.trim():'';this.sqmTime.enabled=this.sqmTimePicker.enabled=this.sqm.value>0;
      for(let k of Object.keys(this.folders))this.folders[k].edit.text=o[k];for(let k of ['percent','patch','margin','minStars'])this[k].setValue(o[k]);
      this.logFolder.edit.text=o.logFolder;this.logTimeZone.currentItem=o.logTimeZone==='offset'?1:0;this.logUTCOffset.setValue(o.logUTCOffset);this.logClock=null;this.updateLogOffsetControls();
      this.skyScoreKPI.currentItem=SQR_SKY_SCORE_CHOICES.findIndex(c=>c.key===sqrSkyScoreChoice(o).key);
      this.rankScoring.checked=!!o.rankOfRanks;this.correlationOnly.checked=!!o.correlationOnly&&!o.rankOfRanks;for(let k of Object.keys(this.weights)){this.manualWeights[k]=o[k];this.weights[k].setValue(o[k]);}this.reference.currentItem=Math.max(0,['master','best','sequence'].indexOf(o.reference));this.updateCornerControls();
      this.regionRotation.currentItem=Math.max(0,['off','image','blink'].indexOf(o.regionRotation));this.normalizeRegionRotation();
      this.guidingMode.currentItem=Math.max(0,['require','available','ignore'].indexOf(o.guidingMode));this.weights.guideWeight.enabled=this.guidingMode.currentItem!==2;
      this.setBlinkInterval(o.blinkInterval);
      this.maxFits=o.maxFits;this.displaySTF.checked=o.displaySTF;this.alignBrightness.checked=o.alignBrightness;this.histogramOrder.currentItem=o.histogramOrder==='time'?1:0;
      this.setScatterOptions(o);
      this.order.currentItem=sqrReviewOrderIndex(o.reviewOrder);this.reviewReverse=!!o.reviewReverse;this.loadAutorun(false);if(this.session){this.syncOptions();if(this.session.groups.some(g=>g.rows.some(r=>r.metrics[0])))sqrRank(this.session);}this.populateGroups();this.setInputsCollapsed(o.inputsCollapsed);this.setQualityCollapsed(o.qualityCollapsed);this.setReviewInfoCollapsed(o.reviewInfoCollapsed);}
   resetSettings(){let defaults=sqrDefaults(),folders=this.options();this.correlationOnly.checked=false;this.rankScoring.checked=false;this.manualWeights=Object.fromEntries(SQR_SCORE_COMPONENTS.map(c=>[c.weight,defaults[c.weight]]));for(let k of ['percent','patch','margin','minStars'])this[k].setValue(defaults[k]);for(let k of Object.keys(this.weights))this.weights[k].setValue(defaults[k]);
      this.skyScoreKPI.currentItem=0;
      this.fwhmOptions=sqrFWHMOptions(defaults);
      this.aperture.setValue(defaults.fwhmAperture);
      this.seeing.setValue(defaults.fwhmSeeing);
      this.bortle.currentItem=defaults.bortleClass;
      this.sqm.setValue(defaults.sqmReading);
      this.sqmTime.text=defaults.sqmTime;this.sqmTimePreset='';this.applySQMTimePreset();this.sqmTime.enabled=this.sqmTimePicker.enabled=false;
      this.setScatterOptions(defaults);this.updateScatter();
      this.guidingMode.currentItem=['require','available','ignore'].indexOf(defaults.guidingMode);this.weights.guideWeight.enabled=true;
      this.useCornerMeasurements=defaults.measureCorners;this.reference.currentItem=defaults.reference==='best'?1:0;this.updateCornerControls();
      this.regionRotation.currentItem=0;
      this.setBlinkInterval(defaults.blinkInterval);
      this.displaySTF.checked=defaults.displaySTF;this.alignBrightness.checked=defaults.alignBrightness;this.histogramOrder.currentItem=0;this.order.currentItem=sqrReviewOrderIndex(defaults.reviewOrder);this.reviewReverse=defaults.reviewReverse;this.setInputsCollapsed(defaults.inputsCollapsed);this.setQualityCollapsed(defaults.qualityCollapsed);this.setReviewInfoCollapsed(defaults.reviewInfoCollapsed);this.invalidateMeasurements();if(!this.session)this.updateHistogram();this.status.text='Evaluation defaults restored. Folder paths retained.';}
   // Confirmation is the boundary between a read-only review and file changes.
   // The engine independently validates the plan again when executing it.
   moveRejected(){
      if(!this.session||this.running||this.scanRequired||!this.folders.destination.edit.text.trim())return;this.syncOptions();this.stopBlink();
      try{
         let plan=sqrMovePlan(this.session),text='Move '+plan.length+' manually rejected original light file(s)?\n\nDestination: '+sqrPath(this.session.options.destination)+'\n\n'+
            plan.map(p=>sqrFileName(p.source)).join('\n')+'\n\nThe relative source-folder structure is preserved. A move journal records each source and destination. Calibrated and registered files remain available. Refresh WBPP’s light list before rerunning.';
         if(new MessageBox(text,'Move rejected originals',StdIcon.Question,StdButton.Yes,StdButton.No).execute()!==StdButton.Yes)return;
         this.busy(true);let result=sqrMove(this.session,s=>this.setStatus(s));
         this.populateRows();this.status.text='Moved '+result.count+' original lights. Journal: '+result.journal;
      }catch(e){this.populateRows();this.error(e);}finally{this.lastMoveJournal=this.session?.lastMoveJournal||this.lastMoveJournal;this.busy(false);}}
   restoreRejected(){
      if(this.running||!this.session||this.scanRequired||!this.folders.destination.edit.text.trim())return;this.stopBlink();let abort=console.abortEnabled;
      try{
         let path=this.current?.moveJournal||this.session?.lastMoveJournal||this.lastMoveJournal||'';
         let dialog=new SQRRestoreDialog(path&&File.exists(path)?path:'',this.current?.moved?this.current.original?.path||'':'',this.folders.destination.edit.text);
         if(!dialog.execute())return;
         this.busy(true);console.abortEnabled=true;
         let result=sqrRestore(dialog.record.path,dialog.indices(),this.session,s=>this.setStatus(s),dialog.plan);
         this.populateRows();this.status.text='Restored '+result.count+' original lights and cleared their rejection marks. Undo journal: '+result.journal;
      }catch(e){this.populateRows();this.error(e);}finally{console.abortEnabled=abort;this.busy(false);}
   }
}

#ifndef SQR_LIBRARY
// Run globally with optional saved settings. SQR_LIBRARY suppresses this entry
// point so validation harnesses can exercise the engine without opening the UI.
function sqrMain(){
   CoreApplication.ensureMinimumVersion(1,9,5);
   let o=sqrDefaults();if(Parameters.has('configJSON')){let saved=JSON.parse(Parameters.getString('configJSON'));o={...o,...saved,logFolder:sqrLogFolderOption(saved),measureCorners:false};}
   if(Parameters.isViewTarget)throw new Error('Run this file-based review script globally.');
   let dialog=new SQRDialog(o);console.hide();dialog.execute();dialog.clearFrames();
}
sqrMain();
#endif

