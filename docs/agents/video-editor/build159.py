import shutil
P='ce15.html'
s=open(P,encoding='utf8').read()
if '// ================= V159' in s: raise SystemExit('already built')
shutil.copy(P,'ce15.bak159')
M='// ================= V83 · safe external opener'
s=s.replace(M,open('v159.js',encoding='utf8').read()+'\n'+M)
open(P,'w',encoding='utf8').write(s);print('ok 159')
