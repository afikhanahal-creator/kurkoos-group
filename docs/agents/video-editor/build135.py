import shutil
P='ce15.html'
s=open(P,encoding='utf8').read()
if 'V135 ·' in s: raise SystemExit('already built')
shutil.copy(P,'ce15.bak135')
M='// ================= V83 · safe external opener'
s=s.replace(M,open('v135.js',encoding='utf8').read()+'\n'+M).replace('</head>',open('k135css.txt',encoding='utf8').read()+'</head>')
open(P,'w',encoding='utf8').write(s);print('ok',len(s))
