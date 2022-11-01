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
   DarkStructureEnhanceTG v2.0

   Modified by Thorsten Glebe, October 2022
   1. added "new instance" icon to store state of GUI
   2. reduce default of 'Amount' to 0.3
   3. minor refactorings
*/

#include <pjsr/Sizer.jsh>
#include <pjsr/FrameStyle.jsh>
#include <pjsr/TextAlign.jsh>
#include <pjsr/StdButton.jsh>
#include <pjsr/StdIcon.jsh>
#include <pjsr/SampleType.jsh>
#include <pjsr/UndoFlag.jsh>
#include <pjsr/ColorSpace.jsh>
#include <pjsr/NumericControl.jsh>

#feature-id    DarkStructureEnhanceTG : TG Scripts > DarkStructureEnhanceTG

#feature-info  A script for enhancement of dark structures.<br/>\
   <br/>\
   Based on an original algorithm created by Carlos Sonnenstein (PTeam). \
   JavaScript/PixInsight implementation by Oriol Lehmkuhl (PTeam).<br/> \
   <br/> \
   Copyright &copy; 2009 Carlos Sonnenstein (PTeam) & Oriol Lehmkuhl (PTeam) / 2022 Thorsten Glebe

#feature-icon  DarkStructureEnhance.xpm

#define nStarMask 6

#define VERSION "2.0"

#define TITLE "DarkStructureEnhanceTG"

//------------ DarkMaskLayersData --------------
function DarkMaskLayersData()
{
   this.targetView      = null;
   this.view_id         = "";
   this.numberOfLayers  = 8;
   this.scalingFunction = 1;
   this.extractResidual = true;
   this.toLumi          = false;
   this.median          = 0.65;
   this.iterations      = 1;
   this.viewMask        = false;

   /*
    * Save parameters in process icon.
    */
   this.exportParameters = function()
   {
      Parameters.set("view_id"        , data.view_id);
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

//------------ ScalingFunction --------------
function ScalingFunction( kernel, name , size )
{
    this.kernel = kernel;
    this.name = name;
    this.size = size;
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

//------------ doAuxiliarImage --------------
function doAuxiliarImage(data) {

    var view = data.targetView;
    var mask = new ImageWindow(view.image.width,
            view.image.height,
            view.image.numberOfChannels,
            view.image.bitsPerSample,
            view.image.sampleType == SampleType_Real,
            view.image.colorSpace != ColorSpace_Gray,
            "Mask");
    var maskView = mask.mainView;

    // copy data
    maskView.beginProcess(UndoFlag_NoSwapFile);
    maskView.image.apply(view.image);
    maskView.endProcess();

    // do awt

    var auxLayers = new Array(nStarMask);
    for(var i=0;i<nStarMask;++i) {
        auxLayers[i] = [true, true, 1.00, 3.00, 0.000, false, 0, 0.50, 2, 5, false, true, 1.0, 0.02000];
    }
    auxLayers[nStarMask] = [false, true, 1.00, 3.00, 0.000, false, 0, 0.50, 2, 5, false, false, 0.50, 0.02000];

    var wavlets = new ATrousWaveletTransformV1;
    with ( wavlets )
    {
        version = 257;
        layers = auxLayers;
        scaleDelta = 0;
        scalingFunctionData = scalingFunctions[data.scalingFunction].kernel;
        scalingFunctionKernelSize = scalingFunctions[data.scalingFunction].size;
        scalingFunctionName = scalingFunctions[data.scalingFunction].name;
        largeScaleFunction = NoFunction;
        curveBreakPoint = 0.75;
        noiseThresholdingAmount = 0.00;
        noiseThreshold = 3.00;
        lowRange = 0.000;
        highRange = 0.000;
        previewMode = Disabled;
        previewLayer = 0;
        toLuminance = true;
        toChrominance = true;
        linear = false;
    }
    wavlets.executeOn(maskView, false/*swapFile*/ );

    return mask;
};

//------------ doMask --------------
function doMask( data ) {
    var view = data.targetView;
    var mask = new ImageWindow(
            view.image.width,
            view.image.height,
            view.image.numberOfChannels,
            view.image.bitsPerSample,
            view.image.sampleType == SampleType_Real,
            view.image.colorSpace != ColorSpace_Gray,
            "Mask");
    var maskView = mask.mainView;

    // copy data
    maskView.beginProcess(UndoFlag_NoSwapFile);
    maskView.image.apply(view.image);
    maskView.endProcess();

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

    var auxMask = doAuxiliarImage(data);

    var pm = new PixelMath;

    var id = auxMask.mainView.id;

    with (pm) {
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

    var auxLayers = new Array(data.numberOfLayers);
    for(var i=0;i<data.numberOfLayers;++i) {
        auxLayers[i] = [false, true, 1.00, 3.00, 0.000, false, 0, 0.50, 2, 5, false, false, 0.50, 0.02000];
    }
    auxLayers[data.numberOfLayers] = [true, true, 1.00, 3.00, 0.000, false, 0, 0.50, 2, 5, false, false, 0.50, 0.02000];

    var wavlets = new ATrousWaveletTransformV1;
    with ( wavlets )
    {
        version = 257;
        layers = auxLayers;
        scaleDelta = 0;
        scalingFunctionData = scalingFunctions[data.scalingFunction].kernel;
        scalingFunctionKernelSize = scalingFunctions[data.scalingFunction].size;
        scalingFunctionName = scalingFunctions[data.scalingFunction].name;
        largeScaleFunction = NoFunction;
        curveBreakPoint = 0.75;
        noiseThresholdingAmount = 0.00;
        noiseThreshold = 3.00;
        lowRange = 0.000;
        highRange = 0.000;
        previewMode = Disabled;
        previewLayer = 0;
        toLuminance = true;
        toChrominance = true;
        linear = false;
    }
    wavlets.executeOn( maskView, false/*swapFile*/ );

    // Pixel Math

    var pm = new PixelMath;
    with ( pm )
    {
        expression = maskView.id+"-"+view.id;
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

    if(view.image.colorSpace != ColorSpace_Gray) {
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
        scaleDelta = 0;
        scalingFunctionData = [
            0.292893,0.5,0.292893,
            0.5,1,0.5,
            0.292893,0.5,0.292893];
        scalingFunctionKernelSize = 3;
        scalingFunctionName = "3x3 Linear Interpolation";
        largeScaleFunction = NoFunction;
        toLuminance = true;
        toChrominance = false;
        linear = false;
    }
    nr.executeOn( maskView, false/*swapFile*/ );

    return mask;
}

//------------ doDark --------------
function doDark()
{
      // Check if image is non-linear
   var median = data.targetView.computeOrFetchProperty( "Median" ).at(0);
   if (median > 0.01)
   {
      console.writeln( format( "<end><cbr>The median is: %.5f", median ) );
      var msg = new MessageBox( "Image seems to be non-linear, continue?", TITLE, StdIcon_Error, StdButton_Ok, StdButton_Cancel );
      if(msg.execute() == StdButton_Cancel)
         return;
   }

    var hist = new HistogramTransformation;

    hist.H = [
        [0, 0.5,        1, 0, 1], // R
        [0, 0.5,        1, 0, 1], // G
        [0, 0.5,        1, 0, 1], // B
        [0, data.median,1, 0, 1], // RGB
        [0, 0.5,        1, 0, 1], // Alpha
        ];

    var mask = doMask(data);

    var pc = new ProcessContainer;

    for(var i=0;i<data.iterations;++i) {
        pc.add(hist);
        pc.setMask(i,mask,false/*invert*/);
    }

    data.targetView.beginProcess();
    pc.executeOn( data.targetView, false/*swapFile*/ );
    data.targetView.endProcess();

   mask.removeMaskReferences();

   if ( data.viewMask )
      mask.show();
   else
      mask.forceClose();
}

//------------ DarkMaskLayersDialog --------------
function DarkMaskLayersDialog()
{
   this.__base__ = Dialog;
   this.__base__();

   var emWidth = this.font.width( 'M' );
   var labelWidth1 = this.font.width( "Layers to remove:" + 'T' );

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
      minWidth = labelWidth1 + this.logicalPixelsToPhysical( 6+1 ); // align with labels inside group boxes below
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
   }

   //---------------------------------------------------------------------------
   // Dark Mask parameters
   this.numberOfLayers_Label = new Label( this );
   with( this.numberOfLayers_Label )
   {
      minWidth = labelWidth1;
      text = "Layers to remove:";
      textAlignment = TextAlign_Right|TextAlign_VertCenter;
   }

   this.numberOfLayers_SpinBox = new SpinBox( this );
   with( this.numberOfLayers_SpinBox )
   {
      minValue = 5;
      maxValue = 12;
      value = data.numberOfLayers;

      toolTip = this.numberOfLayers_Label.toolTip = "<b>Number of wavelet layers that will be removed to build an enhancement mask.</b>";

      onValueUpdated = function( value ) { data.numberOfLayers = value; }
   }

   this.extractResidual_CheckBox = new CheckBox( this );
   with( this.extractResidual_CheckBox )
   {
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
      minWidth = labelWidth1;
      text = "Scaling function:";
      textAlignment = TextAlign_Right|TextAlign_VertCenter;
   }

   this.scalingFunction_ComboBox = new ComboBox( this );
   with( this.scalingFunction_ComboBox )
   {
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
      label.text = "Amount:";
      label.minWidth = labelWidth1;
      setRange (0.0, 0.99);
      slider.setRange (0, 1000);
      slider.scaledMinWidth = 250;
      setPrecision (2);
      setValue ((data.median-0.5)*2);

      toolTip = "<p>DSE intensity for each iteration.</p>";

      onValueUpdated = function (value) { data.median = (0.5*value)+0.5; };
   }

   this.iter_Label = new Label( this );
   with( this.iter_Label )
   {
      minWidth = labelWidth1;
      text = "Iterations:";
      textAlignment = TextAlign_Right|TextAlign_VertCenter;
   }

   this.iter_SpinBox = new SpinBox( this );
   with( this.iter_SpinBox )
   {
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

   this.ok_Button = new PushButton( this );
   with( this.ok_Button )
   {
      text = "OK";
      icon = scaledResource( ":/icons/ok.png" );

      onClick = () => { this.ok(); }
   }

   this.cancel_Button = new PushButton( this );
   with( this.cancel_Button )
   {
      text = "Cancel";
      icon = scaledResource( ":/icons/cancel.png" );

      onClick = () => { this.cancel(); }
   }

   this.buttons_Sizer = new HorizontalSizer;
   with( this.buttons_Sizer )
   {
      spacing = 4;
      add(this.newInstance_Button);
      addStretch();
      add( this.ok_Button );
      add( this.cancel_Button );
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
      add( this.dmParGroupBox);
      add( this.dseParGroupBox);
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
      doDark();
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
         var msg = new MessageBox( "You must select a view to apply this script.",
                                   TITLE, StdIcon_Error, StdButton_Ok );
         msg.execute();
         continue;
      }

      break;
   }

   doDark();
}

main();
