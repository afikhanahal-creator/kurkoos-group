/*V210:START*/
// ================= V210 · the editor always says whether the work is saved: a status next to the title ("כל השינויים נשמרו" or
// "יש שינויים שלא נשמרו", with the time of the device draft), and a warning before leaving the page with unsaved changes. =================
(()=>{
if(window.__v210)return;window.__v210=1;
const snap=p=>{try{return JSON.stringify(['layout','visual','fx','fb','ig','hook','photoKey','series'].map(k=>p&&p[k]))}catch(e){return ''}};
let last='',T=0;
function dirty(){try{return !!(PE.p&&PE.orig&&snap(PE.p)!==snap(PE.orig))}catch(e){return false}}
function tick(){const top=document.querySelector('.pe-top');if(!top||typeof PE==='undefined'||!PE.p)return;let b=top.querySelector('#v210st');if(!b){b=document.createElement('span');b.id='v210st';b.className='v210st';b.setAttribute('role','status');const ref=top.querySelector('[data-v206e="replaceAny"]')||top.querySelector('[data-pe-a="close"]');ref&&ref.nextSibling?top.insertBefore(b,ref.nextSibling):top.appendChild(b)}
  const d=dirty();const txt=d?'יש שינויים שלא נשמרו':'כל השינויים נשמרו';if(txt!==last){last=txt;b.textContent=txt;b.className='v210st '+(d?'dirty':'ok');b.title=d?'שמירה (Ctrl+S) מעדכנת את הפוסט. בינתיים טיוטה נשמרת במכשיר כל כמה שניות':'הפוסט שמור'}}
setInterval(tick,900);
// a click on the design moves the keyboard to the design: Delete, arrows and [ ] then act on the selected element, not on the text field
const onDesign=t=>{const cv=document.getElementById('pe-cv');return !!(cv&&t&&t.closest&&!t.closest('input,textarea,select,button')&&(t===cv||(cv.parentElement&&cv.parentElement.contains(t))))};
window.addEventListener('pointerdown',e=>{if(!onDesign(e.target))return;const a=document.activeElement;if(a&&/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)&&!a.closest('#v53edit,.v53edit'))a.blur()},true);
// clicking a text on the design shows its field in the panel (scrolled and marked) but leaves the keyboard on the design
window.addEventListener('pointerup',e=>{if(!onDesign(e.target))return;setTimeout(()=>{const a=document.activeElement;if(a&&/^(INPUT|TEXTAREA)$/.test(a.tagName)&&a.closest('.pe-body')&&!a.closest('#v53edit,.v53edit')){a.classList.add('v210hi');setTimeout(()=>a.classList.remove('v210hi'),1600);a.blur()}},80)},true);
window.addEventListener('beforeunload',e=>{if(dirty()){e.preventDefault();e.returnValue=''}});
window.__v210={dirty};
})();
/*V210:END*/
