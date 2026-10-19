// Walk every competitor ad we know (engine_docs/meta_ads) through cap.cjs, a few pages at a time. Resumable: an ad with a
// finished JSON (shot present) is skipped. Stops at once if Meta shows a login wall.
// node crawl.cjs [--workers 3] [--chunk 20] [--only C001,C002] [--status active] [--new-days 1] [--refresh] [--max-mb 20]
const fs=require('fs');const path=require('path');const cp=require('child_process');const https=require('https');
const A=Object.fromEntries(process.argv.slice(2).map((a,i,v)=>a.startsWith('--')?[a.slice(2),(v[i+1]&&!v[i+1].startsWith('--'))?v[i+1]:true]:[]).filter(x=>x.length));
const H=__dirname;const OUT=path.join(H,'out');fs.mkdirSync(OUT,{recursive:true});
const W=+A.workers||3,CH=+A.chunk||20;const ONLY=A.only?String(A.only).split(','):null;const ST=A.status||'';
const KEY=(fs.readFileSync(path.join(H,'..','..','public','engine','bridge.js'),'utf8').match(/const KEY = '([^']+)'/)||[])[1];
if(!KEY)throw new Error('no key');
const SB='https://filnzlnvujnlazwcxbuq.supabase.co';
const log=s=>{const l=new Date().toISOString().slice(11,19)+' '+s;console.log(l);fs.appendFileSync(path.join(H,'crawl.log'),l+'\n')};
// Supabase transfer: every byte this script reads from Supabase counts against the free plan's monthly
// egress quota, so it reads as little as it can and keeps a tally. --max-mb (default 20) stops the run.
let readBytes=0;const MAXB=(+A['max-mb']||20)*1048576;
function get(url){const b=cp.execSync(`curl -s -m 120 -w '\n%{http_code}' -H 'apikey: ${KEY}' -H 'Authorization: Bearer ${KEY}' "${url}"`,{maxBuffer:64e6}).toString();const k=b.lastIndexOf('\n');readBytes+=k;
 const r={status:+b.slice(k+1),body:b.slice(0,k)};
 if(r.status===402){log('STOP: Supabase answered 402 (the monthly transfer quota is used up). Nothing more is read or uploaded until it resets.');process.exit(3)}
 if(readBytes>MAXB){log(`STOP: read ${(readBytes/1048576).toFixed(1)} MB from Supabase, over the ${MAXB/1048576} MB cap for one run.`);process.exit(4)}
 return r}
// only the fields the capture needs, never the whole document
const FIELDS='select=id,comp_id:data->>comp_id,comp_name:data->>comp_name,page_id:data->>page_id,title:data->>title,start:data->>start,status:data->>status,first_seen:data->>first_seen';
async function ads(){const f=path.join(H,'ads.json');const have=fs.existsSync(f)?JSON.parse(fs.readFileSync(f,'utf8')):[];
 // the daily run reads only the ads first seen in the last days and merges them into the local list
 if(A['new-days']&&have.length){const since=new Date(Date.now()-(+A['new-days']||1)*864e5).toISOString().slice(0,10);
  const r=get(`${SB}/rest/v1/engine_docs?collection=eq.meta_ads&data->>first_seen=gte.${since}&${FIELDS}&order=id&limit=5000`);
  if(r.status!==200)throw new Error('rest '+r.status+' '+r.body.slice(0,200));const rows=JSON.parse(r.body);
  const by=new Map(have.map(a=>[a.id,a]));rows.forEach(a=>by.set(a.id,Object.assign({},by.get(a.id)||{},a)));const all=[...by.values()];
  fs.writeFileSync(f,JSON.stringify(all));log(`read ${rows.length} recent ads (${(readBytes/1024).toFixed(0)} KB from Supabase)`);return all}
 if(have.length&&!A.refresh)return have;
 let all=[];for(let off=0;;off+=1000){const r=get(`${SB}/rest/v1/engine_docs?collection=eq.meta_ads&${FIELDS}&order=id&limit=1000&offset=${off}`);
  if(r.status!==200)throw new Error('rest '+r.status+' '+r.body.slice(0,200));const rows=JSON.parse(r.body);all=all.concat(rows);if(rows.length<1000)break}
 fs.writeFileSync(f,JSON.stringify(all));log(`read all ${all.length} ads (${(readBytes/1048576).toFixed(1)} MB from Supabase)`);return all}
const done=id=>{const f=path.join(OUT,id+'.json');if(!fs.existsSync(f))return false;try{const j=JSON.parse(fs.readFileSync(f,'utf8'));return !!j.shot||j.err==='no-card'}catch(e){return false}};
function runChunk(ids){return new Promise(res=>{const p=cp.spawn('node',[path.join(H,'cap.cjs'),'--out',OUT,'--ids',ids.join(',')],{cwd:H,env:process.env});
 let out='';p.stdout.on('data',d=>out+=d);p.stderr.on('data',d=>{});const t=setTimeout(()=>{try{p.kill('SIGKILL')}catch(e){}},ids.length*60000+60000);
 p.on('close',()=>{clearTimeout(t);res(out)})})};
(async()=>{let list=await ads();log('ads '+list.length);
 if(ONLY)list=list.filter(a=>ONLY.includes(a.comp_id));if(ST)list=list.filter(a=>a.status===ST);
 if(A['new-days']){const lim=Date.now()-(+A['new-days']||1)*864e5;list=list.filter(a=>a.first_seen&&Date.parse(a.first_seen)>=lim);log('new in the last '+A['new-days']+' day(s): '+list.length)}
 // newest first inside each competitor, competitors interleaved so every folder fills up early
 const byC={};list.forEach(a=>{(byC[a.comp_id]=byC[a.comp_id]||[]).push(a)});Object.values(byC).forEach(l=>l.sort((a,b)=>(+b.start||0)-(+a.start||0)));
 const order=[];const ls=Object.values(byC);let any=true;for(let i=0;any;i++){any=false;for(const l of ls){if(l[i]){order.push(l[i]);any=true}}}
 const todo=order.filter(a=>!done(a.id));log(`todo ${todo.length} of ${order.length}`);
 const chunks=[];for(let i=0;i<todo.length;i+=CH)chunks.push(todo.slice(i,i+CH).map(a=>a.id));
 let next=0,ok=0,err=0,wall=false;
 async function worker(n){while(next<chunks.length&&!wall){const c=chunks[next++];const out=await runChunk(c);
  for(const l of out.split('\n')){if(!l.startsWith('{'))continue;try{const r=JSON.parse(l);if(r.err==='login-wall'){wall=true;log('LOGIN WALL at '+r.id);break}if(r.shot)ok++;else{err++;log('err '+r.id+' '+(r.err||'').slice(0,80))}}catch(e){}}
  log(`w${n} chunk ${next}/${chunks.length} ok ${ok} err ${err}`)}}
 await Promise.all(Array.from({length:W},(_,i)=>worker(i)));
 log(`done ok ${ok} err ${err}${wall?' STOPPED: login wall':''}`)})();
