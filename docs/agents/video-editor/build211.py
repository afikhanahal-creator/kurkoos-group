import os,sys
H=os.path.dirname(os.path.abspath(__file__))
P=sys.argv[1] if len(sys.argv)>1 else 'ce15.html'
s=open(P,encoding='utf8').read()
# V211: competitor clone templates (c27). JS before the V83 marker, styles before <style id="k150">.
js=open(os.path.join(H,'v211.js'),encoding='utf8').read().strip('\n')
import json
js=js.replace('__C27__',json.dumps(json.load(open(os.path.join(H,'c27_templates.json'),encoding='utf8')),ensure_ascii=False,separators=(',',':')))
A,Z='/*V211:START*/','/*V211:END*/'
if A in s:
    i=s.index(A);j=s.index(Z,i)+len(Z);s=s[:i]+js+s[j:]
else:
    B='// ================= V83 · safe external opener'
    assert s.count(B)==1;s=s.replace(B,js+'\n\n'+B)
assert s.count(A)==1
open(P,'w',encoding='utf8').write(s);print('ok 211',P)
