// ================= V118 · the editor on a desk: the text tab opens with the headline (the Claude rewrite card moves
//                   below the fields), the stage bar is one grouped bar and the root carries a class for the desk styles
//                   (k118 CSS); phones keep the V108 layout =================
(function(){
function desk(){return window.innerWidth>900}
function arrange(){const r=document.getElementById('pe-root');if(!r)return;r.classList.toggle('v118',desk());if(!desk())return;
 const body=r.querySelector('.pe-body');if(!body)return;
 // text tab: hint, headline and fields first, the rewrite card after the headline block
 const v95=body.querySelector(':scope>.pe-sec.v95');const head=body.querySelector('[data-pe-f="headline"]');
 if(v95&&head){const sec=head.closest('.pe-sec');if(sec&&sec.parentElement===body&&sec.previousElementSibling===v95){sec.insertAdjacentElement('afterend',v95)}}
 // the stage bar keeps its order; the logo and animation chips sit together after the view toggles
 const bar=r.querySelector('.pe-sbar');if(bar&&!bar.dataset.v118){bar.dataset.v118='1';bar.setAttribute('role','toolbar');bar.setAttribute('aria-label','תצוגה, פורמט וזום')}}
if(typeof peRender==='function')peRender=(f=>function(){const r=f.apply(this,arguments);try{arrange()}catch(e){console.warn('v118',e)}return r})(peRender);
window.addEventListener('resize',()=>{try{arrange()}catch(e){}});
window.__v118={arrange};
})();
