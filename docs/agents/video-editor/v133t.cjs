const {chromium}=require('playwright-core');
const FAKE=`(()=>{const K='fakedb';const load=()=>{try{return JSON.parse(localStorage.getItem(K)||'{}')}catch(e){return {}}};const save=s=>localStorage.setItem(K,JSON.stringify(s));
 const subs=[];const snap=(col)=>{const s=load()[col]||{};const docs=Object.entries(s).map(([id,v])=>({id,exists:true,data:()=>v}));return {docs,size:docs.length,empty:!docs.length,forEach:f=>docs.forEach(f),docChanges:()=>[],metadata:{}}};
 const db={collection:col=>({get:async()=>snap(col),onSnapshot:(cb)=>{subs.push([col,cb]);setTimeout(()=>cb(snap(col)),50);return ()=>{}},doc:id=>({get:async()=>{const v=(load()[col]||{})[id];return {id,exists:!!v,data:()=>v}},
   set:async d=>{if(window.__failWrites)throw {code:'invalid_argument',message:'x'};const s=load();s[col]=s[col]||{};s[col][id]=JSON.parse(JSON.stringify(d));save(s);subs.filter(x=>x[0]===col).forEach(x=>setTimeout(()=>x[1](snap(col)),20))},
   update:async d=>{const s=load();s[col]=s[col]||{};s[col][id]=Object.assign(s[col][id]||{},d);save(s)}})}),doc:p=>db.collection(p.split('/')[0]).doc(p.split('/')[1])};
 window.claude={use:async n=>n==='db'?db:null}})()`;
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox']});const ctx=await b.newContext({viewport:{width:1440,height:900}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(FAKE);await p.addInitScript(()=>{localStorage.setItem('pro_seen','true');localStorage.setItem('ag_v104_done_v1','1');localStorage.setItem('ag_v107_done_v1','1');localStorage.setItem('ag_v110_done_v2','1');
 if(!localStorage.getItem('fakedb'))localStorage.setItem('fakedb',JSON.stringify({schedule:{cal_k5:{at:'2026-10-06T12:00',id:'cal_k5',key:'k5',label:'5 דברים שמפקח בודק לפני יציקה',nets:{fb:true,ig:false},reel:null,status:'draft'}}}))});
const E=s=>p.evaluate(s=>window.__E(s),s);const o={};
await p.goto('http://localhost:8765/t15.html');await p.waitForTimeout(8000);
o.dbReady=await E(`!!APP.db`);o.start=await E(`APP.sched.items.find(i=>i.id==='cal_k5').at`);
// 1. move with the sheet to 13.10 at 10:00
await E(`__v131.open({it:APP.sched.items.find(i=>i.id==='cal_k5')})`);await p.waitForTimeout(200);
await E(`(()=>{__v131.S.at='2026-10-13T10:00';document.querySelector('#v131 [data-v131="mnext"]').click();document.querySelector('#v131 [data-v131="mprev"]').click()})()`);await p.waitForTimeout(200);
await p.click('#v131 [data-v131="save"]');await p.waitForTimeout(900);
o.local=await E(`APP.sched.items.find(i=>i.id==='cal_k5').at`);o.db=await p.evaluate(()=>JSON.parse(localStorage.getItem('fakedb')).schedule.cal_k5.at);
await p.reload();await p.waitForTimeout(8000);o.afterReload=await E(`APP.sched.items.find(i=>i.id==='cal_k5').at`);
// 2. the database refuses writes: the change stays, a note shows, and it is retried later
await E(`window.__failWrites=true`);await E(`__v131.open({it:APP.sched.items.find(i=>i.id==='cal_k5')})`);await p.waitForTimeout(200);
await E(`(()=>{__v131.S.at='2026-10-14T11:00';document.querySelector('#v131 [data-v131="mnext"]').click();document.querySelector('#v131 [data-v131="mprev"]').click()})()`);await p.waitForTimeout(200);
await p.click('#v131 [data-v131="save"]');await p.waitForTimeout(900);
o.toast=await p.evaluate(()=>document.getElementById('toast').textContent);o.pending=await E(`__v133.pending()`);
o.dbStill=await p.evaluate(()=>JSON.parse(localStorage.getItem('fakedb')).schedule.cal_k5.at);
await p.reload();await p.waitForTimeout(8000);o.reloadLocalWins=await E(`APP.sched.items.find(i=>i.id==='cal_k5').at`);
await p.waitForTimeout(500);o.dbAfterRetry=await p.evaluate(()=>JSON.parse(localStorage.getItem('fakedb')).schedule.cal_k5.at);
// 3. the composer ("עריכת טקסט") with a picked date
await E(`APP.view='queue';render()`);await p.waitForTimeout(600);
await E(`openComposer({it:APP.sched.items.find(i=>i.id==='cal_k5')})`);await p.waitForTimeout(700);
o.cmp=await p.evaluate(()=>!!document.querySelector('#cmp-root'));
await p.evaluate(()=>{let i=document.querySelector('#cmp-root [data-app="cat"]');if(!i){const b=document.querySelector('#cmp-root [data-app="csched"]');b&&b.click()}});await p.waitForTimeout(400);
await p.evaluate(()=>{const i=document.querySelector('#cmp-root [data-app="cat"]');i.value='2026-10-15T09:00';i.dispatchEvent(new Event('input',{bubbles:true}));i.dispatchEvent(new Event('change',{bubbles:true}))});await p.waitForTimeout(400);
o.cmpBtns=await p.evaluate(()=>[...document.querySelectorAll('#cmp-root footer [data-app]')].map(x=>x.dataset.app+':'+x.textContent.trim().slice(0,30)));
await p.evaluate(()=>{const b=document.querySelector('#cmp-root footer [data-app="csaveat"]');b&&b.click()});await p.waitForTimeout(900);
o.viaComposer=await E(`APP.sched.items.find(i=>i.id==='cal_k5').at`);o.dbComposer=await p.evaluate(()=>JSON.parse(localStorage.getItem('fakedb')).schedule.cal_k5.at);
o.errors=errs.slice(0,4);console.log(JSON.stringify(o,null,1));await b.close()})().catch(e=>{console.error('FATAL',e);process.exit(1)});
