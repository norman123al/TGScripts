/*
   LocalSupportMask v1.1

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
      added overlay preview option
      changed mask creation default settings
      enable/disable controls
   v2.0
      new API, based on TGDialog
*/

#include "lib/LocalSupportMaskLib.js"

#define VERSION    "2.0"
#define SCRIPTNAME "LocalSupportMask"

#feature-id    LocalSupportMask : TG Scripts > LocalSupportMask

#feature-info A script to generate a local support mask for deconvolution.<br/>\
   Copyright &copy; 2022 Thorsten Glebe. All Rights Reserved.

// ----------------------------------------------------------------------------
// version check
// ----------------------------------------------------------------------------
if ( CoreApplication === undefined ||
     CoreApplication.versionRevision === undefined ||
     CoreApplication.versionMajor*1e11
   + CoreApplication.versionMinor*1e8
   + CoreApplication.versionRelease*1e5
   + CoreApplication.versionRevision*1e2 < 100800900100 )
{
   throw new Error( "This script requires PixInsight core version 1.8.9-1 or higher." );
}

// ----------------------------------------------------------------------------
// ScriptDialog
// ----------------------------------------------------------------------------
function ScriptDialog()
{
   this.__base__ = Dialog;
   this.__base__();

   dialogData.dialog = this;

   // --- help box ---
   var helptext = "A script for creating a local support mask for deconvolution. "
                + "Choose a luminance image to create the local support mask. "
                + "This script works on linear main views only, not on previews."
   this.helpLabel = new HelpAndCopyrightLabel(this, 108, SCRIPTNAME, VERSION, helptext );

   // TargetViewControl
   // -------------------------------------------------------------------------
   this.targetViewControl = new SimpleTargetViewControl(this, ViewSelect.LinearMainViews, MASK_NAME);

   // LocalSupportMaskSettings
   // -------------------------------------------------------------------------
   this.localSupportMaskSettings = new LocalSupportMaskSettings(this, "Local Support Mask Parameters");

   // MaskPreviewControl
   // -------------------------------------------------------------------------
   this.maskPreviewControl = new MaskPreviewControl(this, "Mask Preview");

   // preview
   // -------------------------------------------------------------------------
   this.preview = function()
   {
       Console.writeln("dialog preview!");
       Console.flush();

      dialogData.preview();
   }

   // buttons
   // -------------------------------------------------------------------------
   this.toolButtonBar = new ToolButtonBar(this, SCRIPTNAME, /*bPreview*/true);

   // dialog layout
   // -------------------------------------------------------------------------
   this.sizer = new VerticalSizer;
   with( this.sizer )
   {
      margin = MARGIN;
      spacing = SPACING;
      add( this.helpLabel );
      addSpacing( SPACING );
      add( this.targetViewControl );
      addSpacing( SPACING );
      add( this.localSupportMaskSettings );
      addSpacing( SPACING );
      add( this.maskPreviewControl );
      addStretch();
      add( this.toolButtonBar );
   }

   this.windowTitle = SCRIPTNAME;
   this.setFixedWidth(PREVIEW_SIZE + 2*MARGIN);
   this.adjustToContents(); // do this before calling setFixedSize
   this.setFixedSize();     // this prevents main window to scale
} // ScriptDialog

// Our dialog inherits all properties and methods from the core Dialog object.
ScriptDialog.prototype = new Dialog;

// ----------------------------------------------------------------------------
// doWork
// ----------------------------------------------------------------------------
function doWork(dialog)
{
   createMask(/*bPreview*/false, dialog.maskPreviewControl.previewView, MASK_NAME);
}

// ----------------------------------------------------------------------------
// main
// ----------------------------------------------------------------------------
function main()
{
   var dialog = new ScriptDialog();

//   Console.hide();

   dialogData.importParameters();
   if (Parameters.isViewTarget)
   {
      doWork(dialog);
      return;
   }

   // initialize dialog
   dialogData.updateControl();

   //   dialog.userResizable = false;
   for ( ;; )
   {
      if ( !dialog.execute() )
      {
         dialogData.resetControl();
         return;
      }

      // A view must be selected.
      if ( !dialogData.targetView )
      {
         errorMessageOk("You must select a view to apply this script.", SCRIPTNAME);
         continue;
      }

      break;
   }

   doWork(dialog);
   dialogData.resetControl();
}

main();
