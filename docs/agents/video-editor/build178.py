import shutil,sys
P=sys.argv[1] if len(sys.argv)>1 else 'ce15.html'
s=open(P,encoding='utf8').read()
if '__v178' in s: raise SystemExit('already built')
if P=='ce15.html': shutil.copy(P,'ce15.bak178')
def rep(a,b):
    global s
    assert s.count(a)==1,('missing',a[:80]);s=s.replace(a,b)
# the Afik copies stay out of the Kurkoos posts screen, and get their place in the menu under materials
rep("l=orig()}finally{Object.assign(GA.f,keep)}","l=orig().filter(x=>!(x.p&&x.p.brand))}finally{Object.assign(GA.f,keep)}")
rep("G_MAT=['photos','templates','articles','videos']","G_MAT=['photos','templates','articles','videos','afik']")
# the Kurkoos signature block is for Kurkoos posts only
rep("(AG.posts||[]).forEach(p=>{if(p&&typeof p.fb==='string'){const n=fixSig(p.fb)","(AG.posts||[]).forEach(p=>{if(p&&!p.brand&&typeof p.fb==='string'){const n=fixSig(p.fb)")
# the tower mark inside layouts asks V178 first
rep("function mark(c,x,y,h,col){if(h<120&&(window.__logoMode==='none'||window.__logoMode==='lockup'))return;","function mark(c,x,y,h,col){if(h<120&&(window.__logoMode==='none'||window.__logoMode==='lockup'))return;if(window.__v178mark&&window.__v178mark(c,x,y,h,col))return;")
# Afik posts never go out to the Kurkoos pages
rep("function want(it){return it&&it.pub&&it.pub.on&&!it.reel}","function want(it){return it&&it.pub&&it.pub.on&&!it.reel&&!((itemPost(it)||{}).brand)}")
M2='// ================= V83 · safe external opener'
rep(M2,open('v178.js',encoding='utf8').read()+'\n'+M2)
rep('<style id="k150">',open('k178css.txt',encoding='utf8').read()+'\n<style id="k150">')
open(P,'w',encoding='utf8').write(s);print('ok 178',P)
