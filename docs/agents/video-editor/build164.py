import shutil
P='ce15.html'
s=open(P,encoding='utf8').read()
if '// ================= V164' in s: raise SystemExit('already built')
shutil.copy(P,'ce15.bak164')
C='<style id="k150">'
s=s.replace(C,'<style id="k164">'+open('k164css.txt',encoding='utf8').read()+'</style>\n'+C,1)
M='// ================= V83 · safe external opener'
s=s.replace(M,open('v164.js',encoding='utf8').read()+'\n'+M)
open(P,'w',encoding='utf8').write(s);print('ok 164')
