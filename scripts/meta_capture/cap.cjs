// Meta Ads Library capture: for each public ad page, keep the creative itself (image at its own resolution, or a frame
// of the video) and a 4K screenshot of the ad card, plus the ad text, platforms, dates, CTA and landing page.
// node cap.cjs --out DIR --ids a,b,c [--dsf 6] [--probe]
const {chromium}=require('playwright-core');const fs=require('fs');const path=require('path');const cp=require('child_process');
const A=Object.fromEntries(process.argv.slice(2).map((a,i,v)=>a.startsWith('--')?[a.slice(2),(v[i+1]&&!v[i+1].startsWith('--'))?v[i+1]:true]:[]).filter(x=>x.length));
const OUT=A.out||path.join(__dirname,'out');fs.mkdirSync(OUT,{recursive:true});
const IDS=String(A.ids||'').split(',').filter(Boolean);const DSF=+A.dsf||7;
const FF='/usr/bin/ffmpeg';
const SPKI=cp.execSync("openssl x509 -in /root/.ccr/agent-proxy-ca.crt -pubkey -noout | openssl pkey -pubin -outform der | openssl dgst -sha256 -binary | base64").toString().trim();
const UA='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const extOf=(ct,u)=>/png/.test(ct)?'png':/webp/.test(ct)?'webp':/gif/.test(ct)?'gif':/mp4|video/.test(ct)?'mp4':(u.match(/\.(jpe?g|png|webp|gif|mp4)(\?|$)/i)||[])[1]?.toLowerCase().replace('jpeg','jpg')||'jpg';
const imgSize=f=>{try{const o=cp.execSync(`python3 -c "import struct,sys;from PIL import Image;im=Image.open(sys.argv[1]);print(im.width,im.height)" "${f}"`).toString().trim().split(' ');return [+o[0],+o[1]]}catch(e){return [0,0]}};

// in page: find the ad card and read everything on it
const READ=(id)=>{
 const txt=e=>(e&&e.innerText||'').trim();
 const all=[...document.querySelectorAll('div,span')];
 const idEls=all.filter(e=>e.childElementCount<=3&&(e.textContent||'').includes(id)&&(e.textContent||'').includes('מזהה'));
 if(!idEls.length)return {err:'no-card',text:(document.body.innerText||'').slice(0,400)};
 const idEl=idEls[idEls.length-1];
 const dlg=idEl.closest('[role="dialog"]')||document.body;
 const vis=e=>{const r=e.getBoundingClientRect();return r.width>40&&r.height>40};
 const imgs=[...dlg.querySelectorAll('img')].filter(i=>i.naturalWidth>=200&&vis(i)).map(i=>({el:i,src:i.currentSrc||i.src,w:i.naturalWidth,h:i.naturalHeight,area:i.getBoundingClientRect().width*i.getBoundingClientRect().height}));
 const vids=[...dlg.querySelectorAll('video')].map(v=>({el:v,src:v.currentSrc||v.src||(v.querySelector('source')||{}).src||'',poster:v.poster||'',w:v.videoWidth,h:v.videoHeight}));
 const media=vids.length?vids[0]:imgs.sort((a,b)=>b.area-a.area)[0];
 // the card: the nearest ancestor of the id line that also holds the media
 // the card: the smallest ancestor of the id line that also holds the sponsored block (and the media when there is one)
 const has=(e,s)=>(e.textContent||'').includes(s);
 let card=idEl;while(card&&card!==dlg&&!(has(card,'ממומן')&&(!media||card.contains(media.el))))card=card.parentElement;
 if(!card||card===dlg){card=idEl;while(card.parentElement&&card.parentElement!==dlg&&!has(card,'ממומן'))card=card.parentElement}
 if(card===dlg||!card){card=idEl;for(let k=0;k<6&&card.parentElement&&card.parentElement!==dlg;k++)card=card.parentElement}
 document.querySelectorAll('[data-kcap]').forEach(e=>e.removeAttribute('data-kcap'));
 // tighten: climb while the parent has the same size (wrappers)
 card.setAttribute('data-kcap','1');
 const cr=card.getBoundingClientRect();
 const t=txt(card);
 const lines=t.split('\n').map(s=>s.trim()).filter(Boolean);
 const start=(t.match(/התחילה לפעול ב-([^\n]+)/)||[])[1]||'';
 const head=lines.slice(0,4).join(' ');const status=/לא פעילה/.test(head)?'inactive':/(^|\s)פעילה(\s|$)/.test(head)?'active':'';
 const plats=[...card.querySelectorAll('[aria-label],[title]')].map(e=>e.getAttribute('aria-label')||e.getAttribute('title')).filter(Boolean);
 const buttons=[...card.querySelectorAll('[role="button"],a[role="link"],a')].map(e=>txt(e)).filter(s=>s&&s.length<40);
 const links=[...card.querySelectorAll('a[href]')].map(a=>a.href).filter(h=>!/facebook\.com\/ads\/library/.test(h));
 // body: lines after 'ממומן' up to the media, roughly: take lines after the sponsored marker
 const si=lines.findIndex(l=>l==='ממומן');
 const body=si>=0?lines.slice(si+1).filter(l=>!/^(לפרטים|מידע נוסף|הרשמה|שלח\/י הודעה|קבל\/י הצעה|למידע נוסף|הזמנה עכשיו|קנה\/י עכשיו)$/.test(l)).join('\n'):lines.join('\n');
 const page_name=si>0?lines[si-1]:'';
 const videoErr=/מתקשים להציג סרטון/.test(t);
 return {ok:true,card:{x:cr.x,y:cr.y,w:cr.width,h:cr.height},lines,start,status,plats,buttons,links,body,page_name,videoErr,
  media:media?{type:vids.length?'video':'image',src:media.src,poster:media.poster||'',w:media.w,h:media.h}:null,
  images:imgs.map(i=>({src:i.src,w:i.w,h:i.h})),videos:vids.map(v=>({src:v.src,poster:v.poster,w:v.w,h:v.h}))}};

(async()=>{
 const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox','--lang=he-IL','--ignore-certificate-errors-spki-list='+SPKI,'--autoplay-policy=no-user-gesture-required'],proxy:{server:process.env.HTTPS_PROXY}});
 const ctx=await browser.newContext({viewport:{width:760,height:1400},deviceScaleFactor:DSF,locale:'he-IL',userAgent:UA,extraHTTPHeaders:{'Accept-Language':'he-IL,he;q=0.9,en;q=0.8'}});
 const p=await ctx.newPage();let vidUrls=[];p.on('response',res=>{try{const u=res.url();const ct=res.headers()['content-type']||'';if(/video\//.test(ct)||/\.mp4(\?|$)/.test(u))vidUrls.push(u)}catch(e){}});
 const results=[];
 for(const id of IDS){const t0=Date.now();const r={id};
  try{
   const url='https://www.facebook.com/ads/library/?id='+id;
   vidUrls=[];await p.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
   let info=null,seen=0;for(let k=0;k<40;k++){await sleep(1000);try{info=await p.evaluate(READ,id)}catch(e){info={err:'ctx'};continue}if(info.ok){seen++;if(info.media||info.videoErr||seen>=10)break}if(/login|checkpoint/.test(p.url())){r.err='login-wall';break}}
   if(!info||!info.ok){r.err=r.err||(info&&info.err)||'no-card';r.text=info&&info.text;results.push(r);console.log(JSON.stringify(r));continue}
   await sleep(1500);info=await p.evaluate(READ,id);// let images settle
   Object.assign(r,{page_name:info.page_name,body:info.body,start:info.start,status:info.status,plats:info.plats,buttons:info.buttons,links:info.links,media:info.media,videoErr:info.videoErr,card:info.card});
   if(A.probe){r.lines=info.lines;r.images=info.images;r.videos=info.videos}
   if(A.details){try{const b=await p.$('[data-kcap] [role="button"]:has-text("פרטי המודעה")');if(b){await b.click();await sleep(4000);r.details=await p.evaluate(()=>({url:location.href,imgs:[...document.images].filter(i=>i.naturalWidth>=250).map(i=>[i.naturalWidth,i.naturalHeight,(i.currentSrc||i.src).slice(0,140)]),vids:[...document.querySelectorAll('video')].map(v=>[v.videoWidth,v.videoHeight,(v.currentSrc||v.src).slice(0,100)]),text:document.body.innerText.slice(0,600).replace(/\n+/g,' | ')}));await p.screenshot({path:path.join(OUT,id+'_details.png')})}}catch(e){r.detailsErr=e.message.slice(0,100)}}
   // the creative itself
   if(info.media&&info.media.type==='video'&&!/^https?:/.test(info.media.src||'')){const u=vidUrls.find(x=>/fbcdn|video/.test(x));if(u)info.media.src=u.replace(/&bytestart=\d+&byteend=\d+/,'')}
   if(!info.media&&vidUrls.length){info.media={type:'video',src:vidUrls[0].replace(/&bytestart=\d+&byteend=\d+/,''),poster:'',w:0,h:0};r.media=info.media}
   if(info.media&&info.media.src){const m=info.media;const resp=await ctx.request.get(m.src,{timeout:60000});const ct=resp.headers()['content-type']||'';const buf=await resp.body();
    const ext=extOf(ct,m.src);const f=path.join(OUT,id+'.'+ext);fs.writeFileSync(f,buf);r.file=f;r.bytes=buf.length;r.ct=ct;
    if(m.type==='video'||ext==='mp4'){const jf=path.join(OUT,id+'_frame.jpg');try{cp.execSync(`${FF} -y -loglevel error -ss 1 -i "${f}" -frames:v 1 -q:v 2 "${jf}"`);r.frame=jf;const [w,h]=imgSize(jf);r.fw=w;r.fh=h;try{fs.unlinkSync(f)}catch(e){}r.file='';
      if(info.videoErr||true){// show the frame on the card instead of the player (headless has no codec for the stream)
       const b64=fs.readFileSync(jf).toString('base64');await p.evaluate(({b64})=>{const card=document.querySelector('[data-kcap]');const v=card&&card.querySelector('video');const box=v?(v.closest('[style*="padding"]')||v.parentElement.parentElement):null;
        const errs=[...card.querySelectorAll('div,span')].filter(e=>/מתקשים להציג סרטון/.test(e.textContent));const err=errs[errs.length-1];let host=err;const cw=card.getBoundingClientRect().width;while(host&&host.parentElement&&host.parentElement!==card&&host.getBoundingClientRect().width<cw*.8&&host.parentElement.getBoundingClientRect().height<420)host=host.parentElement;
        const img=new Image();img.src='data:image/jpeg;base64,'+b64;img.style.cssText='display:block;width:100%;height:auto;margin:8px 0';
        const tgt=host||box;if(tgt){tgt.replaceWith(img);let q=img.parentElement;for(let k=0;k<4&&q&&q!==card;k++,q=q.parentElement){q.style.height='auto';q.style.maxHeight='none';q.style.minHeight='0';q.style.overflow='visible'}return}
        // no player at all: put the frame where the media sits, just before the landing/CTA block
        const cta=[...card.querySelectorAll('div')].find(e=>e.childElementCount<=6&&/[A-Z0-9]{3,}\.[A-Z]{2,}/.test(e.textContent||'')&&e.getBoundingClientRect().width>card.getBoundingClientRect().width*.5);
        if(cta){let blk=cta;while(blk.parentElement&&blk.parentElement!==card&&blk.parentElement.getBoundingClientRect().width<card.getBoundingClientRect().width*.95)blk=blk.parentElement;blk.parentElement.insertBefore(img,blk)}else card.appendChild(img)},{b64});await sleep(800)}}catch(e){r.frameErr=String(e.message).slice(0,120)}}
    else{const [w,h]=imgSize(f);r.w=w;r.h=h}}
   // the 4K card screenshot
   const card=await p.$('[data-kcap]');if(card){await card.scrollIntoViewIfNeeded();const sf=path.join(OUT,id+'_card.jpg');await card.screenshot({path:sf,type:'jpeg',quality:90});r.shot=sf;const [w,h]=imgSize(sf);r.sw=w;r.sh=h;r.sbytes=fs.statSync(sf).size}
  }catch(e){r.err=String(e.message).slice(0,200)}
  r.ms=Date.now()-t0;results.push(r);console.log(JSON.stringify(r));
  fs.writeFileSync(path.join(OUT,id+'.json'),JSON.stringify(r,null,1));
  await sleep(1200+Math.random()*1500)}
 await browser.close();
})();
