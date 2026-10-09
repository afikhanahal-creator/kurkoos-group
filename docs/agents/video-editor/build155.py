import shutil
P='ce15.html'
s=open(P,encoding='utf8').read()
if 'V155 ·' in s: raise SystemExit('already built')
shutil.copy(P,'ce15.bak155')
def rep(a,b,n=1):
    global s
    assert s.count(a)==n,(a[:60],s.count(a));s=s.replace(a,b)
rep('<b>afik.hanahal</b>','<b>kurkoos_group</b>',2)
rep('קבוצת קורקוס · afik.hanahal','קבוצת קורקוס · Kurkoos Group / kurkoos_group')
M='// ================= V83 · safe external opener'
s=s.replace(M,open('v155.js',encoding='utf8').read()+'\n'+M)
open(P,'w',encoding='utf8').write(s);print('ok 155')
