/*V224:START*/
// ================= V224 · notes on every scene and every frame in the studio, and a fix loop. A note on the selected scene (in
// its inspector), a note on the frame under the playhead (one button in the player, with a thumbnail of that frame), a count on
// every scene in the list, and a "תיקונים" card in the assistant panel that lists them all: jump to the frame, mark done, and
// either let Claude (Opus 5.5) apply the fixes in the studio or send the whole list with the frames to the cloud editor
// (Claude Code, the video trigger on Opus 5.5) together with the reel effects. =================
(()=>{
if(window.__v224)return;window.__v224=1;
const E=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $=s=>document.querySelector(s);
const toastS=m=>{try{toast(m)}catch(e){console.log(m)}};
const fmt=s=>{s=Math.max(0,+s||0);const m=Math.floor(s/60),r=s-m*60;return m+':'+(r<10?'0':'')+r.toFixed(1)};
const uid=()=>'m'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const S=()=>window.__v204&&__v204.S;const P=()=>{try{return __v204.P()}catch(e){return null}};
const K=p=>'v224_'+p.id;
function load(p){if(p.marks)return;try{const d=JSON.parse(localStorage.getItem(K(p))||'null');if(d){p.marks=d.marks||[];p.fixNote=d.fixNote||'';(p.clips||[]).forEach(c=>{if(d.notes&&d.notes[c.id]&&!c.note)c.note=d.notes[c.id]})}}catch(e){}p.marks=p.marks||[]}
function save(p){p.touched=Date.now();const notes={};(p.clips||[]).forEach(c=>{if(c.note)notes[c.id]=c.note});try{localStorage.setItem(K(p),JSON.stringify({marks:p.marks||[],notes,fixNote:p.fixNote||''}))}catch(e){}try{__v204.WSsave&&0}catch(e){}}
function clipAt(p,t){try{const r=__v204.at(t,p);return r&&r.x&&r.x.c||null}catch(e){return null}}
function idx(p,c){const i=(p.clips||[]).indexOf(c);return i<0?'':String(i+1)}
function thumb(){try{const cv=$('.v205cv');if(!cv||!cv.width)return '';const c=document.createElement('canvas');const w=240,h=Math.round(240*cv.height/cv.width);c.width=w;c.height=h;c.getContext('2d').drawImage(cv,0,0,w,h);return c.toDataURL('image/jpeg',.6)}catch(e){return ''}}
function items(p){const out=[];(p.clips||[]).forEach((c,i)=>{if(c.note)out.push({kind:'scene',id:'c:'+c.id,i:i+1,name:c.name,t:null,range:[c.in,c.out],note:c.note,done:!!c.noteDone,clip:c})});
  (p.marks||[]).forEach(m=>{const c=(p.clips||[]).find(x=>x.id===m.clipId);out.push({kind:'frame',id:m.id,t:m.t,name:c?c.name:'',i:c?idx(p,c):'',note:m.note,done:!!m.done,thumb:m.thumb,m})});
  return out.sort((a,b)=>((a.t!=null?a.t:a.range[0])-(b.t!=null?b.t:b.range[0])))}
function instruction(p){const L=items(p).filter(x=>!x.done);const lines=L.map((x,i)=>`${i+1}. ${x.kind==='scene'?`סצנה ${x.i} "${x.name}" (${fmt(x.range[0])} עד ${fmt(x.range[1])} במקור)`:`פריים ${fmt(x.t)}${x.name?' בסצנה '+x.i+' "'+x.name+'"':''}`}: ${x.note}`);
  return (p.fixNote?p.fixNote.trim()+'\n':'')+'תיקונים לפי ההערות של העורך, כל הערה בנפרד ובמקום שלה, בלי לשנות דברים שלא הוזכרו:\n'+lines.join('\n')}

// ---------- the pieces that go into the studio's panels ----------
function fixesCard(p){const L=items(p);const open=L.filter(x=>!x.done).length;
  return `<section class="v224fx" data-v224card="fx"><h4>תיקונים <small>${L.length?open+' פתוחים מתוך '+L.length:'אין עדיין הערות'}</small></h4>
  <p class="v204hint">הערה על סצנה: בוחרים סצנה ובלשונית "מאפיינים" כותבים. הערה על פריים: עוצרים על הפריים ולוחצים "הערה בפריים הזה" בנגן. אחר כך Claude (Opus 5.5) מתקן כאן, או שהרשימה עם הפריימים נשלחת לעורך בענן.</p>
  ${L.length?`<ol class="v224list">${L.map(x=>`<li class="${x.done?'done':''}" data-v224item="${E(x.id)}">${x.thumb?`<img src="${x.thumb}" alt="">`:'<i></i>'}<div><b>${x.kind==='scene'?`סצנה ${x.i} · ${E(x.name)}`:`פריים ${fmt(x.t)}${x.i?' · סצנה '+x.i:''}`}</b>${x.kind==='frame'&&!x.note?`<input type="text" data-v224f="mnote" data-id="${E(x.id)}" placeholder="מה לתקן בפריים הזה?" autofocus>`:`<span>${E(x.note)}</span>`}</div><span class="v224ia"><button type="button" data-v224="jump" data-id="${E(x.id)}" title="קפיצה לנקודה">⏵</button><button type="button" data-v224="done" data-id="${E(x.id)}" aria-pressed="${x.done}" title="${x.done?'לפתוח מחדש':'סומן כבוצע'}">✓</button><button type="button" data-v224="del" data-id="${E(x.id)}" title="מחיקה">✕</button></span></li>`).join('')}</ol>`:''}
  <label class="v204fl">הנחיה כללית לתיקון (לא חובה)<textarea data-v224f="fixNote" rows="2" placeholder="למשל: לשמור על הקצב, לא לקצר את הסוף">${E(p.fixNote||'')}</textarea></label>
  <div class="v204row"><button type="button" class="v204b pri" data-v224="fix" ${open&&!(S()||{}).busy?'':'disabled'}>✦ Claude מתקן כאן (Opus 5.5)</button><button type="button" class="v204b" data-v224="cloud" ${open?'':'disabled'}>שליחה לעורך בענן עם ההערות</button>${L.some(x=>x.done)?`<button type="button" class="v204b" data-v224="clear">ניקוי מה שבוצע</button>`:''}</div></section>`}
function sceneBox(p,c){const ms=(p.marks||[]).filter(m=>m.clipId===c.id);
  return `<div class="v224box" data-v224card="scene"><label class="v204fl">הערות לתיקון לסצנה הזו<textarea data-v224f="cnote" data-id="${E(c.id)}" rows="3" placeholder="מה לתקן בסצנה? למשל: לקצר את ההתחלה, להגדיל את הכותרת, להוסיף זום על המילה">${E(c.note||'')}</textarea></label>
  <div class="v204row"><button type="button" class="v204b" data-v224="mark">✎ הערה בפריים הזה (${fmt((S()||{}).t||0)})</button><button type="button" class="v204b" data-v224="tofix">לרשימת התיקונים${items(p).length?' ('+items(p).filter(x=>!x.done).length+')':''}</button></div>
  ${ms.length?`<ul class="v224marks">${ms.map(m=>`<li class="${m.done?'done':''}">${m.thumb?`<img src="${m.thumb}" alt="">`:''}<b>${fmt(m.t)}</b><span>${E(m.note||'(בלי טקסט)')}</span><button type="button" data-v224="jump" data-id="${E(m.id)}" title="קפיצה">⏵</button></li>`).join('')}</ul>`:''}</div>`}
function inject(){try{const s=S();const p=P();if(!s||!p||typeof APP==='undefined'||APP.view!=='vstudio')return;load(p);
  const ctl=$('.v204ctl');if(ctl&&!ctl.querySelector('[data-v224="mark"]')){const b=document.createElement('button');b.type='button';b.dataset.v224='mark';b.className='v224mk';b.title='הערה על הפריים שמתחת לסמן';b.innerHTML='✎ <span>הערה בפריים</span>';ctl.appendChild(b)}
  const rp=$('.v205rp');if(rp){if(s.rtab==='ai'&&!rp.querySelector('[data-v224card="fx"]'))rp.insertAdjacentHTML('afterbegin',fixesCard(p));
    if(s.rtab==='insp'&&!rp.querySelector('[data-v224card="scene"]')){const nm=rp.querySelector('[data-v204="name"]');const c=nm&&s.cur&&(p.clips||[]).find(x=>x.id===s.cur);if(nm&&c){const lab=nm.closest('label')||nm;lab.insertAdjacentHTML('afterend',sceneBox(p,c))}}}
  document.querySelectorAll('.v204list li.v204sc').forEach(li=>{const c=(p.clips||[]).find(x=>x.id===li.dataset.id);if(!c)return;const n=(c.note?1:0)+(p.marks||[]).filter(m=>m.clipId===c.id).length;let u=li.querySelector('.v224n');if(!n){if(u)u.remove();return}if(!u){u=document.createElement('u');u.className='v224n';const sp=li.querySelector('.v204st span');(sp||li).appendChild(u)}u.textContent='✎ '+n;u.title=n+' הערות לתיקון'})
}catch(e){console.warn('v224',e)}}
let obT=0;new MutationObserver(()=>{clearTimeout(obT);obT=setTimeout(inject,60)}).observe(document.body,{childList:true,subtree:true});setTimeout(inject,1500);

// ---------- actions ----------
document.addEventListener('click',async e=>{const b=e.target.closest&&e.target.closest('[data-v224]');if(!b)return;const s=S(),p=P();if(!s||!p)return;load(p);const a=b.dataset.v224,id=b.dataset.id;
  if(a==='mark'){const t=+(s.t||0);const c=clipAt(p,t);const m={id:uid(),t:+t.toFixed(2),clipId:c?c.id:null,note:'',thumb:thumb(),at:Date.now()};p.marks.push(m);save(p);s.rtab='ai';__v204.refresh();setTimeout(()=>{const i=document.querySelector(`[data-v224f="mnote"][data-id="${m.id}"]`);i&&i.focus()},80);toastS('הערה חדשה על הפריים '+fmt(t)+'. כתבו מה לתקן');return}
  if(a==='tofix'){s.rtab='ai';__v204.refresh();return}
  if(a==='jump'){const m=(p.marks||[]).find(x=>x.id===id);if(m){__v204.seek(m.t)}else if(id&&id.startsWith('c:')){const c=(p.clips||[]).find(x=>x.id===id.slice(2));if(c){try{const {L}=__v204.lay(p);const r=L.find(x=>x.c===c);if(r)__v204.seek(r.start+0.02)}catch(x){}}}return}
  if(a==='done'){const m=(p.marks||[]).find(x=>x.id===id);if(m)m.done=!m.done;else if(id&&id.startsWith('c:')){const c=(p.clips||[]).find(x=>x.id===id.slice(2));if(c)c.noteDone=!c.noteDone}save(p);__v204.refresh();return}
  if(a==='del'){if(id&&id.startsWith('c:')){const c=(p.clips||[]).find(x=>x.id===id.slice(2));if(c){c.note='';c.noteDone=false}}else p.marks=(p.marks||[]).filter(x=>x.id!==id);save(p);__v204.refresh();return}
  if(a==='clear'){(p.clips||[]).forEach(c=>{if(c.noteDone){c.note='';c.noteDone=false}});p.marks=(p.marks||[]).filter(x=>!x.done);save(p);__v204.refresh();return}
  if(a==='fix'){const instr=instruction(p);if(!items(p).some(x=>!x.done)){toastS('אין הערות פתוחות');return}try{await __v204.ask(instr,'project')}catch(x){toastS('התיקון נכשל: '+((x&&x.message)||x))}return}
  if(a==='cloud'){const V=window.__vid;if(!V||!V.VD||!V.VD.db){toastS('השליחה לעורך זמינה כשהדף פתוח ב-claude.ai עם הרשאת עריכה');return}const url=p.src&&p.src.url;if(!url){toastS('הסרטון הזה נמצא רק במכשיר הזה. ייצאו אותו לספרייה, פתחו אותו משם ושלחו שוב');return}
    const fixes=items(p).filter(x=>!x.done).map(x=>({kind:x.kind,scene:x.i||null,name:x.name||'',t:x.t,range:x.range||null,note:x.note,thumb:x.kind==='frame'?(x.thumb||''):''}));const reel=window.__v221&&p.reel&&p.reel.length?__v221.planOf(p.reel):null;
    b.disabled=true;try{const d=await V.queueDoc({id:'v'+Date.now().toString(36),name:p.name,srcUrl:url,srcId:(String(url).match(/_blob\/([0-9a-f]{32})/)||[])[1]||null,source:'studio',status:'plan_requested',phase:'plan',fixes,fixNote:p.fixNote||'',reel,reelPrompt:reel?__v221.fullPrompt(p.reel):null,requested:new Date().toISOString()});await V.editVideo(Object.assign({__direct:1},d));toastS('נשלח לעורך בענן עם '+fixes.length+' הערות. התוכנית תחכה לאישור שלך')}catch(x){toastS('השליחה נכשלה: '+((x&&x.message)||x))}b.disabled=false;return}
},true);
document.addEventListener('change',e=>{const t=e.target.closest&&e.target.closest('[data-v224f]');if(!t)return;const p=P();if(!p)return;load(p);const k=t.dataset.v224f;
  if(k==='cnote'){const c=(p.clips||[]).find(x=>x.id===t.dataset.id);if(c){c.note=t.value.trim();c.noteDone=false}}
  else if(k==='mnote'){const m=(p.marks||[]).find(x=>x.id===t.dataset.id);if(m)m.note=t.value.trim()}
  else if(k==='fixNote')p.fixNote=t.value;
  save(p);const s=S();if(s&&(k!=='fixNote'))__v204.refresh()},true);
document.addEventListener('keydown',e=>{const t=e.target;if(e.key==='Enter'&&t&&t.dataset&&t.dataset.v224f==='mnote'){e.preventDefault();t.blur()}});
window.__v224={items,instruction,inject,load};
})();
/*V224:END*/
