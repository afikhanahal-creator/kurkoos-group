// ================= V136 · a moved post is confirmed, not assumed: every schedule write is read back from the database and
//                   compared, the move note says "נשמר בענן" only after that, a failure shows its reason with a retry, a view with no
//                   database says so on the calendar, and each device leaves a short diagnostic record (diag/sched-<device>) =================
(function(){
const PKEY='sched_pending';
const pend=new Set((()=>{try{return JSON.parse(localStorage.getItem(PKEY)||'[]')}catch(e){return []}})());
const keep=()=>{try{localStorage.setItem(PKEY,JSON.stringify([...pend]))}catch(e){}};
const dev=(()=>{let d='';try{d=localStorage.getItem('dev_id')||''}catch(e){}if(!d){d=Math.random().toString(36).slice(2,10);try{localStorage.setItem('dev_id',d)}catch(e){}}return d})();
const lsOk=(()=>{try{localStorage.setItem('__t','1');localStorage.removeItem('__t');return true}catch(e){return false}})();
const D={dev,ua:navigator.userAgent.slice(0,180),ls:lsOk,db:null,boot:Date.now(),writes:[],last:null,ev:[]};
let diagT=0;function diag(){if(!APP.db)return;clearTimeout(diagT);diagT=setTimeout(()=>{try{APP.db.collection('diag').doc('sched-'+dev).set(JSON.parse(JSON.stringify(Object.assign({},D,{ts:Date.now(),pending:[...pend],items:APP.sched.items.length})))).catch(()=>{})}catch(e){}},1500)}
function body(it){const o={};Object.keys(it).forEach(k=>{if(!k.startsWith('_')&&it[k]!==undefined)o[k]=it[k]});return JSON.parse(JSON.stringify(o))}
const timers={},busy={};
function note(it,ok,code,msg){const r={id:it.id,at:it.at||'',ok,code:code||'',msg:String(msg||'').slice(0,160),t:Date.now()};D.last=r;D.writes.unshift(r);D.writes=D.writes.slice(0,12);diag();
 document.dispatchEvent(new CustomEvent('v136saved',{detail:r}))}
async function put(it,tries){tries=tries||0;
 if(!APP.db){pend.add(it.id);keep();note(it,false,'no_db','');return false}
 if(busy[it.id]){busy[it.id].again=true;return busy[it.id].p}
 const job={again:false};busy[it.id]=job;
 job.p=(async()=>{let res=false;try{const ref=APP.db.collection('schedule').doc(it.id);const b=body(it);await ref.set(b);
   // read it back: the move counts only when the database holds this time
   let back=null;try{const s=await ref.get();back=s&&s.exists?s.data():null}catch(e){}
   if(back&&back.at!==b.at&&(back.upd||0)<(b.upd||0))throw {code:'mismatch',message:'בענן נשאר '+(back.at||'ללא מועד')};
   pend.delete(it.id);keep();note(it,true);res=true}
  catch(e){const c=(e&&e.code)||'error';
   if((c==='unavailable'||c==='resource_exhausted'||c==='mismatch'||c==='error')&&tries<3){delete busy[it.id];await new Promise(r=>setTimeout(r,800*(tries+1)+Math.random()*700));return put(it,tries+1)}
   pend.add(it.id);keep();note(it,false,c,e&&e.message)}
  delete busy[it.id];if(job.again)return put(it);return res})();
 return job.p}
window.__schedPut=function(it){if(!it||!it.id)return;pend.add(it.id);keep();clearTimeout(timers[it.id]);timers[it.id]=setTimeout(()=>{delete timers[it.id];put(it)},250)};
function flushAll(){Object.keys(timers).forEach(id=>{clearTimeout(timers[id]);delete timers[id];const it=APP.sched.items.find(i=>i.id===id);if(it)put(it)})}
async function retry(){if(!APP.db||!pend.size)return;for(const id of [...pend]){const it=APP.sched.items.find(i=>i.id===id);if(!it){pend.delete(id);continue}await put(it)}keep()}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')flushAll();else retry()});
window.addEventListener('pagehide',flushAll);
setInterval(retry,20000);
// once the database answers (or does not), record it and push anything still waiting
let waited=0;const iv=setInterval(()=>{waited++;if(APP.db){D.db=true;clearInterval(iv);diag();retry();banner()}else if(waited>=12){D.db=false;clearInterval(iv);banner()}},1000);

// ---------- what the person sees
const REASON={no_db:'החיבור לענן לא פעיל בתצוגה הזו',invalid_argument:'הענן דחה את השמירה (הרשאת עריכה?)',quota_exceeded:'נגמר המקום בענן',revoked:'הגישה לענן בוטלה בתצוגה הזו',not_granted:'לא ניתנה הרשאה לענן',mismatch:'הענן לא קיבל את המועד החדש',unavailable:'אין חיבור כרגע',resource_exhausted:'יותר מדי שמירות ברגע אחד'};
document.addEventListener('v136saved',e=>{const r=e.detail;const s=document.getElementById('v131snack');
 if(r.ok){if(s&&s.classList.contains('on')){let m=s.querySelector('.v136ok');if(!m){m=document.createElement('em');m.className='v136ok';s.querySelector('span')&&s.querySelector('span').after(m)}m.textContent='נשמר בענן ✓'}hideFail();return}
 if(r.code==='no_db')return;showFail(r)});
function showFail(r){let f=document.getElementById('v136fail');if(!f){f=document.createElement('div');f.id='v136fail';f.setAttribute('role','alert');document.body.appendChild(f)}
 f.innerHTML=`<div><b>המועד החדש נשמר רק במכשיר הזה</b><span>${REASON[r.code]||'השמירה בענן נכשלה'}${r.code&&!REASON[r.code]?' ('+String(r.code).replace(/[<>&"]/g,'')+')':''}. במכשיר אחר, או אחרי ניקוי הדפדפן, הפוסט יחזור למועד הקודם.</span></div><button type="button" data-v136="retry">לנסות שוב</button><button type="button" data-v136="hide" aria-label="סגירה">✕</button>`;f.classList.add('on')}
function hideFail(){const f=document.getElementById('v136fail');if(f&&!pend.size)f.classList.remove('on')}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-v136]');if(!b)return;const a=b.dataset.v136;if(a==='hide'){document.getElementById('v136fail').classList.remove('on')}else if(a==='retry'){b.textContent='שומר…';b.disabled=true;retry().then(()=>{b.disabled=false;b.textContent='לנסות שוב';if(!pend.size&&window.toast)toast('נשמר בענן')})}});
// the calendar says plainly when this view keeps changes only on the device
function banner(){const v=document.querySelector('#appviews');if(!v||typeof APP==='undefined')return;const on=D.db===false&&['calendar','queue'].includes(APP.view);let b=document.getElementById('v136nodb');
 if(!on){if(b)b.remove();return}if(b&&v.contains(b))return;if(!b){b=document.createElement('div');b.id='v136nodb';b.setAttribute('role','status');b.innerHTML='<b>התצוגה הזו לא מחוברת לענן.</b> שינויים בלוח נשמרים רק במכשיר הזה. כדי שהזזות יישמרו לכל המכשירים, פתחו את המנוע ב-claude.ai בדפדפן.'}v.prepend(b)}
let bt=0;new MutationObserver(()=>{if(bt)return;bt=requestAnimationFrame(()=>{bt=0;banner()})}).observe(document.body,{childList:true,subtree:true});
// what the person did (opened the sheet, dragged, dropped), so a failure on a real phone can be traced
function ev(n,x){D.ev.unshift({n,x:x==null?'':String(x).slice(0,80),t:Date.now()});D.ev=D.ev.slice(0,30);diag()}
window.__v136={put,retry,pending:()=>[...pend],D,ev};
})();
