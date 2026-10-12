/*FX17b:START*/
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
// ===== FX17b · project ad layouts round 2 (designer B): speech, thin, number, wordmark, grid, stars, wave, card =====
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

// ---- round 2 helpers ----
// value slot: the price; when there is none, the status word, else the first spec (so the slot is never empty)
function tval(c,p,its,big,maxW,noLabel){const pr=qs(p.price);if(pr){const P=qprice(c,pr,big,maxW);return{k:'price',P,h:qpH(P)}}
  let t=noLabel?'':qs(p.label),k='label';if(!t&&its[0]){t=(qs(its[0].v)+' '+qs(its[0].l)).trim();k='item'}if(!t)return null;
  const s=Math.max(40,Math.round(big*.62));const ls=qwrap(c,t,maxW,700,s,1);return{k,ls,s,h:qtH(ls,s)}}
function tvalD(c,V,x,y,o){if(!V)return y;if(V.P)return qpriceD(c,V.P,x,y,{align:o.align,color:o.color,ncol:o.ncol||o.color});return qtxt(c,V.ls,x,y,700,V.s,o.ncol||o.color,o.align)}
const tits=(its,V)=>V&&V.k==='item'?its.slice(1):its;
const tlab=(p,V)=>V&&V.k==='label'?'':qs(p.label);
// small solid pill with one word (status)
function tpillW(c,t,s){return qmw(c,t,700,s)+s*1.5}
function tpill(c,t,x,y,s,bg,fg,align){t=qs(t);if(!t)return 0;const w=tpillW(c,t,s),h=Math.round(s*1.9),x0=align==='center'?x-w/2:align==='left'?x:x-w;rr(c,x0,y,w,h,h/2);c.fillStyle=bg;c.fill();T(c,t,x0+w/2,y+h/2+s*.34,{f:AL,w:700,size:s,color:fg,align:'center',track:.02});return h}
// number in a headline: "חנקין 41" -> {num:'41', name:'חנקין'}
function tnum(hd){const m=hd.match(/\d+(?:[-–]\d+)?/);if(!m)return null;const name=(hd.slice(0,m.index)+' '+hd.slice(m.index+m[0].length)).replace(/[ \t]+/g,' ').replace(/ *\n */g,'\n').trim();return{num:m[0],name}}
function tshadow(c,a,b,dy){c.shadowColor=`rgba(7,41,58,${a})`;c.shadowBlur=b;c.shadowOffsetY=dy||0}
// pill holding the spec line, with a chevron at its end (reads as a link)
function tspecPill(c,S,cx,y,bg,fg){const pw=qsW(S)+150,ph=Math.round(qsH(S)+44);rr(c,cx-pw/2,y,pw,ph,Math.min(ph/2,46));c.fillStyle=bg;c.fill();
  qspecD(c,S,cx+30,y+22,{align:'center',color:fg,vcol:fg,sep:fg});const ax=cx-pw/2+44,ay=y+ph/2;c.save();c.strokeStyle=fg;c.lineWidth=3;c.lineCap='round';c.lineJoin='round';c.beginPath();c.moveTo(ax+9,ay-13);c.lineTo(ax-4,ay);c.lineTo(ax+9,ay+13);c.stroke();c.restore();return y+ph}
const tsH=S=>S?Math.round(qsH(S)+44):0;

// 1 SPEECH · address in a speech pill over the sky, render with one rounded corner, bold headline, rule, value, spec pill, CTA
L.x_t_speech=(c,p,I)=>{const its0=qits(p),hd=qs(p.head),sub=qs(p.sub);
  const pillT=sub||qs(p.label);let F,V,S,B,st,its,lb;
  const calc=(hm,vb,ss)=>{F=hd?qfit(c,hd,900,{w:700,max:hm,min:72,lines:2,lh:1.02}):null;V=tval(c,p,its0,vb,900,!sub);its=tits(its0,V);lb=sub?tlab(p,V):'';
    S=its.length?qspec(c,its,820,ss,2):null;B=qbtn(c,p.cta,34,640);
    const a=[qhH(F),V?62+V.h:0,tsH(S),B?B.h:0];st=a[0]+a[1]+(a[2]?(a[0]+a[1]?38:0)+a[2]:0)+(a[3]?34+a[3]:0)};
  calc(104,76,34);if(BOT-st-70<600)calc(92,68,32);if(BOT-st-70<600)calc(80,62,30);
  const yR=Math.round(Math.max(560,Math.min(800,BOT-st-70)));
  const g=c.createLinearGradient(0,yR,0,H);g.addColorStop(0,PAPER);g.addColorStop(1,MIST1);c.fillStyle=g;c.fillRect(0,0,W,H);
  c.save();c.beginPath();if(c.roundRect)c.roundRect(0,-2,W,yR+2,[0,0,150,0]);else c.rect(0,0,W,yR);c.clip();qpic(c,I,p.shot,0,0,W,yR,TEAL);qgrad(c,0,300,qnavy,.32,0);c.restore();
  if(pillT){const s=46,tx=qell(c,pillT,760,700,s),w=qmw(c,tx,700,s)+120,h=96,x0=W/2-w/2,y0=104;
    c.save();tshadow(c,.28,30,10);c.beginPath();if(c.roundRect)c.roundRect(x0,y0,w,h,[h/2,h/2,6,h/2]);else c.rect(x0,y0,w,h);c.fillStyle=PAPER;c.fill();c.restore();
    c.beginPath();c.moveTo(x0+w-6,y0+h-2);c.lineTo(x0+w-6,y0+h+26);c.lineTo(x0+w-44,y0+h-2);c.closePath();c.fillStyle=PAPER;c.fill();
    T(c,tx,W/2,y0+h/2+s*.34,{f:AL,w:700,size:s,color:NAVY,align:'center'})}
  if(lb){const s=32;const w=tpillW(c,lb,s);tpill(c,lb,M,yR-48-s*1.9,s,RED,WHITE,'left')}
  let y=yR+Math.max(56,(BOT-yR-st)/2);
  if(F)y=qhead(c,F,W/2,y,NAVY,'center');
  if(V){c.fillStyle=TEAL;c.fillRect(W/2-330,y+26,660,3);y=tvalD(c,V,W/2,y+62,{align:'center',color:SLATE,ncol:NAVY})}
  if(S)y=tspecPill(c,S,W/2,y+((F||V)?38:0),TEAL,WHITE);
  if(B)qbtnD(c,B,W/2,y+34,{align:'center',bg:NAVY,fg:WHITE,shadow:true});
  qtag(c,p,W-22,yR*.55,WHITE,true);
  foot(c,false)};

// 2 THIN · paper page, giant very thin headline stacked word by word on the right, interior render, bold value line
L.x_t_thin=(c,p,I)=>{const its0=qits(p),hd=qs(p.head),sub=qs(p.sub);c.fillStyle=PAPER;c.fillRect(0,0,W,H);
  const V=tval(c,p,its0,84,W-2*M);const its=tits(its0,V),lb=tlab(p,V);
  // value row: sub (regular) + value (bold) on one line when they fit, else two rows
  const ss=44;let sl=qwrap(c,sub,W-2*M,400,ss,2);const one=V&&sl.length===1&&(qmw(c,sl[0],400,ss)+30+(V.P?V.P.tw:qmw(c,V.ls[0],700,V.s)))<=W-2*M;
  const rowH=one?Math.max(V.h,qtH(sl,ss)):(qtH(sl,ss,ss*1.2)+(sl.length&&V?14:0)+(V?V.h:0));
  const S=its.length?qspec(c,its,W-2*M,34,2):null,B=qbtn(c,p.cta,32,560);
  const st=rowH+(S?(rowH?24:0)+qsH(S):0);
  const imgB=Math.round(BOT-st-(st?40:0));
  // headline: the given lines, or one word per line when it is a short name, else wrapped lines
  const top=120,mx=W-2*M-90;const nl=hd.includes('\n')?hd.split('\n').map(x=>x.trim()).filter(Boolean):[];const words=hd?hd.split(/\s+/).filter(Boolean):[];
  const cands=[];if(nl.length&&nl.length<=4)cands.push(nl);if(!nl.length&&words.length<=5&&words.length>1)cands.push(words);if(!nl.length&&words.length===1)cands.push(words);
  let size=0,ls=[];
  const fitIn=(avail)=>{for(const cd of cands){for(let s=260;s>=96;s-=4){if(cd.length*s*.98<=avail&&cd.every(w=>qmw(c,w,300,s,-.02)<=mx))return{s,ls:cd}}}
    if(!hd)return{s:0,ls:[]};for(let s=200;s>=72;s-=4){c.font=AL(300,s);const l2=qraw(c,()=>{LS(c,(-.02*s).toFixed(1)+'px');const r=wrapW(c,hd,mx);LS(c,'0px');return r});if((l2.length<=5&&l2.length*s*.98<=avail)||s<=72)return{s,ls:l2.slice(0,5)}}};
  let imgH=320;for(let h=540;h>=320;h-=20){const r=fitIn(imgB-h-56-top);if(!hd||r.s>=(cands.length?170:120)){imgH=h;break}}
  ({s:size,ls}=fitIn(imgB-imgH-56-top));if(!hd)imgH=Math.min(620,imgB-top-40);
  const imgT=imgB-imgH;
  if(ls.length){const blockH=ls.length*size*.98;const y0=Math.max(top,imgT-56-blockH);ls.forEach((l,i)=>QT(c,l,W-M,y0+size*.78+i*size*.98,{f:AL,w:300,size,color:NAVY,align:'right',track:-.02}))}
  if(!(p.shot2&&shot(c,I,p.shot2,M,imgT,W-2*M,imgH)))qpic(c,I,p.shot,M,imgT,W-2*M,imgH,TEAL);
  if(lb)tpill(c,lb,W-M-24,imgT+24,30,RED,WHITE,'right');
  if(B)qbtnD(c,B,M+24,imgB-24-B.h,{align:'left',bg:PAPER,fg:NAVY,shadow:true});
  let y=imgB+40;
  if(one){const sw=qmw(c,sl[0],400,ss);const base=y+rowH;
    T(c,sl[0],W-M,base-(V.P?V.P.big*.08:V.s*.2),{f:AL,w:400,size:ss,color:NAVY});tvalD(c,V,W-M-sw-30,base-V.h,{align:'right',color:NAVY,ncol:NAVY});y+=rowH}
  else{if(sl.length)y=qtxt(c,sl,W-M,y,400,ss,NAVY,'right',ss*1.2);if(V)y=tvalD(c,V,W-M,y+(sl.length?14:0),{align:'right',color:NAVY,ncol:NAVY})}
  if(S)y=qspecD(c,S,W-M,y+(rowH?24:0),{align:'right',color:SLATE,vcol:NAVY,sep:MIST});
  qtag(c,p,44,top+260,SLATE);
  foot(c,false)};

// 3 NUMBER · light field: big number mark | divider | bold statement, subline, value pill on the seam, render below
L.x_t_number=(c,p,I)=>{const its0=qits(p),hd=qs(p.head),sub=qs(p.sub);const N=hd?tnum(hd):null;
  let markT='',markSub='',stT='',subT=sub;
  if(N){markT=N.num;if(sub&&N.name&&N.name.replace(/\n/g,' ').length<=18){markSub=N.name.replace(/\n/g,' ');stT=sub;subT=''}else stT=N.name||hd}else stT=hd;
  const V=tval(c,p,its0,64,760);const its=tits(its0,V),lb=tlab(p,V);
  // mark
  let ms=210;if(markT)while(ms>110&&qmw(c,markT,700,ms,-.02)>300)ms-=6;const mW=markT?Math.max(qmw(c,markT,700,ms,-.02),markSub?Math.min(300,qmw(c,markSub,400,28,.16)):0):150;
  const mH=markT?ms*.74+(markSub?56:0):150;
  const F=stT?qfit(c,stT,W-2*M-mW-90,{w:700,max:104,min:60,lines:3,lh:1.02}):null;
  const blockH=Math.max(mH,qhH(F));const stW=F?qhW(c,F):0;const gw=mW+(F?90+stW:0);const xr=W/2+gw/2;
  const sl=qwrap(c,subT,W-2*M-40,400,40,2),S=its.length?qspec(c,its,W-2*M-40,34,2):null;
  const cH=blockH+(sl.length?44+qtH(sl,40,52):0)+(S?(sl.length?20:44)+qsH(S):0);
  const vh=V?Math.round(V.h+40):0;const yR=Math.round(Math.max(540,150+cH+64+vh/2));let y=Math.round(Math.max(150,(yR-vh/2-cH)/2+16));
  c.fillStyle=MIST1;c.fillRect(0,0,W,yR);
  qpic(c,I,p.shot,0,yR,W,H-yR,TEAL);qgrad(c,yR,yR+140,'231,238,241',.35,0);qgrad(c,H-360,H,qnavy,0,.88);
  // mark column
  const mcx=xr-mW/2;
  if(markT){QT(c,markT,mcx,y+ms*.74+(blockH-mH)/2,{f:AL,w:700,size:ms,color:TEAL,align:'center',ltr:true,track:-.02});
    if(markSub){const t=qell(c,markSub,300,400,28),yy=y+(blockH-mH)/2+ms*.74+46;const tw=qmw(c,t,400,28,.16);T(c,t,mcx,yy,{f:AL,w:400,size:28,color:NAVY,align:'center',track:.16});
      if(tw<230){c.fillStyle=TEAL;c.fillRect(mcx+tw/2+12,yy-10,30,2);c.fillRect(mcx-tw/2-42,yy-10,30,2)}}}
  else mark(c,mcx-34,y+(blockH-150)/2+10,2.2,TEAL);
  if(F){c.fillStyle=TEAL;c.fillRect(xr-mW-45-2,y+6,4,blockH-12);qhead(c,F,xr-mW-90,y+(blockH-qhH(F))/2,TEAL,'right')}
  y+=blockH;if(sl.length)y=qtxt(c,sl,W/2,y+44,400,40,NAVY,'center',52);if(S)y=qspecD(c,S,W/2,y+(sl.length?20:44),{align:'center',color:SLATE,vcol:NAVY,sep:MIST});
  // seam: status pill + value pill
  if(V||lb){const vw=V?(V.P?V.P.tw:qmw(c,V.ls[0],700,V.s))+110:0,ph=V?vh:Math.round(32*1.9),lw=lb?tpillW(c,lb,32):0,gap=V&&lb?18:0,tw=vw+lw+gap;let x=W/2+tw/2;
    if(V){c.save();tshadow(c,.25,26,8);rr(c,x-vw,yR-ph/2,vw,ph,ph/2);c.fillStyle=PAPER;c.fill();c.restore();tvalD(c,V,x-vw/2,yR-V.h/2,{align:'center',color:SLATE,ncol:NAVY});x-=vw+gap}
    if(lb)tpill(c,lb,x,yR-32*.95,32,RED,WHITE,'right')}
  const B=qbtn(c,p.cta,34,640);if(B)qbtnD(c,B,W/2,BOT-B.h,{align:'center',bg:PAPER,fg:NAVY,shadow:true});
  qtag(c,p,40,yR+(H-yR)/2-60,WHITE,true);
  foot(c,true)};

// 4 WORDMARK · night render full bleed, giant white wordmark with a light subline, white bar with the offer and a CTA arrow
L.x_t_wordmark=(c,p,I)=>{const its0=qits(p),hd=qs(p.head),sub=qs(p.sub);
  const V=tval(c,p,its0,70,W-2*M);const its=tits(its0,V),lb=tlab(p,V);
  const B=qbtn(c,p.cta,32,520);let S=its.length?qspec(c,its,B?W-2*M-B.w-40:W-2*M,32,2):null;let stack=false;
  if(S&&B&&S.L.length>1){const S1=qspec(c,its,W-2*M,32,2);if(S1.L.length===1){S=S1;stack=true}}
  const rowH=stack?qsH(S)+26+B.h:Math.max(qsH(S),B?B.h:0);const st=(V?V.h:0)+(rowH?(V?30:0)+rowH:0);
  const barT=Math.round(st?BOT-st-58:BOT-10);
  qpic(c,I,p.shot,0,0,W,barT,NAVY);qgrad(c,0,280,qnavy,.45,0);
  const F=hd?qfit(c,hd,W-2*M,{w:900,max:200,min:80,lines:2,lh:.92,track:-.03}):null;const ssz=sub.length>40?38:46,sl=qwrap(c,sub,W-2*M,300,ssz,2);
  const wH=qhH(F)+(sl.length?18+qtH(sl,ssz,ssz*1.24):0)+(lb?82:0);const wy=barT-64-wH;
  qgrad(c,Math.max(0,wy-260),barT,qnavy,0,.72);
  let y=wy;if(lb){tpill(c,lb,W/2,y,30,RED,WHITE,'center');y+=82}
  if(F){c.save();c.shadowColor='rgba(0,0,0,.3)';c.shadowBlur=30;y=qhead(c,F,W/2,y,WHITE,'center');c.restore()}
  sl.forEach((l,i)=>QT(c,l,W/2,y+18+ssz*.8+i*ssz*1.24,{f:AL,w:300,size:ssz,color:WHITE,align:'center',track:.04}));
  c.fillStyle=PAPER;c.fillRect(0,barT,W,H-barT);
  y=barT+40;if(V)y=tvalD(c,V,W/2,y,{align:'center',color:NAVY,ncol:NAVY});
  if(rowH&&stack){const ry=y+(V?30:0);qspecD(c,S,W/2,ry,{align:'center',color:SLATE,vcol:NAVY,sep:MIST});qbtnD(c,B,W/2,ry+qsH(S)+26,{align:'center',bg:NAVY,fg:WHITE})}
  else if(rowH){const ry=y+(V?30:0);if(S)qspecD(c,S,B?W-M:W/2,ry+(rowH-qsH(S))/2,{align:B?'right':'center',color:SLATE,vcol:NAVY,sep:MIST});
    if(B)qbtnD(c,B,S?M:W/2,ry+(rowH-B.h)/2,{align:S?'left':'center',bg:NAVY,fg:WHITE})}
  qtag(c,p,40,barT*.5,WHITE,true);
  foot(c,false)};

// 5 GRID · render with the name on the sky, navy panel with a 2x2 grid of big numbers, rules, status tab on the seam
L.x_t_grid=(c,p,I)=>{const its=qits(p),hd=qs(p.head),sub=qs(p.sub),lb=qs(p.label);
  const n=its.length,cw=(W-2*M)/2;
  const cells=its.map(it=>{const vs=qfit(c,qs(it.v)||'·',cw-60,{w:700,max:104,min:56,lines:1,lh:1});const ll=qwrap(c,it.l,cw-60,400,34,2);return{vs,ll,h:qhH(vs)+(ll.length?10+qtH(ll,34,40):0)}});
  const rows=[];for(let i=0;i<n;i+=2)rows.push(cells.slice(i,i+2));const rowGap=70;
  const gH=rows.reduce((a,r)=>a+Math.max(...r.map(x=>x.h)),0)+rowGap*Math.max(0,rows.length-1);
  const P=qprice(c,p.price,n?70:90,W-2*M),sl=qwrap(c,sub,W-2*M,n?400:700,n?38:56,2),B=qbtn(c,p.cta,34,640);
  const pb=!!(P&&B&&P.tw+B.w+80<=W-2*M);
  const tail=[sl.length?qtH(sl,n?38:56,n?48:66):0,pb?Math.max(qpH(P),B.h):P?qpH(P):0,(B&&!pb)?B.h:0].filter(Boolean);const tH=tail.reduce((a,b)=>a+b,0)+26*Math.max(0,tail.length-1);
  const st=gH+(gH&&tH?56:0)+tH;const pT=Math.round(Math.max(470,Math.min(860,BOT-st-(lb?96:76))));
  c.fillStyle=NAVY;c.fillRect(0,0,W,H);qpic(c,I,p.shot,0,0,W,pT,TEAL);
  const F=hd?qfit(c,hd,W-2*M-120,{w:700,max:110,min:72,lines:3,lh:1.0}):null;
  if(F){qgrad(c,0,qhH(F)+300,qnavy,.62,0);c.save();c.shadowColor='rgba(7,41,58,.45)';c.shadowBlur=24;qhead(c,F,W/2,110,WHITE,'center');c.restore()}
  qgrad(c,pT-120,pT,qnavy,0,.3);
  if(lb){const s=32,w=tpillW(c,lb,s)+24,h=72;c.beginPath();if(c.roundRect)c.roundRect(W-M-w,pT-h,w,h,[14,14,0,0]);else c.rect(W-M-w,pT-h,w,h);c.fillStyle=RED;c.fill();T(c,lb,W-M-w/2,pT-h/2+s*.36,{f:AL,w:700,size:s,color:WHITE,align:'center',track:.02})}
  let y=pT+(lb?96:76)+Math.max(0,(BOT-pT-(lb?96:76)-st)/2-6);
  rows.forEach((r,ri)=>{const rh=Math.max(...r.map(x=>x.h));r.forEach((cl,j)=>{const cx=r.length===1?W/2:(j===0?W-M-cw/2:M+cw/2);let yy=qhead(c,cl.vs,cx,y,WHITE,'center');if(cl.ll.length)qtxt(c,cl.ll,cx,yy+10,400,34,MIST,'center',40);
      if(ri<rows.length-1){c.fillStyle='rgba(143,182,200,.55)';c.fillRect(cx-110,y+rh+rowGap/2-1,220,2)}});
    if(r.length===2){c.fillStyle='rgba(143,182,200,.25)';c.fillRect(W/2-1,y+10,2,rh-20)}y+=rh+(ri<rows.length-1?rowGap:0)});
  if(gH&&tH){c.fillStyle=RED;c.fillRect(W/2-28,y+26,56,4);y+=56}
  const pieces=[];if(sl.length)pieces.push(yy=>qtxt(c,sl,W/2,yy,n?400:700,n?38:56,n?MIST:WHITE,'center',n?48:66));if(pb)pieces.push(yy=>{const rh=Math.max(qpH(P),B.h),tw=P.tw+60+B.w,x=W/2+tw/2;qpriceD(c,P,x,yy+(rh-qpH(P))/2,{align:'right',color:MIST,ncol:WHITE});qbtnD(c,B,x-tw,yy+(rh-B.h)/2,{align:'left',bg:RED,fg:WHITE});return yy+rh});
  else{if(P)pieces.push(yy=>qpriceD(c,P,W/2,yy,{align:'center',color:MIST,ncol:WHITE}))}if(B&&!pb)pieces.push(yy=>qbtnD(c,B,W/2,yy,{align:'center',bg:RED,fg:WHITE}));
  pieces.forEach((f,i)=>{y=f(y+(i?26:0))});
  qtag(c,p,W-22,pT*.5,WHITE,true);
  foot(c,true)};

// 6 STARS · night sky drawn in code, numbers at the ends of a thin rule, thin wide-spaced wordmark, bold announcement, render
L.x_t_stars=(c,p,I)=>{const its0=qits(p),hd=qs(p.head),sub=qs(p.sub),lb=qs(p.label);
  const nums=(hd.match(/\d+/g)||[]).slice(0,2);let name=hd?hd.replace(/\d+(?:\s*[-–]\s*\d+)?/g,' ').replace(/[ \t]+/g,' ').replace(/ *\n */g,'\n').trim():'';if(!name)name=hd;
  const F=name?qfit(c,name,W-2*M-140,{w:300,max:112,min:64,lines:2,lh:1.08,track:.12}):null;
  const str=sub.length>22?.06:.28,sl=qwrap(c,sub,(W-2*M-60)/(1+str*1.6),400,32,2);
  const annT=lb||'';const A=annT?qfit(c,annT,W-2*M,{w:700,max:76,min:52,lines:1,lh:1}):null;
  const P=qprice(c,p.price,A?60:76,W-2*M);
  let y=128;const yRule=y;let yy=y+40;const fY=yy;yy+=qhH(F);const sY=yy+22;if(sl.length)yy=sY+qtH(sl,32,42);const aY=yy+44;if(A)yy=aY+qhH(A);const pY=yy+(A?18:44);if(P)yy=pY+qpH(P);
  const B=qbtn(c,p.cta,34,640);const S=its0.length?qspec(c,its0,W-2*M,34,2):null;const bst=(S?qsH(S):0)+(B?(S?30:0)+B.h:0);
  const yR=Math.round(Math.max(yy+40,Math.min(620,BOT-bst-340)));
  // sky
  const g=c.createLinearGradient(0,0,0,yR);g.addColorStop(0,'#041b27');g.addColorStop(.55,NAVY);g.addColorStop(1,'#0c3f57');c.fillStyle=g;c.fillRect(0,0,W,H);
  qpic(c,I,p.shot,0,yR,W,H-yR,NAVY);
  const g2=c.createLinearGradient(0,yR-2,0,yR+420);g2.addColorStop(0,'rgba(12,63,87,1)');g2.addColorStop(.18,'rgba(12,63,87,.92)');g2.addColorStop(.6,'rgba(12,63,87,.4)');g2.addColorStop(1,'rgba(12,63,87,0)');c.fillStyle=g2;c.fillRect(0,yR-2,W,422);
  const gl=c.createRadialGradient(W/2,yR+40,10,W/2,yR+40,620);gl.addColorStop(0,'rgba(143,182,200,.22)');gl.addColorStop(1,'rgba(143,182,200,0)');c.fillStyle=gl;c.fillRect(0,0,W,yR+260);
  const R=rnd((p.seed|0)||31);c.save();for(let i=0;i<300;i++){const x=R()*W,sy=R()*(yR+120),r=R()<.9?.6+R()*1.1:1.6+R()*1.2,a=(.25+R()*.75)*Math.min(1,(yR+120-sy)/180);c.globalAlpha=a;c.fillStyle=WHITE;c.beginPath();c.arc(x,sy,r,0,Math.PI*2);c.fill();
    if(r>2.2){c.globalAlpha=a*.5;c.fillRect(x-r*4,sy-.5,r*8,1);c.fillRect(x-.5,sy-r*4,1,r*8)}}c.restore();
  qgrad(c,H-420,H,qnavy,0,.9);
  // rule with numbers at its ends
  const rw=F?Math.min(560,Math.max(360,qhW(c,F)-80)):420;c.fillStyle='rgba(143,182,200,.7)';c.fillRect(W/2-rw/2,yRule,rw,2);
  const endR=W/2+rw/2+30,endL=W/2-rw/2-30;
  if(nums[0])QT(c,nums[0],endR,yRule+13,{f:AL,w:300,size:38,color:WHITE,align:'left',ltr:true});
  if(nums[1])QT(c,nums[1],endL,yRule+13,{f:AL,w:300,size:38,color:WHITE,align:'right',ltr:true});
  else mark(c,endL-30,yRule-24,.6,MIST);
  if(!nums[0]){c.save();c.translate(endR+8,yRule+1);c.rotate(Math.PI/4);c.fillStyle=RED;c.fillRect(-7,-7,14,14);c.restore()}
  if(F)qhead(c,F,W/2,fY,WHITE,'center');
  if(sl.length)qtxt(c,sl,W/2,sY,400,32,MIST,'center',42,str);
  if(A){c.save();c.shadowColor='rgba(0,0,0,.35)';c.shadowBlur=20;qhead(c,A,W/2,aY,WHITE,'center');c.restore()}
  if(P)qpriceD(c,P,W/2,pY,{align:'center',color:MIST,ncol:WHITE});
  let by=BOT-bst;if(S)by=qspecD(c,S,W/2,by,{align:'center',color:'rgba(255,255,255,.86)',vcol:WHITE,sep:MIST})+(B?30:0);
  if(B)qbtnD(c,B,W/2,by,{align:'center',bg:PAPER,fg:NAVY,shadow:true});
  qtag(c,p,W-22,yR+(BOT-yR)/2-80,WHITE,true);
  foot(c,true)};

// 7 WAVE · render that ends in a curved wave over a paper panel, ghost glyph on the sky, headline between two rules, value, pill
L.x_t_wave=(c,p,I)=>{const its0=qits(p),hd=qs(p.head),sub=qs(p.sub);let F,sl,V,its,lb,S,B,st;
  const calc=(hm,vb)=>{F=hd?qfit(c,hd,820,{w:700,max:hm,min:72,lines:3,lh:1.02}):null;sl=qwrap(c,sub,880,400,40,2);V=tval(c,p,its0,vb,880);its=tits(its0,V);lb=tlab(p,V);
    S=its.length?qspec(c,its,900,32,1):null;B=qbtn(c,p.cta,34,620);
    st=(F?28+qhH(F)+28:0)+(sl.length?30+qtH(sl,40,50):0)+(V?18+V.h:0)+(S?20+qsH(S):0)+(B?34+B.h:0)};
  calc(100,66);if(BOT-st-110<520)calc(88,60);if(BOT-st-110<520)calc(76,56);
  const yW=Math.round(Math.max(500,Math.min(800,BOT-st-110)));
  c.fillStyle=PAPER;c.fillRect(0,0,W,H);qpic(c,I,p.shot,0,0,W,yW+80,TEAL);
  // ghost glyph on the left of the sky
  const N=hd?tnum(hd):null;const gl=N?N.num.split(/[-–]/)[0]:(hd?hd.replace(/[^א-תA-Za-z]/g,'').charAt(0):'');
  if(gl){let gs=Math.min(520,yW-60);while(gs>240&&qmw(c,gl,900,gs)>500)gs-=20;c.save();c.beginPath();c.rect(0,0,W,yW+80);c.clip();c.globalAlpha=.32;T(c,gl,M-30,yW-104,{f:AL,w:900,size:gs,color:WHITE,align:'left',ltr:!!N});c.restore()}
  if(lb)tpill(c,lb,W-M,96,30,RED,WHITE,'right');
  const wave=(o)=>{c.beginPath();c.moveTo(0,yW-90+o);c.bezierCurveTo(W*.32,yW-150+o,W*.58,yW+70+o,W,yW+20+o);c.lineTo(W,H);c.lineTo(0,H);c.closePath()};
  wave(-18);c.fillStyle='rgba(231,238,241,.85)';c.fill();wave(0);c.fillStyle=PAPER;c.fill();
  let y=yW+110+Math.max(0,(BOT-yW-110-st)/2);
  if(F){c.fillStyle=MIST;c.fillRect(W/2-340,y,680,2);y=qhead(c,F,W/2,y+28,NAVY,'center',i=>i?300:700)+28;c.fillStyle=MIST;c.fillRect(W/2-340,y-2,680,2)}
  if(sl.length)y=qtxt(c,sl,W/2,y+30,400,40,SLATE,'center',50);
  if(V)y=tvalD(c,V,W/2,y+18,{align:'center',color:SLATE,ncol:NAVY});
  if(S)y=qspecD(c,S,W/2,y+20,{align:'center',color:SLATE,vcol:NAVY,sep:MIST});
  if(B){const x0=W/2-B.w/2,yb=y+34;const gg=c.createLinearGradient(x0,0,x0+B.w,0);gg.addColorStop(0,TEAL);gg.addColorStop(1,NAVY);c.save();tshadow(c,.25,20,8);rr(c,x0,yb,B.w,B.h,B.h/2);c.fillStyle=gg;c.fill();c.restore();qbtnD(c,B,W/2,yb,{align:'center',bg:'rgba(0,0,0,0)',fg:WHITE})}
  qtag(c,p,W-22,yW*.5+40,WHITE,true);
  foot(c,false)};

// 8 CARD · rounded teal card: headline + subline on the field, darker inset box with specs and value, render, offer pill at the bottom
L.x_t_card=(c,p,I)=>{const its0=qits(p),hd=qs(p.head),sub=qs(p.sub);c.fillStyle=PAPER;c.fillRect(0,0,W,H);
  const cx0=28,cy0=28,cw=W-56,cB=H-140,cr=56;let F,sl,V,its,lb,specL,bx;
  const calc=(hm,vb)=>{F=hd?qfit(c,hd,820,{w:700,max:hm,min:72,lines:3,lh:1.02}):null;sl=qwrap(c,sub,820,300,44,2);V=tval(c,p,its0,vb,700);its=tits(its0,V);lb=tlab(p,V);
    specL=[];its.map(it=>(qs(it.v)+' '+qs(it.l)).trim()).forEach(t=>{const L0=specL.length?specL[specL.length-1]+'  ·  '+t:'';if(L0&&qmw(c,L0,400,40)<=720)specL[specL.length-1]=L0;else specL.push(qell(c,t,720,400,40))});specL=specL.slice(0,3)};
  calc(100,72);
  const B=qbtn(c,p.cta,34,700);const lbTop=lb?70:0;
  const topH=lbTop+qhH(F)+(sl.length?18+qtH(sl,44,54):0);
  const boxH=(specL.length||V)?Math.round(64+qtH(specL,40,52)+(specL.length&&V?56:0)+(V?V.h:0)):0;
  let yB=cy0+86+topH+(topH?44:0);if(yB+boxH>cB-(B?B.h+90:60)-200)calc(84,62);
  c.save();rr(c,cx0,cy0,cw,cB-cy0,cr);c.clip();c.fillStyle=TEAL;c.fillRect(cx0,cy0,cw,cB-cy0);
  const rT=Math.round(Math.min(cB-360,yB+boxH*.45));qpic(c,I,p.shot,cx0,rT,cw,cB-rT,TEAL);
  const g=c.createLinearGradient(0,rT,0,rT+220);g.addColorStop(0,'rgba(16,85,114,1)');g.addColorStop(1,'rgba(16,85,114,0)');c.fillStyle=g;c.fillRect(cx0,rT,cw,220);
  if(B)qgrad(c,cB-260,cB,qnavy,0,.6,cx0,cw);c.restore();
  let y=cy0+86;if(lb){tpill(c,lb,W/2,y-8,28,RED,WHITE,'center');y+=lbTop}
  if(F)y=qhead(c,F,W/2,y,WHITE,'center');if(sl.length)y=qtxt(c,sl,W/2,y+18,300,44,'rgba(255,255,255,.92)','center',54);
  if(boxH){const bw=Math.max(560,Math.min(860,Math.max(...specL.map(l=>qmw(c,l,400,40)),V?(V.P?V.P.tw:qmw(c,V.ls[0],700,V.s)):0)+130));c.save();tshadow(c,.35,36,12);rr(c,W/2-bw/2,yB,bw,boxH,30);c.fillStyle='rgba(7,41,58,.94)';c.fill();c.restore();
    rr(c,W/2-bw/2,yB,bw,boxH,30);c.strokeStyle='rgba(143,182,200,.35)';c.lineWidth=1.5;c.stroke();
    let yy=yB+32;if(specL.length)yy=qtxt(c,specL,W/2,yy,400,40,WHITE,'center',52);if(specL.length&&V){c.fillStyle=MIST;c.fillRect(W/2-bw*.3,yy+26,bw*.6,2);yy+=56}
    if(V)tvalD(c,V,W/2,yy,{align:'center',color:MIST,ncol:WHITE})}
  if(B){const yb=cB-36-B.h;qbtnD(c,B,W/2,yb,{align:'center',bg:RED,fg:WHITE,shadow:true})}
  qtag(c,p,W-56,(rT+cB)/2,WHITE,true);
  foot(c,false)};
G.FX.L=G.FX.L||{};Object.assign(G.FX.L,L);
})(window);
/*FX17b:END*/
