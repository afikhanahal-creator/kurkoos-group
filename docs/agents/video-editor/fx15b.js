/*FX15b:START*/
(function(G){
const {shot}=G.FX4H;const W=1080,H=1350,M=72;
const NAVY='#07293a',TEAL='#105572',MIST='#8fb6c8',MIST1='#e7eef1',PAPER='#f7f8fa',RED='#a90b0c',SLATE='#3d4b58',WHITE='#ffffff',LINE='#cfd7de';
const HE=(w,s)=>`${w} ${s}px Heebo, Almoni, Arial, sans-serif`,SE=(w,s)=>`${w} ${s}px "Frank Ruhl Libre", Heebo, serif`,AL=(w,s)=>`${w} ${s}px Almoni, Heebo, Arial, sans-serif`;
const LS=(c,v)=>{try{c.letterSpacing=v}catch(e){}};
const ISO=t=>String(t??'').replace(/(\d[\d,.]*\s?[KM])(?![A-Za-z])/g,'⁦$1⁩').replace(/(\d+(?:[.,]\d+)?)\s*[×x]\s*(\d+(?:[.,]\d+)?)/g,'⁦$1×$2⁩').replace(/(\d[\d,.]*(?:[-/:]\d[\d,.]*)*[+%]?)/g,'⁦$1⁩');
const clean=t=>String(t||'').replace(/\*/g,'');
function rnd(seed){let s=(seed>>>0)||7;return()=>(s=(s*16807)%2147483647)/2147483647}
function wrapW(c,t,maxW){const out=[];clean(t).split('\n').forEach(par=>{let cur='';par.split(/\s+/).filter(Boolean).forEach(w=>{const n=cur?cur+' '+w:w;if(c.measureText(n).width>maxW&&cur){out.push(cur);cur=w}else cur=n});if(cur)out.push(cur)});return out}
function T(c,t,x,y,o){t=ISO(clean(t));c.save();c.font=(o.f||HE)(o.w||400,o.size);LS(c,((o.track??0)*o.size).toFixed(1)+'px');c.direction=o.ltr?'ltr':'rtl';c.textAlign=o.align||'right';c.fillStyle=o.color||NAVY;c.fillText(t,x,y);const w=c.measureText(t).width;c.restore();LS(c,'0px');return w}
function fit(c,t,maxW,o){const f=o.f||HE;let size=o.max||150;const min=o.min||72;let ls;for(;;){c.font=f(o.w||900,size);LS(c,((o.track??-.02)*size).toFixed(1)+'px');ls=wrapW(c,ISO(t),maxW);LS(c,'0px');if(ls.length<=(o.lines||3)||size<=min)break;size-=4}return{size,ls:ls.slice(0,(o.lines||3)+1),lh:size*(o.lh||1.04),f,w:o.w||900,track:o.track??-.02}}
function head(c,F,x,y,col,o={}){c.save();c.font=F.f(F.w,F.size);LS(c,(F.track*F.size).toFixed(1)+'px');c.direction='rtl';c.textAlign=o.align||'right';c.fillStyle=col;F.ls.forEach((l,i)=>c.fillText(l,x,y+F.size*.8+i*F.lh));c.restore();LS(c,'0px');return y+F.size*.8+(F.ls.length-1)*F.lh}
function para(c,t,x,y,o){const sz=o.size;c.save();c.font=(o.f||AL)(o.w||400,sz);const ls=wrapW(c,t,o.maxW).slice(0,o.lines||3);const lh=sz*(o.lh||1.36);c.direction='rtl';c.textAlign=o.align||'right';c.fillStyle=o.color||NAVY;ls.forEach((l,i)=>c.fillText(ISO(l),x,y+i*lh));c.restore();return y+(ls.length-1)*lh}
function rr(c,x,y,w,h,r){c.beginPath();if(c.roundRect)c.roundRect(x,y,w,h,r);else c.rect(x,y,w,h)}
function mark(c,x,y,s,col){c.save();c.fillStyle=col;[[23,32,5,44],[34,12,8,64],[46,22,6,54],[56,42,4,34]].forEach(([rx,ry,rw,rh])=>c.fillRect(x+(rx-23)*s,y+(ry-12)*s,rw*s,rh*s));c.restore()}
function items(p){return (p.items||[]).map(it=>Array.isArray(it)?{v:String(it[0]??''),l:String(it[1]??'')}:{v:String(it.v??it.big??''),l:String(it.l??it.label??'')}).filter(x=>x.v!==''||x.l)}
function index(c,t,dark,y=92){c.fillStyle=RED;c.fillRect(W-M-18,y-22,18,18);return T(c,t||'',W-M-34,y,{w:700,size:28,color:dark?WHITE:NAVY,track:.02})}
function foot(c,dark,y=H-60){const fg=dark?WHITE:NAVY,sub=dark?'rgba(255,255,255,.75)':SLATE,ln=dark?'rgba(255,255,255,.25)':LINE;c.fillStyle=ln;c.fillRect(M,y-58,W-2*M,2);
  const w=T(c,'קבוצת קורקוס',W-M,y,{w:800,size:30,color:fg});T(c,'מקרקע ועד מסירת מפתח',W-M-w-18,y,{w:300,size:28,color:sub});mark(c,M+2,y-44,.85,fg);T(c,'kurkoos-group.co.il',M+62,y,{w:400,size:26,color:sub,align:'left',ltr:true})}
function photo(c,p,I,x,y,w,h,fallback){if(p.shot&&shot(c,I,p.shot,x,y,w,h))return true;c.save();c.fillStyle=fallback||TEAL;c.fillRect(x,y,w,h);grid(c,WHITE,.08,x,y,w,h);c.restore();return false}
function grid(c,col,a,x=0,y=0,w=W,h=H,step=60){c.save();c.beginPath();c.rect(x,y,w,h);c.clip();c.globalAlpha=a;c.strokeStyle=col;c.lineWidth=1;for(let gx=x;gx<=x+w;gx+=step){c.beginPath();c.moveTo(gx,y);c.lineTo(gx,y+h);c.stroke()}for(let gy=y;gy<=y+h;gy+=step){c.beginPath();c.moveTo(x,gy);c.lineTo(x+w,gy);c.stroke()}c.restore()}
function shade(c,y0,y1,a0,a1){const g=c.createLinearGradient(0,y0,0,y1);g.addColorStop(0,`rgba(7,41,58,${a0})`);g.addColorStop(1,`rgba(7,41,58,${a1})`);c.fillStyle=g;c.fillRect(0,y0,W,y1-y0)}
function num(v){const m=String(v).replace(/,/g,'').match(/-?\d+(\.\d+)?/);return m?parseFloat(m[0]):NaN}
function srcLine(c,p,y,dark){if(!p.source)return;c.font=HE(300,26);let t='מקור: '+p.source;while(c.measureText(t).width>W-2*M&&t.length>12)t=t.slice(0,-2);if(t!=='מקור: '+p.source)t=t.trim()+'…';T(c,t,W-M,y,{w:300,size:26,color:dark?'rgba(255,255,255,.7)':SLATE})}
const L={};
// ---------- Kurkoos FX15 · B: social-native formats rebuilt in the brand (prefix x_v_)
// caption, askbox, thread, wrapped, streak, notifs, rating, pov, thisthat, carousel, reply, save
const TZ=(w,s)=>`${w} ${s}px "Almoni Tzar", Almoni, Arial, sans-serif`;
const t=(c,s,x,y,o={})=>T(c,s,x,y,Object.assign({f:AL},o));
const bg=(c,col)=>{c.fillStyle=col;c.fillRect(0,0,W,H)};
const mw=(c,s,f,w,z,tr=0)=>{c.save();c.font=f(w,z);LS(c,(tr*z).toFixed(1)+'px');const x=c.measureText(ISO(clean(s))).width;c.restore();LS(c,'0px');return x};
const one=(c,s,maxW,f,w,max,min)=>{let z=max;for(;z>min;z-=2)if(mw(c,s,f,w,z)<=maxW)break;return z};
const ell=(c,s,maxW,f,w,z)=>{s=clean(s).replace(/\s+/g,' ').trim();if(mw(c,s,f,w,z)<=maxW)return s;let lo=1,hi=s.length;while(lo<hi){const m=(lo+hi+1)>>1;if(mw(c,s.slice(0,m).trim()+'…',f,w,z)<=maxW)lo=m;else hi=m-1}return s.slice(0,lo).trim()+'…'};
// wrapped lines, the last one closed with an ellipsis when the text is longer than n lines
const wl=(c,s,maxW,f,w,z,n)=>{if(!s||n<=0)return[];c.save();c.font=f(w,z);let a=wrapW(c,s,maxW);c.restore();if(n&&a.length>n){const k=a.slice(0,n);k[n-1]=ell(c,a.slice(n-1).join(' '),maxW,f,w,z);a=k}a.re=m=>wl(c,s,maxW,f,w,z,m);return a};
const fH=F=>F.ls.length?F.size*.8+(F.ls.length-1)*F.lh:0;
const isNum=v=>/\d/.test(String(v||''));
function lbl(c,s,dark,y=92){if(!s)return;const tx=ell(c,s,W-2*M-260,AL,700,28);c.fillStyle=RED;c.fillRect(W-M-18,y-22,18,18);t(c,tx,W-M-34,y,{w:700,size:28,color:dark?WHITE:NAVY,track:.02})}
function sCard(c,x,y,w,h,r,fill,blur=50,dy=22,a=.22){c.save();c.shadowColor=`rgba(7,41,58,${a})`;c.shadowBlur=blur;c.shadowOffsetY=dy;c.fillStyle=fill;rr(c,x,y,w,h,r);c.fill();c.restore()}
function lines(c,ls,x,y,lh,o){ls.forEach((l,i)=>t(c,l,x,y+i*lh,o));return y+(ls.length-1)*lh}
// words laid out as separate stickers (vertical video caption)
function wordFit(c,s,maxW,f,w,max,min,n){for(let z=max;;z-=4){c.font=f(w,z);const gap=z*.3;const rows=[];clean(s).split('\n').forEach(par=>{let cur=[],cw=0;par.split(/\s+/).filter(Boolean).forEach(wd=>{const ww=c.measureText(ISO(wd)).width;const nw=cw?cw+gap+ww:ww;if(nw>maxW&&cur.length){rows.push({ws:cur,w:cw});cur=[{t:wd,w:ww}];cw=ww}else{cur.push({t:wd,w:ww});cw=nw}});if(cur.length)rows.push({ws:cur,w:cw})});
  if(rows.length<=n||z<=min){if(rows.length>n){const r=rows[n-1];const last=r.ws[r.ws.length-1];last.t=last.t+'…';last.w=c.measureText(ISO(last.t)).width;r.w+=c.measureText('…').width}return{z,gap,rows:rows.slice(0,n)}}}}
function avatar(c,cx,cy,r,fill,fg){c.save();c.fillStyle=fill;c.beginPath();c.arc(cx,cy,r,0,7);c.fill();const s=r/42;mark(c,cx-18*s,cy-31*s,s,fg);c.restore()}
function person(c,cx,cy,r,fill,fg){c.save();c.fillStyle=fill;c.beginPath();c.arc(cx,cy,r,0,7);c.fill();c.beginPath();c.arc(cx,cy,r,0,7);c.clip();c.fillStyle=fg;c.beginPath();c.arc(cx,cy-r*.18,r*.34,0,7);c.fill();c.beginPath();c.ellipse(cx,cy+r*.78,r*.62,r*.5,0,0,7);c.fill();c.restore()}
function star(c,cx,cy,R,frac,on,off){const path=()=>{c.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rad=i%2?R*.45:R;c.lineTo(cx+Math.cos(a)*rad,cy+Math.sin(a)*rad)}c.closePath()};
  c.save();path();c.fillStyle=off;c.fill();if(frac>0){c.save();path();c.clip();c.fillStyle=on;c.fillRect(cx+R-2*R*Math.min(1,frac),cy-R,2*R*Math.min(1,frac),2*R);c.restore()}c.restore()}
function bookmark(c,x,y,w,h,col){c.save();c.fillStyle=col;c.beginPath();c.moveTo(x,y);c.lineTo(x+w,y);c.lineTo(x+w,y+h);c.lineTo(x+w/2,y+h-w*.42);c.lineTo(x,y+h);c.closePath();c.fill();c.restore()}
function arrowL(c,x,y,len,col,lw2){c.save();c.strokeStyle=col;c.lineWidth=lw2;c.lineCap='round';c.lineJoin='round';c.beginPath();c.moveTo(x+len,y);c.lineTo(x,y);c.moveTo(x+lw2*3.2,y-lw2*3.2);c.lineTo(x,y);c.lineTo(x+lw2*3.2,y+lw2*3.2);c.stroke();c.restore()}
// a rating only when the text itself gives one ("4.8/5", "5 כוכבים", "חמישה כוכבים")
function ratingOf(p){const txt=[p.head,p.sub,p.label,p.cta,...items(p).map(i=>i.v+' '+i.l)].map(clean).join(' \n ');
  let m=txt.match(/(\d(?:[.,]\d)?)\s*(?:\/\s*5\b|מתוך\s*5|כוכבים|כוכב|★)/);if(m){const v=parseFloat(m[1].replace(',','.'));if(v>0&&v<=5)return{v,txt:m[1].replace(',','.')}}
  m=txt.match(/(חמישה|חמש|ארבעה|ארבע|שלושה|שלוש|שני|שניים)\s+כוכבים/);if(m){const v={'חמישה':5,'חמש':5,'ארבעה':4,'ארבע':4,'שלושה':3,'שלוש':3,'שני':2,'שניים':2}[m[1]];return{v,txt:''}}return null}

// 1 CAPTION · vertical-video caption: each word an outlined sticker over the photo, the key word in a red box
L.x_v_caption=(c,p,I)=>{bg(c,NAVY);photo(c,p,I,0,0,W,H);shade(c,0,260,.55,0);shade(c,H-760,H,0,.92);
  if(p.label){const s=ell(c,p.label,560,AL,700,30);const w=mw(c,s,AL,700,30)+48;c.save();c.translate(W-M-w/2,100);c.rotate(.03);c.fillStyle=RED;rr(c,-w/2,-32,w,64,12);c.fill();t(c,s,w/2-24,10,{w:700,size:30,color:WHITE});c.restore()}
  const sub=p.sub||p.cta;const F=wordFit(c,p.head||'',W-2*M-30,TZ,800,128,72,5);const rowH=F.z*1.16;let subL=wl(c,sub,W-2*M-80,AL,700,38,2);
  const blockH=F.rows.length*rowH;if(blockH+(subL.length?40+subL.length*66:0)>930)subL=subL.re(1);const subH=subL.length?40+subL.length*66:0;
  const y=1150-subH-blockH;
  let em=null,best=0,nW=0;F.rows.forEach((r,ri)=>r.ws.forEach((wd,wi)=>{nW++;const n=[...clean(wd.t)].length;if(n>=3&&wd.w>best){best=wd.w;em=ri+':'+wi}}));if(nW<2)em=null;
  c.save();c.font=TZ(800,F.z);c.direction='rtl';c.textAlign='right';c.lineJoin='round';
  F.rows.forEach((r,ri)=>{const by=y+ri*rowH+F.z*.86;let rx=W/2+r.w/2;r.ws.forEach((wd,wi)=>{const s=ISO(clean(wd.t));
    if(ri+':'+wi===em){c.save();c.translate(rx-wd.w/2,by-F.z*.32);c.rotate(-.035);c.fillStyle=RED;rr(c,-wd.w/2-F.z*.16,-F.z*.6,wd.w+F.z*.32,F.z*1.08,F.z*.12);c.fill();c.fillStyle=WHITE;c.fillText(s,wd.w/2,F.z*.32);c.restore()}
    else{c.strokeStyle=NAVY;c.lineWidth=F.z*.17;c.strokeText(s,rx,by);c.fillStyle=WHITE;c.fillText(s,rx,by)}rx-=wd.w+F.gap})});c.restore();
  const sy=y+blockH+40;subL.forEach((l,i)=>{const w=mw(c,l,AL,700,38)+48;c.fillStyle=WHITE;rr(c,W/2-w/2,sy+i*66,w,58,10);c.fill();t(c,l,W/2,sy+i*66+42,{w:700,size:38,color:NAVY,align:'center'})});
  // scrubber, right to left
  const ty=1190;c.fillStyle='rgba(255,255,255,.28)';rr(c,M,ty-3,W-2*M,6,3);c.fill();const px=W-M-(W-2*M)*.36;c.fillStyle=RED;rr(c,px,ty-3,W-M-px,6,3);c.fill();c.fillStyle=WHITE;c.beginPath();c.arc(px,ty,11,0,7);c.fill();
  foot(c,true)};

// 2 ASKBOX · story question box: avatar on top, the prompt in the header, a field to type into
L.x_v_askbox=(c,p,I)=>{bg(c,NAVY);photo(c,p,I,0,0,W,H);c.fillStyle='rgba(7,41,58,.22)';c.fillRect(0,0,W,H);shade(c,H-440,H,0,.9);shade(c,0,240,.45,0);
  const bw=W-2*M-40,bx=(W-bw)/2,pad=60,ask=p.label||'שאלו אותנו';
  let F=fit(c,p.head||'',bw-2*pad,{f:TZ,w:800,max:104,min:72,lines:4,lh:1.04,track:-.01});
  let subL=wl(c,p.sub,W-2*M-20,AL,400,38,3);const inH=136;
  const hdr=()=>96+34+28+fH(F)+60;const tot=()=>hdr()+inH+(subL.length?50+subL.length*54:0);
  while(tot()>990&&subL.length)subL=subL.re(subL.length-1);
  const top=210,bot=1170;let y=top+Math.max(0,(bot-top-tot())/2);const hh=hdr(),bh=hh+inH;
  sCard(c,bx,y,bw,bh,44,WHITE,60,26,.35);
  c.save();rr(c,bx,y,bw,bh,44);c.clip();const g=c.createLinearGradient(bx,y,bx+bw,y+hh);g.addColorStop(0,NAVY);g.addColorStop(1,TEAL);c.fillStyle=g;c.fillRect(bx,y,bw,hh);grid(c,WHITE,.06,bx,y,bw,hh,48);c.restore();
  c.fillStyle=WHITE;c.beginPath();c.arc(W/2,y,74,0,7);c.fill();avatar(c,W/2,y,62,NAVY,WHITE);
  t(c,ell(c,ask,bw-2*pad,AL,700,30),W/2,y+96+28,{w:700,size:30,color:MIST,align:'center',track:.08});
  head(c,F,W/2,y+96+34+28,WHITE,{align:'center'});
  const iy=y+hh;c.fillStyle=MIST1;rr(c,bx+36,iy+24,bw-72,inH-48,24);c.fill();
  t(c,ell(c,p.cta||'הקלידו כאן…',bw-140,AL,400,36),W/2,iy+inH/2+13,{w:400,size:36,color:p.cta?NAVY:SLATE,align:'center'});
  if(subL.length)lines(c,subL,W/2,y+bh+50+38,54,{w:400,size:38,color:WHITE,align:'center'});
  foot(c,true)};

// 3 THREAD · a short post with two replies hanging from it on a thread line
L.x_v_thread=(c,p,I)=>{bg(c,MIST1);grid(c,TEAL,.05);lbl(c,p.label,false);
  const its=items(p).slice(0,2).map(it=>{const nm=it.v&&!isNum(it.v)&&it.l?clean(it.v):'';return{nm,tx:nm?it.l:(clean(it.v)+' '+clean(it.l)).trim()}}).filter(r=>r.tx);
  const cx=M,cw=W-2*M,pad=48,tw=cw-2*pad,ra=36,rx0=cx+110,rw=cx+cw-rx0,rtw=rw-2*40-ra*2-24;
  const F=fit(c,p.head||'',tw,{f:AL,w:700,max:80,min:72,lines:5,lh:1.14,track:-.01});
  let subL=wl(c,p.sub,tw,AL,400,36,3);let ph=p.shot?380:0;let rl=3;
  const rep=()=>its.map(r=>{const ls=wl(c,r.tx,rtw,AL,400,34,rl);return{...r,ls,h:40*2+(r.nm?42:0)+(ls.length-1)*46+34}});
  let R=rep();const ctaH=p.cta?96:0;
  const card=()=>pad+92+28+fH(F)+(subL.length?26+subL.length*50:0)+(ph?34+ph:0)+pad;
  const tot=()=>card()+R.reduce((a,r)=>a+28+r.h,0)+ctaH;const room=1186-140;
  if(tot()>room){rl=2;R=rep()}if(tot()>room&&ph)ph=Math.max(300,ph-(tot()-room));if(tot()>room){rl=1;R=rep()}while(tot()>room&&subL.length)subL=subL.re(subL.length-1);if(tot()>room&&ph)ph=Math.max(240,ph-(tot()-room));if(tot()>room)ph=0;
  let y=140+Math.max(0,(room-tot())/2);const ch=card();
  sCard(c,cx,y,cw,ch,36,WHITE,40,16,.14);
  const ax=cx+cw-pad-44,ay=y+pad+44;avatar(c,ax,ay,44,NAVY,WHITE);
  t(c,'קבוצת קורקוס',ax-64,ay-4,{w:700,size:34,color:NAVY});t(c,'kurkoos-group.co.il',ax-64,ay+36,{w:400,size:26,color:SLATE,ltr:true});
  let yy=head(c,F,cx+cw-pad,y+pad+92+28,NAVY);
  if(subL.length){yy=lines(c,subL,cx+cw-pad,yy+26+40,50,{w:400,size:36,color:SLATE})}
  if(ph){const py=yy+34;c.save();rr(c,cx+pad,py,tw,ph,24);c.clip();photo(c,p,I,cx+pad,py,tw,ph);c.restore()}
  y+=ch;
  // thread line from the post avatar through the replies
  if(R.length){const lastY=y+R.slice(0,-1).reduce((a,r)=>a+28+r.h,0)+28+40;c.strokeStyle=MIST;c.lineWidth=4;c.beginPath();c.moveTo(ax,y-4);c.lineTo(ax,lastY);c.stroke();
    let ry=y;R.forEach((r,i)=>{ry+=28;sCard(c,rx0,ry,rw,r.h,30,WHITE,24,10,.1);const pcx=rx0+rw-40-ra,pcy=ry+40+ra-6;
      if(r.nm){c.fillStyle=MIST;c.beginPath();c.arc(pcx,pcy,ra,0,7);c.fill();t(c,[...r.nm][0],pcx,pcy+12,{w:700,size:34,color:NAVY,align:'center'})}else person(c,pcx,pcy,ra,MIST,WHITE);
      const tx=pcx-ra-24;let by=ry+40+30;if(r.nm){t(c,ell(c,r.nm,rtw,AL,700,30),tx,by,{w:700,size:30,color:NAVY});by+=42}
      lines(c,r.ls,tx,by+4,46,{w:400,size:34,color:NAVY});ry+=r.h})}
  if(p.cta){const s=ell(c,p.cta,cw-200,AL,700,34);const w=mw(c,s,AL,700,34)+120;const by=y+R.reduce((a,r)=>a+28+r.h,0)+30;c.fillStyle=WHITE;rr(c,cx+cw-w,by,w,66,33);c.fill();c.strokeStyle=MIST;c.lineWidth=2;c.stroke();
    t(c,s,cx+cw-36,by+45,{w:700,size:34,color:NAVY});c.fillStyle=RED;c.beginPath();c.arc(cx+cw-w+36,by+33,9,0,7);c.fill()}
  foot(c,false)};

// 4 WRAPPED · year-in-review: every number gets its own coloured slab, stacked to the footer
L.x_v_wrapped=(c,p,I)=>{bg(c,NAVY);lbl(c,p.label,true);const its=items(p).slice(0,6),n=its.length;
  if(!n){const F=fit(c,p.head||'',W-2*M,{f:TZ,w:800,max:150,min:72,lines:5,lh:.98,track:-.02});const sL=wl(c,p.sub,W-2*M,AL,400,38,3);const h=fH(F)+(sL.length?60+sL.length*54:0);let y=(170+1180-h)/2;const b=head(c,F,W-M,y,WHITE);c.fillStyle=RED;c.fillRect(W-M-120,y-50,120,10);lines(c,sL,W-M,b+70,54,{w:400,size:38,color:MIST});foot(c,true);return}
  const F=fit(c,p.head||'',W-2*M,{f:TZ,w:800,max:n>4?96:112,min:72,lines:n>4?2:3,lh:.98,track:-.02});let hb=head(c,F,W-M,150,WHITE);
  if(p.sub&&n<=3){const sL=wl(c,p.sub,W-2*M,AL,400,36,2);hb=lines(c,sL,W-M,hb+58,50,{w:400,size:36,color:MIST})}
  const top=hb+52,bot=1196,bh=(bot-top)/n,red=Math.min(2,n-1);
  const pal=[[TEAL,WHITE,MIST1],[MIST1,NAVY,SLATE],[RED,WHITE,WHITE],[MIST,NAVY,NAVY],[PAPER,NAVY,SLATE],[TEAL,WHITE,MIST1]];
  let k=0;its.forEach((it,i)=>{let col;if(i===red)col=pal[2];else{col=pal[[0,1,3,4,5][k%5]];k++}
    const y=top+i*bh;c.save();c.translate(0,y);c.fillStyle=col[0];c.beginPath();c.moveTo(0,i?6:0);c.lineTo(W,0);c.lineTo(W,bh+6);c.lineTo(0,bh+12);c.closePath();c.fill();c.restore();
    const v=clean(it.v),l=clean(it.l);const big=v||l,rest=v?l:'';
    let z=Math.min(bh*.74,230);const maxNW=rest?(W-2*M)*.56:W-2*M;z=one(c,big,maxNW,TZ,800,z,Math.min(64,z));
    const nwid=Math.min(mw(c,big,TZ,800,z),maxNW);const tx=ell(c,big,maxNW,TZ,800,z);const cy=y+bh/2+6;
    t(c,tx,W-M,cy+z*.36,{f:TZ,w:800,size:z,color:col[1],track:-.02});
    if(rest){const lz=Math.round(Math.max(36,Math.min(50,bh*.15))),lh=lz*1.22;const nl=Math.max(1,Math.min(3,Math.floor((bh-20)/lh)));const lw2=W-2*M-nwid-48;const ls=wl(c,rest,lw2,AL,400,lz,nl);const base=cy+z*.36;lines(c,ls,W-M-nwid-48,ls.length>1?Math.max(y+lz+10,base-(ls.length-1)*lh):base,lh,{w:400,size:lz,color:col[2]})}});
  c.fillStyle=NAVY;c.fillRect(0,1196+6,W,H-1196);foot(c,true)};

// 5 STREAK · the streak number, the days drawn as cells (one per day, today in red)
L.x_v_streak=(c,p,I)=>{bg(c,PAPER);lbl(c,p.label,false);let its=items(p);let N=NaN,nl='';
  const n0=its.length?num(its[0].v):NaN;if(its.length&&isFinite(n0)&&n0>=1&&!/[a-zא-ת]{3}/i.test(its[0].v)){N=Math.round(n0);nl=clean(its[0].l);its=its.slice(1)}else{const m=clean(p.head).match(/\d+/);if(m)N=+m[0]}
  const X=W-2*M;let F=fit(c,p.head||'',X,{f:TZ,w:800,max:N>=1?92:130,min:72,lines:3,lh:1.0,track:-.02});
  if(!(N>=1)){const sL=wl(c,p.sub,X,AL,400,36,3);const rows=its.slice(0,5);const h=fH(F)+(sL.length?50+sL.length*50:0)+(rows.length?40+rows.length*78:0);let y=160+Math.max(0,(1180-160-h)/2);
    let b=head(c,F,W-M,y,NAVY);if(sL.length)b=lines(c,sL,W-M,b+50+20,50,{w:400,size:36,color:SLATE});if(rows.length){b+=40;rows.forEach((it,i)=>{const yy=b+i*78;c.fillStyle=i===rows.length-1?RED:TEAL;rr(c,W-M-44,yy+14,44,44,10);c.fill();t(c,ell(c,(clean(it.v)+' '+clean(it.l)).trim(),X-70,AL,400,36),W-M-70,yy+50,{w:400,size:36,color:NAVY})})}foot(c,false);return}
  const Ns=String(N);const nz=Ns.length>=3?260:320;
  const cellsOn=N<=140;let cols=Math.min(20,Math.max(7,Math.ceil(N/5)));if(N<7)cols=N;const rows=Math.ceil(N/cols);const gap=10;let cs=Math.min(64,(X-(cols-1)*gap)/cols);
  let gridH=cellsOn?rows*cs+(rows-1)*gap:0;let sL=wl(c,p.sub,X,AL,400,36,2);let ms=its.slice(0,3);
  const tot=()=>nz*.78+(nl?64:0)+(cellsOn?56+gridH:0)+64+fH(F)+(sL.length?34+sL.length*50:0)+(ms.length?40+ms.length*60:0);
  while(tot()>1010&&ms.length)ms=ms.slice(0,-1);while(tot()>1010&&sL.length)sL=sL.re(sL.length-1);if(tot()>1010&&cellsOn){cs=Math.max(22,cs*.7);gridH=rows*cs+(rows-1)*(gap)}
  let y=165+Math.max(0,(1180-165-tot())/2);
  // the number with a red under-stroke
  const nb=y+nz*.78;t(c,Ns,W/2,nb,{f:TZ,w:800,size:nz,color:NAVY,align:'center',track:-.03});y=nb;
  if(nl){t(c,ell(c,nl,X,AL,700,40),W/2,y+60,{w:700,size:40,color:RED,align:'center'});y+=64}
  if(cellsOn){y+=56;const gw=cols*cs+(cols-1)*gap;const gx=W/2+gw/2;for(let i=0;i<N;i++){const col=i%cols,row=Math.floor(i/cols);const x=gx-(col+1)*cs-col*gap,yy=y+row*(cs+gap);c.fillStyle=i===N-1?RED:NAVY;rr(c,x,yy,cs,cs,cs*.2);c.fill()}
    for(let i=N;i<rows*cols;i++){const col=i%cols,row=Math.floor(i/cols);const x=gx-(col+1)*cs-col*gap,yy=y+row*(cs+gap);c.strokeStyle=LINE;c.lineWidth=2;rr(c,x+1,yy+1,cs-2,cs-2,cs*.2);c.stroke()}y+=gridH}
  y+=64;if(F.ls.length)y=head(c,F,W/2,y,NAVY,{align:'center'});
  if(sL.length)y=lines(c,sL,W/2,y+34+36,50,{w:400,size:36,color:SLATE,align:'center'});
  if(ms.length){y+=40;ms.forEach((it,i)=>{const s=ell(c,(clean(it.v)+'  ·  '+clean(it.l)).replace(/^\s*·\s*|\s*·\s*$/g,'').trim(),X-40,AL,400,34);t(c,s,W/2,y+i*60+44,{w:400,size:34,color:NAVY,align:'center'})})}
  foot(c,false)};

// 6 NOTIFS · lock screen: the photo as wallpaper, the headline where the clock sits, each item a notification
L.x_v_notifs=(c,p,I)=>{bg(c,NAVY);photo(c,p,I,0,0,W,H);c.fillStyle='rgba(7,41,58,.34)';c.fillRect(0,0,W,H);shade(c,0,560,.6,0);shade(c,H-320,H,0,.88);
  let its=items(p),usedSub=false;if(!its.length&&p.sub){its=[{v:'',l:p.sub}];usedSub=true}
  const F=fit(c,p.head||'',W-2*M,{f:TZ,w:800,max:124,min:72,lines:3,lh:1.0,track:-.02});
  let y=136;c.save();c.strokeStyle=WHITE;c.fillStyle=WHITE;c.lineWidth=5;c.beginPath();c.arc(W/2,y+16,13,Math.PI,0);c.stroke();rr(c,W/2-19,y+16,38,30,7);c.fill();c.restore();y+=62;
  if(p.label){t(c,ell(c,p.label,W-2*M-200,AL,700,30),W/2,y+20,{w:700,size:30,color:WHITE,align:'center',track:.06});y+=46}
  let hb=head(c,F,W/2,y,WHITE,{align:'center'});
  const X=M,CW=W-2*M,pad=30,ic=84,tw=CW-2*pad-ic-26;let show=its.slice(0,4),bl=2;
  let subL=(!usedSub&&p.sub)?wl(c,p.sub,W-2*M-60,AL,400,36,2):[];
  const cards=()=>show.map(it=>{const ttl=clean(it.v)||'קבוצת קורקוס';const body=clean(it.l);const ls=body?wl(c,body,tw,AL,400,34,bl):[];return{ttl,ls,h:pad*2+40+ls.length*46}});
  let C=cards();const more=()=>its.length-show.length;const tot=()=>C.reduce((a,k)=>a+k.h+16,0)+(more()?50:0);
  const avail=()=>1176-(hb+40+(subL.length?subL.length*50+30:0));
  if(tot()>avail()){bl=1;C=cards()}while(tot()>avail()&&subL.length)subL=subL.re(subL.length-1);while(tot()>avail()&&show.length>1){show=show.slice(0,-1);C=cards()}
  if(subL.length)lines(c,subL,W/2,hb+70,50,{w:400,size:36,color:'rgba(255,255,255,.9)',align:'center'});
  let cy=1176-tot();
  C.forEach((k,i)=>{c.save();c.shadowColor='rgba(7,41,58,.35)';c.shadowBlur=30;c.shadowOffsetY=10;c.fillStyle='rgba(247,248,250,.93)';rr(c,X,cy,CW,k.h,34);c.fill();c.restore();
    const ix=X+CW-pad-ic,iy=cy+pad;c.fillStyle=i===0?RED:NAVY;rr(c,ix,iy,ic,ic,22);c.fill();mark(c,ix+ic/2-17,iy+ic/2-28,.9,WHITE);
    const tx=ix-26;t(c,ell(c,k.ttl,tw,AL,700,34),tx,cy+pad+32,{w:700,size:34,color:NAVY});lines(c,k.ls,tx,cy+pad+32+48,46,{w:400,size:34,color:SLATE});cy+=k.h+16});
  if(more()){c.fillStyle='rgba(247,248,250,.55)';rr(c,X+30,cy-16,CW-60,22,0);c.fill();c.fillStyle='rgba(247,248,250,.32)';rr(c,X+64,cy+6,CW-128,16,0);c.fill();
    t(c,'+'+more(),W/2,cy+50,{w:700,size:30,color:WHITE,align:'center',ltr:true})}
  foot(c,true)};

// 7 RATING · a review card; stars appear only when the text itself names a rating
L.x_v_rating=(c,p,I)=>{const g=c.createLinearGradient(0,0,0,H);g.addColorStop(0,TEAL);g.addColorStop(1,NAVY);c.fillStyle=g;c.fillRect(0,0,W,H);grid(c,WHITE,.04);lbl(c,p.label,true);
  const R=ratingOf(p);const cw=W-2*M,cx=M,pad=64,tw=cw-2*pad;
  const its=items(p).filter(it=>!(R&&/(\/\s*5|כוכב|מתוך\s*5)/.test(it.v+' '+it.l))).slice(0,4);
  const F=fit(c,p.head||'',tw,{f:AL,w:700,max:92,min:72,lines:5,lh:1.12,track:-.01});let subL=wl(c,p.sub,tw,AL,400,36,4);
  c.font=AL(400,34);const pills=its.map(it=>ell(c,(clean(it.v)+(it.v&&it.l?' · ':'')+clean(it.l)).trim(),tw-60,AL,400,34));
  // rows of pills
  const rowsOf=ps=>{const rows=[];let cur=[],w=0;ps.forEach(s=>{const pw=mw(c,s,AL,400,34)+56;if(w+pw>tw&&cur.length){rows.push(cur);cur=[];w=0}cur.push({s,pw});w+=pw+14});if(cur.length)rows.push(cur);return rows};
  let PR=rowsOf(pills);const starH=R?(R.txt?200:130):70;
  const tot=()=>pad+starH+fH(F)+(subL.length?40+subL.length*50:0)+(PR.length?44+PR.length*80-14:0)+pad;const capH=p.cta?100:0;
  while(tot()+capH>1010&&PR.length)PR=PR.slice(0,-1);while(tot()+capH>1010&&subL.length>1)subL=subL.re(subL.length-1);
  const ch=tot();let y=170+Math.max(0,(1180-170-ch-capH)/2);sCard(c,cx,y,cw,ch,40,PAPER,60,30,.4);
  let yy=y+pad;
  if(R){const sR=46,sp=108;const sx=W/2+2*sp;for(let i=0;i<5;i++)star(c,sx-i*sp,yy+sR,sR,Math.max(0,Math.min(1,R.v-i)),RED,LINE);
    if(R.txt){t(c,R.txt+' / 5',W/2,yy+2*sR+60,{w:700,size:34,color:RED,align:'center',ltr:true,track:.04});}yy+=starH}
  else{c.fillStyle=RED;c.fillRect(W/2-60,yy+10,120,10);yy+=starH}
  yy=head(c,F,W/2,yy-(R?0:0),NAVY,{align:'center'});
  if(subL.length)yy=lines(c,subL,W/2,yy+40+40,50,{w:400,size:36,color:SLATE,align:'center'});
  if(PR.length){yy+=44;PR.forEach((row,ri)=>{const rw=row.reduce((a,q)=>a+q.pw,0)+(row.length-1)*14;let x=W/2+rw/2;row.forEach(q=>{c.fillStyle=MIST1;rr(c,x-q.pw,yy+ri*80,q.pw,62,31);c.fill();t(c,q.s,x-28,yy+ri*80+43,{w:400,size:34,color:NAVY});x-=q.pw+14})})}
  if(p.cta)t(c,ell(c,p.cta,cw,AL,700,34),W/2,y+ch+70,{w:700,size:34,color:WHITE,align:'center'});
  foot(c,true)};

// 8 POV · the photo, a red "POV" sticker and the line written as the on-screen text of a vertical video
L.x_v_pov=(c,p,I)=>{bg(c,NAVY);photo(c,p,I,0,0,W,H);shade(c,0,820,.8,0);shade(c,H-330,H,0,.9);lbl(c,p.label,true);
  const F=fit(c,p.head||'',W-2*M-40,{f:AL,w:700,max:92,min:72,lines:5,lh:1.12,track:-.01});const subL=wl(c,p.sub,W-2*M-60,AL,400,38,3);
  let y=176;c.save();c.translate(W/2,y+46);c.rotate(-.04);c.fillStyle=RED;rr(c,-118,-48,236,96,16);c.fill();c.restore();t(c,'POV',W/2,y+76,{f:TZ,w:800,size:84,color:WHITE,align:'center',ltr:true,track:.04});
  y+=140;c.save();c.shadowColor='rgba(7,41,58,.85)';c.shadowBlur=26;c.shadowOffsetY=3;const b=head(c,F,W/2,y,WHITE,{align:'center'});
  if(subL.length)lines(c,subL,W/2,b+56+38,54,{w:400,size:38,color:WHITE,align:'center'});c.restore();
  if(p.cta){const s=ell(c,p.cta,W-2*M-120,AL,700,34);const w=mw(c,s,AL,700,34)+80;c.fillStyle=WHITE;rr(c,W/2-w/2,1100,w,70,35);c.fill();t(c,s,W/2,1147,{w:700,size:34,color:NAVY,align:'center'})}
  foot(c,true)};

// 9 THISTHAT · this or that: two halves, a red "או" seal on the seam, 1 and 2 to answer with
L.x_v_thisthat=(c,p,I)=>{bg(c,PAPER);lbl(c,p.label,false);
  let opts=items(p).slice(0,2).map(it=>{const v=clean(it.v),l=clean(it.l);if(v&&l&&isNum(v))return{a:v+' '+l,b:''};return{a:v||l,b:v?l:''}});let qHead=p.head||'';
  if(opts.length<2){const m=clean(qHead).split(/\s+או\s+/);if(m.length===2&&m[0]&&m[1]){opts=[{a:m[0].replace(/[?？]$/,''),b:''},{a:m[1].replace(/[?？]$/,''),b:''}]}else opts=[]}
  const F=fit(c,qHead,W-2*M,{f:TZ,w:800,max:opts.length?92:130,min:72,lines:opts.length?2:4,lh:1.0,track:-.02});
  if(!opts.length){const sL=wl(c,p.sub,W-2*M,AL,400,38,3);const h=fH(F)+(sL.length?60+sL.length*54:0);let y=(160+1180-h)/2;const b=head(c,F,W-M,y,NAVY);lines(c,sL,W-M,b+70,54,{w:400,size:38,color:SLATE});foot(c,false);return}
  let hb=head(c,F,W-M,150,NAVY);let subL=wl(c,p.sub,W-2*M,AL,400,34,1);if(subL.length)hb=lines(c,subL,W-M,hb+52,50,{w:400,size:34,color:SLATE});if(p.cta)hb=t(c,ell(c,p.cta,W-2*M,AL,700,34),W-M,hb+52,{w:700,size:34,color:RED})*0+hb+52;
  const top=hb+48,bot=1186,hh=(bot-top)/2;
  const half=(o,i)=>{const y=top+i*hh;c.save();rr(c,M,y+(i?8:0),W-2*M,hh-8,34);c.clip();
    if(i===0){c.fillStyle=NAVY;c.fillRect(0,y,W,hh);if(p.shot){photo(c,p,I,M,y,W-2*M,hh);c.fillStyle='rgba(7,41,58,.62)';c.fillRect(M,y,W-2*M,hh)}else grid(c,WHITE,.05,M,y,W-2*M,hh)}else{c.fillStyle=TEAL;c.fillRect(0,y,W,hh+8);grid(c,WHITE,.05,M,y,W-2*M,hh+8)}c.restore();
    const iw=W-2*M-260;const bl=o.b?wl(c,o.b,iw,AL,400,34,2):[];const room=hh-8-80-(bl.length?28+bl.length*46:0);
    let G=fit(c,o.a,iw,{f:TZ,w:800,max:Math.min(120,room*.9),min:56,lines:2,lh:1.0,track:-.02});const bh=fH(G)+(bl.length?28+(bl.length-1)*46+34:0);const ty=y+(i?8:0)+(hh-8-bh)/2;
    const b=head(c,G,W-M-56,ty,WHITE);if(bl.length)lines(c,bl,W-M-56,b+28+38,46,{w:400,size:34,color:MIST1});
    // the answer number, outlined
    c.save();c.font=TZ(800,190);c.textAlign='center';c.lineWidth=4;c.strokeStyle='rgba(255,255,255,.55)';c.strokeText(String(i+1),M+120,i?y+hh-40:y+190);c.restore()};
  opts.forEach(half);
  const sx=M+120,sy=top+hh+4;c.fillStyle=PAPER;c.beginPath();c.arc(sx,sy,74,0,7);c.fill();c.fillStyle=RED;c.beginPath();c.arc(sx,sy,60,0,7);c.fill();t(c,'או',sx,sy+19,{f:TZ,w:800,size:56,color:WHITE,align:'center'});
  foot(c,false)};

// 10 CAROUSEL · cover slide: the photo, a big title, what is inside, and the swipe cue to the left
L.x_v_carousel=(c,p,I)=>{bg(c,NAVY);const its=items(p).slice(0,6);
  const F=fit(c,p.head||'',W-2*M,{f:TZ,w:800,max:132,min:72,lines:3,lh:.98,track:-.025});let subL=wl(c,p.sub,W-2*M,AL,400,36,2);
  let show=its.slice(0,4);const tot=()=>fH(F)+(subL.length?40+subL.length*50:0)+(show.length?30+show.length*58:0);const lim=1080-480;
  while(tot()>lim&&show.length>2)show=show.slice(0,-1);while(tot()>lim&&subL.length)subL=subL.re(subL.length-1);while(tot()>lim&&show.length)show=show.slice(0,-1);
  const y=1084-tot();const ph=Math.min(1000,y+F.size*.9+40);photo(c,p,I,0,0,W,ph);shade(c,Math.max(0,y-300),ph+2,0,1);shade(c,0,230,.5,0);lbl(c,p.label,true);
  let b=head(c,F,W-M,y,WHITE);
  if(subL.length)b=lines(c,subL,W-M,b+40+36,50,{w:400,size:36,color:MIST});
  if(show.length){b+=30;show.forEach((it,i)=>{const yy=b+i*58+44;t(c,String(i+1).padStart(2,'0'),W-M,yy,{w:700,size:34,color:RED,ltr:true});t(c,ell(c,(clean(it.v)&&!isNum(it.v)?clean(it.v)+' · ':'')+clean(it.l||it.v),W-2*M-80,AL,400,34),W-M-70,yy,{w:400,size:34,color:WHITE})})}
  // swipe cue and page dots
  const cy=1158;const n=Math.max(3,Math.min(8,its.length?its.length+1:5));for(let i=0;i<n;i++){const x=W/2+(n-1)*14-i*28+7;c.fillStyle=i===0?RED:'rgba(255,255,255,.4)';c.beginPath();c.arc(x-7,cy,i===0?9:7,0,7);c.fill()}
  c.fillStyle=WHITE;rr(c,M,cy-36,236,72,36);c.fill();arrowL(c,M+30,cy,48,NAVY,5);t(c,'החליקו',M+236-30,cy+12,{w:700,size:34,color:NAVY});
  // a sliver of the next slide peeking in on the left
  c.fillStyle=MIST1;rr(c,-30,ph-40,48,300,14);c.fill();
  foot(c,true)};

// 11 REPLY · a comment sticker pinned over the photo, our hot take answering it below
L.x_v_reply=(c,p,I)=>{bg(c,NAVY);photo(c,p,I,0,0,W,H);shade(c,0,300,.5,0);shade(c,H*.38,H,0,.95);
  const sw=W-2*M-70,sx=M+40,pad=40,stw=sw-2*pad;const who=p.label||'תגובה';
  const solo=!p.sub;let F2=fit(c,p.head||'',W-2*M,{f:TZ,w:800,max:124,min:72,lines:4,lh:.98,track:-.02});
  let body,bz;if(solo){bz=fit(c,p.head||'',stw,{f:TZ,w:800,max:96,min:72,lines:5,lh:1.0,track:-.02})}else{body=wl(c,p.sub,stw,AL,700,40,4)}
  const bodyH=solo?fH(bz):40*.8+(body.length-1)*54;const sh=pad+44+26+bodyH+pad+6;const y0=solo?Math.max(200,(1150+200-sh)/2-30):200;
  c.save();c.translate(sx+sw/2,y0+sh/2);c.rotate(-.025);c.translate(-(sx+sw/2),-(y0+sh/2));
  sCard(c,sx,y0,sw,sh,30,WHITE,40,18,.35);c.fillStyle=WHITE;c.beginPath();c.moveTo(sx+sw-120,y0+sh-2);c.lineTo(sx+sw-70,y0+sh+40);c.lineTo(sx+sw-60,y0+sh-2);c.fill();
  person(c,sx+sw-pad-22,y0+pad+20,22,MIST,WHITE);t(c,ell(c,who,stw-80,AL,400,30),sx+sw-pad-58,y0+pad+31,{w:400,size:30,color:SLATE});
  if(solo)head(c,bz,sx+sw-pad,y0+pad+44+26,NAVY);else lines(c,body,sx+sw-pad,y0+pad+44+26+32,54,{w:700,size:40,color:NAVY});c.restore();
  if(!solo){const room=1180-(y0+sh+90);F2=fit(c,p.head||'',W-2*M,{f:TZ,w:800,max:Math.min(124,room/3),min:72,lines:4,lh:.98,track:-.02});const h=fH(F2);const y=Math.max(y0+sh+110,1176-h);c.fillStyle=RED;c.fillRect(W-M-110,y-44,110,10);head(c,F2,W-M,y,WHITE)}
  if(p.cta&&solo){t(c,ell(c,p.cta,W-2*M,AL,700,34),W-M,1170,{w:700,size:34,color:WHITE})}
  foot(c,true)};

// 12 SAVE · a "save this" card: bookmark ribbon, a checklist to come back to
L.x_v_save=(c,p,I)=>{bg(c,NAVY);grid(c,WHITE,.04);const cx=M,cw=W-2*M,pad=60,tw=cw-2*pad-70;const its=items(p).slice(0,6);
  const F=fit(c,p.head||'',cw-2*pad-110,{f:TZ,w:800,max:104,min:72,lines:3,lh:1.0,track:-.02});let subL=wl(c,p.sub,cw-2*pad,AL,400,34,its.length?2:4);let ll=2;
  const rows=()=>its.map(it=>{const v=clean(it.v),l=clean(it.l);const s=(v&&l&&!isNum(v))?v+': '+l:(v+' '+l).trim();return wl(c,s,tw,AL,400,36,ll)});let RS=rows();
  const ctaH=p.cta?96:0;const tot=()=>pad+50+40+fH(F)+(subL.length?34+subL.length*48:0)+(RS.length?40+RS.reduce((a,r)=>a+30+r.length*48,0):0)+ctaH+pad;
  while(tot()>990&&subL.length)subL=subL.re(subL.length-1);if(tot()>990){ll=1;RS=rows()}
  const ch=tot();const y=200+Math.max(0,(1186-200-ch)/2);sCard(c,cx,y,cw,ch,32,PAPER,60,30,.45);
  bookmark(c,cx+pad,y-14,64,130,RED);
  t(c,ell(c,p.label||'שמרו את זה',cw-2*pad-120,AL,700,30),cx+cw-pad,y+pad+28,{w:700,size:30,color:RED,track:.06});
  let b=head(c,F,cx+cw-pad,y+pad+50+40-F.size*.0,NAVY);
  if(subL.length)b=lines(c,subL,cx+cw-pad,b+34+34,48,{w:400,size:34,color:SLATE});
  if(RS.length){b+=40;c.fillStyle=LINE;c.fillRect(cx+pad,b-6,cw-2*pad,2);RS.forEach(r=>{const by=b+30+36;c.strokeStyle=NAVY;c.lineWidth=3.5;rr(c,cx+cw-pad-42,by-32,42,42,8);c.stroke();lines(c,r,cx+cw-pad-70,by,48,{w:400,size:36,color:NAVY});b+=30+r.length*48})}
  if(p.cta){const by=y+ch-pad-14;bookmark(c,cx+cw-pad-30,by-34,28,44,NAVY);t(c,ell(c,p.cta,cw-2*pad-60,AL,700,34),cx+cw-pad-50,by,{w:700,size:34,color:NAVY})}
  foot(c,true)};
G.FX.L=G.FX.L||{};Object.assign(G.FX.L,L);
})(window);
/*FX15b:END*/
