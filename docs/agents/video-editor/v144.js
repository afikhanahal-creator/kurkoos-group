// ================= V144 + V148 · photo gallery: remove any photo (and bring it back), select many, edit name and project, find broken ones. Photo bank: one page with every photo the system has (site, CMS, uploads, AI, built-in), grouped by project,
//                   plus the photos that are on the website but not in the system yet, with one tap import =================
(function(){
const CAT=/*CAT*/[];
const CAT_AT='5.10.2026';
const SUPA='https://filnzlnvujnlazwcxbuq.supabase.co',PUBKEY='sb_publishable_dp1IAlmBTz_UvV8UVID1JA_KtKLX5pR';
const MEDIA=SUPA+'/storage/v1/object/public/media/';
const SITE_ORIGIN=window.__ENGINE_HOST==='site'?'':'https://www.kurkoos-group.co.il';
const e=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tst=m=>{try{toast(m)}catch(x){}};
const SRC={site:'מהאתר',up:'העליתם',ai:'נוצרו ב-AI',topic:'תמונות נושא',builtin:'צילומי שטח ורחפן',missing:'חסרות במערכת'};
const SRC_HINT={site:'תמונות שהגיעו מהאתר ומהמערכת של הפרויקטים',up:'תמונות שהעליתם בעצמכם',ai:'תמונות שנוצרו בסטודיו התמונות',topic:'תמונות כלליות לפי נושא',builtin:'צילומים מהשטח ומהרחפן שמובנים במערכת',missing:'תמונות שיש באתר ועוד לא נכנסו למערכת'};
const S={src:'all',q:'',group:'proj',lb:null,busy:'',live:null,liveAt:0,use:null,useAt:0,sel:new Set(),selMode:false};
// ---------- removed photos: kept in the database (settings/photo_hidden), out of every list and picker, still drawn in posts that use them
const HID=new Set();const SHADOW={};const BROKEN=new Set();
try{JSON.parse(localStorage.getItem('v148_hid')||'[]').forEach(k=>HID.add(k))}catch(x){}
function applyHidden(){try{HID.forEach(k=>{if(PHOTO_LIB[k]){SHADOW[k]=PHOTO_LIB[k];delete PHOTO_LIB[k]}})}catch(x){}}
function dbo(){try{return (typeof KC!=='undefined'&&KC.db)||APP.db||null}catch(x){return null}}
let hidLoaded=false;
async function loadHidden(){const db=dbo();if(!db){setTimeout(loadHidden,1500);return}
 try{const d=await db.doc('settings/photo_hidden').get();if(d&&d.exists){const v=d.data()||{};(v.keys||[]).forEach(k=>HID.add(k))}}catch(x){}
 hidLoaded=true;applyHidden();try{localStorage.setItem('v148_hid',JSON.stringify([...HID]))}catch(x){}if(APP.view==='photos')render()}
setTimeout(loadHidden,1200);
async function saveHidden(){try{localStorage.setItem('v148_hid',JSON.stringify([...HID]))}catch(x){}
 const db=dbo();if(!db)return false;try{await db.collection('settings').doc('photo_hidden').set({keys:[...HID],at:new Date().toISOString()});return true}catch(x){return false}}
async function hide(keys){const ks=keys.filter(Boolean);if(!ks.length)return;ks.forEach(k=>HID.add(k));applyHidden();const ok=await saveHidden();S.sel.clear();S.useAt=0;
 try{if(typeof TC!=='undefined')TC.clear()}catch(x){}
 if(APP.view==='photos')render();try{if(typeof peRender==='function'&&typeof PE!=='undefined'&&PE.p)peRender()}catch(x){}
 const msg=(ks.length>1?ks.length+' תמונות הוסרו מהגלריה':'התמונה הוסרה מהגלריה')+(ok?'':' (נשמר רק בדפדפן הזה)');
 try{if(window.__undoBar){__undoBar(msg,()=>unhide(ks));return}}catch(x){}tst(msg)}
async function unhide(keys){keys.forEach(k=>{HID.delete(k);if(SHADOW[k]&&!PHOTO_LIB[k])PHOTO_LIB[k]=SHADOW[k];delete SHADOW[k]});await saveHidden();S.sel.clear();if(APP.view==='photos')render();try{if(typeof PE!=='undefined'&&PE.p)peRender()}catch(x){}tst(keys.length>1?keys.length+' תמונות חזרו לגלריה':'התמונה חזרה לגלריה')}
// a removed photo that a post already uses still loads for that post
try{libImg=(f=>function(k){if(!PHOTO_LIB[k]&&SHADOW[k]){PHOTO_LIB[k]=SHADOW[k];try{return f.apply(this,arguments)}finally{delete PHOTO_LIB[k]}}return f.apply(this,arguments)})(libImg)}catch(x){}
try{regUpload=(f=>function(id){const r=f.apply(this,arguments);if(HID.has('u_'+id))applyHidden();return r})(regUpload)}catch(x){}
window.__v148={hide,unhide,HID,SHADOW};
try{const v=JSON.parse(localStorage.getItem('v144_f')||'{}');if(v.src)S.src=v.src;if(v.group)S.group=v.group}catch(x){}
const save=()=>{try{localStorage.setItem('v144_f',JSON.stringify({src:S.src,group:S.group}))}catch(x){}};

// ---------- what the system has ----------
const norm=s=>String(s||'').replace(/["'״׳]/g,'').replace(/\s+/g,' ').trim();
function projName(p){if(!p)return '';try{return PROJ_HE[p]||p}catch(x){return p}}
function projKeyOf(name){const n=norm(name);if(!n)return '';try{for(const [k,v] of Object.entries(PROJ_HE)){const m=norm(v);if(m&&(n===m||n.includes(m)||m.includes(n)))return k}}catch(x){}return ''}
function srcOf(k,m,u){
 if(u){if(u.ai||/^ai:/.test(u.src||'')||/^(ChatGPT Image|DALL|AI · )/i.test(u.name||''))return 'ai';if(/^topic\//.test(u.src||''))return 'topic';if(u.cms||/^(website:|projects\/)/.test(u.src||''))return 'site';return 'up'}
 if(m&&/AI/.test(m.t||''))return 'ai';
 if(/^n\d+$/.test(k))return 'builtin';
 return 'site'}
function inventory(){
 const byUrl=new Map();
 let keys=[];try{keys=Object.keys(PHOTO_LIB)}catch(x){}
 for(const k of keys){let m={};try{m=metaOf(k)||{}}catch(x){}
  if(m.dup)continue;const url=PHOTO_LIB[k];if(!url||typeof url!=='string')continue;
  const u=k.startsWith('u_')?(KC.up||{})[k.slice(2)]:null;
  const it={k,url,name:(u&&u.name)||m.n||k,proj:(u?u.project:m.p)||'',kind:(u?u.kind:m.k)||'',src:srcOf(k,m,u),u,id:u?k.slice(2):null,w:u&&u.w,h:u&&u.h,at:(u&&u.addedAt)||'',from:(u&&u.src)||''};
  const prev=byUrl.get(url);if(!prev||(it.u&&!prev.u))byUrl.set(url,it)}
 return [...byUrl.values()]}
// a website photo counts as "in the system" when a saved photo points back to it
function haveSet(inv){const s=new Set();const all=inv.map(i=>({from:i.from,name:i.name}));try{Object.values(KC.up||{}).forEach(m=>all.push({from:m.src||'',name:m.name||''}))}catch(x){}for(const it of all){const f=it.from||'';if(f){s.add(f);const m=f.match(/^website:logo-(\d+)$/);if(m)s.add('website:public/logos/'+m[1]+'.png');const b=f.split('/').pop();if(b)s.add('b:'+b.replace(/\.[^.]+$/,''))}
  const n=(it.name||'').match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/);if(n)s.add('b:'+n[0])}return s}
function catalog(){const live=S.live||[];const seen=new Set(CAT.map(c=>c.p));return CAT.concat(live.filter(c=>!seen.has(c.p)))}
function catKey(c){return c.s==='file'?'website:public/'+c.p:c.p}
function catUrl(c){return c.s==='file'?SITE_ORIGIN+'/'+c.p.split('/').map(encodeURIComponent).join('/'):MEDIA+c.p}
function missing(inv){const h=haveSet(inv);return catalog().filter(c=>!h.has(catKey(c))&&!h.has('b:'+c.p.split('/').pop().replace(/\.[^.]+$/,'')))}
function usage(){if(S.use&&Date.now()-S.useAt<30000)return S.use;const m=new Map();try{for(const p of AG.posts){let ks=[];try{ks=imgKeysOf(p)}catch(x){}for(const k of new Set(ks))m.set(k,(m.get(k)||0)+1)}}catch(x){}S.use=m;S.useAt=Date.now();return m}

// ---------- the site list stays fresh on the site: read what the site pages point to ----------
async function refreshLive(){if(window.__ENGINE_HOST!=='site'||Date.now()-S.liveAt<300000)return;S.liveAt=Date.now();
 try{const tok=window.__engineBridge&&await window.__engineBridge.token();const H={apikey:PUBKEY,Authorization:'Bearer '+(tok||PUBKEY)};
  const get=t=>fetch(SUPA+'/rest/v1/'+t+'?select=*',{headers:H}).then(r=>r.ok?r.json():[]).catch(()=>[]);
  const [pr,lg,st]=await Promise.all([get('projects'),get('site_logos'),get('site_settings')]);const out=[];const re=/storage\/v1\/object\/public\/media\/([^"\\?]+?\.(?:webp|jpe?g|png|avif))/gi;
  const scan=(rows,sec,label)=>rows.forEach(r=>{const j=JSON.stringify(r);let m;re.lastIndex=0;while((m=re.exec(j)))out.push({p:m[1],g:label(r),s:sec,l:1,kb:0})});
  scan(pr,'proj',r=>r.name||r.slug||'פרויקט');scan(lg,'logo',r=>r.name||'לוגו');scan(st,'page',r=>r.key||'עמודי האתר');
  if(out.length){S.live=out;if(APP.view==='photos')render()}}catch(x){}}

// ---------- page ----------
const SECN={proj:'פרויקטים',logo:'לוגואים',page:'עמודי האתר',file:'קבצים באתר'};
function tile(it,use){const n=use.get(it.k)||0;const sel=S.sel.has(it.k);
 return `<button type="button" class="v144t${S.selMode?' v148sel':''}${sel?' on':''}${BROKEN.has(it.k)?' v148bad':''}" data-v144="${S.selMode?'pick':'open'}" data-k="${e(it.k)}" aria-label="${e(it.name)}"${S.selMode?` aria-pressed="${sel}"`:''}><span class="v144im">${S.selMode?`<i class="v148box" aria-hidden="true">${sel?'✓':''}</i>`:''}<img src="${e(it.url)}" alt="" loading="lazy" decoding="async" data-v148k="${e(it.k)}"></span><span class="v144nm">${e(it.name)}</span><span class="v144meta"><i class="v144b v144b-${it.src}">${SRC[it.src]}</i>${n?`<i class="v144u">${n} פוסטים</i>`:'<i class="v144u v144u0">לא בשימוש</i>'}</span></button>`}
function mtile(c){return `<div class="v144t v144m"><span class="v144im"><img src="${e(catUrl(c))}" alt="" loading="lazy" decoding="async" onerror="this.parentNode.classList.add('v144noimg')"></span><span class="v144nm">${e(c.g)}${c.e?' · סביבה':''}</span><span class="v144meta">${c.l?'<i class="v144b v144b-missing">מופיעה באתר</i>':'<i class="v144b">באחסון בלבד</i>'}<button type="button" class="px-btn sm" data-v144="imp" data-p="${e(c.p)}">ייבוא</button></span></div>`}
function groupBy(list,f){const m=new Map();for(const x of list){const g=f(x);if(!m.has(g))m.set(g,[]);m.get(g).push(x)}return [...m.entries()]}
function vPhotos(){
 const inv=inventory(),use=usage(),miss=missing(inv);
 const cnt={all:inv.length,missing:miss.length};Object.keys(SRC).forEach(k=>{if(k!=='missing')cnt[k]=inv.filter(i=>i.src===k).length});
 const unused=inv.filter(i=>!use.get(i.k)).length,noProj=inv.filter(i=>!i.proj&&i.src!=='builtin').length;
 const q=norm(S.q);
 const head=`<div class="v144sum">
  <button type="button" data-v144="src" data-k="all" class="${S.src==='all'?'on':''}"><b>${cnt.all}</b><span>תמונות במערכת</span></button>
  <button type="button" data-v144="src" data-k="missing" class="v144warn ${S.src==='missing'?'on':''}"><b>${cnt.missing}</b><span>באתר ועוד לא במערכת</span></button>
  <button type="button" data-v144="src" data-k="up" class="${S.src==='up'?'on':''}"><b>${cnt.up}</b><span>העליתם בעצמכם</span></button>
  <button type="button" data-v144="src" data-k="unused" class="${S.src==='unused'?'on':''}"><b>${unused}</b><span>עוד לא בשום פוסט</span></button>
 </div>
 <div class="v144bar"><div class="v144chips" role="tablist" aria-label="מקור">${[['all','הכול'],...Object.entries(SRC)].map(([k,t])=>`<button type="button" role="tab" data-v144="src" data-k="${k}" aria-selected="${S.src===k}">${t}<span class="cnt">${k==='all'?cnt.all:cnt[k]}</span></button>`).join('')}${S.src==='unused'?`<button type="button" role="tab" data-v144="src" data-k="unused" aria-selected="true">לא בשימוש<span class="cnt">${unused}</span></button>`:''}<button type="button" role="tab" data-v144="src" data-k="broken" aria-selected="${S.src==='broken'}" ${BROKEN.size||S.src==='broken'?'':'hidden'} id="v148brk">לא נטענות<span class="cnt">${BROKEN.size}</span></button><button type="button" role="tab" data-v144="src" data-k="hidden" aria-selected="${S.src==='hidden'}">הוסרו<span class="cnt">${HID.size}</span></button></div>
  <div class="v144tools"><label class="v144q">${ico('search',15)}<input type="search" data-v144q placeholder="חיפוש לפי שם או פרויקט" value="${e(S.q)}" aria-label="חיפוש תמונה"></label>
  ${S.src==='missing'?'':`<select data-v144="group" aria-label="סידור"><option value="proj"${S.group==='proj'?' selected':''}>לפי פרויקט</option><option value="src"${S.group==='src'?' selected':''}>לפי מקור</option><option value="new"${S.group==='new'?' selected':''}>החדשות קודם</option></select>`}
  ${S.src==='missing'||S.src==='hidden'?'':`<button type="button" class="px-btn sm${S.selMode?' pri':''}" data-v144="selmode" aria-pressed="${S.selMode}">${S.selMode?'סיום בחירה':'בחירת כמה תמונות'}</button>`}
  <label class="px-btn sm pri v144upl">${ico('plus',15)} העלאת תמונות<input type="file" accept="image/*" multiple data-v144up hidden></label></div></div>
 ${S.busy?`<div class="v144busy" role="status">${e(S.busy)}</div>`:''}`;
 let body='';
 if(S.src==='missing'){
  const list=miss.filter(c=>!q||norm(c.g+' '+c.p).includes(q));const onSite=list.filter(c=>c.l),store=list.filter(c=>!c.l);
  body=list.length?`<p class="v144lead">${onSite.length?`${onSite.length} תמונות מופיעות באתר ועוד לא נמצאות במערכת.`:'כל התמונות שמופיעות באתר כבר נמצאות במערכת.'} ${store.length?`עוד ${store.length} שמורות באחסון של האתר אבל לא מוצגות באף עמוד.`:''} רשימת האתר מ-${CAT_AT}${S.live?' ומתעדכנת מהאתר':''}.</p>
   ${onSite.length?`<div class="v144act"><button type="button" class="px-btn pri" data-v144="impall" ${S.busy?'disabled':''}>ייבוא כל ${onSite.length} התמונות שמופיעות באתר</button></div>`:''}
   ${[['מופיעות באתר',onSite],['באחסון של האתר בלבד',store]].filter(x=>x[1].length).map(([t,l])=>`<h3 class="v144h2">${t}</h3>`+groupBy(l,c=>SECN[c.s]+' · '+c.g).map(([g,xs])=>`<section class="v144g"><header><h4>${e(g)}<span>${xs.length}</span></h4>${xs.length>1?`<button type="button" class="px-btn sm ghost" data-v144="impgrp" data-ps="${e(xs.map(c=>c.p).join('|'))}">ייבוא הקבוצה</button>`:''}</header><div class="v144grid">${xs.map(mtile).join('')}</div></section>`).join('')).join('')}`
   :`<div class="v144empty"><b>אין תמונות חסרות</b><span>כל התמונות שבאתר כבר נמצאות במערכת.</span></div>`}
 else if(S.src==='hidden'){
  const hl=[...HID].map(k=>{const url=SHADOW[k]||'';let m={};try{m=metaOf(k)||{}}catch(x){}const u=k.startsWith('u_')?(KC.up||{})[k.slice(2)]:null;return {k,url,name:(u&&u.name)||m.n||k,n:use.get(k)||0}}).filter(x=>x.url);
  body=hl.length?`<p class="v144lead">תמונות שהוסרו מהגלריה. הן לא מופיעות בבחירת תמונות ולא נבחרות אוטומטית לפוסטים. פוסטים שכבר משתמשים בהן ממשיכים להציג אותן.</p><div class="v144act"><button type="button" class="px-btn sm" data-v144="unhideall">החזרת כולן לגלריה</button></div><div class="v144grid">${hl.map(x=>`<div class="v144t v144m"><span class="v144im"><img src="${e(x.url)}" alt="" loading="lazy" decoding="async"></span><span class="v144nm">${e(x.name)}</span><span class="v144meta">${x.n?`<i class="v144u">${x.n} פוסטים</i>`:''}<button type="button" class="px-btn sm" data-v144="unhide" data-k="${e(x.k)}">החזרה לגלריה</button></span></div>`).join('')}</div>`
   :`<div class="v144empty"><b>לא הוסרו תמונות</b><span>פותחים תמונה ולוחצים "הסרה מהגלריה", או בוחרים כמה תמונות יחד.</span></div>`}
 else{
  let list=inv;if(S.src==='broken')list=inv.filter(i=>BROKEN.has(i.k));else if(S.src==='unused')list=inv.filter(i=>!use.get(i.k));else if(S.src!=='all')list=inv.filter(i=>i.src===S.src);
  if(q)list=list.filter(i=>norm(i.name+' '+projName(i.proj)+' '+i.from).includes(q));
  let groups;
  if(S.group==='src')groups=groupBy(list,i=>SRC[i.src]);
  else if(S.group==='new')groups=[['החדשות קודם',list.slice().sort((a,b)=>String(b.at).localeCompare(String(a.at)))]];
  else{groups=groupBy(list,i=>i.proj?projName(i.proj):(i.src==='builtin'?'צילומי שטח ורחפן':'בלי פרויקט'));groups.sort((a,b)=>(a[0]==='בלי פרויקט')-(b[0]==='בלי פרויקט')||b[1].length-a[1].length)}
  body=list.length?(S.src!=='all'&&S.src!=='unused'?`<p class="v144lead">${SRC_HINT[S.src]}.</p>`:S.src==='all'&&noProj?`<p class="v144lead">${noProj} תמונות עוד בלי שיוך לפרויקט. פותחים תמונה ובוחרים לה פרויקט.</p>`:'')+groups.map(([g,xs])=>`<section class="v144g"><header><h4>${e(g)}<span>${xs.length}</span></h4></header><div class="v144grid">${xs.map(i=>tile(i,use)).join('')}</div></section>`).join('')
   :`<div class="v144empty"><b>${S.q?'לא נמצאו תמונות':'אין כאן תמונות עדיין'}</b><span>${S.q?'נסו מילה אחרת':S.src==='up'?'מעלים מהמחשב או מהטלפון עם "העלאת תמונות"':'בוחרים מקור אחר למעלה'}</span></div>`}
 const selBar=S.selMode?`<div class="v148bar" role="region" aria-label="פעולות על הבחירה"><b>${S.sel.size} נבחרו</b><button type="button" class="px-btn sm" data-v144="selall">בחירת כל המוצגות</button><select data-v144="selproj" aria-label="שיוך לפרויקט" ${S.sel.size?'':'disabled'}><option value="">שיוך לפרויקט…</option>${(()=>{try{return Object.entries(PROJ_HE).map(([k,v])=>`<option value="${k}">${e(v)}</option>`).join('')}catch(x){return ''}})()}</select><button type="button" class="px-btn sm v144del" data-v144="hidesel" ${S.sel.size?'':'disabled'}>הסרה מהגלריה</button><button type="button" class="px-btn sm ghost" data-v144="selmode">ביטול</button></div>`:'';
 return `<div class="v144${S.selMode?' v148selon':''}">${head}${body}</div>${selBar}${lbHtml(inv,use)}`}

function lbHtml(inv,use){if(!S.lb)return '';const it=inv.find(i=>i.k===S.lb);if(!it)return '';const n=use.get(it.k)||0;
 let projs=[];try{projs=Object.entries(PROJ_HE)}catch(x){}
 return `<div class="v144lb" role="dialog" aria-modal="true" aria-label="${e(it.name)}"><div class="v144lbin">
  <button type="button" class="v144x" data-v144="close" aria-label="סגירה">${ico('x',20)}</button>
  <div class="v144big"><img src="${e(it.url)}" alt="${e(it.name)}"></div>
  <div class="v144info"><h3>${e(it.name)}</h3>
   <dl><dt>מקור</dt><dd>${SRC[it.src]}${it.from&&/^(website:|projects\/)/.test(it.from)?' · '+e(it.from.replace(/^website:/,'').split('/').slice(0,2).join('/')):''}</dd>
   ${it.w?`<dt>גודל</dt><dd>${it.w}×${it.h}${Math.max(it.w,it.h)<900?' · <b class="v144low">רזולוציה נמוכה לפוסט</b>':''}</dd>`:''}
   <dt>בשימוש</dt><dd>${n?n+' פוסטים':'עוד לא בשום פוסט'}</dd>
   ${it.at?`<dt>נוספה</dt><dd>${e(String(it.at).slice(0,10).split('-').reverse().join('.'))}</dd>`:''}</dl>
   ${it.u?`<label class="v144f"><span>שם</span><input type="text" data-v144="name" data-id="${e(it.id)}" value="${e(it.name)}" maxlength="60"></label>`:''}
   ${it.u?`<label class="v144f"><span>פרויקט</span><select data-v144="proj" data-id="${e(it.id)}"><option value="">בלי פרויקט</option>${projs.map(([k,v])=>`<option value="${k}"${it.proj===k?' selected':''}>${e(v)}</option>`).join('')}</select></label>`:`<p class="v144note">${it.proj?'פרויקט: '+e(projName(it.proj))+'. ':''}תמונה מובנית במערכת. אפשר להסיר אותה מהגלריה, ולהחזיר בכל רגע.</p>`}
   <div class="v144lbact"><a class="px-btn sm" href="${e(it.url)}" target="_blank" rel="noopener">פתיחה בגודל מלא</a><button type="button" class="px-btn sm v144del" data-v144="hide1" data-k="${e(it.k)}">הסרה מהגלריה</button>${it.u&&!n?`<button type="button" class="px-btn sm ghost v144del" data-v144="del" data-id="${e(it.id)}">מחיקה לצמיתות</button>`:''}</div>
   ${n?`<p class="v144note">התמונה בשימוש ב-${n} פוסטים. אחרי ההסרה הם ממשיכים להציג אותה, והיא לא תיבחר יותר לפוסטים חדשים.</p>`:''}
  </div></div></div>`}

// ---------- actions ----------
async function importOne(c){
 const r=await fetch(catUrl(c));if(!r.ok)throw new Error('http '+r.status);const b=await r.blob();
 const f=new File([b],c.p.split('/').pop(),{type:b.type||'image/jpeg'});const {blob,w,h}=await downscale(f);
 const up=await KC.assets.upload(blob);
 const proj=c.s==='proj'?projKeyOf(c.g):'';
 const meta={name:(c.s==='proj'?c.g+(c.e?' · סביבה':''):c.s==='logo'?'לוגו · '+c.g:c.g).slice(0,60),project:proj,kind:c.s==='logo'?'brand':c.e?'env':c.s==='proj'?'site':'site',tags:c.s==='proj'?'cms':'website',w,h,addedAt:new Date().toISOString(),url:up.url,src:catKey(c),cms:c.s==='file'?undefined:1};
 Object.keys(meta).forEach(k=>meta[k]===undefined&&delete meta[k]);
 if(KC.db)await KC.db.collection('photos').doc(up.id).set(meta);regUpload(up.id,meta)}
async function importMany(list){
 if(!KC.assets){tst('הייבוא זמין רק עם הרשאת עריכה');return}
 if(S.busy)return;let ok=0,bad=0,blocked=false;
 for(const c of list){S.busy=`מייבא ${ok+bad+1} מתוך ${list.length}…`;render();
  try{await importOne(c);ok++}catch(x){bad++;if(x instanceof TypeError){blocked=true;break}
   const code=x&&x.code;if(code==='quota_or_state'){tst('נגמר המקום בספרייה');break}}}
 S.busy='';S.useAt=0;render();
 if(blocked&&!ok)tst(window.__ENGINE_HOST==='site'?'לא הצלחנו להגיע לתמונות של האתר. נסו שוב':'כאן ב-claude.ai אין גישה לאתר. הייבוא עובד במערכת שבאתר: ניהול > מנוע התוכן');
 else tst(ok?`${ok} תמונות נכנסו למערכת${bad?`, ${bad} לא נכנסו`:''}`:'לא יובאו תמונות')}
async function uploadMine(files){
 if(!KC.assets){tst('העלאה זמינה רק עם הרשאת עריכה');return}
 const list=[...files].filter(f=>/^image\//.test(f.type)).slice(0,40);if(!list.length)return;let ok=0;
 for(const f of list){S.busy=`מעלה ${ok+1} מתוך ${list.length}…`;render();
  try{const {blob,w,h}=await downscale(f);const r=await KC.assets.upload(blob);const meta={name:f.name.replace(/\.[^.]+$/,'').slice(0,60),project:'',kind:'site',tags:'',w,h,addedAt:new Date().toISOString(),url:r.url};
   if(KC.db)await KC.db.collection('photos').doc(r.id).set(meta);regUpload(r.id,meta);ok++}
  catch(x){const c=x&&x.code;tst(c==='too_large'?'קובץ גדול מדי':c==='quota_or_state'?'נגמר המקום בספרייה':'ההעלאה נכשלה');break}}
 S.busy='';S.src='up';S.group='new';save();render();if(ok)tst(`${ok} תמונות נוספו. אפשר לפתוח כל אחת ולשייך לפרויקט`)}
async function setProj(id,proj){const m=(KC.up||{})[id];if(!m)return;m.project=proj;try{if(KC.db)await KC.db.collection('photos').doc(id).update({project:proj})}catch(x){try{await KC.db.collection('photos').doc(id).set(m)}catch(y){tst('השמירה נכשלה');return}}
 S.useAt=0;render();tst(proj?'שויך ל'+projName(proj):'השיוך הוסר')}
async function setName(id,name){const m=(KC.up||{})[id];if(!m)return;const v=String(name||'').trim().slice(0,60);if(!v||v===m.name)return;m.name=v;try{LIB_NAMES['u_'+id]=v}catch(x){}
 try{if(KC.db)await KC.db.collection('photos').doc(id).update({name:v})}catch(x){try{await KC.db.collection('photos').doc(id).set(m)}catch(y){tst('השמירה נכשלה');return}}tst('השם נשמר')}
async function del(id){const key='u_'+id;if(!confirmDel(key))return;try{if(KC.db)await KC.db.collection('photos').doc(id).delete();if(KC.assets)await KC.assets.delete(id)}catch(x){}
 delete KC.up[id];delete PHOTO_LIB[key];S.lb=null;render();tst('התמונה נמחקה מהמערכת')}

document.addEventListener('click',ev=>{const b=ev.target.closest&&ev.target.closest('[data-v144]');if(!b||APP.view!=='photos')return;const a=b.dataset.v144;
 if(b.tagName==='SELECT')return;
 if(a==='src'){S.src=b.dataset.k;S.lb=null;save();render();const m=document.getElementById('appmain');if(m&&m.scrollTop>200)m.scrollTop=0}
 else if(a==='open'){S.lb=b.dataset.k;render()}
 else if(a==='close'){S.lb=null;render()}
 else if(a==='del')del(b.dataset.id);
 else if(a==='hide1'){const k=b.dataset.k;S.lb=null;hide([k])}
 else if(a==='unhide')unhide([b.dataset.k]);
 else if(a==='unhideall')unhide([...HID]);
 else if(a==='selmode'){S.selMode=!S.selMode;S.sel.clear();S.lb=null;render()}
 else if(a==='pick'){const k=b.dataset.k;if(S.sel.has(k))S.sel.delete(k);else S.sel.add(k);const on=S.sel.has(k);b.classList.toggle('on',on);b.setAttribute('aria-pressed',on);const bx=b.querySelector('.v148box');if(bx)bx.textContent=on?'✓':'';const bar=document.querySelector('.v148bar b');if(bar)bar.textContent=S.sel.size+' נבחרו';document.querySelectorAll('.v148bar [data-v144="hidesel"],.v148bar select').forEach(x=>x.disabled=!S.sel.size)}
 else if(a==='selall'){document.querySelectorAll('.v144grid [data-v144="pick"]').forEach(x=>S.sel.add(x.dataset.k));render()}
 else if(a==='hidesel'){hide([...S.sel]);S.selMode=false}
 else if(a==='imp'){const c=catalog().find(x=>x.p===b.dataset.p);if(c)importMany([c])}
 else if(a==='impgrp'){const ps=new Set(b.dataset.ps.split('|'));importMany(catalog().filter(c=>ps.has(c.p)))}
 else if(a==='impall'){importMany(missing(inventory()).filter(c=>c.l))}});
document.addEventListener('click',ev=>{if(APP.view==='photos'&&S.lb&&ev.target.classList&&ev.target.classList.contains('v144lb')){S.lb=null;render()}});
document.addEventListener('change',ev=>{const t=ev.target;if(APP.view!=='photos')return;
 if(t.matches&&t.matches('[data-v144up]')){uploadMine(t.files);t.value=''}
 else if(t.dataset&&t.dataset.v144==='group'){S.group=t.value;save();render()}
 else if(t.dataset&&t.dataset.v144==='proj')setProj(t.dataset.id,t.value);
 else if(t.dataset&&t.dataset.v144==='name')setName(t.dataset.id,t.value);
 else if(t.dataset&&t.dataset.v144==='selproj'&&t.value){const pk=t.value;const ids=[...S.sel].filter(k=>k.startsWith('u_')).map(k=>k.slice(2));const skip=S.sel.size-ids.length;(async()=>{for(const id of ids){const m=(KC.up||{})[id];if(!m)continue;m.project=pk;try{await KC.db.collection('photos').doc(id).update({project:pk})}catch(x){try{await KC.db.collection('photos').doc(id).set(m)}catch(y){}}}S.sel.clear();S.useAt=0;render();tst(`${ids.length} תמונות שויכו ל${projName(pk)}${skip?`. ${skip} מובנות במערכת נשארו כמו שהן`:''}`)})()}});
// photos that do not load get counted, so they are easy to find and remove
document.addEventListener('error',ev=>{const t=ev.target;if(!t||t.tagName!=='IMG'||!t.dataset||!t.dataset.v148k)return;const k=t.dataset.v148k;if(BROKEN.has(k))return;BROKEN.add(k);const tl=t.closest('.v144t');if(tl)tl.classList.add('v148bad');const c=document.getElementById('v148brk');if(c){c.hidden=false;const n=c.querySelector('.cnt');if(n)n.textContent=BROKEN.size}},true);
let qt=0;document.addEventListener('input',ev=>{const t=ev.target;if(!t.matches||!t.matches('[data-v144q]'))return;clearTimeout(qt);qt=setTimeout(()=>{S.q=t.value;const pos=t.selectionStart;render();const n=document.querySelector('[data-v144q]');if(n){n.focus();try{n.setSelectionRange(pos,pos)}catch(x){}}},220)});
document.addEventListener('keydown',ev=>{if(ev.key==='Escape'&&APP.view==='photos'&&S.lb){ev.stopImmediatePropagation();S.lb=null;render()}},true);

// ---------- register the view ----------
VIEWS[1][1].splice(1,0,['photos','גלריית התמונות','img']);
VTITLE.photos=['גלריית התמונות','כל התמונות שלנו במקום אחד: מוסיפים, עורכים, מסירים ומחזירים'];
render=(f=>function(){if(APP.view!=='photos')return f.apply(this,arguments);renderNav();const [t,s]=VTITLE.photos;document.getElementById('vt').textContent=t;document.getElementById('vs').textContent=s;
 document.querySelectorAll('.wrap > section').forEach(sec=>sec.classList.add('view-hidden'));const act=document.getElementById('vact');if(act)act.innerHTML='';
 const box=document.getElementById('appviews');box.innerHTML=vPhotos();refreshLive()})(render);
counts=(f=>function(){const c=f.apply(this,arguments);try{const n=missing(inventory()).filter(x=>x.l).length;if(n)c.photos=n}catch(x){}return c})(counts);
window.__v144={inventory,missing,catalog,S,importMany};
})();
