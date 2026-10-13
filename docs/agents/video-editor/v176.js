// ================= V176 · the shell, calmer and consistent: the undo pill never covers a sheet or a bar and fades 30 seconds
//                   after the last action; the phone drawer gets a backdrop and a close button, one menu entry, nav counts
//                   that match the pages, and the header search goes to the page search on Posts and Photos; the schedule
//                   sheet lists real free slots as far ahead as the scheduler looks; calendar cards on touch show "מועד" and
//                   "⋯" only; Ideas, Agent and the calendar drafts drawer point to the Posts page =================
(()=>{
if(window.__v176)return;window.__v176=1;
const PH=matchMedia('(max-width:860px)');
const COARSE=matchMedia('(pointer:coarse)');
const E=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const view=()=>{try{return APP.view||''}catch(e){return ''}};
const pad=n=>String(n).padStart(2,'0');
const SVG=p=>`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const X=SVG('<path d="M18 6 6 18M6 6l12 12"/>');
const DOTS='<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.9"/><circle cx="12" cy="12" r="1.9"/><circle cx="19" cy="12" r="1.9"/></svg>';
const ARROW=SVG('<path d="M15 6l-6 6 6 6"/>');

/* ---------- 1 · the undo pill (V171 #v171chip) ----------
   V171 builds the pill once and only toggles hidden / title, so it is wrapped from outside: the label is set once,
   CSS (k176) hides it under every sheet, bar, drawer and the editor, and a 30 second timer marks it old after the last
   action. The snackbar stays the main way to undo. */
const OLD_MS=30000;let sig='',lastAct=0;
function chipSig(){try{const s=window.__v171&&__v171.stack;if(!s)return '';const l=s[s.length-1];return s.length+'|'+(l?l.t+'|'+l.label:'')}catch(e){return ''}}
function chipTick(){const c=document.getElementById('v171chip');if(!c)return;
 const sp=c.querySelector('span');if(sp&&sp.textContent!=='בטל פעולה')sp.textContent='בטל פעולה';
 const s=chipSig();if(s!==sig){sig=s;lastAct=Date.now()}
 const old=Date.now()-lastAct>OLD_MS;if(c.classList.contains('v176old')!==old)c.classList.toggle('v176old',old)}
setInterval(chipTick,1000);
new MutationObserver(()=>chipTick()).observe(document.body,{childList:true});
setTimeout(()=>{const s=document.getElementById('v171snack');if(s)new MutationObserver(()=>chipTick()).observe(s,{childList:true})},3000);

/* ---------- 2 · phone navigation ---------- */
// the drawer: a backdrop that closes it, a close button inside, Escape closes (V99 already listens), focus goes in and comes back
let navBack=null;
function side(){return document.getElementById('side')}
function ensureDrawer(){const s=side();if(!s)return;
 if(!document.getElementById('v176bd')){const bd=document.createElement('div');bd.id='v176bd';bd.setAttribute('aria-hidden','true');bd.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();closeDrawer()});s.parentElement.insertBefore(bd,s)}
 if(!s.querySelector('#v176nx')){const b=document.createElement('button');b.type='button';b.id='v176nx';b.className='v176nx';b.setAttribute('aria-label','סגירת התפריט');b.innerHTML=X;
  b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();closeDrawer()});const br=s.querySelector('.brandrow');br?br.appendChild(b):s.prepend(b)}}
function closeDrawer(){const s=side();if(s&&s.classList.contains('open'))s.classList.remove('open')}
let wasOpen=false;
function drawerState(){const s=side();if(!s)return;const open=s.classList.contains('open');if(open===wasOpen)return;wasOpen=open;
 document.body.classList.toggle('v176nav',open&&PH.matches);
 if(open&&PH.matches){ensureDrawer();navBack=document.activeElement;s.setAttribute('role','dialog');s.setAttribute('aria-modal','true');setTimeout(()=>{const x=document.getElementById('v176nx');x&&x.focus({preventScroll:true})},60)}
 else{s.removeAttribute('role');s.removeAttribute('aria-modal');if(navBack&&navBack.isConnected&&!document.querySelector('#appviews :focus'))try{navBack.focus({preventScroll:true})}catch(e){}navBack=null}}
function armSide(){const s=side();if(!s||s.__v176)return;s.__v176=1;ensureDrawer();new MutationObserver(drawerState).observe(s,{attributes:true,attributeFilter:['class']})}
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.body.classList.contains('v176nav')){closeDrawer()}},true);
// keep Tab inside the open drawer
document.addEventListener('keydown',e=>{if(e.key!=='Tab'||!document.body.classList.contains('v176nav'))return;const s=side();if(!s)return;
 const f=[...s.querySelectorAll('button,a[href],input,select,[tabindex="0"]')].filter(x=>!x.disabled&&x.offsetParent);if(!f.length)return;const a=f[0],z=f[f.length-1];
 if(e.shiftKey&&document.activeElement===a){e.preventDefault();z.focus()}else if(!e.shiftKey&&document.activeElement===z){e.preventDefault();a.focus()}else if(!s.contains(document.activeElement)){e.preventDefault();a.focus()}},true);

// counts: "פוסטים" in the nav is the number the Posts page shows under "הכל"
let pc={key:'',n:null};
function postsTotal(){try{const key=AG.posts.length+'|'+((APP.sched&&APP.sched.items.length)||0);if(pc.key===key&&pc.n!=null)return pc.n;
 const F=window.__v170&&__v170.F;if(!F||typeof gaList!=='function')return null;
 const keep=JSON.stringify(F);let n=null;
 // every filter off, the quick view on "הכל"; the sort order does not change the count
 try{Object.keys(F).forEach(k=>{if(k==='sort')return;if(k==='qv'){F.qv='all';return}if(Array.isArray(F[k]))F[k]=[];else if(typeof F[k]==='string'&&k!=='size')F[k]=''});n=gaList().length}
 finally{const o=JSON.parse(keep);Object.keys(F).forEach(k=>{if(!(k in o))delete F[k]});Object.assign(F,o)}
 pc={key,n};return n}catch(e){return null}}
try{counts=(f=>function(){const c=f.apply(this,arguments);try{const n=postsTotal();if(n!=null)c.gallery=n}catch(e){}return c})(counts)}catch(e){}

// the header search on Posts and Photos goes to the search field of the page instead of opening a second search
function pageSearch(){const v=view();if(v!=='gallery'&&v!=='photos')return null;const r=document.getElementById('appviews');if(!r)return null;
 return r.querySelector(v==='gallery'?'input[data-v170q]':'input[data-v170pq]')||r.querySelector('input[type="search"]')}
window.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('.tbar [data-px="cmd"]');if(!b)return;const inp=pageSearch();if(!inp)return;
 e.preventDefault();e.stopImmediatePropagation();try{inp.scrollIntoView({block:'nearest'})}catch(x){}inp.focus();try{inp.select()}catch(x){}},true);
function searchLabel(){const b=document.querySelector('.tbar [data-px="cmd"]');if(!b)return;const on=!!pageSearch();const t=on?(view()==='gallery'?'חיפוש פוסטים':'חיפוש תמונות'):'חיפוש ופקודות';
 if(b.getAttribute('aria-label')!==t)b.setAttribute('aria-label',t);const sp=b.querySelector('span');if(sp&&sp.textContent!==t){if(!b.dataset.v176t)b.dataset.v176t=sp.textContent;sp.textContent=on?t:(b.dataset.v176t||t)}}

/* ---------- 3 · schedule sheet (V157): real free slots, as far ahead as gaSchedule() looks (84 days) ---------- */
const DAYS=['א׳','ב׳','ג׳','ד׳','ה׳','ו׳','ש׳'];
function freeSlots(n){let out=[];try{out=pxFreeSlots(84).map(k=>{const [d,h]=k.split('T');const t=((APP.slots||{})[new Date(d+'T12:00').getDay()]||[]).find(x=>String(x).slice(0,2)===h)||h+':00';return d+'T'+t})}catch(e){}
 return [...new Set(out)].sort().slice(0,n)}
function rel(at){const d=new Date(at);if(isNaN(d))return '';const t=new Date();const a=new Date(t.getFullYear(),t.getMonth(),t.getDate()),b=new Date(d.getFullYear(),d.getMonth(),d.getDate());const days=Math.round((b-a)/864e5);
 if(days<=0)return 'היום';if(days===1)return 'מחר';if(days<7)return `בעוד ${days} ימים`;const w=Math.round(days/7);return w<=1?'בעוד שבוע':w===2?'בעוד שבועיים':`בעוד ${w} שבועות`}
function slotLbl(at){const d=new Date(at);if(isNaN(d))return at;return `יום ${DAYS[d.getDay()]} ${pad(d.getDate())}.${pad(d.getMonth()+1)} · ${pad(d.getHours())}:${pad(d.getMinutes())}`}
let v157p=null;
function fixSheet(el){const box=el.querySelector('.v157chips');if(!box||box.dataset.v176)return;box.dataset.v176='1';
 const S=window.__v157&&__v157.S;if(!S)return;const sl=freeSlots(4);const cur=S.at;
 const list=sl.slice();if(cur&&!list.includes(cur))list.unshift(cur);
 if(!list.length)return;
 box.innerHTML=list.map(at=>`<button type="button" class="v157chip v176chip" data-v157="at" data-at="${E(at)}" aria-pressed="${at===cur}"><b>${E(slotLbl(at))}</b><small>${E(at===cur&&!sl.includes(at)?'המועד הנוכחי':rel(at))}</small></button>`).join('');
 const lg=el.querySelector('.v157set legend');if(lg&&sl.length)lg.textContent='המשבצות הפנויות הבאות';
 // a new sheet with no time picked yet: take the first free slot, like the sheet does when the coming weeks have room
 if(!cur&&sl.length&&v157p!==S.p){v157p=S.p;const f=box.querySelector('.v176chip');if(f)setTimeout(()=>f.click(),0)}
 if(S.p!==v157p&&cur)v157p=S.p}
function arm157(){const el=document.getElementById('v157');if(!el||el.__v176)return;el.__v176=1;fixSheet(el);new MutationObserver(()=>fixSheet(el)).observe(el,{childList:true})}

/* ---------- 4 · calendar on touch: "מועד" and "⋯"; the other actions in a sheet ---------- */
function sheet(title,sub,items){const old=document.getElementById('v172sheet');if(old)old.remove();const back=document.activeElement;
 const w=document.createElement('div');w.id='v172sheet';w.className='v176sh';w.setAttribute('role','dialog');w.setAttribute('aria-modal','true');w.setAttribute('aria-label',title);
 w.innerHTML=`<div class="v172bg" data-v172x="1"></div><div class="v172pan"><div class="v172grip" aria-hidden="true"></div><div class="v172h"><div><b>${E(title)}</b>${sub?`<span>${E(sub)}</span>`:''}</div><button type="button" class="v172x" data-v172x="1" aria-label="סגירה">${X}</button></div><div class="v172l"></div></div>`;
 const l=w.querySelector('.v172l');
 items.forEach(it=>{const b=document.createElement('button');b.type='button';b.className='v172i';b.innerHTML=`<span class="v172ic" aria-hidden="true">${it.icon||''}</span><span class="v172t">${E(it.label)}</span>`;
  b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();w.remove();try{back&&back.isConnected&&back.focus({preventScroll:true})}catch(x){}setTimeout(()=>{try{it.run()}catch(x){console.error('v176',x)}},0)});l.appendChild(b)});
 document.body.appendChild(w);requestAnimationFrame(()=>w.classList.add('in'));setTimeout(()=>{const f=l.querySelector('button');f&&f.focus({preventScroll:true})},60)}
function calMore(g){const it=(()=>{try{const id=(g.querySelector('[data-id]')||{}).dataset;return id&&APP.sched.items.find(i=>i.id===id.id)}catch(e){return null}})();
 const acts=[...g.querySelectorAll('button')].filter(b=>!b.classList.contains('v138when')&&!b.classList.contains('v138grip')&&!b.classList.contains('v176more'));
 const items=acts.map(b=>{const s=b.querySelector('svg');return {icon:s?s.outerHTML:'',label:(b.getAttribute('title')||b.getAttribute('aria-label')||b.textContent||'').trim(),run:()=>b.click()}}).filter(x=>x.label);
 const ci=g.parentElement&&g.parentElement.querySelector('.ci .ct');const head=ci?(ci.childNodes[1]&&ci.childNodes[1].textContent||ci.textContent||'').trim().slice(0,60):'';
 let sub='';try{if(it&&it.at)sub='מתוזמן ל '+(typeof fmtDate==='function'?fmtDate(it.at):it.at.replace('T',' · '))}catch(e){}
 sheet(head||'פוסט בלוח',sub,items)}
function calFix(){if(view()!=='calendar')return;document.querySelectorAll('#appviews .v28-cit').forEach(g=>{if(g.querySelector('.v176more'))return;
 const b=document.createElement('button');b.type='button';b.className='v176more';b.setAttribute('aria-label','עוד פעולות');b.setAttribute('aria-haspopup','dialog');b.title='עוד פעולות';b.innerHTML=DOTS;
 b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();calMore(g)});g.appendChild(b)})}
function calTitle(){try{if(!VTITLE.calendar)return;if(!VTITLE.__v176cal)VTITLE.__v176cal=VTITLE.calendar[1];VTITLE.calendar[1]=COARSE.matches?'לחיצה על פוסט לשינוי מועד':VTITLE.__v176cal}catch(e){}}
calTitle();try{COARSE.addEventListener('change',()=>{calTitle();try{render()}catch(e){}})}catch(e){}

/* ---------- 5 · Ideas, Agent and the calendar drafts drawer point to the Posts page ---------- */
function toPosts(){try{go('gallery')}catch(e){}}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-v176="posts"]');if(!b)return;e.preventDefault();toPosts()});
function linkRow(where){return `<div class="v176lnk" data-v176w="${where}"><span>${where==='tray'?'כל הטיוטות, עם חיפוש וסינון מלא, נמצאות בעמוד הפוסטים':'כל הפוסטים, עם חיפוש וסינון, נמצאים בעמוד אחד'}</span><button type="button" class="v176go" data-v176="posts">לכל הפוסטים${ARROW}</button></div>`}
function links(){const v=view();const r=document.getElementById('appviews');if(!r)return;
 if((v==='ideas'||v==='agent')&&!r.querySelector('.v176lnk[data-v176w="top"]')){r.insertAdjacentHTML('afterbegin',linkRow('top'))}
 if(v==='calendar'){const t=r.querySelector('.v28-tray');if(t&&!t.querySelector('.v176lnk')){const h=t.querySelector('header');h?h.insertAdjacentHTML('afterend',linkRow('tray')):t.insertAdjacentHTML('afterbegin',linkRow('tray'))}}}

/* ---------- 6 · font floor: text under 14px on the pages (not Posts and Photos, which V174 and V175 own) goes to 14px.
   Numbers alone (badges, counts, times, scores) keep their size. Computed once per element. ---------- */
let SEEN=new WeakSet();
const NUM=/^[\d\s.,:%+\-–·/▲▼★#()×]*$/;const SKIP=new Set(['CANVAS','SVG','svg','PATH','path','KBD','SCRIPT','STYLE','OPTION','INPUT','TEXTAREA','SELECT','IMG','VIDEO','PRE','CODE']);
function floor(){const v=view();if(v==='gallery'||v==='photos')return;const root=document.getElementById('appmain');if(!root)return;
 const all=root.getElementsByTagName('*');const hit=[];
 for(let i=0;i<all.length;i++){const e=all[i];if(SEEN.has(e))continue;SEEN.add(e);if(SKIP.has(e.tagName))continue;
  let t='';for(let n=e.firstChild;n;n=n.nextSibling)if(n.nodeType===3)t+=n.textContent;t=t.trim();if(!t||NUM.test(t))continue;
  if(e.closest('#pe-root,.ga,.v170,[data-v176keep]'))continue;
  const fs=parseFloat(getComputedStyle(e).fontSize);if(fs&&fs<14)hit.push(e)}
 hit.forEach(e=>e.classList.add('v176f'))}
addEventListener('resize',()=>{clearTimeout(window.__v176rs);window.__v176rs=setTimeout(()=>{SEEN=new WeakSet();floorSoon()},250)},{passive:true});
let ft=0;function floorSoon(){clearTimeout(ft);ft=setTimeout(()=>{try{floor()}catch(e){}},120)}

/* ---------- glue ---------- */
function after(){try{document.body.dataset.v176v=view()}catch(e){}
 try{armSide()}catch(e){}try{searchLabel()}catch(e){}try{calFix()}catch(e){}try{links()}catch(e){}floorSoon()}
try{render=(f=>function(){const r=f.apply(this,arguments);try{after()}catch(e){}return r})(render)}catch(e){}
let rq=0;new MutationObserver(()=>{if(rq)return;rq=requestAnimationFrame(()=>{rq=0;try{arm157()}catch(e){}try{calFix()}catch(e){}try{links()}catch(e){}floorSoon()})}).observe(document.body,{childList:true,subtree:true});
setTimeout(after,0);setTimeout(after,1500);
try{PH.addEventListener('change',()=>{wasOpen=!wasOpen;drawerState()})}catch(e){}
window.__v176={chipTick,postsTotal,freeSlots,rel,calMore,closeDrawer,pageSearch};
})();
