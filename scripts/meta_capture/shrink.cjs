// Re-save the ad card screenshots already in storage at 2400px wide (webp q80) instead of 4K, to make room on the free
// plan. The ad picture on the card comes from a 600px original, so nothing is lost there; the text stays sharp.
// Uses the original 4K capture from out/ when it is still on disk, otherwise the stored webp. Needs policies_on.sql.
// node shrink.cjs [--dry] [--limit 20] [--width 2400]
const fs=require('fs');const path=require('path');const cp=require('child_process');
const A=Object.fromEntries(process.argv.slice(2).map((a,i,v)=>a.startsWith('--')?[a.slice(2),(v[i+1]&&!v[i+1].startsWith('--'))?v[i+1]:true]:[]).filter(x=>x.length));
const H=__dirname;const OUT=path.join(H,'out');const TMP=path.join(H,'shrink');fs.mkdirSync(TMP,{recursive:true});
const W=+A.width||2400;const LIMIT=+A.limit||0;
const KEY=(fs.readFileSync(path.join(H,'..','..','public','engine','bridge.js'),'utf8').match(/const KEY = '([^']+)'/)||[])[1];
const SB='https://filnzlnvujnlazwcxbuq.supabase.co';const PUB=SB+'/storage/v1/object/public/engine-media/';
const log=s=>{const l=new Date().toISOString().slice(11,19)+' '+s;console.log(l);fs.appendFileSync(path.join(H,'shrink.log'),l+'\n')};
const sh=c=>cp.execSync(c,{maxBuffer:64e6}).toString();
function curl(method,url,headers,file){const hs=Object.entries(headers).map(([k,v])=>`-H '${k}: ${v}'`).join(' ');const data=file?`--data-binary @"${file}"`:'';
 const b=sh(`curl -s -m 180 -X ${method} -w '\\n%{http_code}' ${hs} ${data} "${url}"`);const k=b.lastIndexOf('\n');return {status:+b.slice(k+1),body:b.slice(0,k)}}
const auth={apikey:KEY,Authorization:'Bearer '+KEY};
(async()=>{
 let rows=[];for(let off=0;;off+=1000){const r=curl('GET',`${SB}/rest/v1/engine_docs?collection=eq.comp_shots&id=like.meta_*&select=id,data&order=id&limit=1000&offset=${off}`,auth);
  if(r.status!==200)throw new Error('read '+r.status+' '+r.body.slice(0,200));const l=JSON.parse(r.body);rows=rows.concat(l);if(l.length<1000)break}
 const todo=rows.filter(r=>r.data&&r.data.blob&&/_card\.webp$/.test(r.data.blob)&&(+r.data.w||0)>W);log(`rows ${rows.length}, to shrink ${todo.length}`);
 let n=0,before=0,after=0,batch=[];const done=new Set(fs.existsSync(path.join(H,'shrink.done'))?fs.readFileSync(path.join(H,'shrink.done'),'utf8').split('\n').filter(Boolean):[]);
 const flush=()=>{if(!batch.length||A.dry){batch=[];return}const f=path.join(TMP,'_rows.json');fs.writeFileSync(f,JSON.stringify(batch));
  const r=curl('POST',`${SB}/rest/v1/engine_docs?on_conflict=collection,id`,Object.assign({'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=minimal'},auth),f);
  if(r.status>=300)throw new Error('upsert '+r.status+' '+r.body.slice(0,200));batch.forEach(x=>fs.appendFileSync(path.join(H,'shrink.done'),x.id+'\n'));batch=[]};
 for(const row of todo){if(LIMIT&&n>=LIMIT)break;if(done.has(row.id))continue;const d=row.data;const ad=String(d.ad_id||row.id.replace(/^meta_/,''));
  try{let src=path.join(OUT,ad+'_card.jpg');if(!fs.existsSync(src)){src=path.join(TMP,ad+'_in.webp');const r=sh(`curl -s -m 120 -o "${src}" -w '%{http_code}' "${PUB}${d.blob}"`);if(r.trim()!=='200')throw new Error('get '+r)}
   const dst=path.join(TMP,ad+'_card.webp');
   const wh=sh(`python3 - "${src}" "${dst}" ${W} <<'EOF'
import sys;from PIL import Image
im=Image.open(sys.argv[1]).convert('RGB');W=int(sys.argv[3])
if im.width>W:im=im.resize((W,round(im.height*W/im.width)),Image.LANCZOS)
im.save(sys.argv[2],'WEBP',quality=80,method=6);print(im.width,im.height)
EOF`).trim().split(' ').map(Number);
   const sz=fs.statSync(dst).size;before+=+d.bytes||0;after+=sz;
   // a 429 (too many connections) passes after a short wait
   if(!A.dry){let u;for(let k=0;k<6;k++){u=curl('POST',`${SB}/storage/v1/object/engine-media/${d.blob}`,Object.assign({'Content-Type':'image/webp','x-upsert':'true','cache-control':'3600'},auth),dst);if(u.status!==429&&u.status<500)break;cp.execSync('sleep '+(5+k*5))}if(u.status>=300)throw new Error('upload '+u.status+' '+u.body.slice(0,160))}
   batch.push({collection:'comp_shots',id:row.id,data:Object.assign({},d,{w:wh[0],h:wh[1],bytes:sz,shrunk:new Date().toISOString().slice(0,10)})});n++;
   try{fs.unlinkSync(dst)}catch(e){}if(src.startsWith(TMP))try{fs.unlinkSync(src)}catch(e){}
   if(batch.length>=20){flush();log(`shrunk ${n}, ${(before/1048576).toFixed(0)} MB -> ${(after/1048576).toFixed(0)} MB`)}
  }catch(e){log('ERR '+row.id+' '+String(e.message).slice(0,160));if(/upload 4|upsert 4/.test(e.message))break}}
 flush();log(`done ${n}, ${(before/1048576).toFixed(0)} MB -> ${(after/1048576).toFixed(0)} MB`)})();
