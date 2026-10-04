#engine v8
#ifndef ROILF_LIBRARY
#feature-id ROILinearFit : TG Scripts > ROI Linear Fit
#feature-info Fit a full grayscale or RGB image to a reference using a rectangular region.
#endif

/* ROI Linear Fit 1.1.6 — PixInsight 1.9.5+ (V8)
 * Source = reference; target = image modified in place, with normal Undo.
 * Images must be registered and have the same dimensions and color type.
 * Only script-owned, hidden ROI windows are created; all are closed in finally.
 * Existing user previews are used only for their coordinates and are preserved.
 *
 * LinearFit has no coefficient output parameters. We run the actual process on
 * 64-bit ROI copies, then recover its affine map from the original and fitted
 * target samples. Excluding clipped samples is essential. This second calculation
 * measures the transformation already applied; it does NOT refit reference data.
 * No console parsing, rounded coefficients, temporary files, or log interception.
 */

const ROILF_VERSION = '1.1.6';
const ROILF_SCRIPT_FILE = #__FILE__;

/** Support both the portable bundle and PixInsight's installed doc tree.
 * Resolve by the PIDoc identifier, independently of the spaced menu label.
 * Optional arguments let the path resolver be tested without changing settings.
 */
function roiFitDocumentationPath(scriptFile = ROILF_SCRIPT_FILE,
                                 docDirectory = CoreApplication.docDirPath) {
   let relativePath = '/scripts/ROILinearFit/ROILinearFit.html';
   let portable = File.extractDrive(scriptFile) + File.extractDirectory(scriptFile) +
      '/doc' + relativePath;
   if (File.exists(portable)) return portable;
   let installed = docDirectory.replace(/[\\/]+$/, '') + relativePath;
   return File.exists(installed) ? installed : '';
}

/** Open a verified local page in PixInsight's native documentation browser.
 * browseScriptDocumentation can show an unavailable page even when it returns
 * true: menu registration and the PIDoc directory name need not agree.
 */
function roiFitShowDocumentation() {
   let path = roiFitDocumentationPath();
   if (path) Dialog.openBrowser(path, 'ROI Linear Fit — TG Scripts');
   else
      new MessageBox('Documentation was not found. Keep the supplied doc folder beside ' +
         'ROILinearFit.js, or install its ROILinearFit documentation folder under ' +
         CoreApplication.docDirPath + '/scripts/.',
         'ROI Linear Fit', StdIcon.Warning, StdButton.Ok).execute();
}

/** Versioned process-instance schema. Only user choices are persisted, never
 * native views, preview objects, fitted coefficients, caches or pixel arrays.
 * The saved rectangle is authoritative even after its originating preview closes.
 */
const ROILF_PARAMETER_TYPES = {
   sourceId:'string', targetId:'string', x:'integer', y:'integer', width:'integer', height:'integer',
   low:'real', high:'real', clip:'boolean', showPlot:'boolean', maxPoints:'integer', plotChannel:'integer'
};

class ROILinearFitOptions {
   constructor() {
      this.sourceId = ''; this.targetId = '';
      this.x = 0; this.y = 0; this.width = 256; this.height = 256;
      this.low = 0; this.high = 0.92; this.clip = true;
      this.showPlot = true; this.maxPoints = 12000; this.plotChannel = 0;
   }
   /** Validate stored values without requiring the named images to be open. */
   validate() {
      for (let key of ['x','y','width','height','maxPoints','plotChannel'])
         if (!Number.isInteger(this[key])) throw new Error(key + ' must be a whole number.');
      if (this.x < 0 || this.y < 0 || this.width < 1 || this.height < 1 ||
          this.x + this.width > 2147483647 || this.y + this.height > 2147483647)
         throw new Error('Invalid ROI coordinates or dimensions.');
      if (!Number.isFinite(this.low) || !Number.isFinite(this.high) || this.low < 0 || this.high > 1 || this.low >= this.high)
         throw new Error('Rejection limits must satisfy 0 <= low < high <= 1.');
      if (this.maxPoints < 100 || this.maxPoints > 100000)
         throw new Error('Plot sample limit must be between 100 and 100000.');
      if (this.plotChannel < 0 || this.plotChannel > 2) throw new Error('Invalid plot channel.');
   }
   rectangle() { return new Rect(this.x, this.y, this.x + this.width, this.y + this.height); }
   exportParameters() {
      this.validate(); Parameters.clear(); Parameters.set('roiFitSchemaVersion', 1);
      for (let key in ROILF_PARAMETER_TYPES) Parameters.set(key, this[key]);
   }
   importParameters() {
      if (Parameters.has('roiFitSchemaVersion') && Parameters.getInteger('roiFitSchemaVersion') > 1)
         throw new Error('This instance requires a newer ROI Linear Fit script.');
      for (let key in ROILF_PARAMETER_TYPES) if (Parameters.has(key)) {
         let type = ROILF_PARAMETER_TYPES[key];
         this[key] = type === 'string' ? Parameters.getString(key) :
            type === 'boolean' ? Parameters.getBoolean(key) :
            type === 'integer' ? Parameters.getInteger(key) : Parameters.getReal(key);
      }
      this.validate();
   }
}

/** Resolve saved IDs strictly. A view-target invocation replaces only targetId.
 * Refuse missing references and preview drops rather than silently fitting another image.
 */
function roiFitResolve(options, viewTarget) {
   let source = View.viewById(options.sourceId);
   let target = roiFitHasView(viewTarget) ? viewTarget : View.viewById(options.targetId);
   if (!roiFitHasView(source)) throw new Error('Saved source is not open: ' + options.sourceId);
   if (!roiFitHasView(target)) throw new Error('Saved target is not open: ' + options.targetId);
   roiFitValidate(source, target, options.rectangle(), options.low, options.high, options.clip);
   return { source:source, target:target };
}

/** Accept both JavaScript null and PixInsight's null View handles. */
function roiFitHasView(v) { return v != null && !v.isNull; }

/** Generate a temporary ID without colliding with user-owned images. */
function roiFitUniqueId(base) {
   let id = base, n = 1;
   while (roiFitHasView(View.viewById(id))) id = base + '_' + n++;
   return id;
}

function roiFitCheckAbort() {
   if (console.abortRequested) throw new Error('ROI Linear Fit aborted.');
}

/** Check image geometry, sample types and ROI bounds before allocating or modifying. */
function roiFitValidate(source, target, rect, low, high, clip) {
   if (!roiFitHasView(source) || !roiFitHasView(target))
      throw new Error('Select both a source (reference) and a target image.');
   if (!source.isMainView || !target.isMainView)
      throw new Error('Source and target must be main images, not previews.');
   if (source.id === target.id) throw new Error('Source and target must be different images.');
   let s = source.image, t = target.image;
   if (s.width !== t.width || s.height !== t.height)
      throw new Error('Source and target must have matching dimensions and be registered.');
   if (s.isComplex || t.isComplex) throw new Error('Complex images are not supported.');
   if (s.isColor !== t.isColor || s.numberOfNominalChannels !== t.numberOfNominalChannels)
      throw new Error('Use two grayscale images or two RGB images. Mixed color types are not supported.');
   if (t.numberOfNominalChannels !== 1 && t.numberOfNominalChannels !== 3)
      throw new Error('Only grayscale and RGB images are supported.');
   for (let v of [rect.x0, rect.y0, rect.x1, rect.y1])
      if (!Number.isFinite(v) || Math.floor(v) !== v)
         throw new Error('ROI coordinates must be whole pixel numbers.');
   if (rect.x0 < 0 || rect.y0 < 0 || rect.x1 > t.width || rect.y1 > t.height ||
       rect.width < 1 || rect.height < 1 || rect.width * rect.height < 32)
      throw new Error('The ROI must lie inside both images and contain at least 32 pixels.');
   if (!Number.isFinite(low) || !Number.isFinite(high) || low < 0 || high > 1 || low >= high)
      throw new Error('Rejection limits must satisfy 0 <= low < high <= 1.');
   if (!clip && !t.isReal)
      throw new Error('Keeping values outside [0,1] requires a floating-point target image.');
}

/** Create a hidden 64-bit nominal-channel ROI, immediately registering ownership.
 * @param {Array} owned Windows to close in the caller's finally block.
 */
function roiFitCrop(view, rect, label, owned) {
   let w = new ImageWindow(rect.width, rect.height, view.image.numberOfNominalChannels,
                           64, true, view.image.isColor, roiFitUniqueId(label));
   owned.push(w); // Register ownership before any operation that can throw.
   w.mainView.beginProcess(UndoFlag.NoSwapFile);
   try {
      w.mainView.image.assign(view.image, rect, 0, view.image.numberOfNominalChannels - 1);
   } finally { w.mainView.endProcess(); }
   return w;
}

/** Recover the affine map from original -> native-fitted target, using stable
 * Welford covariance. No reference-vs-target regression is substituted here.
 * @returns {{offset:Number,slope:Number,samples:Number,error:Number}} Verified map.
 */
function roiFitRecover(original, fitted, rect, channel) {
   const width = rect.width;
   let xs = new Float64Array(width), ys = new Float64Array(width);
   let n = 0, mx = 0, my = 0, xx = 0, xy = 0;
   let xmin = Infinity, xmax = -Infinity;
   // Stable online covariance; bounded working memory even for a large ROI.
   for (let row = 0; row < rect.height; ++row) {
      roiFitCheckAbort();
      original.getSamples(xs, new Rect(rect.x0, rect.y0 + row, rect.x1, rect.y0 + row + 1), channel);
      fitted.getSamples(ys, new Rect(0, row, width, row + 1), channel);
      for (let i = 0; i < width; ++i) {
         let x = xs[i], y = ys[i];
         if (!Number.isFinite(x) || !Number.isFinite(y))
            throw new Error('Non-finite pixel values in the ROI.');
         // Native LinearFit clips its output to [0,1]. Those samples cannot
         // encode the original affine map and must not enter this calculation.
         if (y <= 1e-12 || y >= 1 - 1e-12) continue;
         ++n;
         let dx = x - mx; mx += dx / n;
         let dy = y - my; my += dy / n;
         xx += dx * (x - mx); xy += dx * (y - my);
         xmin = Math.min(xmin, x); xmax = Math.max(xmax, x);
      }
   }
   if (n < 32 || !(xx > 0) || xmax - xmin <= 1e-12 * Math.max(1, Math.abs(xmin), Math.abs(xmax)))
      throw new Error('Channel ' + channel + ': insufficient unclipped variation in the fitted ROI. Choose a larger or more varied region.');
   let slope = xy / xx, offset = my - slope * mx;
   if (!Number.isFinite(slope) || !Number.isFinite(offset) || slope <= 0)
      throw new Error('Channel ' + channel + ': invalid or non-positive fit. Check image alignment and ROI.');
   // Verify the recovered map against every output sample, including clipping.
   // This also detects unexpected behavior in a future LinearFit implementation.
   let maxError = 0;
   for (let row = 0; row < rect.height; ++row) {
      roiFitCheckAbort();
      original.getSamples(xs, new Rect(rect.x0, rect.y0 + row, rect.x1, rect.y0 + row + 1), channel);
      fitted.getSamples(ys, new Rect(0, row, width, row + 1), channel);
      for (let i = 0; i < width; ++i)
         maxError = Math.max(maxError, Math.abs(Math.max(0, Math.min(1, offset + slope * xs[i])) - ys[i]));
   }
   if (maxError > 2e-7)
      throw new Error('Channel ' + channel + ': the fitted ROI is not a consistent affine transformation (error ' + maxError + '). Target unchanged.');
   return { offset: offset, slope: slope, samples: n, error: maxError };
}

/** Round-trip double precision when passing coefficients to PixelMath. */
function roiFitExpression(fit) {
   return '(' + fit.offset.toPrecision(17) + ')+(' + fit.slope.toPrecision(17) + ')*$T';
}

/** Measure the ROI and optionally apply it to the full target.
 * @param {Object} execution Optional {apply, capturePlot, maxPoints}; old callers
 * retain apply=true and capturePlot=false. apply=false is a read-only preview.
 * @returns {Array} Per-channel coefficients with optional .plotData snapshot.
 * All owned ROI windows are closed on success, failure and normal abort.
 */
function runROILinearFit(source, target, rect, low, high, clip, execution) {
   execution = execution || {};
   roiFitValidate(source, target, rect, low, high, clip);
   let owned = [], fits = [];
   let oldAbort = console.abortEnabled;
   console.abortEnabled = true;
   try {
      console.writeln('\n<b>ROI Linear Fit</b>: ' + target.id + ' -> ' + source.id);
      console.writeln('ROI: x=' + rect.x0 + ', y=' + rect.y0 + ', width=' + rect.width + ', height=' + rect.height);
      let reference = roiFitCrop(source, rect, 'ROILF_reference', owned);
      let working = roiFitCrop(target, rect, 'ROILF_target', owned);
      let nativeFit = new LinearFit;
      nativeFit.referenceViewId = reference.mainView.id;
      nativeFit.rejectLow = low;
      nativeFit.rejectHigh = high;
      if (!nativeFit.executeOn(working.mainView, false)) throw new Error('LinearFit failed or was aborted.');
      for (let c = 0; c < target.image.numberOfNominalChannels; ++c) {
         let f = roiFitRecover(target.image, working.mainView.image, rect, c);
         fits.push(f);
         console.writeln('Channel ' + (target.image.isColor ? ['R','G','B'][c] : 'Gray') +
                         ': output = ' + roiFitExpression(f) + '  (' + f.samples + ' unclipped samples)');
      }
      if (execution.capturePlot)
         fits.plotData = roiFitSampleScatter(source, target, rect, low, high, execution.maxPoints || 12000, fits);
      roiFitCheckAbort();
      if (execution.apply === false) {
         console.writeln('Fit preview ready. Source and target are unchanged.');
         return fits;
      }
      let p = new PixelMath;
      p.useSingleExpression = fits.length === 1;
      p.expression = roiFitExpression(fits[0]);
      if (fits.length === 3) {
         p.expression1 = roiFitExpression(fits[1]);
         p.expression2 = roiFitExpression(fits[2]);
      }
      p.expression3 = target.image.numberOfChannels > fits.length ? '$T[' + fits.length + ']' : '';
      p.symbols = '';
      p.generateOutput = true;
      p.singleThreaded = false;
      p.use64BitWorkingImage = true;
      p.rescale = false;
      p.truncate = clip;
      p.truncateLower = 0;
      p.truncateUpper = 1;
      p.createNewImage = false;
      // Apply to the entire target, irrespective of any attached mask.
      let maskEnabled = target.window.maskEnabled;
      try {
         target.window.maskEnabled = false;
         if (!p.executeOn(target)) throw new Error('Applying the fit failed or was aborted.');
      } finally { target.window.maskEnabled = maskEnabled; }
      console.writeln('<b>Done.</b> The full target was updated. Use Undo to revert.');
      return fits;
   } finally {
      for (let i = owned.length - 1; i >= 0; --i) {
         try { if (!owned[i].isNull) owned[i].forceClose(); }
         catch (e) { console.warningln('Could not close temporary image: ' + e); }
      }
      console.abortEnabled = oldAbort;
   }
}

/** Deterministic stratified display sample: one pseudorandom pixel per equal
 * interval of the flattened ROI. This avoids regular-stride aliasing and keeps
 * memory bounded. The real LinearFit above always uses the full ROI.
 * x = ORIGINAL target; y = source/reference. Capture before target mutation.
 * Rejection colors describe the native open (low, high) sampling interval.
 */
function roiFitSampleScatter(source, target, rect, low, high, maximum, fits) {
   let total = rect.width * rect.height, count = Math.min(total, maximum);
   let indices = [], seed = 0x72a19b3;
   for (let i = 0; i < count; ++i) {
      seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0;
      let first = Math.floor(i * total / count), end = Math.floor((i + 1) * total / count);
      indices.push(first + Math.floor((end - first) * seed / 4294967296));
   }
   let channels = [];
   for (let c = 0; c < fits.length; ++c) {
      let d = { x:[], y:[], rejectedX:[], rejectedY:[], xmin:Infinity, xmax:-Infinity,
         name:fits.length === 1 ? 'Gray' : ['R','G','B'][c], fit:fits[c] };
      for (let j = 0; j < indices.length; ++j) {
         if ((j & 1023) === 0) roiFitCheckAbort();
         let i = indices[j], px = rect.x0 + i % rect.width, py = rect.y0 + Math.floor(i / rect.width);
         let x = target.image.sample(px, py, c), y = source.image.sample(px, py, c);
         if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error('Non-finite scatter-plot sample.');
         let accepted = x > low && x < high && y > low && y < high;
         (accepted ? d.x : d.rejectedX).push(x); (accepted ? d.y : d.rejectedY).push(y);
         d.xmin = Math.min(d.xmin, x); d.xmax = Math.max(d.xmax, x);
      }
      channels.push(d);
   }
   return { sourceId:source.id, targetId:target.id, rect:[rect.x0,rect.y0,rect.width,rect.height],
      total:total, shown:count, low:low, high:high, channels:channels };
}

/** Consistent symbol-only native toolbar controls, with named tooltips. */
function roiFitTool(parent, resource, tip, action) {
   let b = new ToolButton(parent);
   b.icon = parent.scaledResource(resource); b.setScaledFixedSize(24,24); b.toolTip = tip;
   if (action) b.onClick = action;
   return b;
}

/** Native interactive scatter chart. Only numeric snapshots survive ROI cleanup.
 * The straight line is y=offset+slope*x before optional final output clipping.
 * Exports contain plotted samples and display-rounded coefficients in their title.
 */
class ROILinearFitPlotDialog extends Dialog {
   constructor(data, options) {
      super(); this.windowTitle = 'ROI Linear Fit — scatter plot';
      this.sizer = new VerticalSizer; this.sizer.margin = 10; this.sizer.spacing = 8;
      // Grayscale has no channel choice; create a selector only for color plots.
      this.channel = null;
      if (data.channels.length > 1) {
         this.channel = new ComboBox(this);
         for (let d of data.channels) this.channel.addItem(d.name);
         this.channel.currentItem = Math.min(options.plotChannel, data.channels.length - 1);
         this.channel.toolTip = 'Select the RGB channel to inspect.';
         this.sizer.add(this.channel);
      }
      let channelIndex = () => this.channel ? this.channel.currentItem : 0;
      this.renderer = new PlotRenderer(this); this.renderer.setMinSize(780,480);
      this.manager = new PlotManager(this.renderer);
      this.renderer.backgroundColor = 0xff202020; this.manager.backgroundColor = 0xff202020;
      this.sizer.add(this.renderer,100);
      let info = new Label(this); info.wordWrapping = true;
      info.text = 'Original target (x) vs source/reference (y), before applying the fit. ' +
         data.shown + ' / ' + data.total + ' ROI pixel pairs shown per channel. ' +
         'Gray points fall outside the rejection limits. The line uses the full-ROI native fit; it is not clipped.';
      this.sizer.add(info);
      this.updatePlot = () => {
         let index = channelIndex(), d = data.channels[index], f = d.fit;
         options.plotChannel = index;
         this.manager.clear();
         let plot = this.manager.addPlot(1,1,0);
         plot.title = (data.channels.length === 1 ? '' : d.name + ': ') +
            'y = ' + f.offset.toPrecision(8) + ' + ' + f.slope.toPrecision(8) + ' x';
         plot.titleFontSize = 13;
         const colors = data.channels.length === 1 ? [0xff53bde8] : [0xfff08080,0xff7edb9a,0xff82b9ff];
         let scatter = (x,y,color,label) => {
            if (!x.length) return;
            let s = plot.addScatterSeries(x,y); s.label = label;
            s.shape = PlotMarkerShape.Circle; s.size = 3; s.fillColor = color; s.edgeColor = color; s.edgeWidth = 0;
         };
         scatter(d.rejectedX,d.rejectedY,0xff888888,'Outside rejection limits');
         scatter(d.x,d.y,colors[index],'Within rejection limits');
         let xmin = d.xmin, xmax = d.xmax;
         if (!(xmax > xmin)) { xmin -= 1e-6; xmax += 1e-6; }
         let line = plot.addLineSeries([xmin,xmax],[f.offset+f.slope*xmin,f.offset+f.slope*xmax]);
         line.label = 'Native LinearFit'; line.lineColor = 0xffffd166; line.lineWidth = 2;
         // Native axes are created lazily when the first series is added.
         plot.xAxis.name = 'Original target: ' + data.targetId;
         plot.yAxis.name = 'Source / reference: ' + data.sourceId;
         plot.xAxis.gridVisible = true; plot.yAxis.gridVisible = true;
         plot.legendEnabled = true; plot.legendPosition = PlotLegendPosition.TopLeft;
         this.manager.refresh();
      };
      if (this.channel) this.channel.onItemSelected = () => this.updatePlot();
      this.updatePlot();
      let row = new HorizontalSizer; row.spacing = 8;
      this.saveButton = roiFitTool(this,':/icons/save-as.png','Save the displayed channel plot as PNG or SVG.',() => {
         try {
            let save = new SaveFileDialog;
            save.caption = 'Save ROI Linear Fit scatter plot';
            save.filters = [['PNG image','*.png'],['SVG vector image','*.svg']];
            save.initialPath = data.targetId + '_ROI_fit_' + data.channels[channelIndex()].name + '.png';
            if (!save.execute()) return;
            let extension = File.extractExtension(save.fileName).toLowerCase();
            if (extension === '.svg') this.manager.saveAsSVG(save.fileName,1200,760);
            else if (extension === '.png') this.manager.saveAsPNG(save.fileName,1200,760);
            else throw new Error('Choose a .png or .svg filename.');
         } catch(e) { new MessageBox(String(e),this.windowTitle,StdIcon.Error,StdButton.Ok).execute(); }
      });
      row.add(this.saveButton); row.addStretch();
      row.add(roiFitTool(this,':/process-interface/cancel.png','Close the scatter plot.',() => this.cancel()));
      row.add(roiFitTool(this,':/process-interface/browse-documentation.png','Open the user manual.',roiFitShowDocumentation));
      this.sizer.add(row); this.adjustToContents();
   }
}

class ROILinearFitDialog extends Dialog {
   constructor(options) {
      super();
      this.options = options || new ROILinearFitOptions;
      options = this.options;
      this.windowTitle = 'ROI Linear Fit ' + ROILF_VERSION;
      this.sizer = new VerticalSizer;
      this.sizer.margin = 12; this.sizer.spacing = 8;
      let help = new Label(this);
      help.useRichText = true; help.wordWrapping = true;
      help.text = '<b>Match the full target to a source using a region.</b><br/>' +
         'Use registered images of the same size: grayscale pairs or RGB pairs. ' +
         'The source is the reference; the target is modified with Undo support.';
      this.sizer.add(help);

      // Common columns and compact field widths keep all groups aligned at any DPI.
      const labelWidth = Math.max(this.font.width('Copy ROI from preview:'), Math.round(155*this.displayPixelRatio));
      const fieldWidth = Math.max(this.font.width('0.000000') + Math.round(24*this.displayPixelRatio),
                                  this.font.width('000000') + Math.round(36*this.displayPixelRatio));
      let groupSizer;
      let addGroup = title => {
         let group = new GroupBox(this); group.title = title;
         group.sizer = new VerticalSizer; group.sizer.margin = 10; group.sizer.spacing = 8;
         this.sizer.add(group); groupSizer = group.sizer;
      };
      let addRow = (labelText, control, compact = false) => {
         let row = new HorizontalSizer; row.spacing = 8;
         let label = new Label(this); label.text = labelText; label.setFixedWidth(labelWidth);
         row.add(label); row.add(control, compact ? 0 : 100);
         if (compact) row.addStretch();
         groupSizer.add(row);
      };
      addGroup('Images');
      this.sourceList = new ViewList(this); this.sourceList.getMainViews();
      this.targetList = new ViewList(this); this.targetList.getMainViews();
      addRow('Source (reference):', this.sourceList);
      addRow('Target (to modify):', this.targetList);
      addGroup('Region of interest');
      this.previewList = new ViewList(this);
      this.previewList.toolTip = 'Only previews of the selected source and target are listed. Choose one to copy its rectangle. Preview processing is ignored; pixels come from the main images.';
      addRow('Copy ROI from preview:', this.previewList);
      let note = new Label(this); note.wordWrapping = true;
      note.text = 'Enter coordinates below, or select an existing preview above. Coordinates start at 0 in the top-left corner.';
      groupSizer.add(note);

      let coordRow = new HorizontalSizer; coordRow.spacing = 8;
      let spin = (name, value, minimum) => {
         let label = new Label(this); label.text = name; coordRow.add(label);
         let control = new SpinBox(this); control.setRange(minimum, 2147483647);
         control.value = value; control.minWidth = 85; coordRow.add(control, 100);
         return control;
      };
      this.x = spin('X', options.x, 0); this.y = spin('Y', options.y, 0);
      this.w = spin('Width', options.width, 1); this.h = spin('Height', options.height, 1);
      groupSizer.add(coordRow);
      let refreshingPreviews = false;
      /** Rebuild the eligible previews without changing the explicit ROI.
       * Preserve an eligible selection; clear it if its parent is no longer selected.
       * Removing a ViewList item never deletes the user's preview.
       */
      this.refreshPreviews = () => {
         let selected = this.previewList.currentView;
         let parentIds = [this.sourceList.currentView, this.targetList.currentView]
            .filter(roiFitHasView).map(v => v.id);
         refreshingPreviews = true;
         try {
            this.previewList.getPreviews();
            for (let window of ImageWindow.windows)
               if (parentIds.indexOf(window.mainView.id) < 0)
                  for (let preview of window.previews) this.previewList.remove(preview);
            this.previewList.currentView = roiFitHasView(selected) &&
               parentIds.indexOf(selected.window.mainView.id) >= 0 ? selected : null;
         } finally { refreshingPreviews = false; }
      };
      this.previewList.onViewSelected = view => {
         if (refreshingPreviews || !roiFitHasView(view)) return;
         let parent = view.window.mainView;
         if (![this.sourceList.currentView, this.targetList.currentView].some(v => roiFitHasView(v) && v.id === parent.id)) {
            new MessageBox('Choose a preview belonging to the selected source or target.', this.windowTitle, StdIcon.Warning, StdButton.Ok).execute();
            return;
         }
         let r = view.window.previewRect(view);
         this.x.value = r.x0; this.y.value = r.y0;
         this.w.value = r.width; this.h.value = r.height;
      };
      let bounds = new Label(this); groupSizer.add(bounds);
      let updateBounds = () => {
         let v = this.targetList.currentView;
         bounds.text = roiFitHasView(v) ? 'Target: ' + v.image.width + ' x ' + v.image.height +
            ' pixels; ' + (v.image.isColor ? 'RGB (3 fits)' : 'grayscale (1 fit)') : 'Select a target image.';
      };
      this.sourceList.onViewSelected = () => this.refreshPreviews();
      this.targetList.onViewSelected = () => { updateBounds(); this.refreshPreviews(); };
      if (options.sourceId) this.sourceList.currentView = View.viewById(options.sourceId);
      if (options.targetId) this.targetList.currentView = View.viewById(options.targetId);
      else if (!Parameters.has('roiFitSchemaVersion') && !ImageWindow.activeWindow.isNull) {
         this.targetList.currentView = ImageWindow.activeWindow.mainView;
         this.w.value = Math.min(256, this.targetList.currentView.image.width);
         this.h.value = Math.min(256, this.targetList.currentView.image.height);
      }
      updateBounds();
      this.refreshPreviews();
      addGroup('Fit settings');
      let numeric = (text, value) => {
         let n = new NumericEdit(this);
         // Use the shared row label rather than NumericEdit's independent label layout.
         n.label.hide(); n.sizer.margin = 0; n.sizer.spacing = 0;
         n.setReal(true); n.setRange(0, 1); n.setPrecision(6); n.setValue(value);
         n.edit.setFixedWidth(fieldWidth); n.setFixedWidth(fieldWidth);
         n.toolTip = 'Native LinearFit sample rejection. Only samples strictly between these limits are used in the fit.';
         addRow(text, n, true); return n;
      };
      this.low = numeric('Reject low:', options.low);
      this.high = numeric('Reject high:', options.high);
      this.clip = new CheckBox(this); this.clip.text = 'Clip final result to [0,1] (standard LinearFit behavior)';
      this.clip.checked = options.clip;
      this.clip.toolTip = 'Disable to retain negative or above-white values in a floating-point target. No rescaling is ever applied.';
      groupSizer.add(this.clip);
      addGroup('Scatter plot');
      this.showPlot = new CheckBox(this); this.showPlot.text = 'Show scatter plot after applying the fit';
      this.showPlot.checked = options.showPlot;
      this.showPlot.toolTip = 'Displays original target versus source pixel values and the native fitted line. The magnifier always shows a read-only fit preview.';
      groupSizer.add(this.showPlot);
      this.maxPoints = new SpinBox(this); this.maxPoints.setRange(100,100000); this.maxPoints.value = options.maxPoints;
      // Allow six digits, spin arrows and padding without stretching across the dialog.
      this.maxPoints.setFixedWidth(fieldWidth);
      this.maxPoints.toolTip = 'Maximum displayed pixel pairs per channel. A deterministic spatial sample is used for large ROIs. This limit never changes the fit.';
      addRow('Plot sample limit:', this.maxPoints, true);
      let cleanup = new Label(this); cleanup.wordWrapping = true;
      cleanup.text = 'Temporary ROI images are always closed. Existing previews are preserved. An attached target mask is temporarily disabled so the fit covers the full image.';
      this.sizer.add(cleanup);
      this.status = new Label(this); this.status.wordWrapping = true;
      this.status.text = 'Magnifier: inspect the fit. Green checkmark: apply to the target.';
      if ((options.sourceId && !roiFitHasView(this.sourceList.currentView)) ||
          (options.targetId && !roiFitHasView(this.targetList.currentView)))
         this.status.text = 'A saved image is closed or renamed. Reselect source/target; the saved ROI and settings were restored.';
      this.sizer.add(this.status);
      /** Read controls immediately before saving, measuring or applying, so the
       * process icon always contains the current rectangle and all plot settings.
       */
      this.readOptions = () => {
         options.sourceId = roiFitHasView(this.sourceList.currentView) ? this.sourceList.currentView.id : '';
         options.targetId = roiFitHasView(this.targetList.currentView) ? this.targetList.currentView.id : '';
         options.x = this.x.value; options.y = this.y.value;
         options.width = this.w.value; options.height = this.h.value;
         options.low = this.low.value; options.high = this.high.value; options.clip = this.clip.checked;
         options.showPlot = this.showPlot.checked; options.maxPoints = this.maxPoints.value;
         options.validate(); this.roi = options.rectangle();
         return options;
      };
      this.reportError = e => { this.status.text = String(e); console.warningln(String(e)); };
      let buttons = new HorizontalSizer; buttons.spacing = 8;
      this.newInstanceButton = roiFitTool(this,':/process-interface/new-instance.png',
         'New instance: drag the triangle to the workspace to save source, target, ROI, rejection limits, clipping and plot settings.');
      this.newInstanceButton.onMousePress = () => {
         this.newInstanceButton.hasFocus = true;
         try { this.readOptions().exportParameters(); this.newInstance(); }
         catch(e) { this.reportError(e); }
      };
      this.previewButton = roiFitTool(this,':/toolbar/view-zoom.png',
         'Preview fit: calculate the native ROI fit and show its scatter plot without modifying either image.',() => {
            let previousAbort = console.abortEnabled;
            try {
               this.readOptions(); let views = roiFitResolve(options);
               this.enabled = false; console.show(); console.abortEnabled = true;
               let fits = runROILinearFit(views.source,views.target,options.rectangle(),options.low,options.high,options.clip,
                  {apply:false,capturePlot:true,maxPoints:options.maxPoints});
               this.enabled = true;
               new ROILinearFitPlotDialog(fits.plotData,options).execute();
               this.status.text = 'Fit preview complete. Images unchanged. Apply recalculates from the current image data.';
            } catch(e) { this.reportError(e); }
            finally { this.enabled = true; console.abortEnabled = previousAbort; }
         });
      this.applyButton = roiFitTool(this,':/process-interface/execute.png','Apply fit: update the full target with Undo support.',() => {
         try {
            this.readOptions(); roiFitResolve(options);
            this.ok();
         } catch(e) { new MessageBox(e.message, this.windowTitle, StdIcon.Error, StdButton.Ok).execute(); }
      });
      this.closeButton = roiFitTool(this,':/process-interface/cancel.png','Close without applying the fit.',() => this.cancel());
      this.helpButton = roiFitTool(this,':/process-interface/browse-documentation.png','Open the ROI Linear Fit user manual.',roiFitShowDocumentation);
      buttons.add(this.newInstanceButton); buttons.add(this.previewButton); buttons.addStretch();
      buttons.add(this.applyButton); buttons.add(this.closeButton); buttons.add(this.helpButton); this.sizer.add(buttons);
      this.minWidth = 650; this.adjustToContents();
   }
}

/** Interactive/global icons reopen the dialog. Dropping an instance on a main
 * view executes directly: the dropped-on view overrides only the saved target.
 * Coefficients are always recalculated, never replayed from a stale plot.
 */
function roiFitMain() {
   CoreApplication.ensureMinimumVersion(1, 9, 5);
   let applied = false;
   try {
      let options = new ROILinearFitOptions; options.importParameters();
      if (Parameters.isViewTarget && !roiFitHasView(Parameters.targetView))
         throw new Error('The instance target view is no longer available.');
      if (!Parameters.isViewTarget) {
         let d = new ROILinearFitDialog(options);
         if (!d.execute()) return;
      }
      let views = roiFitResolve(options, Parameters.isViewTarget ? Parameters.targetView : null);
      console.show();
      let fits = runROILinearFit(views.source, views.target, options.rectangle(), options.low, options.high, options.clip,
         {capturePlot:options.showPlot,maxPoints:options.maxPoints});
      applied = true;
      if (options.showPlot) new ROILinearFitPlotDialog(fits.plotData,options).execute();
   } catch(e) {
      console.criticalln(e.toString());
      let message = (applied ? 'The fit was applied successfully, but the plot could not be displayed.\n\n' : '') + e.message;
      if (Parameters.isViewTarget) throw new Error(message);
      new MessageBox(message, 'ROI Linear Fit', StdIcon.Error, StdButton.Ok).execute();
   }
}

#ifndef ROILF_LIBRARY
roiFitMain();
#endif
