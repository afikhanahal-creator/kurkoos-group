// the importer with a mocked network and asset store (the real hosts are only reachable from the user's browser)
const {chromium}=require('playwright-core');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox']});
const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{localStorage.setItem('pro_seen','true');localStorage.setItem('ag_v104_done_v1','1');localStorage.setItem('ag_v107_done_v1','1');localStorage.setItem('ag_v110_done_v1','1')});
await p.goto('http://localhost:8765/t15.html');await p.waitForTimeout(8000);
const E=s=>p.evaluate(s=>window.__E(s),s);const out={};
out.lists=await E(`({images:__v110.imageList().length,videos:__v110.videoList().length,projects:[...new Set(__v110.imageList().map(x=>x.project))]})`);
// mock: fetch for supabase urls -> a generated jpeg / small mp4 bytes; asset store + db in memory
await E(`(function(){const real=window.fetch;window.__up=[];window.__docs={};
 window.fetch=async function(u,o){u=String(u);if(!/supabase\\.co\\/storage/.test(u))return real.apply(this,arguments);
  if(o&&o.method==='HEAD')return new Response(null,{status:200,headers:{'content-length':/videos\\//.test(u)?String(u.includes('5780af6b')?30*1024*1024:900000):'120000'}});
  if(/\\.mp4$/.test(u)){const big=u.includes('5780af6b');return new Response(new Blob([new Uint8Array(big?30*1024*1024:900000)],{type:'video/mp4'}),{status:200})}
  const cv=document.createElement('canvas');cv.width=1600;cv.height=1000;const c=cv.getContext('2d');c.fillStyle='#'+Math.floor(Math.random()*0xffffff).toString(16).padStart(6,'0');c.fillRect(0,0,1600,1000);c.fillStyle='#fff';c.font='80px Arial';c.fillText(u.slice(-12),100,500);
  const blob=await new Promise(r=>cv.toBlob(r,'image/jpeg',.8));return new Response(blob,{status:200})};
 const store={upload:async blob=>{const id='t'+(window.__up.length+1);window.__up.push(blob.size);return {id,url:URL.createObjectURL(blob),sizeBytes:blob.size}}};
 const col=name=>({doc:id=>({set:async d=>{(window.__docs[name]=window.__docs[name]||{})[id]=d},update:async d=>{Object.assign(window.__docs[name][id],d)}}),get:async()=>({docs:Object.entries(window.__docs[name]||{}).map(([id,d])=>({id,data:()=>d}))})});
 const db={collection:col};KC.assets=store;KC.db=db;__vid.VD.assets=store;__vid.VD.db=db})()`);
out.before=await E(`({lib:libKeys().length,posts:AG.posts.length})`);
const t0=Date.now();out.run=await E(`__v110.run()`);out.ms=Date.now()-t0;
out.after=await E(`({lib:libKeys().length,posts:AG.posts.length,uploads:window.__up.length,photoDocs:Object.keys(window.__docs.photos||{}).length,videoDocs:Object.keys(window.__docs.videos||{}).length,sample:Object.values(window.__docs.photos||{}).slice(0,2),vsample:Object.values(window.__docs.videos||{}).slice(0,1).map(d=>({name:d.name,source:d.source,origin:!!d.origin,status:d.status,brand:d.brand})),log:__v110.ST.log.slice(0,3)})`);
// second run: everything deduplicated
out.again=await E(`__v110.run()`);
// posts built from the new photos use them
out.newPosts=await E(`AG.posts.filter(p=>/מתמונות חדשות/.test(p.series||'')).slice(0,3).map(p=>[p.layout,p.fx&&p.fx.shot&&p.fx.shot.k])`);
// button present in the gallery toolbar
await E(`APP.view='gallery';render()`);await p.waitForTimeout(800);out.btn=await p.evaluate(()=>{const b=document.querySelector('[data-v110="run"]');return b&&b.textContent.trim()});
await p.screenshot({path:'v110_gal.png'});
out.errors=errs.slice(0,3);console.log(JSON.stringify(out,null,1));await b.close()})().catch(e=>{console.error('FATAL',e);process.exit(1)});
