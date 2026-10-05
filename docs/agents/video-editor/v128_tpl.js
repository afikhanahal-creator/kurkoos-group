// ================= V128 · effects studio in the videos page: the base prompt (the engine) always first, then any of the
//                   18 signature effects on their words, with a real preview of each one rendered by the engine. Nothing is
//                   rendered before a plan is approved: the editor sends back the word table, the effect list and one frame
//                   of every effect, and only "אישור ויציאה לדרך" starts the render. Daily library grouped by day =================
(function(){
const PROMPTS=__PROMPTS__;
const FX=[
 {id:'opening',n:'פתיחה אפורה וסלאם',d:'עד המילה הכל אפור ובלי עריכה, ואז הכל נדלק: צבע, רקע זז, זוהר, כותרת נוחתת, רעידה והבזק',s:['מכה קולנועית','גליץ\''],f:[['title','כותרת','למשל: קבוצת קורקוס'],['tag_after','התגית אחרי','למשל: עם עריכה'],['cta','כפתור קריאה לפעולה','למשל: עקבו לעוד']]},
 {id:'title3d',n:'כותרת תלת־ממדית',d:'הטקסט עף מפי 5.5 ונוחת במרכז, 16 שכבות עומק, זוהר ופס אדום',s:['וווש','מכה'],f:[['text','טקסט הכותרת','מה ייכתב']]},
 {id:'shatter',n:'התנפצות זכוכית',d:'סדקים, כ-50 רסיסי וורונוי שעפים עם כוח משיכה, ואז מתאחים בחזרה',s:['סדק','זכוכית','זכוכית הפוכה'],f:[]},
 {id:'popout',n:'יציאה מהמסגרת',d:'הדמות גדלה פי 1.8 ויוצאת מעל המסגרת והכותרת, עם אור קצה וצל',s:['וווש למעלה'],f:[]},
 {id:'flip',n:'היפוך תלת־ממדי',d:'כל הריל מתהפך בפרספקטיבה, נשאר הפוך לרגע וחוזר',s:['וווש','וווש'],f:[]},
 {id:'worlds',n:'עולמות',d:'השחרה, בום, והרקע מתחלף לעולמות על כל המסך עם הדמות גזורה בתוכם',s:['בום','מעבר'],f:[['words','מילים לעולם השני והשלישי','שתי מילים, מופרדות בפסיק'],['worlds','העולמות','space,underwater,city']]},
 {id:'freeze',n:'עצירת זמן',d:'הזמן קופא ל-0.7 שניות בגוון קר, פרלקסה, גל הדף ושעון עצר',s:['קפיאה','שחרור'],f:[]},
 {id:'giant',n:'ענק',d:'עיר מיניאטורית, הדמות גדלה בשלוש קפיצות כבדות עם רעידה בכל צעד',s:['צעדי ענק'],f:[]},
 {id:'pixel',n:'פירוק לפיקסלים',d:'הדמות מתפרקת לבלוקים של 12 פיקסלים שעפים ומשנים צבע, ונבנית מחדש',s:['גרגרים','בנייה'],f:[]},
 {id:'zoom',n:'זום אינסופי',d:'טלפון שמראה את הריל עצמו, וצלילה לתוכו על כל מילה',s:['צלילה'],f:[['words','מילים לצלילות','מופרדות בפסיק']]},
 {id:'cube',n:'קובייה',d:'המסגרת הופכת לקובייה מסתובבת עם כרטיס מונפש על כל פאה',s:['סיבוב'],f:[['words','ארבע מילים לסיבובים','מופרדות בפסיק'],['cards','שמות הכרטיסים','פרסומת, ריל שעוצר, הזמנה לאירוע, מצגת']]},
 {id:'money',n:'חותמות וכסף',d:'שתי חותמות אדומות נוחתות, נמחקות ונופלות, ומונה שצונח ל-0',s:['חותמת','מחיקה','מונה'],f:[['stamps','שתי חותמות','למשל: יקר, איטי'],['strike_word','המילה של המחיקה','מילה מהמשפט'],['amount','הסכום','מספר'],['final_tag','התגית באפס','למשל: בחינם']]},
 {id:'comment',n:'תגובה והודעה',d:'מילת קוד מוקלדת בתיבת תגובה, לב, והתראת הודעה פרטית',s:['הקלדה','התראה'],f:[['code','מילת הקוד','למשל: מדריך'],['notif','טקסט ההתראה','למשל: שלחתי לך את הקישור']]},
 {id:'hologram',n:'הולוגרמה',d:'הדמות מתגלה כהולוגרמה בטורקיז עם קווי סריקה, תגיות וכוונת',s:['הולוגרמה'],f:[['until_word','המילה שבה המשפט נגמר',''],['tags_word','המילה של התגיות',''],['tags','שלוש תגיות','מופרדות בפסיק']]},
 {id:'goal',n:'מונה עוקבים',d:'מספר שסופר ליעד עם פס התקדמות, קונפטי, רעידה והבזק',s:['מונה','קונפטי'],f:[['from','המספר היום','מספר אמיתי'],['to','היעד','מספר']]},
 {id:'gold',n:'חותמת זהב',d:'חותמת זהב נוחתת מפי 2.4 עם קרני אור מסתובבות וניצוצות',s:['חותמת זהב'],f:[['text','טקסט החותמת','']]},
 {id:'follow',n:'כפתור עקוב',d:'כפתור עקוב עולה, אצבע לוחצת, הופך ל"במעקב" ולבבות עולים',s:['קליק'],f:[]},
 {id:'rewind',n:'הרצה לאחור',d:'אחרי הסוף הריל רץ אחורה כמו קלטת עד הפריים הראשון, ונסגר בלולאה',s:['קלטת'],f:[],noword:1}];
const PKEY={opening:'opening',title3d:'title3d',shatter:'shatter',popout:'popout',flip:'flip',worlds:'worlds',freeze:'freeze',giant:'giant',pixel:'pixel',zoom:'zoom',cube:'cube',money:'money',comment:'comment',hologram:'hologram',goal:'finale',gold:'finale',follow:'finale',rewind:'rewind'};
const KEY='v128_seq';
let SEQ=(()=>{try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch(e){return []}})();
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(SEQ))}catch(e){}};
const BASE=(()=>{try{return Object.assign({fmt:'9:16',style:'clean'},JSON.parse(localStorage.getItem('v128_base')||'{}'))}catch(e){return {fmt:'9:16',style:'clean'}}})();
const saveBase=()=>{try{localStorage.setItem('v128_base',JSON.stringify(BASE))}catch(e){}};
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const toastSafe=m=>{try{toast(m)}catch(e){console.log(m)}};
const uid=()=>'v'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const fxOf=id=>FX.find(x=>x.id===id);
let target='';let busy=null;

// ---------- the request the editor gets
function sigOf(){return SEQ.map(e=>{const f=fxOf(e.id),o={kind:e.id};if(!f.noword)o.word=(e.word||'').trim();
 (f.f||[]).forEach(([k])=>{const v=(e[k]||'').trim();if(!v)return;
  if(['words','tags','stamps'].includes(k))o[k]=v.split(/[,،]/).map(x=>x.trim()).filter(Boolean);
  else if(k==='worlds')o.worlds=v.split(/[,،]/).map(x=>x.trim()).filter(Boolean);
  else if(k==='cards'){const kinds=['ad','stop','invite','deck'];o.cards=v.split(/[,،]/).map(x=>x.trim()).filter(Boolean).slice(0,4).map((t,i)=>({kind:kinds[i],text:t}))}
  else if(['amount','from','to'].includes(k)){const n=parseFloat(v.replace(/[^\d.]/g,''));if(!isNaN(n))o[k]=n}
  else o[k]=v});return o})}
function missing(){return SEQ.filter(e=>!fxOf(e.id).noword&&!(e.word||'').trim()).map(e=>fxOf(e.id).n)}
// the full prompt for Claude Code: the base first, then every chosen effect with its word filled in
function fullPrompt(){const fill=(txt,e)=>txt.replace(/\[המילה\]|\[מילה \d+\]|\[המילה שעליה הכול נדלק\]|\[המילה שמתחילה את העולמות\]/g,e.word||'[המילה]').replace(/\[הטקסט של הכותרת\]/g,e.text||'[הטקסט של הכותרת]').replace(/\[הטקסט החדש של התגית\]/g,e.tag_after||'[הטקסט החדש של התגית]').replace(/\[מילת הקוד\]/g,e.code||'[מילת הקוד]').replace(/\[טקסט ההתראה\]/g,e.notif||'[טקסט ההתראה]').replace(/\[הסכום\]/g,e.amount||'[הסכום]').replace(/\[המספר שלך היום\]/g,e.from||'[המספר שלך היום]').replace(/\[היעד\]/g,e.to||'[היעד]');
 const fmt={'9:16':'ריל אנכי','16:9':'סרטון לרוחב ליוטיוב','1:1':'ריבוע'}[BASE.fmt],sty={clean:'נקי ומינימליסטי',punchy:'אנרגטי וצבעוני',cinematic:'קולנועי'}[BASE.style];
 let out=PROMPTS.base.replace('[הפורמט, למשל ריל אנכי, סרטון לרוחב ליוטיוב, או ריבוע]',fmt).replace('[הסגנון, למשל נקי ומינימליסטי, אנרגטי וצבעוני, או קולנועי]',sty).replace('[צבעי המותג שלך]','כחול לילה #07293a, טורקיז #105572, ערפל #8fb6c8, נייר #f7f8fa ואדום #a90b0c');
 const seen=new Set();SEQ.forEach(e=>{const k=PKEY[e.id];if(seen.has(k)&&k!=='finale')return;seen.add(k);out+='\n\n'+fill(PROMPTS[k]||'',e)});
 if(SEQ.length)out+='\n\n'+PROMPTS.sound+'\n\n'+PROMPTS.review;return out}

// ---------- UI
function seqHtml(){if(!SEQ.length)return `<div class="v128empty"><b>עוד לא נבחרו אפקטים</b><span>בחרו אפקט מהספרייה, וכתבו על איזו מילה הוא נוחת. אפשר אחד או עשרה.</span></div>`;
 return SEQ.map((e,i)=>{const f=fxOf(e.id);return `<div class="v128row" data-i="${i}"><div class="v128rh"><em>${i+1}</em><b>${esc(f.n)}</b><button type="button" class="v128x" data-v128="del" data-i="${i}" aria-label="להסיר את ${esc(f.n)}">✕</button></div>
  ${f.noword?'<small class="v128hint">נוחת אחרי הפריים האחרון</small>':`<label class="v128f"><span>על המילה</span><input data-v128i="${i}" data-k="word" value="${esc(e.word||'')}" placeholder="המילה כפי שנאמרת בסרטון" ${!(e.word||'').trim()?'aria-invalid="true"':''}></label>`}
  ${(f.f||[]).map(([k,l,ph])=>`<label class="v128f"><span>${esc(l)}</span><input data-v128i="${i}" data-k="${k}" value="${esc(e[k]||'')}" placeholder="${esc(ph)}"></label>`).join('')}</div>`}).join('')}
function targets(){const V=window.__vid,docs=(V&&V.VD&&V.VD.docs||[]).filter(d=>d.srcId||d.srcUrl),tray=(window.__v127&&__v127.T.items||[]).filter(x=>!x.bad);
 const opts=[...tray.map(x=>[`tray:${x.id}`,`מהמגש: ${x.name}`]),...docs.slice(0,40).map(d=>[`doc:${d.id}`,`מהספרייה: ${d.name||d.id}`])];
 if(!opts.some(o=>o[0]===target))target=opts[0]?opts[0][0]:'';return opts}
function html(){const opts=targets(),n=SEQ.length;
 return `<section class="v128" id="v128" aria-label="סטודיו האפקטים">
 <header class="v128hd"><div><h3>סטודיו האפקטים</h3><p>כל אפקט נוחת בדיוק על המילה שלו, עם צליל משלו באותו פריים. העורך מתחיל מפרומפט הבסיס, מכין תוכנית ומחכה לאישור שלך לפני שהוא מרנדר.</p></div>
  <ol class="v128flow"><li>פרומפט בסיס</li><li>אפקטים ומילים</li><li>תוכנית לאישור</li><li>עריכה ורינדור</li><li>בדיקת עורך</li></ol></header>
 <div class="v128grid">
  <div class="v128lib">
   <article class="v128base"><div class="v128bico" aria-hidden="true"><i></i><i></i><i></i></div><div><h4>פרומפט בסיס: המנוע <span class="v128lock">תמיד ראשון</span></h4>
    <p>תמלול עם זמן לכל מילה וטבלת מילים, חיתוך שתיקות עם מעבר רך במפת זמן, מסכת דמות לכל פריים, עברית מימין לשמאל עם RAQM, כתוביות מונפשות, רינדור במקביל ובדיקה בגיליון קונטקט.</p>
    <div class="v128brow"><span class="v128seg" role="group" aria-label="פורמט">${[['9:16','ריל אנכי'],['16:9','לרוחב'],['1:1','ריבוע']].map(([v,l])=>`<button type="button" data-v128b="fmt" data-val="${v}" aria-pressed="${BASE.fmt===v}">${l}</button>`).join('')}</span>
     <span class="v128seg" role="group" aria-label="סגנון">${[['clean','נקי'],['punchy','אנרגטי'],['cinematic','קולנועי']].map(([v,l])=>`<button type="button" data-v128b="style" data-val="${v}" aria-pressed="${BASE.style===v}">${l}</button>`).join('')}</span>
     <button type="button" class="v128pl" data-v128="prompt" data-k="base">הפרומפט המלא</button></div></div></article>
   <div class="v128cards">${FX.map(f=>{const k=SEQ.findIndex(e=>e.id===f.id);return `<article class="v128c ${k>=0?'on':''}" data-id="${f.id}">
     <div class="v128v"><video muted loop playsinline preload="none" data-fx="${f.id}" aria-label="תצוגה של ${esc(f.n)}"></video>${k>=0?`<em>${k+1}</em>`:''}</div>
     <div class="v128m"><b>${esc(f.n)}</b><small>${esc(f.d)}</small><span class="v128s">${f.s.map(x=>`<i>${esc(x)}</i>`).join('')}</span>
      <div class="v128a"><button type="button" class="px-btn sm ${k>=0?'':'pri'}" data-v128="add" data-id="${f.id}">${k>=0?'עוד פעם':'הוספה'}</button><button type="button" class="v128pl" data-v128="prompt" data-k="${PKEY[f.id]}">הפרומפט</button></div></div></article>`}).join('')}</div>
  </div>
  <aside class="v128seq" aria-label="רצף העריכה"><h4>רצף העריכה <small>${n?n+' אפקטים':''}</small></h4>
   <div class="v128base-mini"><em>0</em><b>פרומפט בסיס</b><small>תמלול, חיתוך, מסכה, כתוביות</small></div>
   <div class="v128list">${seqHtml()}</div>
   <label class="v128f v128tgt"><span>הסרטון</span>${opts.length?`<select data-v128="target">${opts.map(([v,l])=>`<option value="${esc(v)}" ${v===target?'selected':''}>${esc(l)}</option>`).join('')}</select>`:'<small class="v128hint">העלו סרטון למגש למעלה או לספרייה</small>'}</label>
   <button type="button" class="px-btn pri v128go" data-v128="plan" ${n&&opts.length&&!busy?'':'disabled'}>שליחה לתוכנית</button>
   <button type="button" class="px-btn v128cp" data-v128="copy" ${n?'':'disabled'}>העתקת הפרומפט ל-Claude Code</button>
   ${busy?`<p class="v128busy" role="status">${esc(busy)}</p>`:''}
   <small class="v128hint">העורך עובד על Opus 5.5 ברמת חשיבה מקסימלית. שום רינדור לא מתחיל לפני שאישרת את התוכנית.</small></aside>
 </div></section>`}
function place(){const pg=document.getElementById('v100page');if(!pg)return;const an=document.getElementById('v127')||pg.querySelector('.v100top');if(!an)return;let s=document.getElementById('v128');if(s&&s.previousElementSibling===an)return;if(s)s.remove();an.insertAdjacentHTML('afterend',html());watch()}
function refresh(){const s=document.getElementById('v128');if(!s)return;const y=scrollY;s.outerHTML=html();watch();scrollTo(0,y)}
function refreshSeq(){const l=document.querySelector('#v128 .v128list');if(l)l.innerHTML=seqHtml();const g=document.querySelector('#v128 .v128go');if(g)g.disabled=!(SEQ.length&&targets().length&&!busy)}
// previews play only while on screen
let io=null;function watch(){if(!('IntersectionObserver' in window))return;if(io)io.disconnect();io=new IntersectionObserver(es=>es.forEach(en=>{const v=en.target;if(en.isIntersecting){if(!v.dataset.ld){v.dataset.ld=1;const id=v.dataset.fx;v.innerHTML=`<source src="fx/${id}.webm" type="video/webm"><source src="fx/${id}.mp4" type="video/mp4">`;v.load()}v.play().catch(()=>{})}else v.pause()}),{rootMargin:'80px'});document.querySelectorAll('#v128 video[data-fx]').forEach(v=>io.observe(v))}
// the verbatim prompt in a sheet
function sheet(k){const txt=k==='all'?fullPrompt():(PROMPTS[k]||'');const d=document.createElement('div');d.className='v128sheet';d.setAttribute('role','dialog');d.setAttribute('aria-modal','true');d.setAttribute('aria-label','הפרומפט');
 d.innerHTML=`<div class="v128sh"><header><b>${k==='base'?'פרומפט הבסיס':k==='all'?'הפרומפט המלא לרצף':'הפרומפט, מילה במילה'}</b><button type="button" data-v128="close" aria-label="סגירה">✕</button></header><pre dir="rtl">${esc(txt)}</pre><footer><button type="button" class="px-btn pri" data-v128="copytxt">העתקה</button></footer></div>`;
 d._txt=txt;document.body.appendChild(d);d.querySelector('[data-v128="close"]').focus()}
async function copy(txt){try{await navigator.clipboard.writeText(txt);toastSafe('הפרומפט הועתק')}catch(e){const ta=document.createElement('textarea');ta.value=txt;document.body.appendChild(ta);ta.select();try{document.execCommand('copy');toastSafe('הפרומפט הועתק')}catch(x){toastSafe('ההעתקה נחסמה בדפדפן')}ta.remove()}}

// ---------- big daily videos: re-encoded in the browser so they fit the 20MB upload
async function shrink(file,onp){if(file.size<=19.5*1024*1024)return file;
 const url=URL.createObjectURL(file),v=document.createElement('video');v.src=url;v.playsInline=true;v.crossOrigin='anonymous';await new Promise((r,j)=>{v.onloadedmetadata=r;v.onerror=j});
 const dur=v.duration||60,k=Math.min(1,1280/Math.max(v.videoWidth,v.videoHeight)),w=Math.round(v.videoWidth*k/2)*2,h=Math.round(v.videoHeight*k/2)*2;
 const cv=document.createElement('canvas');cv.width=w;cv.height=h;const ctx=cv.getContext('2d');const st=cv.captureStream(30);
 const AC=new AudioContext(),dst=AC.createMediaStreamDestination();try{AC.createMediaElementSource(v).connect(dst)}catch(e){}dst.stream.getAudioTracks().forEach(t=>st.addTrack(t));
 const mt=['video/mp4;codecs=avc1.42E01F,mp4a.40.2','video/webm;codecs=vp9,opus','video/webm'].find(m=>MediaRecorder.isTypeSupported(m))||'';
 const vb=Math.max(700e3,Math.min(4e6,(18.5e6*8/dur)-160e3));const rec=new MediaRecorder(st,mt?{mimeType:mt,videoBitsPerSecond:vb,audioBitsPerSecond:128000}:{});const ch=[];rec.ondataavailable=e=>e.data.size&&ch.push(e.data);
 const done=new Promise(r=>rec.onstop=r);rec.start(500);await v.play();
 await new Promise(r=>{const tick=()=>{ctx.drawImage(v,0,0,w,h);onp&&onp(v.currentTime/dur);if(v.ended||v.currentTime>=dur-0.05)return r();setTimeout(tick,1000/30)};tick()});
 rec.stop();await done;v.pause();URL.revokeObjectURL(url);try{AC.close()}catch(e){}
 const type=(mt||'video/webm').split(';')[0];const out=new File(ch,file.name.replace(/\.[^.]+$/,'')+(type==='video/mp4'?'.mp4':'.webm'),{type});
 if(out.size>20*1024*1024)throw new Error('גם אחרי דחיסה הסרטון גדול מ-20MB. קצרו אותו');return out}
async function uploadItem(it,status){const V=window.__vid;const f=await shrink(it.file,p=>{busy=`דוחס את "${it.name}" כדי שייכנס להעלאה · ${Math.round(p*100)}%`;const b=document.querySelector('#v128 .v128busy,#v127 .v127foot small');if(b)b.textContent=busy});
 const r=await V.VD.assets.upload(f);return {srcId:r.id,srcUrl:r.url,size:r.sizeBytes||f.size}}

// ---------- plan, approve, render
async function requestPlan(){const V=window.__vid,VD=V&&V.VD;if(!VD||!VD.db||!VD.assets){toastSafe('השליחה לעורך זמינה כשהדף פתוח ב-claude.ai עם הרשאת עריכה');return}
 const miss=missing();if(miss.length){toastSafe('חסרה מילה ל: '+miss.join(', '));refreshSeq();return}
 const sig=sigOf();busy='שולח לתוכנית…';refresh();
 try{let d;const kit=window.__v127?Object.assign({},__v127.KIT()):null;const base={fmt:BASE.fmt,style:BASE.style};
  if(target.startsWith('tray:')){const it=__v127.T.items.find(x=>'tray:'+x.id===target);busy=`מעלה את "${it.name}"…`;refresh();const up=await uploadItem(it);
   d=await V.queueDoc({id:uid(),name:it.name,srcId:up.srcId,srcUrl:up.srcUrl,size:up.size,source:'studio',trim:{in:+(it.in||0).toFixed(2),out:+(it.out||it.dur).toFixed(2)},status:'plan_requested',phase:'plan',sig,base,kit,style:BASE.style})}
  else{const src=VD.docs.find(x=>'doc:'+x.id===target);d=Object.assign({},src,{status:'plan_requested',phase:'plan',sig,base,kit,style:BASE.style,requested:new Date().toISOString()});await VD.db.collection('videos').doc(src.id).update({status:'plan_requested',phase:'plan',sig,base,kit,style:BASE.style,requested:d.requested})}
  await V.editVideo(Object.assign({__direct:1},d));toastSafe('נשלח לתוכנית. כשהיא מוכנה היא תופיע בכרטיס הסרטון עם כפתור אישור')}
 catch(e){toastSafe('השליחה נכשלה: '+(e&&e.message||e))}busy=null;refresh()}
async function approve(id,note){const V=window.__vid,VD=V.VD,d=VD.docs.find(x=>x.id===id);if(!d)return;
 const upd=note?{status:'plan_requested',phase:'plan',planNote:note,requested:new Date().toISOString()}:{status:'approved',phase:'render',approved:new Date().toISOString()};
 try{await VD.db.collection('videos').doc(id).update(upd);await V.editVideo(Object.assign({__direct:1},d,upd));toastSafe(note?'התיקון נשלח. תגיע תוכנית חדשה':'אושר. העורך התחיל לערוך')}catch(e){toastSafe('לא נשלח: '+(e&&e.message||e))}}

// ---------- plan blocks in the video cards, and the library grouped by day
function mdTable(md){const lines=String(md||'').split('\n');let out='',inT=false;
 lines.forEach(l=>{if(/^\|/.test(l)){if(/^\|[-| ]+\|$/.test(l))return;const cells=l.split('|').slice(1,-1).map(c=>esc(c.trim()));out+=(inT?'':'<table class="v128t">')+`<tr>${cells.map(c=>`<td>${c}</td>`).join('')}</tr>`;inT=true}else{if(inT){out+='</table>';inT=false}if(/^#+ /.test(l))out+=`<b class="v128h">${esc(l.replace(/^#+ /,''))}</b>`;else if(l.trim())out+=`<p>${esc(l)}</p>`}});if(inT)out+='</table>';return out}
function decorate(){const V=window.__vid;if(!V||!V.VD)return;const grid=document.querySelector('#v100page .v100grid');if(!grid)return;
 V.VD.docs.forEach(d=>{const c=grid.querySelector(`.v100c[data-vid="${CSS.escape(d.id)}"]`);if(!c)return;const has=c.querySelector('.v128plan');
  const want=d.status==='awaiting_approval'||d.status==='plan_requested'||(d.planMd&&d.status==='approved');if(!want){if(has)has.remove();return}
  const sig=(d.sig||[]).length,key=d.status+'|'+(d.planAt||'');if(has&&has.dataset.k===key)return;if(has)has.remove();
  const box=document.createElement('div');box.className='v128plan';box.dataset.k=key;
  box.innerHTML=d.status==='plan_requested'?`<b>מכין תוכנית לאישור${sig?` · ${sig} אפקטים`:''}</b><small>תמלול, טבלת מילים, ופריים מכל אפקט. זה לוקח כמה דקות.</small>`
   :`<b>${d.status==='approved'?'התוכנית שאושרה':'תוכנית לאישור שלך'}</b>${d.planPreview?`<a href="${esc(d.planPreview)}" target="_blank" rel="noopener"><img src="${esc(d.planPreview)}" alt="פריים מכל אפקט בתוכנית" loading="lazy"></a>`:''}<details ${d.status==='awaiting_approval'?'open':''}><summary>המילים והאפקטים</summary><div class="v128md">${mdTable(d.planMd)}</div></details>
   ${d.status==='awaiting_approval'?`<div class="v128ap"><button type="button" class="px-btn pri" data-v128="approve" data-id="${esc(d.id)}">אישור ויציאה לדרך</button><button type="button" class="px-btn" data-v128="fix" data-id="${esc(d.id)}">בקשת תיקון</button></div><div class="v128fix" hidden><textarea rows="3" placeholder="מה לשנות בתוכנית? למשל: הענק על מילה אחרת"></textarea><button type="button" class="px-btn sm pri" data-v128="sendfix" data-id="${esc(d.id)}">שליחת התיקון</button></div>`:''}`;
  c.querySelector('.v100m').appendChild(box)});
 // day groups
 if(grid.dataset.v128days===String(V.VD.docs.length))return;grid.dataset.v128days=String(V.VD.docs.length);
 grid.querySelectorAll('.v128day').forEach(x=>x.remove());const day=s=>{const d=new Date(s||0);if(isNaN(d))return 'בלי תאריך';const t=new Date();const k=(x)=>x.toDateString();const y=new Date(t);y.setDate(t.getDate()-1);
  return k(d)===k(t)?'היום':k(d)===k(y)?'אתמול':d.toLocaleDateString('he-IL',{weekday:'long',day:'numeric',month:'long'})};
 let last=null;V.VD.docs.forEach(d=>{const c=grid.querySelector(`.v100c[data-vid="${CSS.escape(d.id)}"]`);if(!c)return;const g=day(d.created);if(g!==last){const h=document.createElement('h4');h.className='v128day';h.textContent=g;grid.insertBefore(h,c);last=g}grid.insertBefore(c,null)});
 const known=[...grid.querySelectorAll('.v100c:not([data-vid])')];if(known.length){const h=document.createElement('h4');h.className='v128day';h.textContent='סרטונים מהמערכת';grid.appendChild(h);known.forEach(k=>grid.appendChild(k))}}
// a "save to library" button in the tray footer: daily uploads without editing
function trayButton(){const f=document.querySelector('#v127 .v127foot');if(!f||f.querySelector('[data-v128="lib"]'))return;const b=document.createElement('button');b.type='button';b.className='px-btn';b.dataset.v128='lib';b.textContent='שמירה בספרייה בלי עריכה';const s=f.querySelector('small');f.insertBefore(b,s)}
async function saveLibrary(){const V=window.__vid,VD=V&&V.VD;if(!VD||!VD.db||!VD.assets){toastSafe('השמירה בספרייה זמינה כשהדף פתוח ב-claude.ai עם הרשאת עריכה');return}
 const items=(__v127.T.items||[]).filter(x=>!x.bad);if(!items.length){toastSafe('המגש ריק');return}let ok=0;
 for(const it of items){try{const up=await uploadItem(it);await V.queueDoc({id:uid(),name:it.name,srcId:up.srcId,srcUrl:up.srcUrl,size:up.size,source:'daily',status:'library'});ok++}catch(e){toastSafe(`"${it.name}": `+(e&&e.message||e))}}
 busy=null;toastSafe(`${ok} סרטונים נשמרו בספרייה של היום`);try{render()}catch(e){}}

// ---------- events
document.addEventListener('click',e=>{const sh=e.target.closest&&e.target.closest('.v128sheet');
 if(sh&&(e.target===sh||e.target.closest('[data-v128="close"]'))){sh.remove();return}
 if(sh&&e.target.closest('[data-v128="copytxt"]')){copy(sh._txt);return}
 const bb=e.target.closest&&e.target.closest('#v128 [data-v128b]');if(bb){BASE[bb.dataset.v128b]=bb.dataset.val;saveBase();bb.parentElement.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',x===bb));return}
 const b=e.target.closest&&e.target.closest('[data-v128]');if(!b||!(b.closest('#v128')||b.closest('#v100page')))return;const a=b.dataset.v128;
 if(a==='add'){SEQ.push({id:b.dataset.id});save();refresh();const rows=document.querySelectorAll('#v128 .v128row');const r=rows[rows.length-1];if(r){const i=r.querySelector('input');if(i&&innerWidth>860)i.focus({preventScroll:true})}toastSafe('נוסף לרצף: '+fxOf(b.dataset.id).n)}
 else if(a==='del'){SEQ.splice(+b.dataset.i,1);save();refresh()}
 else if(a==='prompt')sheet(b.dataset.k);
 else if(a==='copy')copy(fullPrompt());
 else if(a==='plan')requestPlan();
 else if(a==='approve'){b.disabled=true;approve(b.dataset.id)}
 else if(a==='fix'){const f=b.closest('.v128plan').querySelector('.v128fix');f.hidden=!f.hidden;if(!f.hidden)f.querySelector('textarea').focus()}
 else if(a==='sendfix'){const t=b.closest('.v128fix').querySelector('textarea').value.trim();if(!t){toastSafe('כתבו מה לשנות');return}b.disabled=true;approve(b.dataset.id,t)}
 else if(a==='lib')saveLibrary()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){const s=document.querySelector('.v128sheet');if(s)s.remove()}});
document.addEventListener('input',e=>{const t=e.target;if(!t.matches||!t.matches('#v128 [data-v128i]'))return;const e2=SEQ[+t.dataset.v128i];if(!e2)return;e2[t.dataset.k]=t.value.slice(0,120);save();if(t.dataset.k==='word')t.toggleAttribute('aria-invalid',!t.value.trim())});
document.addEventListener('change',e=>{const t=e.target;if(t.matches&&t.matches('#v128 select[data-v128="target"]'))target=t.value});
new MutationObserver(()=>{try{place();trayButton();decorate()}catch(e){}}).observe(document.body,{childList:true,subtree:true});
window.__v128={FX,PROMPTS,SEQ:()=>SEQ,sigOf,fullPrompt,shrink,decorate};
})();
