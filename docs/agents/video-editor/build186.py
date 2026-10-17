import os,shutil,sys
H=os.path.dirname(os.path.abspath(__file__))
P=sys.argv[1] if len(sys.argv)>1 else 'ce15.html'
s=open(P,encoding='utf8').read()
if '__v186' in s: raise SystemExit('already built')
if os.path.basename(P)=='ce15.html': shutil.copy(P,os.path.join(os.path.dirname(P) or '.','ce15.bak186'))
def rep(a,b):
    global s
    assert s.count(a)==1,('missing',a[:80]);s=s.replace(a,b)
# V186 grows the V181 module (clarity pass 2): swap the whole V181 block and its styles for the current files
A='// ================= V181 · competitor galleries';B='// ================= V83 · safe external opener'
i=s.index(A);j=s.index(B,i);assert s.count(A)==1
s=s[:i]+open(os.path.join(H,'v181.js'),encoding='utf8').read()+'\n'+s[j:]
i=s.index('<style id="k181">');j=s.index('</style>',i)+len('</style>')
s=s[:i]+open(os.path.join(H,'k181css.txt'),encoding='utf8').read().strip()+s[j:]
# V135 (the phone close X) rewrote its own class and style on every frame, and its observer watched those very writes:
# an endless mutation stream that kept the V101 history observer (debounced) from ever settling, so on phones no window
# got a back entry. Write only on change, and ignore the X's own mutations.
rep("if(!cur){if(b)b.classList.remove('on');return}","if(!cur){if(b&&b.classList.contains('on'))b.classList.remove('on');return}")
rep("b.classList.add('on');b.classList.toggle('pg',!!cur.page);const z=(+getComputedStyle(cur.el).zIndex||0)+5;b.style.zIndex=String(Math.max(z,10085));room(b)}",
    "if(!b.classList.contains('on'))b.classList.add('on');if(b.classList.contains('pg')!==!!cur.page)b.classList.toggle('pg',!!cur.page);const z=String(Math.max((+getComputedStyle(cur.el).zIndex||0)+5,10085));if(b.style.zIndex!==z)b.style.zIndex=z;room(b)}")
rep("new MutationObserver(kick).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style']});\naddEventListener('resize',kick);\nwindow.__v135={ensure,target};",
    "new MutationObserver(rs=>{if(rs.every(m=>m.target&&m.target.id==='v135x'))return;kick()}).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style']});\naddEventListener('resize',kick);\nwindow.__v135={ensure,target};")
# the gallery button in the header and the full screen viewer (see v186.js)
rep(B,open(os.path.join(H,'v186.js'),encoding='utf8').read()+'\n'+B)
rep('<style id="k150">',open(os.path.join(H,'k186css.txt'),encoding='utf8').read()+'\n<style id="k150">')
open(P,'w',encoding='utf8').write(s);print('ok 186',P)
