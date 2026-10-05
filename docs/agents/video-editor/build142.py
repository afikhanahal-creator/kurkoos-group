import shutil
P='ce15.html'
s=open(P,encoding='utf8').read()
if 'V142 ·' in s: raise SystemExit('already built')
shutil.copy(P,'ce15.bak142')
def rep(a,b):
    global s
    assert s.count(a)==1,(s.count(a),a[:80]); s=s.replace(a,b)
rep("(p.src.kind==='tray'?'מקומי, עוד לא נשלח':'')","(p.src.kind==='tray'?'בעריכה כאן · נשמר אוטומטית':'')")
M='// ================= V83 · safe external opener'
s=s.replace(M,open('v142.js',encoding='utf8').read()+'\n'+M)
s=s.replace('</head>',open('k142css.txt',encoding='utf8').read()+'\n</head>',1)
open(P,'w',encoding='utf8').write(s);print('ok',len(s))
