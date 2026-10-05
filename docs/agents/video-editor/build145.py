import shutil
P='ce15.html'
s=open(P,encoding='utf8').read()
if 'V145 ·' in s: raise SystemExit('already built')
shutil.copy(P,'ce15.bak145')
def rep(a,b,n=1):
    global s
    assert s.count(a)==n,(a[:60],s.count(a));s=s.replace(a,b)
# drafts wait until the saved posts are loaded, so they are not added again
rep("function importDraft(id,d){if(!d||!d.post",
    "function importDraft(id,d){if(APP.db&&!window.__v31loaded){(window.__v145q=window.__v145q||[]).push([id,d]);return null}if(!d||!d.post")
rep("appInit=(f=>async function(){const r=await f.apply(this,arguments);try{const n=await v31Load();",
    "appInit=(f=>async function(){const r=await f.apply(this,arguments);try{const n=await v31Load();window.__v31loaded=1;try{window.__v145drafts()}catch(e){}")
# the automatic photo variety pass ran again on every new device and rewrote posts; the button stays
rep("setTimeout(()=>{try{if(localStorage.getItem(FLAG))return;const r=diversify({cap:3});",
    "setTimeout(()=>{try{if(localStorage.getItem(FLAG)||true)return;const r=diversify({cap:3});")
M='// ================= V83 · safe external opener'
js='''// ================= V145 · competitor drafts are matched against the saved posts only after those posts load (no duplicates on a new device);
//                   the automatic photo variety pass no longer runs by itself =================
window.__v145drafts=async function(){const q=window.__v145q||[];window.__v145q=[];const made=[];for(const [id,d] of q){const p=importDraft(id,d);if(p)made.push(p)}
 if(!made.length)return;for(const p of made){AG.posts.unshift(p);try{await ensureImgs(p)}catch(e){}}saveAgent();try{renderAgent()}catch(e){}toast(`${made.length} פוסטים חדשים בהשראת מתחרים נוספו לטיוטות`);render()};
'''
rep(M,js+'\n'+M)
open(P,'w',encoding='utf8').write(s);print('ok',len(s))
