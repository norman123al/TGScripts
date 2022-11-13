/*
   LocalSupportMask v1.1

   A script for generating local support mask for deconvolution.

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

/*
   Change history:
   v1.0
      initial version
   v1.1
      added reset button
      added overlay preview option
      changed mask creation default settings
      enable/disable controls
*/

#include <pjsr/Sizer.jsh>
#include <pjsr/FrameStyle.jsh>
#include <pjsr/NumericControl.jsh>
#include <pjsr/TextAlign.jsh>
#include <pjsr/StdButton.jsh>
#include <pjsr/StdIcon.jsh>

#include "lib/TGScriptsLib.js"

#define VERSION   "1.1"
#define TITLE     "LocalSupportMask"

#define MASK_NAME                "local_support_mask"
#define STRENGTH_SLIDER_RANGE    100
#define DEFAULT_STRENGTH         0.5
#define DEFAULT_SCALE            5
#define DEFAULT_LARGE_SCALE      0
#define DEFAULT_SMALL_SCALE      1
#define DEFAULT_COMPENSATION     2
#define DEFAULT_SMOOTHNESS       10

#feature-id    LocalSupportMask : TG Scripts > LocalSupportMask

#feature-info A script to generate a local support mask for deconvolution.<br/>\
   Copyright &copy; 2022 Thorsten Glebe. All Rights Reserved.

//------------ LocalSupportMaskData --------------
function LocalSupportMaskData()
{
   this.dialog       = null;
   this.targetView   = null;
   this.view_id      = "";
   this.strength     = DEFAULT_STRENGTH;
   this.scale        = DEFAULT_SCALE;
   this.large_scale  = DEFAULT_LARGE_SCALE;
   this.small_scale  = DEFAULT_SMALL_SCALE;
   this.compensation = DEFAULT_COMPENSATION;
   this.smoothness   = DEFAULT_SMOOTHNESS;
   this.isPreview    = false;

   this.reset = function()
   {
      this.targetView   = null;
      this.view_id      = "";
      this.strength     = DEFAULT_STRENGTH;
      this.scale        = DEFAULT_SCALE;
      this.large_scale  = DEFAULT_LARGE_SCALE;
      this.small_scale  = DEFAULT_SMALL_SCALE;
      this.compensation = DEFAULT_COMPENSATION;
      this.smoothness   = DEFAULT_SMOOTHNESS;
      this.isPreview    = false;
   }

   /*
    * Save parameters in process icon.
    */
   this.exportParameters = function()
   {
      Parameters.set("view_id"     , this.view_id);
      Parameters.set("strength"    , this.strength);
      Parameters.set("scale"       , this.scale);
      Parameters.set("large_scale" , this.large_scale);
      Parameters.set("small_scale" , this.small_scale);
      Parameters.set("compensation", this.compensation);
      Parameters.set("smoothness"  , this.smoothness);
      Parameters.set("isPreview"   , this.isPreview);
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
      if (Parameters.has("isPreview"))
         this.isPreview = Parameters.getBoolean("isPreview");
   }

}

var data = new LocalSupportMaskData;

// -----------------------------------------------------------------------------
function toggleAllControls( bEnable )
{
   data.dialog.strengthControl.enabled      = bEnable;
   data.dialog.scale_SpinBox.enabled        = bEnable;
   data.dialog.large_scale_SpinBox.enabled  = bEnable;
   data.dialog.small_scale_SpinBox.enabled  = bEnable;
   data.dialog.compensation_SpinBox.enabled = bEnable;
   data.dialog.smoothness_SpinBox.enabled   = bEnable;
   data.dialog.previewChexBox.enabled       = bEnable;
}

function disableAllControls()
{
   toggleAllControls(false);
}

function enableAllControls()
{
   toggleAllControls(true);
}

// -----------------------------------------------------------------------------
function doWork()
{
   Console.show();

   var view = data.targetView;
   view.beginProcess(UndoFlag_NoSwapFile);

   // Check if image is grey scale
   if(view.image.isColor && errorMessageOkCancel("Image is not a grey scale image, continue?", TITLE))
      return;

   // Check if image is linear
   if(view.image.median() > 0.01 && errorMessageOkCancel("Image seems to be non-linear, continue?", TITLE))
      return;

   let MaskName = uniqueViewId(MASK_NAME);
   var LocalSupportMaskWindow = createImageCopyWindow( MaskName, view.image );
   var targetView = LocalSupportMaskWindow.mainView;

   var MLT = new MultiscaleLinearTransform;
   MLT.layers = [ // enabled, biasEnabled, bias, noiseReductionEnabled, noiseReductionThreshold, noiseReductionAmount, noiseReductionIterations
      [false, true, 0.000, false, 3.000, 1.00, 1],
      [true, true, 0.000, false, 3.000, 1.00, 1],
      [true, true, 0.000, false, 3.000, 1.00, 1],
      [true, true, 0.000, false, 3.000, 1.00, 1],
      [true, true, 0.000, false, 3.000, 1.00, 1],
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

   var SM = new StarMask;
   SM.shadowsClipping     = 0.20000;
   SM.midtonesBalance     = data.strength;
   SM.highlightsClipping  = 1.00000;
   SM.waveletLayers       = data.scale;
   SM.structureContours   = false;
   SM.noiseThreshold      = 0.20000;
   SM.aggregateStructures = false;
   SM.binarizeStructures  = true;
   SM.largeScaleGrowth    = data.large_scale;
   SM.smallScaleGrowth    = data.small_scale;
   SM.growthCompensation  = data.compensation;
   SM.smoothness          = data.smoothness;
   SM.invert              = false;
   SM.truncation          = 1.00000;
   SM.limit               = 1.00000;
   SM.mode                = data.isPreview ? StarMask.prototype.StarMaskOverlay : StarMask.prototype.StarMask;

   SM.executeOn(targetView, false /*swapFile */);
   LocalSupportMaskWindow.forceClose();

   // change name of star mask
   var starmaskView = ImageWindow.activeWindow.currentView;
   starmaskView.id = MaskName;

   view.endProcess();
   Console.hide();
}

// -----------------------------------------------------------------------------
function LocalSupportMaskDialog()
{
   this.__base__ = Dialog;
   this.__base__();

   data.dialog = this;
   var fontWidth  = this.font.width("M");
   var labelWidth = 13*fontWidth;

   // -------------------------------------------------------------------------
   this.helpLabel = new Label( this );
   with( this.helpLabel )
   {
      frameStyle = FrameStyle_Box;
      margin = 4;
      wordWrapping = true;
      useRichText = true;
      text =
         "<p><b>LocalSupportMask v" + VERSION + "</b> &mdash; A script for "
         + "creating a local support mask for deconvolution.</p>"
         + "<p>Choose a luminance image to create the local support mask. This script works on main views only, not on previews.</p>"
         + "<p>Copyright &copy; 2022 Thorsten Glebe</p>";
   }

   // -------------------------------------------------------------------------
   this.targetImage_Label = new Label( this );
   with( this.targetImage_Label )
   {
      minWidth = labelWidth;
      text = "Target image:";
      textAlignment = TextAlign_Right|TextAlign_VertCenter;
   }

   this.targetImage_ViewList = new ViewList( this );
   with( this.targetImage_ViewList )
   {
      scaledMinWidth = 200;
      getMainViews();
      if ( data.targetView )
      {
         currentView = data.targetView;
         data.view_id = currentView.id;
      }

      toolTip = this.targetImage_Label.toolTip = "Select the image to perform the local support mask creation.";

      onViewSelected = function( view )
      {
         if(view.id)
         {
            data.targetView = view;
            data.view_id    = view.id;
            enableAllControls();
         }
         else
         {
            data.targetView = null;
            data.view_id = "";
            disableAllControls();
         }
      }
   }

   this.targetImage_Sizer = new HorizontalSizer;
   with( this.targetImage_Sizer )
   {
      spacing = 4;
      add( this.targetImage_Label );
      add( this.targetImage_ViewList, 100 );
      addStretch();
   }

   // -------------------------------------------------------------------------
   this.strengthControl = new NumericControl(this);
   with( this.strengthControl )
   {
      enabled = data.targetView != null
      label.text = "Strength:";
      label.minWidth = labelWidth;
      slider.setRange(0, STRENGTH_SLIDER_RANGE);
      slider.minWidth = 0;
      setRange(0.0, 1);
      setPrecision(2);
      setValue(1 - data.strength);

      toolTip = "<p>Star reduction strength</p>";

      onValueUpdated = function(value) { data.strength = 1 - value; }
   }

   // -------------------------------------------------------------------------
   this.scale_Label = new Label( this );
   with( this.scale_Label )
   {
      minWidth = labelWidth;
      text = "Scale:";
      textAlignment = TextAlign_Right|TextAlign_VertCenter;
   }

   this.scale_SpinBox = new SpinBox( this );
   with( this.scale_SpinBox )
   {
      enabled = data.targetView != null
      minValue = 2;
      maxValue = 12;
      value = data.scale;
      toolTip = this.scale_Label.toolTip = "<b>Number of wavelet layers for structure detection.</b>";

      onValueUpdated = function( value ) { data.scale = value; }
   }

   this.scale_Sizer = new HorizontalSizer;
   with( this.scale_Sizer )
   {
      spacing = 4;
      add( this.scale_Label );
      add( this.scale_SpinBox );
      addStretch();
   }

   // -------------------------------------------------------------------------
   this.large_scale_Label = new Label( this );
   with( this.large_scale_Label )
   {
      minWidth = labelWidth;
      text = "Large-scale:";
      textAlignment = TextAlign_Right|TextAlign_VertCenter;
   }

   this.large_scale_SpinBox = new SpinBox( this );
   with( this.large_scale_SpinBox )
   {
      enabled = data.targetView != null
      minValue = 0;
      maxValue = 15;
      value = data.large_scale;
      toolTip = this.large_scale_Label.toolTip = "<b>Growth of large scale structures.</b>";

      onValueUpdated = function( value ) { data.large_scale = value; }
   }

   this.large_scale_Sizer = new HorizontalSizer;
   with( this.large_scale_Sizer )
   {
      spacing = 4;
      add( this.large_scale_Label );
      add( this.large_scale_SpinBox );
      addStretch();
   }

   // -------------------------------------------------------------------------
   this.small_scale_Label = new Label( this );
   with( this.small_scale_Label )
   {
      minWidth = labelWidth;
      text = "Small-scale:";
      textAlignment = TextAlign_Right|TextAlign_VertCenter;
   }

   this.small_scale_SpinBox = new SpinBox( this );
   with( this.small_scale_SpinBox )
   {
      enabled = data.targetView != null
      minValue = 0;
      maxValue = 15;
      value = data.small_scale;
      toolTip = this.small_scale_Label.toolTip = "<b>Growth of small scale structures.</b>";

      onValueUpdated = function( value ) { data.small_scale = value; }
   }

   this.small_scale_Sizer = new HorizontalSizer;
   with( this.small_scale_Sizer )
   {
      enabled = data.targetView != null
      spacing = 4;
      add( this.small_scale_Label );
      add( this.small_scale_SpinBox );
      addStretch();
   }

   // -------------------------------------------------------------------------
   this.compensation_Label = new Label( this );
   with( this.compensation_Label )
   {
      minWidth = labelWidth;
      text = "Compensation:";
      textAlignment = TextAlign_Right|TextAlign_VertCenter;
   }

   this.compensation_SpinBox = new SpinBox( this );
   with( this.compensation_SpinBox )
   {
      enabled = data.targetView != null
      minValue = 0;
      maxValue = 4;
      value = data.compensation;
      toolTip = this.compensation_Label.toolTip = "<b>Number of wavelet layers for small-scale mask growth compensation.</b>";

      onValueUpdated = function( value ) { data.compensation = value; }
   }

   this.compensation_Sizer = new HorizontalSizer;
   with( this.compensation_Sizer )
   {
      spacing = 4;
      add( this.compensation_Label );
      add( this.compensation_SpinBox );
      addStretch();
   }

   // -------------------------------------------------------------------------
   this.smoothness_Label = new Label( this );
   with( this.smoothness_Label )
   {
      minWidth = labelWidth;
      text = "Smoothness:";
      textAlignment = TextAlign_Right|TextAlign_VertCenter;
   }

   this.smoothness_SpinBox = new SpinBox( this );
   with( this.smoothness_SpinBox )
   {
      enabled = data.targetView != null
      minValue = 0;
      maxValue = 40;
      value = data.smoothness;
      toolTip = this.smoothness_Label.toolTip = "<b>Smoothness of mask structures.</b>";

      onValueUpdated = function( value ) { data.smoothness = value; }
   }

   this.smoothness_Sizer = new HorizontalSizer;
   with( this.smoothness_Sizer )
   {
      spacing = 4;
      add( this.smoothness_Label );
      add( this.smoothness_SpinBox );
      addStretch();
   }

   // -------------------------------------------------------------------------
   this.paramGroupBox = new GroupBox( this );
   with( this.paramGroupBox )
   {
      title = "Local Support Mask Settings";
      sizer = new VerticalSizer;
      sizer.margin = 6;
      sizer.spacing = 4;
      sizer.add( this.strengthControl );
      sizer.add( this.scale_Sizer );
      sizer.add( this.large_scale_Sizer );
      sizer.add( this.small_scale_Sizer );
      sizer.add( this.compensation_Sizer );
      sizer.add( this.smoothness_Sizer );
   }

   // -------------------------------------------------------------------------
   this.previewChexBox = new CheckBox(this);
   with( this.previewChexBox )
   {
      enabled = data.targetView != null
      text    = "Create Overlay Preview";
      toolTip = "<p>Create overlay preview for local support mask.</p>";

      onCheck = function() { data.isPreview = true; }
   }

   // -------------------------------------------------------------------------
   this.newInstance_Button = new ToolButton(this);
   with( this.newInstance_Button )
   {
      icon = scaledResource( ":/process-interface/new-instance.png" );
      toolTip = "New Instance";

      onMousePress = function()
      {
         this.hasFocus = true;
         data.exportParameters();
         this.pushed = false;
         this.dialog.newInstance();
      }
   }

   this.ok_Button = new ToolButton(this);
   with( this.ok_Button )
   {
      icon = scaledResource( ":/process-interface/execute.png" );
      toolTip = "Execute script";

      onClick = () => { this.ok(); };
   }

   this.cancel_Button = new ToolButton(this);
   with( this.cancel_Button )
   {
      icon = scaledResource( ":/process-interface/cancel.png" );
      toolTip = "Cancel script";

      onClick = () => { this.cancel(); };
   }

   this.reset_Button = new ToolButton(this);
   with( this.reset_Button )
   {
      icon = scaledResource( ":/process-interface/reset.png" );
      toolTip = "Reset to defaults";

      onMousePress = function()
      {
         if(data.dialog.targetImage_ViewList.currentView)
         {
            data.dialog.targetImage_ViewList.remove(data.dialog.targetImage_ViewList.currentView);
            data.dialog.targetImage_ViewList.getMainViews();
         }
         data.reset();
         data.dialog.strengthControl.setValue(1 - data.strength);
         data.dialog.scale_SpinBox.value          = data.scale;
         data.dialog.large_scale_SpinBox.value    = data.large_scale;
         data.dialog.small_scale_SpinBox.value    = data.small_scale;
         data.dialog.compensation_SpinBox.value   = data.compensation;
         data.dialog.smoothness_SpinBox.value     = data.smoothness;
         data.dialog.previewChexBox.checked       = false;
         disableAllControls();
      }
   }

   this.buttons_Sizer = new HorizontalSizer;
   with( this.buttons_Sizer )
   {
      spacing = 6;
      add(this.newInstance_Button);
      addStretch();
      add(this.ok_Button);
      add(this.cancel_Button);
      add(this.reset_Button);
   }

   // --- dialog layout ---
   this.sizer = new VerticalSizer;
   with( this.sizer )
   {
      margin = 8;
      spacing = 6;
      add( this.helpLabel );
      addSpacing( 4 );
      add( this.targetImage_Sizer );
      addSpacing(4);
      add( this.paramGroupBox );
      addSpacing(4);
      add(this.previewChexBox);
      addSpacing(4);
      add( this.buttons_Sizer );
   }

   this.windowTitle = TITLE;
   this.adjustToContents();
   this.setFixedSize();
}

// Our dialog inherits all properties and methods from the core Dialog object.
LocalSupportMaskDialog.prototype = new Dialog;

//------------ main --------------
function main()
{
   Console.hide();

   if (Parameters.isViewTarget)
   {
      data.importParameters();
      data.targetView = Parameters.targetView;
      data.view_id    = Parameters.targetView.id;
      doWork();
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

   var dialog = new LocalSupportMaskDialog();
   for ( ;; )
   {
      if ( !dialog.execute() )
         return;

      // A view must be selected.
      if ( !data.targetView )
      {
         errorMessage("You must select a view to apply this script.", TITLE);
         continue;
      }

      break;
   }

   doWork();
}

main();
