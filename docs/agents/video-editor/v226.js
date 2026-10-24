/*V226:START*/
// ================= V226 · the review studio (סטודיו סקירה): the edited video large, frame accurate keys (arrows a frame,
// Shift+arrows a second, space, N a note, Esc), "+ הערה בשנייה הזו" with a thumbnail of that frame, every note in a list
// sorted by time with Claude's answer under it, "אהבתי, לא לגעת" or "לשנות" with "מה לשנות כאן?", reopen, edit, delete,
// a timeline strip with the scene names and a marker per note, and one button that hands Claude all the open notes in one
// round (in the studio on Opus 5.5, or to the cloud editor with the frames). Also a script writer (topic, goal, audience,
// length, tone → scenes with on-screen text, voice over, b-roll, CTA) that can become the subtitles, a background progress
// chip for the scene detection that now runs after the project opened, and a one-click split when cuts arrive late. =================
(()=>{
if(window.__v226)return;window.__v226=1;
const E=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $=s=>document.querySelector(s);
const toastS=m=>{try{toast(m)}catch(e){console.log(m)}};
const fmt=s=>{s=Math.max(0,+s||0);const m=Math.floor(s/60),r=s-m*60;return m+':'+(r<10?'0':'')+r.toFixed(2)};
const uid=()=>'m'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const S=()=>window.__v204&&__v204.S;const P=()=>{try{return __v204.P()}catch(e){return null}};
const FPS=30;
function stageMax(cv){try{const r=cv.getBoundingClientRect();const d=Math.min(2,devicePixelRatio||1);const m=Math.round(Math.max(r.width,r.height)*d);return Math.max(640,Math.min(1280,m||1280))}catch(e){return 1280}}

// ---------- background work chip and late cuts ----------
setInterval(()=>{const s=S();const top=document.querySelector('.v205top');if(!top)return;let c=top.querySelector('.v226bg');if(s&&s.bg){if(!c){c=document.createElement('span');c.className='v226bg';c.setAttribute('role','status');top.appendChild(c)}c.textContent=s.bg.t+(s.bg.pct>=0?' · '+Math.round(s.bg.pct*100)+'%':'')}else if(c)c.remove()},500);
function cutsBar(){const p=P();const s=S();if(!p||!s||!p.pendingCuts||!p.pendingCuts.length)return;const lh=document.querySelector('.v205lp .v204lh');if(!lh||lh.parentElement.querySelector('.v226cuts'))return;
  lh.insertAdjacentHTML('afterend',`<div class="v226cuts"><b>זוהו ${p.pendingCuts.length} סצנות בסרטון</b><button type="button" class="v204b pri" data-v226="applycuts">לפצל לפיהן</button><button type="button" class="v204b" data-v226="dropcuts">להשאיר כמו שזה</button></div>`)}
function mkClip(a,b,extra){return Object.assign({id:'c'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),name:'',in:+a.toFixed(3),out:+b.toFixed(3),desc:'',sugg:'',thumb:'',adj:{exp:0,con:0,sat:0,temp:0},frame:{scale:1,x:0,y:0},fx:{look:'none',vignette:0,blur:0},speed:1,vol:1,mute:false,fadeIn:0,fadeOut:0,trans:{type:'none',dur:0.4},status:'ok'},extra||{})}

// ---------- notes (shared with V224: p.marks and clip.note) ----------
function load(p){try{window.__v224&&__v224.load(p)}catch(e){}p.marks=p.marks||[]}
function save(p){p.touched=Date.now();const notes={};(p.clips||[]).forEach(c=>{if(c.note)notes[c.id]=c.note});try{localStorage.setItem('v224_'+p.id,JSON.stringify({marks:p.marks||[],notes,fixNote:p.fixNote||''}))}catch(e){}}
function items(p){const out=[];(p.clips||[]).forEach((c,i)=>{if(c.note)out.push({kind:'scene',id:'c:'+c.id,i:i+1,name:c.name,t:sceneStart(p,c),note:c.note,done:!!c.noteDone,answer:c.noteAnswer||'',state:c.noteState||(c.noteDone?'approved':c.noteAnswer?'answered':'open'),thumb:c.thumb||''})});
  (p.marks||[]).forEach(m=>{const c=(p.clips||[]).find(x=>x.id===m.clipId);out.push({kind:'frame',id:m.id,t:m.t,i:c?(p.clips.indexOf(c)+1):'',name:c?c.name:'',note:m.note,done:!!m.done,answer:m.answer||'',state:m.state||(m.done?'approved':m.answer?'answered':'open'),thumb:m.thumb||'',m})});
  return out.sort((a,b)=>a.t-b.t)}
function sceneStart(p,c){try{const {L}=__v204.lay(p);const r=L.find(x=>x.c===c);return r?r.start:c.in}catch(e){return c.in}}
function setState(p,id,st,extra){const m=(p.marks||[]).find(x=>x.id===id);if(m){m.state=st;m.done=st==='approved';Object.assign(m,extra||{})}else if(id&&id.startsWith('c:')){const c=(p.clips||[]).find(x=>x.id===id.slice(2));if(c){c.noteState=st;c.noteDone=st==='approved';if(extra&&extra.answer!=null)c.noteAnswer=extra.answer;if(extra&&extra.note!=null)c.note=extra.note}}save(p)}
function thumb(){try{const cv=$('.v205cv');if(!cv||!cv.width)return '';const c=document.createElement('canvas');const w=240,h=Math.round(240*cv.height/cv.width);c.width=w;c.height=h;c.getContext('2d').drawImage(cv,0,0,w,h);return c.toDataURL('image/jpeg',.6)}catch(e){return ''}}
function clipAt(p,t){try{const r=__v204.at(t,p);return r&&r.x&&r.x.c||null}catch(e){return null}}
function instruction(p){const L=items(p).filter(x=>x.state==='open'||x.state==='change');const lines=L.map((x,i)=>`${i+1}. ${x.kind==='scene'?`סצנה ${x.i} "${x.name}" (מתחילה ב-${fmt(x.t)})`:`פריים ${fmt(x.t)}${x.name?' בסצנה '+x.i+' "'+x.name+'"':''}`}: ${x.note}${x.m&&x.m.change?' | אחרי הסבב הקודם העורך ביקש: '+x.m.change:''}`);
  return (p.fixNote?p.fixNote.trim()+'\n':'')+'תיקונים לפי ההערות של העורך, כל הערה בנפרד ובמקום שלה, בלי לשנות דברים שלא הוזכרו. בשדה summary כתוב שורה לכל הערה, שמתחילה במספר שלה ונקודה, ומסבירה מה בדיוק נעשה (או למה לא):\n'+lines.join('\n')}
function spreadAnswers(p,summary){const L=items(p).filter(x=>x.state==='open'||x.state==='change');const lines=String(summary||'').split('\n').map(s=>s.trim()).filter(Boolean);const byN={};lines.forEach(l=>{const m=l.match(/^(\d+)[.)]\s*(.+)$/);if(m)byN[+m[1]]=m[2]});
  L.forEach((x,i)=>{const a=byN[i+1]||lines[i]||summary||'בוצע';setState(p,x.id,'answered',{answer:a})})}

// ---------- the review overlay ----------
const R={open:false,tab:'notes',editing:null,newId:null,raf:0,busy:false,script:null,sform:{topic:'',goal:'leads',who:'',len:45,tone:'חם וישיר',project:'general'}};
function mirror(){if(!R.open)return;try{const src=$('.v205cv'),dst=$('#v226cv');if(src&&dst&&src.width){if(dst.width!==src.width||dst.height!==src.height){dst.width=src.width;dst.height=src.height}dst.getContext('2d').drawImage(src,0,0)}const s=S();const tc=$('#v226tc');if(tc&&s)tc.innerHTML=`<b>${fmt(s.t)}</b> · פריים ${Math.round(s.t*FPS)} <small>/ ${fmt(total())}</small>`;const ph=$('#v226ph');if(ph)ph.style.insetInlineStart=(100*(s.t/Math.max(0.01,total())))+'%';const pb=$('#v226play');if(pb)pb.textContent=s.playing?'❚❚':'▶'}catch(e){}R.raf=requestAnimationFrame(mirror)}
function total(){try{return __v204.lay(P()).total}catch(e){return (P()||{meta:{}}).meta.dur||0}}
function noteHtml(x,p){const open=x.state==='open'||x.state==='change';const edit=R.editing===x.id||R.newId===x.id;
  return `<li class="v226n st-${x.state}" data-v226n="${E(x.id)}"><button type="button" class="v226th" data-v226="jump" data-t="${x.t}" aria-label="קפיצה ל-${fmt(x.t)}">${x.thumb?`<img src="${x.thumb}" alt="">`:'<i></i>'}</button>
   <div class="v226nb"><div class="v226nh"><b>${x.kind==='scene'?`סצנה ${x.i} · ${E(x.name)}`:`${fmt(x.t)}${x.name?' · סצנה '+x.i+' · '+E(x.name):''}`}</b><span class="v226st">${{open:'ממתין לסבב',change:'ממתין לסבב',answered:'Claude ענה',approved:'אושר, לא לגעת'}[x.state]||''}</span></div>
   ${edit?`<input type="text" class="v226in" data-v226f="note" data-id="${E(x.id)}" value="${E(x.note)}" placeholder="מה לתקן כאן?" autofocus>`:`<p class="v226tx">${E(x.note)||'<em>בלי טקסט עדיין</em>'}</p>`}
   ${x.answer?`<p class="v226ans"><b>Claude:</b> ${E(x.answer)}</p>`:''}
   ${x.m&&x.m.change&&x.state==='change'?`<p class="v226chg"><b>לשנות:</b> ${E(x.m.change)}</p>`:''}
   <div class="v226ac">${x.state==='answered'?`<button type="button" class="v226b ok" data-v226="like" data-id="${E(x.id)}">👍 אהבתי, לא לגעת</button><button type="button" class="v226b" data-v226="change" data-id="${E(x.id)}">👎 לשנות</button>`:''}${x.state==='approved'?`<button type="button" class="v226b" data-v226="reopen" data-id="${E(x.id)}">פתח מחדש</button>`:''}<button type="button" class="v226b" data-v226="edit" data-id="${E(x.id)}">ערוך</button><button type="button" class="v226b dz" data-v226="del" data-id="${E(x.id)}">מחק</button></div>
   ${R.changing===x.id?`<input type="text" class="v226in" data-v226f="change" data-id="${E(x.id)}" placeholder="מה לשנות כאן?" autofocus>`:''}</div></li>`}
function stripHtml(p){let L=[];try{L=__v204.lay(p).L}catch(e){}const T=Math.max(0.01,total());const segs=L.map(x=>`<span class="v226sg" style="inset-inline-start:${100*x.start/T}%;width:${100*x.dur/T}%" title="${E(x.c.name)}"><i>${E(x.c.name)}</i></span>`).join('');
  const marks=items(p).map(x=>`<button type="button" class="v226mk st-${x.state}" style="inset-inline-start:${100*x.t/T}%" data-v226="jump" data-t="${x.t}" title="${E(x.note)}"></button>`).join('');
  return `<div class="v226strip" data-v226="scrub"><div class="v226segs">${segs}</div><div class="v226marks">${marks}</div><i id="v226ph" class="v226phd"></i></div>`}
function html(){const p=P();if(!p)return '';load(p);const L=items(p);const open=L.filter(x=>x.state==='open'||x.state==='change').length;const s=S();
  const list=L.length?`<ol class="v226list">${L.map(x=>noteHtml(x,p)).join('')}</ol>`:`<p class="v226empty">אין הערות עדיין. עוצרים על פריים ולוחצים "+ הערה בשנייה הזו", או N במקלדת.</p>`;
  return `<header class="v226h"><b>סטודיו סקירה</b><span class="v226nm">${E(p.name)}</span><span class="v226cnt">${L.length} הערות${open?' · '+open+' פתוחות':''}</span><span class="v226sp"></span>
    <div class="v226tabs" role="tablist"><button type="button" role="tab" aria-selected="${R.tab==='notes'}" data-v226="tab" data-t="notes">הערות</button><button type="button" role="tab" aria-selected="${R.tab==='script'}" data-v226="tab" data-t="script">כתיבת תסריט</button></div>
    <button type="button" class="v226b pri" data-v226="round" ${open&&!R.busy?'':'disabled'}>✦ לתת ל-Claude את כל התיקונים בסבב אחד${open?' ('+open+')':''}</button><button type="button" class="v226b" data-v226="cloud" ${open?'':'disabled'}>לעורך בענן</button><button type="button" class="v226x" data-v226="close" aria-label="סגירה">✕</button></header>
   <div class="v226body"><section class="v226player"><div class="v226stg"><canvas id="v226cv"></canvas></div>
     <div class="v226ctl"><button type="button" data-v226="step" data-d="-30" title="שנייה אחורה (Shift+←)">⏮</button><button type="button" data-v226="step" data-d="-1" title="פריים אחורה (←)">◀︎</button><button type="button" id="v226play" data-v226="play" title="ניגון / השהיה (רווח)">▶</button><button type="button" data-v226="step" data-d="1" title="פריים קדימה (→)">▶︎</button><button type="button" data-v226="step" data-d="30" title="שנייה קדימה (Shift+→)">⏭</button><span id="v226tc" class="v226tc"></span><span class="v226sp"></span><button type="button" class="v226b pri" data-v226="note">+ הערה בשנייה הזו <kbd>N</kbd></button></div>
     <p class="v226keys"><kbd>←</kbd><kbd>→</kbd> פריים · <kbd>Shift</kbd>+חצים שנייה · <kbd>רווח</kbd> ניגון · <kbd>N</kbd> הערה · <kbd>Esc</kbd> סגירה</p>${stripHtml(p)}</section>
    <aside class="v226side">${R.tab==='script'?scriptHtml(p):`${R.result?`<div class="v226res"><b>${E(R.result.t)}</b>${R.result.apply?`<button type="button" class="v226b pri" data-v226="apply">להחיל את העריכה</button>`:''}<button type="button" class="v226x" data-v226="resx" aria-label="סגירה">✕</button></div>`:''}${list}<label class="v226fl">הנחיה כללית לסבב (לא חובה)<textarea data-v226f="fixNote" rows="2" placeholder="למשל: לשמור על הקצב, לא לקצר את הסוף">${E(p.fixNote||'')}</textarea></label>`}</aside></div>`}
function render(){const m=$('#v226');if(!m||!R.open)return;const side=m.querySelector('.v226side');const st=side?side.scrollTop:0;m.innerHTML=html();const s2=m.querySelector('.v226side');if(s2)s2.scrollTop=st;const f=m.querySelector('[autofocus]');if(f){f.focus();try{f.setSelectionRange(f.value.length,f.value.length)}catch(e){}}}
function open(){const p=P();if(!p){toastS('פותחים קודם פרויקט בסטודיו');return}R.open=true;R.tab='notes';R.editing=null;R.newId=null;R.changing=null;R.result=null;let m=$('#v226');if(!m){m=document.createElement('section');m.id='v226';m.dir='rtl';m.setAttribute('role','dialog');m.setAttribute('aria-label','סטודיו סקירה');document.body.appendChild(m)}m.hidden=false;document.documentElement.classList.add('v226-on');render();cancelAnimationFrame(R.raf);mirror();try{if(!S().playing)__v204.seek(S().t||0)}catch(e){}}
function close(){R.open=false;cancelAnimationFrame(R.raf);const m=$('#v226');if(m){m.hidden=true;m.innerHTML=''}document.documentElement.classList.remove('v226-on');try{if(S().playing)__v204.stopPlay()}catch(e){}try{__v204.refresh()}catch(e){}}
async function step(frames){const s=S();if(!s)return;if(s.playing)__v204.stopPlay();const t=Math.max(0,Math.min(total(),Math.round((s.t+frames/FPS)*FPS)/FPS));await __v204.seek(t)}
async function addNote(){const s=S(),p=P();if(!s||!p)return;if(s.playing)__v204.stopPlay();load(p);const t=+s.t.toFixed(3);const c=clipAt(p,t);const m={id:uid(),t,clipId:c?c.id:null,note:'',thumb:thumb(),at:Date.now(),state:'open'};p.marks.push(m);save(p);R.newId=m.id;R.tab='notes';render();setTimeout(()=>{const el=$(`#v226 [data-v226f="note"][data-id="${m.id}"]`);el&&el.focus()},40)}
async function round(){const p=P();if(!p||R.busy)return;const instr=instruction(p);if(!items(p).some(x=>x.state==='open'||x.state==='change')){toastS('אין הערות פתוחות');return}R.busy=true;R.result={t:'Claude עובר על כל ההערות בסבב אחד (Opus 5.5)…'};render();
  try{await __v204.ask(instr,'project');const pr=S().prop;const sum=pr&&pr.summary||'';spreadAnswers(p,sum);R.result={t:(pr&&pr.ops&&pr.ops.length?`Claude הכין ${pr.ops.length} שינויים. `:'')+(sum?'התשובות מופיעות מתחת לכל הערה. ':'')+'סמנו "אהבתי" או "לשנות" לכל הערה.',apply:!!(pr&&pr.ops&&pr.ops.length)}}
  catch(e){R.result={t:'הסבב נכשל: '+((e&&e.message)||e)}}R.busy=false;render()}
async function cloud(){const p=P();const V=window.__vid;if(!V||!V.VD||!V.VD.db){toastS('השליחה לעורך זמינה כשהדף פתוח ב-claude.ai עם הרשאת עריכה');return}const url=p.src&&p.src.url;if(!url){toastS('הסרטון הזה נמצא רק במכשיר הזה. ייצאו אותו לספרייה, פתחו אותו משם ושלחו שוב');return}
  const fixes=items(p).filter(x=>x.state==='open'||x.state==='change').map(x=>({kind:x.kind,scene:x.i||null,name:x.name||'',t:x.t,range:null,note:x.note+(x.m&&x.m.change?' | לשנות: '+x.m.change:''),thumb:x.kind==='frame'?(x.thumb||''):''}));const reel=window.__v221&&p.reel&&p.reel.length?__v221.planOf(p.reel):null;
  try{const d=await V.queueDoc({id:'v'+Date.now().toString(36),name:p.name,srcUrl:url,srcId:(String(url).match(/_blob\/([0-9a-f]{32})/)||[])[1]||null,source:'review',status:'plan_requested',phase:'plan',fixes,fixNote:p.fixNote||'',reel,reelPrompt:reel?__v221.fullPrompt(p.reel):null,requested:new Date().toISOString()});await V.editVideo(Object.assign({__direct:1},d));p.cloudId=d.id;save(p);toastS('נשלח לעורך בענן עם '+fixes.length+' הערות. התוכנית תחכה לאישור שלך')}catch(e){toastS('השליחה נכשלה: '+((e&&e.message)||e))}}

// ---------- the script writer ----------
const GOALS=[['leads','לידים: שישלחו הודעה'],['brand','מודעות למותג'],['project','שיווק פרויקט'],['edu','ערך: טיפ או הסבר'],['bts','מאחורי הקלעים']];
const PROJS=[['general','קבוצת קורקוס (כללי)'],['hankin','חנקין 41'],['henrietta','הנרייטה סאלד 22-24'],['yordei','יורדי הים 3'],['bengurion','בן גוריון 17']];
function scriptPrompt(f){const g=(GOALS.find(x=>x[0]===f.goal)||[])[1]||'';const pn=(PROJS.find(x=>x[0]===f.project)||[])[1]||'';
  return `אתה התסריטאי של "קבוצת קורקוס" (יזמות, בנייה וניהול פרויקטים של בתים פרטיים ודירות גן בהוד השרון והשרון). כתוב תסריט לסרטון אנכי קצר לרשתות.
נושא: ${f.topic||'(בחר נושא מתאים לקבוצה)'}
מטרה: ${g}
קהל: ${f.who||'משפחות שמחפשות בית בשרון'}
אורך: ${f.len||45} שניות
טון: ${f.tone||'חם וישיר'}
${f.project&&f.project!=='general'?'הפרויקט: '+pn+'\n':''}כללים: עברית מדוברת וקצרה, משפט פתיחה (הוק) שעוצר גלילה ב-3 השניות הראשונות, סצנה לכל רעיון, טקסט על המסך עד 6 מילים, קריינות עד 25 מילים לסצנה, בלי מספרים, מחירים, כתובות או שמות אנשים מומצאים (טלפון מותר: 055-981-1814), בלי מקפים כסימן פיסוק, קריאה לפעולה אחת בסוף.
החזר JSON בלבד: {"title":"שם הסרטון","hook":"משפט הפתיחה","scenes":[{"n":1,"seconds":4,"onScreen":"טקסט על המסך","vo":"מה אומרים","broll":"מה רואים (צילום, הדמיה, הדובר למצלמה)","effect":"אפקט מומלץ מתוך: title, pill, behind, counter, underline, card, punch, checklist, quote, pin, icon, split, bar, cta או ריק"}],"cta":"קריאה לפעולה","caption":"טקסט לפוסט, 30 עד 60 מילים"}`}
async function sampler(){let s=null;try{s=(window.claude&&window.claude.use)?await window.claude.use('sample').catch(()=>null):null}catch(e){}if(!s&&typeof KC!=='undefined'&&KC.sample)s=KC.sample;return s}
async function writeScript(){const p=P();if(!p||R.busy)return;R.busy=true;R.serr='';render();try{let r;if(window.__v226mock)r=await window.__v226mock('script',scriptPrompt(R.sform));else{const s=await sampler();if(!s||!s.json){const e=new Error('Claude לא זמין בתצוגה הזו');e.code='not_granted';throw e}r=await s.json(scriptPrompt(R.sform),{cache:false,modelTier:'complex'})}
  if(!r||!Array.isArray(r.scenes)||!r.scenes.length)throw new Error('Claude לא החזיר תסריט');R.script=r;p.scriptPlan=Object.assign({at:new Date().toISOString(),form:Object.assign({},R.sform)},r);save(p);try{p.touched=Date.now()}catch(e){}}
  catch(e){R.serr=e&&e.code==='rate_limited'?'יותר מדי בקשות, נסו בעוד דקה':(e&&e.message)||'הכתיבה נכשלה'}R.busy=false;render()}
function applyScriptAsSubs(){const p=P();const sc=R.script||p.scriptPlan;if(!sc)return;const txt=sc.scenes.map(x=>String(x.vo||x.onScreen||'').trim()).filter(Boolean).join('\n');const s=S();s.scriptDraft=txt;s.scplan=__v204.planScript(p,txt);s.ltab='subs';close();__v204.refresh();setTimeout(()=>{const b=document.querySelector('[data-v204="scapply"]');if(b){b.click();toastS('התסריט נכנס ככתוביות, שורה לכל סצנה')}else toastS('התסריט מוכן בלשונית כתוביות ותסריט. לחצו "החלת התסריט"')},80)}
function scriptHtml(p){const f=R.sform;const sc=R.script||p.scriptPlan;const inp=(k,l,ph,type)=>`<label class="v226fl">${l}<input type="${type||'text'}" data-v226s="${k}" value="${E(f[k])}" placeholder="${E(ph||'')}"></label>`;
  return `<div class="v226sw"><h4>כתיבת תסריט לסרטון</h4><p class="v226hint">Claude (Opus 5.5) כותב תסריט לפי סצנות: טקסט על המסך, קריינות, מה רואים ואיזה אפקט מתאים. אחר כך אפשר להכניס אותו ככתוביות לסרטון או לצלם לפיו.</p>
   ${inp('topic','על מה הסרטון','למשל: למה לא לבחור קבלן לפי המחיר הכי נמוך')}
   <label class="v226fl">מטרה<select data-v226s="goal">${GOALS.map(([k,l])=>`<option value="${k}"${f.goal===k?' selected':''}>${l}</option>`).join('')}</select></label>
   ${inp('who','למי','משפחות שמחפשות בית בשרון')}<div class="v226two">${inp('len','אורך בשניות','45','number')}${inp('tone','טון','חם וישיר')}</div>
   <label class="v226fl">פרויקט<select data-v226s="project">${PROJS.map(([k,l])=>`<option value="${k}"${f.project===k?' selected':''}>${l}</option>`).join('')}</select></label>
   <div class="v226ac"><button type="button" class="v226b pri" data-v226="write" ${R.busy?'disabled':''}>${R.busy?'כותב…':'✦ Claude כותב תסריט'}</button>${sc?`<button type="button" class="v226b" data-v226="subs">להכניס ככתוביות</button><button type="button" class="v226b" data-v226="copy">העתקה</button>`:''}</div>
   ${R.serr?`<p class="v226err">${E(R.serr)}</p>`:''}
   ${sc?`<div class="v226sc"><h5>${E(sc.title||'')}</h5><p class="v226hook"><b>הוק:</b> ${E(sc.hook||'')}</p><table><thead><tr><th>#</th><th>שניות</th><th>על המסך</th><th>קריינות</th><th>רואים</th><th>אפקט</th></tr></thead><tbody>${sc.scenes.map(x=>`<tr><td>${E(x.n)}</td><td>${E(x.seconds)}</td><td>${E(x.onScreen)}</td><td>${E(x.vo)}</td><td>${E(x.broll)}</td><td>${E(x.effect||'')}</td></tr>`).join('')}</tbody></table><p><b>קריאה לפעולה:</b> ${E(sc.cta||'')}</p>${sc.caption?`<p class="v226cap"><b>טקסט לפוסט:</b> ${E(sc.caption)}</p>`:''}</div>`:''}</div>`}
function scriptText(sc){return [sc.title,'הוק: '+(sc.hook||''),...sc.scenes.map(x=>`${x.n}. (${x.seconds} ש') על המסך: ${x.onScreen} | קריינות: ${x.vo} | רואים: ${x.broll}${x.effect?' | אפקט: '+x.effect:''}`),'קריאה לפעולה: '+(sc.cta||''),sc.caption?'טקסט לפוסט: '+sc.caption:''].filter(Boolean).join('\n')}

// ---------- entries: studio toolbar, project library, subtitles panel ----------
function inject(){try{const top=document.querySelector('.v205top');if(top&&!top.querySelector('[data-v226="open"]')){const b=document.createElement('button');b.type='button';b.className='v204b v226open';b.dataset.v226='open';b.title='סקירה: הערות על כל פריים ותיקונים בסבב אחד';b.textContent='✎ סקירה';const ex=top.querySelector('[data-v204="rtab"][data-t="export"]');if(ex&&ex.parentElement)ex.parentElement.insertBefore(b,ex);else top.appendChild(b)}
  cutsBar();
  const sp=document.querySelector('.v205lp');const s=S();if(sp&&s&&s.ltab==='subs'&&!sp.querySelector('.v226sbtn')){sp.insertAdjacentHTML('afterbegin',`<div class="v226sbtn"><b>אין עדיין תסריט?</b><button type="button" class="v204b pri" data-v226="openscript">✦ כתיבת תסריט עם Claude</button></div>`)}
  if(R.open&&!$('#v226 .v226h'))render()}catch(e){console.warn('v226',e)}}
let obT=0;new MutationObserver(()=>{clearTimeout(obT);obT=setTimeout(inject,80)}).observe(document.body,{childList:true,subtree:true});setTimeout(inject,1500);setInterval(()=>{try{if(typeof APP!=='undefined'&&APP.view==='vstudio')inject()}catch(e){}},700);

document.addEventListener('click',async e=>{const b=e.target.closest&&e.target.closest('[data-v226]');if(!b)return;const a=b.dataset.v226,id=b.dataset.id;const p=P();
  if(a==='open')return open();if(a==='openscript'){open();R.tab='script';render();return}if(a==='close')return close();
  if(a==='applycuts'){if(!p||!p.pendingCuts)return;p.clips=p.pendingCuts.map((r,i)=>mkClip(r.in,r.out,{name:'סצנה '+(i+1),thumb:r.thumb||''}));delete p.pendingCuts;const s=S();s.cur=p.clips[0].id;s.sel=new Set();p.touched=Date.now();__v204.refresh();toastS(p.clips.length+' סצנות. ביטול: Ctrl+Z לא חל על הפיצול הזה, אבל "איחוד" מחזיר');return}
  if(a==='dropcuts'){if(p){delete p.pendingCuts;__v204.refresh()}return}
  if(!p)return;load(p);
  if(a==='tab'){R.tab=b.dataset.t;render();return}
  if(a==='play'){await __v204.playToggle();return}if(a==='step'){await step(+b.dataset.d);return}if(a==='note'){await addNote();return}
  if(a==='jump'){if(S().playing)__v204.stopPlay();await __v204.seek(+b.dataset.t);return}
  if(a==='scrub'){const r=b.getBoundingClientRect();const x=(r.right-e.clientX)/r.width;if(S().playing)__v204.stopPlay();await __v204.seek(Math.max(0,Math.min(1,x))*total());return}
  if(a==='like'){setState(p,id,'approved');render();return}
  if(a==='change'){R.changing=id;render();return}
  if(a==='reopen'){setState(p,id,'open');render();return}
  if(a==='edit'){R.editing=id;render();return}
  if(a==='del'){if(id.startsWith('c:')){const c=p.clips.find(x=>x.id===id.slice(2));if(c){c.note='';c.noteAnswer='';c.noteState='';c.noteDone=false}}else p.marks=(p.marks||[]).filter(x=>x.id!==id);save(p);render();return}
  if(a==='round')return round();if(a==='cloud')return cloud();
  if(a==='apply'){try{await __v204.acceptProp()}catch(x){}R.result={t:'העריכה הוחלה. בדקו את הפריימים ואשרו כל הערה'};render();return}
  if(a==='resx'){R.result=null;render();return}
  if(a==='write')return writeScript();if(a==='subs')return applyScriptAsSubs();
  if(a==='copy'){const sc=R.script||p.scriptPlan;if(!sc)return;try{await navigator.clipboard.writeText(scriptText(sc));toastS('התסריט הועתק')}catch(x){toastS('לא הצלחתי להעתיק')}return}
},true);
document.addEventListener('change',e=>{const t=e.target;const p=P();if(!p)return;if(t.dataset&&t.dataset.v226f){load(p);const k=t.dataset.v226f,id=t.dataset.id;const v=t.value.trim();
    if(k==='note'){const m=(p.marks||[]).find(x=>x.id===id);if(m)m.note=v;else if(id&&id.startsWith('c:')){const c=p.clips.find(x=>x.id===id.slice(2));if(c)c.note=v}R.editing=null;R.newId=null;save(p);render()}
    else if(k==='change'){const m=(p.marks||[]).find(x=>x.id===id);if(m){m.change=v;m.state='change';m.done=false}else if(id&&id.startsWith('c:')){const c=p.clips.find(x=>x.id===id.slice(2));if(c){c.note=c.note+' | לשנות: '+v;c.noteState='change';c.noteDone=false}}R.changing=null;save(p);render()}
    else if(k==='fixNote'){p.fixNote=t.value;save(p)}}
  else if(t.dataset&&t.dataset.v226s){R.sform[t.dataset.v226s]=t.type==='number'?+t.value:t.value}},true);
window.addEventListener('keydown',e=>{if(!R.open)return;const tag=(e.target.tagName||'').toUpperCase();if(e.key==='Escape'){e.preventDefault();if(tag==='INPUT'||tag==='TEXTAREA'){e.target.blur();R.editing=null;R.changing=null;render();return}close();return}
  if(['INPUT','TEXTAREA','SELECT'].includes(tag)||e.target.isContentEditable){if(e.key==='Enter'&&tag==='INPUT'){e.preventDefault();e.target.blur()}return}
  if(e.ctrlKey||e.metaKey||e.altKey)return;e.stopImmediatePropagation();
  if(e.key==='ArrowLeft'){e.preventDefault();step(e.shiftKey?-FPS:-1)}else if(e.key==='ArrowRight'){e.preventDefault();step(e.shiftKey?FPS:1)}else if(e.key===' '){e.preventDefault();__v204.playToggle()}else if(e.key.toLowerCase()==='n'){e.preventDefault();addNote()}},true);
window.__v226={open,close,R,items,instruction,spreadAnswers,stageMax,scriptPrompt,applyScriptAsSubs,step,addNote,inject,cutsBar};
})();
/*V226:END*/
