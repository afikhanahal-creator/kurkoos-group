"""drive_inventory.json -> drive_plan.json: which Drive files to bring into the library, with project, kind, name and tags."""
import json,re,sys,os
S=os.path.dirname(os.path.abspath(__file__))
inv=json.load(open(os.path.join(S,'drive_inventory.json'),encoding='utf8'))
PROJ=[('חנקין','hankin'),('הנרייטה','henrietta'),('הנריטה','henrietta'),('מוהליבר','mohaliver'),('בן גוריון','bengurion'),('זרובבל','zrubavel'),('רמחל','ramhal'),('רמח"ל','ramhal'),('יורדי הים','yordei'),('השקמים','shikmim'),('שקמים','shikmim'),('החומש','humash'),('חומש','humash')]
NAMES={'hankin':'חנקין 41','henrietta':'הנרייטה סאלד','mohaliver':'מוהליבר 70','bengurion':'בן גוריון 17','zrubavel':'זרובבל 15','ramhal':'רמחל 6-8','yordei':'יורדי הים 3','shikmim':'השקמים 24','humash':'החומש 22-24','general':'קבוצת קורקוס'}
SKIP_PATH=re.compile(r'סוכנים וכותבי תוכן|kurkoos-content|realestate-agent-kit|סקילים|לוגואים|\.github|workflows|agents|articles|images$')
SKIP_TITLE=re.compile(r'צילום מסך|חתימה|logo|לוגו|Untitled design|^\d{1,2}\.png$|afik-|screenshot',re.I)
def proj_of(path,title):
    s=path+' '+title
    for k,v in PROJ:
        if k in s: return v
    return 'general'
def kind_of(path,title,mime):
    s=path+' '+title
    if mime.startswith('video/'): return 'video'
    if 'הדמי' in s: return 'render'
    if 'קמפיין' in s or 'מודעות' in s or 'קאבר' in s: return 'ad'
    if 'תמונות נכסים' in path: return 'site'
    if 'פיקוח' in s: return 'site'
    return 'site'
seen=set();plan=[]
for f in inv['files']:
    path=f.get('path','') or '';title=f.get('title','') or '';mime=f.get('mime','') or '';size=int(f.get('size') or 0)
    if mime=='image/svg+xml': continue
    if SKIP_PATH.search(path) or SKIP_TITLE.search(title): continue
    if not (mime.startswith('image/') or mime.startswith('video/')): continue
    key=(title,size)
    if key in seen: continue
    seen.add(key)
    pj=proj_of(path,title);kd=kind_of(path,title,mime)
    folder=path.split('/')[-1] if path else ''
    plan.append({'id':f['id'],'title':title,'mime':mime,'size':size,'path':path,'project':pj,'kind':kd,'folder':folder,'name':NAMES.get(pj,pj)+' · '+(folder or 'דרייב')})
imgs=[p for p in plan if p['kind']!='video'];vids=[p for p in plan if p['kind']=='video']
json.dump({'images':imgs,'videos':vids},open(os.path.join(S,'drive_plan.json'),'w',encoding='utf8'),ensure_ascii=False,indent=0)
from collections import Counter
print('images',len(imgs),'videos',len(vids),'img MB',round(sum(p['size'] for p in imgs)/1e6,1),'vid MB',round(sum(p['size'] for p in vids)/1e6,1))
print('by project',Counter(p['project'] for p in imgs).most_common())
print('by kind',Counter(p['kind'] for p in plan).most_common())
print('videos >15MB',sum(1 for p in vids if p['size']>15e6),'>80MB',sum(1 for p in vids if p['size']>80e6))
