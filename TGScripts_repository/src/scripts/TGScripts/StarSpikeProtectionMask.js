#engine v8

/* Star Spike Protection Mask 1.7.1
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
var SPM_VERSION = "1.7.1";

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
   this.minArms = 2;
   this.spikeContrast = 0.025;
   this.autoAngle = true;
   this.angleDegrees = 0;
   this.maxLength = 600;
   this.coreRadiusPercent = 100;
   this.growRadius = 0;
   this.blurSigma = 0;
   this.saveAsXisf = true;
   this.sourceId = "";
}

/** Explicit instance schema: exclude caches, native views and pixel data.
 * Typed getters preserve booleans and numerical precision across icon saves.
 * Missing keys retain defaults, allowing older instances to load new options.
 */
var SPM_PARAMETER_TYPES = {
   minArea:"number",coreThreshold:"number",
   minArms:"number",spikeContrast:"number",autoAngle:"boolean",angleDegrees:"number",
   maxLength:"number",
   coreRadiusPercent:"number",growRadius:"number",blurSigma:"number",saveAsXisf:"boolean",sourceId:"string"
};
SPMOptions.prototype.exportParameters=function() {
   SPMValidate(this);
   Parameters.clear();
   Parameters.set("spmSchemaVersion",4);
   for(var key in SPM_PARAMETER_TYPES)Parameters.set(key,this[key]);
};
SPMOptions.prototype.importParameters=function() {
   if(Parameters.has("spmSchemaVersion")&&Parameters.getInteger("spmSchemaVersion")>4)
      throw new Error("This instance requires a newer version of Star Spike Protection Mask.");
   for(var key in SPM_PARAMETER_TYPES)if(Parameters.has(key)) {
      var type=SPM_PARAMETER_TYPES[key];
      this[key]=type=="boolean"?Parameters.getBoolean(key):
         type=="string"?Parameters.getString(key):Parameters.getReal(key);
   }
   // Schema 1 stored separate enable flags. Collapse disabled options to zero,
   // preserving enabled strengths. Missing flags keep
   // defaults. Obsolete peak, padding, feather and halo-floor keys are ignored;
   // version 1.5 always measures luminance profiles, including for older icons.
   if(!Parameters.has("spmSchemaVersion")||Parameters.getInteger("spmSchemaVersion")<2) {
      if(Parameters.has("requireSpikes")&&!Parameters.getBoolean("requireSpikes"))this.minArms=0;
      if(Parameters.has("blurWholeMask"))
         this.blurSigma=Parameters.getBoolean("blurWholeMask")?
            (Parameters.has("blurSigma")?Parameters.getReal("blurSigma"):2):0;
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
   range('minArms',0,4);
   range('spikeContrast',0.0001,.3); range('angleDegrees',0,90);
   range('maxLength',30,3000); range('growRadius',0,12);
   range('blurSigma',0,25); range('coreRadiusPercent',10,200);
   ['minArea','minArms','maxLength','growRadius'].forEach(function(k){
      if(Math.floor(o[k])!=o[k])throw new Error("Expected an integer setting: "+k);
   });
}

/** Snapshot native CIE Y luminance using the source RGB working space.
 * A grayscale source is copied directly. Explicit full-image rectangles and
 * saved selections ignore any ROI and leave the source and its STF untouched.
 * Native temporary luminance storage is released even on extraction failure.
 */
function SPMEngine(view, options) {
   SPMValidate(options);this.o=options;
   var im=view.image;
   if(im.isComplex)throw new Error("Complex images are not supported.");
   this.width=im.width;this.height=im.height;this.sourceId=view.id;
   this.a=new Float32Array(this.width*this.height);
   var rect=new Rect(0,0,this.width,this.height),luminance=null;
   im.pushSelections();
   try {
      im.resetSelections();
      if(im.isColor) {
         luminance=new Image;im.getLuminance(luminance,rect);
         luminance.getSamples(this.a,rect,0);
      } else im.getSamples(this.a,rect,0);
      for(var i=0;i<this.a.length;++i) {
         if(!isFinite(this.a[i]))throw new Error("Source contains non-finite luminance samples.");
         this.a[i]=Math.max(0,Math.min(1,this.a[i]));
      }
   } finally {if(luminance)luminance.free();im.popSelections();}
   SPMCheckAbort();this.candidates=[];this.stars=[];this.angle=0;
}
/** Smooth luminance-to-protection response, with zero at the noise threshold.
 * Strong signal receives full protection; faint wings fade with their signal.
 */
function SPMResponse(signal,low,high) {
   var t=Math.max(0,Math.min(1,(signal-low)/Math.max(1e-8,high-low)));
   return t*t*(3-2*t);
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
      if (area>=o.minArea && area<=100000 &&
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
 * Each arm is independent: no opposite-arm extrapolation or tip padding.
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
      star.lengths.push(seen&&ev>=o.spikeContrast?end:0);
   }
   if(star.arms<o.minArms)return false;
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
   star.background=SPMQuantile(outer,.5);
   star.coreProfile=[this.sample(star.x,star.y)].concat(radial);
   var deviations=outer.map(function(v){return Math.abs(v-star.background);});
   star.floor=Math.max(o.spikeContrast,3*1.4826*SPMQuantile(deviations,.5));
   // The radial median excludes narrow spikes and neighboring point sources.
   // It bounds the core footprint; actual local luminance supplies its shape.
   star.maskRadius=maxHalo;
   for(var r=Math.max(1,Math.floor(star.radius));r<maxHalo-2;++r)
      if(radial[r]-star.background<star.floor && radial[r+1]-star.background<star.floor) {
         star.maskRadius=r+1;break;
      }
   this.measureProfiles(star);
   return true;
};
/** Measure signed transverse luminance profiles at every pixel along each arm.
 * Three along-axis samples reject isolated noise. Outer strips estimate local
 * background and MAD noise; only the component touching the central ridge is
 * retained, excluding detached neighbors. No minimum geometric width is drawn.
 * The finite width cap is a search bound, not an output width.
 */
SPMEngine.prototype.measureProfiles=function(star) {
   var width=Math.min(32,Math.max(12,Math.ceil(star.radius))),stride=2*width+1;
   star.profileWidth=width;star.profiles=[];
   for(var arm=0;arm<4;++arm) {
      var length=Math.floor(star.lengths[arm]),data=new Float32Array((length+1)*stride);
      var angle=star.angle+arm*Math.PI/2,cs=Math.cos(angle),sn=Math.sin(angle);
      for(var r=0;length>0&&r<=length;++r) {
         var bx=star.x+r*cs,by=star.y+r*sn,side=[];
         for(var sign=-1;sign<=1;sign+=2)for(var t=width+3;t<=width+9;t+=2) {
            var v=this.sample(bx-sign*t*sn,by+sign*t*cs);if(isFinite(v))side.push(v);
         }
         if(side.length<3)continue;
         // Remove the smooth stellar halo as well as local sky, so the spike
         // component cannot repaint a wide core when Core radius is reduced.
         var radial=star.coreProfile[Math.min(r,star.coreProfile.length-1)];
         var background=Math.max(SPMQuantile(side,.25),isFinite(radial)?radial:star.background);
         var center=SPMQuantile(side.slice(),.5);
         var deviations=[];
         for(var j=0;j<side.length;++j)deviations.push(Math.abs(side[j]-center));
         var mad=SPMQuantile(deviations,.5);
         var floor=Math.max(this.o.spikeContrast,3*1.4826*mad),cut=[],peak=-1,ridge=0;
         for(var t=-width;t<=width;++t) {
            var local=[];
            for(var dr=-1;dr<=1;++dr) {
               var v=this.sample(bx+dr*cs-t*sn,by+dr*sn+t*cs);
               if(isFinite(v))local.push(v);
            }
            var signal=local.length>=2?Math.max(0,SPMQuantile(local,.5)-background):0;
            cut.push(signal);
            if(Math.abs(t)<=2&&signal>peak){peak=signal;ridge=t+width;}
         }
         if(peak<=floor)continue;
         var left=ridge,right=ridge;
         while(left>0&&cut[left-1]>floor)--left;
         while(right<stride-1&&cut[right+1]>floor)++right;
         for(var j=left;j<=right;++j)data[r*stride+j]=SPMResponse(cut[j],floor,2*floor);
         if((r&127)==0)SPMCheckAbort();
      }
      star.profiles.push(data);
   }
};
/** Bilinear lookup of measured protection in an arm's local coordinates. */
function SPMArmValue(star,arm,along,across) {
   var w=star.profileWidth,stride=2*w+1,length=Math.floor(star.lengths[arm]);
   if(length<=0||along<0||along>length||Math.abs(across)>w)return 0;
   var x=across+w,y=along,ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy;
   var jx=Math.min(ix+1,2*w),jy=Math.min(iy+1,length),a=star.profiles[arm];
   return (a[iy*stride+ix]*(1-fx)+a[iy*stride+jx]*fx)*(1-fy)+
      (a[jy*stride+ix]*(1-fx)+a[jy*stride+jx]*fx)*fy;
}
/** Populate candidates and selected stars; report counts and length-limit hits. */
SPMEngine.prototype.analyze=function() {
   this.findCores();this.stars=[];
   if(!this.candidates.length)return this.stars;
   this.findAngle();
   console.writeln("Measuring diffraction spikes...");
   for(var i=0;i<this.candidates.length;++i) {
      if(this.measureStar(this.candidates[i]))this.stars.push(this.candidates[i]);
      // PixInsight's console is not a terminal: a carriage return does not
      // reliably replace a progress line. Emit complete, newline-ended updates.
      var measured=i+1;
      if(measured%25==0||measured==this.candidates.length)
         console.writeln("Measured "+measured+" / "+this.candidates.length);
      if((i%25)==0)SPMCheckAbort();
   }
   console.writeln("Selected "+this.stars.length+" stars.");
   var capped=this.stars.filter(function(s){return s.truncated;}).length;
   if(capped)console.warningln(capped+" stars have spikes reaching the length limit. Consider increasing Maximum spike length.");
   return this.stars;
};
/** Expand black protection by an exact integer-radius digital disk.
 * This is grayscale dilation of the protection weights (1-mask), equivalently
 * grayscale erosion/minimum filtering of the black-protects mask itself.
 * One full-strength pass preserves gray weights; it does not threshold, rescale,
 * change the selected stars, or alter image dimensions. Zero is an exact bypass.
 * Runs after the core/spike union and before optional Gaussian smoothing.
 */
function SPMGrowMask(win,radius) {
   if(radius===0)return;
   if(!isFinite(radius)||Math.floor(radius)!==radius||radius<0||radius>12)
      throw new Error("Growth radius must be an integer from 0 to 12 pixels.");
   SPMCheckAbort();
   var size=2*radius+1,disk=[];
   for(var y=-radius;y<=radius;++y)for(var x=-radius;x<=radius;++x)
      disk.push(x*x+y*y<=radius*radius?1:0);
   var grow=new MorphologicalTransformation;
   grow.operator=MorphologicalTransformation.Erosion;
   grow.interlacingDistance=1;grow.lowThreshold=0;grow.highThreshold=0;
   grow.numberOfIterations=1;grow.amount=1;grow.selectionPoint=.5;
   grow.structureName="Star protection growth disk";
   grow.structureSize=size;grow.structureWayTable=[[disk]];
   console.writeln("Growing protected area by "+radius+" px...");
   if(!grow.executeOn(win.mainView))throw new Error("Mask growth did not complete.");
   SPMCheckAbort();
}

/** Union luminance-shaped cores and measured spike profiles into protection.
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
      var s=this.stars[k];
      // Radius scales only core sampling coordinates; arm measurements retain
      // their original geometry. Natural luminance falloff supplies soft edges.
      var scale=o.coreRadiusPercent/100,coreRadius=s.maskRadius*scale;
      var extent=Math.ceil(Math.max(coreRadius,Math.max.apply(null,s.lengths))+s.profileWidth+2);
      var x0=Math.max(0,Math.floor(s.x)-extent),x1=Math.min(w-1,Math.ceil(s.x)+extent);
      var y0=Math.max(0,Math.floor(s.y)-extent),y1=Math.min(h-1,Math.ceil(s.y)+extent);
      var cs=Math.cos(s.angle),sn=Math.sin(s.angle);
      // Reserve full core protection for the bright central profile; do not
      // saturate the broad faint halo to black as a geometric disk would.
      var coreHigh=Math.max(2*s.floor,.8*Math.max(0,s.peak-s.background));
      for(var y=y0;y<=y1;++y) {
         var dy=y-s.y;
         for(var x=x0;x<=x1;++x) {
            var dx=x-s.x,dist=Math.sqrt(dx*dx+dy*dy),v=0;
            if(dist<=coreRadius) {
               var signal=this.sample(s.x+dx/scale,s.y+dy/scale)-s.background;
               if(isFinite(signal))v=SPMResponse(signal,s.floor,coreHigh)*SPMFade(dist-coreRadius+scale,scale);
            }
            var u=dx*cs+dy*sn,t=-dx*sn+dy*cs;
            if(s.drawSpikes) {
               v=Math.max(v,SPMArmValue(s,u>=0?0:2,Math.abs(u),u>=0?t:-t));
               v=Math.max(v,SPMArmValue(s,t>=0?1:3,Math.abs(t),t>=0?-u:u));
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
      SPMGrowMask(win,o.growRadius);
      // Blur the completed grayscale mask, including the grown cores and spikes.
      // Native Convolution handles image boundaries and preserves mask polarity.
      if(o.blurSigma>0) {
         console.writeln("Blurring entire mask: Gaussian sigma = "+o.blurSigma+" px...");
         SPMCheckAbort();
         var blur=new Convolution;
         blur.mode=Convolution.Parametric;
         blur.sigma=o.blurSigma;blur.shape=2;blur.aspectRatio=1;blur.rotationAngle=0;
         blur.filterSource="";blur.rescaleHighPass=false;blur.viewId="";
         if(!blur.executeOn(win.mainView))throw new Error("Whole-mask blur did not complete.");
         // Native convolution may overshoot [0,1] by floating-point roundoff.
         // Clamp (never rescale) so the preview and saved XISF agree exactly.
         win.mainView.beginProcess(UndoFlag.NoSwapFile);
         try{win.mainView.image.truncate(0,1);}finally{win.mainView.endProcess();}
         SPMCheckAbort();
      }
      win.keywords=[new FITSKeyword("COMMENT","","StarSpikeProtectionMask "+SPM_VERSION+": black protects; use without mask inversion."),
         new FITSKeyword("COMMENT","","Source: "+this.sourceId+"; selected stars: "+this.stars.length),
         new FITSKeyword("COMMENT","","Core area >= "+o.minArea+" px; core level "+o.coreThreshold),
         new FITSKeyword("COMMENT","","Luminance core radius: "+o.coreRadiusPercent+"% of measured halo radius"),
         new FITSKeyword("COMMENT","","Protected-area growth radius: "+o.growRadius+" px (disk)"),
         new FITSKeyword("COMMENT","","Whole-mask Gaussian blur: "+(o.blurSigma>0?"sigma "+o.blurSigma+" px":"off"))];
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
   // Native titled GroupBoxes follow BBStarReduction's layout convention:
   // a six-pixel inner margin and four-pixel spacing, on one settings page.
   this.selectionGroup=new GroupBox(this.parameters);this.selectionGroup.title="Star selection";
   this.spikesGroup=new GroupBox(this.parameters);this.spikesGroup.title="Spike detection";
   this.maskGroup=new GroupBox(this.parameters);this.maskGroup.title="Mask settings";
   this.help=new Label(this);this.help.useRichText=true;this.help.wordWrapping=true;
   this.help.text="<b>Protect bright stars and their diffraction spikes.</b><br>"+
      "Use a stretched stars-only image. The output has black protected regions on white, with soft edges. " +
      "The source image is never changed. STF display stretches do not affect the measurements.";
   this.views=new ViewList(this.parameters);this.views.getMainViews();
   var initialView=SPMResolveSource(o,null);
   if(initialView)this.views.currentView=initialView;
   function numeric(label,key,lo,hi,precision,tip,parent) {
      var c=new NumericControl(parent||self.parameters);c.label.text=label;c.label.setFixedWidth(220);
      c.real=precision!=0;
      c.setRange(lo,hi);c.slider.setRange(0,1000);c.setPrecision(precision);c.setValue(o[key]);
      c.toolTip=tip;c.onValueUpdated=function(v){o[key]=v;self.invalidate();};return c;
   }
   this.area=numeric("Minimum bright-core area (px)",'minArea',1,10000,0,
      "Main lower cutoff. Number of connected bright pixels above the core threshold, after slight smoothing. Raise this to protect only larger/brighter stars; lower it to include smaller stars. Not a stellar magnitude.",this.selectionGroup);
   this.core=numeric("Core luminance threshold",'coreThreshold',.0001,.9999,4,
      "Normalized native luminance used to measure the bright core. 0.60 is a starting point for the stretched RGB stars image. Lower this for darker data; STF is not applied.",this.selectionGroup);
   this.arms=numeric("Required spike arms (0 = any)",'minArms',0,4,0,
      "Zero includes all qualifying bright stars. Two includes many clipped or asymmetric stars; three or four is stricter. Stars without detected arms receive only core protection.",this.selectionGroup);
   this.contrast=numeric("Minimum luminance contrast",'spikeContrast',.0001,.3,4,
      "Minimum luminance above local background for core wings and spike profiles. Raise to tighten protection; lower for faint spikes. Local noise can impose a higher threshold.",this.spikesGroup);
   this.auto=new CheckBox(this.spikesGroup);this.auto.text="Measure spike angle automatically";this.auto.checked=o.autoAngle;
   this.auto.onCheck=function(v){o.autoAngle=v;self.angle.enabled=!v;self.invalidate();};
   this.angle=numeric("Spike-axis angle (degrees)",'angleDegrees',0,90,2,
      "One of the two perpendicular spike axes, clockwise from the image's horizontal axis. Only used when automatic measurement is off.",this.spikesGroup);this.angle.enabled=!o.autoAngle;
   this.length=numeric("Maximum spike length (px)",'maxLength',30,3000,0,"Upper search limit for each independently measured spike. No extra tip margin or opposite-arm extension is added. This is a search cap, not a growth control.",this.spikesGroup);
   this.coreRadius=numeric("Core radius (%)",'coreRadiusPercent',10,200,1,
      "Scales the luminance-shaped core profile. 100% uses its measured extent; try 60% for tighter cores. Does not change star selection or spike geometry. Optional blur is applied afterward. Version 1.5 profiles differ from earlier geometric masks.",this.maskGroup);
   this.grow=numeric("Grow protected area (px)",'growRadius',0,12,0,
      "Expand all protected cores and spikes by this many pixels using a circular morphological filter. Zero leaves the measured mask unchanged. Try 2 or 3. Growth runs before whole-mask blur and does not select additional stars.",this.maskGroup);
   this.blurSigma=numeric("Whole-mask blur sigma (0 = off)",'blurSigma',0,25,1,
      "Gaussian standard deviation in pixels. Zero disables blur; try 2.0 to smooth the whole mask. Profiles already have natural soft edges; extra blur can reduce protection of narrow spikes.",this.maskGroup);
   this.save=new CheckBox(this.maskGroup);this.save.text="Offer to save the result as XISF";this.save.checked=o.saveAsXisf;
   this.save.onCheck=function(v){o.saveAsXisf=v;};
   this.status=new Label(this);this.status.wordWrapping=true;
   this.status.text="Update preview to inspect core size and count selected stars.";
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
   this.invalidate=function(){this.analysis=null;this.clearPreview();this.status.text="Settings changed. Update preview or create a mask.";};
   this.views.onViewSelected=function(){self.invalidate();};
   this.runAnalysis=function() {
      var view=self.views.currentView;
      if(!view||view.isNull)throw new Error("Open and select a source image first.");
      var e=new SPMEngine(view,o);e.analyze();self.analysis=e;self.sourceView=view;
      self.status.text=e.stars.length+" stars selected from "+e.candidates.length+" qualifying cores. "+
         (e.stars.length?"Create mask, or adjust settings and update the preview.":"Lower the cutoffs to include more stars.");
      return e;
   };
   // Same native resources used by TGScriptSkeleton. Tooltips name actions;
   // no bitmap assets or external UI library are required by this package.
   this.newInstanceButton=new ToolButton(this);
   this.newInstanceButton.icon=this.scaledResource(":/process-interface/new-instance.png");
   this.newInstanceButton.setScaledFixedSize(24,24);this.newInstanceButton.toolTip="New instance: drag the triangle to the workspace to save all current settings.";
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
   this.busy=function(b){self.parameters.enabled=!b;self.previewPage.enabled=!b;self.newInstanceButton.enabled=!b;self.previewButton.enabled=!b;self.helpButton.enabled=!b;self.create.enabled=!b;self.closeButton.enabled=!b;};
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
   this.selectionGroup.sizer=new VerticalSizer;
   this.spikesGroup.sizer=new VerticalSizer;
   this.maskGroup.sizer=new VerticalSizer;
   [this.selectionGroup,this.spikesGroup,this.maskGroup].forEach(function(group){
      group.sizer.margin=6;group.sizer.spacing=4;
   });
   [this.area,this.core,this.arms].forEach(function(c){self.selectionGroup.sizer.add(c);});
   [this.contrast,this.auto,this.angle,this.length].forEach(function(c){self.spikesGroup.sizer.add(c);});
   [this.coreRadius,this.grow,this.blurSigma,this.save].forEach(function(c){self.maskGroup.sizer.add(c);});
   this.parameters.sizer=new VerticalSizer;
   this.parameters.sizer.margin=6;this.parameters.sizer.spacing=6;
   [this.views,this.selectionGroup,this.spikesGroup,this.maskGroup].forEach(function(c){self.parameters.sizer.add(c);});
   this.parameters.sizer.addStretch();
   this.tabs.addPage(this.parameters,"Settings");this.tabs.addPage(this.previewPage,"Mask preview");
   var buttons=new HorizontalSizer;buttons.spacing=8;buttons.add(this.newInstanceButton);buttons.add(this.previewButton);buttons.addStretch();buttons.add(this.create);buttons.add(this.closeButton);buttons.add(this.helpButton);
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
