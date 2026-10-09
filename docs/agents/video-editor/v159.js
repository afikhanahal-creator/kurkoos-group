// ================= V159 · the side menu counts templates the way the page shows them (twins are hidden on the page)
(function(){
function fix(){try{const n=TPL.specs.filter(s=>!s.twin).length;document.querySelectorAll('button.nav[data-view="templates"] .cnt,[data-view="templates"] .cnt').forEach(c=>{if(c.textContent!==String(n))c.textContent=n})}catch(e){}}
if(typeof render==='function')render=(f=>function(){const r=f.apply(this,arguments);fix();return r})(render);
setTimeout(fix,0);
})();
