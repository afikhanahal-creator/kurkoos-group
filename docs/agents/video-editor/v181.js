// ================= V181 · competitor galleries: the organic posts each competitor really publishes on Facebook (collection
// comp_posts, synced every morning from Metricool's competitor tracking: picture, text, date, reactions, comments, shares).
// Two places: a "הגלריה שלהם" block inside every competitor card, and a central view of all galleries. Every post has
// "שכפל למותג שלנו": Claude reads why the post works and writes an original post for Kurkoos or Afik HaNahal, which opens in
// the editor with the competitor's post beside it. Our version uses our own photos; the competitor's picture is only a reference.
(()=>{
if(window.__v181)return;window.__v181=1;
const E=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const I=(n,s)=>{try{return ico(n,s||16)}catch(e){return ''}};
const V=()=>window.__v179||{};
const SV={ext:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/></svg>',
 chev:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>',
 pic:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2.5"/><circle cx="9" cy="10" r="1.8"/><path d="m21 16-5-5-9 9"/></svg>',
 like:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 11v9H4v-9zM7 11l4-7a2.5 2.5 0 0 1 2.6 3L13 10h5.6a2 2 0 0 1 2 2.4l-1.3 6A2 2 0 0 1 17.3 20H7"/></svg>',
 cmt:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 15a2 2 0 0 1-2 2H8l-4 4V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2z"/></svg>',
 shr:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13"/></svg>',
 search:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>'};

/* ---------- state ---------- */
const G={posts:new Map(),loaded:false,open:new Set(),cf:{},lib:{q:'',comp:'',sort:'new',n:48},gen:null,srcOpen:null,tried:new Set(),queue:[],busy:0};
const TZ='Asia/Jerusalem';const fD=new Intl.DateTimeFormat('he-IL',{timeZone:TZ,day:'numeric',month:'numeric',year:'2-digit'});
const fmtD=v=>{const n=Date.parse(v||'');return isNaN(n)?'':fD.format(new Date(n))};
const safeUrl=u=>{try{const x=new URL(String(u||''));return /^https?:$/.test(x.protocol)?x.href:''}catch(e){return ''}};
const idsOf=p=>Array.isArray(p.comp_ids)&&p.comp_ids.length?p.comp_ids.map(String):[String(p.comp_id||'')];
const postsOf=cid=>[...G.posts.values()].filter(p=>idsOf(p).includes(String(cid)));
const sortP=(l,s)=>l.slice().sort(s==='eng'?(a,b)=>(+b.eng||0)-(+a.eng||0)||String(b.published||'').localeCompare(String(a.published||'')):(a,b)=>String(b.published||'').localeCompare(String(a.published||'')));
const shortName=p=>String(p.comp_name||'').replace(/\s+(Kedar Mivnim|בע"מ)$/,'').replace(/\s+[|\-–].*$/,'').trim();
const expired=p=>!p.thumb&&!!p.img_exp&&Date.parse(p.img_exp)<Date.now();
const srcOf=p=>p.thumb||(expired(p)?'':safeUrl(p.image));
const lastFetch=()=>{let m='';G.posts.forEach(p=>{if(String(p.fetched||'')>m)m=String(p.fetched)});return m};
const excerpt=(t,n)=>{t=String(t||'').replace(/\s+/g,' ').trim();return t.length>n?t.slice(0,n).replace(/\s+\S*$/,'')+'…':t};

/* ---------- data ---------- */
function rerender(){if(window.__v181rr)return;window.__v181rr=requestAnimationFrame(()=>{window.__v181rr=0;try{if(APP.view==='compgal')render();else if(APP.view==='competitors')document.querySelectorAll('details[data-v181sec]').forEach(d=>refreshSec(d.dataset.v181sec))}catch(e){console.warn('v181 render',e)}})}
function subscribe(db){db.collection('comp_posts').onSnapshot(s=>{G.posts.clear();s.docs.forEach(d=>{const v=d.data();if(v&&typeof v==='object')G.posts.set(String(d.id),Object.assign({id:d.id},v))});G.loaded=true;rerender()},()=>{G.loaded=true;rerender()})}
let tries=0;const poll=setInterval(()=>{if(typeof APP==='undefined')return;if(APP.db){clearInterval(poll);try{subscribe(APP.db)}catch(e){console.warn('v181 db',e)}}else if(++tries>240)clearInterval(poll)},500);
// Facebook picture links expire after a few days. When the browser is allowed to read a picture, a small copy is kept
// with the post so the gallery keeps it; when it is not allowed, the picture is shown while its link is valid.
function keep(id){const p=G.posts.get(id);if(!p||p.thumb||G.tried.has(id)||!APP.db||!safeUrl(p.image))return;G.tried.add(id);G.queue.push(id);pump()}
function pump(){while(G.busy<2&&G.queue.length){const id=G.queue.shift();const p=G.posts.get(id);if(!p)continue;G.busy++;
 const im=new Image();im.crossOrigin='anonymous';im.referrerPolicy='no-referrer';const done=()=>{G.busy--;pump()};
 im.onload=()=>{try{const k=Math.min(1,320/Math.max(im.naturalWidth,im.naturalHeight));const c=document.createElement('canvas');c.width=Math.max(1,Math.round(im.naturalWidth*k));c.height=Math.max(1,Math.round(im.naturalHeight*k));
  c.getContext('2d').drawImage(im,0,0,c.width,c.height);const url=c.toDataURL('image/jpeg',.84);if(url.length<90000)APP.db.collection('comp_posts').doc(id).update({thumb:url}).catch(()=>{})}catch(e){}done()};
 im.onerror=done;im.src=safeUrl(p.image)}}

/* ---------- pieces ---------- */
const num=n=>(+n||0).toLocaleString('he-IL');
function engHtml(p){return `<span class="v181eng"><span title="תגובות רגשיות (לייקים)">${SV.like}<b>${num(p.reactions)}</b><i class="v181sr">לייקים</i></span><span title="תגובות">${SV.cmt}<b>${num(p.comments)}</b><i class="v181sr">תגובות</i></span><span title="שיתופים">${SV.shr}<b>${num(p.shares)}</b><i class="v181sr">שיתופים</i></span></span>`}
function picHtml(p,big){const s=srcOf(p);if(s)return `<img src="${E(s)}" alt="התמונה מהפוסט של ${E(shortName(p))}" loading="lazy" decoding="async" referrerpolicy="no-referrer" data-v181img="${E(p.id)}">`;
 return `<span class="v181ph">${SV.pic}<small>${!p.image?'פוסט בלי תמונה':expired(p)?'התמונה תתעדכן בסנכרון של מחר בבוקר':'התמונה לא נטענה'}</small></span>`}
function tile(p,o={}){const t=excerpt(p.text,140);
 return `<article class="v181t" data-v181id="${E(p.id)}">
  <button type="button" class="v181pic" data-v181="view" data-id="${E(p.id)}" aria-label="הפוסט המלא של ${E(shortName(p))} מ־${E(fmtD(p.published))}">${picHtml(p)}</button>
  <div class="v181tb"><div class="v181tm">${o.showComp?`<b>${E(shortName(p))}</b>`:''}<span>${E(fmtD(p.published))}</span></div>
   <p class="v181tx${t?'':' none'}">${t?E(t):'פוסט בלי טקסט'}</p>${engHtml(p)}
   <div class="v181ta"><button type="button" class="v179b pri" data-v181="clone" data-id="${E(p.id)}">${I('wand',15)} שכפל למותג שלנו</button><button type="button" class="v179b" data-v181="view" data-id="${E(p.id)}">פרטים</button></div></div></article>`}
const HOWTO=`מוסיפים אותו ב-Metricool: בחשבון קבוצת קורקוס, פייסבוק, לשונית "מתחרים", הוספה לפי שם העמוד. מהבוקר שאחרי, הפוסטים שלו יופיעו כאן.`;

/* ---------- A. inside every competitor card ---------- */
function cfOf(cid){return G.cf[cid]||(G.cf[cid]={sort:'new',n:12})}
function secHtml(c){const all=postsOf(c.id);const cf=cfOf(c.id);const open=G.open.has(String(c.id));const list=sortP(all,cf.sort);const last=list.length?sortP(all,'new')[0]:null;
 const strip=list.length?`<span class="v181strip" aria-hidden="true">${sortP(all,'new').filter(srcOf).slice(0,4).map(p=>`<img src="${E(srcOf(p))}" alt="" loading="lazy" referrerpolicy="no-referrer" data-v181img="${E(p.id)}">`).join('')}</span>`:'';
 const sub=!G.loaded&&APP.db?'טוען…':list.length?`${list.length} פוסטים מפייסבוק · האחרון ב־${E(fmtD(last.published))}`:'עוד לא במעקב ב-Metricool';
 let body='';
 if(open){if(!list.length)body=`<div class="v181body"><div class="v179empty"><b>אין עדיין פוסטים של ${E(c.name||'המתחרה')}</b><p>הגלריה מתמלאת רק למתחרים שנמצאים במעקב ב-Metricool. ${HOWTO}</p></div></div>`;
  else{const page=list.slice(0,cf.n);
   body=`<div class="v181body"><div class="v181bar"><div class="v179seg" role="group" aria-label="סדר הפוסטים"><button type="button" data-v181="csort" data-cid="${E(c.id)}" data-k="new" aria-pressed="${cf.sort==='new'}"><span>חדשים קודם</span></button><button type="button" data-v181="csort" data-cid="${E(c.id)}" data-k="eng" aria-pressed="${cf.sort==='eng'}"><span>הכי הרבה מעורבות</span></button></div>
    <a class="v179ext" href="${E(safeUrl(String(last.link||'').replace(/_[^/]*$/,''))||'#')}" target="_blank" rel="noopener">לעמוד שלהם בפייסבוק ${SV.ext}</a></div>
    <div class="v181grid in">${page.map(p=>tile(p)).join('')}</div>${list.length>cf.n?`<button type="button" class="v179b more" data-v181="cmore" data-cid="${E(c.id)}">הצג עוד (${list.length-cf.n} נוספים)</button>`:''}
    <p class="v179help">מקור: מעקב המתחרים של Metricool, מתעדכן כל בוקר. התמונות בגודל התצוגה המקדימה ש-Metricool מחזיר.</p></div>`}}
 return `<details class="v181sec" data-v181sec="${E(c.id)}"${open?' open':''}><summary><span class="v179st"><b>הגלריה שלהם · פוסטים אמיתיים</b><small>${sub}</small></span>${strip}<i class="v179chev" aria-hidden="true">${SV.chev}</i></summary>${body}</details>`}
function refreshSec(cid){const el=document.querySelector(`details[data-v181sec="${CSS.escape(String(cid))}"]`);if(!el)return;const c=(APP.comps&&APP.comps[cid])||(typeof compList==='function'?compList().find(x=>String(x.id)===String(cid)):null);if(!c)return;
 const t=document.createElement('template');t.innerHTML=secHtml(c);el.replaceWith(t.content.firstElementChild)}
try{vComps=(f=>function(){const html=f.apply(this,arguments);try{const t=document.createElement('template');t.innerHTML=html;
 t.content.querySelectorAll('article.cc').forEach(a=>{const b=a.querySelector('[data-cid]');if(!b)return;const cid=b.dataset.cid;const c=(APP.comps&&APP.comps[cid])||(typeof compList==='function'?compList().find(x=>String(x.id)===String(cid)):null);if(!c)return;
  const at=a.querySelector('details.v179sec')||a.querySelector('.ca');if(at)at.insertAdjacentHTML('beforebegin',secHtml(c))});return t.innerHTML}catch(e){console.warn('v181 comps',e);return html}})(vComps)}catch(e){console.error('v181 vComps',e)}

/* ---------- B. the central view of every gallery ---------- */
try{VTITLE.compgal=['גלריות המתחרים','מה המתחרים באמת מפרסמים: תמונה, טקסט ומעורבות. כל פוסט אפשר לשכפל למותג שלנו']}catch(e){}
try{if(Array.isArray(VIEWS)&&!VIEWS.some(g=>g[1].some(v=>v[0]==='compgal'))){const g=VIEWS.find(g=>g[1].some(v=>v[0]==='competitors'))||VIEWS[VIEWS.length-1];const i=g[1].findIndex(v=>v[0]==='competitors');g[1].splice(i+1,0,['compgal','גלריות המתחרים','img'])}}catch(e){}
// the menu sorts the advanced views by its own list, where this view is unknown: put the galleries right after the competitors
function fixNav(){const a=document.querySelector('#sidenav [data-view="competitors"]'),b=document.querySelector('#sidenav [data-view="compgal"]');if(!a||!b||a.nextElementSibling===b)return;
 let x=b,y=a;while(x.parentElement&&!x.parentElement.contains(a))x=x.parentElement;while(y.parentElement&&y.parentElement!==x.parentElement)y=y.parentElement;if(y.parentElement===x.parentElement)y.after(x)}
try{renderNav=(f=>function(){const r=f.apply(this,arguments);try{fixNav()}catch(e){}return r})(renderNav)}catch(e){}
function libList(){const L=G.lib;let l=[...G.posts.values()];if(L.comp)l=l.filter(p=>shortName(p)===L.comp);
 if(L.q){const q=L.q.toLowerCase();l=l.filter(p=>String(p.text||'').toLowerCase().includes(q)||String(p.comp_name||'').toLowerCase().includes(q))}return sortP(l,L.sort)}
function vGal(){const L=G.lib;if(!APP.db)return `<div class="v181p0"><div class="v179empty big"><b>הגלריות נטענות כשהמערכת מחוברת</b><p>הפוסטים נשמרים במסד הנתונים של האתר. התחברו לעמוד הניהול ורעננו.</p></div></div>`;
 if(!G.loaded)return `<div class="v181p0"><div class="v181grid">${Array.from({length:6},()=>'<div class="v181sk"></div>').join('')}</div></div>`;
 if(!G.posts.size)return `<div class="v181p0"><div class="v179empty big"><b>עדיין אין פוסטים של מתחרים</b><p>הגלריות מתמלאות מהמעקב אחרי מתחרים ב-Metricool, בכל בוקר. ${HOWTO}</p></div></div>`;
 const comps=[...new Set([...G.posts.values()].map(shortName))].sort((a,b)=>a.localeCompare(b,'he'));const list=libList();const page=list.slice(0,L.n);
 const by=new Map();G.posts.forEach(p=>by.set(shortName(p),(by.get(shortName(p))||0)+1));
 return `<div class="v181p0"><div class="v179bar"><label class="v179q">${SV.search}<input type="search" data-v181q value="${E(L.q)}" placeholder="חיפוש בטקסט של הפוסטים" aria-label="חיפוש בטקסט של הפוסטים"></label>
  <label class="v179sel"><span>מתחרה</span><select data-v181="comp"><option value="">כל המתחרים</option>${comps.map(n=>`<option value="${E(n)}"${L.comp===n?' selected':''}>${E(n)} (${by.get(n)})</option>`).join('')}</select></label>
  <label class="v179sel"><span>סדר</span><select data-v181="sort"><option value="new"${L.sort==='new'?' selected':''}>חדשים קודם</option><option value="eng"${L.sort==='eng'?' selected':''}>הכי הרבה מעורבות</option></select></label></div>
  <p class="v179cnt" aria-live="polite">${list.length} פוסטים של ${L.comp?1:comps.length} מתחרים${lastFetch()?` · עודכן ${E(fmtD(lastFetch()))}`:''}. רק מתחרים שבמעקב ב-Metricool מופיעים כאן.</p>
  ${page.length?`<div class="v181grid">${page.map(p=>tile(p,{showComp:true})).join('')}</div>`:`<div class="v179empty"><b>אין פוסטים בחיפוש הזה</b><p>נסו מילה אחרת או כל המתחרים.</p></div>`}
  ${list.length>L.n?`<button type="button" class="v179b more" data-v181="lmore">הצג עוד (${list.length-L.n} נוספים)</button>`:''}</div>`}
try{render=(f=>function(){if(APP.view!=='compgal')return f.apply(this,arguments);
 renderNav();const [t,s]=VTITLE.compgal;document.getElementById('vt').textContent=t;document.getElementById('vs').textContent=s;document.body.dataset.pxview='compgal';
 document.querySelectorAll('.wrap > section,.wrap > footer').forEach(sec=>sec.classList.add('view-hidden'));const act=document.getElementById('vact');if(act)act.innerHTML='';
 const box=document.getElementById('appviews');const q=box.querySelector('[data-v181q]');const had=q&&document.activeElement===q?[q.selectionStart,q.selectionEnd]:null;box.innerHTML=vGal();
 if(had){const n=box.querySelector('[data-v181q]');if(n){n.focus();try{n.setSelectionRange(had[0],had[1])}catch(e){}}}})(render)}catch(e){console.error('v181 view',e)}

/* ---------- modals (same shell as the ads library) ---------- */
let lastFocus=null;
function modal(id,html,label){closeM(id);const m=document.createElement('div');m.id=id;m.className='v179m';m.innerHTML=`<div class="v179bg" data-v181="close" data-m="${id}"></div><div class="v179box" role="dialog" aria-modal="true" aria-label="${E(label)}">${html}</div>`;document.body.appendChild(m);document.body.classList.add('v179lock');
 lastFocus=document.activeElement;requestAnimationFrame(()=>{const f=m.querySelector('.v179x')||m.querySelector('button,input,select,a');f&&f.focus()});return m}
function closeM(id){const m=document.getElementById(id);if(!m)return;m.remove();if(!document.querySelector('.v179m'))document.body.classList.remove('v179lock');try{lastFocus&&lastFocus.isConnected&&lastFocus.focus()}catch(e){}}
const xBtn=id=>`<button type="button" class="v179x" data-v181="close" data-m="${id}" aria-label="סגירה">${I('x',18)}</button>`;
function detailHtml(p){return `<header class="v179mh"><h2>${E(shortName(p))} · ${E(fmtD(p.published))}</h2>${xBtn('v181d')}</header>
 <div class="v179mb"><div class="v181dt"><div class="v181dpic">${picHtml(p,1)}</div><div class="v181dtx">${engHtml(p)}<p class="v181full">${p.text?E(p.text):'<span class="none">פוסט בלי טקסט</span>'}</p></div></div>
 <div class="v179fa">${p.text?`<button type="button" class="v179b" data-v181="copy" data-id="${E(p.id)}">${I('copy',15)} העתקת הטקסט</button>`:''}${safeUrl(p.link)?`<a class="v179b" href="${E(safeUrl(p.link))}" target="_blank" rel="noopener">לפוסט בפייסבוק ${SV.ext}</a>`:''}</div>
 <p class="v179help">מקור: Metricool, נכון ל־${E(fmtD(p.fetched))}. המספרים הם מה ש-Metricool מדד, לא הערכה.</p></div>
 <footer class="v179mf"><button type="button" class="v179b pri big" data-v181="clone" data-id="${E(p.id)}">${I('wand',16)} שכפל למותג שלנו</button></footer>`}
function openDetail(id){const p=G.posts.get(String(id));if(!p)return;modal('v181d',detailHtml(p),'הפוסט של המתחרה')}

/* ---------- C. "שכפל למותג שלנו" ---------- */
function prompt(post,o){const B=V().brandOf(o.brand);const PROJ=V().PROJ||[];const goal=o.goal==='leads'?'לידים: פנייה של לקוח פוטנציאלי':o.goal==='brand'?'מודעות למותג: שיזכרו את השם ומה אנחנו עושים':'פרויקט ספציפי'+(o.project?': '+(PROJ.find(p=>p[0]===o.project)||[])[1]:'');
 return `אתה הקריאייטיב דיירקטור של "${B.name}". לפניך פוסט אורגני אמיתי שמתחרה פרסם בפייסבוק, עם המעורבות שקיבל בפועל. המשימה בשני חלקים.
חלק 1, ניתוח: למה הפוסט הזה עובד או לא עובד. מסר מרכזי, הצעת הערך, ההוק (הפתיחה), המבנה, הקריאה לפעולה, והעיקרון שאפשר ללמוד ממנו (עיקרון, לא ניסוח).
חלק 2, פוסט מקורי ל"${B.name}" שמיישם את העיקרון באותו סוג תוכן (למשל אם זה רגע מהשטח, גם אצלנו רגע מהשטח). אסור להעתיק מילים, משפטים, שמות או נתונים מהפוסט של המתחרה. בלי להזכיר את המתחרה. רק עובדות מהרשימה, בלי להמציא מספרים, כתובות, מחירים, שמות או אירועים.
הפוסט של המתחרה:
מתחרה: ${shortName(post)}
פורסם: ${fmtD(post.published)||'לא ידוע'}
מעורבות: ${+post.reactions||0} לייקים, ${+post.comments||0} תגובות, ${+post.shares||0} שיתופים
תמונה: ${post.image?'יש לפוסט תמונה, אבל אינך רואה אותה. אל תניח מה יש בה':'אין תמונה'}
טקסט: """${String(post.text||'(ללא טקסט)').slice(0,1800)}"""
מטרת הקמפיין שלנו: ${goal}${o.note?'\nהנחיה מהמנהל: '+o.note:''}
עובדות מותרות על המותג:
${B.facts}
${B.rules}
מגבלות: headline עד 7 מילים (מותר \\n אחד), sub עד 12 מילים, items 3 עד 4 שורות קצרות, cta עד 4 מילים, fb 60 עד 150 מילים.
החזר JSON בלבד: {"analysis":{"message":"","value_prop":"","hook":"","structure":"","cta":"","principle":""},"post":{"headline":"","sub":"","items":[""],"cta":"","fb":""}}`}
const asAd=post=>({id:post.id,comp_id:post.comp_id,comp_name:shortName(post),page_name:'',title:excerpt(post.text,90),start:null,snapshot_url:''});
function srcFields(post){return {id:String(post.id),comp_name:shortName(post),published:post.published||null,text:String(post.text||'').slice(0,600),reactions:+post.reactions||0,comments:+post.comments||0,shares:+post.shares||0,link:safeUrl(post.link),img:post.thumb||safeUrl(post.image)}}
function finish(p,post,res,o){V().applyTo(p,res,asAd(post),o);delete p.metaSource;p.src='comppost';p.compPostId=String(post.id);p.compSource=srcFields(post);return p}
function makePost(post,res,o){const ct=V().cleanTxt||(x=>String(x||'').trim());const P=res.post||{};const items=Array.isArray(P.items)?P.items.filter(Boolean):[];const L=items.length>=3?'ed_article':'ed_quote';const proj=o.goal==='project'&&o.project?o.project:'general';
 let p=mkPost({layout:L,project:proj,label:o.goal==='leads'?'לפרטים':o.goal==='brand'?'מי אנחנו':'',head:ct(P.headline)||'פוסט חדש',sub:ct(P.sub),items:items.map(ct),cta:ct(P.cta),fb:ct(P.fb)||undefined,why:'גרסה למותג שלנו, מתוך פוסט של '+shortName(post)});
 if(!p)throw new Error('mkPost');
 if(o.brand==='afik'){if(window.__v178&&__v178.cloneOne){const q=__v178.cloneOne(p);delete q.clonedFrom;p=q}else{p.brand='afik';p.series='אפיק הנחל'}}
 p.compId=post.comp_id;p.compName=shortName(post);return finish(p,post,res,o)}
function genHtml(st){const g=G.gen,post=g.post;const GOALS=V().GOALS||[['leads','לידים'],['brand','מודעות למותג'],['project','פרויקט ספציפי']];const PROJ=V().PROJ||[];
 const hdr=`<header class="v179mh"><h2>שכפל למותג שלנו</h2>${xBtn('v181g')}</header>`;
 const src=`<div class="v181gsrc"><div class="v181gpic">${picHtml(post)}</div><div><span class="v179muted">הפוסט של ${E(shortName(post))} · ${E(fmtD(post.published))}</span><b>${E(excerpt(post.text,120)||'פוסט בלי טקסט')}</b>${engHtml(post)}</div></div>`;
 if(st==='form')return `${hdr}<div class="v179mb">${src}<form class="v179gf" data-v181gen="1"><fieldset><legend>למי כותבים</legend><div class="v179brands"><label class="v179br"><input type="radio" name="brand" value="kurkoos" ${g.o.brand!=='afik'?'checked':''}><span class="v179brc" style="--c:#07293a"></span><b>קבוצת קורקוס</b><small>בנייה, יזמות ופיקוח</small></label><label class="v179br"><input type="radio" name="brand" value="afik" ${g.o.brand==='afik'?'checked':''}><span class="v179brc" style="--c:#8490D8"></span><b>אפיק הנחל</b><small>שיווק ותיווך</small></label></div></fieldset>
  <label class="v179sel full"><span>מטרת הפוסט</span><select name="goal" data-v181="goal">${GOALS.map(([k,l])=>`<option value="${k}"${g.o.goal===k?' selected':''}>${l}</option>`).join('')}</select></label>
  <label class="v179sel full" ${g.o.goal==='project'?'':'hidden'}><span>איזה פרויקט</span><select name="project">${PROJ.map(([k,l])=>`<option value="${k}"${g.o.project===k?' selected':''}>${l}</option>`).join('')}</select></label>
  <label class="v179ta"><span>הנחיה חופשית (לא חובה)</span><textarea name="note" rows="2" placeholder="למשל: רגע מהשטח בהנרייטה סאלד, בלי מחיר">${E(g.o.note||'')}</textarea></label>
  <p class="v179help">Claude מנתח למה הפוסט שלהם עובד וכותב פוסט מקורי שלנו, עם התמונות שלנו, בלי להעתיק ניסוח או תמונה. כל חלק נפתח לעריכה בעורך: כותרת, טקסט, תמונה, צבעים ושכבות. שום דבר לא מתפרסם לבד.</p>
  <div class="v179fa end"><button type="button" class="v179b" data-v181="close" data-m="v181g">ביטול</button><button type="submit" class="v179b pri big">${I('wand',16)} צור גרסה</button></div></form></div>`;
 if(st==='busy')return `${hdr}<div class="v179mb">${src}<div class="v179busy" role="status" aria-live="polite"><i></i><b>Claude מנתח וכותב…</b><span>בדרך כלל 20 עד 60 שניות</span></div></div>`;
 if(st==='err')return `${hdr}<div class="v179mb">${src}<div class="v179empty"><b>${E(g.err||'הכתיבה לא הצליחה')}</b><p>${g.errCode==='not_granted'?'Claude זמין כשהמערכת מחוברת. אפשר לנסות שוב אחרי התחברות.':'אפשר לנסות שוב, או לכתוב את הגרסה ידנית בסטודיו.'}</p><div class="v179fa"><button type="button" class="v179b pri" data-v181="gretry">נסו שוב</button><button type="button" class="v179b" data-v181="close" data-m="v181g">סגירה</button></div></div></div>`;
 const p=g.draft,A=p.metaAnalysis||{};
 return `${hdr}<div class="v179mb">${src}<div class="v179res"><div class="v179h"><b>מה למדנו מהפוסט שלהם</b></div><dl class="v179dl">${[['המסר',A.message],['הצעת הערך',A.value_prop],['ההוק',A.hook],['המבנה',A.structure],['קריאה לפעולה',A.cta],['העיקרון שלקחנו',A.principle]].filter(([,v])=>v).map(([l,v])=>`<div><dt>${l}</dt><dd>${E(v)}</dd></div>`).join('')}</dl>
  <div class="v179h"><b>הגרסה שלנו</b><span>${E(p.brand==='afik'?'אפיק הנחל':'קבוצת קורקוס')} · טיוטה</span></div><div class="v179post"><b>${E((p.visual.headline||'').replace(/\n/g,' '))}</b>${p.visual.sub?`<p>${E(p.visual.sub)}</p>`:''}${p.fx&&Array.isArray(p.fx.items)&&p.fx.items.length?`<ul>${p.fx.items.map(x=>`<li>${E(x)}</li>`).join('')}</ul>`:''}${p.visual.cta?`<em>${E(p.visual.cta)}</em>`:''}<pre>${E(p.fb||'')}</pre></div></div></div>
  <footer class="v179mf"><button type="button" class="v179b" data-v181="gagain">${I('wand',15)} גרסה נוספת</button><button type="button" class="v179b pri big" data-v181="gopen">${I('edit',16)} פתח בעורך העיצוב</button></footer>`}
function openGen(id){const post=G.posts.get(String(id));if(!post)return;closeM('v181d');let b='kurkoos';try{b=JSON.parse(localStorage.getItem('v179_brand')||'"kurkoos"')}catch(e){}
 G.gen={post,o:{brand:b,goal:'leads',project:'henrietta',note:''},draft:null,st:'form'};modal('v181g',genHtml('form'),'שכפל למותג שלנו')}
function genRender(){const m=document.getElementById('v181g');if(!m||!G.gen)return;m.querySelector('.v179box').innerHTML=genHtml(G.gen.st);const f=m.querySelector('.v179box button.pri,.v179box button');f&&f.focus()}
async function runGen(){const g=G.gen;if(!g)return;g.st='busy';genRender();
 try{const res=await V().ask(prompt(g.post,g.o));if(g.draft)finish(g.draft,g.post,res,g.o);else{g.draft=makePost(g.post,res,g.o);AG.posts.unshift(g.draft)}try{saveAgent()}catch(e){}try{await ensureImgs(g.draft)}catch(e){}g.st='done';genRender();toast('הגרסה נוספה לטיוטות. אפשר לפתוח אותה בעורך')}
 catch(e){g.st='err';g.errCode=e&&e.code;g.err=e&&e.code==='rate_limited'?'יותר מדי בקשות, נסו בעוד דקה':e&&e.code==='not_granted'?'Claude לא זמין בתצוגה הזו':'הכתיבה לא הצליחה';genRender()}}

/* ---------- the source panel inside the editor ---------- */
function srcPanel(p){const s=p.compSource||{},A=p.metaAnalysis||{};const open=G.srcOpen==null?!window.matchMedia('(max-width:700px)').matches:G.srcOpen;
 return `<section class="v179src v181src${open?' open':''}" aria-label="הפוסט שממנו יצאנו"><button type="button" class="v179srch" data-v181="srctoggle" aria-expanded="${open}"><span class="v179srck">המקור</span><span class="v179srct"><b>${E(excerpt(s.text,70)||'פוסט בלי טקסט')}</b><small>${E(s.comp_name||'')}${s.published?' · '+E(fmtD(s.published)):''} · ${+s.reactions||0} לייקים · ${+s.comments||0} תגובות</small></span><i class="v179chev" aria-hidden="true">${SV.chev}</i></button>
  <div class="v179srcb"${open?'':' hidden'}><div class="v181gsrc">${s.img?`<div class="v181gpic"><img src="${E(s.img)}" alt="התמונה מהפוסט של ${E(s.comp_name||'המתחרה')}" referrerpolicy="no-referrer" loading="lazy"></div>`:''}<p class="v181full sm">${E(s.text||'')}</p></div>
  <dl class="v179dl">${[['המסר',A.message],['הצעת הערך',A.value_prop],['ההוק',A.hook],['המבנה',A.structure],['קריאה לפעולה',A.cta],['העיקרון שלקחנו',A.principle]].filter(([,v])=>v).map(([l,v])=>`<div><dt>${l}</dt><dd>${E(v)}</dd></div>`).join('')}</dl>
  <div class="v179fa">${s.link?`<a class="v179b" href="${E(s.link)}" target="_blank" rel="noopener">לפוסט שלהם בפייסבוק ${SV.ext}</a>`:''}<button type="button" class="v179b" data-v181="again">${I('wand',15)} גרסה נוספת</button></div><p class="v179help">התמונה שלהם כאן רק להשראה. בפוסט שלנו התמונות שלנו. שום דבר לא מתפרסם לבד.</p></div></section>`}
try{peRender=(f=>function(){const r=f.apply(this,arguments);try{if(typeof PE!=='undefined'&&PE.p&&PE.p.src==='comppost'){const b=document.querySelector('#pe-root .pe-body');if(b&&!b.querySelector('.v181src'))b.insertAdjacentHTML('afterbegin',srcPanel(PE.p))}}catch(e){console.warn('v181 src',e)}return r})(peRender)}catch(e){console.error('v181 pe',e)}
async function againInEditor(){const p=PE.p;if(!p||p.src!=='comppost')return;const s=p.compSource||{};const post=G.posts.get(String(p.compPostId))||{id:p.compPostId,comp_id:p.compId,comp_name:s.comp_name||p.compName,text:s.text,published:s.published,reactions:s.reactions,comments:s.comments,shares:s.shares,link:s.link,image:s.img};
 const o={brand:p.metaBrand||(p.brand==='afik'?'afik':'kurkoos'),goal:p.metaGoal||'leads',project:p.project,note:p.metaNote||''};
 const b=document.querySelector('#pe-root [data-v181="again"]');if(b){b.disabled=true;b.textContent='Claude כותב…'}toast('Claude כותב גרסה נוספת…');
 try{const res=await V().ask(prompt(post,o));PE.hist.push(peSnap(p));PE.fut=[];finish(p,post,res,o);peRender();try{peLive()}catch(e){}toast('גרסה נוספת נכתבה. אפשר לבטל עם ביטול')}
 catch(e){toast(e&&e.code==='not_granted'?'Claude זמין כשהמערכת מחוברת':'הכתיבה לא הצליחה. נסו שוב');if(b){b.disabled=false;b.innerHTML=`${I('wand',15)} גרסה נוספת`}}}

/* ---------- events ---------- */
document.addEventListener('click',async e=>{const b=e.target.closest&&e.target.closest('[data-v181]');if(!b)return;const a=b.dataset.v181;
 if(a==='goal'||a==='comp'||a==='sort')return;
 e.preventDefault();e.stopPropagation();
 if(a==='close'){closeM(b.dataset.m);return}
 if(a==='view'){openDetail(b.dataset.id);return}
 if(a==='clone'){openGen(b.dataset.id);return}
 if(a==='copy'){const p=G.posts.get(String(b.dataset.id));if(!p)return;try{await navigator.clipboard.writeText(String(p.text||''));toast('הטקסט הועתק')}catch(x){toast('ההעתקה לא הצליחה')}return}
 if(a==='csort'){cfOf(b.dataset.cid).sort=b.dataset.k;refreshSec(b.dataset.cid);return}
 if(a==='cmore'){cfOf(b.dataset.cid).n+=24;refreshSec(b.dataset.cid);return}
 if(a==='lmore'){G.lib.n+=48;render();return}
 if(a==='gretry'||a==='gagain'){runGen();return}
 if(a==='gopen'){const p=G.gen&&G.gen.draft;closeM('v181g');if(!p)return;G.srcOpen=null;setTimeout(()=>{try{peOpen(p)}catch(x){const btn=document.querySelector(`[data-pe="${CSS.escape(p.id)}"]`);btn&&btn.click()}},60);return}
 if(a==='srctoggle'){const s=b.closest('.v181src');const open=b.getAttribute('aria-expanded')!=='true';G.srcOpen=open;b.setAttribute('aria-expanded',open);s.classList.toggle('open',open);const body=s.querySelector('.v179srcb');if(body)body.hidden=!open;return}
 if(a==='again'){againInEditor();return}
},true);
document.addEventListener('change',e=>{const t=e.target;if(!t||!t.matches)return;
 if(t.matches('select[data-v181="comp"]')){G.lib.comp=t.value;G.lib.n=48;render();return}
 if(t.matches('select[data-v181="sort"]')){G.lib.sort=t.value;render();return}
 if(t.matches('select[data-v181="goal"]')&&G.gen){G.gen.o.goal=t.value;const f=t.closest('form');const pl=f&&f.querySelector('select[name="project"]');if(pl)pl.closest('label').hidden=t.value!=='project';return}
 if(t.matches('[data-v181gen] input[name="brand"]')&&G.gen){G.gen.o.brand=t.value;try{localStorage.setItem('v179_brand',JSON.stringify(t.value))}catch(x){}}
});
document.addEventListener('submit',e=>{const f=e.target;if(!f||!f.matches||!f.matches('[data-v181gen]')||!G.gen)return;e.preventDefault();e.stopPropagation();const d=new FormData(f);
 Object.assign(G.gen.o,{brand:String(d.get('brand')||'kurkoos'),goal:String(d.get('goal')||'leads'),project:String(d.get('project')||'henrietta'),note:String(d.get('note')||'').trim().slice(0,300)});try{localStorage.setItem('v179_brand',JSON.stringify(G.gen.o.brand))}catch(x){}G.gen.draft=null;runGen()},true);
document.addEventListener('input',e=>{const t=e.target;if(t&&t.matches&&t.matches('[data-v181q]')){G.lib.q=t.value.trim();G.lib.n=48;clearTimeout(G.qt);G.qt=setTimeout(()=>{if(APP.view==='compgal')render()},250)}});
document.addEventListener('toggle',e=>{const d=e.target;if(!d||!d.matches||!d.matches('details[data-v181sec]'))return;const cid=d.dataset.v181sec;if(d.open){G.open.add(cid);if(!d.querySelector('.v181body'))refreshSec(cid)}else G.open.delete(cid)},true);
document.addEventListener('keydown',e=>{if(e.key!=='Escape')return;for(const id of ['v181g','v181d']){if(document.getElementById(id)){closeM(id);e.stopPropagation();return}}},true);
// a picture that fails to load becomes a quiet placeholder; one that loads is kept (see keep)
document.addEventListener('error',e=>{const t=e.target;if(!t||t.tagName!=='IMG'||!t.dataset||!t.dataset.v181img)return;if(t.closest('.v181strip')){t.remove();return}
 const s=document.createElement('span');s.className='v181ph';s.innerHTML=`${SV.pic}<small>התמונה תתעדכן בסנכרון של מחר בבוקר</small>`;t.replaceWith(s)},true);
document.addEventListener('load',e=>{const t=e.target;if(t&&t.tagName==='IMG'&&t.dataset&&t.dataset.v181img)keep(t.dataset.v181img)},true);

window.__v181={G,postsOf,secHtml,vGal,openDetail,openGen,runGen,prompt,makePost,srcPanel};
})();
