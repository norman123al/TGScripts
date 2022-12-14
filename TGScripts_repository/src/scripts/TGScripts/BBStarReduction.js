/*
   BBStarReduction v1.1

   A script for Bill Blanshan's star reduction methods.

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
      reset button added
      enable / disable controls added
      simplified preview interface
      bug fixes, code cleanup
*/

#include <pjsr/Sizer.jsh>
#include <pjsr/FrameStyle.jsh>
#include <pjsr/NumericControl.jsh>
#include <pjsr/TextAlign.jsh>
#include <pjsr/StdButton.jsh>
#include <pjsr/StdIcon.jsh>

#include "lib/TGScriptsLib.js"

#define VERSION   "1.1"
#define TITLE     "BBStarReduction"

#define METHOD_transfer 0
#define METHOD_halo     1
#define METHOD_star     2

#define STRENGTH_SLIDER_RANGE   100
#define DEFAULT_STRENGTH_SLIDER 0.5
#define DEFAULT_METHOD          METHOD_transfer
#define DEFAULT_ITERATIONS      1
#define DEFAULT_MODE            2
#define MAX_ITERATIONS          3
#define PREV_SEPARATOR_WIDTH    3
#define SIGNATURE_FONT_SIZE     32

#feature-id    BBStarReduction : TG Scripts > BBStarReduction

#feature-info A script for Bill Blanshan's star reduction methods.<br/>\
   <br/>Note: StarXTerminator is required.<br/>\
   <br/>Copyright &copy; 2022 Thorsten Glebe. All Rights Reserved.

// ----------------------------------------------------------------------------
// ScriptData
// ----------------------------------------------------------------------------
function ScriptData()
{
   this.dialog     = null;
   this.targetView = null;
   this.preview    = null;
   this.view_id    = "";
   this.method     = DEFAULT_METHOD;
   this.strength   = convertToStrength(DEFAULT_STRENGTH_SLIDER);
   this.iterations = DEFAULT_ITERATIONS;
   this.mode       = DEFAULT_MODE;
   this.preview_id = "";

   this.reset = function()
   {
      this.targetView = null;
      this.preview    = null;
      this.view_id    = "";
      this.method     = DEFAULT_METHOD;
      this.strength   = convertToStrength(DEFAULT_STRENGTH_SLIDER);
      this.iterations = DEFAULT_ITERATIONS;
      this.mode       = DEFAULT_MODE;
      this.preview_id = "";
   }

   // Save parameters in process icon.
   this.exportParameters = function()
   {
      Parameters.set("view_id"   , this.view_id);
      Parameters.set("method"    , this.method);
      Parameters.set("strength"  , this.strength);
      Parameters.set("iterations", this.iterations);
      Parameters.set("mode"      , this.mode);
      Parameters.set("preview_id", this.preview_id);
   }

   // Restore saved parameters.
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
      if (Parameters.has("method"))
         this.method = Parameters.getInteger("method");
      if (Parameters.has("strength"))
         this.strength = Parameters.getReal("strength");
      if (Parameters.has("iterations"))
         this.iterations = Parameters.getInteger("iterations");
      if (Parameters.has("mode"))
         this.mode = Parameters.getInteger("mode");
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
   }
}

var data = new ScriptData;

// -----------------------------------------------------------------------------
// enable/disable controls
// ----------------------------------------------------------------------------
function toggleAllControls( bEnable )
{
   data.dialog.transferMethodRadioButton.enabled = bEnable;
   data.dialog.haloMethodRadioButton.enabled     = bEnable;
   data.dialog.starMethodRadioButton.enabled     = bEnable;
   data.dialog.strengthControl.enabled           = bEnable;
   data.dialog.iterationsSpinBox.enabled         = bEnable;
   data.dialog.modeComboBox.enabled              = bEnable;
   data.dialog.previewViewList.enabled           = bEnable;
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
// mode array
// ----------------------------------------------------------------------------
var modeArray = ["strong", "moderate", "soft"];

// ----------------------------------------------------------------------------
// convert input range [0, 1] to S [0.5, 0] and back
// ----------------------------------------------------------------------------
function convertToStrength(value)
{
   return 0.5 - value/2;
}

function convertToValue(strength)
{
   return (0.5 - strength) * 2;
}

// ----------------------------------------------------------------------------
// create starless
// ----------------------------------------------------------------------------
function createStarless(targetView)
{
   var starlessWindow = createImageCopyWindow( uniqueViewId("BBStarReductionStarless"), targetView.image );

   var SXT = new StarXTerminator;
   SXT.stars = false;
   SXT.unscreen = true;
   SXT.overlap = 0.20;

   if (starlessWindow.mainView.isNull || !SXT.executeOn(starlessWindow.mainView, false /*swapFile */))
   {
      errorMessageOk("Starless image creation failed!", TITLE);
      return null;
   }

   return starlessWindow;
}

// ----------------------------------------------------------------------------
// transferMethod_V2
// ----------------------------------------------------------------------------
function transferMethod_V2(strength, starless_id, targetView)
{
   targetView.beginProcess();

   var PM = new PixelMath;
   PM.expression = "S=" + strength + ";Img1=" + starless_id + ";f1= ~((~mtf(~S,$T)/~mtf(~S,Img1))*~Img1);max(Img1,f1)";
   PM.expression1 = "";
   PM.expression2 = "";
   PM.expression3 = "";
   PM.useSingleExpression = true;
   PM.symbols = "S,B,Img1,Img2,f1";
   PM.clearImageCacheAndExit = false;
   PM.cacheGeneratedImages = false;
   PM.generateOutput = true;
   PM.singleThreaded = false;
   PM.optimization = true;
   PM.use64BitWorkingImage = false;
   PM.rescale = false;
   PM.rescaleLower = 0;
   PM.rescaleUpper = 1;
   PM.truncate = true;
   PM.truncateLower = 0;
   PM.truncateUpper = 1;
   PM.createNewImage = false;
   PM.showNewImage = true;
   PM.newImageId = "";
   PM.newImageWidth = 0;
   PM.newImageHeight = 0;
   PM.newImageAlpha = false;
   PM.newImageColorSpace = PixelMath.prototype.SameAsTarget;
   PM.newImageSampleFormat = PixelMath.prototype.SameAsTarget;
   PM.executeOn(targetView, false /*swapFile */);

   targetView.endProcess();
}

// ----------------------------------------------------------------------------
// haloMethod_V2
// ----------------------------------------------------------------------------
function haloMethod_V2(strength, starless_id, targetView)
{
   targetView.beginProcess();

   var PM = new PixelMath;
   PM.expression = "S=" + strength + ";Img1=" + starless_id + ";f2=((~(~$T/~Img1)-~(~mtf(~S,$T)/~mtf(~S,Img1)))*~Img1);f3=(~(~$T/~Img1)-~(~mtf(~S,$T)/~mtf(~S,Img1)));max(Img1,$T-mean(f2,f3))";
   PM.expression1 = "";
   PM.expression2 = "";
   PM.expression3 = "";
   PM.useSingleExpression = true;
   PM.symbols = "S,B,Img1,f2,f3,";
   PM.clearImageCacheAndExit = false;
   PM.cacheGeneratedImages = false;
   PM.generateOutput = true;
   PM.singleThreaded = false;
   PM.optimization = true;
   PM.use64BitWorkingImage = false;
   PM.rescale = false;
   PM.rescaleLower = 0;
   PM.rescaleUpper = 1;
   PM.truncate = true;
   PM.truncateLower = 0;
   PM.truncateUpper = 1;
   PM.createNewImage = false;
   PM.showNewImage = true;
   PM.newImageId = "";
   PM.newImageWidth = 0;
   PM.newImageHeight = 0;
   PM.newImageAlpha = false;
   PM.newImageColorSpace = PixelMath.prototype.SameAsTarget;
   PM.newImageSampleFormat = PixelMath.prototype.SameAsTarget;
   PM.executeOn(targetView, false /*swapFile */);

   targetView.endProcess();
}

// ----------------------------------------------------------------------------
// starMethod_V2
//
// iterations 1-3, Method mode; 1=Strong; 2=Moderate; 3=Soft reductions
// ----------------------------------------------------------------------------
function starMethod_V2(iterations, mode, starless_id, targetView)
{
   targetView.beginProcess();

   var PM = new PixelMath;
   PM.expression = "Img1=" + starless_id + ";// <--Starless Image name\n" +
   "I=" + iterations +";// <--number of iterations, between 1-3\n" +
   "M=" + mode + ";// <--Method mode; 1=Strong; 2=Moderate; 3=Soft reductions\n" +
   "E1= $T*~(~(Img1/$T)*~$T);  //iteration-1\n" +
   "E2= max(E1,($T*E1)+(E1*~E1));\n" +
   "E3= E1*~(~(Img1/E1)*~E1);  //iteration-2\n" +
   "E4= max(E3,($T*E3)+(E3*~E3));\n" +
   "E5= E3*~(~(Img1/E3)*~E3);  //iteration-3\n" +
   "E6= max(E5,($T*E5)+(E5*~E5));\n" +
   "E7= iif(I==1,E1,iif(I==2,E3,E5)); // Strong reduction mode\n" +
   "E8= iif(I==1,E2,iif(I==2,E4,E6)); // Moderate reduction mode\n" +
   "E9= mean(\n" +
   "$T-($T-iif(I==1,E2,iif(I==2,E4,E6))), \n" +
   "$T*~($T-iif(I==1,E2,iif(I==2,E4,E6)))); //soft reduction mode\n" +
   "max(Img1,iif(M==1,E7,iif(M==2,E8,E9)))";
   PM.expression1 = "";
   PM.expression2 = "";
   PM.expression3 = "";
   PM.useSingleExpression = true;
   PM.symbols = "I,M,Img1,E1,E2,E3,E4,E5,E6,E7,E8,E9,E10,";
   PM.clearImageCacheAndExit = false;
   PM.cacheGeneratedImages = false;
   PM.generateOutput = true;
   PM.singleThreaded = false;
   PM.optimization = true;
   PM.use64BitWorkingImage = false;
   PM.rescale = false;
   PM.rescaleLower = 0;
   PM.rescaleUpper = 1;
   PM.truncate = true;
   PM.truncateLower = 0;
   PM.truncateUpper = 1;
   PM.createNewImage = false;
   PM.showNewImage = true;
   PM.newImageId = "";
   PM.newImageWidth = 0;
   PM.newImageHeight = 0;
   PM.newImageAlpha = false;
   PM.newImageColorSpace = PixelMath.prototype.SameAsTarget;
   PM.newImageSampleFormat = PixelMath.prototype.i8;
   PM.executeOn(targetView, false /*swapFile */);

   targetView.endProcess();
}

// ----------------------------------------------------------------------------
// createPreview
// ----------------------------------------------------------------------------
function createPreview()
{
   var xIterations = 0;
   var yIterations = 0;
   var method      = data.method;
   var strengthval = 0;
   var iterations  = 0;
   var mode        = 0;
   var methodtxt   = "";
   switch(method)
   {
      case METHOD_transfer:
         methodtxt = "Transfer";
         xIterations = 3; //(1.0 / data.sstepsize);
         yIterations = 3;
         break;
      case METHOD_halo:
         methodtxt = "Halo";
         xIterations = 3; //(1.0 / data.sstepsize);
         yIterations = 3;
         break;
      case METHOD_star:
         methodtxt = "Star";
         xIterations = modeArray.length;
         yIterations = MAX_ITERATIONS;
         break;
   }

   var prevImage  = data.preview.image;
   var xWidth = prevImage.width  * xIterations + PREV_SEPARATOR_WIDTH * (xIterations + 1);
   var yWidth = prevImage.height * yIterations + PREV_SEPARATOR_WIDTH * (yIterations + 1);
   var pvid = uniqueViewId("BBStarReduction_"+methodtxt);

   var prevWindow = new ImageWindow(
      xWidth,
      yWidth,
      prevImage.numberOfChannels,
      prevImage.bitsPerSample,
      prevImage.sampleType == SampleType_Real,
      prevImage.colorSpace != ColorSpace_Gray,
      pvid
   );

   var copyWindow = createRawImageWindow(uniqueViewId("BBStarReductionPreviewCopy"), prevImage);

   var starlessPrevWindow = createStarless(data.preview);

   if(starlessPrevWindow)
   {
      for(var i = 0; i < xIterations; ++i)
      {
         for(var j = 0; j < yIterations; ++j)
         {
            var signatureText = "";
            switch(method)
            {
               case METHOD_transfer:
               case METHOD_halo:
                  strengthval += 0.1;
                  strengthval = Math.floor(strengthval*100)/100; // round smaller fractions
                  signatureText = "strength: " + strengthval;
                  break;
               case METHOD_star:
                  iterations = j + 1;
                  mode       = i + 1;
                  signatureText = "iterations: " + iterations + " mode: " + modeArray[i];
                  break;
            }

            with( copyWindow.mainView )
            {
               beginProcess( UndoFlag_NoSwapFile );
               image.apply( prevImage );
               endProcess();
            }

            doStarReductionMethod(method, convertToStrength(strengthval), iterations, mode, starlessPrevWindow.mainView, copyWindow.mainView);

            with( copyWindow.mainView )
            {
               beginProcess( UndoFlag_NoSwapFile );
               var signature_data = new DrawSignatureData( copyWindow.mainView, signatureText );
               DrawSignature( signature_data );
               endProcess();
            }

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

      if(!starlessPrevWindow.isNull)
      {  // if gui is closed while previews are processed, starlessPrevWindow might be null
         starlessPrevWindow.forceClose();
      }
   }

   copyWindow.forceClose();
   prevWindow.fitWindow();
   prevWindow.show();
}

// ----------------------------------------------------------------------------
// perform selected star reduction method on a view
// ----------------------------------------------------------------------------
function doStarReductionMethod(method, strength, iterations, mode, starless_view, targetView)
{
   switch(method)
   {
      case METHOD_transfer:
         transferMethod_V2(strength, starless_view.id, targetView);
      break;
      case METHOD_halo:
         haloMethod_V2(strength, starless_view.id, targetView);
      break;
      case METHOD_star:
         starMethod_V2(iterations, mode + 1, starless_view.id, targetView);
      break;
   }
}

// ----------------------------------------------------------------------------
// perform star reduction on a view
// ----------------------------------------------------------------------------
function doStarReduction(method, strength, iterations, mode, targetView)
{
   var starlessWindow = createStarless(data.targetView);
   if(starlessWindow)
   {
      doStarReductionMethod(data.method, data.strength, data.iterations, data.mode + 1, starlessWindow.mainView, data.targetView);
      starlessWindow.forceClose();
   }
}

// ----------------------------------------------------------------------------
// check if window has minimum size for StarXTerminator
// ----------------------------------------------------------------------------
function check_window(image)
{
   if(image.width <= MIN_IMAGE_WIDTH || image.height <= MIN_IMAGE_HEIGHT)
   {
      Console.criticalln( format( "<end><cbr>The image size too small: %ix%i (should be at least %ix%i)", image.width, image.height, MIN_IMAGE_WIDTH, MIN_IMAGE_HEIGHT ) );
      var msg = new MessageBox( "Image too small, should be at least 512x512", TITLE, StdIcon_Error, StdButton_Cancel );
      msg.execute();
      return false;
   }
   return true;
}

// ----------------------------------------------------------------------------
// do the work
// ----------------------------------------------------------------------------
function doWork()
{
   // Check if image is non-linear
   var median = data.targetView.computeOrFetchProperty( "Median" ).at(0);
   if (median <= 0.01)
   {
      Console.writeln( format( "<end><cbr>The median is: %.5f", median ) );
      var msg = new MessageBox( "Image seems to be linear, continue?", TITLE, StdIcon_Error, StdButton_Ok, StdButton_Cancel );
      if(msg.execute() == StdButton_Cancel)
         return;
   }

   Console.show();
   var t0 = new Date;

   //------ real work starts here ---------

   if(data.preview_id != "")
   {
      if(check_window(data.preview.image))
         createPreview();
   }
   else
   {
      if(check_window(data.targetView.image))
         doStarReduction(data.method, data.strength, data.iterations, data.mode + 1, data.targetView);
   }

   //------ real work end -----------------

   var t1 = new Date;
   Console.writeln(format("<end><cbr>doWork: %.2f s", (t1.getTime() - t0.getTime())/1000));
   Console.hide();
}

// ----------------------------------------------------------------------------
// ScriptDialog
// ----------------------------------------------------------------------------
function ScriptDialog()
{
   this.__base__ = Dialog;
   this.__base__();

   data.dialog = this;
   var labelWidth  = 9 * this.font.width("M");

   // -------------------------------------------------------------------------
   this.helpLabel = new Label( this );
   with( this.helpLabel )
   {
      frameStyle = FrameStyle_Box;
      margin = 4;
      wordWrapping = true;
      useRichText = true;
      text = "<p><b>" + TITLE + " v" + VERSION
           + "</b> &mdash; A script for Bill Blanshan's star reduction methods.</p>"
           + "<p><b>Note:</b> StarXTerminator is required.</p>"
           + "<p>Copyright &copy; 2022 Thorsten Glebe</p>";
   }

   // -------------------------------------------------------------------------
   this.targetImageLabel = new Label( this );
   with( this.targetImageLabel )
   {
      minWidth = labelWidth;
      text = "Target image:";
      textAlignment = TextAlign_Right|TextAlign_VertCenter;
   }

   this.targetImageViewList = new ViewList( this );
   with( this.targetImageViewList )
   {
      var excludeViews = function(vList)
      {
         var windows = ImageWindow.windows;
         for ( var i in windows )
         {
            var view = windows[i].mainView;
            if(view.image.width < MIN_IMAGE_WIDTH || view.image.height < MIN_IMAGE_HEIGHT)
            {
               vList.remove(view);
            }
         }
      }

      scaledMinWidth = 200;
      getMainViews();
      excludeViews(this.targetImageViewList);
      if ( data.targetView )
      {
         currentView = data.targetView;
         data.view_id = currentView.id;
      }

      toolTip = this.targetImageLabel.toolTip = "Select the target image.";

      onViewSelected = function( view )
      {
         if(view.id)
         {
            data.targetView = view;
            data.preview    = null;
            data.view_id    = view.id;
            data.preview_id = "";
            enableAllControls();
         }
         else
         {
            data.targetView = null;
            data.preview    = null;
            data.view_id = "";
            data.preview_id = "";
            disableAllControls();
         }

         // update preview ViewList
         data.dialog.previewViewList.getPreviews();
         excludePreviewsBySize(data.dialog.previewViewList, data.view_id);
      }
   }

   this.targetImageSizer = new HorizontalSizer;
   with( this.targetImageSizer )
   {
      spacing = 4;
      add( this.targetImageLabel );
      add( this.targetImageViewList, 100 );
   }

   // -------------------------------------------------------------------------
   this.transferMethodRadioButton = new RadioButton(this);
   with( this.transferMethodRadioButton )
   {
      enabled = data.targetView != null
      text = "Transfer method";
      checked = data.method == METHOD_transfer;
      toolTip = "<p>Star reduction with transfer method.</p>";

      onCheck = function(checked)
      {
         if (checked)
         {
            data.method = METHOD_transfer;
            data.dialog.strengthControl.enabled   = true;
            data.dialog.iterationsSpinBox.enabled = false;
            data.dialog.modeComboBox.enabled      = false;
         }
      }
   }

   this.haloMethodRadioButton = new RadioButton(this);
   with( this.haloMethodRadioButton )
   {
      enabled = data.targetView != null
      text = "Halo method";
      checked = data.method == METHOD_halo;
      toolTip = "<p>Star reduction with halo method.</p>";

      onCheck = function(checked)
      {
         if (checked)
         {
            data.method = METHOD_halo;
            data.dialog.strengthControl.enabled   = true;
            data.dialog.iterationsSpinBox.enabled = false;
            data.dialog.modeComboBox.enabled      = false;
         }
      }
   }

   this.starMethodRadioButton = new RadioButton(this);
   with( this.starMethodRadioButton )
   {
      enabled = data.targetView != null
      text = "Star method";
      checked = data.method == METHOD_star;
      toolTip = "<p>Star reduction with star method.</p>";

      onCheck = function(checked)
      {
         if (checked)
         {
            data.method = METHOD_star;
            data.dialog.strengthControl.enabled   = false;
            data.dialog.iterationsSpinBox.enabled = true;
            data.dialog.modeComboBox.enabled      = true;
         }
      }
   }

   // -------------------------------------------------------------------------
   this.methodsGroupBox = new GroupBox( this );
   with( this.methodsGroupBox )
   {
      title = "Star Reduction Method";
      sizer = new VerticalSizer;
      sizer.margin = 6;
      sizer.spacing = 4;
      sizer.add(this.transferMethodRadioButton);
      sizer.add(this.haloMethodRadioButton);
      sizer.add(this.starMethodRadioButton);
   }

   // -------------------------------------------------------------------------
   this.strengthControl = new NumericControl(this);
   with( this.strengthControl )
   {
      enabled = data.targetView != null && (data.method == METHOD_transfer || data.method == METHOD_halo);
      label.text = "Strength:";
      label.minWidth = labelWidth;
      slider.setRange(0, STRENGTH_SLIDER_RANGE);
      slider.minWidth = 0;
      setRange(0.0, 1);
      setPrecision(2);
      setValue(convertToValue(data.strength));

      toolTip = "<p>Star reduction strength</p>";

      onValueUpdated = function(value) { data.strength = convertToStrength(value); }
   }

   // -------------------------------------------------------------------------
   this.iterationsLabel = new Label( this );
   with( this.iterationsLabel )
   {
      minWidth = labelWidth;
      text = "Iterations:";
      textAlignment = TextAlign_Right|TextAlign_VertCenter;
   }

   this.iterationsSpinBox = new SpinBox( this );
   with( this.iterationsSpinBox )
   {
      enabled = data.targetView != null && (data.method == METHOD_star);
      minValue = 1;
      maxValue = MAX_ITERATIONS;
      value = data.iterations;

      toolTip = this.iterationsLabel.toolTip = "<b>Number of iterations for star reduction.</b>";

      onValueUpdated = function( value ) { data.iterations = value; }
   }

   this.iterationsSizer = new HorizontalSizer;
   with( this.iterationsSizer )
   {
      spacing = 4;
      add( this.iterationsLabel );
      add( this.iterationsSpinBox );
      addStretch();
   }

   //---------------------------------------------------------------------------
   this.modeLabel = new Label( this );
   with( this.modeLabel )
   {
      minWidth = labelWidth;
      text = "Mode:";
      textAlignment = TextAlign_Right|TextAlign_VertCenter;
   }

   this.modeComboBox = new ComboBox( this );
   with( this.modeComboBox )
   {
      enabled = data.targetView != null && (data.method == METHOD_star);
      addItem(modeArray[0]);
      addItem(modeArray[1]);
      addItem(modeArray[2]);
      currentItem = data.mode;

      toolTip = this.modeLabel.toolTip = "<p>Star reduction mode.</p>";

      onItemSelected = function( index ) { data.mode = index; }
   }

   this.modeSizer = new HorizontalSizer;
   with( this.modeSizer )
   {
      spacing = 4;
      add( this.modeLabel );
      add( this.modeComboBox );
      addStretch();
   }

   // -------------------------------------------------------------------------
   this.paramGroupBox = new GroupBox( this );
   with( this.paramGroupBox )
   {
      title = "Star Reduction Settings";
      sizer = new VerticalSizer;
      sizer.margin = 6;
      sizer.spacing = 4;
      sizer.add(this.strengthControl);
      sizer.add(this.iterationsSizer);
      sizer.add(this.modeSizer);
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
      excludePreviewsBySize(this.previewViewList, data.view_id);
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
      title = "Preview Star Reduction";
      sizer = new VerticalSizer;
      sizer.margin = 6;
      sizer.spacing = 4;
      sizer.add(this.previewSizer);
   }

   // -------------------------------------------------------------------------
   this.newInstanceButton = new ToolButton(this);
   with( this.newInstanceButton )
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

   this.okButton = new ToolButton(this);
   with( this.okButton )
   {
      icon = scaledResource( ":/process-interface/execute.png" );
      toolTip = "If a preview is selected, generate preview window. Deselect preview to execute star reduction on target image.";

      onClick = () => { this.ok(); }
   }

   this.cancelButton = new ToolButton(this);
   with( this.cancelButton )
   {
      icon = scaledResource( ":/process-interface/cancel.png" );
      toolTip = "Cancel script";

      onClick = () => { this.cancel(); }
   }

   this.reset_Button = new ToolButton(this);
   with( this.reset_Button )
   {
      icon = scaledResource( ":/process-interface/reset.png" );
      toolTip = "Reset script to defaults";

      onMousePress = function()
      {
         if(data.dialog.targetImageViewList.currentView)
         {
            data.dialog.targetImageViewList.remove(data.dialog.targetImageViewList.currentView);
            data.dialog.targetImageViewList.getMainViews();
            excludeViews(data.dialog.targetImageViewList);
         }
         if(data.dialog.previewViewList.currentView)
         {
            data.dialog.previewViewList.remove(data.dialog.previewViewList.currentView);
            data.dialog.previewViewList.getPreviews();
            excludePreviewsBySize(data.dialog.previewViewList, data.view_id);
         }
         data.reset();
         data.dialog.transferMethodRadioButton.checked = data.method == METHOD_transfer;
         data.dialog.haloMethodRadioButton.checked     = data.method == METHOD_halo;
         data.dialog.starMethodRadioButton.checked     = data.method == METHOD_star;
         data.dialog.strengthControl.setValue(convertToValue(data.strength));
         data.dialog.iterationsSpinBox.value           = data.iterations;
         data.dialog.modeComboBox.currentItem          = data.mode;
         disableAllControls();
      }
   }

   this.buttonsSizer = new HorizontalSizer;
   with( this.buttonsSizer )
   {
      spacing = 6;
      add(this.newInstanceButton);
      addStretch();
      add(this.okButton);
      add(this.cancelButton);
      add(this.reset_Button);
   }

   // -------------------------------------------------------------------------
   this.sizer = new VerticalSizer;
   with( this.sizer )
   {
      margin = 8;
      spacing = 6;
      add( this.helpLabel );
      addSpacing( 4 );
      add( this.targetImageSizer );
      addSpacing( 4 );
      add( this.methodsGroupBox );
      addSpacing( 4 );
      add(this.paramGroupBox);
      addSpacing( 4 );
      add( this.previewGroupBox );
      addSpacing( 4 );
      add( this.buttonsSizer );
   }

   this.windowTitle = TITLE;
   this.adjustToContents();
   this.setFixedSize();
}

// Our dialog inherits all properties and methods from the core Dialog object.
ScriptDialog.prototype = new Dialog;

// ----------------------------------------------------------------------------
// main
// ----------------------------------------------------------------------------
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

   var dialog = new ScriptDialog();
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
