const {chromium}=require('playwright-core');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox']});const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const p=await ctx.newPage();
await p.addInitScript(()=>{localStorage.setItem('pro_seen','true');localStorage.setItem('ag_v104_done_v1','1');localStorage.setItem('ag_v107_done_v1','1');localStorage.setItem('ag_v110_done_v2','1')});
await p.goto('http://localhost:8765/t15.html');await p.waitForTimeout(8000);const E=s=>p.evaluate(s=>window.__E(s),s);
await E(`(async()=>{const c=document.createElement('canvas');c.width=1200;c.height=900;const g=c.getContext('2d');g.fillStyle='#8a6';g.fillRect(0,0,1200,900);const url=c.toDataURL('image/jpeg',0.7);const projs=['ramhal','zrubavel','humash','shikmim','mohaliver','bengurion','hankin','henrietta','yordei','general'];
 for(let i=0;i<380;i++){regUpload('fake'+i,{name:'דרייב '+i,project:projs[i%10],kind:i%3?'site':'render',tags:'drive',w:1200,h:900,url,addedAt:new Date().toISOString(),batch:'drive1'})}
 const keys=Object.keys(KC.up).filter(k=>k.startsWith('fake')).map(k=>'u_'+k);await __v113.buildChunked({per:2,keys});saveAgent();return AG.posts.length})()`);
await p.waitForTimeout(4000);
const cdp=await ctx.newCDPSession(p);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});await cdp.send('Profiler.enable');await cdp.send('Profiler.setSamplingInterval',{interval:300});
async function prof(label,code){await cdp.send('Profiler.start');const ms=await E(`(()=>{const t0=performance.now();${code};return Math.round(performance.now()-t0)})()`);const {profile}=await cdp.send('Profiler.stop');
 const byId={};profile.nodes.forEach(x=>byId[x.id]=x);const parent={};profile.nodes.forEach(x=>(x.children||[]).forEach(c=>parent[c]=x.id));const cnt={};profile.samples.forEach((id,i)=>{cnt[id]=(cnt[id]||0)+(profile.timeDeltas[i]||0)});
 const self={},incl={};Object.entries(cnt).forEach(([id,us])=>{const cf=byId[id].callFrame;const k=(cf.functionName||'(anon)')+' @'+cf.lineNumber;self[k]=(self[k]||0)+us;const seen=new Set();let cur=+id;while(cur){const c2=byId[cur].callFrame;const k2=(c2.functionName||'(anon)')+' @'+c2.lineNumber;if(!seen.has(k2)){seen.add(k2);incl[k2]=(incl[k2]||0)+us}cur=parent[cur]}});
 const top=(o,n)=>Object.entries(o).filter(([k])=>!/^\((program|idle|root|garbage)|^\(anon\) @0$|^evaluate|^window\.__E/.test(k)).sort((a,b)=>b[1]-a[1]).slice(0,n).map(([k,v])=>k+' '+Math.round(v/1000));
 console.log('=== '+label+' sync '+ms+'ms\n self: '+top(self,14).join(' | ')+'\n incl: '+top(incl,26).join(' | '))}
await prof('gallery',`APP.view='gallery';render()`);
await prof('agent',`APP.view='agent';render()`);
await prof('ideas',`APP.view='ideas';render()`);
await E(`APP.view='gallery';render()`);await p.waitForTimeout(1500);
await prof('viewer open',`const b=document.querySelector('#appviews .gcard, #appviews [data-ga], #appviews .ga-card, #appviews button[data-id]');if(b)b.click()`);
await E(`try{GA.lb=null;gaLbRender()}catch(e){}`);
await prof('editor open',`const d=AG.posts.find(x=>/^(ed|x)_/.test(x.layout)&&!x.tpl&&peSlots(x).length);peOpen(d)`);await p.waitForTimeout(1500);
await prof('editor close',`peClose(true)`);
await b.close()})().catch(e=>{console.error('FATAL',e);process.exit(1)});
