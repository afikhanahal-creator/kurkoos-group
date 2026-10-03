const {chromium}=require('playwright-core');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox']});
const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{localStorage.setItem('pro_seen','true');localStorage.setItem('ag_v104_done_v1','1');localStorage.setItem('ag_v107_done_v1','1')});await p.goto('http://localhost:8765/t15.html');await p.waitForTimeout(8000);
const E=s=>p.evaluate(s=>window.__E(s),s);const out=global.out={};process.on('exit',()=>console.log('OUT',JSON.stringify(global.out,null,1)));
const tapSel=async sel=>{const r=await p.evaluate(sel=>{const el=document.querySelector(sel);if(!el)return null;const b=el.getBoundingClientRect();return [b.x+b.width/2,b.y+b.height/2]},sel);if(!r)throw new Error('no '+sel);await p.touchscreen.tap(r[0],r[1]);return r};
// 1. back gesture: lightbox on gallery closes, view stays gallery
await E(`APP.view='queue';render()`);await p.waitForTimeout(500);await E(`APP.view='gallery';render()`);await p.waitForTimeout(900);
await E(`GA.lb={ids:[AG.posts[0].id],i:0};gaLbRender()`);await p.waitForTimeout(700);
await p.goBack();await p.waitForTimeout(900);
out.backLightbox=await E(`({lb:!!document.getElementById('ga-lb'),view:APP.view})`);
// composer on today
await E(`APP.view='today';render()`);await p.waitForTimeout(700);await E(`openComposer({p:AG.posts[0]})`);await p.waitForTimeout(700);
await p.goBack();await p.waitForTimeout(900);out.backComposer=await E(`({cmp:!!document.getElementById('cmp-root'),view:APP.view})`);
// editor on gallery
await E(`APP.view='gallery';render()`);await p.waitForTimeout(700);await E(`peOpen(AG.posts[0])`);await p.waitForTimeout(900);
await p.goBack();await p.waitForTimeout(900);out.backEditor=await E(`({pe:!!document.getElementById('pe-root'),view:APP.view})`);
// 2. gallery: bottom nav menu tap opens the drawer; selbar hidden with 0 selected
out.selbar=await p.evaluate(()=>{const s=document.querySelector('.ga-selbar');if(!s)return 'none';const cs=getComputedStyle(s);return [cs.visibility,cs.pointerEvents,s.className]});
await tapSel('#v99nav [data-v99nav="__menu"]');await p.waitForTimeout(600);out.galleryMenu=await p.evaluate(()=>!!document.querySelector('#side.open'));await p.touchscreen.tap(20,420);await p.waitForTimeout(400);
// select one card -> selbar visible above nav, not covering it
await p.evaluate(()=>{const c=document.querySelector('.ga-card .ga-chk');c&&c.click()});await p.waitForTimeout(500);
out.selbarOn=await p.evaluate(()=>{const s=document.querySelector('.ga-selbar');if(!s)return 'none';const r=s.getBoundingClientRect();const n=document.getElementById('v99nav').getBoundingClientRect();return {vis:getComputedStyle(s).visibility,bottom:Math.round(r.bottom),navTop:Math.round(n.top),on:s.classList.contains('on')}});
await p.screenshot({path:'v109_sel.png'});await p.evaluate(()=>{const c=document.querySelector('.ga-card .ga-chk');c&&c.click()});
// 3. toolbar action pills
out.vact=await p.evaluate(()=>[...document.querySelectorAll('#vact button')].map(b=>{const r=b.getBoundingClientRect();return [b.textContent.trim(),Math.round(r.width),Math.round(r.height),Math.round(r.left),b.scrollWidth<=b.clientWidth+1]}));
out.tbarH=await p.evaluate(()=>Math.round(document.querySelector('.tbar').getBoundingClientRect().height));
await p.screenshot({path:'v109_gallery.png'});
// 4. back pill vs the "new" button after scrolling
await p.evaluate(()=>{document.getElementById('appmain').scrollTop=900});await p.waitForTimeout(500);
out.pill=await p.evaluate(()=>{const x=document.getElementById('v106x');const nb=document.querySelector('.tbar [data-app="new"]');if(!x||!nb)return null;const r=x.getBoundingClientRect();const q=nb.getBoundingClientRect();const hit=document.elementsFromPoint(q.x+q.width/2,q.y+q.height/2)[0];return {pill:[Math.round(r.left),Math.round(r.top),Math.round(r.bottom)],newHit:hit===nb||nb.contains(hit),navTop:Math.round(document.getElementById('v99nav').getBoundingClientRect().top)}});
await p.screenshot({path:'v109_pill.png'});
// 5. effects sheet cancel re-enables the button
await E(`APP.view='videos';render()`);await p.waitForTimeout(1200);
const ek=await p.evaluate(()=>{const b=document.querySelector('[data-v100="editknown"]');if(!b)return null;b.scrollIntoView({block:'center'});const r=b.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]});
if(ek){await p.waitForTimeout(300);await p.touchscreen.tap(ek[0],ek[1]);await p.waitForTimeout(900);out.sheetOpen=await p.evaluate(()=>!!document.querySelector('.v103sh'));
 await tapSel('[data-v103="close"]');await p.waitForTimeout(700);out.afterCancel=await p.evaluate(()=>{const b=document.querySelector('[data-v100="editknown"]');return {disabled:b.disabled,sheet:!!document.querySelector('.v103sh')}});
 const ek2=await p.evaluate(()=>{const b=document.querySelector('[data-v100="editknown"]');const r=b.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]});await p.touchscreen.tap(ek2[0],ek2[1]);await p.waitForTimeout(900);out.reopen=await p.evaluate(()=>!!document.querySelector('.v103sh'));await tapSel('[data-v103="close"]')}
// 6. agent dot, calendar segments, template shelf header
await E(`APP.view='agent';render()`);await p.waitForTimeout(800);out.dot=await p.evaluate(()=>{const d=document.querySelector('.v51dot');return d&&getComputedStyle(d).backgroundColor});
await E(`APP.view='calendar';render()`);await p.waitForTimeout(800);out.cm=await p.evaluate(()=>[...document.querySelectorAll('[data-app="cm"]')].map(b=>Math.round(b.getBoundingClientRect().height)));
await E(`APP.view='templates';render()`);await p.waitForTimeout(1500);out.shelf=await p.evaluate(()=>{const h=document.querySelector('.tv-shelf>header');if(!h)return null;const b=h.querySelector('button');const t=h.querySelector('h3');if(!b)return 'nobtn';return {btnTop:Math.round(b.getBoundingClientRect().top-t.getBoundingClientRect().top),dir:getComputedStyle(h).flexDirection}});
out.errors=errs.slice(0,3);await b.close()})().catch(e=>{console.error('FATAL',e);process.exit(1)});
