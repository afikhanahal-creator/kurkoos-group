const {chromium}=require('playwright-core');const fs=require('fs');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox']});
const ctx=await b.newContext({viewport:{width:1366,height:900}});const p=await ctx.newPage();
await p.addInitScript(()=>{localStorage.setItem('pro_seen','true')});await p.goto('http://localhost:8765/t15.html');await p.waitForTimeout(12000);
const res=await p.evaluate(()=>window.__E(`(async()=>{const PR=CanvasRenderingContext2D.prototype;const ODI=PR.drawImage;const OFR=PR.fillRect;let draws=[];window.__barCalls=0;if(window.FX4H&&FX4H.barRects&&!FX4H.__w){const ob=FX4H.barRects;FX4H.barRects=function(){window.__barCalls++;return ob.apply(this,arguments)};FX4H.__w=1}
 const isLogo=im=>{const L=window.__lockIM||{};return im===L.white||im===L.black||(im&&im.tagName==='CANVAS'&&im.width===(L.black&&L.black.naturalWidth)&&im.height===(L.black&&L.black.naturalHeight))};
 PR.drawImage=function(im){if(isLogo(im)){const a=arguments;draws.push(a.length>=9?[a[5],a[6],a[7],a[8]]:[a[1],a[2],a[3],a[4]])}return ODI.apply(this,arguments)};
 const out=[];for(const q of AG.posts){draws=[];const mk0=window.__barCalls||0;try{await ensureImgs(q);peCanvas(q,0)}catch(e){out.push({id:q.id,layout:q.layout,err:String(e).slice(0,60)});continue}
   const mk=(window.__barCalls||0)-mk0;const pos=draws.map(d=>d.map(v=>Math.round(v)).join(','));
   if(draws.length!==1||mk)out.push({id:q.id,layout:q.layout,n:draws.length,bars:mk,pos,logo:q.fx&&q.fx.logo,cfg:q.fx&&q.fx.logoCfg,objs:(q.fx&&q.fx.objs||[]).map(o=>o.type).join('/')})}
 PR.drawImage=ODI;return JSON.stringify({total:AG.posts.length,bad:out})})()`));
const r=JSON.parse(res);console.log('posts',r.total,'with logo count != 1 or bars mark:',r.bad.length);r.bad.slice(0,40).forEach(x=>console.log(JSON.stringify(x)));fs.writeFileSync('logoaudit.json',JSON.stringify(r));
await b.close()})();
