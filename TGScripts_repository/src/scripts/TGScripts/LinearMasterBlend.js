#engine v8
#include <pjsr/controls/ImageView.js>
#ifndef LMB_LIBRARY
#feature-id LinearMasterBlend : TG Scripts > Linear Master Blend
#feature-info Integrate two aligned linear masters with measured quality weights and adjustable sharpness preference.
#endif

/* Linear Master Blend 1.20.0
 * Requires PixInsight 1.9.5+ (V8). No external libraries or image files.
 * Original implementation, 2026. Released under the MIT license (see LICENSE.txt).
 * PSF measurement places the lower-FWHM image in A as photometric reference.
 * B is normalized to A independently per channel.
 * Robust through-origin regression of matched stellar fluxes determines scale.
 * Matched local PSF backgrounds determine the additive offset separately.
 * PixelMath applies this affine map unclipped to a fresh copy of B.
 * Source noise is measured before normalization; actual output
 * noise is measured after creation. All reported noise uses reference units.
 * Master 1/2 retain selection order; internal A/B mean reference/normalized.
 * Source windows are never process targets. Owned windows are closed on failure.
 */

const LMB_VERSION = '1.20.0';
const LMB_SCRIPT_FILE = #__FILE__;
const LMB_SIGMA_TOOLTIP = 'Estimated noise standard deviation for the selected channel, expressed on the reference image\'s brightness scale. The reference is the master with the lower combined FWHM. This common scale lets you compare noise in Master 1, Master 2 and the output independently of their brightness scaling. Lower values indicate less noise; they do not measure detail or resolution.';

/** Let the UI process events between native operations and honor console Abort.
 * Native processes manage cancellation while their own executeOn call runs.
 */
function lmbCheckAbort() {
   CoreApplication.processEvents();
   if (console.abortRequested) throw new Error('Operation aborted.');
}

/** Find an unused main-view identifier; repeated Create never replaces a view. */
function lmbUnique(base) {
   let id = base, n = 1;
   while (lmbHasView(View.viewById(id))) id = base + '_' + n++;
   return id;
}

// PJSR APIs may return either null or a null-view object for an absent image.
function lmbHasView(v) { return v != null && !v.isNull; }

function lmbClose(w) {
   if (w && !w.isNull) w.forceClose();
}

// Round-trip precision for the coefficients embedded in executed PixelMath.
function lmbNumber(x) { return x.toPrecision(17); }
function lmbChannel(c, n) { return n === 1 ? 'Gray' : ['R', 'G', 'B'][c]; }

/** Robust summaries are computed from the same accepted stars in both images.
 * A PSF is a resolution proxy, not a measurement of depth or nonstellar detail.
 */
function lmbMedian(values) {
   if (!values.length) return NaN;
   let v = values.slice().sort((a,b) => a-b), n = v.length;
   return n & 1 ? v[(n-1)/2] : (v[n/2-1]+v[n/2])/2;
}
function lmbMAD(values, median = lmbMedian(values)) {
   return 1.4826*lmbMedian(values.map(x => Math.abs(x-median)));
}

/** Full-resolution, disjoint sampling patches bound memory and detection cost.
 * No resampling is performed, so widths retain the aligned-image pixel scale.
 * Small images are measured completely; large images use a 3 x 3 field sample.
 */
function lmbPSFTiles(width, height) {
   let nx = Math.min(3, Math.max(1, Math.floor(width/384)));
   let ny = Math.min(3, Math.max(1, Math.floor(height/384))), tiles = [];
   for (let iy=0; iy<ny; ++iy) for (let ix=0; ix<nx; ++ix) {
      let w = Math.min(768, Math.floor(width/nx)), h = Math.min(768, Math.floor(height/ny));
      let x = Math.round((ix+0.5)*width/nx-w/2), y = Math.round((iy+0.5)*height/ny-h/2);
      tiles.push(new Rect(x,y,x+w,y+h));
   }
   return tiles;
}

/** Read a detached grayscale patch; for RGB use equal-weight linear intensity.
 * Source selections, sample data, working-space settings and STF are untouched.
 */
function lmbPSFPatch(image, rect, channel = null) {
   let patch = new Image, temp = new Image;
   try {
      patch.assign(image, rect, channel === null ? 0 : channel, channel === null ? 0 : channel);
      if (channel === null && image.numberOfNominalChannels === 3) {
         for (let c=1; c<3; ++c) {
            temp.assign(image, rect, c, c); patch.apply(temp, ImageOp.Add);
         }
         patch.apply(1/3, ImageOp.Mul);
      }
      patch.resetSelections(); patch.rangeClippingEnabled = false;
      // Native star detection must never receive non-finite samples. A constant
      // patch is harmless (no stars), unlike a non-finite one.
      let row=new Float64Array(patch.width);
      for(let y=0;y<patch.height;++y) {
         if((y&63)===0)lmbCheckAbort();
         patch.getSamples(row,new Rect(0,y,patch.width,y+1),0);
         for(let value of row)if(!Number.isFinite(value))throw new Error('PSF region contains NaN or infinite samples.');
      }
      return patch;
   } catch (e) { patch.free(); throw e; }
   finally { temp.free(); }
}

/** Fit an elliptical stellar profile with the native V8 PSF API. This is the
 * same PSF fitting engine used by DynamicPSF/PSFImage, without process tables.
 * Native fwhmX/Y convert sigma with the selected model (including Moffat beta).
 * X is the fitted major axis and Y the minor axis, not fixed detector axes.
 */
function lmbFitPSF(image, star, rect, model) {
   let p = new PSF;
   p.fitSource(image, new Point(star.pos.x,star.pos.y), rect, model, false);
   if (!p.isValid || !(p.A>0) || !Number.isFinite(p.mad) || p.mad/p.A>0.10) return null;
   if ((p.x-star.pos.x)**2+(p.y-star.pos.y)**2>2.25) return null;
   let x = p.fwhmX, y = p.fwhmY;
   if (!Number.isFinite(x) || !Number.isFinite(y) || y<1 || x<y ||
       x>0.75*Math.min(rect.width,rect.height) || y/x<0.5) return null;
   if (model === PSFunction.Moffat && (!(p.beta>1.05) || p.beta>9.95)) return null;
   return {x:x, y:y, f:Math.sqrt(x*y), cx:p.x, cy:p.y, residual:p.mad/p.A,
      flux:p.flux, background:p.B, signal:p.signal,
      // fitSource uses growth=1: area of the elliptical tenth-maximum aperture.
      signalArea:0.25*Math.PI*p.fwtmX*p.fwtmY};
}

/** Detect in both patches and use isolated, coincident, unsaturated sources.
 * Fit the same model family to each member of a pair. Prefer fitted Moffat;
 * use Gaussian for both if Moffat is invalid or has a worse joint residual.
 */
function lmbPSFPairs(a, b, cell) {
   let detector = new StarDetector;
   detector.sensitivity = 0.5; detector.upperLimit = 0.95;
   detector.allowClusteredSources = false;
   let sa = detector.stars(a), sb = detector.stars(b), pairs = [], candidates=[];
   let distance = (s,t) => (s.pos.x-t.pos.x)**2+(s.pos.y-t.pos.y)**2;
   for (let s of sa) {
      lmbCheckAbort();
      let matches = sb.filter(t => distance(s,t)<=4);
      if (matches.length!==1) continue;
      let t = matches[0];
      if (sa.filter(u => distance(u,t)<=4).length!==1) continue;
      candidates.push({s:s,t:t,brightness:s.flux*t.flux,x:(s.pos.x+t.pos.x)/2,y:(s.pos.y+t.pos.y)/2});
   }
   // Rank matched pairs symmetrically before imposing the per-tile star limit.
   // Otherwise swapping the reference can change the selected stars and fit.
   candidates.sort((p,q)=>q.brightness-p.brightness || p.y-q.y || p.x-q.x);
   for(let candidate of candidates) {
      if(pairs.length>=32)break;
      lmbCheckAbort();
      let s=candidate.s,t=candidate.t;
      let radius = Math.max(8, Math.min(40, Math.ceil(1.5*Math.sqrt(Math.max(s.size,t.size)))));
      let cx=(s.pos.x+t.pos.x)/2, cy=(s.pos.y+t.pos.y)/2;
      let rect = new Rect(Math.floor(cx-radius),Math.floor(cy-radius),Math.ceil(cx+radius+1),Math.ceil(cy+radius+1));
      if (rect.x0<0 || rect.y0<0 || rect.x1>a.width || rect.y1>a.height) continue;
      if (sa.some(u => u!==s && distance(s,u)<4*radius*radius) ||
          sb.some(u => u!==t && distance(t,u)<4*radius*radius)) continue;
      if (a.maximum(rect,0,0)>=0.95 || b.maximum(rect,0,0)>=0.95) continue;
      let best = null;
      for (let model of [PSFunction.Moffat, PSFunction.Gaussian]) {
         let pa=lmbFitPSF(a,s,rect,model), pb=lmbFitPSF(b,t,rect,model);
         if (!pa || !pb || (pa.cx-pb.cx)**2+(pa.cy-pb.cy)**2>2.25) continue;
         let residual=pa.residual+pb.residual;
         if (!best || residual<best.residual) best={a:pa,b:pb,cell:cell,residual:residual,model:model};
      }
      if (best) {
         // Retain the accepted location/model for an unbiased output comparison.
         // Coordinates are local to this sampling tile, not resampled pixels.
         best.sample={cell:cell,x:cx,y:cy,rect:[rect.x0,rect.y0,rect.x1,rect.y1],model:best.model,
            radius:1.5*Math.max(best.a.x,best.b.x)};
         pairs.push(best);
      }
   }
   return pairs;
}

/** Summarize exactly the same accepted stars in both sources. Retain native
 * signal/aperture measurements so quality weighting can reuse these fits.
 */
function lmbSummarizePSF(pairs, tileCount) {
   let report={count:0,detectedPairs:pairs.length,a:null,b:null,reason:'',samples:[]};
   if(!pairs.length){report.reason='No usable matched stars.';return report;}
   let dimensions=[p=>Math.log(p.a.f),p=>Math.log(p.b.f),p=>Math.log(p.b.f/p.a.f)];
   let bounds=dimensions.map(fn=>{let v=pairs.map(fn),m=lmbMedian(v);return {m:m,d:Math.max(.03,3.5*lmbMAD(v,m))};});
   pairs=pairs.filter(p=>dimensions.every((fn,i)=>Math.abs(fn(p)-bounds[i].m)<=bounds[i].d));
   report.count=pairs.length;report.samples=pairs.map(p=>p.sample);
   if(!pairs.length){report.reason='No consistent matched PSFs.';return report;}
   let summary=key=>({count:pairs.length,x:lmbMedian(pairs.map(p=>p[key].x)),
      y:lmbMedian(pairs.map(p=>p[key].y)),f:lmbMedian(pairs.map(p=>p[key].f)),
      signals:pairs.map(p=>p[key].signal),signalAreas:pairs.map(p=>p[key].signalArea)});
   report.a=summary('a');report.b=summary('b');
   report.reason=pairs.length<10?'At least ten reliable matched stars are required.':
      'The same stars are used to compare source quality.';
   return report;
}

/** Read-only measurement on small detached buffers. Missing stars are a
 * diagnostic result, whereas API errors/abort propagate and remain visible.
 */
function lmbMeasurePSF(a, b) {
   let tiles=lmbPSFTiles(a.width,a.height), pairs=[];
   for(let i=0;i<tiles.length;++i) {
      lmbCheckAbort();
      console.writeln('Measuring PSF region '+(i+1)+'/'+tiles.length+'...');
      let pa=null,pb=null;
      try {
         pa=lmbPSFPatch(a,tiles[i]); pb=lmbPSFPatch(b,tiles[i]);
         pairs.push(...lmbPSFPairs(pa,pb,i));
      } finally { if(pa)pa.free(); if(pb)pb.free(); }
   }
   return lmbSummarizePSF(pairs,tiles.length);
}

/** Measure the actual linear output at the accepted source-star locations.
 * Reusing each pair's model and fitting box prevents detection thresholds or
 * model changes from masquerading as a change in resolution. RGB uses the same
 * linear intensity as the source measurement; STF never enters this calculation.
 * Failed fits are omitted and reported through the accepted/attempted counts.
 */
function lmbMeasureOutputPSF(image, sourceReport, fixedSamples = null) {
   let samples=fixedSamples || sourceReport && sourceReport.samples || [], fits=[];
   let report={count:0,total:samples.length,x:null,y:null,f:null,error:null,samples:[]};
   if(!samples.length) { report.error='No accepted source stars for output PSF measurement.'; return report; }
   let tiles=lmbPSFTiles(image.width,image.height);
   for(let cell=0;cell<tiles.length;++cell) {
      let selected=samples.filter(s=>s.cell===cell);
      if(!selected.length)continue;
      lmbCheckAbort(); console.writeln('Measuring output PSF region '+(cell+1)+'/'+tiles.length+'...');
      let patch=null;
      try {
         patch=lmbPSFPatch(image,tiles[cell]);
         for(let s of selected) {
            lmbCheckAbort();
            let fit=lmbFitPSF(patch,{pos:{x:s.x,y:s.y}},new Rect(...s.rect),s.model);
            if(fit){fit.sample=s;fits.push(fit);}
         }
      } finally { if(patch)patch.free(); }
   }
   // Keep the median robust to occasional poor fits when no fixed star list
   // is required. Source widths are never substituted for measured widths.
   if(fits.length && !fixedSamples) {
      let logs=fits.map(p=>Math.log(p.f)), median=lmbMedian(logs), limit=Math.max(0.03,3.5*lmbMAD(logs,median));
      fits=fits.filter(p=>Math.abs(Math.log(p.f)-median)<=limit);
   }
   report.count=fits.length;
   // Reuse these native fits for signal metrics; never detect/refit a second
   // stellar population just to evaluate image quality.
   report.signals=fits.map(p=>p.signal);
   report.signalAreas=fits.map(p=>p.signalArea);
   report.samples=fits.map(p=>p.sample);
   // Use the same accepted stars for source quality and output diagnostics.
   // A different stellar population would bias the source-weight comparison.
   if(fixedSamples && fits.length!==samples.length) {
      report.error='Not all matched stars have reliable PSF measurements.';return report;
   }
   if(fits.length<3) { report.error='Fewer than three reliable output star fits.'; return report; }
   for(let key of ['x','y','f'])report[key]=lmbMedian(fits.map(p=>p[key]));
   return report;
}

/** PSF signal formulae from PCL PSFSignalEstimator (PSFSW and PSFSNR).
 * Use the same accepted star sample rather than SubframeSelector's
 * independently detected full-field population. Absolute values therefore
 * belong to this analysis; the normalized source measurements are comparable.
 * The native RCR Winsorization of mean fluxes limits tiny-aperture outliers.
 */
function lmbPSFSignalTerms(psf, sigma, mStar) {
   let flux=psf.signals,areas=psf.signalAreas;
   if(!flux || !areas || flux.length!==psf.count || areas.length!==flux.length ||
      flux.some((s,i)=>!(s>0) || !Number.isFinite(s) || !(areas[i]>0) || !Number.isFinite(areas[i])) ||
      !(sigma>0) || !Number.isFinite(sigma) || !(mStar>0) || !Number.isFinite(mStar))
      throw new Error('Reliable stellar fluxes, noise and background residuals are required.');
   let means=new Float64Array(flux.map((s,i)=>s/areas[i]));
   let rejection=Stat.robustChauvenetRejection(means,0.5,1);
   let first=rejection.i,last=rejection.j-1;
   if(!(first>=0 && last>=first && last<means.length))throw new Error('Mean stellar flux estimation failed.');
   for(let i=0;i<first;++i)means[i]=means[first];
   for(let i=last+1;i<means.length;++i)means[i]=means[last];
   let totalFlux=Stat.stableSum(flux),totalMeanFlux=Stat.stableSum(means);
   let weight=(5.326e-6/9.0e6)*(totalFlux/sigma)*(totalMeanFlux/mStar);
   let snr=(1.316e-7/4.987e6)*(totalFlux/sigma)**2;
   if(!(weight>0) || !Number.isFinite(weight) || !(snr>0) || !Number.isFinite(snr))
      throw new Error('PSF signal metrics are invalid.');
   return {weight:weight,snr:snr,totalFlux:totalFlux,totalMeanFlux:totalMeanFlux,mStar:mStar,sigma:sigma};
}

/** Measure the image's background residual, reusing gray noise and
 * PSF fits already measured for the UI. RGB uses (R+G+B)/3, just like the PSF
 * fits, with its own measured noise (channel correlations need not be zero).
 * Native channel arithmetic avoids a full-image JavaScript pixel traversal.
 * Only the compact measurements survive; the intensity image is freed here.
 */
function lmbMeasureQuality(image, psf, noise, allowFallback) {
   if(!psf || psf.error || psf.count<10)throw new Error('At least ten reliable matched stars are required.');
   let intensity=null,channel=null;
   try {
      let im=image,n=noise && noise[0];
      if(image.numberOfNominalChannels===3) {
         intensity=new Image;channel=new Image;
         let rect=new Rect(0,0,image.width,image.height);
         intensity.assign(image,rect,0,0);
         for(let c=1;c<3;++c){channel.assign(image,rect,c,c);intensity.apply(channel,ImageOp.Add);}
         intensity.apply(1/3,ImageOp.Mul);channel.free();channel=null;
         im=intensity;n=lmbNoise(im,0,allowFallback);
      }
      if(!n || n.error || !(n.sigma>0))throw new Error('A reliable intensity noise estimate is required.');
      im.resetSelections();im.rangeClippingEnabled=false;lmbCheckAbort();
      let residual=im.mmtBackgroundResidual(256);
      lmbCheckAbort();
      if(residual.length<32)throw new Error('Too few pixels for the background residual estimate.');
      let result=lmbPSFSignalTerms(psf,n.sigma,Stat.median(residual));
      result.method=n.method+':'+n.layers;result.stars=psf.count;
      result.backgroundPixels=residual.length;
      return result;
   } finally {if(channel)channel.free();if(intensity)intensity.free();}
}

/** Put the lower combined FWHM source in A as the photometric reference.
 * Remap internal paired measurements, never selectors or source pixels. Keep
 * the original Master 1/2 IDs and reference index for all UI mappings. Equal
 * widths retain Master 1. Quality weights are symmetric in the two sources.
 */
function lmbSelectPSFReference(a, b, report) {
   let previous=a.id, masters=[a.id,b.id];
   let available=report.count>=3 && report.a && report.b &&
      Number.isFinite(report.a.f) && report.a.f>0 &&
      Number.isFinite(report.b.f) && report.b.f>0;
   let tied=available && Math.abs(report.a.f-report.b.f)<=1e-6*Math.max(report.a.f,report.b.f);
   let changed=!!available && !tied && report.b.f<report.a.f;
   if(changed) {
      [a,b]=[b,a];
      [report.a,report.b]=[report.b,report.a];
   }
   report.reference={a:a.id,b:b.id,previous:previous,changed:changed,masters:masters,masterIndex:changed?1:0,
      available:!!available,tied:!!tied};
   return [a,b];
}

/** Check geometry, sample type and user parameters before allocating copies.
 * Registration, linearity and common spectral response require user judgment.
 */
function lmbValidate(a, b, options) {
   lmbSharpness(options.sharpness);
   if (!a || a.isNull || !b || b.isNull) throw new Error('Select two open main images.');
   if (!a.isMainView || !b.isMainView) throw new Error('Select main images, not previews.');
   if (a.id === b.id) throw new Error('Master 1 and Master 2 must be different images.');
   let x = a.image, y = b.image;
   if (x.width !== y.width || x.height !== y.height) throw new Error('Image dimensions must match. Register and crop both masters first.');
   if (x.width < 32 || x.height < 32) throw new Error('Both dimensions must be at least 32 pixels for noise evaluation.');
   if (x.isComplex || y.isComplex || !x.isReal || !y.isReal) throw new Error('Use real floating-point linear master images.');
   if (x.isColor !== y.isColor || x.numberOfNominalChannels !== y.numberOfNominalChannels ||
       (x.numberOfNominalChannels !== 1 && x.numberOfNominalChannels !== 3))
      throw new Error('Use two grayscale or two RGB images with matching channels.');
   if (x.numberOfChannels !== x.numberOfNominalChannels || y.numberOfChannels !== y.numberOfNominalChannels)
      throw new Error('Remove alpha channels before combining.');
   if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(options.output))
      throw new Error('Output identifier must start with a letter or underscore and contain only letters, digits and underscores.');

}

/** Make a full-image Float64 snapshot, ignoring any source selection.
 * Register ownership before copying so partial failures are cleaned up too.
 * All processing targets these hidden windows, never the user's source views.
 */
function lmbCopy(view, label, owned) {
   let im = view.image;
   let w = new ImageWindow(im.width, im.height, im.numberOfNominalChannels, 64, true, im.isColor, lmbUnique(label));
   owned.push(w);
   w.mainView.beginProcess(UndoFlag.NoSwapFile);
   try { w.mainView.image.assign(im, new Rect(0, 0, im.width, im.height), 0, im.numberOfNominalChannels - 1); }
   finally { w.mainView.endProcess(); }
   w.mainView.image.resetSelections();
   return w;
}

// Full-image validation: non-finite pixels must never silently enter the fit.
function lmbValidatePixels(im) {
   let row = new Float64Array(im.width);
   for (let c = 0; c < im.numberOfNominalChannels; ++c) {
      let lo = Infinity, hi = -Infinity;
      for (let y = 0; y < im.height; ++y) {
         if ((y & 63) === 0) lmbCheckAbort();
         im.getSamples(row, new Rect(0, y, im.width, y + 1), c);
         for (let v of row) {
            if (!Number.isFinite(v)) throw new Error('Input contains NaN or infinite samples.');
            lo = Math.min(lo, v); hi = Math.max(hi, v);
         }
      }
      if (!(hi > lo)) throw new Error('A channel is constant; fit/noise estimation is undefined.');
   }
}

/** Measure one background-subtracted stellar flux per accepted location and
 * channel. Refit each channel rather than copying the intensity PSF flux into
 * RGB. The native PSF.flux integrates the source above its fitted background
 * over the native flux region (it is neither peak amplitude nor model volume).
 * Keep the same model family and box in A/B, but allow different stellar widths.
 * All measurements use detached patches, preserving source pixels/selections.
 */
function lmbStellarSamples(a, b, report) {
   let samples=report && report.samples || [];
   let points=Array.from({length:a.numberOfNominalChannels},()=>[]);
   let tiles=lmbPSFTiles(a.width,a.height);
   for(let cell=0;cell<tiles.length;++cell) {
      let selected=samples.map((s,i)=>({sample:s,index:i})).filter(s=>s.sample.cell===cell);
      if(!selected.length)continue;
      for(let c=0;c<points.length;++c) {
         lmbCheckAbort();
         console.writeln('Measuring stellar flux: '+lmbChannel(c,points.length)+', region '+(cell+1)+'...');
         let pa=null,pb=null;
         try {
            pa=lmbPSFPatch(a,tiles[cell],c); pb=lmbPSFPatch(b,tiles[cell],c);
            for(let entry of selected) {
               lmbCheckAbort();
               let s=entry.sample,rect=new Rect(...s.rect),star={pos:{x:s.x,y:s.y}};
               // A channel can saturate even when the detection intensity does not.
               if(pa.maximum(rect,0,0)>=0.95 || pb.maximum(rect,0,0)>=0.95)continue;
               let fa=lmbFitPSF(pa,star,rect,s.model),fb=lmbFitPSF(pb,star,rect,s.model);
               if(!fa || !fb || (fa.cx-fb.cx)**2+(fa.cy-fb.cy)**2>2.25)continue;
               if(!(fa.flux>0) || !(fb.flux>0) ||
                  ![fa.flux,fb.flux,fa.background,fb.background].every(Number.isFinite))continue;
               points[c].push({x:fb.flux,y:fa.flux,backgroundA:fa.background,
                  backgroundB:fb.background,star:entry.index});
            }
         } finally {if(pa)pa.free();if(pb)pb.free();}
      }
   }
   return {points:points,kind:'stellar-flux',stars:samples.length};
}

/** Positive, through-origin photometric scale: A_flux = slope * B_flux.
 * Tukey IRLS suppresses discrepant stars without interpreting image-noise
 * estimates as stellar weights. A median-ratio seed limits the leverage of a
 * very bright mismatched star before the first weighted least-squares solve.
 * The numerical scale floor preserves exact-fit stars when the median residual
 * is zero, while still rejecting isolated nonzero residuals. Insufficient
 * photometry is an error; there is deliberately no pixel-fit fallback.
 */
function lmbFitStellarFlux(points, channel = 'Gray') {
   const minimum=10;
   if(points.length<minimum)
      throw new Error('Stellar-flux fitting needs at least '+minimum+' usable matched stars in '+channel+'. Use aligned images with unsaturated stars.');
   if(points.some(p=>!(p.x>0) || !(p.y>0) ||
      ![p.x,p.y,p.backgroundA,p.backgroundB].every(Number.isFinite)))
      throw new Error('Invalid stellar flux or background in '+channel+'.');
   let slope=lmbMedian(points.map(p=>p.y/p.x));
   let floor=64*Number.EPSILON*Math.max(...points.map(p=>p.y));
   function weights(k) {
      let residuals=points.map(p=>p.y-k*p.x);
      let sigma=Math.max(floor,lmbMedian(residuals.map(r=>Math.abs(r)))/0.6744897501960817);
      return residuals.map(r=>{let u=r/(4.685*sigma);return Math.abs(u)<1?(1-u*u)**2:0;});
   }
   function requireSupport(q) {
      if(q.filter(w=>w>0.1).length<minimum)
         throw new Error('Too few consistent stellar fluxes in '+channel+' after outlier rejection (need '+minimum+'). Check alignment, saturation and filter compatibility.');
   }
   let iterations=0;
   for(;iterations<30;++iterations) {
      lmbCheckAbort();
      let q=weights(slope); requireSupport(q);
      // Normalize flux magnitudes to avoid poorly scaled sums.
      let scaleX=Math.max(...points.map(p=>p.x)),scaleY=Math.max(...points.map(p=>p.y));
      let xx=0,xy=0;
      for(let i=0;i<points.length;++i) {
         let x=points[i].x/scaleX,y=points[i].y/scaleY;
         xx+=q[i]*x*x;xy+=q[i]*x*y;
      }
      let next=xy/xx*(scaleY/scaleX);
      if(!(next>0) || !Number.isFinite(next))throw new Error('Invalid stellar brightness scale in '+channel+'.');
      let converged=Math.abs(next-slope)<=1e-10*Math.max(next,slope);
      slope=next;
      if(converged){++iterations;break;}
   }
   let q=weights(slope); requireSupport(q);
   for(let i=0;i<points.length;++i)points[i].weight=q[i];
   // Stellar flux contains no additive sky term. Estimate that term separately
   // from paired local PSF backgrounds, with the same robust stellar weights.
   // A weighted median resists local contamination; it is a single offset per
   // channel, not a spatial gradient correction or a fitted flux intercept.
   let backgrounds=points.map((p,i)=>({value:p.backgroundA-slope*p.backgroundB,weight:q[i]}))
      .filter(p=>p.weight>0).sort((a,b)=>a.value-b.value);
   let half=backgrounds.reduce((sum,p)=>sum+p.weight,0)/2,cumulative=0,offset=NaN;
   for(let p of backgrounds){cumulative+=p.weight;if(cumulative>=half){offset=p.value;break;}}
   if(!Number.isFinite(offset))throw new Error('Cannot match local backgrounds in '+channel+'.');
   let count=q.filter(w=>w>0.1).length;
   console.writeln(channel+': stellar-flux scale '+slope.toPrecision(8)+', background offset '+offset.toPrecision(8)+
      ' ('+count+'/'+points.length+' well-supported stars).');
   return {slope:slope,offset:offset,count:count,sampleCount:points.length,iterations:iterations};
}

function lmbFitStellarChannels(points) {
   return points.map((channel,c)=>lmbFitStellarFlux(channel,lmbChannel(c,points.length)));
}


/** Common PixelMath configuration: Float64 working precision and explicit math.
 * Scalar expressions serve grayscale; three expressions select RGB channels.
 * Output scaling is applied in expression(), rather than automatic rescaling.
 */
function lmbPixelMath(expressions) {
   let p = new PixelMath;
   p.useSingleExpression = expressions.length === 1;
   p.expression = expressions[0];
   p.expression1 = expressions.length === 3 ? expressions[1] : '';
   p.expression2 = expressions.length === 3 ? expressions[2] : '';
   p.expression3 = '';
   p.symbols = '';
   p.generateOutput = true;
   p.use64BitWorkingImage = true;
   p.rescale = false;
   p.truncate = false;
   p.createNewImage = false;
   return p;
}

/** Measure raw Gaussian sigma in this image's own sample units for channel c.
 * Accept MRS only with >=1% support and >=32 samples, trying 4/3/2 layers.
 * Optional k-sigma is labeled; no scaled sigma/Sn statistic is substituted.
 * Selections are reset on every exit, including exceptions and cancellation.
 */
function lmbNoise(im, c, allowFallback) {
   im.resetSelections(); im.selectedChannel = c;
   try {
      let minimum = Math.max(32, Math.ceil(0.01 * im.width * im.height));
      for (let layers of [4, 3, 2]) {
         lmbCheckAbort();
         let estimate = im.noiseMRS(layers);
         if (Number.isFinite(estimate[0]) && estimate[0] > 0 && estimate[1] >= minimum)
            return {sigma:estimate[0], count:estimate[1], method:'MRS', layers:layers};
      }
      if (!allowFallback) throw new Error('MRS has insufficient noise support in channel ' + c + '. Inspect the data, or explicitly enable the k-sigma fallback.');
      let estimate = im.noiseKSigma();
      if (!Number.isFinite(estimate[0]) || estimate[0] <= 0 || estimate[1] < minimum)
         throw new Error('No reliable positive noise estimate in channel ' + c + '.');
      console.warningln('MRS did not converge with sufficient support; using k-sigma for channel ' + c + '.');
      return {sigma:estimate[0], count:estimate[1], method:'k-sigma FALLBACK', layers:0};
   } finally { im.resetSelections(); }
}

/** Validate before native processing; omitted values preserve saved instances. */
function lmbSharpness(value = 0) {
   if(!Number.isFinite(value) || value<0 || value>8)
      throw new Error('Sharpness preference must be a finite number from 0 to 8.');
   return value;
}

/** Start with the normalized 40/40/20 quality blend. Apply an extra FWHM
 * preference: final weight_i is proportional to base_i / FWHM_i^p.
 * Increasing p increases the narrower profile's relative contribution even
 * when its signal metrics already dominate. p=0 preserves the base formula
 * exactly; equal widths leave it unchanged. Logarithms and a common shift
 * avoid overflow/underflow of both unnormalized weights at extreme scales.
 */
function lmbIntegrationWeights(a,b,sharpness = 0) {
   sharpness=lmbSharpness(sharpness);
   for(let q of [a,b])for(let key of ['weight','snr','f'])
      if(!(q[key]>0)||!Number.isFinite(q[key]))throw new Error('Reliable PSF Signal Weight, PSF SNR and combined FWHM are required for both masters.');
   let share=(x,y)=>{let m=Math.max(x,y);return (x/m)/(x/m+y/m);};
   let terms=[share(a.weight,b.weight),share(a.snr,b.snr),share(b.f,a.f)];
   let wa=.4*terms[0]+.4*terms[1]+.2*terms[2];
   if(sharpness>0 && a.f!==b.f) {
      let logA=Math.log(a.f),logB=Math.log(b.f),minimum=Math.min(logA,logB);
      let u=Math.log(wa)+sharpness*(minimum-logA);
      let v=Math.log(1-wa)+sharpness*(minimum-logB);
      let maximum=Math.max(u,v),x=Math.exp(u-maximum),y=Math.exp(v-maximum);
      wa=x/(x+y);
   }
   return {a:wa,b:1-wa,termsA:terms};
}

// One affine output map for all channels; preserve the existing scale if bounded.
function lmbOutputMap(minimum, maximum) {
   if (!Number.isFinite(minimum) || !Number.isFinite(maximum) || maximum < minimum)
      throw new Error('Invalid combined image range.');
   let lower = Math.min(0, minimum), upper = Math.max(1, maximum);
   let gain = 1 / (upper - lower);
   if (!(gain > 0) || !Number.isFinite(gain)) throw new Error('Combined image range is too large.');
   return {minimum:minimum, maximum:maximum, lower:lower, gain:gain};
}

/** Full nominal-channel extrema, including samples outside [0,1]. Disabling
 * statistical clipping is essential: otherwise the range map could miss them.
 */
function lmbImageRange(im) {
   im.resetSelections();
   im.rangeClippingEnabled = false;
   let rect = new Rect(0, 0, im.width, im.height);
   return {minimum:im.minimum(rect, 0, im.numberOfNominalChannels - 1),
           maximum:im.maximum(rect, 0, im.numberOfNominalChannels - 1)};
}

/** Owns normalized source snapshots and their fixed integration weights.
 * Construction measures source quality once and determines the output range.
 * Preview and Create apply the same direct weighted average.
 */
class LMBAnalysis {
   constructor(a, b, options) {
      lmbValidate(a, b, options);
      this.owned = []; this.sourceA = a.id; this.sourceB = b.id;
      this.options = Object.assign({}, options, {sharpness:lmbSharpness(options.sharpness)});
      this.width = a.image.width; this.height = a.image.height;
      this.channels = a.image.numberOfNominalChannels;
      this.noiseA = []; this.noiseB = []; this.noiseOutput = null; this.psfOutput = null; this.qualityOutput=null; this.fits = [];
      try {
         // Re-measure on every fresh Preview/Create, including saved instances.
         // Do this before allocating full-size processing snapshots.
         this.psf = lmbMeasurePSF(a.image,b.image);
         [a,b] = lmbSelectPSFReference(a,b,this.psf);
         this.sourceA=a.id; this.sourceB=b.id;
         this.a = lmbCopy(a, 'LMB_A', this.owned);
         this.b = lmbCopy(b, 'LMB_B', this.owned);
         lmbValidatePixels(this.a.mainView.image); lmbValidatePixels(this.b.mainView.image);
         this.scatter = lmbStellarSamples(this.a.mainView.image,this.b.mainView.image,this.psf);
         this.points = this.scatter.points;
         // Measure original noise, then convert B's sigma with its fitted slope.
         for (let c = 0; c < this.channels; ++c) {
            console.writeln('Measuring raw noise: ' + lmbChannel(c, this.channels));
            this.noiseA.push(lmbNoise(this.a.mainView.image, c, options.fallback));
            this.noiseB.push(lmbNoise(this.b.mainView.image, c, options.fallback));
         }
         this.fitMethod=this.scatter.kind;
         this.fits=lmbFitStellarChannels(this.points);
         let normalization = this.fits.map(f => '(' + lmbNumber(f.offset) + ')+(' + lmbNumber(f.slope) + ')*$T');
         if (!lmbPixelMath(normalization).executeOn(this.b.mainView, false)) throw new Error('Unclipped normalization failed.');
         this.psfA=this.psf.a;
         // Scalar affine normalization preserves gray PSF widths and multiplies
         // signal by the fitted slope. RGB channel scaling can alter intensity
         // profiles, so remeasure normalized B at the same accepted locations.
         this.psfB=this.channels===1 ? Object.assign({},this.psf.b,{
            signals:this.psf.b.signals.map(v=>v*this.fits[0].slope)}) :
            lmbMeasureOutputPSF(this.b.mainView.image,this.psf,this.psf.samples);
         let normalizedNoiseB=this.noiseB.map((n,c)=>Object.assign({},n,{sigma:n.sigma*this.fits[c].slope}));
         this.qualityA=lmbMeasureQuality(this.a.mainView.image,this.psfA,this.noiseA,options.fallback);
         this.qualityB=lmbMeasureQuality(this.b.mainView.image,this.psfB,normalizedNoiseB,options.fallback);
         this.weights=lmbIntegrationWeights(Object.assign({f:this.psfA.f},this.qualityA),
            Object.assign({f:this.psfB.f},this.qualityB),this.options.sharpness);
         this.prepareOutputRange();
      } catch (e) { e.psfReport=this.psf; this.dispose(); throw e; }
   }

   /** Resolve a stable Master 1/2 row to the internally reordered snapshots.
    * Use this mapping for measurements, formula and blink/readout together.
    * Source PSF widths are the original measurements used to choose reference;
    * normalizedPSF supplies the widths used by the integration quality weight.
    */
   master(index) {
      let reference=index===this.psf.reference.masterIndex;
      return {id:this.psf.reference.masters[index],reference:reference,
         snapshot:reference?this.a:this.b,noise:reference?this.noiseA:this.noiseB,
         psf:reference?this.psf.a:this.psf.b,normalizedPSF:reference?this.psfA:this.psfB,
         quality:reference?this.qualityA:this.qualityB,weight:reference?this.weights.a:this.weights.b};
   }

   /** Close in reverse allocation order; a failed close must not skip others. */
   dispose() {
      for (let i = this.owned.length - 1; i >= 0; --i) {
         try { lmbClose(this.owned[i]); } catch (e) { console.warningln('Temporary window cleanup: ' + e); }
      }
      this.owned = [];
   }

   /** Direct convex average, with identical scalar weights for RGB channels. */
   blendExpression(c) {
      let sub=this.channels===3?'['+c+']':'';
      return '('+lmbNumber(this.weights.a)+')*'+this.a.mainView.id+sub+
         '+('+lmbNumber(this.weights.b)+')*'+this.b.mainView.id+sub;
   }

   /** Measure the actual full blend in a hidden temporary Float64 image.
    * Its extrema define a common affine range map; close it even on failure.
    */
   prepareOutputRange() {
      let id = lmbUnique('LMB_range'), temporary = null;
      try {
         let p = lmbPixelMath(Array.from({length:this.channels}, (_, c) => this.blendExpression(c)));
         p.createNewImage = true; p.showNewImage = false;
         p.newImageId = id; p.newImageWidth = this.width; p.newImageHeight = this.height;
         p.newImageAlpha = false; p.newImageColorSpace = PixelMath.SameAsTarget;
         p.newImageSampleFormat = PixelMath.f64;
         lmbCheckAbort();
         if (!p.executeOn(this.a.mainView, false)) throw new Error('Output range calculation failed or was aborted.');
         temporary = ImageWindow.windowById(id);
         if (!temporary || temporary.isNull) throw new Error('Output range image was not created.');
         let range = lmbImageRange(temporary.mainView.image);
         this.outputMap = lmbOutputMap(range.minimum, range.maximum);
      } finally {
         if (!temporary) temporary = ImageWindow.windowById(id);
         lmbClose(temporary);
      }
   }

   /** Final PixelMath expression, including the measured output-range map. */
   expression(c) {
      let m = this.outputMap;
      // Measured extrema guarantee the affine map is bounded. min/max only guard
      // numerical roundoff at the endpoints; no real signal is clipped.
      return 'min(1,max(0,((' + this.blendExpression(c) + ')-(' +
         lmbNumber(m.lower) + '))*(' + lmbNumber(m.gain) + ')))';
   }

   /** Console-only formula summary; the dialog deliberately has no text pane. */
   report() {
      return Array.from({length:this.channels}, (_, c) =>
         (this.channels === 3 ? lmbChannel(c, this.channels) + ': ' : '') + this.expression(c)).join('\n\n');
   }

   /** Create a bounded Float32 result and measure its PSF and per-channel sigma.
    * Missing output diagnostics do not discard an otherwise valid image.
    * Abort or image-creation failure closes only this newly created result.
    */
   combine(output, show, quiet = false) {
      let id = lmbUnique(output), result = null;
      this.noiseOutput=null; this.psfOutput=null; this.qualityOutput=null;
      try {
         let expressions = Array.from({length:this.channels}, (_, c) => this.expression(c));
         let p = lmbPixelMath(expressions);
         p.createNewImage = true; p.showNewImage = false;
         p.newImageId = id; p.newImageWidth = this.width; p.newImageHeight = this.height;
         p.newImageAlpha = false; p.newImageColorSpace = PixelMath.SameAsTarget;
         // Float64 calculations and a bounded Float32 display image. Float32
         // storage alone did not resolve the reported zoom crash.
         p.newImageSampleFormat = PixelMath.f32;
         lmbCheckAbort();
         if (!p.executeOn(this.a.mainView, false)) throw new Error('PixelMath combination failed or was aborted.');
         result = ImageWindow.windowById(id);
         if (!result || result.isNull) throw new Error('PixelMath did not create the expected output image.');
         let range = lmbImageRange(result.mainView.image);
         if (!Number.isFinite(range.minimum) || !Number.isFinite(range.maximum) || range.minimum < 0 || range.maximum > 1)
            throw new Error('Output range verification failed; image will not be displayed.');
         // Measure the actual bounded Float32 image, not a theoretical estimate.
         let measured = [];
         for (let c = 0; c < this.channels; ++c) {
            try { measured.push(lmbNoise(result.mainView.image, c, this.options.fallback)); }
            catch (e) {
               if (console.abortRequested) throw e;
               measured.push({error:e.message});
               console.warningln('Output noise unavailable for ' + lmbChannel(c, this.channels) + ': ' + e.message);
            }
         }
         this.noiseOutput = measured;
         try { this.psfOutput=lmbMeasureOutputPSF(result.mainView.image,this.psf,this.psf.samples); }
         catch(e) {
            if(console.abortRequested)throw e;
            this.psfOutput={count:0,total:this.psf && this.psf.samples ? this.psf.samples.length : 0,error:e.message};
         }
         if(this.psfOutput.error)console.warningln('Output PSF unavailable: '+this.psfOutput.error);
         try {this.qualityOutput=lmbMeasureQuality(result.mainView.image,this.psfOutput,measured,this.options.fallback);}
         catch(e) {
            if(console.abortRequested)throw e;
            this.qualityOutput={error:e.message};
            console.warningln('Output PSF signal metrics unavailable: '+e.message);
         }
         if (!quiet) {
            console.writeln(this.report());
            let psf=this.psfOutput;
            console.writeln('Output PSF FWHM X / Y: '+(psf.error?'Unavailable ('+psf.error+')':
               psf.x.toFixed(3)+' / '+psf.y.toFixed(3)+' px; '+psf.count+' stars.'));
            for(let c=0;c<this.channels;++c) {
               let n=this.noiseOutput[c];
               console.writeln('Output noise '+lmbChannel(c,this.channels)+': '+(n.error?'Unavailable':
                  (n.sigma/this.outputMap.gain).toExponential(5)+' ('+n.method+'; reference brightness scale)'));
            }
            console.writeln('Created ' + id + '. Save the result as XISF when ready.');
         }
         if (show !== false) result.show();
         return result;
      } catch (e) {
         if (!result) result = ImageWindow.windowById(id);
         lmbClose(result); throw e;
      }
   }
}

/** Start with no source names; the workflow tag identifies saved instances. */
function lmbDefaults() { return {a:'',b:'',fallback:false,output:'Linear_Blend',
   autoStretch:true,sharpness:1,workflow:'quality-weighted-v1'}; }

/** Do not silently reinterpret saved instances from another integration mode. */
function lmbLoadOptions() {
   let o=lmbDefaults();
   if(Parameters.isGlobalTarget && (!Parameters.has('workflow') ||
      Parameters.getString('workflow')!==o.workflow))
      throw new Error('This saved instance does not specify quality-weighted integration. Open Linear Master Blend and save a new instance.');
   for(let key of ['a','b','output'])if(Parameters.has(key))o[key]=Parameters.getString(key);
   for(let key of ['fallback','autoStretch'])if(Parameters.has(key))o[key]=Parameters.getBoolean(key);
   // A saved quality-weighted instance without this parameter keeps its math.
   if(Parameters.has('sharpness'))o.sharpness=lmbSharpness(Parameters.getReal('sharpness'));
   else if(Parameters.has('workflow'))o.sharpness=0;
   return o;
}

/** Locate the manual bundled in TGScripts, then the installed PixInsight doc tree.
 * Explicit arguments also allow path handling to be verified without the UI.
 */
function lmbDocumentationPath(scriptFile = LMB_SCRIPT_FILE, docDirectory = CoreApplication.docDirPath) {
   let relative = '/scripts/LinearMasterBlend/LinearMasterBlend.html';
   let portable = File.extractDrive(scriptFile) + File.extractDirectory(scriptFile) + '/doc' + relative;
   if (File.exists(portable)) return portable;
   let installed = docDirectory.replace(/[\\/]+$/, '') + relative;
   return File.exists(installed) ? installed : '';
}

/** Use the native documentation browser with a verified local page.
 * Direct paths also work without registering a Feature Script.
 */
function lmbShowDocumentation() {
   let page = lmbDocumentationPath();
   if (page) Dialog.openBrowser(page, 'Linear Master Blend - TG Scripts');
   else new MessageBox('Documentation was not found. Check that TGScripts and its documentation are up to date through PixInsight\'s standard update system.',
      'Linear Master Blend', StdIcon.Warning, StdButton.Ok).execute();
}

/** DPI-aware native symbol button; spacing and grouping match ROILinearFit. */
function lmbTool(parent, resource, tip, action) {
   let button = new ToolButton(parent);
   button.icon = parent.scaledResource(resource);
   button.setScaledFixedSize(24, 24); button.toolTip = tip;
   if (action) button.onClick = action;
   return button;
}

// Uses only standard Graphics/Control primitives; no external plotting library.
class LMBPlot extends Control {
   constructor(parent) {
      super(parent); this.analysis = null; this.channel = 0;
      this.setScaledMinSize(700, 270);
      this.toolTip = 'One point per matched star: background-subtracted flux in the other master horizontally and the reference master vertically. Yellow: robust flux scale through zero. Blue: well-supported stars; gray: strongly downweighted; red: rejected. The separate image-background offset is not part of this flux line. RGB channels are fitted separately.';
      this.onPaint = () => {
         let g = new Graphics(this);
         try {
            let s = this.displayPixelRatio, pad = 65 * s, top = 28 * s;
            let right = this.width - 22 * s, bottom = this.height - 42 * s;
            g.fillRect(0, 0, this.width, this.height, new Brush(0xff18202b));
            g.font = this.font; g.pen = new Pen(0xffe6edf3);
            if (!this.analysis) { g.drawText(20 * s, 45 * s, 'Select Master 1 and Master 2, then Preview to see the scatter plot.'); return; }
            let data = this.analysis.points[this.channel], f = this.analysis.fits[this.channel];
            if(!data.length) {g.drawText(20*s,45*s,'No usable matched stellar fluxes for this channel.');return;}
            // Show the origin, all measured stars, and the through-origin line.
            let loX=0,loY=0,hiX=Math.max(...data.map(p=>p.x))*1.05,hiY=Math.max(...data.map(p=>p.y))*1.05;
            let X = v => pad + (v - loX) / (hiX - loX) * (right - pad);
            let Y = v => bottom - (v - loY) / (hiY - loY) * (bottom - top);
            for (let i = 0; i <= 4; ++i) {
               let x = loX + (hiX - loX) * i / 4, y = loY + (hiY - loY) * i / 4;
               g.pen = new Pen(0xff344051); g.drawLine(X(x), top, X(x), bottom); g.drawLine(pad, Y(y), right, Y(y));
               let tick = x.toPrecision(3), tickWidth = this.font.width(tick);
               let tickX = Math.max(3 * s, Math.min(this.width - 3 * s - tickWidth, X(x) - tickWidth / 2));
               g.pen = new Pen(0xffaebacc); g.drawText(tickX, bottom + 17 * s, tick);
               g.drawText(3 * s, Y(y) + 4 * s, y.toPrecision(3));
            }
            if(f) {
               let last=Math.min(hiX,hiY/f.slope);
               g.pen=new Pen(0xffffd166,2*s);g.drawLine(X(0),Y(0),X(last),Y(f.slope*last));
            }
            // Paint stars after the line, so an excellent fit still shows them.
            for (let p of data) {
               let color=p.weight===0 ? 0xffee776e : p.weight>0.1 ? 0xff55b4dc : 0xff737c87;
               let x=X(p.x),y=Y(p.y),radius=2*s;
               g.fillRect(x-radius,y-radius,x+radius,y+radius,new Brush(color));
            }
            g.pen = new Pen(0xffe6edf3);
            let reference=this.analysis.psf.reference.masterIndex+1, other=3-reference;
            g.drawText(pad,18*s,'Stellar flux: Master '+reference+' (y, reference) vs Master '+other+' (x) | '+lmbChannel(this.channel,this.analysis.channels)+
               (f?' | slope = '+f.slope.toPrecision(5):''));
            g.drawText(pad,this.height-8*s,data.length+' stars'+(f?' | '+f.count+' well-supported':'')+
               ' | blue: accepted; gray: downweighted; red: rejected');
         } finally { g.end(); }
      };
   }
}

/** Linked display stretch, derived from per-channel medians and MAD values.
 * Like the TGScripts auto-STF display convention, use 2.8 robust sigma for
 * clipping and a quarter-scale background. Return a HistogramTransformation
 * row [shadows, midtones, highlights, lowRange, highRange]. This is display only.
 */
function lmbPreviewStretch(medians, mads) {
   if (!medians.length || medians.length !== mads.length ||
       medians.some(v => !Number.isFinite(v)) || mads.some(v => !Number.isFinite(v) || v < 0))
      throw new Error('Cannot determine a finite preview stretch.');
   let n = medians.length, center = medians.reduce((a,b) => a+b, 0)/n;
   let inverted = medians.every(v => v > 0.5), low = 0, high = 1;
   let clip = medians.reduce((sum, value, c) => sum + (mads[c] > 0 ?
      value + (inverted ? 2.8 : -2.8)*1.4826*mads[c] : (inverted ? 1 : 0)), 0)/n;
   if (inverted) high = Math.max(0, Math.min(1, clip));
   else low = Math.max(0, Math.min(1, clip));
   if (!(high > low)) return [0,0.5,1,0,1];
   let x = (center-low)/(high-low), target = inverted ? 0.75 : 0.25;
   // Solve MTF(m,x)=target. Degenerate endpoints retain a neutral midtone.
   let m = x > 0 && x < 1 ? x*(target-1)/((2*target-1)*x-target) : 0.5;
   return [low, Math.max(1e-6,Math.min(1-1e-6,m)), high, 0, 1];
}

/** Derive one linked stretch from the output; reuse it for both blink frames.
 * Independent stretches would conceal brightness differences in the blend.
 */
function lmbImageStretch(im) {
   let medians = [], mads = [], clipping = im.rangeClippingEnabled;
   im.pushSelections();
   try {
      im.resetSelections(); im.rangeClippingEnabled = false;
      for (let c = 0; c < im.numberOfNominalChannels; ++c) {
         lmbCheckAbort(); im.selectedChannel = c;
         let median = im.median(); medians.push(median); mads.push(im.MAD(median));
      }
      return lmbPreviewStretch(medians,mads);
   } finally { im.popSelections(); im.rangeClippingEnabled = clipping; }
}

/** Render a full-resolution bitmap for ImageView. HistogramTransformation is
 * confined to an owned display copy; neither the linear output nor its STF is
 * modified. For a source comparison, range maps its normalized snapshot into
 * the output's stored units. Clamp only the display copy: a source can exceed
 * the combined output's extrema. The analysis snapshots remain unclipped.
 */
function lmbOutputBitmap(view, autoStretch, range = null, stretch = null) {
   let original = view.image, display = null;
   if (!autoStretch && !range) {
      original.pushSelections();
      try { original.resetSelections(); return original.render(); }
      finally { original.popSelections(); }
   }
   try {
      display = new ImageWindow(original.width, original.height, original.numberOfNominalChannels,
         32, true, original.isColor, lmbUnique('LMB_display'));
      let v = display.mainView;
      v.beginProcess(UndoFlag.NoSwapFile);
      try { v.image.assign(original, new Rect(0,0,original.width,original.height), 0, original.numberOfNominalChannels-1); }
      finally { v.endProcess(); }
      v.image.resetSelections();
      if (range) {
         let expression = 'min(1,max(0,($T-(' + lmbNumber(range.lower) + '))*(' + lmbNumber(range.gain) + ')))';
         if (!lmbPixelMath([expression]).executeOn(v,false)) throw new Error('Source display mapping failed or was aborted.');
      }
      if (autoStretch) {
         let h = new HistogramTransformation;
         // RGB/K applies the output-derived transfer to every nominal channel.
         h.H = [[0,0.5,1,0,1],[0,0.5,1,0,1],[0,0.5,1,0,1],stretch || lmbImageStretch(v.image),[0,0.5,1,0,1]];
         if (!h.executeOn(v,false)) throw new Error('Preview stretch failed or was aborted.');
      }
      lmbCheckAbort();
      v.image.resetSelections();
      return v.image.render();
   } finally { lmbClose(display); }
}

/** Extend the bundled ImageView without replacing its navigation handlers.
 * Coordinate conversion is supplied by ImageView, so centered/zoomed/panned
 * views all sample the same integer image pixel. Paint refreshes a stationary
 * pointer after zoom, scrolling or frame changes; labels update only on change.
 */
function lmbInstallPixelReadout(viewer, sampleProvider) {
   viewer.pixelName_Label=new Label(viewer);viewer.pixelName_Label.text='Value:';
   viewer.pixelValue_Label=new Label(viewer);viewer.pixelValue_Label.text='---';
   let row=viewer.coords_Control.sizer;
   row.insert(row.numberOfItems-1,viewer.pixelName_Label);
   row.insert(row.numberOfItems-1,viewer.pixelValue_Label);
   let pointer=null;
   viewer.refreshPixelReadout=()=>{
      let sample=null;
      if(pointer && viewer.isValid) {
         let pos=viewer.viewportToImage(pointer.x,pointer.y);
         sample=sampleProvider(Math.floor(pos.x),Math.floor(pos.y));
      }
      let text='---';
      if(sample) {
         viewer.pixelName_Label.text=sample.name+':';
         text=sample.values.map((v,c)=>(sample.values.length===3?['R ','G ','B '][c]:'')+v.toFixed(6)).join('  ');
         viewer.pixelValue_Label.toolTip=sample.tip;
      }
      if(viewer.pixelValue_Label.text!==text)viewer.pixelValue_Label.text=text;
   };
   viewer.clearPixelReadout=()=>{pointer=null;viewer.refreshPixelReadout();};
   let viewport=viewer.scrollbox.viewport;
   viewport.tracking=true;
   let move=viewport.onMouseMove,leave=viewport.onLeave,paint=viewport.onPaint,wheel=viewport.onMouseWheel;
   viewport.onMouseMove=function(x,y,buttons,modifiers){
      if(move)move.call(this,x,y,buttons,modifiers);
      pointer={x:x,y:y};viewer.refreshPixelReadout();
   };
   viewport.onMouseWheel=function(x,y,delta,buttons,modifiers){
      if(wheel)wheel.call(this,x,y,delta,buttons,modifiers);
      pointer={x:x,y:y};viewer.refreshPixelReadout();
   };
   viewport.onLeave=function(){if(leave)leave.call(this);viewer.clearPixelReadout();};
   viewport.onPaint=function(x0,y0,x1,y1){
      if(paint)paint.call(this,x0,y0,x1,y1);viewer.refreshPixelReadout();
   };
}

/** Master selection, output preview, stellar-flux scatter and measurements.
 * Any processing-setting change invalidates the owned preview. Channel changes
 * only change the displayed plot/table and do not rerun the image calculations.
 */
class LMBDialog extends Dialog {
   constructor(options) {
      super(); this.windowTitle = 'Linear Master Blend ' + LMB_VERSION;
      this.analysis = null; this.running = false; this.psfReport = null;
      // Retain output plus one lazy source bitmap. ImageView owns its own copy.
      this.outputBitmap = null; this.sourceBitmap = null; this.previewStretch = null;
      this.sourceBitmapIndex=-1;
      this.showingSource = false; this.blinking = false;
      this.blinkTimer = new Timer(0.75, false, this);
      this.blinkTimer.onTimeout = () => this.blinkTick();
      this.intro = new Label(this); this.intro.wordWrapping = true;
      this.intro.text='Integrate two aligned linear masters using measured quality and adjustable sharpness preference. '
         +'Preview selects the sharper master as the brightness reference. Crop registration borders first.';
      this.aList = new ViewList(this); this.aList.getMainViews();
      this.bList = new ViewList(this); this.bList.getMainViews();
      // Do not infer inputs from open views; only restore explicit instance choices.
      this.aList.currentView = new View();
      this.bList.currentView = new View();
      if (options.a && lmbHasView(View.viewById(options.a))) this.aList.currentView = View.viewById(options.a);
      if (options.b && lmbHasView(View.viewById(options.b))) this.bList.currentView = View.viewById(options.b);
      this.sharpness=new NumericControl(this);
      this.sharpness.label.hide(); this.sharpness.sizer.margin=0;
      this.sharpness.setReal(true); this.sharpness.setRange(0,8); this.sharpness.setPrecision(2);
      this.sharpness.slider.setRange(0,800); this.sharpness.slider.setScaledMinWidth(200);
      this.sharpness.setValue(lmbSharpness(options.sharpness));
      this.sharpness.toolTip='Extra preference for the master with smaller combined FWHM. Default: 1. Zero uses the 40% PSF Signal Weight / 40% PSF SNR / 20% inverse-FWHM balance alone. Higher values increase the sharper master\'s contribution. This value is not a percentage. Calculate Preview after changing it.';
      this.fallback = new CheckBox(this); this.fallback.text = 'Allow k-sigma fallback if MRS fails'; this.fallback.checked = options.fallback;
      this.output = new Edit(this); this.output.text = options.output;
      this.channel = new ComboBox(this); for (let name of ['R', 'G', 'B']) this.channel.addItem(name);
      this.channel.visible = false;
      this.tabs = new TabBox(this);
      this.outputPage = new Control(this.tabs); this.fitPage = new Control(this.tabs);
      this.previewViewer = new ImageView(this.outputPage);
      lmbInstallPixelReadout(this.previewViewer,(x,y)=>this.previewPixelSample(x,y));
      this.previewViewer.setScaledMinSize(700, 370);
      this.previewViewer.setStatusMessage('Click the magnifier to preview the combined image.');
      this.autoStretch = new CheckBox(this.outputPage); this.autoStretch.text = 'Auto stretch preview (display only)';
      this.autoStretch.checked = options.autoStretch !== false;
      this.autoStretch.toolTip = 'One output-derived display stretch for output and source. Original images and the linear output remain unchanged. Turning this off shows their common linear display scale.';
      this.blinkSource = new ComboBox(this.outputPage);
      this.blinkSource.addItem('Master 1'); this.blinkSource.addItem('Master 2');
      this.blinkSource.setScaledFixedWidth(190);
      this.blinkSource.toolTip = 'Blink the output against either master on the reference brightness scale. Both use the output range map and the same display stretch. Source values outside the display range are clipped only for display.';
      this.blinkButton = lmbTool(this.outputPage, ':/icons/play.png', 'Start blinking output/source every 0.75 seconds. Stop returns to output.', () => this.blinkAction(true));
      this.stepButton = lmbTool(this.outputPage, ':/icons/step-forward.png', 'Switch once between output and the selected source; pause automatic blinking.', () => this.blinkAction(false));
      let previewControls = new HorizontalSizer; previewControls.spacing = 6;
      let blinkLabel = new Label(this.outputPage); blinkLabel.text = 'Blink with:';
      previewControls.add(this.autoStretch); previewControls.addStretch(); previewControls.add(blinkLabel);
      previewControls.add(this.blinkSource); previewControls.add(this.blinkButton); previewControls.add(this.stepButton);
      this.outputPage.sizer = new VerticalSizer; this.outputPage.sizer.margin = 6; this.outputPage.sizer.spacing = 6;
      this.outputPage.sizer.add(this.previewViewer, 100); this.outputPage.sizer.add(previewControls);
      this.plot = new LMBPlot(this.fitPage);
      this.measurementTitle = new Label(this.fitPage);
      this.referenceStatus = new Label(this.fitPage); this.referenceStatus.wordWrapping = true;
      this.referenceStatus.toolTip = 'The master with the lower median sqrt(FWHM X * FWHM Y) over the same accepted stars becomes the brightness reference. Equal widths retain Master 1. Selection order stays fixed.';
      let measurementTable = new VerticalSizer; measurementTable.spacing = 3;
      measurementTable.add(this.measurementTitle); measurementTable.add(this.referenceStatus);
      this.measurementCells = [];
      const widths=[90,100,95,95,140,100,100,45];
      for (let texts of [['Image','Sigma','FWHM X (px)','FWHM Y (px)','PSF Signal Weight','PSF SNR','Contribution','Stars'],
                        ['Master 1','-','-','-','-','-','-','-'],
                        ['Master 2','-','-','-','-','-','-','-'],
                        ['Output','-','-','-','-','-','-','-']]) {
         let cells = [], row = new HorizontalSizer; row.spacing = 8;
         for (let text of texts) {
            let label = new Label(this.fitPage); label.text = text;
            label.setScaledMinWidth(widths[cells.length]); row.add(label,100); cells.push(label);
         }
         this.measurementCells.push(cells); measurementTable.add(row);
      }
      let headers=this.measurementCells[0];
      headers[1].toolTip=LMB_SIGMA_TOOLTIP;
      headers[2].toolTip=headers[3].toolTip='Median stellar FWHM in aligned-image pixels: X = fitted major axis, Y = fitted minor axis. Master rows show the original PSF widths used to select the reference; RGB uses combined linear intensity.';
      headers[4].toolTip='Stellar signal quality from the accepted PSF stars, measured on brightness-matched masters. Higher is better. This criterion supplies 40% of the base quality weight, before sharpness preference.';
      headers[5].toolTip='PixInsight PSF signal-to-noise estimator on the same matched stars. Higher is better. This criterion supplies 40% of the base quality weight, before sharpness preference.';
      headers[6].toolTip='Base quality = 40% normalized PSF Signal Weight + 40% normalized PSF SNR + 20% normalized inverse combined FWHM. Sharpness preference multiplies each base weight by inverse FWHM raised to the chosen power, then normalizes the pair. Contributions sum to 100% and apply to every pixel and RGB channel.';
      headers[7].toolTip='Number of accepted PSF star measurements.';
      this.formula=new Label(this.fitPage);this.formula.wordWrapping=true;
      this.formula.toolTip='Both masters are on the reference brightness scale before combination. One common affine range map is applied afterward only if needed to keep the output within [0,1]. Source pixels are unchanged.';
      this.fitPage.sizer = new VerticalSizer; this.fitPage.sizer.margin = 6; this.fitPage.sizer.spacing = 6;
      this.fitPage.sizer.add(this.plot,100); this.fitPage.sizer.add(measurementTable); this.fitPage.sizer.add(this.formula);
      this.tabs.addPage(this.outputPage, 'Output preview'); this.tabs.addPage(this.fitPage, 'Measurements');
      this.measurementTitle.toolTip = LMB_SIGMA_TOOLTIP + ' RGB PSF and quality values use combined linear intensity and do not change with the noise channel selector.';
      this.status = new Label(this); this.status.wordWrapping = true;
      this.status.text = 'Magnifier: calculate preview. Green checkmark: create a new image.';
      let row = (label, control) => {
         let s = new HorizontalSizer; s.spacing = 8;
         let l = new Label(this); l.text = label; l.setScaledMinWidth(140); s.add(l); s.add(control, 100); return s;
      };
      let channelRow = new HorizontalSizer; channelRow.addStretch(); channelRow.add(this.channel);
      this.newInstanceButton = lmbTool(this, ':/process-interface/new-instance.png', 'New instance: drag to the workspace to save image IDs and settings.');
      this.newInstanceButton.onMousePress = () => {
         let o = this.options(); Parameters.clear(); for (let key of Object.keys(o)) Parameters.set(key, o[key]); this.newInstance();
      };
      this.previewButton = lmbTool(this, ':/toolbar/view-zoom.png', 'Preview: measure both PSFs, select the sharper master as reference, match brightness, and calculate the combined image and all measurements.', () => this.action(false));
      this.resetButton = lmbTool(this, ':/process-interface/reset.png', 'Reset settings and release the preview snapshots.', () => {
         this.invalidate(true); this.fallback.checked = false; this.output.text = 'Linear_Blend';
         this.autoStretch.checked=true; this.sharpness.setValue(lmbDefaults().sharpness);
      });
      this.helpButton = lmbTool(this, ':/process-interface/browse-documentation.png', 'Open the Linear Master Blend user manual.', lmbShowDocumentation);
      this.createButton = lmbTool(this, ':/process-interface/execute.png', 'Create a new 32-bit combined image, calculated at 64-bit precision, using the current preview.', () => this.action(true));
      this.closeButton = lmbTool(this, ':/process-interface/cancel.png', 'Close and release temporary image copies.', () => this.cancel());
      let buttons = new HorizontalSizer; buttons.spacing = 8;
      // ROILinearFit grouping: setup/preview on the left, action/close/help on the right.
      buttons.add(this.newInstanceButton); buttons.add(this.previewButton); buttons.add(this.resetButton);
      buttons.addStretch();
      buttons.add(this.createButton); buttons.add(this.closeButton); buttons.add(this.helpButton);
      this.sizer = new VerticalSizer; this.sizer.margin = 10; this.sizer.spacing = 8;
      this.sizer.add(this.intro); this.sizer.add(row('Master 1:', this.aList)); this.sizer.add(row('Master 2:', this.bList));
      this.sizer.add(row('Sharpness preference:',this.sharpness));
      this.sizer.add(channelRow); this.sizer.add(this.fallback); this.sizer.add(row('Output ID:', this.output));
      this.sizer.add(this.tabs, 100); this.sizer.add(this.status); this.sizer.add(buttons);
      this.aList.onViewSelected = this.bList.onViewSelected = () => this.invalidate(true);
      this.fallback.onCheck=()=>this.invalidate();
      this.sharpness.onValueUpdated=()=>this.invalidate();
      this.channel.onItemSelected = index => { this.plot.channel = this.plot.analysis && this.plot.analysis.channels === 3 ? index : 0; this.plot.update(); this.updateMeasurements(); };
      this.autoStretch.onCheck = () => { if (this.analysis) this.action(false, true); };
      this.blinkSource.onItemSelected = () => {
         this.stopBlink(true);
         if (this.sourceBitmap) this.sourceBitmap.clear(); this.sourceBitmap = null;
         this.sourceBitmapIndex=-1;
      };
      this.tabs.onPageSelected=index=>{if(index!==0)this.stopBlink(true);};
      this.onClose = () => { if (this.running) return false; this.stopBlink(false); return true; };
      this.updateBlinkControls();this.updateMeasurements();
      this.adjustToContents();
   }

   /** Read live controls when previewing, creating, or saving an instance. */
   options() {
      return {a:lmbHasView(this.aList.currentView) ? this.aList.currentView.id : '',
         b:lmbHasView(this.bList.currentView) ? this.bList.currentView.id : '',
         fallback:this.fallback.checked, output:this.output.text.trim(),
         autoStretch:this.autoStretch.checked,sharpness:this.sharpness.value,workflow:'quality-weighted-v1'};
   }


   /** Adopt measurements without changing the user's Master 1/2 selections. */
   adoptPSF(report) {
      this.psfReport=report;
      this.updateMeasurements();
   }

   /** Report the reference decision beside the corresponding measurement rows. */
   updateReference() {
      let r=this.psfReport, ref=r && r.reference;
      let text='Reference frame: determined by Preview.';
      if(ref) {
         if(!ref.available)text='Reference frame: unavailable — insufficient PSF measurements.';
         else {
            text='Reference frame: Master '+(ref.masterIndex+1)+' ('+ref.a+'). ';
            text+=ref.tied?'Equal combined FWHM; Master 1 retained.':
               'Lower combined FWHM: '+r.a.f.toFixed(3)+' px (other master: '+r.b.f.toFixed(3)+' px).';
         }
      }
      this.referenceStatus.text=text;
   }

   /** All rows retain selection order. Sigma is on the reference brightness
    * scale; an additive offset does not change it. Master PSF widths are the
    * original reference-selection measurements, even if later steps fail.
    * RGB normalization can slightly alter intensity PSFs; those widths are
    * used for quality weighting and included in the FWHM tooltip.
    */
   updateMeasurements() {
      this.updateReference();
      let a=this.analysis,c=a && a.channels===3?this.channel.currentItem:0;
      this.measurementTitle.text='Measurements'+(a?' — Sigma: '+lmbChannel(c,a.channels)+'; PSF: '+(a.channels===3?'combined intensity':'Gray'):'');
      let report=this.psfReport,ref=report && report.reference;
      for(let i=0;i<3;++i) {
         let m=a && i<2?a.master(i):null;
         let cells=this.measurementCells[i+1],n=a?(i===2?(a.noiseOutput?a.noiseOutput[c]:null):m.noise[c]):null;
         let factor=a?(i===2?1/a.outputMap.gain:m.reference?1:a.fits[c].slope):1;
         cells[0].text=i===2?'Output':'Master '+(i+1);
         cells[0].toolTip=i===2?'Integrated output.':(ref?ref.masters[i]+(i===ref.masterIndex?' — reference image':' — normalized to the reference image'):'Selected master image.');
         cells[1].text=n && !n.error?(n.sigma*factor).toExponential(4):n?'Unavailable':'-';
         let tip=n?(n.error || ('Method: '+n.method+'; support: '+n.count+' pixels'+(n.layers?'; MRS layers: '+n.layers:''))):'';
         cells[1].toolTip=LMB_SIGMA_TOOLTIP+(tip?'\n\n'+tip:'');
         let psf=i===2?(a?a.psfOutput:null):m?m.psf:ref?(i===ref.masterIndex?report.a:report.b):null;
         let count=psf?psf.count:0;
         let valid=psf && !psf.error && Number.isFinite(psf.x) && Number.isFinite(psf.y);
         cells[2].text=valid?psf.x.toFixed(3):psf?'Unavailable':'-';
         cells[3].text=valid?psf.y.toFixed(3):psf?'Unavailable':'-';
         cells[7].text=psf?String(count):'-';
         let psfTip=psf && psf.error?psf.error:this.measurementCells[0][2].toolTip;
         if(i===2 && psf && !psf.error)psfTip='Output fits: '+count+' / '+psf.total+' accepted source-star locations, using the same profile models. X = major axis; Y = minor axis.';
         if(m && a.channels===3 && !m.reference && m.normalizedPSF && !m.normalizedPSF.error)
            psfTip+=' After RGB brightness matching, the quality weight uses FWHM X / Y = '+m.normalizedPSF.x.toFixed(3)+' / '+m.normalizedPSF.y.toFixed(3)+' px.';
         if(valid && count<20)psfTip+=' Small sample: interpret with caution.';
         cells[2].toolTip=cells[3].toolTip=cells[7].toolTip=psfTip;
         let q=a?(i===2?a.qualityOutput:m.quality):null;
         cells[4].text=q && !q.error?q.weight.toExponential(4):q?'Unavailable':'-';
         cells[5].text=q && !q.error?q.snr.toExponential(4):q?'Unavailable':'-';
         cells[6].text=m?(100*m.weight).toFixed(2)+'%':'-';
         for(let j=4;j<=6;++j)cells[j].toolTip=q && q.error?q.error:this.measurementCells[0][j].toolTip;
      }
      this.formula.text=a?'Combination: '+a.master(0).weight.toFixed(6)+' × Master 1 + '+a.master(1).weight.toFixed(6)+' × Master 2 (reference brightness scale)'+
         (a.outputMap.gain!==1 || a.outputMap.lower!==0?'; then common range normalization.':'.'):'Preview calculates the integration weights.';
   }

   /** Stop callbacks before releasing cached frames. A new analysis or display
    * stretch must never blink with a frame derived from the previous settings.
    */
   releasePreview() {
      this.stopBlink(false);
      this.previewViewer.clear();
      this.previewViewer.clearPixelReadout();
      if (this.outputBitmap) this.outputBitmap.clear(); this.outputBitmap = null;
      if (this.sourceBitmap) this.sourceBitmap.clear(); this.sourceBitmap = null;
      this.sourceBitmapIndex=-1;
      this.previewStretch = null; this.showingSource = false;
      this.updateBlinkControls();
   }

   showOutputPreview(view) {
      this.releasePreview();
      this.previewStretch = this.autoStretch.checked ? lmbImageStretch(view.image) : null;
      this.outputBitmap = lmbOutputBitmap(view, this.autoStretch.checked, null, this.previewStretch);
      this.tabs.currentPageIndex = 0; this.ensureLayoutUpdated();
      this.previewViewer.setImage(this.outputBitmap); this.previewViewer.zoomToFit();
      this.setPreviewFrame(false);
   }

   /** Exact linear pixel readout, independent of the displayed stretch.
    * Reconstruct the weighted output from immutable snapshots with the same
    * Float32 rounding and range map as the actual PixelMath result.
    */
   previewPixelSample(x,y) {
      let a=this.analysis;
      if(!a || !this.outputBitmap || !Number.isFinite(x)||!Number.isFinite(y)||x<0||y<0||x>=a.width||y>=a.height)return null;
      x=Math.floor(x);y=Math.floor(y);let values=[];
      for(let c=0;c<a.channels;++c) {
         let v;
         if(this.showingSource)v=a.master(this.blinkSource.currentItem).snapshot.mainView.image.sample(x,y,c);
         else {
            v=a.weights.a*a.a.mainView.image.sample(x,y,c)+a.weights.b*a.b.mainView.image.sample(x,y,c);
            v=Math.fround(Math.min(1,Math.max(0,(v-a.outputMap.lower)*a.outputMap.gain)));
         }
         values.push(v);
      }
      return {name:'Value',values:values,tip:this.showingSource?'Linear master value on the reference brightness scale, before display mapping.':'Linear output value before display stretching.'};
   }

   /** One shared source cache, keyed by image identity within this analysis.
    * ImageView owns its display copy. releasePreview() clears the cache when
    * the output or display stretch changes.
    */
   sourcePreviewBitmap(index) {
      if(this.sourceBitmap && this.sourceBitmapIndex!==index) {
         this.sourceBitmap.clear(); this.sourceBitmap=null; this.sourceBitmapIndex=-1;
      }
      if(!this.sourceBitmap) {
         let source=this.analysis.master(index).snapshot;
         this.sourceBitmap=lmbOutputBitmap(source.mainView,this.autoStretch.checked,this.analysis.outputMap,this.previewStretch);
         this.sourceBitmapIndex=index;
      }
      return this.sourceBitmap;
   }

   /** regenerate(bitmap) preserves ImageView zoom and scroll position. setImage
    * resets them and therefore must only be used for a newly computed preview.
    */
   setPreviewFrame(source) {
      let bitmap = source ? this.sourceBitmap : this.outputBitmap;
      if (!bitmap) return;
      if (source !== this.showingSource) this.previewViewer.regenerate(bitmap);
      this.showingSource = source;this.previewViewer.refreshPixelReadout();
      let label = 'Output';
      if (source) {
         let index=this.blinkSource.currentItem, master=this.analysis.master(index);
         label='Master '+(index+1)+': '+master.id+(master.reference?' (reference)':' (normalized)');
      }
      this.previewViewer.setStatusMessage(label + (this.autoStretch.checked ? ' - shared display stretch' : ' - common linear display scale'));
   }

   updateBlinkControls() {
      let ready = !this.running && !!this.analysis && !!this.outputBitmap;
      this.blinkSource.enabled = this.blinkButton.enabled = this.stepButton.enabled = ready;
      this.blinkButton.icon = this.scaledResource(this.blinking ? ':/icons/stop.png' : ':/icons/play.png');
      this.blinkButton.toolTip = this.blinking ? 'Stop blinking and show output.' : 'Start blinking output/source every 0.75 seconds. Stop returns to output.';
   }

   stopBlink(showOutput) {
      this.blinkTimer.stop(); this.blinking = false;
      if (showOutput) this.setPreviewFrame(false);
      this.updateBlinkControls();
   }

   /** A single-shot timer is restarted only after each frame is displayed.
    * There is no fit, noise estimation or native image processing in a tick.
    */
   blinkTick() {
      if (!this.blinking || this.running || this.tabs.currentPageIndex !== 0) {
         this.stopBlink(true); return;
      }
      try {
         this.setPreviewFrame(!this.showingSource);
         this.blinkTimer.start();
      } catch (e) {
         this.stopBlink(false); this.status.text = 'Blink stopped: ' + e.message;
         console.warningln(String(e));
      }
   }

   /** Build just the selected source frame on demand, from immutable analysis
    * snapshots. B has already been normalized. Lock UI while native rendering
    * yields events, then alternate cached frames with no extra image windows.
    */
   blinkAction(automatic) {
      if (this.running || !this.analysis || !this.outputBitmap) return;
      if (automatic && this.blinking) { this.stopBlink(true); return; }
      this.stopBlink(false);
      let oldAbort = console.abortEnabled;
      this.setBusy(true); console.abortEnabled = true;
      try {
         this.sourcePreviewBitmap(this.blinkSource.currentItem);
         this.setPreviewFrame(automatic || !this.showingSource);
         if (automatic) { this.blinking = true; this.blinkTimer.start(); }
      } catch (e) {
         this.stopBlink(false); this.status.text = 'Source preview unavailable: ' + e.message;
         console.warningln(String(e));
         new MessageBox(this.status.text, 'Linear Master Blend', StdIcon.Error, StdButton.Ok).execute();
      } finally { console.abortEnabled = oldAbort; this.setBusy(false); }
   }

   /** Keep timers and user edits out of native processing event loops. */
   setBusy(busy) {
      this.running = busy;
      for (let c of [this.aList,this.bList,this.sharpness,this.fallback,this.output,this.channel,
         this.autoStretch,this.tabs,
         this.newInstanceButton,this.previewButton,this.resetButton,this.helpButton,this.createButton,this.closeButton])
         c.enabled = !busy;
      this.updateBlinkControls();
   }

   /** Release snapshots before clearing UI pointers; stale values must vanish. */
   invalidate(clearPSF = false) {
      this.releasePreview();
      this.previewViewer.setStatusMessage('Preview is out of date. Click the magnifier.');
      if (this.analysis) this.analysis.dispose(); this.analysis = null;
      this.plot.analysis = null; this.channel.visible = false; this.plot.update();
      if (clearPSF) this.psfReport=null;
      this.updateMeasurements();
      this.status.text = 'Ready to calculate a fresh preview.';
   }

   /** Shared Preview/Create transaction: disable controls, preserve the abort
    * setting, refresh the analysis if needed, and restore controls on all exits.
    */
   action(create, displayOnly = false) {
      let oldAbort = console.abortEnabled, created = null;
      this.stopBlink(false); this.setBusy(true);
      console.show(); console.abortEnabled = true;
      try {
         let o = this.options();
         if (!o.a || !o.b) throw new Error('Select both Master 1 and Master 2.');
         if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(o.output)) throw new Error('Invalid output identifier.');
         if ((!create && !displayOnly) || !this.analysis) {
            this.invalidate(true); this.status.text = 'Measuring PSFs, normalizing copies and measuring noise...';
            this.analysis = new LMBAnalysis(View.viewById(o.a), View.viewById(o.b), o);
            this.adoptPSF(this.analysis.psf);
            this.plot.analysis = this.analysis; this.plot.channel = this.analysis.channels === 3 ? this.channel.currentItem : 0;
            this.channel.visible = this.analysis.channels === 3; this.plot.update(); this.updateMeasurements();

         }
         if (create) {
            created = this.analysis.combine(o.output);
            this.updateMeasurements();
            this.showOutputPreview(created.mainView);
            this.status.text = 'Created ' + created.mainView.id + '. The preview stretch is display-only; save the linear output as XISF.';
         } else {
            let temporary = null;
            this.status.text = 'Rendering the full-resolution combined output...';
            try {
               temporary = this.analysis.combine('LMB_preview', false, true);
               this.updateMeasurements(); this.showOutputPreview(temporary.mainView);
               this.status.text = 'Output preview ready. Measurements shows the reference frame and results for both masters and output. Create opens the linear result.';
            } finally { lmbClose(temporary); }
         }
      } catch (e) {
         if(e.psfReport)this.adoptPSF(e.psfReport);
         this.status.text = created ? 'Created ' + created.mainView.id + '; preview unavailable: ' + e.message : 'Error: ' + e.message;
         console.warningln(String(e));
         new MessageBox(this.status.text, 'Linear Master Blend', StdIcon.Error, StdButton.Ok).execute();
      } finally {
         console.abortEnabled = oldAbort; this.setBusy(false);
      }
   }
}

/** Global instances execute with stored image IDs; interactive runs use a
 * dialog. Both paths release owned snapshots. View-target execution is refused
 * because this tool requires two explicitly selected source images.
 */
function lmbMain() {
   CoreApplication.ensureMinimumVersion(1, 9, 5);
   let options = lmbLoadOptions();
   if (Parameters.isViewTarget) throw new Error('Run globally: the script requires two explicitly selected main images.');
   if (Parameters.isGlobalTarget) {
      let analysis, oldAbort = console.abortEnabled;
      try {
         console.show(); console.abortEnabled = true;
         if (!options.a || !options.b) throw new Error('The saved instance must specify both input images.');
         analysis = new LMBAnalysis(View.viewById(options.a), View.viewById(options.b), options);
         analysis.combine(options.output);
      } finally { if (analysis) analysis.dispose(); console.abortEnabled = oldAbort; }
   } else {
      let dialog = new LMBDialog(options);
      try { dialog.execute(); } finally { dialog.releasePreview(); if (dialog.analysis) dialog.analysis.dispose(); }
   }
}

#ifndef LMB_LIBRARY
lmbMain();
#endif
