#engine v8
// V8 migration (2026-10-19); requires PixInsight 1.9.5 or later.
// ****************************************************************************
// PixInsight JavaScript Runtime API - PJSR Version 1.0
// ****************************************************************************
// AberrationInspectorTG.js v2.2.0
// AberrationInspector.js - Released 2015/08/06 00:00:00 UTC
// ****************************************************************************
//
// This file is part of AberrationInspector Script version 1.3
//
// Copyright (C) 2012-2015 Mike Schuster. All Rights Reserved.
//
// Redistribution and use in both source and binary forms, with or without
// modification, is permitted provided that the following conditions are met:
//
// 1. All redistributions of source code must retain the above copyright
//    notice, this list of conditions and the following disclaimer.
//
// 2. All redistributions in binary form must reproduce the above copyright
//    notice, this list of conditions and the following disclaimer in the
//    documentation and/or other materials provided with the distribution.
//
// 3. Neither the names "PixInsight" and "Pleiades Astrophoto", nor the names
//    of their contributors, may be used to endorse or promote products derived
//    from this software without specific prior written permission. For written
//    permission, please contact info@pixinsight.com.
//
// 4. All products derived from this software, in any form whatsoever, must
//    reproduce the following acknowledgment in the end-user documentation
//    and/or other materials provided with the product:
//
//    "This product is based on software from the PixInsight project, developed
//    by Pleiades Astrophoto and its contributors (http://pixinsight.com/)."
//
//    Alternatively, if that is where third-party acknowledgments normally
//    appear, this acknowledgment must be reproduced in the product itself.
//
// THIS SOFTWARE IS PROVIDED BY PLEIADES ASTROPHOTO AND ITS CONTRIBUTORS
// "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED
// TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
// PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL PLEIADES ASTROPHOTO OR ITS
// CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
// EXEMPLARY OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, BUSINESS
// INTERRUPTION; PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; AND LOSS OF USE,
// DATA OR PROFITS) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
// CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
// ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE.
// ****************************************************************************

/*
 *    Modified by Thorsten Glebe, October 2022
   1. added "new instance" icon and save/restore of parameters
   2. increased maximum panel size to 2048
   3. code refactoring
*/

#define TITLE "AberrationInspectorTG"
// 2.2.0: TGScripts dialog, open-first workflow, repeatable Apply and updated guide.
#define VERSION "2.2.0"

CoreApplication.ensureMinimumVersion(1, 9, 5);

#feature-id AberrationInspectorTG : TG Scripts > AberrationInspectorTG

#feature-info An aberration inspector utility.<br/>\
   <br/>\
   This script generates a n x n panel mosaic of subsections of a view. Subsections are\
   organized along horizontal and vertical bands across the view, including its corners,\
   edges and central areas.\
   <br/>\
   <br/>Copyright &copy; 2012-2015 Mike Schuster. All Rights Reserved.\
   <br/>\
   Modified 2022 by Thorsten Glebe

#define DEFAULT_PANEL_SIZE       256
#define DEFAULT_MOSAIC_SIZE      3
#define DEFAULT_SEPARATION_SIZE  4
#define DEFAULT_SEPARATION_COLOR 0.0

#define MIN_PANEL_SIZE           16
#define MAX_PANEL_SIZE           2048
#define MIN_MOSAIC_SIZE          2
#define MAX_MOSAIC_SIZE          9
#define MIN_SEPARATION_SIZE      0
#define MAX_SEPARATION_SIZE      16
#define MIN_SEPARATION_COLOR     0.0
#define MAX_SEPARATION_COLOR     1.0

// Clips value to the given range
function clipValueRange(value, min, max)
{
   return value < min ? min : value > max ? max : value;
}

// Returns a unique view id with the given base id prefix.
function uniqueViewId(baseId)
{
   var id = baseId;
   for (var i = 1; !(View.viewById(id)?.isNull ?? true); ++i)
   {
      id = baseId + format("%02d", i);
   }
   return id;
}

// Returns a main view id of a view.
function mainViewIdOfView(view)
{
   return view.isMainView ? view.id : view.window.mainView.id + "_" + view.id;
}

// Creates an image window with the given parameters.
function createImageWindow(width, height, viewId, baseImage)
{
   return new ImageWindow(
      width,
      height,
      baseImage.numberOfChannels,
      baseImage.bitsPerSample,
      baseImage.sampleType == PixelSampleType.Float,
      baseImage.colorSpace != ColorSpace.Gray,
      viewId
   );
}

function parametersPrototype()
{
   this.targetView = null;
   this.mosaicSize = DEFAULT_MOSAIC_SIZE;
   this.panelSize = DEFAULT_PANEL_SIZE;
   this.separationSize = DEFAULT_SEPARATION_SIZE;
   this.separationColor = DEFAULT_SEPARATION_COLOR;

   this.exportParameters = function()
   {
      // Save settings independently of a target, as in other TGScripts.
      Parameters.clear();
      Parameters.set("mosaicSize", this.mosaicSize);
      Parameters.set("panelSize", this.panelSize);
      Parameters.set("separationSize", this.separationSize);
      Parameters.set("separationColor", this.separationColor);
   };

   this.importParameters = function()
   {
      // Older instances may contain a main-view identifier.
      if (Parameters.has("view_id"))
      {
         var id = Parameters.getString("view_id");
         var view = id ? View.viewById(id) : null;
         if (view != null && !view.isNull)
            this.targetView = view;
      }
      this.mosaicSize = clipValueRange(Parameters.has("mosaicSize") ? Parameters.getInteger("mosaicSize") : DEFAULT_MOSAIC_SIZE, MIN_MOSAIC_SIZE, MAX_MOSAIC_SIZE);
      this.panelSize = clipValueRange(Parameters.has("panelSize") ? Parameters.getInteger("panelSize") : DEFAULT_PANEL_SIZE, MIN_PANEL_SIZE, MAX_PANEL_SIZE);
      this.separationSize = clipValueRange(Parameters.has("separationSize") ? Parameters.getInteger("separationSize") : DEFAULT_SEPARATION_SIZE, MIN_SEPARATION_SIZE, MAX_SEPARATION_SIZE);
      this.separationColor = clipValueRange(Parameters.has("separationColor") ? Parameters.getReal("separationColor") : DEFAULT_SEPARATION_COLOR, MIN_SEPARATION_COLOR, MAX_SEPARATION_COLOR);
   };
}

var ai_data = new parametersPrototype;
const AI_SCRIPT_FILE = #__FILE__;

function AI_group(parent, title)
{
   var group = new GroupBox(parent);
   group.title = title;
   group.sizer = new VerticalSizer;
   group.sizer.margin = 10;
   group.sizer.spacing = 8;
   return group;
}

function AI_tool(parent, resource, tip, handler)
{
   var button = new ToolButton(parent);
   button.icon = parent.scaledResource(resource);
   button.setScaledFixedSize(24, 24);
   button.toolTip = tip;
   button.onClick = handler;
   return button;
}

function AI_showDocumentation()
{
   var relative = "/scripts/AberrationInspectorTG/AberrationInspectorTG.html";
   var dir = AI_SCRIPT_FILE.replace(/\\/g, "/").replace(/\/[^/]+$/, "");
   var candidates = [File.fullPath(dir + "/../../../doc" + relative),
      dir + "/TGScripts-install/doc" + relative, dir + "/doc" + relative,
      CoreApplication.docDirPath + relative];
   for (var i = 0; i < candidates.length; ++i)
      if (File.exists(candidates[i]))
      {
         Dialog.openBrowser(candidates[i], TITLE + " — User Guide");
         return;
      }
   (new MessageBox("The AberrationInspectorTG user guide is missing. Check that the TGScripts repository includes its documentation.",
      TITLE, StdIcon.Warning, StdButton.Ok)).execute();
}

function AI_panelSize(view)
{
   return Math.min(ai_data.panelSize, Math.floor(view.image.width / ai_data.mosaicSize),
      Math.floor(view.image.height / ai_data.mosaicSize));
}

function AI_run(view)
{
   if (view == null || view.isNull)
      throw Error("Select a target image or click Open image first.");
   var panel = AI_panelSize(view);
   var n = ai_data.mosaicSize;
   if (panel < MIN_PANEL_SIZE)
      throw Error("The target is too small for a " + n + " × " + n + " mosaic. Each panel needs at least " +
         MIN_PANEL_SIZE + " pixels; select an image at least " + (n * MIN_PANEL_SIZE) +
         " × " + (n * MIN_PANEL_SIZE) + " pixels, or reduce Rows and columns.");
   var source = view.image;
   var side = n * panel + (n - 1) * ai_data.separationSize;
   var output = createImageWindow(side, side, uniqueViewId(mainViewIdOfView(view) + "_mosaic"), source);
   try
   {
      output.mainView.beginProcess(UndoFlag.NoSwapFile);
      try
      {
         var image = output.mainView.image;
         image.fill(ai_data.separationColor);
         for (var y = 0; y < n; ++y)
            for (var x = 0; x < n; ++x)
            {
               var sx = Math.round(x / (n - 1) * (source.width - panel));
               var sy = Math.round(y / (n - 1) * (source.height - panel));
               // Explicit source bounds/channels leave the source's selections untouched.
               image.apply(source, ImageOp.Mov,
                  new Point(x * (panel + ai_data.separationSize), y * (panel + ai_data.separationSize)),
                  0, new Rect(sx, sy, sx + panel, sy + panel), 0, source.numberOfChannels - 1);
            }
         image.resetSelections();
      }
      finally { output.mainView.endProcess(); }
      output.mainView.stf = view.stf;
      output.show();
      return output;
   }
   catch (error)
   {
      output.forceClose();
      throw error;
   }
}

var AI_dialog = class extends Dialog
{
   constructor()
   {
      super();
      this.windowTitle = TITLE + " " + VERSION;
      this.setScaledMinWidth(620);

      this.intro = new Label(this);
      this.intro.wordWrapping = true;
      this.intro.text = "Inspect optical aberrations with a grid of panels sampled across an image, including its corners and edges.";

      this.targetGroup = AI_group(this, "Target image");
      this.target_ViewList = new ViewList(this.targetGroup);
      this.target_ViewList.getAll();
      this.target_ViewList.toolTip = "Select an open image or preview to inspect. You can also open a file after launching the script.";
      this.target_ViewList.onViewSelected = view => this.selectTarget(view);
      this.openImage_Button = new PushButton(this.targetGroup);
      this.openImage_Button.text = "Open image…";
      this.openImage_Button.toolTip = "Open an image file and select it as the target.";
      this.openImage_Button.onClick = () => this.openImage();
      var targetRow = new HorizontalSizer;
      targetRow.spacing = 8;
      targetRow.add(this.target_ViewList, 100);
      targetRow.add(this.openImage_Button);
      this.targetInfo = new Label(this.targetGroup);
      this.targetInfo.wordWrapping = true;
      this.targetGroup.sizer.add(targetRow);
      this.targetGroup.sizer.add(this.targetInfo);

      this.layoutGroup = AI_group(this, "Mosaic layout");
      this.mosaic_NC = this.number(this.layoutGroup, "Rows and columns:", ai_data.mosaicSize,
         MIN_MOSAIC_SIZE, MAX_MOSAIC_SIZE, 0, "Number of rows and columns: 2 to 9. For example, 3 creates a 3 × 3 mosaic with 9 panels.",
         value => { ai_data.mosaicSize = Math.round(value); this.updateStatus(); });
      this.panel_NC = this.number(this.layoutGroup, "Panel size (px):", ai_data.panelSize,
         MIN_PANEL_SIZE, MAX_PANEL_SIZE, 0, "Width and height of each square panel. Reduced automatically if needed to fit the selected image and grid.",
         value => { ai_data.panelSize = Math.round(value); this.updateStatus(); });
      this.layoutGroup.sizer.add(this.mosaic_NC);
      this.layoutGroup.sizer.add(this.panel_NC);

      this.appearanceGroup = AI_group(this, "Mosaic appearance");
      this.gap_NC = this.number(this.appearanceGroup, "Separation (px):", ai_data.separationSize,
         MIN_SEPARATION_SIZE, MAX_SEPARATION_SIZE, 0, "Gap between adjacent panels, from 0 to 16 pixels.",
         value => { ai_data.separationSize = Math.round(value); this.updateStatus(); });
      this.brightness_NC = this.number(this.appearanceGroup, "Background brightness:", ai_data.separationColor,
         MIN_SEPARATION_COLOR, MAX_SEPARATION_COLOR, 2, "Brightness of the gaps: 0 is black and 1 is white.",
         value => { ai_data.separationColor = value; });
      this.appearanceGroup.sizer.add(this.gap_NC);
      this.appearanceGroup.sizer.add(this.brightness_NC);

      this.status = new Label(this);
      this.status.wordWrapping = true;
      this.status.minHeight = 2 * this.font.height;
      this.instanceButton = AI_tool(this, ":/process-interface/new-instance.png",
         "Drag to save the mosaic settings as a process icon. Apply the icon to an image later. A target is not required.", () => {});
      this.instanceButton.onMousePress = () => { ai_data.exportParameters(); this.newInstance(); };
      this.resetButton = AI_tool(this, ":/process-interface/reset.png",
         "Reset mosaic settings. The selected target is retained.", () => this.resetSettings());
      this.applyButton = AI_tool(this, ":/process-interface/execute.png",
         "Apply to the selected image. Create a mosaic and keep this dialog open.", () => this.applyTarget());
      this.closeButton = AI_tool(this, ":/process-interface/cancel.png", "Close AberrationInspectorTG.", () => this.cancel());
      this.helpButton = AI_tool(this, ":/process-interface/browse-documentation.png", "Open the PiDoc user guide.", AI_showDocumentation);
      var actions = new HorizontalSizer;
      actions.spacing = 8;
      actions.add(this.instanceButton);
      actions.add(this.resetButton);
      actions.addStretch();
      actions.add(this.applyButton);
      actions.add(this.closeButton);
      actions.add(this.helpButton);

      this.sizer = new VerticalSizer;
      this.sizer.margin = 10;
      this.sizer.spacing = 8;
      this.sizer.add(this.intro);
      this.sizer.add(this.targetGroup);
      this.sizer.add(this.layoutGroup);
      this.sizer.add(this.appearanceGroup);
      this.sizer.add(this.status);
      this.sizer.add(actions);
      this.selectTarget(ai_data.targetView);
      this.adjustToContents();
      this.setFixedSize();
   }

   number(parent, label, value, low, high, precision, tip, handler)
   {
      var control = new NumericControl(parent);
      control.label.text = label;
      control.label.setScaledFixedWidth(160);
      control.edit.setScaledFixedWidth(70);
      control.slider.setRange(0, precision > 0 ? 100 : high - low);
      control.slider.setScaledMinWidth(220);
      control.setRange(low, high);
      control.setPrecision(precision);
      control.setReal(precision > 0);
      control.setValue(value);
      control.toolTip = tip;
      control.onValueUpdated = handler;
      return control;
   }

   selectTarget(view)
   {
      ai_data.targetView = view != null && !view.isNull ? view : null;
      if (ai_data.targetView != null)
         this.target_ViewList.currentView = ai_data.targetView;
      this.updateStatus();
   }

   updateStatus()
   {
      if (!this.status)
         return;
      var view = ai_data.targetView;
      var available = view != null && !view.isNull;
      this.targetInfo.text = available ? view.image.width + " × " + view.image.height + " pixels · " +
         view.image.numberOfChannels + (view.image.numberOfChannels == 1 ? " channel" : " channels") +
         (view.isMainView ? "" : " · preview") : "Select an open image, or use Open image to load a file.";
      var panel = available ? AI_panelSize(view) : ai_data.panelSize;
      var n = ai_data.mosaicSize;
      if (panel < MIN_PANEL_SIZE)
         this.status.text = "Target too small: " + n + " × " + n + " panels need an image at least " +
            (n * MIN_PANEL_SIZE) + " × " + (n * MIN_PANEL_SIZE) + " pixels.\nReduce Rows and columns, or select another image.";
      else
      {
         var side = n * panel + (n - 1) * ai_data.separationSize;
         this.status.text = (available ? "Output: " : "Requested output: ") + side + " × " + side +
            " pixels · " + n + " × " + n + " panels of " + panel + " × " + panel + " pixels.\n" +
            (panel < ai_data.panelSize ? "Panel size reduced to fit the target. Apply creates a new image." :
               available ? "Apply creates a new image. New Instance saves the settings for later." :
                  "Panels shrink to fit the target. New Instance saves the settings for later.");
      }
   }

   openImage()
   {
      var chooser = new OpenFileDialog;
      chooser.caption = "Open target image";
      chooser.multipleSelections = false;
      chooser.loadImageFilters();
      if (!chooser.execute())
         return;
      try
      {
         var windows = ImageWindow.open(chooser.filePath);
         if (windows.length == 0)
            throw Error("The file contains no image.");
         for (var i = 0; i < windows.length; ++i)
            windows[i].show();
         this.target_ViewList.getAll();
         this.selectTarget(windows[0].mainView);
      }
      catch (error) { this.showError(error); }
   }

   applyTarget()
   {
      this.applyButton.enabled = false;
      try
      {
         AI_run(ai_data.targetView);
         // Refresh choices without replacing the selected source with the output.
         var target = ai_data.targetView;
         this.target_ViewList.getAll();
         this.selectTarget(target);
      }
      catch (error) { this.showError(error); }
      finally { this.applyButton.enabled = true; }
   }

   showError(error)
   {
      (new MessageBox(String(error.message || error), TITLE, StdIcon.Warning, StdButton.Ok)).execute();
   }

   resetSettings()
   {
      var target = ai_data.targetView;
      ai_data = new parametersPrototype;
      ai_data.targetView = target;
      this.mosaic_NC.setValue(ai_data.mosaicSize);
      this.panel_NC.setValue(ai_data.panelSize);
      this.gap_NC.setValue(ai_data.separationSize);
      this.brightness_NC.setValue(ai_data.separationColor);
      this.updateStatus();
   }
};

function main()
{
   Console.hide();
   if (Parameters.isGlobalTarget || Parameters.isViewTarget)
      ai_data.importParameters();
   if (Parameters.isViewTarget)
      AI_run(Parameters.targetView);
   else
   {
      if (ai_data.targetView == null || ai_data.targetView.isNull)
      {
         var window = ImageWindow.activeWindow;
         if (window != null && !window.isNull)
            ai_data.targetView = window.currentView;
      }
      (new AI_dialog).execute();
   }
}

main();
