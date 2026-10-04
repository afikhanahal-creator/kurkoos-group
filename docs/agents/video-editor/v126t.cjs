const {chromium}=require('playwright-core');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox']});const out={};
for(const mob of [false,true]){const ctx=await b.newContext(mob?{viewport:{width:390,height:844},isMobile:true,hasTouch:true}:{viewport:{width:1440,height:900}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{localStorage.setItem('pro_seen','true');localStorage.setItem('ag_v104_done_v1','1');localStorage.setItem('ag_v107_done_v1','1');localStorage.setItem('ag_v110_done_v2','1')});
await p.goto('http://localhost:8765/t15.html');await p.waitForTimeout(7000);const E=s=>p.evaluate(s=>window.__E(s),s);const o=out[mob?'phone':'desktop']={};
await E(`APP.view='videos';render()`);await p.waitForTimeout(1200);
o.panel=await p.evaluate(()=>{const s=document.getElementById('v126');return s?{after:s.previousElementSibling&&s.previousElementSibling.className,steps:s.querySelector('.v126f b').textContent,w:Math.round(s.getBoundingClientRect().width),over:document.documentElement.scrollWidth-innerWidth}:null});
await p.evaluate(()=>{document.querySelector('#v126 button[data-v126="captions"][data-val="kinetic"]').click()});await p.waitForTimeout(200);
await p.evaluate(()=>{document.querySelector('#v126 button[data-v126="grade"][data-val="mid"]').click()});await p.waitForTimeout(200);
await p.evaluate(()=>{const i=document.querySelector('#v126 input[data-v126="reframe"]');i.click()});await p.waitForTimeout(200);
o.after=await p.evaluate(()=>({steps:document.querySelector('#v126 .v126f b').textContent,stored:JSON.parse(localStorage.getItem('vid_pro'))}));
await p.screenshot({path:mob?'ux/v126_p.png':'ux/v126_d.png'});
// queued doc carries the steps (fake db)
o.queued=await E(`(async()=>{const V=window.__vid;const saved=V.VD.db;let got=null;V.VD.db={collection:()=>({doc:()=>({set:async d=>{got=d}})})};try{await V.queueDoc({id:'t126',name:'בדיקה'})}catch(e){return 'ERR '+e.message}V.VD.db=saved;return got&&got.pro})()`);
o.errors=errs.slice(0,3);await ctx.close()}
console.log(JSON.stringify(out,null,1));await b.close()})().catch(e=>{console.error('FATAL',e);process.exit(1)});
