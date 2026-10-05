import shutil
P='ce15.html'
s=open(P,encoding='utf8').read()
if 'V151 ·' in s: raise SystemExit('already built')
shutil.copy(P,'ce15.bak151')
def rep(a,b):
    global s
    assert s.count(a)==1,(a[:60],s.count(a));s=s.replace(a,b)
# V151a · uploaded narrow cuts (Tzar) get their own family, so the regular Bold stays regular
rep("async function register(rec){try{const ff=new FontFace('Almoni',rec.buf,{weight:rec.w,style:'normal',display:'swap'});",
    "async function register(rec){try{const fam=/tzar|narrow|condensed|צר/i.test(rec.name||'')?'Almoni Tzar':'Almoni';const ff=new FontFace(fam,rec.buf,{weight:rec.w,style:'normal',display:'swap'});rec.fam=fam;")
# V151b · the shared copy of the uploaded fonts loads on every device (APP is not on window)
rep("try{if(window.APP&&APP.db){const d=await APP.db.doc('settings/fonts').get();","try{if(typeof APP!=='undefined'&&APP.db){const d=await APP.db.doc('settings/fonts').get();")
M='// ================= V83 · safe external opener'
assert s.count(M)==1
s=s.replace(M,open('v151.js',encoding='utf8').read()+'\n'+M)
open(P,'w',encoding='utf8').write(s);print('ok 151')
