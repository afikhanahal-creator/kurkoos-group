const {chromium}=require('playwright-core');const TV=__dirname+'/tv/';
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});const out={};
for(const mob of [false,true]){const ctx=await b.newContext(mob?{viewport:{width:390,height:844},isMobile:true,hasTouch:true}:{viewport:{width:1440,height:900}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{localStorage.setItem('pro_seen','true');localStorage.setItem('ag_v104_done_v1','1');localStorage.setItem('ag_v107_done_v1','1');localStorage.setItem('ag_v110_done_v2','1');localStorage.removeItem('v129_projects')});
await p.goto('http://localhost:8765/t15.html');await p.waitForTimeout(7000);const E=s=>p.evaluate(s=>window.__E(s),s);const o=out[mob?'phone':'desktop']={};
// fake runtime: library and database
await E(`(()=>{const V=window.__vid;window.__docs=[];V.VD.assets={upload:async f=>({id:'b'+Date.now(),url:'/_blob/b'+Date.now(),sizeBytes:f.size})};V.VD.db={collection:()=>({doc:()=>({set:async d=>{__docs.push(d)},update:async u=>{__docs.push(u)}})})};V.editVideo=async d=>{window.__fired=(window.__fired||0)+1;return true}})()`);
await E(`APP.view='videos';render()`);await p.waitForTimeout(900);await p.setInputFiles('#v127 input[data-v127f]',[TV+'a.webm']);await p.waitForTimeout(1500);
await p.click('#v127 .v129go');await p.waitForTimeout(1500);
await p.click('#v129 [data-v129="recipe"][data-id="brand"]');await p.fill('#v129paste','אנחנו קבוצת קורקוס ובונים כל בית כמו שצריך');await p.click('#v129 [data-v129="auto"]');await p.waitForTimeout(500);
o.bar=await p.evaluate(()=>[...document.querySelectorAll('.v130ebar .px-btn')].map(x=>x.textContent+(x.classList.contains('pri')?'*':'')));
await E(`__v129.E.p.kit.quality='fast'`);
await p.click('.v130ebar [data-v130="export"]');await p.waitForFunction(()=>{const r=document.getElementById('v132res');return r&&/מוכן/.test(r.querySelector('header b').textContent)&&!/שומר/.test(r.querySelector('header b').textContent)},null,{timeout:120000});
o.result=await p.evaluate(()=>{const r=document.getElementById('v132res');return {title:r.querySelector('header b').textContent,btns:[...r.querySelectorAll('.px-btn')].map(x=>x.textContent),video:!!r.querySelector('video[src]')}});
o.saved=await E(`(()=>{const d=__docs.find(x=>x.status==='done');return d&&{status:d.status,out:!!d.out,name:d.name}})()`);
await p.screenshot({path:mob?'ux/v132_res_p.png':'ux/v132_res_d.png'});
await p.click('#v132res [data-v132="sched"]');await p.waitForTimeout(500);o.sched=await p.evaluate(()=>{const b=document.querySelector('#v131 header small');return b&&b.textContent});
await p.click('#v131 .v131quick button:first-child');await p.click('#v131 [data-v131="save"]');await p.waitForTimeout(800);
o.reel=await E(`(()=>{const it=APP.sched.items.filter(i=>i.reel).pop();return it&&{at:it.at,file:it.reel.file.slice(0,8)}})()`);
// cinematic effects keep a time
await p.click('#v129 [data-v129tab="fx"]');await p.waitForTimeout(300);await p.evaluate(()=>{__v129.E.t=2.4});await p.click('#v129 [data-v129="fxadd"][data-id="shatter"]');await p.waitForTimeout(300);
o.fxAt=await E(`__v129.E.p.fx.map(f=>f.id+'@'+f.at).join(',')`);
await p.click('.v130ebar [data-v130="pro"]');await p.waitForTimeout(1500);o.pro=await E(`(()=>{const d=__docs.filter(x=>x.sig).pop();return d&&{sig:d.sig,caps:d.edit&&d.edit.caps&&d.edit.caps.length}})()`);
// a failed job shows why and can be sent again
o.fail=await E(`(async()=>{const V=window.__vid;V.VD.docs=[{id:'f1',name:'נכשל',status:'failed',error:'אין תמלול אמיתי: huggingface.co חסום',srcUrl:'tv/a.webm',created:new Date().toISOString()}];APP.view='videos';render();await new Promise(r=>setTimeout(r,800));const box=document.querySelector('.v100c[data-vid="f1"] .v132fail');if(!box)return null;const t=box.querySelector('p').textContent.slice(0,40);const n=window.__fired||0;box.querySelector('[data-v132retry]').click();await new Promise(r=>setTimeout(r,600));return {t,resent:(window.__fired||0)>n}})()`);
o.errors=errs.slice(0,3);await ctx.close()}
console.log(JSON.stringify(out,null,1));await b.close()})().catch(e=>{console.error('FATAL',e);process.exit(1)});
