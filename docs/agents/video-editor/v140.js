// ================= V140 · a new image with ChatGPT, right next to "החלפת תמונה": a studio sheet that starts from the post's topic,
//                   adds a photographic style, the post's shape, quality and how many options, keeps the brand rules (no text,
//                   no logos, an Israeli setting), can improve the prompt with Claude, can make a variation of the current image,
//                   and puts the chosen result into the post and the library, marked as made with AI.
//                   The OpenAI key stays only in this browser (never in the code, the repo or the database) =================
(function(){
const API='https://api.openai.com/v1';
const LS={key:'v140_oa_key',model:'v140_oa_model',hist:'v140_hist'};
const get=k=>{try{return localStorage.getItem(k)||''}catch(e){return ''}};
const put=(k,v)=>{try{v?localStorage.setItem(k,v):localStorage.removeItem(k)}catch(e){}};
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tst=m=>{try{toast(m)}catch(e){}};
let SAMPLE;(async()=>{try{SAMPLE=window.claude&&claude.use?await claude.use('sample'):null}catch(e){SAMPLE=null}})();

const STYLES=[
 ['site','אתר בנייה אמיתי','documentary photograph of a real active construction site in Israel, natural daylight, honest textures of concrete, rebar and scaffolding, shot on a full frame camera, 35mm lens'],
 ['arch','צילום אדריכלי','professional architectural photograph of a finished modern Israeli residential building, straight verticals, clean composition, soft natural light, high detail'],
 ['render','הדמיה אדריכלית','photorealistic architectural visualization, modern Israeli residential project, landscaped surroundings, soft daylight, high end real estate marketing render'],
 ['golden','שעת זהב','warm golden hour light, long soft shadows, calm atmosphere'],
 ['night','ערב ותאורה','blue hour evening, warm lit windows and facade lighting, deep navy sky'],
 ['drone','מרחפן מלמעלה','aerial drone photograph from above, wide view of the site and the neighbourhood'],
 ['detail','פרט קרוב','close up detail photograph, shallow depth of field, craftsmanship and materials'],
 ['interior','פנים מעוצב','bright interior of a new Israeli apartment, large windows, natural materials, calm and premium']];
const QUAL=[['low','מהירה'],['medium','רגילה'],['high','גבוהה']];
const SIZES=[['1024x1536','לאורך'],['1024x1024','ריבוע'],['1536x1024','לרוחב']];
const BRAND='Rules: no text, no letters, no numbers, no signs with writing, no logos, no watermarks anywhere in the image. Leave calm space in the lower third for a headline. Realistic Israeli setting and people only if asked. Natural colours with a subtle cool navy and teal tone.';
const S={open:false,prompt:'',styles:new Set(['site']),q:'medium',size:'',n:2,brand:true,mode:'new',busy:null,res:[],err:'',keyOpen:false,en:'',why:''};

// ---------- where we are
function shapeOfPost(){const c=document.querySelector('#pe-root canvas');if(!c||!c.width)return '1024x1536';const r=c.width/c.height;return r<0.9?'1024x1536':r>1.2?'1536x1024':'1024x1024'}
function topic(){const p=typeof PE!=='undefined'&&PE.p;if(!p)return '';const v=p.visual||{};const hl=String(v.headline||p.title||p.hook||'').replace(/\*/g,'').replace(/\n/g,' ').trim();
 const pr=(typeof PRJ==='function'&&p.project&&PRJ()[p.project])||p.project||'';return [hl,pr?'פרויקט: '+pr:''].filter(Boolean).join(' · ')}
function curSlot(){try{const sl=peSlots(PE.p);return sl[PE.slot]||null}catch(e){return null}}
function curKey(){const c=curSlot();return c?(c.legacy?PE.p.photoKey:c.o.k):null}
function hist(){try{return JSON.parse(get(LS.hist)||'[]')}catch(e){return []}}
function addHist(p){const h=hist().filter(x=>x!==p);h.unshift(p);put(LS.hist,JSON.stringify(h.slice(0,6)))}
function fullPrompt(){const st=STYLES.filter(s=>S.styles.has(s[0])).map(s=>s[2]).join('. ');const base=(S.en||S.prompt).trim();
 return [base,st,S.brand?BRAND:''].filter(Boolean).join('. ')}

// ---------- the sheet
function keyHtml(){const k=get(LS.key);return `<section class="v140key ${S.keyOpen||!k?'open':''}">
 <div class="v140kh"><b>${k?'מחובר לחשבון OpenAI':'חיבור לחשבון OpenAI'}</b>${k?`<span class="v140ok">מפתח שמור במכשיר הזה · ${esc(k.slice(0,7))}…${esc(k.slice(-4))}</span><button type="button" class="px-btn sm ghost" data-v140="keytoggle">${S.keyOpen?'סגירה':'הגדרות'}</button>`:''}</div>
 ${S.keyOpen||!k?`<ol class="v140steps"><li>נכנסים ל-platform.openai.com עם החשבון של ChatGPT ומוסיפים אמצעי תשלום (החיוב לפי שימוש, בנפרד מהמנוי).</li><li>ב-API keys יוצרים מפתח חדש ומעתיקים אותו.</li><li>מדביקים כאן. המפתח נשמר רק בדפדפן הזה, לא בקוד ולא בענן.</li></ol>
 <div class="v140krow"><input type="password" autocomplete="off" spellcheck="false" placeholder="sk-..." data-v140="key" value="" aria-label="מפתח OpenAI"><button type="button" class="px-btn sm pri" data-v140="keysave">שמירה ובדיקה</button>${k?'<button type="button" class="px-btn sm ghost" data-v140="keydel">מחיקת המפתח</button>':''}</div>
 <label class="v140model">מודל התמונות <input data-v140="model" value="${esc(get(LS.model)||'gpt-image-1')}" spellcheck="false"></label>`:''}</section>`}
function html(){const k=get(LS.key),cur=curKey(),busy=S.busy,size=S.size||shapeOfPost(),h=hist();
 return `<div class="v140box" role="dialog" aria-modal="true" aria-label="יצירת תמונה עם ChatGPT">
 <header class="v140top"><div><small>תמונה חדשה לפוסט</small><b>יצירת תמונה עם ChatGPT</b></div><button type="button" class="v140x" data-v140="close" aria-label="סגירה"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button></header>
 <div class="v140grid"><div class="v140form">
 ${keyHtml()}
 <div class="v140mode" role="group" aria-label="סוג יצירה"><button type="button" data-v140="mode" data-k="new" aria-pressed="${S.mode==='new'}">תמונה חדשה</button><button type="button" data-v140="mode" data-k="edit" aria-pressed="${S.mode==='edit'}" ${cur?'':'disabled'}>שינוי של התמונה הנוכחית</button></div>
 <label class="v140lbl" for="v140p">${S.mode==='edit'?'מה לשנות בתמונה':'מה רואים בתמונה'}</label>
 <textarea id="v140p" data-v140="prompt" rows="4" placeholder="${S.mode==='edit'?'למשל: אותו בניין בשעת ערב, עם תאורה חמה בחלונות':'למשל: יציקת תקרה בבניין מגורים בתל אביב, פועלים בקסדות, שמש של בוקר'}">${esc(S.prompt)}</textarea>
 <div class="v140tools">${SAMPLE?`<button type="button" class="px-btn sm" data-v140="refine" ${S.prompt.trim()&&!busy?'':'disabled'}>שיפור הפרומפט עם Claude</button>`:''}<button type="button" class="px-btn sm ghost" data-v140="topic">מהנושא של הפוסט</button></div>
 ${S.en?`<div class="v140en"><small>הפרומפט שיישלח (באנגלית, משופר)</small><p dir="ltr">${esc(S.en)}</p>${S.why?`<span>${esc(S.why)}</span>`:''}<button type="button" class="px-btn sm ghost" data-v140="noen">לחזור לטקסט שלי</button></div>`:''}
 ${h.length?`<div class="v140hist"><small>פרומפטים אחרונים</small>${h.map((x,i)=>`<button type="button" data-v140="hist" data-i="${i}">${esc(x.slice(0,60))}</button>`).join('')}</div>`:''}
 <div class="v140lbl">סגנון <small>אפשר לשלב</small></div>
 <div class="v140chips">${STYLES.map(s=>`<button type="button" data-v140="style" data-k="${s[0]}" aria-pressed="${S.styles.has(s[0])}">${s[1]}</button>`).join('')}</div>
 <div class="v140row3">
  <div><div class="v140lbl">צורה</div><div class="v140seg">${SIZES.map(([k,l])=>`<button type="button" data-v140="size" data-k="${k}" aria-pressed="${size===k}">${l}</button>`).join('')}</div></div>
  <div><div class="v140lbl">איכות</div><div class="v140seg">${QUAL.map(([k,l])=>`<button type="button" data-v140="q" data-k="${k}" aria-pressed="${S.q===k}">${l}</button>`).join('')}</div></div>
  <div><div class="v140lbl">כמה אפשרויות</div><div class="v140seg">${[1,2,4].map(n=>`<button type="button" data-v140="n" data-k="${n}" aria-pressed="${S.n===n}">${n}</button>`).join('')}</div></div></div>
 <label class="v140chk"><input type="checkbox" data-v140="brand" ${S.brand?'checked':''}> לשמור על קו המותג: בלי טקסט ולוגו בתמונה, מקום לכותרת למטה, גוון כחול עדין</label>
 <p class="v140cost">כל תמונה מחויבת בחשבון OpenAI לפי התמחור שלהם. איכות גבוהה ויותר אפשרויות עולות יותר.</p>
 ${S.err?`<p class="v140err" role="alert">${esc(S.err)}</p>`:''}
 <button type="button" class="px-btn pri v140go" data-v140="${busy?'cancel':'go'}" ${!k&&!busy?'disabled':''}>${busy?`עוצרים (${busy.sec} שניות)`:S.mode==='edit'?'יצירת השינוי':'יצירת התמונה'}</button>
 ${!k?'<small class="v140need">קודם מחברים את חשבון OpenAI למעלה</small>':''}
 </div>
 <div class="v140res" aria-live="polite">${busy?`<div class="v140wait"><i></i><b>ChatGPT מצייר${S.n>1?` ${S.n} אפשרויות`:''}…</b><span>בדרך כלל לוקח 20 עד 60 שניות</span></div>`:''}
  ${S.res.length?S.res.map((r,i)=>`<figure class="v140card"><img src="${r.url}" alt="${esc('אפשרות '+(i+1)+': '+r.prompt.slice(0,80))}"><figcaption><span class="v140ai">נוצר ב-AI</span>
   <button type="button" class="px-btn sm pri" data-v140="use" data-i="${i}" ${r.saving?'disabled':''}>${r.used?'בפוסט ✓':r.saving?'שומר…':'לשים בפוסט'}</button>
   <button type="button" class="px-btn sm" data-v140="lib" data-i="${i}" ${r.saved||r.saving?'disabled':''}>${r.saved?'בספרייה ✓':'לספרייה'}</button>
   <button type="button" class="px-btn sm ghost" data-v140="vary" data-i="${i}" ${busy?'disabled':''}>וריאציה ממנה</button>
   <a class="px-btn sm ghost" href="${r.url}" download="kurkoos-ai-${i+1}.png">הורדה</a></figcaption></figure>`).join(''):!busy?`<div class="v140empty"><b>התמונות יופיעו כאן</b><span>${esc(topic()||'כתבו מה רוצים לראות, בחרו סגנון ולחצו "יצירת התמונה"')}</span></div>`:''}
  ${S.res.length?'<p class="v140note">תמונה שנוצרה ב-AI אינה צילום של פרויקט אמיתי. לא להציג אותה ככזו בפוסט.</p>':''}</div></div></div>`}
function paint(keepFocus){const r=document.getElementById('v140');if(!r)return;const a=document.activeElement,id=a&&a.dataset&&a.dataset.v140,pos=a&&a.selectionStart;r.innerHTML=html();
 if(keepFocus&&id){const n=r.querySelector(`[data-v140="${id}"]`);if(n){n.focus();try{n.setSelectionRange(pos,pos)}catch(e){}}}}
function open(){if(typeof PE==='undefined'||!PE.p)return;if(!S.prompt)S.prompt=topic();S.size='';S.open=true;let r=document.getElementById('v140');if(!r){r=document.createElement('div');r.id='v140';document.body.appendChild(r)}r.className='on';paint();
 const t=r.querySelector(get(LS.key)?'[data-v140="prompt"]':'[data-v140="key"]');t&&t.focus({preventScroll:true})}
function close(){if(S.busy&&S.busy.ac)S.busy.ac.abort();const r=document.getElementById('v140');if(r)r.remove();S.open=false;S.res.forEach(x=>{if(!x.saved&&!x.used)setTimeout(()=>URL.revokeObjectURL(x.url),60000)})}

// ---------- OpenAI
function why(st,j,raw){const m=(j&&j.error&&j.error.message)||raw||'';
 if(st===401)return 'המפתח לא תקין או בוטל. צרו מפתח חדש ב-platform.openai.com והדביקו אותו שוב.';
 if(st===403)return 'לחשבון אין גישה למודל התמונות. ייתכן שצריך לאמת את הארגון ב-platform.openai.com (Organization > Verify). '+m;
 if(st===429)return /quota|billing/i.test(m)?'נגמרה היתרה בחשבון OpenAI או שאין אמצעי תשלום. מוסיפים ב-Billing ומנסים שוב.':'יותר מדי בקשות ברגע אחד. מחכים דקה ומנסים שוב.';
 if(st===400&&/safety|moderation|policy/i.test(m))return 'OpenAI סירב לבקשה לפי כללי התוכן שלו. נסחו אחרת.';
 if(st===400)return 'הבקשה נדחתה: '+m;return 'שגיאה מ-OpenAI ('+st+'): '+m}
function netWhy(e){if(e&&e.name==='AbortError')return 'נעצר';return 'הדף לא הצליח להגיע ל-OpenAI. אם זה חוזר, ייתכן ש-claude.ai חוסם פנייה ישירה מהדף, ואז נחבר את היצירה דרך העורך בענן.'}
async function call(path,init){const k=get(LS.key);const r=await fetch(API+path,Object.assign({},init,{headers:Object.assign({Authorization:'Bearer '+k},init.headers||{})}));let j=null,raw='';try{raw=await r.text();j=JSON.parse(raw)}catch(e){}
 if(!r.ok)throw {st:r.status,msg:why(r.status,j,raw.slice(0,200))};return j}
async function testKey(){try{await call('/models?limit=1',{method:'GET'});return ''}catch(e){return e.st?e.msg:netWhy(e)}}
const b64Blob=b=>{const s=atob(b),u=new Uint8Array(s.length);for(let i=0;i<s.length;i++)u[i]=s.charCodeAt(i);return new Blob([u],{type:'image/png'})};
async function imgToPng(src){const im=await new Promise((ok,no)=>{const i=new Image();i.crossOrigin='anonymous';i.onload=()=>ok(i);i.onerror=no;i.src=src});const c=document.createElement('canvas');const m=1536,s=Math.min(1,m/Math.max(im.naturalWidth,im.naturalHeight));c.width=Math.round(im.naturalWidth*s);c.height=Math.round(im.naturalHeight*s);c.getContext('2d').drawImage(im,0,0,c.width,c.height);return new Promise(r=>c.toBlob(r,'image/png'))}
async function generate(fromUrl){if(S.busy)return;const prompt=fullPrompt();if(!S.prompt.trim()&&!S.en){S.err='כתבו קודם מה רוצים לראות';paint();return}
 const model=get(LS.model)||'gpt-image-1',size=S.size||shapeOfPost(),ac=new AbortController(),t0=Date.now();S.err='';S.busy={ac,sec:0};paint();const tick=setInterval(()=>{if(!S.busy)return clearInterval(tick);S.busy.sec=Math.round((Date.now()-t0)/1000);const g=document.querySelector('#v140 .v140go');if(g)g.textContent=`עוצרים (${S.busy.sec} שניות)`},1000);
 try{let j;const src=fromUrl||(S.mode==='edit'?(PHOTO_LIB[curKey()]||''):'');
  if(src){let png;try{png=await imgToPng(src)}catch(e){throw {st:0,msg:'אי אפשר לקרוא את התמונה הנוכחית לשינוי. נסו "תמונה חדשה".'}}
   const fd=new FormData();fd.append('model',model);fd.append('prompt',prompt);fd.append('size',size);fd.append('quality',S.q);fd.append('n',String(S.n));fd.append('image',png,'current.png');
   j=await call('/images/edits',{method:'POST',body:fd,signal:ac.signal})}
  else j=await call('/images/generations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model,prompt,size,quality:S.q,n:S.n}),signal:ac.signal});
  const out=(j&&j.data||[]).map(d=>{const blob=d.b64_json?b64Blob(d.b64_json):null;return blob?{blob,url:URL.createObjectURL(blob),prompt:S.prompt.trim()||S.en,full:prompt}:d.url?{blob:null,url:d.url,prompt:S.prompt.trim(),full:prompt}:null}).filter(Boolean);
  if(!out.length)throw {st:0,msg:'OpenAI לא החזיר תמונה. נסו שוב.'};S.res=out.concat(S.res).slice(0,8);if(S.prompt.trim())addHist(S.prompt.trim())}
 catch(e){S.err=e&&e.st!==undefined?e.msg:netWhy(e)}
 clearInterval(tick);S.busy=null;if(S.open)paint()}
async function refine(){if(!SAMPLE||!S.prompt.trim())return;const b=document.querySelector('#v140 [data-v140="refine"]');if(b){b.disabled=true;b.textContent='Claude משפר…'}
 try{const o=await SAMPLE.json(`You write prompts for an image model (OpenAI) for Kurkoos Group, an Israeli construction and real estate company (supervision, framework construction, brokerage).
Turn the owner's Hebrew request into one vivid, concrete English prompt for a photorealistic image: subject, setting in Israel, camera and lens, light, mood, composition. Do not invent named places, people or facts that are not in the request. Never ask for text, signs or logos in the image.
Post topic: ${topic()||'none'}
Request: ${S.prompt.trim()}
Answer JSON only: {"en":"the English prompt","he":"one short Hebrew sentence describing what will be in the image"}`,{modelTier:'quick',cache:false});
  if(o&&o.en){S.en=String(o.en).slice(0,1200);S.why=o.he?String(o.he).slice(0,200):''}}
 catch(e){tst(e&&e.code==='not_granted'?'צריך לאשר ל-Claude לעזור בדף הזה':'השיפור לא הצליח כרגע')}paint()}

// ---------- into the library and the post
async function keep(r,usePost){if(r.saving)return;r.saving=true;paint();
 try{let blob=r.blob;if(!blob){const x=await fetch(r.url);blob=await x.blob()}const f=new File([blob],'ai.png',{type:blob.type||'image/png'});const {blob:jb,w,h}=await downscale(f);
  const name=('AI · '+(r.prompt||'תמונה')).replace(/\s+/g,' ').slice(0,60),proj=(PE.p&&PE.p.project)||'';let k;
  const meta={name,project:proj,kind:'render',tags:'ai,chatgpt',ai:true,prompt:(r.full||'').slice(0,900),w,h,addedAt:new Date().toISOString()};
  if(typeof KC!=='undefined'&&KC.assets){const up=await KC.assets.upload(jb);meta.url=up.url;meta.src='ai:'+up.id;if(KC.db){try{await KC.db.collection('photos').doc(up.id).set(meta)}catch(e){}}regUpload(up.id,meta);k='u_'+up.id}
  else{const id='ai'+Date.now().toString(36);k='u_'+id;PHOTO_LIB[k]=URL.createObjectURL(jb);LIB_NAMES[k]=name;try{PM[k]={k:'render',p:proj,t:'נוצר ב-AI'}}catch(e){}if(usePost)tst('התמונה בפוסט, אבל נשמרת לספרייה רק כשהדף פתוח ב-claude.ai')}
  try{PM[k]=Object.assign({},PM[k]||{},{k:'render',p:proj,t:'נוצר ב-AI'})}catch(e){}
  r.saved=true;r.key=k;
  if(usePost){const sl=peSlots(PE.p);if(!sl.length){tst('בעיצוב הזה אין תמונה להחלפה. התמונה נשמרה בספרייה')}else{pePick(k);r.used=true;tst('התמונה החדשה בפוסט. היא נוצרה ב-AI, אז לא מציגים אותה כצילום של פרויקט')}}
  else tst('נשמר בספרייה, תחת הדמיות')}
 catch(e){tst('השמירה נכשלה: '+(e&&(e.code||e.message)||e))}
 r.saving=false;if(S.open)paint()}

// ---------- events
document.addEventListener('click',async e=>{const o=e.target.closest&&e.target.closest('[data-v140="open"]');if(o){e.preventDefault();e.stopPropagation();open();return}
 const r=document.getElementById('v140');if(!r||!r.contains(e.target))return;if(e.target===r){close();return}
 const b=e.target.closest('[data-v140]');if(!b)return;const a=b.dataset.v140;
 if(a==='close')close();
 else if(a==='keytoggle'){S.keyOpen=!S.keyOpen;paint()}
 else if(a==='keysave'){const inp=r.querySelector('[data-v140="key"]'),v=(inp&&inp.value||'').trim(),m=r.querySelector('[data-v140="model"]');if(m)put(LS.model,m.value.trim()||'gpt-image-1');
  if(v){if(!/^sk-/.test(v)){S.err='מפתח של OpenAI מתחיל ב-sk-';paint();return}put(LS.key,v)}if(!get(LS.key)){S.err='הדביקו מפתח';paint();return}
  b.disabled=true;b.textContent='בודק…';const w=await testKey();S.err=w;if(!w){S.keyOpen=false;tst('מחובר לחשבון OpenAI')}else if(/המפתח לא תקין/.test(w))put(LS.key,'');paint()}
 else if(a==='keydel'){put(LS.key,'');S.keyOpen=true;tst('המפתח נמחק מהמכשיר הזה');paint()}
 else if(a==='mode'){if(b.disabled)return;S.mode=b.dataset.k;paint()}
 else if(a==='style'){const k=b.dataset.k;S.styles.has(k)?S.styles.delete(k):S.styles.add(k);paint()}
 else if(a==='size'){S.size=b.dataset.k;paint()}else if(a==='q'){S.q=b.dataset.k;paint()}else if(a==='n'){S.n=+b.dataset.k;paint()}
 else if(a==='topic'){S.prompt=topic();S.en='';paint()}
 else if(a==='hist'){S.prompt=hist()[+b.dataset.i]||S.prompt;S.en='';paint()}
 else if(a==='noen'){S.en='';S.why='';paint()}
 else if(a==='refine')refine();
 else if(a==='go')generate();
 else if(a==='cancel'){if(S.busy&&S.busy.ac)S.busy.ac.abort()}
 else if(a==='use')keep(S.res[+b.dataset.i],true);
 else if(a==='lib')keep(S.res[+b.dataset.i],false);
 else if(a==='vary'){const x=S.res[+b.dataset.i];if(x)generate(x.url)}},true);
document.addEventListener('input',e=>{const t=e.target;if(!t.closest||!t.closest('#v140'))return;if(t.dataset.v140==='prompt'){S.prompt=t.value;if(S.en){S.en='';S.why='';paint(true)}const rb=document.querySelector('#v140 [data-v140="refine"]');if(rb)rb.disabled=!S.prompt.trim()||!!S.busy}});
document.addEventListener('change',e=>{const t=e.target;if(!t.closest||!t.closest('#v140'))return;if(t.dataset.v140==='brand')S.brand=t.checked;if(t.dataset.v140==='model')put(LS.model,t.value.trim()||'gpt-image-1')});
document.addEventListener('keydown',e=>{if(!S.open)return;if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close()}else if(e.key==='Enter'&&(e.metaKey||e.ctrlKey)&&!S.busy&&get(LS.key)){e.preventDefault();generate()}},true);
// a closed post editor closes the sheet with it
if(typeof peClose==='function')peClose=(f=>function(){if(S.open){close();return}return f.apply(this,arguments)})(peClose);

// ---------- the button, right above "החלפת תמונה"
if(typeof peImage==='function')peImage=(f=>function(){let h=f.apply(this,arguments);try{const i=h.indexOf('<div class="pe-sec v115">');if(i<0)return h;
 const sec=`<div class="pe-sec v140sec"><div class="v140lead"><span class="v140spark" aria-hidden="true"><svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.8 5.6L19.5 9l-5.7 1.6L12 16l-1.8-5.4L4.5 9l5.7-1.4z"/><path d="M19 14l.9 2.6 2.6.9-2.6.9L19 21l-.9-2.6-2.6-.9 2.6-.9z" opacity=".7"/></svg></span><div><b>יצירת תמונה חדשה עם AI</b><small>ChatGPT מצייר תמונה לפי מה שכותבים, מתוך הנושא של הפוסט</small></div></div>
  <button type="button" class="px-btn pri v140open" data-v140="open">יצירת תמונה עם ChatGPT</button></div>`;h=h.slice(0,i)+sec+h.slice(i)}catch(e){console.warn('v140',e)}return h})(peImage);
window.__v140={open,close,S,generate,keep,fullPrompt,shapeOfPost};
})();
