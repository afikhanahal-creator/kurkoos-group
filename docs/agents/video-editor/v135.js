// ================= V135 · a close X on every phone window, always: pinned top right, visible while you scroll, for the
//                   composer, the post editor, the schedule sheet, the finished-video window, prompt sheets, galleries and
//                   every other full-screen window =================
(function(){
const EXTRA=[['#v131',()=>window.__v131&&__v131.close()],['#v132res',el=>el.remove()],['.v128sheet',el=>el.remove()],['#v130sb',null]];
const vis=el=>{if(!el)return false;const cs=getComputedStyle(el);if(cs.display==='none'||cs.visibility==='hidden')return false;const r=el.getBoundingClientRect();return r.width>0&&r.height>0};
function target(){let best=null,bz=-1;
 EXTRA.forEach(([sel,fn])=>{if(!fn)return;document.querySelectorAll(sel).forEach(el=>{if(vis(el)){const z=+getComputedStyle(el).zIndex||0;if(z>=bz){bz=z;best={el,close:()=>fn(el)}}}})});
 const t=window.__v101&&__v101.top();if(t){const z=+getComputedStyle(t).zIndex||0;if(z>bz){bz=z;best={el:t,close:()=>__v101.closeOverlay(t)}}}
 return best}
let cur=null;
function ensure(){const phone=innerWidth<=860;let b=document.getElementById('v135x');cur=phone?target():null;
 if(!cur){if(b)b.classList.remove('on');return}
 if(!b){b=document.createElement('button');b.type='button';b.id='v135x';b.setAttribute('aria-label','סגירה וחזרה');b.innerHTML='<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>';document.body.appendChild(b)}
 b.classList.add('on');b.classList.toggle('pg',!!cur.page);const z=(+getComputedStyle(cur.el).zIndex||0)+5;b.style.zIndex=String(Math.max(z,10085));room(b)}
// the window's own header row under the X gets room on the right so the title stays readable
function room(b){const r=b.getBoundingClientRect();const hit=document.elementsFromPoint(r.left+r.width/2,r.top+r.height/2).find(x=>x!==b&&!b.contains(x));let e=hit;
 while(e&&e!==document.body&&cur.el.contains(e)){const q=e.getBoundingClientRect();if(q.width>=innerWidth*.9&&q.height<130){if(!e.classList.contains('v135pad'))e.classList.add('v135pad');return}e=e.parentElement}}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('#v135x');if(!b)return;e.preventDefault();e.stopPropagation();const t=cur||target();if(t){try{t.close()}catch(x){}}setTimeout(ensure,120);setTimeout(ensure,450)},true);
let r=0;const kick=()=>{if(r)return;r=requestAnimationFrame(()=>{r=0;ensure()})};
new MutationObserver(kick).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style']});
addEventListener('resize',kick);
window.__v135={ensure,target};
})();
