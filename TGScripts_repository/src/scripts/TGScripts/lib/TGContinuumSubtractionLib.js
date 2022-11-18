/*
   TGContinuumSubtractionLib v1.0

   A javascript library containing methods for Continuum Subtraction, written by Hartmut V. Bornemann.

   Copyright (C)  Copyright Hartmut V. Bornemann, 2017, 2018 / 2022 Dr. Thorsten Glebe

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

#include <pjsr/DataType.jsh>
#include <pjsr/UndoFlag.jsh>

#define TITLE "Emission Line Integration"
#define VERSION "2.1.0"

// new step size, faster execution, slightly less accurate mu
#define DEFAULT_STEP_SIZE 0.001

#define TEMPVIEW "ELI_View_"
#define PLOTVIEW "ELI_Plot"
#define DISPOSE  "dispose"

// Shadows clipping point in (normalized) MAD units from the median.
#define DEFAULT_AUTOSTRETCH_SCLIP  -2.80
// Target mean background in the [0,1] range.
#define DEFAULT_AUTOSTRETCH_TBGND   0.25
#define DEFAULT_AUTOSTRETCH_CLINK   true

// ----------------------------------------------------------------------------
// copyViewChannel
// ----------------------------------------------------------------------------
function copyViewChannel(view, channel)
{
   var newName = getNewName(view, "_lfit");

   var window = createImageChannelCopyWindow(newName, view.image, channel);
   return window.mainView;
}

// ----------------------------------------------------------------------------
// linearViewToBMP
// ----------------------------------------------------------------------------
function linearViewToBMP(view)
{
   Console.writeln("linearViewToBMP", view.id);
 	var nlinName = getNewName(view, "_preview");
   Console.writeln("linearViewToBMP copy view", view.id);
	var viewCopy = copyView(view, nlinName);
   Console.writeln("linearViewToBMP apply auto stf", view.id);
   ApplyAutoSTF( viewCopy,
						DEFAULT_AUTOSTRETCH_SCLIP,
						DEFAULT_AUTOSTRETCH_TBGND,
						DEFAULT_AUTOSTRETCH_CLINK );

   Console.writeln("linearViewToBMP apply histogram", view.id);
	ApplyHistogram(viewCopy);
   Console.writeln("linearViewToBMP render bmp", view.id);
   var bmp  = viewCopy.image.render();
   viewCopy.window.forceClose();
	return bmp;
}

// ============================================================================
// Math
//
// Polynomials functions
// ============================================================================

// ----------------------------------------------------------------------------
// solveQ
// ----------------------------------------------------------------------------
function solveQ (a, b, c)
{
	// a quadratic term
	// b linear
	// c const
	var x1 = (-b - Math.sqrt(b*b - 4*a*c)) / (2*a);
	var x2 = (-b + Math.sqrt(b*b - 4*a*c)) / (2*a);
	return  [x1, x2];
}

// ----------------------------------------------------------------------------
// Polynomials
// ----------------------------------------------------------------------------
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

// ----------------------------------------------------------------------------
// yValue
// ----------------------------------------------------------------------------
function yValue(x, A)
{
   var y = 0;
   for (var j = 0; j < A.length; j++)
   {
      y += A[j] * Math.pow(x, j);
   }
   return y;
}

// ----------------------------------------------------------------------------
// FindPolynomialLeastSquaresFit
//
// Find the least squares linear fit.
// ----------------------------------------------------------------------------
function FindPolynomialLeastSquaresFit(points,  degree)
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

// ----------------------------------------------------------------------------
// Solve
//
// Computes the solution of a linear equation system.
// @param M
// The system of linear equations as an augmented matrix[row, col] where (rows + 1 == cols).
// It will contain the solution in "row canonical form" if the function returns "true".
//
// @return Returns whether the matrix has a unique solution or not.
// ----------------------------------------------------------------------------
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

/*
   for (var r = 0; r < M.rows; r++)
   {
      for (var c = 0; c < M.cols; c++)
      {
        // Console.writeln("M " + r + '\t' + c  + '\t' + M.at(r, c));
      }
   }
*/

   // collect A1, A2, ..
   var coeff = [];
   for (var i = 0; i < rowCount; i++)
   {
      coeff.push(M.at(i, M.cols-1));
   }
   return coeff;
}

// ----------------------------------------------------------------------------
// isValid
// ----------------------------------------------------------------------------
function isValid(v)
{
   if (!isFinite(v)) return false;
   if (isNaN(v))     return false;
   return true;
}

// ----------------------------------------------------------------------------
// poly
//
// The function.
// ----------------------------------------------------------------------------
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
// csNRGB manages the channels, mask and mainview modification
// ----------------------------------------------------------------------------
function csNRGB(mainView, dialog)
{
	Console.writeln("mainView: ", mainView.id);
	this.applied 	= false;
	this.copyName	= getNewName(mainView, "_copy");
	this.mainCopy	= copyView( mainView, this.copyName);
	this.mainView	= mainView;
	this.modifView	= null;
	this.dialog		= dialog;
	this.maskView	= null;
	this.useMask	= false;
	this.keepMask	= false;
	this.pixCount	= mainView.image.width * mainView.image.height;
	this.doRefresh	= false;
	this.channels	= [null, null, null];
	this.bitmap 	= linearViewToBMP(this.mainView);
   this.rect      = mainView.image.selectedRect;

   Console.writeln("setDisposal");
   setDisposal(this.mainCopy, true);

   Console.writeln("rect: ", this.rect);
	this.rgbPixels	= [];
	for (var i = 0; i < 3; i++)
	{
      var a       = [];
      this.mainView.image.getSamples(a, this.rect, i);
      this.rgbPixels.push( new Float32Array(a) );
	}

   Console.writeln("mask flags");
   var  b  			= new ArrayBuffer(this.pixCount);
	this.maskFlags	= new Int8Array(b);		// mask map with 1
	for (var j = 0; j < this.pixCount; j++)
      this.maskFlags[j] = 1;

   Console.writeln("extract channels");
	this.channels	= extractChannels(mainView, TEMPVIEW);
	for (var i in this.channels)
	{
      Console.writeln("channel: ", this.channels[i].id);
      Console.writeln("mean: ", this.channels[i].image.mean());
		this.channels[i].window.hide();
		setDisposal(this.channels[i], true);
	}
   Console.writeln("channels extracted, disposals set");

   // -------------------------------------------------------------------------
   // apply
   // -------------------------------------------------------------------------
	this.apply = function()
	{
		var description = "Emission Line Integration";
		description 	+= '\n';
		description 	+= "========================="
		description 	+= '\n';
		description 	+= this.mainView.id;
		description 	+= '\n';
		description 	+= this.channels[0].getHistory();
		description 	+= this.channels[1].getHistory();
		description 	+= this.channels[2].getHistory();
		if (this.useMask)
		{
			description += "Masked with " + this.maskView.id + '\n';
		}
		var P = new PixelMath;
		P.expression = this.modifView.id;
		P.expression1 = "";
		P.expression2 = "";
		P.expression3 = "";
		P.useSingleExpression = true;
		P.symbols = "";
		P.generateOutput = true;
		P.singleThreaded = false;
		P.use64BitWorkingImage = false;
		P.rescale = false;
		P.rescaleLower = 0;
		P.rescaleUpper = 1;
		P.truncate = true;
		P.truncateLower = 0;
		P.truncateUpper = 1;
		P.createNewImage = false;
		P.setDescription(description);
		if (P.executeOn(this.mainView))
		{
			this.applied = true;
			return true;
		}
		else
		{
			return false;
		}
	}

   // -------------------------------------------------------------------------
   // refresh
   // -------------------------------------------------------------------------
	this.refresh = function()
	{
		if (this.applied)
		{
			var P = new PixelMath;
			P.expression = this.mainCopy.id;
			P.expression1 = "";
			P.expression2 = "";
			P.expression3 = "";
			P.useSingleExpression = true;
			P.symbols = "";
			P.generateOutput = true;
			P.singleThreaded = false;
			P.use64BitWorkingImage = false;
			P.rescale = false;
			P.truncate = false;
			P.createNewImage = false;
			P.executeOn(this.mainView)
		}
		this.applied = false;

		if (this.refreshed && this.doRefresh)
		{
			this.refreshed.call(this, this.dialog);
			this.doRefresh = false;
		}
	}

   // -------------------------------------------------------------------------
   // setMask
   // -------------------------------------------------------------------------
	this.setMask = function(maskView)
	{
		if (maskView.id != "")
		{
			if (!maskView.image.isGrayscale)
			{
				errorMessageOk(maskView.id + " is not a gray scale image", TITLE);
				return;
			}
			else
			{
				var c = maskView.image.width * maskView.image.height;
            if (!this.rect.isEqualTo(maskView.image.selectedRect))
				{
					errorMessageOk(maskView.id + " has a different image geometry", TITLE);
					return;
				}
			}

			var maskPix = new Array(this.pixCount);
			maskView.image.getPixels (maskPix);
			//
			// calculate dark areas, skip bright stars
			//
			var cnt = 0;
			var threshold = maskView.image.mean();
			for (var j = 0; j < this.pixCount; j++)
			{
				if (maskPix[j] > threshold)
				{
					this.maskFlags[j] = 0;		// skip star
					cnt += 1;
				}
				else
				{
					this.maskFlags[j] = 1;		// evaluate object & background
				}
			}
			// evaluate each pixel in this mask
			// set false in each location of MM for pixels
			// falling below a threshold
			//
			Console.writeln("# of pixel rejected " + cnt + ", mask threshold " +
								 threshold.toFixed(6));
			this.maskView   = maskView;
			this.useMask	= true;

         this.channels[0].mustEvaluate = this.channels[0].hasNarrowBand;
         this.channels[1].mustEvaluate = this.channels[1].hasNarrowBand;
         this.channels[2].mustEvaluate = this.channels[2].hasNarrowBand;
		}
		else
		{
			this.useMask	= false;
			for (var j = 0; j < this.pixCount; j++) this.maskFlags[j] = 1;
		}
		//
		// setting/removing mask forces re-evaluation of mue
		//
		for (var i in this.channels)
		{
			this.channels[i].mue = 0.0;
		}
	}

   // -------------------------------------------------------------------------
   // addEmission
   // -------------------------------------------------------------------------
	this.addEmission = function()
	{
		var id = getNewName(this.mainView, "_Test");
		this.modifView = copyView(this.mainCopy, id);
		var P = new PixelMath;
		P.expression 	= this.channels[0].expression();
		P.expression1	= this.channels[1].expression();
		P.expression2 	= this.channels[2].expression();
		P.useSingleExpression = false;
		P.symbols = "";
		P.generateOutput = true;
		P.singleThreaded = false;
		P.use64BitWorkingImage = false;
		P.rescale = false;
		P.rescaleLower = 0;
		P.rescaleUpper = 1;
		P.truncate = true;
		P.truncateLower = 0;
		P.truncateUpper = 1;
		P.createNewImage = false;
		var rc = false;
		try
		{
			rc =  P.executeOn( this.modifView );
		}
		catch (e)
		{
			rc = false
		}

		if (rc)
		{
			this.bitmap = linearViewToBMP(this.modifView);
			setDisposal(this.modifView, true);
			return this.modifView;
		}
		else
			return null;
	}

   // -------------------------------------------------------------------------
   // setMaskDisposal
   // -------------------------------------------------------------------------
	this.setMaskDisposal = function(keep)
	{
		this.keepMask = keep;
		if (this.maskView != null)
		{
			setDisposal(this.maskView, !keep);
		}
	}

   // -------------------------------------------------------------------------
   // maskShow
   // -------------------------------------------------------------------------
	this.maskShow = function(keep)
	{
		if (this.maskView != null)
		{
			var dispose = this.maskView.propertyValue(DISPOSE);
			if (!dispose)
			{
				this.maskView.window.show();
			}
		}
	}


   // -------------------------------------------------------------------------
   // graphicalAnalysis
   // -------------------------------------------------------------------------
	this.graphicalAnalysis = function(mainView)
	{
		// plot curves of modified channel(s)
 		for (var i = 0; i < 3; i++)
		{
			var channel = this.channels[i];
			with (channel)
			{
				if (mue == 0) continue;
				if (NRGB.useMask)
					plotter(curves.xyy, mue, narrowBand.id, broadBand.id, emission.id, NRGB.maskView.id);
				else
					plotter(curves.xyy, mue, narrowBand.id, broadBand.id, emission.id, "");
			}
		}
	}
} // csNRGB

// ----------------------------------------------------------------------------
// csChannel, class with methods and properties for one broadband/narrowband
// combination
// ----------------------------------------------------------------------------
function csChannel(NRGB, channelIndex)
{
	this.NRGB				= NRGB;
	this.channelIndex		= channelIndex;
	this.channelID			= "RGB".charAt(channelIndex);
	this.broadBand 		= this.NRGB.channels[channelIndex];
	this.narrowBand 		= null;
	this.emission 			= null;
	this.mue 				= 0.0;
   this.mustEvaluate    = false;
	this.dialog				= this.NRGB.dialog;
	this.contingent		= 1.0;
	this.medBroadband		= this.broadBand.image.median();
	this.medNarrowband	= 0.0;
	this.hasNarrowBand	= false
	this.nbPixelArray		= null;
	this.bitmap				= null;
   this.curves          = null;

	//
	// change views to csChannel class
	//
	NRGB.channels[channelIndex] = this;

   // -------------------------------------------------------------------------
   // setNarrowband
   // -------------------------------------------------------------------------
   this.setNarrowBand = function(narrowBand)
	{
      if (!NRGB.rect.isEqualTo(narrowBand.image.selectedRect))
      {
         errorMessageOk(narrowBand.id + " has a different image geometry", TITLE);
         return;
      }
		this.narrowBand  = narrowBand;
		this.mue = 0.0;
		if (this.narrowBand.id != "")
		{
			var a       		 = new Array(this.NRGB.pixCount);
			this.narrowBand.image.getPixels(a);
			this.nbPixelArray	 = new Float32Array(a);
			this.medNarrowband = narrowBand.image.median();
			this.hasNarrowBand = true;
         this.mustEvaluate  = true;
		}
		else
		{
			this.hasNarrowBand = false;
         this.mustEvaluate  = false;
		}
		this.NRGB.refresh();
		if (this.emission != null)
		{
			this.emission.window.forceClose();
		}
	}

   // -------------------------------------------------------------------------
   // setContingent
   // -------------------------------------------------------------------------
	this.setContingent = function(contingent)
	{
		this.contingent = contingent;
	}

   // -------------------------------------------------------------------------
   // canEvaluate
   // -------------------------------------------------------------------------
   this.canEvaluate = function()
   {
      return this.hasNarrowBand && this.mustEvaluate;
   }

   // -------------------------------------------------------------------------
   // getEmission
   // -------------------------------------------------------------------------
	this.getEmission = function()
	{
		if (this.canEvaluate())
		{
         this.dialog.cancel = false;
         //
         // make temp copy of the broadband channel for subtraction
         //
         var bbLfit = copyViewChannel(this.NRGB.mainView, this.channelIndex);

         equalizeMean(bbLfit, this.narrowBand);
         //
         // nb and bb pixels to array
         //
         var a          = [];

         bbLfit.image.getPixels(a);
         var bbPixels   = new Float32Array(a);

         this.narrowBand.image.getPixels(a);
         var nbPixels   = new Float32Array(a);
         //
         // broadband data in bbPixels array
         //
         Console.writeln("Narrowdband image...." + this.narrowBand.id);
         Console.writeln("Broadband image......" + bbLfit.id);
         if (this.mask != null)
            Console.writeln("Mask image..........." + this.mask.id);

         if (this.maskFlags == null)
         {
            this.maskFlags = new Int8Array(this.NRGB.pixCount);
            for (var j = 0; j < this.NRGB.pixCount; j++) this.maskFlags[j] = 1;
         }

         // bb and nb should have nearly same mean after LinearFit

         var bbMedian   = bbLfit.image.median();
         var beginWith = Math.min(this.narrowBand.image.median(), bbMedian)
                       / Math.max(this.narrowBand.image.median(), bbMedian) * 0.5;

         var stepSize = DEFAULT_STEP_SIZE;

         Console.writeln("Start with mue......." + beginWith);
         Console.writeln("Increment............" + stepSize);
         //
         // evaluate mue
         //
         this.curves = new mueCurves(nbPixels,
                                    bbPixels,
                                    this.maskFlags,
                                    beginWith,
                                    stepSize,
                                    this.dialog.advanceProgress,
                                    this.dialog);
         if (this.dialog.cancel) return false;

         this.mue = this.curves.mue;

         Console.writeln("Curve points " + this.curves.xyy.length);

         Console.writeln("Reduction factor mue: " + this.mue.toFixed(8) +
            " of " + this.NRGB.mainView.id + '[' + this.channelIndex.toString() + ']');

         if (this.mue > 0)
         {
            this.emission = Subtract(this.narrowBand, bbLfit, this.NRGB.mainView,
                                     null/*this.NRGB.maskView*/, this.mue, this.channelIndex);
            this.mustEvaluate = false;
            //
            // set flag in view
            //
            if (!this.emission.setPropertyValue("CS:js", "T" ))
               Console.writeln("View setPropertyValue failed " + this.emission.id);
            //
            // STF
            //
            ApplyAutoSTF ( this.emission, -2.80, 0.25 );
            //
            // add keywords
            //
            var keywords = [];
            keywords.push(new FITSKeyword("EMISSION", "T", "Emission line image"));
            this.emission.beginProcess(UndoFlag_NoSwapFile);
            this.emission.window.keywords = keywords;
            this.emission.endProcess();
         }
         else
         {
            errorMessageOk("CS processing returned no solution", TITLE);
         }

         bbLfit.window.forceClose();

         this.bitmap = linearViewToBMP(this.emission);
	   }

      return this.mue > 0;
   }

   // -------------------------------------------------------------------------
   // expression
   // -------------------------------------------------------------------------
	this.expression = function()
	{
 		if (this.mue == 0.0)
		{
			return "$T";
		}
		else
		{
			return "$T + " + this.emission.id + " * " + this.contingent;
		}
	}

   // -------------------------------------------------------------------------
   // getHistory
   // -------------------------------------------------------------------------
	this.getHistory = function()
	{
		var s = "Channel " + this.channelIndex;
		if (this.mue == 0.0)
		{
			s += " no modification" + '\n';
		}
		else
		{
			s += '\n';
			s += "Narrowband " + this.narrowBand.id + '\n';
			s += "Mue " + this.mue;
			s += '\n';
			s += "Contingent " + this.contingent + '\n';
		}
		return s;
	}

   // -------------------------------------------------------------------------
   // Evaluate the optimal quantity to be subtracted from the narrow band channel
   // This quantity is the broad band image x mue
   // -------------------------------------------------------------------------
   function mueCurves(NB, BB, MM, initialMue, stepSize, callback, dlg)
	{
		//
		// evaluate first derivative of counts over mue
		//
		var minStep = stepSize;
		var stp     = minStep * 4;
		var n       = NB.length;
      var maxC    = n * 0.9;
      var pF      = 1 / n;
		var bp 		= new Int8Array(MM);	// blackpoints
		var ii		= -1;						// loop index
		var stps 	= stp * 12.0;			// slope base

		this.mue 	= initialMue - stp;
		this.xy     = [];						// mue, count pairs
      this.xyy    = [];                // mue, xy, dxy combined

      var lastCnt = -1;

      var cnt    = 0;
      var progr  = 0;


		for (;;)
		{
			ii += 1;							// 0..

         processEvents();
         if (dlg.cancel)
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
			}

         cnt = n - gt0;

			this.xy.push(new Point(this.mue, cnt));

         if (cnt > maxC)
         {
            var t = findTurningPoint(this.xy, n, stps);
            this.mue = t.mue;
            this.xyy = t.xyy;
            return;
         }
		}
      return;     // leave this.xyy empty for no solution
	}

   // -------------------------------------------------------------------------
   // findTurningPoint
   // -------------------------------------------------------------------------
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

      for (var k = 4; k < xy.length; k++)
      {
			var slope = (xy[k - 4].y - 8 * xy[k - 3].y + 8 * xy[k - 1].y - xy[k].y) / stps;
         dxy.push({x:xy[k].x, y:xy[k].y, slope:slope});

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

      // Console.writeln("X " + X[0]+'\t'+X[1]);

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
      var mue;

      if ((Math.abs(X[0]  - max.x)) < (Math.abs(X[1] - max.x)))
         mue = X[0];
      else
         mue = X[1];


      Console.writeln("solved " + mue);

      // -----------------------------------------------------------------------
      // combine the curves
      // -----------------------------------------------------------------------
      var m0 = 0;
      var i0 = 0;
      for (var i in dxy)
      {
         if (dxy[i].slope > 0.025)
         {
            m0 = dxy[i].x;
            i0 = i;
            break;
         }
      }

      // x where dxy ~0.1 right of mue
      var m1 = mue + (mue - m0);

      var xyy = [];        // collect most interesting points for the graph
      for (var i = i0; i < dxy.length; i++)
      {
         xyy.push(dxy[i]);
      }
      return {mue:mue, xy:xy, dxy:dxy, xyy:xyy};
   }

   // -------------------------------------------------------------------------
   // Subtract
   // -------------------------------------------------------------------------
	function Subtract(nb, bb, rbb, mask, mue, channel)
	{
		var name = '';

      Console.writeln('Subtract '+mue + '\t'+ channel);

		var d = "\nContinuum Subtraction " + VERSION;
		d 	+= '\n';
		d 	+= "===========================";
		d 	+= '\n';
		d 	+= "NB:  " + nb.id;
		d 	+= '\n';
      if (rbb.image.isColor)
      {
         name = getNewName(nb, '_' + rbb.id + '_' +
                  new Array('Red', 'Green', 'Blue')[channel]);
		   d 	+= "BB:  " + rbb.id + ', channel: ' + 'RGB'[channel]; // original bb image
      }
      else
      {
         name = getNewName(nb, '_' + rbb.id);
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
         executeOn(nb);
			var view = View.viewById(name);
       	return view;
      }
	}
} // csChannel
