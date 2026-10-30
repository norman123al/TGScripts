#engine v8
// V8 migration (2026-10-19); requires PixInsight 1.9.5 or later.
/*
   LocalSupportMask v2.2.0

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


#feature-id LocalSupportMask : TG Scripts > LocalSupportMask
#feature-info Create a deconvolution local support mask. Copyright 2022-2026 Thorsten Glebe.
CoreApplication.ensureMinimumVersion(1,9,5);
#include "lib/TGCompactUI.js"
#define LSM_VERSION "2.2.0"
function LSM_prepare(targetView)
{
   var MLT = new MultiscaleLinearTransform;
   MLT.layers = [ // enabled, biasEnabled, bias, noiseReductionEnabled, noiseReductionThreshold, noiseReductionAmount, noiseReductionIterations
      [false, true, 0.000, false, 3.000, 1.00, 1],
      [true , true, 0.000, false, 3.000, 1.00, 1],
      [true , true, 0.000, false, 3.000, 1.00, 1],
      [true , true, 0.000, false, 3.000, 1.00, 1],
      [true , true, 0.000, false, 3.000, 1.00, 1],
      [false, true, 0.000, false, 3.000, 1.00, 1]
   ];
   MLT.transform = MultiscaleLinearTransform.StarletTransform;
   MLT.scaleDelta = 0;
   MLT.scalingFunctionData = [
      0.25,0.5,0.25,
      0.5,1,0.5,
      0.25,0.5,0.25
   ];
   MLT.scalingFunctionRowFilter = [
      0.5,
      1,
      0.5
   ];
   MLT.scalingFunctionColFilter = [
      0.5,
      1,
      0.5
   ];
   MLT.scalingFunctionNoiseSigma = [
      0.8003,0.2729,0.1198,
      0.0578,0.0287,0.0143,
      0.0072,0.0036,0.0019,
      0.001
   ];
   MLT.scalingFunctionName       = "Linear Interpolation (3)";
   MLT.linearMask                = false;
   MLT.linearMaskAmpFactor       = 100;
   MLT.linearMaskSmoothness      = 1.00;
   MLT.linearMaskInverted        = true;
   MLT.linearMaskPreview         = false;
   MLT.largeScaleFunction        = MultiscaleLinearTransform.NoFunction;
   MLT.curveBreakPoint           = 0.75;
   MLT.noiseThresholding         = false;
   MLT.noiseThresholdingAmount   = 1.00;
   MLT.noiseThreshold            = 3.00;
   MLT.softThresholding          = true;
   MLT.useMultiresolutionSupport = false;
   MLT.deringing                 = false;
   MLT.deringingDark             = 0.1000;
   MLT.deringingBright           = 0.0000;
   MLT.outputDeringingMaps       = false;
   MLT.lowRange                  = 0.0000;
   MLT.highRange                 = 0.0000;
   MLT.previewMode               = MultiscaleLinearTransform.Disabled;
   MLT.previewLayer              = 0;
   MLT.toLuminance               = true;
   MLT.toChrominance             = true;
   MLT.linear                    = false;

   TG_checked(MLT,targetView);

   // standard screen transfer function stretch
   var HT = new HistogramTransformation;
   HT.H = [ // c0, m, c1, r0, r1
      [0.00000000, 0.50000000, 1.00000000, 0.00000000, 1.00000000],
      [0.00000000, 0.50000000, 1.00000000, 0.00000000, 1.00000000],
      [0.00000000, 0.50000000, 1.00000000, 0.00000000, 1.00000000],
      [0.00067764, 0.00102823, 1.00000000, 0.00000000, 1.00000000],
      [0.00000000, 0.50000000, 1.00000000, 0.00000000, 1.00000000]
   ];

   TG_checked(HT,targetView);


}
function LSM_starMask(view,overlay)
{
   var SM = new StarMask;
   SM.shadowsClipping     = 0.20000;
   SM.midtonesBalance     = data.strength;
   SM.highlightsClipping  = 1.00000;
   SM.waveletLayers       = data.scale;
   SM.structureContours   = false;
   SM.noiseThreshold      = 0.20000;
   SM.aggregateStructures = false;
   SM.binarizeStructures  = true;
   SM.largeScaleGrowth    = data.large_scale;
   SM.smallScaleGrowth    = data.small_scale;
   SM.growthCompensation  = data.compensation;
   SM.smoothness          = data.smoothness;
   SM.invert              = false;
   SM.truncation          = 1.00000;
   SM.limit               = 1.00000;
   SM.mode                = overlay ? StarMask.StarMaskOverlay : StarMask.StarMask;


   var before=ImageWindow.windows.map(w=>w.mainView.id),created=[],ok=false;
   try{TG_checked(SM,view);created=ImageWindow.windows.filter(w=>before.indexOf(w.mainView.id)<0);if(created.length!=1)throw Error('StarMask did not create a single result.');ok=true;return created[0];}
   finally{if(!ok){created=ImageWindow.windows.filter(w=>before.indexOf(w.mainView.id)<0);created.forEach(TG_close);}}
}

const LSM_FILE=#__FILE__;
function LSMData()
{
   this.targetView=null;this.cancel=false;
   TG_settings(this,{strength:[.5,0,1],scale:[5,2,12,true],large_scale:[0,0,15,true],small_scale:[1,0,15,true],compensation:[2,0,4,true],smoothness:[10,0,40,true],previewMode:[1,0,1,true]}, {},{}, {view_id:'targetView'});
}
var data=new LSMData;
function LSM_validate(){if(!TG_valid(data.targetView)||!data.targetView.isMainView)throw Error('Select a linear grayscale or RGB main image.');}
function LSM_intermediate(view)
{
   var rgb=null,out=null,success=false;
   try{
      if(view.image.isColor){rgb=TG_copy(view,'LSM_luminance');rgb.mainView.beginProcess(UndoFlag.NoSwapFile);try{rgb.mainView.image.colorSpace=ColorSpace.CIELab;}finally{rgb.mainView.endProcess();}out=TG_copyImage(rgb.mainView.image,'LSM_intermediate',undefined,0);}
      else out=TG_copyImage(view.image,'LSM_intermediate',undefined,0);
      LSM_prepare(out.mainView);success=true;return out;
   }finally{TG_close(rgb);if(!success)TG_close(out);}
}
function LSM_run(preview)
{
   LSM_validate();var intermediate=null,result=null,success=false;
   try{
      intermediate=LSM_intermediate(data.targetView);
      if(preview&&data.previewMode==0){result=intermediate;intermediate=null;}
      else result=LSM_starMask(intermediate.mainView,preview);
      if(data.cancel)throw Error('Processing cancelled.');
      result.mainView.id=TG_unique(preview?(data.targetView.id+(data.previewMode?'_LSM_overlay':'_LSM_intermediate')):'local_support_mask');result.show();result.zoomToFit();success=true;return result;
   }finally{TG_close(intermediate);if(!success)TG_close(result);}
}
var LSM_Dialog=class extends Dialog
{
   constructor(){
      super();TG_setup(this,'LocalSupportMask',LSM_VERSION,'Create a star mask for local deringing support. Use a linear grayscale or RGB image.');
      this.target=TG_picker(this,'Target image','targetView',v=>true);this.addGroup(this.target);
      var p=TG_group(this,'Mask parameters');this.addGroup(p);this.controls={};
      this.controls.strength=TG_number(p,'Strength:',0,1,2,1-data.strength,v=>data.strength=1-v);
      this.controls.strength.toolTip='Higher values produce a brighter support mask. Saved instances retain the original midtones convention.';
      for(var s of [['scale','Scale:',2,12],['large_scale','Large scale:',0,15],['small_scale','Small scale:',0,15],['compensation','Compensation:',0,4],['smoothness','Smoothness:',0,40]]){let k=s[0];this.controls[k]=TG_spin(p,s[1],s[2],s[3],data[k],v=>data[k]=v);}
      var preview=TG_group(this,'Preview');this.addGroup(preview);this.mode=TG_combo(preview,'Show:',['Intermediate luminance','Star mask overlay'],data.previewMode,v=>data.previewMode=v);
      this.previewButton=new PushButton(preview);this.previewButton.text='Create preview image';this.previewButton.onClick=()=>this.run(()=>LSM_run(true));preview.sizer.add(this.previewButton);
      TG_finish(this,LSM_FILE,'LocalSupportMask',()=>LSM_run(false),()=>{data.reset();Object.keys(this.controls).forEach(k=>{if(k=='strength')this.controls[k].setValue(1-data.strength);else this.controls[k].value=data[k];});this.mode.currentItem=data.previewMode;this.refresh();});
   }
   refresh(status){this.target.refresh();if(this.apply)this.apply.enabled=TG_valid(data.targetView);if(this.previewButton)this.previewButton.enabled=TG_valid(data.targetView);if(this.status&&status!==false)this.status.text='Apply creates the final grayscale support mask.\nPreviews open separately; the source stays unchanged.';}
};
#ifndef TG_TEST
TG_main(LSM_Dialog,'targetView',v=>true,()=>LSM_run(false));
#endif
