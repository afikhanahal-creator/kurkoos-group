const {chromium}=require('playwright-core');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox']});
const ctx=await b.newContext({viewport:{width:1366,height:900}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{localStorage.setItem('pro_seen','true');localStorage.setItem('ag_v92_show','true')});await p.goto('http://localhost:8765/t15.html');await p.waitForTimeout(11000);
const E=s=>p.evaluate(s=>window.__E(s),s);
// a tiktok caption template: boxed text element
await E(`const d=AG.posts.find(x=>/^(ed|x)_/.test(x.layout)&&!x.tpl&&peSlots(x).length);const q=clonePost(d);peConvert(q,'x_t_b2_tiktok_01');AG.posts.unshift(q);peOpen(q);PE.tab='v53';peRender()`);await p.waitForTimeout(1500);
const rowsOf=()=>p.evaluate(()=>[...document.querySelectorAll('#pe-root .v53row[data-key]')].map(r=>[r.dataset.key,r.innerText.trim().replace(/\s+/g,' ').slice(0,30)]));
const rows=await rowsOf();console.log('layers',rows);
// select the caption through the layers list
const cap=rows.find(r=>/caption/.test(r[0]))||rows.find(r=>/כותרת/.test(r[1]));await E(`window.__v96k=${JSON.stringify(cap[0])}`);await p.click(`#pe-root .v53row[data-key="${cap[0]}"]`);await p.waitForTimeout(600);
console.log('colour row',await p.evaluate(()=>!!document.querySelector('#pe-root .v53sw')),'swatches',await p.evaluate(()=>[...document.querySelectorAll('#pe-root .v53sw button:not(.v53auto)')].map(b=>b.title).join(',')),'custom',await p.evaluate(()=>!!document.querySelector('#pe-root .v53cust input')));
const px=async()=>E(`(()=>{const cv=document.getElementById('pe-cv');const c=cv.getContext('2d');const b=window.__v50box.list.find(i=>i.key===window.__v96k);const k=cv.width/1080;const x=Math.round((b.box.x+b.box.w*.08)*k),y=Math.round((b.box.y+b.box.h*.15)*k);const d=c.getImageData(x-8,y-8,16,16).data;let r=0,g=0,bl=0,n=0,wh=0;for(let i=0;i<d.length;i+=4){r+=d[i];g+=d[i+1];bl+=d[i+2];n++;if(d[i]>230&&d[i+1]>230&&d[i+2]>230)wh++}return [Math.round(r/n),Math.round(g/n),Math.round(bl/n),'white px',wh,'box',JSON.stringify(b.box)]})()`);
console.log('before',await px());
await p.click('#pe-root .v53sw button[title="אדום קורקוס"]');await p.waitForTimeout(800);
console.log('after red',await px(),'tf',await E(`JSON.stringify((PE.p.fx.tf||{}))`).then(x=>x.slice(0,120)));
// custom colour via the picker
await p.evaluate(()=>{const i=document.querySelector('#pe-root .v53cust input');i.value='#123456';i.dispatchEvent(new Event('input',{bubbles:true}));i.dispatchEvent(new Event('change',{bubbles:true}))});await p.waitForTimeout(800);
console.log('after custom',await px());
// a deco shape gets a colour row too
await E(`PE.p.fx.deco=['ring_tr_m_red'];TC.clear();peRender()`);await p.waitForTimeout(1200);
const rows2=await rowsOf();const dr=rows2.find(r=>/^deco/.test(r[0]))||rows2.find(r=>/צורה/.test(r[1]));console.log('deco row',dr||'none');
if(dr){await p.click(`#pe-root .v53row[data-key="${dr[0]}"]`);await p.waitForTimeout(500);console.log('deco colour row',await p.evaluate(()=>!!document.querySelector('#pe-root .v53sw')),'sel',await E('JSON.stringify(window.__v53sel?window.__v53sel():null)'))}
await p.screenshot({path:'v96.png'});console.log(errs);await b.close()})();
