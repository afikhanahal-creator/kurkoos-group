import shutil
P='ce15.html'
s=open(P,encoding='utf8').read()
if 'V157 ·' in s: raise SystemExit('already built')
shutil.copy(P,'ce15.bak157')
css=open('k157css.txt',encoding='utf8').read()
assert s.count('<style id="k150">')==1
s=s.replace('<style id="k150">',css+'<style id="k150">')
M='// ================= V83 · safe external opener'
s=s.replace(M,open('v157.js',encoding='utf8').read()+'\n'+M)
open(P,'w',encoding='utf8').write(s);print('ok 157')
