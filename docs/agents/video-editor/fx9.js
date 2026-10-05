/*FX9:START*/
// ---------- Kurkoos "MAGAZINE" · 8 editorial layouts for the flagship posts: the scroll stops on a device (a broken headline,
//            a numeral that holds the photo, a torn page), then the post pays the reader back with something to save ----------
// Palette and Almoni only. Built from the research of 2026: carousels and lists are saved, sends are the strongest signal,
// people remember the brand, not the face. So every layout repeats the same masthead language: the red index square,
// the department label, the issue line, the folio.
(function(G){
const {A,TH,shot,txt,small,chrome,M}=G.FX4H;const W=1080,H=1350;
const NAVY='#07293a',NAVY2='#0b1f2a',TEAL='#105572',MIST='#8fb6c8',MIST1='#e7eef1',PAPER='#f7f8fa',RED='#a90b0c',SLATE='#4a5866',LINE='#cbd2db',WHITE='#ffffff';
const LS=(c,v)=>{try{c.letterSpacing=v}catch(e){}};
const ISO=t=>String(t??'').replace(/(\d+(?:[.,]\d+)?)\s*[×x]\s*(\d+(?:[.,]\d+)?)/g,'⁦$1×$2⁩').replace(/(\d[\d,.]*(?:[-/]\d[\d,.]*)*[+%]?)/g,'⁦$1⁩');
const hair=(c,x1,y1,x2,y2,col,w=1.5)=>{c.save();c.strokeStyle=col;c.lineWidth=w;c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke();c.restore()};
function rnd(seed){let s=(seed>>>0)||7;return()=>(s=(s*16807)%2147483647)/2147483647}
function T(c,t,x,y,o){t=ISO(t);c.save();c.font=A(o.w||400,o.size);LS(c,((o.track??0)*o.size).toFixed(1)+'px');c.direction=o.ltr?'ltr':'rtl';c.textAlign=o.align||'right';c.fillStyle=o.color||NAVY;c.fillText(t,x,y);const w=c.measureText(t).width;c.restore();LS(c,'0px');return w}
function wrapW(c,t,maxW){const out=[];String(t||'').split('\n').forEach(par=>{let cur='';par.split(/\s+/).filter(Boolean).forEach(w=>{const n=cur?cur+' '+w:w;if(c.measureText(n).width>maxW&&cur){out.push(cur);cur=w}else cur=n});if(cur)out.push(cur)});return out}
function para(c,t,x,y,o){const sz=o.size;c.save();c.font=A(o.w||400,sz);const ls=wrapW(c,t,o.maxW).slice(0,o.lines||3);const lh=sz*(o.lh||1.32);c.direction='rtl';c.textAlign=o.align||'right';c.fillStyle=o.color||NAVY;ls.forEach((l,i)=>c.fillText(ISO(l),x,y+i*lh));c.restore();return y+(ls.length-1)*lh}
// headline that fills a width: biggest size that fits in max lines
function fitHead(c,t,maxW,o){let size=o.max||150;const min=o.min||54;let ls;for(;;){c.font=A(o.w||900,size);LS(c,((o.track??-.02)*size).toFixed(1)+'px');ls=wrapW(c,ISO(t),maxW);LS(c,'0px');if(ls.length<=(o.lines||3)||size<=min)break;size-=4}return{size,ls,lh:size*(o.lh||1.0)}}
function drawHead(c,F,x,y,col,o={}){c.save();c.font=A(o.w||900,F.size);LS(c,((o.track??-.02)*F.size).toFixed(1)+'px');c.direction='rtl';c.textAlign=o.align||'right';c.fillStyle=col;F.ls.forEach((l,i)=>c.fillText(l,x,y+F.size*.82+i*F.lh));c.restore();LS(c,'0px');return y+F.size*.82+(F.ls.length-1)*F.lh+F.size*.2}
function pill(c,t,xr,y,bg,fg,size=24){c.save();c.font=A(700,size);const tw=c.measureText(ISO(t)).width,ph=size*1.7,pw=tw+size*1.3;c.fillStyle=bg;c.beginPath();c.roundRect?c.roundRect(xr-pw,y-ph*.72,pw,ph,ph/2):c.rect(xr-pw,y-ph*.72,pw,ph);c.fill();c.fillStyle=fg;c.direction='rtl';c.textAlign='center';c.fillText(ISO(t),xr-pw/2,y);c.restore();return pw}
// a torn paper edge between two areas: deterministic per post
function tornPath(c,y,amp,seed,step=18){const r=rnd(seed);c.moveTo(0,y);for(let x=0;x<=W+step;x+=step){c.lineTo(x,y+(r()-.5)*amp*2+(r()<.12?(r()-.5)*amp*2.4:0))}}
function items(p){return (p.items||[]).map(it=>Array.isArray(it)?{v:it[0],l:it[1]}:{v:it.v??it.big??'',l:it.l??it.label??''}).filter(x=>x.v!==''||x.l)}
function folio(c,p,fg,sub,line){hair(c,M,H-98,W-M,H-98,line,1);const w=T(c,'קבוצת קורקוס',W-M,H-58,{w:700,size:22,color:fg});T(c,'מקרקע ועד מסירת מפתח',W-M-w-18,H-58,{w:500,size:22,color:sub});T(c,'kurkoos-group.co.il',M,H-58,{size:21,color:sub,align:'left',ltr:true})}
function masthead(c,p,fg,sub){c.save();c.fillStyle=RED;c.fillRect(W-M-16,63,16,16);c.restore();T(c,p.label||'מגזין קורקוס',W-M-30,78,{w:700,size:24,color:fg,track:.04});T(c,p.issue||'מגזין הבנייה של קבוצת קורקוס',M,78,{w:500,size:22,color:sub,align:'left'})}
function cta(c,p,x,y,bg,fg){if(p.cta)return pill(c,p.cta,x,y,bg,fg,26);return 0}
const L={};

// 1 COVER · the post as a magazine cover: masthead in paper over the photo, headline on the roof line, coverlines from the list
L.x_mag_cover=(c,p,I)=>{c.fillStyle=NAVY;c.fillRect(0,0,W,H);if(!shot(c,I,p.shot,0,0,W,H)){c.fillStyle=NAVY2;c.fillRect(0,0,W,H)}
  let g=c.createLinearGradient(0,0,0,420);g.addColorStop(0,'rgba(7,41,58,.72)');g.addColorStop(1,'rgba(7,41,58,0)');c.fillStyle=g;c.fillRect(0,0,W,420);
  g=c.createLinearGradient(0,H*.42,0,H);g.addColorStop(0,'rgba(7,41,58,0)');g.addColorStop(.55,'rgba(7,41,58,.78)');g.addColorStop(1,'rgba(7,41,58,.95)');c.fillStyle=g;c.fillRect(0,H*.42,W,H*.58);
  // masthead
  c.save();c.font=A(900,236);LS(c,'-9px');c.direction='rtl';c.textAlign='right';c.fillStyle=PAPER;c.globalAlpha=.96;c.fillText('קורקוס',W-M+6,300);c.restore();LS(c,'0px');
  T(c,p.label||'מגזין הבנייה',W-M,92,{w:700,size:24,color:WHITE,track:.06});T(c,p.issue||'קבוצת קורקוס · השרון',M,92,{w:500,size:22,color:'rgba(255,255,255,.86)',align:'left'});
  const F=fitHead(c,p.head||'',W-2*M,{max:118,min:62,lines:3,w:900});const hy=H-210-F.lh*F.ls.length-(p.sub?92:0);
  c.save();c.fillStyle=RED;c.fillRect(W-M-150,hy-34,150,12);c.restore();
  const b=drawHead(c,F,W-M,hy,WHITE);if(p.sub)para(c,p.sub,W-M,b+52,{size:32,maxW:W-2*M-40,color:'rgba(255,255,255,.9)',lines:2});
  const cl=items(p).slice(0,3);cl.forEach((it,i)=>{const y=380+i*58;T(c,String(it.v||'')+(it.l?'  '+it.l:''),M,y,{w:700,size:28,color:WHITE,align:'left'})});
  if(cl.length)hair(c,M,348,M+300,348,'rgba(255,255,255,.6)',2);
  T(c,'kurkoos-group.co.il',M,H-58,{size:21,color:'rgba(255,255,255,.78)',align:'left',ltr:true});T(c,'קבוצת קורקוס',W-M,H-58,{w:700,size:22,color:WHITE})};

// 2 BREAK · the headline cracks into three slices with a red fault line, the photo shows through the band
L.x_mag_break=(c,p,I)=>{const t=TH[p.theme]||TH.dark;c.fillStyle=t.bg;c.fillRect(0,0,W,H);masthead(c,p,t.fg,t.sub);
  const by=150,bh=540;
  // photo band and headline are composed on one sheet, then the sheet is broken once, top to bottom
  const F=fitHead(c,p.head||'',W-2*M,{max:132,min:64,lines:3,w:900,track:-.03});const hh=Math.ceil(F.size*.82+(F.ls.length-1)*F.lh+F.size*.34);
  const top=by+bh-Math.round(hh*.55);const bot=top+hh+30;
  const sh=document.createElement('canvas');sh.width=W;sh.height=H;const o=sh.getContext('2d');o.fillStyle=t.bg;o.fillRect(0,0,W,H);
  if(!shot(o,I,p.shot,0,by,W,bh)){o.fillStyle=TEAL;o.fillRect(0,by,W,bh)}o.fillStyle='rgba(7,41,58,.25)';o.fillRect(0,by,W,bh);
  const gr=o.createLinearGradient(0,by+bh-260,0,by+bh);gr.addColorStop(0,'rgba(7,41,58,0)');gr.addColorStop(1,'rgba(7,41,58,.7)');o.fillStyle=gr;o.fillRect(0,by+bh-260,W,260);
  drawHead(o,F,W-M,top,t.fg,{track:-.03});
  const r=rnd(p.seed||5);o.font=A(900,F.size);const tw=Math.min(W-2*M,Math.max(...F.ls.map(l=>o.measureText(l).width)));const tl=W-M-tw;
  const xa=tl+tw*(.4+r()*.14);const pts=[];const n=9;for(let i=0;i<=n;i++){const yy=by+(bot-by)*i/n;pts.push([xa+(r()-.5)*(i&&i<n?70:20)+(i-n/2)*6,yy])}
  const DX=-18,DY=14;
  const piece=(right,dx,dy)=>{c.save();c.translate(dx,dy);c.beginPath();if(right){c.moveTo(W,by);pts.forEach(([x,y])=>c.lineTo(x,y));c.lineTo(W,bot)}else{c.moveTo(0,by);pts.forEach(([x,y])=>c.lineTo(x,y));c.lineTo(0,bot)}c.closePath();c.clip();c.drawImage(sh,0,0);c.restore()};
  // the fault: red under the gap
  c.save();c.fillStyle=RED;c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));for(let i=pts.length-1;i>=0;i--){const [x,y]=pts[i];c.lineTo(x+DX,y+DY)}c.closePath();c.fill();c.restore();
  piece(true,0,0);c.save();c.shadowColor='rgba(0,0,0,.45)';c.shadowBlur=18;c.shadowOffsetX=-6;piece(false,DX,DY);c.restore();
  const yb=bot+DY+20;if(p.sub)para(c,p.sub,W-M,yb+40,{size:34,maxW:W-2*M,color:t.sub,lines:2});
  const its=items(p).slice(0,3);if(its.length){const y=Math.min(H-250,yb+170);its.forEach((it,i)=>{const cw=(W-2*M)/its.length,xr=W-M-i*cw;hair(c,xr,y-50,xr-cw+30,y-50,t.line,1.5);T(c,String(it.v),xr,y+10,{w:800,size:52,color:t.fg});T(c,it.l||'',xr,y+52,{w:500,size:26,color:t.sub})})}
  cta(c,p,W-M,H-150,RED,WHITE);folio(c,p,t.fg,t.sub,t.line)};

// 3 NUMERAL · a giant number holds the photo and bleeds off the edge; the list it promises sits beside it
L.x_mag_numeral=(c,p,I)=>{c.fillStyle=PAPER;c.fillRect(0,0,W,H);masthead(c,p,NAVY,SLATE);
  const its=items(p);const num=String(p.num||((its[0]&&/^\d+$/.test(String(its[0].v))&&its.length<2)?its[0].v:(its.length||3)));
  const nr=its.filter(x=>x.l).slice(0,5).length;const avail=H-170-nr*62-50-150;const size=Math.max(420,Math.min(num.length>1?700:900,avail/.86)),base=150+size*.86;
  const off=document.createElement('canvas');off.width=W;off.height=H;const o=off.getContext('2d');
  if(!shot(o,I,p.shot,0,120,W,size)){o.fillStyle=TEAL;o.fillRect(0,0,W,H)}
  o.globalCompositeOperation='destination-in';o.font=A(900,size);LS(o,(-size*.05)+'px');o.textAlign='left';o.direction='ltr';o.fillText(num,-size*.03,base);
  c.save();c.font=A(900,size);LS(c,(-size*.05)+'px');c.textAlign='left';c.direction='ltr';c.fillStyle=NAVY;c.fillText(num,-size*.03+10,base+10);c.restore();LS(c,'0px');
  c.drawImage(off,0,0);
  const F=fitHead(c,p.head||'',W*.5,{max:88,min:50,lines:4,w:900});const b=drawHead(c,F,W-M,200,NAVY);
  if(p.sub)para(c,p.sub,W-M,b+50,{size:30,maxW:W*.46,color:SLATE,lines:3});
  const rows=its.filter(x=>x.l).slice(0,5);let y=Math.max(base+30,H-160-rows.length*62);rows.forEach((it,i)=>{hair(c,M,y,W-M,y,LINE,1.5);T(c,String(i+1).padStart(2,'0'),W-M,y+44,{w:800,size:28,color:RED});T(c,it.l,W-M-64,y+44,{w:600,size:30,color:NAVY});y+=62});
  folio(c,p,NAVY,SLATE,LINE)};

// 4 MYTH · the myth on paper, struck through in red; what really happens on navy below a torn edge
L.x_mag_myth=(c,p,I)=>{c.fillStyle=PAPER;c.fillRect(0,0,W,H);masthead(c,p,NAVY,SLATE);const split=640;
  T(c,'מיתוס',W-M,190,{w:800,size:30,color:RED,track:.08});
  const F=fitHead(c,p.myth||p.head||'',W-2*M,{max:104,min:56,lines:3,w:800});const b=drawHead(c,F,W-M,224,NAVY,{w:800});
  // strike
  c.save();c.strokeStyle=RED;c.lineWidth=9;c.lineCap='round';F.ls.forEach((l,i)=>{c.font=A(800,F.size);const w=Math.min(W-2*M,c.measureText(l).width);const y=224+F.size*.5+i*F.lh;c.beginPath();c.moveTo(W-M+8,y+6);c.lineTo(W-M-w-8,y-6);c.stroke()});c.restore();
  // torn edge then navy
  c.save();c.beginPath();tornPath(c,split,14,p.seed||9);c.lineTo(W,H);c.lineTo(0,H);c.closePath();c.fillStyle=NAVY;c.shadowColor='rgba(7,41,58,.35)';c.shadowBlur=18;c.shadowOffsetY=-4;c.fill();c.restore();
  if(p.shot){c.save();c.beginPath();tornPath(c,split,14,p.seed||9);c.lineTo(W,H);c.lineTo(0,H);c.closePath();c.clip();c.globalAlpha=.34;shot(c,I,p.shot,0,split-30,W,H-split+30);c.restore()}
  T(c,'בפועל',W-M,split+120,{w:800,size:30,color:MIST,track:.08});
  const tr=p.truth||p.sub||'';const y2=para(c,tr,W-M,split+215,{size:tr.length>70?50:62,w:800,maxW:W-2*M,color:WHITE,lines:4,lh:1.18});
  const its=items(p).filter(x=>x.l).slice(0,3);its.forEach((it,i)=>{const y=y2+90+i*56;c.save();c.fillStyle=RED;c.fillRect(W-M-12,y-20,12,12);c.restore();T(c,it.l,W-M-30,y-8,{w:500,size:30,color:'rgba(255,255,255,.9)'})});
  cta(c,p,W-M,H-150,RED,WHITE);folio(c,p,WHITE,MIST,'rgba(143,182,200,.3)')};

// 5 TORN · two moments of the same house joined by a torn strip of paper that carries the headline
L.x_mag_torn=(c,p,I)=>{c.fillStyle=NAVY;c.fillRect(0,0,W,H);const s2=p.shot2||(p.shot?{k:p.shot.k,r:[.2,.15,.6,.7]}:null);
  if(!shot(c,I,p.shot,0,0,W,560)){c.fillStyle=TEAL;c.fillRect(0,0,W,560)}if(!shot(c,I,s2,0,800,W,H-800)){c.fillStyle=NAVY2;c.fillRect(0,800,W,H-800)}
  c.fillStyle='rgba(7,41,58,.18)';c.fillRect(0,0,W,H);
  const seed=p.seed||3;c.save();c.beginPath();tornPath(c,500,16,seed);c.lineTo(W,840);tornPath(c,860,16,seed+7);c.closePath();c.restore();
  // paper strip with two torn edges
  c.save();c.beginPath();c.moveTo(0,500);const r=rnd(seed);for(let x=0;x<=W+18;x+=18)c.lineTo(x,500+(r()-.5)*28);const r2=rnd(seed+7);const pts=[];for(let x=W+18;x>=-18;x-=18)pts.push([x,880+(r2()-.5)*28]);pts.forEach(([x,y])=>c.lineTo(x,y));c.closePath();c.fillStyle=PAPER;c.shadowColor='rgba(0,0,0,.35)';c.shadowBlur=24;c.fill();c.restore();
  masthead(c,p,WHITE,'rgba(255,255,255,.86)');
  const F=fitHead(c,p.head||'',W-2*M,{max:90,min:52,lines:3,w:900});const b=drawHead(c,F,W-M,548,NAVY);if(p.sub)para(c,p.sub,W-M,b+50,{size:30,maxW:W-2*M,color:SLATE,lines:2});
  const its=items(p).slice(0,2);if(its[0])pill(c,(its[0].v?its[0].v+' ':'')+(its[0].l||''),W-M,470,RED,WHITE,26);if(its[1])pill(c,(its[1].v?its[1].v+' ':'')+(its[1].l||''),W-M,950,'rgba(7,41,58,.9)',WHITE,26);
  cta(c,p,M+260,H-140,RED,WHITE);T(c,'kurkoos-group.co.il',M,H-58,{size:21,color:'rgba(255,255,255,.86)',align:'left',ltr:true});T(c,'קבוצת קורקוס',W-M,H-58,{w:700,size:22,color:WHITE})};

// 6 COST · one figure big enough to read in the feed, then what it is made of, one bar each, the biggest in red
L.x_mag_cost=(c,p,I)=>{const t=TH[p.theme]||TH.light;c.fillStyle=t.bg;c.fillRect(0,0,W,H);masthead(c,p,t.fg,t.sub);
  const its=items(p);const lead=its[0]||{v:'',l:''};const rest=its.slice(1,6);
  const F=fitHead(c,p.head||'',W-2*M,{max:72,min:48,lines:2,w:800});const b=drawHead(c,F,W-M,140,t.fg,{w:800});
  const nv=String(lead.v||'');let ns=Math.min(300,Math.floor((W-2*M)/Math.max(1,nv.length*0.62)));T(c,nv,W-M,b+ns*.92+20,{w:900,size:ns,color:t.fg===WHITE?WHITE:NAVY,track:-.04});T(c,lead.l||'',W-M,b+ns*.92+80,{w:600,size:32,color:RED});
  let y=b+ns+170;const vals=rest.map(x=>parseFloat(String(x.v).replace(/[^\d.]/g,''))||0);const mx=Math.max(...vals,1);const top=vals.indexOf(Math.max(...vals));
  rest.forEach((it,i)=>{const w=Math.max(60,(W-2*M-260)*(vals[i]/mx));c.save();c.fillStyle=i===top?RED:(t.fg===WHITE?MIST:TEAL);c.fillRect(W-M-w,y,w,34);c.restore();T(c,String(it.v),W-M-w-16,y+30,{w:800,size:32,color:t.fg,align:'right'});T(c,it.l,W-M,y+76,{w:600,size:28,color:t.sub});y+=118});
  if(p.sub)para(c,p.sub,W-M,Math.min(H-170,y+30),{size:28,maxW:W-2*M,color:t.sub,lines:2});folio(c,p,t.fg,t.sub,t.line)};

// 7 SPEC · the house as a spec sheet: photo on top, six facts in a hairline grid, values large and labels small
L.x_mag_spec=(c,p,I)=>{c.fillStyle=WHITE;c.fillRect(0,0,W,H);const ph=560;if(!shot(c,I,p.shot,0,0,W,ph)){c.fillStyle=MIST1;c.fillRect(0,0,W,ph)}
  const g=c.createLinearGradient(0,ph-300,0,ph);g.addColorStop(0,'rgba(7,41,58,0)');g.addColorStop(1,'rgba(7,41,58,.85)');c.fillStyle=g;c.fillRect(0,ph-300,W,300);
  c.save();c.fillStyle=RED;c.fillRect(W-M-16,63,16,16);c.restore();T(c,p.label||'כרטיס פרויקט',W-M-30,78,{w:700,size:24,color:WHITE});
  const F=fitHead(c,p.head||'',W-2*M,{max:84,min:50,lines:2,w:900});drawHead(c,F,W-M,ph-40-F.lh*F.ls.length,WHITE);
  const its=items(p).slice(0,6);const cols=its.length>4?3:2,rows=Math.ceil(its.length/cols)||1;const gx=M,gw=W-2*M,gy=ph+60,gh=Math.min(520,H-180-gy),cw=gw/cols,rh=gh/rows;
  its.forEach((it,i)=>{const col=i%cols,row=Math.floor(i/cols);const xr=W-M-col*cw,y=gy+row*rh;hair(c,xr-cw+20,y,xr,y,NAVY,2);const vs=Math.min(88,Math.floor((cw-30)/Math.max(1,String(it.v).length*.58)));T(c,String(it.v),xr,y+vs+20,{w:900,size:vs,color:NAVY,track:-.03});T(c,it.l||'',xr,y+vs+70,{w:600,size:30,color:'#33475a'})});
  if(p.sub)para(c,p.sub,W-M,H-150,{size:26,maxW:W-2*M,color:SLATE,lines:1});folio(c,p,NAVY,SLATE,LINE)};

// 8 QUOTE · an editorial pull quote in our own voice: huge red quote mark, light display type, generous paper
L.x_mag_quote=(c,p,I)=>{const t=TH[p.theme]||TH.light;c.fillStyle=t.bg;c.fillRect(0,0,W,H);masthead(c,p,t.fg,t.sub);
  c.save();c.font=A(900,420);c.fillStyle=RED;c.globalAlpha=.95;c.textAlign='right';c.direction='ltr';c.fillText('״',W-M+10,470);c.restore();
  const F=fitHead(c,p.head||'',W-2*M,{max:132,min:60,lines:4,w:500,track:-.015,lh:1.08});
  c.save();c.font=A(400,34);const sl=p.sub?Math.min(3,wrapW(c,p.sub,W-2*M-60).length):0;c.restore();
  const blockH=F.size*.82+(F.ls.length-1)*F.lh+F.size*.2+(sl?60+sl*45:0);const top=Math.max(420,Math.round(420+(H-420-330-blockH)/2));
  const b=drawHead(c,F,W-M,top,t.fg,{w:500,track:-.015});
  if(p.sub)para(c,p.sub,W-M,b+60,{size:34,maxW:W-2*M-60,color:t.sub,lines:3});
  if(p.shot){const s=150,x=M,y=H-150-s-60;c.save();c.beginPath();c.arc(x+s/2,y+s/2,s/2,0,7);c.clip();shot(c,I,p.shot,x,y,s,s);c.restore();c.save();c.strokeStyle=RED;c.lineWidth=4;c.beginPath();c.arc(x+s/2,y+s/2,s/2+6,0,7);c.stroke();c.restore()}
  cta(c,p,W-M,H-180,RED,WHITE);folio(c,p,t.fg,t.sub,t.line)};

// renders are always labelled: a small tag on the picture
Object.keys(L).forEach(k=>{const f=L[k];L[k]=(c,p,I)=>{f(c,p,I);if(p.tag)pill(c,p.tag,M+150,k==='x_mag_cover'?150:(k==='x_mag_spec'||k==='x_mag_torn'?140:230),'rgba(7,41,58,.85)',WHITE,22)}});
G.FX.L=G.FX.L||{};Object.assign(G.FX.L,L);G.FX9=L;
})(window);
/*FX9:END*/
