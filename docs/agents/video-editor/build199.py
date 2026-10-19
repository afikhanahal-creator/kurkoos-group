import os,sys
H=os.path.dirname(os.path.abspath(__file__))
P=sys.argv[1] if len(sys.argv)>1 else 'ce15.html'
s=open(P,encoding='utf8').read()
# V199: quick AI rewrite of a competitor ad into our words. JS before the V83 marker, styles before <style id="k150">.
# Runs after build198, and again on its own output.
js=open(os.path.join(H,'v199.js'),encoding='utf8').read().strip('\n')
A,Z='/*V199:START*/','/*V199:END*/'
if A in s:
    i=s.index(A);j=s.index(Z,i)+len(Z);s=s[:i]+js+s[j:]
else:
    B='// ================= V83 · safe external opener'
    assert s.count(B)==1;s=s.replace(B,js+'\n\n'+B)
css=open(os.path.join(H,'k199css.txt'),encoding='utf8').read().strip()
if '<style id="k199">' in s:
    i=s.index('<style id="k199">');j=s.index('</style>',i)+len('</style>');s=s[:i]+css+s[j:]
else:
    assert s.count('<style id="k150">')==1;s=s.replace('<style id="k150">',css+'<style id="k150">')
assert s.count('<style id="k199">')==1 and s.count(A)==1
open(P,'w',encoding='utf8').write(s);print('ok 199',P)
