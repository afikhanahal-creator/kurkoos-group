/*V222:START*/
// ================= V222 · a duplicated image becomes a real template. One pipeline for every "duplicate" entry (the competitor
// viewer and cards, the clone studio, the cloner tab, any image file): Claude (Opus) measures the post like a designer and
// returns the layout in the template engine's own vocabulary (blocks, gradients, photo regions, round photos, text roles,
// captions, pills, badges, stickers, lines, frames, buttons, spec rows, icon rows), a second round compares our drawing with
// the source and corrects it, the template is registered under "שוכפל מהמתחרים" with the source kept as a thumbnail for
// comparison, and one or two posts on the same subject are written for our brand and placed in the drafts with our own
// photos in the photo slots. The source image is never used as a photo. The template library's sample post also skips clone
// and competitor posts, so previews no longer show a competitor's picture. =================
(()=>{
if(window.__v222)return;window.__v222=1;
const E=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $=s=>document.querySelector(s);
const toastS=m=>{try{toast(m)}catch(e){console.log(m)}};
const W=1080,H=1350,FAM='cloned';
const PROJS=[['general','קבוצת קורקוס (כללי)'],['hankin','חנקין 41'],['henrietta','הנרייטה סאלד 22-24'],['yordei','יורדי הים 3'],['bengurion','בן גוריון 17']];
const LSK='v222_specs',COL='cloned_templates';
const ST={open:false,src:'',name:'',blob:null,project:'general',brand:'kurkoos',nposts:2,note:'',busy:'',err:'',spec:null,conf:0,topic:'',saved:false,posts:[],round:0,preview:'',from:''};
const STEPS=[['read','קורא את התמונה'],['map','Claude מודד את המבנה'],['draw','מצייר את התבנית'],['verify','משווה למקור ומתקן'],['posts','כותב פוסטים לנושא'],['done','מוכן']];

// ---------- the vocabulary Claude may use (every type here is drawn by the template engine) ----------
const PROMPT=`You are a senior layout designer. The image is a social media post or ad by a competitor of an Israeli real estate and construction group. Rebuild its LAYOUT as a reusable template for a 1080x1350 canvas (4:5): the same composition, blocks, photo regions, text sizes and positions, so a viewer who sees the template next to the original recognises the same design. If the image is a phone screenshot, ignore the phone interface and map the post itself onto the full canvas. If the post is not 4:5, stretch it to fill the canvas.
Return ONE JSON object and nothing else:
{"name":"3 to 5 Hebrew words describing the layout, never a brand name","theme":"light"|"dark","topic":"what the post is about, in Hebrew, up to 8 words","confidence":0..1,"el":[...]}
"el" is painted bottom to top. Coordinates are canvas pixels. Allowed elements:
{"t":"rect","x":0,"y":0,"w":1080,"h":1350,"col":"#rrggbb","r":0} solid block (background, panel, card, bar); r = corner radius.
{"t":"grad","x":0,"y":0,"w":1080,"h":700,"from":"rgba(...)","to":"rgba(...)"} vertical gradient or scrim. {"t":"dgrad",...,"angle":35} diagonal gradient.
{"t":"photo","x":0,"y":0,"w":1080,"h":1350,"s":0,"r":0} a region that shows a photograph (s = 0 main, 1 or 2 for more). Never describe the picture.
{"t":"cphoto","x":540,"y":480,"r":300,"s":0} a round photograph (x,y centre, r radius).
{"t":"text","f":"head"|"sub"|"label"|"details"|"num","x":972,"y":200,"maxW":800,"size":80,"max":3,"col":"#rrggbb","align":"right"|"left"|"center","lh":1.15} text block. head = main headline, sub = supporting sentence, label = small kicker or tag line, details = a short details line, num = one big number or price figure. x is the anchor (right edge for align right, left edge for align left, middle for center), y the top. One element per role at most.
{"t":"caption","f":"head"|"sub","x":540,"y":180,"size":90,"maxW":900,"max":3,"lh":1.12,"bg":"#rrggbb","fg":"#rrggbb","align":"center"} text whose lines sit on a box background (highlighted lines).
{"t":"pill","f":"label"|"location","x":450,"y":548,"size":26,"bg":"#rrggbb","fg":"#rrggbb","align":"right"} small rounded tag.
{"t":"badge","x":243,"y":945,"r":126,"bg":"#rrggbb or none","stroke":"#rrggbb","lw":4} a circle or stamp emblem (x,y centre).
{"t":"sticker","x":900,"y":150,"rot":38,"bg":"#rrggbb","size":44,"r":0} a rotated label box.
{"t":"line","x1":72,"y1":1046,"x2":1008,"y2":1046,"col":"#rrggbb","lw":1.5} {"t":"frame","x":20,"y":780,"w":1040,"h":450,"col":"#rrggbb","lw":1.5} outline box.
{"t":"cta","x":540,"y":1105,"w":480,"h":96,"r":6,"bg":"#rrggbb","fg":"#rrggbb","size":42,"align":"center"} a button (x = centre for align center).
{"t":"specs","x":110,"y":860,"w":860,"n":3,"size":96,"lsize":28,"col":"#rrggbb","lcol":"#rrggbb","rule":"rgba(...)"} a row of n big figures with small labels.
{"t":"icons","x":20,"y":790,"w":560,"size":22,"r":46,"bg":"#rrggbb","ifg":"#rrggbb","fg":"#rrggbb","icons":["doc","check","shield","key","home","phone","pin","star","calendar","ruler"]} a row of icon circles with short labels.
{"t":"marker","x":440,"y":1174,"rad":16,"col":"#rrggbb"} a dot.
Rules: measure first (the edges of every block, margins, the colours you actually see, the height of the lettering) and match them. Keep the proportions of the text: a headline that fills the width stays that big. Never copy words from the post, the template gets new text. Skip logos, handles, watermarks and the brand footer: the system adds its own. Photographs are regions only. At most 22 elements.`;
const num=(v,a,b,d)=>{v=+v;return Number.isFinite(v)?Math.max(a,Math.min(b,v)):d};
const okCol=v=>typeof v==='string'&&/^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\)|none)$/i.test(v.trim());
const col=(v,d)=>okCol(v)?v.trim():d;
const ALIGN=v=>['right','left','center'].includes(v)?v:'right';
function sanitize(raw){const list=Array.isArray(raw&&raw.el)?raw.el.slice(0,30):[];const out=[];const roles=new Set();let photos=0;const theme=raw&&raw.theme==='dark'?'dark':'light';const ink=theme==='dark'?'#ffffff':'#07293a';
  for(const e of list){if(!e||typeof e!=='object')continue;const t=String(e.t||'');const x=num(e.x,-W,W*2,0),y=num(e.y,-H,H*2,0);const w=num(e.w,4,W*2,W),h=num(e.h,4,H*2,H);
    if(t==='rect'){const o={t,x:Math.round(x),y:Math.round(y),w:Math.round(Math.min(w,W*2-x)),h:Math.round(Math.min(h,H*2-y)),col:col(e.col,'#ffffff')};const r=num(e.r,0,600,0);if(r)o.r=Math.round(r);out.push(o)}
    else if(t==='grad'||t==='dgrad'){if(!okCol(e.from)||!okCol(e.to))continue;const o={t,x:Math.round(x),y:Math.round(y),w:Math.round(w),h:Math.round(h),from:e.from,to:e.to};if(t==='dgrad')o.angle=num(e.angle,-180,180,35);out.push(o)}
    else if(t==='photo'){if(photos>=3)continue;const o={t,x:Math.round(x),y:Math.round(y),w:Math.round(w),h:Math.round(h),s:Math.min(photos,2)};const r=num(e.r,0,300,0);if(r)o.r=Math.round(r);if(o.w>=W*.92&&o.h>=H*.9){o.x=0;o.y=0;o.w=W;o.h=H}photos++;out.push(o)}
    else if(t==='cphoto'){if(photos>=3)continue;out.push({t,x:Math.round(x),y:Math.round(y),r:Math.round(num(e.r,40,700,260)),s:Math.min(photos,2)});photos++}
    else if(t==='text'){const f=['head','sub','label','details','num'].includes(e.f)?e.f:null;if(!f||roles.has('t'+f))continue;roles.add('t'+f);const floor={head:48,sub:26,label:20,details:22,num:120}[f],ceil={head:200,sub:70,label:48,details:44,num:420}[f];
      const o={t,f,x:Math.round(x),y:Math.round(y),maxW:Math.round(num(e.maxW,160,W,760)),size:Math.round(num(e.size,floor,ceil,floor+10)),max:Math.round(num(e.max,1,8,f==='num'?1:2)),w:f==='head'?800:f==='num'?900:f==='sub'?400:700,col:col(e.col,ink),align:ALIGN(e.align),lh:num(e.lh,.9,1.6,1.15)};if(f==='label')o.kind='small';if(f==='num'){o.min=200;o.track=-0.02}out.push(o)}
    else if(t==='caption'){const f=e.f==='sub'?'sub':'head';if(roles.has('c'+f))continue;roles.add('c'+f);out.push({t,f,x:Math.round(x),y:Math.round(y),size:Math.round(num(e.size,30,160,80)),w:900,maxW:Math.round(num(e.maxW,160,W,860)),max:Math.round(num(e.max,1,6,3)),lh:num(e.lh,.9,1.6,1.12),bg:col(e.bg,'#ffffff'),fg:col(e.fg,'#07293a'),align:ALIGN(e.align),pad:14})}
    else if(t==='pill'){const f=e.f==='location'?'location':'label';if(roles.has('p'+f))continue;roles.add('p'+f);out.push({t,f,x:Math.round(x),y:Math.round(y),size:Math.round(num(e.size,18,48,26)),w:700,bg:col(e.bg,'#ffffff'),fg:col(e.fg,'#07293a'),align:ALIGN(e.align)})}
    else if(t==='badge'){out.push({t,x:Math.round(x),y:Math.round(y),r:Math.round(num(e.r,20,500,120)),bg:col(e.bg,'none'),stroke:col(e.stroke,'#a90b0c'),lw:num(e.lw,0,30,4)})}
    else if(t==='sticker'){out.push({t,text:'',x:Math.round(x),y:Math.round(y),rot:num(e.rot,-90,90,0),bg:col(e.bg,'#dbe8ee'),size:Math.round(num(e.size,20,90,44)),r:Math.round(num(e.r,0,60,0))})}
    else if(t==='line'){out.push({t,x1:Math.round(num(e.x1,0,W,0)),y1:Math.round(num(e.y1,0,H,0)),x2:Math.round(num(e.x2,0,W,W)),y2:Math.round(num(e.y2,0,H,0)),col:col(e.col,ink),lw:num(e.lw,.5,24,1.5)})}
    else if(t==='frame'){out.push({t,x:Math.round(x),y:Math.round(y),w:Math.round(w),h:Math.round(h),col:col(e.col,ink),lw:num(e.lw,.5,24,1.5)})}
    else if(t==='cta'){if(roles.has('cta'))continue;roles.add('cta');out.push({t,x:Math.round(x),y:Math.round(y),w:Math.round(num(e.w,120,W,480)),h:Math.round(num(e.h,48,220,96)),r:Math.round(num(e.r,0,120,6)),bg:col(e.bg,'#a90b0c'),fg:col(e.fg,'#ffffff'),size:Math.round(num(e.size,24,72,42)),align:ALIGN(e.align)})}
    else if(t==='specs'){if(roles.has('specs'))continue;roles.add('specs');out.push({t,x:Math.round(x),y:Math.round(y),w:Math.round(num(e.w,300,W,860)),n:Math.round(num(e.n,2,4,3)),size:Math.round(num(e.size,48,200,96)),lsize:Math.round(num(e.lsize,18,48,28)),col:col(e.col,ink),lcol:col(e.lcol,ink),rule:col(e.rule,'rgba(143,182,200,.7)')})}
    else if(t==='icons'){if(roles.has('icons'))continue;roles.add('icons');const ic=(Array.isArray(e.icons)?e.icons:[]).map(s=>String(s).toLowerCase()).filter(s=>/^[a-z]{2,12}$/.test(s)).slice(0,5);if(ic.length<2)continue;out.push({t,x:Math.round(x),y:Math.round(y),w:Math.round(num(e.w,240,W,560)),size:Math.round(num(e.size,16,36,22)),r:Math.round(num(e.r,24,90,46)),bg:col(e.bg,'#07293a'),ifg:col(e.ifg,'#ffffff'),fg:col(e.fg,ink),icons:ic,f:'details'})}
    else if(t==='marker'){out.push({t,x:Math.round(x),y:Math.round(y),rad:Math.round(num(e.rad,4,60,16)),col:col(e.col,'#a90b0c')})}}
  if(!out.some(e=>e.t==='text'||e.t==='caption'))return null;
  if(!out.some(e=>(e.t==='text'&&e.f==='head')||(e.t==='caption'&&e.f==='head')))out.push({t:'text',f:'head',x:W-72,y:H-420,maxW:W-144,size:72,max:3,w:800,col:ink,align:'right',lh:1.1});
  out.push({t:'chrome',o:{noIndex:true}});return out.slice(0,24)}

// ---------- images ----------
const dataBlob=u=>{const [h,b]=u.split(',');const bin=atob(b);const a=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)a[i]=bin.charCodeAt(i);return new Blob([a],{type:(h.match(/:(.*?);/)||[])[1]||'image/jpeg'})};
const imgFrom=u=>new Promise(r=>{const im=new Image();im.crossOrigin='anonymous';im.onload=()=>r(im);im.onerror=()=>r(null);im.src=u});
async function loadSrc(src,blob){// a JPEG blob (max 1200px) plus a small thumbnail for the record
  let im=null;if(blob){im=await imgFrom(URL.createObjectURL(blob))}else{try{const r=await fetch(src,{mode:'cors',credentials:'omit'});if(r.ok)im=await imgFrom(URL.createObjectURL(await r.blob()))}catch(e){}if(!im)im=await imgFrom(src)}
  if(!im)return null;const sc=Math.min(1,1200/Math.max(im.naturalWidth,im.naturalHeight));const c=document.createElement('canvas');c.width=Math.round(im.naturalWidth*sc);c.height=Math.round(im.naturalHeight*sc);c.getContext('2d').drawImage(im,0,0,c.width,c.height);
  let big,thumb;try{big=dataBlob(c.toDataURL('image/jpeg',.86));const t=document.createElement('canvas');const ts=Math.min(1,260/Math.max(c.width,c.height));t.width=Math.round(c.width*ts);t.height=Math.round(c.height*ts);t.getContext('2d').drawImage(c,0,0,t.width,t.height);thumb=t.toDataURL('image/jpeg',.7)}catch(e){return null}
  return {blob:big,thumb,w:im.naturalWidth,h:im.naturalHeight}}
async function sampler(){let s=null;try{s=(window.claude&&window.claude.use)?await window.claude.use('sample').catch(()=>null):null}catch(e){}if(!s&&typeof KC!=='undefined'&&KC.sample)s=KC.sample;return s}
async function askJson(prompt,images,tag){if(window.__v222mock)return window.__v222mock(tag,prompt,images);const s=await sampler();if(!s||!s.json){const e=new Error('Claude לא זמין בתצוגה הזו');e.code='not_granted';throw e}
  let imgs=images;if(window.__ENGINE_HOST==='site'){// the site sampler takes only URLs of our own storage: upload what is a blob
    const out=[];for(const im of images){if(typeof im==='string'){out.push(im);continue}try{const V=window.__vid&&__vid.VD;const r=V&&V.assets?await V.assets.upload(new File([im],'clone.jpg',{type:'image/jpeg'})):null;if(r&&r.url)out.push(r.url)}catch(e){}}imgs=out}
  return s.json(prompt,{images:imgs,modelTier:'complex',cache:false})}

// ---------- the template ----------
function demoPost(){const ok=p=>p&&!/^x_t_(v202|cl_|c27_)/.test(p.layout)&&!['comp','comppost','clone','inspo','cloned'].includes(p.src)&&!(p.series&&/שכפול|מתחרים|השראה|שוכפל/.test(p.series))&&!p.compId&&!p.compPostId;
  return (AG.posts||[]).find(p=>ok(p)&&/^x_t_/.test(p.layout)&&p.visual&&(p.visual.sub||'').length>20&&peSlots(p).length)||(AG.posts||[]).find(p=>ok(p)&&/^(x_t_|ed_)/.test(p.layout)&&peSlots(p).length)||(AG.posts||[]).find(ok)||AG.posts[0]}
function register(spec,meta){const T=window.TPL;if(!T||!T.register)return false;T.fam[FAM]=T.fam[FAM]||'שוכפל מהמתחרים';if(T.famNote&&!T.famNote[FAM])T.famNote[FAM]='מבנה, צבעים ויחסים שנלקחו מפוסטים של מתחרים. התמונות, הלוגואים והטקסטים שלהם לא נשמרים, התוכן מגיע מהפוסטים שלכם';
  const ph=spec.el.filter(e=>/photo/.test(e.t));const shots=ph.length?Math.max(...ph.map(e=>e.s||0))+1:0;
  if(!T.specs.some(s=>s.id===spec.id)){const ok=T.register({shots,id:spec.id,fam:FAM,name:spec.name,theme:spec.theme,el:spec.el,cats:['styles','marketing','projects','cmp'],themable:false,tags:{ct:['marketing','project'],st:['competitor','cloned']}});if(!ok)return false}
  const m=T.meta[spec.id]=T.meta[spec.id]||{};m.fam=FAM;m.name=spec.name;m.theme=spec.theme;m.shots=shots;Object.assign(m,{v222:1,srcThumb:meta.srcThumb||'',srcName:meta.srcName||'',topic:meta.topic||'',at:meta.at||''});try{T.names[spec.id]=T.fam[FAM]+' · '+spec.name}catch(e){}return true}
function saved(){try{return JSON.parse(localStorage.getItem(LSK)||'[]')}catch(e){return []}}
async function persist(rec){const l=saved().filter(x=>x.id!==rec.id);l.unshift(rec);try{localStorage.setItem(LSK,JSON.stringify(l.slice(0,60)))}catch(e){}
  try{const db=window.__engineBridge&&__engineBridge.db;if(db)await db.collection(COL).doc(rec.id).set(rec)}catch(e){console.warn('v222 cloud',e)}}
async function removeRec(id){const l=saved().filter(x=>x.id!==id);try{localStorage.setItem(LSK,JSON.stringify(l))}catch(e){}try{const db=window.__engineBridge&&__engineBridge.db;if(db)await db.collection(COL).doc(id).delete()}catch(e){}const T=window.TPL;const i=T.specs.findIndex(s=>s.id===id);if(i>=0)T.specs.splice(i,1);try{delete T.meta[id];delete T.names[id];delete FX.L[id]}catch(e){}}
function boot(){const T=window.TPL;if(!T||!T.register||!window.AG){setTimeout(boot,400);return}saved().forEach(r=>{try{if(r&&r.id&&Array.isArray(r.el))register({id:r.id,name:r.name,theme:r.theme,el:r.el},r)}catch(e){}});
  (async()=>{try{const db=window.__engineBridge&&__engineBridge.db;if(!db)return;const s=await db.collection(COL).get();(s.docs||[]).forEach(d=>{const r=d.data?d.data():d;if(r&&r.id&&Array.isArray(r.el)&&!T.specs.some(x=>x.id===r.id)){register({id:r.id,name:r.name,theme:r.theme,el:r.el},r);const l=saved();if(!l.some(x=>x.id===r.id)){l.push(r);try{localStorage.setItem(LSK,JSON.stringify(l.slice(0,60)))}catch(e){}}}})}catch(e){}})()}
boot();
function sampleCanvas(specId){const d=demoPost();if(!d)return null;const q=clonePost(d);q.id='v222pv';q.visual=Object.assign({},q.visual,{headline:q.visual.headline||'כותרת לדוגמה',sub:q.visual.sub||'שורת משנה קצרה שמסבירה את הרעיון',eyebrow:q.visual.eyebrow||'קבוצת קורקוס',cta:q.visual.cta||'לפרטים נוספים'});try{peConvert(q,specId)}catch(e){q.layout=specId}return peCanvas(q,0)}
function renderBlob(specId){const cv=sampleCanvas(specId);if(!cv)return null;const c=document.createElement('canvas');c.width=540;c.height=675;c.getContext('2d').drawImage(cv,0,0,540,675);ST.preview=c.toDataURL('image/jpeg',.82);return dataBlob(ST.preview)}

// ---------- posts on the same subject ----------
function postsPrompt(n,topic,project){const B=ST.brand==='afik'?'אפיק הנחל':'קבוצת קורקוס';const pn=(PROJS.find(p=>p[0]===project)||[])[1]||'';
  return `אתה הקריאייטיב דיירקטור של "${B}" (יזמות, בנייה וניהול פרויקטים של בתים פרטיים ודירות גן בהוד השרון והשרון). לפניך תמונה של פוסט או מודעה של מתחרה. הנושא שלה: ${topic||'לא ידוע, קרא מהתמונה'}.
כתוב ${n} פוסטים מקוריים שלנו שעוסקים באותו נושא ובאותו סוג תוכן (אם זו מודעה על פרויקט, פוסט על הפרויקט שלנו; אם טיפ, טיפ שלנו; אם רגע מהשטח, רגע מהשטח שלנו), כך שהם מתאימים לתבנית שנבנתה מהעיצוב של הפוסט הזה.
${project&&project!=='general'?'הפרויקט שלנו: '+pn+'. ':''}אסור להעתיק מילים, משפטים, שמות, מחירים או מספרים מהפוסט של המתחרה, ואסור להזכיר את המתחרה. בלי להמציא מספרים, כתובות, מחירים, תאריכים או שמות אנשים. טלפון מותר: 055-981-1814. בלי מקפים כסימן פיסוק. בלי שמות של עובדים.
החזר JSON בלבד: {"posts":[{"headline":"עד 7 מילים","sub":"עד 16 מילים","eyebrow":"עד 3 מילים או ריק","items":["עד 3 שורות קצרות, או ריק"],"num":"מספר או ריק (רק אם הוא עובדה שלנו, אחרת ריק)","cta":"עד 4 מילים","fb":"טקסט הפוסט לפייסבוק, 40 עד 80 מילים, בשורות קצרות"}]}`}
function makePosts(res,spec){const ct=x=>String(x||'').replace(/\s+/g,' ').trim();const list=Array.isArray(res&&res.posts)?res.posts.slice(0,ST.nposts):[];const base=demoPost();if(!base||!list.length)return [];
  const shots=spec.el.filter(e=>/photo/.test(e.t)).length;const kinds=ST.project!=='general'&&typeof hasRender==='function'&&hasRender(ST.project)?['render','site','aerial']:['site','aerial','render'];
  return list.map((P,i)=>{let q=clonePost(base);q.visual=Object.assign({},q.visual,{headline:ct(P.headline)||'פוסט חדש',sub:ct(P.sub),eyebrow:ct(P.eyebrow),cta:ct(P.cta),items:Array.isArray(P.items)?P.items.map(ct).filter(Boolean).slice(0,3):[],stat:ct(P.num)});q.fb=String(P.fb||'').trim();
    try{peConvert(q,spec.id)}catch(e){q.layout=spec.id}
    try{if(shots&&typeof pickShots==='function'){const sh=pickShots(kinds,shots,{project:ST.project,minW:.5});peSlots(q).forEach((s,k)=>{const x=sh[k%sh.length];if(x&&s.o){s.o.k=x.k;s.o.r=x.r.slice();delete s.o.src;delete s.o.url}})}}catch(e){}
    q.project=ST.project;q.series='שוכפל מהמתחרים · '+spec.name;q.src='cloned';q.tpl=1;q.compName=ST.name||'';q.why='תבנית ופוסט מתוך עיצוב של '+(ST.name||'מתחרה')+(ST.topic?'. הנושא: '+ST.topic:'');q.upd=new Date().toISOString();q.flag='';delete q.key;
    if(ST.brand==='afik'&&window.__v178&&__v178.cloneOne){try{const a=__v178.cloneOne(q);delete a.clonedFrom;q=a}catch(e){q.brand='afik'}}
    return q})}

// ---------- the run ----------
function step(k){ST.busy=k;render()}
async function run(opts){opts=opts||{};if(ST.busy)return;ST.err='';try{
  step('read');if(!ST.img){ST.img=await loadSrc(ST.src,ST.blob);if(!ST.img)throw new Error('לא הצלחתי לקרוא את התמונה')}
  step('map');let raw;if(opts.refine&&ST.spec){const cur=renderBlob(ST.spec.id);raw=await askJson(PROMPT+'\n\nImage 1 is the original post. Image 2 is our template drawn from the current JSON with placeholder text and our own photos. Return a corrected full JSON so that image 2 matches the composition of image 1 as closely as possible: block edges, photo regions, text sizes and positions, colours.'+(ST.note?'\nThe viewer asks: '+String(ST.note).slice(0,300):'')+'\nCurrent JSON: '+JSON.stringify({name:ST.spec.name,theme:ST.spec.theme,el:ST.spec.el.filter(e=>e.t!=='chrome')}),cur?[ST.img.blob,cur]:[ST.img.blob],'refine')}
  else raw=await askJson(PROMPT,[ST.img.blob],'map');
  const el=sanitize(raw);if(!el)throw new Error('Claude לא החזיר מבנה שאפשר לצייר');
  const id=ST.spec?ST.spec.id:'x_t_cl2_'+Date.now().toString(36);const spec={id,name:String(ST.name0||(raw&&raw.name)||'פוסט מתחרה').slice(0,40),theme:raw&&raw.theme==='dark'?'dark':'light',el};ST.conf=num(raw&&raw.confidence,0,1,.7);if(raw&&raw.topic)ST.topic=String(raw.topic).slice(0,80);
  if(ST.spec){const T=window.TPL;const s=T.specs.find(x=>x.id===id);if(s){s.el=el;s.theme=spec.theme;s.name=spec.name}else register(spec,{srcThumb:ST.img.thumb,srcName:ST.name,topic:ST.topic,at:new Date().toISOString()})}else register(spec,{srcThumb:ST.img.thumb,srcName:ST.name,topic:ST.topic,at:new Date().toISOString()});
  ST.spec=spec;ST.round++;step('draw');renderBlob(id);render();
  if(!opts.refine&&ST.conf<0.97){step('verify');try{const cur=renderBlob(id);const raw2=await askJson(PROMPT+'\n\nImage 1 is the original post. Image 2 is our template drawn from the JSON below with placeholder text and our own photos. Compare them like an art director and return a corrected full JSON so image 2 matches the composition of image 1 as closely as possible (block edges, photo regions, text sizes and positions, colours). If it already matches, return the same JSON.\nCurrent JSON: '+JSON.stringify({name:spec.name,theme:spec.theme,el:el.filter(e=>e.t!=='chrome')}),cur?[ST.img.blob,cur]:[ST.img.blob],'verify');const el2=sanitize(raw2);if(el2){spec.el=el2;const s=TPL.specs.find(x=>x.id===id);if(s){s.el=el2}ST.round++;renderBlob(id)}}catch(e){console.warn('v222 verify',e)}}
  // save the template (local + cloud) with the source thumbnail for comparison
  const rec={id,name:spec.name,theme:spec.theme,el:spec.el,srcThumb:ST.img.thumb,srcName:ST.name||'',topic:ST.topic,at:new Date().toISOString(),project:ST.project};await persist(rec);ST.saved=true;
  if(ST.nposts>0&&!opts.refine){step('posts');try{const res=await askJson(postsPrompt(ST.nposts,ST.topic,ST.project),[ST.img.blob],'posts');const made=makePosts(res,spec);if(made.length){made.forEach(q=>AG.posts.unshift(q));try{saveAgent()}catch(e){}for(const q of made){try{await ensureImgs(q)}catch(e){}}ST.posts=made}}catch(e){ST.err='התבנית נשמרה, אבל כתיבת הפוסטים נכשלה: '+((e&&e.message)||'')}}
  step('done');ST.busy='';render();toastS('התבנית "'+spec.name+'" נשמרה בתבניות'+(ST.posts.length?', ו-'+ST.posts.length+' פוסטים נוספו לטיוטות':''))}
  catch(e){ST.busy='';ST.err=e&&e.code==='rate_limited'?'יותר מדי בקשות, נסו בעוד דקה':e&&e.code==='not_granted'?'Claude לא זמין בתצוגה הזו':(e&&e.message)||'השכפול נכשל';render()}}

// ---------- the dialog ----------
function html(){const busy=!!ST.busy;const steps=busy?`<ol class="v222steps" aria-live="polite">${STEPS.filter(s=>s[0]!=='done'&&(s[0]!=='posts'||ST.nposts>0)).map(([k,l])=>`<li class="${k===ST.busy?'on':''}">${l}</li>`).join('')}</ol>`:'';
  const right=ST.preview?`<img src="${ST.preview}" alt="התבנית שלנו">`:`<p class="v222ph">${busy?'':'התבנית תצויר כאן'}</p>`;
  return `<div class="v222bg" data-v222="close"></div><section class="v222box" role="dialog" aria-modal="true" aria-label="תבנית מהעיצוב"><header class="v222h"><h2>תבנית אמיתית מהעיצוב${ST.name?' · '+E(ST.name):''}</h2><button type="button" class="v222x" data-v222="close" aria-label="סגירה">✕</button></header>
  <div class="v222body"><div class="v222cmp"><figure class="v222pane"><figcaption>המקור</figcaption><div class="v222img">${ST.src?`<img src="${E(ST.src)}" alt="המקור" referrerpolicy="no-referrer">`:''}</div></figure>
   <figure class="v222pane"><figcaption>${ST.spec?`התבנית שלנו · סבב ${ST.round}${ST.saved?' · נשמרה בתבניות':''}`:'התבנית שלנו'}</figcaption><div class="v222img${busy?' busy':''}">${right}${steps}</div></figure></div>
   <div class="v222ctl"><label>שם התבנית<input type="text" data-v222f="name0" value="${E(ST.name0||(ST.spec&&ST.spec.name)||'')}" placeholder="נקבע לבד לפי העיצוב"></label>
    <label>הפרויקט לפוסטים<select data-v222f="project">${PROJS.map(([k,l])=>`<option value="${k}"${k===ST.project?' selected':''}>${l}</option>`).join('')}</select></label>
    ${window.__v178?`<label>מותג<select data-v222f="brand"><option value="kurkoos"${ST.brand==='kurkoos'?' selected':''}>קבוצת קורקוס</option><option value="afik"${ST.brand==='afik'?' selected':''}>אפיק הנחל</option></select></label>`:''}
    <label>פוסטים לנושא<select data-v222f="nposts">${[[0,'בלי פוסטים, רק תבנית'],[1,'פוסט אחד'],[2,'שני פוסטים']].map(([k,l])=>`<option value="${k}"${+ST.nposts===k?' selected':''}>${l}</option>`).join('')}</select></label>
    <label class="v222wide">הנחיה לסבב דיוק (לא חובה)<input type="text" data-v222f="note" value="${E(ST.note)}" placeholder='למשל: "הכותרת גדולה יותר ולמעלה" או "התמונה עגולה"'></label>
    <div class="v222acts">${ST.spec?`<button type="button" class="px-btn pri" data-v222="refine"${busy?' disabled':''}>סבב דיוק נוסף</button><button type="button" class="px-btn" data-v222="tpls">לתבניות</button>${ST.posts.length?`<button type="button" class="px-btn" data-v222="openpost">פתיחת הפוסט בעורך</button>`:''}<button type="button" class="px-btn ghost" data-v222="rerun"${busy?' disabled':''}>שכפול מחדש</button><button type="button" class="px-btn ghost" data-v222="rm"${busy?' disabled':''}>מחיקת התבנית</button>`:`<button type="button" class="px-btn pri" data-v222="run"${busy?' disabled':''}>${busy?'עובד…':'שכפול לתבנית'}</button>`}</div>
    ${ST.err?`<p class="v222err" role="alert">${E(ST.err)}</p>`:''}
    ${ST.spec&&!busy?`<p class="v222hint">${ST.topic?'הנושא שזוהה: '+E(ST.topic)+'. ':''}${ST.posts.length?ST.posts.length+' פוסטים נוספו לטיוטות: '+ST.posts.map(q=>'"'+E(q.visual.headline)+'"').join(', ')+'. ':''}התבנית נמצאת בלשונית תבניות, משפחה "שוכפל מהמתחרים", עם המקור כתמונה קטנה להשוואה. בטיחות: ${Math.round(ST.conf*100)}% ביטחון של Claude בהתאמה.</p>`:'<p class="v222hint">Claude מודד את העיצוב, מצייר אותו כתבנית במנוע שלנו, משווה למקור ומתקן, ואז כותב פוסטים לאותו נושא עם התמונות שלנו. התמונה של המתחרה לא נכנסת לשום פוסט.</p>'}</div></div></section>`}
let back=null;
function render(){const m=$('#v222');if(!m||!ST.open)return;const f=document.activeElement&&document.activeElement.dataset&&document.activeElement.dataset.v222f;const sc=m.querySelector('.v222body');const top=sc?sc.scrollTop:0;m.innerHTML=html();const s2=m.querySelector('.v222body');if(s2)s2.scrollTop=top;if(f){const n=m.querySelector(`[data-v222f="${f}"]`);if(n&&n.focus){n.focus();try{n.setSelectionRange(n.value.length,n.value.length)}catch(e){}}}}
function open(o){Object.assign(ST,{open:true,src:o.src||'',blob:o.blob||null,name:o.name||'',name0:'',img:null,spec:null,conf:0,topic:'',saved:false,posts:[],round:0,preview:'',err:'',busy:'',note:'',from:o.from||''});if(o.project)ST.project=o.project;if(o.brand)ST.brand=o.brand;
  back=document.activeElement;let m=$('#v222');if(!m){m=document.createElement('div');m.id='v222';m.dir='rtl';document.body.appendChild(m)}m.hidden=false;document.documentElement.classList.add('v222-on');render();if(o.auto!==false)setTimeout(()=>run(),50)}
function close(){if(ST.busy&&!confirm('השכפול עוד בעבודה. לסגור?'))return;ST.open=false;const m=$('#v222');if(m){m.hidden=true;m.innerHTML=''}document.documentElement.classList.remove('v222-on');try{back&&back.focus&&back.focus()}catch(e){}}
document.addEventListener('click',async e=>{const b=e.target.closest&&e.target.closest('[data-v222]');if(!b)return;const a=b.dataset.v222;
  if(a==='close')return close();if(a==='run')return run();if(a==='refine')return run({refine:true});if(a==='rerun'){ST.spec=null;ST.posts=[];ST.saved=false;ST.round=0;ST.preview='';return run()}
  if(a==='rm'){if(!ST.spec||!confirm('למחוק את התבנית "'+ST.spec.name+'"? הפוסטים שנוצרו נשארים בטיוטות'))return;await removeRec(ST.spec.id);ST.spec=null;ST.saved=false;ST.preview='';render();toastS('התבנית נמחקה');return}
  if(a==='tpls'){close();try{const k=JSON.parse(localStorage.getItem('tv_f')||'{}');localStorage.setItem('tv_f',JSON.stringify(Object.assign(k,{fam:FAM,q:''})))}catch(x){}try{go('templates')}catch(x){}return}
  if(a==='openpost'){const q=ST.posts[0];close();if(q){try{PE.tab='text'}catch(x){}peOpen(q)}return}
  if(a==='fromview'){e.preventDefault();e.stopPropagation();const v=$('#v186v');const img=v&&v.querySelector('[data-v186img]');const who=v&&v.querySelector('.v186vwho b');if(!img||!img.src){toastS('לא מצאתי את התמונה של המודעה');return}open({src:img.src,name:who?who.textContent.trim():'מתחרה',from:'gallery'});return}
  if(a==='fromcard'){e.preventDefault();e.stopPropagation();const art=b.closest('article');const img=art&&art.querySelector('img');const who=art&&(art.querySelector('.v181who b,.v181nm,h3,b'));if(!img||!img.src){toastS('לא מצאתי תמונה בפוסט הזה');return}open({src:img.src,name:who?who.textContent.trim().slice(0,40):'מתחרה',from:'card'});return}
  if(a==='fromstudio'){e.preventDefault();const img=$('#v202 .v202pane img');if(!img||!img.src){toastS('אין תמונת מקור בסטודיו');return}open({src:img.src,name:(($('#v202 .v202pane figcaption')||{}).textContent||'').replace(/^המקור:?\s*/,'').trim()||'השראה',from:'studio'});return}
  if(a==='pick'){e.preventDefault();const inp=document.createElement('input');inp.type='file';inp.accept='image/*';inp.onchange=()=>{const f=inp.files&&inp.files[0];if(!f)return;open({src:URL.createObjectURL(f),blob:f,name:(f.name||'').replace(/\.[^.]+$/,'').slice(0,40),from:'file'})};inp.click();return}
},true);
document.addEventListener('input',e=>{const t=e.target;const k=t.dataset&&t.dataset.v222f;if(!k)return;if(k==='nposts')ST.nposts=+t.value;else ST[k]=t.value;if(k==='name0'&&ST.spec){ST.spec.name=t.value||ST.spec.name;const s=TPL.specs.find(x=>x.id===ST.spec.id);if(s)s.name=ST.spec.name;const r=saved().find(x=>x.id===ST.spec.id);if(r){r.name=ST.spec.name;persist(r)}}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&ST.open){e.preventDefault();close()}});

// ---------- entry points: a button beside every "duplicate" ----------
const BTN='<span class="v222ic" aria-hidden="true">▣</span> תבנית אמיתית + פוסטים';
function entries(){
  // the competitor viewer (V186) and the competitor cards (V181)
  const v=$('#v186v');if(v)v.querySelectorAll('.v186acts,.v186peek,.v186tools').forEach(box=>{if(box.querySelector('[data-v222="fromview"]'))return;const b=document.createElement('button');b.type='button';b.className=box.classList.contains('v186tools')?'':'v179b big';b.dataset.v222='fromview';b.innerHTML=BTN;b.title='Claude מודד את העיצוב ובונה ממנו תבנית לתבניות שלנו, ואז כותב פוסטים לנושא';const cl=box.querySelector('[data-v202="fromview"],[data-v186="clone"]');if(cl)cl.insertAdjacentElement('afterend',b);else box.prepend(b)});
  document.querySelectorAll('.v181ta').forEach(box=>{if(box.querySelector('[data-v222="fromcard"]'))return;const b=document.createElement('button');b.type='button';b.className='v179b';b.dataset.v222='fromcard';b.innerHTML=BTN;const cl=box.querySelector('[data-v181="clone"]');if(cl)cl.insertAdjacentElement('afterend',b);else box.prepend(b)});
  // the clone studio (V202)
  const acts=$('#v202 .v202acts');if(acts&&!acts.querySelector('[data-v222="fromstudio"]')){const b=document.createElement('button');b.type='button';b.className='px-btn';b.dataset.v222='fromstudio';b.textContent='תבנית אמיתית מהמקור';acts.appendChild(b)}
  // the cloner tab: a smart path beside the drop zone
  const drop=$('.cl-drop');if(drop&&!$('#v222bar')){const d=document.createElement('div');d.id='v222bar';d.className='v222bar';d.innerHTML=`<div><b>שכפול חכם</b><small>Claude מודד את העיצוב, בונה ממנו תבנית אמיתית במנוע (לא תמונה ברקע), משווה למקור ומתקן, וכותב פוסט או שניים לאותו נושא עם התמונות שלנו.</small></div><button type="button" class="px-btn pri" data-v222="pick">בחירת תמונה לשכפול חכם</button>`;drop.insertAdjacentElement('beforebegin',d)}
  // the template library: the source beside every cloned template
  document.querySelectorAll('.v209c canvas[data-v209t]').forEach(cv=>{const id=cv.dataset.v209t;const m=window.TPL&&TPL.meta[id];if(!m||!m.srcThumb)return;const pv=cv.parentElement;if(!pv||pv.querySelector('.v222src'))return;const im=document.createElement('img');im.className='v222src';im.src=m.srcThumb;im.alt='המקור: '+(m.srcName||'מתחרה');im.title='המקור שממנו נבנתה התבנית'+(m.srcName?': '+m.srcName:'');pv.appendChild(im)})}
let obT=0;new MutationObserver(()=>{clearTimeout(obT);obT=setTimeout(()=>{try{entries()}catch(e){}},80)}).observe(document.body,{childList:true,subtree:true});
setTimeout(()=>{try{entries()}catch(e){}},1200);
window.__v222={open,run,ST,sanitize,PROMPT,demoPost,register,saved,FAM};
})();
/*V222:END*/
