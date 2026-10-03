const {chromium}=require('playwright-core');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox']});
const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});const p=await ctx.newPage();
await p.addInitScript(()=>{localStorage.setItem('pro_seen','true')});await p.goto('http://localhost:8765/t15.html');await p.waitForTimeout(9000);
const E=s=>p.evaluate(s=>window.__E(s),s);
await E(`APP.view='today';render()`);await p.waitForTimeout(600);await p.evaluate(()=>window.scrollTo(0,document.scrollingElement.scrollHeight));await p.waitForTimeout(300);
console.log(JSON.stringify(await p.evaluate(()=>{const f=document.querySelector('footer');const r=f.getBoundingClientRect();const cs=getComputedStyle(f);const kids=[...f.querySelectorAll('*')].map(k=>{const q=k.getBoundingClientRect();return {tag:k.tagName,cls:k.className.toString().slice(0,20),txt:k.textContent.trim().slice(0,12),l:Math.round(q.left),r:Math.round(q.right),top:Math.round(q.top),pos:getComputedStyle(k).position}});
 const h=document.elementFromPoint(r.right-20,r.top+10);return {rect:{l:Math.round(r.left),r:Math.round(r.right),top:Math.round(r.top),b:Math.round(r.bottom)},sw:f.scrollWidth,cw:f.clientWidth,whiteSpace:cs.whiteSpace,overflow:cs.overflow,textOverflow:cs.textOverflow,cls:f.className,kids,hitAtRight:h&&(h.tagName+'.'+h.className.toString().slice(0,15)+':'+h.textContent.trim().slice(0,8))}})));
await b.close()})();
