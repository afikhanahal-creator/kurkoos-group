// Render every post and every loaded template; flag flat (non photo) colours that are not brand colours or blends of them.
const {chromium}=require('playwright-core');const fs=require('fs');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox']});
const ctx=await b.newContext({viewport:{width:1366,height:900}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{localStorage.setItem('pro_seen','true');localStorage.setItem('ag_v92_show','true')});await p.goto('http://localhost:8765/t15.html');await p.waitForTimeout(12000);
const mode=process.argv[2]||'posts';const lim=+(process.argv[3]||9999);const noimg=process.argv[4]==='noimg';const off=+(process.argv[5]||0);
const res=await p.evaluate(src=>window.__E(src),`(async()=>{const mode=${JSON.stringify(mode)},lim=${lim},noimg=${noimg},off=${off};
 const PAL=[[7,41,58],[169,11,12],[16,85,114],[143,182,200],[219,232,238],[244,246,248],[247,248,250],[255,255,255],[11,31,42],[53,80,94],[91,100,114],[0,0,0]];
 const near=(r,g,b)=>{let best=1e9;for(const q of PAL){const d=Math.abs(r-q[0])+Math.abs(g-q[1])+Math.abs(b-q[2]);if(d<best)best=d}
   // blends: palette colour over white, navy or black (alpha overlays and fades)
   for(const q of PAL)for(const base of [[255,255,255],[7,41,58],[0,0,0],[11,31,42]]){const t=(()=>{const dr=q[0]-base[0],dg=q[1]-base[1],db=q[2]-base[2];const n=dr*dr+dg*dg+db*db;if(!n)return 0;return Math.max(0,Math.min(1,((r-base[0])*dr+(g-base[1])*dg+(b-base[2])*db)/n))})();
     const d=Math.abs(r-(base[0]+(q[0]-base[0])*t))+Math.abs(g-(base[1]+(q[1]-base[1])*t))+Math.abs(b-(base[2]+(q[2]-base[2])*t));if(d<best)best=d}
   return best};
 const items=[];
 if(mode==='posts'){for(const x of AG.posts.slice(off,off+lim))items.push({id:x.id,layout:x.layout,theme:x.fx&&x.fx.theme,p:x})}
 else{const d=AG.posts.find(x=>/^(ed|x)_/.test(x.layout)&&!x.tpl&&peSlots(x).length);const ids=TPL.specs.filter(s=>mode==='all'||s[mode]).map(s=>s.id).slice(off,off+lim);for(const id of ids){const q=clonePost(d);try{peConvert(q,id)}catch(e){continue}items.push({id,layout:id,p:q})}}
 const PRC=CanvasRenderingContext2D.prototype;const ODI=PRC.drawImage;if(noimg){PRC.drawImage=function(img){const a=arguments;if(img&&img.tagName==='CANVAS')return ODI.apply(this,a);let x,y,w,h;if(a.length>=9){x=a[5];y=a[6];w=a[7];h=a[8]}else if(a.length>=5){x=a[1];y=a[2];w=a[3];h=a[4]}else{x=a[1];y=a[2];w=img.width||100;h=img.height||100}this.save();this.fillStyle='#8fb6c8';this.fillRect(x,y,w,h);this.restore()}}
 const out=[];const sm=document.createElement('canvas');sm.width=270;sm.height=338;const sx=sm.getContext('2d',{willReadFrequently:true});
 for(const it of items){let c;try{if(!noimg)await ensureImgs(it.p);c=peCanvas(it.p,0)}catch(e){out.push({id:it.id,err:String(e).slice(0,80)});continue}
  sx.drawImage(c,0,0,270,338);const d=sx.getImageData(0,0,270,338).data;const W=270;let flat=0,off=0;const offc={};
  for(let y=1;y<337;y++)for(let x=1;x<269;x++){const i=(y*W+x)*4;const r=d[i],g=d[i+1],bl=d[i+2];let ok=true;
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const j=((y+dy)*W+x+dx)*4;if(Math.abs(d[j]-r)+Math.abs(d[j+1]-g)+Math.abs(d[j+2]-bl)>6){ok=false;break}}
    if(!ok)continue;flat++;const dd=near(r,g,bl);if(dd>36){off++;const k=((r>>4)<<8|(g>>4)<<4|(bl>>4));offc[k]=(offc[k]||0)+1}}
  const top=Object.entries(offc).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([k,v])=>{k=+k;return '#'+[(k>>8)&15,(k>>4)&15,k&15].map(h=>(h*17).toString(16).padStart(2,'0')).join('')+':'+Math.round(100*v/flat)+'%'});
  out.push({id:it.id,layout:it.layout,theme:it.theme,flat,offPct:Math.round(1000*off/Math.max(1,flat))/10,top})}
 PRC.drawImage=ODI;return JSON.stringify(out)})()`);
const out=JSON.parse(res);fs.writeFileSync('palaudit_'+mode+(noimg?'_noimg':'')+off+'.json',JSON.stringify(out));
const bad=out.filter(o=>o.offPct>=1.5);console.log(mode,'rendered',out.length,'off palette >=1.5%:',bad.length,'errors',out.filter(o=>o.err).length);
bad.sort((a,b)=>b.offPct-a.offPct).slice(0,25).forEach(o=>console.log(o.id,o.layout,o.theme||'',o.offPct+'%',o.top.join(' ')));console.log(errs.slice(0,2));await b.close()})();
