import shutil
P='ce15.html'
s=open(P,encoding='utf8').read()
if 'V140 ·' in s: raise SystemExit('already built')
shutil.copy(P,'ce15.bak140')
M='// ================= V83 · safe external opener'
s=s.replace(M,open('v140.js',encoding='utf8').read()+'\n'+M)
s=s.replace('</head>',open('k140css.txt',encoding='utf8').read()+'\n</head>',1)
open(P,'w',encoding='utf8').write(s);print('ok',len(s))
