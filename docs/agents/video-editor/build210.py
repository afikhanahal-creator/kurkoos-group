import os,sys
H=os.path.dirname(os.path.abspath(__file__))
P=sys.argv[1] if len(sys.argv)>1 else 'ce15.html'
s=open(P,encoding='utf8').read()
# V210: the editor save status. JS before the V83 marker, styles before <style id="k150">.
js=open(os.path.join(H,'v210.js'),encoding='utf8').read().strip('\n')
A,Z='/*V210:START*/','/*V210:END*/'
if A in s:
    i=s.index(A);j=s.index(Z,i)+len(Z);s=s[:i]+js+s[j:]
else:
    B='// ================= V83 · safe external opener'
    assert s.count(B)==1;s=s.replace(B,js+'\n\n'+B)
css=open(os.path.join(H,'k210css.txt'),encoding='utf8').read().strip()
if '<style id="k210">' in s:
    i=s.index('<style id="k210">');j=s.index('</style>',i)+len('</style>');s=s[:i]+css+s[j:]
else:
    assert s.count('<style id="k150">')==1;s=s.replace('<style id="k150">',css+'<style id="k150">')
assert s.count(A)==1
open(P,'w',encoding='utf8').write(s);print('ok 210',P)
