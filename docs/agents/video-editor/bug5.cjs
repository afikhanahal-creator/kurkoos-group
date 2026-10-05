const {chromium}=require('playwright-core');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox']});const ctx=await b.newContext({viewport:{width:1366,height:860}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{localStorage.setItem('pro_seen','true');localStorage.setItem('ag_v104_done_v1','1');localStorage.setItem('ag_v107_done_v1','1');localStorage.setItem('ag_v110_done_v2','1')});
await p.goto('http://localhost:8765/t15.html');await p.waitForTimeout(7000);const E=s=>p.evaluate(s=>window.__E(s),s);const o={};
// real click on "פוסט חדש" in the header
await E(`(()=>{const q=AG.posts.find(x=>/^(ed|x)_/.test(x.layout)&&!x.article&&!itemOf(x));openComposer({p:q})})()`);await p.waitForTimeout(800);
o.open=await E(`JSON.stringify({cmp:!!APP.cmp,p:!!(APP.cmp&&APP.cmp.p),sched:APP.cmp&&APP.cmp.sched,at:APP.cmp&&APP.cmp.at,draftTa:!!document.querySelector('#cmp-root [data-app="draft"]'),chips:document.querySelectorAll('#cmp-root .kc-chips button').length,footer:[...document.querySelectorAll('#cmp-root footer button')].map(b=>b.dataset.app+':'+b.textContent.trim().slice(0,30))})`);
// pick a design chip if there is one, so p exists
await E(`(()=>{const c=document.querySelector('#cmp-root .kc-chips button');if(c)c.click()})()`);await p.waitForTimeout(600);
o.afterChip=await E(`JSON.stringify({p:!!(APP.cmp&&APP.cmp.p),footer:[...document.querySelectorAll('#cmp-root footer button')].map(b=>b.dataset.app+':'+b.textContent.trim().slice(0,30))})`);
const cs=p.locator('#cmp-root [data-app="csched"]');if(await cs.count()){await cs.first().click();await p.waitForTimeout(600)}
o.afterCsched=await E(`JSON.stringify({sched:APP.cmp.sched,at:APP.cmp.at,input:!!document.querySelector('#cmp-root [data-app="cat"]'),inputVal:(document.querySelector('#cmp-root [data-app="cat"]')||{}).value,footer:[...document.querySelectorAll('#cmp-root footer button')].map(b=>b.dataset.app+':'+b.textContent.trim().slice(0,30))})`);
await p.screenshot({path:'bug4_1.png'});
const inp=p.locator('#cmp-root [data-app="cat"]');if(await inp.count()){await inp.first().click();await p.waitForTimeout(700)}
o.picker=await p.evaluate(()=>!!document.querySelector('.v44host'));
const day=p.locator('.v44host .v44d:not(.out)').nth(22);o.day=await day.getAttribute('data-ds').catch(()=>null);if(o.day){await day.click();await p.waitForTimeout(400)}
const h=p.locator('.v44host [data-pk="h"][data-h="18"]');if(await h.count()){await h.click();await p.waitForTimeout(300)}
const ok=p.locator('.v44host [data-pk="ok"]');if(await ok.count()){await ok.click();await p.waitForTimeout(700)}
o.afterOk=await E(`JSON.stringify({sched:APP.cmp.sched,at:APP.cmp.at,inputVal:(document.querySelector('#cmp-root [data-app="cat"]')||{}).value,picker:!!document.querySelector('.v44host'),footer:[...document.querySelectorAll('#cmp-root footer button')].map(b=>b.dataset.app+':'+b.textContent.trim().slice(0,30))})`);
await p.screenshot({path:'bug4_2.png'});
// press the primary button
o.priLabel=await E(`(()=>{const C=APP.cmp;const b=document.querySelector('#cmp-root footer .ibtn.pri');if(!b)return 'none';const t=b.textContent.trim();if(C&&C.at){const k=kindOf(C.p);const r=composerSave(window.__v121?__v121.pickedAt():nextSlot(k));return 'cqueue-path:'+t}b.click();return t})()`);await p.waitForTimeout(900);
o.afterSave=await E(`JSON.stringify({cmp:!!APP.cmp,last:APP.sched.items.slice(-1)[0]&&{id:APP.sched.items.slice(-1)[0].id,at:APP.sched.items.slice(-1)[0].at,status:APP.sched.items.slice(-1)[0].status},toast:(document.querySelector('.toast,#toast')||{}).textContent})`);
o.errors=errs.slice(0,4);console.log(JSON.stringify(o,null,1));await b.close()})().catch(e=>{console.error('FATAL',e);process.exit(1)});
