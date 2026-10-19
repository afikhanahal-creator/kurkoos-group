import os,sys
H=os.path.dirname(os.path.abspath(__file__))
P=sys.argv[1] if len(sys.argv)>1 else 'ce15.html'
s=open(P,encoding='utf8').read()
# V197: registers the engine service worker (public/engine/sw.js) that keeps pictures on the device.
# Runs after build196, and again on its own output. JS only, just before the V83 marker.
js=open(os.path.join(H,'v197.js'),encoding='utf8').read().strip('\n')
A,Z='/*V197:START*/','/*V197:END*/'
if A in s:
    i=s.index(A);j=s.index(Z,i)+len(Z);s=s[:i]+js+s[j:]
else:
    B='// ================= V83 · safe external opener'
    assert s.count(B)==1;s=s.replace(B,js+'\n\n'+B)
assert s.count(A)==1
open(P,'w',encoding='utf8').write(s);print('ok 197',P)
