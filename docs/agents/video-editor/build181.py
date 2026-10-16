import os,shutil,sys
H=os.path.dirname(os.path.abspath(__file__))
P=sys.argv[1] if len(sys.argv)>1 else 'ce15.html'
s=open(P,encoding='utf8').read()
if '__v181' in s: raise SystemExit('already built')
if os.path.basename(P)=='ce15.html': shutil.copy(P,os.path.join(os.path.dirname(P) or '.','ce15.bak181'))
def rep(a,b):
    global s
    assert s.count(a)==1,('missing',a[:80]);s=s.replace(a,b)
# V179 shares its brand facts, goals, projects and the Claude call with the competitor galleries
rep('window.__v179={M,daysOf,','window.__v179={brandOf,GOALS,PROJ,cleanTxt,ask,M,daysOf,')
# competitor galleries (see v181.js)
M2='// ================= V83 · safe external opener'
rep(M2,open(os.path.join(H,'v181.js'),encoding='utf8').read()+'\n'+M2)
rep('<style id="k150">',open(os.path.join(H,'k181css.txt'),encoding='utf8').read()+'\n<style id="k150">')
open(P,'w',encoding='utf8').write(s);print('ok 181',P)
