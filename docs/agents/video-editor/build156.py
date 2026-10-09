import shutil
P='ce15.html'
s=open(P,encoding='utf8').read()
if 'V156 ·' in s: raise SystemExit('already built')
shutil.copy(P,'ce15.bak156')
def rep(a,b,n=1):
    global s
    assert s.count(a)==n,(a[:60],s.count(a));s=s.replace(a,b)
rep("${drafts.slice(0,40).map(card).join('')||'<div class=\"empty\">אין טיוטות בסינון הזה.</div>'}</section>",
    "${drafts.slice(0,window.__v156dl||40).map(card).join('')||'<div class=\"empty\">אין טיוטות בסינון הזה.</div>'}${drafts.length>(window.__v156dl||40)?'<button type=\"button\" class=\"px-btn sm v156dmore\" data-v156=\"dmore\">טען עוד טיוטות</button>':''}</section>")
css=open('k156css.txt',encoding='utf8').read()
rep('<style id="k150">',css+'<style id="k150">')
M='// ================= V83 · safe external opener'
s=s.replace(M,open('v156.js',encoding='utf8').read()+'\n'+M)
open(P,'w',encoding='utf8').write(s);print('ok 156')
