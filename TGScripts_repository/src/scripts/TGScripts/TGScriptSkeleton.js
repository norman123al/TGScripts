/*
   TGScriptSkeleton v1.3

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
   v1.3
      replaced param GroupBox by image section
      added documentation tool button
      refactoring: introduce TargetViewSelector object
*/

//#include <pjsr/NumericControl.jsh>
//#include <pjsr/TextAlign.jsh>
//#include <pjsr/StdButton.jsh>
//#include <pjsr/StdIcon.jsh>

#include "lib/TGDialogLib.js"

#define VERSION    "1.3"
#define SCRIPTNAME "TGScriptSkeleton"

#feature-id    TGScriptSkeleton : TG Scripts > TGScriptSkeleton

#feature-info A script skeleton to create scripts from.<br/>\
   Copyright &copy; 2022 Thorsten Glebe. All Rights Reserved.

// ----------------------------------------------------------------------------
// ScriptData
// ----------------------------------------------------------------------------
function ScriptData()
{
   this.targetView   = null;

   this.acquireDataFromDialog = function(dialog)
   {
      this.targetView = dialog.targetViewSelector.getTargetView();
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

   // Check if image is non-linear
   if(isStretched(data.targetView) && errorMessageOkCancel("Image seems to be non-linear, continue?", SCRIPTNAME))
      return;

   Console.writeln("targetView: ", data.targetView.id);

   //------ real work happens here ---------

   //------ real work end -----------------

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
   var helptext = "An empty script consisting of target view selection with "
      + "preview image including auto-stretch functionality. The buttons include "
      + "the 'new instance' button to save the script state as an icon plus ok, "
      + "cancel, reset and documentation tool button."
   this.helpLabel = new HelpAndCopyrightLabel(this, 108, SCRIPTNAME, VERSION, helptext );

   // TargetViewSelector
   // -------------------------------------------------------------------------
   this.targetViewSelector = new TargetViewSelector(this, "Target View Selection", labelWidth, "TargetViewSelectorImg");

   // exportParameters
   // -------------------------------------------------------------------------
   this.exportParameters = function()
   {
      this.targetViewSelector.exportParameters();
   }

   // importParameters
   // -------------------------------------------------------------------------
   this.importParameters = function()
   {
      this.targetViewSelector.importParameters();
   }

   // resetControl
   // -------------------------------------------------------------------------
   this.resetControl = function()
   {
      this.targetViewSelector.resetControl();
   }

   // buttons
   // -------------------------------------------------------------------------
   this.toolButtonBar = new ToolButtonBar(this, SCRIPTNAME);

   // dialog layout
   // -------------------------------------------------------------------------
   this.sizer = new VerticalSizer;
   with( this.sizer )
   {
      margin = MARGIN;
      spacing = SPACING;
      add( this.helpLabel );
      addSpacing( SPACING );
      add( this.targetViewSelector );
      addSpacing( SPACING );
      add( this.toolButtonBar );
   }

   this.windowTitle = SCRIPTNAME;
   this.setFixedWidth(PREVIEW_SIZE + 2*MARGIN);
//   this.setScaledMinSize(PREVIEW_SIZE, PREVIEW_SIZE);
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
   var dialog = new ScriptDialog();

   Console.hide();
   dialog.importParameters();
   if (Parameters.isViewTarget)
   {
      doWork();
      return;
   }

   // initialize dialog
   dialog.targetViewSelector.updateSelectorView();

   //   dialog.userResizable = false;
   for ( ;; )
   {
      if ( !dialog.execute() )
         return;

      data.acquireDataFromDialog(dialog);

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
