import shutil
P='ce15.html'
s=open(P,encoding='utf8').read()
if 'V127 ·' in s: raise SystemExit('already built')
shutil.copy(P,'ce15.bak127')
def rep(a,b):
    global s
    assert s.count(a)==1,(s.count(a),a[:80]); s=s.replace(a,b)
M='// ================= V83 · safe external opener'
assert s.count(M)==1 and s.count('</head>')==1
# V126 sits after the tray when the tray is there
rep("function place(){const top=document.querySelector('.v100top');if(!top)return;let s=document.getElementById('v126');if(s&&s.previousElementSibling===top)return;if(s)s.remove();top.insertAdjacentHTML('afterend',html())}",
    "function place(){const top=document.querySelector('.v100top');if(!top)return;const an=document.getElementById('v127')||top;let s=document.getElementById('v126');if(s&&s.previousElementSibling===an)return;if(s)s.remove();an.insertAdjacentHTML('afterend',html())}")
# the editor routine receives the kit, joined parts and trims
rep("emojis:d.emojis||{},artifact:ART};","emojis:d.emojis||{},kit:d.kit||null,parts:d.parts||null,mode:d.mode||null,trim:d.trim||null,mute:!!d.mute,pro:d.pro||null,artifact:ART};")
s=s.replace(M,open('v127.js',encoding='utf8').read()+'\n'+M).replace('</head>',open('k127css.txt',encoding='utf8').read()+'</head>')
open(P,'w',encoding='utf8').write(s);print('ok',len(s))
