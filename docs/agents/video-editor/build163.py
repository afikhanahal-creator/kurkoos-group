import shutil
P='ce15.html'
s=open(P,encoding='utf8').read()
if '// ================= V163' in s: raise SystemExit('already built')
shutil.copy(P,'ce15.bak163')
C='<style id="k150">'
assert C in s
s=s.replace(C,'<style id="k163">'+open('k163css.txt',encoding='utf8').read()+'</style>\n'+C,1)
M='// ================= V83 · safe external opener'
s=s.replace(M,open('v163.js',encoding='utf8').read()+'\n'+M)
open(P,'w',encoding='utf8').write(s);print('ok 163')
