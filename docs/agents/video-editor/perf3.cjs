// before/after: bytes at boot, gallery paint, second visit from caches
const {chromium}=require('playwright-core');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox']});
const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{localStorage.setItem('pro_seen','true');localStorage.setItem('ag_v104_done_v1','1');localStorage.setItem('ag_v107_done_v1','1');localStorage.setItem('ag_v110_done_v1','1')});
const cdp=await ctx.newCDPSession(p);await cdp.send('Network.enable');let bytes=0,reqs=0;cdp.on('Network.loadingFinished',e=>{bytes+=e.encodedDataLength||0;reqs++});
const E=s=>p.evaluate(s=>window.__E(s),s);const out={};
await p.goto('http://localhost:8765/t15.html');await p.waitForTimeout(9000);out.boot1={bytes,reqs,stats:await E('__v111')};
bytes=0;reqs=0;let t=Date.now();await E(`APP.view='gallery';render()`);await p.waitForTimeout(2500);out.gallery1={ms:Date.now()-t,bytes,reqs,stats:await E('JSON.parse(JSON.stringify(__v111))'),painted:await p.evaluate(()=>[...document.querySelectorAll('#appmain canvas[data-tp]')].filter(c=>{try{const d=c.getContext('2d').getImageData(c.width/2|0,c.height/2|0,1,1).data;return d[3]>0}catch(e){return false}}).length),total:await p.evaluate(()=>document.querySelectorAll('#appmain canvas[data-tp]').length)};
await p.screenshot({path:'v111_g1.png'});
// scroll to paint more, let the store fill
for(let i=0;i<6;i++){await p.evaluate(()=>{document.getElementById('appmain').scrollTop+=700});await p.waitForTimeout(500)}await p.waitForTimeout(1500);
out.stored=await E('__v111.stored');
// second visit: cache api + idb thumbs
bytes=0;reqs=0;t=Date.now();await p.reload();await p.waitForTimeout(9000);out.boot2={bytes,reqs,stats:await E('JSON.parse(JSON.stringify(__v111))')};
bytes=0;reqs=0;t=Date.now();await E(`APP.view='gallery';render()`);await p.waitForTimeout(2000);out.gallery2={ms:Date.now()-t,bytes,reqs,stats:await E('JSON.parse(JSON.stringify(__v111))'),painted:await p.evaluate(()=>[...document.querySelectorAll('#appmain canvas[data-tp]')].filter(c=>{try{const d=c.getContext('2d').getImageData(c.width/2|0,c.height/2|0,1,1).data;return d[3]>0}catch(e){return false}}).length)};
await p.screenshot({path:'v111_g2.png'});
// edit a post: its thumbnail must change (signature changes), not a stale cached one
out.edit=await E(`(async()=>{const p=AG.posts.find(x=>document.querySelector('canvas[data-tp="'+x.id+'"]'));const cv=document.querySelector('canvas[data-tp="'+p.id+'"]');const before=sigOf(p,0);p.visual=p.visual||{};p.visual.headline='בדיקת מטמון '+Date.now();const after=sigOf(p,0);cv._d=0;paintOne(cv);await new Promise(r=>setTimeout(r,1200));return {changed:before!==after,painted:(()=>{const d=cv.getContext('2d').getImageData(cv.width/2|0,cv.height/2|0,1,1).data;return d[3]>0})()}})()`);
// other views still fine
for(const v of ['queue','calendar','today','agent']){await E(`APP.view='${v}';render()`);await p.waitForTimeout(900)}
out.views=await p.evaluate(()=>document.querySelectorAll('#appmain canvas').length);
out.errors=errs.slice(0,3);console.log(JSON.stringify(out,null,1));await b.close()})().catch(e=>{console.error('FATAL',e);process.exit(1)});
