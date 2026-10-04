// ================= V119 · speed, round three (measured on the phone profile at 4x CPU with 1,500 posts): the two big
//                   storage keys are written when the page is idle instead of inside every action, film grain is a
//                   tiled pattern instead of thousands of rectangles per slide, and helpers that forced layout on
//                   every render read a media query instead =================
(function(){
// 1. ag_posts (2.6 MB) and pro_wf (1.4 MB) are flushed on idle, 3 s after the last change, and always on pagehide
if(typeof lsSet==='function'&&typeof lsGet==='function'&&typeof __lsFlush==='function'&&typeof __LSP!=='undefined'){
 const BIG=new Set(['ag_posts','pro_wf','app_sched']);const LSB=new Map();let t=0,idle=0;
 function flushBig(){clearTimeout(t);t=0;if(idle&&window.cancelIdleCallback){try{cancelIdleCallback(idle)}catch(e){}}idle=0;if(!LSB.size)return;for(const [k,v] of LSB)__LSP.set(k,v);LSB.clear();try{__lsFlush()}catch(e){}}
 function soon(){clearTimeout(t);t=setTimeout(()=>{if(window.requestIdleCallback){idle=requestIdleCallback(flushBig,{timeout:4000})}else flushBig()},3000)}
 const set0=lsSet,get0=lsGet;
 lsSet=function(k,v){if(BIG.has(k)){LSB.set(k,v);soon();return}return set0.apply(this,arguments)};
 lsGet=function(k,d){if(LSB.has(k)){try{return JSON.parse(JSON.stringify(LSB.get(k)))}catch(e){}}return get0.apply(this,arguments)};
 window.addEventListener('pagehide',flushBig);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')flushBig()});
 window.__v119flush=flushBig}
// 2. grain tiles: one 256x256 noise tile per (alpha, seed, density), drawn as a repeating pattern
window.__grainTile=function(a,seed,den){const T=window.__grainTiles||(window.__grainTiles=new Map());const key=a+'|'+seed+'|'+den;let t=T.get(key);if(t)return t;
 t=document.createElement('canvas');t.width=t.height=256;const g=t.getContext('2d');let s=seed;const r=()=>(s=(s*16807)%2147483647)/2147483647;const n=Math.round(256*256/den);
 for(let i=0;i<n;i++){g.fillStyle=r()<.5?`rgba(255,255,255,${a*r()})`:`rgba(0,0,0,${a*r()})`;g.fillRect(r()*256,r()*256,1.5,1.5)}T.set(key,t);return t};
window.__grainFill=function(c,x,y,w,h,a,seed,den){const t=window.__grainTile(a,seed,den);c.save();c.beginPath();c.rect(x,y,w,h);c.clip();c.translate(x,y);c.fillStyle=c.createPattern(t,'repeat');c.fillRect(0,0,w,h);c.restore()};
// 3. quality scores stay cached across renders: the cache epoch changes only when posts are added or removed, a
//    schedule item is saved, or a photo is registered (the old rule cleared it on every render)
let EP=0;window.__v119bump=()=>{EP++};
window.__v119ep=function(){try{return EP+'|'+AG.posts.length+'|'+APP.sched.items.length}catch(e){return String(EP)}};
if(typeof regUpload==='function')regUpload=(f=>function(){EP++;return f.apply(this,arguments)})(regUpload);
setInterval(()=>{EP++},600000);
// 4. the quality cache is warmed in idle time after boot and after each epoch change, so the first gallery open is warm
let warmed=null,warmBusy=false;
function warm(){if(warmBusy||typeof pxQuality!=='function'||typeof AG==='undefined')return;const ep=window.__v119ep();if(ep===warmed)return;if((window.PE&&PE.p)||(window.APP&&APP.cmp))return;warmBusy=true;const list=AG.posts.slice();let i=0;
 (function step(dl){const t0=performance.now();while(i<list.length&&(dl?dl.timeRemaining()>4:performance.now()-t0<12)){try{pxQuality(list[i])}catch(e){}i++}
  if(i<list.length){if(window.requestIdleCallback)requestIdleCallback(step,{timeout:3000});else setTimeout(step,80)}else{warmed=ep;warmBusy=false}})()}
setTimeout(()=>{warm();setInterval(warm,20000)},6000);
window.__v119warm=warm;
// 5. layout tiles in the shape tab are drawn a few per frame instead of all 46 in one task
if(typeof peLayThumbs==='function'&&window.__v117tile){const Q=[];let pumping=false;
 function pump(){if(pumping)return;pumping=true;requestAnimationFrame(function frame(){const t0=performance.now();while(Q.length&&performance.now()-t0<12){const [cv,q,p0]=Q.shift();if(PE.p!==p0||!document.body.contains(cv))continue;try{const b=__v117tile(q,0);cv.getContext('2d').drawImage(b,0,0,cv.width,cv.height)}catch(e){}}if(Q.length)requestAnimationFrame(frame);else pumping=false})}
 peLayThumbs=function(){const p0=PE.p;Q.length=0;document.querySelectorAll('canvas[data-pe-lay]').forEach(cv=>{const L=cv.dataset.peLay;const q=peConvert(JSON.parse(JSON.stringify(p0)),L);ensureImgs(q).then(()=>{Q.push([cv,q,p0]);pump()})})}}
})();
