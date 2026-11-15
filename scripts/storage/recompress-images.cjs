// Re-encode stored images in place (same path, same format, so every link and every post keeps working), to keep the
// project inside the free plan's 1 GB (2026-11-15: the owner stays on the free plan). JPEG: the long side at most
// --max px (default 2000), quality 80, progressive. WebP: quality --webp (default 75), size unchanged. A file is replaced
// only when the new one is at least 20% smaller. Every upload carries cache-control max-age=31536000.
// The list is a JSON file ([{ bucket, name, size, mimetype }], made with the SQL in the README below).
// Needs Pillow (python3 -c "import PIL") and policies_images_on.sql (run policies_images_off.sql after).
// node recompress-images.cjs list.json [--dry] [--max 2000] [--webp 75]
const fs = require('fs'); const path = require('path'); const cp = require('child_process')
const A = Object.fromEntries(process.argv.slice(3).map((a, i, v) => a.startsWith('--') ? [a.slice(2), (v[i + 1] && !v[i + 1].startsWith('--')) ? v[i + 1] : true] : []).filter((x) => x.length))
const LIST = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')); const MAX = +A.max || 2000; const WQ = +A.webp || 75
const H = __dirname; const TMP = path.join(H, 'tmp-img'); fs.mkdirSync(TMP, { recursive: true })
const KEY = (fs.readFileSync(path.join(H, '..', '..', 'public', 'engine', 'bridge.js'), 'utf8').match(/const KEY = '([^']+)'/) || [])[1]
const SB = 'https://filnzlnvujnlazwcxbuq.supabase.co'
const log = (s) => { const l = new Date().toISOString().slice(11, 19) + ' ' + s; console.log(l); fs.appendFileSync(path.join(H, 'recompress-images.log'), l + '\n') }
const sh = (c) => cp.execSync(c, { maxBuffer: 64e6, stdio: ['ignore', 'pipe', 'pipe'] }).toString()
const DONE = path.join(H, 'recompress-images.done')
const done = new Set(fs.existsSync(DONE) ? fs.readFileSync(DONE, 'utf8').split('\n').filter(Boolean) : [])
let before = 0, after = 0, n = 0
for (const f of LIST) {
  const key = f.bucket + '/' + f.name; if (done.has(key)) continue
  const webp = /webp/.test(f.mimetype || ''); const type = webp ? 'image/webp' : 'image/jpeg'
  if (!/jpeg|webp/.test(f.mimetype || '')) continue
  const src = path.join(TMP, 'in'), dst = path.join(TMP, 'out')
  try {
    const g = sh(`curl -s -m 120 -o "${src}" -w '%{http_code}' "${SB}/storage/v1/object/public/${encodeURI(key)}"`).trim()
    if (g === '402') { log('STOP: Supabase answered 402 (the project is restricted).'); process.exit(3) }
    if (g !== '200') throw new Error('get ' + g)
    sh(`python3 - "${src}" "${dst}" ${webp ? 'webp' : 'jpeg'} ${MAX} ${WQ} <<'EOF'
import sys
from PIL import Image, ImageOps
src, dst, fmt, mx, wq = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4]), int(sys.argv[5])
im = Image.open(src)
if fmt == 'jpeg':
    im = ImageOps.exif_transpose(im).convert('RGB')
    if max(im.size) > mx:
        im.thumbnail((mx, mx), Image.LANCZOS)
    im.save(dst, 'JPEG', quality=80, optimize=True, progressive=True)
else:
    im.save(dst, 'WEBP', quality=wq, method=6)
EOF`)
    const a = fs.statSync(src).size, b = fs.statSync(dst).size
    if (b > a * 0.8) { fs.appendFileSync(DONE, key + '\n'); continue }
    if (!A.dry) {
      let u
      for (let k = 0; k < 5; k++) {
        u = sh(`curl -s -m 120 -X PUT -w '%{http_code}' -o /dev/null -H 'apikey: ${KEY}' -H 'Authorization: Bearer ${KEY}' -H 'Content-Type: ${type}' -H 'x-upsert: true' -H 'cache-control: max-age=31536000' --data-binary @"${dst}" "${SB}/storage/v1/object/${encodeURI(key)}"`).trim()
        if (u !== '429' && !u.startsWith('5')) break
        cp.execSync('sleep ' + (5 + k * 5))
      }
      if (u !== '200') throw new Error('upload ' + u)
    }
    before += a; after += b; n++; fs.appendFileSync(DONE, key + '\n')
    if (n % 50 === 0) log(`${A.dry ? 'would replace' : 'replaced'} ${n}: ${(before / 1048576).toFixed(0)} → ${(after / 1048576).toFixed(0)} MB`)
  } catch (e) { log('ERR ' + key + ' ' + String(e.message).slice(0, 160)); if (/upload 4/.test(e.message)) break }
}
log(`done ${n}${A.dry ? ' (dry run)' : ''}, ${(before / 1048576).toFixed(0)} MB → ${(after / 1048576).toFixed(0)} MB`)
// README — the list (Supabase SQL editor / connector), then save the JSON next to this script:
//   select coalesce(json_agg(json_build_object('bucket',bucket_id,'name',name,'size',(metadata->>'size')::bigint,'mimetype',metadata->>'mimetype')
//     order by (metadata->>'size')::bigint desc),'[]') from storage.objects
//   where bucket_id = 'engine-media' and name like 'blob/%' and name not like 'blob/meta/%'
//     and metadata->>'mimetype' in ('image/jpeg','image/webp') and (metadata->>'size')::bigint > 60000;
