#engine v8
// V8 migration (2026-10-19); requires PixInsight 1.9.5 or later.
/*
   DarkStructureEnhance v1.1

   A script for enhancement of dark structures.

   Copyright (C) 2009 Carlos Sonnenstein (PTeam) & Oriol Lehmkuhl (PTeam)

   This program is free software: you can redistribute it and/or modify it
   under the terms of the GNU General Public License as published by the
   Free Software Foundation, version 3 of the License.

   This program is distributed in the hope that it will be useful, but WITHOUT
   ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
   FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for
   more details.

   You should have received a copy of the GNU General Public License along with
   this program.  If not, see <http://www.gnu.org/licenses/>.

   Modified by Thorsten Glebe, October 2022
   1. added "new instance" icon to store state of GUI
   2. minor refactorings
*/

/*
   DarkStructureEnhanceTG
   Modified by Thorsten Glebe, October 2022

   Change history:
   v2.0
      1. added "new instance" icon to store state of GUI
      2. reduce default of 'Amount' to 0.3
      3. minor refactorings
   v2.1
      1. add "reset" button
      2. enable/disable controls
   v2.2
      1. added preview
      2. code refactoring
*/

CoreApplication.ensureMinimumVersion(1, 9, 5);

#include "lib/TGCompactUI.js"

#feature-id    DarkStructureEnhanceTG : TG Scripts > DarkStructureEnhanceTG

#feature-info  A script for enhancement of dark structures.<br/>\
   <br/>\
   Based on an original algorithm created by Carlos Sonnenstein (PTeam). \
   JavaScript/PixInsight implementation by Oriol Lehmkuhl (PTeam).<br/> \
   <br/> \
   Copyright &copy; 2009 Carlos Sonnenstein (PTeam) & Oriol Lehmkuhl (PTeam) / 2022 Thorsten Glebe


#define nStarMask 6

#define VERSION "2.4.0"
#define TITLE "DarkStructureEnhanceTG"

#define DEFAULT_LAYERS       8
#define DEFAULT_SCALING      1
#define DEFAULT_MEDIAN       0.65
#define DEFAULT_ITERATIONS   1
#define LAYERS_TO_REMOVE_MIN 5
#define LAYERS_TO_REMOVE_MAX 12
#define PREV_SEPARATOR_WIDTH 3


// 2.4.0: Compact open-first interface, repeatable Apply, PiDoc help and safe cleanup.
function convertMedianToValue(median)
{
   return (median-0.5)*2
}

function convertValueToMedian(value)
{
   return (0.5*value)+0.5;
}

// -----------------------------------------------------------------------------
function ScalingFunction( kernel, name , size )
{
    this.kernel = kernel;
    this.name   = name;
    this.size   = size;
}

var scalingFunctions = new Array;

scalingFunctions[0] = new ScalingFunction(
   [ 0.29289322, 0.5, 0.29289322,
     0.5,        1.0, 0.5,
     0.29289322, 0.5, 0.29289322 ],
   "3x3 Linear Interpolation", 3 );

scalingFunctions[1] = new ScalingFunction(
   [ 1/256, 1/64, 3/128, 1/64, 1/256,
     1/64,  1/16, 3/32,  1/16, 1/64,
     3/128, 3/32, 9/64,  3/32, 3/128,
     1/64,  1/16, 3/32,  1/16, 1/64,
     1/256, 1/64, 3/128, 1/64, 1/256 ],
   "5x5 B3 Spline", 5 );

// -----------------------------------------------------------------------------
function doWaveletTransform(auxLayers, view)
{
   var wavlets = new ATrousWaveletTransformV1;
   with ( wavlets )
   {
       version                   = 257;
       layers                    = auxLayers;
       scaleDelta                = 0;
       scalingFunctionData       = scalingFunctions[data.scalingFunction].kernel;
       scalingFunctionKernelSize = scalingFunctions[data.scalingFunction].size;
       scalingFunctionName       = scalingFunctions[data.scalingFunction].name;
       largeScaleFunction        = ATrousWaveletTransformV1.NoFunction;
       curveBreakPoint           = 0.75;
       noiseThresholdingAmount   = 0.00;
       noiseThreshold            = 3.00;
       lowRange                  = 0.000;
       highRange                 = 0.000;
       previewMode               = ATrousWaveletTransformV1.Disabled;
       previewLayer              = 0;
       toLuminance               = true;
       toChrominance             = true;
       linear                    = false;
   }
   TG_checked(wavlets,view);
}

// -----------------------------------------------------------------------------
function doAuxiliarImage( image )
{
   var mask = TG_copyImage(image,"DSE_mask");
   var maskView = mask.mainView;
   try {

   // do awt
   var auxLayers = new Array(nStarMask);
   for(var i=0; i < nStarMask; ++i)
   {
       auxLayers[i] = [true, true, 1.00, 3.00, 0.000, false, 0, 0.50, 2, 5, false, true, 1.0, 0.02000];
   }
   auxLayers[nStarMask] = [false, true, 1.00, 3.00, 0.000, false, 0, 0.50, 2, 5, false, false, 0.50, 0.02000];

   doWaveletTransform(auxLayers, maskView);

   return mask;
   } catch(e){TG_close(mask);throw e;}
}

// -----------------------------------------------------------------------------
function doMask( image, view_id, numberOfLayers )
{
   var mask = TG_copyImage(image,"DSE_mask");
   var maskView = mask.mainView;var auxMask=null;
   try {

   // RBGWorking space
   var rgb = new RGBWorkingSpace;
   with (rgb)
   {
       channels = // Y, x, y
           [
           [0.333333, 0.648431, 0.330856],
           [0.333333, 0.321152, 0.597871],
           [0.333333, 0.155886, 0.066044]];
       gamma = 2.20;
       sRGBGamma = true;
       applyGlobalRGBWS = false;
   }
   TG_checked(rgb,maskView);

   // Anti deringing: Carlos Paranoia :D
   auxMask = doAuxiliarImage(image);
   var id = auxMask.mainView.id;

   var pm = new PixelMath;
   with (pm)
   {
       expression  = "$T -"+id;
       useSingleExpression = true;
       use64BitWorkingImage = false;
       rescale = false;
       rescaleLower = 0.0000000000;
       rescaleUpper = 1.0000000000;
       truncate = true;
       truncateLower = 0.0000000000;
       truncateUpper = 1.0000000000;
       createNewImage = false;
   }
   TG_checked(pm,maskView);

   //auxMask.show();

   auxMask.forceClose();

   // wavlets
   var auxLayers = new Array(numberOfLayers);
   for(var i=0; i < numberOfLayers; ++i)
   {
       auxLayers[i] = [false, true, 1.00, 3.00, 0.000, false, 0, 0.50, 2, 5, false, false, 0.50, 0.02000];
   }
   auxLayers[numberOfLayers] = [true, true, 1.00, 3.00, 0.000, false, 0, 0.50, 2, 5, false, false, 0.50, 0.02000];

   doWaveletTransform(auxLayers, maskView);

   // Pixel Math
   var pm = new PixelMath;
   with ( pm )
   {
       expression = maskView.id+"-"+view_id;
       expression1 = "";
       expression2 = "";
       useSingleExpression = true;
       variables = "";
       use64BitWorkingImage = false;
       rescale = false;
       rescaleLower = 0.0000000000;
       rescaleUpper = 1.0000000000;
       truncate = true;
       truncateLower = 0.0000000000;
       truncateUpper = 1.0000000000;
       createNewImage = false;
       newImageId = "";
       newImageWidth = 0;
       newImageHeight = 0;
       newImageColorSpace = PixelMath.SameAsTarget;
       newImageSampleFormat = PixelMath.SameAsTarget;
   }
   TG_checked(pm,maskView);

   // Convert to gray
   if(image.colorSpace != ColorSpace.Gray)
   {
       var toGray = new ConvertToGrayscale;
       TG_checked(toGray,maskView);
   }

   // Rescale
   var rescale = new Rescale;
   with ( rescale )
   {
       mode = Rescale.RGBK;
   }
   TG_checked(rescale,maskView);

   // Noise reduction
   var nr = new ATrousWaveletTransformV1;
   with ( nr )
   {
       version = 257;
       layers = // enabled, biasEnabled, structureDetectionThreshold, structureDetectionRange, bias, noiseReductionEnabled, noiseReductionFilter, noiseReductionAmount, noiseReductionIterations, noiseReductionKernelSize, noiseReductionProtectSignificant, deringingEnabled, deringingAmount, deringingThreshold
           [
           [false, true, 1.00, 3.00, 0.000, false, ATrousWaveletTransformV1.Recursive, 1.00, 5, 5, false, false, 0.50, 0.02000],
           [true, true, 1.00, 3.00, 0.000, true, ATrousWaveletTransformV1.Recursive, 1.00, 5, 5, false, false, 0.50, 0.02000],
           [true, true, 1.00, 3.00, 0.000, false, ATrousWaveletTransformV1.Recursive, 0.50, 2, 5, false, false, 0.50, 0.02000]];
       scaleDelta                = 0;
       scalingFunctionData       = scalingFunctions[0].kernel;
       scalingFunctionKernelSize = scalingFunctions[0].size;
       scalingFunctionName       = scalingFunctions[0].name;
       largeScaleFunction        = ATrousWaveletTransformV1.NoFunction;
       toLuminance               = true;
       toChrominance             = false;
       linear                    = false;
   }
   TG_checked(nr,maskView);

   return mask;
   } catch(e){TG_close(mask);throw e;} finally {TG_close(auxMask);}
}

// -----------------------------------------------------------------------------
const DSE_FILE=#__FILE__;
function DarkMaskLayersData()
{
   this.targetView=null;this.preview=null;
   TG_settings(this,{numberOfLayers:[8,5,12,true],scalingFunction:[1,0,1,true],median:[0.65,0.5,0.995],iterations:[1,1,10,true]}, {viewMask:false,newImage:true},{},{view_id:'targetView'});
   var load=this.importParameters;this.importParameters=function(){load();if(!Parameters.has('newImage'))this.newImage=false;};
}
var data=new DarkMaskLayersData;
function DSE_validate(comparison)
{
   if(!TG_valid(data.targetView)||!data.targetView.isMainView)throw Error('Select a target main image.');
   if(comparison&&(!TG_valid(data.preview)||!data.preview.isPreview||data.preview.window.mainView.fullId!=data.targetView.fullId||data.preview.image.width<64||data.preview.image.height<64))throw Error('Select a preview of the target, at least 64 × 64 pixels.');
}
function doDarkStructureEnhance(view,median,layers,keepMask)
{
   var mask=null,success=false;
   try {
      mask=doMask(view.image,view.id,layers);
      var hist=new HistogramTransformation;hist.H=[[0,.5,1,0,1],[0,.5,1,0,1],[0,.5,1,0,1],[0,median,1,0,1],[0,.5,1,0,1]];
      var pc=new ProcessContainer;
      for(var i=0;i<data.iterations;++i){pc.add(hist);pc.setMask(i,mask,false);}
      TG_checked(pc,view);mask.removeMaskReferences();success=true;return keepMask?mask:null;
   } finally {if(TG_valid(mask)){mask.removeMaskReferences();if(!success||!keepMask)TG_close(mask);}}
}
function DSE_run(comparison)
{
   DSE_validate(comparison);if(comparison)return DSE_compare();
   var w=TG_copy(data.targetView,data.targetView.id+'_DSE'),mask=null,success=false;
   try {
      mask=doDarkStructureEnhance(w.mainView,data.median,data.numberOfLayers,data.viewMask);
      TG_restoreAlpha(w.mainView,data.targetView);
      if(data.newImage)w.show();else TG_commit(data.targetView,w.mainView);
      if(mask)mask.show();success=true;return data.newImage?w:data.targetView.window;
   } finally {if(!success||!data.newImage)TG_close(w);if(!success)TG_close(mask);}
}
function DSE_compare()
{
   var rect=data.targetView.window.previewRect(data.preview),w=rect.width,h=rect.height,gap=3;
   var baseLayer=Math.max(5,Math.min(10,data.numberOfLayers-1));
   var baseAmount=Math.max(0,Math.min(.79,(data.median-.5)*2-.1));
   var grid=new ImageWindow(w*3+gap*2,(h+24)*3+gap*2,data.targetView.image.numberOfNominalChannels,32,true,data.targetView.image.isColor,TG_unique('DarkStructureEnhance_comparison'));
   var cell=null,success=false;
   try {
      for(var y=0;y<3;++y)for(var x=0;x<3;++x){
         CoreApplication.processEvents();if(data.cancel)throw Error('Comparison cancelled.');
         cell=TG_copy(data.targetView,'DSE_cell',rect);var amount=baseAmount+.1*y,layers=baseLayer+x;
         doDarkStructureEnhance(cell.mainView,.5+.5*amount,layers,false);
         grid.mainView.beginProcess(UndoFlag.NoSwapFile);
         try {grid.mainView.image.apply(cell.mainView.image,ImageOp.Mov,new Point(x*(w+gap),y*(h+24+gap)+24),0,new Rect(0,0,w,h),0,cell.mainView.image.numberOfNominalChannels-1);}finally{grid.mainView.endProcess();}
         var label=new Bitmap(w,24);label.fill(0xff202020);var graphics=new Graphics(label);
         try {graphics.font=new Font('Helvetica',10);graphics.pen=new Pen(0xffffffff);graphics.drawText(5,17,'Layers '+layers+' · Amount '+amount.toFixed(2));}finally{graphics.end();}
         grid.mainView.beginProcess(UndoFlag.NoSwapFile);try{grid.mainView.image.selectedPoint=new Point(x*(w+gap),y*(h+24+gap));grid.mainView.image.blend(label);grid.mainView.image.resetSelections();}finally{grid.mainView.endProcess();}
         TG_close(cell);cell=null;
      }
      grid.mainView.stf=data.targetView.stf;grid.show();success=true;return grid;
   } finally {TG_close(cell);if(!success)TG_close(grid);}
}
var DSE_Dialog=class extends Dialog
{
   constructor(){
      super();TG_setup(this,TITLE,VERSION,'Enhance dark structures in stretched images.');
      this.target=TG_picker(this,'Target image','targetView',v=>true);this.addGroup(this.target);
      var mask=TG_group(this,'Structure mask');this.addGroup(mask);
      this.layers=TG_spin(mask,'Layers:',5,12,data.numberOfLayers,v=>data.numberOfLayers=v);
      this.scaling=TG_combo(mask,'Scaling:',['3×3 Linear Interpolation','5×5 B3 Spline'],data.scalingFunction,v=>data.scalingFunction=v);
      this.mask=TG_check(mask,'Show the generated mask',data.viewMask,v=>data.viewMask=v);
      var enhance=TG_group(this,'Enhancement');this.addGroup(enhance);
      this.amount=TG_number(enhance,'Amount:',0,.99,2,(data.median-.5)*2,v=>data.median=.5+.5*v);
      this.iterations=TG_spin(enhance,'Iterations:',1,10,data.iterations,v=>data.iterations=v);
      var compare=TG_group(this,'Compare on a preview');this.addGroup(compare);
      this.preview=new ViewList(compare);this.viewLists.push(this.preview);this.preview.onViewSelected=v=>{if(this.busy||this.disposed||this.updating)return;data.preview=TG_valid(v)?v:null;this.refresh();};compare.sizer.add(this.preview);
      this.compare=new PushButton(compare);this.compare.text='Create comparison';this.compare.onClick=()=>this.run(()=>DSE_run(true));compare.sizer.add(this.compare);
      compare.sizer.add(TG_label(compare,'3 × 3 grid: layers across, amount down.\nApply always processes the full target.'));
      var output=TG_group(this,'Output');this.addGroup(output);this.copy=TG_check(output,'Create a new image on Apply',data.newImage,v=>data.newImage=v);
      TG_finish(this,DSE_FILE,'DarkStructureEnhanceTG',()=>{
         DSE_validate(false);if(data.targetView.computeOrFetchProperty('Median').at(0)<=.01&&(new MessageBox('This image may still be linear. An STF is only a display stretch. Continue?',TITLE,StdIcon.Warning,StdButton.Yes,StdButton.No)).execute()!=StdButton.Yes)return null;
         return DSE_run(false);
      },()=>{data.reset();this.layers.value=data.numberOfLayers;this.scaling.currentItem=data.scalingFunction;this.mask.checked=data.viewMask;this.amount.setValue(.3);this.iterations.value=1;this.copy.checked=true;this.refresh();});
   }
   refresh(status){
      if(this.disposed||this.updating)return;this.updating=true;
      try {
      this.target.refresh();this.preview.getPreviews();ImageWindow.windows.forEach(w=>w.previews.forEach(p=>{if(!TG_valid(data.targetView)||w.mainView.fullId!=data.targetView.fullId)this.preview.remove(p);}));
      if(TG_valid(data.preview)&&(!TG_valid(data.targetView)||data.preview.window.mainView.fullId!=data.targetView.fullId))data.preview=null;
      this.preview.currentView=TG_valid(data.preview)?data.preview:new View;this.compare.enabled=TG_valid(data.preview);
      if(this.apply)this.apply.enabled=TG_valid(data.targetView);if(this.status&&status!==false)this.status.text='Start with Amount 0.30 and compare nearby settings.\nReset retains the target and selected preview.';
      }finally{this.updating=false;}
   }
};
#ifndef TG_TEST
TG_main(DSE_Dialog,'targetView',v=>true,()=>DSE_run(false));
#endif
