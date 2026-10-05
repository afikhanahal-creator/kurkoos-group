const {chromium}=require('playwright-core');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox']});
const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const p=await ctx.newPage();
await p.addInitScript(()=>{localStorage.setItem('pro_seen','true');localStorage.setItem('ag_v104_done_v1','1');localStorage.setItem('ag_v107_done_v1','1');localStorage.setItem('ag_v110_done_v1','1')});
const cdp=await ctx.newCDPSession(p);await cdp.send('Network.enable');const req={};cdp.on('Network.requestWillBeSent',e=>{req[e.requestId]={url:e.request.url,type:e.type}});cdp.on('Network.loadingFinished',e=>{if(req[e.requestId])req[e.requestId].bytes=e.encodedDataLength});
await p.goto('http://localhost:8765/t15.html');await p.waitForTimeout(9000);
const list=Object.values(req).filter(r=>r.bytes).sort((a,b)=>b.bytes-a.bytes);const byType={};list.forEach(r=>{byType[r.type]=(byType[r.type]||0)+r.bytes});
console.log(JSON.stringify({count:list.length,byType,top:list.slice(0,14).map(r=>[r.type,Math.round(r.bytes/1024)+'k',r.url.replace('http://localhost:8765/','').slice(0,90)])},null,1));
// how long do 60 gallery thumbnails take to paint, cold vs warm
const E=s=>p.evaluate(s=>window.__E(s),s);
const t=await E(`(async()=>{const ps=AG.posts.slice(0,40);const cv=document.createElement('canvas');let t0=performance.now();for(const p of ps){await ensureImgs(p);thumb(cv,p,0)}const cold=performance.now()-t0;t0=performance.now();for(const p of ps)thumb(cv,p,0);const warm=performance.now()-t0;t0=performance.now();for(const p of ps){bigOf(p,0)}const big=performance.now()-t0;return {cold:Math.round(cold),warm:Math.round(warm),bigOnly:Math.round(big),tc:TC.size}})()`);
console.log('thumb40',JSON.stringify(t));
const s=await E(`(()=>{let t0=performance.now();saveAgent();const a=performance.now()-t0;t0=performance.now();const w=lsGet('pro_wf',{});const b=performance.now()-t0;const n=Object.keys(w).length;let ver=0,maxv=0;Object.values(w).forEach(x=>{const v=(x&&x.versions||x&&x.hist||[]).length;ver+=v;maxv=Math.max(maxv,v)});return {saveAgentMs:Math.round(a),wfParseMs:Math.round(b),wfKeys:n,versions:ver,maxVersionsPerPost:maxv,sampleKeys:Object.keys(Object.values(w)[0]||{})}})()`);
console.log('storage',JSON.stringify(s));await b.close()})().catch(e=>{console.error('FATAL',e);process.exit(1)});
