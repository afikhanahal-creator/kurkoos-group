"""Second Drive pass: every image the first pass left out (big files, campaign and presentation folders, old folders,
HEIC) except icons, logos, screenshots, signatures and folders marked not for publishing or not relevant.
Writes drive_plan2.json (images only, under the 10 MB download limit) with project, kind, name and tags."""
import json,re,os
from collections import Counter
S=os.path.dirname(os.path.abspath(__file__))
inv=json.load(open(os.path.join(S,'drive_inventory.json'),encoding='utf8'))
plan1=json.load(open(os.path.join(S,'drive_plan.json'),encoding='utf8'))
done=set(l.split()[0] for l in open(os.path.join(S,'drive_assets.txt'),encoding='utf8') if l.strip())
PROJ=[('חנקין','hankin'),('הנרייטה','henrietta'),('הנריטה','henrietta'),('מוהליבר','mohaliver'),('בן גוריון','bengurion'),('זרובבל','zrubavel'),('רמחל','ramhal'),('רמח"ל','ramhal'),('יורדי הים','yordei'),('השקמים','shikmim'),('שקמים','shikmim'),('החומש','humash'),('חומש','humash')]
NAMES={'hankin':'חנקין 41','henrietta':'הנרייטה סאלד','mohaliver':'מוהליבר 70','bengurion':'בן גוריון 17','zrubavel':'זרובבל 15','ramhal':'רמחל 6-8','yordei':'יורדי הים 3','shikmim':'השקמים 24','humash':'החומש 22-24','general':'קבוצת קורקוס'}
SKIP_PATH=re.compile(r'סוכנים וכותבי תוכן|kurkoos-content|realestate-agent-kit|סקילים|לוגואים|\.github|workflows|/agents|articles|images$|לא רלוונטי|לא לפרסום|נמכר')
SKIP_TITLE=re.compile(r'צילום מסך|חתימה|logo|לוגו|Untitled design|afik-|screenshot',re.I)
LIMIT=10_000_000
def proj_of(path,title):
    s=path+' '+title
    for k,v in PROJ:
        if k in s: return v
    return 'general'
def kind_of(path,title):
    s=path+' '+title
    if 'הדמי' in s: return 'render'
    if 'קמפיין' in s or 'מודעות' in s or 'קאבר' in s or 'לממומן' in s or 'מצגת' in s: return 'ad'
    if 'תכני' in s: return 'plan'
    return 'site'
seen=set((x['title'],x['size']) for x in plan1['images'])
plan=[];big=[];skipped=Counter()
for f in inv['files']:
    path=f.get('path','') or '';title=f.get('title','') or '';mime=f.get('mime','') or '';size=int(f.get('size') or 0)
    if not mime.startswith('image/'): continue
    if f['id'] in done: skipped['done']+=1;continue
    if mime=='image/svg+xml': skipped['svg']+=1;continue
    if SKIP_PATH.search(path): skipped['folder']+=1;continue
    if SKIP_TITLE.search(title) or path=='/' or path=='': skipped['title']+=1;continue
    key=(title,size)
    if key in seen: skipped['dup']+=1;continue
    seen.add(key)
    pj=proj_of(path,title);kd=kind_of(path,title)
    folder=path.split('/')[-1] if path else ''
    rec={'id':f['id'],'title':title,'mime':mime,'size':size,'path':path,'project':pj,'kind':kd,'folder':folder,'name':NAMES.get(pj,pj)+' · '+(folder or 'דרייב')}
    if size>LIMIT: big.append(rec);continue
    plan.append(rec)
# the 16 small ones from the first plan whose inline results were never decoded
for x in plan1['images']:
    if x['id'] not in done and x['id'] not in set(p['id'] for p in plan): plan.append(x)
json.dump({'images':plan,'big':big},open(os.path.join(S,'drive_plan2.json'),'w',encoding='utf8'),ensure_ascii=False,indent=0)
print('images',len(plan),'MB',round(sum(p['size'] for p in plan)/1e6,1),'too big',len(big),[b['title'] for b in big][:20])
print('skipped',dict(skipped))
print('by project',Counter(p['project'] for p in plan).most_common())
print('by kind',Counter(p['kind'] for p in plan).most_common())
print('by mime',Counter(p['mime'] for p in plan).most_common())
for p in plan: print(p['id'],p['size'],p['path'],'|',p['title'])
