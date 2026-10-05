import shutil
P='ce15.html'
s=open(P,encoding='utf8').read()
if 'V149 ·' in s: raise SystemExit('already built')
shutil.copy(P,'ce15.bak149')
# V149 · competitor research fields may arrive as text ("DATA NOT AVAILABLE") instead of a list; the page shows them only when they are lists
L=lambda f:'(Array.isArray(r.%s)?r.%s:[])'%(f,f)
n=0
for f in ['formats','gaps','bestTimes']:
    for a,b in [('(r.%s||[])'%f,L(f)),('r.%s.map('%f,L(f)+'.map('),('r.%s.join('%f,L(f)+'.join(')]:
        c=s.count(a);n+=c;s=s.replace(a,b)
assert n>=6,n
s=s.replace('// ================= V83 · safe external opener','// ================= V149 · competitor research fields are read only when they are lists =================\n// ================= V83 · safe external opener',1)
open(P,'w',encoding='utf8').write(s);print('ok 149',n)
