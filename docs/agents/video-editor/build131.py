import shutil
P='ce15.html'
s=open(P,encoding='utf8').read()
if 'V131 ·' in s: raise SystemExit('already built')
shutil.copy(P,'ce15.bak131')
def rep(a,b,n=1):
    global s
    assert s.count(a)==n,(s.count(a),a[:80]); s=s.replace(a,b)
M='// ================= V83 · safe external opener'
# Metricool gets the real Israel offset for that date (summer +03:00, winter +02:00)
rep("date:it.at+':00+03:00'","date:it.at+':00'+(window.__ilOffset?__ilOffset(it.at):'+03:00')")
rep("date:q.date+':00+03:00'","date:q.date+':00'+(window.__ilOffset?__ilOffset(q.date):'+03:00')")
# the post editor's schedule button opens the schedule sheet on top of the editor (the editor stays open)
rep("case 'sched':{if(peDirty())peSave();const o=PE.orig;peClose(true);try{openComposer({p:o,sched:true})}catch(err){}return}",
    "case 'sched':{if(peDirty())peSave();if(window.__v131){__v131.open({p:PE.orig});return}const o=PE.orig;peClose(true);try{openComposer({p:o,sched:true})}catch(err){}return}")
rep("if(it&&it.at&&!it.dupOk){const cs=conflictsFor(it);","if(it&&it.at&&!it.dupOk&&!(window.__dgSkip&&__dgSkip.has(it))){const cs=conflictsFor(it);")
s=s.replace(M,open('v131.js',encoding='utf8').read()+'\n'+M).replace('</head>',open('k131css.txt',encoding='utf8').read()+'</head>')
open(P,'w',encoding='utf8').write(s);print('ok',len(s))
