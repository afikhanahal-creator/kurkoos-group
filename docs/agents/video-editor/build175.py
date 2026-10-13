import shutil,sys,os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
P=sys.argv[1] if len(sys.argv)>1 else 'ce15.html'
s=open(P,encoding='utf8').read()
if '__v175' in s: raise SystemExit('already built')
if P=='ce15.html': shutil.copy(P,'ce15.bak175')
def rep(a,b):
    global s
    assert s.count(a)==1,('marker',a[:60],s.count(a))
    s=s.replace(a,b)
# V170 photos: "new" follows V175, its helpers are reachable, and the page and the photo sheet come from V175 when it is loaded
rep('const isNewP=it=>{const t=atOf(it);return t&&t>=Date.now()-NEWD*DAY};',
    'const isNewP=it=>{if(window.__v175new)return window.__v175new(it);const t=atOf(it);return t&&t>=Date.now()-NEWD*DAY};')
rep('const NEWD=14;','const NEWD=14;window.__v170x=()=>({useMap,kindLabel,projLabel,PSORT,saveP,norm2,IC,H,KINDN,isIll,pvOk,psheet,atOf});')
rep('box.innerHTML=vPhotos170(S,keep)+psheet(S);',
    'box.innerHTML=(window.__v175ph?window.__v175ph.view(S,keep):vPhotos170(S,keep))+(window.__v175ph?window.__v175ph.sheet(S):psheet(S));')
M2='// ================= V83 · safe external opener'
assert s.count(M2)==1
s=s.replace(M2,open('v175.js',encoding='utf8').read()+'\n'+M2)
C='<style id="k150">'
assert s.count(C)==1
s=s.replace(C,open('k175css.txt',encoding='utf8').read()+'\n'+C)
open(P,'w',encoding='utf8').write(s);print('ok 175',P)
