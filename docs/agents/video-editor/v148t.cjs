const {chromium}=require('playwright-core');const fs=require('fs');
const docs={};for(const f of fs.readdirSync(__dirname+'/mig3/photos'))docs[f.replace('.json','')]=JSON.parse(fs.readFileSync(__dirname+'/mig3/photos/'+f,'utf8'));
const batch=JSON.parse(fs.readFileSync(__dirname+'/mig3/batches/drive1.json','utf8'));
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox']});const out={};
for(const tag of ['d','p']){const ctx=await b.newContext(tag==='p'?{viewport:{width:390,height:844},isMobile:true,hasTouch:true}:{viewport:{width:1440,height:900}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));const o=out[tag]={};
await p.addInitScript(()=>{localStorage.setItem('pro_seen','true');localStorage.removeItem('v148_hid');localStorage.removeItem('v144_f')});
await p.goto('http://localhost:8765/t15.html');await p.waitForTimeout(7000);const E=s=>p.evaluate(s=>window.__E(s),s);
await p.evaluate(([d,bt])=>window.__E(`((d,bt)=>{const ph=Object.values(PHOTO_LIB).filter(u=>/^photos\\//.test(u));let i=0;for(const [id,m] of Object.entries(d)){m.url=ph[i%ph.length]+'?u='+(i++);regUpload(id,m)}
 bt.items.slice(0,12).forEach((it,j)=>{const m=Object.assign({},it.meta,{url:j%4===0?'/nope/'+j+'.jpg':ph[j%ph.length]+'?b='+j,batch:'drive1'});regUpload(it.id,m)});
 window.__w=[];const coll=c=>({doc:id=>({get:async()=>({exists:false,data:()=>null}),set:async d=>{__w.push(['set',c,id,JSON.stringify(d).slice(0,80)])},update:async d=>{__w.push(['upd',c,id,JSON.stringify(d)])},delete:async()=>{__w.push(['del',c,id])}})});
 KC.db={collection:coll,doc:path=>{const [c,id]=path.split('/');return coll(c).doc(id)}};KC.assets={upload:async()=>({id:'x',url:'x'}),delete:async()=>{}}})`)(d,bt),[docs,batch]);
await E(`APP.view='photos';render()`);await p.waitForTimeout(2500);
o.title=await p.evaluate(()=>document.getElementById('vt').textContent);
o.chips=await p.evaluate(()=>[...document.querySelectorAll('.v144chips button:not([hidden])')].map(b=>b.innerText.replace(/\n/g,' ')));
const before=await E(`Object.keys(PHOTO_LIB).length`);
// selection: pick 3 drive photos and remove
await p.click('[data-v144="selmode"]');await p.waitForTimeout(400);
const ks=await p.evaluate(()=>[...document.querySelectorAll('.v144grid [data-v144="pick"]')].filter(x=>/u_/.test(x.dataset.k)).slice(0,3).map(x=>x.dataset.k));
for(const k of ks){await p.click(`[data-v144="pick"][data-k="${k}"]`)}
o.barText=await p.evaluate(()=>document.querySelector('.v148bar b').textContent);
await p.screenshot({path:`v148_${tag}_sel.png`});
await p.click('[data-v144="hidesel"]');await p.waitForTimeout(800);
o.removed=[before,await E(`Object.keys(PHOTO_LIB).length`)];o.saved=await E(`__w.filter(x=>x[2]==='photo_hidden').length`);
await p.click('.v144chips [data-k="hidden"]');await p.waitForTimeout(500);o.hiddenTiles=await p.evaluate(()=>document.querySelectorAll('[data-v144="unhide"]').length);
await p.screenshot({path:`v148_${tag}_hidden.png`});
await p.locator('[data-v144="unhide"]').first().click();await p.waitForTimeout(500);o.afterUnhide=await E(`Object.keys(PHOTO_LIB).length`);
// broken chip
await p.click('.v144chips [data-k="all"]');await p.waitForTimeout(2500);o.broken=await p.evaluate(()=>{const c=document.getElementById('v148brk');return c&&!c.hidden?c.innerText.replace(/\n/g,' '):null});
// lightbox remove for a built-in
await p.evaluate(()=>{const t=[...document.querySelectorAll('.v144grid [data-v144="open"]')].find(x=>/^n\d/.test(x.dataset.k));t&&t.click()});await p.waitForTimeout(400);
o.lbButtons=await p.evaluate(()=>[...document.querySelectorAll('.v144lbact button, .v144lbact a')].map(b=>b.textContent));
await p.click('[data-v144="hide1"]');await p.waitForTimeout(500);o.hidCount=await E(`__v148.HID.size`);
// editor: x on library tile
const q=await E(`(()=>{const q=AG.posts.find(p=>/^(ed|x)_/.test(p.layout)&&peSlots(p).length);peOpen(q);return q.id})()`);await p.waitForTimeout(1200);await p.evaluate(()=>{const t=[...document.querySelectorAll('#pe-root button, #pe-root [role=tab]')].find(b=>b.textContent.trim()==='תמונה');t&&t.click()});await p.waitForTimeout(1500);
o.editorX=await p.evaluate(()=>document.querySelectorAll('#pe-root .v148x').length);o.galleryBtn=await p.evaluate(()=>!!document.querySelector('#pe-root [data-v148g]'));
if(o.editorX){const k=await p.evaluate(()=>document.querySelector('#pe-root .v148x').closest('.v115t').dataset.k);await p.locator('#pe-root .v148x').first().click({force:true});await p.waitForTimeout(800);o.editorHid=await E(`__v148.HID.has('${k}')`)}
await p.screenshot({path:`v148_${tag}_editor.png`});
// templates: shape tab click a template
await p.evaluate(()=>{const t=[...document.querySelectorAll('#pe-root button, #pe-root [role=tab]')].find(b=>b.textContent.trim()==='צורה');t&&t.click()});await p.waitForTimeout(1500);
await p.evaluate(()=>{const t=[...document.querySelectorAll('#pe-root button')].find(b=>/^תבניות/.test(b.textContent.trim()));t&&t.click()});await p.waitForTimeout(1200);await p.evaluate(()=>{const x=document.querySelector('[data-v66="x"]');x&&x.click()});await p.waitForTimeout(600);const lay=await p.evaluate(()=>{const t=document.querySelector('.pe-tpl [data-pe-lay]');if(t){t.scrollIntoView();return t.dataset.peLay}return null});
if(lay){await p.locator('.pe-tpl [data-pe-lay]').first().click();await p.waitForTimeout(1500);o.tplFull=await p.evaluate(()=>!!document.getElementById('v66tp'));await p.screenshot({path:`v148_${tag}_tpl.png`})}
o.errors=errs.slice(0,4);await ctx.close()}
console.log(JSON.stringify(out,null,1));await b.close()})().catch(e=>{console.error('FATAL',e);process.exit(1)});
