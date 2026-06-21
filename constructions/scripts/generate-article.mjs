// ============================================================
// המדריך לתהליך הבנייה — מחולל הכתבה השבועית.
// קורא ל-Claude עם constructions/prompt.md, מקבל MDX, וכותב קובץ מודול
// תחת src/content/constructions/<date>-<slug>.js — המבנה ש-useConstructions()
// (src/lib/constructions.js) טוען אוטומטית.
//
// הרצה: ANTHROPIC_API_KEY=... node constructions/scripts/generate-article.mjs
// ============================================================
import Anthropic from '@anthropic-ai/sdk'
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dir = dirname(fileURLToPath(import.meta.url))
const root = join(__dir, '..', '..')
const SYSTEM = readFileSync(join(__dir, '..', 'prompt.md'), 'utf8')
const contentDir = join(root, 'src', 'content', 'constructions')
if (!existsSync(contentDir)) mkdirSync(contentDir, { recursive: true })

const existing = readdirSync(contentDir).filter((f) => f.endsWith('.js')).sort()
const recent = existing.slice(-6).join(', ') || 'אין עדיין'
const today = new Date().toISOString().slice(0, 10)
const calendar = readFileSync(join(__dir, '..', 'content-calendar.md'), 'utf8')

const client = new Anthropic()
const msg = await client.messages.create({
  model: 'claude-opus-4-8',
  max_tokens: 4000,
  system: SYSTEM,
  messages: [{
    role: 'user',
    content:
      `כתוב את כתבת יום ראשון הקרוב. התאריך: ${today}.\n` +
      `אל תחזור על נושאים מהקבצים האחרונים: ${recent}.\n` +
      `לוח הנושאים לבחירה:\n${calendar}\n` +
      `החזר רק בלוק MDX אחד, בלי טקסט נוסף.`,
  }],
})

const text = (msg.content.find((b) => b.type === 'text') || {}).text || ''
const mdx = text.replace(/^```(?:mdx|markdown)?\n?/, '').replace(/```\s*$/, '').trim()
const m = mdx.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
if (!m) { console.error('לא נמצא frontmatter תקין'); process.exit(1) }

const fm = {}
for (const line of m[1].split('\n')) {
  const i = line.indexOf(':')
  if (i === -1) continue
  const k = line.slice(0, i).trim()
  let v = line.slice(i + 1).trim()
  if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1)
  fm[k] = v
}
const body = m[2].trim()

let tags = []
try { tags = JSON.parse(fm.tags) }
catch { tags = String(fm.tags || '').replace(/[[\]"]/g, '').split(',').map((s) => s.trim()).filter(Boolean) }

const slug = (fm.slug || today).trim()
const date = (fm.date || today).trim()
const obj = {
  slug,
  title: fm.title || '',
  date,
  author: fm.author || 'המערכת, טור ביצוע ובנייה',
  authorTitle: fm.authorTitle || 'ביצוע ובנייה · קבוצת קורקוס',
  category: fm.category || 'שלבי ביצוע',
  tags,
  focusKeyword: fm.focusKeyword || '',
  metaTitle: fm.metaTitle || '',
  metaDescription: fm.metaDescription || '',
  cover: fm.coverImage || fm.cover || '',
  coverAlt: fm.coverAlt || '',
  excerpt: fm.excerpt || '',
  readingTime: fm.readingTime || '',
  published: true,
  body,
}

const file = `// נוצר אוטומטית — המדריך לתהליך הבנייה · ${date}\nexport default ${JSON.stringify(obj, null, 2)}\n`
writeFileSync(join(contentDir, `${date}-${slug}.js`), file)
console.log('נכתבה כתבה:', `${date}-${slug}.js`)
