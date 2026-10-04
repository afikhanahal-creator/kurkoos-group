const {chromium}=require('playwright-core');const TV=__dirname+'/tv/';const PAGE=process.argv[2]||'t15.html';
const IOS=()=>{window.__inG=false;['touchend','click','pointerup'].forEach(n=>addEventListener(n,()=>{__inG=true;setTimeout(()=>{__inG=false},0)},true));const P=HTMLMediaElement.prototype.play;window.__sim={blocked:0,drawn:0,skipped:0};
 HTMLMediaElement.prototype.play=function(){const g=window.__inG;if(g)this.__ok=true;if(!this.__ok&&!this.muted){__sim.blocked++;return Promise.reject(new DOMException('blocked','NotAllowedError'))}const r=P.call(this);this.addEventListener('playing',()=>{this.__played=true},{once:true});return r};
 const D=CanvasRenderingContext2D.prototype.drawImage;CanvasRenderingContext2D.prototype.drawImage=function(src){if(src instanceof HTMLVideoElement){if(!src.__played){__sim.skipped++;return}__sim.drawn++}return D.apply(this,arguments)}};
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(IOS);await p.addInitScript(()=>{localStorage.setItem('pro_seen','true');localStorage.setItem('ag_v104_done_v1','1');localStorage.setItem('ag_v107_done_v1','1');localStorage.setItem('ag_v110_done_v2','1');localStorage.removeItem('v129_projects')});
await p.goto('http://localhost:8765/'+PAGE);await p.waitForTimeout(7000);const E=s=>p.evaluate(s=>window.__E(s),s);const o={page:PAGE};
await E(`(()=>{const V=window.__vid;window.__docs=[];V.VD.assets={upload:async f=>({id:'b'+Date.now(),url:'/_blob/b'+Date.now(),sizeBytes:f.size})};V.VD.db={collection:()=>({doc:()=>({set:async d=>{__docs.push(d)},update:async u=>{__docs.push(u)}})})};V.editVideo=async d=>true})()`);
await E(`APP.view='videos';render()`);await p.waitForTimeout(900);await p.setInputFiles('#v127 input[data-v127f]',[TV+'a.webm']);await p.waitForTimeout(1500);
await p.tap('#v127 .v129go');await p.waitForTimeout(2500);
// the preview, seeked into the video
await E(`(()=>{const s=__v129.seq();__v129.E.t=s.clips[0].start+1;__v129.refresh()})()`);await p.waitForTimeout(1200);
o.cover=await p.evaluate(()=>!!document.querySelector('.v137tap'));
if(o.cover){await p.tap('.v137tap');await p.waitForTimeout(1200);await E(`__v129.refresh()`);await p.waitForTimeout(600)}
o.previewDrawn=await E(`__sim.drawn`);await p.screenshot({path:'ux/v137_prev_'+PAGE.replace('.html','')+'.png'});
// effects tapped at 0:00 (the intro)
await E(`__v129.E.t=0;__v129.E.tab='anim';__v129.refresh()`);await p.waitForTimeout(400);
for(const f of ['zoom','shake','flash']){await p.locator(`#v129 [data-v129="addfx"][data-fx="${f}"]`).first().tap();await p.waitForTimeout(250)}
o.fx=await E(`(()=>{const s=__v129.seq();return {clipStart:+s.clips[0].start.toFixed(2),fx:__v129.E.p.layers.filter(l=>l.type==='fx').map(l=>l.fx+'@'+l.start.toFixed(2))}})()`);
await E(`__v129.E.p.kit.quality='fast'`);await E(`__sim.drawn=0`);const t0=Date.now();
await p.locator('.v130ebar [data-v130="export"]').first().tap();
try{await p.waitForFunction(()=>{const r=document.getElementById('v132res');return r&&/מוכן/.test(r.querySelector('header b').textContent)},null,{timeout:90000});o.exported=true}catch(e){o.exported=false;o.stuckAt=await p.evaluate(()=>{const b=document.getElementById('v129busy');return b&&b.textContent})}
o.secs=Math.round((Date.now()-t0)/1000);o.exportDrawn=await E(`__sim.drawn`);o.blocked=await E(`__sim.blocked`);
o.errors=errs.slice(0,3);console.log(JSON.stringify(o));await b.close()})().catch(e=>{console.error('FATAL',e);process.exit(1)});
