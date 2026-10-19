/*V194:START*/
// ================= V194 · the competitors page shows the ads first. The page opens on what the competitors are running:
// every ad captured from the Meta Ads Library and every Facebook post, with the versions of one campaign (same text) stacked
// into one card, so 13 copies of the same message read as one campaign with 13 versions instead of 13 tiles. Each card says
// who, how long it has been running, how many versions, picture or video, and the button. Sorted by what works (a campaign
// that keeps running and keeps getting new versions is one the competitor is paying for), by newest, or by longest running;
// filtered by competitor, picture or video, and text. A tap opens the viewer (V186) on that campaign's versions. The competitor
// cards (research, inspired posts, Meta pages) sit one tab away under "מתחרים".
(()=>{
if(window.__v194)return;window.__v194=1;
const E=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const V=()=>window.__v181||null,G6=()=>window.__v186||null;
const SVG=(d,w)=>`<svg width="${w||16}" height="${w||16}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const IC={play:SVG('<path d="M8 5.5v13l11-6.5z" fill="currentColor" stroke="none"/>',14),search:SVG('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
 wand:SVG('<path d="m15 4 1 2 2 1-2 1-1 2-1-2-2-1 2-1zM4 20l9-9M11 9l4 4"/>',15),layers:SVG('<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',14),
 clock:SVG('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',14),x:SVG('<path d="M6 6l12 12M18 6 6 18"/>',14)};
// the page always opens on their ads (all the posts). The tab is not remembered between visits, so a device
// where the cards tab was once chosen does not keep hiding the posts behind it.
let tabSaved='ads';try{localStorage.removeItem('v194_tab')}catch(e){}
const S={tab:tabSaved==='comps'?'comps':'ads',sort:'top',fmt:'',comp:'',q:'',page:1,sig:''};
const PAGE=24;
const safeUrl=u=>{try{const x=new URL(String(u||''));return /^https?:$/.test(x.protocol)?x.href:''}catch(e){return ''}};
const num=n=>(+n||0).toLocaleString('he-IL');
const isShot=p=>{try{return V().isShot(p)}catch(e){return false}};
const isMeta=p=>{try{return V().isMeta(p)}catch(e){return false}};
const nameOf=p=>{try{return V().shortName(p)}catch(e){return String(p.comp_name||'')}};
const textOf=p=>String(isShot(p)?(p.note||p.ad_title||''):(p.text||''));
const initial=n=>String(n||'?').trim().replace(/^["'„]+/,'').slice(0,1)||'?';
// the picture a tile shows: the ad's own picture for Meta captures (the card around it is for the viewer), the post picture otherwise
const srcOf=p=>{const v=V();if(!v)return '';if(isShot(p))return (isMeta(p)&&safeUrl(p.creative))||(isMeta(p)&&safeUrl(p.prev))||v.fullOf(p)||'';return p.thumb||v.srcOf(p)||''};
// "12 באוק' 2026" as written by the Meta Ads Library, or the start date from the ads table
const MON={'ינו':0,'פבר':1,'מרץ':2,'מרס':2,'אפר':3,'מאי':4,'יונ':5,'יול':6,'אוג':7,'ספט':8,'אוק':9,'נוב':10,'דצמ':11};
function startOf(p){try{const a=p.ad_id&&window.__v179&&__v179.M.ads.get(String(p.ad_id));const t=a&&+a.start;if(t)return t>1e12?t:t*1000}catch(e){}
 const m=String(p.start||'').match(/(\d{1,2})\s*ב?([א-ת]{3})[א-ת']*\s*(\d{4})/);if(m&&MON[m[2]]!=null)return Date.UTC(+m[3],MON[m[2]],+m[1]);
 const t=Date.parse(String(isShot(p)?'':(p.published||'')));return isNaN(t)?0:t}
const seenAt=p=>{const t=Date.parse(String(p.added||p.first_seen||p.published||''));return isNaN(t)?0:t};
const isVideo=p=>p.media==='video';
// one campaign: the same competitor with the same words (spaces, punctuation and emoji do not count)
const keyOf=p=>{const t=textOf(p).toLowerCase().replace(/[^0-9a-z֐-׿]+/g,'').slice(0,70);return nameOf(p)+'|'+(t.length>=12?t:'#'+p.id)};
function campaigns(){const v=V();if(!v)return [];const by=new Map();
 v.allItems().forEach(p=>{if(!srcOf(p))return;const k=keyOf(p);let c=by.get(k);if(!c){c={k,items:[],name:nameOf(p),start:0,seen:0,versions:0,video:0,eng:0,active:false};by.set(k,c)}
  c.items.push(p);c.versions+=Math.max(1,+p.copies||1);if(isVideo(p))c.video++;c.eng=Math.max(c.eng,+p.eng||0);if(p.status!=='inactive')c.active=true;
  const s=startOf(p);if(s&&(!c.start||s<c.start))c.start=s;const n=seenAt(p);if(n>c.seen)c.seen=n});
 const now=Date.now();
 const out=[...by.values()].map(c=>{
  // the lead picture: the sharpest picture of the set, a still before a video poster when both exist
  c.items.sort((a,b)=>(isVideo(a)-isVideo(b))||((+b.cw||0)*(+b.ch||0))-((+a.cw||0)*(+a.ch||0)));c.lead=c.items[0];
  c.days=c.start?Math.max(0,Math.floor((now-c.start)/864e5)):null;c.text=textOf(c.lead).trim();c.post=!isShot(c.lead);
  // what works: kept running and kept getting new versions, plus engagement for Facebook posts
  c.score=Math.log2(1+c.versions)*3+Math.min(c.days||0,90)/15+(c.active?1:0)+(c.eng?Math.log10(1+c.eng):0);
  return c});
 // "עובד להם" only for the top tenth that has also been running three weeks or more
 const sc=out.map(c=>c.score).sort((a,b)=>b-a);const cut=sc[Math.max(0,Math.ceil(sc.length*.1)-1)]||Infinity;out.forEach(c=>{c.hot=c.score>=cut&&(c.days||0)>=21});return out}
function filtered(all){let l=all;
 if(S.comp)l=l.filter(c=>c.name===S.comp);
 if(S.fmt==='video')l=l.filter(c=>c.video>0);else if(S.fmt==='image')l=l.filter(c=>c.video<c.items.length);
 if(S.q){const q=S.q.toLowerCase();l=l.filter(c=>(c.name+' '+c.items.map(textOf).join(' ')+' '+(c.lead.cta||'')).toLowerCase().includes(q))}
 const by={top:(a,b)=>b.score-a.score,new:(a,b)=>(b.start||b.seen)-(a.start||a.seen),long:(a,b)=>(b.days||0)-(a.days||0)||b.versions-a.versions}[S.sort]||((a,b)=>b.score-a.score);
 return l.slice().sort(by)}
const headline=t=>{const s=String(t||'').replace(/\s+/g,' ').trim();const m=s.match(/^(.{20,110}?[.!?…])(\s|$)/);return (m?m[1]:s.slice(0,110)+(s.length>110?'…':''))};
const runLabel=d=>d==null?'':d===0?'עלה היום':d===1?'רץ מאתמול':`רץ ${d} ימים`;

/* ---------- the page ---------- */
function card(c,i){const p=c.lead;const src=srcOf(p);const strong=c.hot;
 const chips=[c.versions>1?`<span class="v194chip">${IC.layers} ${c.versions} גרסאות</span>`:'',c.video?`<span class="v194chip">${IC.play} ${c.video===c.items.length?'סרטון':'גם סרטון'}</span>`:'',c.post?`<span class="v194chip">פוסט${c.eng?' · '+num(c.eng)+' מעורבות':''}</span>`:'',p.cta&&!(c.versions>1&&c.video)?`<span class="v194chip soft">${E(String(p.cta).slice(0,22))}</span>`:''].filter(Boolean).join('');
 return `<article class="v194c${strong?' hot':''}"><button type="button" class="v194t" data-v194="view" data-k="${E(c.k)}" aria-label="${E(c.name)}: ${E(headline(c.text)||'מודעה')}${c.versions>1?', '+c.versions+' גרסאות':''}">
  <span class="v194im"><img src="${E(src)}" alt="" ${i<8?'':'loading="lazy" '}decoding="async" referrerpolicy="no-referrer"${p.cw?` width="${+p.cw}" height="${+p.ch}"`:''}></span>${c.video?`<span class="v194play" aria-hidden="true">${IC.play}</span>`:''}</button>
  <div class="v194b"><div class="v194who"><i class="v186av" aria-hidden="true">${E(initial(c.name))}</i><b>${E(c.name)}</b>${c.days!=null?`<span class="v194run">${IC.clock}${E(runLabel(c.days))}</span>`:''}</div>
  ${c.text?`<p class="v194h">${E(headline(c.text))}</p>`:'<p class="v194h muted">מודעה בלי טקסט</p>'}<div class="v194chips">${strong?'<span class="v194chip hot">עובד להם</span>':''}${chips}</div>
  <button type="button" class="v194clone" data-v194="clone" data-id="${E(p.id)}">${IC.wand} שכפל למותג שלנו</button></div></article>`}
function kpis(all){const ads=all.reduce((s,c)=>s+c.items.length,0);const wk=Date.now()-7*864e5;const fresh=all.filter(c=>(c.start||c.seen)>=wk).length;const vid=all.filter(c=>c.video).length;
 const comps=new Set(all.map(c=>c.name)).size;
 return `<div class="v194k"><span><b>${num(all.length)}</b>קמפיינים</span><span class="v194kx"><b>${num(ads)}</b>מודעות ופוסטים</span><span class="v194kx"><b>${num(comps)}</b>מתחרים</span><span><b>${num(fresh)}</b>חדשים השבוע</span><span><b>${all.length?Math.round(vid*100/all.length):0}%</b>עם סרטון</span></div>`}
function html(){const all=campaigns();const nComp=(()=>{try{return compList().length}catch(e){return 0}})();
 const tabs=`<div class="v194tabs" role="tablist" aria-label="תצוגה"><button type="button" role="tab" data-v194="tab" data-v="ads" aria-selected="${S.tab==='ads'}" class="${S.tab==='ads'?'on':''}">מה הם מפרסמים<small>${num(all.length)}</small></button><button type="button" role="tab" data-v194="tab" data-v="comps" aria-selected="${S.tab==='comps'}" class="${S.tab==='comps'?'on':''}">כרטיסי המתחרים<small>${num(nComp)}</small></button></div>`;
 if(S.tab!=='ads')return tabs;
 if(!all.length)return tabs+`<div class="v194empty"><b>עוד אין מודעות של מתחרים</b><p>המודעות נאספות מספריית המודעות של Meta בכל בוקר, והפוסטים מ-Metricool. אפשר גם להעלות צילום מסך בכרטיס של מתחרה.</p></div>`;
 const list=filtered(all);const counts=new Map();all.forEach(c=>counts.set(c.name,(counts.get(c.name)||0)+1));
 const names=[...counts.keys()].sort((a,b)=>counts.get(b)-counts.get(a)||a.localeCompare(b,'he'));
 const seg=(a,opts,cur,label)=>`<div class="v194seg" role="group" aria-label="${label}">${opts.map(([v,l])=>`<button type="button" data-v194="${a}" data-v="${v}" class="${cur===v?'on':''}" aria-pressed="${cur===v}">${l}</button>`).join('')}</div>`;
 const n=Math.min(list.length,S.page*PAGE);
 return tabs+kpis(all)+`<div class="v194bar"><label class="v194q"><span aria-hidden="true">${IC.search}</span><input type="search" data-v194="q" value="${E(S.q)}" placeholder="חיפוש במילים של המודעות" aria-label="חיפוש במודעות" autocomplete="off" enterkeyhint="search">${S.q?`<button type="button" class="v194qx" data-v194="qx" aria-label="ניקוי החיפוש">${IC.x}</button>`:''}</label>
  <div class="v194segs">${seg('sort',[['top','מה עובד'],['new','חדשים'],['long','הכי ותיקים']],S.sort,'סדר')}${seg('fmt',[['','הכל'],['image','תמונה'],['video','סרטון']],S.fmt,'סוג')}</div></div>
  <div class="v194comps" role="group" aria-label="מתחרה"><button type="button" data-v194="comp" data-v="" class="${S.comp?'':'on'}" aria-pressed="${!S.comp}">כל המתחרים</button>${names.map(nm=>`<button type="button" data-v194="comp" data-v="${E(nm)}" class="${S.comp===nm?'on':''}" aria-pressed="${S.comp===nm}"><i class="v186av" aria-hidden="true">${E(initial(nm))}</i>${E(nm)}<small>${counts.get(nm)}</small></button>`).join('')}</div>
  <p class="v194note">${S.sort==='top'?'למעלה: קמפיינים שרצים הרבה זמן ומקבלים עוד ועוד גרסאות. מתחרה לא ממשיך לשלם על מודעה שלא עובדת.':S.sort==='long'?'הקמפיינים שרצים הכי הרבה זמן.':'מה עלה לאחרונה.'} ${list.length!==all.length?`<b>${num(list.length)} מתוך ${num(all.length)}</b>`:''}</p>
  ${list.length?`<div class="v194grid">${list.slice(0,n).map(card).join('')}</div>${n<list.length?`<button type="button" class="v194more" data-v194="more">עוד ${Math.min(PAGE,list.length-n)} קמפיינים <small>נשארו ${num(list.length-n)}</small></button>`:''}`:`<div class="v194empty"><b>אין קמפיינים בסינון הזה</b><p>נסו מילה אחרת או את כל המתחרים.</p><button type="button" class="v179b" data-v194="clear">ניקוי הסינון</button></div>`}`}
function box(){return document.getElementById('appviews')}
function mount(force){if(typeof APP==='undefined'||APP.view!=='competitors'){return}const b=box();if(!b)return;let m=document.getElementById('v194');
 if(m&&!force)return;const fresh=!m;if(!m){m=document.createElement('section');m.id='v194';m.setAttribute('aria-label','המודעות של המתחרים')}
 const ae=document.activeElement;const wasQ=ae&&ae.dataset&&ae.dataset.v194==='q';const sel=wasQ?[ae.selectionStart,ae.selectionEnd]:null;
 m.innerHTML=html();if(fresh)b.prepend(m);b.classList.toggle('v194ads',S.tab==='ads');S.sig=sig();
 if(wasQ){const q=m.querySelector('[data-v194="q"]');if(q){q.focus();try{q.setSelectionRange(sel[0],sel[1])}catch(e){}}}watchMore()}
const sig=()=>{try{return V().allItems().length+':'+(window.__v179?__v179.M.ads.size:0)}catch(e){return ''}};
// leaving the page takes the "ads only" class off the shared view box, or the next page (Ad library, Analyze, Fonts...) stays blank
try{render=(f=>function(){const r=f.apply(this,arguments);try{if(typeof APP!=='undefined'&&APP.view!=='competitors'){const b=box();if(b&&b.classList.contains('v194ads'))b.classList.remove('v194ads')}}catch(e){}return r})(render)}catch(e){}
// the page re-renders on every snapshot; put the feed back each time, and refresh it when new ads arrive
try{new MutationObserver(()=>{try{if(typeof APP!=='undefined'&&APP.view==='competitors'&&!document.getElementById('v194'))mount()}catch(e){}}).observe(document.body,{childList:true,subtree:true})}catch(e){}
setInterval(()=>{try{if(typeof APP!=='undefined'&&APP.view==='competitors'&&S.tab==='ads'&&document.getElementById('v194')&&sig()!==S.sig&&!document.querySelector('#v194 [data-v194="q"]:focus'))mount(true)}catch(e){}},2500);
// the next page loads on its own when the end comes into view
let io=null;function watchMore(){try{if(io)io.disconnect();const b=document.querySelector('#v194 [data-v194="more"]');if(!b||!('IntersectionObserver' in window))return;io=new IntersectionObserver(es=>{if(es.some(x=>x.isIntersecting)){io.disconnect();S.page++;mount(true)}},{rootMargin:'600px 0px'});io.observe(b)}catch(e){}}

/* ---------- the viewer: the campaign's versions in V186 ---------- */
function openCampaign(k){const c=campaigns().find(x=>x.k===k);const g=G6();if(!c||!g)return;
 g.S.list=c.items.slice().sort((a,b)=>(+b.cw||0)*(+b.ch||0)-(+a.cw||0)*(+a.ch||0));g.S.open=true;g.S.sheet=false;g.openView(0)}
// when the viewer closes and no gallery is open, the gallery's keys go quiet again
try{new MutationObserver(()=>{const g=G6();if(g&&g.S.open&&!document.getElementById('v186v')&&!document.getElementById('v186'))g.S.open=false}).observe(document.body,{childList:true})}catch(e){}

/* ---------- events ---------- */
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-v194]');if(!b)return;const a=b.dataset.v194;if(a==='q')return;e.preventDefault();e.stopPropagation();
 if(a==='tab'){S.tab=b.dataset.v==='comps'?'comps':'ads';mount(true);return}
 if(a==='view'){openCampaign(b.dataset.k);return}
 if(a==='clone'){try{V().openGen(b.dataset.id)}catch(x){}return}
 if(a==='more'){S.page++;mount(true);return}
 if(a==='sort'||a==='fmt'||a==='comp'){S[a]=b.dataset.v||'';S.page=1;mount(true);const t=document.getElementById('v194');if(t&&t.getBoundingClientRect().top<0)t.scrollIntoView({block:'start'});return}
 if(a==='qx'){S.q='';S.page=1;mount(true);return}
 if(a==='clear'){S.q='';S.comp='';S.fmt='';S.page=1;mount(true);return}
},true);
let qt=0;document.addEventListener('input',e=>{const t=e.target;if(!t||!t.dataset||t.dataset.v194!=='q')return;clearTimeout(qt);const v=t.value;qt=setTimeout(()=>{S.q=v.trim();S.page=1;mount(true)},220)});
// keep a copy of every competitor Facebook post picture in our storage: Facebook's link expires after a few days, our copy
// stays. V181's keep() queues them one at a time and skips the ones already kept or already expired.
let kept=false;function keepAll(){if(kept)return;const v=V();if(!v||!v.keep||typeof APP==='undefined'||!APP.db)return;const posts=v.allItems().filter(p=>!isShot(p));if(!posts.length)return;kept=true;posts.forEach(p=>{try{v.keep(p.id)}catch(e){}})}
setInterval(()=>{try{keepAll()}catch(e){}},5000);
window.__v194={S,campaigns,filtered,mount,keyOf,startOf};
})();
/*V194:END*/
