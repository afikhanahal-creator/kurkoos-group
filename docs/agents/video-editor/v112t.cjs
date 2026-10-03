const {chromium}=require('playwright-core');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox']});
const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{localStorage.setItem('pro_seen','true');localStorage.setItem('ag_v104_done_v1','1');localStorage.setItem('ag_v107_done_v1','1');localStorage.setItem('ag_v110_done_v1','1')});
await p.goto('http://localhost:8765/t15.html');await p.waitForTimeout(9000);const E=s=>p.evaluate(s=>window.__E(s),s);
const out={};out.before=await E(`({posts:AG.posts.length,lib:libKeys().length,pending:__v112.pending()})`);
// simulate 6 photos arriving from the database with a batch tag
await E(`(()=>{for(let i=0;i<6;i++){const cv=document.createElement('canvas');cv.width=1200;cv.height=800;const c=cv.getContext('2d');c.fillStyle=['#07293a','#105572','#a90b0c','#8fb6c8','#444','#999'][i];c.fillRect(0,0,1200,800);regUpload('drv'+i,{name:'חנקין 41 · דרייב '+i,project:'hankin',kind:'site',tags:'drive,test',w:1200,h:800,addedAt:new Date().toISOString(),url:cv.toDataURL('image/jpeg',.7),src:'drive:test'+i,batch:'drive_test'})}})()`);
await p.waitForTimeout(7000);
out.after=await E(`({posts:AG.posts.length,lib:libKeys().length,pending:__v112.pending(),flag:localStorage.getItem('ag_v112_drive_test'),newPosts:AG.posts.filter(p=>/מתמונות חדשות/.test(p.series||'')&&/drv/.test(p.fx&&p.fx.shot&&p.fx.shot.k||'')).length})`);
out.errors=errs.slice(0,3);console.log(JSON.stringify(out));await b.close()})().catch(e=>{console.error('FATAL',e);process.exit(1)});
