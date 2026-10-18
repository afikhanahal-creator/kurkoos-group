import os,sys
H=os.path.dirname(os.path.abspath(__file__))
P=sys.argv[1] if len(sys.argv)>1 else 'ce15.html'
s=open(P,encoding='utf8').read()
# V190: the direct publisher posts each post to the page of its own brand. Swap the V177 block for the current file.
A='// ================= V177 · publishing straight from the engine';B='// ================= V178 '
i=s.index(A);j=s.index(B,i);assert s.count(A)==1
s=s[:i]+open(os.path.join(H,'v177.js'),encoding='utf8').read().rstrip('\n')+'\n\n'+s[j:]
if '<style id="k190">' in s:
    i=s.index('<style id="k190">');j=s.index('</style>',i)+len('</style>');s=s[:i]+open(os.path.join(H,'k190css.txt'),encoding='utf8').read().strip()+s[j:]
else:
    assert s.count('<style id="k150">')==1;s=s.replace('<style id="k150">',open(os.path.join(H,'k190css.txt'),encoding='utf8').read()+'<style id="k150">')
open(P,'w',encoding='utf8').write(s);print('ok 190',P)
