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
// Returns a unique view id with the given base id prefix.
// ----------------------------------------------------------------------------
function uniqueViewId(baseId)
{
   var id = baseId;
   var i = 1;
   while(!View.viewById(id).isNull)
   {
      id = baseId + format("%02d", i);
      ++i;
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
