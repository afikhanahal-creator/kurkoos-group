import shutil
P='ce15.html'
s=open(P,encoding='utf8').read()
if 'V117 ·' in s: raise SystemExit('already built')
shutil.copy(P,'ce15.bak117')
def rep(a,b,n=1):
    global s
    assert s.count(a)==n,(s.count(a),a[:80])
    s=s.replace(a,b)
# composer: an article without a title no longer crashes the composer
rep("${esc(p.article.t.slice(0,50))}","${esc(String(p.article.t||p.article.title||p.article.url||'').slice(0,50))}")
# V73 clarity gate: queue from V117 (nothing while editing, 40 per pass), slower cadence, half-size canvas
rep("const q=AG.posts.filter(p=>specOf(p.layout)&&p._ovk!==sigOf(p));","const q=window.__v117q?window.__v117q(sigOf):AG.posts.filter(p=>specOf(p.layout)&&p._ovk!==sigOf(p));")
rep("if(qi<q.length){setTimeout(step,40)}","if(qi<q.length){setTimeout(step,((window.PE&&PE.p)||(window.APP&&APP.cmp))?900:160)}")
rep("c.width=1080;c.height=1350;FX.L[p.layout]&&drawSlide(c,p,0)","c.width=540;c.height=675;window.__v117nocache=1;try{FX.L[p.layout]&&drawSlide(c,p,0)}finally{window.__v117nocache=0}")
# V31 cloud sync: yield to the page every 120 posts
rep("for(const p of AG.posts){if(!p||!p.id)continue;const id=v31Id(p);","let __y=0;for(const p of AG.posts){if((++__y%120)===0)await new Promise(r=>setTimeout(r,0));if(!p||!p.id)continue;const id=v31Id(p);")
# new photo batches build one post per photo, not two
rep("__v107.build({per:2})","__v107.build({per:1})")
rep("buildChunked({per:2","buildChunked({per:1")
M='// ================= V83 · safe external opener'
assert s.count(M)==1
s=s.replace(M,open('v117.js',encoding='utf8').read()+'\n'+M)
open(P,'w',encoding='utf8').write(s);print('ok',len(s))
