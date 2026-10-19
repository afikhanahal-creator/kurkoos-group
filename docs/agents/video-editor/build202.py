import os,sys
H=os.path.dirname(os.path.abspath(__file__))
P=sys.argv[1] if len(sys.argv)>1 else 'ce15.html'
s=open(P,encoding='utf8').read()
# V202: build by inspiration in the agent tab. JS before the V83 marker (after V201), styles before <style id="k150">.
# Runs after build201, and again on its own output.
js=open(os.path.join(H,'v202.js'),encoding='utf8').read().strip('\n')
js=js.replace('__LOGOS__',open(os.path.join(H,'v202logos.json'),encoding='utf8').read().strip())
A,Z='/*V202:START*/','/*V202:END*/'
if A in s:
    i=s.index(A);j=s.index(Z,i)+len(Z);s=s[:i]+js+s[j:]
else:
    B='// ================= V83 · safe external opener'
    assert s.count(B)==1;s=s.replace(B,js+'\n\n'+B)
css=open(os.path.join(H,'k202css.txt'),encoding='utf8').read().strip()
if '<style id="k202">' in s:
    i=s.index('<style id="k202">');j=s.index('</style>',i)+len('</style>');s=s[:i]+css+s[j:]
else:
    assert s.count('<style id="k150">')==1;s=s.replace('<style id="k150">',css+'<style id="k150">')
assert s.count('<style id="k202">')==1 and s.count(A)==1
open(P,'w',encoding='utf8').write(s);print('ok 201',P)
