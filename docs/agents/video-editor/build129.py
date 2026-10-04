import shutil
P='ce15.html'
s=open(P,encoding='utf8').read()
if 'V129 ·' in s: raise SystemExit('already built')
shutil.copy(P,'ce15.bak129')
def rep(a,b):
    global s
    assert s.count(a)==1,(s.count(a),a[:80]); s=s.replace(a,b)
M='// ================= V83 · safe external opener'
# tray acts on the chosen video unless "all" or "join" is picked
rep("fmt:'9:16',fit:'fill',musicVol:0.22,duck:true,mode:'each',quality:'hd'}","fmt:'9:16',fit:'fill',musicVol:0.22,duck:true,mode:'sel',quality:'hd'}")
rep("async function runExport(){const items=T.items.filter(x=>!x.bad&&x.dur);","async function runExport(){const all=T.items.filter(x=>!x.bad&&x.dur),items=(KIT.mode==='each'||KIT.mode==='merge')&&all.length>1?all:all.filter(x=>x.id===(selItem()||{}).id);")
rep("const items=T.items.filter(x=>!x.bad);if(!items.length)return;","const all=T.items.filter(x=>!x.bad),items=(KIT.mode==='each'||KIT.mode==='merge')&&all.length>1?all:all.filter(x=>x.id===(selItem()||{}).id);if(!items.length)return;")
rep(">ייצוא ממותג להורדה</button>",">${KIT.mode==='sel'||n<2?'ייצוא הסרטון הנבחר':'ייצוא ממותג להורדה'}</button>")
rep(">שליחה לעורך המקצועי</button>",">${KIT.mode==='sel'||n<2?'שליחת הסרטון הנבחר לעורך':'שליחה לעורך המקצועי'}</button>")
rep("${n>1?seg('mode',[['each','כל סרטון בנפרד'],['merge','חיבור לסרטון אחד']]):''}","${n>1?seg('mode',[['sel','רק הסרטון הנבחר'],['each','כל הסרטונים, כל אחד בנפרד'],['merge','חיבור לסרטון אחד']]):''}")
rep("window.__v127={T,KIT:()=>KIT,addFiles,drawFrame,seqOf,exportSeq,dims};","window.__v127={T,KIT:()=>KIT,addFiles,drawFrame,seqOf,exportSeq,dims,withKit:(k,fn)=>{const o=KIT;KIT=k;try{return fn()}finally{KIT=o}}};")
# automatic editing of every video that enters: off unless switched on
rep("auto:(function(){try{return localStorage.getItem('vid_auto')!=='0'}catch(e){return true}})()","auto:(function(){try{return localStorage.getItem('vid_auto')==='1'}catch(e){return false}})()")
s=s.replace(M,open('v129.js',encoding='utf8').read()+'\n'+M).replace('</head>',open('k129css.txt',encoding='utf8').read()+'</head>')
open(P,'w',encoding='utf8').write(s);print('ok',len(s))
