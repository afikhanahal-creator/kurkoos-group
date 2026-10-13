import shutil,sys
P=sys.argv[1] if len(sys.argv)>1 else 'ce15.html'
s=open(P,encoding='utf8').read()
if '__v173' in s: raise SystemExit('already built')
if P=='ce15.html': shutil.copy(P,'ce15.bak173')
def rep(a,b):
    global s
    assert s.count(a)==1,('missing',a[:80]);s=s.replace(a,b)
# schedule sheet: four channels, defaults from settings
rep('''<button type="button" class="v157net" data-v157="net" data-n="ig" aria-pressed="${!!S.nets.ig}">אינסטגרם</button></div>''',
 '''<button type="button" class="v157net" data-v157="net" data-n="ig" aria-pressed="${!!S.nets.ig}">אינסטגרם</button>     <button type="button" class="v157net" data-v157="net" data-n="tt" aria-pressed="${!!S.nets.tt}">טיקטוק</button>     <button type="button" class="v157net" data-v157="net" data-n="yt" aria-pressed="${!!S.nets.yt}">יוטיוב</button>${S.nets.yt?'<span class="v157ytn">יוטיוב מקבל רק סרטונים. פוסט תמונה יישלח לשאר הערוצים</span>':''}</div>''')
rep("${S.at&&(S.nets.fb||S.nets.ig)?'':'disabled'}","${S.at&&(S.nets.fb||S.nets.ig||S.nets.tt||S.nets.yt)?'':'disabled'}")
rep("S.nets=it&&it.nets?Object.assign({fb:true,ig:true},it.nets):{fb:true,ig:true};","S.nets=it&&it.nets?Object.assign({fb:true,ig:true},it.nets):(window.__v173?__v173.defNets():{fb:true,ig:true});")
# composer: four channel toggles
rep("${['fb','ig'].map(k=>`<button class=\"av\" type=\"button\" data-app=\"cnet\"","${['fb','ig','tt','yt'].map(k=>`<button class=\"av\" type=\"button\" data-app=\"cnet\"")
rep("case 'cnet':C.nets[b.dataset.k]=!C.nets[b.dataset.k];if(!C.nets.fb&&!C.nets.ig)C.nets[b.dataset.k]=true;","case 'cnet':C.nets[b.dataset.k]=!C.nets[b.dataset.k];if(!C.nets.fb&&!C.nets.ig&&!C.nets.tt&&!C.nets.yt)C.nets[b.dataset.k]=true;")
rep('aria-pressed="${C.nets[k]}" aria-label="${NETS[k].n}">${MARK(18)}','aria-pressed="${!!C.nets[k]}" aria-label="${NETS[k].n}">${MARK(18)}')
M2='// ================= V83 · safe external opener'
rep(M2,open('v173.js',encoding='utf8').read()+'\n'+M2)
rep('<style id="k150">',open('k173css.txt',encoding='utf8').read()+'\n<style id="k150">')
open(P,'w',encoding='utf8').write(s);print('ok 173',P)
