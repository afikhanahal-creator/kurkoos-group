// ================= V179 · Meta Ads library: the ads every competitor runs in the Meta Ad Library, written by the daily scan agent
// (collections meta_ads, meta_scans, meta_favorites and the meta_pages / meta_summary fields on competitors). Three places:
// a block inside every competitor card, one central library with filters, a scan status panel, and the key flow
// "צור גרסה למותג שלנו": an original post for Kurkoos or Afik HaNahal, analysed from the competitor's ad, opened in the editor
// with the source beside it. Everything shown comes from the database; days on air are computed, never stored.
(()=>{
if(window.__v179)return;window.__v179=1;
const E=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const I=(n,s)=>{try{return ico(n,s||16)}catch(e){return ''}};
const DAY=864e5,WEEK=7*DAY;
const SV={star:'<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true"><path d="M12 3.2l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17.2l-5.4 2.9 1-6.1L3.2 9.7l6.1-.9z"/></svg>',
 starO:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M12 3.2l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17.2l-5.4 2.9 1-6.1L3.2 9.7l6.1-.9z"/></svg>',
 ext:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/></svg>',
 grid:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="3" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5"/></svg>',
 list:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>',
 chev:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>',
 search:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
 bm:'<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M6 3.5h12v17l-6-4.2-6 4.2z"/></svg>',
 bmO:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M6 3.5h12v17l-6-4.2-6 4.2z"/></svg>',
 info:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>'};

/* ---------- state ---------- */
const lsg=(k,d)=>{try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}},lss=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
const M={ads:new Map(),scans:[],favs:new Map(),loaded:{ads:false,scans:false,favs:false},byComp:new Map(),groups:new Map(),sim:new Map(),
 open:new Set(),exp:new Set(),cf:{},lib:{q:'',comp:'',bucket:'',star:false,fresh:false,gone:false,group:false,fav:false,sort:'days',mode:lsg('v179_mode','cards'),n:50,tab:'ads'},gen:null,srcOpen:null};
window.APP&&(APP.metaAds=M.ads,APP.metaScans=M.scans,APP.metaFavs=M.favs);

/* ---------- time, days, buckets ---------- */
const TZ='Asia/Jerusalem';
const fD=new Intl.DateTimeFormat('he-IL',{timeZone:TZ,day:'2-digit',month:'2-digit',year:'numeric'}),fT=new Intl.DateTimeFormat('he-IL',{timeZone:TZ,day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
const dateOf=v=>{if(v==null||v==='')return null;if(typeof v==='number')return new Date(v<1e12?v*1000:v);const n=Date.parse(v);return isNaN(n)?null:new Date(n)};
const fmtD=v=>{const d=dateOf(v);return d?fD.format(d):''};const fmtT=v=>{const d=dateOf(v);return d?fT.format(d).replace(',',' ·'):''};
function scanTime(id){const m=/^scan_(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})$/.exec(String(id||''));return m?`${m[3]}.${m[2]}.${m[1]} · ${m[4]}:${m[5]}`:''}
function scanLabel(id){const s=M.scans.find(x=>x.id===id);if(s)return fmtT(s.finished||s.started);return scanTime(id)||String(id||'')}
const daysOf=a=>{const d=dateOf(a.start||a.created);if(!d)return null;return Math.max(0,Math.floor((Date.now()-d.getTime())/DAY))};
const isGone=a=>a.status==='inactive';const isNew=a=>{const d=dateOf(a.first_seen);return !!d&&Date.now()-d.getTime()<=WEEK};
const isStar=a=>!isGone(a)&&(daysOf(a)||0)>=60;
function bucket(a){if(isGone(a))return 5;if(isNew(a))return 4;const d=daysOf(a)||0;return d>=60?1:d>=30?2:3}
const BK={1:'60 יום ומעלה',2:'30 עד 59 יום',3:'1 עד 29 יום',4:'חדשות',5:'הפסיקו'};
function order(list){return list.slice().sort((a,b)=>bucket(a)-bucket(b)||(daysOf(b)||0)-(daysOf(a)||0)||String(a.id).localeCompare(String(b.id)))}
const isFav=a=>M.favs.has(String(a.id));
const libUrl=pid=>`https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=IL&view_all_page_id=${encodeURIComponent(pid)}`;
const libSearch=q=>`https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=IL&q=${encodeURIComponent(q)}&search_type=keyword_unordered`;
const safeUrl=u=>{try{const x=new URL(String(u||''));return /^https?:$/.test(x.protocol)?x.href:''}catch(e){return ''}};

/* ---------- indexes: per competitor, exact groups, similar messages ---------- */
const words=t=>new Set(String(t||'').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu,' ').split(/\s+/).filter(w=>w.length>1));
function reindex(){M.byComp=new Map();M.groups=new Map();M.sim=new Map();
 M.ads.forEach(a=>{const cid=String(a.comp_id||'');if(!M.byComp.has(cid))M.byComp.set(cid,[]);M.byComp.get(cid).push(a);
  if(a.group_key){const k=cid+'|'+a.group_key;if(!M.groups.has(k))M.groups.set(k,[]);M.groups.get(k).push(a)}});
 M.byComp.forEach(list=>{if(list.length>400)return;const W=list.map(a=>({a,w:words(a.title),p:a.page_id,g:a.group_key||''}));
  for(let i=0;i<W.length;i++)for(let j=i+1;j<W.length;j++){const x=W[i],y=W[j];if(x.p!==y.p||!x.w.size||!y.w.size||(x.g&&x.g===y.g))continue;
   let inter=0;x.w.forEach(w=>{if(y.w.has(w))inter++});const jac=inter/(x.w.size+y.w.size-inter);if(jac>=.6){M.sim.set(String(x.a.id),(M.sim.get(String(x.a.id))||0)+1);M.sim.set(String(y.a.id),(M.sim.get(String(y.a.id))||0)+1)}}})}
const groupOf=a=>a.group_key?(M.groups.get(String(a.comp_id||'')+'|'+a.group_key)||[a]):[a];
const adsOf=cid=>M.byComp.get(String(cid))||[];
function compsAll(){try{return compList()}catch(e){return Object.values(APP.comps||{})}}
const compOf=cid=>(APP.comps&&APP.comps[cid])||compsAll().find(c=>c.id===cid)||null;

/* ---------- data ---------- */
function rerender(){if(window.__v179rr)return;window.__v179rr=requestAnimationFrame(()=>{window.__v179rr=0;try{if(APP.view==='metaads')render();else if(APP.view==='competitors'){document.querySelectorAll('details[data-v179sec]').forEach(d=>refreshSec(d.dataset.v179sec))}}catch(e){console.warn('v179 render',e)}})}
function subscribe(db){
 db.collection('meta_ads').onSnapshot(s=>{M.ads.clear();s.docs.forEach(d=>{const v=d.data();if(v&&typeof v==='object')M.ads.set(String(d.id),Object.assign({id:d.id},v))});M.loaded.ads=true;reindex();rerender()},()=>{M.loaded.ads=true;rerender()});
 db.collection('meta_scans').onSnapshot(s=>{const l=[];s.docs.forEach(d=>{const v=d.data();if(v)l.push(Object.assign({id:d.id},v))});l.sort((a,b)=>String(b.started||b.id).localeCompare(String(a.started||a.id)));M.scans.splice(0,M.scans.length,...l);M.loaded.scans=true;rerender()},()=>{M.loaded.scans=true;rerender()});
 db.collection('meta_favorites').onSnapshot(s=>{M.favs.clear();s.docs.forEach(d=>{const v=d.data();if(v)M.favs.set(String(d.id),v)});M.loaded.favs=true;rerender()},()=>{M.loaded.favs=true;rerender()})}
let tries=0;const poll=setInterval(()=>{if(typeof APP==='undefined')return;if(APP.db){clearInterval(poll);try{subscribe(APP.db)}catch(e){console.warn('v179 db',e)}}else if(++tries>240)clearInterval(poll)},500);
async function setFav(a,on){const id=String(a.id);if(on)M.favs.set(id,{id,comp_id:a.comp_id,added:new Date().toISOString()});else M.favs.delete(id);
 try{if(APP.db){const r=APP.db.collection('meta_favorites').doc(id);if(on)await r.set(M.favs.get(id));else await r.delete()}}catch(e){toast('המועדף לא נשמר בשרת. נסו שוב')}
 toast(on?'נוסף למועדפים':'הוסר מהמועדפים')}
async function savePages(cid,pages){const c=compOf(cid)||{id:cid};const next=Object.assign({},c,{meta_pages:pages});APP.comps[cid]=next;try{lsSet('app_comps',APP.comps)}catch(e){}
 if(APP.db){const r=APP.db.collection('competitors').doc(cid);try{await r.update({meta_pages:pages})}catch(e){try{await r.set(clean(next))}catch(x){toast('העמודים לא נשמרו בשרת. נסו שוב');return}}}
 refreshSec(cid)}

/* ---------- pieces ---------- */
const pillsOf=(a,opts={})=>{const g=groupOf(a),s=M.sim.get(String(a.id))||0;let h='';
 if(isStar(a))h+=`<span class="v179p star">${SV.star} 60 יום ומעלה</span>`;if(isNew(a))h+=`<span class="v179p new">חדשה</span>`;if(isGone(a))h+=`<span class="v179p gone">הפסיקה${a.gone_at?' · '+E(fmtD(a.gone_at)):''}</span>`;
 if(g.length>1&&!opts.noGroup)h+=`<span class="v179p grp">${g.length} גרסאות</span>`;if(s)h+=`<span class="v179p sim" title="אותו עמוד, לפחות 60% מהמילים משותפות">מסר דומה · ${s}</span>`;return h};
function daysHtml(a){const d=daysOf(a);if(d==null)return `<span class="v179days none">בלי תאריך התחלה</span>`;const pct=Math.min(100,Math.round(d/60*100));
 return `<span class="v179days${isGone(a)?' gone':''}" aria-label="${d} ימים באוויר"><b>${d}</b><small>${d===1?'יום':'ימים'}</small><i class="v179meter" aria-hidden="true"><u style="width:${pct}%"></u></i></span>`}
function card(a,opts={}){const title=String(a.title||'').trim();const g=groupOf(a);const stack=!opts.flat&&g.length>1;const key=String(a.comp_id)+'|'+(a.group_key||'');const ex=stack&&M.exp.has(key);
 const rep=stack?order(g)[0]:a;
 return `<article class="v179ad b${bucket(rep)}${stack?' stack':''}${isGone(rep)?' off':''}" data-v179ad="${E(rep.id)}">
  <div class="v179top"><span class="v179who">${opts.showComp!==false?`<b>${E(rep.comp_name||'')}</b>`:''}<span>${E(rep.page_name||'')}</span></span><button type="button" class="v179fav${isFav(rep)?' on':''}" data-v179="fav" data-id="${E(rep.id)}" aria-pressed="${isFav(rep)}" aria-label="${isFav(rep)?'הסרה מהמועדפים':'הוספה למועדפים'}">${isFav(rep)?SV.bm:SV.bmO}</button></div>
  <h4 class="v179title${title?'':' none'}">${title?E(title):'ללא כותרת'}</h4>
  <div class="v179meta">${daysHtml(rep)}<span class="v179pills">${pillsOf(rep)}</span></div>
  <div class="v179line"><span>${rep.start||rep.created?`מאז ${E(fmtD(rep.start||rep.created))}`:''}</span>${safeUrl(rep.snapshot_url)?`<a class="v179ext" href="${E(safeUrl(rep.snapshot_url))}" target="_blank" rel="noopener">לצפייה במודעה ב-Meta ${SV.ext}</a>`:''}</div>
  <div class="v179acts"><button type="button" class="v179b" data-v179="open" data-id="${E(rep.id)}">פרטים</button>${stack?`<button type="button" class="v179b" data-v179="exp" data-key="${E(key)}" aria-expanded="${ex}">${g.length} גרסאות ${SV.chev}</button>`:''}<button type="button" class="v179b pri" data-v179="brand" data-id="${E(rep.id)}">${I('wand',15)} צור גרסה למותג שלנו</button></div>
  ${stack&&ex?`<ul class="v179vers">${order(g).map(v=>`<li><span class="v179vt">${E(String(v.title||'ללא כותרת'))}</span><span class="v179vd">${daysOf(v)==null?'':daysOf(v)+' ימים'}${isGone(v)?' · הפסיקה':''}${v.start?' · מאז '+E(fmtD(v.start)):''}</span><span class="v179va"><button type="button" class="v179b sm" data-v179="open" data-id="${E(v.id)}">פרטים</button>${safeUrl(v.snapshot_url)?`<a class="v179ext" href="${E(safeUrl(v.snapshot_url))}" target="_blank" rel="noopener">Meta ${SV.ext}</a>`:''}</span></li>`).join('')}</ul>`:''}
 </article>`}
function row(a,opts={}){const title=String(a.title||'').trim();const d=daysOf(a);const g=groupOf(a);
 return `<div class="v179row b${bucket(a)}${isGone(a)?' off':''}" data-v179ad="${E(a.id)}">
  <button type="button" class="v179rt" data-v179="open" data-id="${E(a.id)}"><span class="v179title${title?'':' none'}">${title?E(title):'ללא כותרת'}</span>${opts.showComp!==false?`<small>${E(a.comp_name||'')} · ${E(a.page_name||'')}</small>`:`<small>${E(a.page_name||'')}</small>`}</button>
  <span class="v179rd">${d==null?'':`<b>${d}</b> ${d===1?'יום':'ימים'}`}</span>
  <span class="v179rp">${pillsOf(a,{noGroup:g.length<2})}</span>
  <span class="v179rs">${a.start||a.created?E(fmtD(a.start||a.created)):''}</span>
  <span class="v179ra"><button type="button" class="v179fav${isFav(a)?' on':''}" data-v179="fav" data-id="${E(a.id)}" aria-pressed="${isFav(a)}" aria-label="${isFav(a)?'הסרה מהמועדפים':'הוספה למועדפים'}">${isFav(a)?SV.bm:SV.bmO}</button>${safeUrl(a.snapshot_url)?`<a class="v179ib" href="${E(safeUrl(a.snapshot_url))}" target="_blank" rel="noopener" aria-label="לצפייה במודעה ב-Meta">${SV.ext}</a>`:''}<button type="button" class="v179ib" data-v179="brand" data-id="${E(a.id)}" aria-label="צור גרסה למותג שלנו">${I('wand',16)}</button></span></div>`}
function dedupeStacks(list){const seen=new Set();return list.filter(a=>{if(!a.group_key)return true;const k=String(a.comp_id)+'|'+a.group_key;if(seen.has(k))return false;seen.add(k);return true})}
const chip=(k,l,n,on,attr)=>`<button type="button" class="v179chip" ${attr} data-k="${k}" aria-pressed="${on}">${l}${n!=null?`<b>${n}</b>`:''}</button>`;
function modeSeg(cur,attr){return `<div class="v179seg" role="group" aria-label="תצוגה"><button type="button" ${attr} data-m="cards" aria-pressed="${cur==='cards'}">${SV.grid}<span>גלריה</span></button><button type="button" ${attr} data-m="list" aria-pressed="${cur==='list'}">${SV.list}<span>רשימה</span></button></div>`}
function skeleton(n){return `<div class="v179skel" aria-busy="true" aria-label="טוען מודעות">${Array.from({length:n},()=>'<div><i style="width:40%"></i><i style="width:90%"></i><i style="width:70%"></i><i style="width:55%"></i></div>').join('')}</div>`}

/* ---------- A. the block inside every competitor card ---------- */
function cfOf(cid){return M.cf[cid]||(M.cf[cid]={f:'all',mode:lsg('v179_mode','cards'),n:20,add:false})}
function filterAds(list,f){return list.filter(a=>f==='all'?true:f==='star'?isStar(a):f==='fav'?isFav(a):f==='gone'?isGone(a):f==='new'?isNew(a)&&!isGone(a):f==='b1'?!isGone(a)&&(daysOf(a)||0)>=60:f==='b2'?!isGone(a)&&(daysOf(a)||0)>=30&&(daysOf(a)||0)<60:f==='b3'?!isGone(a)&&(daysOf(a)||0)<30:true)}
function pagesHtml(c){const pages=Array.isArray(c.meta_pages)?c.meta_pages:[];const cf=cfOf(c.id);
 const rows=pages.map((p,i)=>`<li class="v179pg"><label class="v179sw"><input type="checkbox" role="switch" data-v179pg="${E(c.id)}" data-i="${i}" ${p.confirmed?'checked':''}><span class="v179swk" aria-hidden="true"></span><span class="v179swl">נסרק</span></label><span class="v179pgn"><b>${E(p.page_name||'עמוד ללא שם')}</b><small dir="ltr">${E(p.page_id||'')}</small></span>${p.uncertain?`<span class="v179p warn">לא בטוח</span>`:''}${p.source==='owner'?`<span class="v179p muted">נוסף ידנית</span>`:''}${p.confirmed&&p.page_id?`<a class="v179ext" href="${libUrl(p.page_id)}" target="_blank" rel="noopener">לעמוד בספריית Meta ${SV.ext}</a>`:''}${p.source==='owner'?`<button type="button" class="v179ib" data-v179="pgdel" data-cid="${E(c.id)}" data-i="${i}" aria-label="הסרת העמוד">${I('trash',15)}</button>`:''}</li>`).join('');
 const form=cf.add?`<form class="v179form" data-v179form="${E(c.id)}"><label>מספר העמוד<input name="pid" inputmode="numeric" pattern="[0-9]{5,25}" required placeholder="למשל 104329812345678" dir="ltr"></label><label>שם העמוד<input name="pname" placeholder="כמו שמופיע בספרייה"></label><div class="v179fa"><button type="submit" class="v179b pri">שמירת העמוד</button><button type="button" class="v179b" data-v179="pgcancel" data-cid="${E(c.id)}">ביטול</button></div><p class="v179help">את מספר העמוד מוצאים בכתובת של ספריית Meta, אחרי <code dir="ltr">view_all_page_id=</code>. אחרי השמירה הסריקה הבאה תכלול אותו.</p></form>`:'';
 if(!pages.length&&!cf.add)return `<div class="v179empty"><b>עדיין לא נבחר עמוד לסריקה</b><p>הסריקה היומית עוברת רק על עמודים שאושרו כאן. מחפשים את ${E(c.name)} בספרייה, מעתיקים את מספר העמוד ומוסיפים אותו.</p><div class="v179fa"><a class="v179b" href="${libSearch(c.name)}" target="_blank" rel="noopener">חיפוש בספריית Meta ${SV.ext}</a><button type="button" class="v179b pri" data-v179="pgadd" data-cid="${E(c.id)}">${I('plus',15)} הוסף עמוד</button></div></div>`;
 return `<div class="v179pages"><div class="v179h"><b>עמודים בספרייה</b><span>${pages.filter(p=>p.confirmed).length} מתוך ${pages.length} נסרקים</span></div><ul class="v179pgl">${rows}</ul>${form||`<button type="button" class="v179b" data-v179="pgadd" data-cid="${E(c.id)}">${I('plus',15)} הוסף עמוד</button>`}</div>`}
function autoSummary(c,list){const s=c.meta_summary||{};if(!list.length)return `<div class="v179sum"><div class="v179h"><b>סיכום אוטומטי</b></div><p class="v179muted">${s.last_scan?'הסריקה לא מצאה מודעות פעילות לעמודים שאושרו.':'אין עדיין נתונים. הסיכום ייכתב אחרי הסריקה הראשונה.'}</p></div>`;
 const act=list.filter(a=>!isGone(a));const groups=[];const seen=new Set();act.forEach(a=>{if(!a.group_key)return;const k=String(a.comp_id)+'|'+a.group_key;if(seen.has(k))return;seen.add(k);groups.push(M.groups.get(k)||[a])});groups.sort((x,y)=>y.length-x.length);
 const top=groups[0];const longest=act.filter(a=>daysOf(a)!=null).sort((a,b)=>daysOf(b)-daysOf(a)).slice(0,3);const multi=groups.filter(g=>g.length>=2).length;
 const fresh=act.filter(isNew);const freshKeys=new Set(fresh.map(a=>a.group_key||a.id));
 const learn=[...act.filter(isStar).sort((a,b)=>daysOf(b)-daysOf(a)),...groups.filter(g=>!isStar(g[0])).map(g=>order(g)[0])];const learnU=[];const lu=new Set();learn.forEach(a=>{if(lu.has(a.id))return;lu.add(a.id);learnU.push(a)});
 const li=a=>`<li><button type="button" class="v179lk" data-v179="open" data-id="${E(a.id)}">${E(String(a.title||'').trim()||'ללא כותרת')}</button><span>${daysOf(a)!=null?daysOf(a)+' ימים':''}${groupOf(a).length>1?' · '+groupOf(a).length+' גרסאות':''}</span></li>`;
 return `<div class="v179sum"><div class="v179h"><b>סיכום אוטומטי</b><span>נכון ל${s.last_scan?'־'+E(scanLabel(s.last_scan)):'עכשיו'}</span></div><dl class="v179dl">
  <div><dt>המסר שחוזר הכי הרבה</dt><dd>${top&&top.length>1?`${E(String(top[0].title||'').trim())} <span class="v179muted">${top.length} גרסאות</span>`:'אין עדיין מסר שחוזר ביותר מגרסה אחת'}</dd></div>
  <div><dt>הכי הרבה זמן באוויר</dt><dd>${longest.length?`<ul class="v179ul">${longest.map(li).join('')}</ul>`:'אין תאריכי התחלה'}</dd></div>
  <div><dt>קריאייטיבים שחוזרים בגרסאות</dt><dd>${multi?`${multi} קבוצות מסרים עם יותר מגרסה אחת`:'אין'}</dd></div>
  <div><dt>מסרים חדשים ב־7 הימים האחרונים</dt><dd>${fresh.length?`${freshKeys.size} מסרים, ${fresh.length} מודעות`:'אין'}</dd></div>
  <div><dt>מודעות ששווה ללמוד</dt><dd>${learnU.length?`<ul class="v179ul">${learnU.slice(0,3).map(li).join('')}</ul>`:'אין'}</dd></div></dl></div>`}
function secHtml(c){const s=c.meta_summary||null;const cf=cfOf(c.id);const all=order(adsOf(c.id));const open=M.open.has(c.id);const pages=Array.isArray(c.meta_pages)?c.meta_pages.filter(p=>p.confirmed&&p.page_id):[];
 const k=(l,v)=>`<span class="v179k"><b>${v==null?'·':E(v)}</b>${l}</span>`;
 const counters=s?`${k('פעילות',s.active)}${k(SV.star+' 60 יום ומעלה',s.stars)}${k('חדשות ב־7 ימים',s.new7)}${k('קבוצות מסרים',s.groups)}`:`<span class="v179k none">${pages.length?'ממתין לסריקה הראשונה':'הוסיפו עמוד כדי שייסרק'}</span>`;
 const last=s&&s.last_scan?`סריקה אחרונה: ${E(scanLabel(s.last_scan))}${s.last_scan_status&&s.last_scan_status!=='ok'?` (${s.last_scan_status==='failed'?'נכשלה':'חלקית'})`:''}`:'עדיין לא נסרק';
 const partial=s&&s.partial?`<span class="v179p part" tabindex="0" role="note" title="ספריית Meta מחזירה עד 50 מודעות לכל חיפוש. כשלעמוד יש יותר, הסריקה משלימה בחיפושי מילים, ועדיין ייתכן שחסרות מודעות, בעיקר הישנות.">${SV.info} תוצאות חלקיות</span>`:'';
 let body='';
 if(open){const list=filterAds(all,cf.f);const shown=cf.mode==='cards'?dedupeStacks(list):list;const page=shown.slice(0,cf.n);
  const cnt=f=>filterAds(all,f).length;
  const chips=`<div class="v179chips" role="group" aria-label="סינון מודעות">${[['all','הכל'],['star',SV.star+' 60 ומעלה'],['b2','30 עד 59'],['b3','1 עד 29'],['new','חדשות'],['gone','הפסיקו'],['fav','מועדפים']].map(([f,l])=>chip(f,l,cnt(f),cf.f===f,`data-v179="cf" data-cid="${E(c.id)}"`)).join('')}</div>`;
  const listHtml=!M.loaded.ads&&APP.db?skeleton(2):!all.length?`<p class="v179muted">${s&&s.last_scan?'לא נמצאו מודעות בסריקה האחרונה.':'המודעות יופיעו אחרי הסריקה הראשונה של העמודים שאושרו.'}</p>`:!page.length?`<p class="v179muted">אין מודעות בסינון הזה.</p>`:
   (cf.mode==='cards'?`<div class="v179grid in">${page.map(a=>card(a,{showComp:false})).join('')}</div>`:`<div class="v179tbl in">${page.map(a=>row(a,{showComp:false})).join('')}</div>`)+(shown.length>cf.n?`<button type="button" class="v179b more" data-v179="cmore" data-cid="${E(c.id)}">הצג עוד (${shown.length-cf.n} נוספות)</button>`:'');
  body=`<div class="v179body">${partial||pages.length?`<div class="v179links">${partial}${pages.map(p=>`<a class="v179ext" href="${libUrl(p.page_id)}" target="_blank" rel="noopener">${pages.length>1?E(p.page_name||p.page_id)+' ':''}לעמוד המתחרה בספריית Meta ${SV.ext}</a>`).join('')}</div>`:''}
   ${pagesHtml(c)}${autoSummary(c,all)}
   <div class="v179h"><b>המודעות</b><span>${all.length} בספרייה</span>${modeSeg(cf.mode,`data-v179="cmode" data-cid="${E(c.id)}"`)}</div>${chips}${listHtml}</div>`}
 return `<details class="v179sec" data-v179sec="${E(c.id)}"${open?' open':''}><summary><span class="v179st"><b>Meta Ads · מודעות וניתוח</b><small>${last}</small></span><span class="v179ks">${counters}</span><i class="v179chev" aria-hidden="true">${SV.chev}</i></summary>${body}</details>`}
function refreshSec(cid){const el=document.querySelector(`details[data-v179sec="${CSS.escape(String(cid))}"]`);const c=compOf(cid);if(!el||!c)return;const t=document.createElement('template');t.innerHTML=secHtml(c);el.replaceWith(t.content.firstElementChild)}
try{vComps=(f=>function(){const html=f.apply(this,arguments);try{const t=document.createElement('template');t.innerHTML=html;
 t.content.querySelectorAll('article.cc').forEach(a=>{const b=a.querySelector('[data-cid]');const ca=a.querySelector('.ca');if(!b||!ca)return;const c=compOf(b.dataset.cid);if(!c)return;ca.insertAdjacentHTML('beforebegin',secHtml(c))});return t.innerHTML}catch(e){console.warn('v179 comps',e);return html}})(vComps)}catch(e){console.error('v179 vComps',e)}

/* ---------- B. the library view ---------- */
try{VTITLE.metaads=['ספריית מודעות','המודעות של המתחרים בספריית Meta: מי רץ הכי הרבה זמן, מה חוזר, ומה שווה ללמוד']}catch(e){}
try{if(Array.isArray(VIEWS)&&!VIEWS.some(g=>g[1].some(v=>v[0]==='metaads'))){const g=VIEWS.find(g=>g[1].some(v=>v[0]==='competitors'))||VIEWS[VIEWS.length-1];g[1].push(['metaads','ספריית מודעות','comp'])}}catch(e){}
function libList(){const L=M.lib;let list=[...M.ads.values()];
 if(L.comp)list=list.filter(a=>String(a.comp_id)===L.comp);
 if(L.q){const q=L.q.toLowerCase();list=list.filter(a=>String(a.title||'').toLowerCase().includes(q)||String(a.comp_name||'').toLowerCase().includes(q)||String(a.page_name||'').toLowerCase().includes(q))}
 if(L.bucket)list=list.filter(a=>L.bucket==='b1'?!isGone(a)&&(daysOf(a)||0)>=60:L.bucket==='b2'?!isGone(a)&&(daysOf(a)||0)>=30&&(daysOf(a)||0)<60:!isGone(a)&&(daysOf(a)||0)<30);
 if(L.star)list=list.filter(isStar);if(L.fresh)list=list.filter(a=>isNew(a)&&!isGone(a));if(L.gone)list=list.filter(isGone);
 if(L.group)list=list.filter(a=>groupOf(a).length>1);if(L.fav)list=list.filter(isFav);
 if(L.sort==='new')list.sort((a,b)=>String(b.first_seen||'').localeCompare(String(a.first_seen||''))||(daysOf(b)||0)-(daysOf(a)||0));
 else if(L.sort==='comp')list.sort((a,b)=>String(a.comp_name||'').localeCompare(String(b.comp_name||''),'he')||bucket(a)-bucket(b)||(daysOf(b)||0)-(daysOf(a)||0));
 else list=order(list);
 return list}
function honesty(list){const comps=new Set(list.map(a=>String(a.comp_id)));const latest=M.scans[0];let z=0,zl='עמודים עם תוצאות חלקיות';
 if(latest&&Array.isArray(latest.comps)){latest.comps.forEach(c=>(c.pages||[]).forEach(p=>{if(p.partial)z++}))}else{compsAll().forEach(c=>{if(c.meta_summary&&c.meta_summary.partial)z++});zl='מתחרים עם תוצאות חלקיות'}
 return `נמצאו ${list.length} מודעות אצל ${comps.size} מתחרים${z?`, ${z} ${zl}`:''}`}
function vLib(){const L=M.lib;const latest=M.scans[0];const last=latest?`סריקה אחרונה: ${E(fmtT(latest.finished||latest.started))}${latest.status==='failed'?' (נכשלה)':latest.status==='partial'?' (חלקית)':latest.status==='running'?' (רצה עכשיו)':''}`:'עדיין לא רצה סריקה';
 const tabs=`<div class="v179tabs" role="tablist"><button type="button" role="tab" data-v179="tab" data-k="ads" aria-selected="${L.tab==='ads'}">מודעות<b>${M.ads.size}</b></button><button type="button" role="tab" data-v179="tab" data-k="scans" aria-selected="${L.tab==='scans'}">סטטוס סריקות<b>${M.scans.length}</b></button><span class="v179last">${last}</span></div>`;
 if(L.tab==='scans')return `<div class="v179p0">${tabs}${vScans()}</div>`;
 if(!APP.db)return `<div class="v179p0">${tabs}<div class="v179empty big"><b>הספרייה נטענת כשהמערכת מחוברת</b><p>המודעות נשמרות במסד הנתונים של האתר. התחברו לעמוד הניהול ורעננו.</p></div></div>`;
 const comps=[...new Map([...M.ads.values()].map(a=>[String(a.comp_id),a.comp_name||String(a.comp_id)])).entries()].sort((a,b)=>a[1].localeCompare(b[1],'he'));
 const list=libList();const shown=L.mode==='cards'?dedupeStacks(list):list;const page=shown.slice(0,L.n);
 const bar=`<div class="v179bar"><label class="v179q">${SV.search}<input type="search" data-v179q value="${E(L.q)}" placeholder="חיפוש בכותרת או במתחרה" aria-label="חיפוש בכותרת או במתחרה"></label>
  <label class="v179sel"><span>מתחרה</span><select data-v179="comp"><option value="">כל המתחרים</option>${comps.map(([id,n])=>`<option value="${E(id)}"${L.comp===id?' selected':''}>${E(n)}</option>`).join('')}</select></label>
  <label class="v179sel"><span>ימים באוויר</span><select data-v179="bucket"><option value="">כל הימים</option><option value="b1"${L.bucket==='b1'?' selected':''}>60 יום ומעלה</option><option value="b2"${L.bucket==='b2'?' selected':''}>30 עד 59 יום</option><option value="b3"${L.bucket==='b3'?' selected':''}>1 עד 29 יום</option></select></label>
  <label class="v179sel"><span>מיון</span><select data-v179="sort"><option value="days"${L.sort==='days'?' selected':''}>ימים באוויר</option><option value="new"${L.sort==='new'?' selected':''}>חדשות קודם</option><option value="comp"${L.sort==='comp'?' selected':''}>לפי מתחרה</option></select></label>
  ${modeSeg(L.mode,'data-v179="lmode"')}</div>
  <div class="v179chips" role="group" aria-label="סינון מהיר">${chip('star',SV.star+' 60 יום ומעלה',null,L.star,'data-v179="lf"')}${chip('fresh','חדשות',null,L.fresh,'data-v179="lf"')}${chip('gone','הפסיקו',null,L.gone,'data-v179="lf"')}${chip('group','בכמה גרסאות',null,L.group,'data-v179="lf"')}${chip('fav','מועדפים',null,L.fav,'data-v179="lf"')}${(L.q||L.comp||L.bucket||L.star||L.fresh||L.gone||L.group||L.fav)?`<button type="button" class="v179chip clear" data-v179="lclear">נקה הכל</button>`:''}</div>`;
 const body=!M.loaded.ads?skeleton(6):!M.ads.size?`<div class="v179empty big"><b>עדיין אין מודעות בספרייה</b><p>הסריקה היומית רצה בכל בוקר ב-06:00 ועוברת על העמודים שאושרו בכרטיסי המתחרים. אחרי הסריקה הראשונה המודעות יופיעו כאן.</p><button type="button" class="v179b pri" data-view="competitors">לכרטיסי המתחרים</button></div>`:
  !page.length?`<div class="v179empty"><b>אין מודעות בסינון הזה</b><p>נסו להסיר סינון אחד.</p><button type="button" class="v179b" data-v179="lclear">נקה הכל</button></div>`:
  (L.mode==='cards'?`<div class="v179grid">${page.map(a=>card(a)).join('')}</div>`:`<div class="v179tbl head"><div class="v179row hd" aria-hidden="true"><span>כותרת</span><span>ימים</span><span>סטטוס</span><span>התחלה</span><span></span></div>${page.map(a=>row(a)).join('')}</div>`)+(shown.length>L.n?`<button type="button" class="v179b more" data-v179="lmore">הצג עוד (${shown.length-L.n} נוספות)</button>`:'');
 return `<div class="v179p0">${tabs}${bar}<p class="v179cnt" aria-live="polite">${M.loaded.ads?honesty(list):'טוען את המודעות…'}</p>${body}</div>`}
try{render=(f=>function(){if(APP.view!=='metaads'){document.querySelectorAll('.wrap > footer.view-hidden').forEach(x=>x.classList.remove('view-hidden'));return f.apply(this,arguments)}
 renderNav();const [t,s]=VTITLE.metaads;document.getElementById('vt').textContent=t;document.getElementById('vs').textContent=s;document.body.dataset.pxview='metaads';
 document.querySelectorAll('.wrap > section,.wrap > footer').forEach(sec=>sec.classList.add('view-hidden'));const act=document.getElementById('vact');if(act)act.innerHTML='';
 const box=document.getElementById('appviews');const q=box.querySelector('[data-v179q]');const had=q&&document.activeElement===q?[q.selectionStart,q.selectionEnd]:null;box.innerHTML=vLib();
 if(had){const n=box.querySelector('[data-v179q]');if(n){n.focus();try{n.setSelectionRange(had[0],had[1])}catch(e){}}}})(render)}catch(e){console.error('v179 view',e)}

/* ---------- C. scan status ---------- */
const STN={ok:'תקינה',partial:'חלקית',failed:'נכשלה',running:'רצה עכשיו'};
function vScans(){if(!M.loaded.scans&&APP.db)return skeleton(2);if(!M.scans.length)return `<div class="v179empty big"><b>עדיין לא רצה סריקה</b><p>הסריקה היומית רצה בכל בוקר ב-06:00.</p></div>`;
 return `<div class="v179scans">${M.scans.slice(0,12).map((s,i)=>{const T=s.totals||{};const st=STN[s.status]||E(s.status||'');
  return `<details class="v179scan st-${E(s.status||'')}"${i===0?' open':''}><summary><span class="v179sst">${st}</span><span class="v179sw2"><b>${E(fmtT(s.started))}</b><small>${s.finished?'עד '+E(fmtT(s.finished)):'לא הסתיימה'} · ${s.trigger==='manual'?'הופעלה ידנית':'סריקה יומית'}</small></span><span class="v179stot">${T.ads_seen!=null?`<b>${T.ads_seen}</b> מודעות`:''}${T.new!=null?` · <b>${T.new}</b> חדשות`:''}${T.stars!=null?` · <b>${T.stars}</b> ${SV.star}`:''}</span><i class="v179chev" aria-hidden="true">${SV.chev}</i></summary>
   <div class="v179scanb"><div class="v179tots">${[['מתחרים',T.comps],['עמודים',T.pages],['מודעות שנראו',T.ads_seen],['חדשות',T.new],['הפסיקו',T.gone],['60 יום ומעלה',T.stars],['עמודים חלקיים',T.partial_pages],['שגיאות',T.errors]].filter(([,v])=>v!=null).map(([l,v])=>`<span><b>${E(v)}</b>${l}</span>`).join('')}</div>
   ${Array.isArray(s.comps)&&s.comps.length?`<div class="v179ct"><div class="v179cr hd" aria-hidden="true"><span>מתחרה</span><span>עמודים</span><span>נמצאו</span><span>מתוך</span><span>פעילות · חדשות · הפסיקו</span></div>${s.comps.map(c=>{const pg=c.pages||[];const found=pg.reduce((n,p)=>n+(+p.found||0),0),est=pg.reduce((n,p)=>n+(+p.est_total||0),0);const part=pg.some(p=>p.partial),err=pg.filter(p=>p.error);
    return `<div class="v179cr${err.length?' err':part?' part':''}"><span><b>${E(c.comp_name||c.comp_id)}</b>${err.length?`<small>${err.map(p=>E(String(p.error).slice(0,80))).join(' · ')}</small>`:''}</span><span>${pg.length}</span><span>${found}</span><span>${est||'·'}${part?` <em class="v179p part">חלקי</em>`:''}</span><span>${c.active!=null?c.active:'·'} · ${c.new!=null?c.new:'·'} · ${c.gone!=null?c.gone:'·'}</span></div>`}).join('')}</div>`:''}
   ${Array.isArray(s.notes)&&s.notes.length?`<ul class="v179notes">${s.notes.map(n=>`<li>${E(n)}</li>`).join('')}</ul>`:''}</div></details>`}).join('')}</div>`}

/* ---------- detail modal ---------- */
let lastFocus=null;
function modal(id,html,label){close(id);const m=document.createElement('div');m.id=id;m.className='v179m';m.innerHTML=`<div class="v179bg" data-v179="close" data-m="${id}"></div><div class="v179box" role="dialog" aria-modal="true" aria-label="${E(label)}">${html}</div>`;document.body.appendChild(m);document.body.classList.add('v179lock');
 lastFocus=document.activeElement;requestAnimationFrame(()=>{const f=m.querySelector('[data-v179="close"][data-m].v179x')||m.querySelector('button,input,select,a');f&&f.focus()});return m}
function close(id){const m=document.getElementById(id);if(!m)return;m.remove();if(!document.querySelector('.v179m'))document.body.classList.remove('v179lock');try{lastFocus&&lastFocus.isConnected&&lastFocus.focus()}catch(e){}}
function detailHtml(a){const title=String(a.title||'').trim();const g=groupOf(a);
 const F=[['מתחרה',a.comp_name],['עמוד',`${a.page_name||''} <small dir="ltr">${a.page_id||''}</small>`,1],['מזהה מודעה',`<span dir="ltr">${E(a.id)}</span>`,1],['סטטוס',isGone(a)?'הפסיקה':'פעילה'],['ימים באוויר',daysOf(a)==null?'אין תאריך התחלה':daysOf(a)+' ימים (מחושב מתאריך ההתחלה, שעון ירושלים)'],['התחלת הפצה',fmtT(a.start)],['נוצרה',fmtT(a.created)],['נראתה לראשונה',fmtT(a.first_seen)],['נראתה לאחרונה',fmtT(a.last_seen)],['הפסיקה',a.gone_at?fmtT(a.gone_at):''],['סריקה אחרונה',a.last_scan?scanLabel(a.last_scan):''],['מספר סריקות',a.seen],['מטבע',a.currency],['מפתח קבוצה',a.group_key?`<span>${E(a.group_key)}</span> <small>${g.length>1?g.length+' גרסאות':'גרסה אחת'}</small>`:'',1],['מסר דומה',M.sim.get(String(a.id))?`${M.sim.get(String(a.id))} מודעות באותו עמוד עם רוב המילים משותפות`:'']].filter(([,v])=>v!==''&&v!=null);
 return `<header class="v179mh"><h2>${title?E(title):'<span class="none">ללא כותרת</span>'}</h2><button type="button" class="v179x" data-v179="close" data-m="v179d" aria-label="סגירה">${I('x',18)}</button></header>
  <div class="v179mb"><div class="v179meta">${daysHtml(a)}<span class="v179pills">${pillsOf(a)}</span></div>
  <div class="v179fa"><button type="button" class="v179b" data-v179="copy" data-id="${E(a.id)}">${I('copy',15)} העתקת הכותרת</button><button type="button" class="v179b${isFav(a)?' on':''}" data-v179="fav" data-id="${E(a.id)}" aria-pressed="${isFav(a)}">${isFav(a)?SV.bm:SV.bmO} ${isFav(a)?'במועדפים':'למועדפים'}</button>${safeUrl(a.snapshot_url)?`<a class="v179b" href="${E(safeUrl(a.snapshot_url))}" target="_blank" rel="noopener">לצפייה במודעה ב-Meta ${SV.ext}</a>`:''}${a.page_id?`<a class="v179b" href="${libUrl(a.page_id)}" target="_blank" rel="noopener">העמוד בספריית Meta ${SV.ext}</a>`:''}</div>
  <dl class="v179dl two">${F.map(([l,v,raw])=>`<div><dt>${l}</dt><dd>${raw?v:E(v)}</dd></div>`).join('')}</dl>
  ${g.length>1?`<div class="v179h"><b>כל הגרסאות</b><span>${g.length}</span></div><ul class="v179vers in">${order(g).map(v=>`<li${v.id===a.id?' class="cur"':''}><span class="v179vt">${E(String(v.title||'ללא כותרת'))}</span><span class="v179vd">${daysOf(v)==null?'':daysOf(v)+' ימים'}${isGone(v)?' · הפסיקה':''}</span><span class="v179va">${v.id!==a.id?`<button type="button" class="v179b sm" data-v179="open" data-id="${E(v.id)}">פרטים</button>`:''}</span></li>`).join('')}</ul>`:''}
  ${Array.isArray(a.history)&&a.history.length?`<div class="v179h"><b>היסטוריה</b><span>${a.history.length} שינויים</span></div><ol class="v179hist">${a.history.slice().reverse().map(h=>`<li><b>${E(scanLabel(h.scan))}</b><span>${h.status==='inactive'?'הפסיקה':h.status==='active'?'פעילה':E(h.status||'')}${h.title?' · '+E(h.title):''}</span></li>`).join('')}</ol>`:''}</div>
  <footer class="v179mf"><button type="button" class="v179b pri big" data-v179="brand" data-id="${E(a.id)}">${I('wand',16)} צור גרסה למותג שלנו</button></footer>`}
function openDetail(id){const a=M.ads.get(String(id));if(!a)return;const m=modal('v179d',detailHtml(a),'פרטי המודעה');m.dataset.id=String(id)}

/* ---------- D. "צור גרסה למותג שלנו" ---------- */
const FACTS_K=`קבוצת קורקוס: יזמות, בנייה וביצוע, ניהול ופיקוח, תיווך. הוד השרון והמרכז. יותר מ-30 שנה. מקרקע ועד מסירת מפתח. בונה גם בתים פרטיים ווילות ללקוחות פרטיים על המגרש שלהם. טלפון 055-981-1814, אתר kurkoos-group.co.il.
הנרייטה סאלד 22-24, מערב הוד השרון: בבנייה, היתרים מאושרים. ארבע יחידות דו משפחתיות, שמונה משפחות, כניסה מאובטחת. לכל יחידה מגרש 380 מ"ר בטאבו, כ-300 מ"ר בנוי בשלושה מפלסים (מרתף, קרקע, קומה), 7 חדרים, 4 חדרי רחצה, 2 מרפסות, כניסה נפרדת למרתף, בריכה 3×6. אדריכלות: בני נדלסטיצ'ר.
יורדי הים 3, גרינברג, הוד השרון: בתכנון. שתי וילות, מגרש מעל חצי דונם לכל וילה, כ-300 מ"ר בשלושה מפלסים, מרתף עם שתי סוויטות, חדר גג, בריכה מאושרת 4×9. אדריכלות: רמי שחר.
חנקין 41, מגדיאל: בבנייה. בניין בוטיק של שש דירות, גינה פרטית כ-150 מ"ר, שתי חניות בחניון תת קרקעי לכל דירה. אדריכלות: בני נדלסטיצ'ר.
בן גוריון 17, יהוד: בית דו משפחתי.`;
const RULES_K=`קול המותג: עברית ישראלית טבעית, כמו מנהל עבודה ותיק שמסביר ללקוח. משפטים קצרים. "אנחנו". חם, בטוח, קונקרטי. פרט קונקרטי אחד בפוסט (כתובת, מספר, שלב, אדם).
אסור: הכי טוב, מוביל, איכות ללא פשרות, בית החלומות, יוקרתי במיוחד, הזדמנות שלא תחזור, !!!, ובלי מקפים או קווים מפרידים כסימן פיסוק (לא " - ", לא "—", לא "–"). בלי עדויות, ציטוטי לקוחות, טענות ביצועים, מחירים או פרסים.`;
const GOALS=[['leads','לידים'],['brand','מודעות למותג'],['project','פרויקט ספציפי']];
const PROJ=[['henrietta','הנרייטה סאלד 22-24'],['yordei','יורדי הים 3'],['hankin','חנקין 41'],['bengurion','בן גוריון 17']];
function brandOf(k){if(k==='afik'&&window.__v178&&__v178.AFIK){const A=__v178.AFIK;return {id:'afik',name:A.name,facts:`${A.name}: ${A.line}. ${A.about}. אתר ${A.site}, טלפון ${A.phone}. חברת השיווק והתיווך של קבוצת קורקוס. זהו כל המידע המותר על המותג.`,rules:RULES_K.replace('מנהל עבודה ותיק','משווק נדל"ן ותיק')}}
 return {id:'kurkoos',name:'קבוצת קורקוס',facts:FACTS_K,rules:RULES_K}}
function prompt(a,o){const B=brandOf(o.brand);const g=groupOf(a);const goal=o.goal==='leads'?'לידים: פנייה של לקוח פוטנציאלי':o.goal==='brand'?'מודעות למותג: שיזכרו את השם ומה אנחנו עושים':'פרויקט ספציפי'+(o.project?': '+(PROJ.find(p=>p[0]===o.project)||[])[1]:'');
 return `אתה הקריאייטיב דיירקטור של "${B.name}". לפניך מודעה של מתחרה מספריית המודעות של Meta. המשימה בשני חלקים.
חלק 1, ניתוח: למה המודעה הזו עובדת. מסר מרכזי, הצעת הערך, ההוק, המבנה, הקריאה לפעולה, והעיקרון שאפשר ללמוד ממנה (עיקרון, לא ניסוח).
חלק 2, פוסט מקורי ל"${B.name}" שמיישם את העיקרון. אסור להעתיק מילים, משפטים או רעיון ספציפי מהמודעה של המתחרה. בלי להזכיר את המתחרה. רק עובדות מהרשימה, בלי להמציא מספרים, כתובות, מחירים או שמות.
המודעה של המתחרה:
כותרת: ${String(a.title||'').trim()||'(ללא כותרת)'}
עמוד: ${a.page_name||''} (${a.comp_name||''})
ימים באוויר: ${daysOf(a)==null?'לא ידוע':daysOf(a)}
גרסאות עם אותה כותרת: ${g.length}
מטרת הקמפיין שלנו: ${goal}${o.note?'\nהנחיה מהמנהל: '+o.note:''}
עובדות מותרות על המותג:
${B.facts}
${B.rules}
מגבלות: headline עד 7 מילים (מותר \\n אחד), sub עד 12 מילים, items 3 עד 4 שורות קצרות, cta עד 4 מילים, fb 60 עד 150 מילים.
החזר JSON בלבד: {"analysis":{"message":"","value_prop":"","hook":"","structure":"","cta":"","principle":""},"post":{"headline":"","sub":"","items":[""],"cta":"","fb":""}}`}
async function ask(p){let s=null;try{s=(window.claude&&window.claude.use)?await window.claude.use('sample').catch(()=>null):null}catch(e){}if(!s&&typeof KC!=='undefined'&&KC.sample)s=KC.sample;if(!s){const e=new Error('no');e.code='not_granted';throw e}
 const r=await s.json(p,{cache:false,modelTier:'default'});if(!r||typeof r!=='object'||!r.post)throw new Error('bad');return r}
const cleanTxt=x=>String(x||'').replace(/\s[—–-]\s/g,', ').replace(/[—–]/g,', ').trim();
function applyTo(p,res,a,o){const P=res.post||{},A=res.analysis||{};const items=Array.isArray(P.items)?P.items.map(cleanTxt).filter(Boolean).slice(0,5):[];
 p.visual=Object.assign({},p.visual||{},{headline:cleanTxt(P.headline)||p.visual.headline,sub:cleanTxt(P.sub),cta:cleanTxt(P.cta)});p.hook=p.visual.headline.replace(/\n/g,' ');
 if(p.layout==='ed_article'){p.fx=Object.assign({},p.fx||{},{items})}
 const fb=cleanTxt(P.fb);if(fb){let sig='';if(p.brand==='afik'&&window.__v178&&__v178.AFIK){const A=__v178.AFIK;sig=`\n\n${A.name}. ${A.line}.\n${A.phone}\n#אפיקהנחל`}else if(!p.brand&&typeof KIT!=='undefined')sig=`\n\n${KIT.signoff||''}\n055-981-1814 · ${KIT.handle||'kurkoos-group.co.il'}\n${KIT.hashtags||''}`;p.fb=fb+sig;p.ig=p.fb.slice(0,700)}
 p.metaAnalysis={message:cleanTxt(A.message),value_prop:cleanTxt(A.value_prop),hook:cleanTxt(A.hook),structure:cleanTxt(A.structure),cta:cleanTxt(A.cta),principle:cleanTxt(A.principle)};p.angle=p.metaAnalysis.principle||'';
 p.metaSource={id:String(a.id),title:String(a.title||'').trim(),page_name:a.page_name||'',comp_name:a.comp_name||'',days:daysOf(a),start:a.start||null,snapshot_url:safeUrl(a.snapshot_url),versions:groupOf(a).length};p.metaBrand=o.brand;p.metaGoal=o.goal;p.metaNote=o.note||'';p.upd=new Date().toISOString();return p}
function makePost(a,res,o){const P=res.post||{};const items=Array.isArray(P.items)?P.items.filter(Boolean):[];const L=items.length>=3?'ed_article':'ed_quote';const proj=o.goal==='project'&&o.project?o.project:'general';
 let p=mkPost({layout:L,project:proj,label:o.goal==='leads'?'לפרטים':o.goal==='brand'?'מי אנחנו':'',head:cleanTxt(P.headline)||'פוסט חדש',sub:cleanTxt(P.sub),items:items.map(cleanTxt),cta:cleanTxt(P.cta),fb:cleanTxt(P.fb)||undefined,why:'גרסה למותג שלנו, מתוך מודעה של '+(a.comp_name||'')});
 if(!p)throw new Error('mkPost');
 if(o.brand==='afik'){if(window.__v178&&__v178.cloneOne){const q=__v178.cloneOne(p);delete q.clonedFrom;p=q}else{p.brand='afik';p.series='אפיק הנחל'}}
 p.src='metaad';p.metaAdId=String(a.id);p.compId=a.comp_id;p.compName=a.comp_name||'';applyTo(p,res,a,o);return p}
function genHtml(st){const G=M.gen;const a=G.ad;const hdr=`<header class="v179mh"><h2>צור גרסה למותג שלנו</h2><button type="button" class="v179x" data-v179="close" data-m="v179g" aria-label="סגירה">${I('x',18)}</button></header>`;
 const src=`<div class="v179srcc"><span class="v179muted">המודעה של המתחרה</span><b>${E(String(a.title||'').trim()||'ללא כותרת')}</b><span>${E(a.comp_name||'')} · ${E(a.page_name||'')}${daysOf(a)!=null?' · '+daysOf(a)+' ימים באוויר':''}${groupOf(a).length>1?' · '+groupOf(a).length+' גרסאות':''}</span></div>`;
 if(st==='form')return `${hdr}<div class="v179mb">${src}<form class="v179gf" data-v179gen="1"><fieldset><legend>למי כותבים</legend><div class="v179brands"><label class="v179br"><input type="radio" name="brand" value="kurkoos" ${G.o.brand!=='afik'?'checked':''}><span class="v179brc" style="--c:#07293a"></span><b>קבוצת קורקוס</b><small>בנייה, יזמות ופיקוח</small></label><label class="v179br"><input type="radio" name="brand" value="afik" ${G.o.brand==='afik'?'checked':''}><span class="v179brc" style="--c:#8490D8"></span><b>אפיק הנחל</b><small>שיווק ותיווך</small></label></div></fieldset>
  <label class="v179sel full"><span>מטרת הקמפיין</span><select name="goal" data-v179="goal">${GOALS.map(([k,l])=>`<option value="${k}"${G.o.goal===k?' selected':''}>${l}</option>`).join('')}</select></label>
  <label class="v179sel full" ${G.o.goal==='project'?'':'hidden'}><span>איזה פרויקט</span><select name="project">${PROJ.map(([k,l])=>`<option value="${k}"${G.o.project===k?' selected':''}>${l}</option>`).join('')}</select></label>
  <label class="v179ta"><span>הנחיה חופשית (לא חובה)</span><textarea name="note" rows="2" placeholder="למשל: לדבר על הגינה הפרטית, בלי לציין מחיר">${E(G.o.note||'')}</textarea></label>
  <p class="v179help">Claude מנתח למה המודעה עובדת וכותב פוסט מקורי שלנו, בלי להעתיק את הניסוח של המתחרה. אפשר לערוך כל חלק אחר כך בעורך. שום דבר לא מתפרסם לבד.</p>
  <div class="v179fa end"><button type="button" class="v179b" data-v179="close" data-m="v179g">ביטול</button><button type="submit" class="v179b pri big">${I('wand',16)} צור גרסה</button></div></form></div>`;
 if(st==='busy')return `${hdr}<div class="v179mb">${src}<div class="v179busy" role="status" aria-live="polite"><i></i><b>Claude מנתח וכותב…</b><span>בדרך כלל 20 עד 60 שניות</span></div></div>`;
 if(st==='err')return `${hdr}<div class="v179mb">${src}<div class="v179empty"><b>${E(G.err||'הכתיבה לא הצליחה')}</b><p>${G.errCode==='not_granted'?'Claude זמין כשהמערכת מחוברת. אפשר לנסות שוב אחרי התחברות.':'אפשר לנסות שוב, או לכתוב את הגרסה ידנית בסטודיו.'}</p><div class="v179fa"><button type="button" class="v179b pri" data-v179="gretry">נסו שוב</button><button type="button" class="v179b" data-v179="close" data-m="v179g">סגירה</button></div></div></div>`;
 const p=G.post,A=p.metaAnalysis||{};
 return `${hdr}<div class="v179mb">${src}<div class="v179res"><div class="v179h"><b>מה למדנו מהמודעה</b></div><dl class="v179dl">${[['המסר',A.message],['הצעת הערך',A.value_prop],['ההוק',A.hook],['המבנה',A.structure],['קריאה לפעולה',A.cta],['העיקרון שלקחנו',A.principle]].filter(([,v])=>v).map(([l,v])=>`<div><dt>${l}</dt><dd>${E(v)}</dd></div>`).join('')}</dl>
  <div class="v179h"><b>הגרסה שלנו</b><span>${E(p.brand==='afik'?'אפיק הנחל':'קבוצת קורקוס')} · טיוטה</span></div><div class="v179post"><b>${E((p.visual.headline||'').replace(/\n/g,' '))}</b>${p.visual.sub?`<p>${E(p.visual.sub)}</p>`:''}${p.fx&&Array.isArray(p.fx.items)&&p.fx.items.length?`<ul>${p.fx.items.map(x=>`<li>${E(x)}</li>`).join('')}</ul>`:''}${p.visual.cta?`<em>${E(p.visual.cta)}</em>`:''}<pre>${E(p.fb||'')}</pre></div></div></div>
  <footer class="v179mf"><button type="button" class="v179b" data-v179="gagain">${I('wand',15)} גרסה נוספת</button><button type="button" class="v179b pri big" data-v179="gopen">${I('edit',16)} פתח בעורך העיצוב</button></footer>`}
function openGen(id){const a=M.ads.get(String(id));if(!a)return;M.gen={ad:a,o:{brand:lsg('v179_brand','kurkoos'),goal:'leads',project:'henrietta',note:''},post:null,st:'form'};modal('v179g',genHtml('form'),'צור גרסה למותג שלנו')}
function genRender(){const m=document.getElementById('v179g');if(!m||!M.gen)return;m.querySelector('.v179box').innerHTML=genHtml(M.gen.st);const f=m.querySelector('.v179box button.pri,.v179box button');f&&f.focus()}
async function runGen(){const G=M.gen;if(!G)return;G.st='busy';genRender();
 try{const res=await ask(prompt(G.ad,G.o));if(G.post){applyTo(G.post,res,G.ad,G.o)}else{G.post=makePost(G.ad,res,G.o);AG.posts.unshift(G.post)}try{saveAgent()}catch(e){}try{await ensureImgs(G.post)}catch(e){}G.st='done';genRender();toast('הגרסה נוספה לטיוטות. אפשר לפתוח אותה בעורך')}
 catch(e){G.st='err';G.errCode=e&&e.code;G.err=e&&e.code==='rate_limited'?'יותר מדי בקשות, נסו בעוד דקה':e&&e.code==='not_granted'?'Claude לא זמין בתצוגה הזו':'הכתיבה לא הצליחה';genRender()}}

/* ---------- the source panel inside the editor ---------- */
function srcPanel(p){const s=p.metaSource||{},A=p.metaAnalysis||{};const open=M.srcOpen==null?!window.matchMedia('(max-width:700px)').matches:M.srcOpen;
 return `<section class="v179src${open?' open':''}" aria-label="המודעה שממנה יצאנו"><button type="button" class="v179srch" data-v179="srctoggle" aria-expanded="${open}"><span class="v179srck">המקור</span><span class="v179srct"><b>${E(s.title||'ללא כותרת')}</b><small>${E(s.comp_name||p.compName||'')}${s.page_name?' · '+E(s.page_name):''}${s.days!=null?' · '+s.days+' ימים באוויר':''}${s.versions>1?' · '+s.versions+' גרסאות':''}</small></span><i class="v179chev" aria-hidden="true">${SV.chev}</i></button>
  <div class="v179srcb"${open?'':' hidden'}>${s.start?`<p class="v179muted">באוויר מאז ${E(fmtD(s.start))}, שעון ירושלים</p>`:''}<dl class="v179dl">${[['המסר',A.message],['הצעת הערך',A.value_prop],['ההוק',A.hook],['המבנה',A.structure],['קריאה לפעולה',A.cta],['העיקרון שלקחנו',A.principle]].filter(([,v])=>v).map(([l,v])=>`<div><dt>${l}</dt><dd>${E(v)}</dd></div>`).join('')}</dl>
  <div class="v179fa">${s.snapshot_url?`<a class="v179b" href="${E(s.snapshot_url)}" target="_blank" rel="noopener">לצפייה במודעה ב-Meta ${SV.ext}</a>`:''}<button type="button" class="v179b" data-v179="again">${I('wand',15)} גרסה נוספת</button>${s.id?`<button type="button" class="v179b" data-v179="open" data-id="${E(s.id)}">פרטי המודעה</button>`:''}</div><p class="v179help">הפוסט הזה הוא טיוטה. שום דבר לא מתפרסם לבד.</p></div></section>`}
try{peRender=(f=>function(){const r=f.apply(this,arguments);try{if(typeof PE!=='undefined'&&PE.p&&PE.p.src==='metaad'){const b=document.querySelector('#pe-root .pe-body');if(b&&!b.querySelector('.v179src'))b.insertAdjacentHTML('afterbegin',srcPanel(PE.p))}}catch(e){console.warn('v179 src',e)}return r})(peRender)}catch(e){console.error('v179 pe',e)}
async function againInEditor(){const p=PE.p;if(!p||p.src!=='metaad')return;const a=M.ads.get(String(p.metaAdId))||Object.assign({id:p.metaAdId,comp_id:p.compId,comp_name:p.compName},p.metaSource||{});
 const b=document.querySelector('#pe-root [data-v179="again"]');if(b){b.disabled=true;b.textContent='Claude כותב…'}toast('Claude כותב גרסה נוספת…');
 try{const res=await ask(prompt(a,{brand:p.metaBrand||(p.brand==='afik'?'afik':'kurkoos'),goal:p.metaGoal||'leads',project:p.project,note:p.metaNote||''}));PE.hist.push(peSnap(p));PE.fut=[];applyTo(p,res,a,{brand:p.metaBrand||(p.brand==='afik'?'afik':'kurkoos'),goal:p.metaGoal||'leads',note:p.metaNote||''});peRender();try{peLive()}catch(e){}toast('גרסה נוספת נכתבה. אפשר לבטל עם ביטול')}
 catch(e){toast(e&&e.code==='not_granted'?'Claude זמין כשהמערכת מחוברת':'הכתיבה לא הצליחה. נסו שוב');if(b){b.disabled=false;b.innerHTML=`${I('wand',15)} גרסה נוספת`}}}

/* ---------- events ---------- */
document.addEventListener('click',async e=>{const b=e.target.closest&&e.target.closest('[data-v179]');if(!b)return;const a=b.dataset.v179;
 if(a==='close'){e.preventDefault();close(b.dataset.m);return}
 e.preventDefault();e.stopPropagation();
 if(a==='open'){openDetail(b.dataset.id);return}
 if(a==='brand'){openGen(b.dataset.id);return}
 if(a==='fav'){const ad=M.ads.get(String(b.dataset.id));if(!ad)return;const on=!isFav(ad);await setFav(ad,on);const d=document.getElementById('v179d');if(d&&d.dataset.id===String(ad.id))d.querySelector('.v179box').innerHTML=detailHtml(ad);rerender();return}
 if(a==='copy'){const ad=M.ads.get(String(b.dataset.id));if(!ad)return;try{await navigator.clipboard.writeText(String(ad.title||''));toast('הכותרת הועתקה')}catch(x){toast('ההעתקה לא הצליחה')}return}
 if(a==='exp'){const k=b.dataset.key;if(M.exp.has(k))M.exp.delete(k);else M.exp.add(k);rerenderNow();return}
 if(a==='cf'){cfOf(b.dataset.cid).f=b.dataset.k;cfOf(b.dataset.cid).n=20;refreshSec(b.dataset.cid);return}
 if(a==='cmode'){cfOf(b.dataset.cid).mode=b.dataset.m;lss('v179_mode',b.dataset.m);refreshSec(b.dataset.cid);return}
 if(a==='cmore'){cfOf(b.dataset.cid).n+=50;refreshSec(b.dataset.cid);return}
 if(a==='pgadd'){cfOf(b.dataset.cid).add=true;refreshSec(b.dataset.cid);setTimeout(()=>{const i=document.querySelector(`[data-v179form="${CSS.escape(b.dataset.cid)}"] input`);i&&i.focus()},30);return}
 if(a==='pgcancel'){cfOf(b.dataset.cid).add=false;refreshSec(b.dataset.cid);return}
 if(a==='pgdel'){const c=compOf(b.dataset.cid);if(!c)return;const pages=(c.meta_pages||[]).slice();if(b.dataset.ok!=='1'){b.dataset.ok='1';b.textContent='בטוח?';setTimeout(()=>{if(b.isConnected){b.dataset.ok='';b.innerHTML=I('trash',15)}},2500);return}pages.splice(+b.dataset.i,1);await savePages(c.id,pages);toast('העמוד הוסר');return}
 if(a==='tab'){M.lib.tab=b.dataset.k;render();return}
 if(a==='lmode'){M.lib.mode=b.dataset.m;lss('v179_mode',b.dataset.m);render();return}
 if(a==='lf'){M.lib[b.dataset.k]=!M.lib[b.dataset.k];if(b.dataset.k==='gone'&&M.lib.gone){M.lib.star=false;M.lib.fresh=false}M.lib.n=50;render();return}
 if(a==='lclear'){Object.assign(M.lib,{q:'',comp:'',bucket:'',star:false,fresh:false,gone:false,group:false,fav:false,n:50});render();return}
 if(a==='lmore'){M.lib.n+=50;render();return}
 if(a==='gretry'){runGen();return}
 if(a==='gagain'){runGen();return}
 if(a==='gopen'){const p=M.gen&&M.gen.post;close('v179g');if(!p)return;M.srcOpen=null;setTimeout(()=>{try{peOpen(p)}catch(x){const btn=document.querySelector(`[data-pe="${CSS.escape(p.id)}"]`);btn&&btn.click()}},60);return}
 if(a==='srctoggle'){const s=b.closest('.v179src');const open=b.getAttribute('aria-expanded')!=='true';M.srcOpen=open;b.setAttribute('aria-expanded',open);s.classList.toggle('open',open);const body=s.querySelector('.v179srcb');if(body)body.hidden=!open;return}
 if(a==='again'){againInEditor();return}
},true);
function rerenderNow(){if(APP.view==='metaads')render();else document.querySelectorAll('details[data-v179sec]').forEach(d=>refreshSec(d.dataset.v179sec));const d=document.getElementById('v179d');if(d){const ad=M.ads.get(d.dataset.id);if(ad)d.querySelector('.v179box').innerHTML=detailHtml(ad)}}
document.addEventListener('change',async e=>{const t=e.target;if(!t||!t.matches)return;
 if(t.matches('[data-v179pg]')){const c=compOf(t.dataset.v179pg);if(!c)return;const pages=(c.meta_pages||[]).map(p=>Object.assign({},p));const p=pages[+t.dataset.i];if(!p)return;p.confirmed=t.checked;if(t.checked)p.uncertain=false;await savePages(c.id,pages);toast(t.checked?'העמוד ייסרק בסריקה הבאה':'העמוד לא ייסרק יותר');return}
 if(t.matches('select[data-v179="comp"]')){M.lib.comp=t.value;M.lib.n=50;render();return}
 if(t.matches('select[data-v179="bucket"]')){M.lib.bucket=t.value;if(t.value)M.lib.gone=false;M.lib.n=50;render();return}
 if(t.matches('select[data-v179="sort"]')){M.lib.sort=t.value;render();return}
 if(t.matches('select[data-v179="goal"]')&&M.gen){M.gen.o.goal=t.value;const f=t.closest('form');const pl=f&&f.querySelector('select[name="project"]');if(pl)pl.closest('label').hidden=t.value!=='project';return}
 if(t.matches('.v179gf input[name="brand"]')&&M.gen){M.gen.o.brand=t.value;lss('v179_brand',t.value)}
});
document.addEventListener('submit',async e=>{const f=e.target;if(!f||!f.matches)return;
 if(f.matches('[data-v179form]')){e.preventDefault();e.stopPropagation();const cid=f.dataset.v179form;const c=compOf(cid);if(!c)return;const pid=String(new FormData(f).get('pid')||'').replace(/\D/g,'');const name=String(new FormData(f).get('pname')||'').trim().slice(0,80);
  if(!/^\d{5,25}$/.test(pid)){toast('מספר העמוד צריך להיות ספרות בלבד');return}const pages=(c.meta_pages||[]).map(p=>Object.assign({},p));const ex=pages.find(p=>String(p.page_id)===pid);
  if(ex){ex.confirmed=true;ex.uncertain=false;if(name)ex.page_name=name}else pages.push({page_id:pid,page_name:name||'עמוד '+pid,confirmed:true,uncertain:false,source:'owner'});cfOf(cid).add=false;await savePages(cid,pages);toast('העמוד נשמר. הסריקה הבאה תכלול אותו');return}
 if(f.matches('[data-v179gen]')&&M.gen){e.preventDefault();e.stopPropagation();const d=new FormData(f);Object.assign(M.gen.o,{brand:String(d.get('brand')||'kurkoos'),goal:String(d.get('goal')||'leads'),project:String(d.get('project')||'henrietta'),note:String(d.get('note')||'').trim().slice(0,300)});lss('v179_brand',M.gen.o.brand);M.gen.post=null;runGen()}
},true);
document.addEventListener('input',e=>{const t=e.target;if(t&&t.matches&&t.matches('[data-v179q]')){M.lib.q=t.value.trim();M.lib.n=50;clearTimeout(M.qt);M.qt=setTimeout(()=>{if(APP.view==='metaads')render()},250)}});
document.addEventListener('toggle',e=>{const d=e.target;if(!d||!d.matches||!d.matches('details[data-v179sec]'))return;const cid=d.dataset.v179sec;if(d.open){M.open.add(cid);if(!d.querySelector('.v179body'))refreshSec(cid)}else M.open.delete(cid)},true);
document.addEventListener('keydown',e=>{if(e.key!=='Escape')return;const g=document.getElementById('v179g'),d=document.getElementById('v179d');if(g){close('v179g');e.stopPropagation()}else if(d){close('v179d');e.stopPropagation()}},true);

window.__v179={brandOf,GOALS,PROJ,cleanTxt,ask,M,daysOf,bucket,isStar,isNew,isGone,order,groupOf,libList,openDetail,openGen,runGen,prompt,makePost,applyTo,secHtml,vLib,vScans,reindex};
})();
