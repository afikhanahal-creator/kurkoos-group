const {chromium}=require('playwright-core');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox']});const out={};
for(const [name,vp] of [['desk',{width:1440,height:860}],['laptop',{width:1280,height:720}]]){const ctx=await b.newContext({viewport:vp});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{localStorage.setItem('pro_seen','true');localStorage.setItem('ag_v104_done_v1','1');localStorage.setItem('ag_v107_done_v1','1');localStorage.setItem('ag_v110_done_v2','1')});
await p.goto('http://localhost:8765/t15.html');await p.waitForTimeout(7000);const E=s=>p.evaluate(s=>window.__E(s),s);const o=out[name]={};
await E(`const d=AG.posts.find(x=>/^(ed|x)_/.test(x.layout)&&!x.tpl&&peSlots(x).length&&x.layout!=='ed_stat');peOpen(d)`);await p.waitForTimeout(1500);
for(const t of ['text','image','light','shape','check']){await E(`(()=>{const b=[...document.querySelectorAll('#pe-root .pe-tabs button')].find(b=>b.dataset.tab==='${t}');if(b)b.click();else{PE.tab='${t}';peRender()}})()`);await p.waitForTimeout(900);if(name==='desk')await p.screenshot({path:'v118_'+t+'.png'});}
o.m=await p.evaluate(()=>{const r=document.getElementById('pe-root');const bar=r.querySelector('.pe-sbar');const kids=[...bar.children];const tops=new Set(kids.map(k=>Math.round(k.getBoundingClientRect().top)));const cv=r.querySelector('#pe-cv').getBoundingClientRect();const body=r.querySelector('.pe-body');
 const first=body.firstElementChild;const v95=body.querySelector(':scope>.pe-sec.v95');const head=body.querySelector('[data-pe-f="headline"]');
 return {v118:r.classList.contains('v118'),barRows:tops.size,barScroll:bar.scrollWidth-bar.clientWidth,canvasH:Math.round(cv.height),canvasW:Math.round(cv.width),pageOverflow:document.documentElement.scrollWidth-window.innerWidth,tabsCols:getComputedStyle(r.querySelector('.pe-tabs')).gridTemplateColumns.split(' ').length,firstCard:first&&first.className,v95AfterHead:!!(v95&&head&&(head.compareDocumentPosition(v95)&Node.DOCUMENT_POSITION_FOLLOWING))}});
// text tab specifics
await E(`(()=>{const b=[...document.querySelectorAll('#pe-root .pe-tabs button')].find(b=>b.dataset.tab==='text');if(b)b.click();else{PE.tab='text';peRender()}})()`);await p.waitForTimeout(700);
o.text=await p.evaluate(()=>{const body=document.querySelector('#pe-root .pe-body');const v95=body.querySelector(':scope>.pe-sec.v95');const head=body.querySelector('[data-pe-f="headline"]');return {v95AfterHead:!!(v95&&head&&(head.compareDocumentPosition(v95)&Node.DOCUMENT_POSITION_FOLLOWING)),order:[...body.children].slice(0,4).map(c=>c.className.split(' ').slice(0,2).join('.'))}});
await E('peClose(true)');o.errors=errs.slice(0,3);await ctx.close()}
console.log(JSON.stringify(out,null,1));await b.close()})().catch(e=>{console.error('FATAL',e);process.exit(1)});
