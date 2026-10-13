// ================= V175 · photos you can tell apart and choose fast: "חדש" means added in the last 7 days or since your last visit,
//                   a date on every photo, date and "העלאות שלי" filters that combine with the views, weeks as groups, a one row
//                   selection bar, "פוסט חדש מהתמונה" in the photo sheet; the editor's image tab opens on the photo grid
//                   (search, "אחרונות · הפרויקט של הפוסט · הכל", newest first), filters behind "סינון", crop folded away =================
(()=>{
if(window.__v175)return;window.__v175={};
const DAY=864e5,WEEK=7*DAY;
const H=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const lsG=(k,d)=>{try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}};
const lsS=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
const say=m=>{try{toast(m)}catch(e){}};
const SV=(d,w)=>`<svg width="${w||18}" height="${w||18}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const IC={search:SV('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),filter:SV('<path d="M4 6h16M7 12h10M10 18h4"/>'),
 expand:SV('<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>'),plus:SV('<path d="M12 5v14M5 12h14"/>'),x:SV('<path d="M6 6l12 12M18 6 6 18"/>',16),
 dots:SV('<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>',20),post:SV('<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>'),
 swap:SV('<path d="M4 7h13l-3-3M20 17H7l3 3"/>'),trash:SV('<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>'),check:SV('<path d="m5 12 5 5 9-10"/>'),proj:SV('<path d="M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6"/>')};

// ---------- 1. what "new" means: added in the last 7 days or since the last visit to Photos, whichever is more recent ----------
let SEEN=+lsG('v175_seen',0)||0;
function markSeen(){SEEN=Date.now();lsS('v175_seen',SEEN)}
const cutoff=()=>Math.max(Date.now()-WEEK,SEEN);
const isNewT=t=>!!t&&t>cutoff();
const atIt=it=>{const t=Date.parse((it&&it.at)||'');return isNaN(t)?0:t};
function atK(k){if(!k||!String(k).startsWith('u_'))return 0;let m=null;try{m=(KC.up||{})[k.slice(2)]}catch(e){}const t=Date.parse((m&&m.addedAt)||'');return isNaN(t)?0:t}
window.__v175new=it=>isNewT(atIt(it));
const pad=n=>String(n).padStart(2,'0');
function sod(t){const d=new Date(t);d.setHours(0,0,0,0);return d.getTime()}
function dm(t){const d=new Date(t);return pad(d.getDate())+'.'+pad(d.getMonth()+1)+(d.getFullYear()!==new Date().getFullYear()?'.'+String(d.getFullYear()).slice(2):'')}
function rel(t){if(!t)return '';const n=Math.round((sod(Date.now())-sod(t))/DAY);if(n<=0)return 'היום';if(n===1)return 'אתמול';if(n===2)return 'לפני יומיים';if(n<7)return `לפני ${n} ימים`;return dm(t)}
function wk(t){const d=new Date(sod(t));d.setDate(d.getDate()-d.getDay());return d.getTime()}
function wkLabel(w){const n=Math.round((wk(Date.now())-w)/WEEK);return n<=0?'השבוע':n===1?'שבוע שעבר':'השבוע של '+dm(w)}
// leaving Photos counts as a visit (and so does closing the page while on it)
let PREV=null;
render=(f=>function(){let v='';try{v=APP.view}catch(e){}if(PREV==='photos'&&v!=='photos')markSeen();PREV=v;const r=f.apply(this,arguments);try{if(v==='photos')afterPhotos()}catch(e){console.error('v175',e)}return r})(render);
addEventListener('pagehide',()=>{try{if(APP.view==='photos')markSeen()}catch(e){}});

// ---------- small bottom sheet (phones) / dialog (desktop) ----------
let back=null;
function closeSheet(){const w=document.getElementById('v175sh');if(!w)return;w.remove();if(back&&back.isConnected)try{back.focus({preventScroll:true})}catch(e){}back=null}
function sheet(title,sub,body){closeSheet();back=document.activeElement;const w=document.createElement('div');w.id='v175sh';w.setAttribute('role','dialog');w.setAttribute('aria-modal','true');w.setAttribute('aria-label',title);
 w.innerHTML=`<div class="v175bg" data-v175x="1"></div><div class="v175pan"><div class="v175grip" aria-hidden="true"></div><div class="v175h"><div><b>${H(title)}</b>${sub?`<span>${H(sub)}</span>`:''}</div><button type="button" class="v175x" data-v175x="1" aria-label="סגירה">${IC.x}</button></div><div class="v175l">${body}</div></div>`;
 document.body.appendChild(w);requestAnimationFrame(()=>w.classList.add('in'));setTimeout(()=>{const f=w.querySelector('.v175l button:not(:disabled),.v175l select');f&&f.focus({preventScroll:true})},60);return w}
function arm(b,label){if(b.dataset.arm==='1')return true;b.dataset.arm='1';b.classList.add('arm');const t=b.querySelector('.v175tt')||b;b._t0=t.textContent;t.textContent=label;clearTimeout(b._at);b._at=setTimeout(()=>{if(!b.isConnected)return;b.dataset.arm='';b.classList.remove('arm');t.textContent=b._t0},4000);return false}
addEventListener('click',e=>{if(e.target.closest&&e.target.closest('[data-v175x]')){e.preventDefault();e.stopPropagation();closeSheet()}},true);
addEventListener('keydown',e=>{if(e.key==='Escape'&&document.getElementById('v175sh')){e.preventDefault();e.stopImmediatePropagation();closeSheet()}},true);

// ---------- 2. the Photos screen ----------
const PV2=[['new','חדשות'],['ill','איורים'],['render','הדמיות'],['field','שטח ורחפן'],['unused','לא בשימוש'],['heavy','בשימוש רב'],['all','הכל']];
const DV=[['today','היום'],['7','7 ימים'],['30','30 ימים'],['all','הכל']];
const dOk=(t,d)=>!d||d==='all'?true:!t?false:d==='today'?t>=sod(Date.now()):t>=Date.now()-(+d)*DAY;
let PPN=Math.max(1,Math.min(4,+lsG('v175_ppn',2)||2));
function ptile(x,S,X){const it=x.it,n=x.n,t=x.t;const sel=S.sel.has(it.k);const nw=isNewT(t);const pj=it.proj?X.projLabel(it.proj):'';
 return `<button type="button" class="v170t v175pt${sel?' on':''}${S.selMode?' v170pick':''}" data-v144="${S.selMode?'pick':'open'}" data-k="${H(it.k)}" aria-label="${H(it.name+(nw?', חדשה':'')+(t?', נוספה '+rel(t):'')+(n?`, בשימוש ב-${n} פוסטים`:', לא בשימוש'))}"${S.selMode?` aria-pressed="${sel}"`:''}>
 <span class="v170im"><img src="${H(it.url)}" alt="" loading="lazy" decoding="async" data-v148k="${H(it.k)}">${nw?'<em class="v175new">חדש</em>':''}${S.selMode?`<i class="v148box" aria-hidden="true">${sel?'✓':''}</i>`:''}</span>
 <span class="v175d${t?'':' z'}">${t?rel(t):'בלי תאריך'}</span><span class="v170pm">${H(X.kindLabel(it))}${pj?` · ${H(pj)}`:''}</span><span class="v170pu${n?'':' z'}${n>=10?' hi':''}">${n?`בשימוש ב-${n} פוסטים`:'לא בשימוש'}</span></button>`}
function selBar(S){const n=S.sel.size;
 return `<div class="v148bar v175sb" role="region" aria-label="פעולות על הבחירה"><b aria-live="polite">${n} נבחרו</b>
  <select data-v152="n" hidden aria-hidden="true" tabindex="-1">${[1,2,3,4].map(i=>`<option value="${i}"${i===PPN?' selected':''}>${i}</option>`).join('')}</select>
  <button type="button" class="v175sbp v152gen" data-v152="gen" ${n?'':'disabled'}>יצירת פוסטים</button>
  <button type="button" class="v175ib" data-v175p="selmore" aria-label="עוד פעולות על הבחירה" title="עוד פעולות">${IC.dots}</button>
  <button type="button" class="v175ib" data-v144="selmode" aria-label="סיום בחירה" title="סיום בחירה">${IC.x}</button></div>`}
function view(S,keep){const X=window.__v170x(),PF=__v170.PF;
 if(PF.v==='up'){PF.v='new';PF.mine=true;PF.d='all';X.saveP()}
 if(!PV2.some(v=>v[0]===PF.v))PF.v='all';if(!DV.some(v=>v[0]===PF.d))PF.d='all';
 const inv=__v144.inventory(),um=X.useMap(),q=X.norm2(PF.q);
 const all=inv.map(it=>({it,n:(um.get(it.k)||[]).length,t:atIt(it)}));
 const pre=all.filter(({it,t})=>(!PF.proj||(PF.proj==='none'?!it.proj:it.proj===PF.proj))&&(!PF.mine||it.src==='up')&&dOk(t,PF.d)&&(!q||X.norm2(it.name+' '+X.projLabel(it.proj)+' '+(X.KINDN[it.kind]||'')+' '+it.from+' '+((it.u&&it.u.tags)||'')).includes(q)));
 const ok=(x,v)=>v==='new'?isNewT(x.t):X.pvOk(x.it,v,x.n);
 const cnt={};PV2.forEach(([k])=>cnt[k]=pre.filter(x=>ok(x,k)).length);
 const l=pre.filter(x=>ok(x,PF.v));
 if(PF.sort==='use')l.sort((a,b)=>b.n-a.n||b.t-a.t);else if(PF.sort==='name')l.sort((a,b)=>String(a.it.name).localeCompare(String(b.it.name),'he'));else l.sort((a,b)=>b.t-a.t||b.n-a.n);
 const pc={};inv.forEach(it=>{const k=it.proj||'none';pc[k]=(pc[k]||0)+1});
 let PJ={};try{PJ=PROJ_HE}catch(e){}const projs=Object.keys(PJ).filter(k=>pc[k]);
 const LIM=S._lim||120;const show=l.slice(0,LIM);let body='';
 if(PF.sort==='new'&&l.length){const key=x=>x.t?wk(x.t):0;const gc=new Map();l.forEach(x=>{const g=key(x);gc.set(g,(gc.get(g)||0)+1)});let cur=null,open=false;
  show.forEach(x=>{const g=key(x);if(g!==cur){if(open)body+='</div>';cur=g;body+=`<h3 class="v170gh"><span>${g?wkLabel(g):'בלי תאריך'}</span><i>${gc.get(g)}</i></h3><div class="v144grid v170grid">`;open=true}body+=ptile(x,S,X)});if(open)body+='</div>'}
 else if(l.length)body=`<div class="v144grid v170grid">${show.map(x=>ptile(x,S,X)).join('')}</div>`;
 const filtered=PF.v!=='all'||PF.proj||PF.q||PF.d!=='all'||PF.mine;
 if(!l.length)body=`<div class="v170empty"><b>${PF.q?'לא נמצאו תמונות':PF.v==='new'?'אין תמונות חדשות':'אין כאן תמונות'}</b><span>${PF.v==='new'?(SEEN>Date.now()-WEEK?'לא נוספו תמונות מאז הביקור הקודם.':'לא נוספו תמונות ב-7 הימים האחרונים.'):'נסו תצוגה אחרת, תאריך אחר או פרויקט אחר.'}</span>${filtered?'<button type="button" class="v170btn" data-v175p="reset">לכל התמונות</button>':''}</div>`;
 let brk=0,miss=0,hid=0;try{brk=document.querySelectorAll('.v170t.v170bad').length}catch(e){}try{miss=__v144.missing(inv).filter(c=>c.l).length}catch(e){}try{hid=__v148.HID.size}catch(e){}
 const specials=[miss?['missing',`${miss} באתר ועוד לא כאן`]:null,brk?['broken',`${brk} לא נטענות`]:null,['hidden',`הוסרו (${hid})`]].filter(Boolean);
 const projSel=cls=>`<label class="v170sel ${cls}"><span class="v170sr">פרויקט</span><select data-v170pp aria-label="פרויקט"><option value="">כל הפרויקטים</option>${projs.map(k=>`<option value="${k}"${PF.proj===k?' selected':''}>${H(X.projLabel(k))} (${pc[k]})</option>`).join('')}${pc.none?`<option value="none"${PF.proj==='none'?' selected':''}>בלי פרויקט (${pc.none})</option>`:''}</select></label>`;
 const hint=PF.v==='new'?(SEEN>Date.now()-WEEK?'נוספו מאז הביקור הקודם':'נוספו ב-7 הימים האחרונים'):'';
 return `<div class="v170p v175p${S.selMode?' v148selon':''}">
 <div class="v170bar v170pbar"><label class="v170q">${X.IC.search}<input type="search" data-v170pq value="${H(PF.q)}" placeholder="חיפוש תמונה: שם, פרויקט, סוג" aria-label="חיפוש תמונות" autocomplete="off"></label>
  ${projSel('v175dk')}
  <label class="v170fbtn v170upl" title="העלאת תמונות, אפשר הרבה בבת אחת">${X.IC.up}<span>העלאה</span><input type="file" accept="image/*" multiple data-v144up hidden></label></div>
 <div class="v175f">
  <div class="v175qvw v175dk"><div class="v170qv" role="tablist" aria-label="תצוגות">${PV2.map(([k,t2])=>`<button type="button" role="tab" data-v170p="v" data-k="${k}" aria-selected="${PF.v===k}">${t2}<i>${cnt[k]}</i></button>`).join('')}</div></div>
  <label class="v170sel v175ph v175vs"><span class="v170sr">תצוגה</span><select class="v175vsel" aria-label="תצוגה">${PV2.map(([k,t2])=>`<option value="${k}"${PF.v===k?' selected':''}>${t2} (${cnt[k]})</option>`).join('')}<optgroup label="עוד">${specials.map(([k,t2])=>`<option value="src:${k}">${H(t2)}</option>`).join('')}</optgroup></select></label>
  ${projSel('v175ph')}
  <div class="v175dr"><div class="v175seg" role="group" aria-label="מתי נוספו">${DV.map(([k,t2])=>`<button type="button" data-v175p="d" data-k="${k}" aria-pressed="${PF.d===k}">${t2}</button>`).join('')}</div>
   <button type="button" class="v175tg" data-v175p="mine" aria-pressed="${!!PF.mine}"><span class="v175ck" aria-hidden="true">${PF.mine?IC.check:''}</span>העלאות שלי</button></div>
 </div>
 <div class="v170res"><b class="v170cnt" aria-live="polite">${l.length} תמונות</b>${hint?`<span class="v170hint">${hint}</span>`:''}<button type="button" class="v170link" data-v144="selmode" aria-pressed="${S.selMode}">${S.selMode?'סיום בחירה':'בחירת כמה תמונות'}</button><span class="v170sp"></span>${specials.map(([k,t2])=>`<button type="button" class="v170link v175dk" data-v144="src" data-k="${k}">${H(t2)}</button>`).join('')}
  <label class="v170sel v175so"><span class="v170sr">מיון</span><select data-v170ps aria-label="מיון">${X.PSORT.map(([k,t2])=>`<option value="${k}"${PF.sort===k?' selected':''}>${t2}</option>`).join('')}</select></label></div>
 ${S.busy?`<div class="v144busy" role="status">${H(S.busy)}</div>`:''}
 ${body}
 ${l.length>LIM?`<div class="ga-more"><button type="button" class="px-btn" data-v170p="more">הצג עוד ${Math.min(120,l.length-LIM)} מתוך ${l.length-LIM}</button></div>`:''}</div>${S.selMode?selBar(S):''}`}
// the photo sheet: the first action makes a post from this photo
let RET=null;// the post that was open when "ניהול הגלריה" took you here
function retPost(){if(!RET)return null;try{return AG.posts.find(p=>p.id===RET.id)||null}catch(e){return null}}
function canSwap(){try{if(typeof PE!=='undefined'&&PE.p)return true}catch(e){}return !!retPost()}
function psheet(S){const X=window.__v170x();let h=X.psheet(S);if(!h)return h;const k=S.lb;const it=__v144.inventory().find(i=>i.k===k);if(!it)return h;const n=(X.useMap().get(k)||[]).length;
 const t=atIt(it);if(t)h=h.replace(/ · נוספה [0-9.]+/,` · נוספה ${H(rel(t))}${/^\d/.test(rel(t))?'':' ('+dm(t)+')'}`);
 h=h.replace('אפשר לסמן אותה במצב "בחירה" וליצור ממנה פוסטים עם הסוכן.','אפשר ליצור ממנה פוסט חדש עם הכפתור למטה.');
 const a=h.indexOf('<footer>'),b=h.lastIndexOf('</footer>');if(a<0||b<0)return h;
 const foot=`<footer class="v175pf"><button type="button" class="v170btn pri" data-v175p="gen1" data-k="${H(k)}">${IC.post}<span>פוסט חדש מהתמונה</span></button>${canSwap()?`<button type="button" class="v170btn" data-v175p="swap" data-k="${H(k)}">${IC.swap}<span>החלפה בפוסט הפתוח</span></button>`:''}
  <div class="v175pf2"><a class="v170btn ghost" href="${H(it.url)}" target="_blank" rel="noopener">פתיחה בגודל מלא</a>${it.u&&!n?`<button type="button" class="v170btn ghost v170danger" data-v144="del" data-id="${H(it.id)}">מחיקה לצמיתות</button>`:''}<button type="button" class="v170btn ghost v170danger" data-v175p="hide1" data-k="${H(k)}"><span class="v175tt">הסרה מהגלריה</span></button></div></footer>`;
 return h.slice(0,a)+foot+h.slice(b+9)}
window.__v175ph={view,sheet:psheet};
addEventListener('click',e=>{if(e.target.closest&&e.target.closest('[data-v148g]')){try{if(typeof PE!=='undefined'&&PE.p)RET={id:PE.p.id,slot:PE.slot||0}}catch(x){}}},true);
async function swapInto(k){try{if(PE.p){pePick(k);say('התמונה הוחלפה בפוסט הפתוח');return}const p=retPost();if(!p)return;const slot=RET.slot;RET=null;PE.tab='image';peOpen(p);PE.slot=slot;pePick(k);try{peRender()}catch(e){}say('התמונה הוחלפה. בדקו ושמרו את הפוסט')}catch(e){console.error('v175 swap',e)}}
function selMore(){const S=__v144.S;let PJ={};try{PJ=PROJ_HE}catch(e){}const n=S.sel.size;
 sheet(n+' תמונות נבחרו','',`<button type="button" class="v175i" data-v144="selall"><span class="v175ic">${IC.check}</span><span class="v175tt">בחירת כל המוצגות</span></button>
  <div class="v175grp"><span class="v175gl" id="v175ppl">פוסטים לכל תמונה</span><div class="v175seg" role="group" aria-labelledby="v175ppl">${[1,2,3,4].map(i=>`<button type="button" data-v175p="ppn" data-k="${i}" aria-pressed="${i===PPN}">${i}</button>`).join('')}</div></div>
  <label class="v175grp"><span class="v175gl">שיוך לפרויקט</span><select data-v144="selproj" ${n?'':'disabled'}><option value="">בחירת פרויקט</option>${Object.entries(PJ).map(([k,v])=>`<option value="${k}">${H(v)}</option>`).join('')}</select></label>
  <button type="button" class="v175i danger" data-v175p="hidesel" ${n?'':'disabled'}><span class="v175ic">${IC.trash}</span><span class="v175tt">הסרת ${n} מהגלריה</span></button>`)}
addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-v175p]');if(!b)return;let S,PF,X;try{S=__v144.S;PF=__v170.PF;X=__v170x()}catch(x){return}const a=b.dataset.v175p,k=b.dataset.k;
 if(a==='d'){PF.d=k;S._lim=120;X.saveP();render();top0()}
 else if(a==='mine'){PF.mine=!PF.mine;S._lim=120;X.saveP();render();top0()}
 else if(a==='reset'){Object.assign(PF,{v:'all',proj:'',q:'',d:'all',mine:false});X.saveP();render();top0()}
 else if(a==='selmore')selMore();
 else if(a==='ppn'){PPN=+k;lsS('v175_ppn',PPN);document.querySelectorAll('.v175sb [data-v152="n"]').forEach(s=>s.value=String(PPN));b.parentNode.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',x===b))}
 else if(a==='hidesel'){if(!arm(b,'לחצו שוב להסרה'))return;const ks=[...S.sel];closeSheet();S.selMode=false;try{__v148.hide(ks)}catch(x){}}
 else if(a==='gen1'){S.lb=null;render();try{__v152.genFromPhotos([k],1)}catch(x){say('יצירת פוסט לא זמינה כרגע')}}
 else if(a==='swap'){S.lb=null;render();swapInto(k)}
 else if(a==='hide1'){if(!arm(b,'לחצו שוב להסרה'))return;S.lb=null;try{__v148.hide([k])}catch(x){}}
 else return;e.preventDefault()});
// "בחירת כל המוצגות" and the project choice in the sheet go through the gallery's own handlers, then the sheet closes
addEventListener('click',e=>{if(e.target.closest&&e.target.closest('#v175sh [data-v144="selall"]'))setTimeout(closeSheet,0)});
addEventListener('change',e=>{const t=e.target;if(!t||!t.matches)return;
 if(t.matches('#v175sh [data-v144="selproj"]')&&t.value)setTimeout(closeSheet,0);
 else if(t.matches('.v175vsel')){const S=__v144.S,PF=__v170.PF;const v=t.value;if(v.startsWith('src:')){S.src=v.slice(4);S.lb=null;render();return}PF.v=v;if(v==='new')PF.sort='new';S._lim=120;__v170x().saveP();render();top0()}});
function top0(){const am=document.getElementById('appmain');if(am&&am.scrollTop>0)am.scrollTop=0}
function afterPhotos(){const p=document.querySelector('.v175p');if(!p)return;
 // a short list (an empty view) never leaves the page scrolled past its own tools
 const am=document.getElementById('appmain');if(am&&am.scrollTop>0&&!p.querySelector('.v170t'))am.scrollTop=0;
 const w=p.querySelector('.v175qvw');if(!w)return;const q=w.firstElementChild;if(!q)return;
 const upd=()=>{const over=q.scrollWidth>q.clientWidth+2;const x=Math.abs(q.scrollLeft);w.classList.toggle('ms',over&&x>2);w.classList.toggle('me',over&&x+q.clientWidth<q.scrollWidth-2)};upd();
 if(!q._v175){q._v175=1;q.addEventListener('scroll',upd,{passive:true})}
 const on=q.querySelector('[aria-selected="true"]');if(on&&q.scrollWidth>q.clientWidth){const r=on.getBoundingClientRect(),rq=q.getBoundingClientRect();if(r.left<rq.left||r.right>rq.right)on.scrollIntoView({block:'nearest',inline:'nearest'})}}

// ---------- 3. the photo picker in the editor (image tab) and in the full screen library ----------
const KIND={site:'צילום אתר',render:'הדמיה',interior:'פנים',exterior:'חוץ',aerial:'רחפן',drawing:'תוכנית',people:'אנשים',brand:'לוגו',atmo:'אווירה',detail:'פרט',finish:'בנוי',post:'פוסט',ad:'מודעה',topic:'תמונת נושא',env:'סביבה'};
const PRJ=()=>{try{return PROJ_HE}catch(e){return {}}};
function LS(){const L=__v115.state();if(!L.v175m)L.v175m=lsG('v175_pk','recent');if(!L.v175s)L.v175s='new';if(!L.v175n)L.v175n=24;return L}
// the post's project as the posts screen sees it (its photos, then its series and headline), from the saved version so a pick does not move it
function postProj(){try{const p=PE.p;if(p&&p.project&&p.project!=='general')return p.project;if(typeof gaProj==='function'){const g=gaProj(PE.orig||p);if(g&&g!=='general')return g}const sl=peSlots(p);const c=sl[PE.slot];const m=c&&metaOf(c.o.k);return (m&&m.p&&m.p!=='general')?m.p:''}catch(e){return ''}}
function curKey(){try{const sl=peSlots(PE.p);const c=sl[PE.slot];return c&&c.o&&c.o.k}catch(e){return ''}}
function useU(){try{return usage().u||{}}catch(e){return {}}}
function keysFor(L,mode){const u=useU();let ks=__v115.filtered(L);const pj=postProj();
 if(mode==='proj')ks=pj?ks.filter(k=>(metaOf(k).p||'general')===pj):[];
 const T=new Map(ks.map(k=>[k,atK(k)]));
 if(mode==='recent')return ks.filter(k=>T.get(k)).sort((a,b)=>T.get(b)-T.get(a)).slice(0,60);
 if(L.v175s==='least')ks.sort((a,b)=>(u[a]||0)-(u[b]||0)||T.get(b)-T.get(a));else ks.sort((a,b)=>T.get(b)-T.get(a)||(u[a]||0)-(u[b]||0));return ks}
function nFilt(L){return (L.src!=='all')+(L.kind!=='all')+(L.proj!=='all')+(L.v175s!=='new')+(document.body.classList.contains('v116-unused')?1:0)}
function etile(k,u,cur){let m={};try{m=metaOf(k)||{}}catch(e){}const t=atK(k);const nw=isNewT(t);const used=u[k]||0;const nm=(typeof LIB_NAMES!=='undefined'&&LIB_NAMES[k])||k;
 const pj=m.p&&m.p!=='general'?(PRJ()[m.p]||''):'';const cap=[t?rel(t):'',pj||KIND[m.k]||''].filter(Boolean).join(' · ');
 return `<button type="button" class="pe-li v115t v175t" data-pe-a="pick" data-k="${H(k)}" title="${H(nm)}" aria-label="${H('החלפה ל'+nm+(nw?', חדשה':'')+(used?'':', לא בשימוש'))}"${cur===k?' aria-pressed="true"':''}><span class="v175im"><img loading="lazy" decoding="async" alt="" src="${H(PHOTO_LIB[k])}">${nw?'<em class="v175b nw">חדש</em>':used?'':'<em class="v175b z">לא בשימוש</em>'}</span><span class="v175c">${H(cap)}</span></button>`}
function gridHtml(L,big){const mode=L.v175m;const ks=keysFor(L,mode);const u=useU();const cur=curKey();const lim=big?Math.max(60,L.v175n):L.v175n;const show=ks.slice(0,lim);
 if(!ks.length)return `<div class="v175empty"><b>${mode==='proj'&&!postProj()?'לפוסט הזה אין פרויקט':'אין תמונות שמתאימות'}</b><button type="button" class="v175lk" data-v175e="reset">לכל התמונות</button></div>`;
 return `<div class="pe-lib v115grid v175g${big?' big':''}">${show.map(k=>etile(k,u,cur)).join('')}</div>${ks.length>lim?`<button type="button" class="v175more" data-v175e="more">הצגת עוד ${Math.min(big?60:24,ks.length-lim)} מתוך ${ks.length-lim}</button>`:''}`}
function headHtml(L,big){const pj=postProj();const n=nFilt(L);let cProj=0,cAll=0;try{const base=__v115.filtered(L);cAll=base.length;cProj=pj?base.filter(k=>(metaOf(k).p||'general')===pj).length:0}catch(e){}
 return `<div class="v175pt"><label class="v175q">${IC.search}<input type="search" data-v115="q" value="${H(L.q||'')}" placeholder="חיפוש תמונה" aria-label="חיפוש תמונה" autocomplete="off"></label>
  <button type="button" class="v175fb" data-v175e="filt" aria-expanded="${!!L.v175f}">${IC.filter}<span>סינון</span>${n?`<b>${n}</b>`:''}</button>
  ${big?'':`<button type="button" class="v175ib2" data-v115="open" aria-label="הספרייה במסך מלא" title="הספרייה במסך מלא">${IC.expand}</button>`}
  ${big?'':`<label class="v175ib2" title="העלאה לספרייה" aria-label="העלאה לספרייה">${IC.plus}<input type="file" accept="image/*" multiple data-v115up hidden></label>`}</div>
 <div class="v175seg v175m" role="group" aria-label="אילו תמונות">${[['recent','אחרונות',''],['proj','הפרויקט של הפוסט',pj?cProj:''],['all','הכל',cAll]].map(([k,t,c])=>`<button type="button" data-v175e="mode" data-k="${k}" aria-pressed="${L.v175m===k}"${k==='proj'&&!pj?' disabled title="לפוסט הזה אין פרויקט"':''}${k==='proj'&&pj?` title="${H(PRJ()[pj]||pj)}"`:''}>${t}${c!==''?`<i>${c}</i>`:''}</button>`).join('')}</div>`}
function sortHtml(L){return `<div class="v175grp"><span class="v175gl">סדר</span><div class="v175seg" role="group" aria-label="סדר">${[['new','החדשות קודם'],['least','הכי פחות בשימוש']].map(([k,t])=>`<button type="button" data-v175e="sort" data-k="${k}" aria-pressed="${L.v175s===k}">${t}</button>`).join('')}</div></div><p class="v175hint">לחיצה ארוכה על תמונה (או לחיצה ימנית) פותחת הסרה מהגלריה.</p>`}
function hasCrop(){try{const sl=peSlots(PE.p);const c=sl[PE.slot];const r=c&&c.o&&c.o.r;return !!(r&&(Math.abs((r[2]??1)-1)>.01||Math.abs((r[3]??1)-1)>.01||Math.abs((r[4]??.5)-.5)>.01||Math.abs((r[5]??.5)-.5)>.01))}catch(e){return false}}
function edTransform(){let root=null;try{if(!PE.p||PE.tab!=='image')return;root=document.getElementById('pe-root')}catch(e){return}if(!root)return;const body=root.querySelector('.pe-body');if(!body)return;
 const sec=body.querySelector('.pe-sec.v115');if(!sec||sec.dataset.v175)return;const L=LS();
 const slots=body.querySelector('.pe-slots');const slotSec=slots&&slots.closest('.pe-sec');const crop=slotSec&&slotSec.querySelector('.pe-crop');const tools=body.querySelector('.pe-sec.v45tools');
 let nSlots=0;try{nSlots=peSlots(PE.p).length}catch(e){}
 const pk=document.createElement('div');pk.className='pe-sec v175pk';pk.dataset.v175='1';
 pk.innerHTML=`${nSlots>1?'<div class="v175sl"><span class="v175gl">איזו תמונה להחליף</span></div>':''}${headHtml(L,false)}<div class="v175fp"${L.v175f?'':' hidden'}></div><div class="v175gw">${gridHtml(L,false)}</div>`;
 if(nSlots>1&&slots)pk.querySelector('.v175sl').appendChild(slots);
 const fp=pk.querySelector('.v175fp');
 const bar=sec.querySelector('.v115bar');if(bar){const q=bar.querySelector('[data-v115="q"]');if(q)q.remove();fp.appendChild(bar)}
 sec.querySelectorAll('.v115chips').forEach(c=>fp.appendChild(c));
 const up=sec.querySelector('.pe-uprow');if(up){up.querySelectorAll('[data-v115="open"]').forEach(x=>x.remove());up.querySelectorAll('input[data-v115up]').forEach(x=>{const l=x.closest('label');if(l)l.remove()});if(up.children.length)fp.appendChild(up)}
 fp.insertAdjacentHTML('beforeend',sortHtml(L));
 const cs=PE.lib.v175c&&PE.lib.v175c.id===PE.p.id?PE.lib.v175c.open:hasCrop();
 let det=null;
 if(crop||tools||(slotSec&&nSlots===1)){det=document.createElement('details');det.className='pe-sec v175crop';det.open=!!cs;det.innerHTML='<summary><b>מיקום וחיתוך</b><span>זום, מיקוד, היפוך והתאמה</span></summary><div class="v175cb"></div>';const cb=det.querySelector('.v175cb');
  if(slotSec&&nSlots===1){const lab=slotSec.querySelector(':scope > .pe-l');if(lab)cb.appendChild(lab);if(slots)cb.appendChild(slots)}
  if(crop)cb.appendChild(crop);if(tools){[...tools.childNodes].forEach(n=>cb.appendChild(n));tools.remove()}}
 if(slotSec&&!slotSec.querySelector('.pe-slots,.pe-crop')&&!slotSec.classList.contains('v115'))slotSec.remove();
 body.insertBefore(pk,body.firstChild);if(det)pk.after(det);sec.remove()}
peRender=(f=>function(){const r=f.apply(this,arguments);try{edTransform()}catch(e){console.error('v175 editor',e)}return r})(peRender);
addEventListener('toggle',e=>{const d=e.target;if(d&&d.matches&&d.matches('details.v175crop')){try{PE.lib.v175c={id:PE.p.id,open:d.open}}catch(x){}}},true);
// the full screen library: same head, filters folded, newest first with captions
function libTransform(){const el=document.getElementById('v115lib');if(!el)return;const sh=el.querySelector('.v115sh');if(!sh||sh.dataset.v175)return;const f=sh.querySelector('.v115filters'),bd=sh.querySelector('.v115body');if(!f||!bd)return;sh.dataset.v175='1';const L=LS();
 const wrap=document.createElement('div');wrap.className='v175fp';if(!L.v175f)wrap.hidden=true;[...f.childNodes].forEach(n=>wrap.appendChild(n));const q=wrap.querySelector('.v115bar [data-v115="q"]');if(q)q.remove();
 f.classList.add('v175lf');f.innerHTML=headHtml(L,true);f.appendChild(wrap);wrap.insertAdjacentHTML('beforeend',sortHtml(L));bd.innerHTML=gridHtml(L,true)}
new MutationObserver(()=>{const el=document.getElementById('v115lib');if(el)try{libTransform()}catch(e){console.error('v175 lib',e)}}).observe(document.body,{childList:true,subtree:true});
function refreshPicker(){if(document.getElementById('v115lib')){try{__v115.renderLib()}catch(e){}}else{try{peRender()}catch(e){}}}
addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-v175e]');if(!b)return;e.preventDefault();e.stopPropagation();const L=LS();const a=b.dataset.v175e;
 if(a==='mode'){L.v175m=b.dataset.k;L.v175n=24;lsS('v175_pk',L.v175m);refreshPicker()}
 else if(a==='filt'){L.v175f=!L.v175f;const sc=b.closest('#v115lib,#pe-root');(sc||document).querySelectorAll('.v175fp').forEach(p=>p.hidden=!L.v175f);(sc||document).querySelectorAll('[data-v175e="filt"]').forEach(x=>x.setAttribute('aria-expanded',!!L.v175f))}
 else if(a==='sort'){L.v175s=b.dataset.k;L.v175n=24;refreshPicker()}
 else if(a==='more'){L.v175n=(b.closest('#v115lib')?Math.max(60,L.v175n):L.v175n)+(b.closest('#v115lib')?60:24);refreshPicker()}
 else if(a==='reset'){L.src='all';L.kind='all';L.proj='all';L.q='';L.v175m='all';L.v175n=24;refreshPicker()}},true);
// the filter chips of the library keep the panel open and start the grid from the top
addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('.v175fp [data-v115]');if(b)try{LS().v175n=24}catch(x){}},true);

// long press (or right click) on a picker photo: remove it from the gallery, with a confirm
let lpT=0,lpXY=null,lpFired=0;
function tileSheet(k){const nm=(typeof LIB_NAMES!=='undefined'&&LIB_NAMES[k])||'תמונה';const t=atK(k);
 sheet(nm,t?'נוספה '+rel(t):'',`<button type="button" class="v175i" data-v175t="pick" data-k="${H(k)}"><span class="v175ic">${IC.swap}</span><span class="v175tt">בחירה לפוסט</span></button><button type="button" class="v175i danger" data-v175t="hide" data-k="${H(k)}"><span class="v175ic">${IC.trash}</span><span class="v175tt">הסרה מהגלריה</span></button><p class="v175hint">התמונה תצא מהבחירה ומהגלריה. פוסטים שכבר משתמשים בה ממשיכים להציג אותה.</p>`)}
addEventListener('pointerdown',e=>{const t=e.target.closest&&e.target.closest('.v175g .v175t');if(!t||e.button>0)return;lpFired=0;lpXY=[e.clientX,e.clientY];clearTimeout(lpT);lpT=setTimeout(()=>{lpFired=Date.now();tileSheet(t.dataset.k)},550)},true);
addEventListener('pointermove',e=>{if(lpXY&&Math.hypot(e.clientX-lpXY[0],e.clientY-lpXY[1])>10){clearTimeout(lpT);lpXY=null}},true);
['pointerup','pointercancel','scroll'].forEach(n=>addEventListener(n,()=>{clearTimeout(lpT);lpXY=null},true));
addEventListener('contextmenu',e=>{const t=e.target.closest&&e.target.closest('.v175g .v175t');if(!t)return;e.preventDefault();if(!document.getElementById('v175sh')){clearTimeout(lpT);lpFired=Date.now();tileSheet(t.dataset.k)}},true);
addEventListener('click',e=>{if(lpFired&&Date.now()-lpFired<1500&&e.target.closest&&e.target.closest('.v175g .v175t')){e.preventDefault();e.stopImmediatePropagation();lpFired=0}},true);
addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-v175t]');if(!b)return;e.preventDefault();e.stopPropagation();const k=b.dataset.k;
 if(b.dataset.v175t==='pick'){closeSheet();try{pePick(k)}catch(x){}const lb=document.getElementById('v115lib');if(lb)setTimeout(()=>{try{__v115.closeLib()}catch(x){}},60)}
 else if(b.dataset.v175t==='hide'){if(!arm(b,'לחצו שוב להסרה'))return;closeSheet();try{__v148.hide([k])}catch(x){}}},true);

Object.assign(window.__v175,{markSeen,isNewT,rel,atK,cutoff,get SEEN(){return SEEN},set SEEN(v){SEEN=+v||0},view,edTransform,libTransform});
try{if(APP.view==='photos')render()}catch(e){}
})();
