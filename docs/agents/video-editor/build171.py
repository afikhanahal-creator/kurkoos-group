import shutil,sys
P=sys.argv[1] if len(sys.argv)>1 else 'ce15.html'
s=open(P,encoding='utf8').read()
if '__v171' in s: raise SystemExit('already built')
if P=='ce15.html': shutil.copy(P,'ce15.bak171')
M2='// ================= V83 · safe external opener'
assert s.count(M2)==1
s=s.replace(M2,open('v171.js',encoding='utf8').read()+'\n'+M2)
C='<style id="k150">'
assert s.count(C)==1
s=s.replace(C,open('k171css.txt',encoding='utf8').read()+'\n'+C)
open(P,'w',encoding='utf8').write(s);print('ok 171',P)
