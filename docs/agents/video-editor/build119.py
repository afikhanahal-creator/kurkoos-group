import shutil,re
P='ce15.html'
s=open(P,encoding='utf8').read()
if 'V119 ·' in s: raise SystemExit('already built')
shutil.copy(P,'ce15.bak119')
def rep(a,b,n=1):
    global s
    assert s.count(a)==n,(s.count(a),a[:80])
    s=s.replace(a,b)
# grain: four renderers, each with its own density; the full-canvas one used 9000 dots on 1080x1350 (1 per 162 px)
G='function grain(c,x,y,w,h,a=.04,seed=7){let s=seed;const r=()=>(s=(s*16807)%2147483647)/2147483647;c.save();for(let i=0;i<w*h/170;i++){c.fillStyle=r()<.5?`rgba(255,255,255,${a*r()})`:`rgba(0,0,0,${a*r()})`;c.fillRect(x+r()*w,y+r()*h,1.5,1.5)}c.restore()}'
rep(G,'function grain(c,x,y,w,h,a=.04,seed=7){if(window.__grainFill)return __grainFill(c,x,y,w,h,a,seed,170);let s=seed;const r=()=>(s=(s*16807)%2147483647)/2147483647;c.save();for(let i=0;i<w*h/170;i++){c.fillStyle=r()<.5?`rgba(255,255,255,${a*r()})`:`rgba(0,0,0,${a*r()})`;c.fillRect(x+r()*w,y+r()*h,1.5,1.5)}c.restore()}')
for den,a0,sd in [(140,'.05','11'),(160,'.04','5')]:
    head='function grain(c,x,y,w,h,a=%s,seed=%s){'%(a0,sd)
    assert s.count(head)==1,head
    s=s.replace(head,head+'if(window.__grainFill)return __grainFill(c,x,y,w,h,a,seed,%d);'%den)
head='function grain(c,a=.06,seed=7){'
assert s.count(head)==1
s=s.replace(head,head+'if(window.__grainFill)return __grainFill(c,0,0,c.canvas.width,c.canvas.height,a,seed,162);')
# V99 pencil: decorate thumbnails when they scroll into view (IntersectionObserver), no forced layout per card
rep("root.querySelectorAll('canvas[data-tp]:not([data-v99]),canvas[data-ti]:not([data-v99])').forEach(cv=>{cv.dataset.v99='1';const r=cv.getBoundingClientRect();",
    "if(!window.__v99io){window.__v99io=new IntersectionObserver(es=>{es.forEach(en=>{if(!en.isIntersecting)return;__v99io.unobserve(en.target);try{deco1(en.target,en.boundingClientRect)}catch(e){}})},{rootMargin:'240px'})}root.querySelectorAll('canvas[data-tp]:not([data-v99]),canvas[data-ti]:not([data-v99])').forEach(cv=>{cv.dataset.v99='1';__v99io.observe(cv)})}\nfunction deco1(cv,r){if(!document.body.contains(cv))return;")
rep("cv.insertAdjacentElement('afterend',b)})}","cv.insertAdjacentElement('afterend',b)}")
# V73: first pass 20 s after boot, later slices on idle time
rep("}catch(e){console.error('v73',e)}},2500);return r})(appInit);","}catch(e){console.error('v73',e)}},20000);return r})(appInit);")
rep("if(qi<q.length){setTimeout(step,((window.PE&&PE.p)||(window.APP&&APP.cmp))?900:160)}","if(qi<q.length){if((window.PE&&PE.p)||(window.APP&&APP.cmp))setTimeout(step,900);else if(window.requestIdleCallback)requestIdleCallback(step,{timeout:2500});else setTimeout(step,160)}")
# V117 hidden() and V118 desk(): no layout reads
rep("const hidden=()=>{const ag=document.getElementById('agent');return ag&&!ag.offsetParent&&getComputedStyle(ag).display==='none'};","let _hid=null,_hidT=0;const hidden=()=>{if(_hid!==null&&Date.now()-_hidT<10000)return _hid;const ag=document.getElementById('agent');_hid=!!(ag&&getComputedStyle(ag).display==='none');_hidT=Date.now();return _hid};")
rep("function desk(){return window.innerWidth>900}","const DESKQ=matchMedia('(min-width:901px)');function desk(){return DESKQ.matches}")
# quality memo: epoch from V119 instead of the per-render fatigue index
rep("if(typeof PRO!=='undefined'&&PRO._fc!==fc){C.clear();fc=PRO._fc}","const ep=window.__v119ep?__v119ep():(typeof PRO!=='undefined'?PRO._fc:null);if(ep!==fc){C.clear();fc=ep}")
# V101 pinned close button: nothing to compute on desktops
rep("function ensureBtn(){const t=top();","function ensureBtn(){if(innerWidth>860){const b0=document.getElementById('v101x');if(b0)b0.remove();return}const t=top();")
# V117 tiles drawn at tile size
rep("const big=peCanvas(q,i||0);ST.miss++;if(k&&ready(q)){try{const c=document.createElement('canvas');c.width=432;c.height=540;c.getContext('2d').drawImage(big,0,0,432,540);C.set(k,c);if(C.size>MAX)C.delete(C.keys().next().value);return c}catch(e){}}return big};","const c=document.createElement('canvas');c.width=432;c.height=540;try{drawSlide(c,q,i||0)}catch(e){return peCanvas(q,i||0)}ST.miss++;if(k&&ready(q)){C.set(k,c);if(C.size>MAX)C.delete(C.keys().next().value)}return c};")
# V115 photo library: closed project sections render their tiles only when opened
rep("""<div class="pe-lib v115grid ${big?'big':''}">${list.map(k=>tile(k,u,cur,big)).join('')}</div></details>""","""<div class="pe-lib v115grid ${big?'big':''}" data-v115lazy="${open?'':'1'}">${open?list.map(k=>tile(k,u,cur,big)).join(''):''}</div></details>""")
rep("const L=state();L.open[d.dataset.v115g]=d.open},true);","const L=state();L.open[d.dataset.v115g]=d.open;if(d.open&&d.querySelector('[data-v115lazy=\"1\"]')){if(d.closest('#v115lib')&&window.__v115&&__v115.renderLib)__v115.renderLib();else if(typeof peRender==='function')peRender()}},true);")
rep("window.__v115={openLib,closeLib,uploadMany,srcOf,filtered,state}","window.__v115={openLib,closeLib,renderLib,uploadMany,srcOf,filtered,state}")
M='// ================= V83 · safe external opener'
assert s.count(M)==1
s=s.replace(M,open('v119.js',encoding='utf8').read()+'\n'+M)
open(P,'w',encoding='utf8').write(s);print('ok',len(s))
