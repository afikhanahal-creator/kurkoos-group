const {chromium}=require('playwright-core');const fs=require('fs');
const FAKE=fs.readFileSync(__dirname+'/fakedb.part','utf8').replace(/^const FAKE=`/,'').replace(/`;\s*$/,'');
const REAL=fs.readFileSync(__dirname+'/realdb.json','utf8');const PAGE=process.argv[2]||'t15.html';
async function run(mode){const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox']});const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(FAKE);await p.addInitScript(r=>{localStorage.setItem('pro_seen','true');localStorage.setItem('ag_v104_done_v1','1');localStorage.setItem('ag_v107_done_v1','1');localStorage.setItem('ag_v110_done_v2','1');if(!localStorage.getItem('fakedb'))localStorage.setItem('fakedb',r)},REAL);
 const E=s=>p.evaluate(s=>window.__E(s),s);const o={mode,page:PAGE};const ID='cal_k2';
 await p.addInitScript(()=>{window.__tl=[];['touchstart','touchmove','touchend','touchcancel','pointerdown','pointermove','pointerup','pointercancel','scroll'].forEach(n=>document.addEventListener(n,e=>{const l=__tl;const k=n+(e.cancelable===false&&n==='touchmove'?'(nc)':'')+(e.defaultPrevented?'(dp)':'');if(l.length&&l[l.length-1][0]===k)l[l.length-1][1]++;else l.push([k,1])},{capture:false,passive:true}))});await p.goto('http://localhost:8765/'+PAGE);await p.waitForTimeout(8000);
 await E(`APP.view='calendar';APP.calMode='week';APP.calOff=0;render()`);await p.waitForTimeout(800);
 o.start=await E(`APP.sched.items.find(i=>i.id==='${ID}').at`);
 o.draggableAttr=await p.evaluate(id=>document.querySelector(`#appviews [data-drag="${id}"]`).getAttribute('draggable'),ID);
 o.whenBtn=await p.evaluate(id=>!!document.querySelector(`#appviews .v138when[data-id="${id}"]`),ID);
 await p.evaluate(id=>document.querySelector(`#appviews [data-drag="${id}"]`).scrollIntoView({block:'center'}),ID);await p.waitForTimeout(300);
 const src=await p.evaluate(([id,mode])=>{const r=(mode==='grip'?document.querySelector(`#appviews [data-v138grip="${id}"]`):document.querySelector(`#appviews [data-drag="${id}"]`)).getBoundingClientRect();return {x:r.left+r.width*0.5,y:r.top+r.height/2}},[ID,mode]);
 const cdp=await ctx.newCDPSession(p);const T=(type,x,y)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{x:Math.round(x),y:Math.round(y)}]});
 await T('touchStart',src.x,src.y);await p.waitForTimeout(mode==='grip'?60:450);
 // the target: the next day column (Tuesday 6), found as the finger moves down
 let x=src.x,y=src.y;for(let i=0;i<6;i++){y+=6;await T('touchMove',x,y);await p.waitForTimeout(40)}
 if(mode==='interrupted'){await p.evaluate(()=>document.dispatchEvent(new PointerEvent('pointercancel',{pointerType:'touch',bubbles:true})));await p.waitForTimeout(50)}
 const dst=await p.evaluate(()=>{const c=document.querySelector('#appviews .wkc[data-drop="2026-10-07"]');c.scrollIntoView({block:'nearest'});const r=c.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+Math.min(r.height-10,60)}});
 for(let i=1;i<=12;i++){await T('touchMove',x+(dst.x-x)*i/12,y+(dst.y-y)*i/12);await p.waitForTimeout(40)}
 await p.waitForTimeout(150);await T('touchEnd');await p.waitForTimeout(1500);
 o.local=await E(`APP.sched.items.find(i=>i.id==='${ID}').at`);o.db=await p.evaluate(id=>(JSON.parse(localStorage.getItem('fakedb')).schedule[id]||{}).at,ID);
 o.tl=await p.evaluate(()=>__tl.map(x=>x[0]+'x'+x[1]).join(' '));o.ev=await E(`window.__v136?__v136.D.ev.map(e=>e.n+(e.x?' '+e.x:'')).reverse():null`);
 await p.reload();await p.waitForTimeout(8000);o.afterReload=await E(`APP.sched.items.find(i=>i.id==='${ID}').at`);
 // the clear button path
 await E(`APP.view='calendar';render()`);await p.waitForTimeout(700);
 if(o.whenBtn){await p.locator(`#appviews .v138when[data-id="${ID}"]`).first().tap();await p.waitForTimeout(600);o.sheetFromBtn=await p.evaluate(()=>!!document.querySelector('#v131'))}
 await p.screenshot({path:'ux/v138_'+mode+'.png'});
 o.errors=errs.slice(0,3);await b.close();return o}
(async()=>{for(const m of (process.argv[3]||'normal,interrupted').split(','))console.log(JSON.stringify(await run(m)))})().catch(e=>{console.error('FATAL',e);process.exit(1)});
