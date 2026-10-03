"""Builds video_engine_bundle.json (engine, fonts, logo, sounds, the skill docs) for the editing routine, then publish it as an artifact file."""
import os,base64,json,sys
files={}
def add(p):files[p.replace(chr(92),'/')]=base64.b64encode(open(p,'rb').read()).decode()
for d in ('video/engine','video/fonts','video/assets','video/sfx'):
    for f in sorted(os.listdir(d)):
        p=os.path.join(d,f)
        if os.path.isfile(p) and not f.endswith('.pyc'):add(p)
add('video/README.md')
for root,_,fs in os.walk('.claude/skills/video-studio'):
    for f in fs:
        p=os.path.join(root,f)
        if (f.endswith(('.md','.json','.yaml','.txt')) or root.endswith('scripts')) and os.path.getsize(p)<2_000_000 and '/assets/' not in p.replace(chr(92),'/'):add(p)
out=sys.argv[1] if len(sys.argv)>1 else 'video_engine_bundle.json'
json.dump({"name":"kurkoos-video-engine","files":files},open(out,'w'))
print(len(files),'files',round(os.path.getsize(out)/1e6,2),'MB ->',out)
