// ================= V120 · closing the editor without saving changes nothing: the post keeps its saved state, the
//                   unsaved work is held as a draft for this session, and a bar offers the way back into it
//                   (replaces the V82 behaviour of saving on close with an undo) =================
(function(){
let DRAFT=null;
function bar(msg,label,fn){const old=document.getElementById('v82undo');if(old)old.remove();const d=document.createElement('div');d.id='v82undo';d.setAttribute('role','status');d.setAttribute('aria-live','polite');
 const s=document.createElement('span');s.textContent=msg;const b=document.createElement('button');b.type='button';b.textContent=label;b.addEventListener('click',()=>{d.remove();clearTimeout(t);try{fn()}catch(e){console.error('v120',e)}});d.append(s,b);document.body.appendChild(d);const t=setTimeout(()=>d.remove(),9000)}
function restore(){if(!DRAFT)return toast('אין טיוטה לשחזר');const o=AG.posts.find(p=>p.id===DRAFT.id);if(!o)return toast('הפוסט כבר לא קיים');
 peOpen(o);let n=0;(function apply(){if(!(PE.p&&PE.orig===o)){if(n++<40)return setTimeout(apply,50);return toast('לא הצלחנו לפתוח את העורך')}try{const d=JSON.parse(DRAFT.snap);Object.keys(PE.p).forEach(k=>{if(!(k in d))delete PE.p[k]});Object.assign(PE.p,d);if(DRAFT.tab)PE.tab=DRAFT.tab;ensureImgs(PE.p).then(()=>{peRender();try{peTopDirty()}catch(e){}})}catch(e){console.error('v120 restore',e)}})()}
if(typeof peClose==='function')peClose=(f=>function(force){
 try{if(!force&&typeof PE!=='undefined'&&PE.p&&PE.orig&&typeof peDirty==='function'&&peDirty()){
  DRAFT={id:PE.orig.id,snap:JSON.stringify(PE.p),tab:PE.tab,at:Date.now()};
  const r=f.call(this,true);
  bar('סגרת בלי לשמור. הפוסט נשאר כפי שהיה','חזרה לעריכה',restore);
  return r}}catch(e){console.error('v120',e)}
 return f.apply(this,arguments)})(peClose);
window.__v120={restore,draft:()=>DRAFT};
})();
