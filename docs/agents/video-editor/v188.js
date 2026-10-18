// ================= V186 · the competitor gallery, one tap from the header (v187: ads captured from the Meta Ads Library; v188: redesigned
// as one tidy archive). A "גלריה" button opens every competitor picture (Facebook posts, ads captured from the Meta Ads
// Library, uploaded screenshots) full screen: a rail of competitors with counts, search in the text, kind and period filters,
// and the pictures grouped by competitor under a sticky name. Tapping a picture opens the viewer: the picture as large as the
// screen allows, and beside it who the competitor is, when it was published, what it says, and "שכפל למותג שלנו" (text and
// design in our colours and font). Arrows, swipe and keys move between pictures. The id prefixes stay v186 for the styles,
// tests and the history coordinator.
(()=>{
if(window.__v186)return;window.__v186=1;
const E=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const V=()=>window.__v181||null;
const SVG=(d,w)=>`<svg width="${w||18}" height="${w||18}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const IC={gal:SVG('<rect x="3" y="4" width="18" height="16" rx="2.5"/><circle cx="9" cy="10" r="1.8"/><path d="m21 16-5-5-9 9"/>'),x:SVG('<path d="M6 6l12 12M18 6 6 18"/>',20),
 l:SVG('<path d="m15 6-6 6 6 6"/>',26),r:SVG('<path d="m9 6 6 6-6 6"/>',26),ext:SVG('<path d="M14 4h6v6M20 4l-9 9M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/>',14),
 wand:SVG('<path d="m15 4 1 2 2 1-2 1-1 2-1-2-2-1 2-1zM4 20l9-9M11 9l4 4"/>',16),star:SVG('<path d="M12 3.2l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17.2l-5.4 2.9 1-6.1L3.2 9.7l6.1-.9z"/>',14),
 zoom:SVG('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5M8 11h6M11 8v6"/>',18),search:SVG('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',16),
 play:SVG('<path d="M8 5.5v13l11-6.5z" fill="currentColor" stroke="none"/>',14),chev:SVG('<path d="m9 6 6 6-6 6"/>',16)};
const S={open:false,list:[],i:-1,comp:'',kind:'',period:'',q:'',sort:'new',zoom:false,sheet:false,more:{},page:1,seen:0};
const PAGE=60,PEEK=8;
const onTop=()=>!!(document.getElementById('v181g')||document.getElementById('v181d')||document.getElementById('v179g')||document.getElementById('v179d')||document.body.classList.contains('pe-open'))||(document.getElementById('v186')||{classList:{contains:()=>false}}).classList.contains('v186park');
const safeUrl=u=>{try{const x=new URL(String(u||''));return /^https?:$/.test(x.protocol)?x.href:''}catch(e){return ''}};
const num=n=>(+n||0).toLocaleString('he-IL');
const fmtD=v=>{try{return V().fmtD(v)}catch(e){return ''}};
const compOf=p=>{const v=V();if(!v)return null;return v.compDoc(v.isShot(p)?p.comp_id:(Array.isArray(p.comp_ids)&&p.comp_ids[0])||p.comp_id)};
const nameOf=p=>{try{return V().shortName(p)}catch(e){return String(p.comp_name||'')}};
const isShot=p=>{try{return V().isShot(p)}catch(e){return false}};
const isMeta=p=>{try{return V().isMeta(p)}catch(e){return false}};
const isAd=p=>!!(p.ad_id);
const kindOf=p=>isMeta(p)?'ad':isShot(p)?(isAd(p)?'ad':'shot'):'post';
const KIND={ad:'מודעה',shot:'צילום מסך',post:'פוסט'};
const adOf=p=>{try{return p.ad_id&&window.__v179?__v179.M.ads.get(String(p.ad_id)):null}catch(e){return null}};
const adStart=p=>{const a=adOf(p);const t=a&&+a.start;return t?new Date((t>1e12?t:t*1000)).toISOString():''};
const dateOf=p=>isMeta(p)?(adStart(p)||String(p.added||'')):String(p.published||p.added||'');
const textOf=p=>String(isShot(p)?(p.note||p.ad_title||''):(p.text||''));
const initial=n=>String(n||'?').trim().replace(/^["'„]+/,'').slice(0,1)||'?';
// tiles and the stage: uploaded screenshots show their improved copy; ads captured from Meta show the 1080px preview, the 4K file waits for the zoom
const bestSrc=p=>{const v=V();if(v.isShot(p))return (isMeta(p)&&safeUrl(p.creative))?safeUrl(p.creative):(isMeta(p)&&safeUrl(p.prev))?safeUrl(p.prev):v.fullOf(p);return p.thumb||v.srcOf(p)};
// the viewer shows the whole ad card (picture, text, button) for ads captured from Meta; the zoom loads the 4K file
const stageSrc=p=>isMeta(p)?(safeUrl(p.prev)||bestSrc(p)):bestSrc(p);
const days=p=>{const t=Date.parse(dateOf(p));return t?Math.floor((Date.now()-t)/864e5):null};
const seenAt=()=>{try{return +localStorage.getItem('v188_seen')||0}catch(e){return 0}};
const isNew=p=>{const t=Date.parse(String(p.added||p.first_seen||p.published||''));return !!t&&S.seen>0&&t>S.seen};

/* ---------- the button in the header ---------- */
function mountBtn(){const tb=document.querySelector('.tbar');if(!tb||tb.querySelector('[data-v186="open"]'))return;
 const b=document.createElement('button');b.type='button';b.className='ibtn v186btn';b.dataset.v186='open';b.setAttribute('aria-label','גלריית המתחרים');b.title='גלריית המתחרים: כל המודעות והפוסטים';b.innerHTML=IC.gal+'<span>גלריה</span>';
 const anchor=tb.querySelector('#v102back')||tb.querySelector('[data-app="menu"]');if(anchor)anchor.insertAdjacentElement('afterend',b);else tb.prepend(b)}
try{new MutationObserver(()=>{try{mountBtn()}catch(e){}}).observe(document.body,{childList:true,subtree:true})}catch(e){}
try{mountBtn()}catch(e){}
// the competitors page: one button for the unified gallery, beside "הוסף מתחרה"
function mountPage(){if(!window.APP||APP.view!=='competitors')return;const act=document.getElementById('vact');if(!act||act.querySelector('[data-v188="uni"]'))return;
 const n=(()=>{try{return all().length}catch(e){return 0}})();const b=document.createElement('button');b.type='button';b.className='ibtn pri v188uni';b.dataset.v186='open';b.dataset.v188='uni';b.innerHTML=IC.gal+`<span>גלריה מאוחדת${n?' · '+num(n):''}</span>`;b.title='כל המודעות והפוסטים של כל המתחרים בגלריה אחת';act.prepend(b)}
try{new MutationObserver(()=>{try{mountPage()}catch(e){}}).observe(document.body,{childList:true,subtree:true})}catch(e){}

/* ---------- the list ---------- */
function all(){const v=V();return v?v.allItems().filter(p=>bestSrc(p)):[]}
function items(){let l=all();
 if(S.comp)l=l.filter(p=>nameOf(p)===S.comp);
 if(S.kind)l=l.filter(p=>kindOf(p)===S.kind);
 if(S.period){const lim=Date.now()-(+S.period)*864e5;l=l.filter(p=>{const t=Date.parse(dateOf(p));return t&&t>=lim})}
 if(S.q){const q=S.q.toLowerCase();l=l.filter(p=>(textOf(p)+' '+nameOf(p)+' '+String(p.ad_title||'')).toLowerCase().includes(q))}
 l.sort(S.sort==='eng'?(a,b)=>(+b.eng||0)-(+a.eng||0)||dateOf(b).localeCompare(dateOf(a)):S.sort==='old'?(a,b)=>dateOf(a).localeCompare(dateOf(b)):(a,b)=>dateOf(b).localeCompare(dateOf(a)));
 return l}
function compStats(){const m=new Map();all().forEach(p=>{const n=nameOf(p);const s=m.get(n)||{n,count:0,fresh:0,last:''};s.count++;if((days(p)||99)<=7)s.fresh++;if(dateOf(p)>s.last)s.last=dateOf(p);m.set(n,s)});return [...m.values()].sort((a,b)=>b.count-a.count||a.n.localeCompare(b.n,'he'))}

/* ---------- the gallery overlay ---------- */
function card(p,i){const k=kindOf(p);const src=bestSrc(p);const name=nameOf(p);const d=days(p);const fresh=isNew(p);
 const foot=k==='post'?(p.eng?`<span class="v186m">${num(p.eng)} מעורבות</span>`:'<span class="v186m">פוסט</span>'):isMeta(p)?`<span class="v186m">${p.media==='video'?IC.play+' סרטון':'מודעה'}${+p.copies>1?' · '+p.copies+' גרסאות':''}</span><span class="v186k4">4K</span>`:`<span class="v186m">${KIND[k]}</span>`;
 return `<article class="v186c${fresh?' new':''}"><button type="button" class="v186t" data-v186="view" data-i="${i}" aria-label="${E(name)}, ${KIND[k]} מ־${E(fmtD(dateOf(p)))}"><img src="${E(src)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" data-v181img="${E(p.id)}">${fresh?'<span class="v186nw">חדש</span>':''}</button>
  <div class="v186ch"><i class="v186av" aria-hidden="true">${E(initial(name))}</i><b>${E(name)}</b><time>${E(fmtD(dateOf(p)))}${d!=null&&(k==='ad'?d>=1:d<=30)?`<small class="v186rel"> · ${k==='ad'?d+' ימים באוויר':d===0?'היום':d===1?'אתמול':'לפני '+d+' ימים'}</small>`:''}</time></div>
  ${textOf(p)?`<p class="v186cx">${E(textOf(p).replace(/\s+/g,' ').slice(0,110))}</p>`:''}<div class="v186cf">${foot}</div></article>`}
function galHtml(){const list=S.list=items();const stats=compStats();const total=all().length;
 const rail=`<div class="v186rail" role="tablist" aria-label="מתחרים"><button type="button" role="tab" class="v186chip${S.comp?'':' on'}" data-v186="comp" data-comp="" aria-selected="${!S.comp}"><b>הכל</b><small>${total}</small></button>${stats.map(s=>`<button type="button" role="tab" class="v186chip${S.comp===s.n?' on':''}" data-v186="comp" data-comp="${E(s.n)}" aria-selected="${S.comp===s.n}"><i class="v186av" aria-hidden="true">${E(initial(s.n))}</i><b>${E(s.n)}</b><small>${s.count}${s.fresh?'<u></u>':''}</small></button>`).join('')}</div>`;
 const seg=(name,opts,cur)=>`<div class="v186seg" role="group" aria-label="${name}">${opts.map(([v,l])=>`<button type="button" class="${cur===v?'on':''}" data-v186="${name==='סוג'?'kind':'period'}" data-v="${v}" aria-pressed="${cur===v}">${l}</button>`).join('')}</div>`;
 const tools=`<div class="v186bar"><label class="v186q"><span class="v186qi">${IC.search}</span><input type="search" data-v186="q" value="${E(S.q)}" placeholder="חיפוש בטקסט של המודעות והפוסטים" aria-label="חיפוש" autocomplete="off" enterkeyhint="search"></label>
  <div class="v186segs">${seg('סוג',[['','הכל'],['ad','מודעות'],['post','פוסטים'],['shot','צילומי מסך']],S.kind)}${seg('תקופה',[['','כל הזמן'],['7','7 ימים'],['30','30 יום'],['90','90 יום']],S.period)}</div>
  <label class="v186sort"><span>סדר</span><select data-v186="sort"><option value="new"${S.sort==='new'?' selected':''}>חדשים קודם</option><option value="old"${S.sort==='old'?' selected':''}>ישנים קודם</option><option value="eng"${S.sort==='eng'?' selected':''}>הכי הרבה מעורבות</option></select></label></div>`;
 let body;
 if(!list.length)body=`<div class="v186empty"><b>אין פריטים${S.q?' שמתאימים ל"'+E(S.q)+'"':S.comp||S.kind||S.period?' בסינון הזה':''}</b><p>${S.q||S.comp||S.kind||S.period?'נסו לנקות את הסינון או לחפש מילה אחרת.':'הפריטים מגיעים מהמודעות שנלכדות מספריית Meta, מהפוסטים של המתחרים ב-Metricool ומצילומי מסך שמעלים בכרטיס המתחרה.'}</p>${S.q||S.comp||S.kind||S.period?'<button type="button" class="v179b" data-v186="clear">ניקוי הסינון</button>':''}</div>`;
 else if(!S.comp&&!S.q){// grouped by competitor, a few from each, the rest one tap away
  const by=new Map();list.forEach((p,i)=>{const n=nameOf(p);if(!by.has(n))by.set(n,[]);by.get(n).push([p,i])});
  const order=[...by.keys()].sort((a,b)=>by.get(b).length-by.get(a).length||a.localeCompare(b,'he'));
  body=order.map(n=>{const l=by.get(n);const open=!!S.more[n];const show=open?l:l.slice(0,PEEK);const st=stats.find(s=>s.n===n)||{};
   return `<section class="v186sec2" data-comp="${E(n)}"><header class="v186sh"><i class="v186av big" aria-hidden="true">${E(initial(n))}</i><h3>${E(n)}</h3><span class="v186shn">${l.length} ${l.length===1?'פריט':'פריטים'}${st.fresh?` · <b class="v186fresh">${st.fresh} חדשים השבוע</b>`:''}</span><button type="button" class="v186lnk sm" data-v186="comp" data-comp="${E(n)}">רק ${E(n)} ${IC.chev}</button></header>
    <div class="v186grid">${show.map(([p,i])=>card(p,i)).join('')}</div>${!open&&l.length>PEEK?`<button type="button" class="v186more" data-v186="more" data-comp="${E(n)}">עוד ${l.length-PEEK} של ${E(n)}</button>`:''}</section>`}).join('')}
 else{const n=Math.min(list.length,S.page*PAGE);body=`<div class="v186grid flat">${list.slice(0,n).map((p,i)=>card(p,i)).join('')}</div>${n<list.length?`<button type="button" class="v186more" data-v186="page">עוד ${Math.min(PAGE,list.length-n)} מתוך ${list.length-n}</button>`:''}`}
 return `<div class="v186top" tabindex="-1"><button type="button" class="v186x" data-v186="close" aria-label="סגירה" title="סגירת הגלריה">${IC.x}</button><div class="v186tt"><h2>גלריית המתחרים</h2><span class="v186n">${S.comp?`${list.length} של ${E(S.comp)}`:`${num(total)} פריטים · ${stats.length} מתחרים`}</span></div></div>${rail}${tools}<div class="v186body">${body}</div>`}
function openGal(o){if(!V()){toast('הגלריה נטענת, נסו שוב בעוד רגע');return}o=o||{};if(o.comp!=null){S.comp=String(o.comp);S.q='';S.kind='';S.period=''}let g=document.getElementById('v186');if(!g){g=document.createElement('div');g.id='v186';g.className='ov';g.setAttribute('role','dialog');g.setAttribute('aria-modal','true');g.setAttribute('aria-label','גלריית המתחרים');document.body.appendChild(g)}
 S.seen=seenAt();S.page=1;g.innerHTML=galHtml();document.body.classList.add('v186lock');S.open=true;
 try{localStorage.setItem('v188_seen',String(Date.now()))}catch(e){}
 requestAnimationFrame(()=>{const f=g.querySelector(window.matchMedia('(max-width:860px)').matches?'.v186top':'.v186x');f&&f.focus()})}
function renderGal(keep){const g=document.getElementById('v186');if(!g)return;const sc=g.querySelector('.v186body');const top=keep&&sc?sc.scrollTop:0;const ae=document.activeElement;const wasQ=ae&&ae.dataset&&ae.dataset.v186==='q';const sel=wasQ?[ae.selectionStart,ae.selectionEnd]:null;
 g.innerHTML=galHtml();const n=g.querySelector('.v186body');if(n)n.scrollTop=top;if(wasQ){const q=g.querySelector('[data-v186="q"]');if(q){q.focus();try{q.setSelectionRange(sel[0],sel[1])}catch(e){}}}}
function closeAll(){closeView(true);const g=document.getElementById('v186');if(g)g.remove();document.body.classList.remove('v186lock');S.open=false;
 const b=document.querySelector('[data-v186="open"]');b&&b.focus()}

/* ---------- the viewer ---------- */
function adInfo(p){const v9=window.__v179;if(!v9||!p.ad_id)return '';const ad=v9.M.ads.get(String(p.ad_id));if(!ad)return p.ad_title?`<div class="v186sec"><h4>המודעה בספריית Meta</h4><p>${E(p.ad_title)}</p></div>`:'';
 const d=v9.daysOf(ad);return `<div class="v186sec"><h4>המודעה בספריית Meta</h4><p class="v186adt">${E(String(ad.title||'').trim()||'ללא כותרת')}</p><div class="v186chips">${d!=null?`<span class="v186chip2${v9.isStar(ad)?' star':''}">${v9.isStar(ad)?IC.star:''} ${d} ימים באוויר</span>`:''}${ad.status==='inactive'?'<span class="v186chip2 gone">הפסיקה</span>':'<span class="v186chip2">פעילה</span>'}${ad.start?`<span class="v186chip2">מאז ${E(fmtD(ad.start))}</span>`:''}</div>${safeUrl(ad.snapshot_url)?`<a class="v186lnk" href="${E(safeUrl(ad.snapshot_url))}" target="_blank" rel="noopener">לצפייה במודעה ב-Meta ${IC.ext}</a>`:''}</div>`}
function who(p){const c=compOf(p);const name=nameOf(p);const v9=window.__v179;const ads=c&&v9?(v9.M.byComp.get(String(c.id))||[]):[];const s=c&&c.meta_summary||null;const active=s?+s.active:ads.filter(a=>!v9.isGone(a)).length;
 const sub=[c&&(c.focus||c.cat||c.category),active?`${num(active)} מודעות פעילות`:''].filter(Boolean).join(' · ');
 return `<div class="v186who"><i class="v186av big">${E(initial(name))}</i><div><b>${E((c&&c.name)||name)}</b>${sub?`<small>${E(sub)}</small>`:''}</div></div>`}
function compInfo(p){const c=compOf(p);if(!c)return '';const s=c.meta_summary||null;const v9=window.__v179;const ads=v9?(v9.M.byComp.get(String(c.id))||[]):[];const active=ads.filter(a=>!v9.isGone(a)).length,stars=ads.filter(a=>v9.isStar(a)).length;
 const links=Array.isArray(c.meta_library_urls)?c.meta_library_urls.filter(x=>x&&safeUrl(x.url)).slice(0,3):[];
 const site=[c.site,c.fb,c.ig].filter(Boolean).map(u=>safeUrl(/^https?:/.test(u)?u:'https://'+u)).filter(Boolean);
 return `<details class="v186sec v186det"><summary><h4>על המתחרה</h4>${IC.chev}</summary>${c.desc||c.about||c.summary?`<p class="v186desc">${E(String(c.desc||c.about||c.summary).slice(0,320))}</p>`:''}
 ${(s||ads.length)?`<div class="v186kpis"><span><b>${num(s?s.active:active)}</b>פעילות</span><span><b>${num(s?s.stars:stars)}</b>${IC.star} 60 יום ומעלה</span>${s&&s.new7!=null?`<span><b>${num(s.new7)}</b>חדשות ב־7 ימים</span>`:''}${s&&s.groups!=null?`<span><b>${num(s.groups)}</b>קבוצות מסרים</span>`:''}</div>${s&&s.last_scan?`<small class="v186muted">סריקה אחרונה ${E(String(s.last_scan).replace(/^scan_(\d{4})(\d{2})(\d{2})T.*$/,'$3.$2.$1'))}${s.partial?' · תוצאות חלקיות':''}</small>`:''}`:''}
 ${links.length||site.length?`<div class="v186links">${links.map(x=>`<a class="v186lnk" href="${E(safeUrl(x.url))}" target="_blank" rel="noopener">${E(/חיפוש/.test(x.label)?'חיפוש בספריית Meta':'ספריית Meta: '+x.label)} ${IC.ext}</a>`).join('')}${site.slice(0,2).map(u=>`<a class="v186lnk" href="${E(u)}" target="_blank" rel="noopener">${E(u.replace(/^https?:\/\/(www\.)?/,'').replace(/\/$/,'').slice(0,32))} ${IC.ext}</a>`).join('')}</div>`:''}</details>`}
function postInfo(p){const v=V();const k=kindOf(p);const d=fmtD(dateOf(p));
 if(isMeta(p)){const land=safeUrl(p.landing);return `<div class="v186sec"><div class="v186when"><time>${E(adStart(p)?'באוויר מאז '+fmtD(adStart(p)):p.start?'באוויר מאז '+p.start:d)}</time><span class="v186chips"><span class="v186chip2">${p.media==='video'?'סרטון':'תמונה'}</span>${+p.copies>1?`<span class="v186chip2">${p.copies} גרסאות</span>`:''}<span class="v186chip2 ok" dir="ltr">4K</span></span></div>${p.note?`<p class="v186txt">${E(p.note)}</p>`:'<p class="v186muted">מודעה בלי טקסט</p>'}${p.cta||land?`<p class="v186fine v186muted">${p.cta?'כפתור: '+E(p.cta):''}${p.cta&&land?' · ':''}${land?'נחיתה: <bdi dir="ltr">'+E(land.replace(/^https?:\/\//,'').slice(0,60))+'</bdi>':''}</p>`:''}<div class="v186links">${safeUrl(p.creative)?`<a class="v186lnk" href="${E(safeUrl(p.creative))}" target="_blank" rel="noopener">התמונה של המודעה בלבד${p.cw?` <bdi dir="ltr">${p.cw}×${p.ch}</bdi>`:''} ${IC.ext}</a>`:''}${land?`<a class="v186lnk" href="${E(land)}" target="_blank" rel="noopener">דף הנחיתה ${IC.ext}</a>`:''}</div></div>${adInfo(p)}`}
 if(k!=='post')return `<div class="v186sec"><div class="v186when"><time>הועלה ${E(d)}</time><span class="v186chips">${p.ew&&p.eh?`<span class="v186chip2 ok" dir="ltr">${p.ew}×${p.eh}</span>`:p.w&&p.h?`<span class="v186chip2" dir="ltr">${p.w}×${p.h}</span>`:''}${p.enh?'<span class="v186chip2 ok">שופר</span>':''}</span></div>${p.note?`<p class="v186txt">${E(p.note)}</p>`:'<p class="v186muted">צילום מסך בלי הערה</p>'}</div>${adInfo(p)}`;
 return `<div class="v186sec"><div class="v186when"><time>${E(d)}</time><span class="v186chips"><span class="v186chip2">פייסבוק</span></span></div>${v.engHtml(p)}<p class="v186txt">${p.text?E(p.text):'<span class="v186muted">פוסט בלי טקסט</span>'}</p>${safeUrl(p.link)?`<a class="v186lnk" href="${E(safeUrl(p.link))}" target="_blank" rel="noopener">לפוסט בפייסבוק ${IC.ext}</a>`:''}</div>`}
function viewHtml(){const p=S.list[S.i];const v=V();const src=stageSrc(p);const full=v.isShot(p)?v.fullOf(p):(p.thumb||safeUrl(p.image));const n=S.list.length;const name=nameOf(p);const ex=textOf(p).replace(/\s+/g,' ').slice(0,140);
 return `<div class="v186vbg" data-v186="vclose"></div>
 <div class="v186vtop"><button type="button" class="v186x" data-v186="vclose" aria-label="סגירה" title="חזרה לגלריה">${IC.x}</button><div class="v186vwho"><i class="v186av" aria-hidden="true">${E(initial(name))}</i><b>${E(name)}</b><time>${E(fmtD(dateOf(p)))}</time></div><span class="v186vn">${S.i+1} מתוך ${n}</span><button type="button" class="v186ib" data-v186="zoom" aria-pressed="${S.zoom}" aria-label="הגדלה">${IC.zoom}</button></div>
 <div class="v186stage${S.zoom?' zoom':''}" data-v186="stage"><img src="${E(src)}" alt="${E(name)}" decoding="async" referrerpolicy="no-referrer" draggable="false" data-v186img></div>
 ${n>1?`<button type="button" class="v186nav prev" data-v186="prev" aria-label="התמונה הקודמת">${IC.r}</button><button type="button" class="v186nav next" data-v186="next" aria-label="התמונה הבאה">${IC.l}</button>`:''}
 <aside class="v186info${S.sheet?' up':''}" aria-label="פרטי המתחרה והפוסט"><button type="button" class="v186grip" data-v186="sheet" aria-expanded="${S.sheet}"><i></i><span class="v186gw"><b>${E(name)}</b><time>${E(fmtD(dateOf(p)))}</time></span><span class="v186gx">${ex?E(ex):'<span class="v186muted">בלי טקסט</span>'}</span></button>
  <div class="v186peek"><button type="button" class="v179b pri big" data-v186="clone" data-id="${E(p.id)}">${IC.wand} שכפל למותג שלנו</button></div>
  <div class="v186ib2">${who(p)}
  <div class="v186acts"><button type="button" class="v179b pri big" data-v186="clone" data-id="${E(p.id)}">${IC.wand} שכפל למותג שלנו</button><div class="v186acts2">${full?`<a class="v179b" href="${E(full)}" target="_blank" rel="noopener">בגודל מלא ${IC.ext}</a>`:''}<button type="button" class="v179b" data-v186="details" data-id="${E(p.id)}">כל הפרטים</button></div></div>
  ${postInfo(p)}
  <p class="v186muted v186fine">Claude כותב גרסה מקורית בטקסט, בצבעים ובפונט של המותג שלנו, עם התמונות שלנו. שום דבר לא מתפרסם לבד.</p>${compInfo(p)}</div></aside>`}
function openView(i){if(!S.list.length)return;S.i=(i+S.list.length)%S.list.length;S.zoom=false;let m=document.getElementById('v186v');if(!m){m=document.createElement('div');m.id='v186v';m.className='ov';m.setAttribute('role','dialog');m.setAttribute('aria-modal','true');m.setAttribute('aria-label','תמונה של מתחרה');document.body.appendChild(m)}
 m.innerHTML=viewHtml();m.querySelector('.v186vtop').setAttribute('tabindex','-1');S.sheet=S.sheet&&window.matchMedia('(max-width:860px)').matches?S.sheet:false;
 // preload the neighbours so arrows feel instant
 [S.i+1,S.i-1].forEach(j=>{const q=S.list[(j+S.list.length)%S.list.length];if(q){const pre=new Image();pre.referrerPolicy='no-referrer';pre.src=stageSrc(q)}});
 try{if(V().keep&&!V().isShot(S.list[S.i]))V().keep(S.list[S.i].id)}catch(e){}
 requestAnimationFrame(()=>{const f=m.querySelector(window.matchMedia('(max-width:860px)').matches?'.v186vtop':'.v186x');f&&f.focus()})}
function closeView(silent){const m=document.getElementById('v186v');if(m)m.remove();S.i=-1;if(!silent){const g=document.getElementById('v186');const b=g&&g.querySelector('.v186x');b&&b.focus()}}
function step(d){if(S.i<0)return;openView(S.i+d)}

/* ---------- events ---------- */
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-v186]');if(!b)return;const a=b.dataset.v186;if(a==='sort'||a==='q'||a==='stage')return;e.preventDefault();e.stopPropagation();
 if(a==='open'){openGal(b.dataset.comp!=null?{comp:b.dataset.comp}:{});return}
 if(a==='close'){closeAll();return}
 if(a==='view'){openView(+b.dataset.i);return}
 if(a==='vclose'){closeView();return}
 if(a==='prev'){step(-1);return}if(a==='next'){step(1);return}
 if(a==='comp'){S.comp=b.dataset.comp||'';S.page=1;renderGal(false);return}
 if(a==='kind'){S.kind=b.dataset.v||'';S.page=1;renderGal(true);return}
 if(a==='period'){S.period=b.dataset.v||'';S.page=1;renderGal(true);return}
 if(a==='more'){S.more[b.dataset.comp]=true;renderGal(true);return}
 if(a==='page'){S.page++;renderGal(true);return}
 if(a==='clear'){S.comp='';S.kind='';S.period='';S.q='';S.page=1;renderGal(false);return}
 if(a==='zoom'){S.zoom=!S.zoom;const st=document.querySelector('#v186v .v186stage');if(st)st.classList.toggle('zoom',S.zoom);b.setAttribute('aria-pressed',S.zoom);return}
 if(a==='sheet'){S.sheet=!S.sheet;const i=b.closest('.v186info');i&&i.classList.toggle('up',S.sheet);b.setAttribute('aria-expanded',S.sheet);return}
 if(a==='clone'){const id=b.dataset.id;closeView(true);const g=document.getElementById('v186');if(g)g.classList.add('v186park');try{V().openGen(id)}catch(x){}syncOv();
  const poll=setInterval(()=>{const g2=document.getElementById('v186');if(!g2){clearInterval(poll);return}if(!document.getElementById('v181g')&&!document.body.classList.contains('pe-open')){g2.classList.remove('v186park');clearInterval(poll)}},300);return}
 if(a==='details'){try{V().openDetail(b.dataset.id)}catch(x){}syncOv();return}
},true);
// a tap on the picture itself toggles the zoom, like a photo app
document.addEventListener('click',e=>{const im=e.target.closest&&e.target.closest('#v186v [data-v186img]');if(!im||S.dragged)return;const st=im.closest('.v186stage');S.zoom=!S.zoom;st.classList.toggle('zoom',S.zoom);const z=document.querySelector('#v186v [data-v186="zoom"]');z&&z.setAttribute('aria-pressed',S.zoom)});
document.addEventListener('change',e=>{const t=e.target;if(!t||!t.dataset||t.dataset.v186!=='sort')return;S.sort=t.value;renderGal(true)});
let qt=0;document.addEventListener('input',e=>{const t=e.target;if(!t||!t.dataset||t.dataset.v186!=='q')return;clearTimeout(qt);const v=t.value;qt=setTimeout(()=>{S.q=v.trim();S.page=1;renderGal(false)},220)});
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
try{new MutationObserver(()=>{const g=document.getElementById('v186');if(g&&g.classList.contains('v186park')&&!document.getElementById('v179g')&&!document.getElementById('v181g')&&!document.body.classList.contains('pe-open'))g.classList.remove('v186park');syncOv()}).observe(document.body,{childList:true,attributes:true,attributeFilter:['class']})}catch(e){}
window.__v186={S,openGal,openView,closeAll,items};
})();
