import shutil
P='ce15.html'
s=open(P,encoding='utf8').read()
if '__v166' in s: raise SystemExit('already built')
shutil.copy(P,'ce15.bak166')
M2='// ================= V83 · safe external opener'
assert s.count(M2)==1
s=s.replace(M2,open('v166.js',encoding='utf8').read()+'\n'+M2)
open(P,'w',encoding='utf8').write(s);print('ok 166')
