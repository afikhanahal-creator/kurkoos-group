import shutil
P='ce15.html'
s=open(P,encoding='utf8').read()
if 'V120 ·' in s: raise SystemExit('already built')
shutil.copy(P,'ce15.bak120')
# V82 (which wraps every later module) no longer saves on close; V120 decides
a="try{if(!force&&PE&&PE.p&&PE.orig&&peDirty()){const o=PE.orig,before=pxSnap(o)"
assert s.count(a)==1
s=s.replace(a,"try{if(!force&&!window.__v120&&PE&&PE.p&&PE.orig&&peDirty()){const o=PE.orig,before=pxSnap(o)")
M='// ================= V83 · safe external opener'
assert s.count(M)==1
s=s.replace(M,open('v120.js',encoding='utf8').read()+'\n'+M)
open(P,'w',encoding='utf8').write(s);print('ok',len(s))
