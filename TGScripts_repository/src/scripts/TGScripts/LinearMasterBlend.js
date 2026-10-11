#engine v8
#include <pjsr/controls/ImageView.js>
#ifndef LMB_LIBRARY
#feature-id LinearMasterBlend : TG Scripts > Linear Master Blend
#feature-info Normalize aligned linear masters and combine broad structure while retaining the selected master's fine detail.
#endif

/* Linear Master Blend 1.6.1
 * Requires PixInsight 1.9.5+ (V8). No external libraries or image files.
 * Original implementation, 2026. Released under the MIT license (see LICENSE.txt).
 * A is the photometric reference. B is normalized to A independently per channel.
 * Native LinearFit determines the transformation; its clipped output is used only
 * to recover and validate that transformation. PixelMath applies it unclipped to
 * a fresh copy of B. Source noise is measured before normalization; actual output
 * noise is measured after creation and shown also in reference intensity units.
 * Source windows are never process targets. Owned windows are closed on failure.
 */

const LMB_VERSION = '1.6.1';
const LMB_SCRIPT_FILE = #__FILE__;

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

/** Check geometry, sample type and user parameters before allocating copies.
 * Registration, linearity and common spectral response require user judgment.
 */
function lmbValidate(a, b, options) {
   if (!a || a.isNull || !b || b.isNull) throw new Error('Select two open main images.');
   if (!a.isMainView || !b.isMainView) throw new Error('Select main images, not previews.');
   if (a.id === b.id) throw new Error('A and B must be different images.');
   let x = a.image, y = b.image;
   if (x.width !== y.width || x.height !== y.height) throw new Error('Image dimensions must match. Register and crop both masters first.');
   if (x.width < 32 || x.height < 32) throw new Error('Both dimensions must be at least 32 pixels for noise evaluation.');
   if (x.isComplex || y.isComplex || !x.isReal || !y.isReal) throw new Error('Use real floating-point linear master images.');
   if (x.isColor !== y.isColor || x.numberOfNominalChannels !== y.numberOfNominalChannels ||
       (x.numberOfNominalChannels !== 1 && x.numberOfNominalChannels !== 3))
      throw new Error('Use two grayscale or two RGB images with matching channels.');
   if (x.numberOfChannels !== x.numberOfNominalChannels || y.numberOfChannels !== y.numberOfNominalChannels)
      throw new Error('Remove alpha channels before combining.');
   if (!Number.isFinite(options.low) || !Number.isFinite(options.high) ||
       options.low < 0 || options.high > 1 || options.low >= options.high)
      throw new Error('LinearFit limits must satisfy 0 <= low < high <= 1.');
   if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(options.output))
      throw new Error('Output identifier must start with a letter or underscore and contain only letters, digits and underscores.');
   if (!['A','B'].includes(options.detail) ||
       !Number.isFinite(options.scale) || options.scale < 1 || options.scale > 32 ||
       !Number.isFinite(options.other) || options.other < 0 || options.other > 1)
      throw new Error('Choose detail source A/B, Gaussian sigma 1 to 32 pixels, and other-image contribution 0 to 100%.');
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

// Stratified deterministic samples for visualization and affine-map recovery.
// The native LinearFit process itself uses the full images, not this sample.
function lmbSample(a, b, maxPoints) {
   let total = a.width * a.height, n = Math.min(total, maxPoints), state = 13579;
   let channels = Array.from({length:a.numberOfNominalChannels}, () => []);
   for (let i = 0; i < n; ++i) {
      state = (1664525 * state + 1013904223) >>> 0;
      let start = Math.floor(i * total / n), end = Math.floor((i + 1) * total / n);
      let index = start + Math.floor((state / 4294967296) * (end - start));
      let x = index % a.width, y = Math.floor(index / a.width);
      for (let c = 0; c < channels.length; ++c)
         channels[c].push({x:b.sample(x, y, c), y:a.sample(x, y, c), px:x, py:y});
   }
   return channels;
}

// Recover the map applied by LinearFit, not an alternative reference-vs-B fit.
function lmbRecover(points, fitted, channel) {
   let usable = [];
   for (let p of points) {
      let v = fitted.sample(p.px, p.py, channel);
      if (!Number.isFinite(v)) throw new Error('LinearFit returned a non-finite sample.');
      p.fitted = v;
      if (v > 1e-10 && v < 1 - 1e-10) usable.push(p);
   }
   if (usable.length < 32) throw new Error('Too few unclipped samples to recover the native fit. Check overlap, signal range and rejection limits.');
   let mx = 0, my = 0;
   for (let p of usable) { mx += p.x / usable.length; my += p.fitted / usable.length; }
   let covariance = 0, variance = 0;
   for (let p of usable) { covariance += (p.x - mx) * (p.fitted - my); variance += (p.x - mx) ** 2; }
   let slope = covariance / variance, offset = my - slope * mx;
   if (!(variance > 1e-24) || !Number.isFinite(slope) || slope <= 0 || !Number.isFinite(offset))
      throw new Error('Degenerate or non-positive native fit. Check that the masters represent the same signal.');
   let error = 0;
   for (let p of points)
      error = Math.max(error, Math.abs(Math.max(0, Math.min(1, offset + slope * p.x)) - p.fitted));
   if (error > 2e-7) throw new Error('Native LinearFit is not consistent with a clipped affine transformation. Maximum error: ' + error);
   return {slope:slope, offset:offset, error:error, count:usable.length};
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

// Unit-sum positive Gaussian, truncated at four sigma. No sharpening or clipping.
function lmbGaussian(sigma) {
   let radius = Math.ceil(4 * sigma), kernel = [], sum = 0;
   for (let i = -radius; i <= radius; ++i) {
      let value = Math.exp(-0.5 * (i / sigma) ** 2); kernel.push(value); sum += value;
   }
   return kernel.map(value => value / sum);
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

/** Owns an immutable preview: A, normalized B, and their smoothed difference.
 * Construction fits the snapshots, measures original-source noise, prepares
 * the detail blend, and determines one shared output map for all channels.
 * Create reuses this preview exactly; dispose releases all owned snapshots.
 */
class LMBAnalysis {
   constructor(a, b, options) {
      lmbValidate(a, b, options);
      this.owned = []; this.sourceA = a.id; this.sourceB = b.id;
      this.options = Object.assign({}, options);
      this.width = a.image.width; this.height = a.image.height;
      this.channels = a.image.numberOfNominalChannels;
      this.noiseA = []; this.noiseB = []; this.noiseOutput = null; this.fits = [];
      try {
         this.a = lmbCopy(a, 'LMB_A', this.owned);
         this.b = lmbCopy(b, 'LMB_B', this.owned);
         lmbValidatePixels(this.a.mainView.image); lmbValidatePixels(this.b.mainView.image);
         this.points = lmbSample(this.a.mainView.image, this.b.mainView.image, 12000);
         // Measure before B is normalized so the table can show original units.
         for (let c = 0; c < this.channels; ++c) {
            console.writeln('Measuring raw noise: ' + lmbChannel(c, this.channels));
            this.noiseA.push(lmbNoise(this.a.mainView.image, c, options.fallback));
            this.noiseB.push(lmbNoise(this.b.mainView.image, c, options.fallback));
         }
         let fitted = lmbCopy(this.b.mainView, 'LMB_fit', this.owned);
         let fit = new LinearFit;
         fit.referenceViewId = this.a.mainView.id;
         fit.rejectLow = options.low; fit.rejectHigh = options.high;
         lmbCheckAbort();
         if (!fit.executeOn(fitted.mainView, false)) throw new Error('LinearFit failed or was aborted.');
         for (let c = 0; c < this.channels; ++c) this.fits.push(lmbRecover(this.points[c], fitted.mainView.image, c));
         lmbClose(fitted); this.owned.pop();
         let normalization = this.fits.map(f => '(' + lmbNumber(f.offset) + ')+(' + lmbNumber(f.slope) + ')*$T');
         if (!lmbPixelMath(normalization).executeOn(this.b.mainView, false)) throw new Error('Unclipped normalization failed.');
         this.prepareDetail();
         this.prepareOutputRange();
      } catch (e) { this.dispose(); throw e; }
   }

   /** Close in reverse allocation order; a failed close must not skip others. */
   dispose() {
      for (let i = this.owned.length - 1; i >= 0; --i) {
         try { lmbClose(this.owned[i]); } catch (e) { console.warningln('Temporary window cleanup: ' + e); }
      }
      this.owned = [];
   }

   /** Store G(O-D), where D is the detail master and O the other normalized
    * image. Positive separable filtering preserves signed differences. This
    * saves one full-size image compared with storing G(D) and G(O) separately.
    */
   prepareDetail() {
      // G(other-detail) needs only one extra image and keeps signed differences.
      let detail = this.options.detail === 'A' ? this.a : this.b;
      let other = this.options.detail === 'A' ? this.b : this.a;
      this.lowDifference = lmbCopy(other.mainView, 'LMB_LowDifference', this.owned);
      if (!lmbPixelMath(['$T-' + detail.mainView.id]).executeOn(this.lowDifference.mainView, false))
         throw new Error('Detail difference calculation failed.');
      let kernel = lmbGaussian(this.options.scale), view = this.lowDifference.mainView;
      lmbCheckAbort();
      view.beginProcess(UndoFlag.NoSwapFile);
      try {
         view.image.resetSelections();
         view.image.convolveSeparable(kernel, kernel);
      } finally { view.endProcess(); }
      lmbCheckAbort();
   }

   /** Unbounded blend D + f*G(O-D), using channel-explicit snapshot identifiers. */
   blendExpression(c) {
      let sub = this.channels === 3 ? '[' + c + ']' : '';
      let detail = this.options.detail === 'A' ? this.a : this.b;
      return detail.mainView.id + sub + '+(' + lmbNumber(this.options.other) + ')*' + this.lowDifference.mainView.id + sub;
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

   /** Create a bounded Float32 result and measure its actual per-channel sigma.
    * A missing output-noise estimate is diagnostic, so a valid image survives.
    * Abort or image-creation failure closes only this newly created result.
    */
   combine(output, show, quiet = false) {
      let id = lmbUnique(output), result = null;
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
         if (!quiet) {
            console.writeln(this.report());
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

/** Session defaults: L supplies fine detail; the other image contributes 25%
 * at broad scales. These are adjustable starting choices, not fitted weights.
 */
function lmbDefaults() { return {a:'L', b:'RGB_registered_L', low:0, high:0.92, fallback:false, output:'Linear_Blend',
   detail:'A', scale:4, other:0.25, autoStretch:true}; }

/** Restore only user choices, never cached pixels or fitted coefficients.
 * Reject retired noise-only instances instead of silently changing their math.
 */
function lmbLoadOptions() {
   let o = lmbDefaults();
   if (Parameters.isGlobalTarget && (!Parameters.has('detail') ||
       (Parameters.has('mode') && Parameters.getString('mode') !== 'detail')))
      throw new Error('This saved instance uses the retired noise-only workflow. Open the script and create a new detail-blend instance.');
   for (let key of ['a', 'b', 'output', 'detail']) if (Parameters.has(key)) o[key] = Parameters.getString(key);
   for (let key of ['low', 'high', 'scale', 'other']) if (Parameters.has(key)) o[key] = Parameters.getReal(key);
   for (let key of ['fallback','autoStretch']) if (Parameters.has(key)) o[key] = Parameters.getBoolean(key);
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
      this.onPaint = () => {
         let g = new Graphics(this);
         try {
            let s = this.displayPixelRatio, pad = 65 * s, top = 28 * s;
            let right = this.width - 22 * s, bottom = this.height - 42 * s;
            g.fillRect(0, 0, this.width, this.height, new Brush(0xff18202b));
            g.font = this.font; g.pen = new Pen(0xffe6edf3);
            if (!this.analysis) { g.drawText(20 * s, 45 * s, 'Select images, then click the magnifier to calculate the fit and noise.'); return; }
            let data = this.analysis.points[this.channel], f = this.analysis.fits[this.channel];
            let xs = data.map(p => p.x).sort((a,b) => a-b), ys = data.map(p => p.y).sort((a,b) => a-b);
            // Central 99% zoom keeps a few saturated stars from hiding the fit.
            let loX = xs[Math.floor(xs.length * 0.005)], hiX = xs[Math.min(xs.length - 1, Math.floor(xs.length * 0.995))];
            let loY = ys[Math.floor(ys.length * 0.005)], hiY = ys[Math.min(ys.length - 1, Math.floor(ys.length * 0.995))];
            let dx = Math.max(hiX - loX, 1e-9), dy = Math.max(hiY - loY, 1e-9);
            loX -= 0.05 * dx; hiX += 0.05 * dx; loY -= 0.05 * dy; hiY += 0.05 * dy;
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
            let low = this.analysis.options.low, high = this.analysis.options.high;
            for (let p of data) {
               if (p.x < loX || p.x > hiX || p.y < loY || p.y > hiY) continue;
               let accepted = p.x > low && p.x < high && p.y > low && p.y < high;
               g.pen = new Pen(accepted ? 0xff55b4dc : 0xff737c87);
               g.drawPoint(X(p.x), Y(p.y));
            }
            let first = Math.max(loX, (loY - f.offset) / f.slope), last = Math.min(hiX, (hiY - f.offset) / f.slope);
            if (last > first) { g.pen = new Pen(0xffffd166, 2 * s); g.drawLine(X(first), Y(f.offset + f.slope * first), X(last), Y(f.offset + f.slope * last)); }
            g.pen = new Pen(0xffe6edf3);
            g.drawText(pad, 18 * s, 'A reference (y) vs original B (x) | yellow: native fit | blue: within rejection limits');
            g.drawText(pad, this.height - 8 * s, 'Original B intensity; central 99% display range. Full image used for LinearFit and noise.');
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

/** View selection, blend controls, output image, original scatter chart, and noise table.
 * Any processing-setting change invalidates the owned preview. Channel changes
 * only change the displayed plot/table and do not rerun the image calculations.
 */
class LMBDialog extends Dialog {
   constructor(options) {
      super(); this.windowTitle = 'Linear Master Blend ' + LMB_VERSION;
      this.analysis = null; this.running = false;
      // Retain output plus one lazy source bitmap. ImageView owns its own copy.
      this.outputBitmap = null; this.sourceBitmap = null; this.previewStretch = null;
      this.showingSource = false; this.blinking = false;
      this.blinkTimer = new Timer(0.75, false, this);
      this.blinkTimer.onTimeout = () => this.blinkTick();
      this.intro = new Label(this); this.intro.wordWrapping = true;
      this.intro.text = 'For different telescopes, keep fine structure from the sharper master and control the other image at broad scales. '
         + 'A defines the normalization scale. Lower pixel noise does not necessarily mean greater depth. Crop registration borders first.';
      this.aList = new ViewList(this); this.aList.getMainViews();
      this.bList = new ViewList(this); this.bList.getMainViews();
      if (options.a && lmbHasView(View.viewById(options.a))) this.aList.currentView = View.viewById(options.a);
      if (options.b && lmbHasView(View.viewById(options.b))) this.bList.currentView = View.viewById(options.b);
      this.low = new NumericEdit(this); this.low.label.text = 'Reject low:';
      this.low.setRange(0, 1); this.low.setPrecision(6); this.low.setValue(options.low);
      this.high = new NumericEdit(this); this.high.label.text = 'Reject high:';
      this.high.setRange(0, 1); this.high.setPrecision(6); this.high.setValue(options.high);
      this.low.toolTip = this.high.toolTip = 'Native LinearFit input rejection limits. Only pairs strictly between the limits are used. Noise is measured on the original source snapshots and actual output.';
      this.fallback = new CheckBox(this); this.fallback.text = 'Allow k-sigma fallback if MRS fails'; this.fallback.checked = options.fallback;
      this.detail = new ComboBox(this); this.detail.addItem('A supplies fine detail'); this.detail.addItem('B supplies fine detail');
      this.detail.currentItem = options.detail === 'B' ? 1 : 0;
      this.scale = new NumericEdit(this); this.scale.label.text = 'Gaussian sigma (px):';
      this.scale.setRange(1,32); this.scale.setPrecision(2); this.scale.setValue(options.scale);
      this.scale.toolTip = 'Aligned-image pixels. Larger sigma confines the other image to broader structures. 4 is a starting point, not a measured PSF. Inspect stars/halos and increase if necessary.';
      this.other = new NumericEdit(this); this.other.label.text = 'Other image at broad scales (%):';
      this.other.setRange(0,100); this.other.setPrecision(1); this.other.setValue(100*options.other);
      this.other.toolTip = '0 keeps the detail image alone; 25 retains 75% of its broad-scale component. Increase only if the other image adds useful faint signal. Noise does not set this value.';
      this.output = new Edit(this); this.output.text = options.output;
      this.channel = new ComboBox(this); for (let name of ['R', 'G', 'B']) this.channel.addItem(name);
      this.channel.visible = false;
      this.tabs = new TabBox(this);
      this.outputPage = new Control(this.tabs); this.fitPage = new Control(this.tabs);
      this.previewViewer = new ImageView(this.outputPage);
      this.previewViewer.setScaledMinSize(700, 370);
      this.previewViewer.setStatusMessage('Click the magnifier to preview the combined image.');
      this.autoStretch = new CheckBox(this.outputPage); this.autoStretch.text = 'Auto stretch preview (display only)';
      this.autoStretch.checked = options.autoStretch !== false;
      this.autoStretch.toolTip = 'One output-derived display stretch for output and source. Original images and the linear output remain unchanged. Turning this off shows their common linear display scale.';
      this.blinkSource = new ComboBox(this.outputPage);
      this.blinkSource.addItem('A reference'); this.blinkSource.addItem('B normalized');
      this.blinkSource.setScaledFixedWidth(190);
      this.blinkSource.toolTip = 'Blink the output against source A or the LinearFit-normalized source B. Both use the output range map and the same display stretch. Source values outside the display range are clipped only for display.';
      this.blinkButton = lmbTool(this.outputPage, ':/icons/play.png', 'Start blinking output/source every 0.75 seconds. Stop returns to output.', () => this.blinkAction(true));
      this.stepButton = lmbTool(this.outputPage, ':/icons/step-forward.png', 'Switch once between output and the selected source; pause automatic blinking.', () => this.blinkAction(false));
      let previewControls = new HorizontalSizer; previewControls.spacing = 6;
      let blinkLabel = new Label(this.outputPage); blinkLabel.text = 'Blink with:';
      previewControls.add(this.autoStretch); previewControls.addStretch(); previewControls.add(blinkLabel);
      previewControls.add(this.blinkSource); previewControls.add(this.blinkButton); previewControls.add(this.stepButton);
      this.outputPage.sizer = new VerticalSizer; this.outputPage.sizer.margin = 6; this.outputPage.sizer.spacing = 6;
      this.outputPage.sizer.add(this.previewViewer, 100); this.outputPage.sizer.add(previewControls);
      this.plot = new LMBPlot(this.fitPage);
      this.noiseTitle = new Label(this.fitPage); this.noiseTitle.text = 'Noise sigma';
      let noiseTable = new VerticalSizer; noiseTable.spacing = 3;
      noiseTable.add(this.noiseTitle);
      this.noiseCells = [];
      for (let texts of [['Image','Sigma: image units','Sigma: A units'],['Source A','-','-'],['Source B','-','-'],['Output','After Preview','After Preview']]) {
         let cells = [], row = new HorizontalSizer; row.spacing = 12;
         for (let text of texts) {
            let label = new Label(this.fitPage); label.text = text; label.setScaledMinWidth(210);
            row.add(label, 100); cells.push(label);
         }
         this.noiseCells.push(cells); noiseTable.add(row);
      }
      this.fitPage.sizer = new VerticalSizer; this.fitPage.sizer.margin = 6; this.fitPage.sizer.spacing = 6;
      this.fitPage.sizer.add(this.plot,100); this.fitPage.sizer.add(noiseTable);
      this.tabs.addPage(this.outputPage, 'Output preview'); this.tabs.addPage(this.fitPage, 'Fit and noise');
      this.noiseTitle.toolTip = 'Measured Gaussian noise sigma for the selected channel. Image units are the original source or stored output scale. A units multiply B sigma by the fit slope and divide output sigma by the output gain. These scale conversions do not imply an SNR improvement.';
      this.status = new Label(this); this.status.wordWrapping = true;
      this.status.text = 'Magnifier: calculate preview. Green checkmark: create a new image.';
      let row = (label, control) => {
         let s = new HorizontalSizer; s.spacing = 8;
         let l = new Label(this); l.text = label; l.setScaledMinWidth(105); s.add(l); s.add(control, 100); return s;
      };
      let limits = new HorizontalSizer; limits.spacing = 12; limits.add(this.low); limits.add(this.high); limits.addStretch(); limits.add(this.channel);
      let detailControls = new HorizontalSizer; detailControls.spacing = 12;
      detailControls.add(this.detail); detailControls.add(this.scale); detailControls.add(this.other);
      this.newInstanceButton = lmbTool(this, ':/process-interface/new-instance.png', 'New instance: drag to the workspace to save image IDs and settings.');
      this.newInstanceButton.onMousePress = () => {
         let o = this.options(); Parameters.clear(); for (let key of Object.keys(o)) Parameters.set(key, o[key]); this.newInstance();
      };
      this.previewButton = lmbTool(this, ':/toolbar/view-zoom.png', 'Preview: calculate the full combined image, noise measurements and fit scatter without changing either source.', () => this.action(false));
      this.resetButton = lmbTool(this, ':/process-interface/reset.png', 'Reset settings and release the preview snapshots.', () => {
         this.invalidate(); this.low.setValue(0); this.high.setValue(0.92); this.fallback.checked = false; this.output.text = 'Linear_Blend';
         this.detail.currentItem = 0; this.scale.setValue(4); this.other.setValue(25); this.autoStretch.checked = true;
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
      this.sizer.add(this.intro); this.sizer.add(row('A reference:', this.aList)); this.sizer.add(row('B to normalize:', this.bList));
      this.sizer.add(detailControls);
      this.sizer.add(limits); this.sizer.add(this.fallback); this.sizer.add(row('Output ID:', this.output));
      this.sizer.add(this.tabs, 100); this.sizer.add(this.status); this.sizer.add(buttons);
      this.aList.onViewSelected = this.bList.onViewSelected = () => this.invalidate();
      this.low.onValueUpdated = this.high.onValueUpdated = this.fallback.onCheck = () => this.invalidate();
      this.detail.onItemSelected = this.scale.onValueUpdated = this.other.onValueUpdated = () => this.invalidate();
      this.channel.onItemSelected = index => { this.plot.channel = this.analysis && this.analysis.channels === 3 ? index : 0; this.plot.update(); this.updateNoise(); };
      this.autoStretch.onCheck = () => { if (this.analysis) this.action(false, true); };
      this.blinkSource.onItemSelected = () => {
         this.stopBlink(true);
         if (this.sourceBitmap) this.sourceBitmap.clear(); this.sourceBitmap = null;
      };
      this.tabs.onPageSelected = index => { if (index !== 0) this.stopBlink(true); };
      this.onClose = () => { if (this.running) return false; this.stopBlink(false); return true; };
      this.updateBlinkControls();
      this.adjustToContents();
   }

   /** Read live controls when previewing, creating, or saving an instance. */
   options() {
      return {a:lmbHasView(this.aList.currentView) ? this.aList.currentView.id : '',
         b:lmbHasView(this.bList.currentView) ? this.bList.currentView.id : '',
         low:this.low.value, high:this.high.value, fallback:this.fallback.checked, output:this.output.text.trim(),
         detail:this.detail.currentItem === 0 ? 'A' : 'B',
         scale:this.scale.value, other:this.other.value/100, autoStretch:this.autoStretch.checked};
   }

   /** Display measured sigma and its reference-scale conversion. B uses slope;
    * output uses inverse gain. Additive offsets do not change noise sigma.
    * Missing output values remain pending until Preview or Create completes.
    */
   updateNoise() {
      let a = this.analysis, c = a && a.channels === 3 ? this.channel.currentItem : 0;
      this.noiseTitle.text = 'Noise sigma' + (a ? ' - ' + lmbChannel(c, a.channels) : '');
      let values = a ? [a.noiseA[c], a.noiseB[c], a.noiseOutput ? a.noiseOutput[c] : null] : [null,null,null];
      let names = a ? [a.sourceA, a.sourceB, 'Output'] : ['Source A','Source B','Output'];
      let factors = a ? [1, a.fits[c].slope, 1/a.outputMap.gain] : [1,1,1];
      for (let i = 0; i < 3; ++i) {
         let cells = this.noiseCells[i+1], n = values[i];
         cells[0].text = names[i];
         let empty = i === 2 ? 'After Preview' : '-';
         cells[1].text = n ? (n.error ? 'Unavailable' : n.sigma.toExponential(4) + ' (' + n.method + ')') : empty;
         cells[2].text = n && !n.error ? (n.sigma*factors[i]).toExponential(4) : (n ? 'Unavailable' : empty);
         let tip = n ? (n.error || ('Support: ' + n.count + ' pixels' + (n.layers ? '; MRS layers: ' + n.layers : ''))) : '';
         cells[1].toolTip = cells[2].toolTip = tip;
      }
   }

   /** Stop callbacks before releasing cached frames. A new analysis or display
    * stretch must never blink with a frame derived from the previous settings.
    */
   releasePreview() {
      this.stopBlink(false);
      this.previewViewer.clear();
      if (this.outputBitmap) this.outputBitmap.clear(); this.outputBitmap = null;
      if (this.sourceBitmap) this.sourceBitmap.clear(); this.sourceBitmap = null;
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

   /** regenerate(bitmap) preserves ImageView zoom and scroll position. setImage
    * resets them and therefore must only be used for a newly computed preview.
    */
   setPreviewFrame(source) {
      let bitmap = source ? this.sourceBitmap : this.outputBitmap;
      if (!bitmap) return;
      if (source !== this.showingSource) this.previewViewer.regenerate(bitmap);
      this.showingSource = source;
      let label = 'Output';
      if (source) label = this.blinkSource.currentItem === 0 ? 'Source A: ' + this.analysis.sourceA : 'Source B: ' + this.analysis.sourceB + ' (normalized)';
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
         if (!this.sourceBitmap) {
            let source = this.blinkSource.currentItem === 0 ? this.analysis.a : this.analysis.b;
            this.sourceBitmap = lmbOutputBitmap(source.mainView, this.autoStretch.checked, this.analysis.outputMap, this.previewStretch);
         }
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
      for (let c of [this.aList,this.bList,this.low,this.high,this.fallback,this.output,this.channel,
         this.detail,this.scale,this.other,this.autoStretch,this.tabs,
         this.newInstanceButton,this.previewButton,this.resetButton,this.helpButton,this.createButton,this.closeButton])
         c.enabled = !busy;
      this.updateBlinkControls();
   }

   /** Release snapshots before clearing UI pointers; stale values must vanish. */
   invalidate() {
      this.releasePreview();
      this.previewViewer.setStatusMessage('Preview is out of date. Click the magnifier.');
      if (this.analysis) this.analysis.dispose(); this.analysis = null;
      this.plot.analysis = null; this.channel.visible = false; this.plot.update(); this.updateNoise();
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
         if (!o.a || !o.b) throw new Error('Select both reference A and target B.');
         if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(o.output)) throw new Error('Invalid output identifier.');
         if ((!create && !displayOnly) || !this.analysis) {
            this.invalidate(); this.status.text = 'Normalizing copies and measuring full-resolution noise...';
            this.analysis = new LMBAnalysis(View.viewById(o.a), View.viewById(o.b), o);
            this.plot.analysis = this.analysis; this.plot.channel = this.analysis.channels === 3 ? this.channel.currentItem : 0;
            this.channel.visible = this.analysis.channels === 3; this.plot.update(); this.updateNoise();

         }
         if (create) {
            created = this.analysis.combine(o.output);
            this.updateNoise();
            this.showOutputPreview(created.mainView);
            this.status.text = 'Created ' + created.mainView.id + '. The preview stretch is display-only; save the linear output as XISF.';
         } else {
            let temporary = null;
            this.status.text = 'Rendering the full-resolution combined output...';
            try {
               temporary = this.analysis.combine('LMB_preview', false, true);
               this.updateNoise(); this.showOutputPreview(temporary.mainView);
               this.status.text = 'Output preview ready. Zoom or drag to inspect it; Fit and noise shows diagnostics. Create opens the linear result.';
            } finally { lmbClose(temporary); }
         }
      } catch (e) {
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
