const {chromium}=require('playwright-core');const zlib=require('zlib');
// a tiny real PNG (64x96, teal) as the fake OpenAI answer
function png(w,h){const raw=Buffer.alloc((w*3+1)*h);for(let y=0;y<h;y++){raw[y*(w*3+1)]=0;for(let x=0;x<w;x++){const o=y*(w*3+1)+1+x*3;raw[o]=16;raw[o+1]=85+y;raw[o+2]=114+x}}
 const crc=(b)=>{let c,t=[];for(let n=0;n<256;n++){c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;t[n]=c>>>0}c=0xffffffff;for(const x of b)c=t[(c^x)&255]^(c>>>8);return (c^0xffffffff)>>>0};
 const ch=(type,data)=>{const l=Buffer.alloc(4);l.writeUInt32BE(data.length);const td=Buffer.concat([Buffer.from(type),data]);const c=Buffer.alloc(4);c.writeUInt32BE(crc(td));return Buffer.concat([l,td,c])};
 const ih=Buffer.alloc(13);ih.writeUInt32BE(w,0);ih.writeUInt32BE(h,4);ih[8]=8;ih[9]=2;return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),ch('IHDR',ih),ch('IDAT',zlib.deflateSync(raw)),ch('IEND',Buffer.alloc(0))]).toString('base64')}
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox']});const out={};
for(const mob of [false,true]){const ctx=await b.newContext(mob?{viewport:{width:390,height:844},isMobile:true,hasTouch:true}:{viewport:{width:1440,height:900}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));const o=out[mob?'phone':'desktop']={};const reqs=[];
await p.route('https://api.openai.com/**',async r=>{const u=r.request().url();const body=r.request().postData()||'';reqs.push({u:u.replace('https://api.openai.com/v1',''),auth:(r.request().headers()['authorization']||'').slice(0,12),body:body});
 if(/models/.test(u))return r.fulfill({status:200,contentType:'application/json',body:'{"data":[]}'});
 if(/generations/.test(u)){const j=JSON.parse(body);if(/forbidden/.test(j.prompt))return r.fulfill({status:400,contentType:'application/json',body:'{"error":{"message":"Your request was rejected by the safety system"}}'});
  return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({data:Array.from({length:j.n},()=>({b64_json:png(64,96)}))})})}
 if(/edits/.test(u))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({data:[{b64_json:png(64,96)}]})});r.abort()});
await p.addInitScript(()=>{localStorage.setItem('pro_seen','true');localStorage.setItem('ag_v104_done_v1','1');localStorage.setItem('ag_v107_done_v1','1');localStorage.setItem('ag_v110_done_v2','1');localStorage.removeItem('v140_oa_key')});
await p.goto('http://localhost:8765/t15.html');await p.waitForTimeout(7000);const E=s=>p.evaluate(s=>window.__E(s),s);
// a fake asset store so the library path is exercised
await E(`(()=>{window.__ups=[];KC.assets={upload:async b=>{const id='f'+(__ups.length+1)+'0000000000000000000000000000000'.slice(0,30);__ups.push(b.size);return {id,url:URL.createObjectURL(b),sizeBytes:b.size}}}})()`);
await E(`(()=>{const it=APP.sched.items.find(i=>i.at&&!i.reel);peOpen(itemPost(it));PE.tab='image';peRender()})()`);await p.waitForTimeout(900);
o.button=await p.evaluate(()=>{const b=document.querySelector('#pe-root [data-v140="open"]');if(!b)return null;b.scrollIntoView({block:'center'});const n=b.closest('.pe-sec').nextElementSibling;return {text:b.textContent,nextIsSwap:!!(n&&/החלפת תמונה/.test(n.textContent.slice(0,40)))}});
await p.screenshot({path:mob?'ux/v140_btn_p.png':'ux/v140_btn_d.png'});
await p.locator('#pe-root [data-v140="open"]').first().click();await p.waitForTimeout(400);
o.prefilled=await p.evaluate(()=>document.querySelector('#v140 [data-v140="prompt"]').value);o.goDisabledNoKey=await p.evaluate(()=>document.querySelector('#v140 .v140go').disabled);
await p.screenshot({path:mob?'ux/v140_key_p.png':'ux/v140_key_d.png'});
await p.fill('#v140 [data-v140="key"]','sk-test-1234567890abcd');await p.click('#v140 [data-v140="keysave"]');await p.waitForTimeout(600);
o.connected=await p.evaluate(()=>document.querySelector('#v140 .v140kh b').textContent);o.keyInDb=await E(`JSON.stringify(localStorage).includes('sk-test')`);
await p.click('#v140 [data-v140="style"][data-k="golden"]');await p.click('#v140 [data-v140="n"][data-k="2"]');
await p.click('#v140 [data-v140="go"]');await p.waitForFunction(()=>document.querySelectorAll('#v140 .v140card').length>=2,null,{timeout:15000});
o.req=reqs.filter(r=>/generations/.test(r.u)).map(r=>{const j=JSON.parse(r.body);return {auth:r.auth,model:j.model,size:j.size,n:j.n,q:j.quality,golden:/golden hour/.test(j.prompt),brand:/no text/.test(j.prompt)}})[0];
await p.screenshot({path:mob?'ux/v140_res_p.png':'ux/v140_res_d.png'});
const before=await E(`(()=>{const sl=peSlots(PE.p);return sl[PE.slot]&&sl[PE.slot].o.k})()`);
await p.locator('#v140 [data-v140="use"][data-i="0"]').click();await p.waitForTimeout(1500);
o.used={before,after:await E(`(()=>{const sl=peSlots(PE.p);return sl[PE.slot]&&sl[PE.slot].o.k})()`),uploads:await E(`__ups.length`),name:await E(`(()=>{const sl=peSlots(PE.p);return LIB_NAMES[sl[PE.slot].o.k]})()`),btn:await p.evaluate(()=>document.querySelector('#v140 [data-v140="use"][data-i="0"]').textContent)};
// a variation of a result goes through the edits endpoint
await p.locator('#v140 [data-v140="vary"][data-i="1"]').click();await p.waitForFunction(()=>document.querySelectorAll('#v140 .v140card').length>=3,null,{timeout:15000});o.editCalled=reqs.some(r=>/edits/.test(r.u));
// a refused prompt shows the reason
await p.fill('#v140 [data-v140="prompt"]','forbidden thing');await p.click('#v140 [data-v140="go"]');await p.waitForSelector('#v140 .v140err',{timeout:10000});o.refused=await p.evaluate(()=>document.querySelector('#v140 .v140err').textContent);
await p.keyboard.press('Escape');await p.waitForTimeout(300);o.closed=await p.evaluate(()=>!document.getElementById('v140'));
o.errors=errs.slice(0,3);await ctx.close()}
console.log(JSON.stringify(out,null,1));await b.close()})().catch(e=>{console.error('FATAL',e);process.exit(1)});
