const {chromium}=require('playwright-core');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox']});
const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});const p=await ctx.newPage();
await p.addInitScript(()=>{localStorage.setItem('pro_seen','true');localStorage.setItem('ag_v104_done_v1','1');localStorage.setItem('ag_v107_done_v1','1')});await p.goto('http://localhost:8765/t15.html');await p.waitForTimeout(8000);
const E=s=>p.evaluate(s=>window.__E(s),s);const out={};
const sel=el=>{let s=el.tagName.toLowerCase();if(el.id)s+='#'+el.id;if(typeof el.className==='string'&&el.className)s+='.'+el.className.trim().split(/\s+/).slice(0,2).join('.');for(const k of Object.keys(el.dataset||{}))s+='['+k+'='+el.dataset[k]+']';return s};
for(const v of ['today','queue','gallery','agent','templates','calendar']){await E(`APP.view='${v}';render()`);await p.waitForTimeout(900);
 out[v]=await p.evaluate(sel=>{const f=new Function('return '+sel)();const neg=[...document.querySelectorAll('#appmain *')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.left<-4&&r.right>0&&r.top<900}).slice(0,14).map(e=>[f(e),Math.round(e.getBoundingClientRect().left),Math.round(e.getBoundingClientRect().width),f(e.parentElement),getComputedStyle(e.parentElement).display,getComputedStyle(e.parentElement).flexWrap,getComputedStyle(e.parentElement).overflowX]);
  const act=[...document.querySelectorAll('#vact button')].map(b=>{const r=b.getBoundingClientRect();const lab=b.querySelector('span')||b;return [b.textContent.trim().slice(0,18),Math.round(r.width),Math.round(r.height),Math.round(r.left),getComputedStyle(b).whiteSpace,Math.round(b.scrollWidth)]});
  const extra={};const chk=document.querySelector('.ga-card .ga-chk');if(chk){const r=chk.getBoundingClientRect();const c=chk.closest('.ga-card').getBoundingClientRect();extra.chk=[Math.round(r.top-c.top),getComputedStyle(chk).top,getComputedStyle(chk).position]}
  const fav=document.querySelector('.tv-fav');if(fav){const r=fav.getBoundingClientRect();const c=fav.closest('.tv-card,figure,article,div').getBoundingClientRect();extra.fav=[Math.round(r.top-c.top),getComputedStyle(fav).top,getComputedStyle(fav).position,f(fav.parentElement)]}
  const fam=document.querySelector('[data-tv=fam]');if(fam){extra.fam=[f(fam.parentElement),getComputedStyle(fam.parentElement).display,fam.parentElement.outerHTML.slice(0,200)]}
  const dot=document.querySelector('.v51dot');if(dot)extra.dot=[getComputedStyle(dot).backgroundColor,dot.className];
  const cm=document.querySelector('[data-app=cm]');if(cm){const r=cm.getBoundingClientRect();extra.cm=[Math.round(r.width),Math.round(r.height),f(cm.parentElement)]}
  const sc=document.querySelector('.pr-score span');if(sc)extra.score=[getComputedStyle(sc).fontSize,getComputedStyle(sc).color];
  const ft=document.querySelector('#appmain footer');if(ft)extra.footer=[getComputedStyle(ft).fontSize,getComputedStyle(ft).color,f(ft)];
  return {neg,act,extra}},sel.toString())}
console.log(JSON.stringify(out,null,1));await b.close()})().catch(e=>{console.error('FATAL',e);process.exit(1)});
