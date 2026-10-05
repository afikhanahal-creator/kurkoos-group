// ================= V124 · design and function pass over every page: page actions on their own row on desks, the
//                   gallery topic cloud folded to two lines, real frames on video cards, settings slots added the
//                   moment a time is picked, clear messages where buttons used to stay silent =================
(function(){
// 1. header: mark the toolbar when it has page actions, so CSS can give them their own row
function tb(){const act=document.getElementById('vact');if(!act)return;const bar=act.closest('.tbar')||act.parentElement;if(!bar)return;bar.classList.toggle('v124acts',act.children.length>0)}
// 2. gallery topic cloud: two lines, then a toggle
let open=false;
function fam(){const box=document.querySelector('#appviews .ga-fam');if(!box)return;const n=box.children.length;if(n<14){box.classList.remove('v124fold','v124open');return}
 box.classList.add('v124fold');box.classList.toggle('v124open',open);let t=box.parentElement.querySelector(':scope>.v124more');
 if(!t){t=document.createElement('button');t.type='button';t.className='v124more';t.dataset.v124='fam';box.insertAdjacentElement('afterend',t)}
 const on=box.querySelector('[aria-pressed="true"]');t.textContent=open?'פחות נושאים':`כל הנושאים (${n})`;t.setAttribute('aria-expanded',String(open));
 if(!open&&on&&on.offsetTop>box.clientHeight){box.prepend(on)}}
// 3. video cards: show a frame of the video instead of a black box
function vids(){document.querySelectorAll('#appviews video:not([data-v124])').forEach(v=>{v.dataset.v124='1';if(v.poster)return;v.preload='metadata';const s=v.getAttribute('src');if(s&&!/#t=/.test(s)&&!/^blob:/.test(s)){v.setAttribute('src',s+'#t=0.6')}else if(s){v.addEventListener('loadedmetadata',()=>{try{if(!v.currentTime)v.currentTime=Math.min(.6,(v.duration||1)/3)}catch(e){}},{once:true})}})}
// 4. settings: a picked time is added at once; + with no time opens the picker
document.addEventListener('change',e=>{const i=e.target;if(!i||!i.matches||!i.matches('input[data-slotin]')||!i.value)return;const b=document.querySelector(`[data-app="addslot"][data-d="${i.dataset.slotin}"]`);if(b)setTimeout(()=>b.click(),0)},true);
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-app="addslot"]');if(!b)return;const i=document.querySelector(`[data-slotin="${b.dataset.d}"]`);if(i&&!i.value){e.preventDefault();e.stopImmediatePropagation();try{i.focus();i.showPicker&&i.showPicker()}catch(x){i.focus()}try{toast('בחרו שעה, והיא תתווסף מיד')}catch(x){}}},true);
// 5. agent: an empty command and a series with no new materials say what is missing
document.addEventListener('submit',e=>{const f=e.target;if(!f||!f.matches||!f.matches('[data-v51chat]'))return;const i=f.querySelector('input,textarea');if(i&&!i.value.trim()){e.preventDefault();e.stopImmediatePropagation();setTimeout(()=>i.focus(),0);try{toast('כתבו מה לעשות, למשל: "צור 5 פוסטים על הנרייטה סאלד"')}catch(x){}}},true);
document.addEventListener('click',e=>{const t=e.target.closest&&e.target.closest('[data-v124="fam"]');if(!t)return;e.preventDefault();open=!open;fam()},true);
function all(){try{tb()}catch(e){}try{fam()}catch(e){}try{vids()}catch(e){}}
if(typeof render==='function')render=(f=>function(){const r=f.apply(this,arguments);all();return r})(render);
let q=0;new MutationObserver(()=>{if(q)return;q=requestAnimationFrame(()=>{q=0;all()})}).observe(document.body,{childList:true,subtree:true});
window.__v124={all};
})();
