#engine v8
#include <pjsr/controls/ImageView.js>
#ifndef LDM_LIBRARY
#feature-id LRGBDeconvolutionMatch : TG Scripts > LRGB Deconvolution Match
#feature-info Prepare registered linear Luminance and RGB images for LRGB composition, including data from different telescope setups and original pixel scales. Compare stellar halos and widths with BlurXTerminator and blink the results.
#endif

/* LRGB Deconvolution Match 1.13.0 -- PixInsight 1.9.5+, V8.
 * Helps prepare linear Luminance and RGB images for LRGB composition when
 * acquired with different telescope setups, potentially at different original
 * pixel scales. Inputs must already be registered to a common pixel grid.
 * Original implementation, 2026. MIT license; see accompanying LICENSE.
 * Preview interaction and automatic PSF sampling adapted from Linear Master Blend.
 * Copyright (c) 2026 SNR Weighted Masters contributors; MIT license.
 * Only BlurXTerminator changes output pixels. No stretch, normalization,
 * convolution, resampling, or LRGB combination is applied to output images.
 * Every trial starts from a pristine snapshot. BXT is never applied repeatedly
 * to the same trial. FWHM measurements use fixed source positions and one PSF
 * model family per star, with fit rejection and matched-star support checks.
 * Halo optimization compares background-subtracted, flux-normalized annular
 * pixel profiles at fixed radii. FWHM remains an independent acceptance check.
 * Reviewed results can be created as new windows or applied to both input
 * images with Undo support. Applying results does not save files to disk.
 */
const LDM_VERSION = '1.13.0';
const LDM_SCRIPT_FILE = #__FILE__;
const LDM_DEFAULT_STARS = 0.5;
// Supported by the installed BlurXTerminator parameter interface.
const LDM_MAX_STARS = 0.7;
const LDM_MIN_HALO = -0.5;
const LDM_MAX_HALO = 0.5;
const LDM_MIN_STARS = 20;
const LDM_MIN_FWHM = 1.6;
const LDM_MEDIAN_MISMATCH = 0.05;
const LDM_TAIL_MISMATCH = 0.10; // P90 and supported field-region medians.
const LDM_MAX_TRIALS = 10;
const LDM_HALO_BINS = 6;
const LDM_HALO_MEDIAN = 0.10;
const LDM_HALO_TAIL = 0.25;
const LDM_HALO_MIN_STARS = 20;

function ldmExists(v) { return v != null && !v.isNull; }
function ldmUnique(base) {
   let id = base, n = 1;
   while (ldmExists(View.viewById(id))) id = base + '_' + n++;
   return id;
}
function ldmClose(w) { if (w && !w.isNull) w.forceClose(); }
function ldmAbort() {
   CoreApplication.processEvents();
   if (console.abortRequested) throw new Error('Operation aborted.');
}
function ldmMedian(a) {
   if (!a.length) return NaN;
   let s = a.slice().sort((a,b) => a-b), n = s.length;
   return n % 2 ? s[(n-1)/2] : (s[n/2-1]+s[n/2])/2;
}
function ldmQuantile(a, q) {
   if (!a.length) return NaN;
   let s = a.slice().sort((a,b) => a-b);
   return s[Math.min(s.length-1, Math.floor(q*(s.length-1)))];
}
function ldmDefaults() {
   let p=ldmBXTDefaults();
   return { l:'', rgb:'',
      reference:'auto', referenceStars:LDM_DEFAULT_STARS, referenceHalo:0,
      nonstellar:p.sharpen_nonstellar, haloMin:LDM_MIN_HALO, haloMax:LDM_MAX_HALO,
      autoDisplay:true, normalizeDisplay:true, referenceDisplay:true };
}

function ldmCopy(view, name) {
   let im = view.image;
   let w = new ImageWindow(im.width, im.height, im.numberOfNominalChannels,
      im.bitsPerSample, true, im.isColor, ldmUnique(name));
   try {
      w.mainView.beginProcess(UndoFlag.NoSwapFile);
      try { w.mainView.image.assign(im, new Rect(0,0,im.width,im.height), 0, im.numberOfNominalChannels-1); }
      finally { w.mainView.endProcess(); }
      w.mainView.image.resetSelections();
      w.rgbWorkingSpace = view.window.rgbWorkingSpace;
      w.keywords = view.window.keywords;
      w.copyAstrometricSolution(view.window);
      // Do not copy cached image statistics, source masks, previews, or STF.
      return w;
   } catch (e) { ldmClose(w); throw e; }
}

function ldmInputState(view) {
   let im=view.image;
   // Retain the actual view, never resolve a replacement target by its name.
   return {view:view,history:view.historyIndex,width:im.width,height:im.height,
      channels:im.numberOfChannels,bits:im.bitsPerSample};
}

function ldmApplyResults(inputs, outputs) {
   let states=inputs.map((s,i)=>({source:s,view:s.view,output:outputs[i],
      begun:false,committed:false,mask:null}));
   // Validate both targets before changing either image.
   for(let s of states) {
      let v=s.view,b=s.source;
      if(!ldmExists(v) || !v.isMainView)
         throw new Error('An original input image is closed. Select the inputs and calculate again.');
      let im=v.image,out=s.output;
      if(v.historyIndex!==b.history || im.width!==b.width || im.height!==b.height ||
         im.numberOfChannels!==b.channels || im.bitsPerSample!==b.bits || !im.isReal || im.isComplex)
         throw new Error('Input '+v.id+' has changed. Calculate again before applying results.');
      if(!out || out.width!==im.width || out.height!==im.height ||
         out.numberOfChannels!==im.numberOfChannels || out.bitsPerSample!==im.bitsPerSample ||
         out.isColor!==im.isColor || !out.isReal || out.isComplex)
         throw new Error('Result geometry or sample format differs from input '+v.id+'.');
   }
   let abort=console.abortEnabled;console.abortEnabled=false;
   try {
      // Reserve undo state for both images before assigning either result.
      for(let s of states) {
         s.mask=s.view.window.maskEnabled;s.view.window.maskEnabled=false;
         s.view.beginProcess(UndoFlag.PixelData);s.begun=true;
      }
      for(let s of states) {
         let im=s.view.image,out=s.output;im.pushSelections();
         try {
            im.resetSelections();
            im.assign(out,new Rect(0,0,out.width,out.height),0,out.numberOfNominalChannels-1);
         } finally {im.popSelections();}
      }
      for(let s of states) {s.view.endProcess();s.begun=false;s.committed=true;}
      return states.map(s=>s.view.id);
   } catch(e) {
      let errors=[];
      for(let s of states.slice().reverse()) {
         try {
            if(s.begun)s.view.cancelProcess();
            else if(s.committed)s.view.historyIndex=s.source.history;
         }catch(rollback){errors.push(s.view.id+': '+(rollback.message || String(rollback)));}
      }
      throw new Error((e.message || String(e))+(errors.length?
         ' Could not restore all inputs: '+errors.join('; ')+'. Inspect both images and their Undo history.':''));
   } finally {
      for(let s of states)if(s.mask!==null)s.view.window.maskEnabled=s.mask;
      console.abortEnabled=abort;
   }
}

function ldmValidate(l, rgb, o) {
   if (!ldmExists(l) || !ldmExists(rgb) || !l.isMainView || !rgb.isMainView)
      throw new Error('Select open main images for L and RGB.');
   if (l.id === rgb.id || l.image.isColor || l.image.numberOfNominalChannels !== 1 ||
       !rgb.image.isColor || rgb.image.numberOfNominalChannels !== 3)
      throw new Error('L must be grayscale and RGB must be a three-channel color image.');
   if (l.image.width !== rgb.image.width || l.image.height !== rgb.image.height)
      throw new Error('Register and crop both images to identical dimensions first.');
   for (let v of [l,rgb]) {
      let im = v.image;
      if (!im.isReal || im.isComplex || im.numberOfChannels !== im.numberOfNominalChannels)
         throw new Error('Use real floating-point images without alpha channels.');
      if (im.width < 64 || im.height < 64) throw new Error('Images must be at least 64 x 64 pixels.');
   }
   if (!['auto','l','rgb'].includes(o.reference) ||
       !Number.isFinite(o.referenceStars) || o.referenceStars < 0 || o.referenceStars > LDM_MAX_STARS ||
       !Number.isFinite(o.referenceHalo) || o.referenceHalo < LDM_MIN_HALO || o.referenceHalo > LDM_MAX_HALO ||
       !Number.isFinite(o.nonstellar) || o.nonstellar < 0 || o.nonstellar > 1 ||
       !Number.isFinite(o.haloMin) || !Number.isFinite(o.haloMax) ||
       o.haloMin < LDM_MIN_HALO || o.haloMax > LDM_MAX_HALO || o.haloMin > o.haloMax)
      throw new Error('Invalid settings. Reset the settings and try again.');
}

function ldmReference(o, initial) {
   return o.reference==='auto' ? (initial.l<=initial.rgb?'l':'rgb') : o.reference;
}

/** No gamma or CIE L* conversion: a linear weighted sum of linear RGB samples.
 * RGB working-space Y coefficients are normalized and kept fixed for all runs.
 * Image operations take place only on detached analysis buffers.
 */
function ldmLuminance(im, weights) {
   let y = new Image, t = new Image;
   try {
      let rect = new Rect(0,0,im.width,im.height);
      y.assign(im, rect, 0, 0); y.apply(weights[0], ImageOp.Mul);
      for (let c=1;c<3;++c) {
         t.assign(im, rect, c, c); t.apply(weights[c], ImageOp.Mul);
         y.apply(t, ImageOp.Add);
      }
      return y;
   } catch (e) { y.free(); throw e; }
   finally { t.free(); }
}

function ldmBXTDefaults() {
   if (typeof BlurXTerminator === 'undefined')
      throw new Error('BlurXTerminator is not installed/loaded. Install and license it, then restart PixInsight.');
   let p = new BlurXTerminator;
   for (let key of ['sharpen_stars','adjust_star_halos','sharpen_nonstellar'])
      if (!Number.isFinite(p[key]))
         throw new Error('This BlurXTerminator version does not expose the required parameter: ' + key);
   if(typeof p.auto_nonstellar_psf!=='boolean')
      throw new Error('This BlurXTerminator version does not expose Automatic PSF.');
   return p;
}
function ldmBXT(strength, halo, nonstellar) {
   let p=ldmBXTDefaults();
   p.sharpen_stars=strength;
   p.adjust_star_halos=halo;
   p.sharpen_nonstellar=nonstellar;
   p.auto_nonstellar_psf=true;
   // Remaining settings retain the installed process's defaults.
   return p;
}

// Empirical calibration of fractional width reduction, not a BXT transfer
// function. Never clip the estimate; the installed process validates it.
function ldmEstimateStars(before,after,other,referenceStars){
   let result={valid:false,before:before,after:after,other:other,referenceStars:referenceStars};
   if(![before,after,other,referenceStars].every(Number.isFinite) || Math.min(before,after,other)<=0)
      return {...result,reason:'The FWHM measurements must be finite and positive.'};
   if(referenceStars<=0)return {...result,reason:'Reference Sharpen Stars must be greater than zero to calibrate the estimate.'};
   let reduction=1-after/before,desired=1-after/other;
   if(reduction<=1e-6)return {...result,reason:'The reference did not show a measurable FWHM reduction. Revise the reference settings.'};
   if(desired<0)return {...result,reason:'The other image is already narrower than the reference result. This estimate would require negative sharpening; choose a sharper reference result.'};
   let value=referenceStars*desired/reduction;
   if(!Number.isFinite(value))return {...result,reason:'The reference calibration produced a nonfinite Sharpen Stars estimate.'};
   return {...result,valid:true,value:value,reduction:reduction,desired:desired};
}

function ldmEstimatedBXT(estimate,halo,nonstellar){
   if(!estimate.valid)throw new Error('Cannot estimate Sharpen Stars: '+estimate.reason);
   let p;
   try{p=ldmBXT(estimate.value,halo,nonstellar);}
   catch(e){throw new Error('Estimated Sharpen Stars = '+estimate.value.toFixed(6)+'. BlurXTerminator rejected this setting: '+
      (e.message || String(e))+' The estimate was not clipped. No other-image BXT run was performed; the reference preview remains available.');}
   if(Math.abs(p.sharpen_stars-estimate.value)>1e-6*Math.max(1,Math.abs(estimate.value)))
      throw new Error('BlurXTerminator changed the Sharpen Stars estimate from '+estimate.value+' to '+p.sharpen_stars+
         '. The script will not silently substitute a different value. The reference preview remains available.');
   return p;
}

/** Automatic full-resolution sampling and joint PSF selection follow
 * Linear Master Blend. Each accepted pair keeps its aperture and model family
 * for all later measurements. RGB is measured as working-space linear Y.
 */
function ldmCombinedFWHM(fx,fy) {
   return Number.isFinite(fx) && Number.isFinite(fy) && fx>0 && fy>0 ? Math.sqrt(fx*fy) : NaN;
}
function ldmPSFTiles(width,height) {
   let nx=Math.min(3,Math.max(1,Math.floor(width/384)));
   let ny=Math.min(3,Math.max(1,Math.floor(height/384))),tiles=[];
   for(let iy=0;iy<ny;++iy)for(let ix=0;ix<nx;++ix){
      let w=Math.min(768,Math.floor(width/nx)),h=Math.min(768,Math.floor(height/ny));
      let x=Math.round((ix+.5)*width/nx-w/2),y=Math.round((iy+.5)*height/ny-h/2);
      tiles.push(new Rect(x,y,x+w,y+h));
   }
   return tiles;
}
function ldmPSFPatch(image,rect,channel=0) {
   let patch=new Image;
   try {
      patch.assign(image,rect,channel,channel);
      patch.resetSelections();patch.rangeClippingEnabled=false;
      let row=new Float64Array(patch.width);
      for(let y=0;y<patch.height;++y){
         if((y&63)===0)ldmAbort();
         patch.getSamples(row,new Rect(0,y,patch.width,y+1),0);
         for(let value of row)if(!Number.isFinite(value))throw new Error('PSF region contains NaN or infinite samples.');
      }
      return patch;
   }catch(e){patch.free();throw e;}
}
function ldmFitPSF(image,x,y,rect,model) {
   let p=new PSF;
   p.fitSource(image,new Point(x,y),rect,model,false);
   if(!p.isValid || !(p.A>0) || !Number.isFinite(p.mad) || p.mad/p.A>.10)return null;
   if((p.x-x)**2+(p.y-y)**2>2.25)return null;
   // Native widths account for the fitted model and Moffat beta. X/Y are
   // the fitted major/minor axes, not fixed sensor coordinates.
   let fx=p.fwhmX,fy=p.fwhmY;
   if(!Number.isFinite(fx) || !Number.isFinite(fy) || fy<1 || fx<fy ||
      fx>.75*Math.min(rect.width,rect.height) || fy/fx<.5)return null;
   if(model===PSFunction.Moffat && (!(p.beta>1.05) || p.beta>9.95))return null;
   return {f:ldmCombinedFWHM(fx,fy),fx:fx,fy:fy,a:p.A,b:p.B,
      ecc:Math.sqrt(Math.max(0,1-(fy/fx)**2)),x:p.x,y:p.y,residual:p.mad/p.A};
}
function ldmPSFPairs(a,b,tile,cell) {
   let detector=new StarDetector;
   detector.sensitivity=.5;detector.upperLimit=.95;detector.allowClusteredSources=false;
   let sa=detector.stars(a),sb=detector.stars(b),pairs=[],candidates=[];
   let distance=(s,t)=>(s.pos.x-t.pos.x)**2+(s.pos.y-t.pos.y)**2;
   for(let s of sa){
      ldmAbort();let matches=sb.filter(t=>distance(s,t)<=4);
      if(matches.length!==1)continue;
      let t=matches[0];if(sa.filter(u=>distance(u,t)<=4).length!==1)continue;
      candidates.push({s:s,t:t,brightness:s.flux*t.flux,x:(s.pos.x+t.pos.x)/2,y:(s.pos.y+t.pos.y)/2});
   }
   candidates.sort((p,q)=>q.brightness-p.brightness || p.y-q.y || p.x-q.x);
   for(let candidate of candidates){
      if(pairs.length>=32)break;
      ldmAbort();let s=candidate.s,t=candidate.t;
      let radius=Math.max(8,Math.min(40,Math.ceil(1.5*Math.sqrt(Math.max(s.size,t.size)))));
      let cx=candidate.x,cy=candidate.y;
      let rect=new Rect(Math.floor(cx-radius),Math.floor(cy-radius),Math.ceil(cx+radius+1),Math.ceil(cy+radius+1));
      if(rect.x0<0 || rect.y0<0 || rect.x1>a.width || rect.y1>a.height)continue;
      if(sa.some(u=>u!==s && distance(s,u)<4*radius*radius) ||
         sb.some(u=>u!==t && distance(t,u)<4*radius*radius))continue;
      if(a.maximum(rect,0,0)>=.95 || b.maximum(rect,0,0)>=.95)continue;
      let best=null;
      for(let model of [PSFunction.Moffat,PSFunction.Gaussian]){
         let pa=ldmFitPSF(a,s.pos.x,s.pos.y,rect,model),pb=ldmFitPSF(b,t.pos.x,t.pos.y,rect,model);
         if(!pa || !pb || (pa.x-pb.x)**2+(pa.y-pb.y)**2>2.25)continue;
         let residual=pa.residual+pb.residual;
         if(!best || residual<best.residual)best={a:pa,b:pb,residual:residual,model:model};
      }
      if(best){
         best.sample={tile:tile,cell:cell,x:cx,y:cy,rect:[rect.x0,rect.y0,rect.x1,rect.y1],model:best.model};
         pairs.push(best);
      }
   }
   return pairs;
}
function ldmConsistentPairs(pairs) {
   if(!pairs.length)return [];
   let dimensions=[p=>Math.log(p.a.f),p=>Math.log(p.b.f),p=>Math.log(p.b.f/p.a.f)];
   let bounds=dimensions.map(fn=>{
      let v=pairs.map(fn),m=ldmMedian(v),mad=1.4826*ldmMedian(v.map(x=>Math.abs(x-m)));
      return {m:m,d:Math.max(.03,3.5*mad)};
   });
   return pairs.filter(p=>dimensions.every((fn,i)=>Math.abs(fn(p)-bounds[i].m)<=bounds[i].d));
}
function ldmMeasureSources(l,y) {
   let tiles=ldmPSFTiles(l.width,l.height),pairs=[];
   for(let i=0;i<tiles.length;++i){
      ldmAbort();console.writeln('Measuring PSF region '+(i+1)+'/'+tiles.length+'...');
      let a=null,b=null,r=tiles[i];
      let cell=Math.min(2,Math.floor(3*(r.x0+r.x1)/2/l.width))+
         3*Math.min(2,Math.floor(3*(r.y0+r.y1)/2/l.height));
      try{a=ldmPSFPatch(l,r);b=ldmPSFPatch(y,r);pairs.push(...ldmPSFPairs(a,b,i,cell));}
      finally{if(a)a.free();if(b)b.free();}
   }
   let accepted=ldmConsistentPairs(pairs);
   return {tiles:tiles.length,detected:pairs.length,stars:accepted.map(p=>p.sample),
      l:accepted.map(p=>p.a),rgb:accepted.map(p=>p.b)};
}
/** Never redetect stars, reselect models, or clip the output population in
 * response to a trial. Null entries preserve the identity of failed fits.
 */
function ldmMeasure(im,stars,o,channel=0) {
   let results=new Array(stars.length).fill(null),tiles=ldmPSFTiles(im.width,im.height);
   for(let tile=0;tile<tiles.length;++tile){
      let indices=stars.map((s,i)=>i).filter(i=>stars[i].tile===tile);
      if(!indices.length)continue;
      let patch=null;
      try{
         patch=ldmPSFPatch(im,tiles[tile],channel);
         for(let i of indices){ldmAbort();let s=stars[i];results[i]=ldmFitPSF(patch,s.x,s.y,new Rect(...s.rect),s.model);}
      }finally{if(patch)patch.free();}
   }
   return results;
}

/** All statistics are paired: same source index on both sides. */
function ldmCompare(l, r, stars) {
   let ratios=[], absolute=[], lf=[], rf=[], cells=Array.from({length:9},()=>[]);
   for (let i=0;i<stars.length;++i) if (l[i] && r[i]) {
      let d=2*(l[i].f-r[i].f)/(l[i].f+r[i].f);
      ratios.push(d); absolute.push(Math.abs(d)); lf.push(l[i].f); rf.push(r[i].f);
      cells[stars[i].cell].push(Math.abs(d));
   }
   let enough=ratios.length>=LDM_MIN_STARS && ratios.length>=Math.ceil(stars.length*0.8);
   let med=ldmMedian(absolute), p90=ldmQuantile(absolute,0.9);
   let regions=cells.map(c=>({n:c.length,error:ldmMedian(c)}));
   let regionOK=regions.every(c=>c.n<5 || c.error<=LDM_TAIL_MISMATCH);
   let fl=ldmMedian(lf), fr=ldmMedian(rf);
   let sampled=fl>=LDM_MIN_FWHM && fr>=LDM_MIN_FWHM;
   return { n:ratios.length, total:stars.length, enough:enough, median:med,
      p90:p90, signed:ldmMedian(ratios), l:fl, rgb:fr, regions:regions,
      sampled:sampled, pass:enough && sampled && med<=LDM_MEDIAN_MISMATCH && p90<=LDM_TAIL_MISMATCH && regionOK };
}

/** Direct pixel profiles, independent of the analytic PSF model. Geometry is
 * frozen from the reference and the original isolated-star fitting aperture.
 * Radii are pixels, never scaled to a trial's FWHM. The background annulus is
 * outside the flux aperture; signed samples preserve evidence of dark rings.
 */
function ldmHaloGeometry(star,reference) {
   let r=star.rect;
   let outer=Math.min(star.x-r[0],r[2]-1-star.x,star.y-r[1],r[3]-1-star.y)-1.5;
   let aperture=.70*outer,inner=Math.max(2,reference.f);
   if(aperture<2.5*reference.f || aperture-inner<LDM_HALO_BINS)return null;
   return {inner:inner,aperture:aperture,backgroundInner:.82*outer,outer:outer,bins:LDM_HALO_BINS};
}
function ldmPixelProfile(samples,width,height,cx,cy,g) {
   let sky=[],peak=-Infinity;
   for(let y=0;y<height;++y)for(let x=0;x<width;++x){
      let v=samples[y*width+x],r=Math.hypot(x-cx,y-cy);
      if(!Number.isFinite(v))return null;
      if(r<=g.aperture)peak=Math.max(peak,v);
      if(r>=g.backgroundInner && r<=g.outer)sky.push(v);
   }
   if(sky.length<30 || peak>=.95)return null;
   let background=ldmMedian(sky),sigma=Math.max(1e-12,1.4826*ldmMedian(sky.map(v=>Math.abs(v-background))));
   let bgError=1.2533*sigma/Math.sqrt(sky.length);
   let sum=Array(g.bins).fill(0),area=sum.slice(),squares=sum.slice();
   let flux=0,fluxArea=0,fluxSquares=0;
   // Fractional pixel coverage reduces sensitivity to the subpixel centroid.
   for(let y=0;y<height;++y)for(let x=0;x<width;++x){
      let weights=Array(g.bins).fill(0),apertureWeight=0;
      for(let sy=0;sy<4;++sy)for(let sx=0;sx<4;++sx){
         let r=Math.hypot(x+(sx+.5)/4-.5-cx,y+(sy+.5)/4-.5-cy);
         if(r<g.aperture){
            apertureWeight+=1/16;
            if(r>=g.inner)weights[Math.min(g.bins-1,Math.floor((r-g.inner)/(g.aperture-g.inner)*g.bins))]+=1/16;
         }
      }
      let v=samples[y*width+x]-background;
      flux+=apertureWeight*v;fluxArea+=apertureWeight;fluxSquares+=apertureWeight*apertureWeight;
      for(let k=0;k<g.bins;++k){sum[k]+=weights[k]*v;area[k]+=weights[k];squares[k]+=weights[k]*weights[k];}
   }
   let fluxNoise=Math.hypot(sigma*Math.sqrt(fluxSquares),bgError*fluxArea);
   if(!(flux>50*fluxNoise) || area.some(n=>n<8))return null;
   let errors=area.map((n,k)=>Math.hypot(sigma*Math.sqrt(squares[k]),bgError*n));
   let wing=sum.reduce((a,b)=>a+b,0),wingNoise=Math.hypot(sigma*Math.sqrt(squares.reduce((a,b)=>a+b,0)),bgError*area.reduce((a,b)=>a+b,0));
   let negative=sum.map((v,k)=>v < -3*errors[k]);
   let dark=negative.some((v,k)=>k>0 && v && negative[k-1]) &&
      -sum.reduce((a,v)=>a+Math.min(0,v),0)>.003*flux;
   return {profile:sum.map(v=>v/flux),errors:errors.map(v=>v/flux),wing:wing/flux,
      wingNoise:wingNoise/flux,flux:flux,background:background,sigma:sigma,dark:dark,
      inner:g.inner,aperture:g.aperture};
}
function ldmHaloProfiles(im,stars,fits,geometry) {
   let tiles=ldmPSFTiles(im.width,im.height),profiles=new Array(stars.length).fill(null);
   for(let i=0;i<stars.length;++i){
      if(!geometry[i] || !fits[i])continue;
      ldmAbort();let s=stars[i],r=s.rect,t=tiles[s.tile],w=r[2]-r[0],h=r[3]-r[1];
      let pixels=new Float64Array(w*h);
      im.getSamples(pixels,new Rect(t.x0+r[0],t.y0+r[1],t.x0+r[2],t.y0+r[3]),0);
      profiles[i]=ldmPixelProfile(pixels,w,h,fits[i].x-r[0],fits[i].y-r[1],geometry[i]);
   }
   return profiles;
}
function ldmCompareHalos(reference,other) {
   let residuals=[],errors=[],ratios=[],dark=0,total=0;
   for(let i=0;i<reference.length;++i){
      let a=reference[i];if(!a)continue;++total;
      let b=other[i];
      if(!b){for(let k=0;k<LDM_HALO_BINS;++k)residuals.push(null);continue;}
      let norm=a.profile.reduce((s,v)=>s+Math.abs(v),0)+b.profile.reduce((s,v)=>s+Math.abs(v),0);
      let delta=a.profile.map((v,k)=>2*(b.profile[k]-v)/Math.max(1e-12,norm));
      errors.push(delta.reduce((s,v)=>s+Math.abs(v),0));ratios.push(b.wing/a.wing);
      residuals.push(...delta.map(v=>Math.sqrt(LDM_HALO_BINS)*v));
      if(b.dark)++dark;
   }
   let n=errors.length,enough=n>=LDM_HALO_MIN_STARS && n>=Math.ceil(total*.8);
   let median=ldmMedian(errors),p90=ldmQuantile(errors,.9);
   return {n:n,total:total,enough:enough,median:median,p90:p90,wingRatio:ldmMedian(ratios),dark:dark,
      residuals:residuals,pass:enough && dark===0 && median<=LDM_HALO_MEDIAN && p90<=LDM_HALO_TAIL};
}
function ldmHaloText(m) {
   return 'Halo profiles: '+m.n+'/'+m.total+' stars; mismatch '+(100*m.median).toFixed(1)+
      '% median / '+(100*m.p90).toFixed(1)+'% P90; wing flux ratio '+m.wingRatio.toFixed(3)+
      '; dark rings '+m.dark+'; '+(m.pass?'PASS':'REVIEW');
}

function ldmClamp(x,lo,hi){return Math.max(lo,Math.min(hi,x));}
function ldmUsable(t){return t && t.metric.enough && t.metric.sampled && (!t.haloMetric || t.haloMetric.enough) && Number.isFinite(t.cost);}
function ldmPrefer(a,b){
   if(!ldmUsable(a))return false;
   if(!ldmUsable(b))return true;
   if(a.metric.pass!==b.metric.pass)return a.metric.pass;
   if(a.haloMetric && b.haloMetric && (a.haloMetric.dark===0)!==(b.haloMetric.dark===0))return a.haloMetric.dark===0;
   return a.cost<b.cost;
}
// Width residuals are retained for diagnostic tests, not for halo optimization.
function ldmResiduals(reference,fits){
   return reference.map((r,i)=>r && fits[i]?Math.log(fits[i].f/r.f):null);
}
function ldmCost(residuals){
   let huber=0.10;
   return residuals.reduce((sum,r)=>{
      // Symmetric profile residuals are bounded by 2*sqrt(6), hence Huber
      // loss < 0.49. Missing profiles cannot improve the objective.
      if(r===null)return sum+1;
      let v=Math.abs(r);
      return sum+(v<=huber?0.5*v*v:huber*(v-0.5*huber));
   },0)/Math.max(1,residuals.length);
}

/** One-parameter damped Gauss-Newton with secant derivative updates.
 * Sharpen Stars is fixed by measurement before entering the search.
 * Every halo trial starts from the original image; no final repeat is needed.
 */
function ldmHaloNewton(o,startHalo,evaluate,log=()=>{}){
   let span=o.haloMax-o.haloMin,cache=new Map,best=null;
   function run(x){
      x=span>0?ldmClamp(x,0,1):0;
      let key=x.toFixed(8);
      if(cache.has(key))return cache.get(key);
      if(cache.size>=LDM_MAX_TRIALS)return null;
      let t=evaluate(o.haloMin+x*span);
      t.x=x;t.cost=ldmCost(t.residuals);cache.set(key,t);
      if(ldmPrefer(t,best))best=t;
      return t;
   }
   let x0=span>0?ldmClamp((startHalo-o.haloMin)/span,0,1):0;
   let current=run(x0),base=current;
   function result(reason){return {best:best,count:cache.size,reason:reason};}
   if(current.metric.pass)return result('Starting halo setting meets the profile and FWHM criteria');
   if(span===0)return result('The halo setting is fixed');
   let delta=x0<=0.9?0.1:-0.1,probe=run(x0+delta);
   let J=base.residuals.map((r,i)=>r!==null && probe.residuals[i]!==null?(probe.residuals[i]-r)/delta:null);
   if(probe.metric.pass)return result('Halo derivative probe meets the profile and FWHM criteria');
   if(!best)return result('No usable starting or halo derivative-probe result');
   let damping=1e-3,trust=0.5,rejected=0;
   function updateDerivative(from,to){
      let dx=to.x-from.x;
      if(Math.abs(dx)<1e-8)return;
      for(let i=0;i<J.length;++i)
         J[i]=from.residuals[i]!==null && to.residuals[i]!==null?(to.residuals[i]-from.residuals[i])/dx:null;
   }
   if(best!==current){updateDerivative(current,best);current=best;}
   while(cache.size<LDM_MAX_TRIALS){
      let curvature=0,gradient=0,n=0;
      for(let i=0;i<J.length;++i){
         let r=current.residuals[i],j=J[i];
         if(r===null || !Number.isFinite(j))continue;
         let w=Math.min(1,0.1/Math.max(Math.abs(r),1e-12));
         curvature+=w*j*j;gradient+=w*j*r;++n;
      }
      if(n<Math.max(LDM_MIN_STARS,Math.ceil(J.length*.8)))return result('Too few common fits for a reliable halo derivative');
      if(curvature<1e-16)return result('Outer-profile response to the halo setting is flat');
      let lambda=damping*Math.max(curvature,1e-12)+1e-12;
      let step=ldmClamp(-gradient/(curvature+lambda),Math.max(-trust,-current.x),Math.min(trust,1-current.x));
      if(Math.abs(step)<0.002)return result('Halo Newton step converged or reached a search bound');
      let previousCount=cache.size,trial=run(current.x+step);
      if(!trial || cache.size===previousCount)return result('No new halo step within numerical precision');
      updateDerivative(current,trial);
      if(trial.metric.pass)return result('Profile and FWHM criteria reached by halo adjustment');
      if(ldmUsable(trial) && trial.cost<current.cost){
         log('Halo Newton accepted step; robust loss '+current.cost.toExponential(3)+' -> '+trial.cost.toExponential(3)+'.');
         let relative=(current.cost-trial.cost)/Math.max(current.cost,1e-12);
         current=trial;rejected=0;damping=Math.max(1e-6,damping*.3);trust=Math.min(.5,trust*1.4);
         if(relative<1e-4)return result('Outer-profile mismatch has converged');
      }else{
         log('Halo Newton step rejected; retaining the best image and reducing the next step.');
         damping=Math.min(1e6,damping*10);trust*=.5;
         if(++rejected>=3)return result('No improvement after three safeguarded halo steps');
      }
   }
   return result('Halo trial budget reached');
}


class LDMAnalysis {
   constructor(l,rgb,o,status,referenceOnly=false) {
      this.owned=[]; this.o=o; this.report=[]; this.outputs=null; this.status=status;
      this.appliedToInputs=false;
      this.bxtRuns=0;this.bestOther=null;this.referenceBefore=null;this.referenceOutput=null;
      try {
         ldmValidate(l,rgb,o); ldmBXT(0,o.haloMin,o.nonstellar); // Fail before allocating on missing BXT.
         this.sourceL=l.id; this.sourceRGB=rgb.id;
         this.inputStates=[ldmInputState(l),ldmInputState(rgb)];
         this.l=ldmCopy(l,'LDM_source_L'); this.owned.push(this.l);
         this.rgb=ldmCopy(rgb,'LDM_source_RGB'); this.owned.push(this.rgb);
         let weights=Array.from(rgb.window.rgbWorkingSpace.Y), sum=weights.reduce((a,b)=>a+b,0);
         if (!(sum>0) || weights.some(x=>!Number.isFinite(x) || x<0)) throw new Error('Invalid RGB luminance coefficients.');
         this.weights=weights.map(x=>x/sum);
         status('Detecting and fitting common stars...');
         let y=ldmLuminance(this.rgb.mainView.image,this.weights),source;
         try{source=ldmMeasureSources(this.l.mainView.image,y);}finally{y.free();}
         let stars=source.stars,lf=source.l,rf=source.rgb,channels=[];
         for(let c=0;c<3;++c)channels.push(ldmMeasure(this.rgb.mainView.image,stars,o,c));
         this.log('Automatic PSF sampling: '+source.tiles+' regions; '+source.detected+
            ' fitted pairs; '+stars.length+' after source outlier rejection.');

         this.stars=stars.filter((s,i)=>lf[i] && rf[i] && channels.every(c=>c[i]));
         if (this.stars.length<LDM_MIN_STARS)
            throw new Error('Fewer than 20 reliable common stars in L, RGB luminance, R, G and B. Check registration, saturation, noise and star detection.');
         let indices=stars.map((s,i)=>i).filter(i=>lf[i] && rf[i] && channels.every(c=>c[i]));
         this.initialL=indices.map(i=>lf[i]); this.initialRGB=indices.map(i=>rf[i]);
         this.initial=ldmCompare(this.initialL,this.initialRGB,this.stars);
         this.log('Common baseline stars: '+this.stars.length+'.');
         this.log('Baseline L / linear RGB Y: '+this.initial.l.toFixed(3)+' / '+this.initial.rgb.toFixed(3)+' px.');
         this.log('Linear RGB Y weights: '+this.weights.map(v=>v.toFixed(6)).join(', '));
         let moffat=this.stars.filter(s=>s.model===PSFunction.Moffat).length;
         this.log('Automatic per-star PSF models: '+moffat+' Moffat; '+(this.stars.length-moffat)+
            ' Gaussian. Each pair retains its model and aperture throughout.');
         this.log('Automatic PSF is enabled in BlurXTerminator. Remaining BXT options retain installed defaults.');
         this.log('Sharpen Nonstellar='+o.nonstellar+' (user value, fixed for both images and every trial). BXT default AI/model retained.');
         this.referenceKey=ldmReference(o,this.initial);
         this.otherKey=this.referenceKey==='l'?'rgb':'l';
         this.log('Fixed reference: '+(this.referenceKey==='l'?this.sourceL:this.sourceRGB)+
            (o.reference==='auto'?' (smaller measured baseline FWHM on the common pixel grid).':' (selected by user).'));
         this.log('Reference user settings: Sharpen Stars='+o.referenceStars+'; Adjust Star Halos='+o.referenceHalo+'.');
         if(this.referenceKey==='rgb')this.referenceBefore=ldmLuminance(this.rgb.mainView.image,this.weights);
         else {this.referenceBefore=new Image;this.referenceBefore.assign(this.l.mainView.image);}
         status('Deconvolving the sharper reference once with your settings...');
         let referenceOutput=this.process(this.referenceKey,o.referenceStars,o.referenceHalo);
         let referenceSettings=this.lastBXTSettings;
         this.owned.push(referenceOutput);
         let referenceFits=this.measureWindow(referenceOutput,this.referenceKey);
         // The reference is already fixed by the user. Define the search cohort
         // now, excluding failed reference PSF fits. Never change this cohort
         // in response to a trial of the other image.
         let retained=[];
         this.referenceSelectedCount=this.stars.length;
         for(let i=0;i<this.stars.length;++i)if(referenceFits[i])retained.push(i);
         this.log('Fixed-reference usable stars: '+retained.length+'/'+this.stars.length+
            '. Excluding rejected reference fits before freezing the search star set.');
         this.stars=retained.map(i=>this.stars[i]);
         this.initialL=retained.map(i=>this.initialL[i]);this.initialRGB=retained.map(i=>this.initialRGB[i]);
         referenceFits=retained.map(i=>referenceFits[i]);
         this.initial=ldmCompare(this.initialL,this.initialRGB,this.stars);
         this.log('Frozen search set baseline L / RGB Y: '+this.initial.l.toFixed(3)+' / '+this.initial.rgb.toFixed(3)+' px.');
         let referenceCheck=ldmCompare(referenceFits,referenceFits,this.stars);
         this.log('Reference fit support: '+referenceCheck.n+'/'+referenceCheck.total+
            '; median FWHM '+referenceCheck.l.toFixed(3)+' px.');
         if(!referenceCheck.enough || !referenceCheck.sampled)
            throw new Error('Fixed reference: '+referenceCheck.n+'/'+referenceCheck.total+' reliable fits; '+
               referenceCheck.l.toFixed(3)+' px median FWHM. At least '+Math.max(LDM_MIN_STARS,Math.ceil(this.stars.length*.8))+
               ' fits and '+LDM_MIN_FWHM.toFixed(2)+' px are required. Check star fitting and reference settings.');
         this.target=referenceCheck.l;
         this.log('Fixed reference output FWHM: '+this.target.toFixed(3)+' px. This output is retained unchanged throughout the search.');
         this.referenceFits=referenceFits;
         this.referenceBeforeFits=(this.referenceKey==='l'?this.initialL:this.initialRGB).slice();
         this.referenceMeasurement=ldmReferenceMeasurements(this.referenceBeforeFits,referenceFits,this.referenceSelectedCount);
         this.beforeAfterMeasurements={[this.referenceKey]:this.referenceMeasurement};
         let rm=this.referenceMeasurement;
         this.log('Reference before / after BXT: '+rm.n+'/'+rm.selected+' paired stars; combined FWHM = sqrt(FWHM_x * FWHM_y).');
         this.log('Reference median combined FWHM: '+rm.before.toFixed(3)+' / '+rm.after.toFixed(3)+' px.');
         this.log('Reference median PSF X widths: '+rm.beforeX.toFixed(3)+' / '+rm.afterX.toFixed(3)+
            ' px; PSF Y widths: '+rm.beforeY.toFixed(3)+' / '+rm.afterY.toFixed(3)+' px.');
         this.log('Reference linear fit: '+ldmFitText(rm.fit)+'.');
         this.referenceOutput=referenceOutput;this.referenceSettings=referenceSettings;
         this.estimate=ldmEstimateStars(rm.before,rm.after,this.otherKey==='l'?this.initial.l:this.initial.rgb,referenceSettings.strength);
         this.log('Other-image Sharpen Stars estimate: '+(this.estimate.valid?this.estimate.value.toFixed(6)+' (not clipped)':this.estimate.reason));
         this.log('Only Adjust Star Halos is optimized on '+this.otherKey+', from '+o.haloMin+' to '+o.haloMax+'. Sharpen Stars stays at the estimate; Automatic PSF stays enabled.');
         if(!referenceOnly)this.match();
      } catch (e) { this.dispose(); throw e; }
   }
   match() {
      if(this.outputs)return; // Reuse the completed result too.
      const o=this.o,status=this.status,referenceOutput=this.referenceOutput,
         referenceSettings=this.referenceSettings,referenceFits=this.referenceFits;
      if(!referenceOutput)throw new Error('Calculate the reference first.');
      // Preflight without allocating or executing a trial. Keep the reference
      // preview available when the calibration or process parameter is rejected.
      let factory=ldmBXTDefaults();
      let fixedProcess=ldmEstimatedBXT(this.estimate,ldmClamp(factory.adjust_star_halos,o.haloMin,o.haloMax),o.nonstellar);
      this.estimatedStars=fixedProcess.sharpen_stars;
      // This preflight keeps the reference preview available if the image pair
      // cannot supply enough reliable, isolated outer profiles.
      this.prepareHalos();
      try {
         this.log('Fixed estimated Sharpen Stars='+this.estimatedStars.toFixed(6)+'. Newton search minimizes outer-profile differences; FWHM is an independent acceptance check. At most '+LDM_MAX_TRIALS+' other-image runs.');
         this.optimization=ldmHaloNewton(o,factory.adjust_star_halos,
            halo=>this.trial(this.otherKey,this.estimatedStars,halo),s=>this.log(s));
         if (!this.bestOther) throw new Error('No usable candidate has sufficient PSF and halo-profile support. Revise the reference settings or image pair.');
         let fixed={strength:referenceSettings.strength,halo:referenceSettings.halo,fits:referenceFits,settings:referenceSettings};
         this.best=this.referenceKey==='l'?{l:fixed,rgb:this.bestOther}:{l:this.bestOther,rgb:fixed};
         this.log('Optimizer stopped: '+this.optimization.reason+'.');
         this.log('Actual BlurXTerminator runs: '+this.bxtRuns+' (1 reference + '+this.optimization.count+' other-image trials; no final repeat).');
         this.log('Selected stellar sharpening: L='+this.best.l.strength.toFixed(4)+'; RGB='+this.best.rgb.strength.toFixed(4));
         this.log('Selected star halo adjustment: L='+this.best.l.halo.toFixed(4)+'; RGB='+this.best.rgb.halo.toFixed(4));
         status('Measuring the retained best result and preparing the scatter plot...');
         let otherOutput=this.bestOther.window;
         let outL=this.referenceKey==='l'?referenceOutput:otherOutput;
         let outRGB=this.referenceKey==='rgb'?referenceOutput:otherOutput;
         this.outputs={l:outL,rgb:outRGB};
         this.finalL=ldmMeasure(outL.mainView.image,this.stars,o);
         let outY=ldmLuminance(outRGB.mainView.image,this.weights);
         try { this.finalRGB=ldmMeasure(outY,this.stars,o); } finally { outY.free(); }
         // Preserve the reference sample exactly; add only the retained other
         // image, paired with its original linear fits at the same star indices.
         let om=ldmReferenceMeasurements(this.otherKey==='l'?this.initialL:this.initialRGB,
            this.otherKey==='l'?this.finalL:this.finalRGB,this.referenceSelectedCount);
         this.beforeAfterMeasurements[this.otherKey]=om;
         let otherLabel=this.otherKey==='l'?'Luminance':'Extracted RGB luminance';
         this.log(otherLabel+' before / after BXT: '+om.n+'/'+om.selected+' initially selected stars paired; median combined FWHM '+
            om.before.toFixed(3)+' / '+om.after.toFixed(3)+' px.');
         this.log(otherLabel+' median PSF X widths: '+om.beforeX.toFixed(3)+' / '+om.afterX.toFixed(3)+
            ' px; PSF Y widths: '+om.beforeY.toFixed(3)+' / '+om.afterY.toFixed(3)+' px.');
         this.log(otherLabel+' linear fit: '+ldmFitText(om.fit)+'.');
         this.final=ldmCompare(this.finalL,this.finalRGB,this.stars);
         this.haloMetric=this.bestOther.haloMetric;
         this.channelMetrics=[];
         for (let c=0;c<3;++c) this.channelMetrics.push(ldmCompare(this.finalL,ldmMeasure(outRGB.mainView.image,this.stars,o,c),this.stars));
         this.passed=this.final.pass && this.channelMetrics.every(m=>m.pass) && this.haloMetric.pass && this.referenceDarkCount===0;
         this.settingsLines=['L ('+this.sourceL+'): '+this.settingsText(this.best.l.settings),
            'RGB ('+this.sourceRGB+'): '+this.settingsText(this.best.rgb.settings)];
         this.log('FINAL BLURXTERMINATOR SETTINGS');
         for(let line of this.settingsLines)this.log(line);
         this.log('Automatic PSF is enabled. Remaining process parameters retain installed defaults.');
         this.log(ldmHaloText(this.haloMetric));
         this.log('Halo wing flux ratio is other / reference after flux normalization within the common aperture. Reference dark-ring flags: '+this.referenceDarkCount+'.');
         this.log(this.describe('L vs linear RGB Y',this.final));
         for (let c=0;c<3;++c) this.log(this.describe('L vs '+['R','G','B'][c],this.channelMetrics[c]));
         for (let c=0;c<9;++c) {
            let m=this.final.regions[c];
            this.log('Field cell '+(1+Math.floor(c/3))+','+(1+c%3)+': '+m.n+' stars; '+(m.n>=5?(100*m.error).toFixed(2)+'% median absolute mismatch':'insufficient regional support (<5).'));
         }
         this.log(this.passed?'PASS: measured halo-profile and stellar-width criteria satisfied. Inspect the blink preview before accepting.':
            'REVIEW: the retained result does not satisfy all halo-profile, dark-ring and FWHM/channel criteria with Sharpen Stars fixed. Inspect the result; it is not certified as matched.');
         this.log('Only BXT changes output pixels. Measurements and the blink display do not stretch or normalize outputs.');
         this.log('Matching is approximate and model-dependent. Later stretches can change apparent star profiles.');
         // Source snapshots are no longer needed; release several full-frame buffers.
         ldmClose(this.l); ldmClose(this.rgb);
         this.owned=this.owned.filter(w=>w===outL || w===outRGB); this.l=null; this.rgb=null;
      } catch (e) { this.dispose(); throw e; }
   }
   log(s) { this.report.push(s); console.writeln(s); }
   settingsText(s){return 'Sharpen Stars='+s.strength.toFixed(6)+'; Adjust Star Halos='+s.halo.toFixed(6)+'; Sharpen Nonstellar='+s.nonstellar.toFixed(6);}
   describe(label,m) {
      return label+': '+m.l.toFixed(3)+' / '+m.rgb.toFixed(3)+' px; median |difference| '+(100*m.median).toFixed(2)+
         '%; P90 '+(100*m.p90).toFixed(2)+'%; '+m.n+'/'+m.total+' stars; '+(m.pass?'PASS':'REVIEW');
   }
   process(key,strength,halo) {
      ldmAbort();
      let w=ldmCopy((key==='l'?this.l:this.rgb).mainView,'LDM_trial_'+key);
      try {
         let p=ldmBXT(strength,halo,this.o.nonstellar);
         ++this.bxtRuns;
         if (!p.executeOn(w.mainView,false)) throw new Error('BlurXTerminator failed or was aborted.');
         this.lastBXTSettings={strength:p.sharpen_stars,halo:p.adjust_star_halos,nonstellar:p.sharpen_nonstellar};
         ldmAbort(); return w;
      } catch(e) { ldmClose(w); throw e; }
   }
   measureWindow(w,key) {
      let y=null;
      try {
         let im=w.mainView.image;
         if(key==='rgb'){y=ldmLuminance(im,this.weights);im=y;}
         return ldmMeasure(im,this.stars,this.o);
      }finally{if(y)y.free();}
   }
   measureHaloWindow(w,key,fits) {
      let y=null;
      try {
         let im=w.mainView.image;
         if(key==='rgb'){y=ldmLuminance(im,this.weights);im=y;}
         return ldmHaloProfiles(im,this.stars,fits,this.haloGeometry);
      }finally{if(y)y.free();}
   }
   prepareHalos() {
      if(this.referenceHalos)return;
      this.status('Measuring reference halos and freezing the profile apertures...');
      this.haloGeometry=this.stars.map((s,i)=>ldmHaloGeometry(s,this.referenceFits[i]));
      let ref=this.measureHaloWindow(this.referenceOutput,this.referenceKey,this.referenceFits);
      let source=this.measureHaloWindow(this.otherKey==='l'?this.l:this.rgb,this.otherKey,
         this.otherKey==='l'?this.initialL:this.initialRGB);
      this.referenceDarkCount=ref.filter(p=>p && p.dark).length;
      let selected=ref.map((p,i)=>p && source[i] && !p.dark && p.wing>Math.max(.01,10*p.wingNoise)?p:null);
      let n=selected.filter(Boolean).length;
      this.log('Halo reference selection: '+n+'/'+this.stars.length+' stars; '+this.referenceDarkCount+' reference dark-ring flags.');
      if(n<LDM_HALO_MIN_STARS)throw new Error('Only '+n+' reliable halo profiles; at least '+LDM_HALO_MIN_STARS+
         ' are required. Profiles need isolated unsaturated stars, sufficient outer-wing signal and room for a separate background annulus. The reference preview remains available.');
      this.referenceHalos=selected;
      this.log('Halo apertures are fixed in registered pixels. Six outer annuli start at one reference FWHM radius; flux aperture radii '+
         Math.min(...selected.filter(Boolean).map(p=>p.aperture)).toFixed(2)+' to '+Math.max(...selected.filter(Boolean).map(p=>p.aperture)).toFixed(2)+' px.');
      this.log('Halo acceptance: median profile mismatch <=10%, P90 <=25%, >=20 profiles and >=80% support, no detected dark rings. FWHM limits remain 5% / 10%.');
   }
   trial(key,strength,halo) {
      if(key===this.referenceKey)throw new Error('The fixed reference must not be searched.');
      this.status('Newton trial '+this.bxtRuns+'/'+LDM_MAX_TRIALS+': '+(key==='l'?'L':'RGB')+' stars '+strength.toFixed(4)+', halos '+halo.toFixed(4)+'...');
      let w=this.process(key,strength,halo);
      try {
         let fits=this.measureWindow(w,key);
         let t={strength:this.lastBXTSettings.strength,halo:this.lastBXTSettings.halo,fits:fits,settings:this.lastBXTSettings};
         t.profiles=this.measureHaloWindow(w,key,fits);
         t.haloMetric=ldmCompareHalos(this.referenceHalos,t.profiles);
         t.residuals=t.haloMetric.residuals;t.cost=ldmCost(t.residuals);
         t.widthMetric=this.referenceKey==='l'?ldmCompare(this.referenceFits,fits,this.stars):ldmCompare(fits,this.referenceFits,this.stars);
         t.metric={...t.widthMetric,pass:t.widthMetric.pass && t.haloMetric.pass && this.referenceDarkCount===0};
         let valid=fits.filter(v=>v);
         this.log('Trial '+key+' stars='+t.strength.toFixed(6)+', halos='+t.halo.toFixed(6)+': '+valid.length+' fits; median '+ldmMedian(valid.map(v=>v.f)).toFixed(3)+' px; profile loss '+t.cost.toExponential(4)+'.');
         this.log(ldmHaloText(t.haloMetric)+'; FWHM '+(t.widthMetric.pass?'PASS':'REVIEW')+'.');
         if(ldmPrefer(t,this.bestOther)){
            if(this.bestOther){let old=this.bestOther.window;ldmClose(old);this.owned=this.owned.filter(v=>v!==old);this.bestOther.window=null;}
            t.window=w;this.owned.push(w);this.bestOther=t;w=null;
         }
         return t;
      } finally { ldmClose(w); }
   }
   dispose() {
      for (let w of this.owned) ldmClose(w);this.owned=[];this.outputs=null;this.referenceOutput=null;
      if(this.referenceBefore)this.referenceBefore.free();this.referenceBefore=null;
   }
   publish() {
      if (!this.outputs) throw new Error('Calculate a preview first.');
      let l=this.outputs.l,r=this.outputs.rgb, made=[];
      try {
         // Publishing copies permits repeated preview comparisons and keeps ownership clear.
         let a=ldmCopy(l.mainView,this.sourceL+'_BXT'); made.push(a);
         let b=ldmCopy(r.mainView,this.sourceRGB+'_BXT'); made.push(b);
         a.show(); b.show();
         return [a.mainView.id,b.mainView.id];
      } catch(e) { for(let w of made)ldmClose(w); throw e; }
   }
   applyToInputs() {
      if(!this.outputs)throw new Error('Calculate a preview first.');
      if(this.appliedToInputs)throw new Error('These results have already been applied to the input images.');
      let names=ldmApplyResults(this.inputStates,[this.outputs.l.mainView.image,this.outputs.rgb.mainView.image]);
      this.appliedToInputs=true;
      return names;
   }
}

/** Display buffers only. The shared transfer is computed from output RGB Y.
 * Optional positive affine brightness alignment helps compare star widths
 * despite different filter throughput. It is NEVER applied to output windows.
 */
function ldmDisplaySTF(im) {
   let med=im.median(),sigma=1.4826*im.MAD(med),low=Math.max(0,med-2.8*sigma);
   let x=Math.max(1e-7,Math.min(1-1e-7,(med-low)/(1-low)));
   let target=0.25,m=x*(target-1)/((2*target-1)*x-target);
   let row=[Math.max(1e-6,Math.min(1-1e-6,m)),low,1,0,1];
   return [row.slice(),row.slice(),row.slice(),[0.5,0,1,0,1]];
}
function ldmReferenceFrames(a,displaySTF) {
   if(!a.referenceBefore || !a.referenceOutput)throw new Error('Calculate the reference first.');
   let before=new Image,after=null;
   try {
      before.assign(a.referenceBefore);
      let im=a.referenceOutput.mainView.image;
      if(a.referenceKey==='rgb')after=ldmLuminance(im,a.weights);
      else {after=new Image;after.assign(im);}
      // One transfer derived from BEFORE, applied to detached buffers only.
      // No brightness normalization: show actual changes caused by BXT.
      if(displaySTF){let stf=ldmDisplaySTF(a.referenceBefore);before.applyDisplayFunction(stf);after.applyDisplayFunction(stf);}
      return [before.render(),after.render()];
   }finally{before.free();if(after)after.free();}
}
function ldmFrames(a,o) {
   let rgb=a.outputs.rgb.mainView.image, l=a.outputs.l.mainView.image;
   let y=ldmLuminance(rgb,a.weights), dl=new Image, dr=new Image;
   try {
      dl.assign(l,new Rect(0,0,l.width,l.height),0,0);
      dr.assign(y); // Always blink extracted linear RGB luminance against L.
      if (o.normalizeDisplay) {
         let ratios=[];
         for(let i=0;i<a.stars.length;++i) if(a.finalL[i] && a.finalRGB[i]) ratios.push(a.finalRGB[i].a/a.finalL[i].a);
         let gain=ldmMedian(ratios), offset=y.median()-gain*dl.median();
         if(!(gain>0) || !Number.isFinite(gain+offset)) throw new Error('Cannot align preview brightness.');
         dl.apply(gain,ImageOp.Mul); dl.apply(offset,ImageOp.Add);
      }
      if(o.autoDisplay) {
         let stf=ldmDisplaySTF(y);
         dl.applyDisplayFunction(stf); dr.applyDisplayFunction(stf);
      }
      ldmAbort();
      return [dl.render(),dr.render()];
   } finally { y.free(); dl.free(); dr.free(); }
}

function ldmDocumentationPath(scriptFile=LDM_SCRIPT_FILE,docDirectory=CoreApplication.docDirPath) {
   let relative='/scripts/LRGBDeconvolutionMatch/LRGBDeconvolutionMatch.html';
   let installed=docDirectory.replace(/[\\/]+$/,'')+relative;
   if(File.exists(installed))return installed;
   let adjacent=File.extractDrive(scriptFile)+File.extractDirectory(scriptFile)+'/doc'+relative;
   return File.exists(adjacent)?adjacent:'';
}
function ldmShowDocumentation() {
   let path=ldmDocumentationPath();
   if(path)Dialog.openBrowser(path,'LRGB Deconvolution Match - User Guide');
   else new MessageBox('The LRGB Deconvolution Match user guide is missing. Check that the TGScripts installation includes its documentation.',
      'User documentation not found',StdIcon.Warning,StdButton.Ok).execute();
}

function ldmTool(parent,resource,tip,action) {
   let b=new ToolButton(parent); b.icon=parent.scaledResource(resource);
   b.setScaledFixedSize(24,24); b.toolTip=tip; if(action)b.onClick=action; return b;
}
function ldmRow(parent,label,control) {
   let s=new HorizontalSizer; s.spacing=8;
   let t=new Label(parent); t.text=label; t.setScaledMinWidth(110);
   s.add(t); s.add(control,100); return s;
}
function ldmNumber(parent,label,value,lo,hi,digits) {
   let n=new NumericEdit(parent); n.label.text=label; n.setRange(lo,hi);
   n.setPrecision(digits); n.setValue(value); return n;
}



/** Ordinary least squares of vertical on horizontal FWHM, with a free intercept.
 * Fit every valid pair displayed in a series, without further
 * clipping or weighting. Center the sums to avoid cancellation.
 */
function ldmLinearFit(points) {
   let p=points.filter(v=>Number.isFinite(v.x) && Number.isFinite(v.y)),n=p.length;
   if(n<2)return {valid:false,n:n,reason:'fewer than two paired stars'};
   let mx=p.reduce((s,v)=>s+v.x,0)/n,my=p.reduce((s,v)=>s+v.y,0)/n;
   let xx=0,xy=0,yy=0;
   for(let v of p){let x=v.x-mx,y=v.y-my;xx+=x*x;xy+=x*y;yy+=y*y;}
   if(xx<=Number.EPSILON*n*Math.max(1,mx*mx))
      return {valid:false,n:n,reason:'insufficient horizontal FWHM spread'};
   let slope=xy/xx,intercept=my-slope*mx;
   let sse=p.reduce((s,v)=>s+(v.y-(slope*v.x+intercept))**2,0);
   let r2=yy>Number.EPSILON*n*Math.max(1,my*my)?ldmClamp(1-sse/yy,0,1):null;
   return {valid:true,n:n,slope:slope,intercept:intercept,r2:r2,
      xmin:Math.min(...p.map(v=>v.x)),xmax:Math.max(...p.map(v=>v.x))};
}
function ldmFitEquation(f,x='before',y='after') {
   return y+' = '+f.slope.toFixed(4)+' * '+x+' '+(f.intercept<0?'- ': '+ ')+Math.abs(f.intercept).toFixed(4)+' px';
}
function ldmFitText(f) {
   return f.valid?ldmFitEquation(f)+'; R^2 = '+(f.r2===null?'undefined (constant after widths)':f.r2.toFixed(4)):
      'unavailable ('+f.reason+')';
}
function ldmReferenceMeasurements(before,after,selected) {
   let points=[];
   for(let i=0;i<before.length;++i)if(before[i] && after[i] &&
      Number.isFinite(before[i].f) && Number.isFinite(after[i].f) && before[i].f>0 && after[i].f>0)
      points.push({index:i,x:before[i].f,y:after[i].f,
         beforeX:before[i].fx,beforeY:before[i].fy,afterX:after[i].fx,afterY:after[i].fy});
   return {points:points,n:points.length,selected:selected,fit:ldmLinearFit(points),
      before:ldmMedian(points.map(p=>p.x)),after:ldmMedian(points.map(p=>p.y)),
      beforeX:ldmMedian(points.map(p=>p.beforeX)),beforeY:ldmMedian(points.map(p=>p.beforeY)),
      afterX:ldmMedian(points.map(p=>p.afterX)),afterY:ldmMedian(points.map(p=>p.afterY))};
}
function ldmBeforeAfterSeries(a) {
   if(!a || !a.beforeAfterMeasurements)return [];
   let series=['l','rgb'].filter(key=>a.beforeAfterMeasurements[key]).map(key=>({
      key:key,label:(key==='l'?'Luminance':'RGB luminance')+(key===a.referenceKey?' [reference]':' [optimized]'),
      axes:'x: before BXT; y: after BXT',symbol:key==='l'?'blue circles':'orange squares',
      color:key==='l'?0xff55b4dc:0xffff976b,measurement:a.beforeAfterMeasurements[key]}));
   if(a.finalL && a.finalRGB)series.push({key:'final',label:'Final Luminance / RGB luminance',
      axes:'x: final Luminance; y: final RGB luminance',symbol:'green diamonds',color:0xff91d69b,
      measurement:ldmReferenceMeasurements(a.finalL,a.finalRGB,a.stars.length)});
   return series;
}

// Independent axes follow all displayed measurements, with 6% margins.
// A small minimum span handles constant or nearly constant measured widths.
function ldmAxisRange(values) {
   let finite=values.filter(Number.isFinite);
   if(!finite.length)return {min:0,max:1,step:.2,digits:1,ticks:[0,.2,.4,.6,.8,1]};
   let lo=Math.min(...finite),hi=Math.max(...finite),center=(lo+hi)/2;
   let span=Math.max(hi-lo,.02*Math.max(1,Math.abs(center)));
   let min=Math.max(0,center-.56*span),max=center+.56*span;
   let raw=(max-min)/5,power=Math.pow(10,Math.floor(Math.log10(raw)));
   let factor=[1,2,2.5,5,10].reduce((a,b)=>Math.abs(Math.log(b*power/raw))<Math.abs(Math.log(a*power/raw))?b:a);
   let step=factor*power,digits=Math.max(1,-Math.floor(Math.log10(step))+(factor===2.5?1:0)),ticks=[];
   for(let i=Math.ceil(min/step);i*step<=max+step*1e-9;++i)ticks.push(i*step);
   return {min:min,max:max,step:step,digits:Math.min(12,digits),ticks:ticks};
}
function ldmPlotBounds(points) {
   return {x:ldmAxisRange(points.map(p=>p.x)),y:ldmAxisRange(points.map(p=>p.y))};
}
// Clip to both nonzero axis ranges and the observed horizontal-width range.
function ldmFitSegment(f,bounds) {
   if(!f || !f.valid)return null;
   let lo=Math.max(bounds.x.min,f.xmin),hi=Math.min(bounds.x.max,f.xmax);
   if(f.slope===0){if(f.intercept<bounds.y.min || f.intercept>bounds.y.max)return null;}
   else {
      let a=(bounds.y.min-f.intercept)/f.slope,b=(bounds.y.max-f.intercept)/f.slope;
      lo=Math.max(lo,Math.min(a,b));hi=Math.min(hi,Math.max(a,b));
   }
   return lo<=hi?[{x:lo,y:ldmClamp(f.slope*lo+f.intercept,bounds.y.min,bounds.y.max)},
      {x:hi,y:ldmClamp(f.slope*hi+f.intercept,bounds.y.min,bounds.y.max)}]:null;
}
function ldmEqualitySegment(bounds) {
   return ldmFitSegment({valid:true,slope:1,intercept:0,xmin:bounds.x.min,xmax:bounds.x.max},bounds);
}
class LDMScatter extends Control {
   constructor(parent){
      super(parent);this.analysis=null;this.points=[];this.series=[];this.bounds=ldmPlotBounds([]);this.setScaledMinSize(760,505);
      this.onPaint=()=>{
         let g=new Graphics(this);
         try{
            let s=this.displayPixelRatio;
            g.fillRect(0,0,this.width,this.height,new Brush(0xff18202b));
            g.font=this.font;g.pen=new Pen(0xffe6edf3);
            if(!this.analysis || !this.points.length){g.drawText(20*s,40*s,
               'Calculate the reference preview to plot its before/after star FWHMs.');return;}
            let legend=this.legend(),legendWidth=Math.max(...legend.map(line=>this.font.width(line.text)))+12*s;
            let bounds=this.bounds;
            let left=65*s,top=48*s,side=Math.max(40*s,Math.min(this.width-left-legendWidth-36*s,this.height-100*s)),bottom=top+side;
            let X=v=>left+side*(v-bounds.x.min)/(bounds.x.max-bounds.x.min);
            let Y=v=>bottom-side*(v-bounds.y.min)/(bounds.y.max-bounds.y.min);
            g.drawText(left,18*s,'Star FWHM comparison');
            g.drawText(left,37*s,'Vertical FWHM (px)');
            for(let v of bounds.x.ticks){
               let tick=v.toFixed(bounds.x.digits);
               g.pen=new Pen(0xff344051);g.drawLine(X(v),top,X(v),bottom);
               g.pen=new Pen(0xffaebacc);g.drawText(X(v)-this.font.width(tick)/2,bottom+17*s,tick);
            }
            for(let v of bounds.y.ticks){
               let tick=v.toFixed(bounds.y.digits);
               g.pen=new Pen(0xff344051);g.drawLine(left,Y(v),left+side,Y(v));
               g.pen=new Pen(0xffaebacc);
               g.drawText(left-10*s-this.font.width(tick),Y(v)+4*s,tick);
            }
            g.pen=new Pen(0xff657184);g.drawRect(left,top,left+side,bottom);
            g.antialiasing=true;
            let equality=ldmEqualitySegment(bounds);
            if(equality){g.pen=new Pen(0xffc2cad4,1.5*s,PenStyle.Dash);
               g.drawLine(X(equality[0].x),Y(equality[0].y),X(equality[1].x),Y(equality[1].y));}
            for(let series of this.series){
               let segment=ldmFitSegment(series.measurement.fit,bounds);
               if(segment){g.pen=new Pen(series.color,2*s);g.drawLine(X(segment[0].x),Y(segment[0].y),X(segment[1].x),Y(segment[1].y));}
            }
            for(let series of this.series)for(let p of series.measurement.points){
               if(series.key==='l')g.fillCircle(X(p.x),Y(p.y),2.6*s,new Brush(series.color));
               else {
                  let r=3.5*s,x=X(p.x),y=Y(p.y);g.pen=new Pen(series.color,1.5*s);
                  if(series.key==='rgb')g.drawRect(x-r,y-r,x+r,y+r);
                  else {g.drawLine(x,y-r,x+r,y);g.drawLine(x+r,y,x,y+r);g.drawLine(x,y+r,x-r,y);g.drawLine(x-r,y,x,y-r);}
               }
            }
            g.pen=new Pen(0xffe6edf3);let label='Horizontal FWHM (px)';
            g.drawText(left+(side-this.font.width(label))/2,bottom+38*s,label);
            let tx=left+side+22*s,ty=top+20*s;
            for(let line of legend){g.pen=new Pen(line.color || 0xffe6edf3);g.drawText(tx,ty,line.text);ty+=18*s;}
         }finally{g.end();}
      };
   }
   legend(){
         let lines=[{text:ldmEqualitySegment(this.bounds)?'Dashed gray: y = x (equal FWHM)':'y = x lies outside the displayed ranges',color:0xffc2cad4}];
         for(let series of this.series){
            let m=series.measurement,f=m.fit;
            for(let text of [series.label+' ('+series.symbol+')',series.axes,
               m.n+' / '+m.selected+' stars paired; medians x / y (px):',
               'Combined: '+m.before.toFixed(3)+' / '+m.after.toFixed(3),
               'Major: '+m.beforeX.toFixed(3)+' / '+m.afterX.toFixed(3)+'; minor: '+m.beforeY.toFixed(3)+' / '+m.afterY.toFixed(3),
               f.valid?ldmFitEquation(f,'x','y'):'Fit unavailable:',
               f.valid?'R^2 = '+(f.r2===null?'undefined (constant y)':f.r2.toFixed(4)):f.reason])
               lines.push({text:text,color:series.color});
            lines.push({text:''});
         }
         if(this.series.length===1)lines.push({text:'Match the other image to add its data.'});

         return lines;
   }
   setAnalysis(a){
      this.analysis=a;
      this.series=ldmBeforeAfterSeries(a);
      this.points=this.series.flatMap(series=>series.measurement.points);
      this.bounds=ldmPlotBounds(this.points);
      this.update();
   }
}

/** Applied values are reported separately from the other-image estimate.
 * A pending image has no applied settings until matching has completed.
 */
function ldmSettingsReport(a) {
   let ready=!!(a && a.referenceSettings),done=ready && !!(a.final && a.best);
   let rows=['l','rgb'].map(key=>{
      let name=key==='l'?'Luminance':'RGB',id=a?(key==='l'?a.sourceL:a.sourceRGB):'';
      let role=ready?(key===a.referenceKey?'reference':done?'optimized':'pending'):'';
      let settings=done?a.best[key].settings:ready && key===a.referenceKey?a.referenceSettings:null;
      let label=name+(id?': '+id:'')+(role?' ('+role+')':'');
      return {key:key,cells:[label,...['strength','halo','nonstellar'].map(k=>settings?settings[k].toFixed(6):'-')]};
   });
   if(!ready)return {rows:rows,lines:['Calculate the reference preview to show the applied BlurXTerminator settings.']};
   let other=a.referenceKey==='l'?'RGB':'Luminance';
   let estimate=other+' Sharpen Stars estimate: '+(a.estimate.valid?a.estimate.value.toFixed(6)+' (held fixed during matching).':a.estimate.reason);
   let lines=[(done?'Result: '+(a.passed?'PASS':'REVIEW')+'    |    ':'')+
      'Automatic PSF: on    |    BXT runs: '+a.bxtRuns];
   if(done){
      lines.push(estimate);
      if(a.haloMetric)lines.push(ldmHaloText(a.haloMetric));
      if(a.referenceDarkCount>0)lines.push('Reference dark-ring flags: '+a.referenceDarkCount+'; inspect the reference preview.');
      lines.push('Stopped: '+a.optimization.reason.replace(/\.+$/,'')+'.');
   }
   else {
      let m=a.referenceMeasurement;
      lines.push('Reference FWHM: '+m.before.toFixed(3)+' -> '+m.after.toFixed(3)+' px ('+m.n+' paired stars).');
      lines.push(estimate);
   }
   return {rows:rows,lines:lines};
}

class LDMDialog extends Dialog {
   constructor(o) {
      super(); this.windowTitle='LRGB Deconvolution Match '+LDM_VERSION;
      this.analysis=null;this.frames=null;this.referenceFrames=null;this.running=false;
      this.blinking=false;this.referenceBlinking=false;this.frame=0;this.referenceFrame=1;
      this.timer=new Timer(0.75,false,this);
      this.timer.onTimeout=()=>{
         if(!this.blinking || this.running) return;
         try { this.showFrame(1-this.frame); this.timer.start(); }
         catch(e) { this.stopBlink(); this.status.text='Blink stopped: '+(e.message || String(e)); }
      };
      this.referenceTimer=new Timer(0.75,false,this);
      this.referenceTimer.onTimeout=()=>{
         if(!this.referenceBlinking || this.running)return;
         try{this.showReferenceFrame(1-this.referenceFrame);this.referenceTimer.start();}
         catch(e){this.stopBlink();this.status.text='Reference blink stopped: '+(e.message || String(e));}
      };
      this.intro=new Label(this); this.intro.wordWrapping=true;
      this.intro.text='Prepare registered linear Luminance and RGB images for LRGB composition, including data from different telescope setups and original pixel scales. '+
         'Deconvolve the reference, then match the other image. Create new linear images or apply the results to the inputs.';
      const labelWidth=Math.max(this.font.width('Minimum Adjust Star Halos:')+8,Math.round(185*this.displayPixelRatio));
      const fieldWidth=Math.max(this.font.width('0.000')+24,Math.round(65*this.displayPixelRatio));
      let group=(parent,title)=>{
         let g=new GroupBox(parent);g.title=title;
         g.sizer=new VerticalSizer;g.sizer.margin=10;g.sizer.spacing=8;return g;
      };
      let number=(g,label,value,lo,hi,digits)=>{
         let n=ldmNumber(g,label,value,lo,hi,digits);
         n.label.setFixedWidth(labelWidth);n.edit.setFixedWidth(fieldWidth);
         n.setFixedWidth(labelWidth+fieldWidth+Math.round(10*this.displayPixelRatio));
         g.sizer.add(n);return n;
      };
      this.imagesGroup=group(this,'Images');
      this.referenceGroup=group(this,'Reference deconvolution');
      this.otherGroup=group(this,'Other image: halo optimization');
      this.sharedGroup=group(this,'Shared deconvolution');
      this.lList=new ViewList(this.imagesGroup); this.lList.getMainViews(); this.lList.currentView=new View;
      this.rgbList=new ViewList(this.imagesGroup); this.rgbList.getMainViews(); this.rgbList.currentView=new View;
      if(o.l && ldmExists(View.viewById(o.l)))this.lList.currentView=View.viewById(o.l);
      if(o.rgb && ldmExists(View.viewById(o.rgb)))this.rgbList.currentView=View.viewById(o.rgb);
      this.reference=new ComboBox(this.imagesGroup);
      this.reference.addItem('Auto: smaller measured stellar FWHM');this.reference.addItem('Luminance is the sharper reference');this.reference.addItem('RGB is the sharper reference');
      this.reference.currentItem=['auto','l','rgb'].indexOf(o.reference);
      this.reference.toolTip='Auto compares baseline star FWHM on the common registered pixel grid. Select L or RGB explicitly when instrument information or image content makes that a better reference.';
      this.imagesGroup.sizer.add(ldmRow(this.imagesGroup,'Luminance:',this.lList));
      this.imagesGroup.sizer.add(ldmRow(this.imagesGroup,'RGB:',this.rgbList));
      this.imagesGroup.sizer.add(ldmRow(this.imagesGroup,'Sharper reference:',this.reference));
      this.referenceStars=number(this.referenceGroup,'Sharpen Stars:',o.referenceStars,0,LDM_MAX_STARS,2);
      this.referenceHalo=number(this.referenceGroup,'Adjust Star Halos:',o.referenceHalo,LDM_MIN_HALO,LDM_MAX_HALO,2);
      this.referenceGroup.sizer.addStretch();
      this.referenceStars.toolTip='Default Sharpen Stars is 0.50. Your chosen value is applied once to the reference and remains fixed during matching.';
      this.referenceHalo.toolTip='Default Adjust Star Halos is 0.00. Your chosen value is applied once to the reference and remains fixed during matching.';
      this.nonstellar=number(this.sharedGroup,'Sharpen Nonstellar:',o.nonstellar,0,1,2);
      this.nonstellar.toolTip='Your chosen value is fixed for both images. Automatic PSF stays enabled. Sharpen Stars is estimated from measured widths; only the other image\'s Adjust Star Halos is optimized.';
      this.estimateNote=new Label(this.otherGroup);this.estimateNote.wordWrapping=true;
      this.estimateNote.text='Sharpen Stars is estimated from FWHM and held fixed, without clipping. Outer star profiles drive halo matching.';
      this.otherGroup.sizer.add(this.estimateNote);
      this.haloMin=number(this.otherGroup,'Minimum Adjust Star Halos:',o.haloMin,LDM_MIN_HALO,LDM_MAX_HALO,2);
      this.haloMax=number(this.otherGroup,'Maximum Adjust Star Halos:',o.haloMax,LDM_MIN_HALO,LDM_MAX_HALO,2);
      this.haloMin.toolTip=this.haloMax.toolTip='Default bounds -0.50 to +0.50 allow the full supported Adjust Star Halos range on the other image. Equal bounds hold its halo setting fixed. The reference uses its own settings.';


      this.tabs=new TabBox(this);this.referencePage=new Control(this.tabs);this.previewPage=new Control(this.tabs);this.scatterPage=new Control(this.tabs);
      this.referenceViewer=new ImageView(this.referencePage);this.referenceViewer.setScaledMinSize(700,350);
      this.referenceViewer.setStatusMessage('Select both images, then use this tab\'s magnifier to deconvolve only the reference.');
      this.referenceDisplay=new CheckBox(this.referencePage);this.referenceDisplay.text='Display STF';this.referenceDisplay.checked=o.referenceDisplay;
      this.referenceDisplay.toolTip='Apply the same display transfer, derived from the original reference, to both before/after buffers. No brightness normalization and no change to output pixels.';
      this.referenceCalculate=ldmTool(this.referencePage,':/toolbar/view-zoom.png','Deconvolve only the reference once. Inspect before/after here, then use the bottom magnifier to match the other image.',()=>this.calculateReference());
      this.referencePlay=ldmTool(this.referencePage,':/icons/play.png','Blink the original reference and its initial BXT result every 0.75 seconds.',()=>{
         let was=this.referenceBlinking;this.stopBlink();
         if(!was && this.referenceFrames){this.referenceBlinking=true;this.referenceTimer.start();this.updateButtons();}
      });
      this.referenceStep=ldmTool(this.referencePage,':/icons/step-forward.png','Pause and switch between the reference before and after BXT.',()=>{this.stopBlink();if(this.referenceFrames)this.showReferenceFrame(1-this.referenceFrame);});
      let referenceTools=new HorizontalSizer;referenceTools.spacing=8;
      referenceTools.add(this.referenceCalculate);referenceTools.add(this.referenceDisplay);referenceTools.addStretch();referenceTools.add(this.referencePlay);referenceTools.add(this.referenceStep);
      this.referencePage.sizer=new VerticalSizer;this.referencePage.sizer.margin=6;this.referencePage.sizer.spacing=6;
      this.referencePage.sizer.add(this.referenceViewer,100);this.referencePage.sizer.add(referenceTools);
      this.viewer=new ImageView(this.previewPage); this.viewer.setScaledMinSize(700,350);
      this.viewer.setStatusMessage('Click the magnifier to calculate deconvolved preview copies.');
      this.autoDisplay=new CheckBox(this.previewPage); this.autoDisplay.text='Display STF'; this.autoDisplay.checked=o.autoDisplay;
      this.normalizeDisplay=new CheckBox(this.previewPage); this.normalizeDisplay.text='Align preview brightness'; this.normalizeDisplay.checked=o.normalizeDisplay;
      this.normalizeDisplay.toolTip='Use a positive affine scale on the L display buffer only, matching median fitted star amplitude and background to RGB Y. Output samples are untouched.';
      this.play=ldmTool(this.previewPage,':/icons/play.png','Start/stop blinking L and extracted RGB luminance every 0.75 seconds.',()=>{
         let was=this.blinking;this.stopBlink();if(!was && this.frames){this.blinking=true;this.timer.start();this.updateButtons();}
      });
      this.step=ldmTool(this.previewPage,':/icons/step-forward.png','Pause and switch once between L and extracted RGB luminance.',()=>{this.stopBlink();if(this.frames)this.showFrame(1-this.frame);});
      let display=new HorizontalSizer; display.spacing=8;
      display.add(this.autoDisplay); display.add(this.normalizeDisplay); display.addStretch(); display.add(this.play); display.add(this.step);
      this.previewPage.sizer=new VerticalSizer; this.previewPage.sizer.margin=6;this.previewPage.sizer.spacing=6;
      this.previewPage.sizer.add(this.viewer,100);this.previewPage.sizer.add(display);
      this.scatter=new LDMScatter(this.scatterPage);
      this.matchSummary=new Label(this.scatterPage);this.matchSummary.wordWrapping=true;
      this.matchSummary.minHeight=3*this.font.height;
      this.rSquaredNote=new Label(this.scatterPage);this.rSquaredNote.useRichText=true;this.rSquaredNote.wordWrapping=true;
      this.rSquaredNote.text='<b>R<sup>2</sup> (coefficient of determination)</b> is the fraction of the variation in y explained by its fitted line. '+
         '1 means a perfect straight-line fit; 0 means no variation explained. A high R<sup>2</sup> does not establish equal star widths or a good LRGB match. '+
         'It is undefined when all y widths are equal.';
      this.rSquaredNote.minHeight=4*this.font.height;
      this.scatterPage.sizer=new VerticalSizer;this.scatterPage.sizer.margin=6;this.scatterPage.sizer.spacing=6;
      this.scatterPage.sizer.add(this.scatter,100);this.scatterPage.sizer.add(this.matchSummary);this.scatterPage.sizer.add(this.rSquaredNote);


      this.tabs.addPage(this.referencePage,'Reference before/after');
      this.tabs.addPage(this.previewPage,'Matched L / RGB');this.tabs.addPage(this.scatterPage,'FWHM comparison');
      this.reportGroup=group(this,'BlurXTerminator report');
      this.reportTable=new TreeBox(this.reportGroup);this.reportTable.numberOfColumns=4;
      this.reportTable.headerVisible=true;this.reportTable.rootDecoration=false;this.reportTable.alternateRowColor=true;
      this.reportTable.setScaledFixedHeight(78);
      let headers=['Image / role','Sharpen Stars','Adjust Star Halos','Sharpen Nonstellar'];
      for(let i=0;i<headers.length;++i)this.reportTable.setHeaderText(i,headers[i]);
      this.reportTable.onResize=()=>{
         let widths=headers.slice(1).map(t=>this.reportTable.font.width(t)+24*this.displayPixelRatio);
         for(let i=1;i<4;++i)this.reportTable.setColumnWidth(i,widths[i-1]);
         this.reportTable.setColumnWidth(0,Math.max(120*this.displayPixelRatio,this.reportTable.width-widths.reduce((a,b)=>a+b,0)-8*this.displayPixelRatio));
      };
      this.reportNote=new Label(this.reportGroup);this.reportNote.wordWrapping=true;
      this.reportNote.minHeight=4*this.font.height;
      this.reportNote.toolTip='Halo mismatch compares flux-normalized outer profiles in fixed pixel apertures. Wing flux ratio is other / reference. '+
         'Halo limits: median 10%, P90 25%, no detected dark rings. FWHM limits remain 5% / 10%. A halo match alone cannot establish a full match.';
      this.reportGroup.sizer.add(this.reportTable);this.reportGroup.sizer.add(this.reportNote);
      this.status=new Label(this);this.status.wordWrapping=true;this.status.text='Magnifier: calculate. Green checkmark: create new images. Blue square: apply results to input images.';
      this.status.minHeight=2*this.font.height;
      this.instance=ldmTool(this,':/process-interface/new-instance.png','Drag to save the current settings as a process icon.');
      this.instance.onMousePress=()=>{Parameters.clear();let p=this.options();for(let k of Object.keys(p))Parameters.set(k,p[k]);this.newInstance();};
      this.preview=ldmTool(this,':/toolbar/view-zoom.png','Match the other image to the prepared reference. If none is prepared, calculate both stages. Click again after completion to recalculate from the selected source images.',()=>this.calculate());
      this.reset=ldmTool(this,':/process-interface/reset.png','Reset numerical and display settings, and release preview copies.',()=>this.resetSettings());
      this.create=ldmTool(this,':/process-interface/execute.png','Create the two linear deconvolved images from the reviewed preview.',()=>this.publish());
      this.applyInputs=ldmTool(this,':/process-interface/apply.png','Apply the reviewed results to both input images, replacing their pixels. One Undo step per image. No new output windows or disk saves.',()=>this.applyToInputs());
      this.close=ldmTool(this,':/process-interface/cancel.png','Close and release temporary preview images.',()=>this.cancel());
      this.help=ldmTool(this,':/process-interface/browse-documentation.png','Open the PIDoc user guide.',ldmShowDocumentation);
      let actions=new HorizontalSizer;actions.spacing=8;
      actions.add(this.instance);actions.add(this.preview);actions.add(this.reset);actions.addStretch();actions.add(this.create);actions.add(this.applyInputs);actions.add(this.close);actions.add(this.help);
      let deconvolutionRow=new HorizontalSizer;deconvolutionRow.spacing=10;
      deconvolutionRow.add(this.referenceGroup,50);deconvolutionRow.add(this.otherGroup,50);
      this.sizer=new VerticalSizer;this.sizer.margin=10;this.sizer.spacing=8;
      this.sizer.add(this.intro);this.sizer.add(this.imagesGroup);this.sizer.add(deconvolutionRow);this.sizer.add(this.sharedGroup);
      this.sizer.add(this.tabs,100);this.sizer.add(this.reportGroup);this.sizer.add(this.status);this.sizer.add(actions);
      this.numeric=[this.referenceStars,this.referenceHalo,this.nonstellar,this.haloMin,this.haloMax];
      for(let n of this.numeric)n.onValueUpdated=()=>this.invalidate();
      this.lList.onViewSelected=this.rgbList.onViewSelected=this.reference.onItemSelected=()=>this.invalidate();
      for(let c of [this.autoDisplay,this.normalizeDisplay])c.onCheck=()=>{if(this.analysis)this.refreshDisplay();};
      this.referenceDisplay.onCheck=()=>{
         if(!this.running && this.analysis && this.analysis.referenceOutput){
            this.stopBlink();this.busy(true);
            try{this.makeReferenceFrames();}catch(e){this.status.text='Reference preview error: '+(e.message || String(e));}
            finally{this.busy(false);}
         }
      };
      this.tabs.onPageSelected=()=>this.stopBlink();
      this.onClose=()=>{if(this.running)return false;this.stopBlink();return true;};
      this.updateMeasurements();this.updateButtons();this.adjustToContents();
   }
   options() {
      let o=ldmDefaults();o.l=ldmExists(this.lList.currentView)?this.lList.currentView.id:'';
      o.rgb=ldmExists(this.rgbList.currentView)?this.rgbList.currentView.id:'';
      for(let k of ['referenceStars','referenceHalo','nonstellar','haloMin','haloMax'])o[k]=this[k].value;
      for(let k of ['autoDisplay','normalizeDisplay','referenceDisplay'])o[k]=this[k].checked;
      o.reference=['auto','l','rgb'][this.reference.currentItem];return o;
   }
   updateButtons() {
      let ready=!this.running && !!this.frames;
      this.play.enabled=this.step.enabled=ready;this.create.enabled=!this.running && !!(this.analysis && this.analysis.outputs);
      this.applyInputs.enabled=this.create.enabled && !this.analysis.appliedToInputs;
      this.referencePlay.enabled=this.referenceStep.enabled=!this.running && !!this.referenceFrames;
      this.play.icon=this.scaledResource(this.blinking?':/icons/stop.png':':/icons/play.png');
      this.referencePlay.icon=this.scaledResource(this.referenceBlinking?':/icons/stop.png':':/icons/play.png');
   }
   stopBlink() {this.timer.stop();this.referenceTimer.stop();this.blinking=false;this.referenceBlinking=false;this.updateButtons();}
   showReferenceFrame(index) {
      if(!this.referenceFrames)return;
      this.referenceViewer.regenerate(this.referenceFrames[index]);this.referenceFrame=index;
      let a=this.analysis,name=a.referenceKey==='l'?a.sourceL:a.sourceRGB+' (extracted luminance)';
      this.referenceViewer.setStatusMessage(name+(index===0?' | BEFORE BXT':' | AFTER initial BXT')+
         (this.referenceDisplay.checked?' | shared display STF':' | linear display'));
   }
   clearReferenceFrames() {
      this.stopBlink();this.referenceViewer.clear();
      if(this.referenceFrames)for(let b of this.referenceFrames)b.clear();
      this.referenceFrames=null;this.updateButtons();
   }
   makeReferenceFrames() {
      this.clearReferenceFrames();this.referenceFrames=ldmReferenceFrames(this.analysis,this.referenceDisplay.checked);
      this.updateMeasurements();
      this.referenceViewer.setImage(this.referenceFrames[1]);this.referenceViewer.zoomToFit();this.showReferenceFrame(1);
   }
   showFrame(index) {
      if(!this.frames)return;
      this.viewer.regenerate(this.frames[index]);this.frame=index;
      let reference=this.analysis && (index===0?'l':'rgb')===this.analysis.referenceKey;
      this.viewer.setStatusMessage((index===0?'Deconvolved L':'Extracted luminance of deconvolved RGB')+(reference?' [fixed reference]':' [other image]')+
         (this.autoDisplay.checked?' | shared display STF':' | linear display')+(this.normalizeDisplay.checked?' | preview brightness aligned':''));
   }
   clearFrames() {
      this.stopBlink();this.viewer.clear();
      if(this.frames)for(let b of this.frames)b.clear();this.frames=null;this.updateButtons();
   }
   invalidate() {
      if(this.running)return;
      this.clearFrames();this.clearReferenceFrames();if(this.analysis)this.analysis.dispose();this.analysis=null;
      this.updateMeasurements();
      this.viewer.setStatusMessage('Click the magnifier to calculate a fresh preview.');
      this.referenceViewer.setStatusMessage('Use this tab\'s magnifier to calculate the reference before/after preview.');
      this.status.text='Ready to calculate.';this.updateButtons();
   }
   busy(value) {
      this.running=value;
      for(let c of [...this.numeric,this.lList,this.rgbList,this.reference,this.tabs,this.instance,this.preview,this.referenceCalculate,this.reset,this.create,this.applyInputs,this.close,this.help])c.enabled=!value;
      this.updateButtons();
   }
   calculateReference() {
      if(this.running)return;this.invalidate();this.busy(true);console.show();
      let abort=console.abortEnabled;console.abortEnabled=true;
      try{
         this.analysis=new LDMAnalysis(this.lList.currentView,this.rgbList.currentView,this.options(),s=>{this.status.text=s;ldmAbort();},true);
         this.makeReferenceFrames();this.tabs.currentPageIndex=0;
         this.showReferenceSettings();
         this.status.text='Inspect BEFORE/AFTER and FWHM comparison, then use the bottom magnifier to match the other image to this reference result.';
      }catch(e){this.status.text='Error: '+(e.message || String(e));new MessageBox(this.status.text,'Reference preview',StdIcon.Error,StdButton.Ok).execute();}
      finally{console.abortEnabled=abort;this.busy(false);}
   }
   updateReport(){
      let report=ldmSettingsReport(this.analysis);this.reportTable.clear();
      for(let row of report.rows){
         let node=new TreeBoxNode(this.reportTable);
         for(let i=0;i<row.cells.length;++i){node.setText(i,row.cells[i]);node.setToolTip(i,row.cells[i]);}
      }
      this.reportNote.text=report.lines.join('\n');
   }
   showReferenceSettings(){this.updateReport();}
   calculate() {
      if(this.running)return;
      this.stopBlink();if(!this.analysis || this.analysis.outputs)this.invalidate();
      this.busy(true);console.show();
      let abort=console.abortEnabled;console.abortEnabled=true;
      try {
         let o=this.options();
         if(!this.analysis){
            this.analysis=new LDMAnalysis(this.lList.currentView,this.rgbList.currentView,o,s=>{this.status.text=s;ldmAbort();},true);
            this.makeReferenceFrames();
         }
         this.showReferenceSettings();this.analysis.match();
         this.updateMeasurements();
         this.updateReport();
         this.makeFrames();this.tabs.currentPageIndex=1;this.status.text=this.analysis.passed?'Measured criteria passed. Inspect the blink preview, then create new images or apply the results to the inputs.':
            'Review required: halo or FWHM criteria were not met. See the report, FWHM comparison and Process Console.';
      } catch(e) {
         if(this.analysis && !this.analysis.referenceOutput){this.clearFrames();this.clearReferenceFrames();this.analysis=null;this.updateMeasurements();}
         this.status.text='Error: '+(e.message || String(e));
         new MessageBox(this.status.text,'LRGB Deconvolution Match',StdIcon.Error,StdButton.Ok).execute();
      } finally {console.abortEnabled=abort;this.busy(false);}
   }
   updateMeasurements() {
      let a=this.analysis;this.scatter.setAnalysis(a);this.updateReport();
      if(!a || !a.final){
         this.matchSummary.text=a?'Match the other image to add its measurements and the final comparison.':'Calculate the reference preview to measure star widths.';
         return;
      }
      let m=a.final;
      this.matchSummary.text='Final L / RGB luminance: '+m.n+' / '+m.total+' paired stars; median mismatch '+
         (100*m.median).toFixed(2)+'%; 90th percentile '+(100*m.p90).toFixed(2)+'%.\n'+
         (a.passed?'PASS: halo profiles, dark-ring and FWHM/channel checks met.':
            'REVIEW: halo or FWHM/channel checks not all met. See the report and Process Console.');
   }
   makeFrames() {
      this.clearFrames();this.frames=ldmFrames(this.analysis,this.options());
      this.viewer.setImage(this.frames[0]);this.viewer.zoomToFit();this.frame=0;this.showFrame(0);
   }
   refreshDisplay() {
      if(this.running || !this.analysis || !this.analysis.outputs)return;this.stopBlink();this.busy(true);
      try {this.makeFrames();}catch(e){this.status.text='Preview error: '+(e.message || String(e));}
      finally{this.busy(false);}
   }
   publish() {
      if(this.running || !this.analysis || !this.analysis.outputs)return;
      this.stopBlink();this.busy(true);
      try {
         let names=this.analysis.publish();
         this.status.text='Created '+names.join(' and ')+'. Both are linear. '+(this.analysis.passed?'':'Review the halo report and FWHM comparison before combining.');
      }catch(e){this.status.text='Create failed: '+(e.message || String(e));}
      finally{this.busy(false);}
   }
   applyToInputs() {
      if(this.running || !this.analysis || !this.analysis.outputs || this.analysis.appliedToInputs)return;
      this.stopBlink();this.busy(true);
      try {
         let names=this.analysis.applyToInputs();
         this.status.text='Applied to '+names.join(' and ')+'. Undo is available in each image; no files were saved. '+
            (this.analysis.passed?'':'Review the halo report and FWHM comparison before combining.');
      }catch(e){this.status.text='Apply failed: '+(e.message || String(e));}
      finally{this.busy(false);}
   }
   resetSettings() {
      this.invalidate();let o=ldmDefaults();
      for(let k of ['referenceStars','referenceHalo','nonstellar','haloMin','haloMax'])this[k].setValue(o[k]);
      for(let k of ['autoDisplay','normalizeDisplay','referenceDisplay'])this[k].checked=o[k];this.reference.currentItem=0;
      this.lList.currentView=new View;this.rgbList.currentView=new View;
      this.adjustToContents();
   }
   dispose() {this.clearFrames();this.clearReferenceFrames();if(this.analysis)this.analysis.dispose();this.analysis=null;}
}

function ldmMain() {
   CoreApplication.ensureMinimumVersion(1,9,5);
   if(Parameters.isViewTarget)throw new Error('Run this script globally; it needs both L and RGB main images.');
   let o=ldmDefaults();
   for(let k of Object.keys(o))if(Parameters.has(k))
      o[k]=typeof o[k]==='boolean'?Parameters.getBoolean(k):typeof o[k]==='number'?Parameters.getReal(k):Parameters.getString(k);
   let dialog=new LDMDialog(o);try{dialog.execute();}finally{dialog.dispose();}
}
#ifndef LDM_LIBRARY
ldmMain();
#endif
