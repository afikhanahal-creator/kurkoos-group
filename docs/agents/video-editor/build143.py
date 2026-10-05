import shutil
P='ce15.html'
s=open(P,encoding='utf8').read()
if 'V143 ·' in s: raise SystemExit('already built')
shutil.copy(P,'ce15.bak143')
M='// ================= V83 · safe external opener'
s=s.replace(M,open('v143.js',encoding='utf8').read()+'\n'+M)
s=s.replace('</head>',open('k143css.txt',encoding='utf8').read()+'\n</head>',1)
open(P,'w',encoding='utf8').write(s);print('ok',len(s))
