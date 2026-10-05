// ================= V152 · gallery → posts with the agent, bulk upload, created date on every post
(function(){
const esc2=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const say=m=>{try{toast(m)}catch(e){console.log(m)}};
// ---------- 1. created date ----------
// ids from uid() start with Date.now() in base 36, so the creation time of every post made in the engine is known.
const T0=Date.UTC(2024,0,1),T1=()=>Date.now()+864e5;
function fromId(id){const m=String(id||'').match(/^[a-z]?([0-9a-z]{8})/);if(!m)return 0;const t=parseInt(m[1],36);return t>T0&&t<T1()?t:0}
function createdOf(p){if(!p)return 0;if(p.created){const t=Date.parse(p.created);if(t)return t}return fromId(p.id)}
const pad=n=>String(n).padStart(2,'0');
function fmtC(t){const d=new Date(t);return `${pad(d.getDate())}.${pad(d.getMonth()+1)}.${String(d.getFullYear()).slice(2)} · ${pad(d.getHours())}:${pad(d.getMinutes())}`}
function createdHtml(p){const t=createdOf(p);return t?`<span class="v152c" title="נוצר במערכת ${esc2(new Date(t).toLocaleString('he-IL'))}">נוצר ${fmtC(t)}</span>`:''}
window.__v152c=createdHtml;
// posts that appear after load get a stamp (ids that do not carry a time, like imported ones)
const KNOWN=new Set();let booted=false;
function stamp(){try{if(!booted){(AG.posts||[]).forEach(p=>KNOWN.add(p.id));booted=true;return}
  const now=new Date().toISOString();(AG.posts||[]).forEach(p=>{if(!p||KNOWN.has(p.id))return;KNOWN.add(p.id);if(!p.created)p.created=fromId(p.id)?new Date(fromId(p.id)).toISOString():now})}catch(e){}}
setTimeout(stamp,0);
const _save=saveAgent;saveAgent=function(){stamp();return _save.apply(this,arguments)};

// ---------- 2. photos → posts with the agent ----------
const G={busy:false,stop:false};
async function blobOf(k){const u=PHOTO_LIB[k];if(!u)return null;try{const r=await fetch(u,{mode:'cors'});if(!r.ok)return null;const b=await r.blob();if(!/^image\//.test(b.type))return null;try{const d=await downscale(b);return d.blob}catch(e){return b}}catch(e){return null}}
async function genFromPhotos(keys,n){const v=window.__v48;if(!v||!v.genFor){say('יצירת פוסטים לא זמינה כרגע. רעננו את הדף');return}
  if(G.busy){say('כבר יוצר פוסטים. חכו שזה יסתיים');return}
  G.busy=true;G.stop=false;const ib=v.IB,keepN=ib.n,T=v.TYPES,orig=T.slice();let made=0,done=0;const day=new Date().toISOString().slice(0,10);
  try{ib.n=n;
   for(const k of keys){if(G.stop)break;done++;bar(`יוצר פוסטים מתמונה ${done} מתוך ${keys.length}…`);
    // every photo starts from another post type, so a batch does not repeat itself
    const sh=(done-1)%T.length;T.splice(0,T.length,...orig.slice(sh),...orig.slice(0,sh));
    const name=(typeof LIB_NAMES!=='undefined'&&LIB_NAMES[k])||'תמונה מהגלריה';
    const it={id:'ib'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),kind:'image',name:String(name).slice(0,60),added:new Date().toISOString(),day,ctx:'',posts:[],status:'new',k,thumb:PHOTO_LIB[k],cloud:true,from:'gallery'};
    it._file=await blobOf(k);ib.items.unshift(it);
    try{made+=await v.genFor(it)||0}catch(e){console.error('v152 gen',e)}}
  }finally{T.splice(0,T.length,...orig);ib.n=keepN;G.busy=false;bar('')}
  stamp();try{saveAgent()}catch(e){}
  say(made?`נוצרו ${made} פוסטים מ־${done} תמונות. הם מחכים בגלריית הפוסטים, החדשים ראשונים. שום דבר לא פורסם`:'לא נוצרו פוסטים. נסו שוב');
  if(made){try{if(typeof GA!=='undefined'&&GA.f){GA.f.sort='new';GA.f.st='';GA.f.ser='';GA.f.q='';GA.f.proj='';GA.f.fam=''}}catch(e){}
    const S=window.__v148&&__v148.S;if(S){S.sel.clear();S.selMode=false}
    try{go('gallery')}catch(e){}}}
function bar(t){let el=document.getElementById('v152busy');if(!t){if(el)el.remove();return}
  if(!el){el=document.createElement('div');el.id='v152busy';el.className='v152busy';el.setAttribute('role','status');el.innerHTML='<span class="v152sp" aria-hidden="true"></span><b></b><button type="button" class="px-btn sm ghost" data-v152="stop">עצירה</button>';document.body.appendChild(el)}
  el.querySelector('b').textContent=t}
document.addEventListener('click',ev=>{const b=ev.target.closest&&ev.target.closest('[data-v152]');if(!b)return;const a=b.dataset.v152;
  if(a==='gen'){const S=window.__v148&&__v148.S;if(!S||!S.sel.size){say('סמנו קודם תמונות');return}
    const keys=[...S.sel].filter(k=>PHOTO_LIB[k]);const sel=document.querySelector('[data-v152="n"]');const n=Math.max(1,Math.min(6,+(sel&&sel.value)||2));
    if(keys.length*n>60&&!confirm(`ייווצרו כ־${keys.length*n} פוסטים מ־${keys.length} תמונות. זה ייקח כמה דקות. להמשיך?`))return;
    genFromPhotos(keys,n)}
  else if(a==='stop'){G.stop=true;bar('עוצר אחרי התמונה הנוכחית…')}});

// ---------- 3. many photos at once: drop anywhere on the gallery ----------
let dragN=0;const onPhotos=()=>typeof APP!=='undefined'&&APP.view==='photos';
const hasFiles=ev=>ev.dataTransfer&&[...(ev.dataTransfer.types||[])].includes('Files');
document.addEventListener('dragenter',ev=>{if(!onPhotos()||!hasFiles(ev))return;dragN++;document.body.classList.add('v152drag')});
document.addEventListener('dragleave',ev=>{if(!onPhotos())return;dragN=Math.max(0,dragN-1);if(!dragN)document.body.classList.remove('v152drag')});
document.addEventListener('dragover',ev=>{if(onPhotos()&&hasFiles(ev))ev.preventDefault()});
document.addEventListener('drop',ev=>{if(!onPhotos()||!hasFiles(ev))return;ev.preventDefault();dragN=0;document.body.classList.remove('v152drag');const v=window.__v148;if(v&&v.up)v.up(ev.dataTransfer.files)});
window.__v152={createdOf,fromId,genFromPhotos,G};
})();
