#engine v8

/* Star Spike Protection Mask 1.3
 * Native PixInsight / PJSR script; tested with PixInsight 1.9.5.
 * TG Scripts menu package. Runtime target: PixInsight 1.9.5 with V8.
 * Pipeline: source snapshot -> connected cores -> measured spikes -> mask -> blur.
 * Works on actual image samples, not the ScreenTransferFunction display.
 * The source is read-only. Output: full-size Float32 grayscale, black protects.
 */
#ifndef SPM_LIBRARY
#feature-id StarSpikeProtectionMask : TG Scripts > StarSpikeProtectionMask
#feature-info Creates soft protection masks for bright stars and diffraction spikes.
#endif
#include <pjsr/controls/ImageView.js>

var SPM_SCRIPT_FILE = #__FILE__;
var SPM_VERSION = "1.3";

/** Resolve bundled help relative to THIS file, never the current directory.
 * Keeping doc/ beside the script makes the TG Scripts installation portable.
 * @returns {String} Absolute path to the compiled PixInsight help document.
 */
function SPMDocumentationPath() {
   return File.extractDrive(SPM_SCRIPT_FILE)+File.extractDirectory(SPM_SCRIPT_FILE)+
      "/doc/scripts/StarSpikeProtectionMask/StarSpikeProtectionMask.html";
}

/** Open the bundled PIDoc page in PixInsight's own modal documentation browser. */
function SPMShowDocumentation() {
   var path=SPMDocumentationPath();
   if(File.exists(path))Dialog.openBrowser(path,"Star Spike Protection Mask — TG Scripts");
   else if(!Dialog.browseScriptDocumentation("StarSpikeProtectionMask"))
      new MessageBox("Documentation was not found. Keep the supplied doc folder beside StarSpikeProtectionMask.js.",
         "Star Spike Protection Mask",StdIcon.Warning,StdButton.Ok).execute();
}

/** Render actual samples to a display bitmap without modifying image selections.
 * Source STF is intentionally excluded, matching the detection intensity scale.
 * @param {Image} image Source or completed mask image.
 * @returns {Bitmap} Independent full-resolution 8-bit display representation.
 */
function SPMPreviewBitmap(image) {
   image.pushSelections();
   try {image.resetSelections();return image.render();}
   finally {image.popSelections();}
}

/** User settings. Lengths/areas are in original-image pixels; intensities are
 * normalized actual samples, not STF display values. Core area is a brightness
 * proxy for saturated stars, never a calibrated magnitude. Process instances
 * persist these values; a fresh menu launch uses the defaults below.
 * @constructor
 */
function SPMOptions() {
   this.minArea = 100;
   this.coreThreshold = 0.60;
   this.minPeak = 0.80;
   this.requireSpikes = true;
   this.minArms = 2;
   this.spikeContrast = 0.025;
   this.autoAngle = true;
   this.angleDegrees = 0;
   this.maxLength = 600;
   this.padding = 20;
   this.feather = 6;
   this.haloThreshold = 0.05;
   this.blurWholeMask = false;
   this.blurSigma = 2;
   this.saveAsXisf = true;
   this.sourceId = "";
}

/** Explicit instance schema: exclude caches, native views and pixel data.
 * Typed getters preserve booleans and numerical precision across icon saves.
 * Missing keys retain defaults, allowing older instances to load new options.
 */
var SPM_PARAMETER_TYPES = {
   minArea:"number",coreThreshold:"number",minPeak:"number",requireSpikes:"boolean",
   minArms:"number",spikeContrast:"number",autoAngle:"boolean",angleDegrees:"number",
   maxLength:"number",padding:"number",feather:"number",haloThreshold:"number",
   blurWholeMask:"boolean",blurSigma:"number",saveAsXisf:"boolean",sourceId:"string"
};
SPMOptions.prototype.exportParameters=function() {
   SPMValidate(this);
   Parameters.clear();
   Parameters.set("spmSchemaVersion",1);
   for(var key in SPM_PARAMETER_TYPES)Parameters.set(key,this[key]);
};
SPMOptions.prototype.importParameters=function() {
   if(Parameters.has("spmSchemaVersion")&&Parameters.getInteger("spmSchemaVersion")>1)
      throw new Error("This instance requires a newer version of Star Spike Protection Mask.");
   for(var key in SPM_PARAMETER_TYPES)if(Parameters.has(key)) {
      var type=SPM_PARAMETER_TYPES[key];
      this[key]=type=="boolean"?Parameters.getBoolean(key):
         type=="string"?Parameters.getString(key):Parameters.getReal(key);
   }
   SPMValidate(this);
};

/** Resolve an instance's saved main view without silently choosing a different
 * image when the saved source is closed. A view-target invocation overrides it.
 */
function SPMResolveSource(o,targetView) {
   if(targetView&&!targetView.isNull) {
      if(!targetView.isMainView)throw new Error("Apply this instance to a main image, not a preview.");
      return targetView;
   }
   if(o.sourceId.length) {
      var saved=View.viewById(o.sourceId);
      return saved&&!saved.isNull&&saved.isMainView?saved:null;
   }
   return ImageWindow.activeWindow.isNull?null:ImageWindow.activeWindow.mainView;
}

/** Pump native UI events and honor the Process Console Abort request. */
function SPMCheckAbort() {
   CoreApplication.processEvents();
   if ( console.abortRequested ) throw new Error("Mask creation cancelled.");
}
/** Interpolated quantile of a small sample list. Sorts v in place; empty => 0. */
function SPMQuantile(v, q) {
   if (!v.length) return 0;
   v.sort(function(a,b){return a-b;});
   var p=(v.length-1)*q, i=Math.floor(p), t=p-i;
   return v[i]*(1-t)+v[Math.min(i+1,v.length-1)]*t;
}
/** Cubic smoothstep complement: 1 inside, 0 beyond width; zero width is hard. */
function SPMFade(d, width) {
   if (d<=0) return 1;
   if (width<=0 || d>=width) return 0;
   var t=d/width;
   return 1-t*t*(3-2*t);
}
/** Reject invalid settings before allocating image-sized buffers. */
function SPMValidate(o) {
   function range(k,lo,hi) {
      if (!isFinite(o[k]) || o[k]<lo || o[k]>hi)
         throw new Error("Invalid setting: "+k);
   }
   range('minArea',1,10000); range('coreThreshold',0.0001,0.9999);
   range('minPeak',0,1); range('minArms',1,4);
   range('spikeContrast',0.0001,.3); range('angleDegrees',0,90);
   range('maxLength',30,3000); range('padding',0,200);
   range('feather',0,50); range('haloThreshold',0.0001,.5);
   range('blurSigma',0.1,25);
   ['minArea','minArms','maxLength','padding'].forEach(function(k){
      if(Math.floor(o[k])!=o[k])throw new Error("Expected an integer setting: "+k);
   });
}

/** Read-only snapshot of the complete source view, ignoring alpha channels.
 * Uses max(R,G,B), clipped to [0,1], to retain colored diffraction spikes.
 * Explicit rectangles prevent a selected ROI from changing mask geometry.
 * @param {View} view Source main view (RGB or grayscale).
 * @param {SPMOptions} options Settings used for detection and rasterization.
 * @constructor
 */
function SPMEngine(view, options) {
   SPMValidate(options);
   this.o=options;
   var im=view.image;
   if (im.isComplex) throw new Error("Complex images are not supported.");
   this.width=im.width; this.height=im.height; this.sourceId=view.id;
   var n=this.width*this.height;
   this.a=new Float32Array(n);
   var channel=new Float32Array(n), rect=new Rect(0,0,this.width,this.height);
   for (var c=0;c<im.numberOfNominalChannels;++c) {
      im.getSamples(channel,rect,c);
      for (var i=0;i<n;++i) {
         if (!isFinite(channel[i])) throw new Error("Source contains non-finite samples.");
         this.a[i]=Math.max(this.a[i],Math.min(1,channel[i]));
      }
      SPMCheckAbort();
   }
   channel=null;
   this.candidates=[]; this.stars=[]; this.angle=0;
}
/** Bilinear subpixel sampling. Out-of-frame samples return NaN, not black. */
SPMEngine.prototype.sample=function(x,y) {
   var w=this.width,h=this.height;
   if (x<0 || y<0 || x>w-1 || y>h-1) return NaN;
   var ix=Math.floor(x), iy=Math.floor(y), fx=x-ix, fy=y-iy;
   var jx=Math.min(ix+1,w-1), jy=Math.min(iy+1,h-1), a=this.a;
   return (a[iy*w+ix]*(1-fx)+a[iy*w+jx]*fx)*(1-fy)
        +(a[jy*w+ix]*(1-fx)+a[jy*w+jx]*fx)*fy;
};
/** Smooth with separable [1,2,1]/4, then label 8-connected bright components.
 * Accumulate weighted centers, unsmoothed peaks, areas and edge flags. A growing
 * integer queue bounds flood-fill overhead. Reject extended nonstellar regions.
 * @returns {Array} Candidate records, ordered by decreasing bright-core area.
 */
SPMEngine.prototype.findCores=function() {
   console.writeln("Detecting bright star cores...");
   var w=this.width,h=this.height,n=w*h,o=this.o,a=this.a;
   // Small separable smoothing suppresses individual hot pixels. The cutoff
   // area is the number of pixels above coreThreshold after this smoothing.
   var temp=new Float32Array(n), s=new Float32Array(n);
   for (var y=0;y<h;++y) {
      var row=y*w;
      for (var x=0;x<w;++x)
         temp[row+x]=.25*a[row+Math.max(0,x-1)]+.5*a[row+x]+.25*a[row+Math.min(w-1,x+1)];
      if ((y&255)==0) SPMCheckAbort();
   }
   var flags=new Uint8Array(n);
   for (var y=0;y<h;++y) {
      var row=y*w,prev=Math.max(0,y-1)*w,next=Math.min(h-1,y+1)*w;
      for (var x=0;x<w;++x) {
         var p=row+x;
         s[p]=.25*temp[prev+x]+.5*temp[p]+.25*temp[next+x];
         flags[p]=s[p]>=o.coreThreshold ? 1 : 0;
      }
      if ((y&255)==0) SPMCheckAbort();
   }
   temp=null;
   var queue=new Int32Array(4096), found=[];
   for (var p=0;p<n;++p) {
      if ((p&1048575)==0) SPMCheckAbort();
      if (!flags[p]) continue;
      var head=0,tail=1;queue[0]=p;flags[p]=0;
      var area=0,sx=0,sy=0,weight=0,peak=0,x0=w,y0=h,x1=0,y1=0;
      while (head<tail) {
         var k=queue[head++],yy=Math.floor(k/w),xx=k-yy*w,v=s[k];
         ++area;sx+=xx*v;sy+=yy*v;weight+=v;peak=Math.max(peak,a[k]);
         x0=Math.min(x0,xx);x1=Math.max(x1,xx);y0=Math.min(y0,yy);y1=Math.max(y1,yy);
         for (var dy=-1;dy<=1;++dy) for (var dx=-1;dx<=1;++dx) {
            if ((!dx&&!dy)||xx+dx<0||xx+dx>=w||yy+dy<0||yy+dy>=h) continue;
            var q=k+dy*w+dx;
            if (!flags[q]) continue;
            flags[q]=0;
            if (tail==queue.length) {
               var grown=new Int32Array(Math.min(n,queue.length*2));
               for(var qi=0;qi<tail;++qi)grown[qi]=queue[qi];queue=grown;
            }
            queue[tail++]=q;
         }
         if ((head&65535)==0) SPMCheckAbort();
      }
      // Exclude extended regions; this tool is intended for stars-only images.
      if (area>=o.minArea && peak>=o.minPeak && area<=100000 &&
          x1-x0<Math.max(512,w*.15) && y1-y0<Math.max(512,h*.15))
         found.push({x:sx/weight,y:sy/weight,area:area,peak:peak,
            radius:Math.sqrt(area/Math.PI),edge:x0==0||y0==0||x1==w-1||y1==h-1});
   }
   this.candidates=found.sort(function(a,b){return b.area-a.area;});
   console.writeln(found.length+" cores meet the area and intensity cutoffs.");
   return found;
};
/** Sample a 5-pixel-wide ray at distance r. Subtract the lower quartile of
 * flanking strips 10-14 pixels away to reduce crowding bias. angle is radians
 * clockwise from +x in image coordinates. Returns null if coverage is inadequate.
 */
SPMEngine.prototype.strip=function(star,angle,r) {
   var cs=Math.cos(angle),sn=Math.sin(angle),line=[],side=[];
   var bx=star.x+r*cs,by=star.y+r*sn;
   for (var t=-2;t<=2;++t) {
      var v=this.sample(bx-t*sn,by+t*cs);if(isFinite(v))line.push(v);
   }
   if (line.length<3) return null;
   var offsets=[-14,-12,-10,10,12,14];
   for (var k=0;k<offsets.length;++k) {
      var t=offsets[k],v=this.sample(bx-t*sn,by+t*cs);if(isFinite(v))side.push(v);
   }
   if (!side.length) return null;
   var signal=0;for(var k=0;k<line.length;++k)signal+=line[k];signal/=line.length;
   return {value:signal,excess:signal-SPMQuantile(side,.25)};
};
/** Robust sum of positive contrast on four orthogonal rays outside the core. */
SPMEngine.prototype.angleScore=function(star,angle) {
   var start=Math.max(18,star.radius*1.8),score=0;
   for (var arm=0;arm<4;++arm) {
      var values=[];
      for (var r=start;r<start+54;r+=3) {
         var p=this.strip(star,angle+arm*Math.PI/2,r);
         if (p) values.push(p.excess);
      }
      if(values.length>=5)score+=Math.max(0,SPMQuantile(values,.5));
   }
   return score;
};
/** Find a shared orientation from up to ten large, non-clipped candidates.
 * Search [0,90) at 2-degree steps, then refine at 0.25 degrees. Both orthogonal
 * axes represent the same diffraction pattern. Manual mode bypasses this search.
 */
SPMEngine.prototype.findAngle=function() {
   if (!this.o.autoAngle) return this.angle=this.o.angleDegrees*Math.PI/180;
   var stars=this.candidates.filter(function(s){return !s.edge;}).slice(0,10);
   if(!stars.length)stars=this.candidates.slice(0,10);
   var best=0,bestScore=-1;
   for(var deg=0;deg<90;deg+=2) {
      var score=0;
      for(var k=0;k<stars.length;++k)score+=this.angleScore(stars[k],deg*Math.PI/180);
      if(score>bestScore){bestScore=score;best=deg;}
      SPMCheckAbort();
   }
   var center=best;
   for(var deg=center-2;deg<=center+2;deg+=.25) {
      var score=0;
      for(var k=0;k<stars.length;++k)score+=this.angleScore(stars[k],deg*Math.PI/180);
      if(score>bestScore){bestScore=score;best=deg;}
   }
   this.angle=((best%90)+90)%90*Math.PI/180;
   console.writeln("Measured spike-axis angle: "+(this.angle*180/Math.PI).toFixed(2)+" degrees (image coordinates).");
   return this.angle;
};
/** Correct a clipped core's biased centroid by fitting the visible spike rays.
 * Coarse/fine coordinate descent can place the physical center outside the frame.
 * Updates star.x/star.y in place; no object coordinates are manually hard-coded.
 */
SPMEngine.prototype.refineEdge=function(star) {
   if(!star.edge)return;
   // A core clipped by a frame boundary has a biased centroid. Fit the visible
   // spike ridges around it, allowing the physical center to be just off-frame.
   var span=Math.min(45,star.radius),angle=this.angle;
   for(var iteration=0;iteration<2;++iteration)for(var axis=0;axis<2;++axis) {
      var initial=axis==0?star.x:star.y,best=initial,bscore=-1;
      var step=iteration==0?2:.5,range=iteration==0?span:3;
      for(var d=-range;d<=range;d+=step) {
         if(axis==0)star.x=initial+d;else star.y=initial+d;
         var score=this.angleScore(star,angle);
         if(score>bscore){bscore=score;best=initial+d;}
      }
      if(axis==0)star.x=best;else star.y=best;
   }
};
/** Refine the angle, test arm evidence, measure arm lengths and circular halo.
 * Median ray filtering and a sustained 18-pixel gap tolerate chromatic breaks.
 * Paired arms provide a conservative lower bound; tip padding is added last.
 * Adds angle, lengths[4], evidence[4], arms, truncated, drawSpikes and maskRadius.
 * @returns {Boolean} Whether the core satisfies the requested spike criterion.
 */
SPMEngine.prototype.measureStar=function(star) {
   var o=this.o,start=Math.ceil(Math.max(18,star.radius*1.8));
   this.refineEdge(star);
   var angle=this.angle,bs=this.angleScore(star,angle);
   if(o.autoAngle)for(var deg=-2;deg<=2;deg+=.4) {
      var ang=this.angle+deg*Math.PI/180,score=this.angleScore(star,ang);
      if(score>bs){bs=score;angle=ang;}
   }
   star.angle=angle;star.lengths=[];star.evidence=[];star.arms=0;star.truncated=false;
   for(var arm=0;arm<4;++arm) {
      var evidence=[],profile=[],values=[],end=start,gap=0,seen=false,ended=false;
      for(var r=0;r<=o.maxLength;++r) {
         var p=this.strip(star,angle+arm*Math.PI/2,r);
         profile.push(p?p.excess:NaN);values.push(p?p.value:NaN);
      }
      for(var r=start;r<Math.min(start+30,o.maxLength);++r)
         if(isFinite(profile[r]))evidence.push(profile[r]);
      var ev=evidence.length>=8?SPMQuantile(evidence,.5):0;
      star.evidence.push(ev);if(ev>=o.spikeContrast)++star.arms;
      for(var r=start;r<=o.maxLength;++r) {
         if(!isFinite(profile[r])){end=r;ended=true;break;}
         var local=[];
         for(var j=Math.max(0,r-4);j<=Math.min(o.maxLength,r+4);++j)
            if(isFinite(profile[j]))local.push(profile[j]);
         var good=SPMQuantile(local,.5)>=o.spikeContrast && values[r]>=o.spikeContrast*1.5;
         if(good){end=r;gap=0;seen=true;}else ++gap;
         if(gap>=18 && r>start+10){ended=true;break;}
      }
      if(!ended&&seen)star.truncated=true;
      star.lengths.push(Math.max(start,end));
   }
   if(o.requireSpikes&&star.arms<o.minArms)return false;
   star.drawSpikes=star.arms>0;
   // Robust circular halo extent, rejecting neighboring stars through medians.
   var radial=[],maxHalo=Math.min(300,Math.max(100,Math.ceil(star.radius*4)));
   for(var r=1;r<=maxHalo;++r) {
      var vals=[];
      for(var j=0;j<80;++j) {
         var t=j*Math.PI/40,v=this.sample(star.x+r*Math.cos(t),star.y+r*Math.sin(t));
         if(isFinite(v))vals.push(v);
      }
      radial.push(vals.length?SPMQuantile(vals,.5):NaN);
   }
   var outer=radial.slice(Math.floor(maxHalo*.8)).filter(function(v){return isFinite(v);});
   var floor=Math.max(o.haloThreshold,SPMQuantile(outer,.5)+o.spikeContrast);
   var core=Math.max(12,star.radius*1.4),radius=Math.min(maxHalo,core*1.6);
   for(var r=Math.ceil(core);r<maxHalo;++r)
      if(isFinite(radial[r])&&radial[r]<floor){radius=r+3;break;}
   star.maskRadius=radius;
   var raw=star.lengths.slice();
   for(var arm=0;arm<4;++arm)
      star.lengths[arm]=Math.min(o.maxLength,Math.max(raw[arm],.8*raw[(arm+2)%4],radius+12))+o.padding;
   return true;
};
/** Populate candidates and selected stars; report counts and length-limit hits. */
SPMEngine.prototype.analyze=function() {
   this.findCores();this.stars=[];
   if(!this.candidates.length)return this.stars;
   this.findAngle();
   console.writeln("Measuring diffraction spikes...");
   for(var i=0;i<this.candidates.length;++i) {
      if(this.measureStar(this.candidates[i]))this.stars.push(this.candidates[i]);
      if((i%25)==0){console.write("\rMeasured "+i+" / "+this.candidates.length);SPMCheckAbort();}
   }
   console.writeln("\nSelected "+this.stars.length+" stars.");
   var capped=this.stars.filter(function(s){return s.truncated;}).length;
   if(capped)console.warningln(capped+" stars have spikes reaching the length limit. Consider increasing Maximum spike length.");
   return this.stars;
};
/** Union soft disks and orthogonal arms into a full-resolution selection.
 * Take 1-selection so black protects. Apply optional native Gaussian Convolution
 * only after all stars are combined. Do not stretch/normalize the finished mask.
 * @returns {ImageWindow} New hidden Float32 grayscale mask, owned by the caller.
 * On failure the partial output is closed. The source is never written to.
 */
SPMEngine.prototype.render=function() {
   if(!this.stars.length)throw new Error("No stars meet these limits. Lower the minimum core area, core threshold, or spike contrast.");
   console.writeln("Building protection mask...");
   var w=this.width,h=this.height,o=this.o,mask=new Float32Array(w*h);
   for(var k=0;k<this.stars.length;++k) {
      var s=this.stars[k],extent=Math.ceil(Math.max(s.maskRadius,Math.max.apply(null,s.lengths))+Math.max(o.feather,9)+2);
      var x0=Math.max(0,Math.floor(s.x)-extent),x1=Math.min(w-1,Math.ceil(s.x)+extent);
      var y0=Math.max(0,Math.floor(s.y)-extent),y1=Math.min(h-1,Math.ceil(s.y)+extent);
      var cs=Math.cos(s.angle),sn=Math.sin(s.angle),half=3.5+Math.min(3.5,s.radius/9);
      for(var y=y0;y<=y1;++y) {
         var dy=y-s.y;
         for(var x=x0;x<=x1;++x) {
            var dx=x-s.x,dist=Math.sqrt(dx*dx+dy*dy),v=SPMFade(dist-s.maskRadius,o.feather);
            var u=dx*cs+dy*sn,t=-dx*sn+dy*cs;
            if(s.drawSpikes) {
               // Both orthogonal axes, choosing the appropriate positive/negative arm.
               var along=Math.abs(u),across=Math.abs(t),idx=u>=0?0:2;
               var z=SPMFade(across-(half+.003*along),o.feather*.6)*SPMFade(along-s.lengths[idx],o.feather*1.5);
               v=Math.max(v,z);
               along=Math.abs(t);across=Math.abs(u);idx=t>=0?1:3;
               z=SPMFade(across-(half+.003*along),o.feather*.6)*SPMFade(along-s.lengths[idx],o.feather*1.5);
               v=Math.max(v,z);
            }
            var p=y*w+x;if(v>mask[p])mask[p]=v;
         }
         if((y&127)==0)SPMCheckAbort();
      }
      if((k%25)==0)SPMCheckAbort();
   }
   for(var p=0;p<mask.length;++p)mask[p]=1-mask[p];
   var id=this.sourceId+"_spike_protection",suffix=1;
   while(!ImageWindow.windowById(id).isNull)id=this.sourceId+"_spike_protection_"+(suffix++);
   var win=new ImageWindow(w,h,1,32,true,false,id);
   try {
      win.mainView.beginProcess(UndoFlag.NoSwapFile);
      try{win.mainView.image.setSamples(mask,new Rect(0,0,w,h),0);}
      finally{win.mainView.endProcess();}
      // Blur the completed grayscale mask, including the cores and spikes.
      // Native Convolution handles image boundaries and preserves mask polarity.
      if(o.blurWholeMask) {
         console.writeln("Blurring entire mask: Gaussian sigma = "+o.blurSigma+" px...");
         SPMCheckAbort();
         var blur=new Convolution;
         blur.mode=Convolution.Parametric;
         blur.sigma=o.blurSigma;blur.shape=2;blur.aspectRatio=1;blur.rotationAngle=0;
         blur.filterSource="";blur.rescaleHighPass=false;blur.viewId="";
         if(!blur.executeOn(win.mainView))throw new Error("Whole-mask blur did not complete.");
         SPMCheckAbort();
      }
      win.keywords=[new FITSKeyword("COMMENT","","StarSpikeProtectionMask "+SPM_VERSION+": black protects; use without mask inversion."),
         new FITSKeyword("COMMENT","","Source: "+this.sourceId+"; selected stars: "+this.stars.length),
         new FITSKeyword("COMMENT","","Core area >= "+o.minArea+" px; core level "+o.coreThreshold+"; peak >= "+o.minPeak),
         new FITSKeyword("COMMENT","","Whole-mask Gaussian blur: "+(o.blurWholeMask?"sigma "+o.blurSigma+" px":"off"))];
   }catch(e){win.forceClose();throw e;}
   return win;
};

/** Modal settings/preview controller. Native ImageView provides pan/zoom/1:1.
 * Preview uses the exact render path, including blur, then an 8-bit display copy.
 * Settings changes discard cached bitmaps. Create always rereads the source so
 * edits after a previous preview cannot be silently ignored. Rendering a preview
 * never attaches a mask or leaves temporary image windows in the workspace.
 */
class SPMDialog extends Dialog {
 constructor(o) {
   super();
   var self=this;
   // V8 controls can emit value-change events while the dialog is being built.
   // Install the real invalidation handler only after the preview exists.
   this.invalidate=function(){};
   this.windowTitle="Star Spike Protection Mask "+SPM_VERSION;
   this.tabs=new TabBox(this);
   this.parameters=new Control(this.tabs);
   this.help=new Label(this);this.help.useRichText=true;this.help.wordWrapping=true;
   this.help.text="<b>Protect bright stars and their diffraction spikes.</b><br>"+
      "Use a stretched stars-only image. The output has black protected regions on white, with soft edges. " +
      "The source image is never changed. STF display stretches do not affect the measurements.";
   this.views=new ViewList(this.parameters);this.views.getMainViews();
   var initialView=SPMResolveSource(o,null);
   if(initialView)this.views.currentView=initialView;
   function numeric(label,key,lo,hi,precision,tip) {
      var c=new NumericControl(self.parameters);c.label.text=label;c.label.setFixedWidth(220);
      c.real=precision!=0;
      c.setRange(lo,hi);c.slider.setRange(0,1000);c.setPrecision(precision);c.setValue(o[key]);
      c.toolTip=tip;c.onValueUpdated=function(v){o[key]=v;self.invalidate();};return c;
   }
   this.area=numeric("Minimum bright-core area (px)",'minArea',1,10000,0,
      "Main lower cutoff. Number of connected bright pixels above the core threshold, after slight smoothing. Raise this to protect only larger/brighter stars; lower it to include smaller stars. Not a stellar magnitude.");
   this.core=numeric("Core intensity threshold",'coreThreshold',.0001,.9999,4,
      "Normalized actual image intensity used to measure the bright core. 0.60 is a starting point for the stretched RGB stars image. Lower this for darker data; STF is not applied.");
   this.peak=numeric("Minimum peak intensity",'minPeak',0,1,4,
      "Additional brightness cutoff, measured in the brightest RGB channel (or grayscale). Saturated stars can share the same peak, so use core area to separate them.");
   this.require=new CheckBox(this.parameters);this.require.text="Require detected diffraction spikes";this.require.checked=o.requireSpikes;
   this.require.onCheck=function(v){o.requireSpikes=v;self.arms.enabled=v;self.invalidate();};
   this.arms=numeric("Minimum detected spike arms",'minArms',1,4,0,
      "Two arms include stars near frame edges, crowded fields, or asymmetric spikes. Three or four arms make selection stricter.");
   this.arms.enabled=o.requireSpikes;
   this.contrast=numeric("Minimum spike contrast",'spikeContrast',.0001,.3,4,
      "Minimum spike intensity above nearby side strips. Lower values detect fainter spikes, but may include background structures.");
   this.auto=new CheckBox(this.parameters);this.auto.text="Measure spike angle automatically";this.auto.checked=o.autoAngle;
   this.auto.onCheck=function(v){o.autoAngle=v;self.angle.enabled=!v;self.invalidate();};
   this.angle=numeric("Spike-axis angle (degrees)",'angleDegrees',0,90,2,
      "One of the two perpendicular spike axes, clockwise from the image's horizontal axis. Only used when automatic measurement is off.");this.angle.enabled=!o.autoAngle;
   this.length=numeric("Maximum spike length (px)",'maxLength',30,3000,0,"Maximum measured radius of each spike before adding the tip margin. Increase if the console reports clipped lengths.");
   this.padding=numeric("Spike-tip margin (px)",'padding',0,200,0,"Extra protection past each measured spike tip.");
   this.feather=numeric("Edge softness (px)",'feather',0,50,1,"Width of the smooth transition from fully protected to unprotected. Zero gives hard edges.");
   this.halo=numeric("Halo intensity floor",'haloThreshold',.0001,.5,4,"Lower values include more of each star's halo. Increase to tighten the circular protection around each core.");
   this.blurCheck=new CheckBox(this.parameters);this.blurCheck.text="Blur entire mask (Gaussian)";
   this.blurCheck.checked=o.blurWholeMask;
   this.blurCheck.toolTip="Apply Gaussian smoothing to the finished mask, including cores, halos and spikes. This is additional to Edge softness.";
   this.blurCheck.onCheck=function(v){o.blurWholeMask=v;self.blurSigma.enabled=v;self.invalidate();};
   this.blurSigma=numeric("Blur sigma (px)",'blurSigma',.1,25,1,
      "Gaussian standard deviation in pixels. Start at 2.0; larger values blur more. Blurring can turn narrow black spikes gray, reducing their protection.");
   this.blurSigma.enabled=o.blurWholeMask;
   this.save=new CheckBox(this.parameters);this.save.text="Offer to save the result as XISF";this.save.checked=o.saveAsXisf;
   this.save.onCheck=function(v){o.saveAsXisf=v;};
   this.status=new Label(this);this.status.wordWrapping=true;
   this.status.text="Analyze to see how many stars meet the selected limits.";
   if(o.sourceId.length&&!initialView)this.status.text="Saved source '"+o.sourceId+"' is not open. Select a source image.";
   this.analysis=null;this.sourceView=null;
   this.previewPage=new Control(this.tabs);
   this.previewViewer=new ImageView(this.previewPage);
   this.previewViewer.setScaledMinSize(660,370);
   this.previewViewer.setStatusMessage("Click Update preview to build the mask.");
   this.previewSource=new CheckBox(this.previewPage);this.previewSource.text="Show source image for comparison";
   this.previewSource.enabled=false;
   this.previewInfo=new Label(this.previewPage);this.previewInfo.wordWrapping=true;
   this.previewInfo.text="Black protects. Zoom to 1:1 and drag to inspect the spikes. The preview includes whole-mask blur.";
   this.previewPage.sizer=new VerticalSizer;this.previewPage.sizer.margin=6;this.previewPage.sizer.spacing=6;
   this.previewPage.sizer.add(this.previewViewer,100);this.previewPage.sizer.add(this.previewSource);this.previewPage.sizer.add(this.previewInfo);
   this.previewMaskBitmap=null;this.previewSourceBitmap=null;
   this.switchPreviewSource=function(v) {
      var bitmap=v?self.previewSourceBitmap:self.previewMaskBitmap;
      if(bitmap)self.previewViewer.regenerate(bitmap);
      self.previewViewer.setStatusMessage(v?"Source image — actual samples, no STF":"Mask — black protects; white allows processing");
   };
   this.previewSource.onCheck=function(v){self.switchPreviewSource(v);};
   // Discard stale previews immediately; a settings change must never leave an
   // old mask looking current. Temporary full-precision windows are closed below.
   this.clearPreview=function() {
      self.previewViewer.clear();self.previewMaskBitmap=null;self.previewSourceBitmap=null;
      self.previewSource.checked=false;self.previewSource.enabled=false;
      self.previewViewer.setStatusMessage("Preview is out of date. Click Update preview.");
   };
   this.invalidate=function(){this.analysis=null;this.clearPreview();this.status.text="Settings changed. Update preview, analyze, or create a mask.";};
   this.views.onViewSelected=function(){self.invalidate();};
   this.runAnalysis=function() {
      var view=self.views.currentView;
      if(!view||view.isNull)throw new Error("Open and select a source image first.");
      var e=new SPMEngine(view,o);e.analyze();self.analysis=e;self.sourceView=view;
      self.status.text=e.stars.length+" stars selected from "+e.candidates.length+" qualifying cores. "+
         (e.stars.length?"Create mask, or adjust the lower cutoff and analyze again.":"Lower the cutoffs to include more stars.");
      return e;
   };
   // Same native resources used by TGScriptSkeleton. Tooltips name actions;
   // no bitmap assets or external UI library are required by this package.
   this.newInstanceButton=new ToolButton(this);
   this.newInstanceButton.icon=this.scaledResource(":/process-interface/new-instance.png");
   this.newInstanceButton.setScaledFixedSize(24,24);this.newInstanceButton.toolTip="New instance: drag the triangle to the workspace to save all current settings.";
   this.analyze=new ToolButton(this);
   this.analyze.icon=this.scaledResource(":/icons/find.png");
   this.analyze.setScaledFixedSize(24,24);this.analyze.toolTip="Analyze / count stars: measure selection without rendering a mask.";
   this.previewButton=new ToolButton(this);
   this.previewButton.icon=this.scaledResource(":/toolbar/view-zoom.png");
   this.previewButton.setScaledFixedSize(24,24);this.previewButton.toolTip="Update preview: calculate the mask with all current settings, including blur.";
   this.helpButton=new ToolButton(this);
   this.helpButton.icon=this.scaledResource(":/process-interface/browse-documentation.png");
   this.helpButton.setScaledFixedSize(24,24);this.helpButton.toolTip="Help: open the Star Spike Protection Mask documentation.";
   this.helpButton.onClick=SPMShowDocumentation;
   this.create=new ToolButton(this);
   this.create.icon=this.scaledResource(":/process-interface/execute.png");
   this.create.setScaledFixedSize(24,24);this.create.toolTip="Create mask: open the full-resolution result and optionally save XISF.";
   this.closeButton=new ToolButton(this);
   this.closeButton.icon=this.scaledResource(":/process-interface/cancel.png");
   this.closeButton.setScaledFixedSize(24,24);this.closeButton.toolTip="Close: dismiss the script.";
   this.closeButton.onClick=function(){self.clearPreview();self.cancel();};
   this.exportInstance=function() {
      var view=self.views.currentView;
      o.sourceId=!view||view.isNull?"":view.id;o.saveAsXisf=self.save.checked;
      o.exportParameters();
   };
   this.newInstanceButton.onMousePress=function() {
      self.newInstanceButton.hasFocus=true;
      try{self.exportInstance();self.newInstance();}
      catch(err){self.status.text=String(err);console.warningln(String(err));}
   };
   // Keep UI controls disabled while measuring, while allowing console Abort.
   this.busy=function(b){self.parameters.enabled=!b;self.previewPage.enabled=!b;self.newInstanceButton.enabled=!b;self.previewButton.enabled=!b;self.helpButton.enabled=!b;self.analyze.enabled=!b;self.create.enabled=!b;self.closeButton.enabled=!b;};
   this.analyze.onClick=function(){
      self.busy(true);console.show();console.abortEnabled=true;
      try{self.runAnalysis();}catch(e){self.analysis=null;self.status.text=String(e);console.warningln(String(e));}
      finally{console.abortEnabled=false;self.busy(false);}
   };
   /** Compute the same full-resolution mask as Create, then display an 8-bit
    * snapshot. No preview window survives this call, including on error/abort.
    * This is explicit refresh, not continuous processing on every slider change.
    */
   this.updatePreview=function() {
      self.clearPreview();
      var temporary=null;
      try {
         var e=self.runAnalysis();temporary=e.render();
         self.previewMaskBitmap=SPMPreviewBitmap(temporary.mainView.image);
         self.previewSourceBitmap=SPMPreviewBitmap(self.sourceView.image);
         self.tabs.currentPageIndex=1;
         self.ensureLayoutUpdated();
         self.previewViewer.setImage(self.previewMaskBitmap);self.previewViewer.zoomToFit();
         self.previewSource.enabled=true;
         self.previewViewer.setStatusMessage("Mask — black protects; white allows processing");
         self.status.text=e.stars.length+" stars. Preview includes all current settings. Create mask to open and save the full-precision XISF.";
      }catch(err){self.clearPreview();throw err;}
      finally{if(temporary)temporary.forceClose();}
   };
   this.previewButton.onClick=function() {
      self.busy(true);console.show();console.abortEnabled=true;
      try{self.updatePreview();}catch(err){self.status.text=String(err);console.warningln(String(err));}
      finally{console.abortEnabled=false;self.busy(false);}
   };
   this.create.onClick=function(){
      self.busy(true);console.show();console.abortEnabled=true;
      try {
         // Reread the source: it may have been edited after an earlier count.
         var e=self.runAnalysis();
         if(!e.stars.length)throw new Error("No stars selected. Lower a cutoff or require fewer spike arms.");
         self.outputWindow=e.render();self.ok();
      }catch(err){self.analysis=null;self.status.text=String(err);console.warningln(String(err));}
      finally{console.abortEnabled=false;self.busy(false);}
   };
   this.parameters.sizer=new VerticalSizer;
   this.parameters.sizer.spacing=5;
   [this.views,this.area,this.core,this.peak,this.require,this.arms,this.contrast,this.auto,this.angle,
      this.length,this.padding,this.feather,this.halo,this.blurCheck,this.blurSigma,this.save].forEach(function(c){self.parameters.sizer.add(c);});
   this.tabs.addPage(this.parameters,"Settings");this.tabs.addPage(this.previewPage,"Mask preview");
   var buttons=new HorizontalSizer;buttons.spacing=8;buttons.add(this.newInstanceButton);buttons.add(this.previewButton);buttons.add(this.analyze);buttons.addStretch();buttons.add(this.create);buttons.add(this.closeButton);buttons.add(this.helpButton);
   this.sizer=new VerticalSizer;this.sizer.margin=12;this.sizer.spacing=10;
   this.sizer.add(this.help);this.sizer.add(this.tabs,100);this.sizer.add(this.status);this.sizer.add(buttons);
   this.setScaledMinWidth(700);this.adjustToContents();
}
}

/** Entry point: show dialog, release display caches, reveal the final mask,
 * and optionally save XISF through PixInsight's file dialog. Saving over the
 * source is rejected; cancelling Save leaves the new mask available for review.
 */
function SPMMain() {
   var o=new SPMOptions;o.importParameters();
   // Dragging an icon onto an image runs immediately on that main view. Do not
   // open a save dialog during view-target execution; leave its result open.
   if(Parameters.isViewTarget) {
      if(!Parameters.targetView||Parameters.targetView.isNull)
         throw new Error("The instance target image is no longer available.");
      var target=SPMResolveSource(o,Parameters.targetView);
      if(!target)throw new Error("The instance target image is no longer available.");
      var previousAbort=console.abortEnabled;
      console.show();console.abortEnabled=true;
      try {
         var engine=new SPMEngine(target,o);engine.analyze();
         var output=engine.render();output.show();output.zoomToFit();
         console.writeln("Mask ready: "+output.mainView.id+". Black protects. Leave Invert Mask OFF.");
      }finally{console.abortEnabled=previousAbort;}
      return;
   }
   var dialog=new SPMDialog(o);
   var accepted=false;
   try{accepted=dialog.execute();}finally{dialog.clearPreview();}
   if(!accepted||!dialog.outputWindow)return;
   var win=dialog.outputWindow;win.show();win.zoomToFit();
   console.writeln("Mask ready: "+win.mainView.id+". Black protects. Leave Invert Mask OFF.");
   if(dialog.save.checked) {
      var save=new SaveFileDialog;save.caption="Save star-spike protection mask";
      save.filters=[["XISF image","*.xisf"]];save.selectedFileExtension=".xisf";save.overwritePrompt=true;
      var path=dialog.sourceView.window.filePath;
      save.initialPath=(path.length?File.extractDrive(path)+File.extractDirectory(path)+"/":"")+win.mainView.id+".xisf";
      if(save.execute()) {
         var target=save.fileName;
         if(!/\.xisf$/i.test(target))target+=".xisf";
         if(path.length && File.fullPath(target).replace(/\\/g,'/').toLowerCase()==File.fullPath(path).replace(/\\/g,'/').toLowerCase())
            throw new Error("Choose a different filename from the source image. The mask is open and can be saved with File > Save As.");
         if(!win.saveAs(target,false,true,true,true))
            new MessageBox("The file was not saved. The mask remains open; use File > Save As.","Star Spike Protection Mask",StdIcon.Warning,StdButton.Ok).execute();
      }
   }
}
#ifndef SPM_LIBRARY
try{SPMMain();}catch(e){new MessageBox(String(e),"Star Spike Protection Mask",StdIcon.Error,StdButton.Ok).execute();}
#endif
