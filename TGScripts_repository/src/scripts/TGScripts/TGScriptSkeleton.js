/*
   TGScriptSkeleton v1.2

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

/*
   Change history:
   v1.0
      initial version
   v1.1
      added reset button
   v1.2
      added image selector preview
*/

#include <pjsr/Sizer.jsh>
#include <pjsr/FrameStyle.jsh>
#include <pjsr/NumericControl.jsh>
#include <pjsr/TextAlign.jsh>
#include <pjsr/StdButton.jsh>
#include <pjsr/StdIcon.jsh>

#include "lib/TGScriptsLib.js"

#define VERSION   "1.2"
#define TITLE     "TGScriptSkeleton"

// Largest dimension of the image preview in pixels.
#define PREVIEW_SIZE 400
#define SPACING      4
#define MARGIN       8

// basename
#define BASENAME "TGScriptImg"

#feature-id    TGScriptSkeleton : TG Scripts > TGScriptSkeleton

#feature-info A script skeleton to create scripts from.<br/>\
   Copyright &copy; 2022 Thorsten Glebe. All Rights Reserved.

// ----------------------------------------------------------------------------
// ScriptData
// ----------------------------------------------------------------------------
function ScriptData()
{
   this.dialog       = null;
   this.targetView   = null;
   this.view_id      = "";
   this.previewView  = null;
   this.previewImage = null;
   this.rgbLinked    = true;

   // Save parameters in process icon
   // -------------------------------------------------------------------------
   this.exportParameters = function()
   {
      Parameters.set("view_id"  , this.view_id);
      Parameters.set("rgbLinked", this.rgbLinked);
   }

   // Restore saved parameters
   // -------------------------------------------------------------------------
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
      if(Parameters.has("rgbLinked"))
         this.rgbLinked = Parameters.getBoolean("rgbLinked");
   }

   this.reset = function()
   {
      this.targetView   = null;
      this.view_id      = "";
   }
}

var data = new ScriptData;

// ----------------------------------------------------------------------------
// doWork
// ----------------------------------------------------------------------------
function doWork()
{
   Console.show();
   var t0 = new Date;
   data.targetView.beginProcess(UndoFlag_NoSwapFile);

   // Check if image is non-linear
   if(data.targetView.image.median() > 0.01 && errorMessageOkCancel("Image seems to be non-linear, continue?", TITLE))
      return;

   Console.writeln("targetView: ", data.view_id);

   //------ real work happens here ---------

   //------ real work end -----------------

   data.targetView.endProcess();
   var t1 = new Date;
   Console.writeln(format("<end><cbr>doWork: %.2f s", (t1.getTime() - t0.getTime())/1000));
}

// ----------------------------------------------------------------------------
// ScriptDialog
// ----------------------------------------------------------------------------
function ScriptDialog()
{
   this.__base__ = Dialog;
   this.__base__();

   data.dialog = this;
   var labelWidth = 9 * this.font.width("M");

   // --- help box ---
   this.helpLabel = new Label( this );
   with( this.helpLabel )
   {
      frameStyle = FrameStyle_Box;
      margin = 4;
      wordWrapping = true;
      useRichText = true;
      text =
         "<p><b>" + TITLE + " v" + VERSION + "</b> &mdash; An empty script consisting "
         + "of target view selection, new instance button to save state, ok and cancel button.</p>"
         + "<p>Copyright &copy; 2022 Thorsten Glebe</p>";
   }

   // -------------------------------------------------------------------------
   this.ScrollControl = new Control( this );

   this.ScrollControl.updateView = function()
   {
      var width, height;

      if(data.targetView == null)
      {
         width  = 0;
         height = 0;
      }
      else
      {
         var stf = data.targetView.stf;
         if(isStretched(data.targetView))
         {
            data.previewImage = data.targetView.image;
         }
         else
         {
            if(hasSTF(data.targetView))
            {
               data.previewImage = applySTFHT(data.targetView.image, data.targetView.stf);
            }
            else
            {
               // copy view
               data.previewView = copyView(data.targetView, uniqueViewId(BASENAME));
               // STF stretch on copied view
               ApplyAutoSTF(data.previewView, SHADOWS_CLIP, TARGET_BKG, data.rgbLinked);
               data.previewImage = applySTFHT(data.previewView.image, data.previewView.stf);
               data.previewView.window.forceClose();
            }
         }

         var imageWidth  = data.previewImage.width;
         var imageHeight = data.previewImage.height;
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
      data.dialog.update();
      data.dialog.adjustToContents();
   }

   this.ScrollControl.onPaint = function()
   {
      if(data.previewImage != null)
      {
         var G = new Graphics( this );
         G.drawScaledBitmap( this.boundsRect, data.previewImage.render() );
         G.end();
      }
      else
      {
         Console.writeln("targetView is null");
      }
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
      getAll(); // include main views as well as previews
      if ( data.targetView )
      {
         currentView = data.targetView;
         data.view_id = currentView.id;
      }

      toolTip = this.targetImage_Label.toolTip = "Select the target image.";

      onViewSelected = function( view )
      {
         if(view.id)
         {
            data.targetView = view;
            data.view_id    = view.id;
         }
         else
         {
            data.targetView = null;
            data.view_id = "";
         }

         data.dialog.linkedSTFCheckBox.updateCheckBox();
         data.dialog.ScrollControl.updateView();
      }
   }

   this.targetImage_Sizer = new HorizontalSizer;
   with( this.targetImage_Sizer )
   {
      spacing = SPACING;
      add( this.targetImage_Label );
      add( this.targetImage_ViewList, 100 );
   }

   // -------------------------------------------------------------------------
   this.linkedSTFCheckBox = new CheckBox(this);
   with( this.linkedSTFCheckBox )
   {
      text    = "Use linked STF stretch";
      toolTip = "<p>If set, linked STF stretch is used. Unset to stretch each channel individually.</p>";
      checked = data.rgbLinked;

      onClick = (checked) => { data.rgbLinked = checked; data.dialog.ScrollControl.updateView(); }
   }

   this.linkedSTFCheckBox.updateCheckBox = function()
   {
      if(data.targetView == null || data.targetView.image.isGrayscale || isStretched(data.targetView) || hasSTF(data.targetView))
         this.enabled = false;
      else
         this.enabled = true;
   }

   // -------------------------------------------------------------------------
   this.paramGroupBox = new GroupBox( this );
   with( this.paramGroupBox )
   {
      title = "Target View Selection";
      sizer = new VerticalSizer;
      sizer.margin  = MARGIN;
      sizer.spacing = SPACING;
      sizer.add( this.targetImage_Sizer );
      sizer.add( this.linkedSTFCheckBox );
   }

   // buttons
   // -------------------------------------------------------------------------
   this.newInstance_Button = new ToolButton(this);
   with( this.newInstance_Button )
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

   this.ok_Button = new ToolButton(this);
   with( this.ok_Button )
   {
      icon = scaledResource( ":/process-interface/execute.png" );
      toolTip = "Execute script";

      onClick = () => { this.ok(); }
   }

   this.cancel_Button = new ToolButton(this);
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
            data.dialog.targetImage_ViewList.getAll();
         }
         data.reset();
      }
   }

   this.buttons_Sizer = new HorizontalSizer;
   with( this.buttons_Sizer )
   {
      spacing = SPACING;
      add(this.newInstance_Button);
      addStretch();
      add(this.ok_Button);
      add(this.cancel_Button);
      add(this.reset_Button);
   }

   // dialog layout
   // -------------------------------------------------------------------------
   this.sizer = new VerticalSizer;
   with( this.sizer )
   {
      margin = MARGIN;
      spacing = SPACING;
      add( this.helpLabel );
      addSpacing( SPACING );
      add( this.ScrollControl, 100 );
      addSpacing( SPACING );
      add( this.paramGroupBox );
      addSpacing( SPACING );
      add( this.buttons_Sizer );
   }

   this.windowTitle = TITLE;
   this.setScaledFixedWidth(PREVIEW_SIZE + 2*MARGIN);
   //this.setScaledMinSize(600, 400);
   // this.setFixedSize(); // this prevents main window to scale
   this.adjustToContents();
} // ScriptDialog

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

   // initialize dialog
   dialog.linkedSTFCheckBox.updateCheckBox();
   dialog.ScrollControl.updateView();
   //   dialog.userResizable = false;
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
