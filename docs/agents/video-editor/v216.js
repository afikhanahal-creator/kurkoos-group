/*V216:START*/
// ================= V216 · one logo per post. The logo layer (V49) draws the full KURKOOS GROUP logo on every post, so no
// layout stamps a second copy any more: the wide editorial lockup, the tower bars alone, or hand drawn bar marks. Whatever a
// layout tries to draw as a logo while a post is being rendered is skipped; only the logo layer's own copy stays. =================
(()=>{
if(window.__v216)return;window.__v216=1;
let IN=0;
// the editorial frame: never its own logo (the layer adds the real one)
if(typeof frame==='function')frame=(f=>function(ctx,p,c,i,n,o){return f.call(this,ctx,p,c,i,n,Object.assign({},o||{},{noLogo:true}))})(frame);
// any other path that draws one of the family logo images during a post draw is skipped
const P=CanvasRenderingContext2D.prototype;const d0=P.drawImage;
function familyLogo(im){try{return !!(IN&&im&&typeof LOGOS!=='undefined'&&LOGOS&&Object.values(LOGOS).includes(im))}catch(e){return false}}
P.drawImage=function(im){if(familyLogo(im))return;return d0.apply(this,arguments)};
if(typeof drawSlide==='function')drawSlide=(f=>function(){IN++;try{return f.apply(this,arguments)}finally{IN--}})(drawSlide);
// the tower bars alone are not the brand logo: never drawn small inside a post (the giant faint watermark of q01 stays)
if(typeof mark==='function')mark=(f=>function(c,x,y,h,col){if(IN&&typeof h==='number'&&h<200)return;return f.apply(this,arguments)})(mark);
window.__v216={get IN(){return IN},familyLogo};
})();
/*V216:END*/
