const {chromium}=require('playwright-core');const TV=__dirname+'/tv/';(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});const ctx=await b.newContext({viewport:{width:1440,height:900}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{localStorage.setItem('pro_seen','true');localStorage.setItem('ag_v104_done_v1','1');localStorage.setItem('ag_v107_done_v1','1');localStorage.setItem('ag_v110_done_v2','1');localStorage.removeItem('v129_projects');localStorage.setItem('v127_kit',JSON.stringify({pal:'teal'}))});
await p.goto('http://localhost:8765/'+(process.argv[2]||'t15.html'));await p.waitForTimeout(7000);const E=s=>p.evaluate(s=>window.__E(s),s);
await E(`APP.view='videos';render()`);await p.waitForTimeout(900);await p.setInputFiles('#v127 input[data-v127f]',[TV+'a.webm']);await p.waitForTimeout(2500);
await p.evaluate(()=>document.getElementById('v127').scrollIntoView());await p.waitForTimeout(400);await p.screenshot({path:'ux/ui_tray1.png'});
await p.evaluate(()=>document.getElementById('v127cv').scrollIntoView({block:'center'}));await p.waitForTimeout(300);await p.screenshot({path:'ux/ui_tray2.png'});
await p.click('#v127 .v129go');await p.waitForTimeout(2500);await p.screenshot({path:'ux/ui_ed1.png'});
console.log(JSON.stringify({errs}));await b.close()})();
