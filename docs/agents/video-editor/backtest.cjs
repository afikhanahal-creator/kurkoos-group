const {chromium}=require('playwright-core');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox']});
const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{localStorage.setItem('pro_seen','true')});await p.goto('http://localhost:8765/t15.html');await p.waitForTimeout(9000);
const E=s=>p.evaluate(s=>window.__E(s),s);
const tap=async sel=>{const r=await p.evaluate(sel=>{const el=document.querySelector(sel);if(!el)return null;const b=el.getBoundingClientRect();return [b.x+b.width/2,b.y+b.height/2]},sel);if(!r)throw new Error('no '+sel);await p.touchscreen.tap(r[0],r[1])};
// navigate through pages with the bottom bar and the drawer, then go back with the header arrow and with the browser back
const order=await p.evaluate(()=>[...document.querySelectorAll('#v99nav button')].map(b=>b.dataset.v99nav));console.log('bottom bar order',order.join(' > '),'| first is menu at right',order[0]==='__menu');
await tap('#v99nav [data-v99nav="queue"]');await p.waitForTimeout(600);await tap('#v99nav [data-v99nav="gallery"]');await p.waitForTimeout(600);
await tap('.tbar [data-app="menu"]');await p.waitForTimeout(300);await tap('#side [data-view="videos"]');await p.waitForTimeout(800);
console.log('view now',await E('APP.view'),'| back arrow visible',await p.evaluate(()=>{const b=document.getElementById('v102back');return !!b&&b.getBoundingClientRect().width>0}));
await tap('#v102back');await p.waitForTimeout(600);console.log('after header back',await E('APP.view'));
await p.goBack();await p.waitForTimeout(600);console.log('after browser back',await E('APP.view'),'| still in app',await p.evaluate(()=>location.href.includes('t15')));
await p.goBack();await p.waitForTimeout(600);console.log('after another back',await E('APP.view'),'| still in app',await p.evaluate(()=>location.href.includes('t15')));
// bottom bar hidden under windows
await E(`openComposer({})`);await p.waitForTimeout(700);console.log('composer open: bar hidden',await p.evaluate(()=>getComputedStyle(document.getElementById('v99nav')).display==='none'));
await p.goBack();await p.waitForTimeout(700);console.log('composer closed by back',await p.evaluate(()=>!document.getElementById('cmp-root')),'| bar back',await p.evaluate(()=>getComputedStyle(document.getElementById('v99nav')).display!=='none'));
await E(`APP.view='gallery';render();GA.lb={ids:[AG.posts[0].id],i:0};gaLbRender()`);await p.waitForTimeout(700);console.log('lightbox: bar hidden',await p.evaluate(()=>getComputedStyle(document.getElementById('v99nav')).display==='none'));await p.goBack();await p.waitForTimeout(600);
// the reel button on the videos page works on touch
await E(`APP.view='videos';render()`);await p.waitForTimeout(900);const r=await p.evaluate(()=>{const b=document.querySelector('#appviews [data-v100="edit"],#appviews [data-v100="editknown"]');if(!b)return null;b.scrollIntoView({block:'center'});const x=b.getBoundingClientRect();return [x.x+x.width/2,x.y+x.height/2]});
if(r){await p.touchscreen.tap(r[0],r[1]);await p.waitForTimeout(900);console.log('reel button tap -> toast',await p.evaluate(()=>{const t=document.querySelector('#toast,.toast');return t?t.textContent.trim().slice(0,70):'none'}))}
await p.screenshot({path:'v102.png'});console.log('errors',errs.slice(0,2));await b.close()})();
