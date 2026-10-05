// ================= V108 · the editor stops flashing on phones: the entrance animation runs once (not on every tap), the preview
//                   and every thumbnail carry their picture across a re-render, scroll positions survive; a true full-screen
//                   preview of the draft (post or feed view, every format and slide); tidier phone layout =================
(function(){
if(typeof peRender!=='function'||typeof PE==='undefined')return;
// ---- 1. carry pictures and scroll positions across the full re-render
function keyOf(el,root){const parts=[];let n=el;while(n&&n!==root){const cls=n.className&&typeof n.className==='string'?n.className.trim().split(/\s+/).join('.'):'';let i=0,s=n.previousElementSibling;while(s){if(s.tagName===n.tagName)i++;s=s.previousElementSibling}
 parts.unshift(n.tagName+(n.id?'#'+n.id:'')+(cls?'.'+cls:'')+(n.dataset&&n.dataset.i!==undefined?'[i='+n.dataset.i+']':'')+(n.dataset&&n.dataset.k!==undefined?'[k='+n.dataset.k+']':'')+':'+i);n=n.parentElement}return parts.join('>')}
function snapshot(root){const S={cv:new Map(),sc:new Map(),tiles:new Map()};if(!root)return S;
 root.querySelectorAll('canvas').forEach(c=>{if(!c.width||!c.height)return;if(c.classList.contains('v69pv')){const b=c.closest('button[data-pe-a="pre"]');if(b)S.tiles.set(b.dataset.i,c);return}S.cv.set(keyOf(c,root),c)});
 root.querySelectorAll('*').forEach(el=>{if(el.scrollTop||el.scrollLeft)S.sc.set(keyOf(el,root),[el.scrollTop,el.scrollLeft])});return S}
function restore(root,S){if(!root)return;
 root.querySelectorAll('canvas').forEach(c=>{const o=S.cv.get(keyOf(c,root));if(!o||o===c)return;try{if(c.width!==o.width||c.height!==o.height){c.width=o.width;c.height=o.height}c.getContext('2d').drawImage(o,0,0)}catch(e){}});
 if(S.tiles.size)root.querySelectorAll('button[data-pe-a="pre"]').forEach(b=>{const o=S.tiles.get(b.dataset.i);if(!o||b.querySelector('canvas.v69pv'))return;const c=document.createElement('canvas');c.className='v69pv';c.width=o.width;c.height=o.height;c.setAttribute('aria-hidden','true');try{c.getContext('2d').drawImage(o,0,0)}catch(e){}b.prepend(c)});
 const apply=()=>{const all=[...root.querySelectorAll('*')];S.sc.forEach((v,k)=>{const el=all.find(x=>keyOf(x,root)===k);if(el){el.scrollTop=v[0];el.scrollLeft=v[1]}})};apply();requestAnimationFrame(apply);setTimeout(apply,60)}
let live=false;
peRender=(f=>function(){const root=document.getElementById('pe-root');const S=snapshot(root);const r=f.apply(this,arguments);try{const nr=document.getElementById('pe-root');if(nr){restore(nr,S);nr.classList.toggle('v108live',live);live=true;ensureExpand(nr)}}catch(e){console.warn('v108',e)}return r})(peRender);
if(typeof peOpen==='function')peOpen=(f=>function(){live=false;const r=document.getElementById('pe-root');if(r)r.classList.remove('v108live');return f.apply(this,arguments)})(peOpen);
// the main preview keeps its last picture while the new one is being drawn (peDraw is asynchronous: images first)
if(typeof peDraw==='function')peDraw=(f=>function(){const cv=document.getElementById('pe-cv');if(cv&&cv.width&&!cv.dataset.v108drawn){cv.dataset.v108drawn='1'}return f.apply(this,arguments)})(peDraw);
// ---- 2. a true full-screen preview of the draft
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const PV={on:false,mode:'post',fmt:null,slide:null};
function ensureExpand(root){const st=root.querySelector('.pe-canvas');if(!st||st.querySelector('[data-v108="open"]'))return;st.insertAdjacentHTML('beforeend',`<button type="button" class="v108exp" data-v108="open" aria-label="תצוגה מלאה של הפוסט"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg></button>`)}
function fmtOf(){return PV.fmt||PE.fmt||'45'}
function slideOf(){return PV.slide==null?(PE.slide||0):PV.slide}
async function draw(){const el=document.getElementById('v108pv');if(!el||!PE.p)return;const p=PE.p;try{await ensureImgs(p)}catch(e){}
 const big=peCanvas(p,slideOf());const src=peFmtCanvas(big,p,fmtOf());const cv=el.querySelector('canvas.v108cv');if(!cv)return;cv.width=src.width;cv.height=src.height;cv.getContext('2d').drawImage(src,0,0);cv.setAttribute('aria-label','תצוגה של הפוסט: '+String((p.visual&&p.visual.headline)||p.hook||'').replace(/\n/g,' '))}
function html(){const p=PE.p;const sl=(typeof slidesOf==='function'?slidesOf(p):[0]);const cap=String((PV.mode==='feed'&&(p.ig||p.fb))||'').trim();const name=String((p.visual&&p.visual.headline)||p.hook||'').replace(/\n/g,' ').replace(/\*/g,'').slice(0,60);
 return `<div class="v108bd" data-v108="close"></div><div class="v108sh" role="dialog" aria-modal="true" aria-label="תצוגה מלאה">
  <header class="v108top"><button type="button" class="v108x" data-v108="close" aria-label="סגירה וחזרה לעריכה"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
   <div class="v108ttl"><b>${esc(name)}</b><span>כך הפוסט נראה עכשיו, כולל שינויים שלא נשמרו</span></div>
   <div class="v108seg" role="group" aria-label="סוג תצוגה"><button type="button" data-v108="mode" data-k="post" aria-pressed="${PV.mode==='post'}">הפוסט</button><button type="button" data-v108="mode" data-k="feed" aria-pressed="${PV.mode==='feed'}">בפיד</button></div></header>
  <div class="v108body ${PV.mode==='feed'?'feed':''}"><div class="v108card">${PV.mode==='feed'?`<div class="v108acc"><span class="v108av" aria-hidden="true">ק</span><div><b>קבוצת קורקוס</b><small>כך הפוסט ייראה בפיד</small></div></div>`:''}
   <canvas class="v108cv" width="1080" height="1350"></canvas>
   ${PV.mode==='feed'?`<div class="v108cap">${cap?esc(cap).replace(/\n/g,'<br>'):'<i>אין טקסט לפוסט הזה עדיין. כותבים אותו בלשונית "טקסט".</i>'}</div>`:''}</div></div>
  <footer class="v108bar">${sl.length>1?`<div class="v108seg" role="group" aria-label="שקופית">${sl.map((_,i)=>`<button type="button" data-v108="slide" data-i="${i}" aria-pressed="${slideOf()===i}">${i+1}</button>`).join('')}</div>`:''}
   <div class="v108seg" role="group" aria-label="פורמט">${[['45','4:5'],['11','1:1'],['916','9:16']].map(([k,l])=>`<button type="button" data-v108="fmt" data-k="${k}" aria-pressed="${fmtOf()===k}">${l}</button>`).join('')}</div>
   <button type="button" class="v108btn" data-v108="dl">הורדה</button><button type="button" class="v108btn pri" data-v108="close">חזרה לעריכה</button></footer></div>`}
function open(){if(!PE.p)return;PV.on=true;PV.fmt=PE.fmt;PV.slide=PE.slide||0;let el=document.getElementById('v108pv');if(!el){el=document.createElement('div');el.id='v108pv';el.className='v108pv';document.body.appendChild(el)}el.innerHTML=html();document.body.classList.add('v108-on');draw();setTimeout(()=>{const x=el.querySelector('.v108x');x&&x.focus()},30)}
function rerender(){const el=document.getElementById('v108pv');if(!el)return;el.innerHTML=html();draw()}
function close(){PV.on=false;const el=document.getElementById('v108pv');if(el)el.remove();document.body.classList.remove('v108-on');setTimeout(()=>{const b=document.querySelector('#pe-root [data-v108="open"]');b&&b.focus()},30)}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-v108]');if(!b)return;const a=b.dataset.v108;e.preventDefault();e.stopPropagation();
 if(a==='open')return open();if(a==='close')return close();if(a==='mode'){PV.mode=b.dataset.k;return rerender()}if(a==='fmt'){PV.fmt=b.dataset.k;return rerender()}if(a==='slide'){PV.slide=+b.dataset.i;return rerender()}
 if(a==='dl'){try{const p=PE.p;const cv=peFmtCanvas(peCanvas(p,slideOf()),p,fmtOf());saveCanvas(cv,`kurkoos-${p.key||p.id}-${fmtOf()}.png`)}catch(x){}}},true);
// the old "מסך גדול" button in the tool strip opens this preview too
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-v33="pe"]');if(!b||!PE.p)return;e.preventDefault();e.stopPropagation();open()},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&PV.on){e.preventDefault();e.stopPropagation();close()}},true);
// closing the editor closes the preview first
if(typeof peClose==='function')peClose=(f=>function(){if(PV.on){close();return}return f.apply(this,arguments)})(peClose);
window.__v108={open,close,PV,snapshot,restore};
})();
