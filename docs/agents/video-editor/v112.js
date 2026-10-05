// ================= V112 · photos that arrive through the shared database (Google Drive, the website, any outside import)
//                   turn into posts by themselves: when a batch the page has not seen yet is in the library, two posts per
//                   new photo are built, repeated photos are swapped, and the gallery is refreshed. Once per batch =================
(function(){
function batches(){const s=new Set();try{Object.values(KC.up||{}).forEach(m=>{if(m&&m.batch)s.add(m.batch)})}catch(e){}return [...s]}
function pending(){return batches().filter(b=>{try{return !localStorage.getItem('ag_v112_'+b)}catch(e){return false}})}
function run(){const bs=pending();if(!bs.length)return null;if(!window.__v107||!window.__v104)return null;
 let made=0,div=0;try{const r=__v107.build({per:2});made=r&&r.made||0}catch(e){}try{const d=__v104.diversify({cap:3});div=d&&d.changed||0}catch(e){}
 bs.forEach(b=>{try{localStorage.setItem('ag_v112_'+b,'1')}catch(e){}});
 const n=Object.values(KC.up||{}).filter(m=>m&&bs.includes(m.batch)).length;
 try{toast(`${n} תמונות חדשות נכנסו לספרייה (${bs.join(', ')}). ${made} פוסטים חדשים נבנו מהן, ${div} פוסטים קיבלו תמונה אחרת`)}catch(e){}
 try{render()}catch(e){}return {batches:bs,photos:n,made,div}}
window.__v112={run,batches,pending};
// after the library loaded from the database; and again whenever more uploads register later
let t=null;function soon(){clearTimeout(t);t=setTimeout(()=>{try{run()}catch(e){}},2500)}
setTimeout(soon,11000);
if(typeof regUpload==='function'){const orig=regUpload;regUpload=function(id,m){const r=orig.apply(this,arguments);try{if(m&&m.batch&&!localStorage.getItem('ag_v112_'+m.batch))soon()}catch(e){}return r}}
})();
