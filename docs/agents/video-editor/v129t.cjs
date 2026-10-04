const {chromium}=require('playwright-core');const TV=__dirname+'/tv/';
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});const out={};
for(const mob of [false,true]){const ctx=await b.newContext(mob?{viewport:{width:390,height:844},isMobile:true,hasTouch:true,acceptDownloads:true}:{viewport:{width:1440,height:900},acceptDownloads:true});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{localStorage.setItem('pro_seen','true');localStorage.setItem('ag_v104_done_v1','1');localStorage.setItem('ag_v107_done_v1','1');localStorage.setItem('ag_v110_done_v2','1');localStorage.removeItem('vid_kit');localStorage.removeItem('v129_projects')});
await p.goto('http://localhost:8765/t15.html');await p.waitForTimeout(7000);const E=s=>p.evaluate(s=>window.__E(s),s);const o=out[mob?'phone':'desktop']={};
await E(`APP.view='videos';render()`);await p.waitForTimeout(1200);
o.auto=await E(`window.__vid.VD.auto`);
await p.setInputFiles('#v127 input[data-v127f]',[TV+'a.webm',TV+'b.webm']);await p.waitForTimeout(2500);
o.footer=await p.evaluate(()=>[...document.querySelectorAll('#v127 .v127foot .px-btn')].map(x=>x.textContent));
if(!mob){await p.click('#v127 [data-v127k="quality"][data-val="fast"]');await p.click('#v127 .v127it:nth-child(2) [data-v127="pick"]');await p.waitForTimeout(400);
 await p.click('#v127 [data-v127="export"]');await p.waitForFunction(()=>document.querySelectorAll('#v127 .v127out').length>0,null,{timeout:60000});
 o.trayExport=await p.evaluate(()=>[...document.querySelectorAll('#v127 .v127out b')].map(x=>x.textContent))}
// open the first in the editor
await p.click('#v127 .v127it:nth-child(1) [data-v129="open"]');await p.waitForTimeout(1800);
o.view=await E(`APP.view`);o.title=await p.evaluate(()=>document.querySelector('#v129 .v129name')&&document.querySelector('#v129 .v129name').value);
const mean=()=>p.evaluate(()=>{const c=document.getElementById('v129cv');const x=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let s=0,n=0;for(let i=0;i<x.length;i+=4000){s+=x[i]+x[i+1]+x[i+2];n++}return {w:c.width,h:c.height,mean:Math.round(s/n/3)}});
await E(`__v129.E.t=2.3;__v129.E.p&&0`);await p.evaluate(()=>{window.__v129.E.t=2.3});await p.click('#v129 [data-v129tab="text"]');await p.waitForTimeout(200);
await p.fill('#v129paste','אנחנו קבוצת קורקוס ובונים כל בית כמו שצריך מהשרטוט ועד המפתח');await p.click('#v129 [data-v129="spread"]');await p.waitForTimeout(300);
await p.click('#v129 [data-v129="addtext"]');await p.waitForTimeout(300);await p.fill('#v129 [data-v129l="text"]','מהשרטוט ועד המפתח');
await p.click('#v129 [data-v129tab="el"]');await p.waitForTimeout(200);await p.click('#v129 [data-v129="addel"][data-el="ring"]');await p.waitForTimeout(200);await p.click('#v129 [data-v129="addel"][data-el="logo"]');await p.waitForTimeout(200);
await p.click('#v129 [data-v129tab="sound"]');await p.waitForTimeout(200);await p.click('#v129 [data-v129="addsfx"][data-n="sig-slam"]');await p.setInputFiles('#v129 input[data-v129m]',TV+'music.wav');await p.waitForTimeout(400);
// drag the selected element on the canvas
const cv=await p.locator('#v129cv').boundingBox();o.layersBefore=await E(`__v129.E.p.layers.map(l=>l.type+':'+(l.x||0).toFixed(2)).join(' ')`);
await p.evaluate(()=>{window.__v129.E.t=2.6});await p.evaluate(()=>window.__v129.E&&0);
await p.mouse.move(cv.x+cv.width*0.5,cv.y+cv.height*0.42);await p.mouse.down();await p.mouse.move(cv.x+cv.width*0.3,cv.y+cv.height*0.3,{steps:5});await p.mouse.up();await p.waitForTimeout(200);
o.layersAfter=await E(`__v129.E.p.layers.map(l=>l.type+':'+(l.x||0).toFixed(2)).join(' ')`);
await p.click('#v129 [data-v129="ver"]');await p.waitForTimeout(200);await p.click('#v129 [data-v129="undo"]');await p.waitForTimeout(200);
o.state=await E(`({layers:__v129.E.p.layers.length,sfx:__v129.E.p.sfx.length,versions:__v129.E.p.versions.length,music:!!__v129.E.p.music})`);
await p.evaluate(()=>{window.__v129.E.t=3.0});await p.click('#v129 [data-v129tab="brand"]');await p.waitForTimeout(500);o.canvas=await mean();
await p.screenshot({path:mob?'ux/v129_p.png':'ux/v129_d.png'});
if(!mob){await p.click("#v129 [data-v129=\"export\"]");await p.waitForTimeout(20000);o.dbg=await E(`({busy:__v129.E.busy,outs:__v129.E.outs.length,t:__v129.E.t})`);console.log(JSON.stringify(o.dbg),errs);await p.waitForFunction(()=>document.querySelectorAll("#v129 .v129out").length>0,null,{timeout:60000});
 o.exp=await p.evaluate(()=>document.querySelector('#v129 .v129out small').textContent);const [dl]=await Promise.all([p.waitForEvent('download'),p.click('#v129 .v129out a')]);await dl.saveAs('tv/ed_'+dl.suggestedFilename());o.saved=dl.suggestedFilename();
 await p.screenshot({path:'ux/v129_d2.png'});
 // library card has the editor button; a doc project opens too
 o.libBtn=await E(`(async()=>{window.__vid.VD.docs=[{id:'d1',name:'מהספרייה',srcUrl:'tv/a.webm',status:'library',created:new Date().toISOString()}];APP.view='videos';render();await new Promise(r=>setTimeout(r,600));const bt=document.querySelector('.v100c[data-vid="d1"] [data-v129="open"]');if(!bt)return 'none';bt.click();await new Promise(r=>setTimeout(r,1500));return APP.view+' '+(document.querySelector('#v129 .v129name')||{}).value})()`)}
o.over=await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth);o.errors=errs.slice(0,4);await ctx.close()}
console.log(JSON.stringify(out,null,1));await b.close()})().catch(e=>{console.error('FATAL',e);process.exit(1)});
