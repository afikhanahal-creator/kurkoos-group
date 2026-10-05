// ================= V95 · one button rewrites every text of a post (headline, sub line, label, call to action, Facebook and Instagram captions) with the content writer rules =================
(function(){
const FACTS=`עובדות מותרות בלבד: קבוצת קורקוס: יזמות, בנייה וביצוע, ניהול ופיקוח, תיווך. הוד השרון והמרכז. יותר מ-30 שנה. מקרקע ועד מסירת מפתח. בונים בתים פרטיים ווילות ללקוחות על המגרש שלהם. מספרי האתר: 30+ שנות ניסיון, 98% שביעות רצון לקוחות, 100% מסירה בזמן, 80+ פרויקטים בוטיק, 10 שנות אחריות.
פרויקטים: הנרייטה סאלד 22 עד 24, מערב הוד השרון: בבנייה, היתרים מאושרים, ארבע יחידות דו משפחתיות, שמונה משפחות, לכל יחידה מגרש 380 מ"ר בטאבו, כ-300 מ"ר בנוי בשלושה מפלסים, 7 חדרים, 4 חדרי רחצה, 2 מרפסות, בריכה 3×6, אדריכלות בני נדלסטיצ'ר, הדמיות חייבות את המילה "הדמיה". יורדי הים 3, גרינברג, הוד השרון: בתכנון, שתי וילות, מגרש מעל חצי דונם לכל וילה, כ-300 מ"ר בשלושה מפלסים, בריכה מאושרת 4×9, אדריכלות רמי שחר. חנקין 41, מגדיאל: בבנייה, בניין בוטיק של שש דירות, גינה פרטית כ-150 מ"ר, שתי חניות לכל דירה, אדריכלות בני נדלסטיצ'ר. בן גוריון 17, יהוד: בית דו משפחתי.`;
const MECH={auto:'בחר בעצמך מנגנון שמתאים לפוסט',question:'שאלה פתוחה שמזמינה תגובה',choice:'בחירה בין שתי אפשרויות, א או ב',word:'כתבו מילה אחת בתגובה ונחזור אליכם',save:'שמרו לפני שמתחילים',share:'שלחו למי שבונה איתכם',tag:'תייגו מי שחושב על זה',phone:'לשיחה ישירה, עם המספר 055-981-1814',article:'הפניה לכתבה המלאה בקישור',reflect:'משפט שמזמין להסכים או להתנגד'};
const MECH_HE={auto:'אוטומטי',question:'שאלה',choice:'בחירה א או ב',word:'מילה בתגובה',save:'שמרו',share:'שלחו',tag:'תייגו',phone:'טלפון',article:'קישור לכתבה',reflect:'עמדה'};
const FOOT='קבוצת קורקוס. מקרקע ועד מסירת מפתח.';
const BAN=['הכי טוב','מוביל','איכות ללא פשרות','בית החלומות','יוקרתי במיוחד','הזדמנות שלא תחזור','בלעדי','חלומות'];
function footOf(t,net){const i=String(t||'').indexOf(FOOT);if(i>=0)return String(t).slice(i);return net==='fb'?FOOT+'\n055-981-1814 · kurkoos-group.co.il\n#קבוצתקורקוס #בנייתוילות #הודהשרון':FOOT+'\n#קבוצתקורקוס #בנייתוילות #הודהשרון'}
function bodyOf(t){const i=String(t||'').indexOf(FOOT);return (i>=0?String(t).slice(0,i):String(t||'')).trim()}
function prompt(p,note,mech){const v=p.visual||{};const url=(String(p.fb||'').match(/https?:\/\/\S+/)||[''])[0];
  return `אתה כותב תוכן בכיר לרשתות חברתיות של קבוצת קורקוס. כתוב מחדש את כל הטקסטים של הפוסט שלפניך כך שיעצרו גלילה ויזמינו מעורבות. פוסט לפייסבוק ולאינסטגרם, בעברית, מימין לשמאל.

קול: עברית ישראלית טבעית, כמו מנהל עבודה מנוסה שמסביר ללקוח. משפטים קצרים. "אנחנו". חם, בטוח, קונקרטי. קהל: משפחות בהוד השרון והמרכז שרוצות לבנות בית או וילה, זהירות, רוצות להבין עלות, זמן ומי אחראי.
מה הופך פוסט לחשיפה ומעורבות: 1. השורה הראשונה היא ההוק: שאלה שהקורא באמת שואל את עצמו, פרט מפתיע מהשטח, ניגוד, או בעיה שנסגרת בהמשך. לא פתיחה כללית, לא "שלום", לא שם החברה. 2. רעיון אחד לפוסט, פרט קונקרטי אחד. 3. ערך שאפשר לקחת גם בלי לקנות: שאלה לבדוק, כלל אצבע, הבדל שכדאי להכיר. 4. סיום עם צעד אחד ברור בלבד. המנגנון לסיום: ${MECH[mech]||MECH.auto}. 5. אינסטגרם: קצר, שורה ראשונה חזקה, 3 עד 6 שורות קצרות. פייסבוק: סיפור קצר, פסקאות קצרות עם שורה ריקה ביניהן, 350 עד 700 תווים. 6. לא ללחוץ, לא להבטיח תוצאות, מחירים או זמנים, לא לתקוף מתחרים.
${FACTS}
אסור להמציא מספרים, מחירים, תאריכים, לקוחות, ציטוטים, המלצות או פרסים. השתמש רק בעובדות למעלה ובעובדות שכבר בטקסט הנוכחי. אל תשנה שם פרויקט, כתובת, אדריכל או מידה.${url?' הכתובת '+url+' חייבת להופיע כמות שהיא בגוף הפייסבוק.':''}
איסורים קשיחים: בלי מקף או קו מפריד כסימן פיסוק (- – —), גם לא בתוך מילים, במקום זה נקודה, פסיק או נקודתיים. בלי סוגריים. בלי אימוג'י ובלי סימן קריאה. בלי המילים: ${BAN.join(', ')}. בלי שורת חתימה, בלי האשטגים ובלי הטלפון בגופים, הם נוספים אוטומטית.
${note?'הנחיה מהלקוח לכתיבה הזו: '+String(note).slice(0,300)+'\n':''}
הפוסט הנוכחי: נושא: ${p.topic||''}. סדרה: ${p.series||''}. ${p.project?'פרויקט: '+p.project+'. ':''}
כותרת: ${v.headline||p.hook||''}
שורת משנה: ${v.sub||''}
תווית: ${v.eyebrow||''}
כפתור: ${v.cta||''}
${(v.items||[]).length?'פריטים בעיצוב: '+v.items.join(' | ')+'\n':''}פייסבוק: ${bodyOf(p.fb).slice(0,1500)}
אינסטגרם: ${bodyOf(p.ig).slice(0,800)}

החזר JSON בלבד, בלי טקסט לפניו או אחריו:
{"headline":"עד 7 מילים ועד 38 תווים, אפשר \\n אחד בין שתי שורות","sub":"שורת משנה עד 12 מילים","label":"תווית עד 3 מילים","cta":"עד 4 מילים, או ריק","fb_body":"גוף הפייסבוק בלי חתימה","ig_body":"גוף האינסטגרם בלי חתימה","mechanic":"question|choice|word|save|share|tag|phone|article|reflect"}`}
const hasEmoji=s=>/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(s);
function clean(s){return String(s||'').replace(/[–—]/g,', ').replace(/(^|\s)-(\s|$)/g,'$1, $2').replace(/([א-ת])-([א-ת])/g,'$1 $2').replace(/!+/g,'.').replace(/[\[\]()]/g,'').replace(/\s+,/g,',').replace(/\.\./g,'.').trim()}
function check(r){const out=[];const pure=s=>String(s||'').replace(/https?:\/\/\S+/g,'').replace(/\d{2,3}-\d{3}-\d{4}/g,'');
  const wc=s=>String(s||'').split(/\s+/).filter(Boolean).length;
  if(!r||typeof r!=='object')return ['לא התקבלה תשובה'];
  if(!String(r.headline||'').trim())out.push('אין כותרת');
  if(wc(r.headline)>7)out.push('הכותרת ארוכה מ-7 מילים');
  if(String(r.headline||'').replace(/\n/g,' ').length>38)out.push('הכותרת ארוכה מ-38 תווים');
  if(wc(r.sub)>12)out.push('שורת המשנה ארוכה מ-12 מילים');
  ['headline','sub','label','cta','fb_body','ig_body'].forEach(k=>{const s=pure(r[k]);if(/[–—]|(^|\s)-(\s|$)/.test(s))out.push(k+': מקף');if(hasEmoji(s))out.push(k+': אימוג\'י');BAN.forEach(b=>{if(s.includes(b))out.push(k+': "'+b+'"')})});
  if(String(r.fb_body||'').length<120)out.push('גוף הפייסבוק קצר מדי');if(String(r.ig_body||'').length<30)out.push('גוף האינסטגרם קצר מדי');
  return out}
async function run(p,note,mech,only){const s=(typeof KC!=='undefined'&&KC.sample)||null;if(!s){toast('הכתיבה מחדש עובדת כשהדף פתוח ב-claude.ai ואישרתם ל-Claude לעבוד בו');return null}
  let r;try{r=await s.json(prompt(p,note,mech),{cache:false,modelTier:'default'})}catch(e){const c=e&&e.code;toast(c==='rate_limited'?'יותר מדי בקשות, נסו בעוד דקה':c==='not_granted'?'Claude לא אושר בתצוגה הזו':c==='invalid_json'?'התשובה לא הייתה תקינה, נסו שוב':'Claude לא זמין כרגע, נסו שוב');return null}
  if(!r||typeof r!=='object')return null;
  ['headline','sub','label','cta','fb_body','ig_body'].forEach(k=>{r[k]=clean(r[k])});
  r.headline=String(r.headline||'').split(/\s+/).slice(0,8).join(' ');if(r.headline.replace(/\n/g,' ').length>38&&!r.headline.includes('\n')){const w=r.headline.split(' ');const mid=Math.ceil(w.length/2);r.headline=w.slice(0,mid).join(' ')+'\n'+w.slice(mid).join(' ')}
  const issues=check(r);
  const url=(String(p.fb||'').match(/https?:\/\/\S+/)||[''])[0];if(url&&!r.fb_body.includes(url))r.fb_body=r.fb_body.replace(/\s+$/,'')+'\n\nלכתבה המלאה: '+url;
  // apply with a version to go back to
  try{pxVersion(p,'לפני: כתיבה מחדש')}catch(e){}
  const before=JSON.parse(JSON.stringify({visual:p.visual,fb:p.fb,ig:p.ig,hook:p.hook,mechanic:p.mechanic}));
  p.visual=p.visual||{};
  if(!only||only==='all'){p.visual.headline=r.headline;p.hook=r.headline.replace(/\n/g,' ');p.visual.sub=r.sub;if(r.label)p.visual.eyebrow=r.label;p.visual.cta=r.cta||''}
  p.fb=r.fb_body.trim()+'\n\n'+footOf(before.fb,'fb');p.ig=r.ig_body.trim()+'\n\n'+footOf(before.ig,'ig');
  if(MECH[r.mechanic])p.mechanic=MECH_HE[r.mechanic];p.upd=new Date().toISOString();p.copyv=95;
  try{TC.clear()}catch(e){}try{PRO._fc=null}catch(e){}try{window.__pxqClear&&window.__pxqClear()}catch(e){}
  return {issues,before}}
window.__v95run=run;
// ---- editor: the button at the top of the text tab ----
const S={note:'',mech:'auto',busy:false,issues:[]};
function box(){return `<div class="pe-sec v95" id="v95"><div class="pe-l">כתיבה מחדש עם Claude<small>כותב מחדש את הכותרת, שורת המשנה, התווית, הכפתור והכיתובים לפייסבוק ולאינסטגרם לפי כללי הכתיבה של המותג. הגרסה הקודמת נשמרת.</small></div>
   <input type="text" data-v95="note" value="${peEsc(S.note)}" maxlength="300" placeholder="הנחיה (לא חובה): למשל קצר יותר, או לפתוח בשאלה" aria-label="הנחיה לכתיבה מחדש">
   <div class="v95row"><select data-v95="mech" aria-label="סיום הפוסט">${Object.keys(MECH).map(k=>`<option value="${k}"${S.mech===k?' selected':''}>${k==='auto'?'סיום: אוטומטי':'סיום: '+MECH_HE[k]}</option>`).join('')}</select>
   <button type="button" class="px-btn pri" data-v95="all"${S.busy?' disabled':''}>${S.busy?'Claude כותב…':'כתוב מחדש הכל'}</button><button type="button" class="px-btn" data-v95="caps"${S.busy?' disabled':''}>רק כיתובים</button></div>
   ${S.issues.length?`<p class="v95w">לבדיקה: ${S.issues.map(peEsc).join(' · ')}</p>`:''}</div>`}
if(typeof peText==='function')peText=(f=>function(){const h=f.apply(this,arguments);return box()+h})(peText);
document.addEventListener('input',e=>{const t=e.target;if(!t.dataset||t.dataset.v95!=='note')return;S.note=t.value});
document.addEventListener('change',e=>{const t=e.target;if(!t.dataset||t.dataset.v95!=='mech')return;S.mech=t.value});
document.addEventListener('click',async e=>{const b=e.target.closest&&e.target.closest('[data-v95]');if(!b||b.tagName!=='BUTTON'||!PE.p||S.busy)return;e.preventDefault();e.stopPropagation();
  const only=b.dataset.v95==='caps'?'caps':'all';S.busy=true;S.issues=[];peRender();
  try{pePush()}catch(x){}
  const r=await run(PE.p,S.note,S.mech,only);S.busy=false;
  if(r){S.issues=r.issues;peRender();const o=PE.p,b0=r.before;try{undoBar&&undoBar(only==='caps'?'הכיתובים נכתבו מחדש':'כל הטקסטים נכתבו מחדש',()=>{Object.assign(o,{visual:b0.visual,fb:b0.fb,ig:b0.ig,hook:b0.hook,mechanic:b0.mechanic});try{TC.clear()}catch(x){}peRender();toast('חזרנו לטקסט הקודם')})}catch(x){toast('נכתב מחדש')}}
  else peRender()},true);
// ---- composer: the same button next to the caption ----
if(typeof renderComposer==='function')renderComposer=(f=>function(){const r=f.apply(this,arguments);try{const C=APP.cmp;const tool=document.querySelector('#cmp-root .ctool');if(tool&&C&&C.p&&!tool.querySelector('[data-v95c]'))tool.insertAdjacentHTML('beforeend',`<button class="ibtn sm" type="button" data-v95c="all">${ico('wand',15)} כתוב מחדש הכל</button>`)}catch(e){}return r})(renderComposer);
document.addEventListener('click',async e=>{const b=e.target.closest&&e.target.closest('[data-v95c]');if(!b||!APP.cmp||!APP.cmp.p)return;e.preventDefault();e.stopPropagation();const C=APP.cmp;C.busy='Claude כותב מחדש את כל הטקסטים…';renderComposer();
  const r=await run(C.p,'',S.mech,'all');C.busy='';saveAgent();renderComposer();if(r){try{undoBar&&undoBar('כל הטקסטים נכתבו מחדש',()=>{Object.assign(C.p,r.before);saveAgent();renderComposer()})}catch(x){}if(r.issues.length)toast('לבדיקה: '+r.issues.slice(0,3).join(' · '))}},true);
const css=`#pe-root .v95{background:#eef4f7;border-radius:14px;padding:12px 14px;display:grid;gap:10px}
#pe-root .v95 input[type=text]{width:100%;box-sizing:border-box}
#pe-root .v95row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}#pe-root .v95row select{font:inherit;font-size:14px;min-height:44px;border:1px solid #cfd8de;border-radius:12px;padding:0 10px;background:#fff;color:#07293a;flex:1 1 150px}
#pe-root .v95row .px-btn{min-height:44px}#pe-root .v95row .px-btn.pri{flex:1 1 160px;justify-content:center}
#pe-root .v95w{margin:0;font-size:12.5px;color:#8a0a0b;line-height:1.5}`;
const st=document.createElement('style');st.id='k95css';st.textContent=css;document.head.appendChild(st);
})();

