const {chromium}=require('playwright-core');const TV=__dirname+'/tv/';
const MOCK=`(()=>{const s=async()=>({text:'',truncated:false});s.json=async(input,o)=>{window.__lastPrompt=input;await new Promise(r=>setTimeout(r,300));o&&o.onText&&o.onText({text:'{',delta:'{'});
 if(/שגיאה/.test(input.split('הבקשה עכשיו:')[1]||''))throw {code:'rate_limited',message:'x'};
 return {say:'עשיתי את זה אנרגטי בצבעי המותג, הוספתי כותרת בשנייה 2 עם צליל, זום בשנייה 1, כתוביות קריוקי וקונפטי בסוף.',recipe:null,look:'vivid',captionStyle:'karaoke',progress:true,kit:{pal:'navy',intro:'logo',outro:'cta',cta:'דברו איתנו'},trim:null,clear:{},
  captions:[{text:'אנחנו קבוצת קורקוס',start:1.9,end:3.0},{text:'בונים כל בית',start:3.0,end:4.6}],
  add:[{type:'text',text:'דירת הגן האחרונה',start:3.8,end:6,x:0.5,y:0.2,anim:'zoom',snd:'sig-impact'},{type:'fx',fx:'zoom',start:2.8,end:4.2,amt:1.2,snd:'whoosh-quick'},{type:'fx',fx:'confetti',start:4.2,end:4.7,snd:'sig-confetti'},{type:'el',el:'ring',start:3,end:4.5,x:0.5,y:0.45}],
  remove:[],sfx:[{name:'pop',at:2}],music:null,cloud:{fx:[{id:'shatter',at:1.5}],pro:{cut:true,grade:true}},next:'רוצה שאוסיף כותרת תחתונה עם השם?'}};
 window.claude={use:async n=>n==='sample'?s:null}})()`;
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox']});const out={};
for(const mob of [false,true]){const ctx=await b.newContext(mob?{viewport:{width:390,height:844},isMobile:true,hasTouch:true}:{viewport:{width:1440,height:900}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(MOCK);await p.addInitScript(()=>{localStorage.setItem('pro_seen','true');localStorage.setItem('ag_v104_done_v1','1');localStorage.setItem('ag_v107_done_v1','1');localStorage.setItem('ag_v110_done_v2','1');localStorage.removeItem('v129_projects')});
await p.goto('http://localhost:8765/t15.html');await p.waitForTimeout(7000);const E=s=>p.evaluate(s=>window.__E(s),s);const o=out[mob?'phone':'desktop']={};
await E(`APP.view='videos';render()`);await p.waitForTimeout(800);await p.setInputFiles('#v127 input[data-v127f]',[TV+'a.webm']);await p.waitForTimeout(1500);
await p.click('#v127 .v129go');await p.waitForTimeout(1500);
o.box=await p.evaluate(()=>!!document.querySelector('#v129 #v134')&&document.querySelectorAll('#v134 .v134ex button').length);
await p.screenshot({path:mob?'ux/v134_p0.png':'ux/v134_d0.png'});
await p.click('#v134 .v134ex button:first-child');await p.click('#v134 [data-v134="run"]');await p.waitForTimeout(150);o.busy=await p.evaluate(()=>!!document.querySelector('#v134 .v134busy'));
await p.waitForFunction(()=>document.querySelectorAll('#v134 .v134m.a').length>0,null,{timeout:10000});
o.reply=await p.evaluate(()=>{const m=document.querySelector('#v134 .v134m.a');return {text:m.querySelector('p').textContent.slice(0,40),chips:[...m.querySelectorAll('.v134ch i')].map(x=>x.textContent),btns:[...m.querySelectorAll('.px-btn')].map(x=>x.textContent)}});
o.state=await E(`(()=>{const p=__v129.E.p;return {look:p.look,cap:p.capStyle,progress:p.progress,outro:p.kit.outro,cta:p.kit.cta,layers:p.layers.map(l=>l.type+(l.fx?':'+l.fx:l.el?':'+l.el:'')+(l.snd?'+'+l.snd:'')).join(' '),sfx:p.sfx.length,fx:p.fx,pro:p.pro}})()`);
o.prompt=await E(`(()=>{const t=window.__lastPrompt||'';return {len:t.length,hasState:t.includes('"clip_seconds"'),hasReq:t.includes('הבקשה עכשיו')}})()`);
await p.screenshot({path:mob?'ux/v134_p1.png':'ux/v134_d1.png'});
await p.click('#v134 [data-v134="undo"]');await p.waitForTimeout(400);o.undone=await E(`__v129.E.p.look+' '+__v129.E.p.layers.length`);
// the structured brief
await p.click('#v134 [data-v134="brief"]');await p.waitForTimeout(200);await p.fill('#v134 [data-v134b="goal"]','להציג את הפרויקט בחנקין 41');await p.fill('#v134 [data-v134b="tone"]','אנרגטי');await p.fill('#v134 [data-v134b="moments"]','בשנייה 2 כותרת');
await p.click('#v134 [data-v134="fill"]');o.composed=await p.evaluate(()=>document.getElementById('v134q').value);
await p.screenshot({path:mob?'ux/v134_p2.png':'ux/v134_d2.png'});
// an error is explained, nothing changes
await p.fill('#v134q','שגיאה בבקשה');await p.click('#v134 [data-v134="run"]');await p.waitForTimeout(800);o.err=await p.evaluate(()=>{const m=[...document.querySelectorAll('#v134 .v134m.err')].pop();return m&&m.textContent});
o.over=await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth);o.errors=errs.slice(0,3);await ctx.close()}
console.log(JSON.stringify(out,null,1));await b.close()})().catch(e=>{console.error('FATAL',e);process.exit(1)});
