// ================= V172 · phones: the header buttons fold into one "פעולות" sheet; a long press (or right click) on a post opens its quick actions
(()=>{
if(window.__v172)return;window.__v172=1;
const mq=matchMedia('(max-width:860px)');
const I=n=>{try{return ico(n,18)}catch(e){return ''}};
const E=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* one bottom sheet used by both features */
let back=null;
function close(){const w=document.getElementById('v172sheet');if(!w)return;w.remove();document.querySelectorAll('.v172press').forEach(c=>c.classList.remove('v172press'));if(back&&back.isConnected)try{back.focus({preventScroll:true})}catch(e){}back=null}
function sheet(title,sub,items){close();back=document.activeElement;
 const w=document.createElement('div');w.id='v172sheet';w.setAttribute('role','dialog');w.setAttribute('aria-modal','true');w.setAttribute('aria-label',title);
 w.innerHTML=`<div class="v172bg" data-v172x="1"></div><div class="v172pan"><div class="v172grip" aria-hidden="true"></div><div class="v172h"><div><b>${E(title)}</b>${sub?`<span>${E(sub)}</span>`:''}</div><button type="button" class="v172x" data-v172x="1" aria-label="סגירת התפריט">${I('x')}</button></div><div class="v172l"></div></div>`;
 const l=w.querySelector('.v172l');
 items.forEach(it=>{const b=document.createElement('button');b.type='button';b.className='v172i'+(it.danger?' danger':'');b.disabled=!!it.disabled;
  b.innerHTML=`<span class="v172ic" aria-hidden="true">${it.icon||''}</span><span class="v172t">${E(it.label)}</span>`;
  b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();
   if(it.confirm&&b.dataset.ok!=='1'){b.dataset.ok='1';b.classList.add('arm');b.querySelector('.v172t').textContent=it.confirm;return}
   close();setTimeout(()=>{try{it.run()}catch(x){console.error('v172',x)}},0)});
  l.appendChild(b)});
 document.body.appendChild(w);requestAnimationFrame(()=>w.classList.add('in'));
 setTimeout(()=>{const f=l.querySelector('button:not(:disabled)');f&&f.focus({preventScroll:true})},60)}
document.addEventListener('click',e=>{if(e.target.closest&&e.target.closest('[data-v172x]')){e.preventDefault();e.stopPropagation();close()}},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.getElementById('v172sheet')){e.preventDefault();e.stopImmediatePropagation();close()}},true);

/* 1 · the header row of buttons (בחר הכל, גיוון תמונות, ייבוא...) pushed the posts down on a phone: it folds into one button */
function actItems(act){return [...act.children].filter(b=>b.tagName==='BUTTON').map(b=>{const s=b.querySelector('svg');const label=(b.textContent||b.getAttribute('aria-label')||'').replace(/\s+/g,' ').trim();
 return {icon:s?s.outerHTML:'',label,disabled:b.disabled,run:()=>b.click()}}).filter(x=>x.label)}
function openActs(){const act=document.getElementById('vact');if(!act)return;const t=(document.getElementById('vt')||{}).textContent||'';sheet('פעולות',t,actItems(act))}
function sync(){const act=document.getElementById('vact');if(!act)return;const bar=act.closest('.tbar');if(!bar)return;
 const kids=[...act.children];const fold=mq.matches&&kids.length>1&&kids.every(b=>b.tagName==='BUTTON');
 bar.classList.toggle('v172fold',fold);
 let btn=document.getElementById('v172act');
 if(!btn){btn=document.createElement('button');btn.type='button';btn.id='v172act';btn.className='ibtn';btn.setAttribute('aria-haspopup','dialog');btn.setAttribute('aria-label','פעולות');btn.title='פעולות';btn.innerHTML=`${I('sliders')}<span>פעולות</span>`;btn.addEventListener('click',e=>{e.preventDefault();openActs()})}
 if(btn.parentElement!==bar){const nw=bar.querySelector('[data-app="new"]');nw?bar.insertBefore(btn,nw):bar.appendChild(btn)}
 btn.hidden=!fold;
 if(act.__v172!==1){act.__v172=1;new MutationObserver(()=>sync()).observe(act,{childList:true})}}
/* the search and filter bar of posts and photos sticks to the top of the scrolling area; on phones that area is the page body, not the window, so its offset is 0 */
function inner(){const m=document.getElementById('appmain');if(!m)return;const o=getComputedStyle(m).overflowY;const on=(o==='auto'||o==='scroll')&&m.scrollHeight>m.clientHeight+1;document.body.classList.toggle('v172inner',on);if(on)document.body.style.setProperty('--v172pt',(parseFloat(getComputedStyle(m).paddingTop)||0)+'px')}
try{render=(f=>function(){const r=f.apply(this,arguments);try{sync();inner()}catch(e){}return r})(render)}catch(e){}
addEventListener('resize',()=>{try{inner()}catch(e){}},{passive:true});
try{mq.addEventListener('change',sync)}catch(e){}
setTimeout(()=>{sync();inner()},0);

/* 2 · long press on a post card: edit, schedule, download, select, fix, delete (delete can be undone from the snackbar) */
function dl(p){const cv=document.createElement('canvas');cv.width=1080;cv.height=1350;drawSlide(cv,p,0);saveCanvas(cv,(p.key||p.id)+'.png')}
function openPost(card){const id=card.dataset.gaid;const p=(AG.posts||[]).find(x=>x.id===id);if(!p)return;
 const it=((APP.sched&&APP.sched.items)||[]).find(i=>i.pid===id&&!i.removed);
 const head=(typeof pxHead==='function'?pxHead(p):'').replace(/\s+/g,' ').slice(0,60);
 const sub=it?'מתוזמן ל '+(typeof fmtDate==='function'?fmtDate(it.at):it.at):(p.series||'');
 const q=s=>card.querySelector(s);const sel=(typeof GA!=='undefined'&&GA.sel&&GA.sel.has(id));
 card.classList.add('v172press');
 sheet(head||'פוסט',sub,[
  {icon:I('edit'),label:'עריכה',run:()=>peOpen(p)},
  {icon:I('clock'),label:it?'שינוי מועד':'תזמון',disabled:!q('[data-ga="sched1"]'),run:()=>{const b=q('[data-ga="sched1"]');b&&b.click()}},
  {icon:I('dl'),label:'הורדת התמונה',run:()=>dl(p)},
  {icon:I('check'),label:sel?'הסרה מהבחירה':'בחירה',disabled:!q('[data-ga="sel"]'),run:()=>{const b=q('[data-ga="sel"]');b&&b.click()}},
  ...(typeof v36Sheet==='function'?[{icon:I('wand'),label:'תיקון וגרסאות חדשות',run:()=>v36Sheet([id])}]:[]),
  ...(typeof v36Delete==='function'?[{icon:I('trash'),label:'מחיקת הפוסט',danger:true,confirm:'לחצו שוב כדי למחוק',run:()=>v36Delete([id])}]:[])
 ])}
let lp=null,eat=0;
const CARD='.ga-card[data-gaid]';
document.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'||e.button>0)return;const c=e.target.closest&&e.target.closest(CARD);if(!c||e.target.closest('.ga-acts,.ga-chk'))return;
 if(lp)clearTimeout(lp.t);lp={c,x:e.clientX,y:e.clientY,t:setTimeout(()=>{lp&&(lp.fired=1);eat=Date.now()+700;try{navigator.vibrate&&navigator.vibrate(10)}catch(x){}openPost(c)},480)}},{passive:true,capture:true});
document.addEventListener('pointermove',e=>{if(lp&&!lp.fired&&Math.hypot(e.clientX-lp.x,e.clientY-lp.y)>10){clearTimeout(lp.t);lp=null}},{passive:true,capture:true});
['pointerup','pointercancel'].forEach(t=>document.addEventListener(t,()=>{if(lp){clearTimeout(lp.t);if(lp.fired)eat=Date.now()+500;lp=null}},{passive:true,capture:true}));
// the lift that ends a long press must not also open the lightbox, or land on the sheet that just opened under the finger
document.addEventListener('click',e=>{if(Date.now()<eat){e.preventDefault();e.stopPropagation();eat=0}},true);
document.addEventListener('contextmenu',e=>{const c=e.target.closest&&e.target.closest(CARD);if(!c)return;e.preventDefault();if(document.getElementById('v172sheet'))return;if(lp){clearTimeout(lp.t);lp=null;eat=Date.now()+700}openPost(c)},true);

window.__v172={sync,openActs,openPost,close};
})();
