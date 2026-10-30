#engine v8
/*
   BBStarReduction v1.3.0
   Bill Blanshan's star reduction methods.
   Copyright (C) 2022-2026 Dr. Thorsten Glebe

   This program is free software: you can redistribute it and/or modify it
   under the terms of the GNU General Public License as published by the
   Free Software Foundation, version 3 of the License.
   This program is distributed in the hope that it will be useful, but WITHOUT
   ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
   FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for
   more details. You should have received a copy of the GNU General Public
   License along with this program. If not, see <http://www.gnu.org/licenses/>.

   1.3.0: TGScripts interface, open-first workflow, separate comparison preview,
   existing starless images, repeatable Apply, corrected Star mode mapping,
   bounded instance parameters and exception-safe temporary image cleanup.
*/

#define TITLE "BBStarReduction"
#define VERSION "1.3.0"
#feature-id BBStarReduction : TG Scripts > BBStarReduction
#feature-info Bill Blanshan's star reduction methods for stretched images.<br/>\
   Use StarXTerminator or an existing starless image.<br/>\
   Copyright &copy; 2022-2026 Thorsten Glebe.

CoreApplication.ensureMinimumVersion(1, 9, 5);
const BB_SCRIPT_FILE = #__FILE__;
const BB_METHODS = ["Transfer", "Halo", "Star"];
const BB_MODES = ["Strong", "Moderate", "Soft"];

function BB_valid(view) { return view != null && !view.isNull; }
function BB_bound(value, low, high, fallback)
{
   return isFinite(value) ? Math.max(low, Math.min(high, value)) : fallback;
}
function BB_unique(base)
{
   var id = base;
   for (var n = 1; BB_valid(View.viewById(id)); ++n) id = base + "_" + n;
   return id;
}

function BB_settings()
{
   this.target = null;
   this.starless = null;
   this.preview = null;
   this.useStarless = false;
   this.method = 0;
   this.strength = 0.5; // User-facing range. Legacy instances store S = (1-strength)/2.
   this.iterations = 1;
   this.mode = 2; // Zero-based everywhere except at the PixelMath boundary.
   this.newImage = true;
   this.exportParameters = function()
   {
      Parameters.clear();
      Parameters.set("method", this.method);
      Parameters.set("strength", (1 - this.strength)/2);
      Parameters.set("iterations", this.iterations);
      Parameters.set("mode", this.mode);
      Parameters.set("newImage", this.newImage);
   };
   this.importParameters = function()
   {
      if (Parameters.has("view_id"))
      {
         var view = View.viewById(Parameters.getString("view_id"));
         if (BB_valid(view)) this.target = view.window.mainView;
      }
      if (Parameters.has("method")) this.method = BB_bound(Parameters.getInteger("method"), 0, 2, 0);
      if (Parameters.has("strength")) this.strength = BB_bound(1 - 2*Parameters.getReal("strength"), 0, 1, 0.5);
      if (Parameters.has("iterations")) this.iterations = BB_bound(Parameters.getInteger("iterations"), 1, 3, 1);
      if (Parameters.has("mode")) this.mode = BB_bound(Parameters.getInteger("mode"), 0, 2, 2);
      // Old instances modified their target. New instances explicitly store this choice.
      this.newImage = Parameters.has("newImage") ? Parameters.getBoolean("newImage") : false;
      // Target-specific starless images and preview choices are deliberately not saved.
   };
}
var bb = new BB_settings;

function BB_window(width, height, image, id)
{
   return new ImageWindow(width, height, image.numberOfChannels, image.bitsPerSample,
      image.sampleType == PixelSampleType.Float, image.colorSpace != ColorSpace.Gray, BB_unique(id));
}
function BB_copy(view, id, rect)
{
   var source = view.image;
   rect = rect || new Rect(0, 0, source.width, source.height);
   var window = BB_window(rect.width, rect.height, source, id);
   try
   {
      window.mainView.beginProcess(UndoFlag.NoSwapFile);
      try
      {
         window.mainView.image.apply(source, ImageOp.Mov, new Point(0, 0), 0,
            rect, 0, source.numberOfChannels - 1);
      }
      finally { window.mainView.endProcess(); }
      if (rect.width == source.width && rect.height == source.height)
         window.keywords = view.window.keywords;
      window.rgbWorkingSpace = view.window.rgbWorkingSpace;
      window.mainView.stf = view.stf;
      return window;
   }
   catch (error) { window.forceClose(); throw error; }
}
function BB_close(window)
{
   if (window != null && !window.isNull) window.forceClose();
}

function BB_restoreAlpha(view, source, rect)
{
   var image = source.image, first = image.numberOfNominalChannels;
   if (first == image.numberOfChannels) return;
   rect = rect || new Rect(0, 0, image.width, image.height);
   view.beginProcess(UndoFlag.NoSwapFile);
   try
   {
      if (view.image.numberOfChannels < image.numberOfChannels)
         view.image.createAlphaChannels(image.numberOfChannels - view.image.numberOfChannels);
      view.image.apply(image, ImageOp.Mov, new Point(0, 0), first, rect, first, image.numberOfChannels - 1);
   }
   finally { view.endProcess(); }
}

function BB_validate(settings, comparison)
{
   var target = settings.target;
   if (!BB_valid(target) || !target.isMainView)
      throw Error("Select a target main image, or use Open image first.");
   var image = target.image;
   if (image.colorSpace != ColorSpace.Gray && image.colorSpace != ColorSpace.RGB)
      throw Error("The target must be a grayscale or RGB image.");
   if (settings.useStarless)
   {
      var starless = settings.starless;
      if (!BB_valid(starless) || !starless.isMainView)
         throw Error("Select the starless main image that belongs to this target.");
      if (starless.fullId == target.fullId)
         throw Error("The target and starless image must be different images.");
      if (starless.image.width != image.width || starless.image.height != image.height ||
          starless.image.numberOfNominalChannels != image.numberOfNominalChannels ||
          starless.image.colorSpace != image.colorSpace)
         throw Error("The starless image must match the target's width, height and color channels.");
   }
   else
   {
      if (typeof StarXTerminator == "undefined")
         throw Error("StarXTerminator is unavailable. Select Use an existing starless image, or install and configure StarXTerminator.");
      if (image.width < 512 || image.height < 512)
         throw Error("Automatic star removal requires a target of at least 512 × 512 pixels. For smaller targets, select an existing starless image.");
   }
   if (comparison && (!BB_valid(settings.preview) || !settings.preview.isPreview ||
       settings.preview.window.mainView.fullId != target.fullId ||
       settings.preview.image.width < 64 || settings.preview.image.height < 64))
      throw Error("Select a preview of this target, at least 64 × 64 pixels. Create previews in PixInsight before opening the script.");
}

function BB_starless(settings)
{
   if (settings.useStarless) return {view: settings.starless, owned: null};
   var copy = BB_copy(settings.target, "BBStarReduction_starless");
   try
   {
      var process = new StarXTerminator;
      process.stars = false;
      process.unscreen = true;
      process.overlap = 0.20;
      if (!process.executeOn(copy.mainView, false))
         throw Error("StarXTerminator failed. Check its configuration, selected AI model and the Process Console.");
      return {view: copy.mainView, owned: copy};
   }
   catch (error) { BB_close(copy); throw error; }
}

// Bill Blanshan's V2 expressions. Convert the zero-based mode exactly once.
function BB_reduce(view, starless, method, strength, iterations, mode)
{
   var process = new PixelMath;
   var S = (1 - strength)/2;
   if (method == 0)
   {
      process.expression = "S=" + S + ";Img1=" + starless.id + ";f1=~((~mtf(~S,$T)/~mtf(~S,Img1))*~Img1);max(Img1,f1)";
      process.symbols = "S,Img1,f1";
   }
   else if (method == 1)
   {
      process.expression = "S=" + S + ";Img1=" + starless.id + ";f2=((~(~$T/~Img1)-~(~mtf(~S,$T)/~mtf(~S,Img1)))*~Img1);f3=(~(~$T/~Img1)-~(~mtf(~S,$T)/~mtf(~S,Img1)));max(Img1,$T-mean(f2,f3))";
      process.symbols = "S,Img1,f2,f3";
   }
   else
   {
      process.expression = "Img1=" + starless.id + ";I=" + iterations + ";M=" + (mode + 1) + ";" +
         "E1=$T*~(~(Img1/$T)*~$T);E2=max(E1,($T*E1)+(E1*~E1));" +
         "E3=E1*~(~(Img1/E1)*~E1);E4=max(E3,($T*E3)+(E3*~E3));" +
         "E5=E3*~(~(Img1/E3)*~E3);E6=max(E5,($T*E5)+(E5*~E5));" +
         "E7=iif(I==1,E1,iif(I==2,E3,E5));E8=iif(I==1,E2,iif(I==2,E4,E6));" +
         "E9=mean($T-($T-iif(I==1,E2,iif(I==2,E4,E6))),$T*~($T-iif(I==1,E2,iif(I==2,E4,E6))));" +
         "max(Img1,iif(M==1,E7,iif(M==2,E8,E9)))";
      process.symbols = "I,M,Img1,E1,E2,E3,E4,E5,E6,E7,E8,E9";
   }
   process.useSingleExpression = true;
   process.createNewImage = false;
   process.generateOutput = true;
   process.rescale = false;
   process.truncate = true;
   process.truncateLower = 0;
   process.truncateUpper = 1;
   process.cacheGeneratedImages = false;
   if (!process.executeOn(view, false)) throw Error("PixelMath could not complete star reduction. See the Process Console.");
}

function BB_label(view, text)
{
   var font = new Font("Helvetica");
   font.pixelSize = Math.max(8, Math.min(24, Math.floor(view.image.width/24)));
   while (font.pixelSize > 6 && font.width(text) > view.image.width - 12) --font.pixelSize;
   var height = font.ascent + font.descent + 8;
   var bitmap = new Bitmap(view.image.width, height);
   bitmap.fill(0xd0000000);
   var graphics = new Graphics(bitmap);
   try
   {
      graphics.font = font;
      graphics.pen = new Pen(0xffffffff);
      graphics.textAntialiasing = true;
      graphics.drawText(6, 4 + font.ascent, text);
   }
   finally { graphics.end(); }
   view.beginProcess(UndoFlag.NoSwapFile);
   try
   {
      view.image.selectedPoint = new Point(0, view.image.height - height);
      view.image.blend(bitmap);
      view.image.resetSelections();
   }
   finally { view.endProcess(); }
}

function BB_run(settings, comparison)
{
   BB_validate(settings, comparison);
   var starless = null, crop = null, work = null, output = null;
   try
   {
      starless = BB_starless(settings);
      if (comparison)
      {
         // Use the same full-image starless data as Apply, cropped to the preview.
         var rect = settings.target.window.previewRect(settings.preview);
         crop = BB_copy(starless.view, "BBStarReduction_starless_crop", rect);
         var image = settings.preview.image, width = image.width, height = image.height, gap = 4;
         output = BB_window(3*width + 4*gap, 3*height + 4*gap, image, "BBStarReduction_" + BB_METHODS[settings.method] + "_comparison");
         output.rgbWorkingSpace = settings.target.window.rgbWorkingSpace;
         output.mainView.beginProcess(UndoFlag.NoSwapFile);
         try { output.mainView.image.fill(0); }
         finally { output.mainView.endProcess(); }
         for (var y = 0; y < 3; ++y)
            for (var x = 0; x < 3; ++x)
            {
               work = BB_copy(settings.target, "BBStarReduction_panel", rect);
               var strength = (y*3 + x + 1)/10, iterations = y + 1, mode = x;
               BB_reduce(work.mainView, crop.mainView, settings.method, strength, iterations, mode);
               BB_label(work.mainView, settings.method == 2 ? BB_MODES[mode] + " · " + iterations + (iterations == 1 ? " iteration" : " iterations") : "Strength " + strength.toFixed(1));
               BB_restoreAlpha(work.mainView, settings.target, rect);
               output.mainView.beginProcess(UndoFlag.NoSwapFile);
               try
               {
                  output.mainView.image.apply(work.mainView.image, ImageOp.Mov,
                     new Point(gap + x*(width + gap), gap + y*(height + gap)), 0,
                     new Rect(0, 0, width, height), 0, image.numberOfChannels - 1);
               }
               finally { output.mainView.endProcess(); }
               BB_close(work); work = null;
            }
      }
      else
      {
         // Finish on a temporary copy before committing any change to the source.
         output = BB_copy(settings.target, settings.target.id + "_BB" + BB_METHODS[settings.method]);
         BB_reduce(output.mainView, starless.view, settings.method, settings.strength, settings.iterations, settings.mode);
         // PixelMath can reset alpha samples even with no alpha expression.
         BB_restoreAlpha(output.mainView, settings.target);
         if (!settings.newImage)
         {
            settings.target.beginProcess();
            try
            {
               var src = output.mainView.image;
               settings.target.image.apply(src, ImageOp.Mov, new Point(0, 0), 0,
                  new Rect(0, 0, src.width, src.height), 0, src.numberOfChannels - 1);
            }
            finally { settings.target.endProcess(); }
            BB_close(output); output = null;
            return settings.target.window;
         }
      }
      output.show();
      output.fitWindow();
      var result = output;
      output = null;
      return result;
   }
   finally
   {
      BB_close(work); BB_close(crop); BB_close(output);
      if (starless) BB_close(starless.owned);
   }
}

function BB_group(parent, title)
{
   var group = new GroupBox(parent);
   group.title = title;
   group.sizer = new VerticalSizer;
   group.sizer.margin = 10;
   group.sizer.spacing = 8;
   return group;
}
function BB_tool(parent, resource, tip, handler)
{
   var button = new ToolButton(parent);
   button.icon = parent.scaledResource(resource);
   button.setScaledFixedSize(24, 24);
   button.toolTip = tip;
   button.onClick = handler;
   return button;
}
function BB_help()
{
   var dir = BB_SCRIPT_FILE.replace(/\\/g, "/").replace(/\/[^/]+$/, "");
   var relative = "/scripts/BBStarReduction/BBStarReduction.html";
   var paths = [File.fullPath(dir + "/../../../doc" + relative),
      dir + "/TGScripts-install/doc" + relative, dir + "/doc" + relative,
      CoreApplication.docDirPath + relative];
   for (var i = 0; i < paths.length; ++i)
      if (File.exists(paths[i])) { Dialog.openBrowser(paths[i], TITLE + " — User Guide"); return; }
   (new MessageBox("The BBStarReduction guide is missing from the TGScripts documentation folder.", TITLE, StdIcon.Warning, StdButton.Ok)).execute();
}

var BB_dialog = class extends Dialog
{
   constructor()
   {
      super();
      this.windowTitle = TITLE + " " + VERSION;
      this.setScaledFixedWidth(420);
      this.intro = new Label(this);
      this.intro.text = "Bill Blanshan’s star reduction for stretched images.";
      this.intro.wordWrapping = true;

      this.targetGroup = BB_group(this, "Target image");
      this.targetList = new ViewList(this.targetGroup);
      this.targetList.getMainViews();
      this.targetList.toolTip = "Select the stretched main image that contains the stars.";
      this.targetList.onViewSelected = view => this.selectTarget(view);
      this.openButton = new PushButton(this.targetGroup);
      this.openButton.text = "Open image…";
      this.openButton.onClick = () => this.openImage();
      var targetRow = new HorizontalSizer;
      targetRow.spacing = 8; targetRow.add(this.targetList, 100); targetRow.add(this.openButton);
      this.targetInfo = new Label(this.targetGroup);
      this.targetInfo.wordWrapping = true;
      this.targetGroup.sizer.add(targetRow); this.targetGroup.sizer.add(this.targetInfo);

      this.starlessGroup = BB_group(this, "Starless image");
      this.existingCheck = new CheckBox(this.starlessGroup);
      this.existingCheck.text = "Use an existing starless image";
      this.existingCheck.toolTip = "Use a starless version of the same target, with identical geometry and matching stretch. Otherwise StarXTerminator creates one automatically.";
      this.existingCheck.onCheck = checked => { bb.useStarless = checked; this.updateStatus(); };
      this.starlessList = new ViewList(this.starlessGroup);
      this.starlessList.onViewSelected = view => { bb.starless = BB_valid(view) ? view : null; this.updateStatus(); };
      this.starlessInfo = new Label(this.starlessGroup);
      this.starlessInfo.wordWrapping = true;
      this.starlessInfo.minHeight = 2*this.font.height;
      this.starlessGroup.sizer.add(this.existingCheck); this.starlessGroup.sizer.add(this.starlessList); this.starlessGroup.sizer.add(this.starlessInfo);

      this.methodGroup = BB_group(this, "Star reduction");
      this.methodCombo = new ComboBox(this.methodGroup);
      BB_METHODS.forEach(name => this.methodCombo.addItem(name));
      this.methodCombo.onItemSelected = index => { bb.method = index; this.updateStatus(); };
      this.methodGroup.sizer.add(this.row(this.methodGroup, "Method:", this.methodCombo));
      this.strengthControl = new NumericControl(this.methodGroup);
      this.strengthControl.label.text = "Strength:";
      this.strengthControl.label.setScaledFixedWidth(80);
      this.strengthControl.edit.setScaledFixedWidth(50);
      this.strengthControl.slider.setRange(0, 100);
      this.strengthControl.slider.setScaledMinWidth(100);
      this.strengthControl.setRange(0, 1); this.strengthControl.setPrecision(2); this.strengthControl.setReal(true);
      this.strengthControl.toolTip = "Transfer and Halo: 0 to 1; larger values give stronger reduction. Start near 0.5.";
      this.strengthControl.onValueUpdated = value => { bb.strength = value; };
      this.iterationsSpin = new SpinBox(this.methodGroup);
      this.iterationsSpin.minValue = 1; this.iterationsSpin.maxValue = 3;
      this.iterationsSpin.toolTip = "Star method: 1 to 3 iterations. More iterations increase reduction.";
      this.iterationsSpin.onValueUpdated = value => { bb.iterations = value; };
      this.modeCombo = new ComboBox(this.methodGroup);
      BB_MODES.forEach(name => this.modeCombo.addItem(name));
      this.modeCombo.toolTip = "Star method: Strong, Moderate or Soft. Soft is the default.";
      this.modeCombo.onItemSelected = index => { bb.mode = index; };
      this.methodGroup.sizer.add(this.strengthControl);
      this.iterationsSpin.setScaledFixedWidth(70);
      this.methodGroup.sizer.add(this.row(this.methodGroup, "Iterations:", this.iterationsSpin, false));
      this.methodGroup.sizer.add(this.row(this.methodGroup, "Mode:", this.modeCombo));

      this.previewGroup = BB_group(this, "Compare on a preview");
      this.previewList = new ViewList(this.previewGroup);
      this.previewList.toolTip = "Choose a preview belonging to the target, at least 64 × 64 pixels. The comparison is always a new image.";
      this.previewList.onViewSelected = view => { bb.preview = BB_valid(view) ? view : null; this.updateStatus(); };
      this.compareButton = new PushButton(this.previewGroup);
      this.compareButton.text = "Create comparison";
      this.compareButton.onClick = () => this.run(true);
      var previewRow = new HorizontalSizer;
      previewRow.spacing = 8; previewRow.add(this.previewList, 100); previewRow.add(this.compareButton);
      this.previewInfo = new Label(this.previewGroup);
      this.previewInfo.wordWrapping = true;
      this.previewInfo.minHeight = 2*this.font.height;
      this.previewGroup.sizer.add(previewRow); this.previewGroup.sizer.add(this.previewInfo);

      this.copyCheck = new CheckBox(this);
      this.copyCheck.text = "Create a new image on Apply";
      this.copyCheck.toolTip = "Recommended for comparing results. Uncheck to replace the target pixels with one Undo step. Apply always processes the full target.";
      this.copyCheck.onCheck = checked => { bb.newImage = checked; this.updateStatus(); };
      this.status = new Label(this);
      this.status.wordWrapping = true; this.status.minHeight = 2*this.font.height;
      this.instanceButton = BB_tool(this, ":/process-interface/new-instance.png", "Drag to save settings for another image. Instances use automatic StarXTerminator, not a selected starless image or preview.", () => {});
      this.instanceButton.onMousePress = () => { bb.exportParameters(); this.newInstance(); };
      this.resetButton = BB_tool(this, ":/process-interface/reset.png", "Reset reduction settings; retain the target, starless image and preview.", () => this.resetSettings());
      this.applyButton = BB_tool(this, ":/process-interface/execute.png", "Apply the selected settings to the full target and keep this dialog open.", () => this.run(false));
      this.closeButton = BB_tool(this, ":/process-interface/cancel.png", "Close BBStarReduction.", () => this.cancel());
      this.helpButton = BB_tool(this, ":/process-interface/browse-documentation.png", "Open the PiDoc user guide.", BB_help);
      var actions = new HorizontalSizer;
      actions.spacing = 8;
      actions.add(this.instanceButton); actions.add(this.resetButton); actions.addStretch();
      actions.add(this.applyButton); actions.add(this.closeButton); actions.add(this.helpButton);
      this.sizer = new VerticalSizer;
      this.sizer.margin = 10; this.sizer.spacing = 8;
      [this.intro, this.targetGroup, this.starlessGroup, this.methodGroup, this.previewGroup, this.copyCheck, this.status].forEach(control => this.sizer.add(control));
      this.sizer.add(actions);
      this.syncSettings(); this.selectTarget(bb.target);
      this.adjustToContents(); this.setFixedSize();
   }
   row(parent, text, control, stretch)
   {
      var label = new Label(parent); label.text = text;
      label.setScaledFixedWidth(80); label.textAlignment = TextAlignment.Right|TextAlignment.VertCenter;
      var row = new HorizontalSizer; row.spacing = 4; row.add(label); row.add(control, stretch === false ? 0 : 100);
      if (stretch === false) row.addStretch();
      return row;
   }
   syncSettings()
   {
      this.methodCombo.currentItem = bb.method; this.strengthControl.setValue(bb.strength);
      this.iterationsSpin.value = bb.iterations; this.modeCombo.currentItem = bb.mode;
      this.copyCheck.checked = bb.newImage; this.existingCheck.checked = bb.useStarless;
   }
   selectTarget(view)
   {
      var selected = BB_valid(view) ? view.window.mainView : null;
      if (!BB_valid(bb.target) || !BB_valid(selected) || bb.target.fullId != selected.fullId)
      {
         bb.starless = null; bb.preview = null;
      }
      bb.target = selected;
      if (BB_valid(selected)) this.targetList.currentView = selected;
      this.starlessList.getMainViews();
      if (BB_valid(selected)) this.starlessList.remove(selected);
      this.starlessList.currentView = BB_valid(bb.starless) ? bb.starless : new View;
      this.previewList.getPreviews();
      ImageWindow.windows.forEach(window => window.previews.forEach(preview =>
      {
         if (!BB_valid(selected) || window.mainView.fullId != selected.fullId) this.previewList.remove(preview);
      }));
      this.previewList.currentView = BB_valid(bb.preview) ? bb.preview : new View;
      this.updateStatus();
   }
   updateStatus()
   {
      if (!this.status) return;
      var available = BB_valid(bb.target);
      this.targetInfo.text = available ? bb.target.image.width + " × " + bb.target.image.height + " pixels · " + (bb.target.image.isColor ? "RGB" : "Grayscale") : "Select an open image, or use Open image to load a file.";
      this.starlessList.enabled = bb.useStarless;
      this.starlessInfo.text = bb.useStarless ? "Use a matching starless image with the same alignment and stretch." : "StarXTerminator creates a temporary starless image. Configure its AI model before applying.";
      this.strengthControl.enabled = bb.method != 2;
      this.iterationsSpin.enabled = this.modeCombo.enabled = bb.method == 2;
      this.previewInfo.text = bb.method == 2 ? "Columns: Strong / Moderate / Soft.\nRows: 1 / 2 / 3 iterations." : "Strengths 0.1–0.9 in a 3 × 3 grid.\nRead left to right, then top to bottom.";
      this.compareButton.enabled = available && BB_valid(bb.preview);
      this.applyButton.enabled = available;
      this.status.text = available ? (bb.newImage ? "Apply creates a new image; the target stays unchanged." : "Apply replaces the full target. Use Undo to restore its previous pixels.") + "\nSelecting a preview only affects Create comparison." : "Open the script first and select an image when ready.\nNew Instance saves reduction settings without a target.";
   }
   openImage()
   {
      var chooser = new OpenFileDialog;
      chooser.caption = "Open target image"; chooser.multipleSelections = false; chooser.loadImageFilters();
      if (!chooser.execute()) return;
      try
      {
         var windows = ImageWindow.open(chooser.filePath);
         if (windows.length == 0) throw Error("The file contains no image.");
         windows.forEach(window => window.show());
         this.targetList.getMainViews(); this.selectTarget(windows[0].mainView);
      }
      catch (error) { this.showError(error); }
   }
   run(comparison)
   {
      try
      {
         BB_validate(bb, comparison);
         var median = bb.target.computeOrFetchProperty("Median");
         if (median.at(0) <= 0.01 && (new MessageBox("This image may still be linear. These methods are intended for stretched pixel data; an STF display stretch is not enough. Continue?", TITLE, StdIcon.Warning, StdButton.Yes, StdButton.No)).execute() != StdButton.Yes) return;
         this.enabled = false;
         Console.show();
         var start = new Date;
         var result = BB_run(bb, comparison);
         Console.noteln(TITLE + ": " + result.mainView.id + " · " + ((new Date - start)/1000).toFixed(2) + " s");
         this.targetList.getMainViews(); this.selectTarget(bb.target);
         this.status.text = (comparison ? "Comparison created: " : "Applied: ") + result.mainView.id + ".\nThe selected target is retained; adjust settings and apply again.";
         Console.hide();
      }
      catch (error) { this.showError(error); }
      finally { this.enabled = true; }
   }
   resetSettings()
   {
      bb.method = 0; bb.strength = 0.5; bb.iterations = 1; bb.mode = 2; bb.newImage = true;
      this.syncSettings(); this.updateStatus();
   }
   showError(error) { (new MessageBox(String(error.message || error), TITLE, StdIcon.Warning, StdButton.Ok)).execute(); }
};

function main()
{
   Console.hide();
   if (Parameters.isGlobalTarget || Parameters.isViewTarget) bb.importParameters();
   if (Parameters.isViewTarget)
   {
      bb.target = Parameters.targetView;
      BB_run(bb, false);
      return;
   }
   if (!BB_valid(bb.target))
   {
      var window = ImageWindow.activeWindow;
      if (window != null && !window.isNull) bb.target = window.mainView;
   }
   (new BB_dialog).execute();
}

#ifndef BB_TEST
main();
#endif
