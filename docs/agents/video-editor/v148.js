// ================= V148 · the editor's photo library: a remove button on every photo (with undo) and a way into the full gallery;
//                   on desktop a template picked in the side panel opens the full-screen template view =================
(function(){
function deco(root){if(!root)return;
 root.querySelectorAll('.v115t[data-k]').forEach(t=>{if(t.querySelector('.v148x'))return;const x=document.createElement('span');x.className='v148x';x.setAttribute('role','button');x.tabIndex=0;x.title='הסרה מהגלריה';x.setAttribute('aria-label','הסרה מהגלריה');x.textContent='×';t.appendChild(x)});
 root.querySelectorAll('.v115bar').forEach(bar=>{if(bar.querySelector('[data-v148g]'))return;const b=document.createElement('button');b.type='button';b.className='v148g';b.dataset.v148g='1';b.textContent='ניהול הגלריה';bar.appendChild(b)})}
let t=0;new MutationObserver(()=>{if(t)return;t=requestAnimationFrame(()=>{t=0;deco(document.getElementById('pe-root'));deco(document.getElementById('v115lib'))})}).observe(document.body,{childList:true,subtree:true});
function act(ev){const x=ev.target.closest&&ev.target.closest('.v148x');if(x){ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation();const tl=x.closest('.v115t');const k=tl&&tl.dataset.k;if(k&&window.__v148){tl.style.opacity='.35';__v148.hide([k])}return}
 const g=ev.target.closest&&ev.target.closest('[data-v148g]');if(g){ev.preventDefault();ev.stopPropagation();try{const lb=document.getElementById('v115lib');if(lb)lb.remove()}catch(e){}try{if(typeof peClose==='function'&&typeof PE!=='undefined'&&PE.p)peClose()}catch(e){}setTimeout(()=>{try{go('photos')}catch(e){APP.view='photos';render()}},60)}}
document.addEventListener('click',act,true);
// on desktop a template picked in the side panel opens the full-screen template view, so every template is seen large with this post
document.addEventListener('click',ev=>{const b=ev.target.closest&&ev.target.closest('.pe-tpl [data-pe-a="lay"],.pe-tpl [data-pe-lay]');if(!b||!window.matchMedia('(min-width: 900px)').matches)return;setTimeout(()=>{try{if(window.__v66open&&typeof PE!=='undefined'&&PE.p&&!document.getElementById('v66tp'))__v66open()}catch(e){}},120)},true);
document.addEventListener('keydown',ev=>{if((ev.key==='Enter'||ev.key===' ')&&ev.target.classList&&ev.target.classList.contains('v148x'))act(ev)},true);
})();
