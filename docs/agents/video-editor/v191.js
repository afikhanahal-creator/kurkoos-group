/*V191:START*/
// ================= V191 · the calendar and every date or time, redesigned: a calm week grid with readable cards, a live
//                   "now" line across the week and a jump back to it, a clean month, a thumb friendly week on phones (a day
//                   strip you can also drop a post on), and ONE Hebrew 24h date and time picker for the whole engine (schedule
//                   sheet, "שמירה ותזמון", fixed weekly slots, the composer and any native date or time input). The native
//                   inputs stay in the page with the same value and the same input/change events, so every module keeps working =================
(function(){
if(window.__v191)return;
const pad=n=>String(n).padStart(2,'0');
const dk=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const DN=['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];
const DS=['א׳','ב׳','ג׳','ד׳','ה׳','ו׳','ש׳'];
const DL=['א','ב','ג','ד','ה','ו','ש'];
const MON=['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const RM=matchMedia('(prefers-reduced-motion: reduce)');
const PHONE=()=>innerWidth<761;
const items=()=>{try{return APP.sched.items.filter(i=>i&&i.at)}catch(e){return []}};
const stC=k=>{try{return stOf(k||'draft')}catch(e){return ['draft','טיוטה','#8A94A3']}};
const ICO={
 fb:'<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M13.4 21v-7.6h2.6l.4-3h-3V8.5c0-.9.3-1.5 1.5-1.5h1.6V4.3c-.3 0-1.2-.1-2.3-.1-2.3 0-3.8 1.4-3.8 3.9v2.3H7.8v3h2.6V21z"/></svg>',
 ig:'<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="4" y="4" width="16" height="16" rx="5"/><circle cx="12" cy="12" r="3.6"/><circle cx="16.9" cy="7.1" r=".6" fill="currentColor"/></svg>',
 tt:'<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M14.5 3.5c.4 2.2 1.7 3.6 4 3.8v2.9c-1.5 0-2.8-.4-4-1.2v5.8a5.1 5.1 0 1 1-5.1-5.1h.6v3a2.2 2.2 0 1 0 1.6 2.1V3.5z"/></svg>',
 yt:'<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M10 9.2v5.6l4.8-2.8z"/></svg>',
 cal:'<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3.5" y="5" width="17" height="15.5" rx="3.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
 clock:'<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
 plus:'<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
 chev:'<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
 down:'<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>',
 up:'<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 15l6-6 6 6"/></svg>'
};
const NETK={'פייסבוק':'fb','אינסטגרם':'ig','טיקטוק':'tt','יוטיוב':'yt'};

/* =========================================================== 1 · calendar ========================================================== */
const V={toNow:false,phoneOff:null,mSel:null,mOff:null};
function nowM(){const n=new Date();return n.getHours()*60+n.getMinutes()}
function hrsBase(){const s=document.querySelector('#appviews .v62ax .v62hrs span');return s?parseInt(s.textContent,10):8}
function nowTop(){return (nowM()-hrsBase()*60)/60*84}
// network badges become glyphs; networks that are off are hidden in the calendar only
function nets(root){root.querySelectorAll('.netb').forEach(n=>{if(n.dataset.v191)return;n.dataset.v191=1;const k=NETK[n.title]||(/^f$/i.test(n.textContent.trim())?'fb':/IG/i.test(n.textContent)?'ig':'');if(k&&ICO[k]){n.innerHTML=ICO[k];n.classList.add('v191n','v191n-'+k)}})}
function titleBar(box){const bar=box.querySelector('.calbar');if(!bar||bar.dataset.v191)return;bar.dataset.v191=1;const h2=bar.querySelector('h2');
 try{if(APP.calMode==='week'){const s=weekStart(APP.calOff),e=new Date(s);e.setDate(s.getDate()+6);const off=APP.calOff;const lead=off===0?'השבוע':off===-1?'שבוע שעבר':off===1?'שבוע הבא':'';
   const mon=s.getMonth()===e.getMonth()?`${MON[s.getMonth()]} ${s.getFullYear()}`:s.getFullYear()===e.getFullYear()?`${MON[s.getMonth()]} עד ${MON[e.getMonth()]} ${e.getFullYear()}`:`${MON[s.getMonth()]} ${s.getFullYear()} עד ${MON[e.getMonth()]} ${e.getFullYear()}`;
   if(h2)h2.innerHTML=`<b>${esc(mon)}</b><small>${lead?esc(lead)+' · ':''}${s.getDate()} עד ${e.getDate()}${s.getMonth()===e.getMonth()?'':' '+esc('ב'+MON[e.getMonth()])}</small>`}
  else{const n=new Date();const m0=new Date(n.getFullYear(),n.getMonth()+APP.calOff,1);const c=items().filter(i=>i.at.slice(0,7)===dk(m0).slice(0,7)).length;
   if(h2)h2.innerHTML=`<b>${esc(MON[m0.getMonth()])} ${m0.getFullYear()}</b><small>${c?c+' פוסטים בחודש':'אין פוסטים בחודש הזה'}</small>`}}catch(e){}
 const btns=[...bar.querySelectorAll('[data-app="coff"]')];const nav=document.createElement('div');nav.className='v191nav';nav.setAttribute('role','group');nav.setAttribute('aria-label','ניווט בלוח');
 btns.forEach(b=>{if(b.dataset.d!=='0')b.classList.add('v191arw');nav.appendChild(b)});const help=bar.querySelector('.v56i');if(help)nav.appendChild(help);bar.appendChild(nav)}
function weekDesk(box){const wk=box.querySelector('.wk.v62');if(!wk||wk.dataset.v191)return;wk.dataset.v191=1;const today=dk(new Date());const now=new Date();
 const cols=[...wk.querySelectorAll(':scope>.wkc')];const hasToday=cols.some(c=>c.dataset.drop===today);const ln=wk.querySelector('.v62col .v62now');
 cols.forEach(c=>{const ds=c.dataset.drop;const d=new Date(ds+'T12:00');if(d.getDay()===5||d.getDay()===6)c.classList.add('wknd');if(ds<today)c.classList.add('v191pd');
  const h=c.querySelector('header');if(h&&!h.querySelector('.v191hn')){const n=c.querySelectorAll('.ci').length;h.setAttribute('aria-label',`${DN[d.getDay()]} ${d.getDate()} ב${MON[d.getMonth()]}${ds===today?', היום':''}${n?`, ${n} פוסטים`:''}`)}
  if(hasToday&&ln&&ds!==today){const col=c.querySelector('.v62col');if(col&&!col.querySelector('.v191nowf'))col.insertAdjacentHTML('beforeend',`<div class="v191nowf" data-v62now aria-hidden="true" style="top:${ln.style.top}"></div>`)}});
 wk.querySelectorAll('.v62ev').forEach(w=>{const ci=w.querySelector('.ci');if(!ci)return;const it=APP.sched.items.find(i=>i.id===ci.dataset.id);if(!it)return;
  if(new Date(it.at)<now)w.classList.add('v191past');const st=stC(it.status);const s=ci.querySelector('.v56st');if(s)s.style.setProperty('--c',st[2])});
 // the "now" jump: shows when the red line is out of view
 const sc=box.querySelector('.v62sc');if(sc&&hasToday&&!sc.querySelector('.v191jw')){const j=document.createElement('button');j.type='button';j.className='v191jump';j.dataset.v191='now';j.innerHTML=`<span class="v191ji">${ICO.down}</span>עכשיו`;j.setAttribute('aria-label','גלילה לשעה הנוכחית');const jw=document.createElement('div');jw.className='v191jw';jw.appendChild(j);sc.prepend(jw);
  const upd=()=>{const t=nowTop()+72;const vis=t>=sc.scrollTop+72&&t<=sc.scrollTop+sc.clientHeight-20;j.classList.toggle('on',!vis);j.classList.toggle('up',t<sc.scrollTop+72);const ji=j.querySelector('.v191ji');if(ji)ji.innerHTML=t<sc.scrollTop+72?ICO.up:ICO.down};
  sc.addEventListener('scroll',()=>requestAnimationFrame(upd),{passive:true});upd()}
 if(V.toNow){V.toNow=false;scrollNow(true)}}
function scrollNow(smooth){const sc=document.querySelector('#appviews .v62sc');if(!sc)return;const top=Math.max(0,nowTop()+72-sc.clientHeight/3);sc.scrollTo({top,behavior:smooth&&!RM.matches?'smooth':'auto'})}
// phones: a week strip on top (tap to jump, drop a post on a day), compact day sections, readable cards
function weekPhone(box){const wk=box.querySelector('.wk:not(.v62)');if(!wk||wk.dataset.v191)return;wk.dataset.v191=1;wk.classList.add('v191ag');const today=dk(new Date());
 const cols=[...wk.querySelectorAll(':scope>.wkc')];let strip='';
 cols.forEach(c=>{const ds=c.dataset.drop;const d=new Date(ds+'T12:00');const n=c.querySelectorAll('.ci').length;c.id='v191d-'+ds;if(ds<today)c.classList.add('v191pd');
  const h=c.querySelector('header');if(h&&!h.dataset.v191){h.dataset.v191=1;h.innerHTML=`<div class="v191dh"><b>${DN[d.getDay()]}</b><span>${d.getDate()} ב${MON[d.getMonth()]}</span>${ds===today?'<em>היום</em>':''}</div>${n?`<small>${n===1?'פוסט אחד':n+' פוסטים'}</small>`:''}`}
  c.querySelectorAll('.ct').forEach(ct=>{[...ct.childNodes].forEach(x=>{if(x.nodeType===3&&x.textContent.trim()){const sp=document.createElement('span');sp.className='v191tx';sp.textContent=x.textContent.trim();x.replaceWith(sp)}})});
  c.querySelectorAll('.v62t').forEach(x=>x.classList.add('v191tx'));
  c.querySelectorAll('.cslot[data-t]').forEach(s=>{if(s.dataset.v191)return;s.dataset.v191=1;s.innerHTML=`<span class="v191sl">משבצת פנויה</span><b>${esc(s.dataset.t)}</b><i>${ICO.plus}</i>`;s.setAttribute('aria-label','משבצת פנויה ב'+s.dataset.t+', הוספת פוסט')});
  const add=c.querySelector('.v56add');if(add&&!add.dataset.v191){add.dataset.v191=1;add.innerHTML=`<i>${ICO.plus}</i><span>הוספת פוסט</span>`}
  strip+=`<button type="button" class="v191sd${ds===today?' today':''}${n?' has':''}${ds<today?' past':''}" data-v191day="${ds}" data-drop="${ds}" aria-label="${DN[d.getDay()]} ${d.getDate()} ב${MON[d.getMonth()]}${n?`, ${n} פוסטים`:''}"><small>${DL[d.getDay()]}</small><b>${d.getDate()}</b><i aria-hidden="true">${n?'<u></u>'.repeat(Math.min(3,n)):''}</i></button>`});
 if(!box.querySelector('.v191strip')){const s=document.createElement('div');s.className='v191strip';s.setAttribute('role','group');s.setAttribute('aria-label','ימי השבוע. אפשר לגרור פוסט אל יום');s.innerHTML=strip;wk.parentNode.insertBefore(s,wk)}
 // land on today the first time this week opens
 if(V.phoneOff!==APP.calOff){V.phoneOff=APP.calOff;const t=document.getElementById('v191d-'+today);if(t&&cols[0]&&cols[0].dataset.drop!==today)requestAnimationFrame(()=>t.scrollIntoView({block:'start'}))}
 activeDay()}
function activeDay(){const s=document.querySelector('#appviews .v191strip');if(!s)return;const st=s.getBoundingClientRect().bottom;let best=null;
 document.querySelectorAll('#appviews .v191ag>.wkc').forEach(c=>{const r=c.getBoundingClientRect();if(r.top<=st+60)best=c.dataset.drop});if(!best){const f=document.querySelector('#appviews .v191ag>.wkc');best=f&&f.dataset.drop}
 s.querySelectorAll('.v191sd').forEach(b=>b.classList.toggle('on',b.dataset.v191day===best))}
let adT=0;document.addEventListener('scroll',()=>{if(adT)return;adT=requestAnimationFrame(()=>{adT=0;activeDay()})},{passive:true,capture:true});
// month
function month(box){const mo=box.querySelector('.mo');if(!mo||mo.dataset.v191)return;mo.dataset.v191=1;const today=dk(new Date());const wide=false;let any=false;
 const n=new Date();const m0=new Date(n.getFullYear(),n.getMonth()+APP.calOff,1);
 if(V.mOff!==APP.calOff){V.mOff=APP.calOff;V.mSel=dk(m0).slice(0,7)===today.slice(0,7)?today:(items().map(i=>i.at.slice(0,10)).filter(x=>x.slice(0,7)===dk(m0).slice(0,7)).sort()[0]||dk(m0))}
 mo.querySelectorAll('.d').forEach(c=>{const ds=c.dataset.drop;if(!ds)return;if(ds<today)c.classList.add('v191pd');if(ds===V.mSel)c.classList.add('v191sel');
  const d=new Date(ds+'T12:00');const mis=[...c.querySelectorAll('.mi')];const all=items().filter(i=>i.at.slice(0,10)===ds);
  c.setAttribute('aria-label',`${DN[d.getDay()]} ${d.getDate()} ב${MON[d.getMonth()]}${ds===today?', היום':''}${all.length?`, ${all.length} פוסטים`:''}`);
  mis.forEach(mi=>{if(mi.dataset.v191)return;mi.dataset.v191=1;const it=APP.sched.items.find(i=>i.id===mi.dataset.id);if(!it)return;const st=stC(it.status);const b=mi.querySelector('b');const t=b?b.textContent:'';
   const txt=mi.textContent.replace(t,'').trim();mi.innerHTML=`<i class="v191dot" style="--c:${st[2]}" aria-hidden="true"></i><b>${esc(t)}</b><span class="v191mt">${esc(txt)}</span>${wide?`<canvas data-ti="${esc(it.id)}" width="40" height="50" aria-hidden="true"></canvas>`:''}`;mi.setAttribute('aria-label',`${t} · ${st[1]} · ${txt}`);if(wide)any=true;
   if(new Date(it.at)<new Date())mi.classList.add('v191past')});
  if(!c.querySelector('.v191dots')&&all.length)c.insertAdjacentHTML('beforeend',`<span class="v191dots" aria-hidden="true">${all.slice(0,3).map(i=>`<u style="--c:${stC(i.status)[2]}"></u>`).join('')}</span>`);
  if(PHONE()){c.tabIndex=0;c.setAttribute('role','button')}});
 if(any)try{paint(mo)}catch(e){}
 if(PHONE())dayList(box)}
function dayList(box){const mo=box.querySelector('.mo');if(!mo)return;let l=box.querySelector('.v191ml');if(!l){l=document.createElement('section');l.className='v191ml';l.setAttribute('aria-live','polite');mo.insertAdjacentElement('afterend',l)}
 const ds=V.mSel;const d=new Date(ds+'T12:00');const today=dk(new Date());const its=items().filter(i=>i.at.slice(0,10)===ds).sort((a,b)=>a.at.localeCompare(b.at));
 l.innerHTML=`<header><div><b>${ds===today?'היום':'יום '+DN[d.getDay()]}</b><span>${d.getDate()} ב${MON[d.getMonth()]} ${d.getFullYear()}</span></div>${ds>=today?`<button type="button" class="v191ml-add" data-app="newat" data-at="${ds}T10:00">${ICO.plus}<span>פוסט חדש</span></button>`:''}</header>
 ${its.length?`<ul>${its.map(it=>{const st=stC(it.status);const t=(it.label||(typeof itemText==='function'?itemText(it,'fb'):'')||'פוסט').replace(/\s+/g,' ').slice(0,90);
  return `<li><button type="button" class="v191mr" data-app="edit" data-id="${esc(it.id)}"><canvas data-ti="${esc(it.id)}" width="96" height="120" aria-hidden="true"></canvas><span class="v191mrb"><b>${esc(it.at.slice(11,16))}</b><span class="v191tx">${esc(t)}</span><span class="v191st" style="--c:${st[2]}"><i></i>${esc(st[1])}</span></span></button><button type="button" class="v191mw" data-v131open="item" data-id="${esc(it.id)}" aria-label="שינוי מועד">${ICO.clock}<span>מועד</span></button></li>`}).join('')}</ul>`:`<p class="v191ml-e">${ds<today?'לא פורסם כלום ביום הזה.':'היום הזה פנוי.'}</p>`}`;
 try{paint(l)}catch(e){}}
function selDay(ds){V.mSel=ds;document.querySelectorAll('#appviews .mo .d.v191sel').forEach(x=>x.classList.remove('v191sel'));const c=document.querySelector(`#appviews .mo .d[data-drop="${ds}"]`);if(c)c.classList.add('v191sel');const box=document.getElementById('appviews');if(box)dayList(box)}
function decorate(){const box=document.getElementById('appviews');if(!box)return;const on=APP.view==='calendar';box.classList.toggle('v191c',on);document.body.classList.toggle('v191cal',on);if(!on)return;
 try{titleBar(box)}catch(e){console.warn('v191 bar',e)}
 try{if(APP.calMode==='week'){if(box.querySelector('.wk.v62'))weekDesk(box);else weekPhone(box)}else month(box)}catch(e){console.warn('v191 cal',e)}
 try{nets(box)}catch(e){}}
render=(f=>function(){const r=f.apply(this,arguments);try{decorate()}catch(e){console.warn('v191',e)}return r})(render);
// card decorations from other modules land a frame later; nets() is cheap and idempotent
let mT=0;new MutationObserver(()=>{if(mT||typeof APP==='undefined'||APP.view!=='calendar')return;mT=requestAnimationFrame(()=>{mT=0;const b=document.getElementById('appviews');if(b)try{nets(b)}catch(e){}})}).observe(document.documentElement,{childList:true,subtree:true});
document.addEventListener('click',e=>{const t=e.target.closest&&e.target.closest('#appviews [data-app="coff"][data-d="0"]');if(t)V.toNow=true;
 const j=e.target.closest&&e.target.closest('[data-v191="now"]');if(j){e.preventDefault();e.stopPropagation();scrollNow(true);return}
 const sd=e.target.closest&&e.target.closest('#appviews [data-v191day]');if(sd){e.preventDefault();e.stopPropagation();const c=document.getElementById('v191d-'+sd.dataset.v191day);if(c)c.scrollIntoView({block:'start',behavior:RM.matches?'auto':'smooth'});return}
 const md=e.target.closest&&e.target.closest('#appviews .mo .d');if(md&&PHONE()&&!e.target.closest('.v28-more,.v44add')){e.preventDefault();e.stopPropagation();selDay(md.dataset.drop)}},true);
document.addEventListener('keydown',e=>{const md=e.target.closest&&e.target.closest('#appviews .mo .d[role="button"]');if(md&&(e.key==='Enter'||e.key===' ')){e.preventDefault();selDay(md.dataset.drop)}});

/* =========================================================== 2 · the picker ========================================================= */
const P={el:null,bd:null,o:null,anchor:null,d:null,h:10,m:0,view:null,pane:'date',slide:''};
function parseVal(v,mode){const o={d:null,h:null,m:null};v=String(v||'');let m=v.match(/^(\d{4})-(\d\d)-(\d\d)/);if(m)o.d=new Date(+m[1],m[2]-1,+m[3],12);
 m=(mode==='time'?v:v.slice(11)).match(/^(\d{1,2}):(\d\d)/);if(m){o.h=+m[1];o.m=+m[2]}return o}
function busyDays(){const c={};items().forEach(i=>{const k=i.at.slice(0,10);c[k]=(c[k]||0)+1});return c}
function recHours(dow){try{if(typeof recSlots!=='function')return new Set();return new Set(recSlots('post').slice(0,12).filter(r=>r.d===dow).map(r=>r.h))}catch(e){return new Set()}}
const fmtLong=d=>`יום ${DN[d.getDay()]}, ${d.getDate()} ב${MON[d.getMonth()]}`;
const fmtShort=d=>`יום ${DS[d.getDay()]} ${d.getDate()}.${d.getMonth()+1}`;
function value(){const o=P.o;const t=`${pad(P.h)}:${pad(P.m)}`;if(o.mode==='time')return t;const ds=dk(P.d);return o.mode==='date'?ds:ds+'T'+t}
function dateHtml(){const v=P.view,d=P.d;const first=new Date(v.getFullYear(),v.getMonth(),1),start=new Date(first);start.setDate(1-first.getDay());const today=dk(new Date()),sel=dk(d);const B=busyDays();
 let cells='';for(let i=0;i<42;i++){const x=new Date(start);x.setDate(start.getDate()+i);const ds=dk(x),out=x.getMonth()!==v.getMonth(),n=B[ds]||0;
  cells+=`<button type="button" role="gridcell" class="v191dc${out?' out':''}${ds===today?' today':''}${ds===sel?' sel':''}${ds<today?' past':''}" data-k="d" data-ds="${ds}" tabindex="${ds===sel?0:-1}" aria-selected="${ds===sel}" aria-label="${fmtLong(x)} ${x.getFullYear()}${ds===today?', היום':''}${n?`, ${n} פוסטים מתוזמנים`:''}"><span>${x.getDate()}</span>${n?`<i aria-hidden="true">${'<u></u>'.repeat(Math.min(3,n))}</i>`:''}</button>`}
 const nx=(o)=>{const t=new Date();t.setDate(t.getDate()+o);return dk(t)};const sun=(7-new Date().getDay())%7||7;
 const q=[['היום',nx(0)],['מחר',nx(1)],['ראשון הבא',nx(sun)],['בעוד שבוע',nx(7)]];
 return `<section class="v191date" aria-label="תאריך"><div class="v191q" role="group" aria-label="בחירה מהירה">${q.map(([l,ds])=>`<button type="button" data-k="q" data-ds="${ds}" aria-pressed="${ds===sel}">${l}</button>`).join('')}</div>
  <div class="v191mh"><b aria-live="polite">${MON[v.getMonth()]} ${v.getFullYear()}</b><span class="v191mn"><button type="button" class="v191ib" data-k="pm" aria-label="החודש הקודם">${ICO.chev}</button><button type="button" class="v191ib v191flip" data-k="nm" aria-label="החודש הבא">${ICO.chev}</button></span></div>
  <div class="v191wd" aria-hidden="true">${DL.map(x=>`<span>${x}</span>`).join('')}</div><div class="v191g${P.slide?' '+P.slide:''}" role="grid" aria-label="${MON[v.getMonth()]} ${v.getFullYear()}">${cells}</div></section>`}
function timeHtml(){const o=P.o;const dow=o.mode==='time'?(o.dow!=null?o.dow:-1):P.d.getDay();const rec=recHours(dow);const ds=o.mode==='time'?null:dk(P.d);
 const taken=new Set(ds?items().filter(i=>i.at.slice(0,10)===ds&&i.at!==o.value).map(i=>+i.at.slice(11,13)):[]);const mi=[0,15,30,45].indexOf(P.m);
 let hrs='';for(let h=0;h<24;h++)hrs+=`<button type="button" class="v191hc${h===P.h?' sel':''}${rec.has(h)?' rec':''}${taken.has(h)?' busy':''}" data-k="h" data-h="${h}" tabindex="${h===P.h?0:-1}" aria-pressed="${h===P.h}" aria-label="${pad(h)}${rec.has(h)?', שעה מומלצת':''}${taken.has(h)?', כבר יש פוסט בשעה הזאת':''}">${pad(h)}</button>`;
 return `<section class="v191time" aria-label="שעה"><div class="v191big"><button type="button" class="v191ib" data-k="step" data-dm="-5" aria-label="חמש דקות אחורה">−</button>
   <input class="v191tx2" data-k="tx" value="${pad(P.h)}:${pad(P.m)}" inputmode="numeric" autocomplete="off" spellcheck="false" maxlength="5" dir="ltr" aria-label="שעה מדויקת בשעון 24 שעות, למשל 14:35">
   <button type="button" class="v191ib" data-k="step" data-dm="5" aria-label="חמש דקות קדימה">+</button></div>
  <div class="v191lab"><span>שעה</span>${rec.size?'<small><i></i>מומלץ לקהל שלכם</small>':''}</div><div class="v191hs" role="group" aria-label="שעה">${hrs}</div>
  <div class="v191lab"><span>דקות</span><small>או הקלידו דקה מדויקת למעלה</small></div>
  <div class="v191ms" role="radiogroup" aria-label="דקות" style="--i:${mi}"><span class="v191th" aria-hidden="true"></span>${[0,15,30,45].map(m=>`<button type="button" role="radio" data-k="m" data-m="${m}" aria-checked="${P.m===m}" tabindex="${P.m===m||(mi<0&&m===0)?0:-1}">:${pad(m)}</button>`).join('')}</div></section>`}
function html(){const o=P.o,sheet=P.sheet;const two=o.mode==='datetime'&&!sheet;const tl=o.title||(o.mode==='time'?'בחירת שעה':o.mode==='date'?'בחירת תאריך':'בחירת מועד');
 const sum=o.mode==='datetime'?`<div class="v191sum" role="group" aria-label="מה בוחרים">${sheet?`<button type="button" data-k="pane" data-p="date" aria-pressed="${P.pane==='date'}">${ICO.cal}<span>${esc(fmtLong(P.d))}</span></button><button type="button" data-k="pane" data-p="time" aria-pressed="${P.pane==='time'}">${ICO.clock}<span dir="ltr">${pad(P.h)}:${pad(P.m)}</span></button>`:`<span class="v191sv">${ICO.cal}<b>${esc(fmtLong(P.d))} ${P.d.getFullYear()}</b><i>·</i><b dir="ltr">${pad(P.h)}:${pad(P.m)}</b></span>`}</div>`
  :o.mode==='date'?`<div class="v191sum"><span class="v191sv">${ICO.cal}<b>${esc(fmtLong(P.d))} ${P.d.getFullYear()}</b></span></div>`:`<div class="v191sum"><span class="v191sv">${ICO.clock}<b dir="ltr">${pad(P.h)}:${pad(P.m)}</b>${o.sub?`<small>${esc(o.sub)}</small>`:''}</span></div>`;
 const showD=o.mode!=='time'&&(!sheet||o.mode==='date'||P.pane==='date'),showT=o.mode!=='date'&&(!sheet||o.mode==='time'||P.pane==='time');
 return `${sheet?'<div class="v191grab" aria-hidden="true"><i></i></div>':''}<header class="v191ph"><button type="button" class="v191tb" data-k="x">ביטול</button><b id="v191pt">${esc(tl)}</b><button type="button" class="v191tb pri" data-k="ok">אישור</button></header>
  ${sum}<div class="v191body${two?' two':''}">${showD?dateHtml():''}${showT?timeHtml():''}</div>`}
function draw(focusKey){if(!P.el)return;const keep=focusKey||(()=>{const a=document.activeElement;if(!a||!P.el.contains(a))return null;return a.dataset.k==='d'?'d':a.dataset.k==='h'?'h':a.dataset.k==='m'?'m':a.dataset.k==='tx'?'tx':a.dataset.k?'['+a.dataset.k+']':null})();
 P.el.querySelector('.v191in').innerHTML=html();P.slide='';
 if(keep){const f=keep==='d'?P.el.querySelector('.v191dc.sel'):keep==='h'?P.el.querySelector('.v191hc.sel'):keep==='m'?(P.el.querySelector('.v191ms [aria-checked="true"]')||P.el.querySelector('.v191ms button')):keep==='tx'?P.el.querySelector('.v191tx2'):P.el.querySelector(`[data-k="${keep.slice(1,-1)}"]`);if(f)f.focus({preventScroll:true})}
 if(!P.sheet)place()}
function place(){const el=P.el,a=P.anchor;if(!el||!a||P.sheet)return;const r=a.getBoundingClientRect();const w=el.offsetWidth,h=el.offsetHeight;const vw=innerWidth,vh=innerHeight;
 let left=Math.min(Math.max(8,r.right-w),vw-w-8);let top=r.bottom+8,below=true;if(top+h>vh-8){if(r.top-h-8>=8){top=r.top-h-8;below=false}else top=Math.max(8,Math.min(vh-h-8,(vh-h)/2))}
 el.style.left=left+'px';el.style.top=top+'px';el.style.transformOrigin=`${Math.max(16,Math.min(w-16,r.left+r.width/2-left))}px ${below?'0':'100%'}`}
function open(anchor,val,opts,cb){close(true);opts=Object.assign({mode:'datetime'},opts||{});P.o=Object.assign({value:val},opts);P.cb=cb;P.anchor=anchor;P.prevFocus=document.activeElement;
 const pv=parseVal(val,opts.mode);const now=new Date();P.d=pv.d||new Date(now.getFullYear(),now.getMonth(),now.getDate(),12);P.h=pv.h!=null?pv.h:(opts.defH!=null?opts.defH:10);P.m=pv.m!=null?pv.m:0;
 P.view=new Date(P.d.getFullYear(),P.d.getMonth(),1);P.pane=opts.pane||'date';P.sheet=innerWidth<=700;
 const el=document.createElement('div');el.className='v191pk '+(P.sheet?'sheet':'pop')+' m-'+opts.mode;el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-labelledby','v191pt');el.dir='rtl';el.innerHTML='<div class="v191in"></div>';
 const bd=document.createElement('div');bd.className='v191bd'+(P.sheet?' dim':'');document.body.appendChild(bd);document.body.appendChild(el);P.el=el;P.bd=bd;
 draw();if(!P.sheet)place();requestAnimationFrame(()=>{el.classList.add('on');bd.classList.add('on')});
 const f=opts.mode==='time'?el.querySelector('.v191tx2'):el.querySelector('.v191dc.sel');if(f)f.focus({preventScroll:true});
 bd.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();close()});bd.addEventListener('click',e=>{e.preventDefault();e.stopPropagation()});
 el.addEventListener('click',onClick);el.addEventListener('keydown',onKey);el.addEventListener('input',onInput);el.addEventListener('change',e=>e.stopPropagation());el.addEventListener('focusout',onBlur);
 if(P.sheet)grab(el)}
function close(now){const el=P.el,bd=P.bd;if(!el)return;P.el=null;P.bd=null;const back=P.anchor;
 if(now||RM.matches){el.remove();bd&&bd.remove()}else{el.classList.remove('on');el.classList.add('off');bd&&bd.classList.remove('on');setTimeout(()=>{el.remove();bd&&bd.remove()},P.sheet?220:140)}
 if(!now&&back&&document.contains(back))try{back.focus({preventScroll:true})}catch(e){}}
function commit(){normTx();const v=value(),cb=P.cb;const back=P.anchor;close();P.cb=null;try{cb&&cb(v)}catch(e){console.error('v191 pick',e)}return v}
function normTx(){const t=P.el&&P.el.querySelector('.v191tx2');if(!t)return true;const r=parseTx(t.value);if(r){P.h=r[0];P.m=r[1];t.removeAttribute('aria-invalid');return true}t.setAttribute('aria-invalid','true');return false}
function parseTx(s){s=String(s||'').trim().replace(/[.,;\s]/g,':');let m=s.match(/^(\d{1,2}):(\d{1,2})$/);let h,mi;if(m){h=+m[1];mi=+m[2]}else if(/^\d{1,4}$/.test(s)){if(s.length<=2){h=+s;mi=0}else if(s.length===3){h=+s[0];mi=+s.slice(1)}else{h=+s.slice(0,2);mi=+s.slice(2)}}else return null;return h<24&&mi<60?[h,mi]:null}
function onInput(e){const t=e.target;if(!t.classList.contains('v191tx2'))return;e.stopPropagation();const r=parseTx(t.value);if(r&&/^\d{1,2}:\d\d$/.test(t.value.trim())){P.h=r[0];P.m=r[1];t.removeAttribute('aria-invalid');syncTime()}}
function onBlur(e){if(e.target.classList&&e.target.classList.contains('v191tx2')){if(normTx()){e.target.value=`${pad(P.h)}:${pad(P.m)}`;syncTime()}}}
// update the time parts without rebuilding the field the user is typing in
function syncTime(){const el=P.el;if(!el)return;el.querySelectorAll('.v191hc').forEach(b=>{const on=+b.dataset.h===P.h;b.classList.toggle('sel',on);b.setAttribute('aria-pressed',on);b.tabIndex=on?0:-1});
 const ms=el.querySelector('.v191ms');if(ms){const i=[0,15,30,45].indexOf(P.m);ms.style.setProperty('--i',i);ms.querySelectorAll('button').forEach(b=>{const on=+b.dataset.m===P.m;b.setAttribute('aria-checked',on);b.tabIndex=on||(i<0&&b.dataset.m==='0')?0:-1})}
 el.querySelectorAll('.v191sum [dir="ltr"]').forEach(s=>s.textContent=`${pad(P.h)}:${pad(P.m)}`)}
function setDay(ds,advance){const d=new Date(ds+'T12:00');const dir=d<P.view?'r':d>=new Date(P.view.getFullYear(),P.view.getMonth()+1,1)?'l':'';P.d=d;if(dir){P.view=new Date(d.getFullYear(),d.getMonth(),1);P.slide='sl-'+dir}
 if(advance&&P.sheet&&P.o.mode==='datetime'){P.pane='time';draw('[pane]');return}draw('d')}
function onClick(e){const b=e.target.closest('[data-k]');e.stopPropagation();if(!b||b.tagName==='INPUT')return;e.preventDefault();const k=b.dataset.k;
 if(k==='x'){close();return}if(k==='ok'){commit();return}
 if(k==='pm'||k==='nm'){P.view=new Date(P.view.getFullYear(),P.view.getMonth()+(k==='pm'?-1:1),1);P.slide=k==='pm'?'sl-r':'sl-l';draw('['+k+']');return}
 if(k==='d'){setDay(b.dataset.ds,true);return}if(k==='q'){setDay(b.dataset.ds,true);return}
 if(k==='pane'){P.pane=b.dataset.p;draw('[pane]');return}
 if(k==='h'){P.h=+b.dataset.h;syncTime();b.focus({preventScroll:true});return}
 if(k==='m'){P.m=+b.dataset.m;syncTime();const t=P.el.querySelector('.v191tx2');if(t)t.value=`${pad(P.h)}:${pad(P.m)}`;b.focus({preventScroll:true});return}
 if(k==='step'){normTx();let t=P.h*60+P.m+(+b.dataset.dm);t=(t+1440)%1440;P.h=Math.floor(t/60);P.m=t%60;const x=P.el.querySelector('.v191tx2');if(x)x.value=`${pad(P.h)}:${pad(P.m)}`;syncTime();return}}
function onKey(e){const k=e.key,t=e.target;
 if(k==='Escape'){e.preventDefault();e.stopPropagation();close();return}
 if(k==='Tab'){const f=[...P.el.querySelectorAll('button,input')].filter(x=>x.tabIndex>=0&&x.offsetParent!==null);if(!f.length)return;const i=f.indexOf(t);if(e.shiftKey&&i<=0){e.preventDefault();f[f.length-1].focus()}else if(!e.shiftKey&&i===f.length-1){e.preventDefault();f[0].focus()}return}
 if(t.dataset.k==='d'){const mv={ArrowLeft:1,ArrowRight:-1,ArrowDown:7,ArrowUp:-7}[k];const d=new Date(P.d);
  if(mv!=null)d.setDate(d.getDate()+mv);else if(k==='PageUp')d.setMonth(d.getMonth()-1);else if(k==='PageDown')d.setMonth(d.getMonth()+1);else if(k==='Home')d.setDate(d.getDate()-d.getDay());else if(k==='End')d.setDate(d.getDate()+6-d.getDay());
  else if(k==='Enter'){e.preventDefault();if(P.o.mode==='date'||!P.sheet)commit();else setDay(t.dataset.ds,true);return}else return;
  e.preventDefault();e.stopPropagation();setDay(dk(d),false);return}
 if(t.dataset.k==='h'){const mv={ArrowLeft:1,ArrowRight:-1,ArrowDown:6,ArrowUp:-6}[k];if(mv!=null){e.preventDefault();P.h=(P.h+mv+24)%24;syncTime();const x=P.el.querySelector('.v191tx2');if(x)x.value=`${pad(P.h)}:${pad(P.m)}`;const n=P.el.querySelector('.v191hc.sel');n&&n.focus({preventScroll:true});return}}
 if(t.dataset.k==='m'){const L=[0,15,30,45];const mv={ArrowLeft:1,ArrowRight:-1,ArrowDown:1,ArrowUp:-1}[k];if(mv!=null){e.preventDefault();let i=L.indexOf(P.m);i=i<0?0:(i+mv+4)%4;P.m=L[i];syncTime();const x=P.el.querySelector('.v191tx2');if(x)x.value=`${pad(P.h)}:${pad(P.m)}`;const n=P.el.querySelector('.v191ms [aria-checked="true"]');n&&n.focus({preventScroll:true});return}}
 if(t.classList.contains('v191tx2')){if(k==='ArrowUp'||k==='ArrowDown'){e.preventDefault();normTx();let m=P.h*60+P.m+(k==='ArrowUp'?1:-1)*(e.shiftKey?15:1);m=(m+1440)%1440;P.h=Math.floor(m/60);P.m=m%60;t.value=`${pad(P.h)}:${pad(P.m)}`;syncTime();return}
  if(k==='Enter'){e.preventDefault();if(normTx())commit();return}}
 if(k==='Enter'&&t.tagName!=='BUTTON'){e.preventDefault();commit()}}
// the sheet follows the finger down and closes past a threshold or on a flick
function grab(el){let s=null;const start=e=>{if(e.target.closest('button,input'))return;if(e.pointerType==='mouse'&&e.button!==0)return;s={y:e.clientY,t:performance.now(),dy:0,v:0,ly:e.clientY,lt:performance.now()};el.style.transition='none';try{el.setPointerCapture(e.pointerId)}catch(x){}};
 const move=e=>{if(!s)return;const dy=e.clientY-s.y;const now=performance.now();s.v=(e.clientY-s.ly)/Math.max(1,now-s.lt);s.ly=e.clientY;s.lt=now;s.dy=dy;const y=dy<0?-Math.sqrt(-dy)*2:dy;el.style.transform=`translateY(${y}px)`};
 const end=()=>{if(!s)return;const {dy,v}=s;s=null;el.style.transition='';el.style.transform='';if(dy>110||(v>.6&&dy>20))close()};
 const h=el.querySelector('.v191in');el.addEventListener('pointerdown',e=>{if(e.target.closest('.v191grab,.v191ph'))start(e)});el.addEventListener('pointermove',move);el.addEventListener('pointerup',end);el.addEventListener('pointercancel',end)}
// Escape before any sheet below it sees the key
window.addEventListener('keydown',e=>{if(P.el&&e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();close()}},true);
window.addEventListener('resize',()=>{if(P.el&&!P.sheet)place()});
// every caller of the old picker gets this one
window.v44Open=function(anchor,val,opts,onPick){opts=opts||{};open(anchor,val,{mode:opts.time===false?'date':'datetime'},onPick)};

/* =========================================================== 3 · native inputs become the picker =================================== */
const SETV=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;
const MODE={time:'time',date:'date','datetime-local':'datetime'};
function label(inp){const a=inp.getAttribute('aria-label');if(a)return a;const l=inp.closest('label');if(l){const t=[...l.childNodes].filter(n=>n!==inp&&!(n.classList&&n.classList.contains('v191f'))).map(n=>n.textContent).join(' ').replace(/\s+/g,' ').trim();if(t)return t}return ''}
function text(inp){const v=inp.value,m=MODE[inp.type];if(!v)return inp.dataset.slotin!=null?'הוספת שעה':m==='time'?'בחירת שעה':m==='date'?'בחירת תאריך':'בחירת מועד';
 const o=parseVal(v,m);if(m==='time')return `${pad(o.h)}:${pad(o.m)}`;if(!o.d)return v;if(m==='date')return `${fmtLong(o.d)} ${o.d.getFullYear()}`;return `${fmtShort(o.d)} · ${o.h!=null?pad(o.h)+':'+pad(o.m):''}`}
function paintF(inp){const b=inp._v191;if(!b)return;const t=text(inp);const s=b.querySelector('.v191fv');if(s&&s.textContent!==t)s.textContent=t;b.classList.toggle('empty',!inp.value);const l=label(inp);b.setAttribute('aria-label',(l?l+': ':'')+t)}
function hook(inp){if(inp._v191||inp.closest('.v191pk'))return;const m=MODE[inp.type];if(!m)return;inp.dataset.v44='1';inp.readOnly=false;
 const b=document.createElement('button');b.type='button';b.className='v191f m-'+m+(inp.dataset.slotin!=null?' slot':'');b.setAttribute('aria-haspopup','dialog');
 b.innerHTML=`<i class="v191fi">${inp.dataset.slotin!=null?ICO.plus:m==='time'?ICO.clock:ICO.cal}</i><span class="v191fv"></span>${inp.dataset.slotin!=null?'':`<i class="v191fc">${ICO.down}</i>`}`;
 inp.insertAdjacentElement('afterend',b);inp._v191=b;inp.classList.add('v191h');inp.tabIndex=-1;inp.setAttribute('aria-hidden','true');paintF(inp);
 const go=e=>{e.preventDefault();e.stopPropagation();let dow=null;if(inp.dataset.slotin!=null)dow=+inp.dataset.slotin;
  const sub=dow!=null?'שעה קבועה ביום '+DN[dow]:'';open(b,inp.value,{mode:m,dow,sub,title:inp.dataset.slotin!=null?'שעה קבועה חדשה':null,defH:dow!=null?10:null},v=>{
   SETV.call(inp,v);try{if(inp.dataset.app==='cat'&&window.APP&&APP.cmp){APP.cmp.at=v;APP.cmp.sched=true}}catch(x){}paintF(inp);
   const key=[...inp.attributes].filter(a=>/^data-(v131|v157|slotin|app|f)$/.test(a.name)).map(a=>`[${a.name}="${CSS.escape(a.value)}"]`).join('');
   inp.dispatchEvent(new Event('input',{bubbles:true}));inp.dispatchEvent(new Event('change',{bubbles:true}));
   // the owner may redraw its markup: give focus back to the new field
   setTimeout(()=>{if(document.activeElement&&document.activeElement!==document.body&&document.contains(document.activeElement))return;const n=key&&document.querySelector('input'+key);const nb=(n&&n._v191)||(document.contains(b)?b:null);if(nb)try{nb.focus({preventScroll:true})}catch(x){}},60)})};
 b.addEventListener('click',go);
 try{inp.showPicker=()=>b.click()}catch(e){}}
function scan(){document.querySelectorAll('input[type="time"],input[type="date"],input[type="datetime-local"]').forEach(hook)}
let sT=0;new MutationObserver(()=>{if(sT)return;sT=requestAnimationFrame(()=>{sT=0;scan()})}).observe(document.documentElement,{childList:true,subtree:true});scan();
// a value set from code (or by a test) shows on the field
document.addEventListener('input',e=>{const t=e.target;if(t&&t._v191)paintF(t)},true);document.addEventListener('change',e=>{const t=e.target;if(t&&t._v191)paintF(t)},true);

window.__v191={open,close,value:()=>P.el?value():null,S:P,V,decorate,scrollNow,parseTx};
})();
/*V191:END*/
