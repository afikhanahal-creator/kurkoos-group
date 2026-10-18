import os,sys
H=os.path.dirname(os.path.abspath(__file__))
P=sys.argv[1] if len(sys.argv)>1 else 'ce15.html'
s=open(P,encoding='utf8').read()
if 'v188: redesigned' in s: raise SystemExit('already built')
def swap(a,b,new):
    global s
    i=s.index(a);j=s.index(b,i);assert s.count(a)==1;s=s[:i]+new+s[j:]
# V188: the gallery redesigned. The V181 and V186 blocks sit together before the V83 marker: one swap covers both.
B='// ================= V83 · safe external opener'
swap('// ================= V181 · competitor galleries',B,open(os.path.join(H,'v181.js'),encoding='utf8').read()+'\n'+open(os.path.join(H,'v188.js'),encoding='utf8').read()+'\n')
for sid,f in (('k181','k181css.txt'),('k186','k188css.txt')):
    i=s.index('<style id="%s">'%sid);j=s.index('</style>',i)+len('</style>')
    s=s[:i]+open(os.path.join(H,f),encoding='utf8').read().strip()+s[j:]
open(P,'w',encoding='utf8').write(s);print('ok 188',P)
