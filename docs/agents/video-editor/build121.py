import shutil
P='ce15.html'
s=open(P,encoding='utf8').read()
if 'V121 ·' in s: raise SystemExit('already built')
shutil.copy(P,'ce15.bak121')
def rep(a,b,n=1):
    global s
    assert s.count(a)==n,(s.count(a),a[:80])
    s=s.replace(a,b)
# "הוסף לתור" uses the picked time when there is one
rep("case 'cqueue':return composerSave(nextSlot(kindOf(p)));","case 'cqueue':{const picked=window.__v121?__v121.pickedAt():(APP.cmp&&APP.cmp.at)||'';return composerSave(picked||nextSlot(kindOf(p)))}")
# the date picker sets the composer time directly as well
rep("v44Open(inp,inp.value,{time:inp.type==='datetime-local'},v=>{inp.value=v;inp.dispatchEvent(new Event('input',{bubbles:true}));","v44Open(inp,inp.value,{time:inp.type==='datetime-local'},v=>{inp.value=v;try{if(inp.dataset.app==='cat'&&window.APP&&APP.cmp){APP.cmp.at=v;APP.cmp.sched=true}}catch(e){}inp.dispatchEvent(new Event('input',{bubbles:true}));")
M='// ================= V83 · safe external opener'
assert s.count(M)==1
s=s.replace(M,open('v121.js',encoding='utf8').read()+'\n'+M)
open(P,'w',encoding='utf8').write(s);print('ok',len(s))
