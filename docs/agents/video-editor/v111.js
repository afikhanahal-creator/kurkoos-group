// ================= V111 · speed and cache: the page stops downloading every library photo at boot (only what a visible
//                   thumbnail needs), same-origin photos, assets and data files are served from the Cache API after the
//                   first visit, and rendered thumbnails persist in IndexedDB so the gallery, the queue and the calendar
//                   paint instantly on the next visit without fetching the full photos =================
(function(){
const DAY=86400000;const CACHE='kc-cache-v1';const STATS=window.__v111={hits:0,miss:0,thumbHit:0,thumbMiss:0,stored:0,preloadSkipped:0};
// ---- 1. no eager preload of every post's photos: the first screenful only, the rest when a thumbnail scrolls into view
if(typeof preloadPosts==='function'){const orig=preloadPosts;preloadPosts=async function(list){if(!Array.isArray(list))return orig.apply(this,arguments);if(list.length>12){STATS.preloadSkipped+=list.length-12;list=list.slice(0,12)}return orig.call(this,list)}}
// a post whose photo arrives through ensureImgs gets it registered the way preloadPosts would have
if(typeof ensureImgs==='function'){const orig=ensureImgs;ensureImgs=async function(p){const r=await orig.apply(this,arguments);try{if(p&&p.photoKey&&!PHOTOS[p.id]&&LIBREADY[p.photoKey])PHOTOS[p.id]=LIBREADY[p.photoKey]}catch(e){}return r}}
// ---- 2. Cache API in front of fetch for same-origin media and data files
const cacheable=u=>{try{const x=new URL(u,location.href);if(x.origin!==location.origin)return null;const p=x.pathname;if(/\/_blob\//.test(p)||/\/photos\//.test(p)||/\.(jpe?g|png|webp|gif|svg|mp4|woff2?|ttf|otf)$/i.test(p))return 'immutable';if(/\.json$/i.test(p))return 'swr';return null}catch(e){return null}};
let cacheP=null;function cache(){if(!('caches' in window))return Promise.resolve(null);if(!cacheP)cacheP=caches.open(CACHE).catch(()=>null);return cacheP}
const realFetch=window.fetch.bind(window);
window.fetch=async function(input,init){const u=typeof input==='string'?input:(input&&input.url)||'';const m=(!init||!init.method||init.method==='GET')&&typeof u==='string'?cacheable(u):null;if(!m)return realFetch(input,init);
 const c=await cache();if(!c)return realFetch(input,init);
 try{const hit=await c.match(u);if(hit){STATS.hits++;if(m==='swr'){realFetch(input,init).then(r=>{if(r&&r.ok)c.put(u,r.clone()).catch(()=>{})}).catch(()=>{})}return hit}}catch(e){}
 const r=await realFetch(input,init);try{if(r&&r.ok&&r.status===200)c.put(u,r.clone()).catch(()=>{})}catch(e){}STATS.miss++;return r};
// ---- 3. thumbnails that survive a reload
let dbP=null;function tdb(){if(!('indexedDB' in window))return Promise.resolve(null);if(!dbP)dbP=new Promise(res=>{try{const r=indexedDB.open('kurkoos_thumbs',1);r.onupgradeneeded=()=>{const s=r.result.createObjectStore('t',{keyPath:'k'});s.createIndex('t','t')};r.onsuccess=()=>res(r.result);r.onerror=()=>res(null);r.onblocked=()=>res(null)}catch(e){res(null)}});return dbP}
function tget(k){return tdb().then(db=>db?new Promise(res=>{try{const q=db.transaction('t').objectStore('t').get(k);q.onsuccess=()=>res(q.result||null);q.onerror=()=>res(null)}catch(e){res(null)}}):null)}
function tput(k,blob){return tdb().then(db=>{if(!db)return;try{db.transaction('t','readwrite').objectStore('t').put({k,blob,t:Date.now()});STATS.stored++}catch(e){}})}
function tprune(){tdb().then(db=>{if(!db)return;try{const idx=db.transaction('t','readwrite').objectStore('t').index('t');const lim=Date.now()-45*DAY;idx.openCursor(IDBKeyRange.upperBound(lim)).onsuccess=e=>{const c=e.target.result;if(c){c.delete();c.continue()}}}catch(e){}})}
function sizeFor(cv){const w=cv.clientWidth?Math.round(cv.clientWidth*2):216;return [w,Math.round(w*1.25)]}
function drawBlob(cv,blob){return (window.createImageBitmap?createImageBitmap(blob):Promise.reject()).then(bm=>{const [w,h]=sizeFor(cv);cv.width=w;cv.height=h;cv.getContext('2d').drawImage(bm,0,0,w,h);bm.close&&bm.close();return true}).catch(()=>new Promise(res=>{const i=new Image();i.onload=()=>{const [w,h]=sizeFor(cv);cv.width=w;cv.height=h;cv.getContext('2d').drawImage(i,0,0,w,h);URL.revokeObjectURL(i.src);res(true)};i.onerror=()=>res(false);i.src=URL.createObjectURL(blob)}))}
function store(cv,k){try{if(!cv.width)return;cv.toBlob(b=>{if(b)tput(k,b)},'image/jpeg',.82)}catch(e){}}
if(typeof paintOne==='function'&&typeof sigOf==='function'&&typeof thumb==='function'){const orig=paintOne;paintOne=function(cv){
 if(!cv||!cv.dataset||!cv.dataset.tp)return orig.apply(this,arguments);
 const p=AG.posts.find(x=>x.id===cv.dataset.tp);if(!p)return orig.apply(this,arguments);
 const s=+(cv.dataset.s||0);const k=sigOf(p,s);
 if(TC.has(k)){thumb(cv,p,s);return}
 tget(k).then(rec=>{if(!cv.isConnected)return;if(rec&&rec.blob){STATS.thumbHit++;return drawBlob(cv,rec.blob).then(ok=>{if(!ok)orig(cv)})}
  STATS.thumbMiss++;return ensureImgs(p).then(()=>{if(!cv.isConnected)return;thumb(cv,p,s);store(cv,k)})}).catch(()=>orig(cv))}}
// a saved edit invalidates by signature (the key changes), old entries age out
setTimeout(tprune,15000);
})();
