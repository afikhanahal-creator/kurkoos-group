import re,shutil
P='ce15.html'
s=open(P,encoding='utf8').read()
if 'V108 ·' in s:
    raise SystemExit('already built')
shutil.copy(P,'ce15.bak108')
js=open('v108.js',encoding='utf8').read()
css=open('k108css.txt',encoding='utf8').read()
M='// ================= V83 · safe external opener'
assert s.count(M)==1
s=s.replace(M,js+'\n'+M)
assert s.count('</head>')==1
s=s.replace('</head>',css+'</head>')
# the pinned close button and the back gesture know the preview
a="const SEL='#ga-lb,#pe-root,#cmp-root,.cmpb,.v103sh,#v66tp,#v68sp,.v52m,.dg-modal,.px-cmdb,.px-insp,.v44bd,.v50modal,.v62ov,.v63ov,.v65cmp,.ov';"
assert s.count(a)==1,s.count(a)
s=s.replace(a,a.replace(".v65cmp,.ov'",".v65cmp,.v108pv,.ov'"))
b="const CLOSERS='[data-v103=\"close\"],[data-ga=\"lbx\"],"
assert s.count(b)==1
s=s.replace(b,"const CLOSERS='[data-v108=\"close\"],[data-v103=\"close\"],[data-ga=\"lbx\"],")
open(P,'w',encoding='utf8').write(s)
print('ok',len(s))
