const {chromium}=require('playwright-core');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox']});
const ctx=await b.newContext({viewport:{width:1366,height:900}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{localStorage.setItem('pro_seen','true');localStorage.setItem('ag_v104_done_v1','1');localStorage.setItem('ag_v107_done_v1','1')});await p.goto('http://localhost:8765/t15.html');await p.waitForTimeout(9000);
const E=s=>p.evaluate(s=>window.__E(s),s);
// simulate four website uploads with local photos
await E(`[['a1','photos/n01.jpg','site'],['a2','photos/g2.jpg','render'],['a3','photos/w04.jpg','aerial'],['a4','photos/d1.jpg','drawing']].forEach(([id,url,kind])=>regUpload(id,{name:'אתר · '+id,project:'',kind,tags:'website',w:1600,h:1000,url}))`);
const before=await E('AG.posts.length');const r=await E('JSON.stringify(window.__v107.build())');console.log('build',r,'posts',before,'->',await E('AG.posts.length'));
console.log('new posts',await E(`JSON.stringify(AG.posts.slice(0,8).map(p=>[p.layout,p.fx.shot.k,(p.visual.headline||'').slice(0,25),p.series]))`));
// render one of them
await E(`const q=AG.posts[0];ensureImgs(q).then(()=>{const c=peCanvas(q,0);window.__t=c.toDataURL('image/jpeg',.8)})`);await p.waitForTimeout(2500);
const d=await E('window.__t||""');require('fs').writeFileSync('v107_post.jpg',Buffer.from(d.split(',')[1]||'','base64'));
await E(`APP.view='gallery';render()`);await p.waitForTimeout(800);console.log('button',await p.evaluate(()=>!!document.querySelector('#vact [data-v107="run"]')),'errors',errs.slice(0,2));await b.close()})();
