const {chromium}=require('playwright-core');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox']});
const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{localStorage.setItem('pro_seen','true')});await p.goto('http://localhost:8765/t15.html');await p.waitForTimeout(9000);
const views=await p.evaluate(()=>window.__E(`VIEWS.flatMap(g=>g[1].map(v=>v[0]))`));
const out=[];
for(const v of views){errs.length=0;await p.evaluate(v=>window.__E(`APP.view=${JSON.stringify(v)};render();window.scrollTo(0,0)`),v);await p.waitForTimeout(1200);
 const m=await p.evaluate(()=>{const se=document.scrollingElement;const sc=[...document.querySelectorAll('*')].filter(e=>{const cs=getComputedStyle(e);return /(auto|scroll)/.test(cs.overflowY)&&e.scrollHeight>e.clientHeight+4&&e.clientHeight>200}).map(e=>e.id||e.className.toString().slice(0,30));
   const fixed=[...document.querySelectorAll('*')].filter(e=>{const cs=getComputedStyle(e);return (cs.position==='fixed'||cs.position==='sticky')&&e.getBoundingClientRect().height>0&&cs.visibility!=='hidden'&&cs.display!=='none'}).map(e=>(e.id||e.className.toString().slice(0,24))+':'+Math.round(e.getBoundingClientRect().height));
   return {sh:se.scrollHeight,ch:se.clientHeight,sc,fixed:fixed.slice(0,8)}});
 // scroll to bottom via touch-like wheel and verify we can reach the end
 await p.evaluate(()=>window.scrollTo(0,document.scrollingElement.scrollHeight));await p.waitForTimeout(300);
 const atEnd=await p.evaluate(()=>{const se=document.scrollingElement;return se.scrollTop+se.clientHeight>=se.scrollHeight-2});
 await p.evaluate(()=>window.scrollTo(0,0));await p.screenshot({path:'ms_'+v+'.png'});
 out.push({v,...m,atEnd,errs:errs.slice(0,1)});console.log(v.padEnd(12),'scrollH',m.sh,'client',m.ch,'reachEnd',atEnd,'innerScrollers',JSON.stringify(m.sc),'fixed',JSON.stringify(m.fixed),errs.length?'ERR '+errs[0].slice(0,80):'')}
await b.close()})();
