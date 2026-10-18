// ================= V177 · publishing straight from the engine to our own Facebook page and Instagram account (v190: one page per brand)
// No outside scheduler: the engine renders the post, uploads the image, and queues it in our server
// (Supabase function "social"); the server publishes it on time. Only posts the person turned on
// "פרסום אוטומטי" for are ever published.
(()=>{
if(window.__v177)return;window.__v177=1;
const FN='https://filnzlnvujnlazwcxbuq.supabase.co/functions/v1/social';
const E=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const I=n=>{try{return ico(n,16)}catch(e){return ''}};
const LS_AUTO='v177_auto';
async function tok(){try{return await window.__engineBridge.token()}catch(e){return ''}}
async function call(a,extra){const t=await tok();if(!t)throw Object.assign(new Error('צריך להתחבר לאדמין'),{code:'not_signed_in'});
 const r=await fetch(FN,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+t},body:JSON.stringify(Object.assign({a},extra||{}))});
 let d={};try{d=await r.json()}catch(e){}if(!r.ok)throw Object.assign(new Error(d.error||('HTTP '+r.status)),{code:d.code||'http'});return d}
const ON_SITE=()=>window.__ENGINE_HOST==='site';

/* ---------- state ---------- */
const ST={state:'idle',st:null,err:'',q:new Map(),busy:false,form:false};
const BRAND_HE={kurkoos:'קבוצת קורקוס',afik:'אפיק הנחל'};
function accFor(net,brand){return ((ST.st&&ST.st.accounts)||[]).find(a=>a.network===net&&a.brand===brand)||null}
function connected(net,brand){return brand?!!accFor(net,brand):!!((ST.st&&ST.st.accounts)||[]).find(a=>a.network===net&&a.brand)}
function mcHas(net){return !!(ST.st&&ST.st.mc&&ST.st.mc.networks&&ST.st.mc.networks[net])}
function anyConn(){return !!((ST.st&&ST.st.accounts)||[]).find(a=>a.brand)||!!(ST.st&&ST.st.mc&&ST.st.mc.networks&&Object.keys(ST.st.mc.networks).length)}
const NET_HE={fb:'פייסבוק',ig:'אינסטגרם',tt:'טיקטוק',yt:'יוטיוב',gmb:'גוגל עסקים'};
const MCN={ig:'instagram',tt:'tiktok',yt:'youtube',gmb:'gmb'};
// can this channel of this brand be published to: Facebook and Instagram straight, the rest (and Instagram without a linked account) through Metricool
function routeOk(n,brand){if(n==='fb')return connected('facebook',brand);if(n==='ig'&&connected('instagram',brand))return true;return brand==='kurkoos'&&!!MCN[n]&&mcHas(MCN[n])}
const anyNet=it=>!!(it&&it.nets&&['fb','ig','tt','yt','gmb'].some(n=>it.nets[n]));
const reelUrl=it=>{const u=it&&it.reel&&it.reel.file;return /^https:\/\/filnzlnvujnlazwcxbuq\.supabase\.co\/storage\/v1\/object\/public\//.test(String(u||''))?u:''};
// the brand of a scheduled post: the Afik HaNahal tab marks its posts brand 'afik', everything else is Kurkoos
function brandOf(it){const p=itemPost(it);return (it&&it.brand==='afik')||(p&&p.brand==='afik')?'afik':'kurkoos'}
let loading=null;
async function load(){if(!ON_SITE()){ST.state='off';paint();return}
 if(loading)return loading;
 loading=(async()=>{ST.state='busy';paint();
 try{ST.st=await call('status');ST.state='ok';await syncQueue(true)}catch(e){ST.state='err';ST.err=e.message}
 paint();try{mountSwitch()}catch(e){}})();
 try{await loading}finally{loading=null}}
async function syncQueue(quiet){if(!ON_SITE())return;try{const d=await call('list');ST.q=new Map((d.items||[]).map(x=>[x.item_id,x]));
 // the engine's schedule item remembers what happened to its automatic post
 let ch=false;((APP.sched&&APP.sched.items)||[]).forEach(it=>{const q=ST.q.get(it.id);if(!q)return;const s=q.status;if(it.pub&&it.pub.state!==s){it.pub.state=s;it.pub.err=q.last_error||'';ch=true}if(s==='done'&&it.status!=='published'){it.status='published';ch=true}});
 if(ch){try{saveSched()}catch(e){}}if(!quiet)paint()}catch(e){}}

/* ---------- the image that goes out: the rendered post as JPEG (Instagram takes JPEG only) ---------- */
async function renderBlob(p){try{await ensureImgs(p)}catch(e){}try{await document.fonts.ready}catch(e){}
 const cv=document.createElement('canvas');cv.width=1080;cv.height=1350;drawSlide(cv,p,p.slide||0);
 const blob=await new Promise(r=>cv.toBlob(r,'image/jpeg',.92));if(!blob)throw new Error('לא הצלחתי ליצור את התמונה');return blob}
async function renderJpeg(p){const blob=await renderBlob(p);
 const assets=await window.claude.use('assets');if(!assets)throw new Error('אין גישה לאחסון');
 const up=await assets.upload(blob,{ext:'jpg'});if(!up||!up.url)throw new Error('העלאת התמונה נכשלה');return up.url}

const pending=new Map();
function want(it){return !!(it&&it.pub&&it.pub.on&&(!it.reel||reelUrl(it)))}
async function enqueue(it,force,atNow){if(!ON_SITE()||!want(it)||!it.at)return;
 if(!ST.st)await load();
 const video=!!it.reel;const p=video?null:itemPost(it);if(!video&&!p)return;const brand=it.reel?(it.brand==='afik'?'afik':'kurkoos'):brandOf(it);
 const asked=['fb','ig','tt','yt','gmb'].filter(n=>it.nets&&it.nets[n]);const nets=asked.filter(n=>routeOk(n,brand)&&!(n==='yt'&&!video));const off=asked.filter(n=>!nets.includes(n));
 const man=off.filter(n=>n!=='fb'&&!(n==='yt'&&!video)),bad=off.filter(n=>!man.includes(n));
 if(off.length)toast((nets.length?'אוטומטית: '+nets.map(n=>NET_HE[n]).join(', ')+'. ':'')+(man.length?man.map(n=>NET_HE[n]).join(', ')+': יופיע במועד ב"להעלות עכשיו", העלאה בלחיצה. ':'')+(bad.length?bad.map(n=>NET_HE[n]+(n==='yt'?' מקבל רק סרטון':' לא מחובר')).join(', '):''));
 if(!nets.length&&man.length){it.pub.state='manual';it.pub.err='';try{saveSched(it)}catch(e){}return}
 if(!nets.length){it.pub.state='nochannel';it.pub.err='אין ערוץ מחובר של '+BRAND_HE[brand];try{saveSched(it)}catch(e){}return}
 const upd=video?'reel:'+reelUrl(it):String(p.upd||'')+'|'+(p.slide||0);
 try{
  if(force||!it.pub.media||it.pub.mupd!==upd){it.pub.media=video?reelUrl(it):await renderJpeg(p);it.pub.mupd=upd}
  const at=atNow?new Date():new Date(it.at.length===16?it.at+':00':it.at);
  const d=await call('enqueue',{items:[{item_id:it.id,post_id:p?p.id:null,brand,media_kind:video?'video':'image',title:(it.label||'').slice(0,100),label:(it.label||'').slice(0,120),at:at.toISOString(),nets,text_fb:itemText(it,'fb'),text_ig:itemText(it,'ig'),media_url:it.pub.media}]});
  it.pub.state=(d.queued||[]).includes(it.id)?'queued':(d.skipped||[]).includes(it.id)?'done':it.pub.state;it.pub.err='';
  if((d.queued||[]).includes(it.id))ST.q.set(it.id,Object.assign({},ST.q.get(it.id)||{},{item_id:it.id,post_id:p?p.id:null,label:(it.label||'').slice(0,120),at:at.toISOString(),nets,status:'queued',last_error:null}));
 }catch(e){it.pub.state='local_error';it.pub.err=e.message;toast('התזמון לפרסום נכשל: '+String(e.message).slice(0,90))}
 try{saveSched(it)}catch(e){}}
function later(it,force){clearTimeout(pending.get(it.id));pending.set(it.id,setTimeout(()=>{pending.delete(it.id);enqueue(it,force)},600))}
async function cancel(ids){if(!ids.length||!ON_SITE())return;try{await call('cancel',{item_ids:ids})}catch(e){}}

/* schedule sheet: one switch, remembered */
function autoDefault(){try{return lsGet(LS_AUTO,true)!==false}catch(e){return true}}
let armed=0,armedOn=false,lastAuto=0;
document.addEventListener('click',e=>{const t=e.target;if(!t||!t.closest)return;
 const sw=t.closest('[data-v177="auto"]');if(sw){const on=sw.getAttribute('aria-pressed')!=='true';sw.setAttribute('aria-pressed',String(on));try{lsSet(LS_AUTO,on)}catch(x){}return}
 if(t.closest('#v157 [data-v157="go"]')){const sw2=document.querySelector('#v157 [data-v177="auto"]');armed=Date.now();armedOn=sw2?sw2.getAttribute('aria-pressed')==='true':autoDefault()}},true);
// another handler may stop the click on the sheet's main button, so arm on the press too
function arm(e){const t=e.target;if(!t||!t.closest||!t.closest('#v157 [data-v157="go"]'))return;if(e.type==='keydown'&&e.key!=='Enter'&&e.key!==' ')return;const sw2=document.querySelector('#v157 [data-v177="auto"]');armed=Date.now();armedOn=sw2?sw2.getAttribute('aria-pressed')==='true':autoDefault()}
['pointerdown','keydown'].forEach(k=>window.addEventListener(k,arm,true));
// put the switch into the sheet each time it draws
new MutationObserver(()=>{const sh0=document.getElementById('v157');if(sh0&&lastAuto&&Date.now()-lastAuto<60000){sh0.querySelectorAll('small,p,span').forEach(el=>{if(el.children.length===0&&/שום דבר לא מתפרסם בלי אישור/.test(el.textContent))el.textContent='יתפרסם אוטומטית בפייסבוק ובאינסטגרם במועד. אפשר לבטל בהגדרות, בפרסום ישיר.'})}}).observe(document.body,{childList:true,subtree:true});
// drawn when the sheet opens, and again when the status arrives after it opened
function mountSwitch(){const sh=document.getElementById('v157');if(!sh||sh.querySelector('[data-v177="auto"]'))return;const f=sh.querySelector('.v157set');if(!f||!ON_SITE()||(ST.state==='ok'&&!anyConn()))return;
 const on=autoDefault();const d=document.createElement('div');d.className='v177sw';
 d.innerHTML=`<button type="button" class="v177tg" data-v177="auto" aria-pressed="${on}"><span class="v177knob" aria-hidden="true"></span><span><b>פרסום אוטומטי במועד</b><small>בכל הערוצים שסימנתם, בשעה שנבחרה</small></span></button>`;
 f.insertAdjacentElement('afterend',d)}
new MutationObserver(()=>{try{mountSwitch()}catch(e){}}).observe(document.body,{childList:true,subtree:true});

try{saveSched=(f=>function(it){const r=f.apply(this,arguments);try{
 if(it&&Date.now()-armed<4000&&ON_SITE()){armed=0;it.pub=Object.assign({},it.pub||{},{on:armedOn});lastAuto=armedOn?Date.now():0;if(armedOn)later(it,true);else if(ST.q.has(it.id))cancel([it.id])}
 else if(want(it)){const q=ST.q.get(it.id);const at=new Date(it.at.length===16?it.at+':00':it.at).toISOString();if(!q||q.at!==at||(q.status==='cancelled'))later(it,false)}
}catch(e){}return r})(saveSched)}catch(e){}
try{removeItem=(f=>function(it){try{if(it&&it.pub&&it.pub.on)cancel([it.id])}catch(e){}return f.apply(this,arguments)})(removeItem)}catch(e){}

/* ---------- settings card ---------- */
const STATE_HE={queued:'ממתין למועד',publishing:'מתפרסם עכשיו',done:'פורסם',partial:'פורסם בחלק מהערוצים',error:'נכשל',cancelled:'בוטל',local_error:'לא נשלח',nochannel:'אין ערוץ מחובר'};
function fmt(iso){try{const d=new Date(iso);return d.toLocaleDateString('he-IL',{weekday:'short',day:'2-digit',month:'2-digit'})+' · '+d.toLocaleTimeString('he-IL',{hour:'2-digit',minute:'2-digit'})}catch(e){return iso}}
function guide(){const r=ST.st&&ST.st.redirect||'https://filnzlnvujnlazwcxbuq.supabase.co/functions/v1/social/callback';
 return `<details class="v177g"${ST.form?' open':''}><summary>איך מחברים בפעם הראשונה (כ 10 דקות, חינם)</summary><ol>
  <li>נכנסים ל <b>developers.facebook.com</b> עם החשבון שמנהל את עמוד קבוצת קורקוס, ולוחצים <b>My Apps</b> ואז <b>Create App</b>.</li>
  <li>בוחרים סוג <b>Business</b> (או השימוש "ניהול עמוד" ו"תוכן באינסטגרם"), ונותנים שם, למשל "קורקוס מנוע תוכן".</li>
  <li>מוסיפים את המוצר <b>Facebook Login for Business</b>. בהגדרות שלו, תחת <b>Valid OAuth Redirect URIs</b>, מדביקים את הכתובת הזו:<div class="v177copy"><code>${E(r)}</code><button type="button" class="px-btn sm" data-v177="copy" data-t="${E(r)}">העתקה</button></div></li>
  <li>תחת <b>Configurations</b> יוצרים הגדרה עם סוג טוקן <b>User access token</b>, ומסמנים את ההרשאות: pages_show_list, pages_read_engagement, pages_manage_posts, business_management, instagram_basic, instagram_content_publish. מעתיקים את ה <b>Configuration ID</b>.</li>
  <li>ב <b>App settings</b> ואז <b>Basic</b> מעתיקים את <b>App ID</b> ואת <b>App Secret</b>, ומדביקים כאן למטה.</li>
  <li>לוחצים "התחברות עם פייסבוק", בוחרים את עמוד קבוצת קורקוס ואת חשבון האינסטגרם, ומאשרים. האפליקציה יכולה להישאר במצב פיתוח, כי רק אתם משתמשים בה.</li></ol>
  <p class="muted">אינסטגרם צריך להיות חשבון עסקי או חשבון יוצר שמקושר לעמוד הפייסבוק.</p></details>`}
function formHtml(){return `<form class="v177form" data-v177="cfg"><label>App ID<input name="app_id" inputmode="numeric" autocomplete="off" required></label><label>App Secret<input name="app_secret" type="password" autocomplete="off" required></label><label>Configuration ID<input name="config_id" inputmode="numeric" autocomplete="off" placeholder="מומלץ"></label><button type="submit" class="px-btn red">שמירה</button></form>`}
function rowsHtml(){const accs=ST.st&&ST.st.accounts||[];
 const sel=a=>`<label class="v177as"><span>מפרסם עבור</span><select data-v177sel="${E(a.id)}" aria-label="עבור איזה מותג ${E(a.name||'')}"><option value="kurkoos"${a.brand==='kurkoos'?' selected':''}>קבוצת קורקוס</option><option value="afik"${a.brand==='afik'?' selected':''}>אפיק הנחל</option><option value=""${!a.brand?' selected':''}>לא בשימוש</option></select></label>`;
 const row=(k,a)=>`<li class="v173row v177acc${a.brand?'':' off'}"><span class="v173b" style="background:${(NETS[k]||{}).c||'#105572'}" aria-hidden="true">${(NETS[k]||{}).l||''}</span><span class="v173n"><b>${E(a.username?'@'+a.username:a.name||'')}</b><span>${k==='fb'?'עמוד פייסבוק':'חשבון אינסטגרם'}${a.brand?'':' · לא יקבל פוסטים'}</span></span>${sel(a)}<span></span></li>`;
 const none=(k,name,note)=>`<li class="v173row"><span class="v173b" style="background:${(NETS[k]||{}).c||'#105572'}" aria-hidden="true">${(NETS[k]||{}).l||''}</span><span class="v173n"><b>${name}</b><span>${E(note)}</span></span><span class="v173c no">לא מחובר</span><span></span></li>`;
 const fb=accs.filter(a=>a.network==='facebook'),ig=accs.filter(a=>a.network==='instagram');
 const mc=(ST.st&&ST.st.mc)||{};const N=mc.networks||{};
 const viaMc=(k,name,net,note)=>`<li class="v173row"><span class="v173b" style="background:${(NETS[k]||{}).c||'#105572'}" aria-hidden="true">${(NETS[k]||{}).l||k.toUpperCase()}</span><span class="v173n"><b>${name}</b><span>${N[net]?E(String(N[net]).slice(0,40))+' · דרך Metricool, אוטומטי':E(note)}</span></span><span class="v173c ${N[net]?'ok':'mid'}">${N[net]?'מחובר':'ידני מהיר'}</span><span></span></li>`;
 return (fb.length?fb.map(a=>row('fb',a)).join(''):none('fb','פייסבוק','עמוד קבוצת קורקוס'))+(ig.length?ig.map(a=>row('ig',a)).join(''):viaMc('ig','אינסטגרם','instagram','לא מחובר ישירות. עד החיבור: העלאה בלחיצה מ"להעלות עכשיו". איך מחברים: במדריך למטה'))
  +viaMc('tt','טיקטוק','tiktok','במועד הפוסט מופיע ב"להעלות עכשיו": שיתוף לאפליקציה בלחיצה')+viaMc('yt','יוטיוב','youtube','סרטונים בלבד. במועד מופיע ב"להעלות עכשיו"')+viaMc('gmb','גוגל עסקים','gmb','במועד מופיע ב"להעלות עכשיו"')}
function mcHtml(){const mc=(ST.st&&ST.st.mc)||{};const n=Object.keys(mc.networks||{}).length;
 return `<details class="v192mc"${mc.set?' open':''}><summary class="v192mch"><b>Metricool עם API (לא חובה)</b><span class="v173c ${mc.set&&!mc.error?'ok':'no'}">${!mc.set?'לא בשימוש':mc.error?'יש תקלה':n+' ערוצים'}</span></summary><p class="muted">רק בתוכנית של Metricool שיש בה API. בלי זה הכל עובד: פייסבוק ישירות, ושאר הערוצים בהעלאה מהירה.</p>
  <p class="muted">אינסטגרם, טיקטוק, יוטיוב וגוגל עסקים יוצאים דרך Metricool. כ 20 דקות לפני המועד המערכת מעבירה את הפוסט ל-Metricool, מתוזמן לשעה המדויקת עם פרסום אוטומטי. עד אז אפשר להזיז או לבטל בלוח שלנו.</p>
  ${mc.error?`<p class="v177err">${E(mc.error)}</p>`:''}
  <form class="v177form v192f" data-v192="mc"><label>מפתח ה-API של Metricool<input name="token" type="password" autocomplete="off" placeholder="${mc.set?'שמור. מדביקים מפתח חדש רק כדי להחליף':'מדביקים כאן'}" required></label><button type="submit" class="px-btn red">${mc.set?'החלפת מפתח':'חיבור'}</button></form></details>`}
function guideAll(){return `<details class="v177g v192g" open><summary>מה לעשות בכל ערוץ, שלב אחרי שלב</summary>
 <h4>פייסבוק · ישיר, אוטומטי</h4><ol><li>אם עוד לא: ממלאים את פרטי האפליקציה של פייסבוק (הכפתור "פרטי האפליקציה").</li><li>"חיבור מחדש", ובחלון של פייסבוק מסמנים את העמודים.</li><li>ליד כל עמוד בוחרים "מפרסם עבור": קבוצת קורקוס, אפיק הנחל, או "לא בשימוש".</li></ol>
 <h4>אינסטגרם · ישיר, אוטומטי, חינם</h4><ol><li>באפליקציית אינסטגרם של @kurkoos_group: הגדרות, "סוג חשבון וכלים", ועוברים לחשבון מקצועי מסוג עסק.</li><li>באותו מקום, או ב Meta Business Suite: מקשרים את החשבון לעמוד הפייסבוק "Kurkoos Group".</li><li>חוזרים לכאן, "חיבור מחדש", ובחלון של פייסבוק מסמנים גם את חשבון האינסטגרם.</li><li>השורה של אינסטגרם תהפוך ל"מחובר", ומאז כל פוסט יוצא לבד במועד.</li></ol>
 <h4>טיקטוק · היום: העלאה מהירה</h4><ol><li>במועד הפוסט הוא מופיע ב"להעלות עכשיו" (בעמוד "היום" ובכרטיס הזה). בטלפון: "שיתוף לאפליקציה" פותח את טיקטוק עם הסרטון או התמונה, והטקסט מועתק. מדביקים ומפרסמים.</li><li>אחרי הפרסום: "סימנתי שהועלה".</li><li>פרסום אוטומטי ישיר בעתיד: אפליקציה ב developers.tiktok.com עם Content Posting API, ובדיקה של טיקטוק (בדרך כלל כמה שבועות). עד שהבדיקה עוברת, טיקטוק מפרסם רק כפרטי.</li></ol>
 <h4>יוטיוב · היום: העלאה מהירה, סרטונים בלבד</h4><ol><li>במועד: "שיתוף לאפליקציה" או "פתיחה" ל YouTube Studio, מעלים את הסרטון שהורד, מדביקים כותרת וטקסט.</li><li>פרסום אוטומטי ישיר בעתיד: פרויקט ב Google Cloud עם YouTube Data API ובדיקה של גוגל. עד שהבדיקה עוברת, יוטיוב נועל כל העלאה כפרטית.</li></ol>
 <h4>גוגל עסקים · היום: העלאה מהירה</h4><ol><li>במועד: "פתיחה" לפרופיל העסק, "הוספת עדכון", מדביקים את הטקסט ומעלים את התמונה שהורדה.</li><li>פרסום אוטומטי ישיר בעתיד: בקשת גישה ל Business Profile API מגוגל, ואחרי האישור מחברים כאן.</li></ol>
 <p class="muted">Metricool בלי API: אפשר להמשיך לתזמן בו ידנית. הטקסט והתמונה מוכנים כאן בלחיצה.</p></details>`}
function queueHtml(){const items=[...ST.q.values()].filter(x=>x.status!=='cancelled').sort((a,b)=>String(a.at).localeCompare(String(b.at)));
 const up=items.filter(x=>['queued','publishing','error','partial'].includes(x.status)).slice(0,12),done=items.filter(x=>x.status==='done').slice(-5).reverse();
 if(!up.length&&!done.length)return `<p class="muted v177empty">עוד אין פוסטים לפרסום אוטומטי. בחלון "שמירה ותזמון" מסמנים "פרסום אוטומטי במועד".</p>`;
 const li=x=>`<li class="v177q s-${x.status}"><span class="v177qt"><b>${E(x.label||'פוסט')}</b><span>${fmt(x.at)} · ${(x.nets||[]).map(n=>NET_HE[n]||n).join(' ו')}</span>${x.last_error?`<span class="v177err">${E(x.last_error)}</span>`:''}</span><span class="v177st">${STATE_HE[x.status]||x.status}</span>
  ${['queued','error','partial'].includes(x.status)?`<span class="v177qa"><button type="button" class="px-btn sm" data-v177="now" data-id="${E(x.item_id)}">פרסום עכשיו</button><button type="button" class="px-btn sm" data-v177="cancel" data-id="${E(x.item_id)}">ביטול</button></span>`:''}</li>`;
 return `${up.length?`<h3 class="v177h3">בתור לפרסום</h3><ul class="v177ql">${up.map(li).join('')}</ul>`:''}${done.length?`<h3 class="v177h3">פורסמו לאחרונה</h3><ul class="v177ql">${done.map(li).join('')}</ul>`:''}`}
function cardHtml(){const s=ST.st;let head='',body='';
 if(ST.state==='off'){head='<span class="v173st warn">זמין באתר בלבד</span>';body='<p class="v177p">פרסום ישיר עובד כשנכנסים למערכת דרך עמוד הניהול של האתר.</p>'}
 else if(ST.state==='busy'&&!s){head='<span class="v173st">בודק חיבור…</span>'}
 else if(ST.state==='err'){head='<span class="v173st warn">אין חיבור לשרת</span>';body=`<p class="v177p">${E(ST.err)}</p>`}
 else if(s){const on=anyConn();
  head=on?'<span class="v173st on">מחובר</span>':s.app?'<span class="v173st warn">צריך להתחבר</span>':'<span class="v173st warn">עוד לא מחובר</span>';
  body=`<ul class="v173list">${rowsHtml()}</ul>
   <div class="v177acts">${s.app?`<button type="button" class="px-btn red" data-v177="login">${on?'חיבור מחדש':'התחברות עם פייסבוק'}</button>`:''}
    ${on?`<button type="button" class="px-btn" data-v177="off">ניתוק</button>`:''}
    <button type="button" class="px-btn" data-v177="form">${s.app?'פרטי האפליקציה':'הגדרת האפליקציה'}</button></div>
   ${!s.app||ST.form?guide()+formHtml():''}
   ${mcHtml()}${guideAll()}
   ${manHtml()}${on?lateHtml()+queueHtml():''}
   ${on?bulkHtml():''}`}
 return `<section class="v173card v177card" id="v177card" aria-labelledby="v177h"><div class="v173top"><h2 class="vh" id="v177h" style="margin:0">פרסום ותזמון לכל הערוצים</h2>${head}<button type="button" class="px-btn sm" data-v177="re">רענון</button></div>
  <p class="muted v173p">המערכת מפרסמת בעצמה, בדיוק במועד שנקבע, בכל הערוצים שסימנתם: פייסבוק ישירות לעמוד של המותג (קבוצת קורקוס או אפיק הנחל), ואינסטגרם, טיקטוק, יוטיוב וגוגל עסקים דרך Metricool. עמוד שמסומן "לא בשימוש" לא מקבל כלום. רק פוסטים שסימנתם "פרסום אוטומטי" יוצאים.</p>${body}</section>`}
function lateList(){const now=Date.now();return ((APP.sched&&APP.sched.items)||[]).filter(it=>(!it.reel||reelUrl(it))&&it.at&&it.status==='ready'&&anyNet(it)&&['fb','ig','tt','yt','gmb'].some(n=>it.nets[n]&&routeOk(n,it.reel?'kurkoos':brandOf(it)))&&!(ST.q.get(it.id)&&['done','publishing','queued'].includes(ST.q.get(it.id).status))&&(()=>{const t=new Date(it.at.length===16?it.at+':00':it.at).getTime();return t<now&&now-t<7*864e5})())}
function lateHtml(){const l=lateList();if(!l.length)return '';
 return `<h3 class="v177h3">המועד עבר והפוסט לא יצא</h3><ul class="v177ql">${l.map(it=>`<li class="v177q s-error"><span class="v177qt"><b>${E(it.label||'פוסט')}</b><span>${fmt(new Date(it.at.length===16?it.at+':00':it.at).toISOString())} · ${BRAND_HE[brandOf(it)]}</span><span class="v177err">${it.pub&&it.pub.on?E(it.pub.err||'לא נשלח לתור'):'נשמר בלי פרסום אוטומטי'}</span></span><span class="v177qa"><button type="button" class="px-btn sm red" data-v177="late" data-id="${E(it.id)}">פרסום עכשיו</button></span></li>`).join('')}</ul>`}
function bulkHtml(){const n=((APP.sched&&APP.sched.items)||[]).filter(it=>(!it.reel||reelUrl(it))&&it.at&&new Date(it.at)>new Date()&&!(it.pub&&it.pub.on)&&anyNet(it)).length;
 return n?`<div class="v177bulk"><span>${n} פוסטים מתוזמנים בלוח עדיין בלי פרסום אוטומטי</span><button type="button" class="px-btn sm" data-v177="bulk">להפעיל לכולם</button></div>`:''}
function paint(){const el=document.getElementById('v177card');if(el)el.outerHTML=cardHtml()}
try{vSettings=(f=>function(){return cardHtml()+f.apply(this,arguments)})(vSettings)}catch(e){}
try{render=(f=>function(){const r=f.apply(this,arguments);try{if(APP.view==='settings'&&ST.state==='idle')load()}catch(e){}return r})(render)}catch(e){}

document.addEventListener('click',async e=>{const b=e.target.closest&&e.target.closest('[data-v177]');if(!b||b.dataset.v177==='auto'||b.dataset.v177==='cfg')return;const a=b.dataset.v177;e.preventDefault();
 try{
  if(a==='re'){load();return}
  if(a==='form'){ST.form=!ST.form;paint();return}
  if(a==='copy'){try{await navigator.clipboard.writeText(b.dataset.t);toast('הכתובת הועתקה')}catch(x){toast(b.dataset.t)}return}
  if(a==='login'){b.disabled=true;const d=await call('start',{back:location.origin+location.pathname});location.href=d.url;return}
  if(a==='off'){if(b.dataset.ok!=='1'){b.dataset.ok='1';b.textContent='לנתק? לחצו שוב';return}await call('disconnect');toast('העמודים נותקו');load();return}
  if(a==='cancel'){await call('cancel',{item_ids:[b.dataset.id]});const it=(APP.sched.items||[]).find(i=>i.id===b.dataset.id);if(it&&it.pub){it.pub.on=false;it.pub.state='cancelled';saveSched(it)}toast('הפרסום האוטומטי בוטל');await syncQueue();return}
  if(a==='now'){if(b.dataset.ok!=='1'){b.dataset.ok='1';b.textContent='לפרסם עכשיו? לחצו שוב';return}b.disabled=true;b.textContent='מפרסם…';const d=await call('run',{only:b.dataset.id});const r=(d.ran||[])[0];toast(r?(r.status==='done'?'פורסם':'הפרסום נכשל: '+(r.errors||[]).join(' · ').slice(0,120)):'לא נמצא פוסט לפרסום');await syncQueue();return}
  if(a==='late'){if(b.dataset.ok!=='1'){b.dataset.ok='1';b.textContent='לפרסם עכשיו? לחצו שוב';return}const it=(APP.sched.items||[]).find(i=>i.id===b.dataset.id);if(!it)return;b.disabled=true;b.textContent='מפרסם…';
   it.pub=Object.assign({},it.pub||{},{on:true});await enqueue(it,true,true);if(it.pub.state!=='queued'){paint();return}
   const d=await call('run',{only:it.id});const r=(d.ran||[])[0];toast(r?(r.status==='done'?'פורסם':'הפרסום נכשל: '+(r.errors||[]).join(' · ').slice(0,120)):'הפוסט בתור ויתפרסם בדקות הקרובות');await syncQueue();return}
  if(a==='bulk'){const list=((APP.sched&&APP.sched.items)||[]).filter(it=>(!it.reel||reelUrl(it))&&it.at&&new Date(it.at)>new Date()&&!(it.pub&&it.pub.on)&&anyNet(it));
   if(b.dataset.ok!=='1'){b.dataset.ok='1';b.textContent=`לפרסם אוטומטית ${list.length} פוסטים? לחצו שוב`;return}
   b.disabled=true;let n=0;for(const it of list){it.pub=Object.assign({},it.pub||{},{on:true});b.textContent=`מכין ${++n} מתוך ${list.length}…`;await enqueue(it,true)}
   toast(`${list.length} פוסטים יתפרסמו אוטומטית במועד`);await syncQueue();return}
 }catch(x){toast(String(x.message||'הפעולה נכשלה').slice(0,120));paint()}});
document.addEventListener('change',async e=>{const t=e.target;if(!t||!t.dataset||!t.dataset.v177sel)return;t.disabled=true;
 try{await call('assign',{id:t.dataset.v177sel,brand:t.value});toast(t.value?'העמוד יפרסם עבור '+BRAND_HE[t.value]:'העמוד לא יקבל פוסטים');await load()}catch(x){toast(String(x.message).slice(0,120));t.disabled=false}});
document.addEventListener('submit',async e=>{const f=e.target;if(!f||f.dataset.v192!=='mc')return;e.preventDefault();const b=f.querySelector('button');b.disabled=true;
 try{const d=await call('mc_config',{token:new FormData(f).get('token')});toast('Metricool מחובר: '+Object.keys(d.networks||{}).length+' ערוצים');await load()}catch(x){toast(String(x.message).slice(0,140));b.disabled=false}});
document.addEventListener('submit',async e=>{const f=e.target;if(!f||f.dataset.v177!=='cfg')return;e.preventDefault();const d=Object.fromEntries(new FormData(f).entries());
 try{await call('config',d);toast('נשמר. עכשיו התחברות עם פייסבוק');ST.form=false;load()}catch(x){toast(String(x.message).slice(0,140))}});

// back from Facebook
try{const u=new URL(location.href);const s=u.searchParams.get('social');if(s){const m=u.searchParams.get('m');u.searchParams.delete('social');u.searchParams.delete('m');u.searchParams.delete('n');history.replaceState(null,'',u.pathname+(u.search||'')+u.hash);
 setTimeout(()=>{try{go('settings')}catch(x){}toast(s==='ok'?'העמודים חוברו. אפשר לתזמן פרסום אוטומטי':'החיבור לא הושלם: '+(m||''))},1500)}}catch(e){}

// keep statuses fresh while the engine is open
setTimeout(()=>{if(ON_SITE())load()},3000);
setInterval(()=>{if(ON_SITE()&&document.visibilityState==='visible'&&anyConn())syncQueue(APP.view!=='settings')},90000);

/* ---------- V193 · channels with no automatic route: at the post's time it waits in "להעלות עכשיו" ---------- */
const MAN={ig:{open:'https://www.instagram.com/'},tt:{open:'https://www.tiktok.com/upload'},yt:{open:'https://studio.youtube.com/'},gmb:{open:'https://business.google.com/'}};
function manNets(it){if(!it||!it.nets)return [];const brand=it.reel?(it.brand==='afik'?'afik':'kurkoos'):brandOf(it);return ['ig','tt','yt','gmb'].filter(n=>it.nets[n]&&!routeOk(n,brand)&&!(n==='yt'&&!it.reel)&&!(it.man&&it.man[n]))}
const atMs=it=>new Date(it.at.length===16?it.at+':00':it.at).getTime();
function manList(){const now=Date.now();return ((APP.sched&&APP.sched.items)||[]).filter(it=>it.at&&['ready','approved','published'].includes(it.status)&&(!it.reel||reelUrl(it))&&(()=>{const t=atMs(it);return t<now+3*3600e3&&now-t<4*864e5})()&&manNets(it).length).sort((a,b)=>atMs(a)-atMs(b))}
function manHtml(){const l=manList();if(!l.length)return '';
 return `<section class="v193" aria-labelledby="v193h"><h3 class="v177h3" id="v193h">להעלות עכשיו</h3><p class="muted v193p">ערוצים שעוד לא מחוברים לפרסום אוטומטי. "שיתוף" בטלפון פותח את האפליקציה עם התמונה או הסרטון, והטקסט מועתק.</p><ul class="v177ql">${l.map(it=>{const t=atMs(it),late=t<Date.now();return `<li class="v177q v193i${late?' late':''}"><span class="v177qt"><b>${E((it.label||itemText(it,'fb')||'פוסט').replace(/\n/g,' ').slice(0,70))}</b><span>${fmt(new Date(t).toISOString())}${late?' · הגיע הזמן':''}</span></span>
  <span class="v193n">${manNets(it).map(n=>`<span class="v193c"><b>${NET_HE[n]}</b><button type="button" class="px-btn sm red" data-v193="share" data-id="${E(it.id)}" data-n="${n}">שיתוף</button><button type="button" class="px-btn sm" data-v193="open" data-n="${n}">פתיחה</button><button type="button" class="px-btn sm" data-v193="done" data-id="${E(it.id)}" data-n="${n}">סימנתי שהועלה</button></span>`).join('')}
  <span class="v193c"><button type="button" class="px-btn sm" data-v193="copy" data-id="${E(it.id)}">העתקת הטקסט</button><button type="button" class="px-btn sm" data-v193="dl" data-id="${E(it.id)}">הורדת הקובץ</button></span></span></li>`}).join('')}</ul></section>`}
async function manFile(it){if(it.reel){const u=reelUrl(it);const b=await (await fetch(u)).blob();return new File([b],'kurkoos.mp4',{type:b.type||'video/mp4'})}
 const p=itemPost(it);if(!p)throw new Error('הפוסט לא נמצא');const b=await renderBlob(p);return new File([b],'kurkoos.jpg',{type:'image/jpeg'})}
const manText=(it,n)=>itemText(it,n==='ig'?'ig':'fb')||it.label||'';
document.addEventListener('click',async e=>{const b=e.target.closest&&e.target.closest('[data-v193]');if(!b)return;e.preventDefault();const a=b.dataset.v193,n=b.dataset.n;const it=b.dataset.id&&((APP.sched&&APP.sched.items)||[]).find(i=>i.id===b.dataset.id);
 try{
  if(a==='open'){window.open(MAN[n].open,'_blank','noopener');return}
  if(a==='copy'){await navigator.clipboard.writeText(manText(it,'fb'));toast('הטקסט הועתק');return}
  if(a==='dl'){b.disabled=true;const f=await manFile(it);const u=URL.createObjectURL(f);const x=document.createElement('a');x.href=u;x.download=f.name;document.body.appendChild(x);x.click();x.remove();setTimeout(()=>URL.revokeObjectURL(u),4000);b.disabled=false;return}
  if(a==='share'){b.disabled=true;const txt=manText(it,n);try{await navigator.clipboard.writeText(txt)}catch(x){}const f=await manFile(it);
   if(navigator.canShare&&navigator.canShare({files:[f]})){try{await navigator.share({files:[f],text:txt})}catch(x){}}else{const u=URL.createObjectURL(f);const x=document.createElement('a');x.href=u;x.download=f.name;document.body.appendChild(x);x.click();x.remove();setTimeout(()=>URL.revokeObjectURL(u),4000);window.open(MAN[n].open,'_blank','noopener');toast('הקובץ ירד והטקסט הועתק. מדביקים באפליקציה')}
   b.disabled=false;return}
  if(a==='done'){it.man=Object.assign({},it.man||{},{[n]:new Date().toISOString()});try{saveSched(it)}catch(x){}toast(NET_HE[n]+': סומן שהועלה');document.querySelectorAll('.v193').forEach(el=>{const h=manHtml();if(h)el.outerHTML=h;else el.remove()});return}
 }catch(x){b.disabled=false;toast(String(x.message||'הפעולה לא הצליחה').slice(0,120))}});
// on the "היום" page too, at the top
try{render=(f=>function(){const r=f.apply(this,arguments);try{if(APP.view==='today'){const box=document.getElementById('appviews');if(box&&!box.querySelector('.v193')){const h=manHtml();if(h)box.insertAdjacentHTML('afterbegin',h)}}}catch(e){}return r})(render)}catch(e){}
window.__v177={load,ST,enqueue,syncQueue,call,manList};
})();
