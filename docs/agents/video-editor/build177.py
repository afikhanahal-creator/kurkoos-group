import shutil,sys
P=sys.argv[1] if len(sys.argv)>1 else 'ce15.html'
s=open(P,encoding='utf8').read()
if '__v177' in s: raise SystemExit('already built')
if P=='ce15.html': shutil.copy(P,'ce15.bak177')
def rep(a,b):
    global s
    assert s.count(a)==1,('missing',a[:80]);s=s.replace(a,b)
M2='// ================= V83 · safe external opener'
rep(M2,open('v177.js',encoding='utf8').read()+'\n'+M2)
rep('<style id="k150">',open('k177css.txt',encoding='utf8').read()+'\n<style id="k150">')
open(P,'w',encoding='utf8').write(s);print('ok 177',P)
