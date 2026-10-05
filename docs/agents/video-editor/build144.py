import shutil
P='ce15.html'
s=open(P,encoding='utf8').read()
if 'V144 ·' in s: raise SystemExit('already built')
shutil.copy(P,'ce15.bak144')
M='// ================= V83 · safe external opener'
js=open('v144.js',encoding='utf8').read().replace('/*CAT*/[]',open('sitecat.json',encoding='utf8').read())
assert '/*CAT*/' not in js
s=s.replace(M,js+'\n'+M)
s=s.replace('</head>',open('k144css.txt',encoding='utf8').read()+'\n</head>',1)
open(P,'w',encoding='utf8').write(s);print('ok',len(s))
