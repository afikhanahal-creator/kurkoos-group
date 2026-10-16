import os,shutil,sys
H=os.path.dirname(os.path.abspath(__file__))
P=sys.argv[1] if len(sys.argv)>1 else 'ce15.html'
s=open(P,encoding='utf8').read()
if '__v184' in s: raise SystemExit('already built')
if os.path.basename(P)=='ce15.html': shutil.copy(P,os.path.join(os.path.dirname(P) or '.','ce15.bak184'))
def rep(a,b):
    global s
    assert s.count(a)==1,('missing',a[:80]);s=s.replace(a,b)
# one picture uploaded from the editor replaced the post's picture with a "1 תמונות נכנסו לספרייה" toast: say what happened
rep("toast(`${n} תמונות נכנסו לספרייה${proj?' של '+(PRJ()[proj]||proj):''}`);const sl=peSlots(PE.p);if(first&&sl.length){pePick(first)}else refresh()",
    "const sl=peSlots(PE.p);toast(n===1&&first&&sl.length?'התמונה הוחלפה ונשמרה בספרייה. \"ביטול\" מחזיר את הקודמת':`${n} תמונות נכנסו לספרייה${proj?' של '+(PRJ()[proj]||proj):''}`);if(first&&sl.length){pePick(first)}else refresh()")
M2='// ================= V83 · safe external opener'
rep(M2,open(os.path.join(H,'v184.js'),encoding='utf8').read()+'\n'+M2)
rep('<style id="k150">',open(os.path.join(H,'k184css.txt'),encoding='utf8').read()+'\n<style id="k150">')
open(P,'w',encoding='utf8').write(s);print('ok 184',P)
