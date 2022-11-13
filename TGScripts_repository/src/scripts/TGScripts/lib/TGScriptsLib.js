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

#include <pjsr/ColorSpace.jsh>
#include <pjsr/SampleType.jsh>
#include <pjsr/UndoFlag.jsh>

#define MIN_IMAGE_WIDTH         256
#define MIN_IMAGE_HEIGHT        256

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
// Creates a copy of a view as separate window instance.
// ----------------------------------------------------------------------------
function createImageCopyWindow(viewId, baseImage)
{
   var window = createRawImageWindow(viewId, baseImage);

   // copy content of provided image into new image
   window.mainView.beginProcess(UndoFlag_NoSwapFile);
   window.mainView.image.selectedPoint = new Point(0, 0);
   window.mainView.image.apply(baseImage);
   window.mainView.image.resetSelections();
   window.mainView.endProcess();

   return window;
}

// ----------------------------------------------------------------------------
// Creates a copy of a view channel as separate window instance.
// ----------------------------------------------------------------------------
function createImageChannelCopyWindow(viewId, baseImage, channelIndex)
{
   var window = createRawImageWindow(viewId, baseImage);

   // copy content of provided image into new image
   window.mainView.beginProcess(UndoFlag_NoSwapFile);
   window.mainView.image.selectedPoint = new Point(0, 0);
   window.mainView.image.selectedChannel = channelIndex;
   window.mainView.image.apply(baseImage);
   window.mainView.image.resetSelections();
   window.mainView.endProcess();

   return window;
}

// ----------------------------------------------------------------------------
// copyView
// ----------------------------------------------------------------------------
function copyView( view, newName)
{
   Console.writeln('function copyView: ' + view.id + ' -> ' + newName);
   var window = createImageCopyWindow(newName, view.image);
   return window.mainView;
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
   Console.writeln("currentViewid: ", currentViewId);
   var images = ImageWindow.windows;
   for ( var i in images )
   {
      var view = images[i].mainView;
      if (view.isMainView && view.id != currentViewId)
      {
         Console.writeln("mainView: ", view.id);
         for( var j in images[i].previews )
         {
            Console.writeln("remove preview: ", images[i].previews[j].id);
            vList.remove(images[i].previews[j]);
         }
      }
      else
      {  // throw out images which are too small
         Console.writeln("mainView: ", view.id);
         for( var j in images[i].previews )
         {
            var prevImg = images[i].previews[j].image;
            if(prevImg.width < MIN_IMAGE_WIDTH || prevImg.height < MIN_IMAGE_HEIGHT)
            {
               Console.writeln("remove preview (too small): ", images[i].previews[j].id);
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
// applySTF
// ----------------------------------------------------------------------------
function applySTF(view)
{
   var P = new ScreenTransferFunction;
   P.STF = [ // c0, c1, m, r0, r1
   [0.00042, 1.00000, 0.00198, 0.00000, 1.00000],
   [0.00042, 1.00000, 0.00198, 0.00000, 1.00000],
   [0.00042, 1.00000, 0.00198, 0.00000, 1.00000],
   [0.00000, 1.00000, 0.50000, 0.00000, 1.00000]
   ];
   P.interaction = ScreenTransferFunction.prototype.SeparateChannels;
   P.executeOn(view);
}
