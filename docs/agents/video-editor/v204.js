/*V204:START*/
// ================= V204 · סטודיו עריכה: every uploaded or generated video becomes an editable project. Scenes are detected from the
// footage itself, each scene is a clip (trim, split, merge, reorder, duplicate, delete, batch), the preview plays the real video
// through the same compositor as the export (colour, framing, transitions, subtitles, overlays), the timeline has video, audio
// (real waveform), subtitles, overlays and music tracks, and the AI assistant turns a sentence about the selected scene into
// real edit operations that can be previewed, accepted or rejected. Subtitles come from Whisper on the site (/api/transcribe) or
// are written by hand, and export as SRT or VTT. Every operation is logged with its before state, versions can be restored, and
// accepted and rejected proposals build a preference profile that later prompts use. Export renders in the browser
// (canvas + Web Audio into MediaRecorder) in real time; the original file is never changed. =================
(()=>{
if(window.__v204)return;window.__v204=1;
const E=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $=id=>document.getElementById(id);
const uid=p=>(p||'x')+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const fmt=s=>{s=Math.max(0,+s||0);const m=Math.floor(s/60),r=s-m*60;return m+':'+(r<10?'0':'')+r.toFixed(2)};
const toastS=m=>{try{toast(m)}catch(e){console.log(m)}};
const clone=o=>JSON.parse(JSON.stringify(o));
const PKEY='v204_projects',FKEY='v204_prefs';
const FMTS=[['orig','מקורי'],['9:16','9:16'],['16:9','16:9'],['1:1','1:1'],['4:5','4:5']];
const TRANS=[['none','חיתוך ישר'],['fade','דהייה לשחור'],['dipw','דהייה ללבן'],['cross','מעבר רך (הצלבה)'],['slide','החלקה']];
const SUBSTY=[['pill','גלולה לבנה'],['bold','לבן מודגש'],['brand','צבע מותג'],['minimal','קטן ונקי']];
const COLORS=[['#ffffff','לבן'],['#07293a','כחול לילה'],['#8fb6c8','תכלת'],['#a90b0c','אדום קורקוס'],['#ffd47a','זהב']];
const ADJ=[['exp','חשיפה ובהירות'],['con','ניגודיות'],['sat','רוויה'],['temp','טמפרטורת צבע']];

// ---------- storage: projects and preferences live in the engine database when it is there, and on the device always ----------
const DB=()=>(typeof KC!=='undefined'&&KC.db)||(window.__vid&&__vid.VD.db)||null;
const ASSETS=()=>(typeof KC!=='undefined'&&KC.assets)||(window.__vid&&__vid.VD.assets)||null;
const loadL=(k,d)=>{try{return JSON.parse(localStorage.getItem(k)||'null')||d}catch(e){return d}};
const saveL=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
const S={list:loadL(PKEY,{}),p:null,sel:new Set(),cur:'',t:0,playing:false,rate:1,zoom:60,tab:'edit',prop:null,pv:null,busy:null,err:'',hist:[],fut:[],compare:false,mobile:false,exp:null};
const LOCAL={};            // object URLs of files chosen on this device, by project id
const AUD={};              // decoded audio (16 kHz mono) and waveform peaks, by project id
let PREF=Object.assign({learn:true,score:{},explicit:[],proj:{}},loadL(FKEY,{}));
const savePrefs=()=>{saveL(FKEY,PREF);const db=DB();if(db)try{db.collection('vstudio_prefs').doc('main').set(PREF)}catch(e){}};
let dbT=0;
function persist(p){p=p||S.p;if(!p)return;p.touched=Date.now();S.list[p.id]=p;const slim={};Object.values(S.list).sort((a,b)=>(b.touched||0)-(a.touched||0)).slice(0,30).forEach(x=>slim[x.id]=x);S.list=slim;saveL(PKEY,slim);
  clearTimeout(dbT);dbT=setTimeout(()=>{const db=DB();if(db&&!p.src.local)try{db.collection('vstudio').doc(p.id).set(p)}catch(e){console.warn('v204 db',e)}},1200)}
async function pull(){const db=DB();if(!db)return;try{const s=await db.collection('vstudio').get();(s.docs||[]).forEach(d=>{const x=d.data?d.data():d;if(x&&x.id&&(!S.list[x.id]||(x.touched||0)>(S.list[x.id].touched||0)))S.list[x.id]=x})}catch(e){}
  try{const d=await db.collection('vstudio_prefs').doc('main').get();const x=d&&(d.data?d.data():d);if(x&&x.score)PREF=Object.assign(PREF,x)}catch(e){}saveL(PKEY,S.list)}

// ---------- projects ----------
function newProject(src){const id=uid('vs');const p={id,name:(src.name||'סרטון').replace(/\.[^.]+$/,'').slice(0,60),created:Date.now(),touched:Date.now(),src,meta:{dur:0,w:0,h:0,hasAudio:null},fmt:'orig',
  clips:[],subs:{mode:'off',style:'pill',size:1,y:0.8,color:'#ffffff',segs:[]},overlays:[],music:null,audio:{enhance:false},ops:[],versions:[],orig:null,status:'new'};return p}
const P=()=>S.pv||S.p;     // the project being drawn: a preview of a proposal, or the real one
const clipById=(id,p)=>(p||P()).clips.find(c=>c.id===id);
const cdur=c=>Math.max(0.05,c.out-c.in);
function lay(p){p=p||P();const out=[];let t=0;p.clips.forEach((c,i)=>{const d=cdur(c);let ov=0;if(i&&(c.trans.type==='cross'||c.trans.type==='slide')){const pd=cdur(p.clips[i-1]);ov=Math.min(c.trans.dur||0.4,pd/2,d/2)}const st=Math.max(0,t-ov);out.push({c,i,start:st,dur:d,ov,end:st+d});t=st+d});return {L:out,total:t}}
function at(t,p){const {L,total}=lay(p);if(!L.length)return null;t=clamp(t,0,Math.max(0,total-0.001));let k=L.findIndex(x=>t>=x.start&&t<x.end);if(k<0)k=L.length-1;
  // in an overlap the earlier clip is the primary until it ends; the next one blends in
  const a=L[k],nx=L[k+1];let sec=null;if(nx&&nx.ov&&t>=nx.start){sec={x:nx,u:(t-nx.start)/nx.ov}}return {x:a,local:t-a.start,sec,L,total}}
function hist(){if(!S.p)return;S.hist.push(clone(core(S.p)));if(S.hist.length>60)S.hist.shift();S.fut=[]}
const core=p=>({clips:p.clips,subs:p.subs,overlays:p.overlays,fmt:p.fmt,audio:p.audio,music:p.music});
function setCore(s){Object.assign(S.p,clone(s))}
function undo(){if(!S.hist.length)return;S.fut.push(clone(core(S.p)));setCore(S.hist.pop());logOp({kind:'undo',instr:'ביטול',status:'manual'});persist();refresh()}
function redo(){if(!S.fut.length)return;S.hist.push(clone(core(S.p)));setCore(S.fut.pop());persist();refresh()}
// the before state is kept on the last 40 operations (enough to go back); older lines keep only what happened
function logOp(o){const p=S.p;if(!p)return;p.ops.unshift(Object.assign({id:uid('op'),at:new Date().toISOString()},o));if(p.ops.length>300)p.ops.length=300;p.ops.forEach((x,i)=>{if(i>=40&&x.before)delete x.before})}
// every manual change: one undo step, one line in the log
function edit(label,fn,opt){if(!S.p)return;const before=clone(core(S.p));hist();fn(S.p);S.p.status='edited';logOp({kind:'manual',instr:label,status:'manual',clips:[...S.sel],before});if(opt&&opt.learn)learn(opt.learn,0.5);persist();if(!(opt&&opt.quiet))refresh();else{paint();drawTL()}}
const mkClip=(a,b,extra)=>Object.assign({id:uid('c'),name:'',in:+a.toFixed(3),out:+b.toFixed(3),desc:'',sugg:'',thumb:'',adj:{exp:0,con:0,sat:0,temp:0},frame:{scale:1,x:0,y:0},vol:1,mute:false,fadeIn:0,fadeOut:0,trans:{type:'none',dur:0.4},status:'ok'},extra||{});

// ---------- media: the source URL, two video elements per player, seeking that waits ----------
async function srcURL(p){if(LOCAL[p.id])return LOCAL[p.id];if(p.src.url)return p.src.url;return null}
function mkVideo(url){const v=document.createElement('video');v.playsInline=true;v.preload='auto';v.muted=false;if(!/^blob:/.test(url))v.crossOrigin='anonymous';v.src=url;return v}
const seekTo=(v,t)=>new Promise(r=>{if(!v||!isFinite(t))return r();if(Math.abs(v.currentTime-t)<0.012&&v.readyState>=2)return r();let done=false;const f=()=>{if(done)return;done=true;v.removeEventListener('seeked',f);r()};v.addEventListener('seeked',f);try{v.currentTime=Math.max(0,t)}catch(e){f()}setTimeout(f,2500)});
const ready=v=>new Promise(r=>{if(v.readyState>=1)return r();v.addEventListener('loadedmetadata',()=>r(),{once:true});v.addEventListener('error',()=>r(),{once:true});setTimeout(r,15000)});

// ---------- analysis: scenes from the pixels, audio from the file ----------
async function analyze(p){const url=await srcURL(p);if(!url)throw new Error('הקובץ של הסרטון לא נמצא במכשיר הזה. בחרו אותו שוב');
  S.busy={t:'קורא את הסרטון',pct:0};paintBusy();const v=mkVideo(url);v.muted=true;await ready(v);if(!v.duration||!isFinite(v.duration))throw new Error('הדפדפן לא הצליח לקרוא את הסרטון. נסו קובץ MP4 או MOV');
  p.meta.dur=v.duration;p.meta.w=v.videoWidth;p.meta.h=v.videoHeight;
  // scenes: grey 48×27 frames every step seconds; a cut is a jump far above the clip's usual motion
  const dur=v.duration,step=dur<=60?0.25:dur<=300?0.5:Math.max(1,dur/600);const cw=48,ch=27;const cv=document.createElement('canvas');cv.width=cw;cv.height=ch;const x=cv.getContext('2d',{willReadFrequently:true});
  const tc=document.createElement('canvas');tc.width=160;tc.height=Math.max(60,Math.round(160*(v.videoHeight||9)/(v.videoWidth||16)));const tx=tc.getContext('2d');
  const diffs=[],thumbs={};let prev=null,tainted=false;
  for(let t=0,n=0;t<dur-0.05;t+=step,n++){await seekTo(v,t);S.busy={t:'מזהה סצנות',pct:t/dur};paintBusy();x.drawImage(v,0,0,cw,ch);let d;try{d=x.getImageData(0,0,cw,ch).data}catch(e){tainted=true;break}
    const g=new Float32Array(cw*ch);for(let i=0;i<g.length;i++)g[i]=(d[i*4]*.299+d[i*4+1]*.587+d[i*4+2]*.114)/255;
    if(prev){let s=0;for(let i=0;i<g.length;i++)s+=Math.abs(g[i]-prev[i]);diffs.push({t,d:s/g.length})}prev=g;
    if(n%Math.max(1,Math.round(1/step))===0){tx.drawImage(v,0,0,tc.width,tc.height);thumbs[t.toFixed(2)]=tc.toDataURL('image/jpeg',.6)}}
  // robust threshold: the median frame change is the footage's own motion; a cut is a local peak well above it and above its neighbourhood
  let cuts=[];if(!tainted&&diffs.length>4){const ds=diffs.map(o=>o.d);const med=[...ds].sort((a,b)=>a-b)[Math.floor(ds.length/2)];let thr=Math.max(0.045,med*3.5);
    const near=i=>{const w=ds.slice(Math.max(0,i-4),i).concat(ds.slice(i+1,i+5)).sort((a,b)=>a-b);return w.length?w[Math.floor(w.length/2)]:0};
    for(let k=0;k<8;k++){cuts=diffs.filter((o,i)=>o.d>thr&&o.d>2.2*near(i)&&(i===0||o.d>=ds[i-1])&&(i===ds.length-1||o.d>=ds[i+1])).map(o=>o.t);if(cuts.length<=60)break;thr*=1.25}}
  const bounds=[0,...cuts,dur];const raw=[];for(let i=0;i<bounds.length-1;i++){const a=bounds[i],b=bounds[i+1];if(raw.length&&b-a<0.8){raw[raw.length-1].out=b}else raw.push({in:a,out:b})}
  if(raw.length>1&&raw[raw.length-1].out-raw[raw.length-1].in<0.8){const l=raw.pop();raw[raw.length-1].out=l.out}
  const near=t=>{let best='',bd=1e9;Object.keys(thumbs).forEach(k=>{const dd=Math.abs(+k-t-0.3);if(dd<bd){bd=dd;best=k}});return thumbs[best]||''};
  p.clips=raw.map((r,i)=>mkClip(r.in,r.out,{name:'סצנה '+(i+1),thumb:near(r.in)}));
  if(tainted)p.note='הסרטון מוגש משרת אחר בלי הרשאה לקרוא פיקסלים, אז הוא נכנס כקטע אחד. הסצנות לא זוהו';
  S.busy={t:'קורא את השמע',pct:0};paintBusy();try{await audio(p,url)}catch(e){console.warn('v204 audio',e);p.meta.hasAudio=false}
  p.orig=clone(core(p));p.status='ready';logOp({kind:'import',instr:'ייבוא וזיהוי סצנות',status:'auto',result:`${p.clips.length} סצנות, ${fmt(dur)}`});S.busy=null;persist(p)}
async function audio(p,url){if(AUD[p.id])return AUD[p.id];const r=await fetch(url);const size=+(r.headers.get('content-length')||0);if(size>400*1024*1024)throw new Error('big');const buf=await r.arrayBuffer();
  const AC=window.AudioContext||window.webkitAudioContext;const ac=new AC();let ab;try{ab=await ac.decodeAudioData(buf.slice(0))}catch(e){p.meta.hasAudio=false;try{ac.close()}catch(x){}return null}try{ac.close()}catch(x){}
  const sr=16000,n=Math.ceil(ab.duration*sr);const oc=new OfflineAudioContext(1,n,sr);const s=oc.createBufferSource();s.buffer=ab;s.connect(oc.destination);s.start();const out=await oc.startRendering();const data=out.getChannelData(0);
  const hop=sr/20,peaks=new Float32Array(Math.ceil(data.length/hop));for(let i=0;i<peaks.length;i++){let m=0;for(let j=i*hop,e=Math.min(data.length,(i+1)*hop);j<e;j++){const a=Math.abs(data[j]);if(a>m)m=a}peaks[i]=m}
  let mx=0;for(const v of peaks)if(v>mx)mx=v;p.meta.hasAudio=mx>0.003;AUD[p.id]={sr,data,peaks,mx:mx||1};return AUD[p.id]}
// silent gaps inside a source range, from a 20 ms RMS envelope against the clip's own speech level
function gaps(p,a,b,min){const A=AUD[p.id];if(!A)return null;const sr=A.sr,w=sr/50;const i0=Math.floor(a*sr),i1=Math.min(A.data.length,Math.floor(b*sr));const rms=[];for(let i=i0;i<i1;i+=w){let s=0;for(let j=i;j<Math.min(i1,i+w);j++)s+=A.data[j]*A.data[j];rms.push(Math.sqrt(s/w))}
  if(!rms.length)return [];const sorted=[...rms].sort((x,y)=>x-y);const speech=sorted[Math.floor(sorted.length*0.9)]||0;const thr=Math.max(0.004,speech*0.12);const out=[];let st=-1;
  rms.forEach((v,k)=>{if(v<thr){if(st<0)st=k}else if(st>=0){if((k-st)/50>=min)out.push([a+st/50,a+k/50]);st=-1}});if(st>=0&&(rms.length-st)/50>=min)out.push([a+st/50,a+rms.length/50]);return out}

// ---------- the compositor: one function draws a timeline moment for the preview and for the export ----------
function outDims(p,max){const w=p.meta.w||1080,h=p.meta.h||1920;const r={'9:16':[9,16],'16:9':[16,9],'1:1':[1,1],'4:5':[4,5]}[p.fmt];let W,H;if(!r){W=w;H=h}else{if(r[0]/r[1]>w/h){W=w;H=Math.round(w*r[1]/r[0])}else{H=h;W=Math.round(h*r[0]/r[1])}}
  const m=max||Math.max(W,H);const k=Math.min(1,m/Math.max(W,H));return [Math.round(W*k/2)*2,Math.round(H*k/2)*2]}
function vfilter(a){return `brightness(${(1+a.exp*0.6).toFixed(3)}) contrast(${(1+a.con*0.8).toFixed(3)}) saturate(${Math.max(0,1+a.sat).toFixed(3)})`}
function drawClip(c,v,cl,W,H,raw,clipRect){if(!v||v.readyState<2)return;const vw=v.videoWidth||16,vh=v.videoHeight||9;const fr=raw?{scale:1,x:0,y:0}:cl.frame;const k=Math.max(W/vw,H/vh)*(fr.scale||1);const w=vw*k,h=vh*k;
  c.save();if(clipRect){c.beginPath();c.rect(...clipRect);c.clip()}if(!raw)c.filter=vfilter(cl.adj);c.drawImage(v,(W-w)/2+fr.x*W,(H-h)/2+fr.y*H,w,h);c.filter='none';
  if(!raw&&cl.adj.temp){c.globalCompositeOperation='soft-light';c.globalAlpha=Math.min(0.6,Math.abs(cl.adj.temp)*0.55);c.fillStyle=cl.adj.temp>0?'#ff9440':'#3f8cff';c.fillRect(0,0,W,H)}c.restore()}
function rr(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath()}
function wrap(c,txt,max){const ws=String(txt).split(/\s+/).filter(Boolean),ls=[];let l='';ws.forEach(w=>{const t=l?l+' '+w:w;if(c.measureText(t).width>max&&l){ls.push(l);l=w}else l=t});if(l)ls.push(l);return ls.slice(0,3)}
function drawSub(c,W,H,p,text){const s=p.subs;const px=Math.round(Math.min(W,H)*0.058*(s.size||1));c.save();c.direction='rtl';c.textAlign='center';c.textBaseline='middle';c.font=`${s.style==='minimal'?600:800} ${px}px Almoni, Heebo, Arial, sans-serif`;
  const ls=wrap(c,text,W*0.84),lh=px*1.28,y0=(s.y||0.8)*H-(ls.length-1)*lh/2;ls.forEach((l,i)=>{const y=y0+i*lh,w=c.measureText(l).width;
   if(s.style==='pill'){c.fillStyle='rgba(255,255,255,.95)';rr(c,W/2-w/2-px*.45,y-px*.72,w+px*.9,px*1.44,px*.4);c.fill();c.fillStyle='#07293a';c.fillText(l,W/2,y+2)}
   else if(s.style==='brand'){c.fillStyle='#07293a';rr(c,W/2-w/2-px*.45,y-px*.72,w+px*.9,px*1.44,px*.25);c.fill();c.fillStyle=s.color||'#fff';c.fillText(l,W/2,y+2)}
   else{c.lineWidth=px*(s.style==='minimal'?0.1:0.16);c.strokeStyle='rgba(5,15,22,.85)';c.lineJoin='round';c.strokeText(l,W/2,y);c.fillStyle=s.color||'#fff';c.fillText(l,W/2,y)}});c.restore()}
function subAt(p,cl,st){if(!p.subs||p.subs.mode==='off')return null;return p.subs.segs.find(g=>st>=g.t0&&st<g.t1&&st>=cl.in-0.01&&st<=cl.out+0.01)}
function drawOverlay(c,W,H,o,t){if(t<o.t0||t>o.t1)return;const px=Math.round(Math.min(W,H)*0.07*(o.size||1));const a=clamp(Math.min((t-o.t0)/0.25,(o.t1-t)/0.25),0,1);c.save();c.globalAlpha=a;c.direction='rtl';c.textAlign='center';c.textBaseline='middle';c.font=`800 ${px}px Almoni, Heebo, Arial, sans-serif`;
  const ls=wrap(c,o.text,W*0.86),lh=px*1.2,y0=(o.y||0.2)*H-(ls.length-1)*lh/2;ls.forEach((l,i)=>{const y=y0+i*lh,w=c.measureText(l).width;if(o.bg&&o.bg!=='none'){c.fillStyle=o.bg;rr(c,(o.x||0.5)*W-w/2-px*.4,y-px*.68,w+px*.8,px*1.36,px*.22);c.fill()}else{c.lineWidth=px*.12;c.strokeStyle='rgba(5,15,22,.7)';c.strokeText(l,(o.x||0.5)*W,y)}c.fillStyle=o.color||'#fff';c.fillText(l,(o.x||0.5)*W,y)});c.restore()}
// draw the moment the player is at: primary clip, the incoming clip in an overlap, dips, subtitles, overlays
function compose(c,W,H,p,pl,t,compare){c.fillStyle='#000';c.fillRect(0,0,W,H);const a=at(t,p);if(!a)return;const cl=a.x.c,v=pl.prim();
  if(compare){drawClip(c,v,cl,W,H,true,[0,0,W/2,H]);drawClip(c,v,cl,W,H,false,[W/2,0,W/2,H]);c.save();c.fillStyle='#ffd47a';c.fillRect(W/2-1.5,0,3,H);c.font=`700 ${Math.round(H*0.025)}px Almoni,Arial`;c.textAlign='center';c.fillStyle='rgba(0,0,0,.55)';c.fillRect(W*0.25-70,10,140,H*0.04);c.fillRect(W*0.75-70,10,140,H*0.04);c.fillStyle='#fff';c.fillText('מקור',W*0.25,10+H*0.028);c.fillText('אחרי עריכה',W*0.75,10+H*0.028);c.restore()}
  else drawClip(c,v,cl,W,H,false);
  if(a.sec&&!compare){const nx=a.sec.x.c,u=clamp(a.sec.u,0,1),v2=pl.second();if(v2){c.save();if(nx.trans.type==='slide'){c.translate(W*(1-u),0);drawClip(c,v2,nx,W,H,false)}else{c.globalAlpha=u;drawClip(c,v2,nx,W,H,false)}c.restore()}}
  // dips: the second half of a fade into this clip, and the first half of a fade out of it
  const {L}=a;const me=L[a.x.i],nxt=L[a.x.i+1];let dip=0,dcol='#000';const half=tr=>Math.max(0.05,(tr.dur||0.4)/2);
  if(['fade','dipw'].includes(cl.trans.type)&&a.local<half(cl.trans)){dip=1-a.local/half(cl.trans);dcol=cl.trans.type==='dipw'?'#fff':'#000'}
  if(nxt&&['fade','dipw'].includes(nxt.c.trans.type)&&a.local>me.dur-half(nxt.c.trans)){dip=Math.max(dip,(a.local-(me.dur-half(nxt.c.trans)))/half(nxt.c.trans));dcol=nxt.c.trans.type==='dipw'?'#fff':'#000'}
  if(dip>0){c.save();c.globalAlpha=clamp(dip,0,1);c.fillStyle=dcol;c.fillRect(0,0,W,H);c.restore()}
  const g=subAt(p,cl,cl.in+a.local);if(g)drawSub(c,W,H,p,g.text);(p.overlays||[]).forEach(o=>drawOverlay(c,W,H,o,t))}

// ---------- the player: two video elements that hand over at clip ends; used by the preview and by the export ----------
function Player(url,opt){opt=opt||{};const els=[mkVideo(url),mkVideo(url)];let ci=0,idx=0,run=false,raf=0,ac=null,gains=[],enh=null;const self={};
  els.forEach(v=>{v.muted=!!opt.muted;v.style.cssText='position:absolute;width:1px;height:1px;opacity:0;pointer-events:none';document.body.appendChild(v)});
  if(opt.dest){ac=opt.ac;els.forEach(v=>{const s=ac.createMediaElementSource(v),gn=ac.createGain();s.connect(gn);gn.connect(opt.dest);gains.push(gn)})}
  self.prim=()=>els[ci];self.second=()=>els[1-ci];self.idx=()=>idx;
  self.vol=(k,val)=>{const v=els[k];if(gains[k])gains[k].gain.value=val;else v.volume=clamp(val,0,1)};
  const env=(x,local)=>{const c=x.c;if(c.mute)return 0;let g=c.vol;if(c.fadeIn>0&&local<c.fadeIn)g*=local/c.fadeIn;if(c.fadeOut>0&&local>x.dur-c.fadeOut)g*=Math.max(0,(x.dur-local)/c.fadeOut);return g};
  self.time=p=>{const {L}=lay(p);const x=L[idx];if(!x)return 0;return x.start+clamp(els[ci].currentTime-x.c.in,0,x.dur)};
  self.seek=async(p,t)=>{const a=at(t,p);if(!a)return;idx=a.x.i;await seekTo(els[ci],a.x.c.in+a.local);if(a.sec){await seekTo(els[1-ci],a.sec.x.c.in+(t-a.sec.x.start))}};
  self.stop=()=>{run=false;cancelAnimationFrame(raf);els.forEach(v=>{try{v.pause()}catch(e){}})};
  self.rate=r=>els.forEach(v=>v.playbackRate=r);
  // play from the current position to the end (or until stopped). onFrame(t) draws; onStall/onResume let the recorder pause over seeks
  self.play=async(p,o)=>{o=o||{};run=true;const {L}=lay(p);let x=L[idx];if(!x){run=false;return}
    const go=v=>v.play().catch(()=>{});await go(els[ci]);let secOn=false;
    const tick=async()=>{if(!run)return;const {L}=lay(p);x=L[idx];if(!x){self.stop();o.onEnd&&o.onEnd();return}const v=els[ci];const local=v.currentTime-x.c.in;const t=x.start+clamp(local,0,x.dur);
      self.vol(ci,env(x,local));const nx=L[idx+1];
      if(nx&&nx.ov&&t>=nx.start&&!secOn){secOn=true;const v2=els[1-ci];await seekTo(v2,nx.c.in+(t-nx.start));go(v2)}
      if(secOn&&nx){const u=clamp((t-nx.start)/nx.ov,0,1);self.vol(1-ci,env(nx,t-nx.start)*u);self.vol(ci,env(x,local)*(1-u))}
      o.onFrame&&o.onFrame(t);
      if(v.currentTime>=x.c.out-0.025||v.ended){if(!nx){self.stop();o.onEnd&&o.onEnd();return}
        if(secOn){try{v.pause()}catch(e){}ci=1-ci;idx++;secOn=false}
        else{o.onStall&&o.onStall();try{v.pause()}catch(e){}idx++;await seekTo(v,nx.c.in);if(!run)return;await go(v);o.onResume&&o.onResume()}}
      raf=requestAnimationFrame(tick)};raf=requestAnimationFrame(tick)};
  self.destroy=()=>{self.stop();els.forEach(v=>{v.removeAttribute('src');try{v.load()}catch(e){}v.remove()})};
  self.els=els;return self}

// ---------- preview ----------
let PL=null,PLurl='';
async function ensurePlayer(){const p=S.p;if(!p)return null;const url=await srcURL(p);if(!url)return null;if(PL&&PLurl===url)return PL;if(PL)PL.destroy();PL=Player(url);PLurl=url;await ready(PL.els[0]);return PL}
function cvs(){return document.querySelector('.v204 canvas.v204cv')}
function paint(){const cv=cvs();const p=P();if(!cv||!p||!PL)return;const [W,H]=outDims(p,1280);if(cv.width!==W||cv.height!==H){cv.width=W;cv.height=H}compose(cv.getContext('2d'),W,H,p,PL,S.t,S.compare);const tl=$('v204tc');if(tl)tl.textContent=fmt(S.t)+' / '+fmt(lay(p).total);playhead()}
async function seek(t){const p=P();if(!p)return;S.t=clamp(t,0,lay(p).total);if(S.playing)stopPlay();const pl=await ensurePlayer();if(!pl)return;await pl.seek(p,S.t);const a=at(S.t,p);if(a&&!S.sel.size)S.cur=a.x.c.id;paint();markCur()}
async function playToggle(){if(S.playing){stopPlay();return}const p=P();const pl=await ensurePlayer();if(!pl)return;if(S.t>=lay(p).total-0.05)S.t=0;await pl.seek(p,S.t);S.playing=true;pl.rate(S.rate);btnPlay();
  pl.play(p,{onFrame:t=>{S.t=t;paint();const a=at(t,p);if(a&&a.x.c.id!==S.curPlay){S.curPlay=a.x.c.id;markCur(a.x.c.id)}},onEnd:()=>{S.playing=false;btnPlay()}})}
function stopPlay(){S.playing=false;if(PL)PL.stop();btnPlay()}
function btnPlay(){const b=document.querySelector('.v204 [data-v204="play"]');if(b){b.textContent=S.playing?'❚❚':'▶';b.setAttribute('aria-label',S.playing?'השהיה':'ניגון')}}
function markCur(id){id=id||S.cur;document.querySelectorAll('.v204 .v204sc').forEach(e=>e.classList.toggle('now',e.dataset.id===id))}

// ---------- AI: the selected scenes and the whole video as context, a closed list of operations as the answer ----------
async function sampler(){let s=null;try{s=(window.claude&&window.claude.use)?await window.claude.use('sample').catch(()=>null):null}catch(e){}if(!s&&typeof KC!=='undefined'&&KC.sample)s=KC.sample;return s}
function prefLines(){if(!PREF.learn)return [];const L=rules().map(r=>`${r.text} (ביטחון ${r.conf})`);return [...L,...PREF.explicit.map(x=>'העדפה מפורשת: '+x)]}
function transcriptOf(p,a,b,max){const segs=(p.subs.segs||[]).filter(g=>g.t1>a&&g.t0<b).map(g=>g.text);const t=segs.join(' ');return t.length>max?t.slice(0,max)+'…':t}
const OPS_DOC=`פעולות אפשריות (רק אלה):
{"op":"adjust","clips":["id"],"exp":-1..1,"con":-1..1,"sat":-1..1,"temp":-1..1}  ערכים מוחלטים, 0 = מקור. בהירות/חשיפה exp, ניגודיות con, רוויה sat, חום צבע temp (חיובי חם, שלילי קר)
{"op":"frame","clips":["id"],"scale":1..3,"x":-0.5..0.5,"y":-0.5..0.5}  זום ומיקום התמונה במסגרת
{"op":"trim","clip":"id","in":שניות במקור,"out":שניות במקור}  רק בתוך גבולות הקטע הנוכחי או המקור
{"op":"split","clip":"id","at":שניות במקור}
{"op":"delete","clips":["id"]}
{"op":"move","clip":"id","to":מיקום חדש מ-0}
{"op":"merge","clip":"id"}  איחוד עם הקטע הבא אם הוא ממשיך אותו ברצף
{"op":"transition","clip":"id","type":"none|fade|dipw|cross|slide","dur":0.2..1.5}  המעבר שנכנס לקטע הזה
{"op":"volume","clips":["id"],"vol":0..2,"mute":false,"fadeIn":0..3,"fadeOut":0..3}
{"op":"cut_pauses","clips":["id"],"min_gap":0.3..2}  חיתוך שתיקות לפי השמע האמיתי
{"op":"subs_mode","mode":"off|auto|manual|auto_edit"}
{"op":"subs_style","style":"pill|bold|brand|minimal","size":0.6..1.6,"y":0.1..0.92,"color":"#hex"}
{"op":"sub_text","seg":"id","text":"..."}
{"op":"overlay_add","text":"...","t0":שניות בציר,"t1":שניות בציר,"x":0..1,"y":0..1,"size":0.6..1.8,"color":"#hex","bg":"none|#hex"}
{"op":"overlay_remove","id":"id"}
{"op":"enhance_audio","on":true}  שיפור דיבור: מסנן רעשי רקע נמוכים, מבליט את הקול ומאזן עוצמה`;
function aiPrompt(p,instr){const sel=[...S.sel].length?[...S.sel]:(S.cur?[S.cur]:[]);const {L,total}=lay(p);
  const rows=L.map(x=>`${x.i}. id=${x.c.id} "${x.c.name}" מקור ${x.c.in.toFixed(2)} עד ${x.c.out.toFixed(2)} (${x.dur.toFixed(2)} ש') בציר ${x.start.toFixed(2)} | ${x.c.desc||'בלי תיאור'} | adj ${JSON.stringify(x.c.adj)} frame ${JSON.stringify(x.c.frame)} vol ${x.c.vol}${x.c.mute?' מושתק':''} מעבר ${x.c.trans.type}${sel.includes(x.c.id)?'  ← נבחר':''}${p.subs.segs.length?' | נאמר: "'+transcriptOf(p,x.c.in,x.c.out,260)+'"':''}`).join('\n');
  const pr=prefLines();
  return `אתה עורך וידאו מקצועי בתוך סטודיו עריכה. המשתמש בחר קטעים ומבקש שינוי. תרגם את הבקשה לפעולות עריכה אמיתיות מהרשימה בלבד, על הקטעים הנבחרים אלא אם הבקשה אומרת אחרת.
הסרטון: ${p.meta.w}x${p.meta.h}, אורך ${total.toFixed(1)} ש', פורמט ${p.fmt}. נקודת ניגון ${S.t.toFixed(2)} ש'. כתוביות: ${p.subs.mode}, סגנון ${p.subs.style}, גודל ${p.subs.size}, גובה ${p.subs.y}${p.subs.segs.length?', '+p.subs.segs.length+' מקטעים':', אין תמלול'}. שיפור דיבור: ${p.audio.enhance?'פועל':'כבוי'}. שמע: ${p.meta.hasAudio?'יש':'אין'}.
הקטעים לפי הסדר:
${rows}
${p.subs.segs.length?'מקטעי כתוביות (id, זמן במקור, טקסט):\n'+p.subs.segs.slice(0,80).map(g=>`${g.id} ${g.t0}-${g.t1}: ${g.text}`).join('\n'):''}
${pr.length?'העדפות שנלמדו מהעריכות הקודמות של המשתמש (התחשב בהן כשהבקשה לא אומרת אחרת):\n'+pr.join('\n'):''}
${OPS_DOC}
כללים: שינויים מדודים ולא מוגזמים (מראה טבעי, אלא אם התבקש אחרת). אל תמחק תוכן חשוב. מה שאי אפשר לעשות כאן (החלפת שוט בצילום אחר, הסרת רקע, יצירת תמונה, ייצוב, שינוי מהירות) כתוב ב-unsupported עם חלופה מעשית. בלי מקפים כסימן פיסוק בטקסט שמופיע בסרטון.
הבקשה: "${instr}"
החזר JSON בלבד: {"summary":"משפט קצר בעברית: מה תעשה ולמה","ops":[...],"unsupported":[{"what":"","why":"","alternative":""}]}`}
const OK_OPS=new Set(['adjust','frame','trim','split','delete','move','merge','transition','volume','cut_pauses','subs_mode','subs_style','sub_text','overlay_add','overlay_remove','enhance_audio']);
function validate(p,ops){const ids=new Set(p.clips.map(c=>c.id)),segs=new Set(p.subs.segs.map(g=>g.id)),ovs=new Set(p.overlays.map(o=>o.id));const out=[];
  (Array.isArray(ops)?ops:[]).forEach(o=>{if(!o||!OK_OPS.has(o.op))return;const q=Object.assign({},o);if(q.clips)q.clips=(Array.isArray(q.clips)?q.clips:[q.clips]).filter(x=>ids.has(x));if(q.clips&&!q.clips.length)return;if(q.clip&&!ids.has(q.clip))return;
   if(['trim','split','move','merge','transition'].includes(q.op)&&!q.clip)return;if(q.op==='sub_text'&&!segs.has(q.seg))return;if(q.op==='overlay_remove'&&!ovs.has(q.id))return;
   ['exp','con','sat','temp'].forEach(k=>{if(q[k]!=null)q[k]=clamp(+q[k]||0,-1,1)});if(q.scale!=null)q.scale=clamp(+q.scale||1,1,3);['x','y'].forEach(k=>{if(q[k]!=null&&q.op==='frame')q[k]=clamp(+q[k]||0,-0.5,0.5)});
   if(q.op==='transition'){q.type=TRANS.some(t=>t[0]===q.type)?q.type:'fade';q.dur=clamp(+q.dur||0.4,0.2,1.5)}if(q.op==='volume'){if(q.vol!=null)q.vol=clamp(+q.vol,0,2);['fadeIn','fadeOut'].forEach(k=>{if(q[k]!=null)q[k]=clamp(+q[k],0,3)})}
   if(q.op==='subs_style'){if(q.style&&!SUBSTY.some(s=>s[0]===q.style))delete q.style;if(q.size!=null)q.size=clamp(+q.size,0.6,1.6);if(q.y!=null)q.y=clamp(+q.y,0.1,0.92)}if(q.op==='cut_pauses')q.min_gap=clamp(+q.min_gap||0.6,0.3,2);
   if(q.op==='overlay_add'){if(!String(q.text||'').trim())return;q.text=String(q.text).replace(/\s[—–-]\s/g,', ').slice(0,120);q.t0=Math.max(0,+q.t0||S.t);q.t1=Math.max(q.t0+0.5,+q.t1||q.t0+3)}
   if(q.op==='sub_text')q.text=String(q.text||'').replace(/\s[—–-]\s/g,', ');out.push(q)});return out}
// apply a list of operations to a project (a preview copy or the real one). Returns what could not be done
function applyOps(p,ops){const miss=[];const byId=id=>p.clips.find(c=>c.id===id);const each=(q,f)=>(q.clips||[q.clip]).forEach(id=>{const c=byId(id);if(c)f(c)});
  ops.forEach(q=>{try{switch(q.op){
   case 'adjust':each(q,c=>['exp','con','sat','temp'].forEach(k=>{if(q[k]!=null)c.adj[k]=q[k]}));break;
   case 'frame':each(q,c=>['scale','x','y'].forEach(k=>{if(q[k]!=null)c.frame[k]=q[k]}));break;
   case 'trim':each(q,c=>{const a=q.in!=null?+q.in:c.in,b=q.out!=null?+q.out:c.out;const lo=0,hi=p.meta.dur||c.out;if(b-a>=0.1){c.in=clamp(a,lo,hi);c.out=clamp(b,c.in+0.1,hi)}});break;
   case 'split':{const i=p.clips.findIndex(c=>c.id===q.clip);const c=p.clips[i];if(c&&q.at>c.in+0.1&&q.at<c.out-0.1){const n=mkClip(q.at,c.out,{name:c.name+' (ב)',adj:clone(c.adj),frame:clone(c.frame),vol:c.vol,thumb:c.thumb});c.out=q.at;p.clips.splice(i+1,0,n)}else miss.push('פיצול מחוץ לקטע');break}
   case 'delete':p.clips=p.clips.filter(c=>!(q.clips||[]).includes(c.id));break;
   case 'move':{const i=p.clips.findIndex(c=>c.id===q.clip);if(i>=0){const [c]=p.clips.splice(i,1);p.clips.splice(clamp(q.to|0,0,p.clips.length),0,c)}break}
   case 'merge':{const i=p.clips.findIndex(c=>c.id===q.clip);const a=p.clips[i],b=p.clips[i+1];if(a&&b&&Math.abs(b.in-a.out)<0.05){a.out=b.out;p.clips.splice(i+1,1)}else miss.push('איחוד אפשרי רק לקטעים רצופים');break}
   case 'transition':each(q,c=>{c.trans={type:q.type,dur:q.dur}});break;
   case 'volume':each(q,c=>{['vol','fadeIn','fadeOut'].forEach(k=>{if(q[k]!=null)c[k]=q[k]});if(q.mute!=null)c.mute=!!q.mute});break;
   case 'cut_pauses':{const ids=q.clips||[];let any=false;ids.forEach(id=>{const i=p.clips.findIndex(c=>c.id===id);const c=p.clips[i];if(!c)return;const g=gaps(p,c.in,c.out,q.min_gap);if(g==null){miss.push('אין ניתוח שמע לסרטון הזה');return}
     const keep=[];let s=c.in;g.forEach(([a,b])=>{const a2=a+0.12,b2=b-0.12;if(a2-s>0.15)keep.push([s,a2]);s=Math.max(s,b2)});if(c.out-s>0.15)keep.push([s,c.out]);if(keep.length&&(keep.length>1||keep[0][0]>c.in+0.05||keep[0][1]<c.out-0.05)){any=true;
      const parts=keep.map(([a,b],k)=>Object.assign(clone(c),{id:k?uid('c'):c.id,in:+a.toFixed(3),out:+b.toFixed(3),name:k?c.name+' ('+(k+1)+')':c.name,trans:k?{type:'none',dur:0.4}:c.trans}));p.clips.splice(i,1,...parts)}});if(!any&&!miss.length)miss.push('לא נמצאו שתיקות ארוכות מ-'+q.min_gap+' ש\'');break}
   case 'subs_mode':p.subs.mode=q.mode;break;
   case 'subs_style':['style','size','y','color'].forEach(k=>{if(q[k]!=null)p.subs[k]=q[k]});break;
   case 'sub_text':{const g=p.subs.segs.find(x=>x.id===q.seg);if(g)g.text=q.text;break}
   case 'overlay_add':p.overlays.push({id:uid('o'),text:q.text,t0:q.t0,t1:q.t1,x:q.x!=null?clamp(+q.x,0,1):0.5,y:q.y!=null?clamp(+q.y,0,1):0.18,size:q.size!=null?clamp(+q.size,0.6,1.8):1,color:q.color||'#ffffff',bg:q.bg||'none'});break;
   case 'overlay_remove':p.overlays=p.overlays.filter(o=>o.id!==q.id);break;
   case 'enhance_audio':p.audio.enhance=!!q.on;break}}catch(e){miss.push(q.op+': '+e.message)}});return miss}
const OPNAME={adjust:'צבע ואור',frame:'מסגור',trim:'חיתוך קצוות',split:'פיצול',delete:'מחיקה',move:'הזזה',merge:'איחוד',transition:'מעבר',volume:'עוצמה',cut_pauses:'חיתוך שתיקות',subs_mode:'מצב כתוביות',subs_style:'סגנון כתוביות',sub_text:'טקסט כתובית',overlay_add:'טקסט על המסך',overlay_remove:'הסרת טקסט',enhance_audio:'שיפור דיבור'};
function opText(p,q){const nm=id=>{const c=p.clips.find(x=>x.id===id);return c?'"'+c.name+'"':''};const cs=(q.clips||[q.clip]).filter(Boolean).map(nm).join(', ');const v=x=>(x>0?'+':'')+Math.round(x*100)+'%';
  switch(q.op){case 'adjust':return `${cs}: `+['exp','con','sat','temp'].filter(k=>q[k]!=null).map(k=>`${(ADJ.find(a=>a[0]===k)||[])[1]} ${v(q[k])}`).join(', ');
   case 'frame':return `${cs}: זום ${q.scale||1}x, מיקום ${q.x||0}/${q.y||0}`;case 'trim':return `${cs}: ${fmt(q.in)} עד ${fmt(q.out)}`;case 'split':return `${cs} ב-${fmt(q.at)}`;case 'delete':return cs;case 'move':return `${cs} למקום ${(q.to|0)+1}`;
   case 'transition':return `${cs}: ${(TRANS.find(t=>t[0]===q.type)||[])[1]} ${q.dur}ש'`;case 'volume':return `${cs}: ${q.vol!=null?'עוצמה '+Math.round(q.vol*100)+'% ':''}${q.mute?'השתקה ':''}${q.fadeIn?'כניסה '+q.fadeIn+'ש\' ':''}${q.fadeOut?'יציאה '+q.fadeOut+'ש\'':''}`;
   case 'cut_pauses':return `${cs}: שתיקות מעל ${q.min_gap}ש'`;case 'subs_mode':return q.mode;case 'subs_style':return [q.style,q.size&&('גודל '+q.size),q.y&&('גובה '+q.y),q.color].filter(Boolean).join(', ');case 'sub_text':return '"'+q.text+'"';
   case 'overlay_add':return `"${q.text}" ${fmt(q.t0)} עד ${fmt(q.t1)}`;case 'overlay_remove':return q.id;case 'enhance_audio':return q.on?'פועל':'כבוי';default:return ''}}
async function ask(instr){const p=S.p;if(!p||!instr.trim())return;S.err='';S.busy={t:'Claude מתכנן את העריכה',pct:-1};refresh();
  try{let r;if(window.__v204mock)r=await window.__v204mock(aiPrompt(p,instr));else{const s=await sampler();if(!s){const e=new Error('no');e.code='not_granted';throw e}r=await s.json(aiPrompt(p,instr),{cache:false,modelTier:'default'})}
   const ops=validate(p,r&&r.ops);S.prop={id:uid('pr'),instr,summary:String((r&&r.summary)||''),ops,unsupported:Array.isArray(r&&r.unsupported)?r.unsupported.slice(0,4):[],clips:[...(S.sel.size?S.sel:[S.cur])].filter(Boolean)};S.pv=null;
   if(!ops.length&&!S.prop.unsupported.length)S.err='Claude לא החזיר פעולה שאפשר לבצע. נסו לנסח אחרת או לבחור קטע'}
  catch(e){console.warn('v204 ai',e);S.err=e&&e.code==='not_granted'?'Claude לא זמין כרגע: באתר צריך ANTHROPIC_API_KEY ב-Vercel, וב-claude.ai צריך לאשר את הבקשה':'הבקשה ל-Claude נכשלה: '+((e&&e.message)||'')}
  S.busy=null;refresh()}
function previewProp(){if(!S.prop)return;const q=clone(S.p);const miss=applyOps(q,S.prop.ops);S.pv=q;S.prop.miss=miss;refresh();seek(S.t)}
function acceptProp(){const pr=S.prop;if(!pr)return;const before=clone(core(S.p));hist();const miss=applyOps(S.p,pr.ops);S.p.status='edited';logOp({kind:'ai',instr:pr.instr,proposal:{summary:pr.summary,ops:pr.ops},status:'accepted',clips:pr.clips,before,miss});learnOps(pr.ops,before,+1);S.prop=null;S.pv=null;persist();refresh();seek(S.t);if(miss.length)toastS('חלק מהפעולות לא בוצעו: '+miss.join(', '))}
function rejectProp(){const pr=S.prop;if(!pr)return;logOp({kind:'ai',instr:pr.instr,proposal:{summary:pr.summary,ops:pr.ops},status:'rejected',clips:pr.clips});learnOps(pr.ops,core(S.p),-1);S.prop=null;S.pv=null;persist();refresh();seek(S.t)}

// ---------- AI scene notes: one contact sheet of the scenes, one request ----------
async function sheet(p){const cs=p.clips.slice(0,24);const cols=6,tw=200,th=Math.round(tw*((p.meta.h||9)/(p.meta.w||16)));const c=document.createElement('canvas');c.width=cols*tw;c.height=Math.ceil(cs.length/cols)*(th+26);const x=c.getContext('2d');x.fillStyle='#111';x.fillRect(0,0,c.width,c.height);
  for(let i=0;i<cs.length;i++){const im=await new Promise(r=>{if(!cs[i].thumb)return r(null);const m=new Image();m.onload=()=>r(m);m.onerror=()=>r(null);m.src=cs[i].thumb});const X=(i%cols)*tw,Y=Math.floor(i/cols)*(th+26);if(im)x.drawImage(im,X,Y,tw-4,th);x.fillStyle='#ffd47a';x.font='bold 18px Arial';x.fillText(String(i),X+6,Y+th+20)}
  return await new Promise(r=>c.toBlob(r,'image/jpeg',.8))}
async function notes(){const p=S.p;if(!p)return;S.err='';S.busy={t:'Claude מתאר את הסצנות',pct:-1};refresh();
  try{const img=await sheet(p);const prompt=`לפניך לוח של הסצנות בסרטון לפי המספרים (0 עד ${Math.min(24,p.clips.length)-1}).${p.subs.segs.length?' מה שנאמר בכל סצנה:\n'+p.clips.slice(0,24).map((c,i)=>i+': '+transcriptOf(p,c.in,c.out,160)).join('\n'):''}
לכל סצנה כתוב תיאור קצר מאוד בעברית של מה רואים (עד 8 מילים) והצעת עריכה אחת מעשית (עד 12 מילים), למשל לחתוך פתיחה איטית, להבהיר, להוסיף כתובית מפתח.${prefLines().length?' התחשב בהעדפות המשתמש: '+prefLines().join('; '):''}
החזר JSON בלבד: {"scenes":[{"i":0,"desc":"","sugg":""}]}`;
   let r;if(window.__v204mock)r=await window.__v204mock(prompt,'notes');else{const s=await sampler();if(!s){const e=new Error('no');e.code='not_granted';throw e}r=await s.json(prompt,{cache:false,modelTier:'default',images:[img]})}
   (r&&r.scenes||[]).forEach(o=>{const c=p.clips[o.i|0];if(c){c.desc=String(o.desc||'').slice(0,80);c.sugg=String(o.sugg||'').slice(0,120)}});logOp({kind:'ai',instr:'תיאור והצעות לסצנות',status:'auto'});persist()}
  catch(e){S.err=e&&e.code==='not_granted'?'Claude לא זמין כרגע: באתר צריך ANTHROPIC_API_KEY ב-Vercel, וב-claude.ai צריך לאשר את הבקשה':'תיאור הסצנות נכשל: '+((e&&e.message)||'')}S.busy=null;refresh()}

// ---------- preferences: accepted and rejected proposals, and repeated manual edits ----------
const PNAME={'exp:up':'מעדיף תמונה בהירה יותר','exp:down':'מעדיף תמונה כהה יותר','con:up':'מעדיף ניגודיות גבוהה','con:down':'מעדיף ניגודיות רכה','sat:up':'מעדיף צבעים חיים','sat:down':'מעדיף צבעים טבעיים ופחות רוויים','temp:up':'מעדיף גוון חם','temp:down':'מעדיף גוון קר',
 'subs:smaller':'מעדיף כתוביות קטנות יותר','subs:bigger':'מעדיף כתוביות גדולות יותר','subs:higher':'מעדיף כתוביות גבוהות יותר במסך','subs:lower':'מעדיף כתוביות נמוכות יותר','pace:tighter':'מעדיף קצב מהיר בלי שתיקות','scale:zoom':'מעדיף מסגור קרוב (זום)','overlay:more':'אוהב טקסט על המסך','enh:on':'מעדיף שיפור דיבור פועל'};
function learn(key,w){if(!PREF.learn||!key)return;(Array.isArray(key)?key:[key]).forEach(k=>{PREF.score[k]=+((PREF.score[k]||0)+w).toFixed(2);const pid=S.p&&S.p.id;if(pid){PREF.proj[pid]=PREF.proj[pid]||{};PREF.proj[pid][k]=+((PREF.proj[pid][k]||0)+w).toFixed(2)}});savePrefs()}
function keysOf(ops,before){const ks=[];const bc=id=>(before.clips||[]).find(c=>c.id===id);ops.forEach(q=>{
  if(q.op==='adjust')(q.clips||[]).forEach(id=>{const c=bc(id);if(!c)return;['exp','con','sat','temp'].forEach(k=>{if(q[k]!=null&&Math.abs(q[k]-c.adj[k])>0.04)ks.push(k+':'+(q[k]>c.adj[k]?'up':'down'))})});
  if(q.op==='subs_style'){if(q.size!=null&&before.subs&&q.size!==before.subs.size)ks.push(q.size<before.subs.size?'subs:smaller':'subs:bigger');if(q.y!=null&&before.subs&&q.y!==before.subs.y)ks.push(q.y<before.subs.y?'subs:higher':'subs:lower');if(q.style)ks.push('subst:'+q.style)}
  if(q.op==='transition')ks.push('trans:'+q.type);if(q.op==='cut_pauses')ks.push('pace:tighter');if(q.op==='frame'&&q.scale>1.05)ks.push('scale:zoom');if(q.op==='overlay_add')ks.push('overlay:more');if(q.op==='enhance_audio'&&q.on)ks.push('enh:on')});return [...new Set(ks)]}
function learnOps(ops,before,w){learn(keysOf(ops,before),w)}
function rules(){const out=[];Object.entries(PREF.score).forEach(([k,v])=>{if(Math.abs(v)<2)return;let text=PNAME[k]||(k.startsWith('trans:')?'מעברים: '+((TRANS.find(t=>'trans:'+t[0]===k)||[])[1]||k):k.startsWith('subst:')?'סגנון כתוביות: '+((SUBSTY.find(t=>'subst:'+t[0]===k)||[])[1]||k):k);if(v<0)text='לא אוהב: '+text.replace(/^מעדיף /,'').replace(/^אוהב /,'');out.push({k,v,text,conf:Math.abs(v)>=4?'גבוה':'בינוני'})});return out.sort((a,b)=>Math.abs(b.v)-Math.abs(a.v))}

// ---------- subtitles: Whisper on the site, in chunks; SRT and VTT in and out ----------
function wav(data,sr){const b=new ArrayBuffer(44+data.length*2),v=new DataView(b);const w=(o,s)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i))};w(0,'RIFF');v.setUint32(4,36+data.length*2,true);w(8,'WAVE');w(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,sr,true);v.setUint32(28,sr*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);w(36,'data');v.setUint32(40,data.length*2,true);
  for(let i=0;i<data.length;i++)v.setInt16(44+i*2,clamp(data[i],-1,1)*32767,true);return new Uint8Array(b)}
function b64(u8){let s='';for(let i=0;i<u8.length;i+=0x8000)s+=String.fromCharCode.apply(null,u8.subarray(i,i+0x8000));return btoa(s)}
async function transcribe(){const p=S.p;if(!p)return;S.err='';const url=await srcURL(p);S.busy={t:'מכין את השמע לתמלול',pct:0};refresh();
  try{const A=AUD[p.id]||await audio(p,url);if(!A||!p.meta.hasAudio)throw new Error('בסרטון הזה אין פס קול לתמלל');const tok=window.__engineToken?await window.__engineToken():null;if(!tok&&!window.__v204mockT)throw new Error('התמלול זמין רק כשהמנוע פתוח מתוך האתר עם התחברות לאדמין');
   const chunk=85,n=Math.ceil(A.data.length/A.sr/chunk),segs=[];
   for(let k=0;k<n;k++){S.busy={t:`מתמלל (${k+1} מתוך ${n})`,pct:k/n};paintBusy();const a=k*chunk*A.sr,b=Math.min(A.data.length,(k+1)*chunk*A.sr);const part=A.data.subarray(a,b);
    let d;if(window.__v204mockT)d=await window.__v204mockT(k*chunk,part.length/A.sr);else{const r=await fetch('/api/transcribe',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+tok},body:JSON.stringify({b64:b64(wav(part,A.sr)),type:'audio/wav',offset:k*chunk,dur:part.length/A.sr,lang:'he'})});d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||('HTTP '+r.status))}
    (d.segments||[]).forEach(g=>segs.push({id:uid('s'),t0:+g.t0,t1:+g.t1,text:String(g.text).replace(/\s[—–-]\s/g,', ')}))}
   if(!segs.length)throw new Error('התמלול חזר ריק');const before=clone(core(p));hist();p.subs.segs=segs;if(p.subs.mode==='off'||p.subs.mode==='manual')p.subs.mode='auto_edit';logOp({kind:'auto',instr:'תמלול אוטומטי',status:'auto',result:segs.length+' מקטעים',before});persist()}
  catch(e){console.warn('v204 tr',e);S.err='התמלול נכשל: '+((e&&e.message)||'')}S.busy=null;refresh()}
function tlSegs(p){const {L}=lay(p);const out=[];L.forEach(x=>{(p.subs.segs||[]).forEach(g=>{if(g.t1>x.c.in&&g.t0<x.c.out){out.push({g,x,a:x.start+Math.max(g.t0,x.c.in)-x.c.in,b:x.start+Math.min(g.t1,x.c.out)-x.c.in})}})});return out}
const ts=(t,sep)=>{t=Math.max(0,t);const h=Math.floor(t/3600),m=Math.floor(t%3600/60),s=Math.floor(t%60),ms=Math.round((t%1)*1000);const z=(n,l)=>String(n).padStart(l||2,'0');return `${z(h)}:${z(m)}:${z(s)}${sep}${z(ms,3)}`};
function subFile(kind){const p=S.p;const raw=tlSegs(p).sort((a,b)=>a.a-b.a);
  // a line that runs across a cut between two contiguous pieces of the same source is one line in the file
  const rows=[];raw.forEach(r=>{const l=rows[rows.length-1];if(l&&l.g.id===r.g.id&&r.a<=l.b+0.06)l.b=Math.max(l.b,r.b);else rows.push(Object.assign({},r))});if(kind==='vtt')return 'WEBVTT\n\n'+rows.map(r=>`${ts(r.a,'.')} --> ${ts(r.b,'.')}\n${r.g.text}`).join('\n\n')+'\n';return rows.map((r,i)=>`${i+1}\n${ts(r.a,',')} --> ${ts(r.b,',')}\n${r.g.text}`).join('\n\n')+'\n'}
function parseSub(txt){const out=[];const re=/(\d{1,2}:)?(\d{1,2}):(\d{2})[,.](\d{1,3})\s*-->\s*(\d{1,2}:)?(\d{1,2}):(\d{2})[,.](\d{1,3})[^\n]*\n([\s\S]*?)(?=\n\s*\n|\n?$)/g;let m;const sec=(h,mi,s,ms)=>(+(h||'0:').replace(':','')||0)*3600+(+mi)*60+(+s)+(+String(ms).padEnd(3,'0'))/1000;
  while((m=re.exec(String(txt).replace(/\r/g,''))))out.push({id:uid('s'),t0:sec(m[1],m[2],m[3],m[4]),t1:sec(m[5],m[6],m[7],m[8]),text:m[9].replace(/<[^>]+>/g,'').trim()});return out.filter(g=>g.text&&g.t1>g.t0)}
// imported files are in timeline time: they are mapped back to source time through the clip under each line
function fromTimeline(p,segs){return segs.map(g=>{const a=at(g.t0,p);if(!a)return null;const st=a.x.c.in+a.local;return {id:g.id,t0:+st.toFixed(3),t1:+(st+(g.t1-g.t0)).toFixed(3),text:g.text}}).filter(Boolean)}
function download(name,data,type){const b=data instanceof Blob?data:new Blob([data],{type:type||'text/plain;charset=utf-8'});const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),4000)}

// ---------- export: the same compositor, real time, into MediaRecorder; the original file is untouched ----------
function mimeOf(){return ['video/mp4;codecs=avc1.640028,mp4a.40.2','video/mp4;codecs=avc1.42E01F,mp4a.40.2','video/mp4','video/webm;codecs=vp9,opus','video/webm'].find(m=>window.MediaRecorder&&MediaRecorder.isTypeSupported(m))||''}
async function doExport(o){const p=S.p;if(!p||S.exp&&S.exp.run)return;stopPlay();const url=await srcURL(p);if(!url){S.err='הקובץ של הסרטון לא נמצא';refresh();return}
  if(!window.MediaRecorder||!HTMLCanvasElement.prototype.captureStream){S.err='הדפדפן הזה לא יודע לייצא וידאו. נסו בכרום במחשב';refresh();return}
  const [W,H]=outDims(p,o.res==='720'?1280:o.res==='1080'?1920:0);const cv=document.createElement('canvas');cv.width=W;cv.height=H;const c=cv.getContext('2d');
  const AC=window.AudioContext||window.webkitAudioContext;const ac=new AC();await ac.resume().catch(()=>{});const dest=ac.createMediaStreamDestination();let chain=dest;
  if(p.audio.enhance){const hp=ac.createBiquadFilter();hp.type='highpass';hp.frequency.value=90;const pk=ac.createBiquadFilter();pk.type='peaking';pk.frequency.value=3000;pk.gain.value=3;pk.Q.value=0.9;const cp=ac.createDynamicsCompressor();cp.threshold.value=-24;cp.ratio.value=3;hp.connect(pk);pk.connect(cp);cp.connect(dest);chain=hp}
  const pl=Player(url,{dest:chain,ac});await ready(pl.els[0]);let music=null;if(p.music&&p.music.url){music=new Audio(p.music.url);music.crossOrigin='anonymous';const ms=ac.createMediaElementSource(music),mg=ac.createGain();mg.gain.value=p.music.vol||0.2;ms.connect(mg);mg.connect(dest)}
  const fps=o.fps||30;const st=cv.captureStream(fps);dest.stream.getAudioTracks().forEach(t=>st.addTrack(t));const mt=mimeOf();const rec=new MediaRecorder(st,mt?{mimeType:mt,videoBitsPerSecond:W*H>1.5e6?10e6:6e6,audioBitsPerSecond:192000}:{});const ch=[];rec.ondataavailable=e=>{if(e.data&&e.data.size)ch.push(e.data)};
  const total=lay(p).total;const subsOn=o.subs!==false;const pp=subsOn?p:Object.assign(clone(p),{subs:Object.assign(clone(p.subs),{mode:'off'})});
  S.exp={run:true,pct:0,W,H,mt,url:'',size:0,err:''};refresh();
  await pl.seek(pp,0);compose(c,W,H,pp,pl,0,false);rec.start(1000);if(music){music.currentTime=0;music.play().catch(()=>{})}
  await new Promise(res=>{S.exp.cancel=()=>{pl.stop();res()};pl.play(pp,{onFrame:t=>{compose(c,W,H,pp,pl,t,false);S.exp.pct=t/total;expBar()},onStall:()=>{try{rec.pause();music&&music.pause()}catch(e){}},onResume:()=>{try{rec.resume();music&&music.play().catch(()=>{})}catch(e){}},onEnd:res})});
  await new Promise(r=>{rec.onstop=r;try{rec.stop()}catch(e){r()}});if(music)music.pause();pl.destroy();try{ac.close()}catch(e){}
  const type=(mt||'video/webm').split(';')[0];const blob=new Blob(ch,{type});if(!blob.size){S.exp={run:false,err:'הייצוא לא הפיק קובץ. נסו שוב או בדפדפן אחר'};refresh();return}
  const u=URL.createObjectURL(blob);S.exp={run:false,pct:1,url:u,size:blob.size,type,W,H,blob,name:(p.name||'video').replace(/[^֐-׿A-Za-z0-9]+/g,'-').slice(0,40)+(type==='video/mp4'?'.mp4':'.webm')};
  logOp({kind:'export',instr:'ייצוא',status:'auto',result:`${W}x${H} ${type==='video/mp4'?'MP4':'WebM'} ${(blob.size/1048576).toFixed(1)}MB${subsOn&&p.subs.mode!=='off'?' עם כתוביות':''}`});persist();refresh()}
function expBar(){const b=document.querySelector('.v204 .v204xbar i');if(b&&S.exp)b.style.width=Math.round((S.exp.pct||0)*100)+'%';const t=document.querySelector('.v204 .v204xpct');if(t&&S.exp)t.textContent=Math.round((S.exp.pct||0)*100)+'%'}
async function saveExport(){const x=S.exp;const as=ASSETS();if(!x||!x.blob)return;if(!as){toastS('שמירה בענן זמינה כשהמנוע פתוח מתוך האתר');return}try{const r=await as.upload(x.blob,{ext:x.type==='video/mp4'?'mp4':'webm'});x.cloud=r.url;logOp({kind:'export',instr:'שמירת הייצוא בענן',status:'auto',result:r.url});persist();refresh();toastS('הסרטון נשמר בענן')}catch(e){toastS('השמירה בענן נכשלה: '+((e&&e.message)||''))}}

// ---------- import: a new file, or any video the system already has ----------
function sources(){const out=[],seen=new Set();const add=(id,name,url,from)=>{if(!url||seen.has(url))return;seen.add(url);out.push({id,name,url,from})};
  try{(window.__vid&&__vid.VD.docs||[]).forEach(d=>{add('d'+d.id,d.name||d.title||'סרטון',d.out||d.srcUrl,d.out?'סרטון מוכן':'סרטון שהועלה')})}catch(e){}
  try{(window.__v127&&__v127.T.items||[]).forEach(t=>add('t'+t.id,t.name,t.url,'מגש העריכה'))}catch(e){}
  try{(window.__v48&&__v48.IB.items||[]).filter(x=>x.kind==='video'&&x.video).forEach(x=>add('i'+x.id,x.name,x.video,'חומרים של הסוכן'))}catch(e){}
  return out}
async function fromFile(f){if(!f||!/^video\//.test(f.type)){toastS('אפשר לפתוח כאן קבצי וידאו');return}const p=newProject({name:f.name,size:f.size,type:f.type});LOCAL[p.id]=URL.createObjectURL(f);
  const as=ASSETS();if(as&&f.size<=50*1024*1024){S.busy={t:'מעלה את הסרטון לענן',pct:-1};refresh();try{const r=await as.upload(f,{ext:(f.name.split('.').pop()||'mp4').toLowerCase().slice(0,4)});p.src.url=r.url;p.src.asset=r.id}catch(e){console.warn('v204 up',e);p.src.local=true}}else p.src.local=true;
  if(p.src.local)p.note=(p.note?p.note+'. ':'')+'הקובץ שמור רק בדפדפן הזה'+(f.size>50*1024*1024?' (גדול מ-50MB לענן)':'')+'. כדי לפתוח את הפרויקט במכשיר אחר צריך לבחור את הקובץ שם שוב';
  S.list[p.id]=p;await openProject(p.id)}
async function fromSource(s){const p=newProject({name:s.name,url:s.url,from:s.from});S.list[p.id]=p;await openProject(p.id)}
async function openProject(id){const p=S.list[id];if(!p)return;stopPlay();if(PL){PL.destroy();PL=null;PLurl=''}S.p=p;S.sel=new Set();S.cur='';S.t=0;S.prop=null;S.pv=null;S.hist=[];S.fut=[];S.err='';S.exp=null;refresh();
  try{if(!p.clips.length||p.status==='new')await analyze(p);else if(!AUD[p.id]&&p.meta.hasAudio!==false){srcURL(p).then(u=>u&&audio(p,u).then(()=>drawTL())).catch(()=>{})}}catch(e){S.busy=null;S.err=(e&&e.message)||'הפתיחה נכשלה'}
  S.cur=(p.clips[0]||{}).id||'';refresh();await seek(0)}
function closeProject(){stopPlay();if(PL){PL.destroy();PL=null;PLurl=''}S.p=null;S.prop=null;S.pv=null;refresh()}
// every new upload in the system gets a project waiting in the studio (the analysis runs when it is opened)
(function hook(){const V=window.__vid;if(V&&V.uploadAndQueue&&!V.uploadAndQueue.__v204){const o=V.uploadAndQueue;V.uploadAndQueue=async function(f,opts){const r=await o.apply(this,arguments);try{const url=r&&(r.srcUrl||r.out);if(url&&!Object.values(S.list).some(x=>x.src.url===url)){const p=newProject({name:f.name,url,from:'העלאה למערכת'});S.list[p.id]=p;persist(p)}}catch(e){}return r};V.uploadAndQueue.__v204=1}else setTimeout(hook,1500)})();

// ---------- the page ----------
function libHtml(){const ps=Object.values(S.list).sort((a,b)=>(b.touched||0)-(a.touched||0));const src=sources().filter(s=>!ps.some(p=>p.src.url===s.url));
  return `<div class="v204lib"><label class="v204drop" data-v204drop><input type="file" accept="video/*" data-v204="file" hidden><b>העלאת סרטון לעריכה</b><span>גררו לכאן קובץ או לחצו לבחירה. הסרטון נפתח כפרויקט: סצנות, ציר זמן, כתוביות ועוזר AI</span></label>
   <h3>הפרויקטים שלי <small>${ps.length}</small></h3>${ps.length?`<div class="v204grid">${ps.map(p=>`<article class="v204pc"><button type="button" data-v204="open" data-id="${p.id}"><span class="v204pt">${p.clips[0]&&p.clips[0].thumb?`<img src="${p.clips[0].thumb}" alt="">`:''}</span><b>${E(p.name)}</b><small>${p.meta.dur?fmt(p.meta.dur)+' · ':''}${p.clips.length?p.clips.length+' סצנות · ':''}${p.status==='new'?'ממתין לפתיחה':p.status==='edited'?'נערך':'מוכן'}${p.src.local?' · רק במכשיר הזה':''}</small></button><button type="button" class="v204x" data-v204="delp" data-id="${p.id}" aria-label="מחיקת הפרויקט ${E(p.name)}">✕</button></article>`).join('')}</div>`:'<p class="v204hint">עוד אין פרויקטים. העלו סרטון, או פתחו אחד מהסרטונים שכבר במערכת.</p>'}
   ${src.length?`<h3>סרטונים שכבר במערכת <small>${src.length}</small></h3><div class="v204src">${src.slice(0,40).map(s=>`<button type="button" data-v204="src" data-u="${E(s.url)}" data-n="${E(s.name)}" data-f="${E(s.from)}"><b>${E(s.name)}</b><small>${E(s.from)}</small></button>`).join('')}</div>`:''}</div>`}
function clipsHtml(){const p=P();const {L}=lay(p);return `<aside class="v204left" aria-label="סצנות"><div class="v204lh"><b>סצנות <small>${p.clips.length}</small></b><button type="button" class="v204b" data-v204="notes" ${S.busy?'disabled':''} title="Claude מתאר כל סצנה ומציע עריכה">✦ הצעות AI</button></div>
  <div class="v204lt" role="toolbar" aria-label="פעולות על הסצנה הנבחרת"><button type="button" data-v204="split" title="פיצול בנקודת הניגון (S)">פיצול</button><button type="button" data-v204="trimin" title="התחלת הקטע מנקודת הניגון">חיתוך התחלה</button><button type="button" data-v204="trimout" title="סוף הקטע בנקודת הניגון">חיתוך סוף</button><button type="button" data-v204="merge" title="איחוד עם הסצנה הבאה">איחוד</button><button type="button" data-v204="dupc">שכפול</button><button type="button" data-v204="delc" class="dz">מחיקה</button></div>
  <ol class="v204list">${L.map(x=>{const c=x.c,on=S.sel.has(c.id);return `<li class="v204sc${on?' on':''}${c.id===S.cur?' cur':''}" data-id="${c.id}" draggable="true"><label class="v204ck"><input type="checkbox" data-v204="ck" data-id="${c.id}"${on?' checked':''} aria-label="בחירת ${E(c.name)} לעריכה מרובה"></label>
   <button type="button" class="v204st" data-v204="pick" data-id="${c.id}">${c.thumb?`<img src="${c.thumb}" alt="">`:'<i></i>'}<span><b>${x.i+1}. ${E(c.name)}</b><small>${fmt(x.start)} · ${x.dur.toFixed(1)} ש'${c.status==='edited'||JSON.stringify(c.adj)!=='{"exp":0,"con":0,"sat":0,"temp":0}'?' · נערך':''}</small>${c.desc?`<em>${E(c.desc)}</em>`:''}${p.subs.segs.length?`<q>${E(transcriptOf(p,c.in,c.out,90))}</q>`:''}${c.sugg?`<u>✦ ${E(c.sugg)}</u>`:''}</span></button>
   <span class="v204mv"><button type="button" data-v204="up" data-id="${c.id}" aria-label="למעלה"${x.i?'':' disabled'}>↑</button><button type="button" data-v204="down" data-id="${c.id}" aria-label="למטה"${x.i<L.length-1?'':' disabled'}>↓</button></span></li>`}).join('')}</ol></aside>`}
function stageHtml(){const p=P();const {total}=lay(p);return `<section class="v204mid" aria-label="תצוגה"><div class="v204stg ${p.fmt==='9:16'||(p.fmt==='orig'&&p.meta.h>p.meta.w)?'tall':''}"><canvas class="v204cv" aria-label="תצוגת הסרטון"></canvas>${S.pv?'<span class="v204pvb">תצוגה מקדימה של ההצעה</span>':''}${S.compare?'<span class="v204pvb cmp">השוואה למקור</span>':''}</div>
  <div class="v204ctl"><button type="button" data-v204="prevs" aria-label="הסצנה הקודמת (J)">⏮</button><button type="button" data-v204="prevf" aria-label="פריים אחורה (←)">◀︎</button><button type="button" class="v204play" data-v204="play" aria-label="ניגון">▶</button><button type="button" data-v204="nextf" aria-label="פריים קדימה (→)">▶︎</button><button type="button" data-v204="nexts" aria-label="הסצנה הבאה (L)">⏭</button>
   <span id="v204tc" class="v204tc">${fmt(S.t)} / ${fmt(total)}</span><select data-v204="rate" aria-label="מהירות ניגון">${[0.5,1,1.5,2].map(r=>`<option value="${r}"${S.rate===r?' selected':''}>${r}x</option>`).join('')}</select>
   <select data-v204="fmt" aria-label="יחס מסך">${FMTS.map(([k,l])=>`<option value="${k}"${S.p.fmt===k?' selected':''}>${l}</option>`).join('')}</select><button type="button" data-v204="cmp" aria-pressed="${S.compare}" title="השוואה למקור בנקודת הניגון">מקור מול עריכה</button><button type="button" data-v204="fs" aria-label="מסך מלא">⛶</button></div></section>`}
function tabsHtml(){const T=[['edit','עריכה'],['ai','עוזר AI'],['subs','כתוביות'],['audio','שמע'],['text','טקסט'],['export','ייצוא'],['hist','היסטוריה'],['prefs','העדפות']];return `<div class="v204tabs" role="tablist">${T.map(([k,l])=>`<button type="button" role="tab" aria-selected="${S.tab===k}" data-v204="tab" data-t="${k}">${l}</button>`).join('')}</div>`}
function selClips(){const p=P();const ids=S.sel.size?[...S.sel]:(S.cur?[S.cur]:[]);return ids.map(id=>clipById(id,p)).filter(Boolean)}
function rng(k,lab,val,min,max,step,extra){return `<label class="v204rg"><span>${lab}<output>${typeof val==='number'?(Math.abs(max)<=1.01&&min<0?Math.round(val*100):val):val}</output></span><input type="range" min="${min}" max="${max}" step="${step}" value="${val}" data-v204r="${k}"${extra||''}></label>`}
function panelHtml(){const p=P();const cs=selClips();const c=cs[0];const multi=cs.length>1;
  if(S.tab==='edit'){if(!c)return '<p class="v204hint">בחרו סצנה ברשימה או בציר הזמן.</p>';return `<h4>${multi?cs.length+' סצנות נבחרו (עריכה לכולן)':E(c.name)} <small>${multi?'':fmt(c.in)+' עד '+fmt(c.out)+' במקור'}</small></h4>${multi?'':`<label class="v204fl">שם הסצנה<input type="text" data-v204="name" value="${E(c.name)}"></label>`}
    <h5>צבע ואור</h5>${ADJ.map(([k,l])=>rng('adj.'+k,l,c.adj[k],-1,1,0.02)).join('')}<button type="button" class="v204b" data-v204="adjreset">איפוס צבע</button>
    <h5>מסגור</h5>${rng('frame.scale','זום',c.frame.scale,1,3,0.01)}${rng('frame.x','מיקום אופקי',c.frame.x,-0.5,0.5,0.01)}${rng('frame.y','מיקום אנכי',c.frame.y,-0.5,0.5,0.01)}
    <h5>מעבר לתוך הסצנה</h5><select data-v204="trans">${TRANS.map(([k,l])=>`<option value="${k}"${c.trans.type===k?' selected':''}>${l}</option>`).join('')}</select>${rng('trans.dur','משך המעבר (ש\')',c.trans.dur,0.2,1.5,0.05)}
    <h5>חיתוך</h5><div class="v204row"><label class="v204fl">התחלה במקור<input type="number" step="0.05" min="0" data-v204="in" value="${c.in.toFixed(2)}"${multi?' disabled':''}></label><label class="v204fl">סוף במקור<input type="number" step="0.05" data-v204="out" value="${c.out.toFixed(2)}"${multi?' disabled':''}></label></div>
    <p class="v204hint">ייצוב תמונה, הסרת רקע והחלפת שוט לא זמינים בעורך הזה. אפשר לבקש מהעוזר חלופה.</p>`}
  if(S.tab==='ai'){const pr=S.prop;const mp=S.p;return `<h4>עוזר העריכה <small>${cs.length?'על: '+cs.map(x=>E(x.name)).join(', '):'בחרו סצנה'}</small></h4>
    <form data-v204="askf"><textarea data-v204="instr" rows="3" placeholder='למשל: "תוריד את השתיקה בהתחלה", "צבעים יותר טבעיים", "כתוביות קטנות וקצת יותר גבוה", "מעבר רך בין הסצנות האלה"'></textarea><button type="submit" class="v204b pri" ${S.busy?'disabled':''}>${S.busy&&/Claude/.test(S.busy.t)?'Claude חושב…':'שליחה'}</button></form>
    <div class="v204chips">${['להבהיר את הסצנה','צבעים טבעיים יותר','להוריד שתיקות','מעבר רך לסצנה הבאה','כתוביות קטנות וגבוהות יותר','לשפר את איכות הדיבור'].map(x=>`<button type="button" data-v204="chip">${x}</button>`).join('')}</div>
    ${pr?`<div class="v204prop"><b>ההצעה</b><p>${E(pr.summary||'')}</p>${pr.ops.length?`<ol>${pr.ops.map(q=>`<li><i>${OPNAME[q.op]||q.op}</i> ${E(opText(mp,q))}</li>`).join('')}</ol>`:''}${pr.unsupported.length?`<div class="v204uns"><b>מה לא אפשרי כאן</b>${pr.unsupported.map(u=>`<p>${E(u.what)}: ${E(u.why)}${u.alternative?'. חלופה: '+E(u.alternative):''}</p>`).join('')}</div>`:''}${pr.miss&&pr.miss.length?`<p class="v204err">${E(pr.miss.join(', '))}</p>`:''}
     <div class="v204row">${pr.ops.length?`<button type="button" class="v204b" data-v204="pv" aria-pressed="${!!S.pv}">${S.pv?'בתצוגה מקדימה':'תצוגה מקדימה'}</button><button type="button" class="v204b pri" data-v204="acc">אישור והחלה</button>`:''}<button type="button" class="v204b" data-v204="rej">דחייה</button></div></div>`:''}`}
  if(S.tab==='subs'){const s=mp().subs;return `<h4>כתוביות</h4><div class="v204seg" role="radiogroup">${[['off','בלי כתוביות'],['auto','אוטומטיות'],['manual','כתיבה ידנית'],['auto_edit','אוטומטיות עם תיקון']].map(([k,l])=>`<button type="button" role="radio" aria-checked="${s.mode===k}" data-v204="smode" data-m="${k}">${l}</button>`).join('')}</div>
    <div class="v204row"><button type="button" class="v204b pri" data-v204="stt" ${S.busy||!mp().meta.hasAudio?'disabled':''}>${s.segs.length?'תמלול מחדש':'תמלול אוטומטי מהדיבור'}</button><button type="button" class="v204b" data-v204="segadd">+ כתובית בנקודת הניגון</button></div>${mp().meta.hasAudio===false?'<p class="v204hint">בסרטון הזה אין פס קול, אז אפשר רק לכתוב ידנית.</p>':''}
    <h5>סגנון</h5><select data-v204="sstyle">${SUBSTY.map(([k,l])=>`<option value="${k}"${s.style===k?' selected':''}>${l}</option>`).join('')}</select>${rng('subs.size','גודל',s.size,0.6,1.6,0.05)}${rng('subs.y','גובה במסך',s.y,0.1,0.92,0.01)}<div class="v204sw">${COLORS.map(([k,l])=>`<button type="button" data-v204="scol" data-c="${k}" style="background:${k}" aria-label="${l}" aria-pressed="${s.color===k}"></button>`).join('')}</div>
    <h5>המקטעים <small>${s.segs.length}</small></h5><div class="v204segs">${s.segs.slice().sort((a,b)=>a.t0-b.t0).map(g=>`<div class="v204sg" data-id="${g.id}"><button type="button" data-v204="segjump" data-id="${g.id}" title="מעבר לכתובית">${fmt(g.t0)}</button><input type="text" data-v204="segtx" data-id="${g.id}" value="${E(g.text)}" aria-label="טקסט הכתובית"><input type="number" step="0.05" data-v204="segt0" data-id="${g.id}" value="${g.t0.toFixed(2)}" aria-label="התחלה"><input type="number" step="0.05" data-v204="segt1" data-id="${g.id}" value="${g.t1.toFixed(2)}" aria-label="סוף"><button type="button" data-v204="segdel" data-id="${g.id}" aria-label="מחיקת הכתובית">✕</button></div>`).join('')||'<p class="v204hint">אין כתוביות עדיין.</p>'}</div>
    <div class="v204row"><label class="v204b"><input type="file" accept=".srt,.vtt,text/vtt" data-v204="subin" hidden>ייבוא SRT או VTT</label><button type="button" class="v204b" data-v204="srt" ${s.segs.length?'':'disabled'}>הורדת SRT</button><button type="button" class="v204b" data-v204="vtt" ${s.segs.length?'':'disabled'}>הורדת VTT</button></div>
    <p class="v204hint">הזמנים כאן הם בתוך הסרטון המקורי, ולכן הכתוביות נשארות צמודות לדיבור גם כשמזיזים או חותכים סצנות.</p>`}
  if(S.tab==='audio'){if(!c)return '<p class="v204hint">בחרו סצנה.</p>';return `<h4>שמע${multi?' ל-'+cs.length+' סצנות':': '+E(c.name)}</h4>${rng('vol','עוצמה',c.vol,0,2,0.05)}${rng('fadeIn','כניסה הדרגתית (ש\')',c.fadeIn,0,3,0.1)}${rng('fadeOut','יציאה הדרגתית (ש\')',c.fadeOut,0,3,0.1)}
    <label class="v204tg"><input type="checkbox" data-v204="mute"${c.mute?' checked':''}> השתקת הסצנה</label><label class="v204tg"><input type="checkbox" data-v204="enh"${mp().audio.enhance?' checked':''}> שיפור דיבור לכל הסרטון (מסנן רעשים נמוכים, מבליט את הקול, מאזן עוצמה). נשמע בייצוא</label>
    <button type="button" class="v204b" data-v204="cutp" ${AUD[mp().id]?'':'disabled'}>חיתוך שתיקות בסצנות הנבחרות</button>
    <h5>מוזיקת רקע</h5>${mp().music?`<p>${E(mp().music.name)} <button type="button" class="v204b" data-v204="nomus">הסרה</button></p>${rng('mvol','עוצמת המוזיקה',mp().music.vol,0,1,0.02)}`:'<label class="v204b"><input type="file" accept="audio/*" data-v204="mus" hidden>בחירת קובץ מוזיקה</label><p class="v204hint">רק מוזיקה שמותר לכם להשתמש בה מסחרית. המוזיקה נשארת בדפדפן הזה בלבד.</p>'}
    <p class="v204hint">הסרת רעשים מתקדמת והחלפת קול דורשות עיבוד בשרת, ואינן זמינות כאן.</p>`}
  if(S.tab==='text'){const os=mp().overlays;return `<h4>טקסט על המסך</h4><button type="button" class="v204b pri" data-v204="ovadd">+ טקסט בנקודת הניגון</button><div class="v204ovs">${os.map(o=>`<div class="v204ov"><input type="text" data-v204="ovtx" data-id="${o.id}" value="${E(o.text)}" aria-label="טקסט"><div class="v204row"><label class="v204fl">מ-<input type="number" step="0.1" data-v204="ovt0" data-id="${o.id}" value="${o.t0.toFixed(1)}"></label><label class="v204fl">עד<input type="number" step="0.1" data-v204="ovt1" data-id="${o.id}" value="${o.t1.toFixed(1)}"></label></div>
    <div class="v204row"><label class="v204fl">גובה<input type="range" min="0.05" max="0.95" step="0.01" value="${o.y}" data-v204="ovy" data-id="${o.id}"></label><label class="v204fl">גודל<input type="range" min="0.6" max="1.8" step="0.05" value="${o.size}" data-v204="ovs" data-id="${o.id}"></label></div><div class="v204sw">${COLORS.map(([k,l])=>`<button type="button" data-v204="ovc" data-id="${o.id}" data-c="${k}" style="background:${k}" aria-label="${l}" aria-pressed="${o.color===k}"></button>`).join('')}<button type="button" class="v204b" data-v204="ovbg" data-id="${o.id}">${o.bg&&o.bg!=='none'?'בלי רקע':'עם רקע'}</button><button type="button" class="v204b dz" data-v204="ovdel" data-id="${o.id}">מחיקה</button></div></div>`).join('')||'<p class="v204hint">אין עדיין טקסט על המסך.</p>'}</div>`}
  if(S.tab==='export'){const x=S.exp;const m=mimeOf();return `<h4>ייצוא</h4><div class="v204row"><label class="v204fl">רזולוציה<select data-v204="xres"><option value="orig">מקורית</option><option value="1080">1080</option><option value="720">720</option></select></label><label class="v204fl">קצב פריימים<select data-v204="xfps"><option value="30">30</option><option value="25">25</option></select></label></div>
    <label class="v204tg"><input type="checkbox" data-v204="xsub" checked ${mp().subs.mode==='off'?'disabled':''}> כתוביות צרובות בסרטון</label><p class="v204hint">פורמט: ${outDims(mp())[0]}x${outDims(mp())[1]}, ${m.includes('mp4')?'MP4':m?'WebM (הדפדפן הזה לא מקליט MP4)':'לא נתמך בדפדפן הזה'}. הייצוא מנגן את הסרטון בזמן אמת ולוקח בערך את אורכו (${fmt(lay(mp()).total)}). אל תסגרו את הלשונית בזמן הייצוא.</p>
    ${x&&x.run?`<div class="v204xbar" role="progressbar"><i style="width:${Math.round((x.pct||0)*100)}%"></i></div><p><span class="v204xpct">${Math.round((x.pct||0)*100)}%</span> <button type="button" class="v204b" data-v204="xcancel">ביטול</button></p>`:`<button type="button" class="v204b pri" data-v204="xgo" ${m?'':'disabled'}>ייצוא הסרטון</button>`}
    ${x&&x.err?`<p class="v204err">${E(x.err)}</p>`:''}${x&&x.url?`<div class="v204xres"><video src="${x.url}" controls playsinline></video><p>${x.W}x${x.H} · ${x.type==='video/mp4'?'MP4':'WebM'} · ${(x.size/1048576).toFixed(1)}MB</p><div class="v204row"><a class="v204b pri" href="${x.url}" download="${E(x.name)}">הורדה</a><button type="button" class="v204b" data-v204="xsave" ${x.cloud?'disabled':''}>${x.cloud?'נשמר בענן':'שמירה בענן'}</button></div></div>`:''}
    ${mp().subs.segs.length?'<div class="v204row"><button type="button" class="v204b" data-v204="srt">קובץ SRT נפרד</button><button type="button" class="v204b" data-v204="vtt">קובץ VTT נפרד</button></div>':''}`}
  if(S.tab==='hist'){const ops=mp().ops;const vs=mp().versions;const cid=c&&!multi?c.id:'';return `<h4>היסטוריה</h4><div class="v204row"><button type="button" class="v204b" data-v204="undo" ${S.hist.length?'':'disabled'}>↶ ביטול</button><button type="button" class="v204b" data-v204="redo" ${S.fut.length?'':'disabled'}>↷ חזרה</button><button type="button" class="v204b" data-v204="vsave">שמירת גרסה</button><button type="button" class="v204b dz" data-v204="orig" ${mp().orig?'':'disabled'}>חזרה למקור</button></div>
    ${vs.length?`<h5>גרסאות</h5><ul class="v204vs">${vs.map(v=>`<li><span>${E(v.label)}<small>${new Date(v.at).toLocaleString('he-IL')}</small></span><button type="button" class="v204b" data-v204="vres" data-id="${v.id}">שחזור</button></li>`).join('')}</ul>`:''}
    <h5>כל הפעולות${cid?` <label class="v204tg"><input type="checkbox" data-v204="hfil"${S.hfil?' checked':''}> רק של "${E(c.name)}"</label>`:''}</h5><ul class="v204ops">${ops.filter(o=>!S.hfil||!cid||(o.clips||[]).includes(cid)).slice(0,80).map(o=>`<li class="${o.status}"><b>${E(o.instr||o.kind)}</b><small>${new Date(o.at).toLocaleString('he-IL',{dateStyle:'short',timeStyle:'short'})} · ${({accepted:'אושר',rejected:'נדחה',manual:'ידני',auto:'אוטומטי'})[o.status]||o.status}${o.result?' · '+E(o.result):''}</small>${o.proposal&&o.proposal.ops?`<em>${o.proposal.ops.map(q=>OPNAME[q.op]||q.op).join(', ')}</em>`:''}${o.before?`<button type="button" class="v204b" data-v204="opres" data-id="${o.id}">חזרה למצב שלפני</button>`:''}</li>`).join('')}</ul>`}
  if(S.tab==='prefs'){const R=rules();const sc=Object.entries(PREF.score).filter(([,v])=>Math.abs(v)>=0.5).sort((a,b)=>Math.abs(b[1])-Math.abs(a[1]));return `<h4>ההעדפות שלי</h4><label class="v204tg"><input type="checkbox" data-v204="learn"${PREF.learn?' checked':''}> ללמוד מהאישורים, מהדחיות ומהעריכות שלי</label>
    <h5>מה המערכת למדה <small>${R.length}</small></h5>${R.length?`<ul class="v204vs">${R.map(r=>`<li><span>${E(r.text)}<small>ביטחון ${r.conf} (${r.v>0?'+':''}${r.v})</small></span><button type="button" class="v204b" data-v204="pdel" data-k="${E(r.k)}">שכחה</button></li>`).join('')}</ul>`:'<p class="v204hint">עוד אין דפוס קבוע. העדפה נכנסת לכאן אחרי שחוזרת כמה פעמים, לא מעריכה אחת.</p>'}
    ${sc.length&&sc.length>R.length?`<details><summary>אותות שנאספו (${sc.length})</summary><ul class="v204mini">${sc.map(([k,v])=>`<li>${E(PNAME[k]||k)}: ${v>0?'+':''}${v}</li>`).join('')}</ul></details>`:''}
    <h5>העדפות שכתבתי בעצמי</h5><ul class="v204vs">${PREF.explicit.map((x,i)=>`<li><span>${E(x)}</span><button type="button" class="v204b" data-v204="xdel" data-i="${i}">הסרה</button></li>`).join('')}</ul><form data-v204="xadd" class="v204row"><input type="text" data-v204="xin" placeholder='למשל: "תמיד מראה טבעי, בלי אפקטים מלאכותיים"'><button type="submit" class="v204b">הוספה</button></form>
    <button type="button" class="v204b dz" data-v204="preset">איפוס כל ההעדפות</button><p class="v204hint">ההעדפות נשמרות במסד של המנוע ונשלחות לעוזר בכל בקשה. הן לא מאמנות מודל.</p>`}
  return ''}
const mp=()=>P();
function tlHtml(){return `<section class="v204tl" aria-label="ציר זמן"><div class="v204tlb"><b>ציר זמן</b><button type="button" data-v204="zout" aria-label="הקטנת זום">−</button><button type="button" data-v204="zin" aria-label="הגדלת זום">+</button><small>גוררים את הסמן כדי לנווט, את הקצוות של סצנה כדי לחתוך, ואת הסצנה עצמה כדי להזיז אותה</small></div><div class="v204tls" id="v204tls"><canvas id="v204tlc" aria-label="ציר הזמן"></canvas></div></section>`}
function pageHtml(){if(!S.p)return `<div class="v204 v204l">${libHtml()}${S.busy?busyHtml():''}</div>`;const p=P();
  return `<div class="v204"><header class="v204h"><button type="button" class="v204b" data-v204="back">← כל הפרויקטים</button><input type="text" class="v204nm" data-v204="pname" value="${E(S.p.name)}" aria-label="שם הפרויקט"><span class="v204st2">${S.p.src.local?'רק במכשיר הזה · ':''}${fmt(S.p.meta.dur)} מקור · ${S.p.meta.w}x${S.p.meta.h}${S.p.note?' · '+E(S.p.note):''}</span><button type="button" class="v204b" data-v204="undo" ${S.hist.length?'':'disabled'} aria-label="ביטול (Ctrl+Z)">↶</button><button type="button" class="v204b" data-v204="redo" ${S.fut.length?'':'disabled'} aria-label="חזרה (Ctrl+Y)">↷</button></header>
   ${S.err?`<p class="v204err" role="alert">${E(S.err)} <button type="button" class="v204b" data-v204="errx">סגירה</button></p>`:''}${S.p.src.local&&!LOCAL[S.p.id]?`<p class="v204err">הקובץ של הפרויקט לא נמצא בדפדפן הזה. <label class="v204b"><input type="file" accept="video/*" data-v204="refile" hidden>בחירת הקובץ שוב</label></p>`:''}
   <div class="v204body">${p.clips.length?clipsHtml():'<aside class="v204left"></aside>'}${stageHtml()}<aside class="v204right">${tabsHtml()}<div class="v204pan">${panelHtml()}</div></aside></div>${tlHtml()}${S.busy?busyHtml():''}</div>`}
function busyHtml(){return `<div class="v204busy" role="status"><b>${E(S.busy.t)}</b>${S.busy.pct>=0?`<span class="v204xbar"><i style="width:${Math.round(S.busy.pct*100)}%"></i></span>`:'<span class="v204spin"></span>'}</div>`}
function paintBusy(){const b=document.querySelector('.v204busy');if(!b){refresh();return}if(!S.busy){b.remove();return}b.querySelector('b').textContent=S.busy.t;const i=b.querySelector('.v204xbar i');if(i)i.style.width=Math.round(S.busy.pct*100)+'%'}
// a redraw that starts while another one is replacing the page (a blur fired by the replacement) waits for the next tick
function refresh(){if(S.rendering){setTimeout(refresh,0);return}S.rendering=true;try{refresh0()}finally{S.rendering=false}}
function refresh0(){const root=$('appviews');if(typeof APP==='undefined'||APP.view!=='vstudio'||!root)return;const sc=document.querySelector('.v204pan');const top=sc?sc.scrollTop:0;const ls=document.querySelector('.v204list');const lt=ls?ls.scrollTop:0;const tls=$('v204tls');const tx=tls?tls.scrollLeft:0;
  root.innerHTML=pageHtml();const s2=document.querySelector('.v204pan');if(s2)s2.scrollTop=top;const l2=document.querySelector('.v204list');if(l2)l2.scrollTop=lt;const t2=$('v204tls');if(t2)t2.scrollLeft=tx;if(S.p){paint();drawTL();btnPlay()}}

// ---------- the timeline: one canvas, tracks for video, audio, subtitles, text and music ----------
const TR=[['video','וידאו',46],['audio','שמע',34],['subs','כתוביות',22],['text','טקסט',22],['music','מוזיקה',18]];const RUL=22,HEAD=64;
let thumbImg={};
function drawTL(){const cv=$('v204tlc');const p=P();if(!cv||!p)return;const {L,total}=lay(p);const z=S.zoom,wrapW=($('v204tls')||{}).clientWidth||800;const W=Math.max(wrapW,HEAD+total*z+40),H=RUL+TR.reduce((a,t)=>a+t[2]+4,0)+4;const dpr=Math.min(2,window.devicePixelRatio||1);
  cv.width=W*dpr;cv.height=H*dpr;cv.style.width=W+'px';cv.style.height=H+'px';const c=cv.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);c.fillStyle='#0d1720';c.fillRect(0,0,W,H);c.font='11px Arial';c.textBaseline='middle';
  const X=t=>HEAD+t*z;const step=z>=120?0.5:z>=50?1:z>=20?2:5;c.fillStyle='#8fa3b3';c.strokeStyle='#22323f';for(let t=0;t<=total+0.001;t+=step){const x=X(t);c.beginPath();c.moveTo(x,RUL-6);c.lineTo(x,RUL);c.stroke();if(Math.round(t/step)%2===0||z>=60)c.fillText(t>=60?fmt(t).replace(/\.\d+$/,''):t.toFixed(t%1?1:0)+'s',x+3,RUL/2)}
  let y=RUL+2;const rows={};TR.forEach(([k,l,h])=>{rows[k]=[y,h];c.fillStyle='#12202b';c.fillRect(HEAD,y,W-HEAD,h);c.fillStyle='#9fb3c2';c.textAlign='right';c.fillText(l,HEAD-6,y+h/2);c.textAlign='left';y+=h+4});
  const [vy,vh]=rows.video;L.forEach(x=>{const x0=X(x.start),w=Math.max(2,x.dur*z);const on=S.sel.has(x.c.id)||(x.c.id===S.cur);c.fillStyle=on?'#1f5f80':'#174257';c.fillRect(x0,vy,w-1,vh);
   const im=x.c.thumb&&(thumbImg[x.c.id]||(thumbImg[x.c.id]=Object.assign(new Image(),{src:x.c.thumb,onload:()=>drawTL()})));if(im&&im.complete&&im.naturalWidth){c.save();c.beginPath();c.rect(x0,vy,w-1,vh);c.clip();const tw=vh*im.naturalWidth/im.naturalHeight;for(let k=0;k*tw<w;k++)c.drawImage(im,x0+k*tw,vy,tw,vh);c.fillStyle='rgba(7,20,30,.45)';c.fillRect(x0,vy,w,vh);c.restore()}
   c.strokeStyle=on?'#ffd47a':'#2d6d8c';c.lineWidth=on?2:1;c.strokeRect(x0+.5,vy+.5,w-2,vh-1);c.fillStyle='#fff';c.save();c.beginPath();c.rect(x0+3,vy,w-6,vh);c.clip();c.fillText((x.i+1)+' '+x.c.name+'  '+x.dur.toFixed(1)+'s',x0+5,vy+11);c.restore();
   c.fillStyle='rgba(255,255,255,.5)';c.fillRect(x0,vy+vh-8,3,8);c.fillRect(x0+w-4,vy+vh-8,3,8);
   if(x.c.trans.type!=='none'){c.fillStyle='#ffd47a';c.beginPath();c.moveTo(x0,vy);c.lineTo(x0+9,vy);c.lineTo(x0,vy+9);c.fill()}});
  const [ay,ah]=rows.audio;const A=AUD[p.id];if(A){c.fillStyle='#3d8fb5';L.forEach(x=>{const g=x.c.mute?0.15:Math.min(2,x.c.vol);for(let px=0;px<x.dur*z;px+=2){const st=x.c.in+px/z,i=Math.floor(st*20);const v=(A.peaks[i]||0)/A.mx*g;const h=Math.max(1,v*ah*0.9);c.fillRect(X(x.start)+px,ay+ah/2-h/2,1.5,h)}})}else{c.fillStyle='#55697a';c.fillText(p.meta.hasAudio===false?'אין פס קול':'גל הקול נטען…',HEAD+8,ay+ah/2)}
  const [sy,sh]=rows.subs;tlSegs(p).forEach(r=>{const x0=X(r.a),w=Math.max(3,(r.b-r.a)*z);c.fillStyle=S.segSel===r.g.id?'#ffd47a':'#a90b0c';c.globalAlpha=p.subs.mode==='off'?0.35:1;c.fillRect(x0,sy+2,w-1,sh-4);c.globalAlpha=1;c.fillStyle='#fff';c.save();c.beginPath();c.rect(x0,sy,w-2,sh);c.clip();c.fillText(r.g.text,x0+3,sy+sh/2);c.restore()});
  const [oy,oh]=rows.text;(p.overlays||[]).forEach(o=>{const x0=X(o.t0),w=Math.max(3,(o.t1-o.t0)*z);c.fillStyle='#105572';c.fillRect(x0,oy+2,w-1,oh-4);c.fillStyle='#fff';c.save();c.beginPath();c.rect(x0,oy,w-2,oh);c.clip();c.fillText(o.text,x0+3,oy+oh/2);c.restore()});
  const [my,mh]=rows.music;if(p.music){c.fillStyle='#5b4a8a';c.fillRect(X(0),my+2,total*z,mh-4);c.fillStyle='#fff';c.fillText(p.music.name,X(0)+4,my+mh/2)}
  S.tlRows=rows;S.tlX=X;playhead()}
function playhead(){const cv=$('v204tlc');if(!cv||!S.tlX)return;let ph=$('v204ph');const host=$('v204tls');if(!host)return;if(!ph){ph=document.createElement('div');ph.id='v204ph';ph.className='v204ph';host.appendChild(ph)}ph.style.left=S.tlX(S.t)+'px';ph.style.height=cv.style.height;
  if(S.playing){const x=S.tlX(S.t);if(x>host.scrollLeft+host.clientWidth-40||x<host.scrollLeft+HEAD)host.scrollLeft=x-HEAD-20}}
// pointer on the timeline: ruler and empty space seek; clip edges trim; a clip body drags to a new place; subtitles move and stretch
function tlHit(e){const cv=$('v204tlc');const r=cv.getBoundingClientRect();const kx=(parseFloat(cv.style.width)||r.width)/(r.width||1),ky=(parseFloat(cv.style.height)||r.height)/(r.height||1);const x=(e.clientX-r.left)*kx,y=(e.clientY-r.top)*ky;const t=(x-HEAD)/S.zoom;const p=P();const {L}=lay(p);const row=Object.entries(S.tlRows||{}).find(([k,[yy,h]])=>y>=yy&&y<=yy+h);return {x,y,t,row:row&&row[0],p,L}}
let TD=null;
document.addEventListener('pointerdown',e=>{if(e.target.id!=='v204tlc'||!S.p)return;const h=tlHit(e);e.preventDefault();const edge=6/S.zoom;
  if(h.row==='video'){const x=h.L.find(o=>h.t>=o.start&&h.t<o.end);if(x){if(e.shiftKey||e.metaKey||e.ctrlKey){S.sel.has(x.c.id)?S.sel.delete(x.c.id):S.sel.add(x.c.id)}else{S.sel=new Set([x.c.id])}S.cur=x.c.id;
    const mode=h.t-x.start<edge?'in':x.end-h.t<edge?'out':'move';TD={mode,id:x.c.id,t0:h.t,in0:x.c.in,out0:x.c.out,i0:x.i,before:clone(core(S.p))};refreshSide();drawTL();if(mode==='move')seek(h.t);return}}
  if(h.row==='subs'){const r=tlSegs(h.p).find(o=>h.t>=o.a&&h.t<=o.b);if(r){S.segSel=r.g.id;const mode=h.t-r.a<edge?'sin':r.b-h.t<edge?'sout':'smove';TD={mode,id:r.g.id,t0:h.t,a0:r.g.t0,b0:r.g.t1,before:clone(core(S.p))};drawTL();return}}
  TD={mode:'seek'};seek(h.t)},true);
document.addEventListener('pointermove',e=>{if(!TD||!S.p)return;const h=tlHit(e);const d=h.t-(TD.t0||0);const p=S.p;
  if(TD.mode==='seek'){S.t=clamp(h.t,0,lay(p).total);if(PL)PL.seek(p,S.t).then(paint);playhead();return}
  const c=p.clips.find(x=>x.id===TD.id);const g=p.subs.segs.find(x=>x.id===TD.id);
  if(TD.mode==='in'&&c){c.in=clamp(TD.in0+d,0,c.out-0.1)}else if(TD.mode==='out'&&c){c.out=clamp(TD.out0+d,c.in+0.1,p.meta.dur||TD.out0+d)}else if(TD.mode==='move'&&c){const {L}=lay(p);const x=L.find(o=>h.t>=o.start&&h.t<o.end);if(x&&x.c.id!==c.id){const i=p.clips.indexOf(c);p.clips.splice(i,1);p.clips.splice(x.i,0,c);TD.moved=true}}
  else if(g&&TD.mode==='smove'){g.t0=Math.max(0,TD.a0+d);g.t1=g.t0+(TD.b0-TD.a0)}else if(g&&TD.mode==='sin'){g.t0=clamp(TD.a0+d,0,g.t1-0.1)}else if(g&&TD.mode==='sout'){g.t1=Math.max(g.t0+0.1,TD.b0+d)}else return;TD.changed=true;drawTL();paint()},true);
document.addEventListener('pointerup',()=>{if(!TD)return;const td=TD;TD=null;if(td.changed||td.moved){S.hist.push(td.before);S.fut=[];S.p.status='edited';logOp({kind:'manual',instr:({in:'חיתוך התחלה',out:'חיתוך סוף',move:'הזזת סצנה',smove:'הזזת כתובית',sin:'שינוי זמן כתובית',sout:'שינוי זמן כתובית'})[td.mode],status:'manual',clips:[td.id],before:td.before});persist();refresh();seek(S.t)}},true);
function refreshSide(){if(S.rendering){setTimeout(refreshSide,0);return}S.rendering=true;try{refreshSide0()}finally{S.rendering=false}}
function refreshSide0(){const l=document.querySelector('.v204left');if(l&&P().clips.length){const st=(l.querySelector('.v204list')||{}).scrollTop||0;l.outerHTML=clipsHtml();const nl=document.querySelector('.v204list');if(nl)nl.scrollTop=st}const pn=document.querySelector('.v204pan');if(pn){const st=pn.scrollTop;pn.innerHTML=panelHtml();pn.scrollTop=st}}

// ---------- events ----------
function curClip(){return clipById(S.cur,S.p)}
function selIds(){return S.sel.size?[...S.sel]:(S.cur?[S.cur]:[])}
async function act(a,b,e){const p=S.p;
  if(a==='open')return openProject(b.dataset.id);if(a==='src')return fromSource({name:b.dataset.n,url:b.dataset.u,from:b.dataset.f});
  if(a==='delp'){if(!confirm('למחוק את הפרויקט? הסרטון המקורי לא נמחק.'))return;const id=b.dataset.id;delete S.list[id];saveL(PKEY,S.list);const db=DB();if(db)try{db.collection('vstudio').doc(id).delete()}catch(x){}refresh();return}
  if(!p)return;const pos=S.t;const a2=at(pos,p);
  switch(a){
   case 'back':return closeProject();case 'play':return playToggle();case 'errx':S.err='';return refresh();
   case 'prevf':return seek(S.t-1/30);case 'nextf':return seek(S.t+1/30);
   case 'prevs':{const {L}=lay(p);const x=[...L].reverse().find(o=>o.start<S.t-0.05);return seek(x?x.start:0)}case 'nexts':{const {L}=lay(p);const x=L.find(o=>o.start>S.t+0.05);return x&&seek(x.start)}
   case 'cmp':S.compare=!S.compare;refresh();return;case 'fs':{const s=document.querySelector('.v204stg');if(s&&s.requestFullscreen)s.requestFullscreen().catch(()=>{});return}
   case 'pick':{const id=b.dataset.id;if(e.shiftKey||e.metaKey||e.ctrlKey){S.sel.has(id)?S.sel.delete(id):S.sel.add(id)}else S.sel=new Set();S.cur=id;const {L}=lay(p);const x=L.find(o=>o.c.id===id);refreshSide();drawTL();if(x)seek(x.start);return}
   case 'up':case 'down':{const id=b.dataset.id;edit(a==='up'?'הזזת סצנה למעלה':'הזזת סצנה למטה',q=>{const i=q.clips.findIndex(c=>c.id===id);const j=i+(a==='up'?-1:1);if(i<0||j<0||j>=q.clips.length)return;[q.clips[i],q.clips[j]]=[q.clips[j],q.clips[i]]});return}
   case 'split':{if(!a2)return;const c=a2.x.c,st=c.in+a2.local;if(st<c.in+0.1||st>c.out-0.1){toastS('אי אפשר לפצל כל כך קרוב לקצה');return}edit('פיצול סצנה',q=>applyOps(q,[{op:'split',clip:c.id,at:st}]));return}
   case 'trimin':{if(!a2)return;const c=a2.x.c,st=c.in+a2.local;edit('חיתוך התחלה',q=>{const cc=q.clips.find(x=>x.id===c.id);if(cc&&cc.out-st>0.1)cc.in=st});return}
   case 'trimout':{if(!a2)return;const c=a2.x.c,st=c.in+a2.local;edit('חיתוך סוף',q=>{const cc=q.clips.find(x=>x.id===c.id);if(cc&&st-cc.in>0.1)cc.out=st});return}
   case 'merge':{const c=curClip();if(!c)return;const miss=[];edit('איחוד סצנות',q=>miss.push(...applyOps(q,[{op:'merge',clip:c.id}])));if(miss.length)toastS(miss[0]);return}
   case 'dupc':{const ids=selIds();edit('שכפול סצנה',q=>ids.forEach(id=>{const i=q.clips.findIndex(c=>c.id===id);if(i>=0)q.clips.splice(i+1,0,Object.assign(clone(q.clips[i]),{id:uid('c'),name:q.clips[i].name+' (עותק)'}))}));return}
   case 'delc':{const ids=selIds();if(!ids.length)return;if(ids.length>=p.clips.length){toastS('צריך להשאיר לפחות סצנה אחת');return}edit('מחיקת סצנה',q=>{q.clips=q.clips.filter(c=>!ids.includes(c.id))});S.sel=new Set();S.cur=(S.p.clips[0]||{}).id;return seek(Math.min(S.t,lay(S.p).total))}
   case 'notes':return notes();case 'tab':S.tab=b.dataset.t;refreshSide();document.querySelectorAll('.v204tabs [role=tab]').forEach(x=>x.setAttribute('aria-selected',x.dataset.t===S.tab));return;
   case 'chip':{const ta=document.querySelector('.v204 [data-v204="instr"]');if(ta){ta.value=b.textContent;ta.focus()}return}
   case 'pv':if(S.pv){S.pv=null;refresh();seek(S.t)}else previewProp();return;case 'acc':return acceptProp();case 'rej':return rejectProp();
   case 'adjreset':{const ids=selIds();edit('איפוס צבע',q=>ids.forEach(id=>{const c=q.clips.find(x=>x.id===id);if(c)c.adj={exp:0,con:0,sat:0,temp:0}}));return}
   case 'smode':edit('מצב כתוביות',q=>{q.subs.mode=b.dataset.m});return;case 'stt':return transcribe();
   case 'segadd':{if(!a2)return;const st=a2.x.c.in+a2.local;edit('כתובית חדשה',q=>{q.subs.segs.push({id:uid('s'),t0:+st.toFixed(2),t1:+(st+2).toFixed(2),text:'כתובית חדשה'});if(q.subs.mode==='off')q.subs.mode='manual'});return}
   case 'segdel':edit('מחיקת כתובית',q=>{q.subs.segs=q.subs.segs.filter(g=>g.id!==b.dataset.id)});return;
   case 'segjump':{const r=tlSegs(p).find(o=>o.g.id===b.dataset.id);if(r)seek(r.a+0.01);return}
   case 'scol':edit('צבע כתוביות',q=>{q.subs.color=b.dataset.c},{learn:null});return;
   case 'srt':return download((p.name||'subs')+'.srt',subFile('srt'));case 'vtt':return download((p.name||'subs')+'.vtt',subFile('vtt'),'text/vtt;charset=utf-8');
   case 'cutp':{const ids=selIds();const miss=[];edit('חיתוך שתיקות',q=>miss.push(...applyOps(q,[{op:'cut_pauses',clips:ids,min_gap:0.6}])),{learn:'pace:tighter'});if(miss.length)toastS(miss[0]);return seek(Math.min(S.t,lay(S.p).total))}
   case 'nomus':edit('הסרת מוזיקה',q=>{q.music=null});return;
   case 'ovadd':edit('טקסט על המסך',q=>{q.overlays.push({id:uid('o'),text:'טקסט חדש',t0:+S.t.toFixed(2),t1:+(S.t+3).toFixed(2),x:0.5,y:0.18,size:1,color:'#ffffff',bg:'none'})},{learn:'overlay:more'});return;
   case 'ovdel':edit('מחיקת טקסט',q=>{q.overlays=q.overlays.filter(o=>o.id!==b.dataset.id)});return;
   case 'ovc':edit('צבע טקסט',q=>{const o=q.overlays.find(x=>x.id===b.dataset.id);if(o)o.color=b.dataset.c});return;
   case 'ovbg':edit('רקע לטקסט',q=>{const o=q.overlays.find(x=>x.id===b.dataset.id);if(o)o.bg=o.bg&&o.bg!=='none'?'none':'#07293a'});return;
   case 'xgo':return doExport({res:(document.querySelector('[data-v204="xres"]')||{}).value,fps:+((document.querySelector('[data-v204="xfps"]')||{}).value||30),subs:(document.querySelector('[data-v204="xsub"]')||{checked:true}).checked});
   case 'xcancel':if(S.exp&&S.exp.cancel)S.exp.cancel();return;case 'xsave':return saveExport();
   case 'undo':return undo();case 'redo':return redo();
   case 'vsave':{const label=prompt('שם לגרסה:','גרסה '+(p.versions.length+1));if(label==null)return;p.versions.unshift({id:uid('v'),at:Date.now(),label:label.slice(0,40)||'גרסה',state:clone(core(p))});if(p.versions.length>20)p.versions.length=20;logOp({kind:'manual',instr:'שמירת גרסה: '+label,status:'manual'});persist();refreshSide();return}
   case 'vres':{const v=p.versions.find(x=>x.id===b.dataset.id);if(!v)return;const before=clone(core(p));hist();setCore(v.state);logOp({kind:'manual',instr:'שחזור גרסה: '+v.label,status:'manual',before});persist();refresh();return seek(0)}
   case 'orig':{if(!p.orig||!confirm('לחזור לסרטון המקורי? כל העריכות יישמרו בהיסטוריה ואפשר לבטל.'))return;const before=clone(core(p));hist();setCore(p.orig);logOp({kind:'manual',instr:'חזרה למקור',status:'manual',before});persist();refresh();return seek(0)}
   case 'opres':{const o=p.ops.find(x=>x.id===b.dataset.id);if(!o||!o.before)return;const before=clone(core(p));hist();setCore(o.before);logOp({kind:'manual',instr:'חזרה למצב שלפני: '+(o.instr||''),status:'manual',before});persist();refresh();return seek(Math.min(S.t,lay(S.p).total))}
   case 'pdel':delete PREF.score[b.dataset.k];savePrefs();refreshSide();return;case 'xdel':PREF.explicit.splice(+b.dataset.i,1);savePrefs();refreshSide();return;
   case 'preset':if(!confirm('לאפס את כל ההעדפות שנלמדו?'))return;PREF.score={};PREF.proj={};PREF.explicit=[];savePrefs();refreshSide();return;
   case 'zin':S.zoom=Math.min(400,S.zoom*1.4);drawTL();return;case 'zout':S.zoom=Math.max(4,S.zoom/1.4);drawTL();return}}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('.v204 [data-v204]');if(!b)return;const a=b.dataset.v204;if(['file','ck','instr','name','in','out','trans','sstyle','segtx','segt0','segt1','subin','mus','mute','enh','learn','xin','ovtx','ovt0','ovt1','ovy','ovs','pname','rate','fmt','xres','xfps','xsub','hfil','refile'].includes(a))return;if(b.tagName==='LABEL'||b.tagName==='FORM')return;e.preventDefault();act(a,b,e)},true);
document.addEventListener('change',async e=>{const t=e.target;if(!t.closest||!t.closest('.v204')||!t.dataset||!t.dataset.v204)return;const a=t.dataset.v204;const p=S.p;
  if(a==='file'){const f=t.files&&t.files[0];t.value='';return fromFile(f)}if(!p)return;
  if(a==='refile'){const f=t.files&&t.files[0];t.value='';if(f){LOCAL[p.id]=URL.createObjectURL(f);if(PL){PL.destroy();PL=null;PLurl=''}refresh();seek(S.t)}return}
  if(a==='ck'){t.checked?S.sel.add(t.dataset.id):S.sel.delete(t.dataset.id);refreshSide();drawTL();return}
  if(a==='name'){const c=curClip();if(c){const v=t.value.slice(0,40);edit('שם סצנה',q=>{const cc=q.clips.find(x=>x.id===c.id);if(cc)cc.name=v})}return}
  if(a==='pname'){p.name=t.value.slice(0,60)||p.name;persist();return}
  if(a==='in'||a==='out'){const c=curClip();if(!c)return;const v=+t.value;edit(a==='in'?'שינוי התחלה':'שינוי סוף',q=>{const cc=q.clips.find(x=>x.id===c.id);if(!cc)return;if(a==='in')cc.in=clamp(v,0,cc.out-0.1);else cc.out=clamp(v,cc.in+0.1,q.meta.dur||v)});return seek(S.t)}
  if(a==='trans'){const ids=selIds();edit('מעבר',q=>ids.forEach(id=>{const c=q.clips.find(x=>x.id===id);if(c)c.trans.type=t.value}),{learn:'trans:'+t.value});return}
  if(a==='sstyle'){edit('סגנון כתוביות',q=>{q.subs.style=t.value},{learn:'subst:'+t.value});return}
  if(a==='segtx'||a==='segt0'||a==='segt1'){const id=t.dataset.id;const v=a==='segtx'?String(t.value).replace(/\s[—–-]\s/g,', '):+t.value;edit('עריכת כתובית',q=>{const g=q.subs.segs.find(x=>x.id===id);if(!g)return;if(a==='segtx')g.text=v;else if(a==='segt0')g.t0=clamp(v,0,g.t1-0.05);else g.t1=Math.max(g.t0+0.05,v)},{quiet:a==='segtx'});if(a==='segtx')refreshSide();return}
  if(a==='subin'){const f=t.files&&t.files[0];t.value='';if(!f)return;const segs=fromTimeline(p,parseSub(await f.text()));if(!segs.length){toastS('לא מצאתי כתוביות בקובץ');return}edit('ייבוא כתוביות',q=>{q.subs.segs=segs;if(q.subs.mode==='off')q.subs.mode='manual'});toastS(segs.length+' כתוביות יובאו');return}
  if(a==='mus'){const f=t.files&&t.files[0];t.value='';if(!f)return;edit('מוזיקת רקע',q=>{q.music={name:f.name,url:URL.createObjectURL(f),vol:0.2}});return}
  if(a==='mute'){const ids=selIds();edit('השתקה',q=>ids.forEach(id=>{const c=q.clips.find(x=>x.id===id);if(c)c.mute=t.checked}));return}
  if(a==='enh'){edit('שיפור דיבור',q=>{q.audio.enhance=t.checked},{learn:t.checked?'enh:on':null});return}
  if(a==='learn'){PREF.learn=t.checked;savePrefs();return}if(a==='hfil'){S.hfil=t.checked;refreshSide();return}
  if(a==='rate'){S.rate=+t.value;if(PL)PL.rate(S.rate);return}if(a==='fmt'){edit('יחס מסך',q=>{q.fmt=t.value});return}
  if(a==='ovtx'||a==='ovt0'||a==='ovt1'||a==='ovy'||a==='ovs'){const id=t.dataset.id;edit('עריכת טקסט',q=>{const o=q.overlays.find(x=>x.id===id);if(!o)return;if(a==='ovtx')o.text=String(t.value).replace(/\s[—–-]\s/g,', ');else if(a==='ovt0')o.t0=Math.max(0,+t.value);else if(a==='ovt1')o.t1=Math.max(o.t0+0.2,+t.value);else if(a==='ovy')o.y=+t.value;else o.size=+t.value},{quiet:true});return}
  if(t.dataset.v204r){}},true);
// sliders: live while dragging, one undo step and one log line when released
let slideBefore=null;
document.addEventListener('input',e=>{const t=e.target;if(!t.dataset||!t.dataset.v204r||!t.closest('.v204'))return;const k=t.dataset.v204r,v=+t.value;const p=S.p;if(!p)return;if(!slideBefore)slideBefore=clone(core(p));const ids=selIds();
  const o=t.closest('label')&&t.closest('label').querySelector('output');if(o)o.textContent=Math.abs(+t.max)<=1.01&&+t.min<0?Math.round(v*100):v;
  if(k.startsWith('adj.')||k.startsWith('frame.')||k.startsWith('trans.')){const [g,f]=k.split('.');ids.forEach(id=>{const c=p.clips.find(x=>x.id===id);if(c)c[g][f]=v})}
  else if(['vol','fadeIn','fadeOut'].includes(k))ids.forEach(id=>{const c=p.clips.find(x=>x.id===id);if(c)c[k]=v});else if(k.startsWith('subs.'))p.subs[k.slice(5)]=v;else if(k==='mvol'&&p.music)p.music.vol=v;paint();if(k.startsWith('trans.'))drawTL()},true);
document.addEventListener('change',e=>{const t=e.target;if(!t.dataset||!t.dataset.v204r||!t.closest('.v204')||!slideBefore)return;const before=slideBefore;slideBefore=null;const k=t.dataset.v204r;const now=core(S.p);S.hist.push(before);S.fut=[];S.p.status='edited';
  const lab=(ADJ.find(a=>'adj.'+a[0]===k)||[])[1]||({'frame.scale':'זום','frame.x':'מיקום','frame.y':'מיקום','trans.dur':'משך מעבר',vol:'עוצמה',fadeIn:'כניסה הדרגתית',fadeOut:'יציאה הדרגתית','subs.size':'גודל כתוביות','subs.y':'גובה כתוביות',mvol:'עוצמת מוזיקה'})[k]||k;
  logOp({kind:'manual',instr:lab,status:'manual',clips:selIds(),before});
  // a manual change is a weak signal; it becomes a preference only if it keeps coming back
  let key=null;const bc=before.clips.find(c=>c.id===selIds()[0]),nc=now.clips.find(c=>c.id===selIds()[0]);if(k.startsWith('adj.')&&bc&&nc){const f=k.slice(4);if(Math.abs(nc.adj[f]-bc.adj[f])>0.04)key=f+':'+(nc.adj[f]>bc.adj[f]?'up':'down')}
  if(k==='subs.size')key=now.subs.size<before.subs.size?'subs:smaller':'subs:bigger';if(k==='subs.y')key=now.subs.y<before.subs.y?'subs:higher':'subs:lower';if(k==='frame.scale'&&nc&&nc.frame.scale>1.05)key='scale:zoom';if(key)learn(key,0.5);persist();refreshSide();drawTL()},true);
document.addEventListener('submit',e=>{const f=e.target;if(!f.closest||!f.closest('.v204'))return;e.preventDefault();if(f.dataset.v204==='askf'){const ta=f.querySelector('textarea');const v=ta.value;ask(v)}if(f.dataset.v204==='xadd'){const i=f.querySelector('input');const v=String(i.value||'').trim();if(v){PREF.explicit.push(v.slice(0,140));savePrefs();refreshSide()}}},true);
// drag and drop: files on the library, scenes in the list
document.addEventListener('dragover',e=>{const z=e.target.closest&&e.target.closest('.v204 [data-v204drop],.v204 .v204list');if(z){e.preventDefault()}},true);
document.addEventListener('dragstart',e=>{const li=e.target.closest&&e.target.closest('.v204 .v204sc');if(li){S.dragId=li.dataset.id;e.dataTransfer.effectAllowed='move';try{e.dataTransfer.setData('text/plain',li.dataset.id)}catch(x){}}},true);
document.addEventListener('drop',e=>{const z=e.target.closest&&e.target.closest('.v204 [data-v204drop]');if(z){e.preventDefault();e.stopPropagation();const f=[...(e.dataTransfer.files||[])].find(x=>/^video\//.test(x.type));if(f)fromFile(f);return}
  const li=e.target.closest&&e.target.closest('.v204 .v204sc');if(li&&S.dragId&&S.dragId!==li.dataset.id){e.preventDefault();const from=S.dragId,to=li.dataset.id;S.dragId=null;edit('הזזת סצנה',q=>{const i=q.clips.findIndex(c=>c.id===from);const [c]=q.clips.splice(i,1);const j=q.clips.findIndex(x=>x.id===to);q.clips.splice(j+(i<=j?1:0),0,c)})}},true);
window.addEventListener('keydown',e=>{if(typeof APP==='undefined'||APP.view!=='vstudio'||!S.p)return;const tag=(e.target.tagName||'').toUpperCase();if(['INPUT','TEXTAREA','SELECT'].includes(tag))return;
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redo():undo();return}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='y'){e.preventDefault();redo();return}
  const k=e.key;if(k===' '){e.preventDefault();playToggle()}else if(k==='ArrowRight'){e.preventDefault();seek(S.t+(e.shiftKey?1:1/30))}else if(k==='ArrowLeft'){e.preventDefault();seek(S.t-(e.shiftKey?1:1/30))}
  else if(k==='s'||k==='S'||k==='ד'){e.preventDefault();act('split')}else if(k==='j'||k==='J'||k==='ח'){act('prevs')}else if(k==='l'||k==='L'||k==='ך'){act('nexts')}else if(k==='Delete'){act('delc')}},true);
window.addEventListener('resize',()=>{if(S.p&&typeof APP!=='undefined'&&APP.view==='vstudio'){paint();drawTL()}});

// ---------- the tab in the engine ----------
try{const grp=VIEWS.find(g=>g[0]==='תוכן');if(grp&&!grp[1].some(v=>v[0]==='vstudio'))grp[1].push(['vstudio','סטודיו עריכה','play']);VTITLE.vstudio=['סטודיו עריכה','כל סרטון כפרויקט: סצנות, ציר זמן, כתוביות ועוזר AI שלומד את הטעם שלך']}catch(e){}
try{render=(f=>function(){const v=typeof APP!=='undefined'?APP.view:'';if(v!=='vstudio'){if(S.playing)stopPlay();return f.apply(this,arguments)}renderNav();const [t,s]=VTITLE[v];$('vt').textContent=t;$('vs').textContent=s;document.querySelectorAll('.wrap > section').forEach(sec=>sec.classList.add('view-hidden'));
  $('vact').innerHTML='';const root=$('appviews');if(root){root.innerHTML=pageHtml();if(S.p){paint();drawTL()}}try{window.__v99&&__v99.ensureNav()}catch(e){}if(!S.pulled){S.pulled=1;pull().then(()=>{if(!S.p)refresh()})}})(render)}catch(e){console.warn('v204 view',e)}
window.__v204={S,P,lay,at,applyOps,validate,aiPrompt,opText,rules,learn,keysOf,PREF:()=>PREF,openProject,fromFile,fromSource,analyze,gaps,subFile,parseSub,fromTimeline,doExport,seek,playToggle,stopPlay,refresh,ask,acceptProp,rejectProp,previewProp,transcribe,undo,redo,AUD,tlSegs,compose,outDims};
})();
/*V204:END*/
