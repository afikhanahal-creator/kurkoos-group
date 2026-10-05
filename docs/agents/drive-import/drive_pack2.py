"""Second Drive batch: drive/<id>.<ext> (jpg, png, webp, heic) -> drive_up2/<id>.jpg (<=2000px, <=1.2MB) + drive_docs2.json"""
import json,os
from PIL import Image,ImageOps
import pillow_heif;pillow_heif.register_heif_opener()
S=os.path.dirname(os.path.abspath(__file__))
plan=json.load(open(os.path.join(S,'drive_plan2.json'),encoding='utf8'))['images']
EXT={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/heif':'heic','image/heic':'heic'}
OUT=os.path.join(S,'drive_up2');os.makedirs(OUT,exist_ok=True)
docs=[];missing=[]
for it in plan:
    src=os.path.join(S,'drive',it['id']+'.'+EXT.get(it['mime'],'bin'))
    if not os.path.exists(src): missing.append(it['id']);continue
    dst=os.path.join(OUT,it['id']+'.jpg')
    try:
        im=Image.open(src);im=ImageOps.exif_transpose(im)
        if im.mode in ('RGBA','LA','P'):
            bg=Image.new('RGB',im.size,(255,255,255));bg.paste(im.convert('RGBA'),mask=im.convert('RGBA').split()[-1]);im=bg
        else: im=im.convert('RGB')
        w,h=im.size;m=2000
        if max(w,h)>m:
            s=m/max(w,h);im=im.resize((round(w*s),round(h*s)),Image.LANCZOS)
        if not os.path.exists(dst):
            q=86
            while True:
                im.save(dst,'JPEG',quality=q,optimize=True,progressive=True)
                if os.path.getsize(dst)<=1_200_000 or q<=60: break
                q-=8
        docs.append({'id':it['id'],'file':dst,'doc':{'name':it['name'],'project':it['project'],'kind':it['kind'],'tags':'drive,'+it['folder'].replace(',',' '),'w':im.size[0],'h':im.size[1],'addedAt':'2026-10-03T13:30:00Z','src':'drive:'+it['id'],'title':it['title'],'batch':'drive2'}})
    except Exception as e:
        missing.append(it['id']+' '+str(e))
json.dump({'docs':docs,'missing':missing},open(os.path.join(S,'drive_docs2.json'),'w',encoding='utf8'),ensure_ascii=False,indent=0)
tot=sum(os.path.getsize(d['file']) for d in docs)
print('ready',len(docs),'photos',round(tot/1e6,1),'MB; missing',len(missing),missing[:5])
