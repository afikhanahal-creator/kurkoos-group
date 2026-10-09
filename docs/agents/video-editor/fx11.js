/*FX11:START*/
// ---------- Kurkoos "BOLD" · eleven scroll-stopping layouts built on social formats that people stop for, save and send:
//            a WhatsApp exchange, a receipt, a checklist, red flags, an annotated site photo, a hot take, sticky notes,
//            one giant word, a poll sticker, a colour block over a photo and a caption over a real moment.
// Type floor (on 1080 wide): headline 72+, body and items 34+, the smallest line 26. Palette and Almoni only.
(function(G){
const {A,shot}=G.FX4H;const W=1080,H=1350,M=72;
const NAVY='#07293a',TEAL='#105572',MIST='#8fb6c8',MIST1='#e7eef1',PAPER='#f7f8fa',RED='#a90b0c',SLATE='#3d4b58',WHITE='#ffffff';
const LS=(c,v)=>{try{c.letterSpacing=v}catch(e){}};
const ISO=t=>String(t??'').replace(/(\d[\d,.]*\s?[KM])(?![A-Za-z])/g,'⁦$1⁩').replace(/(\d+(?:[.,]\d+)?)\s*[×x]\s*(\d+(?:[.,]\d+)?)/g,'⁦$1×$2⁩').replace(/(\d[\d,.]*(?:[-/:]\d[\d,.]*)*[+%]?)/g,'⁦$1⁩');
function rnd(seed){let s=(seed>>>0)||7;return()=>(s=(s*16807)%2147483647)/2147483647}
function wrapW(c,t,maxW){const out=[];String(t||'').split('\n').forEach(par=>{let cur='';par.split(/\s+/).filter(Boolean).forEach(w=>{const n=cur?cur+' '+w:w;if(c.measureText(n).width>maxW&&cur){out.push(cur);cur=w}else cur=n});if(cur)out.push(cur)});return out}
function T(c,t,x,y,o){t=ISO(t);c.save();c.font=A(o.w||400,o.size);LS(c,((o.track??0)*o.size).toFixed(1)+'px');c.direction=o.ltr?'ltr':'rtl';c.textAlign=o.align||'right';c.fillStyle=o.color||NAVY;c.fillText(t,x,y);const w=c.measureText(t).width;c.restore();LS(c,'0px');return w}
function fit(c,t,maxW,o){let size=o.max||150;const min=o.min||72;let ls;for(;;){c.font=A(o.w||900,size);LS(c,((o.track??-.02)*size).toFixed(1)+'px');ls=wrapW(c,ISO(String(t||'').replace(/\*/g,'')),maxW);LS(c,'0px');if(ls.length<=(o.lines||3)||size<=min)break;size-=4}return{size,ls:ls.slice(0,(o.lines||3)+1),lh:size*(o.lh||1.02)}}
function head(c,F,x,y,col,o={}){c.save();c.font=A(o.w||900,F.size);LS(c,((o.track??-.02)*F.size).toFixed(1)+'px');c.direction='rtl';c.textAlign=o.align||'right';c.fillStyle=col;F.ls.forEach((l,i)=>c.fillText(l,x,y+F.size*.8+i*F.lh));c.restore();LS(c,'0px');return y+F.size*.8+(F.ls.length-1)*F.lh}
function para(c,t,x,y,o){const sz=o.size;c.save();c.font=A(o.w||400,sz);const ls=wrapW(c,String(t||'').replace(/\*/g,''),o.maxW).slice(0,o.lines||3);const lh=sz*(o.lh||1.3);c.direction='rtl';c.textAlign=o.align||'right';c.fillStyle=o.color||NAVY;ls.forEach((l,i)=>c.fillText(ISO(l),x,y+i*lh));c.restore();return y+(ls.length-1)*lh}
function rr(c,x,y,w,h,r){c.beginPath();if(c.roundRect)c.roundRect(x,y,w,h,r);else c.rect(x,y,w,h)}
function pill(c,t,xr,y,bg,fg,size=30,w=700){c.save();c.font=A(w,size);const tw=c.measureText(ISO(t)).width,ph=size*1.75,pw=tw+size*1.4;c.fillStyle=bg;rr(c,xr-pw,y-ph*.7,pw,ph,ph/2);c.fill();c.fillStyle=fg;c.direction='rtl';c.textAlign='center';c.fillText(ISO(t),xr-pw/2,y);c.restore();return pw}
function mark(c,x,y,s,col){c.save();c.fillStyle=col;[[23,32,5,44],[34,12,8,64],[46,22,6,54],[56,42,4,34]].forEach(([rx,ry,rw,rh])=>c.fillRect(x+(rx-23)*s,y+(ry-12)*s,rw*s,rh*s));c.restore()}
function items(p){return (p.items||[]).map(it=>Array.isArray(it)?{v:String(it[0]??''),l:String(it[1]??'')}:{v:String(it.v??it.big??''),l:String(it.l??it.label??'')}).filter(x=>x.v!==''||x.l)}
function foot(c,dark,y=H-62){const fg=dark?WHITE:NAVY,sub=dark?'rgba(255,255,255,.78)':SLATE;mark(c,M+4,y-46,.95,dark?WHITE:NAVY);const w=T(c,'קבוצת קורקוס',W-M,y,{w:800,size:30,color:fg});T(c,'מקרקע ועד מסירת מפתח',W-M-w-20,y,{w:500,size:28,color:sub});T(c,'kurkoos-group.co.il',M+70,y,{w:500,size:26,color:sub,align:'left',ltr:true})}
function tag(c,t,bg,fg,y=96){if(!t)return 0;return pill(c,t,W-M,y,bg,fg,30,800)}
function photo(c,p,I,x,y,w,h,fallback){if(p.shot&&shot(c,I,p.shot,x,y,w,h))return true;c.save();c.fillStyle=fallback||TEAL;c.fillRect(x,y,w,h);c.globalAlpha=.10;c.strokeStyle=WHITE;c.lineWidth=1;for(let gx=x;gx<x+w;gx+=60){c.beginPath();c.moveTo(gx,y);c.lineTo(gx,y+h);c.stroke()}for(let gy=y;gy<y+h;gy+=60){c.beginPath();c.moveTo(x,gy);c.lineTo(x+w,gy);c.stroke()}c.restore();return false}
function grad(c,y0,y1,a0,a1,col='7,41,58'){const g=c.createLinearGradient(0,y0,0,y1);g.addColorStop(0,`rgba(${col},${a0})`);g.addColorStop(1,`rgba(${col},${a1})`);c.fillStyle=g;c.fillRect(0,y0,W,y1-y0)}
function grid(c,col,a){c.save();c.globalAlpha=a;c.strokeStyle=col;c.lineWidth=1;for(let x=0;x<W;x+=60){c.beginPath();c.moveTo(x,0);c.lineTo(x,H);c.stroke()}for(let y=0;y<H;y+=60){c.beginPath();c.moveTo(0,y);c.lineTo(W,y);c.stroke()}c.restore()}
function tick(c,x,y,s,col,w=9){c.save();c.strokeStyle=col;c.lineWidth=w;c.lineCap='round';c.lineJoin='round';c.beginPath();c.moveTo(x-s*.42,y+s*.02);c.lineTo(x-s*.1,y+s*.32);c.lineTo(x+s*.46,y-s*.36);c.stroke();c.restore()}
const L={};

// 1 CHAT · a WhatsApp style exchange between a client and us
L.x_b_chat=(c,p,I)=>{c.fillStyle=MIST1;c.fillRect(0,0,W,H);grid(c,MIST,.35);
  c.fillStyle=NAVY;c.fillRect(0,0,W,150);c.fillStyle=WHITE;c.beginPath();c.arc(W-M-38,76,40,0,7);c.fill();mark(c,W-M-52,50,.85,NAVY);
  T(c,'קבוצת קורקוס',W-M-100,70,{w:800,size:34,color:WHITE});T(c,'מקרקע ועד מסירת מפתח',W-M-100,112,{w:500,size:26,color:MIST});
  const F=fit(c,p.head,W-2*M,{max:80,min:72,lines:2});let y=head(c,F,W-M,190,NAVY)+40;
  const msgs=items(p).slice(0,5);const room=H-150-y;const base=msgs.length>4?36:msgs.length>3?40:44;
  msgs.forEach(m=>{const us=/קורקוס|אנחנו|אנו/.test(m.v);c.font=A(us?600:500,base);const ls=wrapW(c,m.l,700);const bw=Math.max(...ls.map(l=>c.measureText(ISO(l)).width))+64,bh=ls.length*base*1.3+(us?74:44);
    const x=us?M:W-M-bw;c.save();c.shadowColor='rgba(7,41,58,.12)';c.shadowBlur=14;c.shadowOffsetY=4;c.fillStyle=us?TEAL:WHITE;rr(c,x,y,bw,bh,28);c.fill();c.restore();
    c.fillStyle=us?TEAL:WHITE;c.beginPath();if(us){c.moveTo(x+6,y+bh-30);c.lineTo(x-14,y+bh+4);c.lineTo(x+40,y+bh-6)}else{c.moveTo(x+bw-6,y+bh-30);c.lineTo(x+bw+14,y+bh+4);c.lineTo(x+bw-40,y+bh-6)}c.fill();
    ls.forEach((l,i)=>T(c,l,x+bw-32,y+38+base*.82+i*base*1.3-6,{w:us?600:500,size:base,color:us?WHITE:NAVY}));
    if(us)T(c,'✓✓',x+28,y+bh-16,{w:700,size:26,color:MIST,align:'left',ltr:true});y+=bh+(msgs.length>4?24:40)});
  if(p.cta&&y<H-230)pill(c,p.cta,W-M,H-190,RED,WHITE,32);foot(c,false)};

// 2 RECEIPT · the cost lines on a paper receipt, a red stamp, the total line
L.x_b_receipt=(c,p,I)=>{c.fillStyle=NAVY;c.fillRect(0,0,W,H);grid(c,WHITE,.05);
  const its=items(p).slice(0,7);const rw=820,rx=(W-rw)/2,ry=70;const rowH=its.length>5?78:92;const rh=Math.min(1080,330+its.length*rowH+150);
  c.save();c.translate(W/2,ry+rh/2);c.rotate(-.018);c.translate(-W/2,-(ry+rh/2));
  c.save();c.shadowColor='rgba(0,0,0,.35)';c.shadowBlur=40;c.shadowOffsetY=18;c.fillStyle=PAPER;c.beginPath();c.moveTo(rx,ry);c.lineTo(rx+rw,ry);c.lineTo(rx+rw,ry+rh);
  for(let x=rx+rw;x>rx;x-=40){c.lineTo(x-20,ry+rh-22);c.lineTo(x-40,ry+rh)}c.closePath();c.fill();c.restore();
  T(c,'קבוצת קורקוס',W/2,ry+70,{w:800,size:30,color:SLATE,align:'center'});c.save();c.setLineDash([10,10]);c.strokeStyle='#9aa7b2';c.lineWidth=3;c.beginPath();c.moveTo(rx+50,ry+100);c.lineTo(rx+rw-50,ry+100);c.stroke();c.restore();
  const F=fit(c,p.head,rw-100,{max:78,min:72,lines:2});let y=head(c,F,rx+rw-50,ry+124,NAVY)+50;
  its.forEach((it,i)=>{T(c,it.l,rx+rw-50,y+12,{w:600,size:36,color:NAVY});T(c,it.v||'?',rx+50,y+12,{w:800,size:38,color:it.v==='?'||!it.v?RED:NAVY,align:'left'});
    c.save();c.setLineDash([3,9]);c.strokeStyle='#9aa7b2';c.lineWidth=3;c.beginPath();c.moveTo(rx+50,y+38);c.lineTo(rx+rw-50,y+38);c.stroke();c.restore();y+=rowH});
  c.fillStyle=NAVY;c.fillRect(rx+50,y-20,rw-100,6);T(c,p.sub?'בשורה התחתונה':'סה"כ',rx+rw-50,y+44,{w:900,size:40,color:NAVY});
  if(p.sub)para(c,p.sub,rx+rw-50,y+96,{size:32,maxW:rw-100,color:SLATE,lines:2,w:500});c.restore();
  c.save();c.translate(rx+20,ry+14);c.rotate(-.22);c.strokeStyle=RED;c.lineWidth=7;c.beginPath();c.arc(0,0,104,0,7);c.stroke();c.lineWidth=3;c.beginPath();c.arc(0,0,88,0,7);c.stroke();
  c.font=A(900,34);c.fillStyle=RED;c.textAlign='center';c.direction='rtl';c.fillText(p.label||'לבדוק',0,-4);c.font=A(700,26);c.fillText('לפני שחותמים',0,34);c.restore();
  foot(c,true)};

// 3 CHECKLIST · big boxes with red hand ticks
L.x_b_check=(c,p,I)=>{c.fillStyle=PAPER;c.fillRect(0,0,W,H);c.fillStyle=RED;c.fillRect(0,0,W,16);tag(c,p.label,NAVY,WHITE,110);
  const F=fit(c,p.head,W-2*M,{max:104,min:72,lines:3});let y=head(c,F,W-M,160,NAVY)+30;if(p.sub){y=para(c,p.sub,W-M,y+40,{size:36,maxW:W-2*M,color:SLATE,lines:2})+20}
  const its=items(p).slice(0,6);const rowH=Math.min(170,(H-210-y)/Math.max(1,its.length));y+=30;
  its.forEach((it,i)=>{const cy=y+rowH/2;c.save();c.strokeStyle=NAVY;c.lineWidth=5;rr(c,W-M-66,cy-33,66,66,12);c.stroke();c.restore();tick(c,W-M-30,cy-4,64,RED,10);
    const big=rowH>=140?52:rowH>=110?46:40;c.font=A(700,big);const t=wrapW(c,it.l,W-2*M-110)[0]||'';T(c,t,W-M-100,cy+big*.35,{w:700,size:big,color:NAVY});
    if(i<its.length-1){c.fillStyle='#d6dde3';c.fillRect(M,y+rowH-2,W-2*M,2)}y+=rowH});
  foot(c,false)};

// 4 RED FLAGS · red page, white flags, what to watch
L.x_b_flags=(c,p,I)=>{c.fillStyle=RED;c.fillRect(0,0,W,H);c.save();c.globalAlpha=.08;c.fillStyle=WHITE;c.font=A(900,620);c.textAlign='left';c.direction='ltr';c.fillText('!',M-40,H-180);c.restore();
  tag(c,p.label||'דגלים אדומים',WHITE,RED,110);const F=fit(c,p.head,W-2*M,{max:108,min:72,lines:3});let y=head(c,F,W-M,160,WHITE)+30;
  if(p.sub)y=para(c,p.sub,W-M,y+40,{size:36,maxW:W-2*M,color:'rgba(255,255,255,.92)',lines:2})+10;
  const its=items(p).slice(0,5);const rowH=Math.min(150,(H-190-y-20)/Math.max(1,its.length));y+=40;
  its.forEach(it=>{const cy=y+rowH/2;c.save();c.fillStyle=WHITE;c.fillRect(W-M-10,cy-40,7,84);c.beginPath();c.moveTo(W-M-10,cy-40);c.lineTo(W-M-70,cy-22);c.lineTo(W-M-10,cy-4);c.closePath();c.fill();c.restore();
    c.font=A(800,44);const t=wrapW(c,it.l,W-2*M-110);T(c,t[0]||'',W-M-100,cy+(t[1]?-6:14),{w:800,size:44,color:WHITE});if(t[1])T(c,t[1],W-M-100,cy+42,{w:800,size:44,color:WHITE});y+=rowH});
  foot(c,true)};

// 5 ANNOTATE · a real site photo with numbered red circles, the legend below
L.x_b_annotate=(c,p,I)=>{c.fillStyle=NAVY;c.fillRect(0,0,W,H);const ph=840;photo(c,p,I,0,0,W,ph);grad(c,0,220,.55,0);
  tag(c,p.label||'מה רואים כאן',RED,WHITE,96);const its=items(p).slice(0,4);const r=rnd((p.seed||7)*31);
  const spots=[[.28,.40],[.70,.55],[.42,.74],[.78,.30]];its.forEach((it,i)=>{const [fx,fy]=spots[i];const x=fx*W+(r()-.5)*90,y=fy*ph+(r()-.5)*60;
    c.save();c.strokeStyle=WHITE;c.lineWidth=6;c.beginPath();c.ellipse(x,y,78,64,-.3,0.2,6.6);c.stroke();c.strokeStyle=RED;c.lineWidth=5;c.beginPath();c.ellipse(x+3,y-2,84,70,-.25,0.4,6.5);c.stroke();
    c.fillStyle=RED;c.beginPath();c.arc(x,y,36,0,7);c.fill();c.restore();T(c,String(i+1),x,y+15,{w:900,size:42,color:WHITE,align:'center'})});
  const F=fit(c,p.head,W-2*M,{max:78,min:72,lines:2});let y=head(c,F,W-M,ph+30,WHITE);y+=56;
  const colW=(W-2*M)/2;its.forEach((it,i)=>{const x=W-M-(i%2)*colW,yy=y+Math.floor(i/2)*62;c.fillStyle=RED;c.beginPath();c.arc(x-20,yy-12,20,0,7);c.fill();T(c,String(i+1),x-20,yy-1,{w:900,size:26,color:WHITE,align:'center'});T(c,(/^0\d$/.test(it.v)||!it.v||it.v===String(i+1)?'':it.v+' ')+it.l,x-54,yy,{w:600,size:34,color:WHITE})});
  foot(c,true)};

// 6 HOT TAKE · one opinion, very large, with the red quote marks
L.x_b_hottake=(c,p,I)=>{c.fillStyle=NAVY;c.fillRect(0,0,W,H);c.save();c.globalAlpha=.9;c.fillStyle=RED;c.font=A(900,420);c.textAlign='right';c.direction='ltr';c.fillText('״',W-M+40,400);c.restore();
  tag(c,p.label||'דעה',RED,WHITE,110);const F=fit(c,p.head,W-2*M,{max:118,min:72,lines:4});const top=Math.max(330,(H-F.lh*F.ls.length)/2-110);const b=head(c,F,W-M,top,WHITE);
  if(p.sub)para(c,p.sub,W-M,b+80,{size:38,maxW:W-2*M,color:MIST,lines:3,w:500});pill(c,p.cta||'מסכימים? כתבו בתגובות',W-M,H-190,WHITE,NAVY,34,800);foot(c,true)};

// 7 STICKY NOTES · three tips on notes over a blueprint
L.x_b_sticky=(c,p,I)=>{c.fillStyle=TEAL;c.fillRect(0,0,W,H);grid(c,WHITE,.12);tag(c,p.label,RED,WHITE,110);
  const F=fit(c,p.head,W-2*M,{max:96,min:72,lines:2});const b=head(c,F,W-M,160,WHITE);
  const its=items(p).slice(0,3);const notes=[[W-M-430,b+70,-.05,PAPER,NAVY],[M+10,b+250,.045,MIST,NAVY],[W-M-470,b+470,-.03,RED,WHITE]];
  its.forEach((it,i)=>{const [x,y,rot,bg,fg]=notes[i];const nw=440,nh=300;c.save();c.translate(x+nw/2,y+nh/2);c.rotate(rot);c.shadowColor='rgba(0,0,0,.3)';c.shadowBlur=24;c.shadowOffsetY=12;c.fillStyle=bg;c.fillRect(-nw/2,-nh/2,nw,nh);c.shadowColor='transparent';
    c.fillStyle='rgba(255,255,255,.55)';c.fillRect(-70,-nh/2-18,140,40);T(c,'0'+(i+1),nw/2-34,-nh/2+70,{w:900,size:44,color:fg===WHITE?WHITE:RED});
    c.font=A(800,44);const ls=wrapW(c,it.l,nw-70).slice(0,4);ls.forEach((l,j)=>T(c,l,nw/2-34,-nh/2+136+j*54,{w:800,size:44,color:fg}));c.restore()});
  foot(c,true)};

// 8 BIG WORD · one statement set as large as it goes, the second line in outline
L.x_b_bigword=(c,p,I)=>{c.fillStyle=PAPER;c.fillRect(0,0,W,H);tag(c,p.label,NAVY,WHITE,110);
  const F=fit(c,p.head,W-2*M,{max:240,min:96,lines:3,lh:.98});let y=200;c.save();c.font=A(900,F.size);LS(c,(-.03*F.size).toFixed(1)+'px');c.direction='rtl';c.textAlign='right';
  F.ls.forEach((l,i)=>{const yy=y+F.size*.82+i*F.lh;if(i%2===1){c.strokeStyle=RED;c.lineWidth=Math.max(3,F.size/40);c.strokeText(l,W-M,yy)}else{c.fillStyle=NAVY;c.fillText(l,W-M,yy)}});c.restore();LS(c,'0px');
  y=y+F.size*.82+(F.ls.length-1)*F.lh+60;c.fillStyle=RED;c.fillRect(W-M-190,y,190,14);if(p.sub)para(c,p.sub,W-M,y+80,{size:40,maxW:W-2*M-60,color:SLATE,lines:3,w:500});foot(c,false)};

// 9 POLL · the photo behind, an Instagram style poll sticker in front
L.x_b_poll=(c,p,I)=>{c.fillStyle=NAVY;c.fillRect(0,0,W,H);photo(c,p,I,0,0,W,H);c.fillStyle='rgba(7,41,58,.45)';c.fillRect(0,0,W,H);tag(c,p.label||'סקר',RED,WHITE,96);
  const its=items(p);const a=its[0]||{v:'א',l:''},b=its[1]||{v:'ב',l:''};const cw=W-2*M,cx=M,cy=330;c.font=A(900,64);const F=fit(c,p.head,cw-100,{max:72,min:72,lines:3});const ch=F.lh*F.ls.length+420;
  c.save();c.translate(W/2,cy+ch/2);c.rotate(-.02);c.translate(-W/2,-(cy+ch/2));c.save();c.shadowColor='rgba(0,0,0,.35)';c.shadowBlur=36;c.shadowOffsetY=14;c.fillStyle=WHITE;rr(c,cx,cy,cw,ch,44);c.fill();c.restore();
  let y=head(c,F,W/2,cy+40,NAVY,{align:'center'})+60;[[a,RED],[b,TEAL]].forEach(([o,col])=>{c.fillStyle=MIST1;rr(c,cx+44,y,cw-88,120,60);c.fill();c.fillStyle=col;c.beginPath();c.arc(cx+cw-44-60,y+60,44,0,7);c.fill();
    T(c,o.v,cx+cw-104,y+76,{w:900,size:46,color:WHITE,align:'center'});T(c,o.l,cx+cw-180,y+76,{w:800,size:46,color:NAVY});y+=150});c.restore();
  pill(c,p.cta||'כתבו א או ב',W/2+180,H-200,RED,WHITE,34,800);foot(c,true)};

// 10 BLOCK · a full photo and a tilted colour block that carries the headline
L.x_b_block=(c,p,I)=>{c.fillStyle=NAVY;c.fillRect(0,0,W,H);photo(c,p,I,0,0,W,H);grad(c,H-560,H,0,.85);tag(c,p.label,WHITE,NAVY,96);
  const F=fit(c,p.head,W-2*M-80,{max:100,min:72,lines:3});const bh=F.lh*F.ls.length+90,by=H-200-bh-(p.sub?70:0);
  c.save();c.translate(W/2,by+bh/2);c.rotate(-.035);c.translate(-W/2,-(by+bh/2));c.fillStyle=RED;c.fillRect(M-20,by,W-2*M+40,bh);head(c,F,W-M-20,by+40,WHITE);c.restore();
  if(p.sub)para(c,p.sub,W-M,by+bh+80,{size:38,maxW:W-2*M,color:WHITE,lines:2,w:600});foot(c,true)};

// 11 MOMENT · a real moment, the caption set like a reel subtitle, line by line on boxes
L.x_b_pov=(c,p,I)=>{c.fillStyle=NAVY;c.fillRect(0,0,W,H);photo(c,p,I,0,0,W,H);grad(c,0,300,.6,0);grad(c,H-300,H,0,.7);tag(c,p.label||'רגע אמיתי',RED,WHITE,96);
  const F=fit(c,p.head,W-2*M-80,{max:76,min:72,lines:4,w:800});let y=H/2-F.lh*F.ls.length/2;c.save();c.font=A(800,F.size);c.direction='rtl';c.textAlign='center';
  F.ls.forEach(l=>{const tw=c.measureText(l).width;c.fillStyle=WHITE;rr(c,W/2-tw/2-30,y,tw+60,F.size*1.24,18);c.fill();c.fillStyle=NAVY;c.fillText(l,W/2,y+F.size*.98);y+=F.size*1.32});c.restore();
  if(p.sub)para(c,p.sub,W/2,y+70,{size:36,maxW:W-2*M-40,color:WHITE,lines:2,w:600,align:'center'});foot(c,true)};

G.FX.L=G.FX.L||{};Object.assign(G.FX.L,L);G.FX11=L;
})(window);
/*FX11:END*/
