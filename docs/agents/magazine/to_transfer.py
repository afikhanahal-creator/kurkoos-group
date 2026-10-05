#!/usr/bin/env python3
"""changes.json -> transfer.json with only the fields that change (delta), so anything else in the live post stays."""
import json
S='/tmp/claude-0/-home-user-kurkoos-group/b616de33-7a66-539b-90c4-315bd9ec44de/scratchpad'
c=json.load(open(S+'/mag/changes.json'))
out=[]
for x in c['changes']:
  p=x['p']
  if x.get('photo_only'):
    out.append({'doc':x['doc'],'h':x['h'],'v':{},'s':{'fx':p.get('fx') or {}}})
    continue
  v={k:p['visual'].get(k,'') for k in ('headline','sub','eyebrow','cta')}
  s={k:p.get(k) for k in ('hook','fb','ig','reel','mechanic','rev')}
  if p.get('mag'): s.update(layout=p['layout'],fx=p['fx'],series=p['series'],mag=1)
  out.append({'doc':x['doc'],'h':x['h'],'v':v,'s':s})
json.dump({'changes':out,'archive':c['archive']},open(S+'/mag/transfer.json','w'),ensure_ascii=False,separators=(',',':'))
print('changes',len(out),'archive',len(c['archive']))
