#!/usr/bin/env python3
"""python3 design/build_page.py design/fx14a.js t_a.html  ->  injects the layout file into a private copy of the engine and makes a test page served at http://localhost:8765/t_a.html"""
import sys,subprocess,os
S=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
fx,out=sys.argv[1],sys.argv[2]
s=open(os.path.join(S,'design/base_ce15.html'),encoding='utf8').read()
M='/*FX13:END*/'
assert M in s
s=s.replace(M,M+'\n'+open(os.path.join(S,fx),encoding='utf8').read())
tmp=os.path.join(S,'design/_'+os.path.basename(out)+'.ce.html')
open(tmp,'w',encoding='utf8').write(s)
subprocess.check_call(['python3',os.path.join(S,'mkt.py'),tmp,os.path.join(S,out)],stdout=subprocess.DEVNULL)
print('ok',out)
