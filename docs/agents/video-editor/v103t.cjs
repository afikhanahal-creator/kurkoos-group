const {chromium}=require('playwright-core');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox']});
const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{localStorage.setItem('pro_seen','true')});await p.goto('http://localhost:8765/t15.html');await p.waitForTimeout(9000);
const E=s=>p.evaluate(s=>window.__E(s),s);
const tap=async sel=>{const r=await p.evaluate(sel=>{const el=document.querySelector(sel);if(!el)return null;el.scrollIntoView({block:'center'});const b=el.getBoundingClientRect();return [b.x+b.width/2,b.y+b.height/2]},sel);if(!r)throw new Error('no '+sel);await p.waitForTimeout(150);await p.touchscreen.tap(r[0],r[1])};
await E(`APP.view='videos';render()`);await p.waitForTimeout(900);
await tap('#appviews [data-v100="editknown"]');await p.waitForTimeout(700);
console.log('sheet open',await p.evaluate(()=>!!document.querySelector('.v103sh')),'chips',await p.evaluate(()=>document.querySelectorAll('.v103chip').length),'pressed',await p.evaluate(()=>document.querySelectorAll('.v103chip[aria-pressed="true"]').length),'preset',await p.evaluate(()=>document.querySelector('[data-v103="preset"]').value));
await p.selectOption('[data-v103="preset"]','produced');await p.waitForTimeout(400);console.log('after preset produced pressed',await p.evaluate(()=>document.querySelectorAll('.v103chip[aria-pressed="true"]').length));
await tap('.v103chip[data-id="burst"]');await p.waitForTimeout(200);console.log('burst toggled',await p.evaluate(()=>document.querySelector('.v103chip[data-id="burst"]').getAttribute('aria-pressed')));
await p.fill('[data-v103="hook"]','בדיקה');await p.fill('[data-v103="emojis"]','שקל=💰');
await p.screenshot({path:'v103_sheet.png'});
await tap('[data-v103="go"]');await p.waitForTimeout(900);console.log('sheet closed',await p.evaluate(()=>!document.querySelector('.v103sh')),'toast',await p.evaluate(()=>{const t=document.querySelector('#toast,.toast');return t?t.textContent.trim().slice(0,60):'none'}),'stored preset',await p.evaluate(()=>localStorage.getItem('vid_style')));
// pinned close works on the sheet
await tap('#appviews [data-v100="editknown"]');await p.waitForTimeout(600);await tap('#v101x');await p.waitForTimeout(400);console.log('pinned close closes sheet',await p.evaluate(()=>!document.querySelector('.v103sh')));
console.log('errors',errs.slice(0,2));await b.close()})();
