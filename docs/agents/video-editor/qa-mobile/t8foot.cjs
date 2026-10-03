const {chromium}=require('playwright-core');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox']});
const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});const p=await ctx.newPage();
await p.addInitScript(()=>{localStorage.setItem('pro_seen','true')});await p.goto('http://localhost:8765/t15.html');await p.waitForTimeout(9000);
const E=s=>p.evaluate(s=>window.__E(s),s);
for(const v of ['today','calendar','queue']){await E(`APP.view=${JSON.stringify(v)};render()`);await p.waitForTimeout(600);await p.evaluate(()=>window.scrollTo(0,document.scrollingElement.scrollHeight));await p.waitForTimeout(300);
 const m=await p.evaluate(()=>{const f=document.querySelector('footer');const r=f.getBoundingClientRect();const a=getComputedStyle(f,'::after'),bf=getComputedStyle(f,'::before');return {h:Math.round(r.height),lines:Math.round(r.height/parseFloat(getComputedStyle(f).lineHeight)),after:a.content+' pos='+a.position+' right='+a.right+' top='+a.top,before:bf.content,maxH:getComputedStyle(f).maxHeight,cls:f.className,dataAttrs:[...f.attributes].map(x=>x.name+'='+x.value).join(' '),bodyCls:document.body.className}});
 console.log(v,JSON.stringify(m));
 if(v==='today'){const r=await p.evaluate(()=>{const f=document.querySelector('footer').getBoundingClientRect();return [f.right-20,f.top+12]});await p.touchscreen.tap(r[0],r[1]);await p.waitForTimeout(400);console.log('after tap on עוד: footer h',await p.evaluate(()=>Math.round(document.querySelector('footer').getBoundingClientRect().height)))}}
await b.close()})();
