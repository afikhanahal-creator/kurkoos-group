import os,sys
H=os.path.dirname(os.path.abspath(__file__))
P=sys.argv[1] if len(sys.argv)>1 else 'ce15.html'
s=open(P,encoding='utf8').read()
# V198: mobile native layer (pilot: the publishing queue). Styles only, just before <style id="k150">.
# Runs after build197, and again on its own output.
css=open(os.path.join(H,'k198css.txt'),encoding='utf8').read().strip()
if '<style id="k198">' in s:
    i=s.index('<style id="k198">');j=s.index('</style>',i)+len('</style>');s=s[:i]+css+s[j:]
else:
    assert s.count('<style id="k150">')==1;s=s.replace('<style id="k150">',css+'<style id="k150">')
assert s.count('<style id="k198">')==1
open(P,'w',encoding='utf8').write(s);print('ok 198',P)
