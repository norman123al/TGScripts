#engine v8
// V8 migration (2026-10-19); requires PixInsight 1.9.5 or later.
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
   EmissionLineIntegrationTG.js v2.2.1

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


#feature-id EmissionLineIntegrationTG : TG Scripts > EmissionLineIntegrationTG
#feature-info Integrate continuum-subtracted narrowband emission into RGB. Copyright Hartmut V. Bornemann / Thorsten Glebe.
CoreApplication.ensureMinimumVersion(1,9,5);
#define ELI_TG_VERSION "2.2.1"
#include "lib/TGCompactUI.js"
#include "lib/TGCompactPreview.js"
#include "lib/TGEmissionContinuum.js"
const ELI_FILE=#__FILE__;
function ELIData()
{
   this.targetView=null;this.preview=null;this.nbR=null;this.nbG=null;this.nbB=null;this.mask=null;this.cancel=false;
   TG_settings(this,{amplify_R:[1,0,100],amplify_G:[1,0,100],amplify_B:[1,0,100],limit:[90,50,99,true]}, {newImage:true,retainNB:false},{},{nbR_id:'nbR',nbG_id:'nbG',nbB_id:'nbB',mask_id:'mask'});
   var save=this.exportParameters;this.exportParameters=function(){save();for(var k of ['nbR','nbG','nbB','mask'])if(TG_valid(this[k]))Parameters.set(k+'_id',this[k].id);};
}
var data=new ELIData;
function ELI_validate(comparison)
{
   if(!TG_valid(data.targetView)||!data.targetView.isMainView||!data.targetView.image.isColor)throw Error('Select a linear RGB main image.');
   if(!['nbR','nbG','nbB'].some(k=>TG_valid(data[k])))throw Error('Select at least one grayscale narrowband image.');
   for(var k of ['nbR','nbG','nbB','mask']){var v=data[k];if(TG_valid(v)&&(v.image.isColor||!v.isMainView||v.image.width!=data.targetView.image.width||v.image.height!=data.targetView.image.height))throw Error('Narrowband inputs and star mask must be registered grayscale main images with the RGB dimensions.');}
   if(TG_valid(data.mask)&&['nbR','nbG','nbB'].some(k=>TG_valid(data[k])&&data[k].fullId==data.mask.fullId))throw Error('The star mask must be separate from each narrowband input.');
   if(comparison&&(!TG_valid(data.preview)||!data.preview.isPreview||data.preview.window.mainView.fullId!=data.targetView.fullId))throw Error('Select a preview belonging to the RGB image.');
}
function ELI_run(comparison,progress)
{
   ELI_validate(comparison);var out=null,grid=null,emissions=[],success=false,oldChannel=data.channel;data.lastMu=[null,null,null];
   try{
      out=TG_copy(data.targetView,data.targetView.id+'_ELI');
      for(var c=0;c<3;++c){
         var nb=data['nb'+'RGB'[c]];if(!TG_valid(nb))continue;
         var cs=new ContinuumSubtraction;cs.nb=nb;cs.bb=data.targetView;cs.mask=TG_valid(data.mask)?data.mask:null;data.channel=c;
         if(!cs.execute(p=>{if(progress)progress('RGB'[c],p);}))throw Error('Processing cancelled.');
         emissions.push(cs.csImage.window);data.lastMu[c]=cs.mue;
         var p=new PixelMath;p.useSingleExpression=false;p.expression='$T';p.expression1='$T';p.expression2='$T';
         p[c==0?'expression':'expression'+c]='$T + '+cs.csImage.id+' * '+data['amplify_'+'RGB'[c]];
         p.rescale=false;p.truncate=true;p.truncateLower=0;p.truncateUpper=1;p.createNewImage=false;TG_checked(p,out.mainView);
      }
      TG_restoreAlpha(out.mainView,data.targetView);if(data.cancel)throw Error('Processing cancelled.');
      if(comparison){
         var rect=data.targetView.window.previewRect(data.preview),w=rect.width,h=rect.height;
         grid=new ImageWindow(w*2+3,h+24,3,32,true,true,TG_unique('EmissionLineIntegration_comparison'));
         grid.mainView.beginProcess(UndoFlag.NoSwapFile);try{grid.mainView.image.apply(data.targetView.image,ImageOp.Mov,new Point(0,24),0,rect,0,2);grid.mainView.image.apply(out.mainView.image,ImageOp.Mov,new Point(w+3,24),0,rect,0,2);}finally{grid.mainView.endProcess();}
         TG_caption(grid.mainView,'Original RGB',w,0,0);TG_caption(grid.mainView,'With emission',w,w+3,0);TG_autoSTF(grid.mainView);grid.show();grid.zoomToFit();
      }else{if(data.newImage)out.show();else TG_commit(data.targetView,out.mainView);if(data.retainNB)emissions.forEach(w=>w.show());}
      Console.noteln('Continuum scales (R, G, B): '+data.lastMu.map(x=>x===null?'unused':x.toFixed(6)).join(', '));
      success=true;return comparison?grid:(data.newImage?out:data.targetView.window);
   }finally{
      data.channel=oldChannel;
      if(!success||comparison||!data.newImage)TG_close(out);
      if(!success)TG_close(grid);
      if(!success||comparison||!data.retainNB)emissions.forEach(TG_close);
   }
}
var ELI_Dialog=class extends Dialog
{
   constructor(){
      super();TG_setup(this,'EmissionLineIntegrationTG',ELI_TG_VERSION,'Add continuum-subtracted narrowband emission to a linear RGB image.');
      this.target=TG_picker(this,'RGB target','targetView',v=>v.image.isColor,true);this.addGroup(this.target);this.preview=TG_previewPicker(this,this.target,'preview');this.inputs=[];this.amounts=[];
      for(var c=0;c<3;++c){let channel='RGB'[c];var g=TG_picker(this,['Red','Green','Blue'][c]+' · optional narrowband','nb'+channel,v=>!v.image.isColor,true);this.inputs.push(g);this.addGroup(g);this.amounts.push(TG_number(g,'Amplify:',0,100,2,data['amplify_'+channel],v=>data['amplify_'+channel]=v));}
      this.mask=TG_picker(this,'Star mask · optional, estimation only','mask',v=>!v.image.isColor,true);this.addGroup(this.mask);
      var output=TG_group(this,'Estimation and output');this.addGroup(output);
      this.limit=TG_number(output,'Blackness (%):',50,99,0,data.limit,v=>data.limit=Math.round(v));
      this.newImage=TG_check(output,'Create a new RGB image on Apply',data.newImage,v=>data.newImage=v);
      this.retain=TG_check(output,'Retain separate emission images',data.retainNB,v=>data.retainNB=v);
      this.progress=(c,p)=>this.status.text='Estimating '+c+': '+(100*p).toFixed(1)+'% black pixels.\nUse Close to cancel.';
      TG_finish(this,ELI_FILE,'EmissionLineIntegrationTG',()=>ELI_run(false,this.progress),()=>{data.reset();this.amounts.forEach((a,c)=>a.setValue(data['amplify_'+'RGB'[c]]));this.limit.setValue(data.limit);this.newImage.checked=data.newImage;this.retain.checked=data.retainNB;this.refresh();},{toolTip:'Compare the selected RGB preview before and after emission integration.',action:()=>ELI_run(true,this.progress)});
      this.instance.toolTip='Drag to save settings and narrowband/mask references. The receiving main image becomes the RGB input.';
   }
   refresh(status){this.target.refresh();if(this.preview)this.preview.refresh();if(this.inputs)this.inputs.forEach(g=>g.refresh());if(this.mask)this.mask.refresh();var ready=TG_valid(data.targetView)&&['nbR','nbG','nbB'].some(k=>TG_valid(data[k]));if(this.apply)this.apply.enabled=ready&&!this.busy;if(this.previewAction)this.previewAction.enabled=ready&&TG_valid(data.preview)&&!this.busy;if(this.status&&status!==false)this.status.text='Align all inputs before use. Empty channels stay unchanged.\nUse the magnifier to compare a selected RGB preview.';}
};
#ifndef TG_TEST
TG_main(ELI_Dialog,'targetView',v=>v.image.isColor,()=>ELI_run(false));
#endif
