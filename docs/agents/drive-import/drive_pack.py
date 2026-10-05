"""Downloaded Drive files -> upload-ready set: images downscaled to <=2000px JPEG/WebP under 1.2 MB, videos transcoded to
<=1080p H.264 mp4 under 15 MB, plus docs.json with the photos/videos document bodies (ids filled after upload)."""
import json,os,subprocess,sys
from PIL import Image,ImageOps
S=os.path.dirname(os.path.abspath(__file__))
plan=json.load(open(os.path.join(S,'drive_plan.json'),encoding='utf8'))
EXT={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','video/mp4':'mp4','video/quicktime':'mov'}
OUT=os.path.join(S,'drive_up');os.makedirs(OUT,exist_ok=True)
docs=[];missing=[]
for it in plan['images']:
    src=os.path.join(S,'drive',it['id']+'.'+EXT.get(it['mime'],it['mime'].split('/')[-1]))
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
        q=86
        while True:
            im.save(dst,'JPEG',quality=q,optimize=True,progressive=True)
            if os.path.getsize(dst)<=1_200_000 or q<=60: break
            q-=8
        docs.append({'kind':'photo','id':it['id'],'file':dst,'doc':{'name':it['name'],'project':it['project'],'kind':it['kind'],'tags':'drive,'+it['folder'].replace(',',' '),'w':im.size[0],'h':im.size[1],'addedAt':'2026-10-03T06:00:00Z','src':'drive:'+it['id'],'title':it['title'],'batch':'drive1'}})
    except Exception as e:
        missing.append(it['id']+' '+str(e))
for it in plan['videos']:
    src=os.path.join(S,'drive',it['id']+'.'+EXT.get(it['mime'],it['mime'].split('/')[-1]))
    if not os.path.exists(src): missing.append(it['id']);continue
    dst=os.path.join(OUT,it['id']+'.mp4')
    try:
        import imageio_ffmpeg;FF=imageio_ffmpeg.get_ffmpeg_exe();dur=0.0
        if not os.path.exists(dst):
            subprocess.run([FF,'-y','-v','error','-i',src,'-vf',"scale='if(gt(iw,ih),min(1920,iw),-2)':'if(gt(iw,ih),-2,min(1080,ih))'",'-c:v','libx264','-preset','veryfast','-crf','24','-pix_fmt','yuv420p','-c:a','aac','-b:a','128k','-movflags','+faststart',dst],check=True)
        try:
            pr=subprocess.run([FF,'-i',dst],capture_output=True,text=True);import re
            m=re.search(r'Duration: (\d+):(\d+):(\d+\.\d+)',pr.stderr);dur=int(m[1])*3600+int(m[2])*60+float(m[3]) if m else 0.0
        except Exception: pass
        docs.append({'kind':'video','id':it['id'],'file':dst,'doc':{'name':it['name'][:60],'source':'drive','origin':'drive:'+it['id'],'project':it['project'],'brand':'auto','status':'queued','style':'clean','hook':'','cta':'','keywords':[],'title':it['title'],'duration':round(dur,2),'created':'2026-10-03T06:00:00Z','batch':'drive1'}})
    except Exception as e:
        missing.append(it['id']+' '+str(e))
json.dump({'docs':docs,'missing':missing},open(os.path.join(S,'drive_docs.json'),'w',encoding='utf8'),ensure_ascii=False,indent=0)
tot=sum(os.path.getsize(d['file']) for d in docs)
print('ready',len([d for d in docs if d['kind']=='photo']),'photos',len([d for d in docs if d['kind']=='video']),'videos',round(tot/1e6,1),'MB; missing',len(missing))
