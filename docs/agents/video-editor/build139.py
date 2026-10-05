import shutil
P='ce15.html'
s=open(P,encoding='utf8').read()
if 'V139 ·' in s: raise SystemExit('already built')
shutil.copy(P,'ce15.bak139')
def rep(a,b):
    global s
    assert s.count(a)==1,(s.count(a),a[:80]); s=s.replace(a,b)
# V139 · a preview opens on the video itself: second 0 is the opening card's empty first frame (only the palette colour),
#        so a newly chosen video is shown from its first frame; "צפייה מההתחלה" still plays the opening
rep("function pvDraw(){const cv=document.getElementById('v127cv'),it=selItem();if(!cv||!it)return;",
    "function pvDraw(){const cv=document.getElementById('v127cv'),it=selItem();if(!cv||!it)return;/*V139 · open on the video*/if(!T.pv.playing&&T.pv.t===0&&it.dur&&!it._v139){it._v139=1;T.pv.t=seqOf([it]).intro+0.4}")
rep("function draw(){const cv=document.getElementById('v129cv');if(!cv||!E.p||!window.__v127)return;",
    "function draw(){const cv=document.getElementById('v129cv');if(!cv||!E.p||!window.__v127)return;if(!E.playing&&E.t===0&&E.p.dur&&E._v139!==E.p.id){E._v139=E.p.id;E.t=seq().intro+0.4}")
# the clip line under a tray video: length first, the cut only when there is one
rep("${fmtT(x.in)}–${fmtT(x.out)} מתוך ${fmtT(x.dur)}",
    "אורך ${fmtT(x.dur)}${(x.in>0.05||(x.out&&x.out<x.dur-0.05))?` · חיתוך ${fmtT(x.in)} עד ${fmtT(x.out)}`:''}")
s=s.replace('</head>',open('k139css.txt',encoding='utf8').read()+'\n</head>',1)
open(P,'w',encoding='utf8').write(s);print('ok',len(s))
