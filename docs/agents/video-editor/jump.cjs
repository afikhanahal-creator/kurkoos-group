const {chromium}=require('playwright-core');const fs=require('fs');
const store=new Map();let t0=Date.parse('2026-10-01');const ts=()=>new Date(t0+=1000).toISOString();
for(const c of fs.readdirSync(__dirname+'/mig'))for(const f of fs.readdirSync(__dirname+'/mig/'+c)){const id=f.replace(/\.json$/,'');store.set(c+'/'+id,{collection:c,id,data:JSON.parse(fs.readFileSync(__dirname+'/mig/'+c+'/'+f,'utf8')),updated_at:ts()})}
console.log('seeded',store.size);
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox']});const ctx=await b.newContext({viewport:{width:1500,height:950}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
const posts=[];
await p.route('https://filnzlnvujnlazwcxbuq.supabase.co/**',async r=>{const u=new URL(r.request().url());const m=r.request().method();
 if(u.pathname==='/rest/v1/engine_docs'){const q=u.searchParams;const col=(q.get('collection')||'').replace('eq.','');const id=q.get('id')?q.get('id').replace('eq.',''):null;
  if(m==='GET'){let rows=[...store.values()].filter(x=>x.collection===col&&(!id||x.id===id));const g=q.get('updated_at');if(g){const gt=g.startsWith('gt.');const v=g.replace(/^(gte|gt)\./,'');rows=rows.filter(x=>gt?x.updated_at>v:x.updated_at>=v)}const off=+(q.get('offset')||0),lim=+(q.get('limit')||1000);rows=rows.slice(off,off+lim);const sel=q.get('select')||'';
   return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(rows.map(x=>sel==='id'?{id:x.id}:sel==='data'?{data:x.data}:{id:x.id,data:x.data,updated_at:x.updated_at}))})}
  if(m==='POST'){const bd=JSON.parse(r.request().postData());[].concat(bd).forEach(x=>{posts.push([Date.now(),x.collection,x.id]);store.set(x.collection+'/'+x.id,{...x,updated_at:new Date().toISOString()})});return r.fulfill({status:201,body:''})}
  if(m==='DELETE')return r.fulfill({status:204,body:''})}
 return r.fulfill({status:200,contentType:'image/jpeg',body:''})});
await p.route('**/api/claude',r=>r.fulfill({status:503,contentType:'application/json',body:'{}'}));
await p.addInitScript(()=>{localStorage.setItem('sb-filnzlnvujnlazwcxbuq-auth-token',JSON.stringify({access_token:'tok',refresh_token:'r',expires_at:Math.floor(Date.now()/1000)+3600}))});
const T=Date.now();await p.goto('http://localhost:8766/engine/t.html');
await p.waitForFunction(()=>typeof APP!=='undefined'&&APP.db,null,{timeout:60000});
await p.evaluate(()=>{window.__rc=0;const f=__E('render');__E('render=(function(f){return function(){window.__rc++;return f.apply(this,arguments)}})(render)');APP.view='today';render()});
const sig=()=>p.evaluate(()=>{const els=[...document.querySelectorAll('#appviews canvas, #appviews img')].slice(0,12);return {rc:window.__rc,n:els.length,pos:els.map(e=>{const r=e.getBoundingClientRect();return Math.round(r.top)+','+Math.round(r.left)}).join(' '),h:document.getElementById('appviews').scrollHeight,toast:(document.getElementById('toast')||{}).textContent}});
let prev=null;for(let i=0;i<45;i++){await p.waitForTimeout(1000);const s=await sig();const w=posts.filter(x=>x[0]>Date.now()-1000).length;if(!prev||s.pos!==prev.pos||s.h!==prev.h||s.rc!==prev.rc||w)console.log(((Date.now()-T)/1000).toFixed(0)+'s','renders',s.rc,'items',s.n,'height',s.h,'writes',w,s.pos!==(prev&&prev.pos)?'MOVED':'',s.toast&&prev&&s.toast!==prev.toast?'toast:'+s.toast:'');prev=s}
const by={};posts.forEach(x=>by[x[1]]=(by[x[1]]||0)+1);console.log('writes by col',JSON.stringify(by),'errs',errs.slice(0,3));
await b.close()})().catch(e=>{console.error('FATAL',e);process.exit(1)});
