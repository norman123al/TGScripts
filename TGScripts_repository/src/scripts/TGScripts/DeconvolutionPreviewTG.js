#engine v8
// V8 migration (2026-10-19); requires PixInsight 1.9.5 or later.
/*
   DeconvolutionPreviewTG v2.3.0

   A script for assisted deconvolution. The script provides several previews
   applying deconvolutions with varying point spread functions (PSF), as a
   function of the specified sigma and shape parameters. The sigma and shape
   values are plotted on each deconvolved preview for easy reference.

   Copyright (C) 2009 Juan M. Gómez (Pixinsight user)

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
   Changelog:

   1.01: Code cleanups and updated tooltip and feature information.
         Published as an official PixInsight script.

   1.0:  Initial version published on PixInsight Forum.
*/

/*
   Modified 2022 by Thorsten Glebe

   Change history:
   v2.0
      1. add "new instance" button to store parameters in icon
      2. added deconvolution parameters in GUI
      3. fixed crash issue when autostretching final preview image
      4. added support for greyscale images
      5. updated feature info
      6. change operation mode to work on previews only to speed up preview generation
   v2.1
      1. provide GUI reset button
      2. add 'Local amount' slider for local support mask
      3. change ok and cancel buttons to tool buttons
      4. add "reset" button
      5. GUI control enable/disable
      6. bug fixing
*/


#feature-id DeconvolutionPreviewTG : TG Scripts > DeconvolutionPreviewTG
#feature-info Compact PSF comparison and deconvolution. Copyright 2009 Juan M. Gómez / 2022-2026 Thorsten Glebe.
CoreApplication.ensureMinimumVersion(1,9,5);
#include "lib/TGCompactUI.js"
#include "lib/TGCompactPreview.js"
#define DP_VERSION "2.3.0"
function DP_process( ParsedView, GaussianSigma, GaussianShape, support )
{
   var p = new Deconvolution;
   with ( p )
   {
      algorithm = Deconvolution.RichardsonLucy;
      numberOfIterations = data.deconiterations;
      deringing = true;
      deringingDark = data.globaldark;
      deringingBright = 0.0000;
      if(!support)
      {
         deringingSupport = false;
         deringingSupportViewId = "";
      }
      else
      {
         deringingSupport = true;
         deringingSupportViewId = support.mainView.id;
      }
      deringingSupportAmount = data.localsupportamount;

      toLuminance = true;
      psfMode = Deconvolution.Parametric;
      psfSigma = GaussianSigma;
      psfShape = GaussianShape;
      psfAspectRatio = 1.00;
      psfRotationAngle = 0.00;
      psfMotionLength = 5.00;
      psfMotionRotationAngle = 0.00;
      psfViewId = "";
      psfFFTSizeLimit = 15;
      useRegularization = true;
      waveletLayers = [ // noiseThreshold, noiseReduction
         [5.00, 1.00],
         [3.00, 1.00],
         [1.00, 0.70],
         [1.00, 0.70],
         [1.00, 0.70]
      ];
      noiseModel = Deconvolution.Gaussian;
      numberOfWaveletLayers = 3;
      scalingFunction = Deconvolution.B3Spline5x5;
      convergence = 0.0000;
      rangeLow = 0.0000000;
      rangeHigh = 0.0000000;
      iterations = [ // count
         [0],
         [0],
         [0]
      ];
   }
   TG_checked(p,ParsedView);
}
const DP_FILE=#__FILE__;
function DPData()
{
   this.targetView=null;this.preview=null;this.localsupportmaskView=null;this.cancel=false;
   TG_settings(this,{GaussianStart:[1.5,.1,9.99],GaussianAmount:[.5,.1,9.99],GaussianIterations:[3,1,10,true],ShapeStart:[2,.1,9.99],ShapeAmount:[.5,.1,9.99],ShapeIterations:[3,1,10,true],deconiterations:[30,1,100,true],globaldark:[.001,0,1],localsupportamount:[.7,0,1]}, {newImage:true},{},{lsm_id:'localsupportmaskView'});
   var save=this.exportParameters,load=this.importParameters;
   this.exportParameters=function(){save();if(TG_valid(this.localsupportmaskView))Parameters.set('lsm_id',this.localsupportmaskView.id);};
   this.importParameters=function(){load();if(Parameters.has('prev_id')){var v=View.viewById(Parameters.getString('prev_id'));if(TG_valid(v)&&v.isPreview){this.preview=v;this.targetView=v.window.mainView;}}};
}
var data=new DPData;
function DP_validate(grid)
{
   if(!TG_valid(data.targetView)||!data.targetView.isMainView)throw Error('Select a linear main image.');
   if(grid&&(!TG_valid(data.preview)||!data.preview.isPreview||data.preview.window.mainView.fullId!=data.targetView.fullId))throw Error('Select a preview belonging to the target image.');
   if(grid&&(data.preview.image.width<64||data.preview.image.height<64))throw Error('Use a preview at least 64 × 64 pixels.');
   if(grid&&(data.GaussianStart+(data.GaussianIterations-1)*data.GaussianAmount>10||data.ShapeStart+(data.ShapeIterations-1)*data.ShapeAmount>10))throw Error('The last sigma and shape in the grid must not exceed 10. Reduce the start, step or count.');
   var m=data.localsupportmaskView;
   if(TG_valid(m)&&(m.image.isColor||!m.isMainView||m.fullId==data.targetView.fullId||m.image.width!=data.targetView.image.width||m.image.height!=data.targetView.image.height))throw Error('The support mask must be a separate, registered grayscale main image with the target dimensions.');
}
function DP_run(grid,progress)
{
   DP_validate(grid);var mask=null,cell=null,result=null,success=false,rect=grid?data.targetView.window.previewRect(data.preview):null;
   try{
      if(TG_valid(data.localsupportmaskView))mask=TG_copy(data.localsupportmaskView,'DP_support',rect);
      if(!grid){
         result=TG_copy(data.targetView,data.targetView.id+'_decon');DP_process(result.mainView,data.GaussianStart,data.ShapeStart,mask);
         TG_restoreAlpha(result.mainView,data.targetView);
         if(data.cancel)throw Error('Processing cancelled.');
         if(data.newImage)result.show();else TG_commit(data.targetView,result.mainView);
         success=true;return data.newImage?result:data.targetView.window;
      }
      var w=rect.width,h=rect.height,cols=data.GaussianIterations,rows=data.ShapeIterations;
      if((w+3)*cols*(h+27)*rows*data.targetView.image.numberOfNominalChannels>150000000)throw Error('The comparison grid is too large. Use a smaller preview or fewer samples.');
      result=new ImageWindow((w+3)*cols-3,(h+27)*rows-3,data.targetView.image.numberOfNominalChannels,32,true,data.targetView.image.isColor,TG_unique('DeconvolutionPreview'));
      for(var y=0;y<rows;++y)for(var x=0;x<cols;++x){
         CoreApplication.processEvents();if(data.cancel)throw Error('Processing cancelled.');
         if(progress)progress(y*cols+x+1,rows*cols);
         cell=TG_copy(data.targetView,'DP_cell',rect);var sigma=data.GaussianStart+x*data.GaussianAmount,shape=data.ShapeStart+y*data.ShapeAmount;
         DP_process(cell.mainView,sigma,shape,mask);
         result.mainView.beginProcess(UndoFlag.NoSwapFile);
         try{result.mainView.image.apply(cell.mainView.image,ImageOp.Mov,new Point(x*(w+3),y*(h+27)+24),0,new Rect(0,0,w,h),0,cell.mainView.image.numberOfNominalChannels-1);}finally{result.mainView.endProcess();}
         TG_caption(result.mainView,'σ'+sigma.toFixed(2)+' · β'+shape.toFixed(2),w,x*(w+3),y*(h+27));TG_close(cell);cell=null;
      }
      TG_autoSTF(result.mainView);result.show();result.zoomToFit();success=true;return result;
   }finally{TG_close(mask);TG_close(cell);if(!success||(!grid&&!data.newImage))TG_close(result);}
}
var DP_Dialog=class extends Dialog
{
   constructor(){
      super();TG_setup(this,'DeconvolutionPreviewTG',DP_VERSION,'Compare PSF settings on a preview, then deconvolve the full linear image.');
      this.target=TG_picker(this,'Target image','targetView',v=>true);this.addGroup(this.target);this.preview=TG_previewPicker(this,this.target,'preview');
      var psf=TG_group(this,'PSF · start value is used by Apply');this.addGroup(psf);this.fields={};
      var header=new HorizontalSizer;header.spacing=5;header.addSpacing(64);for(var text of ['Start','Step','Count']){var h=new Label(psf);h.text=text;h.setScaledFixedWidth(72);h.textAlignment=TextAlignment.HorzCenter;header.add(h);}header.addStretch();psf.sizer.add(header);
      for(var item of [['Sigma','Gaussian'],['Shape','Shape']]){
         var row=new HorizontalSizer;row.spacing=5;var label=new Label(psf);label.text=item[0]+':';label.setScaledFixedWidth(64);row.add(label);
         for(var suffix of ['Start','Amount','Iterations']){let key=item[1]+suffix;var n=new NumericEdit(psf);n.label.hide();n.setRange(suffix=='Iterations'?1:.1,suffix=='Iterations'?10:9.99);n.setPrecision(suffix=='Iterations'?0:2);n.setReal(suffix!='Iterations');n.edit.setScaledFixedWidth(72);n.setValue(data[key]);n.onValueUpdated=v=>data[key]=v;this.fields[key]=n;row.add(n);}
         row.addStretch();psf.sizer.add(row);
      }
      this.fields.deconiterations=TG_spin(psf,'Iterations:',1,100,data.deconiterations,v=>data.deconiterations=v);
      this.fields.globaldark=TG_number(psf,'Global dark:',0,1,4,data.globaldark,v=>data.globaldark=v);
      this.mask=TG_picker(this,'Local support mask · optional','localsupportmaskView',v=>!v.image.isColor);this.addGroup(this.mask);
      this.fields.localsupportamount=TG_number(this.mask,'Local amount:',0,1,2,data.localsupportamount,v=>data.localsupportamount=v);
      var output=TG_group(this,'Output');this.addGroup(output);this.newImage=TG_check(output,'Create a new image on Apply',data.newImage,v=>data.newImage=v);
      this.compare=new PushButton(output);this.compare.text='Create PSF comparison grid';this.compare.onClick=()=>this.run(()=>DP_run(true,(n,total)=>this.status.text='Deconvolving cell '+n+' of '+total+'…\nUse Close to cancel.'));output.sizer.add(this.compare);
      TG_finish(this,DP_FILE,'DeconvolutionPreviewTG',()=>DP_run(false),()=>{data.reset();Object.keys(this.fields).forEach(k=>{var f=this.fields[k];if(k=='deconiterations')f.value=data[k];else f.setValue(data[k]);});this.newImage.checked=data.newImage;this.refresh();});
   }
   refresh(status){this.target.refresh();if(this.preview)this.preview.refresh();if(this.mask)this.mask.refresh();if(this.apply)this.apply.enabled=TG_valid(data.targetView);if(this.compare)this.compare.enabled=TG_valid(data.targetView)&&TG_valid(data.preview);if(this.status&&status!==false)this.status.text='Grid: selected preview. Apply: full image at start values.\nUncheck new image for one-step Undo on the target.';}
};
#ifndef TG_TEST
Console.hide();if(Parameters.isGlobalTarget||Parameters.isViewTarget)data.importParameters();
if(Parameters.isViewTarget){var v=Parameters.targetView;data.targetView=v.window.mainView;if(v.isPreview)data.preview=v;DP_run(v.isPreview);}
else{var w=ImageWindow.activeWindow;if(TG_valid(w)){data.targetView=w.mainView;if(w.currentView.isPreview)data.preview=w.currentView;}var d=new DP_Dialog;try{d.execute();}finally{d.dispose();}}
#endif
