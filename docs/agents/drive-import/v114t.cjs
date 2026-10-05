const {chromium}=require('playwright-core');const fs=require('fs');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox']});
const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{localStorage.setItem('pro_seen','true');localStorage.setItem('ag_v104_done_v1','1');localStorage.setItem('ag_v107_done_v1','1');localStorage.setItem('ag_v110_done_v1','1')});
const man=JSON.parse(fs.readFileSync('drive_docs/manifest_drive1.json','utf8'));
await p.goto('http://localhost:8765/t15.html');await p.waitForTimeout(6000);const E=s=>p.evaluate(s=>window.__E(s),s);
// fake db with the batches collection; items url points at a generated image
await p.evaluate(man=>{window.__man=man},man);
await E(`(()=>{const cv=document.createElement('canvas');cv.width=800;cv.height=600;cv.getContext('2d').fillStyle='#105572';cv.getContext('2d').fillRect(0,0,800,600);const u=cv.toDataURL('image/jpeg',.6);const m=window.__man;m.items.forEach(it=>it.meta.url=u);
 const col=name=>({doc:id=>({set:async d=>{},update:async d=>{}}),get:async()=>({docs:name==='batches'?[{id:'drive1',data:()=>m}]:[]}),onSnapshot:()=>{}});KC.db={collection:col}})()`);
await p.waitForTimeout(9000);
const out=await E(`({lib:libKeys().length,drive:Object.values(KC.up).filter(m=>m.batch==='drive1').length,pending:__v112.pending(),posts:AG.posts.length,byProject:(()=>{const c={};Object.values(KC.up).filter(m=>m.batch==='drive1').forEach(m=>c[m.project]=(c[m.project]||0)+1);return c})()})`);
console.log(JSON.stringify(out),'errors',errs.slice(0,2));await b.close()})();
