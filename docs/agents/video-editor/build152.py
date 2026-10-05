import shutil
P='ce15.html'
s=open(P,encoding='utf8').read()
if '// ================= V152 ·' in s: raise SystemExit('already built')
shutil.copy(P,'ce15.bak152')
def rep(a,b):
    global s
    assert s.count(a)==1,(a[:70],s.count(a));s=s.replace(a,b)
# gallery module exposes its state and uploader
rep("window.__v148={hide,unhide,HID,SHADOW};","window.__v148={hide,unhide,HID,SHADOW,get S(){return S},up:f=>uploadMine(f),render:()=>render()};")
# bulk upload: up to 300 at a time, three in parallel, one failure does not stop the rest
rep("const list=[...files].filter(f=>/^image\\//.test(f.type)).slice(0,40);if(!list.length)return;let ok=0;\n for(const f of list){S.busy=`מעלה ${ok+1} מתוך ${list.length}…`;render();\n  try{",
    "const list=[...files].filter(f=>/^image\\//.test(f.type)).slice(0,300);if(!list.length)return;let ok=0,bad=0,stop=false,ix=0;\n const one=async f=>{\n  try{")
rep("if(KC.db)await KC.db.collection('photos').doc(r.id).set(meta);regUpload(r.id,meta);ok++}\n  catch(x){const c=x&&x.code;tst(c==='too_large'?'קובץ גדול מדי':c==='quota_or_state'?'נגמר המקום בספרייה':'ההעלאה נכשלה');break}}\n S.busy='';S.src='up';S.group='new';save();render();if(ok)tst(`${ok} תמונות נוספו. אפשר לפתוח כל אחת ולשייך לפרויקט`)}",
    "if(KC.db)await KC.db.collection('photos').doc(r.id).set(meta);regUpload(r.id,meta);ok++}\n  catch(x){const c=x&&x.code;bad++;if(c==='quota_or_state'){stop=true;tst('נגמר המקום בספרייה')}}\n  S.busy=`מעלה תמונות: ${ok+bad} מתוך ${list.length}${bad?` · ${bad} נכשלו`:''}`;const b=document.querySelector('.v144busy');if(b)b.textContent=S.busy;else render()};\n S.busy=`מעלה ${list.length} תמונות…`;render();\n await Promise.all([0,1,2].map(async()=>{while(!stop&&ix<list.length){await one(list[ix++])}}));\n S.busy='';S.src='up';S.group='new';save();render();tst(ok?`${ok} תמונות נוספו${bad?`, ${bad} לא עלו (קובץ פגום או גדול מדי)`:''}. אפשר לסמן אותן וליצור מהן פוסטים`:'אף תמונה לא עלתה. נסו JPG או PNG')}")
# the upload button says you can pick many, and drop works
rep("${ico('plus',15)} העלאת תמונות<input type=\"file\" accept=\"image/*\" multiple data-v144up hidden></label>",
    "${ico('plus',15)} העלאת תמונות (אפשר הרבה)<input type=\"file\" accept=\"image/*\" multiple data-v144up hidden></label>")
# selection bar: create posts with the agent
rep("<button type=\"button\" class=\"px-btn sm v144del\" data-v144=\"hidesel\" ${S.sel.size?'':'disabled'}>הסרה מהגלריה</button>",
    "<select data-v152=\"n\" aria-label=\"כמה פוסטים לכל תמונה\"><option value=\"1\">פוסט 1 לתמונה</option><option value=\"2\" selected>2 פוסטים לתמונה</option><option value=\"3\">3 פוסטים לתמונה</option><option value=\"4\">4 פוסטים לתמונה</option></select><button type=\"button\" class=\"px-btn sm pri v152gen\" data-v152=\"gen\" ${S.sel.size?'':'disabled'}>יצירת פוסטים עם הסוכן</button><button type=\"button\" class=\"px-btn sm v144del\" data-v144=\"hidesel\" ${S.sel.size?'':'disabled'}>הסרה מהגלריה</button>")
rep("document.querySelectorAll('.v148bar [data-v144=\"hidesel\"],.v148bar select')","document.querySelectorAll('.v148bar [data-v144=\"hidesel\"],.v148bar [data-v152=\"gen\"],.v148bar select')")
# created date on post cards
rep("<figcaption><b>${esc(pxHead(p).slice(0,64))}</b><span>${esc(p.series||GA_FAM[x.fam])} · ${esc(ED_NAMES[p.layout]||p.layout)}</span></figcaption>",
    "<figcaption><b>${esc(pxHead(p).slice(0,64))}</b><span>${esc(p.series||GA_FAM[x.fam])} · ${esc(ED_NAMES[p.layout]||p.layout)}</span>${window.__v152c?__v152c(p):''}</figcaption>")
rep("<h3>${esc(pxHead(p))}</h3><div class=\"px-ps\">${esc(ED_NAMES[p.layout]||p.layout)}${w.comments.length?` · ${ico('msg',12)} ${w.comments.length}`:''}</div></div></article>`}",
    "<h3>${esc(pxHead(p))}</h3><div class=\"px-ps\">${esc(ED_NAMES[p.layout]||p.layout)}${w.comments.length?` · ${ico('msg',12)} ${w.comments.length}`:''}</div>${window.__v152c?__v152c(p):''}</div></article>`}")
rep("<b>${esc(pxHead(p).slice(0,58))}</b><span>","<b>${esc(pxHead(p).slice(0,58))}</b>${window.__v152c?__v152c(p):''}<span>")
# "newest first" sorts by the real creation time
rep("new:(a,b)=>(AG.posts.indexOf(a.p))-(AG.posts.indexOf(b.p)),","new:(a,b)=>((window.__v152?__v152.createdOf(b.p)-__v152.createdOf(a.p):0)||(AG.posts.indexOf(a.p)-AG.posts.indexOf(b.p))),")
rep("<option value=\"new\"${f.sort==='new'?' selected':''}>החדשים קודם</option>","<option value=\"new\"${f.sort==='new'?' selected':''}>לפי תאריך יצירה, החדשים קודם</option>")
css=open('k152css.txt',encoding='utf8').read()
rep('<style id="k150">',css+'<style id="k150">')
M='// ================= V83 · safe external opener'
assert s.count(M)==1
s=s.replace(M,open('v152.js',encoding='utf8').read()+'\n'+M)
open(P,'w',encoding='utf8').write(s);print('ok 152')
