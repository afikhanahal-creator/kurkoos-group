// where the time goes: boot, first render, view switches, thumbnails
const {chromium}=require('playwright-core');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox']});
const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const p=await ctx.newPage();
await p.addInitScript(()=>{localStorage.setItem('pro_seen','true');localStorage.setItem('ag_v104_done_v1','1');localStorage.setItem('ag_v107_done_v1','1');localStorage.setItem('ag_v110_done_v1','1');
 window.__lt=[];try{new PerformanceObserver(l=>{l.getEntries().forEach(e=>window.__lt.push([Math.round(e.startTime),Math.round(e.duration)]))}).observe({entryTypes:['longtask']})}catch(e){}
 window.__marks={};const t0=performance.now();window.__t0=t0;});
const cdp=await ctx.newCDPSession(p);await cdp.send('Network.enable');let bytes=0;cdp.on('Network.loadingFinished',e=>{bytes+=e.encodedDataLength||0});
const t0=Date.now();await p.goto('http://localhost:8765/t15.html');const nav=Date.now()-t0;
// poll until the app rendered its first view
let ready=null;for(let i=0;i<120;i++){const r=await p.evaluate(()=>{try{return !!(document.querySelector('#appmain .v,#appviews section')&&window.AG===undefined?document.querySelector('#appmain').children.length:1)}catch(e){return false}});if(r){ready=Date.now()-t0;break}await p.waitForTimeout(100)}
await p.waitForTimeout(9000);
const E=s=>p.evaluate(s=>window.__E(s),s);
const info=await p.evaluate(()=>{const nav=performance.getEntriesByType('navigation')[0];const ls=Object.keys(localStorage).map(k=>[k,localStorage.getItem(k).length]).sort((a,b)=>b[1]-a[1]);const tot=ls.reduce((s,x)=>s+x[1],0);
 const lt=window.__lt;const ltTot=lt.reduce((s,x)=>s+x[1],0);return {dom:Math.round(nav.domContentLoadedEventEnd),load:Math.round(nav.loadEventEnd),scriptBytes:document.documentElement.outerHTML.length,ls:ls.slice(0,8),lsTotal:tot,longTasks:lt.length,longTaskMs:ltTot,worst:lt.sort((a,b)=>b[1]-a[1]).slice(0,8),canvases:document.querySelectorAll('canvas').length,imgs:document.images.length,heap:performance.memory&&Math.round(performance.memory.usedJSHeapSize/1048576)}});
const posts=await E(`({posts:AG.posts.length,lib:libKeys().length,tc:(typeof TC!=='undefined'&&TC.size)||null})`);
// view switch timings
const views={};for(const v of ['gallery','queue','calendar','today','templates','agent']){await p.evaluate(()=>{window.__lt.length=0});const t=Date.now();await E(`APP.view='${v}';render()`);await p.waitForTimeout(50);const sync=Date.now()-t;await p.waitForTimeout(1500);views[v]={syncMs:sync,longMs:await p.evaluate(()=>window.__lt.reduce((s,x)=>s+x[1],0)),canvases:await p.evaluate(()=>document.querySelectorAll('#appmain canvas').length)}}
// second load (warm cache): how fast is boot
const t1=Date.now();await p.reload();await p.waitForTimeout(100);let ready2=null;for(let i=0;i<120;i++){const r=await p.evaluate(()=>!!document.querySelector('#appmain')&&document.querySelector('#appmain').children.length>0);if(r){ready2=Date.now()-t1;break}await p.waitForTimeout(100)}
await p.waitForTimeout(6000);const info2=await p.evaluate(()=>({longTaskMs:window.__lt.reduce((s,x)=>s+x[1],0),worst:window.__lt.sort((a,b)=>b[1]-a[1]).slice(0,6)}));
console.log(JSON.stringify({nav,ready,bytes,info,posts,views,ready2,info2},null,1));await b.close()})().catch(e=>{console.error('FATAL',e);process.exit(1)});
