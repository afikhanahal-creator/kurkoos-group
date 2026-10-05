const {chromium}=require('playwright-core');
const views=['today','queue','gallery','templates','calendar','ideas','feed','articles','create','agent','dupes','cloner','videos','competitors','analyze','times','settings','fonts'];
const SKIP=/מחק|מחיקה|הסר|delete|שלח|Metricool|פרסם|התנתק|איפוס|reset|ייבוא מהאתר|ייבוא עכשיו|הורד|הורדה|ZIP|העתק|copy|Claude|כתוב מחדש|צור \d|צור פוסטים|חבר חשבון|יצירת תוכן|ייצר|תזמן הכל|שלח/i;
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox']});const ctx=await b.newContext({viewport:{width:1440,height:900},acceptDownloads:false});const p=await ctx.newPage();
let cur='';const errs=[];p.on('pageerror',e=>errs.push([cur,e.message.slice(0,160)]));p.on('dialog',d=>d.dismiss());
await p.addInitScript(()=>{localStorage.setItem('pro_seen','true');localStorage.setItem('ag_v104_done_v1','1');localStorage.setItem('ag_v107_done_v1','1');localStorage.setItem('ag_v110_done_v2','1');window.open=()=>null});
await p.goto('http://localhost:8765/t15.html');await p.waitForTimeout(7000);const E=s=>p.evaluate(s=>window.__E(s),s);
const reset=async v=>{await E(`(()=>{try{if(window.__v122)__v122.closeBig()}catch(e){}try{if(PE&&PE.p)peClose(true)}catch(e){}try{if(APP.cmp)closeComposer()}catch(e){}['#v66tp','#v68sp','#v115lib','#ga-lb','.ov','.v44host','.v44bd','#v108pv','.px-cmdb','.v103sh','.dg-modal','.v62ov','.v63ov','.v65cmp','.v50modal','.v52m','#v82undo'].forEach(s=>document.querySelectorAll(s).forEach(e=>e.remove()));document.body.className=document.body.className.replace(/\\b(pe-open|ga-lb-on|v122-open)\\b/g,'');APP.view='${v}';render()})()`);await p.waitForTimeout(500)};
const report={};
for(const v of views){cur=v;await reset(v);
 const btns=await p.evaluate(({sk,v})=>{const re=new RegExp(sk,'i');const root=document.getElementById('appviews')||document.body;const out=[];root.querySelectorAll('button:not([disabled]),[role=tab],summary').forEach((b,i)=>{const r=b.getBoundingClientRect();if(!r.width||!r.height)return;const t=(b.textContent||b.getAttribute('aria-label')||'').trim().replace(/\s+/g,' ').slice(0,40);if(re.test(t))return;b.dataset.swp=v+'_'+i;out.push([b.dataset.swp,t])});return out.slice(0,45)},{sk:SKIP.source,v});
 const res={n:btns.length,errs:0,dead:[]};
 for(const [id,t] of btns){const before=errs.length;const sig0=await p.evaluate(()=>document.body.innerHTML.length+'|'+location.hash+'|'+document.querySelectorAll('[aria-pressed=true],[aria-selected=true],[open]').length);
  let ok=true;try{await p.evaluate(id=>{const b=document.querySelector(`[data-swp="${id}"]`);if(b)b.click();else throw 'gone'},id)}catch(e){ok=false}
  await p.waitForTimeout(350);const sig1=await p.evaluate(()=>document.body.innerHTML.length+'|'+location.hash+'|'+document.querySelectorAll('[aria-pressed=true],[aria-selected=true],[open]').length);
  if(errs.length>before)res.errs++;if(ok&&sig0===sig1)res.dead.push(t);
  await reset(v);await p.evaluate(()=>{}) ;
  // re-tag after reset
  await p.evaluate(({sk,v})=>{const re=new RegExp(sk,'i');const root=document.getElementById('appviews')||document.body;root.querySelectorAll('button:not([disabled]),[role=tab],summary').forEach((b,i)=>{const r=b.getBoundingClientRect();if(!r.width||!r.height)return;const t=(b.textContent||b.getAttribute('aria-label')||'').trim().replace(/\s+/g,' ').slice(0,40);if(re.test(t))return;b.dataset.swp=v+'_'+i})},{sk:SKIP.source,v});
 }
 report[v]=res;console.log(v,JSON.stringify(res))}
console.log('ERRORS',JSON.stringify(errs.slice(0,30)));await b.close()})().catch(e=>{console.error('FATAL',e);process.exit(1)});
