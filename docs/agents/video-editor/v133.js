// ================= V133 · a moved post stays moved: every schedule change is stamped with its time, the newer change wins
//                   when this browser and the database disagree (on load and on live updates), database writes are checked,
//                   retried, kept in a queue that survives a reload, sent at once when the page is hidden, and a failure says so =================
(function(){
const PKEY='sched_pending';
const pend=new Set((()=>{try{return JSON.parse(localStorage.getItem(PKEY)||'[]')}catch(e){return []}})());
const keep=()=>{try{localStorage.setItem(PKEY,JSON.stringify([...pend]))}catch(e){}};
const timers={};let warned=0;
function body(it){const o={};Object.keys(it).forEach(k=>{if(!k.startsWith('_')&&it[k]!==undefined)o[k]=it[k]});return JSON.parse(JSON.stringify(o))}
async function put(it,tries){if(!APP.db)return false;try{await APP.db.collection('schedule').doc(it.id).set(body(it));pend.delete(it.id);keep();return true}
 catch(e){const c=e&&e.code;if((c==='unavailable'||c==='resource_exhausted')&&(tries||0)<2){await new Promise(r=>setTimeout(r,700+Math.random()*900));return put(it,(tries||0)+1)}
  pend.add(it.id);keep();if(Date.now()-warned>20000){warned=Date.now();try{(window.__v131?null:null);toast('השינוי נשמר במכשיר הזה, אבל עוד לא בענן. ננסה שוב לבד')}catch(x){}}return false}}
// called by saveSched: a short pause to merge bursts, then a checked write
window.__schedPut=function(it){if(!it||!it.id)return;pend.add(it.id);keep();clearTimeout(timers[it.id]);timers[it.id]=setTimeout(()=>{delete timers[it.id];put(it)},250)};
function flushAll(){Object.keys(timers).forEach(id=>{clearTimeout(timers[id]);delete timers[id];const it=APP.sched.items.find(i=>i.id===id);if(it)put(it)})}
async function retry(){if(!APP.db||!pend.size)return;for(const id of [...pend]){const it=APP.sched.items.find(i=>i.id===id);if(!it){pend.delete(id);continue}await put(it)}keep()}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'){flushAll();try{localStorage.setItem('app_sched',JSON.stringify(APP.sched))}catch(e){}}else retry()});
window.addEventListener('pagehide',()=>{flushAll();try{localStorage.setItem('app_sched',JSON.stringify(APP.sched))}catch(e){}});
setInterval(retry,30000);setTimeout(retry,4000);
// the rule both merges use: the database only replaces a local item when it is at least as new
window.__schedNewer=function(local,remote){return (remote&&remote.upd||0)>=(local&&local.upd||0)};
window.__v133={put,retry,pending:()=>[...pend]};
})();
