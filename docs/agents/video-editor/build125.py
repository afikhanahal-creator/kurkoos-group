import shutil
P='ce15.html'
s=open(P,encoding='utf8').read()
if 'V125 ·' in s: raise SystemExit('already built')
shutil.copy(P,'ce15.bak125')
M='// ================= V83 · safe external opener'
assert s.count(M)==1 and s.count('</head>')==1
s=s.replace(M,open('v125.js',encoding='utf8').read()+'\n'+M)
open(P,'w',encoding='utf8').write(s);print('ok',len(s))
