/*
   DarkStructureEnhance v1.1

   A script for enhancement of dark structures.

   Copyright (C) 2009 Carlos Sonnenstein (PTeam) & Oriol Lehmkuhl (PTeam)

   This program is free software: you can redistribute it and/or modify it
   under the terms of the GNU General Public License as published by the
   Free Software Foundation, version 3 of the License.

   This program is distributed in the hope that it will be useful, but WITHOUT
   ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
   FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for
   more details.

   You should have received a copy of the GNU General Public License along with
   this program.  If not, see <http://www.gnu.org/licenses/>.

   Modified by Thorsten Glebe, October 2022
   1. added "new instance" icon to store state of GUI
   2. minor refactorings
*/

/*
   DarkStructureEnhanceTG
   Modified by Thorsten Glebe, October 2022

   Change history:
   v2.0
      1. added "new instance" icon to store state of GUI
      2. reduce default of 'Amount' to 0.3
      3. minor refactorings
   v2.1
      1. add "reset" button
      2. enable/disable controls
   v2.2
      1. added preview
      2. code refactoring
*/

#include <pjsr/Sizer.jsh>
#include <pjsr/FrameStyle.jsh>
#include <pjsr/TextAlign.jsh>
#include <pjsr/StdButton.jsh>
#include <pjsr/StdIcon.jsh>
#include <pjsr/NumericControl.jsh>

#include "lib/TGScriptsLib.js"

#feature-id    DarkStructureEnhanceTG : TG Scripts > DarkStructureEnhanceTG

#feature-info  A script for enhancement of dark structures.<br/>\
   <br/>\
   Based on an original algorithm created by Carlos Sonnenstein (PTeam). \
   JavaScript/PixInsight implementation by Oriol Lehmkuhl (PTeam).<br/> \
   <br/> \
   Copyright &copy; 2009 Carlos Sonnenstein (PTeam) & Oriol Lehmkuhl (PTeam) / 2022 Thorsten Glebe

#feature-icon  DarkStructureEnhance.xpm

#define nStarMask 6

#define VERSION "2.2"
#define TITLE "DarkStructureEnhanceTG"

#define DEFAULT_LAYERS       8
#define DEFAULT_SCALING      1
#define DEFAULT_MEDIAN       0.65
#define DEFAULT_ITERATIONS   1
#define LAYERS_TO_REMOVE_MIN 5
#define LAYERS_TO_REMOVE_MAX 12
#define PREV_SEPARATOR_WIDTH 3

//------------ DarkMaskLayersData --------------
function DarkMaskLayersData()
{
   this.dialog          = null;
   this.targetView      = null;
   this.view_id         = "";
   this.preview         = null;
   this.preview_id      = "";
   this.numberOfLayers  = DEFAULT_LAYERS;
   this.scalingFunction = DEFAULT_SCALING;
   this.extractResidual = true;
   this.toLumi          = false;
   this.median          = DEFAULT_MEDIAN;
   this.iterations      = DEFAULT_ITERATIONS;
   this.viewMask        = false;

   this.reset = function()
   {
      this.targetView      = null;
      this.view_id         = "";
      this.preview         = null;
      this.preview_id      = "";
      this.numberOfLayers  = DEFAULT_LAYERS;
      this.scalingFunction = DEFAULT_SCALING;
      this.extractResidual = true;
      this.toLumi          = false;
      this.median          = DEFAULT_MEDIAN;
      this.iterations      = DEFAULT_ITERATIONS;
      this.viewMask        = false;
   }

   /*
    * Save parameters in process icon.
    */
   this.exportParameters = function()
   {
      Parameters.set("view_id"        , data.view_id);
      Parameters.set("preview_id"     , data.preview_id);
      Parameters.set("numberOfLayers" , data.numberOfLayers);
      Parameters.set("scalingFunction", data.scalingFunction);
      Parameters.set("extractResidual", data.extractResidual);
      Parameters.set("toLumi"         , data.toLumi);
      Parameters.set("median"         , data.median);
      Parameters.set("iterations"     , data.iterations);
      Parameters.set("viewMask"       , data.viewMask);
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
      if (this.targetView && Parameters.has("preview_id"))
      {
         this.preview_id = Parameters.getString("preview_id");
         var window = ImageWindow.windowById(this.view_id);
         for( i in window.previews )
         {
            var preview = window.previews[i];
            if(preview.id == this.preview_id)
               this.preview = preview;
         }
      }
      if(Parameters.has("numberOfLayers"))
         data.numberOfLayers = Parameters.getInteger("numberOfLayers");
      if(Parameters.has("scalingFunction"))
         data.scalingFunction = Parameters.getInteger("scalingFunction");
      if (Parameters.has("extractResidual"))
         data.extractResidual = Parameters.getBoolean("extractResidual");
      if(Parameters.has("toLumi"))
         data.toLumi = Parameters.getBoolean("toLumi");
      if(Parameters.has("median"))
         data.median = Parameters.getReal("median");
      if(Parameters.has("iterations"))
         data.iterations = Parameters.getInteger("iterations");
      if(Parameters.has("viewMask"))
         data.viewMask = Parameters.getBoolean("viewMask");
   }
}

var data = new DarkMaskLayersData;

// -----------------------------------------------------------------------------
function toggleAllControls( bEnable )
{
   data.dialog.numberOfLayers_SpinBox.enabled   = bEnable;
   data.dialog.extractResidual_CheckBox.enabled = bEnable;
   data.dialog.scalingFunction_ComboBox.enabled = bEnable;
   data.dialog.median_NC.enabled                = bEnable;
   data.dialog.iter_SpinBox.enabled             = bEnable;
   data.dialog.previewViewList.enabled          = bEnable;
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
function convertMedianToValue(median)
{
   return (median-0.5)*2
}

function convertValueToMedian(value)
{
   return (0.5*value)+0.5;
}

// -----------------------------------------------------------------------------
function ScalingFunction( kernel, name , size )
{
    this.kernel = kernel;
    this.name   = name;
    this.size   = size;
}

var scalingFunctions = new Array;

scalingFunctions[0] = new ScalingFunction(
   [ 0.29289322, 0.5, 0.29289322,
     0.5,        1.0, 0.5,
     0.29289322, 0.5, 0.29289322 ],
   "3x3 Linear Interpolation", 3 );

scalingFunctions[1] = new ScalingFunction(
   [ 1/256, 1/64, 3/128, 1/64, 1/256,
     1/64,  1/16, 3/32,  1/16, 1/64,
     3/128, 3/32, 9/64,  3/32, 3/128,
     1/64,  1/16, 3/32,  1/16, 1/64,
     1/256, 1/64, 3/128, 1/64, 1/256 ],
   "5x5 B3 Spline", 5 );

// -----------------------------------------------------------------------------
function doWaveletTransform(auxLayers, view)
{
   var wavlets = new ATrousWaveletTransformV1;
   with ( wavlets )
   {
       version                   = 257;
       layers                    = auxLayers;
       scaleDelta                = 0;
       scalingFunctionData       = scalingFunctions[data.scalingFunction].kernel;
       scalingFunctionKernelSize = scalingFunctions[data.scalingFunction].size;
       scalingFunctionName       = scalingFunctions[data.scalingFunction].name;
       largeScaleFunction        = NoFunction;
       curveBreakPoint           = 0.75;
       noiseThresholdingAmount   = 0.00;
       noiseThreshold            = 3.00;
       lowRange                  = 0.000;
       highRange                 = 0.000;
       previewMode               = Disabled;
       previewLayer              = 0;
       toLuminance               = true;
       toChrominance             = true;
       linear                    = false;
   }
   wavlets.executeOn(view, false/*swapFile*/ );
}

// -----------------------------------------------------------------------------
function doAuxiliarImage( image )
{
   var mask = createImageCopyWindow("Mask", image);
   var maskView = mask.mainView;

   // do awt
   var auxLayers = new Array(nStarMask);
   for(var i=0; i < nStarMask; ++i)
   {
       auxLayers[i] = [true, true, 1.00, 3.00, 0.000, false, 0, 0.50, 2, 5, false, true, 1.0, 0.02000];
   }
   auxLayers[nStarMask] = [false, true, 1.00, 3.00, 0.000, false, 0, 0.50, 2, 5, false, false, 0.50, 0.02000];

   doWaveletTransform(auxLayers, maskView);

   return mask;
}

// -----------------------------------------------------------------------------
function doMask( image, view_id, numberOfLayers )
{
   var mask = createImageCopyWindow("Mask", image);
   var maskView = mask.mainView;

   // RBGWorking space
   var rgb = new RGBWorkingSpace;
   with (rgb)
   {
       channels = // Y, x, y
           [
           [0.333333, 0.648431, 0.330856],
           [0.333333, 0.321152, 0.597871],
           [0.333333, 0.155886, 0.066044]];
       gamma = 2.20;
       sRGBGamma = true;
       applyGlobalRGBWS = false;
   }
   rgb.executeOn(maskView, false/*swapFile*/ );

   // Anti deringing: Carlos Paranoia :D
   var auxMask = doAuxiliarImage(image);
   var id = auxMask.mainView.id;

   var pm = new PixelMath;
   with (pm)
   {
       expression  = "$T -"+id;
       useSingleExpression = true;
       use64BitWorkingImage = false;
       rescale = false;
       rescaleLower = 0.0000000000;
       rescaleUpper = 1.0000000000;
       truncate = true;
       truncateLower = 0.0000000000;
       truncateUpper = 1.0000000000;
       createNewImage = false;
   }
   pm.executeOn( maskView, false/*swapFile*/ );

   //auxMask.show();

   auxMask.forceClose();

   // wavlets
   var auxLayers = new Array(numberOfLayers);
   for(var i=0; i < numberOfLayers; ++i)
   {
       auxLayers[i] = [false, true, 1.00, 3.00, 0.000, false, 0, 0.50, 2, 5, false, false, 0.50, 0.02000];
   }
   auxLayers[numberOfLayers] = [true, true, 1.00, 3.00, 0.000, false, 0, 0.50, 2, 5, false, false, 0.50, 0.02000];

   doWaveletTransform(auxLayers, maskView);

   // Pixel Math
   var pm = new PixelMath;
   with ( pm )
   {
       expression = maskView.id+"-"+view_id;
       expression1 = "";
       expression2 = "";
       useSingleExpression = true;
       variables = "";
       use64BitWorkingImage = false;
       rescale = false;
       rescaleLower = 0.0000000000;
       rescaleUpper = 1.0000000000;
       truncate = true;
       truncateLower = 0.0000000000;
       truncateUpper = 1.0000000000;
       createNewImage = false;
       newImageId = "";
       newImageWidth = 0;
       newImageHeight = 0;
       newImageColorSpace = SameAsTarget;
       newImageSampleFormat = SameAsTarget;
   }
   pm.executeOn( maskView, false/*swapFile*/ );

   // Convert to gray
   if(image.colorSpace != ColorSpace_Gray)
   {
       var toGray = new ConvertToGrayscale;
       toGray.executeOn( maskView, false/*swapFile*/ );
   }

   // Rescale
   var rescale = new Rescale;
   with ( rescale )
   {
       mode = RGBK;
   }
   rescale.executeOn( maskView, false/*swapFile*/ );

   // Noise reduction
   var nr = new ATrousWaveletTransformV1;
   with ( nr )
   {
       version = 257;
       layers = // enabled, biasEnabled, structureDetectionThreshold, structureDetectionRange, bias, noiseReductionEnabled, noiseReductionFilter, noiseReductionAmount, noiseReductionIterations, noiseReductionKernelSize, noiseReductionProtectSignificant, deringingEnabled, deringingAmount, deringingThreshold
           [
           [false, true, 1.00, 3.00, 0.000, false, Recursive, 1.00, 5, 5, false, false, 0.50, 0.02000],
           [true, true, 1.00, 3.00, 0.000, true, Recursive, 1.00, 5, 5, false, false, 0.50, 0.02000],
           [true, true, 1.00, 3.00, 0.000, false, Recursive, 0.50, 2, 5, false, false, 0.50, 0.02000]];
       scaleDelta                = 0;
       scalingFunctionData       = scalingFunctions[0].kernel;
       scalingFunctionKernelSize = scalingFunctions[0].size;
       scalingFunctionName       = scalingFunctions[0].name;
       largeScaleFunction        = NoFunction;
       toLuminance               = true;
       toChrominance             = false;
       linear                    = false;
   }
   nr.executeOn( maskView, false/*swapFile*/ );

   return mask;
}

// -----------------------------------------------------------------------------
function doDarkStructureEnhance(view, median, numberOfLayers)
{
   var hist = new HistogramTransformation;

   hist.H = [
     [0, 0.5,   1, 0, 1], // R
     [0, 0.5,   1, 0, 1], // G
     [0, 0.5,   1, 0, 1], // B
     [0, median,1, 0, 1], // RGB
     [0, 0.5,   1, 0, 1], // Alpha
     ];

   var mask = doMask(view.image, view.id, numberOfLayers);

   var pc = new ProcessContainer;

   for(var i=0; i < data.iterations; ++i)
   {
     pc.add(hist);
     pc.setMask(i, mask,false/*invert*/);
   }

   view.beginProcess();
   pc.executeOn( view, false/*swapFile*/ );
   view.endProcess();

   mask.removeMaskReferences();

   if ( data.viewMask )
      mask.show();
   else
      mask.forceClose();

}

// ----------------------------------------------------------------------------
// createPreview
// ----------------------------------------------------------------------------
function createPreview()
{
   var layers  = [];
   var amounts = [];
   var numberOfLayers = data.numberOfLayers;
   var currentAmount  = convertMedianToValue(data.median);

   // set layers
   if(numberOfLayers == LAYERS_TO_REMOVE_MIN)
   {
      layers = [numberOfLayers, numberOfLayers+1, numberOfLayers+2];
   }
   else if(numberOfLayers == LAYERS_TO_REMOVE_MAX)
   {
      layers = [numberOfLayers-2, numberOfLayers-1, numberOfLayers];
   }
   else
   {
      layers = [numberOfLayers-1, numberOfLayers, numberOfLayers+1];
   }

   // set amounts
   if(currentAmount < 0.1)
   {
      amounts = [currentAmount, currentAmount+0.1, currentAmount+0.2];
   }
   else if(currentAmount > 0.9)
   {
      amounts = [currentAmount-0.2, currentAmount-0.1, currentAmount];
   }
   else
   {
      amounts = [currentAmount-0.1, currentAmount, currentAmount+0.1];
   }

   var prevImage  = data.preview.image;
   var xWidth = prevImage.width  * layers.length  + PREV_SEPARATOR_WIDTH * (layers.length  + 1);
   var yWidth = prevImage.height * amounts.length + PREV_SEPARATOR_WIDTH * (amounts.length + 1);
   var pvid = uniqueViewId("DarkStructureEnhanceTGPreview");

   var prevWindow = new ImageWindow(
      xWidth,
      yWidth,
      prevImage.numberOfChannels,
      prevImage.bitsPerSample,
      prevImage.sampleType == SampleType_Real,
      prevImage.colorSpace != ColorSpace_Gray,
      pvid
   );

   var copyWindow = createRawImageWindow(uniqueViewId("DarkStructureEnhanceTGCopy"), prevImage);

   for(var i = 0; i < layers.length; ++i)
   {
      for(var j = 0; j < amounts.length; ++j)
      {
         var signatureText = "Layers: " + layers[i] + " amount: " + Math.round(amounts[j]*100)/100;

         // refresh copy of preview
         with( copyWindow.mainView )
         {
            beginProcess( UndoFlag_NoSwapFile );
            image.apply( prevImage );
            endProcess();
         }

         // process preview copy
         doDarkStructureEnhance(copyWindow.mainView, convertValueToMedian(amounts[j]), layers[i]);

         // draw current settings into copy
         with( copyWindow.mainView )
         {
            beginProcess( UndoFlag_NoSwapFile );
            var signature_data = new DrawSignatureData( copyWindow.mainView, signatureText );
            DrawSignature( signature_data );
            endProcess();
         }

         // place preview copy in preview window
         with ( prevWindow.mainView )
         {
            beginProcess( UndoFlag_NoSwapFile );
            image.selectedPoint = new Point( prevImage.width  * i + i * PREV_SEPARATOR_WIDTH + PREV_SEPARATOR_WIDTH,
                                             prevImage.height * j + j * PREV_SEPARATOR_WIDTH + PREV_SEPARATOR_WIDTH );
            image.apply( copyWindow.mainView.image );
            endProcess();
         }
      }
   }

   copyWindow.forceClose();
   ApplyAutoSTF(prevWindow.mainView, SHADOWS_CLIP, TARGET_BKG, true /*linked*/);
   prevWindow.zoomToFit();
   prevWindow.show();
}

// -----------------------------------------------------------------------------
// do work
// -----------------------------------------------------------------------------
function doWork()
{
   // Check if image is linear
   if(isStretched(data.targetView) && errorMessageOkCancel("Image seems to be non-linear, continue?", TITLE))
      return;

   Console.show();
   var t0 = new Date;

   //------ real work starts here ---------
   if(data.preview_id != "")
   {
      createPreview();
   }
   else
   {
      doDarkStructureEnhance(data.targetView, data.median, data.numberOfLayers);
   }

   //------ real work end -----------------

   var t1 = new Date;
   Console.writeln(format("<end><cbr>doWork: %.2f s", (t1.getTime() - t0.getTime())/1000));
   Console.hide();
}

// -----------------------------------------------------------------------------
function DarkMaskLayersDialog()
{
   this.__base__ = Dialog;
   this.__base__();

   data.dialog = this;
   var emWidth = this.font.width( 'M' );
   var labelWidth = this.font.width( "Layers to remove:" + 'T' );

   //---------------------------------------------------------------------------
   this.helpLabel = new Label( this );
   with( this.helpLabel )
   {
      frameStyle = FrameStyle_Box;
      margin = 4;
      wordWrapping = true;
      useRichText = true;
      text =
         "<p><b>" + TITLE + " v" + VERSION + "</b> &mdash; A script for "
         + "enhancement of dark image structures.</p>"
         + "<p>The script can also provide the mask used in the DSE process. To include "
         + "larger structures in the mask, increase the number of layers to remove. "
         + "To increase enhancement of dark structures, increase the value of the "
         + "<i>Amount</i> parameter.</p>"
         + "<p>Copyright &copy; 2009 Carlos Sonnenstein and Oriol Lehmkuhl (Pteam) / 2022 Thorsten Glebe</p>";
   }

   //---------------------------------------------------------------------------
   this.targetImage_Label = new Label( this );
   with( this.targetImage_Label )
   {
      minWidth = labelWidth + this.logicalPixelsToPhysical( 6+1 ); // align with labels inside group boxes below
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

      toolTip = "Select the image to perform the Dark Structure Enhancement.";

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
            data.view_id    = "";
            disableAllControls();
         }

         // update preview ViewList
         data.dialog.previewViewList.getPreviews();
         excludePreviews(data.dialog.previewViewList, data.view_id);
      }
   }

   this.targetImage_Sizer = new HorizontalSizer;
   with( this.targetImage_Sizer )
   {
      spacing = 4;
      add( this.targetImage_Label );
      add( this.targetImage_ViewList, 100 );
   }

   //---------------------------------------------------------------------------
   // Dark Mask parameters
   this.numberOfLayers_Label = new Label( this );
   with( this.numberOfLayers_Label )
   {
      minWidth = labelWidth;
      text = "Layers to remove:";
      textAlignment = TextAlign_Right|TextAlign_VertCenter;
   }

   this.numberOfLayers_SpinBox = new SpinBox( this );
   with( this.numberOfLayers_SpinBox )
   {
      enabled = data.targetView != null;
      minValue = LAYERS_TO_REMOVE_MIN;
      maxValue = LAYERS_TO_REMOVE_MAX;
      value = data.numberOfLayers;

      toolTip = this.numberOfLayers_Label.toolTip = "<b>Number of wavelet layers that will be removed to build an enhancement mask.</b>";

      onValueUpdated = function( value ) { data.numberOfLayers = value; }
   }

   this.extractResidual_CheckBox = new CheckBox( this );
   with( this.extractResidual_CheckBox )
   {
      enabled = data.targetView != null;
      text = "Extract mask";
      checked = data.viewMask;

      toolTip = "<p>If this option is selected, the script will create an image window "
              + "with the mask used to perform dark structure enhancement.</p>";

      onCheck = function( checked ) { data.viewMask = checked; }
   }

   this.numberOfLayers_Sizer = new HorizontalSizer;
   with( this.numberOfLayers_Sizer )
   {
      spacing = 4;
      add( this.numberOfLayers_Label );
      add( this.numberOfLayers_SpinBox );
      addSpacing( 12 );
      add( this.extractResidual_CheckBox );
      addStretch();
   }

   //---------------------------------------------------------------------------
   this.scalingFunction_Label = new Label( this );
   with( this.scalingFunction_Label )
   {
      minWidth = labelWidth;
      text = "Scaling function:";
      textAlignment = TextAlign_Right|TextAlign_VertCenter;
   }

   this.scalingFunction_ComboBox = new ComboBox( this );
   with( this.scalingFunction_ComboBox )
   {
      enabled = data.targetView != null;
      for ( var i = 0; i < scalingFunctions.length; ++i )
         addItem( scalingFunctions[i].name );
      currentItem = data.scalingFunction;

      toolTip = this.scalingFunction_Label.toolTip = "<p>Select a scaling function to perform the wavelet decomposition.</p>";

      onItemSelected = function( index ) { data.scalingFunction = index; }
   }

   this.scalingFunction_Sizer = new HorizontalSizer;
   with( this.scalingFunction_Sizer )
   {
      spacing = 4;
      add( this.scalingFunction_Label );
      add( this.scalingFunction_ComboBox );
      addStretch();
   }

   //---------------------------------------------------------------------------
   this.dmParGroupBox = new GroupBox( this );
   with( this.dmParGroupBox )
   {
      title = "Mask Parameters";
      sizer = new VerticalSizer;
      sizer.margin = 6;
      sizer.spacing = 4;
      sizer.add( this.numberOfLayers_Sizer );
      sizer.add( this.scalingFunction_Sizer );
   }

   // DSE parameters
   this.median_NC = new NumericControl (this);
   with ( this.median_NC )
   {
      enabled = data.targetView != null;
      label.text = "Amount:";
      label.minWidth = labelWidth;
      setRange (0.0, 0.99);
      slider.setRange (0, 1000);
      slider.scaledMinWidth = 250;
      setPrecision (2);
      setValue (convertMedianToValue(data.median));

      toolTip = "<p>DSE intensity for each iteration.</p>";

      onValueUpdated = function (value) { data.median = convertValueToMedian(value); };
   }

   this.iter_Label = new Label( this );
   with( this.iter_Label )
   {
      minWidth = labelWidth;
      text = "Iterations:";
      textAlignment = TextAlign_Right|TextAlign_VertCenter;
   }

   this.iter_SpinBox = new SpinBox( this );
   with( this.iter_SpinBox )
   {
      enabled = data.targetView != null;
      minValue = 1;
      maxValue = 10;
      value = data.iterations;

      toolTip = "<p>Number of midtones balance transformations.</p>";

      onValueUpdated = function( value ) { data.iterations = value; }
   }

   this.iter_Sizer = new HorizontalSizer;
   with( this.iter_Sizer )
   {
      spacing = 4;
      add( this.iter_Label );
      add( this.iter_SpinBox );
      addStretch();
   }

   //---------------------------------------------------------------------------
   this.dseParGroupBox = new GroupBox( this );
   with( this.dseParGroupBox )
   {
      title = "DSE Parameters";
      sizer = new VerticalSizer;
      sizer.margin = 6;
      sizer.spacing = 4;
      sizer.add( this.median_NC );
      sizer.add( this.iter_Sizer );
   }

   // -------------------------------------------------------------------------
   this.previewLabel = new Label( this );
   with( this.previewLabel )
   {
      minWidth = labelWidth;
      text = "Preview:";
      textAlignment = TextAlign_Right|TextAlign_VertCenter;
   }

   this.previewViewList = new ViewList( this );
   with( this.previewViewList )
   {
      enabled = data.targetView != null;

      scaledMinWidth = 200;
      getPreviews();
      excludePreviews(this.previewViewList, data.view_id);
      if(data.preview)
         currentView = data.preview;

      toolTip = this.previewLabel.toolTip = "Select the target preview.";

      onViewSelected = function( view )
      {
         if(view.id)
         {
            data.preview    = view;
            data.preview_id = view.id;
         }
         else
         {
            data.preview    = null;
            data.preview_id = "";
         }
      }
   }

   this.previewSizer = new HorizontalSizer;
   with( this.previewSizer )
   {
      spacing = 4;
      add(this.previewLabel);
      add(this.previewViewList, 100);
   }

   // -------------------------------------------------------------------------
   this.previewGroupBox = new GroupBox( this );
   with( this.previewGroupBox )
   {
      title = "Preview Dark Structure Enhance";
      sizer = new VerticalSizer;
      sizer.margin = 6;
      sizer.spacing = 4;
      sizer.add(this.previewSizer);
   }

   // -------------------------------------------------------------------------
   // usual control buttons
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

   this.ok_Button = new ToolButton( this );
   with( this.ok_Button )
   {
      icon = scaledResource( ":/process-interface/execute.png" );
      toolTip = "If preview is selected, generate preview window. Deselect preview to apply script on target image.";

      onClick = () => { this.ok(); }
   }

   this.cancel_Button = new ToolButton( this );
   with( this.cancel_Button )
   {
      icon = scaledResource( ":/process-interface/cancel.png" );
      toolTip = "Cancel script";

      onClick = () => { this.cancel(); }
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
         data.dialog.numberOfLayers_SpinBox.value         = data.numberOfLayers;
         data.dialog.extractResidual_CheckBox.checked     = data.viewMask;
         data.dialog.scalingFunction_ComboBox.currentItem = data.scalingFunction;
         data.dialog.median_NC.setValue(convertMedianToValue(data.median));
         data.dialog.iter_SpinBox.value                   = data.iterations;
         disableAllControls();
      }
   }

   this.buttons_Sizer = new HorizontalSizer;
   with( this.buttons_Sizer )
   {
      spacing = 4;
      add(this.newInstance_Button);
      addStretch();
      add( this.ok_Button );
      add( this.cancel_Button );
      add( this.reset_Button );
   }

   //---------------------------------------------------------------------------
   this.sizer = new VerticalSizer;
   with( this.sizer )
   {
      margin = 8;
      spacing = 6;
      add( this.helpLabel );
      addSpacing( 4 );
      add( this.targetImage_Sizer );
      addSpacing( 4 );
      add( this.dmParGroupBox);
      addSpacing( 4 );
      add( this.dseParGroupBox);
      addSpacing( 4 );
      add( this.previewGroupBox );
      addSpacing( 4 );
      add( this.buttons_Sizer );
   }

   this.windowTitle = TITLE;
   this.adjustToContents();
   this.setFixedSize();
}

DarkMaskLayersDialog.prototype = new Dialog;

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

   var dialog = new DarkMaskLayersDialog();
   for ( ;; )
   {
      if ( !dialog.execute() )
         return;

      // A view must be selected.
      if ( !data.targetView )
      {
         errorMessageOk("You must select a view to apply this script.", TITLE);
         continue;
      }

      break;
   }

   doWork();
}

main();
