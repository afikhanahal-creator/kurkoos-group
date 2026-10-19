/*V201:START*/
// ================= V201 · build by inspiration. In the agent tab any uploaded file can be marked "השראה" (a post or an ad whose
// structure we like) instead of "חומר שלנו". Claude looks at the inspiration and returns a layout spec (where the photo sits, where
// each text block sits, sizes, weights, colours, boxes, lines), never its words, prices or pictures. The spec becomes three real
// templates in the element engine (faithful, snapped to our grid, Kurkoos signature), each drawn with our photo, our colours,
// Almoni and Heebo, at full size. The results sit beside the inspiration; each one opens in the editor, saves to the library or
// downloads at 2x. Also: the agent's card previews are drawn at the screen's pixel ratio, so they are no longer blurry. =================
(()=>{
if(window.__v201)return;window.__v201=1;
const E=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const $=id=>document.getElementById(id);
const W=1080,H=1350,M=72;
const V=()=>window.__v48||null,IB=()=>(window.__v48&&window.__v48.IB)||{items:[]};
const toastS=m=>{try{toast(m)}catch(e){}};
const day=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const VARS=[['faithful','נאמן להשראה','אותו מבנה, אותם מיקומים וגדלים, בצבעים ובפונטים שלנו'],['adapted','על הגריד שלנו','אותו מבנה, מיושר לשוליים ולסולם הטקסט של קורקוס, עם שורת החתימה'],['signature','חתימת קורקוס','המבנה של ההשראה בשפה הקבועה שלנו: כחול לילה, תגית אדומה, הלוגו והחתימה']];
const PROJS=[['hankin','חנקין 41'],['henrietta','הנרייטה סאלד 22-24'],['yordei','יורדי הים 3'],['bengurion','בן גוריון 17'],['general','תוכן כללי']];
const R=Object.assign({ins:'',photos:[],project:'hankin',note:'',busy:false,out:[],an:null,err:''},(()=>{try{return JSON.parse(localStorage.getItem('v201')||'{}')}catch(e){return {}}})());
R.busy=false;R.out=[];
const keep=()=>{try{localStorage.setItem('v201',JSON.stringify({ins:R.ins,photos:R.photos,project:R.project,note:R.note}))}catch(e){}};

// ---------- 1. the role of each file: our material (default) or inspiration. An inspiration never becomes a photo in a post ----------
function setUse(id,use){const it=IB().items.find(x=>x.id===id);if(!it)return;it.use=use;if(use==='inspo'){it.role='inspo';it.best='';if(!R.ins)R.ins=id;R.photos=R.photos.filter(x=>x!==id)}else{delete it.role;if(R.ins===id)R.ins=IB().items.find(x=>x.use==='inspo'&&x.id!==id)?.id||''}
  try{V().save()}catch(e){}keep();sig=sigOf();decorate();render()}
(function guard(){const v=V();if(!v||v.__v201save)return;v.__v201save=1;const s0=v.save;v.save=function(){try{(v.IB.items||[]).forEach(it=>{if(it.use==='inspo'){it.role='inspo';it.best=''}})}catch(e){}return s0.apply(this,arguments)}})();
function decorate(){const md=$('v51media');if(!md)return;md.querySelectorAll('.v51mc').forEach(f=>{const rm=f.querySelector('[data-v51="rmm"]');if(!rm)return;const id=rm.dataset.id;const it=IB().items.find(x=>x.id===id);const on=!!(it&&it.use==='inspo');f.classList.toggle('v201-inspo',on);
  let b=f.querySelector('[data-v201="use"]');if(!b){b=document.createElement('button');b.type='button';b.className='px-btn sm';b.dataset.v201='use';b.dataset.id=id;rm.parentNode.insertBefore(b,rm)}b.textContent=on?'השראה ✓':'סימון כהשראה';b.classList.toggle('pri',on);b.setAttribute('aria-pressed',on)});}

// ---------- 2. what Claude is asked: a layout spec and our copy, never the competitor's words ----------
function facts(id){try{const B=window.__v179&&__v179.brandOf('kurkoos');if(B)return B.facts+'\n'+B.rules}catch(e){}return 'קבוצת קורקוס: יזמות, בנייה וביצוע, ניהול ופיקוח, תיווך. הוד השרון והמרכז. מקרקע ועד מסירת מפתח.'}
function prompt(ins,proj){const pn=(PROJS.find(p=>p[0]===proj)||[])[1]||'';
return `אתה מעצב גרפי ואיש קריאייטיב של "קבוצת קורקוס". מצורפת תמונת השראה: פוסט או מודעה (של גוף אחר) שהמבנה העיצובי שלהם מצא חן בעינינו. המשימה בשני חלקים.
חלק 1, מפרט עיצוב: תאר את המבנה של תמונת ההשראה כמפרט מדויק, במערכת קואורדינטות של 1000 יחידות רוחב על 1250 יחידות גובה (0,0 בפינה הימנית העליונה? לא: 0,0 בפינה השמאלית העליונה, x גדל ימינה, y גדל למטה). לכל אלמנט: מיקום, גודל, יישור, משקל, גוון וקופסה. אל תעתיק את הטקסט שמופיע בתמונה אלא רק לשדה "seen".
חלק 2, הטקסטים שלנו: כתוב לכל בלוק טקסט במפרט את הטקסט של קבוצת קורקוס שיישב בו, לפרויקט "${pn}". רק עובדות מהרשימה למטה. אסור להמציא מספרים, מחירים, כתובות או הבטחות. אסור להעתיק מילים או משפטים מתמונת ההשראה. בלי מקפים כסימן פיסוק. בלי שמות של אנשים.
${R.note?'הנחיה מהמנהל: '+R.note+'\n':''}עובדות מותרות:
${facts(proj)}
החזר JSON בלבד, בדיוק במבנה הזה:
{"ratio":"4:5|1:1|9:16","bg":"dark|light|accent|photo","mood":"מילה או שתיים","analysis":"משפט אחד בעברית: מה עובד במבנה הזה",
"photo":{"x":0,"y":0,"w":1000,"h":700,"shape":"rect|rounded|circle","overlay":"none|bottom|top|full"} או null אם אין תמונה,
"shapes":[{"kind":"rect|line|frame","x":0,"y":0,"w":0,"h":0,"tone":"dark|light|accent|muted","a":1}],
"blocks":[{"role":"eyebrow|headline|sub|bullets|cta|badge|price|contact|logo|footer","x":0,"y":0,"w":0,"h":0,"align":"right|center|left","size":"xl|l|m|s","weight":"black|bold|regular","tone":"light|dark|accent|muted","box":"none|pill|rect|outline","seen":"הטקסט כפי שמופיע בתמונה"}],
"copy":{"eyebrow":"עד 5 מילים","headline":"עד 6 מילים","sub":"עד 12 מילים","bullets":["עד 3 שורות קצרות"],"cta":"עד 3 מילים","badge":"עד 3 מילים"}}`}
async function sampler(){let s=null;try{s=(window.claude&&window.claude.use)?await window.claude.use('sample').catch(()=>null):null}catch(e){}if(!s&&typeof KC!=='undefined'&&KC.sample)s=KC.sample;return s}
async function blobOf(it){if(it._file instanceof Blob)return it._file;try{let im=await libImg(it.k);if(!im&&it.thumb)im=await new Promise(r=>{const i=new Image();i.crossOrigin='anonymous';i.onload=()=>r(i);i.onerror=()=>r(null);i.src=it.thumb});if(!im)return null;const s=Math.min(1,1400/Math.max(im.naturalWidth,im.naturalHeight));const c=document.createElement('canvas');c.width=Math.round(im.naturalWidth*s);c.height=Math.round(im.naturalHeight*s);c.getContext('2d').drawImage(im,0,0,c.width,c.height);return await new Promise(r=>c.toBlob(r,'image/jpeg',.86))}catch(e){return null}}
async function analyze(ins,proj){if(window.__v201mock)return window.__v201mock;const s=await sampler();if(!s){const e=new Error('Claude לא זמין בתצוגה הזו');e.code='not_granted';throw e}
  const file=await blobOf(ins);if(!file)throw new Error('לא הצלחתי לקרוא את תמונת ההשראה');
  const r=await s.json(prompt(ins,proj),{cache:false,modelTier:'default',images:[file]});if(!r||!Array.isArray(r.blocks))throw new Error('התשובה לא הייתה מפרט תקין');return r}

// ---------- 3. spec from analysis: the inspiration's structure in our language ----------
const num=(v,d)=>{const n=+v;return isFinite(n)?n:d};
const FILL={dark:'navy',light:'paper',accent:'red',muted:'mist'};
const INK={light:'white',dark:'navy',accent:'red',muted:'mist'};
const SZ={headline:{xl:112,l:92,m:72,s:56},sub:{xl:48,l:42,m:36,s:30},bullets:{xl:40,l:38,m:34,s:30},eyebrow:{xl:30,l:28,m:26,s:24},cta:{xl:32,l:30,m:28,s:26},badge:{xl:30,l:28,m:26,s:24},contact:{xl:26,l:24,m:24,s:22}};
const WT={black:900,bold:800,regular:400};
function specFrom(an,variant,copy){const sx=W/1000,sy=H/1250;const el=[];const light=an.bg==='light';const theme=variant==='signature'?'dark':(an.bg==='dark'||an.bg==='photo')?'dark':an.bg==='accent'?'red':'light';
  const onDark=theme!=='light';let logo=null;
  const ph=an.photo||(an.bg==='photo'?{x:0,y:0,w:1000,h:1250,overlay:'bottom'}:null);
  if(ph){const x=num(ph.x,0)*sx,y=num(ph.y,0)*sy,w=num(ph.w,1000)*sx,h=num(ph.h,700)*sy;const e={t:'photo',x:Math.round(x),y:Math.round(y),w:Math.round(w),h:Math.round(h)};
    if(ph.shape==='rounded')e.r=28;if(ph.shape==='circle')e.r=Math.round(Math.min(w,h)/2);
    if(variant==='signature')e.fade=[0,.82];else if(ph.overlay==='bottom')e.fade=[0,variant==='faithful'?.55:.7];else if(ph.overlay==='top')e.fade=[.75,0];else if(ph.overlay==='full')e.dim=.42;el.push(e)}
  (an.shapes||[]).forEach(s=>{const x=num(s.x,0)*sx,y=num(s.y,0)*sy,w=num(s.w,0)*sx,h=num(s.h,0)*sy;const col=FILL[s.tone]||'navy';
    if(s.kind==='line')el.push({t:'line',x1:Math.round(x),y1:Math.round(y),x2:Math.round(x+w),y2:Math.round(y+(h<6*sy?0:h)),col:variant==='signature'?'mist':col,lw:3});
    else if(s.kind==='frame'){const L=(x1,y1,x2,y2)=>el.push({t:'line',x1,y1,x2,y2,col,lw:3});L(x,y,x+w,y);L(x+w,y,x+w,y+h);L(x+w,y+h,x,y+h);L(x,y+h,x,y)}
    else el.push({t:'rect',x:Math.round(x),y:Math.round(y),w:Math.round(w),h:Math.round(h),col:variant==='signature'&&col==='paper'?'navy':col,a:s.a==null?1:Math.max(.05,Math.min(1,+s.a))})});
  const blocks=(an.blocks||[]).slice().sort((a,b)=>num(a.y,0)-num(b.y,0));let footer=false;
  blocks.forEach(b=>{const role=b.role;if(role==='price')return;let x=num(b.x,0)*sx,y=num(b.y,0)*sy,w=num(b.w,900)*sx;const align=['right','center','left'].includes(b.align)?b.align:'right';
    if(variant!=='faithful'){x=Math.max(M,Math.min(W-M,x));w=Math.min(w,W-M-x)}
    const ax=align==='right'?Math.min(W-M/2,x+w):align==='left'?Math.max(M/2,x):x+w/2;const maxW=Math.max(260,Math.min(align==='center'?Math.min(ax,W-ax)*2-M:w,W-M));
    let tone=INK[b.tone]||(onDark?'white':'navy');if(variant==='signature'){tone=(b.tone==='accent')?'red':'white'}if(variant==='adapted'&&b.tone==='muted')tone=onDark?'mist':'navy';
    // the size comes from the block's height in the inspiration (one line of text fills about 72% of its box), inside a sane range per role
    const RNG={headline:[56,140],sub:[26,60],bullets:[26,44],eyebrow:[22,72],cta:[22,40],badge:[22,36],contact:[20,30]}[role]||[22,60];const hpx=num(b.h,0)*sy;
    let size=hpx>0?Math.round(hpx*.72):((SZ[role]||SZ.sub)[b.size]||(SZ[role]||SZ.sub).m);size=Math.max(RNG[0],Math.min(RNG[1],size));const wt=WT[b.weight]||(role==='headline'?800:role==='sub'?400:700);
    if(variant!=='faithful')y=Math.min(y,H-130-size);
    if(role==='headline')el.push({t:'text',f:'head',x:Math.round(ax),y:Math.round(y),size,w:variant==='adapted'?900:wt,maxW:Math.round(maxW),max:3,align,col:tone,lh:1.04});
    else if(role==='sub')el.push({t:'text',f:'sub',x:Math.round(ax),y:Math.round(y),size,w:wt>=800?700:400,maxW:Math.round(maxW),max:3,align,col:tone,lh:1.2});
    else if(role==='eyebrow'){if(b.box==='pill'||b.box==='rect'||variant==='signature')el.push({t:'pill',f:'label',x:Math.round(ax),y:Math.round(y),align,bg:variant==='signature'?'red':(b.tone==='light'?'white':'red'),fg:variant==='signature'?'white':(b.tone==='light'?'navy':'white'),size:Math.max(22,Math.min(34,size))});
      else if(size>=36)el.push({t:'text',f:'label',x:Math.round(ax),y:Math.round(y),size,w:wt,maxW:Math.round(maxW),max:2,align,col:tone,lh:1.1});else el.push({t:'text',kind:'small',f:'label',x:Math.round(ax),y:Math.round(y+size),size,w:700,col:tone,align})}
    else if(role==='bullets'){const lines=(copy.bullets||[]).filter(Boolean).slice(0,4);if(!lines.length)return;const joined=b.seen&&/\|/.test(b.seen)&&lines.length<=3?lines.join('   |   '):lines.join('\n');el.push({t:'text',text:joined,x:Math.round(ax),y:Math.round(y),size:Math.min(size,joined.includes('\n')?size:34),w:wt>=800?700:400,maxW:Math.round(maxW),max:5,align,col:tone,lh:1.35})}
    else if(role==='cta'){const t=copy.cta;if(!t)return;if(b.box==='none')el.push({t:'text',kind:'small',text:t,x:Math.round(ax),y:Math.round(y+size),size,w:700,col:tone,align});else el.push({t:'pill',text:t,x:Math.round(ax),y:Math.round(y),align,bg:b.tone==='light'?'white':'red',fg:b.tone==='light'?'navy':'white',size})}
    else if(role==='badge'){const t=copy.badge;if(!t)return;el.push({t:'pill',text:t,x:Math.round(ax),y:Math.round(y),align,bg:b.tone==='light'?'white':'red',fg:b.tone==='light'?'navy':'white',size,outline:b.box==='outline'?'white':null})}
    else if(role==='contact')el.push({t:'text',kind:'small',f:'site',x:Math.round(ax),y:Math.round(y+size),size,w:400,col:tone,align,ltr:true});
    else if(role==='logo')logo={x:Math.round(x),y:Math.round(y),w:Math.round(w),h:Math.round(num(b.h,80)*sy),align,tone:b.tone};
    else if(role==='footer')footer=true});
  if(footer||variant!=='faithful'){const white=onDark;el.push({t:'chrome',o:{noIndex:true,noFolio:false,noRule:variant==='faithful',fcol:white?'#ffffff':'#07293a',fsub:white?'rgba(255,255,255,.82)':'#35505e',ruleCol:white?'rgba(255,255,255,.3)':'#dbe8ee'}})}
  if(variant==='signature'&&!el.some(e=>e.t==='bars'))el.push({t:'bars',x:M,y:52,col:'white'});
  const id='x_t_insp_'+Date.now().toString(36)+Math.random().toString(36).slice(2,6)+'_'+variant;
  const vn=(VARS.find(v=>v[0]===variant)||[])[1]||variant;
  return {id,fam:'inspo',name:vn,theme,el,themable:false,tags:{ct:['project','marketing'],st:['inspo']},inspo:1,logo}}
function register(spec){try{if(!window.TPL||!spec||!spec.id||!Array.isArray(spec.el))return false;const T=window.TPL;T.fam.inspo='לפי השראה';T.famNote.inspo='מבנה של פוסט או מודעה שאהבנו, בשפה של קורקוס';
  if(!T.specs.some(s=>s.id===spec.id)){T.specs.push(spec)}T.names[spec.id]='לפי השראה · '+spec.name;T.themes[spec.id]=spec.theme;T.meta[spec.id]={fam:'inspo',name:spec.name,theme:spec.theme,cats:['marketing','projects'],shots:1};
  FX.L[spec.id]=(c,p,I)=>T.draw(spec,c,p,I);try{ED_NAMES[spec.id]=T.names[spec.id];LAYOUTS[spec.id]='עריכה: '+T.names[spec.id];DEF_THEME[spec.id]=spec.theme}catch(e){}return true}catch(e){console.warn('v201 reg',e);return false}}

// ---------- 4. the post: our words in the inspiration's structure, our photo in its photo zone ----------
function makeOne(an,variant,photos,ins,proj){const copy=Object.assign({eyebrow:'',headline:'',sub:'',bullets:[],cta:'',badge:''},an.copy||{});const cl=s=>String(s||'').replace(/\s[—–-]\s/g,', ').replace(/[—–]/g,', ').trim();
  Object.keys(copy).forEach(k=>{copy[k]=Array.isArray(copy[k])?copy[k].map(cl).filter(Boolean):cl(copy[k])});
  const spec=specFrom(an,variant,copy);register(spec);
  const pn=(PROJS.find(p=>p[0]===proj)||[])[1]||'';const base=V().basePost();const q=clonePost(base,{src:'inbox'});
  q.visual=Object.assign({},q.visual||{},{headline:copy.headline||pn||'קבוצת קורקוס',sub:copy.sub||'',eyebrow:copy.eyebrow||pn,cta:copy.cta||'',items:[],slides:[]});q.hook=q.visual.headline.replace(/\n/g,' ');
  const cap=[copy.headline,copy.sub,...(copy.bullets||[])].filter(Boolean).join('\n')+'\n\nקבוצת קורקוס. מקרקע ועד מסירת מפתח.\nkurkoos-group.co.il';q.fb=cap;q.ig=cap;q.article=null;
  peConvert(q,spec.id);const fx=q.fx||(q.fx={});fx.theme=spec.theme;fx.shot={k:photos[0].k,r:[0,0,1,1]};fx.shots=photos.map(p=>({k:p.k,r:[0,0,1,1]}));delete fx.tag;peSyncKeys(q);
  if(spec.logo){const L=spec.logo;const h=Math.max(40,Math.min(160,L.h));const w=h*2.2;const x=L.align==='center'?Math.round(L.x+L.w/2-w/2):L.align==='left'?L.x:Math.round(L.x+L.w-w);fx.logoCfg={mode:(L.tone==='dark'&&spec.theme==='light')?'navy':'white',x,y:L.y,h:Math.round(h)};fx.logo=fx.logoCfg.mode}
  q.series='מהסוכן · לפי השראה';q.inbox=photos[0].id;q.inboxDay=day();q.flag='';q.feedback='';q.upd=new Date().toISOString();
  q.pk={angle:'direct',format:'ad',platform:'facebook',asset:photos[0].id,project:pn||'תוכן כללי',run:'insp',day:day(),score:{total:0,hook:0,clarity:0,engagement:0,cta:0,visual:0,why:[]},plat:{facebook:cap,instagram:cap},ai:!window.__v201mock,tone:'לפי השראה · '+spec.name};
  q.inspo={ins:ins.id,thumb:ins.thumb||'',variant,analysis:String(an.analysis||''),mood:String(an.mood||''),at:q.upd};q.inspSpec=spec;return q}
async function build(){if(R.busy)return;const ins=IB().items.find(x=>x.id===R.ins&&x.use==='inspo')||IB().items.find(x=>x.use==='inspo');if(!ins){toastS('סמנו קודם קובץ אחד כהשראה');return}R.ins=ins.id;
  const photos=R.photos.map(id=>IB().items.find(x=>x.id===id&&x.kind==='image'&&x.use!=='inspo')).filter(Boolean);if(!photos.length){toastS('בחרו לפחות תמונה אחת שלנו');return}
  R.busy=true;R.err='';R.out=[];render();
  try{const an=await analyze(ins,R.project);R.an=an;for(const [v] of VARS){try{R.out.push(makeOne(an,v,photos,ins,R.project))}catch(e){console.error('v201 make',v,e)}}
    if(!R.out.length)throw new Error('לא הצלחתי לבנות את התבניות מהמפרט');try{TC.clear()}catch(e){}}
  catch(e){R.err=e&&e.code==='not_granted'?'Claude לא זמין בתצוגה הזו. באתר צריך ANTHROPIC_API_KEY ב-Vercel, וב-claude.ai צריך לאשר את הבקשה':(e&&e.message)||'שגיאה';console.warn('v201',e)}
  R.busy=false;render()}
function savePost(p){if(!AG.posts.some(x=>x.id===p.id)){AG.posts.unshift(p);try{saveAgent()}catch(e){}}return p}
async function png2x(p){await ensureImgs(p);let cv;try{cv=document.createElement('canvas');cv.width=W*2;cv.height=H*2;const c=cv.getContext('2d');const st=c.setTransform.bind(c);
    c.setTransform=function(a,b,cc,d,e,f){if(a&&typeof a==='object')return st(a.a*2,a.b*2,a.c*2,a.d*2,a.e*2,a.f*2);return st(a*2,b*2,cc*2,d*2,e*2,f*2)};c.resetTransform=()=>st(2,0,0,2,0,0);c.scale(2,2);
    const g=cv.getContext.bind(cv);cv.getContext=(t,o)=>t==='2d'?c:g(t,o);Object.defineProperty(cv,'width',{get:()=>W,configurable:true});Object.defineProperty(cv,'height',{get:()=>H,configurable:true});drawSlide(cv,p,0)}
  catch(e){console.warn('v201 2x',e);cv=peCanvas(p,0)}
  return new Promise(r=>cv.toBlob(r,'image/png'))}
async function download(p){try{const bl=await png2x(p);const u=URL.createObjectURL(bl);const a=document.createElement('a');a.href=u;a.download=((p.visual&&p.visual.headline)||'post').replace(/[^֐-׿A-Za-z0-9]+/g,'-').slice(0,40)+'-2x.png';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),3000)}catch(e){toastS('הייצוא נכשל')}}

// ---------- 5. the panel ----------
function html(){const items=IB().items;const insp=items.filter(x=>x.use==='inspo');const ours=items.filter(x=>x.kind==='image'&&x.use!=='inspo');if(!items.length)return '';
  const ins=insp.find(x=>x.id===R.ins)||insp[0];if(ins)R.ins=ins.id;if(!R.photos.length&&ours[0])R.photos=[(ours.find(x=>x.best)||ours[0]).id];
  const head=`<header class="v201h"><div><h3>בנייה לפי השראה</h3><p>מסמנים פוסט או מודעה שאהבתם כ"השראה", בוחרים תמונות שלנו ופרויקט, והסוכן בונה את אותו מבנה במותג קורקוס: הצבעים, הפונטים, הלוגו והטקסטים שלנו. שום מילה, מחיר או תמונה לא מועתקים מההשראה.</p></div></header>`;
  if(!insp.length)return head+`<p class="v201hint">אין עדיין השראה. בכל קובץ בחומרים למעלה יש כפתור "סימון כהשראה".</p>`;
  const insHtml=`<figure class="v201ins"><img src="${E(ins.thumb)}" alt="ההשראה"><figcaption>ההשראה${insp.length>1?`<select data-v201="ins" aria-label="איזו השראה">${insp.map(x=>`<option value="${x.id}"${x.id===ins.id?' selected':''}>${E(x.name)}</option>`).join('')}</select>`:`: ${E(ins.name)}`}</figcaption></figure>`;
  const cfg=`<div class="v201cfg"><label>פרויקט<select data-v201="proj">${PROJS.map(([k,l])=>`<option value="${k}"${k===R.project?' selected':''}>${l}</option>`).join('')}</select></label>
   <div class="v201ph" role="group" aria-label="התמונות שלנו">${ours.length?ours.slice(0,12).map(x=>`<label class="${R.photos.includes(x.id)?'on':''}"><input type="checkbox" data-v201="ph" value="${x.id}"${R.photos.includes(x.id)?' checked':''}><img src="${E(x.thumb)}" alt=""><span>${E(x.name)}</span></label>`).join(''):'<p class="v201hint">העלו גם תמונה שלנו (צילום או הדמיה) שתיכנס לעיצוב.</p>'}</div>
   <label>הנחיה לסוכן (לא חובה)<input type="text" data-v201="note" value="${E(R.note)}" placeholder='למשל: "להדגיש את הגינה הפרטית"'></label>
   <button type="button" class="px-btn pri" data-v201="build" ${R.busy||!ours.length?'disabled':''}>${R.busy?'הסוכן מנתח ובונה…':'בנה 3 אפשרויות לפי ההשראה'}</button>
   ${R.err?`<p class="v201err">${E(R.err)}</p>`:''}</div>`;
  const an=R.an&&R.out.length?`<p class="v201an"><b>מה הסוכן זיהה:</b> ${E(R.an.analysis||'')}${R.an.mood?` <i>${E(R.an.mood)}</i>`:''}</p>`:'';
  const out=R.out.length?`<div class="v201out">${R.out.map((p,i)=>{const v=VARS.find(x=>x[0]===p.inspo.variant)||VARS[0];return `<article class="v201c"><div class="v201cv"><canvas data-v201cv="${i}" aria-label="${E(v[1])}"></canvas></div><h4>${E(v[1])}</h4><p>${E(v[2])}</p><div class="v201acts"><button type="button" class="px-btn sm pri" data-v201="edit" data-i="${i}">עריכה</button><button type="button" class="px-btn sm" data-v201="save" data-i="${i}">שמירה לספרייה</button><button type="button" class="px-btn sm ghost" data-v201="dl" data-i="${i}">הורדה 2x</button></div></article>`}).join('')}</div><p class="v201note">כל אפשרות נפתחת בעורך הרגיל: אפשר להזיז, להגדיל, להחליף תמונה ולשנות טקסט. שום דבר לא מתפרסם.</p>`:'';
  return head+`<div class="v201row">${insHtml}${cfg}</div>${an}${out}`}
function render(){const md=$('v51media');if(!md)return;let root=$('v201');if(!root){root=document.createElement('section');root.id='v201';root.className='v201';root.setAttribute('aria-label','בנייה לפי השראה');md.insertAdjacentElement('afterend',root)}root.innerHTML=html();hydrate()}
async function hydrate(){const k=Math.min(2,window.devicePixelRatio||1);for(const cv of document.querySelectorAll('canvas[data-v201cv]')){const p=R.out[+cv.dataset.v201cv];if(!p)continue;try{await ensureImgs(p);const big=peCanvas(p,0);cv.width=Math.round(270*k);cv.height=Math.round(338*k);cv.getContext('2d').drawImage(big,0,0,cv.width,cv.height)}catch(e){console.warn('v201 draw',e)}}}
// the panel is rebuilt only when it is missing or the set of files changed; a re-render of the materials list only re-adds the marks (so typing in the panel is never interrupted)
let sig='';const sigOf=()=>IB().items.map(x=>x.id+':'+(x.use||'')).join(',');
new MutationObserver(()=>{const md=$('v51media');if(!md)return;const s=sigOf();if(!$('v201')||s!==sig){sig=s;decorate();render();return}if([...md.querySelectorAll('.v51mc')].some(f=>!f.querySelector('[data-v201="use"]')))decorate()}).observe(document.body,{childList:true,subtree:true});
document.addEventListener('click',async e=>{const b=e.target.closest&&e.target.closest('[data-v201]');if(!b)return;const a=b.dataset.v201;if(a==='ph')return;e.preventDefault();
  if(a==='use'){const it=IB().items.find(x=>x.id===b.dataset.id);if(it)setUse(it.id,it.use==='inspo'?'':'inspo');return}
  if(a==='build')return build();
  const p=R.out[+b.dataset.i];if(!p)return;
  if(a==='save'){savePost(p);toastS('נשמר בספריית התוצרים');try{window.__v51rer&&window.__v51rer()}catch(e){}return}
  if(a==='edit'){savePost(p);try{peOpen(AG.posts.find(x=>x.id===p.id)||p)}catch(e){toastS('העורך לא נפתח')}return}
  if(a==='dl')return download(p)},true);
document.addEventListener('change',e=>{const t=e.target;if(!t.dataset||!t.dataset.v201)return;const a=t.dataset.v201;
  if(a==='ph'){const id=t.value;R.photos=t.checked?[...R.photos.filter(x=>x!==id),id]:R.photos.filter(x=>x!==id);t.closest('label').classList.toggle('on',t.checked);keep();return}
  if(a==='proj'){R.project=t.value;keep();return}if(a==='ins'){R.ins=t.value;keep();render();return}if(a==='note'){R.note=t.value;keep()}},true);

// ---------- 6. templates that were saved with posts come back after a reload ----------
let tries=0;const boot=setInterval(()=>{tries++;try{if(typeof AG!=='undefined'&&AG&&AG.posts&&window.TPL&&window.FX)AG.posts.forEach(p=>{if(p&&p.inspSpec&&!FX.L[p.layout])register(p.inspSpec)})}catch(e){}if(tries>120)clearInterval(boot)},500);
// and a post that arrives later (from the cloud) registers its template the first time it is drawn
try{if(typeof drawSlide==='function'&&!drawSlide.__v201){const d0=drawSlide;drawSlide=function(cv,p,i){try{if(p&&p.inspSpec&&window.FX&&!FX.L[p.layout])register(p.inspSpec)}catch(e){}return d0.apply(this,arguments)};drawSlide.__v201=1}}catch(e){}

// ---------- 7. sharp previews on the agent's cards: redraw at the screen's pixel ratio once the card is on screen ----------
const io=('IntersectionObserver' in window)?new IntersectionObserver(es=>{es.forEach(x=>{if(x.isIntersecting){io.unobserve(x.target);hd(x.target)}})},{rootMargin:'200px'}):null;
async function hd(cv){const k=Math.min(2,window.devicePixelRatio||1);if(k<=1||cv.dataset.hd)return;cv.dataset.hd=1;const p=AG.posts.find(x=>x.id===cv.dataset.v51t);if(!p)return;try{await ensureImgs(p);const big=peCanvas(p,0);cv.width=Math.round(216*k);cv.height=Math.round(270*k);cv.getContext('2d').drawImage(big,0,0,cv.width,cv.height)}catch(e){}}
new MutationObserver(ms=>{ms.forEach(m=>{const cv=m.target;if(cv&&cv.dataset&&cv.dataset.v51t&&cv.dataset.done==='1'&&!cv.dataset.hd){if(io)io.observe(cv);else hd(cv)}})}).observe(document.body,{attributes:true,subtree:true,attributeFilter:['data-done']});
window.__v201={R,VARS,specFrom,register,makeOne,build,analyze,prompt,png2x,setUse};
})();
/*V201:END*/
