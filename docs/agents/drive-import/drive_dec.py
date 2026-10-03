"""decode one persisted download result (JSON {content: base64,...}) or an inline base64 string into drive/<id>.<ext>"""
import sys,json,base64,os
S=os.path.dirname(os.path.abspath(__file__));os.makedirs(os.path.join(S,'drive'),exist_ok=True)
src,fid,ext=sys.argv[1],sys.argv[2],sys.argv[3]
raw=open(src,encoding='utf8').read()
try:
    d=json.loads(raw);content=d['content']
except Exception:
    content=raw.strip()
b=base64.b64decode(content)
out=os.path.join(S,'drive',fid+'.'+ext.lstrip('.'))
open(out,'wb').write(b);print(out,len(b))
