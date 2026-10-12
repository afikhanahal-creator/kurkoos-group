/*FX16a:START*/
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
const L={};// Kurkoos FX16 set A · project ad layouts: band, sketch, split, arch, sky, watermark, frame, feed
// ---- local tools (all text from p, nothing invented)
const SAFE=1196; // content must end above the brand line
const tx=t=>clean(t).trim();
function mw(c,t,w,s,track=0){c.save();c.font=AL(w,s);LS(c,(track*s).toFixed(1)+'px');const r=c.measureText(ISO(clean(t))).width;c.restore();LS(c,'0px');return r}
function fitOne(c,t,w,maxW,max,min,track=0){let s=max;while(s>min&&mw(c,t,w,s,track)>maxW)s-=2;return s}
function cut(c,t,w,s,maxW){t=tx(t);if(mw(c,t,w,s)<=maxW)return t;while(t.length>2&&mw(c,t+'…',w,s)>maxW)t=t.slice(0,-1);return t.trim()+'…'}
function F(c,t,o){const r=fit(c,t,o.maxW,{f:AL,w:o.w,max:o.max,min:o.min,lines:o.lines,track:o.track??-.01,lh:o.lh||1.06});if(r.ls.length>o.lines){r.ls=r.ls.slice(0,o.lines);let l=r.ls[o.lines-1];const tr=r.track;while(l.length>2&&mw(c,l+'…',r.w,r.size,tr)>o.maxW)l=l.replace(/\s*\S+$/,'')||l.slice(0,-1);r.ls[o.lines-1]=l.trim()+'…'}return r}
const FH=f=>f.size*.86+(f.ls.length-1)*f.lh;
// stack of blocks {h,g,fn(top)}
const B=(h,fn,g=0)=>({h,fn,g});
const SH=a=>a.reduce((s,b,i)=>s+b.h+(i?b.g:0),0);
function SD(a,y){a.forEach((b,i)=>{if(i)y+=b.g;b.fn(y);y+=b.h});return y}
function shadow(c,blur,a,dy){c.shadowColor=`rgba(7,41,58,${a})`;c.shadowBlur=blur;c.shadowOffsetY=dy||0}
// price: light prefix ("החל מ־") + bold figure
function pParts(t){t=tx(t);const i=t.search(/\d/);return i<=0?['',t]:[t.slice(0,i).trim(),t.slice(i).trim()]}
function priceW(c,t,s){const [a,b]=pParts(t);const sa=Math.max(26,Math.round(s*.46));return (a?mw(c,a,300,sa)+s*.2:0)+mw(c,b,700,s,-.01)}
function priceFit(c,t,maxW,max,min){let s=max;while(s>min&&priceW(c,t,s)>maxW)s-=2;return s}
function price(c,t,x,base,s,col,align='center'){const [a,b]=pParts(t);const sa=Math.max(26,Math.round(s*.46));const tot=priceW(c,t,s);let R=align==='center'?x+tot/2:align==='left'?x+tot:x;
  if(a){T(c,a,R,base,{f:AL,w:300,size:sa,color:col});R-=mw(c,a,300,sa)+s*.2}T(c,b,R,base,{f:AL,w:700,size:s,color:col,track:-.01});return tot}
// spec line: "v l | v l" rows, centred or right aligned
function specRows(c,its,maxW,s){const parts=its.map(it=>({it,w:(it.v?mw(c,it.v,700,s):0)+(it.v&&it.l?s*.28:0)+(it.l?mw(c,it.l,300,s):0)}));const gap=s*1.4;const rows=[];let cur=[],cw=0;
  parts.forEach(pt=>{const nw=cw+(cur.length?gap:0)+pt.w;if(cur.length&&nw>maxW){rows.push({a:cur,w:cw});cur=[pt];cw=pt.w}else{cur.push(pt);cw=nw}});if(cur.length)rows.push({a:cur,w:cw});return {rows,gap}}
function specFit(c,its,maxW,max,min,maxRows=2){let s=max;for(;;){const r=specRows(c,its,maxW,s);if((r.rows.length<=maxRows&&r.rows.every(x=>x.w<=maxW))||s<=min)return{s,...r};s-=2}}
const specH=S=>S.rows.length?S.rows.length*S.s+(S.rows.length-1)*S.s*.62:0;
function spec(c,S,x,top,col,o={}){const s=S.s;S.rows.forEach((r,ri)=>{const base=top+s*.8+ri*s*1.62;let R=o.align==='right'?x:x+r.w/2;
  r.a.forEach((pt,i)=>{if(i){c.save();c.fillStyle=col;c.globalAlpha=.45;c.fillRect(R-S.gap/2-1,base-s*.72,2,s*.84);c.restore();R-=S.gap}
    let q=R;if(pt.it.v){T(c,pt.it.v,q,base,{f:AL,w:700,size:s,color:col});q-=mw(c,pt.it.v,700,s)+(pt.it.l?s*.28:0)}if(pt.it.l)T(c,pt.it.l,q,base,{f:AL,w:300,size:s,color:col});R-=pt.w})})}
// real looking button: pill + arrow disc
function btnW(c,t,s){return mw(c,t,700,s)+s*2.2+64}
function btn(c,t,cx,top,o={}){let s=o.size||36;const maxW=o.maxW||760;while(s>30&&btnW(c,t,s)>maxW)s-=2;const label=cut(c,t,700,s,maxW-s*2.2-64);const h=o.h||88,w=btnW(c,label,s);
  const x=o.align==='right'?cx-w:o.align==='left'?cx:cx-w/2;c.save();if(o.shadow!==false)shadow(c,24,.28,8);rr(c,x,top,w,h,h/2);c.fillStyle=o.bg||RED;c.fill();c.restore();
  if(o.stroke){rr(c,x,top,w,h,h/2);c.strokeStyle=o.stroke;c.lineWidth=2;c.stroke()}
  const dr=h/2-11,dx=x+11+dr,dy=top+h/2;c.beginPath();c.arc(dx,dy,dr,0,7);c.fillStyle=o.disc||'rgba(255,255,255,.18)';c.fill();
  c.save();c.strokeStyle=o.arrow||o.fg||WHITE;c.lineWidth=3.5;c.lineCap='round';c.lineJoin='round';c.beginPath();c.moveTo(dx+12,dy);c.lineTo(dx-11,dy);c.moveTo(dx-2,dy-9);c.lineTo(dx-11,dy);c.lineTo(dx-2,dy+9);c.stroke();c.restore();
  T(c,label,x+w-s*1.1,dy+s*.34,{f:AL,w:700,size:s,color:o.fg||WHITE});return w}
// "הדמיה להמחשה בלבד" vertical at a side edge
function tagV(c,p,x,yc,col){if(tx(p.tag)!=='הדמיה')return;c.save();c.translate(x,yc);c.rotate(-Math.PI/2);T(c,'הדמיה להמחשה בלבד',0,9,{f:AL,w:400,size:26,color:col,align:'center',track:.04});c.restore()}
// second photo: p.shot2, else a tighter crop of p.shot, else a brand panel
function shot2(c,I,p,x,y,w,h,bg){if(p.shot2&&shot(c,I,p.shot2,x,y,w,h))return true;if(p.shot){const r=p.shot.r||[0,0,1,1];const s=Object.assign({},p.shot,{r:[r[0]+r[2]*.42,r[1]+r[3]*.18,r[2]*.58,r[3]*.74]});if(shot(c,I,s,x,y,w,h))return true}
  c.save();c.fillStyle=bg||TEAL;c.fillRect(x,y,w,h);grid(c,WHITE,.08,x,y,w,h);mark(c,x+w/2-40,y+h/2-60,2.6,'rgba(255,255,255,.22)');c.restore();return false}
function pic(c,I,p,x,y,w,h,bg){if(p.shot&&shot(c,I,p.shot,x,y,w,h))return true;c.save();c.fillStyle=bg||TEAL;c.fillRect(x,y,w,h);grid(c,WHITE,.08,x,y,w,h);c.restore();return false}
function lbl(p){return tx(p.label)}
// thin wordmarks keep their Light weight (the post voice would thicken them)
function raw(c,fn){const cv=c.canvas;if(!cv)return fn();const o=cv.__v151;cv.__v151=false;try{return fn()}finally{cv.__v151=o}}
function vline(c,x,y0,y1,col,w=2){c.fillStyle=col;c.fillRect(x-w/2,y0,w,y1-y0)}
function hline(c,x0,x1,y,col,w=2){c.fillStyle=col;c.fillRect(x0,y-w/2,x1-x0,w)}

// ---- line art: edge detection on p.shot (cached), fallback drawn building
const LA=new WeakMap();
function lineArt(c,I,s,x,y,w,h,rgb){if(!s||typeof document==='undefined')return false;const img=I[s.k];if(!img)return false;
  let m=LA.get(img);if(!m){m=new Map();LA.set(img,m)}const key=[(s.r||[]).join(','),s.flip?1:0,w,h,rgb].join('|');let a=m.get(key);
  if(a===undefined){a=null;try{const sc=Math.min(1,900/Math.max(w,h));const ww=Math.round(w*sc),hh=Math.round(h*sc);
    const b=document.createElement('canvas');b.width=ww;b.height=hh;const g=b.getContext('2d',{willReadFrequently:true});g.filter='grayscale(1) blur(1.6px)';
    const J={};J[s.k]=img;if(!shot(g,J,s,0,0,ww,hh))throw 0;g.filter='none';const d=g.getImageData(0,0,ww,hh).data;const N=ww*hh,Lu=new Float32Array(N),Mg=new Float32Array(N),Dr=new Uint8Array(N);
    for(let i=0;i<N;i++)Lu[i]=d[i*4]*.3+d[i*4+1]*.59+d[i*4+2]*.11;
    for(let yy=1;yy<hh-1;yy++)for(let xx=1;xx<ww-1;xx++){const i=yy*ww+xx;const a1=Lu[i-ww-1],a2=Lu[i-ww],a3=Lu[i-ww+1],b1=Lu[i-1],b3=Lu[i+1],c1=Lu[i+ww-1],c2=Lu[i+ww],c3=Lu[i+ww+1];
      const gx=(a3+2*b3+c3)-(a1+2*b1+c1),gy=(c1+2*c2+c3)-(a1+2*a2+a3);Mg[i]=Math.hypot(gx,gy);const an=Math.atan2(gy,gx);let q=Math.round(((an<0?an+Math.PI:an))/(Math.PI/4))%4;Dr[i]=q}
    // thin edges (non max suppression)
    const T2=new Float32Array(N);const off=[1,ww+1,ww,ww-1];for(let yy=1;yy<hh-1;yy++)for(let xx=1;xx<ww-1;xx++){const i=yy*ww+xx,o=off[Dr[i]],v=Mg[i];if(v>=Mg[i+o]&&v>=Mg[i-o])T2[i]=v}
    const hist=new Uint32Array(2048);let cnt=0;for(let i=0;i<N;i++){if(T2[i]>0){hist[Math.min(2047,T2[i]|0)]++;cnt++}}
    const pct=q=>{let acc=0;const lim=cnt*q;for(let k=0;k<2048;k++){acc+=hist[k];if(acc>=lim)return k}return 2047};const t0=Math.max(18,pct(.62)),t1=Math.max(t0+12,pct(.9));
    const out=g.createImageData(ww,hh),o=out.data;const [R,G,Bc]=rgb;const fx=ww*.07,ft=hh*.05,fb=hh*.16;
    for(let yy=0;yy<hh;yy++)for(let xx=0;xx<ww;xx++){const i=yy*ww+xx;let v=(T2[i]-t0)/(t1-t0);if(v<=0)continue;v=Math.min(1,v);
      const f=Math.min(1,Math.min(xx,ww-1-xx)/fx)*Math.min(1,yy/ft)*Math.min(1,(hh-1-yy)/fb);v*=f;if(v<=0)continue;const j=i*4;o[j]=R;o[j+1]=G;o[j+2]=Bc;o[j+3]=Math.round(255*Math.pow(v,.7))}
    g.clearRect(0,0,ww,hh);g.putImageData(out,0,0);
    // thicken slightly to read as pen line
    const e=document.createElement('canvas');e.width=ww;e.height=hh;const ge=e.getContext('2d');ge.drawImage(b,0,0);ge.globalAlpha=.55;ge.drawImage(b,.8,0);ge.drawImage(b,0,.8);a=e}catch(err){a=null}m.set(key,a)}
  if(!a)return false;c.save();c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';c.drawImage(a,x,y,w,h);c.restore();return true}
function drawBuilding(c,x,y,w,h,col){const k=Math.min(w/1000,h/620);const ox=x+(w-1000*k)/2,oy=y+(h-620*k);c.save();c.translate(ox,oy);c.scale(k,k);c.strokeStyle=col;c.lineWidth=3.2/Math.max(k,.5);c.lineJoin='round';c.lineCap='round';
  const L=(pts,close)=>{c.beginPath();pts.forEach(([a,b],i)=>i?c.lineTo(a,b):c.moveTo(a,b));if(close)c.closePath();c.stroke()};const Rc=(a,b,w2,h2)=>{c.strokeRect(a,b,w2,h2)};
  // annex
  L([[150,520],[150,300],[300,300]]);Rc(140,288,170,12);for(let f=0;f<2;f++){Rc(176,326+f*100,46,62);Rc(240,326+f*100,46,62)}
  // main block front
  Rc(290,150,470,370);Rc(276,128,500,22);L([[776,128],[896,174],[896,192],[776,150]]);L([[760,150],[880,192],[880,500],[760,520]]);
  [266,392].forEach(yy=>{Rc(282,yy-6,486,12);L([[768,yy-6],[888,yy+36],[888,yy+46],[768,yy+6]])});
  for(let f=0;f<3;f++){const t=f===2?412:166+f*126,hh=f===2?96:92;[316,462,608].forEach(xx=>{Rc(xx,t,120,hh);L([[xx+60,t],[xx+60,t+hh]])});L([[784,t+18+f*0],[856,t+44],[856,t+hh+16],[784,t+hh-2]])}
  // columns at ground
  [300,380,700,750].forEach(xx=>L([[xx,500],[xx,520]]));
  // trees
  const tree=(cx,base,r)=>{L([[cx,base],[cx,base-r*1.3]]);L([[cx,base-r*.9],[cx-r*.35,base-r*1.4]]);L([[cx,base-r*1.05],[cx+r*.4,base-r*1.5]]);c.beginPath();const n=9;for(let i=0;i<=n;i++){const a=Math.PI*.95+i*(Math.PI*1.1/n);const px=cx+Math.cos(a)*r,py=base-r*1.55+Math.sin(a)*r*.85;if(!i)c.moveTo(px,py);else c.quadraticCurveTo(cx+Math.cos(a-.17)*r*1.22,base-r*1.55+Math.sin(a-.17)*r*1.05,px,py)}c.stroke();
    c.beginPath();c.moveTo(cx-r,base-r*1.55);c.quadraticCurveTo(cx,base-r*.55,cx+r*1.0,base-r*1.55);c.stroke()};
  tree(90,520,72);tree(950,522,62);tree(222,524,40);
  // ground + grass ticks
  L([[30,522],[990,522]]);[[120,560],[360,572],[560,556],[800,566],[940,580],[250,598],[660,600]].forEach(([gx,gy])=>{for(let i=-2;i<=2;i++)L([[gx+i*9,gy],[gx+i*12,gy-12+Math.abs(i)*3]])});c.restore()}

// =================== 1 · BAND: top band wordmark, render, bottom band with price + CTA
L.x_p_band=(c,p,I)=>{const BG=MIST,INK=NAVY;c.fillStyle=BG;c.fillRect(0,0,W,H);
  const hd=tx(p.head),sub=tx(p.sub),la=lbl(p),its=items(p).slice(0,4),pr=tx(p.price),cta=tx(p.cta);
  // top band
  let y=70;let bandH=150;if(hd)y+=raw(c,()=>wordmark(c,hd,W/2,y,840,140,76,INK));
  if(sub){const s=fitOne(c,sub,400,760,34,28,.14);T(c,sub,W/2,y+52,{f:AL,w:400,size:s,color:INK,align:'center',track:.14});y+=60}
  bandH=(hd||sub)?Math.max(y+50,170):110;
  // bottom stack
  const st=[];if(la){const s=fitOne(c,la,300,880,60,40,.04);st.push(B(s*.86,t=>raw(c,()=>T(c,la,W/2,t+s*.8,{f:AL,w:300,size:s,color:INK,align:'center',track:.04}))))}
  if(pr){const s=priceFit(c,pr,900,76,52);st.push(B(s*.86,t=>price(c,pr,W/2,t+s*.82,s,INK),st.length?22:0))}
  if(its.length){const S=specFit(c,its,900,36,34);st.push(B(specH(S),t=>spec(c,S,W/2,t,INK),st.length?30:0))}
  if(cta)st.push(B(88,t=>btn(c,cta,W/2,t,{bg:NAVY,fg:WHITE,disc:RED}),st.length?46:0));
  const sh=SH(st);let top=SAFE-sh-(sh?10:0);let pb=st.length?top-64:SAFE-30;pb=Math.max(bandH+430,Math.min(pb,1150));if(st.length)top=Math.max(top,pb+64);
  // photo with chamfered corner (the bottom band climbs into the image)
  pic(c,I,p,0,bandH,W,pb-bandH);const ch=Math.min(250,(pb-bandH)*.4);c.fillStyle=BG;c.beginPath();c.moveTo(W,pb-ch);c.lineTo(W,pb+1);c.lineTo(W-ch,pb+1);c.closePath();c.fill();
  c.fillStyle=RED;c.fillRect(M,pb-6,72,6);
  tagV(c,p,30,bandH+(pb-bandH)/2,'rgba(255,255,255,.85)');SD(st,top);foot(c,false)};

// =================== 2 · SKETCH: solid colour, framed wordmark, line art of the photo, price pill
L.x_p_sketch=(c,p,I)=>{const BG=(p.seed|0)%2?TEAL:NAVY;c.fillStyle=BG;c.fillRect(0,0,W,H);
  const hd=tx(p.head),sub=tx(p.sub),la=lbl(p),its=items(p).slice(0,4),pr=tx(p.price),cta=tx(p.cta);
  // faint ghost of the photo behind (depth, like a blueprint underlay)
  if(p.shot){c.save();c.globalAlpha=.07;c.filter='grayscale(1)';shot(c,I,p.shot,0,380,W,700);c.restore();c.filter='none'}
  grid(c,WHITE,.035,0,0,W,H,54);
  // framed wordmark box
  let boxB=90;if(hd||la||sub){const f=hd?F(c,hd,{maxW:600,w:700,max:96,min:72,lines:2,track:.04,lh:1.04}):null;
    let iw=f?Math.max(...f.ls.map(l=>mw(c,l,700,f.size,.04))):0;if(la)iw=Math.max(iw,mw(c,la,400,34,.3)+60);if(sub)iw=Math.max(iw,mw(c,sub,400,30,.12)+60);
    const bw=Math.min(720,Math.max(460,iw+140)),bx=(W-bw)/2,by=96;const ih=(f?FH(f):0);const bh=ih+(la?92:56)+(sub?92:56);
    c.save();shadow(c,30,.35,10);c.fillStyle=PAPER;c.fillRect(bx,by,bw,bh);c.restore();const inset=22;c.strokeStyle=NAVY;c.lineWidth=2;c.strokeRect(bx+inset,by+inset,bw-2*inset,bh-2*inset);
    if(la){const lw=mw(c,la,400,34,.3)+36;c.fillStyle=PAPER;c.fillRect(W/2-lw/2,by+inset-4,lw,8);T(c,la,W/2,by+inset+12+20,{f:AL,w:400,size:34,color:NAVY,align:'center',track:.3})}
    if(f)raw(c,()=>head(c,f,W/2,by+(la?92:56)-6,NAVY,{align:'center'}));
    if(sub){const s=fitOne(c,sub,400,bw-120,30,26,.12);const lw=mw(c,sub,400,s,.12)+36;c.fillStyle=PAPER;c.fillRect(W/2-lw/2,by+bh-inset-4,lw,8);T(c,sub,W/2,by+bh-inset-2+s*.36-(s*.5),{f:AL,w:400,size:s,color:NAVY,align:'center',track:.12})}
    boxB=by+bh}
  // bottom stack
  const st=[];if(its.length){const S=specFit(c,its,900,38,34);st.push(B(specH(S),t=>spec(c,S,W/2,t,PAPER)))}
  if(pr){const s=priceFit(c,pr,700,50,40);const pw=Math.min(900,priceW(c,pr,s)+200);st.push(B(92,t=>{rr(c,W/2-pw/2,t,pw,92,46);c.fillStyle=PAPER;c.fill();price(c,pr,W/2+20,t+46+s*.34,s,NAVY);
      c.save();c.strokeStyle=NAVY;c.lineWidth=3.5;c.lineCap='round';c.beginPath();c.moveTo(W/2-pw/2+58,t+34);c.lineTo(W/2-pw/2+46,t+46);c.lineTo(W/2-pw/2+58,t+58);c.stroke();c.restore()},st.length?40:0))}
  if(cta)st.push(B(88,t=>btn(c,cta,W/2,t,{bg:RED,fg:WHITE}),st.length?(pr?28:44):0));
  const sh=SH(st),top=SAFE-sh;const a0=boxB+46,a1=(st.length?top-50:SAFE-20);
  // drawing area
  const dw=W-2*M,dh=Math.max(200,a1-a0);const rgb=[247,248,250];
  if(!lineArt(c,I,p.shot,M,a0,dw,dh,rgb))drawBuilding(c,M+20,a0+10,dw-40,dh-30,'rgba(247,248,250,.92)');
  tagV(c,p,36,a0+dh/2,'rgba(255,255,255,.7)');SD(st,top);foot(c,true)};

// =================== 3 · SPLIT: band + ribbon, lifestyle | exterior split under a dome edge, big name
L.x_p_split=(c,p,I)=>{c.fillStyle=PAPER;c.fillRect(0,0,W,H);
  const hd=tx(p.head),sub=tx(p.sub),la=lbl(p),its=items(p).slice(0,4),pr=tx(p.price),cta=tx(p.cta);
  // band
  let bandH=la?246:(sub?150:96);c.fillStyle=TEAL;c.fillRect(0,0,W,bandH);
  if(la){const s=fitOne(c,la,700,900,104,72,-.01);T(c,la,W/2,(sub?60:66)+s*.8,{f:AL,w:700,size:s,color:WHITE,align:'center',track:-.01})}
  // bottom stack first (decides how tall the photos are)
  const st=[];if(hd){const f=F(c,hd,{maxW:900,w:900,max:150,min:76,lines:2,track:-.02,lh:.98});st.push(B(FH(f),t=>head(c,f,W/2,t,NAVY,{align:'center'})))}
  if(its.length){const S=specFit(c,its,900,36,34);st.push(B(specH(S),t=>spec(c,S,W/2,t,SLATE),st.length?34:0))}
  if(pr){const s=priceFit(c,pr,900,64,52);st.push(B(s*.86,t=>price(c,pr,W/2,t+s*.82,s,NAVY),st.length?28:0))}
  if(cta)st.push(B(88,t=>btn(c,cta,W/2,t,{bg:RED,fg:WHITE}),st.length?40:0));
  const sh=SH(st);const top=SAFE-sh;let yb=st.length?top+30:SAFE-10;yb=Math.min(Math.max(yb,bandH+520),1120);
  const py=bandH,dome=150;
  // photos clipped under a dome edge
  c.save();c.beginPath();c.moveTo(0,py);c.lineTo(W,py);c.lineTo(W,yb);c.quadraticCurveTo(W/2,yb-dome*2,0,yb);c.closePath();c.clip();
  const gw=10,hw=(W-gw)/2;pic(c,I,p,hw+gw,py,hw,yb-py);if(!p.shot2&&p.shot){c.fillStyle=NAVY;c.fillRect(0,py,hw,yb-py);grid(c,WHITE,.04,0,py,hw,yb-py,54);if(!lineArt(c,I,p.shot,0,py+20,hw,yb-py-20,[247,248,250]))shot2(c,I,p,0,py,hw,yb-py,NAVY)}else shot2(c,I,p,0,py,hw,yb-py,NAVY);c.fillStyle=PAPER;c.fillRect(hw,py,gw,yb-py);c.restore();
  // ribbon with the sub line, across the band edge
  if(sub){const s=fitOne(c,sub,400,760,46,34,0);const rw=Math.min(980,mw(c,sub,400,s)+150),rh=s+44,rx=(W-rw)/2,ry=bandH-rh/2-(la?6:0);const n=26;
    c.save();shadow(c,18,.3,6);c.fillStyle=NAVY;c.beginPath();c.moveTo(rx-n,ry);c.lineTo(rx+rw+n,ry);c.lineTo(rx+rw,ry+rh/2);c.lineTo(rx+rw+n,ry+rh);c.lineTo(rx-n,ry+rh);c.lineTo(rx,ry+rh/2);c.closePath();c.fill();c.restore();
    T(c,sub,W/2,ry+rh/2+s*.34,{f:AL,w:400,size:s,color:WHITE,align:'center'})}
  tagV(c,p,W-30,py+(yb-py)*.55,'rgba(255,255,255,.85)');
  SD(st,top);foot(c,false)};

// =================== 4 · ARCH: headline block on paper, render inside an arch with a navy echo
L.x_p_arch=(c,p,I)=>{c.fillStyle=PAPER;c.fillRect(0,0,W,H);
  const hd=tx(p.head),sub=tx(p.sub),la=lbl(p),its=items(p).slice(0,4),pr=tx(p.price),cta=tx(p.cta);
  const X=W-M,MW=760;const st=[];
  if(hd){const f=F(c,hd,{maxW:MW,w:900,max:104,min:72,lines:2,track:-.02,lh:1.0});st.push(B(FH(f),t=>head(c,f,X,t,NAVY)))}
  if(sub){const s=fitOne(c,sub,300,MW,40,34,0);st.push(B(s*.86,t=>T(c,sub,X,t+s*.8,{f:AL,w:300,size:s,color:SLATE}),st.length?22:0))}
  if(its.length){const S=specFit(c,its,MW,36,34);st.push(B(specH(S),t=>spec(c,S,X,t,NAVY,{align:'right'}),st.length?24:0))}
  if(pr){const s=priceFit(c,pr,MW,72,52);st.push(B(s*.86,t=>price(c,pr,X,t+s*.82,s,NAVY,'right'),st.length?24:0))}
  const y0=84;const tb=SD(st,y0);
  // thin rules
  vline(c,M,190,Math.max(tb,y0+260),NAVY,2);
  // arch
  const top=(st.length?tb+60:150),bot=SAFE+8;const r=400,ry=Math.max(200,Math.min(r,(bot-top)*.52));const aw=2*r,ax=(W-aw)/2-24,cx=ax+r;
  const arch=(x,y,b)=>{c.beginPath();c.moveTo(x,b);c.lineTo(x,y+ry);c.ellipse(x+r,y+ry,r,ry,0,Math.PI,0);c.lineTo(x+2*r,b);c.closePath()};
  c.save();arch(ax+64,top+56,bot);c.fillStyle=NAVY;c.fill();c.restore();
  c.save();c.strokeStyle=NAVY;c.lineWidth=2;c.beginPath();c.ellipse(cx+64,top+56+ry,r+46,ry+46,0,Math.PI*1.08,Math.PI*1.92);c.stroke();c.restore();
  c.save();arch(ax,top,bot);c.clip();pic(c,I,p,ax,top,aw,bot-top);const g=c.createLinearGradient(0,bot-260,0,bot);g.addColorStop(0,'rgba(7,41,58,0)');g.addColorStop(1,'rgba(7,41,58,.55)');c.fillStyle=g;c.fillRect(ax,bot-260,aw,260);c.restore();
  // label disc on the arch shoulder
  if(la){const R=92;const bx=cx+r*Math.cos(.75),by=top+ry-ry*Math.sin(.75);c.save();shadow(c,24,.3,8);c.beginPath();c.arc(bx,by,R,0,7);c.fillStyle=RED;c.fill();c.restore();
    let s=34;let ls;for(;;){c.font=AL(700,s);ls=wrapW(c,ISO(la),R*1.5);if((ls.length<=2&&ls.every(l=>c.measureText(l).width<=R*1.6))||s<=26)break;s-=2}ls=ls.slice(0,3);
    const lh=s*1.05;ls.forEach((l,i)=>T(c,l,bx,by+s*.34+(i-(ls.length-1)/2)*lh,{f:AL,w:700,size:s,color:WHITE,align:'center'}))}
  if(cta)btn(c,cta,cx,bot-88-44,{bg:WHITE,fg:NAVY,disc:RED,arrow:WHITE,maxW:aw-60});
  tagV(c,p,ax-28,top+ry+(bot-top-ry)/2,SLATE);
  c.fillStyle=PAPER;c.fillRect(0,SAFE+8,W,H-SAFE-8);foot(c,false)};

// =================== 5 · SKY: wordmark over the sky, full bleed render
function wordmark(c,t,cx,top,maxW,max,min,col){t=tx(t);const m=!t.includes('\n')&&t.match(/^(.+?)\s+(\d[\d\-–/]*)$/);
  if(m){const name=m[1],nb=m[2];let s=max;const tot=s=>mw(c,name,300,s,.01)+s*.12+mw(c,nb,300,s*.42);while(s>min&&tot(s)>maxW)s-=2;if(tot(s)<=maxW){const w=tot(s);const R=cx+w/2;T(c,name,R,top+s*.8,{f:AL,w:300,size:s,color:col,track:.01});
      T(c,nb,R-mw(c,name,300,s,.01)-s*.12,top+s*.36,{f:AL,w:300,size:Math.round(s*.42),color:col,align:'right'});return s*.86}}
  const f=F(c,t,{maxW,w:300,max,min,lines:2,track:.01,lh:.98});head(c,f,cx,top,col,{align:'center'});return FH(f)}
L.x_p_sky=(c,p,I)=>{const hd=tx(p.head),sub=tx(p.sub),la=lbl(p),its=items(p).slice(0,4),pr=tx(p.price),cta=tx(p.cta);
  pic(c,I,p,0,0,W,H,NAVY);shade(c,0,700,.8,0);
  let y=96;if(la){const s=30;const pw=mw(c,la,400,s,.16)+56;rr(c,W/2-pw/2,y,pw,58,29);c.strokeStyle='rgba(255,255,255,.8)';c.lineWidth=2;c.stroke();T(c,la,W/2,y+29+s*.34,{f:AL,w:400,size:s,color:WHITE,align:'center',track:.16});y+=96}
  if(hd){c.save();shadow(c,30,.55,2);y+=raw(c,()=>wordmark(c,hd,W/2,y,800,150,80,WHITE));c.restore()}
  if(sub){const s=fitOne(c,sub,400,760,34,28,.3);T(c,sub,W/2,y+58,{f:AL,w:400,size:s,color:WHITE,align:'center',track:.3});y+=64}
  const st=[];if(its.length){const S=specFit(c,its,900,40,34);st.push(B(specH(S),t=>spec(c,S,W/2,t,WHITE)))}
  if(pr){const s=priceFit(c,pr,900,72,52);st.push(B(s*.86,t=>price(c,pr,W/2,t+s*.82,s,WHITE),st.length?30:0))}
  if(cta)st.push(B(88,t=>btn(c,cta,W/2,t,{bg:WHITE,fg:NAVY,disc:RED,arrow:WHITE}),st.length?40:0));{const t0=SAFE-SH(st)-6,a=Math.min(t0-60,1000),b=Math.max(560,a-300);const g=c.createLinearGradient(0,b,0,H);g.addColorStop(0,'rgba(7,41,58,0)');g.addColorStop((a-b)/(H-b),'rgba(7,41,58,.8)');g.addColorStop(1,'rgba(7,41,58,.95)');c.fillStyle=g;c.fillRect(0,b,W,H-b);SD(st,t0)}
  tagV(c,p,34,760,'rgba(255,255,255,.8)');foot(c,true)};

// =================== 6 · WATERMARK: huge thin number across photo and panel, framed label box on the seam
L.x_p_watermark=(c,p,I)=>{const hd=tx(p.head),sub=tx(p.sub),la=lbl(p),its=items(p).slice(0,4),pr=tx(p.price),cta=tx(p.cta);const BG=TEAL;
  const st=[];const lab=la?96:0;
  if(its.length){const S=specFit(c,its,880,40,34);st.push(B(specH(S),t=>spec(c,S,W/2,t,WHITE)))}
  if(pr){const s=priceFit(c,pr,760,64,52);st.push(B(s*.86+56,t=>{const w=Math.max(priceW(c,pr,s)+120,520);hline(c,W/2-w/2,W/2+w/2,t,'rgba(255,255,255,.55)');price(c,pr,W/2,t+28+s*.8,s,WHITE);hline(c,W/2-w/2,W/2+w/2,t+s*.86+56,'rgba(255,255,255,.55)')},st.length?34:0))}
  if(cta)st.push(B(88,t=>btn(c,cta,W/2,t,{bg:WHITE,fg:NAVY,disc:RED,arrow:WHITE}),st.length?42:0));
  const sh=SH(st);let seam=SAFE-sh-(lab?lab/2+60:70);seam=Math.max(560,Math.min(seam,900));const top=seam+(lab?lab/2+52:70);
  pic(c,I,p,0,0,W,seam,NAVY);{const e=Math.min(seam,hd.includes('\n')||hd.length>16?620:480);const g=c.createLinearGradient(0,0,0,e);g.addColorStop(0,'rgba(7,41,58,.9)');g.addColorStop(.6,'rgba(7,41,58,.68)');g.addColorStop(1,'rgba(7,41,58,0)');c.fillStyle=g;c.fillRect(0,0,W,e)}c.fillStyle=BG;c.fillRect(0,seam,W,H-seam);
  // watermark
  const nm=(hd.match(/\d+(?:[-–]\d+)?/)||[])[0];
  c.save();c.globalAlpha=.16;if(nm){const n=String(nm).replace(/[^\d\-–]/g,'').slice(0,5);let s=980;while(s>300&&mw(c,n,300,s,-.04)>W*1.05)s-=20;raw(c,()=>T(c,n,W/2,seam+s*.36,{f:AL,w:300,size:s,color:WHITE,align:'center',track:-.04}))}
  else{c.beginPath();c.rect(0,seam,W,H-seam);c.clip();c.globalAlpha=.08;mark(c,W/2-240,seam+40,15,WHITE)}c.restore();
  if(hd){c.save();shadow(c,30,.55,2);raw(c,()=>wordmark(c,hd,W/2,92,820,132,76,WHITE));c.restore()}
  if(sub){const s=fitOne(c,sub,700,760,32,26,.34);const yy=hd?92+raw(c,()=>wordmarkH(c,hd))+56:120;T(c,sub,W/2,yy,{f:AL,w:700,size:s,color:WHITE,align:'center',track:.34})}
  if(la){const s=fitOne(c,la,300,700,62,40,.14);const bw=Math.max(420,mw(c,la,300,s,.14)+120),bx=W/2-bw/2,by=seam-lab/2;c.save();shadow(c,26,.3,8);c.fillStyle=BG;c.fillRect(bx,by,bw,lab);c.restore();
    c.strokeStyle='rgba(255,255,255,.85)';c.lineWidth=2;c.strokeRect(bx+9,by+9,bw-18,lab-18);raw(c,()=>T(c,la,W/2,by+lab/2+s*.33,{f:AL,w:300,size:s,color:WHITE,align:'center',track:.14}))}
  tagV(c,p,32,seam-200,'rgba(255,255,255,.85)');SD(st,top);foot(c,true)};
function wordmarkH(c,t){t=tx(t);const m=!t.includes('\n')&&t.match(/^(.+?)\s+(\d[\d\-–/]*)$/);if(m){let s=132;const tot=s=>mw(c,m[1],300,s,.01)+s*.12+mw(c,m[2],300,s*.42);while(s>76&&tot(s)>820)s-=2;if(tot(s)<=820)return s*.86}const f=F(c,t,{maxW:820,w:300,max:132,min:76,lines:2,track:.01,lh:.98});return FH(f)}

// =================== 7 · FRAME: address over the sky, framed spec + price box, render beneath
L.x_p_frame=(c,p,I)=>{const hd=tx(p.head),sub=tx(p.sub),la=lbl(p),its=items(p).slice(0,4),pr=tx(p.price),cta=tx(p.cta);
  pic(c,I,p,0,0,W,H,NAVY);shade(c,900,H,0,.9);
  // top text block: head (bold) + sub (light), on one line when they fit
  const top=[];
  if(hd){const one=sub&&!hd.includes('\n')&&mw(c,hd,700,76)+mw(c,sub,300,64)+28<=900;
    if(one){const s=76;top.push(B(s*.86,t=>{const w1=mw(c,hd,700,s),w2=mw(c,sub,300,64);const R=W/2+(w1+w2+28)/2;T(c,hd,R,t+s*.8,{f:AL,w:700,size:s,color:WHITE});T(c,sub,R-w1-28,t+s*.8,{f:AL,w:300,size:64,color:WHITE})}))}
    else{const f=F(c,hd,{maxW:900,w:700,max:84,min:72,lines:2,track:-.01,lh:1.04});top.push(B(FH(f),t=>head(c,f,W/2,t,WHITE,{align:'center'})));
      if(sub){const s=fitOne(c,sub,300,880,46,34);top.push(B(s*.86,t=>T(c,sub,W/2,t+s*.8,{f:AL,w:300,size:s,color:WHITE,align:'center'}),20))}}}
  else if(sub){const s=fitOne(c,sub,300,880,64,40);top.push(B(s*.86,t=>T(c,sub,W/2,t+s*.8,{f:AL,w:300,size:s,color:WHITE,align:'center'})))}
  const y0=124,y=y0+SH(top);
  const inner=[];if(its.length){const S=specFit(c,its,800,48,34);inner.push(B(specH(S),t=>spec(c,S,W/2,t,WHITE)))}
  if(pr){const s=priceFit(c,pr,800,92,52);inner.push(B(s*.86,t=>price(c,pr,W/2,t+s*.82,s,WHITE),inner.length?30:0))}
  const fy=y+(top.length?(la?84:56):0),fh=inner.length?SH(inner)+(la?96:74):(la?58:0),fb=fy+fh;
  {const e=Math.min(H,Math.max(fb,y)+320);const g=c.createLinearGradient(0,0,0,e);g.addColorStop(0,'rgba(7,41,58,.9)');g.addColorStop(Math.max(fb,y)/e,'rgba(7,41,58,.66)');g.addColorStop(1,'rgba(7,41,58,0)');c.fillStyle=g;c.fillRect(0,0,W,e)}
  SD(top,y0);
  if(inner.length){c.save();c.fillStyle='rgba(7,41,58,.35)';c.fillRect(M,fy,W-2*M,fh);c.restore();c.strokeStyle=WHITE;c.lineWidth=3;c.strokeRect(M,fy,W-2*M,fh);SD(inner,fy+(la?56:40));
    if(la){const s=30,pw=mw(c,la,700,s,.06)+52;c.fillStyle=RED;c.fillRect(W/2-pw/2,fy-24,pw,48);T(c,la,W/2,fy+s*.34,{f:AL,w:700,size:s,color:WHITE,align:'center',track:.06})}}
  else if(la){const s=32,pw=mw(c,la,700,s,.06)+60;c.fillStyle=RED;c.fillRect(W/2-pw/2,fy,pw,58);T(c,la,W/2,fy+29+s*.34,{f:AL,w:700,size:s,color:WHITE,align:'center',track:.06})}
  if(cta)btn(c,cta,W/2,SAFE-88-8,{bg:WHITE,fg:NAVY,disc:RED,arrow:WHITE});
  tagV(c,p,34,1000,'rgba(255,255,255,.8)');foot(c,true)};

// =================== 8 · FEED: render on top, bold two line headline under it, spec, price, feed bar with CTA
L.x_p_feed=(c,p,I)=>{c.fillStyle=WHITE;c.fillRect(0,0,W,H);const hd=tx(p.head),sub=tx(p.sub),la=lbl(p),its=items(p).slice(0,4),pr=tx(p.price),cta=tx(p.cta);
  const st=[];if(hd){const f=F(c,hd,{maxW:900,w:900,max:112,min:72,lines:2,track:-.02,lh:1.0});st.push(B(FH(f),t=>head(c,f,W/2,t,NAVY,{align:'center'})))}
  if(its.length){const S=specFit(c,its,900,38,34);st.push(B(specH(S),t=>spec(c,S,W/2,t,SLATE),st.length?30:0))}
  if(pr){const s=priceFit(c,pr,900,58,52);st.push(B(s*.86,t=>price(c,pr,W/2,t+s*.82,s,NAVY),st.length?22:0))}
  const bar=(sub||cta)?124:0;const sh=SH(st);const barY=SAFE-bar+2;let top=(bar?barY-46:SAFE-10)-sh;let ph=st.length?top-56:barY-40;ph=Math.max(560,Math.min(ph,bar?barY-40:1150));top=Math.max(top,ph+56);
  pic(c,I,p,0,0,W,ph);
  if(la){shade(c,ph-260,ph,0,.75);const s=fitOne(c,la,700,880,78,52,-.01);c.save();shadow(c,18,.45,3);T(c,la,W/2,ph-34,{f:AL,w:700,size:s,color:WHITE,align:'center',track:-.01});c.restore()}
  tagV(c,p,30,ph*.45,'rgba(255,255,255,.85)');SD(st,top);
  if(bar){c.fillStyle=MIST1;c.fillRect(0,barY,W,bar);hline(c,0,W,barY,LINE,2);
    const bw=cta?Math.min(520,btnW(c,cta,34)):0;if(cta){btn(c,cta,M,barY+(bar-80)/2,{align:'left',bg:TEAL,fg:WHITE,h:80,size:34,maxW:520,shadow:false})}
    if(sub){const mx=W-2*M-(cta?bw+40:0);const s=fitOne(c,sub,700,mx,36,30);T(c,cut(c,sub,700,s,mx),W-M,barY+bar/2+s*.34,{f:AL,w:700,size:s,color:NAVY})}}
  foot(c,false)};
G.FX.L=G.FX.L||{};Object.assign(G.FX.L,L);
})(window);
/*FX16a:END*/
