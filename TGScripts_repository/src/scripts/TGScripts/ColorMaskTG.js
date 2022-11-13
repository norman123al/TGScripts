// ----------------------------------------------------------------------------
// PixInsight JavaScript Runtime API - PJSR Version 1.0
// ----------------------------------------------------------------------------
// ColorMask.js - Released 2017-07-07T12:11:59Z
// ----------------------------------------------------------------------------
//
// This file is part of ColorMask Script version 1.0
//
// Copyright (C) 2015-2017 Rick Stevenson. All rights reserved.
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
// ----------------------------------------------------------------------------

/*
 * ColorMask v1.0
 *
 * Build a mask to select a color range in an image.
 *
 * Copyright (C) 2015-2017 Rick Stevenson (rsj.stevenson@gmail.com). All rights reserved.
 *
 * Modified 2022 by Thorsten Glebe
 *    1. fixed hue issue
 *    2. make "linear" the default mask mode
 *    3. add "min Intensity" slider for better pixel selection
 *    4. add "max Intensity" slider for better pixel selection
 *    5. add "min Saturation" slider for better pixel selection
 *    6. add "max Saturation" slider for better pixel selection
 *    7. add "inverse lightness mask" as new mask mode
 *    8. add "mask name" to specify the name of the mask instead of generated name
 *    9. code refactorings
 *   10. enhance "new instance" button to store full state of GUI
 */

#feature-id    ColorMaskTG : TG Scripts > ColorMaskTG

#feature-info  A script that creates a mask selecting a specified color range

#include <pjsr/Sizer.jsh>
#include <pjsr/FrameStyle.jsh>
#include <pjsr/NumericControl.jsh>
#include <pjsr/TextAlign.jsh>
#include <pjsr/StdButton.jsh>
#include <pjsr/StdIcon.jsh>

#include "lib/TGScriptsLib.js"

#define VERSION   "2.0"
#define TITLE     "ColorMaskTG"

#define DEBUG     false

// Predefined hue ranges.
#define MIN_RED         300
#define MAX_RED         60

#define MIN_YELLOW      0
#define MAX_YELLOW      120

#define MIN_GREEN       60
#define MAX_GREEN       180

#define MIN_CYAN        120
#define MAX_CYAN        240

#define MIN_BLUE        180
#define MAX_BLUE        300

#define MIN_MAGENTA     240
#define MAX_MAGENTA     0

#define DEFAULT_STRENGTH        1.0
#define DEFAULT_MIN_INTENSITY   0.0
#define DEFAULT_MAX_INTENSITY   1.0
#define DEFAULT_MIN_SATURATION  0.0
#define DEFAULT_MAX_SATURATION  1.0

// Mask types
#define MASK_CHROMINANCE   0
#define MASK_LIGHTNESS     1
#define MASK_INV_LIGHTNESS 2
#define MASK_LINEAR        3

// Mask name suffix
#define CM_SUFF         "_cm"

// maximum length of user provided mask name
#define MASK_NAME_MAX_LENGHT 30

/*
 * The ColorMaskData object defines functional parameters for the
 * ColorMask routine.
 */
function ColorMaskData()
{
   this.targetView     = null;
   this.view_id        = "";
   this.minHue_control = null;
   this.maxHue_control = null;
   this.minHue         = 0.0;
   this.maxHue         = 0.0;
   this.maskType       = MASK_LINEAR;
   this.maskStrength   = DEFAULT_STRENGTH;
   this.min_intensity  = DEFAULT_MIN_INTENSITY;
   this.max_intensity  = DEFAULT_MAX_INTENSITY;
   this.min_saturation = DEFAULT_MIN_SATURATION;
   this.max_saturation = DEFAULT_MAX_SATURATION;
   this.blurLayers     = 0;
   this.maskSuff       = "";
   this.maskName       = "";

   /*
    * Save parameters in process icon.
    */
   this.exportParameters = function()
   {
      Parameters.set("view_id"       , this.view_id);
      Parameters.set("minHue"        , this.minHue);
      Parameters.set("maxHue"        , this.maxHue);
      Parameters.set("maskType"      , this.maskType);
      Parameters.set("maskStrength"  , this.maskStrength);
      Parameters.set("min_intensity" , this.min_intensity);
      Parameters.set("max_intensity" , this.max_intensity);
      Parameters.set("min_saturation", this.min_saturation);
      Parameters.set("max_saturation", this.max_saturation);
      Parameters.set("blurLayers"    , this.blurLayers);
      Parameters.set("maskName"      , this.maskName);
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
      if(Parameters.has("minHue"))
         this.minHue = Parameters.getReal("minHue");
      if(Parameters.has("maxHue"))
         this.maxHue = Parameters.getReal("maxHue");
      if (Parameters.has("maskType"))
         this.maskType = Parameters.getInteger("maskType");
      if(Parameters.has("maskStrength"))
         this.maskStrength = Parameters.getReal("maskStrength");
      if(Parameters.has("min_intensity"))
         this.min_intensity = Parameters.getReal("min_intensity");
      if(Parameters.has("max_intensity"))
         this.max_intensity = Parameters.getReal("max_intensity");
      if(Parameters.has("min_saturation"))
         this.min_saturation = Parameters.getReal("min_saturation");
      if(Parameters.has("max_saturation"))
         this.max_saturation = Parameters.getReal("max_saturation");
      if(Parameters.has("blurLayers"))
         this.blurLayers = Parameters.getInteger("blurLayers");
      if(Parameters.has("maskName"))
         this.maskName = Parameters.getString("maskName");
   }
}

// Global parameters.
var data = new ColorMaskData;

/*
 * Create color mask for specified image.
 * name is used to generate a unique name for the result.
 */
function doWork()
{
   var image = data.targetView.image;
   var name  = data.targetView.id;

   data.targetView.beginProcess(UndoFlag_NoSwapFile);
   var t0 = new Date;

   if (DEBUG)
   {
      console.writeln("ColorMask: ", name);
      console.writeln("Minpoint: ", format("%6.3f", data.minHue));
      console.writeln("Maxpoint: ", format("%6.3f", data.maxHue));
      console.writeln("Mask type: ", format("%d", data.maskType));
      console.writeln("Mask strength: ", format("%4.3f", data.maskStrength));
      console.writeln("Min Intensity: ", format("%4.3f", data.min_intensity));
      console.writeln("Max Intensity: ", format("%4.3f", data.max_intensity));
      console.writeln("Min Saturation: ", format("%4.3f", data.min_saturation));
      console.writeln("Max Saturation: ", format("%4.3f", data.max_saturation));
      console.writeln("Mask suffix: ", data.maskSuff);
      console.writeln("Mask name: ", data.maskName);
   }

   // Pick an unused name for the mask
   var MaskName = null;
   if(data.maskName)
   { // take given mask name
      MaskName = data.maskName;
   }
   else
   { // construct a mask name
      if (ImageWindow.windowById(name + CM_SUFF + data.maskSuff).isNull)
         MaskName = name + CM_SUFF + data.maskSuff;
      else
      {
         for (var n = 1 ; n <= 99 ; n++)
         {
            if (ImageWindow.windowById(name + CM_SUFF + data.maskSuff + n).isNull)
            {
               MaskName = name + CM_SUFF + data.maskSuff + n;
               break;
            }
         }
      }
      if (MaskName == null)
      {
         errorMessageOk("Couldn't find a unique mask name. Bailing out.", TITLE);
         return;
      }
   }

   // Build an ugly PixelMath expression to build the mask
   var PM = new PixelMath;

   var min = data.minHue/360;
   var max = data.maxHue/360;
   var mtfBal = 1 - data.maskStrength;
   var min_intensity  = data.min_intensity;
   var max_intensity  = data.max_intensity;
   var min_saturation = data.min_saturation;
   var max_saturation = data.max_saturation;

   var mid;
   var ldist;
   var rdist;
   var maskMod;

   switch (data.maskType) {
      case MASK_CHROMINANCE:
         maskMod = "*CIEc($T)";
         break;
      case MASK_LIGHTNESS:
         maskMod = "*CIEL($T)";
         break;
      case MASK_INV_LIGHTNESS:
         maskMod = "*~CIEL($T)";
         break;
      case MASK_LINEAR:
         maskMod = "";
         break;
   }

   if (min < max)
   {
      // Range: 0..min..mid..max..1
      if (DEBUG)
         console.writeln("Range: 0..min..mid..max..1");
      mid = (min + max)/2;
      ldist = mid-min;
      rdist = max-mid;
      PM.expression = "iif(Si($T)>=" + min_saturation + " && Si($T)<=" + max_saturation + "," +
                      "iif(I($T)>=" + min_intensity + " && I($T)<=" + max_intensity + "," +
                      "iif(H($T)<"  + min + ",0," +
                      "iif(H($T)<=" + mid + ",~mtf((H($T)-" + min + ")/" + ldist + "," + mtfBal + ")" + maskMod + "," +
                      "iif(H($T)<=" + max + ",~mtf((" + max + "-H($T))/" + rdist + "," + mtfBal + ")" + maskMod + ",0))),0),0)";
   }
   else
   {
      mid = (min + max+1)/2;
      if (mid < 1)
      {
         // Range: 0..max..min..mid..1
         if (DEBUG)
         console.writeln("Range: 0..max..min..mid..1");
         ldist = mid - min;
         rdist = max + 1 - mid;
         PM.expression = "iif(Si($T)>=" + min_saturation + " && Si($T)<=" + max_saturation + "," +
                         "iif(I($T)>=" + min_intensity + " && I($T)<=" + max_intensity + "," +
                         "iif(H($T)<=" + max + ",~mtf((" + max + "-H($T))/" + rdist + "," + mtfBal + ")" + maskMod + "," +
                         "iif(H($T)<"  + min + ",0," +
                         "iif(H($T)<=" + mid + ",~mtf((H($T)-" + min + ")/" + ldist + "," + mtfBal + ")" + maskMod + "," +
                             "~mtf((1+" + max + "-H($T))/" + rdist + "," + mtfBal + ")" + maskMod + "))),0),0)";
      }
      else
      {
         mid = mid - 1;
         // Range: 0..mid..max..min..1
         if (DEBUG)
            console.writeln("Range: 0..mid..max..min..1");
         ldist = mid + 1 - min;
         rdist = max - mid;
         PM.expression = "iif(Si($T)>=" + min_saturation + " && Si($T)<=" + max_saturation + "," +
                         "iif(I($T)>=" + min_intensity + " && I($T)<=" + max_intensity + "," +
                         "iif(H($T)<=" + mid + ",~mtf((H($T)+1-" + min + ")/" + ldist + "," + mtfBal + ")" + maskMod + "," +
                         "iif(H($T)<=" + max + ",~mtf((" + max + "-H($T))/" + rdist + "," + mtfBal + ")" + maskMod + "," +
                         "iif(H($T)<"  + min + ",0,~mtf((" + "H($T)-" + min + ")/" + ldist + "," + mtfBal + ")" + maskMod + "))),0),0)";
      }
   }

   PM.expression1 = "";
   PM.expression2 = "";
   PM.expression3 = "";
   PM.useSingleExpression = true;
   PM.symbols = "";
   PM.generateOutput = true;
   PM.singleThreaded = false;
   PM.use64BitWorkingImage = false;
   PM.rescale = true;
   PM.rescaleLower = 0;
   PM.rescaleUpper = 1;
   PM.truncate = true;
   PM.truncateLower = 0;
   PM.truncateUpper = 1;
   PM.createNewImage = true;
   PM.showNewImage = true;
   PM.newImageId = MaskName;
   PM.newImageWidth = image.width;
   PM.newImageHeight = image.height;
   PM.newImageAlpha = false;
   PM.newImageColorSpace = PixelMath.prototype.Gray;
   PM.newImageSampleFormat = PixelMath.prototype.f32;
   PM.executeOn(data.targetView, false /*swapFile */);

   if (data.blurLayers > 0)
   {
      // Apply a blur to mask using MLT
      var MLT = new MultiscaleLinearTransform;

      var layers = new Array(data.blurLayers + 1);
      for (var n = 0 ; n < data.blurLayers ; n++)
         layers[n] = [false, true, 0.000, false, 3.000, 1.00, 1];
      layers[n] = [true, true, 0.000, false, 3.000, 1.00, 1];
      MLT.layers = layers;

      MLT.transform = MultiscaleLinearTransform.prototype.StarletTransform;
      MLT.scaleDelta = 0;
      MLT.scalingFunctionData = [
         0.25,0.5,0.25,
         0.5,1,0.5,
         0.25,0.5,0.25
      ];
      MLT.scalingFunctionRowFilter = [
       0.5,
       1,
       0.5
      ];
      MLT.scalingFunctionColFilter = [
       0.5,
       1,
       0.5
      ];
      MLT.scalingFunctionNoiseSigma = [
         0.8003,0.2729,0.1198,
         0.0578,0.0287,0.0143,
         0.0072,0.0036,0.0019,
         0.001
      ];
      MLT.scalingFunctionName = "Linear Interpolation (3)";
      MLT.linearMask = false;
      MLT.linearMaskAmpFactor = 100;
      MLT.linearMaskSmoothness = 1.00;
      MLT.linearMaskInverted = true;
      MLT.linearMaskPreview = false;
      MLT.largeScaleFunction = MultiscaleLinearTransform.prototype.NoFunction;
      MLT.curveBreakPoint = 0.75;
      MLT.noiseThresholding = false;
      MLT.noiseThresholdingAmount = 1.00;
      MLT.noiseThreshold = 3.00;
      MLT.softThresholding = true;
      MLT.useMultiresolutionSupport = false;
      MLT.deringing = false;
      MLT.deringingDark = 0.1000;
      MLT.deringingBright = 0.0000;
      MLT.outputDeringingMaps = false;
      MLT.lowRange = 0.0000;
      MLT.highRange = 0.0000;
      MLT.previewMode = MultiscaleLinearTransform.prototype.Disabled;
      MLT.previewLayer = 0;
      MLT.toLuminance = true;
      MLT.toChrominance = true;
      MLT.linear = false;

      MLT.executeOn(ImageWindow.windowById(MaskName).mainView, false /*swapFile */);
   }


   data.targetView.endProcess();
   var t1 = new Date;
   Console.show();
   Console.writeln(format("<end><cbr>ColorMask: %.2f s", (t1.getTime() - t0.getTime())/1000));
}

/*
 * Set up a canned color range.
 */
function SetCannedRange(min, max, suff)
{
   data.minHue = min;
   data.minHue_control.setValue(data.minHue);
   data.maxHue = max;
   data.maxHue_control.setValue(data.maxHue);
   data.maskSuff = suff;
}

// -------------------------------------------------------------------------
function getAllMainViews()
{
   var mainViews = [];
   var images = ImageWindow.windows;
   for ( var i in images )
   {
      if (images[i].mainView.isMainView) mainViews.push(images[i].mainView);
   }
   return mainViews;
}

// -------------------------------------------------------------------------
function excludeViews(vList)
{
   excludeMainViewsByColor(vList, true /*excludeMono*/);
}

/*
 * ColorMaskDialog is the GUI that collects the user parameters.
 */
function ColorMaskDialog()
{
   this.__base__ = Dialog;
   this.__base__();

   var labelMinWidth = Math.round(this.font.width("Start hue:") + 2.0 * this.font.width('M'));
   var sliderMaxValue = 360;
   var sliderMinWidth = 256;

   // -------------------------------------------------------------------------
   this.helpLabel = new Label(this);
   with( this.helpLabel )
   {
      frameStyle = FrameStyle_Box;
      margin = 4;
      wordWrapping = true;
      useRichText = true;
      text = "<b>" + TITLE + " v" + VERSION + "</b> &mdash; This script builds a mask "
           + "selecting a range of colors from a target image.</p>" +
           + "<p>The range of colors is described by selecting a start and end hue "
           + "(each expressed as a hue angle between 0 and 360°) or by clicking on one of the "
           + "predefined color range buttons.</p>"
           + "<p>The mask type can be Chrominance (more saturated colors are selected more strongly), "
           + "Lightness (brighter areas are selected more strongly) or Linear "
           + "(selection is only based on distance from the center of the color range.)"
           + "<p>The Strength slider controls how strongly hues away from the midpoint of the "
           + "selected range are included in the mask."
           + "<p>Mask Blur provides the option to blur the mask by removing the specified "
           + "number of small scale wavelet layers with MultiscaleLinearTransform."
           + "<p>Copyright &copy; 2015-2017 Rick Stevenson. All rights reserved.</p>"
           + "<p> Modified 2022 by Thorsten Glebe</p>";
   }

   // -------------------------------------------------------------------------
   this.targetImage_Label = new Label(this);
   with( this.targetImage_Label )
   {
      text = "Target image: ";
      textAlignment = TextAlign_Right|TextAlign_VertCenter;
   }

   this.targetImage_ViewList = new ViewList(this);
   with( this.targetImage_ViewList )
   {
      minWidth = 360;
      getMainViews(); // include main views only
      excludeViews(this.targetImage_ViewList);

      if ( data.targetView )
      {
         currentView = data.targetView;
         if(currentView.image.isColor)
         {
            data.view_id = currentView.id;
         }
      }

      toolTip = this.targetImage_Label.toolTip = "Select the image that will be used to generate the mask.";

      onViewSelected = function(view)
      {
         if (view.id)
			{
            if (view.image.isColor)
            {
               data.targetView = view;
               data.view_id    = view.id;
            }
			}
         else
         {
				data.targetView = null;
            data.view_id    = "";
         }
      }
   }

   this.targetImage_Sizer = new HorizontalSizer;
   with( this.targetImage_Sizer )
   {
      spacing = 4;
      add(this.targetImage_Label);
      add(this.targetImage_ViewList, 100);
   }

   // -------------------------------------------------------------------------
   this.minHue = new NumericControl(this);
   with( this.minHue )
   {
      data.minHue_control = this.minHue;

      label.text = "Start Hue:";
      label.minWidth = labelMinWidth;
      slider.setRange(0, sliderMaxValue);
      slider.minWidth = sliderMinWidth;
      setRange(0.0, 360.0);
      setPrecision(4);
      setValue(data.minHue);

      toolTip = "<p>Start of the color range specified as a Hue value between 0 and 360 degrees.</p>";

      onValueUpdated = function(value) { data.minHue = value; data.maskSuff = ""; }
   }

   // -------------------------------------------------------------------------
   this.maxHue = new NumericControl(this);
   with( this.maxHue )
   {
      data.maxHue_control = this.maxHue;

      label.text = "End Hue:";
      label.minWidth = labelMinWidth;
      slider.setRange(0, sliderMaxValue);
      slider.minWidth = sliderMinWidth;
      setRange(0.0, 360.0);
      setPrecision(4);
      setValue(data.maxHue);

      toolTip = "<p>End of the color range specified as a Hue value between 0 and 360 degrees.</p>";

      onValueUpdated = function(value) { data.maxHue = value; data.maskSuff = ""; }
   }

   // -------------------------------------------------------------------------
   this.min_intensity = new NumericControl(this);
   with( this.min_intensity )
   {
      label.text = "Min Int.: ";
      label.minWidth = labelMinWidth;
      slider.setRange(0, sliderMaxValue);
      slider.minWidth = sliderMinWidth;
      setRange(0.0, 1.0);
      setPrecision(4);
      setValue(data.min_intensity);

      toolTip = "<p>Minimum intensity to select for the mask</p>";

      onValueUpdated = function(value) { data.min_intensity = value; }
   }

   // -------------------------------------------------------------------------
   this.max_intensity = new NumericControl(this);
   with( this.max_intensity )
   {
      label.text = "Max Int.:";
      label.minWidth = labelMinWidth;
      slider.setRange(0, sliderMaxValue);
      slider.minWidth = sliderMinWidth;
      setRange(0.0, 1.0);
      setPrecision(4);
      setValue(data.max_intensity);

      toolTip = "<p>Maximum intensity to select for the mask</p>";

      onValueUpdated = function(value) { data.max_intensity = value; }
   }


   // -------------------------------------------------------------------------
   this.min_saturation = new NumericControl(this);
   with( this.min_saturation )
   {
      label.text = "Min Sat.: ";
      label.minWidth = labelMinWidth;
      slider.setRange(0, sliderMaxValue);
      slider.minWidth = sliderMinWidth;
      setRange(0.0, 1.0);
      setPrecision(4);
      setValue(data.min_saturation);

      toolTip = "<p>Minimum saturation to select for the mask</p>";

      onValueUpdated = function(value) { data.min_saturation = value; }
   }

   // -------------------------------------------------------------------------
   this.max_saturation = new NumericControl(this);
   with( this.max_saturation )
   {
      label.text = "Max Sat.:";
      label.minWidth = labelMinWidth;
      slider.setRange(0, sliderMaxValue);
      slider.minWidth = sliderMinWidth;
      setRange(0.0, 1.0);
      setPrecision(4);
      setValue(data.max_saturation);

      toolTip = "<p>Maximum saturation to select for the mask</p>";

      onValueUpdated = function(value) { data.max_saturation = value; }
   }

   // -------------------------------------------------------------------------
   this.red_Button = new PushButton(this);
   with( this.red_Button )
   {
      text    = "Red";
      toolTip = "<p>Set parameters to select red hues.</p>";

      onClick = function() { SetCannedRange(MIN_RED, MAX_RED, "R"); }
   }

   this.green_Button = new PushButton(this);
   with( this.green_Button )
   {
      text    = "Green";
      toolTip = "<p>Set parameters to select green hues.</p>";

      onClick = function() { SetCannedRange(MIN_GREEN, MAX_GREEN, "G"); }
   }

   this.blue_Button = new PushButton(this);
   with( this.blue_Button )
   {
      text    = "Blue";
      toolTip = "<p>Set parameters to select blue hues.</p>";

      onClick = function() { SetCannedRange(MIN_BLUE, MAX_BLUE, "B"); }
   }

   this.RGB_ButtonPane = new HorizontalSizer;
   with( this.RGB_ButtonPane )
   {
      spacing = 6;
      add(this.red_Button);
      add(this.green_Button);
      add(this.blue_Button);
   }

   // -------------------------------------------------------------------------
   this.cyan_Button = new PushButton(this);
   with( this.cyan_Button )
   {
      text    = "Cyan";
      toolTip = "<p>Set parameters to select cyan hues.</p>";

      onClick = function() { SetCannedRange(MIN_CYAN, MAX_CYAN, "C"); }
   }

   this.magenta_Button = new PushButton(this);
   with( this.magenta_Button )
   {
      text    = "Magenta";
      toolTip = "<p>Set parameters to select magenta hues.</p>";

      onClick = function() { SetCannedRange(MIN_MAGENTA, MAX_MAGENTA, "M"); }
   }

   this.yellow_Button = new PushButton(this);
   with( this.yellow_Button )
   {
      text    = "Yellow";
      toolTip = "<p>Set parameters to select yellow hues.</p>";

      onClick = function() { SetCannedRange(MIN_YELLOW, MAX_YELLOW, "Y"); }
   }

   this.CMY_ButtonPane = new HorizontalSizer;
   with( this.CMY_ButtonPane )
   {
      spacing = 6;
      add(this.cyan_Button);
      add(this.magenta_Button);
      add(this.yellow_Button);
   }

   this.hueParams_Sizer = new VerticalSizer;
   with( this.hueParams_Sizer )
   {
      margin = 6;
      spacing = 4;
      add(this.minHue);
      add(this.maxHue);
      add(this.min_intensity);
      add(this.max_intensity);
      add(this.min_saturation);
      add(this.max_saturation);
      add(this.RGB_ButtonPane);
      add(this.CMY_ButtonPane);
   }

   // -------------------------------------------------------------------------
   this.chrominanceMask_RadioButton = new RadioButton(this);
   with( this.chrominanceMask_RadioButton )
   {
      data.chrominanceMask_RadioButton_control = this.chrominanceMask_RadioButton;
      text = "Chrominance Mask";
      checked = data.maskType == MASK_CHROMINANCE;
      toolTip = "<p>Create a chrominance mask.</p>";

      onCheck = function(checked) { if (checked) data.maskType = MASK_CHROMINANCE; }
   }

   this.lightnessMask_RadioButton = new RadioButton(this);
   with( this.lightnessMask_RadioButton )
   {
      data.lightnessMask_RadioButton_control = this.lightnessMask_RadioButton;
      text = "Lightness Mask";
      checked = data.maskType == MASK_LIGHTNESS;
      toolTip = "<p>Create a lightness mask.</p>";

      onCheck = function(checked) { if (checked) data.maskType = MASK_LIGHTNESS; }
   }

   this.inv_lightnessMask_RadioButton = new RadioButton(this);
   with( this.inv_lightnessMask_RadioButton )
   {
      data.inv_lightnessMask_RadioButton = this.inv_lightnessMask_RadioButton;
      text = "Inv. Lightness Mask";
      checked = data.maskType == MASK_INV_LIGHTNESS;
      toolTip = "<p>Create a inverse lightness mask.</p>";

      onCheck = function(checked) { if (checked) data.maskType = MASK_INV_LIGHTNESS; }
   }

   this.linearMask_RadioButton = new RadioButton(this);
   with( this.linearMask_RadioButton )
   {
      data.linearMask_RadioButton_control = this.linearMask_RadioButton;
      text = "Linear Mask";
      checked = data.maskType == MASK_LINEAR;
      toolTip = "<p>Create a linear mask.</p>";

      onCheck = function(checked) { if (checked) data.maskType = MASK_LINEAR; }
   }

   this.maskStrength = new NumericControl(this);
   with( this.maskStrength )
   {
      label.text = "Mask Strength:";
      label.minWidth = labelMinWidth;
      slider.setRange(0, sliderMaxValue);
      slider.minWidth = sliderMinWidth;
      setRange(0.0, 1.0);
      setPrecision(4);
      setValue(data.maskStrength);
      toolTip = "<p>Mask strength controls how strongly hues away from the midpoint of the "
              + "selected range are included in the mask</p>";

      onValueUpdated = function(value) { data.maskStrength = value; }
   }

   this.maskParams_Sizer = new VerticalSizer;
   with( this.maskParams_Sizer )
   {
      margin = 6;
      spacing = 4;
      add(this.chrominanceMask_RadioButton);
      add(this.lightnessMask_RadioButton);
      add(this.inv_lightnessMask_RadioButton);
      add(this.linearMask_RadioButton);
      add(this.maskStrength);
   }

   // -------------------------------------------------------------------------
   this.blurLayers_Label = new Label(this);
   with( this.blurLayers_Label )
   {
      minWidth = labelMinWidth;
      text = "Mask blur: layers to remove ";
   }

   this.blurLayers_SpinBox = new SpinBox(this);
   with( this.blurLayers_SpinBox )
   {
      minValue = 0;
      maxValue = 8;
      value = data.blurLayers;
      toolTip = this.blurLayers_Label.toolTip = "<b>Number of wavelet layers that will be removed to blur the mask.</b>";

      onValueUpdated = function(value) { data.blurLayers = value; }
   }

   this.blurLayers_Sizer = new HorizontalSizer;
   with( this.blurLayers_Sizer )
   {
      spacing = 4;
      add(this.blurLayers_Label);
      add(this.blurLayers_SpinBox);
      addStretch();
   }

   this.maskName_Label = new Label (this);
   with( this.maskName_Label )
   {
      text = "Mask name:";
      textAlignment = TextAlign_Right|TextAlign_VertCenter;
   }

   this.maskName_Edit = new Edit( this );
   with( this.maskName_Edit )
   {
      text = data.maskName;
      setFixedWidth(MASK_NAME_MAX_LENGHT * this.font.width("M") );
      toolTip = "<p>Name of the mask. In case no name is specificed the script will generate a mask name</p>";

      onEditCompleted = function() { data.maskName = this.text; }
   }

   this.maskName_Sizer = new HorizontalSizer;
   with( this.maskName_Sizer )
   {
      spacing = 4;
      add(this.maskName_Label);
      add(this.maskName_Edit);
      addStretch();
   }

   this.maskPostprocess_Sizer = new VerticalSizer;
   with( this.maskPostprocess_Sizer )
   {
      margin = 6;
      spacing = 4;
      add(this.blurLayers_Sizer);
      add(this.maskName_Sizer);
   }

   // -------------------------------------------------------------------------
   this.newInstance_Button = new ToolButton(this);
   with( this.newInstance_Button )
   {
      icon = scaledResource(":/process-interface/new-instance.png");
      toolTip = "New Instance";

      onMousePress = function()
      {
         this.hasFocus = true;
         data.exportParameters();
         this.pushed = false;
         this.dialog.newInstance();
      }
   }

   this.ok_Button = new PushButton(this);
   with( this.ok_Button )
   {
      text = " OK ";
      icon = scaledResource( ":/icons/ok.png" );

      onClick = () => { this.ok(); };
   }

   this.cancel_Button = new PushButton(this);
   with( this.cancel_Button )
   {
      text = " Cancel ";
      icon = scaledResource( ":/icons/cancel.png" );

      onClick = () => { this.cancel(); }
   }

   this.buttons_Sizer = new HorizontalSizer;
   with( this.buttons_Sizer )
   {
      spacing = 6;
      add(this.newInstance_Button);
      addStretch();
      add(this.ok_Button);
      add(this.cancel_Button);
   }

   this.sizer = new VerticalSizer;
   with( this.sizer )
   {
      margin = 6;
      spacing = 6;
      add(this.helpLabel);
      addSpacing(4);
      add(this.targetImage_Sizer);
      add(this.hueParams_Sizer);
      add(this.maskParams_Sizer);
      add(this.maskPostprocess_Sizer);
      add(this.buttons_Sizer);
   }

   this.windowTitle = TITLE + " Script";
   this.adjustToContents();
   this.setFixedSize();
}

// Our dialog inherits all properties and methods from the core Dialog object.
ColorMaskDialog.prototype = new Dialog;

/*
 * Script entry point.
 */
function main()
{
   Console.hide();

   if (Parameters.isViewTarget)
   {
      data.importParameters();
      data.targetView = Parameters.targetView;
      data.view_id    = Parameters.targetView.id;

      if (data.targetView.image.numberOfChannels != 3)
      {
         Console.show();
         Console.criticalln("Not an RGB color image! image= ", data.view_id);
      }
      else
      {
         doWork();
      }
      return;
   }
   else
   {
      data.importParameters();
      if(!data.targetView)
      {
         // Get access to the active image window
         var window = ImageWindow.activeWindow;
         if (!window.isNull)
         {
            data.targetView = window.currentView;
            data.view_id    = window.currentView.id;
         }
      }
   }

   var dialog = new ColorMaskDialog();
   for (;;)
   {
      if (!dialog.execute())
         return;

      // A view must be selected.
      if ( !data.targetView )
      {
         errorMessageOk("You must select a view to apply this script.", TITLE);
         continue;
      }

      // Only works on a colour image, duh!
      if (data.targetView.image.isGrayscale)
      {
         errorMessageOk("You must supply an RGB color image.", TITLE);
         continue;
      }

      break;
   }

   doWork();
}

main();
