/*FX17a:START*/
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
const L={};const SAFE=1196; // content must end above the brand line
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
// Kurkoos FX17 set A · project ad layouts round 2: stack, bands, panel, labels, badge, burst, list, sunset
// ---- round 2 tools
// headline that must fit a box: biggest size whose wrap fits both the line count and the height
function FB(c,t,o){const tr=o.track??-.01,lh=o.lh||1.0;let s=o.max;
  for(;;){const r=fit(c,t,o.maxW,{f:AL,w:o.w,max:s,min:s,lines:o.lines,track:tr,lh});if((r.ls.length<=o.lines&&FH(r)<=o.maxH)||s<=o.min)break;s-=4}
  let n=o.lines;while(n>1&&s*.86+(n-1)*s*lh>o.maxH)n--;return F(c,t,{maxW:o.maxW,w:o.w,max:s,min:s,lines:n,track:tr,lh})}
function FBest(c,t,o){const a=FB(c,t,o);const ws=t.split(/\s+/).filter(Boolean);if(ws.length<2||ws.length>4)return a;const b=FB(c,ws.join('\n'),o);const tr=r=>r.ls.some(l=>/…$/.test(l));return (!tr(b)&&(b.size>a.size+6||tr(a)))?b:a}
// the price slot: price, else the status word, else the first spec
function slot(p,its,la){const pr=tx(p.price);if(pr)return{kind:'price',t:pr};if(la)return{kind:'label',t:la};if(its.length)return{kind:'spec',t:(its[0].v+' '+its[0].l).trim(),it:its[0]};return null}
function rest(S,its,la){return{its:S&&S.kind==='spec'?its.slice(1):its,la:S&&S.kind==='label'?'':la}}
const sa=s=>Math.max(26,Math.round(s*.46));
function valW(c,S,s,wv=700){if(S.kind==='spec'){const it=S.it;return (it.v?mw(c,it.v,wv,s,-.01):0)+(it.v&&it.l?s*.2:0)+(it.l?mw(c,it.l,300,sa(s)):0)}if(S.kind==='label')return mw(c,S.t,wv,s,-.01);return priceW(c,S.t,s)}
function valFit(c,S,maxW,max,min,wv){let s=max;while(s>min&&valW(c,S,s,wv)>maxW)s-=2;return s}
function val(c,S,x,base,s,col,align='center',wv=700){if(S.kind==='price')return price(c,S.t,x,base,s,col,align);const tot=valW(c,S,s,wv);let R=align==='center'?x+tot/2:align==='left'?x+tot:x;
  if(S.kind==='label'){T(c,cut(c,S.t,wv,s,W-2*M),R,base,{f:AL,w:wv,size:s,color:col,track:-.01});return tot}
  const it=S.it;if(it.v){T(c,it.v,R,base,{f:AL,w:wv,size:s,color:col,track:-.01});R-=mw(c,it.v,wv,s,-.01)+(it.l?s*.2:0)}if(it.l)T(c,it.l,R,base,{f:AL,w:300,size:sa(s),color:col});return tot}
const itT=it=>(it.v+' '+it.l).trim();
// one spec as a line: bold value + light label
function itW(c,it,s,wv=700){return (it.v?mw(c,it.v,wv,s):0)+(it.v&&it.l?s*.26:0)+(it.l?mw(c,it.l,400,s):0)}
function itLine(c,it,x,base,s,col,align='right',wv=700){const w=itW(c,it,s,wv);let R=align==='center'?x+w/2:align==='left'?x+w:x;if(it.v){T(c,it.v,R,base,{f:AL,w:wv,size:s,color:col});R-=mw(c,it.v,wv,s)+(it.l?s*.26:0)}if(it.l)T(c,it.l,R,base,{f:AL,w:400,size:s,color:col});return w}
function itFit(c,its,maxW,max,min,wv){let s=max;while(s>min&&its.some(it=>itW(c,it,s,wv)>maxW))s-=2;return s}
// wrapped lines at a fixed size
function wrapAt(c,t,w,s,maxW,track=0){c.save();c.font=AL(w,s);LS(c,(track*s).toFixed(1)+'px');const r=wrapW(c,ISO(t),maxW);c.restore();LS(c,'0px');return r}
function pill(c,t,x,top,o={}){const s=o.size||30,h=o.h||56;const w=mw(c,t,700,s,o.track||.02)+(o.pad||30)*2;const X=o.align==='left'?x:o.align==='center'?x-w/2:x-w;rr(c,X,top,w,h,o.r??h/2);c.fillStyle=o.bg||RED;c.fill();
  T(c,t,X+w/2,top+h/2+s*.34,{f:AL,w:700,size:s,color:o.fg||WHITE,align:'center',track:o.track||.02});return w}
function clipRR(c,x,y,w,h,r,fn){c.save();rr(c,x,y,w,h,r);c.clip();fn();c.restore()}

// =================== 1 · STACK: colour field, interior on top, tall render left, huge stacked headline right
L.x_r_stack=(c,p,I)=>{const BG=(p.seed|0)%2?TEAL:NAVY;c.fillStyle=BG;c.fillRect(0,0,W,H);
  const hd=tx(p.head),sub=tx(p.sub),la0=lbl(p),its0=items(p).slice(0,4),cta=tx(p.cta);const S=slot(p,its0,la0),{its,la}=rest(S,its0,la0);
  const top0=84,ih=300,y1=top0+ih+40,bot=cta?SAFE-88-40:SAFE-10;
  shot2(c,I,p,M,top0,W-2*M,ih,BG===NAVY?TEAL:NAVY);
  const rw=430,rx=M;pic(c,I,p,rx,y1,rw,bot-y1,BG===NAVY?TEAL:NAVY);tagV(c,p,rx+26,y1+(bot-y1)/2,'rgba(255,255,255,.9)');
  const X=W-M,CW=X-(rx+rw+44);
  // bottom group (bottom aligned to the render)
  const g=[];if(sub){const s=fitOne(c,sub,700,CW,44,34);const ls=wrapAt(c,sub,700,s,CW).slice(0,2);g.push(B(s*.86+(ls.length-1)*s*1.12,t=>ls.forEach((l,i)=>T(c,l,X,t+s*.8+i*s*1.12,{f:AL,w:700,size:s,color:MIST}))))}
  if(its.length){const cw2=(CW-24)/2,rows=Math.ceil(its.length/2);let sl=30;while(sl>26&&its.some(it=>mw(c,it.l,400,sl)>cw2))sl-=2;const sv=44,rh=sv*.86+10+sl*.86;
    g.push(B(rows*rh+(rows-1)*22,t=>its.forEach((it,i)=>{const cx=X-(i%2)*(cw2+24),ty=t+Math.floor(i/2)*(rh+22);c.fillStyle='rgba(143,182,200,.45)';c.fillRect(cx-cw2,ty-12,cw2,1.5);
      if(it.v)T(c,cut(c,it.v,700,sv,cw2),cx,ty+sv*.8,{f:AL,w:700,size:sv,color:MIST});T(c,cut(c,it.l,400,sl,cw2),cx,ty+sv*.86+10+sl*.8,{f:AL,w:400,size:sl,color:WHITE})}),g.length?34:0))}
  if(S){const s=valFit(c,S,CW,76,40);g.push(B(s*.86,t=>val(c,S,X,t+s*.82,s,WHITE,'right'),g.length?34:0))}
  const gh=SH(g),gt=bot-gh;SD(g,gt);
  let ht=y1-6;if(la){pill(c,la,X,y1,{size:30,h:56});ht=y1+56+30}
  if(hd){const f=FBest(c,hd,{maxW:CW,maxH:(g.length?gt-44:bot)-ht,w:900,max:150,min:72,lines:5,lh:.96,track:-.02});head(c,f,X,ht,WHITE)}
  if(cta)btn(c,cta,W/2,SAFE-88-6,{bg:WHITE,fg:NAVY,disc:RED,arrow:WHITE});
  foot(c,true)};

// =================== 2 · BANDS: navy headline band, teal band with value line, rounded render card, map pin, navy base
L.x_r_bands=(c,p,I)=>{const hd=tx(p.head),sub=tx(p.sub),la0=lbl(p),its0=items(p).slice(0,4),cta=tx(p.cta);const S=slot(p,its0,la0),{its,la}=rest(S,its0,la0);
  c.fillStyle=TEAL;c.fillRect(0,0,W,H);
  let bandH=0;let f=null;if(hd){f=F(c,hd,{maxW:920,w:900,max:124,min:72,lines:2,track:-.02,lh:1.0});bandH=Math.max(220,FH(f)+136)}
  if(bandH){c.fillStyle=NAVY;c.fillRect(0,0,W,bandH)}if(f)head(c,f,W/2,(bandH-FH(f))/2-4,WHITE,{align:'center'});
  const baseT=cta?1084:1170;c.fillStyle=NAVY;c.fillRect(0,baseT,W,H-baseT);
  let y=bandH?bandH+40:110;if(S){const s=valFit(c,S,W-2*M,100,44);val(c,S,W/2,y+s*.8,s,WHITE,'center');y+=s*.86+40}else y=bandH?bandH+56:110;
  let cb=baseT-48;let SP=null;if(its.length){SP=specFit(c,its,W-2*M,36,30);cb-=specH(SP)+34;spec(c,SP,W/2,cb+34,WHITE)}
  const cx=M,cw=W-2*M,ch=Math.max(300,cb-y);c.save();shadow(c,30,.3,10);rr(c,cx,y,cw,ch,46);c.fillStyle=NAVY;c.fill();c.restore();
  clipRR(c,cx,y,cw,ch,46,()=>pic(c,I,p,cx,y,cw,ch,NAVY));tagV(c,p,cx+28,y+ch/2,'rgba(255,255,255,.9)');
  if(la){pill(c,la,cx+cw-28,y+28,{size:30,h:58})}
  // map pin with the location
  if(sub){const R=104,px=cx+cw-R-6,py=y+ch-R*2.05;let s=40,ls;for(;;){ls=wrapAt(c,sub,700,s,R*1.55);if((ls.length<=3&&ls.every(l=>mw(c,l,700,s)<=R*1.7))||s<=26)break;s-=2}ls=ls.slice(0,3);
    c.save();shadow(c,26,.35,10);c.beginPath();c.moveTo(px,py+R*1.98);c.arc(px,py,R,Math.PI*.62,Math.PI*.38);c.closePath();c.fillStyle=MIST1;c.fill();c.restore();
    c.beginPath();c.arc(px,py,R-12,0,7);c.strokeStyle=TEAL;c.lineWidth=2;c.stroke();
    const lh=s*1.06;ls.forEach((l,i)=>T(c,l,px,py+s*.34+(i-(ls.length-1)/2)*lh,{f:AL,w:700,size:s,color:NAVY,align:'center'}));
    c.fillStyle=RED;c.beginPath();c.arc(px,py+R*1.98,7,0,7);c.fill()}
  if(cta)btn(c,cta,W/2,baseT+18,{bg:WHITE,fg:NAVY,disc:RED,arrow:WHITE,shadow:false,h:84});
  foot(c,true)};

// =================== 3 · PANEL: render top, navy panel, two tone statement, value row, metallic fact pill
L.x_r_panel=(c,p,I)=>{const hd=tx(p.head),sub=tx(p.sub),la0=lbl(p),its0=items(p).slice(0,4),pr=tx(p.price),cta=tx(p.cta);
  // value row: first spec + price, else the slot alone
  let rowSpec=null,S=null,pillIts,pillLa=la0;
  if(pr){S={kind:'price',t:pr};if(its0.length)rowSpec=its0[0];pillIts=its0.slice(1)}
  else{S=slot(p,its0,la0);const r=rest(S,its0,la0);pillIts=r.its;pillLa=r.la}
  const facts=pillIts.slice(0,3).map(itT);const fl=pillLa;
  const st=[];const X=W/2,MW=920;
  if(hd||sub){const ws=400;let s=sub?84:100;const L1=hd?hd:'',L2=sub;for(;;){const a=L1?wrapAt(c,L1,ws,s,MW):[],b=L2?wrapAt(c,L2,ws,s,MW):[];if((a.length<=2&&b.length<=2&&a.length+b.length<=3)||s<=56)break;s-=4}
    const a=L1?wrapAt(c,L1,ws,s,MW).slice(0,2):[],b=L2?wrapAt(c,L2,ws,s*.86,MW).slice(0,2):[];const lh=s*1.08;
    st.push(B(s*.86+(a.length+b.length-1)*lh,t=>{a.forEach((l,i)=>T(c,l,X,t+s*.8+i*lh,{f:AL,w:ws,size:s,color:WHITE,align:'center'}));b.forEach((l,i)=>T(c,l,X,t+s*.8+(a.length+i)*lh,{f:AL,w:ws,size:Math.round(s*.86),color:MIST,align:'center'}))}))}
  const RS=rowSpec?{kind:'spec',it:rowSpec}:null;
  if(S){const gap=56;const rw=s=>(RS?valW(c,RS,s,900)+gap:0)+valW(c,S,s);let s=104;while(s>48&&rw(s)>MW)s-=2;
    st.push(B(s*.86,t=>{const tot=rw(s);let R=X+tot/2;if(RS){const w=val(c,RS,R,t+s*.82,s,WHITE,'right',900);R-=w+gap/2;c.fillStyle='rgba(255,255,255,.35)';c.fillRect(R-1,t+s*.06,2,s*.76);R-=gap/2}
      val(c,S,R,t+s*.82,s,WHITE,'right')},st.length?48:0))}
  if(facts.length){const s0=36,sep=46;const fw=s=>facts.reduce((a,f)=>a+mw(c,f,700,s),0)+(facts.length-1)*sep;let s=s0;while(s>28&&fw(s)>MW-120)s-=2;const pw=Math.min(W-2*M,Math.max(560,fw(s)+130)),ph=96;
    st.push(B(ph,t=>{const x0=X-pw/2;const g=c.createLinearGradient(x0,t,x0+pw,t+ph);g.addColorStop(0,'#c9dbe3');g.addColorStop(.28,'#ffffff');g.addColorStop(.55,MIST);g.addColorStop(.8,'#e7eef1');g.addColorStop(1,'#a9c6d3');
      c.save();shadow(c,24,.4,8);rr(c,x0,t,pw,ph,18);c.fillStyle=g;c.fill();c.restore();rr(c,x0+1,t+1,pw-2,ph-2,17);c.strokeStyle='rgba(255,255,255,.7)';c.lineWidth=2;c.stroke();
      let R=X+fw(s)/2;facts.forEach((f,i)=>{if(i){c.fillStyle=NAVY;c.fillRect(R-sep/2-1.5,t+ph/2-s*.42,3,s*.84);R-=sep}T(c,f,R,t+ph/2+s*.34,{f:AL,w:700,size:s,color:NAVY});R-=mw(c,f,700,s)});
      },st.length?44:0))}
  if(cta)st.push(B(88,t=>btn(c,cta,X,t,{bg:RED,fg:WHITE}),st.length?44:0));
  const sh=SH(st);let ph=SAFE-sh-(fl?90:72);ph=Math.max(470,Math.min(ph,800));
  c.fillStyle=NAVY;c.fillRect(0,0,W,H);pic(c,I,p,0,0,W,ph,TEAL);{const g=c.createLinearGradient(0,ph-120,0,ph);g.addColorStop(0,'rgba(7,41,58,0)');g.addColorStop(1,'rgba(7,41,58,.55)');c.fillStyle=g;c.fillRect(0,ph-120,W,120)}
  if(fl)pill(c,fl,W/2,ph-29,{size:30,h:58,align:'center'});else{c.fillStyle=RED;c.fillRect(W/2-36,ph-3,72,6)}
  tagV(c,p,30,ph/2,'rgba(255,255,255,.9)');
  const top=ph+Math.max(fl?74:56,(SAFE-ph-sh)/2);SD(st,top);foot(c,true)};

// =================== 4 · LABELS: stacked navy label blocks on the sky, paper location square, thin value below
L.x_r_labels=(c,p,I)=>{const hd=tx(p.head),sub=tx(p.sub),la0=lbl(p),its0=items(p).slice(0,4),cta=tx(p.cta);const S=slot(p,its0,la0),{its,la}=rest(S,its0,la0);
  pic(c,I,p,0,0,W,H,TEAL);
  // bottom stack, right aligned
  const X=W-M,st=[];if(la)st.push(B(56,t=>pill(c,la,X,t,{size:30,h:56})));
  if(S){const s=valFit(c,S,W-2*M,104,52,300);st.push(B(s*.86,t=>raw(c,()=>{if(S.kind==='price'){const [a,b]=pParts(S.t);const tot=(a?mw(c,a,300,sa(s))+s*.2:0)+mw(c,b,300,s,-.01);let R=X;if(a){T(c,a,R,t+s*.82,{f:AL,w:300,size:sa(s),color:WHITE});R-=mw(c,a,300,sa(s))+s*.2}T(c,b,R,t+s*.82,{f:AL,w:300,size:s,color:WHITE,track:-.01})}else val(c,S,X,t+s*.82,s,WHITE,'right',300)}),st.length?34:0))}
  if(its.length){const SP=specFit(c,its,W-2*M,38,30);st.push(B(specH(SP),t=>spec(c,SP,X,t,WHITE,{align:'right'}),st.length?30:0))}
  if(cta)st.push(B(88,t=>btn(c,cta,X,t,{align:'right',bg:WHITE,fg:NAVY,disc:RED,arrow:WHITE}),st.length?44:0));
  const sh=SH(st),top=SAFE-sh-10;
  {const a=Math.min(top-200,900);const g=c.createLinearGradient(0,a,0,H);g.addColorStop(0,'rgba(7,41,58,0)');g.addColorStop(Math.min(.95,(top-a)/(H-a)),'rgba(7,41,58,.86)');g.addColorStop(1,'rgba(7,41,58,.97)');c.fillStyle=g;c.fillRect(0,a,W,H-a)}
  // label blocks
  let yb=150;if(hd){let s=104,ls;for(;;){ls=wrapAt(c,hd,700,s,580,-.01);if(ls.length<=4||s<=72)break;s-=4}
    {const ws=hd.split(/\s+/).filter(Boolean);if(!hd.includes('\n')&&ws.length>1&&ws.length<=4&&ws.every(w=>mw(c,w,700,s,-.01)<=580))ls=ws}
    const n=Math.min(4,ls.length);ls=ls.slice(0,n);if(ls.length>=4&&wrapAt(c,hd,700,s,580,-.01).length>4)ls[3]=cut(c,ls[3]+' …',700,s,580);const bh=Math.round(s*1.28),pad=Math.round(s*.34),gap=Math.round(s*.16);
    const maxY=top-60;ls.forEach((l,i)=>{const w=mw(c,l,700,s,-.01)+pad*2,y=yb+i*(bh+gap);if(y+bh>maxY)return;c.fillStyle=NAVY;c.fillRect(X-w,y,w,bh);T(c,l,X-pad,y+bh/2+s*.33,{f:AL,w:700,size:s,color:WHITE,track:-.01})});yb+=n*(bh+gap)}
  // paper square with the location as a wordmark (left edge, below the logo corner)
  if(sub){const sq=300,sy=250;const ws=sub.split(/\s+/);const first=ws[0],restT=ws.slice(1).join(' ');const iw=sq-64;
    let s1=fitOne(c,first,700,iw,84,40,-.02);let s2=56,rl=[];for(;;){rl=restT?wrapAt(c,restT,300,s2,iw,-.02):[];if(rl.length<=2&&rl.every(l=>mw(c,l,300,s2,-.02)<=iw)||s2<=30)break;s2-=2}rl=rl.slice(0,2);
    const ih=s1*.86+(rl.length?14+rl.length*s2*.98:0),hh=Math.max(sq*.82,ih+92);c.save();shadow(c,24,.25,6);c.fillStyle=PAPER;c.fillRect(0,sy,sq,hh);c.restore();
    let yy=sy+46+s1*.8;T(c,first,32,yy,{f:AL,w:700,size:s1,color:NAVY,align:'left',track:-.02});yy+=14;raw(c,()=>rl.forEach((l,i)=>T(c,l,32,yy+s2*.8+i*s2*.98,{f:AL,w:300,size:s2,color:NAVY,align:'left',track:-.02})));
    c.fillStyle=RED;c.fillRect(32,sy+hh-30,40,5)}
  tagV(c,p,32,Math.max(760,yb+120),'rgba(255,255,255,.85)');SD(st,top);foot(c,true)};

// =================== 5 · BADGE: tall building, two part callout card, big number badge on the seam, price on navy
L.x_r_badge=(c,p,I)=>{const hd=tx(p.head),sub=tx(p.sub),la=lbl(p),its=items(p).slice(0,4),pr=tx(p.price),cta=tx(p.cta);
  const big=its[0]||null,more=its.slice(1);const ph=(big||la||sub||pr)?(cta?880:920):(cta?1060:1150);
  c.fillStyle=NAVY;c.fillRect(0,0,W,H);pic(c,I,p,0,0,W,ph,TEAL);{const g=c.createLinearGradient(0,ph-160,0,ph);g.addColorStop(0,'rgba(7,41,58,0)');g.addColorStop(1,'rgba(7,41,58,.7)');c.fillStyle=g;c.fillRect(0,ph-160,W,160)}
  tagV(c,p,30,ph*.5,'rgba(255,255,255,.9)');
  // callout card: navy head part + paper detail part
  if(hd||more.length){const cw=470,cx=W-M-cw,cy=150;let y=cy;const avail=(big||la?ph-96:ph)-50-cy;c.save();shadow(c,34,.35,12);
    let s=itFit(c,more,cw-110,38,30,700),dh=more.length?s*.86+(more.length-1)*s*1.32+76:0;
    let f=null,hh=0;if(hd){f=FB(c,hd,{maxW:cw-80,maxH:Math.min(330,avail-dh-84),w:900,max:96,min:72,lines:4,lh:1.0,track:-.02});hh=FH(f)+84}
    if(hh){c.fillStyle=NAVY;c.fillRect(cx,y,cw,hh)}if(dh){c.fillStyle=PAPER;c.fillRect(cx,y+hh,cw,dh)}c.restore();
    if(f)head(c,f,cx+cw/2,y+40,WHITE,{align:'center'});
    if(dh){const t=y+hh+38;more.forEach((it,i)=>{const b=t+s*.8+i*s*1.32;const w=itLine(c,it,cx+cw/2-12,b,s,NAVY,'center');T(c,'+',cx+cw/2-12+w/2+12,b,{f:AL,w:700,size:s,color:RED,align:'left'})})}}
  // badge
  const bw=480,bh=260,bx=W-M-bw,by=ph-96;let hasB=false;
  if(big||la){hasB=true;c.save();shadow(c,30,.4,10);c.fillStyle=WHITE;c.fillRect(bx,by,bw,bh);c.restore();c.strokeStyle=NAVY;c.lineWidth=2;c.strokeRect(bx+14,by+14,bw-28,bh-28);
    const inner=big&&la?170:0;if(inner){const ix=bx+26,iy=by+26,iw=inner,ih=bh-52;c.fillStyle=NAVY;c.fillRect(ix,iy,iw,ih);let s=34,ls;for(;;){ls=wrapAt(c,la,700,s,iw-30);if(ls.length<=3&&ls.every(l=>mw(c,l,700,s)<=iw-24)||s<=26)break;s-=2}ls=ls.slice(0,3);
      ls.forEach((l,i)=>T(c,l,ix+iw/2,iy+ih/2+s*.34+(i-(ls.length-1)/2)*s*1.12,{f:AL,w:700,size:s,color:WHITE,align:'center'}))}
    const rx0=bx+26+inner+(inner?14:0),rx1=bx+bw-34,rcx=(rx0+rx1)/2,rwid=rx1-rx0;
    if(big){const v=big.v||big.l;const nv=v.match(/^([\d.,]+)\s*(%?)$/);let s=fitOne(c,v,900,rwid-10,big.l?170:190,60,-.03);const lab=big.v?big.l:'';
      let ls2=[],s2=34;if(lab){for(;;){ls2=wrapAt(c,lab,700,s2,rwid);if(ls2.length<=2||s2<=26)break;s2-=2}ls2=ls2.slice(0,2)}
      const lh2=s2*1.08,blockH=s*.74+(ls2.length?16+ls2.length*lh2-(lh2-s2*.8):0);let t=by+(bh-blockH)/2;
      if(s*.74+16+ls2.length*lh2>bh-60){s=Math.max(60,Math.floor((bh-70-ls2.length*lh2)/.74))}
      T(c,v,rcx,t+s*.74,{f:AL,w:900,size:s,color:NAVY,align:'center',track:-.03});t+=s*.74+16;ls2.forEach((l,i)=>T(c,l,rcx,t+s2*.8+i*lh2,{f:AL,w:700,size:s2,color:NAVY,align:'center'}))}
    else{let s=40,ls;for(;;){ls=wrapAt(c,la,900,s,rwid);if(ls.length<=2&&ls.every(l=>mw(c,l,900,s)<=rwid)||s<=30)break;s-=2}ls=ls.slice(0,2);ls.forEach((l,i)=>T(c,l,rcx,by+bh/2+s*.34+(i-(ls.length-1)/2)*s*1.1,{f:AL,w:900,size:s,color:NAVY,align:'center'}))}}
  // left block on the navy panel: sub + price (price slot falls back to the badge content, so only sub when no price)
  const lx=hasB?bx-48:W-M,lw=lx-M,st=[];
  if(sub){const s=fitOne(c,sub,700,lw,44,30);const ls=wrapAt(c,sub,700,s,lw).slice(0,2);st.push(B(s*.86+(ls.length-1)*s*1.15,t=>ls.forEach((l,i)=>T(c,l,lx,t+s*.8+i*s*1.15,{f:AL,w:700,size:s,color:WHITE}))))}
  if(pr){const s=priceFit(c,pr,lw,84,44);st.push(B(s*.86,t=>price(c,pr,lx,t+s*.82,s,WHITE,'right'),st.length?18:0))}
  if(st.length){const a=hasB?by+bh/2-SH(st)/2+30:ph+48;SD(st,Math.max(ph+40,a))}
  if(cta)btn(c,cta,W/2,SAFE-88-8,{bg:WHITE,fg:NAVY,disc:RED,arrow:WHITE});
  foot(c,true)};

// =================== 6 · BURST: thin location wordmark, render left, giant headline right, zigzag badge
function burst(c,cx,cy,R,n,col,lw){c.beginPath();for(let i=0;i<=n*2;i++){const a=-Math.PI/2+i*Math.PI/n,r=i%2?R*.88:R;const x=cx+Math.cos(a)*r,y=cy+Math.sin(a)*r;i?c.lineTo(x,y):c.moveTo(x,y)}c.closePath();c.strokeStyle=col;c.lineWidth=lw;c.lineJoin='round';c.stroke()}
L.x_r_burst=(c,p,I)=>{const BG=(p.seed|0)%2?TEAL:NAVY;c.fillStyle=BG;c.fillRect(0,0,W,H);
  const hd=tx(p.head),sub=tx(p.sub),la=lbl(p),its=items(p).slice(0,4),pr=tx(p.price),cta=tx(p.cta);
  let rt=110;if(sub){const s=fitOne(c,sub,300,700,92,52,.01);raw(c,()=>T(c,sub,W/2,96+s*.8,{f:AL,w:300,size:s,color:WHITE,align:'center',track:.01}));c.fillStyle=RED;c.fillRect(W/2-30,96+s*.86+26,60,5);rt=96+s*.86+74}
  const rb=cta?SAFE-88-44:SAFE-10;const rw=500,rx=M;pic(c,I,p,rx,rt,rw,rb-rt,BG===NAVY?TEAL:NAVY);tagV(c,p,rx+26,rt+(rb-rt)/2,'rgba(255,255,255,.9)');
  const X=W-M,CW=X-(rx+rw+40);
  const g=[];if(its.length){const s=itFit(c,its,CW,44,30);g.push(B(s*.86+(its.length-1)*s*1.18,t=>its.forEach((it,i)=>itLine(c,it,X,t+s*.8+i*s*1.18,s,MIST,'right'))))}
  if(pr){const s=priceFit(c,pr,CW,84,40);g.push(B(s*.86,t=>price(c,pr,X,t+s*.82,s,WHITE,'right'),g.length?20:0))}
  const gh=SH(g),gt=rb-gh;SD(g,gt);
  const R=la?Math.min(140,Math.max(110,mw(c,la,700,36)/2+30)):0;const burstH=la?R*2+40:0;
  let fb=null;if(hd){fb=FBest(c,hd,{maxW:CW+110,maxH:(g.length?gt-40:rb)-burstH-(rt+40),w:900,max:150,min:72,lines:4,lh:.94,track:-.02});c.save();shadow(c,18,.35,2);head(c,fb,X,rt+30,WHITE);c.restore()}
  if(la){const hb=fb?rt+30+FH(fb):rt;const cy=Math.min((g.length?gt-40:rb)-R-6,hb+40+R),cx=X-R-4;c.save();c.beginPath();c.arc(cx,cy,R*.86,0,7);c.fillStyle=BG;c.globalAlpha=.25;c.fill();c.restore();burst(c,cx,cy,R,28,WHITE,3);
    let s=40,ls;for(;;){ls=wrapAt(c,la,700,s,R*1.3);if(ls.length<=3&&ls.every(l=>mw(c,l,700,s)<=R*1.45)||s<=26)break;s-=2}ls=ls.slice(0,3);ls.forEach((l,i)=>T(c,l,cx,cy+s*.34+(i-(ls.length-1)/2)*s*1.08,{f:AL,w:700,size:s,color:WHITE,align:'center'}))}
  if(cta)btn(c,cta,W/2,SAFE-88-6,{bg:WHITE,fg:NAVY,disc:RED,arrow:WHITE});
  foot(c,true)};

// =================== 7 · LIST: dark top with thin wordmark, gradient rules, statement, huge value, spec list, render bottom
function grule(c,x0,x1,y,flip){const g=c.createLinearGradient(flip?x1:x0,0,flip?x0:x1,0);g.addColorStop(0,RED);g.addColorStop(.3,MIST);g.addColorStop(1,'rgba(143,182,200,.15)');c.fillStyle=g;c.fillRect(x0,y-1,x1-x0,3)}
L.x_r_list=(c,p,I)=>{const hd=tx(p.head),sub=tx(p.sub),la0=lbl(p),its0=items(p).slice(0,4),cta=tx(p.cta);const S=slot(p,its0,la0),{its,la}=rest(S,its0,la0);
  const MW=W-2*M-40;const minR=cta?470:360;let st,sh,k=1;for(;;){st=[];
  if(la)st.push(B(52,t=>{const s=28,w=mw(c,la,700,s,.12)+48;c.strokeStyle='rgba(255,255,255,.7)';c.lineWidth=2;rr(c,W/2-w/2,t,w,52,26);c.stroke();T(c,la,W/2,t+26+s*.34,{f:AL,w:700,size:s,color:WHITE,align:'center',track:.12})}));
  if(hd){const f=F(c,hd,{maxW:Math.min(MW,780),w:300,max:Math.round(118*k),min:72,lines:2,track:.01,lh:1.0});st.push(B(FH(f),t=>raw(c,()=>{c.save();c.font=AL(300,f.size);LS(c,(.01*f.size).toFixed(1)+'px');c.direction='rtl';c.textAlign='center';f.ls.forEach((l,i)=>{c.fillStyle=i?MIST:WHITE;c.fillText(ISO(l),W/2,t+f.size*.8+i*f.lh)});c.restore();LS(c,'0px')}),st.length?Math.round(40*k):0))}
  const ruleG=st.length?44:0;st.push(B(3,t=>grule(c,M+40,W-M-40,t+1,false),ruleG));
  if(sub){const s=fitOne(c,sub,700,MW,Math.round(64*k),40);const ls=wrapAt(c,sub,700,s,MW).slice(0,2);st.push(B(s*.86+(ls.length-1)*s*1.1,t=>ls.forEach((l,i)=>T(c,l,W/2,t+s*.8+i*s*1.1,{f:AL,w:700,size:s,color:WHITE,align:'center'})),40))}
  if(S){const s=valFit(c,S,MW,Math.round(150*k),52);st.push(B(s*.86,t=>val(c,S,W/2,t+s*.82,s,WHITE,'center'),sub?26:40))}
  if(sub||S)st.push(B(3,t=>grule(c,M+40,W-M-40,t+1,true),40));
  if(its.length){const SP=specFit(c,its,MW,40,30);st.push(B(specH(SP),t=>spec(c,SP,W/2,t,WHITE),40))}
  sh=SH(st);if(96+sh+70<=H-minR||k<=.7)break;k-=.06}let topH=Math.max(520,96+sh+78);topH=Math.min(topH,H-minR);
  // top: dark city (photo 2 or the render, heavily tinted)
  c.fillStyle=NAVY;c.fillRect(0,0,W,H);c.save();c.beginPath();c.rect(0,0,W,topH);c.clip();if(p.shot2||p.shot){c.filter='grayscale(1)';shot2(c,I,p,0,0,W,topH,NAVY);c.filter='none'}c.fillStyle='rgba(7,41,58,.88)';c.fillRect(0,0,W,topH);grid(c,WHITE,.035,0,0,W,topH,54);c.restore();
  SD(st,Math.max(96,(topH-sh)/2+6));
  const ry=topH+14;pic(c,I,p,0,ry,W,H-ry,TEAL);shade(c,Math.max(ry,H-330),H,0,.92);
  tagV(c,p,W-30,ry+(H-ry)*.42,'rgba(255,255,255,.9)');
  if(cta)btn(c,cta,W/2,SAFE-88-10,{bg:WHITE,fg:NAVY,disc:RED,arrow:WHITE});
  foot(c,true)};

// =================== 8 · SUNSET: render, stacked headline with red highlight bar, tilted sticker, teal value bar, paper bottom
L.x_r_sunset=(c,p,I)=>{const hd=tx(p.head),sub=tx(p.sub),la0=lbl(p),its0=items(p).slice(0,4),pr=tx(p.price),cta=tx(p.cta);
  // value bar: first spec + price, else the slot alone
  let barSpec=null,S=null,la=la0,more;if(pr){S={kind:'price',t:pr};barSpec=its0[0]||null;more=its0.slice(1)}else{S=slot(p,its0,la0);const r=rest(S,its0,la0);more=r.its;la=r.la}
  const barH=S?150:0;
  // paper content under the bar
  const MW=W-2*M,row=[];let rowH=0;const subW=more.length?520:MW;
  let subL=[],ss=0;if(sub){ss=44;while(ss>34&&wrapAt(c,sub,700,ss,subW).length>2)ss-=2;subL=wrapAt(c,sub,700,ss,subW).slice(0,2);rowH=ss*.86+(subL.length-1)*ss*1.12}
  let ms=0;if(more.length){ms=itFit(c,more,sub?MW-subW-60:MW,38,30);rowH=Math.max(rowH,ms*.86+(more.length-1)*ms*1.3)}
  const below=(S?barH/2+40:0)+(rowH?rowH+44:0)+(cta?88+(rowH?40:20):0);let ph=SAFE-below-(rowH||cta?10:0);ph=Math.max(640,Math.min(ph,1090));
  c.fillStyle=PAPER;c.fillRect(0,0,W,H);pic(c,I,p,0,0,W,ph,NAVY);
  {const g=c.createLinearGradient(0,0,0,640);g.addColorStop(0,'rgba(7,41,58,.72)');g.addColorStop(.55,'rgba(7,41,58,.38)');g.addColorStop(1,'rgba(7,41,58,0)');c.fillStyle=g;c.fillRect(0,0,W,640)}
  {const g=c.createLinearGradient(0,ph-80,0,ph);g.addColorStop(0,'rgba(247,248,250,0)');g.addColorStop(1,'rgba(247,248,250,.6)');c.fillStyle=g;c.fillRect(0,ph-80,W,80)}
  tagV(c,p,30,ph*.62,'rgba(255,255,255,.9)');
  // headline: light lines, last line bold on a tilted red bar
  if(hd){const X=W-M,maxW=780;const paras=hd.includes('\n')?hd.split('\n').map(t=>t.trim()).filter(Boolean):null;
    const build=s=>{let li,bo;if(paras&&paras.length>1){li=[].concat(...paras.slice(0,-1).map(t=>wrapAt(c,t,300,s,maxW,-.01)));bo=wrapAt(c,paras[paras.length-1],900,s,maxW-60,-.02)}else{const w=wrapAt(c,hd,900,s,maxW-60,-.02);bo=w.slice(-1);li=w.slice(0,-1)}return{li,bo}};
    const maxH=(S?ph-barH/2:ph)-(la?230:70)-110;let s=128,L2;for(;;){L2=build(s);const n=L2.li.length+L2.bo.length;const tgt=s>88?(paras&&paras.length>1?paras.length:2):4;if((n<=Math.min(4,tgt)&&L2.bo.length<=(s>88?1:2)&&s*.86+(n-1)*s+s*.3<=maxH)||s<=72)break;s-=4}
    let lines=L2.li.map(t=>({t,b:0})).concat(L2.bo.map(t=>({t,b:1})));if(lines.length>4){lines=lines.slice(-4);lines[0].t=lines[0].t}
    const lh=s*1.0,y=110;lines.forEach((o,i)=>{const b=y+s*.8+i*lh;if(!o.b){raw(c,()=>{c.save();shadow(c,16,.35,2);T(c,o.t,X,b,{f:AL,w:300,size:s,color:WHITE,track:-.01});c.restore()})}
      else{const w=mw(c,o.t,900,s,-.02);c.save();c.translate(X-w/2,b-s*.3);c.rotate(-.035);c.fillStyle=RED;c.fillRect(-w/2-34,-s*.6,w+68+48,s*1.12);T(c,o.t,w/2+14,s*.3,{f:AL,w:900,size:s,color:WHITE,track:-.02});c.restore()}})}
  // sticker label over the render
  if(la){let s=40,ls;for(;;){ls=wrapAt(c,la,900,s,300);if(ls.length<=2||s<=30)break;s-=2}ls=ls.slice(0,2);const w=Math.max(...ls.map(l=>mw(c,l,900,s)))+60,h=ls.length*s*1.08+44;
    const cx=M+w/2+10,cy=(S?ph-barH/2:ph)-h/2-40;c.save();c.translate(cx,cy);c.rotate(-.05);shadow(c,22,.35,8);c.fillStyle=WHITE;c.fillRect(-w/2,-h/2,w,h);c.restore();
    c.save();c.translate(cx,cy);c.rotate(-.05);ls.forEach((l,i)=>T(c,l,0,s*.34+(i-(ls.length-1)/2)*s*1.08,{f:AL,w:900,size:s,color:NAVY,align:'center'}));c.restore()}
  // value bar
  if(S){const by=ph-barH/2,bx=M-20,bw=W-2*M+40;c.save();shadow(c,26,.3,10);c.fillStyle=TEAL;c.fillRect(bx,by,bw,barH);c.restore();
    const inW=bw-80;let sw=0,s1=0;if(barSpec){s1=36;while(s1>28&&mw(c,barSpec.l,400,s1)>300)s1-=2;sw=Math.min(300,Math.max(barSpec.v?mw(c,barSpec.v,900,s1*1.5):0,barSpec.l?mw(c,barSpec.l,400,s1):0,itW(c,barSpec,s1)*(barSpec.v&&barSpec.l?0:1)))}
    const vw=inW-(barSpec?sw+60:0);const s=valFit(c,S,vw,104,44);const tot=valW(c,S,s)+(barSpec?sw+60:0);let R=W/2+tot/2;
    if(barSpec){const v=barSpec.v,l=barSpec.l;if(v&&l){T(c,v,R,by+barH/2-2,{f:AL,w:900,size:Math.round(s1*1.5),color:WHITE});T(c,cut(c,l,400,s1,300),R,by+barH/2+s1*1.0,{f:AL,w:400,size:s1,color:WHITE})}else itLine(c,barSpec,R,by+barH/2+s1*.34,s1,WHITE,'right');
      R-=sw+30;c.fillStyle='rgba(255,255,255,.4)';c.fillRect(R-1,by+30,2,barH-60);R-=30}
    val(c,S,R,by+barH/2+s*.34,s,WHITE,'right')}
  let y=(S?ph+barH/2:ph)+44;
  if(rowH){const X=W-M;if(subL.length){subL.forEach((l,i)=>T(c,l,X,y+ss*.8+i*ss*1.12,{f:AL,w:700,size:ss,color:NAVY}))}
    if(more.length){const mx=sub?X-subW-60:X;if(sub){c.fillStyle=TEAL;c.fillRect(mx+30-2,y,4,rowH)}more.forEach((it,i)=>itLine(c,it,sub?mx:X,y+ms*.8+i*ms*1.3,ms,SLATE,'right'))}
    y+=rowH+40}
  if(cta)btn(c,cta,W/2,SAFE-88-6,{bg:NAVY,fg:WHITE,disc:RED});
  foot(c,false)};
G.FX.L=G.FX.L||{};Object.assign(G.FX.L,L);
})(window);
/*FX17a:END*/
