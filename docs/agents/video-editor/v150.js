// ================= V150 · endless scroll: every "show more" list in the system loads the next batch by itself as the end
//                   comes near (posts gallery, templates, the editor's template and design panels, the feed). The button stays as a fallback =================
(function(){
const SEL='[data-px="more"],[data-ga="more"],[data-pe-tmore],[data-v46d="more"],[data-v66="more"]';
const isMore=b=>{try{return b.matches(SEL)||/^(הצג|הצגת|טען|להציג|הראו) עוד/.test((b.textContent||'').trim())}catch(e){return false}};
function scroller(el){for(let p=el.parentElement;p&&p!==document.body;p=p.parentElement){const s=getComputedStyle(p).overflowY;if(s==='auto'||s==='scroll')return p}return null}
function near(b,root){const r=b.getBoundingClientRect();if(!r.height)return false;const bottom=root?root.getBoundingClientRect().bottom:innerHeight;return r.top<bottom+700}
const watched=new WeakSet();
function pull(b,root){if(!b.isConnected||b.disabled||b.hidden)return;if(b._v150&&Date.now()-b._v150<600)return;b._v150=Date.now();b.classList.add('v150busy');b.click();
 // when the new batch is short and the end is still in view, keep going
 setTimeout(()=>{if(b.isConnected&&near(b,root))pull(b,root);else if(b.isConnected)b.classList.remove('v150busy')},650)}
function watch(){document.querySelectorAll('button').forEach(b=>{if(watched.has(b)||!isMore(b))return;watched.add(b);b.classList.add('v150auto');
 const root=scroller(b);const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)pull(b,root)}),{root,rootMargin:'0px 0px 700px 0px'});io.observe(b)})}
let t=0;new MutationObserver(()=>{if(!t)t=requestAnimationFrame(()=>{t=0;watch()})}).observe(document.body,{childList:true,subtree:true});
setTimeout(watch,500);
})();
