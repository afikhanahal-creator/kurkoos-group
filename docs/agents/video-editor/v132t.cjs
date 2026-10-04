const {chromium}=require('playwright-core');const TV=__dirname+'/tv/';
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox']});const out={};
for(const mob of [false,true]){const ctx=await b.newContext(mob?{viewport:{width:390,height:844},isMobile:true,hasTouch:true}:{viewport:{width:1440,height:900}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{localStorage.setItem('pro_seen','true');localStorage.setItem('ag_v104_done_v1','1');localStorage.setItem('ag_v107_done_v1','1');localStorage.setItem('ag_v110_done_v2','1');localStorage.removeItem('v129_projects')});
await p.goto('http://localhost:8765/t15.html');await p.waitForTimeout(7000);const E=s=>p.evaluate(s=>window.__E(s),s);const o=out[mob?'phone':'desktop']={};
await E(`APP.view='videos';render()`);await p.waitForTimeout(1000);await p.setInputFiles('#v127 input[data-v127f]',[TV+'a.webm']);await p.waitForTimeout(1500);
await p.click('#v127 .v129go');await p.waitForTimeout(1500);await p.click('#v129 [data-v129tab="fx"]');await p.waitForTimeout(300);
await p.check('#v129 [data-v129pc="smOn"]');await p.waitForTimeout(400);
await p.fill('#v129 [data-v129sm="q1"]','וילות בהוד השרון, למשפחות, שישלחו הודעה');
for(const [k,v] of [['q2','b'],['q4','c'],['q5','a'],['q6','a'],['q7','b']]){await p.click(`#v129 [data-v129smk="${k}"][data-val="${v}"]`);await p.waitForTimeout(80)}
await p.fill('#v129 [data-v129sm="name"]','kurkoos');
o.bar=await p.evaluate(()=>[...document.querySelectorAll('.v130ebar .px-btn')].map(x=>x.textContent+(x.classList.contains('pri')?'*':'')));
await p.evaluate(()=>document.querySelector('.v129sm').scrollIntoView());await p.waitForTimeout(300);await p.screenshot({path:mob?'ux/v132_p.png':'ux/v132_d.png'});
o.sent=await E(`(async()=>{const V=window.__vid;const docs=[];V.VD.assets={upload:async f=>({id:'a1',url:'u1',sizeBytes:f.size})};V.VD.db={collection:()=>({doc:()=>({set:async d=>{docs.push(d)},update:async u=>{}})})};V.editVideo=async d=>true;
 document.querySelector('.v130ebar [data-v130="pro"]').click();await new Promise(r=>setTimeout(r,1500));const d=docs[0]||{};return d.stylemaker})()`);
o.errors=errs.slice(0,3);await ctx.close()}
console.log(JSON.stringify(out,null,1));await b.close()})().catch(e=>{console.error('FATAL',e);process.exit(1)});
