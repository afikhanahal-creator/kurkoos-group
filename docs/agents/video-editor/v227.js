/*V227:START*/
// ================= V227 · Social Carousel Studio: a tab that turns an image, a text, a topic, a document or a link into a
// branded carousel in three steps (חומרי גלם ← תוכן ואישור ← עיצוב וייצוא). Claude (Opus) writes the content as a story
// (angle, hook, a logical run of slides, summary and CTA) with a source mark on every slide (given, verified, creative);
// the design engine gives every slide one of eight brand layouts of the template engine (family car26: the Kurkoos
// palette, Almoni, the logo and footer, a k/n counter and the swipe hint), one post per slide, so every slide opens in the
// full post editor, exports like any post and can be scheduled. Uploaded photos go to the photo library and fill the photo
// slots; the original is never replaced by a generated image. A quality pass before export flags overflow, tiny text,
// missing images, low resolution, duplicates, a hook that does not match, unsourced numbers and mixed direction. Drafts
// autosave (browser + the carousels collection), undo and redo, versions, PNG and ZIP export, texts and caption. =================
(()=>{
if(window.__v227)return;window.__v227=1;
const E=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $=s=>document.querySelector(s);
const say=m=>{try{toast(m)}catch(e){console.log(m)}};
const uid=p=>(p||'c')+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const W=1080,H=1350,M=72;
const PLATS=[['instagram','Instagram'],['facebook','Facebook'],['linkedin','LinkedIn']];
const FMTS=[['45','4:5 · 1080×1350 (מומלץ)'],['11','1:1 · 1080×1080'],['916','9:16 · 1080×1920']];
const GOALS=[['reach','חשיפה'],['edu','חינוך הקהל'],['authority','סמכות מקצועית'],['engage','יצירת מעורבות'],['leads','יצירת לידים'],['traffic','תנועה לאתר'],['project','קידום פרויקט']];
const STYLES=[['pro','מקצועי'],['story','סיפורי'],['info','אינפורמטיבי'],['guide','מדריך'],['tips','רשימת טיפים'],['myth','מיתוסים מול עובדות'],['case','ניתוח מקרה'],['soft','תוכן שיווקי עדין']];
const DEPTHS=[['short','קצר'],['mid','בינוני'],['deep','מעמיק']];
const LANGS=[['he','עברית'],['en','English']];
const BRANDS=[['kurkoos','קבוצת קורקוס'],['afik','אפיק הנחל']];
const PROJS=[['general','קבוצת קורקוס (כללי)'],['hankin','חנקין 41'],['henrietta','הנרייטה סאלד 22-24'],['yordei','יורדי הים 3'],['bengurion','בן גוריון 17']];
const KINDS=[['hook','הוק'],['problem','הבעיה או ההזדמנות'],['point','הסבר או תובנה'],['example','דוגמה או צעד מעשי'],['stat','נתון מרכזי'],['compare','השוואה'],['quote','ציטוט או מסר'],['summary','סיכום וקריאה לפעולה']];
// ---------- the eight slide layouts (template engine vocabulary, brand themes) ----------
const LAYOUTS=[
 ['title','כותרת גדולה','dark',[{t:'text',f:'label',kind:'small',x:W-M,y:130,size:22,track:2,col:'sub'},{t:'rect',x:W-M-120,y:236,w:120,h:8,col:'red'},{t:'text',f:'head',x:W-M,y:330,maxW:W-2*M,size:104,max:4,w:900,col:'fg',align:'right',lh:1.04},{t:'text',f:'sub',x:W-M,y:860,maxW:W-2*M-60,size:38,max:3,w:400,col:'sub',align:'right',lh:1.3},{t:'swipe',x:M,y:H-150,col:'fg'},{t:'chrome',o:{}}],0],
 ['text','כותרת וטקסט','white',[{t:'text',f:'label',kind:'small',x:W-M,y:130,size:22,track:2,col:'red'},{t:'text',f:'head',x:W-M,y:250,maxW:W-2*M,size:68,max:3,w:800,col:'fg',align:'right',lh:1.08},{t:'line',x1:M,y1:560,x2:W-M,y2:560,col:'line'},{t:'text',f:'sub',x:W-M,y:620,maxW:W-2*M,size:38,max:7,w:400,col:'fg',align:'right',lh:1.42},{t:'swipe',x:M,y:H-150,col:'navy'},{t:'chrome',o:{}}],0],
 ['photo','תמונה וטקסט','light',[{t:'photo',s:0,x:0,y:0,w:W,h:640},{t:'text',f:'head',x:W-M,y:720,maxW:W-2*M,size:62,max:3,w:800,col:'fg',align:'right',lh:1.08},{t:'text',f:'sub',x:W-M,y:980,maxW:W-2*M,size:34,max:4,w:400,col:'sub',align:'right',lh:1.4},{t:'swipe',x:M,y:H-150,col:'navy'},{t:'chrome',o:{}}],1],
 ['photobg','תמונה כרקע','dark',[{t:'photo',s:0,x:0,y:0,w:W,h:H,dim:.62},{t:'text',f:'head',x:W-M,y:720,maxW:W-2*M,size:84,max:4,w:900,col:'white',align:'right',lh:1.05},{t:'text',f:'sub',x:W-M,y:1080,maxW:W-2*M,size:34,max:3,w:400,col:'mist',align:'right',lh:1.35},{t:'swipe',x:M,y:H-150,col:'white'},{t:'chrome',o:{noFolio:true,markCol:'#ffffff',subCol:'#ffffff'}}],1],
 ['list','רשימה ממוספרת','light',[{t:'text',f:'head',x:W-M,y:220,maxW:W-2*M,size:60,max:2,w:800,col:'fg',align:'right',lh:1.08},{t:'list',y:430,rh:118,max:5,rule:'line',x1:M,x2:W-M},{t:'swipe',x:M,y:H-150,col:'navy'},{t:'chrome',o:{}}],0],
 ['stat','נתון מרכזי','red',[{t:'text',f:'label',kind:'small',x:W-M,y:130,size:22,track:2,col:'white'},{t:'stat',x:W-M,y:380,size:320,w:900,col:'white',align:'right',maxW:W-2*M},{t:'text',f:'sub',x:W-M,y:820,maxW:W-2*M,size:46,max:4,w:700,col:'white',align:'right',lh:1.25},{t:'swipe',x:M,y:H-150,col:'white'},{t:'chrome',o:{noFolio:true,markCol:'#ffffff',subCol:'#ffffff'}}],0],
 ['compare','השוואה','mist',[{t:'rect',x:M,y:200,w:W-2*M,h:430,col:'navy',r:16},{t:'text',f:'head',x:W-M-48,y:260,maxW:W-2*M-96,size:58,max:4,w:800,col:'white',align:'right',lh:1.1},{t:'rect',x:M,y:660,w:W-2*M,h:430,col:'white',r:16},{t:'text',f:'sub',x:W-M-48,y:720,maxW:W-2*M-96,size:40,max:5,w:400,col:'navy',align:'right',lh:1.3},{t:'swipe',x:M,y:H-150,col:'navy'},{t:'chrome',o:{}}],0],
 ['quote','ציטוט או מסר','ink',[{t:'text',text:'״',x:W-M,y:230,maxW:200,size:200,max:1,w:900,col:'red',align:'right'},{t:'text',f:'head',x:W-M,y:420,maxW:W-2*M,size:70,max:5,w:400,col:'white',align:'right',lh:1.22},{t:'text',f:'sub',x:W-M,y:1000,maxW:W-2*M,size:30,max:2,w:400,col:'mist',align:'right'},{t:'swipe',x:M,y:H-150,col:'white'},{t:'chrome',o:{noFolio:true,markCol:'#ffffff',subCol:'#ffffff'}}],0],
 ['cta','סיכום וקריאה לפעולה','dark',[{t:'text',f:'label',kind:'small',x:W-M,y:130,size:22,track:2,col:'sub'},{t:'text',f:'head',x:W-M,y:300,maxW:W-2*M,size:80,max:4,w:900,col:'fg',align:'right',lh:1.06},{t:'text',f:'sub',x:W-M,y:720,maxW:W-2*M,size:38,max:4,w:400,col:'sub',align:'right',lh:1.35},{t:'cta',x:W/2,y:1010,w:560,h:100,r:50,bg:'red',fg:'white',size:40,align:'center'},{t:'chrome',o:{}}],0]];
const LAY=Object.fromEntries(LAYOUTS.map(l=>[l[0],{id:'x_t_car26_'+l[0],name:l[1],theme:l[2],el:l[3],photo:!!l[4]}]));
const KIND_LAY={hook:'title',problem:'text',point:'text',example:'photo',stat:'stat',compare:'compare',quote:'quote',summary:'cta'};
function registerLayouts(){const T=window.TPL;if(!T||!T.register)return false;T.fam.car26='Social Carousel Studio';if(T.famNote)T.famNote.car26='שמונה שקופיות קרוסלה בשפת המותג: כותרת, טקסט, תמונה, תמונה כרקע, רשימה, נתון, השוואה, ציטוט וסיכום. מונה k/n ורמז החלקה בכל אחת';
  LAYOUTS.forEach(([id,name,theme,el,ph])=>{const sid='x_t_car26_'+id;if(T.specs.some(s=>s.id===sid))return;T.register({shots:ph?1:0,id:sid,fam:'car26',name:'קרוסלה · '+name,theme,el,cats:['carousels'],themable:false,tags:{ct:['carousel'],st:['editorial']}})});return true}
(function boot(){if(!registerLayouts())setTimeout(boot,500)})();

// ---------- state and store ----------
const LSK='v227_cars',COL='carousels';
const S={list:{},cur:null,step:1,busy:'',err:'',hist:[],fut:[],qa:null,zoom:null,drag:null,thumbs:{},claudeQa:null};
try{S.list=JSON.parse(localStorage.getItem(LSK)||'{}')}catch(e){S.list={}}
const D=()=>S.cur?S.list[S.cur]:null;
let saveT=0;function persist(){const d=D();if(!d)return;d.updated=new Date().toISOString();try{localStorage.setItem(LSK,JSON.stringify(S.list))}catch(e){}clearTimeout(saveT);saveT=setTimeout(async()=>{try{const db=window.__engineBridge&&__engineBridge.db;if(db)await db.collection(COL).doc(d.id).set(JSON.parse(JSON.stringify(d)))}catch(e){console.warn('v227 cloud',e)}},900)}
(async function pull(){try{const db=window.__engineBridge&&__engineBridge.db;if(!db)return;const s=await db.collection(COL).get();(s.docs||[]).forEach(x=>{const r=x.data?x.data():x;if(r&&r.id&&(!S.list[r.id]||(r.updated||'')>(S.list[r.id].updated||'')))S.list[r.id]=r});try{localStorage.setItem(LSK,JSON.stringify(S.list))}catch(e){}if(typeof APP!=='undefined'&&APP.view==='carousel')paint()}catch(e){}})();
function newDoc(){const id=uid('car');const d={id,name:'קרוסלה חדשה',brand:'kurkoos',platform:'instagram',fmt:'45',n:'auto',goal:'authority',style:'pro',depth:'mid',lang:'he',project:'general',raw:{text:'',topic:'',url:'',urlTitle:'',urlText:'',notes:'',images:[],cover:''},content:null,posts:[],status:'draft',created:new Date().toISOString(),updated:new Date().toISOString(),versions:[]};S.list[id]=d;S.cur=id;S.step=1;S.hist=[];S.fut=[];S.qa=null;persist();return d}
function snap(){const d=D();return d?JSON.stringify({content:d.content,posts:postsState(d)}):''}
function postsState(d){const o={};postsOf(d).forEach(q=>{o[q.id]={visual:q.visual,layout:q.layout,fx:q.fx,shots:q.shots,shot:q.shot}});return o}
function push(){const s=snap();if(!s)return;S.hist.push(s);if(S.hist.length>40)S.hist.shift();S.fut=[]}
function restore(s){const d=D();if(!d||!s)return;const o=JSON.parse(s);d.content=o.content;postsOf(d).forEach(q=>{const v=o.posts[q.id];if(v){q.visual=v.visual;q.layout=v.layout;q.fx=v.fx;q.shots=v.shots;q.shot=v.shot}});
  // a slide whose post was deleted in the meantime gets its post back (designed carousels only)
  if(d.content&&d.content.slides.some(x=>x.postId)){d.content.slides.forEach(x=>{if(!postOf(x)){x.postId='';syncPost(d,x)}});renumber(d)}try{saveAgent()}catch(e){}S.thumbs={};persist()}
function undo(){if(!S.hist.length)return;S.fut.push(snap());restore(S.hist.pop());paint()}
function redo(){if(!S.fut.length)return;S.hist.push(snap());restore(S.fut.pop());paint()}

// ---------- Claude ----------
async function sampler(){let s=null;try{s=(window.claude&&window.claude.use)?await window.claude.use('sample').catch(()=>null):null}catch(e){}if(!s&&typeof KC!=='undefined'&&KC.sample)s=KC.sample;return s}
async function imgInputs(keys){const out=[];for(const k of keys.slice(0,4)){const url=(typeof PHOTO_LIB!=='undefined'&&PHOTO_LIB[k])||'';if(!url)continue;if(window.__ENGINE_HOST==='site'){if(/^https?:/.test(url))out.push(url);continue}try{const r=await fetch(url);if(r.ok)out.push(await r.blob())}catch(e){}}return out}
async function ask(prompt,images,tag){if(window.__v227mock)return window.__v227mock(tag,prompt,images||[]);const s=await sampler();if(!s||!s.json){const e=new Error('Claude לא זמין בתצוגה הזו');e.code='not_granted';throw e}return s.json(prompt,{images:images&&images.length?images:undefined,modelTier:'complex',cache:false})}
const lab=(arr,k)=>(arr.find(x=>x[0]===k)||[])[1]||k;
function brandName(d){return d.brand==='afik'?'אפיק הנחל':'קבוצת קורקוס'}
function brandLine(d){return d.brand==='afik'?'אפיק הנחל: ייזום, שיווק ותיווך נדל"ן.':'קבוצת קורקוס: יזמות, בנייה וביצוע, ניהול ופיקוח ותיווך בהוד השרון ובמרכז, מקרקע ועד מסירת מפתח. טלפון 055-981-1814, kurkoos-group.co.il.'}
function facts(d){let f='';try{if(typeof factsOf==='function')f=factsOf(d.project)}catch(e){}return f}
function rawText(d){const r=d.raw;return [r.topic?'נושא: '+r.topic:'',r.text?'חומר גלם:\n'+r.text:'',r.urlText?'מתוך הקישור '+r.url+(r.urlTitle?' ('+r.urlTitle+')':'')+':\n'+r.urlText.slice(0,9000):'',r.notes?'הנחיות מיוחדות: '+r.notes:'',r.images.length?'תמונות שהועלו: '+r.images.map((im,i)=>(i+1)+'. '+(im.name||'תמונה')).join(', ')+' (מצורפות; תאר מה רואים רק אם רלוונטי, אל תמציא פרטים שלא רואים)':''].filter(Boolean).join('\n\n')}
function contentPrompt(d){const n=d.n==='auto'?'בין 5 ל-9, לפי מה שהחומר מצדיק':String(d.n)+' בדיוק';const en=d.lang==='en';
  return `${en?'You are the content lead of':'אתה מנהל התוכן של'} "${brandName(d)}". ${brandLine(d)}
${en?'Write the content of a social media carousel':'כתוב תוכן לקרוסלה לרשתות החברתיות'} (${lab(PLATS,d.platform)}). ${en?'Language: English.':'שפה: עברית מדוברת, ברורה ומדויקת.'}
מטרה: ${lab(GOALS,d.goal)}. סגנון: ${lab(STYLES,d.style)}. רמת פירוט: ${lab(DEPTHS,d.depth)}. מספר שקופיות: ${n}.
${d.project!=='general'?'הפרויקט: '+lab(PROJS,d.project)+'. עובדות מאומתות על הפרויקט: '+facts(d)+'\n':''}
חומרי הגלם:
${rawText(d)||'(אין חומר גלם מעבר לנושא: בנה תוכן מקצועי מהידע הכללי בתחום, וסמן כל טענה כ-creative)'}

תהליך: 1) זהה נושא, מסר מרכזי וקהל יעד. 2) מה הערך שהקורא יוצא איתו. 3) זווית מעניינת ומקורית. 4) הוק חזק שעוצר גלילה. 5) רצף שקופיות הגיוני עם התקדמות ברורה. 6) טקסט תמציתי לכל שקופית. 7) דוגמאות, נתונים או צעדים רק כשיש להם בסיס בחומר. 8) סיכום עם מסר אחד וקריאה לפעולה שמתאימה למטרה. 9) אורך שמתאים לקריאה בטלפון.
מבנה גמיש (לא קשיח): hook, problem, point/example (כמה שצריך), אופציונלית stat / compare / quote, summary.
כללי איכות: אסור להמציא נתונים, מחקרים, ציטוטים, מחירים, תאריכים, כתובות או שמות. בלי טקסט כללי למילוי. בלי לחזור על אותו מסר. בלי שיווק אגרסיבי כשהמטרה היא אמון וסמכות. בלי מקפים כסימן פיסוק. בלי שמות עובדים. כל שקופית מסומנת source: "given" (מופיע בחומר הגלם), "verified" (עובדה מהרשימה המאומתת), "creative" (ניסוח או ידע כללי). נתון מספרי מותר רק עם source given או verified.
מגבלות עיצוב: title עד 8 מילים (בהוק עד 7). text עד 40 מילים (בשקופית text עד 55). items: 3 עד 5 שורות של עד 7 מילים. stat: מספר קצר כמו "6" או "150 מ"ר" ולידו label עד 6 מילים. compare: title = הצד הראשון (עד 14 מילים), text = הצד השני (עד 14 מילים). quote: title = המשפט (עד 20 מילים), text = ההקשר (עד 8 מילים).
layout לכל שקופית מתוך: title, text, photo, photobg, list, stat, compare, quote, cta. גוון בין הפריסות. photo או photobg רק לשקופיות שיש להן תמונה מתאימה מהתמונות שהועלו (ציין image: מספר התמונה) או לשקופית הפתיחה.
החזר JSON בלבד:
{"topic":"","audience":"","angle":"","value":"","slides":[{"kind":"hook|problem|point|example|stat|compare|quote|summary","layout":"title|text|photo|photobg|list|stat|compare|quote|cta","title":"","text":"","items":[],"stat":"","label":"","image":0,"source":"given|verified|creative"}],"caption":"טקסט הפוסט, 40 עד 90 מילים, בשורות קצרות","hashtags":["עד 6 בעברית"],"cta":"עד 5 מילים","facts":{"given":["עובדות שנלקחו מהחומר"],"verified":["עובדות מהרשימה המאומתת"],"creative":["טענות מידע כללי שכדאי לאמת"]}}`}
function slidePrompt(d,i,note){const c=d.content;const s=c.slides[i];const others=c.slides.map((x,k)=>`${k+1}. [${x.kind}/${x.layout}] ${x.title} | ${x.text||''}${x.items&&x.items.length?' | '+x.items.join(' · '):''}`).join('\n');
  return `${contentPrompt(d)}

הקרוסלה כבר כתובה. החזר רק גרסה חדשה לשקופית ${i+1} (${s.kind}, ${s.layout}), שונה מהנוכחית, שמתחברת לשקופיות לפניה ואחריה ולא חוזרת עליהן.${note?' בקשת העורך: '+note:''}
הקרוסלה הנוכחית:
${others}
החזר JSON בלבד: {"slide":{"kind":"${s.kind}","layout":"${s.layout}","title":"","text":"","items":[],"stat":"","label":"","image":${s.image||0},"source":"given|verified|creative"}}`}
function qaPrompt(d){const c=d.content;return `אתה עורך לשוני של "${brandName(d)}". לפניך טקסטים של קרוסלה בעברית. בדוק שגיאות כתיב, ניסוח מסורבל, סימני פיסוק לא נכונים (מקפים כסימן פיסוק אסורים), חזרות בין שקופיות, והתאמה בין ההוק לתוכן. אל תשנה עובדות ואל תוסיף מידע.
${c.slides.map((x,k)=>`${k+1}. ${x.title} | ${x.text||''}${x.items&&x.items.length?' | '+x.items.join(' · '):''}`).join('\n')}
כיתוב: ${c.caption||''}
החזר JSON בלבד: {"issues":[{"slide":1,"what":"מה הבעיה","fix":"הניסוח המתוקן"}]} (רשימה ריקה אם הכל תקין)`}
function cleanSlides(raw,d){const list=Array.isArray(raw&&raw.slides)?raw.slides:[];const n=d.raw.images.length;return list.slice(0,12).map((x,i)=>{const kind=KINDS.some(k=>k[0]===x.kind)?x.kind:(i===0?'hook':i===list.length-1?'summary':'point');let layout=LAY[x.layout]?x.layout:KIND_LAY[kind]||'text';const img=+x.image||0;const key=img>0&&img<=n?d.raw.images[img-1].k:'';if(LAY[layout].photo&&!key)layout=kind==='hook'?'title':'text';
  return {id:uid('s'),kind,layout,title:String(x.title||'').trim(),text:String(x.text||'').trim(),items:Array.isArray(x.items)?x.items.map(s=>String(s).trim()).filter(Boolean).slice(0,5):[],stat:String(x.stat||'').trim(),label:String(x.label||'').trim(),img:key,source:['given','verified','creative'].includes(x.source)?x.source:'creative',locked:false,postId:''}})}
async function generate(){const d=D();if(!d||S.busy)return;if(!d.raw.text.trim()&&!d.raw.topic.trim()&&!d.raw.urlText&&!d.raw.images.length){S.err='צריך לפחות נושא, טקסט, קישור או תמונה';paint();return}
  S.busy='Claude (Opus 5.5) בונה את סיפור הקרוסלה…';S.err='';paint();
  try{const imgs=await imgInputs(d.raw.images.map(i=>i.k));const r=await ask(contentPrompt(d),imgs,'content');const slides=cleanSlides(r,d);if(!slides.length)throw new Error('Claude לא החזיר שקופיות');
    const locked=d.content?d.content.slides.filter(s=>s.locked):[];
    d.content={topic:String(r.topic||'').slice(0,120),audience:String(r.audience||'').slice(0,120),angle:String(r.angle||'').slice(0,200),value:String(r.value||'').slice(0,200),slides,caption:String(r.caption||'').trim(),hashtags:Array.isArray(r.hashtags)?r.hashtags.map(h=>String(h).replace(/^#/,'').trim()).filter(Boolean).slice(0,8):[],cta:String(r.cta||'').trim(),facts:{given:(r.facts&&r.facts.given||[]).map(String),verified:(r.facts&&r.facts.verified||[]).map(String),creative:(r.facts&&r.facts.creative||[]).map(String)}};
    locked.forEach(ls=>{const k=d.content.slides.findIndex(x=>x.kind===ls.kind);if(k>=0)d.content.slides[k]=ls;else d.content.slides.push(ls)});
    if(!d.name||d.name==='קרוסלה חדשה')d.name=(d.content.slides[0].title||d.content.topic||'קרוסלה').slice(0,50);
    S.step=2;S.hist=[];S.fut=[];persist()}
  catch(e){S.err=e&&e.code==='rate_limited'?'יותר מדי בקשות, נסו בעוד דקה':(e&&e.message)||'הכתיבה נכשלה'}S.busy='';paint()}
async function regen(i,note){const d=D();if(!d||!d.content||S.busy)return;S.busy='Claude כותב גרסה חדשה לשקופית '+(i+1)+'…';paint();
  try{const imgs=await imgInputs(d.raw.images.map(x=>x.k));const r=await ask(slidePrompt(d,i,note),imgs,'slide');const ns=cleanSlides({slides:[r&&r.slide]},d)[0];if(!ns)throw new Error('לא התקבלה שקופית');push();const old=d.content.slides[i];ns.id=old.id;ns.postId=old.postId;ns.locked=old.locked;if(!ns.img)ns.img=old.img;d.content.slides[i]=ns;if(old.postId)syncPost(d,ns);persist()}
  catch(e){S.err=(e&&e.message)||'הכתיבה נכשלה'}S.busy='';paint()}
async function claudeQa(){const d=D();if(!d||!d.content||S.busy)return;S.busy='Claude בודק ניסוח וכתיב…';paint();try{const r=await ask(qaPrompt(d),[],'qa');S.claudeQa=Array.isArray(r&&r.issues)?r.issues.slice(0,20):[]}catch(e){S.err=(e&&e.message)||'הבדיקה נכשלה'}S.busy='';paint()}
async function readUrl(){const d=D();if(!d)return;const url=d.raw.url.trim();if(!/^https?:\/\//.test(url)){S.err='כתובת צריכה להתחיל ב-http';paint();return}S.busy='קורא את העמוד…';paint();
  try{let j;if(window.__v227mock)j=await window.__v227mock('url',url,[]);else{const tok=window.__engineToken?await window.__engineToken():null;if(!tok)throw new Error('קריאת קישורים עובדת כשהמנוע פתוח מהאתר עם התחברות');const r=await fetch('/api/fetch-url',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+tok},body:JSON.stringify({url})});j=await r.json().catch(()=>({}));if(!r.ok||!j.ok)throw new Error(j.error||'הקריאה נכשלה')}
    d.raw.urlTitle=j.title||'';d.raw.urlText=j.text||'';if(!d.raw.topic&&j.title)d.raw.topic=j.title;persist();say('העמוד נקרא: '+(j.text||'').length+' תווים')}
  catch(e){S.err=(e&&e.message)||'הקריאה נכשלה'}S.busy='';paint()}

// ---------- images ----------
async function addImages(files){const d=D();if(!d)return;for(const f of [...files].filter(f=>/^image\//.test(f.type))){try{const im=await new Promise((res,rej)=>{const u=URL.createObjectURL(f);const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=u});const w=im.naturalWidth,h=im.naturalHeight;let rec=null;
    if(typeof KC!=='undefined'&&KC.assets){try{const r=await KC.assets.upload(f);const meta={name:f.name,project:d.project!=='general'?d.project:'',kind:'site',tags:'carousel',w,h,addedAt:new Date().toISOString(),url:r.url};if(KC.db)try{await KC.db.collection('photos').doc(r.id).set(meta)}catch(e){}if(typeof regUpload==='function')regUpload(r.id,meta);rec={k:'u_'+r.id,url:r.url,name:f.name,w,h,cloud:true}}catch(e){console.warn('v227 upload',e)}}
    if(!rec){const id='local'+uid('');const url=URL.createObjectURL(f);try{KC.up[id]={name:f.name,url,w,h,local:1};PHOTO_LIB['u_'+id]=url;LIB_NAMES['u_'+id]=f.name+' (רק בדפדפן הזה)'}catch(e){}rec={k:'u_'+id,url,name:f.name,w,h,cloud:false}}
    d.raw.images.push(rec);if(!d.raw.cover)d.raw.cover=rec.k}catch(e){say('קובץ לא נקרא כתמונה: '+f.name)}}persist();paint()}
function imgUrl(k){try{return (PHOTO_LIB&&PHOTO_LIB[k])||''}catch(e){return ''}}

// ---------- posts (one per slide) ----------
function postsOf(d){const ids=new Set((d.content?d.content.slides:[]).map(s=>s.postId).filter(Boolean));return (AG.posts||[]).filter(q=>ids.has(q.id))}
function postOf(s){return (AG.posts||[]).find(q=>q.id===s.postId)||null}
function base(){try{if(window.__v222&&__v222.demoPost){const b=__v222.demoPost();if(b)return b}}catch(e){}return (AG.posts||[]).find(p=>/^x_t_/.test(p.layout))||AG.posts[0]}
function visualOf(s,d){const v={headline:s.title||'',sub:'',eyebrow:s.label||'',cta:d.content.cta||'לפרטים',items:[]};
  if(s.layout==='list')v.sub=(s.items&&s.items.length?s.items:String(s.text||'').split(/\n|\. /).map(x=>x.trim()).filter(Boolean)).slice(0,5).join('\n');
  else if(s.layout==='stat'){v.headline=s.stat||s.title||'';v.sub=s.label||s.text||s.title||'';v.eyebrow=s.label&&s.text?s.text:''}
  else v.sub=s.text||(s.items&&s.items.length?s.items.join('. '):'');
  if(s.layout==='cta'&&!v.sub)v.sub=s.text||'';return v}
function syncPost(d,s){let q=postOf(s);const n=d.content.slides.length,i=d.content.slides.indexOf(s);const spec=LAY[s.layout]||LAY.text;
  if(!q){const b=base();if(!b)return null;q=clonePost(b);q.id=uid('p');q.visual=visualOf(s,d);q.fx=Object.assign({},q.fx||{},{tov:undefined,deco:undefined});delete q.key;delete q.flag;q.src='carousel';q.tpl=1;q.car={id:d.id};q.series='קרוסלה · '+d.name;q.project=d.project;q.__new=1;s.postId=q.id}
  const vis=visualOf(s,d);q.visual=Object.assign({},q.visual,vis);
  if(q.layout!==spec.id){try{peConvert(q,spec.id)}catch(e){console.warn('v227 convert',e)}if(q.layout!==spec.id)q.layout=spec.id}
  q.visual=Object.assign({},q.visual,vis);q.fx=q.fx||{};q.fx.issue=(i+1)+'/'+n;q.fx.theme=spec.theme;q.car={id:d.id,i,n};q.series='קרוסלה · '+d.name;q.fb=i===0?(d.content.caption||'')+(d.content.hashtags&&d.content.hashtags.length?'\n\n'+d.content.hashtags.map(h=>'#'+h).join(' '):''):'שקופית '+(i+1)+' מתוך '+n+' · '+d.name;q.upd=new Date().toISOString();
  if(spec.photo){let k=s.img||d.raw.cover||'';if(!k){try{const kinds=d.project!=='general'&&typeof hasRender==='function'&&hasRender(d.project)?['render','site','aerial']:['site','aerial','render'];const sh=pickShots(kinds,1,{project:d.project,minW:.5});if(sh[0])k=sh[0].k}catch(e){}}
    try{peSlots(q).forEach(sl=>{if(sl.o&&k){sl.o.k=k;sl.o.r=[0,0,1,1];delete sl.o.src;delete sl.o.url}})}catch(e){}}
  if(d.brand==='afik'&&window.__v178&&__v178.cloneOne&&!q.brand){try{const a=__v178.cloneOne(q);delete a.clonedFrom;const k=AG.posts.indexOf(q);if(k>=0)AG.posts[k]=a;s.postId=a.id;q=a}catch(e){q.brand='afik'}}
  // a new post joins the list only now, complete, so a cloud sync never sees a half built copy
  if(q.__new){delete q.__new;if(!AG.posts.includes(q))AG.posts.unshift(q)}
  S.thumbs[q.id]=null;return q}
function build(){const d=D();if(!d||!d.content)return;push();d.content.slides.forEach(s=>{try{syncPost(d,s)}catch(e){console.warn('v227 sync',s.layout,e)}});heal(d);setTimeout(()=>{if(heal(d)){S.thumbs={};paint()}},1500);try{saveAgent()}catch(e){}d.status='designed';S.step=3;S.qa=null;persist();paint()}
// the cloud poller can hand back a stale copy of a post that was written mid-conversion (local storage full, write storm):
// a slide whose post lost its layout or number is synced again from the slide content before anything is read from it
function heal(d){if(!d||!d.content)return;const n=d.content.slides.length;let fixed=0;d.content.slides.forEach((s,i)=>{const q=postOf(s);if(!q)return;const spec=LAY[s.layout]||LAY.text;if(q.layout!==spec.id||!q.fx||q.fx.issue!==(i+1)+'/'+n||!q.car||q.car.id!==d.id){syncPost(d,s);fixed++}});if(fixed){try{saveAgent()}catch(e){}}return fixed}
function pullFromPosts(d){if(!d||!d.content)return;d.content.slides.forEach(s=>{const q=postOf(s);if(!q)return;const v=q.visual||{};if(s.layout==='stat'){s.stat=v.headline||s.stat;s.label=v.sub||s.label}else{s.title=v.headline||s.title;if(s.layout==='list')s.items=String(v.sub||'').split('\n').map(x=>x.trim()).filter(Boolean);else s.text=v.sub||s.text}const lay=Object.values(LAY).find(l=>l.id===q.layout);if(lay)s.layout=Object.keys(LAY).find(k=>LAY[k]===lay)||s.layout})}
function renumber(d){const n=d.content.slides.length;d.content.slides.forEach((s,i)=>{const q=postOf(s);if(q){q.fx=q.fx||{};q.fx.issue=(i+1)+'/'+n;q.car={id:d.id,i,n};S.thumbs[q.id]=null}})}
function removeSlide(d,i){const s=d.content.slides[i];if(s.postId){const k=AG.posts.findIndex(q=>q.id===s.postId);if(k>=0)AG.posts.splice(k,1)}d.content.slides.splice(i,1);renumber(d);try{saveAgent()}catch(e){}}
async function thumb(q,cv){try{if(!cv||!q)return;await ensureImgs(q);const big=peCanvas(q,0);const c=document.createElement('canvas');c.width=270;c.height=338;c.getContext('2d').drawImage(big,0,0,270,338);S.thumbs[q.id]=c;if(cv.isConnected)cv.getContext('2d').drawImage(c,0,0)}catch(e){console.warn('v227 thumb',e)}}
function drawThumbs(){const d=D();if(!d||!d.content)return;d.content.slides.forEach(s=>{const q=postOf(s);const cv=document.querySelector(`canvas[data-v227cv="${s.id}"]`);if(!q||!cv||cv.dataset.done)return;cv.dataset.done='1';const c=S.thumbs[q.id];if(c&&c.width){cv.getContext('2d').drawImage(c,0,0)}else thumb(q,cv)})}

// ---------- quality ----------
const STOP=new Set(['את','של','על','עם','לא','זה','גם','או','כל','אם','יש','אין','מה','איך','למה','כי','הוא','היא','הם','אנחנו','אתם','כך','רק','עוד','כבר','אבל','וגם','בין','אל','עד','מאוד','יותר','פחות','הכי']);
const words=s=>String(s||'').toLowerCase().replace(/[^֐-׿a-z0-9\s]/g,' ').split(/\s+/).filter(w=>w.length>1&&!STOP.has(w));
const jacc=(a,b)=>{const A=new Set(words(a)),B=new Set(words(b));if(!A.size||!B.size)return 0;let n=0;A.forEach(w=>{if(B.has(w))n++});return n/(A.size+B.size-n)};
function runQa(d){const out=[];if(!d||!d.content)return out;const sl=d.content.slides;const he=d.lang==='he';
  sl.forEach((s,i)=>{const k=i+1;const lay=LAY[s.layout]||LAY.text;const title=s.layout==='stat'?s.stat:s.title;const text=s.layout==='list'?s.items.join(' '):s.text;
    if(!title&&!text)out.push({i,level:'bad',t:`שקופית ${k}: ריקה`});
    const tw=words(s.title).length;if(s.title&&((s.layout==='title'&&tw>9)||(s.layout!=='title'&&s.title.length>70)))out.push({i,level:'warn',t:`שקופית ${k}: הכותרת ארוכה (${s.title.length} תווים). הטקסט יקטן כדי להיכנס, ובטלפון יהיה קשה לקרוא`});
    if(s.text&&s.text.length>(s.layout==='text'?330:240))out.push({i,level:'warn',t:`שקופית ${k}: הטקסט ארוך (${s.text.length} תווים) ועלול לגלוש או להיות קטן מדי`});
    if(s.layout==='list'){if(s.items.length>5)out.push({i,level:'warn',t:`שקופית ${k}: יותר מחמש שורות ברשימה, השישית לא תוצג`});if(s.items.some(x=>x.length>60))out.push({i,level:'warn',t:`שקופית ${k}: שורה ברשימה ארוכה מ-60 תווים`});if(s.items.length<2)out.push({i,level:'warn',t:`שקופית ${k}: רשימה עם פחות משתי שורות`})}
    if(s.layout==='stat'&&!s.stat)out.push({i,level:'bad',t:`שקופית ${k}: נתון מרכזי בלי מספר`});
    if(lay.photo){const q=postOf(s);let k2=s.img||d.raw.cover;try{if(q){const sl0=peSlots(q)[0];if(sl0&&sl0.o&&sl0.o.k)k2=sl0.o.k}}catch(e){}if(!k2)out.push({i,level:'bad',t:`שקופית ${k}: פריסת תמונה בלי תמונה`});else{const im=d.raw.images.find(x=>x.k===k2);if(im&&im.w&&Math.max(im.w,im.h)<1000)out.push({i,level:'warn',t:`שקופית ${k}: התמונה קטנה (${im.w}×${im.h}), עלולה להיראות מטושטשת`})}}
    if(s.source==='creative'&&/\d/.test(title+' '+text))out.push({i,level:'warn',t:`שקופית ${k}: מספר בלי מקור בחומר הגלם. לאמת או להסיר`});
    const all=title+' '+text;const lat=(all.match(/[A-Za-z]/g)||[]).length,hebr=(all.match(/[֐-׿]/g)||[]).length;if(he&&lat>hebr&&hebr>0)out.push({i,level:'warn',t:`שקופית ${k}: הרבה אנגלית בתוך עברית, לבדוק כיווניות`});
    if(/[—–]|\s-\s/.test(all))out.push({i,level:'warn',t:`שקופית ${k}: מקף כסימן פיסוק`});
    for(let j=0;j<i;j++){const o=sl[j];if(jacc(o.title+' '+o.text,s.title+' '+s.text)>.6)out.push({i,level:'warn',t:`שקופיות ${j+1} ו-${k} חוזרות על אותו מסר`})}});
  if(sl.length>1){const hook=new Set(words(sl[0].title));const rest=words(sl.slice(1).map(s=>s.title+' '+s.text).join(' '));if(hook.size&&!rest.some(w=>hook.has(w)))out.push({i:0,level:'warn',t:'הכותרת הראשית לא חוזרת באף מילה בשאר הקרוסלה. לבדוק שההוק מתאים לתוכן'})}
  if(!(d.content.caption||'').trim())out.push({i:-1,level:'warn',t:'אין כיתוב לפוסט'});
  out.push({i:-1,level:'ok',t:'פונטים, צבעים, לוגו ושוליים: לפי ערכת המותג בכל השקופיות'});return out}

// ---------- export ----------
function crcTable(){const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0}return t}
const CRC=crcTable();const crc32=b=>{let c=0xFFFFFFFF;for(let i=0;i<b.length;i++)c=CRC[(c^b[i])&255]^(c>>>8);return (c^0xFFFFFFFF)>>>0};
function zip(files){const enc=new TextEncoder();const parts=[];const cd=[];let off=0;const le16=n=>[n&255,(n>>8)&255],le32=n=>[n&255,(n>>8)&255,(n>>16)&255,(n>>>24)&255];
  files.forEach(f=>{const name=enc.encode(f.name);const data=f.data;const crc=crc32(data);const head=new Uint8Array([0x50,0x4b,3,4,...le16(20),...le16(0x800),...le16(0),...le16(0),...le16(0),...le32(crc),...le32(data.length),...le32(data.length),...le16(name.length),...le16(0)]);parts.push(head,name,data);
    cd.push(new Uint8Array([0x50,0x4b,1,2,...le16(20),...le16(20),...le16(0x800),...le16(0),...le16(0),...le16(0),...le32(crc),...le32(data.length),...le32(data.length),...le16(name.length),...le16(0),...le16(0),...le16(0),...le16(0),...le32(0),...le32(off)]),name);off+=head.length+name.length+data.length});
  const cdStart=off;let cdLen=0;cd.forEach(x=>cdLen+=x.length);const end=new Uint8Array([0x50,0x4b,5,6,...le16(0),...le16(0),...le16(files.length),...le16(files.length),...le32(cdLen),...le32(cdStart),...le16(0)]);return new Blob([...parts,...cd,end],{type:'application/zip'})}
async function slidePng(q,fmt){await ensureImgs(q);let cv=peCanvas(q,0);if(fmt&&fmt!=='45'&&typeof peFmtCanvas==='function')cv=peFmtCanvas(cv,q,fmt);return new Promise(r=>cv.toBlob(r,'image/png'))}
function dl(blob,name){if(typeof saveBlob==='function')return saveBlob(blob,name);const u=URL.createObjectURL(blob);const a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),4000)}
const slug=s=>String(s||'carousel').replace(/[^֐-׿A-Za-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40)||'carousel';
async function exportAll(asZip){const d=D();if(!d||!d.content)return;heal(d);S.busy=asZip?'מכין ZIP…':'מייצא PNG לכל שקופית…';paint();try{const files=[];let i=0;for(const s of d.content.slides){const q=postOf(s);if(!q)continue;i++;const b=await slidePng(q,d.fmt);const name=`${slug(d.name)}-${String(i).padStart(2,'0')}.png`;if(asZip)files.push({name,data:new Uint8Array(await b.arrayBuffer())});else{await dl(b,name);await new Promise(r=>setTimeout(r,350))}}
    if(asZip){files.push({name:'texts.txt',data:new TextEncoder().encode(textsOf(d))});await dl(zip(files),slug(d.name)+'.zip')}say(asZip?'ה-ZIP ירד':'כל השקופיות ירדו')}catch(e){S.err='הייצוא נכשל: '+((e&&e.message)||e)}S.busy='';paint()}
function textsOf(d){const c=d.content;return [d.name,'',...c.slides.map((s,i)=>`${i+1}. ${s.layout==='stat'?s.stat+' · '+s.label:s.title}${s.text?'\n'+s.text:''}${s.items&&s.items.length?'\n'+s.items.map(x=>'• '+x).join('\n'):''}`),'','כיתוב:',c.caption||'',c.hashtags&&c.hashtags.length?c.hashtags.map(h=>'#'+h).join(' '):'',c.cta?'קריאה לפעולה: '+c.cta:''].join('\n')}
async function copy(t){try{await navigator.clipboard.writeText(t);say('הועתק')}catch(e){say('לא הצלחתי להעתיק')}}

// ---------- pages ----------
const opt=(arr,v)=>arr.map(([k,l])=>`<option value="${k}"${String(v)===String(k)?' selected':''}>${l}</option>`).join('');
function stepsHtml(d){const can2=!!(d&&d.content),can3=!!(d&&d.content&&d.content.slides.some(s=>s.postId));return `<div class="v227steps" role="list">${[[1,'חומרי גלם',true],[2,'תוכן ואישור',can2],[3,'עיצוב וייצוא',can3]].map(([n,l,ok])=>`<button type="button" data-v227="step" data-n="${n}" aria-current="${S.step===n?'step':'false'}" ${ok?'':'disabled'}><i>${n}</i>${l}</button>`).join('')}</div>`}
function sideHtml(){const list=Object.values(S.list).sort((a,b)=>(b.updated||'')>(a.updated||'')?1:-1);return `<div class="v227card"><h3>הקרוסלות שלי <small>${list.length}</small></h3><button type="button" class="v227b navy" data-v227="new">+ קרוסלה חדשה</button>${list.length?`<div class="v227projs">${list.slice(0,30).map(x=>`<button type="button" data-v227="open" data-id="${x.id}" aria-current="${S.cur===x.id}"><b>${E(x.name)}</b><small>${lab(PLATS,x.platform)} · ${x.content?x.content.slides.length+' שקופיות':'בלי תוכן עדיין'} · ${({draft:'טיוטה',designed:'מעוצבת',ready:'מוכנה'})[x.status]||x.status}</small></button>`).join('')}</div>`:'<p class="v227hint">עוד אין קרוסלות. מתחילים מתמונה, מטקסט או מנושא.</p>'}</div>`}
function rawHtml(d){const r=d.raw;return `<div class="v227card"><h3>1 · חומרי גלם</h3><p class="v227hint">אפשר להתחיל מתמונה בלבד, מטקסט בלבד, מנושא, ממסמך או מקישור. Claude (Opus 5.5) בונה מזה סיפור, ולא רק מחלק פסקאות.</p>
  <label class="v227f">שם הקרוסלה<input type="text" data-v227f="name" value="${E(d.name)}"></label>
  <label class="v227f">נושא (או רעיון במשפט)<input type="text" data-v227f="raw.topic" value="${E(r.topic)}" placeholder="למשל: חמש בדיקות לפני שחותמים עם קבלן"></label>
  <label class="v227f">טקסט, מאמר, פוסט קיים, נתונים או תוכן מקצועי<textarea data-v227f="raw.text" placeholder="מדביקים כאן חומר גלם. אפשר גם להעלות מסמך טקסט">${E(r.text)}</textarea></label>
  <div class="v227two"><label class="v227f">קישור למקור מידע<input type="url" data-v227f="raw.url" value="${E(r.url)}" placeholder="https://"></label><div class="v227f"><span>&nbsp;</span><button type="button" class="v227b" data-v227="readurl" ${S.busy?'disabled':''}>קריאת העמוד${r.urlText?' ✓ ('+r.urlText.length+' תווים)':''}</button></div></div>
  <div class="v227f"><span>תמונות (הכוכב מסמן את תמונת הקאבר)</span><div class="v227imgs">${r.images.map(im=>`<figure class="${d.raw.cover===im.k?'cover':''}"><img src="${E(imgUrl(im.k)||im.url)}" alt="${E(im.name)}"><figcaption><button type="button" data-v227="cover" data-k="${E(im.k)}" title="קאבר">★</button><button type="button" data-v227="imgx" data-k="${E(im.k)}" title="הסרה">✕</button></figcaption></figure>`).join('')}<label class="add"><input type="file" accept="image/*" multiple data-v227="imgs" hidden>+ תמונה</label><label class="add"><input type="file" accept=".txt,.md,.csv,.json" data-v227="docf" hidden>+ מסמך</label></div></div>
  <label class="v227f">הערות והנחיות מיוחדות לתוכן ולעיצוב<textarea data-v227f="raw.notes" rows="2" placeholder="למשל: לא להזכיר מחירים, להתחיל מהשאלה של הלקוח, טון רגוע">${E(r.notes)}</textarea></label></div>
  <div class="v227card"><h3>הגדרות הקרוסלה</h3><div class="v227three"><label class="v227f">מותג<select data-v227f="brand">${opt(BRANDS,d.brand)}</select></label><label class="v227f">פלטפורמה<select data-v227f="platform">${opt(PLATS,d.platform)}</select></label><label class="v227f">פורמט<select data-v227f="fmt">${opt(FMTS,d.fmt)}</select></label></div>
  <div class="v227three"><label class="v227f">מספר שקופיות<select data-v227f="n">${opt([['auto','המערכת מציעה'],...[3,4,5,6,7,8,9,10].map(n=>[String(n),String(n)])],d.n)}</select></label><label class="v227f">מטרת התוכן<select data-v227f="goal">${opt(GOALS,d.goal)}</select></label><label class="v227f">סגנון<select data-v227f="style">${opt(STYLES,d.style)}</select></label></div>
  <div class="v227three"><label class="v227f">רמת פירוט<select data-v227f="depth">${opt(DEPTHS,d.depth)}</select></label><label class="v227f">שפה<select data-v227f="lang">${opt(LANGS,d.lang)}</select></label><label class="v227f">פרויקט (לעובדות ולתמונות)<select data-v227f="project">${opt(PROJS,d.project)}</select></label></div>
  <div class="v227top"><button type="button" class="v227b pri" data-v227="generate" ${S.busy?'disabled':''}>✦ לכתוב את הקרוסלה${d.content?' מחדש':''}</button>${d.content?'<small class="v227ver">שקופיות נעולות נשמרות גם בכתיבה מחדש</small>':''}</div></div>`}
function slideCard(d,s,i,n){const srcL={given:'מהחומר',verified:'עובדה מאומתת',creative:'ניסוח / ידע כללי'};return `<div class="v227slide${s.locked?' locked':''}" data-v227s="${s.id}"><div class="n">${i+1}</div><div class="body">
  <div class="row"><select data-v227sf="kind" data-id="${s.id}" aria-label="סוג">${opt(KINDS,s.kind)}</select><select data-v227sf="layout" data-id="${s.id}" aria-label="פריסה">${opt(LAYOUTS.map(l=>[l[0],l[1]]),s.layout)}</select><span class="src ${s.source}">${srcL[s.source]||s.source}</span><span class="v227sp"></span>
   <button type="button" class="v227b sm" data-v227="up" data-id="${s.id}" ${i?'':'disabled'} aria-label="למעלה">↑</button><button type="button" class="v227b sm" data-v227="down" data-id="${s.id}" ${i<n-1?'':'disabled'} aria-label="למטה">↓</button><button type="button" class="v227b sm" data-v227="lock" data-id="${s.id}" aria-pressed="${s.locked}" title="נעילה: לא משתנה בכתיבה מחדש">${s.locked?'🔒':'🔓'}</button><button type="button" class="v227b sm" data-v227="regen" data-id="${s.id}" ${S.busy?'disabled':''}>✦ גרסה חדשה</button><button type="button" class="v227b sm" data-v227="dup" data-id="${s.id}">שכפול</button><button type="button" class="v227b sm dz" data-v227="del" data-id="${s.id}">מחיקה</button></div>
  ${s.layout==='stat'?`<div class="v227two"><input type="text" data-v227sf="stat" data-id="${s.id}" value="${E(s.stat)}" placeholder="המספר, למשל 6 או 150 מ״ר"><input type="text" data-v227sf="label" data-id="${s.id}" value="${E(s.label)}" placeholder="תווית קצרה"></div>`:`<input type="text" data-v227sf="title" data-id="${s.id}" value="${E(s.title)}" placeholder="כותרת">`}
  ${s.layout==='list'?`<textarea data-v227sf="items" data-id="${s.id}" placeholder="שורה לכל פריט">${E(s.items.join('\n'))}</textarea>`:`<textarea data-v227sf="text" data-id="${s.id}" placeholder="${s.layout==='compare'?'הצד השני של ההשוואה':s.layout==='quote'?'ההקשר של הציטוט':'הטקסט'}">${E(s.text)}</textarea>`}
  ${(LAY[s.layout]||{}).photo?`<div class="imgpick"><small>תמונה:</small>${d.raw.images.map(im=>`<img src="${E(imgUrl(im.k)||im.url)}" alt="${E(im.name)}" data-v227="pick" data-id="${s.id}" data-k="${E(im.k)}" aria-pressed="${s.img===im.k}">`).join('')}${d.raw.images.length?'':'<small class="v227hint">אין תמונות שהועלו, תיבחר תמונה מספריית הפרויקט</small>'}</div>`:''}</div></div>`}
function contentHtml(d){const c=d.content;const n=c.slides.length;return `<div class="v227card"><h3>2 · תוכן ואישור</h3><div class="v227chips"><span>נושא: ${E(c.topic)}</span><span>קהל: ${E(c.audience)}</span><span>זווית: ${E(c.angle)}</span><span>הערך לקורא: ${E(c.value)}</span></div>
  <p class="v227hint">עורכים כל שקופית, משנים סוג ופריסה, נועלים מה שטוב, ומבקשים גרסה חדשה רק לשקופית אחת. אישור עובר לעיצוב, בלי ליצור מחדש את מה שכבר אושר.</p>
  <div class="v227list">${c.slides.map((s,i)=>slideCard(d,s,i,n)).join('')}</div>
  <div class="v227top"><button type="button" class="v227b" data-v227="add">+ שקופית</button><span class="v227sp"></span><button type="button" class="v227b" data-v227="undo" ${S.hist.length?'':'disabled'}>↶ ביטול</button><button type="button" class="v227b" data-v227="redo" ${S.fut.length?'':'disabled'}>↷ חזרה</button><button type="button" class="v227b pri" data-v227="build" ${S.busy?'disabled':''}>אישור התוכן ועיצוב</button></div></div>
  <div class="v227card"><h4>עובדות מול הצעות</h4><div class="v227facts">${[['given','מהחומר שסופק'],['verified','מאומת'],['creative','יצירתי / ידע כללי, לאמת לפני פרסום']].map(([k,l])=>`<div><b>${l}</b>${(c.facts[k]||[]).length?`<ul>${c.facts[k].map(x=>`<li>${E(x)}</li>`).join('')}</ul>`:'<p class="v227hint">אין</p>'}</div>`).join('')}</div></div>
  <div class="v227card v227cap"><h4>כיתוב לפוסט, קריאה לפעולה והאשטגים</h4><label class="v227f">כיתוב<textarea data-v227f="content.caption">${E(c.caption)}</textarea></label><div class="v227two"><label class="v227f">קריאה לפעולה<input type="text" data-v227f="content.cta" value="${E(c.cta)}"></label><label class="v227f">האשטגים (מופרדים ברווח)<input type="text" data-v227f="content.hashtags" value="${E(c.hashtags.map(h=>'#'+h).join(' '))}"></label></div></div>`}
function deckHtml(d){const c=d.content;const n=c.slides.length;return `<div class="v227card"><h3>3 · עיצוב וייצוא</h3><p class="v227hint">כל שקופית היא פוסט אמיתי בשפת המותג: לחיצה על התמונה פותחת תצוגה גדולה, "עריכה" פותחת את עורך הפוסטים המלא (טקסט, תמונה, צבע, פריסה, כל אלמנט). גוררים כדי לשנות סדר. שינוי בשקופית אחת לא נוגע בשאר.</p>
  <div class="v227deck">${c.slides.map((s,i)=>{const q=postOf(s);return `<div class="v227th" draggable="true" data-v227th="${s.id}"><span class="num">${i+1}/${n}</span><canvas data-v227cv="${s.id}" data-v227="zoom" data-i="${i}" width="270" height="338" aria-label="שקופית ${i+1}"></canvas><div class="t">${E(s.layout==='stat'?s.stat+' · '+s.label:s.title)}</div>
    <div class="acts"><button type="button" data-v227="edit" data-id="${s.id}" ${q?'':'disabled'}>עריכה</button><select data-v227sf="layout3" data-id="${s.id}" aria-label="פריסה">${opt(LAYOUTS.map(l=>[l[0],l[1]]),s.layout)}</select><button type="button" data-v227="regen3" data-id="${s.id}" ${S.busy?'disabled':''}>✦ וריאציה</button><button type="button" data-v227="dup3" data-id="${s.id}">שכפול</button><button type="button" data-v227="del3" data-id="${s.id}">מחיקה</button></div></div>`}).join('')}</div>
  <div class="v227top"><button type="button" class="v227b" data-v227="add3">+ שקופית</button><button type="button" class="v227b" data-v227="undo" ${S.hist.length?'':'disabled'}>↶ ביטול</button><button type="button" class="v227b" data-v227="redo" ${S.fut.length?'':'disabled'}>↷ חזרה</button><span class="v227sp"></span><button type="button" class="v227b" data-v227="qa">בדיקות איכות</button><button type="button" class="v227b" data-v227="cqa" ${S.busy?'disabled':''}>✦ בדיקת ניסוח עם Claude</button></div>
  ${S.qa?`<ul class="v227qa">${S.qa.map(x=>`<li class="${x.level}"><b>${x.level==='bad'?'✕':x.level==='warn'?'!':'✓'}</b><span>${E(x.t)}</span>${x.i>=0?`<button type="button" data-v227="goto" data-i="${x.i}">לשקופית</button>`:''}</li>`).join('')}</ul>`:''}
  ${S.claudeQa?`<ul class="v227qa">${S.claudeQa.length?S.claudeQa.map(x=>`<li class="warn"><b>${E(x.slide)}</b><span>${E(x.what)}${x.fix?' · תיקון: '+E(x.fix):''}</span></li>`).join(''):'<li class="ok"><b>✓</b><span>Claude לא מצא שגיאות ניסוח או כתיב</span></li>'}</ul>`:''}</div>
  <div class="v227card"><h4>ייצוא ושמירה</h4><div class="v227top"><button type="button" class="v227b pri" data-v227="zip" ${S.busy?'disabled':''}>⤓ ZIP של כל השקופיות (PNG)</button><button type="button" class="v227b" data-v227="pngs" ${S.busy?'disabled':''}>PNG לכל שקופית בנפרד</button><button type="button" class="v227b" data-v227="texts">העתקת הטקסטים</button><button type="button" class="v227b" data-v227="caption">העתקת הכיתוב וההאשטגים</button></div>
  <div class="v227top"><button type="button" class="v227b" data-v227="version">שמירת גרסה</button><button type="button" class="v227b" data-v227="gallery">לפוסטים של הקרוסלה בגלריה</button><button type="button" class="v227b" data-v227="ready">סימון כמוכנה לפרסום</button><span class="v227ver">${d.versions.length?d.versions.length+' גרסאות שמורות · ':''}הפורמט: ${lab(FMTS,d.fmt)} · ${lab(PLATS,d.platform)}</span></div>
  ${d.versions.length?`<div class="v227projs">${d.versions.slice().reverse().slice(0,6).map((v,k)=>`<button type="button" data-v227="restore" data-at="${E(v.at)}"><b>גרסה ${d.versions.length-k}</b><small>${new Date(v.at).toLocaleString('he-IL')} · ${v.content.slides.length} שקופיות</small></button>`).join('')}</div>`:''}
  <p class="v227hint">הפוסטים של הקרוסלה נמצאים גם בגלריית הפוסטים (סדרה "קרוסלה · ${E(d.name)}"), ומשם מתזמנים אותם כמו כל פוסט. פרסום של כל השקופיות כפוסט אחד מרובה תמונות ייכנס עם חיבור הערוצים.</p></div>`}
function page(){const d=D();return `<div class="v227"><div class="v227top">${d?stepsHtml(d):''}<span class="v227sp"></span>${d?`<span class="v227ver">${d.name} · נשמר אוטומטית</span>`:''}</div>
  ${S.err?`<p class="v227err">${E(S.err)} <button type="button" class="v227b sm" data-v227="errx">סגירה</button></p>`:''}${S.busy?`<div class="v227busy"><i></i>${E(S.busy)}</div>`:''}
  <div class="v227grid"><div class="v227list">${!d?`<div class="v227card"><h3>Social Carousel Studio</h3><p class="v227hint">סטודיו לקרוסלות ממותגות בשלושה שלבים: חומרי גלם, תוכן ואישור, עיצוב וייצוא. התוכן נכתב על ידי Claude (Opus 5.5) כסיפור עם ערך אמיתי, והעיצוב נבנה מרכיבים אמיתיים של המותג שאפשר לערוך.</p><button type="button" class="v227b pri" data-v227="new">+ קרוסלה חדשה</button></div>`:S.step===1?rawHtml(d):S.step===2&&d.content?contentHtml(d):d.content?deckHtml(d):rawHtml(d)}</div><aside>${sideHtml()}</aside></div>
  ${S.zoom!=null&&d&&d.content?zoomHtml(d):''}</div>`}
function zoomHtml(d){const i=S.zoom;const s=d.content.slides[i];return `<div class="v227zoom" role="dialog" aria-label="תצוגה גדולה"><header><b>שקופית ${i+1} מתוך ${d.content.slides.length} · ${E(s.title||s.stat)}</b><button type="button" class="v227b sm" data-v227="edit" data-id="${s.id}">עריכה</button><button type="button" class="x" data-v227="zoomx" aria-label="סגירה">✕</button></header><div class="stage"><button type="button" data-v227="zoomn" data-d="1" aria-label="הבאה">‹</button><canvas id="v227big" width="1080" height="1350"></canvas><button type="button" data-v227="zoomn" data-d="-1" aria-label="הקודמת">›</button></div></div>`}
async function drawBig(){const d=D();if(!d||S.zoom==null)return;const s=d.content.slides[S.zoom];const q=s&&postOf(s);const cv=$('#v227big');if(!q||!cv)return;await ensureImgs(q);const big=peCanvas(q,0);cv.getContext('2d').drawImage(big,0,0)}
function paint(){if(typeof APP==='undefined'||APP.view!=='carousel')return;const root=document.getElementById('appviews');if(!root)return;const ae=document.activeElement;const keep=ae&&root.contains(ae)&&/INPUT|TEXTAREA/.test(ae.tagName)?{sel:ae.dataset.v227f||ae.dataset.v227sf,id:ae.dataset.id,s:ae.selectionStart}:null;const y=window.scrollY;
  const d=D();if(d&&S.step===3){heal(d);pullFromPosts(d)}root.innerHTML=page();window.scrollTo(0,y);
  if(keep){const el=root.querySelector(keep.id?`[data-v227sf="${keep.sel}"][data-id="${keep.id}"]`:`[data-v227f="${keep.sel}"]`);if(el){el.focus();try{el.setSelectionRange(keep.s,keep.s)}catch(e){}}}
  setTimeout(drawThumbs,0);if(S.zoom!=null)setTimeout(drawBig,0)}

// ---------- the view ----------
try{const grp=VIEWS.find(g=>g[0]==='תוכן');if(grp&&!grp[1].some(v=>v[0]==='carousel'))grp[1].push(['carousel','Social Carousel Studio','studio']);VTITLE.carousel=['Social Carousel Studio','קרוסלות ממותגות: חומרי גלם, תוכן ואישור, עיצוב וייצוא']}catch(e){}
try{render=(f=>function(){const v=typeof APP!=='undefined'?APP.view:'';if(v!=='carousel')return f.apply(this,arguments);renderNav();const [t,s]=VTITLE.carousel;const vt=document.getElementById('vt'),vs=document.getElementById('vs');if(vt)vt.textContent=t;if(vs)vs.textContent=s;document.querySelectorAll('.wrap > section').forEach(sec=>sec.classList.add('view-hidden'));const act=document.getElementById('vact');if(act)act.innerHTML='';const root=document.getElementById('appviews');if(root){root.classList.remove('view-hidden');if(!root.querySelector('.v227'))paint()}try{window.__v99&&__v99.ensureNav()}catch(e){}})(render)}catch(e){console.warn('v227 view',e)}
// the post editor closing refreshes the deck (the slide may have changed)
new MutationObserver(ms=>{if(typeof APP==='undefined'||APP.view!=='carousel'||S.step!==3)return;for(const m of ms)for(const n of m.removedNodes)if(n.id==='pe-root'){S.thumbs={};persist();paint();return}}).observe(document.body,{childList:true});

// ---------- events ----------
function setPath(d,path,v){const ps=path.split('.');let o=d;while(ps.length>1)o=o[ps.shift()];o[ps[0]]=v}
document.addEventListener('input',e=>{const t=e.target;if(!t.dataset)return;const d=D();if(!d)return;if(t.dataset.v227f){const k=t.dataset.v227f;if(k==='content.hashtags')d.content.hashtags=t.value.split(/[\s,]+/).map(h=>h.replace(/^#/,'').trim()).filter(Boolean);else setPath(d,k,t.value);if(k==='name'){const sp=document.querySelector('.v227ver');if(sp)sp.textContent=d.name+' · נשמר אוטומטית'}persist()}
  else if(t.dataset.v227sf){const s=d.content&&d.content.slides.find(x=>x.id===t.dataset.id);if(!s)return;const k=t.dataset.v227sf;if(k==='items')s.items=t.value.split('\n').map(x=>x.trim()).filter(Boolean);else if(k==='title'||k==='text'||k==='stat'||k==='label')s[k]=t.value;persist()}});
document.addEventListener('change',async e=>{const t=e.target;if(!t.dataset)return;const d=D();
  if(t.dataset.v227==='imgs'){await addImages(t.files);t.value='';return}
  if(t.dataset.v227==='docf'){const f=t.files&&t.files[0];if(f&&d){const txt=await f.text();d.raw.text=(d.raw.text?d.raw.text+'\n\n':'')+txt.slice(0,20000);persist();paint()}t.value='';return}
  if(!d)return;
  if(t.dataset.v227f&&t.tagName==='SELECT'){setPath(d,t.dataset.v227f,t.value);if(t.dataset.v227f==='brand'&&d.content){d.content.slides.forEach(s=>{s.postId=''});}persist();paint();return}
  if(t.dataset.v227sf){const s=d.content&&d.content.slides.find(x=>x.id===t.dataset.id);if(!s)return;const k=t.dataset.v227sf;
    if(k==='kind'){push();s.kind=t.value;if(!s.locked)s.layout=KIND_LAY[s.kind]||s.layout;if(LAY[s.layout].photo&&!s.img&&!d.raw.cover)s.layout=s.kind==='hook'?'title':'text';persist();paint();return}
    if(k==='layout'||k==='layout3'){push();s.layout=LAY[t.value]?t.value:s.layout;if(s.postId)syncPost(d,s);try{saveAgent()}catch(x){}persist();paint();return}
    push();if(k==='items')s.items=t.value.split('\n').map(x=>x.trim()).filter(Boolean);else s[k]=t.value;if(s.postId&&S.step===3)syncPost(d,s);persist();if(S.step===3)paint();return}});
document.addEventListener('click',async e=>{const b=e.target.closest&&e.target.closest('[data-v227]');if(!b||typeof APP==='undefined'||APP.view!=='carousel')return;const a=b.dataset.v227;const d=D();const id=b.dataset.id;const sl=d&&d.content?d.content.slides:[];const si=sl.findIndex(x=>x.id===id);const s=sl[si];
  if(a==='new'){newDoc();paint();return}if(a==='open'){S.cur=id;S.step=S.list[id].content?(S.list[id].content.slides.some(x=>x.postId)?3:2):1;S.hist=[];S.fut=[];S.qa=null;S.claudeQa=null;persist();paint();return}
  if(a==='step'){const n=+b.dataset.n;if(n===3&&d&&d.content&&!sl.some(x=>x.postId)){build();return}S.step=n;S.qa=null;paint();return}
  if(a==='errx'){S.err='';paint();return}if(!d)return;
  if(a==='generate')return generate();if(a==='readurl')return readUrl();if(a==='build')return build();
  if(a==='cover'){d.raw.cover=b.dataset.k;persist();paint();return}if(a==='imgx'){d.raw.images=d.raw.images.filter(x=>x.k!==b.dataset.k);if(d.raw.cover===b.dataset.k)d.raw.cover=(d.raw.images[0]||{}).k||'';persist();paint();return}
  if(a==='pick'&&s){s.img=s.img===b.dataset.k?'':b.dataset.k;if(s.postId)syncPost(d,s);persist();paint();return}
  if(a==='undo')return undo();if(a==='redo')return redo();
  if(a==='add'||a==='add3'){push();const ns={id:uid('s'),kind:'point',layout:'text',title:'',text:'',items:[],stat:'',label:'',img:'',source:'creative',locked:false,postId:''};sl.push(ns);if(a==='add3'){syncPost(d,ns);renumber(d);try{saveAgent()}catch(x){}}persist();paint();return}
  if((a==='dup'||a==='dup3')&&s){push();const c=JSON.parse(JSON.stringify(s));c.id=uid('s');c.postId='';c.locked=false;sl.splice(si+1,0,c);if(a==='dup3'){syncPost(d,c);renumber(d);try{saveAgent()}catch(x){}}persist();paint();return}
  if((a==='del'||a==='del3')&&s){if(sl.length<=1){say('קרוסלה צריכה לפחות שקופית אחת');return}push();removeSlide(d,si);persist();paint();return}
  if(a==='up'&&s&&si>0){push();sl.splice(si-1,0,sl.splice(si,1)[0]);renumber(d);persist();paint();return}if(a==='down'&&s&&si<sl.length-1){push();sl.splice(si+1,0,sl.splice(si,1)[0]);renumber(d);persist();paint();return}
  if(a==='lock'&&s){s.locked=!s.locked;persist();paint();return}
  if(a==='regen'&&s)return regen(si);if(a==='regen3'&&s){const note=prompt('מה לשנות בשקופית הזו? (אפשר להשאיר ריק)')||'';return regen(si,note)}
  if(a==='edit'&&s){const q=postOf(s);if(!q){say('קודם מאשרים את התוכן ומעצבים');return}try{PE.tab='text'}catch(x){}S.zoom=null;peOpen(q);return}
  if(a==='zoom'){S.zoom=+b.dataset.i;paint();return}if(a==='zoomx'){S.zoom=null;paint();return}if(a==='zoomn'){S.zoom=(S.zoom+(+b.dataset.d)+sl.length)%sl.length;paint();return}
  if(a==='goto'){const el=document.querySelector(`[data-v227th="${(sl[+b.dataset.i]||{}).id}"]`);if(el){el.scrollIntoView({behavior:'smooth',block:'center'});el.classList.add('over');setTimeout(()=>el.classList.remove('over'),1500)}return}
  if(a==='qa'){pullFromPosts(d);S.qa=runQa(d);S.claudeQa=null;paint();return}if(a==='cqa'){pullFromPosts(d);return claudeQa()}
  if(a==='zip')return exportAll(true);if(a==='pngs')return exportAll(false);
  if(a==='texts'){pullFromPosts(d);return copy(textsOf(d))}if(a==='caption'){return copy((d.content.caption||'')+'\n\n'+(d.content.hashtags||[]).map(h=>'#'+h).join(' '))}
  if(a==='version'){pullFromPosts(d);d.versions.push({at:new Date().toISOString(),content:JSON.parse(JSON.stringify(d.content))});if(d.versions.length>20)d.versions.shift();persist();paint();say('הגרסה נשמרה');return}
  if(a==='restore'){const v=d.versions.find(x=>x.at===b.dataset.at);if(!v)return;push();const ids=Object.fromEntries(d.content.slides.map(x=>[x.id,x.postId]));d.content=JSON.parse(JSON.stringify(v.content));d.content.slides.forEach(x=>{if(ids[x.id])x.postId=ids[x.id]});d.content.slides.forEach(x=>syncPost(d,x));renumber(d);try{saveAgent()}catch(x){}persist();paint();return}
  if(a==='gallery'){try{const f=JSON.parse(localStorage.getItem('v207_f')||'{}');f.q='קרוסלה · '+d.name;localStorage.setItem('v207_f',JSON.stringify(f))}catch(x){}try{go('gallery')}catch(x){}return}
  if(a==='ready'){d.status='ready';postsOf(d).forEach(q=>{q.status='approved';q.upd=new Date().toISOString()});try{saveAgent()}catch(x){}persist();paint();say('הקרוסלה סומנה כמוכנה. הפוסטים שלה מאושרים בגלריה ומוכנים לתזמון');return}
},true);
// drag to reorder the deck
document.addEventListener('dragstart',e=>{const th=e.target.closest&&e.target.closest('[data-v227th]');if(!th)return;S.drag=th.dataset.v227th;th.classList.add('drag');try{e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',S.drag)}catch(x){}});
document.addEventListener('dragover',e=>{const th=e.target.closest&&e.target.closest('[data-v227th]');if(!th||!S.drag)return;e.preventDefault();document.querySelectorAll('.v227th.over').forEach(x=>x.classList.remove('over'));th.classList.add('over')});
document.addEventListener('drop',e=>{const th=e.target.closest&&e.target.closest('[data-v227th]');if(!th||!S.drag)return;e.preventDefault();const d=D();if(!d||!d.content)return;const from=d.content.slides.findIndex(x=>x.id===S.drag),to=d.content.slides.findIndex(x=>x.id===th.dataset.v227th);S.drag=null;if(from<0||to<0||from===to){paint();return}push();const [m]=d.content.slides.splice(from,1);d.content.slides.splice(to,0,m);renumber(d);try{saveAgent()}catch(x){}persist();paint()});
document.addEventListener('dragend',()=>{S.drag=null;document.querySelectorAll('.v227th.drag,.v227th.over').forEach(x=>x.classList.remove('drag','over'))});
window.addEventListener('keydown',e=>{if(typeof APP==='undefined'||APP.view!=='carousel')return;const tag=(e.target.tagName||'').toUpperCase();if(S.zoom!=null){if(e.key==='Escape'){S.zoom=null;paint()}else if(e.key==='ArrowLeft'){S.zoom=(S.zoom+1)%D().content.slides.length;paint()}else if(e.key==='ArrowRight'){S.zoom=(S.zoom-1+D().content.slides.length)%D().content.slides.length;paint()}return}
  if(['INPUT','TEXTAREA','SELECT'].includes(tag))return;if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redo():undo()}});
setInterval(()=>{try{const d=D();if(typeof APP!=='undefined'&&APP.view==='carousel'&&S.step===3&&d&&!S.busy&&heal(d)){S.thumbs={};paint()}}catch(e){}},2500);
window.__v227={S,D,newDoc,generate,build,runQa,syncPost,heal,LAY,contentPrompt,paint,zip,textsOf,regen,exportAll};
})();
/*V227:END*/
