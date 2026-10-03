const {chromium}=require('playwright-core');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox']});const ctx=await b.newContext({viewport:{width:1366,height:860}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{localStorage.setItem('pro_seen','true');localStorage.setItem('ag_v104_done_v1','1');localStorage.setItem('ag_v107_done_v1','1');localStorage.setItem('ag_v110_done_v2','1')});
await p.goto('http://localhost:8765/t15.html');await p.waitForTimeout(7000);const E=s=>p.evaluate(s=>window.__E(s),s);const o={};
o.v117=await E('!!window.__v117');
// user-sized library: 380 photos, one post each (V117 lowers per to 1)
o.posts=await E(`(async()=>{const c=document.createElement('canvas');c.width=1200;c.height=900;const g=c.getContext('2d');g.fillStyle='#8a6';g.fillRect(0,0,1200,900);const url=c.toDataURL('image/jpeg',0.7);const projs=['ramhal','zrubavel','humash','shikmim','mohaliver','bengurion','hankin','henrietta','yordei','general'];
 for(let i=0;i<380;i++){regUpload('fake'+i,{name:'דרייב '+i,project:projs[i%10],kind:i%3?'site':'render',tags:'drive',w:1200,h:900,url,addedAt:new Date().toISOString(),batch:'drive1'})}
 const keys=Object.keys(KC.up).filter(k=>k.startsWith('fake')).map(k=>'u_'+k);const before=AG.posts.length;const r=await __v113.buildChunked({per:1,keys});return {before,made:r&&r.made,after:AG.posts.length}})()`);
// 1. composer opens on an article post without a title
o.article=await E(`(()=>{const a=AG.posts.find(x=>/^(ed|x)_/.test(x.layout)&&!x.article);a.article={url:'https://kurkoos-group.co.il/x'};const it={id:'t117a',pid:a.id,at:'2026-10-20T18:30',nets:{fb:true,ig:true},status:'ready'};APP.sched.items.push(it);try{openComposer({it});const ok=!!document.querySelector('#cmp-root [data-app="csaveat"]');closeComposer();delete a.article;return ok}catch(e){return 'ERR '+e.message}})()`);
// 2. save with a new date, timed, unthrottled
o.save=await E(`(async()=>{const it=APP.sched.items.find(i=>i.id==='t117a');openComposer({it});const t0=performance.now();await composerSave('2026-10-22T19:00');return {ms:Math.round(performance.now()-t0),at:APP.sched.items.find(i=>i.id==='t117a').at,closed:!APP.cmp}})()`);
// 3. calPost index agrees with a scan
o.calPost=await E(`(()=>{let bad=0,n=0;CAL.forEach(c=>{if(!c.key)return;n++;const a=calPost(c.key),b=AG.posts.find(p=>p.key===c.key);if(a!==b)bad++});return {n,bad}})()`);
// 4. no background slide drawing while the editor is open
o.editorIdle=await E(`(async()=>{let n=0;const D=drawSlide;drawSlide=function(){n++;return D.apply(this,arguments)};const d=AG.posts.find(x=>/^(ed|x)_/.test(x.layout)&&!x.tpl&&peSlots(x).length&&x.layout!=='ed_stat');peOpen(d);await new Promise(r=>setTimeout(r,1500));const open=n;n=0;await new Promise(r=>setTimeout(r,3000));const idle=n;n=0;PE.tab='shape';peRender();await new Promise(r=>setTimeout(r,800));const shape1=n;n=0;PE.tab='text';peRender();await new Promise(r=>setTimeout(r,300));PE.tab='shape';peRender();await new Promise(r=>setTimeout(r,800));const shape2=n;n=0;const ta=document.querySelector('#pe-root textarea');PE.tab='text';peRender();await new Promise(r=>setTimeout(r,300));n=0;if(ta){ta.value+=' x';ta.dispatchEvent(new Event('input',{bubbles:true}))}await new Promise(r=>setTimeout(r,900));const key=n;peClose(true);drawSlide=D;return {open,idle3s:idle,shape1,shape2,keystroke:key,cache:__v117.ST.hits+'/'+__v117.ST.miss}})()`);
// 5. the clarity check resumes when nothing is open and reports the queue
o.clarity=await E(`(()=>{const r=__v73run();return {checking:r.checking,pending:__v117.ST.pending}})()`);
// 6. agent legacy list skipped
o.agent=await E(`(()=>{const t0=performance.now();renderAgent();return {ms:Math.round(performance.now()-t0),dirty:__v117.ST.agDirty}})()`);
o.errors=errs.slice(0,5);console.log(JSON.stringify(o,null,1));await b.close()})().catch(e=>{console.error('FATAL',e);process.exit(1)});
