const {chromium}=require('playwright-core');const fs=require('fs');
const docs={};for(const f of fs.readdirSync(__dirname+'/mig/photos'))docs[f.replace('.json','')]=JSON.parse(fs.readFileSync(__dirname+'/mig/photos/'+f,'utf8'));
const IMG=fs.readFileSync(__dirname+'/photos/'+fs.readdirSync(__dirname+'/photos').find(x=>/\.jpg$/.test(x)));
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox']});const out={};
for(const tag of ['d','p']){const ctx=await b.newContext(tag==='p'?{viewport:{width:390,height:844},isMobile:true,hasTouch:true}:{viewport:{width:1440,height:900}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));const o=out[tag]={};
await p.route('https://filnzlnvujnlazwcxbuq.supabase.co/**',r=>r.fulfill({status:200,contentType:'image/jpeg',body:IMG}));
await p.route('https://www.kurkoos-group.co.il/**',r=>r.fulfill({status:200,contentType:'image/jpeg',body:IMG}));
await p.addInitScript(()=>{localStorage.setItem('pro_seen','true');localStorage.setItem('ag_v104_done_v1','1');localStorage.setItem('ag_v107_done_v1','1');localStorage.setItem('ag_v110_done_v2','1');localStorage.removeItem('v144_f')});
await p.goto('http://localhost:8765/t15.html');await p.waitForTimeout(7000);const E=s=>p.evaluate(s=>window.__E(s),s);
await p.evaluate(d=>window.__E(`(d=>{const ph=Object.values(PHOTO_LIB).filter(u=>/^photos\\//.test(u));let i=0;for(const [id,m] of Object.entries(d)){m.url=ph[i%ph.length]+'?u='+(i++);regUpload(id,m)}
 KC.assets={upload:async f=>{const id='t'+Math.random().toString(16).slice(2);const u=URL.createObjectURL(f);return {id,url:u,sizeBytes:f.size}},delete:async()=>{}};
 window.__w=[];KC.db={collection:c=>({doc:id=>({set:async d=>{__w.push(['set',c,id,d.project])},update:async d=>{__w.push(['upd',c,id,d.project])},delete:async()=>{__w.push(['del',c,id])}})})}})`)(d),docs);
await E(`APP.view='photos';render()`);await p.waitForTimeout(1500);
o.nav=await p.evaluate(()=>!!document.querySelector('[data-view="photos"]'));
o.sum=await p.evaluate(()=>[...document.querySelectorAll('.v144sum button')].map(b=>b.innerText.replace(/\n/g,' ')));
o.groups=await p.evaluate(()=>[...document.querySelectorAll('.v144g h4')].slice(0,14).map(h=>h.innerText.replace(/\n/g,' ')));
o.tiles=await p.evaluate(()=>document.querySelectorAll('.v144t').length);
await p.screenshot({path:`v144_${tag}_all.png`});
// missing tab
await p.click('.v144sum .v144warn');await p.waitForTimeout(600);
o.missLead=await p.evaluate(()=>(document.querySelector('.v144lead')||{}).innerText);
o.missGroups=await p.evaluate(()=>[...document.querySelectorAll('.v144g h4')].slice(0,8).map(h=>h.innerText.replace(/\n/g,' ')));
await p.screenshot({path:`v144_${tag}_miss.png`});
const before=await E(`__v144.missing(__v144.inventory()).length`);
await p.locator('[data-v144="imp"]').first().click();await p.waitForTimeout(2500);
o.importOne=[before,await E(`__v144.missing(__v144.inventory()).length`)];
// group import
await p.locator('[data-v144="impgrp"]').first().click();await p.waitForTimeout(6000);
o.afterGroup=await E(`__v144.missing(__v144.inventory()).length`);
// lightbox + project on an upload
await p.click('.v144chips [data-k="up"]');await p.waitForTimeout(500);
o.upTiles=await p.evaluate(()=>document.querySelectorAll('.v144t').length);
await p.locator('.v144t').first().click();await p.waitForTimeout(500);
o.lb=await p.evaluate(()=>{const l=document.querySelector('.v144lb');return l?l.innerText.replace(/\n/g,' | ').slice(0,300):null});
await p.screenshot({path:`v144_${tag}_lb.png`});
await p.selectOption('.v144lb select[data-v144="proj"]','ramhal');await p.waitForTimeout(500);
o.writes=await E(`__w.slice(-2)`);
await p.keyboard.press('Escape');await p.waitForTimeout(300);o.lbClosed=await p.evaluate(()=>!document.querySelector('.v144lb'));
// search
await p.fill('[data-v144q]','רמח');await p.waitForTimeout(600);o.search=await p.evaluate(()=>document.querySelectorAll('.v144t').length);
o.overflow=await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
o.errors=errs.slice(0,5);await ctx.close()}
console.log(JSON.stringify(out,null,1));await b.close()})().catch(e=>{console.error('FATAL',e);process.exit(1)});
