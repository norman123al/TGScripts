/*
   TGScriptsLib v1.0

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

#ifndef __TGScriptsLib_js
#define __TGScriptsLib_js

#include <pjsr/ColorSpace.jsh>
#include <pjsr/SampleType.jsh>
#include <pjsr/UndoFlag.jsh>
#include <pjsr/StdIcon.jsh>
#include <pjsr/StdButton.jsh>
#include <pjsr/PropertyType.jsh>
#include <pjsr/PropertyAttribute.jsh>

#define MIN_IMAGE_WIDTH         256
#define MIN_IMAGE_HEIGHT        256
#define TMP_STF_WINDOW_NAME     "tmpSTFWindow"
#define NOISE_PROPERTY_KEY      "TGScript:Noise"
#define SNR_PROPERTY_KEY        "TGScript:SNR"
#define SNRDB_PROPERTY_KEY      "TGScript:SNR:DB"

// Shadows clipping point in (normalized) MAD units from the median.
#define SHADOWS_CLIP -2.80
// Target mean background in the [0,1] range.
#define TARGET_BKG    0.25

// ----------------------------------------------------------------------------
// error message popup window, ok button
// ----------------------------------------------------------------------------
function errorMessageOk(txt, title)
{
   var msg = new MessageBox(txt, title, StdIcon_Error, StdButton_Ok );
   msg.execute();
}

// ----------------------------------------------------------------------------
// error message popup window, ok & cancel button, returns true if cancel
// ----------------------------------------------------------------------------
function errorMessageOkCancel(txt, title)
{
   var msg = new MessageBox( txt, title, StdIcon_Error, StdButton_Ok, StdButton_Cancel );
   return (msg.execute() == StdButton_Cancel);
}

// ----------------------------------------------------------------------------
// Returns a main view id of a view.
// ----------------------------------------------------------------------------
function mainViewIdOfView(view)
{
   return view.isMainView ? view.id : view.window.mainView.id + "_" + view.id;
}

// ----------------------------------------------------------------------------
// assume image is stretched if median is > 0.01 (works for astro images)
// ----------------------------------------------------------------------------
function isStretched(view)
{
   return view.image.median() > 0.01
}

// ----------------------------------------------------------------------------
// Returns a unique view id with the given base id prefix.
// ----------------------------------------------------------------------------
function uniqueViewId(baseId)
{
   var id = baseId;
   for (var i = 1; !View.viewById(id).isNull; ++i)
   {
      id = baseId + format("%02d", i);
   }
   return id;
}

// ----------------------------------------------------------------------------
// Creates an image window with the given parameters.
// ----------------------------------------------------------------------------
function createRawImageWindow(viewId, baseImage)
{
   var window = new ImageWindow(
      baseImage.width,
      baseImage.height,
      baseImage.numberOfChannels,
      baseImage.bitsPerSample,
      baseImage.sampleType == SampleType_Real,
      baseImage.colorSpace != ColorSpace_Gray,
      viewId
   );

   return window;
}

// ----------------------------------------------------------------------------
// Creates an image window with the given parameters.
// ----------------------------------------------------------------------------
function createGrayscaleImageWindow(viewId, baseImage)
{
   var window = new ImageWindow(
      baseImage.width,
      baseImage.height,
      1,
      baseImage.bitsPerSample,
      baseImage.sampleType == SampleType_Real,
      false /*isColorSpace*/,
      viewId
   );

   return window;
}

// ----------------------------------------------------------------------------
// copy content of provided image into new image
// ----------------------------------------------------------------------------
function applyImageToWindow(window, image)
{
   window.mainView.beginProcess(UndoFlag_NoSwapFile);
   window.mainView.image.selectedPoint = new Point(0, 0);
   window.mainView.image.apply(image);
   window.mainView.endProcess();
}

// ----------------------------------------------------------------------------
// Creates a copy of a view as separate window instance.
// ----------------------------------------------------------------------------
function createImageCopyWindow(viewId, baseImage)
{
   var window = createRawImageWindow(viewId, baseImage);

   // copy content of provided image into new image
   applyImageToWindow(window, baseImage);

   window.mainView.image.resetSelections();

   return window;
}

// ----------------------------------------------------------------------------
// Creates a copy of a view channel as separate window instance.
// ----------------------------------------------------------------------------
function createImageChannelCopyWindow(viewId, baseImage, channelIndex)
{
   var window = createRawImageWindow(viewId, baseImage);

   window.mainView.image.selectedChannel = channelIndex;

   // copy content of provided image into new image
   applyImageToWindow(window, baseImage);

   window.mainView.image.resetSelections();

   return window;
}

// ----------------------------------------------------------------------------
// Creates a copy of a view channel as separate window instance.
// ----------------------------------------------------------------------------
function createImageLuminanceCopyWindow(viewId, baseImage)
{
   var window = createGrayscaleImageWindow(viewId, baseImage);

   var orig_colorSpace                  = baseImage.colorSpace;
   baseImage.colorSpace                 = ColorSpace_CIELab;

   // copy content of provided image into new image
   applyImageToWindow(window, baseImage);

   baseImage.colorSpace = orig_colorSpace;

   return window;
}

// ----------------------------------------------------------------------------
// copyWindow
// ----------------------------------------------------------------------------
function copyWindow( view, newName)
{
   Console.writeln('function copyWindow: ' + view.id + ' -> ' + newName);
   Console.flush();
   return createImageCopyWindow(newName, view.image);
}

// ----------------------------------------------------------------------------
// copyView
// ----------------------------------------------------------------------------
function copyView( view, newName)
{
   Console.writeln('function copyView: ' + view.id + ' -> ' + newName);
   Console.flush();
   var window = createImageCopyWindow(newName, view.image);
   return window.mainView;
}

// ----------------------------------------------------------------------------
// copyImage
// ----------------------------------------------------------------------------
function copyImage(image)
{
   var result = new Image(image.width, image.height, image.numberOfChannels, image.colorSpace, image.bitsPerSample, image.sampleType);
   result.assign(image);
   return result;
}

// ----------------------------------------------------------------------------
// excludePreviews: keep only previews belonging to specified main view
// ----------------------------------------------------------------------------
function excludePreviews(vList, main_view_id)
{
   var images = ImageWindow.windows;
   for ( var i in images )
   {
      var view = images[i].mainView;
      if (view.isMainView && view.id != main_view_id)
      {
         for( var j in images[i].previews )
         {
            vList.remove(images[i].previews[j]);
         }
      }
   }
}

// ----------------------------------------------------------------------------
// exclude previews
// ----------------------------------------------------------------------------
function excludePreviewsBySize(vList, currentViewId)
{
   var images = ImageWindow.windows;
   for ( var i in images )
   {
      var view = images[i].mainView;
      if (view.isMainView && view.id != currentViewId)
      {
         for( var j in images[i].previews )
         {
            vList.remove(images[i].previews[j]);
         }
      }
      else
      {  // throw out images which are too small
         for( var j in images[i].previews )
         {
            var prevImg = images[i].previews[j].image;
            if(prevImg.width < MIN_IMAGE_WIDTH || prevImg.height < MIN_IMAGE_HEIGHT)
            {
               vList.remove(images[i].previews[j]);
            }
         }
      }
   }
}

// ----------------------------------------------------------------------------
// get all main views
// ----------------------------------------------------------------------------
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

// ----------------------------------------------------------------------------
// exclude RGB or grayscale main views
// ----------------------------------------------------------------------------
function excludeMainViewsByColor(vList, excludeMono)
{
   var all = getAllMainViews();

   for (var i in all)
   {
      var v = all[i];
      if (excludeMono ? v.image.isGrayscale : v.image.isColor)
      {
         vList.remove(v);
         continue;
      }
   }
}

// ----------------------------------------------------------------------------
// exclude nonlinear main views
// ----------------------------------------------------------------------------
function excludeNonLinearMainViews(vList)
{
   var all = getAllMainViews();

   for (var i in all)
   {
      var v = all[i];
      if (isStretched(v))
      {
         vList.remove(v);
         continue;
      }
   }
}

// ----------------------------------------------------------------------------
// signature data
// ----------------------------------------------------------------------------
function DrawSignatureData( targetView, text )
{
   this.targetView = targetView;
   this.text       = text;
   this.fontFace   = "Helvetica";
   this.fontSize   = 12; // px
   this.bold       = true;
   this.italic     = false;
   this.stretch    = 100;
   this.textColor  = 0xffff7f00;
   this.bkgColor   = 0x80000000;
   this.margin     = 2;
}

// ----------------------------------------------------------------------------
// draw signature
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
   var expectedwidth = Math.floor(0.25 * image.width);
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
// equalize mean
// ----------------------------------------------------------------------------
function equalizeMean(view, targetView)
{
   var f = targetView.image.mean() / view.image.mean();

   var PM = new PixelMath;
   PM.expression = "$T * " + f.toString();
   PM.expression1 = "";
   PM.expression2 = "";
   PM.expression3 = "";
   PM.useSingleExpression = true;
   PM.symbols = "";
   PM.generateOutput = true;
   PM.singleThreaded = false;
   PM.use64BitWorkingImage = false;
   PM.rescale = false;
   PM.truncate = true;
   PM.truncateLower = 0;
   PM.truncateUpper = 1;
   PM.createNewImage = false;
   PM.newImageAlpha = false;
   PM.newImageColorSpace = PixelMath.prototype.SameAsTarget;
   PM.newImageSampleFormat = PixelMath.prototype.SameAsTarget;

   PM.executeOn(view);
}

// ----------------------------------------------------------------------------
// extractChannels
// ----------------------------------------------------------------------------
function extractChannels(view, newBaseName)
{
   // retrieve RGBs from view, quiet solution instead of using ChannelExtraction
   var newName = newBaseName + view.id
   var r = uniqueViewId(newName + "_R");
   var g = uniqueViewId(newName + "_G");
   var b = uniqueViewId(newName + "_B");

   var viewArr = [];
   var nameArr = [r, g, b];

	for (var i = 0; i < 3; i++)
	{
		view.image.selectedChannel = i;
		var image = new Image(view.image);
		var w = new ImageWindow(image.width, image.height );
		w.mainView.beginProcess( UndoFlag_NoSwapFile );
		w.mainView.image.apply(image);
		w.mainView.endProcess();
		w.mainView.id = nameArr[i];
      viewArr.push(w.mainView);
	}
   view.image.resetSelections();

   return viewArr;
}

// ----------------------------------------------------------------------------
// STF Auto Stretch routine for all kind of images
// ----------------------------------------------------------------------------
function ApplyAutoSTF( view, shadowsClipping, targetBackground, rgbLinked )
{
   var stf = new ScreenTransferFunction;

   var n = view.image.isColor ? 3 : 1;

   var median = view.computeOrFetchProperty( "Median" );

   var mad = view.computeOrFetchProperty( "MAD" );
   mad.mul( 1.4826 ); // coherent with a normal distribution

   if ( rgbLinked )
   {
      /*
       * Try to find how many channels look as channels of an inverted image.
       * We know a channel has been inverted because the main histogram peak is
       * located over the right-hand half of the histogram. Seems simplistic
       * but this is consistent with astronomical images.
       */
      var invertedChannels = 0;
      for ( var c = 0; c < n; ++c )
         if ( median.at( c ) > 0.5 )
            ++invertedChannels;

      if ( invertedChannels < n )
      {
         /*
          * Noninverted image
          */
         var c0 = 0, m = 0;
         for ( var c = 0; c < n; ++c )
         {
            if ( 1 + mad.at( c ) != 1 )
               c0 += median.at( c ) + shadowsClipping * mad.at( c );
            m  += median.at( c );
         }
         c0 = Math.range( c0/n, 0.0, 1.0 );
         m = Math.mtf( targetBackground, m/n - c0 );

         stf.STF = [ // c0, c1, m, r0, r1
                     [c0, 1, m, 0, 1],
                     [c0, 1, m, 0, 1],
                     [c0, 1, m, 0, 1],
                     [0, 1, 0.5, 0, 1] ];
      }
      else
      {
         /*
          * Inverted image
          */
         var c1 = 0, m = 0;
         for ( var c = 0; c < n; ++c )
         {
            m  += median.at( c );
            if ( 1 + mad.at( c ) != 1 )
               c1 += median.at( c ) - shadowsClipping * mad.at( c );
            else
               c1 += 1;
         }
         c1 = Math.range( c1/n, 0.0, 1.0 );
         m = Math.mtf( c1 - m/n, targetBackground );

         stf.STF = [ // c0, c1, m, r0, r1
                     [0, c1, m, 0, 1],
                     [0, c1, m, 0, 1],
                     [0, c1, m, 0, 1],
                     [0, 1, 0.5, 0, 1] ];
      }
   }
   else
   {
      /*
       * Unlinked RGB channnels: Compute automatic stretch functions for
       * individual RGB channels separately.
       */
      var A = [ // c0, c1, m, r0, r1
               [0, 1, 0.5, 0, 1],
               [0, 1, 0.5, 0, 1],
               [0, 1, 0.5, 0, 1],
               [0, 1, 0.5, 0, 1] ];

      for ( var c = 0; c < n; ++c )
      {
         if ( median.at( c ) < 0.5 )
         {
            /*
             * Noninverted channel
             */
            var c0 = (1 + mad.at( c ) != 1) ? Math.range( median.at( c ) + shadowsClipping * mad.at( c ), 0.0, 1.0 ) : 0.0;
            var m  = Math.mtf( targetBackground, median.at( c ) - c0 );
            A[c] = [c0, 1, m, 0, 1];
         }
         else
         {
            /*
             * Inverted channel
             */
            var c1 = (1 + mad.at( c ) != 1) ? Math.range( median.at( c ) - shadowsClipping * mad.at( c ), 0.0, 1.0 ) : 1.0;
            var m  = Math.mtf( c1 - median.at( c ), targetBackground );
            A[c] = [0, c1, m, 0, 1];
         }
      }

      stf.STF = A;
   }

/*
   Console.writeln( "<end><cbr/><br/><b>", view.fullId, "</b>:" );
   for ( var c = 0; c < n; ++c )
   {
      Console.writeln( "channel #", c );
      Console.writeln( format( "c0 = %.6f", stf.STF[c][0] ) );
      Console.writeln( format( "m  = %.6f", stf.STF[c][2] ) );
      Console.writeln( format( "c1 = %.6f", stf.STF[c][1] ) );
   }
*/

   stf.executeOn( view );

   console.writeln( "<end><cbr/><br/>" );
}

// ----------------------------------------------------------------------------
// applySTFHT - return permanently streched image
// ----------------------------------------------------------------------------
function applySTFHT( img, stf )
{
   var HT = new HistogramTransformation;
   if (img.isColor)
   {
      HT.H = [	[stf[0][1], stf[0][0], stf[0][2], stf[0][3], stf[0][4]],
               [stf[1][1], stf[1][0], stf[1][2], stf[1][3], stf[1][4]],
               [stf[2][1], stf[2][0], stf[2][2], stf[2][3], stf[2][4]],
               [ 0, 0.5, 1, 0, 1]
             ];
   }
   else
   {
      HT.H = [	[ 0, 0.5, 1, 0, 1],
               [ 0, 0.5, 1, 0, 1],
               [ 0, 0.5, 1, 0, 1],
               [stf[0][1], stf[0][0], stf[0][2], stf[0][3], stf[0][4]]
             ];
   }

   //Console.writeln("R/K: ",  stf[0][0], ",", stf[0][1], ",", stf[0][2], ",", stf[0][3], ",", stf[0][4]);
   //Console.writeln("G  : ",  stf[1][0], ",", stf[1][1], ",", stf[1][2], ",", stf[1][3], ",", stf[1][4]);
   //Console.writeln("B  : ",  stf[2][0], ",", stf[2][1], ",", stf[2][2], ",", stf[2][3], ",", stf[2][4]);
   //Console.writeln("L  : ",  stf[3][0], ",", stf[3][1], ",", stf[3][2], ",", stf[3][3], ",", stf[3][4]);
   //Console.writeln("width: ", img.width, " height: ", img.height, " , channels: " , img.numberOfChannels, " , bitsperpixel: ", img.bitsPerSample, " , sample: ", img.sampleType, " ,is color: ", img.isColor);

   var wtmp = new ImageWindow( img.width, img.height, img.numberOfChannels, img.bitsPerSample, img.sampleType == SampleType_Real, img.isColor, uniqueViewId(TMP_STF_WINDOW_NAME) );
   var v = wtmp.mainView;
   v.beginProcess( UndoFlag_NoSwapFile );
   v.image.assign( img );
   v.image.resetSelections();
   v.endProcess();
   // permanent strecht by HistogramTransformation
   HT.executeOn( v, false ); // no swap file

   // return image copy, throw away window
   var result = copyImage(v.image);

   wtmp.forceClose();
   return result;
}

// ----------------------------------------------------------------------------
// hasSTF - true if an STF is set
// ----------------------------------------------------------------------------
function hasSTF(view)
{
   var A = [ // c0, c1, m, r0, r1
               [0.5, 0, 1, 0, 1],
               [0.5, 0, 1, 0, 1],
               [0.5, 0, 1, 0, 1],
               [0.5, 0, 1, 0, 1]
          ];

   var isInitialSTF = true;
   for(var i = 0; i < 4; ++i)
   {
      for(var j = 0; j < 5; ++j)
      {
         if(A[i][j] != view.stf[i][j])
         {
            isInitialSTF = false;
            break;
         }
      }
   }

   return !isInitialSTF;
}

/**
 * Estimation of the standard deviation of the noise, assuming a Gaussian
 * noise distribution.
 *
 * - Use MRS noise evaluation when the algorithm converges for 4 >= J >= 2
 *
 * - Use k-sigma noise evaluation when either MRS doesn't converge or the
 *   length of the noise pixels set is below a 1% of the image area.
 *
 * - Automatically iterate to find the highest layer where noise can be
 *   successfully evaluated, in the [1,3] range.
 *
 * Returned noise estimates are scaled by the Sn robust scale estimator of
 * Rousseeuw and Croux.
 *
 * Copyright (C) 2017-2020 Pleiades Astrophoto. All Rights Reserved.
 * Written by Juan Conejero (PTeam)
 *
 * Modified by Thorsten Glebe 2022
*/
function ScaledNoiseEvaluation( image )
{
   var scale = image.Sn(); // computation intensive
   if ( 1 + scale == 1 )
      throw Error( "Zero or insignificant data." );

   let a, n = 4, m = 0.01*image.selectedRect.area;
   var i = 0;
   for ( ;; )
   {
      ++i;
      a = image.noiseMRS( n ); // computation intensive

      if ( a[1] >= m )
         break;
      if ( --n == 1 )
      {
         console.writeln( "<end><cbr>** Warning: No convergence in MRS noise evaluation routine - using k-sigma noise estimate." );
         a = image.noiseKSigma();
         break;
      }
   }

   this.scaledSigma = a[0]/scale; // estimated scaled stddev of Gaussian noise
   this.sigma       = a[0];       // estimated stddev of Gaussian noise
   this.count       = a[1];       // number of pixels in the noisy pixels set
   this.layers      = n;          // number of layers used for noise evaluation
}

// ----------------------------------------------------------------------------
// helper function to store values as property
// ----------------------------------------------------------------------------
function storeArrayAsPropertyValue(view, property_key, array)
{
   var vector = new Vector(array);
   var ret = view.setPropertyValue(property_key, vector, PropertyType_Auto, PropertyAttribute_Storable);
   if(!ret)
   {
      throw Error( "Failed to store " + property_key + " as property!" );
   }
}

// ----------------------------------------------------------------------------
// calculateAndStoreNoise
// ----------------------------------------------------------------------------
function calculateAndStoreNoise(view, bForceCalculation)
{
   if(!bForceCalculation && view.hasProperty(NOISE_PROPERTY_KEY) && view.hasProperty(SNR_PROPERTY_KEY) && view.hasProperty(SNRDB_PROPERTY_KEY))
   {
      return;
   }

   Console.show();
   Console.abortEnabled = true;

   //   Console.writeln( "<end><cbr><br>Ch |   noise   |  count(%) | layers |" );
   //   Console.writeln(               "---+-----------+-----------+--------+" );

   Console.writeln("Calculating scaled noise standard deviation");
   Console.flush();

   var noiseArray = [];
   var snrArray   = [];
   var snrDBArray = [];
   var image = view.image;

   // process channels
   for ( let c = 0; c < image.numberOfChannels; ++c )
   {
      Console.writeln(format("channel %i ...", c));
      Console.flush();

      image.selectedChannel = c;

      let E   = new ScaledNoiseEvaluation( image );
      let snr = image.meanOfSquares(image.selectedRect) / E.sigma / E.sigma;
      let db  = 10 * Math.log10(snr);

      noiseArray.push(E.scaledSigma);
      snrArray  .push(snr);
      snrDBArray.push(db);
      //      Console.writeln( format( "%2d | <b>%.3e</b> |  %6.2f   |    %d   |", c, E.sigma, 100*E.count/image.selectedRect.area, E.layers ) );
      //      Console.flush();
   }
   //   Console.writeln(               "---+-----------+-----------+--------+" );
   image.resetSelections();

   storeArrayAsPropertyValue(view, NOISE_PROPERTY_KEY, noiseArray);
   storeArrayAsPropertyValue(view, SNR_PROPERTY_KEY  , snrArray);
   storeArrayAsPropertyValue(view, SNRDB_PROPERTY_KEY, snrDBArray);

   Console.hide();
}

// ----------------------------------------------------------------------------
#endif   // __TGScriptsLib_js
