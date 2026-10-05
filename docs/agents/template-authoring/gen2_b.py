from gen2_lib import *
import json

def tidhar():
    CH,ST,WH,SA,INK,GR="#1f2a30","#e9e5df","#ffffff","#c8b79a","#141a1e","#4d575c"
    o=[]
    o.append(("צילום מלא, כותרת נמוכה","dark",[photo(0,0,W,H,fade=[0,.7],rgb="20,26,30"),line(W-M-120,920,W-M,920,SA,2),head(W-M,950,72,WH,mx=2,w=700),sub(W-M,1130,28,"#d8d3ca",mx=1)]))
    o.append(("אבן, צילום עם שוליים","light",[page(ST),photo(M,150,W-2*M,760),small("",W-M,960,22,GR),head(W-M,960,68,INK,mx=2,w=700),sub(W-M,1140,26,GR,mx=1)]))
    o.append(("פחם עם קו חול","dark",[page(CH),line(M,600,W-M,600,SA,1),head(W-M,220,92,WH,mx=3,w=700),sub(W-M,660,28,"#cfc8bb",mx=2),photo(M,820,W-2*M,380)]))
    o.append(("שני שלישים צילום","light",[page(ST),photo(0,0,W,880),head(W-M,950,66,INK,mx=2,w=700),sub(W-M,1130,26,GR,mx=1)]))
    o.append(("שני צילומים ומפריד","light",[page(WH),photo(M,150,(W-2*M-30)//2,760),photo(M+(W-2*M-30)//2+30,150,(W-2*M-30)//2,760,s=1),line(W/2,150,W/2,910,SA,1),head(W-M,960,64,INK,mx=2,w=700),sub(W-M,1140,26,GR,mx=1)]))
    o.append(("טור צר ליד צילום גבוה","light",[page(ST),photo(M,150,560,1060),head(W-M,180,60,INK,maxW=340,mx=5,w=700,lh=1.15),sub(W-M,700,24,GR,maxW=340,mx=4)]))
    o.append(("לבן עם מסגרת חול","light",[page(WH),frame(100,120,W-200,820,SA,2),photo(130,150,W-260,760),head(W-M,990,66,INK,mx=2,w=700)]))
    o.append(("מילה גדולה בחול","light",[page(ST),otext(W-M,320,240,SA,lw=0),head(W-M,620,76,INK,mx=2,w=700),sub(W-M,880,26,GR,mx=2),line(M,1120,W-M,1120,SA,1)]))
    o.append(("פחם, צילום קטן למטה","dark",[page(CH),label(W-M,170,22,SA,track=3),head(W-M,230,96,WH,mx=3,w=700),photo(M,800,W-2*M,400)]))
    o.append(("צילום עם רצועת אבן","light",[page(ST),photo(0,0,W,700),rect(0,700,W,650,ST),line(M,760,W-M,760,SA,1),head(W-M,800,72,INK,mx=2,w=700),sub(W-M,1020,26,GR,mx=2)]))
    o.append(("צילום ממורכז קטן","light",[page(WH),photo(240,180,600,560),line(W/2-60,800,W/2+60,800,SA,2),head(W/2,850,66,INK,align="center",mx=2,w=700),sub(W/2,1050,26,GR,align="center",mx=1)]))
    o.append(("כותרת על צילום בהיר","light",[photo(0,0,W,H,fade=[.8,0],rgb="233,229,223"),head(W-M,170,80,INK,mx=2,w=700),sub(W-M,400,26,GR,mx=1)]))
    o.append(("אבן, כותרת ענקית","light",[page(ST),head(W-M,230,120,INK,mx=3,w=700,lh=1.0),line(W-M-200,900,W-M,900,SA,2),sub(W-M,940,28,GR,mx=2)]))
    o.append(("צילום שמאלי, טקסט ימני","light",[page(WH),photo(0,0,480,H),vtext(560,700,22,SA,track=4),head(W-M,400,64,INK,maxW=420,mx=4,w=700),sub(W-M,900,24,GR,maxW=420,mx=3)]))
    o.append(("פחם, שני צילומים","dark",[page(CH),photo(M,150,W-2*M,440),photo(M,620,W-2*M,300,s=1),head(W-M,960,64,WH,mx=2,w=700),sub(W-M,1140,24,"#cfc8bb",mx=1)]))
    o.append(("קו חול אנכי","light",[page(ST),rect(W-M-6,150,6,1060,SA),photo(M,150,W-2*M-80,600),head(W-M-50,800,68,INK,maxW=840,mx=3,w=700)]))
    o.append(("צילום מלא, מסגרת פנימית","dark",[photo(0,0,W,H,dim=.3),frame(70,70,W-140,H-140,"rgba(255,255,255,.6)",1),head(W/2,560,80,WH,align="center",mx=3,w=700),sub(W/2,1000,26,"#e9e5df",align="center",mx=1)]))
    o.append(("לבן, כותרת ושורה אפורה","light",[page(WH),head(W-M,240,88,INK,mx=3,w=700),sub(W-M,700,28,GR,mx=2),photo(M,900,W-2*M,300)]))
    o.append(("אבן, צילום עגול","light",[page(ST),cphoto(W/2,460,260,stroke=SA,sw=3),head(W/2,780,70,INK,align="center",mx=2,w=700),sub(W/2,1000,26,GR,align="center",mx=1)]))
    o.append(("פס תחתון כהה","light",[page(WH),photo(M,150,W-2*M,760),rect(0,980,W,370,CH),head(W-M,1020,64,WH,mx=2,w=700),sub(W-M,1180,24,"#cfc8bb",mx=1)]))
    o.append(("שלושה צילומים אופקיים","light",[page(ST),*[photo(M+i*((W-2*M-40)//3+20),150,(W-2*M-40)//3,420,s=i) for i in range(3)],head(W-M,640,72,INK,mx=2,w=700),sub(W-M,900,26,GR,mx=2),line(M,1120,W-M,1120,SA,1)]))
    o.append(("פחם, קו חול כפול","dark",[page(CH),line(M,170,W-M,170,SA,1),line(M,1180,W-M,1180,SA,1),head(W/2,380,96,WH,align="center",mx=3,w=700),sub(W/2,820,26,"#cfc8bb",align="center",mx=2)]))
    return [spec("tidhar",i+1,n,t,e) for i,(n,t,e) in enumerate(o)]

def gabay():
    K,WH,R,GR,INK="#0a0a0a","#ffffff","#d7262d","#9a9a9a","#1a1a1a"
    o=[]
    o.append(("שחור לבן, נקודה אדומה","dark",[photo(0,0,W,H,mono=True,fade=[.1,.75],rgb="0,0,0"),head(W-M,860,92,WH,mx=3,w=800),marker(M+10,900,R,rad=12)]))
    o.append(("שחור, פס אדום","dark",[page(K),head(W-M,220,104,WH,mx=3,w=900),rect(W-M-240,760,240,14,R),sub(W-M,820,30,GR,mx=2)]))
    o.append(("בלוק אדום בפינה","dark",[photo(0,0,W,H,mono=True,dim=.2),rect(W-280,0,280,280,R),head(W-M,900,84,WH,mx=3,w=800)]))
    o.append(("לבן, צילום מונו, תג אדום","light",[page(WH),photo(M,150,W-2*M,700,mono=True),pill(W-M,890,R,WH,size=22),head(W-M,960,68,INK,mx=2,w=800)]))
    o.append(("חצי שחור, חצי צילום","dark",[page(K),photo(W/2,0,W/2,H,mono=True),head(W/2-M,220,84,WH,maxW=W/2-2*M,mx=4,w=800),marker(W/2-M-10,900,R,rad=12),sub(W/2-M,940,26,GR,maxW=W/2-2*M,mx=3)]))
    o.append(("רצועה אדומה על מונו","dark",[photo(0,0,W,H,mono=True),rect(0,760,W,300,R),head(W-M,800,72,WH,mx=2,w=800)]))
    o.append(("מספר אדום ענק","dark",[page(K),otext(W-M,300,320,R,lw=0),head(W-M,720,80,WH,mx=2,w=800),sub(W-M,980,28,GR,mx=2)]))
    o.append(("שני מונו, מפריד אדום","dark",[page(K),photo(0,0,W/2-8,900,mono=True),photo(W/2+8,0,W/2-8,900,s=1,mono=True),rect(W/2-8,0,16,900,R),head(W-M,960,72,WH,mx=2,w=800)]))
    o.append(("לבן, כותרת שחורה ענקית","light",[page(WH),head(W-M,180,120,INK,mx=3,w=900,lh=1.0),marker(W-M-20,860,R,rad=14),photo(M,920,W-2*M,280,mono=True)]))
    o.append(("מונו, מסגרת לבנה דקה","dark",[photo(0,0,W,H,mono=True,dim=.35),frame(60,60,W-120,H-120,WH,2),head(W/2,560,88,WH,align="center",mx=3,w=800),marker(W/2,960,R,rad=12)]))
    o.append(("שחור, צילום מונו קטן","dark",[page(K),photo(M,150,W-2*M,520,mono=True),head(W-M,730,84,WH,mx=3,w=800),rect(W-M-120,1140,120,10,R)]))
    o.append(("לבן, פס אדום אנכי","light",[page(WH),rect(W-M-16,150,16,1060,R),photo(M,150,W-2*M-90,620,mono=True),head(W-M-60,820,72,INK,maxW=820,mx=3,w=800)]))
    o.append(("מילה אחת אדומה","dark",[page(K),otext(W/2,420,300,R,align="center",lw=0),head(W/2,780,80,WH,align="center",mx=2,w=800)]))
    o.append(("צילום מונו עם כיתוב למטה","dark",[page(K),photo(0,0,W,980,mono=True),head(W-M,1020,66,WH,mx=2,w=800),marker(M+10,1050,R,rad=10)]))
    o.append(("אדום מלא","dark",[page(R),head(W-M,220,110,WH,mx=3,w=900),photo(M,780,W-2*M,420,mono=True)]))
    o.append(("לבן, שלוש נקודות","light",[page(WH),head(W-M,220,96,INK,mx=3,w=900),*[marker(M+20+i*50,760,R,rad=10) for i in range(3)],sub(W-M,820,28,"#555555",mx=2)]))
    o.append(("מונו עם קו אדום דק","dark",[photo(0,0,W,H,mono=True,fade=[0,.7],rgb="0,0,0"),line(M,800,W-M,800,R,4),head(W-M,840,80,WH,mx=3,w=800)]))
    o.append(("צילום מונו עגול","dark",[page(K),cphoto(W/2,440,250,stroke=R,sw=8),head(W/2,760,80,WH,align="center",mx=2,w=800),sub(W/2,1000,26,GR,align="center",mx=1)]))
    o.append(("שחור ולבן חצוי אופקית","light",[page(WH),rect(0,0,W,620,K),head(W-M,180,92,WH,mx=3,w=900),photo(M,680,W-2*M,520,mono=True),marker(M+30,700,R,rad=12)]))
    o.append(("לבן עם רשימה אדומה","light",[page(WH),head(W-M,160,84,INK,mx=2,w=800),lst(W-M,440,INK,R,rh=130,mx=5,size=34,w=600,rule="#e0e0e0")]))
    o.append(("מונו, חותמת אדומה","dark",[photo(0,0,W,H,mono=True,dim=.25),stamp(W/2,500,R,"בביצוע",size=110,rot=-12),head(W-M,900,80,WH,mx=2,w=800)]))
    o.append(("שחור, כותרת שמאל","dark",[page(K),head(M,220,96,WH,align="left",maxW=900,mx=3,w=900),rect(M,800,160,12,R),sub(M,860,28,GR,align="left",maxW=900,mx=2)]))
    return [spec("gabay",i+1,n,t,e) for i,(n,t,e) in enumerate(o)]

def electra():
    B,S,O,WH,INK,L="#0b3d91","#2f80ed","#ff7a00","#ffffff","#0f1b2d","#eef3fb"
    o=[]
    o.append(("רצועה כחולה וקו כתום","light",[page(WH),rect(0,0,W,380,B),head(W-M,120,80,WH,mx=2,w=800),rect(M,380,W-2*M,6,O),photo(M,440,W-2*M,520),sub(W-M,1010,28,INK,mx=2)]))
    o.append(("חיתוך אלכסוני","light",[page(WH),pphoto([(0,0),(W,0),(W,760),(0,960)],s=0),pphoto([(0,960),(W,760),(W,800),(0,1000)],s=0,dim=1),rect(0,960,W,390,B),head(W-M,1000,70,WH,mx=2,w=800),rect(W-M-160,1190,160,8,O)]))
    tw=(W-2*M-40)//3
    o.append(("רצועת נתונים","light",[page(WH),head(W-M,150,84,INK,mx=2,w=800),photo(M,420,W-2*M,420),*[rect(M+i*(tw+20),880,tw,220,L,6) for i in range(3)],lst(W-M-20,890,INK,O,rh=70,mx=3,size=26,w=600,num=False)]))
    o.append(("מספר כתום על כחול","dark",[page(B),otext(W-M,260,320,O,lw=0),head(W-M,700,84,WH,mx=2,w=800),sub(W-M,980,28,"#cfe0ff",mx=2)]))
    o.append(("תג פינתי כתום","light",[page(WH),photo(M,150,W-2*M,700),rect(W-M-220,150,220,70,O),head(W-M,900,76,INK,mx=2,w=800),sub(W-M,1120,26,"#4b5563",mx=1)]))
    o.append(("פסי אזהרה בתחתית","light",[page(WH),head(W-M,180,92,INK,mx=3,w=900),photo(M,620,W-2*M,500),*[rect(M+i*80,1160,40,20,O if i%2==0 else B) for i in range(12)]]))
    o.append(("כחול מלא עם קו תכלת","dark",[page(B),line(M,620,W-M,620,S,3),head(W-M,220,100,WH,mx=3,w=900),sub(W-M,670,30,"#cfe0ff",mx=2),photo(M,860,W-2*M,340)]))
    o.append(("ארבעה שלבים","light",[page(L),head(W-M,160,80,INK,mx=2,w=800),steps(M+40,W-M-40,560,4,2,O,"#b8c7e0"),photo(M,700,W-2*M,500)]))
    o.append(("משולש כחול בפינה","light",[page(WH),photo(0,0,W,900),pphoto([(0,900),(W,900),(W,900),(0,900)],dim=0),rect(0,900,W,450,WH),pphoto([(0,0),(360,0),(0,420)],s=1,dim=.9),head(W-M,950,72,INK,mx=2,w=800),rect(W-M-180,1170,180,8,O)]))
    o.append(("לבן, כותרת כחולה","light",[page(WH),head(W-M,200,96,B,mx=3,w=900),rect(W-M-200,780,200,10,O),sub(W-M,840,30,INK,mx=2),photo(M,980,W-2*M,220)]))
    o.append(("תכלת בהיר עם כרטיס","light",[page(L),rect(M,150,W-2*M,1050,WH,6),rect(M,150,W-2*M,14,B),photo(M+24,200,W-2*M-48,560),head(W-M-24,800,68,INK,maxW=820,mx=2,w=800),sub(W-M-24,990,26,"#4b5563",maxW=820,mx=2)]))
    o.append(("כתום מלא","dark",[page(O),head(W-M,220,110,INK,mx=3,w=900),rect(M,780,W-2*M,420,B),photo(M+14,794,W-2*M-28,392)]))
    o.append(("ציר זמן אנכי","light",[page(WH),head(W-M,160,80,INK,mx=2,w=800),timeline(W-M-30,480,150,5,2,O,"#b8c7e0"),photo(M,440,500,760)]))
    o.append(("פס כחול אנכי","light",[page(WH),rect(M,150,24,1060,B),photo(M+80,150,W-M-M-80,560),head(W-M,780,72,INK,maxW=800,mx=3,w=800),rect(W-M-120,1140,120,8,O)]))
    o.append(("צילום מלא, בלוק כחול","dark",[photo(0,0,W,H,dim=.15),rect(0,820,W,530,B),head(W-M,870,76,WH,mx=2,w=800),rect(W-M-140,1120,140,8,O),sub(W-M,1150,26,"#cfe0ff",mx=1)]))
    o.append(("רשימה ממוספרת כתומה","light",[page(WH),rect(0,0,W,320,B),head(W-M,120,72,WH,mx=2,w=800),lst(W-M,400,INK,O,rh=130,mx=5,size=34,w=600)]))
    o.append(("שני צילומים, רצועה כחולה","light",[page(WH),photo(M,150,(W-2*M-20)//2,500),photo(M+(W-2*M-20)//2+20,150,(W-2*M-20)//2,500,s=1),rect(M,690,W-2*M,120,B),head(W-M,860,72,INK,mx=2,w=800),sub(W-M,1090,26,"#4b5563",mx=2)]))
    o.append(("אלכסון כתום דק","light",[page(WH),photo(0,0,W,760),pphoto([(0,720),(W,620),(W,660),(0,760)],s=0,dim=1),rect(0,760,W,590,WH),head(W-M,820,76,INK,mx=2,w=800),sub(W-M,1060,26,"#4b5563",mx=2)]))
    o.append(("כחול, רשת נקודות","dark",[page(B),dots(M,150,W-2*M,1050,"rgba(255,255,255,.14)",step=36,rad=2.5),head(W-M,260,100,WH,mx=3,w=900),pill(W-M,760,O,INK,size=24)]))
    o.append(("כותרת על תכלת, צילום עגול","light",[page(L),cphoto(W/2,420,240,stroke=O,sw=8),head(W/2,720,76,INK,align="center",mx=2,w=800),sub(W/2,960,26,"#4b5563",align="center",mx=2)]))
    o.append(("מסגרת כחולה","light",[page(WH),frame(50,50,W-100,H-100,B,10),head(W-M-20,200,84,INK,maxW=860,mx=3,w=800),photo(M+40,640,W-2*M-80,520)]))
    return [spec("electra",i+1,n,t,e) for i,(n,t,e) in enumerate(o)]

def prashkovsky():
    CR,BR,INK,WH,GR,NT="#f3efe8","#9c7b4f","#1b1b1b","#ffffff","#5e5952","#1f1d1a"
    o=[]
    o.append(("קרם, מסגרת ברונזה","light",[page(CR),frame(100,140,W-200,760,BR,1.5),photo(118,158,W-236,724),head(W-M,960,64,INK,mx=2,w=500),sub(W-M,1130,24,GR,mx=1)]))
    o.append(("לילה, כותרת ברונזה","dark",[page(NT),head(W-M,240,92,"#d8bd8e",mx=3,w=500),sub(W-M,700,26,"#d9d2c7",mx=2),photo(M,860,W-2*M,340)]))
    o.append(("צילום מוסט שמאלה","light",[page(CR),photo(0,150,760,900),rect(600,560,W-600-M,480,WH),head(W-M-24,600,64,INK,maxW=380,mx=3,w=500),sub(W-M-24,880,28,GR,maxW=380,mx=2)]))
    o.append(("קו ברונזה אנכי","light",[page(CR),rect(W-M-3,150,3,1060,BR),photo(M,150,620,1060),head(W-M-40,200,56,INK,maxW=300,mx=5,w=500,lh=1.15),sub(W-M-40,760,22,GR,maxW=300,mx=4)]))
    o.append(("צילום עגול, טבעת ברונזה","light",[page(CR),cphoto(W/2,440,250,stroke=BR,sw=2),head(W/2,760,66,INK,align="center",mx=2,w=500),sub(W/2,980,24,GR,align="center",mx=1)]))
    o.append(("שני צילומים מדורגים","light",[page(CR),photo(M,150,560,520),photo(440,520,W-440-M,560,s=1),head(W-M,1120,56,INK,mx=2,w=500,maxW=560)]))
    o.append(("כותרת ברונזה על קרם","light",[page(CR),head(W-M,220,96,"#7a5c33",mx=3,w=500),sub(W-M,700,26,INK,mx=2),photo(M,920,400,280)]))
    o.append(("צילום מלא, כרטיס קרם","dark",[photo(0,0,W,H,dim=.1),rect(M,860,W-2*M,340,CR),line(W-M-30,900,W-M-130,900,BR,1.5),head(W-M-30,920,56,INK,maxW=820,mx=2,w=500),sub(W-M-30,1080,22,GR,maxW=820,mx=1)]))
    o.append(("לילה, קו ברונזה דק","dark",[page(NT),line(M,700,W-M,700,BR,1),head(W/2,300,84,WH,align="center",mx=3,w=500),sub(W/2,760,24,"#d9d2c7",align="center",mx=2)]))
    o.append(("קרם, צילום קטן למטה","light",[page(CR),label(W-M,170,20,BR,track=4),head(W-M,230,88,INK,mx=3,w=500),photo(M,800,460,400)]))
    o.append(("מילה בקו ברונזה","light",[page(CR),otext(W-M,320,220,BR),head(W-M,620,70,INK,mx=2,w=500),sub(W-M,880,24,GR,mx=2)]))
    o.append(("צילום עם רצועת לילה","light",[page(CR),photo(0,0,W,800),rect(0,800,W,550,NT),head(W-M,860,64,WH,mx=2,w=500),line(W-M,1060,W-M-100,1060,BR,1.5),sub(W-M,1090,22,"#d9d2c7",mx=1)]))
    o.append(("לבן, כותרת מרכזית קטנה","light",[page(WH),photo(200,150,680,700),head(W/2,920,64,INK,align="center",mx=2,w=500),line(W/2-40,1100,W/2+40,1100,BR,1.5),sub(W/2,1130,22,GR,align="center",mx=1)]))
    o.append(("לילה, מסגרת ברונזה","dark",[page(NT),frame(60,60,W-120,H-120,BR,1),photo(M+40,150,W-2*M-80,620),head(W-M-40,840,64,WH,maxW=820,mx=2,w=500),sub(W-M-40,1030,22,"#d9d2c7",maxW=820,mx=2)]))
    o.append(("קרם, שלושה צילומים קטנים","light",[page(CR),head(W-M,180,76,INK,mx=2,w=500),*[photo(M+i*((W-2*M-40)//3+20),520,(W-2*M-40)//3,380,s=i) for i in range(3)],sub(W-M,960,24,GR,mx=2),line(W-M,1120,W-M-120,1120,BR,1)]))
    o.append(("ציטוט ברונזה","light",[page(CR),small("״",W-M,330,220,"#7a5c33",w=700),head(W-M,400,66,INK,mx=3,w=500,lh=1.2),line(W-M,900,W-M-80,900,BR,1.5),sub(W-M,930,24,GR,mx=1)]))
    o.append(("צילום מלא, מסגרת פנימית","dark",[photo(0,0,W,H,dim=.3),frame(80,80,W-160,H-160,"#e2d6c2",1),head(W/2,560,76,WH,align="center",mx=3,w=500),sub(W/2,980,22,"#f3efe8",align="center",mx=1)]))
    o.append(("קרם, רשימה עדינה","light",[page(CR),head(W-M,160,76,INK,mx=2,w=500),lst(W-M,440,INK,BR,rh=120,mx=5,size=30,w=500,rule="#d8cfbf")]))
    o.append(("צילום רבע, אוויר","light",[page(CR),photo(W-M-420,150,420,420),head(W-M,640,80,INK,mx=3,w=500),sub(W-M,1020,24,GR,mx=2)]))
    o.append(("לילה, שני צילומים","dark",[page(NT),photo(M,150,(W-2*M-30)//2,640),photo(M+(W-2*M-30)//2+30,150,(W-2*M-30)//2,640,s=1),head(W-M,860,64,"#d8bd8e",mx=2,w=500),sub(W-M,1040,22,"#d9d2c7",mx=2)]))
    return [spec("prashkovsky",i+1,n,t,e) for i,(n,t,e) in enumerate(o)]

def altneuland():
    INK,WH,OC,SL,PA,GR="#10151c","#ffffff","#d9a441","#3a4652","#f1ede6","#4f5a66"
    o=[]
    sky=lambda y,col:[rect(M+i*86,y-h,70,h,col) for i,h in enumerate([120,200,160,260,140,220,180,300,150,210,170])]
    o.append(("דיו עם חלון צילום","dark",[page(INK),photo(M,150,W-2*M,620),pill(W-M,820,OC,INK,size=22),head(W-M,890,76,WH,mx=3,w=800)]))
    o.append(("לפני ואחרי, מפריד אוקר","dark",[page(INK),photo(M,150,W-2*M,440,s=1,mono=True),rect(M,606,W-2*M,16,OC),photo(M,638,W-2*M,440),head(W-M,1110,60,WH,mx=2,w=800),small("לפני",M+30,200,26,WH,align="left"),small("אחרי",M+30,690,26,WH,align="left")]))
    o.append(("קו רקיע","light",[page(PA),head(W-M,180,88,INK,mx=3,w=800),*sky(1200,SL),sub(W-M,600,28,GR,mx=2)]))
    o.append(("בלוק דיו על פינת צילום","light",[page(PA),photo(M,150,W-2*M,760),rect(M,760,620,420,INK),head(M+600,800,56,WH,align="right",maxW=560,mx=3,w=800),rect(M+40,1120,120,8,OC)]))
    o.append(("רצועת אוקר ימנית","light",[page(PA),rect(W-M-120,0,120,H,OC),vtext(W-M-60,700,26,INK,track=5),photo(M,150,W-2*M-180,620),head(W-M-170,820,72,INK,maxW=740,mx=3,w=800)]))
    o.append(("שני טורים","dark",[page(INK),photo(W/2+20,0,W/2-20,H),head(W/2-M,220,76,WH,maxW=W/2-2*M,mx=4,w=800),rect(W/2-M-160,780,160,8,OC),sub(W/2-M,820,26,"#c9d0d8",maxW=W/2-2*M,mx=3)]))
    o.append(("מספר אוקר ורצועת צילומים","light",[page(PA),otext(W-M,260,300,OC,lw=0),head(W-M,680,76,INK,mx=2,w=800),*[photo(M+i*((W-2*M-20)//2+20),960,(W-2*M-20)//2,240,s=i) for i in range(2)]]))
    o.append(("שלט רחוב","dark",[photo(0,0,W,H,dim=.4),rect(M,520,W-2*M,300,OC),head(W-M-30,570,70,INK,maxW=840,mx=2,w=800),rect(M,840,W-2*M,120,INK),sub(W-M-30,870,26,WH,maxW=840,mx=2)]))
    o.append(("קו רקיע על צילום","dark",[photo(0,0,W,H,fade=[0,.9],rgb="16,21,28"),*sky(1180,"rgba(255,255,255,.12)"),head(W-M,760,84,WH,mx=3,w=800)]))
    o.append(("נייר עם מספר מהדורה","light",[page(PA),label(W-M,170,22,SL,track=4),head(W-M,230,100,INK,mx=3,w=800),line(M,760,W-M,760,OC,3),sub(W-M,800,28,GR,mx=2),photo(M,980,W-2*M,220)]))
    o.append(("דיו, צילום עגול","dark",[page(INK),cphoto(W/2,440,250,stroke=OC,sw=8),head(W/2,760,76,WH,align="center",mx=2,w=800),sub(W/2,1000,26,"#c9d0d8",align="center",mx=1)]))
    o.append(("אוקר מלא","light",[page(OC),head(W-M,200,104,INK,mx=3,w=900),rect(M,760,W-2*M,440,INK),photo(M+14,774,W-2*M-28,412)]))
    o.append(("צילום מלא, בלוק דיו תחתון","dark",[photo(0,0,W,H),rect(0,900,W,450,INK),head(W-M,940,72,WH,mx=2,w=800),rect(W-M-140,1160,140,8,OC)]))
    o.append(("ישן וחדש, שני צילומים","light",[page(PA),photo(M,150,(W-2*M-20)//2,620,s=1,mono=True),photo(M+(W-2*M-20)//2+20,150,(W-2*M-20)//2,620),rect(M,790,W-2*M,10,OC),head(W-M,840,70,INK,mx=2,w=800),sub(W-M,1060,26,GR,mx=2)]))
    o.append(("כותרת על נייר, רשת","light",[page(PA),dots(M,150,W-2*M,1050,"#d8d0c2",step=40,rad=2),rect(M+40,340,W-2*M-80,660,PA),head(W-M-80,380,84,INK,maxW=760,mx=3,w=800),rect(W-M-80,820,120,8,OC),sub(W-M-80,860,26,GR,maxW=760,mx=2)]))
    o.append(("דיו, רשימה אוקר","dark",[page(INK),head(W-M,160,80,WH,mx=2,w=800),lst(W-M,440,WH,OC,rh=130,mx=5,size=34,w=600,rule="rgba(255,255,255,.15)")]))
    o.append(("צילום בחלון מסגרת","light",[page(PA),frame(60,60,W-120,H-120,INK,3),photo(140,140,W-280,640),head(W-M-60,840,70,INK,maxW=800,mx=3,w=800),marker(M+90,880,OC,rad=12)]))
    o.append(("ציר זמן של שכונה","light",[page(PA),head(W-M,160,80,INK,mx=2,w=800),timeline(W-M-30,480,150,5,3,OC,"#cfc7b8"),photo(M,440,480,760)]))
    o.append(("צל אוקר","light",[page(PA),rect(M+30,180,W-2*M,620,OC),photo(M,150,W-2*M,620),head(W-M,880,76,INK,mx=2,w=800),sub(W-M,1110,26,GR,mx=1)]))
    o.append(("צבעוני בנייני העיר","dark",[page(SL),*[rect(M+i*86,1200-h,70,h,c) for i,(h,c) in enumerate([(300,OC),(200,PA),(260,WH),(180,OC),(320,PA),(240,WH),(200,OC),(280,PA),(160,WH),(220,OC),(300,PA)])],head(W-M,180,88,WH,mx=3,w=800),sub(W-M,620,26,"#dfe4ea",mx=2)]))
    return [spec("altneuland",i+1,n,t,e) for i,(n,t,e) in enumerate(o)]

def dimri():
    B,T,WH,INK,L,O="#0a4d8c","#19a0b5","#ffffff","#0c1a2b","#e8f1f8","#f29a2e"
    o=[]
    o.append(("מסגרת כחולה סביב צילום","light",[page(B),photo(40,40,W-80,760),rect(40,800,W-80,510,WH),rect(40,800,W-80,12,T),head(W-80,850,62,INK,maxW=W-160,mx=3,w=800),sub(W-80,1080,26,"#4b5563",maxW=W-160,mx=2)]))
    o.append(("רצועת כותרת טורקיז","light",[page(WH),photo(0,0,W,820),rect(0,760,W,200,T),head(W-M,790,60,WH,mx=2,w=800),sub(W-M,1000,30,INK,mx=3)]))
    o.append(("כרטיס פרויקט","light",[page(L),rect(M,150,W-2*M,1050,WH,8),photo(M,150,W-2*M,600,r=8),head(W-M-30,800,64,INK,maxW=820,mx=2,w=800),rect(M+30,1000,W-2*M-60,2,"#dbe3ea"),sub(W-M-30,1030,26,"#4b5563",maxW=820,mx=2),pill(M+50,1120,O,INK,size=20,align="left")]))
    o.append(("תג כתום על כחול","dark",[page(B),pill(W-M,170,O,INK,size=24),head(W-M,260,96,WH,mx=3,w=800),photo(M,760,W-2*M,440,r=10)]))
    o.append(("בהיר, כותרת כחולה וקו טורקיז","light",[page(L),head(W-M,220,90,B,mx=3,w=800),rect(W-M-240,700,240,8,T),sub(W-M,760,30,INK,mx=2),photo(M,920,W-2*M,280,r=8)]))
    o.append(("בלוק כחול תחתון","light",[page(WH),photo(0,0,W,860),rect(0,860,W,490,B),head(W-M,910,72,WH,mx=2,w=800),rect(W-M-140,1150,140,8,O)]))
    tw=(W-2*M-40)//3
    o.append(("שלושה אריחי מפרט","light",[page(WH),head(W-M,150,80,INK,mx=2,w=800),photo(M,420,W-2*M,400,r=8),*[rect(M+i*(tw+20),860,tw,220,L,10) for i in range(3)],lst(W-M-20,880,INK,T,rh=70,mx=3,size=26,w=600,num=False)]))
    o.append(("כחול, קו כתום","dark",[page(B),head(W-M,200,104,WH,mx=3,w=800),rect(W-M-200,780,200,10,O),sub(W-M,840,30,"#cfe0ff",mx=2)]))
    o.append(("טורקיז מלא","light",[page(T),head(W-M,200,100,INK,mx=3,w=800),rect(M,760,W-2*M,440,WH,10),photo(M+14,774,W-2*M-28,412,r=6)]))
    o.append(("צילום עם מסגרת טורקיז","light",[page(WH),photo(M,150,W-2*M,700,stroke=T,sw=10),head(W-M,920,70,INK,mx=2,w=800),sub(W-M,1130,26,"#4b5563",mx=1)]))
    o.append(("כחול וצילום חצוי","dark",[page(B),photo(W/2,0,W/2,H),head(W/2-M,240,80,WH,maxW=W/2-2*M,mx=4,w=800),pill(W/2-M,880,O,INK,size=22)]))
    o.append(("בהיר, צילום עגול כחול","light",[page(L),cphoto(W/2,440,250,stroke=B,sw=10),head(W/2,760,76,INK,align="center",mx=2,w=800),sub(W/2,1000,26,"#4b5563",align="center",mx=1)]))
    o.append(("שלבים על כחול","dark",[page(B),head(W-M,180,84,WH,mx=2,w=800),steps(M+40,W-M-40,600,5,3,O,"rgba(255,255,255,.35)"),photo(M,720,W-2*M,480,r=8)]))
    o.append(("רצועה כחולה עליונה","light",[page(WH),rect(0,0,W,340,B),head(W-M,120,72,WH,mx=2,w=800),photo(M,400,W-2*M,540,r=8),sub(W-M,990,28,INK,mx=2)]))
    o.append(("לבן, רשימה טורקיז","light",[page(WH),head(W-M,160,80,INK,mx=2,w=800),lst(W-M,440,INK,T,rh=130,mx=5,size=34,w=600,check=True)]))
    o.append(("שני צילומים ורצועה","light",[page(L),photo(M,150,(W-2*M-20)//2,520,r=8),photo(M+(W-2*M-20)//2+20,150,(W-2*M-20)//2,520,s=1,r=8),rect(M,700,W-2*M,100,T),head(W-M,850,70,INK,mx=2,w=800),sub(W-M,1080,26,"#4b5563",mx=2)]))
    o.append(("כתום מלא","light",[page(O),head(W-M,220,104,INK,mx=3,w=800),rect(M,780,W-2*M,420,WH,10),photo(M+14,794,W-2*M-28,392,r=6)]))
    o.append(("מסגרת כחולה דקה","light",[page(WH),frame(50,50,W-100,H-100,B,6),head(W-M-20,200,84,INK,maxW=860,mx=3,w=800),photo(M+40,640,W-2*M-80,520,r=6)]))
    o.append(("צילום מלא, כרטיס לבן","dark",[photo(0,0,W,H,dim=.1),rect(M,820,W-2*M,380,WH,10),rect(M,820,W-2*M,12,T),head(W-M-30,870,64,INK,maxW=820,mx=2,w=800),sub(W-M-30,1060,26,"#4b5563",maxW=820,mx=2)]))
    o.append(("כחול, שני צילומים","dark",[page(B),photo(M,150,W-2*M,420,r=8),photo(M,600,W-2*M,300,s=1,r=8),head(W-M,950,66,WH,mx=2,w=800),rect(W-M-120,1160,120,8,O)]))
    return [spec("dimri",i+1,n,t,e) for i,(n,t,e) in enumerate(o)]

def africa():
    R,N,WH,INK,GR,L="#c8102e","#0d1b3e","#ffffff","#121212","#5f6670","#f3f4f6"
    o=[]
    o.append(("צילום ובלוק אדום","light",[page(WH),photo(0,0,W,740),rect(0,740,W,610,R),head(W-M,790,96,WH,mx=3,w=900)]))
    o.append(("בלוק כחול עם פס אדום","dark",[page(N),rect(W-M-30,180,30,560,R),head(W-M-70,180,100,WH,maxW=840,mx=3,w=900),sub(W-M-70,820,30,"#c9d2e6",maxW=840,mx=2),photo(M,980,W-2*M,220)]))
    o.append(("אלכסון אדום על צילום","dark",[photo(0,0,W,H,dim=.1),pphoto([(0,700),(W,520),(W,860),(0,1040)],dim=1),rect(0,0,0,0,R),head(W-M,760,80,WH,mx=2,w=900)]))
    o.append(("לבן, כותרת אדומה","light",[page(WH),head(W-M,200,110,R,mx=3,w=900,lh=1.0),rect(M,760,W-2*M,10,N),sub(W-M,820,30,INK,mx=2),photo(M,980,W-2*M,220)]))
    o.append(("מסגרת כחולה, פינה אדומה","light",[page(N),photo(50,50,W-100,780),rect(W-250,50,200,60,R),rect(50,830,W-100,470,WH),head(W-80,880,70,INK,maxW=W-160,mx=3,w=900)]))
    o.append(("אדום מלא","dark",[page(R),head(W-M,220,120,WH,mx=3,w=900,lh=1.0),photo(M,820,420,380)]))
    o.append(("חצי אדום חצי צילום","dark",[page(R),photo(0,0,W/2,H),head(W-M,260,84,WH,maxW=W/2-2*M,mx=4,w=900),sub(W-M,900,28,WH,maxW=W/2-2*M,mx=3)]))
    o.append(("כחול עם מספר אדום","dark",[page(N),otext(W-M,260,320,R,lw=0),head(W-M,700,84,WH,mx=2,w=900),sub(W-M,980,28,"#c9d2e6",mx=2)]))
    o.append(("צילום, כותרת שמנה לבנה","dark",[photo(0,0,W,H,fade=[0,.85],rgb="13,27,62"),head(W-M,800,110,WH,mx=3,w=900,lh=0.98),rect(W-M-160,1180,160,12,R)]))
    o.append(("לבן, שני בלוקים","light",[page(WH),rect(M,150,(W-2*M-20)//2,520,R),rect(M+(W-2*M-20)//2+20,150,(W-2*M-20)//2,520,N),head(W-M,740,84,INK,mx=2,w=900),photo(M,1000,W-2*M,200)]))
    o.append(("רצועה אדומה עליונה","light",[page(WH),rect(0,0,W,300,R),head(W-M,100,80,WH,mx=2,w=900),photo(M,360,W-2*M,560),sub(W-M,980,28,INK,mx=2)]))
    o.append(("כחול, צילום בחלון","dark",[page(N),photo(M,150,W-2*M,560),rect(M,710,W-2*M,16,R),head(W-M,780,80,WH,mx=3,w=900)]))
    o.append(("כותרת על צילום עם רצועה כחולה","dark",[photo(0,0,W,H,dim=.2),rect(0,560,W,320,N),head(W-M,600,76,WH,mx=2,w=900),rect(W-M-120,840,120,10,R)]))
    o.append(("לבן, כותרת כחולה ענקית","light",[page(WH),head(W-M,180,120,N,mx=3,w=900,lh=1.0),rect(M,860,W-2*M,16,R),photo(M,920,W-2*M,280)]))
    o.append(("צילום עגול על אדום","dark",[page(R),cphoto(W/2,440,250,stroke=WH,sw=12),head(W/2,760,84,WH,align="center",mx=2,w=900)]))
    o.append(("אלכסון כחול","light",[page(WH),pphoto([(0,0),(W,0),(W,620),(0,820)],s=0),rect(0,0,0,0,N),head(W-M,900,84,INK,mx=2,w=900),rect(W-M-140,1160,140,10,R)]))
    o.append(("רשימה אדומה על כחול","dark",[page(N),head(W-M,160,80,WH,mx=2,w=900),lst(W-M,440,WH,R,rh=130,mx=5,size=34,w=600)]))
    o.append(("שלושה צילומים, פס אדום","light",[page(WH),*[photo(M+i*((W-2*M-40)//3+20),150,(W-2*M-40)//3,400,s=i) for i in range(3)],rect(M,580,W-2*M,14,R),head(W-M,640,84,INK,mx=2,w=900),sub(W-M,920,28,GR,mx=2)]))
    o.append(("אפור בהיר, בלוק אדום קטן","light",[page(L),rect(M,150,300,300,R),head(W-M,180,80,INK,maxW=600,mx=3,w=900),photo(M,520,W-2*M,560),sub(W-M,1120,26,GR,mx=1)]))
    o.append(("כחול, שני צילומים ופס","dark",[page(N),photo(M,150,(W-2*M-20)//2,560),photo(M+(W-2*M-20)//2+20,150,(W-2*M-20)//2,560,s=1),rect(M,740,W-2*M,12,R),head(W-M,800,76,WH,mx=3,w=900)]))
    return [spec("africa",i+1,n,t,e) for i,(n,t,e) in enumerate(o)]

def israelcanada():
    K,GD,WH,INK,GR,CR="#0b0b0b","#c9a961","#ffffff","#111111","#9a9a9a","#f5f1ea"
    o=[]
    o.append(("שחור, מסגרת זהב, מרכז","dark",[page(K),frame(70,70,W-140,H-140,GD,1,inner=12),head(W/2,480,84,WH,align="center",mx=3,w=500),sub(W/2,900,24,GD,align="center",mx=1)]))
    o.append(("צילום כהה, קו זהב","dark",[photo(0,0,W,H,dim=.45),line(W/2-120,480,W/2+120,480,GD,1.5),head(W/2,520,80,WH,align="center",mx=3,w=500),line(W/2-120,960,W/2+120,960,GD,1.5)]))
    o.append(("קרם, קו זהב, כותרת שחורה","light",[page(CR),line(M,220,W-M,220,GD,1.5),head(W/2,280,80,INK,align="center",mx=3,w=500),photo(M,720,W-2*M,480)]))
    o.append(("עיגול זהב","dark",[page(K),marker(W/2,420,GD,rad=110),head(W/2,620,76,WH,align="center",mx=3,w=500),sub(W/2,1000,24,GR,align="center",mx=1)]))
    o.append(("צילום במסגרת זהב ורצועה","dark",[page(K),frame(110,130,W-220,760,GD,1),photo(128,148,W-256,724),rect(0,980,W,370,"#141414"),head(W/2,1020,56,WH,align="center",mx=2,w=500),sub(W/2,1180,22,GD,align="center",mx=1)]))
    o.append(("מספר זהב ענק","dark",[page(K),otext(W/2,280,320,GD,align="center",lw=0),head(W/2,700,72,WH,align="center",mx=2,w=500),sub(W/2,960,24,GR,align="center",mx=2)]))
    o.append(("תווית זהב, כותרת, צילום למטה","dark",[page(K),label(W/2,170,20,GD,align="center",track=5),head(W/2,260,88,WH,align="center",mx=3,w=500),photo(M,760,W-2*M,440)]))
    o.append(("קרם, צילום עגול","light",[page(CR),cphoto(W/2,440,250,stroke=GD,sw=2),head(W/2,760,68,INK,align="center",mx=2,w=500),line(W/2-60,980,W/2+60,980,GD,1.5),sub(W/2,1010,22,"#6b6b6b",align="center",mx=1)]))
    o.append(("שחור, צילום ימני צר","dark",[page(K),photo(W-M-380,150,380,1060),head(W-M-430,220,64,WH,maxW=520,mx=4,w=500),line(W-M-430,760,W-M-630,760,GD,1.5),sub(W-M-430,800,22,GR,maxW=520,mx=3)]))
    o.append(("צילום מלא, תווית זהב","dark",[photo(0,0,W,H,fade=[.0,.8],rgb="0,0,0"),label(W/2,170,20,GD,align="center",track=6),head(W/2,860,76,WH,align="center",mx=3,w=500)]))
    o.append(("קרם עם מסגרת זהב כפולה","light",[page(CR),frame(60,60,W-120,H-120,GD,1,inner=14),head(W/2,300,84,INK,align="center",mx=3,w=500),photo(200,720,680,440)]))
    o.append(("שחור, שני קווי זהב אנכיים","dark",[page(K),line(M,150,M,1210,GD,1),line(W-M,150,W-M,1210,GD,1),head(W/2,420,88,WH,align="center",mx=3,w=500),sub(W/2,900,24,GR,align="center",mx=2)]))
    o.append(("קרם, כותרת ימנית","light",[page(CR),head(W-M,220,84,INK,mx=3,w=500),line(W-M,700,W-M-140,700,GD,1.5),sub(W-M,740,24,"#6b6b6b",mx=2),photo(M,900,W-2*M,300)]))
    o.append(("שחור, שני צילומים ומסגרת","dark",[page(K),photo(M,150,(W-2*M-30)//2,640),photo(M+(W-2*M-30)//2+30,150,(W-2*M-30)//2,640,s=1),line(M,830,W-M,830,GD,1),head(W/2,880,64,WH,align="center",mx=2,w=500)]))
    o.append(("זהב מלא","light",[page(GD),head(W/2,300,96,K,align="center",mx=3,w=500),rect(200,760,680,440,K),photo(214,774,652,412)]))
    o.append(("צילום כהה, כרטיס שחור","dark",[photo(0,0,W,H,dim=.2),rect(M,780,W-2*M,420,K),frame(M+20,800,W-2*M-40,380,GD,1),head(W/2,850,60,WH,align="center",mx=2,w=500),sub(W/2,1050,22,GD,align="center",mx=1)]))
    o.append(("קרם, רשימה עם קווי זהב","light",[page(CR),head(W/2,180,72,INK,align="center",mx=2,w=500),lst(W-M,460,INK,GD,rh=120,mx=5,size=30,w=500,rule=GD,num=False)]))
    o.append(("שחור, ציטוט זהב","dark",[page(K),small("״",W/2,330,220,GD,align="center",w=700),head(W/2,420,72,WH,align="center",mx=3,w=500,lh=1.2),line(W/2-60,920,W/2+60,920,GD,1.5),sub(W/2,950,22,GR,align="center",mx=1)]))
    o.append(("מסגרת זהב על צילום","dark",[photo(0,0,W,H,dim=.35),frame(120,180,W-240,800,GD,1.5),head(W/2,480,76,WH,align="center",mx=3,w=500),sub(W/2,1080,22,GD,align="center",mx=1)]))
    o.append(("שחור, קו רקיע זהב","dark",[page(K),*[rect(M+i*86,1210-h,70,h,"#1d1a14") for i,h in enumerate([120,200,160,260,140,220,180,300,150,210,170])],line(M,1210,W-M,1210,GD,1),head(W/2,300,88,WH,align="center",mx=3,w=500),sub(W/2,760,24,GD,align="center",mx=1)]))
    return [spec("israelcanada",i+1,n,t,e) for i,(n,t,e) in enumerate(o)]

def shikunbinui():
    G,B,WH,INK,L,Y="#0f8a5f","#1b4f9c","#ffffff","#13202b","#eef5f1","#f4c531";GD="#0a7048"
    o=[]
    o.append(("רצועה ירוקה עליונה","light",[page(WH),rect(0,0,W,360,GD),head(W-M,160,76,WH,mx=2,w=800),photo(M,420,W-2*M,540,r=20),sub(W-M,1010,28,INK,mx=2)]))
    o.append(("כרטיס ירוק מעוגל על צילום","dark",[photo(0,0,W,H,dim=.15),rect(M,760,W-2*M,440,G,28),head(W-M-30,800,66,WH,maxW=820,mx=2,w=800),sub(W-M-30,990,26,"#dff3ea",maxW=820,mx=2)]))
    o.append(("כחול עם קו ירוק","dark",[page(B),rect(W-M-220,700,220,10,G),head(W-M,220,100,WH,mx=3,w=800),sub(W-M,760,30,"#cfe0ff",mx=2),photo(M,920,W-2*M,280,r=16)]))
    o.append(("בהיר, כותרת ירוקה","light",[page(L),head(W-M,200,96,GD,mx=3,w=800),photo(M,700,W-2*M,500,r=24)]))
    tw=(W-2*M-40)//3
    o.append(("שלושה אריחים ירוקים","light",[page(WH),head(W-M,150,80,INK,mx=2,w=800),photo(M,420,W-2*M,400,r=20),*[rect(M+i*(tw+20),860,tw,220,G,16) for i in range(3)],lst(W-M-20,880,WH,Y,rh=70,mx=3,size=26,w=600,num=False)]))
    o.append(("תג צהוב על כחול","dark",[page(B),pill(W-M,170,Y,INK,size=24),head(W-M,260,96,WH,mx=3,w=800),photo(M,760,W-2*M,440,r=24)]))
    o.append(("אלכסון ירוק","light",[page(WH),photo(0,0,W,800),pphoto([(0,700),(W,560),(W,620),(0,760)],dim=1),rect(0,0,0,0,G),rect(0,760,W,590,WH),head(W-M,820,76,INK,mx=2,w=800),sub(W-M,1060,26,"#4b5563",mx=2)]))
    o.append(("צילום למטה, כותרת כחולה","light",[page(WH),head(W-M,200,92,B,mx=3,w=800),rect(W-M-160,700,160,10,G),photo(M,760,W-2*M,440,r=24)]))
    o.append(("ירוק מלא","dark",[page(GD),head(W-M,220,104,WH,mx=3,w=800),rect(M,780,W-2*M,420,WH,24),photo(M+16,796,W-2*M-32,388,r=16)]))
    o.append(("צילום עגול ירוק","light",[page(L),cphoto(W/2,440,250,stroke=G,sw=10),head(W/2,760,76,INK,align="center",mx=2,w=800),sub(W/2,1000,26,"#4b5563",align="center",mx=1)]))
    o.append(("רשימה עם וי ירוק","light",[page(WH),head(W-M,160,80,INK,mx=2,w=800),rect(M,430,W-2*M,760,L,24),lst(W-M-30,470,INK,G,rh=130,mx=5,size=34,w=600,num=False,check=True)]))
    o.append(("שני צילומים, רצועה צהובה","light",[page(WH),photo(M,150,(W-2*M-20)//2,520,r=20),photo(M+(W-2*M-20)//2+20,150,(W-2*M-20)//2,520,s=1,r=20),rect(M,700,W-2*M,16,Y,8),head(W-M,760,72,INK,mx=2,w=800),sub(W-M,1000,26,"#4b5563",mx=2)]))
    o.append(("כחול, שלבים ירוקים","dark",[page(B),head(W-M,180,84,WH,mx=2,w=800),steps(M+40,W-M-40,600,5,3,G,"rgba(255,255,255,.35)"),photo(M,720,W-2*M,480,r=20)]))
    o.append(("צהוב מלא","light",[page(Y),head(W/2,220,104,INK,align="center",mx=3,w=800),cphoto(W/2,900,260,stroke=WH,sw=12)]))
    o.append(("מסגרת ירוקה מעוגלת","light",[page(WH),rect(40,40,W-80,H-80,G,36),rect(70,70,W-140,H-140,WH,28),head(W-M-20,220,84,INK,maxW=840,mx=3,w=800),photo(M+40,660,W-2*M-80,500,r=20)]))
    o.append(("צילום מלא, כרטיס לבן","dark",[photo(0,0,W,H,dim=.1),rect(M,820,W-2*M,380,WH,24),rect(M+30,860,120,10,G,5),head(W-M-30,890,62,INK,maxW=820,mx=2,w=800),sub(W-M-30,1070,26,"#4b5563",maxW=820,mx=1)]))
    o.append(("בהיר, בלוק כחול קטן","light",[page(L),rect(W-M-320,150,320,320,B,24),head(W-M-360,180,72,INK,maxW=560,mx=3,w=800),photo(M,520,W-2*M,560,r=24),sub(W-M,1120,26,"#4b5563",mx=1)]))
    o.append(("כותרת ממורכזת ושלוש נקודות","light",[page(WH),head(W/2,300,92,INK,align="center",mx=3,w=800),*[marker(W/2-80+i*80,760,c,rad=22) for i,c in enumerate([G,B,Y])],sub(W/2,860,28,"#4b5563",align="center",mx=2),photo(M,1000,W-2*M,200,r=16)]))
    o.append(("ירוק, שני צילומים","dark",[page(GD),photo(M,150,W-2*M,420,r=16),photo(M,600,W-2*M,300,s=1,r=16),head(W-M,950,66,WH,mx=2,w=800),rect(W-M-120,1160,120,8,Y,4)]))
    o.append(("כחול וירוק חצוי","dark",[page(B),rect(0,700,W,650,GD),head(W-M,200,96,WH,mx=3,w=800),photo(M,760,W-2*M,440,r=20)]))
    return [spec("shikunbinui",i+1,n,t,e) for i,(n,t,e) in enumerate(o)]

def archmag():
    WH,K,INK,GR,PA,R="#ffffff","#000000","#111111","#666666","#f4f2ee","#d0021b"
    o=[]
    o.append(("צילום עם שוליים רחבים","light",[page(WH),photo(140,150,800,760),small("",W-140,940,20,GR),head(W-140,960,56,INK,maxW=800,mx=2,w=800),sub(W-140,1120,20,GR,maxW=800,mx=1)]))
    o.append(("רצועת שחור כמסתד","light",[page(WH),rect(0,0,W,260,K),head(W-M,80,76,WH,mx=2,w=900),photo(M,320,W-2*M,640),sub(W-M,1000,22,GR,mx=2)]))
    o.append(("שני צילומים וקו דק","light",[page(WH),photo(M,150,(W-2*M-30)//2,640),photo(M+(W-2*M-30)//2+30,150,(W-2*M-30)//2,640,s=1),line(W/2,150,W/2,790,K,1),head(W-M,840,64,INK,mx=2,w=900),sub(W-M,1030,20,GR,mx=2)]))
    o.append(("כותרת ענקית, צילום גולש","light",[page(WH),head(W-M,160,120,INK,mx=3,w=900,lh=0.98),photo(0,760,W,590)]))
    o.append(("נייר, מספר גיליון אדום","light",[page(PA),small("No. 07",W-M,180,22,R,ltr=True),line(M,220,W-M,220,K,1),head(W-M,270,92,INK,mx=3,w=900),photo(M,780,W-2*M,420)]))
    o.append(("צילום מלא, כרטיס לבן","dark",[photo(0,0,W,H),rect(M,900,W-2*M,300,WH),head(W-M-30,940,52,INK,maxW=820,mx=2,w=800),sub(W-M-30,1100,20,GR,maxW=820,mx=1)]))
    o.append(("רשת שלושה צילומים","light",[page(WH),head(W-M,160,80,INK,mx=2,w=900),*[photo(M+i*((W-2*M-40)//3+20),460,(W-2*M-40)//3,460,s=i) for i in range(3)],line(M,980,W-M,980,K,1),sub(W-M,1010,20,GR,mx=2)]))
    o.append(("טור כותרת, צילום גבוה","light",[page(WH),photo(M,150,520,1060),head(W-M,180,60,INK,maxW=380,mx=5,w=900,lh=1.1),line(W-M-380,760,W-M,760,K,1),sub(W-M,790,20,GR,maxW=380,mx=4)]))
    o.append(("שחור מלא, כותרת לבנה ענקית","dark",[page(K),head(W-M,220,130,WH,mx=3,w=900,lh=0.98),line(M,1120,W-M,1120,WH,1),sub(W-M,1150,20,"#bbbbbb",mx=1)]))
    o.append(("קו אדום דק ואוויר","light",[page(WH),line(W-M-220,300,W-M,300,R,3),head(W-M,340,96,INK,mx=3,w=900),sub(W-M,880,22,GR,mx=2)]))
    o.append(("צילום קטן, כיתוב זעיר","light",[page(WH),photo(W-M-480,150,480,600),small("",W-M,790,18,GR),head(W-M,820,64,INK,mx=3,w=900),sub(W-M,1100,20,GR,mx=1)]))
    o.append(("נייר, שני טורי טקסט","light",[page(PA),head(W-M,180,84,INK,mx=3,w=900),line(M,640,W-M,640,K,1),sub(W-M,680,22,INK,maxW=420,mx=5,lh=1.5),photo(M,680,440,520)]))
    o.append(("שחור ולבן חצוי","light",[page(WH),rect(0,0,W/2,H,K),photo(W/2+M/2,150,W/2-M-M/2,700),head(W/2-M,220,64,WH,maxW=W/2-2*M,mx=4,w=900),sub(W-M,900,20,GR,maxW=W/2-2*M,mx=2)]))
    o.append(("צילום מלא, שוליים לבנים","light",[page(WH),photo(60,60,W-120,900),line(60,1000,W-60,1000,K,1),head(W-60,1030,56,INK,maxW=W-120,mx=2,w=800),sub(W-60,1190,18,GR,maxW=W-120,mx=1)]))
    o.append(("מילה אדומה ענקית","light",[page(WH),otext(W-M,300,280,R,lw=0),head(W-M,660,76,INK,mx=2,w=900),line(M,980,W-M,980,K,1),sub(W-M,1010,20,GR,mx=2)]))
    o.append(("כותרת ממורכזת, צילום רבוע","light",[page(PA),head(W/2,180,80,INK,align="center",mx=2,w=900),photo(240,480,600,600),sub(W/2,1130,20,GR,align="center",mx=1)]))
    o.append(("צילום עגול, מגזין","light",[page(WH),cphoto(W/2,460,260),line(W/2-100,780,W/2+100,780,K,1),head(W/2,820,66,INK,align="center",mx=2,w=900),sub(W/2,1040,20,GR,align="center",mx=1)]))
    o.append(("ארבעה צילומים קטנים","light",[page(WH),head(W-M,150,72,INK,mx=2,w=900),*[photo(M+(i%2)*((W-2*M-20)//2+20),420+(i//2)*360,(W-2*M-20)//2,340,s=i) for i in range(3)],rect(M+(W-2*M-20)//2+20,780,(W-2*M-20)//2,340,K)]))
    o.append(("שחור, צילום ממוסגר לבן","dark",[page(K),photo(M,150,W-2*M,700,stroke=WH,sw=2),head(W-M,920,64,WH,mx=2,w=900),sub(W-M,1120,20,"#bbbbbb",mx=1)]))
    o.append(("קו רקיע שחור דק","light",[page(WH),head(W-M,170,92,INK,mx=3,w=900),*[rect(M+i*86,1210-h,70,h,K) for i,h in enumerate([120,200,160,260,140,220,180,300,150,210,170])],sub(W-M,700,22,GR,mx=2)]))
    return [spec("archmag",i+1,n,t,e) for i,(n,t,e) in enumerate(o)]

def igre():
    WH,K,INK,LM,GR,CR,N="#ffffff","#000000","#141414","#c6ff3d","#6b6b6b","#f7f4ee","#101c2c"
    o=[]
    o.append(("הוק ענק, מרקר ליים","dark",[photo(0,0,W,H,fade=[.1,.85],rgb="0,0,0"),caption(W-M,760,72,LM,INK,mx=3,lh=1.2,r=4)]))
    o.append(("לבן, כותרת שחורה, פיל ליים","light",[page(WH),pill(W-M,170,LM,INK,size=24),head(W-M,260,110,INK,mx=3,w=900,lh=1.0),photo(M,780,W-2*M,420,r=20)]))
    o.append(("כרטיס שחור וחץ ליים","dark",[photo(0,0,W,H,dim=.2),rect(M,780,W-2*M,420,K,20),head(W-M-30,820,66,WH,maxW=820,mx=2,w=900),{"t":"arrow","x":M+40,"y":1130,"col":LM,"len":90,"lw":5}]))
    o.append(("החליקו עם כותרת למעלה","light",[page(WH),head(W-M,170,96,INK,mx=3,w=900),photo(M,660,W-2*M,480,r=20),swipe(M,1200,INK)]))
    o.append(("שחור, כותרת ליים","dark",[page(K),head(W-M,220,110,LM,mx=3,w=900,lh=1.0),photo(M,800,420,400,r=16),sub(W-M,820,28,WH,maxW=460,mx=3)]))
    o.append(("מדבקת ליים מוטה","dark",[photo(0,0,W,H,fade=[0,.75],rgb="0,0,0"),sticker(W-M-150,220,LM,INK,"חדש בשוק",rot=-8,size=34),caption(W-M,880,64,WH,INK,mx=3)]))
    o.append(("חצי צילום חצי קרם","light",[page(CR),photo(0,0,W/2,H),head(W-M,220,80,INK,maxW=W/2-2*M,mx=4,w=900),pill(W-M,860,K,LM,size=22)]))
    o.append(("סימן שאלה ענק","light",[page(WH),rect(W-M-260,150,260,360,K,24),small("?",W-M-30,440,300,LM,w=900,shadow=True),head(W-M,560,88,INK,mx=3,w=900),sub(W-M,1000,30,GR,mx=2)]))
    o.append(("לפני ואחרי ליים","dark",[page(K),photo(M,150,W-2*M,440,s=1,mono=True),rect(M,606,W-2*M,16,LM),photo(M,638,W-2*M,440),caption(W-M,1100,64,LM,INK,mx=1,lh=1.1,r=4),sticker(M+90,190,WH,INK,"לפני",rot=-6,size=26),sticker(M+90,680,LM,INK,"אחרי",rot=-6,size=26)]))
    o.append(("כחול לילה, מדבקה","dark",[page(N),head(W-M,220,100,WH,mx=3,w=900),sticker(M+160,780,LM,INK,"שמרו",rot=6,size=32),photo(M,860,W-2*M,340,r=16)]))
    o.append(("רשימה עם מספרי ליים","dark",[page(K),head(W-M,160,80,WH,mx=2,w=900),lst(W-M,440,WH,LM,rh=130,mx=5,size=36,w=600)]))
    o.append(("צילום מלא, שלוש כתוביות","dark",[photo(0,0,W,H,dim=.4),caption(W-M,520,64,WH,INK,mx=3,lh=1.25),caption(W-M,900,32,LM,INK,f="sub",mx=2,lh=1.25)]))
    o.append(("לבן, שני צילומים ופיל","light",[page(WH),photo(M,150,(W-2*M-20)//2,520,r=16),photo(M+(W-2*M-20)//2+20,150,(W-2*M-20)//2,520,s=1,r=16),pill(W-M,720,LM,INK,size=24),head(W-M,800,76,INK,mx=2,w=900)]))
    o.append(("סקר ליים","dark",[page(K),head(W-M,170,80,WH,mx=2,w=900),poll(M,560,W-2*M,120,LM,K,LM,size=34),photo(M,880,W-2*M,320,r=16)]))
    o.append(("צילום עגול ומרקר","light",[page(WH),cphoto(W/2,420,240,stroke=LM,sw=14),head(W/2,720,84,INK,align="center",mx=2,w=900),pill(W/2,980,K,LM,size=24,align="center")]))
    o.append(("חץ גדול לצד הכותרת","light",[page(CR),head(W-M,220,96,INK,mx=3,w=900),{"t":"arrow","x":M+30,"y":760,"col":INK,"len":140,"lw":6},photo(M,860,W-2*M,340,r=16)]))
    o.append(("קרם, מסגרת שחורה","light",[page(CR),frame(50,50,W-100,H-100,K,6),head(W-M-20,200,88,INK,maxW=860,mx=3,w=900),rect(W-M-240,760,240,16,LM),photo(M+40,820,W-2*M-80,340,r=8)]))
    o.append(("שחור עם רשת נקודות ליים","dark",[page(K),dots(M,150,W-2*M,1050,"rgba(198,255,61,.3)",step=36,rad=2.5),rect(M+40,400,W-2*M-80,560,K),head(W-M-60,440,96,WH,maxW=840,mx=3,w=900),pill(W-M-60,1000,LM,INK,size=24)]))
    o.append(("כתובית ליים גדולה למטה","dark",[photo(0,0,W,H,fade=[0,.8],rgb="0,0,0"),head(W-M,860,104,LM,mx=3,w=900,lh=1.0),counter(M,H-130,"1/4",WH,size=24)]))
    o.append(("חותמת ליים","dark",[photo(0,0,W,H,dim=.3),stamp(W/2,480,LM,"חדש",size=120,rot=-12),head(W-M,900,80,WH,mx=2,w=900)]))
    return [spec("igre",i+1,n,t,e) for i,(n,t,e) in enumerate(o)]

def kinfolk():
    PA,INK,GR,WH,CL="#f3f0ea","#1a1a1a","#5e5953","#ffffff","#b58a6a"
    o=[]
    o.append(("צילום קטן ממורכז","light",[page(PA),photo(300,200,480,560),head(W/2,850,56,INK,align="center",mx=2,w=500),sub(W/2,1030,20,GR,align="center",mx=1)]))
    o.append(("שני צילומים קטנים","light",[page(PA),photo(M+60,230,400,480),photo(W-M-60-400,230,400,480,s=1),line(W/2,230,W/2,710,CL,1),head(W/2,800,52,INK,align="center",mx=2,w=500),sub(W/2,970,20,GR,align="center",mx=1)]))
    o.append(("כותרת למעלה, צילום למטה","light",[page(PA),head(W/2,220,60,INK,align="center",mx=2,w=500),sub(W/2,420,20,GR,align="center",mx=1),photo(240,560,600,620)]))
    o.append(("צילום שמאלי, טור צר","light",[page(PA),photo(M,150,520,980),head(W-M,300,48,INK,maxW=360,mx=4,w=500,lh=1.2),sub(W-M,700,19,GR,maxW=360,mx=4,lh=1.6)]))
    o.append(("קו חרס, כותרת, כיתוב","light",[page(PA),line(W/2-30,300,W/2+30,300,CL,1.5),head(W/2,340,64,INK,align="center",mx=3,w=500),sub(W/2,760,20,GR,align="center",mx=2),photo(300,900,480,300)]))
    o.append(("צילום מלא, כיתוב לבן זעיר","dark",[photo(0,0,W,H,dim=.2),head(W/2,980,44,WH,align="center",mx=2,w=500),sub(W/2,1120,18,"#efeae0",align="center",mx=1)]))
    o.append(("לבן, שוליים ענקיים","light",[page(WH),photo(260,260,560,620),head(W/2,960,48,INK,align="center",mx=2,w=500),sub(W/2,1120,18,GR,align="center",mx=1)]))
    o.append(("תווית חרס, שני צילומים","light",[page(PA),label(W/2,170,22,"#7a5538",align="center",track=5),head(W/2,230,56,INK,align="center",mx=2,w=500),photo(M+40,520,420,520),photo(W-M-40-420,600,420,520,s=1)]))
    o.append(("נייר, כותרת בלבד","light",[page(PA),head(W/2,520,60,INK,align="center",mx=3,w=500,lh=1.25),line(W/2-30,920,W/2+30,920,CL,1.5)]))
    o.append(("צילום עגול קטן","light",[page(PA),cphoto(W/2,420,170),head(W/2,660,52,INK,align="center",mx=2,w=500),sub(W/2,840,19,GR,align="center",mx=2)]))
    o.append(("צילום רחב ושטוח","light",[page(PA),photo(M,320,W-2*M,420),head(W/2,820,52,INK,align="center",mx=2,w=500),sub(W/2,1000,19,GR,align="center",mx=1)]))
    o.append(("לבן, צילום ימני, כותרת שמאלית","light",[page(WH),photo(W-M-420,150,420,560),head(M,760,64,INK,align="left",maxW=600,mx=2,w=500,lh=1.2),sub(M,960,28,GR,align="left",maxW=600,mx=2)]))
    o.append(("חרס כהה, כותרת לבנה","dark",[page("#8a5f40"),head(W/2,420,64,WH,align="center",mx=3,w=500),sub(W/2,880,28,"#f6ebe2",align="center",mx=1)]))
    o.append(("שלושה צילומים זעירים","light",[page(PA),*[photo(M+120+i*(260+40),300,260,320,s=i) for i in range(3)],head(W/2,720,52,INK,align="center",mx=2,w=500),sub(W/2,900,19,GR,align="center",mx=1)]))
    o.append(("צילום עם כיתוב מספור","light",[page(PA),photo(180,150,720,760),counter(180,950,"01 / 06",CL,size=18),head(W-180,1000,48,INK,maxW=720,mx=2,w=500)]))
    o.append(("כותרת דקה בין שני קווים","light",[page(PA),line(M,420,W-M,420,CL,1),head(W/2,480,56,INK,align="center",mx=2,w=500),line(M,760,W-M,760,CL,1),photo(300,840,480,340)]))
    o.append(("נייר, צילום בפינה תחתונה","light",[page(PA),head(W/2,260,60,INK,align="center",mx=3,w=500),photo(W-M-420,760,420,420)]))
    o.append(("ציטוט חרס קטן","light",[page(PA),small("״",W/2,360,160,"#7a5538",align="center",w=500),head(W/2,420,54,INK,align="center",mx=3,w=500,lh=1.3),sub(W/2,900,18,GR,align="center",mx=1)]))
    o.append(("לבן, שני צילומים אנכיים","light",[page(WH),photo(M+80,150,340,760),photo(W-M-80-340,150,340,760,s=1),head(W/2,980,48,INK,align="center",mx=2,w=500)]))
    o.append(("צילום מלא רך, כותרת למעלה","light",[photo(0,0,W,H,fade=[.85,0],rgb="243,240,234"),head(W/2,200,56,INK,align="center",mx=2,w=500),sub(W/2,380,18,GR,align="center",mx=1)]))
    return [spec("kinfolk",i+1,n,t,e) for i,(n,t,e) in enumerate(o)]

def _clamp(specs):
    for s in specs:
        for e in s["el"]:
            if e.get("t")=="text" and not e.get("kind"):
                if e.get("f")=="head":e["size"]=max(64,e["size"])
                if e.get("f")=="sub":e["size"]=max(28,e["size"])
            if e.get("t")=="text" and e.get("kind")=="small" and e.get("f")=="label":e["size"]=max(22,e["size"])
    return specs
if __name__=="__main__":
    for fn in (tidhar,gabay,electra,prashkovsky,altneuland,dimri,africa,israelcanada,shikunbinui,archmag,igre,kinfolk):
        s=_clamp(fn());json.dump(s,open(f"canva/author2/{fn.__name__}.json","w"),ensure_ascii=False);print(fn.__name__,len(s))
