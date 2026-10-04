const {chromium}=require('playwright-core');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox']});const out={};
const ctx=await b.newContext({viewport:{width:1440,height:900}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{localStorage.setItem('pro_seen','true');localStorage.setItem('ag_v104_done_v1','1');localStorage.setItem('ag_v107_done_v1','1');localStorage.setItem('ag_v110_done_v2','1')});
await p.goto('http://localhost:8765/t15.html');await p.waitForTimeout(7000);const E=s=>p.evaluate(s=>window.__E(s),s);
for(const v of ['gallery','agent','videos','competitors']){await E(`APP.view='${v}';render()`);await p.waitForTimeout(1000);
 out['hdr_'+v]=await p.evaluate(()=>{const act=document.getElementById('vact');const tb=act.closest('.tbar');const nb=tb.querySelector('.ibtn.pri');const kids=[...act.children].map(k=>Math.round(k.getBoundingClientRect().top));return {tbH:Math.round(tb.getBoundingClientRect().height),actRows:new Set(kids).size,minTop:Math.min(...kids,999),newW:Math.round(nb.getBoundingClientRect().width)}});
 await p.screenshot({path:'ux/v124_'+v+'.png'})}
await E(`APP.view='gallery';render()`);await p.waitForTimeout(800);
out.fam=await p.evaluate(()=>{const f=document.querySelector('.ga-fam');const t=document.querySelector('.v124more');const h0=f.clientHeight;t.click();const h1=f.clientHeight;const l=t.textContent;t.click();return {h0,h1,label:l,back:f.clientHeight}});
await E(`APP.view='settings';render()`);await p.waitForTimeout(800);
out.slot=await E(`(async()=>{const before=(APP.slots[1]||[]).slice();const i=document.querySelector('[data-slotin="1"]');i.value='16:45';i.dispatchEvent(new Event('change',{bubbles:true}));await new Promise(r=>setTimeout(r,500));return {before,after:APP.slots[1]}})()`);
await E(`APP.view='agent';render()`);await p.waitForTimeout(800);
out.agent=await p.evaluate(async()=>{const f=document.querySelector('[data-v51chat]');const i=f.querySelector('input');i.value='';f.querySelector('[type=submit]').click();await new Promise(r=>setTimeout(r,300));const foc=document.activeElement===i;const t1=document.querySelector('.toast,#toast');const a=t1&&t1.textContent;document.querySelector('[data-px="gen"]').click();await new Promise(r=>setTimeout(r,1200));const t2=document.querySelector('.toast,#toast');return {empty:a,focused:foc,gen:t2&&t2.textContent}});
out.errors=errs.slice(0,3);console.log(JSON.stringify(out,null,1));await b.close()})().catch(e=>{console.error('FATAL',e);process.exit(1)});
