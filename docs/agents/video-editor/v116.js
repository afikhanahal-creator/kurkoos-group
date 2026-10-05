// ================= V116 · "when did we already use this photo": every library tile in the editor shows the date of the
//                   scheduled or published post that uses it (earliest date, plus how many more), with the full list in
//                   the tooltip, and a switch to hide photos that are already on the calendar =================
(function(){
const DONE=new Set(['sent','published','done','posted']);
function fmt(iso){const d=new Date(iso);if(isNaN(d))return '';const now=new Date();return d.getDate()+'.'+(d.getMonth()+1)+(d.getFullYear()!==now.getFullYear()?'.'+String(d.getFullYear()).slice(2):'')}
function uses(){const m={};try{(APP.sched.items||[]).filter(i=>i&&i.at).forEach(it=>{const p=itemPost(it);if(!p)return;let ks=[];try{ks=imgKeysOf(p)}catch(e){}if(p.photoKey&&!ks.includes(p.photoKey))ks.push(p.photoKey);const rec={at:it.at,done:DONE.has(it.status),title:String((p.visual&&p.visual.headline)||p.hook||'').replace(/\n/g,' ').slice(0,40)};
  [...new Set(ks)].forEach(k=>{(m[k]=m[k]||[]).push(rec)})})}catch(e){}Object.values(m).forEach(l=>l.sort((a,b)=>new Date(a.at)-new Date(b.at)));return m}
function decorate(root){if(!root)return;const m=uses();root.querySelectorAll('.v115t[data-k]').forEach(t=>{const k=t.dataset.k;const l=m[k];let d=t.querySelector('.v116d');if(!l||!l.length){if(d)d.remove();t.classList.remove('v116used');return}
 const first=l[0];const label=(first.done?'פורסם ':'מתוזמן ')+fmt(first.at)+(l.length>1?' +'+(l.length-1):'');const tip=l.map(x=>(x.done?'פורסם ':'מתוזמן ')+fmt(x.at)+(x.title?' · '+x.title:'')).join('\n');
 if(!d){d=document.createElement('em');d.className='v116d';t.appendChild(d)}d.textContent=label;d.title=tip;d.classList.toggle('done',!!first.done);t.classList.add('v116used');t.title=(t.getAttribute('title')||'').split('\n')[0]+'\n'+tip});
 // the switch, once per filter bar
 root.querySelectorAll('.v115bar').forEach(bar=>{if(bar.querySelector('[data-v116]'))return;const n=Object.keys(m).length;const b=document.createElement('button');b.type='button';b.className='v116sw';b.dataset.v116='unused';b.setAttribute('aria-pressed',document.body.classList.contains('v116-unused'));b.innerHTML=`<span></span> להסתיר תמונות שכבר בלוח <small>${n}</small>`;bar.appendChild(b)})}
function all(){decorate(document.getElementById('pe-root'));decorate(document.getElementById('v115lib'))}
if(typeof peRender==='function')peRender=(f=>function(){const r=f.apply(this,arguments);try{if(PE.tab==='image')setTimeout(all,0)}catch(e){}return r})(peRender);
const mo=new MutationObserver(ms=>{let hit=false;ms.forEach(x=>{if(x.target&&(x.target.id==='v115lib'||x.target.closest&&x.target.closest('#v115lib')))hit=true});if(hit){clearTimeout(mo._t);mo._t=setTimeout(()=>decorate(document.getElementById('v115lib')),30)}});
mo.observe(document.body,{childList:true,subtree:true});
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-v116="unused"]');if(!b)return;e.preventDefault();e.stopPropagation();const on=!document.body.classList.contains('v116-unused');document.body.classList.toggle('v116-unused',on);try{localStorage.setItem('v116_unused',on?'1':'')}catch(x){}document.querySelectorAll('[data-v116="unused"]').forEach(x=>x.setAttribute('aria-pressed',on))},true);
try{if(localStorage.getItem('v116_unused'))document.body.classList.add('v116-unused')}catch(e){}
window.__v116={uses,decorate};
})();
