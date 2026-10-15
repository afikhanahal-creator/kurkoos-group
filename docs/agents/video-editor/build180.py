import os,shutil,sys
H=os.path.dirname(os.path.abspath(__file__))
P=sys.argv[1] if len(sys.argv)>1 else 'ce15.html'
s=open(P,encoding='utf8').read()
if '__v180' in s: raise SystemExit('already built')
if os.path.basename(P)=='ce15.html': shutil.copy(P,os.path.join(os.path.dirname(P) or '.','ce15.bak180'))
def rep(a,b):
    global s
    assert s.count(a)==1,('missing',a[:80]);s=s.replace(a,b)
# the editor check of a video job is text or a list of {effect, word}: never print "[object Object]"
rep('<pre>${esc(d.qa)}</pre>','<pre>${esc(typeof d.qa==="string"?d.qa:Array.isArray(d.qa)?d.qa.map(x=>x&&typeof x==="object"?Object.values(x).join(" · "):String(x)).join("\\n"):JSON.stringify(d.qa))}</pre>')
# phones: the shell, the header menu button, the drawer, the back gesture (see v180.js)
M2='// ================= V83 · safe external opener'
rep(M2,open(os.path.join(H,'v180.js'),encoding='utf8').read()+'\n'+M2)
rep('<style id="k150">',open(os.path.join(H,'k180css.txt'),encoding='utf8').read()+'\n<style id="k150">')
open(P,'w',encoding='utf8').write(s);print('ok 180',P)
