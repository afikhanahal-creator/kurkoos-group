// ================= V134 · "בקשה לעורך": ask for an edit in plain Hebrew, or fill a structured brief, and the editor does it
//                   here. The request goes to Claude from the page (the viewer's own Claude, with consent), comes back as
//                   edit operations, and is applied to this video in one undoable step. Keep asking for changes, then
//                   create the finished video. Instead of uploading the video to Claude, everything happens in the system =================
(function(){
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const toastSafe=m=>{try{toast(m)}catch(e){}};
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
let SAMPLE=undefined;(async()=>{try{SAMPLE=window.claude&&claude.use?await claude.use('sample'):null}catch(e){SAMPLE=null}})();
const BFX={zoom:'זום פאנץ\'',shake:'רעידה',flash:'הבזק',glitch:'גליץ\'',split:'הפרדת צבעים',blur:'פוקוס נכנס',dipw:'מעבר לבן',dipb:'מעבר שחור',vignette:'וינייטה',leak:'דליפת אור',confetti:'קונפטי',shine:'ברק'};
const ELS={logo:'לוגו',dot:'נקודה אדומה',arrow:'חץ',ring:'עיגול סימון',bar:'קו הדגשה',newtag:'תגית',check:'וי',star:'פרץ',pin:'מיקום',badge:'חותמת'};
const SIG={opening:'פתיחה אפורה וסלאם',title3d:'כותרת תלת־ממדית',shatter:'התנפצות',popout:'יציאה מהמסגרת',flip:'היפוך',worlds:'עולמות',freeze:'עצירת זמן',giant:'ענק',pixel:'פיקסלים',zoom:'זום אינסופי',cube:'קובייה',money:'חותמות וכסף',comment:'תגובה והודעה',hologram:'הולוגרמה',goal:'מונה עוקבים',gold:'חותמת זהב',follow:'כפתור עקוב',rewind:'הרצה לאחור'};
const SFXN=['whoosh-quick','whip','swipe','pop','click','mouse-click','ding','bell','notification','success','sparkle','cash','thud','punch','glitch-blip','shutter','power-up','tick','sig-slam','sig-boom','sig-impact','sig-whoosh-in','sig-whoosh-up','sig-shatter','sig-glass-rev','sig-stomp','sig-crumble','sig-freeze','sig-release','sig-counter','sig-key','sig-stamp','sig-stamp-gold','sig-confetti','sig-holo-on','sig-dive','sig-rewind'];
const FIELDS=[['goal','מה המטרה של הסרטון','למשל: להציג את הפרויקט בחנקין 41 ולקבל פניות'],['who','למי הוא מדבר','למשל: משפחות שמחפשות דירת גן'],['act','מה הצופה עושה בסוף','למשל: שולח הודעה בוואטסאפ'],['tone','סגנון וקצב','למשל: אנרגטי, צבעים חיים, מעברים מהירים'],['hook','משפט הפתיחה','מה מופיע על המסך בשניות הראשונות'],['spoken','מה נאמר בסרטון (לכתוביות)','מדביקים את הטקסט, והוא הופך לכתוביות'],['moments','רגעים ואפקטים','שורה לכל רגע, למשל: בשנייה 3 הבזק וזום / בסוף קונפטי'],['sound','סאונד ומוזיקה','למשל: צליל לכל כותרת, מוזיקה שקטה שיורדת כשמדברים'],['cut','אורך וחיתוך','למשל: עד 30 שניות, לחתוך את 2 השניות הראשונות'],['extra','עוד הערות','כל דבר נוסף']];
const EXAMPLES=['תעשה את זה אנרגטי בצבעי המותג, עם כתוביות קריוקי, זום בכל משפט חשוב ופס התקדמות','פתיח עם הלוגו, כותרת "דירת הגן האחרונה" בשנייה 2 עם צליל, ובסוף קריאה לפעולה "דברו איתנו"','תחתוך את השנייה הראשונה, תוסיף מוזיקה שקטה, ובשנייה 5 התנפצות קולנועית'];
const P=()=>window.__v129&&__v129.E&&__v129.E.p;
let busy=null;

function compose(b){const L=[];FIELDS.forEach(([k,l])=>{const v=(b&&b[k]||'').trim();if(v)L.push(`${l}: ${v}`)});return L.join('\n')}
function state(){const p=P(),s=__v129.seq();return {clip_seconds:+(s.clips[0]?s.clips[0].dur:0).toFixed(2),intro_seconds:+s.intro.toFixed(2),outro_seconds:+s.outro.toFixed(2),total_seconds:+s.total.toFixed(2),
 trim:{in:p.in||0,out:p.out||p.dur||0,source_seconds:p.dur||0},kit:p.kit,look:p.look||'none',captionStyle:p.capStyle,progress:!!p.progress,recipe:p.recipe||null,music:p.music?{name:p.music.name,vol:p.music.vol,duck:p.music.duck}:null,
 layers:p.layers.map(l=>({id:l.id,type:l.type,text:l.text||undefined,el:l.el,fx:l.fx,start:+l.start.toFixed(2),end:+l.end.toFixed(2),snd:l.snd||undefined})),sounds:p.sfx.map(x=>({name:x.name,at:x.at})),cloud_effects:p.fx||[]}}
function prompt(req){const p=P(),hist=(p.chat||[]).slice(-4).map(c=>`${c.role==='u'?'בקשה':'ביצוע'}: ${c.text}`).join('\n');
 return `אתה עורך הווידאו של קבוצת קורקוס, בתוך עורך וידאו בדפדפן. המשתמש מבקש בעברית איך לערוך סרטון אחד, ואתה מתרגם את הבקשה לפעולות עריכה מדויקות שהעורך יבצע.

מצב העורך עכשיו (JSON):
${JSON.stringify(state())}

ציר הזמן: הזמנים בשניות מתחילת הסרטון הסופי. הפתיח (אם יש) תופס את intro_seconds הראשונות, אחריו הסרטון עצמו (clip_seconds), ואחריו הסיום. "בשנייה 3" של המשתמש פירושו שנייה 3 בתוך הסרטון, כלומר intro_seconds+3 בציר.
מה אפשר לעשות כאן מיד (בדפדפן):
- recipe: סגנון שלם בלחיצה: clean (נקי), energy (אנרגטי), cinematic (קולנועי), brand (מותג קורקוס).
- look: none, brand, vivid, cinematic, warm, cool, bw. captionStyle: pill, bold, brand, karaoke. progress: פס התקדמות.
- kit: pal (navy, teal, paper, mist), font (Almoni, Heebo, Rubik), logo (true/false), lpos (tr, tl, br, bl), lsize (s, m, l), frame (none, thin, bar), intro (none, logo, headline), introText, outro (none, logo, cta), cta, fmt (9:16, 1:1, 16:9, orig), fit (fill, frame).
- add: שכבות. text {text, start, end, x, y (0 עד 1 מהמסך), scale, anim (pop, slide, fade, zoom, bounce, words, type), color (#hex), bg (none, pill, #a90b0c, #07293a), snd}; lower {text, sub, start, end}; el {el: ${Object.keys(ELS).join(', ')}, start, end, x, y, scale, color, snd}; fx {fx: ${Object.keys(BFX).join(', ')}, start, end, amt (0.3 עד 2.5), snd}.
- captions: כתוביות [{text, start, end}] בציר. רק מטקסט שהמשתמש כתב, 3 עד 5 מילים לכתובית, ברצף לאורך הסרטון.
- sfx: צלילים [{name, at, vol}] מתוך: ${SFXN.join(', ')}. לכל אפקט או כותרת אפשר גם snd באותה שכבה.
- trim: {start, end} בשניות בתוך הסרטון המקורי (לא בציר). remove: רשימת id של שכבות למחיקה. clear: {captions, layers, sfx} כשצריך להתחיל מחדש.
- music: {vol (0 עד 0.8), duck}. אם ביקשו מוזיקה ואין קובץ, כתוב ב-say שצריך לבחור שיר בלשונית סאונד.
מה נעשה אצל העורך בענן (cloud): אפקטים קולנועיים שצריכים הפרדה של הדמות או מילה מדויקת: ${Object.entries(SIG).map(([k,v])=>k+' ('+v+')').join(', ')}. כל אחד {id, at (שנייה בתוך הסרטון), word (אם נאמרה מילה), text (לכותרת)}. ושלבים מקצועיים pro: {cut, reframe, grade, captions, loudness} (true/false).

כללים: טקסט על המסך רק ממה שהמשתמש כתב או משם המותג "קבוצת קורקוס". בלי מספרים, הבטחות או ציטוטים שהמשתמש לא נתן. כל זמן בתוך total_seconds. אל תמחק שכבות שהמשתמש לא ביקש למחוק. אם בקשה לא ברורה, עשה את הדבר הסביר ביותר וכתוב ב-say מה הנחת.
${hist?`\nמה כבר נעשה בשיחה הזו:\n${hist}\n`:''}
הבקשה עכשיו:
${req}

ענה ב-JSON בלבד, אובייקט אחד:
{"say":"משפט או שניים בעברית: מה עשית","recipe":null,"look":null,"captionStyle":null,"progress":null,"kit":{},"trim":null,"clear":{},"captions":[],"add":[],"remove":[],"sfx":[],"music":null,"cloud":null,"next":"הצעה קצרה אחת למה אפשר לבקש עכשיו"}
שדה שלא משתנה: null או ריק.`}
// ---------- apply the operations in one undoable step
function apply(o){const p=P(),s=__v129.seq(),T=s.total,I=s.intro,changes=[];if(!o||typeof o!=='object')throw new Error('תשובה לא תקינה');
 const num=(x,d)=>{const n=+x;return isFinite(n)?n:d};const tt=x=>clamp(num(x,0),0,T);
 if(o.recipe&&['clean','energy','cinematic','brand'].includes(o.recipe)){__v129.buildRecipe(o.recipe);changes.push('סגנון '+({clean:'נקי',energy:'אנרגטי',cinematic:'קולנועי',brand:'מותג קורקוס'})[o.recipe])}
 __v129.change(q=>{
  if(o.look&&/^(none|brand|vivid|cinematic|warm|cool|bw)$/.test(o.look)){q.look=o.look;changes.push('צבע')}
  if(o.captionStyle&&/^(pill|bold|brand|karaoke)$/.test(o.captionStyle)){q.capStyle=o.captionStyle;changes.push('סגנון כתוביות')}
  if(typeof o.progress==='boolean'){q.progress=o.progress;changes.push(o.progress?'פס התקדמות':'בלי פס התקדמות')}
  if(o.kit&&typeof o.kit==='object'){const ok={pal:/^(navy|teal|paper|mist)$/,font:/^(Almoni|Heebo|Rubik)$/,lpos:/^(tr|tl|br|bl)$/,lsize:/^(s|m|l)$/,frame:/^(none|thin|bar)$/,intro:/^(none|logo|headline)$/,outro:/^(none|logo|cta)$/,fmt:/^(9:16|1:1|16:9|orig)$/,fit:/^(fill|frame)$/};let n=0;
   Object.entries(o.kit).forEach(([k,v])=>{if(v==null)return;if(ok[k]&&ok[k].test(String(v))){q.kit[k]=String(v);n++}else if(k==='logo'&&typeof v==='boolean'){q.kit.logo=v;n++}else if(['introText','cta','lname','ltitle'].includes(k)&&typeof v==='string'){q.kit[k]=v.slice(0,80);n++}});if(n)changes.push('ערכת מותג')}
  if(o.trim&&typeof o.trim==='object'){const d=q.dur||0,a=clamp(num(o.trim.start,q.in||0),0,d),b=clamp(num(o.trim.end,q.out||d),0,d);if(b-a>0.5){q.in=a;q.out=b;changes.push('חיתוך')}}
  const cl=o.clear||{};if(cl.captions)q.layers=q.layers.filter(l=>l.type!=='cap');if(cl.layers)q.layers=q.layers.filter(l=>l.type==='cap');if(cl.sfx)q.sfx=[];
  if(Array.isArray(o.remove)&&o.remove.length){const r=new Set(o.remove.map(String));const n0=q.layers.length;q.layers=q.layers.filter(l=>!r.has(l.id));if(q.layers.length<n0)changes.push('הסרת '+(n0-q.layers.length)+' שכבות')}
  if(Array.isArray(o.captions)&&o.captions.length){q.layers=q.layers.filter(l=>l.type!=='cap');o.captions.slice(0,80).forEach(c=>{const t=String(c.text||'').trim();if(!t)return;const a=tt(c.start),b=Math.max(a+0.4,tt(c.end));q.layers.push({id:'c'+Math.random().toString(36).slice(2,9),type:'cap',text:t.slice(0,80),start:a,end:b,y:q.capY})});changes.push(o.captions.length+' כתוביות')}
  let added=0;(Array.isArray(o.add)?o.add:[]).slice(0,40).forEach(a=>{if(!a||typeof a!=='object')return;const st=tt(a.start),en=Math.max(st+0.2,tt(a.end!=null?a.end:st+2));const snd=SFXN.includes(a.snd)?a.snd:'';const id=(a.type||'l')[0]+Math.random().toString(36).slice(2,9);
   if(a.type==='text'&&a.text)q.layers.push({id,type:'text',text:String(a.text).slice(0,80),start:st,end:en,x:clamp(num(a.x,0.5),0.05,0.95),y:clamp(num(a.y,0.2),0.05,0.95),scale:clamp(num(a.scale,1),0.4,2.6),anim:/^(pop|slide|fade|zoom|bounce|words|type|none)$/.test(a.anim)?a.anim:'pop',color:/^#[0-9a-f]{6}$/i.test(a.color)?a.color:undefined,bg:a.bg||'none',snd});
   else if(a.type==='lower'&&a.text)q.layers.push({id,type:'lower',text:String(a.text).slice(0,60),sub:String(a.sub||'').slice(0,60),start:st,end:en,x:0.62,y:0.8,scale:1,anim:'slide',snd:snd||'swipe'});
   else if(a.type==='el'&&ELS[a.el])q.layers.push({id,type:'el',el:a.el,text:a.text?String(a.text).slice(0,20):undefined,start:st,end:en,x:clamp(num(a.x,0.5),0.05,0.95),y:clamp(num(a.y,0.42),0.05,0.95),scale:clamp(num(a.scale,1),0.3,2.6),anim:'pop',color:/^#[0-9a-f]{6}$/i.test(a.color)?a.color:(a.el==='logo'?null:'#a90b0c'),snd});
   else if(a.type==='fx'&&BFX[a.fx])q.layers.push({id,type:'fx',fx:a.fx,start:st,end:en,amt:clamp(num(a.amt,1),0.3,2.5),snd});else return;added++});
  if(added)changes.push(added+' שכבות חדשות');
  let ns=0;(Array.isArray(o.sfx)?o.sfx:[]).slice(0,40).forEach(x=>{if(SFXN.includes(x&&x.name)){q.sfx.push({id:'s'+Math.random().toString(36).slice(2,9),name:x.name,at:tt(x.at),vol:clamp(num(x.vol,0.7),0.1,1)});ns++}});if(ns)changes.push(ns+' צלילים');
  if(o.music&&typeof o.music==='object'&&q.music){q.music.vol=clamp(num(o.music.vol,q.music.vol),0,0.8);if(typeof o.music.duck==='boolean')q.music.duck=o.music.duck;changes.push('מוזיקה')}
  if(o.cloud&&typeof o.cloud==='object'){let nc=0;(Array.isArray(o.cloud.fx)?o.cloud.fx:[]).forEach(f=>{if(!SIG[f&&f.id])return;q.fx=q.fx.filter(x=>x.id!==f.id);const at=f.at!=null&&isFinite(+f.at)?+((q.in||0)+clamp(+f.at,0,(q.out||q.dur||0)-(q.in||0))).toFixed(1):null;q.fx.push({id:f.id,word:f.word?String(f.word).slice(0,40):'',at,text:f.text?String(f.text).slice(0,60):undefined});nc++});
   if(o.cloud.pro&&typeof o.cloud.pro==='object'){q.pro=Object.assign({},q.pro);['cut','reframe','grade','captions','loudness'].forEach(k=>{if(typeof o.cloud.pro[k]==='boolean')q.pro[k]=o.cloud.pro[k]})}
   if(nc)changes.push(nc+' אפקטים קולנועיים לעורך בענן')}
 });
 return changes}
// ---------- run a request
async function run(req){req=String(req||'').trim();if(!req||busy)return;const p=P();p.chat=p.chat||[];p.chat.push({role:'u',text:req.slice(0,1500)});busy={ctl:new AbortController(),phase:'חושב על העריכה…'};paint();
 if(SAMPLE===undefined){await new Promise(r=>setTimeout(r,1500))}
 if(!SAMPLE){const ch=fallback(req);p.chat.push({role:'a',text:ch.length?'ביצעתי את מה שאפשר בלי חיבור ל-Claude: '+ch.join(', ')+'.':'בלי חיבור ל-Claude אני מבין רק בקשות פשוטות (סגנון, כתוביות). פתחו את הדף ב-claude.ai כדי לבקש כל דבר.',changes:ch});busy=null;paint();return}
 try{const o=await SAMPLE.json(prompt(req),{modelTier:'default',cache:false,signal:busy.ctl.signal,onText:()=>{if(busy&&busy.phase!=='כותב את העריכה…'){busy.phase='כותב את העריכה…';paint()}}});
  const ch=apply(o);p.chat.push({role:'a',text:String(o.say||'בוצע.').slice(0,600),changes:ch,next:o.next?String(o.next).slice(0,200):'',undo:true});
  try{__v129.E.t=Math.min(__v129.E.t,__v129.seq().total);__v129.refresh()}catch(e){}}
 catch(e){const c=e&&e.code;const msg=c==='cancelled'?'הבקשה נעצרה.':c==='not_granted'||c==='sampling_disabled'||c==='not_declared'?'הדף לא קיבל אישור להשתמש ב-Claude. אפשר לאשר בפעם הבאה שהחלון נפתח.':c==='rate_limited'?'יותר מדי בקשות כרגע. נסו שוב בעוד דקה.':c==='invalid_json'?'התשובה לא הגיעה בצורה שאפשר לבצע. נסו לנסח את הבקשה קצר יותר.':c==='refused'?'הבקשה לא בוצעה. נסו לנסח אותה אחרת.':'משהו השתבש בדרך. אפשר לנסות שוב.';
  p.chat.push({role:'a',text:msg,changes:[],err:true});if(c==='not_granted'||c==='sampling_disabled')SAMPLE=null}
 busy=null;try{localStorage.setItem('v129_projects',JSON.stringify(__v129.PROJ()))}catch(e){}paint()}
// without Claude: the simple requests still work
function fallback(req){const ch=[];const map=[[/אנרגטי|קצבי|דינמי/,'energy'],[/קולנוע/,'cinematic'],[/מותג|קורקוס/,'brand'],[/נקי|מינימל/,'clean']];const m=map.find(([r])=>r.test(req));if(m){__v129.buildRecipe(m[1]);ch.push('סגנון')}
 const cap=req.match(/כתוביות[:：]\s*([\s\S]+)/);if(cap){__v129.change(q=>{const w=cap[1].trim().split(/\s+/);const s=__v129.seq(),per=(s.clipsEnd-s.intro)/Math.ceil(w.length/4);q.layers=q.layers.filter(l=>l.type!=='cap');for(let i=0,k=0;i<w.length;i+=4,k++)q.layers.push({id:'c'+i,type:'cap',text:w.slice(i,i+4).join(' '),start:s.intro+k*per,end:s.intro+(k+1)*per-0.05,y:q.capY})});ch.push('כתוביות')}
 return ch}
// ---------- UI
let open=false,showBrief=false;
function html(){const p=P();if(!p)return '';const chat=(p.chat||[]).slice(-8);const b=p.brief||{};
 return `<section class="v134" id="v134" aria-label="בקשה לעורך"><header><div><h3>בקשה לעורך</h3><p>כתבו בעברית איך לערוך את הסרטון, והעורך מבצע את זה כאן. אפשר להמשיך לבקש שינויים עד שזה מושלם.</p></div>
  <button type="button" class="px-btn sm${showBrief?' pri':''}" data-v134="brief" aria-expanded="${showBrief}">פרומפט מסודר</button></header>
 ${chat.length?`<div class="v134log" aria-live="polite">${chat.map((c,i)=>`<div class="v134m ${c.role==='u'?'u':'a'}${c.err?' err':''}"><p>${esc(c.text)}</p>${c.changes&&c.changes.length?`<span class="v134ch">${c.changes.map(x=>`<i>${esc(x)}</i>`).join('')}</span>`:''}${c.next?`<button type="button" class="v134next" data-v134use="${esc(c.next)}">${esc(c.next)}</button>`:''}${c.undo&&i===chat.length-1?`<span class="v134a"><button type="button" class="px-btn sm" data-v134="undo">ביטול השינוי</button><button type="button" class="px-btn sm pri" data-v134="finish">יצירת הסרטון המוגמר</button></span>`:''}</div>`).join('')}</div>`:''}
 ${showBrief?`<div class="v134brief">${FIELDS.map(([k,l,ph])=>`<label class="v134f${['spoken','moments'].includes(k)?' wide':''}"><span>${l}</span>${['spoken','moments'].includes(k)?`<textarea rows="3" data-v134b="${k}" placeholder="${esc(ph)}">${esc(b[k]||'')}</textarea>`:`<input data-v134b="${k}" value="${esc(b[k]||'')}" placeholder="${esc(ph)}">`}</label>`).join('')}
  <div class="v134ba"><button type="button" class="px-btn" data-v134="fill">הכנסת הפרומפט לתיבה</button><button type="button" class="px-btn pri" data-v134="runbrief" ${busy?'disabled':''}>ביצוע הפרומפט</button></div></div>`:''}
 <div class="v134in"><textarea id="v134q" rows="2" placeholder="למשל: ${esc(EXAMPLES[0])}" aria-label="מה לעשות בסרטון" ${busy?'disabled':''}></textarea>
  ${busy?`<div class="v134busy" role="status"><i></i><span>${esc(busy.phase)}</span><button type="button" class="px-btn sm" data-v134="stop">עצירה</button></div>`:`<button type="button" class="px-btn pri v134go" data-v134="run">ביצוע</button>`}</div>
 ${!chat.length?`<div class="v134ex">${EXAMPLES.map(x=>`<button type="button" data-v134use="${esc(x)}">${esc(x)}</button>`).join('')}</div>`:''}
 </section>`}
function paint(){const ed=document.getElementById('v129');if(!ed)return;let s=document.getElementById('v134');const draft=s&&s.querySelector('#v134q')?s.querySelector('#v134q').value:'';
 const h=html();if(!h)return;if(s)s.outerHTML=h;else{const top=ed.querySelector('.v129top');if(!top)return;top.insertAdjacentHTML('afterend',h)}
 const q=document.getElementById('v134q');if(q&&draft&&!busy)q.value=draft;const log=document.querySelector('#v134 .v134log');if(log)log.scrollTop=log.scrollHeight}
document.addEventListener('click',e=>{const u=e.target.closest&&e.target.closest('[data-v134use]');if(u){const q=document.getElementById('v134q');if(q){q.value=u.dataset.v134use;q.focus()}return}
 const b=e.target.closest&&e.target.closest('#v134 [data-v134]');if(!b)return;const a=b.dataset.v134,p=P();
 if(a==='run'){run((document.getElementById('v134q')||{}).value)}
 else if(a==='stop'&&busy){busy.ctl.abort()}
 else if(a==='brief'){showBrief=!showBrief;paint()}
 else if(a==='fill'){const q=document.getElementById('v134q');if(q){q.value=compose(p.brief);q.focus()}}
 else if(a==='runbrief'){const t=compose(p.brief);if(!t){toastSafe('מלאו לפחות שדה אחד');return}showBrief=false;run(t)}
 else if(a==='undo'){try{__v129.undo()}catch(x){}const l=p.chat&&p.chat[p.chat.length-1];if(l){l.undo=false;l.text+=' (בוטל)'}paint()}
 else if(a==='finish'){const x=document.querySelector('.v130ebar [data-v130="export"]');if(x)x.click();else if(window.__v132)__v132.finishNow()}});
document.addEventListener('keydown',e=>{if(e.target&&e.target.id==='v134q'&&e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();run(e.target.value)}});
document.addEventListener('input',e=>{const t=e.target;if(t&&t.dataset&&t.dataset.v134b){const p=P();p.brief=Object.assign({},p.brief);p.brief[t.dataset.v134b]=t.value.slice(0,1500);try{localStorage.setItem('v129_projects',JSON.stringify(__v129.PROJ()))}catch(x){}}});
let raf=0;new MutationObserver(()=>{if(raf)return;raf=requestAnimationFrame(()=>{raf=0;const ed=document.getElementById('v129');if(ed&&!document.getElementById('v134'))paint()})}).observe(document.body,{childList:true,subtree:true});
window.__v134={run,apply,prompt,compose,state};
})();
