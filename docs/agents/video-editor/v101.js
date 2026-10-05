// ================= V101 · a way back from every window: a close button pinned to the top of every full-screen window on phones,
//                   the phone's back gesture closes the topmost window instead of leaving the system, Escape too =================
(function(){
const SEL='#ga-lb,#pe-root,#cmp-root,#v66tp,#v68sp,.v52m,.dg-modal,.px-cmdb,.px-insp,.v44bd,.v50modal,.v62ov,.v63ov,.v65cmp,.ov';
const CLOSERS='[data-ga="lbx"],[data-pe-a="close"],[data-app="cmpclose"],[data-v52="close"],[data-v68="x"],[data-dg="cancel"],[data-v63="close"],[data-v65="x"],[data-px="close"],[data-v66="close"],[data-v66="x"],[data-v44="close"],[data-v50m="close"],button[aria-label="סגור"],button[aria-label="סגירה"],button[aria-label="ביטול"],button.close,.px-ib[aria-label*="סג"]';
const vis=el=>{if(!el)return false;const cs=getComputedStyle(el);if(cs.display==='none'||cs.visibility==='hidden')return false;const r=el.getBoundingClientRect();return r.width>0&&r.height>0};
function overlays(){return [...document.querySelectorAll(SEL)].filter(vis).sort((a,b)=>(+getComputedStyle(a).zIndex||0)-(+getComputedStyle(b).zIndex||0))}
function top(){const o=overlays();return o[o.length-1]||null}
function closeOverlay(el){if(!el)return false;
 try{if(el.id==='pe-root'&&typeof peClose==='function'){peClose();if(document.getElementById('pe-root')){peClose()}return true}}catch(e){}
 try{if(el.id==='cmp-root'&&typeof closeComposer==='function'){closeComposer();return true}}catch(e){}
 try{if(el.id==='ga-lb'&&typeof GA!=='undefined'){GA.lb=null;gaLbRender();return true}}catch(e){}
 const b=[...el.querySelectorAll(CLOSERS)].find(vis)||el.querySelector(CLOSERS);if(b){b.click();setTimeout(()=>{if(document.body.contains(el)&&vis(el))el.remove()},350);return true}
 el.remove();document.body.classList.remove('pe-open','ga-lb-on');return true}
// the pinned close button
function ensureBtn(){const t=top();let b=document.getElementById('v101x');
 if(!t||innerWidth>860){if(b)b.remove();return}
 if(!b){b=document.createElement('button');b.id='v101x';b.type='button';b.setAttribute('aria-label','סגירה וחזרה למסך הקודם');b.innerHTML='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg><span>חזרה</span>';b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();const o=top();closeOverlay(o);setTimeout(ensureBtn,400)});document.body.appendChild(b)}
 const z=(+getComputedStyle(t).zIndex||0)+2;b.style.zIndex=String(Math.max(z,10070));
 // if the window already shows its own close control inside the top strip, keep ours small and out of its way
 const own=[...t.querySelectorAll(CLOSERS)].find(x=>{if(!vis(x))return false;const r=x.getBoundingClientRect();return r.top>=0&&r.top<64&&r.left<innerWidth&&r.right>0});
 b.classList.toggle('mini',!!own);if(own){const r=own.getBoundingClientRect();b.classList.toggle('right',r.left<innerWidth/2)}}
let t=null;const mo=new MutationObserver(()=>{clearTimeout(t);t=setTimeout(()=>{ensureBtn();syncHistory()},80)});mo.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style']});
addEventListener('resize',ensureBtn);addEventListener('scroll',()=>{},true);
// history: one entry per open window, so the back gesture closes it
let depth=0,busy=false;
function syncHistory(){if(busy)return;const n=overlays().length;while(depth<n){try{history.pushState({v101:depth+1},'')}catch(e){}depth++}
 if(n<depth){depth=n}}
addEventListener('popstate',e=>{const o=top();if(o&&!busy){busy=true;closeOverlay(o);depth=Math.max(0,depth-1);setTimeout(()=>{busy=false;ensureBtn()},450)}else{const s=document.getElementById('side');if(s&&s.classList.contains('open')){s.classList.remove('open')}}});
addEventListener('keydown',e=>{if(e.key==='Escape'){const o=top();if(o){closeOverlay(o);setTimeout(ensureBtn,400)}}});
window.__v101={top,closeOverlay,overlays};
})();
