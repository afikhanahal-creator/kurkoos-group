import shutil
P='ce15.html'
s=open(P,encoding='utf8').read()
if '/*FX13:START*/' in s: raise SystemExit('already built')
shutil.copy(P,'ce15.bak162')
M12='/*FX12:END*/'
assert s.count(M12)==1
s=s.replace(M12,M12+'\n'+open('fx13.js',encoding='utf8').read())
M='// ================= V83 · safe external opener'
s=s.replace(M,open('v162.js',encoding='utf8').read()+'\n'+M)
open(P,'w',encoding='utf8').write(s);print('ok 162')
