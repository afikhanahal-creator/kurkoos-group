import shutil
P='ce15.html'
s=open(P,encoding='utf8').read()
if 'V116 ·' in s: raise SystemExit('already built')
shutil.copy(P,'ce15.bak116')
M='// ================= V83 · safe external opener'
assert s.count(M)==1 and s.count('</head>')==1
s=s.replace(M,open('v116.js',encoding='utf8').read()+'\n'+M).replace('</head>',open('k116css.txt',encoding='utf8').read()+'</head>')
open(P,'w',encoding='utf8').write(s);print('ok',len(s))
