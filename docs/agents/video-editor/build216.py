import os,sys
H=os.path.dirname(os.path.abspath(__file__))
P=sys.argv[1] if len(sys.argv)>1 else 'ce15.html'
s=open(P,encoding='utf8').read()
# V216: one logo per post. JS before the V83 marker; no stylesheet.
js=open(os.path.join(H,'v216.js'),encoding='utf8').read().strip('\n')
A,Z='/*V216:START*/','/*V216:END*/'
if A in s:
    i=s.index(A);j=s.index(Z,i)+len(Z);s=s[:i]+js+s[j:]
else:
    B='// ================= V83 · safe external opener'
    assert s.count(B)==1;s=s.replace(B,js+'\n\n'+B)
assert s.count(A)==1
open(P,'w',encoding='utf8').write(s);print('ok 216',P)
