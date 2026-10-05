// ================= V104 · photo variety: posts that repeat the same photo get a different one of the same kind from the whole
//                   library (the website photos included); a "גיוון תמונות" button in the gallery and the agent, undo in one tap,
//                   and one automatic pass per version so the feed stops looking like a catalog =================
(function(){
const FLAG='ag_v104_done_v1';
function keyOf(p){const s=p.fx&&p.fx.shot;return s&&s.k||null}
function setKey(p,k){if(p.fx&&p.fx.shot)p.fx.shot.k=k;if(p.fx&&Array.isArray(p.fx.shots)&&p.fx.shots[0])p.fx.shots[0].k=k;p.upd=new Date().toISOString()}
function diversify(opts={}){if(typeof AG==='undefined'||typeof pickShots!=='function'||typeof metaOf!=='function')return null;
 const posts=AG.posts.filter(p=>keyOf(p));const use={};posts.forEach(p=>{const k=keyOf(p);use[k]=(use[k]||0)+1});
 const keys=libKeys().filter(k=>{const m=metaOf(k);return m.k!=='brand'&&m.k!=='people'});
 const cap=Math.max(opts.cap||3,Math.ceil(posts.length/Math.max(1,keys.length)));
 const before=[];let changed=0;
 posts.forEach(p=>{const k=keyOf(p);if((use[k]||0)<=cap)return;const kind=metaOf(k).k||'site';
  const alt=pickShots([kind],8,{exclude:[k],project:p.project||''}).map(s=>s.k).filter(nk=>nk!==k);
  if(!alt.length)return;alt.sort((x,y)=>(use[x]||0)-(use[y]||0));const nk=alt[0];if((use[nk]||0)>=(use[k]||0)-1)return;before.push([p.id,k]);setKey(p,nk);use[k]--;use[nk]=(use[nk]||0)+1;changed++});
 if(changed){try{saveAgent()}catch(e){}try{renderAgent()}catch(e){}try{render()}catch(e){}}
 return {changed,before,cap,keys:keys.length}}
function undo(before){before.forEach(([id,k])=>{const p=AG.posts.find(x=>x.id===id);if(p)setKey(p,k)});try{saveAgent()}catch(e){}try{renderAgent()}catch(e){}try{render()}catch(e){}}
function run(manual){const r=diversify();if(!r)return;if(!r.changed){if(manual)toast('התמונות כבר מגוונות: אף תמונה לא חוזרת יותר מ-'+r.cap+' פעמים');return}
 toast(`${r.changed} פוסטים קיבלו תמונה אחרת מהספרייה (${r.keys} תמונות זמינות)`);
 try{if(window.__undoBar)__undoBar('התמונות הוחלפו ב-'+r.changed+' פוסטים',()=>undo(r.before))}catch(e){}}
window.__v104={diversify,undo,run};
// buttons: gallery head bar and the agent toolbar
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-v104="run"]');if(!b)return;e.preventDefault();run(true)});
const mo=new MutationObserver(()=>{const act=document.getElementById('vact');if(!act||typeof APP==='undefined')return;if(!['gallery','agent','ideas'].includes(APP.view))return;if(act.querySelector('[data-v104]'))return;
 const b=document.createElement('button');b.type='button';b.className='ibtn';b.dataset.v104='run';b.title='מחליף תמונות שחוזרות על עצמן בתמונות אחרות מהספרייה';b.innerHTML=(typeof ico==='function'?ico('shuffle',16):'')+' גיוון תמונות';act.appendChild(b)});
mo.observe(document.body,{childList:true,subtree:true});
// one automatic pass per version, after the library (uploads from the database) has loaded
setTimeout(()=>{try{if(localStorage.getItem(FLAG))return;const r=diversify({cap:3});localStorage.setItem(FLAG,'1');if(r&&r.changed){toast(`גיוון אוטומטי: ${r.changed} פוסטים קיבלו תמונה אחרת. אפשר לבטל בכפתור "גיוון תמונות" ← ביטול`);window.__v104last=r.before;try{if(window.__undoBar)__undoBar('התמונות הוחלפו ב-'+r.changed+' פוסטים',()=>undo(r.before))}catch(e){}}}catch(e){}},9000);
})();
