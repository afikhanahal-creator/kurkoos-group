// ================= V171 · save, undo and download always within reach in the editor (a labelled bar on phones, labelled
//                   buttons on desktop, native share sheet for saving the image on phones), and undo for every action on the
//                   main pages: deleting, adding, editing posts, scheduling, moving and removing from the schedule =================
(function(){
if(window.__v171)return;window.__v171=1;
const PH=()=>matchMedia('(max-width:860px)').matches;
const $=s=>document.querySelector(s);
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const ICO={undo:'<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',redo:'<path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>',
 save:'<path d="M5 3h11l4 4v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M8 3v5h7V3"/><path d="M8 21v-7h8v7"/>',dl:'<path d="M12 4v11"/><path d="m7 10 5 5 5-5"/><path d="M5 20h14"/>'};
const svg=k=>`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICO[k]}</svg>`;

/* ---------------- 1. the editor: one bar with the four actions ---------------- */
function edState(){try{return{open:typeof PE!=='undefined'&&!!PE.p&&!!document.getElementById('pe-root')&&document.body.classList.contains('pe-open'),u:PE.hist.length>0,r:PE.fut.length>0,d:!!(typeof peDirty==='function'&&peDirty())}}catch(e){return{open:false}}}
function bar(){let b=document.getElementById('v171bar');const root=document.getElementById('pe-root');if(!root)return null;
 if(!b||b.parentNode!==root){b=document.createElement('div');b.id='v171bar';b.setAttribute('role','toolbar');b.setAttribute('aria-label','פעולות עריכה');
  b.innerHTML=`<button type="button" data-v171="undo">${svg('undo')}<span>ביטול</span></button><button type="button" data-v171="redo">${svg('redo')}<span>חזרה</span></button><button type="button" data-v171="dl">${svg('dl')}<span>הורדה</span></button><button type="button" data-v171="save" class="pri">${svg('save')}<span>שמירה</span></button>`;
  root.appendChild(b)}return b}
function sync(){const s=edState();if(!s.open)return;const b=bar();if(!b)return;
 const set=(k,on)=>{const x=b.querySelector(`[data-v171="${k}"]`);if(x){x.disabled=!on;x.setAttribute('aria-disabled',String(!on))}};
 set('undo',s.u);set('redo',s.r);set('dl',true);
 const sv=b.querySelector('[data-v171="save"]');if(sv){sv.disabled=!s.d;sv.classList.toggle('dirty',s.d);sv.querySelector('span').textContent=s.d?'שמירה':'נשמר'}
 // desktop: the icon buttons get words, so nobody has to guess
 document.querySelectorAll('#pe-root .pe-acts [data-pe-a="undo"],#pe-root .pe-acts [data-pe-a="redo"]').forEach(x=>{if(!x.querySelector('.v171l')){const sp=document.createElement('span');sp.className='v171l';sp.textContent=x.dataset.peA==='undo'?'ביטול':'חזרה';x.appendChild(sp)}})}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('#v171bar [data-v171]');if(!b||b.disabled)return;e.preventDefault();e.stopPropagation();
 const a=b.dataset.v171;const t=document.querySelector(`#pe-root .pe-acts [data-pe-a="${a}"]`)||document.querySelector(`#pe-root [data-pe-a="${a}"]`);
 if(a==='save'){try{const ae=document.activeElement;if(ae&&ae.blur)ae.blur()}catch(x){}try{peSave()}catch(x){if(t)t.click()}setTimeout(sync,60);return}
 if(t){t.disabled=false;t.click()}setTimeout(sync,60)},true);
['peRender','peSoft','peTopDirty','peSave','peOpen'].forEach(n=>{try{const f=window[n];if(typeof f!=='function')return;const w=function(){const r=f.apply(this,arguments);setTimeout(sync,0);return r};window[n]=w;try{eval(n+'=w')}catch(e){}}catch(e){}});
setInterval(sync,500);

/* saving the image on a phone: the share sheet (Save Image on iPhone, Save to device on Android), else the old way */
try{if(typeof saveCanvas==='function'){const sc0=saveCanvas;saveCanvas=async function(cv,name){
 try{if(PH()&&navigator.canShare){const blob=await new Promise(r=>cv.toBlob(r,'image/png'));const f=new File([blob],name||'kurkoos.png',{type:'image/png'});
  if(navigator.canShare({files:[f]})){try{await navigator.share({files:[f],title:'קבוצת קורקוס'});toast('התמונה מוכנה לשמירה');return}catch(e){if(e&&e.name==='AbortError')return}}}}catch(e){}
 return sc0.apply(this,arguments)}}}catch(e){}

/* ---------------- 2. undo on the main pages ---------------- */
const U={stack:[],max:40,replay:false,posts:null,sched:null,act:0};
// only what the person did is offered for undo: a change that arrives from the cloud sync with no tap or key just before it is taken as the new base
['pointerdown','keydown'].forEach(t=>document.addEventListener(t,()=>{U.act=Date.now()},true));
const byUser=()=>Date.now()-U.act<2500;
const strip=p=>{try{const {editing,_t,...r}=p;return JSON.stringify(r)}catch(e){return ''}};
function snapPosts(){const m=new Map();(AG.posts||[]).forEach((p,i)=>{if(p&&p.id)m.set(p.id,{s:strip(p),i,ref:p})});return m}
function snapSched(){const m=new Map();((APP.sched&&APP.sched.items)||[]).forEach(it=>{if(it&&it.id)m.set(it.id,JSON.stringify(it))});return m}
function push(entry){const last=U.stack[U.stack.length-1];entry.parts.forEach(x=>x.k=entry.kind);
 const inGroup=U.grp&&last&&last.t>=U.grp;
 if(last&&(inGroup||(entry.kind===last.kind&&Date.now()-last.t<900))){last.parts=last.parts.concat(entry.parts);last.t=Date.now();if(entry.kind===last.kind||entry.kind==='posts'){last.label=entry.label;last.kind=entry.kind}}
 else{entry.t=Date.now();U.stack.push(entry);if(U.stack.length>U.max)U.stack.shift()}
 chip();snack(U.stack[U.stack.length-1])}
function postLabel(rem,add,chg){if(rem)return rem>1?`נמחקו ${rem} פוסטים`:'הפוסט נמחק';if(add)return add>1?`נוספו ${add} פוסטים`:'נוסף פוסט';return chg>1?`${chg} פוסטים עודכנו`:'הפוסט עודכן'}
function recordPosts(){if(U.replay||!AG||!AG.posts)return;const now=snapPosts();const old=U.posts;U.posts=now;if(!old||!byUser())return;
 const rem=[],add=[],chg=[];
 old.forEach((v,id)=>{const n=now.get(id);if(!n)rem.push({id,s:v.s,i:v.i});else if(n.s!==v.s)chg.push({id,s:v.s})});
 now.forEach((v,id)=>{if(!old.has(id))add.push(id)});
 if(!rem.length&&!add.length&&!chg.length)return;
 if(chg.length&&!rem.length&&!add.length&&chg.every(c=>{const a=JSON.parse(c.s),b=now.get(c.id);if(!b)return false;const B=JSON.parse(b.s);delete a.upd;delete B.upd;delete a.born;delete B.born;return JSON.stringify(a)===JSON.stringify(B)}))return;
 push({kind:'posts',label:postLabel(rem.length,add.length,chg.length),parts:[{rem,add,chg}]})}
function recordSched(label){if(U.replay||!APP||!APP.sched)return;const now=snapSched();const old=U.sched;U.sched=now;if(!old||!byUser())return;
 const gone=[],added=[],chg=[];old.forEach((s,id)=>{const n=now.get(id);if(!n)gone.push({id,s});else if(n!==s){const a=JSON.parse(s),b=JSON.parse(n);delete a.upd;delete b.upd;if(JSON.stringify(a)!==JSON.stringify(b))chg.push({id,s})}});now.forEach((s,id)=>{if(!old.has(id))added.push(id)});
 if(!gone.length&&!added.length&&!chg.length)return;
 const lb=label||(gone.length?'הוסר מהתור':added.length?'נוסף ללוח':chg.some(c=>JSON.parse(c.s).at!==((APP.sched.items.find(i=>i.id===c.id)||{}).at))?'המועד שונה':'התזמון עודכן');
 push({kind:'sched',label:lb,parts:[{gone,added,chg}]})}
try{saveAgent=(f=>function(){const r=f.apply(this,arguments);try{recordPosts()}catch(e){}return r})(saveAgent)}catch(e){}
try{saveSched=(f=>function(){const r=f.apply(this,arguments);try{recordSched()}catch(e){}return r})(saveSched)}catch(e){}
try{removeItem=(f=>function(){const r=f.apply(this,arguments);try{recordSched('הוסר מהתור')}catch(e){}return r})(removeItem)}catch(e){}

function refreshViews(){try{if(typeof TC!=='undefined'&&TC.clear)TC.clear()}catch(e){}try{if(typeof GA!=='undefined'&&GA.lb)gaLbRender()}catch(e){}try{render()}catch(e){}}
function undo(){const e=U.stack.pop();if(!e){toast('אין פעולה לבטל');chip();return}U.replay=true;
 try{for(const part of e.parts.slice().reverse()){
  const k=part.k||e.kind;
  if(k==='ls'){try{lsSet(part.key,part.v)}catch(x){}}
  else if(k==='posts'){
   part.add.forEach(id=>{const i=AG.posts.findIndex(p=>p.id===id);if(i>=0)AG.posts.splice(i,1)});
   part.chg.forEach(c=>{const p=AG.posts.find(x=>x.id===c.id);if(!p)return;const o=JSON.parse(c.s);Object.keys(p).forEach(k=>{if(!(k in o)&&k!=='editing'&&k!=='_t')delete p[k]});Object.assign(p,o);p.upd=new Date().toISOString()});
   part.rem.slice().sort((a,b)=>a.i-b.i).forEach(r=>{if(AG.posts.some(p=>p.id===r.id))return;const o=JSON.parse(r.s);o.upd=new Date().toISOString();AG.posts.splice(Math.min(r.i,AG.posts.length),0,o)});
   try{saveAgent()}catch(x){}
  }else if(k==='sched'){
   part.added.forEach(id=>{const it=APP.sched.items.find(i=>i.id===id);if(it)try{removeItem(it)}catch(x){}});
   part.chg.forEach(c=>{const it=APP.sched.items.find(i=>i.id===c.id);if(!it)return;const o=JSON.parse(c.s);Object.keys(it).forEach(k=>{if(!(k in o))delete it[k]});Object.assign(it,o);try{saveSched(it)}catch(x){}});
   part.gone.forEach(g=>{if(APP.sched.items.some(i=>i.id===g.id))return;const it=JSON.parse(g.s);delete it.removed;APP.sched.items.push(it);APP.sched.removed=(APP.sched.removed||[]).filter(x=>x!==it.id);try{saveSched(it)}catch(x){}});
  }}}
 finally{U.posts=snapPosts();U.sched=snapSched();U.replay=false}
 refreshViews();chip();toast('בוטל: '+e.label)}
// one person action that touches posts, the schedule and hidden photos together (deleting a post) is one undo step
function group(fn,args,self){try{U.posts=snapPosts();U.sched=snapSched()}catch(x){}U.grp=Date.now()-1;const g0=JSON.stringify(lsGet('v37_gone',[])||[]);let r;
 try{r=fn.apply(self,args)}finally{try{recordSched()}catch(x){}
  try{const g1=JSON.stringify(lsGet('v37_gone',[])||[]);if(g1!==g0&&byUser()&&U.stack.length&&U.stack[U.stack.length-1].t>=U.grp)U.stack[U.stack.length-1].parts.push({k:'ls',key:'v37_gone',v:JSON.parse(g0)})}catch(x){}
  U.grp=0}return r}
try{if(typeof v36Delete==='function'){const f=v36Delete;window.v36Delete=function(){return group(f,arguments,this)};try{v36Delete=window.v36Delete}catch(x){}}}catch(e){}
window.__v171={undo,stack:U.stack,group};

/* the snackbar after every action, and a lasting undo button in the header */
function snack(e){if(!e)return;let s=document.getElementById('v171snack');if(!s){s=document.createElement('div');s.id='v171snack';s.setAttribute('role','status');s.setAttribute('aria-live','polite');document.body.appendChild(s)}
 if(edState().open){s.classList.remove('show');return}
 s.innerHTML=`<span>${esc(e.label)}</span><button type="button" data-v171u="1">${svg('undo')}ביטול</button>`;s.classList.add('show');clearTimeout(s._h);s._h=setTimeout(()=>s.classList.remove('show'),6500)}
function chip(){const top=document.querySelector('.topbar,.app-top,#apptop,header.top')||null;let c=document.getElementById('v171chip');
 if(!c){c=document.createElement('button');c.type='button';c.id='v171chip';c.dataset.v171u='1';c.innerHTML=svg('undo')+'<span>ביטול</span>';document.body.appendChild(c)}
 const last=U.stack[U.stack.length-1];c.hidden=!last;if(last){c.title='ביטול: '+last.label;c.setAttribute('aria-label','ביטול: '+last.label)}}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-v171u]');if(!b)return;e.preventDefault();e.stopPropagation();const s=document.getElementById('v171snack');if(s)s.classList.remove('show');undo()},true);
document.addEventListener('keydown',e=>{if(edState().open)return;const k=(e.key||'').toLowerCase();if(!(e.metaKey||e.ctrlKey)||e.shiftKey||e.altKey||k!=='z')return;
 const t=e.target;if(t&&(t.isContentEditable||/INPUT|TEXTAREA|SELECT/.test(t.tagName)))return;e.preventDefault();e.stopImmediatePropagation();window.__v36undo=null;undo()},true);

function init(){try{U.posts=snapPosts();U.sched=snapSched();chip()}catch(e){setTimeout(init,1500)}}
setTimeout(init,2500);
// after the cloud loads posts or the schedule, take a fresh base so loading is never offered as "undo"
try{if(typeof appInit==='function')appInit=(f=>async function(){const r=await f.apply(this,arguments);setTimeout(()=>{U.posts=snapPosts();U.sched=snapSched()},400);return r})(appInit)}catch(e){}
})();
