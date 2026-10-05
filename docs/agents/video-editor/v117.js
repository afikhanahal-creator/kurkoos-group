// ================= V117 · steady with 1,500 posts: the clarity check no longer draws full slides in the background while
//                   you work (it runs only when nothing is open, scheduled posts first, 40 at a time, at half size), posts
//                   are found by key through an index instead of a scan, the hidden legacy agent list is not re-rendered
//                   on every save, small preview canvases are served from a cache, and a failed save says so =================
(function(){
const ST={agDirty:false,pending:0,hits:0,miss:0,lastRun:0};
// 1. calPost(k): a key index, rebuilt when the posts array changes
if(typeof calPost==='function'){let M=null,A=null,N=-1,T=0;const build=()=>{M=new Map();AG.posts.forEach(p=>{if(p&&p.key&&!M.has(p.key))M.set(p.key,p)});A=AG.posts;N=AG.posts.length;T=Date.now()};
 calPost=function(k){if(typeof AG==='undefined'||!AG.posts)return undefined;if(!M||A!==AG.posts||N!==AG.posts.length||Date.now()-T>4000)build();return M.get(k)};
 ST.calReset=()=>{M=null}}
// 2. the legacy agent section (display:none) is not re-rendered; it renders once if it ever becomes visible
if(typeof renderAgent==='function'){const hidden=()=>{const ag=document.getElementById('agent');return ag&&!ag.offsetParent&&getComputedStyle(ag).display==='none'};
 renderAgent=(f=>function(){if(hidden()){ST.agDirty=true;return}ST.agDirty=false;return f.apply(this,arguments)})(renderAgent);
 const ag=document.getElementById('agent');if(ag)new MutationObserver(()=>{if(ST.agDirty&&!hidden()){try{renderAgent()}catch(e){}}}).observe(ag,{attributes:true,attributeFilter:['style','class','hidden']})}
// 3. a save that throws is reported instead of silently doing nothing
if(typeof composerSave==='function')composerSave=(f=>async function(){try{return await f.apply(this,arguments)}catch(e){console.error('composerSave',e);try{toast('השמירה נכשלה: '+String(e&&e.message||e).slice(0,90))}catch(x){}}})(composerSave);
// 4. the clarity check queue: nothing while the editor or the composer is open; scheduled posts, then hand-made posts,
//    then auto-built template posts; 40 per pass. A timer picks the next pass up when the page is idle.
const busy=()=>(window.PE&&PE.p)||(window.APP&&APP.cmp)||document.visibilityState!=='visible';
window.__v117q=function(sigOf){if(busy())return [];const sched=new Set();try{APP.sched.items.forEach(i=>{if(i.pid)sched.add(i.pid);if(i.key)sched.add('k:'+i.key)})}catch(e){}
 const spec=p=>{try{return typeof specOf==='function'?specOf(p.layout):(FX&&FX.L&&FX.L[p.layout])}catch(e){return null}};
 const a=[],b=[],c=[];AG.posts.forEach(p=>{if(!p||!spec(p)||p._ovk===sigOf(p))return;(sched.has(p.id)||(p.key&&sched.has('k:'+p.key))?a:!p.tpl?b:c).push(p)});
 ST.pending=a.length+b.length+c.length;ST.lastRun=Date.now();return a.concat(b,c).slice(0,40)};
setInterval(()=>{try{if(ST.pending>0&&!busy()&&Date.now()-ST.lastRun>30000&&window.__v73run){const go=()=>{try{__v73run()}catch(e){}};if(window.requestIdleCallback)requestIdleCallback(go,{timeout:4000});else setTimeout(go,0)}}catch(e){}},10000);
// 5. the layout tiles in the shape tab come from a small cache keyed by the clone's content, so re-opening the
//    tab or typing does not re-draw forty full-size slides
if(typeof peLayThumbs==='function'&&typeof peCanvas==='function'){const C=new Map();const MAX=120;
 const ready=p=>{try{return imgKeysOf(p).every(k=>LIBREADY[k])}catch(e){return false}};
 const sig=(p,i)=>{try{return p.id+'|'+p.layout+'|'+(i||0)+'|'+(p.format||'')+'|'+JSON.stringify(p.visual||null)+'|'+JSON.stringify(p.fx||null)}catch(e){return null}};
 const tile=(q,i)=>{const k=sig(q,i);const hit=k&&C.get(k);if(hit){ST.hits++;C.delete(k);C.set(k,hit);return hit}const c=document.createElement('canvas');c.width=432;c.height=540;try{drawSlide(c,q,i||0)}catch(e){return peCanvas(q,i||0)}ST.miss++;if(k&&ready(q)){C.set(k,c);if(C.size>MAX)C.delete(C.keys().next().value)}return c};
 peLayThumbs=function(){document.querySelectorAll('canvas[data-pe-lay]').forEach(cv=>{const L=cv.dataset.peLay;const q=peConvert(JSON.parse(JSON.stringify(PE.p)),L);ensureImgs(q).then(()=>{const b=tile(q,0);cv.getContext('2d').drawImage(b,0,0,cv.width,cv.height)})})};
 ST.cacheClear=()=>C.clear();window.__v117tile=tile}
window.__v117={ST};
})();
