/*
 *		CS.js
 *
 * 	Continuum Subtraction
 *
 *    Subtract the continuum radiation from a narrowband image
 *
 *
		Input

		1. Narrowband image

		2. A broadband image, selected from a viewlist

      3. A star mask (opt.)

		Copyright Hartmut V. Bornemann, 2017, 2018, 2019

 *
 *
 *
 * */

/*
   CSTG.js v2.0

   Modified 2022 by Thorsten Glebe (based on CS.js version 1.2.1)

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
      1. added "new instance" button which stores state of the GUI
      2. minor code refactorings
   v2.1
      1. increase step size to speed up calculation by factor 3, mu result changes by ~1% only, no difference in results visible
*/

#feature-id    CSTG : TG Scripts > CSTG

#feature-info  Script to perform the subtraction of the continuum from a narrowband image.<br/>\
   <br/>\
   This script analysis the increasing blackness when subtracting a growing<br/> \
   fraction of the broadband image.<br/> \
   <br/> \
   Copyright &copy; 2017 Hartmut V. Bornemann / 2022 Thorsten Glebe


#include <pjsr/StdButton.jsh>
#include <pjsr/FrameStyle.jsh>
#include <pjsr/TextAlign.jsh>
#include <pjsr/NumericControl.jsh>
#include <pjsr/Sizer.jsh>
#include <pjsr/Slider.jsh>
#include <pjsr/UndoFlag.jsh>
#include <pjsr/SampleType.jsh>
#include <pjsr/DataType.jsh>
#include <pjsr/Color.jsh>
#include <pjsr/FileMode.jsh>
#include <pjsr/StdIcon.jsh>
#include <pjsr/StdCursor.jsh>
#include <pjsr/MaskMode.jsh>
#include <pjsr/ColorSpace.jsh>
#include <pjsr/FontFamily.jsh>
#include <pjsr/ImageOp.jsh>

#include "lib/TGScriptsLib.js"

#define TITLE "Continuum Subtraction"
#define SCRIPTNAME "CSTG"
#define VERSION "2.0"

// original step size
//#define DEFAULT_STEP_SIZE 0.00025

// new step size, faster execution, slightly less accurate mu
#define DEFAULT_STEP_SIZE 0.001

function CSData()
{
   this.dialog     = null;
	this.cancel     = false;
	this.nb 		    = null; // narrowband view
	this.bb 		    = null; // broadband view
	this.mask 	    = null; // mask
   this.channel    = 0;
   this.limit      = 90;
   this.noisecheck = false;
   this.plotcheck  = true;
   this.enabled    = false;
   this.nb_id      = "";
   this.bb_id      = "";
   this.mask_id    = "";


   /*
    * Save parameters in process icon.
    */
   this.exportParameters = function()
   {
      Parameters.set("channel"   , this.channel);
      Parameters.set("limit"     , this.limit);
      Parameters.set("noisecheck", this.noisecheck);
      Parameters.set("plotcheck" , this.plotcheck);
      Parameters.set("enabled"   , this.enabled);
      Parameters.set("nb_id"     , this.nb_id);
      Parameters.set("bb_id"     , this.bb_id);
      Parameters.set("mask_id"   , this.mask_id);
   }

   /*
    * Restore saved parameters.
    */
   this.importParameters = function()
   {
      if (Parameters.has("channel"))
         this.channel = Parameters.getInteger("channel");
      if (Parameters.has("limit"))
         this.limit = Parameters.getInteger("limit");
      if (Parameters.has("noisecheck"))
         this.noisecheck = Parameters.getBoolean("noisecheck");
      if (Parameters.has("plotcheck"))
         this.plotcheck = Parameters.getBoolean("plotcheck");
      if (Parameters.has("enabled"))
         this.enabled = Parameters.getBoolean("enabled");
      if (Parameters.has("nb_id"))
      {
         this.nb_id = Parameters.getString("nb_id");
         if(this.nb_id)
         {
            var window = ImageWindow.windowById(this.nb_id);
            if(!window.isNull)
            {
               this.nb = window.mainView;
            }
         }
      }
      if (Parameters.has("bb_id"))
      {
         this.bb_id = Parameters.getString("bb_id");
         if(this.bb_id)
         {
            var window = ImageWindow.windowById(this.bb_id);
            if(!window.isNull)
            {
               this.bb = window.mainView;
            }
         }
      }
      if (Parameters.has("mask_id"))
      {
         this.mask_id = Parameters.getString("mask_id");
         if(this.mask_id)
         {
            var window = ImageWindow.windowById(this.mask_id);
            if(!window.isNull)
            {
               this.mask = window.mainView;
            }
         }
      }
   }
}

var data = new CSData;

function ContinuumSubtraction(dlg)
{
   this.nb        = null;     // input narrowband view
   this.bb        = null;     // input broadband view
   this.mask      = null;     // input mask view
   this.mue       = 0;        // reduction factor
   this.maskFlags = null;     // pixel flags, check a pixel, if true
   this.plot      = false;    // plot the curves graph, if true
   this.denoise   = false;    // de-noise the result image
   this.csImage   = null;     // result, i.e. the recduced narrow band image

   this.execute = function(callback)
   {
       Console.writeln("nb "+this.nb.id + this.nb.propertyValue( "CS:js" ));
           //return 0;
      if (this.nb == null || this.bb == null)
      {
         errorMessageOk("Narrowband and/or broadband view not set", TITLE);
         return false;
      }
      if (this.nb.id == this.bb.id)
      {
         errorMessageOk("Narrowband and broadband must be different", TITLE);
         return false;
      }
      //
      // check geometry
      //
      if (!this.nb.image.bounds.isEqualTo(this.bb.image.bounds))
      {
         errorMessageOk("Narrowband and broadband have different geometry", TITLE);
         return false;
      }
      if (this.mask != null)
      {
         if (this.nb.id == this.mask.id || this.bb.id == this.mask.id)
         {
            errorMessageOk("The mask must be different to narrowband and broadband", TITLE);
            return false;
         }
         if (!this.nb.image.bounds.isEqualTo(this.mask.image.bounds))
         {
            errorMessageOk("Narrowband and broadband have different geometry", TITLE);
            return false;
         }
         if (this.maskFlags == null)
         {
            this.maskFlags = getMaskArray(this.mask);
         }
      }
      var pixCount   = this.nb.image.width * this.nb.image.height;
      //
      // linear fit bb channel to nb
      //
      //
      // make temp copy of the broadband channel for subtraction
      //
      var bbLfit = copyView(this.bb, data.channel);

      equalizeMean(bbLfit, this.nb);
      //
      // nb and bb pixels to array
      //
      var a          = [];

      bbLfit.image.getPixels(a);
      var bbPixels   = new Float32Array(a);

      this.nb.image.getPixels(a);
      var nbPixels   = new Float32Array(a);
      //
      // broadband data in bbPixels array
      //
      Console.writeln("Narrowdband image...." + this.nb.id);
      Console.writeln("Broadband image......" + bbLfit.id);
      if (this.mask != null)
         Console.writeln("Mask image..........." + this.nb.id);

      if (this.maskFlags == null)
      {
         this.maskFlags = new Int8Array(pixCount);
         for (var j = 0; j < pixCount; j++) this.maskFlags[j] = 1;
      }

      // bb and nb should have nearly same mean after LinearFit

      var bbMedian   = bbLfit.image.median();
      var beginWith = Math.min(this.nb.image.median(), bbMedian)
                    / Math.max(this.nb.image.median(), bbMedian) * 0.5;

      var stepSize = DEFAULT_STEP_SIZE;

      Console.writeln("Start with mue......." + beginWith);
      Console.writeln("Increment............" + stepSize);
      //
      // evaluate mue
      //
      var limit = data.limit / 100 * nbPixels.length;
      //
      var curves = new mueCurves(nbPixels,
                                 bbPixels,
                                 this.maskFlags,
                                 beginWith,
                                 stepSize,
                                 callback,
                                 limit,
                                 dlg);
      if (data.cancel) return -1;
      this.mue = curves.mue;

      if (this.mue > 0)
      {
         Console.writeln("Curve points " + curves.xyy.length);

         Console.writeln("Reduction factor mue: " + this.mue.toFixed(8) +
            " of linear fitted " + this.bb.id);
      }

      if (this.mue > 0)
      {
         this.csImage = subtract(this.nb, bbLfit, this.bb,
                                 null/*this.mask*/, this.mue, data.channel);
         //
         // denoise
         //
         if (this.denoise) noiseReduction(this.csImage);
         //
         // set flag in view
         //
         if (!this.csImage.setPropertyValue("CS:js", "T" ))
            Console.writeln("View setPropertyValue failed " + this.csImage.id);
         //
         // STF
         //
         ApplyAutoSTF ( this.csImage, -2.80, 0.25 );
         //
         // plot graph
         //
         if (this.plot)
         {
            if (this.mask == null)
               plotter(
                  curves.xyy, this.mue, this.nb.id, this.bb.id, this.csImage.id, "");
            else
               plotter(
                  curves.xyy, this.mue, this.nb.id, this.bb.id, this.csImage.id, this.mask.id);
         }
         //
         // add keywords
         //
         var keywords = [];
         keywords.push(new FITSKeyword("EMISSION", "T", "Emission line image"));
         this.csImage.beginProcess(UndoFlag_NoSwapFile);
         this.csImage.window.keywords = keywords;
         this.csImage.endProcess();
      }
      else
      {
         message ("CS processing returned no solution");
      }

      bbLfit.window.forceClose();

      return this.mue > 0;
   }
	/* ***************************************************************************
	 *
	 * Evaluate the optimal quantity to be subtracted from the narrow band channel
	 *
	 * This quantity is the broad band image x mue
	 *
	 * ***************************************************************************/

   function mueCurves(NB, BB, MM, initialMue, stepSize, callback, limit, dlg)
	{
		//
		// evaluate first derivative of counts over mue
		//
		var minStep = stepSize;
		var stp     = minStep * 4;
		var n       = NB.length;
     // var maxC    = n * 0.9;
      var pF      = 1 / n;
		var bp 		= new Int8Array(MM);	// blackpoints
		var ii		= -1;						// loop index
		var stps 	= stp * 12.0;			// slope base

		this.mue 	= initialMue - stp;
		this.xy     = [];						// mue, count pairs
      this.xyy    = [];                // mue, xy, dxy combined

      var cnt    = 0;
      var progr  = 0;

		for (;;)
		{
			ii += 1;							// 0..

         processEvents();
         if (data.cancel)
         {
            Console.writeln("***cancel*** mue = " + this.mue.toFixed(4) +
                            ", black level counts = " + cnt);
            return;
         }

			this.mue += stp;

         var p = Math.floor(cnt * pF * 1000);

         if (p > progr)
         {
            callback( cnt * pF);
            progr = p;
         }
			// -----------------------------------------------------------------------
			// subtract mue-fraction of BB
			// -----------------------------------------------------------------------
         var gt0 = 0;
         var blackCount = 0;
 			for (var j = 0; j < n; j++)
			{
				if (bp[j])					// if 1, check this position
            {                       //
                                    // count non-masked pixels
                                    //
					if ((NB[j] - BB[j] * this.mue) > 0)
               {
                  gt0 += 1;         // count the non-black ones
                  continue;         // non-black
               }
					bp[j] = 0;				// skip this pixel in next run
				}
            else
            {
               blackCount++;
            }
			}

         if (gt0 > 0)
         {
            cnt = n - gt0;

			   this.xy.push(new Point(this.mue, cnt));
         }

         if (blackCount >= limit)
         {
            var t = findTurningPoint(this.xy, n, stps);
            this.mue = t.mue;
            this.xyy = t.xyy;
            return;
         }
		}
      return;     // leave this.xyy empty for no solution
	}

   function findTurningPoint(xy, n, stps)
   {
      //
      // normalize xy array of points
      //
      for (var k = 0; k < xy.length; k++) xy[k] = new Point(xy[k].x, xy[k].y /  n);

      // find 1st maximum in 1st deviation dy / dx

      var im  = -1;   // index of max slope
      var ms  =  0;   // max slope
      var dxy = [];   // combine mue, y and slope in array elements
      var u   = 0
      var k0  = 0;
      var k1  = 0;
      var points = [];
      var mdy = 0;
      var ym  = 0;
      var ps  = 0;   // previous slope

      //var fXY = File.systemTempDirectory + "/XY.csv";
      //if (File.exists(fXY)) File.remove(fXY);
      //var csv = new File(fXY, FileMode_Create);
      //csv.outTextLn('x' + '\t' + 'y');

      for (var k = 4; k < xy.length; k++)
      {
			var slope = (xy[k - 4].y - 8 * xy[k - 3].y + 8 * xy[k - 1].y - xy[k].y) / stps;
         dxy.push({x:xy[k].x, y:xy[k].y, slope:slope});

         //csv.outTextLn(xy[k].x + '\t' + slope);

         var dy  = Math.abs(slope - ps);

         if (k > 4 && dy > mdy) mdy = dy;

         ps = slope

         if (slope > ms)
         {
            ms = slope;
            im = u;
            k0 = k;
         }
         u += 1;
      }
      //csv.close();
      var yk = ms - 2 * mdy;   // y min at max

      // collect points

      for (var k = 0; k < dxy.length; k++)
      {
         if (dxy[k].slope > yk) //[2] > yk)
            points.push(new Point(dxy[k].x, dxy[k].slope));
         else
         {
            if (k > k0) break;
         }
      }

      var coeff = Polynomials(points, 3); // Polynomials(points, 4);

      for (var k in coeff) Console.writeln("Coeff "+k+'\t'+coeff[k]);

      // dy/dx
      // 0 = c + bx + ax^2
      // x = -b +- sqrt(b^2 - 4ac) / 2a

      var X = solveQ(3 * coeff[3], 2 * coeff[2], coeff[1]);

      //Console.writeln('Solutions X = ' + '\t' + X[0] + '\t' + X[1]);

      // find max in polynom curve

      var max = new Point(0, 0);
      for (var k in points)
      {
         var x = points[k].x;
         var y = poly(coeff, x);
         if (y > max.y) max = new Point(x, y);
      }

      // normalize slope values

      for (var k = 0; k < dxy.length; k++)
         dxy[k] ={x:dxy[k].x, y:dxy[k].y, slope:dxy[k].slope / ms};

      if (im > dxy.length - 7) return {mue:-1, xy:xy, dxy:dxy};

      //var mue = max.x;
      //Console.writeln('Potnt max' + '\t' + max);

      var mue;

      if ((Math.abs(X[0]  - max.x)) < (Math.abs(X[1] - max.x)))
         mue = X[0];
      else
         mue = X[1];


      Console.writeln("solved " + mue);

      // -----------------------------------------------------------------------
      // combine the curves
      // -----------------------------------------------------------------------

      // x where dxy ~0.1 left of mue
      var m0 = 0;
      var i0 = 0;
      for (var i in dxy)
      {
         if (dxy[i].slope > 0.025)  //if (dxy[i][2] > 0.025)
         {
            m0 = dxy[i].x;   //m0 = dxy[i][0];
            i0 = i;
            break;
         }
      }

      // x where dxy ~0.1 right of mue

      var m1 = mue + (mue - m0);

      var xyy = [];        // collect most interestion points for the graph
      for (var i = i0; i < dxy.length; i++)
      {
         xyy.push(dxy[i]);
         //if (dxy[i][0] > m1) break;
      }
      return {mue:mue, xy:xy, dxy:dxy, xyy:xyy};
   }

	function subtract(nb, bb, rbb, mask, mue, channel)
	{
		var name = '';


		var d = "\n" + TITLE + " " + VERSION;
		d 	+= '\n';
		d 	+= "===========================";
		d 	+= '\n';
		d 	+= "NB:  " + nb.id;
		d 	+= '\n';
      if (rbb.image.isColor)
      {
         name = getNewName(nb.id, '_' + rbb.id + '_' +
                  new Array('Red', 'Green', 'Blue')[channel]);
		   d 	+= "BB:  " + rbb.id + ', channel: ' + 'RGB'[channel]; // original bb image
      }
      else
      {
         name = getNewName(nb.id, '_' + rbb.id);
         d 	+= "BB:  " + rbb.id;
      }
		d 	+= '\n';
      if (mask != null)
      {
		   d 	+= "Mask:  " + mask.id;
         d 	+= '\n';
      }
      else
   		d 	+= '\n';
		d 	+= "mue: " + mue;
		d 	+= '\n';
		d 	+= "id:  " + name;
		d 	+= '\n';

		var P = new PixelMath;
      with (P)
      {
         if (mask == null)
            expression = nb.id + " - " + bb.id + " * " + mue;
         else
            expression = '(' + nb.id + " - " + bb.id + " * " + mue + ") * ~" + mask.id;
         expression1 = "";
         expression2 = "";
         expression3 = "";
         useSingleExpression = true;
         symbols = "";
         generateOutput = true;
         singleThreaded = false;
         use64BitWorkingImage = false;
         rescale = false;
         truncate = true;
         truncateLower = 0;
         truncateUpper = 1;
         createNewImage = true;
         showNewImage = false;
         newImageId = name;
         newImageWidth = nb.image.width;
         newImageHeight = nb.image.height;
         newImageAlpha = false;
         newImageColorSpace = PixelMath.prototype.Gray;
         newImageSampleFormat = PixelMath.prototype.f32;
         setDescription(d);
   		//Console.noteln("Pixelmath............" + name + " = " + expression);
         executeOn(nb);
			var view = View.viewById(name);
       	return view;
      }
	}

   function noiseReduction(view)
   {
      // simple noise reduction with
      var P = new ATrousWaveletTransform;
      with (P)
      {
         layers = [ // enabled, biasEnabled, bias, noiseReductionEnabled, noiseReductionThreshold, noiseReductionAmount, noiseReductionIterations
            [true, true, 0.000, true, 3.000, 1.00, 1],
            [true, true, 0.000, false, 3.000, 1.00, 1],
            [true, true, 0.000, false, 3.000, 1.00, 1],
            [true, true, 0.000, false, 3.000, 1.00, 1],
            [true, true, 0.000, false, 3.000, 1.00, 1]
         ];
         scaleDelta = 0;
         scalingFunctionData = [
            0.25,0.5,0.25,
            0.5,1,0.5,
            0.25,0.5,0.25
         ];
         scalingFunctionRowFilter = [
            0.5,
            1,
            0.5
         ];
         scalingFunctionColFilter = [
            0.5,
            1,
            0.5
         ];
         scalingFunctionNoiseSigma = [
            0.8003,0.2729,0.1198,
            0.0578,0.0287,0.0143,
            0.0072,0.0036,0.0019,
            0.001
         ];
         scalingFunctionName = "Linear Interpolation (3)";
         largeScaleFunction = ATrousWaveletTransform.prototype.NoFunction;
         curveBreakPoint = 0.75;
         noiseThresholding = true;
         noiseThresholdingAmount = 1.00;
         noiseThreshold = 3.00;
         softThresholding = true;
         useMultiresolutionSupport = false;
         deringing = false;
         deringingDark = 0.1000;
         deringingBright = 0.0000;
         outputDeringingMaps = false;
         lowRange = 0.0000;
         highRange = 0.0000;
         previewMode = ATrousWaveletTransform.prototype.Disabled;
         previewLayer = 0;
         toLuminance = true;
         toChrominance = true;
         linear = false;
         executeOn(view);
         Console.writeln("Noise reduction");
      }
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

   function getMaskArray(mask)
   {
      if (mask == null) return null;
      var pixCount   = mask.image.width * mask.image.height;
      var maskPix    = [];
      mask.image.getPixels (maskPix);
      var cnt = 0;
      var threshold = mask.image.mean();
      var maskFlags	= new Int8Array(pixCount);		// mask map with 1
      for (var j = 0; j < pixCount; j++)
      {
         if (maskPix[j] > threshold)
         {
            maskFlags[j] = 0;		// skip star
            cnt += 1;
         }
         else
         {
            maskFlags[j] = 1;		// evaluate object & background
         }
      }
      maskPix = null;
      // evaluate each pixel in this mask
      // set false in each location of MM for pixels
      // falling below a threshold
      //
      Console.writeln("# of pixel rejected " + cnt + ", mask threshold " +
                      threshold.toFixed(6));
      return maskFlags;
   }

   // Helper functions

   function getNewName(name, suffix)
   {
      var newName = name + suffix;
      let n = 1;
      while (!ImageWindow.windowById(newName).isNull)
      {
         ++n;
         newName = name + suffix + n.toString();
      }
      return newName;
   }

   function copyView(view, channel)
   {
      var newName = getNewName(view.id, "_lfit");
      var P = new PixelMath;
      with (P)
      {
         expression = '$T[' + channel.toString() + ']';
         expression1 = "";
         expression2 = "";
         expression3 = "";
         useSingleExpression = true;
         symbols = "";
         generateOutput = true;
         singleThreaded = false;
         use64BitWorkingImage = false;
         rescale = false;
         rescaleLower = 0;
         rescaleUpper = 1;
         truncate = true;
         truncateLower = 0;
         truncateUpper = 1;
         createNewImage = true;
         showNewImage = false;
         newImageId = newName;
         newImageWidth = 0;
         newImageHeight = 0;
         newImageAlpha = false;
         newImageColorSpace = PixelMath.prototype.Gray;
         newImageSampleFormat = PixelMath.prototype.SameAsTarget;
         executeOn(view);
      }
      return View.viewById(newName);
   }

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

      // load image

      if (File.exists(imagePath))
      {
         try
         {
            var bm = new Bitmap(imagePath);
            var window = new ImageWindow(bm.width, bm.height, 3, 32, true, true, "CS_Plot");
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
   }

   String.prototype.replaceAll = function(search, replacement) {
       var target = this;
       return target.split(search).join(replacement);
   };

   function lstqr()
   {
      // instance variables
      var pointArray = [];
      var numOfEntries = 0;
      var a = 0;
      var b = 0;
      var c = 0;
      var det = 0;
      var x = 0;
      var xs = 0;
      var ys = 0;

      this.add = function(p)
      {
        numOfEntries += 1;
        pointArray.push(p);
      }

      this.addPoint = function(x, y)
      {
        numOfEntries += 1;
        pointArray.push([x, y]);
      }

      function aTerm()
      {
        if (numOfEntries < 3)
        {
            throw new InvalidOperationException(
               "Insufficient pairs of co-ordinates: " + numOfEntries);
        }
        //notation sjk to mean the sum of x_i^j*y_i^k.
        var s40 = getSx4(); //sum of x^4
        var s30 = getSx3(); //sum of x^3
        var s20 = getSx2(); //sum of x^2
        var s10 = getSx();  //sum of x
        var s00 = numOfEntries;  //sum of x^0 * y^0  ie 1 * number of entries

        var s21 = getSx2y(); //sum of x^2*y
        var s11 = getSxy();  //sum of x*y
        var s01 = getSy();   //sum of y

        //a = Da/D
        return (s21 * (s20 * s00 - s10 * s10) - s11
               * (s30 * s00 - s10 * s20) + s01
               * (s30 * s10 - s20 * s20))
               / (s40 * (s20 * s00 - s10 * s10) - s30
               * (s30 * s00 - s10 * s20) + s20
               * (s30 * s10 - s20 * s20));
      }

      /// <summary>
      /// returns the b term of the equation ax^2 + bx + c
      /// </summary>
      /// <returns>b term</returns>
      function bTerm()
      {
        if (numOfEntries < 3)
        {
            throw new InvalidOperationException("Insufficient pairs of co-ordinates");
        }
        //notation sjk to mean the sum of x_i^j*y_i^k.
        var s40 = getSx4(); //sum of x^4
        var s30 = getSx3(); //sum of x^3
        var s20 = getSx2(); //sum of x^2
        var s10 = getSx();  //sum of x
        var s00 = numOfEntries;  //sum of x^0 * y^0  ie 1 * number of entries

        var s21 = getSx2y(); //sum of x^2*y
        var s11 = getSxy();  //sum of x*y
        var s01 = getSy();   //sum of y

        //b = Db/D
        return (s40 * (s11 * s00 - s01 * s10) - s30
               * (s21 * s00 - s01 * s20) + s20
               * (s21 * s10 - s11 * s20))
               / (s40 * (s20 * s00 - s10 * s10) - s30
               * (s30 * s00 - s10 * s20) + s20
               * (s30 * s10 - s20 * s20));
      }

      /// <summary>
      /// returns the c term of the equation ax^2 + bx + c
      /// </summary>
      /// <returns>c term</returns>
      function cTerm()
      {
        if (numOfEntries < 3)
        {
            throw new InvalidOperationException("Insufficient pairs of co-ordinates");
        }
        //notation sjk to mean the sum of x_i^j*y_i^k.
        var s40 = getSx4(); //sum of x^4
        var s30 = getSx3(); //sum of x^3
        var s20 = getSx2(); //sum of x^2
        var s10 = getSx();  //sum of x
        var s00 = numOfEntries;  //sum of x^0 * y^0  ie 1 * number of entries

        var s21 = getSx2y(); //sum of x^2*y
        var s11 = getSxy();  //sum of x*y
        var s01 = getSy();   //sum of y

        //c = Dc/D
        return (s40 * (s20 * s01 - s10 * s11) - s30
               * (s30 * s01 - s10 * s21) + s20 * (s30 * s11 - s20 * s21))
               / (s40 * (s20 * s00 - s10 * s10) - s30
               * (s30 * s00 - s10 * s20) + s20
               * (s30 * s10 - s20 * s20));
      }

      function rSquare() // get r-squared
      {
        if (numOfEntries < 3)
        {
            throw new InvalidOperationException("Insufficient pairs of co-ordinates");
        }
        // 1 - (total sum of squares / residual sum of squares)
        return 1 - getSSerr() / getSStot();
      }


      /*helper methods*/
      function getSx() // get sum of x
      {
        var Sx = 0;
        for each (var ppair in pointArray)
        {
            Sx += ppair[0];
        }
        return Sx;
      }

      function getSy() // get sum of y
      {
        var Sy = 0;
        for each (var ppair in pointArray)
        {
            Sy += ppair[1];
        }
        return Sy;
      }

      function getSx2() // get sum of x^2
      {
        var Sx2 = 0;
        for each (var ppair in pointArray)
        {
            Sx2 += Math.pow(ppair[0], 2); // sum of x^2
        }
        return Sx2;
      }

      function getSx3() // get sum of x^3
      {
        var Sx3 = 0;
        for each (var ppair in pointArray)
        {
            Sx3 += Math.pow(ppair[0], 3); // sum of x^3
        }
        return Sx3;
      }

      function getSx4() // get sum of x^4
      {
        var Sx4 = 0;
        for each (var ppair in pointArray)
        {
            Sx4 += Math.pow(ppair[0], 4); // sum of x^4
        }
        return Sx4;
      }

      function getSxy() // get sum of x*y
      {
        var Sxy = 0;
        for each (var ppair in pointArray)
        {
            Sxy += ppair[0] * ppair[1]; // sum of x*y
        }
        return Sxy;
      }

      function getSx2y() // get sum of x^2*y
      {
        var Sx2y = 0;
        for each (var ppair in pointArray)
        {
            Sx2y += Math.pow(ppair[0], 2) * ppair[1]; // sum of x^2*y
        }
        return Sx2y;
      }

      function getYMean() // mean value of y
      {
        var y_tot = 0;
        for each (var ppair in pointArray)
        {
            y_tot += ppair[1];
        }
        return y_tot / numOfEntries;
      }

      function getSStot() // total sum of squares
      {
        //the sum of the squares of the differences between
        //the measured y values and the mean y value
        var ss_tot = 0;
        for each (var ppair in pointArray)
        {
            ss_tot += Math.pow(ppair[1] - getYMean(), 2);
        }
        return ss_tot;
      }

      function getSSerr() // residual sum of squares
      {
        //the sum of the squares of te difference between
        //the measured y values and the values of y predicted by the equation
        var ss_err = 0;
        for each (var ppair in pointArray)
        {
            ss_err += Math.pow(ppair[1] - getPredictedY(ppair[0]), 2);
        }
        return ss_err;
      }

      function getPredictedY(x)
      {
        //returns value of y predicted by the equation for a given value of x
        return aTerm() * Math.Pow(x, 2) + bTerm() * x + cTerm();
      }

      this.solve = function()
      {
         a = aTerm();
         b = bTerm();
         c = cTerm();
         det = b * b - 4 * a * c;
         if (det < 0.0)
         {
            x = -b / (2 * a);
         }
         else if (det > 0.0)
         {
            var x1 = (-b + Math.sqrt(det)) / (2 * a);
            var x2 = (-b - Math.sqrt(det)) / (2 * a);
            x = (x1 + x2) / 2.0;
         }
         else
         {
            x = (-b + System.Math.sqrt(det)) / (2 * a);
         }

         xs = -b / ( 2 * a);
         ys = (4.0 * a * c - b * b) / (4 * a);
      }

      this.A = function()
      {
         return a;
      }

      this.B = function()
      {
         return b;
      }

      this.C = function()
      {
         return c;
      }

      this.Det = function()
      {
         return det;
      }

      this.X = function()
      {
         return x;
      }

      this.Y = function (x) // get Y(x)
      {
        return a * x * x + b * x + c;
      }

      this.XS = function()
      {
         return xs;
      }

      this.YS = function()
      {
         return ys;
      }

      this.N = function()
      {
         return numOfEntries;
      }
   }
   // ========================================================================
   //      STF Auto Stretch routine
   // ========================================================================
   //
   function ApplyAutoSTF( view, shadowsClipping, targetBackground )
   {
      var stf = new ScreenTransferFunction;

      var median  = view.computeOrFetchProperty( "Median" );
      var mad     = view.computeOrFetchProperty( "MAD" );
      mad.mul( 1.4826 ); // coherent with a normal distribution
      /*
       * Noninverted image
       */
      var c0 = 0, m = 0;
      if ( 1 + mad.at( 0 ) != 1 )
         c0 += median.at( 0 ) + shadowsClipping * mad.at( 0 );
      m  += median.at( 0 );
      c0 = Math.range( c0, 0.0, 1.0 );
      m = Math.mtf( targetBackground, m - c0 );

      stf.STF = [ // c0, c1, m, r0, r1
                  [c0, 1, m, 0, 1],
                  [c0, 1, m, 0, 1],
                  [c0, 1, m, 0, 1],
                  [0, 1, 0.5, 0, 1] ];

      stf.executeOn( view );
   }
}
//
// +++ End of object ContinuumSubtraction() +++

function infoDialog()
{
   this.__base__ = Dialog;
   this.__base__();

   var dlg = this;

   this.helpLabel = new Label( this );
   with ( this.helpLabel )
   {
      frameStyle = FrameStyle_Box;
      margin = 4;
      wordWrapping = true;
      useRichText = true;

      text = "<p><b>" + SCRIPTNAME + " - " + TITLE + " v" + VERSION + "</b></p>" +
      "<p><b>Purpose</p>" +
      "<p>Subtract a fraction of broadband image from a narrowband image.</>" +
      "<p>This frees the unwanted radiation from an emission line object image " +
      "and creates a new image, which can be added to the broadband channel.</p>" +
      "<p>Using this script, one can add more then one emission to a broadband (i.e: Ha, SII to R)." +
      " Simply repeat this script for each narrowband and add the result(s) to the calibrated RGB channel(s)</p>" +
      "<p><b>Usage:</b></p>" +
      "<p>1. add the views of the narrowband image and the broadband image</>" +
      "<p>2. (opt.) add the view of a starmask</>" +
      "<p>3. press 'Execute Subtraction' and wait for the result</><br>" +
      "<p>4. add the new image (emission_narrowbandId) to the broadband with PixelMath and apply a factor (start with 1)</>" +
      "<p>I.e.:</p>" +
      "<p>$T + emission_M1_Halpha * f</p>" +
      "<p>play with f</p>" +
      "<br>" +
      "<p>This script implements my method of continuum subtraction.</p>" +
      "<br>" +
      "<p><b>mailto:hvb356@hotmail.de</p>";
   }

   this.btnOK = new PushButton(this);
   with (this.btnOK)
   {
      icon = this.scaledResource(":/icons/ok.png");
      text = "OK";
      onPress = function() parent.done(0);
   }

   var buttonsSizer = new HorizontalSizer();
   buttonsSizer.margin = 4;
   buttonsSizer.addStretch();
   buttonsSizer.add(this.btnOK);

   this.sizer = new VerticalSizer(this);
   this.sizer.add (this.helpLabel);
   this.sizer.addSpacing(12);
   this.sizer.add(buttonsSizer);

   this.setScaledMinSize(600, 400);

   this.windowTitle = SCRIPTNAME + " - Info";

//	this.adjustToContents();
// 	this.userResizable = true;
   processEvents();
   this.bringToFront();
}

function showDialog()
{
   // Add all properties and methods of the core Dialog object to this object.
   this.__base__ = Dialog;
   this.__base__();

   data.dialog = this;

   var dlg 					= this;

   var labelWidth1 = this.font.width( "Contrast Limit:" );

   // ------------------------------------------------------------------------
   // GUI
   // ------------------------------------------------------------------------
   this.lblHeadLine = new Label(this)
   with (this.lblHeadLine)
   {
      useRichText = true;
      text ="<b>Subtract continuum radiation from narrowband image</b>";
   }

   // my ©
   this.lblCopyright = new Label(this)
   this.lblCopyright.text      = "© 2016, Hartmut V. Bornemann / 2022, Thorsten Glebe";

   this.iconInfo = new ToolButton(this);
   with (this.iconInfo)
   {
      icon = this.scaledResource(":/icons/info.png");

      onClick = function(checked )
      {
         var dialog = new infoDialog();
	      dialog.execute();
         processEvents();
         dlg.bringToFront();
      }
   }

   var infoSizer = new HorizontalSizer();
   infoSizer.margin = 4;
   infoSizer.add(this.lblCopyright);
   infoSizer.addStretch();
   infoSizer.add(this.iconInfo);

   // new instance button
   this.newInstance_Button = new ToolButton(this);
   with( this.newInstance_Button )
   {
      icon = new Bitmap( ":/process-interface/new-instance.png" );
      toolTip = "New Instance";
      onMousePress = function()
      {
         this.hasFocus = true;
         data.exportParameters();
         this.pushed = false;
         this.dialog.newInstance();
      }
   }

   this.newInstanceSizer = new HorizontalSizer;
   with ( this.newInstanceSizer )
   {
		margin = 4;
      add( this.newInstance_Button );
      addStretch();
   }

   // execute button
   this.execButton = new PushButton( this );
   with ( this.execButton )
   {
      icon = this.scaledResource(":/icons/ok.png");
      text = "Execute Subtraction";
      enabled = data.enabled;

      onPress = function()
      {
         Console.show();
         var t0 = new Date;

         dlg.execButton.enabled = false;
         dlg.lblTick.text = "Prep";

         var cs     = new ContinuumSubtraction(dlg);
         cs.nb      = data.nb;
         cs.bb      = data.bb;
         cs.mask    = data.mask;
         cs.denoise = data.noisecheck;
         cs.plot    = data.plotcheck;
         if (!cs.execute(callback)) return;

         if (data.cancel) return;

         View.viewById( cs.csImage.id ).window.show();

         // reset progress indicator
         data.dialog.lblTick.text = "Ready";
         data.dialog.delay.start();

         var t1 = new Date;
         Console.writeln(format("<end><cbr>doWork: %.2f s", (t1.getTime() - t0.getTime())/1000));
      }
   }

	this.cancelButton = new PushButton( this );
	with (this.cancelButton)
	{
      icon = this.scaledResource(":/icons/cancel.png");
		text = "Cancel";
      onPress = function()
      {
         data.cancel = true;
			dlg.cursor = new Cursor(StdCursor_Arrow);
         dlg.done(0);
		}
	}

	this.lblTick = new Label(this);
	with (this.lblTick)
	{
      frameStyle = FrameStyle_Box;
		textAlignment = TextAlign_Right|TextAlign_VertCenter;
      var w = this.font.width( 'MLinearFit' );
      setFixedWidth( w );
   }


   this.buttonSizer = new HorizontalSizer;
   with ( this.buttonSizer )
   {
		margin = 4;
		add( this.cancelButton );
		addSpacing(16);
		add( this.lblTick );
		addSpacing(16);
		addStretch();
      add( this.execButton );
   }

   // ------------------------------------------------------------------------
   //
   // NB view selection
   //
   // ------------------------------------------------------------------------
   this.nbLabel = new Label( this );
   with ( this.nbLabel ) {
      text = "Narrowband image:";
   }

   this.nbViews = new ViewList(this);
   with ( this.nbViews )
   {
      getMainViews();
      excludeViews(dlg.nbViews);
      if(data.nb)
      {
         currentView = data.nb;
      }

      toolTip = "<p>Select the narrowband image.</p>";

      onViewSelected = function( view )
      {
			if (view.id == "")
			{
				data.nb = null;
            data.nb_id = "";
				dlg.execButton.enabled = false;
			}
         else
         {
            if (view.image.isGrayscale)
            {
   				data.nb 		= view;
               data.nb_id  = view.id;
               dlg.execButton.enabled = data.bb != null;
            }
            else
            {
   				dlg.execButton.enabled = false;
            }
         }
         data.enabled = dlg.execButton.enabled;
      }
   }

   this.nbImageSizer = new HorizontalSizer;
   with ( this.nbImageSizer )
   {
		addStretch();
      add( this.nbLabel );
      spacing = 8;
      add( this.nbViews );
   }

   // ------------------------------------------------------------------------
   //
   // BB view selection
   //
   // ------------------------------------------------------------------------
   this.bbLabel = new Label( this );
   with ( this.bbLabel ) {
      text = "Broadband image:";
   }

   this.bbViews = new ViewList(this);
   with ( this.bbViews )
   {
      getMainViews();
      //excludeViews(dlg.bbViews);
      if(data.bb)
      {
         currentView = data.bb;
      }

      toolTip = "<p>Select the broadband image which " + "will be subtracted from the narrowband image.</p>";

      onViewSelected = function( view )
      {
			if (view.id == "")
			{
				data.bb = null;
            data.bb_id = "";
				dlg.execButton.enabled = false;
			}
         else
         {
            data.bb 		= view;
            data.bb_id  = view.id;
            dlg.execButton.enabled = data.nb != null;
            dlg.rbR.enabled = data.bb.image.isColor;
            dlg.rbG.enabled = data.bb.image.isColor;
            dlg.rbB.enabled = data.bb.image.isColor;
         }
         data.enabled = dlg.execButton.enabled;
      }
   }

   this.bbImageSizer = new HorizontalSizer;
   with ( this.bbImageSizer )
   {
		addStretch();
      add( this.bbLabel );
      spacing = 8;
      add( this.bbViews );
   }

   this.lblChannel = new Label(this);
   this.lblChannel.text = 'Channel:';

   this.rbR = new RadioButton(this);
   with( this.rbR )
   {
      checked = data.channel == 0;
      enabled = false;
      text    = 'R';
      onCheck = function( checked ){ if (checked) data.channel = 0};
   }


   this.rbG = new RadioButton(this);
   with( this.rbG )
   {
      checked = data.channel == 1;
      text    = 'G';
      enabled = false;
      onCheck = function( checked ){ if (checked) data.channel = 1};
   }


   this.rbB = new RadioButton(this);
   with( this.rbB )
   {
      checked = data.channel == 2;
      enabled = false;
      text    = 'B';
      onCheck = function( checked ){ if (checked) data.channel = 2};
   }


   this.bbChannelSizer = new HorizontalSizer;
   with ( this.bbChannelSizer )
   {
		addStretch();
      addStretch();;
      add( this.lblChannel );
      spacing = 8;
      add( this.rbR );
      spacing = 8;
      add( this.rbG );
      spacing = 8;
      add( this.rbB );
   }


   // ------------------------------------------------------------------------
   //
   // Starmask view selection
   //
   // ------------------------------------------------------------------------
   this.smLabel = new Label( this );
   with ( this.smLabel )
   {
      text = "Starmask image:";
   }

   this.smViews = new ViewList(this);
   with ( this.smViews )
   {
      getMainViews();
      excludeViews(dlg.smViews);
      if(data.mask)
      {
         currentView = data.mask;
      }

      toolTip = "<p>Select the starmask image to excludes stars in evaluation process.</p>";

      onViewSelected = function( view )
      {
			if (view.id == "")
			{
				data.mask = null;
            data.mask_id = "";
				return;
			}
         if (view.image.isGrayscale)
         {
            data.mask    = view;
            data.mask_id = view.id;
         }
      }
   }

   this.smImageSizer = new HorizontalSizer;
   with ( this.smImageSizer )
   {
		addStretch();
      add( this.smLabel );
      spacing = 8;
      add( this.smViews );
   }

   this.numlimit = new NumericControl(this);
   with (this.numlimit)
   {
      setPrecision(0);
      setRange(50, 99);
      setValue(data.limit);

      onValueUpdated = function(value) { data.limit = value; }
      label.text = "Evaluate to blackness level [%]:";
   }

   this.limitImageSizer = new HorizontalSizer;
   with ( this.limitImageSizer )
   {
		addStretch();
      add( this.numlimit );
   }


   this.parmsGroupBox = new GroupBox( this );
   with (this.parmsGroupBox)
   {
      sizer = new VerticalSizer;
      sizer.margin = 6;
		sizer.add( this.nbImageSizer );
      sizer.spacing = 12;
      sizer.add( this.bbImageSizer );
      sizer.spacing = 4;
      sizer.add( this.bbChannelSizer);
      sizer.spacing = 12;
      sizer.add( this.smImageSizer );
      sizer.spacing = 12;
      sizer.add( this.limitImageSizer);
      title = "Views";
   }

   this.noiseCheck = new CheckBox(this);
   with (this.noiseCheck)
   {
      checked = data.noisecheck;
      text = "Noise reduction after subtraction";
      onCheck = function( checked ){ data.noisecheck = checked };
   }

   this.plotCheck = new CheckBox(this);
   with (this.plotCheck)
   {
      checked = data.plotcheck;
      text = "Plot curves";
      onCheck = function( checked ){ data.plotcheck = checked };
   }

   // ------------------------------------------------------------------------
   this.input_GroupBox = new GroupBox( this );
   with ( this.input_GroupBox )
   {
      title = "";
      sizer = new VerticalSizer;
   }

   with ( this.input_GroupBox.sizer )
   {
      margin = 6;
      addSpacing (4);
      add( this.parmsGroupBox );
      addSpacing (8);
      add( this.noiseCheck );
      addSpacing (8);
      add( this.plotCheck);
      addSpacing (8);
      add( this.buttonSizer );
   }

   // ------------------------------------------------------------------------
   // finally arrange all sizing elements and ajust the dialog frame
   // ------------------------------------------------------------------------
   this.sizer = new VerticalSizer(this);
   with( this.sizer )
   {
      margin = 6;
      spacing = 6;
      add( this.lblHeadLine );
      add( infoSizer );
      add( this.input_GroupBox );
      add( this.newInstanceSizer );
   }
   this.windowTitle = SCRIPTNAME + " " + VERSION;

//   this.adjustToContents();
//   this.userResizable = false;

   var labelWidth = this.cancelButton.frameRect.width * 0.75;
   this.lblTick.text = "Idle";

 	this.refreshTick = 0;

	this.delay = new Timer;
	with (this.delay)
	{
		interval = 2;
		singleShot = true;
		onTimeout = function()
		{
			dlg.cursor = new Cursor(StdCursor_Arrow);
         dlg.done(0);
		}
	}

   function callback(progress)
   {
      dlg.lblTick.text = (progress * 100).toFixed(2) + '%';
      processEvents();
   }
}


function linearFit(referenceView, imageToFit)
{
   var P = new LinearFit;
   P.referenceViewId = referenceView.id;
   P.rejectLow = 0.000000;
   P.rejectHigh = 0.920000;
   P.executeOn(imageToFit);
}


function solveQ (a, b, c)
{
	// a quadratic term
	// b linear
	// c const
	var x1 = (-b - Math.sqrt(b*b - 4*a*c)) / (2*a);
	var x2 = (-b + Math.sqrt(b*b - 4*a*c)) / (2*a);
	return  [x1, x2];
}

// ========================================================================
//   Polynomials functions
// ========================================================================

function Polynomials(points, degree)
{
   // find polynomials
   // input points [0..n.1] x and y
   // try degree
   var d = degree;
   var coeff = [];
   while (d > 0)
   {
      coeff = FindPolynomialLeastSquaresFit(points, d);
      var cnt = 0;
      for (var i = 0; i < coeff.length; i++)
      {
         if (isValid(coeff[i])) cnt +=1;   // count valid coefficients
      }
      if (coeff.length == cnt) break;
      d -=1;
   }
   return coeff;
}

function yValue(x, A)
{
   var y = 0;
   for (var j = 0; j < A.length; j++)
   {
      y += A[j] * Math.pow(x, j);
   }
   return y;
}

// Find the least squares linear fit.
function  FindPolynomialLeastSquaresFit( points,  degree)
{
   // input points []
   // Allocate space for (degree + 1) equations with
   // (degree + 2) terms each (including the constant term).
  // var coeffs = new double[degree + 1][degree + 2];
   var rows = degree + 1;
   var cols = degree + 2;
   var coeffs = new Matrix(rows, cols);

   // Calculate the coefficients for the equations.
   for (var j = 0; j <= degree; j++)
   {
      // Calculate the constant term for this equation.
      coeffs.at(j, degree + 1, 0);
      for (var i = 0; i < points.length; i++)
      {
         var a = coeffs.at(j, degree + 1);
         a -= Math.pow(points[i].x, j) * points[i].y;  // Y
         coeffs.at(j, degree + 1, a);
      }

      // Calculate the other coefficients.
      for (var a_sub = 0; a_sub <= degree; a_sub++)
      {
         // Calculate the dth coefficient.
         //coeffs[j][a_sub] = 0;
         coeffs.at(j, a_sub, 0);
         for (var i = 0; i < points.length; i++)
         {
            //coeffs[j][a_sub] -= Math.pow(pt.X, a_sub + j);
            var a = coeffs.at(j, a_sub);
            a -= Math.pow(points[i].x, a_sub + j);
            coeffs.at(j, a_sub, a);
         }
      }
   }

   // Solve the equations.
    var answer = Solve(coeffs);

   // Return the result converted into a List<double>.
   return answer;
}
// Computes the solution of a linear equation system.
// @param M
// The system of linear equations as an augmented matrix[row, col] where (rows + 1 == cols).
// It will contain the solution in "row canonical form" if the function returns "true".

// @return Returns whether the matrix has a unique solution or not.

function Solve( M )
{
   // input checks
   if (M == null) throw ("Coefficient matrix is empty");
   if (M.cols != M.rows + 1)
   {
      throw new RuntimeException("The algorithm must be provided with a (n x n+1) matrix.");
   }
   var rowCount = M.rows;
   if (rowCount < 1)
   {
      throw new RuntimeException("The matrix must at least have one row.");
   }

   // pivoting
   for (var col = 0; col + 1 < rowCount; col++)
   {
      if (M.at(col, col) == 0)
      {
      // check for zero coefficients
         // find non-zero coefficient
         var swapRow = col + 1;
         for (; swapRow < rowCount; swapRow++)
         {
            if (M.at(swapRow, col) != 0)
            {
               break;
            }
         }

         if (M.at(swapRow, col) != 0) // found a non-zero coefficient?
         {
            // yes, then swap it with the above
            var tmp = new Array(rowCount + 1);
            for (var i = 0; i < rowCount + 1; i++)
            {
               tmp[i] = M.at(swapRow, i);
               M.at(swapRow, i, M.at(col, i));
               M.at(col, i, tmp[i]);
            }
         }
         else
         {
            return false; // no, then the matrix has no unique solution
         }
      }
   }

   // elimination
   for (var sourceRow = 0; sourceRow + 1 < rowCount; sourceRow++)
   {
      for (var destRow = sourceRow + 1; destRow < rowCount; destRow++)
      {
         var df = M.at(sourceRow, sourceRow);
         var sf = M.at(destRow, sourceRow);
         for (var i = 0; i < rowCount + 1; i++)
         {
            M.at(destRow, i, M.at(destRow, i) * df - M.at(sourceRow, i) * sf);
         }
      }
   }

   // back-insertion
   for (var row = rowCount - 1; row >= 0; row--)
   {
      var f = M.at(row, row);
      if (f == 0)
      {
         return false;
      }

      for (var i = 0; i < rowCount + 1; i++)
      {
         var a = M.at(row, i);
         a /= f;
         M.at(row, i, a);
      }
      for (var destRow = 0; destRow < row; destRow++)
      {
         var a = M.at(destRow, rowCount);
         a -= M.at(destRow, row) * M.at(row, rowCount);
         M.at(destRow, rowCount, a);
         M.at(destRow, row, 0);
      }
   }

   for (var r = 0; r < M.rows; r++)
   {
      for (var c = 0; c < M.cols; c++)
      {
        // Console.writeln("M " + r + '\t' + c  + '\t' + M.at(r, c));
      }
   }
   // collect A1, A2, ..
   var coeff = [];
   for (var i = 0; i < rowCount; i++)
   {
      coeff.push(M.at(i, M.cols-1));
   }
   return coeff;
}


function differentiate(v)
{
   var xy  = new Array(v.length - 1);
   for (var j = 1; j < v.length; j++)
   {
      var p = v[j];
      var x = v[j][0];
      var y = (v[j][1] - v[j-1][1]) / (v[j][0] - v[j-1][0]);
      xy[j - 1] = [x, y];// new Array(x, y)
      //Console.writeln(x + '\t' + y);
   }
   return xy;
}


function isValid(v)
{
   if (!isFinite(v)) return false;
   if (isNaN(v))     return false;
   return true;
}

// The function.
function poly(coeffs, x)
{
    var total = 0;
    var x_factor = 1;
    for (var i = 0; i < coeffs.length; i++)
    {
        total += x_factor * coeffs[i];
        x_factor *= x;
    }
    return total;
}
// ========================================================================
//   End Polynomials functions
// ========================================================================

function getKeyString(window, keyName)
{
   //
   // search key keyName
   //
   for (var i in window.keywords)
   {
      with (window.keywords[i])
      {
         if (name == keyName)
         {
            var s = strippedValue;
            return s;
         }
      }
   }
   return null;
}

function excludeViews(vList)
{
   var all = getAllMainViews();

   for (var i in all)
   {
      var v = all[i];
      if (v.image.isColor)
      {
         vList.remove(v);
         continue;
      }
      var t = getKeyString(v.window, "EMISSION");
      if (t == 'T')
      {
         vList.remove(v);
         continue;
      }
   }
}

showDialog.prototype = new Dialog;
infoDialog.prototype = new Dialog;

//////////////////////////////////////////////////////////////////////////////
//
// Main script entry point
//
function main()
{
	Console.show();
   if (Parameters.isGlobalTarget || Parameters.isViewTarget)
   {
      data.importParameters();
   }

   Console.abortEnabled = true;
	var dialog = new showDialog();
   dialog.execute();
}

main();
