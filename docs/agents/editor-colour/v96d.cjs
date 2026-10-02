const {chromium}=require('playwright-core');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox']});
const ctx=await b.newContext({viewport:{width:1366,height:900}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{localStorage.setItem('pro_seen','true')});await p.goto('http://localhost:8765/t15.html');await p.waitForTimeout(11000);
const E=s=>p.evaluate(s=>window.__E(s),s);
await E(`const d=AG.posts.find(x=>/^(ed|x)_/.test(x.layout)&&!x.tpl&&peSlots(x).length);const q=clonePost(d);AG.posts.unshift(q);peOpen(q);PE.tab='v53';PE.p.fx=PE.p.fx||{};PE.p.fx.deco=['ring_tr_m_red'];peRender()`);await p.waitForTimeout(1500);
console.log('deco in post',await E(`JSON.stringify(PE.p.fx.deco)`),'drawSlide wrapped',await E(`typeof drawSlide`),'box keys',await E(`JSON.stringify(window.__v50box.list.map(i=>i.key))`));
const rows=await p.evaluate(()=>[...document.querySelectorAll('#pe-root .v53row[data-key]')].map(r=>r.dataset.key));console.log('rows',rows);
const dk=rows.find(k=>/^deco/.test(k));if(dk){await p.click(`#pe-root .v53row[data-key="${dk}"]`);await p.waitForTimeout(500);console.log('deco colour row',await p.evaluate(()=>!!document.querySelector('#pe-root .v53sw')));
 const px=async()=>E(`(()=>{const cv=document.getElementById('pe-cv');const c=cv.getContext('2d');const b=window.__v50box.list.find(i=>i.key===${JSON.stringify(dk)});const k=cv.width/1080;const x=Math.round((b.box.x+b.box.w*.5)*k),y=Math.round((b.box.y+2)*k);const d=c.getImageData(x-2,y-2,5,5).data;let r=0,g=0,bl=0,n=0;for(let i=0;i<d.length;i+=4){r+=d[i];g+=d[i+1];bl+=d[i+2];n++}return [Math.round(r/n),Math.round(g/n),Math.round(bl/n),JSON.stringify(b.box)]})()`);
 console.log('before',await px());await p.click('#pe-root .v53sw button[title="טורקיז"]');await p.waitForTimeout(800);console.log('after teal',await px(),await E(`JSON.stringify(PE.p.fx.decoTf)`))}
await p.screenshot({path:'v96d.png'});console.log(errs);await b.close()})();
