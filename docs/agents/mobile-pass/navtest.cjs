// enter and leave every page on a phone with real taps; open and close the editor, the composer and the drawer; scroll to the end everywhere
const {chromium}=require('playwright-core');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox']});
const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{localStorage.setItem('pro_seen','true')});await p.goto('http://localhost:8765/t15.html');await p.waitForTimeout(9000);
const E=s=>p.evaluate(s=>window.__E(s),s);
const tap=async sel=>{const r=await p.evaluate(sel=>{const el=document.querySelector(sel);if(!el)return null;el.scrollIntoView({block:'center',inline:'center'});const b=el.getBoundingClientRect();return [b.x+b.width/2,b.y+b.height/2]},sel);if(!r)throw new Error('no '+sel);await p.waitForTimeout(120);await p.touchscreen.tap(r[0],r[1])};
const views=await E(`VIEWS.flatMap(g=>g[1].map(v=>v[0]))`);const out=[];
for(const v of views){errs.length=0;
 // enter through the drawer like a user: menu button, then the nav item
 await tap('.tbar [data-app="menu"]');await p.waitForTimeout(350);const open1=await p.evaluate(()=>document.getElementById('side').classList.contains('open'));
 await tap(`#side [data-view="${v}"]`);await p.waitForTimeout(900);
 const st=JSON.parse(await E(`JSON.stringify({view:APP.view,title:document.getElementById('vt').textContent,drawer:document.getElementById('side').classList.contains('open'),tbh:Math.round(document.querySelector('.tbar').getBoundingClientRect().height),sw:document.documentElement.scrollWidth,W:innerWidth,nav:!!document.querySelector('#v99nav button[aria-current]'),text:(document.getElementById('appviews').innerText||'').trim().length})`));
 await p.evaluate(()=>window.scrollTo(0,document.scrollingElement.scrollHeight));await p.waitForTimeout(250);
 const end=await p.evaluate(()=>{const se=document.scrollingElement;return se.scrollTop+se.clientHeight>=se.scrollHeight-2});
 await p.evaluate(()=>window.scrollTo(0,0));
 const row={v,ok:st.view===v&&!st.drawer&&open1,title:st.title,tbh:st.tbh,over:st.sw>st.W,end,text:st.text,err:errs.slice(0,1)};out.push(row);
 console.log(v.padEnd(12),row.ok?'enter ok':'ENTER FAIL',st.view,'| tbar',st.tbh,'| overflow',row.over,'| reachEnd',end,'| text',st.text,errs.length?'ERR '+errs[0].slice(0,90):'')}
// bottom nav taps
for(const k of ['queue','gallery','calendar','today']){errs.length=0;await tap(`#v99nav [data-v99nav="${k}"]`);await p.waitForTimeout(700);const v=await E('APP.view');console.log('bottom nav',k,v===k?'ok':'FAIL '+v,errs[0]||'')}
// editor from a thumbnail in the pages that have no opener of their own; pages with their own panel (gallery lightbox, calendar popover, queue composer) are checked through that panel
for(const v of ['feed','analyze','ideas','today']){errs.length=0;await E(`APP.view=${JSON.stringify(v)};render();window.scrollTo(0,0)`);await p.waitForTimeout(900);
 const sel=await p.evaluate(()=>{const b=document.querySelector('#appviews .v99edit');if(b){b.scrollIntoView({block:'center'});return '#appviews .v99edit'}return null});
 if(!sel){console.log('editor from',v,'NO PENCIL');continue}
 await tap(sel);await p.waitForTimeout(1200);const open=await p.evaluate(()=>!!document.getElementById('pe-root')&&document.body.classList.contains('pe-open'));
 let closed=false;if(open){await E('peClose(true)');await p.waitForTimeout(500);closed=await p.evaluate(()=>!document.getElementById('pe-root'))}
 console.log('editor from',v.padEnd(9),open?'opened':'NOT OPENED',open?(closed?'closed':'NOT CLOSED'):'',errs[0]||'')}
// calendar: tap a card opens the composer, which has the design button
errs.length=0;await E(`APP.view='calendar';render();window.scrollTo(0,0)`);await p.waitForTimeout(900);
{const c=await p.evaluate(()=>{const c=[...document.querySelectorAll('#appviews .ci canvas[data-ti]')].find(c=>c.getBoundingClientRect().width>40);if(c){c.scrollIntoView({block:'center'});c.setAttribute('data-v99t','1');return true}return false});
 if(c){await tap('#appviews canvas[data-v99t]');await p.waitForTimeout(900);const comp=await p.evaluate(()=>!!document.getElementById('cmp-root'));let edBtn=false;if(comp){edBtn=await p.evaluate(()=>[...document.querySelectorAll('#cmp-root button')].some(b=>/ערוך עיצוב/.test(b.textContent)));await tap('#cmp-root [data-app="cmpclose"]');await p.waitForTimeout(500)}
 console.log('calendar card ->',comp?'composer opened':'composer NOT opened','design button:',edBtn,'composer closed:',await p.evaluate(()=>!document.getElementById('cmp-root')),errs[0]||'')}else console.log('calendar: no card')}
// queue: tapping the thumbnail opens the image editor; the card's own buttons open the composer
errs.length=0;await E(`APP.view='queue';render();window.scrollTo(0,0)`);await p.waitForTimeout(900);
{const c=await p.evaluate(()=>{const c=[...document.querySelectorAll('#appviews .qcard canvas[data-ti]')].find(c=>c.getBoundingClientRect().width>40);if(c){c.scrollIntoView({block:'center'});c.setAttribute('data-v99t','1');return true}return false});
 if(c){await tap('#appviews canvas[data-v99t]');await p.waitForTimeout(1200);const ed=await p.evaluate(()=>!!document.getElementById('pe-root'));let closed=false;if(ed){await E('peClose(true)');await p.waitForTimeout(500);closed=await p.evaluate(()=>!document.getElementById('pe-root'))}
 console.log('queue thumbnail ->',ed?'editor opened':'editor NOT opened',closed?'closed':'',errs[0]||'')}}
// gallery: tap a card opens the lightbox with its edit control
errs.length=0;await E(`APP.view='gallery';render();window.scrollTo(0,0)`);await p.waitForTimeout(900);
{const c=await p.evaluate(()=>{const c=[...document.querySelectorAll('#appviews .ga-open canvas')].find(c=>c.getBoundingClientRect().width>60);if(c){c.scrollIntoView({block:'center'});c.setAttribute('data-v99t','1');return true}return false});
 if(c){await tap('#appviews canvas[data-v99t]');await p.waitForTimeout(900);const lb=await E('!!(GA&&GA.lb)');const ed=await p.evaluate(()=>!!document.getElementById('pe-root'));const edBtn=await p.evaluate(()=>!![...document.querySelectorAll('button')].find(b=>b.getBoundingClientRect().width>0&&/עריכ|עיצוב/.test(b.textContent)&&b.closest('[class*="ga"]')));
 await E('GA.lb=null;try{gaLbRender()}catch(e){}');await p.waitForTimeout(300);console.log('gallery card ->',lb?'lightbox opened':'lightbox NOT opened','editor also open:',ed,'edit control:',edBtn,errs[0]||'')}}
// composer open and close
errs.length=0;await tap('.tbar [data-app="new"]');await p.waitForTimeout(900);const comp=await p.evaluate(()=>!!document.getElementById('cmp-root'));
if(comp){await tap('#cmp-root [data-app="cmpclose"]');await p.waitForTimeout(600)}const compClosed=await p.evaluate(()=>!document.getElementById('cmp-root'));console.log('composer',comp?'opened':'NOT OPENED',compClosed?'closed':'NOT CLOSED',errs[0]||'');
// drawer closes when tapping outside
await tap('.tbar [data-app="menu"]');await p.waitForTimeout(300);await p.touchscreen.tap(30,500);await p.waitForTimeout(300);console.log('drawer closes on outside tap',await p.evaluate(()=>!document.getElementById('side').classList.contains('open')));
await E(`APP.view='gallery';render()`);await p.waitForTimeout(800);await p.screenshot({path:'v99_gallery.png'});await E(`APP.view='create';render()`);await p.waitForTimeout(800);await p.screenshot({path:'v99_create.png'});
await b.close()})();
