P='ce15.html'
s=open(P,encoding='utf8').read()
a="if(!AG.posts.length)localGenerate(6,true);else renderAgent();"
if a not in s: raise SystemExit('already built')
assert s.count(a)==1
s=s.replace(a,"if(!AG.posts.length){const t0=Date.now();const g=()=>{if(window.__v31loaded||Date.now()-t0>20000){if(!AG.posts.length)localGenerate(6,true);else renderAgent()}else setTimeout(g,400)};g()}else renderAgent();")
open(P,'w',encoding='utf8').write(s);print('ok 147b')
