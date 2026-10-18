// Find older ads: open each competitor page in the public Meta Ads Library with "inactive" ads (the ones that already
// stopped), scroll the list, and collect every library id we do not have yet. Writes older.json ({id,page_id,comp_id,
// comp_name,start,status}) for cap.cjs; nothing is uploaded here. No login, no CAPTCHA: a login wall stops the run.
// node older.cjs [--pages 3] [--scrolls 25] [--only C001,C002]
const {chromium}=require('playwright-core');const fs=require('fs');const path=require('path');const cp=require('child_process');
const A=Object.fromEntries(process.argv.slice(2).map((a,i,v)=>a.startsWith('--')?[a.slice(2),(v[i+1]&&!v[i+1].startsWith('--'))?v[i+1]:true]:[]).filter(x=>x.length));
const H=__dirname;const SCROLLS=+A.scrolls||25;const ONLY=A.only?String(A.only).split(','):null;const MAXP=+A.pages||0;
const SPKI=cp.execSync("openssl x509 -in /root/.ccr/agent-proxy-ca.crt -pubkey -noout | openssl pkey -pubin -outform der | openssl dgst -sha256 -binary | base64").toString().trim();
const UA='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const log=s=>{const l=new Date().toISOString().slice(11,19)+' '+s;console.log(l);fs.appendFileSync(path.join(H,'older.log'),l+'\n')};
(async()=>{const ads=JSON.parse(fs.readFileSync(path.join(H,'ads.json'),'utf8'));const known=new Set(ads.map(a=>a.id));
 const f=path.join(H,'older.json');const found=fs.existsSync(f)?JSON.parse(fs.readFileSync(f,'utf8')):[];found.forEach(x=>known.add(x.id));
 const pages=new Map();ads.forEach(a=>{if(a.page_id&&(!ONLY||ONLY.includes(a.comp_id))&&!pages.has(a.page_id))pages.set(a.page_id,{comp_id:a.comp_id,comp_name:a.comp_name})});
 const doneP=new Set(fs.existsSync(path.join(H,'older.done'))?fs.readFileSync(path.join(H,'older.done'),'utf8').split('\n').filter(Boolean):[]);
 const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox','--lang=he-IL','--ignore-certificate-errors-spki-list='+SPKI],proxy:{server:process.env.HTTPS_PROXY}});
 const ctx=await browser.newContext({viewport:{width:1280,height:1600},locale:'he-IL',userAgent:UA,extraHTTPHeaders:{'Accept-Language':'he-IL,he;q=0.9'}});const p=await ctx.newPage();
 let np=0;
 for(const [pid,c] of pages){if(doneP.has(pid))continue;if(MAXP&&np>=MAXP)break;np++;
  const url=`https://www.facebook.com/ads/library/?active_status=inactive&ad_type=all&country=IL&media_type=all&search_type=page&view_all_page_id=${pid}`;
  try{await p.goto(url,{waitUntil:'domcontentloaded',timeout:60000});await sleep(5000);if(/login|checkpoint/.test(p.url())){log('LOGIN WALL');break}
   let last=0,same=0;for(let k=0;k<SCROLLS;k++){await p.mouse.wheel(0,4000);await sleep(1800+Math.random()*1200);const n=await p.evaluate(()=>(document.body.innerText.match(/מזהה ספרייה:\s*\d+/g)||[]).length);if(n===last){if(++same>=3)break}else same=0;last=n}
   const rows=await p.evaluate(()=>{const out=[];const t=document.body.innerText;const re=/(לא פעילה|פעילה)?[\s\S]{0,40}?מזהה ספרייה:\s*(\d+)[\s\S]{0,80}?(?:(\d{1,2} ב[א-ת']+ \d{4})\s*-\s*(\d{1,2} ב[א-ת']+ \d{4})|התחילה לפעול ב-([^\n]+))?/g;let m;while((m=re.exec(t)))out.push({id:m[2],st:m[1]||'',from:m[3]||m[5]||'',to:m[4]||''});return out});
   let add=0;rows.forEach(r=>{if(known.has(r.id))return;known.add(r.id);found.push({id:r.id,page_id:pid,comp_id:c.comp_id,comp_name:c.comp_name,start_text:r.from,end_text:r.to,status:'inactive',first_seen:new Date().toISOString()});add++});
   fs.writeFileSync(f,JSON.stringify(found));fs.appendFileSync(path.join(H,'older.done'),pid+'\n');log(`${c.comp_id} ${pid}: ${rows.length} on page, ${add} new (total ${found.length})`)
  }catch(e){log('ERR '+pid+' '+String(e.message).slice(0,120))}
  await sleep(2500+Math.random()*2500)}
 await browser.close();log('done, older ads found: '+found.length)})();
