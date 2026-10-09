// ================= V156 · QA round: the editor closes in one tap and keeps every edit, the lightbox gives way to the editor,
//                   the bottom bar follows the view, no false "storage full" message, the drafts column loads more =================
(function(){
// 1. opening the editor from the big preview closes the preview: one window, one X
try{peOpen=(f=>function(){try{if(typeof GA!=='undefined'&&GA.lb){GA.lb=null;gaLbRender()}}catch(e){}return f.apply(this,arguments)})(peOpen)}catch(e){}
// 2. closing the editor with changes saves them (one tap, nothing lost); the toast says so
try{peClose=(f=>function(force){try{if(!force&&typeof PE!=='undefined'&&PE.p&&PE.orig&&typeof peDirty==='function'&&peDirty()){peSave('עריכה בסטודיו');const r=f.call(this,true);try{toast('השינויים נשמרו')}catch(e){}return r}}catch(e){console.error('v156 close',e)}return f.apply(this,arguments)})(peClose)}catch(e){}
// 3. the bottom bar marks the open view, or nothing when the view has no tab of its own
function navSync(){const v=(typeof APP!=='undefined'&&APP.view)||'';document.querySelectorAll('#v99nav [data-v99nav]').forEach(b=>{if(b.dataset.v99nav===v)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')})}
try{go=(f=>function(){const r=f.apply(this,arguments);try{navSync()}catch(e){}return r})(go)}catch(e){}
try{render=(f=>function(){const r=f.apply(this,arguments);try{navSync()}catch(e){}return r})(render)}catch(e){}
// 4. the posts live in the cloud; a full browser storage is handled quietly instead of a message after every save
try{v31StorageWarn=function(){try{console.warn('local storage full, cloud copy is the source of truth')}catch(e){}}}catch(e){}
// 5. drafts column in "רעיונות וטיוטות": more cards on demand (and by the endless scroll)
document.addEventListener('click',ev=>{const b=ev.target.closest&&ev.target.closest('[data-v156="dmore"]');if(!b)return;window.__v156dl=(window.__v156dl||40)+40;try{render()}catch(e){}});
})();
