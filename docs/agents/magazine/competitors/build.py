import json,sys
sys.path.insert(0,'.')
from posts_e import P
L={'H':'https://www.kurkoos-group.co.il/kablan-bniya-bayit-prati','V':'https://www.kurkoos-group.co.il/bniyat-vila-sharon','HH':'https://www.kurkoos-group.co.il/bniyat-bayit-prati/hod-hasharon','S':'https://www.kurkoos-group.co.il/divisions/supervision','E':'https://www.kurkoos-group.co.il/divisions/execution','D':'https://www.kurkoos-group.co.il/divisions/development','B':'https://www.kurkoos-group.co.il/divisions/brokerage','C':'https://www.kurkoos-group.co.il/real-estate-calculators','P':'https://www.kurkoos-group.co.il/projects','G':'https://www.kurkoos-group.co.il'}
TAG={'news':'#נדלן','local':'#השרון','howto':'#בנייתבית','myth':'#בנייתבית','cost':'#משכנתא','question':'#בנייתבית','bts':'#אתרבנייה','season':'#איטום'}
HT='#קבוצתקורקוס #בנייתוילות #הודהשרון'
out=open('new_posts.jsonl','w',encoding='utf8')
for i,p in enumerate(P,1):
  ht=HT+' '+TAG[p['cat']]
  fb=p['body'].strip()+'\n\nקבוצת קורקוס. מקרקע ועד מסירת מפתח.\n\n055-981-1814\n\n'+L[p['link']]+'\n\n'+ht
  cta=p['cta']; import re
  m=re.search(r'"([^"]+)"',cta)
  kw=m.group(1) if m else None
  ask=(f'כתבו "{kw}" בתגובות.' if kw else 'כתבו "א" או "ב" בתגובות.')
  ig=p['ig'].strip()+'\n\n'+ask+'\n\n'+ht
  r=dict(id=f'n{i:02d}',topic=p['topic'],category=p['cat'],headline=p['headline'],sub=p['sub'],eyebrow=p['eyebrow'],cta=cta,fb=fb,ig=ig,reel=p['reel'],kind=p['kind'],items=p['items'],source=p['source'])
  out.write(json.dumps(r,ensure_ascii=False)+'\n')
print(len(P))
