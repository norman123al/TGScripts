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
// Creates a copy of a window as separate window instance.
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
