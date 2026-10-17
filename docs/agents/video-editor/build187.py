import os,shutil,sys
H=os.path.dirname(os.path.abspath(__file__))
P=sys.argv[1] if len(sys.argv)>1 else 'ce15.html'
s=open(P,encoding='utf8').read()
if 'v187: ads captured' in s: raise SystemExit('already built')
def swap(a,b,new):
    global s
    i=s.index(a);j=s.index(b,i);assert s.count(a)==1;s=s[:i]+new+s[j:]
# V187: ads captured from the Meta Ads Library. Swap the V181 and V186 blocks and their styles for the current files.
B='// ================= V83 · safe external opener'
# the V186 block sits between V181 and V83, so one swap covers both
swap('// ================= V181 · competitor galleries',B,open(os.path.join(H,'v181.js'),encoding='utf8').read()+'\n'+open(os.path.join(H,'v186.js'),encoding='utf8').read()+'\n')
for sid,f in (('k181','k181css.txt'),('k186','k186css.txt')):
    i=s.index('<style id="%s">'%sid);j=s.index('</style>',i)+len('</style>')
    s=s[:i]+open(os.path.join(H,f),encoding='utf8').read().strip()+s[j:]
open(P,'w',encoding='utf8').write(s);print('ok 187',P)
