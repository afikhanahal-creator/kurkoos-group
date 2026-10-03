const {chromium}=require('playwright-core');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox']});
const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{localStorage.setItem('pro_seen','true')});await p.goto('http://localhost:8765/t15.html');await p.waitForTimeout(9000);
const E=s=>p.evaluate(s=>window.__E(s),s);
const state=async()=>p.evaluate(()=>{const b=document.getElementById('v101x');const r=b&&b.getBoundingClientRect();const o=window.__v101.top();return {overlay:o?(o.id||o.className.toString().slice(0,12)):null,btn:!!b,inView:!!(r&&r.top>=0&&r.top<120&&r.width>0),hist:history.length}});
const cases=[
 ['gallery lightbox',`APP.view='gallery';render();GA.lb={ids:[AG.posts[0].id],i:0};gaLbRender()`],
 ['editor',`const d=AG.posts.find(x=>/^(ed|x)_/.test(x.layout)&&!x.tpl&&peSlots(x).length);peOpen(d)`],
 ['composer',`openComposer({})`],
 ['animation modal',`const m=document.createElement('div');m.id='v52m';m.className='v52m';m.innerHTML='<div class="v52box"><header><h3>x</h3><button type="button" class="px-ib" data-v52="close" aria-label="סגירה">✕</button></header></div>';document.body.appendChild(m)`],
 ['shapes window',`const m=document.createElement('div');m.id='v68sp';m.innerHTML='<header><button type="button" data-v68="x">x</button></header><div style="height:3000px"></div>';document.body.appendChild(m)`],
 ['template preview',`const m=document.createElement('div');m.id='v66tp';m.innerHTML='<div style="height:3000px">no close here</div>';document.body.appendChild(m)`],
 ['generic modal',`const m=document.createElement('div');m.className='v62ov';m.innerHTML='<div><button type="button" aria-label="סגירה">x</button><div style="height:2000px"></div></div>';document.body.appendChild(m)`],
];
for(const [name,open] of cases){errs.length=0;await E(open);await p.waitForTimeout(700);
 // scroll inside the window, as a user would
 await p.evaluate(()=>{const o=window.__v101.top();if(o){o.scrollTop=800;const sc=o.querySelector('*');window.scrollTo(0,600)}});await p.waitForTimeout(200);
 const s1=await state();
 // tap the pinned close
 let closedByBtn=false;if(s1.btn){const r=await p.evaluate(()=>{const b=document.getElementById('v101x').getBoundingClientRect();return [b.x+b.width/2,b.y+b.height/2]});await p.touchscreen.tap(r[0],r[1]);await p.waitForTimeout(700);closedByBtn=!(await p.evaluate(()=>window.__v101.top()))}
 // open again and use the browser back
 await E(open);await p.waitForTimeout(700);await p.goBack().catch(()=>{});await p.waitForTimeout(700);const closedByBack=!(await p.evaluate(()=>window.__v101.top()));
 const still=await p.evaluate(()=>location.href.includes('t15.html'));
 console.log(name.padEnd(18),'overlay',s1.overlay,'| close visible',s1.inView,'| tap closes',closedByBtn,'| back closes',closedByBack,'| still in app',still,errs[0]?'ERR '+errs[0].slice(0,70):'')}
await E(`APP.view='gallery';render();GA.lb={ids:[AG.posts[0].id],i:0};gaLbRender()`);await p.waitForTimeout(800);await p.screenshot({path:'v101_lb.png'});
await b.close()})();
