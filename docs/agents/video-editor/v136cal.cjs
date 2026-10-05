const {chromium}=require('playwright-core');const fs=require('fs');
const FAKE=fs.readFileSync(__dirname+'/fakedb.part','utf8').replace(/^const FAKE=`/,'').replace(/`;\s*$/,'');
const REAL=fs.readFileSync(__dirname+'/realdb.json','utf8');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox']});const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
p.on('console',m=>{if(/sched|v13/i.test(m.text()))console.log('LOG',m.text())});
await p.addInitScript(FAKE);await p.addInitScript(r=>{localStorage.setItem('pro_seen','true');localStorage.setItem('ag_v104_done_v1','1');localStorage.setItem('ag_v107_done_v1','1');localStorage.setItem('ag_v110_done_v2','1');if(!localStorage.getItem('fakedb'))localStorage.setItem('fakedb',r)},REAL);
const E=s=>p.evaluate(s=>window.__E(s),s);const o={};const ID='smumoreyr0';
await p.goto('http://localhost:8765/t15.html');await p.waitForTimeout(8000);
o.start=await E(`(APP.sched.items.find(i=>i.id==='${ID}')||{}).at`);
await E(`APP.view='calendar';render()`);await p.waitForTimeout(800);
o.cards=await p.evaluate(()=>[...document.querySelectorAll('#appviews [data-app="edit"][data-id]')].map(x=>x.dataset.id).slice(0,8));
await p.screenshot({path:'ux/v136_cal0.png'});
const pen=await p.$(`#appviews [data-app="edit"][data-id="${ID}"]`);o.pen=!!pen;if(pen){await pen.scrollIntoViewIfNeeded();await pen.tap()}
await p.waitForTimeout(700);o.sheet=await p.evaluate(()=>!!document.querySelector('#v131'));
if(o.sheet){await p.tap('#v131 [data-v131day="2026-10-13"]');await p.waitForTimeout(300);await p.screenshot({path:'ux/v136_sheet.png'});
 o.saveDisabled=await p.evaluate(()=>document.querySelector('#v131 .v131save').disabled);await p.tap('#v131 .v131save');await p.waitForTimeout(1200)}
o.local=await E(`(APP.sched.items.find(i=>i.id==='${ID}')||{}).at`);o.db=await p.evaluate(id=>JSON.parse(localStorage.getItem('fakedb')).schedule[id],ID);
await p.screenshot({path:'ux/v136_cal1.png'});
await p.reload();await p.waitForTimeout(8000);o.afterReload=await E(`(APP.sched.items.find(i=>i.id==='${ID}')||{}).at`);
o.errors=errs.slice(0,5);console.log(JSON.stringify(o,null,1));await b.close()})().catch(e=>{console.error('FATAL',e);process.exit(1)});
