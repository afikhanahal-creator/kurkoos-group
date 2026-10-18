// Upload captured Meta ads into the engine: one comp_shots row per unique creative (same page, picture and text),
// with the card screenshot (webp, 2400px wide) and the creative itself (the 600px picture or the video frame).
// The 1080px preview is no longer made: the viewer shows the creative, and the card when asked for the whole ad.
// node up.cjs [--per-comp 6] [--dry] [--only C001] [--budget-mb 550]
const fs=require('fs');const path=require('path');const cp=require('child_process');const crypto=require('crypto');
const A=Object.fromEntries(process.argv.slice(2).map((a,i,v)=>a.startsWith('--')?[a.slice(2),(v[i+1]&&!v[i+1].startsWith('--'))?v[i+1]:true]:[]).filter(x=>x.length));
const H=__dirname;const OUT=path.join(H,'out');const UP=path.join(H,'up');fs.mkdirSync(UP,{recursive:true});
const PER=+A['per-comp']||0;const ONLY=A.only?String(A.only).split(','):null;const BUDGET=(+A['budget-mb']||0)*1048576;
const KEY=(fs.readFileSync(path.join(H,'..','..','public','engine','bridge.js'),'utf8').match(/const KEY = '([^']+)'/)||[])[1];
const SB='https://filnzlnvujnlazwcxbuq.supabase.co';const PUB=SB+'/storage/v1/object/public/engine-media/';
const ads=Object.fromEntries(JSON.parse(fs.readFileSync(path.join(H,'ads.json'),'utf8')).map(a=>[a.id,a]));
const log=s=>{const l=new Date().toISOString().slice(11,19)+' '+s;console.log(l);fs.appendFileSync(path.join(H,'up.log'),l+'\n')};
const sh=(c)=>cp.execSync(c,{maxBuffer:64e6}).toString();
function curl(method,url,headers,file){const hs=Object.entries(headers).map(([k,v])=>`-H '${k}: ${v}'`).join(' ');const data=file?`--data-binary @"${file}"`:'';
 const b=sh(`curl -s -m 180 -X ${method} -w '\\n%{http_code}' ${hs} ${data} "${url}"`);const k=b.lastIndexOf('\n');return {status:+b.slice(k+1),body:b.slice(0,k)}}
function upload(file,name,ct){if(A.dry)return {ok:true};const r=curl('POST',`${SB}/storage/v1/object/engine-media/${name}`,{apikey:KEY,Authorization:'Bearer '+KEY,'Content-Type':ct,'x-upsert':'true'},file);
 if(r.status>=300)throw new Error('upload '+r.status+' '+r.body.slice(0,160));return {ok:true}}
function upsert(rows){if(A.dry)return;const f=path.join(UP,'_rows.json');fs.writeFileSync(f,JSON.stringify(rows));
 const r=curl('POST',`${SB}/rest/v1/engine_docs?on_conflict=collection,id`,{apikey:KEY,Authorization:'Bearer '+KEY,'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=minimal'},f);
 if(r.status>=300)throw new Error('upsert '+r.status+' '+r.body.slice(0,200))}
// pictures: card -> webp q80 at 2400px wide (enough for the text to stay sharp; the picture on it is a 600px original), creative kept (jpg)
function pics(id){const card=path.join(OUT,id+'_card.jpg');if(!fs.existsSync(card))return null;const big=path.join(UP,id+'_card24.webp');
 if(!fs.existsSync(big)){sh(`python3 - "${card}" "${big}" <<'EOF'
import sys;from PIL import Image
im=Image.open(sys.argv[1]).convert('RGB')
if im.width>2400:im=im.resize((2400,round(im.height*2400/im.width)),Image.LANCZOS)
im.save(sys.argv[2],'WEBP',quality=80,method=6)
EOF`)}
 const [w,h]=sh(`python3 -c "from PIL import Image;im=Image.open('${big}');print(im.width,im.height)"`).trim().split(' ').map(Number);
 return {big,w,h,bytes:fs.statSync(big).size}}
(async()=>{
 const rs=fs.readdirSync(OUT).filter(f=>/^\d+\.json$/.test(f)).map(f=>{try{return JSON.parse(fs.readFileSync(path.join(OUT,f),'utf8'))}catch(e){return null}}).filter(r=>r&&r.shot);
 // group by creative: page + media file name + text
 const g={};for(const r of rs){const a=ads[r.id];if(!a)continue;if(ONLY&&!ONLY.includes(a.comp_id))continue;
  const m=r.media||{};const base=(m.src||'').split('?')[0].split('/').pop();const key=a.page_id+'|'+base+'|'+crypto.createHash('md5').update(String(r.body||'')).digest('hex').slice(0,10);
  (g[key]=g[key]||[]).push(Object.assign({},r,{comp_id:a.comp_id,comp_name:a.comp_name||'',title:a.title,startTs:+a.start||0}))}
 let groups=Object.values(g).map(l=>{l.sort((x,y)=>y.startTs-x.startTs);return l});
 // newest first inside each competitor; optional cap per competitor
 const byC={};groups.forEach(l=>{(byC[l[0].comp_id]=byC[l[0].comp_id]||[]).push(l)});
 let picked=[];for(const [c,ls] of Object.entries(byC)){ls.sort((x,y)=>y[0].startTs-x[0].startTs);picked=picked.concat(PER?ls.slice(0,PER):ls)}
 log(`captured ${rs.length} ads, ${groups.length} unique creatives, ${picked.length} to upload`);
 let total=0,n=0,rows=[],done=0;const doneSet=new Set(fs.existsSync(path.join(H,'up.done'))?fs.readFileSync(path.join(H,'up.done'),'utf8').split('\n').filter(Boolean):[]);
 for(const l of picked){const r=l[0];if(doneSet.has(r.id))continue;const p=pics(r.id);if(!p)continue;
  const cre=r.frame||r.file||'';const creExt=cre?path.extname(cre).slice(1):'';const sz=p.bytes+(cre&&fs.existsSync(cre)?fs.statSync(cre).size:0);
  if(BUDGET&&total+sz>BUDGET){log('budget reached');break}
  try{
   const bigN='blob/meta/'+r.id+'_card.webp',creN=cre?'blob/meta/'+r.id+'_creative.'+creExt:'';
   upload(p.big,bigN,'image/webp');if(creN&&fs.existsSync(cre))upload(cre,creN,creExt==='png'?'image/png':'image/jpeg');
   const landing=(r.links||[]).map(u=>{const m=u.match(/[?&]u=([^&]+)/);try{return m?decodeURIComponent(m[1]):u}catch(e){return u}}).find(u=>!/facebook\.com/.test(u))||'';
   const cta=(r.buttons||[]).filter(b=>!/פרטי המודעה|תפריט/.test(b)).pop()||'';
   const doc={id:'meta_'+r.id,comp_id:r.comp_id,comp_name:r.comp_name||r.page_name||'',ad_id:r.id,ad_ids:l.map(x=>x.id),ad_title:r.title||'',note:String(r.body||'').slice(0,4000),
    url:PUB+bigN,blob:bigN,prev:'',prev_blob:'',w:p.w,h:p.h,bytes:fs.statSync(p.big).size,type:'image/webp',name:r.id+'_card.webp',
    creative:creN?PUB+creN:'',creative_blob:creN,cw:r.w||r.fw||0,ch:r.h||r.fh||0,media:(r.media||{}).type||'',page_name:r.page_name||'',start:r.start||'',status:r.status||'',cta,landing,
    added:new Date().toISOString(),source:'meta',captured:new Date().toISOString().slice(0,10),copies:l.length};
   rows.push({collection:'comp_shots',id:doc.id,data:doc});total+=sz;n++;
   if(rows.length>=20){upsert(rows);if(!A.dry)rows.forEach(x=>fs.appendFileSync(path.join(H,'up.done'),x.data.ad_id+'\n'));rows=[];log(`uploaded ${n} (${(total/1048576).toFixed(0)} MB)`)}
  }catch(e){log('ERR '+r.id+' '+e.message.slice(0,160));if(/upload 4|upsert 4/.test(e.message))break}}
 if(rows.length){upsert(rows);if(!A.dry)rows.forEach(x=>fs.appendFileSync(path.join(H,'up.done'),x.data.ad_id+'\n'))}
 log(`done ${n} creatives, ${(total/1048576).toFixed(0)} MB`)})();
