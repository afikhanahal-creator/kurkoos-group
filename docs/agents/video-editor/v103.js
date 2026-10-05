// ================= V103 · how to edit: a preset dropdown and the full effects catalog as chips, in a sheet that opens from every
//                   "ערוך כרילס" button (videos page, animation window, editor room). Mobile first: a bottom sheet, 44px targets =================
(function(){
const CAT=__CATALOG__;
const GROUPS=[['text','טקסט'],['graphics','גרפיקה'],['frame','מסך מלא'],['energy','אנרגיה'],['scene','סצנות (הדובר נעלם, המסך מדבר)'],['transition','מעברים על החיתוך'],['motion','תנועה']];
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const V=window.__vid;if(!V)return;
const ST={preset:(function(){try{return localStorage.getItem('vid_style')||'clean'}catch(e){return 'clean'}})(),effects:null,hook:'',cta:'',keywords:'',emojis:''};
function presetEffects(p){return (CAT.presets[p]||CAT.presets.clean).effects.slice()}
function sheetHtml(d){const p=ST.preset;const fx=new Set(ST.effects||presetEffects(p));
 return `<div class="v103bd" data-v103="bd"></div><div class="v103sh" role="dialog" aria-modal="true" aria-labelledby="v103t">
  <header><h3 id="v103t">איך לערוך את "${esc(d.name||'הסרטון')}"</h3><button type="button" class="px-ib" data-v103="close" aria-label="סגירה">✕</button></header>
  <div class="v103body">
   <label class="v103l">סגנון עריכה<select data-v103="preset">${Object.entries(CAT.presets).map(([k,v])=>`<option value="${k}" ${p===k?'selected':''}>${esc(v.he)}</option>`).join('')}</select></label>
   <p class="v103note">הפריסט בוחר אפקטים. אפשר להוסיף או להוריד כל אפקט למטה. כל אפקט נוחת על המילה שלו בתמלול; טקסטים רק מהתמלול או ממה שתכתבו כאן.</p>
   <div class="v103grid"><label>הוק פתיחה (עד 7 מילים)<input type="text" data-v103="hook" value="${esc(ST.hook)}" placeholder="למשל: שלושה דברים שכל מי שבונה בית חייב לדעת"></label>
    <label>קריאה לפעולה בסוף<input type="text" data-v103="cta" value="${esc(ST.cta)}" placeholder="למשל: עקבו לעוד טיפים"></label>
    <label>מילות מפתח (מופרדות בפסיק)<input type="text" data-v103="keywords" value="${esc(ST.keywords)}" placeholder="תקציב, מפקח, סבלנות"></label>
    <label>אימוג'י על מילה (מילה=אימוג'י, מופרד בפסיק)<input type="text" data-v103="emojis" value="${esc(ST.emojis)}" placeholder="שקל=💰, סבלנות=🧘"></label></div>
   ${GROUPS.map(([g,gl])=>`<div class="v103g"><b>${gl}</b><div class="v103chips">${CAT.effects.filter(e=>e.group===g).map(e=>`<button type="button" class="v103chip" data-v103="fx" data-id="${e.id}" aria-pressed="${fx.has(e.id)}" title="${esc(e.desc)}">${esc(e.he)}</button>`).join('')}</div></div>`).join('')}
  </div>
  <footer><button type="button" class="px-btn pri" data-v103="go">שלח לעורך</button><button type="button" class="px-btn ghost" data-v103="reset">חזרה לברירת המחדל של הסגנון</button></footer></div>`}
let pending=null;
function open(d,onGo){pending={d,onGo};let r=document.getElementById('v103');if(!r){r=document.createElement('div');r.id='v103';document.body.appendChild(r)}r.innerHTML=sheetHtml(d);document.body.classList.add('v103-on')}
function close(){const r=document.getElementById('v103');if(r)r.remove();document.body.classList.remove('v103-on');pending=null}
function readForm(){const r=document.getElementById('v103');if(!r)return null;const g=k=>(r.querySelector(`[data-v103="${k}"]`)||{}).value||'';
 const fx=[...r.querySelectorAll('[data-v103="fx"][aria-pressed="true"]')].map(b=>b.dataset.id);
 const em={};g('emojis').split(',').map(s=>s.trim()).filter(Boolean).forEach(s=>{const i=s.indexOf('=');if(i>0)em[s.slice(0,i).trim()]=s.slice(i+1).trim()});
 return {preset:g('preset'),effects:fx,hook:g('hook').trim(),cta:g('cta').trim(),keywords:g('keywords').split(',').map(s=>s.trim()).filter(Boolean),emojis:em}}
document.addEventListener('click',async e=>{const b=e.target.closest&&e.target.closest('[data-v103]');if(!b)return;const a=b.dataset.v103;
 if(a==='close'||a==='bd'){close();return}
 if(a==='fx'){b.setAttribute('aria-pressed',b.getAttribute('aria-pressed')!=='true');ST.effects=readForm().effects;return}
 if(a==='reset'){ST.effects=null;const r=document.getElementById('v103');const f=readForm();ST.preset=f.preset;ST.hook=f.hook;ST.cta=f.cta;r.innerHTML=sheetHtml(pending.d);return}
 if(a==='go'){const f=readForm();if(!f||!pending)return;Object.assign(ST,{preset:f.preset,effects:f.effects,hook:f.hook,cta:f.cta,keywords:f.keywords.join(', '),emojis:Object.entries(f.emojis).map(([k,v])=>k+'='+v).join(', ')});try{localStorage.setItem('vid_style',f.preset)}catch(x){}
  const d=Object.assign({},pending.d,{style:f.preset,preset:f.preset,effects:f.effects,hook:f.hook,cta:f.cta,keywords:f.keywords,emojis:f.emojis});const go=pending.onGo;close();b.disabled=true;try{await go(d)}finally{}}});
document.addEventListener('change',e=>{const t=e.target;if(!t.dataset||t.dataset.v103!=='preset')return;ST.preset=t.value;ST.effects=null;const r=document.getElementById('v103');if(r&&pending){const f=readForm();ST.hook=f.hook;ST.cta=f.cta;ST.keywords=f.keywords.join(', ');r.innerHTML=sheetHtml(pending.d)}});
// every reel button goes through the sheet
V.openOptions=open;
const origEdit=V.editVideo;
V.editVideo=async function(d){if(d&&d.__direct)return origEdit(d);return new Promise(res=>open(d,async dd=>{try{if(V.VD.db&&dd.id){await V.VD.db.collection('videos').doc(dd.id).update({style:dd.preset,preset:dd.preset,effects:dd.effects,hook:dd.hook,cta:dd.cta,keywords:dd.keywords,emojis:dd.emojis,status:'queued'})}}catch(x){}res(await origEdit(Object.assign({__direct:1},dd)))}))};
// the payload the routine receives carries the choices
const origFire=V.VD;
window.__v103={open,ST,CAT};
})();
