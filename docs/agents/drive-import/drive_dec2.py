"""decode every persisted Drive download result into drive/<id>.<ext>; print the plan2 ids still missing"""
import json,base64,os,glob,sys
S=os.path.dirname(os.path.abspath(__file__));os.makedirs(os.path.join(S,'drive'),exist_ok=True)
EXT={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/heif':'heic','image/heic':'heic','video/mp4':'mp4','video/quicktime':'mov'}
n=0
for f in glob.glob('/root/.claude/projects/-home-user-kurkoos-group/b616de33-7a66-539b-90c4-315bd9ec44de/tool-results/mcp-Google_Drive-download_file_content-*.txt'):
    try:
        d=json.load(open(f,encoding='utf8'))
        if not isinstance(d,dict) or 'content' not in d: continue
        ext=EXT.get(d.get('mimeType',''),'bin');out=os.path.join(S,'drive',d['id']+'.'+ext)
        if os.path.exists(out) and os.path.getsize(out)>1000: continue
        open(out,'wb').write(base64.b64decode(d['content']));n+=1
    except Exception as e: print('skip',f[-40:],e)
plan=json.load(open(os.path.join(S,'drive_plan2.json'),encoding='utf8'))['images']
have=[x for x in plan if os.path.exists(os.path.join(S,'drive',x['id']+'.'+EXT.get(x['mime'],'bin')))]
todo=[x for x in plan if x not in have and 90000<=x['size']<=6_000_000]
json.dump(todo,open(os.path.join(S,'drive_todo2.json'),'w',encoding='utf8'),ensure_ascii=False)
print('decoded',n,'have',len(have),'todo',len(todo))
k=int(sys.argv[1]) if len(sys.argv)>1 else 8
print(' '.join(x['id'] for x in todo[:k]))
