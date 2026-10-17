// ================= V186 · the competitor gallery, one tap from the header: a "גלריה" button opens every competitor picture
// (Facebook posts and uploaded ad screenshots) full screen. Tapping a picture opens the viewer: the picture as large as the
// screen allows, and beside it everything about the competitor (who they are, their ad library summary, the Meta links) and
// the post itself (date, full text, engagement, link), with "שכפל למותג שלנו". Arrows, swipe and keys move between pictures.
(()=>{
if(window.__v186)return;window.__v186=1;
const E=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const V=()=>window.__v181||null;
const SVG=(d,w)=>`<svg width="${w||18}" height="${w||18}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const IC={gal:SVG('<rect x="3" y="4" width="18" height="16" rx="2.5"/><circle cx="9" cy="10" r="1.8"/><path d="m21 16-5-5-9 9"/>'),x:SVG('<path d="M6 6l12 12M18 6 6 18"/>',20),
 l:SVG('<path d="m15 6-6 6 6 6"/>',26),r:SVG('<path d="m9 6 6 6-6 6"/>',26),ext:SVG('<path d="M14 4h6v6M20 4l-9 9M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/>',14),
 wand:SVG('<path d="m15 4 1 2 2 1-2 1-1 2-1-2-2-1 2-1zM4 20l9-9M11 9l4 4"/>',16),star:SVG('<path d="M12 3.2l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17.2l-5.4 2.9 1-6.1L3.2 9.7l6.1-.9z"/>',14),
 zoom:SVG('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5M8 11h6M11 8v6"/>',18)};
const S={open:false,list:[],i:-1,comp:'',kind:'',sort:'new',zoom:false,sheet:false};
const onTop=()=>!!(document.getElementById('v181g')||document.getElementById('v181d')||document.getElementById('v179g')||document.getElementById('v179d')||document.body.classList.contains('pe-open'))||(document.getElementById('v186')||{style:{}}).style.visibility==='hidden';
const safeUrl=u=>{try{const x=new URL(String(u||''));return /^https?:$/.test(x.protocol)?x.href:''}catch(e){return ''}};
const num=n=>(+n||0).toLocaleString('he-IL');
const fmtD=v=>{try{return V().fmtD(v)}catch(e){return ''}};
const compOf=p=>{const v=V();if(!v)return null;return v.compDoc(v.isShot(p)?p.comp_id:(Array.isArray(p.comp_ids)&&p.comp_ids[0])||p.comp_id)};
const nameOf=p=>{try{return V().shortName(p)}catch(e){return String(p.comp_name||'')}};
const bestSrc=p=>{const v=V();if(v.isShot(p))return v.fullOf(p);return p.thumb||v.srcOf(p)};
const isAd=p=>!!(p.ad_id);

/* ---------- the button in the header ---------- */
function mountBtn(){const tb=document.querySelector('.tbar');if(!tb||tb.querySelector('[data-v186="open"]'))return;
 const b=document.createElement('button');b.type='button';b.className='ibtn v186btn';b.dataset.v186='open';b.setAttribute('aria-label','גלריית המתחרים');b.title='גלריית המתחרים: כל התמונות והמודעות';b.innerHTML=IC.gal+'<span>גלריה</span>';
 const anchor=tb.querySelector('#v102back')||tb.querySelector('[data-app="menu"]');if(anchor)anchor.insertAdjacentElement('afterend',b);else tb.prepend(b)}
try{new MutationObserver(()=>{try{mountBtn()}catch(e){}}).observe(document.body,{childList:true,subtree:true})}catch(e){}
try{mountBtn()}catch(e){}

/* ---------- the list ---------- */
function items(){const v=V();if(!v)return [];let l=v.allItems().filter(p=>bestSrc(p));
 if(S.comp)l=l.filter(p=>nameOf(p)===S.comp);
 if(S.kind==='post')l=l.filter(p=>!v.isShot(p));else if(S.kind==='shot')l=l.filter(p=>v.isShot(p));else if(S.kind==='ad')l=l.filter(p=>v.isShot(p)&&isAd(p));
 l.sort(S.sort==='eng'?(a,b)=>(+b.eng||0)-(+a.eng||0)||String(b.published||'').localeCompare(String(a.published||'')):(a,b)=>String(b.published||'').localeCompare(String(a.published||'')));
 return l}
function compNames(){const v=V();const m=new Map();v.allItems().forEach(p=>{if(bestSrc(p)){const n=nameOf(p);m.set(n,(m.get(n)||0)+1)}});return [...m.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],'he'))}

/* ---------- the gallery overlay ---------- */
function galHtml(){const v=V();const list=S.list=items();const names=compNames();
 const tile=(p,i)=>{const sh=v.isShot(p);const src=bestSrc(p);return `<button type="button" class="v186t" data-v186="view" data-i="${i}" aria-label="${E(nameOf(p))}, ${sh?'צילום מסך':'פוסט'} מ־${E(fmtD(p.published))}"><img src="${E(src)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" data-v181img="${E(p.id)}"><span class="v186tc"><b>${E(nameOf(p))}</b>${sh?`<i>${isAd(p)?'מודעה':'צילום מסך'}</i>`:p.eng?`<i>${num(p.eng)} מעורבות</i>`:''}</span></button>`};
 return `<div class="v186top"><button type="button" class="v186x" data-v186="close" aria-label="סגירה" title="סגירת הגלריה">${IC.x}</button><h2>גלריית המתחרים</h2><span class="v186n">${list.length} תמונות${S.comp?' של '+E(S.comp):' של '+names.length+' מתחרים'}</span></div>
 <div class="v186bar"><label><span>מתחרה</span><select data-v186="comp"><option value="">כל המתחרים</option>${names.map(([n,c])=>`<option value="${E(n)}"${S.comp===n?' selected':''}>${E(n)} (${c})</option>`).join('')}</select></label>
  <label><span>סוג</span><select data-v186="kind"><option value="">הכל</option><option value="post"${S.kind==='post'?' selected':''}>פוסטים מפייסבוק</option><option value="shot"${S.kind==='shot'?' selected':''}>צילומי מסך</option><option value="ad"${S.kind==='ad'?' selected':''}>מודעות מספריית Meta</option></select></label>
  <label><span>סדר</span><select data-v186="sort"><option value="new"${S.sort==='new'?' selected':''}>חדשים קודם</option><option value="eng"${S.sort==='eng'?' selected':''}>הכי הרבה מעורבות</option></select></label></div>
 ${list.length?`<div class="v186grid">${list.map(tile).join('')}</div>`:`<div class="v186empty"><b>אין עדיין תמונות${S.comp||S.kind?' בסינון הזה':''}</b><p>${S.comp||S.kind?'נסו סינון אחר.':'תמונות מגיעות מהפוסטים של מתחרים שבמעקב ב-Metricool ומצילומי מסך שמעלים בכרטיס המתחרה.'}</p></div>`}`}
function openGal(){if(!V()){toast('הגלריה נטענת, נסו שוב בעוד רגע');return}let g=document.getElementById('v186');if(!g){g=document.createElement('div');g.id='v186';g.className='ov';g.setAttribute('role','dialog');g.setAttribute('aria-modal','true');g.setAttribute('aria-label','גלריית המתחרים');document.body.appendChild(g)}
 g.innerHTML=galHtml();document.body.classList.add('v186lock');S.open=true;
 requestAnimationFrame(()=>{const f=g.querySelector('.v186x');f&&f.focus()})}
function renderGal(){const g=document.getElementById('v186');if(!g)return;const sc=g.querySelector('.v186grid');const top=sc?sc.scrollTop:0;g.innerHTML=galHtml();const n=g.querySelector('.v186grid');if(n)n.scrollTop=top}
function closeAll(){closeView(true);const g=document.getElementById('v186');if(g)g.remove();document.body.classList.remove('v186lock');S.open=false;
 const b=document.querySelector('[data-v186="open"]');b&&b.focus()}

/* ---------- the viewer ---------- */
function adInfo(p){const v9=window.__v179;if(!v9||!p.ad_id)return '';const ad=v9.M.ads.get(String(p.ad_id));if(!ad)return p.ad_title?`<div class="v186sec"><h4>המודעה בספריית Meta</h4><p>${E(p.ad_title)}</p></div>`:'';
 const d=v9.daysOf(ad);return `<div class="v186sec"><h4>המודעה בספריית Meta</h4><p class="v186adt">${E(String(ad.title||'').trim()||'ללא כותרת')}</p><div class="v186chips">${d!=null?`<span class="v186chip${v9.isStar(ad)?' star':''}">${v9.isStar(ad)?IC.star:''} ${d} ימים באוויר</span>`:''}${ad.status==='inactive'?'<span class="v186chip gone">הפסיקה</span>':'<span class="v186chip">פעילה</span>'}${ad.start?`<span class="v186chip">מאז ${E(fmtD(ad.start))}</span>`:''}</div>${safeUrl(ad.snapshot_url)?`<a class="v186lnk" href="${E(safeUrl(ad.snapshot_url))}" target="_blank" rel="noopener">לצפייה במודעה ב-Meta ${IC.ext}</a>`:''}</div>`}
function compInfo(p){const c=compOf(p);const name=nameOf(p);if(!c)return `<div class="v186who"><i>${E(name.slice(0,1))}</i><div><b>${E(name)}</b></div></div>`;
 const s=c.meta_summary||null;const v9=window.__v179;const ads=v9?(v9.M.byComp.get(String(c.id))||[]):[];const active=ads.filter(a=>!v9.isGone(a)).length,stars=ads.filter(a=>v9.isStar(a)).length;
 const links=Array.isArray(c.meta_library_urls)?c.meta_library_urls.filter(x=>x&&safeUrl(x.url)).slice(0,3):[];
 const site=[c.site,c.fb,c.ig].filter(Boolean).map(u=>safeUrl(/^https?:/.test(u)?u:'https://'+u)).filter(Boolean);
 return `<div class="v186who"><i>${E(name.slice(0,1))}</i><div><b>${E(c.name||name)}</b><small>${E(c.focus||c.cat||c.category||'')}</small></div></div>
 ${c.desc||c.about||c.summary?`<p class="v186desc">${E(String(c.desc||c.about||c.summary).slice(0,320))}</p>`:''}
 ${(s||ads.length)?`<div class="v186sec"><h4>המודעות שלהם בספריית Meta</h4><div class="v186kpis"><span><b>${num(s?s.active:active)}</b>פעילות</span><span><b>${num(s?s.stars:stars)}</b>${IC.star} 60 יום ומעלה</span>${s&&s.new7!=null?`<span><b>${num(s.new7)}</b>חדשות ב־7 ימים</span>`:''}${s&&s.groups!=null?`<span><b>${num(s.groups)}</b>קבוצות מסרים</span>`:''}</div>${s&&s.last_scan?`<small class="v186muted">סריקה אחרונה ${E(String(s.last_scan).replace(/^scan_(\d{4})(\d{2})(\d{2})T.*$/,'$3.$2.$1'))}${s.partial?' · תוצאות חלקיות':''}</small>`:''}</div>`:''}
 ${links.length||site.length?`<div class="v186links">${links.map(x=>`<a class="v186lnk" href="${E(safeUrl(x.url))}" target="_blank" rel="noopener">${E(/חיפוש/.test(x.label)?'חיפוש בספריית Meta':'ספריית Meta: '+x.label)} ${IC.ext}</a>`).join('')}${site.slice(0,2).map(u=>`<a class="v186lnk" href="${E(u)}" target="_blank" rel="noopener">${E(u.replace(/^https?:\/\/(www\.)?/,'').replace(/\/$/,'').slice(0,32))} ${IC.ext}</a>`).join('')}</div>`:''}`}
function postInfo(p){const v=V();const sh=v.isShot(p);
 if(sh)return `<div class="v186sec"><h4>צילום המסך</h4><div class="v186chips"><span class="v186chip">הועלה ${E(fmtD(p.added||p.published))}</span>${p.ew&&p.eh?`<span class="v186chip ok" dir="ltr">${p.ew}×${p.eh}</span>`:p.w&&p.h?`<span class="v186chip" dir="ltr">${p.w}×${p.h}</span>`:''}${p.enh?'<span class="v186chip ok">שופר</span>':''}</div>${p.note?`<p class="v186txt">${E(p.note)}</p>`:''}</div>${adInfo(p)}`;
 return `<div class="v186sec"><h4>הפוסט</h4><div class="v186chips"><span class="v186chip">${E(fmtD(p.published))}</span><span class="v186chip">פייסבוק</span></div>${v.engHtml(p)}<p class="v186txt">${p.text?E(p.text):'<span class="v186muted">פוסט בלי טקסט</span>'}</p>${safeUrl(p.link)?`<a class="v186lnk" href="${E(safeUrl(p.link))}" target="_blank" rel="noopener">לפוסט בפייסבוק ${IC.ext}</a>`:''}</div>`}
function viewHtml(){const p=S.list[S.i];const v=V();const src=bestSrc(p);const full=v.isShot(p)?v.fullOf(p):(p.thumb||safeUrl(p.image));const n=S.list.length;
 return `<div class="v186vbg" data-v186="vclose"></div>
 <div class="v186vtop"><button type="button" class="v186x" data-v186="vclose" aria-label="סגירה" title="חזרה לגלריה">${IC.x}</button><span class="v186vn">${S.i+1} מתוך ${n}</span><button type="button" class="v186ib" data-v186="zoom" aria-pressed="${S.zoom}" aria-label="הגדלה">${IC.zoom}</button></div>
 <div class="v186stage${S.zoom?' zoom':''}" data-v186="stage"><img src="${E(src)}" alt="${E(nameOf(p))}" decoding="async" referrerpolicy="no-referrer" draggable="false" data-v186img></div>
 ${n>1?`<button type="button" class="v186nav prev" data-v186="prev" aria-label="התמונה הקודמת">${IC.r}</button><button type="button" class="v186nav next" data-v186="next" aria-label="התמונה הבאה">${IC.l}</button>`:''}
 <aside class="v186info${S.sheet?' up':''}" aria-label="פרטי המתחרה והפוסט"><button type="button" class="v186grip" data-v186="sheet" aria-expanded="${S.sheet}"><i></i><span>${E(nameOf(p))} · ${E(fmtD(p.published))}</span></button>
  <div class="v186ib2">${compInfo(p)}${postInfo(p)}
  <div class="v186acts"><button type="button" class="v179b pri big" data-v186="clone" data-id="${E(p.id)}">${IC.wand} שכפל למותג שלנו</button>${full?`<a class="v179b" href="${E(full)}" target="_blank" rel="noopener">התמונה בגודל מלא ${IC.ext}</a>`:''}<button type="button" class="v179b" data-v186="details" data-id="${E(p.id)}">כל הפרטים</button></div>
  <p class="v186muted v186fine">שום דבר לא מתפרסם לבד. התמונה שלהם רק להשראה, בפוסט שלנו התמונות שלנו.</p></div></aside>`}
function openView(i){if(!S.list.length)return;S.i=(i+S.list.length)%S.list.length;S.zoom=false;let m=document.getElementById('v186v');if(!m){m=document.createElement('div');m.id='v186v';m.className='ov';m.setAttribute('role','dialog');m.setAttribute('aria-modal','true');m.setAttribute('aria-label','תמונה של מתחרה');document.body.appendChild(m)}
 m.innerHTML=viewHtml();S.sheet=S.sheet&&window.matchMedia('(max-width:860px)').matches?S.sheet:false;const im=m.querySelector('[data-v186img]');
 // preload the neighbours so arrows feel instant
 [S.i+1,S.i-1].forEach(j=>{const q=S.list[(j+S.list.length)%S.list.length];if(q){const pre=new Image();pre.referrerPolicy='no-referrer';pre.src=bestSrc(q)}});
 try{if(V().keep&&!V().isShot(S.list[S.i]))V().keep(S.list[S.i].id)}catch(e){}
 requestAnimationFrame(()=>{const f=m.querySelector('.v186x');f&&f.focus()})}
function closeView(silent){const m=document.getElementById('v186v');if(m)m.remove();S.i=-1;if(!silent){const g=document.getElementById('v186');const t=g&&g.querySelector('.v186t[aria-pressed]');const b=g&&g.querySelector('.v186x');b&&b.focus()}}
function step(d){if(S.i<0)return;openView(S.i+d)}

/* ---------- events ---------- */
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-v186]');if(!b)return;const a=b.dataset.v186;if(a==='comp'||a==='kind'||a==='sort'||a==='stage')return;e.preventDefault();e.stopPropagation();
 if(a==='open'){openGal();return}
 if(a==='close'){closeAll();return}
 if(a==='view'){openView(+b.dataset.i);return}
 if(a==='vclose'){closeView();return}
 if(a==='prev'){step(-1);return}if(a==='next'){step(1);return}
 if(a==='zoom'){S.zoom=!S.zoom;const st=document.querySelector('#v186v .v186stage');if(st)st.classList.toggle('zoom',S.zoom);b.setAttribute('aria-pressed',S.zoom);return}
 if(a==='sheet'){S.sheet=!S.sheet;const i=b.closest('.v186info');i&&i.classList.toggle('up',S.sheet);b.setAttribute('aria-expanded',S.sheet);return}
 if(a==='clone'){const id=b.dataset.id;closeView(true);const g=document.getElementById('v186');if(g)g.style.visibility='hidden';try{V().openGen(id)}catch(x){}syncOv();
  const poll=setInterval(()=>{const g2=document.getElementById('v186');if(!g2){clearInterval(poll);return}if(!document.getElementById('v181g')&&!document.body.classList.contains('pe-open')){g2.style.visibility='';clearInterval(poll)}},300);return}
 if(a==='details'){try{V().openDetail(b.dataset.id)}catch(x){}syncOv();return}
},true);
// a tap on the picture itself toggles the zoom, like a photo app
document.addEventListener('click',e=>{const im=e.target.closest&&e.target.closest('#v186v [data-v186img]');if(!im||S.dragged)return;const st=im.closest('.v186stage');S.zoom=!S.zoom;st.classList.toggle('zoom',S.zoom);const z=document.querySelector('#v186v [data-v186="zoom"]');z&&z.setAttribute('aria-pressed',S.zoom)});
document.addEventListener('change',e=>{const t=e.target;if(!t||!t.dataset||!t.dataset.v186)return;const a=t.dataset.v186;if(a==='comp'){S.comp=t.value}else if(a==='kind'){S.kind=t.value}else if(a==='sort'){S.sort=t.value}else return;renderGal()});
// Escape and the arrow keys. Registered on window in the capture phase, so this runs before every other key handler and can
// decide once: when a window sits on top of the gallery (the brand form, a details window, the editor) it belongs to them.
window.addEventListener('keydown',e=>{if(!S.open||onTop())return;
 if(e.key==='Escape'){e.stopImmediatePropagation();e.preventDefault();if(S.i>=0)closeView();else closeAll();return}
 if(S.i>=0){if(e.key==='ArrowLeft'){e.preventDefault();step(1)}else if(e.key==='ArrowRight'){e.preventDefault();step(-1)}}},true);
// swipe between pictures (not while zoomed, when the stage scrolls)
let px=0,py=0,pt=0;S.dragged=false;
document.addEventListener('pointerdown',e=>{const v=e.target.closest&&e.target.closest('#v186v');if(!v||S.zoom||e.target.closest('.v186info,.v186nav,.v186vtop'))return;px=e.clientX;py=e.clientY;pt=Date.now();S.dragged=false},true);
document.addEventListener('pointerup',e=>{if(!pt)return;const dx=e.clientX-px,dy=e.clientY-py,dt=Date.now()-pt;pt=0;if(Math.abs(dx)>48&&Math.abs(dx)>Math.abs(dy)*1.5&&dt<700){S.dragged=true;setTimeout(()=>{S.dragged=false},50);step(dx<0?1:-1)}},true);
// The class "ov" is what gives a window its back entry (V101), but the engine also removes the last .ov on Escape, even a hidden
// one. So the gallery and the viewer carry the class only while nothing sits on top of them; behind the brand form, a details
// window or the editor they step out of that list, and come back when it closes.
function syncOv(){const on=!onTop();['v186','v186v'].forEach(id=>{const el=document.getElementById(id);if(el)el.classList.toggle('ov',on)})}
try{new MutationObserver(()=>{const g=document.getElementById('v186');if(g&&g.style.visibility==='hidden'&&!document.getElementById('v179g')&&!document.getElementById('v181g')&&!document.body.classList.contains('pe-open'))g.style.visibility='';syncOv()}).observe(document.body,{childList:true,attributes:true,attributeFilter:['class']})}catch(e){}
window.__v186={S,openGal,openView,closeAll,items};
})();
