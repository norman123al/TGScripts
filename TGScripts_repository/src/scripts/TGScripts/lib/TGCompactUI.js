/* TGScripts compact interfaces, 2026. Copyright (C) Thorsten Glebe.
 * Distributed under the GNU General Public License, version 3 or later.
 */
#ifndef __TGCompactUI_js
#define __TGCompactUI_js
function TG_valid(v) { return v != null && !v.isNull; }
function TG_unique(base) { var id=base,n=1; while(TG_valid(View.viewById(id))) id=base+'_'+n++; return id; }
function TG_bound(x,a,b,d) { return isFinite(x) ? Math.max(a,Math.min(b,x)) : d; }
function TG_close(w) { if(TG_valid(w)) w.forceClose(); }
function TG_checked(p,v) { if(data.cancel)throw Error('Processing cancelled.');if(!p.executeOn(v,false)) throw Error('Processing failed or was cancelled. See the Process Console.');if(data.cancel)throw Error('Processing cancelled.'); }
function TG_samples(v,c) { var a=new Float64Array(v.image.width*v.image.height); v.image.getSamples(a,new Rect(0,0,v.image.width,v.image.height),c||0); return a; }
function TG_copyImage(image,id,rect,channel)
{
   rect=rect||new Rect(0,0,image.width,image.height);
   var single=channel!==undefined;
   var w=new ImageWindow(rect.width,rect.height,single?1:image.numberOfChannels,image.bitsPerSample,
      image.sampleType==PixelSampleType.Float,single?false:image.isColor,TG_unique(id));
   try {
      w.mainView.beginProcess(UndoFlag.NoSwapFile);
      try { w.mainView.image.apply(image,ImageOp.Mov,new Point(0,0),0,rect,single?channel:0,single?channel:image.numberOfChannels-1); }
      finally { w.mainView.endProcess(); }
      return w;
   } catch(e) { TG_close(w); throw e; }
}
function TG_copy(view,id,rect)
{
   var w=TG_copyImage(view.image,id,rect);
   w.mainView.stf=view.stf; w.rgbWorkingSpace=view.window.rgbWorkingSpace;
   if(!rect) w.keywords=view.window.keywords;
   return w;
}
function TG_restoreAlpha(view,source,rect)
{
   var im=source.image,first=im.numberOfNominalChannels;
   if(first==im.numberOfChannels) return;
   rect=rect||new Rect(0,0,im.width,im.height);
   view.beginProcess(UndoFlag.NoSwapFile);
   try {
      if(view.image.numberOfChannels<im.numberOfChannels) view.image.createAlphaChannels(im.numberOfChannels-view.image.numberOfChannels);
      view.image.apply(im,ImageOp.Mov,new Point(0,0),first,rect,first,im.numberOfChannels-1);
   } finally { view.endProcess(); }
}
function TG_commit(target,result)
{
   target.beginProcess();
   try { target.image.apply(result.image,ImageOp.Mov,new Point(0,0),0,new Rect(0,0,result.image.width,result.image.height),0,result.image.numberOfNominalChannels-1); }
   finally { target.endProcess(); }
}
function TG_group(parent,title)
{
   var g=new GroupBox(parent); g.title=title; g.sizer=new VerticalSizer; g.sizer.margin=8; g.sizer.spacing=6; return g;
}
function TG_label(parent,text) { var l=new Label(parent);l.text=text;l.wordWrapping=true;return l; }
function TG_row(parent,text,control)
{
   var l=new Label(parent);l.text=text;l.setScaledFixedWidth(82);l.textAlignment=TextAlignment.Right|TextAlignment.VertCenter;
   var s=new HorizontalSizer;s.spacing=4;s.add(l);s.add(control,100);return s;
}
function TG_number(parent,text,min,max,precision,value,update)
{
   var c=new NumericControl(parent);c.label.text=text;c.label.setScaledFixedWidth(82);c.edit.setScaledFixedWidth(50);
   c.slider.setRange(0,100);c.slider.setScaledMinWidth(100);c.setReal(true);c.setRange(min,max);c.setPrecision(precision);c.setValue(value);c.onValueUpdated=update;parent.sizer.add(c);return c;
}
function TG_combo(parent,text,names,value,update)
{
   var c=new ComboBox(parent);names.forEach(x=>c.addItem(x));c.currentItem=value;c.onItemSelected=update;parent.sizer.add(TG_row(parent,text,c));return c;
}
function TG_spin(parent,text,min,max,value,update)
{
   var c=new SpinBox(parent);c.minValue=min;c.maxValue=max;c.value=value;c.onValueUpdated=update;c.setScaledFixedWidth(70);
   var r=TG_row(parent,text,c);r.addStretch();parent.sizer.add(r);return c;
}
function TG_check(parent,text,value,update) { var c=new CheckBox(parent);c.text=text;c.checked=value;c.onCheck=update;parent.sizer.add(c);return c; }
function TG_error(e,title) { (new MessageBox(String(e.message||e),title,StdIcon.Warning,StdButton.Ok)).execute(); }
function TG_help(file,name)
{
   var dir=File.extractDrive(file)+File.extractDirectory(file);
   var paths=[dir+'/../../../doc/scripts/'+name+'/'+name+'.html',dir+'/TGScripts-install/doc/scripts/'+name+'/'+name+'.html'];
   for(var p of paths) if(File.exists(p)) { Dialog.openBrowser(p,name+' — User Guide');return; }
   Dialog.browseScriptDocumentation(name);
}
function TG_picker(dialog,title,key,accept,symbolButton)
{
   var g=TG_group(dialog,title),list=new ViewList(g),open=symbolButton?new ToolButton(g):new PushButton(g);
   dialog.viewLists.push(list);g.updating=false;
   if(symbolButton){open.icon=dialog.scaledResource(':/icons/document-open.png');open.setScaledFixedSize(24,24);}
   else open.text='Open image…';
   open.toolTip='Open an image file for '+title.toLowerCase()+'.';
   g.refresh=function() {
      if(g.updating||dialog.disposed)return;g.updating=true;
      try {
         list.getMainViews();ImageWindow.windows.forEach(w=>{try{var v=w.mainView;if(TG_valid(v)&&!accept(v))list.remove(v);}catch(e){/* A view may be closing during a notification. */}});
         list.currentView=TG_valid(data[key])?data[key]:new View;
      }finally{g.updating=false;}
   };
   list.onViewSelected=v=>{if(g.updating||dialog.busy||dialog.disposed)return;data[key]=TG_valid(v)?v:null;dialog.refresh();};
   open.onClick=()=>{
      var f=new OpenFileDialog;f.caption=title;f.multipleSelections=false;f.loadImageFilters();if(!f.execute())return;
      try { var ws=ImageWindow.open(f.filePath);ws.forEach(w=>w.show());if(!ws.length)throw Error('No image in this file.');
         if(!accept(ws[0].mainView))throw Error('This input requires '+(title.toLowerCase().indexOf('rgb')>=0?'an RGB':'a grayscale')+' image.');
         data[key]=ws[0].mainView;dialog.refresh();
      }catch(e){TG_error(e,dialog.windowTitle);}
   };
   var r=new HorizontalSizer;r.spacing=6;r.add(list,100);r.add(open);g.sizer.add(r);g.list=list;g.openButton=open;g.refresh();return g;
}
function TG_setup(dialog,title,version,intro)
{
   dialog.windowTitle=title+' '+version;dialog.setScaledFixedWidth(420);dialog.busy=false;dialog.disposed=false;dialog.viewLists=[];
   dialog.dispose=function(){this.disposed=true;this.viewLists.forEach(list=>list.onViewSelected=null);};
   dialog.sizer=new VerticalSizer;dialog.sizer.margin=10;dialog.sizer.spacing=8;
   dialog.sizer.add(TG_label(dialog,intro));dialog.groups=[];
   dialog.addGroup=function(g){this.groups.push(g);this.sizer.add(g);};
   dialog.run=function(action){
      if(this.busy)return;this.busy=true;data.cancel=false;this.groups.forEach(g=>g.enabled=false);
      this.apply.enabled=this.reset.enabled=this.instance.enabled=this.help.enabled=false;
      if(this.previewAction)this.previewAction.enabled=false;
      this.close.toolTip='Cancel processing';this.status.text='Processing…';
      try { Console.show();var result=action();this.refresh();this.status.text=result?'Created: '+result.mainView.id:(data.cancel?'Cancelled.':'Finished.'); }
      catch(e){this.status.text=data.cancel?'Cancelled.':'No result created.';if(!data.cancel)TG_error(e,this.windowTitle);}
      finally{this.busy=false;data.cancel=false;this.groups.forEach(g=>g.enabled=true);this.reset.enabled=this.instance.enabled=this.help.enabled=true;this.close.toolTip='Close';this.refresh(false);Console.hide();}
   };
   dialog.onClose=function(){if(this.busy){data.cancel=true;this.status.text='Cancelling…';return false;}this.dispose();return true;};
}
function TG_finish(dialog,file,name,apply,reset,preview)
{
   dialog.status=TG_label(dialog,'Select an image when ready.');dialog.status.minHeight=2*dialog.font.height;dialog.sizer.add(dialog.status);
   var row=new HorizontalSizer;row.spacing=8;
   function tool(icon,tip,action) {var b=new ToolButton(dialog);b.icon=dialog.scaledResource(':/process-interface/'+icon+'.png');b.setScaledFixedSize(24,24);b.toolTip=tip;b.onClick=action;return b;}
   dialog.instance=tool('new-instance','Drag to save settings.',()=>{});
   dialog.instance.onMousePress=()=>{data.exportParameters();dialog.newInstance();};
   dialog.reset=tool('reset','Reset settings; retain selected images.',reset);
   dialog.apply=tool('execute','Apply and keep this dialog open.',()=>dialog.run(apply));
   dialog.close=tool('cancel','Close',()=>{if(dialog.busy){data.cancel=true;dialog.status.text='Cancelling…';}else dialog.cancel();});
   dialog.help=tool('browse-documentation','Open the PiDoc user guide.',()=>TG_help(file,name));
   row.add(dialog.instance);row.add(dialog.reset);
   if(preview){dialog.previewAction=tool('execute',preview.toolTip,()=>dialog.run(preview.action));dialog.previewAction.icon=dialog.scaledResource(':/toolbar/view-zoom.png');row.add(dialog.previewAction);}
   row.addStretch();row.add(dialog.apply);row.add(dialog.close);row.add(dialog.help);dialog.sizer.add(row);
   dialog.refresh();dialog.adjustToContents();dialog.setFixedSize();
}
// Numeric specifications: [default, minimum, maximum, integer].
function TG_settings(owner,spec,booleans,strings,legacyViews)
{
   owner.reset=function(){Object.keys(spec).forEach(k=>owner[k]=spec[k][0]);Object.keys(booleans).forEach(k=>owner[k]=booleans[k]);Object.keys(strings).forEach(k=>owner[k]=strings[k]);};owner.reset();
   owner.exportParameters=function(){Parameters.clear();Object.keys(spec).concat(Object.keys(booleans),Object.keys(strings)).forEach(k=>Parameters.set(k,owner[k]));};
   owner.importParameters=function(){
      Object.keys(spec).forEach(k=>{if(Parameters.has(k)){var s=spec[k],v=TG_bound(Parameters.getReal(k),s[1],s[2],s[0]);owner[k]=s[3]?Math.round(v):v;}});
      Object.keys(booleans).forEach(k=>{if(Parameters.has(k))owner[k]=Parameters.getBoolean(k);});
      Object.keys(strings).forEach(k=>{if(Parameters.has(k))owner[k]=Parameters.getString(k);});
      Object.keys(legacyViews).forEach(k=>{if(Parameters.has(k)){var v=View.viewById(Parameters.getString(k));if(TG_valid(v))owner[legacyViews[k]]=v;}});
   };
}
function TG_main(DialogType,key,accept,run)
{
   Console.hide();if(Parameters.isGlobalTarget||Parameters.isViewTarget)data.importParameters();
   if(Parameters.isViewTarget){data[key]=Parameters.targetView;run();return;}
   var w=ImageWindow.activeWindow;
   if(!TG_valid(data[key])&&TG_valid(w)&&accept(w.mainView))data[key]=w.mainView;
   var dialog=new DialogType;try{dialog.execute();}finally{dialog.dispose();}
}
#endif
