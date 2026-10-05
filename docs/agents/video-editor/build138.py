import shutil
P='ce15.html'
s=open(P,encoding='utf8').read()
if 'V138 ·' in s: raise SystemExit('already built')
shutil.copy(P,'ce15.bak138')
def rep(a,b):
    global s
    assert s.count(a)==1,(s.count(a),a[:80]); s=s.replace(a,b)
M='// ================= V83 · safe external opener'
# a touch drag the phone interrupts is followed to its drop instead of being thrown away
rep("document.addEventListener('pointercancel',()=>{if(DD.s)ddEnd(false)});",
    "document.addEventListener('pointercancel',e=>{if(!DD.s)return;if(DD.s.on&&e.pointerType!=='mouse'){DD.s.tc=1;try{window.__v136&&__v136.ev('dd:pcancel-follow')}catch(x){}return}ddEnd(false)});")
s=s.replace(M,open('v138.js',encoding='utf8').read()+'\n'+M)
s=s.replace('</head>',open('k138css.txt',encoding='utf8').read()+'\n</head>',1)
open(P,'w',encoding='utf8').write(s);print('ok',len(s))
