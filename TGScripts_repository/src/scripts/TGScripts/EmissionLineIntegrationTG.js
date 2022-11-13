/*
	EmissionLineIntegration.js: Narrow-band application on RGB images
================================================================================

Schmalband-Filter werden in der Astronomie eingesetzt, um die Intensität von
Emissionsstrahlern zu messen. Da diese Filter einen Durchlassbereich von einigen
Nanometer (nm) haben, addieren sich Fehler, die aus eng benachbarten Quellen
stammen. So ist z.B. Ein H-alpha Filter mit 6 nm Bandbreite noch aufnahmefähig
für die NII Linie, deren Wellenlänge nur einen Abstand von 2 nm hat.
Die Continuum Subtraction (kurz CS) soll hier helfen, die Strahlung aus dem
Continuum herauszufiltern. Das Ergebnis kann dann für die Berechnung der
Intensität eines Objektes genutzt werden. In der Astrofotografie erzeugt
die Addition des Differenzbildes auf einen Breitbandkanal eine merkliche
Verstärkung der Objekte.

Formeln

	NB 	= Schmalband
	BB 	= Breitband
	BB*	= Breitband intensiviert
	mue	= Anteil Continuum im Schmalband

	Ie 	= NB - mue x BB							(1)
	BB*	= BB + Ie									(2)


Narrow-band filters see use in astronomy to measure the intensity of emission
emitters. Since these filters have a range of bandwidth of around a few
nanometers (nm), errors from neighbouring sources will accumulate. For example,
a H-alpha-filter with 6nm bandwidth is receptive to the NII line with a
wavelength distance of 2nm. This is where the continuum subtraction (CS) helps
filter the emission out of the continuum. The resulting data can be used to
calculate the intensity of an object. In astro-photography, the addition of
the difference image onto a broadband channel generates a noticeable
amplification of the objects.

Formula

	NB 	= narrow band
	BB 	= braod band
	BB*	= braod band intensified
	mue	= fraction of continuum found in narrow band

	Ie 	= NB - mue x BB							(1)
	BB*	= BB + Ie									(2)

================================================================================


 Input

 1. Active window, RGB after ChannelCombination

 2. A narrowband at least for one channel

	It is recommended, that a DynamicBackroundExtraction-process has been
	applied to RGB and NB-channel[s] prior to ContinuumSub

 Copyright Hartmut V. Bornemann, 2017, 2018


History

   23.07.20 Release 2.1.0, mask removed in emission application (PixelMath)
   13.06.20 Release 2.0.3, error, graphics object not disposed
   25.09.19 Release 2.0.2, quadratic solver solveQ added
   25.09.19 Release 2.0.1, minor changes
   23.09.19 Release 2.0.0, new layout with better performance
   01.03.19 curve analysis strategy
   12.02.19 curve analysis
   02.02.19 curve analysis error, index limits corrected
	30.10.18 continuumsub reworked, improved mue evaluation
	27.10.18 mask application moved to function continuumsub
	23.10.18 mask and GUI handling improved
	22.10.18 dialog window handling improved
	21.08.18	slope criteria changed to half of maximum (slope <= ms * 0.2)
	12.05.18	temporary views excluded from ViewLists
	27.04.18	Release and introduced on PI-Workshop in Austria (Attersee)
*/

/*
   EmissionLineIntegrationTG.js v2.0

   Modified 2022 by Thorsten Glebe (based on EmissionLineIntegration.js version 2.1.0)

   This program is free software: you can redistribute it and/or modify it
   under the terms of the GNU General Public License as published by the
   Free Software Foundation, version 3 of the License.

   This program is distributed in the hope that it will be useful, but WITHOUT
   ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
   FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for
   more details.

   You should have received a copy of the GNU General Public License along with
   this program.  If not, see <http://www.gnu.org/licenses/>.

   Change history:
   v2.0
      1. increase step size to speed up calculation by factor 3, mu result changes by ~1% only, no difference in results visible
*/

#feature-id    EmissionLineIntegrationTG : TG Scripts > EmissionLineIntegrationTG

#include <pjsr/StdButton.jsh>
#include <pjsr/NumericControl.jsh>
#include <pjsr/Sizer.jsh>
#include <pjsr/Slider.jsh>
#include <pjsr/Color.jsh>
#include <pjsr/FileMode.jsh>
#include <pjsr/StdIcon.jsh>
#include <pjsr/MaskMode.jsh>
#include <pjsr/FontFamily.jsh>
#include <pjsr/ImageOp.jsh>
#include <pjsr/FrameStyle.jsh>
#include <pjsr/TextAlign.jsh>
#include <pjsr/StdCursor.jsh>

#include "lib/TGScriptsLib.js"
#include "lib/TGContinuumSubtractionLib.js"


#define TAB '\t'
#define TEST 0

/* *****************************************************************************
 * *****************************************************************************
 *		DIALOG
 * *****************************************************************************
 * *****************************************************************************
 *
*/

// ----------------------------------------------------------------------------
// eliParams
// ----------------------------------------------------------------------------
function eliParms()
{
   this.dialogWindowWidth = 0;
   this.dialogWindowHeight = 0;
   this.amplify_R = 1;
   this.amplify_G = 1;
   this.amplify_B = 1;
   this.version = VERSION;
}

// ----------------------------------------------------------------------------
// showDialog
// ----------------------------------------------------------------------------
function showDialog(viewRGB)
{
   // Add all properties and methods of the core Dialog object to this object.
   this.__base__ = Dialog;
   this.__base__();
   this.userResizable = true;

   var RGB = "RGBM"

   var dialog = this;

   var setVal = Settings.read('EmissionLineIntegration', DataType_String);
   var parms  = new eliParms();
   if (setVal != null) parms = JSON.parse(setVal);

   this.cancel = false;

	var nbTested = false;
   var testing  = false;

   // control arrays
   var ctls    				= [null, null, null];
   var c_views 				= [null, null, null];
	this.contingentControls = [null, null, null];
	this.greenLabelControls = [null, null, null];
	this.radioButtons 		= [null, null, null, null];

	//
	this.NRGB = new csNRGB(viewRGB, this);
	this.NRGB.refreshed = function (dialog)
	{
		if (dialog.radioButtons[0].checked)
		{
         dialog.imageview.SetImage(dialog.NRGB.bitmap);
		}
		dialog.applyButton.enabled = false;
	}

	this.csChannels = [null, null, null];

	for (var i = 0; i < 3; i++)
	{
		this.csChannels[i] = new csChannel(this.NRGB, i);
		with (this.csChannels[i])
		{
			this.csChannels[i].csSubtracted = function(channel)
			{
				with (channel)
				{
					//
					// is this channel selected by radioButton?
					//
					dialog.radioButtons[channelIndex + 1].enabled = true;
				 	for (var i = 0; i < 3; i++)
					{
						if (dialog.radioButtons[i + 1].checked)
						{
                     dialog.imageview.SetImage(bitmap);
						}
					}
				}
			}
		}
	}

   this.progress = 0;

   //
   Console.writeln("Narrowband application on RGB images");
   Console.writeln("====================================");
   Console.writeln("Processing " + viewRGB.id);

	// ------------------------------------------------------------------------
   // main panels left (preview), right (controls)
   // ------------------------------------------------------------------------
   this.panelLeft = new Frame(this);
   this.panelRight = new Frame(this);

   with (this.panelLeft)
   {
      backgroundColor  = 0xff000080;
      setMinSize(800, 600 );
      onResize = function( wNew, hNew, wOld, hOld )
      {
         Console.writeln(wNew+'\t'+ hNew+'\t'+ wOld+'\t'+ hOld );
         dialog.imageview.resize(wNew, hNew);
      }
   }

   this.imageview = new ImageView(this.panelLeft, this);

   this.lblHeadLine = new Label(this)
   with (this.lblHeadLine)
   {
      useRichText = true;
      text ="<b>RGB: " + viewRGB.id +"</b>";
   }

   // my ©
   // -------------------------------------------------------------------------
   this.lblCopyright = new Label(this)
   this.lblCopyright.text = "© 2017, Hartmut V. Bornemann, ver. " + VERSION;

	for (var i = 0; i < 4; i++)
	{
		var radioButton = new RadioButton(this);
		with (radioButton)
		{
			if (i == 0)
			{
				checked = true;
				text = "RGB";
				toolTip = "View the current RGB image";
			}
			else
			{
				text = "E" + i;
				enabled = false;
				toolTip = "View the emission line image";
			}
			onCheck = function( checked )
			{
				if (parent == null) return;
				for (var j = 0; j < dialog.radioButtons.length; j++)
				{
					if (dialog.radioButtons[j] == this)
					{
						if (j > 0)
						{
							//
							// view RGB
							//
                     dialog.imageview.SetImage(dialog.csChannels[j - 1].bitmap);
						}
						else
						{
							//
							// view narrowband
							//
                     dialog.imageview.SetImage(dialog.NRGB.bitmap);
						}
					}
				}
			}
		}
		dialog.radioButtons[i] = radioButton;
	}

   // -------------------------------------------------------------------------
	this.testButton =  new PushButton( this );
	with (this.testButton)
	{
		enabled = false;
      defaultButton = true;
		text = "Test";
		toolTip = "<p>Evaluate subtraction quantity for each channel" +
					 " and display the result in the preview</p>";
		onClick = function(checked)
      {
         testing = true;
         dialog.resetLights();
         dialog.cancel = false;
			enabled = false;
			dialog.okButton.enabled = false;
			dialog.applyButton.enabled = false;

			dialog.NRGB.refresh();

			for (var i = 0; i < dialog.csChannels.length; i++)
			{
            if (!dialog.csChannels[i].canEvaluate()) continue;

            dialog.greenLabelControls[i].foregroundColor = 0xffffff00;

            dialog.advanceProgress(0);

            processEvents();

				if (dialog.csChannels[i].getEmission())
				{
               if (dialog.cancel) break;
					with (dialog.csChannels[i])
					{
						if (mue > 0.0)
						{
							Console.writeln(emission.id + " = " + narrowBand.id +
							" - " + mue.toFixed(5) + " * " + broadBand.id);
                     dialog.radioButtons[i + 1].enabled = true;
                     dialog.greenLabelControls[i].foregroundColor = 0xFF00FF00;
						}
                  else
                  {
                     dialog.radioButtons[i + 1].enabled = false;
                  }
					}
					continue;
				}
			}

         if (!dialog.cancel)
         {
            dialog.NRGB.addEmission();
            if (dialog.radioButtons[0].checked)
            {
               //this.parent.previewControl.RefreshImage(this.parent.NRGB.bitmap);
               //this.parent.previewControl.SetImage(this.parent.NRGB.bitmap);
               dialog.imageview.SetImage(dialog.NRGB.bitmap);
            }
         }

			enabled = true;
			nbTested = true;
			dialog.okButton.enabled = true;
			dialog.applyButton.enabled = true;
			dialog.advanceProgress(0);
         testing = false;
		}
	}

   // -------------------------------------------------------------------------
	this.lblTick = new Label(this);
	with (this.lblTick)
	{
      backgroundColor = 0xff8fcfef;
      frameStyle = FrameStyle_Box;
		textAlignment = TextAlign_Right|TextAlign_VertCenter;
      var w = this.font.width( 'MMMMMM' );
      setFixedWidth( w * 2);

      onPaint = function( x0, y0, x1, y1 )
      {
         var g = new Graphics(dialog.lblTick);
         var str = (dialog.progress * 100).toFixed() + '%';
         var r = g.textRect( x0, y0, x1, y1, str, TextAlign_Center );
         g.drawTextRect( r, str);
         if (dialog.progress > 0)
         {
            var x = (x1 - x0) * dialog.progress;
            g.pen = new Pen(0xffff0000, 5);
            g.drawLine(0, 2, x, 2);
         }
         g.end();
      }
   }

   // -------------------------------------------------------------------------
	this.cancelButton = new PushButton(this);
	with (this.cancelButton)
	{
		text = "Cancel";
		toolTip = "<p>Interrupt evaluation process</p>";
		onClick = function(checked) {
         dialog.cancel = true;
         if (!testing)
         {
            // cancel in idle state terminates the dialog
            Console.hide();
            dialog.done(1);
         }
		}
	}

   // -------------------------------------------------------------------------
	this.applyButton = new PushButton( this );
	with (this.applyButton)
	{
      defaultButton = false;
		text = "Apply";
		toolTip = "<p>Apply the reduced NB images to the MainView</p>";
		enabled = false;
		onClick = function(checked) {
			if (dialog.NRGB.apply())
			{
				stfMainView(parent);
			}
			else
				Console.writeln("Update failed");
			enabled = false;
			nbTested = false;
		}
	}

   // -------------------------------------------------------------------------
   this.okButton = new PushButton( this );
   with (this.okButton)
   {
      defaultButton = false;
      icon = this.scaledResource( ":/icons/ok.png" );
      text = "OK";
		toolTip = "<p>Exit this dialog</p>";

      onClick = function(checked)
      {
			if (nbTested)
			{
				var query = new MessageBox("The image was modified'\r\n'"
							+ "'Yes' copies to view '\r\n'"
							+ "'Cancel' continues '\r\n'"
							+ "'No' quits without updating",
							"Save view",
											StdIcon_Question,
											StdButton_Yes,
											StdButton_No,
											StdButton_Cancel);
				var answ = query.execute();
				if (answ == StdButton_Yes)
				{
					if (dialog.NRGB.apply())
					{
						stfMainView(dialog);
					}
					else
					{
						Console.writeln("Update failed");
					}
				}
				else if (answ == StdButton_Cancel)
				{
					return; // continue script
				}
				else
				{
					Console.writeln("Image not updated");
				}
			}
         //
			// show or remove views
			//
			if (dialog.retainNB.checked)
			{
 		 		keepEmissionLineViews(dialog);
				stfEmissionViews(dialog);
				//
				// add the graphical analysis
				//
				dialog.NRGB.graphicalAnalysis(dialog.NRGB.mainView);
			}
			//
			//
			//
			dialog.NRGB.maskShow();
			//
			// current parameters to Settings
			//
         parms.dialogWindowWidth  = dialog.width;
         parms.dialogWindowHeight = dialog.height;
         parms.amplify_R = dialog.csChannels[0].contingent;
         parms.amplify_G = dialog.csChannels[1].contingent;
         parms.amplify_B = dialog.csChannels[2].contingent;
         var strVal = JSON.stringify(parms);
         Settings.write('EmissionLineIntegration', DataType_String, strVal);

			//
			// write files in test-mode
			//
			if (TEST)
			{
				for (var i = 0; i < 3; i++)
				{
					if (dialog.csChannels[i].xy != null)
					{
						var filename = File.systemTempDirectory +
											"\\XYEmission" + "RGB"[i] + ".csv";
						var f = new File(filename,FileMode_Create);
						f.outTextLn( "mue" + TAB + "count")
						for (var j = 0; j < dialog.csChannels[i].xy.length; j++)
						{
							f.outTextLn(dialog.csChannels[i].xy[j][0] + TAB +
                                 dialog.csChannels[i].xy[j][1])
						}
						f.close();
					}
					if (dialog.csChannels[i].xy != null)
					{
						var filename = File.systemTempDirectory +
											"\\DXYEmission" + "RGB"[i] + ".csv";
						var f = new File(filename,FileMode_Create);
						f.outTextLn( "mue" + TAB + "count")
						for (var j = 0; j < dialog.csChannels[i].dxy.length; j++)
						{
							f.outTextLn( dialog.csChannels[i].dxy[j][0] + TAB +
											 dialog.csChannels[i].dxy[j][1])
						}
						f.close();
					}
				}
			}
			//
			// end dialog
			//
         Console.hide();
			dialog.done(0);
      }
   }

   // -------------------------------------------------------------------------
   // create a controlbox for each channel and one optional mask
   // -------------------------------------------------------------------------
   for (var i = 0; i < 4; i++)
   {
      var gbx = new GroupBox( this );
      with (gbx)
      {
         sizer = new HorizontalSizer;
         sizer.margin = 6;
         sizer.spacing = 4;
         if (i < 3)
			{
            title = "Narrowband on channel " + RGB[i];
			}
         else
			{
            title = "Star Mask [opt.]";
			}
      }
      ctls[i] = gbx;


      // image select
      // ----------------------------------------------------------------------
		var vList = new ViewList( this );
      vList.index = i;
      with (vList)
      {
			setVariableSize();
			excludeIdentifiersPattern  = TEMPVIEW;
         getMainViews();
         excludeMainViewsByColor(vList, false /*excludeMono*/);

         onViewSelected = function( view )
			{
         	this.cursor = new Cursor(StdCursor_Wait);
				if (this.index < 3)
				{
					dialog.csChannels[this.index].setNarrowBand(view);
					//
					// set controls with mue, contingent from view
					//
					with (dialog.csChannels[this.index])
					{
						dialog.radioButtons[this.index + 1].enabled = hasNarrowBand &&
						emission != null;;
					}
               dialog.greenLabelControls[this.index].foregroundColor = 0x40880000;
				}
				else
				{
					//
					// set mask
					//
					dialog.NRGB.setMask(view);
               //
               // reset lights
               //
               dialog.resetLights();
				}
         	this.cursor = new Cursor(StdCursor_Arrow);
				//
				// at least one channel selected?
				//
				dialog.testButton.enabled = false;
				for (var j in dialog.csChannels)
				{
					if (dialog.csChannels[j].hasNarrowBand)
					{
						dialog.testButton.enabled = true;
						break;
					}
				}
            dialog.advanceProgress(0);
			}
		}

      // ----------------------------------------------------------------------
		// label greenLight
      // ----------------------------------------------------------------------
		if (i < 3)
		{
			var lblGreenLight  = new Label(this);
			lblGreenLight.font = new Font("WebDings", 11)
			lblGreenLight.text = "n";
			lblGreenLight.foregroundColor = 0x40808080;
			this.greenLabelControls[i] = lblGreenLight;
		}

      // ----------------------------------------------------------------------
      // label: Contingent
      // ----------------------------------------------------------------------
      if (i < 3)
      {
         var numContingent = new NumericEdit (this);
         numContingent.index = i;
         with (numContingent)
         {
				autoEditWidth = true;
            label.text = "Amplify:";
				edit.rightAlignment = true;
            setPrecision( 2 );
				setRange(0, 100);
				setReal( true );
            setValue( 1.00 );
            toolTip = "<p>Apply a factor for this emission image, when added to the broadband channel" +
                      " (0..100). Default = 1</p>";
            onValueUpdated = function( value )
            {
             	dialog.csChannels[this.index].setContingent(value);
            }
            onMouseDoubleClick = function( x, y, buttonState, modifiers )
            {
               setValue (1.00);
           		dialog.csChannels[this.index].setContingent(1.0);
            }
				onMouseWheel = function( x, y, delta, buttonState, modifiers )
				{
					var step = 0.1 * Math.sign(delta);
					var v = value - step;
					if (v > upperBound) v = upperBound;
					if (v < lowerBound) v = lowerBound;
					setValue(v);
             	dialog.csChannels[this.index].setContingent(v);
				}
         }
			this.contingentControls[i] = numContingent;
      }

      // fill the groupBox
		with (gbx.sizer)
      {
         spacing = 4;

         add( vList );
       	if (i < 3)
         {
            addSpacing( 8 );
				add( lblGreenLight );
            addSpacing( 8 );
            add( numContingent );
            addSpacing( 8 );
            addStretch();
         }
			else
			{
				addStretch();
			}
     	}

      // save controls
      c_views[i] = vList;
   }

   // CheckBoxes
   // -------------------------------------------------------------------------
   this.retainNB = new CheckBox(this);
   with (this.retainNB)
   {
      text = "Retain emission view(s)";
      toolTip = "<p>Keep emission line view for visual or scientific analysis.</p>";
   }

   this.checkBoxSizer = new HorizontalSizer();
   this.checkBoxSizer.margin = 4;
   this.checkBoxSizer.addStretch()
   this.checkBoxSizer.add(this.retainNB);

   this.testButtonSizer = new HorizontalSizer;
   with (this.testButtonSizer) {
      margin = 4;
		add( this.testButton );
      addSpacing(8);
      add(this.lblTick);
   }

   // OK and Cancel button
   // -------------------------------------------------------------------------
   this.mainButtons = new HorizontalSizer;
   with (this.mainButtons) {
      margin = 4;
		add(this.cancelButton);
		addStretch();
		add( this.applyButton );
		addStretch();
      add( this.okButton );
   }

   this.viewlabel = new Label(this);
   this.viewlabel.text = 'View:';

	this.radioButtonSizer = new HorizontalSizer;
	with (this.radioButtonSizer)
	{
		//add( this.lblCopyright );
		addStretch();
      add(this.viewlabel);
		for (var i = 0; i < this.radioButtons.length; i++)
		{
      	addSpacing( 16 );
			add(this.radioButtons[i]);
		}
	}

   try
   {
      this.contingentControls[0].setValue( parms.amplify_R );
      this.contingentControls[1].setValue( parms.amplify_G );
      this.contingentControls[2].setValue( parms.amplify_B );
      this.csChannels[0].setContingent( parms.amplify_R );
      this.csChannels[1].setContingent( parms.amplify_G );
      this.csChannels[2].setContingent( parms.amplify_B );
   }
   catch (ex)
   {
   }

   // all controls together
   // -------------------------------------------------------------------------
   this.panelRight.sizer = new VerticalSizer();
   with ( this.panelRight.sizer ) {
      margin = 4;
      spacing = 8;
      add(this.lblHeadLine);
      spacing = 8;
      add(this.lblCopyright);

      for (var i = 0; i < ctls.length; i++)
      {
         spacing = 8;
         add(ctls[i]);
      }
      spacing = 8;
      add(this.radioButtonSizer);
      spacing = 8;
      add(this.checkBoxSizer);
      addStretch();
      add(this.testButtonSizer);
      spacing = 8;
      add(this.mainButtons);
   }


   // -------------------------------------------------------------------------
   // stfMainView
   // -------------------------------------------------------------------------
	function stfMainView(dialog)
	{
		//
		// ApplyAutoSTF on image
		//
		ApplyAutoSTF( viewRGB,
					DEFAULT_AUTOSTRETCH_SCLIP,
					DEFAULT_AUTOSTRETCH_TBGND, true );
	}

   // -------------------------------------------------------------------------
   // stfEmissionViews
   // -------------------------------------------------------------------------
	function stfEmissionViews(dialog)
	{
		//
		// ApplyAutoSTF emission line view(s)
		//
		for (var i = 0; i < 3; i++)
		{
			if (dialog.csChannels[i].emission != null)
			{
				if (dialog.retainNB.checked)
				{
					Console.writeln("Emission on " + RGB[i] + ", View " +
						dialog.csChannels[i].emission.id+ ", mue = " +
						dialog.csChannels[i].mue );
					//
					// retain emission line views?
					//
					ApplyAutoSTF(dialog.csChannels[i].emission,
							DEFAULT_AUTOSTRETCH_SCLIP,
							DEFAULT_AUTOSTRETCH_TBGND, true );
				}
			}
		}
	}

   // -------------------------------------------------------------------------
   // keepEmissionLineViews
   // -------------------------------------------------------------------------
	function keepEmissionLineViews(dialog)
	{
		//
		// keep or retain emission line views depending on dislog's checkBox
		//
		for (var i = 0; i < 3; i++)
		{
			if (dialog.csChannels[i].emission != null)
			{
				//
				// keep away from disposal function
				//
				setDisposal(dialog.csChannels[i].emission, false);
				dialog.csChannels[i].emission.window.show();
			}
		}
	}

   // -------------------------------------------------------------------------
   // advanceProgress
   // -------------------------------------------------------------------------
   this.advanceProgress = function(progress)
   {
      //dialog.lblTick.text = (progress * 100).toFixed() + '%';
      dialog.progress = progress;
      dialog.lblTick.repaint();
      processEvents();
   }

   // -------------------------------------------------------------------------
   // resetLights
   // -------------------------------------------------------------------------
   this.resetLights = function()
   {
      for (var j in dialog.csChannels)
      {
         if (dialog.csChannels[j].hasNarrowBand)
            dialog.greenLabelControls[j].foregroundColor = 0x40880000;
         else
            dialog.greenLabelControls[j].foregroundColor = 0x40808080;
      }
   }

   this.imageview.SetImage(this.NRGB.bitmap);

   this.sizer = new HorizontalSizer();
   with (this.sizer)
   {
      margin = 4;
      add(this.panelLeft);
      addSpacing(8);
      add(this.panelRight);
   }

   // dialog window
   this.windowTitle = TITLE + " " + VERSION;
   this.adjustToContents();

   this.panelRight.setFixedWidth(this.panelRight.width);


   if (parms.dialogWindowWidth > 0 && parms.dialogWindowHeight > 0)
	{
		this.width  = parms.dialogWindowWidth;
		this.height = parms.dialogWindowHeight;
	}

}

// ----------------------------------------------------------------------------
// Display with ImageView Control
// ----------------------------------------------------------------------------
function ImageView(parent, dialog)
{
   this.__base__ = Frame;
  	this.__base__(parent);

   var frame   = parent;

   var prnt = frame;
   while (prnt.parent != null)
   {
      prnt = prnt.parent;
   }

   var bitmap = null;
   var scaledImage = null;

   this.SetImage = function(bitmap_)
   {
      bitmap = null;
      try
      {gc();} catch (ex) {};
      bitmap = bitmap_;
      resize_();
      frame.repaint();
   }

   frame.onPaint = function (x0, y0, x1, y1)
   {
      if (bitmap == null) return;

      var graphics = new VectorGraphics(this);

      graphics.fillRect(x0,y0, x1, y1, new Brush(0xff000000));

      var x = (frame.width - scaledImage.width) / 2;
      var y = (frame.height - scaledImage.height) / 2;

      graphics.drawBitmap(x, y, scaledImage);

      graphics.pen = new Pen(0xffffffff,0);
      graphics.drawRect(x-1, y-1, x + scaledImage.width + 1, y + scaledImage.height + 1);
      graphics.end();
   }

   frame.onResize = function (wNew, hNew, wOld, hOld)
   {
      resize_();
      frame.repaint();
   }

   function resize_()
   {
      if (bitmap == null) return;
      var zoom = Math.min(((frame.width - 7) / bitmap.width), ((frame.height - 7) / bitmap.height));
      scaledImage = bitmap.scaled(zoom);
   }

   dialog.onResize = function (wNew, hNew, wOld, hOld)
   {
      var dx = wNew - wOld;
      var dy = hNew - hOld;
      frame.resize(frame.width + dx, frame.height + dy);
   }
}

ImageView.prototype = new Frame();

// ----------------------------------------------------------------------------
// STF Auto Stretch routine
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

	var t = false;
	if (t)
	{
		console.writeln( "<end><cbr/><br/><b>", view.fullId, "</b>:" );
		for ( var c = 0; c < n; ++c )
		{
			console.writeln( "channel #", c );
			console.writeln( format( "c0 = %.6f", stf.STF[c][0] ) );
			console.writeln( format( "m  = %.6f", stf.STF[c][2] ) );
			console.writeln( format( "c1 = %.6f", stf.STF[c][1] ) );
		}
	}

   stf.executeOn( view );

   if (t) console.writeln( "<end><cbr/><br/>" );
}

// ----------------------------------------------------------------------------
// ApplyHistogram
// ----------------------------------------------------------------------------
function ApplyHistogram(view)
{
   Console.writeln('ApplyHistogram '+view.id);
	var stf = view.stf;

	var H = [[  0, 0.0, 1.0, 0, 1.0],
				[  0, 0.5, 1.0, 0, 1.0],
				[  0, 0.5, 1.0, 0, 1.0],
				[  0, 0.5, 1.0, 0, 1.0],
				[  0, 0.5, 1.0, 0, 1.0]];;

	if (view.image.isColor)
	{
		for (var c = 0; c < 3; c++)
		{
			H[c][0] = stf[c][1];
			H[c][1] = stf[c][0];
		}
	}
	else
	{
		H[3][0] = stf[0][1];
		H[3][1] = stf[0][0];
	}

	var STF = new ScreenTransferFunction;

	view.stf =  [ // c0, c1, m, r0, r1
	[0.00000, 1.00000, 0.50000, 0.00000, 1.00000],
	[0.00000, 1.00000, 0.50000, 0.00000, 1.00000],
	[0.00000, 1.00000, 0.50000, 0.00000, 1.00000],
	[0.00000, 1.00000, 0.50000, 0.00000, 1.00000]
	];

	STF.executeOn(view)

	var HT = new HistogramTransformation;
	HT.H = H;
	HT.executeOn(view);
}

// ----------------------------------------------------------------------------
// plotter
// ----------------------------------------------------------------------------
function plotter(curves, mue, nbId, bbId, csId, smId)
{
   // fetch the program from temp
   //
   var GNUPlot = gnuplotExecutable()

   if (GNUPlot == "")
   {
      Console.writeln("GNUPlot program file missing");
      return;
   }

   nbId = nbId.replaceAll('_', "\\\\\\\_");
   bbId = bbId.replaceAll('_', "\\\\\\\_");
   csId = csId.replaceAll('_', "\\\\\\\_");
   if (smId != "") smId = smId.replaceAll('_', "\\\\\\\_");
   var mueStr = "mue = " + mue.toFixed(6);

   var scriptPath = tempFile("gbnuScript", "plt");
   var imagePath  = tempFile("image", "svg");
   var outputPath = tempFile("output", "txt");
   var dataPath   = tempFile("cs_data", "csv");
   //
   // generate data file
   //
   var a = [];
   var t = 0.01;	// 1%

   for (var i in curves)
   {
      t = 0;
      a.push(curves[i].x.toFixed(8) + '\t' +
             curves[i].y.toFixed(8) + '\t' +
             curves[i].slope.toFixed(8));
   }
   File.writeTextFile(dataPath, a.join('\n') );

   var minx = curves[0].x;
   var maxx = curves[curves.length - 1].x;
   var cent = (minx + maxx) / 2;

   // write GNUPlot script

   var script = [];
   script.push("set terminal svg size 600,500 enhanced background rgb 'white' font \"Helvetica,10\"");
   script.push("set output \"" + imagePath + "\"");
   var title =" set title font \"Times Bold, 20\" enhanced \"Continuum Subtraction";
   title += "\\n{/*0.8 Narrowband: " + nbId + '}';
   title += "\\n{/*0.8 Broadband: " + bbId + '}';
   if (smId != "")
      title += "\\n{/*0.8 Starmask: " + smId + '}';
   else
      title += "\\n{/*0.8 No mask" + smId + '}';
   title += "\\n{/*0.8 Subtracted: " + csId + '}';
   title += '\"';
   script.push(title);
   script.push("set xlabel \"" + mueStr + "\" font \"Courier, 12\"");
   script.push("set ylabel \"Normalized data\" font \"Helvetica, 12\"");
   script.push("set style line 1 lc rgb 'black' lt 1 lw 1 dashtype 0");
   script.push("set style line 2 lc rgb 'black' lt 1 lw 1 dashtype 1");
   script.push("set style line 3 lc rgb 'grey' lt 0 lw 1 dashtype '-'");
   script.push("set grid back ls 3");

   script.push("set key left top");

   script.push("set arrow 1 from " + mue.toString() + ",0 to " +
      mue.toString() + ",1 nohead filled back lw 1");

   if (mue < cent)
      script.push("set key right top");
   else
      script.push("set key left top");
   script.push("plot \"" + dataPath + "\"  using 1:2 title 'Blackness' with lines ls 1, \\");
   script.push(" \"" + dataPath + "\"  using 1:3 title '1st Deviation' with lines ls 2");
   script.push("quit");

   File.writeTextFile( scriptPath, script.join('\n'));

   var P = new ExternalProcess();
   with (P)
   {
      workingDirectory = File.systemTempDirectory;

      redirectStandardInput( scriptPath );
      redirectStandardOutput( outputPath );

      onStarted = function()
      {
         Console.writeln("Start " + GNUPlot);
      }

      onError = function( errorCode )
      {
         Console.writeln("Fehler# " + errorCode);
      }

      onFinished = function( exitCode, exitStatus )
      {
         Console.writeln("End Exit code " + exitCode + '\t' +
                         ", Status " + exitStatus);
      }

      start(GNUPlot);
      waitForFinished();
   }

   var txt = File.readTextFile( outputPath );

   Console.writeln(txt);
   Console.flush();
   Console.writeln("imagepath: ", imagePath);

   // load image
   if (File.exists(imagePath))
   {
      try
      {
         var bm = new Bitmap(imagePath);
         var window = new ImageWindow(bm.width, bm.height, 3, 32, true, true, PLOTVIEW);
         window.mainView.beginProcess(UndoFlag_NoSwapFile);
         window.mainView.image.blend( bm );
         window.mainView.endProcess();
         window.show();
      }
      catch (ex)
      {
         Console.writeln("Image load error: " + ex);
      }
      File.remove( imagePath );
   }

   File.remove( scriptPath );
   File.remove( outputPath );
   File.remove( dataPath );

   function tempFile(name, ext)
   {
      var workingDir = File.systemTempDirectory;
      workingDir = workingDir.replaceAll('\\', '/');
      if (!workingDir.endsWith('/')) workingDir += '/';
      var filename = "";
      var index = 0;
      while (true)
      {
         if (index == 0)
            filename = workingDir + name + '.' + ext;
         else
            filename = workingDir + name + index.toString() + '.' + ext;
         if (!File.exists(filename)) break;
         index += 1;
      }
      return filename;
   }

   function gnuplotExecutable()
   {
      var gnu = File.systemTempDirectory + "/gnuplot.exe";
      if (File.exists(gnu)) return gnu;
      var f = File.currentWorkingDirectory;
      if (!f.endsWith("/bin")) f += "/bin";
      f += "/gnuplot.exe";
      if (File.exists(f))
      {
         File.copyFile( gnu, f );
         return gnu;
      }
      return "";  // not found
   }
}

// ----------------------------------------------------------------------------
// replaceAll
// ----------------------------------------------------------------------------
String.prototype.replaceAll = function(search, replacement)
{
    var target = this;
    return target.split(search).join(replacement);
}


// Helper functions
// ----------------------------------------------------------------------------
// getNewName
// ----------------------------------------------------------------------------
function getNewName(view, suffix)
{
   var newName = TEMPVIEW + view.id + suffix;
   return uniqueViewId(newName);
}

// ----------------------------------------------------------------------------
// setDisposal
// ----------------------------------------------------------------------------
function setDisposal(view, b)
{
	//
	// set/reset disposal flag in view
	//
	view.setPropertyValue(DISPOSE, b);
}

// ----------------------------------------------------------------------------
// housekeeping
// ----------------------------------------------------------------------------
function houseKeeping()
{
	var views = getAllMainViews();
	for (var i = 0; i < views.length; i++)
	{
		if (views[i].hasProperty(DISPOSE))
		{
			var dispose = views[i].propertyValue(DISPOSE);
			if (dispose) views[i].window.forceClose();
		}
	}
}


showDialog.prototype = new Dialog;

String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.split(search).join(replacement);
}

//////////////////////////////////////////////////////////////////////////////
//
// Main script entry point
//
//////////////////////////////////////////////////////////////////////////////
function main()
{
	houseKeeping();
   // get active image window.
   var window = ImageWindow.activeWindow;
   if ( window.isNull )
   {
      errorMessageOk( "No active image" );
   }
   else
   {
      var img = window.currentView.image;
      if (!img.isColor)
      {
         errorMessageOk( "This script for RGB images only", TITLE );
      }
      else
      {
         Console.hide();
			Console.show();
		   Console.abortEnabled = true;

         try
         {
            var dialog = new showDialog(window.currentView);
            dialog.execute();
         }
         catch (ex)
         {
            Console.writeln(ex);
         }
         houseKeeping();
         gc();
      }
   }
}

main();
