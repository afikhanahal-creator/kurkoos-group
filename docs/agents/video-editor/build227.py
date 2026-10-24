import os,sys
H=os.path.dirname(os.path.abspath(__file__))
P=sys.argv[1] if len(sys.argv)>1 else 'ce15.html'
s=open(P,encoding='utf8').read()
# V227: Social Carousel Studio. JS before the V83 marker, styles before <style id="k150">.
js=open(os.path.join(H,'v227.js'),encoding='utf8').read().strip('\n')
A,Z='/*V227:START*/','/*V227:END*/'
if A in s:
    i=s.index(A);j=s.index(Z,i)+len(Z);s=s[:i]+js+s[j:]
else:
    B='// ================= V83 · safe external opener'
    assert s.count(B)==1;s=s.replace(B,js+'\n\n'+B)
css=open(os.path.join(H,'k227css.txt'),encoding='utf8').read().strip()
if '<style id="k227">' in s:
    i=s.index('<style id="k227">');j=s.index('</style>',i)+len('</style>');s=s[:i]+css+s[j:]
else:
    assert s.count('<style id="k150">')==1;s=s.replace('<style id="k150">',css+'<style id="k150">')
assert s.count(A)==1
# the cloud merge (startup load and the periodic re-read) treated a post that was never synced as "not edited here", so a
# half synced row could overwrite a post that was still being built or renumbered. A post with no sync hash is local work.
old="const locEdited=SYNC.h[id]&&SYNC.h[id]!==lh;"
new="const locEdited=!SYNC.h[id]||SYNC.h[id]!==lh;"
if old in s: s=s.replace(old,new)
assert s.count(new)==2,'merge patch'
open(P,'w',encoding='utf8').write(s);print('ok 227',P)
