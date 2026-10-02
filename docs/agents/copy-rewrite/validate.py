import json,re,glob,collections,sys
M='קבוצת קורקוס. מקרקע ועד מסירת מפתח.'
allp={p['key']:p for p in json.load(open('copy/all_posts.json'))}
orig={p['key']:p for p in json.load(open('crit/posts.json'))}
BAN=['הכי טוב','מוביל','איכות ללא פשרות','בית החלומות','יוקרתי במיוחד','הזדמנות שלא תחזור','בלעדי','חלומות','!!!']
def strip_safe(t):
    t=re.sub(r'https?://\S+','',t)
    t=re.sub(r'\d{2,3}-\d{3}-\d{4}','',t)
    return t
def problems(inp,o):
    pr=[]
    if o.get('key')!=inp['key']:pr.append('key mismatch')
    h=o.get('headline','');fb=o.get('fb_body','');ig=o.get('ig_body','');sub=o.get('sub');sub=None if sub is None else str(sub)
    if not h.strip():pr.append('no headline')
    same=h.strip()==inp['headline'].strip()
    if not same and len(re.sub(r'\s+',' ',h.replace('*','')).split())>7:pr.append('headline>7 words')
    if not same and len(h.replace('\n',' ').replace('*',''))>38:pr.append('headline>38 chars')
    if h.count('\n')>1 and h.strip()!=inp['headline'].strip():pr.append('headline>2 lines')
    if inp['sub_locked']:
        if sub is not None:pr.append('sub given though locked')
    else:
        if sub and len(sub.split())>12:pr.append('sub>12 words')
    for name,t in (('headline',h),('sub',sub or ''),('fb',fb),('ig',ig)):
        s=strip_safe(t)
        if re.search(r'[-–—‐‑]',s):pr.append(name+': dash/hyphen')
        if re.search(r'[()\[\]]',s):pr.append(name+': brackets')
        if '!' in s:pr.append(name+': exclamation')
        if re.search(r'[\U0001F300-\U0001FAFF☀-➿]',s):pr.append(name+': emoji')
        for b in BAN:
            if b in s:pr.append(name+': banned '+b)
        if '#' in s:pr.append(name+': hashtag in body')
        if '055-981-1814' in t or 'kurkoos-group.co.il' in t and 'http' not in t:pr.append(name+': phone/site in body')
        if M in t:pr.append(name+': footer in body')
    for u in inp['must_keep_urls']:
        if u.rstrip('.,') not in fb and u.rstrip('.,') not in ig:pr.append('url dropped '+u[:40])
    if len(fb)<120 and inp['fb_body']:pr.append('fb too short')
    if len(ig)<40 and inp['ig_body']:pr.append('ig too short')
    if len(ig)>700:pr.append('ig too long')
    if len(fb)>1400:pr.append('fb too long')
    if inp['format'] in ('סטורי',) and 'פריים' in inp['fb_body'] and 'פריים' not in fb:pr.append('story frames lost')
    return pr
if __name__=='__main__':
    ok=0;bad=[];missing=[]
    outs={}
    for f in sorted(glob.glob('copy/out_*.json')):
        try:d=json.load(open(f))
        except Exception as e:print(f,'INVALID JSON',e);continue
        bi=json.load(open(f.replace('out_','in_')))
        if len(d)!=len(bi):print(f,'count',len(d),'vs',len(bi))
        byk={o.get('key'):o for o in d}
        for inp in bi:
            o=byk.get(inp['key'])
            if not o:missing.append(inp['key']);continue
            pr=problems(inp,o)
            if pr:bad.append((inp['key'],pr))
            else:outs[inp['key']]=o;ok+=1
    print('ok',ok,'bad',len(bad),'missing',len(missing))
    c=collections.Counter(x for _,p in bad for x in p);print(c.most_common(12))
    json.dump({'bad':bad,'missing':missing},open('copy/problems.json','w'),ensure_ascii=False)
    json.dump(outs,open('copy/valid.json','w'),ensure_ascii=False)
