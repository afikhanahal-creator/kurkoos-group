/*V228:START*/
// ================= V228 · a video from a description is made by Claude Code (Opus 5.5) with HyperFrames, in the brand kit, not by
// OpenAI Sora or Google Veo. The card in the studio library keeps its form; the submit goes to the cloud editor as a
// "generate" job (videos doc + the video trigger), the job list shows its state, and the finished file opens in the studio.
// The OpenAI path stays in the code but is no longer reachable from the card. =================
(()=>{
if(window.__v228)return;window.__v228=1;
const E=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const say=m=>{try{toast(m)}catch(e){console.log(m)}};
const LSK='v228_jobs';const J={jobs:[]};try{J.jobs=JSON.parse(localStorage.getItem(LSK)||'[]')}catch(e){}
function save(){try{localStorage.setItem(LSK,JSON.stringify(J.jobs.slice(-20)))}catch(e){}}
const ST={queued:'נשלח ל-Claude Code',planning:'Claude Code קורא את התיאור',editing:'Claude Code בונה ומרנדר',done:'מוכן',failed:'נכשל'};
function jobsHtml(){if(!J.jobs.length)return '';return `<div class="v228jobs"><b>סרטונים שנבנים עם Claude Code</b><ul>${J.jobs.slice().reverse().slice(0,6).map(j=>`<li class="st-${j.status}"><span>${E(j.prompt.slice(0,70))}</span><small>${ST[j.status]||j.status}${j.error?': '+E(j.error):''}</small>${j.status==='done'&&j.url?`<button type="button" class="v204b" data-v228="open" data-id="${E(j.id)}">פתיחה בסטודיו</button>`:''}<button type="button" class="v204b" data-v228="drop" data-id="${E(j.id)}" aria-label="הסרה מהרשימה">✕</button></li>`).join('')}</ul></div>`}
function relabel(){const card=document.getElementById('v214gen');if(!card)return;
  // the provider line and the button come from the patched card itself (build228); the jobs box lives beside the card so repaints keep it
  let box=document.getElementById('v228jobs');const html=jobsHtml();if(box){if(html)box.innerHTML=html;else box.remove()}else if(html){card.insertAdjacentHTML('afterend','<div id="v228jobs">'+html+'</div>')}}
let obT=0;new MutationObserver(()=>{clearTimeout(obT);obT=setTimeout(relabel,60)}).observe(document.body,{childList:true,subtree:true});setTimeout(relabel,1200);setInterval(()=>{try{if(document.getElementById('v214gen'))relabel()}catch(e){}},700);
// the submit, before the OpenAI path gets it
document.addEventListener('submit',async e=>{const f=e.target;if(!f||!f.dataset||f.dataset.v214!=='gen')return;e.preventDefault();e.stopImmediatePropagation();
  const prompt=((f.querySelector('[data-v214f="prompt"]')||{}).value||'').trim();if(!prompt){say('כתבו מה לצלם');return}
  const seconds=+((f.querySelector('[data-v214f="seconds"]')||{}).value||8)||8;const size=(f.querySelector('[data-v214f="size"]')||{}).value||'720x1280';
  const G=window.__v214&&__v214.G;const im=G&&G.form&&G.form.image;const firstFrame=typeof im==='string'?im:(im&&im.url)||null;
  try{if(G){G.form.prompt=prompt;G.form.seconds=String(seconds);G.form.size=size}}catch(x){}
  const V=window.__vid;if(!V||!V.VD||!V.VD.db){say('היצירה עם Claude Code זמינה כשהדף פתוח ב-claude.ai עם הרשאת עריכה');return}
  const id='vg'+Date.now().toString(36);const j={id,prompt,seconds,size,at:Date.now(),status:'queued'};J.jobs.push(j);save();relabel();
  try{const d=await V.queueDoc({id,name:('Claude · '+prompt).slice(0,60),source:'generate',mode:'generate',prompt,len:seconds,fmt:size==='1280x720'?'16:9':'9:16',firstFrame,kit:{brand:'kurkoos'},status:'queued',phase:'render',requested:new Date().toISOString()});
    const ok=await V.editVideo(Object.assign({__direct:1},d));if(ok===false){j.status='failed';j.error='השליחה לעורך לא הצליחה';save();relabel();return}say('Claude Code בונה את הסרטון. זה לוקח כמה דקות, נעדכן כאן')}
  catch(x){j.status='failed';j.error=(x&&x.message)||'השליחה נכשלה';save();relabel()}
  poll()},true);
let pollT=0;
function poll(){clearTimeout(pollT);const live=J.jobs.filter(j=>j.status!=='done'&&j.status!=='failed');if(!live.length)return;
  const docs=(window.__vid&&__vid.VD&&__vid.VD.docs)||[];let changed=false;
  live.forEach(j=>{const d=docs.find(x=>x.id===j.id);if(!d)return;if(d.status==='done'&&d.out){j.status='done';j.url=d.out;changed=true;say('הסרטון מוכן. פותחים אותו בסטודיו');try{if(window.__v204&&__v204.fromSource)__v204.fromSource({name:d.name||j.prompt.slice(0,40),url:d.out,from:'נוצר עם Claude Code'})}catch(e){}}
    else if(d.status==='failed'){j.status='failed';j.error=d.error||'';changed=true}else if(d.status&&d.status!==j.status){j.status=d.status;changed=true}});
  if(changed){save();relabel()}if(J.jobs.some(j=>j.status!=='done'&&j.status!=='failed'))pollT=setTimeout(poll,10000)}
setTimeout(poll,4000);
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-v228]');if(!b)return;const j=J.jobs.find(x=>x.id===b.dataset.id);if(!j)return;
  if(b.dataset.v228==='drop'){J.jobs=J.jobs.filter(x=>x!==j);save();relabel()}
  else if(b.dataset.v228==='open'&&j.url){try{__v204.fromSource({name:j.prompt.slice(0,40),url:j.url,from:'נוצר עם Claude Code'})}catch(x){}}},true);
window.__v228={J,poll,relabel};
})();
/*V228:END*/
