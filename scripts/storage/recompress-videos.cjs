// Re-encode the site's and the engine's videos for the web, in place (same path, so every link keeps working), to keep the
// project inside the free plan's 1 GB (2026-11-06: restricted at 1.23 GB, ~270 MB of it videos). H.264 CRF 27, the short side
// at most 1080 px, AAC 96 kb/s, +faststart (plays while it downloads); a file is replaced only when the new one is at least
// 25% smaller. The list of paths is a JSON file ([{ bucket, name, size }], made with the SQL in the README below).
// Needs ffmpeg and policies_video_on.sql (run policies_video_off.sql after).
// node recompress-videos.cjs list.json [--dry] [--crf 27]
const fs=require('fs');const path=require('path');const cp=require('child_process');
const A=Object.fromEntries(process.argv.slice(3).map((a,i,v)=>a.startsWith('--')?[a.slice(2),(v[i+1]&&!v[i+1].startsWith('--'))?v[i+1]:true]:[]).filter(x=>x.length));
const LIST=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));const CRF=+A.crf||27;
const H=__dirname;const TMP=path.join(H,'tmp');fs.mkdirSync(TMP,{recursive:true});
const KEY=(fs.readFileSync(path.join(H,'..','..','public','engine','bridge.js'),'utf8').match(/const KEY = '([^']+)'/)||[])[1];
const SB='https://filnzlnvujnlazwcxbuq.supabase.co';
const log=s=>{const l=new Date().toISOString().slice(11,19)+' '+s;console.log(l);fs.appendFileSync(path.join(H,'recompress.log'),l+'\n')};
const sh=c=>cp.execSync(c,{maxBuffer:64e6,stdio:['ignore','pipe','pipe']}).toString();
const done=new Set(fs.existsSync(path.join(H,'recompress.done'))?fs.readFileSync(path.join(H,'recompress.done'),'utf8').split('\n').filter(Boolean):[]);
let before=0,after=0,n=0;
for(const f of LIST){const key=f.bucket+'/'+f.name;if(done.has(key))continue;
 const src=path.join(TMP,'in.mp4'),dst=path.join(TMP,'out.mp4');
 try{const g=sh(`curl -s -m 300 -o "${src}" -w '%{http_code}' "${SB}/storage/v1/object/public/${encodeURI(key)}"`).trim();
  if(g==='402'){log('STOP: Supabase answered 402 (the project is restricted).');process.exit(3)}if(g!=='200')throw new Error('get '+g);
  sh(`ffmpeg -y -v error -i "${src}" -map 0:v:0 -map 0:a:0? -c:v libx264 -preset slow -crf ${CRF} -pix_fmt yuv420p -vf "scale='if(lt(iw,ih),min(1080,iw),-2)':'if(lt(iw,ih),-2,min(1080,ih))'" -c:a aac -b:a 96k -movflags +faststart "${dst}"`);
  const a=fs.statSync(src).size,b=fs.statSync(dst).size;
  if(b>a*0.75){log(`keep ${key}: ${(a/1048576).toFixed(1)} → ${(b/1048576).toFixed(1)} MB is not worth it`);fs.appendFileSync(path.join(H,'recompress.done'),key+'\n');continue}
  if(!A.dry){const u=sh(`curl -s -m 300 -X PUT -w '%{http_code}' -o /dev/null -H 'apikey: ${KEY}' -H 'Authorization: Bearer ${KEY}' -H 'Content-Type: video/mp4' -H 'x-upsert: true' -H 'cache-control: max-age=31536000' --data-binary @"${dst}" "${SB}/storage/v1/object/${encodeURI(key)}"`).trim();
   if(u!=='200')throw new Error('upload '+u)}
  before+=a;after+=b;n++;fs.appendFileSync(path.join(H,'recompress.done'),key+'\n');
  log(`${A.dry?'would replace':'replaced'} ${key}: ${(a/1048576).toFixed(1)} → ${(b/1048576).toFixed(1)} MB`)
 }catch(e){log('ERR '+key+' '+String(e.message).slice(0,160))}}
log(`done ${n}, ${(before/1048576).toFixed(0)} MB → ${(after/1048576).toFixed(0)} MB`);
// README — the list (Supabase SQL editor / connector), then save the JSON next to this script:
//   select coalesce(json_agg(json_build_object('bucket',bucket_id,'name',name,'size',(metadata->>'size')::bigint) order by (metadata->>'size')::bigint desc),'[]')
//   from storage.objects where bucket_id in ('engine-media','media') and metadata->>'mimetype' like 'video/%' and (metadata->>'size')::bigint > 1500000;
