// check 1 + 2: every view via drawer on phone; back navigation
const {chromium}=require('playwright-core');
const DESK=process.argv[2]==='desk';
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox']});
const ctx=await b.newContext(DESK?{viewport:{width:1366,height:900}}:{viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{localStorage.setItem('pro_seen','true')});await p.goto('http://localhost:8765/t15.html');await p.waitForTimeout(9000);
const E=s=>p.evaluate(s=>window.__E(s),s);
const tap=async sel=>{const r=await p.evaluate(sel=>{const el=document.querySelector(sel);if(!el)return null;el.scrollIntoView({block:'center',inline:'center'});const b=el.getBoundingClientRect();return [b.x+b.width/2,b.y+b.height/2]},sel);if(!r)throw new Error('no '+sel);await p.waitForTimeout(120);if(DESK)await p.mouse.click(r[0],r[1]);else await p.touchscreen.tap(r[0],r[1])};
const views=await E(`VIEWS.flatMap(g=>g[1].map(v=>v[0]))`);console.log('views',views.length,views.join(','));
const tag=DESK?'d':'m';
for(const v of views){errs.length=0;
 let enterOk=false;
 try{await tap('.tbar [data-app="menu"]');await p.waitForTimeout(350);await tap(`#side [data-view="${v}"]`);await p.waitForTimeout(1000);enterOk=true}catch(e){console.log(v,'TAP ERR',e.message)}
 const st=await p.evaluate(()=>{const tb=document.querySelector('.tbar');const nav=document.getElementById('v99nav');const nb=nav?[...nav.querySelectorAll('button')]:[];const nr=nav&&nav.getBoundingClientRect();const ncs=nav&&getComputedStyle(nav);
   return {view:window.__E('APP.view'),drawer:document.getElementById('side').classList.contains('open'),tbh:Math.round(tb.getBoundingClientRect().height),sw:document.documentElement.scrollWidth,W:innerWidth,
    navVis:!!(nav&&ncs.display!=='none'&&ncs.visibility!=='hidden'&&nr.height>0&&nr.top<innerHeight),navBtns:nb.length,navFirst:nb[0]&&nb[0].dataset.v99nav,navTop:nr?Math.round(nr.top):null,navCur:nb.filter(b=>b.hasAttribute('aria-current')).map(b=>b.dataset.v99nav).join(','),text:(document.getElementById('appviews').innerText||'').trim().length}});
 await p.evaluate(()=>window.scrollTo(0,document.scrollingElement.scrollHeight));await p.waitForTimeout(300);
 const endInfo=await p.evaluate(()=>{const se=document.scrollingElement;const nav=document.getElementById('v99nav');const nr=nav&&nav.getBoundingClientRect();
   // last visible element bottom inside #appviews
   const els=[...document.querySelectorAll('#appviews *')].filter(e=>{const r=e.getBoundingClientRect();return r.height>0&&r.width>0&&getComputedStyle(e).visibility!=='hidden'});let maxB=0,who='';for(const e of els){const r=e.getBoundingClientRect();if(r.bottom>maxB){maxB=r.bottom;who=(e.tagName+'.'+(e.className||'').toString().slice(0,20))}}
   return {end:se.scrollTop+se.clientHeight>=se.scrollHeight-2,st:se.scrollTop,ch:se.clientHeight,sh:se.scrollHeight,lastB:Math.round(maxB),who,navTop:nr?Math.round(nr.top):null,navVisAfter:!!(nav&&getComputedStyle(nav).display!=='none'&&nr.top<innerHeight)}});
 await p.screenshot({path:`qa/v_${tag}_${v}_end.png`});
 await p.evaluate(()=>window.scrollTo(0,0));await p.waitForTimeout(200);await p.screenshot({path:`qa/v_${tag}_${v}.png`});
 const fails=[];if(!enterOk||st.view!==v)fails.push('enter('+st.view+')');if(st.drawer)fails.push('drawerOpen');if(st.sw>st.W)fails.push(`hOverflow ${st.sw}>${st.W}`);if(!endInfo.end)fails.push(`noEnd st=${endInfo.st} ch=${endInfo.ch} sh=${endInfo.sh}`);if(st.tbh>110)fails.push('tbar '+st.tbh);
 if(!st.navVis)fails.push('navHidden');if(st.navBtns!==5)fails.push('navBtns '+st.navBtns);if(st.navFirst!=='__menu')fails.push('navFirst '+st.navFirst);
 if(endInfo.navTop!=null&&endInfo.lastB>endInfo.navTop+1)fails.push(`hiddenUnderBar last=${endInfo.lastB}(${endInfo.who}) barTop=${endInfo.navTop}`);
 if(errs.length)fails.push('JS '+errs[0].slice(0,100));
 console.log(v.padEnd(12),fails.length?'FAIL '+fails.join(' | '):'PASS','| tbar',st.tbh,'| text',st.text,'| cur',st.navCur)}
// check 2: back navigation
console.log('--- back nav');errs.length=0;
await E(`APP.view='feed';render()`);await p.waitForTimeout(500);
const seq=['queue','gallery','videos'];for(const v of seq){await tap('.tbar [data-app="menu"]');await p.waitForTimeout(350);await tap(`#side [data-view="${v}"]`);await p.waitForTimeout(800)}
const arrow=await p.evaluate(()=>{const b=document.getElementById('v102back');if(!b)return null;const r=b.getBoundingClientRect();return {w:r.width,top:r.top,vis:getComputedStyle(b).display!=='none'&&r.width>0}});
console.log('view',await E('APP.view'),'arrow',JSON.stringify(arrow));
if(arrow&&arrow.vis){await tap('#v102back');await p.waitForTimeout(700);console.log('after arrow -> view',await E('APP.view'),'(expect gallery)')}
await p.goBack();await p.waitForTimeout(700);console.log('after goBack -> view',await E('APP.view'),'(expect queue) url ok',await p.evaluate(()=>location.href.includes('t15.html')));
await p.goBack();await p.waitForTimeout(700);console.log('after goBack2 -> view',await E('APP.view'),'(expect feed) url ok',await p.evaluate(()=>location.href.includes('t15.html')));
await p.goBack();await p.waitForTimeout(700);console.log('after goBack3 -> view',await E('APP.view').catch(()=>'LEFT PAGE'),'url',p.url());
console.log('errors',errs.slice(0,3));await b.close()})();
