/*V197:START*/
// ================= V197 · pictures kept on the device. Registers /engine/sw.js, which serves every picture and video
// file from Supabase storage that was shown once from a copy on the device, so it is never downloaded twice. Each read
// out of Supabase counts against the free plan's monthly transfer quota, and going over it restricts the whole project.
(()=>{
if(window.__v197)return;window.__v197=1;
try{if('serviceWorker' in navigator&&(location.protocol==='https:'||location.hostname==='localhost')){
 const go=()=>navigator.serviceWorker.register('/engine/sw.js',{scope:'/engine/'}).catch(e=>console.warn('v197 sw',e&&e.message));
 // after the page has loaded, so it never competes with the first paint
 if(document.readyState==='complete')setTimeout(go,1500);else addEventListener('load',()=>setTimeout(go,1500),{once:true})}}catch(e){}
})();
/*V197:END*/
