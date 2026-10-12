import shutil
P='ce15.html'
s=open(P,encoding='utf8').read()
if '// ================= V170' in s: raise SystemExit('already built')
shutil.copy(P,'ce15.bak170')
C='<style id="k150">'
assert s.count(C)==1
s=s.replace(C,'<style id="k170">'+open('k170css.txt',encoding='utf8').read()+'</style>\n'+C,1)
M='// ================= V83 · safe external opener'
assert s.count(M)==1
s=s.replace(M,open('v170.js',encoding='utf8').read()+'\n'+M)
open(P,'w',encoding='utf8').write(s);print('ok 170')
