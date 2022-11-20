/*
   TGDialogLib v1.0

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

#include <pjsr/Sizer.jsh>
#include <pjsr/SectionBar.jsh>

#include "TGScriptsLib.js"

#define PREVIEW_SIZE 400
#define SPACING      4
#define MARGIN       8

// ----------------------------------------------------------------------------
// TargetViewSelector
// ----------------------------------------------------------------------------
function TargetViewSelector(dialog, selector_title, labelWidth, basename)
{
   this.__base__ = VerticalSizer;
  	this.__base__();

   // member variables
   var targetView   = null;
   var view_id      = "";
   var previewView  = null;
   var previewImage = null;
   var rgbLinked    = false;

   // getter for targetView
   // -------------------------------------------------------------------------
   this.getTargetView = function()
   {
      return targetView;
   }

   // Save parameters in process icon
   // -------------------------------------------------------------------------
   this.exportParameters = function()
   {
      Parameters.set("view_id"  , view_id);
      Parameters.set("rgbLinked", rgbLinked);
   }

   // Restore saved parameters
   // -------------------------------------------------------------------------
   this.importParameters = function()
   {
      if (Parameters.isViewTarget)
      {
         targetView = Parameters.targetView;
         view_id    = Parameters.targetView.id;
      }
      else
      {
         if (Parameters.has("view_id"))
         {
            view_id = Parameters.getString("view_id");
            if(view_id)
            {
               var window = ImageWindow.windowById(view_id);
               if(!window.isNull)
               {
                  targetView = window.mainView;
               }
            }
         }
         else
         {
            // Get access to the active image window
            var window = ImageWindow.activeWindow;
            if (!window.isNull)
            {
               targetView = window.currentView;
               view_id    = window.currentView.id;
            }
         }
      }
      if(Parameters.has("rgbLinked"))
         rgbLinked = Parameters.getBoolean("rgbLinked");

      // update ViewList control
      if(targetView)
         this.targetImage_ViewList.currentView = targetView;
   }

   // -------------------------------------------------------------------------
   this.ScrollControl = new Control( dialog );
   this.ScrollControl.updateView = function()
   {
      var width, height;

      if(targetView == null)
      {
         width  = 0;
         height = 0;
      }
      else
      {
         var stf = targetView.stf;
         if(isStretched(targetView))
         {
            previewImage = targetView.image;
         }
         else
         {
            if(hasSTF(targetView))
            {
               previewImage = applySTFHT(targetView.image, targetView.stf);
            }
            else
            {
               // copy view
               previewView = copyView(targetView, uniqueViewId(basename));
               // STF stretch on copied view
               ApplyAutoSTF(previewView, SHADOWS_CLIP, TARGET_BKG, rgbLinked);
               previewImage = applySTFHT(previewView.image, previewView.stf);
               previewView.window.forceClose();
            }
         }

         var imageWidth  = previewImage.width;
         var imageHeight = previewImage.height;
         if ( imageWidth > imageHeight )
         {
            width  = PREVIEW_SIZE;
            height = PREVIEW_SIZE*imageHeight/imageWidth;
         }
         else
         {
            width  = PREVIEW_SIZE*imageWidth/imageHeight;
            height = PREVIEW_SIZE;
         }
      }

      this.setFixedSize( width, height );
      dialog.adjustToContents();
   }

   this.ScrollControl.onPaint = function()
   {
      if(previewImage != null)
      {
         var G = new Graphics( this );
         G.drawScaledBitmap( this.boundsRect, previewImage.render() );
         G.end();
      }
      else
      {
         Console.writeln("targetView is null");
      }
   }

   // -------------------------------------------------------------------------
   this.targetImage_Label = new Label( dialog );
   with( this.targetImage_Label )
   {
      minWidth = labelWidth;
      text = "Target image:";
      textAlignment = TextAlign_Right|TextAlign_VertCenter;
   }

   this.targetImage_ViewList = new ViewList( dialog );
   with( this.targetImage_ViewList )
   {
      getAll(); // include main views as well as previews

      toolTip = this.targetImage_Label.toolTip = "Select the target image.";

      onViewSelected = (view) =>
      {
         if(view.id)
         {
            targetView = view;
            view_id    = view.id;
         }
         else
         {
            targetView = null;
            view_id    = "";
         }

         this.updateSelectorView();
      }
   }

   this.targetImage_Sizer = new HorizontalSizer;
   with( this.targetImage_Sizer )
   {
      spacing = SPACING;
      add( this.targetImage_Label );
      add( this.targetImage_ViewList );
   }

   // -------------------------------------------------------------------------
   this.linkedSTFCheckBox = new CheckBox(dialog);
   with( this.linkedSTFCheckBox )
   {
      text    = "Use linked STF stretch";
      toolTip = "<p>If set, linked STF stretch is used. Unset to stretch each channel individually.</p>";
      checked = rgbLinked;

      onClick = (checked) => { rgbLinked = checked; dialog.ScrollControl.updateView(); }
   }

   this.linkedSTFCheckBox.updateCheckBox = function()
   {
      if(targetView == null || targetView.image.isGrayscale || isStretched(targetView) || hasSTF(targetView))
         this.enabled = false;
      else
         this.enabled = true;
   }

   // -------------------------------------------------------------------------
   this.paramVSizer = new VerticalSizer( dialog );
   with( this.paramVSizer )
   {
      margin  = MARGIN;
      spacing = SPACING;
      add( this.targetImage_Sizer );
      addSpacing( SPACING );
      add( this.linkedSTFCheckBox );
   }

   // -------------------------------------------------------------------------
   this.imageSection = new Control(dialog);
   with (this.imageSection)
   {
      sizer = new HorizontalSizer;
      with (sizer)
      {
         spacing = SPACING;
         this.imageSectionVSizer = new VerticalSizer;
         with (this.imageSectionVSizer)
         {
            margin  = MARGIN;
            spacing = SPACING;
            add( this.paramVSizer );
            addSpacing( SPACING );
            add(this.ScrollControl);
         }
         add(this.imageSectionVSizer);
      }
   }

   // -------------------------------------------------------------------------
   this.imageSectionBar = new SectionBar(dialog, selector_title);
   with(this.imageSectionBar)
   {
      setSection(this.imageSection);
   }

   // -------------------------------------------------------------------------
   this.updateSelectorView = function()
   {
      this.linkedSTFCheckBox.updateCheckBox();
      this.ScrollControl.updateView();
      dialog.adjustToContents();
   }

   // -------------------------------------------------------------------------
   this.resetControl = function()
   {
      if(this.targetImage_ViewList.currentView)
      {
         this.targetImage_ViewList.remove(this.targetImage_ViewList.currentView);
         this.targetImage_ViewList.getAll();
      }

      targetView   = null;
      view_id      = "";
      previewView  = null;
      previewImage = null;
      rgbLinked    = false;
   }

   // register elements to this sizer
   margin  = MARGIN;
   spacing = SPACING;
   this.add( this.imageSectionBar );
   this.add( this.imageSection );

} // TargetViewSelector

TargetViewSelector.prototype = new VerticalSizer();
