const {chromium}=require('playwright-core');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox']});
for(const desk of [false,true]){
const ctx=await b.newContext(desk?{viewport:{width:1366,height:900}}:{viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{localStorage.setItem('pro_seen','true')});await p.goto('http://localhost:8765/t15.html');await p.waitForTimeout(9000);
const E=s=>p.evaluate(s=>window.__E(s),s);
await E(`APP.view='queue';render();window.scrollTo(0,0)`);await p.waitForTimeout(600);
await E(`__undoBar('התמונות הוחלפו ב-1 פוסטים',()=>{})`);await p.waitForTimeout(400);
const m=await p.evaluate(()=>{const u=document.getElementById('v82undo');const n=document.getElementById('v99nav');const ur=u&&u.getBoundingClientRect(),nr=n&&n.getBoundingClientRect();const ncs=n&&getComputedStyle(n);
 // is any bar button covered?
 const covered=n?[...n.querySelectorAll('button')].map(b=>{const r=b.getBoundingClientRect();const h=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return (b.dataset.v99nav)+':'+(h&&(h===b||b.contains(h))?'free':'COVERED')}):[];
 return {undo:ur&&{top:Math.round(ur.top),bottom:Math.round(ur.bottom),z:getComputedStyle(u).zIndex},bar:nr&&{top:Math.round(nr.top),bottom:Math.round(nr.bottom),display:ncs.display},covered}});
console.log(desk?'DESK':'PHONE','undo vs bar',JSON.stringify(m));
await p.screenshot({path:desk?'qa/undo_desk.png':'qa/undo_phone.png'});
if(desk){// desktop back arrow + header
 for(const v of ['queue','gallery','videos']){await E(`APP.view=${JSON.stringify(v)};render()`);await p.waitForTimeout(500)}
 console.log('DESK back arrow exists',await p.evaluate(()=>!!document.getElementById('v102back')),'| hist len',await p.evaluate(()=>history.length));
 await p.goBack();await p.waitForTimeout(600);console.log('DESK goBack ->',await E('APP.view'));
 await p.screenshot({path:'qa/desk_gallery.png'});
}
console.log('errors',errs.slice(0,2));await ctx.close()}
await b.close()})();
