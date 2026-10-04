// ================= V121 · the chosen time always wins: the composer's "הוסף לתור" uses the time picked in the schedule
//                   panel when there is one, the date picker writes the time straight into the composer state, and a
//                   composer render that throws is reported instead of leaving a stale footer =================
(function(){
// 1. the date picker's result goes straight into the composer state (not only through the input's events)
document.addEventListener('change',e=>{const t=e.target;if(!t||!t.matches||!t.matches('#cmp-root [data-app="cat"]'))return;try{if(APP.cmp&&t.value){APP.cmp.at=t.value;APP.cmp.sched=true}}catch(e2){}},true);
// 2. a composer render that fails is visible
if(typeof renderComposer==='function')renderComposer=(f=>function(){try{return f.apply(this,arguments)}catch(e){console.error('renderComposer',e);try{toast('שגיאה בחלון התזמון: '+String(e&&e.message||e).slice(0,80))}catch(x){}}})(renderComposer);
window.__v121={pickedAt(){try{const C=APP.cmp;const inp=document.querySelector('#cmp-root [data-app="cat"]');return (C&&C.at)||(inp&&inp.value)||''}catch(e){return ''}}};
})();
