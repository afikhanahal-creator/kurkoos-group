import json,re,os,collections,time,random,glob,datetime,csv
S='/tmp/claude-0/-home-user-kurkoos-group/b616de33-7a66-539b-90c4-315bd9ec44de/scratchpad';os.chdir(S)
lib={x['k']:x for x in json.load(open('photolib.json'))}
GOOD={'site','finish','interior','exterior','aerial','detail','atmo','env'}
LOCAL=lambda k:os.path.exists(('blobs/'+k[2:]+'.jpg') if k.startswith('u_') else ('photos/'+k+'.jpg'))
ok=lambda x:LOCAL(x['k']) and not x['hide'] and not x['dup'] and (x['w']>=1000 or x['w']==0 and x['kind']=='site') and x['kind'] in GOOD
usage=collections.Counter()
for f in os.listdir('mig3/posts'):
  p=(json.load(open('mig3/posts/'+f)).get('p') or {});k=((p.get('fx') or {}).get('shot') or {}).get('k')
  if k: usage[k]+=1
for f in ('mag2/insert.json','mag3/insert.json'):
  for x in json.load(open(f)):
    k=((x['data']['p'].get('fx') or {}).get('shot') or {}).get('k')
    if k: usage[k]+=1
PROJ={'henrietta':r'הנרייטה|סאלד','zrubavel':r'זרובבל','hankin':r'חנקין','ramhal':r'רמח"ל|רמחל','bengurion':r'בן גוריון','shikmim':r'השקמים','humash':r'החומש','mohaliver':r'מוהליבר','yordei':r'יורדי הים'}
def photo(r,site=False):
  t=r['headline']+' '+r['fb'];proj=next((pk for pk,rx in PROJ.items() if re.search(rx,t)),'')
  c=[x for x in lib.values() if ok(x) and (x['proj']==proj if proj else x['proj'] in('','general')) and (not site or x['kind'] in('site','detail','aerial'))] or [x for x in lib.values() if ok(x)]
  c.sort(key=lambda x:(usage[x['k']],x['k']));k=c[0]['k'];usage[k]+=1;return k
KL={'editorial':'x_c_editorial','contrast':'x_c_contrast','term':'x_c_term','insight':'x_c_insight','thought':'x_c_thought','hottake':'x_b_hottake','bigword':'x_b_bigword',
 'data':'x_c_bars','stat':'x_c_stat','compare':'x_c_compare','dilemma':'x_c_dilemma','steps':'x_c_steps','timeline':'x_mag_timeline','grid4':'x_c_grid4','checklist':'x_b_check',
 'questions':'x_c_questions','list':'x_mag_numeral','blueprint':'x_c_blueprint','material':'x_c_material','scenario':'x_c_scenario','mistake':'x_c_mistake','annotate':'x_b_annotate',
 'redflags':'x_b_flags','myth':'x_mag_myth','chat':'x_b_chat','receipt':'x_b_receipt','poll':'x_b_poll','sticky':'x_b_sticky','pov':'x_b_pov','story':'x_b_block','cover':'x_c_cover','news':'x_mag_news'}
PHOTO={'x_c_editorial','x_c_stat','x_mag_numeral','x_b_annotate','x_mag_myth','x_b_poll','x_b_pov','x_b_block','x_c_cover'}
SITE={'x_b_annotate'}
B36='0123456789abcdefghijklmnopqrstuvwxyz'
def b36(n):
  o=''
  while n:o=B36[n%36]+o;n//=36
  return o
FLAG={'e50','e36','e35','d50','c35','c49','f18','f27','f43','f31','f40'}
rows=[]
for f in sorted(glob.glob('mag4/[a-f].jsonl')):
  for l in open(f):
    if l.strip():rows.append(json.loads(l))
base=int(time.time()*1000);now=time.strftime('%Y-%m-%dT%H:%M:%S.000Z',time.gmtime());out=[];cnt=collections.Counter();bad=[]
# a publishing plan: 3 slots a week from next Sunday, mixing domains
SL=[(6,'10:00','sun10'),(6,'19:00','sun19'),(0,'12:00','mon12'),(0,'19:00','mon19'),(1,'12:00','tue12'),(1,'19:00','tue19'),(2,'12:00','wed12'),(2,'17:30','wed1730'),(3,'12:00','thu12'),(3,'19:00','thu19'),(4,'09:30','fri0930')]
start=datetime.date(2026,10,11)
order=[];byd=collections.defaultdict(list)
for r in rows: byd[r.get('domain','')].append(r)
while any(byd.values()):
  for d in list(byd):
    if byd[d]:order.append(byd[d].pop(0))
dates=[]
d=start
while len(dates)<len(order):
  for wd,hm,sl in SL:
    day=d+datetime.timedelta(days=(wd-d.weekday())%7)
    dates.append((day.isoformat()+'T'+hm,sl))
  d+=datetime.timedelta(days=7)
dates.sort()
for i,r in enumerate(order):
  L=KL.get(r.get('kind'));
  if not L: bad.append((r['id'],'kind',r.get('kind')));continue
  its=[{'v':str(x.get('big','')),'l':str(x.get('label',''))} for x in r.get('items') or []][:7]
  pid=b36(base+i*7)+''.join(random.choice(B36[10:]+B36[:10]) for _ in range(3))
  fx={'items':its}
  if L in PHOTO: fx['shot']={'k':photo(r,L in SITE),'r':[0,0,1,1]}
  if r.get('source'): fx['source']=r['source']
  if L=='x_mag_myth':
    h=re.sub(r'^\s*מיתוס[:.]?\s*','',r['headline'].replace('\n',' '));fx['myth']=(h.split('?')[0] if '?' in h else h).strip().strip('"');fx['truth']=r.get('sub','')
  if L=='x_mag_numeral': fx['num']=str(len([x for x in its if x['l']]) or 3)
  at,slot=dates[i];cnt[L]+=1
  p={'id':pid,'key':'','layout':L,'visual':{'eyebrow':r.get('eyebrow',''),'headline':r['headline'],'sub':r.get('sub',''),'cta':r.get('cta',''),'items':[],'slides':[]},
     'hook':r['headline'].replace('\n',' '),'fb':r['fb'],'ig':r.get('ig',''),'li':r.get('li',''),'reel':r.get('reel',''),'fx':fx,'series':'ספריית קורקוס 2026','topic':r.get('category',''),
     'domain':r.get('domain',''),'goal':r.get('goal',''),'audience':r.get('audience',''),'idea':r.get('idea',''),'takeaway':r.get('takeaway',''),'planAt':at,
     'mag':1,'slot':slot,'slide':0,'shoot':'אין צורך בצילום.','why':r.get('idea',''),'mechanic':'','score':8,'born':now,'tab':'fb','format':'תמונה','theme':0,'src':'claude','rev':'library-2026-10-10','status':('בבדיקה' if (r.get('source') or r['id'] in FLAG) else 'מוכן לפרסום'),'upd':now}
  out.append({'id':pid,'data':{'key':'','p':p,'removed':0,'upd':now},'src_id':r['id']})
json.dump(out,open('mag4/insert.json','w'),ensure_ascii=False)
print(len(out),dict(cnt),'bad',bad[:10])
