// ================= V181 · competitor galleries: the organic posts each competitor really publishes on Facebook (collection
// comp_posts, synced every morning from Metricool's competitor tracking: picture, text, date, reactions, comments, shares).
// Two places: a "הגלריה שלהם" block inside every competitor card, and a central view of all galleries. Every post has
// "שכפל למותג שלנו": Claude reads why the post works and writes an original post for Kurkoos or Afik HaNahal, which opens in
// the editor with the competitor's post beside it. Our version uses our own photos; the competitor's picture is only a reference.
// V186: clarity pass 2. Small pictures are enlarged up to 4x (long edge up to 2560), sharpened in two passes (fine detail
// and edges), previews are 1080px, and the Facebook post pictures (130px from Metricool) are enlarged and sharpened the same
// way when the browser may read them, then kept in storage. The original of every upload still stays untouched.
// V183: every screenshot is made clearer on upload (upscale of small pictures, local contrast, sharpening), the original kept.
// V182: screenshots. Every competitor has a folder; the team uploads screenshots or saved pictures of the competitor's ads
// (collection comp_shots, files in storage at full resolution, untouched), optionally tied to one Meta ad. They live in the
// same gallery, and "שכפל למותג שלנו" sends the picture itself to Claude so the analysis covers the design, not only the words.
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
const G={orig:new Set(),posts:new Map(),shots:new Map(),sloaded:false,up:{},drop:null,loaded:false,open:new Set(),cf:{},lib:{q:'',comp:'',cid:'',kind:'',sort:'new',n:48},gen:null,srcOpen:null,tried:new Set(),queue:[],busy:0};
const TZ='Asia/Jerusalem';const fD=new Intl.DateTimeFormat('he-IL',{timeZone:TZ,day:'numeric',month:'numeric',year:'2-digit'});
const fmtD=v=>{const n=Date.parse(v||'');return isNaN(n)?'':fD.format(new Date(n))};
const safeUrl=u=>{try{const x=new URL(String(u||''));return /^https?:$/.test(x.protocol)?x.href:''}catch(e){return ''}};
const idsOf=p=>Array.isArray(p.comp_ids)&&p.comp_ids.length?p.comp_ids.map(String):[String(p.comp_id||'')];
const isShot=p=>!!p&&p.kind==='shot';
const allItems=()=>[...G.posts.values(),...G.shots.values()];
const getItem=id=>G.posts.get(String(id))||G.shots.get(String(id));
const postsOf=cid=>allItems().filter(p=>idsOf(p).includes(String(cid)));
const compDoc=cid=>{cid=String(cid||'');try{return (APP.comps&&APP.comps[cid])||(typeof compList==='function'?compList().find(x=>String(x.id)===cid):null)||null}catch(e){return null}};
const shotItem=(id,v)=>Object.assign({},v,{id:'shot:'+id,sid:id,kind:'shot',comp_ids:[String(v.comp_id||'')],text:String(v.note||v.ad_title||''),image:v.url,published:v.added});
const nP_=n=>n===1?'פוסט אחד':n+' פוסטים',nS_=n=>n===1?'צילום מסך אחד':n+' צילומי מסך';
const mb=n=>!n?'':n>=1048576?(n/1048576).toFixed(1)+' MB':Math.max(1,Math.round(n/1024))+' KB';
const sortP=(l,s)=>l.slice().sort(s==='eng'?(a,b)=>(+b.eng||0)-(+a.eng||0)||String(b.published||'').localeCompare(String(a.published||'')):(a,b)=>String(b.published||'').localeCompare(String(a.published||'')));
const shortName0=p=>String(p.comp_name||'').replace(/\s+(Kedar Mivnim|בע"מ)$/,'').replace(/\s+[|\-–].*$/,'').trim();
// the folder of an item is the competitor in the system (one name even when Metricool spells the page differently)
const shortName=p=>{const c=compDoc(isShot(p)?p.comp_id:idsOf(p)[0]);return String((c&&c.name)||shortName0(p)).trim()};
const expired=p=>!isShot(p)&&!p.thumb&&!!p.img_exp&&Date.parse(p.img_exp)<Date.now();
const srcOf=p=>isShot(p)?safeUrl(p.prev||p.url):p.thumb||(expired(p)?'':safeUrl(p.image));
const lastFetch=()=>{let m='';G.posts.forEach(p=>{if(String(p.fetched||'')>m)m=String(p.fetched)});return m};
const excerpt=(t,n)=>{t=String(t||'').replace(/\s+/g,' ').trim();return t.length>n?t.slice(0,n).replace(/\s+\S*$/,'')+'…':t};

/* ---------- data ---------- */
function rerender(){if(window.__v181rr)return;window.__v181rr=requestAnimationFrame(()=>{window.__v181rr=0;try{if(APP.view==='compgal')render();else if(APP.view==='competitors')document.querySelectorAll('details[data-v181sec]').forEach(d=>refreshSec(d.dataset.v181sec))}catch(e){console.warn('v181 render',e)}})}
function subscribe(db){db.collection('comp_posts').onSnapshot(s=>{G.posts.clear();s.docs.forEach(d=>{const v=d.data();if(v&&typeof v==='object')G.posts.set(String(d.id),Object.assign({id:d.id},v))});G.loaded=true;rerender()},()=>{G.loaded=true;rerender()});
 db.collection('comp_shots').onSnapshot(s=>{G.shots.clear();s.docs.forEach(d=>{const v=d.data();if(v&&typeof v==='object'&&v.url)G.shots.set('shot:'+d.id,shotItem(d.id,v))});G.sloaded=true;rerender();decorate()},()=>{G.sloaded=true;rerender()})}
let tries=0;const poll=setInterval(()=>{if(typeof APP==='undefined')return;if(APP.db){clearInterval(poll);try{subscribe(APP.db)}catch(e){console.warn('v181 db',e)}}else if(++tries>240)clearInterval(poll)},500);
// Facebook picture links expire after a few days. When the browser is allowed to read a picture, a small copy is kept
// with the post so the gallery keeps it; when it is not allowed, the picture is shown while its link is valid.
function keep(id){const p=G.posts.get(id);if(!p||isShot(p)||p.thumb_enh||G.tried.has(id)||!APP.db||!(p.thumb||safeUrl(p.image)))return;G.tried.add(id);G.queue.push(id);pump()}
function pump(){while(G.busy<1&&G.queue.length){const id=G.queue.shift();const p=G.posts.get(id);if(!p)continue;G.busy++;
 const im=new Image();if(!p.thumb){im.crossOrigin='anonymous';im.referrerPolicy='no-referrer'}const done=()=>{G.busy--;pump()};
 im.onload=async()=>{try{const en=await enhance(im,{maxLong:1200,jpeg:true,q:.9});let patch=null;
   const A=await assetsNS().catch(()=>null);if(A&&A.upload){const up=await A.upload(en.blob,{ext:'jpg'});patch={thumb:up.url,thumb_blob:up.id}}
   else{const url=en.c.toDataURL('image/jpeg',.86);if(url.length<180000)patch={thumb:url}}
   if(patch){Object.assign(patch,{thumb_enh:true,tw:en.w,th:en.h});await APP.db.collection('comp_posts').doc(id).update(patch);Object.assign(p,patch);document.querySelectorAll(`img[data-v181img="${CSS.escape(id)}"]`).forEach(el=>{el.src=patch.thumb})}}catch(e){console.warn('v181 keep',e)}done()};
 im.onerror=done;im.src=p.thumb||safeUrl(p.image)}}

/* ---------- pieces ---------- */
const num=n=>(+n||0).toLocaleString('he-IL');
function engHtml(p){return `<span class="v181eng"><span title="תגובות רגשיות (לייקים)">${SV.like}<b>${num(p.reactions)}</b><i class="v181sr">לייקים</i></span><span title="תגובות">${SV.cmt}<b>${num(p.comments)}</b><i class="v181sr">תגובות</i></span><span title="שיתופים">${SV.shr}<b>${num(p.shares)}</b><i class="v181sr">שיתופים</i></span></span>`}
const fullOf=p=>safeUrl((G.orig&&G.orig.has(p.sid))?p.url:(p.enh||p.url));
function picHtml(p,big){const s=big&&isShot(p)?fullOf(p):srcOf(p);if(s)return `<img src="${E(s)}" alt="${isShot(p)?'צילום מסך של מודעה של':'התמונה מהפוסט של'} ${E(shortName(p))}" loading="lazy" decoding="async" referrerpolicy="no-referrer" data-v181img="${E(p.id)}">`;
 return `<span class="v181ph">${SV.pic}<small>${!p.image?'פוסט בלי תמונה':expired(p)?'התמונה תתעדכן בסנכרון של מחר בבוקר':'התמונה לא נטענה'}</small></span>`}
const resHtml=p=>isMeta(p)?`<span class="v181res enh" dir="ltr" title="צילום מסך ${p.w}×${p.h} מספריית Meta${p.cw?', התמונה של המודעה '+p.cw+'×'+p.ch:''}">4K</span>${p.media==='video'?'<span class="v181enh">סרטון</span>':''}`:p.w&&p.h?`<span class="v181res${Math.max(p.w,p.h)<1000&&!p.enh?' low':''}${p.enh?' enh':''}" dir="ltr" title="${p.enh?'שופר מ־'+p.w+'×'+p.h:'המקור'}">${p.enh?p.ew+'×'+p.eh:p.w+'×'+p.h}</span>${p.enh?'<span class="v181enh">שופר</span>':''}`:'';
function tile(p,o={}){const t=excerpt(p.text,140);const sh=isShot(p);
 return `<article class="v181t" data-v181id="${E(p.id)}">
  <button type="button" class="v181pic" data-v181="view" data-id="${E(p.id)}" aria-label="${sh?'צילום המסך':'הפוסט המלא'} של ${E(shortName(p))} מ־${E(fmtD(p.published))}">${picHtml(p)}${sh?`<span class="v181kind">${isMeta(p)?'מודעה מ-Meta':'צילום מסך'}</span>`:''}</button>
  <div class="v181tb"><div class="v181tm">${o.showComp?`<b>${E(shortName(p))}</b>`:''}<span>${sh?(isMeta(p)?'נלכד ':'הועלה '):''}${E(fmtD(p.published))}</span>${sh?resHtml(p):''}</div>
   <p class="v181tx${t?'':' none'}">${t?E(t):sh?'בלי הערה':'פוסט בלי טקסט'}</p>${sh?'':engHtml(p)}
   <div class="v181ta"><button type="button" class="v179b pri" data-v181="clone" data-id="${E(p.id)}">${I('wand',15)} שכפל למותג שלנו</button><button type="button" class="v179b" data-v181="view" data-id="${E(p.id)}">פרטים</button></div></div></article>`}
const TIP=`<details class="v181tip"><summary>איך מקבלים את האיכות הכי גבוהה</summary><ol><li>פותחים את המודעה בספריית Meta, בכפתור "לצפייה במודעה ב-Meta" שבכרטיס המודעה.</li><li>במחשב: לחיצה ימנית על התמונה של המודעה ואז "שמירת התמונה בשם". זה הקובץ שהמתחרה העלה, באיכות הכי גבוהה שיש.</li><li>בטלפון: לחיצה ארוכה על התמונה ואז "שמירה בתמונות". אם אין אפשרות כזו, צילום מסך כשהמודעה פתוחה על כל המסך.</li><li>מעלים כאן, אפשר כמה תמונות ביחד. המערכת שומרת את הקובץ כמו שהוא, בלי דחיסה ובלי הקטנה.</li></ol></details>`;
function upZone(cid,o={}){const c=compDoc(cid);const n=E((c&&c.name)||'המתחרה');const st=G.up[String(cid)];
 return `<div class="v181up${o.slim?' slim':''}" data-v181drop="${E(cid)}"${o.ad?` data-ad="${E(o.ad)}"`:''}><label class="v179b pri v181upb">${I('plus',15)} ${o.ad?'הוסף צילום מסך של המודעה':'הוסף צילומי מסך'}<input type="file" accept="image/*" multiple class="v181sr" data-v181file="${E(cid)}"${o.ad?` data-ad="${E(o.ad)}"`:''}></label>
  <span class="v181upt">${o.ad?'נשמר בתיקייה של '+n+' ומקושר למודעה הזו.':'אפשר גם לגרור לכאן או להדביק. נשמר הקובץ המקורי ברזולוציה מלאה, בתיקייה של '+n+'.'}</span>
  <span class="v181upst" role="status" aria-live="polite">${st?`מעלה ${Math.min(st.n,st.done+st.err+1)} מתוך ${st.n}…`:''}</span>${o.tip===false?'':TIP}</div>`}
const HOWTO=`מוסיפים אותו ב-Metricool: בחשבון קבוצת קורקוס, פייסבוק, לשונית "מתחרים", הוספה לפי שם העמוד. מהבוקר שאחרי, הפוסטים שלו יופיעו כאן.`;

/* ---------- A. inside every competitor card ---------- */
function cfOf(cid){return G.cf[cid]||(G.cf[cid]={sort:'new',kind:'',n:12})}
const kindF=(l,k)=>k==='shot'?l.filter(isShot):k==='post'?l.filter(p=>!isShot(p)):l;
function secHtml(c){const all=postsOf(c.id);const cf=cfOf(c.id);const open=G.open.has(String(c.id));const list=sortP(kindF(all,cf.kind),cf.sort);const last=all.length?sortP(all,'new')[0]:null;
 const nS=all.filter(isShot).length,nP=all.length-nS;const fbPost=sortP(all.filter(p=>!isShot(p)),'new')[0];
 const strip=all.length?`<span class="v181strip" aria-hidden="true">${sortP(all,'new').filter(srcOf).slice(0,4).map(p=>`<img src="${E(srcOf(p))}" alt="" loading="lazy" referrerpolicy="no-referrer" data-v181img="${E(p.id)}">`).join('')}</span>`:'';
 const sub=!G.loaded&&APP.db?'טוען…':all.length?[nP?`${nP_(nP)} מפייסבוק`:'',nS?nS_(nS):'',`האחרון ב־${E(fmtD(last.published))}`].filter(Boolean).join(' · '):'עוד לא במעקב ב-Metricool · אפשר להעלות צילומי מסך';
 let body='';
 if(open){if(!all.length)body=`<div class="v181body">${upZone(c.id)}<div class="v179empty"><b>אין עדיין תמונות של ${E(c.name||'המתחרה')}</b><p>מעלים צילומי מסך של המודעות שלהם בכפתור למעלה. הפוסטים מפייסבוק מתמלאים לבד רק למתחרים שבמעקב ב-Metricool. ${HOWTO}</p></div></div>`;
  else{const page=list.slice(0,cf.n);
   const kchips=nS&&nP?`<div class="v179chips" role="group" aria-label="סוג">${[['','הכל',all.length],['post','פוסטים מפייסבוק',nP],['shot','צילומי מסך',nS]].map(([k,l,n])=>`<button type="button" class="v179chip" data-v181="ckind" data-cid="${E(c.id)}" data-k="${k}" aria-pressed="${cf.kind===k}">${l}<b>${n}</b></button>`).join('')}</div>`:'';
   body=`<div class="v181body">${upZone(c.id,{slim:true})}${kchips}<div class="v181bar"><div class="v179seg" role="group" aria-label="סדר הפוסטים"><button type="button" data-v181="csort" data-cid="${E(c.id)}" data-k="new" aria-pressed="${cf.sort==='new'}"><span>חדשים קודם</span></button><button type="button" data-v181="csort" data-cid="${E(c.id)}" data-k="eng" aria-pressed="${cf.sort==='eng'}"><span>הכי הרבה מעורבות</span></button></div>
    ${fbPost&&safeUrl(fbPost.link)?`<a class="v179ext" href="${E(safeUrl(String(fbPost.link).replace(/_[^/]*$/,'')))}" target="_blank" rel="noopener">לעמוד שלהם בפייסבוק ${SV.ext}</a>`:''}</div>
    <div class="v181grid in">${page.map(p=>tile(p)).join('')}</div>${list.length>cf.n?`<button type="button" class="v179b more" data-v181="cmore" data-cid="${E(c.id)}">הצג עוד (${list.length-cf.n} נוספים)</button>`:''}
    <p class="v179help">${nP?'פוסטים: מעקב המתחרים של Metricool, מתעדכן כל בוקר, בגודל התצוגה המקדימה ש-Metricool מחזיר. ':''}${nS?'צילומי מסך: הקבצים שהעליתם, ברזולוציה המלאה.':''}</p></div>`}}
 return `<details class="v181sec" data-v181sec="${E(c.id)}"${open?' open':''}><summary><span class="v179st"><b>הגלריה שלהם · פוסטים ומודעות</b><small>${sub}</small></span>${strip}<i class="v179chev" aria-hidden="true">${SV.chev}</i></summary>${body}</details>`}
function refreshSec(cid){const el=document.querySelector(`details[data-v181sec="${CSS.escape(String(cid))}"]`);if(!el)return;const c=(APP.comps&&APP.comps[cid])||(typeof compList==='function'?compList().find(x=>String(x.id)===String(cid)):null);if(!c)return;
 const t=document.createElement('template');t.innerHTML=secHtml(c);el.replaceWith(t.content.firstElementChild)}
try{vComps=(f=>function(){const html=f.apply(this,arguments);try{const t=document.createElement('template');t.innerHTML=html;
 t.content.querySelectorAll('article.cc').forEach(a=>{const b=a.querySelector('[data-cid]');if(!b)return;const cid=b.dataset.cid;const c=(APP.comps&&APP.comps[cid])||(typeof compList==='function'?compList().find(x=>String(x.id)===String(cid)):null);if(!c)return;
  const at=a.querySelector('details.v179sec')||a.querySelector('.ca');if(at)at.insertAdjacentHTML('beforebegin',secHtml(c))});return t.innerHTML}catch(e){console.warn('v181 comps',e);return html}})(vComps)}catch(e){console.error('v181 vComps',e)}

/* ---------- B. the central view of every gallery ---------- */
try{VTITLE.compgal=['גלריות המתחרים','תיקייה לכל מתחרה: הפוסטים שלהם וצילומי המסך של המודעות. כל תמונה אפשר לשכפל למותג שלנו']}catch(e){}
try{if(Array.isArray(VIEWS)&&!VIEWS.some(g=>g[1].some(v=>v[0]==='compgal'))){const g=VIEWS.find(g=>g[1].some(v=>v[0]==='competitors'))||VIEWS[VIEWS.length-1];const i=g[1].findIndex(v=>v[0]==='competitors');g[1].splice(i+1,0,['compgal','גלריות המתחרים','img'])}}catch(e){}
// the menu sorts the advanced views by its own list, where this view is unknown: put the galleries right after the competitors
function fixNav(){const a=document.querySelector('#sidenav [data-view="competitors"]'),b=document.querySelector('#sidenav [data-view="compgal"]');if(!a||!b||a.nextElementSibling===b)return;
 let x=b,y=a;while(x.parentElement&&!x.parentElement.contains(a))x=x.parentElement;while(y.parentElement&&y.parentElement!==x.parentElement)y=y.parentElement;if(y.parentElement===x.parentElement)y.after(x)}
try{renderNav=(f=>function(){const r=f.apply(this,arguments);try{fixNav()}catch(e){}return r})(renderNav)}catch(e){}
function libList(){const L=G.lib;let l=allItems();if(L.comp)l=l.filter(p=>shortName(p)===L.comp);l=kindF(l,L.kind);
 if(L.q){const q=L.q.toLowerCase();l=l.filter(p=>String(p.text||'').toLowerCase().includes(q)||String(p.comp_name||'').toLowerCase().includes(q)||String(p.ad_title||'').toLowerCase().includes(q))}return sortP(l,L.sort)}
// one folder per competitor: cover picture, posts and screenshots
function folders(){const m=new Map();sortP(allItems(),'new').forEach(p=>{const k=shortName(p);let f=m.get(k);if(!f){f={name:k,cid:String(isShot(p)?p.comp_id:idsOf(p)[0]),posts:0,shots:0,cover:''};m.set(k,f)}isShot(p)?f.shots++:f.posts++;if(!f.cover)f.cover=srcOf(p)});
 return [...m.values()].sort((a,b)=>(b.posts+b.shots)-(a.posts+a.shots)||a.name.localeCompare(b.name,'he'))}
const cntTxt=(p,s)=>[p?nP_(p):'',s?nS_(s):''].filter(Boolean).join(' · ')||'ריקה';
function vGal(){const L=G.lib;if(!APP.db)return `<div class="v181p0"><div class="v179empty big"><b>הגלריות נטענות כשהמערכת מחוברת</b><p>התמונות נשמרות במסד הנתונים של האתר. התחברו לעמוד הניהול ורעננו.</p></div></div>`;
 if(!G.loaded)return `<div class="v181p0"><div class="v181grid">${Array.from({length:6},()=>'<div class="v181sk"></div>').join('')}</div></div>`;
 const F=folders();let comps=[];try{comps=(typeof compList==='function'?compList():Object.values(APP.comps||{})).filter(c=>c&&c.name).map(c=>[String(c.id),String(c.name)]);const seen=new Set();comps=comps.filter(([,n])=>!seen.has(n)&&seen.add(n)).sort((a,b)=>a[1].localeCompare(b[1],'he'))}catch(e){}
 const list=libList();const page=list.slice(0,L.n);const f=L.comp?F.find(x=>x.name===L.comp)||{name:L.comp,cid:L.cid,posts:0,shots:0}:null;
 const bar=`<div class="v179bar"><label class="v179q">${SV.search}<input type="search" data-v181q value="${E(L.q)}" placeholder="חיפוש בטקסט, בהערה או במתחרה" aria-label="חיפוש בטקסט, בהערה או במתחרה"></label>
  <label class="v179sel"><span>סוג</span><select data-v181="kind"><option value="">הכל</option><option value="post"${L.kind==='post'?' selected':''}>פוסטים מפייסבוק</option><option value="shot"${L.kind==='shot'?' selected':''}>צילומי מסך</option></select></label>
  <label class="v179sel"><span>סדר</span><select data-v181="sort"><option value="new"${L.sort==='new'?' selected':''}>חדשים קודם</option><option value="eng"${L.sort==='eng'?' selected':''}>הכי הרבה מעורבות</option></select></label>
  <label class="v179sel"><span>תיקייה של מתחרה</span><select data-v181="open"><option value="">בחירה…</option>${comps.map(([id,n])=>`<option value="${E(id)}"${f&&f.name===n?' selected':''}>${E(n)}</option>`).join('')}</select></label></div>`;
 const grid=page.length?`<div class="v181grid">${page.map(p=>tile(p,{showComp:!f})).join('')}</div>`:`<div class="v179empty"><b>${f&&!f.posts&&!f.shots?'התיקייה עדיין ריקה':'אין תמונות בסינון הזה'}</b><p>${f&&!f.posts&&!f.shots?'מעלים צילומי מסך של המודעות שלהם בכפתור למעלה.':'נסו מילה אחרת או סוג אחר.'}</p></div>`;
 const more=list.length>L.n?`<button type="button" class="v179b more" data-v181="lmore">הצג עוד (${list.length-L.n} נוספות)</button>`:'';
 const raw=f?list.filter(p=>isShot(p)&&!p.enh):[];
 if(f)return `<div class="v181p0">${bar}<div class="v181fh"><button type="button" class="v179b" data-v181="folder" data-k="">${I('right',16)} כל התיקיות</button><h3>${E(f.name)}</h3><span>${cntTxt(f.posts,f.shots)}</span>${raw.length?`<button type="button" class="v179b pri" data-v181="senhall" data-ids="${E(raw.map(p=>p.sid).join(','))}">${I('wand',15)} שיפור כל צילומי המסך (${raw.length})</button>`:''}</div>${f.cid?upZone(f.cid):''}<p class="v179cnt" aria-live="polite">${list.length} תמונות בתיקייה</p>${grid}${more}</div>`;
 if(!F.length)return `<div class="v181p0">${bar}<div class="v179empty big"><b>עדיין אין תמונות של מתחרים</b><p>בוחרים תיקייה של מתחרה למעלה ומעלים צילומי מסך של המודעות שלו. ${HOWTO}</p></div></div>`;
 return `<div class="v181p0">${bar}<div class="v181h2"><b>תיקיות</b><span>${F.length} מתחרים</span></div><div class="v181folds">${F.map(x=>`<button type="button" class="v181fold" data-v181="folder" data-k="${E(x.name)}" data-cid="${E(x.cid)}"><span class="v181fc">${x.cover?`<img src="${E(x.cover)}" alt="" loading="lazy" referrerpolicy="no-referrer">`:SV.pic}</span><b>${E(x.name)}</b><small>${cntTxt(x.posts,x.shots)}</small></button>`).join('')}</div>
  <div class="v181h2"><b>כל התמונות</b></div><p class="v179cnt" aria-live="polite">${list.length} תמונות של ${new Set(list.map(shortName)).size} מתחרים${lastFetch()?` · פוסטים עודכנו ${E(fmtD(lastFetch()))}`:''}. פוסטים מגיעים רק ממתחרים שבמעקב ב-Metricool. צילומי מסך אפשר להעלות לכל מתחרה.</p>${grid}${more}</div>`}
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
function shotDetail(p){const ad=p.ad_id&&window.__v179&&__v179.M.ads.get(String(p.ad_id));const full=fullOf(p);const isO=!p.enh||G.orig.has(p.sid);
 const dimL=(w,h)=>`<bdi dir="ltr">${w}×${h}</bdi>`;
 const qual=p.enh?`<div class="v179seg v181vs" role="group" aria-label="איזו גרסה להציג"><button type="button" data-v181="sver" data-sid="${E(p.sid)}" data-k="enh" aria-pressed="${!isO}"><span>משופר</span></button><button type="button" data-v181="sver" data-sid="${E(p.sid)}" data-k="orig" aria-pressed="${isO}"><span>המקור</span></button></div>`
  :`<button type="button" class="v179b" data-v181="senh" data-sid="${E(p.sid)}">${I('wand',15)} שיפור איכות</button>`;const snap=ad&&safeUrl(ad.snapshot_url);
 return `<header class="v179mh"><h2>${E(shortName(p))} · צילום מסך</h2>${xBtn('v181d')}</header>
 <div class="v179mb"><a class="v181big" href="${E(full)}" target="_blank" rel="noopener" aria-label="פתיחה בגודל מלא"><img src="${E(full)}" alt="צילום מסך של מודעה של ${E(shortName(p))}" decoding="async"></a>
 <div class="v181qrow">${qual}<span class="v179muted">${p.enh?`הגרסה המשופרת ${dimL(p.ew,p.eh)}: ${(p.eops||[]).includes('upscale')?'הוגדלה, ':''}${(p.eops||[]).includes('levels')?'ניגודיות מאוזנת, ':''}חדות משופרת. המקור נשמר כמו שהוא.`:'אפשר לשפר את החדות של צילום המסך. המקור נשמר כמו שהוא.'}</span></div>
 <dl class="v179dl two"><div><dt>גודל המקור</dt><dd>${p.w&&p.h?`${dimL(p.w,p.h)} פיקסלים`:'לא ידוע'}${p.w&&Math.max(p.w,p.h)<1000?' <span class="v179p warn">רזולוציה נמוכה</span>':''}</dd></div><div><dt>קובץ המקור</dt><dd>${E(mb(p.bytes))}${p.type?' · '+E(String(p.type).replace('image/','').toUpperCase()):''}</dd></div><div><dt>הועלה</dt><dd>${E(fmtD(p.added))}</dd></div>${p.ad_title||ad?`<div><dt>המודעה</dt><dd>${E(p.ad_title||String((ad&&ad.title)||'')||'ללא כותרת')}</dd></div>`:''}</dl>
 <label class="v179ta"><span>הערה (לא חובה)</span><textarea rows="2" data-v181note="${E(p.sid)}" placeholder="למשל: מודעה של פרויקט ברעננה, רצה 90 יום">${E(p.note||'')}</textarea></label>
 <div class="v179fa"><a class="v179b" href="${E(full)}" target="_blank" rel="noopener">פתיחה בגודל מלא${p.enh?(isO?' (המקור)':' (משופר)'):''} ${SV.ext}</a>${snap?`<a class="v179b" href="${E(snap)}" target="_blank" rel="noopener">המודעה ב-Meta ${SV.ext}</a>`:''}<button type="button" class="v179b" data-v181="sdel" data-sid="${E(p.sid)}">${I('trash',15)} מחיקה</button></div></div>
 <footer class="v179mf"><button type="button" class="v179b pri big" data-v181="clone" data-id="${E(p.id)}">${I('wand',16)} שכפל למותג שלנו</button></footer>`}
function openDetail(id){const p=getItem(id);if(!p)return;modal('v181d',isShot(p)?shotDetail(p):detailHtml(p),isShot(p)?'צילום מסך של מודעה של מתחרה':'הפוסט של המתחרה')}

/* ---------- C. "שכפל למותג שלנו" ---------- */
const canSee=()=>window.__ENGINE_HOST==='site';
const isMeta=p=>!!p&&isShot(p)&&p.source==='meta';
const imgsFor=p=>isShot(p)&&canSee()?(isMeta(p)?[safeUrl(p.creative),safeUrl(p.prev)]:[safeUrl(p.ai||p.url)]).filter(Boolean):[];
function prompt(post,o){if(isShot(post))return promptShot(post,o);const B=V().brandOf(o.brand);const PROJ=V().PROJ||[];const goal=o.goal==='leads'?'לידים: פנייה של לקוח פוטנציאלי':o.goal==='brand'?'מודעות למותג: שיזכרו את השם ומה אנחנו עושים':'פרויקט ספציפי'+(o.project?': '+(PROJ.find(p=>p[0]===o.project)||[])[1]:'');
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
function promptShot(p,o){const B=V().brandOf(o.brand);const PROJ=V().PROJ||[];const seen=imgsFor(p).length>0;const goal=o.goal==='leads'?'לידים: פנייה של לקוח פוטנציאלי':o.goal==='brand'?'מודעות למותג: שיזכרו את השם ומה אנחנו עושים':'פרויקט ספציפי'+(o.project?': '+(PROJ.find(x=>x[0]===o.project)||[])[1]:'');
 return `אתה הקריאייטיב דיירקטור של "${B.name}". ${seen?'מצורפת תמונה: צילום מסך או התמונה המקורית של מודעה שמתחרה מפרסם.':'יש לנו צילום מסך של מודעה של מתחרה, אבל אינך רואה אותו. עבוד רק לפי הפרטים בכתב ואל תניח מה יש בתמונה.'} המשימה בשני חלקים.
חלק 1, ניתוח: ${seen?'קרא מהתמונה את הטקסט שעל המודעה, הכותרת והקריאה לפעולה. ':''}מסר מרכזי, הצעת הערך, ההוק, המבנה, הקריאה לפעולה, העיקרון שאפשר ללמוד (עיקרון, לא ניסוח)${seen?', והעיצוב: סוג הלייאאוט, היררכיית הטקסט, מיקום הכותרת והקריאה לפעולה, מה רואים בתמונה, צבעים וטיפוגרפיה, בשפה שמעצב יכול לבנות ממנה':''}.
חלק 2, גרסה מקורית ל"${B.name}" באותו מבנה ובאותו סוג מודעה, בשפה ובצבעים של המותג שלנו ועם התמונות שלנו. אסור להעתיק מילים, משפטים, שמות, מספרים, לוגו או תמונה של המתחרה. בלי להזכיר את המתחרה. רק עובדות מהרשימה, בלי להמציא מספרים, כתובות, מחירים, שמות או אירועים.
המודעה של המתחרה:
מתחרה: ${shortName(p)}
${p.ad_title?'כותרת המודעה בספריית Meta: '+p.ad_title+'\n':''}${p.note?'הערה של הצוות: '+p.note+'\n':''}מטרת הקמפיין שלנו: ${goal}${o.note?'\nהנחיה מהמנהל: '+o.note:''}
עובדות מותרות על המותג:
${B.facts}
${B.rules}
מגבלות: headline עד 7 מילים (מותר \\n אחד), sub עד 12 מילים, items 3 עד 4 שורות קצרות, cta עד 4 מילים, fb 60 עד 150 מילים.
החזר JSON בלבד: {"analysis":{"message":"","value_prop":"","hook":"","structure":"","cta":"","principle":"","visual":""},"post":{"headline":"","sub":"","items":[""],"cta":"","fb":""}}`}
async function askAI(p,images){let s=null;try{s=window.claude&&window.claude.use?await window.claude.use('sample'):null}catch(e){}if(!s&&typeof KC!=='undefined'&&KC.sample)s=KC.sample;if(!s){const e=new Error('no');e.code='not_granted';throw e}
 const opts={cache:false,modelTier:'default'};if(images&&images.length)opts.images=images;const r=await s.json(p,opts);if(!r||typeof r!=='object'||!r.post)throw new Error('bad');return r}
const asAd=post=>({id:post.id,comp_id:post.comp_id,comp_name:shortName(post),page_name:'',title:excerpt(post.text,90),start:null,snapshot_url:''});
function srcFields(post){if(isShot(post))return {id:String(post.id),kind:'shot',comp_name:shortName(post),published:post.added||null,text:String(post.note||post.ad_title||'').slice(0,600),reactions:0,comments:0,shares:0,link:safeUrl(post.enh||post.url),img:safeUrl(post.enh||post.url),w:post.ew||post.w||0,h:post.eh||post.h||0,ad_id:post.ad_id||''};
 return {id:String(post.id),comp_name:shortName(post),published:post.published||null,text:String(post.text||'').slice(0,600),reactions:+post.reactions||0,comments:+post.comments||0,shares:+post.shares||0,link:safeUrl(post.link),img:post.thumb||safeUrl(post.image)}}
function finish(p,post,res,o){V().applyTo(p,res,asAd(post),o);delete p.metaSource;p.src='comppost';p.compPostId=String(post.id);p.compSource=srcFields(post);const vis=res&&res.analysis&&res.analysis.visual;if(vis)p.metaAnalysis=Object.assign({},p.metaAnalysis||{},{visual:(V().cleanTxt||String)(vis)});return p}
function makePost(post,res,o){const ct=V().cleanTxt||(x=>String(x||'').trim());const P=res.post||{};const items=Array.isArray(P.items)?P.items.filter(Boolean):[];const L=items.length>=3?'ed_article':'ed_quote';const proj=o.goal==='project'&&o.project?o.project:'general';
 let p=mkPost({layout:L,project:proj,label:o.goal==='leads'?'לפרטים':o.goal==='brand'?'מי אנחנו':'',head:ct(P.headline)||'פוסט חדש',sub:ct(P.sub),items:items.map(ct),cta:ct(P.cta),fb:ct(P.fb)||undefined,why:'גרסה למותג שלנו, מתוך '+(isShot(post)?'מודעה':'פוסט')+' של '+shortName(post)});
 if(!p)throw new Error('mkPost');
 if(o.brand==='afik'){if(window.__v178&&__v178.cloneOne){const q=__v178.cloneOne(p);delete q.clonedFrom;p=q}else{p.brand='afik';p.series='אפיק הנחל'}}
 p.compId=post.comp_id;p.compName=shortName(post);return finish(p,post,res,o)}
function genHtml(st){const g=G.gen,post=g.post;const GOALS=V().GOALS||[['leads','לידים'],['brand','מודעות למותג'],['project','פרויקט ספציפי']];const PROJ=V().PROJ||[];
 const hdr=`<header class="v179mh"><h2>שכפל למותג שלנו</h2>${xBtn('v181g')}</header>`;
 const sh=isShot(post);const src=`<div class="v181gsrc"><div class="v181gpic">${picHtml(post)}</div><div><span class="v179muted">${sh?'צילום מסך של':'הפוסט של'} ${E(shortName(post))} · ${E(fmtD(post.published))}</span><b>${E(excerpt(post.text,120)||(sh?'מודעה בלי הערה':'פוסט בלי טקסט'))}</b>${sh?(imgsFor(post).length?'<span class="v179muted">Claude יראה את התמונה עצמה וינתח גם את העיצוב</span>':'<span class="v179muted">כאן Claude עובד בלי לראות את התמונה</span>'):engHtml(post)}</div></div>`;
 if(st==='form')return `${hdr}<div class="v179mb">${src}<form class="v179gf" data-v181gen="1"><fieldset><legend>למי כותבים</legend><div class="v179brands"><label class="v179br"><input type="radio" name="brand" value="kurkoos" ${g.o.brand!=='afik'?'checked':''}><span class="v179brc" style="--c:#07293a"></span><b>קבוצת קורקוס</b><small>בנייה, יזמות ופיקוח</small></label><label class="v179br"><input type="radio" name="brand" value="afik" ${g.o.brand==='afik'?'checked':''}><span class="v179brc" style="--c:#8490D8"></span><b>אפיק הנחל</b><small>שיווק ותיווך</small></label></div></fieldset>
  <label class="v179sel full"><span>מטרת הפוסט</span><select name="goal" data-v181="goal">${GOALS.map(([k,l])=>`<option value="${k}"${g.o.goal===k?' selected':''}>${l}</option>`).join('')}</select></label>
  <label class="v179sel full" ${g.o.goal==='project'?'':'hidden'}><span>איזה פרויקט</span><select name="project">${PROJ.map(([k,l])=>`<option value="${k}"${g.o.project===k?' selected':''}>${l}</option>`).join('')}</select></label>
  <label class="v179ta"><span>הנחיה חופשית (לא חובה)</span><textarea name="note" rows="2" placeholder="למשל: רגע מהשטח בהנרייטה סאלד, בלי מחיר">${E(g.o.note||'')}</textarea></label>
  <p class="v179help">Claude מנתח למה הפוסט שלהם עובד וכותב פוסט מקורי שלנו, עם התמונות שלנו, בלי להעתיק ניסוח או תמונה. כל חלק נפתח לעריכה בעורך: כותרת, טקסט, תמונה, צבעים ושכבות. שום דבר לא מתפרסם לבד.</p>
  <div class="v179fa end"><button type="button" class="v179b" data-v181="close" data-m="v181g">ביטול</button><button type="submit" class="v179b pri big">${I('wand',16)} צור גרסה</button></div></form></div>`;
 if(st==='busy')return `${hdr}<div class="v179mb">${src}<div class="v179busy" role="status" aria-live="polite"><i></i><b>Claude מנתח וכותב…</b><span>בדרך כלל 20 עד 60 שניות</span></div></div>`;
 if(st==='err')return `${hdr}<div class="v179mb">${src}<div class="v179empty"><b>${E(g.err||'הכתיבה לא הצליחה')}</b><p>${g.errCode==='not_granted'?'Claude זמין כשהמערכת מחוברת. אפשר לנסות שוב אחרי התחברות.':'אפשר לנסות שוב, או לכתוב את הגרסה ידנית בסטודיו.'}</p><div class="v179fa"><button type="button" class="v179b pri" data-v181="gretry">נסו שוב</button><button type="button" class="v179b" data-v181="close" data-m="v181g">סגירה</button></div></div></div>`;
 const p=g.draft,A=p.metaAnalysis||{};
 return `${hdr}<div class="v179mb">${src}<div class="v179res"><div class="v179h"><b>מה למדנו מה${isShot(post)?'מודעה':'פוסט'} שלהם</b></div><dl class="v179dl">${[['המסר',A.message],['הצעת הערך',A.value_prop],['ההוק',A.hook],['המבנה',A.structure],['קריאה לפעולה',A.cta],['העיצוב',A.visual],['העיקרון שלקחנו',A.principle]].filter(([,v])=>v).map(([l,v])=>`<div><dt>${l}</dt><dd>${E(v)}</dd></div>`).join('')}</dl>
  <div class="v179h"><b>הגרסה שלנו</b><span>${E(p.brand==='afik'?'אפיק הנחל':'קבוצת קורקוס')} · טיוטה</span></div><div class="v179post"><b>${E((p.visual.headline||'').replace(/\n/g,' '))}</b>${p.visual.sub?`<p>${E(p.visual.sub)}</p>`:''}${p.fx&&Array.isArray(p.fx.items)&&p.fx.items.length?`<ul>${p.fx.items.map(x=>`<li>${E(x)}</li>`).join('')}</ul>`:''}${p.visual.cta?`<em>${E(p.visual.cta)}</em>`:''}<pre>${E(p.fb||'')}</pre></div></div></div>
  <footer class="v179mf"><button type="button" class="v179b" data-v181="gagain">${I('wand',15)} גרסה נוספת</button><button type="button" class="v179b pri big" data-v181="gopen">${I('edit',16)} פתח בעורך העיצוב</button></footer>`}
function openGen(id){const post=getItem(id);if(!post)return;closeM('v181d');let b='kurkoos';try{b=JSON.parse(localStorage.getItem('v179_brand')||'"kurkoos"')}catch(e){}
 G.gen={post,o:{brand:b,goal:'leads',project:'henrietta',note:''},draft:null,st:'form'};modal('v181g',genHtml('form'),'שכפל למותג שלנו')}
function genRender(){const m=document.getElementById('v181g');if(!m||!G.gen)return;m.querySelector('.v179box').innerHTML=genHtml(G.gen.st);const f=m.querySelector('.v179box button.pri,.v179box button');f&&f.focus()}
async function runGen(){const g=G.gen;if(!g)return;g.st='busy';genRender();
 try{const res=await askAI(prompt(g.post,g.o),imgsFor(g.post));if(g.draft)finish(g.draft,g.post,res,g.o);else{g.draft=makePost(g.post,res,g.o);AG.posts.unshift(g.draft)}try{saveAgent()}catch(e){}try{await ensureImgs(g.draft)}catch(e){}g.st='done';genRender();toast('הגרסה נוספה לטיוטות. אפשר לפתוח אותה בעורך')}
 catch(e){g.st='err';g.errCode=e&&e.code;g.err=e&&e.code==='rate_limited'?'יותר מדי בקשות, נסו בעוד דקה':e&&e.code==='not_granted'?'Claude לא זמין בתצוגה הזו':'הכתיבה לא הצליחה';genRender()}}

/* ---------- the source panel inside the editor ---------- */
function srcPanel(p){const s=p.compSource||{},A=p.metaAnalysis||{};const open=G.srcOpen==null?!window.matchMedia('(max-width:700px)').matches:G.srcOpen;
 return `<section class="v179src v181src${open?' open':''}" aria-label="הפוסט שממנו יצאנו"><button type="button" class="v179srch" data-v181="srctoggle" aria-expanded="${open}"><span class="v179srck">המקור</span><span class="v179srct"><b>${E(excerpt(s.text,70)||(s.kind==='shot'?'מודעה של המתחרה':'פוסט בלי טקסט'))}</b><small>${E(s.comp_name||'')}${s.published?' · '+E(fmtD(s.published)):''} · ${s.kind==='shot'?'צילום מסך'+(s.w?` <bdi dir="ltr">${s.w}×${s.h}</bdi>`:''):`${+s.reactions||0} לייקים · ${+s.comments||0} תגובות`}</small></span><i class="v179chev" aria-hidden="true">${SV.chev}</i></button>
  <div class="v179srcb"${open?'':' hidden'}><div class="v181gsrc">${s.img?`<div class="v181gpic"><img src="${E(s.img)}" alt="התמונה מהפוסט של ${E(s.comp_name||'המתחרה')}" referrerpolicy="no-referrer" loading="lazy"></div>`:''}<p class="v181full sm">${E(s.text||'')}</p></div>
  <dl class="v179dl">${[['המסר',A.message],['הצעת הערך',A.value_prop],['ההוק',A.hook],['המבנה',A.structure],['קריאה לפעולה',A.cta],['העיצוב',A.visual],['העיקרון שלקחנו',A.principle]].filter(([,v])=>v).map(([l,v])=>`<div><dt>${l}</dt><dd>${E(v)}</dd></div>`).join('')}</dl>
  <div class="v179fa">${s.link?`<a class="v179b" href="${E(s.link)}" target="_blank" rel="noopener">${s.kind==='shot'?'צילום המסך בגודל מלא':'לפוסט שלהם בפייסבוק'} ${SV.ext}</a>`:''}<button type="button" class="v179b" data-v181="again">${I('wand',15)} גרסה נוספת</button></div><p class="v179help">התמונה שלהם כאן רק להשראה. בפוסט שלנו התמונות שלנו. שום דבר לא מתפרסם לבד.</p></div></section>`}
try{peRender=(f=>function(){const r=f.apply(this,arguments);try{if(typeof PE!=='undefined'&&PE.p&&PE.p.src==='comppost'){const b=document.querySelector('#pe-root .pe-body');if(b&&!b.querySelector('.v181src'))b.insertAdjacentHTML('afterbegin',srcPanel(PE.p))}}catch(e){console.warn('v181 src',e)}return r})(peRender)}catch(e){console.error('v181 pe',e)}
async function againInEditor(){const p=PE.p;if(!p||p.src!=='comppost')return;const s=p.compSource||{};const post=getItem(p.compPostId)||{id:p.compPostId,comp_id:p.compId,comp_name:s.comp_name||p.compName,text:s.text,published:s.published,reactions:s.reactions,comments:s.comments,shares:s.shares,link:s.link,image:s.img};
 const o={brand:p.metaBrand||(p.brand==='afik'?'afik':'kurkoos'),goal:p.metaGoal||'leads',project:p.project,note:p.metaNote||''};
 const b=document.querySelector('#pe-root [data-v181="again"]');if(b){b.disabled=true;b.textContent='Claude כותב…'}toast('Claude כותב גרסה נוספת…');
 try{const res=await askAI(prompt(post,o),imgsFor(post));PE.hist.push(peSnap(p));PE.fut=[];finish(p,post,res,o);peRender();try{peLive()}catch(e){}toast('גרסה נוספת נכתבה. אפשר לבטל עם ביטול')}
 catch(e){toast(e&&e.code==='not_granted'?'Claude זמין כשהמערכת מחוברת':'הכתיבה לא הצליחה. נסו שוב');if(b){b.disabled=false;b.innerHTML=`${I('wand',15)} גרסה נוספת`}}}

/* ---------- D. screenshots: upload at full resolution into the competitor's folder ---------- */
async function assetsNS(){try{const a=window.claude&&window.claude.use?await window.claude.use('assets'):null;if(a)return a}catch(e){}return (typeof KC!=='undefined'&&KC.assets)||null}
const extOf=f=>({'image/png':'png','image/jpeg':'jpg','image/webp':'webp','image/gif':'gif','image/heic':'heic','image/heif':'heif','image/avif':'avif'})[f.type]||((/\.([a-z0-9]{2,5})$/i.exec(f.name||'')||[])[1]||'jpg').toLowerCase();
// two light copies next to the untouched original: a preview for the gallery and a 1568px copy for Claude (its own reading size)
async function scaled(bm,max,q){const k=Math.min(1,max/Math.max(bm.width,bm.height));const c=document.createElement('canvas');c.width=Math.max(1,Math.round(bm.width*k));c.height=Math.max(1,Math.round(bm.height*k));
 const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(bm,0,0,c.width,c.height);return await new Promise(z=>c.toBlob(z,'image/jpeg',q))}
// clarity: small pictures are enlarged in one high quality step (measured sharper than doubling steps), levels are stretched
// gently and the detail is sharpened with an unsharp mask sized to the enlargement. Nothing is invented: what was not in the
// picture does not appear.
function mkC(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.imageSmoothingEnabled=true;x.imageSmoothingQuality='high';return [c,x]}
function upscale(src,W,H){const [c,x]=mkC(W,H);x.fillStyle='#fff';x.fillRect(0,0,W,H);x.drawImage(src,0,0,W,H);return [c,x]}
function levels(a){const hist=new Uint32Array(256);const n=a.length/4;const st=Math.max(1,Math.floor(n/200000));let m=0;for(let i=0;i<n;i+=st){const j=i*4;hist[(a[j]*77+a[j+1]*150+a[j+2]*29)>>8]++;m++}
 let lo=0,hi=255,acc=0;for(;lo<255;lo++){acc+=hist[lo];if(acc>m*.003)break}acc=0;for(;hi>0;hi--){acc+=hist[hi];if(acc>m*.003)break}
 if(hi-lo<40||(lo<=6&&hi>=249))return false;const k=255/(hi-lo);const lut=new Uint8ClampedArray(256);for(let v=0;v<256;v++)lut[v]=Math.round(v*.4+((v-lo)*k)*.6);
 for(let i=0;i<a.length;i+=4){a[i]=lut[a[i]];a[i+1]=lut[a[i+1]];a[i+2]=lut[a[i+2]]}return true}
function blur(a,w,h,r){const t=new Uint8ClampedArray(a.length),o=new Uint8ClampedArray(a.length),d=2*r+1;
 for(let y=0;y<h;y++){const row=y*w*4;for(let c=0;c<3;c++){let s=0;for(let k=-r;k<=r;k++)s+=a[row+Math.min(w-1,Math.max(0,k))*4+c];for(let x=0;x<w;x++){t[row+x*4+c]=s/d;s+=a[row+Math.min(w-1,x+r+1)*4+c]-a[row+Math.max(0,x-r)*4+c]}}}
 for(let x=0;x<w;x++){for(let c=0;c<3;c++){let s=0;for(let k=-r;k<=r;k++)s+=t[(Math.min(h-1,Math.max(0,k))*w+x)*4+c];for(let y=0;y<h;y++){o[(y*w+x)*4+c]=s/d;s+=t[(Math.min(h-1,y+r+1)*w+x)*4+c]-t[(Math.max(0,y-r)*w+x)*4+c]}}}return o}
function sharpen(a,b,amt){for(let i=0;i<a.length;i+=4)for(let c=0;c<3;c++){const v=a[i+c],dv=v-b[i+c];if(dv>3||dv<-3)a[i+c]=v+amt*dv}}
const toBlob=(c,t,q)=>new Promise(z=>c.toBlob(z,t,q));
async function enhance(bm,opt={}){const L=Math.max(bm.width,bm.height);const maxL=opt.maxLong||2560;let k=L<1800?Math.min(4,maxL/L):1;if(bm.width*k*bm.height*k>12e6)k=Math.sqrt(12e6/(bm.width*bm.height));k=Math.max(1,k);
 const W=Math.round(bm.width*k),H=Math.round(bm.height*k);const [c,x]=upscale(bm,W,H);const id=x.getImageData(0,0,W,H);const a=id.data;const ops=[];if(k>1.05)ops.push('upscale');
 if(levels(a))ops.push('levels');
 // two passes: a wide mask restores the edges the enlargement softened, a narrow one brings back fine detail
 if(k>1.6){sharpen(a,blur(a,W,H,Math.min(4,Math.round(k))),.9);sharpen(a,blur(a,W,H,1),.6)}else{sharpen(a,blur(a,W,H,1),k>1.05?.95:.7)}ops.push('sharpen');x.putImageData(id,0,0);
 let out=opt.jpeg?null:await toBlob(c,'image/png');if(!out||out.size>15*1048576)out=await toBlob(c,'image/jpeg',opt.q||.95);return {blob:out,w:W,h:H,c,ops}}
function upStatus(cid){const st=G.up[String(cid)];document.querySelectorAll(`[data-v181drop="${CSS.escape(String(cid))}"] .v181upst`).forEach(el=>{el.textContent=st?`${st.phase||'מעלה'} ${Math.min(st.n,st.done+st.err+1)} מתוך ${st.n}…`:''})}
async function uploadShots(cid,files,adId){cid=String(cid||'');const c=compDoc(cid);if(!c){toast('לא נמצא המתחרה');return}
 files=[...(files||[])].filter(f=>f&&(/^image\//.test(f.type||'')||/\.(png|jpe?g|webp|heic|heif|gif|avif)$/i.test(f.name||'')));
 if(!files.length){toast('אפשר להעלות רק תמונות');return}
 const A=await assetsNS();if(!A||!APP.db){toast('ההעלאה זמינה כשהמערכת מחוברת');return}
 if(G.up[cid]){toast('העלאה קודמת עדיין רצה');return}
 const st=G.up[cid]={n:files.length,done:0,err:0};upStatus(cid);let low=0;const ad=adId&&window.__v179?__v179.M.ads.get(String(adId)):null;
 for(const f of files){try{
   if(f.size>30*1048576){st.err++;toast('הקובץ '+f.name+' גדול מ-30MB ולא נשמר');upStatus(cid);continue}
   let bm=null;try{bm=await createImageBitmap(f)}catch(e){}
   const up=await A.upload(f,{ext:extOf(f)});let prev=null,ai=null,en=null,enh=null;
   if(bm){try{G.up[cid].phase='משפר את האיכות';upStatus(cid);en=await enhance(bm);enh=await A.upload(en.blob,{ext:en.blob.type==='image/png'?'png':'jpg'})}catch(e){console.warn('v181 enhance',e);en=null}
    const base=en?en.c:bm;try{const b=await scaled(base,1080,.9);if(b)prev=await A.upload(b,{ext:'jpg'})}catch(e){}try{const b=await scaled(base,1568,.92);if(b)ai=await A.upload(b,{ext:'jpg'})}catch(e){}G.up[cid].phase=''}
   const id='s'+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
   const doc={id,comp_id:cid,comp_name:String(c.name||''),ad_id:adId?String(adId):'',ad_title:ad?String(ad.title||'').trim():'',note:'',url:up.url,blob:up.id,prev:prev?prev.url:'',prev_blob:prev?prev.id:'',ai:ai?ai.url:'',ai_blob:ai?ai.id:'',
    w:bm?bm.width:0,h:bm?bm.height:0,bytes:f.size||0,type:f.type||'',name:String(f.name||'').slice(0,120),added:new Date().toISOString(),source:'upload',
    enh:enh?enh.url:'',enh_blob:enh?enh.id:'',ew:en?en.w:0,eh:en?en.h:0,ebytes:en?en.blob.size:0,eops:en?en.ops:[]};
   await APP.db.collection('comp_shots').doc(id).set(doc);G.shots.set('shot:'+id,shotItem(id,doc));
   if(bm&&Math.max(bm.width,bm.height)<1000)low++;try{bm&&bm.close&&bm.close()}catch(e){}st.done++}
  catch(e){st.err++;console.warn('v181 upload',e)}upStatus(cid)}
 G.up[cid]=null;G.open.add(cid);rerender();decorate();
 toast(st.done?`${st.done} ${st.done===1?'צילום מסך נשמר':'צילומי מסך נשמרו'} בתיקייה של ${c.name}${st.err?`, ${st.err} לא נשמרו`:''}${low?'. '+low+' ברזולוציה נמוכה, עדיף לשמור את התמונה המקורית מהמודעה':''}`:'ההעלאה לא הצליחה. נסו שוב')}
async function enhanceShot(sid){const it=G.shots.get('shot:'+sid);if(!it||it.enh)return false;const A=await assetsNS();if(!A||!APP.db)return false;
 const rs=await fetch(it.url);if(!rs.ok)throw new Error('fetch');const bm=await createImageBitmap(await rs.blob());const en=await enhance(bm);const enh=await A.upload(en.blob,{ext:en.blob.type==='image/png'?'png':'jpg'});
 let prev=null,ai=null;try{const b=await scaled(en.c,1080,.9);if(b)prev=await A.upload(b,{ext:'jpg'})}catch(e){}try{const b=await scaled(en.c,1568,.92);if(b)ai=await A.upload(b,{ext:'jpg'})}catch(e){}
 const patch={enh:enh.url,enh_blob:enh.id,ew:en.w,eh:en.h,ebytes:en.blob.size,eops:en.ops};if(!it.w){patch.w=bm.width;patch.h=bm.height}
 if(prev){patch.prev=prev.url;patch.prev_blob=prev.id}if(ai){patch.ai=ai.url;patch.ai_blob=ai.id}
 const old=[prev&&it.prev_blob,ai&&it.ai_blob].filter(Boolean);await APP.db.collection('comp_shots').doc(sid).update(patch);Object.assign(it,patch);
 old.forEach(b=>{try{A.delete&&A.delete(b).catch(()=>{})}catch(e){}});return true}
async function enhanceMany(ids,btn){let n=0,bad=0;for(const sid of ids){if(btn)btn.textContent=`משפר ${n+bad+1} מתוך ${ids.length}…`;try{if(await enhanceShot(sid))n++}catch(e){bad++;console.warn('v181 enhance',e)}}
 rerender();toast(n?`${n===1?'צילום מסך אחד שופר':n+' צילומי מסך שופרו'}${bad?`, ${bad} לא שופרו`:''}`:'השיפור לא הצליח. נסו שוב')}
async function delShot(sid){const it=G.shots.get('shot:'+sid);if(!it)return;try{await APP.db.collection('comp_shots').doc(sid).delete()}catch(e){toast('המחיקה לא הצליחה. נסו שוב');return}
 const A=await assetsNS();[it.blob,it.prev_blob,it.ai_blob,it.enh_blob].filter(Boolean).forEach(b=>{try{A&&A.delete&&A.delete(b).catch(()=>{})}catch(e){}});
 G.shots.delete('shot:'+sid);closeM('v181d');rerender();decorate();toast('צילום המסך נמחק')}
// inside the Meta ad details (V179): the screenshots of that ad and an upload tied to it; on ad cards, the screenshot itself
const shotsOfAd=id=>[...G.shots.values()].filter(p=>p.ad_id&&String(p.ad_id)===String(id));
function adShotsHtml(ad){const l=sortP(shotsOfAd(ad.id),'new');
 return `<section class="v181adshots" aria-label="צילומי מסך של המודעה"><div class="v179h"><b>צילומי מסך של המודעה</b><span>${l.length||'עדיין אין'}</span></div>
  ${l.length?`<div class="v181adl">${l.map(p=>`<button type="button" class="v181adt" data-v181="view" data-id="${E(p.id)}" aria-label="צילום מסך ${E(p.w?p.w+'×'+p.h:'')}"><img src="${E(srcOf(p))}" alt="" loading="lazy"></button>`).join('')}</div>`:''}
  ${upZone(ad.comp_id,{ad:ad.id,slim:true})}</section>`}
function decorate(){try{const d=document.getElementById('v179d');if(d&&d.dataset.id&&window.__v179){const ad=__v179.M.ads.get(String(d.dataset.id));const cur=d.querySelector('.v181adshots');const n=shotsOfAd(d.dataset.id).length;
  if(ad&&(!cur||+cur.dataset.n!==n)){const t=document.createElement('template');t.innerHTML=adShotsHtml(ad);const el=t.content.firstElementChild;el.dataset.n=n;if(cur)cur.replaceWith(el);else{const mb=d.querySelector('.v179mb');mb&&mb.appendChild(el)}}}
 if(!G.shots.size)return;const by=new Map();G.shots.forEach(p=>{if(p.ad_id&&!by.has(String(p.ad_id)))by.set(String(p.ad_id),p)});
 document.querySelectorAll('article.v179ad[data-v179ad]').forEach(a=>{const p=by.get(a.dataset.v179ad);if(!p||a.querySelector('.v181adimg'))return;a.insertAdjacentHTML('afterbegin',`<button type="button" class="v181adimg" data-v181="view" data-id="${E(p.id)}" aria-label="צילום המסך של המודעה"><img src="${E(srcOf(p))}" alt="" loading="lazy"></button>`)})}catch(e){console.warn('v181 decorate',e)}}
let moRaf=0;try{new MutationObserver(()=>{if(moRaf)return;moRaf=requestAnimationFrame(()=>{moRaf=0;decorate()})}).observe(document.body,{childList:true,subtree:true})}catch(e){}
const zoneOf=el=>el&&el.closest?el.closest('[data-v181drop]'):null;
document.addEventListener('dragover',e=>{const z=zoneOf(e.target);if(!z)return;e.preventDefault();z.classList.add('over')});
document.addEventListener('dragleave',e=>{const z=zoneOf(e.target);if(z&&!z.contains(e.relatedTarget))z.classList.remove('over')});
document.addEventListener('drop',e=>{const z=zoneOf(e.target);if(!z)return;e.preventDefault();z.classList.remove('over');uploadShots(z.dataset.v181drop,e.dataTransfer&&e.dataTransfer.files,z.dataset.ad)});
document.addEventListener('pointerdown',e=>{const z=zoneOf(e.target);G.drop=z?{cid:z.dataset.v181drop,ad:z.dataset.ad||''}:G.drop&&e.target.closest&&e.target.closest('.v181body,.v181p0,.v181adshots')?G.drop:null},true);
document.addEventListener('focusin',e=>{const z=zoneOf(e.target);if(z)G.drop={cid:z.dataset.v181drop,ad:z.dataset.ad||''}});
// a pasted picture (Ctrl+V after a screenshot) goes to the folder the person last touched
document.addEventListener('paste',e=>{const t=e.target;if(t&&t.matches&&t.matches('input:not([type=file]),textarea,[contenteditable]'))return;
 let z=zoneOf(document.activeElement);let tgt=z?{cid:z.dataset.v181drop,ad:z.dataset.ad||''}:G.drop;
 if(!tgt){const only=document.querySelectorAll('[data-v181drop]');if(only.length===1)tgt={cid:only[0].dataset.v181drop,ad:only[0].dataset.ad||''}}
 if(!tgt||!document.querySelector(`[data-v181drop="${CSS.escape(tgt.cid)}"]`))return;const fs=[...((e.clipboardData&&e.clipboardData.files)||[])].filter(f=>/^image\//.test(f.type));if(!fs.length)return;
 e.preventDefault();uploadShots(tgt.cid,fs.map((f,i)=>f.name&&f.name!=='image.png'?f:new File([f],`screenshot-${Date.now()}-${i}.${extOf(f)}`,{type:f.type})),tgt.ad)});

/* ---------- events ---------- */
document.addEventListener('click',async e=>{const b=e.target.closest&&e.target.closest('[data-v181]');if(!b)return;const a=b.dataset.v181;
 if(a==='goal'||a==='comp'||a==='sort')return;
 e.preventDefault();e.stopPropagation();
 if(a==='close'){closeM(b.dataset.m);return}
 if(a==='view'){openDetail(b.dataset.id);return}
 if(a==='clone'){openGen(b.dataset.id);return}
 if(a==='copy'){const p=getItem(b.dataset.id);if(!p)return;try{await navigator.clipboard.writeText(String(p.text||''));toast('הטקסט הועתק')}catch(x){toast('ההעתקה לא הצליחה')}return}
 if(a==='ckind'){cfOf(b.dataset.cid).kind=b.dataset.k;cfOf(b.dataset.cid).n=12;refreshSec(b.dataset.cid);return}
 if(a==='folder'){G.lib.comp=b.dataset.k||'';G.lib.cid=b.dataset.cid||'';G.lib.n=48;render();try{document.getElementById('appviews').scrollIntoView({block:'start'})}catch(x){}return}
 if(a==='sver'){if(b.dataset.k==='orig')G.orig.add(b.dataset.sid);else G.orig.delete(b.dataset.sid);openDetail('shot:'+b.dataset.sid);return}
 if(a==='senh'){b.disabled=true;b.textContent='משפר את האיכות…';try{if(await enhanceShot(b.dataset.sid)){toast('צילום המסך שופר');openDetail('shot:'+b.dataset.sid);rerender()}else{b.disabled=false}}catch(x){toast('השיפור לא הצליח. נסו שוב');b.disabled=false;b.innerHTML=`${I('wand',15)} שיפור איכות`}return}
 if(a==='senhall'){b.disabled=true;await enhanceMany(String(b.dataset.ids||'').split(',').filter(Boolean),b);return}
 if(a==='sdel'){if(b.dataset.ok!=='1'){b.dataset.ok='1';b.textContent='למחוק? לחיצה נוספת';setTimeout(()=>{if(b.isConnected){b.dataset.ok='';b.innerHTML=`${I('trash',15)} מחיקה`}},3000);return}delShot(b.dataset.sid);return}
 if(a==='csort'){cfOf(b.dataset.cid).sort=b.dataset.k;refreshSec(b.dataset.cid);return}
 if(a==='cmore'){cfOf(b.dataset.cid).n+=24;refreshSec(b.dataset.cid);return}
 if(a==='lmore'){G.lib.n+=48;render();return}
 if(a==='gretry'||a==='gagain'){runGen();return}
 if(a==='gopen'){const p=G.gen&&G.gen.draft;closeM('v181g');if(!p)return;G.srcOpen=null;setTimeout(()=>{try{peOpen(p)}catch(x){const btn=document.querySelector(`[data-pe="${CSS.escape(p.id)}"]`);btn&&btn.click()}},60);return}
 if(a==='srctoggle'){const s=b.closest('.v181src');const open=b.getAttribute('aria-expanded')!=='true';G.srcOpen=open;b.setAttribute('aria-expanded',open);s.classList.toggle('open',open);const body=s.querySelector('.v179srcb');if(body)body.hidden=!open;return}
 if(a==='again'){againInEditor();return}
},true);
document.addEventListener('change',e=>{const t=e.target;if(!t||!t.matches)return;
 if(t.matches('select[data-v181="kind"]')){G.lib.kind=t.value;G.lib.n=48;render();return}
 if(t.matches('select[data-v181="open"]')){const c=compDoc(t.value);G.lib.comp=c?String(c.name):'';G.lib.cid=c?String(c.id):'';G.lib.n=48;render();return}
 if(t.matches('input[data-v181file]')){const fs=[...t.files];t.value='';uploadShots(t.dataset.v181file,fs,t.dataset.ad);return}
 if(t.matches('textarea[data-v181note]')){const sid=t.dataset.v181note,v=t.value.trim().slice(0,500);const it=G.shots.get('shot:'+sid);if(it){it.note=v;it.text=v||it.ad_title||''}try{APP.db.collection('comp_shots').doc(sid).update({note:v}).then(()=>toast('ההערה נשמרה'))}catch(x){}return}
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

window.__v181={enhance,enhanceShot,keep,compDoc,getItem,isShot,isMeta,srcOf,fullOf,shortName,engHtml,fmtD,excerpt,allItems,G,postsOf,secHtml,vGal,openDetail,openGen,runGen,prompt,makePost,srcPanel,uploadShots,delShot,decorate,folders};
})();
