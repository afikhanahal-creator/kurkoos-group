const {chromium}=require('playwright-core');
// interaction latencies on the phone profile, 4x CPU throttle, 1,500 posts
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox']});const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{localStorage.setItem('pro_seen','true');localStorage.setItem('ag_v104_done_v1','1');localStorage.setItem('ag_v107_done_v1','1');localStorage.setItem('ag_v110_done_v2','1')});
await p.goto('http://localhost:8765/t15.html');await p.waitForTimeout(8000);const E=s=>p.evaluate(s=>window.__E(s),s);
await E(`(async()=>{const c=document.createElement('canvas');c.width=1200;c.height=900;const g=c.getContext('2d');g.fillStyle='#8a6';g.fillRect(0,0,1200,900);const url=c.toDataURL('image/jpeg',0.7);const projs=['ramhal','zrubavel','humash','shikmim','mohaliver','bengurion','hankin','henrietta','yordei','general'];
 for(let i=0;i<380;i++){regUpload('fake'+i,{name:'דרייב '+i,project:projs[i%10],kind:i%3?'site':'render',tags:'drive',w:1200,h:900,url,addedAt:new Date().toISOString(),batch:'drive1'})}
 const keys=Object.keys(KC.up).filter(k=>k.startsWith('fake')).map(k=>'u_'+k);await __v113.buildChunked({per:2,keys});saveAgent();return AG.posts.length})()`);
await p.waitForTimeout(3000);
const cdp=await ctx.newCDPSession(p);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
const out={posts:await E('AG.posts.length')};
const timeIt=async(label,code,wait=600)=>{const r=await E(`(async()=>{const L=[];const po=new PerformanceObserver(l=>l.getEntries().forEach(e=>L.push(Math.round(e.duration))));po.observe({entryTypes:['longtask']});const t0=performance.now();${code};const t1=performance.now();await new Promise(r=>setTimeout(r,${wait}));po.disconnect();return {sync:Math.round(t1-t0),longTasks:L}})()`);out[label]=r};
for(const v of ['gallery','calendar','queue','videos','agent','ideas']){await timeIt('view:'+v,`APP.view='${v}';render()`)}
await timeIt('editor open',`const d=AG.posts.find(x=>/^(ed|x)_/.test(x.layout)&&!x.tpl&&peSlots(x).length);peOpen(d)`,1500);
for(const t of ['image','light','shape','check','text']){await timeIt('editor tab:'+t,`PE.tab='${t}';peRender()`,900)}
await timeIt('editor keystroke',`const ta=document.querySelector('#pe-root [data-pe-f="headline"]');ta.value+=' א';ta.dispatchEvent(new Event('input',{bubbles:true}))`,900);
await timeIt('editor close',`peClose(true)`,1200);
await timeIt('gallery viewer open',`APP.view='gallery';render();await new Promise(r=>setTimeout(r,800));const b=document.querySelector('#appviews .gcard, #appviews [data-ga], #appviews .ga-card, #appviews button[data-id]');if(b)b.click()`,1200);
await timeIt('composer open',`const it=APP.sched.items.find(i=>i.at)||APP.sched.items[0];openComposer({it})`,900);
await timeIt('composer save',`await composerSave(APP.cmp.at)`,900);
out.errors=errs.slice(0,3);console.log(JSON.stringify(out));await b.close()})().catch(e=>{console.error('FATAL',e);process.exit(1)});
