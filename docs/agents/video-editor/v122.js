// ================= V122 · choosing a template or a shape on a full screen with big previews: a size control (קטן,
//                   בינוני, גדול) in the template picker and the shapes library, large by default on desks, tiles
//                   drawn at the matching resolution, and a "תצוגה גדולה" lightbox that shows the current choice at
//                   the full height of the screen with arrows to the next and previous template =================
(function(){
const KEY='v122_size';const phone=()=>matchMedia('(max-width:900px)').matches;
function size(){try{const v=localStorage.getItem(KEY);if(v)return v}catch(e){}return phone()?'M':'L'}
function setSize(v){try{localStorage.setItem(KEY,v)}catch(e){}}
const LBL={S:'קטן',M:'בינוני',L:'גדול'};
function control(){const s=size();return `<span class="v122sz" role="group" aria-label="גודל התצוגה"><small>גודל</small>${['S','M','L'].map(k=>`<button type="button" data-v122="size" data-k="${k}" aria-pressed="${s===k}">${LBL[k]}</button>`).join('')}<button type="button" class="v122big" data-v122="open">תצוגה גדולה</button></span>`}
function apply(root){if(!root)return;const s=size();root.classList.remove('v122-S','v122-M','v122-L');root.classList.add('v122-'+s);
 const bar=root.querySelector('.v66f,.v68f');if(bar&&!bar.querySelector('.v122sz'))bar.insertAdjacentHTML('beforeend',control());
 // template tiles are fixed 300x375 canvases: draw them at the resolution the size needs (before they are painted)
 if(root.id==='v66tp'){const w=s==='L'?640:s==='M'?440:300;root.querySelectorAll('canvas[data-v66c]').forEach(c=>{if(c._d)return;if(c.width!==w){c.width=w;c.height=Math.round(w*1.25)}})}}
const mo=new MutationObserver(()=>{['v66tp','v68sp'].forEach(id=>{const r=document.getElementById(id);if(r)apply(r)})});
mo.observe(document.body,{childList:true,subtree:true});
function rerender(root){if(root.id==='v66tp'){const q=root.querySelector('[data-v66q]');if(q)q.dispatchEvent(new Event('input',{bubbles:true}))}
 else{const c=root.querySelector('[data-v68cat][aria-pressed="true"]')||root.querySelector('[data-v68cat]');if(c)c.click()}}
// lightbox
function bigSrc(root){return root.querySelector('[data-v66big],[data-v68big]')}
function openBig(root){let lb=document.getElementById('v122big');if(!lb){lb=document.createElement('div');lb.id='v122big';lb.setAttribute('role','dialog');lb.setAttribute('aria-modal','true');lb.setAttribute('aria-label','תצוגה גדולה');document.body.appendChild(lb)}
 const isT=root.id==='v66tp';lb.dataset.for=root.id;
 lb.innerHTML=`<div class="v122top"><b></b><span class="sp"></span>${isT?`<button type="button" class="px-btn ghost" data-v122="prev" aria-label="התבנית הקודמת">‹ הקודמת</button><button type="button" class="px-btn ghost" data-v122="next" aria-label="התבנית הבאה">הבאה ›</button>`:''}<button type="button" class="px-btn save" data-v122="apply">${isT?'החל תבנית':'שמירה'}</button><button type="button" class="px-btn ghost" data-v122="close" aria-label="סגירה">סגירה</button></div><div class="v122cv"><canvas width="1080" height="1350"></canvas></div><p class="v122hint">${isT?'חיצים במקלדת עוברים בין תבניות. Enter מחיל, Esc סוגר':'Esc סוגר'}</p>`;
 sync();lb._t=setInterval(sync,350);document.body.classList.add('v122-open')}
function sync(){const lb=document.getElementById('v122big');if(!lb)return;const root=document.getElementById(lb.dataset.for);if(!root){closeBig();return}const src=bigSrc(root);const cv=lb.querySelector('canvas');if(src&&cv){try{cv.getContext('2d').drawImage(src,0,0,cv.width,cv.height)}catch(e){}}
 const t=lb.querySelector('.v122top b');if(t){const m=root.querySelector('.v66p .meta b,.v68p h3');t.textContent=m?m.textContent:''}}
function closeBig(){const lb=document.getElementById('v122big');if(!lb)return;clearInterval(lb._t);lb.remove();document.body.classList.remove('v122-open')}
function step(root,dir){const tiles=[...root.querySelectorAll('.v66c')];if(!tiles.length)return;let i=tiles.findIndex(t=>t.getAttribute('aria-pressed')==='true');i=Math.max(0,Math.min(tiles.length-1,i+dir));tiles[i].click();try{tiles[i].scrollIntoView({block:'nearest'})}catch(e){}}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-v122]');if(!b)return;const a=b.dataset.v122;const lb=document.getElementById('v122big');const root=b.closest('#v66tp,#v68sp')||(lb&&document.getElementById(lb.dataset.for));if(!root)return;e.preventDefault();e.stopPropagation();
 if(a==='size'){setSize(b.dataset.k);apply(root);root.querySelectorAll('[data-v122="size"]').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.k===b.dataset.k)));rerender(root);return}
 if(a==='open'){openBig(root);return}if(a==='close'){closeBig();return}
 if(a==='prev'){step(root,-1);return}if(a==='next'){step(root,1);return}
 if(a==='apply'){closeBig();const s=root.querySelector('[data-v66="save"],[data-v68="save"]');if(s)s.click();return}},true);
document.addEventListener('dblclick',e=>{const t=e.target.closest&&e.target.closest('#v66tp .v66c,#v68sp .v68c');if(!t)return;const root=t.closest('#v66tp,#v68sp');openBig(root)});
window.addEventListener('keydown',e=>{const lb=document.getElementById('v122big');if(!lb)return;const root=document.getElementById(lb.dataset.for);if(!root)return;
 if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closeBig()}else if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();e.stopPropagation();step(root,e.key==='ArrowLeft'?1:-1)}else if(e.key==='Enter'){e.preventDefault();e.stopPropagation();closeBig();const s=root.querySelector('[data-v66="save"],[data-v68="save"]');if(s)s.click()}},true);
window.__v122={size,apply,openBig,closeBig};
})();
