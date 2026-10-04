import shutil
P='ce15.html'
s=open(P,encoding='utf8').read()
if 'V130 ·' in s: raise SystemExit('already built')
shutil.copy(P,'ce15.bak130')
def rep(a,b):
    global s
    assert s.count(a)==1,(s.count(a),a[:80]); s=s.replace(a,b)
M='// ================= V83 · safe external opener'
# sharper tray thumbnails
rep("const c=document.createElement('canvas'),k=160/Math.max(it.w,it.h)","const c=document.createElement('canvas'),k=400/Math.max(it.w,it.h)")
# big videos: compressed in the browser, never refused
rep("x.size>20*1024*1024?' · מעל 20MB, ייצוא מקומי בלבד':''","x.size>20*1024*1024?' · '+(x.size/1048576).toFixed(0)+'MB, יידחס אוטומטית בשליחה':''")
rep("const big=items.filter(x=>x.size>20*1024*1024);if(big.length){toastSafe(`${big.length} סרטונים גדולים מ-20MB. לעורך עולים רק עד 20MB; אותם אפשר לייצא כאן`);}","")
rep("const ok=items.filter(x=>x.size<=20*1024*1024);if(!ok.length)return;","const ok=items;if(!ok.length)return;")
rep("const r=await VD.assets.upload(it.file);parts.push","const r=await VD.assets.upload(window.__v128?await __v128.shrink(it.file):it.file);parts.push")
rep("if(file.size>20*1024*1024){toastSafe('הסרטון גדול מ-20MB. קצרו אותו או דחסו אותו ונסו שוב');return null}",
    "if(file.size>19.5*1024*1024){toastSafe('הסרטון גדול מ-20MB. דוחס אותו בדפדפן לפני ההעלאה, זה לוקח כאורך הסרטון');try{file=await window.__v128.shrink(file)}catch(e){toastSafe('הדחיסה נכשלה: '+(e&&e.message||e));return null}}")
rep("if(o.size>20*1024*1024){toastSafe('הקובץ גדול מ-20MB. בחרו \"מהיר\" בפורמט וייצאו שוב');return}",
    "if(o.size>19.5*1024*1024){toastSafe('הקובץ גדול מ-20MB. דוחס לפני השמירה…');try{const f2=await __v128.shrink(new File([o.blob],o.file,{type:o.type}));o=Object.assign({},o,{blob:f2,type:f2.type,file:f2.name,size:f2.size})}catch(e){toastSafe('הדחיסה נכשלה: '+(e&&e.message||e));return}}")
# clear words on the buttons
rep('data-v128="plan" ${n&&opts.length&&!busy?\'\':\'disabled\'}>שליחה לתוכנית<','data-v128="plan" ${n&&opts.length&&!busy?\'\':\'disabled\'}>התחלת עריכה<')
rep("<button type=\"button\" class=\"v129go\" data-v129=\"open\" data-tray=\"${id}\">עריכה</button>","<button type=\"button\" class=\"v129go\" data-v129=\"open\" data-tray=\"${id}\">התחלת עריכה</button>")
rep("window.__v129={open,openFromTray,openFromDoc,E,PROJ:()=>PROJ,frameAt,seq};","window.__v129={open,openFromTray,openFromDoc,E,PROJ:()=>PROJ,frameAt,seq,play,doExport,sendPro,refresh};")
s=s.replace(M,open('v130.js',encoding='utf8').read()+'\n'+M).replace('</head>',open('k130css.txt',encoding='utf8').read()+'</head>')
open(P,'w',encoding='utf8').write(s);print('ok',len(s))
