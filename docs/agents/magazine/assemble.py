#!/usr/bin/env python3
"""Builds the new state from the writers' output: picks the magazine layout per post, assigns photos, archives duplicates.
Writes mig4/ (a copy of mig3 with the changes) for the real scorer, and changes.json for the database."""
import json,os,re,shutil,collections,hashlib,sys
S='/tmp/claude-0/-home-user-kurkoos-group/b616de33-7a66-539b-90c4-315bd9ec44de/scratchpad'
os.chdir(S)
dd=json.load(open('dedupe.json'));keep=set(dd['keep']);arch=set(dd['arch'])
lib={x['k']:x for x in json.load(open('photolib.json'))}
docs={};docid={}
for f in os.listdir('mig3/posts'):
  d=json.load(open('mig3/posts/'+f));p=d.get('p')
  if p: docs[p['id']]=d;docid[p['id']]=f[:-5]
out={}
for f in sorted(os.listdir('mag/out')):
  for l in open('mag/out/'+f,encoding='utf8'):
    if l.strip():
      try:r=json.loads(l);out[r['id']]=r
      except Exception as e: print('bad line',f,e)
inp={}
for f in sorted(os.listdir('mag/in')):
  for l in open('mag/in/'+f,encoding='utf8'):
    r=json.loads(l);inp[r['id']]=r
sc={x['id']:x for x in json.load(open('scores.json'))}
# ---- photo usage among the posts that stay
def keys(p):
  s=json.dumps(p.get('fx') or {});return set(re.findall(r'"k":\s*"([\w-]+)"',s))|set(x for x in ((p.get('fx') or {}).get('s') or []) if isinstance(x,str))
PROJ={'henrietta':r'הנרייטה|סאלד','zrubavel':r'זרובבל','hankin':r'חנקין','ramhal':r'רמח"ל|רמחל','bengurion':r'בן גוריון','shikmim':r'השקמים','humash':r'החומש','mohaliver':r'מוהליבר','yordei':r'יורדי הים'}
GOOD={'site','finish','interior','exterior','aerial','detail','atmo','env','people'}
def okphoto(x): return not x['hide'] and not x['dup'] and (x['w']>=1000 or x['w']==0 and x['kind']=='site') and x['kind'] in GOOD|{'render'}
# groups
groups=collections.defaultdict(list)
for i,r in inp.items(): groups[r['group']].append(i)
usage=collections.Counter()
for i in keep:
  if i in docs: usage.update(keys(docs[i]['p']))
mag_ids=set()
for g,ids in groups.items():
  ids=[i for i in ids if i in out]
  if not ids: continue
  if len(ids)==1: mag_ids.add(ids[0])
  else:
    ids.sort(key=lambda i:sc[i]['avg']);mag_ids.add(ids[0])
# layout choice
cnt=collections.Counter()
def nlist(fb): return len(re.findall(r'\n\d\.',fb))
def numeric(its): return [x for x in its if re.search(r'\d',str(x.get('big',x.get('v','')))) and not re.match(r'^0\d$',str(x.get('big',x.get('v',''))).strip())]
def sameunit(its): return [x for x in its if re.search(r'%|₪|ש"ח',str(x.get('big',''))+str(x.get('label','')))]
def choose(r):
  k=r.get('kind','list');its=r.get('items') or [];num=numeric(its)
  if k=='myth':L='x_mag_myth'
  elif k=='cost':L='x_mag_cost' if len(sameunit(its))>=3 else ('x_mag_spec' if len(num)>=4 else 'x_mag_numeral')
  elif k in('spec','project'):L='x_mag_spec' if len(num)>=4 else 'x_mag_cover'
  elif k=='quote':L='x_mag_quote'
  elif k=='timeline':L='x_mag_torn'
  elif k=='question':L='x_mag_break'
  elif k=='story':L='x_mag_torn' if cnt['x_mag_torn']<=cnt['x_mag_cover'] else 'x_mag_cover'
  else:L='x_mag_numeral' if cnt['x_mag_numeral']<=cnt['x_mag_break']*1.4 else 'x_mag_break'
  cnt[L]+=1;return L
def pick_photo(r,old):
  t=' '.join([r.get('headline',''),r.get('fb','')])
  proj=next((pk for pk,rx in PROJ.items() if re.search(rx,t)),'')
  oldk=[k for k in keys(old) if k in lib]
  cand=[x for x in lib.values() if okphoto(x) and (x['proj']==proj if proj else x['proj'] in('','general'))]
  if proj and not cand: cand=[x for x in lib.values() if okphoto(x) and x['proj'] in('','general')]
  # keep the post's own photo when it is not overused
  for k in oldk:
    if usage[k]<=5 and lib[k]['kind']!='render': return k
  cand.sort(key=lambda x:(usage[x['k']]+(3 if x['kind']=='render' else 0),x['k']))
  return cand[0]['k'] if cand else (oldk[0] if oldk else '')
changes=[];now='2026-10-05T23:30:00.000Z'
for i,r in out.items():
  if i not in docs: continue
  d=docs[i];p=json.loads(json.dumps(d['p']));old=d['p']
  v=dict(p.get('visual') or {});v.update(headline=r['headline'],sub=r.get('sub',''),eyebrow=r.get('eyebrow',''),cta=r.get('cta',''))
  p['visual']=v;p['hook']=r['headline'].replace('\n',' ');p['fb']=r['fb'];p['ig']=r.get('ig','');p['reel']=r.get('reel','');p['mechanic']='';p['upd']=now;p['rev']='magazine-2026-10-05'
  if i in mag_ids:
    L=choose(r);k=pick_photo(r,old);its=[{'v':str(x.get('big','')),'l':str(x.get('label',''))} for x in (r.get('items') or [])][:6]
    fx={'shot':{'k':k,'r':[0,0,1,1]} if k else None,'items':its}
    if (old.get('fx') or {}).get('logo'):fx['logo']=old['fx']['logo']
    if k and lib.get(k,{}).get('kind')=='render':fx['tag']='הדמיה'
    if L=='x_mag_myth':fx['myth']=re.sub(r'^\s*מיתוס[:.]?\s*','',r['headline'].replace('\n',' '));fx['truth']=r.get('sub','')
    if L=='x_mag_numeral':fx['num']=str(max(len([x for x in its if x['l']]),nlist(r['fb'])) or 3)
    p['layout']=L;p['fx']={a:b for a,b in fx.items() if b is not None};p['series']='מגזין קורקוס';p['mag']=1
    if k: usage[k]+=1
    for kk in keys(old): usage[kk]-=1
  changes.append({'doc':docid[i],'id':i,'p':p,'h':hashlib.md5((old.get('fb') or '').encode()).hexdigest()[:5]+hashlib.md5(((old.get('visual') or {}).get('headline') or '').encode()).hexdigest()[:5]})
# ---- spread photos: no photo in more than 7 posts. Extra uses move to the least used photo of the same project and kind.
final={c['id']:c['p'] for c in changes}
for i in keep:
  if i in docs and i not in final: final[i]=docs[i]['p']
base=lambda k:(lib.get(k,{}).get('dup') or k)
U=collections.Counter()
for p in final.values(): U.update(base(k) for k in keys(p))
seen=collections.Counter();moved=0;touched=set()
for i in sorted(final, key=lambda i:(0 if final[i].get('mag') else 1, i)):
  p=final[i]
  for k in list(keys(p)):
    bk=base(k);seen[bk]+=1
    if U[bk]<=6 or seen[bk]<=6 or k not in lib: continue
    src=lib[k];cand=[x for x in lib.values() if okphoto(x) and x['kind']!='render' and x['proj']==src['proj'] and U[x['k']]<6]
    if not cand: cand=[x for x in lib.values() if okphoto(x) and x['kind']!='render' and x['proj'] in('','general') and U[x['k']]<6]
    if not cand: continue
    cand.sort(key=lambda x:(U[x['k']],x['k']));nk=cand[0]['k']
    fxs=json.dumps(p.get('fx') or {},ensure_ascii=False).replace('"'+k+'"','"'+nk+'"');p['fx']=json.loads(fxs)
    U[bk]-=1;U[nk]+=1;moved+=1;touched.add(i)
for i in touched:
  if i not in {c['id'] for c in changes}:
    d=docs[i];p=final[i];p['upd']=now
    changes.append({'doc':docid[i],'id':i,'p':p,'photo_only':1,'h':hashlib.md5((d['p'].get('fb') or '').encode()).hexdigest()[:5]+hashlib.md5(((d['p'].get('visual') or {}).get('headline') or '').encode()).hexdigest()[:5]})
print('photos moved',moved,'over 7 now',sum(1 for v in U.values() if v>7))
print('rewritten',len(changes),'magazine',len(mag_ids&set(out)),dict(cnt))
print('photos over 7 after',sum(1 for v in usage.values() if v>7))
# mig4
if os.path.exists('mig4'): shutil.rmtree('mig4')
shutil.copytree('mig3','mig4')
for c in changes:
  json.dump({'key':docs[c['id']].get('key',''),'p':c['p'],'removed':0,'upd':c['p']['upd']},open(f"mig4/posts/{c['doc']}.json",'w'),ensure_ascii=False)
for i in arch:
  if i in docs: json.dump({'key':'','p':None,'removed':1,'upd':now},open(f"mig4/posts/{docid[i]}.json",'w'))
json.dump({'changes':changes,'archive':[{'doc':docid[i],'h':hashlib.md5((docs[i]['p'].get('fb') or '').encode()).hexdigest()[:5]+hashlib.md5(((docs[i]['p'].get('visual') or {}).get('headline') or '').encode()).hexdigest()[:5]} for i in arch if i in docs]},open('mag/changes.json','w'),ensure_ascii=False)
print('archive',len(arch))
