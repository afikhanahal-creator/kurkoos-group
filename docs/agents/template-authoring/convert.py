import json,sys,re,hashlib,glob,os
W,H=1080,1350
WEIGHT={'thin':100,'extralight':200,'light':300,'normal':400,'regular':400,'medium':500,'semibold':600,'bold':700,'ultrabold':800,'extrabold':800,'heavy':900,'black':900}
def lum(c):
    c=c.lstrip('#')
    if len(c)==3:c=''.join(x*2 for x in c)
    try:r,g,b=[int(c[i:i+2],16) for i in (0,2,4)]
    except:return 128
    return .299*r+.587*g+.114*b
def hexcol(c):
    return c if isinstance(c,str) and re.match(r'^#[0-9a-fA-F]{6}$',c) else None
def solid(fill):
    if not isinstance(fill,dict):return None
    c=fill.get('color')
    if isinstance(c,dict):c=c.get('color')
    return hexcol(c)
def convert(raw,page_index=0):
    pg=raw['pages'][page_index];dim=pg['dimensions'];sx=W/dim['width'];sy=H/dim['height'];fs=(sx+sy)/2
    els=pg.get('elements',[]);texts=[];shapes=[];photos=[]
    for e in els:
        t=e.get('type');x=e.get('left',0)*sx;y=e.get('top',0)*sy;w=e.get('width',0)*sx;h=e.get('height',0)*sy
        if e.get('rotation'):  # rotated pieces are decoration for our engine
            continue
        if t=='text':
            regs=e.get('textRegions') or []
            if not regs:continue
            f=regs[0].get('formatting',{});chars=''.join(r.get('characters','') for r in regs).strip()
            size=f.get('fontSize',30)*fs
            texts.append({'x':x,'y':y,'w':w,'h':h,'size':size,'weight':WEIGHT.get(str(f.get('fontWeight','normal')).lower(),500),'col':hexcol(f.get('color')) or '#07293a','align':f.get('textAlign','start'),'chars':chars,'op':e.get('opacity',1),'lh':f.get('lineHeight',1.2)})
        elif t in ('rect','shape','ellipse','circle','polygon'):
            fill=e.get('fill') or {}
            if isinstance(fill,dict) and 'media' in fill:
                area=w*h/(W*H)
                if area>=0.04 and 0.35<=(w/max(h,1))<=4.5:photos.append({'x':x,'y':y,'w':w,'h':h,'a':area})
            else:
                c=solid(fill)
                if c and w*h/(W*H)>=0.008 and e.get('opacity',1)>=0.5:shapes.append({'x':x,'y':y,'w':w,'h':h,'col':c,'r':(min(w,h)/2 if t in ('ellipse','circle') else 0),'op':e.get('opacity',1),'t':t})
    # background
    bg=pg.get('background') or {}
    bgc=solid(bg) if isinstance(bg,dict) else None
    # merge text lines that belong together
    texts=[t for t in texts if not (re.fullmatch(r'\d{1,2}',t['chars']) and t['size']<26) and t['op']>=0.5 and t['size']>=14]
    texts.sort(key=lambda t:(t['y'],t['x']))
    blocks=[]
    for t in texts:
        for b in blocks:
            if abs(b['size']-t['size'])<2 and b['col']==t['col'] and b['weight']==t['weight'] and abs(b['x']-t['x'])<40 and -t['size']*0.5<=t['y']-(b['y']+b['h'])<t['size']*0.8:
                b['h']=t['y']+t['h']-b['y'];b['lines']+=1;b['w']=max(b['w'],t['w']);break
        else:
            blocks.append(dict(t,lines=max(1,round(t['h']/(t['size']*t['lh']))) ))
    if not blocks:return None
    # background colour
    main=max(blocks,key=lambda b:b['size']*b['lines'])
    dark_text=lum(main['col'])<110
    theme='light' if dark_text else 'dark'
    el=[]
    if bgc:el.append({'t':'rect','x':0,'y':0,'w':W,'h':H,'col':bgc})
    else:el.append({'t':'rect','x':0,'y':0,'w':W,'h':H,'col':'#f4f6f8' if dark_text else '#07293a'})
    if bgc:theme='light' if lum(bgc)>150 else 'dark'
    for s in sorted(shapes,key=lambda s:-s['w']*s['h']):
        o={'t':'rect','x':round(s['x']),'y':round(s['y']),'w':round(s['w']),'h':round(s['h']),'col':s['col']}
        if s['r']:o['r']=round(s['r'])
        el.append(o)
    photos.sort(key=lambda p:-p['a'])
    for i,p in enumerate(photos[:3]):
        full=p['w']>=W*.92 and p['h']>=H*.9
        el.append({'t':'photo','x':0 if full else round(p['x']),'y':0 if full else round(p['y']),'w':W if full else round(p['w']),'h':H if full else round(p['h']),'s':i,**({'dim':.12} if full else {})})
    # roles
    order=sorted(blocks,key=lambda b:-b['size'])
    roles={}
    head=order[0];roles['head']=head
    rest=[b for b in order[1:] if b is not head]
    sub=next((b for b in rest if b['size']>=24 and b['size']<head['size']*0.8),None)
    if sub:roles['sub']=sub
    lab=next((b for b in sorted(rest,key=lambda b:b['y']) if b is not sub and b['size']<=34 and b['y']<H*0.2 and b['chars']),None)
    if lab:roles['label']=lab
    for role,b in roles.items():
        al=b['align'];right= al in ('start','justify')
        align='right' if right else ('center' if al=='center' else 'left')
        # a block that spans nearly the page and is "start" stays right aligned; narrow boxes are anchored by their own edges
        x=b['x']+b['w'] if align=='right' else (b['x']+b['w']/2 if align=='center' else b['x'])
        floor={'head':64,'sub':28,'label':22}[role];ceil={'head':160,'sub':64,'label':40}[role]
        size=max(floor,min(ceil,round(b['size'])))
        o={'t':'text','f':role,'x':round(x),'y':round(b['y']),'maxW':round(min(940,max(260,b['w']))),'size':size,'max':max(1,b['lines'])+(1 if role=='sub' else 0),'w':800 if role=='head' else (500 if role=='sub' else 700),'col':b['col'],'align':align,'lh':round(max(1.05,min(1.4,b['lh'])),2)}
        if role=='label':o['kind']='small'
        el.append(o)
    el.append({'t':'chrome','o':{'noIndex':True}})
    # describe
    nph=len([e for e in el if e['t']=='photo']);full=any(e['t']=='photo' and e['w']>=W*.92 and e['h']>=H*.9 for e in el)
    kind='צילום מלא' if full else ('צילום וטקסט' if nph else ('בלוקי צבע וטקסט' if shapes else 'טיפוגרפי'))
    mid=head['y']+head['h']/2;where='כותרת עליונה' if mid<H*.38 else ('כותרת באמצע' if mid<H*.64 else 'כותרת תחתונה')
    return {'el':el,'theme':theme,'desc':kind+', '+where,'stats':{'photos':nph,'shapes':len(shapes),'texts':len(blocks)}}
if __name__=='__main__':
    raw=json.load(open(sys.argv[1]))
    r=convert(raw)
    print(json.dumps(r,ensure_ascii=False,indent=1))
