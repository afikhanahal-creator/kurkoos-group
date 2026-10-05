// ================= V143 · moving to the site: one button packs every collection of the database, every uploaded file and every
//                   built-in photo and video into one file (.kce) that the admin page of the site imports. Only in claude.ai =================
(function(){
if(window.__ENGINE_HOST==='site')return;
const COLS=['schedule','videos','photos','posts','workflow','settings','competitors','drafts','inbox','perf','status','batches','diag'];
const tst=m=>{try{toast(m)}catch(e){}};
let busy=false;
function card(){if(document.getElementById('v143'))return;const v=document.querySelector('#appviews');if(!v||typeof APP==='undefined'||APP.view!=='home')return;
 const c=document.createElement('section');c.id='v143';c.innerHTML=`<div><b>המערכת עוברת לאתר של קורקוס</b><span>כדי להעביר את כל מה שיש כאן (פוסטים, לוח, סרטונים, תמונות ומתחרים) לעמוד הניהול באתר: מורידים קובץ אחד, ובאתר לוחצים "ייבוא מהמערכת הקודמת".</span><small class="v143st" aria-live="polite"></small></div><button type="button" class="px-btn pri" data-v143="go">הורדת קובץ ההעברה</button>`;v.prepend(c)}
let t=0;new MutationObserver(()=>{if(!t)t=requestAnimationFrame(()=>{t=0;card()})}).observe(document.body,{childList:true,subtree:true});
const say=m=>{const s=document.querySelector('#v143 .v143st');if(s)s.textContent=m};
async function gz(str){if(!window.CompressionStream)return {bytes:new TextEncoder().encode(str),gz:false};const cs=new Blob([str]).stream().pipeThrough(new CompressionStream('gzip'));return {bytes:new Uint8Array(await new Response(cs).arrayBuffer()),gz:true}}
async function exportAll(){if(busy)return;busy=true;const b=document.querySelector('[data-v143="go"]');if(b)b.disabled=true;
 try{
  if(!APP.db)throw new Error('המסד לא זמין בתצוגה הזו');
  const data={};let n=0;
  for(const c of COLS){say('קורא '+c+'…');try{const s=await APP.db.collection(c).get();const rows={};(s.docs||[]).forEach(d=>{const v=d.data?d.data():null;if(v!==undefined&&v!==null)rows[d.id]=v});data[c]=rows;n+=Object.keys(rows).length}catch(e){data[c]={}}}
  const json=JSON.stringify({v:1,at:new Date().toISOString(),data});
  // every uploaded file the data points to, and every built-in photo and video the page uses
  const ids=[...new Set((json.match(/\/_blob\/([0-9a-f]{32})/g)||[]).map(x=>x.slice(7)))];
  const statics=new Set();try{Object.values(PHOTO_LIB||{}).forEach(u=>{if(typeof u==='string'&&/^photos\//.test(u))statics.add(u)})}catch(e){}
  ['reel-1.mp4','reel-1.jpg','reel-2.mp4','reel-2.jpg','reel-3.mp4','reel-3.jpg','kurkoos-v1.mp4','kurkoos-v1.jpg','kurkoos-v2.mp4','kurkoos-v2.jpg','kurkoos-v3.mp4','kurkoos-v3.jpg'].forEach(x=>statics.add(x));
  const parts=[],entries=[];let off=0;
  const add=(meta,bytes)=>{entries.push(Object.assign(meta,{off,len:bytes.byteLength}));parts.push(bytes);off+=bytes.byteLength};
  say('מכווץ '+n+' רשומות…');const d=await gz(json);add({kind:'data',gz:d.gz},d.bytes);
  let i=0;for(const id of ids){i++;say(`מעתיק קבצים שהועלו ${i}/${ids.length}`);try{const r=await fetch('/_blob/'+id);if(r.ok){const bl=await r.blob();add({kind:'blob',id,type:bl.type||r.headers.get('content-type')||''},new Uint8Array(await bl.arrayBuffer()))}}catch(e){}}
  i=0;for(const p of statics){i++;say(`מעתיק תמונות וסרטונים ${i}/${statics.size}`);try{const r=await fetch(p);if(r.ok){const bl=await r.blob();add({kind:'static',path:p,type:bl.type||''},new Uint8Array(await bl.arrayBuffer()))}}catch(e){}}
  const head=new TextEncoder().encode(JSON.stringify({magic:'KCE1',entries}));const len=new Uint8Array(4);new DataView(len.buffer).setUint32(0,head.byteLength);
  const blob=new Blob([new TextEncoder().encode('KCE1'),len,head,...parts],{type:'application/octet-stream'});
  const name='kurkoos-engine-'+new Date().toISOString().slice(0,10)+'.kce';
  say(`מוכן: ${n} רשומות, ${ids.length} קבצים, ${(blob.size/1048576).toFixed(0)}MB. שומר…`);
  const dl=window.claude&&claude.use?await claude.use('downloads'):null;
  if(dl)await dl.save({filename:name,data:blob});else{const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>a.remove(),3000)}
  say(`הקובץ ${name} ירד. באתר: ניהול > מנוע התוכן > "ייבוא מהמערכת הקודמת"`);tst('קובץ ההעברה ירד')}
 catch(e){say('ההורדה נכשלה: '+(e&&(e.message||e.code)||e))}
 busy=false;if(b)b.disabled=false}
document.addEventListener('click',e=>{if(e.target.closest&&e.target.closest('[data-v143="go"]'))exportAll()});
window.__v143={exportAll};
})();
