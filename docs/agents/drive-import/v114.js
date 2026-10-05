// ================= V114 · photo batches: a whole import (Google Drive, a folder, a shoot) is one document in the shared
//                   database ("batches/<name>" with items [{id, meta}]), and the page registers every item in the library
//                   on load. Far fewer writes than one document per photo, and V112 turns the batch into posts =================
(function(){
let done=false;
async function load(){if(done||typeof KC==='undefined'||!KC.db)return;done=true;try{const snap=await KC.db.collection('batches').get();let n=0;snap.docs.forEach(d=>{const b=d.data();if(!b||!Array.isArray(b.items))return;b.items.forEach(it=>{if(!it||!it.id||!it.meta)return;if(KC.up[it.id])return;const m=Object.assign({},it.meta,{batch:it.meta.batch||b.batch||d.id});regUpload(it.id,m);n++})});
  if(n){try{PM&&Object.keys(PM).forEach(k=>{if(k.startsWith('u_'))PM[k]=undefined})}catch(e){}try{if(KC.tab==='lib')renderPane()}catch(e){}try{render()}catch(e){}console.log('v114 batches',n)}}catch(e){console.warn('v114',e);done=false}}
let tries=0;const t=setInterval(()=>{tries++;if(typeof KC!=='undefined'&&KC.db){clearInterval(t);load()}else if(tries>120)clearInterval(t)},500);
window.__v114={load};
})();
