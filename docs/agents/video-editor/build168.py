import shutil
P='ce15.html'
s=open(P,encoding='utf8').read()
if 'x_p_band' in s: raise SystemExit('already built')
shutil.copy(P,'ce15.bak168')
M='/*FX13:END*/'
assert s.count(M)==1
s=s.replace(M,M+'\n'+open('design/fx16a.js',encoding='utf8').read()+'\n'+open('design/fx16b.js',encoding='utf8').read())
M2='// ================= V83 · safe external opener'
s=s.replace(M2,open('v168.js',encoding='utf8').read()+'\n'+M2)
open(P,'w',encoding='utf8').write(s);print('ok 168')
