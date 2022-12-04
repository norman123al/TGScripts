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
#include <pjsr/FrameStyle.jsh>
#include <pjsr/StdCursor.jsh>

#include "TGScriptsLib.js"
#include "PreviewControl.js"

#define SETTINGS_MODULE "TGSCRIPT"
#include "WCSmetadata.jsh"

#define PREVIEW_SIZE 500
#define SPACING      4
#define MARGIN       4

// ----------------------------------------------------------------------------
// DialogData
// ----------------------------------------------------------------------------
function DialogData()
{
   this.dialog              = null;
   this.targetView          = null;
   this.targetViewListeners = [];

   // exportParameters
   // -------------------------------------------------------------------------
   this.exportParameters = function()
   {
      this.dialog.targetViewSelector.exportParameters();
   }

   // importParameters
   // -------------------------------------------------------------------------
   this.importParameters = function()
   {
      this.targetViewSelector.importParameters();
   }

   // updateControl
   // -------------------------------------------------------------------------
   this.updateControl = function()
   {
      this.targetViewSelector.updateSelectorView();
   }

   // resetControl
   // -------------------------------------------------------------------------
   this.resetControl = function()
   {
      this.targetViewSelector.resetControl();
   }
}

var dialogData = new DialogData;

// ----------------------------------------------------------------------------
// ToolButtonBar
// ----------------------------------------------------------------------------
function ToolButtonBar(dialog, scriptname)
{
   this.__base__ = HorizontalSizer;
  	this.__base__();

   // -------------------------------------------------------------------------
   this.newInstance_Button = new ToolButton(dialog);
   with( this.newInstance_Button )
   {
      icon = scaledResource(":/process-interface/new-instance.png");
      toolTip = "New Instance";

      onMousePress = function()
      {
         dialog.exportParameters();
         dialog.newInstance();
      }
   }

   // -------------------------------------------------------------------------
   this.ok_Button = new ToolButton(dialog);
   with( this.ok_Button )
   {
      icon = scaledResource( ":/process-interface/execute.png" );
      toolTip = "Execute script";

      onClick = () => { dialog.ok(); }
   }

   // -------------------------------------------------------------------------
   this.cancel_Button = new ToolButton(dialog);
   with( this.cancel_Button )
   {
      icon = scaledResource( ":/process-interface/cancel.png" );
      toolTip = "Cancel script";

      onClick = () => { dialog.cancel(); }
   }

   // -------------------------------------------------------------------------
   this.documentationButton = new ToolButton(dialog);
   with( this.documentationButton )
   {
      icon = scaledResource( ":/process-interface/browse-documentation.png" );
      toolTip = "<p>Show script documentaion.</p>";

      onClick = () => { Dialog.browseScriptDocumentation(scriptname); }
   }

   // -------------------------------------------------------------------------
   this.reset_Button = new ToolButton(dialog);
   with( this.reset_Button )
   {
      icon = scaledResource( ":/process-interface/reset.png" );
      toolTip = "Reset to defaults";

      onMousePress = () =>
      {
         dialog.resetControl();
      }
   }

   // register elements to this sizer
   // -------------------------------------------------------------------------
   this.spacing = SPACING;
   this.add(this.newInstance_Button);
   this.addStretch();
   this.add(this.ok_Button);
   this.add(this.cancel_Button);
   this.add(this.documentationButton);
   this.add(this.reset_Button);
}

ToolButtonBar.prototype = new HorizontalSizer();

// ----------------------------------------------------------------------------
// HelpAndCopyrightLabel
// ----------------------------------------------------------------------------
function HelpAndCopyrightLabel(dialog, maxheight, scriptname, version, description)
{
   this.__base__ = Label;
  	this.__base__(dialog);

   var versionspec = "<b>" + scriptname + " v" + version + "</b> &mdash;"
   var copyright   = "<p>Copyright &copy; 2022 Thorsten Glebe</p>";

   // set label properties
   // -------------------------------------------------------------------------
   this.frameStyle   = FrameStyle_Box;
   this.margin       = MARGIN;
   this.wordWrapping = true;
   this.useRichText  = true;
   this.maxHeight    = maxheight; // fixed height to avoid funny jumping of controls
   this.text = "<p>" + versionspec + " " + description + copyright + "</p>";
}

HelpAndCopyrightLabel.prototype = new Label();

// ----------------------------------------------------------------------------
// VerticalSection
// ----------------------------------------------------------------------------
function VerticalSection(dialog, selector_title)
{
   this.__base__ = VerticalSizer;
  	this.__base__();

   // -------------------------------------------------------------------------
   this.imageSection = new Control(dialog);
   with (this.imageSection)
   {
      sizer = new VerticalSizer;
      with (sizer)
      {
         margin  = 0;
         spacing = SPACING;
      }
   }

   // -------------------------------------------------------------------------
   this.imageSectionBar = new SectionBar(dialog, selector_title);
   with(this.imageSectionBar)
   {
      checkBox = true;
      setSection(this.imageSection);
   }

   this.addControl = function(control)
   {
      this.imageSection.sizer.add(control);
   }

   this.addSpacing = function()
   {
      this.imageSection.sizer.addSpacing(SPACING);
   }

   // -------------------------------------------------------------------------
   // register elements to this sizer
   this.margin  = 0;
   this.spacing = SPACING;
   this.add( this.imageSectionBar );
   this.add( this.imageSection );
} // VerticalSection

VerticalSection.prototype = new VerticalSizer();

// ----------------------------------------------------------------------------
// TargetViewSelector
// ----------------------------------------------------------------------------
function TargetViewSelector(dialog, selector_title, labelWidth)
{
   this.__base__ = VerticalSection;
  	this.__base__(dialog, selector_title);

   // member variables
   var self           = this;
   var view_id        = "";

   // Save parameters in process icon
   // -------------------------------------------------------------------------
   this.exportParameters = function()
   {
      Parameters.set("view_id"  , view_id);
      Parameters.set("rgbLinked", rgbLinked);

      // export dependent controls
      for(var i in dialogData.targetViewListeners)
      {
         dialogData.targetViewListeners[i].exportParameters();
      }
   }

   // Restore saved parameters
   // -------------------------------------------------------------------------
   this.importParameters = function()
   {
      if (Parameters.isViewTarget)
      {
         dialogData.targetView = Parameters.targetView;
         view_id               = Parameters.targetView.id;
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
                  dialogData.targetView = window.mainView;
               }
            }
         }
         else
         {
            // Get access to the active image window
            var window = ImageWindow.activeWindow;
            if (!window.isNull)
            {
               dialogData.targetView = window.currentView;
               view_id               = window.currentView.id;
            }
         }
      }
      if(Parameters.has("rgbLinked"))
         rgbLinked = Parameters.getBoolean("rgbLinked");

      // update ViewList control
      if(dialogData.targetView)
         this.targetImage_ViewList.currentView = dialogData.targetView;

      // import dependent controls
      for(var i in dialogData.targetViewListeners)
      {
         dialogData.targetViewListeners[i].importParameters();
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
            dialogData.targetView = view;
            view_id               = view.id;
         }
         else
         {
            dialogData.targetView = null;
            view_id               = "";
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
      addStretch();
   }

   // -------------------------------------------------------------------------
   this.paramVSizer = new VerticalSizer( dialog );
   with( this.paramVSizer )
   {
      margin  = MARGIN;
      spacing = SPACING;
      add( this.targetImage_Sizer );
   }

   // -------------------------------------------------------------------------
   this.updateSelectorView = function()
   {
      // update dependent controls
      for(var i in dialogData.targetViewListeners)
      {
         dialogData.targetViewListeners[i].updateControl();
      }
   }

   // -------------------------------------------------------------------------
   this.resetControl = function()
   {
      if(this.targetImage_ViewList.currentView)
      {
         this.targetImage_ViewList.remove(this.targetImage_ViewList.currentView);
         this.targetImage_ViewList.getAll();
      }

      dialogData.targetView   = null;
      view_id                 = "";
      rgbLinked               = false;

      // reset dependent controls
      for(var i in dialogData.targetViewListeners)
      {
         dialogData.targetViewListeners[i].resetControl();
      }
   }

   // -------------------------------------------------------------------------
   // register elements to this sizer
   this.addControl(this.paramVSizer);

} // TargetViewSelector

TargetViewSelector.prototype = new VerticalSizer();

// ----------------------------------------------------------------------------
// ImagePreviewControl
// ----------------------------------------------------------------------------
function ImagePreviewControl(dialog, basename)
{
   this.__base__ = VerticalSizer;
   this.__base__(dialog);

   // register as dependent object to targetView control
   dialogData.targetViewListeners.push(this);

   let self           = this;
   let previewView    = null;
   let previewImage   = null;
   let rgbLinked      = false;
   let adjustRequired = false;

   let width          = 1;
   let height         = 1;
   let bitmap         = null;

   this.metadata = new ImageMetadata( undefined/*module*/, 1.0);
   this.previewControl = new PreviewControl( dialog );
   this.previewControl.setFixedSize( PREVIEW_SIZE, PREVIEW_SIZE );

   this.preview_hSizer = new HorizontalSizer;
   this.preview_hSizer.add(this.previewControl);

   // Save parameters in process icon
   // -------------------------------------------------------------------------
   this.exportParameters = function()
   {
   }

   // Restore saved parameters
   // -------------------------------------------------------------------------
   this.importParameters = function()
   {
   }

   // resetControl
   // -------------------------------------------------------------------------
   this.resetControl = function()
   {
      previewView             = null;
      previewImage            = null;
   }

   // updateControl
   // -------------------------------------------------------------------------
   this.updateControl = function()
   {
      this.linkedSTFCheckBox.updateControl();
      this.renderImage();
   }

   // rgbLinked CheckBox
   // -------------------------------------------------------------------------
   this.linkedSTFCheckBox = new CheckBox(dialog);
   with( this.linkedSTFCheckBox )
   {
      text    = "Use linked STF stretch";
      toolTip = "<p>If set, linked STF stretch is used. Unset to stretch each channel individually.</p>";
      checked = rgbLinked;

      onClick = (checked) => { rgbLinked = checked; self.renderImage(); }
   }

   this.linkedSTFCheckBox.updateControl = function()
   {
      this.checked = rgbLinked;
      if(dialogData.targetView == null || dialogData.targetView.image.isGrayscale || isStretched(dialogData.targetView) || hasSTF(dialogData.targetView))
         this.enabled = false;
      else
         this.enabled = true;
   }

   this.checkbox_hSizer = new HorizontalSizer;
   this.checkbox_hSizer.margin = MARGIN;
   this.checkbox_hSizer.add(this.linkedSTFCheckBox);

   // -------------------------------------------------------------------------
   this.renderImage = function()
   {
//      var width, height;

      if(self.bitmap)
      {
         self.bitmap.clear();
         self.bitmap = null;
      }

      if(dialogData.targetView == null)
      {
//         width  = 1; // assure onPaint is called
//         height = 1;
         this.previewControl.SetImage( self.bitmap, this.metadata );
      }
      else
      {
         if(isStretched(dialogData.targetView))
         {
            previewImage = dialogData.targetView.image;
         }
         else
         {
            if(hasSTF(dialogData.targetView))
            {
               previewImage = applySTFHT(dialogData.targetView.image, dialogData.targetView.stf);
               dialogData.targetView.image.resetSelections();
            }
            else
            {
               // copy view
               previewView = copyView(dialogData.targetView, uniqueViewId(basename));
               // STF stretch on copied view
               ApplyAutoSTF(previewView, SHADOWS_CLIP, TARGET_BKG, rgbLinked);
               previewImage = applySTFHT(previewView.image, previewView.stf);
               previewView.window.forceClose();
            }
         }

/*
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
*/
         self.bitmap = previewImage.render();

         this.metadata.ExtractMetadata( dialogData.targetView.window );
         this.previewControl.SetImage( self.bitmap, this.metadata );
      }

      dialogData.dialog.adjustToContents(); // just in case no resize happens
   }

   // register elements to this sizer
   // -------------------------------------------------------------------------
   this.margin  = 0;
   this.spacing = 0;
   this.add(this.checkbox_hSizer);
   this.add(this.preview_hSizer);
} // ImagePreviewControl

ImagePreviewControl.prototype = new VerticalSizer();

// ----------------------------------------------------------------------------
// TargetViewStatBox
// ----------------------------------------------------------------------------
function TargetViewStatBox(dialog, selector_title)
{
   this.__base__ = VerticalSection;
  	this.__base__(dialog, selector_title);

   // register as dependent object to targetView control
   dialogData.targetViewListeners.push(this);

   // member variables
   var self                = this;
   var showSNR             = false;
   var forceSNRComputation = false;

   // Save parameters in process icon
   // -------------------------------------------------------------------------
   this.exportParameters = function()
   {
      Parameters.set("showSNR"            , showSNR);
      Parameters.set("forceSNRComputation", forceSNRComputation);
   }

   // Restore saved parameters
   // -------------------------------------------------------------------------
   this.importParameters = function()
   {
      if(Parameters.has("showSNR"))
         showSNR = Parameters.getBoolean("showSNR");
      if(Parameters.has("forceSNRComputation"))
         forceSNRComputation = Parameters.getBoolean("forceSNRComputation");
   }

   // TreeBox
   // -------------------------------------------------------------------------
   this.treeBox = new TreeBox(dialog);
   with(this.treeBox)
   {
      alternateRowColor = true;
      headerVisible     = true;
      indentSize        = 0;

      setHeaderAlignment(0, Align_Left | TextAlign_VertCenter);
      setColumnWidth(0, this.treeBox.font.width("ParameterMM"));
      setHeaderText(0, "");
      setHeaderAlignment(1, Align_Left | TextAlign_VertCenter);

      var rows     = 6;
      self.treeBox.setFixedHeight(2*rows*this.treeBox.font.height); // always set box height
   }

   this.countNode = new TreeBoxNode(this.treeBox);
   with(this.countNode)
   {
      setText(0, "count (px)");
      setText(1, "-");
      setToolTip(0, "<p>Total number of pixel samples</p>");
      setToolTip(1, toolTip(0));
   }

   this.meanNode = new TreeBoxNode(this.treeBox);
   with(this.meanNode)
   {
      setText(0, "Mean");
      setText(1, "-");
      setToolTip(0, "<p>Arithmetic mean</p>");
      setToolTip(1, toolTip(0));
   }

   this.medianNode = new TreeBoxNode(this.treeBox);
   with(this.medianNode)
   {
      setText(0, "Median");
      setText(1, "-");
      setToolTip(0, "<p>median</p>");
      setToolTip(1, toolTip(0));
   }

   this.madNode = new TreeBoxNode(this.treeBox);
   with(this.madNode)
   {
      setText(0, "MAD");
      setText(1, "-");
      setToolTip(0, "<p>Median absolute deviation from the median.</p>");
      setToolTip(1, toolTip(0));
   }

   this.noiseNode = new TreeBoxNode(this.treeBox);
   with(this.noiseNode)
   {
      setText(0, "noise");
      setText(1, "-");
      setToolTip(0, "<p>Estimation of the standard deviation of the noise, assuming a Gaussian noise distribution. Estimates are scaled by the Sn robust scale estimator of Rousseeuw and Croux.</p>");
      setToolTip(1, toolTip(0));
   }

   this.snrNode = new TreeBoxNode(this.treeBox);
   with(this.snrNode)
   {
      setText(0, "SNR");
      setText(1, "-");
      setToolTip(0, "<p>Signal to noise ratio.</p>");
      setToolTip(1, toolTip(0));
   }

   this.snrDBNode = new TreeBoxNode(this.treeBox);
   with(this.snrDBNode)
   {
      setText(0, "SNR (db)");
      setText(1, "-");
      setToolTip(0, "<p>Signal to noise ratio expressed in decibel.</p>");
      setToolTip(1, toolTip(0));
   }

   // snrCheckBox
   // -------------------------------------------------------------------------
   this.snrCheckBox = new CheckBox(dialog);
   with(this.snrCheckBox)
   {
      text    = "Show SNR";
      toolTip = "<p>If set, SNR will be computed. This might take a while.</p>";
      checked = showSNR;

      onClick = (checked) =>
      {
         showSNR = checked;
         forceSNRComputation = false;
         self.forceSNRCheckBox.enabled = showSNR;
         self.updateControl();
      }
   }

   this.snrCheckBox.updateControl = function()
   {
      this.enabled = (dialogData.targetView != null);
      this.checked = showSNR;
   }

   // forceSNRCheckBox
   // -------------------------------------------------------------------------
   this.forceSNRCheckBox = new CheckBox(dialog);
   with(this.forceSNRCheckBox)
   {
      text    = "Force SNR recomputation";
      toolTip = "<p>If set, SNR will always be computed. This might take a while.</p>";
      checked = forceSNRComputation;
      enabled = showSNR;

      onClick = (checked) => { forceSNRComputation = checked; self.updateControl(); }
   }

   this.forceSNRCheckBox.updateControl = function()
   {
      this.enabled = showSNR;
      this.checked = forceSNRComputation;
   }

   this.snrCheckbox_Sizer = new HorizontalSizer;
   with( this.snrCheckbox_Sizer )
   {
      spacing = SPACING;
      add( this.snrCheckBox );
      add( this.forceSNRCheckBox );
      addStretch();
   }

   // updateControl
   // -------------------------------------------------------------------------
   this.updateControl = function()
   {
      if(!dialogData.targetView)
      {
         this.resetControl();
         return;
      }

      var view     = dialogData.targetView;
      var image    = view.image;
      var mad      = view.computeOrFetchProperty( "MAD" );

      if(image.isColor)
      {
         this.treeBox.numberOfColumns = 4;
         this.treeBox.setHeaderIcon(1, ":/toolbar/image-display-red.png");
         this.treeBox.setHeaderText(1, "R");
         this.treeBox.setHeaderIcon(2, ":/toolbar/image-display-green.png");
         this.treeBox.setHeaderText(2, "G");
         this.treeBox.setHeaderIcon(3, ":/toolbar/image-display-blue.png");
         this.treeBox.setHeaderText(3, "B");

         var count = view.computeOrFetchProperty( "Count" );
         this.countNode.setText(1, format("%d", count.at(0)));
         this.countNode.setText(2, format("%d", count.at(1)));
         this.countNode.setText(3, format("%d", count.at(2)));

         var mean = view.computeOrFetchProperty( "Mean" );
         this.meanNode.setText(1, format("%.6e", mean.at(0)));
         this.meanNode.setText(2, format("%.6e", mean.at(1)));
         this.meanNode.setText(3, format("%.6e", mean.at(2)));

         var median = view.computeOrFetchProperty( "Median" );
         this.medianNode.setText(1, format("%.6e", median.at(0)));
         this.medianNode.setText(2, format("%.6e", median.at(1)));
         this.medianNode.setText(3, format("%.6e", median.at(2)));

         this.madNode.setText(1, format("%.6e", mad.at(0)));
         this.madNode.setText(2, format("%.6e", mad.at(1)));
         this.madNode.setText(3, format("%.6e", mad.at(2)));

         if(showSNR)
         {
            calculateAndStoreNoise(view, forceSNRComputation);
            var NOISE = view.propertyValue(NOISE_PROPERTY_KEY);
            this.noiseNode.setText(1, format("%.6e", NOISE.at(0)));
            this.noiseNode.setText(2, format("%.6e", NOISE.at(1)));
            this.noiseNode.setText(3, format("%.6e", NOISE.at(2)));
            var SNR = view.propertyValue(SNR_PROPERTY_KEY);
            this.snrNode.setText(1, format("%.3e", SNR.at(0)));
            this.snrNode.setText(2, format("%.3e", SNR.at(1)));
            this.snrNode.setText(3, format("%.3e", SNR.at(2)));
            var SNRDB = view.propertyValue(SNRDB_PROPERTY_KEY);
            this.snrDBNode.setText(1, format("%.2f", SNRDB.at(0)));
            this.snrDBNode.setText(2, format("%.2f", SNRDB.at(1)));
            this.snrDBNode.setText(3, format("%.2f", SNRDB.at(2)));
         }
         else
         {
            for(var i = 1; i < 4; ++i)
            {
               this.noiseNode.setText(i, "-");
               this.snrNode  .setText(i, "-");
               this.snrDBNode.setText(i, "-");
            }
         }
      }
      else
      {
         this.treeBox.numberOfColumns = 2;
         this.treeBox.setHeaderIcon(1, ":/toolbar/image-display-luminance.png");
         this.treeBox.setHeaderText(1, "K");

         this.countNode .setText(1, format("%d"  , image.count()));
         this.meanNode  .setText(1, format("%.6e", image.mean()));
         this.medianNode.setText(1, format("%.6e", image.median()));
         this.madNode   .setText(1, format("%.6e", mad.at(0)));

         if(showSNR)
         {
            calculateAndStoreNoise(view, forceSNRComputation);
            var NOISE = view.propertyValue(NOISE_PROPERTY_KEY);
            this.noiseNode.setText(1, format("%.6e", NOISE.at(0)));
            var SNR = view.propertyValue(SNR_PROPERTY_KEY);
            this.snrNode.setText(1, format("%.3e", SNR.at(0)));
            var SNRDB = view.propertyValue(SNRDB_PROPERTY_KEY);
            this.snrDBNode.setText(1, format("%.2f", SNRDB.at(0)));
         }
         else
         {
            this.snrNode.setText(1, "-");
         }
      }

      self.snrCheckBox.updateControl();
      self.forceSNRCheckBox.updateControl();
   }

   // resetControl
   // -------------------------------------------------------------------------
   this.resetControl = function()
   {
      this.treeBox.numberOfColumns = 2;
      this.treeBox.setHeaderIcon(1, "");
      this.treeBox.setHeaderText(1, "");
      this.countNode .setText(1, "-");
      this.meanNode  .setText(1, "-");
      this.medianNode.setText(1, "-");
      this.madNode   .setText(1, "-");
      this.noiseNode .setText(1, "-");
      this.snrNode   .setText(1, "-");
      this.snrDBNode .setText(1, "-");
      showSNR                       = false;
      forceSNRComputation           = false;
      self.snrCheckBox.checked      = false;
      self.snrCheckBox.enabled      = false;
      self.forceSNRCheckBox.enabled = false;
      self.forceSNRCheckBox.checked = false;
   }

   // register elements to this sizer
   // -------------------------------------------------------------------------
   this.addControl(this.treeBox);
   this.addControl(this.snrCheckbox_Sizer);
} // TargetViewStatBox

TargetViewStatBox.prototype = new VerticalSizer();

// ----------------------------------------------------------------------------
// TargetViewPropBox
// ----------------------------------------------------------------------------
function TargetViewPropBox(dialog, selector_title)
{
   this.__base__ = VerticalSection;
  	this.__base__(dialog, selector_title);

   dialogData.targetViewListeners.push(this);

   // member variables
   var self = this;

   // Save parameters in process icon
   // -------------------------------------------------------------------------
   this.exportParameters = function()
   {
   }

   // Restore saved parameters
   // -------------------------------------------------------------------------
   this.importParameters = function()
   {
   }

   // TreeBox
   // -------------------------------------------------------------------------
   this.treeBox = new TreeBox(dialog);
   with(this.treeBox)
   {
      alternateRowColor = true;
      headerVisible     = false;
      indentSize        = 0;

      setHeaderAlignment(0, Align_Left | TextAlign_VertCenter);
      setHeaderText(0, "");
      setHeaderAlignment(1, Align_Left | TextAlign_VertCenter);

      var rows       = 5;
      var fontheight = 2*this.treeBox.font.height;
      setFixedHeight(rows * fontheight); // always set box height
   }

   // updateControl
   // -------------------------------------------------------------------------
   this.updateControl = function()
   {
      if(!dialogData.targetView)
      {
         this.resetControl();
         return;
      }

      var view      = dialogData.targetView;
      var maxkeylen = 0;
      var fontwidth = this.treeBox.font.width("M");

      this.treeBox.numberOfColumns = 2;
      this.treeBox.clear();

      // generate TreeBoxNodes
      for(var i in view.properties)
      {
         var key       = view.properties[i];
         maxkeylen     = key.length > 20 ? 20 : key.length > maxkeylen ? key.length : maxkeylen;
         var value     = view.propertyValue(key);
         var type      = view.propertyType(key);
         var arrString = "";
         var node = new TreeBoxNode(this.treeBox);
         node.setText(0, key);
         if(type == PropertyType_F64Vector || type == PropertyType_UI64Vector)
         {
            arrString = "{" + value.toArray().toString() + "}";
         }
         else
         {
            var arr = [];
            arr.push(value);
            arrString = arr.toString();
         }

         // Console.writeln("key: " + key + " type: " + type + " value: " + arrString);
         node.setText(1, arrString);
         node.setToolTip(0, key);
         node.setToolTip(1, arrString);
      }

      this.treeBox.setColumnWidth(0, maxkeylen * fontwidth);

//      Console.flush();  // weird, this seems to enforce adjustment(?)
      dialogData.dialog.adjustToContents();
   }

   // resetControl
   // -------------------------------------------------------------------------
   this.resetControl = function()
   {
      this.treeBox.clear();
   }

   // register elements to this sizer
   // -------------------------------------------------------------------------
   this.addControl(this.treeBox);
} // TargetViewPropBox

TargetViewPropBox.prototype = new VerticalSizer();

// ----------------------------------------------------------------------------
// TargetViewControl
// ----------------------------------------------------------------------------
function TargetViewControl(dialog, labelWidth)
{
   this.__base__ = VerticalSizer;
  	this.__base__();

   // TargetViewSelector
   // -------------------------------------------------------------------------
   this.targetViewSelector = new TargetViewSelector(dialog, "Target View Selection", labelWidth);

   // TargetViewSelector
   // -------------------------------------------------------------------------
   this.imagePreviewControl = new ImagePreviewControl(dialog, "TargetViewSelectorImg");

   // TargetViewStatBox
   // -------------------------------------------------------------------------
   this.targetViewStatBox = new TargetViewStatBox(dialog, "Target View Statistics");

   // TargetViewPropBox
   // -------------------------------------------------------------------------
   this.targetViewPropBox = new TargetViewPropBox(dialog, "Target View Properties");

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

   // updateControl
   // -------------------------------------------------------------------------
   this.updateControl = function()
   {
      this.targetViewSelector.updateSelectorView();
   }

   // resetControl
   // -------------------------------------------------------------------------
   this.resetControl = function()
   {
      this.targetViewSelector.resetControl();
   }

   // register elements to this sizer
   // -------------------------------------------------------------------------
   this.add( this.targetViewSelector );
   this.addSpacing( SPACING );
   this.add( this.imagePreviewControl );
   this.addSpacing( SPACING );
   this.add( this.targetViewStatBox );
   this.addSpacing( SPACING );
   this.add( this.targetViewPropBox );
} // TargetViewControl

TargetViewControl.prototype = new VerticalSizer();
