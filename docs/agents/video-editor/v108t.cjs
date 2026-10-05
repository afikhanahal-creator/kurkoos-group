const {chromium}=require('playwright-core');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox']});
const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{localStorage.setItem('pro_seen','true');localStorage.setItem('ag_v104_done_v1','1');localStorage.setItem('ag_v107_done_v1','1')});await p.goto('http://localhost:8765/t15.html');await p.waitForTimeout(9000);
const E=s=>p.evaluate(s=>window.__E(s),s);const out=global.out={};process.on("exit",()=>console.log("PARTIAL",JSON.stringify(global.out)));
await E(`const d=AG.posts.find(x=>/^(ed|x)_/.test(x.layout)&&!x.tpl&&peSlots(x).length);peOpen(d);PE.tab='light';peRender()`);await p.waitForTimeout(1800);
await p.screenshot({path:'v108_1.png'});
out.live=await p.evaluate(()=>document.getElementById('pe-root').classList.contains('v108live'));
out.anim=await p.evaluate(()=>getComputedStyle(document.querySelector('#pe-root .pe')).animationName);
out.tiles=await p.evaluate(()=>document.querySelectorAll('#pe-root canvas.v69pv').length);
// scroll the body a bit, then tap a preset; watch canvas brightness, tiles presence, scroll, animation
await p.evaluate(()=>{const b=document.querySelector('#pe-root .pe-body');b.scrollTop=120});await p.waitForTimeout(200);
const btn=await p.evaluate(()=>{const b=[...document.querySelectorAll('#pe-root button[data-pe-a="pre"]')].filter(x=>x.getAttribute('aria-pressed')!=='true').find(x=>{const q=x.getBoundingClientRect();return q.top>140&&q.bottom<800});const r=b.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2,b.textContent.trim(),r.y]});out.tapBtn=btn;
await p.evaluate(()=>{window.__blank=0;window.__tileMiss=0;window.__anim=0;const t=setInterval(()=>{const cv=document.getElementById('pe-cv');if(cv){const c=cv.getContext('2d');const d=c.getImageData(cv.width/2|0,cv.height/2|0,1,1).data;if(d[3]===0)window.__blank++}if(document.querySelectorAll('#pe-root canvas.v69pv').length<8)window.__tileMiss++;const pe=document.querySelector('#pe-root .pe');if(pe&&getComputedStyle(pe).animationName!=='none')window.__anim++},8);setTimeout(()=>clearInterval(t),1500)});
await p.touchscreen.tap(btn[0],btn[1]);await p.waitForTimeout(1600);
out.afterTap=await p.evaluate(()=>({blankFrames:window.__blank,tileMissing:window.__tileMiss,animFrames:window.__anim,scrollTop:document.querySelector('#pe-root .pe-body').scrollTop,pressed:document.querySelector('#pe-root button[data-pe-a="pre"][aria-pressed="true"]')?.dataset.i}));
await p.screenshot({path:'v108_2.png'});
// open the full preview from the expand button
const ex=await p.evaluate(()=>{const b=document.querySelector('#pe-root [data-v108="open"]');const r=b.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2,r.width,r.height]});out.expandBtn=ex;
await p.touchscreen.tap(ex[0],ex[1]);await p.waitForTimeout(900);
out.preview=await p.evaluate(()=>{const el=document.getElementById('v108pv');if(!el)return null;const cv=el.querySelector('canvas.v108cv');const r=cv.getBoundingClientRect();const c=cv.getContext('2d');const d=c.getImageData(cv.width/2|0,cv.height/2|0,1,1).data;return {w:Math.round(r.width),h:Math.round(r.height),top:Math.round(r.top),drawn:d[3]>0,nav:getComputedStyle(document.getElementById('v99nav')||document.body).display,x101:(()=>{const x=document.getElementById('v101x');return x?getComputedStyle(x).display:'none'})()}});
await p.screenshot({path:'v108_3.png'});
// feed mode
let m=await p.evaluate(()=>{const b=document.querySelector('[data-v108="mode"][data-k="feed"]');const r=b.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]});await p.touchscreen.tap(m[0],m[1]);await p.waitForTimeout(700);
out.feed=await p.evaluate(()=>{const el=document.getElementById('v108pv');return {cap:!!el.querySelector('.v108cap'),acc:!!el.querySelector('.v108acc'),cardW:Math.round(el.querySelector('.v108card').getBoundingClientRect().width)}});
await p.screenshot({path:'v108_4.png'});
// 9:16 format
m=await p.evaluate(()=>{const b=document.querySelector('[data-v108="fmt"][data-k="916"]');const r=b.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]});await p.touchscreen.tap(m[0],m[1]);await p.waitForTimeout(700);
out.fmt916=await p.evaluate(()=>{const cv=document.querySelector('#v108pv canvas.v108cv');return [cv.width,cv.height]});
// back gesture closes the preview, not the editor
await p.goBack();await p.waitForTimeout(700);
out.afterBack={pv:await p.evaluate(()=>!!document.getElementById('v108pv')),editor:await p.evaluate(()=>!!document.getElementById('pe-root'))};
// open again and close with X
await p.touchscreen.tap(ex[0],ex[1]);await p.waitForTimeout(600);
m=await p.evaluate(()=>{const b=document.querySelector('#v108pv .v108x');const r=b.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]});await p.touchscreen.tap(m[0],m[1]);await p.waitForTimeout(500);
out.afterX={pv:await p.evaluate(()=>!!document.getElementById('v108pv')),editor:await p.evaluate(()=>!!document.getElementById('pe-root'))};
// tool strip "מסך גדול" opens the preview too
const big=await p.evaluate(()=>{const b=document.querySelector('#pe-root [data-v33="pe"]');if(!b)return null;b.scrollIntoView({inline:'center'});const r=b.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]});
if(big){await p.touchscreen.tap(big[0],big[1]);await p.waitForTimeout(600);out.bigOpens=await p.evaluate(()=>!!document.getElementById('v108pv'));await E('__v108.close()')}
// tabs: tap each tab, canvas never blank
out.tabs={};for(const k of ['text','image','shape','boost','check','light']){const t=await p.evaluate(k=>{const b=document.querySelector(`#pe-root [data-pe-a="tab"][data-k="${k}"]`);const r=b.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]},k);await p.evaluate(()=>{window.__blank=0;const t=setInterval(()=>{const cv=document.getElementById('pe-cv');if(cv){const d=cv.getContext('2d').getImageData(cv.width/2|0,cv.height/2|0,1,1).data;if(d[3]===0)window.__blank++}},8);setTimeout(()=>clearInterval(t),700)});await p.touchscreen.tap(t[0],t[1]);await p.waitForTimeout(800);out.tabs[k]=await p.evaluate(()=>({tab:document.getElementById('pe-root').dataset.tab,blank:window.__blank,anim:getComputedStyle(document.querySelector('#pe-root .pe')).animationName}))}
await p.screenshot({path:'v108_5.png'});
// header fits in one row
out.header=await p.evaluate(()=>{const h=document.querySelector('#pe-root .pe-top');const r=h.getBoundingClientRect();const kids=[...h.querySelectorAll('button')].map(b=>{const q=b.getBoundingClientRect();return [b.textContent.trim()||b.getAttribute('aria-label'),Math.round(q.width),Math.round(q.height),Math.round(q.top)]});return {h:Math.round(r.height),kids}});
// close editor
await E('peClose(true)');await p.waitForTimeout(400);out.closed=await p.evaluate(()=>!document.getElementById('pe-root'));
console.log(JSON.stringify(out,null,1));console.log('errors',errs.slice(0,3));await b.close()})().catch(e=>{console.error('FATAL',e);process.exit(1)});
