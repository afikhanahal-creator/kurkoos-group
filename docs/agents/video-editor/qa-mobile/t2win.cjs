// check 3 overlays, 4 videos sheet, 5 thumbnails, boot toast, content-under-bar refined
const {chromium}=require('playwright-core');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox']});
const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{localStorage.setItem('pro_seen','true')});await p.goto('http://localhost:8765/t15.html');await p.waitForTimeout(9000);
const E=s=>p.evaluate(s=>window.__E(s),s);
const toast=()=>p.evaluate(()=>{const t=document.querySelector('#toast,.toast');if(!t)return 'none';const r=t.getBoundingClientRect();return (r.width>0?'VIS ':'hid ')+t.textContent.trim().slice(0,60)+' @'+Math.round(r.top)+'-'+Math.round(r.bottom)});
console.log('boot view',await E('APP.view'),'| toast right after boot:',await toast());
const tap=async sel=>{const r=await p.evaluate(sel=>{const el=document.querySelector(sel);if(!el)return null;el.scrollIntoView({block:'center',inline:'center'});const b=el.getBoundingClientRect();return [b.x+b.width/2,b.y+b.height/2]},sel);if(!r)throw new Error('no '+sel);await p.waitForTimeout(120);await p.touchscreen.tap(r[0],r[1])};
const navState=()=>p.evaluate(()=>{const n=document.getElementById('v99nav');if(!n)return 'missing';const cs=getComputedStyle(n);const r=n.getBoundingClientRect();return (cs.display==='none'||cs.visibility==='hidden'||r.height===0||r.top>=innerHeight)?'hidden':'visible'});
const topOv=()=>p.evaluate(()=>{const o=window.__v101&&window.__v101.top();return o?(o.id||o.className.toString().slice(0,14)):null});
const xState=()=>p.evaluate(()=>{const b=document.getElementById('v101x');if(!b)return {btn:false};const r=b.getBoundingClientRect();const cs=getComputedStyle(b);const el=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {btn:true,top:Math.round(r.top),w:Math.round(r.width),disp:cs.display,hit:el===b||b.contains(el),hitWho:el?(el.id||el.className.toString().slice(0,15)):null}});
// refined under-bar check: #appviews bottom vs bar top after scrolling to end
console.log('--- content under bar (refined)');
const views=await E(`VIEWS.flatMap(g=>g[1].map(v=>v[0]))`);
for(const v of views){await E(`APP.view=${JSON.stringify(v)};render();window.scrollTo(0,0)`);await p.waitForTimeout(700);await p.evaluate(()=>window.scrollTo(0,document.scrollingElement.scrollHeight));await p.waitForTimeout(250);
 const m=await p.evaluate(()=>{const a=document.getElementById('appviews').getBoundingClientRect();const n=document.getElementById('v99nav').getBoundingClientRect();const se=document.scrollingElement;
   // deepest visible leaf bottom, only elements actually hit-testable
   let maxB=0,who='';for(const e of document.querySelectorAll('#appviews *')){const r=e.getBoundingClientRect();if(r.height<2||r.width<2)continue;if(r.bottom>innerHeight+1)continue;const cx=r.x+Math.min(r.width/2,20),cy=r.bottom-1;const h=document.elementFromPoint(cx,cy);if(h&&(h===e||e.contains(h)||h.contains(e))&&r.bottom>maxB){maxB=r.bottom;who=e.tagName+'.'+(e.className||'').toString().slice(0,18)}}
   return {appB:Math.round(a.bottom),navTop:Math.round(n.top),lastB:Math.round(maxB),who,bodyB:Math.round(document.body.getBoundingClientRect().bottom)}});
 const bad=m.lastB>m.navTop+1;console.log(v.padEnd(12),bad?'FAIL':'ok','appviewsBottom',m.appB,'lastVisibleLeafBottom',m.lastB,m.who,'barTop',m.navTop)}
await p.evaluate(()=>window.scrollTo(0,0));
console.log('--- overlays');
const cases=[
 ['lightbox #ga-lb',`APP.view='gallery';render();GA.lb={ids:[AG.posts[0].id],i:0};gaLbRender()`,'#ga-lb'],
 ['editor #pe-root',`const d=AG.posts.find(x=>/^(ed|x)_/.test(x.layout)&&!x.tpl&&peSlots(x).length);peOpen(d)`,'#pe-root'],
 ['composer #cmp-root',`openComposer({})`,'#cmp-root'],
 ['effects .v103sh',`APP.view='videos';render();setTimeout(()=>document.querySelector('#appviews [data-v100="editknown"]').click(),300)`,'.v103sh'],
 ['anim .v52m',`const m=document.createElement('div');m.id='v52m';m.className='v52m';m.innerHTML='<div class="v52box"><header><button type="button" class="px-ib" data-v52="close" aria-label="סגירה">✕</button></header></div>';document.body.appendChild(m)`,'.v52m'],
 ['shapes #v68sp',`const m=document.createElement('div');m.id='v68sp';m.innerHTML='<header><button type="button" data-v68="x">x</button></header><div style="height:3000px"></div>';document.body.appendChild(m)`,'#v68sp'],
 ['tpl preview #v66tp',`const m=document.createElement('div');m.id='v66tp';m.innerHTML='<div style="height:3000px">no close here</div>';document.body.appendChild(m)`,'#v66tp'],
];
let ci=0;
for(const [name,open,sel] of cases){errs.length=0;ci++;
 await E(open);await p.waitForTimeout(1200);
 const opened=await p.evaluate(s=>!!document.querySelector(s),sel);const navOpen=await navState();
 const x0=await xState();
 // scroll inside the window and the page
 await p.evaluate(s=>{const o=document.querySelector(s);const scr=[o,...o.querySelectorAll('*')].filter(e=>{const cs=getComputedStyle(e);return /(auto|scroll)/.test(cs.overflowY)&&e.scrollHeight>e.clientHeight+4});scr.forEach(e=>e.scrollTop=900);window.scrollTo(0,900);return scr.length},sel);await p.waitForTimeout(300);
 const x1=await xState();await p.screenshot({path:`qa/w${ci}_${sel.replace(/[#.]/,'')}_scrolled.png`});
 let tapClosed=null;if(x1.btn){const r=await p.evaluate(()=>{const b=document.getElementById('v101x').getBoundingClientRect();return [b.x+b.width/2,b.y+b.height/2]});await p.touchscreen.tap(r[0],r[1]);await p.waitForTimeout(800);tapClosed=!(await p.evaluate(s=>!!document.querySelector(s),sel))}
 const navAfterTap=await navState();
 // reopen + goBack
 if(tapClosed!==true){await p.evaluate(s=>{const o=document.querySelector(s);o&&o.remove()},sel);await E(`try{peClose&&document.getElementById('pe-root')&&peClose(true)}catch(e){}`)}
 await p.evaluate(()=>window.scrollTo(0,0));await E(open);await p.waitForTimeout(1200);const reopened=await p.evaluate(s=>!!document.querySelector(s),sel);
 await p.goBack().catch(()=>{});await p.waitForTimeout(900);const backClosed=!(await p.evaluate(s=>!!document.querySelector(s),sel));const still=p.url().includes('t15.html');const navAfterBack=await navState();
 if(!backClosed){await p.evaluate(s=>{const o=document.querySelector(s);o&&o.remove()},sel)}
 const fails=[];if(!opened)fails.push('notOpened');if(navOpen!=='hidden')fails.push('barVisibleWhileOpen');if(!x0.btn||!(x0.top>=0&&x0.top<=120)||x0.w===0)fails.push('xNotPinned0 '+JSON.stringify(x0));if(!x1.btn||!(x1.top>=0&&x1.top<=120)||x1.w===0)fails.push('xNotPinnedAfterScroll '+JSON.stringify(x1));if(x1.btn&&!x1.hit)fails.push('xCovered by '+x1.hitWho);
 if(tapClosed!==true)fails.push('tapNoClose');if(navAfterTap!=='visible')fails.push('barNotBackAfterTap');if(!reopened)fails.push('reopenFail');if(!backClosed)fails.push('backNoClose');if(!still)fails.push('leftPage');if(navAfterBack!=='visible')fails.push('barNotBackAfterBack');if(errs.length)fails.push('JS '+errs[0].slice(0,80));
 console.log(name.padEnd(20),fails.length?'FAIL '+fails.join(' | '):'PASS','| x top',x0.top,'->',x1.top,'| toast',await toast())}
console.log('--- videos view');errs.length=0;
await E(`APP.view='videos';render();window.scrollTo(0,0)`);await p.waitForTimeout(900);
const vcards=await p.evaluate(()=>({cards:document.querySelectorAll('#appviews [data-v100]').length,known:document.querySelectorAll('#appviews [data-v100="editknown"]').length,btnTxt:[...document.querySelectorAll('#appviews button')].map(b=>b.textContent.trim()).filter(t=>/ריל/.test(t)).slice(0,3)}));
console.log('cards',JSON.stringify(vcards));await p.screenshot({path:'qa/videos.png'});
await tap('#appviews [data-v100="editknown"]');await p.waitForTimeout(800);
const sh=await p.evaluate(()=>({open:!!document.querySelector('.v103sh'),chips:document.querySelectorAll('.v103chip').length,pressed:[...document.querySelectorAll('.v103chip[aria-pressed="true"]')].map(c=>c.dataset.id),preset:document.querySelector('[data-v103="preset"]')&&document.querySelector('[data-v103="preset"]').value,opts:[...document.querySelectorAll('[data-v103="preset"] option')].map(o=>o.value)}));
console.log('sheet',JSON.stringify(sh));
for(const o of sh.opts||[]){await p.selectOption('[data-v103="preset"]',o);await p.waitForTimeout(300);console.log('preset',o,'pressed',JSON.stringify(await p.evaluate(()=>[...document.querySelectorAll('.v103chip[aria-pressed="true"]')].map(c=>c.dataset.id))))}
const chip=await p.evaluate(()=>{const c=document.querySelector('.v103chip');return c&&{id:c.dataset.id,p:c.getAttribute('aria-pressed')}});
await tap('.v103chip');await p.waitForTimeout(250);const chip2=await p.evaluate(()=>{const c=document.querySelector('.v103chip');return c&&c.getAttribute('aria-pressed')});console.log('chip',chip&&chip.id,chip&&chip.p,'-> after tap',chip2,'toggled',chip&&chip.p!==chip2);
await tap('.v103chip');await p.waitForTimeout(250);console.log('tap again ->',await p.evaluate(()=>document.querySelector('.v103chip').getAttribute('aria-pressed')));
await p.screenshot({path:'qa/videos_sheet.png'});
const goTxt=await p.evaluate(()=>{const b=document.querySelector('[data-v103="go"]');return b&&b.textContent.trim()});
await tap('[data-v103="go"]');await p.waitForTimeout(900);console.log('go btn',goTxt,'| sheet closed',await p.evaluate(()=>!document.querySelector('.v103sh')),'| toast',await toast(),'| bar',await navState());
await p.screenshot({path:'qa/videos_after_go.png'});
console.log('videos errors',errs.slice(0,2));
console.log('--- thumbnails');
for(const v of ['feed','analyze','ideas','today','queue']){errs.length=0;await E(`APP.view=${JSON.stringify(v)};render();window.scrollTo(0,0)`);await p.waitForTimeout(900);
 const info=await p.evaluate(()=>{const cands=[...document.querySelectorAll('#appviews canvas[data-tp],#appviews canvas[data-ti],#appviews .v99edit')].filter(c=>c.getBoundingClientRect().width>30);const c=cands[0];if(!c)return null;c.scrollIntoView({block:'center'});c.setAttribute('data-qa-t','1');return {n:cands.length,tag:c.tagName,cls:c.className.toString().slice(0,20),w:Math.round(c.getBoundingClientRect().width)}});
 if(!info){console.log(v,'NO THUMBNAIL/PENCIL');continue}
 await tap('#appviews [data-qa-t]');await p.waitForTimeout(1500);
 const open=await p.evaluate(()=>!!document.getElementById('pe-root'));const other=await p.evaluate(()=>({cmp:!!document.getElementById('cmp-root'),lb:!!document.getElementById('ga-lb')}));
 let closed=null;if(open){await E('peClose(true)');await p.waitForTimeout(600);closed=await p.evaluate(()=>!document.getElementById('pe-root'))}
 else{await p.screenshot({path:`qa/thumb_${v}_fail.png`});if(other.cmp)await E(`document.querySelector('#cmp-root [data-app="cmpclose"]')&&document.querySelector('#cmp-root [data-app="cmpclose"]').click()`)}
 console.log(v.padEnd(9),open?'editor opened':'editor NOT opened',closed===null?'':(closed?'closed ok':'NOT CLOSED'),'| tapped',JSON.stringify(info),'| other',JSON.stringify(other),errs[0]?'JS '+errs[0].slice(0,60):'')}
await b.close()})();
