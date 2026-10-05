import shutil
P='ce15.html'
s=open(P,encoding='utf8').read()
if 'V113 ·' in s: raise SystemExit('already built')
shutil.copy(P,'ce15.bak113')
def rep(a,b):
    global s
    assert s.count(a)==1,(s.count(a),a[:90])
    s=s.replace(a,b)
M='// ================= V83 · safe external opener'
rep(M,open('v113.js',encoding='utf8').read()+'\n'+M)
# logo auto placement: sample a 24x24 downscale of each corner instead of reading the full region
rep("function stats(ctx,x,y,w,h,s){try{const d=ctx.getImageData(Math.max(0,x*s|0),Math.max(0,y*s|0),Math.max(1,w*s|0),Math.max(1,h*s|0)).data;let a=0,a2=0,n=0;for(let i=0;i<d.length;i+=12){",
    "function stats(ctx,x,y,w,h,s){try{const sx=Math.max(0,x*s|0),sy=Math.max(0,y*s|0),sw=Math.max(1,w*s|0),sh=Math.max(1,h*s|0);const t=stats._t||(stats._t=document.createElement('canvas'));t.width=24;t.height=24;const tx=t.getContext('2d',{willReadFrequently:true});tx.drawImage(ctx.canvas,sx,sy,sw,sh,0,0,24,24);const d=tx.getImageData(0,0,24,24).data;let a=0,a2=0,n=0;for(let i=0;i<d.length;i+=4){")
# V107: build for a given list of keys, and quietly (one render at the end of a chunked run)
rep(" photoKeys().forEach(k=>{const have=postsOf(k).length;if(have>=per)return;"," (opts.keys||photoKeys()).forEach(k=>{const have=postsOf(k).length;if(have>=per)return;")
rep("if(made.length){AG.posts.unshift(...made);try{saveAgent()}catch(e){}try{renderAgent()}catch(e){}try{render()}catch(e){}}","if(made.length){AG.posts.unshift(...made);if(!opts.quiet){try{saveAgent()}catch(e){}try{renderAgent()}catch(e){}try{render()}catch(e){}}}")
# V110: one worker that breathes, sizes from the header, downscale only when the file is really big, posts built in chunks, videos automatically only on desktops
rep(" await Promise.all([worker(),worker()]);"," await worker();")
rep("res.done++;if(res.done%10===0)say(","res.done++;await __v113.breath();if(res.done%10===0)say(")
rep("try{const f=new File([blob],'site.jpg',{type:blob.type||'image/jpeg'});const d=await downscale(f);blob=d.blob;w=d.w;h=d.h}catch(e){const d=await dims(blob);w=d.w;h=d.h}",
    "{const d=await __v113.dims(blob);w=d.w;h=d.h;if(blob.size>1500000||Math.max(w,h)>2600){try{const f=new File([blob],'site.jpg',{type:blob.type||'image/jpeg'});const q=await downscale(f);blob=q.blob;w=q.w;h=q.h}catch(e){}}}")
rep("if(out.images.done){try{const r=window.__v107&&__v107.build({per:2});out.posts=r&&r.made||0}catch(e){}try{const d=window.__v104&&__v104.diversify({cap:3});out.diversified=d&&d.changed||0}catch(e){}}",
    "if(out.images.done){try{const r=await __v113.buildChunked({per:2});out.posts=r.made;out.diversified=r.div}catch(e){}}")
rep("localStorage.setItem(FLAG,'1');run()}catch(e){}},12000);","localStorage.setItem(FLAG,'1');run({videos:!matchMedia('(pointer:coarse)').matches})}catch(e){}},12000);")
# V112: chunked too
rep("function run(){const bs=pending();if(!bs.length)return null;if(!window.__v107||!window.__v104)return null;\n let made=0,div=0;try{const r=__v107.build({per:2});made=r&&r.made||0}catch(e){}try{const d=__v104.diversify({cap:3});div=d&&d.changed||0}catch(e){}",
    "async function run(){const bs=pending();if(!bs.length)return null;if(!window.__v107||!window.__v104||!window.__v113)return null;\n let made=0,div=0;try{const r=await __v113.buildChunked({per:2});made=r.made;div=r.div}catch(e){}")
open(P,'w',encoding='utf8').write(s)
print('ok',len(s))
