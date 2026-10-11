#engine v8
#include <pjsr/controls/ImageView.js>
#ifndef LDM_LIBRARY
#feature-id LRGBDeconvolutionMatch : TG Scripts > LRGB Deconvolution Match
#feature-info Deconvolve a fixed sharper reference with user settings, match the other image with BlurXTerminator, and blink L against extracted RGB luminance.
#endif

/* LRGB Deconvolution Match 1.4.1 -- PixInsight 1.9.5+, V8.
 * Original implementation, 2026. MIT license; see accompanying LICENSE.
 * Preview interaction follows the installed Linear Master Blend script.
 * Only BlurXTerminator changes output pixels. No stretch, normalization,
 * convolution, resampling, or LRGB combination is applied to output images.
 * Every trial starts from a pristine snapshot. BXT is never applied repeatedly
 * to the same trial. FWHM measurements use fixed source positions and one PSF
 * model, with explicit fit rejection and matched-star support checks.
 */
const LDM_VERSION = '1.4.1';
const LDM_SCRIPT_FILE = #__FILE__;
const LDM_DEFAULT_STARS = 0.5;
// Supported by the installed BlurXTerminator parameter interface.
const LDM_MAX_STARS = 0.7;
const LDM_MIN_HALO = -0.5;
const LDM_MAX_HALO = 0.5;
const LDM_MIN_STARS = 20;
const LDM_MAX_TRIALS = 10;

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
   return { l:'', rgb:'', maximum:LDM_MAX_STARS,
      reference:'auto', referenceStars:LDM_DEFAULT_STARS, referenceHalo:0,
      tolerance:5, nonstellar:p.sharpen_nonstellar, haloMin:LDM_MIN_HALO, haloMax:LDM_MAX_HALO,
      sensitivity:0.5, saturation:0.85, maxStars:250, floor:1.6,
      model:0, autoDisplay:true, normalizeDisplay:true, referenceDisplay:true };
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
   if (!Number.isFinite(o.maximum) || o.maximum < 0 || o.maximum > LDM_MAX_STARS ||
       !['auto','l','rgb'].includes(o.reference) ||
       !Number.isFinite(o.referenceStars) || o.referenceStars < 0 || o.referenceStars > LDM_MAX_STARS ||
       !Number.isFinite(o.referenceHalo) || o.referenceHalo < LDM_MIN_HALO || o.referenceHalo > LDM_MAX_HALO ||
       !Number.isFinite(o.floor) || o.floor < 1 || o.floor > 10 ||
       o.tolerance < 1 || o.tolerance > 20 || o.saturation <= 0 || o.saturation > 1 ||
       o.maxStars < LDM_MIN_STARS || o.maxStars > 1000 ||
       o.sensitivity < 0 || o.sensitivity > 1 ||
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
   return p;
}
function ldmBXT(strength, halo, nonstellar) {
   let p=ldmBXTDefaults();
   p.sharpen_stars=strength;
   p.adjust_star_halos=halo;
   p.sharpen_nonstellar=nonstellar;
   // All other settings retain the installed process's defaults.
   return p;
}

/** Fit one fixed source at a time to retain its identity even when fits fail.
 * A fixed Moffat-4 model (or optional Gaussian) is used on every image.
 * Small residuals alone cannot establish that deconvolution is artifact-free.
 */
function ldmMeasure(im, stars, o, channel=0) {
   let results = new Array(stars.length).fill(null);
   im.pushSelections();
   let clipped = im.rangeClippingEnabled;
   try {
      im.resetSelections(); im.rangeClippingEnabled = false; im.selectedChannel = channel;
      for (let i=0;i<stars.length;++i) {
         if ((i & 15) === 0) ldmAbort();
         let s=stars[i], peak=im.maximum(s.rect,channel,channel);
         if (!Number.isFinite(peak) || peak >= o.saturation) continue;
         let p = new PSF;
         p.fitSource(im, new Point(s.x,s.y), s.rect,
            o.model === 1 ? PSFunction.Gaussian : PSFunction.Moffat4, false);
         if (!p.isValid || !(p.A > 0) || !Number.isFinite(p.mad) || p.mad/p.A > 0.10) continue;
         let dx=p.x-s.x, dy=p.y-s.y;
         if (dx*dx+dy*dy > 2.25) continue;
         let major=Math.max(p.fwhmX,p.fwhmY), minor=Math.min(p.fwhmX,p.fwhmY);
         let f=Math.sqrt(major*minor), ecc=Math.sqrt(Math.max(0,1-(minor/major)**2));
         if (!Number.isFinite(f) || f < 1 || f > 30 || major > s.radius*1.5 || ecc > 0.8) continue;
         results[i]={f:f, a:p.A, b:p.B, ecc:ecc, x:p.x, y:p.y, residual:p.mad/p.A};
      }
   } finally { im.popSelections(); im.rangeClippingEnabled = clipped; }
   return results;
}

function ldmDetect(im, o) {
   let detector = new StarDetector;
   detector.sensitivity=o.sensitivity; detector.upperLimit=o.saturation;
   detector.allowClusteredSources=false;
   let detected=detector.stars(im), buckets=Array.from({length:9},()=>[]);
   // Spatial buckets avoid selecting only a bright cluster at the image center.
   let candidates=detected.map(s=>({x:s.pos.x,y:s.pos.y,
      radius:Math.max(6,Math.min(30,Math.ceil(Math.sqrt(s.size)*1.5))),flux:s.flux}));
   // Fixed-size spatial index keeps isolation checks local on dense fields.
   let grid=new Map, bin=64;
   for(let s of candidates) {
      let key=Math.floor(s.x/bin)+','+Math.floor(s.y/bin);
      if(!grid.has(key))grid.set(key,[]);grid.get(key).push(s);
   }
   for (let s of candidates) {
      let r=s.radius;
      if (s.x-r<0 || s.y-r<0 || s.x+r>=im.width || s.y+r>=im.height) continue;
      // Reject stars whose fitting aperture overlaps a detected neighbor.
      let gx=Math.floor(s.x/bin),gy=Math.floor(s.y/bin),crowded=false;
      for(let dy=-1;dy<=1 && !crowded;++dy)for(let dx=-1;dx<=1 && !crowded;++dx)
         crowded=(grid.get((gx+dx)+','+(gy+dy))||[]).some(t=>t!==s && (t.x-s.x)**2+(t.y-s.y)**2<(r+t.radius)**2);
      if(crowded)continue;
      s.rect=new Rect(Math.floor(s.x-r),Math.floor(s.y-r),Math.ceil(s.x+r+1),Math.ceil(s.y+r+1));
      s.cell=Math.min(2,Math.floor(3*s.x/im.width))+3*Math.min(2,Math.floor(3*s.y/im.height));
      buckets[s.cell].push(s);
   }
   for (let b of buckets) b.sort((a,b)=>b.flux-a.flux);
   let result=[];
   for (let k=0;result.length<o.maxStars;++k) {
      let added=false;
      for (let b of buckets) if (k<b.length && result.length<o.maxStars) { result.push(b[k]); added=true; }
      if (!added) break;
   }
   if (result.length<LDM_MIN_STARS)
      throw new Error('Fewer than 20 isolated, unsaturated stars found. Adjust detection/saturation limits or use a suitable star field.');
   return result;
}

/** All statistics are paired: same source index on both sides. */
function ldmCompare(l, r, stars, o) {
   let ratios=[], absolute=[], lf=[], rf=[], cells=Array.from({length:9},()=>[]);
   for (let i=0;i<stars.length;++i) if (l[i] && r[i]) {
      let d=2*(l[i].f-r[i].f)/(l[i].f+r[i].f);
      ratios.push(d); absolute.push(Math.abs(d)); lf.push(l[i].f); rf.push(r[i].f);
      cells[stars[i].cell].push(Math.abs(d));
   }
   let enough=ratios.length>=LDM_MIN_STARS && ratios.length>=Math.ceil(stars.length*0.8);
   let med=ldmMedian(absolute), p90=ldmQuantile(absolute,0.9);
   let regions=cells.map(c=>({n:c.length,error:ldmMedian(c)}));
   let regionOK=regions.every(c=>c.n<5 || c.error<=2*o.tolerance/100);
   let fl=ldmMedian(lf), fr=ldmMedian(rf);
   let sampled=fl>=o.floor && fr>=o.floor;
   return { n:ratios.length, total:stars.length, enough:enough, median:med,
      p90:p90, signed:ldmMedian(ratios), l:fl, rgb:fr, regions:regions,
      sampled:sampled, pass:enough && sampled && med<=o.tolerance/100 && p90<=2*o.tolerance/100 && regionOK };
}

function ldmClamp(x,lo,hi){return Math.max(lo,Math.min(hi,x));}
function ldmUsable(t){return t && t.metric.enough && t.metric.sampled && Number.isFinite(t.cost);}
function ldmPrefer(a,b){
   return ldmUsable(a) && (!ldmUsable(b) || (a.metric.pass && !b.metric.pass) ||
      (a.metric.pass===b.metric.pass && a.cost<b.cost));
}
// Robust least squares of paired log-width ratios. A missing fit incurs a
// fixed penalty; dropping difficult stars cannot artificially improve the fit.
function ldmResiduals(reference,fits){
   return reference.map((r,i)=>r && fits[i]?Math.log(fits[i].f/r.f):null);
}
function ldmCost(residuals){
   let huber=0.10;
   return residuals.reduce((sum,r)=>{
      // Accepted FWHMs lie in [1,30] px, so any valid log-ratio has
      // Huber loss < 0.34. A missing fit must cost more than any valid fit.
      if(r===null)return sum+1;
      let v=Math.abs(r);
      return sum+(v<=huber?0.5*v*v:huber*(v-0.5*huber));
   },0)/Math.max(1,residuals.length);
}

// Exact minimizer of a positive-definite two-variable quadratic in a box.
// Enumerating the four edges is arithmetic only, not additional BXT trials.
function ldmBoxStep(a,b,c,g,h,lo,hi){
   let candidates=[[0,0]],det=a*c-b*b;
   if(det>1e-20)candidates.push([ldmClamp((b*h-c*g)/det,lo[0],hi[0]),ldmClamp((b*g-a*h)/det,lo[1],hi[1])]);
   for(let x of [lo[0],hi[0]])candidates.push([x,ldmClamp(-(h+b*x)/c,lo[1],hi[1])]);
   for(let y of [lo[1],hi[1]])candidates.push([ldmClamp(-(g+b*y)/a,lo[0],hi[0]),y]);
   let value=d=>g*d[0]+h*d[1]+0.5*(a*d[0]*d[0]+2*b*d[0]*d[1]+c*d[1]*d[1]);
   return candidates.reduce((best,d)=>value(d)<value(best)?d:best);
}

/** Bounded damped Gauss-Newton, followed by Broyden Jacobian updates.
 * One starting run + one finite-difference run per free parameter; subsequent
 * steps usually need one BXT run each. All evaluations, including derivative
 * probes and rejected steps, count towards the ten-run budget and are cached.
 * Parameters are scaled to [0,1]. Huber weights limit outlier influence.
 * The objective is per-star FWHM agreement, not a scalar median root with two
 * unconstrained unknowns. Small gradients, bounds and singular sensitivities
 * are handled with damping, a bounded step and explicit termination reasons.
 */
function ldmNewton(o,start,evaluate,log=()=>{}){
   let span=[o.maximum,o.haloMax-o.haloMin],active=span.map(v=>v>0);
   let cache=new Map,best=null,reason='Trial budget reached';
   function run(x){
      x=x.map((v,i)=>active[i]?ldmClamp(v,0,1):0);
      let key=x.map(v=>v.toFixed(8)).join(',');
      if(cache.has(key))return cache.get(key);
      if(cache.size>=LDM_MAX_TRIALS)return null;
      let t=evaluate(x[0]*span[0],o.haloMin+x[1]*span[1]);
      t.x=x;t.cost=ldmCost(t.residuals);cache.set(key,t);
      if(ldmPrefer(t,best))best=t;
      return t;
   }
   let x0=[active[0]?ldmClamp(start.strength/span[0],0,1):0,active[1]?ldmClamp((start.halo-o.haloMin)/span[1],0,1):0];
   let current=run(x0),base=current,J=current.residuals.map(()=>[0,0]);
   function result(why){return {best:best,count:cache.size,reason:why};}
   if(current.metric.pass)return result('Starting settings meet the width criteria');
   if(!active.some(Boolean))return result('Both other-image parameters are fixed');
   for(let k=0;k<2;++k)if(active[k]){
      let x=x0.slice(),d=x[k]<=0.9?0.1:-0.1;x[k]+=d;
      let probe=run(x);
      for(let i=0;i<J.length;++i)J[i][k]=base.residuals[i]!==null && probe.residuals[i]!==null?
         (probe.residuals[i]-base.residuals[i])/d:null;
      if(probe.metric.pass)return result('Derivative probe meets the width criteria');
   }
   if(!best)return result('No usable starting or derivative-probe result');
   let damping=1e-3,trust=0.5,rejected=0;
   function updateJacobian(from,to){
      let dx=to.x.map((v,k)=>v-from.x[k]),norm=dx[0]*dx[0]+dx[1]*dx[1];
      if(norm<1e-16)return;
      for(let i=0;i<J.length;++i)if(from.residuals[i]!==null && to.residuals[i]!==null && J[i].every(Number.isFinite)){
         let correction=(to.residuals[i]-from.residuals[i]-J[i][0]*dx[0]-J[i][1]*dx[1])/norm;
         J[i][0]+=correction*dx[0];J[i][1]+=correction*dx[1];
      }
   }
   if(best!==current){updateJacobian(current,best);current=best;}
   while(cache.size<LDM_MAX_TRIALS){
      let a=0,b=0,c=0,g=0,h=0,n=0;
      for(let i=0;i<J.length;++i){
         let r=current.residuals[i],j=J[i];
         if(r===null || !j.every(Number.isFinite))continue;
         let w=Math.min(1,0.1/Math.max(Math.abs(r),1e-12));
         a+=w*j[0]*j[0];b+=w*j[0]*j[1];c+=w*j[1]*j[1];
         g+=w*j[0]*r;h+=w*j[1]*r;++n;
      }
      if(n<Math.max(LDM_MIN_STARS,Math.ceil(J.length*.8)))return result('Too few common fits for a reliable Newton derivative');
      let scale=Math.max(a+c,1e-12),lambda=damping*scale+1e-12;
      if(a+c<1e-16)return result('FWHM response is flat at the current settings');
      let lo=current.x.map((v,k)=>active[k]?Math.max(-trust,-v):0);
      let hi=current.x.map((v,k)=>active[k]?Math.min(trust,1-v):0);
      let step=ldmBoxStep(a+lambda,b,c+lambda,g,h,lo,hi);
      if(Math.hypot(...step)<0.002)return result('Newton step converged or reached a search bound');
      let previousCount=cache.size,trial=run(current.x.map((v,k)=>v+step[k]));
      if(!trial || cache.size===previousCount)return result('No new parameter step within numerical precision');
      updateJacobian(current,trial);
      if(trial.metric.pass)return result('Width criteria reached');
      if(ldmUsable(trial) && trial.cost<current.cost){
         log('Newton accepted step; robust loss '+current.cost.toExponential(3)+' -> '+trial.cost.toExponential(3)+'.');
         let relative=(current.cost-trial.cost)/Math.max(current.cost,1e-12);
         current=trial;rejected=0;damping=Math.max(1e-6,damping*.3);trust=Math.min(.5,trust*1.4);
         if(relative<1e-4)return result('Robust FWHM mismatch has converged');
      }else{
         log('Newton step rejected; retaining the best image and reducing the next step.');
         damping=Math.min(1e6,damping*10);trust*=.5;
         if(++rejected>=3)return result('No improvement after three safeguarded steps');
      }
   }
   return result(reason);
}

class LDMAnalysis {
   constructor(l,rgb,o,status,referenceOnly=false) {
      this.owned=[]; this.o=o; this.report=[]; this.outputs=null; this.status=status;
      this.bxtRuns=0;this.bestOther=null;this.referenceBefore=null;this.referenceOutput=null;
      try {
         ldmValidate(l,rgb,o); ldmBXT(0,o.haloMin,o.nonstellar); // Fail before allocating on missing BXT.
         this.sourceL=l.id; this.sourceRGB=rgb.id;
         this.l=ldmCopy(l,'LDM_source_L'); this.owned.push(this.l);
         this.rgb=ldmCopy(rgb,'LDM_source_RGB'); this.owned.push(this.rgb);
         let weights=Array.from(rgb.window.rgbWorkingSpace.Y), sum=weights.reduce((a,b)=>a+b,0);
         if (!(sum>0) || weights.some(x=>!Number.isFinite(x) || x<0)) throw new Error('Invalid RGB luminance coefficients.');
         this.weights=weights.map(x=>x/sum);
         status('Detecting and fitting common stars...');
         let stars=ldmDetect(this.l.mainView.image,o), y=ldmLuminance(this.rgb.mainView.image,this.weights);
         let lf,rf,channels=[];
         try {
            lf=ldmMeasure(this.l.mainView.image,stars,o); rf=ldmMeasure(y,stars,o);
            for (let c=0;c<3;++c) channels.push(ldmMeasure(this.rgb.mainView.image,stars,o,c));
         } finally { y.free(); }
         this.stars=stars.filter((s,i)=>lf[i] && rf[i] && channels.every(c=>c[i]));
         if (this.stars.length<LDM_MIN_STARS)
            throw new Error('Fewer than 20 reliable common stars in L, RGB luminance, R, G and B. Check registration, saturation, noise and star detection.');
         let indices=stars.map((s,i)=>i).filter(i=>lf[i] && rf[i] && channels.every(c=>c[i]));
         this.initialL=indices.map(i=>lf[i]); this.initialRGB=indices.map(i=>rf[i]);
         this.initial=ldmCompare(this.initialL,this.initialRGB,this.stars,o);
         this.log('Common baseline stars: '+this.stars.length+'.');
         this.log('Baseline L / linear RGB Y: '+this.initial.l.toFixed(3)+' / '+this.initial.rgb.toFixed(3)+' px.');
         this.log('Linear RGB Y weights: '+this.weights.map(v=>v.toFixed(6)).join(', '));
         this.log('Fixed measurement PSF model: '+(o.model===1?'Gaussian':'Moffat beta=4')+'. BXT options other than the three sharpening/halo controls retain installed defaults.');
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
         // now: sharpening can legitimately push initially usable bright stars
         // above the peak-rejection threshold. Never change this cohort in
         // response to a trial of the other image.
         let retained=[];
         for(let i=0;i<this.stars.length;++i)if(referenceFits[i])retained.push(i);
         this.log('Fixed-reference usable stars: '+retained.length+'/'+this.stars.length+
            '. Excluding rejected reference fits before freezing the search star set.');
         this.stars=retained.map(i=>this.stars[i]);
         this.initialL=retained.map(i=>this.initialL[i]);this.initialRGB=retained.map(i=>this.initialRGB[i]);
         referenceFits=retained.map(i=>referenceFits[i]);
         this.initial=ldmCompare(this.initialL,this.initialRGB,this.stars,o);
         this.log('Frozen search set baseline L / RGB Y: '+this.initial.l.toFixed(3)+' / '+this.initial.rgb.toFixed(3)+' px.');
         let referenceCheck=ldmCompare(referenceFits,referenceFits,this.stars,o);
         this.log('Reference fit support: '+referenceCheck.n+'/'+referenceCheck.total+
            '; median FWHM '+referenceCheck.l.toFixed(3)+' px.');
         if(!referenceCheck.enough || !referenceCheck.sampled)
            throw new Error('Fixed reference: '+referenceCheck.n+'/'+referenceCheck.total+' reliable fits; '+
               referenceCheck.l.toFixed(3)+' px median FWHM. At least '+Math.max(LDM_MIN_STARS,Math.ceil(this.stars.length*.8))+
               ' fits and '+o.floor.toFixed(2)+' px are required. Check star fitting and reference settings.');
         this.target=referenceCheck.l;
         this.log('Fixed reference output FWHM: '+this.target.toFixed(3)+' px. This output is retained unchanged throughout the search.');
         this.log('Only '+this.otherKey+' is searched: Sharpen Stars 0 to '+o.maximum+', Adjust Star Halos '+o.haloMin+' to '+o.haloMax+'.');
         this.referenceFits=referenceFits;
         this.referenceOutput=referenceOutput;this.referenceSettings=referenceSettings;
         if(!referenceOnly)this.match();
      } catch (e) { this.dispose(); throw e; }
   }
   match() {
      if(this.outputs)return; // Reuse the completed result too.
      const o=this.o,status=this.status,referenceOutput=this.referenceOutput,
         referenceSettings=this.referenceSettings,referenceFits=this.referenceFits;
      if(!referenceOutput)throw new Error('Calculate the reference first.');
      try {
         this.log('Bounded damped Gauss-Newton with numerical starting derivatives and Broyden updates; at most '+LDM_MAX_TRIALS+' other-image runs.');
         let factory=ldmBXTDefaults();
         this.optimization=ldmNewton(o,{strength:LDM_DEFAULT_STARS,halo:factory.adjust_star_halos},
            (strength,halo)=>this.trial(this.otherKey,strength,halo),s=>this.log(s));
         if (!this.bestOther) throw new Error('No usable Newton candidate can be compared to the fixed reference within the fit-support and minimum-FWHM limits. Revise the search limits or reference settings.');
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
         this.final=ldmCompare(this.finalL,this.finalRGB,this.stars,o);
         this.channelMetrics=[];
         for (let c=0;c<3;++c) this.channelMetrics.push(ldmCompare(this.finalL,ldmMeasure(outRGB.mainView.image,this.stars,o,c),this.stars,o));
         this.passed=this.final.pass && this.channelMetrics.every(m=>m.pass);
         this.settingsLines=['L ('+this.sourceL+'): '+this.settingsText(this.best.l.settings),
            'RGB ('+this.sourceRGB+'): '+this.settingsText(this.best.rgb.settings)];
         this.log('FINAL BLURXTERMINATOR SETTINGS');
         for(let line of this.settingsLines)this.log(line);
         this.log('All other process parameters retain installed defaults.');
         this.log(this.describe('L vs linear RGB Y',this.final));
         for (let c=0;c<3;++c) this.log(this.describe('L vs '+['R','G','B'][c],this.channelMetrics[c]));
         for (let c=0;c<9;++c) {
            let m=this.final.regions[c];
            this.log('Field cell '+(1+Math.floor(c/3))+','+(1+c%3)+': '+m.n+' stars; '+(m.n>=5?(100*m.error).toFixed(2)+'% median absolute mismatch':'insufficient regional support (<5).'));
         }
         this.log(this.passed?'PASS: measured stellar-width criteria satisfied. Inspect profiles and halos before accepting.':
            'REVIEW: the best sampled candidate does not satisfy all width/channel criteria against the fixed reference. It is not certified as matched.');
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
   trial(key,strength,halo) {
      if(key===this.referenceKey)throw new Error('The fixed reference must not be searched.');
      this.status('Newton trial '+this.bxtRuns+'/'+LDM_MAX_TRIALS+': '+(key==='l'?'L':'RGB')+' stars '+strength.toFixed(4)+', halos '+halo.toFixed(4)+'...');
      let w=this.process(key,strength,halo);
      try {
         let fits=this.measureWindow(w,key);
         let t={strength:this.lastBXTSettings.strength,halo:this.lastBXTSettings.halo,fits:fits,settings:this.lastBXTSettings};
         t.residuals=ldmResiduals(this.referenceFits,fits);t.cost=ldmCost(t.residuals);
         t.metric=this.referenceKey==='l'?ldmCompare(this.referenceFits,fits,this.stars,this.o):ldmCompare(fits,this.referenceFits,this.stars,this.o);
         let valid=fits.filter(v=>v);
         this.log('Trial '+key+' stars='+t.strength.toFixed(6)+', halos='+t.halo.toFixed(6)+': '+valid.length+' fits; median '+ldmMedian(valid.map(v=>v.f)).toFixed(3)+' px; loss '+t.cost.toExponential(4)+'.');
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

function ldmScatterPoints(a){
   let points=[];
   if(a)for(let i=0;i<a.finalL.length;++i)if(a.finalL[i] && a.finalRGB[i])
      points.push({x:a.finalL[i].f,y:a.finalRGB[i].f});
   return points;
}
class LDMScatter extends Control {
   constructor(parent){
      super(parent);this.analysis=null;this.points=[];this.setScaledMinSize(700,350);
      this.onPaint=()=>{
         let g=new Graphics(this);
         try{
            let s=this.displayPixelRatio;
            g.fillRect(0,0,this.width,this.height,new Brush(0xff18202b));
            g.font=this.font;g.pen=new Pen(0xffe6edf3);
            if(!this.analysis || !this.points.length){g.drawText(20*s,40*s,'Calculate a preview to plot the final measured star FWHMs.');return;}
            let maximum=Math.max(...this.points.map(p=>Math.max(p.x,p.y)))*1.05;
            let raw=maximum/5,power=Math.pow(10,Math.floor(Math.log10(raw)));
            let step=[1,2,5,10].find(v=>v*power>=raw)*power,limit=Math.ceil(maximum/step)*step;
            let left=65*s,top=48*s,side=Math.min(this.width-100*s,this.height-100*s),bottom=top+side;
            let X=v=>left+side*v/limit,Y=v=>bottom-side*v/limit;
            g.drawText(left,18*s,'Final stars: L versus extracted RGB luminance');
            g.drawText(left,37*s,'RGB luminance FWHM (px)');
            for(let v=0;v<=limit+step/2;v+=step){
               let tick=v.toFixed(step<1?2:1);
               g.pen=new Pen(0xff344051);g.drawLine(X(v),top,X(v),bottom);g.drawLine(left,Y(v),left+side,Y(v));
               g.pen=new Pen(0xffaebacc);g.drawText(X(v)-this.font.width(tick)/2,bottom+17*s,tick);
               g.drawText(left-10*s-this.font.width(tick),Y(v)+4*s,tick);
            }
            // Identical numeric limits and a square plotting area: slope one
            // is a true 45-degree identity line, always through the origin.
            g.antialiasing=true;g.pen=new Pen(0xffffd166,1.5*s);g.drawLine(X(0),Y(0),X(limit),Y(limit));
            for(let p of this.points)g.fillCircle(X(p.x),Y(p.y),2.6*s,new Brush(0xd955b4dc));
            g.pen=new Pen(0xffe6edf3);let label='L FWHM (px)';
            g.drawText(left+(side-this.font.width(label))/2,bottom+38*s,label);
            let tx=left+side+22*s,ty=top+20*s;
            if(tx+210*s<this.width){
               let m=this.analysis.final;
               for(let line of ['Yellow: y = x (slope 1)','Blue: same star in both images',
                  this.points.length+' paired stars',
                  'Median mismatch: '+(100*m.median).toFixed(2)+'%',
                  '90th percentile: '+(100*m.p90).toFixed(2)+'%',
                  this.analysis.passed?'PASS: width criteria met':'REVIEW: width criteria not all met']){
                  g.drawText(tx,ty,line);ty+=24*s;
               }
            }
         }finally{g.end();}
      };
   }
   setAnalysis(a){this.analysis=a;this.points=ldmScatterPoints(a);this.update();}
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
      this.intro.text='Deconvolve the sharper reference, inspect its before/after preview, then match the other image. '+
         'Source images stay unchanged; output images remain linear.';
      const labelWidth=Math.max(this.font.width('Maximum Sharpen Stars:')+8,Math.round(185*this.displayPixelRatio));
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
      this.otherGroup=group(this,'Other image: search limits');
      this.sharedGroup=group(this,'Shared deconvolution');
      this.lList=new ViewList(this.imagesGroup); this.lList.getMainViews(); this.lList.currentView=new View;
      this.rgbList=new ViewList(this.imagesGroup); this.rgbList.getMainViews(); this.rgbList.currentView=new View;
      if(o.l && ldmExists(View.viewById(o.l)))this.lList.currentView=View.viewById(o.l);
      if(o.rgb && ldmExists(View.viewById(o.rgb)))this.rgbList.currentView=View.viewById(o.rgb);
      this.reference=new ComboBox(this.imagesGroup);
      this.reference.addItem('Auto: smaller measured stellar FWHM');this.reference.addItem('L is the sharper reference');this.reference.addItem('RGB is the sharper reference');
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
      this.nonstellar.toolTip='Your chosen value is used unchanged for the reference and all trials of the other image. Only the other image\'s Sharpen Stars and Adjust Star Halos are optimized.';
      this.maximum=number(this.otherGroup,'Maximum Sharpen Stars:',o.maximum,0,LDM_MAX_STARS,2);
      this.haloMin=number(this.otherGroup,'Minimum Adjust Star Halos:',o.haloMin,LDM_MIN_HALO,LDM_MAX_HALO,2);
      this.haloMax=number(this.otherGroup,'Maximum Adjust Star Halos:',o.haloMax,LDM_MIN_HALO,LDM_MAX_HALO,2);
      this.maximum.toolTip='Sharpen Stars is searched from zero to this limit on the other image. Default 0.70 allows the full supported BlurXTerminator range. Set zero to hold stellar sharpening at zero. The search starts at 0.50, limited to this range.';
      this.haloMin.toolTip=this.haloMax.toolTip='Default bounds -0.50 to +0.50 allow the full supported Adjust Star Halos range on the other image. Equal bounds hold its halo setting fixed. The reference uses its own settings.';
      this.tabs=new TabBox(this);this.referencePage=new Control(this.tabs);this.previewPage=new Control(this.tabs);this.scatterPage=new Control(this.tabs);this.settingsPage=new Control(this.tabs);
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
      this.acceptanceGroup=group(this.settingsPage,'Match acceptance');
      this.measurementGroup=group(this.settingsPage,'Star detection and fitting');
      this.tolerance=number(this.acceptanceGroup,'Tolerance (%):',o.tolerance,1,20,1);
      this.tolerance.toolTip='Median paired absolute relative difference <= tolerance; 90th percentile and supported field-cell medians <= twice tolerance. At least 20 and 80% of the reference-qualified stars must remain valid.';
      this.floor=number(this.acceptanceGroup,'Minimum FWHM (px):',o.floor,1,10,2);
      this.floor.toolTip='Reference and matched image must meet this median-FWHM sampling guard. It is not an output blur operation.';
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
      this.scatterPage.sizer=new VerticalSizer;this.scatterPage.sizer.add(this.scatter,100);
      this.sensitivity=number(this.measurementGroup,'Detection sensitivity:',o.sensitivity,0,1,2);
      this.saturation=number(this.measurementGroup,'Reject peaks at or above:',o.saturation,0.01,1,3);
      this.maxStars=number(this.measurementGroup,'Maximum sampled stars:',o.maxStars,20,1000,0);
      this.model=new ComboBox(this.measurementGroup);this.model.addItem('Moffat beta = 4');this.model.addItem('Gaussian');this.model.currentItem=o.model;
      let modelRow=new HorizontalSizer;modelRow.spacing=10;
      let modelLabel=new Label(this.measurementGroup);modelLabel.text='PSF model:';modelLabel.setFixedWidth(labelWidth);
      modelRow.add(modelLabel);modelRow.add(this.model);modelRow.addStretch();this.measurementGroup.sizer.add(modelRow);
      let note=new Label(this.settingsPage);note.wordWrapping=true;
      note.text='Reliable measurements need isolated, unsaturated stars and accurate registration. Use the same PSF model for both images. '+
         'Inspect bright and faint stars in the center and corners. Similar median FWHMs do not guarantee identical halos, profiles, or appearance after stretching.';
      this.settingsPage.sizer=new VerticalSizer;this.settingsPage.sizer.margin=12;this.settingsPage.sizer.spacing=10;
      this.settingsPage.sizer.add(this.acceptanceGroup);this.settingsPage.sizer.add(this.measurementGroup);
      this.settingsPage.sizer.add(note);this.settingsPage.sizer.addStretch();
      this.tabs.addPage(this.referencePage,'Reference before/after');this.tabs.addPage(this.previewPage,'Matched L / RGB');this.tabs.addPage(this.scatterPage,'FWHM scatter');this.tabs.addPage(this.settingsPage,'Star measurement');
      this.finalSettings=new Label(this);this.finalSettings.wordWrapping=true;
      this.finalSettings.minHeight=3*this.font.height;
      this.finalSettings.text='Final BlurXTerminator settings appear here after calculation.';
      this.status=new Label(this);this.status.wordWrapping=true;this.status.text='Magnifier: calculate. Play/step: blink. Green checkmark: create linear output images.';
      this.status.minHeight=2*this.font.height;
      this.instance=ldmTool(this,':/process-interface/new-instance.png','Drag to save the current settings as a process icon.');
      this.instance.onMousePress=()=>{Parameters.clear();let p=this.options();for(let k of Object.keys(p))Parameters.set(k,p[k]);this.newInstance();};
      this.preview=ldmTool(this,':/toolbar/view-zoom.png','Match the other image to the prepared reference. If none is prepared, calculate both stages. Click again after completion to recalculate from the selected source images.',()=>this.calculate());
      this.reset=ldmTool(this,':/process-interface/reset.png','Reset numerical and display settings, and release preview copies.',()=>this.resetSettings());
      this.create=ldmTool(this,':/process-interface/execute.png','Create the two linear deconvolved images from the reviewed preview.',()=>this.publish());
      this.close=ldmTool(this,':/process-interface/cancel.png','Close and release temporary preview images.',()=>this.cancel());
      this.help=ldmTool(this,':/process-interface/browse-documentation.png','Open the PIDoc user guide.',ldmShowDocumentation);
      let actions=new HorizontalSizer;actions.spacing=8;
      actions.add(this.instance);actions.add(this.preview);actions.add(this.reset);actions.addStretch();actions.add(this.create);actions.add(this.close);actions.add(this.help);
      let deconvolutionRow=new HorizontalSizer;deconvolutionRow.spacing=10;
      deconvolutionRow.add(this.referenceGroup,50);deconvolutionRow.add(this.otherGroup,50);
      this.sizer=new VerticalSizer;this.sizer.margin=10;this.sizer.spacing=8;
      this.sizer.add(this.intro);this.sizer.add(this.imagesGroup);this.sizer.add(deconvolutionRow);this.sizer.add(this.sharedGroup);
      this.sizer.add(this.tabs,100);this.sizer.add(this.finalSettings);this.sizer.add(this.status);this.sizer.add(actions);
      this.numeric=[this.maximum,this.referenceStars,this.referenceHalo,this.tolerance,this.nonstellar,this.haloMin,this.haloMax,this.floor,this.sensitivity,this.saturation,this.maxStars];
      for(let n of this.numeric)n.onValueUpdated=()=>this.invalidate();
      this.lList.onViewSelected=this.rgbList.onViewSelected=this.model.onItemSelected=this.reference.onItemSelected=()=>this.invalidate();
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
      this.updateButtons();this.adjustToContents();
   }
   options() {
      let o=ldmDefaults();o.l=ldmExists(this.lList.currentView)?this.lList.currentView.id:'';
      o.rgb=ldmExists(this.rgbList.currentView)?this.rgbList.currentView.id:'';
      for(let k of ['maximum','referenceStars','referenceHalo','tolerance','nonstellar','haloMin','haloMax','floor','sensitivity','saturation','maxStars'])o[k]=this[k].value;
      for(let k of ['autoDisplay','normalizeDisplay','referenceDisplay'])o[k]=this[k].checked;
      o.reference=['auto','l','rgb'][this.reference.currentItem];o.model=this.model.currentItem;return o;
   }
   updateButtons() {
      let ready=!this.running && !!this.frames;
      this.play.enabled=this.step.enabled=ready;this.create.enabled=!this.running && !!(this.analysis && this.analysis.outputs);
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
      this.scatter.setAnalysis(null);this.finalSettings.text='Settings changed. Recalculate to report the final BlurXTerminator settings.';
      this.viewer.setStatusMessage('Click the magnifier to calculate a fresh preview.');
      this.referenceViewer.setStatusMessage('Use this tab\'s magnifier to calculate the reference before/after preview.');
      this.status.text='Ready to calculate.';this.updateButtons();
   }
   busy(value) {
      this.running=value;
      for(let c of [...this.numeric,this.lList,this.rgbList,this.reference,this.model,this.tabs,this.instance,this.preview,this.referenceCalculate,this.reset,this.create,this.close,this.help])c.enabled=!value;
      this.updateButtons();
   }
   calculateReference() {
      if(this.running)return;this.invalidate();this.busy(true);console.show();
      let abort=console.abortEnabled;console.abortEnabled=true;
      try{
         this.analysis=new LDMAnalysis(this.lList.currentView,this.rgbList.currentView,this.options(),s=>{this.status.text=s;ldmAbort();},true);
         this.makeReferenceFrames();this.tabs.currentPageIndex=0;
         let a=this.analysis;
         this.finalSettings.text='Reference '+(a.referenceKey==='l'?a.sourceL:a.sourceRGB)+': '+a.settingsText(a.referenceSettings)+
            '\n1 BXT run. Reference FWHM: '+a.target.toFixed(3)+' px. Other image has not been deconvolved.';
         this.status.text='Blink BEFORE/AFTER, then use the bottom magnifier to match the other image to this exact reference result.';
      }catch(e){this.status.text='Error: '+(e.message || String(e));new MessageBox(this.status.text,'Reference preview',StdIcon.Error,StdButton.Ok).execute();}
      finally{console.abortEnabled=abort;this.busy(false);}
   }
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
         this.analysis.match();
         this.scatter.setAnalysis(this.analysis);
         this.finalSettings.text=this.analysis.settingsLines.join('\n')+'\n'+this.analysis.bxtRuns+' BXT runs. '+this.analysis.optimization.reason+'.';
         this.makeFrames();this.tabs.currentPageIndex=1;this.status.text=this.analysis.passed?'Measured criteria passed. Inspect the blink preview, then create the linear copies.':
            'Review required: the best tested pair does not meet all matching criteria. See FWHM scatter and Process Console.';
      } catch(e) {
         if(this.analysis && !this.analysis.referenceOutput){this.clearFrames();this.clearReferenceFrames();this.analysis=null;this.scatter.setAnalysis(null);}
         this.status.text='Error: '+(e.message || String(e));
         new MessageBox(this.status.text,'LRGB Deconvolution Match',StdIcon.Error,StdButton.Ok).execute();
      } finally {console.abortEnabled=abort;this.busy(false);}
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
         this.status.text='Created '+names.join(' and ')+'. Both are linear. '+(this.analysis.passed?'':'Matching criteria were not all met; review FWHM scatter.');
      }catch(e){this.status.text='Create failed: '+(e.message || String(e));}
      finally{this.busy(false);}
   }
   resetSettings() {
      this.invalidate();let o=ldmDefaults();
      for(let k of ['maximum','referenceStars','referenceHalo','tolerance','nonstellar','haloMin','haloMax','floor','sensitivity','saturation','maxStars'])this[k].setValue(o[k]);
      for(let k of ['autoDisplay','normalizeDisplay','referenceDisplay'])this[k].checked=o[k];this.model.currentItem=0;this.reference.currentItem=0;
      this.lList.currentView=new View;this.rgbList.currentView=new View;
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
