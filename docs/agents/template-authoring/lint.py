import json,sys,re,hashlib
W,H=1080,1350
OK={'photo','rect','grad','line','text','caption','pill','bars','chrome','tiles','frame','dots','stat','arrow','marker','flow','list','counter','swipe','stack','vtext','otext','ring','pphoto','cphoto','gridlines','specs','dropcap','stamp','slidebar','timeline','tag','dimline','levels','tblock','siteboard','tape','credits','clipboard','housewin','roster','ledger','linehouse','redmark','frame2','steps','progress','poll','sticker','play','cta'}
COLN={'navy':'#07293a','red':'#a90b0c','teal':'#105572','mist':'#8fb6c8','white':'#ffffff','slate':'#5b6472','ink':'#0b1f2a','paper':'#f4f6f8','mist1':'#dbe8ee'}
def hexof(c):
    if not c:return None
    c=COLN.get(c,c)
    if isinstance(c,str) and re.match(r'^#[0-9a-fA-F]{6}$',c):return c
    m=re.match(r'rgba?\(([^)]+)\)',c or '')
    if m:
        a=[float(x) for x in m.group(1).split(',')];return '#%02x%02x%02x'%tuple(int(v) for v in a[:3])
    return None
def L(h):
    r,g,b=[int(h[i:i+2],16)/255 for i in (1,3,5)]
    f=lambda x:x/12.92 if x<=.03928 else ((x+.055)/1.055)**2.4
    return .2126*f(r)+.7152*f(g)+.0722*f(b)
def cr(a,b):
    la,lb=L(a),L(b);return (max(la,lb)+.05)/(min(la,lb)+.05)
def check(spec):
    errs=[];warn=[]
    el=spec.get('el')
    if not isinstance(el,list) or not el:return ['no el'],[]
    if not spec.get('id') or not spec.get('name'):errs.append('id or name missing')
    types=[e.get('t') for e in el]
    for e in el:
        if e.get('t') not in OK:errs.append('unknown element '+str(e.get('t')))
    if types.count('photo')+types.count('pphoto')+types.count('cphoto')>3:errs.append('more than 3 photos')
    texts=[e for e in el if e.get('t')=='text']
    heads=[e for e in texts if e.get('f')=='head']
    if len(heads)!=1:errs.append('exactly one head text is required (found %d)'%len(heads))
    if not any(e.get('t')=='chrome' for e in el):warn.append('no chrome footer')
    # page colour
    bg=None
    for e in el:
        if e.get('t')=='rect' and e.get('w',0)>=W*.95 and e.get('h',0)>=H*.95:bg=hexof(e.get('col'))
        if e.get('t')=='photo' and e.get('w',0)>=W*.95 and e.get('h',0)>=H*.95:bg=None
    th=spec.get('theme','light');pagebg=bg or ('#f4f6f8' if th in ('light','white','mist','paper') else '#07293a')
    boxes=[]
    for e in texts:
        f=e.get('f','');size=e.get('size',30);mx=e.get('max',1);lh=e.get('lh',1.2);mw=e.get('maxW',700);al=e.get('align','right');x=e.get('x',0);y=e.get('y',0)
        floor={'head':64,'sub':28,'label':22}.get(f,0)
        if f in('head','sub','label') and size<floor and e.get('kind')!='small':errs.append(f'{f} size {size} below {floor}')
        if f=='head' and size>170:errs.append('head larger than 170')
        x0=x-mw if al=='right' else (x-mw/2 if al=='center' else x);x1=x0+mw
        if x0<40 and not e.get('min'):warn.append(f'{f} may start left of 40 ({x0:.0f})')
        if x1>W-40:warn.append(f'{f} may run past right margin ({x1:.0f})')
        h=size*lh*mx
        if y+h>H-80:errs.append(f'{f} runs into the footer zone (bottom {y+h:.0f})')
        if y<30:errs.append(f'{f} too close to the top')
        if f in('head','sub','label') and e.get('t')=='text':boxes.append((f,x0,y,x1,y+h))
        c=hexof(e.get('col'))
        # what is under the text
        under=pagebg;over_photo=False
        for r in el:
            if r is e:break
            if r.get('t')=='rect' and r.get('x',0)<=(x0+x1)/2<=r['x']+r.get('w',0) and r.get('y',0)<=y+10<=r['y']+r.get('h',0):under=hexof(r.get('col')) or under
            if r.get('t') in('photo','pphoto','cphoto') and r.get('x',0)<x1 and r['x']+r.get('w',0)>x0 and r.get('y',0)<y+h and r['y']+r.get('h',0)>y:over_photo=True
        if c and not over_photo and cr(c,under)<4.5:errs.append(f'{f} contrast {cr(c,under):.1f} against {under}')
        if over_photo:
            has_scrim=any(r.get('t')=='grad' for r in el) or any(r.get('t')=='photo' and r.get('fade') for r in el) or any(r.get('t')=='photo' and r.get('dim') for r in el)
            if not has_scrim and c and L(c)>.5:warn.append(f'{f} sits on a photo without a scrim')
    for i in range(len(boxes)):
        for j in range(i+1,len(boxes)):
            a,b=boxes[i],boxes[j]
            if a[1]<b[3] and a[3]>b[1] and a[2]<b[4] and a[4]>b[2]:errs.append(f'{a[0]} overlaps {b[0]}')
        a=boxes[i]
        if a[1]<340 and a[2]<150:warn.append(a[0]+' sits in the logo corner')
    return errs,warn
def sig(spec):
    return hashlib.md5(json.dumps([(e.get('t'),round(e.get('x',e.get('x1',0))/60),round(e.get('y',e.get('y1',0))/60),round(e.get('w',0)/60),round(e.get('h',0)/60),e.get('f'),e.get('align')) for e in spec['el']]).encode()).hexdigest()
if __name__=='__main__':
    f=sys.argv[1];specs=json.load(open(f));seen={};bad=0
    for s in specs:
        er,wa=check(s);sg=sig(s)
        if sg in seen:er.append('same structure as '+seen[sg])
        seen[sg]=s.get('id')
        if er or wa:
            print(('FAIL ' if er else 'warn ')+str(s.get('id')),'|','; '.join(er+wa));bad+=1 if er else 0
    print(len(specs),'templates,',bad,'failing')
