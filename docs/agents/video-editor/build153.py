import shutil
P='ce15.html'
s=open(P,encoding='utf8').read()
if 'V153 ·' in s: raise SystemExit('already built')
shutil.copy(P,'ce15.bak153')
def rep(a,b):
    global s
    assert s.count(a)==1,(a[:70],s.count(a));s=s.replace(a,b)
# V153 · feed simulator: profile header, full width grid (3 or 4 columns), sharp tiles, info on the tile
rep('<div class="px-feedv"><div class="px-card2"><header><h3>איך ייראה הפרופיל בעוד 30 יום</h3><span class="muted">${list.length} פוסטים מתוזמנים · החדש ביותר למעלה, כמו באינסטגרם</span></header>${pxFeedHtml(n)}</div>',
    '<div class="px-feedv v153 c${window.__v153c?__v153c():3}"><div class="px-card2 v153main">${window.__v153h?__v153h(list,w.length+g.length):\'\'}${pxFeedHtml(n)}</div>')
rep('<aside class="px-card2"><header><h3>בדיקת קצב</h3></header>${w.length||g.length?','<aside class="px-card2 v153side"><header><h3>בדיקת קצב</h3></header>${w.length||g.length?')
rep('<figure class="${bad.has(i)?\'w\':\'\'}" title="${esc(bad.get(i)||\'\')}"><canvas data-tp="${x.p.id}" width="216" height="270" aria-hidden="true"></canvas><figcaption>${fmtD(x.it.at)} · ${hm(x.it.at)}${bad.has(i)?` <b>${esc(bad.get(i))}</b>`:\'\'}</figcaption></figure>',
    '<figure class="${bad.has(i)?\'w\':\'\'}" title="${esc(bad.get(i)||\'\')}"><canvas data-tp="${x.p.id}" width="432" height="540" aria-hidden="true"></canvas><figcaption><span class="v153d">${fmtD(x.it.at)} · ${hm(x.it.at)}</span>${bad.has(i)?` <b>${esc(bad.get(i))}</b>`:\'\'}</figcaption></figure>')
css=open('k153css.txt',encoding='utf8').read()
rep('<style id="k150">',css+'<style id="k150">')
M='// ================= V83 · safe external opener'
s=s.replace(M,open('v153.js',encoding='utf8').read()+'\n'+M)
open(P,'w',encoding='utf8').write(s);print('ok 153')
