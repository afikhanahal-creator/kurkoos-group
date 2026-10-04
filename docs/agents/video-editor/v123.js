// ================= V123 · the date picker on desks is a centred dialog: month on one side, hour and minutes on the
//                   other, footer across, a dimmed page behind it (phones keep the bottom sheet) =================
(function(){
const DESK=matchMedia('(min-width:701px)');
function wrap(host){const pk=host.querySelector('.v44pk');if(!pk||pk.querySelector(':scope>.v123a'))return;
 const kids=[...pk.children];const ft=pk.querySelector(':scope>.v44ft');const tl=pk.querySelector(':scope>.v44tl');
 const a=document.createElement('div');a.className='v123a';const b=document.createElement('div');b.className='v123b';
 let toB=false;kids.forEach(k=>{if(k===ft)return;if(k===tl)toB=true;(toB?b:a).appendChild(k)});
 pk.insertBefore(a,ft||null);if(b.children.length)pk.insertBefore(b,ft||null);else b.remove();pk.classList.toggle('v123two',!!b.parentNode)}
function fix(){const host=document.querySelector('.v44host');if(!host)return;if(!DESK.matches){host.classList.remove('v123');return}
 host.classList.add('v123');host.style.left='';host.style.top='';host.style.width='';host.style.maxHeight='';host.style.overflow='';host.style.visibility='';wrap(host)}
new MutationObserver(fix).observe(document.body,{childList:true,subtree:true});
window.__v123={fix};
})();
