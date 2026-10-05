import shutil
P='ce15.html'
s=open(P,encoding='utf8').read()
if 'V133 ·' in s: raise SystemExit('already built')
shutil.copy(P,'ce15.bak133')
def rep(a,b):
    global s
    assert s.count(a)==1,(s.count(a),a[:80]); s=s.replace(a,b)
M='// ================= V83 · safe external opener'
# every save is stamped, and goes through the checked, retried database write
rep("function saveSched(it){lsSet('app_sched',APP.sched);if(it&&APP.db){clearTimeout(_st[it.id]);_st[it.id]=setTimeout(()=>{APP.db.collection('schedule').doc(it.id).set(clean(it)).catch(()=>{})},600)}",
    "function saveSched(it){if(it)it.upd=Date.now();lsSet('app_sched',APP.sched);if(it&&window.__schedPut)__schedPut(it);else if(it&&APP.db){clearTimeout(_st[it.id]);_st[it.id]=setTimeout(()=>{APP.db.collection('schedule').doc(it.id).set(clean(it)).catch(()=>{})},600)}")
# on load the database no longer overwrites a newer change made in this browser
rep("const i=APP.sched.items.findIndex(x=>x.id===d.id);if(i>=0)APP.sched.items[i]=Object.assign(APP.sched.items[i],v);else APP.sched.items.push(v)});lsSet('app_sched',APP.sched)}",
    "const i=APP.sched.items.findIndex(x=>x.id===d.id);if(i>=0){if(!window.__schedNewer||__schedNewer(APP.sched.items[i],v))APP.sched.items[i]=Object.assign(APP.sched.items[i],v);else if(window.__schedPut)__schedPut(APP.sched.items[i])}else APP.sched.items.push(v)});lsSet('app_sched',APP.sched)}")
s=s.replace(M,open('v133.js',encoding='utf8').read()+'\n'+M)
open(P,'w',encoding='utf8').write(s);print('ok',len(s))
