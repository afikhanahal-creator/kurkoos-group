// ================= V107 · new posts from new photos: every photo that entered the library (the website photos, uploads) and
//                   has fewer than two posts gets posts built on strong templates, with copy reused from an approved post of the
//                   same kind. Runs once per version and from a "פוסטים מהתמונות החדשות" button. No invented text. =================
(function(){
const FLAG='ag_v107_done_v1';
const FAMS=/^x_t_(b3_|rv|au_(largedev|site|social|tidhar|gabay|prash)|cp)/;
function photoKeys(){return Object.keys(PHOTO_LIB).filter(k=>k.startsWith('u_')).filter(k=>{const m=metaOf(k);return ['site','render','drawing','people','aerial'].includes(m.k)})}
function postsOf(key){return AG.posts.filter(p=>JSON.stringify(p.fx||{}).includes('"k":"'+key+'"'))}
function templatesFor(){const ids=TPL.specs.filter(s=>FAMS.test(s.id)&&s.el.some(e=>e.t==='photo'||e.t==='cphoto'||e.t==='pphoto')&&!s.twin).map(s=>s.id);return ids.length?ids:TPL.specs.filter(s=>s.el.some(e=>e.t==='photo')).map(s=>s.id)}
function demoFor(kind){const cands=AG.posts.filter(p=>/^(ed|x)_/.test(p.layout)&&p.visual&&(p.visual.headline||'').trim()&&(p.visual.sub||p.fb||'').length>10&&peSlots(p).length);
 const same=cands.filter(p=>{const s=p.fx&&p.fx.shot;return s&&metaOf(s.k).k===kind});const pool=same.length>=4?same:cands;return pool[Math.floor(Math.random()*pool.length)]}
function build(opts={}){if(typeof AG==='undefined'||typeof TPL==='undefined'||typeof peConvert!=='function')return null;
 const per=opts.per||2;const tpls=templatesFor();if(!tpls.length)return null;const made=[];const used=new Set();
 photoKeys().forEach(k=>{const have=postsOf(k).length;if(have>=per)return;const kind=metaOf(k).k;
  for(let i=have;i<per;i++){const demo=demoFor(kind);if(!demo)break;let tpl=tpls[Math.floor(Math.random()*tpls.length)];let tries=0;while(used.has(tpl)&&tries++<20)tpl=tpls[Math.floor(Math.random()*tpls.length)];used.add(tpl);
   try{const q=clonePost(demo);peConvert(q,tpl);q.fx=q.fx||{};q.fx.shot={k,r:[0,0,1,1]};if(Array.isArray(q.fx.shots)&&q.fx.shots.length)q.fx.shots[0]={k,r:[0,0,1,1]};q.series='מתמונות חדשות · '+(metaOf(k).n||'');q.tpl=1;q.status='draft';q.upd=new Date().toISOString();q.photoKey=k;made.push(q)}catch(e){}}});
 if(made.length){AG.posts.unshift(...made);try{saveAgent()}catch(e){}try{renderAgent()}catch(e){}try{render()}catch(e){}}
 return {made:made.length,photos:photoKeys().length}}
function run(manual){const r=build();if(!r){if(manual)toast('הספרייה עוד נטענת. נסו שוב בעוד רגע');return}
 toast(r.made?`${r.made} פוסטים חדשים נוצרו מ-${r.photos} תמונות חדשות. הם בגלריה כטיוטות, עם הטקסט מפוסטים מאושרים`:`לכל ${r.photos} התמונות החדשות כבר יש פוסטים`)}
window.__v107={build,run,photoKeys};
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-v107="run"]');if(!b)return;e.preventDefault();run(true)});
const mo=new MutationObserver(()=>{const act=document.getElementById('vact');if(!act||typeof APP==='undefined')return;if(!['gallery','agent','ideas'].includes(APP.view))return;if(act.querySelector('[data-v107]'))return;
 const b=document.createElement('button');b.type='button';b.className='ibtn';b.dataset.v107='run';b.title='יוצר פוסטים חדשים מכל תמונה חדשה בספרייה';b.innerHTML=(typeof ico==='function'?ico('img',16):'')+' פוסטים מתמונות חדשות';act.appendChild(b)});
mo.observe(document.body,{childList:true,subtree:true});
// once per version, after the library has loaded from the database (uploads arrive a few seconds after boot)
let tries=0;const t=setInterval(()=>{tries++;try{if(localStorage.getItem(FLAG)){clearInterval(t);return}if(photoKeys().length||tries>12){clearInterval(t);if(!photoKeys().length)return;const r=build();localStorage.setItem(FLAG,'1');if(r&&r.made)toast(`${r.made} פוסטים חדשים נוצרו מהתמונות החדשות של האתר. הם בגלריה כטיוטות`)}}catch(e){}},5000);
})();
