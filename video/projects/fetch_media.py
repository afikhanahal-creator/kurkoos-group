"""Download the media the reel projects use from the content engine library (Supabase storage, public bucket).
python3 video/projects/fetch_media.py   -> video/projects/_media/<name>
To replace a picture: change its library_id in media.json (or drop a file with the same name into _media/)."""
import json, os, urllib.request
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, '_media'); os.makedirs(OUT, exist_ok=True)
BASE = 'https://filnzlnvujnlazwcxbuq.supabase.co/storage/v1/object/public/engine-media/blob/'
for name, it in json.load(open(os.path.join(HERE, 'media.json'), encoding='utf-8')).items():
    p = os.path.join(OUT, name)
    if os.path.exists(p) or 'library_id' not in it: continue
    urllib.request.urlretrieve(BASE + it['library_id'], p); print('got', name)
