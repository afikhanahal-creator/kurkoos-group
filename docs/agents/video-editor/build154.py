import shutil
P='ce15.html'
s=open(P,encoding='utf8').read()
if '/*FX9:START*/' in s: raise SystemExit('already built')
shutil.copy(P,'ce15.bak154')
M8='/*FX8:END*/'
assert s.count(M8)==1
s=s.replace(M8,M8+'\n'+open('fx9.js',encoding='utf8').read())
M='// ================= V83 · safe external opener'
s=s.replace(M,open('v154.js',encoding='utf8').read()+'\n'+M)
open(P,'w',encoding='utf8').write(s);print('ok 154')
