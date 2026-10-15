import os,shutil,sys
H=os.path.dirname(os.path.abspath(__file__))
P=sys.argv[1] if len(sys.argv)>1 else 'ce15.html'
s=open(P,encoding='utf8').read()
if '__v179' in s: raise SystemExit('already built')
if os.path.basename(P)=='ce15.html': shutil.copy(P,os.path.join(os.path.dirname(P) or '.','ce15.bak179'))
def rep(a,b):
    global s
    assert s.count(a)==1,('missing',a[:80]);s=s.replace(a,b)
# the library sits next to the competitors in the folded "כלים מתקדמים" menu
rep("const ADV_ORDER=['queue','ideas','feed','create','agent','dupes','cloner','veditor','competitors','analyze',","const ADV_ORDER=['queue','ideas','feed','create','agent','dupes','cloner','veditor','competitors','metaads','analyze',")
M2='// ================= V83 · safe external opener'
rep(M2,open(os.path.join(H,'v179.js'),encoding='utf8').read()+'\n'+M2)
rep('<style id="k150">',open(os.path.join(H,'k179css.txt'),encoding='utf8').read()+'\n<style id="k150">')
open(P,'w',encoding='utf8').write(s);print('ok 179',P)
