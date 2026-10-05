import shutil
P='ce15.html'
s=open(P,encoding='utf8').read()
if 'id="k146"' in s: raise SystemExit('already built')
shutil.copy(P,'ce15.bak146')
s=s.replace('</head>',open('k146css.txt',encoding='utf8').read()+'\n</head>',1)
open(P,'w',encoding='utf8').write(s);print('ok',len(s))
