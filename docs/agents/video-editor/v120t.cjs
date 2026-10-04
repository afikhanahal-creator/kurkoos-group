const {chromium}=require('playwright-core');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox']});const out={};
for(const mob of [false,true]){const ctx=await b.newContext(mob?{viewport:{width:390,height:844},isMobile:true,hasTouch:true}:{viewport:{width:1366,height:860}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{localStorage.setItem('pro_seen','true');localStorage.setItem('ag_v104_done_v1','1');localStorage.setItem('ag_v107_done_v1','1');localStorage.setItem('ag_v110_done_v2','1')});
await p.goto('http://localhost:8765/t15.html');await p.waitForTimeout(7000);const E=s=>p.evaluate(s=>window.__E(s),s);const o=out[mob?'phone':'desktop']={};
// 1. edit the headline and the photo crop, close with the X (no save): the post must be unchanged
o.step1=await E(`(async()=>{const d=AG.posts.find(x=>/^(ed|x)_/.test(x.layout)&&!x.tpl&&peSlots(x).length);const before=JSON.stringify([d.visual,d.fx,d.hook]);peOpen(d);await new Promise(r=>setTimeout(r,800));
 PE.p.visual.headline='כותרת שלא נשמרה';PE.p.hook='כותרת שלא נשמרה';const s=peSlots(PE.p)[0];if(s&&!s.legacy)s.o.r=[0.2,0.2,0.6,0.6];peRender();await new Promise(r=>setTimeout(r,300));const dirty=peDirty();
 const x=document.querySelector('#pe-root [data-pe-a="close"]');x.click();await new Promise(r=>setTimeout(r,600));
 const after=JSON.stringify([d.visual,d.fx,d.hook]);const bar=document.getElementById('v82undo');return {id:d.id,dirty,editorOpen:!!document.getElementById('pe-root'),unchanged:before===after,barText:bar&&bar.textContent,btn:bar&&bar.querySelector('button').textContent}})()`);
// 2. the bar reopens the editor with the unsaved draft
o.step2=await E(`(async()=>{const bar=document.getElementById('v82undo');if(!bar)return 'nobar';bar.querySelector('button').click();await new Promise(r=>setTimeout(r,1500));return {editorOpen:!!document.getElementById('pe-root'),headline:PE.p&&PE.p.visual&&PE.p.visual.headline,dirty:!!(PE.p&&peDirty())}})()`);
// 3. explicit save still applies, then close is clean
o.step3=await E(`(async()=>{const o=PE.orig;peSave('בדיקה');await new Promise(r=>setTimeout(r,300));const saved=o.visual.headline;peClose();await new Promise(r=>setTimeout(r,500));return {saved,editorOpen:!!document.getElementById('pe-root'),bar:!!document.getElementById('v82undo')}})()`);
// 4. a second close of a dirty editor via the back gesture path (peClose without force) also discards
o.step4=await E(`(async()=>{const d=AG.posts.find(x=>/^(ed|x)_/.test(x.layout)&&!x.tpl&&x.visual&&peSlots(x).length&&x.visual.headline!=='כותרת שלא נשמרה');const before=d.visual.headline;peOpen(d);await new Promise(r=>setTimeout(r,600));PE.p.visual.headline='עוד שינוי';peClose();await new Promise(r=>setTimeout(r,400));return {unchanged:d.visual.headline===before,editorOpen:!!document.getElementById('pe-root')}})()`);
o.errors=errs.slice(0,3);await ctx.close()}
console.log(JSON.stringify(out,null,1));await b.close()})().catch(e=>{console.error('FATAL',e);process.exit(1)});
