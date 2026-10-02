import json,glob,os,re,hashlib,sys
sys.path.insert(0,'canva')
from convert import convert,lum,W,H
ARCH={'bigq':'שאלה גדולה','fullphoto':'צילום מלא','split':'חצי צילום, חצי טקסט','bignum':'מספר ענק','quote':'ציטוט','checklist':'רשימת בדיקה','beforeafter':'לפני ואחרי','banner':'באנר הכרזה','cover':'שער מגזין','facts3':'שלוש עובדות','qa':'שאלה ותשובה','steps':'ארבעה שלבים','grid4':'רשת צילומים','circle':'צילום עגול','frame':'צילום ממוסגר','poster':'פוסטר טיפוגרפי','tip':'כרטיס טיפ','compare':'השוואה','location':'כרטיס מיקום','opening':'ציטוט ענק','stat':'נתון באחוזים','listing':'כרטיס נכס','carousel':'שער קרוסלה','minimal':'מינימליסטי'}
STY={'lightnavy':'בהיר','darknavy':'כהה','redbold':'אדום','teal':'טורקיז'}
PAL={'#07293a':(7,41,58),'#a90b0c':(169,11,12),'#105572':(16,85,114),'#8fb6c8':(143,182,200),'#ffffff':(255,255,255),'#f4f6f8':(244,246,248),'#0b1f2a':(11,31,42),'#5b6472':(91,100,114),'#dbe8ee':(219,232,238)}
TXT={'#07293a':(7,41,58),'#ffffff':(255,255,255),'#a90b0c':(169,11,12),'#0b1f2a':(11,31,42),'#8fb6c8':(143,182,200)}
def rgb(h):
    h=h.lstrip('#');return tuple(int(h[i:i+2],16) for i in (0,2,4))
def snap(h,pal):
    c=rgb(h);return min(pal,key=lambda k:sum((a-b)**2 for a,b in zip(c,pal[k])))
def contrast(a,b):
    f=lambda c:(lambda x:x/12.92 if x<=.03928 else ((x+.055)/1.055)**2.4)(c/255)
    L=lambda t:.2126*f(t[0])+.7152*f(t[1])+.0722*f(t[2])
    la,lb=L(rgb(a)),L(rgb(b));hi,lo=max(la,lb),min(la,lb);return (hi+.05)/(lo+.05)
def finish(el):
    # brand palette
    for e in el:
        if e['t']=='rect':e['col']=snap(e['col'],PAL)
        if e['t']=='text':e['col']=snap(e['col'],TXT)
    # the page colour is the first rect
    bg=el[0]['col'] if el and el[0]['t']=='rect' else '#f4f6f8'
    photos=[e for e in el if e['t']=='photo']
    for e in el:
        if e['t']!='text':continue
        # is the text over a photo?
        tw=e['maxW'];tx0=e['x']-tw if e['align']=='right' else (e['x']-tw/2 if e['align']=='center' else e['x']);ty0=e['y'];ty1=e['y']+e['size']*e['lh']*e['max']
        over=any(p['x']<tx0+tw and p['x']+p['w']>tx0 and p['y']<ty1 and p['y']+p['h']>ty0 for p in photos)
        # shapes behind the text
        under=None
        for r in el:
            if r['t']=='rect' and r is not el[0] and r['x']<=tx0+tw*.5<=r['x']+r['w'] and r['y']<=ty0+10<=r['y']+r['h']:under=r['col']
        base=under or bg
        if over and not under:
            e['col']='#ffffff';e['_scrim']=(ty0,ty1)
        elif contrast(e['col'],base)<4.5:
            e['col']='#ffffff' if contrast('#ffffff',base)>=contrast('#07293a',base) else '#07293a'
        if e['f']=='head':e['w']=max(e['w'],800)
    out=[];seen=0
    for e in el:
        s=e.pop('_scrim',None)
        if s:
            y0=max(0,int(s[0]-160));y1=min(H,int(s[1]+120))
            low=(s[0]+s[1])/2>H/2
            out.append({'t':'grad','x':0,'y':y0,'w':W,'h':y1-y0,'from':'rgba(7,41,58,0)' if low else 'rgba(7,41,58,.78)','to':'rgba(7,41,58,.78)' if low else 'rgba(7,41,58,0)'})
        out.append(e)
    # texts must come after photos and grads: stable sort by type order
    order={'rect':0,'photo':1,'grad':2,'text':3,'chrome':4}
    out=sorted(out,key=lambda e:order.get(e['t'],3))
    return out
def repair(el):
    texts=[e for e in el if e['t']=='text']
    for e in texts:
        al=e['align']
        if al=='right':e['maxW']=int(min(e['maxW'],e['x']-60))
        elif al=='left':e['maxW']=int(min(e['maxW'],1020-e['x']))
        else:e['maxW']=int(min(e['maxW'],2*min(e['x']-60,1020-e['x'])))
        if e['f']=='sub':e['maxW']=max(e['maxW'],min(520,(e['x']-60) if al=='right' else 520))
        e['maxW']=max(240,e['maxW'])
        if e['y']<150 and e['f']!='label':e['y']=150
        # keep out of the logo corner
        x0=e['x']-e['maxW'] if al=='right' else (e['x']-e['maxW']/2 if al=='center' else e['x'])
        if x0<340 and e['y']<150:e['y']=150
    head=next((e for e in texts if e['f']=='head'),None);sub=next((e for e in texts if e['f']=='sub'),None)
    if head:
        # a headline of three or more words needs room; estimate lines from width
        hb=head['y']+head['size']*head['lh']*head['max']
        if sub and sub['y']<hb and sub['y']+sub['size']*sub['lh']*sub['max']>head['y']:
            sub['y']=int(hb+28)
        if sub and sub['y']+sub['size']*sub['lh']*sub['max']>1262:
            sub['y']=int(1262-sub['size']*sub['lh']*sub['max'])
    return el
def main():
    specs=[];skipped=[];seen=set()
    for f in sorted(glob.glob('canva/raw_*_*.json')):
        key=os.path.basename(f)[4:-5]
        try:raw=json.load(open(f))
        except Exception as ex:skipped.append((key,'bad json'));continue
        if 'pages' not in raw:skipped.append((key,'no pages'));continue
        r=convert(raw)
        if not r:skipped.append((key,'no text'));continue
        el=repair(finish(r['el']))
        a,s=key.split('_',1)
        sig=hashlib.md5(json.dumps([(e['t'],e.get('x'),e.get('y'),e.get('w'),e.get('h'),e.get('size')) for e in el],sort_keys=True).encode()).hexdigest()[:8]
        if sig in seen:skipped.append((key,'duplicate structure'));continue
        seen.add(sig)
        theme='light' if lum(el[0]['col'])>150 else 'dark' if el[0]['t']=='rect' else r['theme']
        name=f"{ARCH.get(a,a)}, {STY.get(s,s)}"
        hasph=any(e['t']=='photo' for e in el)
        specs.append({'id':'x_t_cvh_'+key.replace('_','').replace('-',''),'name':name,'theme':theme,'el':el,'desc':r['desc'],'arch':a,'style':s,'ct':['project','construction','news','tip','data','quote','faq'] ,'st':['photo' if hasph else 'clean','bold']})
    json.dump(specs,open('canva_templates.json','w'),ensure_ascii=False,separators=(',',':'))
    print(len(specs),'templates;',len(skipped),'skipped',skipped[:10])
main()
