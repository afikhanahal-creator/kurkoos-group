// ================= V163 · portfolio gallery: quiet chrome, image-first grid, newest designs first, filters behind one button on phones
(function(){
function mark(){try{const on=typeof APP!=='undefined'&&APP.view==='gallery';document.body.classList.toggle('v163g',on);if(!on)return;
  const tools=document.querySelector('#appviews .ga-tools');if(tools&&!tools.querySelector('.v163ft')){tools.insertAdjacentHTML('beforeend','<button type="button" class="v163ft" aria-expanded="'+document.body.classList.contains('v163f')+'" aria-controls="appviews"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4"/></svg>סינון ומיון</button>')}}catch(e){}}
try{if(!localStorage.getItem('v163sort')){localStorage.setItem('v163sort','1');if(typeof GA!=='undefined'&&GA.f){GA.f.sort='new';if(window.matchMedia('(max-width:760px)').matches)GA.f.size='m'}}}catch(e){}
if(typeof render==='function')render=(f=>function(){const r=f.apply(this,arguments);mark();return r})(render);
// the lightbox "תזמן" opens the same save and schedule sheet as the card and the editor
window.addEventListener('click',ev=>{const b=ev.target.closest&&ev.target.closest('[data-ga="lbsched"]');if(!b||!window.__v157||typeof GA==='undefined'||!GA.lb)return;
  const p=AG.posts.find(x=>x.id===GA.lb.ids[GA.lb.i]);if(!p)return;ev.preventDefault();ev.stopImmediatePropagation();window.__v157.open(p,false)},true);
document.addEventListener('click',ev=>{const b=ev.target.closest&&ev.target.closest('.v163ft');if(!b)return;const on=!document.body.classList.contains('v163f');document.body.classList.toggle('v163f',on);b.setAttribute('aria-expanded',on)});
setTimeout(mark,0);
})();
