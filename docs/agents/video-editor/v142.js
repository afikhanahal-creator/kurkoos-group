// ================= V142 · the video page reads as one path: a step bar (upload, design, finished video) that shows where you are,
//                   brand settings folded into one line each with the current choice, the cloud effects and the professional steps
//                   folded until wanted, buttons named for what they do, and a live status card from the moment a video is sent:
//                   sent, plan being written, waiting for your approval, editing, ready (watch, download, schedule) or failed (why, resend) =================
(function(){
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const setT=(el,t)=>{if(el&&el.textContent!==t)el.textContent=t};
const OPEN={};let foldFx=null;
// ---------- the step bar
function steps(){const pg=document.getElementById('v100page');if(!pg)return;let bar=document.getElementById('v142steps');
 const T=window.__v127&&__v127.T,n=T?T.items.length:0,fx=window.__v128?__v128.SEQ().length:0,docs=(window.__vid&&__vid.VD.docs)||[];
 const outs=(window.__v129&&__v129.E.outs||[]).length,ready=docs.some(d=>d.status==='done'&&d.out);const st=[n>0,n>0&&(fx>0||(window.__v129&&__v129.E.p)),outs>0||ready];
 const cur=!st[0]?0:!st[2]?1:2;
 const html=`<ol>${[['מעלים סרטון','גוררים למגש, אחד או כמה'],['מעצבים','מותג, כתוביות, אפקטים וסאונד'],['מקבלים סרטון מוגמר','להורדה, לספרייה או לתזמון כריל']].map(([t,s],i)=>`<li class="${st[i]?'done':''}${i===cur?' cur':''}"><button type="button" data-v142go="${i}"><i>${st[i]?'✓':i+1}</i><span><b>${t}</b><small>${s}</small></span></button></li>`).join('')}</ol>`;
 const host=document.getElementById('v127');if(!host)return;if(!bar||bar.parentElement!==host){if(bar)bar.remove();bar=document.createElement('nav');bar.id='v142steps';bar.setAttribute('aria-label','שלבי העבודה על סרטון');host.prepend(bar)}
 if(bar._h!==html){bar._h=html;bar.innerHTML=html}}
// ---------- brand settings: one line each, opened on demand
function cards(){document.querySelectorAll('#v127 .v127card').forEach(c=>{const h=c.querySelector(':scope > h4');if(!h)return;const k=(h.childNodes[0]&&h.childNodes[0].textContent||h.textContent).trim();
 if(!c.classList.contains('v142c')){c.classList.add('v142c');h.setAttribute('role','button');h.tabIndex=0}
 const open=!!OPEN[k];if(c.classList.contains('open')!==open)c.classList.toggle('open',open);h.setAttribute('aria-expanded',String(open));
 const on=[...c.querySelectorAll('[aria-pressed="true"]')].map(b=>b.textContent.trim()).filter(Boolean);const chk=[...c.querySelectorAll('input[type=checkbox]')].map(i=>i.checked);
 let sum=on.slice(0,3).join(' · ');if(chk.length&&!chk[0])sum='כבוי';if(!sum){const i=c.querySelector('input.v127in,input[type=text]');sum=i&&i.value?i.value:'';}
 let s=h.querySelector('.v142sum');if(!s){s=document.createElement('small');s.className='v142sum';h.appendChild(s)}setT(s,sum)})}
document.addEventListener('click',e=>{const h=e.target.closest&&e.target.closest('#v127 .v142c > h4');if(!h)return;const k=h.firstChild&&h.firstChild.textContent?h.childNodes[0].textContent.trim():h.textContent.trim();OPEN[k]=!OPEN[k];cards()});
document.addEventListener('keydown',e=>{if(e.key!=='Enter'&&e.key!==' ')return;const h=e.target.closest&&e.target.closest('#v127 .v142c > h4');if(!h)return;e.preventDefault();h.click()});
// ---------- the cloud effects and the professional steps fold until wanted
function folds(){[['#v100page .v100top','עריכה אוטומטית לכל סרטון חדש','כשמופעל, כל סרטון שנכנס למערכת נשלח לבד לעורך בענן עם סגנון קבוע. כבוי? עובדים עם המגש למטה'],['v128','אפקטים קולנועיים בעורך בענן','18 אפקטים כמו התנפצות, עצירת זמן וחותמת זהב, על המילה שבחרתם. אופציונלי: העורך בענן מכין תוכנית לאישור שלך ואז מרנדר'],['v126','שלבי עריכה מקצועית בענן','חיתוך שקטים, כתוביות על המילה, 9:16 עם הפנים במרכז, צבע מותג ועוצמת קול. אופציונלי']].forEach(([id,t,s])=>{
 const sec=id[0]==='#'?document.querySelector(id):document.getElementById(id);if(!sec)return;let hd=sec.querySelector(':scope > .v142fold');if(!hd){hd=document.createElement('button');hd.type='button';hd.className='v142fold';hd.dataset.v142fold=id;sec.prepend(hd)}
 const has=id==='v128'&&window.__v128&&__v128.SEQ().length>0;if(foldFx===null)foldFx={};if(foldFx[id]===undefined)foldFx[id]=!has;const shut=foldFx[id]&&!has;
 const h=`<span><b>${t}</b><small>${s}</small></span><em>${shut?'פתיחה':'סגירה'}</em>`;if(hd._h!==h){hd._h=h;hd.innerHTML=h}hd.setAttribute('aria-expanded',String(!shut));if(sec.classList.contains('v142shut')!==shut)sec.classList.toggle('v142shut',shut)})}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-v142fold]');if(!b)return;const id=b.dataset.v142fold;foldFx[id]=!(foldFx[id]);folds();if(!foldFx[id])b.scrollIntoView({behavior:'smooth',block:'start'})});
// ---------- buttons named for what they do
function names(){document.querySelectorAll('#v127 .v129go').forEach(b=>setT(b,'עריכה בעורך'));
 const sb=document.querySelector('#v130sb [data-v130="start"]');setT(sb,'שליחה לעורך בענן');document.querySelectorAll('#v128 [data-v128="plan"]').forEach(x=>{if(/התחלת עריכה/.test(x.textContent))setT(x,'שליחה לעורך בענן')});
 document.querySelectorAll('#v100page video:not([poster])').forEach(v=>{if(v.dataset.v142)return;v.dataset.v142=1;const s=v.getAttribute('src');if(s&&!/#t=/.test(s)&&!/^blob:/.test(s)){v.preload='metadata';v.setAttribute('src',s+'#t=0.6')}})}
// ---------- the live status card
const SENT=[];let hidden={};
function track(id){if(id&&!SENT.includes(id)){SENT.push(id);hidden={};job()}}
if(window.__vid){const V=__vid;const q=V.queueDoc;V.queueDoc=async function(d){const r=await q.apply(this,arguments);try{track((r&&r.id)||(d&&d.id))}catch(e){}return r};
 const ev=V.editVideo;V.editVideo=async function(d){try{track(d&&d.id)}catch(e){}return ev.apply(this,arguments)}}
const STEPS=[['sent','נשלח לעורך'],['plan','מכין תוכנית'],['approve','מחכה לאישור שלך'],['edit','עורך את הסרטון'],['done','מוכן']];
function stage(d){const s=d.status||'';if(s==='failed'||s==='error')return 'failed';if(s==='done'||s==='completed'||d.out&&s!=='plan_requested'&&s!=='awaiting_approval')return 'done';
 if(s==='awaiting_approval')return 'approve';if(s==='plan_requested'||s==='planning')return d.planMd?'approve':'plan';if(s==='approved'||s==='editing'||s==='processing'||s==='working')return 'edit';return 'sent'}
function cloudNow(){const docs=(window.__vid&&__vid.VD.docs)||[];const id=SENT.slice().reverse()[0];const d=id&&docs.find(x=>x.id===id);if(!d)return '';const st=stage(d);return st==='done'?'הגרסה מהענן מוכנה':st==='failed'?'העריכה בענן נכשלה':st==='approve'?'בענן: תוכנית מחכה לאישור שלך':st==='edit'?'בענן: העורך עובד על הסרטון':'בענן: מכין תוכנית'}
function job(){const docs=(window.__vid&&__vid.VD.docs)||[];const id=SENT.slice().reverse().find(i=>!hidden[i]);let el=document.getElementById('v142job');
 const onPage=!!document.getElementById('v100page')&&!(document.getElementById('v129')&&window.__v129&&__v129.E.p&&document.getElementById('v129').offsetParent);document.body.classList.toggle('v142jobon',!!id&&onPage);
 if(!id||!onPage){if(el)el.remove();return}const d=docs.find(x=>x.id===id)||{id,status:'queued',name:''};const st=stage(d);const idx=st==='failed'?-1:STEPS.findIndex(s=>s[0]===st);
 const title=st==='done'?'הסרטון הערוך מוכן':st==='failed'?'העריכה נכשלה':st==='approve'?'התוכנית מחכה לאישור שלך':'העריכה התחילה';
 const sub=st==='done'?'אפשר לצפות, להוריד או לתזמן כריל':st==='failed'?String(d.error||'העורך לא סיים. אפשר לשלוח שוב').slice(0,160):st==='approve'?'העורך כתב מה הוא הולך לעשות. קוראים, מאשרים, והוא מתחיל':st==='edit'?'העורך בענן עובד על הסרטון. זה לוקח כמה דקות, אפשר להמשיך לעבוד':'העורך בענן קיבל את הסרטון. התוכנית תגיע לכאן לאישור שלך';
 const acts=st==='done'?`${d.out?`<a class="px-btn sm pri" href="${esc(d.out)}" target="_blank" rel="noopener">צפייה</a><a class="px-btn sm" href="${esc(d.out)}" download>הורדה</a>`:''}<button type="button" class="px-btn sm" data-v131open="doc" data-id="${esc(d.id)}">תזמון כריל</button>`
  :st==='approve'?`<button type="button" class="px-btn sm pri" data-v142job="plan">לתוכנית ולאישור</button>`:st==='failed'?`<button type="button" class="px-btn sm pri" data-v142job="retry">שליחה מחדש</button>`:`<button type="button" class="px-btn sm" data-v142job="card">לכרטיס של הסרטון</button>`;
 const h=`<div class="v142jh"><span class="v142dot ${st}"></span><div><b>${title}</b><small>${esc(d.name||'')}</small></div><button type="button" class="v142jx" data-v142job="hide" aria-label="הסתרה">✕</button></div>
  <ol class="v142jsteps">${STEPS.map((s,i)=>`<li class="${idx>i||st==='done'?'done':''}${idx===i&&st!=='done'?' cur':''}">${s[1]}</li>`).join('')}</ol><p>${esc(sub)}</p><div class="v142ja">${acts}</div>`;
 if(!el){el=document.createElement('section');el.id='v142job';el.setAttribute('role','status');el.setAttribute('aria-live','polite');document.body.appendChild(el)}
 el.className='on '+st;if(el._h!==h){el._h=h;el.innerHTML=h}}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-v142job]');if(!b)return;const a=b.dataset.v142job,id=SENT.slice().reverse().find(i=>!hidden[i]);
 if(a==='hide'){hidden[id]=1;job();return}
 const card=document.querySelector(`#v100page .v100c[data-vid="${CSS.escape(id||'')}"]`);
 if(a==='retry'){const r=card&&card.querySelector('[data-v132retry]');if(r){r.click();return}}
 if(card){if(window.APP&&APP.view!=='videos'){APP.view='videos';try{render()}catch(x){}}card.scrollIntoView({behavior:'smooth',block:'center'});card.classList.add('v142flash');setTimeout(()=>card.classList.remove('v142flash'),1800);const pl=a==='plan'&&card.querySelector('.v128ap button,[data-v128="approve"]');if(pl)setTimeout(()=>pl.focus({preventScroll:true}),500)}
 else{APP.view='videos';try{render()}catch(x){}}});
document.addEventListener('click',e=>{const g=e.target.closest&&e.target.closest('[data-v142go]');if(!g)return;const i=+g.dataset.v142go;
 const tgt=i===0?document.getElementById('v127'):i===1?(document.querySelector('#v127 .v127kit, #v127 .v127card')||document.getElementById('v127')):(document.querySelector('#v127 [data-v127="export"], #v127 .v127exp')||document.getElementById('v127'));tgt&&tgt.scrollIntoView({behavior:'smooth',block:'start'})});
// ---------- the editor says plainly that this video is being edited
function editor(){const ed=document.getElementById('v129');if(!ed||!window.__v129||!__v129.E.p)return;let b=ed.querySelector('.v142now');const p=__v129.E.p,outs=(__v129.E.outs||[]).length;
 const cn=cloudNow();const h=`<span class="v142live" aria-hidden="true"></span><div><b>עורכים עכשיו: ${esc(p.name||'סרטון')}</b>${cn?`<em class="v142cn">${esc(cn)}</em>`:''}<small>${outs?`הסרטון המוגמר מוכן (${outs} ${outs===1?'קובץ':'קבצים'}) בלשונית "גרסאות והורדה"`:'כל שינוי נשמר אוטומטית ומופיע מיד בתצוגה. בסוף לוחצים "יצירת הסרטון המוגמר"'}</small></div>`;
 if(!b){b=document.createElement('div');b.className='v142now';b.setAttribute('role','status');const top=ed.querySelector('.v129top');top?top.insertAdjacentElement('afterend',b):ed.prepend(b)}if(b._h!==h){b._h=h;b.innerHTML=h}}
let wasEd=null;function edOpened(){const p=window.__v129&&__v129.E.p,id=p&&document.getElementById('v129')?p.id:null;if(id&&id!==wasEd){try{toast('העורך נפתח עם "'+(p.name||'הסרטון')+'". כל שינוי מופיע מיד בתצוגה')}catch(e){}}wasEd=id}
let t=0;function all(){t=0;try{steps();cards();folds();names();job();editor();edOpened()}catch(e){console.warn('v142',e)}}
new MutationObserver(()=>{if(!t)t=requestAnimationFrame(all)}).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['aria-pressed']});
setInterval(()=>{job();steps()},1500);
window.__v142={track,job,stage,SENT,all};
})();
