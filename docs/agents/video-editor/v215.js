/*V215:START*/
// ================= V215 · connections: a card in the settings view that shows which services the engine is connected to
// (Claude, OpenAI images and voice, video, Metricool, server storage) with a real test button for each, where the key goes,
// and a small status chip in the agent tab. On claude.ai the engine uses the viewer's own Claude account; on the site it uses
// the ANTHROPIC_API_KEY of the project. =================
(()=>{
if(window.__v215)return;window.__v215=1;
const E=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $=s=>document.querySelector(s);
const C={st:null,err:'',tests:{},busy:{},mode:''};
async function load(){if(window.__v215mock){C.st=await window.__v215mock('status');C.mode='site';return paint()}try{let onClaude=false;try{onClaude=!!(window.claude&&window.claude.use&&location.hostname.includes('claude'))}catch(e){}if(location.protocol==='file:'||onClaude){C.mode='claude';C.st={claude:true,openai:false,video:{configured:false},metricool:false,storage:false,models:{}};return paint()}C.mode='site';const r=await fetch('/api/status',{cache:'no-store'});C.st=await r.json()}catch(e){C.err='לא הצלחתי לקרוא את מצב החיבורים מהשרת'}paint()}
async function test(k){C.busy[k]=true;paint();try{if(window.__v215mock){C.tests[k]=await window.__v215mock('test',k)}else{const tok=window.__engineToken?await window.__engineToken():null;if(!tok)throw new Error('צריך להתחבר לאדמין');const r=await fetch('/api/status?test='+k,{headers:{Authorization:'Bearer '+tok},cache:'no-store'});C.tests[k]=await r.json()}}catch(e){C.tests[k]={ok:false,detail:(e&&e.message)||'נכשל'}}C.busy[k]=false;paint()}
const ROWS=()=>{const s=C.st||{};const v=s.video||{};return [
 {k:'claude',name:'Claude (עוזר העריכה, הסוכן, שכתובים)',on:!!s.claude,env:'ANTHROPIC_API_KEY',where:'console.anthropic.com > API keys',note:s.models&&s.models.default?'מודל: '+s.models.default:''},
 {k:'openai',name:'OpenAI (יצירת תמונות, תמלול, קריינות)',on:!!s.openai,env:'OPENAI_API_KEY',where:'platform.openai.com > API keys'},
 {k:'video',name:'יצירת וידאו מתיאור ('+(v.provider==='veo'?'Google Veo':'OpenAI Sora')+')',on:!!v.configured,env:v.provider==='veo'?'GEMINI_API_KEY':'OPENAI_API_KEY',where:v.provider==='veo'?'aistudio.google.com > API keys':'אותו מפתח של OpenAI',note:v.model?'מודל: '+v.model+'. אפשר להחליף ספק עם VIDEO_PROVIDER=veo':''},
 {k:'metricool',name:'Metricool (תזמון לערוצים)',on:!!s.metricool,env:'METRICOOL_USER_TOKEN',where:'Metricool > Account settings > API',notest:true},
 {k:'storage',name:'כתיבה לענן מהשרת (סרטוני AI נשמרים ישירות)',on:!!s.storage,env:'SUPABASE_SERVICE_ROLE_KEY',where:'Supabase > Project settings > API',notest:true}]};
function html(){if(C.mode==='claude')return `<section class="v215" id="v215"><h2 class="vh" style="margin-top:0">חיבורים</h2><p class="v215ok">המנוע פתוח בתוך claude.ai, ולכן העוזר, הסוכן והשכתובים עובדים דרך חשבון Claude שלכם ישירות. יצירת תמונות, תמלול, קריינות וסרטוני AI זמינים כשפותחים את המנוע מתוך האתר (ניהול > מנוע תוכן).</p></section>`;
  return `<section class="v215" id="v215"><h2 class="vh" style="margin-top:0">חיבורים</h2><p class="muted" style="font-size:13px;margin-bottom:10px">מה מחובר למנוע עכשיו. המפתחות יושבים רק ב-Vercel (Settings > Environment Variables), אף פעם לא בקוד. אחרי שמוסיפים מפתח, פריסה מחדש ב-Vercel ואז "בדיקה".</p>${C.err?`<p class="v215bad">${E(C.err)}</p>`:''}
  <div class="v215rows">${ROWS().map(r=>{const t=C.tests[r.k];return `<div class="v215row ${r.on?'on':'off'}"><i aria-hidden="true"></i><div><b>${E(r.name)}</b><small>${r.on?'מוגדר':'לא מוגדר'}${r.note?' · '+E(r.note):''}${!r.on?' · מוסיפים <code>'+r.env+'</code> ('+E(r.where)+')':''}</small>${t?`<em class="${t.ok?'ok':'bad'}">${t.ok?'עובד':'נכשל'}: ${E(t.detail||'')}${t.ms?' · '+t.ms+' מ״ש':''}</em>`:''}</div>${r.notest?'':`<button type="button" class="px-btn sm" data-v215="test" data-k="${r.k}" ${!r.on||C.busy[r.k]?'disabled':''}>${C.busy[r.k]?'בודק…':'בדיקה'}</button>`}</div>`}).join('')}</div>
  <button type="button" class="px-btn sm ghost" data-v215="reload">רענון המצב</button></section>`}
function paint(){const el=$('#v215');if(el)el.outerHTML=html();const chip=$('#v215chip');if(chip)chip.outerHTML=chipHtml()}
function chipHtml(){const s=C.st;const on=C.mode==='claude'||(s&&s.claude);return `<span id="v215chip" class="v215chip ${s||C.mode==='claude'?(on?'on':'off'):''}">${!s&&C.mode!=='claude'?'בודק חיבור ל-Claude…':on?(C.mode==='claude'?'מחובר לחשבון Claude שלכם':'Claude מחובר'+(s.models&&s.models.default?' · '+s.models.default:'')):'Claude לא מחובר. הגדרות > חיבורים'}</span>`}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-v215]');if(!b)return;e.preventDefault();if(b.dataset.v215==='test')test(b.dataset.k);else if(b.dataset.v215==='reload'){C.st=null;C.tests={};load()}},true);
try{if(typeof vSettings==='function')vSettings=(f=>function(){if(!C.st&&!C.err)setTimeout(load,0);return html()+f.apply(this,arguments)})(vSettings)}catch(e){}
// the chip in the agent tab header
let obT=0;new MutationObserver(()=>{clearTimeout(obT);obT=setTimeout(()=>{const h=$('.v208hd > div');if(h&&!$('#v215chip')){h.insertAdjacentHTML('beforeend',chipHtml());if(!C.st&&!C.err)load()}},80)}).observe(document.body,{childList:true,subtree:true});
window.__v215={load,test,C};
})();
/*V215:END*/
