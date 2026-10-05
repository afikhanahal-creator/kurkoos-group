// desktop sanity + phone save button
const {chromium}=require('playwright-core');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox']});const out={};
for(const mob of [false,true]){const ctx=await b.newContext(mob?{viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2}:{viewport:{width:1366,height:860}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{localStorage.setItem('pro_seen','true');localStorage.setItem('ag_v104_done_v1','1');localStorage.setItem('ag_v107_done_v1','1')});await p.goto('http://localhost:8765/t15.html');await p.waitForTimeout(8000);
const E=s=>p.evaluate(s=>window.__E(s),s);const o=out[mob?'phone':'desktop']={};
await E(`const d=AG.posts.find(x=>/^(ed|x)_/.test(x.layout)&&!x.tpl&&peSlots(x).length);peOpen(d);PE.tab='light';peRender()`);await p.waitForTimeout(1500);
o.saveBefore=await p.evaluate(()=>getComputedStyle(document.querySelector('#pe-root [data-pe-a="save"]')).display);
await p.evaluate(()=>{const b=[...document.querySelectorAll('#pe-root button[data-pe-a="pre"]')].find(x=>x.getAttribute('aria-pressed')!=='true');b.click()});await p.waitForTimeout(600);
o.saveAfter=await p.evaluate(()=>{const s=document.querySelector('#pe-root [data-pe-a="save"]');const r=s.getBoundingClientRect();return [getComputedStyle(s).display,Math.round(r.width),Math.round(r.top)]});
o.headerRow=await p.evaluate(()=>{const tops=[...document.querySelectorAll('#pe-root .pe-top button')].filter(b=>b.offsetWidth).map(b=>Math.round(b.getBoundingClientRect().top));return [...new Set(tops)]});
await p.evaluate(()=>document.querySelector('#pe-root [data-v108="open"]').click());await p.waitForTimeout(800);
o.preview=await p.evaluate(()=>{const cv=document.querySelector('#v108pv canvas.v108cv');if(!cv)return null;const r=cv.getBoundingClientRect();return [Math.round(r.width),Math.round(r.height),Math.round(r.top),innerHeight]});
await p.screenshot({path:mob?'v108_p6.png':'v108_d1.png'});
await p.keyboard.press('Escape');await p.waitForTimeout(400);o.escClosesPreviewOnly=await p.evaluate(()=>[!document.getElementById('v108pv'),!!document.getElementById('pe-root')]);
await E('peClose(true)');o.errors=errs.slice(0,3);await ctx.close()}
console.log(JSON.stringify(out));await b.close()})().catch(e=>{console.error('FATAL',e);process.exit(1)});
