import os,shutil,sys
H=os.path.dirname(os.path.abspath(__file__))
P=sys.argv[1] if len(sys.argv)>1 else 'ce15.html'
s=open(P,encoding='utf8').read()
if 'V183: every screenshot' in s: raise SystemExit('already built')
if os.path.basename(P)=='ce15.html': shutil.copy(P,os.path.join(os.path.dirname(P) or '.','ce15.bak183'))
# V183 grows the V181 module again (clearer screenshots): swap the whole V181 block and its styles
A='// ================= V181 · competitor galleries';B='// ================= V83 · safe external opener'
i=s.index(A);j=s.index(B,i);assert s.count(A)==1
s=s[:i]+open(os.path.join(H,'v181.js'),encoding='utf8').read()+'\n'+s[j:]
i=s.index('<style id="k181">');j=s.index('</style>',i)+len('</style>')
s=s[:i]+open(os.path.join(H,'k181css.txt'),encoding='utf8').read().strip()+s[j:]
open(P,'w',encoding='utf8').write(s);print('ok 183',P)
