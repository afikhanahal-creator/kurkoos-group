// ================= V166 · Almoni only, every real weight, nothing too small
//   Every line in a post is drawn in Almoni (or the narrow Almoni Tzar the voices use), in the nearest weight that is
//   actually loaded (built in 300/400/700 plus the uploaded Neue 300 to 900 and Tzar 700/800). Runs after the
//   typographic voices (V151) so the last word is: no line under 26px, and Light only from 34px up.
(function(){
  if(window.__v166)return;window.__v166=1;
  var MIN=26, LIGHT_MIN=34;
  var RE=/^(.*?)(\d*\.?\d+)(px|pt|em|rem|%|vw|vh)(\s*\/\s*\S+)?\s+(.+)$/;
  var cache=null;
  function loaded(){if(cache)return cache;var o={Almoni:{},'Almoni Tzar':{}};
    try{document.fonts.forEach(function(f){var fam=f.family.replace(/["']/g,'');if(!o[fam]||f.status==='error')return;
      var r=String(f.weight).split(' ').map(Number).filter(Boolean);if(!r.length)return;
      for(var w=r[0];w<=(r[1]||r[0]);w+=100)o[fam][w]=1})}catch(e){}
    if(!Object.keys(o.Almoni).length)o.Almoni={300:1,400:1,700:1};
    cache={Almoni:Object.keys(o.Almoni).map(Number).sort(function(a,b){return a-b}),Tzar:Object.keys(o['Almoni Tzar']).map(Number).sort(function(a,b){return a-b})};return cache}
  try{document.fonts.addEventListener('loadingdone',function(){cache=null})}catch(e){}
  function snap(w,list){if(!list.length)return w;var best=list[0];list.forEach(function(x){var d=Math.abs(x-w),bd=Math.abs(best-w);if(d<bd||(d===bd&&x>best&&w>=500))best=x});return best}
  function fix(v,post){
    var m=RE.exec(String(v).trim());if(!m)return v;
    var fam=m[5].replace(/["']/g,'');var tz=/^\s*Almoni Tzar\b/i.test(fam);
    var L=loaded();if(tz&&!L.Tzar.length)tz=false;
    var pre=m[1].replace(/\bbolder\b/i,'700').replace(/\bbold\b/i,'700').replace(/\blighter\b/i,'300').replace(/\bnormal\b/ig,' ');
    var wm=/\b([1-9]00)\b/.exec(pre),w=wm?+wm[1]:400;pre=pre.replace(/\b[1-9]00\b/,'').replace(/\s+/g,' ').trim();
    var size=+m[2];
    if(post&&m[3]==='px'){if(size<MIN)size=MIN;if(w<=350&&size<LIGHT_MIN)w=400}
    w=snap(w,tz?L.Tzar:L.Almoni);
    return (pre?pre+' ':'')+w+' '+size+m[3]+(m[4]||'')+' '+(tz?'"Almoni Tzar", Almoni, sans-serif':'Almoni, sans-serif');
  }
  window.__v166fix=fix;
  [window.CanvasRenderingContext2D,window.OffscreenCanvasRenderingContext2D].forEach(function(C){
    if(!C)return;var P=C.prototype,d=Object.getOwnPropertyDescriptor(P,'font');if(!d||!d.set)return;
    Object.defineProperty(P,'font',{configurable:true,enumerable:d.enumerable,get:d.get,set:function(v){
      var c=this.canvas,post=!!(c&&c.width>=1000);
      d.set.call(this,fix(v,post));               // the voices (V151) may still adjust it
      var cur=d.get.call(this),f2=fix(cur,post);   // then the floor and the family get the last word
      if(f2!==cur&&c){var o=c.__v151;c.__v151=false;try{d.set.call(this,f2)}finally{c.__v151=o}}
    }});
  });
})();
// ================= V166b · the logo never sits on text: when it is auto placed, it moves to a corner with no text
(function(){
  if(window.__v166b)return;window.__v166b=1;
  var W=1080,H=1350,SAFE=36;
  var REC=null,LAST=null; // text boxes of the post being drawn (and of the last one finished), in post units
  var C2=CanvasRenderingContext2D.prototype;
  function box(ctx,t,x,y){
    var c=ctx.canvas;if(!REC||!c||REC.cv!==c)return;var s=c.width/W;if(!s)return;
    var mt=ctx.measureText(String(t)),w=mt.width;var m=/(\d*\.?\d+)px/.exec(ctx.font),sz=m?+m[1]:16;
    var al=ctx.textAlign,rtl=ctx.direction==='rtl'||(ctx.direction==='inherit'&&document.dir==='rtl');
    if(al==='start')al=rtl?'right':'left';if(al==='end')al=rtl?'left':'right';
    var x0=al==='right'?x-w:al==='center'?x-w/2:x;var bl=ctx.textBaseline,y0=bl==='top'||bl==='hanging'?y:bl==='middle'?y-sz/2:bl==='bottom'||bl==='ideographic'?y-sz:y-sz*.85;
    var T=ctx.getTransform(),pts=[[x0,y0],[x0+w,y0],[x0,y0+sz],[x0+w,y0+sz]].map(function(q){return [(T.a*q[0]+T.c*q[1]+T.e)/s,(T.b*q[0]+T.d*q[1]+T.f)/s]});
    var xs=pts.map(function(q){return q[0]}),ys=pts.map(function(q){return q[1]});
    var b={x:Math.min.apply(0,xs),y:Math.min.apply(0,ys)};b.w=Math.max.apply(0,xs)-b.x;b.h=Math.max.apply(0,ys)-b.y;
    if(b.w>2&&b.h>2&&ctx.globalAlpha>.15)REC.boxes.push(b)}
  ['fillText','strokeText'].forEach(function(fn){var o=C2[fn];C2[fn]=function(t,x,y){try{if(REC)box(this,t,x,y)}catch(e){}return o.apply(this,arguments)}});
  function over(a,b,pad){return a.x<b.x+b.w+pad&&a.x+a.w+pad>b.x&&a.y<b.y+b.h+pad&&a.y+a.h+pad>b.y}
  function hits(r){var n=0;REC.boxes.forEach(function(b){if(over(r,b,10))n+=Math.min(r.x+r.w,b.x+b.w)-Math.max(r.x,b.x)>0?1:0});return n}
  function lumAt(ctx,r,s){try{var t=lumAt._t||(lumAt._t=document.createElement('canvas'));t.width=16;t.height=16;var tx=t.getContext('2d',{willReadFrequently:true});
    tx.drawImage(ctx.canvas,Math.max(0,r.x*s),Math.max(0,r.y*s),Math.max(1,r.w*s),Math.max(1,r.h*s),0,0,16,16);var d=tx.getImageData(0,0,16,16).data,sum=0;
    for(var i=0;i<d.length;i+=4)sum+=.2126*d[i]+.7152*d[i+1]+.0722*d[i+2];return sum/(d.length/4)}catch(e){return 255}}
  var di=C2.drawImage;
  function hitsR(R,r){var n=0;R.boxes.forEach(function(b){if(over(r,b,10))n++});return n}
  C2.drawImage=function(im){
    try{var IM=window.__lockIM||{},a=arguments,c=this.canvas;var R=REC||(LAST&&LAST.cv===c?LAST:null);
      var isLock=R&&R.auto&&c===R.cv&&a.length===5&&(im===IM.white||im===IM.black||(im&&im.tagName==='CANVAS'&&IM.black&&im.width===IM.black.naturalWidth&&im.height===IM.black.naturalHeight));
      if(isLock){var r={x:a[1],y:a[2],w:a[3],h:a[4]};
        if(hitsR(R,r)){var s=c.width/W,best=null;
          [1,.8,.65,.5].some(function(k){var w=Math.round(r.w*k),h=Math.round(r.h*k);
            var cand=[[SAFE+16,SAFE],[W-SAFE-16-w,SAFE],[SAFE+16,H-120-h],[W-SAFE-16-w,H-120-h]];
            for(var i=0;i<cand.length;i++){var q={x:cand[i][0],y:cand[i][1],w:w,h:h};if(!hitsR(R,q)){best=q;return true}}return false});
          if(best){var T=this.getTransform();this.save();this.setTransform(1,0,0,1,0,0);var dark=lumAt(this,best,s)<140;this.restore();this.setTransform(T);
            var img=im;if(im===IM.white||im===IM.black)img=dark?IM.white:IM.black;
            try{if(R.id)(window.__logoBox=window.__logoBox||{})[R.id]={x:best.x,y:best.y,w:best.w,h:best.h}}catch(e){}
            R.moved=1;return di.call(this,img,best.x,best.y,best.w,best.h)}
          // no clean corner at any size: the footer already carries the mark and the name, so leave the logo out
          try{if(R.id&&window.__logoBox)delete window.__logoBox[R.id]}catch(e){}R.moved=2;return}}
    }catch(e){}
    return di.apply(this,arguments)};
  if(typeof drawSlide==='function')drawSlide=(function(f){return function(cv,p){
    var prev=REC;var cfg=null;try{cfg=window.__logoCfg&&p?window.__logoCfg(p):null}catch(e){}
    REC={cv:cv,boxes:[],id:p&&p.id,auto:!!(cfg&&cfg.mode!=='none'&&(cfg.x==null||cfg.y==null))};
    try{return f.apply(this,arguments)}finally{LAST=REC;REC=prev}}})(drawSlide);
})();
