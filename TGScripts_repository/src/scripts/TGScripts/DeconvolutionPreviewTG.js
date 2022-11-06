/*
   DeconvolutionPreview v1.01

   A script for assisted deconvolution. The script provides several previews
   applying deconvolutions with varying point spread functions (PSF), as a
   function of the specified sigma and shape parameters. The sigma and shape
   values are plotted on each deconvolved preview for easy reference.

   Copyright (C) 2009 Juan M. Gómez (Pixinsight user)

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
   Changelog:

   1.01: Code cleanups and updated tooltip and feature information.
         Published as an official PixInsight script.

   1.0:  Initial version published on PixInsight Forum.
*/

/*
   Modified 2022 by Thorsten Glebe

   Change history:
   v2.0
      1. add "new instance" button to store parameters in icon
      2. added deconvolution parameters in GUI
      3. fixed crash issue when autostretching final preview image
      4. added support for greyscale images
      5. updated feature info
      6. change operation mode to work on previews only to speed up preview generation
   v2.1
      1. provide GUI reset button
      2. add 'Local amount' slider for local support mask
      3. change ok and cancel buttons to tool buttons

*/
#feature-id   DeconvolutionPreviewTG : TG Scripts > DeconvolutionPreviewTG

#feature-info  A script for assisted deconvolution.<br/>\
   <br/>\
   The script provides several previews applying deconvolutions with varying point spread \
   functions (PSF), as a function of the specified <i>sigma</i> and <i>shape</i> parameters. \
   <br/>\
   <br/> The sigma and shape values are plotted on each deconvolved preview for easy reference.<br/>\
   <br/><b>How to use:</b> Create a preview on the image you want to run deconvolution on. Select the preview and, \
   if available, the local support mask for that image. Then hit ok buttion to generate the previews.<br/>\
   <br/>Copyright &copy; 2009 Juan M. G&oacute;mez / 2022 Thorsten Glebe

#feature-icon  DeconvolutionPreview.xpm

#include <pjsr/Sizer.jsh>
#include <pjsr/FrameStyle.jsh>
#include <pjsr/TextAlign.jsh>
#include <pjsr/StdButton.jsh>
#include <pjsr/StdIcon.jsh>
#include <pjsr/StdCursor.jsh>
#include <pjsr/UndoFlag.jsh>
#include <pjsr/NumericControl.jsh>

#include "lib/TGScriptsLib.js"

#define VERSION "2.1"
#define TITLE "DeconvolutionPreviewTG"

#define DEFAULT_GAUSSIAN_START      1.50;
#define DEFAULT_GAUSSIAN_AMOUNT     0.50;
#define DEFAULT_GAUSSIAN_ITERATIONS 3;
#define DEFAULT_SHAPE_START         2.00;
#define DEFAULT_SHAPE_AMOUNT        0.50;
#define DEFAULT_SHAPE_ITERATIONS    3;
#define DEFAULT_DECON_ITERATIONS    30;
#define DEFAULT_GLOBAL_DARK         0.0010;
#define DEFAULT_LOCALSUPPORT_AMOUNT 0.7;

// ----------------------------------------------------------------------------

function DeconvolutionPreviewData()
{
   this.dialog               = null;
   this.targetPreview        = null;
   this.GaussianStart        = DEFAULT_GAUSSIAN_START;
   this.GaussianAmount       = DEFAULT_GAUSSIAN_AMOUNT;
   this.GaussianIterations   = DEFAULT_GAUSSIAN_ITERATIONS;
   this.ShapeStart           = DEFAULT_SHAPE_START;
   this.ShapeAmount          = DEFAULT_SHAPE_AMOUNT;
   this.ShapeIterations      = DEFAULT_SHAPE_ITERATIONS;
   this.deconiterations      = DEFAULT_DECON_ITERATIONS;
   this.globaldark           = DEFAULT_GLOBAL_DARK;
   this.localsupportmaskView = null;
   this.localsupportamount   = DEFAULT_LOCALSUPPORT_AMOUNT;
   this.prevWindow           = null;  // window of the preview
   this.lsmprevWindow        = null;  // window of local support mask matching preview
   this.prev_id              = "";
   this.lsm_id               = "";

   this.reset = function()
   {
      this.targetPreview        = null;
      this.GaussianStart        = DEFAULT_GAUSSIAN_START;
      this.GaussianAmount       = DEFAULT_GAUSSIAN_AMOUNT;
      this.GaussianIterations   = DEFAULT_GAUSSIAN_ITERATIONS;
      this.ShapeStart           = DEFAULT_SHAPE_START;
      this.ShapeAmount          = DEFAULT_SHAPE_AMOUNT;
      this.ShapeIterations      = DEFAULT_SHAPE_ITERATIONS;
      this.deconiterations      = DEFAULT_DECON_ITERATIONS;
      this.globaldark           = DEFAULT_GLOBAL_DARK;
      this.localsupportmaskView = null;
      this.localsupportamount   = DEFAULT_LOCALSUPPORT_AMOUNT;
      this.prevWindow           = null;  // window of the preview
      this.lsmprevWindow        = null;  // window of local support mask matching preview
      this.prev_id              = "";
      this.lsm_id               = "";
   }

   /*
    * Save parameters in process icon.
    */
   this.exportParameters = function()
   {
      Parameters.set("GaussianStart"       , this.GaussianStart);
      Parameters.set("GaussianAmount"      , this.GaussianAmount);
      Parameters.set("GaussianIterations"  , this.GaussianIterations);
      Parameters.set("ShapeStart"          , this.ShapeStart);
      Parameters.set("ShapeAmount"         , this.ShapeAmount);
      Parameters.set("ShapeIterations"     , this.ShapeIterations);
      Parameters.set("deconiterations"     , this.deconiterations);
      Parameters.set("globaldark"          , this.globaldark);
      Parameters.set("localsupportamount"  , this.localsupportamount);
      Parameters.set("prev_id"             , this.prev_id);
      Parameters.set("lsm_id"              , this.lsm_id);
   }

   /*
    * Restore saved parameters.
    */
   this.importParameters = function()
   {
      if (Parameters.has("GaussianStart"))
         this.GaussianStart = Parameters.getReal("GaussianStart");
      if (Parameters.has("GaussianAmount"))
         this.GaussianAmount = Parameters.getReal("GaussianAmount");
      if (Parameters.has("GaussianIterations"))
         this.GaussianIterations = Parameters.getInteger("GaussianIterations");
      if (Parameters.has("ShapeStart"))
         this.ShapeStart = Parameters.getReal("ShapeStart");
      if (Parameters.has("ShapeAmount"))
         this.ShapeAmount = Parameters.getReal("ShapeAmount");
      if (Parameters.has("ShapeIterations"))
         this.ShapeIterations = Parameters.getInteger("ShapeIterations");
      if (Parameters.has("deconiterations"))
         this.deconiterations = Parameters.getInteger("deconiterations");
      if (Parameters.has("globaldark"))
         this.globaldark = Parameters.getReal("globaldark");
      if (Parameters.has("localsupportamount"))
         this.localsupportamount = Parameters.getReal("localsupportamount");
      if (Parameters.has("prev_id"))
      {
         this.prev_id = Parameters.getString("prev_id");
         if(this.prev_id)
         {
            var arrow = this.prev_id.indexOf ("->");
            var parent_id = this.prev_id.substring (0, arrow);
            var pwindow = ImageWindow.windowById(parent_id);
            if(!pwindow.isNull)
            {
               var pid = this.prev_id.substring(arrow + 2, this.prev_id.length);
               var preview = pwindow.previewById(pid);
               if(preview)
               {
                  this.targetPreview = preview;
               }
            }
         }
      }
      if (Parameters.has("lsm_id"))
      {
         this.lsm_id = Parameters.getString("lsm_id");
         if(this.lsm_id)
         {
            var window = ImageWindow.windowById(this.lsm_id);
            if(!window.isNull)
            {
               this.localsupportmaskView = window.mainView;
            }
         }
      }
   }
}

var data = new DeconvolutionPreviewData;

// -----------------------------------------------------------------------------
function toggleAllControls( bEnable )
{
   data.dialog.GaussianStart_NC.enabled          = bEnable;
   data.dialog.GaussianAmount_NC.enabled         = bEnable;
   data.dialog.Gaussianiter_SpinBox.enabled      = bEnable;
   data.dialog.ShapeStart_NC.enabled             = bEnable;
   data.dialog.ShapeAmount_NC.enabled            = bEnable;
   data.dialog.Shapeiter_SpinBox.enabled         = bEnable;
   data.dialog.Deconiter_SpinBox.enabled         = bEnable;
   data.dialog.globaldark_Control.enabled        = bEnable;
   data.dialog.localsupportmask_ViewList.enabled = bEnable;
   if(!bEnable)
      data.dialog.localSupportAmountControl.enabled = bEnable;
}

function disableAllControls()
{
   toggleAllControls(false);
}

function enableAllControls()
{
   toggleAllControls(true);
}

// ----------------------------------------------------------------------------
function createImageWindowOfView(view)
{
   var imageWindow = createRawImageWindow(uniqueViewId(mainViewIdOfView(view)), view.image);

   imageWindow.mainView.beginProcess(UndoFlag_NoSwapFile);

   imageWindow.mainView.image.selectedPoint = new Point(0, 0);
   imageWindow.mainView.image.apply(view.image);
   imageWindow.mainView.image.resetSelections();

   imageWindow.mainView.endProcess();

   return imageWindow;
}

// ----------------------------------------------------------------------------
function generateImagesFromPreview( data )
{
   data.prevWindow = this.createImageWindowOfView(data.targetPreview);

   // create local support mask for preview-image
   if(data.localsupportmaskView)
   {
      var prect = data.targetPreview.window.previewRect( data.targetPreview );
      data.localsupportmaskView.window.deletePreviews();
      var lsmPreview = data.localsupportmaskView.window.createPreview(prect);
      data.lsmprevWindow = this.createImageWindowOfView(lsmPreview);
      data.localsupportmaskView.window.deletePreviews();
   }

}

// ----------------------------------------------------------------------------
function doDeconvolutionPreview( data )
{
   var v = data.prevWindow.mainView;
   if ( v.isNull )
      throw Error( "No target view has been specified." );

   var img_width   = v.image.width;
   var img_height  = v.image.height
   var prev_width  = img_width*(data.GaussianIterations)+((data.GaussianIterations+1)*3);
   var prev_height = img_height*(data.ShapeIterations)+((data.ShapeIterations+1)*3);

   var preview_img = new ImageWindow (
            prev_width,
            prev_height,
            v.image.numberOfChannels,
            v.image.bitsPerSample, v.image.sampleType == SampleType_Real,
            v.image.colorSpace != ColorSpace_Gray, "DeconvolutionPreview");

   var copy_img = new ImageWindow (
            img_width,
            img_height,
            v.image.numberOfChannels,
            v.image.bitsPerSample, v.image.sampleType == SampleType_Real,
            v.image.colorSpace != ColorSpace_Gray, "WorkingWindow");

   for ( var j = 0; j < data.GaussianIterations; j++ )
   {
      for ( var i = 0; i < data.ShapeIterations; i++ )
      {
         with ( copy_img.mainView )
         {
            beginProcess( UndoFlag_NoSwapFile );
            image.apply( v.image );
            var GaussianSigma = data.GaussianStart + data.GaussianAmount*j;
            var GaussianShape = data.ShapeStart + data.ShapeAmount*i;
            doDeconvolution( copy_img.mainView, GaussianSigma, GaussianShape);

            var signature_data = new DrawSignatureData( copy_img.mainView, "Sigma:" + GaussianSigma + " Shape: " + GaussianShape );
            DrawSignature( signature_data );

            endProcess();
         }

         with ( preview_img.mainView )
         {
            beginProcess( UndoFlag_NoSwapFile );
            image.selectedPoint = new Point( img_width *j + j*3 + 3,
                                             img_height*i + i*3 + 3 );
            image.apply( copy_img.mainView.image );
            endProcess();
         }
      }
   }

   copy_img.forceClose();
   copy_img = null;

   preview_img.show();
   preview_img.zoomToFit();
}

// ----------------------------------------------------------------------------
function DrawSignature( data )
{
   var image = data.targetView.image;
   // Create the font
   var font = new Font( data.fontFace );
   font.pixelSize = data.fontSize;
   // Calculate a reasonable inner margin in pixels
   var innerMargin = Math.round( font.pixelSize/5 );

   // grow font size
   var expectedwidth = Math.floor(0.3 * image.width);
   var currwidth = (font.width( data.text ) + 2*innerMargin);
   while(currwidth < expectedwidth)
   {
      font.pixelSize++;
      innerMargin = Math.round( font.pixelSize/5 );
      currwidth = (font.width( data.text ) + 2*innerMargin);
   }
   data.fontSize = font.pixelSize;

   // Calculate the sizes of our drawing box
   var width = font.width( data.text ) + 2*innerMargin;
   var height = font.ascent + font.descent + 2*innerMargin;
   // Create a bitmap where we'll perform all of our drawing work
   var bmp = new Bitmap( width, height );
   // Fill the bitmap with the background color
   bmp.fill( 0x80000000 );
   // Create a graphics context for the working bitmap
   var G = new Graphics( bmp );

   // Select the required drawing tools: font and pen.
   G.font = font;
   G.pen = new Pen( data.textColor );
   G.transparentBackground = true; // draw text with transparent bkg
   G.textAntialiasing = true;

   // Now draw the signature
   G.drawText( innerMargin, height - font.descent - innerMargin, data.text );

   // Finished drawing
   G.end();
   image.selectedPoint = new Point( data.margin, image.height - data.margin - height );
   image.blend( bmp );
}

// ----------------------------------------------------------------------------
function DrawSignatureData( cView, text )
{
   this.targetView = cView;
   this.text       = text;
   this.fontFace   = "Helvetica";
   this.fontSize   = 14; // px
   this.bold       = true;
   this.italic     = false;
   this.stretch    = 100;
   this.textColor  = 0xffff7f00;
   this.bkgColor   = 0x80000000;
   this.margin     = 2;
}

// ----------------------------------------------------------------------------
function doDeconvolution( ParsedView, GaussianSigma, GaussianShape )
{
   var p = new Deconvolution;
   with ( p )
   {
      algorithm = RichardsonLucy;
      numberOfIterations = data.deconiterations;
      deringing = true;
      deringingDark = data.globaldark;
      deringingBright = 0.0000;
      if(!data.lsmprevWindow)
      {
         deringingSupport = false;
         deringingSupportViewId = "";
      }
      else
      {
         deringingSupport = true;
         deringingSupportViewId = data.lsmprevWindow.mainView.id;
      }
      deringingSupportAmount = data.localsupportamount;

      toLuminance = true;
      psfMode = Deconvolution.prototype.Parametric;
      psfSigma = GaussianSigma;
      psfShape = GaussianShape;
      psfAspectRatio = 1.00;
      psfRotationAngle = 0.00;
      psfMotionLength = 5.00;
      psfMotionRotationAngle = 0.00;
      psfViewId = "";
      psfFFTSizeLimit = 15;
      useRegularization = true;
      waveletLayers = [ // noiseThreshold, noiseReduction
         [5.00, 1.00],
         [3.00, 1.00],
         [1.00, 0.70],
         [1.00, 0.70],
         [1.00, 0.70]
      ];
      noiseModel = Deconvolution.prototype.Gaussian;
      numberOfWaveletLayers = 3;
      scalingFunction = Deconvolution.prototype.B3Spline5x5;
      convergence = 0.0000;
      rangeLow = 0.0000000;
      rangeHigh = 0.0000000;
      iterations = [ // count
         [0],
         [0],
         [0]
      ];
   }
   p.executeOn( ParsedView );
}

// ----------------------------------------------------------------------------
function doWork(data)
{
   Console.show();

   // Check if image is non-linear
   var median = data.targetPreview.computeOrFetchProperty( "Median" ).at(0);
   if (median > 0.01)
   {
      console.writeln( format( "<end><cbr>The median is: %.5f", median ) );
      var msg = new MessageBox( "Image seems to be non-linear, continue?", TITLE, StdIcon_Error, StdButton_Ok, StdButton_Cancel );
      if(msg.execute() == StdButton_Cancel)
      {
         Console.hide();
         return;
      }
   }

   generateImagesFromPreview(data);
   doDeconvolutionPreview( data );
   data.prevWindow.forceClose();
   if(data.lsmprevWindow)
   {
      data.lsmprevWindow.forceClose();
   }

   Console.hide();
}

// ----------------------------------------------------------------------------
function DeconvolutionPreviewDialog()
{
   this.__base__ = Dialog;
   this.__base__();

   data.dialog = this;
   var emWidth = this.font.width( 'M' );
   var labelWidth1 = this.font.width( "PSF Gaussian Start:" + 'T' );

   // help box
   this.helpLabel = new Label( this );
   with ( this.helpLabel )
   {
      frameStyle = FrameStyle_Box;
      margin = 4;
      wordWrapping = true;
      useRichText = true;
      text = "<p><b>" + TITLE + " v" + VERSION + "</b> &mdash; A script for assisted deconvolution.</p>"
         + "<p>The script provides several previews applying deconvolutions with varying point "
         + "spread functions (PSF), as a function of the specified <i>sigma</i> and <i>shape</i> parameters.</p>"
         + "<p>The sigma and shape values are plotted on each deconvolved preview for easy reference."
         + "<p><b>How to use:</b> Create a preview on the image you want to run deconvolution on. Select the preview and, if available, the local support mask for that image. Then hit ok buttion to generate the previews.</p>"
         + "<p>Copyright &copy; 2009 Juan M. Gómez (Pixinsight user) / 2022 Thorsten Glebe</p>";
   }

   // -------------------------------------------------------------------------
   // target preview view list
   this.targetPreview_Label = new Label( this );
   with ( this.targetPreview_Label )
   {
      minWidth = labelWidth1 + this.logicalPixelsToPhysical( 6+1 ); // align with labels inside group boxes below
      text = "Target preview:";
      textAlignment = TextAlign_Right|TextAlign_VertCenter;
   }

   this.targetPreview_ViewList = new ViewList( this );
   with ( this.targetPreview_ViewList )
   {
      scaledMinWidth = 200;
      getPreviews();
      if ( data.targetPreview )
         currentView = data.targetPreview;

      toolTip = "Select the preview to perform the deconvolved previews.";

      onViewSelected = function( view )
      {
         if(view.id)
         {
            data.targetPreview = view;
            data.prev_id       = view.fullId;
            enableAllControls();
         }
         else
         {
            data.targetPreview = null;
            data.prev_id = "";
            disableAllControls();
         }
      }
   }

   this.targetPreview_Sizer = new HorizontalSizer;
   with ( this.targetPreview_Sizer )
   {
      spacing = 4;
      add( this.targetPreview_Label );
      add( this.targetPreview_ViewList, 100 );
   }

   // -------------------------------------------------------------------------
   // PSF Gaussian parameters
   this.GaussianStart_NC = new NumericControl( this );
   with ( this.GaussianStart_NC )
   {
      enabled = data.targetPreview != null;
      label.text = "PSF Sigma start:";
      label.minWidth = labelWidth1;
      setRange( 0.10, 9.99 );
      slider.setRange( 0, 1000 );
      slider.scaledMinWidth = 250;
      setPrecision( 2 );
      setValue( data.GaussianStart );
      toolTip = "<p>PSF Sigma starting value.</p>";
      onValueUpdated = function( value )
      {
         data.GaussianStart = value;
      }
   }

   this.GaussianAmount_NC = new NumericControl( this );
   with ( this.GaussianAmount_NC )
   {
      enabled = data.targetPreview != null;
      label.text = "Step size:";
      label.minWidth = labelWidth1;
      setRange( 0.25, 6.00 );
      slider.setRange( 0, 1000 );
      slider.scaledMinWidth = 250;
      setPrecision( 2 );
      setValue( data.GaussianAmount );
      toolTip = "<p>PSF Sigma amount for each iteration.</p>";
      onValueUpdated = function( value )
      {
         data.GaussianAmount = value;
      }
   }

   // -------------------------------------------------------------------------
   this.Gaussianiter_Label = new Label( this );
   with ( this.Gaussianiter_Label )
   {
      minWidth = labelWidth1;
      text = "Iterations:";
      textAlignment = TextAlign_Right|TextAlign_VertCenter;
   }

   this.Gaussianiter_SpinBox = new SpinBox( this );
   with ( this.Gaussianiter_SpinBox )
   {
      enabled = data.targetPreview != null;
      minValue = 1;
      maxValue = 10;
      value = data.GaussianIterations;
      toolTip = "<p>Number of PSF Sigma iterations.</p>";
      onValueUpdated = function( value )
      {
         data.GaussianIterations = value;
      }
   }

   this.Gaussianiter_Sizer = new HorizontalSizer;
   with ( this.Gaussianiter_Sizer )
   {
      spacing = 4;
      add( this.Gaussianiter_Label );
      add( this.Gaussianiter_SpinBox );
      addStretch();
   }

   // -------------------------------------------------------------------------
   this.GaussianParGroupBox = new GroupBox( this );
   with ( this.GaussianParGroupBox )
   {
      title = "PSF Sigma Parameters";
      sizer = new VerticalSizer;
      with ( sizer )
      {
         margin = 6;
         spacing = 4;
         add( this.GaussianAmount_NC );
         add( this.GaussianStart_NC );
         add( this.Gaussianiter_Sizer );
      }
   }

   // -------------------------------------------------------------------------
   // PSF Shape parameters
   this.ShapeStart_NC = new NumericControl( this );
   with ( this.ShapeStart_NC )
   {
      enabled = data.targetPreview != null;
      label.text = "PSF Shape start:";
      label.minWidth = labelWidth1;
      setRange( 0.10, 9.99 );
      slider.setRange( 0, 1000 );
      slider.scaledMinWidth = 250;
      setPrecision( 2 );
      setValue( data.ShapeStart );
      toolTip = "<p>PSF Shape starting value.</p>";
      onValueUpdated = function( value )
      {
         data.ShapeStart = value;
      }
   }

   // -------------------------------------------------------------------------
   this.ShapeAmount_NC = new NumericControl( this );
   with ( this.ShapeAmount_NC )
   {
      enabled = data.targetPreview != null;
      label.text = "Step size:";
      label.minWidth = labelWidth1;
      setRange( 0.10, 9.99 );
      slider.setRange( 0, 1000 );
      slider.scaledMinWidth = 250;
      setPrecision( 2 );
      setValue( data.ShapeAmount );
      toolTip = "<p>PSF Shape amount for each iteration.</p>";
      onValueUpdated = function ( value )
      {
         data.ShapeAmount = value;
      }
   }

   // -------------------------------------------------------------------------
   this.Shapeiter_Label = new Label( this );
   with ( this.Shapeiter_Label )
   {
      minWidth = labelWidth1;
      text = "Iterations:";
      textAlignment = TextAlign_Right|TextAlign_VertCenter;
   }

   this.Shapeiter_SpinBox = new SpinBox( this );
   with ( this.Shapeiter_SpinBox )
   {
      enabled = data.targetPreview != null;
      minValue = 1;
      maxValue = 10;
      value = data.ShapeIterations;
      toolTip = "<p>Number of PSF Shape iterations.</p>";
      onValueUpdated = function( value )
      {
         data.ShapeIterations = value;
      }
   }

   this.Shapeiter_Sizer = new HorizontalSizer;
   with ( this.Shapeiter_Sizer )
   {
      spacing = 4;
      add( this.Shapeiter_Label );
      add( this.Shapeiter_SpinBox );
      addStretch();
   }

   // -------------------------------------------------------------------------
   this.ShapeParGroupBox = new GroupBox( this );
   with ( this.ShapeParGroupBox )
   {
      title = "PSF Shape Parameters";
      sizer = new VerticalSizer;
      with ( sizer )
      {
         margin = 6;
         spacing = 4;
         add( this.ShapeAmount_NC );
         add( this.ShapeStart_NC );
         add( this.Shapeiter_Sizer );
      }
   }

   // -------------------------------------------------------------------------
   // iterations parameter
   this.Deconiter_Label = new Label( this );
   with ( this.Deconiter_Label )
   {
      minWidth = labelWidth1;
      text = "Decon Iterations:";
      textAlignment = TextAlign_Right|TextAlign_VertCenter;
   }

   this.Deconiter_SpinBox = new SpinBox( this );
   with ( this.Deconiter_SpinBox )
   {
      enabled = data.targetPreview != null;
      minValue = 1;
      maxValue = 59;
      value = data.deconiterations;
      toolTip = "<p>Number of Deconvolution iterations.</p>";
      onValueUpdated = function( value )
      {
         data.deconiterations = value;
      };
   }

   this.Deconiter_Sizer = new HorizontalSizer;
   with ( this.Deconiter_Sizer )
   {
      spacing = 4;
      add( this.Deconiter_Label );
      add( this.Deconiter_SpinBox );
      addStretch();
   }

   // -------------------------------------------------------------------------
   // global dark numeric control
   this.globaldark_Control = new NumericControl(this);
   with( this.globaldark_Control )
   {
      enabled = data.targetPreview != null;
      label.text = "Global dark: ";
      label.minWidth = labelWidth1;
//      slider.setRange(0, sliderMaxValue);
//      slider.minWidth = sliderMinWidth;
      setRange(0.0, 1.0);
      setPrecision(4);
      setValue(data.globaldark);
      onValueUpdated = function(value)
      {
         data.globaldark = value;
      }
      toolTip = "<p>Global deringing regularization strength.</p>";
   }

   // -------------------------------------------------------------------------
   // local support mask selector
   this.localsupportmask_Label = new Label( this );
   with (this.localsupportmask_Label )
   {
      minWidth = labelWidth1;
      text = "Local support mask:";
      textAlignment = TextAlign_Right|TextAlign_VertCenter;
   }

   this.localsupportmask_ViewList = new ViewList( this );
   with ( this.localsupportmask_ViewList )
   {
      enabled = data.targetPreview != null;
      scaledMinWidth = 200;
      getMainViews(); // include main views only, no previews
      if ( data.localsupportmaskView )
         currentView = data.localsupportmaskView;

      toolTip = "Select the local support mask.";

      onViewSelected = function( view )
      {
         if(view.id)
         {
            data.localsupportmaskView = view;
            data.lsm_id = view.id;
            data.dialog.localSupportAmountControl.enabled = true;
         }
         else
         {
            data.localsupportmaskView = null;
            data.localsupportamount   = DEFAULT_LOCALSUPPORT_AMOUNT;
            data.lsm_id = "";
            data.dialog.localSupportAmountControl.enabled = false;
            data.dialog.localSupportAmountControl.setValue(data.localsupportamount);
         }
      }
   }

   this.localsupportmask_Sizer = new HorizontalSizer;
   with( this.localsupportmask_Sizer )
   {
      spacing = 4;
      add( this.localsupportmask_Label );
      add( this.localsupportmask_ViewList, 100 );
      addStretch();
   }

   // -------------------------------------------------------------------------
   this.localSupportAmountControl = new NumericControl( this );
   with ( this.localSupportAmountControl )
   {
      enabled = data.localsupportmaskView != null;
      enabled = data.prev_id != "";
      label.text = "Local amount:";
      label.minWidth = labelWidth1;
      setRange( 0, 1);
      slider.setRange( 0, 100 );
      slider.scaledMinWidth = 25;
      setPrecision( 2 );
      setValue( data.localsupportamount );
      toolTip = "<p>Strength of local support mask.</p>";
      onValueUpdated = function ( value )
      {
         data.localsupportamount = value;
      }
   }

   // -------------------------------------------------------------------------
   // Decon group box
   this.DeconParGroupBox = new GroupBox( this );
   with ( this.DeconParGroupBox )
   {
      title = "Decon Parameters";
      sizer = new VerticalSizer;
      with ( sizer )
      {
         margin = 6;
         spacing = 4;
         add( this.Deconiter_Sizer );
         add( this.globaldark_Control );
         add( this.localsupportmask_Sizer );
         add( this.localSupportAmountControl );
      }
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

   this.apply_Button = new ToolButton( this );
   with ( this.apply_Button )
   {
      icon = scaledResource( ":/process-interface/apply.png" );
      toolTip = "Apply current settings to preview";

      onClick = () => {
         if(data.targetPreview)
         {
            Console.show();
            doDeconvolution(data.targetPreview, data.GaussianAmount, data.ShapeAmount);
            Console.hide();
            this.cancel();
         }
      }
   }


   this.ok_Button = new ToolButton( this );
   with ( this.ok_Button )
   {
      icon = scaledResource( ":/process-interface/execute.png" );
      toolTip = "Execute script";

      onClick = () => { this.ok(); }
   }

   this.cancel_Button = new ToolButton( this );
   with ( this.cancel_Button )
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
         if(data.dialog.targetPreview_ViewList.currentView)
         {
            data.dialog.targetPreview_ViewList.remove(data.dialog.targetPreview_ViewList.currentView);
            data.dialog.targetPreview_ViewList.getPreviews();
         }
         if(data.dialog.localsupportmask_ViewList.currentView)
         {
            data.dialog.localsupportmask_ViewList.remove(data.dialog.localsupportmask_ViewList.currentView);
            data.dialog.localsupportmask_ViewList.getMainViews();
         }
         data.reset();
         data.dialog.GaussianStart_NC.setValue(data.GaussianStart);
         data.dialog.GaussianAmount_NC.setValue(data.GaussianAmount);
         data.dialog.Gaussianiter_SpinBox.value = data.GaussianIterations;
         data.dialog.ShapeStart_NC.setValue(data.ShapeStart);
         data.dialog.ShapeAmount_NC.setValue(data.ShapeAmount);
         data.dialog.Shapeiter_SpinBox.value = data.ShapeIterations;
         data.dialog.Deconiter_SpinBox.value = data.deconiterations;
         data.dialog.globaldark_Control.setValue(data.globaldark);
         data.dialog.localSupportAmountControl.setValue(data.localsupportamount);
         disableAllControls();
      }
   }

   this.buttons_Sizer = new HorizontalSizer;
   with ( this.buttons_Sizer )
   {
      spacing = 4;
      add( this.newInstance_Button );
      add( this.apply_Button );
      addStretch();
      add( this.ok_Button );
      add( this.cancel_Button );
      add( this.reset_Button );
   }

   this.sizer = new VerticalSizer;
   with ( this.sizer )
   {
      margin = 8;
      spacing = 6;
      add( this.helpLabel );
      addSpacing( 4 );
      add( this.targetPreview_Sizer );
      add( this.GaussianParGroupBox);
      add( this.ShapeParGroupBox);
      addSpacing( 4 );
      add( this.DeconParGroupBox );
      addSpacing( 4 );
      add( this.buttons_Sizer );
   }

   this.windowTitle = TITLE + " Script";
   this.adjustToContents();
   this.setFixedSize();
}

DeconvolutionPreviewDialog.prototype = new Dialog;

/*
 * Script entry point.
 */
function main()
{
   Console.hide();

   if (Parameters.isViewTarget)
   {
      data.importParameters();
      if(Parameters.targetView.isPreview)
      {
         data.targetPreview = Parameters.targetView;
         data.prev_id       = Parameters.targetView.id;
         doWork(data);
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

         if (!window.isNull && window.currentView.isPreview)
         {
            data.targetView = window.currentView;
            data.view_id    = window.currentView.id;
         }
      }
   }

   var dialog = new DeconvolutionPreviewDialog();
   for ( ;; )
   {
      if ( !dialog.execute() )
         break;

      // A view must be selected.
      if ( !data.targetPreview )
      {
         var msg = new MessageBox( "You must select a preview to apply this script.",
                                   TITLE, StdIcon_Error, StdButton_Ok );
         msg.execute();
         continue;
      }

      //console.show();
      doWork(data);
      break;
   }

   console.hide();
}

main();
