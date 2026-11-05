// Kurkoos creative studio · creative quality review
// Scores a rendered page on nine criteria (1-10), lists hard failures, and proposes fixes the generator can apply.
// The numbers come from measurements of the real render: fitted type, painted pixels under the text, image
// resolution, overlaps, palette. A score is not a substitute for looking: the studio always shows the page itself.
import { render, layoutText, hexLum, relLum, contrast, hex, brand, ALLOWED_FAMILIES, realWeight, words } from './core.js'

export const MIN_SCORE = 8.5
const CRIT = ['brand', 'hierarchy', 'typography', 'image', 'composition', 'originality', 'readability', 'professionalism', 'marketing']
export const CRIT_HE = { brand: 'עקביות מותג', hierarchy: 'היררכיה', typography: 'טיפוגרפיה', image: 'איכות תמונה', composition: 'קומפוזיציה', originality: 'מקוריות', readability: 'קריאות', professionalism: 'מקצועיות', marketing: 'אפקטיביות שיווקית' }

const inter = (a, b) => { const x = Math.max(0, Math.min(a[0] + a[2], b[0] + b[2]) - Math.max(a[0], b[0])); const y = Math.max(0, Math.min(a[1] + a[3], b[1] + b[3]) - Math.max(a[1], b[1])); return x * y }

// contrast of a text layer against the pixels actually painted beneath it
async function textContrast(page, idx, box, color) {
  const c = document.createElement('canvas')
  const s = 0.25
  await render(page, c, { scale: s, upto: idx, read: true })
  const x = c.getContext('2d', { willReadFrequently: true })
  const [bx, by, bw, bh] = box.map((v) => Math.max(0, Math.round(v * s)))
  if (bw < 1 || bh < 1) return 21
  let d; try { d = x.getImageData(bx, by, Math.min(bw, c.width - bx), Math.min(bh, c.height - by)).data } catch (e) { return 21 }
  const lums = []
  for (let i = 0; i < d.length; i += 4) { if (d[i + 3] < 10) continue; lums.push(relLum(d[i], d[i + 1], d[i + 2])) }
  if (!lums.length) return 21
  lums.sort((a, b) => a - b)
  const fg = hexLum(hex(color))
  // worst realistic case: the 10th percentile toward the text's own lightness
  const pick = fg > 0.5 ? lums[Math.floor(lums.length * 0.9)] : lums[Math.floor(lums.length * 0.1)]
  return contrast(fg, pick)
}

export async function review(scene, ctx = {}) {
  const page = { w: scene.w, h: scene.h, layers: scene.pages[ctx.page || 0] }
  const info = await render(page, document.createElement('canvas'), { scale: 0.5 })
  const issues = [] // {code, sev:'fail'|'warn', crit, msg, fix}
  const add = (crit, sev, code, msg, fix) => issues.push({ crit, sev, code, msg, fix })
  const allowed = new Set(Object.values(brand().hex).map((h) => h.toLowerCase()))
  const texts = page.layers.map((l, i) => [l, i]).filter(([l]) => l.type === 'text' && !l.hidden && l.text)
  const head0 = (() => { const h = texts.find(([l]) => l.bind === 'headline'); return h ? info[h[0].id] : null })()
  const bySize = texts.map(([l]) => (info[l.id] || {}).size || 0).sort((a, b) => b - a)

  // brand: palette, families, weights, logo
  for (const l of page.layers) {
    for (const key of ['fill', 'color']) {
      const v = l[key]; if (!v) continue
      if (!allowed.has(hex(v).toLowerCase())) add('brand', 'fail', 'color', `צבע מחוץ לפלטה: ${v} (${l.name})`, null)
    }
    if (l.lineColors) for (const v of l.lineColors) if (!allowed.has(hex(v).toLowerCase())) add('brand', 'fail', 'color', `צבע שורה מחוץ לפלטה: ${v}`, null)
    if (l.type === 'text' && !ALLOWED_FAMILIES.includes(l.family)) add('brand', 'fail', 'font', `פונט לא מאושר: ${l.family}`, null)
  }
  const logos = page.layers.filter((l) => l.type === 'logo' && !l.hidden)
  if (!logos.length) add('brand', 'warn', 'nologo', 'אין לוגו בעיצוב', null)
  for (const l of logos) { const r = (info[l.id] || {}).ratio; if (r && Math.abs(r - 1) > 0.01) add('brand', 'fail', 'logo', 'הלוגו מעוות', null) }
  // a numbering system or a progress bar counts once, it is one element
  const redGroups = new Set(page.layers.filter((l) => !l.hidden && (hex(l.fill || '') === hex('red') || hex(l.color || '') === hex('red'))).map((l) => /מספור|שלב|התקדמות|לוכסן/.test(l.name) ? l.name : l.id))
  const reds = redGroups.size
  for (const l of logos) { const d = (info[l.id] || {}).drawn; if (d && d[3] < 80 * (scene.w / 1080)) add('brand', 'warn', 'smalllogo', 'הלוגו קטן מדי לקריאה בטלפון', null) }
  if (reds > 3) add('brand', 'warn', 'red', `האדום מופיע ב-${reds} מקומות. הוא המבטא היחיד, לא יותר משניים או שלושה`, null)
  const families = new Set(texts.map(([l]) => l.family)), weights = new Set(texts.map(([l]) => realWeight(l.family, l.weight)))
  if (weights.size > 3) add('typography', 'warn', 'weights', `${weights.size} משקלים שונים בעיצוב אחד`, null)
  void families

  // typography: overflow, orphans
  for (const [l] of texts) {
    const t = info[l.id] || {}
    if (t.overflow) add('typography', 'fail', 'overflow', `הטקסט "${String(l.text).slice(0, 24)}" לא נכנס למקום שלו`, { compact: true, dropSub: l.bind === 'sub' })
    if (t.orphan && ['headline', 'hero', 'title'].includes(l.role)) add('typography', 'warn', 'orphan', `מילה בודדת בשורה האחרונה של הכותרת`, null)
    if (/\s[–—-]\s/.test(l.text)) add('typography', 'warn', 'dash', 'מקף כסימן פיסוק בעברית. עדיף נקודה או פסיק', null)
  }
  // hierarchy: one clear headline
  if (head0 && head0.size < 52 * (scene.w / 1080)) add('hierarchy', 'warn', 'smallhead', `הכותרת ${Math.round(head0.size)} פיקסלים. בגלילה בטלפון היא נבלעת`, null)
  if (bySize.length >= 2 && bySize[0] < bySize[1] * 1.45) add('hierarchy', 'warn', 'flat', 'אין קפיצת גודל ברורה בין הכותרת לשאר הטקסט', null)
  const sizes = new Set(bySize.map((s) => Math.round(s / 4)))
  if (sizes.size > 5) add('hierarchy', 'warn', 'sizes', `${sizes.size} גדלי טקסט. יותר מדי רמות`, null)

  // excessive text
  const totalWords = texts.reduce((n, [l]) => n + words(l.text), 0)
  const head = texts.find(([l]) => l.bind === 'headline')
  if (head && words(head[0].text) > 10) add('marketing', 'warn', 'longhead', `כותרת של ${words(head[0].text)} מילים. עד 8 עובד טוב יותר`, null)
  if (totalWords > (scene.pages.length > 1 ? 70 : 48)) add('readability', 'fail', 'toomuch', `${totalWords} מילים על העיצוב. יותר מדי טקסט לפוסט`, { dropSub: true })

  // overlaps between text blocks, and text outside the safe area
  const boxes = texts.map(([l]) => [l, (info[l.id] || {}).box]).filter(([, b]) => b)
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const a = boxes[i][1], b = boxes[j][1]
    if (inter(a, b) > 0.08 * Math.min(a[2] * a[3], b[2] * b[3]) && !(boxes[i][0].name === 'סימן שאלה' || boxes[j][0].name === 'סימן שאלה' || /מספר גדול|מספר$/.test(boxes[i][0].name + boxes[j][0].name))) add('composition', 'fail', 'overlap', `"${boxes[i][0].name}" עולה על "${boxes[j][0].name}"`, { compact: true })
  }
  // text must not run over the logo either
  for (const l of logos) { const d = (info[l.id] || {}).drawn; if (!d) continue; for (const [t, bx] of boxes) if (inter(d, bx) > 0.04 * d[2] * d[3]) add('composition', 'fail', 'overlap', `"${t.name}" עולה על הלוגו`, { compact: true }) }
  const k = scene.w / 1080
  for (const [l, b] of boxes) { if (/סימן שאלה|מספר גדול/.test(l.name)) continue; if (b[0] < 40 * k - 1 || b[0] + b[2] > scene.w - 40 * k + 1 || b[1] < 30 * k || b[1] + b[3] > scene.h - 30 * k) add('composition', 'fail', 'safe', `"${l.name}" יוצא מהשוליים הבטוחים`, { compact: true }) }

  // readability: contrast measured on pixels
  let minC = 21
  for (const [l, i] of texts) {
    const b = (info[l.id] || {}).box; if (!b || l.outline || /סימן שאלה|מספר גדול/.test(l.name)) continue
    const cr = await textContrast(page, i, b, l.color || 'navy')
    const large = ((info[l.id] || {}).size || 0) >= 24 * k * 1.33 || (((info[l.id] || {}).size || 0) >= 18.7 * k * 1.33 && (l.weight || 400) >= 700)
    const need = large ? 3 : 4.5
    minC = Math.min(minC, cr)
    if (cr < need) add('readability', 'fail', 'contrast', `ניגודיות ${cr.toFixed(1)}:1 ב"${l.name}" (נדרש ${need}:1)`, { scrim: 1 })
  }
  // image quality: source pixels per displayed pixel
  for (const l of page.layers.filter((x) => x.type === 'image' && !x.hidden)) {
    const t = info[l.id] || {}
    if (t.missing) add('image', 'fail', 'missing', `התמונה "${l.name}" לא נטענה`, null)
    else if (t.srcPerPx < 0.55) add('image', 'fail', 'lowres', `התמונה "${l.name}" מוגדלת פי ${(1 / t.srcPerPx).toFixed(1)}. היא תיראה מטושטשת`, { smallImage: true })
    else if (t.srcPerPx < 0.8) add('image', 'warn', 'softres', `התמונה "${l.name}" מוגדלת פי ${(1 / t.srcPerPx).toFixed(1)}`, null)
  }
  // originality: against the reference library and the recent concepts
  const refs = ctx.refs || []
  const sameDir = refs.filter((r) => r.status === 'approved' && r.direction === scene.direction).length
  const rejected = refs.filter((r) => r.status === 'rejected' && r.direction === scene.direction && r.tone === scene.meta.tone).length
  if (rejected) add('originality', 'warn', 'rejected', `כיוון דומה (${scene.direction}, ${scene.meta.tone}) נדחה בעבר ${rejected} פעמים`, null)
  const recent = (ctx.recent || []).slice(-6).filter((d) => d === scene.direction).length
  if (recent >= 2) add('originality', 'warn', 'repeat', `אותו כיוון שימש ${recent} פעמים לאחרונה`, null)
  if (!head) add('marketing', 'fail', 'nohead', 'אין כותרת', null)

  // scores
  const score = {}
  for (const c of CRIT) {
    const mine = issues.filter((i) => i.crit === c)
    score[c] = Math.max(1, 10 - mine.filter((i) => i.sev === 'fail').length * 2.5 - mine.filter((i) => i.sev === 'warn').length * 0.8)
  }
  if (!page.layers.some((l) => l.type === 'image')) score.image = 9.2
  score.originality = Math.min(score.originality, 10 - Math.min(2, sameDir * 0.25))
  score.readability = Math.min(score.readability, minC >= 7 ? 10 : minC >= 4.5 ? 9.2 : score.readability)
  score.professionalism = Math.min(10, (score.brand + score.typography + score.composition) / 3 + 0.3)
  score.marketing = Math.min(score.marketing, head ? 10 - Math.max(0, words(head[0].text) - 8) * 0.4 : 1)
  for (const c of CRIT) score[c] = Math.round(score[c] * 10) / 10
  const total = Math.round((CRIT.reduce((s, c) => s + score[c], 0) / CRIT.length) * 10) / 10
  const fails = issues.filter((i) => i.sev === 'fail')
  return { score, total, issues, fails, approved: total >= MIN_SCORE && !fails.length, minContrast: Math.round(minC * 10) / 10 }
}
// the fixes the generator should apply on the next try
export function fixesFor(r) {
  const f = {}
  for (const i of r.issues) if (i.fix) for (const [k, v] of Object.entries(i.fix)) { if (typeof v === 'number') f[k] = (f[k] || 0) + v; else if (v) f[k] = true }
  return f
}
export { CRIT }
void layoutText
