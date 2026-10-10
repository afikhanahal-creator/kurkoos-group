/*FX13:START*/
// ---------- Kurkoos "SIGNATURE" · ten premium layouts: duotone, Swiss poster, guide contents, knockout letters, floor plan,
//            gallery frame, tape measure, triptych, manifesto, before and after. Same tokens and type floor as STUDIO.
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
// duotone: grey the photo, then navy in the shadows and mist in the highlights
function duo(c,p,I,x,y,w,h,dark,light){const ok=photo(c,p,I,x,y,w,h);if(!ok)return false;c.save();c.beginPath();c.rect(x,y,w,h);c.clip();
  c.globalCompositeOperation='saturation';c.fillStyle='#808080';c.fillRect(x,y,w,h);c.globalCompositeOperation='multiply';c.fillStyle=light||'#9fc2d2';c.fillRect(x,y,w,h);
  c.globalCompositeOperation='screen';c.fillStyle=dark||'#0a3346';c.fillRect(x,y,w,h);c.restore();return true}
function grey(c,x,y,w,h){c.save();c.beginPath();c.rect(x,y,w,h);c.clip();c.globalCompositeOperation='saturation';c.fillStyle='#808080';c.fillRect(x,y,w,h);c.globalCompositeOperation='source-over';c.fillStyle='rgba(247,248,250,.18)';c.fillRect(x,y,w,h);c.restore()}

// 1 DUOTONE · a project photo in navy and mist, one statement
L.x_s_duotone=(c,p,I)=>{c.fillStyle=NAVY;c.fillRect(0,0,W,H);duo(c,p,I,0,0,W,H);shade(c,H-720,H,0,.92);index(c,p.label,true);
  const F=fit(c,p.head,W-2*M,{w:900,max:150,min:80,lines:3,track:-.03});const y0=H-210-F.lh*F.ls.length-(p.sub?110:0);c.fillStyle=RED;c.fillRect(W-M-160,y0-40,160,12);
  const b=head(c,F,W-M,y0,WHITE);if(p.sub)para(c,p.sub,W-M,b+86,{f:HE,w:300,size:40,maxW:W-2*M,lines:2,color:MIST1});foot(c,true)};

// 2 POSTER · a Swiss grid poster: a vertical word, stacked headline, facts in columns
L.x_s_poster=(c,p,I)=>{c.fillStyle=PAPER;c.fillRect(0,0,W,H);c.fillStyle=LINE;for(let i=1;i<6;i++)c.fillRect(M+(W-2*M)*i/6,0,1,H-130);
  const word=clean(p.label||'קורקוס');c.save();c.translate(M+150,H-170);c.rotate(-Math.PI/2);c.font=HE(900,230);LS(c,'-6px');c.direction='rtl';c.textAlign='left';c.fillStyle=RED;c.fillText(word,0,0);c.restore();LS(c,'0px');
  const F=fit(c,p.head,W-2*M-260,{w:800,max:130,min:76,lines:4,lh:.98,track:-.03});let y=head(c,F,W-M,110,NAVY);
  c.fillStyle=NAVY;c.fillRect(W-M-(W-2*M-260),y+60,W-2*M-260,6);if(p.sub)y=para(c,p.sub,W-M,y+130,{f:HE,w:300,size:38,maxW:W-2*M-260,lines:3,color:SLATE});
  const its=items(p).slice(0,3);const cw=(W-2*M-260)/3;its.forEach((it,i)=>{const x=W-M-i*cw;T(c,String(i+1).padStart(2,'0'),x,H-300,{w:100,size:64,color:NAVY});para(c,it.l,x,H-230,{f:HE,w:600,size:28,maxW:cw-24,lines:2,color:NAVY,lh:1.2})});foot(c,false)};

// 3 GUIDE · a contents page with thin chapter numbers and dotted leaders
L.x_s_guide=(c,p,I)=>{c.fillStyle=NAVY;c.fillRect(0,0,W,H);grid(c,WHITE,.04);index(c,p.label||'מדריך',true);T(c,'תוכן העניינים',M,92,{w:300,size:28,color:MIST,align:'left'});
  const F=fit(c,p.head,W-2*M,{w:900,max:104,min:72,lines:2});let y=head(c,F,W-M,150,WHITE)+70;const its=items(p).slice(0,7);const rowH=Math.min(130,(H-200-y)/Math.max(1,its.length));
  its.forEach((it,i)=>{const yy=y+i*rowH+rowH*.62;T(c,String(i+1).padStart(2,'0'),W-M,yy,{w:100,size:78,color:i===0?RED:MIST});const tw=T(c,it.l,W-M-130,yy-8,{w:700,size:40,color:WHITE});
    c.save();c.fillStyle='rgba(255,255,255,.35)';for(let x=W-M-150-tw;x>M+60;x-=16)c.fillRect(x,yy-18,5,5);c.restore();T(c,'←',M,yy-8,{w:400,size:36,color:MIST,align:'left',ltr:true})});foot(c,true)};

// 4 KNOCKOUT · the photo lives inside the letters
L.x_s_knockout=(c,p,I)=>{c.fillStyle=PAPER;c.fillRect(0,0,W,H);index(c,p.label,false);const word=clean(p.head).replace(/\n/g,' ');
  let s=420;c.font=HE(900,s);while(c.measureText(word).width>W-2*M&&s>140){s-=8;c.font=HE(900,s)}const off=document.createElement('canvas');off.width=W;off.height=H;const o=off.getContext('2d');
  o.font=HE(900,s);LS(o,(-.03*s).toFixed(1)+'px');o.direction='rtl';o.textAlign='center';o.fillStyle=NAVY;const by=H/2+s*.3-60;o.fillText(word,W/2,by);LS(o,'0px');o.globalCompositeOperation='source-in';
  if(!(p.shot&&shot(o,I,p.shot,0,by-s,W,s*1.2))){o.fillStyle=TEAL;o.fillRect(0,0,W,H)}c.drawImage(off,0,0);
  c.fillStyle=RED;c.fillRect(W/2-80,by+70,160,10);if(p.sub)para(c,p.sub,W/2,by+170,{f:HE,w:300,size:42,maxW:W-2*M-60,lines:3,color:NAVY,align:'center'});foot(c,false)};

// 5 PLAN · a floor plan drawn in line, rooms labelled
L.x_s_plan=(c,p,I)=>{c.fillStyle=MIST1;c.fillRect(0,0,W,H);grid(c,MIST,.35,0,0,W,H,30);index(c,p.label||'תוכנית',false);
  const F=fit(c,p.head,W-2*M,{w:800,max:92,min:72,lines:2});let y=head(c,F,W-M,140,NAVY)+60;const its=items(p).slice(0,5);
  const px=M,pw=W-2*M,py=y,ph=H-200-y;c.save();c.strokeStyle=NAVY;c.lineWidth=10;c.strokeRect(px,py,pw,ph);c.lineWidth=5;
  const cols=its.length>3?3:its.length,rows=its.length>3?2:1;const cells=[];for(let r=0;r<rows;r++){const n=r===0?cols:its.length-cols;for(let k=0;k<n;k++)cells.push([px+pw-(k+1)*pw/n,py+r*ph/rows,pw/n,ph/rows])}
  for(let r=1;r<rows;r++){c.beginPath();c.moveTo(px,py+r*ph/rows);c.lineTo(px+pw,py+r*ph/rows);c.stroke()}
  cells.forEach(([x,yy,w,h],i)=>{if(x>px+2){c.beginPath();c.moveTo(x,yy+40);c.lineTo(x,yy+h-90);c.stroke();c.lineWidth=2;c.beginPath();c.arc(x,yy+h-90,70,Math.PI*1.5,0);c.stroke();c.lineWidth=5}});
  c.fillStyle=MIST1;c.fillRect(px+pw*.35,py-6,170,12);c.strokeStyle=NAVY;c.lineWidth=2;c.strokeRect(px+pw*.35,py-6,170,12);c.restore();
  cells.forEach(([x,yy,w,h],i)=>{const it=its[i];T(c,it.l,x+w/2,yy+h/2,{w:800,size:40,color:NAVY,align:'center'});if(it.v)T(c,it.v+(/מ"?ר/.test(it.v)?'':' מ"ר'),x+w/2,yy+h/2+50,{w:300,size:32,color:TEAL,align:'center'})});
  foot(c,false)};

// 6 GALLERY · the project photo framed like a museum piece, with a wall label
L.x_s_gallery=(c,p,I)=>{c.fillStyle='#eef1f3';c.fillRect(0,0,W,H);index(c,p.label||'מהפרויקטים',false);const fx=M+30,fy=150,fw=W-2*M-60,fh=760;
  c.save();c.shadowColor='rgba(7,41,58,.28)';c.shadowBlur=40;c.shadowOffsetY=20;c.fillStyle=NAVY;c.fillRect(fx-16,fy-16,fw+32,fh+32);c.restore();c.fillStyle=WHITE;c.fillRect(fx,fy,fw,fh);photo(c,p,I,fx+50,fy+50,fw-100,fh-100);
  const lx=W-M-520,ly=fy+fh+70;c.fillStyle=WHITE;c.fillRect(lx,ly,520,260);c.fillStyle=RED;c.beginPath();c.arc(lx+40,ly+46,10,0,7);c.fill();
  const F=fit(c,p.head,460,{w:800,max:44,min:34,lines:2,lh:1.12});let y=head(c,F,lx+490,ly+20,NAVY);items(p).slice(0,3).forEach(it=>{y+=50;T(c,it.v+': '+it.l,lx+490,y,{w:400,size:30,color:SLATE})});
  if(p.sub)para(c,p.sub,M,ly+60,{f:SE,w:400,size:34,maxW:W-2*M-560,lines:5,color:NAVY,align:'left'});foot(c,false)};

// 7 MEASURE · one dimension on a tape
L.x_s_measure=(c,p,I)=>{c.fillStyle=TEAL;c.fillRect(0,0,W,H);grid(c,WHITE,.06);index(c,p.label||'מידה אחת',true);const it=items(p)[0]||{v:'',l:''};
  const v=String(it.v);const s=Math.min(300,Math.floor((W-2*M)/Math.max(1,v.length*.55)));T(c,v,W-M,190+s*.8,{w:100,size:s,color:WHITE,track:-.04});T(c,it.l,W-M,250+s*.8,{w:700,size:40,color:MIST1});
  const ty=330+s*.8,th=150;c.save();c.translate(0,ty);c.rotate(-.04);c.fillStyle=PAPER;c.fillRect(-20,0,W+40,th);for(let i=0;i<=60;i++){const x=20+i*18;const L2=i%10===0?70:i%5===0?46:26;c.fillStyle=NAVY;c.fillRect(x,0,3,L2);if(i%10===0){c.font=HE(700,28);c.textAlign='center';c.fillText(String(i/10),x+2,L2+34)}}
  c.fillStyle=RED;c.fillRect(W*.62,-30,8,th+60);c.restore();const F=fit(c,p.head,W-2*M,{w:900,max:90,min:72,lines:3});const b=head(c,F,W-M,ty+th+90,WHITE);if(p.sub)para(c,p.sub,W-M,b+80,{f:HE,w:300,size:36,maxW:W-2*M,lines:2,color:MIST1});foot(c,true)};

// 8 TRIPTYCH · one photo in three panels, a word under each
L.x_s_triptych=(c,p,I)=>{c.fillStyle=NAVY;c.fillRect(0,0,W,H);index(c,p.label,true);const F=fit(c,p.head,W-2*M,{w:900,max:92,min:72,lines:2});let y=head(c,F,W-M,140,WHITE)+60;
  const g=18,pw=(W-2*M-2*g)/3,ph=H-190-y;const its=items(p).slice(0,3);for(let i=0;i<3;i++){const x=W-M-(i+1)*pw-i*g;c.save();c.beginPath();c.rect(x,y,pw,ph);c.clip();
    if(p.shot&&p.shot.k){const r=[i/3*.66,0,.34+i/3*.66,1];shot(c,I,{k:p.shot.k,r},x,y,pw,ph)||(c.fillStyle=TEAL,c.fillRect(x,y,pw,ph))}else{c.fillStyle=[TEAL,MIST,RED][i];c.fillRect(x,y,pw,ph)}
    shade(c,y+ph-260,y+ph,0,.85);c.restore();T(c,(its[i]||{}).l||'',x+pw/2,y+ph-50,{w:900,size:Math.min(64,pw/((its[i]||{l:'a'}).l.length*.6+1)),color:WHITE,align:'center'})}foot(c,true)};

// 9 MANIFESTO · the worldview in short lines, set big
L.x_s_manifesto=(c,p,I)=>{c.fillStyle=NAVY;c.fillRect(0,0,W,H);mark(c,M+10,H-470,6,'rgba(255,255,255,.05)');index(c,p.label||'מה אנחנו מאמינים',true);
  T(c,clean(p.head),W-M,190,{w:300,size:44,color:MIST,track:.02});c.fillStyle=RED;c.fillRect(W-M-120,220,120,8);const its=items(p).slice(0,5);let y=300;const room=(H-170-y)/Math.max(1,its.length);
  its.forEach((it,i)=>{const F=fit(c,it.l,W-2*M-70,{w:900,max:72,min:44,lines:2,lh:1.02});T(c,String(i+1).padStart(2,'0'),W-M,y+42,{w:300,size:28,color:RED});head(c,F,W-M-70,y,i%2?MIST1:WHITE);y+=room});foot(c,true)};

// 10 BEFORE / AFTER · grey and drawn on the right, alive on the left, a slider in the middle
L.x_s_beforeafter=(c,p,I)=>{c.fillStyle=NAVY;c.fillRect(0,0,W,H);const ph=900;photo(c,p,I,0,0,W,ph);c.save();c.beginPath();c.moveTo(W/2+90,0);c.lineTo(W,0);c.lineTo(W,ph);c.lineTo(W/2-90,ph);c.closePath();c.clip();grey(c,0,0,W,ph);grid(c,NAVY,.25,0,0,W,ph,45);c.restore();
  c.save();c.strokeStyle=WHITE;c.lineWidth=6;c.beginPath();c.moveTo(W/2+90,0);c.lineTo(W/2-90,ph);c.stroke();c.fillStyle=WHITE;c.beginPath();c.arc(W/2,ph/2,44,0,7);c.fill();c.restore();T(c,'⇆',W/2,ph/2+14,{w:700,size:40,color:NAVY,align:'center',ltr:true});
  const its=items(p);const a=its[0]||{v:'לפני',l:''},b=its[1]||{v:'אחרי',l:''};
  const pa=(t,x,al)=>{c.save();c.font=HE(800,30);const w=c.measureText(t).width+44;c.fillStyle=al?RED:NAVY;rr(c,al?x-w:x,70,w,56,28);c.fill();c.restore();T(c,t,al?x-22:x+w-22,108,{w:800,size:30,color:WHITE})};
  pa(a.v,W-M,true);pa(b.v,M,false);const F=fit(c,p.head,W-2*M,{w:900,max:80,min:72,lines:2});let y=head(c,F,W-M,ph+40,WHITE);
  y+=60;T(c,a.v+': '+a.l,W-M,y,{w:400,size:32,color:MIST});T(c,b.v+': '+b.l,W-M,y+48,{w:700,size:32,color:WHITE});foot(c,true)};

G.FX.L=G.FX.L||{};Object.assign(G.FX.L,L);G.FX13=L;
})(window);
/*FX13:END*/
