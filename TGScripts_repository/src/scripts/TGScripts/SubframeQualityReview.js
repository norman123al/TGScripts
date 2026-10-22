#engine v8
#include <pjsr/controls/ImageView.js>
#include <pjsr/KeyCodes.jsh>
#ifndef SQR_LIBRARY
#feature-id SubframeQualityReview : TG Scripts > Subframe Quality Review
#feature-info Review registered WBPP lights against a filter master or the best subframe, measure field quality with optional corners, and move manually rejected original light files.
#endif

/* Subframe Quality Review 0.25.3 -- PixInsight 1.9.5+, V8.
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
 * Only sqrMove changes original-file locations, after an explicit confirmation.
 * Process instances store options, not measured sessions or pending decisions.
 */
const SQR_VERSION='0.25.3';
const SQR_FILE=#__FILE__;
const SQR_REGIONS=['Field','Center','Top left','Top right','Bottom left','Bottom right'];

/** Defaults shared by the UI and saved process instances. Weights are relative;
 * corner measurement is opt-in, and no rejection flag is an option. */
function sqrDefaults(){return {wbpp:'',originals:'',destination:'',percent:10,measureCorners:false,reference:'best',
   patch:22,margin:2,minStars:20,signalWeight:40,starsWeight:15,fwhmWeight:25,eccentricityWeight:20,cornerWeight:20,belowMeanWeight:20,guideWeight:25,
   maxFits:2000,displaySTF:true,alignBrightness:true,blinkInterval:.75,regionRotation:'off',reviewOrder:0,reviewReverse:false,histogramOrder:'value',scatterX:'0:fwhm',scatterY:'0:signal',logFolder:'',logTimeZone:'auto',logUTCOffset:0,guidingMode:'require',qualityCollapsed:false,inputsCollapsed:false};}
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
      let ids=['Instrument:Camera:Name'];if(allowMultiple)ids.push('Instrument:Telescope:FocalLength','Instrument:Sensor:XPixelSize','Instrument:Sensor:YPixelSize');
      let properties={};if(f.format.canStoreImageProperties)for(let p of f.imageProperties){
         // Installed PJSR returns [id,type]; accept named descriptors as well.
         let id=Array.isArray(p)?p[0]:p.id;
         if(ids.includes(id))properties[id]=f.readImageProperty(id);
      }
      return {path:path,fingerprint:sqrFingerprint(path),width:d[0].width,height:d[0].height,
         channels:d[0].numberOfChannels,keywords:k,properties,date:k['DATE-OBS']||k.DATEOBS||'',
         camera:sqrUnquote(properties['Instrument:Camera:Name'])||k.INSTRUME||'',filter:k.FILTER||'',exposure:Number(k.EXPTIME||k.EXPOSURE||0),
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
/** Match a processed light to exactly one original. A stripped WBPP filename
 * is a candidate lookup, not proof of identity: acquisition metadata must agree.
 * Ambiguity remains unresolved and blocks moving that original. */
function sqrFindOriginal(reg,raws){
   let named=raws.filter(r=>sqrBase(r.path).toLowerCase()===sqrSourceStem(reg.path));
   let candidates=named.length?named:raws.filter(r=>reg.date&&r.date===reg.date);
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
function sqrGuideThresholdText(scale){return Number.isFinite(scale)&&scale>0?'Good ≤ '+sqrFmt(scale)+'″ · Medium > '+sqrFmt(scale)+'″ to '+sqrFmt(1.75*scale)+'″ · Bad > '+sqrFmt(1.75*scale)+'″':'Guiding thresholds unavailable (image scale unavailable)';}
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
   return (m.scorable?m.category:m.reason)+(row.guidingIgnored?' (excluded from Score)':'')+(m.count?' · min / max / average: '+sqrFmt(m.min)+' / '+sqrFmt(m.max)+' / '+sqrFmt(m.avg)+' arcsec':'')+
      '\n'+m.count+' valid samples · '+(m.coverage*100).toFixed(1)+'% time coverage · '+m.dropped+' rejected guide samples'+(m.settling?' · '+m.settling+' samples while settling':'')+
      (m.pixelScale?'\n'+sqrGuideThresholdText(m.pixelScale)+'. Composite = (min + 2 × average + max) / 4.':'');}
function sqrGuideCell(row,key){let value=row[key];return Number.isFinite(value)?sqrFmt(value)+(row.guiding?.scorable?'':'*'):'—';}
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
      let x,y;if(mode===1){x=a.metrics[0]?.signal??Infinity;y=b.metrics[0]?.signal??Infinity;}
      else if(mode===2){x=a.metrics[0]?.stars??Infinity;y=b.metrics[0]?.stars??Infinity;}
      else if(mode===3){x=-(a.metrics[0]?.fwhm??-Infinity);y=-(b.metrics[0]?.fwhm??-Infinity);}
      else if(mode===4){x=-(a.cornerSeverity??-Infinity);y=-(b.cornerSeverity??-Infinity);}
      else if(mode===5)return direction*a.registered.path.localeCompare(b.registered.path);
      else if(mode===6){x=a.rankWithoutCorners??Infinity;y=b.rankWithoutCorners??Infinity;}
      else if(mode===7){x=a.rankWithCorners??Infinity;y=b.rankWithCorners??Infinity;}
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
         return compare(x,y)||compare(-(a.score??-Infinity),-(b.score??-Infinity))||a.registered.path.localeCompare(b.registered.path);}
      else if(mode>=10&&mode<=12){
         // Guide values are numeric arcseconds, including displayed partial
         // measurements. Missing values follow in both directions; master last.
         if(!!a.isMaster!==!!b.isMaster)return a.isMaster?1:-1;
         let key=['guideMin','guideMax','guideAvg'][mode-10];
         x=Number.isFinite(a[key])?-a[key]:Infinity;y=Number.isFinite(b[key])?-b[key]:Infinity;
      }
      else{x=-(a.score??Infinity);y=-(b.score??Infinity);}
      return compare(x,y)||a.registered.path.localeCompare(b.registered.path);
   });
}
// Plot descriptors separate stored metrics from derived row-level indicators.
// Corner descriptors are offered only when actual values exist in the group.
const SQR_KPIS=[
   {label:'Score',key:'score',direction:'Lower is better'},
   {label:'PSF signal weight',metric:'signal',region:0,direction:'Higher is better'},
   {label:'Star count',metric:'stars',region:0,integer:true,direction:'Higher is better'},
   {label:'Field FWHM (px)',metric:'fwhm',region:0,direction:'Lower is better'},
   {label:'Corner severity',key:'cornerSeverity',corners:true,direction:'Lower is better'},
   {label:'Field eccentricity',metric:'eccentricity',region:0,direction:'Lower is rounder'},
   ...[1,2,3,4,5].map(region=>({label:SQR_REGIONS[region]+' FWHM (px)',metric:'fwhm',region,corners:true,direction:'Lower is better'})),
   ...[2,3,4,5].map(region=>({label:SQR_REGIONS[region]+' eccentricity',metric:'eccentricity',region,corners:true,direction:'Lower is rounder'})),
   {label:'Below-mean Quality',key:'belowMeanFraction',percentage:true,direction:'Lower is better; percentage of assessed indicators with worse-than-mean quality'},
   {label:'Guide minimum (arcsec)',key:'guideMin',guiding:true,direction:'Lower is better; minimum combined RA/Dec displacement'},
   {label:'Guide maximum (arcsec)',key:'guideMax',guiding:true,direction:'Lower is better; maximum combined RA/Dec displacement'},
   {label:'Guide average (arcsec)',key:'guideAvg',guiding:true,direction:'Lower is better; arithmetic mean of combined RA/Dec displacement'},
   {label:'Guiding quality (arcsec)',key:'guideQuality',guiding:true,direction:'Lower is better',definition:'Guiding quality G = (minimum + 2 × average + maximum) / 4, in arcseconds.'}
];
function sqrEccentricityValid(m){return !!m?.valid&&Number.isFinite(m.eccentricity)&&m.eccentricity>=0&&m.eccentricity<1;}
// null means unavailable, while zero is a real value. Stored corner severity
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
// Regional and individual guiding values feed a composite, not extra weights.
function sqrKPIScoreInfo(kpi,o,guidingEnabled=false){
   if(kpi.key==='score')return 'Combined Score';
   if(kpi.corners){
      if(!o.measureCorners)return 'Excluded from Score (corners off)';
      if(!(o.cornerWeight>0))return 'Excluded from Score (corner weight 0)';
      return kpi.region===1?'Included via corner / center FWHM ratios':kpi.key==='cornerSeverity'?'Included in Score':'Included via corner quality';
   }
   if(kpi.guiding){
      if(o.guidingMode==='ignore')return 'Excluded from Score (guiding ignored)';
      if(!(o.guideWeight>0))return 'Excluded from Score (guiding weight 0)';
      if(!guidingEnabled)return 'Excluded from Score (no guiding logs)';
      return kpi.key==='guideQuality'?'Included in Score':'Included via guiding quality';
   }
   let weight=kpi.key==='belowMeanFraction'?o.belowMeanWeight:o[({signal:'signalWeight',stars:'starsWeight',fwhm:'fwhmWeight',eccentricity:'eccentricityWeight'})[kpi.metric]];
   return weight>0?'Included in Score':'Excluded from Score (weight 0)';
}
/** Build a plot model independent of the review-table filter and sort order.
 * One slot represents one image; this is a WBPP-style metric plot, not frequency
 * binning. The visible mean excludes rejected rows, unlike scoring baselines. */
function sqrMetricPlot(group,kpi,measureCorners,selectedRow=null,order='value',autofocusRuns=[],guideScale=null){
   let chronological=order==='time';
   let data={kpi,order:chronological?'time':'value',showAutofocus:chronological&&!kpi.guiding,items:[],autofocus:[],master:null,hasMaster:!!group?.master,missing:0,message:'',average:null};
   if(!group){data.message='Scan files and measure a group to view its quality indicators.';return data;}
   // WBPP's metric plots use one slot per frame, ascending metric order and
   // 10% vertical padding. They do not aggregate values into frequency bins.
   data.items=sqrGroupRows(group).map(row=>({row,value:sqrKPIValue(row,kpi),time:sqrAcquisitionTime(row),master:!!row.isMaster,selected:row===selectedRow,review:!row.isMaster&&!!row.candidate,rejected:!row.isMaster&&!!(row.reject||row.moved)}))
      .sort((a,b)=>chronological?Number(b.master)-Number(a.master)||(a.time===null)-(b.time===null)||(a.time??0)-(b.time??0):
         (a.value===null)-(b.value===null)||(a.value??0)-(b.value??0)||a.row.registered.path.localeCompare(b.row.registered.path));
   if(data.showAutofocus)data.autofocus=sqrAutofocusMarkers(data.items,autofocusRuns);
   let valid=data.items.filter(item=>item.value!==null);
   data.master=sqrKPIValue(sqrMasterRow(group),kpi);data.missing=data.items.filter(item=>!item.master&&item.value===null).length;
   data.count=valid.filter(item=>!item.master).length;
   if(!valid.length){data.message='No valid measurements for '+kpi.label+'. Use the magnifier to measure.';return data;}
   // Keep subframe differences readable when the integration has much higher signal.
   let subframes=valid.filter(item=>!item.master),values=(subframes.length?subframes:valid).map(item=>item.value),min=Math.min(...values),max=Math.max(...values);
   let padding=(max-min||max*.1||1)*.1;data.low=min-padding;data.high=max+padding;
   if(data.low<0&&min>=0)data.low=0;
   if(kpi.percentage)data.high=Math.min(1,data.high);
   // Apply absolute categories to the measured min/average/max errors. The
   // combined guiding quality is a derived indicator with a separate definition.
   // Only a validated imaging scale can define these limits.
   if(['guideMin','guideAvg','guideMax'].includes(kpi.key)&&Number.isFinite(guideScale)&&guideScale>0){
      data.low=0;data.high=Math.max(data.high,2*guideScale);
      data.guideBands=[
         {label:'Good',low:0,high:guideScale,color:'#a6e3a1'},
         {label:'Medium',low:guideScale,high:1.75*guideScale,color:'#f9e2af'},
         {label:'Bad',low:1.75*guideScale,high:data.high,color:'#f38ba8'}];
   }
   data.masterClipped=data.master===null?'':data.master>data.high?'above':data.master<data.low?'below':'';
   let kept=valid.filter(item=>!item.master&&!item.rejected);
   if(kept.length)data.average=kept.reduce((sum,item)=>sum+item.value,0)/kept.length;
   return data;
}
function sqrPlotNumber(value){if(!Number.isFinite(value))return 'unavailable';let a=Math.abs(value);return value.toFixed(a>=1000?0:a>=100?1:a>=10?2:a>=1?3:4);}
function sqrPercent(value){return Number.isFinite(value)?(100*value).toFixed(1).replace(/\.0$/,'')+'%':'unavailable';}
function sqrKPIPlotNumber(value,kpi){return kpi?.percentage?sqrPercent(value):sqrPlotNumber(value);}
function sqrHTML(text){return String(text).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
// Save metric identities, not menu positions, so new indicators do not change
// the axes in an existing process instance. Regional choices require measurements.
function sqrKPIKey(kpi){return kpi.key||kpi.region+':'+kpi.metric;}
function sqrScatterAxis(values,kpi){
   let min=Math.min(...values),max=Math.max(...values),padding=(max-min||Math.abs(min)||1)*.08;
   return {low:min>=0?Math.max(0,min-padding):min-padding,high:kpi.percentage?Math.min(1,max+padding):max+padding};
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
   let pairs=items.map(item=>[normalize(item.x,ranges[0]),normalize(item.y,ranges[1])]);
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
   let a=Math.abs(r),rounded=Number(a.toFixed(4));
   // Show extra digits if four-place rounding would suggest a different band.
   let number=a!==rounded&&[0,.3,.7,1].includes(rounded)?a.toPrecision(12):a.toFixed(4);
   let value=(r>0?'+':r<0?'-':'')+number;
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
   if(!data.items.length){data.message='No images have both selected measurements. Measure the images, enable Measure corners for regional indicators, or load guiding logs as needed.';return data;}
   data.xAxis=sqrScatterAxis(data.items.map(item=>item.x),xKPI);data.yAxis=sqrScatterAxis(data.items.map(item=>item.y),yKPI);
   return data;
}
// Retain meaningful digits for small signal weights as well as ordinary values.
function sqrScatterNumber(value,kpi){return kpi.percentage?sqrPercent(value):value!==0&&(Math.abs(value)<.001||Math.abs(value)>=1e6)?value.toExponential(2):sqrPlotNumber(value);}
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
      svg.push('<defs><filter id="shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="1" dy="2" stdDeviation="2" flood-color="#000" flood-opacity=".4"/></filter></defs><rect x="55" y="35" width="330" height="140" rx="3" fill="#252536"/>');
      for(let band of data.guideBands||[])
         svg.push('<rect class="guide-band" data-category="'+band.label+'" x="55" y="'+y(band.high)+'" width="330" height="'+(y(band.low)-y(band.high))+'" fill="'+band.color+'" fill-opacity=".18" pointer-events="none"/>');
      for(let i=0;i<=5;++i){let value=data.low+(data.high-data.low)*i/5,py=y(value);
         svg.push('<path d="M50 '+py+'H55" stroke="#585b70"/><path d="M55 '+py+'H385" stroke="#3a3a4a" stroke-width=".5" stroke-dasharray="3,3"/><text x="47" y="'+(py+3)+'" text-anchor="end" fill="#6c7086" font-size="9">'+number(value)+'</text>');}
      let spacing=330/data.items.length,width=Math.max(2,spacing-1);
      data.items.forEach((item,i)=>{if(item.value===null)return;let x=55+i*spacing+(spacing-width)/2,py=y(Math.max(data.low,Math.min(data.high,item.value))),cx=x+width/2;
         let color=item.selected?'#89dceb':item.master?'#f9a825':item.rejected?'#e57373':item.review?'#cba6f7':'#2d6cb5';
         let outline=item.selected&&item.rejected?'#e57373':item.review?'#cba6f7':item.selected&&item.master?'#f9a825':'';
         let tip=(item.selected?'SELECTED · ':'')+(item.master?'MASTER: ':item.review?'REVIEW: ':'')+(item.rejected?'REJECTED · ':'')+sqrFileName(item.row.registered.path)+' — '+title+': '+number(item.value)+(data.kpi.percentage?' ('+item.row.belowMeanCount+' worse; '+item.row.belowMeanAvailable+' assessed of '+item.row.belowMeanTotal+' enabled'+(item.row.belowMeanComplete?'':'; incomplete')+')':'')+(item.master&&data.masterClipped?' (clipped '+data.masterClipped+' axis range)':'')+(item.master?'':' — '+sqrAcquisitionLabel(item.row))+' — Click to select in Review and measurements';
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
      for(let band of (data.guideBands||[]).slice(0,2))
         svg.push('<path class="guide-limit" d="M55 '+y(band.high)+'H385" stroke="'+band.color+'" stroke-width="1" stroke-dasharray="2,3" pointer-events="none"/>');
      if(data.average!==null){let py=y(data.average);svg.push('<g pointer-events="none"><path d="M55 '+py+'H385" stroke="#a6e3a1" stroke-width="1.5" stroke-dasharray="5,3"/><text x="60" y="'+(py-4)+'" fill="#a6e3a1" font-size="9" font-weight="bold">'+number(data.average)+'</text></g>');}
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
      svg.push('<path d="M55 35V175H385" fill="none" stroke="#585b70"/><text x="385" y="17" text-anchor="end" fill="#f9a825" font-size="9">Master: '+number(data.master)+(data.masterClipped?' '+(data.masterClipped==='above'?'↑':'↓')+' clipped':'')+'</text>');
      let legend=data.guideBands?'<div style="text-align:center;font-size:12px;flex-shrink:0;padding:0 8px 4px">'+data.guideBands.map((band,i)=>'<span style="color:'+band.color+'">'+band.label+' '+(i===0?'≤ '+number(band.high):i===1?'> '+number(band.low)+' to '+number(band.high):'> '+number(band.low))+'″</span>').join(' &nbsp;·&nbsp; ')+'</div>':'';
      body=legend+'<div class="chart"><svg viewBox="0 0 400 200" preserveAspectRatio="none">'+svg.join('')+'</svg></div>';
   }
   let script='window.sqrSelection=null;document.querySelectorAll(".frame").forEach(function(el){function select(){window.sqrSelection={generation:'+generation+',index:Number(el.dataset.index)};}el.addEventListener("click",select);el.addEventListener("keydown",function(e){if(e.key==="Enter"||e.key===" "){e.preventDefault();select();}});});';
   let definition=data?.kpi.definition?'<div class="definition">'+sqrHTML(data.kpi.definition)+'</div>':'';
   return '<!doctype html><html><head><meta charset="UTF-8"><style>*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#1e1e2e;color:#cdd6f4;font-family:"Segoe UI",system-ui,sans-serif}.container{height:100%;display:flex;flex-direction:column}.title{height:28px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;letter-spacing:.5px}.definition{flex-shrink:0;text-align:center;padding:0 12px 6px;font-size:12px;line-height:18px;color:#cdd6f4}.chart{flex:1;min-height:0;padding:0 5px 5px}svg{width:100%;height:100%}.frame{cursor:pointer}.frame:hover>[data-frame],.frame:focus>[data-frame]{stroke:#cdd6f4;stroke-width:1.2}.empty{margin:auto;padding:24px;text-align:center;color:#6c7086}</style></head><body><div class="container"><div class="title">'+sqrHTML(title)+'</div>'+definition+body+'</div><script>'+script+'</script></body></html>';
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
   let groups=[],byGroup={};
   for(let i=0;i<registered.length;++i){
      sqrTick(notify,'Matching registered lights '+(i+1)+' / '+registered.length);
      let m=sqrMetadata(registered[i]);if(!sqrIsLight(m))continue;
      let dir=sqrDir(m.path),directoryName=dir.split('/').pop(),key=dir+'|'+m.exposure+'|'+m.width+'x'+m.height+'|'+m.channels;
      let g=byGroup[key];if(!g){g={id:key,directory:dir,directoryName:directoryName,
         label:directoryName,width:m.width,height:m.height,channels:m.channels,exposure:m.exposure,
         filter:m.filter||sqrFilterFromName(directoryName),
         master:'',rows:[],roi:null,regions:null};groups.push(g);byGroup[key]=g;}
      let found=sqrFindOriginal(m,raws);
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
function sqrActiveRegions(o){return o.measureCorners?[0,1,2,3,4,5]:[0];}
/** Measure every submitted job in one native process invocation. Each job
 * identifies a temporary path and its destination row/region. Disable the file
 * cache because temporary crop paths must not reuse another image's metrics. */
function sqrMeasureBatch(jobs,o){
   let p=new SubframeSelector;p.routine=SubframeSelector.MeasureSubframes;p.nonInteractive=true;p.fileCache=false;
   p.subframeScale=1;p.noNoiseAndSignalWarnings=true;p.maxPSFFits=o.maxFits;p.psfFit=SubframeSelector.Moffat4;
   // As in WBPP, submit the entire pending list and leave file threading at
   // SubframeSelector's native defaults.
   p.psfFitCircular=false;p.onError=SubframeSelector.Continue;
   p.subframes=jobs.map(j=>[true,j.path,'','']);
   let ok=p.executeGlobal();
   if(console.abortRequested)throw new Error('Operation aborted.');
   // Parallel processing and failed files can change output order and length.
   // Match the returned file path (column 3), never the result's row position.
   let results=new Map;for(let m of p.measurements)results.set(sqrKey(m[3]),m);
   for(let j of jobs){let m=results.get(sqrKey(j.path));
      j.row.metrics[j.region]=m?sqrMeasurement(m,o.minStars,j.region===0):
         {valid:false,error:ok?'No measurement returned':'Measurement failed'};}
}
/** Stage only missing regions, then run a field pass and an optional regional
 * pass across all groups. Reuse existing metrics and release field scratch files
 * before staging corners. Native Images and scratch files are cleaned up even
 * when a measurement fails or the user aborts. Originals are never staged here. */
function sqrMeasureGroups(groups,o,active,notify){
   let eligible=groups.flatMap(g=>sqrGroupRows(g).filter(r=>!r.measureError&&active.some(i=>!r.metrics[i])).map(r=>({r,g})));
   if(!eligible.length)return;
   let scratch=sqrPath(File.systemTempDirectory)+'/.sqr-work-'+sqrStamp();File.createDirectory(scratch,true);
   let jobs=[],files=[],completed=0;
   let total=eligible.reduce((n,item)=>n+active.filter(i=>!item.r.metrics[i]).length,0);
   let clean=()=>{for(let path of files)if(File.exists(path))File.remove(path);files=[];};
   let measurePass=()=>{if(!jobs.length)return;
      sqrTick(notify,'Measuring '+(jobs[0].region===0?'full fields':'center/corner regions')+' · '+jobs.length+' images · '+completed+' / '+total+' completed');
      sqrMeasureBatch(jobs,o);completed+=jobs.length;clean();jobs=[];
      sqrTick(notify,'Measured '+completed+' / '+total+' regions');
   };
   try{
      // Each pass submits all uncached images across all groups, without size
      // or count limits. Release field files before preparing optional regions.
      for(let regions of [active.filter(i=>i===0),active.filter(i=>i!==0)]){
       for(let index=0;index<eligible.length;++index){
         let {r,g}=eligible[index],im=null;
         if(!regions.some(i=>!r.metrics[i]))continue;
         sqrTick(notify,'Preparing '+(r.isMaster?'master':'frame '+(index+1)+' / '+eligible.length)+' — '+g.label);
         try{im=sqrReadImage(r.registered.path,!!r.isMaster);
            if(im.width!==g.width||im.height!==g.height||im.numberOfNominalChannels!==g.channels)throw new Error('Image dimensions or channels do not match this group: '+r.registered.path);
         }catch(e){if(im)im.free();if(console.abortRequested)throw e;
            for(let region of regions)if(!r.metrics[region]){r.metrics[region]={valid:false,error:String(e)};++completed;}continue;}
         try{for(let region of regions){if(r.metrics[region])continue;
            let rect=g.regions[region];
            sqrTick(notify,'Preparing '+(r.isMaster?'master':'frame '+(index+1)+' / '+eligible.length)+' · '+SQR_REGIONS[region]+' — '+g.label);
            let temp=scratch+'/frame-'+index+'-region-'+region+'.xisf',crop=new Image,writer=null;files.push(temp);
            try{
               crop.assign(im,new Rect(...rect),0,im.numberOfNominalChannels-1);
               // Pixel-only files prevent reuse of calibration-stage signal/noise metadata.
               writer=new FileFormatInstance(new FileFormat('.xisf',false,true));
               if(!writer.create(temp,'compression-codec none'))throw new Error('Cannot create temporary measurement image.');
               let description=new ImageDescription;description.bitsPerSample=im.bitsPerSample;description.ieeefpSampleFormat=true;
               writer.setOptions(description);
               if(!writer.writeImage(crop))throw new Error('Cannot write temporary measurement image.');
            }finally{if(writer)writer.close();crop.free();}
            jobs.push({path:temp,row:r,region:region});
         }}finally{im.free();}
       }
       measurePass();
      }
   }finally{clean();if(File.directoryExists(scratch))File.removeDirectory(scratch);}
}
// Invalidate a master's measurement cache when the file or shared crop changes.
// Master failures are retained as invalid comparison data, not rejection flags.
function sqrPrepareMaster(g,o,active){
   let master=sqrMasterRow(g);if(!master)return;
   try{
      let signature=JSON.stringify({version:SQR_VERSION,file:[g.master,sqrFingerprint(g.master)],roi:g.roi,
         patch:o.patch,minStars:o.minStars,maxFits:o.maxFits});
      if(master.measureSignature!==signature){master.metrics={};delete master.measureError;master.measureSignature=signature;}
   }catch(e){if(console.abortRequested)throw e;master.measureSignature='';
      for(let i of active)master.metrics[i]={valid:false,error:String(e)};}
}
/** Coordinate border discovery, cache validation, measurement and ranking.
 * Signatures include file fingerprints and measurement settings. Weights and
 * the REVIEW percentage are excluded because they only affect derived scores.
 * Enabling corners fills missing regions without discarding valid field metrics. */
function sqrAnalyze(session,notify){
   let o=session.options,active=sqrActiveRegions(o);
   for(let g of session.groups){
      let signature=JSON.stringify({version:SQR_VERSION,method:'clean-crops-v1',patch:o.patch,margin:o.margin,minStars:o.minStars,maxFits:o.maxFits,
         files:g.rows.map(r=>[r.registered.path,sqrFingerprint(r.registered.path)]).sort((a,b)=>a[0].localeCompare(b[0]))});
      if(g.measureSignature===signature&&g.rows.every(r=>active.every(i=>r.metrics[i]))){
         sqrTick(notify,'Using existing subframe measurements: '+g.label);sqrPrepareMaster(g,o,active);
         continue;}
      if(g.measureSignature!==signature){
       let roi=[0,0,g.width,g.height];
       for(let i=0;i<g.rows.length;++i){
         let r=g.rows[i];sqrTick(notify,'Checking registered borders '+(i+1)+' / '+g.rows.length+' — '+g.label);
         r.metrics={};delete r.measureError;
         let im=null;
         try{im=sqrReadImage(r.registered.path);let b=sqrBounds(im,o.margin);roi=[Math.max(roi[0],b[0]),Math.max(roi[1],b[1]),Math.min(roi[2],b[2]),Math.min(roi[3],b[3])];}
         catch(e){r.measureError=String(e);}
         finally{if(im)im.free();}
       }
       if(roi[2]-roi[0]<g.width*.5||roi[3]-roi[1]<g.height*.5)throw new Error('Insufficient common field: '+g.label);
       g.roi=roi;g.regions=sqrRegions(roi,o.patch);g.measureSignature=signature;
      }
      for(let r of g.rows)if(r.measureError)for(let i of active)r.metrics[i]={valid:false,error:r.measureError};
      sqrPrepareMaster(g,o,active);
   }
   sqrMeasureGroups(session.groups,o,active,notify);
   sqrRank(session);return session;
}
// Rank 1 is the largest (worst) finite score. Missing scores receive no rank.
// Caller supplies comparison rows including the master; table filtering is later.
function sqrAssignRanks(rows,scoreKey,rankKey){
   for(let r of rows)r[rankKey]=null;
   let ranked=rows.filter(r=>Number.isFinite(r[scoreKey])).sort((a,b)=>b[scoreKey]-a[scoreKey]||a.registered.path.localeCompare(b.registered.path));
   for(let i=0;i<ranked.length;++i)ranked[i][rankKey]=i+1;
}
/** Calculate the breadth of poor quality before Score, avoiding a dependency
 * cycle. Only positively weighted underlying KPIs count; Score and this fraction
 * itself never count. A fraction uses available comparisons, while completeness
 * records missing ones so a partial percentage cannot look fully assessed.
 * Keep separate field-only and corner-inclusive fractions for independent R1/R2.
 * Baselines include rejected subframes but exclude the integrated master. */
function sqrMeanComparisons(group,o,guideEnabled=false){
   let components=[
      {label:'PSF signal weight',weight:o.signalWeight,lower:true,value:r=>sqrKPIValue(r,SQR_KPIS[1])},
      {label:'Star count',weight:o.starsWeight,lower:true,value:r=>sqrKPIValue(r,SQR_KPIS[2])},
      {label:'Field FWHM',weight:o.fwhmWeight,value:r=>sqrKPIValue(r,SQR_KPIS[3])},
      {label:'Field eccentricity',weight:o.eccentricityWeight,value:r=>sqrKPIValue(r,SQR_KPIS[5])},
      {label:'Corner quality',corner:true,weight:o.cornerWeight,value:r=>r.metrics[0]?.valid&&r.metrics[1]?.valid&&[2,3,4,5].every(i=>sqrEccentricityValid(r.metrics[i]))?r.measuredCornerSeverity:null}
   ];if(guideEnabled)components.push({label:'Guiding quality (arcsec)',guiding:true,weight:o.guideWeight,value:r=>r.guideQuality});
   components=components.filter(c=>c.weight>0);
   for(let c of components){let values=group.rows.map(c.value).filter(Number.isFinite);c.mean=values.length?values.reduce((sum,v)=>sum+v,0)/values.length:null;}
   for(let r of sqrGroupRows(group)){
      let allComparisons=components.filter(c=>!c.guiding||!r.isMaster&&!r.guidingIgnored).map(c=>{let value=c.value(r),available=Number.isFinite(value)&&Number.isFinite(c.mean);
         // Ignore rounding noise at equality; the criterion is a strict worse-than-mean comparison.
         let delta=available?(c.lower?c.mean-value:value-c.mean):0,tolerance=available?1e-12*Math.max(1,Math.abs(value),Math.abs(c.mean)):0;
         return {label:c.label,corner:c.corner,lower:c.lower,value,mean:c.mean,available,worse:available&&delta>tolerance};});
      let fieldComparisons=allComparisons.filter(c=>!c.corner),fraction=items=>{let available=items.filter(c=>c.available);return available.length?available.filter(c=>c.worse).length/available.length:null;};
      r.belowMeanFieldFraction=fraction(fieldComparisons);r.belowMeanCornerFraction=fraction(allComparisons);
      let comparisons=o.measureCorners?allComparisons:fieldComparisons;
      r.belowMeanAvailable=comparisons.filter(c=>c.available).length;r.belowMeanTotal=comparisons.length;
      r.belowMeanComplete=r.belowMeanAvailable===comparisons.length&&comparisons.length>0;
      r.belowMeanCount=r.belowMeanAvailable?comparisons.filter(c=>c.worse).length:null;
      r.belowMeanFraction=r.belowMeanAvailable?r.belowMeanCount/r.belowMeanAvailable:null;
      r.belowMeanDetail=(r.belowMeanFraction===null?'No comparable measurements.':'Below-mean Quality: '+sqrPercent(r.belowMeanFraction)+' ('+r.belowMeanCount+' of '+r.belowMeanAvailable+' assessed indicators have worse-than-mean quality). Lower percentages are better.')+
         '\nEnabled underlying indicators: '+r.belowMeanTotal+'. Score and Below-mean Quality itself are excluded. Arithmetic means use all supported subframes in this group, including rejects; the master is excluded.\n'+
         comparisons.map(c=>c.label+': '+(c.available?sqrFmt(c.value)+' vs mean '+sqrFmt(c.mean)+' — '+(c.worse?'worse':'at or better than mean'):'unavailable')+' ('+(c.lower?'below':'above')+' mean is worse)').join('\n')+
         (r.belowMeanComplete?'':'\nIncomplete comparison; unavailable KPIs are not counted as good.');
   }
}
function sqrMeanQualityLabel(row){return Number.isFinite(row.belowMeanFraction)?sqrPercent(row.belowMeanFraction)+(row.belowMeanComplete?'':'*'):'—';}
/** Recompute derived quality data without changing manual reject decisions.
 * For each group: build robust subframe baselines, evaluate field/corner penalties,
 * compute Below-mean Quality, combine weighted penalties, assign ranks and flag
 * the requested worst fraction. Required missing data adds REVIEW candidates.
 * Lower Score is better. Corner severity is the single worst spatial component;
 * Below-mean Quality contributes its 0..1 fraction directly, not another z-score. */
function sqrRank(session){
   let o=session.options;
   o.eccentricityWeight??=sqrDefaults().eccentricityWeight;
   o.belowMeanWeight??=sqrDefaults().belowMeanWeight;
   o.guideWeight??=sqrDefaults().guideWeight;let guideEnabled=!!session.guiding?.enabled&&o.guideWeight>0&&o.guidingMode!=='ignore';
   if(o.signalWeight+o.starsWeight+o.fwhmWeight+o.eccentricityWeight+(o.measureCorners?o.cornerWeight:0)+(guideEnabled?o.guideWeight:0)<=0)throw new Error('At least one underlying quality indicator must have a positive weight.');
   for(let g of session.groups){
      // Regional widths do not require an independent local signal/noise estimate.
      let all=sqrGroupRows(g);
      for(let r of all)for(let i=0;i<6;++i)if(r.metrics[i]){let m=r.metrics[i];m.valid=sqrMetricValid(m,o.minStars,i===0);if(m.valid)delete m.error;}
      let valid=g.rows.filter(r=>r.metrics[0]?.valid);
      let signal=sqrSummary(valid.map(r=>r.metrics[0].signal)),stars=sqrSummary(valid.map(r=>r.metrics[0].stars)),fwhm=sqrSummary(valid.map(r=>r.metrics[0].fwhm));
      let eccentricity=sqrSummary(valid.filter(r=>sqrEccentricityValid(r.metrics[0])).map(r=>r.metrics[0].eccentricity));
      let corners=[2,3,4,5].map(i=>({width:sqrSummary(valid.filter(r=>r.metrics[i]?.valid).map(r=>r.metrics[i].fwhm)),
         ratio:sqrSummary(valid.filter(r=>r.metrics[i]?.valid&&r.metrics[1]?.valid).map(r=>r.metrics[i].fwhm/r.metrics[1].fwhm)),
         eccentricity:sqrSummary(valid.filter(r=>sqrEccentricityValid(r.metrics[i])).map(r=>r.metrics[i].eccentricity))}));
      let scoring=new Map;
      for(let r of all){r.candidate=false;r.score=null;r.scoreWithoutCorners=null;r.scoreWithCorners=null;r.rank=null;r.reasons=[];r.cornerSeverity=null;r.measuredCornerSeverity=null;r.worstCorner='';
         r.mainIssue='Missing data';r.mainIssueDetail='Field measurement unavailable.';r.scoreContributions=[];
         let missingShape=[2,3,4,5].some(i=>!sqrEccentricityValid(r.metrics[i]));
         let missingFieldShape=o.eccentricityWeight>0&&!sqrEccentricityValid(r.metrics[0]);
         r.needsDataReview=sqrActiveRegions(o).some(i=>!r.metrics[i]?.valid)||(o.measureCorners&&missingShape)||missingFieldShape;
         r.guidingIgnored=sqrIgnoreGuiding(r,o);
         if(guideEnabled&&!r.isMaster&&!r.guidingIgnored&&(!r.guiding?.scorable||r.guiding.dropped>0))r.needsDataReview=true;
         if(r.isMaster){r.reject=false;r.reasons.push('Integrated master: comparison only; cannot be rejected.');}
         let m=r.metrics[0];if(!m?.valid){r.candidate=!r.isMaster;r.reasons.push('Field measurement unavailable');if(r.guiding)r.reasons.push(r.guiding.scorable?r.guiding.category:r.guiding.reason);continue;}
         let cs=[];for(let i=2;i<6;++i)if(r.metrics[i]?.valid){let c=corners[i-2],region=SQR_REGIONS[i],tests=[
            {issue:'Large corner stars',name:'Large '+region.toLowerCase()+' FWHM',value:sqrBad(r.metrics[i].fwhm,c.width,false)},
            {issue:'Large corner stars',name:'High '+region.toLowerCase()+' / center FWHM ratio',value:r.metrics[1]?.valid?sqrBad(r.metrics[i].fwhm/r.metrics[1].fwhm,c.ratio,false):0},
            {issue:'Elongated stars',name:'High '+region.toLowerCase()+' eccentricity',value:sqrEccentricityValid(r.metrics[i])?sqrBad(r.metrics[i].eccentricity,c.eccentricity,false):0}];
            tests.sort((a,b)=>b.value-a.value);cs.push({...tests[0],region});}
         cs.sort((a,b)=>b.value-a.value);let corner=cs.length?cs[0].value:null;
         let parts=[{issue:'Weak signal',name:'Low PSF signal weight',z:sqrBad(m.signal,signal,true),w:o.signalWeight},
            {issue:'Few stars',name:'Low star count',z:sqrBad(m.stars,stars,true),w:o.starsWeight},
            {issue:'Large stars',name:'Large field FWHM',z:sqrBad(m.fwhm,fwhm,false),w:o.fwhmWeight}];
         if(sqrEccentricityValid(m))parts.push({issue:'Elongated stars',name:'High field eccentricity',z:sqrBad(m.eccentricity,eccentricity,false),w:o.eccentricityWeight});
         if(guideEnabled&&!r.isMaster&&r.guiding?.scorable)parts.push({issue:r.guiding.category,name:r.guiding.category,z:r.guidePenalty,w:o.guideWeight,guiding:true});
         r.measuredCornerSeverity=corner;
         r.cornerSeverity=o.measureCorners?corner:null;r.worstCorner=o.measureCorners&&cs.length?cs[0].region:'';
         scoring.set(r,{parts,corner:cs[0],cornerCount:cs.length,missingShape,missingFieldShape});
      }
      // Calculate the breadth penalty from measurements before Score; it never includes
      // Score or itself, and R1/R2 use their own field-only/corner-inclusive fraction.
      sqrMeanComparisons(g,o,guideEnabled);
      for(let r of all){let data=scoring.get(r);if(!data)continue;
         let {missingShape,missingFieldShape}=data;
         let withQuality=(parts,fraction)=>Number.isFinite(fraction)?[...parts,{issue:'Below-mean Quality',name:'Below-mean Quality',z:fraction,w:o.belowMeanWeight,percentage:true}]:parts;
         let weighted=parts=>{let weight=parts.reduce((s,p)=>s+p.w,0);return weight?parts.reduce((s,p)=>s+p.z*p.w,0)/weight:null;};
         let fieldParts=withQuality(data.parts,r.belowMeanFieldFraction),cornerParts=data.corner?[...data.parts,{issue:data.corner.issue,name:data.corner.name,z:data.corner.value,w:o.cornerWeight}]:data.parts;
         cornerParts=withQuality(cornerParts,r.belowMeanCornerFraction);
         r.scoreWithoutCorners=missingFieldShape?null:weighted(fieldParts);
         if(data.cornerCount===4&&!missingShape&&!missingFieldShape&&r.metrics[1]?.valid)r.scoreWithCorners=weighted(cornerParts);
         let parts=o.measureCorners?cornerParts:fieldParts,denominator=parts.reduce((s,p)=>s+p.w,0);r.score=weighted(parts);
         let impacts=parts.filter(p=>p.z>0&&p.w>0).sort((a,b)=>b.z*b.w-a.z*a.w);
         r.scoreContributions=impacts.map(p=>({...p,contribution:p.z*p.w/denominator}));
         r.mainIssue=impacts.length?impacts[0].issue:r.needsDataReview?'Missing data':guideEnabled&&r.guiding?.scorable?r.guiding.category:'None';
         let penaltyText=p=>p.percentage?sqrPercent(p.z):p.z.toFixed(2)+(p.guiding?' guiding penalty':' robust deviations');
         r.mainIssueDetail=impacts.length?impacts[0].name+': '+penaltyText(impacts[0])+' × weight '+impacts[0].w+'; contributes '+sqrFmt(r.scoreContributions[0].contribution)+' to Score.':'No enabled quality penalty.';
         if(r.guiding)r.mainIssueDetail+='\n'+sqrGuideReport(r);
         if(r.needsDataReview)r.mainIssueDetail+=' Some enabled measurements are unavailable; inspect manually.';
         if(missingFieldShape)r.mainIssueDetail+=' Field eccentricity is unavailable.';
         r.reasons=impacts.map(p=>p.name+' ('+penaltyText(p)+')');
         if(r.guiding&&!r.guidingIgnored&&!impacts.some(p=>p.guiding))r.reasons.push(r.guiding.scorable?r.guiding.category:r.guiding.reason);
         if(!r.reasons.length)r.reasons.push('No enabled quality penalty');
         if(r.isMaster)r.reasons.unshift('Integrated master: comparison only; cannot be rejected.');
         r.insufficientCorners=o.measureCorners?4-data.cornerCount:0;
         if(r.needsDataReview)r.reasons.unshift('Insufficient measurements: inspect manually');
         if(o.measureCorners&&missingShape)r.reasons.unshift('Corner eccentricity unavailable: inspect manually');
         if(missingFieldShape)r.reasons.unshift('Field eccentricity unavailable: inspect manually');
      }
      // Comparison ranks include the master; rejection quotas and baselines do not.
      sqrAssignRanks(all,'scoreWithoutCorners','rankWithoutCorners');
      sqrAssignRanks(all,'scoreWithCorners','rankWithCorners');
      let sorted=valid.slice().sort((a,b)=>b.score-a.score||a.registered.path.localeCompare(b.registered.path));
      let count=Math.ceil(sorted.length*o.percent/100);for(let i=0;i<sorted.length;++i){sorted[i].rank=i+1;sorted[i].candidate=i<count||sorted[i].needsDataReview;}
      g.shortlistCount=count;g.rows.sort((a,b)=>Number(b.candidate)-Number(a.candidate)||(b.score??1000000)-(a.score??1000000)||a.registered.path.localeCompare(b.registered.path));
   }
}
function sqrWriteJSON(path,value){File.writeTextFile(path,JSON.stringify(value,null,2));}
// Choose the lowest-scoring kept subframe. Signal strength and filename provide
// deterministic tie-breaks; the master can never become a "best subframe".
function sqrBestRow(group){return group.rows.filter(r=>!r.isMaster&&r.metrics[0]?.valid&&Number.isFinite(r.score)&&!r.reject&&!r.moved)
   .sort((a,b)=>a.score-b.score||b.metrics[0].signal-a.metrics[0].signal||a.registered.path.localeCompare(b.registered.path))[0]||null;}
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
   let journal={schema:1,created:new Date().toISOString(),originals:sqrPath(session.options.originals),destination:dest,
      moves:plan.map(p=>({source:p.source,target:p.target,fingerprint:p.fingerprint,registered:p.registered,status:'planned'}))};
   sqrWriteJSON(journalPath,journal);
   try{for(let i=0;i<plan.length;++i){
      let p=plan[i];sqrTick(notify,'Moving original '+(i+1)+' / '+plan.length);
      if(sqrFingerprint(p.source)!==p.fingerprint||File.exists(p.target))throw new Error('Files changed after move-plan validation.');
      let dir=sqrDir(p.target);if(!File.directoryExists(dir))File.createDirectory(dir,true);
      journal.moves[i].status='moving';sqrWriteJSON(journalPath,journal);
      File.moveFile(p.target,p.source);
      // Update memory before writing the completed entry, so reporting errors do not re-enable a moved source.
      p.row.moved=true;p.row.movedTo=p.target;journal.moves[i].status='moved';
      journal.moves[i].destinationFingerprint=sqrFingerprint(p.target);sqrWriteJSON(journalPath,journal);
   }}catch(e){journal.error=String(e);sqrWriteJSON(journalPath,journal);throw new Error(String(e)+'\nMove journal: '+journalPath);}
   return {count:plan.length,journal:journalPath};
}

// UI is below. Defining SQR_LIBRARY lets read-only test harnesses use the engine.
function sqrTool(parent,resource,tip,action){let b=new ToolButton(parent);b.icon=parent.scaledResource(resource);b.setScaledFixedSize(24,24);b.toolTip=tip;if(action)b.onClick=action;return b;}
function sqrButton(parent,text,fn){let b=new PushButton(parent);b.text=text;b.onClick=fn;return b;}
function sqrRejectIcon(parent,checked){
   let scale=parent.displayPixelRatio||1,size=Math.round(16*scale),bitmap=new Bitmap(size,size);bitmap.fill(0x00000000);
   let p=new Graphics(bitmap);try{p.pen=new Pen(0xff536475,scale);p.fillRect(2*scale,2*scale,14*scale,14*scale,new Brush(0xfff8fafc));p.drawRect(2*scale,2*scale,14*scale,14*scale);
      if(checked){p.pen=new Pen(0xffa12b2b,2*scale);p.drawLine(4*scale,8*scale,7*scale,11*scale);p.drawLine(7*scale,11*scale,12*scale,5*scale);}
   }finally{p.end();}return bitmap;
}
function sqrGroup(parent,title){let g=new GroupBox(parent);g.title=title;g.sizer=new VerticalSizer;g.sizer.margin=10;g.sizer.spacing=8;return g;}
function sqrNumber(parent,label,value,low,high,precision=0){let n=new NumericEdit(parent);n.label.text=label;n.setRange(low,high);n.setPrecision(precision);n.setValue(value);return n;}
// Use current PJSR dialog path properties; text edits and browsing invoke the
// same invalidation callback when an input directory changes.
function sqrFolderRow(parent,label,value,changed){
   let row=new HorizontalSizer;row.spacing=8;let l=new Label(parent);l.text=label;l.setScaledFixedWidth(135);
   let edit=new Edit(parent);edit.text=value;edit.onEditCompleted=()=>changed(edit.text);
   let browse=sqrTool(parent,':/icons/select-file.png','Choose '+label.toLowerCase(),()=>{let d=new GetDirectoryDialog;d.caption=label;d.initialPath=edit.text;if(d.execute()){edit.text=d.directoryPath;changed(edit.text);}});
   row.add(l);row.add(edit,100);row.add(browse);parent.sizer.add(row);return {edit:edit,browse:browse};
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
function sqrFrames(path,reference,o,rect,isMaster=false){
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
function sqrRotationFrame(path,o,rect,display=null){
   let source=null,image=new Image;
   try{
      source=sqrReadImage(path);let channels=source.numberOfNominalChannels;
      if(display&&(source.width!==display.width||source.height!==display.height||channels!==display.channels))
         throw new Error('Rotating subframes must have identical dimensions and channels.');
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
      this.session=session;this.running=false;this.frames=null;this.blinking=false;this.frame=0;this.current=null;this.selectionCleared=false;this.qualityCollapsed=!!o.qualityCollapsed;this.inputsCollapsed=!!o.inputsCollapsed;this.fitPreviewOnShow=false;
      this.timer=new Timer(sqrBlinkInterval(o.blinkInterval),false,this);this.timer.onTimeout=()=>{if(this.blinking&&!this.running)this.advancePlayback();};
      this.intro=new Label(this);this.intro.wordWrapping=true;
      this.intro.text='Rank registered WBPP lights, blink against the filter master or best subframe, and move the originals you manually reject. Corner measurements are optional.';
      this.inputs=new Control(this);this.inputs.sizer=new VerticalSizer;this.inputs.sizer.margin=10;this.inputs.sizer.spacing=8;
      this.inputsBar=new SectionBar(this,'WBPP run and original lights');this.inputsBar.setSection(this.inputs);
      this.inputsBar.toolTip='Click to collapse or expand the folders and log controls. Your paths, settings and measurements are retained.';
      this.inputsBar.toggleSection=()=>this.setInputsCollapsed(!this.inputsCollapsed);
      this.folders={};for(let [key,label] of [['wbpp','WBPP output:'],['originals','Original-light root:'],['destination','Rejected originals:']])
         this.folders[key]=sqrFolderRow(this.inputs,label,o[key],value=>{if(['wbpp','originals'].includes(key)&&this.session&&sqrKey(value.trim())!==sqrKey(this.session.options[key].trim()))this.invalidate();});
      this.inputControls=Object.values(this.folders).flatMap(x=>[x.edit,x.browse]);
      this.autofocusRuns=[];this.autorunFiles=[];this.guideFiles=[];this.parsedGuideLog={sections:[],invalid:0,errors:0};this.loadedLogFolder='';
      this.logFolder=sqrFolderRow(this.inputs,'Log folder (optional):',o.logFolder,()=>this.loadAutorun());
      this.logFolder.edit.toolTip='Read all Autorun_log and PHD2_GuideLog files directly in this folder, excluding _CHN translations. Logs use acquisition-computer local time. Select the folder again to refresh. Clear it to remove autofocus and guiding results; image measurements are retained.';
      let logTools=new HorizontalSizer;logTools.spacing=8;let logLabel=new Label(this.inputs);logLabel.text='Log timestamps:';logLabel.setScaledFixedWidth(135);
      this.logTimeZone=new ComboBox(this.inputs);for(let name of ['Infer from image timestamps','Custom UTC offset'])this.logTimeZone.addItem(name);
      this.logTimeZone.currentItem=o.logTimeZone==='offset'?1:0;
      this.logTimeZone.toolTip='Infer local time minus UTC from filenames and UTC exposure metadata, accounting for filenames written at exposure completion. Ambiguous or missing evidence requires a custom UTC offset; this computer’s timezone is never assumed.';
      this.logUTCOffset=sqrNumber(this.inputs,'UTC offset (hours):',o.logUTCOffset,-12,14,2);
      this.logUTCOffset.toolTip='Log time minus UTC: for example, +2 for UTC+02:00, or +5.5 for UTC+05:30.';this.logUTCOffset.enabled=this.logTimeZone.currentItem===1;
      this.autorunStatus=new Label(this.inputs);this.autorunStatus.text='No log folder selected.';
      this.autorunTimes=sqrButton(this.inputs,'Autofocus times…',()=>this.showAutofocusTimes());
      this.autorunTimes.toolTip='Show all extracted autofocus start times, as written in the log and converted to UTC, with their final focus positions.';
      this.logTimeZone.onItemSelected=()=>{this.logUTCOffset.enabled=this.logTimeZone.currentItem===1;this.parseAutorun();};
      this.logUTCOffset.onValueUpdated=()=>this.parseAutorun();
      logTools.add(logLabel);logTools.add(this.logTimeZone);logTools.add(this.logUTCOffset);logTools.add(this.autorunStatus,100);logTools.add(this.autorunTimes);this.inputs.sizer.add(logTools);
      this.inputControls.push(this.logFolder.edit,this.logFolder.browse,this.logTimeZone,this.logUTCOffset,this.autorunTimes);
      this.logClockStatus=new Label(this.inputs);this.logClockStatus.wordWrapping=true;this.inputs.sizer.add(this.logClockStatus);
      // One native collapsible section, with measurement controls separated
      // from ranking weights. Hiding it never changes measurement state.
      this.settings=new Control(this);this.settings.sizer=new HorizontalSizer;this.settings.sizer.spacing=8;
      this.measurementSettings=sqrGroup(this.settings,'Measurements and review');
      this.scoreSettings=sqrGroup(this.settings,'Score weights');
      this.guideSettings=sqrGroup(this.settings,'Guiding');
      for(let group of [this.measurementSettings,this.scoreSettings,this.guideSettings]){group.sizer.margin=8;group.sizer.spacing=6;this.settings.sizer.add(group,100);}
      this.qualityBar=new SectionBar(this,'Quality evaluation');this.qualityBar.setSection(this.settings);
      this.qualityBar.toolTip='Click to collapse or expand the quality controls. Your settings and measurements are retained.';
      this.qualityBar.toggleSection=()=>this.setQualityCollapsed(!this.qualityCollapsed);
      const qualityRow=(parent,controls,spacing=12)=>{let row=new HorizontalSizer;row.spacing=spacing;for(let c of controls)row.add(c);row.addStretch();parent.sizer.add(row);};
      this.percent=sqrNumber(this.measurementSettings,'Review worst (%):',o.percent,0,100,1);
      this.patch=sqrNumber(this.measurementSettings,'Corner size (%):',o.patch,10,40,0);
      this.margin=sqrNumber(this.measurementSettings,'Edge guard (%):',o.margin,0,15,1);
      this.minStars=sqrNumber(this.measurementSettings,'Minimum stars:',o.minStars,5,1000,0);
      for(let n of [this.percent,this.patch,this.margin])n.label.setScaledFixedWidth(115);
      for(let n of [this.percent,this.patch,this.margin,this.minStars])n.edit.setScaledFixedWidth(42);
      this.percent.toolTip='Shortlist this percentage independently in each comparable WBPP group, rounded up. Review flags do not select files for moving.';
      this.patch.toolTip='Width and height of each corner and center patch as a percentage of the common usable field.';
      this.margin.toolTip='Minimum edge guard. Exact-zero registration padding can increase the common inset.';
      this.cornerMeasurements=new CheckBox(this.measurementSettings);this.cornerMeasurements.text='Measure corners';this.cornerMeasurements.checked=!!o.measureCorners;
      this.cornerMeasurements.toolTip='Off by default. Enable to add one center and four corner measurements per frame. Existing field measurements are reused.';
      qualityRow(this.measurementSettings,[this.percent,this.minStars]);
      qualityRow(this.measurementSettings,[this.margin]);
      qualityRow(this.measurementSettings,[this.patch,this.cornerMeasurements]);
      this.weights={};
      for(let [key,label] of [['signalWeight','PSF signal:'],['starsWeight','Star count:'],['fwhmWeight','Field FWHM:'],['eccentricityWeight','Field eccentricity:'],['cornerWeight','Corner quality:'],['belowMeanWeight','Below-mean Quality:']]){
         let n=sqrNumber(this.scoreSettings,label,o[key],0,100,0);this.weights[key]=n;n.label.setScaledFixedWidth(130);n.edit.setScaledFixedWidth(36);n.toolTip='Relative influence on the ranking. Zero disables this component.';
         n.onValueUpdated=()=>this.rerank();
      }
      for(let keys of [['signalWeight','starsWeight'],['fwhmWeight','eccentricityWeight'],['cornerWeight','belowMeanWeight']])qualityRow(this.scoreSettings,keys.map(k=>this.weights[k]));
      this.weights.eccentricityWeight.toolTip='Weight of field star elongation compared with the group. Higher eccentricity increases Score. Zero disables this component; no extra measurement pass is needed.';
      this.weights.cornerWeight.toolTip='Weight of the worst corner deviation in FWHM, corner/center FWHM ratio or eccentricity. Each metric is compared with that same corner across the group. Zero disables the corner contribution.';
      this.weights.belowMeanWeight.toolTip='Relative weight of the fraction of underlying indicators with worse-than-mean quality. For example, 75% contributes 0.75 times this weight before normalization. Score and this fraction itself are excluded from the comparison. Zero removes this Score component without hiding the percentage.';
      this.guideModeLabel=new Label(this.guideSettings);this.guideModeLabel.text='Guiding in Score:';this.guideModeLabel.setScaledFixedWidth(115);
      this.guidingMode=new ComboBox(this.guideSettings);for(let label of ['Require guiding data','Use available guiding data','Ignore guiding KPI'])this.guidingMode.addItem(label);
      this.guidingMode.currentItem=Math.max(0,['require','available','ignore'].indexOf(o.guidingMode));
      this.guidingMode.toolTip='Require: missing or incomplete guiding data flags the frame for review. Use available: omit missing guiding from that frame’s Score and Below-mean Quality, without a missing-guiding review flag. Ignore: omit guiding from all scores and review flags. Measurements remain visible in every mode.';
      this.weights.guideWeight=sqrNumber(this.guideSettings,'Weight:',o.guideWeight,0,100,0);this.weights.guideWeight.label.setScaledFixedWidth(115);this.weights.guideWeight.edit.setScaledFixedWidth(36);this.weights.guideWeight.onValueUpdated=()=>this.rerank();
      this.guideHint=new Label(this.guideSettings);this.guideHint.wordWrapping=true;this.guideHint.text=sqrGuideThresholdText(null);
      this.guidingMode.onItemSelected=()=>{this.weights.guideWeight.enabled=this.guidingMode.currentItem!==2;this.rerank();};this.weights.guideWeight.enabled=this.guidingMode.currentItem!==2;
      // Match both the label alignment and label-to-control spacing of NumericEdit.
      this.guideModeLabel.textAlignment=this.weights.guideWeight.label.textAlignment;
      qualityRow(this.guideSettings,[this.guideModeLabel,this.guidingMode],this.weights.guideWeight.sizer.spacing);
      qualityRow(this.guideSettings,[this.weights.guideWeight]);this.guideSettings.sizer.add(this.guideHint);
      this.cornerMeasurements.onCheck=()=>{this.updateCornerControls();this.rerank();this.status.text=this.cornerMeasurements.checked?'Corner analysis enabled. Use the magnifier to measure any missing center and corner data.':'Corner analysis disabled. Ranking uses field measurements only.';};
      this.updateCornerControls();
      this.maxFits=o.maxFits;
      this.percent.onValueUpdated=()=>this.rerank();
      for(let n of [this.patch,this.margin,this.minStars])n.onValueUpdated=()=>this.invalidateMeasurements();
      this.groupRow=new HorizontalSizer;this.groupRow.spacing=8;
      let groupLabel=new Label(this);groupLabel.text='Filter / group:';
      this.groupSelect=new ComboBox(this);this.groupSelect.onItemSelected=()=>{this.clearFrames();this.current=null;this.selectionCleared=false;this.populateRows();};
      this.scanButton=sqrButton(this,'Scan files',()=>this.scan());
      this.groupRow.add(groupLabel);this.groupRow.add(this.groupSelect,100);this.groupRow.add(this.scanButton);
      this.tabs=new TabBox(this);this.reviewPage=new Control(this.tabs);this.blinkPage=new Control(this.tabs);this.histogramPage=new Control(this.tabs);this.scatterPage=new Control(this.tabs);
      this.table=new TreeBox(this.reviewPage);this.table.numberOfColumns=20;this.table.headerVisible=true;this.table.rootDecoration=false;
      this.table.alternateRowColor=true;this.table.multipleSelection=false;this.table.setScaledMinSize(1280,320);
      let headers=['R1','R2','Reject','Review','Image','Acquisition time (UTC)','Score','PSF weight','FWHM (px)','Stars','Main issue','Field eccentricity','Corner quality','Below-mean Quality','Guiding quality (″)','Guide avg (″)','Guide min (″)','Guide max (″)','Worst corner','Original association'];
      for(let i=0;i<headers.length;++i)this.table.setHeaderText(i,headers[i]);
      this.rejectIcons=[sqrRejectIcon(this,false),sqrRejectIcon(this,true)];
      // Native mouse focus changes precede onMousePress/onNodeClicked. Mouse selection
      // is committed by the click handler; keyboard navigation is synchronized separately.
      this.table.onMousePress=()=>{this.keyboardNavigation=false;return false;};
      this.table.onCurrentNodeUpdated=node=>{if(this.keyboardNavigation&&!this.populating&&node?.row)this.selectRow(node.row);};
      this.table.onNodeClicked=(node,column)=>{if(!node?.row||this.populating)return;
         if(column===2){this.selectRow(node.row);this.decide(!node.row.reject);}
         else if(this.current===node.row)this.clearSelection();else this.selectRow(node.row);};
      this.table.onKeyPress=key=>{if(key===Key_Space){if(this.current)this.decide(!this.current.reject);return true;}
         this.keyboardNavigation=true;if(this.table.currentNode?.row)this.selectRow(this.table.currentNode.row);return false;};
      this.table.onKeyRelease=key=>{this.keyboardNavigation=false;if(key!==Key_Space&&this.table.currentNode?.row)this.selectRow(this.table.currentNode.row);return false;};
      this.table.onNodeDoubleClicked=(node,column)=>{if(node?.row&&column!==2){this.selectRow(node.row);this.populating=true;this.table.currentNode=node;node.selected=true;this.populating=false;this.inspect();}};
      this.details=new Label(this.reviewPage);this.details.wordWrapping=true;this.details.minHeight=4*this.font.height;
      this.reviewOptions=sqrGroup(this.reviewPage,'Sort and filter');
      let reviewTools=new HorizontalSizer;reviewTools.spacing=10;
      let sortLabel=new Label(this.reviewOptions);sortLabel.text='Sort by:';
      this.order=new ComboBox(this.reviewOptions);for(let s of ['Score','PSF signal weight','Star count','Field FWHM','Corner severity','Filename','R1: field rank','R2: rank with corners','Acquisition time','Below-mean Quality','Guide minimum','Guide maximum','Guide average'])this.order.addItem(s);
      this.order.setScaledMinWidth(165);this.order.toolTip='Choose a criterion, then use the direction button to switch ascending or descending order. A new criterion starts in its default direction: poorest quality first, filename A to Z, or earliest acquisition first. R1 and R2 use rank 1 for worst. Acquisition time uses the original observation timestamp, then registered metadata; filename suffixes do not affect this order.';
      this.order.toolTip+=' Guide minimum, maximum and average start with the largest error first. Missing values follow in either direction, with the master last.';
      this.order.currentItem=Number.isInteger(o.reviewOrder)&&o.reviewOrder>=0&&o.reviewOrder<this.order.numberOfItems?o.reviewOrder:0;
      this.reviewReverse=!!o.reviewReverse;
      this.sortDirection=sqrButton(this.reviewOptions,'',()=>{if(this.running)return;this.reviewReverse=!this.reviewReverse;this.changeReviewSort();});
      this.sortDirection.setScaledMinWidth(125);
      let filterLabel=new Label(this.reviewOptions);filterLabel.text='Filter:';
      this.candidatesOnly=new CheckBox(this.reviewOptions);this.candidatesOnly.text='REVIEW candidates only';this.candidatesOnly.onCheck=()=>this.populateRows();
      this.candidatesOnly.toolTip='Show only subframes flagged REVIEW. The master is hidden. This does not select originals for rejection.';
      this.order.onItemSelected=()=>{this.reviewReverse=false;this.changeReviewSort();};
      reviewTools.add(sortLabel);reviewTools.add(this.order);reviewTools.add(this.sortDirection);reviewTools.addStretch();reviewTools.add(filterLabel);reviewTools.add(this.candidatesOnly);
      this.reviewSummary=new Label(this.reviewOptions);this.reviewOptions.sizer.add(reviewTools);this.reviewOptions.sizer.add(this.reviewSummary);
      let reviewHint=new Label(this.reviewPage);reviewHint.text='R1 = field-only rank · R2 = rank including corners · 1 = worst; — = unavailable. Below-mean Quality = % of assessed indicators worse than mean; * = incomplete.\nClick a selected row to deselect it. Click Reject (or press Space) to mark an original. Double-click an image to blink.';
      this.reviewPage.sizer=new VerticalSizer;this.reviewPage.sizer.margin=6;this.reviewPage.sizer.spacing=8;
      this.reviewPage.sizer.add(this.reviewOptions);this.reviewPage.sizer.add(this.table,100);this.reviewPage.sizer.add(reviewHint);this.reviewPage.sizer.add(this.details);
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
      this.kpiDirection=new Label(this.histogramPage);this.kpiDirection.wordWrapping=true;histogramTools.add(kpiLabel);histogramTools.add(this.kpiSelect);histogramTools.add(this.kpiDirection,100);
      let plotOrderLabel=new Label(this.histogramPage);plotOrderLabel.text='Order by:';
      this.histogramOrder=new ComboBox(this.histogramPage);this.histogramOrder.addItem('KPI value');this.histogramOrder.addItem('Acquisition time');
      this.histogramOrder.currentItem=o.histogramOrder==='time'?1:0;this.histogramOrder.setScaledMinWidth(150);
      this.histogramOrder.toolTip='KPI value: lowest to highest. Acquisition time: earliest first, master first, unknown times last. This order is independent of the review table.';
      this.histogramOrder.onItemSelected=()=>this.updateHistogram();histogramTools.add(plotOrderLabel);histogramTools.add(this.histogramOrder);
      this.histogram=new WebView(this.histogramPage);this.histogram.setScaledMinSize(1280,320);
      this.histogram.toolTip='Cyan: currently selected image. Purple: REVIEW candidate. Gold: master. Red: rejected. Click a bar to select that image in Review and measurements. Axis range follows subframes; outlying master values are clipped.';
      this.plotGeneration=0;this.plotReady=false;this.plotRequestPending=false;
      this.plotTimer=new Timer(.15,true,this);
      this.plotTimer.onTimeout=()=>{
         let scatter=this.tabs.currentPageIndex===3;if(this.running||(!scatter&&this.tabs.currentPageIndex!==2))return;
         if(scatter?(!this.scatterReady||this.scatterRequestPending):(!this.plotReady||this.plotRequestPending))return;
         if(scatter)this.scatterRequestPending=true;else this.plotRequestPending=true;
         (scatter?this.scatter:this.histogram).evaluateScript('(function(){var selection=window.sqrSelection;window.sqrSelection=null;return selection?JSON.stringify(selection):null;})()');};
      this.histogram.onLoadFinished=ok=>{this.plotReady=ok;};
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
      this.scatterGeneration=0;this.scatterReady=false;this.scatterRequestPending=false;
      this.scatter.onLoadFinished=ok=>{this.scatterReady=ok;};
      this.scatter.onScriptResultAvailable=value=>{this.scatterRequestPending=false;if(typeof value!=='string')return;
         try{this.selectPlotImage(JSON.parse(value),true);}catch(e){this.error(e);}};
      this.scatter.onShow=()=>this.plotTimer.start();this.scatter.onHide=()=>this.plotTimer.stop();
      this.scatterSummary=new Label(this.scatterPage);this.scatterSummary.wordWrapping=true;this.scatterSummary.minHeight=2*this.font.height;
      this.scatterPage.sizer=new VerticalSizer;this.scatterPage.sizer.margin=6;this.scatterPage.sizer.spacing=10;
      this.scatterPage.sizer.add(scatterTools);this.scatterPage.sizer.add(this.correlationSummary);this.scatterPage.sizer.add(this.scatter,100);this.scatterPage.sizer.add(this.scatterSummary);
      this.tabs.addPage(this.reviewPage,'Review and measurements');this.tabs.addPage(this.blinkPage,'Blink frame / reference');this.tabs.addPage(this.histogramPage,'Quality indicators');this.tabs.addPage(this.scatterPage,'Correlation plot');
      this.status=new Label(this);this.status.wordWrapping=true;this.status.minHeight=this.font.height;
      this.status.text='Scan files to verify original associations. Magnifier: measure. Green checkmark: move manually rejected originals.';
      this.pixelScaleStatus=new Label(this);this.pixelScaleStatus.wordWrapping=true;this.pixelScaleStatus.minHeight=this.font.height;
      let messages=new VerticalSizer;messages.spacing=2;messages.add(this.status);messages.add(this.pixelScaleStatus);
      this.instance=sqrTool(this,':/process-interface/new-instance.png','Drag to save folder and evaluation settings as a process icon.');
      this.instance.onMousePress=()=>{Parameters.clear();Parameters.set('configJSON',JSON.stringify(this.options()));this.newInstance();};
      this.calculate=sqrTool(this,':/toolbar/view-zoom.png','Measure registered frames and rank review candidates.',()=>this.analyze());
      this.reset=sqrTool(this,':/process-interface/reset.png','Reset evaluation and display settings. Folder paths are retained.',()=>this.resetSettings());
      this.moveButton=sqrTool(this,':/process-interface/execute.png','Review the move plan, then move only manually rejected original lights.',()=>this.moveRejected());
      this.closeButton=sqrTool(this,':/process-interface/cancel.png','Close the review. Measurements and pending decisions are kept only while this dialog is open.',()=>this.cancel());
      this.helpButton=sqrTool(this,':/process-interface/browse-documentation.png','Open the PIDoc user guide.',sqrShowDocumentation);
      let actions=new HorizontalSizer;actions.spacing=8;actions.add(this.instance);actions.add(this.calculate);actions.add(this.reset);actions.addStretch();actions.add(this.moveButton);actions.add(this.closeButton);actions.add(this.helpButton);
      let content=new VerticalSizer;content.margin=10;content.spacing=8;content.add(this.intro);content.add(this.inputsBar);content.add(this.inputs);content.add(this.qualityBar);content.add(this.settings);content.add(this.groupRow);content.add(this.tabs,100);content.add(messages);content.add(actions);
      // A zero-width spacer reserves the expanded minimum height. Native layouts
      // recompute a dialog/TabBox minimum when children hide, so their minHeight
      // properties alone cannot prevent a collapsed window being made too small.
      this.sectionSizeGuard=new Control(this);this.sectionSizeGuard.setFixedSize(0,0);
      this.sizer=new HorizontalSizer;this.sizer.add(content,100);this.sizer.add(this.sectionSizeGuard);
      this.onClose=()=>{if(this.running)return false;this.plotTimer.stop();this.stopBlink();this.clearFrames();return true;};
      this.onHide=()=>{this.plotTimer.stop();this.stopBlink();};
      this.tabs.onPageSelected=()=>{this.stopBlink();this.plotTimer.stop();if(this.tabs.currentPageIndex===2)this.updateHistogram();else if(this.tabs.currentPageIndex===3)this.updateScatter();if(this.tabs.currentPageIndex===2||this.tabs.currentPageIndex===3)this.plotTimer.start();this.ensurePreview();};this.loadAutorun(false);this.populateGroups();this.updateButtons();this.adjustToContents();
      // Leave two physical pixels for native layout rounding on first show.
      this.sectionSizeGuard.setFixedHeight(Math.max(this.height,this.smartMinHeight)+2);this.setInputsCollapsed(o.inputsCollapsed);this.setQualityCollapsed(o.qualityCollapsed);
   }
   // Snapshot controls into serializable settings; derived measurements and
   // rejection decisions stay in the session and are never process parameters.
   options(){let o=sqrDefaults();for(let k of Object.keys(this.folders))o[k]=this.folders[k].edit.text.trim();
      for(let k of ['percent','patch','margin','minStars'])o[k]=this[k].value;for(let k of Object.keys(this.weights))o[k]=this.weights[k].value;
      o.measureCorners=this.cornerMeasurements.checked;o.reference=['master','best','sequence'][this.reference.currentItem];o.blinkInterval=this.blinkInterval.value;
      o.regionRotation=['off','image','blink'][this.regionRotation.currentItem];
      o.logFolder=this.logFolder.edit.text.trim();o.logTimeZone=['auto','offset'][this.logTimeZone.currentItem];o.logUTCOffset=this.logUTCOffset.value;
      o.guidingMode=['require','available','ignore'][this.guidingMode.currentItem];
      o.qualityCollapsed=this.qualityCollapsed;o.inputsCollapsed=this.inputsCollapsed;
      o.scatterX=sqrKPIKey(this.scatterKPIs[this.scatterX.currentItem]);o.scatterY=sqrKPIKey(this.scatterKPIs[this.scatterY.currentItem]);
      o.reviewOrder=this.order.currentItem;o.reviewReverse=this.reviewReverse;
      o.maxFits=this.maxFits;o.displaySTF=this.displaySTF.checked;o.alignBrightness=this.alignBrightness.checked;o.histogramOrder=this.histogramOrder.currentItem===1?'time':'value';return o;}
   updateCornerControls(){this.patch.enabled=this.weights.cornerWeight.enabled=this.cornerMeasurements.checked;}
   // Visibility also depends on ancestors: before the dialog is shown, every
   // child reports hidden. Persist the requested state independently, and set
   // the body visibility explicitly when restoring a saved process instance.
   // SectionBar normally calls dialog.adjustToContents(), resizing the window.
   // Our toggles change only visibility; the stretchable tab absorbs the space.
   setQualityCollapsed(collapsed){this.qualityCollapsed=!!collapsed;this.settings.visible=!this.qualityCollapsed;this.qualityBar.updateIcon();this.ensureLayoutUpdated();this.syncOptions();}
   setInputsCollapsed(collapsed){this.inputsCollapsed=!!collapsed;this.inputs.visible=!this.inputsCollapsed;this.inputsBar.updateIcon();this.ensureLayoutUpdated();this.syncOptions();}
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
   setStatus(s){this.status.text=s;CoreApplication.processEvents();}
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
   clearFrames(resetView=true,preserveRotation=false,preservePlayback=false,preserveRegions=false){if(preservePlayback)this.timer.stop();else this.stopBlink();if(!preserveRotation)this.rotationDisplay=null;if(resetView){this.viewer.reset();this.viewer.clearPixelReadout();this.fitPreviewOnShow=false;this.savedPreviewView=null;}if(this.frames&&!this.framesFromRegions)for(let b of this.frames)b.clear();this.frames=null;this.framesFromRegions=false;this.loadedReference=null;if(!preserveRegions)this.clearRegionFrames();}
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
   loadAutorun(refresh=true){
      if(this.running)return;
      this.autofocusRuns=[];this.autorunFiles=[];this.guideFiles=[];this.ignoredAutorunCHN=0;this.autorunError='';this.loadedLogFolder=this.logFolder.edit.text.trim();
      if(this.loadedLogFolder)try{let loaded=sqrReadLogFolder(this.loadedLogFolder);this.autorunFiles=loaded.files;this.guideFiles=loaded.guideFiles;this.ignoredAutorunCHN=loaded.ignoredCHN;}
      catch(e){this.autorunError='Cannot read log folder: '+(e.message||String(e));}
      this.parsedGuideLog=sqrParseGuideFiles(this.guideFiles);
      this.parseAutorun(refresh);
   }
   // Convert both log types with the same camera-derived clock. Guide CSV is
   // cached; rematching/ranking never repeats PSF measurements or pixel reads.
   parseAutorun(refresh=true){
      let zone=['auto','offset'][this.logTimeZone.currentItem],clock=sqrInferLogClock(this.session,zone,this.logUTCOffset.value);
      let result=sqrParseAutorunFiles(this.autorunFiles,wall=>sqrLocalToUTC(wall,clock));
      this.logClock=clock;this.logClockStatus.text=this.loadedLogFolder?sqrClockText(clock):'Log timestamps use local time; image metadata uses UTC.';
      this.logClockStatus.toolTip=clock.mode==='offset'?'Custom offset applied to both Autorun and PHD2 logs.':clock.anchors.length+' image timestamps support the offset; '+clock.endNames+' filenames use exposure completion; '+clock.unresolved+' unresolved image timestamps. Both log types use this same conversion.';
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
   invalidate(){if(this.running)return;this.session=null;this.current=null;this.clearFrames();this.parseAutorun(false);this.populateGroups();this.status.text='Folder selection changed. Scan files again.';}
   // Geometry/measurement changes invalidate metrics and derived scores, but
   // keep original associations and the user's manual rejection decisions.
   invalidateMeasurements(){if(this.running||!this.session)return;for(let g of this.session.groups){g.measureSignature='';for(let r of sqrGroupRows(g)){r.measureSignature='';r.metrics={};r.score=null;r.scoreWithoutCorners=null;r.scoreWithCorners=null;r.rankWithoutCorners=null;r.rankWithCorners=null;r.candidate=false;r.reasons=[];r.mainIssue='';r.mainIssueDetail='';r.scoreContributions=[];r.cornerSeverity=null;r.measuredCornerSeverity=null;r.worstCorner='';r.belowMeanCount=null;r.belowMeanFraction=null;r.belowMeanFieldFraction=null;r.belowMeanCornerFraction=null;r.belowMeanAvailable=0;r.belowMeanTotal=0;r.belowMeanComplete=false;r.belowMeanDetail='';}}
      this.syncOptions();this.clearFrames();this.populateRows();this.status.text='Evaluation regions changed. Measure again before using the ranking.';}
   rerank(){if(this.running)return;if(!this.session){this.updateHistogram();return;}try{this.syncOptions();for(let g of this.session.groups)for(let r of sqrGroupRows(g))r.guidingIgnored=sqrIgnoreGuiding(r,this.session.options);if(this.session.groups.some(g=>g.rows.some(r=>r.metrics[0])))sqrRank(this.session);this.populateRows();}catch(e){this.error(e);}}
   busy(value){this.running=value;for(let c of [...this.inputControls,this.inputsBar,this.qualityBar,this.settings,this.scanButton,this.groupSelect,this.tabs,this.instance,this.calculate,this.reset,this.moveButton,this.closeButton,this.helpButton])c.enabled=!value;this.logUTCOffset.enabled=!value&&this.logTimeZone.currentItem===1;this.autorunTimes.enabled=!value&&!!this.loadedLogFolder;this.updateButtons();}
   updateButtons(){let ready=!!this.session&&!this.running,selected=!!this.current,original=selected&&!this.current.isMaster&&!this.current.moved;
      this.reference.enabled=!this.running&&this.regionRotation.currentItem!==1;this.regionRotation.enabled=!this.running;
      this.moveButton.enabled=ready&&this.session.groups.some(g=>g.rows.some(r=>r.reject&&!r.moved));
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
      this.populating=true;this.table.clear();let g=this.group();
      this.updatePixelScale();
      let rows=sqrReviewRows(g,this.candidatesOnly.checked,this.order.currentItem,this.reviewReverse);
      this.visibleRows=rows;
      let descending=[0,3,4,9,10,11,12].includes(this.order.currentItem)!==this.reviewReverse;
      this.sortDirection.text=descending?'Descending ↓':'Ascending ↑';
      let directions=this.reviewReverse?
         ['Lowest first (best first)','Highest first (best first)','Most first (best first)','Smallest first (best first)','Lowest first (best first)','Z to A','Highest rank first (best first)','Highest rank first (best first)','Latest first · undated frames next · master last','Lowest % first · incomplete last']:
         ['Highest first (worst first)','Lowest first (worst first)','Fewest first (worst first)','Largest first (worst first)','Highest first (worst first)','A to Z','Rank 1 first (worst first)','Rank 1 first (worst first)','Earliest first · undated frames next · master last','Highest % first · incomplete last'];
      let guideDirection=(this.reviewReverse?'Smallest error first (best first)':'Largest error first (worst first)')+' · unavailable next · master last';
      this.sortDirection.toolTip=(this.order.currentItem>=10?guideDirection:directions[this.order.currentItem])+'. Click to reverse the order. Sorting preserves the selected image and rejection decisions.';
      this.reviewSummary.text=g?'Showing '+rows.filter(r=>!r.isMaster).length+' of '+g.rows.length+' subframes · '+g.rows.filter(r=>r.candidate).length+' REVIEW candidates'+(g.master?(this.candidatesOnly.checked?' · master hidden by filter':' · master included for comparison'):''):'Scan files to populate the review list.';
      let kpiCell=value=>Number.isFinite(value)?sqrFmt(value):'—';
      if(g)for(let r of rows){let node=new TreeBoxNode(this.table);node.row=r;if(!r.isMaster&&!r.moved)node.setIcon(2,this.rejectIcons[r.reject?1:0]);
         let m=r.metrics[0]||{},cells=[r.rankWithoutCorners===null||r.rankWithoutCorners===undefined?'—':String(r.rankWithoutCorners),r.rankWithCorners===null||r.rankWithCorners===undefined?'—':String(r.rankWithCorners),r.isMaster?'—':r.moved?'Moved':'',r.isMaster?'Master':r.candidate?'REVIEW':'',sqrFileName(r.registered.path),sqrAcquisitionText(r),sqrFmt(r.score,2),sqrFmt(m.signal),sqrFmt(m.fwhm),Number.isFinite(m.stars)?String(m.stars):'—',r.mainIssue||'—',kpiCell(sqrEccentricityValid(m)?m.eccentricity:null),kpiCell(sqrKPIValue(r,SQR_KPIS.find(k=>k.key==='cornerSeverity'))),sqrMeanQualityLabel(r),kpiCell(r.guideQuality),sqrGuideCell(r,'guideAvg'),sqrGuideCell(r,'guideMin'),sqrGuideCell(r,'guideMax'),r.worstCorner||'—',r.match];
         for(let i=0;i<cells.length;++i){node.setText(i,cells[i]);node.setToolTip(i,i===4?r.registered.path+(r.isMaster?'':'\n'+sqrAcquisitionLabel(r)):i===19?(r.original?.path||r.match):cells[i]);}
         node.setToolTip(0,'Field-only rank: 1 = worst Score. Includes the master; independent of table filters. Field-only Score: '+sqrFmt(r.scoreWithoutCorners));
         node.setToolTip(1,Number.isFinite(r.rankWithCorners)?'Rank including corner FWHM and eccentricity: 1 = worst Score. Includes the master; computed from available measurements even when Measure corners is off. Score: '+sqrFmt(r.scoreWithCorners):'Requires valid field, center and all four corner measurements including corner eccentricity, and a positive enabled weight.');
         node.setToolTip(2,r.isMaster?'The master cannot be rejected.':r.moved?'Original already moved.':'Click to '+(r.reject?'keep':'reject')+' this original, or select the row and press Space.');
         node.setToolTip(5,r.isMaster?'Integrated master: no single acquisition time.':sqrAcquisitionLabel(r)+'\nSame timestamp used for acquisition-time sorting and histograms. Original observation time, with registered metadata as fallback.');
         for(let i=15;i<=17;++i)node.setToolTip(i,['Arithmetic average','Minimum','Maximum'][i-15]+' combined RA/Dec displacement during the exposure, in arcseconds; not RMS.\n'+sqrGuideReport(r)+(r.guiding&&!r.guiding.scorable?'\n* Partial/unusable for Score.'+(r.guidingIgnored?'':' Inspect manually.'):''));
         for(let [column,key,meaning] of [
            [11,'0:eccentricity','Field star eccentricity, from 0 (round) toward 1 (elongated). Lower is rounder.'],
            [12,'cornerSeverity','Largest corner-quality penalty from corner FWHM, corner/center FWHM ratio, or eccentricity, relative to the group. Lower is better. Stored measurements remain visible when corner scoring is off.'],
            [14,'guideQuality','Combined guiding quality = (minimum + 2 × average + maximum) / 4, in arcseconds. Lower is better. Only usable exposure coverage produces a value.']]){
            let kpi=SQR_KPIS.find(k=>sqrKPIKey(k)===key);
            let inclusion=column===14&&r.isMaster?'Excluded from Score (master has no guiding interval)':sqrKPIScoreInfo(kpi,this.session.options,!!this.session.guiding?.enabled);
            node.setToolTip(column,meaning+'\n'+inclusion+'.'+(column===14?'\n'+sqrGuideReport(r):'')+(sqrKPIValue(r,kpi)===null?'\nMeasurement unavailable for this image.':''));
         }
         node.setToolTip(6,r.mainIssueDetail||'Measure the image to calculate its weighted quality Score.');
         node.setToolTip(13,r.belowMeanDetail||'Measure the image to calculate the percentage of assessed indicators with worse-than-mean quality. Score is excluded.');
         node.setToolTip(10,r.mainIssueDetail||'Measure the image to identify the largest weighted contribution to Score.');
      }
      for(let i=0;i<this.table.numberOfColumns;++i)this.table.adjustColumnWidthToContents(i);this.table.setColumnWidth(4,Math.round(250*this.displayPixelRatio));
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
      let xKPI=this.scatterKPIs[this.scatterX.currentItem],yKPI=this.scatterKPIs[this.scatterY.currentItem];
      for(let [control,kpi] of [[this.scatterX,xKPI],[this.scatterY,yKPI]])control.toolTip=kpi.direction+(kpi.corners?' · Requires regional measurements; stored values remain available with corner scoring off.':kpi.guiding?' · Requires guiding logs matched to the exposure.':'');
      let data=this.scatterData=sqrScatterPlot(this.group(),xKPI,yKPI,this.current);
      this.correlationSummary.text=sqrCorrelationText(data.correlation);
      this.correlationSummary.toolTip='Pearson correlation uses the '+data.count+' plotted subframe pairs, including rejected frames. The master is excluded.\nStrength by |r|: 0 = none; above 0 and below 0.3 = weak; 0.3 to below 0.7 = moderate; 0.7 to below 1 = strong; 1 = perfect.\nPositive: both values increase together. Negative: as X increases, Y decreases. Direction refers to KPI values, not whether image quality improves. Zero means no linear relationship.\nAt least two paired subframes and variation in both KPIs are required.';
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
      let data=this.histogramData=sqrMetricPlot(g,kpi,this.cornerMeasurements.checked,this.current,this.histogramOrder.currentItem===1?'time':'value',this.autofocusRuns||[],sqrGuidingScale(sqrSessionPixelScale(this.session)));
      this.kpiDirection.text=kpi.direction+' · '+sqrKPIScoreInfo(kpi,this.options(),!!this.session?.guiding?.enabled);
      if(kpi.guiding&&kpi.key!=='guideQuality')this.kpiDirection.text+=' · '+this.guideHint.text;
      this.kpiDirection.toolTip=this.kpiDirection.text+(kpi.definition?'\n'+kpi.definition:'')+'\nInclusion follows the current quality settings. Each image requires valid measurements; unavailable values do not count as good quality.\nCenter FWHM is used in corner/center ratios. Corner measurements feed the worst corner-quality penalty. Guide minimum, average and maximum feed the combined guiding-quality penalty, only where guiding coverage is usable. The master has no guiding contribution.';
      this.histogramSummary.text=data.message||('One bar per frame · '+(data.order==='time'?'acquisition time: earliest first · master first · unknown times last':'ascending '+kpi.label)+' · '+data.count+' measured subframes'+(data.missing?' · '+data.missing+' unavailable':'')+'. Click a bar to select its image in Review and measurements.\n'+
         'Cyan: selected · purple: REVIEW · blue: other kept · red: rejected · gold: master · green dashed: kept mean.\n'+
         (data.guideBands?'Background: green = Good · amber = Medium · red = Bad. Axis includes all three guiding ranges. ':'Axis fits subframes. ')+(data.hasMaster?'Master: '+sqrKPIPlotNumber(data.master,kpi)+(data.masterClipped?' (clipped '+data.masterClipped+' axis range)':''):'No master matched.')+
         (data.showAutofocus?' · '+data.autofocus.length+' autofocus starts in range. Orange: autofocus start and focus position; hover AF for details.':''));
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
   updateDetails(){let r=this.current,g=this.group();if(!r){this.details.text='No image selected.';this.frameLabel.text='No frame selected';return;}
      let metrics=SQR_REGIONS.map((n,i)=>{let m=r.metrics[i];return n+': '+(m?.valid?sqrFmt(m.fwhm,2)+' px, e='+sqrFmt(m.eccentricity,2)+', '+m.stars+' stars':m?'insufficient data':'not measured');});
      let guide=r.guiding?(r.guiding.scorable?r.guiding.category:r.guiding.reason)+(r.guidingIgnored?' (excluded from Score)':'')+(r.guiding.dropped?' · '+r.guiding.dropped+' rejected guide samples':''):'';
      this.details.text=(r.reasons||[]).slice(0,2).join(' · ')+(guide?' | '+guide:'')+'\n'+(this.cornerMeasurements.checked?metrics.slice(0,2).join(' | ')+'\n'+metrics.slice(2).join(' | '):metrics[0]+'\nCorner measurements off')+'\n'+
         (r.isMaster?'Master: '+r.registered.path:r.moved?'Moved to: '+r.movedTo:'Original: '+(r.original?.path||r.match));
      this.frameLabel.text=(this.isRotating()?'SUBFRAME '+(this.rotationRows().indexOf(r)+1)+' / '+this.rotationRows().length+': ':this.frame===0?(r.isMaster?'MASTER: ':'REGISTERED: '):(this.loadedReference?.label||'REFERENCE')+': ')+(this.frame===0?sqrFileName(r.registered.path):sqrFileName(this.loadedReference?.path||''))+(this.isRegionRotating()?' · '+(this.region.currentItem?SQR_REGIONS[this.region.currentItem]:'Usable field'):'')+'\n'+(r.isMaster?'INTEGRATED MASTER · cannot be rejected':r.reject?'REJECT ORIGINAL':'KEEP ORIGINAL')+(r.moved?' · already moved':'');
   }
   scan(){this.stopBlink();this.busy(true);let abort=console.abortEnabled;console.abortEnabled=true;
      try{this.clearFrames();this.session=sqrScan(this.options(),s=>this.setStatus(s));this.current=null;this.parseAutorun(false);this.populateGroups();let rows=this.session.groups.flatMap(g=>g.rows);
         let masters=this.session.groups.filter(g=>g.master).length;
         this.status.text=rows.length+' registered lights · '+rows.filter(r=>r.original).length+' verified originals · '+this.session.groups.length+' groups · '+masters+' masters matched by filter. Use the magnifier to measure.';
      }catch(e){this.error(e);}finally{console.abortEnabled=abort;this.busy(false);}}
   // Restore abort/UI state in finally, then prepare the initial comparison
   // without switching away from the user's review tab after measurement.
   analyze(){
      if(!this.session){this.scan();if(!this.session)return;}
      this.syncOptions();
      this.stopBlink();this.busy(true);let abort=console.abortEnabled,measured=false;console.abortEnabled=true;console.show();
      try{sqrAnalyze(this.session,s=>this.setStatus(s));this.populateRows();
         measured=true;
      }catch(e){this.populateRows();this.error(e);}finally{console.abortEnabled=abort;this.busy(false);}
      if(measured){let n=this.session.groups.reduce((s,g)=>s+g.rows.filter(r=>r.candidate).length,0);
         let summary='Measured. '+n+' review candidates; no originals selected automatically.';this.status.text=summary;
         if(this.inspect(false))this.status.text=summary+(this.isRotating()?' Subframe rotation ready; open the Blink tab.':' Blink reference ready; open the Blink tab or inspect another frame.');
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
         this.frames=sqrFrames(r.registered.path,reference.path,this.options(),g.regions[this.region.currentItem],!!r.isMaster);this.loadedReference=reference;this.frame=0;
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
      try{this.table.deselectAllNodes();for(let i=0;i<this.table.numberOfChildren;++i){let node=this.table.child(i);if(node.row===row){this.table.currentNode=node;node.selected=true;break;}}}
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
   decide(reject){if(!this.current||this.current.isMaster||this.current.moved)return;this.current.reject=reject;this.populateRows();this.updateDetails();}
   setSession(s){this.clearFrames();this.session=s;this.current=null;let o={...sqrDefaults(),...s.options,logFolder:sqrLogFolderOption(s.options)};
      for(let k of Object.keys(this.folders))this.folders[k].edit.text=o[k];for(let k of ['percent','patch','margin','minStars'])this[k].setValue(o[k]);
      this.logFolder.edit.text=o.logFolder;this.logTimeZone.currentItem=o.logTimeZone==='offset'?1:0;this.logUTCOffset.setValue(o.logUTCOffset);this.logUTCOffset.enabled=this.logTimeZone.currentItem===1;
      for(let k of Object.keys(this.weights))this.weights[k].setValue(o[k]);this.cornerMeasurements.checked=o.measureCorners;this.reference.currentItem=Math.max(0,['master','best','sequence'].indexOf(o.reference));this.updateCornerControls();
      this.regionRotation.currentItem=Math.max(0,['off','image','blink'].indexOf(o.regionRotation));this.normalizeRegionRotation();
      this.guidingMode.currentItem=Math.max(0,['require','available','ignore'].indexOf(o.guidingMode));this.weights.guideWeight.enabled=this.guidingMode.currentItem!==2;
      this.setBlinkInterval(o.blinkInterval);
      this.maxFits=o.maxFits;this.displaySTF.checked=o.displaySTF;this.alignBrightness.checked=o.alignBrightness;this.histogramOrder.currentItem=o.histogramOrder==='time'?1:0;
      this.setScatterOptions(o);
      this.order.currentItem=Number.isInteger(o.reviewOrder)&&o.reviewOrder>=0&&o.reviewOrder<this.order.numberOfItems?o.reviewOrder:0;this.reviewReverse=!!o.reviewReverse;this.loadAutorun(false);this.populateGroups();this.setInputsCollapsed(o.inputsCollapsed);this.setQualityCollapsed(o.qualityCollapsed);}
   resetSettings(){let defaults=sqrDefaults(),folders=this.options();for(let k of ['percent','patch','margin','minStars'])this[k].setValue(defaults[k]);for(let k of Object.keys(this.weights))this.weights[k].setValue(defaults[k]);
      this.setScatterOptions(defaults);this.updateScatter();
      this.guidingMode.currentItem=0;this.weights.guideWeight.enabled=true;
      this.cornerMeasurements.checked=defaults.measureCorners;this.reference.currentItem=defaults.reference==='best'?1:0;this.updateCornerControls();
      this.regionRotation.currentItem=0;
      this.setBlinkInterval(defaults.blinkInterval);
      this.displaySTF.checked=defaults.displaySTF;this.alignBrightness.checked=defaults.alignBrightness;this.histogramOrder.currentItem=0;this.order.currentItem=defaults.reviewOrder;this.reviewReverse=defaults.reviewReverse;this.setInputsCollapsed(defaults.inputsCollapsed);this.setQualityCollapsed(defaults.qualityCollapsed);this.invalidateMeasurements();if(!this.session)this.updateHistogram();this.status.text='Evaluation defaults restored. Folder paths retained.';}
   // Confirmation is the boundary between a read-only review and file changes.
   // The engine independently validates the plan again when executing it.
   moveRejected(){
      if(!this.session||this.running)return;this.syncOptions();this.stopBlink();
      try{
         let plan=sqrMovePlan(this.session),text='Move '+plan.length+' manually rejected original light file(s)?\n\nDestination: '+sqrPath(this.session.options.destination)+'\n\n'+
            plan.map(p=>sqrFileName(p.source)).join('\n')+'\n\nThe relative source-folder structure is preserved. A move journal records each source and destination. Calibrated and registered files remain available. Refresh WBPP’s light list before rerunning.';
         if(new MessageBox(text,'Move rejected originals',StdIcon.Question,StdButton.Yes,StdButton.No).execute()!==StdButton.Yes)return;
         this.busy(true);let result=sqrMove(this.session,s=>this.setStatus(s));
         this.populateRows();this.status.text='Moved '+result.count+' original lights. Journal: '+result.journal;
      }catch(e){this.populateRows();this.error(e);}finally{this.busy(false);}}
}

#ifndef SQR_LIBRARY
// Run globally with optional saved settings. SQR_LIBRARY suppresses this entry
// point so validation harnesses can exercise the engine without opening the UI.
function sqrMain(){
   CoreApplication.ensureMinimumVersion(1,9,5);
   let o=sqrDefaults();if(Parameters.has('configJSON')){let saved=JSON.parse(Parameters.getString('configJSON'));o={...o,...saved,logFolder:sqrLogFolderOption(saved)};}
   if(Parameters.isViewTarget)throw new Error('Run this file-based review script globally.');
   let dialog=new SQRDialog(o);console.hide();dialog.execute();dialog.clearFrames();
}
sqrMain();
#endif

