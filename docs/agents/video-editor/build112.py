import shutil
P='ce15.html'
s=open(P,encoding='utf8').read()
if 'V112 ·' in s: raise SystemExit('already built')
shutil.copy(P,'ce15.bak112')
js=open('v112.js',encoding='utf8').read()
M='// ================= V83 · safe external opener'
assert s.count(M)==1
s=s.replace(M,js+'\n'+M)
open(P,'w',encoding='utf8').write(s)
print('ok',len(s))
