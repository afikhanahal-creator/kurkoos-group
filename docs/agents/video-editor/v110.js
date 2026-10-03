// ================= V110 · every project page of the website, in the library: the photos and videos the CMS serves on
//                   kurkoos-group.co.il (hero, about, environment, gallery, project videos) are fetched by the browser,
//                   stored as assets, registered in the photo library and the video room, deduplicated by source URL.
//                   Then posts are built from the new photos and repeated photos are diversified. One automatic pass per
//                   version, and an "ייבוא מהאתר" button in the gallery, the videos room and the agent =================
(function(){
const MAN=__SITE_MEDIA__;
const FLAG='ag_v110_done_v2';const MAXV=20*1024*1024;
const esc=s=>String(s==null?'':s);
const ST={busy:false,log:[]};
function abs(p){return /^https?:/.test(p)?p:MAN.base+p}
function kindFor(st){return (st==='planning'||st==='marketing')?'render':'site'}
function imageList(){const out=[];const seen=new Set();MAN.projects.forEach(pr=>{const add=(p,label)=>{if(!p)return;const u=abs(p);if(seen.has(u))return;seen.add(u);out.push({url:u,project:pr.key,slug:pr.slug,name:pr.name+' · '+label,kind:kindFor(pr.status),tags:'website,'+pr.slug+','+pr.status})};
 add(pr.hero,'תמונת שער');add(pr.about,'אודות הפרויקט');add(pr.env,pr.envTitle?'הסביבה: '+pr.envTitle.slice(0,40):'הסביבה');(pr.gallery||[]).forEach((g,i)=>add(g,'גלריה '+(i+1)))});
 (MAN.extra||[]).forEach(e=>{const u=(MAN.base2||MAN.base)+e.path;if(seen.has(u))return;seen.add(u);out.push({url:u,project:e.project,slug:e.path.split('/')[0],name:e.name,kind:e.kind,tags:e.tags})});return out}
function videoList(){const out=[];MAN.projects.forEach(pr=>(pr.videos||[]).forEach((v,i)=>{if(!v.src)return;out.push({url:abs(v.src),project:pr.key,slug:pr.slug,name:v.title||(pr.name+' · סרטון '+(i+1)),title:v.title||''})}));return out}
function tail(u){const i=String(u).indexOf('/media/');return i>=0?String(u).slice(i+7):String(u)}
function haveImages(){const s=new Set();try{Object.values(KC.up||{}).forEach(m=>{if(m&&m.src){s.add(m.src);s.add(tail(m.src))}})}catch(e){}return s}
async function haveVideos(){const s=new Set();try{const V=window.__vid;if(V&&V.VD.db){const snap=await V.VD.db.collection('videos').get();snap.docs.forEach(d=>{const m=d.data();if(m&&m.origin)s.add(m.origin)})}}catch(e){}return s}
function dims(blob){return new Promise(res=>{const img=new Image();img.onload=()=>{res({w:img.naturalWidth,h:img.naturalHeight});URL.revokeObjectURL(img.src)};img.onerror=()=>res({w:0,h:0});img.src=URL.createObjectURL(blob)})}
async function fetchBlob(url){const r=await fetch(url,{mode:'cors',credentials:'omit'});if(!r.ok)throw new Error('http '+r.status);return await r.blob()}
async function sizeOf(url){try{const r=await fetch(url,{method:'HEAD',mode:'cors',credentials:'omit'});const n=+r.headers.get('content-length');return n||0}catch(e){return 0}}
function say(m){try{toast(m)}catch(e){console.log('v110',m)}}
async function importImages(opts={}){const list=imageList();const have=haveImages();const todo=list.filter(x=>!have.has(x.url)&&!have.has(tail(x.url)));const res={total:list.length,done:0,fail:0,skipped:list.length-todo.length};if(!todo.length)return res;
 const can=typeof KC!=='undefined'&&KC.assets;if(!can&&!opts.dry){say('ייבוא מהאתר זמין כשהדף פתוח ב-claude.ai עם הרשאת עריכה');return res}
 say(`מייבא ${todo.length} תמונות מעמודי הפרויקטים באתר…`);
 let i=0;const worker=async()=>{while(i<todo.length){const it=todo[i++];try{let blob=await fetchBlob(it.url);let w=0,h=0;
   try{const f=new File([blob],'site.jpg',{type:blob.type||'image/jpeg'});const d=await downscale(f);blob=d.blob;w=d.w;h=d.h}catch(e){const d=await dims(blob);w=d.w;h=d.h}
   let id,url;if(can){const r=await KC.assets.upload(blob);id=r.id;url=r.url}else{id='dry_'+Math.random().toString(36).slice(2,9);url=URL.createObjectURL(blob)}
   const meta={name:it.name,project:it.project,kind:it.kind,tags:it.tags,w,h,addedAt:new Date().toISOString(),url,src:it.url,site:1};
   if(can&&KC.db){try{await KC.db.collection('photos').doc(id).set(meta)}catch(e){}}
   regUpload(id,meta);res.done++;if(res.done%10===0)say(`${res.done} מתוך ${todo.length} תמונות נכנסו לספרייה`)}catch(e){res.fail++;ST.log.push([it.url,String(e&&e.message||e)])}}};
 await Promise.all([worker(),worker()]);
 try{PM&&Object.keys(PM).forEach(k=>{if(k.startsWith('u_'))PM[k]=undefined})}catch(e){}
 try{render()}catch(e){}return res}
async function importVideos(opts={}){const V=window.__vid;const list=videoList();const res={total:list.length,done:0,fail:0,big:0,skipped:0};if(!V)return res;
 const can=V.VD.assets&&V.VD.db;if(!can&&!opts.dry){return res}
 const have=await haveVideos();const todo=list.filter(x=>!have.has(x.url));res.skipped=list.length-todo.length;if(!todo.length)return res;
 say(`מייבא ${todo.length} סרטונים מעמודי הפרויקטים…`);
 for(const it of todo){try{const n=await sizeOf(it.url);if(n>MAXV){res.big++;ST.log.push([it.url,'over 20MB '+n]);continue}
   const blob=await fetchBlob(it.url);if(blob.size>MAXV){res.big++;continue}const file=new File([blob],it.slug+'.mp4',{type:'video/mp4'});
   const id=(typeof uid==='function'?uid():'v'+Date.now().toString(36)+Math.random().toString(36).slice(2,6));
   let r;if(can)r=await V.VD.assets.upload(file);else r={id:'dry_'+id,url:URL.createObjectURL(file),sizeBytes:file.size};
   await V.queueDoc({id,name:it.name.slice(0,60),srcId:r.id,srcUrl:r.url,size:r.sizeBytes||file.size,source:'website',origin:it.url,project:it.project,brand:'auto',title:it.title});res.done++}catch(e){res.fail++;ST.log.push([it.url,String(e&&e.message||e)])}}
 return res}
async function run(opts={}){if(ST.busy){say('הייבוא כבר רץ');return null}ST.busy=true;const out={};
 try{out.images=await importImages(opts);
  if(out.images.done){try{const r=window.__v107&&__v107.build({per:2});out.posts=r&&r.made||0}catch(e){}try{const d=window.__v104&&__v104.diversify({cap:3});out.diversified=d&&d.changed||0}catch(e){}}
  if(opts.videos!==false)out.videos=await importVideos(opts);
  const im=out.images,vd=out.videos||{};const parts=[];if(im.done)parts.push(`${im.done} תמונות חדשות בספרייה`);if(out.posts)parts.push(`${out.posts} פוסטים חדשים מהן`);if(vd.done)parts.push(`${vd.done} סרטונים בחדר הסרטונים, מוכנים לעריכה`);if(vd.big)parts.push(`${vd.big} סרטונים מעל 20MB נשארו באתר`);if(im.fail||vd.fail)parts.push(`${(im.fail||0)+(vd.fail||0)} נכשלו`);
  say(parts.length?parts.join(' · '):'כל התמונות והסרטונים מהאתר כבר בספרייה');
  try{renderAgent()}catch(e){}try{render()}catch(e){}}finally{ST.busy=false}return out}
function pendingImages(){const have=haveImages();return imageList().filter(x=>!have.has(x.url)&&!have.has(tail(x.url))).length}
function bar(){const act=document.getElementById('vact');const old=document.getElementById('v110bar');if(!act||typeof APP==='undefined'||!['gallery','agent'].includes(APP.view)){if(old)old.remove();return}
 const n=pendingImages();if(!n||ST.busy){if(old)old.remove();return}const can=typeof KC!=='undefined'&&KC.assets&&KC.db;
 const html=can?`<b>${n} תמונות מהאתר עדיין לא בספרייה.</b> <button type="button" class="px-btn sm pri" data-v110="run">ייבוא עכשיו</button>`:`<b>${n} תמונות מהאתר ממתינות לייבוא.</b> הייבוא רץ רק כשהדף פתוח ב-claude.ai עם הרשאת עריכה (לא בתצוגה בלבד).`;
 let el=old;if(!el){el=document.createElement('div');el.id='v110bar';el.className='v110bar';const host=act.closest('.tbar')||act.parentElement;host.insertAdjacentElement('afterend',el)}el.innerHTML=html}
setInterval(()=>{try{bar()}catch(e){}},4000);
window.__v110={run,importImages,importVideos,imageList,videoList,pendingImages,ST,MAN};
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-v110="run"]');if(!b)return;e.preventDefault();b.disabled=true;run().finally(()=>{b.disabled=false})});
const mo=new MutationObserver(()=>{const act=document.getElementById('vact');if(!act||typeof APP==='undefined')return;if(!['gallery','agent','videos'].includes(APP.view))return;if(act.querySelector('[data-v110]'))return;
 const b=document.createElement('button');b.type='button';b.className='ibtn';b.dataset.v110='run';b.title='מושך את כל התמונות והסרטונים מעמודי הפרויקטים באתר לספרייה';b.innerHTML=(typeof ico==='function'?ico('dl',16):'')+' ייבוא מהאתר';act.appendChild(b)});
mo.observe(document.body,{childList:true,subtree:true});
setTimeout(()=>{try{if(localStorage.getItem(FLAG))return;if(typeof KC==='undefined'||!KC.assets||!KC.db)return;localStorage.setItem(FLAG,'1');run()}catch(e){}},12000);
})();
