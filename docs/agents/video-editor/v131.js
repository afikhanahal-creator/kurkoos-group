// ================= V131 · scheduling, one way everywhere: a schedule sheet (month with busy days, the day's times with taken
//                   and recommended marks, quick picks, networks) opened from queue cards, calendar items, the post editor,
//                   the video editor and finished videos. Moves are saved at once, can be undone, and every view stays in step
//                   (other tabs, the database, the calendar). Metricool gets the real Israel offset (summer +03:00, winter +02:00) =================
(function(){
const pad=n=>String(n).padStart(2,'0');
const dk=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const DOW=['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'],DOWS=['א','ב','ג','ד','ה','ו','ש'];
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const parse=at=>{if(!at)return null;const m=String(at).match(/^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d)/);return m?new Date(+m[1],m[2]-1,+m[3],+m[4],+m[5]):null};
const nice=at=>{const d=parse(at);if(!d)return 'לא מתוזמן';const t=new Date(),tm=new Date(t);tm.setDate(t.getDate()+1);const hh=pad(d.getHours())+':'+pad(d.getMinutes());
 if(dk(d)===dk(t))return 'היום · '+hh;if(dk(d)===dk(tm))return 'מחר · '+hh;return `יום ${DOW[d.getDay()]} ${d.getDate()}.${d.getMonth()+1} · ${hh}`};
const toastSafe=m=>{try{toast(m)}catch(e){}};
// ---------- Israel offset for a local time (DST aware)
function ilOffset(at){try{const d=parse(at);if(!d)return '+03:00';const guess=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate(),d.getHours()-3,d.getMinutes()));
 const f=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Jerusalem',timeZoneName:'longOffset'}).formatToParts(guess).find(x=>x.type==='timeZoneName');const m=f&&f.value.match(/GMT([+-]\d\d):?(\d\d)?/);return m?`${m[1]}:${m[2]||'00'}`:'+03:00'}catch(e){return '+03:00'}}
window.__ilOffset=ilOffset;

// ---------- schedule writes (one place), with undo
const SKIP=window.__dgSkip=new WeakSet();
const S={open:false,it:null,p:null,at:'',nets:{fb:true,ig:true},month:null,video:null,swap:null};
function others(at,except){return APP.sched.items.filter(i=>i.at===at&&i!==except)}
function commit(it,at,nets,label){const prev={at:it.at,status:it.status,nets:Object.assign({},it.nets)};if(prev.at&&at){SKIP.add(it);setTimeout(()=>SKIP.delete(it),1500)}it.at=at;if(nets)it.nets=nets;if(at&&(it.status==='draft'||!it.status))it.status='ready';if(!at)it.status='draft';
 saveSched(it);flush();try{render()}catch(e){}snack(label||(at?'נקבע ל'+nice(at):'הוסר מהתזמון'),()=>{it.at=prev.at;it.status=prev.status;it.nets=prev.nets;saveSched(it);flush();try{render()}catch(e){};toastSafe('בוטל')});bus()}
function snack(msg,undo){let s=document.getElementById('v131snack');if(!s){s=document.createElement('div');s.id='v131snack';s.setAttribute('role','status');document.body.appendChild(s)}
 s.innerHTML=`<span>${esc(msg)}</span>${undo?'<button type="button">ביטול</button>':''}`;s.classList.add('on');clearTimeout(s._t);s._t=setTimeout(()=>s.classList.remove('on'),6500);if(undo)s.querySelector('button').onclick=()=>{s.classList.remove('on');undo()}}
// a move is written to this browser at once (not on the next idle moment), so a closed tab never loses it
function flush(){try{localStorage.setItem('app_sched',JSON.stringify(APP.sched))}catch(e){}}
const listeners=[];function bus(){listeners.forEach(f=>{try{f()}catch(e){}});deco()}

// ---------- the sheet
function postOf(it,p){return p||(it?itemPost(it):null)}
function kind(p){try{return kindOf(p)}catch(e){return 'post'}}
function quick(){const p=postOf(S.it,S.p),k=kind(p),out=[];const now=new Date();
 try{const n=nextSlot(k);if(n)out.push(['הזמן הפנוי הבא',n])}catch(e){}
 try{(nextRecs(k,3)||[]).forEach(r=>{const at=typeof r==='string'?r:(r.at||'');if(at&&!out.some(o=>o[1]===at))out.push(['שעה מומלצת',at])})}catch(e){}
 const t19=new Date(now);t19.setHours(19,0,0,0);if(t19>now)out.push(['היום בערב',dk(t19)+'T19:00']);
 const tm=new Date(now);tm.setDate(now.getDate()+1);out.push(['מחר בבוקר',dk(tm)+'T10:00']);
 if(S.at){const d=parse(S.at);d.setDate(d.getDate()+7);out.push(['שבוע אחרי',dk(d)+'T'+pad(d.getHours())+':'+pad(d.getMinutes())])}
 return out.filter(o=>parse(o[1])>now).slice(0,6)}
function recHours(day){try{const p=postOf(S.it,S.p);return new Set(recSlots(kind(p)).slice(0,10).filter(r=>r.d===day.getDay()).map(r=>r.h))}catch(e){return new Set()}}
function monthHtml(){const m0=S.month,first=new Date(m0.getFullYear(),m0.getMonth(),1),start=new Date(first);start.setDate(1-first.getDay());const today=dk(new Date()),sel=S.at.slice(0,10);
 const counts={};APP.sched.items.forEach(i=>{if(i.at&&i!==S.it){const k=i.at.slice(0,10);counts[k]=(counts[k]||0)+1}});let h='';
 for(let k=0;k<42;k++){const d=new Date(start);d.setDate(start.getDate()+k);const ds=dk(d),past=ds<today,out=d.getMonth()!==m0.getMonth(),n=counts[ds]||0;
  h+=`<button type="button" class="v131d${out?' out':''}${ds===today?' today':''}${ds===sel?' on':''}" data-v131day="${ds}" ${past?'disabled':''} aria-label="${d.getDate()} ${m0.toLocaleDateString('he-IL',{month:'long'})}${n?`, ${n} פוסטים מתוזמנים`:''}" aria-pressed="${ds===sel}"><span>${d.getDate()}</span>${n?`<i>${'•'.repeat(Math.min(3,n))}</i>`:''}</button>`}
 return h}
function timesHtml(){const day=parse((S.at.slice(0,10)||dk(new Date()))+'T00:00'),ds=dk(day),now=new Date(),rec=recHours(day),cur=S.at.slice(11,16);let h='';
 for(let mi=7*60;mi<=22*60+30;mi+=30){const t=pad(Math.floor(mi/60))+':'+pad(mi%60),at=ds+'T'+t,past=parse(at)<=now,o=others(at,S.it);
  h+=`<button type="button" class="v131tm${t===cur&&S.at.slice(0,10)===ds?' on':''}${o.length?' busy':''}${rec.has(Math.floor(mi/60))&&mi%60===0?' rec':''}" data-v131time="${t}" ${past?'disabled':''} aria-pressed="${t===cur}" title="${o.length?'כבר יש פוסט בשעה הזאת':rec.has(Math.floor(mi/60))?'שעה מומלצת':''}">${t}${o.length?'<small>תפוס</small>':rec.has(Math.floor(mi/60))&&mi%60===0?'<small>★</small>':''}</button>`}
 return h}
function sheetHtml(){const p=postOf(S.it,S.p),title=S.video?S.video.name:p?((p.visual&&p.visual.headline)||p.title||(p.text||'')).toString().replace(/\n/g,' ').slice(0,70):(S.it&&S.it.label)||'פוסט';
 const clash=S.at?others(S.at,S.it):[],past=S.at&&parse(S.at)<=new Date();
 return `<div class="v131box" role="dialog" aria-modal="true" aria-label="תזמון">
 <header><div><small>${S.video?'תזמון סרטון':'תזמון פוסט'}</small><b>${esc(title||'פוסט')}</b><span class="v131now">${S.it&&S.it.at?'מתוזמן עכשיו: '+esc(nice(S.it.at)):'עוד לא מתוזמן'}</span></div><button type="button" class="v131x" data-v131="close" aria-label="סגירה">✕</button></header>
 <div class="v131quick" role="group" aria-label="בחירה מהירה">${quick().map(([l,at])=>`<button type="button" data-v131at="${at}" aria-pressed="${S.at===at}"><small>${l}</small><b>${esc(nice(at))}</b></button>`).join('')}</div>
 <div class="v131grid">
  <section class="v131cal" aria-label="יום"><div class="v131mh"><button type="button" data-v131="mprev" aria-label="חודש קודם">${typeof ico==='function'?ico('right',18):'›'}</button><b>${S.month.toLocaleDateString('he-IL',{month:'long',year:'numeric'})}</b><button type="button" data-v131="mnext" aria-label="חודש הבא">${typeof ico==='function'?ico('left',18):'‹'}</button></div>
   <div class="v131dow">${DOWS.map(d=>`<span>${d}</span>`).join('')}</div><div class="v131days">${monthHtml()}</div><small class="v131leg"><i>•</i> פוסטים שכבר מתוזמנים באותו יום</small></section>
  <section class="v131times" aria-label="שעה"><div class="v131th"><b>${S.at?esc(nice(S.at.slice(0,10)+'T00:00').split(' · ')[0]):'בחרו יום'}</b><label>שעה מדויקת <input type="time" step="300" data-v131="exact" value="${S.at.slice(11,16)||'10:00'}"></label></div><div class="v131tl">${timesHtml()}</div></section>
 </div>
 ${S.video?'':`<div class="v131nets" role="group" aria-label="רשתות"><span>איפה</span><label><input type="checkbox" data-v131net="fb" ${S.nets.fb?'checked':''}> פייסבוק</label><label><input type="checkbox" data-v131net="ig" ${S.nets.ig?'checked':''}> אינסטגרם</label></div>`}
 ${clash.length&&!past?`<p class="v131warn">בשעה הזאת כבר מתוזמן פוסט אחר. אפשר לבחור שעה אחרת, או <button type="button" data-v131="swap">להחליף ביניהם</button>.</p>`:''}
 ${past?'<p class="v131warn">השעה הזאת כבר עברה. בחרו שעה עתידית.</p>':''}
 <footer><div class="v131sum">${S.at?`יפורסם: <b>${esc(nice(S.at))}</b>`:'בחרו יום ושעה'}</div>
  ${S.it&&S.it.at&&!S.video?'<button type="button" class="px-btn" data-v131="unsched">הסרה מהתזמון</button>':''}
  ${!S.video&&postOf(S.it,S.p)?'<button type="button" class="px-btn" data-v131="text">עריכת טקסט</button>':''}
  <button type="button" class="px-btn pri v131save" data-v131="save" ${!S.at||past||(clash.length&&!S.swap)?'disabled':''}>${S.it&&S.it.at?'שמירת המועד החדש':'תזמון'}</button></footer></div>`}
function paint(){const r=document.getElementById('v131');if(r){r.innerHTML=sheetHtml();const f=r.querySelector('.v131tm.on')||r.querySelector('.v131d.on');if(f&&f.scrollIntoView)f.scrollIntoView({block:'nearest'})}}
function open(o){o=o||{};S.it=o.it||null;S.p=o.p||null;S.video=o.video||null;S.swap=null;
 if(!S.it&&S.p){try{S.it=itemOf(S.p)||null}catch(e){}}
 S.at=(S.it&&S.it.at)||o.at||'';if(!S.at){try{S.at=nextSlot(kind(postOf(S.it,S.p)))||''}catch(e){}}
 S.nets=Object.assign({fb:true,ig:true},S.it&&S.it.nets);const base=parse(S.at)||new Date();S.month=new Date(base.getFullYear(),base.getMonth(),1);
 let r=document.getElementById('v131');if(!r){r=document.createElement('div');r.id='v131';document.body.appendChild(r)}r.className='on';S.open=true;const sn=document.getElementById('v131snack');if(sn)sn.classList.remove('on');paint();
 const f=r.querySelector('.v131save:not([disabled])')||r.querySelector('[data-v131="close"]');f&&f.focus({preventScroll:true})}
function close(){const r=document.getElementById('v131');if(r)r.remove();S.open=false}
async function save(){const at=S.at;if(!at)return;
 if(S.video){await scheduleVideo(at);return}
 let it=S.it;const p=postOf(it,S.p);
 if(S.swap){const o=S.swap;const prev=it?it.at:'';o.at=prev||'';if(!o.at)o.status='draft';SKIP.add(o);saveSched(o);setTimeout(()=>SKIP.delete(o),1500)}
 if(!it){try{ensurePost(p)}catch(e){}it={id:'s'+uid(),pid:p&&p.key?null:p&&p.id,key:p&&p.key||null,at:'',nets:S.nets,status:'ready',label:''};APP.sched.items.push(it)}
 close();commit(it,at,Object.assign({},S.nets),(S.swap?'הוחלפו המועדים. ':'')+'נקבע ל'+nice(at))}
// a finished video becomes a scheduled reel
async function scheduleVideo(at){const V=window.__vid,VD=V&&V.VD,v=S.video;let url=v.url;
 try{if(v.blob){if(!VD||!VD.assets){toastSafe('התזמון של סרטון זמין כשהדף פתוח ב-claude.ai עם הרשאת עריכה');return}
   const sv=document.querySelector('#v131 .v131save');if(sv){sv.disabled=true;sv.textContent='מעלה את הסרטון…'}
   let f=new File([v.blob],v.file||'reel.mp4',{type:v.type||'video/mp4'});if(f.size>19.5*1024*1024&&window.__v128)f=await __v128.shrink(f);const r=await VD.assets.upload(f);url=r.url}
  const it={id:'s'+uid(),pid:null,key:null,at:'',nets:{fb:true,ig:true},status:'ready',label:v.name||'רילס',reel:{file:url,poster:'',caption:v.name||''}};APP.sched.items.push(it);close();commit(it,at,null,'הסרטון נקבע ל'+nice(at))}
 catch(e){toastSafe('התזמון נכשל: '+(e&&e.message||e))}}

// ---------- events in the sheet
document.addEventListener('click',e=>{const r=document.getElementById('v131');if(!r||!r.contains(e.target))return;
 if(e.target===r){close();return}
 const q=e.target.closest('[data-v131at]');if(q){S.at=q.dataset.v131at;const d=parse(S.at);S.month=new Date(d.getFullYear(),d.getMonth(),1);S.swap=null;paint();return}
 const d=e.target.closest('[data-v131day]');if(d){S.at=d.dataset.v131day+'T'+(S.at.slice(11,16)||'10:00');S.swap=null;paint();return}
 const t=e.target.closest('[data-v131time]');if(t){S.at=(S.at.slice(0,10)||dk(new Date()))+'T'+t.dataset.v131time;S.swap=null;paint();return}
 const b=e.target.closest('[data-v131]');if(!b)return;const a=b.dataset.v131;
 if(a==='close')close();
 else if(a==='mprev'){S.month=new Date(S.month.getFullYear(),S.month.getMonth()-1,1);paint()}
 else if(a==='mnext'){S.month=new Date(S.month.getFullYear(),S.month.getMonth()+1,1);paint()}
 else if(a==='swap'){S.swap=others(S.at,S.it)[0]||null;paint();toastSafe('בשמירה הפוסטים יחליפו מועדים')}
 else if(a==='save')save();
 else if(a==='unsched'){const it=S.it;close();commit(it,'',null,'הוסר מהתזמון ועבר לטיוטות')}
 else if(a==='text'){const it=S.it,p=postOf(S.it,S.p);close();try{it?openComposer({it}):openComposer({p,sched:true})}catch(x){}}});
document.addEventListener('change',e=>{const r=document.getElementById('v131');if(!r||!r.contains(e.target))return;const t=e.target;
 if(t.dataset.v131==='exact'&&t.value){S.at=(S.at.slice(0,10)||dk(new Date()))+'T'+t.value;S.swap=null;paint()}
 if(t.dataset.v131net){S.nets[t.dataset.v131net]=t.checked;if(!S.nets.fb&&!S.nets.ig){S.nets[t.dataset.v131net]=true;t.checked=true;toastSafe('צריך לפחות רשת אחת')}}});
document.addEventListener('keydown',e=>{if(!S.open)return;if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close()}},true);

// ---------- entry points
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-v131open]');if(!b)return;e.preventDefault();e.stopPropagation();const k=b.dataset.v131open;
 if(k==='item'){const it=APP.sched.items.find(i=>i.id===b.dataset.id);if(it)open({it})}
 else if(k==='pe'){try{if(peDirty())peSave()}catch(x){}open({p:PE.orig})}
 else if(k==='veditor'){const E=window.__v129&&__v129.E;if(!E||!E.p)return;const o=E.outs&&E.outs[0];if(!o){toastSafe('קודם מייצאים את הסרטון. הייצוא מתחיל עכשיו, ואז אפשר לתזמן');__v129.doExport();return}open({video:{blob:o.blob,file:o.file,type:o.type,name:E.p.name}})}
 else if(k==='doc'){const d=window.__vid&&__vid.VD.docs.find(x=>x.id===b.dataset.id);if(d&&d.out)open({video:{url:d.out,name:d.name}})}},true);
// calendar items open the sheet (text editing stays one tap away inside it)
document.addEventListener('click',e=>{if(typeof APP==='undefined'||APP.view!=='calendar')return;const b=e.target.closest&&e.target.closest('#appviews [data-app="edit"][data-id]');if(!b||b.closest('#v131'))return;
 if(typeof DD!=='undefined'&&DD.just&&Date.now()-DD.just<450)return;const it=APP.sched.items.find(i=>i.id===b.dataset.id);if(!it)return;e.preventDefault();e.stopImmediatePropagation();open({it})},true);

// ---------- decorations: a clear time and a "change time" button on every card, the time on calendar items,
//            the schedule state on the editors' schedule buttons
let decoT=0;function deco(){if(decoT)return;decoT=requestAnimationFrame(()=>{decoT=0;try{decoNow()}catch(e){}})}
function setHTML(el,h){if(el&&el.innerHTML!==h)el.innerHTML=h}
function decoNow(){
 document.querySelectorAll('#appviews .qcard').forEach(c=>{const eb=c.querySelector('[data-app="edit"][data-id]');if(!eb)return;const it=APP.sched.items.find(i=>i.id===eb.dataset.id);if(!it)return;
  let w=c.querySelector('.v131when');if(!w){w=document.createElement('button');w.type='button';w.className='v131when';w.dataset.v131open='item';c.querySelector('.qb').prepend(w)}
  w.dataset.id=it.id;setHTML(w,`<span>${esc(nice(it.at))}</span><b>${it.at?'שינוי מועד':'תזמון'}</b>`);if(eb.textContent.trim()!=='עריכת טקסט'){eb.lastChild&&eb.lastChild.nodeType===3?eb.lastChild.textContent=' עריכת טקסט':null}});
 const pe=document.querySelector('#pe-root [data-pe-a="sched"]');if(pe&&typeof PE!=='undefined'&&PE.orig){let it=null;try{it=itemOf(PE.orig)}catch(e){}const lab=it&&it.at?'מתוזמן · '+nice(it.at):'תזמון';
  if(pe.dataset.v131!==lab){pe.dataset.v131=lab;pe.dataset.v131open='pe';const svg=pe.querySelector('svg');pe.innerHTML=(svg?svg.outerHTML:'')+' '+esc(lab);pe.classList.toggle('v131on',!!(it&&it.at))}}
 const top=document.querySelector('#v129 .v129top');if(top&&!top.querySelector('[data-v131open="veditor"]')){const ex=top.querySelector('[data-v129="export"]');if(ex)ex.insertAdjacentHTML('beforebegin','<button type="button" class="px-btn v131vb" data-v131open="veditor">תזמון</button>')}
 const ebar=document.querySelector('.v130ebar .v130acts');if(ebar&&!ebar.querySelector('[data-v131open]'))ebar.insertAdjacentHTML('beforeend','<button type="button" class="px-btn" data-v131open="veditor">תזמון הסרטון</button>');
 document.querySelectorAll('#v100page .v100c[data-vid] .v100b').forEach(b=>{const id=b.closest('.v100c').dataset.vid;const d=window.__vid&&__vid.VD.docs.find(x=>x.id===id);if(d&&d.out&&!b.querySelector('[data-v131open]'))b.insertAdjacentHTML('beforeend',`<button type="button" class="px-btn sm" data-v131open="doc" data-id="${esc(id)}">תזמון</button>`)});
}
new MutationObserver(()=>deco()).observe(document.body,{childList:true,subtree:true});

// ---------- live: other tabs, the database, coming back to the page
function rerender(){if(S.open)return;if(document.getElementById('cmp-root'))return;if(['queue','calendar','today','home'].includes(APP.view))try{render()}catch(e){}deco()}
window.addEventListener('storage',e=>{if(e.key!=='app_sched'||!e.newValue)return;try{const v=JSON.parse(e.newValue);if(v&&v.items){APP.sched=v;rerender()}}catch(x){}});
function sameItem(a,b){return a.at===b.at&&a.status===b.status&&JSON.stringify(a.nets)===JSON.stringify(b.nets)&&!!a.sent===!!b.sent}
function listen(){if(!APP.db||listen.on)return;try{listen.on=true;APP.db.collection('schedule').onSnapshot(snap=>{let ch=false;const rows=[];(snap.forEach?(f=>snap.forEach(f)):(f=>(snap.docs||[]).forEach(f)))(d=>rows.push(Object.assign({id:d.id},d.data?d.data():d)));
  rows.forEach(r=>{const i=APP.sched.items.findIndex(x=>x.id===r.id);if(r.removed){if(i>=0){APP.sched.items.splice(i,1);ch=true}return}if(i<0){APP.sched.items.push(r);ch=true}else if(!sameItem(APP.sched.items[i],r)){Object.assign(APP.sched.items[i],r);ch=true}});
  if(ch){try{lsSet('app_sched',APP.sched)}catch(e){}rerender()}})}catch(e){listen.on=false}}
setInterval(listen,3000);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')rerender()});
window.__v131={open,close,nice,ilOffset,commit,onChange:f=>listeners.push(f),S};
})();
