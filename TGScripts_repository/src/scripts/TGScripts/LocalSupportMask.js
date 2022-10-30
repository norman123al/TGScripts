/*
   LocalSupportMask v1.0

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
#include <pjsr/Sizer.jsh>
#include <pjsr/FrameStyle.jsh>
#include <pjsr/NumericControl.jsh>
#include <pjsr/TextAlign.jsh>
#include <pjsr/StdButton.jsh>
#include <pjsr/StdIcon.jsh>
#include <pjsr/UndoFlag.jsh>

#define VERSION   "1.0"
#define TITLE     "LocalSupportMask"

#define DEBUG                 false
#define MASK_NAME             "local_support_mask"
#define DEFAULT_SCALE         5
#define DEFAULT_LARGE_SCALE   1
#define DEFAULT_SMALL_SCALE   3
#define DEFAULT_COMPENSATION  1
#define DEFAULT_SMOOTHNESS    12

#feature-id    LocalSupportMask : TG Scripts > LocalSupportMask

#feature-info A script to generate a local support mask for deconvolution.<br/>\
   Copyright &copy; 2022 Thorsten Glebe. All Rights Reserved.

//------------ LocalSupportMaskData --------------
function LocalSupportMaskData()
{
   this.targetView   = null;
   this.view_id      = "";
   this.scale        = DEFAULT_SCALE;
   this.large_scale  = DEFAULT_LARGE_SCALE;
   this.small_scale  = DEFAULT_SMALL_SCALE;
   this.compensation = DEFAULT_COMPENSATION;
   this.smoothness   = DEFAULT_SMOOTHNESS;

   /*
    * Save parameters in process icon.
    */
   this.exportParameters = function()
   {
      Parameters.set("view_id"     , this.view_id);
      Parameters.set("scale"       , this.scale);
      Parameters.set("large_scale" , this.large_scale);
      Parameters.set("small_scale" , this.small_scale);
      Parameters.set("compensation", this.compensation);
      Parameters.set("smoothness"  , this.smoothness);
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

var data = new LocalSupportMaskData;

// --- do the actual work ---
function doWork()
{
   var view = data.targetView;
   view.beginProcess(UndoFlag_NoSwapFile);

   // Check if image is grey scale
   if(view.image.isColor)
   {
      var msg = new MessageBox( "Image is not a grey scale image, continue?", "LocalSupportMask Script", StdIcon_Error, StdButton_Ok, StdButton_Cancel );
      if(msg.execute() == StdButton_Cancel)
         return;
   }

   // Check if image is non-linear
   var median = view.computeOrFetchProperty( "Median" ).at(0);
   if (median > 0.01)
   {
      var msg = new MessageBox( "Image seems to be non-linear, continue?", "LocalSupportMask Script", StdIcon_Error, StdButton_Ok, StdButton_Cancel );
      if(msg.execute() == StdButton_Cancel)
         return;
   }

   // Pick an unused name for the mask
   var MaskName = null;
   if (ImageWindow.windowById(MASK_NAME).isNull)
   {
      MaskName = MASK_NAME;
   }
   else
   {
      for (var n = 1 ; n <= 99 ; n++)
      {
         if (ImageWindow.windowById(MASK_NAME + n).isNull) {
             MaskName = MASK_NAME + n;
             break;
         }
      }
      if (MaskName == null)
      {
         (new MessageBox("Couldn't find a unique mask name. Bailing out.",
            TITLE, StdIcon_Error, StdButton_Ok)).execute();
         return;
      }
   }

   // PM expression to clone target view
   var PM = new PixelMath;

   PM.expression = "$T";
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
   PM.newImageAlpha = false;
   PM.newImageColorSpace = PixelMath.prototype.Gray;
   PM.newImageSampleFormat = PixelMath.prototype.f32;

   if (!PM.executeOn(data.targetView, false /*swapFile */) || ImageWindow.windowById(MaskName).mainView.isNull)
   {
      console.writeln("Mask creation failed in function doWork");
      new MessageBox( "Mask creation failed!", "LocalSupportMask Script", StdIcon_Error, StdButton_Cancel ).execute();
      return;
   }

   var targetView = ImageWindow.windowById(MaskName).mainView;

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

   // execute StarMask
   var SM = new StarMask;
   SM.shadowsClipping = 0.00000;
   SM.midtonesBalance = 0.50000;
   SM.highlightsClipping = 1.00000;
   SM.waveletLayers = data.scale;
   SM.structureContours = false;
   SM.noiseThreshold = 0.10000;
   SM.aggregateStructures = true;
   SM.binarizeStructures = true;
   SM.largeScaleGrowth = data.large_scale;
   SM.smallScaleGrowth = data.small_scale;
   SM.growthCompensation = data.compensation;
   SM.smoothness = data.smoothness;
   SM.invert = false;
   SM.truncation = 1.00000;
   SM.limit = 1.00000;
   SM.mode = StarMask.prototype.StarMask;

   SM.executeOn(targetView, false /*swapFile */);
   ImageWindow.windowById(MaskName).forceClose();

   // change name of star mask
   var starmaskView = ImageWindow.activeWindow.currentView;
   starmaskView.id = MaskName;

   view.endProcess();
}

//------------ LocalSupportMaskDialog --------------
function LocalSupportMaskDialog()
{
   this.__base__ = Dialog;
   this.__base__();

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
      getMainViews(); // include main views only
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
         }
         else
         {
            data.view_id = "";
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
      minValue = 0;
      maxValue = 15;
      value = data.small_scale;
      toolTip = this.small_scale_Label.toolTip = "<b>Growth of small scale structures.</b>";

      onValueUpdated = function( value ) { data.small_scale = value; }
   }

   this.small_scale_Sizer = new HorizontalSizer;
   with( this.small_scale_Sizer )
   {
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

      onClick = () => { this.cancel(); };
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

   // --- dialog layout ---
   this.sizer = new VerticalSizer;
   with( this.sizer )
   {
      margin = 8;
      spacing = 6;
      add( this.helpLabel );
      addSpacing( 4 );
      add( this.targetImage_Sizer );
      add( this.scale_Sizer );
      add( this.large_scale_Sizer );
      add( this.small_scale_Sizer );
      add( this.compensation_Sizer );
      add( this.smoothness_Sizer );
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
         var msg = new MessageBox( "You must select a view to apply this script.",
                                   TITLE, StdIcon_Error, StdButton_Ok );
         msg.execute();
         continue;
      }

      break;
   }

   doWork();
}

main();
