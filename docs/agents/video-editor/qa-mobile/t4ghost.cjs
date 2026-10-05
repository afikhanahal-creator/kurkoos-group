// does a drawer tap also click something under the drawer? log every click target after each tap
const {chromium}=require('playwright-core');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox']});
const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{localStorage.setItem('pro_seen','true');window.__clicks=[];document.addEventListener('click',e=>{const t=e.target.closest('button,a,[data-view],[data-app],canvas,input,select,label')||e.target;window.__clicks.push({tag:t.tagName,id:t.id,cls:(t.className||'').toString().slice(0,25),txt:(t.textContent||'').trim().slice(0,25),dv:t.dataset&&(t.dataset.view||t.dataset.app||''),x:Math.round(e.clientX),y:Math.round(e.clientY),inSide:!!t.closest('#side'),t:Date.now()})},true)});
await p.goto('http://localhost:8765/t15.html');await p.waitForTimeout(9000);
const E=s=>p.evaluate(s=>window.__E(s),s);
const toasts=()=>p.evaluate(()=>[...document.querySelectorAll('.toast')].filter(t=>t.getBoundingClientRect().width>0).map(t=>{const r=t.getBoundingClientRect();return {txt:t.textContent.trim().slice(0,45),top:Math.round(r.top),bottom:Math.round(r.bottom),btn:!!t.querySelector('button')}}));
const tap=async sel=>{const r=await p.evaluate(sel=>{const el=document.querySelector(sel);if(!el)return null;el.scrollIntoView({block:'center',inline:'center'});const b=el.getBoundingClientRect();return [b.x+b.width/2,b.y+b.height/2]},sel);if(!r)throw new Error('no '+sel);await p.waitForTimeout(120);await p.touchscreen.tap(r[0],r[1]);return r};
const views=await E(`VIEWS.flatMap(g=>g[1].map(v=>v[0]))`);
for(const v of views){await p.evaluate(()=>window.__clicks=[]);
 const r1=await tap('.tbar [data-app="menu"]');await p.waitForTimeout(350);
 const under=await p.evaluate(v=>{const el=document.querySelector(`#side [data-view="${v}"]`);const b=el.getBoundingClientRect();return {x:Math.round(b.x+b.width/2),y:Math.round(b.y+b.height/2)}},v);
 const r2=await tap(`#side [data-view="${v}"]`);await p.waitForTimeout(1000);
 const clicks=await p.evaluate(()=>window.__clicks);const ghost=clicks.filter(c=>!c.inSide&&!(c.dv==='menu'));
 const t=await toasts();
 console.log(v.padEnd(12),'clicks',clicks.length,ghost.length?'GHOST '+JSON.stringify(ghost):'',t.filter(x=>x.btn).length?'UNDO-TOAST '+JSON.stringify(t.filter(x=>x.btn)):'')}
// bottom bar taps too
for(const k of ['queue','gallery','calendar','today','__menu']){await p.evaluate(()=>window.__clicks=[]);await tap(`#v99nav [data-v99nav="${k}"]`);await p.waitForTimeout(700);const clicks=await p.evaluate(()=>window.__clicks);console.log('bar',k,'view',await E('APP.view'),'clicks',JSON.stringify(clicks.map(c=>c.dv||c.txt||c.tag)),'drawer',await p.evaluate(()=>document.getElementById('side').classList.contains('open')))}
await p.touchscreen.tap(30,500);await p.waitForTimeout(300);
console.log('errors',errs.slice(0,2));await b.close()})();
