const {chromium}=require('playwright-core');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox']});
const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{localStorage.setItem('pro_seen','true');localStorage.setItem('ag_v104_done_v1','1')});await p.goto('http://localhost:8765/t15.html');await p.waitForTimeout(9000);
const E=s=>p.evaluate(s=>window.__E(s),s);
const views=await E(`VIEWS.flatMap(g=>g[1].map(v=>v[0]))`);
for(const v of views){errs.length=0;await E(`APP.view=${JSON.stringify(v)};render()`);await p.waitForTimeout(700);
 const r=await p.evaluate(()=>{const s=document.getElementById('appmain');const se=document.scrollingElement;return {bodyScroll:se.scrollHeight>se.clientHeight+2,inner:s.scrollHeight>s.clientHeight+2,sh:s.scrollHeight,ch:s.clientHeight}});
 await p.evaluate(()=>{const s=document.getElementById('appmain');s.scrollTop=s.scrollHeight});await p.waitForTimeout(300);
 const after=await p.evaluate(()=>{const s=document.getElementById('appmain');const tb=document.querySelector('.tbar').getBoundingClientRect();const n=document.getElementById('v99nav').getBoundingClientRect();const x=document.getElementById('v106x');return {end:s.scrollTop+s.clientHeight>=s.scrollHeight-2,tbTop:Math.round(tb.top),navBottom:Math.round(n.bottom),navVisible:n.height>0&&n.bottom<=innerHeight+1,pill:!!(x&&x.classList.contains('on')),W:innerWidth,sw:document.documentElement.scrollWidth}});
 const flag=(r.bodyScroll||!after.end||after.tbTop!==0||!after.navVisible||(r.inner&&!after.pill)||after.sw>after.W)?'  <<<':'';
 console.log(v.padEnd(12),'bodyScrolls',r.bodyScroll,'| inner',r.inner,'| reachEnd',after.end,'| header top',after.tbTop,'| nav visible',after.navVisible,'| pill',after.pill,errs[0]?'ERR':'',flag)}
// pill goes back
await E(`APP.view='queue';render()`);await p.waitForTimeout(500);await E(`APP.view='gallery';render()`);await p.waitForTimeout(800);await p.evaluate(()=>{const s=document.getElementById('appmain');s.scrollTop=1500});await p.waitForTimeout(500);
const r=await p.evaluate(()=>{const x=document.getElementById('v106x');const b=x.getBoundingClientRect();return [b.x+b.width/2,b.y+b.height/2]});await p.touchscreen.tap(r[0],r[1]);await p.waitForTimeout(600);console.log('pill tap -> view',await E('APP.view'));
await p.screenshot({path:'v106_gallery.png'});await b.close()})();
