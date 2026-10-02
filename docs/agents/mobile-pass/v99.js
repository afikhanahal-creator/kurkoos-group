// ================= V99 · mobile pass: one full logo on every post (never the bars alone), header that never wraps,
//                   tap any thumbnail to open the image editor, bottom navigation on phones, enter and exit every page cleanly =================
(function(){
const PH=matchMedia&&matchMedia('(max-width:860px)');
// ---------- 1. editor from any thumbnail ----------
function postOfCanvas(cv){try{const d=cv.dataset;if(d.tp){return AG.posts.find(x=>x.id===d.tp)||(APP.art&&APP.art.pkg||[]).find(x=>x.id===d.tp)||(APP.cmp&&APP.cmp.p&&APP.cmp.p.id===d.tp?APP.cmp.p:null)}
 if(d.ti){const it=APP.sched&&APP.sched.items.find(i=>i.id===d.ti);if(!it||it.reel)return null;return typeof itemPost==='function'?itemPost(it):null}}catch(e){}return null}
let lastOpen={id:null,t:0};
if(typeof peOpen==='function'){const o=peOpen;window.peOpen=peOpen=function(p){if(p&&lastOpen.id===p.id&&Date.now()-lastOpen.t<600)return;lastOpen={id:p&&p.id,t:Date.now()};return o.apply(this,arguments)}}
document.addEventListener('click',e=>{const cv=e.target.closest&&e.target.closest('#appviews canvas[data-tp],#appviews canvas[data-ti],#appviews .v99edit');if(!cv)return;
 if(cv.closest('[data-pe],[data-pe-img],[data-v28],.v53row,#pe-root,.v68sp'))return;
 const c=cv.classList.contains('v99edit')?cv.previousElementSibling:cv;const p=c&&postOfCanvas(c);if(!p||typeof peOpen!=='function')return;
 if(cv.classList.contains('v99edit')){e.preventDefault();e.stopPropagation()}
 PE.tab=cv.classList.contains('v99edit')?'image':(PE.tab||'image');peOpen(p)},true);
// a visible pencil on every thumbnail that is big enough to tap, so the editor is one tap away in every page
const SVG='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';
function decorate(){const root=document.getElementById('appviews');if(!root)return;root.querySelectorAll('canvas[data-tp]:not([data-v99]),canvas[data-ti]:not([data-v99])').forEach(cv=>{cv.dataset.v99='1';const r=cv.getBoundingClientRect();if(r.width<96||r.height<96)return;if(cv.closest('.qcard,.ci,[data-pe],[data-pe-img],.v28-ciw'))return;
 const it=cv.dataset.ti&&APP.sched&&APP.sched.items.find(i=>i.id===cv.dataset.ti);if(it&&it.reel)return;
 const par=cv.parentElement;if(!par)return;if(getComputedStyle(par).position==='static')par.style.position='relative';
 const b=document.createElement('button');b.type='button';b.className='v99edit';b.setAttribute('aria-label','עריכת התמונה בעורך');b.title='עריכת התמונה';b.innerHTML=SVG;cv.insertAdjacentElement('afterend',b)})}
let dt=null;const mo=new MutationObserver(()=>{clearTimeout(dt);dt=setTimeout(decorate,120)});
function arm(){const root=document.getElementById('appviews');if(root&&!root.__v99mo){mo.observe(root,{childList:true,subtree:true});root.__v99mo=1;decorate()}}
arm();setTimeout(arm,1500);setTimeout(decorate,3000);
// ---------- 2. bottom navigation on phones ----------
const TABS=[['today','היום','today'],['queue','תור','queue'],['calendar','לוח','cal'],['gallery','גלריה','gallery'],['__menu','תפריט','menu']];
function navHtml(){const cur=(window.APP&&APP.view)||'';return TABS.map(([k,l,i])=>`<button type="button" data-v99nav="${k}" ${cur===k?'aria-current="page"':''}><span class="ic">${typeof ico==='function'?ico(i,20):''}</span><span>${l}</span></button>`).join('')}
function ensureNav(){let n=document.getElementById('v99nav');if(!n){n=document.createElement('nav');n.id='v99nav';n.setAttribute('aria-label','ניווט מהיר');document.body.appendChild(n)}n.innerHTML=navHtml();return n}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-v99nav]');if(!b)return;const k=b.dataset.v99nav;
 if(k==='__menu'){const s=document.getElementById('side');if(s)s.classList.toggle('open');return}
 const s=document.getElementById('side');if(s)s.classList.remove('open');if(window.APP){APP.view=k;try{if(typeof saveApp==='function')saveApp()}catch(x){}try{render()}catch(x){}}window.scrollTo(0,0);ensureNav()});
if(typeof render==='function'){const r=render;window.render=render=function(){const out=r.apply(this,arguments);try{ensureNav()}catch(e){}return out}}
ensureNav();
// closing the drawer by tapping the page behind it
document.addEventListener('click',e=>{const s=document.getElementById('side');if(!s||!s.classList.contains('open'))return;if(e.target.closest('#side,[data-app="menu"],[data-v99nav]'))return;s.classList.remove('open')},true);
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('#side [data-view]');if(b){const s=document.getElementById('side');if(s&&PH.matches)setTimeout(()=>s.classList.remove('open'),60)}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){const s=document.getElementById('side');if(s)s.classList.remove('open')}});
// ---------- 3. long family notes in the templates page fold to three lines ----------
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('.v99more');if(!b)return;const p=b.previousElementSibling;if(p){p.classList.toggle('open');b.textContent=p.classList.contains('open')?'פחות':'עוד'}});
function foldNotes(){document.querySelectorAll('#appviews p.px-note:not([data-v99f])').forEach(p=>{p.dataset.v99f='1';if(p.textContent.length<140)return;p.classList.add('v99fold');const b=document.createElement('button');b.type='button';b.className='v99more';b.textContent='עוד';p.insertAdjacentElement('afterend',b)})}
const mo2=new MutationObserver(()=>{clearTimeout(mo2._t);mo2._t=setTimeout(foldNotes,150)});mo2.observe(document.body,{childList:true,subtree:true});foldNotes();
window.__v99={decorate,ensureNav,postOfCanvas};
})();
