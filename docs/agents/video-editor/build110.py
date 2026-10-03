import shutil,json
P='ce15.html'
s=open(P,encoding='utf8').read()
if 'V110 ·' in s: raise SystemExit('already built')
shutil.copy(P,'ce15.bak110')
man=json.load(open('site_media.json',encoding='utf8'))
js=open('v110.js',encoding='utf8').read().replace('__SITE_MEDIA__',json.dumps(man,ensure_ascii=False,separators=(',',':')))
M='// ================= V83 · safe external opener'
assert s.count(M)==1
s=s.replace(M,js+'\n'+M)
open(P,'w',encoding='utf8').write(s)
print('ok',len(s),'images',sum(1+1+1+len(p['gallery']) for p in man['projects']),'videos',sum(len(p['videos']) for p in man['projects']))
