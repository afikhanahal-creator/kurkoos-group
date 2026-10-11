/*FX15a:START*/
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
const L={};// Kurkoos FX15 set A · work and productivity formats: board, gantt, doc, result, metrics, issue, invite, route, plans, card, keynote, reveal
// ---- local tools
const TZ=(w,s)=>`${w} ${s}px "Almoni Tzar", Almoni, Heebo, Arial, sans-serif`;
const fit1=(c,t,maxW,f,w,max,min,track=0)=>{t=ISO(clean(t));let s=max;for(;s>min;s-=2){c.font=f(w,s);LS(c,(track*s).toFixed(1)+'px');if(c.measureText(t).width<=maxW)break}LS(c,'0px');return s};
const fill=(c,col)=>{c.fillStyle=col;c.fillRect(0,0,W,H)};
function shadow(c,blur,a,dy){c.shadowColor=`rgba(7,41,58,${a})`;c.shadowBlur=blur;c.shadowOffsetY=dy||0}
function block(c,ls,x,y,lh,font,col,align){c.save();c.font=font;c.direction='rtl';c.textAlign=align||'right';c.fillStyle=col;ls.forEach((l,i)=>c.fillText(ISO(l),x,y+i*lh));c.restore();return y+(ls.length-1)*lh}
// wrap to at most max lines, ellipsis on the last kept line when text was cut
function wl(c,t,maxW,font,max){c.font=font;const ls=wrapW(c,t,maxW);if(ls.length<=max)return ls;const out=ls.slice(0,max);let last=out[max-1]+'…';while(c.measureText(last).width>maxW&&last.length>2)last=last.slice(0,-2)+'…';out[max-1]=last;return out}
// one line, shrink then ellipsis
function one(c,t,maxW,w,max,min){t=clean(t);const s=fit1(c,t,maxW,AL,w,max,min);c.font=AL(w,s);let u=t;if(c.measureText(ISO(u)).width>maxW){while(u.length>2&&c.measureText(ISO(u+'…')).width>maxW)u=u.slice(0,-1);u=u.trim()+'…'}return{t:u,s}}
// pill anchored at its right edge xr (or left edge when o.left), vertical centre yc. returns width
function pill(c,t,xr,yc,o={}){const s=o.size||28,w=o.w||700,pad=o.pad||22,h=o.h||s+26;c.font=AL(w,s);const tw=c.measureText(ISO(clean(t))).width;const dot=o.dot?22:0;const pw=tw+pad*2+dot;const x=o.left?xr:xr-pw;
  c.fillStyle=o.bg||MIST1;rr(c,x,yc-h/2,pw,h,h/2);c.fill();if(o.stroke){c.strokeStyle=o.stroke;c.lineWidth=2;c.stroke()}
  if(dot){c.fillStyle=o.dot;c.beginPath();c.arc(x+pw-pad-6,yc,7,0,7);c.fill()}
  T(c,t,x+pw-pad-dot,yc+s*.35,{f:AL,w,size:s,color:o.fg||NAVY});return pw}
function tick(c,cx,cy,s,col,lw){c.save();c.strokeStyle=col;c.lineWidth=lw||Math.max(3,s*.14);c.lineCap='round';c.lineJoin='round';c.beginPath();c.moveTo(cx-s*.32,cy+s*.02);c.lineTo(cx-s*.08,cy+s*.26);c.lineTo(cx+s*.34,cy-s*.24);c.stroke();c.restore()}
function chev(c,cx,cy,s,col,dir){c.save();c.strokeStyle=col;c.lineWidth=4;c.lineCap='round';c.lineJoin='round';c.beginPath();
  if(dir==='down'){c.moveTo(cx-s,cy-s/2);c.lineTo(cx,cy+s/2);c.lineTo(cx+s,cy-s/2)}else if(dir==='left'){c.moveTo(cx+s/2,cy-s);c.lineTo(cx-s/2,cy);c.lineTo(cx+s/2,cy+s)}else{c.moveTo(cx-s/2,cy-s);c.lineTo(cx+s/2,cy);c.lineTo(cx-s/2,cy+s)}c.stroke();c.restore()}
function tri(c,cx,cy,s,col,dir){c.fillStyle=col;c.beginPath();if(dir==='down'){c.moveTo(cx-s,cy-s*.6);c.lineTo(cx+s,cy-s*.6);c.lineTo(cx,cy+s*.7)}else{c.moveTo(cx+s*.6,cy-s);c.lineTo(cx+s*.6,cy+s);c.lineTo(cx-s*.7,cy)}c.closePath();c.fill()}
const DONE=/^(✓|✔|v|V|כן|בוצע|הושלם|הושלמה|הושלמו|גמור|סגור|נסגר|הסתיים|נמסר|done)$/;
const isDone=v=>DONE.test(clean(v).trim())||/^(הושלמ|בוצע|הסתיימ)/.test(clean(v).trim());
function stOf(v){const t=clean(v).trim();if(!t)return -1;if(isDone(t))return 2;if(/^(בביצוע|בעבודה|בתהליך|מתבצע|עכשיו|בטיפול|פעיל)/.test(t))return 1;if(/^(מתוכנן|מתוכננת|בתכנון|הבא|ממתין|ממתינה|בקרוב|לביצוע|טרם)/.test(t))return 0;return -1}
function head0(c,p,X,y,maxW,col,o={}){const F=fit(c,p.head,maxW,Object.assign({f:AL,w:700,max:100,min:72,lines:2,lh:1.04,track:-.02},o));return {F,y:head(c,F,X,y,col,{align:o.align})}}

// 1 BOARD · a work-management board: three status lanes, coloured status pills, cards that sit where their status says
const ST=[{t:'מתוכנן',bg:MIST,fg:NAVY},{t:'בביצוע',bg:RED,fg:WHITE},{t:'הושלם',bg:TEAL,fg:WHITE}];
L.x_n_board=(c,p,I)=>{fill(c,PAPER);const X=W-M,CW=W-2*M;const it=items(p).slice(0,6),n=it.length;
  if(p.label)index(c,p.label,false);
  let {y}=head0(c,p,X,p.label?136:96,CW,NAVY,{w:900,max:n?104:150,lines:n?2:3});
  if(p.sub)y=para(c,p.sub,X,y+58,{f:AL,w:400,size:34,maxW:CW,lines:2,color:SLATE});
  const g=16,lw=(CW-2*g)/3,top=y+(n?56:80),bot=1086;
  if(!n){let px=X;ST.forEach(s=>{px-=pill(c,s.t,px,top+30,{bg:s.bg,fg:s.fg,size:34,h:68})+16});foot(c,false);return}
  const cards=it.map(s=>{let k=stOf(s.v);const tag=k<0?clean(s.v).trim():'';if(k<0)k=0;return{s,k,tag}});
  const cw=lw-20,tw=cw-44;let fs=34,lh=44;
  const meas=(sz,maxL)=>{fs=sz;lh=Math.round(sz*1.28);cards.forEach(q=>{q.ls=q.s.l?wl(c,q.s.l,tw,AL(400,sz),maxL):[];q.tl=q.tag?wl(c,q.tag,tw-(q.k===2?44:0),AL(700,34),1):[];if(!q.ls.length&&q.tl.length){q.ls=wl(c,q.tag,tw,AL(400,sz),maxL);q.tl=[]}q.h=30+q.ls.length*lh+(q.tl.length?50:0)+18+(q.k===2&&!q.tl.length?40:0)})};
  const colH=()=>[0,1,2].map(k=>cards.filter(q=>q.k===k).reduce((a,q)=>a+q.h+14,0));
  let gap=14;outer:for(const sz of [44,40,34])for(const ml of [3,2,1]){if(sz>34&&ml<2)continue;meas(sz,ml);if(Math.max(...colH())<=bot-top-96)break outer}
  [0,1,2].forEach(k=>{const lx=X-(k+1)*lw-k*g;c.fillStyle='rgba(143,182,200,.2)';rr(c,lx,top,lw,bot-top,22);c.fill();
    const cnt=cards.filter(q=>q.k===k).length;pill(c,ST[k].t,lx+lw-14,top+44,{bg:ST[k].bg,fg:ST[k].fg,size:30,h:56,pad:20});
    T(c,String(cnt),lx+22,top+55,{f:AL,w:700,size:30,color:SLATE,align:'left',ltr:true});
    let cy=top+92;cards.filter(q=>q.k===k).forEach(q=>{const cx=lx+10;if(cy+q.h>bot-6)return;
      c.save();shadow(c,14,.10,4);c.fillStyle=WHITE;rr(c,cx,cy,cw,q.h,14);c.fill();c.restore();
      c.fillStyle=ST[k].bg;rr(c,cx+cw-8,cy,8,q.h,[0,14,14,0]);c.fill();
      const tx=cx+cw-30;let by=cy+30+fs*.8;block(c,q.ls,tx,by,lh,AL(400,fs),NAVY);
      if(q.tl.length){T(c,q.tl[0],tx,by+(q.ls.length-1)*lh+52,{f:AL,w:700,size:34,color:TEAL})}
      if(k===2){c.fillStyle=TEAL;c.beginPath();c.arc(cx+34,cy+q.h-34,18,0,7);c.fill();tick(c,cx+34,cy+q.h-34,26,WHITE,4)}
      cy+=q.h+gap})});
  foot(c,false)};

// 2 GANTT · build stages as bars on a right to left time axis, only from the numbers given; no numbers means milestones in order
function gParse(v){const t=clean(v);let m=t.match(/(\d+(?:\.\d+)?)\s*[-–—]\s*(\d+(?:\.\d+)?)/);if(m)return{a:+m[1],b:+m[2],unit:t.replace(m[0],'').trim()};m=t.match(/\d+(?:\.\d+)?/);if(m)return{d:+m[0],unit:t.replace(m[0],'').trim()};return{}}
L.x_n_gantt=(c,p,I)=>{fill(c,WHITE);const X=W-M,CW=W-2*M;const it=items(p).slice(0,6),n=it.length;
  if(p.label)index(c,p.label,false);
  let {y}=head0(c,p,X,p.label?136:96,CW,NAVY,{w:900,max:n?(n<=3?124:104):150,lines:n?(n<=3?3:2):3});
  if(p.sub)y=para(c,p.sub,X,y+58,{f:AL,w:400,size:34,maxW:CW,lines:2,color:SLATE});
  if(!n){c.fillStyle=RED;c.fillRect(X-120,y+50,120,8);foot(c,false);return}
  let cur=0;const bars=it.map(s=>{const q=gParse(s.v);let a,b,ms=false;if(q.a!=null){a=q.a;b=q.b}else if(q.d!=null){a=cur;b=cur+q.d}else{a=b=cur;ms=true}cur=Math.max(cur,b);return{s,a,b,ms,unit:q.unit}});
  const allMs=bars.every(b=>b.ms);if(allMs)bars.forEach((b,i)=>{b.a=b.b=i});
  let t0=Math.min(...bars.map(b=>b.a)),t1=Math.max(...bars.map(b=>b.b));if(t1<=t0)t1=t0+1;
  const LW=300,CX0=X-LW-40,CX1=M+(allMs?60:0);const xs=t=>CX0-(t-t0)/(t1-t0)*(CX0-CX1);
  const axH=allMs?20:62,bot=1168;let top=y+(p.sub?64:76);const rh=Math.min(n<=3?190:150,(bot-top-axH)/n);top+=Math.max(0,bot-top-axH-n*rh)*.3;const r0=top+axH;
  // axis
  if(!allMs){const span=t1-t0;const st=[1,2,3,4,5,6,10,12,20,24,25,50,100].find(s=>span/s<=6)||Math.ceil(span/6);
    for(let t=Math.ceil(t0/st)*st;t<=t1+1e-9;t+=st){const x=xs(t);c.fillStyle=LINE;c.fillRect(x-1,r0,2,n*rh);T(c,String(+t.toFixed(1)),x,top+30,{f:AL,w:400,size:28,color:SLATE,align:'center',ltr:true})}
    const units=bars.map(b=>b.unit).filter(Boolean);const u=units.length&&units.every(x=>x===units[0])?units[0]:'';if(u)T(c,u,X,top+30,{f:AL,w:700,size:28,color:SLATE});
    c.fillStyle=NAVY;c.fillRect(CX1,r0-2,CX0-CX1,3)}
  else{c.fillStyle=NAVY;c.fillRect(M,r0-2,CW,3)}
  const bh=Math.min(n<=3?76:58,rh*.46);
  bars.forEach((b,i)=>{const ry=r0+i*rh,cy=ry+rh/2;if(i){c.fillStyle='rgba(207,215,222,.6)';c.fillRect(M,ry,CW,1.5)}
    const lab=b.s.l||(b.ms?'':b.s.v);const ls=wl(c,lab,LW,AL(700,34),rh>110?2:1);block(c,ls,X,cy+12-(ls.length-1)*21,42,AL(700,34),NAVY);
    const last=i===n-1,col=last?RED:NAVY;
    if(b.ms){const x=xs(b.a);if(i){const pb=bars[i-1];c.save();c.strokeStyle=MIST;c.lineWidth=3;c.setLineDash([4,9]);c.beginPath();c.moveTo(xs(pb.a),cy-rh+16);c.lineTo(x,cy-16);c.stroke();c.restore()}
      c.save();c.translate(x,cy);c.rotate(Math.PI/4);c.fillStyle=col;c.fillRect(-15,-15,30,30);c.restore();
      if(b.s.v&&b.s.l){const vt=one(c,b.s.v,Math.max(160,x-M-40),700,34,30);T(c,vt.t,x-34,cy+vt.s*.35,{f:AL,w:700,size:vt.s,color:TEAL})}return}
    const xa=xs(b.a),xb=xs(b.b);const bw=Math.max(14,xa-xb);c.fillStyle=col;rr(c,xa-bw,cy-bh/2,bw,bh,10);c.fill();
    if(b.s.v&&(b.s.l||true)){c.font=AL(700,34);const tw=c.measureText(ISO(clean(b.s.v))).width;
      if(tw+40<=bw)T(c,b.s.v,xa-20,cy+12,{f:AL,w:700,size:34,color:WHITE});
      else if(xa-bw-M>tw+24)T(c,b.s.v,xa-bw-18,cy+12,{f:AL,w:700,size:34,color:col});
      else T(c,b.s.v,xa+18,cy+12,{f:AL,w:700,size:34,color:col,align:'left'})}});
  c.fillStyle=NAVY;c.fillRect(M,r0+n*rh,CW,2);
  foot(c,false)};

// 3 DOC · a document page: photo cover, page icon, title, a callout, and a toggle list that opens as far as the space allows
L.x_n_doc=(c,p,I)=>{fill(c,WHITE);const X=W-M,CW=W-2*M;const it=items(p).slice(0,6),n=it.length;
  // measure the body first so the cover can give or take room
  const F=fit(c,p.head,CW,{f:AL,w:700,max:96,min:72,lines:2,lh:1.04,track:-.02});
  const cl=p.sub?wl(c,p.sub,CW-120,AL(400,34),3):[];const clH=cl.length?48+cl.length*46:0;
  const rows=it.map(s=>{const t=s.l||s.v;const body=s.l&&s.v?wl(c,s.v,CW-60,AL(400,34),2):[];return{t:wl(c,t,CW-60,AL(700,36),1)[0],body}});
  const ctaH=p.cta?76:0;
  const bodyNeed=F.lh*(F.ls.length-1)+F.size*.8+(clH?40+clH:0)+(n?44:0)+n*72+ctaH;
  const coverH=Math.max(220,Math.min(440,1176-110-bodyNeed-40));
  const okp=photo(c,p,I,0,0,W,coverH);if(!okp){c.save();c.globalAlpha=.14;mark(c,M+60,coverH/2-30,2.2,WHITE);c.restore()}
  if(p.label){c.save();shadow(c,16,.18,4);pill(c,p.label,X,64,{bg:'rgba(255,255,255,.94)',fg:NAVY,size:28,h:54});c.restore()}
  const ic=112,iy=coverH-ic*.55;c.fillStyle=WHITE;rr(c,X-ic-8,iy-8,ic+16,ic+16,30);c.fill();c.fillStyle=NAVY;rr(c,X-ic,iy,ic,ic,24);c.fill();mark(c,X-ic/2-16,iy+ic/2-30,1.3,WHITE);
  let y=head(c,F,X,iy+ic+30,NAVY);
  if(cl.length){const by=y+40;c.fillStyle=MIST1;rr(c,M,by,CW,clH,20);c.fill();c.fillStyle=RED;c.fillRect(X-50,by+28,24,24);block(c,cl,X-74,by+24+28,46,AL(400,34),NAVY);y=by+clH}
  if(n){let ty=y+44;const lim=1176-ctaH;let budget=lim-ty-n*72;
    rows.forEach((r,i)=>{if(ty+60>lim)return;const open=r.body.length&&budget>=r.body.length*46+10;if(open)budget-=r.body.length*46+10;
      tri(c,X-14,ty+24,13,open?NAVY:SLATE,open?'down':'left');T(c,r.t,X-46,ty+36,{f:AL,w:700,size:36,color:NAVY});
      if(open){c.fillStyle=LINE;c.fillRect(X-16,ty+60,2,r.body.length*46);block(c,r.body,X-46,ty+36+50,46,AL(400,34),SLATE);ty+=r.body.length*46+10}
      ty+=72});
    y=ty}
  if(p.cta){const cy=Math.min(1170,y+30);const w=T(c,p.cta,X,cy,{f:AL,w:700,size:34,color:RED});c.fillStyle=RED;c.fillRect(X-Math.min(w,CW),cy+12,Math.min(w,CW),3)}
  foot(c,false)};

// 4 RESULT · a search result: the query in the box, the page as the top result with a big image, related questions under it
L.x_n_result=(c,p,I)=>{fill(c,PAPER);const X=W-M,CW=W-2*M;const it=items(p).slice(0,6),n=it.length;
  const q=clean(p.label||String(p.head||'').replace(/\n/g,' ')).trim();
  c.save();shadow(c,24,.12,6);c.fillStyle=WHITE;rr(c,M+120,58,CW-120,100,50);c.fill();c.restore();
  c.strokeStyle=NAVY;c.lineWidth=5;c.beginPath();c.arc(X-58,104,15,0,7);c.stroke();c.beginPath();c.moveTo(X-69,115);c.lineTo(X-82,128);c.stroke();
  const qq=one(c,q,CW-290,400,36,30);T(c,qq.t,X-100,108+qq.s*.3,{f:AL,w:400,size:qq.s,color:NAVY});
  // tabs
  let tx=X-30;['הכול','תמונות','מפות'].forEach((t,i)=>{const w=T(c,t,tx,224,{f:AL,w:i?400:700,size:28,color:i?SLATE:NAVY});if(!i){c.fillStyle=RED;c.fillRect(tx-w,240,w,5)}tx-=w+44});
  c.fillStyle=LINE;c.fillRect(M,244,CW,2);
  // card
  const cx=M,cw=CW,pad=40,ix=X-pad,iw=cw-pad*2,top=280;
  const F=fit(c,p.head,iw,{f:AL,w:700,max:84,min:72,lines:2,lh:1.06,track:-.015});
  const sn=p.sub?wl(c,p.sub,iw,AL(400,34),2):[];
  const qs=it.map(s=>s.l||s.v).filter(Boolean);
  const base=top+pad+70+30+F.lh*(F.ls.length-1)+F.size*.8+(sn.length?24+sn.length*46:0);
  const hasP=!!p.shot;let k=Math.min(qs.length,4);let ph=0;
  const paaH=k=>k?84+k*82:0;
  if(hasP){for(;k>=0;k--){ph=1176-pad-paaH(k)-30-(base+30);if(ph>=330||k===0)break}ph=Math.min(ph,580)}
  const cardB=Math.min(1176,base+(hasP?30+ph:0)+paaH(k)+pad+(hasP?0:10));
  c.save();shadow(c,30,.10,10);c.fillStyle=WHITE;rr(c,cx,top,cw,cardB-top,30);c.fill();c.restore();
  c.fillStyle=NAVY;c.beginPath();c.arc(ix-28,top+pad+28,28,0,7);c.fill();mark(c,ix-40,top+pad+8,.5,WHITE);
  T(c,'קבוצת קורקוס',ix-72,top+pad+22,{f:AL,w:700,size:28,color:NAVY});T(c,'kurkoos-group.co.il',ix-72,top+pad+56,{f:AL,w:400,size:26,color:SLATE,ltr:true});
  let y=head(c,F,ix,top+pad+100,TEAL);
  if(sn.length)y=block(c,sn,ix,y+24+46,46,AL(400,34),SLATE);
  if(hasP){const py=y+30;c.save();rr(c,cx+pad,py,iw,ph,20);c.clip();photo(c,p,I,cx+pad,py,iw,ph);c.restore();y=py+ph}
  if(k){let ry=y+30;T(c,'שאלות נוספות',ix,ry+38,{f:AL,w:700,size:30,color:NAVY});ry+=60;
    qs.slice(0,k).forEach(t=>{c.fillStyle=LINE;c.fillRect(cx+pad,ry,iw,2);const tt=one(c,t,iw-70,400,34,30);T(c,tt.t,ix,ry+52,{f:AL,w:400,size:tt.s,color:NAVY});chev(c,cx+pad+16,ry+40,11,SLATE,'down');ry+=82})}
  foot(c,false)};

// 5 METRICS · a dark dashboard: the latest value huge, a sparkline drawn only from the numbers given, each point labelled
L.x_n_metrics=(c,p,I)=>{fill(c,NAVY);const X=W-M,CW=W-2*M;const it=items(p).slice(0,6),n=it.length;grid(c,MIST,.06,0,0,W,H,54);
  if(p.label)index(c,p.label,true);
  let {y}=head0(c,p,X,p.label?136:96,CW,WHITE,{w:700,max:n?96:140,lines:n?2:3});
  if(p.sub)y=para(c,p.sub,X,y+56,{f:AL,w:400,size:34,maxW:CW,lines:2,color:MIST});
  if(!n){foot(c,true);return}
  const pts=it.map(s=>({s,v:num(s.v)})).filter(q=>isFinite(q.v));
  if(pts.length>=3){const last=pts[pts.length-1];
    const hy=y+60;const hs=fit1(c,last.s.v,CW*.6,AL,300,190,96,-.02);T(c,last.s.v,X,hy+hs*.8,{f:AL,w:300,size:hs,color:WHITE,track:-.02});
    if(last.s.l){const ll=wl(c,last.s.l,CW*.36,AL(400,34),2);block(c,ll,M,hy+hs*.8-(ll.length-1)*44,44,AL(400,34),MIST,'left')}
    const py=hy+hs*.8+50,pb=1172;c.fillStyle='rgba(255,255,255,.05)';rr(c,M,py,CW,pb-py,28);c.fill();c.strokeStyle='rgba(255,255,255,.12)';c.lineWidth=1.5;c.stroke();
    const m=pts.length,slot=(CW-40)/m;const labs=pts.map(q=>q.s.l?wl(c,q.s.l,slot-12,AL(400,30),2):[]);const lbH=Math.max(...labs.map(l=>l.length))*38;
    const ct=py+96,cb=pb-40-lbH-30;const vs=pts.map(q=>q.v);let lo=Math.min(...vs),hi=Math.max(...vs);if(hi===lo){hi+=1;lo-=1}
    const xp=i=>X-20-slot*(i+.5),yp=v=>cb-(v-lo)/(hi-lo)*(cb-ct);
    c.fillStyle='rgba(255,255,255,.08)';[0,.5,1].forEach(f=>c.fillRect(M+20,ct+f*(cb-ct),CW-40,1.5));
    const gr=c.createLinearGradient(0,ct,0,cb);gr.addColorStop(0,'rgba(143,182,200,.38)');gr.addColorStop(1,'rgba(143,182,200,0)');
    c.beginPath();pts.forEach((q,i)=>i?c.lineTo(xp(i),yp(q.v)):c.moveTo(xp(i),yp(q.v)));c.lineTo(xp(m-1),cb);c.lineTo(xp(0),cb);c.closePath();c.fillStyle=gr;c.fill();
    c.beginPath();pts.forEach((q,i)=>i?c.lineTo(xp(i),yp(q.v)):c.moveTo(xp(i),yp(q.v)));c.strokeStyle=MIST;c.lineWidth=5;c.lineJoin='round';c.stroke();
    pts.forEach((q,i)=>{const x=xp(i),yy=yp(q.v),lt=i===m-1;if(lt){c.fillStyle='rgba(169,11,12,.3)';c.beginPath();c.arc(x,yy,24,0,7);c.fill()}c.fillStyle=lt?RED:WHITE;c.beginPath();c.arc(x,yy,lt?12:8,0,7);c.fill();
      const vt=one(c,q.s.v,slot-8,700,34,26);T(c,vt.t,x,yy-28,{f:AL,w:700,size:vt.s,color:WHITE,align:'center'});
      block(c,labs[i],x,cb+30+38,38,AL(400,30),MIST,'center')})}
  else{const cols=n<=2?1:2,rows=Math.ceil(n/cols),g=20,top=y+60,bot=1172;const tw=(CW-g*(cols-1))/cols,th=Math.min(cols===1?360:300,(bot-top-g*(rows-1))/rows);
    it.forEach((s,i)=>{const r=Math.floor(i/cols),k=i%cols;const x=X-(k+1)*tw-k*g,ty=top+r*(th+g);c.fillStyle=i===0?TEAL:'rgba(255,255,255,.06)';rr(c,x,ty,tw,th,24);c.fill();
      const ll=s.l?wl(c,s.l,tw-60,AL(400,34),2):[];const lb=ty+th-32-(ll.length-1)*44;block(c,ll,x+tw-30,lb,44,AL(400,34),i===0?MIST1:MIST);
      if(s.v){const vs=fit1(c,s.v,tw-60,AL,300,Math.min(cols===1?190:130,(lb-ty-60)*.9),40,-.02);T(c,s.v,x+tw-30,ty+30+vs*.8,{f:AL,w:300,size:vs,color:WHITE,track:-.02})}})}
  srcLine(c,p,H-140,true);foot(c,true)};

// 6 ISSUE · a defect ticket: type, status pill, title, description, photo attachment, properties with the owner role, a comment box
L.x_n_issue=(c,p,I)=>{fill(c,MIST1);const it=items(p).slice(0,6),n=it.length;const cx=48,cw=W-96,pad=44,ix=cx+cw-pad,iw=cw-2*pad,bot=1088;let top=56;
  const F=fit(c,p.head,iw,{f:AL,w:700,max:84,min:72,lines:3,lh:1.06,track:-.015});
  const ds=p.sub?wl(c,p.sub,iw,AL(400,34),3):[];
  const rowH=68,ctaH=p.cta?110:0;const hasP=!!p.shot;
  let rows=n;const fixed=()=>top+140+F.lh*(F.ls.length-1)+F.size*.8+(ds.length?28+ds.length*46:0)+(rows?30+rows*rowH:0)+ctaH+30;
  let ph=0;if(hasP){ph=Math.min(600,bot-fixed()-40);while(ph<260&&rows>2){rows--;ph=Math.min(600,bot-fixed()-40)}if(ph<200)ph=0}else{while(fixed()>bot&&rows>1)rows--}
  let cb=bot;if(!ph){const h=fixed()+10-top;top=56+Math.max(0,bot-56-h)*.4;cb=top+h}
  c.save();shadow(c,40,.12,12);c.fillStyle=WHITE;rr(c,cx,top,cw,cb-top,30);c.fill();c.restore();
  c.fillStyle=RED;c.fillRect(ix-22,top+44,22,22);T(c,'ליקוי',ix-36,top+66,{f:AL,w:700,size:30,color:NAVY});
  if(p.label){const t=clean(p.label);const k=/פתוח|חדש|דחוף/.test(t)?[RED,WHITE]:/בטיפול|בביצוע|בבדיקה/.test(t)?[TEAL,WHITE]:/נסגר|תוקן|הושלם|סגור/.test(t)?[NAVY,WHITE]:[MIST,NAVY];pill(c,t,cx+pad,top+56,{left:true,bg:k[0],fg:k[1],size:28,h:52,dot:k[1]})}
  c.fillStyle=LINE;c.fillRect(cx+pad,top+104,iw,2);
  let y=head(c,F,ix,top+140,NAVY);
  if(ds.length)y=block(c,ds,ix,y+28+46,46,AL(400,34),SLATE);
  if(ph){const py=y+40;c.save();rr(c,cx+pad,py,iw,ph,18);c.clip();photo(c,p,I,cx+pad,py,iw,ph);c.restore();y=py+ph}
  if(rows){let ry=y+30;it.slice(0,rows).forEach(s=>{c.fillStyle=LINE;c.fillRect(cx+pad,ry,iw,1.5);const yb=ry+rowH/2+12;
      const kt=one(c,s.l,250,400,34,28);T(c,kt.t,ix,yb,{f:AL,w:400,size:kt.s,color:SLATE});let vx=ix-280;
      if(/אחראי|מטפל|בעל|אחריות|גורם|מבצע/.test(s.l)&&s.v){c.fillStyle=NAVY;c.beginPath();c.arc(vx-22,yb-12,22,0,7);c.fill();mark(c,vx-31,yb-27,.32,WHITE);vx-=58}
      const vt=one(c,s.v,vx-(cx+pad),700,34,28);T(c,vt.t,vx,yb,{f:AL,w:700,size:vt.s,color:NAVY});ry+=rowH});c.fillStyle=LINE;c.fillRect(cx+pad,ry,iw,1.5);y=ry}
  if(p.cta){const by=cb-pad-76;c.strokeStyle=LINE;c.lineWidth=2;rr(c,cx+pad,by,iw,76,38);c.stroke();const ct=one(c,p.cta,iw-130,400,34,28);T(c,ct.t,ix-30,by+50,{f:AL,w:400,size:ct.s,color:SLATE});
    c.fillStyle=NAVY;c.beginPath();c.arc(cx+pad+40,by+38,28,0,7);c.fill();chev(c,cx+pad+38,by+38,9,WHITE,'left')}
  foot(c,false)};

// 7 INVITE · a calendar invite card: event title, when, where and who as rows with drawn icons, reply buttons
function ico(c,kind,x,y,s,col){c.save();c.translate(x,y);c.strokeStyle=col;c.fillStyle=col;c.lineWidth=3.5;c.lineCap='round';c.lineJoin='round';
  if(kind==='time'){c.beginPath();c.arc(0,0,s,0,7);c.stroke();c.beginPath();c.moveTo(0,-s*.55);c.lineTo(0,0);c.lineTo(s*.45,s*.3);c.stroke()}
  else if(kind==='place'){c.beginPath();c.arc(0,-s*.25,s*.6,Math.PI*.85,Math.PI*.15);c.lineTo(0,s);c.closePath();c.stroke();c.beginPath();c.arc(0,-s*.25,s*.2,0,7);c.fill()}
  else if(kind==='who'){c.beginPath();c.arc(0,-s*.35,s*.38,0,7);c.stroke();c.beginPath();c.arc(0,s*.95,s*.75,Math.PI*1.15,Math.PI*1.85);c.stroke()}
  else if(kind==='date'){rr(c,-s*.85,-s*.7,s*1.7,s*1.6,5);c.stroke();c.fillRect(-s*.85,-s*.7,s*1.7,s*.42);c.fillRect(-s*.45,-s,3.5,s*.5);c.fillRect(s*.45-3,-s,3.5,s*.5)}
  else{c.beginPath();c.moveTo(-s*.6,-s*.8);c.lineTo(s*.35,-s*.8);c.lineTo(s*.65,-s*.5);c.lineTo(s*.65,s*.85);c.lineTo(-s*.6,s*.85);c.closePath();c.stroke();c.fillRect(-s*.3,-s*.1,s*.6,3);c.fillRect(-s*.3,s*.3,s*.6,3)}
  c.restore()}
function icoOf(t){t=clean(t);if(/שעה|מתי|זמן|משך/.test(t))return'time';if(/תאריך|יום|מועד/.test(t))return'date';if(/איפה|מקום|כתובת|אתר|מיקום|נקודת/.test(t))return'place';if(/מי|משתתפ|מוזמנ|נוכח|צוות|מגיע/.test(t))return'who';return'doc'}
L.x_n_invite=(c,p,I)=>{fill(c,PAPER);grid(c,MIST,.18,0,0,W,H,54);const it=items(p).slice(0,6),n=it.length;const cx=M-16,cw=W-2*cx,pad=48,ix=cx+cw-pad,iw=cw-2*pad,top=60,bot=1088;
  const F=fit(c,p.head,iw,{f:AL,w:700,max:92,min:72,lines:3,lh:1.05,track:-.02});const ds=p.sub?wl(c,p.sub,iw,AL(400,34),2):[];
  let two=true,nS=n;const rowsH=()=>nS*(two?112:80);const btnH=96;
  const textH=()=>(p.label?58:0)+F.lh*(F.ls.length-1)+F.size*.8+(ds.length?24+ds.length*46:0)+(n?40+rowsH():0)+40+btnH+pad;
  let bh=p.shot?Math.min(560,bot-top-textH()-40):0;if(p.shot&&bh<200){two=false;bh=Math.min(560,bot-top-textH()-40)}if(bh<180)bh=0;if(!p.shot&&top+textH()+40>bot)two=false;while(nS>1&&(bh||16)+40+textH()>bot-top)nS--;
  const cardH=Math.min(bot-top,(bh||16)+40+textH());const cy0=top+Math.max(0,(bot-top-cardH)/2);
  c.save();shadow(c,44,.14,14);c.fillStyle=WHITE;rr(c,cx,cy0,cw,cardH,32);c.fill();c.restore();
  if(bh){c.save();rr(c,cx,cy0,cw,bh,[32,32,0,0]);c.clip();photo(c,p,I,cx,cy0,cw,bh);c.restore()}else{c.save();rr(c,cx,cy0,cw,16,[32,32,0,0]);c.clip();c.fillStyle=NAVY;c.fillRect(cx,cy0,cw,16);c.restore()}
  let y=cy0+(bh||16)+40;
  if(p.label){ico(c,'date',ix-16,y+16,15,RED);const lt=one(c,p.label,iw-50,700,30,26);T(c,lt.t,ix-46,y+28,{f:AL,w:700,size:lt.s,color:RED});y+=58}
  y=head(c,F,ix,y,NAVY);if(ds.length)y=block(c,ds,ix,y+24+46,46,AL(400,34),SLATE);
  if(n){let ry=y+40;it.slice(0,nS).forEach(s=>{c.fillStyle=LINE;c.fillRect(cx+pad,ry,iw,1.5);const kind=icoOf(s.l||s.v);const rh=two?112:80;
      c.fillStyle=MIST1;c.beginPath();c.arc(ix-30,ry+rh/2,30,0,7);c.fill();ico(c,kind,ix-30,ry+rh/2,14,NAVY);
      if(two&&s.l&&s.v){T(c,one(c,s.l,iw-90,400,30,26).t,ix-82,ry+44,{f:AL,w:400,size:30,color:SLATE});const vt=one(c,s.v,iw-90,700,34,28);T(c,vt.t,ix-82,ry+90,{f:AL,w:700,size:vt.s,color:NAVY})}
      else{const kw=s.l&&s.v?T(c,s.l+':',ix-82,ry+rh/2+12,{f:AL,w:400,size:34,color:SLATE})+12:0;const vt=one(c,s.v||s.l,iw-90-kw,700,34,28);T(c,vt.t,ix-82-kw,ry+rh/2+12,{f:AL,w:700,size:vt.s,color:NAVY})}
      ry+=rh});y=ry}
  const by=y+40;c.fillStyle=LINE;c.fillRect(cx,by-1,cw,2);const bc=by+btnH/2+4;
  const lab=p.cta?one(c,p.cta,iw-470,700,34,26):{t:'אישור הגעה',s:30};T(c,lab.t,ix,bc+lab.s*.35,{f:AL,w:700,size:lab.s,color:NAVY});
  let bx=cx+pad;[['לא',0],['אולי',0],['כן',1]].forEach(([t,on])=>{bx+=pill(c,t,bx,bc,{left:true,bg:on?NAVY:WHITE,fg:on?WHITE:NAVY,stroke:on?null:LINE,size:30,h:62,pad:30})+14});
  foot(c,false)};

// 8 ROUTE · a navigation card: the photo is the map, a red route from plot to keys, numbered stops, a bottom sheet with the directions
L.x_n_route=(c,p,I)=>{fill(c,WHITE);const X=W-M,CW=W-2*M;const it=items(p).slice(0,6),n=it.length;
  const F=fit(c,p.head,CW,{f:AL,w:700,max:88,min:72,lines:2,lh:1.04,track:-.02});const ds=p.sub?wl(c,p.sub,CW,AL(400,34),2):[];
  const rs=it.map(s=>{const t=s.l||s.v;const v=s.l?clean(s.v).trim():'';c.font=AL(400,34);const vw=v?c.measureText(ISO(v)).width:0;const avail=CW-80-(vw?vw+30:0);const ls=wl(c,t,avail,AL(700,34),2);return{t:ls,v,h:ls.length>1?108:74}});
  const listH=rs.reduce((a,r)=>a+r.h,0);const need=64+F.lh*(F.ls.length-1)+F.size*.8+(ds.length?20+ds.length*46:0)+(n?36+listH:0)+20;
  const st=Math.max(430,Math.min(760,1180-need));
  const okp=photo(c,p,I,0,0,W,st+50);c.fillStyle='rgba(7,41,58,.22)';c.fillRect(0,0,W,st+50);if(!okp){c.fillStyle=TEAL;c.fillRect(0,0,W,st+50);grid(c,WHITE,.12,0,0,W,st+50,72)}
  // route
  const R=rnd((p.seed||9)*13+5);const m=Math.max(2,n);const A=[X-70,st-80],B=[M+190,Math.min(st-120,p.label?290:270)];const P=[];
  for(let i=0;i<m;i++){const f=i/(m-1);let x=A[0]+(B[0]-A[0])*f,y=A[1]+(B[1]-A[1])*f;if(i&&i<m-1)y+=(R()-.5)*Math.min(90,(A[1]-B[1])/(m-1)*.8);P.push([x,y])}
  const path=()=>{c.beginPath();c.moveTo(P[0][0],P[0][1]);for(let i=1;i<P.length;i++){const a=P[i-1],b=P[i];c.lineTo(a[0],(a[1]+b[1])/2);c.lineTo(b[0],(a[1]+b[1])/2);c.lineTo(b[0],b[1])}};
  c.lineJoin='round';c.lineCap='round';path();c.strokeStyle=WHITE;c.lineWidth=24;c.stroke();path();c.strokeStyle=RED;c.lineWidth=12;c.stroke();
  P.forEach((q,i)=>{if(i===P.length-1&&n>=2)return;if(!n&&i)return;c.save();shadow(c,10,.3,3);c.fillStyle=i===0?NAVY:WHITE;c.beginPath();c.arc(q[0],q[1],26,0,7);c.fill();c.restore();c.strokeStyle=i===0?WHITE:NAVY;c.lineWidth=4;c.stroke();
    if(n)T(c,String(i+1),q[0],q[1]+11,{f:AL,w:700,size:30,color:i===0?WHITE:NAVY,align:'center',ltr:true})});
  // end pin
  const E=P[P.length-1];c.save();shadow(c,16,.35,6);c.fillStyle=RED;c.beginPath();c.arc(E[0],E[1]-64,36,Math.PI*.82,Math.PI*.18);c.lineTo(E[0],E[1]);c.closePath();c.fill();c.restore();
  if(n>=2)T(c,String(n),E[0],E[1]-52,{f:AL,w:700,size:32,color:WHITE,align:'center',ltr:true});else{c.fillStyle=WHITE;c.beginPath();c.arc(E[0],E[1]-64,12,0,7);c.fill()}
  if(p.label){c.save();shadow(c,16,.25,5);pill(c,p.label,X,92,{bg:WHITE,fg:NAVY,size:30,h:60,dot:RED});c.restore()}
  // sheet
  c.save();shadow(c,40,.25,-8);c.fillStyle=WHITE;rr(c,0,st,W,H-st,[40,40,0,0]);c.fill();c.restore();c.fillStyle=LINE;rr(c,W/2-50,st+18,100,10,5);c.fill();
  let y=head(c,F,X,st+64,NAVY);if(ds.length)y=block(c,ds,X,y+20+46,46,AL(400,34),SLATE);
  if(n){let ry=y+36;const cx=X-26;const ys=[];rs.forEach((r,i)=>{ys.push(ry+r.h/2);ry+=r.h});
    c.save();c.strokeStyle=MIST;c.lineWidth=4;c.setLineDash([3,10]);c.beginPath();c.moveTo(cx,ys[0]);c.lineTo(cx,ys[ys.length-1]);c.stroke();c.restore();
    let yy=y+36;rs.forEach((r,i)=>{const cy=yy+r.h/2,last=i===n-1&&n>1;c.fillStyle=i===0?NAVY:last?RED:WHITE;c.beginPath();c.arc(cx,cy,24,0,7);c.fill();if(!i||last){}else{c.strokeStyle=NAVY;c.lineWidth=3;c.stroke()}
      T(c,String(i+1),cx,cy+10,{f:AL,w:700,size:28,color:(i===0||last)?WHITE:NAVY,align:'center',ltr:true});
      block(c,r.t,X-74,cy+12-(r.t.length-1)*20,42,AL(700,34),NAVY);if(r.v)T(c,r.v,M,cy+12,{f:AL,w:400,size:34,color:SLATE,align:'left'});
      if(i<n-1){c.fillStyle='rgba(207,215,222,.7)';c.fillRect(M,yy+r.h,X-74-M,1.5)}yy+=r.h})}
  foot(c,false)};

// 9 PLANS · a pricing page with features in place of prices: one card per option, the first one carried in navy
L.x_n_plans=(c,p,I)=>{fill(c,PAPER);const X=W-M,CW=W-2*M;const it=items(p).slice(0,6),n=it.length;
  let y0=96;if(p.label){const lt=one(c,p.label,CW-200,700,28,26);c.font=AL(700,lt.s);const w=c.measureText(ISO(lt.t)).width;const R0=W/2+(w+32)/2;c.fillStyle=RED;c.fillRect(R0-18,y0-22,18,18);T(c,lt.t,R0-32,y0,{f:AL,w:700,size:lt.s,color:NAVY});y0+=44}
  const F=fit(c,p.head,CW-40,{f:AL,w:900,max:n?(n<=3?110:96):140,min:72,lines:2,lh:1.03,track:-.02});let y=head(c,F,W/2,y0,NAVY,{align:'center'});
  if(p.sub)y=para(c,p.sub,W/2,y+54,{f:AL,w:400,size:34,maxW:CW-60,lines:2,color:SLATE,align:'center'});
  if(!n){foot(c,false);return}
  const ctaH=p.cta?118:0;const top0=y+56,bot=1176;const per=n<=3?[n]:n===4?[2,2]:n===5?[3,2]:[3,3];const g=20,rg=20;const maxRow=(bot-ctaH-top0-rg*(per.length-1))/per.length;
  const fz=n<=2?38:34,flh=Math.round(fz*1.24);
  // measure every card
  let k=0;const rowsM=per.map(cnt=>{const cw=(CW-g*(cnt-1))/cnt,iw=cw-64;const cs=[];for(let j=0;j<cnt;j++,k++){const s=it[k];
      const ts=s.v?fit1(c,s.v,iw,AL,700,per.length>1?44:(n<=2?60:52),34):0;const tl=s.v?wl(c,s.v,iw,AL(700,ts),2):[];
      const fs=String(s.l||'').split(/\s*[·•;|\n]\s*|,\s+/).map(t=>t.trim()).filter(Boolean).map(f=>wl(c,f,iw-50,AL(400,fz),2));
      const hh=40+(tl.length?ts*.85+(tl.length-1)*ts*1.1+52:0);const fh=fs.reduce((a,ls)=>a+ls.length*flh+18,0);cs.push({s,ts,tl,fs,hh,need:hh+fh+30})}
    return{cnt,cw,cs,h:Math.min(maxRow,Math.max(...cs.map(q=>q.need)))}});
  const used=rowsM.reduce((a,r)=>a+r.h,0)+rg*(per.length-1);let ry=top0+Math.max(0,bot-ctaH-top0-used)*.35;k=0;
  rowsM.forEach(R=>{const rh=R.h;R.cs.forEach((q,j)=>{const x=X-(j+1)*R.cw-j*g,feat=k===0;k++;const cw=R.cw,ix=x+cw-32,iw=cw-64;
      c.save();shadow(c,feat?30:14,feat?.22:.06,feat?10:3);c.fillStyle=feat?NAVY:WHITE;rr(c,x,ry,cw,rh,26);c.fill();c.restore();if(!feat){c.strokeStyle=LINE;c.lineWidth=1.5;rr(c,x,ry,cw,rh,26);c.stroke()}
      if(feat){c.save();rr(c,x,ry,cw,rh,26);c.clip();c.fillStyle=RED;c.fillRect(x,ry,cw,10);c.restore()}
      let ty=ry+40;
      if(q.tl.length){block(c,q.tl,ix,ty+q.ts*.85,q.ts*1.1,AL(700,q.ts),feat?WHITE:NAVY);ty+=q.ts*.85+(q.tl.length-1)*q.ts*1.1+28;c.fillStyle=feat?'rgba(255,255,255,.2)':LINE;c.fillRect(x+32,ty,iw,2);ty+=24}
      q.fs.forEach(ls=>{const h=ls.length*flh+18;if(ty+h>ry+rh-12)return;const cy=ty+flh*.5;
        c.fillStyle=feat?TEAL:MIST1;c.beginPath();c.arc(ix-17,cy,17,0,7);c.fill();tick(c,ix-17,cy,22,feat?WHITE:TEAL,3.5);
        block(c,ls,ix-48,ty+fz*.86,flh,AL(400,fz),feat?WHITE:NAVY);ty+=h})});ry+=rh+rg});
  if(p.cta){const ct=one(c,p.cta,CW-160,700,34,28);c.font=AL(700,ct.s);const bw=c.measureText(ISO(ct.t)).width+120;const by=ry-rg+36;c.fillStyle=RED;rr(c,W/2-bw/2,by,bw,78,39);c.fill();T(c,ct.t,W/2,by+39+ct.s*.35,{f:AL,w:700,size:ct.s,color:WHITE,align:'center'})}
  foot(c,false)};

// 10 CARD · a task card opened from a kanban board: photo cover, the list it sits on, a checklist with a progress bar counted from the items
L.x_n_card=(c,p,I)=>{fill(c,MIST1);const it=items(p).slice(0,6),n=it.length;const cx=48,cw=W-96,pad=44,ix=cx+cw-pad,iw=cw-2*pad,top=48,bot=1088;
  const F=fit(c,p.head,iw,{f:AL,w:700,max:84,min:72,lines:2,lh:1.05,track:-.02});let ds=p.sub?wl(c,p.sub,iw,AL(400,34),2):[];
  const rows=it.map(s=>{const dn=isDone(s.v);const t=s.l||(dn?'':s.v);const tag=s.l&&!dn&&stOf(s.v)<0?clean(s.v).trim():'';let tw=0;if(tag){c.font=AL(700,34);tw=Math.min(260,c.measureText(ISO(tag)).width)+24}const ls=wl(c,t,iw-70-tw,AL(400,34),2);return{dn,ls,tag,tw,h:ls.length>1?104:72}});
  const done=rows.filter(r=>r.dn).length;const listH=rows.reduce((a,r)=>a+r.h,0);
  let textH=(p.label?60:0)+F.lh*(F.ls.length-1)+F.size*.8+(ds.length?24+ds.length*46:0)+(n?40+60+40+listH:0)+pad;
  while(ds.length&&bot-top-36-textH<(p.shot?200:150)){ds=ds.slice(0,ds.length-1);textH-=46;if(!ds.length)textH-=24}
  let ch=Math.max(p.shot?170:130,Math.min(640,bot-top-36-textH));
  c.save();shadow(c,40,.14,12);c.fillStyle=WHITE;rr(c,cx,top,cw,bot-top,28);c.fill();c.restore();
  c.save();rr(c,cx,top,cw,ch,[28,28,0,0]);c.clip();const okp=photo(c,p,I,cx,top,cw,ch);if(!okp){c.globalAlpha=.14;mark(c,cx+cw/2-40,top+ch/2-50,2.4,WHITE)}c.restore();
  let y=top+ch+36;
  if(p.label){const w=pill(c,p.label,ix,y+20,{bg:MIST1,fg:NAVY,size:28,h:50,dot:TEAL});y+=60}
  y=head(c,F,ix,y,NAVY);if(ds.length)y=block(c,ds,ix,y+24+46,46,AL(400,34),SLATE);
  if(n){let hy=y+40;c.strokeStyle=NAVY;c.lineWidth=3.5;rr(c,ix-30,hy,30,30,6);c.stroke();tick(c,ix-15,hy+15,22,NAVY,3.5);T(c,'רשימת בדיקה',ix-48,hy+28,{f:AL,w:700,size:30,color:NAVY});
    T(c,done+'/'+n,cx+pad,hy+28,{f:AL,w:700,size:30,color:done===n?RED:SLATE,align:'left',ltr:true});
    const by=hy+56;c.fillStyle=MIST1;rr(c,cx+pad,by,iw,14,7);c.fill();if(done){const fw=iw*done/n;c.fillStyle=done===n?RED:TEAL;rr(c,cx+pad+iw-fw,by,fw,14,7);c.fill()}
    let ry=by+40;rows.forEach(r=>{if(ry+r.h>bot-20)return;const cy=ry+r.h/2;
      if(r.dn){c.fillStyle=TEAL;rr(c,ix-38,cy-19,38,38,8);c.fill();tick(c,ix-19,cy,26,WHITE,4)}else{c.strokeStyle=SLATE;c.lineWidth=3;rr(c,ix-38,cy-19,38,38,8);c.stroke()}
      block(c,r.ls,ix-62,cy+12-(r.ls.length-1)*21,42,AL(400,34),r.dn?SLATE:NAVY);
      if(r.tag){const tt=one(c,r.tag,240,700,34,28);T(c,tt.t,cx+pad,cy+12,{f:AL,w:700,size:tt.s,color:TEAL,align:'left'})}
      ry+=r.h})}
  foot(c,false)};

// 11 KEYNOTE · one statement on a dark stage, set huge in the narrow cut, a red rule, the supporting line under it
L.x_n_keynote=(c,p,I)=>{fill(c,NAVY);const g=c.createRadialGradient(W/2,H*.42,40,W/2,H*.42,780);g.addColorStop(0,'rgba(16,85,114,.85)');g.addColorStop(1,'rgba(16,85,114,0)');c.fillStyle=g;c.fillRect(0,0,W,H);
  const CW=W-2*M-40;const F=fit(c,p.head,CW,{f:TZ,w:800,max:230,min:96,lines:4,lh:.98,track:-.01});
  const sl=p.sub?wl(c,p.sub,CW-60,AL(400,38),2):[];const ctaL=p.cta?1:0;
  const hH=F.lh*(F.ls.length-1)+F.size*.8;const blockH=hH+(sl.length?70+sl.length*52:0)+(ctaL?80:0);
  const top=Math.max(p.label?220:170,(H-160-blockH)/2+20);
  if(p.label){c.fillStyle=RED;c.beginPath();c.arc(W/2,120,8,0,7);c.fill();const lt=one(c,p.label,CW,700,30,26);T(c,lt.t,W/2,176,{f:AL,w:700,size:lt.s,color:MIST,align:'center',track:.04})}
  let y=head(c,F,W/2,top,WHITE,{align:'center'});
  if(sl.length){c.fillStyle=RED;c.fillRect(W/2-50,y+44,100,6);y=block(c,sl,W/2,y+44+70,52,AL(400,38),MIST1,'center')}
  if(ctaL){const ct=one(c,p.cta,CW,700,34,28);T(c,ct.t,W/2,y+80,{f:AL,w:700,size:ct.s,color:WHITE,align:'center'})}
  foot(c,true)};

// 12 REVEAL · a before/after slider over the photo in a framed card: drawn plan on one side, the real place on the other, the handle at the given percent
L.x_n_reveal=(c,p,I)=>{fill(c,PAPER);const X=W-M,CW=W-2*M;const it=items(p).slice(0,6);
  if(p.label)index(c,p.label,false);
  let {y}=head0(c,p,X,p.label?136:96,CW,NAVY,{w:900,max:100,lines:2});
  if(p.sub)y=para(c,p.sub,X,y+56,{f:AL,w:400,size:34,maxW:CW,lines:2,color:SLATE});
  const pc=it.find(s=>/\d\s*%/.test(s.v));let pct=pc?Math.max(8,Math.min(92,num(pc.v))):50;
  const labs=it.filter(s=>s!==pc).map(s=>s.l||s.v).filter(Boolean);const bef=labs[0]||'לפני',aft=labs[1]||'אחרי';
  const fx=M,fy=y+50,fw=CW,fh=1176-fy;const sx=fx+fw-fw*pct/100;
  c.save();rr(c,fx,fy,fw,fh,30);c.clip();
  const okp=photo(c,p,I,fx,fy,fw,fh);
  c.save();c.beginPath();c.rect(fx,fy,sx-fx,fh);c.clip();
  if(okp){c.filter='grayscale(1) contrast(1.25) brightness(1.08)';photo(c,p,I,fx,fy,fw,fh);c.filter='none';c.globalCompositeOperation='multiply';c.fillStyle=MIST;c.fillRect(fx,fy,fw,fh);c.globalCompositeOperation='source-over';c.fillStyle='rgba(7,41,58,.42)';c.fillRect(fx,fy,fw,fh)}
  else{c.fillStyle=NAVY;c.fillRect(fx,fy,fw,fh)}
  grid(c,WHITE,.16,fx,fy,fw,fh,54);c.restore();
  c.restore();
  // handle
  c.fillStyle=WHITE;c.fillRect(sx-3,fy,6,fh);const ky=fy+fh/2;c.save();shadow(c,24,.35,6);c.fillStyle=WHITE;c.beginPath();c.arc(sx,ky,48,0,7);c.fill();c.restore();
  tri(c,sx-18,ky,11,NAVY,'left');c.save();c.translate(sx+18,ky);c.scale(-1,1);tri(c,0,0,11,NAVY,'left');c.restore();
  if(pc){c.save();shadow(c,14,.3,4);const t=clean(pc.v).trim();c.font=AL(700,34);const pw=c.measureText(ISO(t)).width+44;pill(c,t,sx+pw/2,ky-100,{bg:RED,fg:WHITE,size:34,h:62});c.restore()}
  // chips
  const chip=(t,side)=>{const room=side?fx+fw-sx-48:sx-fx-48;if(room<120)return;const ct=one(c,t,room-44,700,30,26);c.save();
    if(side)pill(c,ct.t,fx+fw-24,fy+56,{bg:WHITE,fg:NAVY,size:ct.s,h:54});else pill(c,ct.t,fx+24,fy+56,{left:true,bg:'rgba(7,41,58,.8)',fg:WHITE,size:ct.s,h:54});c.restore()};
  chip(bef,0);chip(aft,1);
  foot(c,false)};
G.FX.L=G.FX.L||{};Object.assign(G.FX.L,L);
})(window);
/*FX15a:END*/
