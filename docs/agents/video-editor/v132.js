// ================= V132 · a finished video every time: "יצירת הסרטון המוגמר" builds the edit in the browser exactly as
//                   previewed, saves it to the library as a finished reel, and offers download, scheduling as a reel, and
//                   the cinematic cloud version. Failed cloud jobs say why in plain words and can be sent again =================
(function(){
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const toastSafe=m=>{try{toast(m)}catch(e){}};
const uid=()=>'v'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
let busy=false;
async function finishNow(){if(busy)return;const E=window.__v129&&__v129.E;if(!E||!E.p){return}if(E.missing){toastSafe('הקובץ המקומי לא זמין. הוסיפו את הסרטון שוב למגש');return}
 busy=true;const n0=E.outs.length;try{await __v129.doExport()}catch(e){}busy=false;
 const o=E.outs[0];if(!o||E.outs.length===n0){return}
 let saved=null;const V=window.__vid,VD=V&&V.VD;
 if(VD&&VD.assets&&VD.db){try{showResult(o,null,'שומר בספרייה…');let f=new File([o.blob],o.file,{type:o.type});if(f.size>19.5*1024*1024&&window.__v128)f=await __v128.shrink(f);
   const r=await VD.assets.upload(f);saved=await V.queueDoc({id:uid(),name:E.p.name+(E.p.versions.length?' · גרסה '+E.p.versions.length:''),srcId:r.id,srcUrl:r.url,out:r.url,outId:r.id,status:'done',source:'editor',finished:new Date().toISOString(),editOf:E.p.src.docId||null});o.lib=r.url}catch(e){toastSafe('השמירה בספרייה נכשלה: '+(e&&e.message||e))}}
 showResult(o,saved)}
function showResult(o,saved,note){let r=document.getElementById('v132res');if(!r){r=document.createElement('div');r.id='v132res';document.body.appendChild(r)}
 r.innerHTML=`<div class="v132box" role="dialog" aria-modal="true" aria-label="הסרטון מוכן"><header><div><small>הסרטון המוגמר</small><b>${note?esc(note):saved?'מוכן ונשמר בספרייה':'מוכן'}</b></div><button type="button" class="v132x" data-v132="close" aria-label="סגירה">✕</button></header>
  <video src="${o.url}" controls playsinline autoplay muted></video>
  <div class="v132acts"><a class="px-btn" href="${o.url}" download="${esc(o.file)}">הורדה</a><button type="button" class="px-btn pri" data-v132="sched">תזמון כריל</button><button type="button" class="px-btn" data-v132="pro">גרסה קולנועית בענן</button></div>
  <small class="v132note">${saved?'הסרטון שמור בעמוד "סרטונים ורילס", בכרטיס עם כפתור תזמון.':'במצב הזה הסרטון לא נשמר בספרייה, אבל אפשר להוריד אותו.'} הגרסה הקולנועית מוסיפה את אפקטי החתימה, אחרי תוכנית לאישור שלך.</small></div>`;
 r._o=o;r._saved=saved}
document.addEventListener('click',e=>{const x=e.target.closest&&e.target.closest('[data-v130="export"]');if(x){e.preventDefault();e.stopImmediatePropagation();finishNow();return}
 const r=document.getElementById('v132res');if(r&&r.contains(e.target)){if(e.target===r){r.remove();return}const b=e.target.closest('[data-v132]');if(!b)return;const a=b.dataset.v132;
  if(a==='close')r.remove();
  else if(a==='sched'){const o=r._o,E=__v129.E;r.remove();if(window.__v131)__v131.open(o.lib?{video:{url:o.lib,name:E.p.name}}:{video:{blob:o.blob,file:o.file,type:o.type,name:E.p.name}})}
  else if(a==='pro'){r.remove();__v129.E.tab='fx';__v129.refresh();toastSafe('בחרו אפקטים קולנועיים ושלבים, ולחצו "גרסה קולנועית בענן"')}}},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape'){const r=document.getElementById('v132res');if(r)r.remove()}});
// failed cloud jobs: a plain reason and "send again"
function plain(err){err=String(err||'');if(/תמלול|transcri|huggingface|DEEPGRAM/i.test(err))return 'העורך בענן לא הצליח לתמלל את הסרטון, כי שירותי התמלול חסומים בסביבה שלו. מעכשיו הוא ממשיך גם בלי תמלול ומציב את האפקטים לפי זמן. אפשר לשלוח שוב.';return err.slice(0,160)}
function deco(){document.querySelectorAll('#v100page .v100c[data-vid]').forEach(c=>{const d=window.__vid&&__vid.VD.docs.find(x=>x.id===c.dataset.vid);if(!d||d.status!=='failed')return;
 if(c.querySelector('.v132fail'))return;const m=c.querySelector('.v100m');if(!m)return;m.insertAdjacentHTML('beforeend',`<div class="v132fail"><p>${esc(plain(d.error))}</p><button type="button" class="px-btn sm pri" data-v132retry="${esc(d.id)}">שליחה שוב לעורך</button><button type="button" class="px-btn sm" data-v129="open" data-doc="${esc(d.id)}">יצירת סרטון מוגמר עכשיו</button></div>`)})}
document.addEventListener('click',async e=>{const b=e.target.closest&&e.target.closest('[data-v132retry]');if(!b)return;const V=window.__vid,VD=V.VD,d=VD.docs.find(x=>x.id===b.dataset.v132retry);if(!d)return;b.disabled=true;
 try{const upd={status:'plan_requested',phase:'plan',error:null,requested:new Date().toISOString()};await VD.db.collection('videos').doc(d.id).update(upd);await V.editVideo(Object.assign({__direct:1},d,upd));toastSafe('נשלח שוב. התוכנית תופיע בכרטיס')}catch(x){toastSafe('לא נשלח: '+(x&&x.message||x));b.disabled=false}});
let t=0;new MutationObserver(()=>{if(t)return;t=requestAnimationFrame(()=>{t=0;try{deco()}catch(e){}})}).observe(document.body,{childList:true,subtree:true});
window.__v132={finishNow,showResult};
})();
