/*V223:START*/
// ================= V223 · how many in a row: a control on the posts gallery and the template library (4, 6, 8 or 10 per row on
// a desktop screen). At 8 and 10 the cards turn compact (preview, title, one action) so far more posts fit on one screen.
// The choice is remembered per view. Phones keep two in a row. =================
(()=>{
if(window.__v223)return;window.__v223=1;
const KEY='v223_dens';const OPTS=[4,6,8,10];
const VIEWS=[['gallery','.v207bar','.v207grid',4],['templates','.v209bar','.v209grid',4]];
function state(){try{return Object.assign({},JSON.parse(localStorage.getItem(KEY)||'{}'))}catch(e){return {}}}
function save(s){try{localStorage.setItem(KEY,JSON.stringify(s))}catch(e){}}
const desktop=()=>window.matchMedia('(min-width:900px)').matches;
function ctl(k,cur){return `<div class="v223" role="group" aria-label="כמה בשורה"><span>בשורה</span>${OPTS.map(n=>`<button type="button" data-v223="${k}" data-n="${n}" aria-pressed="${cur===n}">${n}</button>`).join('')}</div>`}
function apply(){const s=state();VIEWS.forEach(([k,bar,grid,def])=>{const cur=+s[k]||def;document.querySelectorAll(grid).forEach(g=>{if(desktop())g.dataset.dens=String(cur);else delete g.dataset.dens;g.classList.toggle('v223c',desktop()&&cur>=8)});
  document.querySelectorAll(bar).forEach(b=>{let c=b.querySelector('.v223');if(!c){b.insertAdjacentHTML('beforeend',ctl(k,cur));c=b.querySelector('.v223')}else c.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(+x.dataset.n===cur)))})})}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-v223]');if(!b)return;const s=state();s[b.dataset.v223]=+b.dataset.n;save(s);apply()},true);
let t=0;const ob=new MutationObserver(()=>{clearTimeout(t);t=setTimeout(apply,60)});
function arm(){const r=document.getElementById('appviews');if(r&&!r.__v223){ob.observe(r,{childList:true,subtree:true});r.__v223=1;apply()}}
arm();setTimeout(arm,1500);window.addEventListener('resize',()=>{clearTimeout(t);t=setTimeout(apply,120)});
window.__v223={apply,state};
})();
/*V223:END*/
