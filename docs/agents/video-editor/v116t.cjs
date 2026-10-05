const {chromium}=require('playwright-core');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox']});const out={};
for(const mob of [true,false]){const ctx=await b.newContext(mob?{viewport:{width:390,height:844},isMobile:true,hasTouch:true}:{viewport:{width:1366,height:860}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{localStorage.setItem('pro_seen','true');localStorage.setItem('ag_v104_done_v1','1');localStorage.setItem('ag_v107_done_v1','1');localStorage.setItem('ag_v110_done_v1','1')});
await p.goto('http://localhost:8765/t15.html');await p.waitForTimeout(8000);const E=s=>p.evaluate(s=>window.__E(s),s);const o=out[mob?'phone':'desktop']={};
// schedule two posts that use a library photo: one future, one marked sent
o.setup=await E(`(()=>{const ps=AG.posts.filter(x=>/^(ed|x)_/.test(x.layout)&&peSlots(x).length);const a=ps[0],b2=ps[1];const ka=peSlots(a)[0].o.k,kb=peSlots(b2)[0].o.k;
 APP.sched.items.push({id:'t116a',pid:a.id,at:new Date(Date.now()+5*864e5).toISOString(),nets:{fb:true,ig:true},status:'ready'});
 APP.sched.items.push({id:'t116b',pid:b2.id,at:new Date(Date.now()-9*864e5).toISOString(),nets:{fb:true},status:'sent'});
 return {ka,kb,same:ka===kb}})()`);
await E(`const d=AG.posts.find(x=>/^(ed|x)_/.test(x.layout)&&!x.tpl&&peSlots(x).length);peOpen(d);PE.tab='image';PE.lib={src:'all',kind:'all',proj:'all',q:'',open:{}};peRender()`);await p.waitForTimeout(1500);
// open every section so the tiles exist, then read badges
await p.evaluate(()=>document.querySelectorAll('#pe-root details.v115g').forEach(d=>d.open=true));await p.waitForTimeout(400);
o.inline=await p.evaluate(({ka,kb})=>{const r=document.getElementById('pe-root');const t=k=>{const el=r.querySelector('.v115t[data-k="'+k+'"]');const d=el&&el.querySelector('.v116d');return d?{text:d.textContent,done:d.classList.contains('done'),tip:d.title.split('\\n').length}:null};return {a:t(ka),b:t(kb),badges:r.querySelectorAll('.v116d').length,sw:!!r.querySelector('[data-v116="unused"]')}},o.setup);
await p.screenshot({path:mob?'v116_p1.png':'v116_d1.png'});
// the switch hides used photos
await p.evaluate(()=>document.querySelector('#pe-root [data-v116="unused"]').click());await p.waitForTimeout(300);
o.hidden=await p.evaluate(({ka})=>{const el=document.querySelector('#pe-root .v115t[data-k="'+ka+'"]');return el?getComputedStyle(el).display:'gone'},o.setup);
await p.evaluate(()=>document.querySelector('#pe-root [data-v116="unused"]').click());await p.waitForTimeout(300);
// full screen library shows them too
await p.evaluate(()=>document.querySelector('#pe-root [data-v115="open"]').click());await p.waitForTimeout(900);
await p.evaluate(()=>document.querySelectorAll('#v115lib details.v115g').forEach(d=>d.open=true));await p.waitForTimeout(500);
o.lib=await p.evaluate(({ka})=>{const el=document.querySelector('#v115lib .v115t[data-k="'+ka+'"] .v116d');return {badge:el&&el.textContent,all:document.querySelectorAll('#v115lib .v116d').length,sw:!!document.querySelector('#v115lib [data-v116="unused"]')}},o.setup);
await p.screenshot({path:mob?'v116_p2.png':'v116_d2.png'});
await E('__v115.closeLib();peClose(true)');o.errors=errs.slice(0,3);await ctx.close()}
console.log(JSON.stringify(out,null,1));await b.close()})().catch(e=>{console.error('FATAL',e);process.exit(1)});
