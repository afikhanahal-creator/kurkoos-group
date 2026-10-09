import shutil
P='ce15.html'
s=open(P,encoding='utf8').read()
if '/*FX11:START*/' in s: raise SystemExit('already built')
shutil.copy(P,'ce15.bak160')
M10='/*FX10:END*/'
assert s.count(M10)==1
s=s.replace(M10,M10+'\n'+open('fx11.js',encoding='utf8').read())
import re
a=s.index('/*FX9:START*/');b=s.index('/*FX11:START*/')
seg=s[a:b]
for x,y in (('size:21','size:26'),('size:22','size:26'),('size:24','size:28')):seg=seg.replace(x,y)
s=s[:a]+seg+s[b:]
M='// ================= V83 · safe external opener'
s=s.replace(M,open('v160.js',encoding='utf8').read()+'\n'+M)
open(P,'w',encoding='utf8').write(s);print('ok 160')
