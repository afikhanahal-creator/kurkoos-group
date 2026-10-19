/*V199:START*/
// ================= V199 · quick AI rewrite of a competitor's ad or post into our own words. One button in the ad viewer
// ("שכתוב AI") opens a small window: Claude rewrites the text for our brand in a few seconds (text only, the fast model),
// the result is editable, and it is copied with one tap or saved as a draft in the ideas list. The full design clone
// ("שכפל למותג שלנו") stays as it is. Nothing is published.
(()=>{
if(window.__v199)return;window.__v199=1;
const E=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const V=()=>window.__v181||null,W=()=>window.__v179||null;
const toastSafe=m=>{try{toast(m)}catch(e){}};
const R={id:null,brand:'kurkoos',goal:'leads',st:'form',out:null,err:'',detail:''};
const brandName=b=>{try{return W().brandOf(b).name}catch(e){return b==='afik'?'אפיק הנחל':'קבוצת קורקוס'}};
function srcText(p){const v=V();if(!p)return '';const shot=v&&v.isShot(p);return String(shot?[p.ad_title,p.note].filter(Boolean).join('\n'):(p.text||'')).trim()}
async function sampleNS(){let s=null;try{s=window.claude&&window.claude.use?await window.claude.use('sample'):null}catch(e){}if(!s&&typeof KC!=='undefined'&&KC.sample)s=KC.sample;if(!s){const e=new Error('no');e.code='not_granted';throw e}return s}
function promptFor(p){const B=(()=>{try{return W().brandOf(R.brand)}catch(e){return {name:brandName(R.brand),facts:'',rules:''}}})();
 const txt=srcText(p);const v=V();const name=(()=>{try{return v.shortName(p)}catch(e){return ''}})();
 const goal=R.goal==='leads'?'להביא פניות של לקוחות':R.goal==='brand'?'שיזכרו את השם שלנו ומה אנחנו עושים':'לקדם פרויקט שלנו';
 return `אתה קופירייטר של "${B.name}". קיבלת טקסט של פוסט או מודעה של מתחרה (${name}). כתוב גרסה מקורית שלנו, באותו רעיון ובאותו מבנה, בעברית טבעית וקצרה.
המטרה: ${goal}.
אסור: להעתיק משפטים או ביטויים שלהם, להזכיר אותם, להמציא מספרים, מחירים, כתובות, שמות, פרויקטים או הבטחות. להשתמש במקפים או בקווים ארוכים כסימני פיסוק. רק עובדות מהרשימה.
עובדות מותרות על המותג:
${B.facts||''}
${B.rules||''}
הטקסט שלהם:
${txt||'(אין טקסט, רק תמונה. כתוב פוסט כללי באותו נושא לפי העובדות שלנו)'}
החזר JSON בלבד: {"headline":"כותרת עד 8 מילים","body":"גוף הפוסט, 40 עד 120 מילים, שורות קצרות","cta":"קריאה לפעולה עד 5 מילים","hashtags":["עד 4"]}`}
const clean=x=>String(x||'').replace(/\s[—–-]\s/g,', ').replace(/[—–]/g,', ').trim();
function fullText(o){if(!o)return '';const tags=(Array.isArray(o.hashtags)?o.hashtags:[]).map(t=>'#'+String(t).replace(/^#/,'').replace(/\s+/g,'_')).join(' ');return [clean(o.headline),clean(o.body),clean(o.cta),tags].filter(Boolean).join('\n\n')}
function html(){const v=V();const p=v&&v.getItem(R.id);const txt=srcText(p);
 const top=`<header class="v199h"><b>שכתוב AI למלל שלנו</b><button type="button" class="v199x" data-v199="close" aria-label="סגירה">✕</button></header>`;
 const src=`<div class="v199src"><span>הטקסט שלהם</span><p dir="auto">${txt?E(txt.slice(0,400))+(txt.length>400?'…':''):'<i>אין טקסט במודעה. Claude יכתוב פוסט באותו נושא לפי העובדות שלנו.</i>'}</p></div>`;
 const opts=`<div class="v199opts"><div class="v199seg" role="group" aria-label="מותג">${[['kurkoos','קבוצת קורקוס'],['afik','אפיק הנחל']].map(([k,l])=>`<button type="button" data-v199="brand" data-v="${k}" aria-pressed="${R.brand===k}" class="${R.brand===k?'on':''}">${l}</button>`).join('')}</div><div class="v199seg" role="group" aria-label="מטרה">${[['leads','לידים'],['brand','מודעות'],['project','פרויקט']].map(([k,l])=>`<button type="button" data-v199="goal" data-v="${k}" aria-pressed="${R.goal===k}" class="${R.goal===k?'on':''}">${l}</button>`).join('')}</div></div>`;
 if(R.st==='busy')return top+src+`<div class="v199busy" role="status"><span class="v199spin" aria-hidden="true"></span>Claude כותב את הגרסה שלנו…</div>`;
 if(R.st==='err')return top+src+opts+`<div class="v199err" role="alert"><b>${E(R.err)}</b>${R.detail?`<small dir="auto">הסיבה: ${E(R.detail)}</small>`:''}</div><footer class="v199f"><button type="button" class="v199b pri" data-v199="go">נסו שוב</button></footer>`;
 if(R.st==='done')return top+src+`<label class="v199lbl" for="v199out">הגרסה שלנו (אפשר לערוך)</label><textarea id="v199out" class="v199out" dir="rtl" rows="10">${E(fullText(R.out))}</textarea>
  <footer class="v199f"><button type="button" class="v199b pri" data-v199="copy">העתקה</button><button type="button" class="v199b" data-v199="save">שמירה כטיוטה</button><button type="button" class="v199b" data-v199="go">גרסה נוספת</button></footer><p class="v199help">שום דבר לא מתפרסם לבד. העיצוב המלא עם התמונות שלנו נמצא ב"שכפל למותג שלנו".</p>`;
 return top+src+opts+`<footer class="v199f"><button type="button" class="v199b pri big" data-v199="go">שכתוב עם AI</button></footer>`}
function render(){const m=document.getElementById('v199');if(!m)return;m.querySelector('.v199box').innerHTML=html();const f=m.querySelector('.v199out')||m.querySelector('.v199b.pri');f&&f.focus()}
function open(id){R.id=id;R.st='form';R.out=null;R.err='';R.detail='';try{R.brand=JSON.parse(localStorage.getItem('v179_brand')||'"kurkoos"')}catch(e){}
 let m=document.getElementById('v199');if(!m){m=document.createElement('div');m.id='v199';m.className='v199ov';m.setAttribute('role','dialog');m.setAttribute('aria-modal','true');m.setAttribute('aria-label','שכתוב AI');m.innerHTML='<div class="v199bg" data-v199="close"></div><div class="v199box"></div>';document.body.appendChild(m)}
 R.back=document.activeElement;m.hidden=false;render()}
function close(){const m=document.getElementById('v199');if(m)m.hidden=true;try{R.back&&R.back.focus&&R.back.focus()}catch(e){}}
async function go(){const v=V();const p=v&&v.getItem(R.id);if(!p)return;R.st='busy';render();
 try{const s=await sampleNS();const o=await s.json(promptFor(p),{cache:false,modelTier:'quick'});if(!o||typeof o!=='object'||!(o.body||o.headline))throw new Error('התשובה הגיעה ריקה');R.out=o;R.st='done';render()}
 catch(e){R.st='err';R.detail=String((e&&e.message)||'').slice(0,160);R.err=e&&e.code==='not_granted'?'Claude זמין כשמחוברים לניהול האתר':e&&e.code==='rate_limited'?'יותר מדי בקשות, נסו בעוד דקה':'השכתוב לא הצליח';render()}}
async function copy(){const t=(document.getElementById('v199out')||{}).value||fullText(R.out);try{await navigator.clipboard.writeText(t);toastSafe('הטקסט הועתק')}catch(e){const a=document.getElementById('v199out');if(a){a.select();try{document.execCommand('copy');toastSafe('הטקסט הועתק')}catch(x){toastSafe('לא הצלחתי להעתיק. סמנו והעתיקו ידנית')}}}}
function save(){const t=(document.getElementById('v199out')||{}).value||fullText(R.out);const v=V();const p=v&&v.getItem(R.id);
 // a draft like the full clone makes, so it shows in "רעיונות וטיוטות" and opens in the design editor
 try{const o=R.out||{};const parts=t.split(/\n\s*\n/);const res={analysis:{},design:{layout:'statement',mood:'calm',note:''},post:{headline:clean(parts[0]||o.headline),sub:'',items:[],cta:clean(o.cta||''),fb:parts.slice(1).join('\n\n')||clean(o.body)}};
  const d=v.makePost(p,res,{brand:R.brand,goal:R.goal,project:'',note:''});if(typeof AG!=='undefined'&&Array.isArray(AG.posts)){AG.posts.unshift(d);if(typeof saveAgent==='function')saveAgent();toastSafe('נשמר כטיוטה ברעיונות וטיוטות');return}}catch(e){console.warn('v199 save',e)}
 try{navigator.clipboard&&navigator.clipboard.writeText(t);toastSafe('לא הצלחתי לשמור כטיוטה, אבל הטקסט הועתק')}catch(e){toastSafe('לא הצלחתי לשמור')}}
document.addEventListener('click',e=>{const b=e.target.closest('[data-v199]');if(!b)return;const a=b.dataset.v199;
 if(a==='open'){e.preventDefault();e.stopPropagation();open(b.dataset.id);return}
 if(a==='close'){close();return}if(a==='brand'){R.brand=b.dataset.v;render();return}if(a==='goal'){R.goal=b.dataset.v;render();return}
 if(a==='go'){go();return}if(a==='copy'){copy();return}if(a==='save'){save();return}},true);
document.addEventListener('keydown',e=>{const m=document.getElementById('v199');if(!m||m.hidden)return;if(e.key==='Escape'){e.stopPropagation();close()}
 if(e.key==='Tab'){const f=[...m.querySelectorAll('button,textarea')].filter(x=>!x.disabled&&x.offsetParent);if(!f.length)return;const a=f[0],z=f[f.length-1];if(e.shiftKey&&document.activeElement===a){e.preventDefault();z.focus()}else if(!e.shiftKey&&document.activeElement===z){e.preventDefault();a.focus()}}},true);
// the button: next to "שכפל למותג שלנו" in the ad viewer toolbar and in the details panel
const IC='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4L18.5 9.5a2.8 2.8 0 0 0-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/></svg>';
function decorate(){document.querySelectorAll('[data-v186="clone"][data-id]').forEach(c=>{const box=c.parentElement;if(!box||box.querySelector('[data-v199="open"]'))return;
 const b=document.createElement('button');b.type='button';b.dataset.v199='open';b.dataset.id=c.dataset.id;
 if(c.classList.contains('v179b')){b.className='v179b v199open';b.innerHTML=IC+' שכתוב AI למלל שלנו'}else{b.className='v199tool';b.innerHTML=IC+'<span>שכתוב AI</span>'}
 c.insertAdjacentElement('afterend',b)})}
new MutationObserver(()=>{try{decorate()}catch(e){}}).observe(document.body,{childList:true,subtree:true});
window.__v199={open,go,promptFor,fullText,R};
})();
/*V199:END*/
