/* Compact preview controls. Copyright (C) 2026 Thorsten Glebe.
 * GNU General Public License, version 3 or later.
 */
#ifndef __TGCompactPreview_js
#define __TGCompactPreview_js
function TG_previewPicker(dialog,group,key)
{
   var list=new ViewList(group);dialog.viewLists.push(list);var updating=false;
   group.sizer.add(TG_row(group,'Preview:',list));
   list.refresh=function(){
      if(updating||dialog.disposed)return;updating=true;
      try {list.getPreviews();ImageWindow.windows.forEach(w=>w.previews.forEach(v=>{if(!TG_valid(data.targetView)||w.mainView.fullId!=data.targetView.fullId)list.remove(v);}));
         if(TG_valid(data[key])&&(!TG_valid(data.targetView)||data[key].window.mainView.fullId!=data.targetView.fullId))data[key]=null;
         list.currentView=TG_valid(data[key])?data[key]:new View;
      }finally{updating=false;}
   };
   list.onViewSelected=v=>{if(updating||dialog.busy||dialog.disposed)return;data[key]=TG_valid(v)?v:null;dialog.refresh();};return list;
}
function TG_caption(view,text,width,x,y)
{
   var bm=new Bitmap(width,24);bm.fill(0xff202020);var g=new Graphics(bm);
   try{g.font=new Font('Helvetica',9);g.pen=new Pen(0xffeeeeee);g.drawText(6,17,text);}finally{g.end();}
   view.beginProcess(UndoFlag.NoSwapFile);try{view.image.selectedPoint=new Point(x,y);view.image.blend(bm);view.image.resetSelections();}finally{view.endProcess();}
}
function TG_autoSTF(view)
{
   var med=view.computeOrFetchProperty('Median'),mad=view.computeOrFetchProperty('MAD'),n=view.image.numberOfNominalChannels,c0=0,m=0;
   for(var c=0;c<n;++c){c0+=med.at(c)-2.8*1.4826*mad.at(c);m+=med.at(c);}
   c0=Math.max(0,Math.min(1,c0/n));m=Math.mtf(.25,Math.max(0,Math.min(1,m/n-c0)));
   if(!isFinite(m)||m<=0||m>=1)m=.5;
   view.stf=[[m,c0,1,0,1],[m,c0,1,0,1],[m,c0,1,0,1],[.5,0,1,0,1]];
}
#endif
