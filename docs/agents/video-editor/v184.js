// ================= V184 · replacing the picture of a post in one clear step: a large "העלאת תמונה והחלפה" button at the top of the
// image tab, a "החלפת תמונה" button on the picture itself, and dropping or pasting a picture onto the post. The new picture goes into
// the library (as before, through V115 uploadMany) and replaces the selected picture; "ביטול" brings the previous one back.
(()=>{
if(window.__v184)return;window.__v184=1;
const UP='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/></svg>';
const SWAP='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="m21 15-5-5-8 8"/></svg>';
let busy=false;
function info(){try{const sl=peSlots(PE.p);const i=Math.min(PE.slot||0,Math.max(0,sl.length-1));return {n:sl.length,i}}catch(e){return {n:0,i:0}}}
const isImg=f=>!!f&&(/^image\//.test(f.type||'')||/\.(png|jpe?g|webp|heic|heif|gif|avif)$/i.test(f.name||''));
function paintBusy(on){const c=document.querySelector('#pe-root .pe-canvas');if(c)c.classList.toggle('v184busy',!!on);
 document.querySelectorAll('#pe-root .v184btn,#pe-root .v184cv').forEach(l=>{l.classList.toggle('busy',!!on);const s=l.querySelector('.v184t');if(s&&l.dataset.t)s.textContent=on?'מעלה ומחליף…':l.dataset.t})}
async function replaceWith(file){if(!PE||!PE.p)return;if(busy){toast('ההחלפה הקודמת עדיין רצה');return}
 const s=info();if(!s.n){toast('בעיצוב הזה אין תמונה להחליף. אפשר לבחור תבנית עם תמונה');return}
 if(!isImg(file)){toast('אפשר להעלות רק תמונה');return}
 if(!window.__v115||!__v115.uploadMany){toast('ההעלאה לא זמינה כרגע');return}
 busy=true;paintBusy(true);try{await __v115.uploadMany([file])}catch(e){console.warn('v184',e);toast('ההחלפה לא הצליחה. נסו שוב')}finally{busy=false;paintBusy(false)}}
function hint(s){return s.n>1?`מחליף את תמונה ${s.i+1} מתוך ${s.n}. את התמונה בוחרים למטה`:'מהמחשב או מהטלפון. התמונה הקודמת נשמרת, ו"ביטול" מחזיר אותה'}
// the big button at the top of the image tab, and the button on the picture
function decorate(){const root=document.getElementById('pe-root');if(!root||!PE||!PE.p)return;const s=info();
 const pk=root.querySelector('.pe-body .v175pk');
 if(pk&&PE.tab==='image'){let b=pk.querySelector('.v184rep');if(!b){pk.insertAdjacentHTML('afterbegin',`<div class="v184rep"></div>`);b=pk.querySelector('.v184rep')}
  const html=s.n?`<label class="v184btn" data-t="העלאת תמונה והחלפה">${UP}<span><b class="v184t">${busy?'מעלה ומחליף…':'העלאת תמונה והחלפה'}</b><small>${hint(s)}</small></span><input type="file" accept="image/*" class="v184sr" data-v184file aria-label="העלאת תמונה מהמכשיר והחלפת התמונה בפוסט"></label>
   <p class="v184or">או בוחרים תמונה מהספרייה כאן למטה. אפשר גם לגרור תמונה אל הפוסט או להדביק אותה.</p>`:`<p class="v184none">בעיצוב הזה אין תמונה. כדי לשים תמונה בוחרים עיצוב עם תמונה.</p>`;
  if(b.dataset.k!==s.n+':'+s.i+':'+busy){b.innerHTML=html;b.dataset.k=s.n+':'+s.i+':'+busy}}
 const cv=root.querySelector('.pe-canvas');const can=cv&&cv.querySelector('canvas');
 let ov=cv&&cv.querySelector('.v184cv');
 if(cv&&can&&s.n){if(!ov){cv.insertAdjacentHTML('beforeend',`<label class="v184cv" data-t="החלפת תמונה">${SWAP}<span class="v184t">${busy?'מעלה ומחליף…':'החלפת תמונה'}</span><input type="file" accept="image/*" class="v184sr" data-v184file aria-label="החלפת התמונה בפוסט בתמונה מהמכשיר"></label>`);ov=cv.querySelector('.v184cv')}
  const a=cv.getBoundingClientRect(),c=can.getBoundingClientRect();if(c.width>0){ov.style.top=Math.round(c.top-a.top+12)+'px';ov.style.left=Math.round(c.left-a.left+12)+'px'}}
 else if(ov)ov.remove()}
try{peRender=(f=>function(){const r=f.apply(this,arguments);try{decorate()}catch(e){console.warn('v184',e)}return r})(peRender)}catch(e){console.error('v184 pe',e)}
addEventListener('resize',()=>{try{decorate()}catch(e){}});
let mo=0;try{new MutationObserver(()=>{if(mo)return;mo=requestAnimationFrame(()=>{mo=0;try{decorate()}catch(e){}})}).observe(document.body,{childList:true,subtree:true})}catch(e){}
document.addEventListener('change',e=>{const t=e.target;if(!t||!t.matches||!t.matches('input[data-v184file]'))return;e.stopPropagation();const f=t.files&&t.files[0];t.value='';if(f)replaceWith(f)},true);
// drop a picture onto the post, or paste one (when not typing)
const onCanvas=el=>el&&el.closest&&el.closest('#pe-root .pe-canvas');
document.addEventListener('dragover',e=>{const c=onCanvas(e.target);if(!c||!info().n)return;e.preventDefault();c.classList.add('v184over')});
document.addEventListener('dragleave',e=>{const c=onCanvas(e.target);if(c&&!c.contains(e.relatedTarget))c.classList.remove('v184over')});
document.addEventListener('drop',e=>{const c=onCanvas(e.target);if(!c)return;e.preventDefault();c.classList.remove('v184over');const f=[...((e.dataTransfer&&e.dataTransfer.files)||[])].find(isImg);if(f)replaceWith(f)});
document.addEventListener('paste',e=>{if(!document.getElementById('pe-root')||!PE||!PE.p)return;const t=e.target;if(t&&t.matches&&t.matches('input,textarea,[contenteditable],[contenteditable] *'))return;
 const f=[...((e.clipboardData&&e.clipboardData.files)||[])].find(isImg);if(!f)return;e.preventDefault();e.stopPropagation();replaceWith(f)},true);
window.__v184={replaceWith,decorate};
})();
