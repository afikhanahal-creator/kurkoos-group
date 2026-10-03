// ================= V106 · the page owns its scrolling on phones (the body never grows past the screen, so the header, the
//                   bottom bar and every pinned button stay where they are inside any app or iframe); a floating "חזרה ✕"
//                   appears once you scroll down a page; the pinned close picks a corner that covers no other button =================
(function(){
const PH=matchMedia('(max-width:860px)');
function scroller(){return document.getElementById('appmain')||document.querySelector('.appbody')}
// the bottom bar lives in the column, under the scroller, never over content
function placeNav(){const n=document.getElementById('v99nav');const m=document.querySelector('.mainc');if(n&&m&&n.parentElement!==m)m.appendChild(n)}
placeNav();const mo=new MutationObserver(placeNav);mo.observe(document.body,{childList:true});
// every page change starts at the top of the scroller (window.scrollTo does nothing when the body cannot scroll)
if(typeof render==='function'){render=(f=>function(){const out=f.apply(this,arguments);try{const s=scroller();if(s&&window.__v106last!==(typeof APP!=='undefined'&&APP.view)){s.scrollTop=0;window.__v106last=APP.view}}catch(e){}return out})(render)}
// floating back pill on long pages
function ensurePill(){let b=document.getElementById('v106x');const s=scroller();const open=window.__v101&&__v101.top();
 const show=PH.matches&&s&&s.scrollTop>420&&!open;
 if(!show){if(b)b.classList.remove('on');return}
 if(!b){b=document.createElement('button');b.id='v106x';b.type='button';b.setAttribute('aria-label','חזרה');b.innerHTML='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg><span>חזרה</span>';
  b.addEventListener('click',e=>{e.preventDefault();const st=window.__v102&&__v102.stack;if(st&&st.length){__v102.goBack()}else{const s=scroller();if(s)s.scrollTo({top:0,behavior:'smooth'})}});document.body.appendChild(b)}
 b.classList.add('on')}
document.addEventListener('scroll',e=>{if(e.target===scroller()||e.target===document)ensurePill()},true);
addEventListener('resize',ensurePill);setInterval(ensurePill,1500);
window.__v106={scroller,ensurePill};
})();
