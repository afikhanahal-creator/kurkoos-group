import os,sys
H=os.path.dirname(os.path.abspath(__file__))
P=sys.argv[1] if len(sys.argv)>1 else 'ce15.html'
s=open(P,encoding='utf8').read()
# V212: template engine upgrades for one to one clones and for the element inspector: rotated and skewed boxes, text outline and
# shadow, per photo light adjustments, a kit export so modules can add element types, and a draw hook that accepts a merged spec.
def rep(a,b,n=1):
    global s
    if b in s and a not in s: return
    assert s.count(a)==n,(a[:90],s.count(a));s=s.replace(a,b)
# 1. the draw loop lets a hook pass a changed spec
rep("const f=()=>EL[e.t](ctx,e);if(window.__v50el)window.__v50el(c,f,e,ix,p);else f()","const f=(e2)=>EL[e.t](ctx,e2||e);if(window.__v50el)window.__v50el(c,f,e,ix,p);else f()")
# 2. the kit: element table and helpers, so new element types can be added from a module
rep("G.TPL={specs:T,fam:FAM,famNote:FAM_NOTE,names:NAMES,themes:THEMES,meta:META,draw,cat:CAT,famCat:FAM_CAT};","G.TPL={specs:T,fam:FAM,famNote:FAM_NOTE,names:NAMES,themes:THEMES,meta:META,draw,cat:CAT,famCat:FAM_CAT};G.__tplKit={EL,col,A,field,ISO,rr,txt,small,W,H,M,slotOf,shot,TH};")
# 3. text: outline and shadow
rep("if(!o.dry)ls.forEach((l,i)=>c.fillText(l,o.x??W-M,o.y+size*.8+i*lh));c.restore();LS(c,'0px');",
    "if(!o.dry){if(o.shadow){c.shadowColor=o.shadow===true?'rgba(0,0,0,.45)':String(o.shadow);c.shadowBlur=size*.22;c.shadowOffsetY=size*.05}if(o.stroke){c.lineJoin='round';c.lineWidth=o.sw||Math.max(2,size*.08);c.strokeStyle=o.stroke;ls.forEach((l,i)=>c.strokeText(l,o.x??W-M,o.y+size*.8+i*lh))}ls.forEach((l,i)=>c.fillText(l,o.x??W-M,o.y+size*.8+i*lh))}c.restore();LS(c,'0px');")
rep("const r=txt(c,s,{x:e.x??W-M,y:e.y,size:e.size||70,max:e.max||3,min:e.min||24,w:e.w||300,color:col(e.col,t),maxW:e.maxW||W-2*M,lh:e.lh||1.04,align:e.align||'right',track:e.track});ctx.last=r;return r}",
    "const rot=+e.rot||0;if(rot){c.save();const cx=e.x??W-M,cy=e.y;c.translate(cx,cy);c.rotate(rot*Math.PI/180);c.translate(-cx,-cy)}const r=txt(c,s,{x:e.x??W-M,y:e.y,size:e.size||70,max:e.max||3,min:e.min||24,w:e.w||300,color:col(e.col,t),maxW:e.maxW||W-2*M,lh:e.lh||1.04,align:e.align||'right',track:e.track,stroke:e.stroke?col(e.stroke,t):null,sw:e.sw,shadow:e.shadow});if(rot)c.restore();ctx.last=r;return r}")
# 4. rect: rotation, skew, outline
rep(" rect(ctx,e){const {c,t}=ctx;c.save();c.fillStyle=col(e.col,t);if(e.a!=null)c.globalAlpha=e.a;if(e.r){rr(c,e.x,e.y,e.w,e.h,e.r);c.fill()}else c.fillRect(e.x,e.y,e.w,e.h);c.restore()}",
    " rect(ctx,e){const {c,t}=ctx;c.save();if(e.rot||e.skew){const cx=e.x+e.w/2,cy=e.y+e.h/2;c.translate(cx,cy);if(e.rot)c.rotate(e.rot*Math.PI/180);if(e.skew)c.transform(1,0,Math.tan(e.skew*Math.PI/180),1,0,0);c.translate(-cx,-cy)}if(e.a!=null)c.globalAlpha=e.a;if(e.r)rr(c,e.x,e.y,e.w,e.h,e.r);else{c.beginPath();c.rect(e.x,e.y,e.w,e.h)}if(e.col!=='none'){c.fillStyle=col(e.col,t);c.fill()}if(e.stroke){c.strokeStyle=col(e.stroke,t);c.lineWidth=e.lw||4;c.stroke()}c.restore()}")
# 5. a photo slot can carry its own light adjustments (exp, con, sat, temp) and they travel with the post
rep("function shot(c,I,s,x,y,w,h){if(!s)return false;",
    "function shot(c,I,s,x,y,w,h){const a=s&&s.adj;if(a&&(a.exp||a.con||a.sat||a.temp)){c.save();try{c.filter='brightness('+(1+(a.exp||0)*.6).toFixed(3)+') contrast('+(1+(a.con||0)*.8).toFixed(3)+') saturate('+Math.max(0,1+(a.sat||0)).toFixed(3)+')'}catch(e){}const ok=shot0(c,I,s,x,y,w,h);try{c.filter='none'}catch(e){}if(a.temp&&ok){c.globalCompositeOperation='soft-light';c.globalAlpha=Math.min(.6,Math.abs(a.temp)*.55);c.fillStyle=a.temp>0?'#ff9440':'#3f8cff';c.fillRect(x,y,w,h)}c.restore();return ok}return shot0(c,I,s,x,y,w,h)}\nfunction shot0(c,I,s,x,y,w,h){if(!s)return false;")
js=open(os.path.join(H,'v212.js'),encoding='utf8').read().strip('\n')
A,Z='/*V212:START*/','/*V212:END*/'
if A in s:
    i=s.index(A);j=s.index(Z,i)+len(Z);s=s[:i]+js+s[j:]
else:
    B='// ================= V83 · safe external opener'
    assert s.count(B)==1;s=s.replace(B,js+'\n\n'+B)
assert s.count(A)==1
open(P,'w',encoding='utf8').write(s);print('ok 212',P)
