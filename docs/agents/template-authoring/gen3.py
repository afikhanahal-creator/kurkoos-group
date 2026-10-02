# Round 3: post genres of the big Israeli developers, in the Kurkoos palette and font.
# Evidence per family is in brands3.json (press coverage of what each company publishes).
from gen2_lib import *
import json
NV,RD,TL,MS,PL,PP,WH,IK,SL="#07293a","#a90b0c","#105572","#8fb6c8","#dbe8ee","#f4f6f8","#ffffff","#0b1f2a","#35505e"
L2=W-2*M
def specs3(x,y,w,n=3,size=96,col=WH,lcol=MS,rule="rgba(143,182,200,0.4)",lsize=22): return {"t":"specs","x":int(x),"w":int(w),"y":int(y),"n":n,"size":size,"col":col,"lcol":lcol,"rule":rule,"lsize":lsize}
def stat(x,y,size,col,align="right",maxW=600,w=900): return {"t":"stat","x":int(x),"y":int(y),"size":size,"w":w,"col":col,"align":align,"maxW":int(maxW)}
def dimline(x1,x2,y,size,col,vcol,bg,ucol=None):
    o={"t":"dimline","x1":int(x1),"x2":int(x2),"y":int(y),"size":size,"col":col,"vcol":vcol,"bg":bg}
    if ucol:o["ucol"]=ucol
    return o
def tape(x1,y1,x2,y2,h=86,size=60,bg=PP,vbg=RD,at=.5): return {"t":"tape","x1":int(x1),"y1":int(y1),"x2":int(x2),"y2":int(y2),"h":h,"size":size,"bg":bg,"vbg":vbg,"at":at}
def roster(x,y,gap,mx,size,col,rule,x1,acc=RD,icol=NV): return {"t":"roster","x":int(x),"y":int(y),"gap":gap,"max":mx,"size":size,"col":col,"rule":rule,"x1":int(x1),"acc":acc,"icol":icol}
def ledger(x,y,mx,nsize,size,ncol,col,rule): return {"t":"ledger","x":int(x),"y":int(y),"max":mx,"nsize":nsize,"size":size,"ncol":ncol,"col":col,"rule":rule}
def levels(x,y,w,gap,mx,col,acc,size): return {"t":"levels","x":int(x),"y":int(y),"w":int(w),"gap":gap,"max":mx,"col":col,"acc":acc,"size":size}
def tblock(x,y,w,h,col=NV,bg=PP): return {"t":"tblock","x":int(x),"y":int(y),"w":int(w),"h":int(h),"col":col,"bg":bg}
def siteboard(x,y,w,h,legs=0): return {"t":"siteboard","x":int(x),"y":int(y),"w":int(w),"h":int(h),"legs":legs}
def clipboard(x,y,w,h,size=60): return {"t":"clipboard","x":int(x),"y":int(y),"w":int(w),"h":int(h),"size":size}
def redmark(x,y,r,col=RD,lw=8,arrow=True): return {"t":"redmark","x":int(x),"y":int(y),"r":int(r),"col":col,"lw":lw,"arrow":arrow}
def linehouse(x,y,s,col,lw=7,acc=RD): return {"t":"linehouse","x":int(x),"y":int(y),"s":s,"col":col,"lw":lw,"acc":acc}
def housewin(x,y,w,h,roof,s=0,stroke=None,lw=8,dim=None):
    o={"t":"housewin","x":int(x),"y":int(y),"w":int(w),"h":int(h),"roof":int(roof),"s":s,"lw":lw}
    if stroke:o["stroke"]=stroke
    if dim:o["dim"]=dim
    return o
def progress(x,y,w,h,col,track,size,lcol): return {"t":"progress","x":int(x),"y":int(y),"w":int(w),"h":int(h),"col":col,"track":track,"size":size,"lcol":lcol}
def cta(text,x,y,bg,fg,align="right",size=28,w=280,icon="arrow"): return {"t":"cta","text":text,"x":int(x),"y":int(y),"align":align,"size":size,"bg":bg,"icon":icon,"fg":fg,"w":w}
def dropcap(x,y,size,col,bsize,mx,bcol,maxW): return {"t":"dropcap","x":int(x),"y":int(y),"size":size,"col":col,"bsize":bsize,"max":mx,"bcol":bcol,"maxW":int(maxW)}
def gridlines(cols,rows,col,lw=1,y=0,y2=1262): return {"t":"gridlines","cols":cols,"rows":rows,"col":col,"lw":lw,"y":y,"y2":y2}
def credits(x,y,size,col,lcol,gap=46,lsize=24): return {"t":"credits","x":int(x),"y":int(y),"size":size,"col":col,"lcol":lcol,"gap":gap,"lsize":lsize}
def frame2(col,b,bottom=0): return {"t":"frame2","col":col,"b":b,"bottom":bottom}
def ring(x,y,r,lw,col,track,ncol,size): return {"t":"ring","x":int(x),"y":int(y),"r":int(r),"lw":lw,"col":col,"track":track,"ncol":ncol,"size":size}
def stepsL(x,x1,y,labels,at,col,linec,bg=None):
    o={"t":"steps","x":int(x),"x1":int(x1),"y":int(y),"n":len(labels),"at":at,"col":col,"line":linec,"labels":labels}
    if bg:o["bg"]=bg
    return o
def spec3(brand,i,name,theme,el,desc=""):
    return {"id":f"x_t_b3_{brand}_{i:02d}","name":name,"theme":theme,"el":el+[chrome()],"desc":desc,"ct":["project","construction","news","tip","data","quote","faq"],"st":["photo" if any(e["t"] in("photo","cphoto","pphoto","housewin") for e in el) else "clean","bold"]}

OUT={}
def fam(brand,items):
    OUT[brand]=[spec3(brand,i+1,n,t,el,d) for i,(n,t,el,d) in enumerate(items)]

# ---------------- afi · אפריקה ישראל מגורים ----------------
# Genres: sub brand series ("סביוני"), payment path campaigns, regional project pages, populated projects, 70 year heritage.
def afi():
    it=[]
    # 1 series badge + launch card
    it.append(("סדרה · יוצא לשיווק",'light',[page(WH),rect(0,0,W,16,RD),pill(W-M,150,RD,WH,"יוצא לשיווק",size=24),photo(M,230,L2,560,r=0),rect(M,790,L2,10,NV),head(W-M,850,80,NV,mx=2),sub(W-M,1060,30,SL,mx=2)],"פס אדום עליון, תג השקה, צילום רחב וכותרת מתחת. כמו פוסט השקה של סדרת פרויקטים."))
    # 2 payment path: three labelled stages, no numbers
    it.append(("מסלול · חתימה, בנייה, מסירה",'light',[page(PP),head(W-M,150,84,NV,mx=2),sub(W-M,380,30,SL,mx=2),rect(M,540,L2,520,WH,0),rect(M,540,L2,12,RD),stepsL(M+60,W-M-60,700,["חתימה","תכנון","בנייה","מסירה"],2,RD,PL,bg=WH),label(W-M-40,900,24,SL),photo(M,1090,L2,150,r=0)],"מסלול הרכישה בארבעה שלבים מסומנים, בלי מספרים, בכרטיס לבן על רקע נייר."))
    # 3 regional page: city tag over photo + list
    it.append(("פרויקטים בעיר · תג ורשימה",'dark',[photo(0,0,W,760,fade=[0,.6],rgb="7,41,58"),rect(0,760,W,590,NV),tag(W-M,170,WH,None,"right",24),head(W-M,560,76,WH,mx=2),lst(W-M,820,WH,MS,rh=96,mx=4,size=34,w=600,num=False,rule="rgba(143,182,200,0.3)",x1=M,x2=W-M)],"תג עיר על הצילום, כותרת על הדהייה ורשימת פרויקטים באזור על כחול."))
    # 4 populated projects: three photo grid
    it.append(("מאוכלסים · שלוש תמונות",'light',[page(WH),head(W-M,140,72,NV,mx=2),photo(M,380,L2,440,s=0),photo(M,840,(L2-20)//2,330,s=1),photo(M+(L2-20)//2+20,840,(L2-20)//2,330,s=2),rect(M,840,(L2-20)//2,8,RD),label(W-M,1210,24,SL)],"גלריית מאוכלסים: תמונה רחבה ושתי קטנות, פס אדום אחד."))
    # 5 heritage: mono photo, white caption, series label
    it.append(("מורשת · מונו וכיתוב",'dark',[photo(0,0,W,H,mono=True,fade=[0,.55],rgb="11,31,42"),label(W-M,620,26,MS),caption(W-M,680,66,WH,NV,mx=3,lh=1.22),sub(W-M,1070,28,WH,mx=2)],"צילום שחור לבן, תווית קטנה, כותרת בקופסאות לבנות. פוסט ותק ומסורת."))
    # 6 red slab bottom with white headline, photo top
    it.append(("צילום למעלה, בלוק אדום",'light',[page(WH),photo(0,0,W,720),rect(0,720,W,630,RD),head(W-M,790,78,WH,mx=3),sub(W-M,1100,28,WH,mx=2)],"החלוקה הקלאסית של היזם הגדול: צילום מעל בלוק צבע כבד עם כותרת לבנה."))
    # 7 navy page, two rows of specs (numbers from the post only)
    it.append(("נתוני פרויקט על כחול",'dark',[page(NV),label(W-M,150,24,MS),head(W-M,200,84,WH,mx=3),specs3(M,700,L2,3,96,WH,MS),sub(W-M,1040,28,MS,mx=2)],"כותרת וכרטיסי מספרים. המספרים מגיעים מהפוסט בלבד."))
    # 8 diagonal cut photo + headline
    it.append(("חיתוך אלכסוני",'light',[page(WH),pphoto([[0,0],[W,0],[W,620],[0,760]],s=0,dim=.1),head(W-M,820,84,NV,mx=2),rect(W-M-180,1050,180,10,RD),sub(W-M,1090,30,SL,mx=2)],"צילום שנחתך באלכסון מעל כותרת כחולה וקו אדום קצר."))
    # 9 series card: white card with red corner over photo
    it.append(("כרטיס סדרה על צילום",'dark',[photo(0,0,W,H,dim=.3),rect(M,640,L2,540,WH),rect(M,640,120,12,RD),head(W-M-36,700,66,NV,maxW=L2-72,mx=3),sub(W-M-36,1000,28,SL,maxW=L2-72,mx=2)],"כרטיס לבן צף על הצילום עם פינה אדומה, בסגנון הכרטיסים של הסדרה."))
    # 10 headline left aligned block, photo right strip
    it.append(("רצועת צילום ימנית",'light',[page(PP),photo(W-360,0,360,H,s=0),head(W-400,160,72,NV,maxW=W-400-M,mx=4),sub(W-400,620,30,SL,maxW=W-400-M,mx=4),pill(W-400,900,RD,WH,size=22,f="label")],"רצועת צילום אנכית בצד ימין, טקסט בצד שמאל של הדף."))
    fam("afi",it)

# ---------------- isca · ישראל קנדה ----------------
# Genres: luxury towers and penthouses, deals news, lifestyle amenities, English project names, prime locations.
def isca():
    it=[]
    it.append(("מגדל · מסגרת דקה",'dark',[photo(0,0,W,H,dim=.35,fade=[.1,.7],rgb="11,31,42"),frame(M,M,L2,H-2*M-20,MS,lw=1.5),head(W/2,760,84,WH,align="center",mx=3),label(W/2,1080,24,MS,align="center",track=3)],"צילום מגדל כהה, מסגרת מיסט דקה, כותרת ממורכזת. יוקרה שקטה."))
    it.append(("נמסר · חותמת על פנטהאוז",'dark',[photo(0,0,W,900,dim=.25),rect(0,900,W,450,IK),stamp(W/2-120,520,RD,"נמסר",size=120,rot=-10,lw=9),head(W-M,960,70,WH,mx=2),sub(W-M,1150,28,MS,mx=1)],"חדשות עסקה: חותמת נמסר על הצילום, כותרת על שחור."))
    it.append(("רשימת מתקנים",'dark',[page(NV),head(W-M,150,78,WH,mx=2),line(M,400,W-M,400,MS,1.5),roster(W-M,480,110,5,34,WH,"rgba(143,182,200,0.25)",M,acc=RD,icol=MS),photo(M,1070,L2,160)],"כותרת ורשימת לייף סטייל (בריכה, לובי, חדר כושר) מהטקסט של הפוסט."))
    it.append(("שם הפרויקט אנכי",'dark',[photo(0,0,W,H,dim=.4),vtext(60,H/2,36,MS,None,-90,4),head(W-M,180,96,WH,maxW=L2-80,mx=3),label(W-M,1140,24,MS)],"תווית אנכית בצד, כותרת ענקית למעלה. שפת מגדלי היוקרה."))
    it.append(("קו ראשון · קו מידה",'light',[page(WH),photo(M,120,L2,600),dimline(M,W-M,790,64,NV,RD,WH,SL),head(W-M,900,72,NV,mx=2),sub(W-M,1120,28,SL,mx=1)],"צילום ממוסגר וקו מידה שנושא מספר אמיתי מהפוסט (מרחק, קומות, מ\"ר)."))
    it.append(("כפול · צילום ומילה בקונטור",'dark',[page(IK),photo(M,150,L2,620,dim=.1),otext(W-M,800,200,MS,"right","word",2),head(W-M,1010,64,WH,mx=2)],"מילה אחת מהכותרת בקונטור מיסט, כמו שם פרויקט באנגלית."))
    it.append(("שלושה חלונות יוקרה",'dark',[page(NV),head(W-M,140,68,WH,mx=2),photo(M,380,L2,420,s=0),photo(M,820,(L2-24)//2,360,s=1),photo(M+(L2-24)//2+24,820,(L2-24)//2,360,s=2),frame(M,380,L2,800,"rgba(143,182,200,0.5)",lw=1)],"שלוש תמונות בתוך מסגרת אחת דקה."))
    it.append(("עמוד נייר · הצהרה ממורכזת",'light',[page(PP),rect(W/2-30,300,60,6,RD),head(W/2,340,84,NV,align="center",mx=3),sub(W/2,680,30,SL,align="center",mx=3),photo(M,900,L2,300)],"כותרת ממורכזת על נייר בהיר, קו אדום קצר, צילום צר למטה."))
    it.append(("מיקום · סמן על צילום",'dark',[photo(0,0,W,H,dim=.3,fade=[0,.6]),marker(W/2,520,RD,rad=16,ring=60),head(W-M,860,76,WH,mx=2),label(W-M,1110,24,MS)],"סמן מיקום על הצילום, כותרת מתחת. פוסט מיקום."))
    it.append(("ציר הזמן של הפרויקט",'dark',[page(IK),head(W-M,150,72,WH,mx=2),timeline(W-M-30,420,150,5,2,RD,"#35505e"),label(W-M,1150,24,MS)],"ציר זמן אנכי בחמישה צעדים, שלב נוכחי באדום."))
    fam("isca",it)

# ---------------- tidhar · תדהר ----------------
# Genres: engineering milestones (floors, finishing works, occupancy of towers), big numbers, "how we build" stages.
def tidhar():
    it=[]
    it.append(("קומה · סרט מידה",'dark',[photo(0,0,W,H,dim=.35,fade=[.2,.75]),tape(-40,470,W+40,380,h=96,size=60),head(W-M,820,80,WH,mx=3)],"סרט מידה חוצה את הצילום עם המספר מהפוסט (קומה, מטר, שבוע)."))
    it.append(("לוח אתר",'light',[page(PP),head(W-M,130,70,NV,mx=2),siteboard(M,370,L2,620,legs=0),label(W-M,1110,24,SL)],"שלט האתר עם פרטי הפרויקט מתוך הפוסט."))
    it.append(("שרטוט · מספר גדול",'light',[page(WH),gridlines(8,10,"rgba(16,85,114,0.14)"),stat(W-M,160,260,NV),head(W-M,560,72,NV,mx=3),sub(W-M,900,30,SL,mx=3)],"רשת שרטוט, מספר ענק מהפוסט וכותרת."))
    it.append(("כך בונים · שלבים",'light',[page(WH),head(W-M,140,76,NV,mx=2),photo(M,380,L2,460),stepsL(M+40,W-M-40,980,["היתר","חפירה","שלד","גמר","מסירה"],3,TL,PL,bg=WH),label(W-M,1150,24,SL)],"צילום ומסלול שלבים עם שמות, השלב הנוכחי מסומן."))
    it.append(("התקדמות · פס",'dark',[page(NV),label(W-M,150,24,MS),head(W-M,200,84,WH,mx=3),progress(M,760,L2,34,RD,"rgba(143,182,200,0.25)",40,WH),photo(M,880,L2,330)],"פס התקדמות עם אחוז מהפוסט, מעל צילום."))
    it.append(("גמר · שני צילומים",'light',[page(WH),photo(0,0,W,560,s=0),pill(W-M,24+40,WH,NV,"שלד",size=22),photo(0,580,W,560,s=1),pill(W-M,620,RD,WH,"גמר",size=22),head(W-M,1165,64,NV,mx=1)],"שלד מול גמר: שני צילומים ברוחב מלא עם תג לכל אחד."))
    it.append(("מפלסים",'dark',[photo(0,0,430,H,dim=.2),rect(430,0,W-430,H,NV),head(W-M,150,72,WH,maxW=W-430-M-40,mx=4),levels(W-M,700,W-430-M-40,160,3,WH,RD,36)],"צילום בצד ושלושה מפלסים מסומנים מהטקסט."))
    it.append(("מספרי ביצוע",'light',[page(PP),head(W-M,140,72,NV,mx=2),rect(M,400,L2,640,WH),specs3(M+30,460,L2-60,3,110,NV,SL,"rgba(7,41,58,0.15)",22),sub(W-M-30,840,28,SL,maxW=L2-60,mx=3)],"כרטיס לבן עם שלושה נתונים מהפוסט ומשפט הסבר."))
    it.append(("מגדל · מלמטה",'dark',[photo(0,0,W,H,fade=[0,.6],rgb="7,41,58"),bars(M,170,WH,30),head(W-M,900,76,WH,mx=3),label(W-M,1160,24,MS)],"צילום מהרגליים למעלה, פסי תפריט, כותרת בתחתית."))
    it.append(("יומן הנדסי",'light',[page(WH),frame(M,M,L2,H-2*M-20,NV,lw=2),label(W-M-30,150,24,SL),head(W-M-30,200,66,NV,maxW=L2-60,mx=3),line(M+30,520,W-M-30,520,NV,1.5),sub(W-M-30,560,30,SL,maxW=L2-60,mx=4),photo(M+30,860,L2-60,320)],"מסגרת כחולה, קו מפריד, צילום בתחתית. דף מתוך יומן העבודה."))
    fam("tidhar",it)

# ---------------- dimri · י.ח. דמרי ----------------
# Genres: presenter campaigns (large portrait and slogan), launches, expected occupancy dates, nationwide project list, grants news.
def dimri():
    it=[]
    it.append(("פרזנטור · דיוקן וסלוגן",'light',[page(PP),cphoto(W/2,470,300,s=0,stroke=NV,sw=10),caption(W/2,820,70,NV,WH,align="center",mx=2),sub(W/2,1060,30,SL,align="center",mx=2)],"דיוקן עגול גדול וכיתוב בקופסה כחולה, כמו קמפיין עם פרזנטור."))
    it.append(("יוצא לשיווק · פס אדום",'light',[page(WH),rect(0,0,W,120,RD),small("יוצא לשיווק",W-M,78,28,WH),photo(M,160,L2,620),head(W-M,830,80,NV,mx=2),sub(W-M,1060,30,SL,mx=2)],"פס השקה אדום עליון, צילום וכותרת."))
    it.append(("חותמת גיליון · פרויקט ומיקום",'dark',[photo(0,0,W,H,dim=.3,fade=[.05,.8]),head(W-M,540,80,WH,mx=3),tblock(M,960,L2,180)],"כותרת על הצילום וחותמת שמות: פרויקט ומיקום."))
    it.append(("פרויקטים בכל הארץ",'light',[page(WH),head(W-M,140,76,NV,mx=2),roster(W-M,440,104,5,34,NV,PL,M,acc=RD,icol=TL),label(W-M,1130,24,SL)],"רשימת ערים ופרויקטים עם סמן, הראשון באדום."))
    it.append(("קולנועי · נגן וכיתוב",'dark',[photo(0,0,W,H,dim=.4),play(W/2,520,90),caption(W-M,820,64,WH,NV,mx=3,lh=1.24)],"צילום כהה עם כפתור נגינה וכיתוב בקופסאות. שפת הסרטון."))
    it.append(("הודעה · סימון אדום",'light',[page(WH),photo(0,0,W,760),redmark(600,400,130,RD,8),head(W-M,820,76,NV,mx=2),sub(W-M,1060,30,SL,mx=2)],"סימון אדום על הצילום, כמו הדגשה של עדכון חשוב."))
    it.append(("עמוד כחול · ציטוט",'dark',[page(NV),label(W-M,150,26,MS),head(W-M,200,70,WH,mx=2),dropcap(W-M,470,170,RD,44,7,WH,L2)],"אות פתיחה אדומה ענקית וגוף טקסט לבן."))
    it.append(("שני צילומים ותג",'light',[page(PP),photo(M,130,L2,520,s=0),photo(M,670,L2,320,s=1),tag(W-M,1020,RD,None,"right",24),head(W-M,1080,64,NV,mx=1)],"זוג צילומים, תג וכותרת קצרה."))
    it.append(("מודעה · מסגרת כחולה",'light',[page(NV),rect(48,48,W-96,H-96-40,WH),photo(96,96,W-192,560),head(W-M-24,720,70,NV,maxW=L2-48,mx=3),cta("לתיאום פגישה",M+24,1100,RD,WH,"left",28,300)],"מסגרת כחולה סביב דף לבן, צילום וכפתור. שפת המודעה."))
    it.append(("מספרים בשורות",'light',[page(WH),head(W-M,140,70,NV,mx=2),ledger(W-M,400,3,100,32,RD,NV,PL),photo(M,960,L2,250)],"שורות מספרים מהפוסט, המספר באדום והטקסט לצידו, צילום צר למטה."))
    fam("dimri",it)

# ---------------- shb · שיכון ובינוי ----------------
# Genres: 100 year heritage, launches with two presenters, מחיר למשתכן route, sustainability tone.
def shb():
    it=[]
    it.append(("מורשת · מילה ענקית",'dark',[page(NV),otext(W/2,220,300,WH,"center","word",3),head(W/2,640,66,WH,align="center",mx=3),sub(W/2,940,28,MS,align="center",mx=2)],"מילה מהכותרת בקונטור ענק, כותרת ממורכזת. פוסט ותק."))
    it.append(("שני פרזנטורים",'light',[page(PP),cphoto(W/2-230,420,210,s=0,stroke=WH,sw=10),cphoto(W/2+230,420,210,s=1,stroke=WH,sw=10),head(W/2,720,72,NV,align="center",mx=2),sub(W/2,960,30,SL,align="center",mx=2)],"שני דיוקנאות עגולים זה לצד זה וכותרת ממורכזת."))
    it.append(("מסלול · לוח כתיבה",'light',[page(PL),head(W-M,100,64,NV,mx=1,maxW=600),clipboard(120,260,840,900,54)],"לוח כתיבה עם הכותרת ושורות הסבר. פוסט מסלול רכישה."))
    it.append(("ירוק עירוני · טורקיז",'dark',[page(TL),head(W-M,150,84,WH,mx=3),photo(M,560,L2,520,r=0),label(W-M,1130,24,WH)],"דף טורקיז מלא, צילום ממורכז, תווית למטה."))
    it.append(("מונו · כיתוב לבן",'dark',[photo(0,0,W,H,mono=True,dim=.25,fade=[0,.5]),caption(W-M,760,72,WH,IK,mx=3,lh=1.22),label(W-M,1130,24,MS)],"צילום שחור לבן היסטורי וכיתוב בקופסאות לבנות."))
    it.append(("רשימת יתרונות",'light',[page(WH),head(W-M,140,72,NV,mx=2),rect(M,400,L2,760,PP),lst(W-M-30,440,NV,TL,rh=120,mx=5,size=34,w=600,num=False,check=True,rule=PL,x1=M+30,x2=W-M-30)],"רשימת וי על כרטיס נייר. יתרונות הפרויקט."))
    it.append(("אבן דרך · תאריך",'light',[page(WH),photo(0,0,W,700),rect(0,700,W,650,TL),label(W-M,760,26,WH),head(W-M,810,74,WH,mx=3),sub(W-M,1100,28,WH,mx=2)],"צילום מעל בלוק טורקיז, תווית ותאריך ואז כותרת."))
    it.append(("שלוש תמונות אנכיות",'light',[page(PP),head(W-M,130,66,NV,mx=2),photo(M,360,(L2-40)//3,800,s=0),photo(M+(L2-40)//3+20,360,(L2-40)//3,800,s=1),photo(M+2*((L2-40)//3+20),360,(L2-40)//3,800,s=2)],"שלוש רצועות צילום אנכיות."))
    it.append(("קרדיטים · שותפים",'dark',[page(IK),label(W/2,150,24,MS,align="center",track=4),head(W/2,200,64,WH,align="center",mx=2),credits(W/2,480,44,WH,MS)],"כותרת ממורכזת וקרדיטים לשותפים כמו בסוף סרט."))
    it.append(("בלוק טורקיז על צילום",'dark',[photo(0,0,W,H,dim=.15),rect(0,720,W,630,TL),head(W-M,790,78,WH,mx=3),sub(W-M,1100,28,MS,mx=2)],"צילום ובלוק טורקיז בחצי התחתון."))
    fam("shb",it)

# ---------------- electra · אלקטרה מגורים ----------------
# Genres: lifestyle concept (tower is more than apartments), amenities, local Hod HaSharon project, emotional summer campaign.
def electra():
    it=[]
    it.append(("לייף סטייל · שלושה אריחים",'light',[page(WH),head(W-M,140,72,NV,mx=2),photo(M,380,L2,380,s=0),photo(M,780,(L2-20)//2,380,s=1),photo(M+(L2-20)//2+20,780,(L2-20)//2,380,s=2),pill(W-M-20,400,NV,WH,size=22,f="label")],"שלושה צילומי מתקנים (לובי, בריכה, חדר כושר) ותווית."))
    it.append(("הרבה יותר מ · קונטור",'dark',[page(NV),otext(W-M,160,220,MS,"right","word",2),head(W-M,420,80,WH,mx=3),roster(W-M,820,96,4,32,WH,"rgba(143,182,200,0.25)",M,acc=RD,icol=MS)],"מילה בקונטור, כותרת ורשימת מתקנים."))
    it.append(("ציטוט · אות פתיחה",'light',[page(PP),label(W-M,150,24,SL),head(W-M,200,66,NV,mx=2),dropcap(W-M,440,170,RD,44,6,NV,L2),photo(M,1000,L2,200)],"ציטוט עם אות פתיחה אדומה וצילום צר למטה."))
    it.append(("כרטיס פרויקט · מפרט",'light',[page(WH),photo(M,120,L2,560),rect(M,680,L2,480,PP),head(W-M-30,720,64,NV,maxW=L2-60,mx=2),specs3(M+30,900,L2-60,3,80,NV,SL,"rgba(7,41,58,0.15)",22)],"צילום, כותרת ושלושה נתונים מהפוסט על כרטיס נייר."))
    it.append(("קיץ · צילום רגשי",'dark',[photo(0,0,W,H,fade=[.3,.8],rgb="7,41,58"),rect(W-M-160,800,160,10,RD),head(W-M,860,84,WH,mx=3),label(W-M,1140,24,MS)],"דהייה כחולה בתחתית הצילום, קו אדום קצר וכותרת לבנה. קמפיין רגשי."))
    it.append(("לובי · פנורמה",'light',[page(WH),photo(0,120,W,460),head(W-M,640,76,NV,mx=2),sub(W-M,880,30,SL,mx=3),rect(M,1130,120,8,RD)],"צילום פנורמי ברוחב מלא, כותרת ותת כותרת."))
    it.append(("אריחי צבע וצילום",'light',[page(WH),head(W-M,140,70,NV,mx=2),tiles([(M,400,(L2-24)//2,360,NV),(M+(L2-24)//2+24,400,(L2-24)//2,360,WH),(M,784,(L2-24)//2,360,WH),(M+(L2-24)//2+24,784,(L2-24)//2,360,TL)],r=0),photo(M+(L2-24)//2+24,400,(L2-24)//2,360),photo(M,784,(L2-24)//2,360,s=1),small("מגורים",W-M-30,470,30,WH),small("קהילה",M+(L2-24)//2+24+(L2-24)//2-30,854,30,WH)],"ארבעה אריחים: שניים צבע, שניים צילום."))
    it.append(("מגדל · מסגרת אדומה",'dark',[photo(0,0,W,H,dim=.3),frame(M,M,L2,H-2*M-20,RD,lw=3),head(W-M-40,180,86,WH,maxW=L2-80,mx=3),label(W-M-40,1120,24,MS)],"מסגרת אדומה דקה סביב צילום מגדל."))
    it.append(("שאלה ותשובה",'light',[page(PP),caption(W-M,160,64,WH,NV,mx=3,lh=1.26),caption(M+20,640,40,NV,WH,f="sub",align="left",mx=6,maxW=L2-80)],"בועת שאלה לבנה ובועת תשובה כחולה."))
    it.append(("קומת גג · חלון בית",'light',[page(WH),housewin(140,100,800,720,260,s=0,stroke=NV,lw=10),head(W/2,900,66,NV,align="center",mx=2),sub(W/2,1120,28,SL,align="center",mx=1)],"צילום בתוך צורת בית, כותרת ממורכזת."))
    fam("electra",it)

# ---------------- gabay · קבוצת גבאי ----------------
# Genres: pinui binui before and after, old units to new units, resident journey stages, "game rules" manifesto, big tower numbers.
def gabay():
    it=[]
    it.append(("לפני ואחרי · מונו וצבע",'light',[page(WH),photo(0,0,W,600,s=0,mono=True),pill(W-M,40+24,NV,WH,"לפני",size=22),photo(0,620,W,560,s=1),pill(W-M,660,RD,WH,"אחרי",size=22),head(W-M,1195,64,NV,mx=1)],"צילום ישן בשחור לבן מעל צילום חדש בצבע, תג לכל אחד. הכותרת בכיתוב הפוסט."+" "))
    it.append(("מישן ועד חדש · חץ",'light',[page(PP),head(W-M,140,76,NV,mx=2),rect(M,420,(L2-80)//2,520,PL),rect(M+(L2-80)//2+80,420,(L2-80)//2,520,NV),arrow_el(W/2,680,RD,80,6),stat(M+(L2-80)//2-30,520,150,NV,"right",(L2-80)//2-60),small("היום",M+(L2-80)//2-30,860,28,SL),small("מחר",W-M-30,860,28,MS),sub(W-M,1010,28,SL,mx=2)],"שני כרטיסים: היום ומחר, חץ אדום ביניהם, המספר מהפוסט."))
    it.append(("מסלול הדיירים",'light',[page(WH),head(W-M,140,72,NV,mx=2),stepsL(M+40,W-M-40,560,["חתימה","תכנון","היתר","ביצוע","מסירה"],2,RD,PL,bg=WH),photo(M,740,L2,440)],"חמישה שלבים עם שמות ואז צילום."))
    it.append(("כללי המשחק · רשימה",'dark',[page(IK),head(W-M,150,78,WH,mx=2),lst(W-M,470,WH,RD,rh=130,mx=5,size=36,w=600,num=True,rule="rgba(255,255,255,0.15)",x1=M,x2=W-M)],"מניפסט ממוספר על שחור, מספרים באדום."))
    it.append(("שחור לבן · תג אדום",'light',[page(WH),photo(M,150,L2,700,mono=True),pill(W-M,890,RD,WH,size=22,f="label"),head(W-M,960,68,NV,mx=2)],"צילום מונוכרום, תג אדום וכותרת כהה."))
    it.append(("סימון בדיקה על שלד",'dark',[photo(0,0,W,900,mono=True,dim=.2),redmark(540,430,140,RD,9),rect(0,900,W,450,NV),head(W-M,960,70,WH,mx=2),label(W-M,1170,24,MS)],"סימון אדום על צילום מונו, כותרת על כחול."))
    it.append(("מגדלים · פסים",'dark',[page(NV),tiles([(M,300,150,900,TL),(M+200,420,150,780,MS),(M+400,200,150,1000,TL),(M+600,520,150,680,MS),(M+800,360,136,840,TL)],r=0),rect(0,760,W,590,NV,a=.85),head(W-M,820,80,WH,mx=3),label(W-M,1140,24,MS)],"קו רקיע של מגדלים ברצועות, כותרת על חצי כהה."))
    it.append(("עמוד אדום · הצהרה",'dark',[page(RD),head(W-M,180,100,WH,mx=4),sub(W-M,820,30,WH,mx=3),photo(M,1020,L2,200)],"עמוד אדום מלא עם כותרת ענקית."))
    it.append(("חלון צילום בבלוק",'dark',[page(NV),rect(M,150,L2,640,WH),photo(M+24,174,L2-48,592),head(W-M,860,74,WH,mx=3),label(W-M,1150,24,MS)],"חלון צילום לבן בתוך דף כחול."))
    it.append(("קרדיטים לדיירים ולצוות",'light',[page(PP),head(W-M,140,66,NV,mx=2),rect(M,380,L2,560,WH),credits(W/2,430,40,NV,SL,36,22),photo(M,980,L2,230)],"כרטיס לבן עם שורות קרדיט: תפקיד ושם מהפוסט."))
    fam("gabay",it)

def arrow_el(x,y,col,ln,lw): return {"t":"arrow","x":int(x),"y":int(y),"col":col,"len":ln,"lw":lw}

# ---------------- prash · פרשקובסקי ----------------
# Genres: penthouse deal headlines, 72 hour sale events, expected occupancy, first line to the park, quiet premium pages.
def prash():
    it=[]
    it.append(("עסקה · נמסר על נייר",'light',[page(PP),photo(M,130,L2,640),stamp(M+160,560,RD,"נמסר",size=100,rot=-12,lw=8),head(W-M,830,70,NV,mx=2),sub(W-M,1050,28,SL,mx=2)],"צילום ממוסגר על נייר, חותמת נמסר, כותרת."))
    it.append(("מכרז · סרט מידה",'light',[page(WH),head(W-M,150,80,NV,mx=3),tape(-40,560,W+40,620,h=90,size=60,bg=PP,vbg=RD),photo(M,760,L2,420)],"סרט מידה עם מספר מהפוסט (שעות, דירות, ימים) בין כותרת לצילום."))
    it.append(("מועד אכלוס · תווית",'light',[page(WH),photo(0,0,W,680),rect(M,620,L2,120,NV),small("מועד אכלוס צפוי",W-M-30,665,24,MS),label(W-M-30,705,26,WH),head(W-M,820,70,NV,mx=2),sub(W-M,1050,28,SL,mx=2)],"רצועה כחולה על קצה הצילום עם מועד אכלוס (מהפוסט) וכותרת."))
    it.append(("קו ראשון לפארק · בית בקו",'light',[page(PP),linehouse(W/2,470,1.1,NV,7,RD),head(W/2,860,68,NV,align="center",mx=2),sub(W/2,1080,28,SL,align="center",mx=2)],"איור בית בקו אחד, כותרת ממורכזת. דף שקט."))
    it.append(("בוטיק · צילום קטן ממורכז",'light',[page(PP),photo(W/2-300,150,600,520),rect(W/2-40,710,80,4,RD),head(W/2,760,64,NV,align="center",mx=3),label(W/2,1060,24,SL,align="center",track=3)],"צילום קטן ממורכז עם הרבה אוויר, קו אדום קצר."))
    it.append(("שני צילומים לא סימטריים",'light',[page(WH),photo(M,120,560,700,s=0),photo(M+600,320,336,500,s=1),head(W-M,880,66,NV,mx=2),sub(W-M,1100,28,SL,mx=1)],"זוג צילומים בגבהים שונים, כותרת למטה."))
    it.append(("לילה · כהה ומסגרת",'dark',[page(IK),frame(M,M,L2,H-2*M-20,"rgba(143,182,200,0.5)",lw=1),photo(M+40,M+40,L2-80,620),head(W-M-40,800,64,WH,maxW=L2-80,mx=3),label(W-M-40,1110,24,MS)],"דף כהה, מסגרת דקה, צילום ממוסגר."))
    it.append(("פנטהאוז · פנורמה וכיתוב",'dark',[photo(0,0,W,H,dim=.25,fade=[.2,.7]),label(W-M,760,24,MS),caption(W-M,810,64,WH,NV,mx=3,lh=1.24)],"כיתוב בקופסאות על צילום נוף מהגג."))
    it.append(("קו מידה · מרחק",'light',[page(WH),head(W-M,140,72,NV,mx=2),photo(M,380,L2,520),dimline(M,W-M,980,60,NV,RD,WH,SL),label(W-M,1140,24,SL)],"כותרת, צילום וקו מידה עם המספר מהפוסט."))
    it.append(("עמוד כחול · מלבן לבן",'dark',[page(NV),rect(M,150,L2,540,WH),head(W-M-36,200,64,NV,maxW=L2-72,mx=3),sub(W-M-36,500,28,SL,maxW=L2-72,mx=2),photo(M,720,L2,460)],"כותרת על מלבן לבן, צילום מתחת, דף כחול."))
    fam("prash",it)

# ---------------- altn · אלטנוילנד ----------------
# Genres: urban renewal in the Sharon, projects by city, before and after thinking, skyline motifs.
def altn():
    it=[]
    it.append(("עיר · תג וצילום",'dark',[photo(0,0,W,H,dim=.3,fade=[0,.65]),pill(W-M,170,WH,NV,size=24,f="label"),head(W-M,860,80,WH,mx=3),label(W-M,1150,24,MS)],"תג העיר למעלה, כותרת למטה. עמוד פרויקטים בעיר."))
    it.append(("בלוק דיו וחלון",'dark',[page(IK),photo(M,150,L2,560),rect(M,710,L2,8,RD),head(W-M,770,76,WH,mx=3),sub(W-M,1080,28,MS,mx=2)],"צילום בחלון, קו אדום, כותרת לבנה על דיו."))
    it.append(("לפני ואחרי · חצי חצי",'light',[page(WH),photo(0,0,W/2,980,s=0,mono=True),photo(W/2,0,W/2,980,s=1),rect(W/2-3,0,6,980,WH),head(W-M,1030,64,NV,mx=2,maxW=620),label(M,1040,24,SL,align="left",maxW=300)],"שני צילומים זה לצד זה, הישן בשחור לבן."))
    it.append(("קו רקיע · רצועות",'light',[page(PP),head(W-M,140,76,NV,mx=2),tiles([(M,540,120,660,NV),(M+150,640,120,560,TL),(M+300,460,120,740,NV),(M+450,700,120,500,MS),(M+600,560,120,640,TL),(M+750,620,186,580,NV)],r=0),sub(W-M,400,28,SL,mx=1)],"רצועות בגובה משתנה כמו קו רקיע עירוני."))
    it.append(("מחדשים · אדום",'light',[page(WH),rect(0,0,W,H*.45,RD),head(W-M,150,88,WH,mx=3),photo(M,H*.45+40,L2,520),label(W-M,1200,24,SL)],"חצי עליון אדום עם כותרת, צילום על לבן למטה."))
    it.append(("שלוש ערים · רשימה",'light',[page(WH),head(W-M,140,72,NV,mx=2),roster(W-M,430,104,5,34,NV,PL,M,acc=RD,icol=NV),photo(M,960,L2,240)],"רשימת ערים ושכונות מהפוסט, צילום צר למטה."))
    it.append(("מסלול התחדשות",'light',[page(PP),head(W-M,140,70,NV,mx=2),rect(M,400,L2,420,WH),stepsL(M+60,W-M-60,560,["חתימות","תכנון","היתר","פינוי","בנייה","מסירה"],1,RD,PL,bg=WH),sub(W-M,880,28,SL,mx=3)],"שישה שלבים של פינוי בינוי על כרטיס לבן."))
    it.append(("שאלה · ש ות",'light',[page(WH),small("ש",W-M,120,220,RD),head(W-M-200,170,64,NV,maxW=L2-200,mx=3),line(M,520,W-M,520,PL,2),small("ת",W-M,560,220,NV),sub(W-M-200,610,34,SL,maxW=L2-200,mx=7,lh=1.4)],"שאלה ותשובה עם אותיות ענקיות."))
    it.append(("מבט מהרחוב",'dark',[photo(0,0,W,H,fade=[0,.7],rgb="11,31,42"),vtext(60,H/2,34,MS,None,-90,4),caption(W-M,900,64,RD,WH,mx=2,lh=1.24)],"כיתוב אדום על צילום רחוב, תווית אנכית."))
    it.append(("עמוד נייר · שני טורים",'light',[page(PP),head(W-M,140,66,NV,mx=3),line(W/2,420,W/2,1150,PL,2),sub(W-M,440,30,SL,maxW=W/2-M-40,mx=8,lh=1.45),photo(M,440,W/2-M-40,700)],"טקסט בטור ימין וצילום בטור שמאל."))
    fam("altn",it)

# ---------------- aura · אאורה, אזורים, אשדר ----------------
# Genres: payment mechanisms (20/80), "last apartments", sales momentum numbers, registration calls, national statements.
def aura():
    it=[]
    it.append(("מנגנון · שתי קופסאות",'light',[page(WH),head(W-M,140,76,NV,mx=2),poll(M,420,L2,130,TL,WH,TL,34),sub(W-M,760,30,SL,mx=3),photo(M,960,L2,240)],"שני משפטים מהפוסט בשתי קופסאות (למשל בחתימה ובמסירה)."))
    it.append(("דירות אחרונות · מדבקה",'light',[page(WH),photo(M,130,L2,700),sticker(220,760,RD,WH,"אחרונות",rot=-8,size=34),head(W-M,880,70,NV,mx=2),sub(W-M,1100,28,SL,mx=1)],"מדבקה אדומה מסובבת על פינת הצילום."))
    it.append(("מספרי מכירות",'dark',[page(NV),head(W-M,150,72,WH,mx=2),ledger(W-M,400,3,100,32,RD,WH,"rgba(143,182,200,0.25)"),photo(M,960,L2,250)],"שורות מספרים מהפוסט על כחול, צילום צר למטה."))
    it.append(("הרשמה · כפתור",'light',[page(PP),photo(0,0,W,640),head(W-M,700,76,NV,mx=2),sub(W-M,930,28,SL,mx=2),cta("לתיאום פגישה",M,1110,RD,WH,"left",28,300)],"צילום, כותרת וכפתור פעולה."))
    it.append(("הצהרה לאומית",'light',[page(WH),head(W-M,180,110,NV,mx=4,lh=1.0),rect(W-M-200,780,200,10,RD),sub(W-M,830,30,SL,mx=3),label(W-M,1180,24,SL)],"כותרת ענקית בלבד, קו אדום, שורת הסבר."))
    it.append(("עמוד מחולק · טורקיז",'light',[page(WH),rect(0,0,W/2,H,TL),photo(W/2+M/2,M,W/2-M-M/2,H-2*M-40),head(W/2-M,180,66,WH,maxW=W/2-2*M,mx=4),sub(W/2-M,640,28,WH,maxW=W/2-2*M,mx=4)],"חצי טורקיז עם טקסט לבן, חצי צילום."))
    it.append(("טבעת · אחוז",'dark',[page(IK),ring(W/2,480,300,30,RD,"rgba(255,255,255,0.15)",WH,150),head(W/2,860,66,WH,align="center",mx=2),sub(W/2,1080,28,MS,align="center",mx=1)],"טבעת עם אחוז מהפוסט, כותרת ממורכזת."))
    it.append(("מרכז · ממורכז על צילום",'dark',[photo(0,0,W,H,dim=.45),head(W/2,520,84,WH,align="center",mx=3),rect(W/2-40,840,80,6,RD),sub(W/2,880,30,WH,align="center",mx=2)],"הכל ממורכז על צילום מוכהה."))
    it.append(("אירוע · תווית ותאריך",'light',[page(PP),rect(M,140,L2,220,NV),label(W-M-30,200,26,MS),small("אירוע",M+30,200,26,MS,align="left"),head(W-M,420,74,NV,mx=2),photo(M,680,L2,500)],"רצועת כותרת כחולה עם תווית, כותרת וצילום."))
    it.append(("ספירה · 1 מתוך",'dark',[page(NV),counter(M,1200,"1/5",MS,24,"left"),head(W-M,180,88,WH,mx=3),sub(W-M,600,32,MS,mx=4,lh=1.4),swipe(M,1130,WH,"החליקו")],"שקף ראשון בקרוסלה: מונה, כותרת, החליקו."))
    fam("aura",it)

afi();isca();tidhar();dimri();shb();electra();gabay();prash();altn();aura()
all_=[s for b in OUT for s in OUT[b]]
json.dump(OUT,open('canva/author3/all.json','w'),ensure_ascii=False,indent=0)
for b,l in OUT.items():json.dump(l,open(f'canva/author3/{b}.json','w'),ensure_ascii=False)
print(len(all_),'templates in',len(OUT),'families')
