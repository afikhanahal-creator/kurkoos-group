const {chromium}=require('playwright-core');
const TV=__dirname+'/tv/';
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});const out={};
for(const mob of [false,true]){const ctx=await b.newContext(mob?{viewport:{width:390,height:844},isMobile:true,hasTouch:true}:{viewport:{width:1440,height:900}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{localStorage.setItem('pro_seen','true');localStorage.setItem('ag_v104_done_v1','1');localStorage.setItem('ag_v107_done_v1','1');localStorage.setItem('ag_v110_done_v2','1');localStorage.removeItem('v128_seq')});
await p.goto('http://localhost:8765/t15.html');await p.waitForTimeout(7000);const E=s=>p.evaluate(s=>window.__E(s),s);const o=out[mob?'phone':'desktop']={};
await E(`APP.view='videos';render()`);await p.waitForTimeout(1500);
o.order=await p.evaluate(()=>[...document.querySelectorAll('#v100page > section')].slice(0,5).map(s=>s.id||s.className));
o.cards=await p.evaluate(()=>document.querySelectorAll('#v128 .v128c').length);
await p.setInputFiles('#v127 input[data-v127f]',[TV+'a.webm']);await p.waitForTimeout(1500);
for(const id of ['opening','shatter','worlds']){await p.evaluate(()=>{const f=document.querySelector('[data-v142fold="v128"]');const sec=document.getElementById('v128');if(f&&sec&&sec.classList.contains('v142shut'))f.click()});await p.waitForTimeout(300);await p.click(`#v128 [data-v128="add"][data-id="${id}"]`);await p.waitForTimeout(250)}
await p.fill('#v128 .v128row:nth-child(1) input[data-k="word"]','קורקוס');await p.fill('#v128 .v128row:nth-child(1) input[data-k="title"]','קבוצת קורקוס');
await p.fill('#v128 .v128row:nth-child(2) input[data-k="word"]','וילות');
await p.fill('#v128 .v128row:nth-child(3) input[data-k="word"]','אנחנו');await p.fill('#v128 .v128row:nth-child(3) input[data-k="words"]','בונים, וילות');
o.sig=await p.evaluate(()=>__v128.sigOf());
o.prompt=await p.evaluate(()=>{const t=__v128.fullPrompt();return {len:t.length,base:t.startsWith('בתיקייה הזאת'),fmt:t.includes('ריל אנכי'),word:t.includes('עד המילה קורקוס')}});
await p.waitForTimeout(1200);
o.playing=await p.evaluate(()=>[...document.querySelectorAll('#v128 video')].filter(v=>!v.paused&&v.readyState>=2).length);
await p.evaluate(()=>document.getElementById('v128').scrollIntoView());await p.waitForTimeout(600);await p.screenshot({path:mob?'ux/v128_p.png':'ux/v128_d.png'});
await p.click('#v128 [data-v128="prompt"][data-k="shatter"]');await p.waitForTimeout(300);o.sheet=await p.evaluate(()=>{const s=document.querySelector('.v128sheet pre');return s&&s.textContent.slice(0,40)});
await p.screenshot({path:mob?'ux/v128_sheet_p.png':'ux/v128_sheet_d.png'});await p.keyboard.press('Escape');
// plan request with a fake runtime, then the plan card and approval
o.flow=await E(`(async()=>{const V=window.__vid;const docs=[],fired=[];V.VD.assets={upload:async f=>({id:'a1',url:'u1',sizeBytes:f.size})};
 V.VD.db={collection:()=>({doc:id=>({set:async d=>{docs.push(d)},update:async u=>{docs.push(Object.assign({id},u))}})})};V.editVideo=async d=>{fired.push({id:d.id,phase:d.phase,status:d.status,sig:(d.sig||[]).length});return true};
 document.querySelector('#v128 [data-v128="plan"]').click();await new Promise(r=>setTimeout(r,1500));
 const d0=docs[0];V.VD.docs=[Object.assign({},d0,{status:'awaiting_approval',planMd:'# תוכנית\\n| אפקט | מילה |\\n|---|---|\\n| התנפצות | וילות |',planPreview:'tv/../ux/v127_d_intro.png',created:new Date().toISOString()}),{id:'old1',name:'אתמול',status:'library',srcUrl:'x',created:new Date(Date.now()-86400000).toISOString()}];
 render();await new Promise(r=>setTimeout(r,800));
 const card=document.querySelector('.v100c[data-vid="'+d0.id+'"] .v128plan');const days=[...document.querySelectorAll('.v128day')].map(h=>h.textContent);
 document.querySelector('.v100c[data-vid="'+d0.id+'"] [data-v128="approve"]').click();await new Promise(r=>setTimeout(r,500));
 return {queued:{status:d0.status,phase:d0.phase,sig:d0.sig.length,trim:!!d0.trim},planCard:!!card,days,fired}})()`);
await p.evaluate(()=>{const c=document.querySelector('.v128plan');c&&c.scrollIntoView()});await p.waitForTimeout(300);await p.screenshot({path:mob?'ux/v128_plan_p.png':'ux/v128_plan_d.png'});
o.over=await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
o.errors=errs.slice(0,4);await ctx.close()}
console.log(JSON.stringify(out,null,1));await b.close()})().catch(e=>{console.error('FATAL',e);process.exit(1)});
