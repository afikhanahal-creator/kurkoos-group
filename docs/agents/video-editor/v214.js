/*V214:START*/
// ================= V214 · the video studio for people who are not editors: a video from a prompt (OpenAI Sora or Google Veo
// through the site's server, asynchronous with real progress, saved to our media bucket and opened as a project), a row of
// one click actions on every project (subtitles, logo, title, music, cut silences, export), and a short guide strip that
// explains the three areas and can be dismissed. =================
(()=>{
if(window.__v214)return;window.__v214=1;
const E=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $=s=>document.querySelector(s);const say=m=>{try{toast(m)}catch(e){}};
const LS=(k,d)=>{try{return JSON.parse(localStorage.getItem(k)||'null')??d}catch(e){return d}};const SS=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
const G={jobs:LS('v214_jobs',[]),form:Object.assign({prompt:'',seconds:'8',size:'720x1280'},LS('v214_form',{})),busy:false,err:null,info:null};
const MSG={not_configured:'יצירת וידאו עוד לא מוגדרת. מוסיפים מפתח ב-Vercel (ראו "חיבורים" בהגדרות)',auth:'החיבור לאדמין פג. התחברו מחדש',rate_limited:'נוצרו הרבה סרטונים בשעה האחרונה. נסו שוב מאוחר יותר',blocked:'ספק הווידאו סירב לתיאור הזה. נסחו אחרת, בלי אנשים אמיתיים או מותגים',provider_busy:'ספק הווידאו עמוס. נסו שוב בעוד דקה',provider_auth:'המפתח של ספק הווידאו לא תקין או בלי הרשאה לווידאו',network:'אין חיבור לשרת',no_site:'יצירת וידאו עובדת כשהמנוע פתוח מתוך האתר עם התחברות לאדמין',timeout:'הסרטון לא הסתיים בזמן. אפשר לנסות שוב'};
const msg=e=>(e&&MSG[e.code])||(e&&e.message)||'משהו נכשל';
async function token(){return window.__engineToken?await window.__engineToken():null}
async function api(body){if(window.__v214mock)return window.__v214mock(body);const tok=await token();if(!tok){const e=new Error('no');e.code='no_site';throw e}let r;try{r=await fetch('/api/video-gen',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+tok},body:JSON.stringify(body)})}catch(x){const e=new Error('net');e.code='network';throw e}const d=await r.json().catch(()=>({}));if(!r.ok){const e=new Error(d.error||('HTTP '+r.status));e.code=d.code||(r.status===401?'auth':'provider_error');throw e}return d}
// ---------- the generator card in the studio library ----------
function card(){const f=G.form;const j=G.jobs.filter(x=>x.status!=='done'&&x.status!=='failed');const done=G.jobs.filter(x=>x.status==='done').slice(-3);
  return `<section class="v214gen" id="v214gen" aria-label="יצירת סרטון מפרומפט"><div class="v214hd"><b>✦ סרטון חדש מתיאור</b><small>${G.info?(G.info.configured?`מחובר: ${G.info.provider==='veo'?'Google Veo':'OpenAI Sora'} (${E(G.info.model)})`:'לא מוגדר עדיין: צריך מפתח ב-Vercel'):''}</small></div>
   <form data-v214="gen"><label class="v214fl"><span>מה לצלם</span><textarea data-v214f="prompt" rows="3" placeholder='למשל: "טיסת רחפן איטית מעל וילה לבנה מודרנית עם בריכה, שעת זהב, הוד השרון"' required>${E(f.prompt)}</textarea></label>
   <div class="v214row"><label class="v214fl"><span>אורך</span><select data-v214f="seconds">${[['4','4 שניות'],['8','8 שניות'],['12','12 שניות']].map(([k,l])=>`<option value="${k}"${f.seconds===k?' selected':''}>${l}</option>`).join('')}</select></label><label class="v214fl"><span>פורמט</span><select data-v214f="size">${[['720x1280','אנכי 9:16 (רילס, סטורי)'],['1280x720','אופקי 16:9']].map(([k,l])=>`<option value="${k}"${f.size===k?' selected':''}>${l}</option>`).join('')}</select></label><label class="v214fl"><span>פריים ראשון (לא חובה)</span><span class="v214pick">${f.image?`<img src="${f.image}" alt=""><button type="button" class="v204b" data-v214="imgx">הסרה</button>`:`<button type="button" class="v204b" data-v214="img">בחירת תמונה</button>`}</span></label></div>
   <div class="v214row"><button type="submit" class="v204b pri" ${G.busy?'disabled':''}>יצירת הסרטון</button><span class="v204hint">הסרטון נוצר אצל ספק הווידאו (כמה דקות), נשמר בענן שלנו ונפתח כאן לעריכה: כתוביות, לוגו, מוזיקה וייצוא.</span></div></form>
   ${G.err?`<div class="v214err" role="alert"><b>${E(msg(G.err))}</b><button type="button" class="v204b" data-v214="retry">לנסות שוב</button></div>`:''}
   ${j.length?`<div class="v214jobs">${j.map(x=>`<div class="v214job" data-id="${E(x.id)}"><b>${E(x.prompt.slice(0,60))}</b><span class="v204xbar"><i style="width:${x.progress||3}%"></i></span><small>${({queued:'בתור אצל הספק',in_progress:'מצלם',finishing:'שומר בענן'})[x.status]||x.status}${x.progress?' · '+x.progress+'%':''} · ${Math.round((Date.now()-x.at)/60000)} דק׳</small><button type="button" class="v204b" data-v214="drop" data-id="${E(x.id)}">הסרה מהרשימה</button></div>`).join('')}</div>`:''}
   ${done.length?`<p class="v204hint">נוצרו לאחרונה: ${done.map(x=>E(x.prompt.slice(0,30))).join(' · ')}</p>`:''}</section>`}
function paint(){const lib=$('.v204lib');if(!lib)return;const old=$('#v214gen');const html=card();if(old){const ae=document.activeElement;if(ae&&old.contains(ae)&&/INPUT|TEXTAREA|SELECT/.test(ae.tagName))return;old.outerHTML=html}else{const d=lib.querySelector('.v204drop');if(d)d.insertAdjacentHTML('afterend',html);else lib.insertAdjacentHTML('afterbegin',html)}}
async function loadInfo(){if(G.info)return;try{const r=await fetch('/api/status');const d=await r.json();G.info=d.video||null;paint()}catch(e){}}
// ---------- jobs: start, poll every 8 s, finish, open ----------
let pollT=0;
async function start(){const f=G.form;if(!f.prompt.trim()){say('כתבו מה לצלם');return}G.err=null;G.busy=true;paint();
  try{const d=await api({op:'start',prompt:f.prompt,seconds:f.seconds,size:f.size,image:f.image||undefined});G.jobs.push({id:d.id,prompt:f.prompt,seconds:f.seconds,size:f.size,status:d.status||'queued',progress:d.progress||0,at:Date.now(),provider:d.provider});SS('v214_jobs',G.jobs);say('הסרטון בייצור. אפשר להמשיך לעבוד, נעדכן כאן')}catch(e){G.err=e}G.busy=false;paint();poll()}
async function poll(){clearTimeout(pollT);const live=G.jobs.filter(x=>x.status!=='done'&&x.status!=='failed');if(!live.length)return;
  for(const j of live){try{if(j.status==='finishing')continue;const s=await api({op:'status',id:j.id});j.status=s.status;j.progress=s.progress||j.progress;if(s.status==='failed'){j.error=s.error||'הספק דיווח על כישלון';G.err={code:'provider_error',message:'יצירת הסרטון נכשלה: '+j.error}}else if(s.status==='completed'){j.status='finishing';paint();await finish(j)}}catch(e){if(e.code==='no_site'||e.code==='auth'||e.code==='not_configured'){G.err=e;j.status='failed';j.error=msg(e)}else if(Date.now()-j.at>40*60000){j.status='failed';j.error='לא הסתיים אחרי 40 דקות';G.err={code:'timeout'}}}}
  SS('v214_jobs',G.jobs);paint();if(G.jobs.some(x=>x.status!=='done'&&x.status!=='failed'))pollT=setTimeout(poll,8000)}
async function finish(j){try{const d=await api({op:'finish',id:j.id});let url=d.url;if(!url&&d.stream){const tok=await token();const r=await fetch('/api/video-gen',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+tok},body:JSON.stringify({op:'content',id:j.id})});const b=await r.blob();const as=(typeof KC!=='undefined'&&KC.assets)||null;if(!as)throw Object.assign(new Error('x'),{code:'no_site'});const up=await as.upload(b,{ext:'mp4'});url=up.url}
   j.status='done';j.url=url;SS('v214_jobs',G.jobs);const name=('AI · '+j.prompt).slice(0,60);try{if(typeof KC!=='undefined'&&KC.db)await KC.db.collection('videos').doc('vg_'+String(j.id).replace(/[^a-z0-9]/gi,'').slice(-24)).set({name,srcUrl:url,ai:true,prompt:j.prompt,created:new Date().toISOString(),kind:'ai'})}catch(e){}
   say('הסרטון מוכן. פותחים אותו לעריכה');if(window.__v204&&__v204.fromSource)await __v204.fromSource({name,url,from:'נוצר מתיאור'})}catch(e){j.status='failed';j.error=msg(e);G.err=e;SS('v214_jobs',G.jobs);paint()}}
// ---------- events ----------
document.addEventListener('submit',e=>{const f=e.target;if(!f.dataset||f.dataset.v214!=='gen')return;e.preventDefault();G.form.prompt=(f.querySelector('[data-v214f="prompt"]')||{}).value||'';G.form.seconds=(f.querySelector('[data-v214f="seconds"]')||{}).value||'8';G.form.size=(f.querySelector('[data-v214f="size"]')||{}).value||'720x1280';SS('v214_form',Object.assign({},G.form,{image:undefined}));start()},true);
document.addEventListener('input',e=>{const t=e.target;if(t.dataset&&t.dataset.v214f==='prompt'&&t.closest('#v214gen')){G.form.prompt=t.value}},true);
document.addEventListener('change',e=>{const t=e.target;if(t.dataset&&t.dataset.v214f&&t.dataset.v214f!=='prompt'&&t.closest('#v214gen')){G.form[t.dataset.v214f]=t.value;SS('v214_form',Object.assign({},G.form,{image:undefined}))}},true);
document.addEventListener('click',async e=>{const b=e.target.closest&&e.target.closest('[data-v214]');if(!b)return;const a=b.dataset.v214;if(a==='gen')return;e.preventDefault();
  if(a==='retry'){G.err=null;return start()}if(a==='drop'){G.jobs=G.jobs.filter(x=>x.id!==b.dataset.id);SS('v214_jobs',G.jobs);return paint()}if(a==='imgx'){delete G.form.image;return paint()}
  if(a==='img'){if(!window.KImg)return;const r=await KImg.pick({title:'פריים ראשון לסרטון',sub:'הסרטון יתחיל מהתמונה הזו',allowGen:true,aspect:G.form.size==='1280x720'?16/9:9/16});if(!r)return;try{const im=await libImg(r.k);const c=document.createElement('canvas');const k=Math.min(1,1280/Math.max(im.naturalWidth,im.naturalHeight));c.width=Math.round(im.naturalWidth*k);c.height=Math.round(im.naturalHeight*k);c.getContext('2d').drawImage(im,0,0,c.width,c.height);G.form.image=c.toDataURL('image/jpeg',.85)}catch(x){say('לא הצלחתי לקרוא את התמונה')}return paint()}
  if(a==='qa'){return quick(b.dataset.k)}if(a==='helpx'){SS('v214_help',1);const h=$('#v214help');h&&h.remove();return}},true);
// ---------- one click actions on an open project ----------
const QA=[['subs','כתוביות אוטומטיות','תמלול של הדיבור לכתוביות'],['title','כותרת פתיחה','טקסט גדול בתחילת הסרטון'],['logo','לוגו קורקוס','בפינה, לאורך כל הסרטון'],['music','מוזיקת רקע','קובץ שמע שיורד כשמדברים'],['cut','חיתוך שתיקות','מקצר את הסרטון בלי המתנות'],['export','ייצוא','קובץ מוכן לפרסום']];
function qaHtml(){return `<div class="v214qa" id="v214qa" role="toolbar" aria-label="פעולות מהירות">${QA.map(([k,l,d])=>`<button type="button" data-v214="qa" data-k="${k}" title="${E(d)}"><b>${l}</b><small>${d}</small></button>`).join('')}</div>`}
function helpHtml(){return `<div class="v214help" id="v214help"><p><b>איך עובדים כאן:</b> משמאל הסצנות והחומרים, באמצע הסרטון (לוחצים על אלמנט כדי להזיז או לשנות), מימין המאפיינים ועוזר ה-AI, ולמטה ציר הזמן. הפעולות המהירות למעלה עושות את רוב העבודה בלחיצה אחת.</p><button type="button" class="v204b" data-v214="helpx">הבנתי</button></div>`}
async function quick(k){const V=window.__v204;if(!V||!V.S.p)return;const S=V.S;
  if(k==='subs'){if(S.p.subs.segs.length){S.ltab='subs';S.p.subs.mode=S.p.subs.mode==='off'?'manual':S.p.subs.mode;V.refresh();say('הכתוביות פועלות. עורכים אותן בלשונית "כתוביות ותסריט"');return}return V.transcribe()}
  if(k==='title'){V.addLayer('title');return}if(k==='logo'){V.addLayer('logo');const L=S.p.layers[S.p.layers.length-1];if(L){L.t0=0;L.t1=Math.max(L.t1,V.lay(S.p).total);V.refresh()}return}
  if(k==='music'){S.ltab='audio';S.audhow='music';V.refresh();setTimeout(()=>{const i=document.querySelector('.v205 .v205left [data-v204="aud"]');if(i)i.click()},80);return}
  if(k==='cut'){S.sel=new Set(S.p.clips.map(c=>c.id));const b=document.querySelector('.v205 [data-v204="cutp"]');if(b&&!b.disabled)b.click();else say('אין ניתוח שמע לסרטון הזה עדיין');return}
  if(k==='export'){S.rtab='export';V.refresh();return}}
function paintQa(){const top=$('.v205 .v205top');if(!top)return;if(!$('#v214qa'))top.insertAdjacentHTML('afterend',qaHtml());if(!LS('v214_help',0)&&!$('#v214help'))$('#v214qa').insertAdjacentHTML('afterend',helpHtml())}
let obT=0;const ob=new MutationObserver(()=>{clearTimeout(obT);obT=setTimeout(()=>{if(typeof APP==='undefined'||APP.view!=='vstudio')return;if($('.v204lib')){loadInfo();paint()}if($('.v205 .v205top'))paintQa()},60)});
ob.observe(document.body,{childList:true,subtree:true});
if(G.jobs.some(x=>x.status!=='done'&&x.status!=='failed'))setTimeout(poll,3000);
window.__v214={G,start,poll,quick,paint};
})();
/*V214:END*/
