#engine v8
// V8 migration (2026-10-19); requires PixInsight 1.9.5 or later.
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
   CSTG.js v2.2.0

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


CoreApplication.ensureMinimumVersion(1, 9, 5);

#include "lib/TGCompactUI.js"

#define TITLE "Continuum Subtraction"
#define SCRIPTNAME "CSTG"
#define VERSION "2.2.0"

// original step size
//#define DEFAULT_STEP_SIZE 0.00025

// new step size, faster execution, slightly less accurate mu
#define DEFAULT_STEP_SIZE 0.001


// 2.2.0: Compact open-first interface, repeatable Apply, PiDoc help and safe cleanup.
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

   this.execute=function(callback)
   {
      var fitted=null,success=false,plotWindow=null;
      if(!TG_valid(this.nb)||!TG_valid(this.bb))throw Error('Narrowband and broadband inputs are required.');

      try {
         if(!TG_valid(this.nb)||!TG_valid(this.bb))throw Error('Narrowband and broadband inputs are required.');
         fitted=TG_copyImage(this.bb.image,this.bb.id+'_lfit',undefined,data.channel).mainView;
         var nbPixels=TG_samples(this.nb),bbPixels=TG_samples(fitted),n=nbPixels.length,nbMean=0,bbMean=0;
         for(var i=0;i<n;++i){if(!isFinite(nbPixels[i])||!isFinite(bbPixels[i]))throw Error('Input images contain non-finite samples.');nbMean+=nbPixels[i];bbMean+=bbPixels[i];}
         if(nbMean<=0||bbMean<=0)throw Error('Continuum estimation requires positive mean intensities in both inputs.');
         var p=new PixelMath;p.expression='$T*'+(nbMean/bbMean);p.useSingleExpression=true;p.rescale=false;p.truncate=true;p.createNewImage=false;TG_checked(p,fitted);
         bbPixels=TG_samples(fitted);
         var flags=this.mask?getMaskArray(this.mask):new Int8Array(n).fill(1),attainable=0,active=0;
         for(var i=0;i<n;++i){if(flags[i])++active;if(!flags[i]||nbPixels[i]<=0||bbPixels[i]>0)++attainable;}
         if(active<16)throw Error('Too few pixels remain for continuum estimation.');
         if(attainable<data.limit/100*n)throw Error('The requested blackness cannot be reached: too many broadband samples are zero.');
         var nbMedian=this.nb.computeOrFetchProperty('Median').at(0),bbMedian=fitted.computeOrFetchProperty('Median').at(0);
         var initial=Math.max(nbMedian,bbMedian)>0?Math.min(nbMedian,bbMedian)/Math.max(nbMedian,bbMedian)*.5:0;
         var curves=new mueCurves(nbPixels,bbPixels,flags,initial,DEFAULT_STEP_SIZE,callback,data.limit/100*n,null);
         if(data.cancel)return false;this.mue=curves.mue;
         if(!isFinite(this.mue)||this.mue<=0||!curves.xyy||curves.xyy.length<2)throw Error('No reliable continuum solution. Check registration, matching linear backgrounds and the star mask, or increase the blackness limit.');
         Console.noteln('Continuum scale μ = '+this.mue.toFixed(8)+' after broadband mean matching.');
         this.csImage=subtract(this.nb,fitted,this.bb,null,this.mue,data.channel);
         if(this.denoise)noiseReduction(this.csImage);
         this.csImage.setPropertyValue('CS:js','T');ApplyAutoSTF(this.csImage,-2.8,.25);
         var keywords=this.nb.window.keywords.filter(k=>k.name!='EMISSION');keywords.push(new FITSKeyword('EMISSION','T','Continuum-subtracted narrowband image'));this.csImage.window.keywords=keywords;
         if(this.plot)plotWindow=plotter(curves.xyy,this.mue,this.nb.id,this.bb.id,this.csImage.id,this.mask?this.mask.id:'');
         if(data.cancel)return false;success=true;return true;
      } finally {if(TG_valid(fitted))TG_close(fitted.window);if(!success){if(TG_valid(this.csImage))TG_close(this.csImage.window);this.csImage=null;TG_close(plotWindow);}}
   };

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
			if(++ii>10000)throw Error('Continuum search exceeded its range. Check the input backgrounds or use a star mask.');							// 0..

         CoreApplication.processEvents();
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
      if(xy.length<12)return {mue:-1};
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
      //var csv = new File(fXY, FileMode.Create);
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

      if(ms<=0||im<0||points.length<4)return {mue:-1};
      var coeff = Polynomials(points, 3);
      if(!coeff||coeff.length<4||!coeff.every(isFinite))return {mue:-1}; // Polynomials(points, 4);

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


      if(!isFinite(mue)||mue<xy[0].x||mue>xy[xy.length-1].x)return {mue:-1};
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
         newImageColorSpace = PixelMath.Gray;
         newImageSampleFormat = PixelMath.f32;
         setDescription(d);
   		//Console.noteln("Pixelmath............" + name + " = " + expression);
         TG_checked(P,bb);
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
         largeScaleFunction = ATrousWaveletTransform.NoFunction;
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
         previewMode = ATrousWaveletTransform.Disabled;
         previewLayer = 0;
         toLuminance = true;
         toChrominance = true;
         linear = false;
         TG_checked(P,view);
         Console.writeln("Noise reduction");
      }
   }

   function getMaskArray(mask)
   {
      if (mask == null) return null;
      var pixCount   = mask.image.width * mask.image.height;
      var maskPix = TG_samples(mask);
      var cnt = 0;
      var threshold = mask.computeOrFetchProperty('Mean').at(0);
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
      while (!(ImageWindow.windowById(newName)?.isNull ?? true))
      {
         ++n;
         newName = name + suffix + n.toString();
      }
      return newName;
   }

   function plotter(curves,mu,nb,bb,result,mask)
   {
      var x0=curves[0].x,x1=curves[curves.length-1].x;
      if(x1<=x0)throw Error('Invalid diagnostic curve range.');
      var bitmap=new Bitmap(720,440);bitmap.fill(0xfff9fafb);var g=new Graphics(bitmap);
      function px(x){return 65+620*(x-x0)/(x1-x0);}
      function py(y){return 370-300*Math.max(0,Math.min(1,y));}
      try {
         g.font=new Font('Helvetica',11);g.pen=new Pen(0xff222222);g.drawText(20,25,'CSTG · '+nb+' / '+bb);g.drawText(20,48,'Continuum scale μ = '+mu.toFixed(5)+'  ·  '+(mask?'Mask: '+mask:'No star mask'));
         for(var i=0;i<=5;++i){var y=py(i/5);g.pen=new Pen(0xffdddddd);g.drawLine(65,y,685,y);g.pen=new Pen(0xff444444);g.drawText(15,y+4,(i/5).toFixed(1));}
         g.drawLine(65,70,65,370);g.drawLine(65,370,685,370);
         for(var i=0;i<=4;++i){var x=x0+(x1-x0)*i/4;g.drawText(px(x)-15,390,x.toFixed(2));}
         for(var i=1;i<curves.length;++i){var a=curves[i-1],b=curves[i];g.pen=new Pen(0xff2563eb,2);g.drawLine(px(a.x),py(a.y),px(b.x),py(b.y));g.pen=new Pen(0xffd97706,2);g.drawLine(px(a.x),py(a.slope),px(b.x),py(b.slope));}
         g.pen=new Pen(0xff202020);g.drawLine(px(mu),70,px(mu),370);g.drawText(310,412,'Continuum scale μ');g.pen=new Pen(0xff2563eb);g.drawText(65,432,'Black-pixel fraction');g.pen=new Pen(0xffd97706);g.drawText(280,432,'Normalized derivative');
      } finally {g.end();}
      var w=new ImageWindow(bitmap.width,bitmap.height,3,8,false,true,TG_unique('CSTG_curves'));
      try{w.mainView.beginProcess(UndoFlag.NoSwapFile);try{w.mainView.image.blend(bitmap);}finally{w.mainView.endProcess();}w.show();return w;}catch(e){TG_close(w);throw e;}
   }

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

      TG_checked(stf,view);
   }
}
//
// +++ End of object ContinuumSubtraction() +++

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
      if(!coeff){--d;continue;}
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
      throw new Error("The algorithm must be provided with a (n x n+1) matrix.");
   }
   var rowCount = M.rows;
   if (rowCount < 1)
   {
      throw new Error("The matrix must at least have one row.");
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

         if (swapRow < rowCount && M.at(swapRow, col) != 0) // found a non-zero coefficient?
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

const CS_FILE=#__FILE__;
function CSData()
{
   this.nb=null;this.bb=null;this.mask=null;this.cancel=false;
   TG_settings(this,{channel:[0,0,2,true],limit:[90,50,99,true]},{noisecheck:false,plotcheck:true},{},{nb_id:'nb',bb_id:'bb',mask_id:'mask'});
   var save=this.exportParameters;
   this.exportParameters=function(){save();if(TG_valid(this.bb))Parameters.set('bb_id',this.bb.id);if(TG_valid(this.mask))Parameters.set('mask_id',this.mask.id);};
}
var data=new CSData;
function CS_validate()
{
   if(!TG_valid(data.nb)||!data.nb.isMainView||data.nb.image.isColor)throw Error('Select a grayscale narrowband main image.');
   if(!TG_valid(data.bb)||!data.bb.isMainView)throw Error('Select the registered broadband main image.');
   for(var v of [data.bb,data.mask])if(TG_valid(v)){
      if(v.fullId==data.nb.fullId)throw Error('The narrowband, broadband and mask inputs must be different images.');
      if(v.image.width!=data.nb.image.width||v.image.height!=data.nb.image.height)throw Error('All inputs must have identical pixel dimensions and be registered.');
   }
   if(TG_valid(data.mask)&&(data.mask.image.isColor||data.mask.fullId==data.bb.fullId))throw Error('Select a separate grayscale star mask.');
   if(!data.bb.image.isColor)data.channel=0;
}
function CS_run(progress)
{
   CS_validate();var cs=new ContinuumSubtraction;cs.nb=data.nb;cs.bb=data.bb;cs.mask=TG_valid(data.mask)?data.mask:null;cs.plot=data.plotcheck;cs.denoise=data.noisecheck;
   if(!cs.execute(progress||function(){}))return null;cs.csImage.window.show();return cs.csImage.window;
}
var CS_Dialog=class extends Dialog
{
   constructor(){
      super();TG_setup(this,'CSTG',VERSION,'Subtract broadband continuum from a narrowband image.');
      this.nb=TG_picker(this,'Narrowband · grayscale','nb',v=>!v.image.isColor);this.addGroup(this.nb);
      this.bb=TG_picker(this,'Broadband · registered to narrowband','bb',v=>true);this.addGroup(this.bb);
      this.channel=TG_combo(this.bb,'Channel:',['Red','Green','Blue'],data.channel,v=>data.channel=v);
      this.mask=TG_picker(this,'Star mask · optional grayscale','mask',v=>!v.image.isColor);this.addGroup(this.mask);
      var fit=TG_group(this,'Continuum estimate');this.addGroup(fit);
      this.limit=TG_number(fit,'Blackness (%):',50,99,0,data.limit,v=>data.limit=Math.round(v));
      this.limit.toolTip='Stop sampling the black-pixel curve at this percentage. Raise it if the derivative peak is too close to the sampled edge.';
      this.noise=TG_check(fit,'Reduce small-scale noise in the result',data.noisecheck,v=>data.noisecheck=v);
      this.plot=TG_check(fit,'Create a diagnostic curve plot',data.plotcheck,v=>data.plotcheck=v);
      fit.sizer.add(TG_label(fit,'Use aligned, linear input images. The star mask excludes bright pixels from estimation only.'));
      TG_finish(this,CS_FILE,'CSTG',()=>CS_run(p=>{this.status.text='Estimating continuum: '+(p*100).toFixed(1)+'% black pixels.\nUse Close to cancel.';}),()=>{data.reset();this.limit.setValue(data.limit);this.channel.currentItem=data.channel;this.noise.checked=data.noisecheck;this.plot.checked=data.plotcheck;this.refresh();});
      this.instance.toolTip='Drag to save settings and broadband/star-mask references. The receiving image becomes the narrowband input.';
   }
   refresh(status){this.nb.refresh();this.bb.refresh();this.mask.refresh();if(this.channel){this.channel.enabled=TG_valid(data.bb)&&data.bb.image.isColor;if(!this.channel.enabled){data.channel=0;this.channel.currentItem=0;}}if(this.apply)this.apply.enabled=TG_valid(data.nb)&&TG_valid(data.bb);if(this.status&&status!==false)this.status.text='Apply creates an emission image; inputs stay unchanged.\nNew Instance retains broadband and mask references.';}
};
#ifndef TG_TEST
TG_main(CS_Dialog,'nb',v=>!v.image.isColor,()=>CS_run());
#endif
