/*FX10:START*/
// ---------- Kurkoos "MAGAZINE 2" · four more editorial layouts: a stage line, A or B, the open question, industry news with its source ----------
(function(G){
const {A,TH,shot,M}=G.FX4H;const W=1080,H=1350;
const NAVY='#07293a',NAVY2='#0b1f2a',TEAL='#105572',MIST='#8fb6c8',MIST1='#e7eef1',PAPER='#f7f8fa',RED='#a90b0c',SLATE='#4a5866',LINE='#cbd2db',WHITE='#ffffff';
const LS=(c,v)=>{try{c.letterSpacing=v}catch(e){}};
const ISO=t=>String(t??'').replace(/(\d+(?:[.,]\d+)?)\s*[×x]\s*(\d+(?:[.,]\d+)?)/g,'⁦$1×$2⁩').replace(/(\d[\d,.]*(?:[-/:]\d[\d,.]*)*[+%]?)/g,'⁦$1⁩');
const hair=(c,x1,y1,x2,y2,col,w=1.5)=>{c.save();c.strokeStyle=col;c.lineWidth=w;c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke();c.restore()};
function T(c,t,x,y,o){t=ISO(t);c.save();c.font=A(o.w||400,o.size);LS(c,((o.track??0)*o.size).toFixed(1)+'px');c.direction=o.ltr?'ltr':'rtl';c.textAlign=o.align||'right';c.fillStyle=o.color||NAVY;c.fillText(t,x,y);const w=c.measureText(t).width;c.restore();LS(c,'0px');return w}
function wrapW(c,t,maxW){const out=[];String(t||'').split('\n').forEach(par=>{let cur='';par.split(/\s+/).filter(Boolean).forEach(w=>{const n=cur?cur+' '+w:w;if(c.measureText(n).width>maxW&&cur){out.push(cur);cur=w}else cur=n});if(cur)out.push(cur)});return out}
function para(c,t,x,y,o){const sz=o.size;c.save();c.font=A(o.w||400,sz);const ls=wrapW(c,t,o.maxW).slice(0,o.lines||3);const lh=sz*(o.lh||1.32);c.direction='rtl';c.textAlign=o.align||'right';c.fillStyle=o.color||NAVY;ls.forEach((l,i)=>c.fillText(ISO(l),x,y+i*lh));c.restore();return y+(ls.length-1)*lh}
function fitHead(c,t,maxW,o){let size=o.max||150;const min=o.min||54;let ls;for(;;){c.font=A(o.w||900,size);LS(c,((o.track??-.02)*size).toFixed(1)+'px');ls=wrapW(c,ISO(t),maxW);LS(c,'0px');if(ls.length<=(o.lines||3)||size<=min)break;size-=4}return{size,ls,lh:size*(o.lh||1.0)}}
function drawHead(c,F,x,y,col,o={}){c.save();c.font=A(o.w||900,F.size);LS(c,((o.track??-.02)*F.size).toFixed(1)+'px');c.direction='rtl';c.textAlign=o.align||'right';c.fillStyle=col;F.ls.forEach((l,i)=>c.fillText(l,x,y+F.size*.82+i*F.lh));c.restore();LS(c,'0px');return y+F.size*.82+(F.ls.length-1)*F.lh+F.size*.2}
function pill(c,t,xr,y,bg,fg,size=24){c.save();c.font=A(700,size);const tw=c.measureText(ISO(t)).width,ph=size*1.7,pw=tw+size*1.3;c.fillStyle=bg;c.beginPath();c.roundRect?c.roundRect(xr-pw,y-ph*.72,pw,ph,ph/2):c.rect(xr-pw,y-ph*.72,pw,ph);c.fill();c.fillStyle=fg;c.direction='rtl';c.textAlign='center';c.fillText(ISO(t),xr-pw/2,y);c.restore();return pw}
function items(p){return (p.items||[]).map(it=>Array.isArray(it)?{v:it[0],l:it[1]}:{v:it.v??it.big??'',l:it.l??it.label??''}).filter(x=>x.v!==''||x.l)}
function folio(c,fg,sub,line){hair(c,M,H-98,W-M,H-98,line,1);const w=T(c,'קבוצת קורקוס',W-M,H-58,{w:700,size:22,color:fg});T(c,'מקרקע ועד מסירת מפתח',W-M-w-18,H-58,{w:500,size:22,color:sub});T(c,'kurkoos-group.co.il',M,H-58,{size:21,color:sub,align:'left',ltr:true})}
function masthead(c,p,fg,sub,def){c.save();c.fillStyle=RED;c.fillRect(W-M-16,63,16,16);c.restore();T(c,p.label||def||'מגזין קורקוס',W-M-30,78,{w:700,size:24,color:fg,track:.04});T(c,p.issue||'מגזין הבנייה של קבוצת קורקוס',M,78,{w:500,size:22,color:sub,align:'left'})}
const L={};

// 1 TIMELINE · the stages down a measured line; a highlighted station when the post says where we are
L.x_mag_timeline=(c,p,I)=>{c.fillStyle=PAPER;c.fillRect(0,0,W,H);masthead(c,p,NAVY,SLATE,'שלב אחר שלב');
  const F=fitHead(c,p.head||'',W-2*M,{max:86,min:52,lines:2,w:900});const b=drawHead(c,F,W-M,130,NAVY);
  if(p.sub)para(c,p.sub,W-M,b+46,{size:30,maxW:W-2*M,color:SLATE,lines:2});
  const st=items(p).slice(0,6);const n=Math.max(1,st.length);const top=Math.max(b+150,430),bot=H-170,step=(bot-top)/Math.max(1,n-1||1);const x=W-M-38;
  hair(c,x,top,x,top+step*(n-1),NAVY,4);const cur=+(p.cur??-1);
  st.forEach((it,i)=>{const y=top+step*i;const on=i===cur;c.save();c.beginPath();c.arc(x,y,on?26:20,0,7);c.fillStyle=on?RED:(i<cur?TEAL:WHITE);c.fill();c.lineWidth=4;c.strokeStyle=on?RED:NAVY;c.stroke();c.restore();
    const vw=T(c,String(it.v||String(i+1).padStart(2,'0')),x-58,y+12,{w:800,size:30,color:on?RED:TEAL});const lx=Math.min(x-130,x-58-vw-28);T(c,it.l||'',lx,y+16,{w:on?800:700,size:on?46:40,color:NAVY});
    if(on)pill(c,'אנחנו כאן',lx,y+68,RED,WHITE,22)});
  folio(c,NAVY,SLATE,LINE)};

// 2 VERSUS · A or B, two halves and a question in the seam; the reply is one letter
L.x_mag_versus=(c,p,I)=>{const its=items(p);const a=its[0]||{v:'א',l:''},b2=its[1]||{v:'ב',l:''};
  c.fillStyle=NAVY;c.fillRect(0,0,W,H/2);c.fillStyle=PAPER;c.fillRect(0,H/2,W,H/2);
  if(p.shot){c.save();c.globalAlpha=.28;shot(c,I,p.shot,0,0,W,H/2);c.restore()}
  masthead(c,p,WHITE,'rgba(255,255,255,.8)','מה הייתם בוחרים');
  // the letters
  T(c,a.v||'א',M+20,H/2-60,{w:900,size:300,color:'rgba(255,255,255,.14)',align:'left'});T(c,b2.v||'ב',M+20,H-150,{w:900,size:300,color:'rgba(7,41,58,.08)',align:'left'});
  const fa=fitHead(c,a.l||'',W-2*M-80,{max:72,min:44,lines:2,w:800});drawHead(c,fa,W-M,H/2-90-fa.lh*fa.ls.length,WHITE,{w:800});
  const fb=fitHead(c,b2.l||'',W-2*M-80,{max:72,min:44,lines:2,w:800});drawHead(c,fb,W-M,H/2+120,NAVY,{w:800});
  // the seam: the question
  const q=p.head||'';c.save();c.font=A(800,50);const qw=Math.min(W-2*M,c.measureText(ISO(q)).width+96);c.restore();
  c.save();c.fillStyle=RED;c.beginPath();c.roundRect?c.roundRect(W/2-qw/2,H/2-56,qw,112,56):c.rect(W/2-qw/2,H/2-56,qw,112);c.fill();c.restore();
  const F=fitHead(c,q,qw-70,{max:50,min:30,lines:1,w:800});c.save();c.font=A(800,F.size);c.fillStyle=WHITE;c.direction='rtl';c.textAlign='center';c.fillText(F.ls[0]||'',W/2,H/2+F.size*.35);c.restore();
  if(p.cta)pill(c,p.cta,W-M,H-150,TEAL,WHITE,26);folio(c,NAVY,SLATE,LINE)};

// 3 QUESTION · one open question, very large, a quiet "?" behind it and the reply prompt
L.x_mag_question=(c,p,I)=>{c.fillStyle=TEAL;c.fillRect(0,0,W,H);
  c.save();c.font=A(900,1100);c.fillStyle='rgba(255,255,255,.07)';c.textAlign='left';c.direction='ltr';c.fillText('?',-40,H-80);c.restore();
  masthead(c,p,WHITE,'rgba(255,255,255,.82)','שאלה פתוחה');
  const F=fitHead(c,p.head||'',W-2*M,{max:120,min:60,lines:4,w:900});const top=Math.max(260,(H-F.lh*F.ls.length)/2-120);const b=drawHead(c,F,W-M,top,WHITE);
  if(p.sub)para(c,p.sub,W-M,b+60,{size:34,maxW:W-2*M,color:'rgba(255,255,255,.9)',lines:3});
  pill(c,p.cta||'ענו בתגובות',W-M,H-170,RED,WHITE,30);
  hair(c,M,H-98,W-M,H-98,'rgba(255,255,255,.3)',1);T(c,'קבוצת קורקוס',W-M,H-58,{w:700,size:22,color:WHITE});T(c,'kurkoos-group.co.il',M,H-58,{size:21,color:'rgba(255,255,255,.8)',align:'left',ltr:true})};

// 4 NEWS · the industry page: department, a big figure or the headline, what it means, and the source line
L.x_mag_news=(c,p,I)=>{c.fillStyle=WHITE;c.fillRect(0,0,W,H);
  c.fillStyle=NAVY;c.fillRect(0,0,W,120);T(c,'מהענף',W-M,82,{w:900,size:44,color:WHITE});T(c,p.issue||'חדשות הבנייה והנדל"ן, בשפה פשוטה',M,78,{w:500,size:22,color:MIST,align:'left'});
  c.fillStyle=RED;c.fillRect(W-M-120,120,120,10);
  const its=items(p);const big=its.find(x=>/\d/.test(String(x.v)));let y=200;
  if(big){const s=Math.min(240,Math.floor((W-2*M)/Math.max(1,String(big.v).length*.6)));T(c,String(big.v),W-M,y+s*.85,{w:900,size:s,color:NAVY,track:-.04,ltr:/^[\d.,%₪+\sKMk]+$/.test(String(big.v))});T(c,big.l||'',W-M,y+s*.85+56,{w:700,size:32,color:RED});y+=s+110}
  const F=fitHead(c,p.head||'',W-2*M,{max:big?68:96,min:48,lines:3,w:800});const b=drawHead(c,F,W-M,y,NAVY,{w:800});
  if(p.sub)para(c,p.sub,W-M,b+50,{size:32,maxW:W-2*M,color:SLATE,lines:3});
  const rest=its.filter(x=>x!==big).slice(0,3);let ry=Math.max(b+190,H-200-rest.length*70);rest.forEach(it=>{hair(c,M,ry-40,W-M,ry-40,LINE,1.5);T(c,String(it.v),W-M,ry+6,{w:800,size:34,color:TEAL});T(c,it.l||'',W-M-190,ry+6,{w:600,size:32,color:NAVY});ry+=70});
  if(p.source){c.font=A(500,26);let t='מקור: '+p.source;while(c.measureText(t).width>W-2*M&&t.length>12)t=t.slice(0,-2);if(t!=='מקור: '+p.source)t=t.trim()+'…';T(c,t,W-M,H-130,{w:500,size:26,color:SLATE})}
  hair(c,M,H-98,W-M,H-98,LINE,1);T(c,'קבוצת קורקוס',W-M,H-58,{w:700,size:22,color:NAVY});T(c,'kurkoos-group.co.il',M,H-58,{size:21,color:SLATE,align:'left',ltr:true})};

G.FX.L=G.FX.L||{};Object.assign(G.FX.L,L);G.FX10=L;
})(window);
/*FX10:END*/
