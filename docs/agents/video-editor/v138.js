// ================= V138 · moving a post with a finger on iPhone: calendar cards were marked draggable, so a long press started
//                   the phone's own drag, which cancelled the page's drag before the drop, and nothing was saved. On touch screens the
//                   cards are no longer natively draggable; if the phone still interrupts a drag, the touch keeps being followed to the drop.
//                   Every card also gets a clear "מועד" button that opens the schedule sheet, and each step is noted for diagnosis =================
(function(){
const touch=('ontouchstart' in window)||(navigator.maxTouchPoints||0)>0||matchMedia('(pointer:coarse)').matches;
const ev=(n,x)=>{try{window.__v136&&__v136.ev(n,x)}catch(e){}};
const CLOCK='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>';
const GRIP='<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg>';
function fix(){
 if(touch)document.querySelectorAll('#appviews [draggable="true"]').forEach(el=>{el.setAttribute('draggable','false')});
 document.querySelectorAll('#appviews .v28-cit').forEach(g=>{if(g.querySelector('.v138when'))return;const any=g.querySelector('[data-id]');if(!any)return;
  const ci=g.parentElement&&g.parentElement.querySelector('[data-drag]');if(ci&&!g.querySelector('.v138grip')){const h=document.createElement('button');h.type='button';h.className='v138grip';h.dataset.v138grip=ci.dataset.drag;h.title='גררו את הפוסט ליום אחר';h.setAttribute('aria-label','גרירה ליום אחר. אפשר גם ללחוץ על מועד');h.innerHTML=GRIP+'<span>גררו</span>';g.prepend(h)}
  const b=document.createElement('button');b.type='button';b.className='v138when';b.dataset.v131open='item';b.dataset.id=any.dataset.id;b.title='שינוי יום ושעה';b.setAttribute('aria-label','שינוי מועד');b.innerHTML=CLOCK+'<span>מועד</span>';g.prepend(b)})}
let ft=0;new MutationObserver(()=>{if(ft)return;ft=requestAnimationFrame(()=>{ft=0;fix()})}).observe(document.body,{childList:true,subtree:true});fix();
// trace the drag
ddBegin=(f=>function(){try{ev('dd:begin',DD.s&&DD.s.id)}catch(e){}return f.apply(this,arguments)})(ddBegin);
ddEnd=(f=>function(drop){try{const s=DD.s;if(s&&s.on)ev('dd:end',(drop?'drop ':'cancel ')+(s.pl?(s.pl.t.kind+' '+(s.pl.at||s.pl.t.ds||'')):'no target'))}catch(e){}return f.apply(this,arguments)})(ddEnd);
// the phone took the gesture over: keep following the finger with touch events
document.addEventListener('touchmove',e=>{const s=DD.s;if(!s||!s.on||!s.tc)return;const t=e.touches[0];if(t){s.tcMoved=1;e.preventDefault();ddMoveTo(t.clientX,t.clientY)}},{passive:false});
// if the phone keeps the finger to itself, say how to move the post instead of failing silently
document.addEventListener('pointercancel',()=>{setTimeout(()=>{const s=DD.s;if(s&&s.tc&&!s.tcMoved){ddEnd(false);ev('dd:lost');if(window.toast)toast('הטלפון עצר את הגרירה. גררו מהכפתור "גררו" שמתחת לפוסט, או לחצו "מועד" ובחרו יום')}},700)});
document.addEventListener('touchend',e=>{const s=DD.s;if(!s||!s.on||!s.tc)return;const t=e.changedTouches[0];if(t)ddMoveTo(t.clientX,t.clientY);ddEnd(true)},true);
document.addEventListener('touchcancel',()=>{const s=DD.s;if(s&&s.tc)ddEnd(false)},true);
document.addEventListener('dragstart',e=>{if(e.target.closest&&e.target.closest('#appviews [data-drag]'))ev('native:dragstart')},true);
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-v131open="item"],#appviews [data-app="edit"][data-id]');if(b)ev('sheet:open',b.dataset.id)},true);
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('#v131 [data-v131="save"]');if(b)ev('sheet:save',(b.disabled?'disabled ':'')+((window.__v131&&__v131.S.at)||''))},true);
// the handle: the browser never treats it as a scroll (touch-action none), so the drag starts at once and the finger is followed to the drop
document.addEventListener('pointerdown',e=>{const h=e.target.closest&&e.target.closest('[data-v138grip]');if(!h||DD.s)return;if(e.pointerType==='mouse'&&e.button!==0)return;
 const el=document.querySelector(`#appviews [data-drag="${CSS.escape(h.dataset.v138grip)}"]`);if(!el)return;e.preventDefault();e.stopPropagation();
 try{h.setPointerCapture&&h.releasePointerCapture&&h.hasPointerCapture&&h.hasPointerCapture(e.pointerId)&&h.releasePointerCapture(e.pointerId)}catch(x){}
 DD.s={el,id:el.dataset.drag,pid:null,x:e.clientX,y:e.clientY,pt:e.pointerType,on:false,grip:1};ddBegin(e.clientX,e.clientY);ev('dd:grip',el.dataset.drag)},true);
document.addEventListener('touchstart',e=>{if(e.target.closest&&e.target.closest('[data-v138grip]'))e.preventDefault()},{passive:false,capture:true});
document.addEventListener('click',e=>{if(e.target.closest&&e.target.closest('[data-v138grip]')){e.preventDefault();e.stopPropagation();if(Date.now()-(DD.just||0)>450&&window.toast)toast('החזיקו את "גררו" והזיזו את האצבע ליום הרצוי, או לחצו על "מועד"')}},true);
window.__v138={fix,touch};
})();
