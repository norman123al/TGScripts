/*
   LocalSupportMaskLib v1.0

   A script containing common methods for the TGScripts script family.

   Copyright (C) 2022 Dr. Thorsten Glebe

   This program is free software: you can redistribute it and/or modify it
   under the terms of the GNU General Public License as published by the
   Free Software Foundation, version 3 of the License.

   This program is distributed in the hope that it will be useful, but WITHOUT
   ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
   FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for
   more details.

   You should have received a copy of the GNU General Public License along with
   this program.  If not, see <http://www.gnu.org/licenses/>.
*/

#ifndef __LocalSupportMaskLib_js
#define __LocalSupportMaskLib_js

#include <pjsr/NumericControl.jsh>

#include "TGDialogLib.js"

#define MASK_NAME                "local_support_mask"
#define STRENGTH_SLIDER_RANGE    100
#define DEFAULT_STRENGTH         0.5
#define DEFAULT_SCALE            5
#define DEFAULT_LARGE_SCALE      0
#define DEFAULT_SMALL_SCALE      1
#define DEFAULT_COMPENSATION     2
#define DEFAULT_SMOOTHNESS       10

// ----------------------------------------------------------------------------
// LSMData
// ----------------------------------------------------------------------------
function LSMData()
{
   this.strength     = DEFAULT_STRENGTH;
   this.scale        = DEFAULT_SCALE;
   this.large_scale  = DEFAULT_LARGE_SCALE;
   this.small_scale  = DEFAULT_SMALL_SCALE;
   this.compensation = DEFAULT_COMPENSATION;
   this.smoothness   = DEFAULT_SMOOTHNESS;

   this.reset = function()
   {
      this.strength     = DEFAULT_STRENGTH;
      this.scale        = DEFAULT_SCALE;
      this.large_scale  = DEFAULT_LARGE_SCALE;
      this.small_scale  = DEFAULT_SMALL_SCALE;
      this.compensation = DEFAULT_COMPENSATION;
      this.smoothness   = DEFAULT_SMOOTHNESS;
   }

   // Save parameters in process icon
   // -------------------------------------------------------------------------
   this.exportParameters = function()
   {
      Parameters.set("strength"    , this.strength);
      Parameters.set("scale"       , this.scale);
      Parameters.set("large_scale" , this.large_scale);
      Parameters.set("small_scale" , this.small_scale);
      Parameters.set("compensation", this.compensation);
      Parameters.set("smoothness"  , this.smoothness);
   }

   // Restore saved parameters
   // -------------------------------------------------------------------------
   this.importParameters = function()
   {
      if (Parameters.has("strength"))
         this.strength = Parameters.getReal("strength");
      if (Parameters.has("scale"))
         this.scale = Parameters.getInteger("scale");
      if (Parameters.has("large_scale"))
         this.large_scale = Parameters.getInteger("large_scale");
      if (Parameters.has("small_scale"))
         this.small_scale = Parameters.getInteger("small_scale");
      if (Parameters.has("compensation"))
         this.compensation = Parameters.getInteger("compensation");
      if (Parameters.has("smoothness"))
         this.smoothness = Parameters.getInteger("smoothness");
   }
}

var lsmData = new LSMData;

// ----------------------------------------------------------------------------
// LocalSupportMaskSettings
// ----------------------------------------------------------------------------
function LocalSupportMaskSettings(dialog, selector_title)
{
   this.__base__ = VerticalSection;
  	this.__base__(dialog, selector_title);

   dialogData.targetViewListeners.push(this);

   this.labelWidthBox1 =  9 * dialog.font.width("M");
   this.labelWidthBox2 = 10 * dialog.font.width("M");
   this.spinboxWidth   = 50;

   // Save parameters in process icon
   // -------------------------------------------------------------------------
   this.exportParameters = function()
   {
      lsmData.exportParameters();
   }

   // Restore saved parameters
   // -------------------------------------------------------------------------
   this.importParameters = function()
   {
      lsmData.importParameters();
   }

   // updateControl
   // -------------------------------------------------------------------------
   this.updateControl = function()
   {
      let bEnable = dialogData.targetView != null
      this.strengthControl.enabled      = bEnable;
      this.scale_SpinBox.enabled        = bEnable;
      this.large_scale_SpinBox.enabled  = bEnable;
      this.small_scale_SpinBox.enabled  = bEnable;
      this.compensation_SpinBox.enabled = bEnable;
      this.smoothness_SpinBox.enabled   = bEnable;
   }

   // resetControl
   // -------------------------------------------------------------------------
   this.resetControl = function()
   {
      lsmData.reset();
   }

   // Strength Control
   // -------------------------------------------------------------------------
   this.strengthControl = new NumericControl(dialog);
   with( this.strengthControl )
   {
      enabled        = dialogData.targetView != null
      label.text     = "Strength:";
      label.minWidth = this.labelWidthBox1;
      slider.setRange(0, STRENGTH_SLIDER_RANGE);
//      slider.minWidth = 0;
//      slider.maxWidht = 255;
      setRange(0.0, 1);
      setPrecision(2);
      setValue(1 - lsmData.strength);

      toolTip = "<p>Star reduction strength</p>";

      onValueUpdated = function(value) { lsmData.strength = 1 - value; }
   }

   // -------------------------------------------------------------------------
   this.scale_Label = new Label(dialog);
   with( this.scale_Label )
   {
      minWidth      = this.labelWidthBox1;
      text          = "Scale:";
      textAlignment = TextAlign_Right|TextAlign_VertCenter;
   }

   this.scale_SpinBox = new SpinBox(dialog);
   with( this.scale_SpinBox )
   {
      enabled  = dialogData.targetView != null
      minValue = 2;
      maxValue = 12;
      minWidth = this.spinboxWidth;
      value    = lsmData.scale;
      toolTip  = this.scale_Label.toolTip = "<b>Number of wavelet layers for structure detection.</b>";

      onValueUpdated = function( value ) { lsmData.scale = value; }
   }

   this.scale_hSizer = new HorizontalSizer;
   with( this.scale_hSizer )
   {
      spacing = SPACING;
      add( this.scale_Label );
      add( this.scale_SpinBox );
      addStretch();
   }

   // -------------------------------------------------------------------------
   this.large_scale_Label = new Label(dialog);
   with( this.large_scale_Label )
   {
      minWidth      = this.labelWidthBox2;
      text          = "Large-scale:";
      textAlignment = TextAlign_Right|TextAlign_VertCenter;
   }

   this.large_scale_SpinBox = new SpinBox(dialog);
   with( this.large_scale_SpinBox )
   {
      enabled  = dialogData.targetView != null
      minValue = 0;
      maxValue = 15;
      minWidth = this.spinboxWidth;
      value    = lsmData.large_scale;
      toolTip  = this.large_scale_Label.toolTip = "<b>Growth of large scale structures.</b>";

      onValueUpdated = function( value ) { lsmData.large_scale = value; }
   }

   this.large_scale_hSizer = new HorizontalSizer;
   with( this.large_scale_hSizer )
   {
      spacing = SPACING;
      add( this.large_scale_Label );
      add( this.large_scale_SpinBox );
      addStretch();
   }

   // -------------------------------------------------------------------------
   this.small_scale_Label = new Label(dialog);
   with( this.small_scale_Label )
   {
      minWidth      = this.labelWidthBox2;
      text          = "Small-scale:";
      textAlignment = TextAlign_Right|TextAlign_VertCenter;
   }

   this.small_scale_SpinBox = new SpinBox(dialog);
   with( this.small_scale_SpinBox )
   {
      enabled  = dialogData.targetView != null
      minValue = 0;
      maxValue = 15;
      minWidth = this.spinboxWidth;
      value    = lsmData.small_scale;
      toolTip  = this.small_scale_Label.toolTip = "<b>Growth of small scale structures.</b>";

      onValueUpdated = function( value ) { lsmData.small_scale = value; }
   }

   this.small_scale_hSizer = new HorizontalSizer;
   with( this.small_scale_hSizer )
   {
      spacing = 4;
      add( this.small_scale_Label );
      add( this.small_scale_SpinBox );
      addStretch();
   }

   // -------------------------------------------------------------------------
   this.compensation_Label = new Label(dialog);
   with( this.compensation_Label )
   {
      minWidth      = this.labelWidthBox2;
      text          = "Compensation:";
      textAlignment = TextAlign_Right|TextAlign_VertCenter;
   }

   this.compensation_SpinBox = new SpinBox(dialog);
   with( this.compensation_SpinBox )
   {
      enabled  = dialogData.targetView != null
      minValue = 0;
      maxValue = 4;
      minWidth = this.spinboxWidth;
      value    = lsmData.compensation;
      toolTip  = this.compensation_Label.toolTip = "<b>Number of wavelet layers for small-scale mask growth compensation.</b>";

      onValueUpdated = function( value ) { lsmData.compensation = value; }
   }

   this.compensation_hSizer = new HorizontalSizer;
   with( this.compensation_hSizer )
   {
      spacing = 4;
      add( this.compensation_Label );
      add( this.compensation_SpinBox );
      addStretch();
   }

   // -------------------------------------------------------------------------
   this.smoothness_Label = new Label(dialog);
   with( this.smoothness_Label )
   {
      minWidth      = this.labelWidthBox1;
      text          = "Smoothness:";
      textAlignment = TextAlign_Right|TextAlign_VertCenter;
   }

   this.smoothness_SpinBox = new SpinBox(dialog);
   with( this.smoothness_SpinBox )
   {
      enabled  = dialogData.targetView != null
      minValue = 0;
      maxValue = 40;
      minWidth = this.spinboxWidth;
      value    = lsmData.smoothness;
      toolTip  = this.smoothness_Label.toolTip = "<b>Smoothness of mask structures.</b>";

      onValueUpdated = function( value ) { lsmData.smoothness = value; }
   }

   this.smoothness_hSizer = new HorizontalSizer;
   with( this.smoothness_hSizer )
   {
      spacing = 4;
      add( this.smoothness_Label );
      add( this.smoothness_SpinBox );
      addStretch();
   }

   // -------------------------------------------------------------------------
   this.maskParamBox = new GroupBox(dialog);
   with( this.maskParamBox )
   {
      minWidth = 300;
      title = "Mask Parameters";
      sizer = new VerticalSizer;
      sizer.margin  = MARGIN;
      sizer.spacing = SPACING;
      sizer.add( this.strengthControl );
      sizer.add( this.scale_hSizer );
      sizer.add( this.smoothness_hSizer );
   }

   // -------------------------------------------------------------------------
   this.structureGrowthBox = new GroupBox(dialog);
   with( this.structureGrowthBox )
   {
      title = "Structure Growth";
      sizer = new VerticalSizer;
      sizer.margin  = MARGIN;
      sizer.spacing = SPACING;
      sizer.add( this.large_scale_hSizer );
      sizer.add( this.small_scale_hSizer );
      sizer.add( this.compensation_hSizer );
   }

   // -------------------------------------------------------------------------
   this.hSizer = new HorizontalSizer;
   with(this.hSizer)
   {
      addStretch();
      add(this.maskParamBox);
      addStretch();
      add(this.structureGrowthBox);
      addStretch();
   }

   // register elements to this sizer
   // -------------------------------------------------------------------------
   this.addControl(this.hSizer);
} // LocalSupportMaskSettings

LocalSupportMaskSettings.prototype = new VerticalSizer();

// ----------------------------------------------------------------------------
// MaskPreviewControl
// ----------------------------------------------------------------------------
function MaskPreviewControl(dialog, selector_title)
{
   this.__base__ = VerticalSection;
  	this.__base__(dialog, selector_title);

   dialogData.targetViewListeners.push(this);
   dialogData.previewListeners.push(this);

   let self         = this;
   let previewView  = null;
   let previewImage = null;
   let bitmap       = null;

   this.metadata = new ImageMetadata( undefined/*module*/, 1.0);
   this.previewControl = new PreviewControl( dialog );
   this.previewControl.setFixedSize( PREVIEW_SIZE, PREVIEW_SIZE );

   this.preview_hSizer = new HorizontalSizer;
   this.preview_hSizer.add(this.previewControl);

   // Save parameters in process icon
   // -------------------------------------------------------------------------
   this.exportParameters = function()
   {
   }

   // Restore saved parameters
   // -------------------------------------------------------------------------
   this.importParameters = function()
   {
   }

   // updateControl
   // -------------------------------------------------------------------------
   this.updateControl = function()
   {
      if(self.bitmap)
      {
         self.bitmap.clear();
         self.bitmap = null;
         if(self.previewView)
         {
            self.previewView.window.forceClose();
         }
      }

      if(dialogData.targetView == null)
      {
         this.previewControl.SetImage( self.bitmap, this.metadata );
      }
      else
      {
         // todo: create preview on intermediate result
         self.previewView  = createIntermediateMask(dialogData.targetView, MASK_NAME + "_preview");
         self.previewImage = self.previewView.image;
         self.bitmap       = self.previewImage.render();

         this.metadata.ExtractMetadata( dialogData.targetView.window );
         this.previewControl.SetImage( self.bitmap, this.metadata );
      }

      dialogData.dialog.adjustToContents(); // just in case no resize happens
   }

   // resetControl
   // -------------------------------------------------------------------------
   this.resetControl = function()
   {
      if(self.previewView && !self.previewView.window.isNull)
      {
         self.previewView.window.forceClose();
      }
   }

   // renderImage
   // -------------------------------------------------------------------------
   this.preview = function()
   {
      if(self.previewView)
      {
         let view = createMask(/*bPreview*/true, self.previewView, MASK_NAME);
         self.bitmap.clear();
         self.bitmap = view.image.render();
         view.window.forceClose();
         this.previewControl.SetImage( self.bitmap, this.metadata );
      }
   }

   // register elements to this sizer
   // -------------------------------------------------------------------------
   this.margin  = 0;
   this.spacing = 0;
   this.addControl(this.preview_hSizer);
} // MaskPreviewControl

MaskPreviewControl.prototype = new VerticalSizer();

// ----------------------------------------------------------------------------
// createIntermediateMask - MLT + stretch
// ----------------------------------------------------------------------------
function createIntermediateMask(view, basename)
{
   Console.show();

   view.beginProcess(UndoFlag_NoSwapFile);

   let MaskName = uniqueViewId(basename);
   var IntermediateMaskWindow = createImageLuminanceCopyWindow( MaskName, view.image );
   var targetView = IntermediateMaskWindow.mainView;

   view.endProcess();

   targetView.beginProcess(UndoFlag_NoSwapFile);

   var MLT = new MultiscaleLinearTransform;
   MLT.layers = [ // enabled, biasEnabled, bias, noiseReductionEnabled, noiseReductionThreshold, noiseReductionAmount, noiseReductionIterations
      [false, true, 0.000, false, 3.000, 1.00, 1],
      [true , true, 0.000, false, 3.000, 1.00, 1],
      [true , true, 0.000, false, 3.000, 1.00, 1],
      [true , true, 0.000, false, 3.000, 1.00, 1],
      [true , true, 0.000, false, 3.000, 1.00, 1],
      [false, true, 0.000, false, 3.000, 1.00, 1]
   ];
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
   MLT.scalingFunctionName       = "Linear Interpolation (3)";
   MLT.linearMask                = false;
   MLT.linearMaskAmpFactor       = 100;
   MLT.linearMaskSmoothness      = 1.00;
   MLT.linearMaskInverted        = true;
   MLT.linearMaskPreview         = false;
   MLT.largeScaleFunction        = MultiscaleLinearTransform.prototype.NoFunction;
   MLT.curveBreakPoint           = 0.75;
   MLT.noiseThresholding         = false;
   MLT.noiseThresholdingAmount   = 1.00;
   MLT.noiseThreshold            = 3.00;
   MLT.softThresholding          = true;
   MLT.useMultiresolutionSupport = false;
   MLT.deringing                 = false;
   MLT.deringingDark             = 0.1000;
   MLT.deringingBright           = 0.0000;
   MLT.outputDeringingMaps       = false;
   MLT.lowRange                  = 0.0000;
   MLT.highRange                 = 0.0000;
   MLT.previewMode               = MultiscaleLinearTransform.prototype.Disabled;
   MLT.previewLayer              = 0;
   MLT.toLuminance               = true;
   MLT.toChrominance             = true;
   MLT.linear                    = false;

   MLT.executeOn(targetView, false /*swapFile */);

   // standard screen transfer function stretch
   var HT = new HistogramTransformation;
   HT.H = [ // c0, m, c1, r0, r1
      [0.00000000, 0.50000000, 1.00000000, 0.00000000, 1.00000000],
      [0.00000000, 0.50000000, 1.00000000, 0.00000000, 1.00000000],
      [0.00000000, 0.50000000, 1.00000000, 0.00000000, 1.00000000],
      [0.00067764, 0.00102823, 1.00000000, 0.00000000, 1.00000000],
      [0.00000000, 0.50000000, 1.00000000, 0.00000000, 1.00000000]
   ];

   HT.executeOn(targetView, false /*swapFile */);

   targetView.endProcess();
   Console.hide();

   return targetView;
}

// ----------------------------------------------------------------------------
// createMask
// ----------------------------------------------------------------------------
function createMask(bPreview, view, basename)
{
   Console.show();


   view.beginProcess(UndoFlag_NoSwapFile);

   var SM = new StarMask;
   SM.shadowsClipping     = 0.20000;
   SM.midtonesBalance     = lsmData.strength;
   SM.highlightsClipping  = 1.00000;
   SM.waveletLayers       = lsmData.scale;
   SM.structureContours   = false;
   SM.noiseThreshold      = 0.20000;
   SM.aggregateStructures = false;
   SM.binarizeStructures  = true;
   SM.largeScaleGrowth    = lsmData.large_scale;
   SM.smallScaleGrowth    = lsmData.small_scale;
   SM.growthCompensation  = lsmData.compensation;
   SM.smoothness          = lsmData.smoothness;
   SM.invert              = false;
   SM.truncation          = 1.00000;
   SM.limit               = 1.00000;
   SM.mode                = bPreview ? StarMask.prototype.StarMaskOverlay : StarMask.prototype.StarMask;

   SM.executeOn(view, false /*swapFile */);

   // change name of star mask
   var starmaskView = ImageWindow.activeWindow.currentView;
   if(bPreview)
      ImageWindow.activeWindow.hide();
   starmaskView.id = basename;

   view.endProcess();
   Console.hide();

   return starmaskView;
}

// ----------------------------------------------------------------------------
#endif   // __LocalSupportMaskLib_js
