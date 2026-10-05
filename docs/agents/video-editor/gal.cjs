const {chromium}=require('playwright-core');(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox']});
for(const [w,h,tag] of [[1600,900,'d'],[390,844,'p']]){const ctx=await b.newContext(tag==='p'?{viewport:{width:w,height:h},isMobile:true,hasTouch:true}:{viewport:{width:w,height:h}});const p=await ctx.newPage();
await p.addInitScript(()=>{localStorage.setItem('pro_seen','true');localStorage.setItem('ag_v104_done_v1','1');localStorage.setItem('ag_v107_done_v1','1');localStorage.setItem('ag_v110_done_v2','1')});
await p.goto('http://localhost:8765/'+(process.argv[2]||'t15.html'));await p.waitForTimeout(7000);
await p.evaluate(()=>window.__E(`(()=>{const b=[...document.querySelectorAll('nav a,nav button,aside a,aside button')].find(x=>/גלריית פוסטים/.test(x.textContent));b&&b.click()})()`));await p.waitForTimeout(1500);
await p.screenshot({path:`ux/gal_${tag}0.png`});await p.evaluate(()=>scrollBy(0,700));await p.waitForTimeout(500);await p.screenshot({path:`ux/gal_${tag}1.png`});
if(tag==='d')console.log(await p.evaluate(()=>{const s=document.querySelector('input[placeholder*="חיפוש בכותרת"]');let x=s,out=[];while(x&&out.length<7){const cs=getComputedStyle(x);out.push(x.tagName+'#'+x.id+'.'+String(x.className).slice(0,60)+' pos='+cs.position+' top='+cs.top+' h='+Math.round(x.getBoundingClientRect().height));x=x.parentElement}return out.join('\n')}));
await ctx.close()}await b.close()})();
