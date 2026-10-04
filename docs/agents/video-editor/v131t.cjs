const {chromium}=require('playwright-core');const TV=__dirname+'/tv/';
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});const out={};
for(const mob of [false,true]){const ctx=await b.newContext(mob?{viewport:{width:390,height:844},isMobile:true,hasTouch:true}:{viewport:{width:1440,height:900}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{localStorage.setItem('pro_seen','true');localStorage.setItem('ag_v104_done_v1','1');localStorage.setItem('ag_v107_done_v1','1');localStorage.setItem('ag_v110_done_v2','1')});
await p.goto('http://localhost:8765/t15.html');await p.waitForTimeout(7000);const E=s=>p.evaluate(s=>window.__E(s),s);const o=out[mob?'phone':'desktop']={};
o.offsets=await E(`[__ilOffset('2026-10-20T10:00'),__ilOffset('2026-11-02T10:00'),__ilOffset('2027-04-01T10:00')]`);
await E(`APP.view='queue';APP.qf='queue';render()`);await p.waitForTimeout(1200);
o.cards=await p.evaluate(()=>[...document.querySelectorAll('#appviews .v131when')].slice(0,2).map(x=>x.textContent));
const id=await p.evaluate(()=>document.querySelector('#appviews .v131when').dataset.id);
o.before=await E(`APP.sched.items.find(i=>i.id==='${id}').at`);
await p.click(`#appviews .v131when[data-id="${id}"]`);await p.waitForTimeout(400);
o.sheet=await p.evaluate(()=>({open:!!document.querySelector('#v131 .v131box'),quick:document.querySelectorAll('#v131 .v131quick button').length,days:document.querySelectorAll('#v131 .v131d:not(:disabled)').length,times:document.querySelectorAll('#v131 .v131tm:not(:disabled)').length}));
await p.screenshot({path:mob?'ux/v131_sheet_p.png':'ux/v131_sheet_d.png'});
// pick a day 9 days ahead and 16:30
const target=await E(`(()=>{const d=new Date();d.setDate(d.getDate()+9);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')})()`);
if(!(await p.$(`#v131 [data-v131day="${target}"]`)))await p.click('#v131 [data-v131="mnext"]');
await p.click(`#v131 [data-v131day="${target}"]`);await p.waitForTimeout(150);await p.click('#v131 [data-v131time="16:30"]');await p.waitForTimeout(150);
o.sum=await p.evaluate(()=>document.querySelector('#v131 .v131sum').textContent);
await p.click('#v131 [data-v131="save"]');await p.waitForTimeout(700);
o.after=await E(`APP.sched.items.find(i=>i.id==='${id}').at`);o.cardNow=await p.evaluate(id=>{const b=document.querySelector(`#appviews .v131when[data-id="${id}"]`);return b&&b.textContent},id);
o.snack=await p.evaluate(()=>{const s=document.getElementById('v131snack');return s&&s.classList.contains('on')&&s.textContent});
await p.waitForTimeout(700);o.stored=await E(`JSON.parse(localStorage.getItem('app_sched')).items.find(i=>i.id==='${id}').at`);
await p.click('#v131snack button');await p.waitForTimeout(400);o.undo=await E(`APP.sched.items.find(i=>i.id==='${id}').at`);
// clash and swap
const two=await E(`APP.sched.items.filter(i=>i.at&&i.at>new Date().toISOString().slice(0,16)).slice(0,2).map(i=>[i.id,i.at])`);
await E(`__v131.open({it:APP.sched.items.find(i=>i.id==='${two[0][0]}')})`);await p.waitForTimeout(200);
await E(`(()=>{__v131.S.at='${two[1][1]}';document.querySelector('#v131 [data-v131="mprev"]').click();document.querySelector('#v131 [data-v131="mnext"]').click()})()`);await p.waitForTimeout(200);
o.clash=await p.evaluate(()=>({warn:!!document.querySelector('#v131 .v131warn [data-v131="swap"]'),disabled:document.querySelector('#v131 [data-v131="save"]').disabled}));
await p.click('#v131 [data-v131="swap"]');await p.waitForTimeout(150);await p.click('#v131 [data-v131="save"]');await p.waitForTimeout(500);
o.swapped=await E(`[APP.sched.items.find(i=>i.id==='${two[0][0]}').at===('${two[1][1]}'),APP.sched.items.find(i=>i.id==='${two[1][0]}').at===('${two[0][1]}')]`);
// calendar: click an item opens the sheet, moving re-renders the calendar
await E(`APP.view='calendar';APP.calMode='week';APP.calOff=0;render()`);await p.waitForTimeout(1000);
const cid=await p.evaluate(()=>{const b=document.querySelector('#appviews .ci[data-id]');return b&&b.dataset.id});o.calItem=cid;
if(cid){await p.click(`#appviews .ci[data-id="${cid}"]`);await p.waitForTimeout(400);o.calSheet=await p.evaluate(()=>!!document.querySelector('#v131 .v131box')&&!document.getElementById('cmp-root'));
 const d2=await E(`(()=>{const s=weekStart(APP.calOff);const d=new Date(s);d.setDate(s.getDate()+6);return dkey(d)})()`);const ok=await p.$(`#v131 [data-v131day="${d2}"]:not([disabled])`);
 if(ok){await p.click(`#v131 [data-v131day="${d2}"]`);await p.click('#v131 [data-v131time="20:00"]');await p.click('#v131 [data-v131="save"]');await p.waitForTimeout(800);
  o.calMoved=await p.evaluate(([d,id])=>!!document.querySelector(`#appviews .wkc[data-drop="${d}"] .ci[data-id="${id}"]`),[d2,cid])}}
// live: another tab changes the schedule
o.live=await E(`(async()=>{const v=JSON.parse(JSON.stringify(APP.sched));const it=v.items.find(i=>i.at);const d=new Date();d.setDate(d.getDate()+3);it.at=dkey(d)+'T09:30';window.dispatchEvent(new StorageEvent('storage',{key:'app_sched',newValue:JSON.stringify(v)}));await new Promise(r=>setTimeout(r,500));return APP.sched.items.find(i=>i.id===it.id).at==it.at&&!!document.querySelector('#appviews .ci[data-id="'+it.id+'"]')||APP.sched.items.find(i=>i.id===it.id).at})()`);
// the post editor: schedule button shows the time and opens the sheet over the editor
o.pe=await E(`(async()=>{const it=APP.sched.items.find(i=>i.at&&itemPost(i)&&!i.reel);peOpen(itemPost(it));await new Promise(r=>setTimeout(r,1200));const b=document.querySelector('#pe-root [data-pe-a="sched"]');const lab=b&&b.textContent.trim();b.click();await new Promise(r=>setTimeout(r,500));return {lab,sheet:!!document.querySelector('#v131 .v131box'),editor:!!document.getElementById('pe-root')}})()`);
await p.screenshot({path:mob?'ux/v131_pe_p.png':'ux/v131_pe_d.png'});
await E(`__v131.close();try{peClose(true)}catch(e){}`);
o.errors=errs.slice(0,4);await ctx.close()}
console.log(JSON.stringify(out,null,1));await b.close()})().catch(e=>{console.error('FATAL',e);process.exit(1)});
