import shutil
P='ce15.html'
s=open(P,encoding='utf8').read()
if 'V115 ·' in s: raise SystemExit('already built')
shutil.copy(P,'ce15.bak115')
def rep(a,b):
    global s
    assert s.count(a)==1,(s.count(a),a[:80])
    s=s.replace(a,b)
M='// ================= V83 · safe external opener'
rep(M,open('v115.js',encoding='utf8').read()+'\n'+M)
rep('</head>',open('k115css.txt',encoding='utf8').read()+'</head>')
rep(".v65cmp,.v108pv,.ov';",".v65cmp,.v108pv,#v115lib,.ov';")
rep("const CLOSERS='[data-v108=\"close\"],","const CLOSERS='[data-v115=\"close\"],[data-v108=\"close\"],")
open(P,'w',encoding='utf8').write(s)
print('ok',len(s))
