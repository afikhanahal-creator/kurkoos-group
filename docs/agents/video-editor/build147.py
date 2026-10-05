import shutil
P='ce15.html'
s=open(P,encoding='utf8').read()
a="c.font='900 54px Heebo, Almoni, sans-serif'"
if a not in s: raise SystemExit('already built')
shutil.copy(P,'ce15.bak147')
assert s.count(a)==1
s=s.replace(a,"c.font='900 54px Almoni, Heebo, sans-serif'")
open(P,'w',encoding='utf8').write(s);print('ok')

# V147b · sample posts are made only for a truly empty system: wait until the saved posts have loaded
s=open(P,encoding='utf8').read()
a="if(!AG.posts.length)localGenerate(6,true);else renderAgent();"
if a in s:
    assert s.count(a)==1
    s=s.replace(a,"if(!AG.posts.length){const t0=Date.now();const g=()=>{if(window.__v31loaded||Date.now()-t0>20000){if(!AG.posts.length)localGenerate(6,true);else renderAgent()}else setTimeout(g,400)};g()}else renderAgent();")
    open(P,'w',encoding='utf8').write(s);print('ok b')
