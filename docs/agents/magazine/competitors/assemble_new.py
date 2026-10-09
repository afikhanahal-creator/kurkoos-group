import json,re,os,collections,time,random
S='/tmp/claude-0/-home-user-kurkoos-group/b616de33-7a66-539b-90c4-315bd9ec44de/scratchpad';os.chdir(S)
lib={x['k']:x for x in json.load(open('photolib.json'))}
GOOD={'site','finish','interior','exterior','aerial','detail','atmo','env','people'}
ok=lambda x:not x['hide'] and not x['dup'] and (x['w']>=1000 or x['w']==0 and x['kind']=='site') and x['kind'] in GOOD
usage=collections.Counter()
for f in os.listdir('mig3/posts'):
  p=(json.load(open('mig3/posts/'+f)).get('p') or {})
  k=((p.get('fx') or {}).get('shot') or {}).get('k')
  if k: usage[k]+=1
PROJ={'henrietta':r'הנרייטה|סאלד','zrubavel':r'זרובבל','hankin':r'חנקין','ramhal':r'רמח"ל|רמחל','bengurion':r'בן גוריון','shikmim':r'השקמים','humash':r'החומש','mohaliver':r'מוהליבר','yordei':r'יורדי הים'}
def photo(r):
  t=r['headline']+' '+r['fb'];proj=next((pk for pk,rx in PROJ.items() if re.search(rx,t)),'')
  c=[x for x in lib.values() if ok(x) and (x['proj']==proj if proj else x['proj'] in('','general'))] or [x for x in lib.values() if ok(x)]
  c.sort(key=lambda x:(usage[x['k']],x['k']));k=c[0]['k'];usage[k]+=1;return k
cnt=collections.Counter()
num=lambda its:[x for x in its if re.search(r'\d',x['v']) and not re.match(r'^0\d$',x['v'].strip())]
def choose(r,its):
  k=r['kind'];c=r['category']
  if k=='versus':return 'x_mag_versus'
  if k=='timeline':return 'x_mag_timeline'
  if c=='question':return 'x_mag_question'
  if c=='news':return 'x_mag_news'
  if k=='myth':return 'x_mag_myth'
  if k=='cost':return 'x_mag_cost' if len([x for x in its if re.search(r'%|₪|ש"ח',x['v']+x['l'])])>=3 else ('x_mag_spec' if len(num(its))>=4 else 'x_mag_numeral')
  if k=='spec':return 'x_mag_spec' if len(num(its))>=4 else 'x_mag_cover'
  if k=='story':return 'x_mag_torn' if cnt['x_mag_torn']<=cnt['x_mag_cover'] else 'x_mag_cover'
  return 'x_mag_numeral' if cnt['x_mag_numeral']<=cnt['x_mag_break']*1.4 else 'x_mag_break'
base=int(time.time()*1000);now=time.strftime('%Y-%m-%dT%H:%M:%S.000Z',time.gmtime());out=[]
for i,l in enumerate(open('mag2/new_posts.jsonl')):
  r=json.loads(l);its=[{'v':str(x.get('big','')),'l':str(x.get('label',''))} for x in r.get('items') or []][:6]
  L=choose(r,its);cnt[L]+=1
  pid=(base+i*7).__format__('x') and ''
  n=base+i*7;b36='';
  while n:b36='0123456789abcdefghijklmnopqrstuvwxyz'[n%36]+b36;n//=36
  pid=b36+''.join(random.choice('abcdefghijklmnopqrstuvwxyz0123456789') for _ in range(3))
  fx={'items':its}
  if L not in('x_mag_question',):fx['shot']={'k':photo(r),'r':[0,0,1,1]}
  if r.get('source'):fx['source']=r['source']
  if L=='x_mag_myth':h=re.sub(r'^\s*מיתוס[:.]?\s*','',r['headline'].replace('\n',' '));fx['myth']=(h.split('?')[0] if '?' in h else h).strip().strip('"');fx['truth']=r.get('sub','')
  if L=='x_mag_numeral':fx['num']=str(len([x for x in its if x['l']]) or 3)
  p={'id':pid,'key':'','layout':L,'visual':{'eyebrow':r['eyebrow'],'headline':r['headline'],'sub':r.get('sub',''),'cta':r.get('cta',''),'items':[],'slides':[]},
     'hook':r['headline'].replace('\n',' '),'fb':r['fb'],'ig':r.get('ig',''),'reel':r.get('reel',''),'fx':fx,'series':'מגזין קורקוס','topic':r.get('topic',''),
     'mag':1,'tab':'fb','format':'תמונה','theme':0,'src':'claude','rev':'competitors-2026-10-09','upd':now}
  out.append({'id':pid,'data':{'key':'','p':p,'removed':0,'upd':now}})
json.dump(out,open('mag2/insert.json','w'),ensure_ascii=False)
print(dict(cnt),len(out),out[0]['id'])
