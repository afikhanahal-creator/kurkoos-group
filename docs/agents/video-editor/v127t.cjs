const {chromium}=require('playwright-core');const fs=require('fs');
const TV=__dirname+'/tv/';
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});const out={};
for(const mob of [false,true]){const ctx=await b.newContext(mob?{viewport:{width:390,height:844},isMobile:true,hasTouch:true,acceptDownloads:true}:{viewport:{width:1440,height:900},acceptDownloads:true});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{localStorage.setItem('pro_seen','true');localStorage.setItem('ag_v104_done_v1','1');localStorage.setItem('ag_v107_done_v1','1');localStorage.setItem('ag_v110_done_v2','1');localStorage.removeItem('vid_kit')});
await p.goto('http://localhost:8765/t15.html');await p.waitForTimeout(7000);const E=s=>p.evaluate(s=>window.__E(s),s);const o=out[mob?'phone':'desktop']={};
await E(`APP.view='videos';render()`);await p.waitForTimeout(1500);
o.order=await p.evaluate(()=>[...document.querySelectorAll('#v100page > section')].slice(0,3).map(s=>s.id||s.className));
o.dropText=await p.evaluate(()=>document.querySelector('#v100page .v100drop b').textContent);
// several files through the top drop zone input: they must land in the tray, not upload
await p.setInputFiles('#v100page input[data-v100f]',[TV+'a.webm',TV+'b.webm']);await p.waitForTimeout(2500);
o.tray=await p.evaluate(()=>({n:document.querySelectorAll('#v127 .v127it').length,thumbs:[...document.querySelectorAll('#v127 .v127th img')].length,meta:[...document.querySelectorAll('#v127 .v127meta small')].map(x=>x.textContent)}));
// a real drop of a third file on the tray
const dt=await p.evaluateHandle(async()=>{const r=await fetch('tv/b.webm');const f=new File([await r.blob()],'שלישי.webm',{type:'video/webm'});const d=new DataTransfer();d.items.add(f);return d});
await p.dispatchEvent('#v127 [data-v127drop]','drop',{dataTransfer:dt});await p.waitForTimeout(1500);
o.afterDrop=await p.evaluate(()=>document.querySelectorAll('#v127 .v127it').length);
await p.click('#v127 [data-v127="del"] >> nth=2');await p.waitForTimeout(300);
await p.click('#v127 [data-v127="down"] >> nth=0');await p.waitForTimeout(300);
o.reordered=await p.evaluate(()=>[...document.querySelectorAll('#v127 .v127nm')].map(x=>x.value));
await p.setInputFiles('#v127 input[data-v127m]',TV+'music.wav');await p.waitForTimeout(400);
await p.fill('#v127 [data-v127t="introText"]','כל פרויקט מתחיל בשרטוט');
await p.click('#v127 [data-v127k="intro"][data-val="headline"]');await p.click('#v127 [data-v127k="outro"][data-val="cta"]');
await p.fill('#v127 [data-v127t="cta"]','דברו איתנו');await p.fill('#v127 [data-v127t="ltitle"]','פרויקט בדיקה');
await p.waitForTimeout(400);
const shots={};for(const [k,t] of [['intro',1.6],['clip',4.6],['outro',99]]){await p.evaluate(t=>{const s=document.getElementById('v127sl');s.value=t;s.dispatchEvent(new Event('input',{bubbles:true}))},t);await p.waitForTimeout(700);
 shots[k]=await p.evaluate(()=>{const c=document.getElementById('v127cv');const x=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let s=0,n=0;for(let i=0;i<x.length;i+=4000){s+=x[i]+x[i+1]+x[i+2];n++}return {w:c.width,h:c.height,mean:Math.round(s/n/3)}});
 await p.locator('#v127cv').screenshot({path:`ux/v127_${mob?'p':'d'}_${k}.png`})}
o.preview=shots;
o.kit=await p.evaluate(()=>JSON.parse(localStorage.getItem('vid_kit')));
await p.screenshot({path:mob?'ux/v127_p.png':'ux/v127_d.png',fullPage:false});
await p.evaluate(()=>document.getElementById('v127').scrollIntoView());await p.waitForTimeout(300);await p.screenshot({path:mob?'ux/v127_p2.png':'ux/v127_d2.png'});
o.over=await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
if(!mob){ // export: joined, fast quality
 await p.click('#v127 [data-v127k="mode"][data-val="merge"]');await p.click('#v127 [data-v127k="quality"][data-val="fast"]');await p.waitForTimeout(300);
 o.mime=await p.evaluate(()=>['video/mp4','video/webm'].map(m=>m+':'+MediaRecorder.isTypeSupported(m)).join(' '));
 const t0=Date.now();await p.click('#v127 [data-v127="export"]');
 await p.waitForFunction(()=>document.querySelectorAll('#v127 .v127out').length>0,null,{timeout:60000});o.exportSec=(Date.now()-t0)/1000;
 o.outs=await p.evaluate(()=>[...document.querySelectorAll('#v127 .v127out')].map(x=>x.querySelector('b').textContent+' | '+x.querySelector('small').textContent));
 const [dl]=await Promise.all([p.waitForEvent('download'),p.click('#v127 .v127out a')]);await dl.saveAs('tv/out_'+dl.suggestedFilename().replace(/[^\w.]/g,'_'));o.saved=dl.suggestedFilename();
 // sending to the editor carries the kit and parts (fake runtime)
 o.sent=await E(`(async()=>{const V=window.__vid;const docs=[],fired=[];const sv={db:V.VD.db,assets:V.VD.assets,ed:V.editVideo};V.VD.assets={upload:async f=>({id:'a'+docs.length+Math.random().toString(36).slice(2,5),url:'u',sizeBytes:f.size})};V.VD.db={collection:()=>({doc:()=>({set:async d=>{docs.push(d)}})})};V.editVideo=async d=>{fired.push(d.id);return true};
  document.querySelector('#v127 [data-v127="send"]').click();await new Promise(r=>setTimeout(r,1500));V.VD.db=sv.db;V.VD.assets=sv.assets;V.editVideo=sv.ed;return docs.map(d=>({name:d.name,mode:d.mode,parts:d.parts&&d.parts.length,kit:d.kit&&[d.kit.pal,d.kit.intro,d.kit.outro,d.kit.music&&d.kit.music.name].join(','),pro:!!d.pro}))})()`);
}
o.errors=errs.slice(0,3);await ctx.close()}
console.log(JSON.stringify(out,null,1));await b.close()})().catch(e=>{console.error('FATAL',e);process.exit(1)});
