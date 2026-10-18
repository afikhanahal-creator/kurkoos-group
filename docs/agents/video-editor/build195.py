import os,sys
H=os.path.dirname(os.path.abspath(__file__))
P=sys.argv[1] if len(sys.argv)>1 else 'ce15.html'
s=open(P,encoding='utf8').read()
# V195: mobile 2.0 (header, bottom bar, cards, loading). Runs after build188, build190, build191 and build194, and again on its own output.
# The JS block sits just before the V83 marker (after V194); the styles sit just before <style id="k150">.
js=open(os.path.join(H,'v195.js'),encoding='utf8').read().strip('\n')
A,Z='/*V195:START*/','/*V195:END*/'
if A in s:
    i=s.index(A);j=s.index(Z,i)+len(Z);s=s[:i]+js+s[j:]
else:
    B='// ================= V83 · safe external opener'
    assert s.count(B)==1;s=s.replace(B,js+'\n\n'+B)
css=open(os.path.join(H,'k195css.txt'),encoding='utf8').read().strip()
if '<style id="k195">' in s:
    i=s.index('<style id="k195">');j=s.index('</style>',i)+len('</style>');s=s[:i]+css+s[j:]
else:
    assert s.count('<style id="k150">')==1;s=s.replace('<style id="k150">',css+'<style id="k150">')
# loading: the Rubik stylesheet (a template font used by a few posts) no longer blocks the first paint,
# and JSZip (only used by the zip download, which falls back without it) no longer blocks the parser
R0='<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Rubik:wght@500;700;800&display=swap">'
R1='<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Rubik:wght@500;700;800&display=swap" media="print" onload="this.media=\'all\'">'
if R0 in s:s=s.replace(R0,R1)
J0='<script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>'
J1='<script defer src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>'
if J0 in s:s=s.replace(J0,J1)
assert s.count(A)==1 and s.count('<style id="k195">')==1 and s.count(R1)==1 and s.count(J1)==1
open(P,'w',encoding='utf8').write(s);print('ok 195',P)
