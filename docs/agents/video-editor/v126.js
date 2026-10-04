// ================= V126 · professional edit steps in the video room (kurkoos-video-pro skill, video/engine/pro.py):
//                   cut silences and repeated takes, 9:16 face tracking, brand colour with skin protection, Hebrew
//                   captions (white pill or kinetic) with an accent colour, loudness at -14 LUFS, and "show me a plan
//                   before rendering". The choice is saved and travels with every video sent to the editor =================
(function(){
const KEY='vid_pro';const DEF={cut:true,reframe:true,grade:'off',captions:'pill',accent:'#a90b0c',loudness:true,review:true};
function get(){try{return Object.assign({},DEF,JSON.parse(localStorage.getItem(KEY)||'{}'))}catch(e){return Object.assign({},DEF)}}
function set(p){try{localStorage.setItem(KEY,JSON.stringify(p))}catch(e){}}
function steps(p){return ['cut','reframe',p.grade!=='off'&&'grade',p.captions!=='off'&&'captions',p.loudness&&'loudness'].filter(Boolean).filter(s=>s!=='cut'||p.cut).filter(s=>s!=='reframe'||p.reframe)}
const ACC=[['#a90b0c','אדום קורקוס'],['#105572','טורקיז'],['#ffd47a','זהב'],['#ffffff','לבן']];
function html(){const p=get();const ck=(k,l,sub)=>`<label class="v126ck"><input type="checkbox" data-v126="${k}" ${p[k]?'checked':''}><span><b>${l}</b><small>${sub}</small></span></label>`;
 const seg=(k,opts)=>`<span class="v126seg" role="group">${opts.map(([v,l])=>`<button type="button" data-v126="${k}" data-val="${v}" aria-pressed="${p[k]===v}">${l}</button>`).join('')}</span>`;
 return `<section class="v126" id="v126"><div class="v126h"><h3>שלבי עריכה מקצועית</h3><p>כל סרטון שנשלח לעורך עובר את השלבים שמסומנים כאן, בסדר הזה. הסדר והכללים לקוחים מהמדריך: כל שלב מראה תוכנית או תצוגה לפני רינדור.</p></div>
 <div class="v126g">
  ${ck('cut','חיתוך שתיקות ו"אה"','כל שתיקה, "אה" ו"אמ", מילה שנתקעה וטייק כפול. בכל חיבור נשאר שקט של 0.1 שנייה')}
  ${ck('reframe','9:16 עם הפנים בפריים','מעקב פנים, אזור מת של 8%, תנועה רכה וקפיצה בחיתוך חד')}
  <div class="v126row"><span class="v126l"><b>צבע מותג</b><small>נטייה לטורקיז, העור נשאר טבעי</small></span>${seg('grade',[['off','בלי'],['soft','עדין'],['mid','בינוני'],['strong','חזק']])}</div>
  <div class="v126row"><span class="v126l"><b>כתוביות</b><small>כל מילה כמו שנאמרה, כולל פיסוק</small></span>${seg('captions',[['off','בלי'],['pill','גלולה לבנה'],['kinetic','קינטיות']])}</div>
  <div class="v126row"><span class="v126l"><b>צבע הדגשה</b><small>מספרים, שמות ומילות דחיפות</small></span><span class="v126sw">${ACC.map(([c,n])=>`<button type="button" data-v126="accent" data-val="${c}" aria-pressed="${p.accent===c}" title="${n}" aria-label="${n}" style="--c:${c}"></button>`).join('')}</span></div>
  ${ck('loudness','עוצמה אחידה, <bdi dir="ltr">-14 LUFS</bdi>','שני מעברים, שיא עד <bdi dir="ltr">-1</bdi>, אפקטים בלי בס ומוזיקה מתחת לדיבור')}
  ${ck('review','להראות לי לפני רינדור','טבלת חיתוכים, רשימת כתוביות, גיליון פריימים ושלוש עוצמות צבע לאישור')}
 </div><p class="v126f">השלבים: <b>${steps(p).map(s=>({cut:'חיתוך',reframe:'9:16',grade:'צבע',captions:'כתוביות',loudness:'עוצמה'})[s]).join(' ← ')||'בלי שלבים'}</b>. החלפת משפט בהקלטה חדשה ואפקטים לפי מה שנאמר נעשים בשיחה עם Claude, עם הסקיל kurkoos-video-pro.</p></section>`}
function place(){const top=document.querySelector('.v100top');if(!top)return;let s=document.getElementById('v126');if(s&&s.previousElementSibling===top)return;if(s)s.remove();top.insertAdjacentHTML('afterend',html())}
function refresh(){const s=document.getElementById('v126');if(s){s.outerHTML=html()}}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('#v126 button[data-v126]');if(!b)return;e.preventDefault();const p=get();p[b.dataset.v126]=b.dataset.val;set(p);refresh()},true);
document.addEventListener('change',e=>{const i=e.target;if(!i||!i.matches||!i.matches('#v126 input[data-v126]'))return;const p=get();p[i.dataset.v126]=i.checked;set(p);refresh()},true);
// every queued video carries the steps
const wrap=()=>{const V=window.__vid;if(!V||V.__v126)return;const q=V.queueDoc;V.queueDoc=function(doc){const p=get();return q.call(this,Object.assign({},doc,{pro:Object.assign({steps:steps(p)},p)}))};V.__v126=1};
wrap();setTimeout(wrap,1500);
new MutationObserver(()=>{try{place();wrap()}catch(e){}}).observe(document.body,{childList:true,subtree:true});
window.__v126={get,steps};
})();
