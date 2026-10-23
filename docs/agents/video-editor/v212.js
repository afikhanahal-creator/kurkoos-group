/*V212:START*/
// ================= V212 · template engine additions for one to one clones: icon rows, text on an arc, round badges, diagonal
// gradients, a rotation for any element, and the override hook the element inspector writes to (fx.tov[key]: size, weight,
// line height, letter spacing, alignment, outline, shadow, rotation of one element). =================
(()=>{
if(window.__v212)return;window.__v212=1;
const K=window.__tplKit;if(!K){console.warn('v212: no template kit');return}
const {EL,col,A,field,ISO,rr,small,W,H,M}=K;
const heb=s=>/[֐-׿]/.test(String(s||''));
// a small icon set drawn with paths on a 24 unit grid
const ICONS={home:'M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',rooms:'M3 9h18v10H3zM5 9V6h6v3M13 9V6h6v3M3 16h18',area:'M4 4h16v16H4zM8 4v4M12 4v3M16 4v4M4 8h4M4 12h3M4 16h4',pool:'M3 15c2 0 2 2 4 2s2-2 4-2 2 2 4 2 2-2 4-2 2 2 2 2M3 19c2 0 2 2 4 2s2-2 4-2 2 2 4 2 2-2 4-2 2 2 2 2M8 15V5a2 2 0 0 1 4 0M14 15V5a2 2 0 0 1 4 0',parking:'M5 3h9a5 5 0 0 1 0 10H9v8H5z',garden:'M12 21V11M12 11c-5 0-7-4-7-8 4 0 7 2 7 8zM12 13c5 0 7-4 7-8-4 0-7 2-7 8',floors:'M4 20h5v-4h5v-4h5V8',pin:'M12 22s7-6 7-12a7 7 0 1 0-14 0c0 6 7 12 7 12zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5',phone:'M6 3h4l2 5-2.5 1.5a11 11 0 0 0 5 5L16 12l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 4 5a2 2 0 0 1 2-2',calendar:'M4 6h16v15H4zM4 10h16M8 3v5M16 3v5',check:'M4 12l5 5L20 6',star:'M12 3l2.7 6 6.3.6-4.8 4.3 1.5 6.4L12 17l-5.7 3.3 1.5-6.4L3 9.6 9.3 9z',sun:'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1',elevator:'M5 3h14v18H5zM9 8l3-3 3 3M9 16l3 3 3-3',balcony:'M3 12h18v9H3zM6 12v9M10 12v9M14 12v9M18 12v9M5 12V7h14v5',shield:'M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z',doc:'M6 2h8l5 5v15H6zM14 2v5h5M9 13h7M9 17h7',key:'M14 3a6 6 0 1 0 2 11.7L22 21h-4v-3h-3v-3h-2.3A6 6 0 0 0 14 3zM14 7a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3',bed:'M3 18v-7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v7M3 15h18M6 9V6h5v3M13 9V6h5v3M3 18v2M21 18v2',bath:'M4 12h16v3a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM6 12V5a2 2 0 0 1 4 0M6 20v2M18 20v2',car:'M5 17h14l-1-6H6zM4 17v3M20 17v3M7 11l1.5-4h7L17 11M8 14h1M15 14h1',tree:'M12 22v-6M7 16h10l-3-4h2l-4-5h1l-3-4-3 4h1l-4 5h2z',wall:'M3 5h18v14H3zM3 9h18M3 15h18M9 5v4M15 9v6M9 15v4'};
function icon(c,name,x,y,s,color){const d=ICONS[name];if(!d)return;c.save();c.translate(x-s/2,y-s/2);c.scale(s/24,s/24);c.lineWidth=1.8;c.lineCap='round';c.lineJoin='round';c.strokeStyle=color;c.fillStyle='transparent';c.stroke(new Path2D(d));c.restore()}
window.__v212icons=ICONS;
// icons: a row of icon circles with a label under each. Labels come from the post (field, split by | or ·), never invented.
EL.icons=function(ctx,e){const {c,p,t}=ctx;let labels=e.labels;if(!labels){const s=e.f?field(p,e.f):'';labels=String(s||'').split(/\s*[|·]\s*/).map(x=>x.trim()).filter(Boolean)}const names=e.icons||[];const n=Math.min(names.length||labels.length,labels.length||names.length);if(!n)return;
  const w=e.w||W-2*M,x0=e.x!=null?e.x:M,size=e.size||26,r=e.r||size*1.1,cw=w/n;const fg=col(e.fg||e.col||'navy',t),bg=e.bg?col(e.bg,t):null;c.save();
  for(let i=0;i<n;i++){const cx=x0+w-cw*(i+.5);const cy=e.y+r;if(bg){c.beginPath();c.arc(cx,cy,r,0,7);c.fillStyle=bg;c.fill()}if(e.ring){c.beginPath();c.arc(cx,cy,r,0,7);c.strokeStyle=col(e.ring,t);c.lineWidth=e.lw||3;c.stroke()}
   if(names[i])icon(c,names[i],cx,cy,r*1.1,bg?col(e.ifg||'white',t):fg);
   if(labels[i]){c.font=A(e.lw2||700,size*.85);c.fillStyle=fg;c.textAlign='center';c.direction='rtl';c.fillText(ISO(labels[i]),cx,cy+r+size*1.05)}}c.restore()};
// arctext: a short text along a circle, like a round stamp
EL.arctext=function(ctx,e){const {c,p,t}=ctx;const s0=e.text!=null?e.text:field(p,e.f||'label');if(!s0)return;const s=ISO(s0);const size=e.size||26,r=e.r||120,cx=e.cx!=null?e.cx:W/2,cy=e.cy!=null?e.cy:H/2;c.save();c.font=A(e.w||800,size);c.fillStyle=col(e.col||'navy',t);c.textAlign='center';c.textBaseline='middle';
  const chars=[...s];if(heb(s))chars.reverse();const ws=chars.map(ch=>c.measureText(ch).width+(e.track||2));const tot=ws.reduce((a,b)=>a+b,0);const a0=((e.a0!=null?e.a0:-90)*Math.PI/180)-tot/2/r;let acc=0;
  chars.forEach((ch,i)=>{const a=a0+(acc+ws[i]/2)/r;acc+=ws[i];c.save();c.translate(cx+Math.cos(a)*r,cy+Math.sin(a)*r);c.rotate(a+Math.PI/2*(e.inside?-1:1));c.fillText(ch,0,0);c.restore()});c.restore()};
// badge: a circle with one to three centred lines
EL.badge=function(ctx,e){const {c,p,t}=ctx;const r=e.r||110,cx=e.x,cy=e.y;c.save();c.beginPath();c.arc(cx,cy,r,0,7);if(e.bg!=='none'){c.fillStyle=col(e.bg||'red',t);c.fill()}if(e.stroke){c.strokeStyle=col(e.stroke,t);c.lineWidth=e.lw||6;c.stroke()}
  const lines=(e.lines||[]).map(l=>({txt:l.text!=null?l.text:field(p,l.f||'label'),size:l.size||Math.round(r*.3),w:l.w||800,col:col(l.col||e.fg||'white',t)})).filter(l=>l.txt);if(!lines.length){c.restore();return}
  const lh=lines.map(l=>l.size*1.15);const tot=lh.reduce((a,b)=>a+b,0);let y=cy-tot/2;c.textAlign='center';c.textBaseline='middle';c.direction='rtl';
  lines.forEach((l,i)=>{c.font=A(l.w,l.size);c.fillStyle=l.col;c.fillText(ISO(String(l.txt)),cx,y+lh[i]/2);y+=lh[i]});c.restore()};
// dgrad: a gradient at any angle
EL.dgrad=function(ctx,e){const {c,t}=ctx;const a=(e.angle||0)*Math.PI/180;const cx=e.x+e.w/2,cy=e.y+e.h/2,L=Math.hypot(e.w,e.h)/2;const g=c.createLinearGradient(cx-Math.cos(a)*L,cy-Math.sin(a)*L,cx+Math.cos(a)*L,cy+Math.sin(a)*L);g.addColorStop(0,e.from||'rgba(0,0,0,0)');g.addColorStop(1,e.to||'rgba(7,41,58,.8)');c.save();c.fillStyle=g;c.fillRect(e.x,e.y,e.w,e.h);c.restore()};
// the override hook: fx.tov[key] changes one element's spec; rot rotates any element around its own box
const NATROT=new Set(['text','rect']);
if(window.__v50el){const prev=window.__v50el;window.__v50el=function(c,f,e,ix,p){const key=e.t+ix;const ov=p&&p.tov&&p.tov[key];let e2=e,ff=f;
  if(ov&&Object.keys(ov).length){e2=Object.assign({},e,ov);if(ov.size&&e.t==='text'&&e.kind!=='small')e2.min=Math.min(e2.min||24,ov.size);const g=f;ff=x=>g(x||e2)}
  const rot=+e2.rot||0;if(rot&&!NATROT.has(e2.t)&&window.__v50record){const b=window.__v50record(c,()=>ff(),true);if(b&&b.w){const g=ff;ff=x=>{c.save();const cx=b.x+b.w/2,cy=b.y+b.h/2;c.translate(cx,cy);c.rotate(rot*Math.PI/180);c.translate(-cx,-cy);g(x);c.restore()}}}
  return prev.call(this,c,ff,e2,ix,p)}}
window.__v212={icon,ICONS};
})();
/*V212:END*/
