#engine v8
// V8 migration (2026-10-19); requires PixInsight 1.9.5 or later.
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

CoreApplication.ensureMinimumVersion(1, 9, 5);

#include "lib/TGCompactUI.js"

#define VERSION   "2.2.0"
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

// 2.2.0: Compact open-first interface, repeatable Apply, PiDoc help and safe cleanup.
function doWork()
{
   CM_validate();var image=data.targetView.image;var MaskName=TG_unique(data.maskName||data.targetView.id+CM_SUFF+data.maskSuff);var success=false;var working=TG_copy(data.targetView,"ColorMask_work");
   try {
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
   PM.showNewImage = false;
   PM.newImageId = MaskName;
   PM.newImageWidth = image.width;
   PM.newImageHeight = image.height;
   PM.newImageAlpha = false;
   PM.newImageColorSpace = PixelMath.Gray;
   PM.newImageSampleFormat = PixelMath.f32;
   TG_checked(PM,working.mainView);

   if (data.blurLayers > 0)
   {
      // Apply a blur to mask using MLT
      var MLT = new MultiscaleLinearTransform;

      var layers = new Array(data.blurLayers + 1);
      for (var n = 0 ; n < data.blurLayers ; n++)
         layers[n] = [false, true, 0.000, false, 3.000, 1.00, 1];
      layers[n] = [true, true, 0.000, false, 3.000, 1.00, 1];
      MLT.layers = layers;

      MLT.transform = MultiscaleLinearTransform.StarletTransform;
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
      MLT.largeScaleFunction = MultiscaleLinearTransform.NoFunction;
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
      MLT.previewMode = MultiscaleLinearTransform.Disabled;
      MLT.previewLayer = 0;
      MLT.toLuminance = true;
      MLT.toChrominance = true;
      MLT.linear = false;

      TG_checked(MLT,View.viewById(MaskName));
   }



      var result=View.viewById(MaskName).window;result.show();success=true;return result;
   } finally {TG_close(working);var v=View.viewById(MaskName);if(!success&&TG_valid(v))TG_close(v.window);}
}
const CM_FILE=#__FILE__;
function ColorMaskData()
{
   this.targetView=null;
   TG_settings(this,{minHue:[0,0,360],maxHue:[0,0,360],maskType:[3,0,3,true],maskStrength:[1,0,1],min_intensity:[0,0,1],max_intensity:[1,0,1],min_saturation:[0,0,1],max_saturation:[1,0,1],blurLayers:[0,0,8,true]}, {}, {maskName:'',maskSuff:''},{view_id:'targetView'});
}
var data=new ColorMaskData;
function CM_validate()
{
   if(!TG_valid(data.targetView)||!data.targetView.isMainView||!data.targetView.image.isColor)throw Error('Select an RGB main image.');
   if(data.min_intensity>data.max_intensity||data.min_saturation>data.max_saturation)throw Error('Minimum intensity and saturation must not exceed their maximum values.');
   if(data.maskName&&!/^[A-Za-z_][A-Za-z0-9_]*$/.test(data.maskName))throw Error('Use letters, digits and underscores for the mask name; do not start with a digit.');
}
var CM_Dialog=class extends Dialog
{
   constructor(){
      super();TG_setup(this,TITLE,VERSION,'Create a grayscale mask from an RGB color range.');
      this.target=TG_picker(this,'Target RGB image','targetView',v=>v.image.isColor);this.addGroup(this.target);
      var hue=TG_group(this,'Hue selection');this.addGroup(hue);
      this.presets=[[0,0],[300,60],[0,120],[60,180],[120,240],[180,300],[240,0]];
      this.preset=TG_combo(hue,'Preset:',['Custom','All hues','Red','Yellow','Green','Cyan','Blue','Magenta'],1,i=>{if(i){data.minHue=this.presets[i-1][0];data.maxHue=this.presets[i-1][1];this.low.setValue(data.minHue);this.high.setValue(data.maxHue);}});
      this.low=TG_number(hue,'From (°):',0,360,1,data.minHue,v=>{data.minHue=v;this.preset.currentItem=0;});
      this.high=TG_number(hue,'To (°):',0,360,1,data.maxHue,v=>{data.maxHue=v;this.preset.currentItem=0;});
      this.low.toolTip=this.high.toolTip='Hue wraps through red when From exceeds To. Equal values select a full hue cycle.';
      var gates=TG_group(this,'Intensity and saturation');this.addGroup(gates);this.gates=[];
      [['Min intensity:','min_intensity'],['Max intensity:','max_intensity'],['Min saturation:','min_saturation'],['Max saturation:','max_saturation']].forEach(x=>this.gates.push(TG_number(gates,x[0],0,1,3,data[x[1]],v=>data[x[1]]=v)));
      var mask=TG_group(this,'Mask output');this.addGroup(mask);
      this.type=TG_combo(mask,'Type:',['Chrominance','Lightness','Inverse lightness','Linear'],data.maskType,v=>data.maskType=v);
      this.strength=TG_number(mask,'Strength:',0,1,3,data.maskStrength,v=>data.maskStrength=v);
      this.strength.toolTip='Controls the hue profile. A value of 1 gives full strength throughout the selected range; smaller values soften its edges.';
      this.blur=TG_spin(mask,'Blur layers:',0,8,data.blurLayers,v=>data.blurLayers=v);
      this.name=new Edit(mask);this.name.text=data.maskName;this.name.toolTip='Optional image identifier. Existing names receive a numbered suffix.';this.name.onTextUpdated=t=>data.maskName=t.trim();mask.sizer.add(TG_row(mask,'Name:',this.name));
      TG_finish(this,CM_FILE,'ColorMaskTG',doWork,()=>{data.reset();this.sync();this.refresh();});this.sync();
   }
   sync(){this.low.setValue(data.minHue);this.high.setValue(data.maxHue);this.preset.currentItem=0;this.presets.forEach((p,i)=>{if(p[0]==data.minHue&&p[1]==data.maxHue)this.preset.currentItem=i+1;});['min_intensity','max_intensity','min_saturation','max_saturation'].forEach((k,i)=>this.gates[i].setValue(data[k]));this.type.currentItem=data.maskType;this.strength.setValue(data.maskStrength);this.blur.value=data.blurLayers;this.name.text=data.maskName;}
   refresh(status){this.target.refresh();if(this.apply)this.apply.enabled=TG_valid(data.targetView);if(this.status&&status!==false)this.status.text='Apply creates a new mask and keeps the source selected.\nAssign the result as an image mask in PixInsight.';}
};
#ifndef TG_TEST
TG_main(CM_Dialog,'targetView',v=>v.image.isColor,doWork);
#endif
