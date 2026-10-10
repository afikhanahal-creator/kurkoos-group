/*FX14a:START*/
// Kurkoos WORLD set A: specsheet, halfpage, ticker, calendar, map, assembly, bento, notifications
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
// ---- local tools
const fit1=(c,t,maxW,f,w,max,min,track=0)=>{t=ISO(clean(t));let s=max;for(;s>min;s-=2){c.font=f(w,s);LS(c,(track*s).toFixed(1)+'px');if(c.measureText(t).width<=maxW)break}LS(c,'0px');return s};
const lines=(c,t,maxW,font)=>{c.font=font;return wrapW(c,t,maxW)};
const ALPHA=(hex,a)=>{const n=parseInt(hex.slice(1),16);return `rgba(${n>>16},${(n>>8)&255},${n&255},${a})`};
const isTime=t=>/^\s*\d{1,2}:\d{2}\s*$/.test(String(t||''));
const fill=(c,col)=>{c.fillStyle=col;c.fillRect(0,0,W,H)};
function shadow(c,blur,a,dy){c.shadowColor=`rgba(7,41,58,${a})`;c.shadowBlur=blur;c.shadowOffsetY=dy||0}
function noShadow(c){c.shadowColor='transparent';c.shadowBlur=0;c.shadowOffsetY=0}
// centered multi-line text block, returns last baseline
function block(c,ls,x,y,size,lh,font,col,align){c.save();c.font=font;c.direction='rtl';c.textAlign=align||'right';c.fillStyle=col;ls.forEach((l,i)=>c.fillText(ISO(l),x,y+i*lh));c.restore();return y+(ls.length-1)*lh}

// 1 SPECSHEET · the thing named in huge thin type, then a precise two column rule system
L.x_w_specsheet=(c,p,I)=>{fill(c,WHITE);const it=items(p).slice(0,4),n=it.length;const X=W-M,CW=W-2*M,LC=300,VX=X-LC-40,VW=VX-M;
  index(c,p.label,false);
  const F=fit(c,p.head,CW,{w:200,max:200,min:96,lines:2,lh:1.0,track:-.035});let y=head(c,F,X,170,NAVY);
  if(p.sub)y=para(c,p.sub,X,y+66,{f:HE,w:400,size:36,maxW:CW*.86,lines:2,color:SLATE});
  if(!n){c.fillStyle=RED;c.fillRect(X-120,y+50,120,6);foot(c,false);return}
  const top=Math.max(y+70,p.sub?0:420),bot=1170;const rh=Math.min(230,(bot-top)/n);const y0=bot-rh*n;
  // rules: heavy top and bottom, hairlines between, ticks where the columns meet
  c.fillStyle=NAVY;c.fillRect(M,y0,CW,3);c.fillRect(M,bot-1,CW,2);c.fillStyle=RED;c.fillRect(X-64,y0-3,64,9);
  it.forEach((s,i)=>{const ty=y0+i*rh;if(i){c.fillStyle=LINE;c.fillRect(M,ty,CW,1.5)}c.fillStyle=NAVY;c.fillRect(X-LC-20,ty,1.5,i?14:18);
    T(c,String(i+1).padStart(2,'0'),M,ty+40,{w:400,size:26,color:MIST,align:'left',ltr:true});
    const ml=lines(c,s.l,LC,HE(400,34)).slice(0,3);block(c,ml,X,ty+54,34,44,HE(400,34),SLATE);
    if(s.v){const vs=fit1(c,s.v,VW-60,HE,200,Math.min(120,rh*.56),56,-.02);T(c,s.v,VX,ty+22+vs*.82,{w:200,size:vs,color:NAVY,track:-.02})}
  });
  foot(c,false)};

// 2 HALFPAGE · a magazine page: the photo bleeds off the left, a serif column on the right, an optional pull number
L.x_w_halfpage=(c,p,I)=>{fill(c,PAPER);const PW=476,PH=1172,PX=W-PW;const ok=photo(c,p,I,PX,0,PW,PH);if(!ok){c.save();c.globalAlpha=.16;mark(c,PX+PW/2-60,PH/2-90,3,WHITE);c.restore()}
  const CX=M,CR=PX-56,CW=CR-CX;const it=items(p).slice(0,1);const pull=it[0]&&(it[0].v||it[0].l)?it[0]:null;
  if(p.label){c.fillStyle=RED;c.fillRect(CR-18,70,18,18);T(c,p.label,CR-34,88,{w:700,size:28,color:NAVY,track:.02})}c.fillStyle=NAVY;c.fillRect(CX+150,120,CW-150,2);
  const pullH=pull?(pull.v?(pull.l?260:200):130):0;const top=196,avail=1150-pullH-top;let F,sl=[],ss=36;
  for(let mx=116;mx>=72;mx-=4){F=fit(c,p.head,CW,{f:SE,w:700,max:mx,min:mx,lines:6,lh:1.08,track:-.01});ss=38;sl=p.sub?lines(c,p.sub,CW,HE(300,ss)):[];const h=F.lh*F.ls.length+(sl.length?96+sl.length*ss*1.42:0);if(h<=avail&&F.ls.length<=4)break}
  let y=head(c,F,CR,top,NAVY);
  if(sl.length){c.fillStyle=RED;c.fillRect(CR-70,y+44,70,6);const maxL=Math.max(2,Math.floor((1150-pullH-(y+118))/(ss*1.42))+1);y=block(c,sl.slice(0,maxL),CR,y+118,ss,ss*1.42,HE(300,ss),NAVY)}
  if(pull){const py=1170-pullH;c.fillStyle=NAVY;c.fillRect(CX,py,CW,2);let ly=py+60;
    if(pull.v){const vs=fit1(c,pull.v,CW,SE,700,150,72,-.02);T(c,pull.v,CR,py+24+vs*.86,{f:SE,w:700,size:vs,color:RED,track:-.02});ly=py+34+vs*.86+54}
    if(pull.l)para(c,pull.l,CR,ly,{f:HE,w:300,size:34,maxW:CW,lines:2,color:NAVY})}
  foot(c,false)};

// 3 TICKER · a quiet trading board: dot matrix, a running band of the same indicators, rows with leaders, the source
L.x_w_ticker=(c,p,I)=>{fill(c,NAVY);const X=W-M,CW=W-2*M;const it=items(p).slice(0,6),n=it.length;
  c.fillStyle='rgba(143,182,200,.07)';for(let gy=10;gy<H;gy+=14)for(let gx=8;gx<W;gx+=14)c.fillRect(gx,gy,2.4,2.4);
  index(c,p.label,true);
  const F=fit(c,p.head,CW,{w:700,max:112,min:72,lines:3,lh:1.04,track:-.025});let y=head(c,F,X,176,WHITE);
  if(p.sub)y=para(c,p.sub,X,y+62,{f:HE,w:300,size:36,maxW:CW,lines:2,color:MIST});
  if(!n){srcLine(c,p,1160,true);foot(c,true);return}
  // the band
  const by=Math.max(y+56,n>4?420:440),bh=78;c.fillStyle=TEAL;c.fillRect(0,by,W,bh);c.fillStyle='rgba(255,255,255,.14)';c.fillRect(0,by,W,1.5);c.fillRect(0,by+bh-1.5,W,1.5);
  c.save();c.beginPath();c.rect(0,by,W,bh);c.clip();let bx=W+90,k=0;const bl=by+bh/2+11;
  while(bx>-40&&k<40){const s=it[k%n];const w1=T(c,s.l,bx,bl,{w:300,size:30,color:MIST});bx-=w1+16;const w2=T(c,s.v,bx,bl,{w:700,size:30,color:WHITE,ltr:true});bx-=w2+30;c.fillStyle=RED;c.fillRect(bx-8,bl-14,8,8);bx-=46;k++}c.restore();
  // the board
  const top=by+bh+50,bot=p.source?1112:1160;const rh=Math.min(150,(bot-top)/n);const vs=Math.min(84,rh*.6);
  T(c,'מדד',X,top+4,{w:300,size:26,color:'rgba(143,182,200,.7)',track:.06});T(c,'ערך',M,top+4,{w:300,size:26,color:'rgba(143,182,200,.7)',align:'left'});
  const r0=top+24;
  it.forEach((s,i)=>{const ry=r0+i*rh;c.fillStyle='rgba(255,255,255,.14)';c.fillRect(M,ry,CW,1.5);const bl=ry+rh/2+vs*.34;
    const sign=/^\s*[-−▼]/.test(s.v)?-1:/^\s*[+▲]/.test(s.v)?1:0;const v=String(s.v).replace(/^[▲▼]\s*/,'');
    const vsz=fit1(c,v,CW*.42,HE,300,vs,40,-.01);const vw=T(c,v,M,bl,{w:300,size:vsz,color:WHITE,align:'left',ltr:true,track:-.01});
    let lx=M+vw+24;if(sign){c.fillStyle=sign>0?MIST:RED;c.beginPath();const ty=bl-vsz*.32;if(sign>0){c.moveTo(lx,ty+9);c.lineTo(lx+18,ty+9);c.lineTo(lx+9,ty-7)}else{c.moveTo(lx,ty-7);c.lineTo(lx+18,ty-7);c.lineTo(lx+9,ty+9)}c.fill();lx+=40}
    const lsz=fit1(c,s.l,CW*.52,HE,300,40,34);const lw=T(c,s.l,X,bl,{w:300,size:lsz,color:WHITE});
    c.fillStyle='rgba(143,182,200,.35)';for(let dx=X-lw-26;dx>lx+10;dx-=12)c.fillRect(dx,bl-6,3,3)});
  c.fillStyle='rgba(255,255,255,.14)';c.fillRect(M,r0+n*rh,CW,1.5);
  srcLine(c,p,Math.min(1170,r0+n*rh+52),true);foot(c,true)};

// 4 CALENDAR · a wall calendar card: month in thin type, one red day, the event under the grid
const MONTHS={'ינואר':[0,31],'פברואר':[1,28],'מרץ':[2,31],'מרס':[2,31],'אפריל':[3,30],'מאי':[4,31],'יוני':[5,30],'יולי':[6,31],'אוגוסט':[7,31],'ספטמבר':[8,30],'אוקטובר':[9,31],'נובמבר':[10,30],'דצמבר':[11,31]};
const WD=[['ראשון','א'],['שני','ב'],['שלישי','ג'],['רביעי','ד'],['חמישי','ה'],['שישי','ו'],['שבת','ש']];
function wdOf(t){t=String(t||'').replace(/^יום\s+/,'').replace(/[׳'"]/g,'').trim();for(let i=0;i<7;i++)if(t===WD[i][0]||t===WD[i][1])return i;return -1}
L.x_w_calendar=(c,p,I)=>{fill(c,PAPER);const X=W-M,CW=W-2*M;const ev=items(p)[0]||null;const mname=clean(p.label).trim();
  const mk=Object.keys(MONTHS).find(k=>mname.includes(k));let start,days;
  if(mk){const [mi,d]=MONTHS[mk];const now=new Date();let yr=now.getFullYear();if(mi<now.getMonth())yr++;start=new Date(yr,mi,1).getDay();days=new Date(yr,mi+1,0).getDate()||d}else{start=(p.seed||3)%7;days=30}
  const dayNum=ev&&/^\d{1,2}$/.test(ev.v.trim())?Math.min(days,Math.max(1,+ev.v)):0;const wd=ev&&!dayNum?wdOf(ev.v):-1;
  const F=fit(c,p.head,CW,{w:800,max:112,min:72,lines:2,lh:1.02,track:-.025});let y=head(c,F,X,F.ls.length>1?150:170,NAVY);
  if(p.sub)y=para(c,p.sub,X,y+56,{f:HE,w:400,size:34,maxW:CW,lines:1,color:SLATE});
  const rows=Math.ceil((start+days)/7);const evH=ev?(ev.l?150:0):0;const cy=y+52;const cb=1170;const cell=CW/7;
  const headH=150,wdH=62;const rH=Math.min(104,(cb-cy-headH-wdH-evH-30)/rows);const ch=headH+wdH+rows*rH+evH+30;
  c.save();shadow(c,40,.10,14);c.fillStyle=WHITE;rr(c,M,cy,CW,ch,28);c.fill();c.restore();
  c.save();rr(c,M,cy,CW,headH,[28,28,0,0]);c.fillStyle=NAVY;c.fill();c.restore();
  const mx=X-40;const ms=fit1(c,mname||' ',CW-200,HE,200,112,72,-.03);if(mname)T(c,mname,mx,cy+headH/2+ms*.36,{w:200,size:ms,color:WHITE,track:-.03});
  [M+70,M+130].forEach(rx=>{c.fillStyle=PAPER;c.beginPath();c.arc(rx,cy+34,9,0,7);c.fill()});
  const gy=cy+headH+8;
  const colX=i=>X-cell*i-cell/2;
  WD.forEach((d,i)=>{const hi=i===wd;if(hi){c.fillStyle=RED;rr(c,colX(i)-34,gy+12,68,40,20);c.fill()}T(c,d[1]+'׳',colX(i),gy+44,{w:hi?800:400,size:28,color:hi?WHITE:(i===6?MIST:SLATE),align:'center'})});
  const g0=gy+wdH;
  for(let d=1;d<=days;d++){const k=start+d-1,col=k%7,row=Math.floor(k/7);const cx=colX(col),ccy=g0+row*rH+rH/2;const hi=d===dayNum||col===wd;
    if(d===dayNum){c.fillStyle=RED;c.beginPath();c.arc(cx,ccy,Math.min(46,rH*.46),0,7);c.fill()}
    T(c,String(d),cx,ccy+13,{w:d===dayNum?800:400,size:36,color:d===dayNum?WHITE:hi?RED:(col===6?MIST:NAVY),align:'center'})}
  if(ev&&ev.l){const ey=g0+rows*rH+24;c.fillStyle=LINE;c.fillRect(M+36,ey,CW-72,1.5);c.fillStyle=RED;c.fillRect(X-36-8,ey+40,8,78);
    const tag=dayNum?(String(dayNum)+' '+(mk||'')).trim():(wd>=0?'יום '+WD[wd][0]:clean(ev.v));const tw=T(c,tag,X-64,ey+92,{w:800,size:40,color:RED});
    const ls=lines(c,ev.l,CW-72-tw-70,HE(400,36));const one=ls.length===1;
    if(one)T(c,ev.l,X-64-tw-30,ey+92,{w:400,size:36,color:NAVY});else{para(c,ev.l,X-64-tw-30,ey+70,{f:HE,w:400,size:34,maxW:CW-72-tw-70,lines:2,lh:1.25,color:NAVY})}}
  foot(c,false)};

// 5 MAP · an abstract, procedural street map with red pins, and a clean white panel for the headline
L.x_w_map=(c,p,I)=>{fill(c,PAPER);const X=W-M,CW=W-2*M;const it=items(p).slice(0,4);const R=rnd((p.seed||5)*31+7);const MB=1180;
  c.save();c.beginPath();c.rect(0,0,W,MB);c.clip();c.fillStyle=MIST1;c.fillRect(0,0,W,MB);
  // building texture
  c.fillStyle='rgba(143,182,200,.22)';for(let i=0;i<420;i++){const bx=R()*W,by=R()*MB,bw=14+R()*34,bh=14+R()*30;c.fillRect(bx,by,bw,bh)}
  // park
  const pkx=W*(.12+R()*.2),pky=MB*(.18+R()*.18);c.fillStyle='rgba(143,182,200,.62)';c.beginPath();c.moveTo(pkx,pky);c.bezierCurveTo(pkx+180,pky-60,pkx+300,pky+20,pkx+290,pky+150);c.bezierCurveTo(pkx+280,pky+260,pkx+120,pky+280,pkx+30,pky+230);c.bezierCurveTo(pkx-60,pky+180,pkx-60,pky+60,pkx,pky);c.fill();
  c.strokeStyle='rgba(255,255,255,.75)';c.lineWidth=3;c.setLineDash([2,10]);c.lineCap='round';c.beginPath();c.moveTo(pkx+10,pky+190);c.quadraticCurveTo(pkx+140,pky+80,pkx+250,pky+130);c.stroke();c.setLineDash([]);
  const road=(pts,w,fn)=>{[[LINE,w+5],[WHITE,w]].forEach(([col,lw])=>{c.strokeStyle=col;c.lineWidth=lw;c.lineCap='round';c.beginPath();fn();c.stroke()})};
  c.save();c.translate(W/2,MB/2);c.rotate((R()-.5)*.38);
  let gx=-900;const xs=[],ys=[];while(gx<900){xs.push(gx);gx+=110+R()*150}let gy=-900;while(gy<900){ys.push(gy);gy+=100+R()*140}
  xs.forEach(x=>road(0,10+(R()<.15?6:0),()=>{c.moveTo(x,-900);c.lineTo(x,900)}));ys.forEach(y=>road(0,10,()=>{c.moveTo(-900,y);c.lineTo(900,y)}));
  const ax=xs[Math.floor(xs.length*.55)],ay=ys[Math.floor(ys.length*.4)];
  road(0,30,()=>{c.moveTo(ax,-900);c.lineTo(ax,900)});road(0,30,()=>{c.moveTo(-900,ay);c.lineTo(900,ay)});
  road(0,24,()=>{c.moveTo(-900,-500+R()*200);c.lineTo(900,500+R()*200)});
  road(0,18,()=>{c.moveTo(-900,300);c.bezierCurveTo(-300,-100,200,700,900,200)});
  c.restore();
  // north
  c.fillStyle=WHITE;c.beginPath();c.arc(M+40,110,40,0,7);c.fill();c.fillStyle=NAVY;c.beginPath();c.moveTo(M+40,78);c.lineTo(M+54,118);c.lineTo(M+40,110);c.lineTo(M+26,118);c.fill();T(c,'צ',M+40,148+30,{w:700,size:28,color:NAVY,align:'center'});
  c.restore();
  // panel
  const PX=M,PW=CW;const F=fit(c,p.head,PW-96,{w:800,max:100,min:72,lines:2,lh:1.04,track:-.025});const sl=p.sub?lines(c,p.sub,PW-96,HE(400,34)).slice(0,2):[];
  const ph=58+40+F.lh*F.ls.length+(sl.length?18+sl.length*46:0)+30;const py=1130-ph;
  c.save();shadow(c,50,.18,18);c.fillStyle=WHITE;rr(c,PX,py,PW,ph,30);c.fill();c.restore();
  index(c,p.label,false,py+70);let yb=head(c,F,X-48,py+(p.label?96:58),NAVY);if(sl.length)block(c,sl,X-48,yb+66,34,46,HE(400,34),SLATE);
  // pins in the open map above the panel
  const SLS={1:[[.55,.55]],2:[[.68,.25],[.32,.78]],3:[[.70,.12],[.30,.50],[.66,.90]],4:[[.72,.04],[.30,.36],[.70,.66],[.34,.98]]};const flip=R()<.5;const top=150,bot=py-40;const used=(SLS[it.length]||[]).map(q=>[flip?1-q[0]:q[0],q[1]]);
  const pin=(x,y)=>{c.fillStyle='rgba(7,41,58,.22)';c.beginPath();c.ellipse(x,y+4,22,8,0,0,7);c.fill();c.save();shadow(c,14,.25,6);c.fillStyle=RED;c.beginPath();c.arc(x,y-62,30,Math.PI*.82,Math.PI*.18);c.lineTo(x,y);c.closePath();c.fill();c.restore();c.fillStyle=WHITE;c.beginPath();c.arc(x,y-62,11,0,7);c.fill()};
  used.sort((a,b)=>a[1]-b[1]).forEach((s,i)=>{const x=M+60+s[0]*(CW-120),y=top+80+s[1]*(bot-top-80);pin(x,y);const lab=it[i].l||it[i].v;if(!lab)return;
    const fs=34;c.font=HE(700,fs);const tw=Math.min(c.measureText(ISO(clean(lab))).width,560);const pw=tw+52,phh=62;let lx=x>W/2?x-46-pw:x+46;lx=Math.max(M-30,Math.min(W-M+30-pw,lx));const ly=y-62-phh/2;
    c.save();shadow(c,24,.16,8);c.fillStyle=WHITE;rr(c,lx,ly,pw,phh,31);c.fill();c.restore();T(c,lab,lx+pw-26,ly+phh/2+12,{w:700,size:fit1(c,lab,560,HE,700,fs,28),color:NAVY})});
  foot(c,false)};

// 6 ASSEMBLY · IKEA style: numbered boxes, line pictograms, nothing extra
function pic(c,kind,x,y,s){c.save();c.translate(x,y);c.scale(s,s);c.strokeStyle=NAVY;c.lineWidth=5/s*Math.min(1,s)*1.0;c.lineWidth=4.5;c.lineJoin='round';c.lineCap='round';const P=(...a)=>{c.beginPath();c.moveTo(a[0],a[1]);for(let i=2;i<a.length;i+=2)c.lineTo(a[i],a[i+1]);c.stroke()};
  if(kind==='plot'){P(-110,60,110,60);c.setLineDash([10,12]);P(-90,60,-50,10,70,10,100,60);c.setLineDash([]);P(-20,40,-20,-70);c.fillStyle=RED;c.beginPath();c.moveTo(-20,-70);c.lineTo(34,-52);c.lineTo(-20,-34);c.closePath();c.fill();P(50,40,50,0);P(-70,40,-70,10)}
  else if(kind==='wall'){P(-110,70,110,70);for(let r=0;r<4;r++){const yy=70-r*32;const off=r%2?28:0;P(-90,yy-32,90-(r===3?60:0),yy-32);for(let bx=-90+off;bx<90-(r===3?60:0);bx+=56)P(bx,yy,bx,yy-32)}P(-90,70,-90,-58);P(90,70,90,-26);c.fillStyle=WHITE;c.strokeRect(40,-80,46,26)}
  else if(kind==='window'){P(-90,70,-90,-20,0,-90,90,-20,90,70,-90,70);c.strokeRect(-40,-10,80,60);P(0,-10,0,50);P(-40,20,40,20);c.fillStyle=RED;c.fillRect(-40,-10,38,28)}
  else if(kind==='house'){P(-100,70,-100,-10,0,-90,100,-10,100,70,-100,70);P(-120,6,0,-100,120,6);c.strokeRect(-24,14,48,56);P(56,-60,56,-90,76,-90,76,-42)}
  else if(kind==='key'){c.beginPath();c.arc(-50,0,34,0,7);c.stroke();c.beginPath();c.arc(-50,0,10,0,7);c.stroke();P(-16,0,100,0);P(70,0,70,26);P(90,0,90,18);c.fillStyle=RED;c.beginPath();c.arc(84,-56,24,0,7);c.fill();c.strokeStyle=WHITE;c.lineWidth=5;P(72,-56,81,-46,96,-66)}
  else if(kind==='doc'){P(-60,-80,30,-80,60,-50,60,80,-60,80,-60,-80);P(30,-80,30,-50,60,-50);P(-34,-30,30,-30);P(-34,0,34,0);P(-34,30,10,30);c.strokeStyle=RED;P(-12,56,0,68,26,42)}
  else if(kind==='pour'){P(-100,70,100,70);P(-70,70,-70,20,70,20,70,70);P(-30,-90,30,-90,20,-50,-20,-50,-30,-90);c.setLineDash([2,14]);P(0,-40,0,10);c.setLineDash([])}
  else{c.beginPath();c.arc(0,0,70,0,7);c.stroke();c.strokeStyle=RED;c.lineWidth=8;P(-32,0,-8,26,36,-26)}
  c.restore()}
function picFor(label,i,n){const t=String(label||'');if(/מפתח|מסירה|כניסה/.test(t))return 'key';if(/מגרש|קרקע|סימון|מדיד/.test(t))return 'plot';if(/חלון|חלונות|אלומיניום/.test(t))return 'window';if(/יציק|בטון|יסוד|רפסוד/.test(t))return 'pour';if(/קיר|שלד|בלוק|בנייה|בונים/.test(t))return 'wall';if(/היתר|חוזה|תוכנית|תכנון|מסמך|אישור|בדיקה|פיקוח/.test(t))return 'doc';if(/בית|גג|גמר/.test(t))return 'house';
  const seq=n>=4?['plot','wall','house','key']:['wall','house','key'];return i===n-1?'key':seq[i]||'check'}
L.x_w_assembly=(c,p,I)=>{fill(c,WHITE);const X=W-M,CW=W-2*M;const it=items(p).slice(0,4),n=it.length;
  index(c,p.label,false);const F=fit(c,p.head,CW,{w:800,max:112,min:72,lines:2,lh:1.02,track:-.025});let y=head(c,F,X,172,NAVY);
  if(p.sub)y=para(c,p.sub,X,y+58,{f:HE,w:400,size:34,maxW:CW,lines:2,color:SLATE});
  if(!n){foot(c,false);return}
  const gt=y+54,gb=1170,g=24;const rowsN=n>2?2:1;const bh=(gb-gt-g*(rowsN-1))/rowsN;
  const rects=[];if(n===1)rects.push([M,gt,CW,bh]);else if(n===2){rects.push([M+(CW+g)/2,gt,(CW-g)/2,bh],[M,gt,(CW-g)/2,bh])}
  else{const w2=(CW-g)/2;rects.push([M+w2+g,gt,w2,bh],[M,gt,w2,bh]);if(n===3)rects.push([M,gt+bh+g,CW,bh]);else rects.push([M+w2+g,gt+bh+g,w2,bh],[M,gt+bh+g,w2,bh])}
  it.forEach((s,i)=>{const [bx,by,bw,bhh]=rects[i];c.strokeStyle=NAVY;c.lineWidth=3;c.strokeRect(bx,by,bw,bhh);
    T(c,String(i+1),bx+bw-30,by+86,{w:800,size:80,color:NAVY,align:'right'});
    const lab=s.l||s.v;const ls=lines(c,lab,bw-60,HE(400,34)).slice(0,2);const lh=44;const ly=by+bhh-34-(ls.length-1)*lh;
    const kind=picFor(lab,i,n);const avail=ly-44-(by+44);const sc=Math.max(.7,Math.min(1.8,avail/185,(bw-170)/240));
    pic(c,kind,bx+bw/2,by+44+avail/2+4,sc);
    block(c,ls,bx+bw/2,ly,34,lh,HE(400,34),NAVY,'center')});
  foot(c,false)};

// 7 BENTO · an Apple style grid: the headline tile in navy, items in tiles of different size and tone
L.x_w_bento=(c,p,I)=>{fill(c,PAPER);const it=items(p).slice(0,5),n=it.length;const CW=W-2*M,g=20,T0=178,B0=1176,TH=B0-T0;index(c,p.label,false,120);
  const R=(x,y,w,h)=>[M+x*CW+(x?g/2:0),T0+y*TH+(y?g/2:0),w*CW-(x?g/2:0)-(x+w<.999?g/2:0),h*TH-(y?g/2:0)-(y+h<.999?g/2:0)];
  // layouts in fractions [x,y,w,h], first is the headline tile; x measured from the left
  const LAY={0:[[0,0,1,1]],1:[[0,0,1,.58],[0,.58,1,.42]],2:[[0,0,1,.52],[.42,.52,.58,.48],[0,.52,.42,.48]],
    3:[[0,0,1,.40],[.40,.40,.60,.30],[0,.40,.40,.60],[.40,.70,.60,.30]],
    4:[[.36,0,.64,.42],[0,0,.36,.42],[.5,.42,.5,.30],[0,.42,.5,.30],[0,.72,1,.28]],
    5:[[.36,0,.64,.40],[0,0,.36,.40],[.64,.40,.36,.30],[0,.40,.64,.30],[.5,.70,.5,.30],[0,.70,.5,.30]]};
  const lay=LAY[n];const TONES=[[MIST1,NAVY,SLATE],[TEAL,WHITE,MIST1],[WHITE,NAVY,SLATE],[RED,WHITE,'rgba(255,255,255,.85)'],[MIST,NAVY,NAVY]];
  // headline tile
  const [hx,hy,hw,hh]=R(...lay[0]);c.fillStyle=NAVY;rr(c,hx,hy,hw,hh,34);c.fill();
  const ix=hx+hw-44;let sl=p.sub?lines(c,p.sub,hw-88,HE(400,34)).slice(0,2):[];let F;
  for(let mx=124;mx>=72;mx-=4){F=fit(c,p.head,hw-88,{w:800,max:mx,min:mx,lines:4,lh:1.02,track:-.025});const need=F.lh*(F.ls.length-1)+F.size*.85+(sl.length?sl.length*46+30:0)+88;if(need<=hh&&F.ls.length<=4)break;if(mx===72&&sl.length){sl=[];mx=128}}
  const hb=hy+hh-48-(sl.length?(sl.length-1)*46+64:0);const hTop=hb-F.lh*(F.ls.length-1)-F.size*.8;c.fillStyle=RED;c.fillRect(ix-90,hy+44,90,8);let yb=head(c,F,ix,hTop,WHITE);if(sl.length)block(c,sl,ix,yb+64,34,46,HE(400,34),MIST);
  // tiles: one red tile at most, placed on the middle item
  const order=n>=3?[0,1,2,3,4]:[0,1];const redAt=n>=3?Math.min(2,n-1):-1;
  it.forEach((s,i)=>{const [x,y,w,h]=R(...lay[i+1]);let tone=TONES[[0,1,2,4][i%4]];if(i===redAt)tone=TONES[3];c.fillStyle=tone[0];rr(c,x,y,w,h,34);c.fill();if(tone[0]===WHITE){c.strokeStyle=LINE;c.lineWidth=1.5;c.stroke()}
    const tx=x+w-40;const ls=s.l?lines(c,s.l,w-80,HE(400,34)).slice(0,2):[];const lb=y+h-40-(ls.length-1)*44;if(ls.length)block(c,ls,tx,lb,34,44,HE(400,34),tone[2]);
    if(s.v){const vmax=Math.min(170,(lb-(ls.length?44:0)-y-30)*.95);const vs=fit1(c,s.v,w-80,HE,800,vmax,40,-.03);const vy=Math.min(y+40+vs*.82,lb-(ls.length?56:0));T(c,s.v,tx,vy,{w:800,size:vs,color:tone[1],track:-.03})}});
  foot(c,false)};

// 8 NOTIFICATIONS · a lock screen over a blurred site: the time if there is one, the headline, a stack of notifications
L.x_w_notifications=(c,p,I)=>{fill(c,NAVY);const X=W-M,CW=W-2*M;const it=items(p).slice(0,4),n=it.length;
  c.save();c.filter='blur(26px) saturate(.75)';const okp=photo(c,p,I,-60,-60,W+120,H+120,TEAL);c.restore();if(!okp){const gg=c.createLinearGradient(0,0,W,H);gg.addColorStop(0,TEAL);gg.addColorStop(1,NAVY);c.fillStyle=gg;c.fillRect(0,0,W,H);c.save();c.globalAlpha=.07;mark(c,W/2-40,H*.46,9,WHITE);c.restore()}c.fillStyle='rgba(7,41,58,.42)';c.fillRect(0,0,W,H);shade(c,H-500,H,0,.6);
  // measure the notification stack first
  const NW=CW,pad=30,ic=72;const tw=NW-pad*2-ic-24;const cards=it.map(s=>{const ls=lines(c,s.l,tw,HE(400,34)).slice(0,3);return{s,ls,h:pad*2+44+ls.length*44}});
  const gap=14;const stackH=cards.reduce((a,k)=>a+k.h,0)+gap*Math.max(0,n-1)+(n>2?26:0);const sb=1168;let sy=sb-stackH;
  const time=isTime(p.label)?clean(p.label).trim():'';
  // lock icon
  const lockY=time?96:110;c.strokeStyle=WHITE;c.lineWidth=4;c.beginPath();c.arc(W/2,lockY-6,13,Math.PI,0);c.stroke();c.fillStyle=WHITE;rr(c,W/2-19,lockY-6,38,30,7);c.fill();
  let top=lockY+44;
  if(time){const ts=Math.max(150,Math.min(230,(sy-top-200)*.9));T(c,time,W/2,top+ts*.78,{w:200,size:ts,color:WHITE,align:'center',ltr:true,track:-.02});top+=ts*.82+40}
  else if(p.label){T(c,p.label,W/2,top+40,{w:400,size:34,color:MIST1,align:'center'});top+=80}
  const F=fit(c,p.head,CW-40,{w:700,max:time?96:116,min:72,lines:3,lh:1.06,track:-.02});const hb=head(c,F,W/2,top,WHITE,{align:'center'});
  let afterH=hb+20;if(p.sub&&hb+70+40<sy-40){para(c,p.sub,W/2,hb+70,{f:HE,w:400,size:34,maxW:CW-60,lines:1,color:MIST1,align:'center'});afterH=hb+90}
  sy=Math.max(afterH+40,afterH+40+Math.max(0,(sy-afterH-40))*.55);
  const ICON=[NAVY,TEAL,RED,SLATE];
  cards.forEach((k,i)=>{const h=k.h;if(i===n-1&&n>2){c.save();c.fillStyle='rgba(255,255,255,.38)';rr(c,M+40,sy+h-6,NW-80,32,24);c.fill();c.restore()}
    c.save();shadow(c,30,.25,10);c.fillStyle='rgba(247,248,250,.86)';rr(c,M,sy,NW,h,34);c.fill();c.restore();
    const ix=X-pad-ic,iy=sy+pad;c.fillStyle=ICON[i%4];rr(c,ix,iy,ic,ic,18);c.fill();if(i%4===0)mark(c,ix+19,iy+12,.62,WHITE);else{T(c,clean(k.s.v||'·').trim().replace(/^ה(?=\S\S)/,'').slice(0,1),ix+ic/2,iy+ic/2+13,{w:700,size:36,color:WHITE,align:'center'})}
    const tx=ix-24;if(k.s.v)T(c,k.s.v,tx,iy+30,{w:700,size:34,color:NAVY});block(c,k.ls,tx,iy+30+(k.s.v?48:4),34,44,HE(400,34),SLATE);
    sy+=h+gap});
  foot(c,true)};

G.FX.L=G.FX.L||{};Object.assign(G.FX.L,L);
})(window);
/*FX14a:END*/
