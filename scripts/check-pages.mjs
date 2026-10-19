/* כל עמוד באתר חייב להיות מנוהל מעורך העמודים (src/lib/pageBuilder/defs),
   או מופיע ברשימת EXCLUDED עם סיבה. עמוד חדש שלא נוסף מכשיל את ה-build. */
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const app = readFileSync(join(root, 'src/App.jsx'), 'utf8')
const routes = [...app.matchAll(/<Route\s+path="([^"]+)"/g)].map((m) => m[1])
const dir = join(root, 'src/lib/pageBuilder/defs')
const covered = new Set()
for (const f of readdirSync(dir)) {
  if (!f.endsWith('.js') || f === 'index.js') continue
  for (const m of readFileSync(join(dir, f), 'utf8').matchAll(/route:\s*'([^']+)'/g)) covered.add(m[1])
}
const idx = readFileSync(join(dir, 'index.js'), 'utf8')
const excl = idx.slice(idx.indexOf('EXCLUDED'))
for (const m of excl.matchAll(/^\s*'([^']+)':/gm)) covered.add(m[1])
const missing = routes.filter((r) => !covered.has(r))
if (missing.length) {
  console.error(`✗ עמודים שלא נוספו לעורך העמודים: ${missing.join(', ')}`)
  console.error('  הוסיפו הגדרה ב-src/lib/pageBuilder/defs/<page>.js (route זהה ל-App.jsx), או סיבה ב-EXCLUDED שב-defs/index.js')
  process.exit(1)
}
console.log(`✓ עורך העמודים: כל ${routes.length} הנתיבים מכוסים`)
