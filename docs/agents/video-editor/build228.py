import os,sys
H=os.path.dirname(os.path.abspath(__file__))
P=sys.argv[1] if len(sys.argv)>1 else 'ce15.html'
s=open(P,encoding='utf8').read()
# V228: video from a description via Claude Code. JS before the V83 marker, styles before <style id="k150">.
js=open(os.path.join(H,'v228.js'),encoding='utf8').read().strip('\n')
A,Z='/*V228:START*/','/*V228:END*/'
if A in s:
    i=s.index(A);j=s.index(Z,i)+len(Z);s=s[:i]+js+s[j:]
else:
    B='// ================= V83 · safe external opener'
    assert s.count(B)==1;s=s.replace(B,js+'\n\n'+B)
css=open(os.path.join(H,'k228css.txt'),encoding='utf8').read().strip()
if '<style id="k228">' in s:
    i=s.index('<style id="k228">');j=s.index('</style>',i)+len('</style>');s=s[:i]+css+s[j:]
else:
    assert s.count('<style id="k150">')==1;s=s.replace('<style id="k150">',css+'<style id="k150">')
assert s.count(A)==1
# the cloud editor payload carries the description, the length, the format and the first frame
old="reel:d.reel||null,reelPrompt:d.reelPrompt||null,fixes:d.fixes||null,fixNote:d.fixNote||null,artifact:ART}"
new="reel:d.reel||null,reelPrompt:d.reelPrompt||null,fixes:d.fixes||null,fixNote:d.fixNote||null,prompt:d.prompt||null,len:d.len||null,fmt:d.fmt||null,firstFrame:d.firstFrame||null,artifact:ART}"
if old in s: s=s.replace(old,new)
assert s.count(new)==1,'fire payload patch'
# the OpenAI submit handler yields to V228 (both listen on the document in the capture phase; V214 registered first)
old2="document.addEventListener('submit',e=>{const f=e.target;if(!f.dataset||f.dataset.v214!=='gen')return;e.preventDefault();G.form.prompt="
new2="document.addEventListener('submit',e=>{const f=e.target;if(!f.dataset||f.dataset.v214!=='gen')return;if(window.__v228)return;e.preventDefault();G.form.prompt="
if old2 in s: s=s.replace(old2,new2)
assert s.count(new2)==1,'V214 submit patch'
# the card itself names Claude Code, not the video provider
old3="<small>${G.info?(G.info.configured?`מחובר: ${G.info.provider==='veo'?'Google Veo':'OpenAI Sora'} (${E(G.info.model)})`:'לא מוגדר עדיין: צריך מפתח ב-Vercel'):''}</small>"
new3="<small>Claude Code (Opus 5.5) בונה את הסרטון עם HyperFrames לפי התיאור, בערכת המותג של קורקוס</small>"
if old3 in s: s=s.replace(old3,new3)
assert s.count(new3)==1,'card label patch'
old4="<button type=\"submit\" class=\"v204b pri\" ${G.busy?'disabled':''}>יצירת הסרטון</button>"
new4="<button type=\"submit\" class=\"v204b pri\" ${G.busy?'disabled':''}>יצירת הסרטון עם Claude Code</button>"
if old4 in s: s=s.replace(old4,new4)
assert s.count(new4)==1,'card button patch'
old5="ספק הווידאו (כמה דקות), נשמר בענן שלנו ונפתח כאן לעריכה: כתוביות, לוגו, מוזיקה וייצוא."
new5="Claude Code (Opus 5.5) עם HyperFrames (כמה דקות): אנימציה, כותרות, לוגו ומוזיקה לפי התיאור, בלי ספק וידאו חיצוני. הוא נשמר בענן שלנו ונפתח כאן לעריכה."
if old5 in s: s=s.replace(old5,new5)
assert s.count(new5)==1,'card hint patch'
open(P,'w',encoding='utf8').write(s);print('ok 228',P)
