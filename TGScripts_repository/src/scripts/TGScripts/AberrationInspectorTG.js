// ****************************************************************************
// PixInsight JavaScript Runtime API - PJSR Version 1.0
// ****************************************************************************
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
#define VERSION "2.0"

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

#include <pjsr/ColorSpace.jsh>
#include <pjsr/DataType.jsh>
#include <pjsr/FrameStyle.jsh>
#include <pjsr/NumericControl.jsh>
#include <pjsr/SampleType.jsh>
#include <pjsr/Sizer.jsh>
#include <pjsr/UndoFlag.jsh>

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
   for (var i = 1; !View.viewById(id).isNull; ++i)
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
      baseImage.sampleType == SampleType_Real,
      baseImage.colorSpace != ColorSpace_Gray,
      viewId
   );
}

// The script's parameters prototype.
function parametersPrototype()
{
   this.targetView      = null;
   this.view_id         = "";
   this.mosaicSize      = DEFAULT_MOSAIC_SIZE;
   this.panelSize       = DEFAULT_PANEL_SIZE;
   this.separationSize  = DEFAULT_SEPARATION_SIZE;
   this.separationColor = DEFAULT_SEPARATION_COLOR;

   /*
    * Save parameters in process icon.
    */
   this.exportParameters = function()
   {
      Parameters.clear();
      Parameters.set("view_id"        , this.view_id);
      Parameters.set("mosaicSize"     , this.mosaicSize);
      Parameters.set("panelSize"      , this.panelSize);
      Parameters.set("separationSize" , this.separationSize);
      Parameters.set("separationColor", this.separationColor);
   }

   /*
    * Restore saved parameters.
    */
   this.importParameters = function()
   {
      if (Parameters.has("view_id"))
      {
         this.view_id = Parameters.getString("view_id");
         if(this.view_id)
         {
            var window = ImageWindow.windowById(this.view_id);
            if(!window.isNull)
            {
               this.targetView = window.mainView;
            }
         }
      }
      this.mosaicSize      = Parameters.has("mosaicSize") ? Parameters.getInteger("mosaicSize") : DEFAULT_MOSAIC_SIZE;
      this.mosaicSize      = clipValueRange(this.mosaicSize, MIN_MOSAIC_SIZE, MAX_MOSAIC_SIZE);
      this.panelSize       = Parameters.has("panelSize") ? Parameters.getInteger("panelSize") : DEFAULT_PANEL_SIZE;
      this.panelSize       = clipValueRange(this.panelSize, MIN_PANEL_SIZE, MAX_PANEL_SIZE);
      this.separationSize  = Parameters.has("separationSize") ? Parameters.getInteger("separationSize") : DEFAULT_SEPARATION_SIZE;
      this.separationSize  = clipValueRange(this.separationSize, MIN_SEPARATION_SIZE, MAX_SEPARATION_SIZE);
      this.separationColor = Parameters.has("separationColor") ? Parameters.getReal("separationColor") : DEFAULT_SEPARATION_COLOR;
      this.separationColor = clipValueRange(this.separationColor, MIN_SEPARATION_COLOR, MAX_SEPARATION_COLOR);
   }
}

var ai_data = new parametersPrototype();

// Returns a push button with given text and onClick function.
function pushButtonWithTextOnClick(parent, text_, onClick_)
{
   var button = new PushButton(parent);

   button.text = text_;
   button.onClick = onClick_;

   return button;
}

// The script's parameters dialog prototype.
function parametersDialogPrototype()
{
   this.__base__ = Dialog;
   this.__base__();

   var labelMinWidth = Math.round(this.font.width("Separation color:") + 2.0 * this.font.width('M'));

   var sliderMaxValue = 256;
   var sliderMinWidth = 256;

   var spinBoxWidth = Math.round(6.0 * this.font.width('M'));

   this.windowTitle = TITLE;

   //--------------------------------------------------------------------------
   this.titlePane = new Label (this);
   with( this.titlePane )
   {
      frameStyle = FrameStyle_Box;
      margin = 4;
      wordWrapping = true;
      useRichText = true;
      text = "<p><b>" + TITLE + " Version " + VERSION + "</b> &mdash; "
           + "This script generates a <i>n</i> x <i>n</i> panel mosaic of subsections of a view. Subsections are "
           + "organized along horizontal and vertical bands across the view, including its corners, "
           + "edges and central areas.</p>"
           + "<p>Copyright &copy; 2012-2015 Mike Schuster. All Rights Reserved.</p>"
           + "<p> Modified 2022 by Thorsten Glebe</p>";
   }

   //--------------------------------------------------------------------------
   this.viewList = new ViewList(this);
   this.viewListNullCurrentView = this.viewList.currentView;
   with( this.viewList )
   {
      getMainViews();
      if ( ai_data.targetView )
      {
         currentView = ai_data.targetView;
         ai_data.view_id = currentView.id;
      }

      onViewSelected = function(view)
      {
         if(view.id)
         {
            ai_data.targetView = view;
            ai_data.view_id    = view.id;
         }
         else
         {
            ai_data.targetView = null;
            ai_data.view_id = "";
         }
      }
   }

   this.targetView_Sizer = new HorizontalSizer;
   this.targetView_Sizer.add(this.viewList);

   //--------------------------------------------------------------------------
   this.mosaicLabel = new Label(this);
   with( this.mosaicLabel )
   {
      text = "Mosaic size:";
      textAlignment = TextAlign_Right | TextAlign_VertCenter;
      setFixedWidth(labelMinWidth);

      toolTip = "<p>Number of rows and columns in the mosaic.</p>";
   }

   this.mosaicSpinBox = new SpinBox(this);
   with( this.mosaicSpinBox )
   {
      setRange(MIN_MOSAIC_SIZE, MAX_MOSAIC_SIZE);
      setFixedWidth(spinBoxWidth);
      value = ai_data.mosaicSize;

      toolTip = "<p>Number of rows and columns in the mosaic.</p>";

      onValueUpdated = function(value) {ai_data.mosaicSize = value;}
   }

   this.mosaicSize = new HorizontalSizer;
   with( this.mosaicSize )
   {
      spacing = 4;
      add(this.mosaicLabel);
      add(this.mosaicSpinBox);
      addStretch();
   }

   //--------------------------------------------------------------------------
   this.panelSize = new NumericControl(this);
   with( this.panelSize )
   {
      label.text = "Panel size:";
      label.minWidth = labelMinWidth;
      slider.setRange(0, sliderMaxValue);
      slider.minWidth = sliderMinWidth;
      setRange(MIN_PANEL_SIZE.0, MAX_PANEL_SIZE.0);
      setPrecision(0);
      setValue(ai_data.panelSize);

      toolTip = "<p>Width and height in pixels of each panel in the mosaic.</p>";

      onValueUpdated = function(value) {ai_data.panelSize = Math.round(value);}
   }

   this.separationSize = new NumericControl(this);
   with( this.separationSize )
   {
      label.text = "Separation size:";
      label.minWidth = labelMinWidth;
      slider.setRange(0, sliderMaxValue);
      slider.minWidth = sliderMinWidth;
      setRange(MIN_SEPARATION_SIZE.0, MAX_SEPARATION_SIZE.0);
      setPrecision(0);
      setValue(ai_data.separationSize);

      toolTip = "<p>Separation in pixels between each panel in the mosaic.</p>";

      onValueUpdated = function(value) {ai_data.separationSize = Math.round(value);}
   }

   this.separationColor = new NumericControl(this);
   with( this.separationColor )
   {
      label.text = "Separation color:";
      label.minWidth = labelMinWidth;
      slider.setRange(0, sliderMaxValue);
      slider.minWidth = sliderMinWidth;
      setRange(MIN_SEPARATION_COLOR, MAX_SEPARATION_COLOR);
      setPrecision(2);
      setValue(ai_data.separationColor);

      toolTip = "<p>Color of separation between each panel in the mosaic, where 0 is black and 1 is white.</p>";

      onValueUpdated = function(value) {ai_data.separationColor = value;}
   }

   this.parameterPane = new VerticalSizer;
   with( this.parameterPane )
   {
      margin  = 6;
      spacing = 4;
      add(this.mosaicSize);
      add(this.panelSize);
      add(this.separationSize);
      add(this.separationColor);
   }

   //--------------------------------------------------------------------------
   // usual control buttons
   this.newInstance_Button = new ToolButton(this);
   with( this.newInstance_Button )
   {
      icon = scaledResource(":/process-interface/new-instance.png");
      toolTip = "New Instance";

      onMousePress = function()
      {
         this.hasFocus = true;
         ai_data.exportParameters();
         this.pushed = false;
         this.dialog.newInstance();
      }
   }

   this.buttonPane = new HorizontalSizer;
   with( this.buttonPane )
   {
      spacing = 6;
      add(this.newInstance_Button);
      addStretch();
      add(pushButtonWithTextOnClick(this, "OK", function() {this.dialog.ok();}));
      add(pushButtonWithTextOnClick(this, "Cancel", function() {this.dialog.cancel();}));
   }

   this.sizer = new VerticalSizer;
   with( this.sizer )
   {
      margin = 6;
      spacing = 6;
      add(this.titlePane);
      add(this.targetView_Sizer);
      add(this.parameterPane);
      add(this.buttonPane);
   }

   this.adjustToContents();
   this.setFixedSize();
}

parametersDialogPrototype.prototype = new Dialog;

// The script's process prototype.
function processPrototype()
{

   this.writeParameters = function(ai_data)
   {
      console.writeln("Target view: ", ai_data.targetView.fullId);
      console.writeln("Mosaic size: ", format("%d", ai_data.mosaicSize));
      console.writeln("Panel size: ", format("%dpx", ai_data.panelSize));
      console.writeln("Separation size: ", format("%dpx", ai_data.separationSize));
      console.writeln("Separation color: ", format("%.2f", ai_data.separationColor));
   }

   this.createImageWindowOfView = function(view)
   {
      var imageWindow = createImageWindow(
         view.image.width, view.image.height, uniqueViewId(mainViewIdOfView(view)), view.image
      );

      imageWindow.mainView.beginProcess(UndoFlag_NoSwapFile);

      imageWindow.mainView.image.selectedPoint = new Point(0, 0);
      imageWindow.mainView.image.apply(view.image);
      imageWindow.mainView.image.resetSelections();

      imageWindow.mainView.endProcess();

      return imageWindow;
   }

   this.createMosaicImageWindowOfImageWindow = function(targetImageWindow)
   {
      var targetWidth = targetImageWindow.mainView.image.width;
      var targetHeight = targetImageWindow.mainView.image.height;

      var panelSize = ai_data.panelSize;
      panelSize = Math.min(panelSize, Math.floor(targetWidth / ai_data.mosaicSize));
      panelSize = Math.min(panelSize, Math.floor(targetHeight / ai_data.mosaicSize));
      if (panelSize < MIN_PANEL_SIZE) {
         (new MessageBox(
            "<p>Source view is too small for the given mosaic generation parameters.</p>",
            TITLE,
            StdIcon_Error,
            StdButton_Ok
         )).execute();
         return null;
      }

      var mosaicSize = ai_data.mosaicSize * panelSize + (ai_data.mosaicSize - 1) * ai_data.separationSize;

      var mosaicImageWindow = createImageWindow(
         mosaicSize, mosaicSize, uniqueViewId(mainViewIdOfView(ai_data.targetView) + "_mosaic"), targetImageWindow.mainView.image
      );

      var columnPositions = new Array(ai_data.mosaicSize);
      for (var i = 0; i != columnPositions.length; ++i)
      {
         columnPositions[i] = Math.round((i / (ai_data.mosaicSize - 1)) * (targetWidth - panelSize));
      }
      var rowPositions = new Array(ai_data.mosaicSize);
      for (var i = 0; i != rowPositions.length; ++i)
      {
         rowPositions[i] = Math.round((i / (ai_data.mosaicSize - 1)) * (targetHeight - panelSize));
      }

      var targetBounds = new Rect(0, 0, panelSize, panelSize);
      var targetViewId = "_";

      mosaicImageWindow.mainView.beginProcess(UndoFlag_NoSwapFile);

      mosaicImageWindow.mainView.image.fill(ai_data.separationColor);

      for (var x = 0; x != ai_data.mosaicSize; ++x)
      {
         for (var y = 0; y != ai_data.mosaicSize; ++y)
         {
            targetBounds.moveTo(new Point(columnPositions[x], rowPositions[y]));
            targetImageWindow.createPreview(targetBounds, targetViewId);

            mosaicImageWindow.mainView.image.selectedPoint = new Point(
               x * (panelSize + ai_data.separationSize),
               y * (panelSize + ai_data.separationSize)
            );
            mosaicImageWindow.mainView.image.apply(targetImageWindow.previewById(targetViewId).image);

            targetImageWindow.deletePreview(targetImageWindow.previewById(targetViewId));
         }
      }
      mosaicImageWindow.mainView.image.resetSelections();

      mosaicImageWindow.mainView.endProcess();

      mosaicImageWindow.mainView.stf = ai_data.targetView.stf;
      mosaicImageWindow.show();

      return mosaicImageWindow;
   }

   this.execute = function()
   {
      ai_data.targetView.beginProcess(UndoFlag_NoSwapFile);
      var targetImageWindow = this.createImageWindowOfView(ai_data.targetView);
      var mosaicImageWindow = this.createMosaicImageWindowOfImageWindow(targetImageWindow);
      targetImageWindow.forceClose();
      ai_data.targetView.endProcess();
   }
}

var process = new processPrototype();

function main()
{
   Console.hide();

   if (Parameters.isViewTarget)
   {
      ai_data.importParameters();
      ai_data.targetView = Parameters.targetView;
      ai_data.view_id    = Parameters.targetView.id;
      process.execute();
      return;
   }
   else
   {
      ai_data.importParameters();
      if(!ai_data.targetView)
      {
         // Get access to the active image window
         var window = ImageWindow.activeWindow;
         if (!window.isNull)
         {
            ai_data.targetView = window.currentView;
            ai_data.view_id    = window.currentView.id;
         }
      }
   }

   var dialog = new parametersDialogPrototype();
   for ( ;; )
   {
      if ( !dialog.execute() )
         return;

      // A view must be selected.
      if ( !ai_data.targetView )
      {
         var msg = new MessageBox( "You must select a view to apply this script.",
                                   TITLE, StdIcon_Error, StdButton_Ok );
         msg.execute();
         continue;
      }

      break;
   }

   process.execute();
}

main();

// ****************************************************************************
// EOF AberrationInspector.js - Released 2015/08/06 00:00:00 UTC
