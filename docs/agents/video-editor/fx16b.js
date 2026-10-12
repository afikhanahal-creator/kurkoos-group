/*FX16b:START*/
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
// ===== FX16b · project ad layouts (designer B): editorial, pills, callouts, seam, corner, night, bar, statement =====
// p: head, label, sub, items(p) <=4, cta, price, shot, shot2, tag. Every field optional; nothing drawn when empty.
const qs=t=>clean(t).trim();
// Big light wordmarks are the idea of several layouts; the engine's type voices would turn every display line heavy,
// so thin display lines (300, >=56px) are drawn with the voice switched off for that one call.
function qraw(c,fn){const cv=c.canvas;if(!cv)return fn();const o=cv.__v151;cv.__v151=false;try{return fn()}finally{cv.__v151=o}}
const qthin=(w,s)=>w<=300&&s>=56;
function QT(c,t,x,y,o){return qthin(o.w,o.size)?qraw(c,()=>T(c,t,x,y,o)):T(c,t,x,y,o)}
function qmw(c,t,w,s,tr){if(qthin(w,s))return qraw(c,()=>qmw0(c,t,w,s,tr));return qmw0(c,t,w,s,tr)}
function qmw0(c,t,w,s,tr){c.save();c.font=AL(w,s);LS(c,((tr||0)*s).toFixed(1)+'px');const r=c.measureText(ISO(clean(t))).width;c.restore();LS(c,'0px');return r}
function qell(c,t,maxW,w,s){t=qs(t);if(qmw(c,t,w,s)<=maxW)return t;while(t.length>1&&qmw(c,t+'…',w,s)>maxW)t=t.slice(0,-1);return t.trim()+'…'}
// fitted headline, never more than `lines` lines, never wider than maxW
function qfit(c,t,maxW,o){return (o.w||700)<=300?qraw(c,()=>qfit0(c,t,maxW,o)):qfit0(c,t,maxW,o)}
function qfit0(c,t,maxW,o){const w=o.w||700,tr=o.track??-.01,n=o.lines||2,min=o.min||72;let size=o.max||140,ls;
  for(;;){c.font=AL(w,size);LS(c,(tr*size).toFixed(1)+'px');ls=wrapW(c,t,maxW);const wide=ls.some(l=>c.measureText(ISO(l)).width>maxW);LS(c,'0px');if((ls.length<=n&&!wide)||size<=min)break;size-=2}
  if(ls.length>n){ls=ls.slice(0,n);ls[n-1]+='…'}
  ls=ls.map(l=>qmw(c,l,w,size,tr)<=maxW?l:qell(c,l,maxW-size*.1,w,size));
  return {size,ls,lh:size*(o.lh||1.06),w,tr}}
const qhH=F=>F?F.size*.8+(F.ls.length-1)*F.lh+F.size*.24:0;
const qhW=(c,F)=>Math.max(0,...F.ls.map(l=>qmw(c,l,F.w,F.size,F.tr)));
function qhead(c,F,x,y,col,align,wf,cf){F.ls.forEach((l,i)=>QT(c,l,x,y+F.size*.8+i*F.lh,{f:AL,w:wf?wf(i):F.w,size:F.size,color:cf?cf(i):col,align,track:F.tr}));return y+qhH(F)}
// wrapped text lines (top based)
function qwrap(c,t,maxW,w,s,n){t=qs(t);if(!t)return[];c.font=AL(w,s);let ls=wrapW(c,t,maxW);if(ls.length>n){ls=ls.slice(0,n);ls[n-1]+='…'}return ls.map(l=>qell(c,l,maxW,w,s))}
const qtH=(ls,s,lh)=>ls.length?s*.8+(ls.length-1)*(lh||s*1.3)+s*.25:0;
function qtxt(c,ls,x,y,w,s,col,align,lh,tr){lh=lh||s*1.3;ls.forEach((l,i)=>T(c,l,x,y+s*.8+i*lh,{f:AL,w,size:s,color:col,align,track:tr||0}));return y+qtH(ls,s,lh)}
// spec line: value bold + label regular, thin separators, wraps to n lines
function qspec(c,its,maxW,s,n){const g=s*1.2,sp=s*.26;const es=its.map(it=>{const v=qs(it.v);let l=qs(it.l);const a=v?qmw(c,v,700,s):0;let b=l?qmw(c,l,400,s):0;
    if(a+b+sp>maxW&&l){l=qell(c,l,Math.max(60,maxW-a-sp),400,s);b=qmw(c,l,400,s)}return{v,l,a,b,w:a+b+(a&&b?sp:0)}}).filter(e=>e.w>0);
  const Ls=[];let cur=[],cw=0;es.forEach(e=>{const nw=cw+(cur.length?g:0)+e.w;if(cur.length&&nw>maxW){Ls.push(cur);cur=[e];cw=e.w}else{cur.push(e);cw=nw}});if(cur.length)Ls.push(cur);
  if(!Ls.length)return null;return{L:Ls.slice(0,n||2),s,g,sp}}
const qsH=S=>S?S.s*.8+(S.L.length-1)*S.s*1.5+S.s*.25:0;
const qsLW=(S,Ln)=>Ln.reduce((a,e)=>a+e.w,0)+S.g*(Ln.length-1);
const qsW=S=>S?Math.max(...S.L.map(Ln=>qsLW(S,Ln))):0;
function qspecD(c,S,x,y,o){if(!S)return y;const s=S.s;S.L.forEach((Ln,i)=>{const tw=qsLW(S,Ln);let xr=o.align==='center'?x+tw/2:o.align==='left'?x+tw:x;const yy=y+s*.8+i*s*1.5;
  Ln.forEach((e,j)=>{if(j){c.save();c.globalAlpha=.6;c.fillStyle=o.sep||o.color;c.fillRect(xr-S.g/2-1,yy-s*.66,2,s*.74);c.restore();xr-=S.g}
    if(e.v){T(c,e.v,xr,yy,{f:AL,w:700,size:s,color:o.vcol||o.color});xr-=e.a+(e.l?S.sp:0)}
    if(e.l){T(c,e.l,xr,yy,{f:AL,w:400,size:s,color:o.color});xr-=e.b}})});return y+qsH(S)}
// price: small prefix, big bold number, small suffix ("החל מ־ 3,680,000 ₪")
function qprice(c,t,big,maxW){t=qs(t);if(!t)return null;const m=t.match(/\d[\d,.]*(?:\s?(?:M|K|מיליון|מליון|אלף))?/);let parts;
  if(m){const pre=t.slice(0,m.index).trim(),post=t.slice(m.index+m[0].length).trim();parts=[[pre,400,.42],[m[0],700,1],[post,400,.42]].filter(x=>x[0])}else parts=[[t,700,.6]];
  let ws,tw,gap;for(;;){ws=parts.map(([s,w,f])=>qmw(c,s,w,Math.round(big*f)));gap=big*.13;tw=ws.reduce((a,b)=>a+b,0)+gap*(parts.length-1);if(tw<=maxW||big<=62)break;big=Math.round(big*.94)}
  if(tw>maxW){parts=parts.map(([s,w,f],i)=>[qell(c,s,maxW/parts.length,w,Math.round(big*f)),w,f]);ws=parts.map(([s,w,f])=>qmw(c,s,w,Math.round(big*f)));tw=ws.reduce((a,b)=>a+b,0)+gap*(parts.length-1)}
  return{parts,ws,tw,big,gap,num:!!m}}
const qpH=P=>P?P.big*(P.num?.86:.62):0;
function qpriceD(c,P,x,y,o){if(!P)return y;const base=y+P.big*(P.num?.78:.5);let xr=o.align==='center'?x+P.tw/2:o.align==='left'?x+P.tw:x;
  P.parts.forEach(([s,w,f],i)=>{const isNum=P.num&&w===700&&f===1;if(i){const prev=P.parts[i-1][0];xr-=/[-־–]$/.test(prev)?P.gap*.25:P.gap}
    T(c,s,xr,base,{f:AL,w,size:Math.round(P.big*f),color:isNum?(o.ncol||o.color):o.color,ltr:isNum,track:isNum?-.01:0});xr-=P.ws[i]});return y+qpH(P)}
// CTA pill with a forward (left) arrow
function qbtn(c,t,s,maxW){t=qs(t);if(!t)return null;const tx=qell(c,t,maxW-s*2.9,700,s);return{tx,s,w:Math.round(qmw(c,tx,700,s)+s*2.9),h:Math.round(s*2.05)}}
function qbtnD(c,B,x,y,o){if(!B)return y;const x0=o.align==='center'?x-B.w/2:o.align==='left'?x:x-B.w;c.save();if(o.shadow){c.shadowColor='rgba(7,41,58,.28)';c.shadowBlur=24;c.shadowOffsetY=8}rr(c,x0,y,B.w,B.h,B.h/2);c.fillStyle=o.bg;c.fill();c.restore();
  if(o.stroke){c.save();rr(c,x0,y,B.w,B.h,B.h/2);c.strokeStyle=o.stroke;c.lineWidth=2;c.stroke();c.restore()}
  T(c,B.tx,x0+B.w-B.s*.95,y+B.h/2+B.s*.34,{f:AL,w:700,size:B.s,color:o.fg});
  const ax=x0+B.s*.95,ay=y+B.h/2;c.save();c.strokeStyle=o.fg;c.lineWidth=3;c.lineCap='round';c.lineJoin='round';c.beginPath();c.moveTo(ax+B.s*.5,ay);c.lineTo(ax,ay);c.moveTo(ax+B.s*.22,ay-B.s*.24);c.lineTo(ax,ay);c.lineTo(ax+B.s*.22,ay+B.s*.24);c.stroke();c.restore();return y+B.h}
// round badge with the status word
function qcirc(c,t,cx,cy,r,bg,fg,o={}){t=qs(t);c.save();if(o.shadow){c.shadowColor='rgba(7,41,58,.3)';c.shadowBlur=30;c.shadowOffsetY=10}c.beginPath();c.arc(cx,cy,r,0,Math.PI*2);c.fillStyle=bg;c.fill();c.restore();
  if(o.ring){c.save();c.strokeStyle=o.ring;c.lineWidth=o.ringW||2;c.beginPath();c.arc(cx,cy,r+(o.ringOff??0),0,Math.PI*2);c.stroke();c.restore()}
  let s=o.max||46,ls;for(;s>=26;s-=2){c.font=AL(700,s);ls=wrapW(c,t,r*1.42);if(ls.length<=3&&ls.every(l=>c.measureText(ISO(l)).width<=r*1.6)&&ls.length*s*1.04<=r*1.3)break}
  ls=ls.slice(0,3).map(l=>qell(c,l,r*1.66,700,s));const lh=s*1.04,y0=cy-(ls.length-1)*lh/2+s*.33;ls.forEach((l,i)=>T(c,l,cx,y0+i*lh,{f:AL,w:700,size:s,color:fg,align:'center'}))}
// "הדמיה להמחשה בלבד" running up a side edge
function qtag(c,p,x,y,col,shadow){if(qs(p.tag)!=='הדמיה')return;c.save();c.translate(x,y);c.rotate(-Math.PI/2);if(shadow){c.shadowColor='rgba(0,0,0,.55)';c.shadowBlur=8}T(c,'הדמיה להמחשה בלבד',0,0,{f:AL,w:400,size:26,color:col,align:'center',track:.02});c.restore()}
// photos: main shot, second shot (or a crop of the main one, or a brand panel)
function qpic(c,I,s,x,y,w,h,fb){if(s&&shot(c,I,s,x,y,w,h))return true;c.save();c.fillStyle=fb||TEAL;c.fillRect(x,y,w,h);grid(c,WHITE,.07,x,y,w,h);if(w>200&&h>200)mark(c,x+w/2-20,y+h/2-30,1.1,'rgba(255,255,255,.22)');c.restore();return false}
function qpic2(c,p,I,x,y,w,h,fb){if(p.shot2&&shot(c,I,p.shot2,x,y,w,h))return true;
  if(p.shot&&I[p.shot.k]){const r=p.shot.r||[0,0,1,1];if(shot(c,I,{k:p.shot.k,r:[r[0]+r[2]*.42,r[1]+r[3]*.3,r[2]*.58,r[3]*.7]},x,y,w,h))return true}
  return qpic(c,I,null,x,y,w,h,fb)}
function qgrad(c,y0,y1,rgb,a0,a1,x=0,w=W){const g=c.createLinearGradient(0,y0,0,y1);g.addColorStop(0,`rgba(${rgb},${a0})`);g.addColorStop(1,`rgba(${rgb},${a1})`);c.fillStyle=g;c.fillRect(x,Math.min(y0,y1),w,Math.abs(y1-y0))}
const qnavy='7,41,58',qpaper='247,248,250';
const qits=p=>items(p).slice(0,4);
const BOT=1196; // last line of content; below it only the brand line

// 1 EDITORIAL · navy page, render top right, huge thin wordmark, lifestyle inset on the seam, details beside it
L.x_q_editorial=(c,p,I)=>{const its=qits(p),hd=qs(p.head);
  const iw=430,cx=W-M,cw=W-M-(M+iw+48);
  // detail column beside the inset decides how low the navy can go
  let sl,P,B,colH;const col=(ss,n,pb)=>{sl=qwrap(c,p.sub,cw,700,ss,n);P=qprice(c,p.price,pb,cw);B=qbtn(c,p.cta,32,cw);
    colH=qtH(sl,ss,ss*1.24)+(P?(sl.length?28:0)+qpH(P):0)+(B?((sl.length||P)?32:0)+B.h:0);return ss};
  let ss=col(42,3,66);if(colH>300)ss=col(38,2,58);
  const navyEnd=Math.round(Math.min(900,Math.max(800,BOT-40-colH)));
  // wordmark: one huge thin line if it fits, else two
  let F=null,S=null,ry=64,rh=0;const top=()=>navyEnd-150-(S?qsH(S)+44:0)-qhH(F);
  const mk=(m1,m2,sn)=>{if(hd){F=qfit(c,hd,W-2*M,{w:300,max:m1,min:Math.min(m1,110),lines:1,track:-.02,lh:.98});if(F.ls.some(l=>/…$/.test(l))||F.size<110&&m1>=110)F=qfit(c,hd,W-2*M,{w:300,max:m2,min:72,lines:2,track:-.02,lh:.98})}
    S=its.length?qspec(c,its,W-2*M,34,sn):null;rh=top()-38-ry};
  mk(190,124,2);if(rh<300)mk(160,104,2);if(rh<300)mk(130,86,1);rh=Math.max(240,rh);const wy=ry+rh+38;
  c.fillStyle=PAPER;c.fillRect(0,0,W,H);c.fillStyle=NAVY;c.fillRect(0,0,W,navyEnd);
  const rx=340;qpic(c,I,p.shot,rx,ry,W-rx,rh,TEAL);
  c.fillStyle='rgba(255,255,255,.55)';c.fillRect(rx-28,ry+rh-120,2,148);c.fillRect(rx-28,ry+rh+26,180,2);
  if(qs(p.label))qcirc(c,p.label,190,Math.max(ry+200,ry+rh-150),100,RED,WHITE,{max:40});
  let y=wy;if(F)y=qhead(c,F,W/2,y,WHITE,'center',null,i=>i?MIST:WHITE);
  if(S)qspecD(c,S,W/2,y+44,{align:'center',color:'rgba(255,255,255,.82)',vcol:WHITE,sep:MIST});
  // lifestyle inset on the seam
  const iy=navyEnd-84,ih=1182-iy;qpic2(c,p,I,M,iy,iw,ih,TEAL);
  c.fillStyle='rgba(255,255,255,.55)';c.fillRect(M-24,iy-26,160,2);c.fillRect(M-24,iy-26,2,92);
  y=navyEnd+Math.max(40,(BOT-navyEnd-colH)/2-10);
  if(sl.length)y=qtxt(c,sl,cx,y,700,ss,NAVY,'right',ss*1.24);
  if(P)y=qpriceD(c,P,cx,y+(sl.length?28:0),{align:'right',color:SLATE,ncol:NAVY});
  if(B)qbtnD(c,B,cx,y+((sl.length||P)?32:0),{align:'right',bg:NAVY,fg:WHITE});
  qtag(c,p,W-22,navyEnd+(BOT-navyEnd)/2,SLATE);
  foot(c,false)};

// 2 PILLS · full-bleed render, name in a navy capsule over the sky, offer capsule with a red CTA tab
L.x_q_pills=(c,p,I)=>{const its=qits(p),hd=qs(p.head);
  qpic(c,I,p.shot,0,0,W,H,TEAL);
  const g=c.createLinearGradient(0,0,0,780);g.addColorStop(0,`rgba(${qpaper},.94)`);g.addColorStop(.42,`rgba(${qpaper},.82)`);g.addColorStop(1,`rgba(${qpaper},0)`);c.fillStyle=g;c.fillRect(0,0,W,780);
  qgrad(c,880,H,qnavy,0,.9);
  if(qs(p.label)){c.save();c.translate(W-118,118);c.rotate(Math.PI/4);c.fillStyle=RED;c.fillRect(-260,-33,520,66);T(c,qell(c,p.label,300,700,30),0,11,{f:AL,w:700,size:30,color:WHITE,align:'center',track:.02});c.restore()}
  let y=104;
  if(hd){const F=qfit(c,hd,640,{w:300,max:96,min:72,lines:3,lh:1.0});const pw=Math.min(W-2*M,qhW(c,F)+150),ph=Math.round(qhH(F)+70);
    c.save();c.shadowColor='rgba(7,41,58,.25)';c.shadowBlur=30;c.shadowOffsetY=10;rr(c,W/2-pw/2,y,pw,ph,Math.min(ph/2,90));c.fillStyle=NAVY;c.fill();c.restore();
    rr(c,W/2-pw/2+10,y+10,pw-20,ph-20,Math.min(ph/2-10,80));c.strokeStyle='rgba(143,182,200,.45)';c.lineWidth=1.5;c.stroke();
    qhead(c,F,W/2,y+35,WHITE,'center');y+=ph+38}
  const sl=qwrap(c,p.sub,840,400,40,2);if(sl.length)y=qtxt(c,sl,W/2,y,400,40,NAVY,'center',52)+38;
  const P=qprice(c,p.price,88,820),S=its.length?qspec(c,its,820,36,2):null,B=qbtn(c,p.cta,36,560);
  if(P||S){const oh=Math.round(qpH(P)+(P&&S?24:0)+qsH(S)+(B?96:80)),ow=Math.min(W-2*M+24,Math.max(P?P.tw:0,qsW(S))+160);const oy=Math.max(y,560);
    c.save();c.shadowColor='rgba(7,41,58,.3)';c.shadowBlur=36;c.shadowOffsetY=12;rr(c,W/2-ow/2,oy,ow,oh,Math.min(oh/2,110));c.fillStyle=NAVY;c.fill();c.restore();
    let yy=oy+40;if(P)yy=qpriceD(c,P,W/2,yy,{align:'center',color:MIST,ncol:WHITE})+(S?24:0);if(S)qspecD(c,S,W/2,yy,{align:'center',color:'rgba(255,255,255,.86)',vcol:WHITE,sep:MIST});
    if(B)qbtnD(c,B,W/2,oy+oh-B.h/2+8,{align:'center',bg:RED,fg:WHITE,shadow:true})}
  else if(B)qbtnD(c,B,W/2,Math.max(y,620),{align:'center',bg:RED,fg:WHITE,shadow:true});
  qtag(c,p,40,920,WHITE,true);
  foot(c,true)};

// 3 CALLOUTS · tall building with two statement boxes, navy band with a framed badge block, price and framed name
L.x_q_callouts=(c,p,I)=>{const its=qits(p),hd=qs(p.head),lb=qs(p.label);
  const F=hd?qfit(c,hd,W-2*M-100,{w:300,max:84,min:72,lines:2,lh:1.0}):null;const fh=F?Math.round(qhH(F)+58):0;
  const fTop=BOT-fh,r1B=fTop-(F?40:0),colW=lb?W-2*M-350:W-2*M,colR=W-M-(lb?350:0);
  const sl=qwrap(c,p.sub,colW,400,36,2),S2=its.length>2?qspec(c,its.slice(2),colW,34,1):null,P=qprice(c,p.price,80,colW),B=qbtn(c,p.cta,32,colW);
  const parts=[sl.length?qtH(sl,36,46):0,S2?qsH(S2):0,P?qpH(P):0,B?B.h:0].filter(Boolean);const h1=parts.reduce((a,b)=>a+b,0)+26*Math.max(0,parts.length-1);
  let seam=Math.min(r1B-h1-60,lb?r1B-190:9999,880);seam=Math.max(seam,560);
  c.fillStyle=NAVY;c.fillRect(0,0,W,H);qpic(c,I,p.shot,0,0,W,seam,TEAL);qgrad(c,seam-160,seam,qnavy,0,.35);
  const co=(it,right,ty,bg)=>{const vS=54,lS=34,mx=430;const vl=qwrap(c,it.v,mx,700,vS,2),ll=qwrap(c,it.l,mx,400,lS,2);if(!vl.length&&!ll.length)return;
    const w=Math.max(...vl.map(l=>qmw(c,l,700,vS)),...ll.map(l=>qmw(c,l,400,lS)))+80,h=Math.round(qtH(vl,vS,vS*1.04)+(vl.length&&ll.length?12:0)+qtH(ll,lS,lS*1.25)+62);const x0=right?W-36-w:36;
    c.save();c.shadowColor='rgba(7,41,58,.35)';c.shadowBlur=30;c.shadowOffsetY=12;c.fillStyle=bg;c.fillRect(x0,ty,w,h);c.restore();c.fillStyle=RED;c.fillRect(x0+w-40,ty,40,6);
    let yy=ty+31;if(vl.length)yy=qtxt(c,vl,x0+w-40,yy,700,vS,WHITE,'right',vS*1.04)+(ll.length?12:0);if(ll.length)qtxt(c,ll,x0+w-40,yy,400,lS,'rgba(255,255,255,.86)','right',lS*1.25)};
  if(its[0])co(its[0],true,Math.round(seam*.24),NAVY);if(its[1])co(its[1],false,Math.round(seam*.5),TEAL);
  if(lb){const bw=310,bh=Math.min(270,r1B-seam+100),bx=W-M-bw,by=seam-100;c.save();c.shadowColor='rgba(7,41,58,.35)';c.shadowBlur=30;c.shadowOffsetY=12;c.fillStyle=WHITE;c.fillRect(bx,by,bw,bh);c.restore();
    c.strokeStyle=NAVY;c.lineWidth=2;c.strokeRect(bx+14,by+14,bw-28,bh-28);c.fillStyle=RED;c.fillRect(bx+bw-14-46,by+14,46,8);
    const LF=qfit(c,lb,bw-64,{w:700,max:66,min:40,lines:3,lh:1.0});qhead(c,LF,bx+bw/2,by+bh/2-qhH(LF)/2,NAVY,'center')}
  let y=Math.max(seam+44,r1B-h1-(lb?0:0));if(lb)y=Math.max(seam+44,Math.min(y,r1B-h1));
  if(sl.length)y=qtxt(c,sl,colR,y,400,36,MIST,'right',46)+26;if(S2)y=qspecD(c,S2,colR,y,{align:'right',color:'rgba(255,255,255,.82)',vcol:WHITE,sep:MIST})+26;
  if(P)y=qpriceD(c,P,colR,y,{align:'right',color:MIST,ncol:WHITE})+26;if(B)qbtnD(c,B,colR,y,{align:'right',bg:RED,fg:WHITE});
  if(F){const fw=Math.min(W-2*M,qhW(c,F)+110);c.strokeStyle='rgba(255,255,255,.6)';c.lineWidth=2;c.strokeRect(W/2-fw/2,fTop,fw,fh);c.fillStyle=NAVY;c.fillRect(W/2-60,fTop-2,120,4);mark(c,W/2-17,fTop-24,.55,MIST);
    qhead(c,F,W/2,fTop+29,WHITE,'center')}
  qtag(c,p,W-22,Math.round(seam*.82),WHITE,true);
  foot(c,true)};

// 4 SEAM · thin location line on paper, photo, red badge on the seam, mist panel with the bold statement
L.x_q_seam=(c,p,I)=>{const its=qits(p),hd=qs(p.head),lb=qs(p.label),sub=qs(p.sub);
  const topH=sub?196:0,r=108,pad=lb?r+36:64;let F,S,P,B,st;
  const calc=(hm,hl,sn,pb)=>{F=hd?qfit(c,hd,920,{w:700,max:hm,min:72,lines:hl,lh:1.02}):null;S=its.length?qspec(c,its,920,34,sn):null;P=qprice(c,p.price,pb,920);B=qbtn(c,p.cta,34,700);
    const a=[qhH(F),qsH(S),qpH(P),B?B.h:0].filter(Boolean);st=a.reduce((x,y)=>x+y,0)+28*Math.max(0,a.length-1)};
  calc(104,3,2,76);const opts=[[96,2,2,72],[88,2,2,64],[80,2,1,64],[72,2,1,62]];for(const o of opts){if(BOT-st-pad>=topH+400)break;calc(...o)}
  let seam=Math.min(860,Math.max(topH+400,BOT-st-pad));
  c.fillStyle=PAPER;c.fillRect(0,0,W,H);
  if(sub){const sF=qfit(c,sub,W-2*M,{w:300,max:66,min:40,lines:1,lh:1});qhead(c,sF,W-M,74,NAVY,'right');c.fillStyle=RED;c.fillRect(W-M-56,topH-32,56,4);c.fillStyle=LINE;c.fillRect(M,topH-31,W-2*M-72,2)}
  qpic(c,I,p.shot,0,topH,W,seam-topH,TEAL);
  c.fillStyle=MIST1;c.fillRect(0,seam,W,H-seam);
  if(lb)qcirc(c,lb,W/2,seam,r,RED,WHITE,{max:44,ring:WHITE,ringW:6,ringOff:3});
  const free=BOT-seam-pad;let y=seam+pad+Math.max(0,(free-st)/2);
  if(F)y=qhead(c,F,W/2,y,NAVY,'center')+28;if(S)y=qspecD(c,S,W/2,y,{align:'center',color:SLATE,vcol:NAVY,sep:MIST})+28;
  if(P)y=qpriceD(c,P,W/2,y,{align:'center',color:SLATE,ncol:NAVY})+28;if(B)qbtnD(c,B,W/2,y,{align:'center',bg:NAVY,fg:WHITE});
  qtag(c,p,W-22,topH+(seam-topH)/2,WHITE,true);
  foot(c,false)};

// 5 CORNER · navy page, render with a cut corner and a red badge in the cut, two-weight name block centred below
L.x_q_corner=(c,p,I)=>{const its=qits(p),hd=qs(p.head),lb=qs(p.label),r=104;let F,sl,S,P,B,st;
  const calc=(hm,sn,pb)=>{F=hd?qfit(c,hd,920,{w:700,max:hm,min:72,lines:2,lh:1.0}):null;sl=qwrap(c,p.sub,880,300,40,1);S=its.length?qspec(c,its,900,34,sn):null;P=qprice(c,p.price,pb,900);B=qbtn(c,p.cta,34,640);
    const a=[qhH(F),qtH(sl,40),qsH(S),qpH(P),B?B.h:0];st=a[0]+(a[1]?18+a[1]:0)+(a[2]?30+a[2]:0)+(a[3]?30+a[3]:0)+(a[4]?36+a[4]:0)};
  calc(110,2,84);const pad=lb?r+30:60;if(BOT-st-pad<520)calc(92,1,72);if(BOT-st-pad<520)calc(80,1,64);
  const yP=Math.min(820,Math.max(520,BOT-st-pad)),cut=220;
  c.fillStyle=NAVY;c.fillRect(0,0,W,H);
  c.save();c.beginPath();c.moveTo(0,0);c.lineTo(W,0);c.lineTo(W,yP-cut);c.lineTo(W-cut,yP);c.lineTo(0,yP);c.closePath();c.clip();qpic(c,I,p.shot,0,0,W,yP,TEAL);qgrad(c,yP-200,yP,qnavy,0,.3);c.restore();
  c.strokeStyle='rgba(143,182,200,.5)';c.lineWidth=2;c.beginPath();c.moveTo(W-cut+28,yP+28);c.lineTo(W+28,yP-cut+28);c.stroke();
  if(lb)qcirc(c,lb,W-cut-60,yP,r,RED,WHITE,{max:42,shadow:true});
  const free=BOT-yP-pad;let y=yP+pad+Math.max(0,(free-st)/2);
  if(F)y=qhead(c,F,W/2,y,WHITE,'center',i=>i?300:700,i=>i?MIST:WHITE);
  if(sl.length)y=qtxt(c,sl,W/2,y+18,400,40,'rgba(255,255,255,.72)','center',52,.04);
  if(S){c.fillStyle=RED;c.fillRect(W/2-28,y+12,56,4);y=qspecD(c,S,W/2,y+30,{align:'center',color:'rgba(255,255,255,.82)',vcol:WHITE,sep:MIST})}
  if(P)y=qpriceD(c,P,W/2,y+30,{align:'center',color:MIST,ncol:WHITE});
  if(B)qbtnD(c,B,W/2,y+36,{align:'center',bg:WHITE,fg:NAVY});
  qtag(c,p,40,Math.round(yP*.42),WHITE,true);
  foot(c,true)};

// 6 NIGHT · dark render, headline on tilted lines (last one on a red highlight), tilted label, red price bar on the seam
L.x_q_night=(c,p,I)=>{const its=qits(p),hd=qs(p.head),lb=qs(p.label),ang=-.045;
  const P0=qprice(c,p.price,88,440),S0=its.length?qspec(c,its,P0?400:860,36,2):null;const both=!!(P0&&S0);
  const P=P0?(both?P0:qprice(c,p.price,96,860)):null,S=S0;let subInBar=!P&&!S&&!!qs(p.sub);
  const bl=subInBar?qwrap(c,p.sub,860,700,44,2):[];
  const barH=(P||S||bl.length)?Math.round(Math.max(qpH(P),qsH(S),qtH(bl,44,54))+70):0;
  const B=qbtn(c,p.cta,34,440);const sl=subInBar?[]:qwrap(c,p.sub,B?W-2*M-B.w-48:W-2*M,700,38,2);
  const rowH=Math.max(qtH(sl,38,48),B?B.h:0);
  const yPaper=Math.round(Math.min(1060,BOT-rowH-(rowH?40:0)-barH*.45));
  qpic(c,I,p.shot,0,0,W,yPaper,NAVY);
  const g=c.createLinearGradient(0,0,0,640);g.addColorStop(0,`rgba(${qnavy},.86)`);g.addColorStop(.55,`rgba(${qnavy},.45)`);g.addColorStop(1,`rgba(${qnavy},0)`);c.fillStyle=g;c.fillRect(0,0,W,640);
  qgrad(c,yPaper-260,yPaper,qnavy,0,.4);
  c.fillStyle=PAPER;c.fillRect(0,yPaper,W,H-yPaper);
  if(hd){const F=qfit(c,hd,860,{w:700,max:118,min:72,lines:2,lh:1.16});const n=F.ls.length;
    F.ls.forEach((l,i)=>{const bx=W-M,by=172+F.size*.8+i*F.lh,hi=i===n-1,w=hi?700:300;c.save();c.translate(bx,by);c.rotate(ang);
      if(hi){const tw=qmw(c,l,w,F.size,F.tr);c.fillStyle=RED;c.fillRect(-tw-30,-F.size*.84,tw+58,F.size*1.06)}
      QT(c,l,0,0,{f:AL,w,size:F.size,color:WHITE,align:'right',track:F.tr});c.restore()})}
  const barTop=Math.round(yPaper-barH*.55);
  if(lb&&barH){const ls=qwrap(c,lb,400,700,40,2),w=Math.max(...ls.map(l=>qmw(c,l,700,40)))+64,h=Math.round(qtH(ls,40,46)+44);c.save();c.translate(M+8+w/2,barTop-h/2+6);c.rotate(-.05);
    c.shadowColor='rgba(0,0,0,.35)';c.shadowBlur=24;c.shadowOffsetY=8;c.fillStyle=WHITE;c.fillRect(-w/2,-h/2,w,h);c.shadowColor='transparent';qtxt(c,ls,w/2-32,-h/2+22,700,40,RED,'right',46);c.restore()}
  else if(lb){/* label without a bar: badge on the photo */qcirc(c,lb,W-M-110,yPaper-150,100,RED,WHITE,{max:40,shadow:true})}
  if(barH){c.save();c.shadowColor='rgba(7,41,58,.35)';c.shadowBlur=30;c.shadowOffsetY=10;c.fillStyle=RED;c.fillRect(M,barTop,W-2*M,barH);c.restore();
    const cy=barTop+barH/2;
    if(both){qpriceD(c,P,M+44,cy-qpH(P)/2,{align:'left',color:'rgba(255,255,255,.88)',ncol:WHITE});c.fillStyle='rgba(255,255,255,.5)';c.fillRect(W-M-44-qsW(S)-36,barTop+28,2,barH-56);qspecD(c,S,W-M-44,cy-qsH(S)/2,{align:'right',color:WHITE,vcol:WHITE,sep:WHITE})}
    else if(P)qpriceD(c,P,W/2,cy-qpH(P)/2,{align:'center',color:'rgba(255,255,255,.88)',ncol:WHITE});
    else if(S)qspecD(c,S,W/2,cy-qsH(S)/2,{align:'center',color:WHITE,vcol:WHITE,sep:WHITE});
    else qtxt(c,bl,W/2,cy-qtH(bl,44,54)/2,700,44,WHITE,'center',54)}
  const ry=barH?barTop+barH+40:yPaper+48;
  if(sl.length)qtxt(c,sl,W-M,ry+(rowH-qtH(sl,38,48))/2,700,38,NAVY,'right',48);
  if(B)qbtnD(c,B,sl.length?M:W/2,ry+(rowH-B.h)/2,{align:sl.length?'left':'center',bg:NAVY,fg:WHITE});
  qtag(c,p,W-22,Math.round(yPaper*.55),WHITE,true);
  foot(c,false)};

// 7 BAR · interior render, thin wordmark on a light sky, one red bar with status | price, details under it
L.x_q_bar=(c,p,I)=>{const its=qits(p),hd=qs(p.head),lb=qs(p.label);
  qpic(c,I,p.shot,0,0,W,H,MIST);
  const F=hd?qfit(c,hd,880,{w:300,max:150,min:72,lines:2,lh:.98,track:-.02}):null;const sl=qwrap(c,p.sub,840,400,38,2);
  const topEnd=150+qhH(F)+(sl.length?24+qtH(sl,38,50):0);
  const g=c.createLinearGradient(0,0,0,topEnd+220);g.addColorStop(0,`rgba(${qpaper},.95)`);g.addColorStop((topEnd)/(topEnd+220),`rgba(${qpaper},.86)`);g.addColorStop(1,`rgba(${qpaper},0)`);c.fillStyle=g;c.fillRect(0,0,W,topEnd+220);
  let y=150;if(F)y=qhead(c,F,W/2,y,NAVY,'center');if(sl.length)qtxt(c,sl,W/2,y+24,400,38,SLATE,'center',50);
  // bottom stack
  let P=qprice(c,p.price,70,600);const lw=lb?Math.min(qmw(c,lb,700,54),P?380:820):0;if(P&&lb)P=qprice(c,p.price,70,936-96-lw-60);
  const lbT=lb?qell(c,lb,lw+2,700,54):'';const barH=(lb||P)?112:0;
  const S=its.length?qspec(c,its,900,36,2):null,B=qbtn(c,p.cta,34,640);
  const st=barH+(S?34+qsH(S):0)+(B?34+B.h:0);const top=BOT-st;
  if(st){const g2=c.createLinearGradient(0,top-260,0,top+40);g2.addColorStop(0,`rgba(${qpaper},0)`);g2.addColorStop(1,`rgba(${qpaper},.93)`);c.fillStyle=g2;c.fillRect(0,top-260,W,300);c.fillStyle=`rgba(${qpaper},.93)`;c.fillRect(0,top+40,W,H-top-40)}
  else{c.fillStyle=`rgba(${qpaper},.93)`;c.fillRect(0,BOT-20,W,H-BOT+20)}
  y=top;
  if(barH){c.save();c.shadowColor='rgba(169,11,12,.28)';c.shadowBlur=30;c.shadowOffsetY=10;c.fillStyle=RED;c.fillRect(M,y,W-2*M,barH);c.restore();
    const cy=y+barH/2,tw=(lb?lw:0)+(P?P.tw:0)+(lb&&P?60:0);let xr=W/2+tw/2;
    if(lb){T(c,lbT,xr,cy+19,{f:AL,w:700,size:54,color:WHITE,track:.01});xr-=lw}
    if(lb&&P){c.fillStyle='rgba(255,255,255,.6)';c.fillRect(xr-31,y+26,2,barH-52);xr-=60}
    if(P)qpriceD(c,P,xr,cy-qpH(P)/2,{align:'right',color:WHITE,ncol:WHITE});y+=barH}
  if(S)y=qspecD(c,S,W/2,y+34,{align:'center',color:SLATE,vcol:NAVY,sep:MIST});
  if(B)qbtnD(c,B,W/2,y+34,{align:'center',bg:NAVY,fg:WHITE});
  qtag(c,p,W-22,660,'rgba(7,41,58,.7)');
  foot(c,false)};

// 8 STATEMENT · paper top: huge thin number behind a thin wordmark, big light statement, specs and price; interior render below
L.x_q_statement=(c,p,I)=>{const its=qits(p),hd=qs(p.head),lb=qs(p.label);
  let num=(hd.match(/\d+(?:[-–]\d+)?/)||[''])[0];if(!num&&its[0]&&/^\d[\d,.]{0,3}$/.test(qs(its[0].v)))num=qs(its[0].v);
  let F,SF,S,P,B,st;const lbH=lb?60+30:0;
  const calc=(wm,sm,sl,pb)=>{F=hd?qfit(c,hd,860,{w:300,max:wm,min:72,lines:2,lh:1.0,track:-.02}):null;SF=qs(p.sub)?qfit(c,qs(p.sub),920,{w:700,max:sm,min:44,lines:sl,lh:1.04,track:-.01}):null;
    S=its.length?qspec(c,its,920,34,2):null;P=qprice(c,p.price,pb,920);const a=[qhH(F),qhH(SF),qsH(S),qpH(P)];st=lbH+a[0]+(a[1]?26+a[1]:0)+(a[2]?26+a[2]:0)+(a[3]?22+a[3]:0)};
  calc(136,84,2,100);if(120+st+56>960)calc(112,72,2,84);if(120+st+56>960)calc(96,60,1,72);
  const yPh=Math.round(Math.min(980,Math.max(620,120+st+64)));
  c.fillStyle=PAPER;c.fillRect(0,0,W,H);
  let y=Math.max(110,(yPh-56-st)/2+20);
  if(lb){const w=qmw(c,lb,700,30)+60;rr(c,W/2-w/2,y,w,60,30);c.fillStyle=RED;c.fill();T(c,lb,W/2,y+41,{f:AL,w:700,size:30,color:WHITE,align:'center',track:.02});y+=lbH}
  if(F){if(num){let ns=560;while(ns>200&&qmw(c,num,300,ns)>W-2*M)ns-=20;const mid=y+qhH(F)/2;c.save();c.beginPath();c.rect(0,0,W,yPh);c.clip();c.globalAlpha=.13;QT(c,num,W/2,mid+ns*.36,{f:AL,w:300,size:ns,color:TEAL,align:'center',ltr:true,track:-.03});c.globalAlpha=1;c.restore()}
    y=qhead(c,F,W/2,y,NAVY,'center')}
  if(SF)y=qhead(c,SF,W/2,y+26,MIST,'center');
  if(S)y=qspecD(c,S,W/2,y+26,{align:'center',color:SLATE,vcol:NAVY,sep:MIST});
  if(P)qpriceD(c,P,W/2,y+22,{align:'center',color:NAVY,ncol:NAVY});
  if(!(p.shot2&&shot(c,I,p.shot2,0,yPh,W,H-yPh)))qpic(c,I,p.shot,0,yPh,W,H-yPh,TEAL);
  qgrad(c,Math.max(yPh,H-330),H,qnavy,0,.9);
  const B2=qbtn(c,p.cta,34,640);if(B2)qbtnD(c,B2,W/2,BOT-B2.h,{align:'center',bg:PAPER,fg:NAVY,shadow:true});
  qtag(c,p,40,yPh+(BOT-yPh)/2-40,WHITE,true);
  foot(c,true)};
G.FX.L=G.FX.L||{};Object.assign(G.FX.L,L);
})(window);
/*FX16b:END*/
