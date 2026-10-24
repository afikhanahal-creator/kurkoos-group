import os,sys
H=os.path.dirname(os.path.abspath(__file__))
P=sys.argv[1] if len(sys.argv)>1 else 'ce15.html'
s=open(P,encoding='utf8').read()
# ---------- V226 module (review studio, script writer, background progress chip) ----------
js=open(os.path.join(H,'v226.js'),encoding='utf8').read().strip('\n')
A,Z='/*V226:START*/','/*V226:END*/'
if A in s:
    i=s.index(A);j=s.index(Z,i)+len(Z);s=s[:i]+js+s[j:]
else:
    B='// ================= V83 · safe external opener'
    assert s.count(B)==1;s=s.replace(B,js+'\n\n'+B)
css=open(os.path.join(H,'k226css.txt'),encoding='utf8').read().strip()
if '<style id="k226">' in s:
    i=s.index('<style id="k226">');j=s.index('</style>',i)+len('</style>');s=s[:i]+css+s[j:]
else:
    assert s.count('<style id="k150">')==1;s=s.replace('<style id="k150">',css+'<style id="k150">')
assert s.count(A)==1
# ---------- V225 source patches inside the studio (V204) ----------
a=s.index('/*V204:START*/');z=s.index('/*V204:END*/',a);blk=s[a:z]
def rep(old,new,tag):
    global blk
    if new in blk: return
    assert blk.count(old)==1,tag
    blk=blk.replace(old,new)
# P1 · opening a project shows the studio (the view never switched, so "פותחים אותו לעריכה" opened nothing)
rep("async function openProject(id){const p=S.list[id];if(!p)return;migrate(p);stopPlay();",
    "async function openProject(id){const p=S.list[id];if(!p)return;if(typeof APP!=='undefined'&&APP.view!=='vstudio'){try{go('vstudio')}catch(e){APP.view='vstudio'}}migrate(p);stopPlay();",'P1')
# P2 · the project opens at once as one scene; scene detection runs in the background and splits the scenes when it is done
old_head="  S.busy={t:'קורא את הסרטון',pct:0};paintBusy();const v=mkVideo(url);v.muted=true;await ready(v);if(!v.duration||!isFinite(v.duration))throw new Error('הדפדפן לא הצליח לקרוא את הסרטון. נסו קובץ MP4 או MOV');\n  p.meta.dur=v.duration;p.meta.w=v.videoWidth;p.meta.h=v.videoHeight;\n"
new_head="  S.busy={t:'קורא את הסרטון',pct:0};paintBusy();const v=mkVideo(url);v.muted=true;await ready(v);if(!v.duration||!isFinite(v.duration))throw new Error('הדפדפן לא הצליח לקרוא את הסרטון. נסו קובץ MP4 או MOV');\n  p.meta.dur=v.duration;p.meta.w=v.videoWidth;p.meta.h=v.videoHeight;\n  // V225: one scene right away, the viewer can start; the cuts and the thumbnails arrive from the background pass below\n  if(!p.clips.length){p.clips=[mkClip(0,v.duration,{name:'סצנה 1'})]}p.base=clone(core(p));p.status='ready';S.busy=null;S.cur=p.clips[0].id;logOp({kind:'import',instr:'ייבוא',status:'auto',result:fmt(v.duration)});persist(p);\n  detectScenes(p,v,url).catch(e=>console.warn('v225 scenes',e));return}\nasync function detectScenes(p,v,url){S.bg={t:'מזהה סצנות ברקע',pct:0};const yieldNow=()=>new Promise(r=>setTimeout(r,0));\n"
rep(old_head,new_head,'P2 head')
rep("for(let t=0,n=0;t<dur-0.05;t+=step,n++){await seekTo(v,t);S.busy={t:'מזהה סצנות',pct:t/dur};paintBusy();x.drawImage(v,0,0,cw,ch);",
    "for(let t=0,n=0;t<dur-0.05;t+=step,n++){if(S.p!==p){S.bg=null;return}await seekTo(v,t);S.bg={t:'מזהה סצנות ברקע',pct:t/dur};if(n%8===0)await yieldNow();x.drawImage(v,0,0,cw,ch);",'P2 loop')
old_tail="  p.clips=raw.map((r,i)=>mkClip(r.in,r.out,{name:'סצנה '+(i+1),thumb:nearT(r.in)}));if(tainted)p.note='הסרטון מוגש משרת אחר בלי הרשאה לקרוא פיקסלים, אז הוא נכנס כקטע אחד';\n  S.busy={t:'קורא את השמע',pct:0};paintBusy();try{await audio(p,url)}catch(e){p.meta.hasAudio=false}\n  p.base=clone(core(p));p.status='ready';logOp({kind:'import',instr:'ייבוא וזיהוי סצנות',status:'auto',result:`${p.clips.length} סצנות, ${fmt(dur)}`});S.busy=null;persist(p)}"
new_tail="  const untouched=p.clips.length===1&&!p.ops.some(o=>o.kind!=='import')&&!p.layers.length;\n  if(tainted)p.note='הסרטון מוגש משרת אחר בלי הרשאה לקרוא פיקסלים, אז הוא נכנס כקטע אחד';\n  if(untouched){p.clips=raw.map((r,i)=>mkClip(r.in,r.out,{name:'סצנה '+(i+1),thumb:nearT(r.in)}));p.base=clone(core(p));S.cur=p.clips[0].id;logOp({kind:'import',instr:'זיהוי סצנות',status:'auto',result:`${p.clips.length} סצנות, ${fmt(dur)}`})}\n  else{p.clips.forEach(c=>{if(!c.thumb)c.thumb=nearT(c.in)});if(raw.length>1)p.pendingCuts=raw.map(r=>({in:r.in,out:r.out,thumb:nearT(r.in)}))}\n  S.bg={t:'קורא את השמע',pct:-1};try{await audio(p,url)}catch(e){p.meta.hasAudio=false}\n  S.bg=null;persist(p);if(S.p===p){refresh();if(!S.playing)paint()}}"
rep(old_tail,new_tail,'P2 tail')
# P3 · playback paints at most once per video frame (30 a second), and the stage canvas is no larger than the screen needs
rep("pl.play(p,{onFrame:t=>{S.t=t;MX.sync(P(),t,true);paint();",
    "pl.play(p,{onFrame:t=>{S.t=t;MX.sync(P(),t,true);const _n=performance.now();if(_n-(S.__lp||0)>=31){S.__lp=_n;paint()}",'P3 throttle')
rep("function paint(){const cv=cvs();const p=P();if(!cv||!p||!PL)return;const [W,H]=outDims(p,1280);",
    "function paint(){const cv=cvs();const p=P();if(!cv||!p||!PL)return;const [W,H]=outDims(p,(window.__v226&&__v226.stageMax&&__v226.stageMax(cv))||1280);",'P3 size')
# P4 · the studio's own keys yield while the review overlay is open (both listen on the window)
rep("window.addEventListener('keydown',e=>{if(typeof APP==='undefined'||APP.view!=='vstudio'||!S.p)return;const tag=(e.target.tagName||'').toUpperCase();const k=e.key;",
    "window.addEventListener('keydown',e=>{if(typeof APP==='undefined'||APP.view!=='vstudio'||!S.p)return;if(window.__v226&&__v226.R&&__v226.R.open)return;const tag=(e.target.tagName||'').toUpperCase();const k=e.key;",'P4 keys')
s=s[:a]+blk+s[z:]
open(P,'w',encoding='utf8').write(s);print('ok 225+226',P)
