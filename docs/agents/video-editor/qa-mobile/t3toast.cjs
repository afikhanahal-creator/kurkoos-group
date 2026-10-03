// toasts vs bottom bar; footer "עוד" overlap on today; header rows composition
const {chromium}=require('playwright-core');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox']});
const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{localStorage.setItem('pro_seen','true')});await p.goto('http://localhost:8765/t15.html');
const seen=new Map();
for(let i=0;i<40;i++){await p.waitForTimeout(500);const t=await p.evaluate(()=>{const n=document.getElementById('v99nav');const nr=n&&n.getBoundingClientRect();return [...document.querySelectorAll('#toast,.toast,[class*="toast"]')].filter(t=>t.getBoundingClientRect().width>0).map(t=>{const r=t.getBoundingClientRect();return {txt:t.textContent.trim().slice(0,50),top:Math.round(r.top),bottom:Math.round(r.bottom),barTop:nr?Math.round(nr.top):null,hasBtn:!!t.querySelector('button'),cls:t.className.toString().slice(0,30)}})});
 for(const x of t){if(!seen.has(x.txt)){seen.set(x.txt,x);console.log((i*0.5)+'s',JSON.stringify(x))}}}
const E=s=>p.evaluate(s=>window.__E(s),s);
// today footer overlap
await E(`APP.view='today';render()`);await p.waitForTimeout(800);await p.evaluate(()=>window.scrollTo(0,document.scrollingElement.scrollHeight));await p.waitForTimeout(300);
const ft=await p.evaluate(()=>{const els=[...document.querySelectorAll('#appviews *')].filter(e=>e.children.length===0&&/עוד/.test(e.textContent.trim())&&e.textContent.trim().length<6&&e.getBoundingClientRect().width>0);return els.map(e=>{const r=e.getBoundingClientRect();const par=e.parentElement;const sib=[...par.children].filter(x=>x!==e).map(x=>{const q=x.getBoundingClientRect();return {t:x.textContent.trim().slice(0,25),l:Math.round(q.left),r:Math.round(q.right),top:Math.round(q.top),b:Math.round(q.bottom)}});return {t:e.textContent.trim(),tag:e.tagName,l:Math.round(r.left),r:Math.round(r.right),top:Math.round(r.top),b:Math.round(r.bottom),parCls:par.className.toString().slice(0,30),parW:Math.round(par.getBoundingClientRect().width),parSW:par.scrollWidth,sib}})});
console.log('today footer',JSON.stringify(ft));
await p.screenshot({path:'qa/today_footer.png',clip:{x:0,y:650,width:390,height:140}});
// header composition per view
const views=await E(`VIEWS.flatMap(g=>g[1].map(v=>v[0]))`);
for(const v of views){await E(`APP.view=${JSON.stringify(v)};render();window.scrollTo(0,0)`);await p.waitForTimeout(600);
 const h=await p.evaluate(()=>{const tb=document.querySelector('.tbar');const r=tb.getBoundingClientRect();const kids=[...tb.querySelectorAll('button,a,select,input')].filter(e=>e.getBoundingClientRect().width>0).map(e=>{const q=e.getBoundingClientRect();return (e.textContent.trim()||e.getAttribute('aria-label')||e.dataset.app||'?').slice(0,12)+'@'+Math.round(q.top)});const rows=new Set([...tb.querySelectorAll('button,a,select,input')].filter(e=>e.getBoundingClientRect().width>0).map(e=>Math.round(e.getBoundingClientRect().top/20)));return {h:Math.round(r.height),rows:rows.size,kids}});
 console.log(v.padEnd(12),'tbar',h.h,'rows',h.rows,h.kids.join(' '))}
await b.close()})();
