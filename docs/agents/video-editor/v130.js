// ================= V130 · clear next steps: a thumbnail picker for the video the effects go on, a bar that says what to do
//                   after choosing effects ("התחלת עריכה"), and an action bar in the editor: watch, export the finished
//                   video, or start the professional edit. Big videos are compressed in the browser instead of refused =================
(function(){
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const mb=n=>n?(n/1048576).toFixed(n>1048576*10?0:1)+'MB':'';
const fmt=s=>{s=Math.max(0,s||0);return Math.floor(s/60)+':'+String(Math.round(s%60)).padStart(2,'0')};
const setText=(el,t)=>{if(el&&el.textContent!==t)el.textContent=t};
// ---------- effects studio: pick the video by its picture
function tiles(){const box=document.querySelector('#v128 .v128tgt');if(!box)return;const sel=box.querySelector('select');if(!sel)return;
 const tray=(window.__v127&&__v127.T.items)||[],docs=(window.__vid&&__vid.VD.docs)||[];
 const opts=[...sel.options].map(o=>{const v=o.value;let thumb='',meta='';
  if(v.startsWith('tray:')){const it=tray.find(x=>'tray:'+x.id===v);if(it){thumb=it.thumb?`<img src="${it.thumb}" alt="">`:'';meta=`${fmt(it.dur)} · ${mb(it.size)}`}}
  else{const d=docs.find(x=>'doc:'+x.id===v);const u=d&&(d.out||d.srcUrl);if(u)thumb=`<video src="${esc(u)}#t=0.6" muted playsinline preload="metadata"></video>`;meta=d&&d.created?new Date(d.created).toLocaleDateString('he-IL'):''}
  return {v,label:o.textContent.replace(/^(מהמגש|מהספרייה): /,''),src:v.startsWith('tray:')?'מהמגש':'מהספרייה',thumb,meta,on:o.selected}});
 const key=opts.map(o=>o.v+(o.on?'*':'')+(o.thumb?1:0)).join('|');let g=box.querySelector('.v130tiles');if(g&&g.dataset.k===key)return;
 if(!g){g=document.createElement('div');g.className='v130tiles';g.setAttribute('role','radiogroup');g.setAttribute('aria-label','הסרטון שעליו עובדים');sel.insertAdjacentElement('afterend',g);sel.classList.add('v130hide')}
 g.dataset.k=key;g.innerHTML=opts.map(o=>`<button type="button" role="radio" aria-checked="${o.on}" data-v130t="${esc(o.v)}"><span class="v130th">${o.thumb||'<i></i>'}</span><b>${esc(o.label)}</b><small>${esc(o.src)}${o.meta?' · '+esc(o.meta):''}</small></button>`).join('')}
// ---------- after choosing effects: one obvious next step
function studioBar(){const pg=document.getElementById('v100page'),s=document.getElementById('v128');let bar=document.getElementById('v130sb');
 const n=window.__v128?__v128.SEQ().length:0;if(!pg||!s||!n){if(bar)bar.remove();return}
 if(!bar){bar=document.createElement('div');bar.id='v130sb';bar.className='v130bar';bar.innerHTML='<div><b></b><small></small></div><button type="button" class="px-btn pri" data-v130="start">התחלת עריכה</button>';document.body.appendChild(bar)}
 const miss=s.querySelectorAll('.v128row input[data-k="word"][aria-invalid="true"]').length,hasT=!!s.querySelector('.v128tgt select option');
 setText(bar.querySelector('b'),`בחרת ${n} ${n===1?'אפקט':'אפקטים'}`);
 setText(bar.querySelector('small'),!hasT?'השלב הבא: להעלות סרטון במגש למעלה':miss?`השלב הבא: לכתוב על איזו מילה נוחת כל אפקט (${miss} חסרים)`:'השלב הבא: התחלת עריכה. קודם תגיע תוכנית לאישור שלך');}
// ---------- the editor: an action bar that is always there
function editorBar(){const ed=document.getElementById('v129');if(!ed||!window.__v129)return;const E=__v129.E,p=E.p;if(!p)return;let bar=ed.querySelector('.v130ebar');
 if(!bar){ed.insertAdjacentHTML('beforeend',`<div class="v130ebar" role="region" aria-label="מה עכשיו"><ol class="v130steps"><li>סגנון</li><li>אפקטים, כתוביות וסאונד</li><li>סיום</li></ol><p></p>
  <div class="v130acts"><button type="button" class="px-btn" data-v130="watch">צפייה מההתחלה</button><button type="button" class="px-btn" data-v130="export">יצירת הסרטון המוגמר</button><button type="button" class="px-btn" data-v130="pro"></button></div></div>`);bar=ed.querySelector('.v130ebar')}
 const fx=(p.fx||[]).length+(p.smOn?1:0),lay=p.layers.length+(p.sfx||[]).length,steps=Object.values(p.pro||{}).filter(v=>v===false).length;
 const proN=5-steps;setText(bar.querySelector('[data-v130="pro"]'),fx?`גרסה קולנועית בענן · ${fx} ${fx===1?'בחירה':'בחירות'}`:'גרסה קולנועית בענן');
 bar.querySelector('[data-v130="export"]').classList.add('pri');
 setText(bar.querySelector('p'),`"יצירת הסרטון המוגמר" בונה עכשיו את הסרטון כמו בתצוגה${lay?` (${lay} שכבות)`:''}, שומר אותו בספרייה ומאפשר להוריד או לתזמן כריל.${fx?` אחר כך, "גרסה קולנועית בענן" מוסיפה את ${fx} האפקטים הקולנועיים, אחרי תוכנית לאישור שלך.`:''}`);
 const done=[!!p.recipe||p.look&&p.look!=='none',lay>0||fx>0,!!(E.outs&&E.outs.length)];bar.querySelectorAll('.v130steps li').forEach((li,i)=>li.classList.toggle('on',done[i]))}
// ---------- events
document.addEventListener('click',e=>{const t=e.target.closest&&e.target.closest('[data-v130t]');if(t){const sel=document.querySelector('#v128 .v128tgt select');if(sel){sel.value=t.dataset.v130t;sel.dispatchEvent(new Event('change',{bubbles:true}));const g=t.parentElement;g.querySelectorAll('[data-v130t]').forEach(b=>b.setAttribute('aria-checked',b===t));g.dataset.k=''}return}
 const b=e.target.closest&&e.target.closest('[data-v130]');if(!b)return;const a=b.dataset.v130;
 if(a==='start'){const s=document.getElementById('v128');const miss=s&&s.querySelector('.v128row input[aria-invalid="true"]');if(miss){miss.scrollIntoView({block:'center',behavior:'smooth'});miss.focus({preventScroll:true});try{toast('כתבו על איזו מילה נוחת האפקט')}catch(x){}return}
  const go=s&&s.querySelector('[data-v128="plan"]');if(!s.querySelector('.v128tgt select option')){document.getElementById('v127')&&document.getElementById('v127').scrollIntoView({behavior:'smooth'});try{toast('קודם מעלים סרטון למגש')}catch(x){}return}if(go)go.click()}
 else if(a==='watch'){__v129.E.t=0;__v129.play(true)}
 else if(a==='export')__v129.doExport();
 else if(a==='pro'){if(!(__v129.E.p.fx||[]).length&&!__v129.E.p.smOn){__v129.E.tab='fx';__v129.refresh();try{toast('בחרו אפקטים או שלבים בלשונית "העורך המקצועי", ולחצו שוב')}catch(x){}return}__v129.sendPro()}});
let raf=0;new MutationObserver(()=>{if(raf)return;raf=requestAnimationFrame(()=>{raf=0;try{tiles();studioBar();editorBar()}catch(e){}})}).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['aria-invalid','aria-pressed']});
document.addEventListener('input',()=>{try{studioBar();editorBar()}catch(e){}});
window.__v130={tiles,studioBar,editorBar};
})();
