// Free the room taken by ads that stopped running (2026-11-06 — the free plan's 1 GB ran out at 1.23 GB, 486 MB of it Meta
// captures). For every comp_shots row whose ad is now `inactive` in meta_ads: the row points at the creative itself (the 600px
// picture or the video frame, ~40 KB), and the big card screenshot (+ the old 1080px preview) is deleted from storage. The ad
// text, CTA, landing page, dates and the creative stay; only the picture of the whole ad card goes.
// Needs policies_on.sql (it includes "meta capture delete"); run policies_off.sql after.
// node prune.cjs [--dry] [--limit 50] [--days 0]   (--days N: only ads inactive and captured more than N days ago)
const fs=require('fs');const path=require('path');const cp=require('child_process');
const A=Object.fromEntries(process.argv.slice(2).map((a,i,v)=>a.startsWith('--')?[a.slice(2),(v[i+1]&&!v[i+1].startsWith('--'))?v[i+1]:true]:[]).filter(x=>x.length));
const H=__dirname;const TMP=path.join(H,'prune');fs.mkdirSync(TMP,{recursive:true});
const KEY=(fs.readFileSync(path.join(H,'..','..','public','engine','bridge.js'),'utf8').match(/const KEY = '([^']+)'/)||[])[1];
const SB='https://filnzlnvujnlazwcxbuq.supabase.co';const PUB=SB+'/storage/v1/object/public/engine-media/';
const LIMIT=+A.limit||0;const DAYS=+A.days||0;
const log=s=>{const l=new Date().toISOString().slice(11,19)+' '+s;console.log(l);fs.appendFileSync(path.join(H,'prune.log'),l+'\n')};
const sh=c=>cp.execSync(c,{maxBuffer:64e6}).toString();
function curl(method,url,headers,file){const hs=Object.entries(headers).map(([k,v])=>`-H '${k}: ${v}'`).join(' ');const data=file?`--data-binary @"${file}"`:'';
 const b=sh(`curl -s -m 180 -X ${method} -w '\\n%{http_code}' ${hs} ${data} "${url}"`);const k=b.lastIndexOf('\n');return {status:+b.slice(k+1),body:b.slice(0,k)}}
const auth={apikey:KEY,Authorization:'Bearer '+KEY};
function readAll(q){let out=[];for(let off=0;;off+=1000){const r=curl('GET',`${SB}/rest/v1/engine_docs?${q}&limit=1000&offset=${off}`,auth);
 if(r.status===402){log('STOP: Supabase answered 402 (the project is restricted).');process.exit(3)}
 if(r.status!==200)throw new Error('read '+r.status+' '+r.body.slice(0,200));const l=JSON.parse(r.body);out=out.concat(l);if(l.length<1000)return out}}
const jsonFile=(name,v)=>{const f=path.join(TMP,name);fs.writeFileSync(f,JSON.stringify(v));return f};

const status=new Map(readAll('collection=eq.meta_ads&select=id,status:data->>status').map(r=>[String(r.id).replace(/^meta_/,''),r.status]));
const rows=readAll('collection=eq.comp_shots&id=like.meta_*&select=id,data&order=id');
const cut=DAYS?Date.now()-DAYS*864e5:Infinity;
const todo=rows.filter(r=>{const d=r.data||{};const ad=String(d.ad_id||r.id.replace(/^meta_/,''));
 return status.get(ad)==='inactive'&&d.creative_blob&&d.blob!==d.creative_blob&&(!DAYS||Date.parse(d.captured||d.added||0)<cut)});
log(`rows ${rows.length}, ads known ${status.size}, inactive with a card to drop ${todo.length}`);
let n=0,freed=0;const batch=[],files=[];
function flush(){if(!batch.length)return;if(A.dry){batch.length=0;files.length=0;return}
 // the row first (it then shows the creative), the files after: a failed delete only leaves a file behind, never a broken row
 const r=curl('POST',`${SB}/rest/v1/engine_docs?on_conflict=collection,id`,Object.assign({'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=minimal'},auth),jsonFile('_rows.json',batch));
 if(r.status>=300)throw new Error('upsert '+r.status+' '+r.body.slice(0,200));
 const d=curl('DELETE',`${SB}/storage/v1/object/engine-media`,Object.assign({'Content-Type':'application/json'},auth),jsonFile('_del.json',{prefixes:files}));
 if(d.status>=300)throw new Error('delete '+d.status+' '+d.body.slice(0,200));
 batch.length=0;files.length=0}
for(const row of todo){if(LIMIT&&n>=LIMIT)break;const d=row.data;
 const drop=[d.blob,d.prev_blob].filter(b=>b&&/^blob\/meta\//.test(b)&&b!==d.creative_blob);
 const type=/\.png$/.test(d.creative_blob)?'image/png':'image/jpeg';
 batch.push({collection:'comp_shots',id:row.id,data:Object.assign({},d,{url:d.creative||PUB+d.creative_blob,blob:d.creative_blob,w:+d.cw||0,h:+d.ch||0,type,name:path.basename(d.creative_blob),
  prev:'',prev_blob:'',card_pruned:new Date().toISOString().slice(0,10),card_bytes:+d.bytes||0,bytes:0})});
 files.push(...drop);freed+=+d.bytes||0;n++;
 if(batch.length>=50){flush();log(`pruned ${n}, ~${(freed/1048576).toFixed(0)} MB of cards`)}}
flush();log(`done ${n}${A.dry?' (dry run, nothing changed)':''}, ~${(freed/1048576).toFixed(0)} MB of cards (+ the previews)`);
