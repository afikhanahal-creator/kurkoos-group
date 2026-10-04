// ================= V125 · elements from the video studio kit (video-studio skill, remotion-kit) in every post image:
//                   marker arrows and hand-drawn circles, step progress bars, sparkles and brand confetti, light leaks,
//                   colour washes and vignettes, label stickers; and the kit's colour "looks" as lighting presets =================
(function(){
const X=window.__v46x,DC=window.DECO;if(!X||!DC)return;
const D=X.D,W=1080,H=1350,M=72;const have=new Set(D.map(d=>d.id));
DC.cats.studio='אלמנטים מהסטודיו';if(X.CATS&&X.CATS!==DC.cats)X.CATS.studio='אלמנטים מהסטודיו';
function add(id,name,fn,area,col,pos,fam){if(have.has(id))return;have.add(id);D.push({id,cat:'studio',name,fn,area,col,pos,fam})}
const COLS={red:'אדום',white:'לבן',navy:'כחול לילה',mist:'תכלת'};
const P={tr:[W*.76,H*.2],tl:[W*.24,H*.2],br:[W*.76,H*.8],bl:[W*.24,H*.8]};
const PN={tr:'מימין למעלה',tl:'משמאל למעלה',br:'מימין למטה',bl:'משמאל למטה',mid:'במרכז',top:'למעלה',under:'מתחת לכותרת',bot:'למטה'};
// 1. marker arrow (kit Arrow): a curved marker stroke ending in an open head, pointing toward the centre
function arrow(c,C,x,y,ang,len){const sw=16;c.save();c.translate(x,y);c.rotate(ang);c.strokeStyle=C;c.lineWidth=sw;c.lineCap='round';c.lineJoin='round';
 c.beginPath();c.moveTo(-len,len*.12);c.quadraticCurveTo(-len*.5,-len*.18,0,0);c.stroke();c.beginPath();c.moveTo(-len*.22,-len*.16);c.lineTo(0,0);c.lineTo(-len*.2,len*.17);c.stroke();c.restore()}
Object.entries(P).forEach(([k,[x,y]])=>{const ang=Math.atan2(H*.5-y,W*.5-x);[[200,'קצר'],[300,'ארוך']].forEach(([len,ln])=>Object.keys(COLS).forEach(cl=>add(`v125_arrow_${k}_${len}_${cl}`,`חץ מרקר ${ln} ${PN[k]}`,(c,C)=>arrow(c,C,x+Math.cos(ang)*len*.55,y+Math.sin(ang)*len*.55,ang,len),[k,len],cl,k,'arrow')))});
// 2. hand-drawn circle (kit Circle): an ellipse that overshoots its start by 15%
function ring(c,C,cx,cy,rx,ry,sw){c.save();c.strokeStyle=C;c.lineWidth=sw;c.lineCap='round';c.beginPath();for(let i=0;i<=64;i++){const t=i/64*Math.PI*2*1.15-Math.PI*.6;const wob=1+Math.sin(t*3)*.03;const px=cx+Math.cos(t)*rx*wob,py=cy+Math.sin(t)*ry*wob;i?c.lineTo(px,py):c.moveTo(px,py)}c.stroke();c.restore()}
const RINGS={mid:[W/2,H*.5,W*.34,H*.12],top:[W/2,H*.28,W*.38,H*.1],under:[W/2,H*.62,W*.4,H*.09],bot:[W/2,H*.8,W*.36,H*.08]};
Object.entries(RINGS).forEach(([k,[cx,cy,rx,ry]])=>[[10,'דק'],[16,'עבה']].forEach(([sw,sn])=>Object.keys(COLS).forEach(cl=>add(`v125_ring_${k}_${sw}_${cl}`,`עיגול מרקר ${sn} ${PN[k]}`,(c,C)=>ring(c,C,cx,cy,rx,ry,sw),['mid',rx*2],cl,k,'ring'))));
// 3. step progress bar (kit ProgressBar, static): fills right to left, like Hebrew reading
[1,2,3,4,5].forEach(n=>['top','bot'].forEach(k=>Object.keys(COLS).forEach(cl=>add(`v125_prog_${k}_${n}_${cl}`,`סרגל התקדמות: שלב ${n} מתוך 5 · ${PN[k]}`,(c,C)=>{const y=k==='top'?M-28:H-M+14,w=W-2*M,g=10,sw=(w-g*4)/5,h=12;c.save();for(let i=0;i<5;i++){const x=W-M-(i+1)*sw-i*g;c.globalAlpha=i<n?1:.22;c.fillStyle=C;c.beginPath();c.roundRect?c.roundRect(x,y,sw,h,6):c.rect(x,y,sw,h);c.fill()}c.restore()},[k,W],cl,k,'prog'))));
// 4. sparkles and brand confetti (kit Burst, frozen mid-flight), from a corner
const rnd=s=>()=>(s=(s*16807)%2147483647)/2147483647;
function star(c,x,y,r){c.beginPath();for(let i=0;i<8;i++){const a=Math.PI/4*i-Math.PI/2,rr=i%2?r*.28:r;const px=x+Math.cos(a)*rr,py=y+Math.sin(a)*rr;i?c.lineTo(px,py):c.moveTo(px,py)}c.closePath();c.fill()}
const BRAND=['#a90b0c','#07293a','#105572','#8fb6c8','#ffffff'];
Object.entries(P).forEach(([k,[x0,y0]])=>{
 Object.keys(COLS).forEach(cl=>add(`v125_spark_${k}_${cl}`,`ניצוצות ${PN[k]}`,(c,C)=>{const r=rnd(17+x0+y0);c.save();c.fillStyle=C;for(let i=0;i<9;i++){const a=r()*Math.PI*2,d=40+r()*170;star(c,x0+Math.cos(a)*d,y0+Math.sin(a)*d,10+r()*26)}c.restore()},[k,360],cl,k,'spark'));
 add(`v125_conf_${k}`,`קונפטי בצבעי המותג ${PN[k]}`,(c)=>{const r=rnd(29+x0*3+y0);c.save();for(let i=0;i<46;i++){const a=r()*Math.PI*2,d=30+r()*230;const x=x0+Math.cos(a)*d,y=y0+Math.sin(a)*d;c.translate(x,y);c.rotate(r()*Math.PI);c.fillStyle=BRAND[i%BRAND.length];c.fillRect(-9,-4,18,8);c.setTransform(1,0,0,1,0,0)}c.restore()},[k,460],'auto',k,'conf')});
// 5. light leak (kit LightLeak): a warm glow screened over a corner
Object.entries({tr:[W,0],tl:[0,0],br:[W,H],bl:[0,H]}).forEach(([k,[x,y]])=>[['warm','חם',[255,170,90]],['gold','זהב',[255,212,122]],['mist','תכלת',[143,182,200]]].forEach(([tk,tn,rgb])=>add(`v125_leak_${k}_${tk}`,`הארת אור ${tn} ${PN[k]}`,(c)=>{c.save();c.globalCompositeOperation='screen';const g=c.createRadialGradient(x,y,0,x,y,W*.85);g.addColorStop(0,`rgba(${rgb},.75)`);g.addColorStop(.45,`rgba(${rgb},.28)`);g.addColorStop(1,`rgba(${rgb},0)`);c.fillStyle=g;c.fillRect(0,0,W,H);c.restore()},['all',W],'auto',k,'leak')));
// 6. colour wash and vignette (kit Wash, Vignette)
[['navy','כחול לילה','#07293a'],['red','אדום קורקוס','#a90b0c'],['teal','טורקיז','#105572']].forEach(([k,n,hex])=>add(`v125_wash_${k}`,`שטיפת צבע ${n}`,(c)=>{c.save();c.globalCompositeOperation='multiply';c.globalAlpha=.32;c.fillStyle=hex;c.fillRect(0,0,W,H);c.restore()},['all',W],'auto','all','wash'));
[['s',.35,'עדין'],['l',.6,'חזק']].forEach(([k,a,n])=>add(`v125_vig_${k}`,`וינייט ${n}`,(c)=>{c.save();const g=c.createRadialGradient(W/2,H/2,H*.28,W/2,H/2,H*.75);g.addColorStop(0,'rgba(7,41,58,0)');g.addColorStop(1,`rgba(7,41,58,${a})`);c.fillStyle=g;c.fillRect(0,0,W,H);c.restore()},['all',W],'auto','all','vig'));
// 7. label stickers (kit Callout as a sticker): one word, brand type, a slight tilt
const WORDS=['חדש','לפני','אחרי','בבנייה','נמסר','למכירה','טיפ','שאלה'];
function sticker(c,C,word,x,y,tilt){c.save();c.translate(x,y);c.rotate(tilt);c.font='900 54px Heebo, Almoni, sans-serif';c.direction='rtl';const w=c.measureText(word).width+60,h=88;const dark=C==='#ffffff'||C==='#fff'||/mist|8fb6c8/i.test(C);
 c.fillStyle=C;c.beginPath();c.roundRect?c.roundRect(-w/2,-h/2,w,h,22):c.rect(-w/2,-h/2,w,h);c.fill();c.lineWidth=5;c.strokeStyle=dark?'#a90b0c':'#ffffff';c.stroke();
 c.fillStyle=dark?'#07293a':'#ffffff';c.textAlign='center';c.textBaseline='middle';c.fillText(word,0,4);c.restore()}
WORDS.forEach((wd,wi)=>Object.entries({tr:[W-M-120,M+150,-.07],tl:[M+120,M+150,.07],br:[W-M-120,H-M-170,.06],bl:[M+120,H-M-170,-.06]}).forEach(([k,[x,y,t]])=>Object.keys(COLS).forEach(cl=>add(`v125_tag_${wi}_${k}_${cl}`,`מדבקה "${wd}" ${PN[k]}`,(c,C)=>sticker(c,C,wd,x,y,t),[k,300],cl,k,'tag'))));
// 8. the kit's colour looks as lighting presets (mapped onto the editor's adjustment scale)
try{if(typeof PE_PRE!=='undefined'&&Array.isArray(PE_PRE)&&!PE_PRE.some(p=>p[0]==='קולנועי')){PE_PRE.push(
 ['טבעי חד',{c:4,s:4}],['פאנצ\'י',{c:12,s:12,b:-3}],['קולנועי',{c:12,s:-14,w:8,b:-4,v:40}],['וינטג\'',{s:-28,w:16,c:-8,b:7,v:45}],['ניאון',{c:10,s:12,w:-12,v:35}],['שחור לבן דרמטי',{mono:1,c:20,b:-5,v:35}])}}catch(e){console.warn('v125 looks',e)}
window.__v125={count:D.filter(d=>d.cat==='studio').length};
})();
