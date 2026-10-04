// ================= V127 · video tray and brand kit: drop several videos at once into a tray (order, trim, mute), dress them
//                   in the Kurkoos kit (palette, font, logo plate, lower third, frame, logo or headline intro, logo or call to
//                   action outro, background music that dips under speech, 9:16 / 1:1 / 16:9), see it live, export a branded
//                   file to download right in the browser, or send each one (or all joined) to the professional editor with the kit =================
(function(){
const KEY='vid_kit';
const PAL={navy:{n:'כחול לילה',bg:'#07293a',fg:'#ffffff',acc:'#a90b0c',logo:'white'},teal:{n:'טורקיז',bg:'#105572',fg:'#ffffff',acc:'#8fb6c8',logo:'white'},
 paper:{n:'נייר',bg:'#f7f8fa',fg:'#07293a',acc:'#a90b0c',logo:'navy'},mist:{n:'ערפל',bg:'#8fb6c8',fg:'#07293a',acc:'#a90b0c',logo:'navy'}};
const FONTS=[['Almoni','אלמוני'],['Heebo','היבו'],['Rubik','רוביק']];
const FMT={'9:16':[1080,1920],'1:1':[1080,1080],'16:9':[1920,1080]};
const DEF={pal:'navy',font:'Almoni',logo:true,lpos:'tl',lsize:'m',lower:true,lname:'קבוצת קורקוס',ltitle:'',frame:'none',intro:'logo',introText:'',outro:'logo',cta:'',
 fmt:'9:16',fit:'fill',musicVol:0.22,duck:true,mode:'each',quality:'hd'};
let KIT=(()=>{try{return Object.assign({},DEF,JSON.parse(localStorage.getItem(KEY)||'{}'))}catch(e){return Object.assign({},DEF)}})();
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(KIT))}catch(e){}};
const T={items:[],sel:null,music:null,busy:null,outs:[],pv:{t:0,playing:false,raf:0,last:0}};
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const toastSafe=m=>{try{toast(m)}catch(e){console.log(m)}};
const uid=()=>'v'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const fmtT=s=>{s=Math.max(0,s||0);const m=Math.floor(s/60),r=Math.floor(s%60);return m+':'+String(r).padStart(2,'0')};
const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
// closed-form spring, 0 before t=0
const spring=(t,f=2.4,z=.72)=>{if(t<=0)return 0;const w=2*Math.PI*f,wd=w*Math.sqrt(1-z*z);return 1-Math.exp(-z*w*t)*(Math.cos(wd*t)+(z*w/wd)*Math.sin(wd*t))};

// ---------- logos (the system's own logo, two colourways) ----------
const LOGO={};
function logos(){if(LOGO.p)return LOGO.p;const mk=(k,c)=>new Promise(r=>{const i=new Image();i.onload=()=>{LOGO[k]=i;r()};i.onerror=()=>r();
  try{i.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(LOGO_SVG(c))}catch(e){r()}});
 LOGO.p=Promise.all([mk('white',{fg:'#ffffff',o1:'#8fb6c8',o2:'#dbe8ee'}),mk('navy',{fg:'#07293a',o1:'#a90b0c',o2:'#105572'})]);return LOGO.p}
const fontsReady=()=>Promise.all(FONTS.flatMap(([f])=>[document.fonts.load(`800 40px "${f}"`,'קורקוס'),document.fonts.load(`500 40px "${f}"`,'קורקוס')])).catch(()=>{});

// ---------- the tray ----------
function addFiles(files){const vids=[...files].filter(f=>/^video\//.test(f.type)||/\.(mp4|mov|webm|m4v)$/i.test(f.name||''));if(!vids.length){toastSafe('לא נמצאו סרטונים בקבצים שנגררו');return}
 vids.forEach(f=>{const it={id:uid(),file:f,url:URL.createObjectURL(f),name:(f.name||'סרטון').replace(/\.[^.]+$/,'').slice(0,60),size:f.size,dur:0,w:0,h:0,in:0,out:0,mute:false,thumb:''};T.items.push(it);probe(it)});
 if(!T.sel)T.sel=T.items[0].id;toastSafe(vids.length>1?`${vids.length} סרטונים נוספו למגש`:'הסרטון נוסף למגש');refresh()}
function probe(it){const v=document.createElement('video');v.muted=true;v.preload='auto';v.playsInline=true;v.src=it.url;
 v.onloadedmetadata=()=>{it.dur=v.duration||0;it.out=it.dur;it.w=v.videoWidth;it.h=v.videoHeight;v.currentTime=Math.min(0.6,it.dur/2)};
 v.onseeked=()=>{try{const c=document.createElement('canvas'),k=160/Math.max(it.w,it.h);c.width=Math.round(it.w*k);c.height=Math.round(it.h*k);c.getContext('2d').drawImage(v,0,0,c.width,c.height);it.thumb=c.toDataURL('image/jpeg',.7)}catch(e){}v.removeAttribute('src');v.load();refresh()};
 v.onerror=()=>{it.bad=true;refresh()}}
const selItem=()=>T.items.find(x=>x.id===T.sel)||T.items[0]||null;

// ---------- the compositor: one frame of the branded sequence, a pure function of time ----------
function dims(it,scale){let [W,H]=FMT[KIT.fmt]||[0,0];if(!W){const w=it&&it.w||1080,h=it&&it.h||1920,k=1920/Math.max(w,h);W=Math.round(w*k/2)*2;H=Math.round(h*k/2)*2}
 if(KIT.quality==='fast'){W=Math.round(W*2/3/2)*2;H=Math.round(H*2/3/2)*2}return [Math.round(W*scale/2)*2,Math.round(H*scale/2)*2]}
const INTRO=()=>KIT.intro==='none'?0:KIT.intro==='headline'&&KIT.introText.trim()?Math.max(1.6,0.45*KIT.introText.trim().split(/\s+/).length+0.9):1.8;
const OUTRO=()=>KIT.outro==='none'?0:KIT.outro==='cta'&&KIT.cta.trim()?2.6:2;
function seqOf(items){const s={intro:INTRO(),clips:[],outro:OUTRO()};let t=s.intro;items.forEach(it=>{const d=Math.max(0.1,(it.out||it.dur)-(it.in||0));s.clips.push({it,start:t,dur:d});t+=d});s.total=t+s.outro;s.clipsEnd=t;return s}
function phase(seq,t){if(t<seq.intro)return {p:'intro',lt:t};for(const c of seq.clips)if(t<c.start+c.dur)return {p:'clip',lt:t-c.start,c};return {p:'outro',lt:t-seq.clipsEnd}}
function font(w,px){return `${w} ${Math.round(px)}px "${KIT.font}", Heebo, Arial, sans-serif`}
function rr(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath()}
function safe(W,H){const v=H>W*1.3;return {top:v?H*0.16:H*0.06,bottom:v?H*0.18:H*0.07,side:W*0.06}}
function fitText(ctx,txt,wt,maxW,maxPx){let px=maxPx;ctx.font=font(wt,px);const w=ctx.measureText(txt).width;if(w>maxW)px*=maxW/w;return px}
function drawLogo(ctx,variant,cx,cy,w,alpha){const i=LOGO[variant];if(!i)return;const h=w/4;ctx.globalAlpha=alpha;ctx.drawImage(i,cx-w/2,cy-h/2,w,h);ctx.globalAlpha=1}
function drawVideo(ctx,v,W,H,pal){
 const vw=v.videoWidth||16,vh=v.videoHeight||9;
 if(KIT.fit==='frame'){ctx.fillStyle=pal.bg;ctx.fillRect(0,0,W,H);
  const k=Math.min(W*0.9/vw,H*0.72/vh),w=vw*k,h=vh*k,x=(W-w)/2,y=(H-h)/2+H*0.03;ctx.save();rr(ctx,x,y,w,h,W*0.03);ctx.clip();ctx.drawImage(v,x,y,w,h);ctx.restore();return}
 const k=Math.max(W/vw,H/vh),w=vw*k,h=vh*k;ctx.drawImage(v,(W-w)/2,(H-h)/2,w,h)}
function drawFrame(ctx,W,H,seq,t,getVideo){
 const pal=PAL[KIT.pal]||PAL.navy,S=safe(W,H),ph=phase(seq,t);ctx.direction='rtl';ctx.textBaseline='middle';ctx.textAlign='center';ctx.globalAlpha=1;
 if(ph.p==='intro'||ph.p==='outro'){
  ctx.fillStyle=pal.bg;ctx.fillRect(0,0,W,H);const u=ph.lt,lw=W*0.56,cy=H*0.45;
  if(ph.p==='intro'&&KIT.intro==='headline'&&KIT.introText.trim()){
   // words land one by one, whole, with a short rise; the accent dot closes the line
   const words=KIT.introText.trim().split(/\s+/),maxW=W*0.82;let px=Math.min(W,H)*0.17,lines;
   // wrap into at most three lines, all at one size, as big as fits
   for(let k=0;k<30;k++){ctx.font=font(800,px);const gap=px*0.26;lines=[[]];let lw=0;
    words.forEach(w=>{const ww=ctx.measureText(w).width;if(lines[lines.length-1].length&&lw+gap+ww>maxW){lines.push([]);lw=0}lw+=(lines[lines.length-1].length?gap:0)+ww;lines[lines.length-1].push(w)});
    const widest=Math.max(...lines.map(l=>l.reduce((a,w)=>a+ctx.measureText(w).width,0)+gap*(l.length-1)));if(lines.length<=3&&widest<=maxW)break;px*=0.92}
   ctx.font=font(800,px);const gap=px*0.26,lh=px*1.12,y0=cy-(lines.length-1)*lh/2;let i=0,endX=W/2,endY=cy;
   lines.forEach((l,li)=>{const ws=l.map(w=>ctx.measureText(w).width),tot=ws.reduce((a,b)=>a+b,0)+gap*(l.length-1);let x=W/2+tot/2;const y=y0+li*lh;
    l.forEach((w,k)=>{const at=0.15+i*0.42,a=spring(u-at,2.6,.6),s=1.18-0.18*a;ctx.save();ctx.globalAlpha=clamp((u-at)/0.08);ctx.translate(x-ws[k]/2,y+px*0.2*(1-a));ctx.scale(s,s);ctx.fillStyle=pal.fg;ctx.fillText(w,0,0);ctx.restore();x-=ws[k]+gap;i++});endX=x+gap;endY=y});
   const d=spring(u-0.15-words.length*0.42,3,.5);if(d>0){ctx.fillStyle=pal.acc;ctx.beginPath();ctx.arc(endX-px*0.14,endY+px*0.28,px*0.1*d,0,7);ctx.fill()}
   drawLogo(ctx,pal.logo,W/2,H-S.bottom-W*0.06,W*0.26,clamp((u-0.5)/0.3));return}
  const k=spring(u-0.05,2,.7),out=ph.p==='intro'?0:0;
  ctx.save();ctx.translate(W/2,cy);ctx.scale(0.86+0.14*k,0.86+0.14*k);drawLogo(ctx,pal.logo,0,0,lw,clamp(u/0.25));ctx.restore();
  const ln=spring(u-0.4,1.8,1)*lw*0.5;ctx.fillStyle=pal.acc;ctx.fillRect(W/2+lw*0.25-ln,cy+lw*0.2,ln,Math.max(3,W*0.006));
  const txt=ph.p==='intro'?KIT.introText.trim():(KIT.outro==='cta'?KIT.cta.trim():'');
  if(txt){const px=fitText(ctx,txt,800,W*0.84,W*0.075),a=spring(u-0.6,2.4,.8);ctx.globalAlpha=clamp((u-0.6)/0.12);ctx.fillStyle=pal.fg;ctx.font=font(800,px);ctx.fillText(txt,W/2,cy+lw*0.2+px*1.3+px*0.4*(1-a));ctx.globalAlpha=1}
  return}
 const v=getVideo(ph.c.it);ctx.fillStyle='#000';ctx.fillRect(0,0,W,H);if(v&&v.readyState>=2)drawVideo(ctx,v,W,H,pal);
 const lt=ph.lt;
 if(KIT.frame==='thin'){const b=W*0.022;ctx.strokeStyle=pal.bg;ctx.lineWidth=b;ctx.strokeRect(b/2,b/2,W-b,H-b)}
 if(KIT.frame==='bar'){const bh=Math.max(H*0.06,W*0.1);ctx.fillStyle=pal.bg;ctx.fillRect(0,H-bh,W,bh);ctx.fillStyle=pal.acc;ctx.fillRect(0,H-bh,W,Math.max(3,W*0.005));drawLogo(ctx,pal.logo,S.side+W*0.13,H-bh/2,W*0.24,1);
  if(KIT.lname){ctx.textAlign='right';ctx.fillStyle=pal.fg;ctx.font=font(700,bh*0.34);ctx.fillText(KIT.lname,W-S.side,H-bh/2);ctx.textAlign='center'}}
 if(KIT.logo&&!(KIT.fit==='frame')&&KIT.frame!=='bar'){
  const lw=W*({s:0.2,m:0.27,l:0.36}[KIT.lsize]||0.27),lh=lw/4,pad=lw*0.09,pw=lw+pad*2,phh=lh+pad*2;
  const right=KIT.lpos[1]==='r',top=KIT.lpos[0]==='t',x=right?W-S.side-pw:S.side,y=top?S.top:H-S.bottom-phh-(KIT.lower?H*0.13:0);
  ctx.globalAlpha=0.9;ctx.fillStyle=pal.bg;rr(ctx,x,y,pw,phh,phh*0.22);ctx.fill();ctx.globalAlpha=1;drawLogo(ctx,pal.logo,x+pw/2,y+phh/2,lw,1)}
 if(KIT.fit==='frame')drawLogo(ctx,pal.logo,W/2,Math.max(S.top*0.75,H*0.08),W*0.4,1);
 if(KIT.lower&&KIT.lname.trim()&&KIT.frame!=='bar'){
  // lower third: slides in from the right after half a second, leaves after five
  const a=spring(lt-0.5,2.2,.78),o=spring(lt-Math.min(5,ph.c.dur-0.7),2.2,1),k=a-o;
  if(k>0.002){const n=KIT.lname.trim(),ti=KIT.ltitle.trim(),pn=W*0.052,pt=W*0.034;ctx.font=font(800,pn);const wn=ctx.measureText(n).width;ctx.font=font(500,pt);const wt=ti?ctx.measureText(ti).width:0;
   const pw=Math.max(wn,wt)+W*0.09,phh=ti?pn*1.25+pt*1.6:pn*1.9,x=W-S.side-pw+(1-k)*(pw+S.side),y=H-S.bottom-phh;
   ctx.globalAlpha=clamp(k*1.4)*0.92;ctx.fillStyle=pal.bg;rr(ctx,x,y,pw,phh,W*0.016);ctx.fill();ctx.globalAlpha=clamp(k*1.4);ctx.fillStyle=pal.acc;ctx.fillRect(x+pw-W*0.012,y,W*0.012,phh);
   ctx.textAlign='right';ctx.fillStyle=pal.fg;ctx.font=font(800,pn);ctx.fillText(n,x+pw-W*0.04,y+(ti?pn*0.85:phh/2));if(ti){ctx.font=font(500,pt);ctx.globalAlpha*=0.85;ctx.fillText(ti,x+pw-W*0.04,y+pn*1.25+pt*0.6)}ctx.textAlign='center';ctx.globalAlpha=1}}
}

// ---------- live preview (same compositor, half size) ----------
const PV={v:null,url:'',music:null};
function pvVideo(it){if(!PV.v){PV.v=document.createElement('video');PV.v.playsInline=true;PV.v.preload='auto';PV.v.muted=false;const re=()=>{if(!T.pv.playing)pvDraw()};PV.v.addEventListener('seeked',re);PV.v.addEventListener('loadeddata',re)}if(PV.url!==it.url){PV.url=it.url;PV.v.src=it.url}return PV.v}
function pvDraw(){const cv=document.getElementById('v127cv'),it=selItem();if(!cv||!it)return;const [W,H]=dims(it,0.5);if(cv.width!==W||cv.height!==H){cv.width=W;cv.height=H}
 const seq=seqOf([it]),t=clamp(T.pv.t,0,seq.total),ph=phase(seq,t),v=pvVideo(it);
 if(ph.p==='clip'&&!T.pv.playing){const want=(it.in||0)+ph.lt;if(Math.abs(v.currentTime-want)>0.04&&!v.seeking)v.currentTime=want}
 drawFrame(cv.getContext('2d'),W,H,seq,t,()=>v);
 const sl=document.getElementById('v127sl');if(sl){sl.max=seq.total.toFixed(2);if(document.activeElement!==sl)sl.value=t.toFixed(2)}
 const tl=document.getElementById('v127tl');if(tl)tl.textContent=`${fmtT(t)} / ${fmtT(seq.total)}`}
function pvPlay(on){const it=selItem();if(!it)return;T.pv.playing=on;const v=pvVideo(it);cancelAnimationFrame(T.pv.raf);
 if(!on){v.pause();if(PV.music)PV.music.pause();pvDraw();setPlayBtn();return}
 const seq=seqOf([it]);if(T.pv.t>=seq.total-0.05)T.pv.t=0;T.pv.last=performance.now();
 if(T.music){if(!PV.music){PV.music=new Audio(T.music.url);PV.music.loop=true}PV.music.volume=clamp(KIT.musicVol);PV.music.currentTime=T.pv.t%Math.max(1,PV.music.duration||60);PV.music.play().catch(()=>{})}
 const loop=now=>{if(!T.pv.playing)return;const ph=phase(seq,T.pv.t);
  if(ph.p==='clip'){if(v.paused){v.currentTime=(it.in||0)+ph.lt;v.muted=it.mute;v.play().catch(()=>{})}T.pv.t=ph.c.start+(v.currentTime-(it.in||0));if(v.currentTime>=(it.out||it.dur)-0.03||v.ended){v.pause();T.pv.t=seq.clipsEnd+0.001}}
  else{if(!v.paused)v.pause();T.pv.t+=(now-T.pv.last)/1000}
  T.pv.last=now;if(T.pv.t>=seq.total){T.pv.t=seq.total;pvPlay(false);return}pvDraw();T.pv.raf=requestAnimationFrame(loop)};
 setPlayBtn();T.pv.raf=requestAnimationFrame(loop)}
function setPlayBtn(){const b=document.querySelector('[data-v127="play"]');if(b)b.textContent=T.pv.playing?'השהיה':'ניגון'}

// ---------- export in the browser: canvas + audio graph into MediaRecorder ----------
function mime(){const c=['video/mp4;codecs=avc1.640028,mp4a.40.2','video/mp4;codecs=avc1.42E01F,mp4a.40.2','video/mp4','video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'];
 return c.find(m=>window.MediaRecorder&&MediaRecorder.isTypeSupported(m))||''}
async function exportSeq(items,name){
 await logos();await fontsReady();const [W,H]=dims(items[0],1),cv=document.createElement('canvas');cv.width=W;cv.height=H;const ctx=cv.getContext('2d');
 const seq=seqOf(items),AC=new (window.AudioContext||window.webkitAudioContext)(),dest=AC.createMediaStreamDestination();
 const vids=new Map(),an=AC.createAnalyser();an.fftSize=1024;const buf=new Float32Array(an.fftSize);
 for(const it of items){const v=document.createElement('video');v.src=it.url;v.playsInline=true;v.preload='auto';v.crossOrigin='anonymous';await new Promise(r=>{v.onloadeddata=r;v.onerror=r});
  const g=AC.createGain();g.gain.value=it.mute?0:1;try{AC.createMediaElementSource(v).connect(g)}catch(e){}g.connect(dest);g.connect(an);vids.set(it.id,v)}
 let mg=null,ms=null;if(T.music){try{const ab=await AC.decodeAudioData(await T.music.file.arrayBuffer());ms=AC.createBufferSource();ms.buffer=ab;ms.loop=true;mg=AC.createGain();mg.gain.value=0;ms.connect(mg);mg.connect(dest)}catch(e){toastSafe('לא הצלחתי לקרוא את קובץ המוזיקה, הייצוא ממשיך בלעדיה')}}
 const stream=cv.captureStream(30);dest.stream.getAudioTracks().forEach(tr=>stream.addTrack(tr));
 const mt=mime(),rec=new MediaRecorder(stream,mt?{mimeType:mt,videoBitsPerSecond:KIT.quality==='fast'?5e6:9e6,audioBitsPerSecond:192000}:{});const chunks=[];rec.ondataavailable=e=>{if(e.data&&e.data.size)chunks.push(e.data)};
 drawFrame(ctx,W,H,seq,0,it=>vids.get(it.id));const done=new Promise(r=>rec.onstop=r);rec.start(500);if(ms)ms.start();
 let t=0,last=performance.now(),cur=null;const vol=clamp(KIT.musicVol);
 await new Promise(resolve=>{const tick=()=>{if(T.busy&&T.busy.cancel){resolve();return}const now=performance.now(),ph=phase(seq,t);
   if(ph.p==='clip'){const it=ph.c.it,v=vids.get(it.id);if(cur!==it.id){cur=it.id;v.currentTime=it.in||0;v.play().catch(()=>{})}
    if(!v.seeking&&!v.paused)t=ph.c.start+Math.max(0,v.currentTime-(it.in||0));if(v.currentTime>=(it.out||it.dur)-0.02||v.ended){v.pause();t=ph.c.start+ph.c.dur+0.0005}}
   else{vids.forEach(v=>{if(!v.paused)v.pause()});t+=(now-last)/1000}
   last=now;
   if(mg){let target=ph.p==='clip'?vol:Math.min(0.9,vol*2.2);if(KIT.duck&&ph.p==='clip'){an.getFloatTimeDomainData(buf);let s=0;for(let i=0;i<buf.length;i+=4)s+=buf[i]*buf[i];if(Math.sqrt(s/(buf.length/4))>0.02)target=vol*0.45}
    if(t>seq.total-0.8)target*=clamp((seq.total-t)/0.8);mg.gain.setTargetAtTime(target,AC.currentTime,0.08)}
   drawFrame(ctx,W,H,seq,Math.min(t,seq.total-0.001),it=>vids.get(it.id));
   if(T.busy){T.busy.p=clamp(t/seq.total);updBusy()}
   if(t>=seq.total){resolve();return}setTimeout(tick,1000/60)};tick()});
 rec.stop();await done;try{ms&&ms.stop()}catch(e){}vids.forEach(v=>{v.pause();v.removeAttribute('src');v.load()});try{AC.close()}catch(e){}
 if(T.busy&&T.busy.cancel)return null;
 const type=(mt||'video/webm').split(';')[0],blob=new Blob(chunks,{type});const d=new Date(),pad=x=>String(x).padStart(2,'0'),stamp=`${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
 return {name,file:`kurkoos-${stamp}${type==='video/mp4'?'.mp4':'.webm'}`,url:URL.createObjectURL(blob),size:blob.size,type}}
async function runExport(){const items=T.items.filter(x=>!x.bad&&x.dur);if(!items.length){toastSafe('אין במגש סרטונים מוכנים לייצוא');return}
 if(!window.MediaRecorder||!HTMLCanvasElement.prototype.captureStream){toastSafe('הדפדפן הזה לא תומך בייצוא מקומי. נסו בכרום או שלחו לעורך');return}
 pvPlay(false);const jobs=KIT.mode==='merge'&&items.length>1?[[items,'קורקוס '+items.length+' סרטונים']]:items.map(it=>[[it],it.name+' קורקוס']);
 T.busy={p:0,i:0,n:jobs.length,cancel:false};refresh();
 for(const [its,nm] of jobs){T.busy.i++;T.busy.p=0;updBusy();try{const r=await exportSeq(its,nm);if(r)T.outs.unshift(r)}catch(e){toastSafe('הייצוא נכשל: '+(e&&e.message||e))}if(T.busy.cancel)break}
 const c=T.busy.cancel;T.busy=null;refresh();toastSafe(c?'הייצוא בוטל':'הקבצים מוכנים להורדה')}
function updBusy(){const b=document.getElementById('v127busy');if(!b||!T.busy)return;b.querySelector('i').style.width=Math.round(T.busy.p*100)+'%';b.querySelector('span').textContent=`מייצא ${T.busy.i} מתוך ${T.busy.n} · ${Math.round(T.busy.p*100)}%. הייצוא רץ בזמן אמת, השאירו את הלשונית פתוחה`}

// ---------- send to the professional editor with the kit ----------
function kitDoc(){const k=Object.assign({},KIT);if(T.music)k.music={name:T.music.name,asset:T.music.asset||null,url:T.music.assetUrl||null,vol:KIT.musicVol,duck:KIT.duck};return k}
async function sendEditor(){const V=window.__vid,VD=V&&V.VD;if(!VD||!VD.assets||!VD.db){toastSafe('השליחה לעורך זמינה כשהדף פתוח ב-claude.ai עם הרשאת עריכה');return}
 const items=T.items.filter(x=>!x.bad);if(!items.length)return;const big=items.filter(x=>x.size>20*1024*1024);if(big.length){toastSafe(`${big.length} סרטונים גדולים מ-20MB. לעורך עולים רק עד 20MB; אותם אפשר לייצא כאן`);}
 const ok=items.filter(x=>x.size<=20*1024*1024);if(!ok.length)return;T.busy={p:0,i:0,n:ok.length,cancel:false,send:1};refresh();
 try{if(T.music&&!T.music.asset){const r=await VD.assets.upload(T.music.file);T.music.asset=r.id;T.music.assetUrl=r.url}
  const parts=[];for(const it of ok){T.busy.i++;T.busy.p=T.busy.i/ok.length;updBusy();const r=await VD.assets.upload(it.file);parts.push({srcId:r.id,srcUrl:r.url,name:it.name,in:+(it.in||0).toFixed(2),out:+(it.out||it.dur).toFixed(2),mute:it.mute})}
  const kit=kitDoc();
  if(KIT.mode==='merge'&&parts.length>1){const d=await V.queueDoc({id:uid(),name:'חיבור '+parts.length+' סרטונים',srcId:parts[0].srcId,srcUrl:parts[0].srcUrl,parts,mode:'merge',source:'tray',kit,brand:'full'});await V.editVideo(Object.assign({__direct:1},d))}
  else for(const p of parts){const d=await V.queueDoc({id:uid(),name:p.name,srcId:p.srcId,srcUrl:p.srcUrl,trim:{in:p.in,out:p.out},mute:p.mute,source:'tray',kit,brand:'full'});await V.editVideo(Object.assign({__direct:1},d))}
 }catch(e){toastSafe('השליחה נכשלה: '+(e&&e.message||e))}T.busy=null;refresh()}

// ---------- UI ----------
const seg=(k,opts)=>`<span class="v127seg" role="group">${opts.map(([v,l])=>`<button type="button" data-v127k="${k}" data-val="${v}" aria-pressed="${KIT[k]===v}">${l}</button>`).join('')}</span>`;
const tog=(k,l)=>`<label class="v127tog"><input type="checkbox" data-v127k="${k}" ${KIT[k]?'checked':''}><span>${l}</span></label>`;
function html(){const it=selItem(),n=T.items.length;
 return `<section class="v127" id="v127" aria-label="מגש וערכת מותג">
 <div class="v127head"><div><h3>מגש העריכה</h3><p>גררו לכאן כמה סרטונים יחד. מסדרים, חותכים, מלבישים בערכת המותג ורואים את התוצאה לפני שמייצאים או שולחים לעורך.</p></div>
  <label class="v127add"><input type="file" accept="video/*" multiple data-v127f hidden>הוספת סרטונים</label></div>
 <div class="v127grid">
  <div class="v127main">
   <div class="v127tray" data-v127drop>${n?T.items.map((x,i)=>`<article class="v127it ${x.id===(it&&it.id)?'on':''} ${x.bad?'bad':''}" data-id="${x.id}">
     <button type="button" class="v127th" data-v127="pick" data-id="${x.id}" aria-label="תצוגה של ${esc(x.name)}">${x.thumb?`<img src="${x.thumb}" alt="">`:'<span></span>'}<em>${i+1}</em></button>
     <div class="v127meta"><input class="v127nm" data-v127n="${x.id}" value="${esc(x.name)}" aria-label="שם הסרטון"><small>${x.bad?'הקובץ לא נקרא':`${fmtT(x.in)}–${fmtT(x.out)} מתוך ${fmtT(x.dur)}${x.size>20*1024*1024?' · מעל 20MB, ייצוא מקומי בלבד':''}${x.mute?' · בלי קול':''}`}</small></div>
     <div class="v127ia"><button type="button" data-v127="up" data-id="${x.id}" aria-label="להזיז למעלה" ${i?'':'disabled'}>↑</button><button type="button" data-v127="down" data-id="${x.id}" aria-label="להזיז למטה" ${i<n-1?'':'disabled'}>↓</button><button type="button" data-v127="mute" data-id="${x.id}" aria-pressed="${x.mute}" aria-label="השתקה">${x.mute?'🔇':'🔊'}</button><button type="button" data-v127="del" data-id="${x.id}" aria-label="להסיר מהמגש">✕</button></div>
    </article>`).join(''):`<div class="v127empty"><b>המגש ריק</b><span>גררו לכאן סרטון אחד או כמה, או לחצו על "הוספת סרטונים"</span></div>`}</div>
   ${it?`<div class="v127pv"><div class="v127stage"><canvas id="v127cv" aria-label="תצוגה חיה"></canvas></div>
    <div class="v127ctl"><button type="button" class="px-btn sm pri" data-v127="play">ניגון</button><input type="range" id="v127sl" min="0" step="0.01" aria-label="מיקום בתצוגה"><span id="v127tl"></span></div>
    <div class="v127trim"><span>חיתוך של "${esc(it.name)}":</span><button type="button" class="px-btn sm" data-v127="in">התחלה מכאן</button><button type="button" class="px-btn sm" data-v127="out">סוף כאן</button><button type="button" class="px-btn sm ghost" data-v127="reset">בלי חיתוך</button></div></div>`:''}
  </div>
  <div class="v127kit">
   <div class="v127card"><h4>צבעים ופונט</h4><span class="v127pal">${Object.entries(PAL).map(([k,p])=>`<button type="button" data-v127k="pal" data-val="${k}" aria-pressed="${KIT.pal===k}" style="--b:${p.bg};--a:${p.acc}"><i></i>${p.n}</button>`).join('')}</span>
    ${seg('font',FONTS)}</div>
   <div class="v127card"><h4>לוגו</h4>${tog('logo','לוגו קורקוס על הסרטון')}<div class="v127row">${seg('lpos',[['tr','למעלה ימין'],['tl','למעלה שמאל'],['br','למטה ימין'],['bl','למטה שמאל']])}</div><div class="v127row">${seg('lsize',[['s','קטן'],['m','בינוני'],['l','גדול']])}</div></div>
   <div class="v127card"><h4>כותרת תחתונה</h4>${tog('lower','שם וכותרת שנכנסים מהצד')}<input class="v127in" data-v127t="lname" value="${esc(KIT.lname)}" placeholder="שם" aria-label="שם"><input class="v127in" data-v127t="ltitle" value="${esc(KIT.ltitle)}" placeholder="תפקיד או פרויקט (לא חובה)" aria-label="כותרת"></div>
   <div class="v127card"><h4>מסגרת</h4>${seg('frame',[['none','בלי'],['thin','מסגרת דקה'],['bar','פס מותג תחתון']])}</div>
   <div class="v127card"><h4>פתיח</h4>${seg('intro',[['none','בלי'],['logo','לוגו'],['headline','כותרת קינטית']])}<input class="v127in" data-v127t="introText" value="${esc(KIT.introText)}" placeholder="משפט פתיחה קצר (לא חובה)" aria-label="משפט פתיחה"></div>
   <div class="v127card"><h4>סיום</h4>${seg('outro',[['none','בלי'],['logo','לוגו'],['cta','קריאה לפעולה']])}<input class="v127in" data-v127t="cta" value="${esc(KIT.cta)}" placeholder="למשל: דברו איתנו" aria-label="קריאה לפעולה"></div>
   <div class="v127card"><h4>מוזיקת רקע</h4><label class="px-btn sm v127mus"><input type="file" accept="audio/*" data-v127m hidden>${T.music?'החלפת שיר':'בחירת שיר'}</label>${T.music?`<small class="v127mn">${esc(T.music.name)} <button type="button" data-v127="nomusic" aria-label="להסיר את המוזיקה">✕</button></small>`:'<small class="v127mn">בלי מוזיקה. השתמשו רק בשיר שמותר לכם לשימוש מסחרי</small>'}
    <label class="v127vol">עוצמה <input type="range" min="0" max="0.8" step="0.02" value="${KIT.musicVol}" data-v127r="musicVol"></label>${tog('duck','המוזיקה יורדת כשמדברים')}</div>
   <div class="v127card"><h4>פורמט</h4>${seg('fmt',[['9:16','9:16 רילס'],['1:1','1:1'],['16:9','16:9'],['orig','מקורי']])}<div class="v127row">${seg('fit',[['fill','ממלא את המסך'],['frame','בתוך מסגרת מותג']])}</div><div class="v127row">${seg('quality',[['hd','איכות מלאה'],['fast','מהיר']])}</div></div>
  </div>
 </div>
 <footer class="v127foot">${n>1?seg('mode',[['each','כל סרטון בנפרד'],['merge','חיבור לסרטון אחד']]):''}
  <button type="button" class="px-btn pri" data-v127="export" ${n&&!T.busy?'':'disabled'}>ייצוא ממותג להורדה</button>
  <button type="button" class="px-btn" data-v127="send" ${n&&!T.busy?'':'disabled'}>שליחה לעורך המקצועי</button>
  <small>הייצוא כאן מלביש את ערכת המותג ומוסיף מוזיקה. כתוביות, חיתוך שתיקות ותיקון צבע נעשים בעורך המקצועי, עם הערכה הזו.</small></footer>
 ${T.busy?`<div class="v127busy" id="v127busy" role="status"><b><i></i></b><span></span>${T.busy.send?'':'<button type="button" class="px-btn sm" data-v127="cancel">ביטול</button>'}</div>`:''}
 ${T.outs.length?`<div class="v127outs"><h4>קבצים מוכנים</h4>${T.outs.map(o=>`<div class="v127out"><video src="${o.url}" controls playsinline preload="metadata"></video><div><b>${esc(o.name)}</b><small>${(o.size/1048576).toFixed(1)}MB${o.type==='video/webm'?' · WebM, הדפדפן לא תומך ב-MP4 מקומי':''}</small><a class="px-btn sm pri" href="${o.url}" download="${esc(o.file)}">הורדה</a></div></div>`).join('')}</div>`:''}
 </section>`}
function place(){const pg=document.getElementById('v100page');if(!pg)return;const top=pg.querySelector('.v100top');if(!top)return;let s=document.getElementById('v127');if(s&&s.previousElementSibling===top)return;if(s)s.remove();top.insertAdjacentHTML('afterend',html());after()}
function refresh(){const s=document.getElementById('v127');if(!s)return;const y=window.scrollY;s.outerHTML=html();after();window.scrollTo(0,y)}
function after(){logos().then(()=>fontsReady()).then(pvDraw);setPlayBtn();updBusy()}
// copy text on the top drop zone: several at once
function relabel(){const b=document.querySelector('#v100page .v100drop b');if(b&&!b.dataset.v127){b.dataset.v127=1;b.textContent='גררו לכאן סרטון אחד או כמה, או לחצו לבחירה';const sp=b.nextElementSibling;if(sp)sp.textContent='הסרטונים נכנסים למגש העריכה למטה: שם מלבישים את ערכת המותג, מייצאים להורדה או שולחים לעורך'}}

// ---------- events ----------
const isTray=e=>e.target&&e.target.closest&&(e.target.closest('[data-v100drop]')||e.target.closest('#v127'));
document.addEventListener('dragover',e=>{if(!document.getElementById('v100page'))return;const z=e.target.closest&&e.target.closest('#v100page');if(z){e.preventDefault();const t=e.target.closest('[data-v127drop],[data-v100drop]');document.querySelectorAll('.v127over').forEach(x=>x!==t&&x.classList.remove('v127over'));if(t)t.classList.add('v127over')}},true);
window.addEventListener('drop',e=>{const z=e.target.closest&&e.target.closest('#v100page');if(!z)return;e.preventDefault();e.stopImmediatePropagation();document.querySelectorAll('.v127over').forEach(x=>x.classList.remove('v127over'));addFiles(e.dataTransfer&&e.dataTransfer.files||[])},true);
window.addEventListener('change',e=>{const t=e.target;if(!t||!t.closest)return;
 if(t.hasAttribute&&(t.hasAttribute('data-v100f')||t.hasAttribute('data-v127f'))){e.stopImmediatePropagation();addFiles(t.files||[]);t.value='';return}
 if(t.hasAttribute('data-v127m')){const f=t.files&&t.files[0];if(f){if(T.music)URL.revokeObjectURL(T.music.url);T.music={file:f,name:f.name,url:URL.createObjectURL(f)};if(PV.music){PV.music.pause();PV.music=null}refresh()}t.value='';return}
 if(t.matches('#v127 input[type=checkbox][data-v127k]')){KIT[t.dataset.v127k]=t.checked;save();pvDraw();return}
 if(t.matches('[data-v127n]')){const it=T.items.find(x=>x.id===t.dataset.v127n);if(it)it.name=t.value.slice(0,60)}},true);
document.addEventListener('input',e=>{const t=e.target;if(!t||!t.matches)return;
 if(t.matches('[data-v127t]')){KIT[t.dataset.v127t]=t.value.slice(0,80);save();T.pv.t=t.dataset.v127t==='introText'?0.9:t.dataset.v127t==='cta'?seqOf([selItem()||{dur:1}]).total-0.5:INTRO()+1.4;pvDraw()}
 else if(t.matches('[data-v127r]')){KIT[t.dataset.v127r]=+t.value;save();if(PV.music)PV.music.volume=clamp(+t.value)}
 else if(t.id==='v127sl'){T.pv.t=+t.value;if(T.pv.playing)pvPlay(false);pvDraw()}});
document.addEventListener('click',e=>{const k=e.target.closest&&e.target.closest('#v127 [data-v127k][data-val]');
 if(k){e.preventDefault();KIT[k.dataset.v127k]=k.dataset.val;save();k.parentElement.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',b===k));
  if(k.dataset.v127k==='intro')T.pv.t=0.9;else if(k.dataset.v127k==='outro'){const it=selItem();if(it)T.pv.t=seqOf([it]).total-0.4}else if(['lpos','lsize','frame','fit','pal','font'].includes(k.dataset.v127k)&&selItem())T.pv.t=INTRO()+1.4;
  if(['fmt','quality','mode','intro','outro'].includes(k.dataset.v127k))refresh();else pvDraw();return}
 const b=e.target.closest&&e.target.closest('#v127 [data-v127]');if(!b)return;const a=b.dataset.v127,i=T.items.findIndex(x=>x.id===b.dataset.id);
 if(a==='pick'){T.sel=b.dataset.id;T.pv.t=INTRO()+0.6;pvPlay(false);refresh()}
 else if(a==='up'&&i>0){[T.items[i-1],T.items[i]]=[T.items[i],T.items[i-1]];refresh()}
 else if(a==='down'&&i>=0&&i<T.items.length-1){[T.items[i+1],T.items[i]]=[T.items[i],T.items[i+1]];refresh()}
 else if(a==='mute'&&i>=0){T.items[i].mute=!T.items[i].mute;refresh()}
 else if(a==='del'&&i>=0){const [x]=T.items.splice(i,1);if(T.sel===x.id){pvPlay(false);T.sel=T.items[0]&&T.items[0].id||null}setTimeout(()=>URL.revokeObjectURL(x.url),2000);refresh()}
 else if(a==='play')pvPlay(!T.pv.playing);
 else if(a==='in'||a==='out'||a==='reset'){const it=selItem();if(!it)return;const seq=seqOf([it]),ph=phase(seq,T.pv.t);const at=ph.p==='clip'?(it.in||0)+ph.lt:null;
  if(a==='reset'){it.in=0;it.out=it.dur}else if(at==null){toastSafe('הזיזו את הסמן לתוך הסרטון עצמו ואז קבעו');return}else if(a==='in'){if(at>=it.out-0.3)return toastSafe('ההתחלה חייבת להיות לפני הסוף');it.in=at;T.pv.t=INTRO()}else{if(at<=it.in+0.3)return toastSafe('הסוף חייב להיות אחרי ההתחלה');it.out=at}refresh()}
 else if(a==='nomusic'){if(PV.music){PV.music.pause();PV.music=null}T.music=null;refresh()}
 else if(a==='export')runExport();
 else if(a==='send')sendEditor();
 else if(a==='cancel'&&T.busy)T.busy.cancel=true});
new MutationObserver(()=>{try{place();relabel()}catch(e){}}).observe(document.body,{childList:true,subtree:true});
window.__v127={T,KIT:()=>KIT,addFiles,drawFrame,seqOf,exportSeq,dims};
})();
