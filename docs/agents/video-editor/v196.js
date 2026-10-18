/*V196:START*/
// ================= V196 · speed: the engine opens sooner and every page answers faster on a phone. Measured on an
// emulated iPhone 13 with the CPU slowed twice and 120 ms per request. The big costs were work the app did again and
// again with the same answer: the bridge copied every post it read and wrote the whole library back to the browser
// cache although nothing had changed; two quality caches sat on top of each other and built the same long key twice for
// every post on every render; the undo history copied the whole library (about 14 MB of text) after every cloud load;
// and the library, which no longer fits in the browser's local storage, was turned into text and refused again a few
// seconds after every change. The fixes sit where the work is done (bridge.js, v195.js, build196.py). This block:
// 1 skips the local storage writes that cannot fit, 2 says "טוען פוסטים" instead of "0 פוסטים" while loading, 3 holds
// data driven renders while the scores are taken in slices, 4 paints the page a person taps in the very next frame.
(()=>{
if(window.__v196)return;window.__v196=1;
const view=()=>{try{return APP.view||''}catch(e){return ''}};

/* ---------- 1 · local storage: a write that cannot fit is not attempted ---------- */
// The posts (about 14 MB as text) and the approvals (about 9 MB) are far above what a browser keeps for one site
// (Safari 5 MB, Chrome 5 million characters). Every flush turned them into text and the browser refused them, a long
// pause each time, also when the page is hidden. Both live in the cloud and in the bridge's IndexedDB cache, so the
// write is skipped when its size, estimated from a sample of the items, is clearly above the limit; the warning that
// local storage is full still shows once, as before. Smaller libraries are written exactly as before.
const BIG=['ag_posts','pro_wf'];const LIMIT=5.6e6;const skipped=new Set();
function estimate(v){if(!v||typeof v!=='object')return null;const arr=Array.isArray(v);const keys=arr?null:Object.keys(v);const n=arr?v.length:keys.length;if(n<500)return null;
 const step=Math.max(1,Math.floor(n/200));let sum=0,c=0;for(let i=0;i<n;i+=step){const x=arr?v[i]:v[keys[i]];let j;try{j=JSON.stringify(x)}catch(e){return null}sum+=(j?j.length:4)+(arr?1:keys[i].length+4);c++}
 return c?sum/c*n:null}
if(typeof __lsFlush==='function'&&typeof __LSP!=='undefined'){
 __lsFlush=(f=>function(){try{for(const k of BIG){if(!__LSP.has(k))continue;const e=estimate(__LSP.get(k));if(e!=null&&e>LIMIT){__LSP.delete(k);if(!skipped.has(k)){skipped.add(k);console.info('v196: '+k+' is about '+Math.round(e/1e6)+'M characters, kept in the cloud and the IndexedDB cache, not in local storage')}try{v31StorageWarn()}catch(x){}}}}catch(e){}return f.apply(this,arguments)})(__lsFlush);
}

/* ---------- 2 · while the posts load, the count says so ---------- */
function count(){if(view()!=='gallery'||window.__v31loaded)return;const box=document.getElementById('appviews');if(!box||!box.querySelector('.v195sk'))return;
 const c=box.querySelector('.v170cnt');if(c&&c.textContent!=='טוען פוסטים'){c.textContent='טוען פוסטים';c.classList.add('v196wait')}}

/* ---------- 3 · one render after the scores are in ---------- */
// While V195 takes the scores of the whole library in slices (the skeleton cards show), a render asked for by data that
// arrives meanwhile (the approvals, the photos) would score the rest in one long freeze. Those renders wait and run once
// when the slices are done (at most 6 s). A render asked for by the person (go, the bottom bar, the menu) runs at once.
let pre=false,pending=false,inGo=0,preT=0;
// (when the slices finish, V195 renders anyway, so a waiting render is only run here when the 6 s limit ends the wait)
function release(late){if(!pre)return;pre=false;clearTimeout(preT);const w=pending;pending=false;if(w&&late){try{render()}catch(e){console.warn('v196',e)}}}
if(typeof window.__v196prescore==='function'){const p0=window.__v196prescore;window.__v196prescore=function(){pre=true;clearTimeout(preT);preT=setTimeout(()=>release(true),6000);
 const r=p0.apply(this,arguments);Promise.resolve(r).then(()=>release(false),()=>release(true));return r}}
/* ---------- 4 · a tap on the navigation answers in the next frame ---------- */
// A page is drawn in one go by render(), which takes from a tenth of a second (Afik) to more than one second (Posts,
// Templates, Competitors) on a phone. When a person taps the bottom bar, the menu or the back arrow, the page they asked
// for shows in the very next frame: the title, the highlighted tab, and the page as it was when they left it (the same
// elements, kept aside with their pictures, for the last three pages), or calm skeleton rows on a first visit. The full
// render runs right after that frame and replaces it. Every other render (code, data, tests) stays synchronous.
let intent=null,shown='',defer=null;const CACHE=new Map();const KEEPN=3;
const NAVSEL='#v99nav [data-v99nav],#side [data-view]:not([data-app]),#v102back';
addEventListener('popstate',()=>{intent={v:''};setTimeout(()=>{intent=null},0)},true);
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest(NAVSEL);if(!b)return;const v=b.id==='v102back'?'':(b.dataset.v99nav||b.dataset.view||'');if(v==='__menu')return;
 intent={v};setTimeout(()=>{intent=null},0)},true);
const box=()=>document.getElementById('appviews');
function stash(){const b=box();if(!b||!shown||defer||!b.firstChild)return;const f=document.createDocumentFragment();while(b.firstChild)f.appendChild(b.firstChild);CACHE.delete(shown);CACHE.set(shown,f);while(CACHE.size>KEEPN)CACHE.delete(CACHE.keys().next().value)}
function skel(){const d=document.createElement('div');d.className='v196sk';d.setAttribute('role','status');d.setAttribute('aria-label','טוען');d.innerHTML='<i></i><i></i><i></i><i></i><i></i>';return d}
function instant(v){const b=box();if(!b)return false;stash();const f=CACHE.get(v);CACHE.delete(v);b.textContent='';b.appendChild(f||skel());
 try{const t=(typeof VTITLE!=='undefined'&&VTITLE[v])||['',''];const vt=document.getElementById('vt'),vs=document.getElementById('vs');if(vt)vt.textContent=t[0];if(vs)vs.textContent=t[1]}catch(e){}
 const act=document.getElementById('vact');if(act)act.textContent='';
 // the pages kept in the old sections (Create and the like) are hidden as every render does; the render shows its own
 document.querySelectorAll('.wrap > section').forEach(x=>x.classList.add('view-hidden'));
 document.querySelectorAll('#v99nav [data-v99nav],#sidenav [data-view]').forEach(x=>{if((x.dataset.v99nav||x.dataset.view)===v)x.setAttribute('aria-current','page');else x.removeAttribute('aria-current')});
 return true}
function gate(){if(gate.done)return;gate.done=1;
 try{render=(f=>function(){const v=view();const nav=!!intent&&(!intent.v||intent.v===v)&&v!==shown&&!!shown;
   if(pre&&!inGo&&!nav){pending=true;return}
   if(nav&&!(typeof PE!=='undefined'&&PE&&PE.p)&&instant(v)){intent=null;const self=this,args=arguments;const tok={v};defer=tok;window.__v196t={v,instant:performance.now()};
    requestAnimationFrame(()=>setTimeout(()=>{if(defer!==tok)return;defer=null;try{f.apply(self,args)}catch(e){console.warn('v196 render',e)}shown=view();try{const b=box();b&&b.querySelectorAll(':scope>.v196sk').forEach(x=>x.remove())}catch(e){}if(window.__v196t&&window.__v196t.v===v)window.__v196t.full=performance.now()},0));return}
   defer=null;const r=f.apply(this,arguments);shown=view();return r})(render)}catch(e){}
 try{go=(f=>function(){inGo++;try{return f.apply(this,arguments)}finally{inGo--}})(go)}catch(e){}}
// after every module has wrapped render, so the gate is the outermost layer
setTimeout(gate,0);

function after(){try{count()}catch(e){}}
try{render=(f=>function(){const r=f.apply(this,arguments);after();return r})(render)}catch(e){}
window.__v196={estimate,skipped,count,busy:()=>pre};
})();
/*V196:END*/
