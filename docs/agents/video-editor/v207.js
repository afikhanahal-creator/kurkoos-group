/*V207:START*/
// ================= V207 · the posts gallery as a creative workspace: large previews, a clear status on every card (draft, approved,
// scheduled, published, needs review), search, filters (status, platform, project, series, category, content type, date),
// sorting, bulk selection, quick actions that are visible on touch too (preview, edit, more: duplicate, download, schedule or
// publish, approve, delete), lazy thumbnails, and an empty state with a way forward. The previous gallery stays one tap away. =================
(()=>{
if(window.__v207)return;window.__v207=1;
const E=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $=s=>document.querySelector(s);const say=m=>{try{toast(m)}catch(e){}};
const LS=(k,d)=>{try{return JSON.parse(localStorage.getItem(k)||'null')??d}catch(e){return d}};const SS=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
const G={f:Object.assign({q:'',st:'',plat:'',proj:'',ser:'',cat:'',type:'',date:'',sort:'new'},LS('v207_f',{})),sel:new Set(),lim:48,old:LS('v207_old',false),menu:null,flash:null};
const ST={draft:['טיוטה','#5b6f7b','○'],review:['דורש בדיקה','#9a5b00','!'],approved:['מאושר','#1e7a4e','✓'],scheduled:['מתוזמן','#105572','◷'],published:['פורסם','#07293a','●']};
const PLAT={fb:'פייסבוק',ig:'אינסטגרם',tt:'טיקטוק',yt:'יוטיוב',li:'לינקדאין'};
const TYPES={post:'פוסט',carousel:'קרוסלה',reel:'כריכת רילס',story:'סטורי',ad:'מודעה'};
const CATS=()=>{try{return Object.fromEntries(PX_MIX.map(x=>[x[0],x[1]]))}catch(e){return {}}};
const PH=()=>{try{return PROJ_HE}catch(e){return {}}};
const fmtD=t=>t?new Date(t).toLocaleDateString('he-IL',{day:'numeric',month:'short'}):'';
const fmtDT=t=>t?new Date(t).toLocaleString('he-IL',{day:'numeric',month:'numeric',hour:'2-digit',minute:'2-digit'}):'';
// ---------- one row of facts per post ----------
function stageOf(p){let s='draft';try{s=pxStageFrom(p)}catch(e){}if(s==='draft'){try{const w=PRO.wf[pxKey(p)];if(w&&w.stage==='approved')s='approved'}catch(e){}}if(s==='draft'&&(p.flag==='review'))s='review';return s}
function metaOf(p){let it=null;try{it=itemOf(p)}catch(e){}const nets=it&&it.nets?Object.keys(it.nets).filter(k=>it.nets[k]):[];const pk=p.pk||{};let plat=nets.length?nets:pk.plat?Object.keys(pk.plat).map(k=>({instagram:'ig',facebook:'fb',tiktok:'tt',linkedin:'li'})[k]||k).filter(k=>PLAT[k]):pk.platform?[({instagram:'ig',facebook:'fb',tiktok:'tt',linkedin:'li'})[pk.platform]||pk.platform]:[];if(!plat.length){if(p.ig)plat.push('ig');if(p.fb)plat.push('fb')}
  const type=pk.format==='reel'?'reel':pk.format==='story'||p.fmt916?'story':pk.format==='ad'?'ad':((p.visual&&p.visual.slides&&p.visual.slides.length>1)?'carousel':'post');
  let cat='edu';try{cat=pxCat(p)}catch(e){}let created=0;try{created=window.__v152?__v152.createdOf(p):0}catch(e){}const upd=Date.parse(p.upd||'')||created;
  let head='';try{head=pxHead(p)}catch(e){head=(p.visual&&p.visual.headline)||p.hook||''}
  return {st:stageOf(p),it,at:it&&it.at?Date.parse(it.at):0,plat:[...new Set(plat)],type,cat,created,upd,head:String(head).replace(/\*/g,'').trim()||'פוסט בלי כותרת',proj:p.project||pk.project||'',ser:p.series||''}}
function base(){return (AG.posts||[]).filter(p=>p&&/^(ed|x)_/.test(p.layout||'')&&!p.brand)}
function list(){const f=G.f;const q=f.q.trim().toLowerCase().split(/\s+/).filter(Boolean);const now=Date.now();const D=86400000;
  const rows=base().map(p=>({p,m:metaOf(p)}));const facets={st:{},plat:{},proj:{},ser:{},cat:{},type:{}};
  const pass=(r,skip)=>{const m=r.m;if(skip!=='st'&&f.st&&m.st!==f.st)return false;if(skip!=='plat'&&f.plat&&!m.plat.includes(f.plat))return false;if(skip!=='proj'&&f.proj&&m.proj!==f.proj)return false;if(skip!=='ser'&&f.ser&&m.ser!==f.ser)return false;if(skip!=='cat'&&f.cat&&m.cat!==f.cat)return false;if(skip!=='type'&&f.type&&m.type!==f.type)return false;
    if(f.date){const t=m.upd||m.created;if(f.date==='week'&&!(t>now-7*D))return false;if(f.date==='month'&&!(t>now-30*D))return false;if(f.date==='planned'&&!(m.at>now))return false}
    if(q.length){const hay=(m.head+' '+(r.p.fb||'')+' '+(r.p.ig||'')+' '+m.ser+' '+(PH()[m.proj]||m.proj)).toLowerCase();if(!q.every(w=>hay.includes(w)))return false}return true};
  rows.forEach(r=>{['st','plat','proj','ser','cat','type'].forEach(k=>{if(!pass(r,k))return;const v=r.m[k];(Array.isArray(v)?v:[v]).forEach(x=>{if(x)facets[k][x]=(facets[k][x]||0)+1})})});
  const out=rows.filter(r=>pass(r));const S={new:(a,b)=>(b.m.created||0)-(a.m.created||0),upd:(a,b)=>(b.m.upd||0)-(a.m.upd||0),plan:(a,b)=>(a.m.at||9e15)-(b.m.at||9e15),az:(a,b)=>a.m.head.localeCompare(b.m.head,'he')};out.sort(S[f.sort]||S.new);return {out,facets,total:rows.length}}
// ---------- the page ----------
function chip(st,at){const s=ST[st]||ST.draft;return `<span class="v207st st-${st}"><i aria-hidden="true">${s[2]}</i>${s[0]}${st==='scheduled'&&at?' · '+fmtDT(at):''}</span>`}
function sel(k,label,opts,all){return `<label class="v207fl"><span>${label}</span><select data-v207f="${k}"><option value="">${all}</option>${opts.map(([v,l,n])=>`<option value="${E(v)}"${G.f[k]===v?' selected':''}>${E(l)}${n!=null?' ('+n+')':''}</option>`).join('')}</select></label>`}
function card(r){const p=r.p,m=r.m,on=G.sel.has(p.id);return `<article class="v207c${on?' on':''}${G.flash===p.id?' flash':''}" data-id="${p.id}">
  <button type="button" class="v207pv" data-v207="open" data-id="${p.id}" aria-label="תצוגה מקדימה: ${E(m.head)}"><canvas data-ktp="${p.id}" width="432" height="540" aria-hidden="true"></canvas></button>
  <label class="v207ck"><input type="checkbox" data-v207="ck" data-id="${p.id}"${on?' checked':''} aria-label="בחירת ${E(m.head)}"></label>
  <div class="v207in"><div class="v207top">${chip(m.st,m.at)}<span class="v207pl">${m.plat.map(k=>`<abbr title="${PLAT[k]||k}">${PLAT[k]||k}</abbr>`).join(' · ')||'בלי פלטפורמה'}</span></div><h3>${E(m.head)}</h3>
   <p class="v207mt">${E(TYPES[m.type]||'פוסט')}${CATS()[m.cat]?' · '+E(CATS()[m.cat]):''}${m.proj?' · '+E(PH()[m.proj]||m.proj):''}${m.upd?' · עודכן '+fmtD(m.upd):''}</p>
   <div class="v207ac"><button type="button" class="v207b pri" data-v207="edit" data-id="${p.id}">עריכה</button><button type="button" class="v207b" data-v207="open" data-id="${p.id}">תצוגה</button><button type="button" class="v207b ib" data-v207="menu" data-id="${p.id}" aria-haspopup="menu" aria-expanded="${G.menu===p.id}" aria-label="עוד פעולות ל${E(m.head)}">⋯</button>
   ${G.menu===p.id?`<div class="v207menu" role="menu"><button type="button" role="menuitem" data-v207="sched" data-id="${p.id}">${m.st==='scheduled'?'שינוי מועד או פרסום':'תזמון או פרסום'}</button><button type="button" role="menuitem" data-v207="dup" data-id="${p.id}">שכפול</button><button type="button" role="menuitem" data-v207="dl" data-id="${p.id}">הורדה (PNG)</button>${m.st!=='approved'&&m.st!=='published'&&m.st!=='scheduled'?`<button type="button" role="menuitem" data-v207="ok" data-id="${p.id}">סימון כמאושר</button>`:''}<button type="button" role="menuitem" class="dz" data-v207="del" data-id="${p.id}">מחיקה</button></div>`:''}</div></div></article>`}
function page(){const {out,facets,total}=list();const f=G.f;const F=facets;const P=PH(),C=CATS();
  const stTabs=[['','הכל',out.length+0],...Object.keys(ST).map(k=>[k,ST[k][0],F.st[k]||0])];const active=['plat','proj','ser','cat','type','date'].filter(k=>f[k]).length;
  if(!total)return `<div class="v207"><div class="v207empty"><h2>עוד אין פוסטים</h2><p>מתחילים מתבנית, מהסוכן או מהעלאת תמונות. כל פוסט שנוצר מופיע כאן עם התצוגה שלו והסטטוס.</p><div class="v207row"><button type="button" class="v207b pri" data-v207="go" data-v="templates">פוסט חדש מתבנית</button><button type="button" class="v207b" data-v207="go" data-v="agent">יצירה עם הסוכן</button></div></div></div>`;
  return `<div class="v207"><div class="v207bar"><label class="v207q"><span class="v207sr">חיפוש בפוסטים</span><input type="search" data-v207f="q" value="${E(f.q)}" placeholder="חיפוש לפי כותרת, טקסט, סדרה או פרויקט"></label>
   <label class="v207fl"><span>מיון</span><select data-v207f="sort">${[['new','החדשים קודם'],['upd','עודכנו לאחרונה'],['plan','לפי מועד פרסום'],['az','לפי כותרת']].map(([v,l])=>`<option value="${v}"${f.sort===v?' selected':''}>${l}</option>`).join('')}</select></label>
   <button type="button" class="v207b" data-v207="flt" aria-expanded="${!!G.fopen}">סינון${active?' ('+active+')':''}</button><button type="button" class="v207b ghost" data-v207="old">התצוגה הקודמת</button></div>
   <div class="v207tabs" role="tablist" aria-label="סטטוס">${stTabs.map(([k,l,n])=>`<button type="button" role="tab" aria-selected="${f.st===k}" data-v207="st" data-k="${k}">${k?`<i class="dot st-${k}" aria-hidden="true"></i>`:''}${l}<small>${k?n:''}</small></button>`).join('')}</div>
   ${G.fopen?`<div class="v207flt">${sel('plat','פלטפורמה',Object.keys(F.plat).map(k=>[k,PLAT[k]||k,F.plat[k]]),'כל הפלטפורמות')}${sel('type','סוג תוכן',Object.keys(F.type).map(k=>[k,TYPES[k]||k,F.type[k]]),'כל הסוגים')}${sel('cat','קטגוריה',Object.keys(F.cat).map(k=>[k,C[k]||k,F.cat[k]]),'כל הקטגוריות')}${sel('proj','פרויקט',Object.keys(F.proj).sort().map(k=>[k,P[k]||k,F.proj[k]]),'כל הפרויקטים')}${sel('ser','סדרה או קמפיין',Object.keys(F.ser).sort((a,b)=>a.localeCompare(b,'he')).slice(0,80).map(k=>[k,k,F.ser[k]]),'כל הסדרות')}${sel('date','תאריך',[['week','עודכנו השבוע'],['month','עודכנו החודש'],['planned','מתוכננים לעתיד']],'כל התאריכים')}${active?'<button type="button" class="v207b" data-v207="clear">ניקוי הסינון</button>':''}</div>`:''}
   <p class="v207cnt" role="status">${out.length===total?total+' פוסטים':out.length+' מתוך '+total+' פוסטים'}</p>
   ${out.length?`<div class="v207grid">${out.slice(0,G.lim).map(card).join('')}</div>${out.length>G.lim?`<button type="button" class="v207more" data-v207="more">עוד ${Math.min(48,out.length-G.lim)} פוסטים (נשארו ${out.length-G.lim})</button>`:''}`:`<div class="v207empty sm"><h2>אין פוסטים שמתאימים</h2><p>נסו מילה אחרת או נקו את הסינון.</p><button type="button" class="v207b" data-v207="clear">ניקוי הסינון והחיפוש</button></div>`}
   ${G.sel.size?`<div class="v207sel" role="region" aria-label="פעולות לנבחרים"><b>${G.sel.size} נבחרו</b><button type="button" class="v207b pri" data-v207="bsched">תזמון במשבצות הפנויות</button><button type="button" class="v207b" data-v207="bok">סימון כמאושרים</button><button type="button" class="v207b" data-v207="bdup">שכפול</button><button type="button" class="v207b" data-v207="bdl">הורדה</button><button type="button" class="v207b dz" data-v207="bdel">מחיקה</button><button type="button" class="v207b ghost" data-v207="ball">בחירת כל ${Math.min(out.length,500)} המוצגים</button><button type="button" class="v207b ghost" data-v207="bnone">ביטול הבחירה</button></div>`:''}</div>`}
// ---------- drawing ----------
let IO=null;
function kpaint(cv){const p=(AG.posts||[]).find(x=>x.id===cv.dataset.ktp);if(!p)return;Promise.resolve(ensureImgs(p)).catch(()=>{}).then(()=>{try{thumb(cv,p,0)}catch(e){}})}
function paintThumbs(){if(IO)IO.disconnect();IO=new IntersectionObserver(es=>es.forEach(e=>{if(!e.isIntersecting)return;IO.unobserve(e.target);try{kpaint(e.target)}catch(x){}}),{rootMargin:'600px'});document.querySelectorAll('.v207 canvas[data-ktp]').forEach(c=>IO.observe(c))}
function draw(keepFocus){const root=$('#appviews');if(!root||APP.view!=='gallery'||G.old)return;const fa=document.activeElement;const fk=fa&&fa.dataset?(fa.dataset.v207f||fa.dataset.v207)+'|'+(fa.dataset.id||fa.dataset.k||''):null;const sy=window.scrollY;
  root.innerHTML=page();paintThumbs();if(keepFocus&&fk){const [a,b]=fk.split('|');const el=root.querySelector(`[data-v207f="${a}"]`)||root.querySelector(`[data-v207="${a}"]${b?`[data-id="${b}"],[data-v207="${a}"][data-k="${b}"]`:''}`);if(el){el.focus();if(el.setSelectionRange&&el.type==='search')el.setSelectionRange(el.value.length,el.value.length)}}window.scrollTo(0,sy)}
function save(){SS('v207_f',G.f)}
// ---------- actions ----------
const byId=id=>(AG.posts||[]).find(p=>p.id===id);
async function dl(p){try{await ensureImgs(p)}catch(e){}const c=document.createElement('canvas');c.width=1080;c.height=1350;drawSlide(c,p,0);const n=((metaOf(p).head||'post').replace(/[^֐-׿A-Za-z0-9]+/g,'-').slice(0,40)||'post')+'.png';return saveCanvas(c,n)}
function approve(p){try{const w=pxWf(p);w.stage='approved';pxSaveWf(p)}catch(e){}if(p.key)try{setPostStatus(p.key,'approved')}catch(e){}if(p.flag==='review')delete p.flag}
function dup(p){const q=clonePost(p);q.upd=new Date().toISOString();delete q.flag;AG.posts.unshift(q);return q}
async function act(a,id,b){const p=id?byId(id):null;G.menu=a==='menu'&&G.menu!==id?id:null;
  switch(a){case 'menu':return draw(true);case 'open':if(p){try{gaOpen(id)}catch(e){peOpen(p)}}return;case 'edit':if(p)peOpen(p);return;
   case 'go':APP.view=b.dataset.v;return render();case 'old':G.old=true;SS('v207_old',true);return render();case 'flt':G.fopen=!G.fopen;return draw(true);
   case 'st':G.f.st=b.dataset.k;G.lim=48;save();return draw(true);case 'clear':Object.assign(G.f,{q:'',st:'',plat:'',proj:'',ser:'',cat:'',type:'',date:''});save();return draw();case 'more':G.lim+=48;return draw(true);
   case 'sched':if(p){if(window.__v157&&__v157.open)return __v157.open(p);if(typeof openComposer==='function')return openComposer({p,sched:true})}return;
   case 'dup':if(p){const q=dup(p);saveAgent();G.flash=q.id;G.f.sort='new';say('נוצר עותק. הוא ראשון ברשימה, ו"עריכה" פותחת אותו');draw();setTimeout(()=>{G.flash=null},2500)}return;
   case 'dl':if(p)await dl(p);return;case 'ok':if(p){approve(p);saveAgent();say('סומן כמאושר');draw()}return;
   case 'del':if(p&&confirm('למחוק את הפוסט? אפשר לבטל מההודעה שתופיע.')){v36Delete([id]);G.sel.delete(id);draw()}return;
   case 'bsched':{const ids=[...G.sel];let n=0;try{n=gaSchedule(ids)}catch(e){}say(n?`${n} פוסטים תוזמנו במשבצות הפנויות הקרובות`:'לא נמצאו משבצות פנויות. אפשר לתזמן פוסט אחד ידנית מהתפריט ⋯');G.sel.clear();return draw()}
   case 'bok':[...G.sel].map(byId).filter(Boolean).forEach(approve);saveAgent();say(G.sel.size+' סומנו כמאושרים');G.sel.clear();return draw();
   case 'bdup':{const ps=[...G.sel].map(byId).filter(Boolean);ps.forEach(dup);saveAgent();say(ps.length+' עותקים נוצרו');G.sel.clear();G.f.sort='new';return draw()}
   case 'bdl':{const ps=[...G.sel].map(byId).filter(Boolean).slice(0,20);for(const q of ps){await dl(q)}if(G.sel.size>20)say('הורדו 20 הראשונים');return}
   case 'bdel':{const ids=[...G.sel];if(!confirm(`למחוק ${ids.length} פוסטים? אפשר לבטל מההודעה שתופיע.`))return;v36Delete(ids);G.sel.clear();return draw()}
   case 'ball':list().out.slice(0,500).forEach(r=>G.sel.add(r.p.id));return draw(true);case 'bnone':G.sel.clear();return draw()}}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('.v207 [data-v207]');if(!b){if(G.menu&&!(e.target.closest&&e.target.closest('.v207menu'))&&$('.v207')){G.menu=null;draw()}return}const a=b.dataset.v207;if(a==='ck')return;e.preventDefault();e.stopPropagation();act(a,b.dataset.id,b)},true);
document.addEventListener('change',e=>{const t=e.target;if(!t.closest||!t.closest('.v207'))return;if(t.dataset.v207==='ck'){t.checked?G.sel.add(t.dataset.id):G.sel.delete(t.dataset.id);return draw(true)}const k=t.dataset.v207f;if(k&&k!=='q'){G.f[k]=t.value;G.lim=48;save();draw(true)}},true);
let qT=0;document.addEventListener('input',e=>{const t=e.target;if(t.dataset&&t.dataset.v207f==='q'&&t.closest('.v207')){G.f.q=t.value;clearTimeout(qT);qT=setTimeout(()=>{G.lim=48;save();draw(true)},200)}},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&G.menu&&$('.v207')){G.menu=null;draw();const b=$(`.v207 [data-v207="menu"]`);b&&b.focus()}});
// ---------- the view ----------
try{render=(f=>function(){const bk=document.getElementById('v207back');if(typeof APP==='undefined'||APP.view!=='gallery'||G.old){if(bk&&!(APP.view==='gallery'&&G.old))bk.remove();const r=f.apply(this,arguments);if(APP.view==='gallery'&&G.old&&!document.getElementById('v207back')){const w=document.querySelector('.wrap')||document.body;const d=document.createElement('div');d.id='v207back';d.className='v207back';d.innerHTML='<span>זו התצוגה הקודמת של הפוסטים.</span><button type="button" class="v207b pri" data-v207n="1">חזרה לגלריה החדשה</button>';d.querySelector('button').onclick=()=>{G.old=false;SS('v207_old',false);d.remove();render()};w.insertBefore(d,w.firstChild)}return r}
  if(bk)bk.remove();
  renderNav();const [t,s]=VTITLE.gallery||['פוסטים',''];const vt=$('#vt'),vs=$('#vs');if(vt)vt.textContent=t;if(vs)vs.textContent='כל הפוסטים במקום אחד: תצוגה, עריכה, תזמון וסטטוס';document.querySelectorAll('.wrap > section').forEach(sec=>sec.classList.add('view-hidden'));const va=$('#vact');if(va)va.innerHTML='';draw();try{window.__v99&&__v99.ensureNav()}catch(e){}})(render)}catch(e){console.warn('v207',e)}
// a change made in the editor shows up when it closes
if(typeof peClose==='function')peClose=(f=>function(){const r=f.apply(this,arguments);if(APP.view==='gallery'&&!G.old)setTimeout(()=>draw(),60);return r})(peClose);
window.__v207={G,list,metaOf,stageOf,draw,act};
})();
/*V207:END*/
