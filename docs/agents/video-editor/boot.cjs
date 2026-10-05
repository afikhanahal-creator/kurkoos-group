const {chromium}=require('playwright-core');
// boot profile on the phone profile, 4x CPU throttle, storage seeded with 1,500 posts + 380 drive photos
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox']});const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const p=await ctx.newPage();
await p.addInitScript(()=>{localStorage.setItem('pro_seen','true');localStorage.setItem('ag_v104_done_v1','1');localStorage.setItem('ag_v107_done_v1','1');localStorage.setItem('ag_v110_done_v2','1')});
await p.goto('http://localhost:8765/t15.html');await p.waitForTimeout(8000);const E=s=>p.evaluate(s=>window.__E(s),s);
await E(`(async()=>{const c=document.createElement('canvas');c.width=1200;c.height=900;const g=c.getContext('2d');g.fillStyle='#8a6';g.fillRect(0,0,1200,900);const url=c.toDataURL('image/jpeg',0.7);const projs=['ramhal','zrubavel','humash','shikmim','mohaliver','bengurion','hankin','henrietta','yordei','general'];
 for(let i=0;i<380;i++){regUpload('fake'+i,{name:'דרייב '+i,project:projs[i%10],kind:i%3?'site':'render',tags:'drive',w:1200,h:900,url,addedAt:new Date().toISOString(),batch:'drive1'})}
 const keys=Object.keys(KC.up).filter(k=>k.startsWith('fake')).map(k=>'u_'+k);await __v113.buildChunked({per:2,keys});saveAgent();__lsFlush&&__lsFlush();return AG.posts.length})()`);
const seeded=await E('AG.posts.length');
// the fake photos are not in the library after reload (no db), so keep their meta in localStorage like real uploads would be? real uploads live in the db; skip.
const cdp=await ctx.newCDPSession(p);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
await cdp.send('Profiler.enable');await cdp.send('Profiler.setSamplingInterval',{interval:1000});
await p.addInitScript(()=>{window.__LT=[];window.__T0=performance.now();try{new PerformanceObserver(l=>l.getEntries().forEach(e=>window.__LT.push([Math.round(e.startTime),Math.round(e.duration)]))).observe({entryTypes:['longtask']})}catch(e){}
 document.addEventListener('DOMContentLoaded',()=>{window.__DCL=performance.now()});window.addEventListener('load',()=>{window.__LOAD=performance.now()})});
await cdp.send('Profiler.start');const t0=Date.now();await p.reload({waitUntil:'load'});await p.waitForTimeout(14000);const {profile}=await cdp.send('Profiler.stop');
const m=await p.evaluate(()=>({dcl:Math.round(window.__DCL||0),load:Math.round(window.__LOAD||0),longTasks:window.__LT,ltTotal:window.__LT.reduce((a,x)=>a+x[1],0),posts:window.__E?window.__E('AG.posts.length'):null,view:window.__E?window.__E('APP.view'):null,cards:document.querySelectorAll('canvas').length}));
console.log('seeded',seeded);console.log(JSON.stringify(m));
// aggregate profile: inclusive per function with line
const byId={};profile.nodes.forEach(n=>byId[n.id]=n);const parent={};profile.nodes.forEach(n=>(n.children||[]).forEach(c=>parent[c]=n.id));const cnt={};profile.samples.forEach((id,i)=>{cnt[id]=(cnt[id]||0)+(profile.timeDeltas[i]||0)});
const self={},incl={};Object.entries(cnt).forEach(([id,us])=>{const cf=byId[id].callFrame;const k=(cf.functionName||'(anon)')+' @'+cf.lineNumber;self[k]=(self[k]||0)+us;const seen=new Set();let cur=+id;while(cur){const c2=byId[cur].callFrame;const k2=(c2.functionName||'(anon)')+' @'+c2.lineNumber;if(!seen.has(k2)){seen.add(k2);incl[k2]=(incl[k2]||0)+us}cur=parent[cur]}});
const top=o=>Object.entries(o).sort((a,b)=>b[1]-a[1]).slice(0,22).map(([k,v])=>k+' '+Math.round(v/1000)+'ms');
console.log('=== self');console.log(top(self).join('\n'));console.log('=== inclusive');console.log(top(incl).join('\n'));
await b.close()})().catch(e=>{console.error('FATAL',e);process.exit(1)});
