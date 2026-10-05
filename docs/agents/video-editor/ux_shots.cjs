const {chromium}=require('playwright-core');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox']});
const ctx=await b.newContext({viewport:{width:1440,height:900}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{localStorage.setItem('pro_seen','true');localStorage.setItem('ag_v104_done_v1','1');localStorage.setItem('ag_v107_done_v1','1');localStorage.setItem('ag_v110_done_v2','1')});
await p.goto('http://localhost:8765/t15.html');await p.waitForTimeout(8000);
const nav=await p.evaluate(()=>[...document.querySelectorAll('#side [data-view],.side [data-view],nav [data-view]')].map(b=>[b.dataset.view,b.textContent.trim().replace(/\s+/g,' ').slice(0,30)]).filter((x,i,a)=>a.findIndex(y=>y[0]===x[0])===i));
console.log(JSON.stringify(nav));
for(const [v] of nav){await p.evaluate(v=>window.__E(`APP.view='${v}';render()`),v);await p.waitForTimeout(1600);await p.screenshot({path:'ux/d_'+v+'.png'});}
console.log('errors',JSON.stringify(errs.slice(0,5)));await b.close()})();
