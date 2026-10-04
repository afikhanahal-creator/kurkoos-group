// ================= V129 · the video editor page: one video at a time. Opened from a tray item or a library card, it keeps
//                   its own project (trim, brand kit, captions, texts, brand elements, music and sound effects, signature
//                   effects for the pro editor) with undo, saved versions you can restore or export, live preview drawn by
//                   the same compositor as the export, download, save to the library, or send only this video to the editor =================
(function(){
const PKEY='v129_projects';
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const toastSafe=m=>{try{toast(m)}catch(e){console.log(m)}};
const uid=p=>(p||'l')+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
const fmtT=s=>{s=Math.max(0,s||0);const m=Math.floor(s/60),r=(s%60);return m+':'+(r<10?'0':'')+r.toFixed(1)};
const spring=(t,f=2.4,z=.65)=>{if(t<=0)return 0;const w=2*Math.PI*f,wd=w*Math.sqrt(1-z*z);return 1-Math.exp(-z*w*t)*(Math.cos(wd*t)+(z*w/wd)*Math.sin(wd*t))};
const back=(x,s=1.9)=>{x=clamp(x)-1;return 1+(s+1)*x*x*x+s*x*x};
const PAL={navy:{bg:'#07293a',fg:'#ffffff',acc:'#a90b0c',logo:'white'},teal:{bg:'#105572',fg:'#ffffff',acc:'#8fb6c8',logo:'white'},paper:{bg:'#f7f8fa',fg:'#07293a',acc:'#a90b0c',logo:'navy'},mist:{bg:'#8fb6c8',fg:'#07293a',acc:'#a90b0c',logo:'navy'}};
const COLORS=[['#ffffff','לבן'],['#07293a','כחול לילה'],['#105572','טורקיז'],['#8fb6c8','ערפל'],['#a90b0c','אדום'],['#ffd47a','זהב']];
const SFX=[['whoosh-quick','וווש'],['whip','שוט'],['swipe','החלקה'],['pop','פופ'],['click','קליק'],['mouse-click','קליק עכבר'],['ding','דינג'],['bell','פעמון'],['notification','התראה'],['success','הצלחה'],['sparkle','נצנוץ'],['cash','קופה'],['thud','חבטה'],['punch','מכה'],['glitch-blip','גליץ\''],['shutter','מצלמה'],['power-up','עלייה'],['tick','טיק'],
 ['sig-slam','סלאם קולנועי'],['sig-boom','בום'],['sig-impact','מכה קצרה'],['sig-whoosh-in','וווש פנימה'],['sig-whoosh-up','וווש למעלה'],['sig-shatter','זכוכית'],['sig-glass-rev','זכוכית הפוכה'],['sig-stomp','צעד ענק'],['sig-crumble','גרגרים'],['sig-freeze','קפיאה'],['sig-release','שחרור'],['sig-counter','מונה'],['sig-key','הקלדה'],['sig-stamp','חותמת'],['sig-stamp-gold','חותמת זהב'],['sig-confetti','קונפטי'],['sig-holo-on','הולוגרמה'],['sig-dive','צלילה'],['sig-rewind','הרצה לאחור']];
const ELEMENTS=[['logo','לוגו'],['dot','נקודה אדומה'],['arrow','חץ'],['ring','עיגול סימון'],['bar','קו הדגשה'],['newtag','תגית חדש'],['check','וי'],['star','פרץ'],['pin','מיקום'],['badge','חותמת']];
const CAPSTY=[['pill','גלולה לבנה'],['bold','לבן מודגש'],['brand','צבע מותג'],['karaoke','קריוקי']];
const ANIMS=[['pop','קפיצה'],['slide','החלקה'],['fade','דהייה'],['zoom','זום פנימה'],['bounce','ניתור'],['words','מילה אחרי מילה'],['type','מכונת כתיבה'],['none','בלי']];
const BFX=[['zoom','זום פאנץ\'',1.6,'whoosh-quick'],['shake','רעידת מצלמה',0.5,'sig-impact'],['flash','הבזק',0.35,'shutter'],['glitch','גליץ\'',0.45,'glitch-blip'],['split','הפרדת צבעים',0.5,'whip'],['blur','פוקוס נכנס',0.7,'swipe'],['dipw','מעבר לבן',0.6,'whoosh-quick'],['dipb','מעבר שחור',0.6,'whoosh-quick'],['vignette','וינייטה',3,''],['leak','דליפת אור',2,''],['confetti','קונפטי',1.8,'sig-confetti'],['shine','ברק עובר',0.8,'sparkle']];
const LOOKS=[['none','מקורי'],['brand','מותג קורקוס'],['vivid','חי ותוסס'],['cinematic','קולנועי'],['warm','חמים'],['cool','קריר'],['bw','שחור לבן']];
const LOOKF={brand:'saturate(1.08) contrast(1.06) hue-rotate(-4deg)',vivid:'saturate(1.38) contrast(1.08) brightness(1.03)',cinematic:'contrast(1.16) saturate(.82) brightness(.95)',warm:'sepia(.22) saturate(1.18) brightness(1.03)',cool:'saturate(.95) hue-rotate(8deg) brightness(1.02)',bw:'grayscale(1) contrast(1.22)'};
const RECIPES=[['clean','נקי ומינימליסטי','צבע מקורי, כתוביות בגלולה לבנה, פתיח וסיום עם לוגו, בלי רעשים'],['energy','אנרגטי','צבעים חיים, כתוביות קריוקי, זום פאנץ\' כל כמה שניות, הבזקים, פס התקדמות וקונפטי בסוף'],['cinematic','קולנועי','גוון קולנועי, פוקוס נכנס, דליפת אור, וינייטה וכתוביות לבנות מודגשות'],['brand','מותג קורקוס','גוון מותג, פס מותג תחתון, כותרת תחתונה עם השם, כתוביות בצבע המותג וסיום עם קריאה לפעולה']];
const SMQ=[['q2','איך אתה מדבר',[['a','רגוע ומעמיק'],['b','חם ואישי'],['c','חד ועסקי'],['d','אנרגטי וסוער']]],
 ['q4','איך אתה מופיע ביחס לאנימציה',[['a','שכבה מעל, רצועה מתחת לסנטר'],['b','מסך מפוצל'],['c','איריס: הפריים נסגר לעיגול לרגע'],['d','חלון עם רקע צבעוני']]],
 ['q5','סגנון ויזואלי',[['a','כרטיסים'],['b','קווים'],['c','כתב יד'],['d','טיפוגרפיה']]],
 ['q6','כתוביות',[['a','מילה אחת גדולה'],['b','2 עד 3 מילים עבות'],['c','קטנות בתחתית'],['d','בלי כתוביות חדשות']]],
 ['q7','כמה סאונד',[['a','כמעט כלום'],['b','צליל לכל רגע חשוב'],['c','הרבה'],['d','מוזיקה רכה']]]];
const PRO=[['cut','חיתוך שתיקות ו"אה"'],['reframe','9:16 עם הפנים בפריים'],['grade','צבע מותג עם הגנה על העור'],['captions','כתוביות מדויקות על כל מילה'],['loudness','עוצמה אחידה -14 LUFS']];
const FXS=[['opening','פתיחה אפורה וסלאם'],['title3d','כותרת תלת־ממדית'],['shatter','התנפצות'],['popout','יציאה מהמסגרת'],['flip','היפוך'],['worlds','עולמות'],['freeze','עצירת זמן'],['giant','ענק'],['pixel','פיקסלים'],['zoom','זום אינסופי'],['cube','קובייה'],['money','חותמות וכסף'],['comment','תגובה והודעה'],['hologram','הולוגרמה'],['goal','מונה עוקבים'],['gold','חותמת זהב'],['follow','כפתור עקוב'],['rewind','הרצה לאחור']];

// ---------- projects
const load=()=>{try{return JSON.parse(localStorage.getItem(PKEY)||'{}')}catch(e){return {}}};
let PROJ=load();
const persist=()=>{try{const slim={};Object.values(PROJ).sort((a,b)=>(b.touched||0)-(a.touched||0)).slice(0,20).forEach(p=>slim[p.id]=p);PROJ=slim;localStorage.setItem(PKEY,JSON.stringify(PROJ))}catch(e){}};
const E={p:null,tab:'style',sel:null,t:0,playing:false,raf:0,last:0,hist:[],fut:[],video:null,urls:{},busy:null,outs:[],audio:{}};
function defKit(){const k=window.__v127?Object.assign({},__v127.KIT()):{};return Object.assign({pal:'navy',font:'Almoni',logo:true,lpos:'tl',lsize:'m',lower:false,lname:'קבוצת קורקוס',ltitle:'',frame:'none',intro:'logo',introText:'',outro:'logo',cta:'',fmt:'9:16',fit:'fill',musicVol:0.22,duck:true,quality:'hd'},k,{mode:'sel',lower:false})}
function newProject(src){const id='p'+(src.kind==='doc'?src.docId:src.trayId);
 if(PROJ[id])return PROJ[id];
 const p={id,name:src.name||'סרטון',src,in:src.in||0,out:src.out||0,dur:src.dur||0,mute:false,kit:defKit(),layers:[],sfx:[],music:null,fx:[],capStyle:'pill',capY:0.78,versions:[],touched:Date.now(),created:Date.now()};
 PROJ[id]=p;persist();return p}
const snap=p=>JSON.parse(JSON.stringify(Object.assign({},p,{versions:undefined})));
function change(fn,quiet){const p=E.p;if(!p)return;E.hist.push(snap(p));if(E.hist.length>60)E.hist.shift();E.fut=[];fn(p);p.touched=Date.now();p.dirty=true;persist();if(!quiet)refresh();else{draw();timeline()}}
function undo(){if(!E.hist.length)return;E.fut.push(snap(E.p));const s=E.hist.pop();Object.assign(E.p,s,{versions:E.p.versions});persist();refresh()}
function redo(){if(!E.fut.length)return;E.hist.push(snap(E.p));const s=E.fut.pop();Object.assign(E.p,s,{versions:E.p.versions});persist();refresh()}

// ---------- the source video
async function srcUrl(p){if(E.urls[p.id])return E.urls[p.id];let u=null;
 if(p.src.kind==='tray'){const it=window.__v127&&__v127.T.items.find(x=>x.id===p.src.trayId);u=it?it.url:null}
 else if(p.src.kind==='url'){u=p.src.url}
 else{const V=window.__vid,d=V&&V.VD.docs.find(x=>x.id===p.src.docId);const url=d&&(d.srcUrl||d.out)||p.src.url;if(url){try{const r=await fetch(url);if(r.ok){u=URL.createObjectURL(await r.blob())}}catch(e){}if(!u)u=url}}
 if(u)E.urls[p.id]=u;return u}
async function attach(){const p=E.p;const u=await srcUrl(p);if(!u){E.missing=true;refresh();return}E.missing=false;
 const v=document.createElement('video');v.playsInline=true;v.preload='auto';v.crossOrigin='anonymous';v.src=u;E.video=v;v.addEventListener('error',()=>{if(v.crossOrigin&&!v._retry){v._retry=1;v.removeAttribute('crossorigin');v.src=u;E.tainted=true}else{E.missing=true;refresh()}});
 v.addEventListener('loadedmetadata',()=>{if(!p.dur||!p.out){p.dur=v.duration;p.out=p.out||v.duration;persist()}p.w=v.videoWidth;p.h=v.videoHeight;refresh()});
 v.addEventListener('seeked',()=>{if(!E.playing)draw()});v.addEventListener('loadeddata',()=>draw())}

// ---------- sequence and drawing (kit pieces come from the V127 compositor)
const item=p=>({id:p.id,url:E.urls[p.id],in:p.in||0,out:p.out||p.dur||0,dur:p.dur||0,w:p.w||1080,h:p.h||1920,mute:p.mute});
const K=fn=>window.__v127&&__v127.withKit?__v127.withKit(E.p.kit,fn):fn();
const seq=()=>K(()=>__v127.seqOf([item(E.p)]));
const dims=(s)=>K(()=>__v127.dims(item(E.p),s));
function font(w,px){return `${w} ${Math.round(px)}px "${E.p.kit.font||'Almoni'}", Heebo, Arial, sans-serif`}
function rr(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath()}
function animK(L,t){const u=t-L.start,o=L.end-t;let a=1,dy=0,s=1,dx=0;
 if(L.anim==='pop'){s=u<0.4?0.6+0.4*back(u/0.3,2.2):1;a=clamp(u/0.08)}else if(L.anim==='slide'){dx=(1-clamp(spring(u,2.6,.8)))*0.6;a=clamp(u/0.1)}else if(L.anim==='fade'){a=clamp(u/0.3)}
 else if(L.anim==='zoom'){s=2.2-1.2*clamp(spring(u,2.4,.85));a=clamp(u/0.12)}else if(L.anim==='bounce'){dy=-(1-clamp(spring(u,2.2,.35)))*0.12;a=clamp(u/0.06)}else if(L.anim==='words'||L.anim==='type'){a=1}
 a*=clamp(o/0.2);return {a,s,dx,dy}}
function drawLayer(c,W,H,L,t,pal,sel){if(t<L.start||t>L.end)return;const k=animK(L,t),x=(L.x+k.dx)*W,y=(L.y+k.dy)*H,sc=(L.scale||1)*k.s*(W/1080);
 c.save();c.globalAlpha=k.a;c.translate(x,y);c.rotate((L.rot||0)*Math.PI/180);c.scale(sc,sc);c.direction='rtl';c.textAlign='center';c.textBaseline='middle';
 const col=L.color||pal.fg;
 if(L.type==='text'){c.font=font(L.weight||800,L.size||86);const full=L.text||'';let txt=full;const uu=t-L.start;
  if(L.anim==='words'){const ws=full.split(/\s+/);txt=ws.slice(0,Math.max(1,Math.ceil(uu/0.28))).join(' ')}else if(L.anim==='type'){txt=full.slice(0,Math.max(1,Math.ceil(uu/0.06)))}
  const w=c.measureText(full).width;if(L.bg&&L.bg!=='none'){c.fillStyle=L.bg==='pill'?'#ffffff':L.bg;rr(c,-w/2-34,-(L.size||86)*0.75,w+68,(L.size||86)*1.5,26);c.fill()}c.fillStyle=L.bg==='pill'?pal.bg:col;if(L.anim==='words'||L.anim==='type'){c.textAlign='right';c.translate(w/2,0)}if(!L.bg||L.bg==='none'){c.lineWidth=(L.size||86)*0.08;c.strokeStyle='rgba(7,20,30,.55)';c.strokeText(txt,0,0)}c.fillText(txt,0,0)}
 else if(L.type==='lower'){const n=L.text||'',ti=L.sub||'';c.font=font(800,56);const wn=c.measureText(n).width;c.font=font(500,36);const wt=ti?c.measureText(ti).width:0;const pw=Math.max(wn,wt)+96,ph=ti?150:104;
  c.fillStyle=pal.bg;c.globalAlpha*=0.94;rr(c,-pw/2,-ph/2,pw,ph,18);c.fill();c.globalAlpha=k.a;c.fillStyle=pal.acc;c.fillRect(pw/2-14,-ph/2,14,ph);c.fillStyle=pal.fg;c.textAlign='right';c.font=font(800,56);c.fillText(n,pw/2-44,ti?-26:0);if(ti){c.font=font(500,36);c.fillText(ti,pw/2-44,34)}}
 else if(L.type==='el'){const e=L.el;c.fillStyle=col;c.strokeStyle=col;c.lineWidth=14;c.lineCap='round';c.lineJoin='round';
  if(e==='logo'){const i=LOGO[pal.logo==='white'?'white':'navy'];if(i){c.fillStyle=pal.bg;c.globalAlpha*=0.9;rr(c,-190,-62,380,124,26);c.fill();c.globalAlpha=k.a;c.drawImage(i,-160,-40,320,80)}}
  else if(e==='dot'){c.beginPath();c.arc(0,0,34,0,7);c.fill()}
  else if(e==='arrow'){c.beginPath();c.moveTo(-120,40);c.quadraticCurveTo(-20,-70,110,-30);c.stroke();c.beginPath();c.moveTo(110,-30);c.lineTo(62,-62);c.moveTo(110,-30);c.lineTo(78,18);c.stroke()}
  else if(e==='ring'){const pr=clamp((t-L.start)/0.45);c.beginPath();c.ellipse(0,0,170,120,-0.1,-Math.PI/2,-Math.PI/2+Math.PI*2.1*pr);c.stroke()}
  else if(e==='bar'){const pr=clamp((t-L.start)/0.35);c.fillRect(160-320*pr,-12,320*pr,24)}
  else if(e==='newtag'||e==='badge'){const txt=L.text||(e==='newtag'?'חדש':'מאושר');c.font=font(800,60);const w=c.measureText(txt).width;c.fillStyle=e==='badge'?'#d9a427':pal.acc;rr(c,-w/2-40,-52,w+80,104,e==='badge'?52:20);c.fill();c.fillStyle='#ffffff';c.fillText(txt,0,4)}
  else if(e==='check'){c.beginPath();c.arc(0,0,70,0,7);c.fill();c.strokeStyle=pal.bg===col?'#fff':(col==='#ffffff'?'#07293a':'#ffffff');c.beginPath();c.moveTo(-32,2);c.lineTo(-8,28);c.lineTo(36,-26);c.stroke()}
  else if(e==='star'){c.beginPath();for(let i=0;i<24;i++){const r=i%2?60:150,a=i*Math.PI/12+(t-L.start)*0.6;c.lineTo(Math.cos(a)*r,Math.sin(a)*r)}c.closePath();c.fill()}
  else if(e==='pin'){c.beginPath();c.arc(0,-40,58,Math.PI,0);c.lineTo(0,80);c.closePath();c.fill();c.fillStyle=pal.bg;c.beginPath();c.arc(0,-40,24,0,7);c.fill()}}
 c.restore();
 if(sel){c.save();c.strokeStyle='#ffd47a';c.setLineDash([10,8]);c.lineWidth=3;const r=110*sc;c.strokeRect(x-r*1.6,y-r*0.8,r*3.2,r*1.6);c.restore()}}
function capPages(p){return p.layers.filter(l=>l.type==='cap').sort((a,b)=>a.start-b.start)}
function drawCaptions(c,W,H,t,pal){const p=E.p;const L=capPages(p).find(l=>t>=l.start&&t<=l.end);if(!L)return;const words=(L.text||'').split(/\s+/).filter(Boolean);if(!words.length)return;
 const px=W*0.062,st=p.capStyle,y=(L.y||p.capY)*H;c.save();c.direction='rtl';c.textAlign='center';c.textBaseline='middle';c.font=font(800,px);
 const full=words.join(' '),w=Math.min(W*0.86,c.measureText(full).width),u=t-L.start,s=0.94+0.06*clamp(u/0.12),prog=(t-L.start)/Math.max(0.2,L.end-L.start);
 c.translate(W/2,y);c.scale(s,s);
 if(st==='pill'){c.fillStyle='rgba(255,255,255,.96)';rr(c,-w/2-px*0.5,-px*0.85,w+px,px*1.7,px*0.5);c.fill();c.fillStyle='#07293a';c.fillText(full,0,2,W*0.86)}
 else if(st==='brand'){c.fillStyle=pal.bg;rr(c,-w/2-px*0.5,-px*0.85,w+px,px*1.7,px*0.3);c.fill();c.fillStyle=pal.fg;c.fillText(full,0,2,W*0.86)}
 else if(st==='bold'){c.lineWidth=px*0.16;c.strokeStyle='rgba(7,20,30,.9)';c.strokeText(full,0,0,W*0.86);c.fillStyle='#fff';c.fillText(full,0,0,W*0.86)}
 else{// karaoke: the words light up in order, timed evenly across the caption
  const ws=words.map(x=>c.measureText(x+' ').width),tot=ws.reduce((a,b)=>a+b,0),k=Math.min(1,(W*0.86)/tot);c.scale(k,k);let x=tot/2;
  c.lineWidth=px*0.14;c.strokeStyle='rgba(7,20,30,.9)';words.forEach((wd,i)=>{const on=prog>=i/words.length;c.strokeText(wd,x-ws[i]/2,0);c.fillStyle=on?(pal.acc==='#8fb6c8'?'#ffd47a':'#ffd47a'):'#ffffff';c.fillText(wd,x-ws[i]/2,0);x-=ws[i]})}
 c.restore()}
const LOGO={};function logos(){if(LOGO.p)return LOGO.p;const mk=(k,col)=>new Promise(r=>{const i=new Image();i.onload=()=>{LOGO[k]=i;r()};i.onerror=r;try{i.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(LOGO_SVG(col))}catch(e){r()}});LOGO.p=Promise.all([mk('white',{fg:'#ffffff',o1:'#8fb6c8',o2:'#dbe8ee'}),mk('navy',{fg:'#07293a',o1:'#a90b0c',o2:'#105572'})]);return LOGO.p}
const TMP={};function tmp(W,H){if(!TMP.c||TMP.c.width!==W||TMP.c.height!==H){TMP.c=document.createElement('canvas');TMP.c.width=W;TMP.c.height=H;TMP.x=TMP.c.getContext('2d')}TMP.x.clearRect(0,0,W,H);TMP.x.drawImage(TMP.src,0,0);return TMP.c}
const hash=n=>{n=(n*2654435761)>>>0;n^=n>>>15;n=Math.imul(n,2246822519)>>>0;n^=n>>>13;return (n&0xffffff)/0x1000000};
function fxOn(p,t,kind){return p.layers.filter(l=>l.type==='fx'&&l.fx===kind&&t>=l.start&&t<=l.end)}
function frameAt(c,W,H,t,v,selId){const p=E.p,s=seq(),ph=phaseOf(s,t);K(()=>__v127.drawFrame(c,W,H,s,t,()=>v));const pal=PAL[p.kit.pal]||PAL.navy;TMP.src=c.canvas;
 // colour look on the clip
 if(ph.p==='clip'&&p.look&&p.look!=='none'&&LOOKF[p.look]){const tc=tmp(W,H);c.save();c.filter=LOOKF[p.look];c.drawImage(tc,0,0);c.restore();
  if(p.look==='brand'){c.save();c.globalCompositeOperation='soft-light';c.globalAlpha=0.22;c.fillStyle='#105572';c.fillRect(0,0,W,H);c.restore()}
  if(p.look==='cinematic'){vign(c,W,H,0.55)}}
 // camera: punch zoom, shake, focus pull
 let z=1,dx=0,dy=0,bl=0;fxOn(p,t,'zoom').forEach(l=>{const u=t-l.start,d=l.end-l.start;z*=1+(l.amt||0.14)*clamp(spring(u,2.6,.8))*(1-clamp((u-d+0.25)/0.25))});
 fxOn(p,t,'shake').forEach(l=>{const u=t-l.start,a=(l.amt||1)*26*(W/1080)*Math.exp(-u/0.18);dx+=a*Math.sin(u*2*Math.PI*17);dy+=a*0.8*Math.cos(u*2*Math.PI*19)});
 fxOn(p,t,'blur').forEach(l=>{bl+=(1-clamp((t-l.start)/(l.end-l.start)))*14*(W/1080)});
 if(z!==1||dx||dy||bl){const tc=tmp(W,H);c.save();if(bl)c.filter=`blur(${bl.toFixed(1)}px)`;c.translate(W/2+dx,H/2+dy);c.scale(z,z);c.drawImage(tc,-W/2,-H/2);c.restore()}
 p.layers.filter(l=>l.type!=='cap'&&l.type!=='fx').forEach(L=>drawLayer(c,W,H,L,t,pal,L.id===selId));drawCaptions(c,W,H,t,pal);
 overFx(c,W,H,t,p,pal);
 if(p.progress&&ph.p==='clip'){const q=clamp(ph.lt/Math.max(0.1,s.clips[0].dur));c.fillStyle='rgba(255,255,255,.25)';c.fillRect(0,0,W,Math.max(6,H*0.004));c.fillStyle=pal.acc==='#8fb6c8'?'#a90b0c':pal.acc;c.fillRect(W*(1-q),0,W*q,Math.max(6,H*0.004))}}
function vign(c,W,H,a){const g=c.createRadialGradient(W/2,H/2,Math.min(W,H)*0.35,W/2,H/2,Math.max(W,H)*0.75);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,`rgba(0,0,0,${a})`);c.fillStyle=g;c.fillRect(0,0,W,H)}
function overFx(c,W,H,t,p,pal){
 fxOn(p,t,'vignette').forEach(()=>vign(c,W,H,0.6));
 fxOn(p,t,'leak').forEach(l=>{const u=t-l.start,d=l.end-l.start,a=Math.sin(Math.PI*clamp(u/d))*0.55;c.save();c.globalCompositeOperation='screen';const x=W*(1.1-0.9*u/d),g=c.createRadialGradient(x,H*0.25,0,x,H*0.25,W*0.8);g.addColorStop(0,`rgba(255,170,80,${a})`);g.addColorStop(0.5,`rgba(255,90,40,${a*0.5})`);g.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=g;c.fillRect(0,0,W,H);c.restore()});
 fxOn(p,t,'split').forEach(l=>{const u=t-l.start,o=(l.amt||1)*14*(W/1080)*Math.exp(-u/0.18);if(o<0.5)return;const tc=tmp(W,H);c.save();c.globalCompositeOperation='screen';c.globalAlpha=0.55;c.filter='sepia(1) saturate(6) hue-rotate(-50deg)';c.drawImage(tc,o,0);c.filter='sepia(1) saturate(6) hue-rotate(150deg)';c.drawImage(tc,-o,0);c.restore()});
 fxOn(p,t,'glitch').forEach(l=>{const f=Math.round(t*30),tc=tmp(W,H);for(let i=0;i<7;i++){const y=hash(f*13+i)*H,h=(8+hash(f*7+i)*60)*(H/1920),sh=(hash(f*3+i)-0.5)*120*(W/1080);c.drawImage(tc,0,y,W,h,sh,y,W,h)}});
 fxOn(p,t,'shine').forEach(l=>{const u=clamp((t-l.start)/(l.end-l.start)),x=-W*0.3+u*W*1.6;c.save();c.globalCompositeOperation='screen';const g=c.createLinearGradient(x-120,0,x+120,H*0.2);g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(0.5,'rgba(255,255,255,.55)');g.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=g;c.translate(0,0);c.rotate(-0.25);c.fillRect(x-200,-H,400,H*3);c.restore()});
 fxOn(p,t,'confetti').forEach(l=>{const u=t-l.start,cols=['#a90b0c','#ffd47a','#105572','#ffffff','#8fb6c8'];for(let i=0;i<120;i++){const a=hash(i*5)*6.283,sp=(500+hash(i*7)*1300)*(W/1080),x=W/2+Math.cos(a)*sp*u,y=H*0.45+Math.sin(a)*sp*u+1500*(H/1920)*u*u;c.save();c.translate(x,y);c.rotate(u*10+i);c.fillStyle=cols[i%5];c.globalAlpha=1-clamp((u-1.2)/0.5);c.fillRect(-9,-5,18,10);c.restore()}});
 fxOn(p,t,'flash').forEach(l=>{const u=t-l.start;c.fillStyle=`rgba(255,255,255,${0.9*Math.exp(-u/0.07)})`;c.fillRect(0,0,W,H)});
 fxOn(p,t,'dipw').forEach(l=>{const u=clamp((t-l.start)/(l.end-l.start));c.fillStyle=`rgba(255,255,255,${Math.sin(Math.PI*u)})`;c.fillRect(0,0,W,H)});
 fxOn(p,t,'dipb').forEach(l=>{const u=clamp((t-l.start)/(l.end-l.start));c.fillStyle=`rgba(0,0,0,${Math.sin(Math.PI*u)})`;c.fillRect(0,0,W,H)})}
function draw(){const cv=document.getElementById('v129cv');if(!cv||!E.p||!window.__v127)return;const [W,H]=dims(0.5);if(cv.width!==W||cv.height!==H){cv.width=W;cv.height=H}
 const s=seq(),t=clamp(E.t,0,s.total),v=E.video;if(v){const ph=phaseOf(s,t);if(ph.p==='clip'&&!E.playing){const want=(E.p.in||0)+ph.lt;if(Math.abs(v.currentTime-want)>0.05&&!v.seeking)v.currentTime=want}}
 frameAt(cv.getContext('2d'),W,H,t,v,E.sel);const tl=document.getElementById('v129time');if(tl)tl.textContent=`${fmtT(t)} / ${fmtT(s.total)}`;const ph=document.getElementById('v129ph');if(ph)ph.style.insetInlineStart=`calc(${(t/Math.max(0.01,s.total))*100}% - 1px)`}
function phaseOf(s,t){if(t<s.intro)return {p:'intro',lt:t};const c=s.clips[0];if(c&&t<c.start+c.dur)return {p:'clip',lt:t-c.start,c};return {p:'outro',lt:t-s.clipsEnd}}

// ---------- playback (with music and sound effects)
async function buf(url){if(E.audio[url])return E.audio[url];E.audio[url]=(async()=>{const AC=E.ac||(E.ac=new (window.AudioContext||window.webkitAudioContext)());const r=await fetch(url);return AC.decodeAudioData(await r.arrayBuffer())})();return E.audio[url]}
const sfxUrl=n=>`sfx/${n}.mp3`;
function play(on){const v=E.video;cancelAnimationFrame(E.raf);E.playing=on;stopAudio();if(!on){if(v)v.pause();draw();setPlay();return}
 const s=seq();if(E.t>=s.total-0.05)E.t=0;E.last=performance.now();startAudio(E.t,false);
 const loop=now=>{if(!E.playing)return;const ph=phaseOf(s,E.t);
  if(ph.p==='clip'&&v){if(v.paused){v.currentTime=(E.p.in||0)+ph.lt;v.muted=E.p.mute;v.play().catch(()=>{})}E.t=ph.c.start+(v.currentTime-(E.p.in||0));if(v.currentTime>=(E.p.out||v.duration)-0.03||v.ended){v.pause();E.t=s.clipsEnd+0.001}}
  else{if(v&&!v.paused)v.pause();E.t+=(now-E.last)/1000}E.last=now;if(E.t>=s.total){E.t=s.total;play(false);return}draw();E.raf=requestAnimationFrame(loop)};setPlay();E.raf=requestAnimationFrame(loop)}
function allSfx(p){return p.sfx.concat(p.layers.filter(l=>l.snd).map(l=>({name:l.snd,at:l.start,vol:l.sndVol||0.6})))}
function setPlay(){const b=document.querySelector('[data-v129="play"]');if(b)b.textContent=E.playing?'השהיה':'ניגון'}
const live=[];function stopAudio(){live.forEach(n=>{try{n.stop()}catch(e){}});live.length=0}
async function startAudio(t0,dest){const p=E.p;const AC=E.ac||(E.ac=new (window.AudioContext||window.webkitAudioContext)());if(AC.state==='suspended')AC.resume();const out=dest||AC.destination,now=AC.currentTime,s=seq();
 for(const x of allSfx(p)){if(x.at<t0)continue;try{const b=await buf(sfxUrl(x.name));const n=AC.createBufferSource(),g=AC.createGain();g.gain.value=x.vol||0.7;n.buffer=b;n.connect(g);g.connect(out);n.start(now+(x.at-t0));live.push(n)}catch(e){}}
 if(p.music&&E.musicFile){try{const b=await (E.musicBuf||(E.musicBuf=E.musicFile.arrayBuffer().then(a=>AC.decodeAudioData(a))));const n=AC.createBufferSource(),g=AC.createGain();n.buffer=b;n.loop=true;g.gain.value=p.music.vol||0.2;n.connect(g);g.connect(out);n.start(now,t0%b.duration);live.push(n);E.musicGain=g}catch(e){}}}

// ---------- export: canvas + video audio + music (ducked) + sound effects into MediaRecorder
function mime(){return ['video/mp4;codecs=avc1.640028,mp4a.40.2','video/mp4;codecs=avc1.42E01F,mp4a.40.2','video/webm;codecs=vp9,opus','video/webm'].find(m=>window.MediaRecorder&&MediaRecorder.isTypeSupported(m))||''}
async function exportNow(save){const p=E.p;if(!E.urls[p.id]){toastSafe('הסרטון לא נטען');return null}play(false);await logos();
 const [W,H]=dims(1),cv=document.createElement('canvas');cv.width=W;cv.height=H;const ctx=cv.getContext('2d'),s=seq();
 const AC=new (window.AudioContext||window.webkitAudioContext)(),dst=AC.createMediaStreamDestination(),an=AC.createAnalyser();an.fftSize=1024;const bufA=new Float32Array(1024);
 const v=document.createElement('video');v.src=E.urls[p.id];v.playsInline=true;v.crossOrigin='anonymous';await new Promise(r=>{v.onloadeddata=r;v.onerror=r});
 const vg=AC.createGain();vg.gain.value=p.mute?0:1;try{AC.createMediaElementSource(v).connect(vg)}catch(e){}vg.connect(dst);vg.connect(an);
 let mg=null;if(p.music&&E.musicFile){try{const b=await AC.decodeAudioData(await E.musicFile.arrayBuffer());const n=AC.createBufferSource();n.buffer=b;n.loop=true;mg=AC.createGain();mg.gain.value=0;n.connect(mg);mg.connect(dst);n.start()}catch(e){}}
 const SND=allSfx(p);const sfxB={};for(const x of SND){try{const r=await fetch(sfxUrl(x.name));sfxB[x.name]=await AC.decodeAudioData(await r.arrayBuffer())}catch(e){}}
 const st=cv.captureStream(30);dst.stream.getAudioTracks().forEach(tr=>st.addTrack(tr));const mt=mime();
 const rec=new MediaRecorder(st,mt?{mimeType:mt,videoBitsPerSecond:p.kit.quality==='fast'?5e6:9e6,audioBitsPerSecond:192000}:{});const ch=[];rec.ondataavailable=e=>e.data.size&&ch.push(e.data);
 frameAt(ctx,W,H,0,v,null);const done=new Promise(r=>rec.onstop=r);rec.start(500);const t0=AC.currentTime;
 SND.forEach(x=>{const b=sfxB[x.name];if(!b)return;const n=AC.createBufferSource(),g=AC.createGain();g.gain.value=x.vol||0.7;n.buffer=b;n.connect(g);g.connect(dst);n.start(t0+x.at)});
 let t=0,last=performance.now(),started=false;const vol=clamp(p.music?p.music.vol:0.2);
 await new Promise(res=>{const tick=()=>{if(E.busy&&E.busy.cancel)return res();const now=performance.now(),ph=phaseOf(s,t);
  if(ph.p==='clip'){if(!started){started=true;v.currentTime=p.in||0;v.play().catch(()=>{})}if(!v.paused&&!v.seeking)t=ph.c.start+Math.max(0,v.currentTime-(p.in||0));if(v.currentTime>=(p.out||v.duration)-0.02||v.ended){v.pause();t=ph.c.start+ph.c.dur+0.0005}}
  else{if(!v.paused)v.pause();t+=(now-last)/1000}last=now;
  if(mg){let target=ph.p==='clip'?vol:Math.min(0.9,vol*2.2);if(p.music.duck&&ph.p==='clip'){an.getFloatTimeDomainData(bufA);let q=0;for(let i=0;i<bufA.length;i+=4)q+=bufA[i]*bufA[i];if(Math.sqrt(q/256)>0.02)target=vol*0.45}if(t>s.total-0.8)target*=clamp((s.total-t)/0.8);mg.gain.setTargetAtTime(target,AC.currentTime,0.08)}
  frameAt(ctx,W,H,Math.min(t,s.total-0.001),v,null);if(E.busy){E.busy.p=clamp(t/s.total);busyUI()}if(t>=s.total)return res();setTimeout(tick,1000/60)};tick()});
 rec.stop();await done;v.pause();try{AC.close()}catch(e){}if(E.busy&&E.busy.cancel)return null;
 const type=(mt||'video/webm').split(';')[0],blob=new Blob(ch,{type}),d=new Date(),pad=x=>String(x).padStart(2,'0');
 const file=`kurkoos-${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.${type==='video/mp4'?'mp4':'webm'}`;
 return {blob,url:URL.createObjectURL(blob),file,type,size:blob.size,ver:p.versions.length}}
function busyUI(){const b=document.getElementById('v129busy');if(!b||!E.busy)return;b.querySelector('i').style.width=Math.round(E.busy.p*100)+'%';b.querySelector('span').textContent=`${E.busy.label} · ${Math.round(E.busy.p*100)}%`}
async function doExport(){E.busy={p:0,label:'מייצא בזמן אמת, השאירו את הלשונית פתוחה',cancel:false};refresh();try{const r=await exportNow();if(r){E.outs.unshift(r);E.tab='ver';toastSafe('הקובץ מוכן להורדה. הוא מחכה בלשונית "גרסאות והורדה"')}}catch(e){toastSafe('הייצוא נכשל: '+(e&&e.message||e))}E.busy=null;refresh()}
async function saveToLibrary(o){const V=window.__vid,VD=V&&V.VD;if(!VD||!VD.assets||!VD.db){toastSafe('השמירה בספרייה זמינה כשהדף פתוח ב-claude.ai עם הרשאת עריכה');return}
 if(o.size>20*1024*1024){toastSafe('הקובץ גדול מ-20MB. בחרו "מהיר" בפורמט וייצאו שוב');return}
 try{const f=new File([o.blob],o.file,{type:o.type});const r=await VD.assets.upload(f);await V.queueDoc({id:uid('v'),name:E.p.name+' · גרסה '+(o.ver||E.p.versions.length||1),srcId:r.id,srcUrl:r.url,out:r.url,status:'done',source:'editor',editOf:E.p.src.docId||null});toastSafe('נשמר בספרייה')}catch(e){toastSafe('השמירה נכשלה: '+(e&&e.message||e))}}
// only this video goes to the professional editor (plan first, approval in its card)
async function sendPro(){const V=window.__vid,VD=V&&V.VD;if(!VD||!VD.db||!VD.assets){toastSafe('השליחה לעורך זמינה כשהדף פתוח ב-claude.ai עם הרשאת עריכה');return}
 const p=E.p;if(!p.fx.length&&!p.smOn&&!(p.studio&&p.studio!=='none')&&PRO.every(x=>(p.pro||{})[x[0]]===false)){toastSafe('בחרו לפחות שלב, אפקט או סגנון אישי');return}const miss=p.fx.filter(f=>f.id!=='rewind'&&!(f.word||'').trim()&&(f.at==null||f.at===''));if(miss.length){toastSafe('חסרה מילה לאפקט: '+miss.map(f=>FXS.find(x=>x[0]===f.id)[1]).join(', '));return}
 const sig=p.fx.map(f=>{const o={kind:f.id};if(f.word)o.word=f.word.trim();if(f.at!=null&&f.at!==''&&!isNaN(+f.at))o.at=+f.at;if(f.text)o[f.id==='title3d'||f.id==='gold'?'text':'title']=f.text.trim();return o});
 const steps=PRO.map(x=>x[0]).filter(id=>(p.pro||{})[id]!==false);const pro={steps,cut:steps.includes('cut'),reframe:steps.includes('reframe'),grade:steps.includes('grade')?'mid':'off',captions:steps.includes('captions')?(p.capStyle==='karaoke'?'kinetic':'pill'):'off',loudness:steps.includes('loudness'),review:true};
 if(p.studio&&p.studio!=='none'&&(p.studioText||'').trim())sig.unshift({kind:'studio_'+p.studio,text:p.studioText.trim()});
 const stylemaker=p.smOn?{name:String((p.sm||{}).name||'kurkoos').toLowerCase().replace(/[^a-z0-9-]/g,'')||'kurkoos',answers:Object.assign({q3:'brand'},p.sm||{}),brand:{bg:'#07293a',ink:'#ffffff',main:'#105572',accent:'#a90b0c',soft:'#8fb6c8'}}:null;
 const s0=seq(),caps=p.layers.filter(l=>l.type==='cap').map(l=>({text:l.text,start:+((p.in||0)+Math.max(0,l.start-s0.intro)).toFixed(2),end:+((p.in||0)+Math.max(0,l.end-s0.intro)).toFixed(2)}));
 const edit={caps,look:p.look||'none',progress:!!p.progress,layers:p.layers,sfx:allSfx(p),capStyle:p.capStyle,trim:{in:p.in,out:p.out},mute:p.mute,music:p.music?{name:p.music.name,vol:p.music.vol,duck:p.music.duck}:null};
 E.busy={p:0,label:'שולח את הסרטון הזה לעורך',cancel:false};refresh();
 try{let d;if(p.src.kind==='tray'){const it=__v127.T.items.find(x=>x.id===p.src.trayId);const f=window.__v128?await __v128.shrink(it.file):it.file;const r=await VD.assets.upload(f);
   d=await V.queueDoc({id:uid('v'),name:p.name,srcId:r.id,srcUrl:r.url,source:'editor',status:'plan_requested',phase:'plan',sig,stylemaker,kit:p.kit,edit,pro,trim:{in:p.in,out:p.out},mute:p.mute});p.src={kind:'doc',docId:d.id,name:p.name};persist()}
  else if(!VD.docs.find(x=>x.id===p.src.docId)){d=await V.queueDoc({id:uid('v'),name:p.name,path:p.src.path||null,srcUrl:p.src.url||null,srcId:(String(p.src.url||'').match(/_blob\/([0-9a-f]{32})/)||[])[1]||null,source:'editor',status:'plan_requested',phase:'plan',sig,stylemaker,kit:p.kit,edit,pro,trim:{in:p.in,out:p.out},mute:p.mute})}
  else{const src=VD.docs.find(x=>x.id===p.src.docId);const upd={status:'plan_requested',phase:'plan',sig,stylemaker,kit:p.kit,edit,pro,trim:{in:p.in,out:p.out},mute:p.mute,requested:new Date().toISOString()};await VD.db.collection('videos').doc(src.id).update(upd);d=Object.assign({},src,upd)}
  await V.editVideo(Object.assign({__direct:1},d));toastSafe('רק הסרטון הזה נשלח לעורך. התוכנית תחכה לאישור שלך')}catch(e){toastSafe('השליחה נכשלה: '+(e&&e.message||e))}E.busy=null;refresh()}

// ---------- one-click edit by style
function spread(p,txt){const w=(txt||'').trim().split(/\s+/).filter(Boolean);if(!w.length)return 0;const s=seq(),a0=s.intro,a1=s.clipsEnd,ch=[];for(let i=0;i<w.length;i+=4)ch.push(w.slice(i,i+4).join(' '));const per=(a1-a0)/ch.length;
 p.layers=p.layers.filter(l=>l.type!=='cap');ch.forEach((c,i)=>p.layers.push({id:uid('c'),type:'cap',text:c,start:a0+i*per,end:a0+(i+1)*per-0.05,y:p.capY}));return ch.length}
function buildRecipe(id){const p=E.p;if(!E.urls[p.id]){toastSafe('הסרטון עוד נטען');return}
 if(p.layers.length||p.sfx.length)saveVersion(true);
 change(q=>{q.recipe=id;q.layers=q.layers.filter(l=>!l.auto);const k=q.kit;const add=L=>q.layers.push(Object.assign({id:uid('a'),auto:true},L));
  const s=seq(),a0=s.intro,a1=s.clipsEnd,len=a1-a0;
  if(id==='clean'){q.look='none';q.capStyle='pill';q.progress=false;Object.assign(k,{intro:'logo',outro:'logo',frame:'none',logo:true,lower:false})}
  if(id==='energy'){q.look='vivid';q.capStyle='karaoke';q.progress=true;Object.assign(k,{intro:'logo',outro:k.cta?'cta':'logo',frame:'none',logo:true,lower:false});
   add({type:'fx',fx:'flash',start:a0,end:a0+0.35,snd:'sig-impact'});add({type:'fx',fx:'shake',start:a0,end:a0+0.5});
   for(let t=a0+2.6,i=0;t<a1-1;t+=2.8,i++)add({type:'fx',fx:i%3===2?'glitch':'zoom',start:t,end:t+(i%3===2?0.45:1.6),amt:0.12,snd:i%3===2?'glitch-blip':'whoosh-quick'});
   if(len>4)add({type:'fx',fx:'confetti',start:a1-1.9,end:a1-0.1,snd:'sig-confetti'})}
  if(id==='cinematic'){q.look='cinematic';q.capStyle='bold';q.progress=false;Object.assign(k,{intro:'logo',outro:'logo',frame:'none',logo:false,lower:false});
   add({type:'fx',fx:'blur',start:a0,end:a0+0.9,snd:'swipe'});add({type:'fx',fx:'leak',start:a0+0.2,end:a0+2.4});if(len>5)add({type:'fx',fx:'leak',start:a1-2.6,end:a1-0.4});add({type:'fx',fx:'dipb',start:a1-0.5,end:a1+0.1})}
  if(id==='brand'){q.look='brand';q.capStyle='brand';q.progress=true;Object.assign(k,{intro:'logo',outro:k.cta?'cta':'logo',frame:'bar',logo:true,lower:false});
   add({type:'lower',text:k.lname||'קבוצת קורקוס',sub:k.ltitle||'',start:a0+0.6,end:Math.min(a1,a0+4.6),x:0.62,y:0.72,scale:1,anim:'slide',snd:'swipe'});
   add({type:'el',el:'dot',start:a0+0.3,end:a1,x:0.9,y:0.16,scale:0.5,anim:'pop',color:'#a90b0c'});add({type:'fx',fx:'shine',start:a0+0.1,end:a0+0.9,snd:'sparkle'})}
  const tx=(document.getElementById('v129paste')||{}).value;if(tx&&tx.trim())spread(q,tx)});
 toastSafe('הגרסה מוכנה. אפשר לשנות כל דבר בצד ובציר הזמן, ולשמור גרסה')}

// ---------- versions
function saveVersion(quiet){const p=E.p;const n=(p.versions.length?p.versions[p.versions.length-1].n:0)+1;p.versions.push({n,at:Date.now(),note:'',data:snap(p)});if(p.versions.length>30)p.versions.shift();p.dirty=false;persist();if(!quiet){toastSafe('גרסה '+n+' נשמרה');refresh()}}
function restore(n){const v=E.p.versions.find(x=>x.n===n);if(!v)return;change(p=>{Object.assign(p,JSON.parse(JSON.stringify(v.data)),{versions:p.versions,id:p.id})});toastSafe('חזרת לגרסה '+n)}

// ---------- status of this video at the editor
function docStatus(){const p=E.p;if(!p||p.src.kind!=='doc')return null;const V=window.__vid,d=V&&V.VD.docs.find(x=>x.id===p.src.docId);return d||null}
const STAT={queued:'בתור לעריכה',editing:'בעריכה אצל העורך…',plan_requested:'מכין תוכנית…',planning:'מכין תוכנית…',awaiting_approval:'תוכנית מחכה לאישור שלך',approved:'אושר, בעריכה…',done:'מוכן',failed:'נכשל',library:'בספרייה'};

// ---------- UI
const seg=(k,opts,cur,attr='data-v129k')=>`<span class="v129seg" role="group">${opts.map(([v,l])=>`<button type="button" ${attr}="${k}" data-val="${v}" aria-pressed="${cur===v}">${l}</button>`).join('')}</span>`;
function selL(){return E.p.layers.find(l=>l.id===E.sel)||null}
function sndSel(L){return `<label class="v129f"><span>צליל שנוחת עם הכניסה</span><select data-v129ls="snd"><option value="">בלי צליל</option>${SFX.map(([n,l])=>`<option value="${n}" ${L.snd===n?'selected':''}>${l}</option>`).join('')}</select></label>`}
function propsHtml(){const L=selL();if(!L)return '';const t=L.type;
 if(t==='fx'){const f=BFX.find(x=>x[0]===L.fx)||[0,''];return `<div class="v129props"><h5>אפקט: ${f[1]}<button type="button" class="v129x" data-v129="ldel">מחיקה</button></h5>
  <div class="v129two"><label class="v129f"><span>מתחיל</span><input type="number" step="0.1" min="0" data-v129l="start" value="${L.start.toFixed(1)}"></label><label class="v129f"><span>נגמר</span><input type="number" step="0.1" min="0" data-v129l="end" value="${L.end.toFixed(1)}"></label></div>
  ${['zoom','shake','split'].includes(L.fx)?`<label class="v129f"><span>עוצמה</span><input type="range" min="0.3" max="2.5" step="0.05" data-v129l="amt" value="${L.amt||1}"></label>`:''}${sndSel(L)}<button type="button" class="px-btn sm" data-v129="here">להתחיל כאן (${fmtT(E.t)})</button></div>`}
 return `<div class="v129props"><h5>${t==='cap'?'כתובית':t==='text'?'טקסט':t==='lower'?'כותרת תחתונה':'אלמנט'} נבחר<button type="button" class="v129x" data-v129="ldel" aria-label="מחיקה">מחיקה</button></h5>
 ${t!=='el'||['newtag','badge'].includes(L.el)?`<label class="v129f"><span>טקסט</span><input data-v129l="text" value="${esc(L.text||'')}"></label>`:''}
 ${t==='lower'?`<label class="v129f"><span>שורה שנייה</span><input data-v129l="sub" value="${esc(L.sub||'')}"></label>`:''}
 <div class="v129two"><label class="v129f"><span>מתחיל</span><input type="number" step="0.1" min="0" data-v129l="start" value="${L.start.toFixed(1)}"></label><label class="v129f"><span>נגמר</span><input type="number" step="0.1" min="0" data-v129l="end" value="${L.end.toFixed(1)}"></label></div>
 ${t!=='cap'?`<label class="v129f"><span>גודל</span><input type="range" min="0.4" max="2.6" step="0.05" data-v129l="scale" value="${L.scale||1}"></label><label class="v129f"><span>סיבוב</span><input type="range" min="-30" max="30" step="1" data-v129l="rot" value="${L.rot||0}"></label>
  <div class="v129sw">${COLORS.map(([c,n])=>`<button type="button" data-v129c="${c}" aria-pressed="${(L.color||'')===c}" title="${n}" aria-label="${n}" style="--c:${c}"></button>`).join('')}</div>
  ${seg('anim',ANIMS,L.anim||'pop','data-v129la')}${t==='text'?seg('bg',[['none','בלי רקע'],['pill','גלולה'],['#a90b0c','אדום'],['#07293a','כחול']],L.bg||'none','data-v129la'):''}`:'<small class="v129hint">גוררים את הכתובית בתצוגה כדי לשנות את הגובה של כל הכתוביות</small>'}
 ${t!=='cap'?sndSel(L):''}<button type="button" class="px-btn sm" data-v129="here">להתחיל כאן (${fmtT(E.t)})</button></div>`}
function fxPrev(id){return `<video muted loop playsinline autoplay preload="none" aria-hidden="true"><source src="fx/${id}.webm" type="video/webm"><source src="fx/${id}.mp4" type="video/mp4"></video>`}
function tabHtml(){const p=E.p,k=p.kit;
 if(E.tab==='style')return `<div class="v129card v129auto"><h5>עריכה אוטומטית בלחיצה</h5><p class="v129hint">בוחרים סגנון, והעורך בונה גרסה מוגמרת: צבע, פתיח וסיום, כותרת תחתונה, אפקטים, צלילים ופס התקדמות. אחר כך משנים כל דבר בצד ובציר הזמן.</p>
  <div class="v129rec">${RECIPES.map(([id,n,d])=>`<button type="button" data-v129="recipe" data-id="${id}" aria-pressed="${p.recipe===id}"><b>${n}</b><small>${d}</small></button>`).join('')}</div>
  <label class="v129f"><span>מה נאמר בסרטון (לא חובה, הופך לכתוביות)</span><textarea rows="3" id="v129paste" placeholder="מדביקים את הטקסט, וכל 3 עד 4 מילים הופכות לכתובית"></textarea></label>
  <button type="button" class="px-btn pri" data-v129="auto">${p.recipe?'בנייה מחדש בסגנון שנבחר':'בחרו סגנון ובנו גרסה'}</button></div>
  <div class="v129card"><h5>צבע לכל הסרטון</h5>${seg('look',LOOKS,p.look||'none','data-v129p')}<label class="v129tog"><input type="checkbox" data-v129pc="progress" ${p.progress?'checked':''}> פס התקדמות למעלה</label></div>`;
 if(E.tab==='anim')return `<div class="v129card"><h5>אפקטים בנקודה של הסמן (${fmtT(E.t)})</h5><div class="v129bfx">${BFX.map(([id,n])=>`<button type="button" data-v129="addfx" data-fx="${id}"><i class="v129ic v129ic-${id}" aria-hidden="true"></i>${n}</button>`).join('')}</div>
  <label class="v129tog"><input type="checkbox" data-v129pc="autoSnd" ${p.autoSnd!==false?'checked':''}> צליל מתאים לכל אפקט ולכל אלמנט שנוסף</label></div>
  <div class="v129card"><h5>אנימציה לטקסט ולאלמנטים</h5><p class="v129hint">בוחרים טקסט או אלמנט בתצוגה או בציר, ואז את סוג הכניסה: קפיצה, החלקה, דהייה, זום, ניתור, מילה אחרי מילה או מכונת כתיבה.</p>${selL()&&selL().type!=='fx'&&selL().type!=='cap'?seg('anim',ANIMS,selL().anim||'pop','data-v129la'):'<small class="v129hint">עוד לא נבחר טקסט או אלמנט</small>'}</div>`;
 if(E.tab==='brand')return `<div class="v129card"><h5>צבעים ופונט</h5><span class="v129pal">${Object.entries(PAL).map(([n,c])=>`<button type="button" data-v129kit="pal" data-val="${n}" aria-pressed="${k.pal===n}" style="--b:${c.bg};--a:${c.acc}"><i></i>${({navy:'כחול לילה',teal:'טורקיז',paper:'נייר',mist:'ערפל'})[n]}</button>`).join('')}</span>${seg('font',[['Almoni','אלמוני'],['Heebo','היבו'],['Rubik','רוביק']],k.font,'data-v129kit')}</div>
  <div class="v129card"><h5>לוגו ומסגרת</h5><label class="v129tog"><input type="checkbox" data-v129kc="logo" ${k.logo?'checked':''}> לוגו בפינה</label>${seg('lpos',[['tr','למעלה ימין'],['tl','למעלה שמאל'],['br','למטה ימין'],['bl','למטה שמאל']],k.lpos,'data-v129kit')}${seg('lsize',[['s','קטן'],['m','בינוני'],['l','גדול']],k.lsize,'data-v129kit')}${seg('frame',[['none','בלי מסגרת'],['thin','מסגרת דקה'],['bar','פס מותג']],k.frame,'data-v129kit')}</div>
  <div class="v129card"><h5>פתיח וסיום</h5>${seg('intro',[['none','בלי פתיח'],['logo','לוגו'],['headline','כותרת קינטית']],k.intro,'data-v129kit')}<input class="v129in" data-v129kt="introText" value="${esc(k.introText||'')}" placeholder="משפט פתיחה">${seg('outro',[['none','בלי סיום'],['logo','לוגו'],['cta','קריאה לפעולה']],k.outro,'data-v129kit')}<input class="v129in" data-v129kt="cta" value="${esc(k.cta||'')}" placeholder="למשל: דברו איתנו"></div>
  <div class="v129card"><h5>פורמט</h5>${seg('fmt',[['9:16','9:16'],['1:1','1:1'],['16:9','16:9'],['orig','מקורי']],k.fmt,'data-v129kit')}${seg('fit',[['fill','ממלא'],['frame','בתוך מסגרת מותג']],k.fit,'data-v129kit')}${seg('quality',[['hd','איכות מלאה'],['fast','מהיר וקטן']],k.quality,'data-v129kit')}</div>`;
 if(E.tab==='text')return `<div class="v129card"><h5>כתוביות</h5>${seg('capStyle',CAPSTY,p.capStyle,'data-v129p')}
  <button type="button" class="px-btn sm pri" data-v129="addcap">כתובית חדשה כאן</button>
  <label class="v129f"><span>הדבקת כל הטקסט ופיזור אוטומטי לאורך הסרטון</span><textarea rows="3" id="v129paste" placeholder="מדביקים את מה שנאמר, וכל 3 עד 4 מילים הופכות לכתובית. אחר כך מזיזים בציר"></textarea></label><button type="button" class="px-btn sm" data-v129="spread">פיזור לכתוביות</button>
  <small class="v129hint">לכתוביות מדויקות על המילה, שלחו לעורך המקצועי: הוא מתמלל עם זמן לכל מילה.</small></div>
  <div class="v129card"><h5>טקסט וכותרות</h5><button type="button" class="px-btn sm" data-v129="addtext">כותרת על המסך</button><button type="button" class="px-btn sm" data-v129="addlower">כותרת תחתונה עם שם</button></div>`;
 if(E.tab==='el')return `<div class="v129card"><h5>אלמנטים של המותג</h5><div class="v129els">${ELEMENTS.map(([e,n])=>`<button type="button" data-v129="addel" data-el="${e}"><canvas width="96" height="96" data-elprev="${e}" aria-hidden="true"></canvas><span>${n}</span></button>`).join('')}</div><small class="v129hint">כל אלמנט נכנס בנקודה שבה עומד הסמן. גוררים אותו בתצוגה, ומשנים צבע, גודל וזמן בצד.</small></div>`;
 if(E.tab==='sound')return `<div class="v129card"><h5>מוזיקת רקע</h5><label class="px-btn sm v129file"><input type="file" accept="audio/*" data-v129m hidden>${p.music?'החלפת שיר':'בחירת שיר'}</label>${p.music?`<small class="v129hint">${esc(p.music.name)}${E.musicFile?'':' · צריך לבחור את הקובץ שוב אחרי רענון'}</small><label class="v129f"><span>עוצמה</span><input type="range" min="0" max="0.8" step="0.02" data-v129mv="vol" value="${p.music.vol}"></label><label class="v129tog"><input type="checkbox" data-v129md ${p.music.duck?'checked':''}> יורדת כשמדברים</label><button type="button" class="v129x" data-v129="nomusic">להסיר את המוזיקה</button>`:'<small class="v129hint">רק שיר שמותר לכם לשימוש מסחרי</small>'}
  <label class="v129tog"><input type="checkbox" data-v129mute ${p.mute?'checked':''}> להשתיק את הסאונד המקורי</label></div>
  <div class="v129card"><h5>אפקטים קוליים בנקודה של הסמן</h5><div class="v129sfx">${SFX.map(([n,l])=>`<span><button type="button" data-v129="sfxprev" data-n="${n}" aria-label="השמעה של ${l}">▶</button><button type="button" data-v129="addsfx" data-n="${n}">${l}</button></span>`).join('')}</div>
  ${p.sfx.length?`<ul class="v129sl">${p.sfx.slice().sort((a,b)=>a.at-b.at).map(x=>`<li><b>${esc((SFX.find(s=>s[0]===x.name)||[0,x.name])[1])}</b><span>${fmtT(x.at)}</span><input type="range" min="0.1" max="1" step="0.05" value="${x.vol}" data-v129sv="${x.id}" aria-label="עוצמה"><button type="button" data-v129="sfxdel" data-id="${x.id}" aria-label="מחיקה">✕</button></li>`).join('')}</ul>`:''}</div>`;
 if(E.tab==='fx')return `<div class="v129card"><h5>שלבי העורך המקצועי</h5><small class="v129hint">הסקילים שהותקנו רצים אצל העורך בענן, על הסרטון הזה בלבד. קודם תוכנית לאישור שלך, ואז רינדור.</small>
  ${PRO.map(([id,n])=>`<label class="v129tog"><input type="checkbox" data-v129pro="${id}" ${(p.pro||{})[id]!==false?'checked':''}> ${n}</label>`).join('')}</div>
  <div class="v129card v129sm"><h5>סגנון אישי לרילס (style-maker)</h5><label class="v129tog"><input type="checkbox" data-v129pc="smOn" ${p.smOn?'checked':''}> להלביש על הסרטון את הסגנון האישי שלי</label>
  ${p.smOn?`<small class="v129hint">הסקיל בונה סגנון אנימציה משלך לסרטון שבו אתה מדבר למצלמה, שומר אותו לפעם הבאה, ומלביש אותו עם אנימציה וסאונד. העורך מראה טבלת סיפור לאישור לפני הרינדור.</small>
   <label class="v129f"><span>על מה הסרטון, למי הוא מדבר, ומה הצופה צריך לעשות בסוף</span><textarea rows="2" data-v129sm="q1" placeholder="למשל: וילות בהוד השרון, למשפחות, שישלחו הודעה">${esc((p.sm||{}).q1||'')}</textarea></label>
   ${SMQ.map(([k,l,o])=>`<div class="v129f"><span>${l}</span>${seg(k,o.concat([['x','לא יודע']]),(p.sm||{})[k]||'x','data-v129smk')}</div>`).join('')}
   <div class="v129f"><span>צבעים</span>${seg('q3',[['brand','צבעי קורקוס והלוגו'],['x','תציע לי שלוש פלטות']],(p.sm||{}).q3||'brand','data-v129smk')}</div>
   <label class="v129f"><span>שם לסגנון (באנגלית, מילה אחת)</span><input data-v129sm="name" value="${esc((p.sm||{}).name||'kurkoos')}" placeholder="kurkoos"></label>`:''}</div>
  <div class="v129card"><h5>פתיח מסטודיו האנימציה</h5>${seg('studio',[['none','בלי'],['kinetic','כותרות ענק'],['particles','שם שמתפרק לחלקיקים']],p.studio||'none','data-v129p')}${p.studio&&p.studio!=='none'?`<input class="v129in" data-v129pt="studioText" value="${esc(p.studioText||'')}" placeholder="${p.studio==='kinetic'?'3 עד 6 מילים':'מילה אחת או שם'}">`:''}</div>
  <div class="v129card"><h5>אפקטים קולנועיים על המילים</h5><small class="v129hint">18 אפקטי החתימה. בוחרים, וכותבים על איזו מילה כל אחד נוחת.</small>
  <div class="v129sigs">${FXS.map(([id,n])=>`<button type="button" data-v129="fxadd" data-id="${id}" aria-pressed="${p.fx.some(f=>f.id===id)}">${fxPrev(id)}<span>${n}</span></button>`).join('')}</div>
  ${p.fx.map((f,i)=>`<div class="v129fxr"><b>${FXS.find(x=>x[0]===f.id)[1]}</b>${f.id==='rewind'?'<small>בסוף הסרטון</small>':`<input class="v129in" data-v129fx="${i}" data-k="word" value="${esc(f.word||'')}" placeholder="על המילה (לא חובה)"><label class="v129f v129at"><span>או בשנייה</span><input type="number" step="0.1" min="0" data-v129fx="${i}" data-k="at" value="${f.at!=null?f.at:''}"></label>`}${['title3d','gold','opening'].includes(f.id)?`<input class="v129in" data-v129fx="${i}" data-k="text" value="${esc(f.text||'')}" placeholder="הטקסט">`:''}<button type="button" class="v129x" data-v129="fxdel" data-i="${i}" aria-label="להסיר">✕</button></div>`).join('')}
  <button type="button" class="px-btn pri" data-v129="pro" ${E.busy?'disabled':''}>שליחת הסרטון הזה לתוכנית</button></div>`;
 return `<div class="v129card"><h5>גרסאות</h5><button type="button" class="px-btn sm pri" data-v129="ver">שמירת גרסה עכשיו</button>
  ${p.versions.length?`<ul class="v129vl">${p.versions.slice().reverse().map(v=>`<li><b>גרסה ${v.n}</b><span>${new Date(v.at).toLocaleString('he-IL',{day:'numeric',month:'numeric',hour:'2-digit',minute:'2-digit'})}</span><span>${v.data.layers.length} שכבות · ${v.data.sfx.length} צלילים</span><button type="button" class="px-btn sm" data-v129="restore" data-n="${v.n}">חזרה לגרסה</button></li>`).join('')}</ul>`:'<small class="v129hint">עוד לא נשמרו גרסאות. כל שינוי נשמר כטיוטה באופן אוטומטי, וגרסה היא נקודה שאפשר לחזור אליה.</small>'}</div>
  ${E.outs.length?`<div class="v129card"><h5>קבצים שיוצאו</h5>${E.outs.map((o,i)=>`<div class="v129out"><video src="${o.url}" controls playsinline preload="metadata"></video><div><b>${esc(o.file)}</b><small>${(o.size/1048576).toFixed(1)}MB</small><a class="px-btn sm pri" href="${o.url}" download="${esc(o.file)}">הורדה</a><button type="button" class="px-btn sm" data-v129="lib" data-i="${i}">שמירה בספרייה</button></div></div>`).join('')}</div>`:''}`}
function tabsHtml(){return `<div class="v129tabs" role="tablist">${[['style','סגנון ועריכה אוטומטית'],['brand','מותג'],['text','כתוביות וטקסט'],['anim','אפקטים ואנימציה'],['el','אלמנטים'],['sound','סאונד'],['fx','העורך המקצועי'],['ver','גרסאות והורדה']].map(([k,l])=>`<button type="button" role="tab" data-v129tab="${k}" aria-selected="${E.tab===k}">${l}</button>`).join('')}</div>`}
function page(){const p=E.p;if(!p)return `<div class="v129 v129none"><h3>עורך הווידאו</h3><p>פותחים כאן סרטון אחד ועורכים רק אותו. בוחרים סרטון מהמגש או מהספרייה בעמוד "סרטונים ורילס" ולוחצים "פתיחה בעורך".</p>${Object.values(PROJ).length?`<h4>פרויקטים אחרונים</h4><div class="v129recent">${Object.values(PROJ).sort((a,b)=>b.touched-a.touched).slice(0,8).map(x=>`<button type="button" class="px-btn" data-v129="openp" data-id="${x.id}">${esc(x.name)}</button>`).join('')}</div>`:''}<button type="button" class="px-btn pri" data-v129="back">לסרטונים ורילס</button></div>`;
 const d=docStatus(),stt=d?STAT[d.status]||d.status:(p.src.kind==='tray'?'מקומי, עוד לא נשלח':'');const s=window.__v127&&E.urls[p.id]?seq():{total:p.out-p.in||1,intro:0,clipsEnd:p.out-p.in};
 return `<div class="v129" id="v129">
 <header class="v129top"><button type="button" class="v129back" data-v129="back" aria-label="חזרה לסרטונים">→</button><input class="v129name" data-v129="name" value="${esc(p.name)}" aria-label="שם הסרטון">
  ${stt?`<span class="v129st ${d&&['editing','planning','plan_requested','approved'].includes(d.status)?'on':''}">${esc(stt)}</span>`:''}<span class="v129ver">${p.versions.length?'גרסה '+p.versions[p.versions.length-1].n+(p.dirty?' · יש שינויים':''):'טיוטה'}</span>
  <span class="v129sp"></span><button type="button" class="v129ib" data-v129="undo" aria-label="ביטול" ${E.hist.length?'':'disabled'}>↶</button><button type="button" class="v129ib" data-v129="redo" aria-label="חזרה" ${E.fut.length?'':'disabled'}>↷</button>
  <button type="button" class="px-btn" data-v129="ver">שמירת גרסה</button><button type="button" class="px-btn pri" data-v129="export" ${E.busy||E.missing?'disabled':''}>ייצוא והורדה</button></header>
 ${E.busy?`<div class="v129busy" id="v129busy" role="status"><b><i></i></b><span></span><button type="button" class="px-btn sm" data-v129="cancel">ביטול</button></div>`:''}
 ${E.missing?`<p class="v129warn">הקובץ המקומי לא זמין אחרי רענון של הדף. הוסיפו את הסרטון שוב למגש, או שמרו אותו בספרייה כדי לערוך מכל מקום.</p>`:''}
 <div class="v129body">
  <aside class="v129panel">${tabsHtml()}
   ${propsHtml()}${tabHtml()}</aside>
  <section class="v129stage"><div class="v129cvw"><canvas id="v129cv" aria-label="תצוגה חיה של העריכה"></canvas></div>
   <div class="v129ctl"><button type="button" class="px-btn sm pri" data-v129="play">ניגון</button><span id="v129time"></span><button type="button" class="px-btn sm" data-v129="in">התחלה מכאן</button><button type="button" class="px-btn sm" data-v129="out">סוף כאן</button></div></section>
 </div>
 <div class="v129tl" id="v129tl" aria-label="ציר זמן"></div></div>`}
function timeline(){const el=document.getElementById('v129tl');if(!el||!E.p||!window.__v127||!E.urls[E.p.id])return;const p=E.p,s=seq(),T=Math.max(0.1,s.total),pc=x=>(clamp(x/T,0,1)*100).toFixed(3)+'%';
 const rows=[['וידאו',[{id:'_clip',start:s.intro,end:s.clipsEnd,label:p.name,cls:'clip'}]],['כתוביות',p.layers.filter(l=>l.type==='cap').map(l=>({id:l.id,start:l.start,end:l.end,label:l.text}))],['אפקטים',p.layers.filter(l=>l.type==='fx').map(l=>({id:l.id,start:l.start,end:l.end,label:(BFX.find(x=>x[0]===l.fx)||[0,''])[1],cls:'fx'}))],['טקסט ואלמנטים',p.layers.filter(l=>l.type!=='cap'&&l.type!=='fx').map(l=>({id:l.id,start:l.start,end:l.end,label:l.type==='el'?(ELEMENTS.find(x=>x[0]===l.el)||[0,''])[1]:l.text}))]];
 el.innerHTML=`<div class="v129ruler" data-v129seek>${Array.from({length:Math.floor(T)+1},(_,i)=>`<i style="inset-inline-start:${pc(i)}">${i}</i>`).join('')}<b id="v129ph" class="v129ph"></b></div>
  ${rows.map(([n,bars])=>`<div class="v129row"><span class="v129rl">${n}</span><div class="v129lane" data-v129seek>${bars.map(b=>`<div class="v129bar ${b.cls||''} ${b.id===E.sel?'on':''}" data-bar="${b.id}" style="inset-inline-start:${pc(b.start)};width:calc(${pc(b.end-b.start)})"><i data-h="s"></i><span>${esc(b.label||'')}</span><i data-h="e"></i></div>`).join('')}</div></div>`).join('')}
  <div class="v129row"><span class="v129rl">צלילים</span><div class="v129lane" data-v129seek>${allSfx(p).map(x=>`<b class="v129sf" style="inset-inline-start:${pc(x.at)}" title="${esc(x.name)}"></b>`).join('')}${p.music?`<div class="v129bar mus" style="inset-inline-start:0;width:100%"><span>${esc(p.music.name)}</span></div>`:''}</div></div>`;draw()}
function refresh(){const host=document.getElementById('appviews');if(!host||APP.view!=='veditor')return;const y=scrollY;host.innerHTML=page();timeline();draw();previews();setPlay();busyUI();scrollTo(0,y)}
function previews(){document.querySelectorAll('canvas[data-elprev]').forEach(c=>{const x=c.getContext('2d');x.clearRect(0,0,96,96);const pal=PAL[E.p.kit.pal]||PAL.navy;x.save();x.translate(48,48);x.scale(0.22,0.22);
 drawLayer(x,1080,1080,{type:'el',el:c.dataset.elprev,start:0,end:9,x:0,y:0,scale:1,anim:'none',color:c.dataset.elprev==='logo'?null:'#a90b0c'},1,pal,false);x.restore()})}

// ---------- open
async function open(src){if(!window.__v127){toastSafe('המערכת עוד נטענת');return}const p=newProject(src);E.p=p;E.sel=null;E.t=0;E.hist=[];E.fut=[];E.outs=[];E.musicFile=null;E.musicBuf=null;
 if(src.kind==='tray'){const it=__v127.T.items.find(x=>x.id===src.trayId);if(it){p.in=it.in||0;p.out=it.out||it.dur;p.dur=it.dur;p.name=p.name||it.name;E.urls[p.id]=it.url}}
 APP.view='veditor';try{render()}catch(e){}await logos();await attach();refresh()}
function openFromTray(id){const it=window.__v127&&__v127.T.items.find(x=>x.id===id);if(!it)return;open({kind:'tray',trayId:id,name:it.name,in:it.in,out:it.out,dur:it.dur})}
function openFromDoc(id){const V=window.__vid,d=V&&V.VD.docs.find(x=>x.id===id);if(!d)return;open({kind:'doc',docId:id,name:d.name,url:d.srcUrl||d.out})}

// ---------- nav: the editor is its own page
try{const g=VIEWS.find(g=>g[0]==='תוכן');if(g&&!g[1].some(v=>v[0]==='veditor')){const i=g[1].findIndex(v=>v[0]==='videos');g[1].splice(i+1,0,['veditor','עורך וידאו','play'])}}catch(e){}
VTITLE.veditor=['עורך וידאו','סרטון אחד בכל פעם: מותג, כתוביות, אלמנטים, סאונד, גרסאות והורדה'];
render=(f=>function(){const v=typeof APP!=='undefined'?APP.view:'';if(v!=='veditor')return f.apply(this,arguments);renderNav();const [t,s]=VTITLE[v];document.getElementById('vt').textContent=t;document.getElementById('vs').textContent=s;document.querySelectorAll('.wrap > section').forEach(sec=>sec.classList.add('view-hidden'));document.getElementById('vact').innerHTML='';
 if(E.playing)play(false);document.getElementById('appviews').innerHTML=page();timeline();draw();previews();try{window.__v99&&__v99.ensureNav()}catch(e){}})(render);

// ---------- canvas dragging: move the selected layer (or pick one); captions move all captions up or down
function canvasPt(e){const c=document.getElementById('v129cv'),r=c.getBoundingClientRect();return {x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height}}
function hit(pt){const t=E.t;const ls=E.p.layers.filter(l=>t>=l.start&&t<=l.end);for(let i=ls.length-1;i>=0;i--){const L=ls[i];if(L.type==='cap'){if(Math.abs(pt.y-(L.y||E.p.capY))<0.05)return L;continue}const r=0.12*(L.scale||1);if(Math.abs(pt.x-L.x)<r*1.3&&Math.abs(pt.y-L.y)<r*0.6)return L}return null}
let drag=null;
document.addEventListener('pointerdown',e=>{const c=e.target.closest&&e.target.closest('#v129cv');if(c){const pt=canvasPt(e),L=hit(pt);if(L){E.sel=L.id;E.hist.push(snap(E.p));drag={L,ox:pt.x-(L.x||0.5),oy:pt.y-(L.y||E.p.capY)};c.setPointerCapture(e.pointerId);refreshPanel()}else{E.sel=null;refreshPanel()}return}
 const bar=e.target.closest&&e.target.closest('#v129tl .v129bar[data-bar]');if(bar&&bar.dataset.bar!=='_clip'){const L=E.p.layers.find(l=>l.id===bar.dataset.bar);if(!L)return;E.sel=L.id;const lane=bar.parentElement.getBoundingClientRect(),T=seq().total;E.hist.push(snap(E.p));
  drag={bar:true,L,h:e.target.dataset.h||'m',x0:e.clientX,s0:L.start,e0:L.end,pps:lane.width/T,rtl:getComputedStyle(bar.parentElement).direction==='rtl'};bar.setPointerCapture(e.pointerId);refreshPanel();return}
 const lane=e.target.closest&&e.target.closest('#v129tl [data-v129seek]');if(lane){const r=lane.getBoundingClientRect(),rtl=getComputedStyle(lane).direction==='rtl',f=rtl?(r.right-e.clientX)/r.width:(e.clientX-r.left)/r.width;E.t=clamp(f)*seq().total;if(E.playing)play(false);draw()}});
document.addEventListener('pointermove',e=>{if(!drag)return;const L=drag.L;
 if(drag.bar){let dx=(e.clientX-drag.x0)/drag.pps;if(drag.rtl)dx=-dx;const T=seq().total;if(drag.h==='s')L.start=clamp(drag.s0+dx,0,L.end-0.2);else if(drag.h==='e')L.end=clamp(drag.e0+dx,L.start+0.2,T);else{const d=L.end-L.start;L.start=clamp(drag.s0+dx,0,T-d);L.end=L.start+d}timeline();return}
 const pt=canvasPt(e);if(L.type==='cap'){const y=clamp(pt.y-drag.oy,0.12,0.92);E.p.capY=y;E.p.layers.forEach(l=>{if(l.type==='cap')l.y=y})}else{L.x=clamp(pt.x-drag.ox,0.02,0.98);L.y=clamp(pt.y-drag.oy,0.02,0.98)}draw()});
document.addEventListener('pointerup',()=>{if(!drag)return;drag=null;E.p.touched=Date.now();E.p.dirty=true;persist();refreshPanel();timeline()});
function refreshPanel(){const a=document.querySelector('#v129 .v129panel');if(!a)return;a.innerHTML=`${tabsHtml()}${propsHtml()}${tabHtml()}`;previews();draw();timeline()}

// ---------- clicks and inputs
const AUTOSND={text:'pop',lower:'swipe',el:'pop'};
function addLayer(L){if(E.p.autoSnd!==false&&!L.snd&&L.type!=='cap'){L.snd=L.type==='fx'?((BFX.find(x=>x[0]===L.fx)||[])[3]||''):AUTOSND[L.type]||''}change(p=>{p.layers.push(L)});E.sel=L.id;refresh()}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('#v100page [data-v100="edit"],#v100page [data-v100="editknown"]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();
 if(b.dataset.v100==='edit')openFromDoc(b.dataset.id);else open({kind:'url',docId:'known:'+b.dataset.path,path:b.dataset.path,url:b.dataset.path,name:b.dataset.name})},true);
document.addEventListener('click',async e=>{
 const op=e.target.closest&&e.target.closest('[data-v129="open"]');if(op){e.preventDefault();e.stopPropagation();if(op.dataset.tray)openFromTray(op.dataset.tray);else if(op.dataset.doc)openFromDoc(op.dataset.doc);return}
 if(!e.target.closest||!e.target.closest('#v129,.v129none'))return;
 const tb=e.target.closest('[data-v129tab]');if(tb){E.tab=tb.dataset.v129tab;refreshPanel();return}
 const kb=e.target.closest('[data-v129kit]');if(kb){change(p=>{p.kit[kb.dataset.v129kit]=kb.dataset.val});return}
 const sk=e.target.closest('[data-v129smk]');if(sk){change(q=>{q.sm=Object.assign({},q.sm);q.sm[sk.dataset.v129smk]=sk.dataset.val},true);sk.parentElement.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',x===sk));return}
 const pb=e.target.closest('[data-v129p]');if(pb){change(p=>{p[pb.dataset.v129p]=pb.dataset.val});return}
 const lc=e.target.closest('[data-v129c]');if(lc&&selL()){change(()=>{selL().color=lc.dataset.v129c});return}
 const la=e.target.closest('[data-v129la]');if(la&&selL()){change(()=>{selL()[la.dataset.v129la]=la.dataset.val});return}
 const b=e.target.closest('[data-v129]');if(!b)return;const a=b.dataset.v129,p=E.p,t=E.t;
 if(a==='back'){if(E.playing)play(false);APP.view='videos';render()}
 else if(a==='openp'){const x=PROJ[b.dataset.id];if(x)open(x.src)}
 else if(a==='play')play(!E.playing);
 else if(a==='undo')undo();else if(a==='redo')redo();
 else if(a==='ver')saveVersion();else if(a==='restore')restore(+b.dataset.n);
 else if(a==='export')doExport();else if(a==='cancel'&&E.busy)E.busy.cancel=true;
 else if(a==='lib')saveToLibrary(E.outs[+b.dataset.i]);
 else if(a==='pro')sendPro();
 else if(a==='in'||a==='out'){const s=seq(),ph=phaseOf(s,t);if(ph.p!=='clip'){toastSafe('הזיזו את הסמן לתוך הסרטון');return}const at=(p.in||0)+ph.lt;change(q=>{if(a==='in'&&at<q.out-0.3)q.in=at;if(a==='out'&&at>q.in+0.3)q.out=at})}
 else if(a==='addcap'){const L={id:uid('c'),type:'cap',text:'כתובית חדשה',start:t,end:t+2,y:p.capY};addLayer(L)}
 else if(a==='spread'){const txt=(document.getElementById('v129paste')||{}).value||'';const w=txt.trim().split(/\s+/).filter(Boolean);if(!w.length){toastSafe('הדביקו קודם את הטקסט');return}const s=seq(),a0=s.intro,a1=s.clipsEnd,chunks=[];for(let i=0;i<w.length;i+=4)chunks.push(w.slice(i,i+4).join(' '));const per=(a1-a0)/chunks.length;
  change(q=>{q.layers=q.layers.filter(l=>l.type!=='cap');chunks.forEach((c,i)=>q.layers.push({id:uid('c'),type:'cap',text:c,start:a0+i*per,end:a0+(i+1)*per-0.05,y:q.capY}))});toastSafe(chunks.length+' כתוביות נוצרו. גוררים בציר כדי לדייק')}
 else if(a==='addtext')addLayer({id:uid('t'),type:'text',text:'כותרת',start:t,end:t+2.5,x:0.5,y:0.2,scale:1,anim:'pop',bg:'none'});
 else if(a==='addlower')addLayer({id:uid('t'),type:'lower',text:p.kit.lname||'קבוצת קורקוס',sub:p.kit.ltitle||'',start:t,end:t+4,x:0.62,y:0.8,scale:1,anim:'slide'});
 else if(a==='addel')addLayer({id:uid('e'),type:'el',el:b.dataset.el,start:t,end:t+2,x:0.5,y:0.42,scale:1,anim:'pop',color:b.dataset.el==='logo'?null:'#a90b0c'});
 else if(a==='ldel'){change(q=>{q.layers=q.layers.filter(l=>l.id!==E.sel)});E.sel=null;refresh()}
 else if(a==='here'&&selL()){change(()=>{const L=selL(),d=L.end-L.start;L.start=t;L.end=t+d})}
 else if(a==='addsfx'){change(q=>q.sfx.push({id:uid('s'),name:b.dataset.n,at:Math.round(t*30)/30,vol:0.7}));toastSafe('נוסף ב-'+fmtT(t))}
 else if(a==='sfxprev'){try{const AC=E.ac||(E.ac=new AudioContext());const bf=await buf(sfxUrl(b.dataset.n));const n=AC.createBufferSource();n.buffer=bf;n.connect(AC.destination);n.start()}catch(x){}}
 else if(a==='sfxdel')change(q=>{q.sfx=q.sfx.filter(x=>x.id!==b.dataset.id)});
 else if(a==='nomusic'){change(q=>{q.music=null});E.musicFile=null}
 else if(a==='recipe'){change(q=>{q.recipe=b.dataset.id},true);refreshPanel()}
 else if(a==='auto'){if(!p.recipe){toastSafe('בחרו קודם סגנון');return}buildRecipe(p.recipe)}
 else if(a==='addfx'){const f=BFX.find(x=>x[0]===b.dataset.fx);addLayer({id:uid('f'),type:'fx',fx:f[0],start:t,end:Math.min(seq().total,t+f[2]),amt:1});toastSafe(f[1]+' נוסף ב-'+fmtT(t))}
 else if(a==='fxadd'){change(q=>{const i=q.fx.findIndex(f=>f.id===b.dataset.id);if(i>=0)q.fx.splice(i,1);else{const s0=seq();q.fx.push({id:b.dataset.id,word:'',at:+((q.in||0)+Math.max(0,E.t-s0.intro)).toFixed(1)})}})}
 else if(a==='fxdel')change(q=>{q.fx.splice(+b.dataset.i,1)})},true);
document.addEventListener('input',e=>{const t=e.target;if(!t.closest||!t.closest('#v129'))return;const p=E.p;
 if(t.dataset.v129==='name'){p.name=t.value.slice(0,60);persist();return}
 if(t.dataset.v129kt){p.kit[t.dataset.v129kt]=t.value.slice(0,80);persist();draw();return}
 if(t.dataset.v129l&&selL()){const L=selL(),k=t.dataset.v129l;L[k]=['start','end','scale','rot','amt'].includes(k)?parseFloat(t.value)||0:t.value.slice(0,100);persist();draw();if(['start','end','text'].includes(k))timeline();return}
 if(t.dataset.v129mv){p.music.vol=+t.value;persist();if(E.musicGain)E.musicGain.gain.value=+t.value;return}
 if(t.dataset.v129sv){const x=p.sfx.find(s=>s.id===t.dataset.v129sv);if(x){x.vol=+t.value;persist()}return}
 if(t.dataset.v129sm){p.sm=Object.assign({},p.sm);p.sm[t.dataset.v129sm]=t.value.slice(0,t.dataset.v129sm==='name'?24:200);persist();return}
 if(t.dataset.v129pt){p[t.dataset.v129pt]=t.value.slice(0,60);persist();return}
 if(t.dataset.v129fx!=null){p.fx[+t.dataset.v129fx][t.dataset.k]=t.dataset.k==='at'?(t.value===''?null:+t.value):t.value.slice(0,60);persist()}});
document.addEventListener('change',e=>{const t=e.target;if(!t.closest||!t.closest('#v129'))return;const p=E.p;
 if(t.hasAttribute('data-v129m')){const f=t.files&&t.files[0];if(f){E.musicFile=f;E.musicBuf=null;change(q=>{q.music={name:f.name,vol:q.music?q.music.vol:0.22,duck:true}})}}
 else if(t.hasAttribute('data-v129md'))change(q=>{q.music.duck=t.checked},true);
 else if(t.hasAttribute('data-v129mute'))change(q=>{q.mute=t.checked},true);
 else if(t.dataset.v129kc)change(q=>{q.kit[t.dataset.v129kc]=t.checked})
 else if(t.dataset.v129pc){change(q=>{q[t.dataset.v129pc]=t.checked},true);if(t.dataset.v129pc==='smOn')refreshPanel()}
 else if(t.dataset.v129pro)change(q=>{q.pro=Object.assign({},q.pro);q.pro[t.dataset.v129pro]=t.checked},true)
 else if(t.dataset.v129ls&&selL())change(()=>{selL().snd=t.value},true)},true);
document.addEventListener('keydown',e=>{if(APP.view!=='veditor'||!E.p)return;const tag=(e.target.tagName||'').toLowerCase();if(tag==='input'||tag==='textarea')return;
 if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redo():undo()}else if(e.key===' '){e.preventDefault();play(!E.playing)}else if((e.key==='Delete'||e.key==='Backspace')&&E.sel){change(q=>{q.layers=q.layers.filter(l=>l.id!==E.sel)});E.sel=null;refresh()}});

// ---------- entry points: an "open in editor" button on every tray item and every library card
function decorate(){document.querySelectorAll('#v127 .v127it[data-id] .v127ia').forEach(a=>{if(a.querySelector('[data-v129]'))return;const id=a.closest('.v127it').dataset.id;a.insertAdjacentHTML('afterbegin',`<button type="button" class="v129go" data-v129="open" data-tray="${id}">עריכה</button>`)});
 document.querySelectorAll('#v100page .v100c[data-vid] .v100b').forEach(b=>{if(b.querySelector('[data-v129]'))return;const id=b.closest('.v100c').dataset.vid;if(!b.querySelector('[data-v100="edit"]'))b.insertAdjacentHTML('afterbegin',`<button type="button" class="px-btn sm pri" data-v129="open" data-doc="${id}">עריכה בעורך</button>`);b.querySelectorAll('[data-v100="edit"]').forEach(x=>{if(x.textContent!=='עריכה בעורך'){x.textContent='עריכה בעורך';x.classList.add('pri')}})})}
new MutationObserver(()=>{try{decorate()}catch(e){}}).observe(document.body,{childList:true,subtree:true});
// tray footer now acts on the chosen video unless you ask for all
try{const k=__v127.KIT();if(!localStorage.getItem('v129_mig')){if(k.mode==='each')k.mode='sel';localStorage.setItem('v129_mig','1')}}catch(e){}
window.__v129={open,openFromTray,openFromDoc,E,PROJ:()=>PROJ,frameAt,seq};
})();
