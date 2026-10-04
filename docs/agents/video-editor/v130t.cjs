const {chromium}=require('playwright-core');const TV=__dirname+'/tv/';
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});const out={};
for(const mob of [false,true]){const ctx=await b.newContext(mob?{viewport:{width:390,height:844},isMobile:true,hasTouch:true,acceptDownloads:true}:{viewport:{width:1440,height:900},acceptDownloads:true});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{localStorage.setItem('pro_seen','true');localStorage.setItem('ag_v104_done_v1','1');localStorage.setItem('ag_v107_done_v1','1');localStorage.setItem('ag_v110_done_v2','1');localStorage.removeItem('vid_kit');localStorage.removeItem('v129_projects')});
await p.goto('http://localhost:8765/t15.html');await p.waitForTimeout(7000);const E=s=>p.evaluate(s=>window.__E(s),s);const o=out[mob?'phone':'desktop']={};
await E(`APP.view='videos';render()`);await p.waitForTimeout(1200);
await p.setInputFiles('#v127 input[data-v127f]',[TV+'a.webm']);await p.waitForTimeout(2000);
o.editBtn=await p.evaluate(()=>{const x=document.querySelector('#v127 .v129go');return x&&x.textContent});
await p.click('#v127 .v129go');await p.waitForTimeout(1800);
o.view=await E(`APP.view+' '+__v129.E.tab`);
await p.click('#v129 [data-v129="recipe"][data-id="energy"]');await p.waitForTimeout(200);
await p.fill('#v129paste','אנחנו קבוצת קורקוס ובונים כל בית כמו שצריך מהשרטוט ועד המפתח');
await p.click('#v129 [data-v129="auto"]');await p.waitForTimeout(500);
o.after=await E(`({layers:__v129.E.p.layers.map(l=>l.type+(l.fx?':'+l.fx:'')).join(' '),look:__v129.E.p.look,cap:__v129.E.p.capStyle,progress:__v129.E.p.progress,sounds:__v129.E.p.layers.filter(l=>l.snd).length})`);
await p.click('#v129 [data-v129tab="anim"]');await p.waitForTimeout(200);await p.evaluate(()=>{window.__v129.E.t=2.2});await p.click('#v129 [data-v129="addfx"][data-fx="split"]');await p.waitForTimeout(300);
await p.click('#v129 [data-v129tab="text"]');await p.waitForTimeout(200);await p.click('#v129 [data-v129="addtext"]');await p.waitForTimeout(200);await p.fill('#v129 [data-v129l="text"]','מהשרטוט ועד המפתח');
await p.click('#v129 [data-v129tab="anim"]');await p.waitForTimeout(200);await p.click('#v129 [data-v129la="anim"][data-val="words"]');await p.waitForTimeout(200);
o.text=await E(`(()=>{const l=__v129.E.p.layers.find(x=>x.type==='text');return l.anim+' '+l.snd})()`);
o.rows=await p.evaluate(()=>[...document.querySelectorAll('#v129tl .v129rl')].map(x=>x.textContent));
const shots=[];for(const t of [1.0,2.3,3.4]){await p.evaluate(t=>{window.__v129.E.t=t},t);await p.evaluate(()=>{const s=document.getElementById('v129sl');});await p.waitForTimeout(150);await E(`(()=>{const e=new Event('x');return 1})()`);}
await p.evaluate(()=>{window.__v129.E.t=2.35});await p.click('#v129 [data-v129tab="style"]');await p.waitForTimeout(500);
await p.screenshot({path:mob?'ux/v130_p.png':'ux/v130_d.png'});
await p.click('#v129 [data-v129tab="fx"]');await p.waitForTimeout(500);await p.screenshot({path:mob?'ux/v130_pro_p.png':'ux/v130_pro_d.png'});
o.proTab=await p.evaluate(()=>({steps:document.querySelectorAll('#v129 [data-v129pro]').length,sigs:document.querySelectorAll('#v129 .v129sigs button').length}));
if(!mob){await E(`__v129.E.p.kit.quality='fast'`);var T0=Date.now();await p.click('#v129 [data-v129="export"]');await p.waitForFunction(()=>document.querySelectorAll('#v129 .v129out').length>0,null,{timeout:90000});
 const [dl]=await Promise.all([p.waitForEvent('download'),p.click('#v129 .v129out a')]);await dl.saveAs('tv/v130_'+dl.suggestedFilename());o.saved=dl.suggestedFilename();o.exportSec=(Date.now()-T0)/1000;console.error("exported",o.exportSec);
 await p.click("#v129 [data-v129tab=\"fx\"]");await p.waitForTimeout(300);
 o.pro=await E(`(async()=>{const V=window.__vid;const docs=[],fired=[];V.VD.assets={upload:async f=>({id:'a1',url:'u1',sizeBytes:f.size})};V.VD.db={collection:()=>({doc:()=>({set:async d=>{docs.push(d)},update:async u=>{docs.push(u)}})})};V.editVideo=async d=>{fired.push(d.id);return true};
  __v129.E.p.fx=[{id:'shatter',word:'וילות'}];document.querySelector('#v129 [data-v129="fxadd"]')&&0;await (async()=>{document.querySelector('#v129 [data-v129="pro"]').click()})();await new Promise(r=>setTimeout(r,1500));
  const d=docs[0]||{};return {n:docs.length,fired:fired.length,steps:d.pro&&d.pro.steps,sig:d.sig&&d.sig.map(x=>x.kind),edit:d.edit&&d.edit.layers.length,look:d.edit&&d.edit.look}})()`);
 // a library card's edit button opens the editor, it does not fire the cloud
 o.lib=await E(`(async()=>{const V=window.__vid;let fired=0;V.editVideo=async()=>{fired++};V.VD.docs=[{id:'d1',name:'מהספרייה',srcUrl:'tv/a.webm',status:'queued',created:new Date().toISOString()}];APP.view='videos';render();await new Promise(r=>setTimeout(r,700));const bt=document.querySelector('.v100c[data-vid="d1"] [data-v100="edit"]');const label=bt&&bt.textContent;bt&&bt.click();await new Promise(r=>setTimeout(r,1500));return {label,view:APP.view,fired}})()`)}
o.over=await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth);o.errors=errs.slice(0,4);await ctx.close()}
console.log(JSON.stringify(out,null,1));await b.close()})().catch(e=>{console.error('FATAL',e);process.exit(1)});
