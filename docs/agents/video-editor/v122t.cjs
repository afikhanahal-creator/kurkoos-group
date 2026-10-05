const {chromium}=require('playwright-core');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox']});const out={};
for(const mob of [false,true]){const ctx=await b.newContext(mob?{viewport:{width:390,height:844},isMobile:true,hasTouch:true}:{viewport:{width:1440,height:860}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{localStorage.setItem('pro_seen','true');localStorage.setItem('ag_v104_done_v1','1');localStorage.setItem('ag_v107_done_v1','1');localStorage.setItem('ag_v110_done_v2','1')});
await p.goto('http://localhost:8765/t15.html');await p.waitForTimeout(7000);const E=s=>p.evaluate(s=>window.__E(s),s);const o=out[mob?'phone':'desktop']={};
await E(`const d=AG.posts.find(x=>/^x_t_/.test(x.layout)&&!x.tpl&&peSlots(x).length);peOpen(d||AG.posts.find(x=>/^(ed|x)_/.test(x.layout)&&!x.tpl));PE.tab='shape';peRender()`);await p.waitForTimeout(1200);
// template picker
await p.evaluate(()=>{const b=document.querySelector('[data-v66open]');b&&b.click()});await p.waitForTimeout(2500);
o.tpl=await p.evaluate(()=>{const r=document.getElementById('v66tp');if(!r)return 'no picker';const tile=r.querySelector('.v66c');const cv=tile&&tile.querySelector('canvas');const g=r.querySelector('.v66g');const cols=getComputedStyle(g).gridTemplateColumns.split(' ').length;return {cls:[...r.classList].join(' '),ctrl:!!r.querySelector('.v122sz'),cols,tileW:Math.round(tile.getBoundingClientRect().width),cvAttr:cv.width+'x'+cv.height,bigBtn:!!r.querySelector('[data-v122="open"]')}});
await p.screenshot({path:mob?'v122_p1.png':'v122_d1.png'});
// size S then L
await p.evaluate(()=>document.querySelector('#v66tp [data-v122="size"][data-k="S"]').click());await p.waitForTimeout(900);
o.tplS=await p.evaluate(()=>{const r=document.getElementById('v66tp');const tile=r.querySelector('.v66c');return {cols:getComputedStyle(r.querySelector('.v66g')).gridTemplateColumns.split(' ').length,tileW:Math.round(tile.getBoundingClientRect().width),cv:tile.querySelector('canvas').width}});
await p.evaluate(()=>document.querySelector('#v66tp [data-v122="size"][data-k="L"]').click());await p.waitForTimeout(900);
o.tplL=await p.evaluate(()=>{const r=document.getElementById('v66tp');const tile=r.querySelector('.v66c');return {cols:getComputedStyle(r.querySelector('.v66g')).gridTemplateColumns.split(' ').length,tileW:Math.round(tile.getBoundingClientRect().width),cv:tile.querySelector('canvas').width,stored:localStorage.getItem('v122_size')}});
// lightbox: open, next, apply
await p.evaluate(()=>document.querySelector('#v66tp [data-v122="open"]').click());await p.waitForTimeout(900);
o.lb=await p.evaluate(()=>{const lb=document.getElementById('v122big');if(!lb)return 'none';const cv=lb.querySelector('canvas');const r=cv.getBoundingClientRect();const px=cv.getContext('2d').getImageData(540,675,1,1).data;return {h:Math.round(r.height),w:Math.round(r.width),drawn:px[3]>0,title:lb.querySelector('.v122top b').textContent.slice(0,30),btns:[...lb.querySelectorAll('[data-v122]')].map(b=>b.dataset.v122)}});
await p.screenshot({path:mob?'v122_p2.png':'v122_d2.png'});
const before=await E(`PE.p.layout`);
await p.evaluate(()=>document.querySelector('#v122big [data-v122="next"]').click());await p.waitForTimeout(700);
o.next=await p.evaluate(()=>{const r=document.getElementById('v66tp');const sel=r.querySelector('.v66c[aria-pressed="true"]');return {sel:sel&&sel.dataset.v66k,idx:[...r.querySelectorAll('.v66c')].indexOf(sel)}});
await p.evaluate(()=>document.querySelector('#v122big [data-v122="apply"]').click());await p.waitForTimeout(1200);
o.applied=await E(`JSON.stringify({layout:PE.p.layout,changed:PE.p.layout!=='${before}',picker:!!document.getElementById('v66tp'),lb:!!document.getElementById('v122big')})`);
// shapes library
await p.evaluate(()=>{const b=document.querySelector('[data-v68open]');b&&b.click()});await p.waitForTimeout(2500);
o.shapes=await p.evaluate(()=>{const r=document.getElementById('v68sp');if(!r)return 'no lib';const tile=r.querySelector('.v68c');const cv=tile.querySelector('canvas');return {cls:[...r.classList].join(' '),ctrl:!!r.querySelector('.v122sz'),cols:getComputedStyle(r.querySelector('.v68g')).gridTemplateColumns.split(' ').length,tileW:Math.round(tile.getBoundingClientRect().width),cv:cv.width}});
await p.screenshot({path:mob?'v122_p3.png':'v122_d3.png'});
await p.evaluate(()=>{const b=document.querySelector('#v68sp [data-v122="open"]');if(b)b.click()});await p.waitForTimeout(700);
o.shapesLb=await p.evaluate(()=>{const lb=document.getElementById('v122big');return lb?{btns:[...lb.querySelectorAll('[data-v122]')].map(b=>b.dataset.v122)}:'none'});
// Esc closes the lightbox only
await p.keyboard.press('Escape');await p.waitForTimeout(400);
o.esc=await p.evaluate(()=>({lb:!!document.getElementById('v122big'),lib:!!document.getElementById('v68sp')}));
await p.evaluate(()=>{const b=document.querySelector('#v68sp [data-v68="x"]');if(b)b.click()});await p.waitForTimeout(400);
await E('peClose(true)');o.errors=errs.slice(0,3);await ctx.close()}
console.log(JSON.stringify(out,null,1));await b.close()})().catch(e=>{console.error('FATAL',e);process.exit(1)});
