/*V200:START*/
// ================= V200 · competitor cards (כרטיסי המתחרים): a cleaner card, and every card can be folded to a
// one line summary with a button. The folded cards are remembered on this device. "הקטנת הכל" / "הרחבת הכל" above
// the grid. Pure decoration on top of the existing cards, so every module that adds sections keeps working.
(()=>{
if(window.__v200)return;window.__v200=1;
const KEY='v200_min';
const getMin=()=>{try{return new Set(JSON.parse(localStorage.getItem(KEY)||'[]'))}catch(e){return new Set()}};
const setMin=s=>{try{localStorage.setItem(KEY,JSON.stringify([...s]))}catch(e){}};
const CH='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
const cidOf=a=>{const b=a.querySelector('[data-cid]');return b?b.dataset.cid:''};
function paint(a,min){a.classList.toggle('v200-min',min);const b=a.querySelector('.v200min');if(b){b.setAttribute('aria-expanded',String(!min));b.setAttribute('aria-label',min?'הרחבת הכרטיס':'הקטנת הכרטיס');b.title=min?'הרחבה':'הקטנה'}}
function decorate(){const box=document.querySelector('.comps');if(!box)return;const min=getMin();
 // the bar above the grid: fold or open all
 if(!box.previousElementSibling||!box.previousElementSibling.classList.contains('v200bar')){
  const bar=document.createElement('div');bar.className='v200bar';bar.setAttribute('role','group');bar.setAttribute('aria-label','תצוגת הכרטיסים');
  bar.innerHTML='<button type="button" data-v200="all-min">הקטנת הכל</button><button type="button" data-v200="all-max">הרחבת הכל</button>';
  box.before(bar)}
 box.querySelectorAll('article.cc').forEach(a=>{const cid=cidOf(a);if(!cid)return;
  if(!a.dataset.v200){a.dataset.v200=cid;const ch=a.querySelector('.ch');if(ch&&!ch.querySelector('.v200min')){const b=document.createElement('button');b.type='button';b.className='v200min';b.dataset.v200='toggle';b.innerHTML=CH;ch.appendChild(b)}}
  paint(a,min.has(cid))})}
document.addEventListener('click',e=>{const b=e.target.closest('[data-v200]');if(!b)return;const a=b.dataset.v200;const min=getMin();
 if(a==='toggle'){const card=b.closest('article.cc');const cid=card&&card.dataset.v200;if(!cid)return;e.preventDefault();e.stopPropagation();if(min.has(cid))min.delete(cid);else min.add(cid);setMin(min);paint(card,min.has(cid));return}
 if(a==='all-min'||a==='all-max'){document.querySelectorAll('.comps article.cc').forEach(c=>{const cid=c.dataset.v200||cidOf(c);if(!cid)return;if(a==='all-min')min.add(cid);else min.delete(cid);paint(c,a==='all-min')});setMin(min)}},true);
let t=0;new MutationObserver(()=>{clearTimeout(t);t=setTimeout(()=>{try{decorate()}catch(e){}},60)}).observe(document.body,{childList:true,subtree:true});
window.__v200={decorate};
})();
/*V200:END*/
