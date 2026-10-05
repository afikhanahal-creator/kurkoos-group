import shutil, json, re, os
P='ce15.html'
s=open(P,encoding='utf8').read()
if 'V128 ·' in s: raise SystemExit('already built')
shutil.copy(P,'ce15.bak128')
def rep(a,b):
    global s
    assert s.count(a)==1,(s.count(a),a[:80]); s=s.replace(a,b)
R='/home/user/kurkoos-group/.claude/skills/kurkoos-video-pro/references/'
def prompt(f):
    t=open(R+f,encoding='utf8').read()
    return t.split('## הפרומפט, מילה במילה',1)[1].strip()
P2={'base':'10-base-engine.md','all':'11-all-effects.md','opening':'12-opening-slam.md','title3d':'13-title-3d.md','shatter':'14-shatter.md','popout':'15-pop-out.md','flip':'16-flip.md','worlds':'17-worlds.md','freeze':'18-time-freeze.md','giant':'19-giant.md','pixel':'20-pixel-break.md','zoom':'21-infinite-zoom.md','cube':'22-cube.md','money':'23-money.md','comment':'24-comment-dm.md','hologram':'25-hologram.md','finale':'26-finale.md','rewind':'27-rewind.md','sound':'28-sound.md','review':'29-review.md'}
prompts={k:prompt(v) for k,v in P2.items()}
js=open('v128_tpl.js',encoding='utf8').read().replace('__PROMPTS__',json.dumps(prompts,ensure_ascii=False))
open('v128.js','w',encoding='utf8').write(js)
M='// ================= V83 · safe external opener'
assert s.count(M)==1 and s.count('</head>')==1
# statuses for the plan gate and the daily library
rep("const STATUS={queued:['בתור לעריכה','q'],editing:['בעריכה…','e'],done:['מוכן','d'],failed:['נכשל','f']};",
    "const STATUS={queued:['בתור לעריכה','q'],editing:['בעריכה…','e'],done:['מוכן','d'],failed:['נכשל','f'],plan_requested:['מכין תוכנית…','e'],planning:['מכין תוכנית…','e'],awaiting_approval:['ממתין לאישור שלך','q'],approved:['אושר, בעריכה…','e'],library:['בספרייה','d']};")
# the routine gets the effects, the phase and the notes
rep("trim:d.trim||null,mute:!!d.mute,pro:d.pro||null,artifact:ART};","trim:d.trim||null,mute:!!d.mute,pro:d.pro||null,sig:d.sig||null,phase:d.phase||null,base:d.base||null,planNote:d.planNote||null,artifact:ART};")
# V126 sits after the effects studio
rep("const an=document.getElementById('v127')||top;let s=document.getElementById('v126');","const an=document.getElementById('v128')||document.getElementById('v127')||top;let s=document.getElementById('v126');")
s=s.replace(M,js+'\n'+M).replace('</head>',open('k128css.txt',encoding='utf8').read()+'</head>')
open(P,'w',encoding='utf8').write(s);print('ok',len(s))
