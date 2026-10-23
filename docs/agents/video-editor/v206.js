/*V206:START*/
// ================= V206 · one image component for the whole engine (KImg): save to the library with a real error when it fails,
// upload with progress, generate with OpenAI through /api/engine-image with clear errors and retry, and one picker sheet
// (upload / library / generated / generate new). In the post editor a click on a photo opens a small toolbar with
// "החלפת תמונה", fill or fit, and crop; the new photo goes into the same frame, keeping its zoom and fit. =================
(()=>{
if(window.__v206)return;window.__v206=1;
const E=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $=s=>document.querySelector(s);
const say=m=>{try{toast(m)}catch(e){console.log(m)}};
const TW=1080,TH=1350;
const PH=()=>{try{return PROJ_HE}catch(e){return {}}};
const projKey=v=>{if(!v)return '';const P=PH();if(P[v])return v;const k=Object.keys(P).find(k=>P[k]===v);return k||String(v)};
const MAXMB=25;
const TYPES=/^image\/(jpeg|png|webp|gif|avif)$/;

// ---------- errors: one sentence the user can act on ----------
const MSG={no_storage:'אין כאן הרשאה לשמור תמונות. פתחו את המנוע מתוך האתר (ניהול > מנוע תוכן) עם התחברות',db_failed:'התמונה הועלתה אבל לא נרשמה בספרייה. נסו שוב',upload_failed:'ההעלאה נכשלה. בדקו את החיבור ונסו שוב',too_large:'הקובץ גדול מדי (עד '+MAXMB+'MB)',bad_type:'אפשר להעלות JPG, PNG, WEBP או GIF',quota_or_state:'נגמר המקום בספרייה',
 no_site:'יצירת תמונות עובדת כשהמנוע פתוח מתוך האתר עם התחברות לאדמין',not_configured:'יצירת תמונות עוד לא מוגדרת: צריך OPENAI_API_KEY ב-Vercel > Settings > Environment Variables',auth:'החיבור לאדמין פג. התחברו מחדש ונסו שוב',rate_limited:'נוצרו הרבה תמונות ברצף. נסו שוב בעוד כמה דקות',
 timeout:'היצירה לקחה יותר מדי זמן. נסו איכות רגילה או פחות אפשרויות',blocked:'OpenAI סירב לתיאור הזה. נסחו אותו אחרת',provider_busy:'OpenAI עמוס כרגע. נסו שוב בעוד דקה',provider_auth:'מפתח OpenAI לא תקין או בלי הרשאה לתמונות. בודקים את OPENAI_API_KEY ב-Vercel',too_big_request:'התמונה לשינוי גדולה מדי. נסו שוב, היא תוקטן',
 network:'אין חיבור לשרת. בדקו את האינטרנט ונסו שוב',busy:'כבר נוצרת תמונה. מחכים שתסתיים',no_prompt:'כתבו מה ליצור',empty:'OpenAI לא החזיר תמונה. נסו שוב'};
function err(code,detail){const e=new Error(MSG[code]||detail||code);e.code=code;e.detail=detail;return e}
const msg=e=>(e&&MSG[e.code])||(e&&e.message)||'משהו נכשל';

// ---------- save: downscale, upload, register in the library. A failed library write is an error, never silent ----------
async function toBlob(src){if(src instanceof Blob)return src;if(typeof src==='string'){const r=await fetch(src);return await r.blob()}throw err('bad_type')}
async function save(src,meta){meta=meta||{};const blob0=await toBlob(src);if(blob0.type&&!TYPES.test(blob0.type))throw err('bad_type');if(blob0.size>MAXMB*1048576)throw err('too_large');
  const A=(typeof KC!=='undefined'&&KC.assets)||null;if(!A)throw err('no_storage');const on=meta.onStage||(()=>{});
  on('מכין את התמונה');const {blob,w,h}=await downscale(blob0);on('מעלה לענן');let up;try{up=await A.upload(blob)}catch(e){throw err(e&&e.code==='too_large'?'too_large':e&&e.code==='quota_or_state'?'quota_or_state':'upload_failed',e&&e.message)}
  const name=String(meta.name||'תמונה').replace(/\.[^.]+$/,'').replace(/\s+/g,' ').slice(0,60);
  const m={name,project:projKey(meta.project),kind:meta.kind||'site',tags:meta.tags||'',w,h,addedAt:new Date().toISOString(),url:up.url,src:meta.src||((meta.ai?'ai:':'upload:')+up.id)};if(meta.ai){m.ai=true;m.prompt=String(meta.prompt||'').slice(0,900)}
  on('שומר בספרייה');let ok=!KC.db;for(let i=0;i<3&&!ok;i++){try{await KC.db.collection('photos').doc(up.id).set(m);ok=true}catch(e){await new Promise(r=>setTimeout(r,500*(i+1)))}}
  regUpload(up.id,m);try{if(typeof PM!=='undefined')PM['u_'+up.id]=undefined}catch(e){}if(!ok)throw Object.assign(err('db_failed'),{k:'u_'+up.id});return {k:'u_'+up.id,id:up.id,url:up.url,meta:m}}

// ---------- generate ----------
const G={busy:false,recent:[],last:null};
async function jpegData(src,max){let img;if(src instanceof Blob)img=await loadImg(src);else{const u=PHOTO_LIB[src];if(!u)throw err('bad_type');img=await libImg(src);if(!img)throw err('bad_type')}const s=Math.min(1,max/Math.max(img.naturalWidth||img.width,img.naturalHeight||img.height));const c=document.createElement('canvas');c.width=Math.round((img.naturalWidth||img.width)*s);c.height=Math.round((img.naturalHeight||img.height)*s);c.getContext('2d').drawImage(img,0,0,c.width,c.height);try{return c.toDataURL('image/jpeg',.85)}catch(e){throw err('bad_type','tainted')}}
const sizeFor=ar=>!ar?'1024x1536':ar>1.15?'1536x1024':ar<0.87?'1024x1536':'1024x1024';
async function generate(o){o=o||{};const prompt=String(o.prompt||'').trim();if(!prompt)throw err('no_prompt');if(G.busy)throw err('busy');G.busy=true;
  try{const body={prompt,size:o.size||sizeFor(o.aspect),quality:o.quality||'medium',n:o.n||1};if(o.editFrom)body.image=await jpegData(o.editFrom,1024);
   let d;if(window.__kimgMock)d=await window.__kimgMock(body);else{const tok=window.__engineToken?await window.__engineToken():null;if(!tok)throw err('no_site');let r;try{r=await fetch('/api/engine-image',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+tok},body:JSON.stringify(body),signal:o.signal})}catch(e){if(e&&e.name==='AbortError')throw e;throw err('network')}
    if(r.status===413)throw err('too_big_request');d=await r.json().catch(()=>({}));if(!r.ok){throw err(d.code||(r.status===504?'timeout':r.status===401?'auth':'empty'),d.error)}}
   const out=(d.images||[]).map((b,i)=>{const u8=Uint8Array.from(atob(b),ch=>ch.charCodeAt(0));const blob=new Blob([u8],{type:'image/jpeg'});return {id:'g'+Date.now().toString(36)+i,blob,url:URL.createObjectURL(blob),prompt,size:body.size,quality:body.quality,model:d.model||'gpt-image-1',at:Date.now()}});if(!out.length)throw err('empty');
   G.recent.unshift(...out);G.recent.length=Math.min(G.recent.length,24);G.last={prompt,size:body.size,quality:body.quality,n:body.n};try{localStorage.setItem('v206_gen',JSON.stringify(G.last))}catch(e){}return out}finally{G.busy=false}}
try{G.last=JSON.parse(localStorage.getItem('v206_gen')||'null')}catch(e){}

// ---------- the library as a list ----------
function libList(){let ks=[];try{ks=libKeys()}catch(e){ks=Object.keys(PHOTO_LIB||{})}return ks.filter(k=>PHOTO_LIB[k]).map(k=>{let m={};try{m=metaOf(k)}catch(e){}const up=k.startsWith('u_')&&typeof KC!=='undefined'&&KC.up?KC.up[k.slice(2)]||{}:{};return {k,url:PHOTO_LIB[k],name:m.n||LIB_NAMES[k]||'תמונה',p:m.p||up.project||'',kind:m.k||'site',ai:!!(up.ai||/(^|,)ai(,|$)/.test(m.t||'')||/^AI/.test(m.n||'')),at:up.addedAt||''}})}
const thumbOf=u=>u;

// ---------- the picker sheet ----------
const P={open:false,tab:'lib',q:'',proj:'',kind:'',lim:90,res:null,opt:{},stage:'',err:null,gen:{prompt:'',quality:'medium',n:2},results:[],ret:null};
function pick(opt){opt=opt||{};if(P.open)close(null);Object.assign(P,{open:true,opt,tab:opt.tab||'lib',q:'',lim:90,stage:'',err:null,ret:document.activeElement,proj:opt.project!=null?projKey(opt.project):''});P.gen.prompt=opt.prompt||(G.last&&G.last.prompt)||'';if(G.last){P.gen.quality=G.last.quality||'medium';P.gen.n=G.last.n||2}P.results=G.recent.slice(0,8);
  return new Promise(res=>{P.res=res;render();setTimeout(()=>{const f=$('#v206pk [data-v206f]')||$('#v206pk .v206tabs [aria-selected=true]');f&&f.focus()},30)})}
function close(v){const el=$('#v206pk');if(el)el.remove();P.open=false;const r=P.res;P.res=null;document.body.classList.remove('v206lock');try{P.ret&&P.ret.focus&&P.ret.focus()}catch(e){}if(r)r(v||null)}
const TABS=[['up','העלאה מהמכשיר'],['lib','ספריית התמונות'],['ai','תמונות שנוצרו'],['gen','יצירת תמונה חדשה']];
function render(){let el=$('#v206pk');if(!el){el=document.createElement('div');el.id='v206pk';el.className='v206pk';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-labelledby','v206pkt');document.body.appendChild(el);document.body.classList.add('v206lock')}
  const st=$('#v206pk .v206body');const sc=st?st.scrollTop:0;
  el.innerHTML=`<div class="v206bk" data-v206="x"></div><section class="v206sh"><header><h2 id="v206pkt">${E(P.opt.title||'בחירת תמונה')}</h2>${P.opt.sub?`<p>${E(P.opt.sub)}</p>`:''}<button type="button" class="v206ib" data-v206="x" aria-label="סגירה">✕</button></header>
   <div class="v206tabs" role="tablist">${TABS.filter(t=>t[0]!=='gen'||P.opt.allowGen!==false).map(([k,l])=>`<button type="button" role="tab" aria-selected="${P.tab===k}" data-v206="tab" data-t="${k}">${l}</button>`).join('')}</div>
   <div class="v206body">${body()}</div>${P.stage?`<div class="v206stage" role="status"><span class="v206spin"></span>${E(P.stage)}</div>`:''}</section>`;
  const nb=$('#v206pk .v206body');if(nb)nb.scrollTop=sc}
function grid(list,empty){if(!list.length)return `<p class="v206empty">${empty}</p>`;return `<div class="v206grid">${list.slice(0,P.lim).map(x=>`<button type="button" class="v206it" data-v206="use" data-k="${E(x.k)}" title="${E(x.name)}"><img src="${E(thumbOf(x.url))}" alt="${E(x.name)}" loading="lazy" decoding="async"><span>${E(x.name)}</span></button>`).join('')}</div>${list.length>P.lim?`<button type="button" class="v206more" data-v206="more">עוד ${list.length-P.lim} תמונות</button>`:''}`}
function body(){const t=P.tab;
  if(t==='up')return `<label class="v206drop" data-v206drop><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" data-v206f="file" class="v206file"><b>גררו לכאן תמונה או לחצו לבחירה</b><span>JPG, PNG או WEBP עד ${MAXMB}MB. התמונה נשמרת בספרייה${P.opt.project?' של '+E(PH()[projKey(P.opt.project)]||P.opt.project):''} ונכנסת ${P.opt.verb||'לעיצוב'}.</span></label>${P.err?errBox():''}`;
  if(t==='lib'||t==='ai'){const all=libList();const q=P.q.trim().toLowerCase();let L=all.filter(x=>(t!=='ai'||x.ai)&&(!P.proj||x.p===P.proj)&&(!P.kind||x.kind===P.kind)&&(!q||x.name.toLowerCase().includes(q)||(PH()[x.p]||'').includes(q)));L.sort((a,b)=>(b.at||'').localeCompare(a.at||''));
   const projs=[...new Set(all.map(x=>x.p).filter(Boolean))];
   return `<div class="v206flt"><label class="v206fl"><span>חיפוש</span><input type="search" data-v206f="q" value="${E(P.q)}" placeholder="שם או פרויקט"></label><label class="v206fl"><span>פרויקט</span><select data-v206f="proj"><option value="">כל הפרויקטים</option>${projs.map(p=>`<option value="${E(p)}"${P.proj===p?' selected':''}>${E(PH()[p]||p)}</option>`).join('')}</select></label>${t==='lib'?`<label class="v206fl"><span>סוג</span><select data-v206f="kind"><option value="">הכל</option>${[['site','צילום'],['render','הדמיה'],['aerial','רחפן'],['brand','מותג']].map(([k,l])=>`<option value="${k}"${P.kind===k?' selected':''}>${l}</option>`).join('')}</select></label>`:''}<small>${L.length} תמונות</small></div>
    ${t==='ai'&&G.recent.length?`<h3>מהסשן הזה (עוד לא נשמרו)</h3>${resGrid(G.recent)}`:''}${t==='ai'&&G.recent.length?'<h3>שמורות בספרייה</h3>':''}${grid(L,t==='ai'?'עוד אין תמונות שנוצרו ב-AI. בלשונית "יצירת תמונה חדשה" כותבים תיאור ולוחצים "יצירת תמונה".':P.proj||P.q||P.kind?'אין תמונות שמתאימות לסינון. נקו את הסינון או בחרו "כל הפרויקטים".':'הספרייה ריקה. מעלים תמונה בלשונית "העלאה מהמכשיר".')}`}
  if(t==='gen'){const g=P.gen;return `<form class="v206gen" data-v206form="gen"><label class="v206fl wide"><span>מה ליצור</span><textarea data-v206f="prompt" rows="4" required placeholder='למשל: "בניין מגורים בוטיק בן 6 קומות, אבן בהירה ומרפסות זכוכית, שעת זהב, צילום ארכיטקטוני"'>${E(g.prompt)}</textarea></label>
    <div class="v206row"><label class="v206fl"><span>איכות</span><select data-v206f="quality">${[['medium','רגילה (כ-20 שניות)'],['high','גבוהה (עד דקה)'],['low','מהירה, לטיוטה']].map(([k,l])=>`<option value="${k}"${g.quality===k?' selected':''}>${l}</option>`).join('')}</select></label><label class="v206fl"><span>כמה אפשרויות</span><select data-v206f="n">${[1,2,4].map(n=>`<option value="${n}"${+g.n===n?' selected':''}>${n}</option>`).join('')}</select></label>
     ${P.opt.editFrom?`<label class="v206tg"><input type="checkbox" data-v206f="edit"${g.edit?' checked':''}> שינוי של התמונה הנוכחית במקום תמונה חדשה</label>`:''}</div>
    <p class="v206hint">השירות: OpenAI gpt-image-1, דרך השרת של האתר. גודל ${sizeFor(P.opt.aspect).replace('x','×')} לפי מסגרת התמונה. התיאור נשמר, אפשר לשנות ולנסות שוב.</p>
    <div class="v206row"><button type="submit" class="v206b pri" ${G.busy?'disabled':''}>${G.busy?'יוצר…':'יצירת תמונה'}</button>${G.busy?'<button type="button" class="v206b" data-v206="stop">עצירה</button>':''}</div></form>${P.err?errBox():''}
    ${P.results.length?`<h3>התוצאות</h3>${resGrid(P.results)}`:''}`}
  return ''}
function resGrid(list){return `<div class="v206grid res">${list.map(r=>`<figure class="v206res"><img src="${r.url}" alt="${E(r.prompt)}"><figcaption>${r.saved?'<small>נשמרה בספרייה</small>':''}<div class="v206row"><button type="button" class="v206b pri" data-v206="gUse" data-id="${r.id}">${E(P.opt.useLabel||'שימוש בתמונה')}</button><button type="button" class="v206b" data-v206="gSave" data-id="${r.id}" ${r.saved?'disabled':''}>שמירה לספרייה</button><a class="v206b" href="${r.url}" download="kurkoos-ai.jpg">הורדה</a><button type="button" class="v206b" data-v206="gAgain" data-id="${r.id}">שוב עם התיאור</button></div></figcaption></figure>`).join('')}</div>`}
function errBox(){const e=P.err;return `<div class="v206err" role="alert"><b>${E(msg(e))}</b>${e.detail&&e.detail!==msg(e)?`<small>${E(String(e.detail).slice(0,200))}</small>`:''}${e.retry?'<button type="button" class="v206b" data-v206="retry">לנסות שוב</button>':''}</div>`}
let AB=null,lastFile=null;
async function doUpload(f){P.err=null;lastFile=f;if(!f)return;if(!TYPES.test(f.type)){P.err=err('bad_type');render();return}if(f.size>MAXMB*1048576){P.err=err('too_large');render();return}
  try{const r=await save(f,{name:f.name,project:P.opt.project,tags:P.opt.tags||'upload',onStage:s=>{P.stage=s;render()}});P.stage='';close({k:r.k,from:'upload'})}catch(e){P.stage='';P.err=Object.assign(e,{retry:true});render()}}
async function doGen(){const fm=$('#v206pk form[data-v206form="gen"]');if(fm){P.gen.prompt=fm.querySelector('[data-v206f="prompt"]').value;P.gen.quality=fm.querySelector('[data-v206f="quality"]').value;P.gen.n=+fm.querySelector('[data-v206f="n"]').value;const ed=fm.querySelector('[data-v206f="edit"]');P.gen.edit=!!(ed&&ed.checked)}
  P.err=null;AB=new AbortController();P.stage='יוצר תמונה ב-OpenAI. זה לוקח 15 עד 60 שניות';render();
  try{const out=await generate({prompt:P.gen.prompt,quality:P.gen.quality,n:P.gen.n,aspect:P.opt.aspect,editFrom:P.gen.edit?P.opt.editFrom:null,signal:AB.signal});P.results=out.concat(P.results.filter(r=>!out.includes(r))).slice(0,12)}catch(e){if(e&&e.name!=='AbortError')P.err=Object.assign(e,{retry:true})}P.stage='';AB=null;if(P.open)render()}
async function saveGen(r,use){if(r.saving)return;r.saving=true;P.err=null;try{const s=await save(r.blob,{name:'AI · '+r.prompt,project:P.opt.project,kind:'site',tags:'ai,chatgpt',ai:true,prompt:r.prompt,onStage:x=>{P.stage=x;render()}});r.saved=s.k;P.stage='';if(use)close({k:s.k,from:'ai'});else{render();say('התמונה נשמרה בספרייה')}}catch(e){P.stage='';P.err=Object.assign(e,{retry:false});render()}r.saving=false}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('#v206pk [data-v206]');if(!b)return;const a=b.dataset.v206;e.preventDefault();
  if(a==='x')return close(null);if(a==='tab'){P.tab=b.dataset.t;P.err=null;P.lim=90;render();const f=$('#v206pk [data-v206f]');return}if(a==='more'){P.lim+=90;return render()}
  if(a==='use')return close({k:b.dataset.k,from:P.tab});if(a==='retry'){if(P.tab==='up'&&lastFile)return doUpload(lastFile);if(P.tab==='gen')return doGen();return}
  if(a==='stop'){if(AB)AB.abort();return}const r=G.recent.find(x=>x.id===b.dataset.id)||P.results.find(x=>x.id===b.dataset.id);
  if(a==='gUse'&&r){if(r.saved)return close({k:r.saved,from:'ai'});return saveGen(r,true)}if(a==='gSave'&&r)return saveGen(r,false);if(a==='gAgain'&&r){P.tab='gen';P.gen.prompt=r.prompt;render();const ta=$('#v206pk [data-v206f="prompt"]');if(ta){ta.focus();ta.setSelectionRange(ta.value.length,ta.value.length)}}},true);
document.addEventListener('submit',e=>{if(!e.target.closest||!e.target.closest('#v206pk'))return;e.preventDefault();doGen()},true);
document.addEventListener('change',e=>{const t=e.target;if(!t.closest||!t.closest('#v206pk'))return;const f=t.dataset.v206f;if(f==='file'){const x=t.files&&t.files[0];t.value='';doUpload(x)}else if(f==='proj'||f==='kind'){P[f]=t.value;P.lim=90;render()}else if(f==='quality'||f==='n')P.gen[f]=f==='n'?+t.value:t.value;else if(f==='edit')P.gen.edit=t.checked},true);
let qT=0;document.addEventListener('input',e=>{const t=e.target;if(!t.closest||!t.closest('#v206pk'))return;if(t.dataset.v206f==='q'){P.q=t.value;clearTimeout(qT);qT=setTimeout(()=>{render();const i=$('#v206pk [data-v206f="q"]');if(i){i.focus();i.setSelectionRange(i.value.length,i.value.length)}},180)}else if(t.dataset.v206f==='prompt')P.gen.prompt=t.value},true);
document.addEventListener('keydown',e=>{if(!P.open)return;if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close(null);return}if(e.key==='Tab'){const f=[...document.querySelectorAll('#v206pk button:not([disabled]),#v206pk input,#v206pk select,#v206pk textarea,#v206pk a[href]')].filter(x=>x.offsetParent!==null);if(!f.length)return;const i=f.indexOf(document.activeElement);if(e.shiftKey&&i<=0){e.preventDefault();f[f.length-1].focus()}else if(!e.shiftKey&&i===f.length-1){e.preventDefault();f[0].focus()}}},true);
['dragover','drop'].forEach(ev=>document.addEventListener(ev,e=>{const z=e.target.closest&&e.target.closest('#v206pk [data-v206drop]');if(!z)return;e.preventDefault();e.stopPropagation();if(ev==='drop'){const f=[...(e.dataTransfer.files||[])].find(x=>/^image\//.test(x.type));if(f)doUpload(f)}},true));

window.KImg={save,generate,pick,close,msg,err,libList,sizeFor,projKey,G,P};

// ---------- the post editor: a photo on the canvas is clickable ----------
const SL={id:null,list:[]};
// template photo elements are drawn without the selection recorder; their frames are known from the template itself
if(window.__v50el){const prev=window.__v50el;window.__v50el=function(c,f,e,ix,p){if(SL.rec&&e&&/^(photo|pphoto|cphoto)$/.test(e.t)){let b=null;if(e.pts){const xs=e.pts.map(q=>q[0]),ys=e.pts.map(q=>q[1]);b={x:Math.min(...xs),y:Math.min(...ys),w:Math.max(...xs)-Math.min(...xs),h:Math.max(...ys)-Math.min(...ys)}}else if(e.w&&e.h)b={x:e.x,y:e.y,w:e.w,h:e.h};if(b)SL.list.push({s:e.s||0,box:b,r:e.r||0})}return prev.apply(this,arguments)}}
if(typeof peCanvas==='function')peCanvas=(f=>function(p){const mine=typeof PE!=='undefined'&&PE.p&&p===PE.p&&!PE.cmp;if(!mine)return f.apply(this,arguments);SL.rec=true;SL.list=[];try{return f.apply(this,arguments)}finally{SL.rec=false;SL.id=p.id;setTimeout(paintSel,0)}})(peCanvas);
function slotIndex(s){const sl=peSlots(PE.p);const want=s===0?['shot','shots[0]']:['shots['+s+']'];let i=sl.findIndex(x=>want.includes(x.path));if(i<0)i=Math.min(s,sl.length-1);return i}
const cv=()=>document.getElementById('pe-cv');
function toT(ev){const c=cv();if(!c)return null;const r=c.getBoundingClientRect();if(!r.width)return null;return {x:(ev.clientX-r.left)/r.width*TW,y:(ev.clientY-r.top)/r.height*TH,r}}
function canEdit(){return typeof PE!=='undefined'&&PE.p&&(!PE.fmt||PE.fmt==='45')&&!PE.cmp}
function slotAt(pt){if(!pt||SL.id!==(PE.p&&PE.p.id))return null;for(let i=SL.list.length-1;i>=0;i--){const b=SL.list[i].box;if(pt.x>=b.x&&pt.x<=b.x+b.w&&pt.y>=b.y&&pt.y<=b.y+b.h)return SL.list[i]}return null}
function v53img(){try{const S=window.__v53&&__v53.SEL;const arr=Array.isArray(S)?S:S&&S.items?S.items:S?[S]:[];if(arr.length!==1)return null;const it=arr[0];const o=it&&it.o;if(o&&o.type==='image')return {it,o:(PE.p.fx.objs||[]).find(x=>x.id===o.id)||o};return null}catch(e){return null}}
function v53any(){try{const S=window.__v53&&__v53.SEL;return Array.isArray(S)?S.length>0:!!(S&&(S.items?S.items.length:true))}catch(e){return false}}
const TB={on:null,down:null};
window.addEventListener('pointerdown',e=>{if(e.target.id!=='pe-cv'||!canEdit())return;const pt=toT(e);TB.down={x:e.clientX,y:e.clientY,t:Date.now()};const hit=slotAt(pt);if(hit){const i=slotIndex(hit.s);if(i>=0&&PE.slot!==i){PE.slot=i}}},true);
window.addEventListener('pointerup',e=>{if(e.target.id!=='pe-cv'||!canEdit()||!TB.down)return;const d=TB.down;TB.down=null;if(Math.hypot(e.clientX-d.x,e.clientY-d.y)>5)return;const pt=toT(e);setTimeout(()=>{const im=v53img();if(im){TB.on={kind:'layer',id:im.o.id};paintSel();return}if(v53any()){TB.on=null;paintSel();return}const hit=slotAt(pt);TB.on=hit?{kind:'slot',s:hit.s,i:slotIndex(hit.s)}:null;paintSel()},40)},true);
window.addEventListener('pointermove',e=>{if(e.target.id!=='pe-cv'||!canEdit()||e.buttons)return;const hit=slotAt(toT(e));const h=$('#v206hov');if(!hit||(TB.on&&TB.on.kind==='slot'&&TB.on.s===hit.s)){if(h)h.hidden=true;return}place(h||mkHov(),hit.box,true)},true);
function mkHov(){const h=document.createElement('div');h.id='v206hov';h.className='v206hov';h.setAttribute('aria-hidden','true');(cv().parentElement||document.body).appendChild(h);return h}
function place(el,b,hov){const c=cv();if(!c||!el)return;const host=el.parentElement;const r=c.getBoundingClientRect(),hr=host.getBoundingClientRect();const k=r.width/TW;Object.assign(el.style,{left:(r.left-hr.left+b.x*k)+'px',top:(r.top-hr.top+b.y*TH*k/TH)+'px',width:(b.w*k)+'px',height:(b.h*k)+'px'});el.hidden=false}
function paintSel(){const c=cv();let box=$('#v206sel'),tb=$('#v206tb');if(!c||!TB.on||!PE.p||!canEdit()){if(box)box.hidden=true;if(tb)tb.hidden=true;return}const host=c.parentElement;if(getComputedStyle(host).position==='static')host.style.position='relative';
  let b=null,fit='cover';if(TB.on.kind==='slot'){const x=SL.list.find(q=>q.s===TB.on.s);if(!x){TB.on=null;return paintSel()}b=x.box;const sl=peSlots(PE.p)[TB.on.i];fit=sl&&sl.o.fit==='contain'?'contain':'cover'}else{const o=(PE.p.fx.objs||[]).find(x=>x.id===TB.on.id);if(!o){TB.on=null;return paintSel()}fit=o.fit==='contain'?'contain':'cover'}
  if(b){if(!box){box=document.createElement('div');box.id='v206sel';box.className='v206sel';box.setAttribute('aria-hidden','true');host.appendChild(box)}place(box,b)}else if(box)box.hidden=true;
  if(!tb){tb=document.createElement('div');tb.id='v206tb';tb.className='v206tb';tb.setAttribute('role','toolbar');tb.setAttribute('aria-label','פעולות לתמונה');host.appendChild(tb)}
  tb.innerHTML=`<button type="button" class="v206b pri" data-v206e="replace">החלפת תמונה</button><span class="v206seg" role="group" aria-label="איך התמונה ממלאת את המסגרת"><button type="button" data-v206e="fit" data-f="cover" aria-pressed="${fit==='cover'}">מילוי</button><button type="button" data-v206e="fit" data-f="contain" aria-pressed="${fit==='contain'}">התאמה</button></span>${TB.on.kind==='slot'?'<button type="button" class="v206b" data-v206e="crop">מיקום וחיתוך</button><button type="button" class="v206b" data-v206e="light">תאורה</button>':''}<button type="button" class="v206ib" data-v206e="off" aria-label="סגירת סרגל התמונה">✕</button>`;tb.hidden=false;
  const r=c.getBoundingClientRect(),hr=host.getBoundingClientRect();const k=r.width/TW;const top=b?r.top-hr.top+b.y*k-tb.offsetHeight-8:r.top-hr.top+8;tb.style.top=Math.max(4,top<4&&b?r.top-hr.top+(b.y+b.h)*k+8:top)+'px';tb.style.left=Math.max(4,Math.min(hr.width-tb.offsetWidth-4,(b?r.left-hr.left+(b.x+b.w/2)*k:r.left-hr.left+r.width/2)-tb.offsetWidth/2))+'px'}
window.addEventListener('resize',()=>setTimeout(paintSel,50));
document.addEventListener('scroll',()=>{if(TB.on)paintSel()},true);
// replace the image of a slot in place: the frame, the zoom and the fit stay
async function replaceSlot(i,opt){const sl=peSlots(PE.p);const cur=sl[i];const ar=(()=>{const x=SL.list.find(q=>slotIndex(q.s)===i);return x?x.box.w/x.box.h:4/5})();
  const r=await pick(Object.assign({title:'החלפת תמונה',sub:cur?'התמונה החדשה תיכנס לאותה מסגרת, באותו גודל ומיקום':'',project:PE.p.project,aspect:ar,verb:'למסגרת שבחרתם',useLabel:'שימוש בתמונה',editFrom:cur&&!cur.legacy?cur.o.k:null,tags:'upload,studio'},opt||{}));if(!r||!PE.p)return false;
  PE.slot=Math.max(0,i);const before=cur?{fit:cur.o.fit,flip:cur.o.flip}:{};pePick(r.k);const now=peSlots(PE.p)[PE.slot];if(now&&before.fit)now.o.fit=before.fit;if(now&&before.flip!=null)now.o.flip=before.flip;try{peSyncKeys(PE.p)}catch(e){}try{TC&&TC.clear&&TC.clear()}catch(e){}
  await (typeof libImg==='function'?libImg(r.k):null);try{peRender()}catch(e){}say('התמונה הוחלפה. ביטול (Ctrl+Z) מחזיר את הקודמת');return true}
async function replaceLayer(id){const o=(PE.p.fx.objs||[]).find(x=>x.id===id);if(!o)return;const r=await pick({title:'החלפת תמונה',sub:'התמונה החדשה תיכנס לאותה מסגרת',project:PE.p.project,aspect:(o.w&&o.h)?o.w/o.h:1,editFrom:o.k});if(!r)return;try{pePush()}catch(e){}o.k=r.k;await libImg(r.k);try{peRender()}catch(e){}say('התמונה הוחלפה. ביטול (Ctrl+Z) מחזיר את הקודמת')}
document.addEventListener('click',async e=>{const b=e.target.closest&&e.target.closest('[data-v206e]');if(!b||!PE.p)return;e.preventDefault();e.stopPropagation();const a=b.dataset.v206e;const on=TB.on;
  if(a==='off'){TB.on=null;return paintSel()}
  if(a==='replace'||a==='replaceAny'){if(a==='replaceAny'||!on){const sl=peSlots(PE.p);if(!sl.length){const r=await pick({title:'הוספת תמונה לפוסט',project:PE.p.project});if(r){pePick(r.k);try{peRender()}catch(x){}}return}return replaceSlot(PE.slot||0)}if(on.kind==='slot')return replaceSlot(on.i);return replaceLayer(on.id)}
  if(a==='fit'&&on){try{pePush()}catch(x){}const f=b.dataset.f;if(on.kind==='slot'){const s=peSlots(PE.p)[on.i];if(s&&!s.legacy){if(f==='contain')s.o.fit='contain';else delete s.o.fit}}else{const o=(PE.p.fx.objs||[]).find(x=>x.id===on.id);if(o){if(f==='contain')o.fit='contain';else delete o.fit}}try{TC&&TC.clear&&TC.clear()}catch(x){}try{peRender()}catch(x){}return}
  if(a==='crop'||a==='light'){PE.tab=a==='crop'?'image':'light';try{peRender()}catch(x){}setTimeout(()=>{const d=document.querySelector('.pe-body details.v175crop,.pe-body details');if(a==='crop'&&d&&!d.open)d.open=true},60)}},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&TB.on&&!P.open){TB.on=null;paintSel()}});
// the editor header always has a way in, also for designs whose photo is drawn by hand-made layouts
if(typeof peRender==='function')peRender=(f=>function(){const r=f.apply(this,arguments);try{const top=document.querySelector('.pe-top');if(top&&!top.querySelector('[data-v206e="replaceAny"]')){const b=document.createElement('button');b.type='button';b.className='v206b v206hdr';b.dataset.v206e='replaceAny';b.textContent='החלפת תמונה';b.title='החלפת התמונה שנבחרה (או הראשית) בתמונה מהמכשיר, מהספרייה או מ-AI';const ref=top.querySelector('[data-pe-a="close"]');ref&&ref.nextSibling?top.insertBefore(b,ref.nextSibling):top.appendChild(b)}
  const body=document.querySelector('.pe-body');if(PE.tab==='image'&&body&&!body.querySelector('.v206imgbar')){const d=document.createElement('div');d.className='v206imgbar';d.innerHTML=`<button type="button" class="v206b pri" data-v206e="replaceAny">החלפת תמונה…</button><span>מהמכשיר, מהספרייה, מתמונות שנוצרו, או יצירה חדשה. אפשר גם ללחוץ על התמונה בעיצוב עצמו.</span>`;body.insertBefore(d,body.firstChild)}}catch(e){}setTimeout(paintSel,0);return r})(peRender);
if(typeof peClose==='function')peClose=(f=>function(){TB.on=null;['#v206sel','#v206tb','#v206hov'].forEach(s=>{const x=$(s);x&&x.remove()});return f.apply(this,arguments)})(peClose);

// ---------- uploads that went through other paths now persist and report their failures ----------
if(typeof peUploadInto==='function')peUploadInto=(f=>async function(file){if(!file||!/^image\//.test(file.type))return say('בחרו קובץ תמונה');if(typeof KC==='undefined'||!KC.assets)return f.apply(this,arguments);
  say('מעלה את התמונה…');try{const r=await save(file,{name:file.name,project:PE.p&&PE.p.project,tags:'upload,studio'});const i=PE.slot||0;const cur=peSlots(PE.p)[i];const keep=cur?{fit:cur.o.fit,flip:cur.o.flip}:{};pePick(r.k);const now=peSlots(PE.p)[PE.slot];if(now&&keep.fit)now.o.fit=keep.fit;if(now&&keep.flip!=null)now.o.flip=keep.flip;await libImg(r.k);try{peRender()}catch(e){}say('התמונה הוחלפה ונשמרה בספרייה')}catch(e){say(msg(e))}})(peUploadInto);
window.__v206={SL,TB,replaceSlot,replaceLayer,paintSel,slotAt,slotIndex};
})();
/*V206:END*/
