// ================= V137 · the video editor on iPhone: iOS shows a video frame on a canvas only after the video has played once,
//                   and lets it play with sound only when play() starts inside a tap. Every tap in the editor now unlocks the editor's
//                   video and prepares the export's video and audio there and then, so preview and export see the real picture.
//                   If a video still refuses to play, the export steps through it frame by frame instead of stalling. Effects tapped
//                   while the cursor is on the intro land on the video itself, and the next one lands after it.
//                   Cinematic effects meant for the cloud get a browser stand-in at their time, so the finished file shows them too =================
(function(){
const X={xv:null,xu:'',ac:null};
const tracked=new Set();
function E(){return window.__v129&&__v129.E}
// a muted play and pause inside a tap: WebKit then decodes frames and allows later play() calls on this element
function unlock(v){if(!v||v._v137||!v.src)return;v._v137=1;const m=v.muted;try{v.muted=true;const pr=v.play();v.pause();if(pr&&pr.catch)pr.catch(()=>{});v.muted=m}catch(e){v._v137=0}}
function prime(v){tracked.add(v);v.setAttribute('playsinline','');v.setAttribute('webkit-playsinline','');
 // browsers that allow muted autoplay decode the first frame right away
 v.addEventListener('loadedmetadata',()=>{if(v._v137p)return;v._v137p=1;const m=v.muted;v.muted=true;const pr=v.play();if(pr&&pr.then)pr.then(()=>{const e=E();if(!(e&&e.playing&&e.video===v))v.pause();v.muted=m;try{__v129.refresh()}catch(x){}}).catch(()=>{v.muted=m})},{once:true});
 try{v.load()}catch(e){}}
function prepExport(){const e=E();if(!e||!e.p)return;const u=e.urls&&e.urls[e.p.id];if(!u)return;
 if(!X.xv||X.xu!==u){const v=document.createElement('video');v.playsInline=true;v.setAttribute('playsinline','');v.preload='auto';v.crossOrigin='anonymous';v.src=u;X.xv=v;X.xu=u;try{v.load()}catch(x){}}
 unlock(X.xv);
 if(!X.ac||X.ac.state==='closed'){try{X.ac=new (window.AudioContext||window.webkitAudioContext)()}catch(x){X.ac=null}}
 if(X.ac&&X.ac.state==='suspended')X.ac.resume().catch(()=>{})}
function inEditor(t){return !!(t&&t.closest&&t.closest('#v129,.v130ebar,#v132res,#v130sb,#v134'))}
function onTap(ev){const e=E();if(!e||!e.p)return;if(!inEditor(ev.target))return;unlock(e.video);tracked.forEach(v=>{if(v.isConnected||v===e.video)unlock(v)});prepExport();
 if(e.video&&e.video.readyState<2){setTimeout(()=>{try{__v129.refresh()}catch(x){}},400)}}
['touchend','pointerup','click'].forEach(n=>document.addEventListener(n,onTap,true));
// handed to the export once (an element can be wired to audio only once), the next tap prepares fresh ones
function takeVideo(u){const v=X.xv;if(v&&X.xu===u){X.xv=null;X.xu='';return v}return null}
function takeAC(){const a=X.ac;X.ac=null;return a&&a.state!=='closed'?a:null}

// ---------- a clear "show the video" cover when the phone has not drawn a frame yet
function cover(){const cv=document.getElementById('v129cv');const e=E();if(!cv||!e||!e.p)return;const wrap=cv.parentElement;let c=wrap.querySelector('.v137tap');
 const need=e.video&&e.video.readyState<2&&!e.missing;if(!need){if(c)c.remove();return}
 if(!c){c=document.createElement('button');c.type='button';c.className='v137tap';c.innerHTML='<b>הקישו כדי להציג את הסרטון</b><small>הטלפון טוען וידאו רק אחרי נגיעה</small>';
  c.addEventListener('click',()=>{const v=e.video;if(v){v.muted=true;const pr=v.play();if(pr&&pr.then)pr.then(()=>{v.pause();v.muted=!!e.p.mute;try{__v129.refresh()}catch(x){}}).catch(()=>{})}c.remove()});wrap.appendChild(c)}}
let ct=0;new MutationObserver(()=>{if(ct)return;ct=setTimeout(()=>{ct=0;cover()},300)}).observe(document.body,{childList:true,subtree:true});
setInterval(cover,1500);

// ---------- cloud effects get a browser stand-in at their time
const STAND={opening:[['dipw',0.5],['zoom',1.2]],title3d:[['shine',1]],shatter:[['glitch',0.45],['flash',0.3]],popout:[['zoom',1.2]],flip:[['split',0.5]],worlds:[['leak',1.6]],freeze:[['flash',0.3],['vignette',1.2]],
 giant:[['zoom',1.4,0.35]],pixel:[['glitch',0.6]],zoom:[['zoom',1.6,0.3]],cube:[['split',0.6],['shake',0.4]],money:[['confetti',1.8]],comment:[['shine',0.9]],hologram:[['split',0.8],['glitch',0.4]],
 goal:[['confetti',1.8]],gold:[['shine',1.1]],follow:[['shine',0.9]],rewind:[['glitch',0.5],['dipb',0.4]]};
function stands(p,s){const out=[];(p.fx||[]).forEach(f=>{const at=f.at;if(at==null||at===''||isNaN(+at))return;const c=s&&s.clips&&s.clips[0];if(!c)return;const t0=c.start+(+at-(p.in||0));if(t0<c.start-0.01||t0>c.start+c.dur)return;
 (STAND[f.id]||[]).forEach(([k,d,amt])=>out.push({type:'fx',fx:k,start:t0,end:t0+d,amt:amt||1,stand:f.id}))});return out}
window.__v137={unlock,prime,prepExport,takeVideo,takeAC,stands,STAND,X};
})();
