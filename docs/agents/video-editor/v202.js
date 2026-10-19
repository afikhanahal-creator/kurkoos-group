/*V202:START*/
// ================= V202 · clone studio: a precise clone of a post or an ad we like, in the Kurkoos brand.
// The template approach of V201 fitted every inspiration into the same few boxes, so the results looked alike and generic.
// Here Claude looks at the inspiration and our photos and writes a complete design as SVG code: the same layout, proportions,
// type hierarchy and decorative elements (lines, glows, frames, bands, gradients), with our photo, our palette, Almoni and our
// logos, and only our facts. The design is drawn, then shown to Claude again beside the inspiration to find what differs, and
// corrected. The result sits large beside the source; its texts can be edited, it can be corrected again with a note, saved to
// the library as a post (a flat 1080×1350 image with its caption) or downloaded at 2x. Entry points: "שכפול מדויק" in the
// competitor viewer, and the inspiration panel of the agent tab. Nothing is published. =================
(()=>{
if(window.__v202)return;window.__v202=1;
const E=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const $=id=>document.getElementById(id);
const W=1080,H=1350;
const LOGOS=__LOGOS__;
const toastS=m=>{try{toast(m)}catch(e){}};
const PROJS=[['hankin','חנקין 41',/חנקין|hankin/i,'hw','hn'],['henrietta','הנרייטה סאלד 22-24',/סאלד|הנרייטה|henriet|szold/i],['yordei','יורדי הים 3',/יורדי הים|yordei/i],['bengurion','בן גוריון 17',/בן גוריון|ben.?gurion/i],['general','קבוצת קורקוס (כללי)',null]];
const ST={open:false,ins:null,project:'hankin',photos:[],note:'',busy:'',err:'',res:[],cur:-1,auto:true,extra:[]};
try{const s=JSON.parse(localStorage.getItem('v202')||'{}');if(s.project)ST.project=s.project;if(s.auto===false)ST.auto=false}catch(e){}
const keep=()=>{try{localStorage.setItem('v202',JSON.stringify({project:ST.project,auto:ST.auto}))}catch(e){}};
const IB=()=>(window.__v48&&window.__v48.IB)||{items:[]};

// ---------- images: anything we have becomes a Blob (for Claude) and a data URL (for the drawing) ----------
const imgFrom=src=>new Promise(r=>{const i=new Image();i.crossOrigin='anonymous';i.decoding='async';i.onload=()=>r(i);i.onerror=()=>r(null);i.src=src});
async function jpegOf(im,max,q){const s=Math.min(1,max/Math.max(im.naturalWidth||im.width,im.naturalHeight||im.height));const c=document.createElement('canvas');c.width=Math.max(1,Math.round((im.naturalWidth||im.width)*s));c.height=Math.max(1,Math.round((im.naturalHeight||im.height)*s));c.getContext('2d').drawImage(im,0,0,c.width,c.height);
  const url=c.toDataURL('image/jpeg',q||.88);const blob=await new Promise(r=>c.toBlob(r,'image/jpeg',q||.88));return {url,blob,w:c.width,h:c.height}}
async function photoOf(p){if(p._j)return p._j;let im=null;if(p.k&&typeof libImg==='function')try{im=await libImg(p.k)}catch(e){}if(!im&&p.src)im=await imgFrom(p.src);if(!im)return null;try{p._j=await jpegOf(im,1600,.88)}catch(e){return null}return p._j}
async function insOf(){const i=ST.ins;if(!i)return null;if(i._j)return i._j;let im=null;if(i.blob){const u=URL.createObjectURL(i.blob);im=await imgFrom(u)}if(!im&&i.k&&typeof libImg==='function')try{im=await libImg(i.k)}catch(e){}if(!im&&i.src){im=await imgFrom(i.src);if(!im)try{const b=await (await fetch(i.src,{mode:'cors'})).blob();im=await imgFrom(URL.createObjectURL(b))}catch(e){}}
  if(!im)return null;try{i._j=await jpegOf(im,1400,.9)}catch(e){return null}return i._j}

// ---------- our photos for the chosen project: today's materials, and photos in the library named for the project ----------
function candidates(){const out=[],seen=new Set();const add=(k,src,name,tag)=>{if(!src||seen.has(k||src))return;seen.add(k||src);out.push({k,src,name:String(name||'').slice(0,40),tag})};
  ST.extra.forEach(x=>add(x.k,x.src,x.name,'הועלה עכשיו'));
  IB().items.filter(x=>x.kind==='image'&&x.use!=='inspo').forEach(x=>add(x.k,x.thumb,x.name,'מהחומרים'));
  const pr=PROJS.find(p=>p[0]===ST.project);if(pr&&pr[2]&&typeof PHOTO_LIB!=='undefined'){const names=typeof LIB_NAMES!=='undefined'?LIB_NAMES:{};const up=(typeof KC!=='undefined'&&KC.up)||{};
    Object.keys(PHOTO_LIB).forEach(k=>{const m=k.startsWith('u_')?up[k.slice(2)]:null;const txt=[names[k],m&&m.project,m&&m.name,m&&m.tags].filter(Boolean).join(' ');if(pr[2].test(txt))add(k,PHOTO_LIB[k],names[k]||(m&&m.name)||k,'מהספרייה')})}
  return out.slice(0,40)}

// ---------- brand facts and the instructions ----------
function facts(){let f='',r='';try{const B=window.__v179&&__v179.brandOf('kurkoos');if(B){f=B.facts;r=B.rules}}catch(e){}return {f:f||'קבוצת קורקוס: יזמות, בנייה וביצוע, ניהול ופיקוח, תיווך. הוד השרון והמרכז. מקרקע ועד מסירת מפתח. אתר kurkoos-group.co.il.',r}}
function logoLines(){const pr=PROJS.find(p=>p[0]===ST.project)||[];const L=[`{{LOGO_KURKOOS_WHITE}} לוגו קבוצת קורקוס אופקי בלבן, יחס ${LOGOS.kw.w}:${LOGOS.kw.h}`,`{{LOGO_KURKOOS_NAVY}} אותו לוגו בכחול לילה`];
  if(pr[3])L.push(`{{LOGO_PROJECT_WHITE}} לוגו הפרויקט ${pr[1]} בלבן, יחס ${LOGOS[pr[3]].w}:${LOGOS[pr[3]].h}`,`{{LOGO_PROJECT_NAVY}} לוגו הפרויקט בכחול לילה`);return L.join('\n')}
function genPrompt(n){const pr=PROJS.find(p=>p[0]===ST.project)||PROJS[4];const F=facts();
return `אתה מעצב גרפי בכיר של "קבוצת קורקוס". מצורפות ${1+n} תמונות. תמונה 1 היא ההשראה: פוסט או מודעה של גוף אחר שהעיצוב שלהם מצא חן בעינינו. ${n?`תמונות 2 עד ${1+n} הן התמונות שלנו לפרויקט "${pr[1]}".`:''}
המשימה: לשכפל את העיצוב של ההשראה כמה שיותר מדויק, אבל כולו של קבוצת קורקוס. כלומר אותו מבנה בדיוק: אותם אזורים, אותם יחסים וגדלים, אותה היררכיה של טקסט (גודל, משקל, מיקום, יישור, מספר שורות), אותם אלמנטים גרפיים (קווים, קווי ניאון זוהרים, מסגרות, רצועות, תגיות, מפרידים, הדרגות, צללים, שכבות כהות על התמונה), אותה אווירה ואותה תאורה. ההבדלים היחידים:
1. הצבעים שלנו במקום הצבעים שלהם: כחול לילה #07293a, טורקיז #105572, תכלת #8fb6c8, תכלת בהיר #dbe8ee, לבן #ffffff, נייר #f7f8fa, אדום קורקוס #a90b0c להדגשה קטנה בלבד. צבע זהב או צבע הדגשה חם של ההשראה הופך לתכלת זוהר או ללבן. רקע כחול רויאל הופך לכחול לילה וטורקיז.
2. הפונט Almoni בלבד (משקלים 400 ו-700), עברית מימין לשמאל.
3. התמונה שלנו במקום התמונה שלהם, במיקום ובגודל של התמונה בהשראה. אפשר להכהות או להאיר אותה ולהוסיף הדרגה כדי לקבל את האווירה של ההשראה. אם בהשראה יש קווי ניאון שמקיפים את הבניינים, צייר קווים כאלה סביב הבניין שבתמונה שלנו (אתה רואה אותה).
4. הלוגו שלנו במקום הלוגו שלהם, באותו מקום ובאותו גודל יחסי.
5. הטקסטים שלנו: אותו תפקיד ואותו אורך בערך לכל בלוק טקסט, אבל מילים שלנו בלבד מהעובדות למטה. אסור להעתיק מילים, משפטים, סלוגן או רעיון מילולי מההשראה. אסור להמציא מספרים, מחירים, תאריכים, כתובות, מבצעים או הבטחות. בלי מקפים או קווים מפרידים כסימן פיסוק בטקסט. בלי שמות של אנשים.
${ST.note?'הנחיה מהמנהל: '+ST.note+'\n':''}העובדות המותרות:
${F.f}
${F.r}
הפרויקט של הפוסט: ${pr[1]}.
טכני:
- החזר קוד SVG אחד בלבד, בלי הסברים: <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1080" height="1350" viewBox="0 0 1080 1350">. אם ההשראה ריבועית או צרה יותר, התאם את הקומפוזיציה ל-4:5 בלי לאבד את המבנה.
- תמונות שלנו: <image href="{{PHOTO1}}" x y width height preserveAspectRatio="xMidYMid slice"/> (PHOTO2 וכן הלאה אם צורפו). חיתוך עם clipPath, הכהיה עם rect שקוף למחצה או linearGradient, מעבר רך לרקע עם mask.
- לוגואים (תמונות PNG שקופות):
${logoLines()}
- טקסט: <text font-family="Almoni" font-weight="700" font-size="..." fill="..." direction="rtl" text-anchor="middle|end|start" data-maxw="רוחב מקסימלי בפיקסלים">. כל שורה היא text נפרד (אין שבירת שורות אוטומטית). x של text-anchor="end" הוא הקצה הימני. data-maxw חובה בכל text.
- זוהר: filter עם feGaussianBlur ו-feMerge. אסור script, אסור foreignObject, אסור קישור חיצוני כלשהו (רק הסימונים {{...}} שלמעלה).
- בפינה התחתונה, אם יש בהשראה פס תחתון או מקום מתאים, הוסף את kurkoos-group.co.il או את הלוגו של קורקוס בקטן.`}
function fixPrompt(svg){return `לפניך שתי תמונות. תמונה 1 היא ההשראה. תמונה 2 היא השכפול שעשית לקבוצת קורקוס, כפי שהוא נראה אחרי הציור. וזה קוד ה-SVG שלו:
${svg}
השווה אותם כמו ארט דירקטור: מבנה, מיקומים, גדלים יחסיים, משקל הטקסטים, צפיפות, האלמנטים הגרפיים (קווים, זוהר, מסגרות, רצועות), האווירה והתאורה. תקן כל מה שרחוק מההשראה, וגם כל טקסט שיוצא מהמסגרת, נחתך, חופף לטקסט אחר או לא קריא.${ST.note?' הנחיה מהמנהל: '+ST.note+'.':''}
שמור על כל הכללים: הצבעים, הפונט והלוגואים של קורקוס, רק העובדות שלנו, בלי מילים מההשראה, בלי מקפים כסימן פיסוק.
החזר רק את קוד ה-SVG המתוקן המלא.`}
async function sampler(){let s=null;try{s=(window.claude&&window.claude.use)?await window.claude.use('sample').catch(()=>null):null}catch(e){}if(!s&&typeof KC!=='undefined'&&KC.sample)s=KC.sample;return s}
async function ask(text,images,kind){if(window.__v202mock)return await window.__v202mock(kind,text,images);const s=await sampler();if(!s){const e=new Error('no');e.code='not_granted';throw e}
  const r=await s(text,{cache:false,modelTier:'default',images});return String((r&&r.text)||r||'')}
const svgOut=t=>{const m=String(t||'').match(/<svg[\s\S]*<\/svg>/i);if(!m)throw new Error('Claude לא החזיר עיצוב תקין. נסו שוב');return m[0]};

// ---------- the drawing: placeholders resolved, unsafe parts removed, fonts embedded, long lines fitted ----------
let FONTS=null;function fontCss(){if(FONTS!=null)return FONTS;let out='';for(const sh of document.styleSheets){let rules;try{rules=sh.cssRules}catch(e){continue}for(const r of rules||[]){if(r.type===5&&/Almoni/i.test(r.cssText)&&/data:/.test(r.cssText))out+=r.cssText+'\n'}}FONTS=out;return out}
function clean(svg){const doc=new DOMParser().parseFromString(svg,'image/svg+xml');const root=doc.documentElement;if(!root||root.nodeName.toLowerCase()!=='svg'||doc.getElementsByTagName('parsererror').length)throw new Error('העיצוב שהתקבל לא תקין');
  root.querySelectorAll('script,foreignObject,iframe,object,embed,a').forEach(n=>n.remove());
  root.querySelectorAll('*').forEach(n=>{[...n.attributes].forEach(a=>{const nm=a.name.toLowerCase(),v=a.value;if(nm.startsWith('on'))n.removeAttribute(a.name);if((nm==='href'||nm==='xlink:href')&&!/^(#|\{\{|data:image\/)/.test(v.trim()))n.removeAttribute(a.name)})});
  root.setAttribute('width',W);root.setAttribute('height',H);root.setAttribute('viewBox','0 0 '+W+' '+H);return new XMLSerializer().serializeToString(root)}
async function resolve(svg,photos){let s=svg;const pr=PROJS.find(p=>p[0]===ST.project)||[];const L=k=>'data:image/png;base64,'+LOGOS[k].b64;
  s=s.replace(/\{\{LOGO_KURKOOS_WHITE\}\}/g,L('kw')).replace(/\{\{LOGO_KURKOOS_NAVY\}\}/g,L('kn')).replace(/\{\{LOGO_PROJECT_WHITE\}\}/g,pr[3]?L(pr[3]):L('kw')).replace(/\{\{LOGO_PROJECT_NAVY\}\}/g,pr[4]?L(pr[4]):L('kn'));
  for(let i=0;i<Math.max(1,photos.length);i++){const j=photos[i]?await photoOf(photos[i]):null;const u=j?j.url:(photos[0]&&photos[0]._j?photos[0]._j.url:'');s=s.split('{{PHOTO'+(i+1)+'}}').join(u)}
  s=s.replace(/\{\{PHOTO\d+\}\}/g,photos[0]&&photos[0]._j?photos[0]._j.url:'');return s}
function fit(svg){const host=document.createElement('div');host.style.cssText='position:fixed;left:-99999px;top:0;width:1080px;height:1350px;visibility:hidden;pointer-events:none';host.innerHTML=svg;document.body.appendChild(host);
  try{host.querySelectorAll('text[data-maxw]').forEach(t=>{const mw=+t.getAttribute('data-maxw');if(!mw)return;let fs=parseFloat(t.getAttribute('font-size')||getComputedStyle(t).fontSize)||40;let len=0;try{len=t.getComputedTextLength()}catch(e){}let n=0;while(len>mw&&fs>14&&n<40){fs=Math.floor(fs*.94);t.setAttribute('font-size',fs);try{len=t.getComputedTextLength()}catch(e){break}n++}});
    return new XMLSerializer().serializeToString(host.querySelector('svg'))}finally{host.remove()}}
async function raster(svgFinal,scale){const st=`<style>${fontCss()}text{font-family:Almoni,Heebo,Arial,sans-serif}</style>`;const s=svgFinal.replace(/(<svg[^>]*>)/i,'$1'+st);
  const url=URL.createObjectURL(new Blob([s],{type:'image/svg+xml'}));try{const im=await imgFrom(url);if(!im)throw new Error('הציור נכשל');try{await im.decode()}catch(e){}await new Promise(r=>setTimeout(r,60));const c=document.createElement('canvas');c.width=W*(scale||1);c.height=H*(scale||1);c.getContext('2d').drawImage(im,0,0,c.width,c.height);return c}finally{setTimeout(()=>URL.revokeObjectURL(url),4000)}}
async function draw(svg){const photos=ST.photos.map(k=>candidates().find(c=>(c.k||c.src)===k)).filter(Boolean);const s=fit(await resolve(clean(svg),photos));const c=await raster(s,1);return {final:s,c,url:c.toDataURL('image/jpeg',.9)}}

// ---------- the work ----------
const STEPS={ins:'קורא את ההשראה',gen:'Claude מעצב את השכפול',draw:'מצייר',fix:'Claude משווה למקור ומתקן',done:''};
function step(k){ST.busy=k;render()}
async function generate(){if(ST.busy)return;ST.err='';const pics=ST.photos.map(k=>candidates().find(c=>(c.k||c.src)===k)).filter(Boolean);if(!pics.length){ST.err='בחרו לפחות תמונה אחת שלנו';render();return}
  try{step('ins');const ins=await insOf();if(!ins)throw new Error('לא הצלחתי לקרוא את תמונת ההשראה');const pj=[];for(const p of pics){const j=await photoOf(p);if(j)pj.push(j.blob)}
    step('gen');let svg=svgOut(await ask(genPrompt(pj.length),[ins.blob,...pj].slice(0,4),'gen'));
    step('draw');let d=await draw(svg);let r={svg,url:d.url,final:d.final,round:1,at:Date.now()};ST.res.push(r);ST.cur=ST.res.length-1;render();
    if(ST.auto){step('fix');const svg2=svgOut(await ask(fixPrompt(svg),[ins.blob,dataBlob(d.url)],'fix'));step('draw');const d2=await draw(svg2);r={svg:svg2,url:d2.url,final:d2.final,round:2,at:Date.now()};ST.res.push(r);ST.cur=ST.res.length-1}
  }catch(e){console.warn('v202',e);ST.err=e&&e.code==='not_granted'?'Claude לא זמין כרגע. באתר צריך את המפתח ANTHROPIC_API_KEY ב-Vercel, וב-claude.ai צריך לאשר את הבקשה':((e&&e.message)||'שגיאה')}
  ST.busy='';render()}
async function refine(){const r=ST.res[ST.cur];if(!r||ST.busy)return;ST.err='';try{step('ins');const ins=await insOf();step('fix');const svg=svgOut(await ask(fixPrompt(r.svg),[ins.blob,dataBlob(r.url)],'fix'));step('draw');const d=await draw(svg);ST.res.push({svg,url:d.url,final:d.final,round:(r.round||1)+1,at:Date.now()});ST.cur=ST.res.length-1}catch(e){console.warn('v202 fix',e);ST.err=(e&&e.message)||'שגיאה'}ST.busy='';render()}
function dataBlob(u){const [h,b]=u.split(',');const bin=atob(b);const a=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)a[i]=bin.charCodeAt(i);return new Blob([a],{type:(h.match(/:(.*?);/)||[])[1]||'image/jpeg'})}
function texts(svg){try{const doc=new DOMParser().parseFromString(svg,'image/svg+xml');return [...doc.querySelectorAll('text')].map((t,i)=>({i,v:t.textContent}))}catch(e){return []}}
async function setText(i,v){const r=ST.res[ST.cur];if(!r)return;const doc=new DOMParser().parseFromString(r.svg,'image/svg+xml');const t=doc.querySelectorAll('text')[i];if(!t)return;
  [...t.childNodes].forEach((n,k)=>{if(k)n.remove()});if(t.firstChild&&t.firstChild.nodeType===1)t.firstChild.textContent=v;else t.textContent=v;const cl=v.replace(/\s[—–-]\s/g,', ');if(cl!==v)t.textContent=cl;
  const svg=new XMLSerializer().serializeToString(doc.documentElement);try{const d=await draw(svg);Object.assign(r,{svg,url:d.url,final:d.final});render()}catch(e){toastS('העדכון נכשל')}}

// ---------- saving: a flat 1080×1350 post, kept with its design so it can be opened again ----------
const SPEC={id:'x_t_v202',fam:'inspo',name:'שכפול מדויק',theme:'light',el:[{t:'photo',x:0,y:0,w:W,h:H,tag:false}],themable:false,tags:{ct:['marketing'],st:['inspo']}};
function regSpec(){try{if(!window.TPL||!window.FX)return false;const T=TPL;if(!T.specs.some(s=>s.id===SPEC.id)){T.specs.push(SPEC);T.fam.inspo=T.fam.inspo||'לפי השראה'}T.names[SPEC.id]='לפי השראה · שכפול מדויק';T.themes[SPEC.id]='light';T.meta[SPEC.id]={fam:'inspo',name:SPEC.name,theme:'light',cats:['marketing'],shots:1};FX.L[SPEC.id]=(c,p,I)=>T.draw(SPEC,c,p,I);try{ED_NAMES[SPEC.id]=T.names[SPEC.id];LAYOUTS[SPEC.id]='עריכה: '+T.names[SPEC.id];DEF_THEME[SPEC.id]='light'}catch(e){}return true}catch(e){return false}}
async function storePng(c){const blob=await new Promise(r=>c.toBlob(r,'image/png'));const name='שכפול · '+((PROJS.find(p=>p[0]===ST.project)||[])[1]||'');
  if(typeof KC!=='undefined'&&KC.assets){const up=await KC.assets.upload(blob);const meta={name,project:(PROJS.find(p=>p[0]===ST.project)||[])[1]||'',kind:'brand',tags:'clone',w:W,h:H,addedAt:new Date().toISOString(),url:up.url};if(KC.db)try{await KC.db.collection('photos').doc(up.id).set(meta)}catch(e){}try{regUpload(up.id,meta)}catch(e){PHOTO_LIB['u_'+up.id]=up.url}return 'u_'+up.id}
  const k='u_local'+Date.now().toString(36);PHOTO_LIB[k]=URL.createObjectURL(blob);return k}
async function save(){const r=ST.res[ST.cur];if(!r||ST.busy)return;ST.busy='save';render();try{regSpec();const c=await raster(r.final,1);const k=await storePng(c);
  const base=window.__v48.basePost();const q=clonePost(base,{src:'inbox'});const tx=texts(r.svg).map(x=>x.v.trim()).filter(Boolean);const pn=(PROJS.find(p=>p[0]===ST.project)||[])[1]||'';
  q.visual=Object.assign({},q.visual||{},{headline:tx[0]||pn,sub:tx.slice(1,3).join(' '),eyebrow:pn,cta:'',items:[],slides:[]});q.hook=q.visual.headline;const cap=tx.join('\n')+'\n\nקבוצת קורקוס. מקרקע ועד מסירת מפתח.\nkurkoos-group.co.il';q.fb=cap;q.ig=cap;q.article=null;
  peConvert(q,SPEC.id);q.layout=SPEC.id;const fx=q.fx||(q.fx={});fx.shot={k,r:[0,0,1,1]};fx.shots=[{k,r:[0,0,1,1]}];fx.logo='none';fx.logoCfg={mode:'none'};delete fx.tag;try{peSyncKeys(q)}catch(e){}
  q.series='מהסוכן · שכפול מדויק';q.flag='';q.feedback='';q.upd=new Date().toISOString();q.pk={angle:'direct',format:'ad',platform:'facebook',asset:k,project:pn,run:'clone',day:new Date().toISOString().slice(0,10),score:{total:0,hook:0,clarity:0,engagement:0,cta:0,visual:0,why:[]},plat:{facebook:cap,instagram:cap},ai:true,tone:'שכפול מדויק'};
  q.v202={svg:r.svg,project:ST.project,photos:ST.photos.slice(),ins:ST.ins&&ST.ins.src&&!/^blob:/.test(ST.ins.src)?ST.ins.src:'',insName:ST.ins&&ST.ins.name||'',round:r.round};
  AG.posts.unshift(q);try{saveAgent()}catch(e){}try{TC.clear()}catch(e){}r.saved=q.id;toastS('נשמר בספריית התוצרים. שום דבר לא פורסם');try{window.__v51rer&&window.__v51rer()}catch(e){}}catch(e){console.warn('v202 save',e);toastS('השמירה נכשלה: '+((e&&e.message)||''))}ST.busy='';render()}
async function download(){const r=ST.res[ST.cur];if(!r)return;try{const c=await raster(r.final,2);const b=await new Promise(z=>c.toBlob(z,'image/png'));const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download='kurkoos-clone-2x.png';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),3000)}catch(e){toastS('ההורדה נכשלה')}}

// ---------- the studio window ----------
function html(){const c=candidates();if(!ST.photos.length&&c[0])ST.photos=[(c.find(x=>x.tag==='מהספרייה')||c[0]).k||(c[0].src)];const r=ST.res[ST.cur];const busy=!!ST.busy;
  const steps=busy&&ST.busy!=='save'?`<ol class="v202steps" aria-live="polite">${['ins','gen','draw','fix'].filter(k=>k!=='fix'||ST.auto).map(k=>`<li class="${k===ST.busy?'on':''}">${STEPS[k]}</li>`).join('')}</ol>`:'';
  const left=`<figure class="v202pane"><figcaption>המקור${ST.ins&&ST.ins.name?': '+E(ST.ins.name):''}</figcaption><div class="v202img">${ST.ins&&ST.ins.src?`<img src="${E(ST.ins.src)}" alt="ההשראה" referrerpolicy="no-referrer">`:''}</div></figure>`;
  const right=`<figure class="v202pane"><figcaption>${r?`השכפול שלנו · סבב ${r.round}${r.saved?' · נשמר':''}`:'השכפול שלנו'}</figcaption><div class="v202img${busy?' busy':''}">${r?`<img src="${r.url}" alt="השכפול">`:`<p class="v202ph">${busy?'':'בחרו פרויקט ותמונה שלנו, ולחצו "שכפול מדויק".'}</p>`}${steps}</div>
   ${ST.res.length>1?`<div class="v202hist" role="group" aria-label="גרסאות">${ST.res.map((x,i)=>`<button type="button" data-v202="pick" data-i="${i}" class="${i===ST.cur?'on':''}" aria-pressed="${i===ST.cur}"><img src="${x.url}" alt=""><span>סבב ${x.round}</span></button>`).join('')}</div>`:''}</figure>`;
  const ctl=`<div class="v202ctl"><label>פרויקט<select data-v202="proj">${PROJS.map(([k,l])=>`<option value="${k}"${k===ST.project?' selected':''}>${l}</option>`).join('')}</select></label>
   <div class="v202ph2"><b>התמונה שלנו</b><div class="v202pics" role="group" aria-label="התמונות שלנו">${c.length?c.map(x=>{const id=x.k||x.src;const on=ST.photos.includes(id);return `<label class="${on?'on':''}" title="${E(x.name)}"><input type="checkbox" data-v202="ph" value="${E(id)}"${on?' checked':''}><img src="${E(x.src)}" alt="" loading="lazy"><span>${E(x.tag)}</span></label>`}).join(''):'<p class="v202hint">אין עדיין תמונות לפרויקט. העלו תמונה או הדמיה.</p>'}
    <label class="v202up"><input type="file" accept="image/*" data-v202="up" hidden><span>+ העלאה</span></label></div></div>
   <label>הנחיה לסוכן (לא חובה)<input type="text" data-v202="note" value="${E(ST.note)}" placeholder='למשל: "יותר כהה ולילי" או "הלוגו של הפרויקט גדול יותר"'></label>
   <label class="v202sw"><input type="checkbox" data-v202="auto"${ST.auto?' checked':''}><span>בדיקה ותיקון אוטומטי מול המקור</span></label>
   <div class="v202acts"><button type="button" class="px-btn pri" data-v202="gen"${busy?' disabled':''}>${ST.busy&&ST.busy!=='save'?'עובד…':r?'שכפול חדש':'שכפול מדויק'}</button>
   ${r?`<button type="button" class="px-btn" data-v202="fix"${busy?' disabled':''}>קרוב יותר למקור</button><button type="button" class="px-btn" data-v202="save"${busy?' disabled':''}>${ST.busy==='save'?'שומר…':'שמירה לספרייה'}</button><button type="button" class="px-btn ghost" data-v202="dl"${busy?' disabled':''}>הורדה 2x</button>`:''}</div>
   ${ST.err?`<p class="v202err" role="alert">${E(ST.err)}</p>`:''}
   ${r?`<details class="v202tx"><summary>עריכת הטקסטים</summary>${texts(r.svg).map(t=>`<input type="text" data-v202="tx" data-i="${t.i}" value="${E(t.v)}" aria-label="טקסט ${t.i+1}">`).join('')}</details>`:''}
   <p class="v202hint">הצבעים, הפונט והלוגואים של קורקוס, והטקסטים רק מהעובדות שלנו. שום מילה, מחיר או תמונה לא מועתקים מהמקור, ושום דבר לא מתפרסם.</p></div>`;
  return `<div class="v202bg" data-v202="close"></div><section class="v202box" role="dialog" aria-modal="true" aria-label="שכפול מדויק"><header class="v202h"><h2>שכפול מדויק</h2><button type="button" class="v202x" data-v202="close" aria-label="סגירה">✕</button></header>
   <div class="v202body"><div class="v202cmp">${left}${right}</div>${ctl}</div></section>`}
function render(){const m=$('v202');if(!m||!ST.open)return;const sc=m.querySelector('.v202body');const top=sc?sc.scrollTop:0;const f=document.activeElement&&document.activeElement.dataset&&document.activeElement.dataset.v202;m.innerHTML=html();const s2=m.querySelector('.v202body');if(s2)s2.scrollTop=top;if(f==='note'){const n=m.querySelector('[data-v202="note"]');if(n){n.focus();n.setSelectionRange(n.value.length,n.value.length)}}}
let back=null;
function open(ins){ST.ins=ins;ST.res=[];ST.cur=-1;ST.err='';ST.busy='';ST.open=true;back=document.activeElement;let m=$('v202');if(!m){m=document.createElement('div');m.id='v202';m.dir='rtl';document.body.appendChild(m)}m.hidden=false;document.documentElement.classList.add('v202-on');render();setTimeout(()=>{const b=m.querySelector('[data-v202="gen"]');b&&b.focus()},40)}
function close(){if(ST.busy&&ST.busy!=='save'&&!confirm('השכפול עוד בעבודה. לסגור?'))return;ST.open=false;const m=$('v202');if(m){m.hidden=true;m.innerHTML=''}document.documentElement.classList.remove('v202-on');try{back&&back.focus&&back.focus()}catch(e){}}

// ---------- entry points ----------
// 1. the competitor viewer: "שכפול מדויק" beside "שכפל למותג שלנו"
function viewerIns(){const v=$('v186v');if(!v)return null;const img=v.querySelector('[data-v186img]');const who=v.querySelector('.v186vwho b');return img&&img.src?{src:img.src,name:who?who.textContent.trim():'מתחרה',from:'gallery'}:null}
new MutationObserver(()=>{const v=$('v186v');if(!v)return;v.querySelectorAll('.v186acts,.v186peek').forEach(box=>{if(box.querySelector('[data-v202="fromview"]'))return;const b=document.createElement('button');b.type='button';b.className='v179b big v202vb';b.dataset.v202='fromview';b.textContent='שכפול מדויק';const cl=box.querySelector('[data-v186="clone"]');if(cl)cl.insertAdjacentElement('afterend',b);else box.prepend(b)})}).observe(document.body,{childList:true,subtree:true});
// 2. the inspiration panel of the agent tab: its build button opens the studio with the chosen inspiration
window.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-v201="build"]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();const R=window.__v201&&__v201.R;const it=IB().items.find(x=>x.id===(R&&R.ins)&&x.use==='inspo')||IB().items.find(x=>x.use==='inspo');if(!it){toastS('סמנו קודם קובץ אחד כהשראה');return}
  if(R&&R.photos&&R.photos.length)ST.photos=R.photos.map(id=>{const x=IB().items.find(y=>y.id===id);return x&&(x.k||x.thumb)}).filter(Boolean);if(R&&R.project)ST.project=R.project;open({k:it.k,src:it.thumb,blob:it._file instanceof Blob?it._file:null,name:it.name,from:'agent'})},true);
new MutationObserver(()=>{const b=document.querySelector('[data-v201="build"]');if(b&&!b.dataset.v202){b.dataset.v202=1;b.textContent='שכפול מדויק לפי ההשראה'}}).observe(document.body,{childList:true,subtree:true});

document.addEventListener('click',async e=>{const b=e.target.closest&&e.target.closest('[data-v202]');if(!b)return;const a=b.dataset.v202;if(['ph','note','auto','proj','tx','up'].includes(a))return;if(a==='fromview'){e.preventDefault();e.stopPropagation();const ins=viewerIns();if(!ins){toastS('לא מצאתי את התמונה של המודעה');return}open(ins);return}
  if(!b.closest('#v202'))return;e.preventDefault();
  if(a==='close')return close();if(a==='gen')return generate();if(a==='fix')return refine();if(a==='save')return save();if(a==='dl')return download();
  if(a==='pick'){ST.cur=+b.dataset.i;render()}},true);
document.addEventListener('change',async e=>{const t=e.target;if(!t.dataset||!t.dataset.v202||!t.closest('#v202'))return;const a=t.dataset.v202;
  if(a==='ph'){const id=t.value;ST.photos=t.checked?[...ST.photos.filter(x=>x!==id),id].slice(-3):ST.photos.filter(x=>x!==id);render();return}
  if(a==='proj'){ST.project=t.value;ST.photos=[];keep();render();return}if(a==='auto'){ST.auto=t.checked;keep();return}if(a==='note'){ST.note=t.value;return}
  if(a==='tx'){setText(+t.dataset.i,t.value);return}
  if(a==='up'){const f=t.files&&t.files[0];t.value='';if(!f)return;let k='',src=URL.createObjectURL(f);try{if(typeof KC!=='undefined'&&KC.assets){const up=await KC.assets.upload(f);const meta={name:f.name.replace(/\.[^.]+$/,''),project:(PROJS.find(p=>p[0]===ST.project)||[])[1]||'',kind:'site',tags:'clone',addedAt:new Date().toISOString(),url:up.url};if(KC.db)try{await KC.db.collection('photos').doc(up.id).set(meta)}catch(x){}try{regUpload(up.id,meta)}catch(x){PHOTO_LIB['u_'+up.id]=up.url}k='u_'+up.id;src=up.url}}catch(x){console.warn('v202 up',x)}
    ST.extra.unshift({k,src,name:f.name});ST.photos=[k||src];render()}},true);
document.addEventListener('input',e=>{const t=e.target;if(t.dataset&&t.dataset.v202==='note'&&t.closest('#v202'))ST.note=t.value},true);
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&ST.open){e.stopImmediatePropagation();e.preventDefault();close()}},true);
let tries=0;const boot=setInterval(()=>{tries++;if(regSpec()||tries>60)clearInterval(boot)},500);
window.__v202={ST,open,close,generate,refine,save,draw,clean,genPrompt,fixPrompt,candidates};
})();
/*V202:END*/
