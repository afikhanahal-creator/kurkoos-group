// ================= V100 · video editor in the system: every video that enters (upload, cloner, animation) is queued for a
//                   professional edit into a reel by the Opus 5.5 routine; a videos page shows sources, status and results;
//                   "ערוך כרילס" buttons in the editor room and the animation window =================
(function(){
const VIDEO_TRIGGER='trig_01E37BdRRUdgin2XXQVpx7hN';
const ART='https://claude.ai/artifact/FGRUkHgHBjpBLHXFjbztz4';
const KNOWN=[['kurkoos-v1.mp4','רילס מפוסט · 1'],['kurkoos-v2.mp4','רילס מפוסט · 2'],['kurkoos-v3.mp4','רילס מפוסט · 3'],['reel-1.mp4','רילס · 1'],['reel-2.mp4','רילס · 2'],['reel-3.mp4','רילס · 3']];
const VD={db:null,assets:null,mcp:null,docs:[],ready:false,auto:(function(){try{return localStorage.getItem('vid_auto')!=='0'}catch(e){return true}})(),style:(function(){try{return localStorage.getItem('vid_style')||'clean'}catch(e){return 'clean'}})()};
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>'v'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const toastSafe=m=>{try{toast(m)}catch(e){console.log(m)}};
// ---------- runtime ----------
async function init(){const use=n=>(window.claude&&window.claude.use)?window.claude.use(n).catch(()=>null):Promise.resolve(null);
 const [db,assets,mcp]=await Promise.all([use('db'),use('assets'),use('mcp')]);VD.db=db;VD.assets=assets;VD.mcp=mcp;VD.ready=true;
 if(db){try{db.collection('videos').onSnapshot(snap=>{const rows=[];snap.forEach?snap.forEach(d=>rows.push(Object.assign({id:d.id},d.data?d.data():d))):(snap.docs||[]).forEach(d=>rows.push(Object.assign({id:d.id},d.data?d.data():d)));VD.docs=rows.sort((a,b)=>String(b.created||'').localeCompare(String(a.created||'')));if(typeof APP!=='undefined'&&APP.view==='videos')render()})}catch(e){try{const s=await db.collection('videos').get();const rows=[];(s.docs||s).forEach(d=>rows.push(Object.assign({id:d.id},d.data?d.data():d)));VD.docs=rows}catch(x){}}}
 if(typeof APP!=='undefined'&&APP.view==='videos')render()}
// ---------- queue a video for the editor ----------
async function queueDoc(doc){if(!VD.db)throw new Error('nodb');const d=Object.assign({status:'queued',created:new Date().toISOString(),style:VD.style,brand:'full',hook:'',cta:'',keywords:[]},doc);await VD.db.collection('videos').doc(d.id).set(d);return d}
async function fire(d){if(!VD.mcp)throw new Error('nomcp');const payload={id:d.id,name:d.name||'',asset:d.srcId||null,path:d.path||null,brand:d.brand||'full',style:d.style||VD.style,hook:d.hook||'',cta:d.cta||'',keywords:d.keywords||[],artifact:ART};
 await VD.mcp.callTool('Claude Code Remote','fire_trigger',{trigger_id:VIDEO_TRIGGER,text:JSON.stringify(payload)},{cache:false})}
async function editVideo(d){try{await fire(d);toastSafe('הסרטון נשלח לעורך. העריכה לוקחת כמה דקות ותופיע בעמוד "סרטונים"');return true}catch(e){const c=e&&e.code;toastSafe(c==='not_granted'?'אשרו לדף גישה ל-Claude Code Remote כדי לשלוח לעורך':'לא הצלחתי לשלוח לעורך: '+(e&&e.message||e));return false}}
async function uploadAndQueue(file,opts={}){if(!VD.assets||!VD.db){toastSafe('העלאת סרטונים לעריכה זמינה כשהדף פתוח ב-claude.ai עם הרשאת עריכה');return null}
 if(file.size>20*1024*1024){toastSafe('הסרטון גדול מ-20MB. קצרו אותו או דחסו אותו ונסו שוב');return null}
 const id=uid();toastSafe('מעלה את הסרטון…');
 try{const r=await VD.assets.upload(file);const d=await queueDoc({id,name:(file.name||'סרטון').replace(/\.[^.]+$/,'').slice(0,60),srcId:r.id,srcUrl:r.url,size:r.sizeBytes,source:opts.source||'upload',brand:opts.brand||'full',style:opts.style||VD.style,hook:opts.hook||'',cta:opts.cta||''});
  if(VD.auto||opts.force)await editVideo(d);return d}catch(e){const c=e&&e.code;toastSafe(c==='too_large'?'הסרטון גדול מדי':c==='quota_or_state'?'נגמר המקום בספריית הנכסים':'ההעלאה נכשלה');return null}}
window.__vid={uploadAndQueue,editVideo,queueDoc,VD};
// every video that enters through any file input or drop zone in the system is queued (images keep their normal path)
document.addEventListener('change',e=>{const t=e.target;if(!t||t.type!=='file'||!t.files||!t.files.length)return;const vids=[...t.files].filter(f=>/^video\//.test(f.type));if(!vids.length)return;
 const src=t.closest('.v51')||t.closest('[data-v51drop]')?'cloner':t.closest('.v48')?'agent':t.closest('#kc-drop')?'studio':'upload';vids.forEach(f=>uploadAndQueue(f,{source:src}))},true);
document.addEventListener('drop',e=>{const dt=e.dataTransfer;if(!dt||!dt.files||!dt.files.length)return;if(e.target.closest&&e.target.closest('#v100page'))return;const vids=[...dt.files].filter(f=>/^video\//.test(f.type));if(!vids.length)return;
 const src=e.target.closest&&(e.target.closest('.v51')?'cloner':e.target.closest('.v48')?'agent':'drop');vids.forEach(f=>uploadAndQueue(f,{source:src}))},true);
// ---------- the videos page ----------
const grp=VIEWS.find(g=>g[0]==='תוכן');if(grp&&!grp[1].some(v=>v[0]==='videos'))grp[1].push(['videos','סרטונים ורילס','play']);
VTITLE.videos=['סרטונים ורילס','כל סרטון שנכנס למערכת נערך לרילס ברמה של עורך וידאו'];
const STATUS={queued:['בתור לעריכה','q'],editing:['בעריכה…','e'],done:['מוכן','d'],failed:['נכשל','f']};
function page(){const docs=VD.docs;const known=KNOWN.filter(([p])=>!docs.some(d=>d.path===p));
 return `<div id="v100page" class="v100">
  <section class="v100top"><div><h2>העורך האוטומטי</h2><p>כל סרטון שעולה למערכת (העלאה, שיבוט ממתחרים, הנפשה) נשלח לעורך וידאו שעובד על מודל Opus 5.5: חיתוך שקטים, כתוביות קריוקי בעברית על המילה המדויקת, אפקטים עם צליל, לוגו ומסגרת מותג, פורמט רילס 9:16, ובדיקת עורך לפני מסירה.</p>
   <div class="v100row"><label class="v100sw"><input type="checkbox" data-v100="auto" ${VD.auto?'checked':''}><span>עריכה אוטומטית לכל סרטון שנכנס</span></label>
    <label class="v100sel">סגנון ברירת מחדל <select data-v100="style">${[['clean','נקי ומינימליסטי'],['punchy','אנרגטי'],['cinematic','קולנועי']].map(([k,l])=>`<option value="${k}" ${VD.style===k?'selected':''}>${l}</option>`).join('')}</select></label></div>
   <label class="v100drop" data-v100drop><input type="file" accept="video/*" multiple data-v100f hidden><b>גררו לכאן סרטון, או לחצו לבחירה</b><span>עד 20MB לסרטון. התמלול בעברית נעשה עם ivrit.ai כשזמין, אחרת עם מפתח ענן (Deepgram) שמוגדר בקובץ api-keys.txt</span></label>
   ${VD.ready&&!VD.assets?'<p class="v100note">ההעלאה והשליחה לעורך פועלות כשהדף פתוח ב-claude.ai עם הרשאת עריכה.</p>':''}</section>
  <section><h3>סרטונים במערכת</h3><div class="v100grid">
   ${docs.map(card).join('')}
   ${known.map(([p,n])=>`<article class="v100c"><div class="v100v"><video controls playsinline preload="metadata" src="${esc(p)}"></video></div><div class="v100m"><b>${esc(n)}</b><span class="v100st q0">מקור במערכת, עדיין לא נערך</span><div class="v100b"><button type="button" class="px-btn sm pri" data-v100="editknown" data-path="${esc(p)}" data-name="${esc(n)}">ערוך כרילס</button></div></div></article>`).join('')}
   ${!docs.length&&!known.length?'<p class="v100note">עדיין אין סרטונים. העלו סרטון ראשון.</p>':''}
  </div></section></div>`}
function card(d){const [sl,sc]=STATUS[d.status]||[d.status,'q'];const src=d.out||d.srcUrl||(d.path?d.path:'');
 return `<article class="v100c" data-vid="${esc(d.id)}"><div class="v100v">${src?`<video controls playsinline preload="metadata" src="${esc(src)}"></video>`:'<div class="v100ph"></div>'}${d.out?'<span class="v100tag">רילס ערוך</span>':''}</div>
  <div class="v100m"><b>${esc(d.name||d.id)}</b><span class="v100st ${sc}">${sl}${d.status==='failed'&&d.error?' · '+esc(d.error):''}</span>
  ${d.qa?`<details class="v100qa"><summary>בדיקת העורך</summary><pre>${esc(d.qa)}</pre></details>`:''}
  ${d.transcript&&d.transcript!=='ok'?`<small class="v100note">תמלול: ${esc(d.transcript==='no_audio'?'אין אודיו בסרטון':d.transcript)}</small>`:''}
  <div class="v100b">${d.out?`<a class="px-btn sm" href="${esc(d.out)}" download>הורדה</a>`:''}<button type="button" class="px-btn sm ${d.out?'ghost':'pri'}" data-v100="edit" data-id="${esc(d.id)}">${d.out?'ערוך שוב':d.status==='editing'?'שלח שוב לעורך':'ערוך כרילס'}</button>${d.srcUrl?`<a class="px-btn sm ghost" href="${esc(d.srcUrl)}" target="_blank" rel="noopener">המקור</a>`:''}</div></div></article>`}
render=(f=>function(){const v=typeof APP!=='undefined'?APP.view:'';if(v!=='videos')return f.apply(this,arguments);renderNav();const [t,s]=VTITLE[v];document.getElementById('vt').textContent=t;document.getElementById('vs').textContent=s;document.querySelectorAll('.wrap > section').forEach(sec=>sec.classList.add('view-hidden'));
 document.getElementById('vact').innerHTML=`<button class="ibtn" type="button" data-v100="refresh">${typeof ico==='function'?ico('refresh',16):''} רענון</button>`;document.getElementById('appviews').innerHTML=page();try{window.__v99&&__v99.ensureNav()}catch(e){}})(render);
document.addEventListener('click',async e=>{const b=e.target.closest&&e.target.closest('[data-v100]');if(!b)return;const a=b.dataset.v100;
 if(a==='edit'){const d=VD.docs.find(x=>x.id===b.dataset.id);if(!d)return;b.disabled=true;try{if(VD.db){await VD.db.collection('videos').doc(d.id).update({status:'queued',requested:new Date().toISOString()})}}catch(x){}await editVideo(d);b.disabled=false}
 else if(a==='editknown'){b.disabled=true;try{const d=await queueDoc({id:uid(),name:b.dataset.name,path:b.dataset.path,source:'system',brand:'none'});await editVideo(d);render()}catch(x){toastSafe('השליחה לעורך זמינה כשהדף פתוח ב-claude.ai עם הרשאת עריכה')}b.disabled=false}
 else if(a==='refresh'){render()}
 else if(a==='anim'){const v=document.querySelector('#v52m .v52res video');const url=v&&v.getAttribute('src');if(!url)return;b.disabled=true;try{const d=await queueDoc({id:uid(),name:'הנפשה · '+new Date().toLocaleDateString('he-IL'),srcUrl:url,srcId:(url.match(/_blob\/([0-9a-f]{32})/)||[])[1]||null,source:'animation',brand:'full'});await editVideo(d)}catch(x){toastSafe('השליחה לעורך זמינה כשהדף פתוח ב-claude.ai עם הרשאת עריכה')}b.disabled=false}
 else if(a==='pe'){const p=typeof PE!=='undefined'&&PE.p;if(!p)return;const url=(p.fx&&(p.fx.videoUrl||p.fx.video))||p.videoUrl;if(!url){toastSafe('לפוסט הזה אין סרטון. צרו הנפשה בלשונית "תמונה" או העלו סרטון בעמוד "סרטונים ורילס"');return}b.disabled=true;try{const d=await queueDoc({id:uid(),name:(p.visual&&p.visual.headline||'פוסט').replace(/\n/g,' ').slice(0,60),srcUrl:url,srcId:(String(url).match(/_blob\/([0-9a-f]{32})/)||[])[1]||null,source:'editor',brand:'full'});await editVideo(d)}catch(x){toastSafe('השליחה לעורך זמינה כשהדף פתוח ב-claude.ai עם הרשאת עריכה')}b.disabled=false}});
document.addEventListener('change',e=>{const t=e.target;if(!t.dataset||!t.dataset.v100)return;if(t.dataset.v100==='auto'){VD.auto=t.checked;try{localStorage.setItem('vid_auto',t.checked?'1':'0')}catch(x){}}else if(t.dataset.v100==='style'){VD.style=t.value;try{localStorage.setItem('vid_style',t.value)}catch(x){}}else if(t.hasAttribute('data-v100f')){[...t.files].forEach(f=>uploadAndQueue(f,{source:'videos',force:true}));t.value=''}});
document.addEventListener('dragover',e=>{const d=e.target.closest&&e.target.closest('[data-v100drop]');if(d){e.preventDefault();d.classList.add('over')}});
document.addEventListener('dragleave',e=>{const d=e.target.closest&&e.target.closest('[data-v100drop]');if(d)d.classList.remove('over')});
document.addEventListener('drop',e=>{const d=e.target.closest&&e.target.closest('[data-v100drop]');if(!d)return;e.preventDefault();d.classList.remove('over');[...(e.dataTransfer.files||[])].filter(f=>/^video\//.test(f.type)).forEach(f=>uploadAndQueue(f,{source:'videos',force:true}))});
// ---------- the animation window: after a video is made, one button edits it as a reel (and automatically when the switch is on) ----------
const seen=new Set();
const mo=new MutationObserver(()=>{const res=document.querySelector('#v52m .v52res');if(!res||res.querySelector('[data-v100="anim"]'))return;const v=res.querySelector('video');if(!v)return;
 const bar=document.createElement('div');bar.className='v100anim';bar.innerHTML=`<button type="button" class="px-btn sm pri" data-v100="anim">ערוך כרילס עם העורך</button><span>חיתוך, כתוביות, לוגו ומסגרת מותג, 9:16, בדיקת עורך</span>`;res.appendChild(bar);
 const url=v.getAttribute('src');if(VD.auto&&url&&!seen.has(url)){seen.add(url);setTimeout(()=>{const b=res.querySelector('[data-v100="anim"]');if(b)b.click()},400)}});
mo.observe(document.body,{childList:true,subtree:true});
// ---------- the editor room: a reel action next to the format buttons ----------
const mo2=new MutationObserver(()=>{const r=document.getElementById('pe-root');if(!r||r.querySelector('[data-v100="pe"]'))return;const host=r.querySelector('.pe-fmts,.pe-bar,.pe-bottom')||[...r.querySelectorAll('button')].find(b=>/לפני \/ אחרי/.test(b.textContent))?.parentElement;if(!host)return;
 const b=document.createElement('button');b.type='button';b.className='px-btn sm';b.dataset.v100='pe';b.textContent='רילס מהסרטון';b.title='שולח את הסרטון של הפוסט לעורך הווידאו';host.appendChild(b)});
mo2.observe(document.body,{childList:true,subtree:true});
init();
})();
