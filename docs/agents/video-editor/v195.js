/*V195:START*/
// ================= V195 · mobile 2.0: a calm header, a bottom bar that sits on the bottom, cards that read at a glance,
// and a faster start. On a phone the header keeps four controls at most: back (when there is a previous page), the
// competitor gallery (V186), "עוד" and the one primary action "+", next to a title that is no longer cut. What used to
// crowd the row (the menu, the bell, search and the page actions) is one tap away in the "עוד" sheet, the menu stays in
// the bottom bar, and the pages with their own search field (Posts, Photos) keep that one search. The shell takes its height from where Safari puts fixed bottom bars, so no
// empty band is left under the bottom bar when the toolbar collapses. The undo pill sits above the bottom bar and leaves on
// its own; the last action can still be undone from "עוד". Loading: the quality scores are cached for every post (the old
// cache held 8000 entries and the library has more, so every render scored all posts again), the cloud posts are matched
// through an index instead of a scan per post, the first posts paint before the approvals finish loading, and skeleton
// cards stand in while the posts are on the way.
(()=>{
if(window.__v195)return;window.__v195=1;
const PH=matchMedia('(max-width:860px)');
const E=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const SVG=(d,w)=>`<svg width="${w||20}" height="${w||20}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const IC={more:'<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.9"/><circle cx="12" cy="12" r="1.9"/><circle cx="19" cy="12" r="1.9"/></svg>',
 bell:SVG('<path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/>'),
 search:SVG('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
 undo:SVG('<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>'),
 menu:SVG('<path d="M4 7h16M4 12h16M4 17h16"/>'),x:SVG('<path d="M18 6 6 18M6 6l12 12"/>')};
const view=()=>{try{return APP.view||''}catch(e){return ''}};

/* ---------- 1 · speed ---------- */
// 1a · quality scores: one entry per post version for the whole library. Same key as the cache below it, big enough
// for every post. It resets when the library wide fatigue index is rebuilt (as before) and also whenever data arrives
// from the cloud or a font finishes loading, because the score reads photo details, template specs and text widths.
let dv=0;const bump=()=>{dv++};
function patchDb(db){if(!db||db.__v195)return db;db.__v195=1;
 const wrapRef=o=>{if(!o||o.__v195)return o;o.__v195=1;const g=o.get,s=o.onSnapshot;
  if(typeof g==='function')o.get=async function(){const r=await g.apply(this,arguments);bump();return r};
  if(typeof s==='function')o.onSnapshot=function(cb,er){return s.call(this,function(){bump();return cb.apply(this,arguments)},er)};return o};
 const c0=db.collection,d0=db.doc;
 if(typeof c0==='function')db.collection=function(){const o=wrapRef(c0.apply(this,arguments));if(o&&typeof o.doc==='function'&&!o.__v195d){o.__v195d=1;const od=o.doc;o.doc=function(){return wrapRef(od.apply(this,arguments))}}return o};
 if(typeof d0==='function')db.doc=function(){return wrapRef(d0.apply(this,arguments))};return db}
try{const cl=window.claude;if(cl&&typeof cl.use==='function'){const u0=cl.use;cl.use=async function(n){const r=await u0.apply(this,arguments);if(n==='db')try{patchDb(r)}catch(e){}return r};
 cl.use('db').catch(()=>null)}}catch(e){}
try{document.fonts&&document.fonts.addEventListener('loadingdone',bump)}catch(e){}
(function(){if(typeof pxQuality!=='function')return;const C=new Map();let fc=null,fdv=-1;
 const h=t=>{t=String(t||'');let x=t.length;for(let i=0;i<t.length;i+=5)x=(Math.imul(x,31)+t.charCodeAt(i))|0;return x};
 const f0=pxQuality;const inner=window.__pxqClear;
 pxQuality=function(p){try{const ep=window.__v119ep?__v119ep():(typeof PRO!=='undefined'?PRO._fc:null);if(ep!==fc||dv!==fdv){C.clear();if(dv!==fdv)try{inner&&inner()}catch(e){}fc=ep;fdv=dv}const v=p.visual||{},x=p.fx||{};
   const k=(p.id||'')+'|'+p.layout+'|'+(p.upd||'')+'|'+(v.headline||'')+'|'+(v.sub||'')+'|'+h(p.fb)+'|'+h(p.ig)+'|'+(x.num||'')+'|'+JSON.stringify(x.shot||'')+'|'+(p.article?1:0)+'|'+(p.hook||'')+'|'+(p.format||'');
   let r=C.get(k);if(!r){r=f0.apply(this,arguments);C.set(k,r);if(C.size>60000)C.delete(C.keys().next().value)}return r}catch(e){return f0.apply(this,arguments)}};
 window.__pxqClear=()=>{C.clear();try{inner&&inner()}catch(e){}}})();

// 1b · the cloud posts (V31) with an index: the same rules, without scanning the whole library once per post.
// V37 wrapped the load to drop deleted posts (tombstones) afterwards; that step is kept here.
if(typeof v31Load==='function'&&typeof SYNC!=='undefined'&&typeof v31Id==='function'){
 const gone=()=>{try{return lsGet('v37_gone',[])||[]}catch(e){return []}};
 const keysOf=p=>[p.id,p.key,p.draftId,v31Id(p)].filter(Boolean);
 function purge(){const g=new Set(gone());if(!g.size)return 0;const before=AG.posts.length;AG.posts=AG.posts.filter(p=>!keysOf(p).some(k=>g.has(k)));return before-AG.posts.length}
 // buckets keep the posts in library order, so the first one in a bucket is the one findIndex would return
 let K,I,S,dirty=true;
 const add=(m,k,p,front)=>{let a=m.get(k);if(!a){a=[];m.set(k,a)}front?a.unshift(p):a.push(p)};
 const del=(m,k,p)=>{const a=m.get(k);if(!a)return;const i=a.indexOf(p);if(i>=0)a.splice(i,1);if(!a.length)m.delete(k)};
 function build(){K=new Map();I=new Map();S=new Map();for(const p of AG.posts){if(!p)continue;if(p.key)add(K,p.key,p);add(I,p.id,p);add(S,v31Id(p),p)}dirty=false}
 function match(q){if(dirty)build();const a=q.key?((K.get(q.key)||[])[0]):null;const b=(I.get(q.id)||[])[0];
  if(a&&b&&a!==b)return AG.posts.indexOf(a)<AG.posts.indexOf(b)?a:b;return a||b||null}
 async function core(){const db=APP.db;if(!db)return 0;let snap;try{snap=await db.collection('posts').get()}catch(e){console.warn('posts load',e);return 0}
  let changed=0;const killed=new Set(lsGet('v28_kill',[])||[]);dirty=true;
  snap.docs.forEach(d=>{const v=d.data();if(!v)return;const id=d.id;
   if(v.removed||!v.p){if(dirty)build();const o=(S.get(id)||[])[0];if(o){const i=AG.posts.indexOf(o);if(i>=0){AG.posts.splice(i,1);changed++;if(o.key)del(K,o.key,o);del(I,o.id,o);del(S,id,o)}}SYNC.h[id]='x';return}
   const q=v.p;if(!q||!q.visual||!q.hook)return;if(q.key&&killed.has(q.key))return;
   const loc=match(q);
   if(!loc){AG.posts.unshift(q);if(!dirty){if(q.key)add(K,q.key,q,1);add(I,q.id,q,1);add(S,v31Id(q),q,1)}SYNC.h[id]=v31Hash(JSON.stringify(v31Strip(q)));changed++;return}
   const lh=v31Hash(JSON.stringify(v31Strip(loc)));const rh=v31Hash(JSON.stringify(v31Strip(q)));
   if(lh===rh){SYNC.h[id]=lh;return}
   const locEdited=SYNC.h[id]&&SYNC.h[id]!==lh;
   if(!locEdited||(v.upd||'')>(loc.upd||'')){const k0=loc.key,s0=v31Id(loc);const keep=loc.id;Object.keys(loc).forEach(k=>{if(k!=='id')delete loc[k]});Object.assign(loc,q);loc.id=keep;
    if(loc.key!==k0||v31Id(loc)!==s0)dirty=true;SYNC.h[id]=v31Hash(JSON.stringify(v31Strip(loc)));changed++}});
  lsSet('ps_h',SYNC.h);SYNC.ready=true;if(changed){saveAgent();try{TC.clear()}catch(e){}}return changed}
 v31Load=async function(){const r=await core();purge();
  // the first posts paint now; the approvals (workflow) keep loading behind them and V31 renders again when they are in
  if(r)setTimeout(()=>{try{render()}catch(e){}},0);
  return r};
}

// 1c · skeleton cards while the posts are on the way (instead of "no posts match the filter")
function skeleton(){if(view()!=='gallery'||window.__v31loaded)return;const box=document.getElementById('appviews');if(!box||box.querySelector('.ga-card'))return;
 const em=box.querySelector('.v170empty');if(!em||em.dataset.v195)return;
 const n=PH.matches?6:10;const sk=document.createElement('div');sk.className='v195sk';sk.setAttribute('role','status');sk.setAttribute('aria-label','טוען את הפוסטים');
 sk.innerHTML=Array.from({length:n},()=>'<div class="v195skc" aria-hidden="true"><i></i><b></b><u></u></div>').join('');em.replaceWith(sk)}

/* ---------- 2 · the shell is as tall as the area Safari gives fixed bars ---------- */
// V180 sized the shell by documentElement.clientHeight. On iPhone that is the height with the toolbar shown and it does
// not grow when the toolbar collapses (the default on newer Safari), so a white band was left under the bottom bar.
// A fixed probe (top:0, bottom:0) always spans what Safari uses for fixed bottom bars; the shell follows it.
let probe=null;
function vh(){if(!probe)return;const de=document.documentElement;if(!PH.matches){de.style.removeProperty('--v195vh');return}
 const vv=window.visualViewport;if(vv&&Math.abs((vv.scale||1)-1)>0.01)return;
 const h=Math.round(probe.getBoundingClientRect().height);if(h>=200&&de.style.getPropertyValue('--v195vh')!==h+'px')de.style.setProperty('--v195vh',h+'px')}
function ensureProbe(){if(probe&&probe.isConnected)return;probe=document.createElement('div');probe.id='v195vp';probe.setAttribute('aria-hidden','true');document.body.appendChild(probe);
 try{new ResizeObserver(vh).observe(probe)}catch(e){}vh()}
addEventListener('resize',()=>setTimeout(vh,0));addEventListener('pageshow',vh);addEventListener('orientationchange',()=>setTimeout(vh,350));
try{visualViewport&&visualViewport.addEventListener('resize',()=>setTimeout(vh,0))}catch(e){}

// the bottom bar height, for the undo pill, the snackbar and the toasts that sit above it
let navRO=null;
function navVar(){const n=document.getElementById('v99nav');const de=document.documentElement;if(!n)return;const r=n.getBoundingClientRect();const on=PH.matches&&r.height>0&&getComputedStyle(n).display!=='none';
 document.body.classList.toggle('v195nav',on);if(on)de.style.setProperty('--v195nav',Math.round(r.height)+'px');
 if(!navRO){try{navRO=new ResizeObserver(navVar);navRO.observe(n)}catch(e){navRO=1}}}

/* ---------- 3 · the header ---------- */
function bellCount(){const b=document.querySelector('.tbar .px-bell');if(!b)return 0;const n=parseInt((b.textContent||'').replace(/\D+/g,''),10);return n>0?n:0}
function header(){const tb=document.querySelector('.tbar');if(!tb)return;const on=PH.matches;document.body.classList.toggle('v195',on);
 if(!on)return;
 let m=document.getElementById('v195more');
 if(!m){m=document.createElement('button');m.type='button';m.id='v195more';m.className='ibtn';m.setAttribute('aria-haspopup','dialog');m.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();openMore()})}
 if(m.parentElement!==tb){const nw=tb.querySelector('[data-app="new"]');nw?tb.insertBefore(m,nw):tb.appendChild(m)}
 const n=bellCount();const lab='עוד'+(n?`, ${n} התראות`:'');if(m.getAttribute('aria-label')!==lab){m.setAttribute('aria-label',lab);m.title='עוד';m.innerHTML=IC.more+(n?`<span class="v195badge" aria-hidden="true">${n>99?'99+':n}</span>`:'')}}

// the "עוד" sheet: the page actions first, then notifications, search and undo
function items(){const out=[];const tb=document.querySelector('.tbar');const act=document.getElementById('vact');
 if(tb&&act&&tb.classList.contains('v172fold'))[...act.children].filter(b=>b.tagName==='BUTTON').forEach(b=>{const s=b.querySelector('svg');const label=(b.textContent||b.getAttribute('aria-label')||'').replace(/\s+/g,' ').trim();if(label)out.push({icon:s?s.outerHTML:'',label,disabled:b.disabled,run:()=>b.click(),page:1})});
 // the notifications popover is placed under the button that opened it; the bell is folded away, so it opens under "עוד"
 const bell=tb&&tb.querySelector('.px-bell');if(bell){const n=bellCount();out.push({icon:IC.bell,label:n?`התראות (${n})`:'התראות',run:()=>{const m=document.getElementById('v195more');
  if(m)bell.getBoundingClientRect=()=>m.getBoundingClientRect();try{bell.click()}finally{delete bell.getBoundingClientRect}const pp=document.getElementById('px-pop');if(pp)pp.classList.add('v195pop')}})}
 const sb=tb&&tb.querySelector('.px-sbtn');if(sb)out.push({icon:IC.search,label:'חיפוש ופקודות',run:()=>sb.click()});
 const c=document.getElementById('v171chip');if(c&&!c.hidden){const l=(c.getAttribute('aria-label')||'ביטול הפעולה האחרונה').replace(/^ביטול:\s*/,'');out.push({icon:IC.undo,label:'ביטול: '+l,run:()=>c.click()})}
 return out}
let back=null;
// the phone back gesture closes the sheet and stays on the page (V101 does not know this sheet, V102 would step a page back):
// the sheet pushes one history entry; closing it any other way takes that entry away again, and a choice in the sheet
// runs only after that, so the next back still returns to the previous page (the same pattern as the V180 drawer)
let skip=0,pending=null,pushed=false;
const ours=()=>!!(history.state&&history.state.v195m);
const hush=()=>{window.__v101pop=Date.now()};
const sheetOpen=()=>!!document.querySelector('#v172sheet.v195sh');
function released(after){if(pushed&&ours()){pushed=false;skip++;hush();pending=after||null;try{history.back()}catch(e){skip--;pending=null;after&&setTimeout(after,0)}}
 else{pushed=false;after&&setTimeout(after,0)}}
addEventListener('popstate',()=>{if(skip>0){skip--;hush();if(pending){const p=pending;pending=null;setTimeout(p,0)}return}
 if(sheetOpen()&&!ours()){pushed=false;hush();const w=document.getElementById('v172sheet');if(w)w.remove();if(back&&back.isConnected)try{back.focus({preventScroll:true})}catch(e){}back=null}},true);
// popstate listeners on window run in the order they were added, so V102 (a page back) runs before ours; V102 stands down while
// V101 reports an open window, so the open sheet is reported there too (V101's own listener keeps its own list and leaves it alone)
function v101(){const o=window.__v101;if(!o||o.__v195)return;const t0=o.top;if(typeof t0!=='function')return;o.__v195=1;o.top=function(){return t0.apply(this,arguments)||(sheetOpen()?document.getElementById('v172sheet'):null)}}
v101();setTimeout(v101,0);
// closed by V172's own handlers (the X, the backdrop, Escape)
new MutationObserver(()=>{if(pushed&&!sheetOpen())released(null)}).observe(document.body,{childList:true});
function closeMore(after){const w=document.getElementById('v172sheet');if(w&&w.classList.contains('v195sh'))w.remove();if(back&&back.isConnected)try{back.focus({preventScroll:true})}catch(e){}back=null;released(after)}
function openMore(){const old=document.getElementById('v172sheet');if(old)old.remove();back=document.activeElement;const list=items();
 const t=(document.getElementById('vt')||{}).textContent||'';
 const w=document.createElement('div');w.id='v172sheet';w.className='v195sh';w.setAttribute('role','dialog');w.setAttribute('aria-modal','true');w.setAttribute('aria-label','עוד');
 w.innerHTML=`<div class="v172bg" data-v172x="1"></div><div class="v172pan"><div class="v172grip" aria-hidden="true"></div><div class="v172h"><div><b>עוד</b>${t?`<span>${E(t)}</span>`:''}</div><button type="button" class="v172x" data-v172x="1" aria-label="סגירה">${IC.x}</button></div><div class="v172l"></div></div>`;
 const l=w.querySelector('.v172l');let sep=false;
 list.forEach((it,i)=>{if(!it.page&&!sep&&l.children.length){const s=document.createElement('div');s.className='v195sep';s.setAttribute('role','separator');l.appendChild(s);sep=true}
  const b=document.createElement('button');b.type='button';b.className='v172i';b.dataset.v195i=String(i);b.disabled=!!it.disabled;b.innerHTML=`<span class="v172ic" aria-hidden="true">${it.icon||''}</span><span class="v172t">${E(it.label)}</span>`;
  b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();closeMore(()=>{try{it.run()}catch(x){console.error('v195',x)}})});l.appendChild(b)});
 document.body.appendChild(w);requestAnimationFrame(()=>w.classList.add('in'));
 if(PH.matches&&!ours()){try{history.pushState({v195m:1},'');pushed=true}catch(e){}}
 setTimeout(()=>{const f=l.querySelector('button:not(:disabled)');f&&f.focus({preventScroll:true})},60)}
window.__v195more=openMore;

/* ---------- 4 · the undo pill above the bottom bar, gone on its own ---------- */
const PILL_MS=8000;let sig='',lastAct=0;
function chipSig(){try{const s=window.__v171&&__v171.stack;if(!s)return '';const l=s[s.length-1];return s.length+'|'+(l?l.t+'|'+l.label:'')}catch(e){return ''}}
function pill(){const c=document.getElementById('v171chip');if(!c)return;const s=chipSig();if(s!==sig){sig=s;lastAct=Date.now()}
 const sn=document.getElementById('v171snack');const gone=Date.now()-lastAct>PILL_MS||!!(sn&&sn.classList.contains('show'));if(c.classList.contains('v195gone')!==gone)c.classList.toggle('v195gone',gone)}
setInterval(pill,500);

/* ---------- 5 · tie it to the page lifecycle ---------- */
function after(){try{ensureProbe()}catch(e){}try{header()}catch(e){console.warn('v195',e)}try{navVar()}catch(e){}try{skeleton()}catch(e){}try{pill()}catch(e){}}
try{render=(f=>function(){const r=f.apply(this,arguments);after();return r})(render)}catch(e){}
try{PH.addEventListener('change',()=>{after();vh()})}catch(e){}
// header buttons that arrive later (the bell count, the V186 gallery button, V172's fold) are picked up too
let mo=null;function watch(){const tb=document.querySelector('.tbar');if(!tb||mo)return;mo=new MutationObserver(()=>{clearTimeout(mo._t);mo._t=setTimeout(()=>{try{header()}catch(e){}},60)});mo.observe(tb,{childList:true,subtree:true,characterData:true})}
setTimeout(()=>{after();watch()},0);setTimeout(()=>{after();watch()},1500);
window.__v195={header,items,openMore,vh,navVar,skeleton};
})();
/*V195:END*/
