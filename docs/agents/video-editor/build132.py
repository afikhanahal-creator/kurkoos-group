import shutil
P='ce15.html'
s=open(P,encoding='utf8').read()
if 'V132 ·' in s: raise SystemExit('already built')
shutil.copy(P,'ce15.bak132')
M='// ================= V83 · safe external opener'
s=s.replace(M,open('v132.js',encoding='utf8').read()+'\n'+M).replace('</head>',open('k132css.txt',encoding='utf8').read()+'</head>')
open(P,'w',encoding='utf8').write(s);print('ok',len(s))
