import os,sys,re
H=os.path.dirname(os.path.abspath(__file__))
P=sys.argv[1] if len(sys.argv)>1 else 'ce15.html'
s=open(P,encoding='utf8').read()
def splice(s,n):
    js=open(os.path.join(H,'v%s.js'%n),encoding='utf8').read().strip('\n')
    A,Z='/*V%s:START*/'%n,'/*V%s:END*/'%n
    if A in s:
        i=s.index(A);j=s.index(Z,i)+len(Z);s=s[:i]+js+s[j:]
    else:
        B='// ================= V83 · safe external opener'
        assert s.count(B)==1;s=s.replace(B,js+'\n\n'+B)
    css=open(os.path.join(H,'k%scss.txt'%n),encoding='utf8').read().strip()
    tag='<style id="k%s">'%n
    if tag in s:
        i=s.index(tag);j=s.index('</style>',i)+len('</style>');s=s[:i]+css+s[j:]
    else:
        assert s.count('<style id="k150">')==1;s=s.replace('<style id="k150">',css+'<style id="k150">')
    assert s.count(A)==1
    return s
for n in ('222','223','224'):
    s=splice(s,n)
# V222 · the template library's sample post never comes from a clone or a competitor post, so previews show our photos
old="DEMO=(AG.posts||[]).find(p=>/^x_t_/.test(p.layout)&&p.visual&&(p.visual.sub||'').length>20&&peSlots(p).length)||(AG.posts||[]).find(p=>/^x_t_/.test(p.layout));return DEMO}"
new="const ok=p=>p&&!/^x_t_(v202|cl_|cl2_|c27_)/.test(p.layout)&&!['comp','comppost','clone','inspo','cloned'].includes(p.src)&&!(p.series&&/שכפול|מתחרים|השראה|שוכפל/.test(p.series))&&!p.compId&&!p.compPostId;DEMO=(AG.posts||[]).find(p=>ok(p)&&/^x_t_/.test(p.layout)&&p.visual&&(p.visual.sub||'').length>20&&peSlots(p).length)||(AG.posts||[]).find(p=>ok(p)&&/^x_t_/.test(p.layout))||(AG.posts||[]).find(p=>/^x_t_/.test(p.layout));return DEMO}"
if old in s: s=s.replace(old,new)
assert s.count(new)==1,'V209 demo patch'
# V224 · the studio's Claude calls run on the complex tier (Opus 5.5), and the cloud editor gets the notes and the reel plan
a=s.index('/*V204:START*/');z=s.index('/*V204:END*/',a)
blk=s[a:z].replace("modelTier:'default'","modelTier:'complex'")
s=s[:a]+blk+s[z:]
assert s[a:z].count("modelTier:'complex'")>=2,'V204 tier patch'
old2="planNote:d.planNote||null,artifact:ART}"
new2="planNote:d.planNote||null,reel:d.reel||null,reelPrompt:d.reelPrompt||null,fixes:d.fixes||null,fixNote:d.fixNote||null,artifact:ART}"
if old2 in s: s=s.replace(old2,new2)
assert s.count(new2)==1,'fire payload patch'
open(P,'w',encoding='utf8').write(s);print('ok 222+223+224',P)
