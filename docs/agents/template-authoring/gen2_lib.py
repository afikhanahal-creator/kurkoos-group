W,H,M=1080,1350,72
FOOT=1262
def chrome(): return {"t":"chrome","o":{"noIndex":True}}
def page(col): return {"t":"rect","x":0,"y":0,"w":W,"h":H,"col":col}
def rect(x,y,w,h,col,r=0,a=None):
    o={"t":"rect","x":int(x),"y":int(y),"w":int(w),"h":int(h),"col":col}
    if r:o["r"]=r
    if a is not None:o["a"]=a
    return o
def grad(x,y,w,h,frm,to,dir=None):
    o={"t":"grad","x":int(x),"y":int(y),"w":int(w),"h":int(h),"from":frm,"to":to}
    if dir:o["dir"]=dir
    return o
def line(x1,y1,x2,y2,col,lw=1.5,dash=None):
    o={"t":"line","x1":int(x1),"y1":int(y1),"x2":int(x2),"y2":int(y2),"col":col,"lw":lw}
    if dash:o["dash"]=dash
    return o
def photo(x,y,w,h,s=0,**kw):
    o={"t":"photo","x":int(x),"y":int(y),"w":int(w),"h":int(h),"s":s};o.update(kw);return o
def cphoto(x,y,r,s=0,**kw):
    o={"t":"cphoto","x":int(x),"y":int(y),"r":int(r),"s":s};o.update(kw);return o
def pphoto(pts,s=0,**kw):
    o={"t":"pphoto","pts":[[int(a),int(b)] for a,b in pts],"s":s};o.update(kw);return o
def head(x,y,size,col,maxW=None,mx=3,align="right",lh=1.05,w=800,**kw):
    o={"t":"text","f":"head","x":int(x),"y":int(y),"size":size,"max":mx,"w":w,"col":col,"align":align,"lh":lh,"maxW":int(maxW if maxW else (x-M if align=="right" else (W-2*M if align=="center" else W-M-x)))}
    o.update(kw);return o
def sub(x,y,size,col,maxW=None,mx=3,align="right",lh=1.3,w=500,**kw):
    o={"t":"text","f":"sub","x":int(x),"y":int(y),"size":size,"max":mx,"w":w,"col":col,"align":align,"lh":lh,"maxW":int(maxW if maxW else (x-M if align=="right" else (W-2*M if align=="center" else W-M-x)))}
    o.update(kw);return o
def label(x,y,size,col,align="right",track=1,w=700,**kw):
    o={"t":"text","f":"label","kind":"small","x":int(x),"y":int(y),"size":size,"col":col,"align":align,"track":track,"w":w};o.update(kw);return o
def small(text,x,y,size,col,align="right",track=1,w=700,**kw):
    o={"t":"text","text":text,"kind":"small","x":int(x),"y":int(y),"size":size,"col":col,"align":align,"track":track,"w":w};o.update(kw);return o
def pill(x,y,bg,fg,text=None,f="label",align="right",size=22,**kw):
    o={"t":"pill","x":int(x),"y":int(y),"bg":bg,"fg":fg,"align":align,"size":size}
    if text is not None:o["text"]=text
    else:o["f"]=f
    o.update(kw);return o
def tag(x,y,col,text=None,align="right",size=20):
    o={"t":"tag","x":int(x),"y":int(y),"col":col,"align":align,"size":size}
    if text is not None:o["text"]=text
    return o
def sticker(x,y,bg,fg,text,rot=-6,size=30):
    return {"t":"sticker","x":int(x),"y":int(y),"bg":bg,"fg":fg,"text":text,"rot":rot,"size":size}
def caption(x,y,size,bg,fg,f="head",align="right",mx=3,lh=1.28,maxW=None,**kw):
    o={"t":"caption","f":f,"x":int(x),"y":int(y),"size":size,"bg":bg,"fg":fg,"align":align,"max":mx,"lh":lh,"w":800}
    if maxW:o["maxW"]=int(maxW)
    o.update(kw);return o
def marker(x,y,col,rad=10,ring=None):
    o={"t":"marker","x":int(x),"y":int(y),"col":col,"rad":rad}
    if ring:o["ring"]=ring
    return o
def dots(x,y,w,h,col,step=28,rad=2): return {"t":"dots","x":int(x),"y":int(y),"w":int(w),"h":int(h),"col":col,"step":step,"rad":rad}
def tiles(items,r=18): return {"t":"tiles","r":r,"items":[{"x":int(a),"y":int(b),"w":int(c),"h":int(d),"col":e} for a,b,c,d,e in items]}
def frame(x,y,w,h,col,lw=1,inner=None):
    o={"t":"frame","x":int(x),"y":int(y),"w":int(w),"h":int(h),"col":col,"lw":lw}
    if inner:o["inner"]=inner
    return o
def otext(x,y,size,col,align="right",f="word",lw=3): return {"t":"otext","x":int(x),"y":int(y),"size":size,"col":col,"align":align,"f":f,"lw":lw}
def vtext(x,y,size,col,text=None,rot=-90,track=2):
    o={"t":"vtext","x":int(x),"y":int(y),"size":size,"col":col,"rot":rot,"track":track}
    if text is not None:o["text"]=text
    return o
def stamp(x,y,col,text,size=110,rot=-12,lw=9): return {"t":"stamp","x":int(x),"y":int(y),"col":col,"text":text,"size":size,"rot":rot,"lw":lw}
def play(x,y,r,col="#ffffff",bg="rgba(255,255,255,.18)"): return {"t":"play","x":int(x),"y":int(y),"r":r,"col":col,"bg":bg}
def poll(x,y,w,h,bg1,bg2,stroke,size=32): return {"t":"poll","x":int(x),"y":int(y),"w":int(w),"h":int(h),"bg1":bg1,"bg2":bg2,"stroke":stroke,"size":size,"max":2}
def lst(x,y,col,ncol,rh=96,mx=4,size=34,w=500,num=True,check=False,rule=None,x1=None,x2=None):
    o={"t":"list","x":int(x),"y":int(y),"col":col,"ncol":ncol,"rh":rh,"max":mx,"size":size,"w":w,"num":num}
    if check:o["check"]=True
    if rule:o["rule"]=rule
    if x1 is not None:o["x1"]=int(x1)
    if x2 is not None:o["x2"]=int(x2)
    return o
def steps(x,x1,y,n,at,col,linec): return {"t":"steps","x":int(x),"x1":int(x1),"y":int(y),"n":n,"at":at,"col":col,"line":linec}
def timeline(x,y,gap,n,at,col,linec): return {"t":"timeline","x":int(x),"y":int(y),"gap":gap,"n":n,"at":at,"col":col,"line":linec}
def counter(x,y,text,col,size=22,align="left"): return {"t":"counter","x":int(x),"y":int(y),"text":text,"col":col,"size":size,"align":align}
def swipe(x,y,col,text="החליקו"): return {"t":"swipe","x":int(x),"y":int(y),"col":col,"text":text}
def bars(x,y,col,size=30): return {"t":"bars","x":int(x),"y":int(y),"col":col,"size":size}
def spec(brand,i,name,theme,el,desc="",photo=True):
    return {"id":f"x_t_b2_{brand}_{i:02d}","name":name,"theme":theme,"el":el+[chrome()],"desc":desc,"ct":["project","construction","news","tip","data","quote","faq"],"st":["photo" if any(e["t"] in("photo","cphoto","pphoto") for e in el) else "clean","bold"]}
