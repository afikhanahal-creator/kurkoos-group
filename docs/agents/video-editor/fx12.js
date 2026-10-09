/*FX12:START*/
// ---------- Kurkoos "STUDIO" · seventeen typographic, editorial and data families. Weight contrast is the voice:
//            Heebo from 100 to 900 for display, Frank Ruhl Libre for the editorial serif, Almoni for running text.
// Rules: one display face per post, at most three weights, nothing under 26px on 1080, the red index square and the
// towers mark carry the brand, the phone and the link live in the caption on their own lines.
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

// 1 EDITORIAL · a magazine opener: serif headline, lead paragraph, a photo strip
L.x_c_editorial=(c,p,I)=>{c.fillStyle=PAPER;c.fillRect(0,0,W,H);index(c,p.label||'מגזין קורקוס',false);T(c,'גיליון בנייה',M,92,{w:300,size:28,color:SLATE,align:'left'});c.fillStyle=NAVY;c.fillRect(M,124,W-2*M,3);
  const F=fit(c,p.head,W-2*M,{f:SE,w:900,max:112,min:76,lines:3,lh:1.08});let y=head(c,F,W-M,170,NAVY);y+=60;c.fillStyle=RED;c.fillRect(W-M-120,y-6,120,8);
  if(p.sub)y=para(c,p.sub,W-M,y+66,{f:SE,w:400,size:40,maxW:W-2*M,lines:4,color:SLATE,lh:1.42});
  const py=Math.max(y+70,H-460);photo(c,p,I,0,py,W,H-140-py);foot(c,false)};

// 2 CONTRAST · two lines, two weights: the thin one asks, the black one answers
L.x_c_contrast=(c,p,I)=>{const ls=clean(p.head).split('\n');const a=ls[0]||'',b=ls.slice(1).join(' ')||'';
  c.fillStyle=PAPER;c.fillRect(0,0,W,H/2);c.fillStyle=NAVY;c.fillRect(0,H/2,W,H/2);index(c,p.label,false);
  const Fa=fit(c,a,W-2*M,{w:100,max:170,min:80,lines:2,track:-.03});head(c,Fa,W-M,H/2-60-Fa.lh*Fa.ls.length,NAVY);
  c.fillStyle=RED;c.fillRect(W-M-200,H/2-12,200,24);
  const Fb=fit(c,b,W-2*M,{w:900,max:170,min:80,lines:2,track:-.03});let y=head(c,Fb,W-M,H/2+60,WHITE);
  const its=items(p).slice(0,4);y+=70;its.forEach(it=>{T(c,it.l,W-M,y,{w:400,size:34,color:MIST});y+=52});foot(c,true)};

// 3 TERM · a dictionary page for one professional term
L.x_c_term=(c,p,I)=>{c.fillStyle=MIST1;c.fillRect(0,0,W,H);index(c,'מילון קורקוס',false);T(c,p.label||'מונח',M,92,{w:300,size:28,color:SLATE,align:'left'});
  const F=fit(c,p.head,W-2*M,{w:900,max:190,min:90,lines:2,track:-.03});let y=head(c,F,W-M,230,NAVY);
  y+=50;c.fillStyle=NAVY;c.fillRect(M,y,W-2*M,2);T(c,'שם עצם · ענף הבנייה והנדל"ן',W-M,y+52,{w:300,size:28,color:SLATE});
  if(p.sub)y=para(c,p.sub,W-M,y+140,{f:SE,w:500,size:46,maxW:W-2*M,lines:4,color:NAVY,lh:1.4});
  const its=items(p).slice(0,2);if(its.length){y+=90;T(c,'לדוגמה',W-M,y,{w:700,size:30,color:RED});y+=56;its.forEach(it=>{y=para(c,'· '+it.l,W-M,y,{w:400,size:36,maxW:W-2*M,lines:2,color:SLATE})+54})}foot(c,false)};

// 4 BARS · sourced numbers as horizontal bars
L.x_c_bars=(c,p,I)=>{c.fillStyle=PAPER;c.fillRect(0,0,W,H);index(c,p.label||'במספרים',false);
  const F=fit(c,p.head,W-2*M,{w:800,max:92,min:72,lines:2});let y=head(c,F,W-M,140,NAVY);if(p.sub)y=para(c,p.sub,W-M,y+56,{w:400,size:34,maxW:W-2*M,color:SLATE,lines:2});
  const its=items(p).slice(0,6);const vals=its.map(x=>num(x.v));const mx=Math.max(...vals.filter(v=>!isNaN(v)),1);const top=y+90,rowH=Math.min(150,(H-200-top)/Math.max(1,its.length));
  its.forEach((it,i)=>{const yy=top+i*rowH;const v=vals[i];const bw=isNaN(v)?0:Math.max(30,(W-2*M-240)*Math.abs(v)/mx);
    T(c,it.l,W-M,yy+30,{w:500,size:34,color:SLATE});c.fillStyle=i===0?RED:(i%2?TEAL:NAVY);c.fillRect(W-M-bw,yy+48,bw,rowH*.36);
    T(c,it.v,W-M-bw-20,yy+48+rowH*.32,{w:900,size:46,color:NAVY,align:'right'})});
  srcLine(c,p,H-130,false);foot(c,false)};

// 5 BLUEPRINT · a section drawing with dimension lines and callouts
L.x_c_blueprint=(c,p,I)=>{c.fillStyle=TEAL;c.fillRect(0,0,W,H);grid(c,WHITE,.08,0,0,W,H,30);grid(c,WHITE,.16,0,0,W,H,150);index(c,p.label||'פרט ביצוע',true);
  const F=fit(c,p.head,W-2*M,{w:200,max:104,min:76,lines:2,track:-.02});let y=head(c,F,W-M,140,WHITE);
  const bx=M+10,by=y+90,bw=440,bh=520;c.save();c.strokeStyle=WHITE;c.lineWidth=4;c.strokeRect(bx,by,bw,bh);c.lineWidth=2;c.setLineDash([14,10]);c.strokeRect(bx+60,by+60,bw-120,bh-200);c.setLineDash([]);
  c.beginPath();c.moveTo(bx,by+bh-100);c.lineTo(bx+bw,by+bh-100);c.stroke();for(let x=bx+20;x<bx+bw;x+=40){c.beginPath();c.moveTo(x,by+bh-100);c.lineTo(x-20,by+bh-80);c.stroke()}
  c.beginPath();c.moveTo(bx,by-30);c.lineTo(bx+bw,by-30);c.moveTo(bx,by-44);c.lineTo(bx,by-16);c.moveTo(bx+bw,by-44);c.lineTo(bx+bw,by-16);c.stroke();c.restore();
  const its=items(p).slice(0,4);const pts=[[bx+bw-60,by+90],[bx+bw-120,by+bh-100],[bx+60,by+bh-40],[bx+bw/2,by+60]];
  its.forEach((it,i)=>{const [px,py]=pts[i];const ly=by+40+i*140;c.save();c.strokeStyle=MIST;c.lineWidth=2;c.beginPath();c.moveTo(px,py);c.lineTo(W-M-340,ly);c.lineTo(W-M,ly);c.stroke();c.fillStyle=RED;c.beginPath();c.arc(px,py,10,0,7);c.fill();c.restore();
    T(c,it.v,W-M,ly-14,{w:900,size:42,color:WHITE});para(c,it.l,W-M,ly+40,{w:400,size:30,maxW:340,lines:2,color:MIST1,f:HE,lh:1.2})});
  if(p.sub)para(c,p.sub,W-M,by+bh+90,{w:300,size:34,maxW:W-2*M,color:WHITE,lines:2});foot(c,true)};

// 6 SCENARIO · a case from the field in three acts
L.x_c_scenario=(c,p,I)=>{c.fillStyle=NAVY;c.fillRect(0,0,W,H);index(c,p.label||'תרחיש מהשטח',true);
  const F=fit(c,p.head,W-2*M,{w:800,max:88,min:72,lines:2});let y=head(c,F,W-M,140,WHITE)+60;
  const its=items(p).slice(0,3);const cols=[MIST,RED,WHITE];const room=(H-190-y)/Math.max(1,its.length);
  its.forEach((it,i)=>{const h=room-24;c.fillStyle='rgba(255,255,255,.06)';rr(c,M,y,W-2*M,h,18);c.fill();c.fillStyle=cols[i];c.fillRect(W-M-10,y,10,h);
    T(c,it.v,W-M-40,y+56,{w:800,size:32,color:MIST});para(c,it.l,W-M-40,y+118,{w:500,size:42,maxW:W-2*M-80,color:WHITE,lines:4,f:HE});y+=room});foot(c,true)};

// 7 DILEMMA · for and against, side by side
L.x_c_dilemma=(c,p,I)=>{c.fillStyle=PAPER;c.fillRect(0,0,W,H);index(c,p.label||'דילמה',false);
  const F=fit(c,p.head,W-2*M,{w:900,max:96,min:72,lines:3});let y=head(c,F,W-M,140,NAVY)+70;
  const its=items(p);const pro=its.filter(x=>/^\+|בעד/.test(x.v)),con=its.filter(x=>!/^\+|בעד/.test(x.v));const cw=(W-2*M-30)/2;
  [[pro,'בעד',TEAL,W-M],[con,'נגד',RED,W-M-cw-30]].forEach(([list,t,col,xr])=>{c.fillStyle=col;c.fillRect(xr-cw,y,cw,80);T(c,t,xr-30,y+56,{w:900,size:40,color:WHITE});let yy=y+140;
    list.slice(0,3).forEach(it=>{T(c,t==='בעד'?'+':'−',xr-24,yy,{w:900,size:44,color:col});yy=para(c,it.l,xr-70,yy,{w:600,size:40,maxW:cw-90,lines:3,color:NAVY,f:HE})+110})});
  if(p.cta)T(c,p.cta,W/2,H-150,{w:800,size:34,color:RED,align:'center'});foot(c,false)};

// 8 COMPARE · a two column table
L.x_c_compare=(c,p,I)=>{c.fillStyle=WHITE;c.fillRect(0,0,W,H);index(c,p.label||'השוואה',false);
  const F=fit(c,p.head,W-2*M,{w:900,max:90,min:72,lines:2});let y=head(c,F,W-M,140,NAVY)+60;const [A,B]=clean(p.sub||'א | ב').split('|').map(s=>s.trim());
  const c1=300,cw=(W-2*M-c1)/2;c.fillStyle=NAVY;c.fillRect(M,y,W-2*M-c1,90);T(c,A||'',M+cw*2-24,y+60,{w:800,size:36,color:WHITE});T(c,B||'',M+cw-24,y+60,{w:800,size:36,color:WHITE});
  c.fillStyle=MIST;c.fillRect(M+cw-2,y,4,90);y+=90;const its=items(p).slice(0,5);const rowH=Math.min(210,(H-200-y)/Math.max(1,its.length));
  its.forEach((it,i)=>{if(i%2===0){c.fillStyle=MIST1;c.fillRect(M,y,W-2*M,rowH)}const [a,b]=it.l.split('|').map(s=>s.trim());T(c,it.v,W-M-10,y+rowH/2+14,{w:800,size:34,color:NAVY});
    para(c,a||'',M+cw*2-24,y+rowH/2+4,{w:500,size:36,maxW:cw-40,lines:2,color:NAVY,f:HE});para(c,b||'',M+cw-24,y+rowH/2+4,{w:500,size:36,maxW:cw-40,lines:2,color:NAVY,f:HE});y+=rowH});
  foot(c,false)};

// 9 STEPS · thin numerals, a path across the page
L.x_c_steps=(c,p,I)=>{c.fillStyle=NAVY;c.fillRect(0,0,W,H);grid(c,WHITE,.05);index(c,p.label||'התהליך',true);
  const F=fit(c,p.head,W-2*M,{w:900,max:96,min:72,lines:2});let y=head(c,F,W-M,140,WHITE)+90;
  const its=items(p).slice(0,6);const per=its.length>4?3:2;const cw=(W-2*M)/per,rh=(H-190-y)/Math.ceil(its.length/per);
  its.forEach((it,i)=>{const col=i%per,row=Math.floor(i/per);const x=W-M-col*cw,yy=y+row*rh;T(c,String(i+1).padStart(2,'0'),x,yy+130,{w:100,size:150,color:i===0?RED:MIST,track:-.04});
    para(c,it.l,x,yy+200,{f:HE,w:700,size:40,maxW:cw-40,lines:2,color:WHITE});if(i<its.length-1&&col<per-1){c.save();c.strokeStyle=MIST;c.lineWidth=3;c.beginPath();c.moveTo(x-cw+30,yy+80);c.lineTo(x-cw+80,yy+80);c.lineTo(x-cw+64,yy+68);c.moveTo(x-cw+30,yy+80);c.stroke();c.restore()}});
  foot(c,true)};

// 10 INSIGHT · one sentence set in the serif, between two rules
L.x_c_insight=(c,p,I)=>{c.fillStyle=PAPER;c.fillRect(0,0,W,H);index(c,p.label||'תובנה מהשטח',false);
  const F=fit(c,p.head,W-2*M-40,{f:SE,w:700,max:104,min:72,lines:5,lh:1.18,track:-.01});const bh=F.lh*F.ls.length;const top=Math.max(250,(H-bh)/2-120);
  c.fillStyle=RED;c.fillRect(W/2-60,top-60,120,8);head(c,F,W/2,top,NAVY,{align:'center'});const b=top+bh;c.fillStyle=NAVY;c.fillRect(W/2-60,b+40,120,3);
  if(p.sub)para(c,p.sub,W/2,b+130,{w:300,size:38,maxW:W-2*M-80,lines:3,color:SLATE,align:'center',f:HE});foot(c,false)};

// 11 MATERIAL · the material as texture, its properties on a spec card
L.x_c_material=(c,p,I)=>{c.fillStyle='#5d666d';c.fillRect(0,0,W,H);const r=rnd((p.seed||3)*97);for(let i=0;i<9000;i++){const g=90+r()*90|0;c.fillStyle=`rgba(${g},${g+4},${g+8},${.25+r()*.4})`;c.fillRect(r()*W,r()*H,1+r()*3,1+r()*3)}
  for(let i=0;i<40;i++){c.fillStyle=`rgba(20,25,30,${.2+r()*.3})`;c.beginPath();c.arc(r()*W,r()*H,2+r()*6,0,7);c.fill()}
  shade(c,0,H,.35,.75);index(c,p.label||'חומר',true);const F=fit(c,p.head,W-2*M,{w:900,max:170,min:90,lines:2,track:-.03});let y=head(c,F,W-M,150,WHITE)+30;
  if(p.sub)y=para(c,p.sub,W-M,y+60,{w:300,size:38,maxW:W-2*M,lines:2,color:WHITE,f:HE});
  const its=items(p).slice(0,4);const ch=110+its.length*96,cy=H-160-ch;c.fillStyle=PAPER;rr(c,M,cy,W-2*M,ch,22);c.fill();T(c,'כרטיס חומר',W-M-40,cy+64,{w:800,size:30,color:RED});
  its.forEach((it,i)=>{const yy=cy+130+i*96;c.fillStyle=LINE;c.fillRect(M+40,yy-50,W-2*M-80,2);T(c,it.v,W-M-40,yy+6,{w:800,size:34,color:NAVY});T(c,it.l,W-M-300,yy+6,{w:400,size:34,color:SLATE})});foot(c,true)};

// 12 COVER · a magazine cover with cover lines
L.x_c_cover=(c,p,I)=>{c.fillStyle=NAVY;c.fillRect(0,0,W,H);photo(c,p,I,0,0,W,H);shade(c,0,420,.75,0);shade(c,H-700,H,0,.9);
  T(c,'קורקוס',W/2,230,{w:100,size:260,color:WHITE,align:'center',track:-.02});T(c,(p.label||'גיליון הבנייה')+' · מגזין',W/2,290,{w:300,size:30,color:'rgba(255,255,255,.85)',align:'center',track:.04});
  const F=fit(c,p.head,W-2*M,{w:900,max:110,min:76,lines:2});let y=head(c,F,W-M,H-620,WHITE)+40;
  items(p).slice(0,4).forEach(it=>{c.fillStyle=RED;c.fillRect(W-M-14,y+8,14,14);T(c,it.l,W-M-34,y+26,{w:700,size:36,color:WHITE});y+=58});foot(c,true)};

// 13 MISTAKE · the mistake in red, the fix on paper
L.x_c_mistake=(c,p,I)=>{const its=items(p);const a=its[0]||{l:''},b=its[1]||{l:''};c.fillStyle=RED;c.fillRect(0,0,W,H*.5);c.fillStyle=PAPER;c.fillRect(0,H*.5,W,H*.5);
  index(c,p.label||'טעות נפוצה',true);const F=fit(c,p.head,W-2*M,{w:900,max:86,min:72,lines:2});let y=head(c,F,W-M,130,WHITE)+50;
  T(c,'✕ הטעות',W-M,y+20,{w:800,size:34,color:'rgba(255,255,255,.85)'});const ya=para(c,a.l,W-M,y+96,{w:600,size:46,maxW:W-2*M,lines:3,color:WHITE,f:HE});
  c.save();c.strokeStyle='rgba(255,255,255,.75)';c.lineWidth=4;c.beginPath();c.moveTo(M,ya-14);c.lineTo(W-M,ya-14);c.stroke();c.restore();
  let y2=H*.5+90;T(c,'✓ התיקון',W-M,y2,{w:800,size:34,color:TEAL});para(c,b.l,W-M,y2+90,{w:700,size:54,maxW:W-2*M,lines:4,color:NAVY,f:HE});foot(c,false)};

// 14 STAT · one thin, enormous number over a photo
L.x_c_stat=(c,p,I)=>{c.fillStyle=NAVY;c.fillRect(0,0,W,H);photo(c,p,I,0,0,W,H);c.fillStyle='rgba(7,41,58,.62)';c.fillRect(0,0,W,H);index(c,p.label||'מספר אחד',true);
  const it=items(p)[0]||{v:'',l:''};const v=String(it.v);let s=Math.min(380,Math.floor((W-2*M)/Math.max(1,v.length*.55)));T(c,v,W-M,520,{w:100,size:s,color:WHITE,track:-.05,ltr:/^[\d.,%₪+\sKMk]+$/.test(v)});
  T(c,it.l,W-M,600,{w:800,size:40,color:MIST});c.fillStyle=RED;c.fillRect(W-M-160,650,160,10);const F=fit(c,p.head,W-2*M,{w:900,max:88,min:72,lines:3});let y=head(c,F,W-M,720,WHITE);
  if(p.sub)para(c,p.sub,W-M,y+80,{w:300,size:36,maxW:W-2*M,lines:2,color:WHITE,f:HE});srcLine(c,p,H-140,true);foot(c,true)};

// 15 QUESTIONS · the questions to ask, each behind a red question mark
L.x_c_questions=(c,p,I)=>{c.fillStyle=MIST1;c.fillRect(0,0,W,H);index(c,p.label||'לשאול לפני',false);
  const F=fit(c,p.head,W-2*M,{w:900,max:100,min:72,lines:2});let y=head(c,F,W-M,140,NAVY)+50;const its=items(p).slice(0,5);const rowH=Math.min(180,(H-200-y)/Math.max(1,its.length));
  its.forEach(it=>{T(c,'?',W-M,y+rowH*.62,{w:900,size:110,color:RED,ltr:true});para(c,it.l,W-M-90,y+rowH*.5,{w:600,size:42,maxW:W-2*M-100,lines:2,color:NAVY,f:HE});c.fillStyle=LINE;c.fillRect(M,y+rowH-4,W-2*M,2);y+=rowH});foot(c,false)};

// 16 THOUGHT · a professional text post, the way a network feed shows it
L.x_c_thought=(c,p,I)=>{c.fillStyle=MIST1;c.fillRect(0,0,W,H);c.save();c.shadowColor='rgba(7,41,58,.14)';c.shadowBlur=30;c.shadowOffsetY=10;c.fillStyle=WHITE;c.font=HE(400,44);const sl=Math.min(8,wrapW(c,p.sub||'',W-2*M-40).length);const chh=Math.min(H-300,560+sl*64);rr(c,M-20,110,W-2*M+40,chh,26);c.fill();c.restore();
  c.fillStyle=NAVY;c.beginPath();c.arc(W-M-50,190,48,0,7);c.fill();mark(c,W-M-66,162,.9,WHITE);T(c,'קבוצת קורקוס',W-M-120,180,{w:800,size:34});T(c,'יזמות · בנייה · ניהול ופיקוח',W-M-120,222,{w:300,size:28,color:SLATE});
  const F=fit(c,p.head,W-2*M-40,{w:800,max:84,min:72,lines:3});let y=head(c,F,W-M-20,290,NAVY);if(p.sub)y=para(c,p.sub,W-M-20,y+90,{w:400,size:44,maxW:W-2*M-40,lines:8,color:SLATE,f:HE,lh:1.45});
  const by=110+chh-70;c.fillStyle=LINE;c.fillRect(M,by-40,W-2*M,2);T(c,p.cta||'מסכימים? כתבו בתגובות',W-M-20,by+10,{w:700,size:32,color:TEAL});foot(c,false)};

// 17 GRID 4 · four tips, four tiles
L.x_c_grid4=(c,p,I)=>{c.fillStyle=PAPER;c.fillRect(0,0,W,H);index(c,p.label,false);const F=fit(c,p.head,W-2*M,{w:900,max:92,min:72,lines:2});let y=head(c,F,W-M,140,NAVY)+60;
  const its=items(p).slice(0,4);const g=20,tw=(W-2*M-g)/2,th=(H-190-y-g)/2;const bg=[NAVY,TEAL,MIST,RED],fg=[WHITE,WHITE,NAVY,WHITE];
  its.forEach((it,i)=>{const x=W-M-(i%2)*(tw+g)-tw,yy=y+Math.floor(i/2)*(th+g);c.fillStyle=bg[i];rr(c,x,yy,tw,th,20);c.fill();T(c,String(i+1).padStart(2,'0'),x+tw-30,yy+120,{w:100,size:110,color:fg[i]});
    para(c,it.l,x+tw-30,yy+th-110,{w:700,size:40,maxW:tw-60,lines:2,color:fg[i],f:HE})});foot(c,false)};

G.FX.L=G.FX.L||{};Object.assign(G.FX.L,L);G.FX12=L;
})(window);
/*FX12:END*/
