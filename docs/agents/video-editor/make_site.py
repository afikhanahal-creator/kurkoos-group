"""Builds the site version of the content engine (public/engine/) from the claude.ai artifact file.

python3 docs/agents/video-editor/make_site.py <ce15.html> <assets dir with fx/ sfx/ copy_v91.json new_templates.json>

The page itself is the same; the bridge (bridge.js) supplies what claude.ai supplied, from the site's own Supabase and API.
"""
import os, re, shutil, sys

src, assets = sys.argv[1], sys.argv[2]
root = os.path.join(os.path.dirname(__file__), '..', '..', '..', 'public', 'engine')
root = os.path.abspath(root)
s = open(src, encoding='utf8').read()
head = ('<base href="/engine/"><meta name="robots" content="noindex,nofollow">'
        '<link rel="manifest" href="/engine/manifest.webmanifest"><meta name="theme-color" content="#07293a">'
        '<script src="bridge.js"></script>')
assert s.count('<head>') >= 1
s = s.replace('<head>', '<head>' + head, 1)
# uploaded files resolve straight to storage (no redirect round trip)
s = s.replace("('/_blob/'+id)", "((window.__BLOB||'/_blob/')+id)")
open(os.path.join(root, 'index.html'), 'w', encoding='utf8').write(s)
for d in ('fx', 'sfx'):
    dst = os.path.join(root, d)
    if os.path.isdir(dst): shutil.rmtree(dst)
    shutil.copytree(os.path.join(assets, d), dst)
for f in ('copy_v91.json', 'new_templates.json'):
    shutil.copy(os.path.join(assets, f), os.path.join(root, f))
print('ok', os.path.getsize(os.path.join(root, 'index.html')))
