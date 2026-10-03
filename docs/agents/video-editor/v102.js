// ================= V102 · page history on phones: a back arrow in the header returns to the previous page, the phone's back
//                   gesture does the same; the bottom bar: menu on the right, hidden under every window, never over a sheet =================
(function(){
const PH=matchMedia('(max-width:860px)');
const stack=[];let guard=false;
function cur(){return typeof APP!=='undefined'?APP.view:''}
// record every page change (render is the single entry point of a page change)
let last=cur();
render=(f=>function(){const out=f.apply(this,arguments);try{const v=cur();if(v&&v!==last){if(!guard){stack.push(last);if(stack.length>30)stack.shift();try{history.pushState({v102:v},'')}catch(e){}}last=v}ensureBack()}catch(e){}return out})(render);
function goBack(){const prev=stack.pop();if(!prev)return false;guard=true;try{if(typeof go==='function')go(prev);else{APP.view=prev;render()}}finally{guard=false}last=prev;return true}
function ensureBack(){const tb=document.querySelector('.tbar');if(!tb)return;let b=document.getElementById('v102back');const show=PH.matches&&stack.length>0;
 if(!show){if(b)b.remove();return}
 if(!b){b=document.createElement('button');b.id='v102back';b.type='button';b.className='ibtn';b.setAttribute('aria-label','חזרה לעמוד הקודם');b.innerHTML='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>';b.addEventListener('click',e=>{e.preventDefault();goBack()});const menu=tb.querySelector('[data-app="menu"]');if(menu)menu.insertAdjacentElement('afterend',b);else tb.prepend(b)}}
// the phone's back gesture: windows first (V101 handles them), then the previous page, then nothing (never leaves the system by surprise)
addEventListener('popstate',e=>{if(window.__v101&&__v101.top())return;if(stack.length){goBack()}});
try{history.replaceState({v102:cur()},'')}catch(e){}
setTimeout(ensureBack,800);
// bottom bar: menu on the right (first in reading order), today, queue, calendar, gallery
if(window.__v99){const n=document.getElementById('v99nav');if(n){const o=n.querySelector('[data-v99nav="__menu"]');if(o)n.prepend(o)}}
const mo=new MutationObserver(()=>{const n=document.getElementById('v99nav');if(!n)return;const first=n.firstElementChild;if(first&&first.dataset.v99nav!=='__menu'){const o=n.querySelector('[data-v99nav="__menu"]');if(o)n.prepend(o)}
 // hide the bar under any open window or sheet
 const open=!!(window.__v101&&__v101.top())||!!document.querySelector('.sheet,#v44host,.v44bd,.px-insp,#v53ctx');document.body.classList.toggle('v102-ov',open)});
mo.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style']});
window.__v102={goBack,stack};
})();
