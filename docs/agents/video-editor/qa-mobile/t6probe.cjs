const {chromium}=require('playwright-core');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox']});
const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{localStorage.setItem('pro_seen','true')});await p.goto('http://localhost:8765/t15.html');await p.waitForTimeout(9000);
const E=s=>p.evaluate(s=>window.__E(s),s);
// A. header height per view, without and with the back arrow
const views=await E(`VIEWS.flatMap(g=>g[1].map(v=>v[0]))`);
console.log('--- tbar height: noArrow / withArrow (title)');
for(const v of views){await E(`APP.view=${JSON.stringify(v)};render();window.scrollTo(0,0)`);await p.waitForTimeout(400);
 const m=await p.evaluate(()=>{const tb=document.querySelector('.tbar');const a=document.getElementById('v102back');const arrowVis=!!a&&a.getBoundingClientRect().width>0;const plus=tb.querySelector('[data-app="new"]');const pr=plus&&plus.getBoundingClientRect();
   const h1=Math.round(tb.getBoundingClientRect().height);let h0=h1,p0=pr&&Math.round(pr.top);if(a){const d=a.style.display;a.style.display='none';h0=Math.round(tb.getBoundingClientRect().height);p0=plus&&Math.round(plus.getBoundingClientRect().top);a.style.display=d}
   return {arrowVis,h0,h1,plusTop0:p0,plusTop1:pr&&Math.round(pr.top),title:document.getElementById('vt').textContent.trim(),plusW:pr&&Math.round(pr.width)}});
 console.log(v.padEnd(12),'arrow',m.arrowVis,'| h noArrow',m.h0,'| h withArrow',m.h1,'| plusTop',m.plusTop0,'->',m.plusTop1,'| plusW',m.plusW,'|',m.title)}
// B. today footer "עוד" overlap
await E(`APP.view='today';render()`);await p.waitForTimeout(600);await p.evaluate(()=>window.scrollTo(0,document.scrollingElement.scrollHeight));await p.waitForTimeout(300);
const ft=await p.evaluate(()=>{const out=[];for(const e of document.querySelectorAll('#appviews *')){const r=e.getBoundingClientRect();if(r.width===0||r.top<innerHeight-200)continue;const own=[...e.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent.trim()).join('');if(/עוד|הנתונים/.test(own))out.push({tag:e.tagName,cls:e.className.toString().slice(0,25),txt:own.slice(0,30),l:Math.round(r.left),r:Math.round(r.right),top:Math.round(r.top),b:Math.round(r.bottom),sw:e.scrollWidth,cw:e.clientWidth,par:e.parentElement.className.toString().slice(0,25),parW:Math.round(e.parentElement.getBoundingClientRect().width),parSW:e.parentElement.scrollWidth})}return out});
console.log('--- today footer',JSON.stringify(ft));
await p.screenshot({path:'qa/today_footer2.png',clip:{x:0,y:700,width:390,height:90}});
// C. lightbox X over title
await E(`APP.view='gallery';render();GA.lb={ids:[AG.posts[0].id],i:0};gaLbRender()`);await p.waitForTimeout(900);
const lb=await p.evaluate(()=>{const x=document.getElementById('v101x').getBoundingClientRect();const lb=document.getElementById('ga-lb');const cands=[...lb.querySelectorAll('h1,h2,h3,h4,.ga-lb-title,[class*="title"],strong,b,div,span')].filter(e=>{const r=e.getBoundingClientRect();return e.children.length===0&&e.textContent.trim().length>8&&r.top<x.bottom&&r.bottom>x.top&&r.right>x.left&&r.left<x.right});return cands.map(e=>({tag:e.tagName,cls:e.className.toString().slice(0,30),txt:e.textContent.trim().slice(0,30),l:Math.round(e.getBoundingClientRect().left),r:Math.round(e.getBoundingClientRect().right),x:{l:Math.round(x.left),r:Math.round(x.right),t:Math.round(x.top),b:Math.round(x.bottom)}}))});
console.log('--- lightbox X overlaps',JSON.stringify(lb));
await p.screenshot({path:'qa/lb_top.png',clip:{x:0,y:0,width:390,height:170}});
// Canva button text wrap
console.log('canva btn',JSON.stringify(await p.evaluate(()=>{const b=[...document.querySelectorAll('#ga-lb button')].find(b=>/Canva/.test(b.textContent));if(!b)return null;const r=b.getBoundingClientRect();return {txt:b.textContent.trim(),w:Math.round(r.width),h:Math.round(r.height),lines:Math.round(r.height/parseFloat(getComputedStyle(b).lineHeight))}})));
console.log('errors',errs.slice(0,2));await b.close()})();
