// ================= V141 · the gallery's filter bar, compact: one tools row (search, sort, project, size, topics), the topics in one
//                   scrolling row of small chips, all of them only on request, and while scrolling only the slim tools row stays,
//                   right under the page header instead of hiding the posts =================
(function(){
function hdrBottom(){let el=document.elementFromPoint(Math.round(innerWidth/2),12),b=0;while(el&&el!==document.body){const cs=getComputedStyle(el);if(cs.position==='sticky'||cs.position==='fixed'){b=Math.max(b,el.getBoundingClientRect().bottom)}el=el.parentElement}return Math.round(b)}
function setup(){const bar=document.querySelector('#appviews .ga-bar');if(!bar)return;const top=hdrBottom();if(top>0)bar.style.setProperty('--v141top',(top+8)+'px');
 const tools=bar.querySelector('.ga-tools'),more=bar.querySelector(':scope > .v124more');let my=tools&&tools.querySelector('.v141topics');
 if(tools&&more){if(!my){my=document.createElement('button');my.type='button';my.className='v141topics';tools.appendChild(my)}const lab=more.textContent.trim();if(my.textContent!==lab)my.textContent=lab;const ex=more.getAttribute('aria-expanded');if(ex!==null&&my.getAttribute('aria-expanded')!==ex)my.setAttribute('aria-expanded',ex)}
 else if(my)my.remove()
 stuck()}
function stuck(){const bar=document.querySelector('#appviews .ga-bar');if(!bar)return;const t=parseFloat(getComputedStyle(bar).top)||0;const on=getComputedStyle(bar).position==='sticky'&&bar.getBoundingClientRect().top<=t+1&&(window.scrollY||document.documentElement.scrollTop||(document.getElementById('appmain')||{}).scrollTop||0)>140;
 if(bar.classList.contains('v141stuck')!==on)bar.classList.toggle('v141stuck',on)}
let st=0;addEventListener('scroll',()=>{if(st)return;st=requestAnimationFrame(()=>{st=0;stuck()})},{capture:true,passive:true});
addEventListener('resize',()=>setup());
let mt=0;new MutationObserver(()=>{if(mt)return;mt=requestAnimationFrame(()=>{mt=0;setup()})}).observe(document.body,{childList:true,subtree:true});
// opening all topics while the bar is stuck brings them back at once
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('#appviews .ga-bar .v141topics');if(!b)return;const bar=b.closest('.ga-bar');const o=bar.querySelector(':scope > .v124more');if(o)o.click();setTimeout(()=>{const f=bar.querySelector('.ga-fam');if(f&&f.classList.contains('v124open'))bar.classList.remove('v141stuck')},0)});
window.__v141={setup,stuck};
})();
