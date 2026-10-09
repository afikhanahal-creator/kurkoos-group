import shutil
P='ce15.html'
s=open(P,encoding='utf8').read()
if '// ================= V159' in s: raise SystemExit('already built')
shutil.copy(P,'ce15.bak159')
M='// ================= V83 · safe external opener'
s=s.replace(M,open('v159.js',encoding='utf8').read()+'\n'+M)
A="const ISO=t=>String(t??'')"
n=s.count(A);assert n>=8,n
s=s.replace(A,A+".replace(/(\\d[\\d,.]*\\s?[KM])(?![A-Za-z])/g,'\\u2066$1\\u2069')")
print('iso',n)
open(P,'w',encoding='utf8').write(s);print('ok 159')
