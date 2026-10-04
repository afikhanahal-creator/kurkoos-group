import shutil
P='ce15.html'
s=open(P,encoding='utf8').read()
if 'V124 ·' in s: raise SystemExit('already built')
shutil.copy(P,'ce15.bak124')
a="if(a==='gen'){for(const x of IB.items.filter(y=>y.status==='new'))await genFor(x);return toast('הטיוטות במאגר. שום דבר לא פורסם')}"
assert s.count(a)==1
s=s.replace(a,"if(a==='gen'){const nw=IB.items.filter(y=>y.status==='new');if(!nw.length)return toast('אין חומרים חדשים לסדרה. העלו תמונות או סרטון ב\"העלאת חומרים\", ואז \"צור סדרה\"');for(const x of nw)await genFor(x);return toast('הטיוטות במאגר. שום דבר לא פורסם')}")
M='// ================= V83 · safe external opener'
assert s.count(M)==1 and s.count('</head>')==1
s=s.replace(M,open('v124.js',encoding='utf8').read()+'\n'+M).replace('</head>',open('k124css.txt',encoding='utf8').read()+'</head>')
open(P,'w',encoding='utf8').write(s);print('ok',len(s))
