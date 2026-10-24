/*V221:START*/
// ================= V221 · the 14 reel effects (video/my-reel: one design language, style.md) in both video editors. A card
// "14 אפקטי הריל" in the plan editor (העורך המקצועי tab, the אפקטים tab at the cursor, and the style tab as packs chosen
// before editing starts) and in the studio's effects panel (added on the frame under the playhead, also on a finished video
// opened for fixes). Every chosen effect carries its word or its second, its parameters and the Hebrew prompt from the
// catalog; the plan goes to the cloud editor as `reel` on the video doc, or downloads as plan.json for `node build.mjs`. =================
(()=>{
if(window.__v221)return;window.__v221=1;
const E=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const toastS=m=>{try{toast(m)}catch(e){console.log(m)}};
const ACCENT='#FF7A3D';
const CAT=[
 {n:1,id:'title',name:'כותרת אות-אות',layer:'titles',dur:1.5,what:'שם האפקט בגדול בחלק העליון, מונה קטן מעליו, האותיות נכנסות אחת-אחת.',params:{text:'כותרת'},prompt:'על המילה [מילה]: כותרת גדולה בחלק העליון של המסך, מעליה מונה קטן NN/14 בצבע המבטא. האותיות נכנסות אחת-אחת מלמטה עם ריכוך, ויוצאות יחד לפני האפקט הבא. בלי להסתיר את הפנים.'},
 {n:2,id:'pill',name:'הדגשת מילה',layer:'front',dur:1.2,what:'גלולה מעוגלת בצבע המבטא עם המילה שנאמרה, קופצת בשליש התחתון.',params:{text:'המילה'},prompt:'על המילה [מילה]: גלולה מעוגלת בצבע המבטא עם המילה עצמה, קופצת מלמטה בשליש התחתון של המסך, נשארת רגע ונעלמת. פינות מעוגלות, צל רך, בלי זוהר.'},
 {n:3,id:'behind',name:'טקסט מאחורי הדובר',layer:'behind',dur:1.5,what:'מילה ענקית בצבע המבטא נכנסת מאחורי הדמות (בין הסרטון לקאט-אאוט).',params:{text:'מילה'},prompt:'על המילה [מילה]: מילה ענקית בצבע המבטא נכנסת מהצד מאחורי הדמות שלי, כך שאני מסתיר חלק ממנה, ויוצאת לצד השני. הטקסט בשכבת מאחור, הקאט-אאוט מעליו.'},
 {n:4,id:'counter',name:'מספר קופץ',layer:'front',dur:1.5,what:'מספר גדול שרץ מ-0 לערך, עם תווית קצרה מתחתיו.',params:{value:7,suffix:'',label:'תווית'},prompt:'על המילה [מילה]: מספר גדול שרץ מאפס עד [ערך] בחצי שנייה, עם תווית קצרה מתחתיו, בשליש התחתון. הספרות בפונט הכותרות, הצבע לבן והתווית בצבע המבטא.'},
 {n:5,id:'underline',name:'קו מצויר',layer:'front',dur:1.3,what:'משפט קצר, ומתחתיו קו בצבע המבטא שמצויר מימין לשמאל.',params:{text:'משפט קצר'},prompt:'על המילה [מילה]: משפט קצר מופיע בשליש התחתון ומתחתיו נמשך קו בצבע המבטא מימין לשמאל, כמו הדגשה ביד. הקו בעובי 6 פיקסלים עם קצוות מעוגלים.'},
 {n:6,id:'card',name:'כרטיס מידע',layer:'front',dur:1.5,what:'כרטיס מעוגל עם כותרת ושורת פירוט, נכנס מהצד בשליש התחתון.',params:{title:'כותרת',text:'פירוט קצר'},prompt:'על המילה [מילה]: כרטיס מידע מעוגל (פינות 32) עם כותרת ושורת פירוט נכנס מימין בשליש התחתון, נשאר רגע ויוצא לשמאל. רקע כהה חם, פס דק בצבע המבטא בצד.'},
 {n:7,id:'punch',name:"פאנץ' אין",layer:'frame',dur:1.0,what:'המצלמה נכנסת פנימה ב-8 אחוז וחוזרת, המקורי והקאט-אאוט יחד.',params:{zoom:1.08},prompt:"על המילה [מילה]: פאנץ' אין קצר: כל הפריים (המקורי והקאט-אאוט יחד) מתקרב ב-8 אחוז בבת אחת וחוזר ברכות. בלי לשבור את הסנכרון בין השכבות."},
 {n:8,id:'checklist',name:"צ'קליסט",layer:'front',dur:1.5,what:'שלוש שורות עם עיגול וי בצבע המבטא, מופיעות אחת אחרי השנייה.',params:{items:'שורה 1, שורה 2, שורה 3'},prompt:"על המילה [מילה]: צ'קליסט של שלוש שורות בשליש התחתון, כל שורה נכנסת אחרי קודמתה עם עיגול וי בצבע המבטא שמתמלא. יוצא יחד לפני האפקט הבא."},
 {n:9,id:'quote',name:'בועת ציטוט',layer:'front',dur:1.5,what:'בועת דיבור מעוגלת ליד הכתף עם המשפט, בלי לכסות את הפנים.',params:{text:'ציטוט קצר'},prompt:'על המילה [מילה]: בועת דיבור מעוגלת ליד הכתף שלי עם המשפט [טקסט], קופצת עם ריכוך קל ונעלמת. הבועה לבנה, הטקסט כהה, הזנב מכוון אליי, ובשום שלב לא מכסה את הפנים.'},
 {n:10,id:'pin',name:'תגית מיקום',layer:'front',dur:1.4,what:'סיכה בצבע המבטא נוחתת ולידה שם המקום.',params:{text:'הוד השרון'},prompt:'על המילה [מילה]: סיכת מיקום בצבע המבטא נוחתת מלמעלה עם קפיצה קטנה, ולידה נפתחת תווית לבנה עם שם המקום [מקום]. בשליש התחתון, ליד הכתף.'},
 {n:11,id:'icon',name:'אייקון קופץ',layer:'front',dur:1.2,what:'עיגול בצבע המבטא עם אייקון קופץ ליד הכתף.',params:{icon:'home',text:''},prompt:'על המילה [מילה]: עיגול בצבע המבטא עם אייקון [אייקון] קופץ ליד הכתף עם ריכוך קל, ואופציונלית תווית קצרה מתחתיו. נעלם לפני האפקט הבא.'},
 {n:12,id:'split',name:'השוואה',layer:'front',dur:1.5,what:'שני חלונות זה לצד זה: לפני ואחרי, או שתי אפשרויות.',params:{a:'לפני',b:'אחרי'},prompt:'על המילה [מילה]: כרטיס השוואה בשליש התחתון: שני חלונות מעוגלים זה לצד זה, [א] מימין ו-[ב] משמאל, עם קו מפריד בצבע המבטא. השני נכנס רגע אחרי הראשון.'},
 {n:13,id:'bar',name:'פס מודגש',layer:'behind',dur:1.3,what:'פס בצבע המבטא עובר מאחורי הדובר עם מילה אחת עליו.',params:{text:'מילה'},prompt:'על המילה [מילה]: פס רחב בצבע המבטא עובר מאחורי הדמות שלי מימין לשמאל, עם המילה [טקסט] בלבן עליו. הפס בשכבת מאחור, הקאט-אאוט מכסה אותו, לא מגיע לגובה הפנים.'},
 {n:14,id:'cta',name:'כפתור',layer:'front',dur:1.5,what:'כפתור בצבע המבטא עם חץ בתחתית המסך, נלחץ פעם אחת.',params:{text:'לפרטים בפרופיל'},prompt:'על המילה [מילה]: כפתור מעוגל בצבע המבטא עם הטקסט [טקסט] וחץ, עולה מלמטה במרכז, נלחץ פעם אחת (קטן ב-4 אחוז וחוזר) ונשאר עד סוף האפקט.'}
];
const BY=Object.fromEntries(CAT.map(c=>[c.id,c]));
const PACKS=[['all','כל 14 האפקטים','אחד על כל מילה חזקה, לפי הסדר של הקטלוג',CAT.map(c=>c.id)],
 ['talk','שיחה למצלמה','כותרת, הדגשת מילה, קו מצויר, בועת ציטוט, פאנץ\' אין וכפתור',['title','pill','underline','quote','punch','cta']],
 ['project','פרויקט ודירה','תגית מיקום, כרטיס מידע, מספר קופץ, צ\'קליסט, השוואה וכפתור',['title','pin','card','counter','checklist','split','cta']],
 ['minimal','מינימלי','כותרת, הדגשת מילה וכפתור',['title','pill','cta']]];
const PL={text:'טקסט',title:'כותרת',value:'ערך',suffix:'סיומת',label:'תווית',items:'שורות (מופרדות בפסיק)',icon:'אייקון',a:'ימין',b:'שמאל',zoom:'זום'};
const ICONS=[['home','בית'],['key','מפתח'],['money','כסף'],['heart','לב'],['check','וי'],['star','כוכב'],['pin','מיקום']];
const LAYER={titles:'כותרות',front:'מלפנים',behind:'מאחור',frame:'כל הפריים'};
const RULES='שפה עיצובית אחת (video/my-reel/style.md): מבטא אחד '+ACCENT+', כותרות Heebo Black וטקסט Heebo Medium, פינות מעוגלות 28 עד 40, צללים רכים, בלי גרדיאנטים ובלי ניאון. כל אפקט עד 1.5 שניות: כניסה עד 0.35, יציאה עד 0.25, נכנס על תחילת המילה ויוצא לפני האפקט הבא, ולעולם לא מכסה את העיניים או את הפה. הכל על טיימליין GSAP אחד, מושהה ודטרמיניסטי.';
const fmtT=s=>{s=Math.max(0,+s||0);const m=Math.floor(s/60),r=s-m*60;return m+':'+(r<10?'0':'')+r.toFixed(1)};
const when=f=>f.word?'על המילה "'+f.word+'"':f.at!=null&&f.at!==''?'בשנייה '+(+f.at).toFixed(1):'';
function promptFor(f){const d=BY[f.id];if(!d)return '';const p=Object.assign({},d.params,f.params||{});const w=f.word?'['+f.word+']':f.at!=null&&f.at!==''?'[בשנייה '+(+f.at).toFixed(1)+']':'[מילה]';
 let s=d.prompt.replace('[מילה]',w.replace(/^\[|\]$/g,'')).replace('NN',String(f.n||d.n).padStart(2,'0'));
 s=s.replace('[ערך]',String(p.value!=null?p.value:'')+(p.suffix||'')).replace('[טקסט]',p.text||p.title||'').replace('[מקום]',p.text||'').replace('[א]',p.a||'').replace('[ב]',p.b||'');
 s=s.replace('[אייקון]',(ICONS.find(x=>x[0]===p.icon)||['','כוכב'])[1]);if(p.label&&d.id==='counter')s+=' התווית: '+p.label+'.';if(p.items&&d.id==='checklist')s+=' השורות: '+p.items+'.';
 return s}
function fullPrompt(list){const L=(list||[]).map(f=>promptFor(f)).filter(Boolean);if(!L.length)return '';return 'תוסיף לריל את האפקטים האלה, כל אחד על המילה שלו, לפי השפה העיצובית של style.md:\n'+L.join('\n')+'\n'+RULES+'\nאפקט שהמילה שלו לא בתמלול, דלג עליו ודווח. תבדוק בפריימים שכל אפקט נוחת על המילה שלו ושאף אחד לא מכסה את הפנים.'}
function norm(f){const d=BY[f.id];const p=Object.assign({},d.params,f.params||{});if(d.id==='checklist'&&typeof p.items==='string')p.items=p.items.split(/[,،]/).map(s=>s.trim()).filter(Boolean).slice(0,3);if(d.id==='counter')p.value=+p.value||0;if(d.id==='punch')p.zoom=+p.zoom||1.08;
 const o={id:d.id,n:d.n,name:d.name,params:p};if(f.word)o.word=String(f.word).trim();if(f.at!=null&&f.at!=='')o.at=+(+f.at).toFixed(2);if(f.dur)o.dur=+f.dur;return o}
function planOf(list,meta){return Object.assign({_:'תוכנית ל-video/my-reel: node build.mjs plan.json. אפקט עם word נוחת על תחילת המילה מהתמלול (transcript.json), אפקט עם at נוחת בשנייה שכתובה.',version:1,style:'style.md',accent:ACCENT,titles:true,source:'assets/video.mp4',cutout:'assets/cutout.webm'},meta||{},{effects:(list||[]).map(norm)})}
function missing(list){return (list||[]).filter(f=>!f.word&&(f.at==null||f.at===''))}
function download(name,text){const b=new Blob([text],{type:'application/json'});const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),2000)}
async function copy(t){try{await navigator.clipboard.writeText(t);toastS('הועתק')}catch(e){const ta=document.createElement('textarea');ta.value=t;document.body.appendChild(ta);ta.select();try{document.execCommand('copy');toastS('הועתק')}catch(x){toastS('לא הצלחתי להעתיק')}ta.remove()}}

// ---------- the card (shared by both editors). ctx: {host:'v129'|'v204', list, t, mode:'full'|'cursor'|'packs'}
function card(ctx){const list=ctx.list||[],t=ctx.t||0,mode=ctx.mode||'full',has=id=>list.some(f=>f.id===id),miss=missing(list).length;
 const grid=`<div class="v221grid">${CAT.map(c=>`<button type="button" data-v221="add" data-id="${c.id}" aria-pressed="${has(c.id)}" title="${E(c.what)}"><b>${String(c.n).padStart(2,'0')}</b><span>${E(c.name)}</span><small>${E(LAYER[c.layer])}</small></button>`).join('')}</div>`;
 const packs=`<div class="v221packs">${PACKS.map(([id,n,d])=>`<button type="button" data-v221="pack" data-id="${id}"><b>${E(n)}</b><small>${E(d)}</small></button>`).join('')}</div>`;
 const rows=list.length?`<ol class="v221list">${list.map((f,i)=>{const d=BY[f.id];if(!d)return '';const p=Object.assign({},d.params,f.params||{});const w=when(f);
   return `<li class="v221row${w?'':' warn'}"><div class="v221rh"><b>${String(d.n).padStart(2,'0')} ${E(d.name)}</b><small>${w?E(w):'עוד לא נבחרה מילה או שנייה'}</small><button type="button" class="v221x" data-v221="del" data-i="${i}" aria-label="להסיר את ${E(d.name)}">✕</button></div>
   <div class="v221f"><label><span>על המילה</span><input data-v221f="${i}" data-k="word" value="${E(f.word||'')}" placeholder="מילה מהתמלול"></label><label class="v221at"><span>או בשנייה</span><input type="number" step="0.1" min="0" data-v221f="${i}" data-k="at" value="${f.at!=null?f.at:''}"></label><button type="button" class="v221b" data-v221="here" data-i="${i}">כאן (${fmtT(t)})</button></div>
   <div class="v221f">${Object.keys(d.params).map(k=>k==='icon'?`<label><span>${PL[k]}</span><select data-v221f="${i}" data-k="icon">${ICONS.map(([v,l])=>`<option value="${v}" ${p.icon===v?'selected':''}>${l}</option>`).join('')}</select></label>`:`<label><span>${PL[k]||k}</span><input ${k==='value'||k==='zoom'?'type="number" step="'+(k==='zoom'?'0.01':'1')+'"':''} data-v221f="${i}" data-k="${k}" value="${E(Array.isArray(p[k])?p[k].join(', '):p[k])}"></label>`).join('')}</div>
   <details class="v221p"><summary>הפרומפט</summary><p>${E(promptFor(f))}</p><button type="button" class="v221b" data-v221="copy1" data-i="${i}">העתקה</button></details></li>`}).join('')}</ol>`:'';
 const foot=`<div class="v221foot"><button type="button" class="v221b pri" data-v221="copyall" ${list.length?'':'disabled'}>העתקת כל הפרומפטים (${list.length})</button><button type="button" class="v221b" data-v221="plan" ${list.length?'':'disabled'}>הורדת plan.json</button>${ctx.host==='v204'?`<button type="button" class="v221b" data-v221="pro" ${list.length?'':'disabled'}>שליחה לעורך המקצועי</button>`:''}${list.length?`<button type="button" class="v221b" data-v221="clear">ניקוי</button>`:''}${miss?`<small class="v221warn">${miss} אפקטים בלי מילה או שנייה: העורך יציב אותם על המילים החזקות לפי הסדר, או כתבו מילה</small>`:''}</div>`;
 if(mode==='packs')return `<div class="v129card v221card" data-v221card="${ctx.host}"><h5>14 אפקטי הריל: לבחור לפני שמתחילים</h5><p class="v129hint">חבילה אחת לכל הסרטון. אחר כך, בלשונית "העורך המקצועי", כותבים על איזו מילה כל אפקט נוחת, ובלשונית "אפקטים ואנימציה" מוסיפים אפקט בפריים שבו עומד הסמן.</p>${packs}${list.length?`<small class="v129hint">נבחרו ${list.length}: ${list.map(f=>BY[f.id].name).join(', ')}</small>`:''}</div>`;
 if(mode==='cursor')return `<div class="v129card v221card" data-v221card="${ctx.host}"><h5>אפקט ריל בפריים הזה (${fmtT(t)})</h5><p class="v129hint">מתאים גם לסרטון מוכן: עוצרים על הפריים, לוחצים על אפקט, והוא נכנס בשנייה הזו. מילה אפשר לכתוב אחר כך בלשונית "העורך המקצועי".</p>${grid}</div>`;
 return `<div class="${ctx.host==='v204'?'v205card v221card':'v129card v221card'}" data-v221card="${ctx.host}"><h5>14 אפקטי הריל <small>שפה עיצובית אחת</small></h5><p class="v129hint v221hint">${E(RULES)}</p>
  <h6>חבילות</h6>${packs}<h6>אפקט בודד${ctx.host==='v204'?' (נכנס בפריים שמתחת לסמן, '+fmtT(t)+')':''}</h6>${grid}${rows}${foot}</div>`}

// ---------- state per editor
const H={v129:{get:()=>window.__v129&&__v129.E&&__v129.E.p,list:p=>p.reel||(p.reel=[]),t:()=>{try{const s=__v129.seq();return +((__v129.E.p.in||0)+Math.max(0,__v129.E.t-s.intro)).toFixed(1)}catch(e){return +(__v129.E.t||0).toFixed(1)}},change:fn=>__v129.change(q=>{q.reel=q.reel||[];fn(q.reel,q)},false),refresh:()=>__v129.refresh()},
 v204:{get:()=>window.__v204&&__v204.S&&__v204.S.p,list:p=>{if(!p.reel){try{p.reel=JSON.parse(localStorage.getItem('v221_'+p.id)||'[]')}catch(e){p.reel=[]}}return p.reel},t:()=>+((__v204.S.t||0)).toFixed(1),change:fn=>{const p=__v204.S.p;p.reel=p.reel||[];fn(p.reel,p);p.touched=Date.now();try{localStorage.setItem('v221_'+p.id,JSON.stringify(p.reel))}catch(e){}__v204.refresh()},refresh:()=>__v204.refresh()}};
function mk(id,at){const d=BY[id];return {id,n:d.n,params:Object.assign({},d.params),at:at!=null?at:undefined}}

// ---------- injection: the editors rebuild their panels from scratch, so the card is appended after every render
function inject(){try{
 if(window.__v129&&__v129.E&&__v129.E.p&&typeof APP!=='undefined'&&APP.view==='veditor'){const panel=document.querySelector('#v129 .v129panel');if(panel&&!panel.querySelector('[data-v221card]')){const p=__v129.E.p,tab=__v129.E.tab,list=H.v129.list(p),t=H.v129.t();
   if(tab==='fx'){const pro=panel.querySelector('[data-v129="pro"]');const html=card({host:'v129',list,t,mode:'full'});if(pro&&pro.closest('.v129card'))pro.closest('.v129card').insertAdjacentHTML('beforebegin',html);else panel.insertAdjacentHTML('beforeend',html)}
   else if(tab==='anim'){const first=panel.querySelector('.v129card');const html=card({host:'v129',list,t,mode:'cursor'});if(first)first.insertAdjacentHTML('afterend',html);else panel.insertAdjacentHTML('beforeend',html)}
   else if(tab==='style'){const first=panel.querySelector('.v129card');const html=card({host:'v129',list,t,mode:'packs'});if(first)first.insertAdjacentHTML('afterend',html);else panel.insertAdjacentHTML('beforeend',html)}}}
 if(window.__v204&&__v204.S&&__v204.S.p&&typeof APP!=='undefined'&&APP.view==='vstudio'&&__v204.S.ltab==='fx'){const pan=document.querySelector('.v205lp');if(pan&&!pan.querySelector('[data-v221card]')){const p=__v204.S.p;pan.insertAdjacentHTML('beforeend',card({host:'v204',list:H.v204.list(p),t:H.v204.t(),mode:'full'}))}}
}catch(e){console.warn('v221',e)}}
let obs=null;function watch(){const host=document.getElementById('appviews');if(!host||obs)return;obs=new MutationObserver(()=>{clearTimeout(watch.t);watch.t=setTimeout(inject,0)});obs.observe(host,{childList:true,subtree:true});inject()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watch);else watch();
setTimeout(watch,1500);

// ---------- actions
document.addEventListener('click',async e=>{const b=e.target.closest('[data-v221]');if(!b)return;const cardEl=b.closest('[data-v221card]');const host=cardEl&&cardEl.dataset.v221card;const h=H[host];if(!h||!h.get())return;const a=b.dataset.v221,p=h.get(),list=h.list(p);
 if(a==='add'){const id=b.dataset.id;const i=list.findIndex(f=>f.id===id);const onCursor=host==='v204'||(__v129.E.tab==='anim');h.change(L=>{if(i>=0&&!onCursor)L.splice(i,1);else L.push(mk(id,onCursor?h.t():undefined))});if(onCursor||i<0)toastS(BY[id].name+(onCursor?' נוסף בשנייה '+fmtT(h.t()):' נוסף. כתבו על איזו מילה הוא נוחת'))}
 else if(a==='pack'){const pk=PACKS.find(x=>x[0]===b.dataset.id);h.change(L=>{L.length=0;pk[3].forEach(id=>L.push(mk(id)))});toastS('נבחרה חבילה "'+pk[1]+'": '+pk[3].length+' אפקטים')}
 else if(a==='del')h.change(L=>{L.splice(+b.dataset.i,1)});
 else if(a==='here')h.change(L=>{const f=L[+b.dataset.i];if(f){f.at=h.t();f.word=''}});
 else if(a==='clear'){if(confirm('להסיר את כל אפקטי הריל מהסרטון הזה?'))h.change(L=>{L.length=0})}
 else if(a==='copy1')copy(promptFor(list[+b.dataset.i]));
 else if(a==='copyall')copy(fullPrompt(list));
 else if(a==='plan'){const dur=host==='v204'?(p.meta&&p.meta.dur)||0:Math.max(0,(p.out||0)-(p.in||0))||p.dur||0;download('plan.json',JSON.stringify(planOf(list,{duration:+(+dur).toFixed(2)||undefined,fps:30}),null,2));toastS('plan.json ירד. בפרויקט video/my-reel: node build.mjs plan.json')}
 else if(a==='pro'&&host==='v204'){const V=window.__vid;if(!V||!V.VD||!V.VD.db){toastS('השליחה לעורך זמינה כשהדף פתוח ב-claude.ai עם הרשאת עריכה');return}const url=p.src&&p.src.url;if(!url){toastS('הסרטון הזה נמצא רק במכשיר הזה. ייצאו אותו לספרייה, פתחו אותו משם ושלחו שוב');return}
  b.disabled=true;try{const d=await V.queueDoc({id:'v'+Date.now().toString(36),name:p.name,srcUrl:url,srcId:(String(url).match(/_blob\/([0-9a-f]{32})/)||[])[1]||null,source:'studio',status:'plan_requested',phase:'plan',reel:planOf(list),reelPrompt:fullPrompt(list),requested:new Date().toISOString()});await V.editVideo(Object.assign({__direct:1},d));toastS('נשלח לעורך המקצועי עם '+list.length+' אפקטי ריל. התוכנית תחכה לאישור שלך')}catch(x){toastS('השליחה נכשלה: '+(x&&x.message||x))}b.disabled=false}
},true);
document.addEventListener('change',e=>{const el=e.target.closest('[data-v221f]');if(!el)return;const cardEl=el.closest('[data-v221card]');const h=H[cardEl&&cardEl.dataset.v221card];if(!h||!h.get())return;const i=+el.dataset.v221f,k=el.dataset.k,v=el.value;
 h.change(L=>{const f=L[i];if(!f)return;if(k==='word'){f.word=v.trim();if(f.word)delete f.at}else if(k==='at'){f.at=v===''?undefined:+v;if(f.at!=null)f.word=''}else{f.params=f.params||{};f.params[k]=v}})},true);

// ---------- the plan rides along when the plan editor sends the video to the cloud editor
function hook(){const V=window.__vid;if(!V||V.__v221)return;V.__v221=1;const o=V.editVideo;V.editVideo=async function(d){try{const p=d&&d.source==='editor'&&H.v129.get();const list=p&&p.reel;if(list&&list.length&&!d.reel){d.reel=planOf(list,{duration:+(Math.max(0,(p.out||0)-(p.in||0))||p.dur||0).toFixed(2)||undefined,fps:30});d.reelPrompt=fullPrompt(list);if(V.VD&&V.VD.db&&d.id)try{await V.VD.db.collection('videos').doc(d.id).update({reel:d.reel,reelPrompt:d.reelPrompt})}catch(e){}}}catch(e){}return o.apply(this,arguments)}}
hook();setTimeout(hook,2000);
window.__v221={CAT,PACKS,promptFor,fullPrompt,planOf,norm,inject,RULES};
})();
/*V221:END*/
