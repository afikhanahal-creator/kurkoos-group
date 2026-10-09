// node render_each.cjs <posts.json> <outdir> : one 1080x1350 JPG per post, named <folder>/<name>.jpg as given in post._file
const {chromium}=require('playwright-core');const fs=require('fs');const path=require('path');(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox']});const p=await b.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>localStorage.setItem('pro_seen','true'));await p.goto('http://localhost:8765/t15.html');await p.waitForTimeout(12000);
const posts=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));const out=process.argv[3];let n=0;
for(const q of posts){const url=await p.evaluate(async(q)=>{const E=window.__E;const LR=E('LIBREADY');
  if(q.fx&&q.fx.shot&&!LR[q.fx.shot.k]){const k=q.fx.shot.k;const src=/^u_/.test(k)?'blobs/'+k.slice(2)+'.jpg':'photos/'+k+'.jpg';
    await new Promise(ok=>{const im=new Image();im.onload=()=>{LR[k]=im;ok()};im.onerror=()=>ok();im.src=src})}
  if(q.fx&&q.fx.shot&&!LR[q.fx.shot.k])return 'ERR no photo '+q.fx.shot.k;
  const cv=document.createElement('canvas');cv.width=1080;cv.height=1350;try{E('drawSlide')(cv,q,0)}catch(e){return 'ERR '+e.message}return cv.toDataURL('image/jpeg',.9)},q);
  if(String(url).startsWith('ERR')){errs.push(q.id+' '+url);continue}
  const f=path.join(out,q._file);fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,Buffer.from(url.split(',')[1],'base64'));n++}
console.log('rendered',n,'errs',errs.slice(0,5));await b.close()})();
