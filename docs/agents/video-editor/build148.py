import shutil
P='ce15.html'
s=open(P,encoding='utf8').read()
if "V148 · the editor" in s: raise SystemExit('already built')
shutil.copy(P,'ce15.bak148')
M='// ================= V83 · safe external opener'
assert s.count(M)==1
s=s.replace(M,open('v148.js',encoding='utf8').read()+'\n'+M)
open(P,'w',encoding='utf8').write(s);print('ok 148')
