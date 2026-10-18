import os,sys
H=os.path.dirname(os.path.abspath(__file__))
P=sys.argv[1] if len(sys.argv)>1 else 'ce15.html'
s=open(P,encoding='utf8').read()
# V196: speed. Runs after build188, build190, build191, build194 and build195, and again on its own output.
# The JS block sits just before the V83 marker (after V195); the styles sit just before <style id="k150">.
# Besides the block, a few older parts of the base file are changed in place (each one only once, so a rerun is safe):
def patch(a,b,tag):
    """replace a with b exactly once; on a rerun the text is already b"""
    global s
    if tag in s:return
    assert s.count(a)==1,(s.count(a),a[:90]);s=s.replace(a,b)
# 1. one quality cache: an older cache (8,000 entries, fewer than the library) sat in front of the V195 cache, missed on
#    every call, built the same string key a second time and took __pxqClear over, so a clear no longer reached V195
patch("(function(){if(typeof pxQuality!=='function')return;const C=new Map();let fc=null;\n  const h=t=>",
      "(function(){if(typeof pxQuality!=='function'||window.__v196q)return;/*V196q: the V195 cache is the one cache*/const C=new Map();let fc=null;\n  const h=t=>",'/*V196q:')
patch("// ================= V83 · safe external opener","window.__v196q=1;\n// ================= V83 · safe external opener",'window.__v196q=1;')
# 2. the post body and its first three words are kept per text: the score, the fatigue index and the cards ask for them
#    for every post on every render, and both are plain functions of the text
patch("const pxBody=p=>String(p.fb||'').split(/\\n\\nקבוצת קורקוס/)[0].replace(/\\n\\nלכתבה המלאה:.*$/s,'');",
      "const pxBody=p=>{const s=String(p.fb||'');const M=pxBody.m||(pxBody.m=new Map());let r=M.get(s);if(r===undefined){r=s.split(/\\n\\nקבוצת קורקוס/)[0].replace(/\\n\\nלכתבה המלאה:.*$/s,'');if(M.size>30000)M.clear();M.set(s,r)}return r};/*V196b*/\n"
      "const pxOpen3=b=>{const M=pxOpen3.m||(pxOpen3.m=new Map());let r=M.get(b);if(r===undefined){r=b.split(/\\s+/).slice(0,3).join(' ');if(M.size>30000)M.clear();M.set(b,r)}return r};",'/*V196b*/')
patch("const bd=pxBody(p),o=bd.split(/\\s+/).slice(0,3).join(' ');","const bd=pxBody(p),o=pxOpen3(bd);",'o=pxOpen3(bd);')
patch("const o=pxBody(p).split(/\\s+/).slice(0,3).join(' ');","const o=pxOpen3(pxBody(p));",'const o=pxOpen3(pxBody(p));')
# 3. the banned phrases are split once per kit text instead of once per post
patch("...String(KIT.banned||'').split(',').map(x=>x.trim()).filter(x=>x&&x.length>2&&!/מקפים/.test(x)&&(t+h).includes(x))",
      "...v196Ban(KIT.banned).filter(x=>(t+h).includes(x))",'v196Ban(KIT.banned)')
patch("function check(p){","function v196Ban(b){b=String(b||'');const m=v196Ban;if(m.s!==b||!m.l){m.s=b;m.l=b.split(',').map(x=>x.trim()).filter(x=>x&&x.length>2&&!/מקפים/.test(x))}return m.l}\nfunction check(p){",'function v196Ban(b)')
# 4. the clarity check cache holds the whole library (it held 8,000 entries, so with more posts every call missed)
patch("if(!c){c=cheapOf(p);CH.set(k,c);if(CH.size>8000)","if(!c){c=cheapOf(p);CH.set(k,c);if(CH.size>100000/*V196*/)",'CH.size>100000/*V196*/')
# 5. undo (V171): the starting point after a change that no person made (the cloud load, a background pass) is taken
#    a few posts at a time while the page is idle, instead of copying the whole library (about 14 MB of text) at once;
#    a tap or a key finishes it first, so what a person does is still compared with the state right before it
patch("function snapPosts(){const m=new Map();(AG.posts||[]).forEach((p,i)=>{if(p&&p.id)m.set(p.id,{s:strip(p),i,ref:p})});return m}",
      "function snapPosts(){const m=new Map();(AG.posts||[]).forEach((p,i)=>{if(p&&p.id)m.set(p.id,{s:strip(p),i,ref:p})});return m}\n"
      "let LZ=null;/*V196u*/\n"
      "function lzStep(z,dl){const t0=performance.now();while(z.i<z.l.length&&(dl&&dl.timeRemaining?dl.timeRemaining()>2:performance.now()-t0<8)){const p=z.l[z.i];if(p&&p.id)z.m.set(p.id,{s:strip(p),i:z.i,ref:p});z.i++}if(z.i>=z.l.length){if(LZ===z){U.posts=z.m;LZ=null}return true}return false}\n"
      "function lazyBase(){const z={m:new Map(),i:0,l:(AG&&AG.posts||[]).slice()};LZ=z;U.posts=null;const go=dl=>{if(LZ!==z)return;if(!lzStep(z,dl))(window.requestIdleCallback?requestIdleCallback(go,{timeout:1200}):setTimeout(go,40))};(window.requestIdleCallback?requestIdleCallback(go,{timeout:1200}):setTimeout(go,40))}\n"
      "function lzFinish(){const z=LZ;if(z)lzStep(z,{timeRemaining:()=>1e9})}\n"
      "['pointerdown','keydown'].forEach(t=>window.addEventListener(t,lzFinish,true));",'/*V196u*/')
patch("function recordPosts(){if(U.replay||!AG||!AG.posts)return;const now=snapPosts();const old=U.posts;U.posts=now;if(!old||!byUser())return;",
      "function recordPosts(){if(U.replay||!AG||!AG.posts)return;if(!byUser()){lazyBase();return}lzFinish();const now=snapPosts();const old=U.posts;LZ=null;U.posts=now;if(!old)return;",'if(!byUser()){lazyBase();return}')
patch("function init(){try{U.posts=snapPosts();U.sched=snapSched();chip()}catch(e){setTimeout(init,1500)}}",
      "function init(){try{lazyBase();U.sched=snapSched();chip()}catch(e){setTimeout(init,1500)}}",'function init(){try{lazyBase();')
patch("setTimeout(()=>{U.posts=snapPosts();U.sched=snapSched()},400)","setTimeout(()=>{lazyBase();U.sched=snapSched()},400)",'setTimeout(()=>{lazyBase();')
patch("finally{U.posts=snapPosts();U.sched=snapSched();U.replay=false}","finally{LZ=null;U.posts=snapPosts();U.sched=snapSched();U.replay=false}",'finally{LZ=null;U.posts=snapPosts()')
patch("function group(fn,args,self){try{U.posts=snapPosts();U.sched=snapSched()}catch(x){}","function group(fn,args,self){try{LZ=null;U.posts=snapPosts();U.sched=snapSched()}catch(x){}",'try{LZ=null;U.posts=snapPosts()')
# 7. V119: registering a photo moves the quality cache epoch only when the registration changes something (the photos
#    arrive twice on every open, once from a read and once from the live listener, and each time all 8,000 posts were
#    scored again); a new or changed photo still moves it, as before
patch("regUpload=(f=>function(){EP++;return f.apply(this,arguments)})(regUpload);",
      "regUpload=(f=>function(id){const k='u_'+id;let o0=null;try{o0=JSON.stringify([KC.up[id],PHOTO_LIB[k],LIB_NAMES[k],PM[k]])}catch(e){}const r=f.apply(this,arguments);let o1=null;try{o1=JSON.stringify([KC.up[id],PHOTO_LIB[k],LIB_NAMES[k],PM[k]])}catch(e){}if(o0==null||o0!==o1)EP++;return r})(regUpload);/*V196r*/",'/*V196r*/')
# 8. competitors (V62): the height of every research box was read right after the previous box was changed, so the
#    browser laid out the whole page once per competitor (about 0.8 s at 2x slower CPU); the heights are read first, then
#    the boxes are changed, the same boxes as before
patch("function compPost(box){box.querySelectorAll('.cc .rs').forEach(rs=>{if(rs.dataset.v62||rs.scrollHeight<190)return;rs.dataset.v62=1;",
      "function compPost(box){const RS=[...box.querySelectorAll('.cc .rs')].filter(rs=>!rs.dataset.v62);const RH=RS.map(rs=>rs.scrollHeight);/*V196c*/RS.forEach((rs,i)=>{if(rs.dataset.v62||RH[i]<190)return;rs.dataset.v62=1;",'/*V196c*/')
# 9. ideas: the number next to each series came from a scan of the whole library per series; one pass counts them all
patch("${AG.posts.filter(p=>p.series===x&&!inS.has(p.key||p.id)).length}","${v196SerCount(inS,x)}",'v196SerCount(inS,x)')
patch("function v196Ban(b){","function v196SerCount(inS,x){const m=v196SerCount;if(m.s!==inS||m.p!==AG.posts||m.n!==AG.posts.length){m.s=inS;m.p=AG.posts;m.n=AG.posts.length;m.c=new Map();AG.posts.forEach(p=>{if(!inS.has(p.key||p.id))m.c.set(p.series,(m.c.get(p.series)||0)+1)})}return m.c.get(x)||0}\nfunction v196Ban(b){",'function v196SerCount(')
# 10. duplicates: the two pictures of each pair are drawn when they come near the screen (they were all drawn at once,
#     each one a full slide render), the same way the gallery and the queue already draw theirs
patch("function paintPairs(root){root.querySelectorAll('canvas[data-dgp]').forEach(cv=>{const p=AG.posts.find(x=>x.id===cv.dataset.dgp);if(p&&!cv.dataset.done){cv.dataset.done=1;ensureImgs(p).then(()=>{try{thumb(cv,p,0)}catch(e){}})}})}",
      "function paintPairs(root){const one=cv=>{const p=AG.posts.find(x=>x.id===cv.dataset.dgp);if(p&&!cv.dataset.done){cv.dataset.done=1;ensureImgs(p).then(()=>{try{thumb(cv,p,0)}catch(e){}})}};const cs=root.querySelectorAll('canvas[data-dgp]');if(!('IntersectionObserver' in window)){cs.forEach(one);return}/*V196d*/\n const io=paintPairs.io||(paintPairs.io=new IntersectionObserver(es=>es.forEach(en=>{if(!en.isIntersecting)return;paintPairs.io.unobserve(en.target);if(en.target.isConnected)one(en.target)}),{rootMargin:'500px 0px'}));cs.forEach(cv=>{if(!cv.dataset.done)io.observe(cv)})}",'/*V196d*/')
# 11. the idle overflow check (V117) forgets the scores of the posts it looked at, not of the whole library (the clear
#     reached the V195 cache only once the two caches became one; a full rescore costs about two seconds on a phone)
patch("else if(q.length){try{PRO._fc=null;TC&&TC.clear&&TC.clear()}catch(e){}try{saveAgent()}catch(e){}try{window.__pxqClear&&window.__pxqClear()}catch(e){}",
      "else if(q.length){try{PRO._fc=null;TC&&TC.clear&&TC.clear()}catch(e){}try{saveAgent()}catch(e){}try{window.__pxqDrop?window.__pxqDrop(q):window.__pxqClear&&window.__pxqClear()}catch(e){}/*V196o*/",'/*V196o*/')
# 12. search on Posts: the lowercase text of each post (headline, text, series, project) is kept with the post's card
#     data and made again only when one of them changes, instead of joining and lowercasing about 3 KB per post, for all
#     8,000 posts, on every search
patch("function qMatch(x,q){if(!q)return true;const h=(headOf(x.p)+' '+x.m.hay+' '+projLabel(x.pk)).toLowerCase();",
      "function qMatch(x,q){if(!q)return true;const hd=headOf(x.p),pl=projLabel(x.pk);const z=x.m.lc;const h=(z&&z.hd===hd&&z.pl===pl&&z.hay===x.m.hay)?z.s:(x.m.lc={hd,pl,hay:x.m.hay,s:(hd+' '+x.m.hay+' '+pl).toLowerCase()}).s;/*V196s*/",'/*V196s*/')
# 6. connections that every open needs are opened while the page is still parsing
PC='<link rel="preconnect" href="https://filnzlnvujnlazwcxbuq.supabase.co" crossorigin><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="dns-prefetch" href="https://cdnjs.cloudflare.com">'
patch('<head><base href="/engine/">','<head><base href="/engine/">'+PC,PC)
# the module itself
js=open(os.path.join(H,'v196.js'),encoding='utf8').read().strip('\n')
A,Z='/*V196:START*/','/*V196:END*/'
if A in s:
    i=s.index(A);j=s.index(Z,i)+len(Z);s=s[:i]+js+s[j:]
else:
    B='window.__v196q=1;\n// ================= V83 · safe external opener'
    assert s.count(B)==1;s=s.replace(B,js+'\n\n'+B)
css=open(os.path.join(H,'k196css.txt'),encoding='utf8').read().strip()
if '<style id="k196">' in s:
    i=s.index('<style id="k196">');j=s.index('</style>',i)+len('</style>');s=s[:i]+css+s[j:]
else:
    assert s.count('<style id="k150">')==1;s=s.replace('<style id="k150">',css+'<style id="k150">')
assert s.count(A)==1 and s.count('<style id="k196">')==1 and s.count('/*V196q:')==1 and s.count('/*V196u*/')==1 and s.count(PC)==1
open(P,'w',encoding='utf8').write(s);print('ok 196',P)
