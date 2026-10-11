// ================= V166 · Almoni only: every post is drawn with Almoni, in any weight
(function(){
  if(window.__v166)return;window.__v166=1;
  var FAM='Almoni, sans-serif';
  // shorthand: [style] [variant] [weight] [stretch] size[/line-height] family
  var RE=/^(.*?)(\d*\.?\d+(?:px|pt|em|rem|%|vw|vh))(\s*\/\s*\S+)?\s+(.+)$/;
  function fix(v){
    var m=RE.exec(String(v).trim());
    if(!m)return v;
    if(m[4]===FAM)return v;
    return m[1]+m[2]+(m[3]||'')+' '+FAM;
  }
  window.__v166fix=fix;
  [window.CanvasRenderingContext2D,window.OffscreenCanvasRenderingContext2D].forEach(function(C){
    if(!C)return;var P=C.prototype,d=Object.getOwnPropertyDescriptor(P,'font');
    if(!d||!d.set)return;
    Object.defineProperty(P,'font',{configurable:true,enumerable:d.enumerable,get:d.get,set:function(v){d.set.call(this,fix(v))}});
  });
  // make sure all three Almoni faces are ready before posts are drawn again
  if(document.fonts&&document.fonts.load){
    Promise.all(['300','400','700','900'].map(function(w){return document.fonts.load(w+' 40px Almoni','אבג')}))
      .then(function(){try{window.dispatchEvent(new Event('resize'))}catch(e){}});
  }
})();
