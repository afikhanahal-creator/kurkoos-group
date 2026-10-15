// ================= V180 · phones: the menu is back where it was and the bottom bar is always on screen.
// On iPhone (Safari and Chrome, both WebKit) 100vh is the height with the browser toolbars hidden. The base rule .app{min-height:100vh}
// overrode the phone rule, so the shell was taller than the visible area and the bottom bar sat under the browser toolbar, while V176
// had hidden the header menu button because the bottom bar "existed". The CSS (k180) restores the V174 header and sizes the shell with
// 100dvh; this script measures the visible height for older WebKit (--v180vh) and makes the phone's back gesture close an open drawer
// instead of also stepping a page back, or leaving the engine from the first page.
(()=>{
if(window.__v180)return;window.__v180=1;
const PH=matchMedia('(max-width:860px)');
const side=()=>document.getElementById('side');
const isOpen=()=>{const s=side();return !!s&&s.classList.contains('open')};

/* ---------- 1 · the shell is the visible area ---------- */
// documentElement.clientHeight is the visible layout height: it leaves out the browser toolbars and does not change with the keyboard or a pinch zoom
function vh(){const de=document.documentElement;if(!PH.matches){de.style.removeProperty('--v180vh');return}
 const vv=window.visualViewport;if(vv&&Math.abs((vv.scale||1)-1)>0.01)return;
 const h=Math.round(de.clientHeight||innerHeight||0);if(h>=200&&de.style.getPropertyValue('--v180vh')!==h+'px')de.style.setProperty('--v180vh',h+'px')}
vh();addEventListener('resize',vh);addEventListener('pageshow',vh);addEventListener('orientationchange',()=>{vh();setTimeout(vh,300)});
try{window.visualViewport&&visualViewport.addEventListener('resize',vh)}catch(e){}
try{PH.addEventListener('change',vh)}catch(e){}

/* ---------- 2 · the back gesture closes the drawer, it does not leave the page ---------- */
// popstate listeners on window run in the order they were added: V101 (closes the drawer) and V102 (steps one page back) come first.
// The drawer's class change reaches our observer between those two listeners, so we raise V102's own guard (__v101pop) there.
let skip=0,pending=null,pushed=false;
const ours=()=>!!(history.state&&history.state.v180m);
const hush=()=>{window.__v101pop=Date.now()};
function opened(){if(!PH.matches)return;if(!ours()){try{history.pushState({v180m:1},'');pushed=true}catch(e){}}}
function closed(){if(ours()){pushed=false;skip++;hush();try{history.back()}catch(e){skip--}}   // closed by the X, the backdrop or Escape: take our entry away
 else if(pushed){pushed=false;hush()}}                                                      // closed by the back gesture: our entry is already gone, V102 must not step back too
addEventListener('popstate',()=>{if(skip>0){skip--;if(pending){const p=pending;pending=null;setTimeout(p,0)}}},true);
// a choice inside the drawer: first take our history entry away, then let the choice run, so the next back returns to the previous page
addEventListener('click',e=>{if(!PH.matches||!isOpen()||!ours()||!e.isTrusted)return;
 const b=e.target.closest&&e.target.closest('#side [data-view],#side [data-app]');if(!b||b.matches('[data-app="menu"]'))return;
 e.preventDefault();e.stopImmediatePropagation();pending=()=>b.click();pushed=false;skip++;hush();try{history.back()}catch(x){}
 setTimeout(()=>{if(pending){const p=pending;pending=null;skip=Math.max(0,skip-1);p()}},600)},true);
let was=false;
function watch(){const s=side();if(!s||s.__v180)return;s.__v180=1;new MutationObserver(()=>{const o=s.classList.contains('open');if(o===was)return;was=o;o?opened():closed()}).observe(s,{attributes:true,attributeFilter:['class']})}
watch();const iv=setInterval(()=>{watch();if(side()&&side().__v180)clearInterval(iv)},500);setTimeout(()=>clearInterval(iv),60000);

window.__v180={vh,ours};
})();
