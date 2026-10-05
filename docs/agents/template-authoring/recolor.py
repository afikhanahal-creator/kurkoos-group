import json,re,colorsys,sys
sys.path.insert(0,'canva')
from lint import check,hexof,cr
NAVY,RED,TEAL,MIST,WH,PAPER,PALE,INK,SLATE="#07293a","#a90b0c","#105572","#8fb6c8","#ffffff","#f4f6f8","#dbe8ee","#0b1f2a","#35505e"
def rgb(h):h=h.lstrip('#');return tuple(int(h[i:i+2],16)/255 for i in (0,2,4))
def map_hex(h):
    h=h.lower()
    if h in (NAVY,RED,TEAL,MIST,WH,PAPER,PALE,INK,SLATE):return h
    r,g,b=rgb(h);hh,l,s=colorsys.rgb_to_hls(r,g,b);hue=hh*360
    if l>=0.93:return WH
    if l>=0.80:return PAPER if s<0.35 else PALE
    if l<=0.16:return INK if l<0.07 else NAVY
    if s<0.18:                      # greys and near neutrals
        return SLATE if l<0.55 else (MIST if l<0.75 else PALE)
    # saturated colours by hue family
    if hue<40 or hue>=330:return RED            # red, coral, pink, orange-ish
    if hue<70:return RED if l<0.5 else MIST      # orange, gold, ochre, bronze: hot accent; pale yellows become mist
    if hue<170:return TEAL                       # green, lime
    if hue<200:return MIST if l>0.5 else TEAL    # cyan, teal
    if hue<260:return NAVY if l<0.45 else TEAL   # blue, purple-blue
    return NAVY if l<0.5 else TEAL               # purple, violet
def map_rgba(s):
    m=re.match(r'rgba?\(([^)]+)\)',s)
    if not m:return s
    a=[float(x) for x in m.group(1).split(',')]
    hx='#%02x%02x%02x'%tuple(int(v) for v in a[:3]);nh=map_hex(hx);r,g,b=[int(nh[i:i+2],16) for i in (1,3,5)]
    return f'rgba({r},{g},{b},{a[3]})' if len(a)>3 else nh
def map_col(v):
    if not isinstance(v,str):return v
    if re.match(r'^#[0-9a-fA-F]{6}$',v):return map_hex(v)
    if v.startswith('rgb'):return map_rgba(v)
    return v
KEYS={'col','bg','fg','from','to','stroke','hiBg','hiFg','ncol','track','lcol','lcol2','line','rule','icol','acc','tint','ph','bg1','bg2','outline','ucol'}
def recolor(spec):
    for e in spec['el']:
        for k in list(e.keys()):
            if k in KEYS:e[k]=map_col(e[k])
        if e.get('t')=='photo' and e.get('rgb'):
            nh=map_hex('#%02x%02x%02x'%tuple(int(x) for x in e['rgb'].split(',')));e['rgb']=','.join(str(int(nh[i:i+2],16)) for i in (1,3,5))
        if e.get('t')=='tiles':
            for it in e.get('items',[]):it['col']=map_col(it.get('col'))
    # text contrast repair after the mapping
    for e in spec['el']:
        if e.get('t') in ('text','caption'):
            pass
    er,wa=check(spec)
    bad=[x for x in er if 'contrast' in x]
    if bad:
        # flip each failing text to the better of white / navy against what the linter saw
        for e in spec['el']:
            if e.get('t')=='text' and not e.get('shadow'):
                e['col']=WH if e.get('col')==WH else e.get('col')
        for x in bad:
            m=re.search(r'against (#[0-9a-f]{6})',x);under=m.group(1) if m else PAPER
            role=x.split(' contrast')[0].strip()
            for e in spec['el']:
                if e.get('t')=='text' and not e.get('shadow') and (e.get('f','')==role or (role=='' and e.get('text'))):
                    e['col']=WH if cr(WH,under)>=cr(NAVY,under) else NAVY
                if e.get('t')=='caption' and e.get('f','head')==role:
                    e['fg']=WH if cr(WH,e.get('bg',PAPER))>=cr(NAVY,e.get('bg',PAPER)) else NAVY
    return spec
if __name__=='__main__':
    a=json.load(open('new_templates.json'))
    out=[];fails=0
    for s in a:
        s=recolor(s)
        er,wa=check(s)
        if er:fails+=1;print('FAIL',s['id'],er[:2]);continue
        out.append(s)
    json.dump(out,open('new_templates.json','w'),ensure_ascii=False,separators=(',',':'))
    print(len(out),'templates on brand;',fails,'dropped')
