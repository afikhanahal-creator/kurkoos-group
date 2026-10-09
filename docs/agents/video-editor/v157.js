// ================= V157 · edit → schedule in one place: "שמירה ותזמון" sheet with the next free slots as chips, an exact date
//                   and time, the networks, one primary button that saves the edits and puts the post in the queue, and a
//                   clear confirmation. Opens from the editor's "תזמון" and from the gallery card's "תזמן" =================
(function(){
const DAYS=['א׳','ב׳','ג׳','ד׳','ה׳','ו׳','ש׳'];const pad=n=>String(n).padStart(2,'0');
const esc2=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function lbl(at){const d=new Date(at);if(isNaN(d))return at;const t=new Date();const tm=new Date(t);tm.setDate(t.getDate()+1);
  const same=(a,b)=>a.toDateString()===b.toDateString();const day=same(d,t)?'היום':same(d,tm)?'מחר':`יום ${DAYS[d.getDay()]} ${pad(d.getDate())}.${pad(d.getMonth()+1)}`;return `${day} · ${pad(d.getHours())}:${pad(d.getMinutes())}`}
function slots(n){let out=[];try{out=pxFreeSlots(28).map(k=>{const [d,h]=k.split('T');const t=((APP.slots||{})[new Date(d+'T12:00').getDay()]||[]).find(x=>String(x).slice(0,2)===h)||h+':00';return d+'T'+t})}catch(e){}
  return [...new Set(out)].sort().slice(0,n)}
const S={p:null,at:'',nets:{fb:true,ig:true},fromEditor:false,done:false};
function itemFor(p){try{return APP.sched.items.find(i=>(p.key&&i.key===p.key)||i.pid===p.id)}catch(e){return null}}
function open(p,fromEditor){if(!p)return;const it=itemFor(p);const sl=slots(6);S.p=p;S.fromEditor=!!fromEditor;S.done=false;
  S.at=(it&&it.at)||sl[0]||'';S.nets=it&&it.nets?Object.assign({fb:true,ig:true},it.nets):{fb:true,ig:true};draw();
  setTimeout(()=>{const f=document.querySelector('#v157 .v157chip[aria-pressed="true"],#v157 .v157chip,#v157 input');f&&f.focus()},30)}
function close(){const el=document.getElementById('v157');if(el)el.remove();document.body.classList.remove('v157on')}
function head(p){const h=((p.visual&&p.visual.headline)||p.hook||'').replace(/\*/g,'').replace(/\n/g,' ');return h.slice(0,80)}
function draw(){let el=document.getElementById('v157');if(!el){el=document.createElement('div');el.id='v157';document.body.appendChild(el);document.body.classList.add('v157on')}
  const p=S.p;const it=itemFor(p);const sl=slots(6);if(S.at&&!sl.includes(S.at))sl.unshift(S.at);
  const step=(n,t,st)=>`<li class="${st}"><i>${st==='ok'?'✓':n}</i><span>${t}</span></li>`;
  if(S.done){el.innerHTML=`<div class="v157bg" data-v157="x"></div><section class="v157" role="dialog" aria-modal="true" aria-labelledby="v157t">
    <ol class="v157steps" aria-label="שלבים">${step(1,'עריכה','ok')}${step(2,'מועד','ok')}${step(3,'בתור','ok')}</ol>
    <div class="v157ok"><b id="v157t">הפוסט בתור</b><span>${esc2(lbl(S.at))} · ${[S.nets.fb&&'פייסבוק',S.nets.ig&&'אינסטגרם'].filter(Boolean).join(' ו')}</span><small>נשמר כטיוטה מתוזמנת. שום דבר לא מתפרסם בלי אישור.</small></div>
    <footer class="v157f"><button type="button" class="px-btn pri" data-v157="cal">פתיחה בלוח</button><button type="button" class="px-btn" data-v157="x">${S.fromEditor?'חזרה לעריכה':'סגירה'}</button></footer></section>`;return}
  const dirty=S.fromEditor&&typeof peDirty==='function'&&peDirty();
  el.innerHTML=`<div class="v157bg" data-v157="x"></div><section class="v157" role="dialog" aria-modal="true" aria-labelledby="v157t">
   <header class="v157h"><b id="v157t">${it&&it.at?'שינוי מועד':'שמירה ותזמון'}</b><button type="button" class="v157x" data-v157="x" aria-label="סגירה">✕</button></header>
   <ol class="v157steps" aria-label="שלבים">${step(1,'עריכה','ok')}${step(2,'מועד','on')}${step(3,'בתור','')}</ol>
   <div class="v157post"><span class="v157hd">${esc2(head(S.fromEditor&&typeof PE!=='undefined'&&PE.p?PE.p:p))}</span>${dirty?'<small class="v157dirty">השינויים שלא נשמרו יישמרו עכשיו</small>':''}</div>
   <fieldset class="v157set"><legend>המשבצות הפנויות הקרובות</legend><div class="v157chips">${sl.length?sl.map(at=>`<button type="button" class="v157chip" data-v157="at" data-at="${at}" aria-pressed="${at===S.at}">${esc2(lbl(at))}</button>`).join(''):'<span class="v157none">אין משבצות פנויות בלוח הזמנים. בחרו מועד מדויק למטה.</span>'}</div></fieldset>
   <label class="v157exact"><span>או מועד מדויק</span><input type="datetime-local" data-v157="exact" value="${esc2((S.at||'').slice(0,16))}"></label>
   <fieldset class="v157set"><legend>איפה</legend><div class="v157nets">
    <button type="button" class="v157net" data-v157="net" data-n="fb" aria-pressed="${!!S.nets.fb}">פייסבוק</button>
    <button type="button" class="v157net" data-v157="net" data-n="ig" aria-pressed="${!!S.nets.ig}">אינסטגרם</button></div></fieldset>
   <footer class="v157f"><button type="button" class="px-btn red v157go" data-v157="go" ${S.at&&(S.nets.fb||S.nets.ig)?'':'disabled'}>${S.at?`${dirty?'שמירה ותזמון':'תזמון'} ל${esc2(lbl(S.at))}`:'בחרו מועד'}</button><button type="button" class="px-btn" data-v157="x">ביטול</button></footer>
  </section>`}
function doSched(){const p=S.p;if(!p||!S.at)return;
  try{if(S.fromEditor&&typeof peDirty==='function'&&peDirty())peSave('עריכה בסטודיו')}catch(e){console.error('v157 save',e)}
  const label=String((p.visual&&p.visual.headline)||p.hook||'').replace(/\*/g,'').replace(/\n/g,' ').slice(0,60);
  let it=itemFor(p);if(it){it.at=S.at;it.nets=Object.assign({},S.nets)}else{it={id:'s'+uid(),pid:p.id,key:p.key||null,at:S.at,nets:Object.assign({},S.nets),status:'draft',label};APP.sched.items.push(it)}
  try{saveSched(it)}catch(e){console.error('v157 sched',e)}try{saveAgent()}catch(e){}
  S.done=true;draw();try{if(!S.fromEditor)render()}catch(e){}}
window.addEventListener('click',ev=>{
  const ed=ev.target.closest&&ev.target.closest('#pe-root [data-pe-a="sched"]');
  if(ed&&typeof PE!=='undefined'&&PE.orig){ev.preventDefault();ev.stopImmediatePropagation();open(PE.orig,true);return}
  const gs=ev.target.closest&&ev.target.closest('[data-ga="sched1"]');
  if(gs){const p=AG.posts.find(x=>x.id===gs.dataset.id);if(p){ev.preventDefault();ev.stopImmediatePropagation();open(p,false)}return}
  const b=ev.target.closest&&ev.target.closest('[data-v157]');if(!b)return;const a=b.dataset.v157;
  if(a==='x'){close();try{if(!S.fromEditor)render()}catch(e){}return}
  if(a==='at'){S.at=b.dataset.at;draw();return}
  if(a==='net'){S.nets[b.dataset.n]=!S.nets[b.dataset.n];draw();return}
  if(a==='go'){doSched();return}
  if(a==='cal'){close();try{if(S.fromEditor&&typeof peClose==='function')peClose(true)}catch(e){}try{APP.calMode='week';go('calendar')}catch(e){}return}},true);
document.addEventListener('change',ev=>{const t=ev.target;if(!t.matches||!t.matches('[data-v157="exact"]'))return;if(t.value){S.at=t.value.length===16?t.value:t.value.slice(0,16);draw()}},true);
document.addEventListener('keydown',ev=>{if(ev.key==='Escape'&&document.getElementById('v157')){ev.stopImmediatePropagation();close()}},true);
window.__v157={open,close,S,slots,lbl};
})();
