const {chromium}=require('playwright-core');(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox']});const out={};
for(const [tag,vp] of [['d',{width:1500,height:900}],['p',{width:390,height:844}]]){const p=await b.newPage({viewport:vp,isMobile:tag==='p'});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>localStorage.setItem('pro_seen','true'));await p.goto('http://localhost:8765/t15.html');await p.waitForTimeout(7000);const E=s=>p.evaluate(s=>window.__E(s),s);const o=out[tag]={};
// posts gallery
await E(`APP.view='gallery';render()`);await p.waitForTimeout(1500);
const c0=await p.evaluate(()=>document.querySelectorAll('.ga-card').length);
for(let i=0;i<6;i++){await p.evaluate(()=>{const m=document.getElementById('appmain')||document.scrollingElement;m.scrollTop=m.scrollHeight;window.scrollTo(0,document.body.scrollHeight)});await p.waitForTimeout(900)}
o.gallery=[c0,await p.evaluate(()=>document.querySelectorAll('.ga-card').length)];
// full-screen templates
await E(`(()=>{const q=AG.posts.find(p=>/^(ed|x)_/.test(p.layout));peOpen(q);window.__v66open()})()`);await p.waitForTimeout(2000);
const t0=await p.evaluate(()=>document.querySelectorAll('#v66tp [data-v66k]').length);
for(let i=0;i<6;i++){await p.evaluate(()=>{document.querySelectorAll('#v66tp *').forEach(el=>{const s=getComputedStyle(el).overflowY;if((s==='auto'||s==='scroll')&&el.scrollHeight>el.clientHeight)el.scrollTop=el.scrollHeight})});await p.waitForTimeout(900)}
o.templates=[t0,await p.evaluate(()=>document.querySelectorAll('#v66tp [data-v66k]').length)];
o.errors=errs.slice(0,3);await p.close()}
console.log(JSON.stringify(out));await b.close()})();
