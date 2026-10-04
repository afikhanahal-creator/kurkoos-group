import shutil
P='ce15.html'
s=open(P,encoding='utf8').read()
if 'V134 ·' in s: raise SystemExit('already built')
shutil.copy(P,'ce15.bak134')
def rep(a,b):
    global s
    assert s.count(a)==1,(s.count(a),a[:80]); s=s.replace(a,b)
M='// ================= V83 · safe external opener'
rep("window.__v129={open,openFromTray,openFromDoc,E,PROJ:()=>PROJ,frameAt,seq,play,doExport,sendPro,refresh};","window.__v129={open,openFromTray,openFromDoc,E,PROJ:()=>PROJ,frameAt,seq,play,doExport,sendPro,refresh,change,undo,buildRecipe};")
s=s.replace(M,open('v134.js',encoding='utf8').read()+'\n'+M).replace('</head>',open('k134css.txt',encoding='utf8').read()+'</head>')
open(P,'w',encoding='utf8').write(s);print('ok',len(s))
