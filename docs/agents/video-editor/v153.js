// ================= V153 · feed simulator header and column choice
(function(){
const ls=(k,d)=>{try{const v=localStorage.getItem(k);return v==null?d:v}catch(e){return d}};
window.__v153c=()=>+ls('v153cols','3')===4?4:3;
window.__v153h=function(list,warn){const n=list.length;const first=n?list[0].it.at:'',last=n?list[n-1].it.at:'';const c=__v153c();
 return `<header class="v153h"><div class="v153av" aria-hidden="true"><svg viewBox="0 0 40 40" width="40" height="40"><rect x="11" y="13" width="3" height="17" fill="#fff"/><rect x="16" y="6" width="4.5" height="24" fill="#fff"/><rect x="22.5" y="10" width="3.5" height="20" fill="#fff"/><rect x="28" y="18" width="2.5" height="12" fill="#fff"/></svg></div>
 <div class="v153id"><b>קבוצת קורקוס</b><span>כך ייראה הפרופיל ב־30 הימים הקרובים. החדש ביותר למעלה, כמו באינסטגרם</span></div>
 <dl class="v153st"><div><dd>${n}</dd><dt>מתוזמנים</dt></div>${n?`<div><dd>${esc(fmtD(first))}</dd><dt>הראשון</dt></div><div><dd>${esc(fmtD(last))}</dd><dt>האחרון</dt></div>`:''}<div class="${warn?'bad':''}"><dd>${warn}</dd><dt>הערות קצב</dt></div></dl>
 <div class="v153cols" role="group" aria-label="מספר עמודות"><button type="button" data-v153="3" aria-pressed="${c===3}">3 עמודות</button><button type="button" data-v153="4" aria-pressed="${c===4}">4 עמודות</button></div></header>`};
document.addEventListener('click',ev=>{const b=ev.target.closest&&ev.target.closest('[data-v153]');if(!b)return;try{localStorage.setItem('v153cols',b.dataset.v153)}catch(e){}
 const v=document.querySelector('.px-feedv.v153');if(v){v.classList.remove('c3','c4');v.classList.add('c'+b.dataset.v153)}document.querySelectorAll('[data-v153]').forEach(x=>x.setAttribute('aria-pressed',x===b))});
})();
