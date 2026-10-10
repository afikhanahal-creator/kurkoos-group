/*FX14B:START*/
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
// ---------- Kurkoos WORLD · B: search, ticket, forecast, postcard, scoreboard, photoquote, indexcard.
// ---- local helpers
const one=(c,t,maxW,f,w,max,min)=>{t=ISO(clean(t));let s=max;for(;s>min;s-=2){c.font=f(w,s);if(c.measureText(t).width<=maxW)break}return s};
const ell=(c,t,maxW,f,w,s)=>{t=clean(t);c.font=f(w,s);if(c.measureText(ISO(t)).width<=maxW)return t;while(t.length>2&&c.measureText(ISO(t+'…')).width>maxW)t=t.slice(0,-1);return t.trim()+'…'};
const lw=(c,t,f,w,s,track=0)=>{c.save();c.font=f(w,s);LS(c,(track*s).toFixed(1)+'px');const x=c.measureText(ISO(clean(t))).width;c.restore();LS(c,'0px');return x};
const lines=(c,t,maxW,f,w,s)=>{c.font=f(w,s);return wrapW(c,t,maxW)};
// stamp painted on its own layer, then worn with random specks and laid down at an angle
function stampLayer(sz,draw,seed,wear=.5){const o=document.createElement('canvas');o.width=o.height=sz;const x=o.getContext('2d');draw(x,sz);const r=rnd(seed||11);
  x.globalCompositeOperation='destination-out';for(let i=0;i<Math.round(260*wear);i++){x.globalAlpha=.25+r()*.7;x.beginPath();x.arc(r()*sz,r()*sz,.6+r()*2.6,0,7);x.fill()}
  for(let i=0;i<5;i++){x.globalAlpha=.18;x.fillRect(r()*sz,0,1+r()*3,sz)}x.globalAlpha=1;return o}
function putStamp(c,o,cx,cy,ang,a=.9){c.save();c.translate(cx,cy);c.rotate(ang);c.globalAlpha=a;c.drawImage(o,-o.width/2,-o.height/2);c.restore()}
function ringText(x,t,cx,cy,r,s,w){x.save();x.font=HE(w,s);x.textAlign='center';x.textBaseline='middle';const ch=[...t];const step=(Math.PI*2)/ch.length;let a=-Math.PI/2;
  ch.forEach(k=>{x.save();x.translate(cx+Math.cos(a)*r,cy+Math.sin(a)*r);x.rotate(a+Math.PI/2);x.fillText(k,0,0);x.restore();a-=step});x.restore()}
function roundStamp(c,cx,cy,R,ring,center,seed,ang,col=RED){const sz=R*2+24;const o=stampLayer(sz,(x,s)=>{const m=s/2;x.strokeStyle=col;x.fillStyle=col;
  x.lineWidth=7;x.beginPath();x.arc(m,m,R-4,0,7);x.stroke();x.lineWidth=3;x.beginPath();x.arc(m,m,R-50,0,7);x.stroke();
  let rt=ring;x.font=HE(700,26);while(x.measureText(rt+' ').width<2*Math.PI*(R-27)*.62)rt+=' · '+ring;ringText(x,rt+' · ',m,m,R-27,26,700);
  x.font=HE(900,center.length>5?34:44);x.textAlign='center';x.textBaseline='middle';x.direction='rtl';x.fillText(center,m,m+2)},seed,.55);putStamp(c,o,cx,cy,ang,.88)}
function mag(c,cx,cy,r,col,lw2){c.save();c.strokeStyle=col;c.lineWidth=lw2;c.lineCap='round';c.beginPath();c.arc(cx,cy,r,0,7);c.stroke();c.beginPath();c.moveTo(cx-r*.72,cy+r*.72);c.lineTo(cx-r*1.55,cy+r*1.55);c.stroke();c.restore()}
function shadowCard(c,x,y,w,h,r,fill,blur=50,dy=24,a=.22){c.save();c.shadowColor=`rgba(7,41,58,${a})`;c.shadowBlur=blur;c.shadowOffsetY=dy;c.fillStyle=fill;rr(c,x,y,w,h,r);c.fill();c.restore()}
const code=(p,n=6)=>{const r=rnd((p.seed||7)*97+13);let s='';for(let i=0;i<n;i++)s+=Math.floor(r()*10);return s};

// 1 SEARCH · the question people type, in a large calm search box, with what comes up under it
L.x_w_search=(c,p,I)=>{c.fillStyle=PAPER;c.fillRect(0,0,W,H);const g=c.createRadialGradient(W/2,H*.42,40,W/2,H*.42,820);g.addColorStop(0,'rgba(143,182,200,.22)');g.addColorStop(1,'rgba(143,182,200,0)');c.fillStyle=g;c.fillRect(0,0,W,H);
  index(c,p.label||'חיפוש',false);const its=items(p).filter(x=>x.l||x.v).slice(0,4);
  const bx=M,bw=W-2*M,pad=56,ic=96;const F=fit(c,p.head||'',bw-pad*2-ic,{w:700,max:80,min:72,lines:4,lh:1.12,track:-.01});
  const qh=pad*2+F.size*.95+(F.ls.length-1)*F.lh;let rowH=96,gap=70,brandH=110;const top=150,bottom=1180;
  let subL=p.sub?lines(c,p.sub,bw-40,HE,300,36).slice(0,2):[];const tot=()=>brandH+gap+qh+(its.length?28+its.length*rowH+20:0)+(subL.length?50+subL.length*50:0)+(p.cta?126:0);
  if(tot()>bottom-top){rowH=84;gap=50}if(tot()>bottom-top&&subL.length>1)subL=subL.slice(0,1);if(tot()>bottom-top)subL=[];if(tot()>bottom-top){brandH=0;gap=0}
  const dd=its.length?28+its.length*rowH+20:0;const card=qh+dd;const total=tot();let y=top+Math.max(0,(bottom-top-total)/2);
  // brand: the towers and the name, quiet, centred like a search home page
  if(brandH){c.font=HE(700,76);const nw=c.measureText('קורקוס').width;const gx=W/2-(nw+70)/2;mark(c,gx+4,y+14,1.4,NAVY);T(c,'קורקוס',gx+nw+70,y+86,{w:700,size:76,color:NAVY,track:-.02});c.fillStyle=RED;c.beginPath();c.arc(gx+nw+78,y+82,7,0,7);c.fill()}
  y+=brandH+gap;
  // the box
  shadowCard(c,bx,y,bw,card,48,WHITE,60,26,.16);c.strokeStyle='rgba(16,85,114,.18)';c.lineWidth=2;rr(c,bx+1,y+1,bw-2,card-2,48);c.stroke();
  mag(c,W-M-pad-18,y+pad+F.size*.42,20,TEAL,6);const tx=W-M-pad-ic;const lb=head(c,F,tx,y+pad-F.size*.08,NAVY);
  c.save();c.font=F.f(F.w,F.size);LS(c,(F.track*F.size).toFixed(1)+'px');const last=F.ls[F.ls.length-1]||'';const lwid=c.measureText(last).width;c.restore();LS(c,'0px');
  c.fillStyle=RED;c.fillRect(tx-lwid-16,lb-F.size*.78,6,F.size*.95);
  if(its.length){const sy=y+qh;c.fillStyle=LINE;c.fillRect(bx+pad,sy,bw-2*pad,2);
    its.forEach((it,i)=>{const ry=sy+28+i*rowH;const t=it.l||it.v;mag(c,W-M-pad-16,ry+rowH/2-6,12,MIST,4);
      const s=one(c,t,bw-2*pad-ic-60,HE,400,38,34);const tt=ell(c,t,bw-2*pad-ic-60,HE,400,s);T(c,tt,tx,ry+rowH/2+s*.34,{w:400,size:s,color:i===0?NAVY:SLATE});
      c.save();c.strokeStyle=MIST;c.lineWidth=3;c.lineCap='round';const ax=bx+pad+8,ay=ry+rowH/2-4;c.beginPath();c.moveTo(ax+22,ay+16);c.lineTo(ax,ay-6);c.moveTo(ax,ay-6);c.lineTo(ax+14,ay-6);c.moveTo(ax,ay-6);c.lineTo(ax,ay+8);c.stroke();c.restore()})}
  y+=card;if(subL.length){y+=50;subL.forEach((l,i)=>T(c,l,W/2,y+i*50+30,{w:300,size:36,color:SLATE,align:'center'}));y+=subL.length*50}
  if(p.cta){y+=50;y=Math.min(y,bottom-76);c.font=HE(700,34);const cw=c.measureText(ISO(clean(p.cta))).width+96;c.fillStyle=MIST1;rr(c,W/2-cw/2,y,cw,76,38);c.fill();T(c,p.cta,W/2,y+50,{w:700,size:34,color:NAVY,align:'center'})}
  foot(c,false)};

// 2 TICKET · an admission ticket on a navy table: perforated stub, fields, a serial, a red stamp
L.x_w_ticket=(c,p,I)=>{c.fillStyle=NAVY;c.fillRect(0,0,W,H);grid(c,WHITE,.035);index(c,p.label||'כרטיס כניסה',true);
  const tx=M+12,tw=W-2*M-24,ty=150,th=1030,py=ty+th-250,nr=34;
  c.save();c.shadowColor='rgba(0,0,0,.45)';c.shadowBlur=60;c.shadowOffsetY=30;c.beginPath();c.moveTo(tx+18,ty);c.lineTo(tx+tw-18,ty);c.quadraticCurveTo(tx+tw,ty,tx+tw,ty+18);c.lineTo(tx+tw,py-nr);c.arc(tx+tw,py,nr,-Math.PI/2,Math.PI/2,true);
  c.lineTo(tx+tw,ty+th-18);c.quadraticCurveTo(tx+tw,ty+th,tx+tw-18,ty+th);c.lineTo(tx+18,ty+th);c.quadraticCurveTo(tx,ty+th,tx,ty+th-18);c.lineTo(tx,py+nr);c.arc(tx,py,nr,Math.PI/2,-Math.PI/2,true);c.lineTo(tx,ty+18);c.quadraticCurveTo(tx,ty,tx+18,ty);c.closePath();
  c.fillStyle=PAPER;c.fill();c.restore();
  // fine print frame
  c.strokeStyle=NAVY;c.lineWidth=3;c.strokeRect(tx+34,ty+34,tw-68,py-ty-68);c.lineWidth=1;c.strokeRect(tx+44,ty+44,tw-88,py-ty-88);
  // guilloche band under the title
  const ix=tx+tw-80,iw=tw-160;T(c,'כרטיס כניסה',ix,ty+120,{w:700,size:30,color:RED,track:.16});const sn=code(p,6);T(c,'No. '+sn.slice(0,3)+' '+sn.slice(3),tx+80,ty+120,{w:400,size:28,color:SLATE,align:'left',ltr:true,track:.08});
  c.fillStyle=NAVY;c.fillRect(tx+80,ty+150,iw,2);
  const its=items(p).slice(0,4);const rows=Math.ceil(its.length/2);let rowH=150;const lim=py-90-rows*rowH-60;let F;for(let mx=124;;mx-=4){F=fit(c,p.head||'',iw,{w:900,max:mx,min:72,lines:3,lh:1.02,track:-.025});if(ty+190+F.size*.8+(F.ls.length-1)*F.lh<=lim||mx<=72)break}let y=head(c,F,ix,ty+190,NAVY);if(y>lim)rowH=Math.max(118,(py-90-60-y)/Math.max(1,rows));
  // fields, two by two
  const fy=Math.max(y+60,py-90-rows*rowH);const cw=(iw-50)/2;
  its.forEach((it,i)=>{const col=i%2,row=Math.floor(i/2);const x=ix-col*(cw+50),yy=fy+row*rowH;c.fillStyle=LINE;c.fillRect(x-cw,yy-12,cw,2);
    T(c,it.v||'',x,yy+30,{w:400,size:28,color:SLATE,track:.04});const s=one(c,it.l,cw,HE,700,44,34);const tt=ell(c,it.l,cw,HE,700,s);T(c,tt,x,yy+30+s+12,{w:700,size:s,color:NAVY})});
  if(!its.length&&p.sub)para(c,p.sub,ix,y+90,{f:HE,w:400,size:36,maxW:iw,lines:3,color:SLATE});
  // perforation
  c.fillStyle='rgba(7,41,58,.55)';for(let x=tx+nr+16;x<tx+tw-nr-10;x+=22){c.beginPath();c.arc(x,py,4,0,7);c.fill()}
  // stub: serial and a barcode built from the seed
  const r=rnd((p.seed||7)*31);let bxx=tx+70;const bh=120,by=py+62;while(bxx<tx+tw*.5){const w=1+Math.floor(r()*4)*2;c.fillStyle=NAVY;c.fillRect(bxx,by,w,bh);bxx+=w+2+Math.floor(r()*3)*2}
  T(c,'KRK-'+sn,tx+70,by+bh+44,{w:700,size:28,color:NAVY,align:'left',ltr:true,track:.18});
  T(c,'קבוצת קורקוס',ix,py+108,{w:700,size:34,color:NAVY});T(c,clean(p.cta||'מקרקע ועד מסירת מפתח'),ix,py+156,{w:400,size:28,color:SLATE});
  roundStamp(c,tx+tw*.5,py+4,112,'קבוצת קורקוס','בתוקף',(p.seed||7)+3,-.22);
  foot(c,true)};

// 3 FORECAST · the site week as a weather strip: a drawn sky for every day, the work under it
function wxKind(t,i){t=clean(t);if(/יציק|בטון|איטום|מים|ניקוז|גשם|רטוב|ביוב|אינסטלצ|צנרת|הצפ|בריכ|ממברנ/.test(t))return'rain';if(/פיגום|מנוף|הרמ|רוח|גג|חזית|פינוי|ניקיון|אבק|חפיר|עפר|הריס/.test(t))return'wind';
  if(/פיקוח|בדיק|ביקור|תכנון|ישיב|מדיד|סימון|תיאום|פגיש|הכנ|ברזל|זיון|תבנית|חשמל|תשתי/.test(t))return'cloud';if(/מסיר|סיום|גמר|מפתח|ייבוש|אשפר|מנוח|שבת|חופש|צבע|ריצוף|חגיג|אישור|טופס/.test(t))return'sun';return['part','sun','cloud','part','wind'][i%5]}
function cloudP(c,x,y,s){c.beginPath();c.moveTo(x-1.1*s,y+.5*s);c.arc(x-.62*s,y+.08*s,.44*s,Math.PI*.5,Math.PI*1.5);c.arc(x-.05*s,y-.22*s,.62*s,Math.PI*1.08,Math.PI*1.95);c.arc(x+.62*s,y+.12*s,.4*s,Math.PI*1.4,Math.PI*.5);c.closePath()}
function wx(c,k,x,y,s){c.save();c.lineCap='round';c.lineJoin='round';
  const sun=(sx,sy,r)=>{c.fillStyle=RED;c.beginPath();c.arc(sx,sy,r,0,7);c.fill();c.strokeStyle=RED;c.lineWidth=s*.07;for(let i=0;i<8;i++){const a=i*Math.PI/4;c.beginPath();c.moveTo(sx+Math.cos(a)*r*1.42,sy+Math.sin(a)*r*1.42);c.lineTo(sx+Math.cos(a)*r*1.85,sy+Math.sin(a)*r*1.85);c.stroke()}};
  const cl=(cx,cy,ss,fill)=>{cloudP(c,cx,cy,ss);c.fillStyle=fill;c.fill()};
  if(k==='sun')sun(x,y,s*.42);
  if(k==='part'){sun(x+s*.32,y-s*.3,s*.3);c.save();c.strokeStyle=NAVY;c.lineWidth=s*.1;cloudP(c,x-s*.08,y+s*.12,s*.62);c.stroke();c.restore();cl(x-s*.08,y+s*.12,s*.62,WHITE)}
  if(k==='cloud'){cl(x+s*.34,y-s*.22,s*.42,MIST);c.save();c.strokeStyle=NAVY;c.lineWidth=s*.1;cloudP(c,x-s*.06,y+s*.06,s*.7);c.stroke();c.restore();cl(x-s*.06,y+s*.06,s*.7,WHITE)}
  if(k==='rain'){cl(x,y-s*.22,s*.68,WHITE);c.strokeStyle=MIST;c.lineWidth=s*.09;[-.42,0,.42].forEach((d,i)=>{c.beginPath();c.moveTo(x+d*s+s*.08,y+s*.42+(i%2)*s*.1);c.lineTo(x+d*s-s*.06,y+s*.72+(i%2)*s*.1);c.stroke()})}
  if(k==='wind'){c.lineWidth=s*.085;const cr=s*.17;
    c.strokeStyle=WHITE;c.beginPath();c.moveTo(x+s*.62,y-s*.12);c.lineTo(x-s*.25,y-s*.12);c.arc(x-s*.25,y-s*.12-cr,cr,Math.PI*.5,Math.PI*1.75,false);c.stroke();
    c.strokeStyle=MIST;c.beginPath();c.moveTo(x+s*.45,y+s*.22);c.lineTo(x-s*.1,y+s*.22);c.arc(x-s*.1,y+s*.22+cr,cr,Math.PI*1.5,Math.PI*.25,true);c.stroke();
    c.strokeStyle=MIST;c.beginPath();c.moveTo(x+s*.62,y-s*.56);c.lineTo(x+s*.02,y-s*.56);c.stroke()}
  c.restore()}
L.x_w_forecast=(c,p,I)=>{const g=c.createLinearGradient(0,0,0,H);g.addColorStop(0,TEAL);g.addColorStop(.75,NAVY);c.fillStyle=g;c.fillRect(0,0,W,H);grid(c,WHITE,.04);index(c,p.label||'תחזית לשבוע באתר',true);
  const its=items(p).slice(0,5);const n=Math.max(1,its.length);const sy0=1180;
  // the headline in the sky above
  const top=170;const F=fit(c,p.head||'',W-2*M,{w:900,max:116,min:72,lines:3,lh:1.0,track:-.03});const subL=p.sub?lines(c,p.sub,W-2*M,HE,300,38).slice(0,2):[];
  const bh=F.size*.8+(F.ls.length-1)*F.lh+(subL.length?50+subL.length*52:0);
  // the strip: day, sky, work; it takes the room the headline leaves
  const cw=(W-2*M)/n;const lab=its.map(it=>lines(c,it.l,cw-30,HE,400,34).slice(0,3));const maxL=Math.max(1,...lab.map(l=>l.length));
  const need=330+maxL*44;const sh=Math.max(need,Math.min(need+200,640,sy0-(top+bh+110)));const sy=sy0-sh;const isz=Math.min(150,cw*.55,(sh-need)*.5+110);
  const b=head(c,F,W-M,top+Math.max(0,(sy0-sh-110-top-bh)*.4),WHITE);subL.forEach((l,i)=>T(c,l,W-M,b+80+i*52,{w:300,size:38,color:MIST1}));
  c.fillStyle='rgba(255,255,255,.07)';rr(c,M,sy,W-2*M,sh,36);c.fill();const lab0=sy+sh-46-(maxL-1)*44;const iy=(sy+120+lab0-40)/2;
  its.forEach((it,i)=>{const x=W-M-i*cw,cx=x-cw/2;if(i>0){c.fillStyle='rgba(255,255,255,.14)';c.fillRect(x,sy+40,2,sh-80)}
    if(i===0){c.fillStyle='rgba(255,255,255,.10)';rr(c,x-cw+10,sy+10,cw-20,sh-20,28);c.fill();c.fillStyle=RED;c.fillRect(cx-28,sy+10,56,6)}
    T(c,it.v,cx,sy+96,{w:700,size:56,color:WHITE,align:'center'});wx(c,wxKind(it.l+' '+it.v,i),cx,iy,isz);
    lab[i].forEach((l,j)=>T(c,l,cx,lab0+j*44,{w:400,size:34,color:i===0?WHITE:MIST1,align:'center'}))});
  foot(c,true)};

// 4 POSTCARD · a card sent from the site: framed print, stamp, postmark, a few words in serif
L.x_w_postcard=(c,p,I)=>{c.fillStyle=MIST1;c.fillRect(0,0,W,H);grid(c,MIST,.18,0,0,W,H,40);index(c,p.label||'גלויה מהאתר',false);
  const F=fit(c,p.head||'',W-2*M,{w:900,max:96,min:72,lines:2,lh:1.02,track:-.03});const b=head(c,F,W-M,140,NAVY);
  const cx0=M,cw=W-2*M,ch=Math.max(640,Math.min(780,1160-(b+80))),cy0=1160-ch;c.save();c.translate(W/2,cy0+ch/2);c.rotate(-.025);c.translate(-W/2,-(cy0+ch/2));
  shadowCard(c,cx0,cy0,cw,ch,6,PAPER,46,22,.25);
  // left half: the framed print
  const hw=cw/2;const fx=cx0+34,fy=cy0+34,fw=hw-64,fh=ch-68-56;c.save();c.shadowColor='rgba(7,41,58,.25)';c.shadowBlur=14;c.shadowOffsetY=6;c.fillStyle=WHITE;c.fillRect(fx,fy,fw,fh);c.restore();
  photo(c,p,I,fx+16,fy+16,fw-32,fh-32);c.strokeStyle='rgba(7,41,58,.15)';c.lineWidth=2;c.strokeRect(fx+16,fy+16,fw-32,fh-32);T(c,'דרישת שלום מהאתר',fx+fw,fy+fh+44,{w:400,size:26,color:SLATE});
  // centre rule
  c.fillStyle=LINE;c.fillRect(cx0+hw,cy0+50,2,ch-100);
  // right half: stamp, postmark, message
  const rx=cx0+cw-34,sw=128,shh=156,sx=rx-sw,sy=cy0+34;c.save();c.fillStyle=WHITE;c.fillRect(sx,sy,sw,shh);c.fillStyle=PAPER;for(let i=0;i<=8;i++){[[sx+i*sw/8,sy],[sx+i*sw/8,sy+shh]].forEach(([a,bb])=>{c.beginPath();c.arc(a,bb,6,0,7);c.fill()})}
  for(let i=0;i<=10;i++){[[sx,sy+i*shh/10],[sx+sw,sy+i*shh/10]].forEach(([a,bb])=>{c.beginPath();c.arc(a,bb,6,0,7);c.fill()})}
  c.fillStyle=TEAL;c.fillRect(sx+14,sy+14,sw-28,shh-28);mark(c,sx+sw/2-16,sy+34,1.05,WHITE);c.fillStyle=RED;c.fillRect(sx+30,sy+shh-40,sw-60,6);c.restore();
  // postmark: rings, ring text and cancel waves crossing the stamp
  const pm=stampLayer(270,(x,s)=>{const m=s/2;x.strokeStyle=NAVY;x.fillStyle=NAVY;x.lineWidth=4;x.beginPath();x.arc(m,m,96,0,7);x.stroke();x.lineWidth=2;x.beginPath();x.arc(m,m,62,0,7);x.stroke();
    ringText(x,'קורקוס · מהאתר · ',m,m,79,26,700);x.font=HE(700,26);x.textAlign='center';x.direction='rtl';x.fillText('מהשטח',m,m+9)},(p.seed||7)+5,.45);
  putStamp(c,pm,sx-70,sy+72,-.18,.55);c.save();c.strokeStyle='rgba(7,41,58,.45)';c.lineWidth=3;for(let k=0;k<4;k++){c.beginPath();for(let x=sx-250;x<sx+40;x+=6){const yy=sy+44+k*20+Math.sin((x-sx)/16)*6;x===sx-250?c.moveTo(x,yy):c.lineTo(x,yy)}c.stroke()}c.restore();
  const mx=rx,mW=hw-80;let my=sy+shh+64;if(p.sub){const sL=lines(c,p.sub,mW,SE,400,38).slice(0,7);const sz=sL.length>6?34:38;const L2=lines(c,p.sub,mW,SE,400,sz).slice(0,7);L2.forEach((l,i)=>T(c,l,mx,my+i*sz*1.36,{f:SE,w:400,size:sz,color:NAVY}));my+=L2.length*sz*1.36}
  // ruled address lines fill what is left, then the signature
  for(let yy=Math.max(my+30,cy0+ch-200);yy<cy0+ch-110;yy+=56){c.fillStyle=LINE;c.fillRect(rx-mW,yy,mW,2)}
  T(c,'קבוצת קורקוס',mx,cy0+ch-50,{f:SE,w:700,size:34,color:RED});
  c.restore();foot(c,false)};

// 5 SCOREBOARD · two numbers face to face on a stadium board
L.x_w_scoreboard=(c,p,I)=>{c.fillStyle=NAVY;c.fillRect(0,0,W,H);index(c,p.label||'תוצאה',true);
  const its=items(p).filter(x=>x.v).slice(0,2);if(!its.length)its.push({v:'',l:''});const solo=its.length===1;
  const F=fit(c,p.head||'',W-2*M,{w:900,max:100,min:72,lines:3,lh:1.02,track:-.03});const b=head(c,F,W-M,150,WHITE);
  const bx=M-16,bw=W-2*M+32,by=Math.max(b+80,430),bh=Math.min(760,1120-by-(p.source?50:0));
  c.fillStyle='#04202e';rr(c,bx,by,bw,bh,28);c.fill();c.strokeStyle='rgba(143,182,200,.35)';c.lineWidth=2;rr(c,bx+12,by+12,bw-24,bh-24,20);c.stroke();
  // bulbs across the top
  for(let x=bx+44;x<bx+bw-30;x+=34){c.fillStyle='rgba(143,182,200,.28)';c.beginPath();c.arc(x,by+40,5,0,7);c.fill()}c.fillStyle=RED;c.beginPath();c.arc(W/2,by+40,7,0,7);c.fill();
  const pw=solo?bw-80:(bw-120)/2,ph=bh-240,py=by+80;const lab=its.map(it=>lines(c,it.l,pw-20,HE,300,38).slice(0,2));
  its.forEach((it,i)=>{const x=solo?bx+40:i===0?bx+bw-40-pw:bx+40;const g=c.createLinearGradient(0,py,0,py+ph);g.addColorStop(0,'#0b3447');g.addColorStop(.5,'#07293a');g.addColorStop(.5,'#06222f');g.addColorStop(1,'#07293a');c.fillStyle=g;rr(c,x,py,pw,ph,16);c.fill();
    const v=clean(it.v);if(v){const s=one(c,v,pw-60,HE,800,Math.min(300,ph*.78),90);T(c,v,x+pw/2,py+ph/2+s*.36,{w:800,size:s,color:WHITE,align:'center',track:-.03})}
    c.fillStyle='#04202e';c.fillRect(x,py+ph/2-3,pw,6);c.fillStyle='#04202e';c.fillRect(x-2,py+ph/2-14,8,28);c.fillRect(x+pw-6,py+ph/2-14,8,28);
    lab[i].forEach((l,j)=>T(c,l,x+pw/2,py+ph+70+j*48,{w:300,size:38,color:MIST1,align:'center'}))});
  // centre: thin separators and a red dot between
  if(!solo){c.fillStyle='rgba(143,182,200,.35)';c.fillRect(W/2-1,py,2,ph);c.fillStyle=RED;c.beginPath();c.arc(W/2,py+ph/2-36,9,0,7);c.arc(W/2,py+ph/2+36,9,0,7);c.fill();}
  c.fillStyle='rgba(143,182,200,.25)';c.fillRect(bx+40,py+ph+20,bw-80,2);
  if(p.sub&&!p.source)para(c,p.sub,W-M,by+bh+66,{f:HE,w:300,size:34,maxW:W-2*M,lines:1,color:MIST1});srcLine(c,p,by+bh+60,true);foot(c,true)};

// 6 PHOTOQUOTE · one line from the field, in serif, over the photo
L.x_w_photoquote=(c,p,I)=>{c.fillStyle=NAVY;c.fillRect(0,0,W,H);photo(c,p,I,0,0,W,H);c.fillStyle='rgba(7,41,58,.42)';c.fillRect(0,0,W,H);shade(c,H*.25,H,0,.9);index(c,p.label||'מהשטח',true);
  const F=fit(c,p.head||'',W-2*M-40,{f:SE,w:700,max:112,min:72,lines:4,lh:1.12,track:-.01});const bh=F.size*.8+(F.ls.length-1)*F.lh;const y0=1080-bh;
  T(c,'”',W-M+14,y0-30+260*.55,{f:SE,w:900,size:400,color:RED});
  const b=head(c,F,W-M,y0,WHITE);
  c.fillStyle=RED;c.fillRect(W-M-56,b+62,56,5);T(c,'מהשטח',W-M-76,b+76,{w:400,size:30,color:MIST1,track:.06});
  foot(c,true)};

// 7 INDEXCARD · a library catalog card, typed, punched, stamped
function typed(c,t,x,y,o){T(c,t,x+.8,y+.6,Object.assign({},o,{color:'rgba(7,41,58,.28)'}));return T(c,t,x,y,o)}
L.x_w_indexcard=(c,p,I)=>{c.fillStyle=TEAL;c.fillRect(0,0,W,H);grid(c,WHITE,.05);index(c,p.label||'קטלוג',true);
  const cx0=M,cw=W-2*M,cy0=190,ch=980,pitch=76;
  // two cards behind, as in a drawer
  [[.022,'#dfe7eb'],[-.014,'#ebf0f2']].forEach(([a,col])=>{c.save();c.translate(W/2,cy0+ch/2);c.rotate(a);shadowCard(c,-cw/2,-ch/2,cw,ch,10,col,30,10,.2);c.restore()});
  c.save();c.translate(W/2,cy0+ch/2);c.rotate(-.006);c.translate(-W/2,-(cy0+ch/2));shadowCard(c,cx0,cy0,cw,ch,10,PAPER,40,18,.3);
  const ix=cx0+cw-48,lx=cx0+48;
  // call number, top left
  const sn=code(p,5);typed(c,sn.slice(0,3)+'.'+sn.slice(3),lx,cy0+84,{w:400,size:34,color:NAVY,align:'left',ltr:true,track:.06});typed(c,'קורקוס',lx,cy0+128,{w:400,size:28,color:SLATE,align:'left'});
  // the title, typed above the red rule
  const F=fit(c,p.head||'',cw-96-210,{w:700,max:96,min:72,lines:3,lh:1.08,track:0});F.ls=F.ls.slice(0,3);F.ls.forEach((l,i)=>typed(c,l,ix,cy0+84+F.size*.1+i*F.lh,{w:700,size:F.size,color:NAVY}));
  const rr0=cy0+84+F.size*.1+(F.ls.length-1)*F.lh+44;c.fillStyle=RED;c.fillRect(cx0,rr0,cw,3);c.fillRect(cx0,rr0+8,cw,1.5);
  for(let y=rr0+pitch;y<cy0+ch-24;y+=pitch){c.fillStyle='rgba(143,182,200,.6)';c.fillRect(cx0,y,cw,2)}
  const its=items(p).slice(0,4);c.font=HE(400,34);const colW=Math.min(260,Math.max(150,...its.map(it=>c.measureText(ISO(clean(it.v))+':').width+40)));const vx=ix-colW;
  c.fillStyle='rgba(169,11,12,.4)';c.fillRect(vx+14,rr0+12,2,cy0+ch-rr0-12);
  // fields, one per rule
  its.forEach((it,i)=>{const yy=rr0+(i+1)*pitch-14;const lab=clean(it.v);if(lab)typed(c,lab+':',ix,yy,{w:400,size:34,color:SLATE});
    const mw=vx-12-lx;const s=one(c,it.l,mw,HE,700,40,34);typed(c,ell(c,it.l,mw,HE,700,s),vx-12,yy,{w:700,size:s,color:NAVY})});
  const hole=cy0+ch-62;let ey=rr0+(its.length+1)*pitch;if(p.sub){const room=Math.floor((hole-40-ey)/pitch)+1;const sL=lines(c,p.sub,vx-12-lx,HE,400,34).slice(0,Math.max(0,Math.min(2,room)));sL.forEach((l,i)=>typed(c,l,vx-12,ey+i*pitch-14,{w:400,size:34,color:SLATE}));ey+=sL.length*pitch}
  // the hole
  c.save();c.fillStyle=TEAL;c.beginPath();c.arc(W/2,hole,26,0,7);c.fill();c.strokeStyle='rgba(7,41,58,.25)';c.lineWidth=3;c.beginPath();c.arc(W/2,hole,26,0,7);c.stroke();c.restore();
  // the red stamp, in the free space at the bottom
  const st=stampLayer(420,(x,s)=>{x.strokeStyle=RED;x.fillStyle=RED;x.lineWidth=6;x.strokeRect(40,150,340,120);x.lineWidth=2;x.strokeRect(52,162,316,96);x.font=HE(900,46);x.textAlign='center';x.direction='rtl';x.fillText('קטלוג קורקוס',210,226)},(p.seed||7)+9,.6);
  const sy=Math.max(ey+10,hole-140);putStamp(c,st,ix-220,Math.min(sy,hole-90),-.1,.85);
  c.restore();foot(c,true)};
G.FX.L=G.FX.L||{};Object.assign(G.FX.L,L);
})(window);
/*FX14B:END*/
