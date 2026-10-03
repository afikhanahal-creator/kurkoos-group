const {chromium}=require('playwright-core');const fs=require('fs');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox']});const out={};process.on("exit",()=>console.log("PARTIAL",JSON.stringify(out)));
const man=JSON.parse(fs.readFileSync('drive_docs/manifest_drive1.json','utf8'));
for(const mob of [true,false]){const ctx=await b.newContext(mob?{viewport:{width:390,height:844},isMobile:true,hasTouch:true}:{viewport:{width:1366,height:860}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{localStorage.setItem('pro_seen','true');localStorage.setItem('ag_v104_done_v1','1');localStorage.setItem('ag_v107_done_v1','1');localStorage.setItem('ag_v110_done_v1','1');localStorage.setItem('ag_v112_drive1','1')});
await p.goto('http://localhost:8765/t15.html');await p.waitForTimeout(6000);const E=s=>p.evaluate(s=>window.__E(s),s);const o=out[mob?'phone':'desktop']={};
// the drive batch and a fake asset store
await p.evaluate(man=>{window.__man=man},man);
await E(`(()=>{const cv=document.createElement('canvas');cv.width=640;cv.height=480;const c=cv.getContext('2d');c.fillStyle='#8fb6c8';c.fillRect(0,0,640,480);const u=cv.toDataURL('image/jpeg',.5);const m=window.__man;m.items.forEach(it=>it.meta.url=u);
 window.__ups=0;const store={upload:async blob=>{window.__ups++;return {id:'up'+window.__ups,url:URL.createObjectURL(blob),sizeBytes:blob.size}}};
 const col=name=>({doc:id=>({set:async d=>{},update:async d=>{}}),get:async()=>({docs:name==='batches'?[{id:'drive1',data:()=>m}]:[]}),onSnapshot:()=>{}});KC.db={collection:col};KC.assets=store})()`);
await p.waitForTimeout(4000);
await E(`const d=AG.posts.find(x=>/^(ed|x)_/.test(x.layout)&&!x.tpl&&peSlots(x).length&&x.project==='henrietta')||AG.posts.find(x=>/^(ed|x)_/.test(x.layout)&&!x.tpl&&peSlots(x).length);peOpen(d);PE.tab='image';peRender()`);await p.waitForTimeout(1500);
o.inline=await p.evaluate(()=>{const r=document.getElementById('pe-root');return {sections:[...r.querySelectorAll('details.v115g')].map(d=>[d.dataset.v115g,d.open,d.querySelectorAll('.v115t').length]),srcBtns:r.querySelectorAll('[data-v115="src"]').length,openBtn:!!r.querySelector('[data-v115="open"]'),upload:!!r.querySelector('[data-v115up]'),total:r.querySelector('.pe-sec.v115 .pe-l small')&&r.querySelector('.pe-sec.v115 .pe-l small').textContent}});
await p.screenshot({path:mob?'v115_p1.png':'v115_d1.png'});
// source filter: drive only
await p.evaluate(()=>document.querySelector('#pe-root [data-v115="src"][data-k="drive"]').click());await p.waitForTimeout(700);
o.driveOnly=await p.evaluate(()=>document.querySelectorAll('#pe-root .v115t').length);
await p.evaluate(()=>document.querySelector('#pe-root [data-v115="src"][data-k="all"]').click());await p.waitForTimeout(600);
// full screen library, pick a tile, slot changes, library closes
const before=await E(`peSlots(PE.p)[PE.slot].o.k`);
await p.evaluate(()=>document.querySelector('#pe-root [data-v115="open"]').click());await p.waitForTimeout(900);
o.lib=await p.evaluate(()=>{const el=document.getElementById('v115lib');if(!el)return null;const g=el.querySelector('.v115grid.big');return {open:true,sections:el.querySelectorAll('details.v115g').length,tiles:el.querySelectorAll('.v115t').length,cols:g?getComputedStyle(g).gridTemplateColumns.split(' ').length:0,captions:el.querySelectorAll('.v115c').length,nav:getComputedStyle(document.getElementById('v99nav')||document.body).display}});
await p.screenshot({path:mob?'v115_p2.png':'v115_d2.png'});
await p.evaluate(()=>{const t=[...document.querySelectorAll('#v115lib details[open] .v115t')].find(x=>x.getAttribute('aria-pressed')!=='true');t.click()});await p.waitForTimeout(900);
const after=await E(`peSlots(PE.p)[PE.slot].o.k`);o.pick={changed:before!==after,libClosed:await p.evaluate(()=>!document.getElementById('v115lib')),editor:await p.evaluate(()=>!!document.getElementById('pe-root'))};
// upload two files into the library from the editor
await p.setInputFiles('#pe-root [data-v115up]',['drive_up/1P5RBxXtQb0rV1KrDduiYCQK__fAohU-i.jpg','drive_up/1UwLOugC-4th6pd6qOmPpnMXGkKW-XQBT.jpg']);await p.waitForTimeout(2500);
o.upload=await E(`({ups:window.__ups,lib:libKeys().length,slot:peSlots(PE.p)[PE.slot].o.k,uploads:libKeys().filter(k=>__v115.srcOf(k)==='upload').length})`);
// search narrows
await p.evaluate(()=>{const q=document.querySelector('#pe-root [data-v115="q"]');q.value='חנקין';q.dispatchEvent(new Event('input',{bubbles:true}))});await p.waitForTimeout(800);
o.search=await p.evaluate(()=>({tiles:document.querySelectorAll('#pe-root .v115t').length,focused:document.activeElement&&document.activeElement.dataset&&document.activeElement.dataset.v115==='q'}));
// back gesture on phone closes only the library
if(mob){await p.evaluate(()=>document.querySelector('#pe-root [data-v115="open"]').click());await p.waitForTimeout(800);await p.goBack();await p.waitForTimeout(800);o.back={lib:await p.evaluate(()=>!!document.getElementById('v115lib')),editor:await p.evaluate(()=>!!document.getElementById('pe-root'))}}
o.errors=errs.slice(0,3);await ctx.close()}
console.log(JSON.stringify(out,null,1));await b.close()})().catch(e=>{console.error('FATAL',e);process.exit(1)});
