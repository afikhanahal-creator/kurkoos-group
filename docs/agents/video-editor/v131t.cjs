const {chromium}=require('playwright-core');const TV=__dirname+'/tv/';
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});const out={};
for(const mob of [false,true]){const ctx=await b.newContext(mob?{viewport:{width:390,height:844},isMobile:true,hasTouch:true}:{viewport:{width:1440,height:900}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{localStorage.setItem('pro_seen','true');localStorage.setItem('ag_v104_done_v1','1');localStorage.setItem('ag_v107_done_v1','1');localStorage.setItem('ag_v110_done_v2','1');localStorage.removeItem('vid_kit');localStorage.removeItem('v129_projects');localStorage.removeItem('v128_seq')});
await p.goto('http://localhost:8765/t15.html');await p.waitForTimeout(7000);const E=s=>p.evaluate(s=>window.__E(s),s);const o=out[mob?'phone':'desktop']={};
await E(`APP.view='videos';render()`);await p.waitForTimeout(1200);
await p.setInputFiles('#v127 input[data-v127f]',[TV+'a.webm',TV+'b.webm',TV+'big.webm']);await p.waitForTimeout(3500);
o.tray=await p.evaluate(()=>[...document.querySelectorAll('#v127 .v127it')].map(x=>{const th=x.querySelector('.v127th').getBoundingClientRect();return {w:Math.round(th.width),h:Math.round(th.height),btn:(x.querySelector('.v129go')||{}).textContent,meta:x.querySelector('small').textContent}}));
await p.evaluate(()=>document.getElementById('v127').scrollIntoView());await p.waitForTimeout(300);await p.screenshot({path:mob?'ux/v131_tray_p.png':'ux/v131_tray_d.png'});
// effects studio: add effects, see the next step bar and the video tiles
await p.click('#v128 [data-v128="add"][data-id="shatter"]');await p.waitForTimeout(400);await p.click('#v128 [data-v128="add"][data-id="flip"]');await p.waitForTimeout(600);
o.bar=await p.evaluate(()=>{const b=document.getElementById('v130sb');return b&&[b.querySelector('b').textContent,b.querySelector('small').textContent,b.querySelector('button').textContent]});
o.tiles=await p.evaluate(()=>document.querySelectorAll('#v128 .v130tiles button').length);
await p.click('#v128 .v130tiles button:nth-child(3)');await p.waitForTimeout(200);o.target=await p.evaluate(()=>document.querySelector('#v128 .v128tgt select').value.slice(0,5));
await p.click('#v130sb [data-v130="start"]');await p.waitForTimeout(400);o.focusMissing=await p.evaluate(()=>document.activeElement&&document.activeElement.dataset.k);
await p.fill('#v128 .v128row:nth-child(1) input[data-k="word"]','וילות');await p.fill('#v128 .v128row:nth-child(2) input[data-k="word"]','כל');await p.waitForTimeout(400);
o.bar2=await p.evaluate(()=>document.querySelector('#v130sb small').textContent);
await p.evaluate(()=>document.querySelector('#v128 .v128seq').scrollIntoView());await p.waitForTimeout(300);await p.screenshot({path:mob?'ux/v131_studio_p.png':'ux/v131_studio_d.png'});
if(!mob){// the big one goes to the editor through the browser compression
 o.big=await E(`(async()=>{const V=window.__vid;const ups=[],fired=[];V.VD.assets={upload:async f=>{ups.push(f.size);return {id:'a1',url:'u1',sizeBytes:f.size}}};V.VD.db={collection:()=>({doc:()=>({set:async d=>{},update:async u=>{}})})};V.editVideo=async d=>{fired.push(d.id);return true};
  const t0=Date.now();document.querySelector('#v130sb [data-v130="start"]').click();for(let i=0;i<120&&!fired.length;i++)await new Promise(r=>setTimeout(r,500));return {uploadedMB:ups.map(x=>+(x/1048576).toFixed(1)),fired:fired.length,sec:(Date.now()-t0)/1000}})()`)}
// the editor action bar
await E(`APP.view='videos';render()`);await p.waitForTimeout(600);await p.click('#v127 .v127it:nth-child(1) .v129go');await p.waitForTimeout(1800);
o.ebar=await p.evaluate(()=>{const b=document.querySelector('.v130ebar');return b&&{p:b.querySelector('p').textContent.slice(0,60),btns:[...b.querySelectorAll('.px-btn')].map(x=>x.textContent+(x.classList.contains('pri')?'*':''))}});
await p.click('#v129 [data-v129="recipe"][data-id="brand"]');await p.click('#v129 [data-v129="auto"]');await p.waitForTimeout(600);
o.ebar2=await p.evaluate(()=>{const b=document.querySelector('.v130ebar');return [b.querySelector('p').textContent.slice(0,50),[...b.querySelectorAll('.v130steps li.on')].length]});
await p.screenshot({path:mob?'ux/v131_ed_p.png':'ux/v131_ed_d.png'});
o.over=await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth);o.errors=errs.slice(0,4);await ctx.close()}
console.log(JSON.stringify(out,null,1));await b.close()})().catch(e=>{console.error('FATAL',e);process.exit(1)});
