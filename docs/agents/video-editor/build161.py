import shutil
P='ce15.html'
s=open(P,encoding='utf8').read()
if '/*FX12:START*/' in s: raise SystemExit('already built')
shutil.copy(P,'ce15.bak161')
M11='/*FX11:END*/'
assert s.count(M11)==1
s=s.replace(M11,M11+'\n'+open('fx12.js',encoding='utf8').read())
M='// ================= V83 · safe external opener'
s=s.replace(M,open('v161.js',encoding='utf8').read()+'\n'+M)
open(P,'w',encoding='utf8').write(s);print('ok 161')
