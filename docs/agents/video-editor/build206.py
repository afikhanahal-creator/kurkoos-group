import os,sys
H=os.path.dirname(os.path.abspath(__file__))
P=sys.argv[1] if len(sys.argv)>1 else 'ce15.html'
s=open(P,encoding='utf8').read()
# V206: the shared image component (KImg), image replacement from the canvas, and fixes to the base image code.
def rep(a,b,n=1):
    global s
    if b in s and a not in s: return  # already applied
    assert s.count(a)==n,(a[:80],s.count(a));s=s.replace(a,b)
# 1. crop: the focus point (r[4], r[5]) is a position in the whole image, so the window is centred on it; and a real "fit" mode
rep("""  if(sa>da){const nw=sh*da;sx+=(sw-nw)*(r[4]??.5);sw=nw}else{const nh=sw/da;sy+=(sh-nh)*(r[5]??.5);sh=nh}
  c.drawImage(img,sx,sy,sw,sh,x,y,w,h);return true}""","""  if(fit==='contain'){c.save();try{c.filter='blur(18px) brightness(.62)';const ca=iw/ih;let bw=w,bh=w/ca;if(bh<h){bh=h;bw=h*ca}c.drawImage(img,x+(w-bw)/2,y+(h-bh)/2,bw,bh)}catch(e){}c.restore();const k=Math.min(w/sw,h/sh);const dw=sw*k,dh=sh*k;c.drawImage(img,sx,sy,sw,sh,x+(w-dw)/2,y+(h-dh)/2,dw,dh);return true}
  if(sa>da){const nw=sh*da;const fx=r[4]==null?sx+(sw-nw)/2:Math.min(Math.max(r[4]*iw-nw/2,sx),sx+sw-nw);sx=fx;sw=nw}else{const nh=sw/da;const fy=r[5]==null?sy+(sh-nh)/2:Math.min(Math.max(r[5]*ih-nh/2,sy),sy+sh-nh);sy=fy;sh=nh}
  c.drawImage(img,sx,sy,sw,sh,x,y,w,h);return true}""")
rep("function crop(c,img,r,x,y,w,h){if(!img)return false;","function crop(c,img,r,x,y,w,h,fit){if(!img)return false;")
rep("const ok=crop(c,img,s.r,0,y,w,h);","const ok=crop(c,img,s.r,0,y,w,h,s.fit);")
rep("const ok=crop(c,img,s.r,x,y,w,h);","const ok=crop(c,img,s.r,x,y,w,h,s.fit);")
rep("return ok}return crop(c,img,s.r,x,y,w,h)}","return ok}return crop(c,img,s.r,x,y,w,h,s.fit)}")
# 2. replacing a photo keeps the frame's zoom (the focus returns to the centre of the new photo)
rep("}else{cur.o.k=k;cur.o.r=[0,0,1,1]}peSyncKeys(PE.p);","}else{const z0=peCropState(cur.o).z;cur.o.k=k;if(z0>1.01)peSetCrop(cur.o,{z:z0,cx:.5,cy:.5});else cur.o.r=[0,0,1,1]}peSyncKeys(PE.p);")
# 3. a free image layer keeps its crop when replaced, and supports fit
rep("const o=liveObj(it);o.k=r.k;delete o.crop;commit();","const o=liveObj(it);o.k=r.k;commit();")
rep("if(im){const cr=o.crop||{},z=Math.max(1,cr.z||1),sc=Math.max(o.w/im.naturalWidth,o.h/im.naturalHeight)*z,","if(im){const cr=o.crop||{},z=Math.max(1,cr.z||1),sc=(o.fit==='contain'?Math.min(o.w/im.naturalWidth,o.h/im.naturalHeight):Math.max(o.w/im.naturalWidth,o.h/im.naturalHeight)*z),")
# 4. uploading to the library from the editor no longer replaces the photo by itself
rep("if(first&&sl.length){pePick(first)}else refresh()}else toast('ההעלאה נכשלה')}","refresh()}else toast('ההעלאה נכשלה')}")
rep("toast(n===1&&first&&sl.length?'התמונה הוחלפה ונשמרה בספרייה. \"ביטול\" מחזיר את הקודמת':`${n} תמונות נכנסו לספרייה","toast(`${n} תמונות נכנסו לספרייה")
# 5. an AI image is a photo made by AI, not a render of a project
rep("const meta={name,project:proj,kind:'render',tags:'ai,chatgpt',ai:true,","const meta={name,project:proj,kind:'site',tags:'ai,chatgpt',ai:true,")
rep("try{PM[k]=Object.assign({},PM[k]||{},{k:'render',p:proj,t:'נוצר ב-AI'})}catch(e){}","try{PM[k]=Object.assign({},PM[k]||{},{k:'site',p:proj,t:'ai'})}catch(e){}")
# 6. a photo uploaded on an agent card is saved to the library, so it is still there after a reload
rep("try{PHOTOS[p.id]=await loadImg(f);p.photoKey=null;saveAgent();refreshCard(p)}catch(err){toast('לא הצלחתי לקרוא את התמונה')}","try{PHOTOS[p.id]=await loadImg(f);p.photoKey=null;saveAgent();refreshCard(p);if(window.KImg)KImg.save(f,{name:f.name,project:p.project,tags:'agent'}).then(r=>{p.photoKey=r.k;saveAgent()}).catch(e=>toast(KImg.msg(e)))}catch(err){toast('לא הצלחתי לקרוא את התמונה')}")
js=open(os.path.join(H,'v206.js'),encoding='utf8').read().strip('\n')
A,Z='/*V206:START*/','/*V206:END*/'
if A in s:
    i=s.index(A);j=s.index(Z,i)+len(Z);s=s[:i]+js+s[j:]
else:
    B='// ================= V83 · safe external opener'
    assert s.count(B)==1;s=s.replace(B,js+'\n\n'+B)
css=open(os.path.join(H,'k206css.txt'),encoding='utf8').read().strip()
if '<style id="k206">' in s:
    i=s.index('<style id="k206">');j=s.index('</style>',i)+len('</style>');s=s[:i]+css+s[j:]
else:
    assert s.count('<style id="k150">')==1;s=s.replace('<style id="k150">',css+'<style id="k150">')
open(P,'w',encoding='utf8').write(s);print('ok 206',P)
