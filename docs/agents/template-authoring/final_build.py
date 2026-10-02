import json,glob,os,sys
sys.path.insert(0,'canva')
from lint import check,sig
out=[];seen=set()
# 1. canva derived (strict)
for s in json.load(open('canva/strict.json')):
    head=next(e for e in s['el'] if e['t']=='text' and e['f']=='head')
    if head['size']<80:continue
    sg=sig(s)
    if sg in seen:continue
    seen.add(sg);s=dict(s);s['fam']='canvahe';s['famName']='עברית מקאנבה';s['famNote']='פריסות שנקראו מעיצובים של קאנבה בעברית מימין לשמאל: כותרת גדולה מיושרת לימין, ניגודיות גבוהה, מקום לצילום. הצבעים הותאמו למותג והתמונות והטקסט הם שלכם';s['src']='canva';out.append(s)
nc=len(out)
# 2. authored
dirs={d[0]:d for d in json.load(open('canva/dirs.json'))}
cnt={}
for f in sorted(glob.glob('canva/author/*.json')):
    b=os.path.basename(f)[:-5]
    if b.startswith('assign_') or b not in dirs:continue
    try:specs=json.load(open(f))
    except Exception as e:print('bad json',f,e);continue
    d=dirs[b];n=0
    for s in specs:
        er,wa=check(s)
        if er:continue
        if any('fallback' in e for e in s['el']):
            dropped=globals().setdefault('dropped',[]);dropped.append(s.get('id'));continue
        sg=sig(s)
        if sg in seen:continue
        seen.add(sg);s=dict(s);s['fam']='au_'+b;s['famName']=d[1];s['famNote']='עיצובים חדשים: '+d[2];s['src']='authored';out.append(s);n+=1
    cnt[b]=n
# 3. brand round (round 2): the brand's own palette
B=json.load(open('canva/brands.json'))
cnt2={}
for b,info in B.items():
    try:specs=json.load(open(f'canva/author2/{b}.json'))
    except Exception as e:continue
    n=0
    for s in specs:
        er,wa=check(s)
        if er:continue
        sg=b+':'+sig(s)
        if sg in seen:continue
        seen.add(sg);s=dict(s);s['fam']='b2_'+b;s['famName']=info['he'];s['famNote']=('שפה ויזואלית של המותג: ' if info.get('verified') else 'פרשנות של השפה הוויזואלית: ')+info['look'].split('.')[0]+'. התמונות, הטקסטים והלוגו הם של קורקוס';s['src']='brand';out.append(s);n+=1
    cnt2[b]=n
print('brand round',sum(cnt2.values()),cnt2)
out=[x for x in out if x['src']=='brand']+[x for x in out if x['src']!='brand']
json.dump(out,open('new_templates.json','w'),ensure_ascii=False,separators=(',',':'))
print('dropped for placeholder numbers:',len(globals().get('dropped',[])));print(len(out),'templates; canva',nc,'authored',len(out)-nc,cnt)
