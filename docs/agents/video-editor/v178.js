// ================= V178 · "שכפול לאפיק הנחל": any post becomes a copy in the brand of Afik HaNahal, the group's
// marketing and brokerage company. The copy lives in its own tab. Drawing is the same layout; while an Afik post is
// drawn, every colour the layout paints is mapped to Afik's palette, the logo is Afik's, and the brand words change.
// Photos are never recoloured. Brand facts come from afikhanahal.co.il (logo.svg, site colours, title, phone).
(()=>{
if(window.__v178)return;window.__v178=1;
const E=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const I=n=>{try{return ico(n,16)}catch(e){return ''}};

/* ---------- the brand ---------- */
const AFIK={id:'afik',name:'אפיק הנחל',en:'AFIK HANACHAL',line:'ייזום, שיווק ותיווך',about:'מומחים בשיווק ותיווך בשרון ובמרכז',site:'afikhanahal.co.il',phone:'055-981-1814',
 // site colours: #09090F night, #E8E4D8 cream, #8490D8 periwinkle, #82F67F green. #3E4796 and #5A63BE are deeper periwinkles so text stays readable.
 pal:{night:'#09090F',cream:'#E8E4D8',peri:'#8490D8',deep:'#3E4796',accent:'#5A63BE',green:'#82F67F'}};
const MAP={'#07293a':AFIK.pal.night,'#105572':AFIK.pal.deep,'#8fb6c8':AFIK.pal.peri,'#f7f8fa':AFIK.pal.cream,'#a90b0c':AFIK.pal.accent,'#ffd47a':AFIK.pal.green,'#d4a73a':AFIK.pal.green};

/* ---------- colour mapping ---------- */
function hex2(n){return n.toString(16).padStart(2,'0')}
function parse(c){c=String(c).trim().toLowerCase();let m;
 if((m=c.match(/^#([0-9a-f]{3})$/)))return {r:parseInt(m[1][0]+m[1][0],16),g:parseInt(m[1][1]+m[1][1],16),b:parseInt(m[1][2]+m[1][2],16),a:1};
 if((m=c.match(/^#([0-9a-f]{6})([0-9a-f]{2})?$/)))return {r:parseInt(m[1].slice(0,2),16),g:parseInt(m[1].slice(2,4),16),b:parseInt(m[1].slice(4,6),16),a:m[2]?parseInt(m[2],16)/255:1};
 if((m=c.match(/^rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)(?:[ ,/]+([\d.]+%?))?\s*\)$/))){let a=m[4]==null?1:m[4].endsWith('%')?parseFloat(m[4])/100:+m[4];return {r:+m[1],g:+m[2],b:+m[3],a}}
 return null}
function hsl(r,g,b){r/=255;g/=255;b/=255;const mx=Math.max(r,g,b),mn=Math.min(r,g,b),l=(mx+mn)/2;let h=0,s=0;if(mx!==mn){const d=mx-mn;s=l>.5?d/(2-mx-mn):d/(mx+mn);h=mx===r?(g-b)/d+(g<b?6:0):mx===g?(b-r)/d+2:(r-g)/d+4;h*=60}return {h,s,l}}
function rgbOf(h,s,l){h/=360;const f=(p,q,t)=>{if(t<0)t+=1;if(t>1)t-=1;return t<1/6?p+(q-p)*6*t:t<1/2?q:t<2/3?p+(q-p)*(2/3-t)*6:p};if(!s){const v=Math.round(l*255);return {r:v,g:v,b:v}}const q=l<.5?l*(1+s):l+s-l*s,p=2*l-q;return {r:Math.round(f(p,q,h+1/3)*255),g:Math.round(f(p,q,h)*255),b:Math.round(f(p,q,h-1/3)*255)}}
const out=(c,a)=>a>=1?'#'+hex2(c.r)+hex2(c.g)+hex2(c.b):`rgba(${c.r},${c.g},${c.b},${+a.toFixed(3)})`;
const cache=new Map();
function mapColor(v){if(typeof v!=='string')return v;const k=v;if(cache.has(k))return cache.get(k);let res=v;const c=parse(v);
 if(c){const hx='#'+hex2(c.r)+hex2(c.g)+hex2(c.b);
  if(MAP[hx]){const t=parse(MAP[hx]);res=out(t,c.a)}
  else{const {h,s,l}=hsl(c.r,c.g,c.b);
   if(s>.18&&h>=172&&h<=222){const t=l<.16?parse(AFIK.pal.night):rgbOf(232,Math.min(.55,s*.75),l);res=out(t,c.a)}            // the navy and teal family
   else if(s>.45&&(h>=342||h<=14)&&l>.18&&l<.6){res=out(rgbOf(233,.45,Math.max(.4,Math.min(.56,l+.12))),c.a)}               // Kurkoos red
   else if(l>.9&&l<.995&&s<.4&&h>=180&&h<=230){res=out(parse(AFIK.pal.cream),c.a)}                                            // paper tints
   else if(s>.6&&h>=36&&h<=52&&l>.55){res=out(parse(AFIK.pal.green),c.a)}}}                                                    // gold numbers
 cache.set(k,res);if(cache.size>4000)cache.clear();return res}

/* ---------- words on the canvas ---------- */
const WORDS=[[/קבוצת קורקוס/g,AFIK.name],[/www\.kurkoos-group\.co\.il/gi,'www.'+AFIK.site],[/kurkoos-group\.co\.il/gi,AFIK.site],[/KURKOOS GROUP/g,AFIK.en],[/Kurkoos Group/g,'Afik Hanachal'],[/KURKOOS/g,'AFIK'],[/מקרקע ועד מסירת מפתח/g,AFIK.line],[/קורקוס/g,AFIK.name]];
const swapWords=t=>{let s=String(t);WORDS.forEach(([a,b])=>{s=s.replace(a,b)});return s};

/* ---------- the Afik logo, in the same frame the engine uses for its logo (700 x 829) ---------- */
function logoSvg(col){return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 829" width="700" height="829"><g transform="translate(-50 96) scale(1.75)" fill="none" stroke="${col}" stroke-width="11" stroke-linecap="butt"><line x1="182" y1="46" x2="52" y2="308"/><line x1="182" y1="46" x2="312" y2="308"/><line x1="272" y1="46" x2="272" y2="308"/><line x1="404" y1="46" x2="404" y2="308"/><line x1="118" y1="191" x2="404" y2="191"/></g><g fill="${col}" font-family="'Helvetica Neue',Helvetica,Arial,sans-serif" text-anchor="middle"><text x="350" y="737" font-size="35" font-weight="300" letter-spacing="14">AFIK HANACHAL</text><text x="350" y="793" font-size="24.5" font-weight="500" letter-spacing="8.75">REAL ESTATE</text></g></svg>`}
const LOGO={};['white','black'].forEach(k=>{const im=new Image();im.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(logoSvg(k==='white'?'#ffffff':AFIK.pal.night));LOGO[k]=im});

/* ---------- drawing an Afik post ---------- */
let ON=0;const P=CanvasRenderingContext2D.prototype,G=window.CanvasGradient&&CanvasGradient.prototype;
function hook(proto,prop){const d=Object.getOwnPropertyDescriptor(proto,prop);if(!d||!d.set)return;Object.defineProperty(proto,prop,{configurable:true,enumerable:d.enumerable,get:d.get,set(v){return d.set.call(this,ON?mapColor(v):v)}})}
['fillStyle','strokeStyle','shadowColor'].forEach(k=>hook(P,k));
if(G){const a=G.addColorStop;G.addColorStop=function(o,c){return a.call(this,o,ON?mapColor(c):c)}}
['fillText','strokeText'].forEach(k=>{const f=P[k];P[k]=function(t,...r){return f.call(this,ON?swapWords(t):t,...r)}});
{const f=P.measureText;P.measureText=function(t){return f.call(this,ON?swapWords(t):t)}}
// the older Kurkoos wordmark images (built from an svg that spells KURKOOS) are left out: the Afik logo is drawn by the logo layer
{const f=P.drawImage;P.drawImage=function(im){if(ON&&im&&typeof im.src==='string'&&im.src.startsWith('data:image/svg')&&/KURK/.test(im.src))return;return f.apply(this,arguments)}}
const isAfik=p=>!!(p&&p.brand==='afik');
try{drawSlide=(f=>function(cv,p){if(!isAfik(p))return f.apply(this,arguments);const keep=window.__lockIM;ON++;try{if(LOGO.white.complete&&LOGO.black.complete)window.__lockIM=LOGO;return f.apply(this,arguments)}finally{ON--;window.__lockIM=keep}})(drawSlide)}catch(e){console.error('v178 draw',e)}
// the small lockup some layouts stamp on their own, and the tower mark inside layouts, become Afik's
try{const lk=window.__lockup;if(typeof lk==='function')window.__lockup=function(c,x,y,h,dark){if(ON&&LOGO.white.complete&&LOGO.white.naturalWidth){const im=LOGO[dark?'white':'black'];c.save();c.globalAlpha=1;c.drawImage(im,x,y,h*700/829,h);c.restore();return}return lk.apply(this,arguments)}}catch(e){}
// the AH monogram drawn with lines (from logo.svg), centred in the box the tower mark would have used
window.__v178mark=function(c,x,y,h,col){if(!ON)return false;const w=h*432/1250;const mw=Math.max(w*1.6,h*.42),sc=mw/352;const mh=262*sc;const ox=x+w/2-mw/2-52*sc,oy=y+h/2-mh/2-46*sc;
 c.save();c.strokeStyle=col;c.lineWidth=Math.max(1.5,11*sc);c.lineCap='butt';c.beginPath();[[182,46,52,308],[182,46,312,308],[272,46,272,308],[404,46,404,308],[118,191,404,191]].forEach(([a,b,d,e])=>{c.moveTo(ox+a*sc,oy+b*sc);c.lineTo(ox+d*sc,oy+e*sc)});c.stroke();c.restore();return true};
// the logo images load once; repaint what was drawn before they were ready
let painted=false;Promise.all(Object.values(LOGO).map(im=>im.decode?im.decode().catch(()=>{}):null)).then(()=>{painted=true;try{if(APP.view==='afik')render()}catch(e){}});

/* ---------- the copy ---------- */
function swapCopy(t){let s=String(t||'');
 s=s.replace(/קבוצת קורקוס(?:\.|\s·)\s*מקרקע ועד מסירת מפתח\.?/g,`${AFIK.name}. ${AFIK.line}.`).replace(/#קבוצתקורקוס/g,'#אפיקהנחל').replace(/#קורקוס/g,'#אפיקהנחל').replace(/#בנייתוילות/g,'#נדלן');
 return swapWords(s)}
function deep(o){if(typeof o==='string')return swapCopy(o);if(Array.isArray(o))return o.map(deep);if(o&&typeof o==='object'){const r={};for(const k in o){r[k]=/^(k|src|photoKey|key|id|layout|theme|img|url|shot)$/.test(k)?o[k]:deep(o[k])}return r}return o}
function cloneOne(src){const p=JSON.parse(JSON.stringify(src));const now=new Date().toISOString();
 const out=Object.assign(deep(p),{id:(typeof uid==='function'?uid():'af'+Date.now().toString(36))+'a',key:null,brand:'afik',clonedFrom:src.id,series:AFIK.name,upd:now,born:now});
 ['flag','editing','_t','sent','status','wf','fixv'].forEach(k=>delete out[k]);if(out.fx){out.fx=Object.assign({},out.fx);delete out.fx.logoCfg}
 return out}
function cloneMany(ids){const made=[];ids.forEach(id=>{const src=AG.posts.find(x=>x.id===id);if(!src||isAfik(src))return;const c=cloneOne(src);AG.posts.unshift(c);made.push(c)});
 if(made.length){try{saveAgent()}catch(e){}toast(made.length>1?`${made.length} פוסטים שוכפלו לאפיק הנחל`:'שוכפל לאפיק הנחל. הוא מחכה בטאב "אפיק הנחל"')}return made}

/* ---------- AI: write the copy in Afik's voice (optional, per post) ---------- */
async function rewrite(p){const sample=await (window.claude&&window.claude.use?window.claude.use('sample'):null);if(!sample){toast('ניסוח מחדש זמין כשהמערכת מחוברת');return}
 const v=p.visual||{};const prompt=`אתה קופירייטר של "${AFIK.name}", חברת ${AFIK.line} נדל"ן ו${AFIK.about}. אתר ${AFIK.site}, טלפון ${AFIK.phone}.
המשימה: להתאים פוסט שנכתב לחברת בנייה מאותה קבוצה, כך שיתאים לאפיק הנחל: שיווק, תיווך, מגרשים, קרקעות ונכסים.
כללים: עברית טבעית וקצרה. לא להמציא עובדות, מספרים, מחירים, כתובות או שמות שלא מופיעים בטקסט המקורי. בלי מקפים כסימן פיסוק. בלי "הכי טוב", "מוביל", "בית החלומות", בלי סימני קריאה כפולים.
סיום הטקסט לפייסבוק: "${AFIK.name}. ${AFIK.line}." ואחריו שורה עם ${AFIK.phone} ושורה עם #אפיקהנחל.
החזר JSON בלבד: {"headline":"עד 8 מילים","sub":"עד 12 מילים","fb":"60 עד 150 מילים","ig":"עד 400 תווים"}.
הפוסט המקורי:
כותרת: ${v.headline||''}
משנה: ${v.sub||''}
פייסבוק: ${p.fb||''}`;
 toast('מנסח בקול של אפיק הנחל…');
 try{const r=await sample.json(prompt,{modelTier:'default'});if(!r||typeof r!=='object')throw new Error('x');const clean=x=>String(x||'').replace(/\s[—–-]\s/g,', ').trim();
  p.visual=Object.assign({},p.visual||{});if(r.headline)p.visual.headline=clean(r.headline);if(r.sub)p.visual.sub=clean(r.sub);if(r.fb)p.fb=clean(r.fb);if(r.ig)p.ig=clean(r.ig);p.upd=new Date().toISOString();
  try{saveAgent()}catch(e){}toast('הטקסט נוסח מחדש');render()}catch(e){toast('הניסוח לא הצליח. אפשר לערוך ידנית בעורך')}}

/* ---------- the tab ---------- */
try{VTITLE.afik=['אפיק הנחל','פוסטים שהועתקו למותג של אפיק הנחל: צבעים, לוגו וטקסט']}catch(e){}
try{if(Array.isArray(VIEWS)&&!VIEWS.some(g=>g[1].some(v=>v[0]==='afik'))){(VIEWS[1]||VIEWS[0])[1].push(['afik','אפיק הנחל','layers'])}}catch(e){}
const AF={q:'',sel:new Set()};
function list(){return AG.posts.filter(isAfik).filter(p=>!AF.q||((p.visual&&p.visual.headline)||'').includes(AF.q))}
function card(p){const h=String((p.visual&&p.visual.headline)||p.hook||'').replace(/\*/g,'').replace(/\n/g,' ').slice(0,70);
 return `<figure class="v178c" data-afid="${E(p.id)}"><button type="button" class="v178open" data-pe="${E(p.id)}" aria-label="עריכה: ${E(h)}"><canvas data-tp="${E(p.id)}" width="216" height="270"></canvas></button>
  <figcaption><b>${E(h)}</b></figcaption>
  <div class="v178a"><button type="button" class="px-btn sm" data-pe="${E(p.id)}">${I('edit')} עריכה</button><button type="button" class="px-btn sm" data-v178="dl" data-id="${E(p.id)}">${I('dl')} הורדה</button><button type="button" class="px-btn sm" data-v178="ai" data-id="${E(p.id)}">${I('wand')} ניסוח לאפיק</button><button type="button" class="px-btn sm v178del" data-v178="del" data-id="${E(p.id)}" aria-label="מחיקה">${I('trash')}</button></div></figure>`}
function vAfik(){const l=list();
 const brand=`<div class="v178brand"><span class="v178sw" style="background:${AFIK.pal.night}"></span><span class="v178sw" style="background:${AFIK.pal.cream}"></span><span class="v178sw" style="background:${AFIK.pal.peri}"></span><span class="v178sw" style="background:${AFIK.pal.green}"></span><span><b>${AFIK.name}</b> · ${AFIK.line} · ${AFIK.site}</span></div>`;
 if(!l.length)return brand+`<div class="v178empty"><b>עוד אין פוסטים של אפיק הנחל</b><p>בטאב "פוסטים": לחיצה ארוכה על פוסט (או קליק ימני במחשב) ואז "שכפול לאפיק הנחל". אפשר גם לבחור כמה פוסטים ולשכפל את כולם.</p><button type="button" class="px-btn red" data-view="gallery">לפוסטים</button></div>`;
 return brand+`<div class="v178bar"><label class="v178q">${I('search')}<input type="search" data-v178q value="${E(AF.q)}" placeholder="חיפוש בפוסטים של אפיק" aria-label="חיפוש בפוסטים של אפיק הנחל"></label><span class="v178n">${l.length} פוסטים</span></div><div class="v178grid">${l.slice(0,120).map(card).join('')}</div>`}
try{render=(f=>function(){if(APP.view!=='afik'){document.querySelectorAll('.wrap > footer.view-hidden').forEach(x=>x.classList.remove('view-hidden'));return f.apply(this,arguments)}renderNav();const [t,s]=VTITLE.afik;document.getElementById('vt').textContent=t;document.getElementById('vs').textContent=s;
 document.body.dataset.pxview='afik';document.querySelectorAll('.wrap > section,.wrap > footer').forEach(sec=>sec.classList.add('view-hidden'));const act=document.getElementById('vact');if(act)act.innerHTML='';const box=document.getElementById('appviews');box.innerHTML=vAfik();try{paint(box)}catch(e){}})(render)}catch(e){console.error('v178 view',e)}


/* ---------- entry points ---------- */
function addBtn(host,ids,cls){if(!host||host.querySelector('[data-v178="clone"]'))return;const b=document.createElement('button');b.type='button';b.className=cls;b.dataset.v178='clone';b.dataset.ids=ids.join(',');
 b.innerHTML=`<span class="v172ic" aria-hidden="true">${I('layers')}</span><span class="v172t">${ids.length>1?`שכפול ${ids.length} לאפיק הנחל`:'שכפול לאפיק הנחל'}</span>`;host.appendChild(b)}
new MutationObserver(()=>{
 // long press / right click sheet of one post
 const sh=document.querySelector('#v172sheet .v172l');const pressed=document.querySelector('.ga-card.v172press[data-gaid]');
 if(sh&&pressed&&!isAfik(AG.posts.find(x=>x.id===pressed.dataset.gaid)))addBtn(sh,[pressed.dataset.gaid],'v172i');
 // selection overflow: next to "תיקון לנבחרים"
 const fix=[...document.querySelectorAll('button')].find(b=>/תיקון לנבחרים/.test(b.textContent)&&b.offsetParent&&!b.closest('.v178c'));
 if(fix&&typeof GA!=='undefined'&&GA.sel&&GA.sel.size){const host=fix.parentElement;if(host&&!host.querySelector('[data-v178="clone"]')){const b=fix.cloneNode(false);b.removeAttribute('data-ga');Object.keys(b.dataset).forEach(k=>delete b.dataset[k]);b.dataset.v178='clone';b.dataset.ids=[...GA.sel].join(',');b.textContent=`שכפול ${GA.sel.size} לאפיק הנחל`;fix.insertAdjacentElement('afterend',b)}}
 // the big viewer
 const lb=document.querySelector('#ga-lb .ga-lba');if(lb&&typeof GA!=='undefined'&&GA.lb){const id=GA.lb.ids[GA.lb.i];if(id&&!lb.querySelector('[data-v178="clone"]')&&!isAfik(AG.posts.find(x=>x.id===id))){const b=document.createElement('button');b.type='button';b.className='px-btn sm';b.dataset.v178='clone';b.dataset.ids=id;b.innerHTML=`${I('layers')} לאפיק הנחל`;lb.appendChild(b)}}
}).observe(document.body,{childList:true,subtree:true});

document.addEventListener('click',async e=>{const b=e.target.closest&&e.target.closest('[data-v178]');if(!b)return;const a=b.dataset.v178;e.preventDefault();e.stopPropagation();
 if(a==='clone'){const ids=String(b.dataset.ids||'').split(',').filter(Boolean);try{window.__v172&&__v172.close()}catch(x){}const made=cloneMany(ids);
  if(made.length){try{GA.sel&&GA.sel.clear()}catch(x){}setTimeout(()=>{try{go('afik')}catch(x){APP.view='afik';render()}},250)}return}
 const p=AG.posts.find(x=>x.id===b.dataset.id);if(!p)return;
 if(a==='dl'){try{await ensureImgs(p)}catch(x){}const cv=document.createElement('canvas');cv.width=1080;cv.height=1350;drawSlide(cv,p,p.slide||0);saveCanvas(cv,'afik-'+p.id+'.png');return}
 if(a==='ai'){b.disabled=true;await rewrite(p);return}
 if(a==='del'){if(b.dataset.ok!=='1'){b.dataset.ok='1';b.innerHTML='בטוח?';setTimeout(()=>{if(b.isConnected){b.dataset.ok='';b.innerHTML=I('trash')}},2500);return}try{v36Delete([p.id])}catch(x){AG.posts=AG.posts.filter(x=>x.id!==p.id);saveAgent()}render();return}
},true);
document.addEventListener('input',e=>{const t=e.target;if(t&&t.matches&&t.matches('[data-v178q]')){AF.q=t.value.trim();clearTimeout(AF.t);AF.t=setTimeout(()=>{const box=document.getElementById('appviews');if(!box)return;const pos=t.selectionStart;box.innerHTML=vAfik();try{paint(box)}catch(x){}const n=box.querySelector('[data-v178q]');if(n){n.focus();try{n.setSelectionRange(pos,pos)}catch(x){}}},250)}});

window.__v178={AFIK,mapColor,swapWords,cloneOne,cloneMany,isAfik};
})();
