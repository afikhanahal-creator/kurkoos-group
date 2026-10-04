import shutil
P='ce15.html'
s=open(P,encoding='utf8').read()
if 'V122 ·' in s: raise SystemExit('already built')
shutil.copy(P,'ce15.bak122')
def rep(a,b,n=1):
    global s
    assert s.count(a)==n,(s.count(a),a[:80])
    s=s.replace(a,b)
# the lightbox is the top overlay for the back gesture and the pinned close button (V101)
rep("const SEL='#ga-lb,#pe-root,","const SEL='#v122big,#ga-lb,#pe-root,")
rep("const CLOSERS='[data-v115=\"close\"],","const CLOSERS='[data-v122=\"close\"],[data-v115=\"close\"],")
M='// ================= V83 · safe external opener'
assert s.count(M)==1 and s.count('</head>')==1
s=s.replace(M,open('v122.js',encoding='utf8').read()+'\n'+M).replace('</head>',open('k122css.txt',encoding='utf8').read()+'</head>')
open(P,'w',encoding='utf8').write(s);print('ok',len(s))
