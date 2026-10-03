// CPU profile of boot on the phone profile: top self-time functions by name and line
const {chromium}=require('playwright-core');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox']});
const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const p=await ctx.newPage();
await p.addInitScript(()=>{localStorage.setItem('pro_seen','true');localStorage.setItem('ag_v104_done_v1','1');localStorage.setItem('ag_v107_done_v1','1');localStorage.setItem('ag_v110_done_v1','1')});
const cdp=await ctx.newCDPSession(p);await cdp.send('Profiler.enable');await cdp.send('Profiler.setSamplingInterval',{interval:500});await cdp.send('Profiler.start');
await p.goto('http://localhost:8765/t15.html');await p.waitForTimeout(12000);
const {profile}=await cdp.send('Profiler.stop');
const dt=profile.timeDeltas;const byId=new Map(profile.nodes.map(n=>[n.id,n]));const self=new Map();
profile.samples.forEach((id,i)=>{const n=byId.get(id);const cf=n.callFrame;const k=(cf.functionName||'(anon)')+' @'+(cf.url||'').split('/').pop()+':'+(cf.lineNumber+1);self.set(k,(self.get(k)||0)+(dt[i]||0))});
const total=[...self.values()].reduce((a,b)=>a+b,0);const top=[...self.entries()].sort((a,b)=>b[1]-a[1]).slice(0,40).map(([k,v])=>[Math.round(v/1000),k]);
// also attribute by caller chain for anonymous: parent function names
const parent=new Map();profile.nodes.forEach(n=>(n.children||[]).forEach(c=>parent.set(c,n.id)));
const byTop=new Map();profile.samples.forEach((id,i)=>{let n=byId.get(id);let name=null;let hops=0;while(n&&hops<12){const cf=n.callFrame;if(cf.functionName&&!/^(anon|\(anon\)|forEach|map|filter|reduce|then|Promise|get|set)$/.test(cf.functionName)&&cf.lineNumber>0){name=cf.functionName+':'+(cf.lineNumber+1);break}const pid=parent.get(n.id);n=pid?byId.get(pid):null;hops++}byTop.set(name||'(root/idle/gc)',(byTop.get(name||'(root/idle/gc)')||0)+(dt[i]||0))});
const top2=[...byTop.entries()].sort((a,b)=>b[1]-a[1]).slice(0,30).map(([k,v])=>[Math.round(v/1000),k]);
console.log('total ms',Math.round(total/1000));console.log('SELF',JSON.stringify(top));console.log('BYNAMED',JSON.stringify(top2));await b.close()})().catch(e=>{console.error('FATAL',e);process.exit(1)});
