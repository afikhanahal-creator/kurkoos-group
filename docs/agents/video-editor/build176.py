import sys
S='/tmp/claude-0/-home-user-kurkoos-group/b616de33-7a66-539b-90c4-315bd9ec44de/scratchpad/'
P=sys.argv[1]
s=open(P,encoding='utf8').read()
if '__v176' in s: raise SystemExit('already built')
M2='// ================= V83 · safe external opener'
assert s.count(M2)==1
s=s.replace(M2,open(S+'v176.js',encoding='utf8').read()+'\n'+M2)
C='<style id="k150">'
assert s.count(C)==1
s=s.replace(C,open(S+'k176css.txt',encoding='utf8').read()+'\n'+C)
open(P,'w',encoding='utf8').write(s);print('ok 176',P)
