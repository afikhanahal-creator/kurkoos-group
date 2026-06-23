// ============================================================
// טור יזמות נדל"ן — מחולל הכתבה השבועית.
// קורא ל-Claude עם פרומפט הסוכן (yazamut_nadlan/prompt.md), מקבל MDX,
// וממיר אותו לקובץ מודול תחת src/content/yazamut/<date>-<slug>.js —
// בדיוק המבנה ש-getArticles() (src/lib/yazamut.js) טוען אוטומטית.
//
// הרצה:  ANTHROPIC_API_KEY=... node yazamut_nadlan/scripts/generate-article.mjs
// (ה-GitHub Action מריץ את זה כל יום ראשון; ראו AUTOMATION.md)
// ============================================================
import Anthropic from '@anthropic-ai/sdk'
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dir = dirname(fileURLToPath(import.meta.url))
const root = join(__dir, '..', '..')
const SYSTEM = readFileSync(join(__dir, '..', 'prompt.md'), 'utf8')
const contentDir = join(root, 'src', 'content', 'yazamut')
if (!existsSync(contentDir)) mkdirSync(contentDir, { recursive: true })

// נושאים אחרונים (להימנע מחזרה)
const existing = readdirSync(contentDir).filter((f) => f.endsWith('.js')).sort()
const recent = existing.slice(-6).join(', ') || 'אין עדיין'

const today = new Date().toISOString().slice(0, 10)
const calendar = readFileSync(join(__dir, '..', 'content-calendar.md'), 'utf8')

const client = new Anthropic() // לוקח ANTHROPIC_API_KEY מהסביבה
const msg = await client.messages.create({
  model: 'claude-opus-4-8',
  max_tokens: 6000,
  system: SYSTEM,
  messages: [{
    role: 'user',
    content:
      `כתוב את כתבת יום ראשון הקרוב. התאריך: ${today}.\n` +
      `אל תחזור על נושאים מהקבצים האחרונים: ${recent}.\n` +
      `לוח הנושאים לבחירה:\n${calendar}\n` +
      `אין כלים זמינים בריצה זו — כתוב מתוך הידע שלך, אל תנסה לחפש.\n` +
      `התחל את התשובה מיד בשורת "---" (ה-frontmatter), בלי שום טקסט לפני, בלי code fences, ובלי טקסט אחרי.`,
  }],
})

const text = (msg.content.find((b) => b.type === 'text') || {}).text || ''
// פענוח עמיד: נרמול שורות, הסרת code-fence עם כל שפה, ואיתור בלוק ה-frontmatter
// גם אם יש רווח/שורה לפניו (--- ... ---) — כך הפלט לא נכשל על עיטוף/רווחים/CRLF.
let mdx = text.replace(/\r\n/g, '\n').trim()
mdx = mdx.replace(/^```[^\n]*\n/, '').replace(/\n?```\s*$/, '').trim()

const m = mdx.match(/^\s*---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/)
if (!m) { console.error('לא נמצא frontmatter תקין בפלט. תחילת הפלט:\n' + mdx.slice(0, 300)); process.exit(1) }

const fm = {}
for (const line of m[1].split('\n')) {
  const i = line.indexOf(':')
  if (i === -1) continue
  const k = line.slice(0, i).trim()
  let v = line.slice(i + 1).trim()
  if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1).replace(/\\"/g, '"')
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
  author: fm.author || 'המערכת — טור יזמות נדל"ן',
  authorTitle: fm.authorTitle || 'פרשנות נדל"ן · קבוצת קורקוס',
  category: fm.category || 'מגמות שוק',
  tags,
  cover: fm.coverImage || fm.cover || '',
  coverAlt: fm.coverAlt || '',
  excerpt: fm.excerpt || '',
  readingTime: fm.readingTime || '',
  published: true,
  body,
}

const file = `// נוצר אוטומטית — טור יזמות נדל"ן · ${date}\nexport default ${JSON.stringify(obj, null, 2)}\n`
const outPath = join(contentDir, `${date}-${slug}.js`)
writeFileSync(outPath, file)
console.log('נכתבה כתבה:', `${date}-${slug}.js`)
if (!obj.cover) console.warn('⚠️ אין coverImage — יש להוסיף תמונה ידנית לכתבה.')
