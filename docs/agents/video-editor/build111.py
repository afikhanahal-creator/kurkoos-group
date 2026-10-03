import shutil
P='ce15.html'
s=open(P,encoding='utf8').read()
if 'V111 ·' in s: raise SystemExit('already built')
shutil.copy(P,'ce15.bak111')
js=open('v111.js',encoding='utf8').read()
M='// ================= V83 · safe external opener'
assert s.count(M)==1
s=s.replace(M,js+'\n'+M)
open(P,'w',encoding='utf8').write(s)
print('ok',len(s))
