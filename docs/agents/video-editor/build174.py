import shutil,sys,os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
P=sys.argv[1] if len(sys.argv)>1 else 'ce15.html'
s=open(P,encoding='utf8').read()
if '__v174' in s: raise SystemExit('already built')
if P=='ce15.html': shutil.copy(P,'ce15.bak174')
def rep(a,b):
    global s
    assert s.count(a)==1,('missing or repeated',a[:90]);s=s.replace(a,b)
# V170 hooks: status, score and publish date join every facet, pill and count
rep("&&(skip==='q'||qMatch(x,F.q)))}","&&(skip==='q'||qMatch(x,F.q))&&(!window.__v174f||window.__v174f(x,skip)))}")
rep("if(F.q)P.push(['q',F.q,'\"'+F.q+'\"']);return P}","if(window.__v174p)__v174p(P);if(F.q)P.push(['q',F.q,'\"'+F.q+'\"']);return P}")
rep("const nActive=()=>F.proj.length+F.ser.length+F.fam.length+F.dom.length+F.img.length+(F.when?1:0);","const nActive=()=>F.proj.length+F.ser.length+F.fam.length+F.dom.length+F.img.length+(F.when?1:0)+(window.__v174n?__v174n():0);")
rep(" r.innerHTML=sheetHtml();const nb=r.querySelector","  r.innerHTML=window.__v174sh?__v174sh(sheetHtml()):sheetHtml();const nb=r.querySelector")
rep("Object.assign(F,{qv:'all',proj:[],","Object.assign(F,{qv:'all',st:[],sc:[],pub:[],proj:[],")
rep("window.__v170={F,PF,famOf,metaP,regroup,photosPaint};","window.__v170={F,PF,famOf,metaP,regroup,photosPaint,facets,qvOk,isReady,isCheck,fastPaint,rerender,saveF,mirror,pills,nActive,base:()=>BASE,last:()=>LAST};")
M2='// ================= V83 · safe external opener'
rep(M2,open('v174.js',encoding='utf8').read()+'\n'+M2)
rep('<style id="k150">',open('k174css.txt',encoding='utf8').read()+'\n<style id="k150">')
open(P,'w',encoding='utf8').write(s);print('ok 174',P)
