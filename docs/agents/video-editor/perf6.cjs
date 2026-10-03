// the clarity gate on a second visit: verdicts persisted, boot long tasks drop
const {chromium}=require('playwright-core');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox']});
const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const p=await ctx.newPage();
await p.addInitScript(()=>{localStorage.setItem('pro_seen','true');localStorage.setItem('ag_v104_done_v1','1');localStorage.setItem('ag_v107_done_v1','1');localStorage.setItem('ag_v110_done_v1','1');window.__lt=[];try{new PerformanceObserver(l=>{l.getEntries().forEach(e=>window.__lt.push(Math.round(e.duration)))}).observe({entryTypes:['longtask']})}catch(e){}});
const E=s=>p.evaluate(s=>window.__E(s),s);const out={};
await p.goto('http://localhost:8765/t15.html');
// wait for the first full pass to finish (every post gets _ovk), up to 150 s
let done=false;for(let i=0;i<150;i++){await p.waitForTimeout(1000);const r=await E(`AG.posts.filter(p=>p._ovk===__v113.sig(p)).length+'/'+AG.posts.length`);if(i%15===0)console.log('pass',i,r);if(r.split('/')[0]===r.split('/')[1]){done=true;out.firstPassSec=i;break}}
await p.waitForTimeout(2500);out.persisted=await p.evaluate(()=>{const v=localStorage.getItem('v73_ok_v1');return v?Object.keys(JSON.parse(v)).length:0});
out.firstBootLongMs=await p.evaluate(()=>window.__lt.reduce((a,b)=>a+b,0));
// second visit
await p.evaluate(()=>{window.__lt.length=0});await p.reload();await p.waitForTimeout(15000);
out.second={seeded:await E(`AG.posts.filter(p=>p._ovk).length`),longMs:await p.evaluate(()=>window.__lt.reduce((a,b)=>a+b,0)),worst:await p.evaluate(()=>window.__lt.sort((a,b)=>b-a).slice(0,5))};
console.log(JSON.stringify(out));await b.close()})().catch(e=>{console.error('FATAL',e);process.exit(1)});
