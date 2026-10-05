const {chromium}=require('playwright-core');const TV=__dirname+'/tv/';(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});const out={};
for(const tag of ['d','p']){const ctx=await b.newContext(tag==='p'?{viewport:{width:390,height:844},isMobile:true,hasTouch:true}:{viewport:{width:1500,height:900}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));const o=out[tag]={};
await p.addInitScript(()=>{localStorage.setItem('pro_seen','true');localStorage.setItem('ag_v104_done_v1','1');localStorage.setItem('ag_v107_done_v1','1');localStorage.setItem('ag_v110_done_v2','1');localStorage.removeItem('v129_projects')});
await p.goto('http://localhost:8765/t15.html');await p.waitForTimeout(7000);const E=s=>p.evaluate(s=>window.__E(s),s);
await E(`(()=>{const V=window.__vid;V.VD.assets={upload:async f=>({id:'b'+Date.now(),url:'/_blob/b'+Date.now(),sizeBytes:f.size})};V.VD.db={collection:()=>({doc:id=>({set:async d=>{V.VD.docs=[Object.assign({id},d)].concat(V.VD.docs.filter(x=>x.id!==id))},update:async u=>{}})})}})()`);
await E(`APP.view='videos';render()`);await p.waitForTimeout(900);
o.stepsBefore=await p.evaluate(()=>[...document.querySelectorAll('#v142steps li')].map(l=>l.className).join('|'));
await p.setInputFiles('#v127 input[data-v127f]',[TV+'a.webm']);await p.waitForTimeout(2500);
o.stepsAfter=await p.evaluate(()=>[...document.querySelectorAll('#v142steps li')].map(l=>l.className).join('|'));
o.tileBtn=await p.evaluate(()=>document.querySelector('#v127 .v129go').textContent);
// a brand card opens and closes
await p.locator('#v127 .v142c > h4').first().click();await p.waitForTimeout(200);o.cardOpen=await p.evaluate(()=>document.querySelector('#v127 .v142c').classList.contains('open'));
// send the video to the cloud with one effect, through the studio bar
await p.locator('[data-v142fold="v128"]').click();await p.waitForTimeout(300);
o.fxOpen=await p.evaluate(()=>!document.getElementById('v128').classList.contains('v142shut'));
const sent=await E(`(async()=>{const V=window.__vid;const d=await V.queueDoc({id:'jobtest',name:'a',status:'plan_requested',phase:'plan',srcUrl:'x'});return !!d})()`);
await p.waitForTimeout(1800);o.card=await p.evaluate(()=>{const j=document.getElementById('v142job');return j&&{cls:j.className,title:j.querySelector('b').textContent,cur:(j.querySelector('.v142jsteps .cur')||{}).textContent}});
await E(`(()=>{const d=__vid.VD.docs.find(x=>x.id==='jobtest');d.status='awaiting_approval';d.planMd='x'})()`);await p.waitForTimeout(1800);o.approve=await p.evaluate(()=>{const j=document.getElementById('v142job');return j.querySelector('b').textContent+' / '+j.querySelector('.v142ja').textContent})
if(tag==='d')await p.screenshot({path:'ux/v142_job_approve.png'});
await E(`(()=>{const d=__vid.VD.docs.find(x=>x.id==='jobtest');d.status='approved'})()`);await p.waitForTimeout(1800);o.editing=await p.evaluate(()=>document.querySelector('#v142job .v142jsteps .cur').textContent);
await E(`(()=>{const d=__vid.VD.docs.find(x=>x.id==='jobtest');d.status='done';d.out='tv/a.mp4'})()`);await p.waitForTimeout(1800);o.done=await p.evaluate(()=>{const j=document.getElementById('v142job');return j.className+' / '+j.querySelector('b').textContent+' / '+j.querySelector('.v142ja').textContent});
if(tag==='p')await p.screenshot({path:'ux/v142_job_done_p.png'});
await E(`(()=>{const d=__vid.VD.docs.find(x=>x.id==='jobtest');d.status='failed';d.error='אין תמלול';d.out=''})()`);await p.waitForTimeout(1800);o.failed=await p.evaluate(()=>document.querySelector('#v142job p').textContent);
await p.click('#v142job [data-v142job="hide"]');await p.waitForTimeout(300);o.hidden=await p.evaluate(()=>!document.getElementById('v142job'));
// the editor banner
await p.locator('#v127 .v129go').first().click();await p.waitForTimeout(1500);o.editor=await p.evaluate(()=>{const n=document.querySelector('#v129 .v142now');return n&&n.textContent.slice(0,80)});o.toast=await p.evaluate(()=>(document.getElementById('toast')||{}).textContent||'');
await p.screenshot({path:'ux/v142_ed_'+tag+'.png'});
o.errors=errs.slice(0,3);await ctx.close()}
console.log(JSON.stringify(out,null,1));await b.close()})().catch(e=>{console.error('FATAL',e);process.exit(1)});
