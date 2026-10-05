import shutil
P='ce15.html'
s=open(P,encoding='utf8').read()
if 'V118 ·' in s: raise SystemExit('already built')
shutil.copy(P,'ce15.bak118')
M='// ================= V83 · safe external opener'
assert s.count(M)==1 and s.count('</head>')==1
s=s.replace(M,open('v118.js',encoding='utf8').read()+'\n'+M).replace('</head>',open('k118css.txt',encoding='utf8').read()+'</head>')
open(P,'w',encoding='utf8').write(s);print('ok',len(s))
