from gen2_lib import *
import json

# ---------------- monday ----------------
def monday():
    P,G,Y,C,INK,BODY,WH,SOFT,LIL="#6161ff","#00ca72","#ffcc00","#fb275d","#323338","#676879","#ffffff","#f6f7fb","#ecefff"
    out=[]
    def chips(y,x=W-M):
        return [pill(x,y,G,WH,"בוצע",size=22),pill(x-170,y,Y,INK,"בעבודה",size=22),pill(x-360,y,C,WH,"תקוע",size=22)]
    def card(x,y,w,h,col=WH,r=24): return rect(x,y,w,h,col,r)
    # 1 chips + headline + photo card
    out.append(("שלושה סטטוסים ותמונה","light",[page(WH),*chips(170),head(W-M,260,96,INK,mx=2),card(M-8,560,W-2*M+16,650,LIL),photo(M+16,584,W-2*M-32,560,r=20),pill(W-M-24,1160,P,WH,size=22),sub(W-M-200,1176,30,BODY,maxW=560,mx=1)]))
    # 2 board rows
    rows=[]
    for i,c in enumerate([G,Y,C,P]):
        y=520+i*150;rows+= [card(M,y,W-2*M,124,WH,16),rect(M+20,y+22,120,80,c,12)]
    out.append(("לוח משימות","light",[page(SOFT),head(W-M,170,88,INK,mx=2),sub(W-M,420,32,BODY,mx=1),*rows,small("בוצע",W-M-30,600,28,INK),small("בעבודה",W-M-30,750,28,INK),small("ממתין",W-M-30,900,28,INK),small("הבא בתור",W-M-30,1050,28,INK)]))
    # 3 kanban
    cw=(W-2*M-40)//3
    cols=[]
    for i,c in enumerate([P,G,Y]):
        x=M+i*(cw+20);cols+=[rect(x,560,cw,54,c,14),card(x,640,cw,560,WH,16)]
    out.append(("שלוש עמודות","light",[page(SOFT),head(W-M,160,88,INK,mx=2),sub(W-M,410,30,BODY,mx=2),*cols,photo(M+2*(cw+20)+14,660,cw-28,300,r=12),pill(M+cw-24,680,G,WH,"בוצע",size=20),pill(M+cw+20+cw-24,680,Y,INK,"בעבודה",size=20)]))
    # 4 purple page
    out.append(("עמוד סגול","dark",[page(P),pill(W-M,160,G,WH,size=22),head(W-M,250,110,WH,mx=3),card(M,760,W-2*M,440,WH,24),photo(M+16,776,W-2*M-32,300,r=16),sub(W-M-24,1100,30,INK,maxW=700,mx=2)]))
    # 5 progress strip
    seg=(W-2*M-30)//4
    out.append(("רצועת התקדמות","light",[page(WH),photo(M,150,W-2*M,560,r=24),head(W-M,770,84,INK,mx=2),*[rect(M+i*(seg+10),1030,seg,22,c,11) for i,c in enumerate([G,G,Y,C])],sub(W-M,1090,30,BODY,mx=2)]))
    # 6 timeline dots
    tl=[line(W-M-60,560,W-M-60,1150,"#d0d4e4",3)]
    for i,c in enumerate([G,G,Y,P,C]): tl.append(marker(W-M-60,560+i*147,c,rad=18))
    out.append(("ציר זמן צבעוני","light",[page(WH),head(W-M,160,88,INK,mx=2),*tl,sub(W-M-120,540,32,INK,maxW=700,mx=6,lh=1.5)]))
    # 7 notification card over photo
    out.append(("כרטיס התראה","light",[page(SOFT),photo(M,130,W-2*M,1100,r=28,dim=.15),card(M+40,760,W-2*M-80,400,WH,22),rect(W-M-48,784,10,352,P,5),head(W-M-80,800,66,INK,maxW=760,mx=2),sub(W-M-80,990,28,BODY,maxW=760,mx=2),pill(M+70,1090,G,WH,"בוצע",align="left",size=20)]))
    # 8 checklist green checks
    out.append(("רשימת ביצוע","light",[page(WH),head(W-M,160,88,INK,mx=2),rect(M,440,W-2*M,720,SOFT,24),lst(W-M-30,480,INK,G,rh=120,mx=5,size=34,w=600,num=False,check=True)]))
    # 9 stuck vs done
    out.append(("תקוע מול בוצע","light",[page(WH),head(W-M,150,84,INK,mx=2),card(M,460,(W-2*M-20)//2,700,"#c81d47",24),card(M+(W-2*M-20)//2+20,460,(W-2*M-20)//2,700,G,24),small("תקוע",M+(W-2*M-20)//2-30,560,34,WH),small("בוצע",W-M-30,560,34,INK),sub(W-M-30,640,30,INK,maxW=400,mx=5,lh=1.4)]))
    # 10 purple block + yellow sticker
    out.append(("בלוק סגול ומדבקה","light",[page(WH),card(M,150,W-2*M,760,P,32),head(W-M-40,220,100,WH,maxW=840,mx=3),sticker(M+150,840,Y,INK,"חדש",rot=-8,size=34),sub(W-M,980,32,BODY,mx=2),*chips(1120)]))
    # 11 photo card with offset shadow + chips
    out.append(("כרטיס תמונה צף","light",[page(WH),rect(M+24,174,W-2*M,600,LIL,24),photo(M,150,W-2*M,600,r=24),*chips(800),head(W-M,890,84,INK,mx=2),sub(W-M,1120,30,BODY,mx=1)]))
    # 12 2x2 colour tiles
    tw=(W-2*M-24)//2
    out.append(("ארבעה אריחים","light",[page(LIL),head(W-M,150,84,INK,mx=2),tiles([(M,420,tw,360,P),(M+tw+24,420,tw,360,WH),(M,804,tw,360,WH),(M+tw+24,804,tw,360,G)],r=24),photo(M+tw+24,420,tw,360,r=24),sub(W-M-30,460,30,WH,maxW=tw-60,mx=5,lh=1.4)]))
    # 13 green page
    out.append(("עמוד ירוק","light",[page(G),head(W-M,180,110,INK,mx=3),sub(W-M,620,32,INK,mx=2),card(M,780,W-2*M,420,WH,24),photo(M+16,796,W-2*M-32,388,r=16)]))
    # 14 vertical status column
    out.append(("עמודת סטטוס","light",[page(WH),rect(M,150,60,1060,SOFT,30),rect(M,150,60,300,G,30),rect(M,470,60,240,Y,30),rect(M,730,60,200,C,30),rect(M,950,60,260,P,30),head(W-M,180,88,INK,maxW=760,mx=3),sub(W-M,560,30,BODY,maxW=760,mx=3),photo(M+120,760,W-2*M-120,440,r=20)]))
    # 15 big done check
    out.append(("וי ירוק גדול","light",[page(WH),marker(W/2,420,G,rad=130),head(W/2,640,88,INK,align="center",mx=2),sub(W/2,880,30,BODY,align="center",mx=2),pill(W/2,1020,P,WH,size=24,align="center")]))
    # 16 ink page with colour chips
    out.append(("כהה עם צ'יפים","dark",[page(INK),*chips(160),head(W-M,260,100,WH,mx=3),photo(M,760,W-2*M,440,r=24),]))
    # 17 yellow label band
    out.append(("רצועה צהובה","light",[page(WH),rect(0,0,W,300,Y),head(W-M,330,88,INK,mx=2),sub(W-M,580,30,BODY,mx=2),card(M,700,W-2*M,500,SOFT,24),photo(M+16,716,W-2*M-32,468,r=16)]))
    # 18 split: photo left, text right with purple rule
    out.append(("חצי תמונה חצי לוח","light",[page(WH),photo(0,0,520,H,r=0),rect(560,150,8,900,P,4),head(W-M,180,76,INK,maxW=400,mx=4),sub(W-M,560,28,BODY,maxW=400,mx=4),pill(W-M,760,G,WH,"בוצע",size=20),pill(W-M-150,760,Y,INK,"בעבודה",size=20)]))
    # 19 three number-less KPI tiles (labels from post sub via list)
    out.append(("שלושה כרטיסי מידע","light",[page(SOFT),head(W-M,150,84,INK,mx=2),card(M,420,W-2*M,760,WH,24),rect(M,420,W-2*M,16,P,8),lst(W-M-30,470,INK,P,rh=160,mx=4,size=36,w=600)]))
    # 20 coral alert card
    out.append(("כרטיס קורל","light",[page(WH),photo(M,150,W-2*M,620,r=24),card(M,820,W-2*M,380,"#c81d47",24),head(W-M-30,860,68,WH,maxW=840,mx=2),sub(W-M-30,1040,28,WH,maxW=840,mx=2)]))
    # 21 lilac page, round photo, chips
    out.append(("תמונה עגולה וצ'יפים","light",[page(LIL),cphoto(W/2,420,250,stroke=P,sw=10),head(W/2,720,84,INK,align="center",mx=2),*[pill(W/2+150-i*170,980,c,WH if c!=Y else INK,t,align="left",size=22) for i,(c,t) in enumerate([(G,"בוצע"),(Y,"בעבודה"),(C,"תקוע")])]]))
    # 22 board with photo thumb rows
    rws=[]
    for i,c in enumerate([P,G,Y]):
        y=480+i*230;rws+=[card(M,y,W-2*M,200,WH,18),photo(M+20,y+20,200,160,s=i%3,r=12),rect(W-M-150,y+70,120,60,c,12)]
    out.append(("שורות עם תמונות","light",[page(SOFT),head(W-M,150,84,INK,mx=2),*rws]))
    # 23 purple header band with white card
    out.append(("כותרת על סגול","light",[page(WH),rect(0,0,W,520,P),head(W-M,170,92,WH,mx=3),card(M,440,W-2*M,760,WH,24),photo(M+16,456,W-2*M-32,520,r=16),sub(W-M-24,1010,30,INK,maxW=800,mx=3)]))
    # 24 dot grid bg + headline + green pill
    out.append(("רשת נקודות","light",[page(WH),dots(M,150,W-2*M,1050,"#d9ddf5",step=36,rad=3),card(M+60,300,W-2*M-120,760,WH,28),head(W-M-100,360,80,INK,maxW=760,mx=3),pill(W-M-100,740,G,WH,size=24),sub(W-M-100,860,30,BODY,maxW=760,mx=3)]))
    # 25 poll
    out.append(("סקר מאנדיי","light",[page(WH),head(W-M,160,88,INK,mx=2),poll(M,520,W-2*M,120,P,WH,P,size=34),photo(M,840,W-2*M,360,r=24)]))
    # 26 steps strip
    out.append(("שלבים על קו","light",[page(SOFT),head(W-M,160,84,INK,mx=2),steps(M+40,W-M-40,560,5,3,P,"#d0d4e4"),card(M,700,W-2*M,500,WH,24),photo(M+16,716,W-2*M-32,468,r=16)]))
    # 27 yellow sticker on photo, white page
    out.append(("מדבקה על תמונה","light",[page(WH),photo(M,150,W-2*M,700,r=24,fade=[0,.55]),sticker(W-M-140,210,Y,INK,"בעבודה",rot=-6,size=34),head(W-M-30,640,72,WH,maxW=820,mx=2),sub(W-M,930,30,BODY,mx=2),*chips(1080)]))
    # 28 two-tone split purple/white diagonal-ish (rect)
    out.append(("סגול ולבן","light",[page(WH),rect(0,0,W,700,P,0),head(W-M,180,100,WH,mx=3),photo(M,640,W-2*M,560,r=24,stroke=WH,sw=10)]))
    return [spec("monday",i+1,n,t,e) for i,(n,t,e) in enumerate(out)]

# ---------------- canva ----------------
def canva():
    T,B,P,INK,GR,WH,SOFT,MINT="#07b9ce","#3969e7","#7d2ae7","#0e1318","#5e6b74","#ffffff","#f2f3f5","#e6f8fa"
    out=[]
    G=lambda x,y,w,h,d=None:grad(x,y,w,h,T,P,d)
    out.append(("גרדיאנט מלא וכרטיס","dark",[G(0,0,W,H),rect(M,420,W-2*M,760,WH,28),photo(M+20,440,W-2*M-40,420,r=20),head(W-M-30,900,66,INK,maxW=820,mx=2),sub(W-M-30,1060,28,GR,maxW=820,mx=2),label(W-M,170,26,WH)]))
    out.append(("רצועת גרדיאנט עליונה","light",[page(WH),G(0,0,W,420,"h"),head(W-M,470,88,INK,mx=2),sub(W-M,720,30,GR,mx=2),photo(M,830,W-2*M,380,r=24)]))
    out.append(("תמונה מעוגלת ותג מסובב","light",[page(WH),photo(M,150,W-2*M,760,r=32),sticker(M+120,200,P,WH,"חדש",rot=-10,size=34),head(W-M,960,84,INK,mx=2),sub(W-M,1150,28,GR,mx=1)]))
    out.append(("שלושה כרטיסים צבעוניים","light",[page(SOFT),head(W-M,150,84,INK,mx=2),*[rect(M,420+i*260,W-2*M,230,WH,22) for i in range(3)],*[rect(W-M-16,420+i*260,16,230,c,8) for i,c in enumerate([T,B,P])],lst(W-M-50,450,INK,B,rh=260,mx=3,size=36,w=600,num=False)]))
    out.append(("ריבוע גרדיאנט מאחורי כותרת","light",[page(WH),grad(120,220,840,760,T,P),head(W/2,340,96,WH,align="center",mx=3,maxW=760),sub(W/2,1060,30,GR,align="center",mx=2)]))
    out.append(("כפתורי פילס","light",[page(WH),photo(M,150,W-2*M,620,r=28),head(W-M,820,80,INK,mx=2),pill(W-M,1080,T,WH,"עיצוב",size=24),pill(W-M-170,1080,B,WH,"תכנון",size=24),pill(W-M-340,1080,P,WH,"בנייה",size=24)]))
    out.append(("פולארויד עם סרט","light",[page(MINT),rect(140,150,800,900,WH,8),photo(170,180,740,700,r=4),rect(430,120,220,50,P,6,a=.9),sub(W/2,920,30,INK,align="center",maxW=700,mx=2),head(W/2,1070,70,INK,align="center",mx=2)]))
    out.append(("מסגרת גרדיאנט","dark",[G(0,0,W,H),rect(40,40,W-80,H-80,WH,24),head(W-M-20,180,92,INK,maxW=860,mx=3),photo(M+20,600,W-2*M-40,560,r=20)]))
    out.append(("ציטוט עם גרש טורקיז","light",[page(WH),small("”",W-M,330,260,P,w=900),head(W-M,400,80,INK,mx=3),line(M,860,W-M,860,T,4),sub(W-M,900,30,GR,mx=2)]))
    tw=(W-2*M-24)//2
    out.append(("רשת אריחים עם אריח גרדיאנט","light",[page(WH),head(W-M,150,80,INK,mx=2),photo(M,420,tw,380,r=24),G(M+tw+24,420,tw,380),photo(M,824,tw,380,s=1,r=24),rect(M+tw+24,824,tw,380,MINT,24),sub(M+tw+24+tw-30,860,28,INK,maxW=tw-60,mx=5,lh=1.4)]))
    out.append(("כרטיס לבן על גרדיאנט אופקי","dark",[G(0,0,W,H,"h"),rect(M,150,W-2*M,1050,WH,32),label(W-M-30,200,24,P),head(W-M-30,250,90,INK,maxW=820,mx=3),photo(M+30,700,W-2*M-60,470,r=20)]))
    out.append(("טורקיז מלא","light",[page(T),head(W-M,180,110,INK,mx=3),rect(M,720,W-2*M,480,WH,28),photo(M+20,740,W-2*M-40,440,r=20)]))
    out.append(("סגול מלא ותמונה עגולה","dark",[page(P),cphoto(W/2,460,260,stroke=WH,sw=12),head(W/2,780,84,WH,align="center",mx=2),sub(W/2,1020,30,WH,align="center",mx=2)]))
    out.append(("שתי מדבקות","light",[page(WH),photo(M,150,W-2*M,700,r=28,fade=[0,.5]),sticker(W-M-120,220,T,WH,"טיפ",rot=-8,size=34),sticker(M+140,780,P,WH,"שמרו",rot=6,size=30),head(W-M,900,80,INK,mx=2),sub(W-M,1120,28,GR,mx=1)]))
    out.append(("כותרת בכחול ופס גרדיאנט","light",[page(WH),head(W-M,170,96,B,mx=3),G(M,620,W-2*M,16,"h"),sub(W-M,680,32,INK,mx=2),photo(M,820,W-2*M,380,r=24)]))
    out.append(("מינט עם כרטיס תמונה","light",[page(MINT),rect(M,150,W-2*M,1050,WH,32),photo(M+24,174,W-2*M-48,560,r=24),pill(W-M-40,770,T,WH,size=22),head(W-M-40,840,70,INK,maxW=800,mx=2),sub(W-M-40,1030,28,GR,maxW=800,mx=2)]))
    out.append(("מילה ענקית בקו גרדיאנט","light",[page(WH),otext(W-M,330,260,P),head(W-M,620,80,INK,mx=2),sub(W-M,860,30,GR,mx=2),photo(M,1000,W-2*M,200,r=18)]))
    out.append(("חצי גרדיאנט אנכי","light",[page(WH),G(0,0,440,H),photo(500,150,W-500-M,620,r=24),head(W-M,820,76,INK,maxW=500,mx=3),sub(W-M,1090,28,GR,maxW=500,mx=2)]))
    out.append(("רשימה עם מספרים סגולים","light",[page(WH),head(W-M,160,84,INK,mx=2),rect(M,430,W-2*M,760,SOFT,28),lst(W-M-30,470,INK,P,rh=130,mx=5,size=34,w=600)]))
    out.append(("סקר קאנבה","light",[page(MINT),head(W-M,160,84,INK,mx=2),poll(M,520,W-2*M,120,B,WH,B,size=34),photo(M,840,W-2*M,360,r=24)]))
    out.append(("תמונה מלאה עם כרטיס","dark",[photo(0,0,W,H,fade=[.05,.75]),rect(M,860,W-2*M,340,WH,24),head(W-M-30,900,64,INK,maxW=820,mx=2),pill(M+100,1110,P,WH,size=20,align="left")]))
    out.append(("כותרת ממורכזת ושלוש נקודות","light",[page(WH),head(W/2,300,96,INK,align="center",mx=3),*[marker(W/2-80+i*80,760,c,rad=22) for i,c in enumerate([T,B,P])],sub(W/2,860,30,GR,align="center",mx=2),photo(M,1000,W-2*M,200,r=18)]))
    out.append(("שני צילומים ותג","light",[page(WH),photo(M,150,(W-2*M-20)//2,560,r=22),photo(M+(W-2*M-20)//2+20,150,(W-2*M-20)//2,560,s=1,r=22),tag(W-M,760,P,size=22),head(W-M,820,80,INK,mx=2),sub(W-M,1060,28,GR,mx=2)]))
    out.append(("גרדיאנט תחתון","light",[page(WH),head(W-M,170,92,INK,mx=3),G(0,700,W,650),rect(M,760,W-2*M,440,WH,24),photo(M+16,776,W-2*M-32,408,r=16)]))
    out.append(("מסגרת מעוגלת כפולה","light",[page(WH),rect(40,40,W-80,H-80,MINT,40),rect(90,90,W-180,H-180,WH,30),head(W-M-40,220,84,INK,maxW=780,mx=3),photo(M+60,640,W-2*M-120,500,r=20)]))
    out.append(("כחול עמוק","dark",[page(B),label(W-M,170,26,WH),head(W-M,230,104,WH,mx=3),sub(W-M,700,32,WH,mx=2),photo(M,880,W-2*M,320,r=24)]))
    return [spec("canva",i+1,n,t,e) for i,(n,t,e) in enumerate(out)]

# ---------------- tiktok ----------------
def tiktok():
    K,INK,PK,CY,WH,GR="#000000","#121212","#fe2c55","#25f4ee","#ffffff","#8a8b91";PD="#d4103e"
    out=[]
    def chroma(x,y,size,mx=3,align="right",maxW=None):
        # cyan and pink offsets behind white text
        return [head(x-7,y-4,size,CY,maxW=maxW,mx=mx,align=align,w=900,shadow=True),head(x+7,y+4,size,PK,maxW=maxW,mx=mx,align=align,w=900,shadow=True),head(x,y,size,WH,maxW=maxW,mx=mx,align=align,w=900)]
    out.append(("צילום מלא וכתוביות","dark",[photo(0,0,W,H,fade=[.1,.85],rgb="0,0,0"),caption(W-M,820,64,WH,INK,mx=3),caption(W-M,1120,32,PD,WH,f="sub",mx=1)]))
    out.append(("כותרת כרומטית על שחור","dark",[page(K),*chroma(W-M,300,120),sub(W-M,900,32,GR,mx=2),rect(M,1080,W-2*M,8,CY,4)]))
    out.append(("קופסה לבנה עם הדגשה ורודה","dark",[page(K),photo(M,150,W-2*M,620,r=16),caption(W-M,840,64,WH,INK,mx=3,hiAt=1,hiBg=PD,hiFg=WH)]))
    out.append(("חלק 1 מתוך 3","dark",[photo(0,0,W,H,fade=[.2,.8],rgb="0,0,0"),sticker(W-M-120,210,PK,WH,"חלק 1 מתוך 3",rot=-5,size=30),caption(W-M,900,66,WH,INK,mx=3)]))
    out.append(("מילים ענקיות על שחור","dark",[page(K),frame(40,40,W-80,H-80,CY,2),head(W-M-20,200,150,WH,maxW=900,mx=3,lh=1.0,w=900),sub(W-M-20,1000,32,CY,maxW=900,mx=2)]))
    out.append(("מסגרת טורקיז מוטה","dark",[page(K),pphoto([(120,180),(960,140),(1000,920),(80,960)],s=0),pill(W-M,1000,PK,WH,size=24),head(W-M,1060,64,WH,mx=2)]))
    out.append(("לפני ואחרי עם קו ורוד","dark",[page(K),photo(0,0,W/2-6,880,s=1,mono=True),photo(W/2+6,0,W/2-6,880),rect(W/2-6,0,12,880,PK),caption(W-M,940,64,WH,INK,mx=2),small("לפני",M+30,80,30,WH,align="left"),small("אחרי",W-M,80,30,WH)]))
    out.append(("בועת תגובה","dark",[photo(0,0,W,H,dim=.4),rect(M,760,W-2*M,380,WH,28),small("“",W-M-30,860,120,PK,w=900),head(W-M-120,800,64,INK,maxW=740,mx=3),pill(M+100,1070,PK,WH,size=20,align="left")]))
    out.append(("כפתור נגן ופס התקדמות","dark",[photo(0,0,W,H,dim=.45),play(W/2,560,90),rect(M,1180,W-2*M,8,"rgba(255,255,255,.3)",4),rect(M,1180,(W-2*M)*.38,8,PK,4),caption(W-M,860,64,WH,INK,mx=3)]))
    out.append(("מילה אחת לבנה","dark",[page(K),otext(W-M,330,300,WH,lw=0),head(W-M,700,88,PK,mx=2),sub(W-M,1000,30,GR,mx=2)]))
    out.append(("כתוביות ממורכזות","dark",[photo(0,0,W,H,fade=[.3,.7],rgb="0,0,0"),caption(W/2,520,72,WH,INK,align="center",mx=4),counter(M,H-150,"1/5",WH,size=24)]))
    out.append(("טורקיז מלא","dark",[page(CY),head(W-M,200,120,K,mx=3,w=900),rect(M,760,W-2*M,440,K,20),photo(M+14,774,W-2*M-28,412,r=12)]))
    out.append(("ורוד מלא","dark",[page(PD),head(W-M,200,120,WH,mx=3,w=900),photo(M,760,W-2*M,440,r=20),sticker(M+140,760,K,WH,"צפו עד הסוף",rot=5,size=28)]))
    out.append(("כתובית שחורה על תמונה בהירה","dark",[photo(0,0,W,H),caption(W-M,160,64,K,WH,mx=3,r=6),caption(W-M,1080,32,PD,WH,f="sub",mx=1,r=6)]))
    out.append(("פס ורוד אנכי","dark",[page(K),rect(W-M-14,150,14,1000,PK),photo(M,150,W-2*M-80,560,r=12),head(W-M-60,760,80,WH,maxW=840,mx=3),sub(W-M-60,1080,30,CY,maxW=840,mx=1)]))
    out.append(("שתי מדבקות","dark",[photo(0,0,W,H,fade=[.1,.8],rgb="0,0,0"),sticker(W-M-100,200,CY,K,"חדש",rot=-8,size=34),sticker(M+160,260,WH,K,"שאלה",rot=7,size=30),caption(W-M,900,64,WH,INK,mx=3)]))
    out.append(("רשת נקודות טורקיז","dark",[page(K),dots(M,150,W-2*M,1050,"rgba(37,244,238,.25)",step=34,rad=2.5),rect(M+40,420,W-2*M-80,500,K,0),*chroma(W-M-60,460,100,mx=3,maxW=840),pill(W-M-60,1000,PK,WH,size=24)]))
    out.append(("תמונה מעוגלת קטנה","dark",[page(K),cphoto(W-M-200,360,200,stroke=PK,sw=8),head(W-M,620,96,WH,mx=3),sub(W-M,1060,30,CY,mx=2)]))
    out.append(("כותרת כרומטית על תמונה","dark",[photo(0,0,W,H,dim=.55),*chroma(W/2,460,110,mx=3,align="center",maxW=W-2*M),caption(W/2,1040,30,PD,WH,f="sub",align="center",mx=1)]))
    out.append(("רשימת טיקטוק","dark",[page(K),head(W-M,160,88,WH,mx=2),lst(W-M,440,WH,PK,rh=130,mx=5,size=36,w=700)]))
    out.append(("סקר שחור","dark",[page(K),caption(W-M,180,70,WH,INK,mx=2),poll(M,620,W-2*M,120,PK,K,CY,size=34),photo(M,900,W-2*M,300,r=16)]))
    out.append(("חצי שחור חצי תמונה","dark",[page(K),photo(W/2,0,W/2,H),head(W/2-M,200,84,WH,maxW=W/2-2*M,mx=4),sub(W/2-M,800,30,CY,maxW=W/2-2*M,mx=3)]))
    out.append(("כתובית ורודה גדולה","dark",[photo(0,0,W,H,fade=[.0,.7],rgb="0,0,0"),caption(W-M,700,76,PD,WH,mx=3,lh=1.22),caption(W-M,1080,30,WH,INK,f="sub",mx=1)]))
    out.append(("מספר חלק בצד","dark",[page(K),vtext(60,700,40,CY,text="חלק 2"),photo(160,150,W-160-M,700,r=12),head(W-M,900,76,WH,maxW=760,mx=3)]))
    out.append(("מסגרת ורודה","dark",[page(K),frame(60,60,W-120,H-120,PK,8),head(W-M-30,220,100,WH,maxW=840,mx=3),photo(M+40,660,W-2*M-80,500,r=8)]))
    out.append(("זום על פרט","dark",[photo(0,0,W,H,dim=.3),cphoto(W/2,520,240,s=1,stroke=CY,sw=10),caption(W/2,860,64,WH,INK,align="center",mx=3)]))
    out.append(("כותרת ענקית בתחתית","dark",[photo(0,0,W,H,fade=[0,.9],rgb="0,0,0"),head(W-M,820,120,WH,mx=3,w=900,lh=0.98),rect(M,1180,200,10,PK,5)]))
    return [spec("tiktok",i+1,n,t,e) for i,(n,t,e) in enumerate(out)]

# ---------------- apple ----------------
def apple():
    WH,OFF,K,INK,GR,BL="#ffffff","#f5f5f7","#000000","#1d1d1f","#6e6e73","#0071e3"
    out=[]
    out.append(("כותרת למעלה, מוצר במרכז","light",[page(WH),head(W/2,170,96,INK,align="center",mx=2,w=700),sub(W/2,420,30,GR,align="center",mx=1),photo(180,560,720,620,r=28)]))
    out.append(("שחור, כותרת לבנה, אובייקט קטן","dark",[page(K),head(W/2,200,110,WH,align="center",mx=2,w=700),sub(W/2,520,30,"#a1a1a6",align="center",mx=1),photo(300,700,480,480,r=24)]))
    out.append(("תמונה גולשת מהקצה","light",[page(OFF),head(W/2,180,100,INK,align="center",mx=2,w=700),photo(120,560,840,800,r=36)]))
    out.append(("שתי מילים ענקיות","light",[page(OFF),head(W/2,300,150,INK,align="center",mx=2,w=700,lh=1.0),photo(240,760,600,440,r=28)]))
    out.append(("משפט אחד","light",[page(WH),head(W/2,480,100,INK,align="center",mx=3,w=700,lh=1.08),sub(W/2,980,30,GR,align="center",mx=1)]))
    out.append(("צילום מלא, כותרת לבנה","dark",[photo(0,0,W,H,dim=.25),head(W/2,560,96,WH,align="center",mx=3,w=700)]))
    out.append(("כותרת, קו דק, שורה אפורה","light",[page(WH),head(W-M,220,96,INK,mx=3,w=700),line(M,720,W-M,720,"#d2d2d7",1),sub(W-M,760,30,GR,mx=2)]))
    out.append(("חצי תמונה, חצי אוויר","light",[page(WH),photo(0,0,480,H),head(W-M,360,84,INK,maxW=460,mx=4,w=700),sub(W-M,900,28,GR,maxW=460,mx=2)]))
    out.append(("אפור בהיר, אובייקט מעוגל","light",[page(OFF),photo(140,150,800,700,r=40),head(W/2,930,80,INK,align="center",mx=2,w=700),sub(W/2,1140,28,GR,align="center",mx=1)]))
    out.append(("שחור עם קישור כחול","dark",[page(K),head(W/2,420,110,WH,align="center",mx=3,w=700),small("לפרטים",W/2,900,30,"#2997ff",align="center")]))
    out.append(("כותרת שמאלית על לבן","light",[page(WH),head(W-M,200,90,INK,mx=3,w=700),photo(M,620,W-2*M,560,r=24)]))
    out.append(("אובייקט קטן מאוד","light",[page(WH),cphoto(W/2,440,180),head(W/2,700,84,INK,align="center",mx=2,w=700),sub(W/2,940,28,GR,align="center",mx=1)]))
    out.append(("שחור, תמונה למעלה","dark",[page(K),photo(M,150,W-2*M,600,r=28),head(W/2,820,84,WH,align="center",mx=2,w=700),sub(W/2,1060,28,"#a1a1a6",align="center",mx=1)]))
    out.append(("כותרת דקה ענקית","light",[page(OFF),head(W/2,360,130,INK,align="center",mx=2,w=500,lh=1.0),sub(W/2,900,32,GR,align="center",mx=1)]))
    out.append(("תמונה בפינה תחתונה","light",[page(WH),head(W-M,200,96,INK,mx=3,w=700),photo(0,760,620,590,r=0)]))
    out.append(("שחור, אובייקט שמאלי","dark",[page(K),photo(0,0,540,H),head(W-M,400,80,WH,maxW=420,mx=4,w=700)]))
    out.append(("כותרת ממורכזת בין שני צילומים","light",[page(WH),photo(M,150,W-2*M,360,r=20),head(W/2,580,80,INK,align="center",mx=2,w=700),photo(M,860,W-2*M,340,s=1,r=20)]))
    out.append(("לבן, כותרת תחתונה","light",[page(WH),photo(140,120,800,760,r=32),head(W/2,960,84,INK,align="center",mx=2,w=700),sub(W/2,1160,28,GR,align="center",mx=1)]))
    out.append(("אפור, כותרת ימנית, אוויר","light",[page(OFF),head(W-M,560,96,INK,mx=3,w=700),sub(W-M,1000,30,GR,mx=1)]))
    out.append(("שחור, מילה אחת","dark",[page(K),otext(W/2,400,300,WH,align="center",lw=0),head(W/2,760,80,WH,align="center",mx=2,w=700),sub(W/2,1000,28,"#a1a1a6",align="center",mx=1)]))
    out.append(("תמונה ברוחב מלא במרכז","light",[page(WH),head(W/2,170,88,INK,align="center",mx=2,w=700),photo(0,440,W,620),sub(W/2,1120,28,GR,align="center",mx=1)]))
    out.append(("שחור, קו כחול דק","dark",[page(K),head(W-M,240,100,WH,mx=3,w=700),line(W-M-200,760,W-M,760,BL,3),sub(W-M,800,30,"#a1a1a6",mx=2)]))
    out.append(("ריבוע תמונה ושורה אחת","light",[page(OFF),photo(240,200,600,600,r=24),head(W/2,880,76,INK,align="center",mx=2,w=700)]))
    out.append(("כותרת על תמונה בהירה","light",[photo(0,0,W,H,fade=[.75,.0],rgb="255,255,255"),head(W/2,180,96,INK,align="center",mx=2,w=700),sub(W/2,420,28,GR,align="center",mx=1)]))
    out.append(("שלוש שורות קצרות","light",[page(WH),head(W/2,300,120,INK,align="center",mx=3,w=700,lh=1.05),small("לפרטים",W/2,1000,30,BL,align="center")]))
    return [spec("apple",i+1,n,t,e) for i,(n,t,e) in enumerate(out)]

if __name__=="__main__":
    import sys
    for fn in (monday,canva,tiktok,apple):
        s=fn();json.dump(s,open(f"canva/author2/{fn.__name__}.json","w"),ensure_ascii=False)
        print(fn.__name__,len(s))
