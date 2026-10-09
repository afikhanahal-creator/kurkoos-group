import shutil
P='ce15.html'
s=open(P,encoding='utf8').read()
if '/*FX10:START*/' in s: raise SystemExit('already built')
shutil.copy(P,'ce15.bak158')
M9='/*FX9:END*/'
assert s.count(M9)==1
s=s.replace(M9,M9+'\n'+open('fx10.js',encoding='utf8').read())
M='// ================= V83 · safe external opener'
s=s.replace(M,open('v158.js',encoding='utf8').read()+'\n'+M)
open(P,'w',encoding='utf8').write(s);print('ok 158')
