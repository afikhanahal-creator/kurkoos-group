// ================= V174 · posts that are easy to choose: each card says what it is (headline and one status chip), filters for
//                   status, score and publish date, a calm phone header (one quick view pill, one row of pills), an explicit
//                   selection mode with a one row bar, week groups that only appear when they help =================
(()=>{
if(window.__v174)return;window.__v174=1;
const V=window.__v170;if(!V||!V.F){console.warn('v174: v170 missing');return}
const F=V.F;['st','sc','pub'].forEach(k=>{if(!Array.isArray(F[k]))F[k]=[]});
const H=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const DAY=864e5;
const PH=()=>matchMedia('(max-width:700px)').matches;
const lsG=k=>{try{return localStorage.getItem(k)}catch(e){return null}};
const lsS=(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}};
const svg=(d,w=18)=>`<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const IC={sel:svg('<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="m8 12.5 3 3 5-6"/>'),x:svg('<path d="M6 6l12 12M18 6 6 18"/>',16),
 clock:svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),more:svg('<circle cx="5" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="19" cy="12" r="1.6" fill="currentColor"/>',20),
 chev:svg('<path d="m6 9 6 6 6-6"/>',16),cal:svg('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/>'),slots:svg('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 14h2M12 14h2M16 14h2M8 17.5h2"/>'),
 all:svg('<path d="M5 12.5l4.5 4.5L19 7"/>'),wand:svg('<path d="M4 20L15 9"/><path d="M14 4v3M12.5 5.5h3M19 9v3M17.5 10.5h3"/>'),trash:svg('<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>')};

/* ---------------- status, score, publish date ---------------- */
const STN=[['ready','מוכן'],['sched','מתוזמן'],['check','דורש בדיקה'],['pub','פורסם']];
const SCN=[['hi','8 ומעלה'],['mid','6 עד 7.9'],['lo','מתחת ל 6']];
const PUBN=[['tw','השבוע'],['nw','שבוע הבא'],['none','לא מתוזמן']];
const LAB={st:Object.fromEntries(STN),sc:Object.fromEntries(SCN),pub:Object.fromEntries(PUBN)};
const isPub=x=>x.w==='published';
function stOk(x,k){if(k==='ready')return V.isReady(x);if(k==='sched')return !!x.it;if(k==='check')return V.isCheck(x);if(k==='pub')return isPub(x);return false}
function scOf(x){const a=+(x.q&&x.q.avg);if(!isFinite(a))return '';return a>=8?'hi':a>=6?'mid':'lo'}
function weekStart(off){const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-d.getDay()+7*off);return d.getTime()}
function pubOf(x){if(!x.it||!x.it.at)return 'none';const t=Date.parse(x.it.at);if(isNaN(t))return '';const a=weekStart(0),b=weekStart(1),c=weekStart(2);return t>=a&&t<b?'tw':t>=b&&t<c?'nw':''}
// the facet hook inside v170: every list, count and chip goes through it
window.__v174f=(x,skip)=>{const st=F.st||[],sc=F.sc||[],pb=F.pub||[];
 if(skip!=='st'&&st.length&&!st.some(k=>stOk(x,k)))return false;
 if(skip!=='sc'&&sc.length&&!sc.includes(scOf(x)))return false;
 if(skip!=='pub'&&pb.length&&!pb.includes(pubOf(x)))return false;return true};
window.__v174p=P=>{(F.st||[]).forEach(k=>P.push(['st',k,LAB.st[k]||k]));(F.sc||[]).forEach(k=>P.push(['sc',k,'ציון '+(LAB.sc[k]||k)]));(F.pub||[]).forEach(k=>P.push(['pub',k,k==='none'?'לא מתוזמן':'פרסום '+(LAB.pub[k]||k)]))};
window.__v174n=()=>(F.st||[]).length+(F.sc||[]).length+(F.pub||[]).length;

/* ---------------- quick views are presets of these filters ---------------- */
const QV=[['all','הכל','הכל'],['week','חדשים השבוע','חדשים'],['ads','מודעות פרויקטים','מודעות'],['ready','מוכנים לתזמון','מוכנים'],['sched','מתוזמנים','מתוזמנים'],['check','דורשים בדיקה','לבדיקה']];
const PRE={all:{},week:{when:'7'},ads:{ads:1},ready:{st:['ready']},sched:{st:['sched']},check:{st:['check']}};
function applyPre(k,T=F){const p=PRE[k]||{};T.st=p.st?p.st.slice():[];T.when=p.when||'';T.fam=(T.fam||[]).filter(f=>f!=='ads');if(p.ads)T.fam.push('ads')}
function curPre(){const ads=F.fam.includes('ads');const st=(F.st||[]).slice().sort().join(',');
 for(const [k] of QV){const p=PRE[k];if((p.st?p.st.join(','):'')===st&&(p.when||'')===F.when&&!!p.ads===ads)return k}return ''}
function preCounts(){const B=V.base();const b=B?B.l:[];const keep={st:F.st,when:F.when,fam:F.fam};const c={};
 try{QV.forEach(([k])=>{applyPre(k);c[k]=V.facets(b,'').length})}finally{Object.assign(F,keep)}return c}
function setPre(k){applyPre(k);F.qv='all';V.saveF();V.mirror();GA.lim=60;V.fastPaint()}
// a view asked for from another screen (Today, photos) arrives as F.qv: turn it into the same preset
function adoptQv(){if(!F.qv||F.qv==='all')return false;const k=F.qv;applyPre(k);F.qv='all';V.saveF();V.mirror();return true}

/* ---------------- cards: headline and one status chip ---------------- */
function chipOf(x){try{
 if(x.it&&x.it.at){const a=String(x.it.at);const d=a.slice(8,10)+'.'+a.slice(5,7)+(a.length>15?' · '+a.slice(11,16):'');let full='';try{full=fmtDate(a)}catch(e){}return ['sched','מתוזמן · '+d,full]}
 if(isPub(x))return ['pub','פורסם'];
 if(V.isCheck(x))return ['check','דורש בדיקה · '+(Math.round((+x.q.avg||0)*10)/10)];
 if(V.isReady(x))return ['ready','מוכן'];}catch(e){}return null}
gaCard=(f=>function(x){let h=f.apply(this,arguments);try{if(typeof APP==='undefined'||APP.view!=='gallery'||!x||!x.p)return h;
 let head='';try{head=pxHead(x.p)}catch(e){}head=String(head||'').replace(/\s+/g,' ').trim();
 const c=chipOf(x);
 const blk=`<div class="v174t">${head?`<b class="v174h">${H(head)}</b>`:''}${c?`<span class="v174c v174c-${c[0]}"${c[2]?` title="${H(c[2])}"`:''}>${H(c[1])}</span>`:''}</div>`;
 if(h.includes('<div class="v170meta">'))h=h.replace('<div class="v170meta">',blk+'<div class="v170meta">');else h=h.replace(/<\/figure>\s*$/,blk+'</figure>');
 // the series repeats the only series filter: leave only the project
 const m=x.m;if(m&&F.ser.length===1&&m.ser===F.ser[0])h=h.replace(/<span class="v170ser">[^<]*<\/span>/,'');
 }catch(e){console.warn('v174 card',e)}return h})(gaCard);

/* ---------------- week groups ---------------- */
const GB=['השבוע','שבוע שעבר','לפני 2 עד 4 שבועות','קודם'];
function gOf(c){if(!c)return 3;const a=weekStart(0);if(c>=a)return 0;if(c>=a-7*DAY)return 1;if(c>=a-28*DAY)return 2;return 3}

/* ---------------- selection mode ---------------- */
const SEL={on:false};
const selIds=()=>{try{return [...GA.sel].filter(id=>AG.posts.some(p=>p.id===id))}catch(e){return []}};

/* ---------------- the posts header, rebuilt around v170's markup ---------------- */
function post(h){const t=document.createElement('template');t.innerHTML=h;const root=t.content.querySelector('.v170');if(!root)return h;
 const bar=root.querySelector('.v170bar');const pre=curPre();const pc=preCounts();const fmt=n=>(+n||0).toLocaleString('he-IL');
 if(bar){const q=bar.querySelector('.v170q');const fb=bar.querySelector('.v170fbtn');const srt=bar.querySelector('.v170sel');
  if(q&&PH()){const i=q.querySelector('input');if(i)i.setAttribute('placeholder','חיפוש פוסט')}
  // phones: the quick views are one pill next to search
  const lab=pre?QV.find(v=>v[0]===pre)[2]:'מותאם';
  const pill=document.createElement('label');pill.className='v174qvp'+(pre&&pre!=='all'?' on':'');
  pill.innerHTML=`<span class="v174qvl">${H(lab)}</span>${IC.chev}<select data-v174qv aria-label="תצוגה מהירה">${pre?'':'<option value="" selected disabled>סינון מותאם</option>'}${QV.map(([k,l])=>`<option value="${k}"${pre===k?' selected':''}>${H(l)} (${fmt(pc[k])})</option>`).join('')}</select>`;
  if(q)q.after(pill);
  if(fb){fb.setAttribute('aria-label','סינון'+(V.nActive()?`, ${V.nActive()} פעילים`:''));
   const sb=document.createElement('button');sb.type='button';sb.className='v170fbtn v174selb'+(SEL.on?' on':'');sb.dataset.v174='selmode';sb.setAttribute('aria-pressed',String(SEL.on));sb.setAttribute('aria-label','בחירת פוסטים');sb.title='בחירת כמה פוסטים';
   sb.innerHTML=`${IC.sel}<span>בחירה</span>`;fb.after(sb)}
  // sort, with the view size folded into the same menu
  if(srt){const s=srt.querySelector('select');if(s){const og=document.createElement('optgroup');og.label='מיון';[...s.querySelectorAll('option')].forEach(o=>og.appendChild(o));s.appendChild(og);
    const sz=GA.f.size||'m';const og2=document.createElement('optgroup');og2.label='גודל תצוגה';og2.innerHTML=[['s','קטן'],['m','בינוני'],['l','גדול']].map(([k,l])=>`<option value="size:${k}">${sz===k?'✓ ':''}גודל ${l}</option>`).join('');s.appendChild(og2)}
   srt.remove();srt.classList.add('v174sort')}
  // quick view tabs (desktop): presets with counts
  const tabs=root.querySelector('.v170qv');if(tabs)tabs.innerHTML=QV.map(([k,l])=>`<button type="button" role="tab" data-v174="pre" data-k="${k}" aria-selected="${pre===k}">${H(l)}<i>${fmt(pc[k])}</i></button>`).join('');
  // the count line: count and sort; the pills: one scrolling row
  const res=root.querySelector('.v170res');if(res){const cnt=res.querySelector('.v170cnt');const pills=[...res.querySelectorAll('.v170pill,.v170link')];
   const row=document.createElement('div');row.className='v174cntr';if(cnt)row.appendChild(cnt);const sp=document.createElement('span');sp.className='v170sp';row.appendChild(sp);if(srt)row.appendChild(srt);
   const pr=document.createElement('div');pr.className='v174pills';pr.setAttribute('role','group');pr.setAttribute('aria-label','מסננים פעילים');pills.forEach(p=>pr.appendChild(p));
   const nt=root.querySelector('#v170note');if(nt)sp.before(nt);
   res.replaceWith(row);if(pills.length)row.after(pr)}}
 // week groups, only when they split the list in a useful way
 root.querySelectorAll('.v170gh').forEach(g=>g.remove());
 const L=V.last()||[];
 if(F.sort==='new'&&L.length){const bc=[0,0,0,0];const by=new Map();L.forEach(x=>{const g=gOf(x.m&&x.m.c);bc[g]++;by.set(x.p.id,g)});
  if(Math.max(...bc)<=L.length*.8){let cur=-1;root.querySelectorAll('.ga-grid>.ga-card[data-gaid]').forEach(c=>{const g=by.get(c.dataset.gaid);if(g==null||g===cur)return;cur=g;
   const hd=document.createElement('h3');hd.className='v170gh';hd.innerHTML=`<span>${GB[g]}</span><i>${fmt(bc[g])}</i>`;c.before(hd)})}}
 if(SEL.on)root.classList.add('v174selon');
 return t.innerHTML}
vGallery=(f=>function(){let h=f.apply(this,arguments);try{if(adoptQv())h=f.apply(this,arguments);h=post(h)}catch(e){console.warn('v174 gallery',e)}return h})(vGallery);

/* ---------------- the filter sheet: three new sections, folded sections, no view size ---------------- */
const OPEN=new Map([['פרויקט',true],['מצב',true]]);
function chips(g,items,cnt){return `<div class="v170chips" role="group">${items.map(([k,l])=>{const on=(F[g]||[]).includes(k);const n=cnt.get(k)||0;return `<button type="button" data-v170="fx" data-g="${g}" data-k="${k}" aria-pressed="${on}"${n===0&&!on?' class="v170z"':''}>${H(l)}<i>${n.toLocaleString('he-IL')}</i></button>`}).join('')}</div>`}
function counts(skip,fn){const B=V.base();const c=new Map();V.facets(B?B.l:[],skip).forEach(x=>{const ks=fn(x);(Array.isArray(ks)?ks:[ks]).forEach(k=>c.set(k,(c.get(k)||0)+1))});return c}
window.__v174sh=html=>{try{const t=document.createElement('template');t.innerHTML=html;const body=t.content.querySelector('.v170shb');if(!body)return html;
 const cst=counts('st',x=>STN.map(s=>s[0]).filter(k=>stOk(x,k)));const csc=counts('sc',scOf);const cpb=counts('pub',pubOf);
 const sts=STN.filter(([k])=>k!=='pub'||cst.get('pub')||F.st.includes('pub'));
 const mk=(title,inner)=>{const s=document.createElement('section');s.innerHTML=`<h3>${title}</h3>${inner}`;return s};
 const secs=[...body.querySelectorAll(':scope>section')];
 secs.forEach(s=>{const h=s.querySelector('h3');if(h&&/גודל תצוגה/.test(h.textContent))s.remove()});
 const proj=secs.find(s=>{const h=s.querySelector('h3');return h&&h.textContent.trim()==='פרויקט'});
 const add=[mk('מצב',chips('st',sts,cst)),mk('ציון',chips('sc',SCN,csc)),mk('מועד פרסום',chips('pub',PUBN,cpb))];
 if(proj)proj.after(...add);else body.prepend(...add);
 const act={'פרויקט':F.proj.length,'מצב':F.st.length,'ציון':F.sc.length,'מועד פרסום':F.pub.length,'משפחת תבנית':F.fam.length,'נושא / תחום':F.dom.length,'סוג תמונה':F.img.length,'תאריך יצירה':F.when?1:0};
 body.querySelectorAll(':scope>section').forEach(s=>{const h=s.querySelector(':scope>h3');if(!h)return;const key=(h.firstChild&&h.firstChild.textContent||h.textContent).trim();
  const n=/סדרה/.test(key)?F.ser.length:(act[key]||0);const open=OPEN.has(key)?OPEN.get(key):n>0;
  const d=document.createElement('details');d.dataset.v174k=key;if(open)d.open=true;const sm=document.createElement('summary');sm.appendChild(h);
  if(n){const b=document.createElement('b');b.className='v174sn';b.textContent=n;b.setAttribute('aria-label',n+' נבחרו');sm.appendChild(b)}
  sm.insertAdjacentHTML('beforeend',`<span class="v174sc" aria-hidden="true">${IC.chev}</span>`);
  d.appendChild(sm);[...s.childNodes].forEach(n2=>d.appendChild(n2));s.appendChild(d)});
 return t.innerHTML}catch(e){console.warn('v174 sheet',e);return html}};
document.addEventListener('toggle',e=>{const d=e.target;if(d&&d.dataset&&d.dataset.v174k)OPEN.set(d.dataset.v174k,d.open)},true);

/* ---------------- one bottom sheet, same look as v172 ---------------- */
function sheet(title,sub,items){const old=document.getElementById('v172sheet');if(old)old.remove();const back=document.activeElement;
 const w=document.createElement('div');w.id='v172sheet';w.className='v174sheet';w.setAttribute('role','dialog');w.setAttribute('aria-modal','true');w.setAttribute('aria-label',title);
 w.innerHTML=`<div class="v172bg" data-v172x="1"></div><div class="v172pan"><div class="v172grip" aria-hidden="true"></div><div class="v172h"><div><b>${H(title)}</b>${sub?`<span>${H(sub)}</span>`:''}</div><button type="button" class="v172x" data-v172x="1" aria-label="סגירה">${IC.x}</button></div><div class="v172l"></div></div>`;
 const l=w.querySelector('.v172l');
 items.forEach(it=>{const b=document.createElement('button');b.type='button';b.className='v172i'+(it.danger?' danger':'');b.disabled=!!it.disabled;
  b.innerHTML=`<span class="v172ic" aria-hidden="true">${it.icon||''}</span><span class="v172t">${H(it.label)}</span>`;
  b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();
   if(it.confirm&&b.dataset.ok!=='1'){b.dataset.ok='1';b.classList.add('arm');b.querySelector('.v172t').textContent=it.confirm;return}
   w.remove();try{back&&back.isConnected&&back.focus({preventScroll:true})}catch(x){}setTimeout(()=>{try{it.run()}catch(x){console.error('v174',x)}},0)});
  l.appendChild(b)});
 document.body.appendChild(w);requestAnimationFrame(()=>w.classList.add('in'));setTimeout(()=>{const f=l.querySelector('button:not(:disabled)');f&&f.focus({preventScroll:true})},60)}

/* ---------------- the selection bar ---------------- */
const hidden=a=>document.querySelector(`.v170 .ga-selbar [data-ga="${a}"]`);
function clickHidden(a){const b=hidden(a);if(!b){toast&&toast('הפעולה לא זמינה כרגע');return false}b.click();return true}
function after(){setTimeout(()=>{if(!selIds().length)setMode(false);else sync()},80)}
function openSched(){const n=selIds().length;if(!n)return;
 sheet('תזמון',n===1?'פוסט אחד נבחר':`${n} פוסטים נבחרו`,[
  {icon:IC.slots,label:'במשבצות הפנויות הקרובות',run:()=>{clickHidden('schedsel');after()}},
  {icon:IC.cal,label:'ליום שאבחר',run:()=>{clickHidden('cal');after()}}])}
function openMore(){const n=selIds().length;const shown=Math.min((V.last()||[]).length,GA.lim||60);
 sheet('עוד פעולות',n?`${n} נבחרו`:'',[
  {icon:IC.all,label:`בחר הכל (${shown.toLocaleString('he-IL')} המוצגים)`,run:()=>{(V.last()||[]).slice(0,GA.lim||60).forEach(x=>GA.sel.add(x.p.id));markCards();sync()}},
  {icon:IC.wand,label:'תיקון לנבחרים',disabled:!n,run:()=>{clickHidden('fixsel')}},
  {icon:IC.trash,label:n>1?`מחיקת ${n} פוסטים`:'מחיקת הפוסט',danger:true,disabled:!n,confirm:'לחצו שוב כדי למחוק',run:()=>{const b=hidden('delsel');if(!b)return;b.dataset.ok='1';b.click();after()}}])}
function bar(){let b=document.getElementById('v174bar');if(b)return b;b=document.createElement('div');b.id='v174bar';b.setAttribute('role','region');b.setAttribute('aria-label','פוסטים שנבחרו');
 b.innerHTML=`<div class="v174row"><button type="button" class="v174x" data-v174="selx" aria-label="יציאה ממצב בחירה">${IC.x}</button><b class="v174n" aria-live="polite"></b><span class="v170sp"></span>
 <button type="button" class="v174pri" data-v174="sched">${IC.clock}<span>תזמון</span></button><button type="button" class="v174more" data-v174="more" aria-label="עוד פעולות" aria-haspopup="dialog">${IC.more}</button></div>
 <div class="v174hint" hidden><span>לחיצה ארוכה על פוסט פותחת פעולות מהירות</span><button type="button" class="v174hx" data-v174="hintx" aria-label="הסתרת הטיפ">${IC.x}</button></div>`;
 document.body.appendChild(b);return b}
function markCards(){const s=GA.sel;document.querySelectorAll('.v170 .ga-card[data-gaid]').forEach(c=>{const on=s.has(c.dataset.gaid);c.classList.toggle('sel',on);const k=c.querySelector('.ga-chk');if(k){k.setAttribute('aria-pressed',String(on));k.setAttribute('aria-label',on?'הסרה מהבחירה':'בחירה')}})}
function sync(){const g=typeof APP!=='undefined'&&APP.view==='gallery';const n=g?selIds().length:0;if(g&&n&&!SEL.on)SEL.on=true;
 const on=g&&SEL.on;document.body.classList.toggle('v174sel',on);
 document.querySelectorAll('.v170').forEach(r=>r.classList.toggle('v174selon',on));
 document.querySelectorAll('[data-v174="selmode"]').forEach(b=>{b.classList.toggle('on',on);b.setAttribute('aria-pressed',String(on))});
 const b=on?bar():document.getElementById('v174bar');if(!b)return;b.classList.toggle('on',on);b.hidden=!on;if(!on)return;
 const nav=document.getElementById('v99nav');let bot=18;if(nav){const r=nav.getBoundingClientRect();if(r.height&&getComputedStyle(nav).display!=='none'&&r.top<innerHeight)bot=Math.round(innerHeight-r.top)+10}const sn=document.getElementById('v171snack');if(sn){const r=sn.getBoundingClientRect();const cs=getComputedStyle(sn);if(r.height&&cs.display!=='none'&&cs.visibility!=='hidden'&&+cs.opacity>0&&r.top<innerHeight)bot=Math.max(bot,Math.round(innerHeight-r.top)+8)}b.style.bottom=bot+'px';
 b.querySelector('.v174n').textContent=n?(n===1?'פוסט אחד נבחר':`${n.toLocaleString('he-IL')} נבחרו`):'בחרו פוסטים';
 const pri=b.querySelector('[data-v174="sched"]');pri.disabled=!n;
 const hint=b.querySelector('.v174hint');hint.hidden=!(PH()&&lsG('v174_hint')!=='1')}
function setMode(on){SEL.on=!!on;if(!on){try{GA.sel.clear()}catch(e){}markCards()}sync()}

/* ---------------- clicks ---------------- */
// a long press opens the v172 sheet while the finger is still down; the lift that follows must not land on the sheet's backdrop and close it
let downAt=0,sheetAt=0;
['pointerdown','keydown'].forEach(t=>window.addEventListener(t,()=>{downAt=Date.now()},true));
new MutationObserver(ms=>{for(const m of ms)for(const n of m.addedNodes)if(n.id==='v172sheet')sheetAt=Date.now()}).observe(document.body,{childList:true});
window.addEventListener('click',e=>{const t=e.target;if(sheetAt>downAt&&e.detail>0&&e.pointerType!=='mouse'&&t&&t.closest&&t.closest('#v172sheet')&&document.getElementById('v172sheet')){e.preventDefault();e.stopPropagation();downAt=Date.now()}},true);
window.addEventListener('click',e=>{const t=e.target;if(!t||!t.closest)return;
 const b=t.closest('[data-v174]');
 if(b){const a=b.dataset.v174;e.preventDefault();e.stopPropagation();
  if(a==='selmode')setMode(!SEL.on);
  else if(a==='selx')setMode(false);
  else if(a==='sched')openSched();
  else if(a==='more')openMore();
  else if(a==='hintx'){lsS('v174_hint','1');sync()}
  else if(a==='pre')setPre(b.dataset.k);
  return}
 // in selection mode a tap on a post selects it instead of opening the big viewer
 if(SEL.on&&typeof APP!=='undefined'&&APP.view==='gallery'&&!document.getElementById('v172sheet')){const c=t.closest('.v170 .ga-card[data-gaid]');
  if(c&&!t.closest('.ga-acts,.ga-chk,[data-pe],[data-pe-img]')){e.preventDefault();e.stopPropagation();const id=c.dataset.gaid;if(GA.sel.has(id))GA.sel.delete(id);else GA.sel.add(id);markCards();sync();return}}
 // clearing the filters also clears status, score and publish date
 const v=t.closest('[data-v170="clear"],[data-v170="clearp"]');if(v){F.st=[];F.sc=[];F.pub=[]}
},true);
window.addEventListener('click',()=>{setTimeout(sync,0)});
window.addEventListener('change',e=>{const t=e.target;if(!t||!t.matches)return;
 if(t.matches('[data-v174qv]')){e.stopPropagation();setPre(t.value);setTimeout(()=>{const n=document.querySelector('[data-v174qv]');n&&n.focus()},0);return}
 if(t.matches('[data-v170s]')&&/^size:/.test(t.value)){e.stopImmediatePropagation();e.stopPropagation();GA.f.size=t.value.slice(5);try{gaSaveF()}catch(x){}t.value=F.sort;GA.lim=60;V.fastPaint();setTimeout(()=>{const s=document.querySelector('[data-v170s]');s&&s.focus()},0)}},true);
window.addEventListener('keydown',e=>{if(e.key!=='Escape'||!SEL.on)return;if(document.querySelector('#v172sheet,#v170sheet,#ga-lb,#v157,#px-sheet,.v170ps')||document.body.classList.contains('pe-open'))return;
 const a=document.activeElement;if(a&&a.matches&&a.matches('input,textarea,select'))return;e.preventDefault();setMode(false)},true);

/* ---------------- fade masks on rows that scroll sideways ---------------- */
function fades(){document.querySelectorAll('.v170 .v170qv,.v170 .v170pj,.v170 .v174pills').forEach(r=>{const ov=r.scrollWidth>r.clientWidth+1;const sl=Math.abs(r.scrollLeft);
 r.classList.toggle('v174ov',ov);r.style.setProperty('--v174fs',ov&&sl>2?'28px':'0px');r.style.setProperty('--v174fe',ov&&sl+r.clientWidth<r.scrollWidth-2?'36px':'0px')})}
document.addEventListener('scroll',e=>{const t=e.target;if(t&&t.classList&&(t.classList.contains('v170qv')||t.classList.contains('v170pj')||t.classList.contains('v174pills')))fades()},true);
addEventListener('resize',()=>{try{fades();sync()}catch(e){}},{passive:true});

/* ---------------- phones: the notice line moves into the "פעולות" sheet ---------------- */
function noteToActs(){const act=document.getElementById('vact');if(!act)return;const want=PH()&&APP.view==='gallery';
 const n=document.getElementById('v170note');const items=[];
 if(want&&n&&!n.hidden)n.querySelectorAll('button[data-v63],button[data-v110]').forEach(b=>{const s=b.previousElementSibling;items.push([b.dataset.v63?'v63':'v110',b.dataset.v63||b.dataset.v110,(s&&s.tagName==='SPAN'?s.textContent.trim()+' · ':'')+b.textContent.trim()])});
 const key=items.map(i=>i[2]).join('|');if(act.dataset.v174n===key&&act.querySelectorAll('.v174nb').length===items.length)return;act.dataset.v174n=key;
 act.querySelectorAll('.v174nb').forEach(b=>b.remove());
 items.forEach(([d,v,l])=>{const b=document.createElement('button');b.type='button';b.className='ibtn v174nb';b.dataset[d]=v;b.innerHTML=(d==='v63'?IC.wand:svg('<path d="M12 4v11"/><path d="m7 10 5 5 5-5"/><path d="M5 20h14"/>'))+H(l);act.appendChild(b)})}

render=(f=>function(){const r=f.apply(this,arguments);try{if(APP.view!=='gallery'){if(SEL.on){SEL.on=false}}sync();fades();noteToActs()}catch(e){console.warn('v174',e)}return r})(render);
setInterval(()=>{try{if(APP.view==='gallery'){noteToActs();fades()}}catch(e){}},3000);
// the undo snackbar can appear under the bar at any moment: keep the bar above it
setInterval(()=>{try{if(SEL.on)sync()}catch(e){}},700);
new MutationObserver(()=>{try{if(APP.view==='gallery'){fades();if(SEL.on)document.querySelectorAll('.v170').forEach(r=>r.classList.add('v174selon'))}}catch(e){}}).observe(document.getElementById('appviews')||document.body,{childList:true});
window.__v174={selMode:setMode,sync,SEL,preCounts,curPre,setPre,stOk,scOf,pubOf,gOf};
})();
