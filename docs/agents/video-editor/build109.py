import shutil
P='ce15.html'
s=open(P,encoding='utf8').read()
if 'k109css' in s: raise SystemExit('already built')
shutil.copy(P,'ce15.bak109')
def rep(a,b):
    global s
    assert s.count(a)==1,(s.count(a),a[:80])
    s=s.replace(a,b)
rep('</head>',open('k109css.txt',encoding='utf8').read()+'</head>')
# back gesture: V101 closes the window and records when; V102 then leaves the view alone
rep("if(o&&!busy){busy=true;closeOverlay(o);depth=Math.max(0,depth-1)","if(o&&!busy){busy=true;window.__v101pop=Date.now();closeOverlay(o);depth=Math.max(0,depth-1)")
rep("addEventListener('popstate',e=>{if(window.__v101&&__v101.top())return;if(stack.length){goBack()}});","addEventListener('popstate',e=>{if(window.__v101&&(__v101.top()||Date.now()-(window.__v101pop||0)<900))return;if(stack.length){goBack()}});")
# effects sheet: closing without sending resolves the waiting button, so it can be tapped again
rep("function open(d,onGo){pending={d,onGo};","function open(d,onGo,onCancel){pending={d,onGo,onCancel};")
rep("function close(){const r=document.getElementById('v103');if(r)r.remove();document.body.classList.remove('v103-on');pending=null}","function close(){const r=document.getElementById('v103');if(r)r.remove();document.body.classList.remove('v103-on');const pc=pending;pending=null;if(pc&&pc.onCancel&&!pc.went){try{pc.onCancel()}catch(e){}}}")
rep("const go=pending.onGo;close();b.disabled=true","pending.went=1;const go=pending.onGo;close();b.disabled=true")
rep("res(await origEdit(Object.assign({__direct:1},dd)))}))};","res(await origEdit(Object.assign({__direct:1},dd)))},()=>res(null)))};")
open(P,'w',encoding='utf8').write(s)
print('ok',len(s))
