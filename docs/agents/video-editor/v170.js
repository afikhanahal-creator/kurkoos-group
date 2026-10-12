// ================= V170 · find anything in seconds: a calm side menu in three groups (work, materials, advanced tools folded away),
//                   "פוסטים" as the one place for every post (search, quick views with counts, a filter sheet, removable filter pills,
//                   date groups), and "תמונות" that says at a glance what is new, what is used and where (quick views, "חדש" marks,
//                   a sheet per photo with the posts that use it) =================
(function(){
const H=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const lsG=(k,d)=>{try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}};
const lsS=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
const DAY=864e5;
const IC={
 filter:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4"/></svg>',
 search:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
 x:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
 cal:'<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/></svg>',
 chev:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>',
 up:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 16V4M6 10l6-6 6 6M4 20h16"/></svg>',
 img:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="m21 16-5-5-9 9"/></svg>',
 grid:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5"/></svg>'};
const PJ=()=>{try{return PROJ_HE}catch(e){return {}}};
const PJ_ORDER=['henrietta','hankin','yordei','bengurion','general'];
const projLabel=k=>k==='general'||!k?'כללי':(PJ()[k]||k);
function startOfToday(){const d=new Date();d.setHours(0,0,0,0);return d.getTime()}

// ============ 1. side menu: three groups, advanced tools folded ============
const G_WORK=['today','gallery','calendar'],G_MAT=['photos','templates','articles','videos'];
const ADV_ORDER=['queue','ideas','feed','create','agent','dupes','cloner','veditor','competitors','analyze','times','settings','fonts'];
const GN={work:'עבודה',mat:'חומרים',adv:'כלים מתקדמים'};
function regroup(){try{const all=[];VIEWS.forEach(g=>g[1].forEach(v=>{if(!all.some(x=>x[0]===v[0]))all.push(v)}));
  all.forEach(v=>{if(v[0]==='gallery')v[1]='פוסטים';if(v[0]==='photos')v[1]='תמונות'});
  const pick=ids=>ids.map(id=>all.find(v=>v[0]===id)).filter(Boolean);
  const used=new Set([...G_WORK,...G_MAT]);
  const adv=all.filter(v=>!used.has(v[0])).sort((a,b)=>{const ia=ADV_ORDER.indexOf(a[0]),ib=ADV_ORDER.indexOf(b[0]);return (ia<0?99:ia)-(ib<0?99:ib)});
  const next=[[GN.work,pick(G_WORK)],[GN.mat,pick(G_MAT)],[GN.adv,adv]];
  if(VIEWS.length===3&&VIEWS.every((g,i)=>g[0]===next[i][0]&&g[1].length===next[i][1].length&&g[1].every((v,j)=>v===next[i][1][j])))return;
  VIEWS.splice(0,VIEWS.length,...next)}catch(e){console.warn('v170 nav',e)}}
function advOpen(){if(lsG('v170_adv',false))return true;try{return VIEWS[2][1].some(v=>v[0]===APP.view)}catch(e){return false}}
try{VTITLE.gallery=['פוסטים','כל הפוסטים במקום אחד: מחפשים, מסננים, פותחים ומתזמנים'];VTITLE.photos=['תמונות','מה חדש, מה בשימוש, ואיפה כל תמונה מופיעה']}catch(e){}
renderNav=(f=>function(){regroup();const r=f.apply(this,arguments);try{
  const c=counts();const nav=document.getElementById('sidenav');if(!nav)return r;const open=advOpen();
  const btn=([k,l,i])=>`<button class="nav" type="button" data-view="${k}" ${APP.view===k?'aria-current="page"':''}>${ico(i)}<span>${l}</span>${c[k]!=null?`<span class="cnt">${c[k]}</span>`:''}</button>`;
  nav.innerHTML=VIEWS.map(([g,items],gi)=>gi<2?`<div class="grp">${g}</div>`+items.map(btn).join('')
   :`<button type="button" class="v170adv" data-v170nav="adv" aria-expanded="${open}" aria-controls="v170advl"><span>${g}</span><i class="v170advn">${items.length}</i>${IC.chev}</button><div id="v170advl" class="v170advl"${open?'':' hidden'}>${items.map(btn).join('')}</div>`).join('')}catch(e){console.warn('v170 nav',e)}return r})(renderNav);
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-v170nav="adv"]');if(!b)return;e.preventDefault();const open=b.getAttribute('aria-expanded')!=='true';lsS('v170_adv',open);b.setAttribute('aria-expanded',open);const l=document.getElementById('v170advl');if(l)l.hidden=!open;advDot()});
function advDot(){try{const b=document.querySelector('[data-v170nav="adv"]');const l=document.getElementById('v170advl');if(!b||!l)return;const n=l.querySelectorAll('.dg-badge').length;b.classList.toggle('v170alert',!!n&&l.hidden)}catch(e){}}

// phone bottom bar: היום, תמונות, לוח, פוסטים
const NAVMAP={queue:['photos','תמונות',IC.img],gallery:['gallery','פוסטים',IC.grid]};
function patchBottom(){const n=document.getElementById('v99nav');if(!n)return;n.querySelectorAll('button[data-v99nav]').forEach(b=>{const k=b.dataset.v99nav;const m=NAVMAP[k];if(!m||b.dataset.v170)return;b.dataset.v170='1';b.dataset.v99nav=m[0];const ic=b.querySelector('.ic');if(ic)ic.innerHTML=m[2];const sp=b.querySelectorAll('span');if(sp[1])sp[1].textContent=m[1]});
 const cur=(typeof APP!=='undefined'&&APP.view)||'';n.querySelectorAll('button[data-v99nav]').forEach(b=>{if(b.dataset.v99nav===cur)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')})}
let bt=0;new MutationObserver(()=>{if(bt)return;bt=requestAnimationFrame(()=>{bt=0;try{patchBottom()}catch(e){}})}).observe(document.body,{childList:true,subtree:false});
setTimeout(()=>{const n=document.getElementById('v99nav');if(n)new MutationObserver(()=>{try{patchBottom()}catch(e){}}).observe(n,{childList:true})},0);

// ============ 2. posts ============
const QV=[['all','הכל'],['week','חדשים השבוע'],['ads','מודעות פרויקטים'],['ready','מוכנים לתזמון'],['sched','מתוזמנים'],['check','דורשים בדיקה']];
const SORTS=[['new','חדשים קודם'],['plan','מועד פרסום'],['score','ציון'],['series','סדרה']];
const FAMN={ads:'מודעות פרויקטים',tools:'כלי עבודה',social:'רשתות',mag:'מגזין',bold:'נועז',studio:'סטודיו',sig:'חתימה',world:'עולם',ed:'עריכה',tpl:'מתבניות',other:'אחר'};
const IMGN={ill:'איור',render:'הדמיה',photo:'צילום שטח',none:'בלי תמונה'};
const WHENN=[['today','היום'],['7','7 ימים'],['30','30 ימים'],['','הכל']];
const F0={qv:'all',proj:[],ser:[],fam:[],dom:[],img:[],when:'',sort:'new',q:''};
const F=Object.assign({},F0,lsG('v170_f',{}));['proj','ser','fam','dom','img'].forEach(k=>{if(!Array.isArray(F[k]))F[k]=[]});
let FIRST=(()=>{try{return localStorage.getItem('v170_f')==null}catch(e){return true}})();
const saveF=()=>lsS('v170_f',F);
const ST_OF={all:'all',week:'all',ads:'all',ready:'ready',sched:'sched',check:'fix'};
function famOf(p){const l=p.layout||'';
 if(/^x_[pqr]_/.test(l)||(/^x_t_/.test(l)&&/^מודעה/.test((typeof ED_NAMES!=='undefined'&&ED_NAMES[l])||'')))return 'ads';
 if(/^x_n_/.test(l))return 'tools';if(/^x_v_/.test(l))return 'social';if(/^x_mag_/.test(l))return 'mag';if(/^x_b_/.test(l))return 'bold';if(/^x_c_/.test(l))return 'studio';if(/^x_s_/.test(l))return 'sig';if(/^x_w_/.test(l))return 'world';if(/^ed_/.test(l))return 'ed';if(/^x_t_/.test(l))return 'tpl';return 'other'}
const MC=new WeakMap();
function metaP(x){const p=x.p;const st=(p.upd||'')+'|'+p.layout+'|'+(p.photoKey||'')+'|'+(p.series||'');let m=MC.get(p);if(m&&m.st===st)return m;
 let img='none';try{const ks=imgKeysOf(p);const k=(p.fx&&p.fx.shot&&p.fx.shot.k)||ks[0];if(k){const mm=metaOf(k)||{};img=(mm.k==='drawing'||/^illustration/.test(mm.t||''))?'ill':isRenderKey(k)?'render':'photo'}}catch(e){}
 let c=0;try{c=window.__v152?__v152.createdOf(p):0}catch(e){}
 const ser=String(p.series||'');
 m={st,fam:famOf(p),img,c,ser,ads:/^מודעות פרויקטים/.test(ser),dom:String(p.domain||p.cat||(p.article&&p.article.dom)||'')};
 m.hay=[ser,p.fb,p.ig,(typeof ED_NAMES!=='undefined'&&ED_NAMES[p.layout])||'',FAMN[m.fam],m.dom].join(' ');
 MC.set(p,m);return m}
const projKey=x=>x.proj||'general';
let BASE=null,FAST=false,SELBAR=null,LOWN='';
function base(orig){const now=Date.now();let sl=0;try{sl=APP.sched.items.length}catch(e){}const key=AG.posts.length+'|'+sl;
 if(BASE&&BASE.key===key&&(now-BASE.t<(FAST?60000:1500)))return BASE.l;
 const keep=Object.assign({},GA.f);let l;try{Object.assign(GA.f,{st:'all',ser:'',fam:'',proj:'',q:'',sort:'new'});l=orig()}finally{Object.assign(GA.f,keep)}
 l.forEach(x=>{x.m=metaP(x);x.pk=projKey(x)});BASE={key,t:now,l};return l}
function headOf(p){try{return pxHead(p)}catch(e){return ''}}
function qMatch(x,q){if(!q)return true;const h=(headOf(x.p)+' '+x.m.hay+' '+projLabel(x.pk)).toLowerCase();return q.toLowerCase().split(/\s+/).filter(Boolean).every(w=>h.includes(w))}
function whenOk(c,w){if(!w)return true;if(!c)return false;if(w==='today')return c>=startOfToday();return c>=Date.now()-(+w)*DAY}
const isReady=x=>!x.it&&x.q.v!=='block'&&x.w!=='published';
const isCheck=x=>x.w==='review'||(!x.it&&x.q.v!=='ok');
function qvOk(x,qv){if(qv==='week')return x.m.c>=Date.now()-7*DAY;if(qv==='ads')return x.m.ads||x.m.fam==='ads';if(qv==='ready')return isReady(x);if(qv==='sched')return !!x.it;if(qv==='check')return isCheck(x);return true}
// facet filter: everything except the facet named in skip
function facets(l,skip){return l.filter(x=>(skip==='proj'||!F.proj.length||F.proj.includes(x.pk))&&(skip==='ser'||!F.ser.length||F.ser.includes(x.m.ser))&&(skip==='fam'||!F.fam.length||F.fam.includes(x.m.fam))&&(skip==='dom'||!F.dom.length||F.dom.includes(x.m.dom))&&(skip==='img'||!F.img.length||F.img.includes(x.m.img))&&(skip==='when'||whenOk(x.m.c,F.when))&&(skip==='q'||qMatch(x,F.q)))}
const IDX=new Map();function idxOf(p){return IDX.get(p)}
function sortL(l){IDX.clear();AG.posts.forEach((p,i)=>IDX.set(p,i));const byNew=(a,b)=>(b.m.c-a.m.c)||(idxOf(a.p)-idxOf(b.p));
 const S={new:byNew,plan:(a,b)=>String(a.it?a.it.at:'9').localeCompare(String(b.it?b.it.at:'9'))||byNew(a,b),score:(a,b)=>(b.q.avg-a.q.avg)||byNew(a,b),series:(a,b)=>a.m.ser.localeCompare(b.m.ser,'he')||byNew(a,b)};
 return l.sort(S[F.sort]||byNew)}
function mirror(){GA.f.st=ST_OF[F.qv]||'all';GA.f._v170=GA.f.st;try{gaSaveF()}catch(e){}}
// someone else asked the gallery for a view (the "new posts" button on Today, posts made from photos): adopt it
function adopt(){const st=GA.f.st;if(FIRST){FIRST=false;saveF();return}if(GA.f._v170===st)return;const m={ready:'ready',sched:'sched',fix:'check',all:'all'}[st];
 if(st===''||st==='all'||!m){Object.assign(F,{qv:'all',proj:[],ser:[],fam:[],dom:[],img:[],when:'',q:''});if(GA.f.sort==='new')F.sort='new'}else F.qv=m;
 if(GA.f.proj){F.proj=[GA.f.proj]}if(GA.f.ser){F.ser=[GA.f.ser]}if(GA.f.q){F.q=GA.f.q}GA.f.proj='';GA.f.ser='';GA.f.q='';GA.f.fam='';saveF();mirror()}
let LAST=null;
gaList=(f=>function(){const orig=()=>f.apply(this,arguments);const b=base(orig);const l=sortL(facets(b,'').filter(x=>qvOk(x,F.qv)));LAST=l;return l})(gaList);

// cards: the post, one muted line (project tag and series), the planned date when it has one
gaCard=(f=>function(x){let h=f.apply(this,arguments);try{const m=x.m||metaP(x);const pk=x.pk||projKey(x);const head=headOf(x.p);
  h=h.replace('aria-label="פתח במסך גדול"',`aria-label="${H('פתיחה במסך גדול: '+head.slice(0,80))}"`);
  const line=`<div class="v170meta">${pk!=='general'?`<span class="v170tag">${H(projLabel(pk))}</span>`:''}<span class="v170ser">${H(m.ser||FAMN[m.fam])}</span></div>`;
  h=h.replace(/<\/figure>\s*$/,line+'</figure>')}catch(e){}return h})(gaCard);

function bucket(c,t0){if(!c)return 3;if(c>=t0)return 0;const n=Date.now();if(c>=n-7*DAY)return 1;if(c>=n-30*DAY)return 2;return 3}
const BUCK=['היום','השבוע','החודש','קודם'];
function pills(){const P=[];F.proj.forEach(k=>P.push(['proj',k,projLabel(k)]));F.ser.forEach(k=>P.push(['ser',k,k||'בלי סדרה']));F.fam.forEach(k=>P.push(['fam',k,FAMN[k]||k]));F.dom.forEach(k=>P.push(['dom',k,k]));F.img.forEach(k=>P.push(['img',k,IMGN[k]||k]));if(F.when)P.push(['when',F.when,'נוצרו: '+WHENN.find(w=>w[0]===F.when)[1]]);if(F.q)P.push(['q',F.q,'"'+F.q+'"']);return P}
const nActive=()=>F.proj.length+F.ser.length+F.fam.length+F.dom.length+F.img.length+(F.when?1:0);
vGallery=(f=>function(){adopt();mirror();
 let selbar=null;if(FAST&&SELBAR!=null){gaList();selbar=SELBAR?{outerHTML:SELBAR}:null}else{const keepLim=GA.lim;let orig='';try{GA.lim=0;orig=f.apply(this,arguments)}finally{GA.lim=keepLim}
 const t=document.createElement('template');t.innerHTML=orig;selbar=t.content.querySelector('.ga-selbar');SELBAR=selbar?selbar.outerHTML:''}
 const b=BASE?BASE.l:[];const pre=facets(b,'');const l=LAST||[];const n=l.length;
 const cnt={};QV.forEach(([k])=>cnt[k]=k==='all'?pre.length:pre.filter(x=>qvOk(x,k)).length);
 // project chips: counts inside the current quick view and the other filters
 const pAll=facets(b,'proj');const pc={},pe={};pAll.forEach(x=>{pe[x.pk]=1;if(qvOk(x,F.qv))pc[x.pk]=(pc[x.pk]||0)+1});
 const pkeys=Object.keys(pe).sort((a,b2)=>{const ia=PJ_ORDER.indexOf(a),ib=PJ_ORDER.indexOf(b2);if(ia>=0||ib>=0)return (ia<0?99:ia)-(ib<0?99:ib);return pc[b2]-pc[a]});
 F.proj.forEach(k=>{if(!pkeys.includes(k))pkeys.push(k)});
 const show=l.slice(0,GA.lim);let grid='';
 if(F.sort==='new'&&n){const t0=startOfToday();const bc=[0,0,0,0];l.forEach(x=>bc[bucket(x.m.c,t0)]++);let cur=-1;
  show.forEach(x=>{const bk=bucket(x.m.c,t0);if(bk!==cur){cur=bk;grid+=`<h3 class="v170gh"><span>${BUCK[bk]}</span><i>${bc[bk]}</i></h3>`}grid+=gaCard(x)})}
 else grid=show.map(gaCard).join('');
 const P=pills();const na=nActive();
 const empty=`<div class="v170empty"><b>אין פוסטים שמתאימים לסינון.</b><span>${P.length?'אפשר להסיר מסנן אחד או לנקות הכל.':'נסו תצוגה אחרת למעלה.'}</span>${P.length?'<button type="button" class="v170btn" data-v170="clear">ניקוי כל המסננים</button>':''}</div>`;
 return `<div class="ga v170" data-qv="${F.qv}">
 <div class="v170bar"><label class="v170q">${IC.search}<input type="search" data-v170q value="${H(F.q)}" placeholder="חיפוש פוסט, פרויקט או סדרה" aria-label="חיפוש פוסטים" autocomplete="off"></label>
  <button type="button" class="v170fbtn${na?' on':''}" data-v170="panel" aria-haspopup="dialog" aria-expanded="false">${IC.filter}<span>סינון</span>${na?`<b>${na}</b>`:''}</button>
  <label class="v170sel"><span class="v170sr">מיון</span><select data-v170s aria-label="מיון">${SORTS.map(([k,t2])=>`<option value="${k}"${F.sort===k?' selected':''}>${t2}</option>`).join('')}</select></label></div>
 <div class="v170qv" role="tablist" aria-label="תצוגות מהירות">${QV.map(([k,t2])=>`<button type="button" role="tab" data-v170="qv" data-k="${k}" aria-selected="${F.qv===k}">${t2}<i>${cnt[k]}</i></button>`).join('')}</div>
 ${pkeys.length>1||F.proj.length?`<div class="v170pj" role="group" aria-label="פרויקט">${pkeys.map(k=>`<button type="button" data-v170="pj" data-k="${H(k)}" aria-pressed="${F.proj.includes(k)}"${pc[k]?'':' class="v170z"'}>${H(projLabel(k))}<i>${pc[k]||0}</i></button>`).join('')}</div>`:''}
 <div class="v170res"><b class="v170cnt" aria-live="polite">${n.toLocaleString('he-IL')} פוסטים</b>${P.map(([g,k,lab])=>`<button type="button" class="v170pill" data-v170="rm" data-g="${g}" data-k="${H(k)}" aria-label="${H('הסרת המסנן '+lab)}">${H(lab)}${IC.x}</button>`).join('')}${P.length>1?'<button type="button" class="v170link" data-v170="clear">נקה הכל</button>':''}</div>
 <div id="v170note" class="v170note" hidden></div>
 <div class="ga-grid sz-${GA.f.size||'m'}">${grid||empty}</div>
 ${n>GA.lim?`<div class="ga-more"><button type="button" class="px-btn" data-ga="more">הצג עוד ${Math.min(60,n-GA.lim)} מתוך ${n-GA.lim}</button></div>`:''}
 ${selbar?selbar.outerHTML:''}</div>`})(vGallery);

// ---- quick repaint for filter taps: same data, no full page render ----
function fastPaint(){if(APP.view!=='gallery'||!BASE){render();return}const box=document.getElementById('appviews');if(!box){render();return}
 const keep=box.querySelector('.v63bar');let h;FAST=true;try{h=vGallery()}catch(e){FAST=false;console.warn('v170 fast',e);render();return}finally{FAST=false}
 box.innerHTML=h;if(keep)box.insertAdjacentElement('afterbegin',keep);try{paint(box)}catch(e){}note();const top=hdrBottom();box.querySelectorAll('.v170bar').forEach(b=>b.style.setProperty('--v170top',top+'px'))}
// ---- filter sheet ----
const PS={open:false,serQ:'',serAll:false};
function facetCounts(skip,fn){const c=new Map();facets(BASE?BASE.l:[],skip).filter(x=>qvOk(x,F.qv)).forEach(x=>{const k=fn(x);c.set(k,(c.get(k)||0)+1)});return c}
function chipRow(g,items,c,multi=true){return `<div class="v170chips" role="group">${items.map(([k,t2])=>{const on=g==='when'?F.when===k:F[g].includes(k);const n=c?c.get(k)||0:null;return `<button type="button" data-v170="fx" data-g="${g}" data-k="${H(k)}" aria-pressed="${on}"${n===0&&!on?' class="v170z"':''}>${H(t2)}${n!=null?`<i>${n}</i>`:''}</button>`}).join('')}</div>`}
function sheetHtml(){const b=BASE?BASE.l:[];
 const cp=facetCounts('proj',x=>x.pk);const projs=[...new Set([...PJ_ORDER,...Object.keys(PJ()),...cp.keys()])].filter(k=>cp.get(k)||F.proj.includes(k)).map(k=>[k,projLabel(k)]);
 const cs=facetCounts('ser',x=>x.m.ser);const newest=new Map();b.forEach(x=>{const s=x.m.ser;if(!s)return;newest.set(s,Math.max(newest.get(s)||0,x.m.c||0))});
 let sers=[...cs.keys()].filter(s=>s).sort((a,b2)=>(newest.get(b2)||0)-(newest.get(a)||0)||(cs.get(b2)-cs.get(a)));F.ser.forEach(s=>{if(!sers.includes(s))sers.unshift(s)});
 const sq=PS.serQ.trim();if(sq)sers=sers.filter(s=>s.includes(sq));const total=sers.length;const shown=PS.serAll||sq?sers.slice(0,300):sers.slice(0,10);
 const cf=facetCounts('fam',x=>x.m.fam);const fams=Object.keys(FAMN).filter(k=>cf.get(k)||F.fam.includes(k)).map(k=>[k,FAMN[k]]);
 const cd=facetCounts('dom',x=>x.m.dom);const doms=[...cd.keys()].filter(Boolean).sort((a,b2)=>cd.get(b2)-cd.get(a)).map(k=>[k,k]);
 const ci=facetCounts('img',x=>x.m.img);const imgs=Object.keys(IMGN).map(k=>[k,IMGN[k]]);
 const n=(LAST||[]).length;
 return `<div class="v170sh-back" data-v170="close"></div><div class="v170sh" role="dialog" aria-modal="true" aria-labelledby="v170sht">
 <header><h2 id="v170sht" tabindex="-1">סינון פוסטים</h2><button type="button" class="v170x" data-v170="close" aria-label="סגירה">${IC.x}</button></header>
 <div class="v170shb">
  <section><h3>פרויקט</h3>${chipRow('proj',projs,cp)}</section>
  <section><h3>סבב / סדרה <small>החדשים למעלה</small></h3><label class="v170q v170q-s">${IC.search}<input type="search" data-v170serq value="${H(PS.serQ)}" placeholder="חיפוש סדרה" aria-label="חיפוש סדרה"></label>
   <div class="v170list">${shown.map(s=>`<label class="v170chk"><input type="checkbox" data-v170="ser" value="${H(s)}"${F.ser.includes(s)?' checked':''}><span>${H(s)}</span><i>${cs.get(s)||0}</i></label>`).join('')||'<p class="v170none">אין סדרה בשם הזה</p>'}</div>
   ${!PS.serAll&&!sq&&total>10?`<button type="button" class="v170link" data-v170="serall">הצגת כל ${total} הסדרות</button>`:''}</section>
  <section><h3>משפחת תבנית</h3>${chipRow('fam',fams,cf)}</section>
  ${doms.length?`<section><h3>נושא / תחום</h3>${chipRow('dom',doms,cd)}</section>`:''}
  <section><h3>סוג תמונה</h3>${chipRow('img',imgs,ci)}</section>
  <section><h3>תאריך יצירה</h3>${chipRow('when',WHENN,null)}</section>
  <section><h3>גודל תצוגה</h3><div class="v170chips" role="group">${[['s','קטן'],['m','בינוני'],['l','גדול']].map(([k,t2])=>`<button type="button" data-v170="size" data-k="${k}" aria-pressed="${(GA.f.size||'m')===k}">${t2}</button>`).join('')}</div></section>
 </div>
 <footer><button type="button" class="v170btn ghost" data-v170="clearp">ניקוי</button><button type="button" class="v170btn pri" data-v170="close">הצגת ${n.toLocaleString('he-IL')} פוסטים</button></footer></div>`}
let lastFocus=null;
function sheetPaint(){let r=document.getElementById('v170sheet');if(!PS.open){if(r){r.remove();document.body.classList.remove('v170sh-on');try{lastFocus&&lastFocus.focus()}catch(e){}}return}
 const fresh=!r;if(!r){r=document.createElement('div');r.id='v170sheet';document.body.appendChild(r);document.body.classList.add('v170sh-on')}
 const bd=r.querySelector('.v170shb');const st=bd?bd.scrollTop:0;const a=document.activeElement;const aq=a&&a.dataset&&('v170serq' in a.dataset);const pos=aq?a.selectionStart:0;
 r.innerHTML=sheetHtml();const nb=r.querySelector('.v170shb');if(nb)nb.scrollTop=st;
 if(aq){const i=r.querySelector('[data-v170serq]');if(i){i.focus();try{i.setSelectionRange(pos,pos)}catch(e){}}}else if(fresh){const x=r.querySelector('#v170sht');x&&x.focus({preventScroll:true})}}
let rt=0;function rerender(now){clearTimeout(rt);const go2=()=>{if(APP.view==='gallery'){GA.lim=60;fastPaint()}if(PS.open)sheetPaint()};if(now)go2();else rt=setTimeout(go2,120)}
function setF(g,k){if(g==='when'){F.when=F.when===k?'':k}else{const a=F[g];const i=a.indexOf(k);if(i>=0)a.splice(i,1);else a.push(k)}saveF()}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-v170]');if(!b)return;const a=b.dataset.v170;if(b.tagName==='INPUT')return;
 if(a==='qv'){F.qv=b.dataset.k;saveF();mirror();GA.lim=60;fastPaint();const m=document.getElementById('appmain');try{const g=document.querySelector('.v170');if(g&&g.getBoundingClientRect().top<0)g.scrollIntoView({block:'start'})}catch(x){}}
 else if(a==='pj'){setF('proj',b.dataset.k);rerender(true)}
 else if(a==='rm'){const g=b.dataset.g,k=b.dataset.k;if(g==='q')F.q='';else if(g==='when')F.when='';else F[g]=F[g].filter(v=>v!==k);saveF();rerender(true);setTimeout(()=>{const nx=document.querySelector('.v170pill')||document.querySelector('[data-v170q]');nx&&nx.focus()},0)}
 else if(a==='clear'){Object.assign(F,{proj:[],ser:[],fam:[],dom:[],img:[],when:'',q:''});saveF();rerender(true)}
 else if(a==='clearp'){Object.assign(F,{proj:[],ser:[],fam:[],dom:[],img:[],when:''});saveF();rerender(true)}
 else if(a==='panel'){lastFocus=b;PS.open=true;PS.serQ='';PS.serAll=false;sheetPaint()}
 else if(a==='close'){PS.open=false;sheetPaint()}
 else if(a==='fx'){setF(b.dataset.g,b.dataset.k);rerender(true)}
 else if(a==='serall'){PS.serAll=true;sheetPaint()}
 else if(a==='size'){GA.f.size=b.dataset.k;try{gaSaveF()}catch(x){}rerender(true)}
 else if(a==='notex'){lsS('v170_notex',Date.now());const n=document.getElementById('v170note');if(n)n.hidden=true}});
document.addEventListener('change',e=>{const t=e.target;if(!t.matches)return;
 if(t.matches('[data-v170s]')){e.stopPropagation();F.sort=t.value;saveF();GA.lim=60;fastPaint();setTimeout(()=>{const s=document.querySelector('[data-v170s]');s&&s.focus()},0)}
 else if(t.matches('input[data-v170="ser"]')){setF('ser',t.value);rerender(true)}},true);
let qt=0;document.addEventListener('input',e=>{const t=e.target;if(!t.matches)return;
 if(t.matches('[data-v170q]')){clearTimeout(qt);qt=setTimeout(()=>{F.q=t.value.trim();saveF();const pos=t.selectionStart;GA.lim=60;fastPaint();const n=document.querySelector('[data-v170q]');if(n){n.focus();try{n.setSelectionRange(pos,pos)}catch(x){}}},220)}
 else if(t.matches('[data-v170serq]')){PS.serQ=t.value;sheetPaint()}},true);
window.addEventListener('keydown',e=>{if(!PS.open)return;if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();PS.open=false;sheetPaint();return}
 if(e.key==='Tab'){const r=document.querySelector('#v170sheet .v170sh');if(!r)return;const f=[...r.querySelectorAll('button,input,select,[tabindex="0"]')].filter(x=>!x.disabled&&x.offsetParent);if(!f.length)return;const first=f[0],last=f[f.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}},true);

// ---- the notices become one slim line under the filters ----
function note(){const el=document.getElementById('v170note');if(!el)return;const x=lsG('v170_notex',0);if(x&&Date.now()-x<3*DAY){el.hidden=true;return}
 const parts=[];try{const v=document.querySelector('#appviews .v63bar b');const m=v&&v.textContent.match(/\d[\d,]*/);if(v)LOWN=m?m[0]:'';if(LOWN)parts.push(`<span>${LOWN} פוסטים עם ציון נמוך</span><button type="button" class="v170link" data-v63="batch">שיפור כולם</button>`)}catch(e){}
 try{const pn=window.__v110&&__v110.pendingImages();if(pn&&!(__v110.ST&&__v110.ST.busy))parts.push(`<span>${pn} תמונות מהאתר עוד לא בספרייה</span><button type="button" class="v170link" data-v110="run">ייבוא</button>`)}catch(e){}
 if(!parts.length){el.hidden=true;return}el.innerHTML=`<span class="v170nd" aria-hidden="true"></span>${parts.join('<i class="v170dot" aria-hidden="true"></i>')}<button type="button" class="v170nx" data-v170="notex" aria-label="הסתרת ההודעה">${IC.x}</button>`;el.hidden=false}

// ---- sticky tools under the page header ----
function hdrBottom(){let el=document.elementFromPoint(Math.round(innerWidth/2),12),b=0;while(el&&el!==document.body){const cs=getComputedStyle(el);if(cs.position==='sticky'||cs.position==='fixed'){b=Math.max(b,el.getBoundingClientRect().bottom)}el=el.parentElement}return Math.max(0,Math.round(b))}

// ============ 3. photos ============
const PV=[['new','חדשות'],['ill','איורים'],['render','הדמיות'],['field','שטח ורחפן'],['up','העלאות שלי'],['unused','לא בשימוש'],['heavy','בשימוש רב'],['all','הכל']];
const PSORT=[['new','חדשות קודם'],['use','הכי בשימוש'],['name','לפי שם']];
const KINDN={site:'צילום שטח',aerial:'רחפן',render:'הדמיה',interior:'פנים',finish:'גמר',drawing:'שרטוט',env:'סביבה',people:'אנשים',brand:'מותג',atmo:'אווירה',exterior:'חוץ',detail:'פרט',ad:'מודעה'};
const PF=Object.assign({v:'new',proj:'',sort:'new',q:''},lsG('v170_pf',{}));const saveP=()=>lsS('v170_pf',PF);
const NEWD=14;
const atOf=it=>{const t=Date.parse(it.at||'');return isNaN(t)?0:t};
const isNewP=it=>{const t=atOf(it);return t&&t>=Date.now()-NEWD*DAY};
const isIll=it=>it.kind==='drawing'||/^illustration/i.test(String((it.u&&it.u.tags)||''));
const kindLabel=it=>isIll(it)&&/^illustration/i.test(String((it.u&&it.u.tags)||''))?'איור':(KINDN[it.kind]||(it.src==='builtin'?'צילום שטח':'תמונה'));
let USE={t:0,m:null,n:0};
function useMap(){if(USE.m&&Date.now()-USE.t<20000&&USE.n===AG.posts.length)return USE.m;const m=new Map();for(const p of AG.posts){let ks=[];try{ks=imgKeysOf(p)}catch(x){}for(const k of new Set(ks)){let a=m.get(k);if(!a){a=[];m.set(k,a)}a.push(p.id)}}USE={t:Date.now(),m,n:AG.posts.length};return m}
function pvOk(it,v,n){if(v==='new')return isNewP(it);if(v==='ill')return isIll(it);if(v==='render')return it.kind==='render'||(()=>{try{return isRenderKey(it.k)}catch(e){return false}})();if(v==='field')return it.kind==='site'||it.kind==='aerial'||it.src==='builtin';if(v==='up')return it.src==='up';if(v==='unused')return !n;if(v==='heavy')return n>=10;return true}
const norm2=s=>String(s||'').replace(/["'״׳]/g,'').toLowerCase();
function ptile(it,um,S){const ids=um.get(it.k)||[];const n=ids.length;const sel=S.sel.has(it.k);const nw=isNewP(it);const pj=it.proj?projLabel(it.proj):'';
 return `<button type="button" class="v170t${sel?' on':''}${S.selMode?' v170pick':''}" data-v144="${S.selMode?'pick':'open'}" data-k="${H(it.k)}" aria-label="${H(it.name+(nw?', חדשה':'')+(n?`, בשימוש ב-${n} פוסטים`:', לא בשימוש'))}"${S.selMode?` aria-pressed="${sel}"`:''}>
 <span class="v170im"><img src="${H(it.url)}" alt="" loading="lazy" decoding="async" data-v148k="${H(it.k)}">${nw?'<em class="v170new">חדש</em>':''}${S.selMode?`<i class="v148box" aria-hidden="true">${sel?'✓':''}</i>`:''}</span>
 <span class="v170pm">${H(kindLabel(it))}${pj?` · ${H(pj)}`:''}</span><span class="v170pu${n?'':' z'}${n>=10?' hi':''}">${n?`בשימוש ב-${n} פוסטים`:'לא בשימוש'}</span></button>`}
function vPhotos170(S,keep){const inv=__v144.inventory();const um=useMap();const q=norm2(PF.q);
 const all=inv.map(it=>({it,n:(um.get(it.k)||[]).length}));
 const pre=all.filter(({it})=>(!PF.proj||(PF.proj==='none'?!it.proj:it.proj===PF.proj))&&(!q||norm2(it.name+' '+projLabel(it.proj)+' '+(KINDN[it.kind]||'')+' '+it.from+' '+((it.u&&it.u.tags)||'')).includes(q)));
 const cnt={};PV.forEach(([k])=>cnt[k]=pre.filter(x=>pvOk(x.it,k,x.n)).length);
 let l=pre.filter(x=>pvOk(x.it,PF.v,x.n));
 const byName=(a,b)=>String(a.it.name).localeCompare(String(b.it.name),'he');
 if(PF.sort==='use')l.sort((a,b)=>b.n-a.n||atOf(b.it)-atOf(a.it));else if(PF.sort==='name')l.sort(byName);else l.sort((a,b)=>atOf(b.it)-atOf(a.it)||b.n-a.n);
 const pc={};inv.forEach(it=>{const k=it.proj||'none';pc[k]=(pc[k]||0)+1});
 const projs=Object.keys(PJ()).filter(k=>pc[k]);
 let body='';const LIM=S._lim||120;const show=l.slice(0,LIM);
 if(PF.sort==='new'){const now=Date.now();const bk=x=>{const t=atOf(x.it);return !t?2:t>=now-7*DAY?0:t>=now-30*DAY?1:2};const B=['השבוע','החודש','קודם'];const bc=[0,0,0];l.forEach(x=>bc[bk(x)]++);let cur=-1,open=false;
  show.forEach(x=>{const b=bk(x);if(b!==cur){if(open)body+='</div>';cur=b;body+=`<h3 class="v170gh"><span>${B[b]}</span><i>${bc[b]}</i></h3><div class="v144grid v170grid">`;open=true}body+=ptile(x.it,um,S)});if(open)body+='</div>'}
 else body=`<div class="v144grid v170grid">${show.map(x=>ptile(x.it,um,S)).join('')}</div>`;
 if(!l.length)body=`<div class="v170empty"><b>${PF.q?'לא נמצאו תמונות':'אין כאן תמונות'}</b><span>${PF.v==='new'?`לא נוספו תמונות ב-${NEWD} הימים האחרונים.`:'נסו תצוגה אחרת או פרויקט אחר.'}</span>${PF.v!=='all'||PF.proj||PF.q?'<button type="button" class="v170btn" data-v170p="reset">לכל התמונות</button>':''}</div>`;
 const brk=(()=>{try{return document.querySelectorAll('.v170t.v170bad').length}catch(e){return 0}})();
 const miss=(()=>{try{return __v144.missing(inv).filter(c=>c.l).length}catch(e){return 0}})();const hid=(()=>{try{return __v148.HID.size}catch(e){return 0}})();
 return `<div class="v170p${S.selMode?' v148selon':''}">
 <div class="v170bar v170pbar"><label class="v170q">${IC.search}<input type="search" data-v170pq value="${H(PF.q)}" placeholder="חיפוש תמונה: שם, פרויקט, סוג" aria-label="חיפוש תמונות" autocomplete="off"></label>
  <label class="v170sel"><span class="v170sr">פרויקט</span><select data-v170pp aria-label="פרויקט"><option value="">כל הפרויקטים</option>${projs.map(k=>`<option value="${k}"${PF.proj===k?' selected':''}>${H(projLabel(k))} (${pc[k]})</option>`).join('')}${pc.none?`<option value="none"${PF.proj==='none'?' selected':''}>בלי פרויקט (${pc.none})</option>`:''}</select></label>
  <label class="v170sel"><span class="v170sr">מיון</span><select data-v170ps aria-label="מיון">${PSORT.map(([k,t2])=>`<option value="${k}"${PF.sort===k?' selected':''}>${t2}</option>`).join('')}</select></label>
  <label class="v170fbtn v170upl" title="העלאת תמונות, אפשר הרבה בבת אחת">${IC.up}<span>העלאה</span><input type="file" accept="image/*" multiple data-v144up hidden></label></div>
 <div class="v170qv" role="tablist" aria-label="תצוגות מהירות">${PV.map(([k,t2])=>`<button type="button" role="tab" data-v170p="v" data-k="${k}" aria-selected="${PF.v===k}">${t2}<i>${cnt[k]}</i></button>`).join('')}</div>
 <div class="v170res"><b class="v170cnt" aria-live="polite">${l.length} תמונות</b>${PF.v==='new'?`<span class="v170hint">נוספו ב-${NEWD} הימים האחרונים</span>`:''}<button type="button" class="v170link" data-v144="selmode" aria-pressed="${S.selMode}">${S.selMode?'סיום בחירה':'בחירת כמה תמונות'}</button><span class="v170sp"></span>${miss?`<button type="button" class="v170link" data-v144="src" data-k="missing">${miss} באתר ועוד לא כאן</button>`:''}${brk?`<button type="button" class="v170link" data-v144="src" data-k="broken">${brk} לא נטענות</button>`:''}<button type="button" class="v170link" data-v144="src" data-k="hidden">הוסרו (${hid})</button></div>
 ${S.busy?`<div class="v144busy" role="status">${H(S.busy)}</div>`:''}
 ${body}
 ${l.length>LIM?`<div class="ga-more"><button type="button" class="px-btn" data-v170p="more">הצג עוד ${Math.min(120,l.length-LIM)} מתוך ${l.length-LIM}</button></div>`:''}</div>${keep||''}`}
function psheet(S){if(!S.lb)return '';const inv=__v144.inventory();const it=inv.find(i=>i.k===S.lb);if(!it)return '';const ids=(useMap().get(it.k)||[]);const n=ids.length;const nw=isNewP(it);
 const projs=Object.entries(PJ());const posts=ids.map(id=>AG.posts.find(p=>p.id===id)).filter(Boolean);const lim=24;
 const added=it.at?String(it.at).slice(0,10).split('-').reverse().join('.'):'';
 return `<div class="v170ps" id="v170ps"><div class="v170sh-back" data-v170p="close"></div><div class="v170sh v170psh" role="dialog" aria-modal="true" aria-labelledby="v170pst">
 <header><h2 id="v170pst" tabindex="-1">${H(it.name)}</h2><button type="button" class="v170x" data-v144="close" aria-label="סגירה">${IC.x}</button></header>
 <div class="v170shb"><div class="v170pbig"><img src="${H(it.url)}" alt="${H(it.name)}">${nw?'<em class="v170new">חדש</em>':''}</div>
  <p class="v170pinfo">${H(kindLabel(it))}${it.proj?' · '+H(projLabel(it.proj)):''}${added?` · נוספה ${added}`:''}${it.w?` · ${it.w}×${it.h}${Math.max(it.w,it.h)<900?' <b class="v144low">רזולוציה נמוכה לפוסט</b>':''}`:''}</p>
  <section><h3>${n?`בשימוש ב-${n} פוסטים`:'עוד לא בשום פוסט'}</h3>${n?`<div class="v170posts">${posts.slice(0,lim).map(p=>`<button type="button" class="v170pp" data-pe="${H(p.id)}" aria-label="${H('עריכת הפוסט: '+headOf(p).slice(0,60))}"><canvas data-tp="${H(p.id)}" width="108" height="135"></canvas></button>`).join('')}${posts.length>lim?`<span class="v170more">ועוד ${posts.length-lim}</span>`:''}</div><p class="v170hint">לחיצה על פוסט פותחת אותו בעורך.</p>`:'<p class="v170hint">אפשר לסמן אותה במצב "בחירה" וליצור ממנה פוסטים עם הסוכן.</p>'}</section>
  ${it.u?`<section><h3>פרטים</h3><label class="v170f"><span>שם</span><input type="text" data-v144="name" data-id="${H(it.id)}" value="${H(it.name)}" maxlength="60"></label><label class="v170f"><span>פרויקט</span><select data-v144="proj" data-id="${H(it.id)}"><option value="">בלי פרויקט</option>${projs.map(([k,v])=>`<option value="${k}"${it.proj===k?' selected':''}>${H(v)}</option>`).join('')}</select></label></section>`:'<p class="v170hint">תמונה מובנית במערכת. אפשר להסיר אותה מהגלריה ולהחזיר בכל רגע.</p>'}
  ${n?`<p class="v170hint">אחרי הסרה, הפוסטים שכבר משתמשים בה ממשיכים להציג אותה.</p>`:''}
 </div>
 <footer><a class="v170btn ghost" href="${H(it.url)}" target="_blank" rel="noopener">פתיחה בגודל מלא</a>${it.u&&!n?`<button type="button" class="v170btn ghost v170danger" data-v144="del" data-id="${H(it.id)}">מחיקה לצמיתות</button>`:''}<button type="button" class="v170btn v170danger" data-v144="hide1" data-k="${H(it.k)}">הסרה מהגלריה</button></footer></div></div>`}
const SPECIAL=['missing','hidden','broken'];
function photosPaint(){const S=window.__v144&&__v144.S;const box=document.getElementById('appviews');if(!S||!box)return;
 if(S.src==='up'&&S.group==='new'){PF.v='up';PF.sort='new';S.group='proj';saveP()}else if(S.src==='unused'){PF.v='unused';saveP()}
 if(SPECIAL.includes(S.src)){box.classList.add('v170legacy');if(!box.querySelector('.v170back'))box.insertAdjacentHTML('afterbegin',`<div class="v170res"><button type="button" class="v170btn" data-v144="src" data-k="all">חזרה לכל התמונות</button></div>`);return}
 if(S.src!=='all'){S.src='all';try{localStorage.setItem('v144_f',JSON.stringify({src:'all',group:S.group}))}catch(e){}}
 box.classList.remove('v170legacy');const bar=box.querySelector('.v148bar');const keep=bar?bar.outerHTML:'';
 const am=document.getElementById('appmain');const sc=am?am.scrollTop:0;box.innerHTML=vPhotos170(S,keep)+psheet(S);if(am&&am.scrollTop!==sc)am.scrollTop=sc;
 const sh=document.getElementById('v170ps');document.body.classList.toggle('v170sh-on',!!sh);if(sh){try{paint(sh)}catch(e){}const x=sh.querySelector('#v170pst');if(x&&!sh.contains(document.activeElement))x.focus({preventScroll:true})}}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-v170p]');if(!b||APP.view!=='photos')return;const a=b.dataset.v170p;const S=__v144.S;
 if(a==='v'){PF.v=b.dataset.k;if(PF.v==='new')PF.sort='new';S._lim=120;saveP();render()}
 else if(a==='more'){S._lim=(S._lim||120)+120;render()}
 else if(a==='reset'){Object.assign(PF,{v:'all',proj:'',q:''});saveP();render()}
 else if(a==='close'){S.lb=null;render()}});
document.addEventListener('change',e=>{const t=e.target;if(!t.matches||APP.view!=='photos')return;
 if(t.matches('[data-v170pp]')){PF.proj=t.value;saveP();render()}else if(t.matches('[data-v170ps]')){PF.sort=t.value;saveP();render()}},true);
let pqt=0;document.addEventListener('input',e=>{const t=e.target;if(!t.matches||!t.matches('[data-v170pq]'))return;clearTimeout(pqt);pqt=setTimeout(()=>{PF.q=t.value.trim();saveP();const pos=t.selectionStart;render();const n=document.querySelector('[data-v170pq]');if(n){n.focus();try{n.setSelectionRange(pos,pos)}catch(x){}}},220)},true);
document.addEventListener('error',ev=>{const t=ev.target;if(!t||t.tagName!=='IMG'||!t.dataset||!t.dataset.v148k)return;const tl=t.closest('.v170t');if(tl)tl.classList.add('v170bad')},true);
// keyboard: Tab stays inside the photo sheet
window.addEventListener('keydown',e=>{if(e.key!=='Tab')return;const r=document.querySelector('#v170ps .v170sh');if(!r)return;const f=[...r.querySelectorAll('button,input,select,a[href]')].filter(x=>!x.disabled&&x.offsetParent);if(!f.length)return;const first=f[0],last=f[f.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}},true);

// ============ 4. after every render ============
render=(f=>function(){const r=f.apply(this,arguments);try{const v=APP.view;document.body.classList.toggle('v170g',v==='gallery');document.body.classList.toggle('v170ph',v==='photos');
  if(v!=='gallery'&&PS.open){PS.open=false;sheetPaint()}
  if(v!=='photos')document.body.classList.toggle('v170sh-on',!!document.getElementById('v170sheet'));
  if(v==='gallery'){note();const top=hdrBottom();document.querySelectorAll('.v170bar').forEach(b=>b.style.setProperty('--v170top',top+'px'));if(PS.open)sheetPaint()}
  if(v==='photos'){photosPaint();const top=hdrBottom();document.querySelectorAll('.v170bar').forEach(b=>b.style.setProperty('--v170top',top+'px'))}
  patchBottom();advDot()}catch(e){console.error('v170',e)}return r})(render);
setInterval(()=>{try{if(APP.view==='gallery')note()}catch(e){}},5000);
window.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('.v170 [data-ga="more"]');if(!b||APP.view!=='gallery'||!BASE)return;e.preventDefault();e.stopImmediatePropagation();GA.lim+=60;fastPaint()},true);
// Escape closes the topmost layer: the schedule sheet opened from the big viewer closes before the viewer under it
window.addEventListener('keydown',e=>{if(e.key!=='Escape'||!document.getElementById('v157')||typeof GA==='undefined'||!GA.lb)return;const lb=GA.lb;GA.lb=null;setTimeout(()=>{if(!GA.lb&&document.getElementById('ga-lb'))GA.lb=lb},0)},true);
window.__v170={F,PF,famOf,metaP,regroup,photosPaint};
try{if(document.getElementById('sidenav'))renderNav()}catch(e){}
})();
