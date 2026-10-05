// ================= V115 · the photo library inside the editor: every photo the system has (the website, Google Drive,
//                   uploads, the built in set) in one organised browser. Grouped by project, filtered by source and kind,
//                   searchable, a full screen version for desktops with captions, and uploads straight into the library
//                   from the editor. One tap on a photo replaces the selected photo in the post =================
(function(){
if(typeof peImage!=='function'||typeof PE==='undefined')return;
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const SRC=[['all','הכל'],['site','מהאתר'],['drive','מהדרייב'],['upload','העלאות'],['system','מערכת']];
const KIND={site:'צילומי אתר',render:'הדמיות',interior:'פנים',exterior:'חוץ',aerial:'מלמעלה',drawing:'תוכניות',people:'אנשים',brand:'לוגואים',atmo:'אווירה',detail:'פרטים',finish:'בנוי',post:'פוסטים',ad:'מודעות',topic:'תמונות נושא',cover:'שערים',small:'קטנות'};
const PRJ=()=>typeof PROJ_HE!=='undefined'?PROJ_HE:{};
function raw(k){try{return k.startsWith('u_')?(upMeta(k)||{}):(PM[k]||{})}catch(e){return {}}}
function srcOf(k){if(!k.startsWith('u_'))return 'system';const m=raw(k);const t=String(m.tags||'')+' '+String(m.src||'')+' '+String(m.batch||'');if(/drive/.test(t))return 'drive';if(/website|cms|projects\//.test(t)||m.cms||m.site)return 'site';return 'upload'}
function nameOf(k){return (typeof LIB_NAMES!=='undefined'&&LIB_NAMES[k])||k}
function all(){return libKeys().filter(k=>PHOTO_LIB[k])}
function state(){PE.lib=PE.lib||{};const L=PE.lib;if(!L.src)L.src='all';if(!L.kind)L.kind='all';if(!L.proj)L.proj='all';if(!L.q)L.q='';if(!L.open)L.open={};return L}
function filtered(L){const q=(L.q||'').trim();return all().filter(k=>{const m=metaOf(k);if(L.src!=='all'&&srcOf(k)!==L.src)return false;
 if(L.kind!=='all'){if(L.kind==='topic'){if(!m.topic)return false}else if(L.kind==='photo'){if(m.k==='render'||m.k==='drawing')return false}else if(m.k!==L.kind)return false}
 if(L.proj!=='all'&&(m.p||'general')!==L.proj)return false;
 if(q&&!((nameOf(k)+' '+(m.t||'')+' '+(m.n||'')+' '+(PRJ()[m.p]||'')).includes(q)))return false;return true})}
function counts(keys,fn){const c={};keys.forEach(k=>{const v=fn(k);c[v]=(c[v]||0)+1});return c}
function tile(k,u,cur,big){const m=metaOf(k);const s=srcOf(k);const sl={site:'אתר',drive:'דרייב',upload:'העלאה',system:''}[s];
 return `<button type="button" class="pe-li v115t" data-pe-a="pick" data-k="${k}" title="${esc(nameOf(k))}" aria-label="החלף ל${esc(nameOf(k))}" ${cur===k?'aria-pressed="true"':''}><img loading="lazy" decoding="async" alt="" src="${PHOTO_LIB[k]}">${m.k==='render'?'<i>הדמיה</i>':''}${sl?`<em class="v115s">${sl}</em>`:''}${u[k]?`<b>${u[k]}</b>`:'<b class="new">חדש</b>'}${big?`<span class="v115c">${esc(String(nameOf(k)).replace(/^[^·]{2,40}·\s*/,''))}</span>`:''}</button>`}
function sections(L,keys,u,cur,big){const byP={};keys.forEach(k=>{const p=metaOf(k).p||'general';(byP[p]=byP[p]||[]).push(k)});
 const curP=(PE.p&&PE.p.project)||'';const names=PRJ();const order=Object.keys(byP).sort((a,b)=>(a===curP?-1:b===curP?1:0)||byP[b].length-byP[a].length);
 const few=order.length<=2;const curPhotoP=cur&&metaOf(cur)&&(metaOf(cur).p||'general');const def=byP[curP]?curP:byP[curPhotoP]?curPhotoP:order[0];
 return order.map(p=>{const list=byP[p].slice().sort((a,b)=>(u[a]||0)-(u[b]||0));const open=few||L.proj!=='all'||p===def||L.open[p]===true||!!L.q;
  return `<details class="v115g" data-v115g="${p}" ${open?'open':''}><summary><b>${esc(names[p]||p)}</b><span>${list.length} תמונות</span></summary><div class="pe-lib v115grid ${big?'big':''}">${list.map(k=>tile(k,u,cur,big)).join('')}</div></details>`}).join('')||'<p class="px-note">אין תמונות שמתאימות לסינון. נקו את החיפוש או בחרו מקור אחר.</p>'}
function bars(L,big){const keys=all();const bySrc=counts(keys,srcOf);const byKind=counts(keys,k=>metaOf(k).k||'site');const byProj=counts(keys,k=>metaOf(k).p||'general');const names=PRJ();
 const projs=Object.keys(byProj).sort((a,b)=>byProj[b]-byProj[a]);
 return `<div class="v115bar"><input type="search" class="v115q" placeholder="חיפוש בשם, בפרויקט או בתיוג" value="${esc(L.q)}" data-v115="q" aria-label="חיפוש תמונה">
  <div class="v115seg" role="group" aria-label="מקור">${SRC.map(([k,l])=>`<button type="button" data-v115="src" data-k="${k}" aria-pressed="${L.src===k}">${l}${k==='all'?` <small>${keys.length}</small>`:bySrc[k]?` <small>${bySrc[k]}</small>`:''}</button>`).join('')}</div></div>
  <div class="pe-chips v115chips"><button type="button" data-v115="proj" data-k="all" aria-pressed="${L.proj==='all'}">כל הפרויקטים</button>${projs.map(p=>`<button type="button" data-v115="proj" data-k="${p}" aria-pressed="${L.proj===p}">${esc(names[p]||p)} <small>${byProj[p]}</small></button>`).join('')}</div>
  <div class="pe-chips v115chips"><button type="button" data-v115="kind" data-k="all" aria-pressed="${L.kind==='all'}">כל הסוגים</button>${Object.keys(byKind).filter(k=>KIND[k]).sort((a,b)=>byKind[b]-byKind[a]).map(k=>`<button type="button" data-v115="kind" data-k="${k}" aria-pressed="${L.kind===k}">${KIND[k]} <small>${byKind[k]}</small></button>`).join('')}</div>`}
function body(big){const L=state();const keys=filtered(L);const {u}=usage();const sl=peSlots(PE.p);const cur=sl[PE.slot]&&sl[PE.slot].o.k;return sections(L,keys,u,cur,big)}
// ---- the inline picker in the image tab
peImage=(f=>function(){let h=f.apply(this,arguments);try{const i=h.indexOf('<div class="pe-l">החלפת תמונה');if(i<0)return h;const start=h.lastIndexOf('<div class="pe-sec"',i);if(start<0)return h;
 const L=state();const keys=filtered(L);const sl=peSlots(PE.p);const can=sl.length>0;
 h=h.slice(0,start)+`<div class="pe-sec v115"><div class="pe-l">החלפת תמונה <small>${keys.length} מתוך ${all().length} בספרייה</small></div>
  <div class="px-row pe-uprow"><button type="button" class="px-btn sm pri" data-v115="open">${ico('expand',14)} הספרייה במסך מלא</button><label class="px-btn sm">${ico('plus',13)} העלאה לספרייה<input type="file" accept="image/*" multiple data-v115up hidden></label>${can?`<label class="px-btn sm ghost">${ico('img',13)} העלאה לתמונה הזו<input type="file" accept="image/*" data-pe-up hidden></label>`:''}</div>
  ${bars(L,false)}<div class="v115body">${body(false)}</div></div>`}catch(e){console.warn('v115',e)}return h})(peImage);
// ---- the full screen library
function openLib(){if(!PE.p)return;let el=document.getElementById('v115lib');if(!el){el=document.createElement('div');el.id='v115lib';el.className='v115ov';document.body.appendChild(el)}renderLib();document.body.classList.add('v115-on');setTimeout(()=>{const q=el.querySelector('[data-v115="q"]');q&&q.focus()},40)}
function renderLib(){const el=document.getElementById('v115lib');if(!el||!PE.p)return;const L=state();const keys=filtered(L);const sl=peSlots(PE.p);const cur=sl[PE.slot];
 el.innerHTML=`<div class="v115sh" role="dialog" aria-modal="true" aria-label="ספריית התמונות"><header class="v115top"><button type="button" class="v115x" data-v115="close" aria-label="סגירה"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
   <div class="v115ttl"><b>ספריית התמונות</b><span>${cur?`לחיצה על תמונה מחליפה את "${esc(peSlotName(cur,PE.slot))}" בפוסט`:'לעיצוב הזה אין תמונה להחלפה. אפשר להעלות לספרייה'} · ${keys.length} מתוך ${all().length}</span></div>
   <label class="px-btn sm pri v115up">${ico('plus',14)} העלאת תמונות<input type="file" accept="image/*" multiple data-v115up hidden></label></header>
  <div class="v115filters">${bars(L,true)}</div><div class="v115body big">${body(true)}</div></div>`}
function closeLib(){const el=document.getElementById('v115lib');if(el)el.remove();document.body.classList.remove('v115-on')}
function refresh(){const el=document.getElementById('v115lib');if(el){const q=el.querySelector('[data-v115="q"]');const sel=q&&document.activeElement===q?[q.selectionStart,q.selectionEnd]:null;renderLib();if(sel){const q2=el.querySelector('[data-v115="q"]');if(q2){q2.focus();try{q2.setSelectionRange(sel[0],sel[1])}catch(e){}}}}else{try{peRender()}catch(e){}}}
// ---- uploads into the library (several files, named after the file, filed under the post's project)
async function uploadMany(files){const list=[...files].filter(f=>/^image\//.test(f.type));if(!list.length)return toast('בחרו קובצי תמונה');
 const can=typeof KC!=='undefined'&&KC.assets;if(!can)return toast('העלאה לספרייה זמינה כשהדף פתוח ב-claude.ai עם הרשאת עריכה');
 toast(`מעלה ${list.length} תמונות לספרייה…`);const proj=(PE.p&&PE.p.project)||'';let first=null,n=0;
 for(const f of list){try{const {blob,w,h}=await downscale(f);const name=f.name.replace(/\.[^.]+$/,'').slice(0,60);const r=await KC.assets.upload(blob);
   const meta={name,project:proj,kind:'site',tags:'upload,studio',w,h,addedAt:new Date().toISOString(),url:r.url,src:'upload:'+name};if(KC.db){try{await KC.db.collection('photos').doc(r.id).set(meta)}catch(e){}}regUpload(r.id,meta);if(!first)first='u_'+r.id;n++}catch(e){console.warn('v115 upload',e)}}
 try{PM&&Object.keys(PM).forEach(k=>{if(k.startsWith('u_'))PM[k]=undefined})}catch(e){}
 if(n){toast(`${n} תמונות נכנסו לספרייה${proj?' של '+(PRJ()[proj]||proj):''}`);const sl=peSlots(PE.p);if(first&&sl.length){pePick(first)}else refresh()}else toast('ההעלאה נכשלה')}
document.addEventListener('change',e=>{const t=e.target;if(!t||!t.matches||!t.matches('[data-v115up]')||!PE.p)return;const files=[...(t.files||[])];t.value='';if(files.length)uploadMany(files)},true);
let qt=0;
document.addEventListener('input',e=>{const t=e.target;if(!t||!t.dataset||t.dataset.v115!=='q'||!PE.p)return;const L=state();L.q=t.value;clearTimeout(qt);qt=setTimeout(()=>{if(t.closest('#v115lib'))refresh();else{peRender();const n=document.querySelector('#pe-root [data-v115="q"]');if(n){n.focus();n.setSelectionRange(n.value.length,n.value.length)}}},220)},true);
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-v115]');if(!b||!PE.p)return;const a=b.dataset.v115;if(a==='q')return;e.preventDefault();e.stopPropagation();const L=state();
 if(a==='open')return openLib();if(a==='close')return closeLib();
 if(a==='src'){L.src=b.dataset.k}else if(a==='proj'){L.proj=b.dataset.k}else if(a==='kind'){L.kind=b.dataset.k}refresh()},true);
// a pick made inside the full screen library closes it
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('#v115lib [data-pe-a="pick"]');if(!b||!PE.p)return;setTimeout(closeLib,60)},true);
document.addEventListener('toggle',e=>{const d=e.target;if(!d||!d.matches||!d.matches('details.v115g'))return;const L=state();L.open[d.dataset.v115g]=d.open},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.getElementById('v115lib')){e.preventDefault();e.stopPropagation();closeLib()}},true);
if(typeof peClose==='function')peClose=(f=>function(){if(document.getElementById('v115lib')){closeLib();return}return f.apply(this,arguments)})(peClose);
window.__v115={openLib,closeLib,uploadMany,srcOf,filtered,state};
})();
