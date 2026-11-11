import crypto from 'node:crypto'
// End-to-end acceptance test of KURKOOS FINANCE AI against the local stack (stack.sh + services.sh).
// Real database (RLS, triggers), real auth, real file storage, the real server code and the real UI in Chromium.
// Gmail and Claude are local stand-ins (fakes.mjs): the flow is real, the AI's reading quality is not tested here.
// Writes screenshots and results.json to $OUT.
import { createRequire } from 'node:module'
import fs from 'node:fs'
import { execSync } from 'node:child_process'
import { ANON, SERVICE } from './keys.mjs'
const require = createRequire(import.meta.url)
const { chromium, devices } = require('playwright')

const OUT = process.env.OUT || '/var/tmp/fin-shots'
const APP = 'http://127.0.0.1:5180/admin/finance'
const SB = 'http://127.0.0.1:54321'
const FAKES = 'http://127.0.0.1:54400'
const FIX = '/var/tmp/finfix'
const meta = JSON.parse(fs.readFileSync(`${FIX}/meta.json`, 'utf8'))
fs.mkdirSync(OUT, { recursive: true })
for (const f of fs.readdirSync(OUT)) fs.rmSync(`${OUT}/${f}`, { recursive: true })

const results = []
const consoleErrors = []
function record(id, name, expected, actual, pass, shots = []) {
  results.push({ id, name, expected, actual, pass: !!pass, shots })
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${id} ${name}\n      expected: ${expected}\n      actual:   ${actual}`)
}
const sql = (q) => execSync(`psql -At -h 127.0.0.1 -p 54329 -U postgres -c ${JSON.stringify(q)}`, { encoding: 'utf8' }).trim()
const rest = async (path, token, init = {}) => {
  const r = await fetch(`${SB}/rest/v1/${path}`, { ...init, headers: { apikey: ANON, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Prefer: 'return=representation', ...(init.headers || {}) } })
  const t = await r.text(); let d; try { d = JSON.parse(t) } catch { d = t }
  return { status: r.status, data: d }
}
const admin = (path, body) => fetch(`${SB}/auth/v1/${path}`, { method: body ? 'POST' : 'GET', headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }).then((r) => r.json())
const login = async (email, password) => (await fetch(`${SB}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) }).then((r) => r.json())).access_token
const api = async (token, body) => { const r = await fetch('http://127.0.0.1:5180/api/finance', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); return { status: r.status, data: await r.json().catch(() => ({})) } }

// ---------- fresh state ----------
execSync(`psql -q -h 127.0.0.1 -p 54329 -U postgres -f ${new URL('./reset.sql', import.meta.url).pathname}`)
const fx = JSON.parse(fs.readFileSync(`${FIX}/fixtures.json`, 'utf8')); fx.mailboxes['broken@kurkoos.test'].failing = true; fs.writeFileSync(`${FIX}/fixtures.json`, JSON.stringify(fx, null, 1))
await fetch(`${FAKES}/__reset`)
await admin('admin/users', { email: 'admin@kurkoos.test', password: 'Passw0rd!x', email_confirm: true, user_metadata: { full_name: 'שלומי קורקוס' } })

// a UTF-8 locale: without it Chromium on Linux saves a download with a Hebrew name as "download"
const browser = await chromium.launch({ env: { ...process.env, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' } })
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'he-IL', acceptDownloads: true })
const page = await ctx.newPage()
page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message}`))
page.on('console', (m) => { if (m.type() === 'error' && !/favicon|websocket|realtime|Failed to load resource/i.test(m.text())) consoleErrors.push(m.text()) })
page.on('dialog', (d) => d.accept())
const shot = async (name, p = page) => { await p.waitForTimeout(350); await p.screenshot({ path: `${OUT}/${name}.png` }); return `${name}.png` }
const go = async (path, p = page) => { await p.goto(`${APP}${path}`); await p.waitForLoadState('networkidle').catch(() => {}); await p.waitForTimeout(500) }
// waits for the dialog to close (a save can take longer than a fixed pause); a dialog that stays open (a validation error) goes on after 5 s
const modalSave = async (p = page) => { await p.locator('.fin-modal__foot .fin-btn--primary').first().click(); await p.waitForTimeout(900); await p.waitForSelector('.fin-modal', { state: 'detached', timeout: 5000 }).catch(() => {}) }
const lbl = (re, p = page) => p.getByLabel(re).first()
const waitProcessed = async (names) => { for (let i = 0; i < 40; i++) { if (sql(`select count(*) from fin_documents where file_name in (${names.map((n) => `'${n}'`).join(',')}) and status <> 'processing'`) === String(names.length)) return true; await page.waitForTimeout(500) } return false }
const nav = async (label) => {
  await page.waitForSelector('.fin__nav', { timeout: 30000 }).catch(() => {})   // the shell first: a reload takes a moment
  const it = page.locator('.fin__nav-item', { hasText: label }).first()
  if (!(await it.isVisible())) { const more = page.locator('.fin__nav-group.is-folded', { has: page.locator('.fin__nav-item', { hasText: label }) }).locator('.fin__nav-more').first(); if (await more.isVisible()) await more.click() }
  await it.click(); await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(500)
}

// ---------- T0: sign in, first admin ----------
await go('')
await page.fill('input[type=email]', 'admin@kurkoos.test'); await page.fill('input[type=password]', 'Passw0rd!x')
await page.click('button[type=submit]')
await page.getByRole('button', { name: 'אני מנהל/ת המערכת' }).click()
await page.waitForSelector('.fin__nav')
const navCount = await page.locator('.fin__nav-item').count()
const t0Shot = await shot('00-dashboard-empty')
await nav('הארגון ומשתמשים'); await page.waitForTimeout(600)
const heroTitle = await page.locator('.fin-hero-empty h3').innerText().catch(() => '')
const heroShot = await shot('66-team-empty')
await page.getByRole('button', { name: /מדריך שלב אחרי שלב/ }).click(); await page.waitForTimeout(300)
const guideSteps = await page.locator('.fin-modal .fin-guide__steps li').count()
const teamGuideShot = await shot('67-team-guide')
await page.getByRole('button', { name: 'להזמנה' }).click(); await page.waitForTimeout(300)
const roleCards = await page.locator('.fin-modal .fin-rolecard').count()
const roleDefault = await page.locator('.fin-modal .fin-rolecard.is-on').innerText()
const inviteShot = await shot('68-team-invite')
await page.locator('.fin-modal__foot .fin-btn', { hasText: 'ביטול' }).click()
record('TEAM', 'הזמנת רו״ח או צוות: מצב ריק ומדריך', 'כשבארגון רק המנהל: מסך הזמנה עם מדריך שלב אחרי שלב; טופס ההזמנה בוחר תפקיד בכרטיסים, וברירת המחדל היא רו״ח', `כותרת: "${heroTitle}"; שלבים: ${guideSteps}; כרטיסי תפקיד: ${roleCards}; ברירת מחדל: ${roleDefault.split('\n')[0]}`,
  /רואה החשבון/.test(heroTitle) && guideSteps === 5 && roleCards === 4 && /רואה חשבון/.test(roleDefault), [heroShot, teamGuideShot, inviteShot])
await nav('היסטוריית ייצוא'); await page.waitForTimeout(500)
const expEmpty = { art: await page.locator('.fin-firstexp__art').count(), steps: await page.locator('.fin-firstexp__steps li').count() }
await page.getByRole('button', { name: 'מדריך שלב אחרי שלב' }).click(); await page.waitForTimeout(200)
expEmpty.guide = await page.locator('.fin-firstexp__guide li').count()
const expEmptyShot = await shot('72-export-history-empty')
await page.getByRole('button', { name: 'בחירת מסמכים לשליחה' }).click(); await page.waitForTimeout(500)
expEmpty.to = new URL(page.url()).pathname.replace('/admin/finance', '')
record('EXP0', 'היסטוריית ייצוא ריקה: הסבר ודרך להתחיל', 'איור, 4 שלבים, מדריך מפורט, וכפתור שמוביל למסך השליחה לרו״ח', JSON.stringify(expEmpty), expEmpty.art === 1 && expEmpty.steps === 4 && expEmpty.guide === 4 && expEmpty.to === '/send', [expEmptyShot])
await nav('מרכז בקרה')
record('T0', 'כניסה והגדרת מנהל ראשון', 'המשתמש הראשון נהיה מנהל ורואה 29 פריטי תפריט (הקבוצות "קליטה" ו"מתקדם" מקופלות עד שנכנסים אליהן)', `${navCount} פריטי תפריט, תפקיד ${sql("select role from fin_members")}`, navCount === 29, [t0Shot])

// ---------- setup through the UI: companies, project ----------
await nav('חברות')
await page.locator('tbody tr').first().click(); await page.waitForTimeout(700)
await page.getByRole('button', { name: 'עריכה', exact: true }).click()
await lbl(/^מספר עוסק במע״מ/).fill(meta.IDS.kurkoos)
await lbl(/^מייל רו״ח/).fill('cpa@accountants.test')
await modalSave()
await nav('חברות')
await page.getByRole('button', { name: 'הוסף חברה' }).first().click()
await lbl(/^שם משפטי/).fill('קורקוס ביצוע')
await lbl(/^מספר עוסק במע״מ/).fill(meta.IDS.execution)
await modalSave()
await nav('חברות')
const companiesShot = await shot('01-companies')
await nav('פרויקטים')
await page.getByRole('button', { name: 'הוסף פרויקט' }).first().click()
await lbl(/^שם הפרויקט/).fill('מוהליבר 17')
await lbl(/^קוד פנימי/).fill('MOH-17')
await lbl(/^חברה משפטית/).selectOption({ label: 'קורקוס גרופ' })
await lbl(/^כתובת הפרויקט/).fill('מוהליבר 17, תל אביב')
await lbl(/^מילות זיהוי/).fill('מוהליבר')
await modalSave()
await nav('פרויקטים')
const projectsShot = await shot('02-projects')
record('S1', 'הקמת חברות ופרויקט מהממשק', 'שתי חברות עם ח.פ, פרויקט עם קוד ומילת מפתח', `${sql('select count(*) from fin_businesses where vat_id is not null')} חברות עם ח.פ, פרויקט: ${sql("select name||' '||code from fin_projects")}`, sql('select count(*) from fin_businesses where vat_id is not null') === '2' && sql('select count(*) from fin_projects') === '1', [companiesShot, projectsShot])

// ---------- T1: connect Gmail (OAuth round trip) ----------
await nav('חשבונות אימייל')
await page.getByRole('button', { name: 'חיבור Gmail' }).click()
await page.waitForURL(/mailboxes\?connected=|mailboxes$/, { timeout: 15000 }); await page.waitForTimeout(800)
const t1 = sql("select email||'|'||status||'|'||(select count(*) from fin_mailbox_secrets) from fin_mailboxes")
record('T1', 'חיבור חשבון Gmail', 'זרימת OAuth מלאה: התיבה נשמרת מחוברת, הטוקן נשמר בטבלת הסודות בלבד', t1, t1 === 'invoices@kurkoos.test|active|1', [await shot('03-mailbox-connected')])
const anonSecrets = await rest('fin_mailbox_secrets?select=*', await login('admin@kurkoos.test', 'Passw0rd!x'))
record('SEC1', 'טוקן OAuth לא נגיש לדפדפן', 'גם מנהל מחובר לא יכול לקרוא את טבלת הסודות', `HTTP ${anonSecrets.status}`, anonSecrets.status === 401 || anonSecrets.status === 403 || (Array.isArray(anonSecrets.data) && anonSecrets.data.length === 0))

// ---------- T2 + T3: scan, find invoices, download originals ----------
await page.getByRole('button', { name: 'סנכרון כל החשבונות עכשיו' }).click()
await page.waitForSelector('.fin-note', { timeout: 60000 }); await page.waitForTimeout(800)
const scanMsg = await page.locator('.fin-note').first().innerText()
const docs = sql("select string_agg(coalesce(supplier_name,'?')||':'||status||':'||source, ', ' order by email_date) from fin_documents")
const files = sql("select count(*) from storage.objects where bucket_id='finance-docs'")
record('T2', 'סריקת התיבה וזיהוי חשבוניות', 'נמצאות חשבוניות גם כשהנושא לא אומר "חשבונית" (Bezeq statement) וגם קבלה בגוף המייל; הניוזלטר מדולג', `${scanMsg} → ${docs}`, /בזק/.test(docs) && /פז/.test(docs) && /טמבור/.test(docs) && !/קטלוג/.test(docs), [await shot('04-scan-result')])
const dupPdf = sql("select count(*) from fin_documents where file_name='tambour-4521.pdf'")
const skippedLog = sql("select details->>'not_financial' from fin_agent_runs where agent='collector' order by started_at desc limit 1")
record('T3', 'הורדת הקובץ המקורי', 'כל מסמך כספי נשמר בדלי הפרטי; אותו PDF שהגיע פעמיים נשמר פעם אחת; הדילוג על הניוזלטר נרשם', `${files} קבצים בדלי, tambour-4521.pdf ${dupPdf} פעם; דולגו: ${skippedLog}`, Number(files) >= 4 && dupPdf === '1' && /קטלוג/.test(skippedLog || ''))
const failedNow = sql("select status||':'||attempts from fin_documents where supplier_name is null or file_name='electra-778.pdf'")

// ---------- T4 + T5: extraction shown in the dashboard ----------
await nav('כל המסמכים')
const listShot = await shot('05-documents')
const row = page.locator('tbody tr', { hasText: 'טמבור' }).filter({ hasNotText: 'העתק' }).first()
await row.click(); await page.waitForSelector('.fin-panel'); await page.waitForTimeout(1500)
const field = (p, label) => p.locator('.fin-panel .fin-field').filter({ has: p.locator('.fin-field__label', { hasText: new RegExp(`^${label}`) }) }).first()
const val = async (label) => field(page, label).locator('input, select').first().inputValue()
const got = { supplier: await val('ספק'), number: await val('מספר מסמך'), date: await val('תאריך'), vat: await val('מע״מ'), total: await val('סה״כ') }
const panelShot = await shot('06-review-tambour')
record('T4', 'חילוץ ספק, מספר, תאריך, מע״מ וסה״כ', `טמבור · 4521 · ${meta.D.tambour} · 549.15 · 3600`, `${got.supplier} · ${got.number} · ${got.date} · ${got.vat} · ${got.total}`, got.supplier.includes('טמבור') && got.number === '4521' && got.date === meta.D.tambour && Number(got.vat) === 549.15 && Number(got.total) === 3600, [panelShot])
const sugg = await page.locator('.fin-suggest', { hasText: 'מוהליבר 17' }).count()
await page.getByRole('tab', { name: /בקרה/ }).click(); await page.waitForTimeout(300)
const checksShot = await shot('07-review-checks')
await page.getByRole('tab', { name: 'פרטים' }).click()
record('A6', 'הצעת פרויקט לפי מילת מפתח, בלי שיוך אוטומטי', 'מוצעת "מוהליבר 17" אבל השדה נשאר ריק עד שאדם מחיל', `הצעות: ${sugg}, project_id: ${sql("select coalesce(project_id::text,'ריק') from fin_documents where file_name='tambour-4521.pdf'")}`, sugg === 1 && sql("select project_id is null from fin_documents where file_name='tambour-4521.pdf'") === 't', [checksShot])
await page.keyboard.press('Escape'); await page.waitForTimeout(400)
await nav('מרכז בקרה')
const tile = async (k) => Number((await page.locator(`.fin-tile[data-k="${k}"] .fin-tile__value`).innerText()).trim())
const homeNums = { fresh: await tile('fresh'), review: await tile('review'), ready: await tile('ready') }
const homeWant = { fresh: Number(sql("select count(*) from fin_documents where created_at > now() - interval '7 days' and status in ('review','processing','failed')")), review: Number(sql("select count(*) from fin_documents where status='review'")), ready: Number(sql("select count(*) from fin_documents where status='approved' and exported_at is null")) }
const recentRows = await page.locator('.fin-recent li').count()
const sources = (await page.locator('.fin-sources').innerText()).replace(/\s+/g, ' ')
const homeShot = await shot('05-home')
record('T5', 'המסמכים מופיעים במרכז הבקרה', 'המספרים (חדשים, לבדיקה, מוכנים לרו״ח) מחושבים מהרשומות; המסמכים האחרונים מופיעים; מצב האיסוף מראה את התיבה המחוברת', `במסך: ${JSON.stringify(homeNums)}; במסד: ${JSON.stringify(homeWant)}; אחרונים: ${recentRows}; איסוף: ${sources.slice(0, 80)}`, JSON.stringify(homeNums) === JSON.stringify(homeWant) && recentRows > 0 && /invoices@kurkoos\.test/.test(sources), [homeShot])

// ---------- T6: an uploaded duplicate ----------
await nav('כל המסמכים')
await page.getByRole('button', { name: 'הוספת מסמכים' }).click()
await page.locator('[data-testid=upload-input]').setInputFiles(`${FIX}/tambour-4521.pdf`)
await page.waitForSelector('.fin-drop__msg', { timeout: 20000 })
const dupMsg = await page.locator('.fin-drop__msg').innerText()
const copyStatus = sql("select status from fin_documents where file_name='tambour-4521-copy.pdf'")
record('T6', 'זיהוי כפילות במסמך שמועלה', 'העלאת אותו PDF נחסמת כ"כפילות"; עותק אחר עם אותו ספק ומספר מסומן "כפול"', `העלאה: "${dupMsg}"; העתק: ${copyStatus}`, /כפילות/.test(dupMsg) && copyStatus === 'duplicate', [await shot('09-upload-duplicate')])

// upload a real new receipt (photo) for the correction test
await page.locator('[data-testid=upload-input]').setInputFiles(`${FIX}/ace-receipt.png`)
await page.waitForFunction(() => /הועלו|שגיאה|error|נכשל/i.test(document.querySelector('.fin-drop__msg')?.textContent || ''), null, { timeout: 20000 })
const uploadMsg = await page.locator('.fin-drop__msg').innerText()
record('UP', 'העלאת צילום קבלה', 'הקובץ עולה ונקרא ע״י הסוכנים', uploadMsg, /הועלו/.test(uploadMsg))
for (let i = 0; i < 20 && sql("select status from fin_documents where file_name='ace-receipt.png'") === 'processing'; i++) await page.waitForTimeout(500)
await page.reload(); await page.waitForTimeout(1200)

// ---------- T7: correct extracted data (audit) ----------
await page.locator('tbody tr', { hasText: 'ACE' }).first().click(); await page.waitForSelector('.fin-panel'); await page.waitForTimeout(1200)
const aceBefore = sql("select total_amount||'|'||(select count(*) from jsonb_array_elements(issues) i where i->>'code' in ('sum','low_confidence')) from fin_documents where file_name='ace-receipt.png'")
const flaggedShot = await shot('10-review-flagged')
const totalInput = field(page, 'סה״כ').locator('input')
await totalInput.fill('236')
await field(page, 'חברה').locator('select').selectOption({ label: 'קורקוס גרופ' })
await page.getByRole('button', { name: 'שמירה', exact: true }).click(); await page.waitForTimeout(900)
const audit = sql("select action||':'||(changes->'total_amount'->>'from')||'→'||(changes->'total_amount'->>'to')||':'||user_email from fin_audit where entity='document' and action='updated' and changes ? 'total_amount' order by at desc limit 1")
await page.getByRole('tab', { name: 'היסטוריה' }).click(); await page.waitForTimeout(600)
record('T7', 'תיקון ידני של נתון שחולץ', 'הסכום השגוי (263, ודאות נמוכה, חשבון לא מסתדר) מסומן; התיקון ל-236 נשמר ונרשם ביומן עם המשתמש', `לפני: ${aceBefore}; יומן: ${audit}`, aceBefore.startsWith('263') && /263(\.00)?→236(\.00)?:admin@kurkoos\.test/.test(audit), [flaggedShot, await shot('11-history')])
await page.keyboard.press('Escape'); await page.waitForTimeout(300)

// ---------- T8 + T9: assign company + project, approve ----------
await page.locator('tbody tr', { hasText: 'טמבור' }).filter({ hasNotText: 'העתק' }).first().click(); await page.waitForSelector('.fin-panel'); await page.waitForTimeout(1200)
await page.locator('.fin-suggest', { hasText: 'מוהליבר 17' }).getByRole('button', { name: 'החלה' }).click()
await field(page, 'חברה').locator('select').selectOption({ label: 'קורקוס גרופ' })
const assignShot = await shot('12-assign')
await page.getByRole('button', { name: 'שמירה ואישור', exact: true }).click(); await page.waitForTimeout(1000)
const t8err = await page.locator('.fin-panel .fin-error').innerText().catch(() => '')
const t8 = sql("select (select name from fin_businesses where id=business_id)||'|'||(select name from fin_projects where id=project_id)||'|'||status||'|'||coalesce(approved_by::text,'') from fin_documents where file_name='tambour-4521.pdf'")
record('T8', 'שיוך לחברה ולפרויקט', 'קורקוס גרופ + מוהליבר 17', `${t8.split('|').slice(0, 2).join(' + ')}${t8err ? ` (שגיאה: ${t8err})` : ''}`, t8.startsWith('קורקוס גרופ|מוהליבר 17'), [assignShot])
record('T9', 'אישור המסמך', 'סטטוס מאושר, נרשם מי אישר', `${t8.split('|')[2]}, אושר ע״י ${t8.split('|')[3] ? 'admin' : '—'}; יומן: ${sql("select count(*) from fin_audit where action='approved'")}`, t8.split('|')[2] === 'approved' && !!t8.split('|')[3], [await shot('13-approved')])
await page.keyboard.press('Escape'); await page.waitForTimeout(300)
// approve two more for the export, from the pending list in bulk
await nav('ממתינים לבדיקה')
for (const name of ['בזק', 'ACE']) await page.locator('tbody tr', { hasText: name }).first().locator('input[type=checkbox]').check()
await page.locator('.fin-bulk').getByRole('button', { name: 'אישור' }).click(); await page.waitForTimeout(400)
await page.locator('.fin-modal__foot .fin-btn--primary').click(); await page.waitForTimeout(1200)
const bulkNote = await page.locator('.fin-note').first().innerText().catch(() => '')
// an unapproved document cannot be exported, even by calling the database directly
const adminToken = await login('admin@kurkoos.test', 'Passw0rd!x')
const unapprovedId = sql("select id from fin_documents where status='review' limit 1")
const sneaky = await rest('rpc/fin_record_export', adminToken, { method: 'POST', body: JSON.stringify({ p_ids: [unapprovedId], p_business_id: null, p_period: null, p_format: 'zip', p_destination: 'download' }) })
record('R1', 'אין ייצוא של מסמך שלא אושר', 'מסד הנתונים דוחה ייצוא של מסמך במצב "ממתין"', `HTTP ${sneaky.status}: ${sneaky.data?.message || ''}`, sneaky.status >= 400 && /not approved/.test(sneaky.data?.message || ''))

// ---------- T10 + T11: export and history ----------
await nav('תוכנת הנהלת חשבונות')
const period = meta.D.tambour.slice(0, 7)
await page.locator('.fin-wizard').getByLabel('תקופה חשבונאית').selectOption(period); await page.waitForTimeout(400)
const wizardShot = await shot('14-export-wizard')
await page.getByRole('button', { name: 'המשך לאישור הייצוא' }).click()
const [download] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), page.getByRole('button', { name: 'אני מאשר/ת את הייצוא' }).click()])
const zipPath = `${OUT}/export.zip`; await download.saveAs(zipPath)
const listing = execSync(`python3 -c "import zipfile,sys;z=zipfile.ZipFile(sys.argv[1]);print(z.testzip());print('\\n'.join(z.namelist()))" ${zipPath}`, { encoding: 'utf8' })
await page.waitForTimeout(800)
const exported = sql("select string_agg(status,',') from fin_documents where export_id is not null")
record('T10', 'ייצוא המסמך המאושר עם המטא-דאטה', 'ZIP תקין: Excel, CSV, metadata.json והקבצים המקוריים; המסמכים מסומנים "יוצא"', `${listing.split('\n').filter(Boolean).slice(1).join(' | ')} · סטטוס: ${exported}`, /^None/.test(listing) && /metadata\.json/.test(listing) && /\.xls/.test(listing) && /מסמכים\/.*\.pdf/.test(listing) && /^sent(,sent)*$/.test(exported), [wizardShot, await shot('15-export-done')])
await nav('היסטוריית ייצוא')
const histRow = await page.locator('tbody tr').first().innerText().catch(() => '')
record('T11', 'הייצוא מופיע בהיסטוריה', 'שורה עם תאריך, חברה, מספר מסמכים, סכום, פורמט ומשתמש', histRow.replace(/\s+/g, ' ').slice(0, 160), /ZIP/.test(histRow) && /admin@kurkoos\.test/.test(histRow), [await shot('16-export-history')])
const again = await rest('rpc/fin_record_export', adminToken, { method: 'POST', body: JSON.stringify({ p_ids: sql('select string_agg(id::text, \',\') from fin_documents where export_id is not null').split(','), p_business_id: null, p_period: period, p_format: 'zip', p_destination: 'download' }) })
record('R2', 'מניעת ייצוא כפול', 'ייצוא חוזר בלי אישור מפורש נדחה', `HTTP ${again.status}: ${again.data?.message || ''}`, again.status >= 400 && /ALREADY_EXPORTED/.test(again.data?.message || ''))
// changing an exported document sends it back to review
await rest(`fin_documents?file_name=eq.tambour-4521.pdf`, adminToken, { method: 'PATCH', body: JSON.stringify({ total_amount: 3700 }) })
const backToReview = sql("select status from fin_documents where file_name='tambour-4521.pdf'")
await rest(`fin_documents?file_name=eq.tambour-4521.pdf`, adminToken, { method: 'PATCH', body: JSON.stringify({ total_amount: 3600 }) })
const aiTouch = (() => { try { sql("update fin_documents set total_amount=1 where status='sent' and file_name='bezeq-oct.pdf'"); return 'allowed' } catch (e) { return /cannot be changed automatically/.test(String(e.stderr || e.message)) ? 'blocked' : String(e.message).slice(0, 80) } })()
record('R3', 'מסמך מאושר לא משתנה בשקט', 'תיקון אנושי של סכום במסמך שיוצא מחזיר אותו לבדיקה; שינוי אוטומטי (בלי משתמש) נחסם', `עריכה ידנית → ${backToReview}; שינוי אוטומטי → ${aiTouch}`, backToReview === 'review' && aiTouch === 'blocked')


// =================== MASTER DATA & SMART MANAGEMENT (spec tests A–H) ===================
// TEST A: category
await nav('קטגוריות')
await page.getByRole('button', { name: 'הוסף קטגוריה' }).first().click()
await lbl(/^שם בעברית/).fill('פרסום ושיווק')
await lbl(/^שם באנגלית/).fill('Advertising & marketing')
await modalSave()
const catId = sql("select id from fin_categories where name='פרסום ושיווק'")
await page.getByRole('button', { name: 'עריכה', exact: true }).click()
await lbl(/^קוד חשבונאי/).fill('6100')
await modalSave()
await nav('קטגוריות')
await page.getByRole('button', { name: 'הוסף קטגוריה' }).first().click()
await lbl(/^שם בעברית/).fill('פרסום ושיווק')
await page.locator('.fin-modal__foot .fin-btn--primary').first().click(); await page.waitForTimeout(500)
const catDupUi = await page.locator('.fin-callout').count()
await page.keyboard.press('Escape'); await page.waitForTimeout(300)
const catListShot = await shot('30-categories')
record('A', 'יצירת קטגוריה "פרסום ושיווק"', 'נשמרת במסד, מופיעה ברשימה, ניתנת לעריכה (קוד 6100), כפילות נחסמת', `db: ${sql("select count(*) from fin_categories where name='פרסום ושיווק'")} / קוד ${sql("select max(accounting_code) from fin_categories where name='פרסום ושיווק'")}; ברשימה: ${await page.locator('tbody tr', { hasText: 'פרסום ושיווק' }).count()}; אזהרת כפילות: ${catDupUi}`, sql("select count(*) from fin_categories where name='פרסום ושיווק'") === '1' && sql(`select accounting_code from fin_categories where id='${catId}'`) === '6100' && catDupUi === 1, [catListShot])

// TEST B: supplier
await nav('ספקים')
await page.getByRole('button', { name: 'הוסף ספק' }).first().click()
await lbl(/^שם משפטי/).fill('Meta Platforms Ireland Ltd')
await lbl(/^ח\.פ \/ ע\.מ/).fill(meta.IDS.meta)
await lbl(/^סוג ספק/).selectOption('תוכנה ומנויים')
await lbl(/^אתר/).fill('www.facebook.com')
await modalSave()
const metaId = sql(`select id from fin_suppliers where vat_id='${meta.IDS.meta}'`)
await nav('ספקים')
await page.getByRole('button', { name: 'הוסף ספק' }).first().click()
await lbl(/^שם משפטי/).fill('מטא ישראל')
await lbl(/^ח\.פ \/ ע\.מ/).fill(meta.IDS.meta)
await page.locator('.fin-modal__foot .fin-btn--primary').first().click(); await page.waitForTimeout(500)
const supDupMsg = await page.locator('.fin-modal .fin-error').innerText().catch(() => '')
const badId = await (async () => { await lbl(/^ח\.פ \/ ע\.מ/).fill('123456789'); await page.locator('.fin-modal__foot .fin-btn--primary').first().click(); await page.waitForTimeout(300); return page.locator('.fin-field__hint--error').first().innerText().catch(() => '') })()
await page.keyboard.press('Escape'); await page.waitForTimeout(300)
await page.locator('.fin-search input').fill('Meta'); await page.waitForTimeout(300)
const supSearch = await page.locator('tbody tr').count()
const supSearchShot = await shot('31-suppliers-search')
await page.locator('.fin-search input').fill('')

// rules: Meta → advertising; a weaker rule that tries to send Meta to the other company (must lose to the printed registration number)
await nav('כללים ואוטומציה')
for (const [name, kind, field, value] of [['Meta ← פרסום ושיווק', 'supplier_category', /^פעולה: קטגוריה/, 'פרסום ושיווק'], ['Meta ← קורקוס ביצוע', 'supplier_company', /^פעולה: חברה/, 'קורקוס ביצוע']]) {
  await page.getByRole('button', { name: 'כלל חדש' }).click()
  await lbl(/^שם הכלל/).fill(name)
  await lbl(/^סוג/).selectOption(kind)
  await lbl(/^תנאי: הספק/).selectOption({ label: 'Meta Platforms Ireland Ltd' })
  await lbl(field).selectOption({ label: value })
  await modalSave()
}
const rulesShot = await shot('32-rules')

// TEST D: project with a code and a budget
await nav('פרויקטים')
await page.getByRole('button', { name: 'הוסף פרויקט' }).first().click()
await lbl(/^שם הפרויקט/).fill('בן גוריון 17 — יהוד')
await lbl(/^קוד פנימי/).fill('BG-17')
await lbl(/^חברה משפטית/).selectOption({ label: 'קורקוס גרופ' })
await lbl(/^כתובת הפרויקט/).fill('בן גוריון 17, יהוד')
await lbl(/^תקציב/).fill('100000')
await modalSave()
const bgId = sql("select id from fin_projects where code='BG-17'")

// upload three invoices: advertising (known supplier), office equipment (unknown supplier), construction materials with a project code
await nav('כל המסמכים')
await page.getByRole('button', { name: 'הוספת מסמכים' }).click()
await page.locator('[data-testid=upload-input]').setInputFiles([`${FIX}/meta-ads.pdf`, `${FIX}/office-depot.pdf`, `${FIX}/benguryon-blocks.pdf`])
await page.waitForFunction(() => /הועלו/.test(document.querySelector('.fin-drop__msg')?.textContent || ''), null, { timeout: 30000 })
await waitProcessed(['meta-ads.pdf', 'office-depot.pdf', 'benguryon-blocks.pdf'])
await page.reload(); await page.waitForTimeout(1200)

await page.goto(`${APP}/suppliers/${metaId}`); await page.waitForTimeout(1200)
const metaProfileDocs = await page.locator('.fin-dlist__row').count()
const supplierProfileShot = await shot('33-supplier-profile')
record('B', 'יצירת ספק עם ח.פ', 'נשמר; ח.פ כפול נחסם; ח.פ לא תקין נדחה; נמצא בחיפוש; הפרופיל מציג את המסמכים שלו', `db: ${sql(`select count(*) from fin_suppliers where vat_id='${meta.IDS.meta}'`)}; כפילות: "${supDupMsg}"; ח.פ שגוי: "${badId}"; חיפוש: ${supSearch} שורות; מסמכים בפרופיל: ${metaProfileDocs}`, sql(`select count(*) from fin_suppliers where vat_id='${meta.IDS.meta}'`) === '1' && /כפילות/.test(supDupMsg) && /ביקורת/.test(badId) && supSearch === 1 && metaProfileDocs === 1, [supSearchShot, supplierProfileShot])

const metaDoc = sql("select (select name from fin_businesses where id=business_id)||'|'||coalesce(category,'-')||'|'||(suggestions->'category'->>'confidence') from fin_documents where file_name='meta-ads.pdf'")
const hitsLog = sql("select string_agg(r.name||':'||h.outcome, ', ' order by r.name) from fin_rule_hits h join fin_rules r on r.id=h.rule_id")
record('RULES', 'מנוע כללים: עדיפות וסדר הכרעה', 'כלל ספק←קטגוריה מוחל; כלל ספק←חברה נדחה מפני ח.פ הנמען המודפס (התאמה מדויקת גוברת); כל הפעלה נרשמת', `מסמך Meta: ${metaDoc}; יומן כללים: ${hitsLog}`, metaDoc.startsWith('קורקוס גרופ|פרסום ושיווק') && /פרסום ושיווק:applied/.test(hitsLog) && /קורקוס ביצוע:overridden/.test(hitsLog), [rulesShot])

// TEST C: unknown supplier → suggestion → approval
const officeSup = sql("select s.status||'|'||coalesce(s.email,'-')||'|'||coalesce(s.phone,'-')||'|'||(d.supplier_id=s.id) from fin_documents d join fin_suppliers s on s.id=d.supplier_id where d.file_name='office-depot.pdf'")
const officeSupId = sql("select supplier_id from fin_documents where file_name='office-depot.pdf'")
await nav('ספקים')
const pendingBanner = await page.locator('.fin-attention').innerText().catch(() => '')
await page.goto(`${APP}/suppliers/${officeSupId}`); await page.waitForTimeout(1000)
const pendingShot = await shot('34-supplier-pending')
await page.getByRole('button', { name: 'אישור הספק' }).click(); await page.waitForTimeout(900)
record('C', 'יצירת ספק אוטומטית מחשבונית של ספק לא מוכר', 'הסוכן לא מצא ספק, יצר הצעה ממתינה עם הפרטים מהחשבונית (מייל, טלפון) וקישר אליה את החשבונית; מנהל מאשר', `לפני: ${officeSup}; באנר: "${pendingBanner.replace(/\s+/g, ' ')}"; אחרי אישור: ${sql(`select status||' ע״י '||coalesce((select email from fin_members where user_id=approved_by),'-') from fin_suppliers where id='${officeSupId}'`)}`, officeSup.startsWith('pending|billing@officedepot.test|03-5551234|t') && sql(`select status from fin_suppliers where id='${officeSupId}'`) === 'active', [pendingShot, await shot('35-supplier-approved')])

// TEST F: classification of three invoices
const cls = ['meta-ads.pdf', 'office-depot.pdf', 'benguryon-blocks.pdf'].map((f) => sql(`select '${f}: '||coalesce(category,'(הצעה) '||(suggestions->'category'->>'value'))||' '||round(((suggestions->'category'->>'confidence')::numeric)*100)||'% ('||(suggestions->'category'->>'source')||')' from fin_documents where file_name='${f}'`))
record('F', 'סיווג קטגוריה ע״י AI', 'פרסום ושיווק / ציוד משרדי / חומרי בניין, עם ודאות; שיוך אוטומטי רק מעל הסף (85%)', cls.join(' · '), /meta-ads.pdf: פרסום ושיווק/.test(cls[0]) && /office-depot.pdf: ציוד משרדי/.test(cls[1]) && /benguryon-blocks.pdf: חומרי בניין/.test(cls[2]))

// TEST D (cont.): the project page
const bgDoc = sql(`select (project_id='${bgId}')||'|'||(suggestions->'project_id'->>'reason') from fin_documents where file_name='benguryon-blocks.pdf'`)
await page.goto(`${APP}/projects/${bgId}`); await page.waitForTimeout(1200)
const bgLedger = (await page.locator('.fin-ledger').innerText()).replace(/\s+/g, ' ')
const projectShot = await shot('36-project-overview')
await nav('דוחות'); await page.getByRole('tab', { name: 'לפי פרויקט' }).click(); await page.waitForTimeout(400)
const projReport = (await page.locator('.fin-table tbody').innerText()).replace(/\s+/g, ' ')
record('D', 'פרויקט "בן גוריון 17 — יהוד"', 'משויך לחברה; החשבונית עם הקוד BG-17 משויכת אליו; עמוד פיננסי עם תקציב מול ביצוע; הדוח מחשב נכון', `מסמך: ${bgDoc}; עמוד: ${bgLedger.slice(0, 140)}; דוח: ${projReport.slice(0, 120)}`, bgDoc.startsWith('true') && /11,800/.test(bgLedger) && /12%/.test(bgLedger) && /בן גוריון 17 — יהוד.*11,800/.test(projReport), [projectShot])

// split across projects, reconciled to the invoice total
const officeDocId = sql("select id from fin_documents where file_name='office-depot.pdf'")
const mohId = sql("select id from fin_projects where code='MOH-17'")
const bad = await rest('rpc/fin_set_allocations', adminToken, { method: 'POST', body: JSON.stringify({ p_document: officeDocId, p_rows: [{ project_id: bgId, amount: 1000 }, { project_id: mohId, amount: 1000 }] }) })
await page.goto(`${APP}/documents/${officeDocId}`); await page.waitForTimeout(1500)
await page.getByRole('button', { name: 'פיצול החשבונית בין כמה פרויקטים' }).click()
await page.getByLabel('פרויקט 1').selectOption(bgId); await page.getByLabel('סכום 1').fill('1500')
await page.getByLabel('פרויקט 2').selectOption(mohId); await page.getByLabel('סכום 2').fill('1450')
await page.getByRole('button', { name: 'שמירת הפיצול' }).click(); await page.waitForTimeout(900)
const splitShot = await shot('37-split')
await page.keyboard.press('Escape')
record('SPLIT', 'פיצול חשבונית בין פרויקטים', 'פיצול שלא מתאזן נדחה; 1,500 + 1,450 = 2,950 נשמר; המקור לא משתנה', `לא מאוזן: ${bad.status} ${(bad.data?.message || '').slice(0, 40)}; נשמר: ${sql(`select string_agg(amount::text, ' + ') from fin_document_allocations where document_id='${officeDocId}'`)}; סה״כ החשבונית ${sql(`select total_amount from fin_documents where id='${officeDocId}'`)}`, bad.status >= 400 && /SPLIT_TOTAL/.test(bad.data?.message || '') && sql(`select sum(amount) from fin_document_allocations where document_id='${officeDocId}'`) === '2950.00', [splitShot])

// TEST H: four new entities, one invoice, every view
await nav('חברות'); await page.getByRole('button', { name: 'הוסף חברה' }).first().click()
await lbl(/^שם משפטי/).fill('הנרייטה סולד 22 בע״מ'); await lbl(/^מספר עוסק במע״מ/).fill(meta.IDS.henrietta); await modalSave()
await nav('פרויקטים'); await page.getByRole('button', { name: 'הוסף פרויקט' }).first().click()
await lbl(/^שם הפרויקט/).fill('הנרייטה סולד 22–24 — הוד השרון'); await lbl(/^קוד פנימי/).fill('HS-22'); await lbl(/^חברה משפטית/).selectOption({ label: 'הנרייטה סולד 22 בע״מ' }); await modalSave()
await nav('קטגוריות'); await page.getByRole('button', { name: 'הוסף קטגוריה' }).first().click()
await lbl(/^שם בעברית/).fill('ייעוץ הנדסי'); await lbl(/^קטגוריית אב/).selectOption({ label: 'שירותים מקצועיים' }); await modalSave()
await nav('ספקים'); await page.getByRole('button', { name: 'הוסף ספק' }).first().click()
await lbl(/^שם משפטי/).fill('סולל בונה תשתיות'); await lbl(/^ח\.פ \/ ע\.מ/).fill(meta.IDS.soleh); await modalSave()
await nav('כל המסמכים'); await page.getByRole('button', { name: 'הוספת מסמכים' }).click()
await page.locator('[data-testid=upload-input]').setInputFiles(`${FIX}/soleh-boneh.pdf`)
await waitProcessed(['soleh-boneh.pdf']); await page.reload(); await page.waitForTimeout(1200)
const hDocId = sql("select id from fin_documents where file_name='soleh-boneh.pdf'")
await page.goto(`${APP}/documents/${hDocId}`); await page.waitForTimeout(1500)
await field(page, 'קטגוריה').locator('select').selectOption({ label: '— ייעוץ הנדסי' })
const hReviewShot = await shot('38-h-review')
await page.getByRole('button', { name: /שמירה ואישור/ }).click(); await page.waitForTimeout(1200)
const hRel = sql(`select (select name from fin_suppliers where id=supplier_id)||'|'||(select name from fin_businesses where id=business_id)||'|'||(select name from fin_projects where id=project_id)||'|'||category||'|'||status from fin_documents where id='${hDocId}'`)
const views = {}
for (const [k, path] of [['ספק', `/suppliers/${sql("select id from fin_suppliers where name='סולל בונה תשתיות'")}`], ['פרויקט', `/projects/${sql("select id from fin_projects where code='HS-22'")}`], ['חברה', `/companies/${sql("select id from fin_businesses where name='הנרייטה סולד 22 בע״מ'")}`], ['קטגוריה', `/categories/${sql("select id from fin_categories where name='ייעוץ הנדסי'")}`]]) {
  await page.goto(`${APP}${path}`); await page.waitForTimeout(1000)
  views[k] = /23,600/.test(await page.locator('.fin-ledger').innerText()) && (await page.locator('.fin-dlist__row').count()) === 1
}
const hCompanyShot = await shot('39-h-company')
record('H', 'קצה לקצה: ספק, קטגוריה, חברה ופרויקט חדשים + חשבונית', 'החשבונית מזוהה לספק (ח.פ), לחברה (ח.פ הנמען), לפרויקט (קוד HS-22), משויכת לקטגוריה ומאושרת; מופיעה בכל ארבעת העמודים', `${hRel}; תצוגות: ${JSON.stringify(views)}`, hRel === 'סולל בונה תשתיות|הנרייטה סולד 22 בע״מ|הנרייטה סולד 22–24 — הוד השרון|ייעוץ הנדסי|approved' && Object.values(views).every(Boolean), [hReviewShot, hCompanyShot])

// ---------- T14: failed sync logged and retried; failed OCR retried ----------
await fetch(`${FAKES}/__next_account?email=broken@kurkoos.test`)
await nav('חשבונות אימייל')
await page.getByRole('button', { name: 'חיבור Gmail' }).click()
await page.waitForSelector('text=broken@kurkoos.test', { timeout: 15000 }); await page.waitForTimeout(800)
await fetch(`${FAKES}/__next_account?email=`)
const brokenId = sql("select id from fin_mailboxes where email='broken@kurkoos.test'")
const r1 = await api(adminToken, { action: 'sync', mailbox_id: brokenId })
const r2 = await api(adminToken, { action: 'sync', mailbox_id: brokenId })
const fx2 = JSON.parse(fs.readFileSync(`${FIX}/fixtures.json`, 'utf8')); fx2.mailboxes['broken@kurkoos.test'].failing = false; fs.writeFileSync(`${FIX}/fixtures.json`, JSON.stringify(fx2, null, 1))
const r3 = await api(adminToken, { action: 'sync', mailbox_id: brokenId })
const syncLog = sql(`select string_agg(attempt||':'||coalesce(left(error,30),'ok'), ' | ' order by started_at) from fin_sync_runs where mailbox_id='${brokenId}'`)
await page.reload(); await page.waitForTimeout(1200)
await page.locator('.fin-disclosure summary').first().click().catch(() => {})
const brokenShot = await shot('17-mailboxes-log')
const ocrBefore = failedNow
const retry = await api(adminToken, { action: 'retry-failed' })
const ocrAfter = sql("select status||':'||attempts from fin_documents where file_name='electra-778.pdf'")
record('T14', 'סנכרון שנכשל נרשם ומנוסה שוב', 'תקלה בספק נרשמת עם מספר ניסיון, הניסיון הבא מצליח; מסמך שהקריאה שלו נכשלה נקרא בניסיון חוזר', `סנכרון: ${syncLog}; מסמך: ${ocrBefore} → ${ocrAfter} (${JSON.stringify(retry.data)})`, /^1:.*\| 2:.*\| 3:ok$/.test(syncLog) && r1.data.results?.[0]?.error && r3.data.results?.[0]?.error === null && /failed:1/.test(ocrBefore) && /^(review|duplicate):2$/.test(ocrAfter), [brokenShot])
const electraIssues = sql("select string_agg(i->>'code', ',') from fin_documents, jsonb_array_elements(issues) i where file_name='electra-778.pdf'")
const electraBiz = sql("select (select name from fin_businesses where id=business_id) from fin_documents where file_name='electra-778.pdf'")
record('A5', 'בקרה: סכום חריג ושיוך חברה לפי ח.פ הלקוח', 'חשבונית של 59,000 ₪ מסומנת "סכום מעל"; משויכת ל"קורקוס ביצוע" לפי הח.פ שבמסמך', `בעיות: ${electraIssues}; חברה: ${electraBiz}`, /large_amount/.test(electraIssues || '') && electraBiz === 'קורקוס ביצוע')


// dual approval above the threshold, and company separation (TEST E)
await api(adminToken, { action: 'invite', email: 'fm-exec@kurkoos.test', role: 'finance_manager', full_name: 'מנהלת כספים ביצוע', business_ids: [sql("select id from fin_businesses where name='קורקוס ביצוע'")] })
const fmId = sql("select user_id from fin_members where email='fm-exec@kurkoos.test'")
execSync(`curl -s -X PUT ${SB}/auth/v1/admin/users/${fmId} -H "apikey: ${SERVICE}" -H "Authorization: Bearer ${SERVICE}" -H 'Content-Type: application/json' -d '{"password":"FmExec!xx1","email_confirm":true}'`)
const fmToken = await login('fm-exec@kurkoos.test', 'FmExec!xx1')
const electraId = sql("select id from fin_documents where file_name='electra-778.pdf'")
// a bypass attempt: switching the flag off while approving. The database computes the flag itself.
const first = await rest(`fin_documents?id=eq.${electraId}`, adminToken, { method: 'PATCH', body: JSON.stringify({ status: 'approved', requires_second_approval: false }) })
const afterFirst = sql(`select status||'|'||(first_approved_by is not null)||'|'||requires_second_approval from fin_documents where id='${electraId}'`)
const approvedAtAfterFirst = sql(`select coalesce(approved_at::text, 'null') from fin_documents where id='${electraId}'`)
// a second bypass: claiming someone else signed first
const again2 = await rest(`fin_documents?id=eq.${electraId}`, adminToken, { method: 'PATCH', body: JSON.stringify({ status: 'approved', first_approved_by: fmId }) })
const second = await rest(`fin_documents?id=eq.${electraId}`, fmToken, { method: 'PATCH', body: JSON.stringify({ status: 'approved' }) })
record('DUAL', 'אישור כפול לסכום גבוה (כולל ניסיונות עקיפה)', 'חשבונית 59,000 ₪: ניסיון לכבות את הדגל נכשל, חתימה ראשונה נרשמת בלי approved_at; ניסיון "לחתום בשם מישהו אחר" נחסם; מאשר שני מאשר', `אחרי ראשון: ${afterFirst}, approved_at=${approvedAtAfterFirst}; אותו מאשר שוב: ${again2.status} ${(again2.data?.message || '').slice(0, 30)}; מאשר שני: ${second.status} → ${sql(`select status from fin_documents where id='${electraId}'`)}`, afterFirst === 'review|true|true' && approvedAtAfterFirst === 'null' && again2.status >= 400 && /SECOND_APPROVAL/.test(again2.data?.message || '') && sql(`select status from fin_documents where id='${electraId}'`) === 'approved')
const solehId = sql("select id from fin_documents where file_name='soleh-boneh.pdf'")
await rest(`fin_documents?id=eq.${solehId}`, adminToken, { method: 'PATCH', body: JSON.stringify({ category_id: sql("select id from fin_categories where name='שירותים מקצועיים'") }) })
const solehAfter = sql(`select status||'|'||coalesce(approved_by::text,'null') from fin_documents where id='${solehId}'`)
record('REV', 'שינוי קטגוריה במסמך מאושר', 'החזרה לבדיקה וניקוי החתימה (שינוי קטגוריה נחשב שינוי מהותי)', solehAfter, solehAfter === 'review|null')
const fmDocs = await rest('fin_documents?select=file_name', fmToken)
const fmCompanies = await rest('fin_businesses?select=name', fmToken)
const sep = sql("select string_agg(b.name||':'||coalesce(round(sum_total)::text,'0'), ', ' order by b.name) from fin_businesses b left join lateral (select sum(total_amount) sum_total from fin_documents d where d.business_id=b.id and d.status not in ('rejected','duplicate','failed','archived')) x on true")
record('E', 'כמה חברות: הפרדה מלאה', 'כל חברה עם מספר רישום משלה; כל חשבונית שויכה לחברה לפי ח.פ הנמען; מנהלת כספים של "קורקוס ביצוע" רואה רק את המסמכים והחברה שלה', `סכומים לפי חברה: ${sep}; מנהלת הביצוע רואה: ${(fmDocs.data || []).map((d) => d.file_name).join(', ')} / חברות: ${(fmCompanies.data || []).map((b) => b.name).join(', ')}`, sql("select count(distinct vat_id) from fin_businesses") === '3' && sql("select (select name from fin_businesses where id=business_id) from fin_documents where file_name='electra-778.pdf'") === 'קורקוס ביצוע' && Array.isArray(fmDocs.data) && fmDocs.data.length >= 1 && fmDocs.data.every((d) => d.file_name === 'electra-778.pdf') && (fmCompanies.data || []).length === 1)


// =================== EMAIL ACCOUNTS, MOBILE SCANNERS, CLOUD SYNC ===================
// OLD RECEIPTS: the first scan reads 90 days; an invoice from 150 days ago arrives only after "old receipts"
await nav('חשבונות אימייל')
const oldBefore = sql("select count(*) from fin_documents where file_name='old-invoice.pdf'")
const periodBefore = (await page.locator('.fin-period').innerText()).replace(/\s+/g, ' ')
const accountsShot = await shot('50-email-accounts')
await nav('מרכז בקרה')
await page.locator('.fin-chiplink', { hasText: 'קבלות ישנות' }).click(); await page.waitForSelector('.fin-scan'); await page.waitForTimeout(600)
const chipLanded = page.url().endsWith('/scans')
// the scan management screen: start a scan of a year on invoices@; the open screen moves it on, week after week
await page.locator('.fin-scan', { hasText: 'invoices@kurkoos.test' }).getByRole('button', { name: /התחלת סריקה|סריקה של תקופה חדשה/ }).click(); await page.waitForSelector('.fin-modal')
await page.locator('.fin-modal .fin-seg button', { hasText: 'שנה' }).first().click()
const oldModalShot = await shot('51-old-receipts')
await page.locator('.fin-modal__foot .fin-btn--primary').click()
await page.locator('.fin-scan', { hasText: 'invoices@kurkoos.test' }).locator('.fin-pill', { hasText: 'הסריקה הושלמה' }).waitFor({ timeout: 180000 })
const histStats = (await page.locator('.fin-scan', { hasText: 'invoices@kurkoos.test' }).locator('.fin-scan__stats').innerText()).replace(/\s+/g, ' ')
const histPct = await page.locator('.fin-scan', { hasText: 'invoices@kurkoos.test' }).locator('.fin-scan__pct').innerText()
const histShot = await shot('51b-history-scan-done')
await nav('חשבונות אימייל'); await page.waitForTimeout(800)
const oldAfter = sql("select count(*)||'|'||coalesce((select source from fin_documents where file_name='old-invoice.pdf'),'-') from fin_documents where file_name='old-invoice.pdf'")
const boxState = sql("select sync_from||'|'||backfill_pending from fin_mailboxes where email='invoices@kurkoos.test'")
const periodAfter = (await page.locator('.fin-period').innerText()).replace(/\s+/g, ' ')
const gapQuery = (await fetch(`${FAKES}/__log`).then((r) => r.json())).gmailQueries.filter((q2) => /before:/.test(q2)).length
record('OLD', 'קבלות ישנות: סריקה רטרואקטיבית', 'חשבונית מלפני 150 יום לא נאספת בסריקה הראשונה (90 יום); אחרי "קבלות ישנות ← שנה" היא נאספת, התקופה מתעדכנת, ומיילים שכבר נקראו לא נקראים שוב. מסך ניהול הסריקות מראה התקדמות עד 100% ו"הסריקה הושלמה" רק אחרי בקרת השלמות', `לפני: ${oldBefore} (${periodBefore}); אחרי: ${oldAfter} (${periodAfter}); תיבה: ${boxState}; שאילתות פער: ${gapQuery}; חלון: ${histPct} ${histStats}`, chipLanded && oldBefore === '0' && oldAfter === '1|gmail' && /\|false$/.test(boxState) && periodBefore !== periodAfter && gapQuery >= 1 && histPct === '100%' && /[1-9]\d*\s*חשבוניות/.test(histStats) && /הודעות שנבדקו\s*[1-9]/.test(histStats), [accountsShot, oldModalShot, histShot])

// MOBILE SCANNERS: register a phone in the UI, then Green API posts messages to the webhook
await nav('מספרי WhatsApp')
const scannersEmpty = await shot('52-scanners-empty')
await page.getByRole('button', { name: 'הוספת טלפון' }).click()
await lbl(/^מספר הנייד/).fill('12')
await page.locator('.fin-modal__foot .fin-btn--primary').click(); await page.waitForTimeout(300)
const badPhone = await page.locator('.fin-modal .fin-field__hint').first().innerText()
await lbl(/^מספר הנייד/).fill('054-304-9491')
await lbl(/^שם/).fill('הטלפון של שלומי')
await modalSave()
const waRow = sql("select phone||'|'||active from fin_whatsapp_senders")
const hook = (body, tok = 'test-wa-hook') => fetch('http://127.0.0.1:5180/api/finance-whatsapp', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` }, body: JSON.stringify(body) }).then(async (r) => ({ status: r.status, data: await r.json().catch(() => ({})) }))
const imgMsg = (id, phone, file = 'wa-receipt.png') => ({ typeWebhook: 'incomingMessageReceived', idMessage: id, senderData: { chatId: `${phone}@c.us`, sender: `${phone}@c.us` }, messageData: { typeMessage: 'imageMessage', fileMessageData: { downloadUrl: `${FAKES}/green/file/${file}`, fileName: file, mimeType: 'image/png', caption: 'ארוחה עם יזמים' } } })
const w1 = await hook(imgMsg('wa-1', '972543049491'))
const w1again = await hook(imgMsg('wa-1', '972543049491'))
const w2 = await hook(imgMsg('wa-2', '972543049491'))
const w3 = await hook(imgMsg('wa-3', '972529999999'))
const w4 = await hook(imgMsg('wa-4', '972543049491'), 'wrong-token')
const w5 = await hook({ typeWebhook: 'incomingMessageReceived', idMessage: 'wa-5', senderData: { chatId: '972543049491@c.us' }, messageData: { typeMessage: 'textMessage', textMessageData: { textMessage: 'שלום' } } })
const waDoc = sql("select source||'|'||status||'|'||coalesce(supplier_name,'-')||'|'||total_amount||'|'||(created_by is not null) from fin_documents where file_name='wa-receipt.png'")
const waLog = (await fetch(`${FAKES}/__log`).then((r) => r.json())).wa
await page.reload(); await page.waitForTimeout(1200)
const scannersShot = await shot('53-scanners')
record('WA', 'סורקים ניידים (WhatsApp)', 'מספר לא תקין נדחה בטופס; מספר רשום שולח צילום ← נכנס למערכת ונקרא, והשולח מקבל אישור; אותה הודעה פעמיים לא נכפלת; אותו קובץ שוב ← "כבר במערכת"; מספר לא רשום נדחה עם תשובה; טוקן שגוי ← 401; טקסט ← הסבר', `טופס: "${badPhone}"; רשום: ${waRow}; מסמך: ${waDoc}; תוצאות: ${[w1, w1again, w2, w3, w4, w5].map((w) => w.data.outcome || (w.data.repeat ? 'repeat' : w.status)).join(', ')}; תשובות: ${waLog.map((m) => m.message.slice(0, 18)).join(' / ')}`,
  /לא תקין/.test(badPhone) && waRow === '972543049491|true' && /^whatsapp\|review\|קפה לנדוור\|295\.00\|true$/.test(waDoc) && w1.data.outcome === 'imported' && w1again.data.repeat && w2.data.outcome === 'duplicate' && w3.data.outcome === 'refused_unknown_number' && w4.status === 401 && w5.data.outcome === 'unsupported' && waLog.some((m) => /נקלטה במערכת בהצלחה/.test(m.message) && /ספק: קפה לנדוור/.test(m.message) && /295/.test(m.message)) && waLog.some((m) => /לא רשום/.test(m.message)), [scannersEmpty, scannersShot])

// CLOUD: Google Drive and Dropbox, through the real OAuth round trip and the real upload code
await fetch(`${FAKES}/__next_account?email=office@kurkoos.test`)
await nav('סנכרון לענן')
const cloudEmpty = await shot('54-cloud-empty')
await page.getByRole('button', { name: 'חיבור Google Drive' }).click()
await page.waitForSelector('text=מחובר', { timeout: 15000 }); await page.waitForTimeout(600)
await fetch(`${FAKES}/__next_account?email=`)
await page.getByRole('button', { name: 'חיבור Dropbox' }).click()
await page.waitForTimeout(2500)
const targets = sql("select string_agg(provider||':'||account_email||':'||status, ', ' order by provider) from fin_cloud_targets")
const eligible = Number(sql("select count(*) from fin_documents where status in ('approved','sent') and file_path is not null"))
// Drive is the archive: every document that was read goes up (in review too), not only the approved ones
const gEligible = Number(sql("select count(*) from fin_documents where status in ('review','approved','sent') and file_path is not null and doc_type in ('invoice','invoice_receipt','receipt','credit','supplier_bill') and (file_mime='application/pdf' or file_mime like 'image/%' or file_mime like 'text/%')"))
const gSkipped = Number(sql("select count(*) from fin_documents where status in ('review','approved','sent') and file_path is not null and not (doc_type in ('invoice','invoice_receipt','receipt','credit','supplier_bill') and (file_mime='application/pdf' or file_mime like 'image/%' or file_mime like 'text/%'))"))
for (const t of ['Google Drive', 'Dropbox']) { await page.locator('.fin-cloud-card', { hasText: t }).getByRole('button', { name: 'סנכרון עכשיו' }).click(); await page.waitForTimeout(1500) }
const cFirst = sql("select string_agg(provider||'='||files_synced, ', ' order by provider) from fin_cloud_targets")
for (const t of ['Google Drive', 'Dropbox']) { await page.locator('.fin-cloud-card', { hasText: t }).getByRole('button', { name: 'סנכרון עכשיו' }).click(); await page.waitForTimeout(1200) }
const cSecond = sql("select string_agg(provider||'='||files_synced, ', ' order by provider) from fin_cloud_targets")
const cl = await fetch(`${FAKES}/__log`).then((r) => r.json())
const cloudShot = await shot('55-cloud-connected')
const gVerified = sql("select count(*) from fin_drive_files f join fin_cloud_targets t on t.id=f.target_id and t.provider='gdrive' where f.status='verified'")
const MONTHS_RE = '(ינואר|פברואר|מרץ|אפריל|מאי|יוני|יולי|אוגוסט|ספטמבר|אוקטובר|נובמבר|דצמבר)'
const archRe = new RegExp(`^/ארכיון מסמכים עסקי/[^/]+/(20\\d\\d/\\d\\d - ${MONTHS_RE}|ללא תאריך)/[^/]+\\.(pdf|png|jpg|tif|tiff)$`)
const driveUploads = cl.drive.filter((x) => !/^(patch|trash|delete):/.test(x))
record('CLOUD', 'סנכרון לענן: Google Drive כארכיון, Dropbox כהעתק', `שני החשבונות מתחברים ב-OAuth; ל-Drive עולות רק חשבוניות וקבלות: ${gEligible} (גם לפני אישור; מייל שהוא עצמו הקבלה עולה כ-PDF), ו-${gSkipped} מסמכים אחרים (אישור הזמנה, אישור תשלום, הצעת מחיר) לא עולים; לתיקיות "ארכיון מסמכים עסקי/<חברה>/<שנה>/<MM - חודש>", וכולם מאומתים; ל-Dropbox ${eligible} המאושרים; סנכרון שני לא מעתיק שוב`, `חשבונות: ${targets}; אחרי סנכרון ראשון: ${cFirst}; אחרי שני: ${cSecond}; מאומתים: ${gVerified}; Drive: ${driveUploads.slice(0, 2).join(' | ')}; Dropbox: ${cl.dropbox.slice(0, 1).join('')}`,
  targets === 'dropbox:office@kurkoos.test:active, gdrive:office@kurkoos.test:active' && cFirst === `dropbox=${eligible}, gdrive=${gEligible}` && cSecond === cFirst && Number(gVerified) === gEligible && driveUploads.length === gEligible && cl.dropbox.length === eligible && driveUploads.every((x) => archRe.test(x)) && cl.dropbox.every((x) => /\/20\d\d\/\d\d [א-ת]+\//.test(x)), [cloudEmpty, cloudShot])

// ---- Drive: a real connection test, "save to Drive" for chosen documents, links back, no second copy ----
await page.locator('.fin-cloud-card', { hasText: 'Google Drive' }).getByRole('button', { name: 'בדיקת חיבור' }).click()
await page.waitForSelector('.fin-cloud-card >> text=הבדיקה עברה', { timeout: 15000 }).catch(() => {})
const testMsg = await page.locator('.fin-cloud-card', { hasText: 'Google Drive' }).locator('[role=status]').innerText().catch(() => '')
const testRow = sql("select last_test_ok||'|'||(last_test_link is not null) from fin_cloud_targets where provider='gdrive'")
const clT = await fetch(`${FAKES}/__log`).then((r) => r.json())
const testFile = clT.drive.find((x) => x.includes('/בדיקת חיבור/')) || ''
const driveTarget = sql("select id from fin_cloud_targets where provider='gdrive'")
const reviewDoc = sql("select id from fin_documents where status='review' and file_path is not null order by created_at limit 1")
const saved1 = await api(adminToken, { action: 'cloud-save', ids: [reviewDoc], target_id: driveTarget })
const saved2 = await api(adminToken, { action: 'cloud-save', ids: [reviewDoc], target_id: driveTarget })
const linkRow = sql(`select coalesce(web_link,'')||'|'||coalesce(organized_name,'') from fin_drive_files where target_id='${driveTarget}' and document_id='${reviewDoc}'`)
const dbxId = sql("select id from fin_cloud_targets where provider='dropbox'")
const dbxSecret = sql(`select refresh_token from fin_cloud_secrets where target_id='${dbxId}'`)
sql(`update fin_cloud_secrets set access_token=null, expires_at=null, refresh_token='revoked-token' where target_id='${dbxId}'`)
const brokenTest = await api(adminToken, { action: 'cloud-test', target_id: dbxId })
const brokenState = sql(`select status from fin_cloud_targets where id='${dbxId}'`)
sql(`update fin_cloud_secrets set refresh_token='${dbxSecret}' where target_id='${dbxId}'`); sql(`update fin_cloud_targets set status='active', last_error=null where id='${dbxId}'`)
await page.reload(); await page.waitForTimeout(1200)
const driveShot = await shot('55b-cloud-tested')
record('DRIVE', 'Google Drive: בדיקת חיבור אמיתית ושמירה ידנית', 'הבדיקה מתחברת, יוצרת תיקייה, מעלה קובץ ומוצאת אותו; "שמירה בדרייב" מעתיקה מסמך שעוד לא אושר, שומרת קישור, ולחיצה שנייה לא מעתיקה שוב; חיבור שבור מדווח כשלון ולא הצלחה',
  `הודעה: "${testMsg}"; שורה: ${testRow}; קובץ בדיקה: ${testFile}; שמירה 1: ${JSON.stringify(saved1.data.results?.[0] || saved1.data)}; שמירה 2: ${saved2.data.results?.[0]?.already}; קישור: ${linkRow}; חיבור שבור: ${brokenTest.data.ok}/${brokenState}/${String(brokenTest.data.error || '').slice(0, 60)}`,
  /הבדיקה עברה/.test(testMsg) && testRow === 'true|true' && /^\/ארכיון מסמכים עסקי\/בדיקת חיבור\/בדיקה_.*\.txt$/.test(testFile) && saved1.data.results?.[0]?.ok === true && /^https:\/\/drive\.test\/file\//.test(saved1.data.results[0].link) && /\/20\d\d\/\d\d - [א-ת]+$/.test(saved1.data.results[0].path) && saved2.data.results?.[0]?.already === true && /^https:\/\/drive\.test\/file\/.+\|20\d\d-\d\d-\d\d_/.test(linkRow) && brokenTest.data.ok === false && brokenState === 'error' && !!brokenTest.data.error,
  [driveShot])

// ARCHIVE: the Drive archive end to end (docs/finance/DRIVE-ARCHIVE-PLAN.md, conditions 2–11, 14, 15)
{
  const dget = async (qs = '') => (await fetch(`${FAKES}/__drive${qs}`).then((r) => r.json())).items
  const run = (body = {}) => api(adminToken, { action: 'drive-run', target_id: driveTarget, ...body })
  const row = (id) => sql(`select status||'|'||coalesce(attempts,0)||'|'||coalesce(organized_name,'')||'|'||coalesce(folder_path,'')||'|'||coalesce(verify_status,'') from fin_drive_files where target_id='${driveTarget}' and document_id='${id}'`)
  const copies = async (id) => (await dget()).filter((f) => f.appProperties?.kd === id && !f.trashed).length
  await run()   // the queue starts empty, so each step below acts on the document it names
  // this scenario changes documents on purpose (company, details, type); they are put back at its end so later scenarios see them as they were
  sql('drop table if exists _archive_backup; create table _archive_backup as select id, supplier_name, supplier_id, doc_number, issue_date, total_amount, accounting_period, doc_type, business_id from fin_documents')
  // folders: the main folder, a folder per company, years and "MM - month", each once, kept by its Drive id
  const items0 = await dget()
  const folderPaths = items0.filter((f) => f.mimeType.endsWith('folder')).map((f) => f.path)
  const dupFolders = folderPaths.length - new Set(folderPaths).size
  const keys = sql(`select string_agg(key, ' ' order by key) from fin_drive_folders where target_id='${driveTarget}'`)
  const companyNames = sql("select string_agg(name, '|') from fin_businesses").split('|')
  const companyFolders = folderPaths.filter((x) => /^\/ארכיון מסמכים עסקי\/[^/]+$/.test(x) && !x.endsWith('/בדיקת חיבור')).map((x) => x.split('/')[2])
  // a document with a random file name gets a name from what it says; its company decides the folder
  const named = sql(`select d.file_name||'|'||f.organized_name||'|'||f.folder_path||'|'||coalesce(b.name,'')||'|'||coalesce(f.verify_status,'') from fin_drive_files f join fin_documents d on d.id=f.document_id left join fin_businesses b on b.id=d.business_id where f.target_id='${driveTarget}' and f.status='verified' and d.doc_number is not null and d.total_amount is not null and d.issue_date is not null and d.business_id is not null order by d.created_at limit 1`).split('|')
  // duplicates found when the mail was read: a row that points at the original, no second file in Drive
  const dupRows = sql(`select count(*)||'|'||count(*) filter (where f.status='duplicate') from fin_drive_files f join fin_documents d on d.id=f.document_id where f.target_id='${driveTarget}' and d.status='duplicate'`)
  const dupDoc = sql("select id from fin_documents where status='duplicate' limit 1")
  const dupInDrive = dupDoc ? await copies(dupDoc) : 0
  // a network error (503) on upload: the row waits and is retried; the second try is verified; one copy only
  // two archived documents start over: their files leave Drive and their rows leave the archive, so each is uploaded afresh
  const fresh = sql(`select f.document_id from fin_drive_files f join fin_documents d on d.id=f.document_id where f.target_id='${driveTarget}' and f.status='verified' and d.status='review' order by f.created_at desc limit 3`).split('\n').filter(Boolean)
  const restart = async (id) => { await dget(`?remove=${id}`); sql(`delete from fin_drive_files where target_id='${driveTarget}' and document_id='${id}'`) }
  await restart(fresh[0])
  await fetch(`${FAKES}/__drive?upload503=1`)
  await run({ max: 1 })
  const after503 = row(fresh[0])
  sql(`update fin_drive_files set next_try_at=now() where document_id='${fresh[0]}'`)
  await run({ max: 1 })
  const retried = row(fresh[0]); const copies503 = await copies(fresh[0])
  // the answer of an upload is lost (the file was saved, the reply was 500): the retry finds that file, no second copy
  await restart(fresh[1])
  await fetch(`${FAKES}/__drive?lose=1`)
  await run({ max: 1 })
  const afterLost = row(fresh[1])
  sql(`update fin_drive_files set next_try_at=now() where document_id='${fresh[1]}'`)
  await run({ max: 1 })
  const recovered = row(fresh[1]); const copiesLost = await copies(fresh[1])
  // stopped in the middle (the run died while uploading): its lease runs out and the next run finishes, with no second copy
  const mid = sql(`select document_id from fin_drive_files where target_id='${driveTarget}' and status='verified' order by created_at limit 1`)
  sql(`update fin_drive_files set status='uploading', locked_until=now() - interval '1 minute' where document_id='${mid}'`)
  await run()
  const resumed = row(mid).split('|')[0]; const copiesMid = await copies(mid)
  // a correction of the company: the archive's own file moves to the other company's folder (moved, not copied)
  const moveDoc = sql(`select f.document_id from fin_drive_files f join fin_documents d on d.id=f.document_id where f.target_id='${driveTarget}' and f.status='verified' and d.status='review' and d.project_id is null and f.document_id not in ('${fresh.join("','")}') order by d.created_at desc limit 1`)
  const other = sql(`select id||'|'||name from fin_businesses where id is distinct from (select business_id from fin_documents where id='${moveDoc}') order by sort desc, name desc limit 1`).split('|')
  sql(`update fin_documents set business_id='${other[0]}' where id='${moveDoc}'`)
  const queuedAfterFix = row(moveDoc).split('|')[0]
  await run()
  const moved = row(moveDoc); const copiesMoved = await copies(moveDoc)
  // a person renames the copy: Drive gets the name, and the next run keeps it
  const ren = await api(adminToken, { action: 'drive-rename', target_id: driveTarget, document_id: moveDoc, name: 'חוזה שכירות מחסן' })
  sql(`update fin_drive_files set status='queued' where document_id='${moveDoc}'`); await run()
  const renamed = row(moveDoc).split('|')[2]; const renamedInDrive = (await dget()).find((f) => f.appProperties?.kd === moveDoc)?.name
  // a document with little to go on: no date, supplier or number on it — no date made up, an id keeps the name unique
  const thin = fresh[0]
  sql(`update fin_documents set issue_date=null, supplier_name=null, supplier_id=null, doc_number=null, total_amount=null, accounting_period=null where id='${thin}'`)
  await run()
  const thinName = row(thin).split('|')[2]
  // only invoices and receipts: a document that turns out to be a quote leaves the archive (its copy goes to the Drive trash,
  // never erased); when it is an invoice again it comes back. An email body (HTML) never goes up.
  const wd = fresh[2]
  sql(`update fin_documents set doc_type='quote' where id='${wd}'`); await run()
  const wdRow = row(wd).split('|')[0]; const wdTrashed = (await dget()).filter((f) => f.appProperties?.kd === wd).every((f) => f.trashed)
  sql(`update fin_documents set doc_type='invoice' where id='${wd}'`); await run()
  const wdBack = row(wd).split('|')[0]; const wdLive = await copies(wd)
  const htmlInDrive = (await dget()).filter((f) => !f.mimeType.endsWith('folder') && /\.html?$/i.test(f.name) && !f.trashed && !f.path.includes('/בדיקת חיבור/')).length
  // an email that is itself the receipt: it is in Drive as a PDF (made by Drive from the email), the temporary document is gone
  const bodyRows = sql(`select count(*)||'|'||count(*) filter (where f.organized_name ~ '\\.pdf$' and f.rendition_path is not null and f.status='verified') from fin_drive_files f join fin_documents d on d.id=f.document_id where f.target_id='${driveTarget}' and d.file_mime like 'text/%' and f.status not in ('withdrawn','duplicate')`)
  const tempDocs = (await dget()).filter((f) => /^kurkoos-convert-/.test(f.name)).length
  const { bodyReceipt } = await import('../../server/finance/pipeline.js')
  const metaRule = [bodyReceipt('payment_confirmation', 'text/html', 'הקבלה שלך על מודעות Meta (מזהה החשבון: 1130143728423686)'), bodyReceipt('payment_confirmation', 'text/html', 'Your Meta ads receipt'), bodyReceipt('payment_confirmation', 'application/pdf', 'הקבלה שלך'), bodyReceipt('payment_confirmation', 'text/html', 'אישור העברה בנקאית'), bodyReceipt('invoice', 'text/html', 'הקבלה שלך')].join(',')
  // a supplier name with quotes stays readable (בע"מ → בעמ, not בע-מ)
  const quoted = sql(`select count(*) from fin_drive_files where target_id='${driveTarget}' and organized_name ~ 'בע-מ'`)
  // two runs at the same time: one works, the other sees the lock; every document still has exactly one file
  sql(`update fin_drive_files set status='queued', next_try_at=null where target_id='${driveTarget}' and status='verified'`)
  const [p1, p2] = await Promise.all([run(), run()])
  const busy = [p1, p2].filter((r) => r.data.results?.[0]?.busy).length
  const kd = (await dget()).filter((f) => f.appProperties?.kd && !f.trashed).map((f) => f.appProperties.kd)
  const doubleFiles = kd.length - new Set(kd).size
  // the reconciliation agent: a file removed and a file put in the trash are found, restored from our storage and verified
  // again, in one check; the report says so, and "completed" only because nothing is left
  const allVerified = () => sql(`select document_id from fin_drive_files where target_id='${driveTarget}' and status='verified' order by created_at`).split('\n').filter(Boolean)
  const [gone, binned, movedDoc, renamedDoc, changedDoc] = allVerified().filter((x) => x !== moveDoc)
  await dget(`?remove=${gone}`); await dget(`?trash=${binned}`)
  const reconcile = async () => { for (let i = 0; i < 8; i++) { const r = await api(adminToken, { action: 'drive-reconcile', target_id: driveTarget }); const x = r.data.results?.find((y) => y.target === driveTarget) || {}; if (x.status && x.status !== 'running') return x } return {} }
  const recRes = await reconcile()
  const flagged = sql(`select string_agg(status, ',' order by status) from fin_drive_files where document_id in ('${gone}','${binned}') and target_id='${driveTarget}'`)
  const restoredCopies = `${await copies(gone)}${await copies(binned)}`
  const ov = await api(adminToken, { action: 'drive-overview' })
  const card = ov.data.targets?.find((t) => t.id === driveTarget) || {}
  const back = row(gone).split('|')[0]
  // moved to a wrong folder, renamed, and changed in Drive by a person: found, put back, verified
  const rightFolder = sql(`select drive_folder_id||'|'||organized_name from fin_drive_files where target_id='${driveTarget}' and document_id='${movedDoc}'`).split('|')[0]
  const rightName = sql(`select organized_name from fin_drive_files where target_id='${driveTarget}' and document_id='${renamedDoc}'`)
  await dget(`?move=${movedDoc}`); await dget(`?rename=${renamedDoc}`); await dget(`?change=${changedDoc}`)
  const rec2Res = await reconcile()
  const itemsFix = await dget()
  const fixedFolder = itemsFix.find((f) => f.appProperties?.kd === movedDoc && !f.trashed)?.parents?.[0] === rightFolder
  const fixedName = itemsFix.find((f) => f.appProperties?.kd === renamedDoc && !f.trashed)?.name === rightName
  const changedCopies = await copies(changedDoc)
  // Drive gives no md5 for a file: it is downloaded and its SHA-256 compared
  await restart(fresh[0]); await fetch(`${FAKES}/__drive?nomd5=1`); await run()
  const shaCheck = row(fresh[0]).split('|')[4]
  // Google asks to slow down (403 rate limit): not a failure of the document; it waits and then goes up
  await restart(fresh[1]); await fetch(`${FAKES}/__drive?rate403=1`); await run()
  const rateRow = row(fresh[1]).split('|').slice(0, 2).join('/')
  sql(`update fin_drive_files set next_try_at=now() where document_id='${fresh[1]}'`); await run()
  const rateAfter = row(fresh[1]).split('|')[0]
  // the access token ran out: it is refreshed and the upload goes on
  await restart(fresh[0]); sql(`update fin_cloud_secrets set access_token='stale', expires_at=now() - interval '1 hour' where target_id='${driveTarget}'`); await run()
  const afterExpiry = row(fresh[0]).split('|')[0]
  // paused: nothing is uploaded; resumed: it goes on
  await restart(fresh[1]); await api(adminToken, { action: 'drive-pause', target_id: driveTarget, paused: true }); await run()
  const whilePaused = sql(`select coalesce((select status from fin_drive_files where target_id='${driveTarget}' and document_id='${fresh[1]}'), 'none')`)
  await api(adminToken, { action: 'drive-pause', target_id: driveTarget, paused: false }); await run()
  const afterResume = row(fresh[1]).split('|')[0]
  // a person takes a document out: its copy goes to the Drive trash, and no check brings it back
  await api(adminToken, { action: 'drive-exclude', target_id: driveTarget, ids: [fresh[1]] }); await run()
  const excluded = row(fresh[1]).split('|')[0]; const excludedLive = await copies(fresh[1])
  // a big archive: 1,200 more files in Drive that the system does not know. Every page is listed, they are reported as
  // exceptions, nothing is deleted
  const tagK = driveTarget.slice(0, 8)
  await dget(`?seed=1200&kt=${tagK}`)
  const rec3Res = await reconcile()
  const pagesRow = sql(`select pages||'|'||listed||'|'||status from fin_drive_reconciles where target_id='${driveTarget}' order by started_at desc limit 1`)
  const stillThere = (await dget()).filter((f) => /^unknown-\d+\.pdf$/.test(f.name) && !f.trashed).length
  await dget('?unseed=1')
  // reconnecting the same Google account: the same connection and archive, a check starts, and nothing is uploaded again
  const connectChecksBefore = Number(sql(`select count(*) from fin_drive_reconciles where target_id='${driveTarget}' and trigger='connect'`))
  const uploadsBefore = (await fetch(`${FAKES}/__log`).then((r) => r.json())).drive.filter((x) => !/^(patch|trash|delete):/.test(x)).length
  await fetch(`${FAKES}/__next_account?email=office@kurkoos.test`)
  await go('/drive'); await page.waitForSelector('.fin-drive', { timeout: 20000 })
  const archShot = await shot('121-drive-archive')
  await page.getByRole('button', { name: /חיבור מחדש ובדיקת כל המסמכים/ }).click()
  await page.waitForSelector('text=חובר', { timeout: 20000 }).catch(() => {}); await page.waitForTimeout(1500)
  await fetch(`${FAKES}/__next_account?email=`)
  await reconcile()
  const afterReconnect = sql(`select (select count(*) from fin_cloud_targets where provider='gdrive')||'|'||(select id from fin_cloud_targets where provider='gdrive' limit 1)||'|'||(select count(*) from fin_drive_reconciles where target_id='${driveTarget}' and trigger='connect')`)
  const connectChecks = Number(sql(`select count(*) from fin_drive_reconciles where target_id='${driveTarget}' and trigger='connect'`))
  const uploadsAfter = (await fetch(`${FAKES}/__log`).then((r) => r.json())).drive.filter((x) => !/^(patch|trash|delete):/.test(x)).length
  await page.reload(); await page.waitForSelector('.fin-drive', { timeout: 20000 }); await page.waitForTimeout(1200)
  const reportShot = await shot('122-drive-after-reconnect')
  // the promise: every row that says "verified" has exactly one live file in Drive with its id, name and folder; and both upload
  // kinds were used (multipart and resumable)
  const live = new Map((await dget()).filter((f) => f.appProperties?.kd && !f.trashed).map((f) => [f.id, f]))
  const claims = sql(`select drive_file_id||'|'||organized_name||'|'||drive_folder_id from fin_drive_files where target_id='${driveTarget}' and status='verified'`).split('\n').filter(Boolean).map((x) => x.split('|'))
  const falseClaims = claims.filter(([id, name, folder]) => { const f = live.get(id); return !f || f.name !== name || f.parents[0] !== folder }).length
  const kinds = (await dget()).filter((f) => f.appProperties?.kd)
  const resumableUsed = kinds.filter((f) => f.resumable).length; const multipartUsed = kinds.filter((f) => !f.resumable).length
  sql("update fin_documents d set supplier_name=b.supplier_name, supplier_id=b.supplier_id, doc_number=b.doc_number, issue_date=b.issue_date, total_amount=b.total_amount, accounting_period=b.accounting_period, doc_type=b.doc_type, business_id=b.business_id from _archive_backup b where d.id=b.id and d.status='review' and (d.supplier_name, d.supplier_id, d.doc_number, d.issue_date, d.total_amount, d.doc_type, d.business_id) is distinct from (b.supplier_name, b.supplier_id, b.doc_number, b.issue_date, b.total_amount, b.doc_type, b.business_id); drop table _archive_backup")
  await api(adminToken, { action: 'drive-exclude', target_id: driveTarget, ids: [fresh[1]], excluded: false }); await run()
  record('ARCHIVE', 'ארכיון Google Drive: תיקיות, שמות, ניסיון חוזר, העברה, בקרת שלמות',
    'תיקייה ראשית ותיקייה לכל חברה, שנה וחודש (כל אחת פעם אחת, לפי מזהה); שם לפי תוכן החשבונית ובתיקיית החברה שלה; כפילות לא מועלית; 503 ← ניסיון חוזר ומאומת; תשובה שאבדה ← אותו קובץ ולא עותק; ריצה שנקטעה ← ממשיכה; תיקון חברה ← הקובץ עובר תיקייה; שינוי שם נשמר; מסמך דל ← בלי תאריך מומצא; שתי ריצות במקביל ← קובץ אחד לכל מסמך; סוכן הבדיקה מוצא קובץ שנמחק ושנזרק לפח ומשחזר אותם לבד; קובץ שהוזז לתיקייה אחרת, ששמו שונה או שתוכנו שונה מתוקן; בלי md5 ← הורדה והשוואת SHA-256; האטה של Google (403) לא נספרת ככשל; טוקן שפג מתחדש; השהיה והמשך; מסמך שהוצא לא חוזר; 1,200 קבצים לא מוכרים נסרקים בעמודים ומדווחים בלי למחוק; חיבור מחדש לא מעלה שוב; כל "מאומת" קיים באמת ב-Drive; העלאה רגילה ו-resumable; רק חשבוניות וקבלות (PDF או תמונה): מסמך שהתברר כהצעת מחיר עובר לפח של Drive וחוזר כשהוא שוב חשבונית; אין גוף מייל (HTML) ב-Drive',
    `תיקיות כפולות: ${dupFolders}; חברות: ${companyFolders.join(', ')}; מפתחות: ${keys.split(' ').length}; שם: ${named[0]} → ${named[1]} (${named[2]}, ${named[3]}, ${named[4]}); כפילויות: ${dupRows}, ב-Drive: ${dupInDrive}; 503: ${after503.split('|').slice(0, 2).join('/')} → ${retried.split('|')[0]} (${copies503} עותקים); תשובה שאבדה: ${afterLost.split('|').slice(0, 2).join('/')} → ${recovered.split('|')[0]} (${copiesLost}); נקטע: ${resumed} (${copiesMid}); תיקון: ${queuedAfterFix} → ${moved.split('|')[3]} (${copiesMoved}); שם ידני: ${ren.status} ${renamed} / ${renamedInDrive}; דל: ${thinName}; במקביל: נעול ${busy}, קבצים כפולים ${doubleFiles}; בדיקה: חסרים ${recRes.missing}, שוחזרו ${recRes.restored}, ${recRes.status}, ${flagged}, עותקים ${restoredCopies}; מסך: ${JSON.stringify(card.counts || {})}; תיקייה/שם/תוכן: ${rec2Res.wrong_folder}/${rec2Res.wrong_name}/${rec2Res.changed} → תוקנו ${rec2Res.corrected}, שוחזרו ${rec2Res.restored}, ${fixedFolder}/${fixedName}/${changedCopies}; בלי md5: ${shaCheck}; האטה: ${rateRow} → ${rateAfter}; טוקן שפג: ${afterExpiry}; מושהה: ${whilePaused} → ${afterResume}; הוצא: ${excluded} (${excludedLive}); 1,200 לא מוכרים: ${pagesRow}, חריגים ${rec3Res.orphans}, נשארו ${stillThere}; חיבור מחדש: ${afterReconnect}, העלאות ${uploadsBefore}→${uploadsAfter}; טענות שווא: ${falseClaims} מתוך ${claims.length}; resumable/multipart: ${resumableUsed}/${multipartUsed}; הצעת מחיר: ${wdRow}, לפח ${wdTrashed} → חשבונית: ${wdBack} (${wdLive}); HTML ב-Drive: ${htmlInDrive}; קבלות-מייל כ-PDF: ${bodyRows}, מסמכים זמניים: ${tempDocs}; כלל קבלת מייל: ${metaRule}; "בע-מ": ${quoted}`,
    dupFolders === 0 && companyFolders.length >= 1 && companyFolders.every((c) => companyNames.includes(c) || c === 'מסמכים ללא שיוך')
      && named[1] !== named[0] && /^20\d\d-\d\d-\d\d_[^_]+_[^_]+_[^_]+_-?[\d.]+-(שח|USD|EUR)\.[a-z]+$/.test(named[1]) && named[2].split('/')[2] === named[3] && named[4] === 'md5'
      && (!dupDoc || (/^(\d+)\|\1$/.test(dupRows) && dupInDrive === 0))
      && /^queued\|1$/.test(after503.split('|').slice(0, 2).join('|')) && retried.startsWith('verified|') && copies503 === 1
      && /^queued\|1$/.test(afterLost.split('|').slice(0, 2).join('|')) && recovered.startsWith('verified|') && copiesLost === 1
      && resumed === 'verified' && copiesMid === 1
      && queuedAfterFix === 'queued' && moved.startsWith('verified|') && moved.split('|')[3].split('/')[2] === other[1] && copiesMoved === 1
      && ren.status === 200 && /^חוזה-שכירות-מחסן\./.test(renamed) && renamedInDrive === renamed
      && !/^20\d\d-/.test(thinName) && /_id-[0-9a-f]{8}\./.test(thinName)
      && busy >= 1 && doubleFiles === 0
      && recRes.missing === 2 && recRes.restored === 2 && recRes.status === 'completed' && flagged === 'verified,verified' && restoredCopies === '11' && card.counts?.needs_review === 0 && back === 'verified'
      && rec2Res.wrong_folder === 1 && rec2Res.wrong_name === 1 && rec2Res.changed === 1 && rec2Res.corrected === 2 && rec2Res.restored === 1 && fixedFolder && fixedName && changedCopies === 1 && rec2Res.status === 'completed'
      && shaCheck === 'sha256' && rateRow === 'queued/0' && rateAfter === 'verified' && afterExpiry === 'verified'
      && ['none', 'queued'].includes(whilePaused) && afterResume === 'verified' && excluded === 'withdrawn' && excludedLive === 0
      && Number(pagesRow.split('|')[0]) >= 2 && Number(pagesRow.split('|')[1]) >= 1200 && rec3Res.orphans === 1200 && stillThere === 1200
      && new RegExp(`^1\\|${driveTarget}\\|[1-9]\\d*$`).test(afterReconnect) && connectChecks > connectChecksBefore && uploadsAfter === uploadsBefore && falseClaims === 0 && claims.length > 5 && resumableUsed >= 1 && multipartUsed >= 1
      && wdRow === 'withdrawn' && wdTrashed && wdBack === 'verified' && wdLive === 1 && htmlInDrive === 0 && quoted === '0'
      && /^(\d+)\|\1$/.test(bodyRows) && tempDocs === 0 && metaRule === 'true,true,false,false,false',
    [archShot, reportShot])
}

// =================== ACCOUNTING SOFTWARE ===================
await nav('תוכנת הנהלת חשבונות')
const swAll = await page.locator('.fin-app-card').count()
await page.getByPlaceholder('חיפוש תוכנת הנהלת חשבונות').fill('icount'); await page.waitForTimeout(200)
const swOne = await page.locator('.fin-app-card').count()
await page.getByPlaceholder('חיפוש תוכנת הנהלת חשבונות').fill('אין כזאת'); await page.waitForTimeout(200)
const swNone = await page.locator('.fin-empty').count()
await page.getByPlaceholder('חיפוש תוכנת הנהלת חשבונות').fill(''); await page.waitForTimeout(200)
const swShot = await shot('56-accounting-software')
await page.getByRole('button', { name: 'חיבור Morning (חשבונית ירוקה)' }).click(); await page.waitForTimeout(300)
const bizExec = sql("select id from fin_businesses where name='קורקוס ביצוע'")
await page.locator('.fin-modal select').first().selectOption(bizExec)
await page.locator('.fin-modal input[type=password]').first().fill('test-morning-key')
const swModalShot = await shot('57-connect-morning')
await modalSave()
const morning = sql("select provider||'|'||status||'|'||enabled from fin_integrations where provider='morning'")
const morningSecret = sql("select count(*) from fin_integration_secrets s join fin_integrations i on i.id=s.integration_id where i.provider='morning'")
const swSecond = await api(adminToken, { action: 'integration-save', provider: 'icount', name: 'iCount', business_id: bizExec, enabled: true })
const otherBiz = await api(adminToken, { action: 'integration-save', provider: 'icount', name: 'iCount', business_id: sql("select id from fin_businesses where name='קורקוס גרופ'"), enabled: true })
const allBiz = await api(adminToken, { action: 'integration-save', provider: 'rivhit', name: 'רווחית', business_id: null, enabled: true })
const secretRead = await rest('fin_integration_secrets?select=*', adminToken)
await page.reload(); await page.waitForTimeout(1000)
const swAfterShot = await shot('58-accounting-connected')
record('SW', 'חיבור תוכנת הנהלת חשבונות', 'חיפוש מסנן את הכרטיסים; חיבור Morning לחברה שומר את המפתח בשרת בלבד ומסמן "ממתין להפעלה"; תוכנה שנייה לאותה חברה נחסמת, לחברה אחרת מותרת',
  `כרטיסים: ${swAll}, חיפוש icount: ${swOne}, חיפוש ללא תוצאה: ${swNone}; Morning: ${morning}, מפתחות: ${morningSecret}; שנייה לאותה חברה: ${swSecond.status} ${swSecond.data.error || ''}; לחברה אחרת: ${otherBiz.status}; לכל החברות: ${allBiz.status}; קריאת מפתחות מהדפדפן: ${secretRead.status}`,
  swAll === 8 && swOne === 1 && swNone === 1 && morning === 'morning|not_active|true' && morningSecret === '1' && swSecond.status === 409 && otherBiz.status === 200 && allBiz.status === 409 && (secretRead.status >= 400 || (Array.isArray(secretRead.data) && !secretRead.data.length)), [swShot, swModalShot, swAfterShot])

// =================== AUTOMATIC DELIVERY ===================
await fetch(`${FAKES}/__reset_hooks`).catch(() => {})
await nav('שליחה אוטומטית')
const delEmptyShot = await shot('59-delivery-empty')
await page.getByRole('button', { name: 'חיבור webhook' }).click(); await page.waitForTimeout(300)
await page.locator('.fin-modal input[type=url]').fill('ftp://bad.example/x')
await modalSave()
const badUrlMsg = await page.locator('.fin-modal .fin-field__hint').first().innerText()
await page.locator('.fin-modal input[type=url]').fill(`${FAKES}/hook`)
await modalSave(); await page.waitForTimeout(400)
const hookSecret = await page.locator('.fin-secret input').inputValue()
const secretShot = await shot('60-webhook-secret')
await page.getByRole('button', { name: 'שמרתי את הסוד' }).click()
await page.getByRole('button', { name: 'הוספת מייל לייצוא אוטומטי' }).click(); await page.waitForTimeout(300)
await page.locator('.fin-modal input[type=email]').fill('cpa@accountants.test')
await page.locator('.fin-modal .fin-check', { hasText: 'מסמך נדחה' }).locator('input').check()
await modalSave(); await page.waitForTimeout(400)
const retryHook = await api(adminToken, { action: 'outbound-save', kind: 'webhook', target: `${FAKES}/hook?fail=2`, events: ['document.rejected'] })
const secretsVisible = await rest('fin_outbound_secrets?select=*', adminToken)
// the test ping from the menu
await page.locator('.fin-out-list li', { hasText: `${FAKES}/hook` }).first().locator('.fin-more button').first().click()
await page.getByRole('menuitem', { name: 'שליחת בדיקה' }).click().catch(async () => { await page.locator('.fin-more__pop button', { hasText: 'שליחת בדיקה' }).click() })
await page.waitForTimeout(1200)
const pingMsg = await page.locator('.fin-note').first().innerText().catch(() => '')
// an event: a manager rejects a document, the client asks the server to deliver
const rejId = sql("select id from fin_documents where status='review' and file_path is not null and project_id is null and total_amount < 1000 and file_name not in ('wa-receipt.png') and file_name not like 'cafe-dup-%' order by created_at desc limit 1")
const rej = await rest(`fin_documents?id=eq.${rejId}`, adminToken, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ status: 'rejected' }) })
const queued = sql(`select count(*) from fin_outbound_queue where document_id='${rejId}'`)
const f1 = await api(adminToken, { action: 'outbound-flush' })
sql(`update fin_outbound_queue set next_at = now() where done_at is null`)
const f2 = await api(adminToken, { action: 'outbound-flush' })
sql(`update fin_outbound_queue set next_at = now() where done_at is null`)
const f3 = await api(adminToken, { action: 'outbound-flush' })
const f4 = await api(adminToken, { action: 'outbound-flush' })
const lg = await fetch(`${FAKES}/__log`).then((r) => r.json())
const main = lg.hooks.find((h) => h.query === '' && h.event === 'document.rejected')
let sigOk = false; let payload = {}
if (main) {
  const { t, v1 } = Object.fromEntries(main.signature.split(',').map((x) => x.split('=')))
  sigOk = crypto.createHmac('sha256', hookSecret).update(`${t}.${main.raw}`).digest('hex') === v1
  payload = JSON.parse(main.raw)
}
const retried = lg.hooks.filter((h) => h.query === '?fail=2' && h.event === 'document.rejected').map((h) => h.status).join(',')
const sameDelivery = new Set(lg.hooks.filter((h) => h.query === '?fail=2' && h.event === 'document.rejected').map((h) => h.delivery)).size
const mail = lg.emails.find((e) => (e.to || []).includes('cpa@accountants.test') && /נדחה/.test(e.subject))
const queueState = sql(`select string_agg(attempts||':'||(done_at is not null)||':'||coalesce(last_error,'-'), ' | ' order by id) from fin_outbound_queue where document_id='${rejId}'`)
await page.reload(); await page.waitForTimeout(1000)
await page.locator('.fin-disclosure summary', { hasText: 'יומן משלוחים' }).click().catch(() => {})
const delShot = await shot('61-delivery')
await page.locator('.fin-guide summary').click(); await page.waitForTimeout(300)
const guideShot = await shot('62-webhook-guide')
let outChecks = {}
record('OUT', 'שליחה אוטומטית: webhook ומייל', 'כתובת לא https נדחית; הסוד מוצג פעם אחת ולא נגיש מהדפדפן; בדיקת חיבור עונה 200; דחיית מסמך נשלחת ל-webhook עם חתימה תקינה ונתוני המסמך, ולמייל עם הקובץ מצורף; יעד שנכשל מקבל ניסיון חוזר עם אותו מזהה משלוח ומצליח בשלישי',
  `כתובת שגויה: "${badUrlMsg}"; סודות מהדפדפן: ${secretsVisible.status}/${Array.isArray(secretsVisible.data) ? secretsVisible.data.length : '-'}; בדיקה: "${pingMsg}"; בתור: ${queued}; סבבים: ${[f1, f2, f3, f4].map((f) => `${f.data.sent}/${f.data.failed}`).join(' ')}; חתימה: ${sigOk}; אירוע: ${payload.event} ${payload.data?.supplier?.name || ''} ${payload.data?.file_url ? 'עם קישור' : 'בלי קישור'}; ניסיונות חוזרים: ${retried} (מזהים: ${sameDelivery}); מייל: ${mail ? `${mail.subject} · ${mail.attachments.length} קבצים` : 'לא נשלח'}; תור: ${queueState}`,
  (outChecks = { https: /https/.test(badUrlMsg), secrets: secretsVisible.status >= 400 || (Array.isArray(secretsVisible.data) && !secretsVisible.data.length), ping: /200/.test(pingMsg), rej: rej.status < 300, queued: queued === '3', sigOk, ev: payload.event === 'document.rejected', id: payload.data?.id === rejId, url: !!payload.data?.file_url, retried: retried === '500,500,200', same: sameDelivery === 1, mail: mail?.attachments?.length === 1 && mail.attachments[0].bytes > 100, queue: !/false/.test(queueState), hook: retryHook.status === 200 }) && /https/.test(badUrlMsg) && (secretsVisible.status >= 400 || (Array.isArray(secretsVisible.data) && !secretsVisible.data.length)) && /200/.test(pingMsg) && rej.status < 300 && queued === '3' && sigOk && payload.event === 'document.rejected' && payload.data?.id === rejId && !!payload.data?.file_url && retried === '500,500,200' && sameDelivery === 1 && mail?.attachments?.length === 1 && mail.attachments[0].bytes > 100 && !/false/.test(queueState) && retryHook.status === 200,
  [delEmptyShot, secretShot, delShot, guideShot])
if (!results.at(-1).pass) console.log('OUT checks', JSON.stringify(outChecks))

// =================== THE COLLECTION ENGINE ===================
// CAP: a phone photo of a receipt — prepared on the device, read, cross-checked, and attached to a project
await nav('מרכז בקרה')
await page.locator('.fin-action', { hasText: 'צילום או העלאת קבלה' }).click(); await page.waitForSelector('.fin-capture__start')
const capStartShot = await shot('80-capture-start')
const logC0 = await fetch(`${FAKES}/__log`).then((r) => r.json())
await page.locator('[data-testid=capture-file]').setInputFiles(`${FIX}/receipt-photo.jpg`)
await page.waitForSelector('.fin-capture__result', { timeout: 60000 }); await page.waitForTimeout(400)
const capHead = (await page.locator('.fin-capture__head').innerText()).replace(/\s+/g, ' ')
const capFacts = (await page.locator('.fin-capture__facts').innerText()).replace(/\s+/g, ' ')
const capCheck = await page.locator('.fin-capture__check').innerText().catch(() => '')
const capWarn = await page.locator('.fin-capture__warn').innerText().catch(() => '')
const capShot = await shot('81-capture-result')
const logC1 = await fetch(`${FAKES}/__log`).then((r) => r.json())
const capRow = sql(`select file_mime||'|'||file_size||'|'||status||'|'||supplier_name||'|'||total_amount||'|'||vat_amount||'|'||doc_number||'|'||issue_date||'|'||(extraction->'verification'->'disagree')::text||'|'||coalesce(quality->>'blurry','-')||'|'||ai_calls||'|'||(ai_tokens_in>0) from fin_documents where supplier_vat_id='${meta.IDS.hasharon}'`).split('|')
const origSize = fs.statSync(`${FIX}/receipt-photo.jpg`).size
await page.locator('.fin-modal').getByLabel(/^פרויקט/).first().selectOption({ label: 'מוהליבר 17' })
await page.locator('.fin-modal').getByLabel(/^קטגוריה/).first().selectOption({ label: 'חומרי בניין' })
await page.locator('.fin-modal__foot .fin-btn--primary').click()
await page.waitForSelector('.fin-modal', { state: 'detached', timeout: 15000 }).catch(() => {})
const capSaved = sql(`select coalesce((select name from fin_projects where id=d.project_id),'-')||'|'||coalesce(d.category,'-')||'|'||d.status from fin_documents d where supplier_vat_id='${meta.IDS.hasharon}'`)
record('CAP', 'צילום קבלה: הכנה, קריאה, אימות ושיוך', 'התמונה (2400×3200) מוקטנת במכשיר ל-1650×2200 JPEG לפני ההעלאה; הסוכנים קוראים ספק, מספר, תאריך, לפני מע״מ, מע״מ וסה״כ; צילום מטושטש מקבל קריאה שנייה לאימות ואזהרה; משייכים לפרויקט ולקטגוריה ונשמר כהוצאה לבדיקה',
  `הוקטנה: ${logC1.claudeDims.includes('1650x2200')}, ${capRow[0]} ${Math.round(capRow[1] / 1024)}KB (המקור ${Math.round(origSize / 1024)}KB); במסך: "${capHead}" · ${capFacts}; קריאה שנייה: ${(logC1.verifyCalls || 0) - (logC0.verifyCalls || 0)}, אי-הסכמות: ${capRow[8]}; "${capCheck}"; אזהרה: "${capWarn.replace(/\s+/g, ' ')}"; קריאות AI: ${capRow[10]}, טוקנים: ${capRow[11]}; אחרי שמירה: ${capSaved}`,
  logC1.claudeDims.includes('1650x2200') && capRow[0] === 'image/jpeg' && capRow[2] === 'review' && capRow[3] === 'חומרי בניין השרון' && capRow[4] === '755.20' && capRow[5] === '115.20' && capRow[6] === '24-7781' && capRow[8] === '[]' && capRow[9] === 'true' && capRow[10] === '2' && capRow[11] === 'true'
    && (logC1.verifyCalls || 0) - (logC0.verifyCalls || 0) === 1 && /755/.test(capHead) && /24-7781/.test(capFacts) && /תואמים/.test(capCheck) && /מטושטש/.test(capWarn) && capSaved === 'מוהליבר 17|חומרי בניין|review',
  [capStartShot, capShot])

// XVAL: the ACE receipt was misread as 263; the second reading saw 236 — the disagreement is kept and flagged
const aceVer = JSON.parse(sql("select coalesce((extraction->'verification'->'disagree')::text,'[]') from fin_documents where file_name='ace-receipt.png'") || '[]')
const aceTotal = aceVer.find((d) => d.field === 'total_amount')
record('XVAL', 'אימות בשתי קריאות (שכבה 3)', 'כשהחשבון לא נסגר או שהוודאות נמוכה, קריאה שנייה ממוקדת של השדות הקריטיים; כשהן לא מסכימות, שני הערכים נשמרים והשדה מסומן לבדיקה', `אי-הסכמה: ${JSON.stringify(aceVer)}`, aceTotal && Number(aceTotal.first) === 263 && Number(aceTotal.second) === 236)

// DUPX: the WhatsApp café receipt arrives again by email — with its number (certain) and without (suspected)
const waDocId = sql("select id from fin_documents where file_name='wa-receipt.png'")
await nav('כל המסמכים')
await page.getByRole('button', { name: 'הוספת מסמכים' }).click()
await page.locator('[data-testid=upload-input]').setInputFiles([`${FIX}/cafe-dup-exact.pdf`, `${FIX}/cafe-dup-fuzzy.pdf`, `${FIX}/cafe-second.pdf`])
await page.waitForFunction(() => /הועלו/.test(document.querySelector('.fin-drop__msg')?.textContent || ''), null, { timeout: 30000 })
for (let i = 0; i < 40 && sql("select count(*) from fin_documents where (file_name like 'cafe-dup-%' or file_name='cafe-second.pdf') and status='processing'") !== '0'; i++) await page.waitForTimeout(500)
const secondCafe = sql("select status||'|'||coalesce(duplicate_state,'-') from fin_documents where file_name='cafe-second.pdf'")
const dupExact = sql("select status||'|'||coalesce(duplicate_of::text,'-')||'|'||coalesce(duplicate_state,'-') from fin_documents where file_name='cafe-dup-exact.pdf'").split('|')
const fuzzyId = sql("select id from fin_documents where file_name='cafe-dup-fuzzy.pdf'")
const dupFuzzy = sql(`select status||'|'||coalesce(duplicate_of::text,'-')||'|'||coalesce(duplicate_state,'-') from fin_documents where id='${fuzzyId}'`).split('|')
await page.goto(`${APP}/documents/${fuzzyId}`); await page.waitForSelector('.fin-panel'); await page.waitForTimeout(800)
const bannerText = await page.locator('.fin-panel__banner.is-warn').innerText().catch(() => '')
const dupBannerShot = await shot('82-duplicate-suspected')
await page.locator('.fin-panel__banner.is-warn').getByRole('button', { name: 'זה כפול' }).click(); await page.waitForTimeout(800)
const dupAfter = sql(`select status||'|'||duplicate_state from fin_documents where id='${fuzzyId}'`)
const dupAudit = sql(`select count(*) from fin_audit where action='duplicate_confirmed' and entity_id='${fuzzyId}'`)
await page.keyboard.press('Escape'); await page.waitForTimeout(300)
record('DUPX', 'כפילות בין מקורות: ודאית וחשודה', 'אותה קבלה מ-WhatsApp ובמייל: עם אותו מספר היא נסגרת ככפולה ומקושרת למקור; בלי מספר (אותו ספק, סכום ותאריך) היא נשארת לבדיקה עם קישור למקור, ואדם מאשר "זה כפול"; קבלה אחרת של אותו בית קפה, באותו סכום ובמספר אחר, לא מסומנת',
  `ודאית: ${dupExact.join('/')}; חשודה: ${dupFuzzy.join('/')}; קבלה אחרת (מספר שונה): ${secondCafe}; באנר: "${bannerText.replace(/\s+/g, ' ').slice(0, 80)}"; אחרי החלטה: ${dupAfter}, יומן: ${dupAudit}`,
  secondCafe === 'review|-' && dupExact[0] === 'duplicate' && dupExact[1] === waDocId && dupExact[2] === 'confirmed' && dupFuzzy[0] === 'review' && dupFuzzy[1] === waDocId && dupFuzzy[2] === 'suspected' && /קפה לנדוור/.test(bannerText) && dupAfter === 'duplicate|confirmed' && dupAudit === '1', [dupBannerShot])

// REC: a document stuck "in processing" (the function died) is recovered; a failed reading waits for its backoff, then succeeds
const pl = await import('../../server/finance/pipeline.js')
const toNight = Math.round((pl.nextNight() - Date.now()) / 60000)
const back = { a1: Math.round((new Date(pl.nextRetry(1)) - Date.now()) / 60000), a2: Math.round((new Date(pl.nextRetry(2)) - Date.now()) / 60000), a3: pl.nextRetry(3), night: new Date(pl.nextRetry(1)).toISOString().slice(11, 16) }
const stuckId = sql("select id from fin_documents where file_name='bezeq-oct.pdf'")
sql(`update fin_documents set status='processing', stage='ocr', stage_at=now() - interval '30 minutes' where id='${stuckId}'`)
if (!(await page.locator('[data-testid=upload-input]').count())) await page.getByRole('button', { name: 'הוספת מסמכים' }).click()
await page.locator('[data-testid=upload-input]').setInputFiles(`${FIX}/flaky.pdf`)
// the reading fails three times with backoff inside one attempt (1 s + 3 s), then the document is marked failed
for (let i = 0; i < 80 && sql("select coalesce((select status from fin_documents where file_name='flaky.pdf'),'none')") !== 'failed'; i++) await page.waitForTimeout(500)
const flaky1 = sql("select status||'|'||attempts||'|'||coalesce(stage,'-')||'|'||round(extract(epoch from (next_retry_at - now()))/60) from fin_documents where file_name='flaky.pdf'").split('|')
const tick1 = await api(adminToken, { action: 'tick', force: true })
const afterTick1 = { stuck: sql(`select status from fin_documents where id='${stuckId}'`), flaky: sql("select status||'|'||attempts from fin_documents where file_name='flaky.pdf'") }
sql("update fin_documents set next_retry_at = now() - interval '1 minute' where file_name='flaky.pdf'")
const tick2 = await api(adminToken, { action: 'tick', force: true })
const flaky2 = sql("select status||'|'||attempts||'|'||coalesce(stage,'-')||'|'||coalesce(next_retry_at::text,'-')||'|'||supplier_name from fin_documents where file_name='flaky.pdf'").split('|')
// the lock: two ticks right after each other — the second one finds the engine busy
const tickA = await api(adminToken, { action: 'tick' })
const tickBusy = await api(adminToken, { action: 'tick' })
record('REC', 'התאוששות וניסיונות חוזרים', 'מסמך שנתקע "בעיבוד" (פונקציה שנפלה) נקרא מחדש; קריאה שנכשלה מחכה לסריקת הלילה (לא במהלך היום), ואחרי 3 ניסיונות עוצרת לטיפול ידני; בלילה היא מצליחה; שתי ריצות לא רצות במקביל',
  `ניסיון חוזר: ${back.night} UTC (בעוד ${back.a1} דק׳, הלילה הבא), אחרי 3: ${back.a3}; ראשון: ${flaky1.join('/')}; טיק 1: ${JSON.stringify(tick1.data.retry)} → תקוע: ${afterTick1.stuck}, נכשל: ${afterTick1.flaky}; טיק 2: ${JSON.stringify(tick2.data.retry)} → ${flaky2.join('/')}; טיק נוסף מיד: ${JSON.stringify(tickBusy.data)}`,
  back.night === '00:22' && Math.abs(back.a1 - (toNight - 1)) <= 1 && back.a2 === back.a1 && back.a3 === null && flaky1[0] === 'failed' && flaky1[1] === '1' && flaky1[2] === 'failed' && Number(flaky1[3]) >= Math.min(59, toNight - 3) && tick1.data.retry?.unstuck === 1 && afterTick1.stuck === 'review' && afterTick1.flaky === 'failed|1'
    && flaky2[0] === 'review' && flaky2[1] === '2' && flaky2[3] === '-' && flaky2[4] === 'גרניט הנדסה' && tickBusy.data.skipped === 'busy' && !!tickA.data)

// SCHED: the night collection runs inside 00:00–05:00 in Israel, the report around 07:00
const vj = JSON.parse(fs.readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8'))
const cronOf = (q) => vj.crons.find((c) => c.path.includes(q))?.schedule || ''
const ilHour = (cronExpr, offset) => { const [m, h] = cronExpr.split(' ').map(Number); return (h + offset) % 24 + m / 60 }
const night = cronOf('action=cron'); const morn = cronOf('action=morning')
record('SCHED', 'תזמון: איסוף לילה ודוח בוקר', 'איסוף הלילה בין 00:00 ל-05:00 בשעון ישראל (חורף וקיץ), דוח הבוקר סביב 07:00, ואיסוף קצר במהלך היום כשפותחים את המערכת',
  `לילה: ${night} UTC = ${ilHour(night, 2).toFixed(2)} בחורף / ${ilHour(night, 3).toFixed(2)} בקיץ; בוקר: ${morn} UTC = ${ilHour(morn, 2).toFixed(2)} / ${ilHour(morn, 3).toFixed(2)}`,
  [2, 3].every((o) => ilHour(night, o) < 5) && ilHour(morn, 2) >= 6.5 && ilHour(morn, 3) <= 8)

// NOCOST: opening and browsing the app, and the morning report, never scan mail or call the AI
const cost0 = await fetch(`${FAKES}/__log`).then((r) => r.json())
for (const path of ['', '/documents', '/connections', '/agents']) { await page.goto(`${APP}${path}`); await page.waitForTimeout(700) }
const ctxFresh = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'he-IL' }); const pFresh = await ctxFresh.newPage()
await pFresh.goto(APP); await pFresh.fill('input[type=email]', 'admin@kurkoos.test'); await pFresh.fill('input[type=password]', 'Passw0rd!x'); await pFresh.click('button[type=submit]'); await pFresh.waitForSelector('.fin__main'); await pFresh.waitForTimeout(2500); await ctxFresh.close()
const morningNoCost = await fetch('http://127.0.0.1:5180/api/finance?action=morning', { headers: { Authorization: 'Bearer test-cron' } }).then((r) => r.json())
const cost1 = await fetch(`${FAKES}/__log`).then((r) => r.json())
const dayRuns = sql("select count(*) from fin_sync_runs where trigger not in ('cron','manual','backfill')")
record('NOCOST', 'מנוע חסכוני: סריקה רק בלילה', 'כניסה למערכת, מעבר בין מסכים ודוח הבוקר לא סורקים מייל ולא קוראים ל-AI; אין סריקות "במהלך היום"', `Gmail: ${cost0.gmailCalls}→${cost1.gmailCalls}; Claude: ${cost0.claudeCalls}→${cost1.claudeCalls}; דוח בוקר: ${(morningNoCost.results || []).map((r) => r.key).join(',')}; סריקות יום: ${dayRuns}`,
  cost1.gmailCalls === cost0.gmailCalls && cost1.claudeCalls === cost0.claudeCalls && (morningNoCost.results || []).length === 1 && dayRuns === '0')

// ENGSTAT: the monitoring panel shows real state
await nav('סוכני AI'); await page.waitForTimeout(1000)
const engAgents = (await page.locator('.fin-engine__agents').innerText()).replace(/\s+/g, ' ')
const engFacts = (await page.locator('.fin-engine__facts').innerText()).replace(/\s+/g, ' ')
const engAi = await page.locator('.fin-engine .fin-muted').innerText()
const engShot = await shot('83-engine-status')
record('ENGSTAT', 'מצב המנוע', '"פעיל" רק כשהסוכן עבד באמת: מייל נסרק, WhatsApp קיבל הודעה, הקריאה עבדה; זמני הריצות הבאות; מספרי היום; שימוש ב-AI החודש', `${engAgents.slice(0, 160)} | ${engFacts.slice(0, 120)} | ${engAi}`,
  (engAgents.match(/פעיל/g) || []).length === 3 && /איסוף הלילה הבא/.test(engFacts) && /טוקנים/.test(engAi) && /קריאה שנייה/.test(engAi), [engShot])

// ---------- the daily cron run ----------
const cron = await fetch('http://127.0.0.1:5180/api/finance?action=cron', { headers: { Authorization: 'Bearer test-cron' } }).then((r) => r.json())
const cronBad = await fetch('http://127.0.0.1:5180/api/finance?action=cron').then((r) => r.status)
const morningRun = await fetch('http://127.0.0.1:5180/api/finance?action=morning', { headers: { Authorization: 'Bearer test-cron' } }).then((r) => r.json())
const mails = await fetch(`${FAKES}/__log`).then((r) => r.json())
const summary = JSON.parse(sql("select data::text from fin_summaries order by created_at desc limit 1") || '{}')
const want24 = Number(sql("select count(*) from fin_documents where created_at > now() - interval '24 hours'"))
record('A7', 'ריצת הלילה ודוח הבוקר', 'ה-cron של הלילה אוסף, מנסה שוב ומשחזר; ה-cron של הבוקר שומר דוח ושולח מייל "דוח בוקר" עם מה שבאמת נשמר (מייל, WhatsApp, לבדיקה, כפילויות, תקלות); בלי הסוד שניהם נדחים', `לילה: ${(cron.results || []).map((r) => `${r.key}:${r.status}`).join(', ')}; בוקר: ${(morningRun.results || []).map((r) => `${r.key}:${r.status || (r.retry ? 'tick' : '')}`).join(', ')}; דוח: נאספו ${summary.collected} (במסד ${want24}), מייל ${summary.by_email}, WhatsApp ${summary.by_whatsapp}, לבדיקה ${summary.review}, חשודים ככפולים ${summary.suspected_duplicates}; מיילים: ${mails.emails.map((m) => m.subject).join(' / ')}; בלי סוד: ${cronBad}`, (cron.results || []).find((r) => r.key === 'daily_scan')?.status === 'ok' && !(cron.results || []).some((r) => r.key === 'daily_summary') && (morningRun.results || []).find((r) => r.key === 'morning_report')?.status === 'ok' && summary.collected === want24 && summary.by_whatsapp >= 1 && summary.by_email >= 1 && mails.emails.some((m) => /דוח בוקר/.test(m.subject)) && cronBad === 401)
await nav('סוכני AI')
const agentsShot = await shot('18-agents')
await nav('כללים ואוטומציה')
const autoShot = await shot('19-automations')
await nav('דוחות')
const reportsShot = await shot('20-reports')
await page.getByRole('tab', { name: 'לפי פרויקט' }).click(); await page.waitForTimeout(400)
const projRep = await page.locator('.fin-table tbody').innerText()
record('REP', 'דוחות מחושבים מהרשומות', 'דוח לפי פרויקט מציג את מוהליבר 17 עם 3,600 ₪', projRep.replace(/\s+/g, ' ').slice(0, 120), /מוהליבר 17/.test(projRep) && /3,600/.test(projRep), [reportsShot, await shot('21-report-project')])
await nav('ניהול נתונים'); const dataShot = await shot('22-data')
await nav('הגדרות'); const settingsShot = await shot('23-settings')

// ---------- T13: roles and access ----------
await nav('הארגון ומשתמשים')
await page.getByRole('button', { name: /^(הזמנה|הוספת רו״ח או חבר צוות)$/ }).first().click()
await page.locator('.fin-modal').getByLabel('אימייל', { exact: true }).fill('cpa@accountants.test')
await page.locator('.fin-modal').getByLabel('שם', { exact: true }).fill('רו״ח דנה לוי')
await page.locator('.fin-modal .fin-rolecard', { hasText: 'רואה חשבון' }).click()
await page.getByRole('button', { name: 'שליחת הזמנה' }).click(); await page.waitForTimeout(1500)
const inviteNote = await page.locator('.fin-note').first().innerText().catch(() => '')
const usersShot = await shot('24-users')
const smtp = (await fetch(`${FAKES}/__log`).then((r) => r.json())).smtp
const accId = sql("select user_id from fin_members where email='cpa@accountants.test'")
execSync(`curl -s -X PUT ${SB}/auth/v1/admin/users/${accId} -H "apikey: ${SERVICE}" -H "Authorization: Bearer ${SERVICE}" -H 'Content-Type: application/json' -d '{"password":"Acc0untant!x","email_confirm":true}'`)
// an employee too (created as an account, then invited: the "already has an account" path)
await admin('admin/users', { email: 'worker@kurkoos.test', password: 'W0rker!xx', email_confirm: true })
const inv2 = await api(adminToken, { action: 'invite', email: 'worker@kurkoos.test', role: 'employee', full_name: 'עובד שטח' })
const accToken = await login('cpa@accountants.test', 'Acc0untant!x')
const empToken = await login('worker@kurkoos.test', 'W0rker!xx')
// WACHECK: the connection check reads the provider's own state; turning the reception on writes the webhook there, and
// refuses to take over a webhook that points elsewhere unless told to
{
  await fetch(`${FAKES}/__green?reset=1`)
  const c1 = (await api(adminToken, { action: 'whatsapp-check' })).data
  const step = (c, k) => c.steps?.find((x) => x.key === k)
  await fetch(`${FAKES}/__green?webhook=${encodeURIComponent('https://other.example/hook')}`)
  const taken = await api(adminToken, { action: 'whatsapp-setup' })
  const on = await api(adminToken, { action: 'whatsapp-setup', force: true })
  const set = (await fetch(`${FAKES}/__log`).then((r) => r.json())).greenSettings || {}
  const c2 = (await api(adminToken, { action: 'whatsapp-check' })).data
  await fetch(`${FAKES}/__green?state=notAuthorized`)
  const c3 = (await api(adminToken, { action: 'whatsapp-check' })).data
  await fetch(`${FAKES}/__green?state=`)
  const empCheck = await api(empToken, { action: 'whatsapp-check' })
  const empSetup = await api(empToken, { action: 'whatsapp-setup' })
  await go('/scanners'); await page.getByRole('button', { name: 'בדיקת החיבור' }).click(); await page.waitForSelector('.fin-wacheck__steps li', { timeout: 15000 }).catch(() => {})
  const uiSteps = await page.locator('.fin-wacheck__steps li').count()
  const uiOk = await page.locator('.fin-wacheck.is-ok').count()
  const wcShot = await shot('54-whatsapp-check')
  record('WACHECK', 'בדיקת החיבור ל-WhatsApp והפעלה בלחיצה',
    'הבדיקה קוראת את מצב המכשיר וההגדרות מהספק; לפני ההפעלה שלב ההודעות הנכנסות חסר; הפעלה לא דורסת כתובת של מערכת אחרת בלי אישור; אחריה הכול תקין; מכשיר מנותק מסומן; עובד לא בודק ולא מפעיל',
    `לפני: webhook ${step(c1, 'webhook')?.ok}, אפשר להפעיל ${c1.can_setup}; כתובת אחרת: ${taken.status}; הפעלה: ${on.status}, נשמר ${set.webhookUrl} / ${set.incomingWebhook} / טוקן ${set.webhookUrlToken === 'test-wa-hook'}; אחרי: ${c2.ok}; מנותק: phone ${step(c3, 'phone')?.ok}; עובד: ${empCheck.status},${empSetup.status}; מסך: ${uiSteps} שלבים, תקין ${uiOk}`,
    step(c1, 'webhook')?.ok === false && c1.can_setup === true && step(c1, 'phone')?.ok === true && taken.status === 409 && on.status === 200 && /\/api\/finance-whatsapp$/.test(set.webhookUrl || '') && set.incomingWebhook === 'yes' && set.webhookUrlToken === 'test-wa-hook'
      && c2.ok === true && step(c3, 'phone')?.ok === false && c3.ok === false && empCheck.status === 403 && empSetup.status === 403 && uiSteps === 5 && uiOk === 1, [wcShot])
}
const accDocs = await rest('fin_documents?select=status', accToken)
const accEdit = await rest(`fin_documents?status=eq.sent`, accToken, { method: 'PATCH', body: JSON.stringify({ notes: 'x' }) })
const accLeads = await rest('leads?select=id', accToken)
const accSite = await rest('projects?id=eq.00000000-0000-0000-0000-000000000000', accToken, { method: 'PATCH', body: JSON.stringify({ title: 'x' }) })
const empDocs = await rest('fin_documents?select=id', empToken)
const empApprove = await rest(`fin_documents?id=eq.${unapprovedId}`, empToken, { method: 'PATCH', body: JSON.stringify({ status: 'approved' }) })
const accApi = await api(accToken, { action: 'sync' })
const strangerToken = await (async () => { await admin('admin/users', { email: 'stranger@else.test', password: 'Str4nger!x', email_confirm: true }); return login('stranger@else.test', 'Str4nger!x') })()
const strangerDocs = await rest('fin_documents?select=id', strangerToken)
const accFiles = await fetch(`${SB}/storage/v1/object/finance-docs/${sql("select file_path from fin_documents where status='review' and file_path is not null limit 1")}`, { headers: { apikey: ANON, Authorization: `Bearer ${accToken}` } }).then((r) => r.status)
const t13 = {
  accountantSees: [...new Set((accDocs.data || []).map((d) => d.status))].join(',') || '—',
  accountantEdit: Array.isArray(accEdit.data) ? `${accEdit.data.length} שורות` : accEdit.status,
  accountantLeads: Array.isArray(accLeads.data) ? `${accLeads.data.length} שורות` : accLeads.status,
  accountantSiteWrite: accSite.status,
  accountantApi: accApi.status,
  accountantPrivateFile: accFiles,
  employeeSees: Array.isArray(empDocs.data) ? empDocs.data.length : empDocs.status,
  employeeApprove: Array.isArray(empApprove.data) ? `${empApprove.data.length} שורות` : empApprove.status,
  strangerSees: Array.isArray(strangerDocs.data) ? strangerDocs.data.length : strangerDocs.status,
}
const t13pass = ['sent', 'approved', 'approved,sent', 'sent,approved'].includes(t13.accountantSees)
record('T13', 'משתמשים לא מורשים לא ניגשים לרשומות', 'רו״ח רואה רק מאושרים/מיוצאים, לא עורך, לא רואה לידים, לא קורא קבצים של מסמכים לא מאושרים; עובד רואה רק את שלו ולא מאשר; משתמש זר לא רואה כלום',
  JSON.stringify(t13), t13pass && t13.accountantEdit === '0 שורות' && t13.accountantLeads === '0 שורות' && t13.accountantApi === 403 && t13.accountantPrivateFile >= 400 && t13.employeeSees === 0 && t13.employeeApprove === '0 שורות' && t13.strangerSees === 0 && inv2.status === 200, [usersShot])
record('INV', 'הזמנת משתמש במייל', 'נשלח מייל הזמנה (SMTP) והמשתמש נוסף עם תפקיד רו״ח', `${inviteNote}; מיילים ב-SMTP: ${smtp.length}; תפקיד: ${sql("select role from fin_members where email='cpa@accountants.test'")}`, smtp.length >= 1 && sql("select role from fin_members where email='cpa@accountants.test'") === 'accountant')

// =================== SECURITY CHECKS ON THE NEW INTAKE PATHS ===================
{
  const ob = await import('../../server/finance/outbound.js')
  const wa = await import('../../server/finance/whatsapp.js')
  const urls = { http: await ob.checkUrl('http://example.com/h'), loop: await ob.checkUrl('https://127.0.0.1/h'), meta: await ob.checkUrl('https://169.254.169.254/latest'), local: await ob.checkUrl('https://localhost/h'), lan: await ob.checkUrl('https://192.168.1.4/h'), creds: await ob.checkUrl('https://u:p@example.com/h'), mapped: await ob.checkUrl('https://[::ffff:127.0.0.1]/h'), mapped10: await ob.checkUrl('https://[::ffff:a00:1]/h'), nat64: await ob.checkUrl('https://[64:ff9b::a9fe:a9fe]/h') }
  const media = { green: wa.mediaUrlOk('https://sw-media-out.greenapi.net/x.jpg'), evil: wa.mediaUrlOk('https://evil.example/x.jpg'), plain: wa.mediaUrlOk('http://sw-media-out.greenapi.net/x.jpg'), meta: wa.mediaUrlOk('https://169.254.169.254/') }
  const empPhoneOther = await rest('fin_whatsapp_senders', empToken, { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ phone: '972541111111', user_id: sql("select user_id from fin_members where role='admin' limit 1") }) })
  const empCounter = await rest(`fin_whatsapp_senders?phone=eq.972543049491`, empToken, { method: 'PATCH', body: JSON.stringify({ docs_count: 999 }) })
  const pendingFn = await rest('rpc/fin_cloud_pending', adminToken, { method: 'POST', body: JSON.stringify({ p_target: sql("select id from fin_cloud_targets limit 1") }) })
  const ok = Object.values(urls).every(Boolean) && media.green && !media.evil && !media.plain && !media.meta && empPhoneOther.status >= 400 && empCounter.status >= 400 && pendingFn.status >= 400
  record('SEC5', 'הגנות בנתיבי הקליטה והשליחה החדשים', 'webhook רק ב-https ולא לכתובת פנימית (localhost, 127/192.168, metadata, וגם בצורת IPv6); קבצי WhatsApp רק משרתי Green API; עובד לא רושם טלפון בשם אחר ולא משנה מונים; פונקציית התור של הענן לא נגישה מהדפדפן',
    `כתובות: ${JSON.stringify(urls)}; מדיה: ${JSON.stringify(media)}; טלפון של אחר: ${empPhoneOther.status}; מונה: ${empCounter.status}; תור ענן: ${pendingFn.status}`, ok)
}

// =================== CONNECTIONS, DOCUMENT VIEWER, WHATSAPP SHARE, SEND CENTER ===================
await nav('חיבורים'); await page.waitForTimeout(900)
const connRows = await page.locator('.fin-conn').count()
const connText = (await page.locator('.fin-connlist').first().innerText()).replace(/\s+/g, ' ')
const connShot = await shot('73-connections')
record('CONN', 'מסך חיבורים: כל המקורות והיעדים במקום אחד', 'Gmail, Microsoft, WhatsApp, קריאת מסמכים, סריקה אוטומטית, ויעדים, כל אחד עם מצב ופעילות אחרונה', `${connRows} שורות; ${connText.slice(0, 160)}`,
  connRows >= 8 && /invoices@kurkoos\.test/.test(connText) && /טלפון אחד רשום|טלפונים רשומים/.test(connText) && /קריאת מסמכים/.test(connText), [connShot])

// the viewer: every page, zoom, fit to screen, the original file downloads intact
const vDoc = sql("select id||'|'||file_hash from fin_documents where file_mime='application/pdf' and status in ('review','approved') order by created_at limit 1").split('|')
await page.goto(`${APP}/documents/${vDoc[0]}`); await page.waitForSelector('.fin-viewer__page:not(.fin-viewer__page--skel)', { timeout: 20000 }); await page.waitForTimeout(400)
const pct0 = await page.locator('.fin-viewer__pct').innerText()
await page.getByRole('button', { name: 'הגדלה' }).click(); await page.waitForTimeout(200)
const pct1 = await page.locator('.fin-viewer__pct').innerText()
const vw1 = await page.locator('.fin-viewer__page').first().evaluate((el) => el.getBoundingClientRect().width)
await page.getByRole('button', { name: 'התאמה למסך' }).click(); await page.waitForTimeout(200)
const fitBox = await page.evaluate(() => { const p = document.querySelector('.fin-viewer__page').getBoundingClientRect(); const s = document.querySelector('.fin-viewer__scroll').getBoundingClientRect(); return p.height <= s.height && p.width <= s.width })
const viewerShot = await shot('74-viewer')
const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('link', { name: 'הורדה' }).click()])
const dlPath = await dl.path()
const dlHash = crypto.createHash('sha256').update(fs.readFileSync(dlPath)).digest('hex')
record('VIEW', 'תצוגת מסמך: זום, התאמה למסך והורדת המקור', 'הגדלה משנה את הגודל; "התאמה למסך" מכניסה עמוד שלם; הקובץ שיורד זהה לקובץ השמור (טביעת SHA-256)', `${pct0} → ${pct1} (${Math.round(vw1)}px); עמוד שלם בתצוגה: ${fitBox}; הורדה: ${dl.suggestedFilename()}, טביעה ${dlHash === vDoc[1] ? 'זהה' : 'שונה'}`,
  pct0 !== pct1 && fitBox && dlHash === vDoc[1], [viewerShot])

// share the same document on WhatsApp to a registered phone: Green API downloads the file, it must be the same file
await page.getByRole('button', { name: 'שיתוף' }).click(); await page.waitForSelector('.fin-modal'); await page.waitForTimeout(300)
const shareShot = await shot('75-share-whatsapp')
await page.locator('.fin-modal__foot .fin-btn--primary').click(); await page.waitForTimeout(1500)
const shareMsg = await page.locator('.fin-modal .fin-note').innerText().catch(() => '')
const waf = (await fetch(`${FAKES}/__log`).then((r) => r.json())).waFiles.slice(-1)[0] || {}
const shareAudit = sql(`select count(*) from fin_audit where action='shared_whatsapp' and entity_id='${vDoc[0]}'`)
await page.locator('.fin-modal__foot .fin-btn--ghost').click(); await page.keyboard.press('Escape'); await page.waitForTimeout(300)
const empShare = await api(empToken, { action: 'whatsapp-send-doc', document_id: vDoc[0], phone: '0543049491' })
record('SHARE', 'שיתוף מסמך בוואטסאפ', 'המסמך נשלח מה-WhatsApp של המשרד לטלפון רשום; הקובץ שהגיע זהה למקור; נרשם ביומן; עובד לא שולח מסמך שאינו שלו',
  `הודעה: "${shareMsg}"; אל: ${waf.to}; קובץ: ${waf.fileName} (${waf.bytes} bytes), טביעה ${waf.sha === vDoc[1] ? 'זהה' : 'שונה'}; יומן: ${shareAudit}; עובד: ${empShare.status}`,
  /נשלח בוואטסאפ/.test(shareMsg) && waf.to === '972543049491@c.us' && waf.sha === vDoc[1] && shareAudit === '1' && empShare.status === 403, [shareShot])

// the accountant delivery center: approved documents, unselect one, send, they become "sent"
// a second ready document: any one waiting for review without blocking errors, approved through the API like the button does
const toApprove = sql("select id from fin_documents d where status='review' and exported_at is null and coalesce(total_amount,0) < 50000 and not exists (select 1 from jsonb_array_elements(coalesce(d.issues,'[]'::jsonb)) i where i->>'level'='error') order by created_at limit 1")
const approveRes = toApprove ? await rest(`fin_documents?id=eq.${toApprove}`, adminToken, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ status: 'approved' }) }) : { status: 'none' }
const readyIds = sql("select string_agg(id::text, ',') from fin_documents where status='approved' and exported_at is null").split(',').filter(Boolean)
await nav('שליחה לרו״ח'); await page.reload(); await page.waitForSelector('.fin-picklist'); await page.waitForTimeout(800)
const listed = await page.locator('.fin-picklist li').count()
const badge = await page.locator('.fin__nav-item', { hasText: 'שליחה לרו״ח' }).locator('.fin__badge').innerText().catch(() => '0')
const sendCenterShot = await shot('76-send-center')
if (listed > 1) await page.locator('.fin-picklist li input[type=checkbox]').last().uncheck()
const barNow = (await page.locator('.fin-sendbar').innerText()).replace(/\s+/g, ' ')
await page.getByRole('button', { name: 'המשך לשליחה' }).click(); await page.waitForSelector('.fin-modal'); await page.waitForTimeout(300)
const markOn = await page.locator('.fin-modal .fin-check', { hasText: 'נשלח לרו״ח' }).locator('input').isChecked().catch(() => false)
await page.locator('.fin-modal input[type=email]').fill('cpa@accountants.test')
await page.locator('.fin-modal__foot .fin-btn--primary').click()
await page.waitForSelector('.fin-modal', { state: 'detached', timeout: 30000 }).catch(() => {}); await page.waitForTimeout(1200)
const doneNote = await page.locator('.fin-sentcard').first().innerText().catch(() => '')
const expectSent = listed > 1 ? listed - 1 : listed
const nowSent = sql(`select count(*) from fin_documents where id in ('${readyIds.join("','")}') and status='sent' and exported_at is not null`)
const delivery = sql("select status||'|'||documents_count||'|'||coalesce(provider_id,'')||'|'||array_to_string(recipients, ',') from fin_deliveries order by created_at desc limit 1")
const historyRow = await page.locator('.fin-deliveries li').first().innerText().catch(() => '')
const sentCenterShot = await shot('77-send-center-sent')
record('SENDC', 'מרכז השליחה לרו״ח', 'מופיעים כל המסמכים המוכנים (גם בתג בתפריט); ביטול מסמך אחד מעדכן את הסיכום; אחרי שליחה רק המסמכים שנשלחו מסומנים "נשלח לרו״ח"; השליחה נרשמת עם מזהה משרת הדואר',
  `אישור נוסף: ${approveRes.status}; במסך: ${listed}, במסד: ${readyIds.length}, תג: ${badge}; סיכום: ${barNow.slice(0, 60)}; סימון ברירת מחדל: ${markOn}; הודעה: "${doneNote}"; סומנו: ${nowSent}/${expectSent}; משלוח: ${delivery}; היסטוריה: ${historyRow.replace(/\s+/g, ' ').slice(0, 70)}`,
  listed === readyIds.length && listed >= 2 && Number(badge) === readyIds.length && markOn && Number(nowSent) === expectSent && /^sent\|\d+\|.+\|cpa@accountants\.test$/.test(delivery) && /נמסר לשרת הדואר/.test(historyRow),
  [sendCenterShot, sentCenterShot])

// =================== DATE RANGE + SEND TO THE ACCOUNTANT ===================
const auditBefore = Number(sql("select count(*) from fin_audit where action='sent_to_accountant'"))
await nav('כל המסמכים'); await page.waitForTimeout(600)
const totalRows = await page.locator('.fin-table tbody tr').count()
await page.locator('.fin-datechip__main').click(); await page.waitForSelector('.fin-cal'); await page.waitForTimeout(250)
const months = (await page.locator('.fin-cal__mname').allInnerTexts()).join(' | ')
await page.locator('.fin-cal__day[data-date="2026-11-02"]').click()
const midTitle = await page.locator('.fin-cal__head strong').innerText()
await page.locator('.fin-cal__day[data-date="2026-11-05"]').hover(); await page.waitForTimeout(150)
const preview = await page.locator('.fin-cal__day.is-in').count()
await page.locator('.fin-cal__day[data-date="2026-11-05"]').click()
const calShot = await shot('69-date-range')
await page.getByRole('button', { name: 'החל', exact: true }).click(); await page.waitForTimeout(400)
const chip = await page.locator('.fin-datechip__main').innerText()
const inRange = await page.locator('.fin-table tbody tr').count()
const barCount = await page.locator('.fin-rangebar__text strong').innerText()
const expectRange = sql("select count(*) from fin_documents where coalesce(issue_date, (email_date)::date, created_at::date) between '2026-11-02' and '2026-11-05' and status not in ('archived','rejected')")
const rangeShot = await shot('70-range-summary')
await page.getByRole('button', { name: 'שליחה לרו״ח' }).first().click(); await page.waitForTimeout(300)
const prefilled = await page.locator('.fin-modal input[type=email]').inputValue()
await page.locator('.fin-modal input[type=email]').fill('cpa@accountants.test')
await page.locator('.fin-modal textarea').fill('שלום דנה, מצורפות החשבוניות של תחילת נובמבר.')
const sendShot = await shot('71-send-to-accountant')
await page.locator('.fin-modal__foot .fin-btn--primary').click()
await page.waitForSelector('.fin-modal', { state: 'detached', timeout: 30000 }).catch(() => {})
await page.waitForTimeout(500)
const sentNote = await page.locator('.fin-note').first().innerText().catch(() => '')
const lgS = await fetch(`${FAKES}/__log`).then((r) => r.json())
const mailS = [...lgS.emails].reverse().find((e) => /מסמכים לרו״ח/.test(e.subject || ''))
const withFiles = Number(sql("select count(*) from fin_documents where coalesce(issue_date, (email_date)::date, created_at::date) between '2026-11-02' and '2026-11-05' and status not in ('archived','rejected','duplicate') and file_path is not null"))
const auditSend = String(Number(sql("select count(*) from fin_audit where action='sent_to_accountant'")) - auditBefore)
// clearing the chip restores the full list
await page.locator('.fin-datechip__x').click(); await page.waitForTimeout(300)
const cleared = await page.locator('.fin-table tbody tr').count()
// a person without approval rights cannot send
const empSend = await api(empToken, { action: 'send-to-accountant', ids: [sql("select id from fin_documents limit 1")], to: 'x@y.test' })
record('SEND', 'סינון לפי טווח תאריכים ושליחה לרו״ח', 'לוח שנה של שני חודשים: לחיצה ראשונה מתחילה, השנייה מסיימת, הטווח מוצג מראש בריחוף; "החל" מסנן את הרשימה; "שליחה לרו״ח" שולחת מייל אחד עם כל הקבצים המקוריים וקובץ CSV; ניקוי מחזיר הכול; עובד לא יכול לשלוח',
  `חודשים: ${months}; אחרי לחיצה ראשונה: "${midTitle}"; תצוגה מקדימה: ${preview} ימים; צ׳יפ: "${chip}"; שורות: ${inRange}/${totalRows} (צפוי ${expectRange}), בסרגל: "${barCount}"; נמען מוצע: "${prefilled}"; מייל: ${mailS ? `"${mailS.subject}" אל ${mailS.to}, ${mailS.attachments.length} קבצים (${mailS.attachments.filter((a) => /\.csv$/.test(a.filename)).length} CSV, ${mailS.attachments.filter((a) => /\.xlsx$/.test(a.filename)).length} Excel)` : 'לא נשלח'}; הודעה: "${sentNote}"; יומן: ${auditSend}; אחרי ניקוי: ${cleared}; עובד: ${empSend.status}`,
  /אוקטובר|נובמבר/.test(months) && /\?/.test(midTitle) && preview === 2 && /2 בנובמבר.*5 בנובמבר/.test(chip) && inRange === Number(expectRange) && inRange > 0 && inRange < totalRows && !!mailS && mailS.to.includes('cpa@accountants.test') && mailS.attachments.length === withFiles + 2 && mailS.attachments[0].filename.endsWith('.xlsx') && mailS.attachments[1].filename.endsWith('.csv') && auditSend === '1' && cleared === totalRows && empSend.status === 403 && /נשלח/.test(sentNote),
  [calShot, rangeShot, sendShot])

// =================== ORGANIZATION ===================
await api(adminToken, { action: 'invite', email: 'pending@kurkoos.test', role: 'employee', full_name: 'מוזמן חדש' })
await nav('הארגון ומשתמשים'); await page.reload(); await page.waitForSelector('.fin-member'); await page.waitForTimeout(1200)
const orgCards = await page.locator('.fin-member').count()
const pendingCard = await page.locator('.fin-member', { hasText: 'pending@kurkoos.test' }).innerText().catch(() => '')
const pendingStat = (await page.locator('.fin-org-stat').nth(1).innerText()).replace(/\s+/g, ' ')
const orgShot = await shot('63-organization')
await page.getByPlaceholder('חיפוש שם או מייל').fill('דנה'); await page.waitForTimeout(200)
const orgSearch = await page.locator('.fin-member').count()
await page.getByPlaceholder('חיפוש שם או מייל').fill('')
await page.getByLabel('סינון לפי תפקיד').selectOption('employee'); await page.waitForTimeout(200)
const orgEmployees = await page.locator('.fin-member').count()
await page.getByLabel('סינון לפי תפקיד').selectOption('')
await page.getByRole('tab', { name: 'חברות' }).click(); await page.waitForTimeout(300)
const orgCompanies = await page.locator('.fin-acc').count()
const orgCompaniesShot = await shot('64-organization-companies')
await page.getByRole('tab', { name: 'שימוש' }).click(); await page.waitForTimeout(1200)
const usageText = (await page.locator('.fin-org-panel').first().innerText()).replace(/\s+/g, ' ')
const orgUsageShot = await shot('65-organization-usage')
const memberCount = Number(sql('select count(*) from fin_members'))
record('ORG', 'הארגון: חברים, חברות ושימוש', 'כל חבר מופיע בכרטיס עם תפקיד ומצב; הזמנה שלא התקבלה מסומנת "ממתין להצטרפות" ונספרת; חיפוש וסינון לפי תפקיד עובדים; לשונית החברות מראה את כל החברות; לשונית השימוש מראה את האחסון',
  `כרטיסים: ${orgCards}/${memberCount}; מוזמן: ${/ממתין להצטרפות/.test(pendingCard) ? 'ממתין להצטרפות' : pendingCard.slice(0, 40)}; ${pendingStat}; חיפוש "דנה": ${orgSearch}; עובדים: ${orgEmployees}; חברות: ${orgCompanies}; שימוש: ${usageText.slice(0, 60)}`,
  orgCards === memberCount && /ממתין להצטרפות/.test(pendingCard) && /^1 /.test(pendingStat) && orgSearch === 1 && orgEmployees === Number(sql("select count(*) from fin_members where role='employee'")) && orgCompanies === Number(sql('select count(*) from fin_businesses')) && /%/.test(usageText), [orgShot, orgCompaniesShot, orgUsageShot])

// accountant portal in the browser
const accCtx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'he-IL' })
const acc = await accCtx.newPage()
await acc.goto(APP); await acc.fill('input[type=email]', 'cpa@accountants.test'); await acc.fill('input[type=password]', 'Acc0untant!x'); await acc.click('button[type=submit]')
await acc.waitForSelector('.fin__nav'); await acc.waitForTimeout(1000)
const accNav = await acc.locator('.fin__nav-item').allInnerTexts()
const accShot = await shot('25-accountant-portal', acc)
await acc.goto(`${APP}/documents`); await acc.waitForTimeout(1200)
const accRows = await acc.locator('tbody tr').count()
const accDocsShot = await shot('26-accountant-documents', acc)
await acc.goto('http://127.0.0.1:5180/admin'); await acc.waitForTimeout(2000)
const accAdminText = await acc.locator('body').innerText()
const siteApi = async (t) => (await fetch('http://127.0.0.1:5180/api/claude', { method: 'POST', headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ input: 'x' }) })).status
const accClaude = await siteApi(accToken); const adminClaude = await siteApi(adminToken)
record('SEC2', 'משתמש כספים לא נכנס לניהול האתר', 'רו״ח שנכנס ל-/admin מקבל הפניה למערכת הכספים; קריאה ל-API של האתר נחסמת (403), למנהל היא לא נחסמת', `/admin: ${/מורשה למערכת הנהלת החשבונות בלבד/.test(accAdminText) ? 'הפניה' : accAdminText.slice(0, 60)}; /api/claude רו״ח=${accClaude}, מנהל=${adminClaude}`, /מורשה למערכת הנהלת החשבונות בלבד/.test(accAdminText) && accClaude === 403 && adminClaude !== 403, [await shot('26b-accountant-site-admin', acc)])
record('PORTAL', 'פורטל רואה החשבון', 'תפריט מצומצם (מרכז בקרה, שאלות על הנתונים, מסמכים מאושרים, דוחות, היסטוריית ייצוא, הגדרות) ורק מסמכים מאושרים', `${accNav.join(' · ')} · ${accRows} מסמכים`, accNav.length === 6 && accNav.some((n) => /מסמכים מאושרים/.test(n)) && accRows === Number(sql("select count(*) from fin_documents where status in ('approved','sent')")), [accShot, accDocsShot])
await accCtx.close()

// ---------- T12: mobile ----------
const mob = await browser.newContext({ ...devices['iPhone 13'], locale: 'he-IL' })
const m = await mob.newPage()
m.on('pageerror', (e) => consoleErrors.push(`mobile pageerror: ${e.message}`))
await m.goto(APP); await m.fill('input[type=email]', 'admin@kurkoos.test'); await m.fill('input[type=password]', 'Passw0rd!x'); await m.click('button[type=submit]')
await m.waitForSelector('.fin__main'); await m.waitForTimeout(1200)
const overflow = async () => m.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
const mShots = []; const ov = {}
mShots.push(await shot('m1-dashboard', m)); ov.dashboard = await overflow()
await m.goto(`${APP}/documents`); await m.waitForTimeout(900)
await m.locator('.fin-datechip__main').tap(); await m.waitForSelector('.fin-cal'); await m.waitForTimeout(300)
const mCal = { sheet: await m.locator('.fin-cal.is-sheet').count(), months: await m.locator('.fin-cal__month').count(), dayH: Math.round(await m.locator('.fin-cal__day').first().evaluate((el) => el.getBoundingClientRect().height)) }
const mCalShot = await shot('m-calendar', m)
await m.locator('.fin-cal__preset', { hasText: 'החודש' }).first().tap(); await m.getByRole('button', { name: 'החל', exact: true }).tap(); await m.waitForTimeout(400)
mCal.applied = await m.locator('.fin-rangebar').count()
await m.locator('.fin-datechip__x').tap(); await m.waitForTimeout(300)
await m.goto(APP); await m.waitForTimeout(800)
await m.getByRole('button', { name: 'פתיחת התפריט' }).click(); await m.waitForTimeout(400); mShots.push(await shot('m2-menu', m))
const drawer = { email: await m.locator('.fin__drawer-head small').innerText().catch(() => ''), org: await m.locator('.fin__org').innerText().catch(() => ''), groups: (await m.locator('.fin__nav-label').allInnerTexts()).join('|') }
await m.locator('.fin__drawer-head button[aria-label="סגירת התפריט"]').click(); await m.waitForTimeout(400)
drawer.closed = !(await m.locator('.fin__side.is-open').count())
await m.getByRole('button', { name: 'פתיחת התפריט' }).click(); await m.waitForTimeout(400)
await m.locator('.fin__nav-item', { hasText: 'כל המסמכים' }).click(); await m.waitForTimeout(1000); mShots.push(await shot('m3-documents', m)); ov.documents = await overflow()
await m.locator('tbody tr .fin-cell-btn, .fin-doccard__open, .fin-dlist__open').first().click(); await m.waitForTimeout(1500); mShots.push(await shot('m4-review', m)); ov.review = await overflow()
await m.evaluate(() => document.querySelector('.fin-panel__body')?.scrollTo(0, 99999)); await m.waitForTimeout(300); mShots.push(await shot('m5-review-actions', m))
await m.keyboard.press('Escape')
await m.goto(`${APP}/mailboxes`); await m.waitForTimeout(1200); mShots.push(await shot('m6-mailboxes', m)); ov.mailboxes = await overflow()
await m.goto(`${APP}/integrations`); await m.waitForTimeout(1200); mShots.push(await shot('m7-export', m)); ov.export = await overflow()
await m.goto(`${APP}/reports`); await m.waitForTimeout(1200); mShots.push(await shot('m8-reports', m)); ov.reports = await overflow()
for (const [k, path] of [['suppliers', '/suppliers'], ['categories', '/categories'], ['projects', '/projects'], ['companies', '/companies'], ['email', '/mailboxes'], ['scanners', '/scanners'], ['cloud', '/cloud'], ['delivery', '/delivery'], ['org', '/users'], ['project_page', `/projects/${sql("select id from fin_projects where code='BG-17'")}`], ['supplier_page', `/suppliers/${sql("select id from fin_suppliers where name='סולל בונה תשתיות'")}`], ['control', '']]) {
  await m.goto(`${APP}${path}`); await m.waitForTimeout(1100); ov[k] = await overflow(); if (['suppliers', 'project_page', 'control', 'email', 'scanners', 'cloud', 'delivery', 'org'].includes(k)) mShots.push(await shot(`m-${k}`, m))
}
await m.goto(`${APP}/suppliers`); await m.waitForTimeout(900)
await m.locator('.fin-search input').fill('סולל'); await m.waitForTimeout(300)
const mSearch = await m.locator('tbody tr').count()
await m.getByRole('button', { name: 'הוסף ספק' }).first().click(); await m.waitForTimeout(400)
await m.getByLabel(/^שם משפטי/).first().fill('ספק מהטלפון'); mShots.push(await shot('m-supplier-form', m))
await m.locator('.fin-modal__foot .fin-btn--primary').first().click(); await m.waitForTimeout(1000)
const mForm = sql("select count(*) from fin_suppliers where name='ספק מהטלפון'")
record('G', 'מובייל: המסכים החדשים', 'אין גלילה אופקית, חיפוש עובד, טופס ספק נשמר מהטלפון', `גלילה: ${JSON.stringify(ov)}; חיפוש "סולל": ${mSearch}; טופס: ${mForm}`, Object.values(ov).every((v) => v <= 0) && mSearch === 1 && mForm === '1', mShots.slice(-9))
const smallTargets = await m.evaluate(() => [...document.querySelectorAll('.fin button, .fin a, .fin input, .fin select')].filter((e) => e.offsetParent && e.getBoundingClientRect().height < 24 && e.type !== 'checkbox').map((e) => e.className || e.tagName).slice(0, 5))
const dir = await m.evaluate(() => document.querySelector('.fin')?.getAttribute('dir'))
record('MCAL', 'לוח השנה בטלפון', 'נפתח כגיליון תחתון עם חודש אחד, ימים בגובה 44px לפחות, טווח מהיר מוחל', JSON.stringify(mCal), mCal.sheet === 1 && mCal.months === 1 && mCal.dayH >= 44 && mCal.applied === 1, [mCalShot])
record('DRAWER', 'תפריט מובייל: משתמש, ארגון וקבוצות', 'בראש התפריט: המשתמש עם כפתור סגירה וכרטיס הארגון; הקבוצות כוללות "קליטה"; הסגירה עובדת',
  `מייל: ${drawer.email}; ארגון: ${drawer.org.replace(/\s+/g, ' ')}; קבוצות: ${drawer.groups}; נסגר: ${drawer.closed}`,
  drawer.email === 'admin@kurkoos.test' && /קבוצת קורקוס/.test(drawer.org) && /קליטה/.test(drawer.groups) && drawer.closed, mShots.slice(1, 2))
record('T12', 'גרסת מובייל', 'אין גלילה אופקית בשום מסך, התפריט נפתח ונסגר, מסמך נפתח ומאושר מהטלפון, כיוון RTL', `גלילה אופקית (px): ${JSON.stringify(ov)} · dir=${dir} · כפתורים קטנים מ-24px: ${smallTargets.length}`, Object.values(ov).every((v) => v <= 0) && dir === 'rtl', mShots)
await mob.close()

// desktop: no page is wider than the screen
const deskOv = {}
for (const path of ['', '/documents', '/new', '/pending', '/companies', '/projects', '/suppliers', '/categories', '/reports', '/data', '/automations', '/agents', '/mailboxes', '/scanners', '/cloud', '/delivery', '/integrations', '/exports', '/users', '/settings', `/suppliers/${sql("select id from fin_suppliers order by created_at limit 1")}`, `/projects/${sql("select id from fin_projects order by created_at limit 1")}`, `/companies/${sql("select id from fin_businesses order by sort limit 1")}`, `/categories/${sql("select id from fin_categories where name='חומרי בניין'")}`]) {
  await go(path); deskOv[path || '/'] = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
}
await go('/documents'); await page.locator('tbody tr').first().locator('.fin-cell-btn').click(); await page.waitForTimeout(800)
deskOv.review = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
await page.keyboard.press('Escape')
record('DESK', 'מחשב: אין גלילה אופקית בכל המסכים ובעמודי הישויות', '0 בכל מסך', JSON.stringify(deskOv), Object.values(deskOv).every((v) => v <= 0))

// =================== v10: Excel/CSV of chosen documents, skipped files, activity log, monthly report, viewer ===================
await go('/documents')
await page.locator('.fin-table thead input[type=checkbox]').check(); await page.waitForTimeout(300)
const bulkShot = await shot('80-bulk-bar')
const pickedN = await page.locator('.fin-table tbody input[type=checkbox]:checked').count()
const [xDl] = await Promise.all([page.waitForEvent('download'), page.locator('.fin-bulk').getByRole('button', { name: 'Excel' }).click()])
const xPath = `${OUT}/export.xlsx`; await xDl.saveAs(xPath)
const xBuf = fs.readFileSync(xPath)
const xText = xBuf.toString('utf8')
const [cDl] = await Promise.all([page.waitForEvent('download'), page.locator('.fin-bulk').getByRole('button', { name: 'CSV' }).first().click()])
const cPath = `${OUT}/export.csv`; await cDl.saveAs(cPath)
const csvText = fs.readFileSync(cPath, 'utf8')
const csvLines = csvText.replace(/^﻿/, '').split('\r\n').filter(Boolean)
let xCheck = ''
try { xCheck = execSync(`python3 -c "import openpyxl,sys;wb=openpyxl.load_workbook(sys.argv[1]);ws=wb['מסמכים'];print(wb.sheetnames==['מסמכים','לפי קטגוריה','לפי ספק'], ws.sheet_view.rightToLeft, ws['A1'].value, type(ws['A2'].value).__name__, isinstance(ws['K2'].value,(int,float)), ws.max_row-3)" ${xPath}`, { encoding: 'utf8' }).trim() } catch (e) { xCheck = `openpyxl: ${String(e.message).slice(0, 120)}` }
const logX = sql("select count(*) from fin_audit where action in ('exported_excel','exported_csv')")
record('XLSX', 'ייצוא מסמכים מסומנים ל-Excel ו-CSV', 'קובץ xlsx אמיתי (מימין לשמאל, תאריכים ומספרים אמיתיים, גיליונות סיכום לפי קטגוריה וספק) וקובץ CSV ב-UTF-8 עם BOM; שורה לכל מסמך; כל הורדה נרשמת ביומן',
  `${pickedN} מסומנים; xlsx: ${xDl.suggestedFilename()} (${xBuf.length} בתים), ${xCheck}; csv: ${cDl.suggestedFilename()}, ${csvLines.length} שורות, BOM ${csvText.charCodeAt(0) === 0xFEFF}, כותרת "${csvLines[0].slice(0, 40)}"; ביומן: ${logX}`,
  xBuf.slice(0, 2).toString() === 'PK' && /rightToLeft="1"/.test(xText) && /\.xlsx$/.test(xDl.suggestedFilename()) && xCheck === `True True תאריך המסמך datetime True ${pickedN}` && /^קורקוס_.+\.xlsx$/.test(xDl.suggestedFilename()) && /\.csv$/.test(cDl.suggestedFilename()) && csvText.charCodeAt(0) === 0xFEFF && csvLines[0].startsWith('תאריך המסמך,ספק') && csvLines.length === pickedN + 2 && /^\d\d\/\d\d\/20\d\d,/.test(csvLines[1]) && Number(logX) >= 2,
  [bulkShot])
await page.locator('.fin-bulk').getByRole('button', { name: 'ביטול' }).click()

// a quote in the newsletter email: read once, skipped (no financial record), listed; never read again
const skipRow = sql("select document_class||'|'||round(confidence*100)||'|'||file_name from fin_skipped where file_name='quote-hs22.pdf'")
const quoteDoc = sql("select count(*) from fin_documents where file_name='quote-hs22.pdf'")
await go('/activity'); await page.waitForTimeout(800)
await page.getByRole('tab', { name: /קבצים שדולגו/ }).click(); await page.waitForTimeout(400)
const skipShot = await shot('81-skipped-files')
// the nightly conductor: free rules before any paid reading, a short check for the unclear, a doubt waits for a person
const gateT = await import('../../server/finance/triage.js').then(({ gate }) => [
  gate({ name: 'חשבונית 778.pdf' }).verdict, gate({ name: 'הצעת מחיר HS-22.pdf' }).verdict, gate({ name: 'brochure.pdf' }).verdict,
  gate({ name: 'הצעת מחיר וחשבונית.pdf' }).verdict, gate({ name: 'scan001.pdf', from: 'Tambour <billing@tambour.test>' }, { supplierAddrs: new Set(['billing@tambour.test']) }).verdict,
  gate({ name: 'doc.pdf', from: 'news@garden.test' }, { noiseSenders: new Set(['news@garden.test']) }).verdict, gate({ name: 'scan001.pdf', subject: 'מסמך מצורף' }).verdict,
  gate({ name: 'לקבלה_מס_12.pdf' }).verdict, gate({ name: 'הצעה.pdf' }).verdict, gate({ name: 'Statement.pdf', subject: 'החשבון שלך לחודש אוקטובר' }).verdict,
].join(','))
const ruleSkips = sql("select count(*) from fin_skipped where reason like 'דולג בלי קריאה%'")
const conductorLog = sql("select coalesce(string_agg(details->>'conductor', ' ' order by started_at), '') from fin_agent_runs where agent='collector' and details ? 'conductor'")
record('MASTER', 'המנצח הלילי: כללים לפני קריאה בתשלום', 'שם של חשבונית או ספק מוכר נקרא; הצעת מחיר, ברושור או שולח שתמיד דולג מדולג בלי קריאה; "הצעת מחיר וחשבונית" נקרא; שם לא ברור עובר לבדיקה מקדימה; כל דילוג נרשם עם סיבה',
  `החלטות: ${gateT}; דולגו בכלל: ${ruleSkips}; ריצה: ${conductorLog}`,
  gateT === 'invoice,noise,noise,invoice,invoice,noise,unsure,invoice,noise,invoice' && Number(ruleSkips) >= 2 && /skipped_by_rule/.test(conductorLog))
const skipUi = await page.locator('.fin-table tbody tr', { hasText: 'quote-hs22.pdf' }).innerText().catch(() => '')
const relevance = await import('../../server/finance/extract.js').then((m) => [m.relevanceOf({ is_financial_document: true, document_class: 'tax_invoice', relevance_confidence: 0.95 }).verdict, m.relevanceOf({ is_financial_document: false, document_class: 'quote', relevance_confidence: 0.93 }).verdict, m.relevanceOf({ is_financial_document: false, document_class: 'purchase_order', relevance_confidence: 0.6 }).verdict, m.relevanceOf({ is_financial_document: false }).verdict, m.relevanceOf({ is_financial_document: true, document_class: 'contract', relevance_confidence: 0.9 }).verdict].join(','))
record('CLASSIFY', 'הבחנה בין חשבוניות וקבלות למסמכים אחרים', 'הצעת מחיר במייל נקראת, מזוהה בוודאות ולא נשמרת כרשומה כספית; היא מופיעה ב"קבצים שדולגו"; תשובה לא בטוחה נשמרת לבדיקה ולא מדולגת',
  `דולג: ${skipRow}; רשומות: ${quoteDoc}; במסך: "${skipUi.replace(/\s+/g, ' ')}"; החלטות (חשבונית, הצעה בטוחה, הזמנה לא בטוחה, ישן לא כספי, חוזה שסומן כספי): ${relevance}`,
  /^quote\|(93|100)\|quote-hs22\.pdf$/.test(skipRow) && quoteDoc === '0' && /הצעת מחיר/.test(skipUi) && relevance === 'keep,skip,unsure,skip,unsure', [skipShot])

// activity log: exports, Drive saves and connection tests are there, with who and when
await page.getByRole('tab', { name: /פעולות/ }).click(); await page.waitForTimeout(300)
const logRows = await page.locator('.fin-table--log tbody tr').allInnerTexts()
const logShot = await shot('82-activity-log')
await page.locator('select[aria-label="סוג פעולה"]').selectOption('out'); await page.waitForTimeout(300)
const outRows = await page.locator('.fin-table--log tbody tr').allInnerTexts()
record('ACTIVITY', 'יומן פעילות', 'כל הפעולות במקום אחד: קליטה, ייצוא Excel/CSV, שמירה בענן, בדיקת חיבור; סינון לפי סוג',
  `${logRows.length} שורות; ייצוא/ענן: ${outRows.length}; לדוגמה: ${outRows.slice(0, 3).map((r) => r.replace(/\s+/g, ' ')).join(' | ')}`,
  logRows.length > 10 && outRows.length >= 3 && outRows.some((r) => /Excel/.test(r)) && outRows.some((r) => /נשמר בענן/.test(r)) && logRows.some((r) => /בדיקת חיבור עברה/.test(r)) && outRows.every((r) => !/מסמך נקלט/.test(r)), [logShot])

// monthly report: pick the month, see the summary, download the preview, send with the Excel attached
await go('/send'); await page.waitForTimeout(500)
const thisMonthKey = new Date().toISOString().slice(0, 7)
await page.locator('.fin-monthly select').selectOption(thisMonthKey); await page.waitForTimeout(200)
await page.locator('.fin-monthly').getByRole('button', { name: 'הכנת הדוח' }).click(); await page.waitForTimeout(500)
const mPrev = await page.locator('.fin-monthly__preview dl').innerText().catch(() => '')
const expectMonth = sql(`select count(*) from fin_documents where to_char(coalesce(issue_date, (email_date)::date, created_at::date),'YYYY-MM')='${thisMonthKey}' and ((status='approved' and exported_at is null) or status='review')`)
const monthShot = await shot('83-monthly-report')
await page.locator('.fin-monthly').getByRole('button', { name: 'שליחת הדוח' }).click(); await page.waitForTimeout(300)
await page.locator('.fin-modal input[type=email]').fill('cpa@accountants.test')
await page.locator('.fin-modal__foot .fin-btn--primary').click()
await page.waitForSelector('.fin-modal', { state: 'detached', timeout: 30000 }).catch(() => {})
const lgM = await fetch(`${FAKES}/__log`).then((r) => r.json())
const mailM = [...lgM.emails].reverse().find((e) => /מסמכים לרו״ח/.test(e.subject || ''))
record('MONTHLY', 'דוח חודשי לרו״ח', 'בוחרים חודש, רואים מספר מסמכים, לפני מע״מ, מע״מ וסה״כ, ושולחים מייל עם Excel, CSV והקבצים',
  `תצוגה: ${mPrev.replace(/\s+/g, ' ')} (צפוי ${expectMonth} מסמכים); מייל: ${mailM ? `"${mailM.subject}", ${mailM.attachments.map((a) => a.filename.split('.').pop()).join(',')}` : 'לא נשלח'}`,
  new RegExp(`מסמכים\\s*${expectMonth}\\b`).test(mPrev.replace(/\n/g, ' ')) && /מע״מ/.test(mPrev) && !!mailM && /נובמבר|דצמבר|ינואר|פברואר|מרץ|אפריל|מאי|יוני|יולי|אוגוסט|ספטמבר|אוקטובר/.test(mailM.subject) && mailM.attachments[0].filename.endsWith('.xlsx'), [monthShot])

// the viewer: rotate, page counter, save to Drive from the document
await go('/documents'); await page.locator('tbody tr').first().locator('.fin-cell-btn').click(); await page.waitForTimeout(1500)
const frame0 = await page.locator('.fin-viewer__frame').first().boundingBox().catch(() => null)
await page.getByRole('button', { name: 'סיבוב' }).click(); await page.waitForTimeout(500)
const frame1 = await page.locator('.fin-viewer__frame').first().boundingBox().catch(() => null)
const turned = await page.locator('.fin-viewer__frame img').first().evaluate((e) => e.style.transform).catch(() => '')
await page.getByRole('button', { name: 'שמירה בדרייב' }).click(); await page.waitForTimeout(1500)
const vToast = await page.locator('.fin-viewer__toast').innerText().catch(() => '')
const vLink = await page.locator('.fin-viewer__toast a').getAttribute('href').catch(() => '')
const viewerShot10 = await shot('84-viewer-rotate-drive')
await page.getByRole('button', { name: 'שיתוף' }).first().click(); await page.waitForTimeout(400)
const shareTabs = await page.locator('.fin-share__seg [role=tab]').allInnerTexts()
await page.getByRole('tab', { name: /מייל/ }).click(); await page.waitForTimeout(200)
await page.locator('.fin-modal input[type=email]').fill('partner@example.test')
await page.locator('.fin-modal__foot .fin-btn--primary').click(); await page.waitForTimeout(1500)
const shareMsg10 = await page.locator('.fin-modal [role=status]').innerText().catch(() => '')
const lgV = await fetch(`${FAKES}/__log`).then((r) => r.json())
const shareMail = [...lgV.emails].reverse().find((e) => (e.to || []).includes('partner@example.test'))
const shareShot10 = await shot('85-share-email')
await page.keyboard.press('Escape'); await page.keyboard.press('Escape')
record('VIEWER2', 'תצוגת המסמך: סיבוב, שמירה בדרייב, שיתוף במייל', 'סיבוב ב-90° מחליף את מידות המסגרת; "שמירה בדרייב" מראה הודעה עם קישור רק אחרי שהשרת אישר; שיתוף במייל שולח את הקובץ עם Excel',
  `מסגרת: ${frame0 ? `${Math.round(frame0.width)}x${Math.round(frame0.height)}` : '-'} → ${frame1 ? `${Math.round(frame1.width)}x${Math.round(frame1.height)}` : '-'} (${turned}); דרייב: "${vToast.replace(/\s+/g, ' ')}" ${vLink}; לשוניות: ${shareTabs.join('/')}; מייל: "${shareMsg10}" ${shareMail ? `${shareMail.attachments.length} קבצים` : 'לא נשלח'}`,
  !!frame0 && !!frame1 && Math.abs(frame0.width - frame1.width) < 2 && Math.abs(frame0.height - frame1.height) > 20 && /rotate\(90deg\)/.test(turned) && /(נשמר ב-Google Drive|כבר שמור)/.test(vToast) && /^https:\/\/drive\.test\/file\//.test(vLink || '') && shareTabs.length === 2 && /נשלח במייל/.test(shareMsg10) && !!shareMail && shareMail.attachments.some((a) => a.filename.endsWith('.xlsx')),
  [viewerShot10, shareShot10])

const empSave = await api(empToken, { action: 'cloud-save', ids: [sql("select id from fin_documents where file_path is not null limit 1")] })
const empTest = await api(empToken, { action: 'cloud-test', target_id: sql("select id from fin_cloud_targets where provider='gdrive'") })
const empLog = await rest('rpc/fin_log', empToken, { method: 'POST', body: JSON.stringify({ p_action: 'deleted', p_details: {} }) })
const empDrive = await Promise.all(['drive-overview', 'drive-run', 'drive-rename', 'drive-settings'].map((a) => api(empToken, { action: a, target_id: sql("select id from fin_cloud_targets where provider='gdrive'") }).then((r) => r.status)))
const empDriveRows = await rest('fin_drive_files?select=document_id', empToken)
record('SEC-V10', 'הרשאות בפעולות החדשות', 'עובד לא שומר לענן, לא מריץ בדיקת חיבור ולא נוגע בארכיון ה-Drive (לא רואה ולא מריץ); היומן מקבל רק פעולות ייצוא מותרות', `שמירה: ${empSave.status}; בדיקה: ${empTest.status}; ארכיון: ${empDrive.join(',')}, שורות: ${JSON.stringify(empDriveRows.data).slice(0, 20)}; פעולה אסורה ביומן: ${empLog.status}`,
  empSave.status === 403 && empTest.status === 403 && empDrive.every((x) => x === 403) && Array.isArray(empDriveRows.data) && empDriveRows.data.length === 0 && empLog.status >= 400)

// COVER: a mailbox that no scan covers gets a year of history by itself (the night run and a new connection do this), once
{
  sql("insert into fin_mailboxes (provider, email, status, connected_by) values ('gmail', 'cover@kurkoos.test', 'active', (select user_id from fin_members where email = 'admin@kurkoos.test')) on conflict do nothing")
  sql("insert into fin_mailbox_secrets (mailbox_id, refresh_token) select id, 'rt-cover@kurkoos.test' from fin_mailboxes where email = 'cover@kurkoos.test' on conflict do nothing")
  const cid = sql("select id from fin_mailboxes where email='cover@kurkoos.test'")
  const c1 = await api(adminToken, { action: 'scan-coverage' })
  const mine1 = c1.data.results?.find((r) => r.mailbox === 'cover@kurkoos.test') || {}
  const job = sql(`select status||'|'||(current_date - date_from)||'|'||(select count(*) from fin_scan_segments s where s.job_id=j.id) from fin_scan_jobs j where mailbox_id='${cid}'`)
  const c2 = await api(adminToken, { action: 'scan-coverage' })
  const mine2 = c2.data.results?.find((r) => r.mailbox === 'cover@kurkoos.test') || {}
  const jobs = sql(`select count(*) from fin_scan_jobs where mailbox_id='${cid}'`)
  const empCover = await api(empToken, { action: 'scan-coverage' })
  sql(`delete from fin_mailboxes where id='${cid}'`)
  record('COVER', 'תיבה חדשה: שנה אחורה לבד',
    'לתיבה שאף סריקה לא מכסה נפתחת סריקה של שנה (לפי שבועות), פעם אחת בלבד; עובד לא מפעיל',
    `ראשונה: ${JSON.stringify(mine1).slice(0, 90)}; סריקה: ${job}; שנייה: ${mine2.reason || JSON.stringify(mine2).slice(0, 60)}; סריקות: ${jobs}; עובד: ${empCover.status}`,
    mine1.started === true && /^(queued|running)\|36[5-7]\|5[2-4]$/.test(job) && mine2.started === false && mine2.reason === 'active' && jobs === '1' && empCover.status === 403)
}

// V14: fixed expenses, completing missing details, the bar's tip, a month's documents from the report, a supplier's history
{
  const rpc = (fn, token, body) => rest(`rpc/${fn}`, token, { method: 'POST', body: JSON.stringify(body) })
  // one invoice is marked as fixed: every document of that supplier (in that company) is classified, and so is the next one
  const fx = sql("select d.id||'|'||d.supplier_name||'|'||d.business_id from fin_documents d where d.status='review' and d.supplier_name is not null and d.business_id is not null and d.total_amount is not null order by d.created_at limit 1").split('|')
  const empMark = await rpc('fin_recurring_mark', empToken, { p_document: fx[0], p_on: true })
  const marked = await rpc('fin_recurring_mark', adminToken, { p_document: fx[0], p_on: true })
  const recId = marked.data?.id
  const classified = sql(`select count(*) filter (where recurring_id='${recId}')||'/'||count(*) from fin_documents where business_id='${fx[2]}' and lower(supplier_name)=lower('${fx[1].replace(/'/g, "''")}')`)
  sql(`insert into fin_documents (supplier_name, business_id, status, doc_type, doc_number, issue_date, total_amount, source) select supplier_name, business_id, 'review', doc_type, 'FX-NEXT-MONTH', current_date, total_amount, 'upload' from fin_documents where id='${fx[0]}'`)
  const nextOne = sql("select (recurring_id is not null)::text from fin_documents where doc_number='FX-NEXT-MONTH'")
  // one document is taken out of the fixed expense by a person, and stays out
  const offDoc = sql("select id from fin_documents where doc_number='FX-NEXT-MONTH'")
  await rpc('fin_recurring_mark', adminToken, { p_document: offDoc, p_on: false })
  sql(`update fin_documents set supplier_name=supplier_name where id='${offDoc}'`)
  const stayedOff = sql(`select (recurring_id is null)::text from fin_documents where id='${offDoc}'`)
  await go('/fixed'); await page.waitForSelector('.fin-fixed, .fin-empty', { timeout: 15000 }); await page.waitForTimeout(600)
  const fixedRow = await page.locator('.fin-fixed tbody tr', { hasText: fx[1] }).count()
  const fixedShot = await shot('123-fixed-expenses')
  await page.reload(); await page.waitForTimeout(800)
  // the document panel shows it and can mark it
  await go(`/documents/${fx[0]}`); await page.waitForTimeout(1200)
  const panelBtn = await page.locator('.fin-fixedbtn').getAttribute('aria-pressed').catch(() => null)
  // completing missing details: a document without a company and a number is completed next to its file
  const cp = sql("select d.id from fin_documents d where d.status='review' and d.project_id is null and d.supplier_name is not null and d.issue_date is not null and d.total_amount is not null and d.doc_type <> 'other' and d.id <> '" + fx[0] + "' order by d.created_at desc limit 1")
  const cpBiz = sql(`select coalesce(business_id::text,'') from fin_documents where id='${cp}'`)
  sql(`update fin_documents set business_id=null, doc_number=null where id='${cp}'`)
  await go('/complete'); await page.waitForSelector('.fin-comp', { timeout: 15000 })
  const badge = await page.locator('.fin__nav a', { hasText: 'השלמת פרטים' }).locator('.fin__badge').innerText().catch(() => '0')
  // bring this document to the screen (the queue is newest first; move until it is the one shown)
  for (let i = 0; i < 40; i++) { if (sql(`select count(*) from fin_documents where id='${cp}' and business_id is not null and doc_number is not null`) === '1') break
    const steps = await page.locator('.fin-comp__stephead').allInnerTexts()
    const mine = await page.evaluate(() => document.querySelector('.fin-comp__side header strong')?.textContent || '')
    const isMine = sql(`select supplier_name from fin_documents where id='${cp}'`) === mine && steps.some((x) => /חברה/.test(x)) && steps.some((x) => /מספר/.test(x))
    if (!isMine) { await page.getByRole('button', { name: /דילוג למסמך הבא|המסמך הבא/ }).click(); await page.waitForTimeout(350); continue }
    await page.locator('.fin-comp__stephead', { hasText: 'חסר שיוך לחברה' }).click(); await page.locator('.fin-comp__choices .fin-btn').first().click(); await page.waitForTimeout(900)
    await page.locator('.fin-comp__stephead', { hasText: 'חסר מספר מסמך' }).click(); await page.fill('.fin-comp__form input', 'CMP-7781'); await page.locator('.fin-comp__form button[type=submit]').click(); await page.waitForTimeout(900)
  }
  const completed = sql(`select (business_id is not null)::text||'|'||coalesce(doc_number,'') from fin_documents where id='${cp}'`)
  const compShot = await shot('124-complete-details')
  if (cpBiz) sql(`update fin_documents set business_id='${cpBiz}' where id='${cp}' and status='review'`)
  // the monthly chart: the bar under the pointer says how much and how many documents; the number opens the month's list
  await go(''); await page.waitForSelector('.fin-x-trend__col', { timeout: 15000 }); await page.waitForTimeout(600)
  const bar = page.locator('.fin-x-trend__col').last()
  await bar.hover(); await page.waitForTimeout(300)
  const tip = await page.locator('.fin-x-tip').first().innerText().catch(() => '')
  const tipShot = await shot('125-bar-tip')
  await page.locator('.fin-x-monthsum__docs').click(); await page.waitForTimeout(1200)
  const monthList = `${page.url().includes('/documents?ids=1')}|${await page.locator('.fin-onlybar').innerText().catch(() => '')}`
  // reports: documents per month with the number on the bar; a month opens its documents oldest first
  await go('/reports'); await page.getByRole('tab', { name: 'לפי חודש' }).click().catch(() => {}); await page.waitForSelector('.fin-mcount', { timeout: 15000 })
  const counted = (await page.locator('.fin-mcount__col:not([disabled]) .fin-mcount__n').allInnerTexts()).join(',')
  const repShot = await shot('126-report-month-counts')
  await page.locator('.fin-mcount__col:not([disabled])').last().click(); await page.waitForTimeout(1500)
  const chrono = await page.evaluate(() => { const th = [...document.querySelectorAll('th[aria-sort]')].find((x) => x.getAttribute('aria-sort') !== 'none'); return th ? `${th.innerText.replace(/[▲▼]/g, '').trim()}:${th.getAttribute('aria-sort')}` : 'list' })
  const listUrl = page.url().includes('/documents?ids=1')
  // a supplier's history from a document row
  await go('/documents'); await page.waitForTimeout(900)
  const tableBtn = page.getByRole('button', { name: 'טבלה' }); if (await tableBtn.count()) { await tableBtn.first().click(); await page.waitForTimeout(500) }
  await page.locator('.fin-suphist').first().click(); await page.waitForTimeout(1200)
  const hist = /\/suppliers\/[0-9a-f-]{36}|\/documents\?ids=1/.test(page.url())
  // stopping the fixed expense unmarks its documents (they stay in the system)
  const stopped = await rpc('fin_recurring_set', adminToken, { p_id: recId, p_active: false })
  const afterStop = sql(`select count(*) from fin_documents where recurring_id='${recId}'`)
  sql("delete from fin_documents where doc_number='FX-NEXT-MONTH'")
  record('V14', 'הוצאות קבועות, השלמת פרטים, מספרים על הגרף, מסמכי החודש מהדוח, היסטוריית ספק',
    'סימון חשבונית כהוצאה קבועה מסווג את כל מסמכי הספק, וגם את הבא שמגיע; עובד לא מסמן; מסמך שהוצא נשאר בחוץ; המסך מציג את ההוצאה; במסמך יש כפתור; "השלמת פרטים" משלים חברה ומספר מול המסמך; ריחוף על עמודה מציג סכום ומספר מסמכים; מספר המסמכים פותח את רשימת החודש; בדוחות יש מספר מסמכים לכל חודש, ולחיצה פותחת אותם לפי תאריך עולה; מהשורה מגיעים להיסטוריית הספק; הפסקה מבטלת את הסימון',
    `עובד: ${empMark.status}; סימון: ${marked.status}, סווגו ${classified}; הבא: ${nextOne}; הוצא: ${stayedOff}; במסך: ${fixedRow}; כפתור: ${panelBtn}; תג השלמה: ${badge}; הושלם: ${completed}; ריחוף: "${tip}"; רשימת חודש: ${monthList.slice(0, 60)}; ספירה בדוח: ${counted}; מיון: ${chrono}, ${listUrl}; היסטוריה: ${hist}; הפסקה: ${stopped.status}, נשארו ${afterStop}`,
    empMark.status >= 400 && marked.status === 200 && !!recId && /^(\d+)\/\1$/.test(classified) && nextOne === 'true' && stayedOff === 'true' && fixedRow === 1 && panelBtn === 'true'
      && Number(badge) >= 1 && completed === 'true|CMP-7781' && /₪|\d/.test(tip) && /מסמכ/.test(tip) && monthList.startsWith('true|') && /\d/.test(counted) && listUrl && (chrono === 'list' || /ascending/.test(chrono)) && hist && stopped.status === 200 && afterStop === '0',
    [fixedShot, compShot, tipShot, repShot])
}

// the daily work screen shows the month's spend, VAT and six months
await go('/today'); await page.waitForTimeout(600)
const spendTxt = await page.locator('.fin-spend').innerText().catch(() => '')
const bars = await page.locator('.fin-spend__chart span').count()
const homeShot10 = await shot('86-home-spend')
record('HOME2', 'מרכז הבקרה: הוצאות החודש', 'הוצאות החודש, מע״מ, מתחילת השנה ושישה חודשים בגרף, מחושב מהרשומות',
  `${spendTxt.replace(/\s+/g, ' ').slice(0, 160)}; עמודות: ${bars}`, /הוצאות/.test(spendTxt) && /מע״מ החודש/.test(spendTxt) && /מתחילת/.test(spendTxt) && bars === 6, [homeShot10])

// =================== v11: a group of companies, the executive overview, the assistant ===================
const H11 = JSON.parse(fs.readFileSync(`${FIX}/meta.json`, 'utf8'))
const coIns = async (row) => (await rest('fin_businesses', adminToken, { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(row) })).data?.[0]
const raita = await coIns({ name: 'ראיתה חברה לבניין', vat_id: H11.IDS.raita, address: 'הרצל 10, רחובות' })
const ronir = await coIns({ name: 'רוניר', vat_id: H11.IDS.ronir })
const afik = await coIns({ name: 'אפיק הנחל' })
const renamed = await rest(`fin_businesses?id=eq.${afik?.id}`, adminToken, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ name: 'אפיק הנחל בע״מ' }) })
const empCo = await rest('fin_businesses', empToken, { method: 'POST', body: JSON.stringify({ name: 'חברה של עובד' }) })
await go('/companies'); await page.waitForTimeout(800)
const coList = await page.locator('.fin-table tbody, .fin-cards, main11').first().innerText().catch(() => '')
const coShot = await shot('90-companies')
record('CO', 'ניהול חברות: הוספה ועריכה בלי קוד', 'מנהל מוסיף את ראיתה, רוניר ואפיק הנחל ומשנה שם; הן מופיעות ברשימה; עובד לא יכול להוסיף חברה',
  `נוספו: ${[raita?.name, ronir?.name, afik?.name].join(', ')}; שם חדש: ${renamed.data?.[0]?.name}; עובד: ${empCo.status}`,
  !!raita?.id && !!ronir?.id && renamed.data?.[0]?.name === 'אפיק הנחל בע״מ' && /ראיתה חברה לבניין/.test(coList) && /רוניר/.test(coList) && /אפיק הנחל בע״מ/.test(coList) && empCo.status >= 400, [coShot])

// the engine: the printed company ID is certain, the printed name is likely (assigned and flagged), anything else waits
await go('/documents')
await page.getByRole('button', { name: 'הוספת מסמכים' }).click()
await page.locator('[data-testid=upload-input]').setInputFiles([`${FIX}/ronir-inv.pdf`, `${FIX}/raita-inv.pdf`, `${FIX}/cast-1.pdf`])
await page.waitForFunction(() => /הועלו/.test(document.querySelector('.fin-drop__msg')?.textContent || ''), null, { timeout: 30000 }).catch(() => {})
await waitProcessed(['ronir-inv.pdf', 'raita-inv.pdf', 'cast-1.pdf'])
const asg = (f) => sql(`select coalesce(b.name,'-')||'|'||coalesce(d.business_source,'-')||'|'||coalesce((select string_agg(i->>'code', ',') from jsonb_array_elements(d.issues) i where i->>'code' in ('company_check','no_company','company_suggested')),'-') from fin_documents d left join fin_businesses b on b.id=d.business_id where d.file_name='${f}'`)
const aRonir = asg('ronir-inv.pdf'); const aRaita = asg('raita-inv.pdf'); const aCast = asg('cast-1.pdf')
await page.reload(); await page.waitForTimeout(800)
await go('/documents?status=unassigned'); await page.waitForTimeout(800)
const unassignedRows = await page.locator('.fin-table tbody tr').allInnerTexts()
const unShot = await shot('91-waiting-for-company')
// a person assigns it: the correction is recorded as "manual" and teaches the next document from that supplier
await page.locator('.fin-table tbody tr', { hasText: 'יציקות גליל' }).locator('input[type=checkbox]').check()
await page.locator('.fin-bulk select[aria-label="שיוך לחברה"]').selectOption(ronir.id); await page.waitForTimeout(300)
await page.locator('.fin-modal__foot .fin-btn').first().click(); await page.waitForTimeout(1200)
const corrected = asg('cast-1.pdf')
const auditCorr = sql(`select count(*) from fin_audit a join fin_documents d on a.entity_id=d.id::text where d.file_name='cast-1.pdf' and a.action='updated' and a.changes ? 'business_id'`)
await go('/documents')
await page.getByRole('button', { name: 'הוספת מסמכים' }).click()
await page.locator('[data-testid=upload-input]').setInputFiles([`${FIX}/cast-2.pdf`, `${FIX}/ronir-receipt.pdf`])
await page.waitForFunction(() => /הועלו/.test(document.querySelector('.fin-drop__msg')?.textContent || ''), null, { timeout: 30000 }).catch(() => {})
await waitProcessed(['cast-2.pdf', 'ronir-receipt.pdf'])
const learned = sql(`select coalesce(business_id::text,'-')||'|'||coalesce(suggestions->'business_id'->>'value','-')||'|'||coalesce(suggestions->'business_id'->>'confidence','-') from fin_documents where file_name='cast-2.pdf'`)
record('ASSIGN', 'שיוך חשבוניות לחברות בשלוש רמות', 'ח.פ הנמען: שיוך ודאי; שם הנמען בלבד: שיוך עם סימון לבדיקה; חברה לא מוכרת: "ממתין לשיוך"; תיקון ידני נרשם ומלמד, אבל ספק לבד לא משייך אוטומטית',
  `רוניר (ח.פ): ${aRonir}; ראיתה (שם): ${aRaita}; לא מוכרת: ${aCast}; בלשונית: ${unassignedRows.length} שורות; אחרי תיקון: ${corrected} (ביומן ${auditCorr}); מסמך הבא של הספק: ${learned}`,
  aRonir === 'רוניר|auto|-' && aRaita === 'ראיתה חברה לבניין|auto_likely|company_check' && /^-\|-\|(no_company|company_suggested)$/.test(aCast) && unassignedRows.some((r) => /יציקות גליל/.test(r)) && corrected.startsWith('רוניר|manual') && Number(auditCorr) >= 1 && learned.startsWith(`-|${ronir.id}|`) && Number(learned.split('|')[2]) <= 0.84,
  [unShot])

// the overview: the receipt that pays the Ronir invoice is not a second expense
await go(''); await page.waitForTimeout(1500)
const thisMonth11 = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' }).slice(0, 7)
const naive = Number(sql(`select coalesce(sum(case when doc_type='credit' then -abs(total_amount) else abs(total_amount) end),0) from fin_documents where status not in ('rejected','duplicate','failed','processing','archived') and doc_type not in ('quote','proforma','payment_confirmation') and coalesce(currency,'ILS')='ILS' and to_char(coalesce(issue_date, (email_date at time zone 'Asia/Jerusalem')::date, (created_at at time zone 'Asia/Jerusalem')::date),'YYYY-MM')='${thisMonth11}'`))
const heroTxt = await page.locator('.fin-x-big').innerText().catch(() => '')
const hero = Number(heroTxt.replace(/[^\d.\-]/g, ''))
const kpiTxt = await page.locator('.fin-x-kpis').innerText().catch(() => '')
const coRows = await page.locator('.fin-x-rows li').allInnerTexts()
const xShot = await shot('92-executive-overview')
// one company's picture: its tab filters every number on the screen; the address keeps the choice
await page.locator('.fin-x-cos button', { hasText: 'רוניר' }).click(); await page.waitForTimeout(800)
const coPage = page.url()
const ronirHero = Number((await page.locator('.fin-x-big').innerText()).replace(/[^\d.\-]/g, ''))
const ronirExpect = Number(sql(`select coalesce(sum(case when doc_type='credit' then -abs(total_amount) else abs(total_amount) end),0) from fin_documents where business_id='${ronir.id}' and status not in ('rejected','duplicate','failed','processing','archived') and doc_type not in ('quote','proforma','payment_confirmation') and coalesce(currency,'ILS')='ILS' and to_char(coalesce(issue_date, (email_date at time zone 'Asia/Jerusalem')::date, (created_at at time zone 'Asia/Jerusalem')::date),'YYYY-MM')='${thisMonth11}'`)) - 1180
const coCard = await page.locator('.fin-x-company').innerText().catch(() => '')
const coDashShot = await shot('93-company-picture')
await page.reload(); await page.waitForTimeout(1200)
const keptAfterReload = await page.locator('.fin-x-cos button.is-on').innerText().catch(() => '')
await page.locator('.fin-x-cos button', { hasText: 'כל הקבוצה' }).click(); await page.waitForTimeout(500)
const backToGroup = Number((await page.locator('.fin-x-big').innerText()).replace(/[^\d.\-]/g, ''))
record('EXEC', 'סקירה פיננסית למנכ״ל', 'נפתחת ראשונה; סכום החודש שווה לחישוב ישיר מהמסד פחות קבלה שמשלמת חשבונית קיימת (1,180 ₪); חשבוניות, קבלות, מע״מ, ממתינים; בחירת חברה מסננת את כל המספרים לחברה אחת, נשמרת בכתובת, ו"כל הקבוצה" מחזירה',
  `על המסך: ${heroTxt}; ישיר מהמסד: ${naive.toFixed(2)} − 1,180 = ${(naive - 1180).toFixed(2)}; מדדים: ${kpiTxt.replace(/\s+/g, ' ').slice(0, 160)}; חברות: ${coRows.map((r) => r.split('\n')[0]).join(', ')}; רוניר: ${ronirHero} (צפוי ${ronirExpect}), כרטיס: "${coCard.replace(/\s+/g, ' ').slice(0, 80)}", אחרי רענון: ${keptAfterReload.split('\n')[0]}, חזרה לקבוצה: ${backToGroup}`,
  Math.abs(hero - (naive - 1180)) < 0.01 && /קבלות/.test(kpiTxt) && /מהן אישור לחשבונית/.test(kpiTxt) && coRows.some((r) => /רוניר/.test(r)) && coRows.some((r) => /ממתין לשיוך/.test(r)) && coPage.includes(`company=${ronir.id}`) && Math.abs(ronirHero - ronirExpect) < 0.01 && /רוניר/.test(coCard) && /מהוצאות הקבוצה/.test(coCard) && /רוניר/.test(keptAfterReload) && Math.abs(backToGroup - hero) < 0.01,
  [xShot, coDashShot])

// the assistant: answers computed from the database, the same number as the overview
await go('/assistant'); await page.waitForTimeout(600)
await page.getByRole('button', { name: 'שליחה: כמה הוצאנו החודש בכל החברות?', exact: true }).click()
await page.waitForSelector('.fin-chat__value', { timeout: 20000 })
const a1 = await page.locator('.fin-chat__bubble.is-ai').first().innerText()
const a1Value = await page.locator('.fin-chat__value').first().innerText()
await page.locator('.fin-chat__composer textarea').fill('כמה מסמכים עדיין לא שויכו?'); await page.locator('.fin-chat__composer button[type=submit]').click()
await page.waitForFunction(() => document.querySelectorAll('.fin-chat__bubble.is-ai .fin-chat__answer').length >= 2, null, { timeout: 20000 }).catch(() => {})
const a2 = await page.locator('.fin-chat__bubble.is-ai').last().innerText()
const unassignedNow = sql("select count(*) from fin_documents where business_id is null and status not in ('rejected','archived','duplicate','failed','processing')")
const askShot = await shot('94-assistant')
await page.locator('.fin-chat__bubble.is-ai').last().getByRole('button', { name: /^פתיחת/ }).click(); await page.waitForTimeout(800)
const openedRows = await page.locator('.fin-table tbody tr').count()
const openedBar = await page.locator('.fin-onlybar').innerText().catch(() => '')
const askAudit = sql("select count(*) from fin_audit where entity='assistant' and action='asked'")
const empAsk = await api(empToken, { action: 'ask', question: 'כמה הוצאנו החודש בכל החברות?' })
const a1Num = Number(a1Value.replace(/[^\d.\-]/g, ''))
record('ASK', 'עוזר פיננסי שעונה מהנתונים', 'השאלה הופכת לשאילתה, המספר מחושב בשרת ושווה למספר בסקירה; כל תשובה עם תקופה והיקף; "פתיחת המסמכים" מציגה בדיוק את המסמכים שבחישוב; עובד לא יכול לשאול',
  `תשובה 1: ${a1.replace(/\s+/g, ' ').slice(0, 140)} (מספר ${a1Num}, בסקירה ${hero}); תשובה 2: ${a2.replace(/\s+/g, ' ').slice(0, 80)} (במסד ${unassignedNow}); נפתחו ${openedRows} מסמכים ("${openedBar.replace(/\s+/g, ' ').slice(0, 60)}"); ביומן ${askAudit}; עובד: ${empAsk.status}`,
  Math.abs(a1Num - hero) < 0.01 && /החודש|נובמבר|דצמבר|ינואר/.test(a1) && (unassignedNow === '1' ? /מסמך אחד בלי חברה/ : new RegExp(`${unassignedNow} מסמכים בלי חברה`)).test(a2) && openedRows === Number(unassignedNow) && Number(askAudit) >= 2 && empAsk.status === 403,
  [askShot])

// permissions between companies: an accountant limited to Ronir sees only Ronir, in the database and in the answers
sql(`update fin_members set business_ids = array['${ronir.id}']::uuid[] where email='cpa@accountants.test'`)
sql(`update fin_documents set status='approved' where file_name in ('ronir-inv.pdf','raita-inv.pdf')`)
const accDocs11 = await rest('fin_documents?select=business_id', accToken)
const accAsk = await api(accToken, { action: 'ask', question: 'איזו חברה הוציאה הכי הרבה מתחילת השנה?' })
sql("update fin_members set business_ids = null where email='cpa@accountants.test'")
const accCos = [...new Set((accDocs11.data || []).map((d) => d.business_id))]
record('SEC-CO', 'הפרדה בין חברות', 'משתמש שמורשה לחברה אחת רואה רק את המסמכים שלה, וגם העוזר עונה רק עליה',
  `מסמכים: ${(accDocs11.data || []).length} מחברות ${accCos.length}; עוזר: ${(accAsk.data.rows || []).map((r) => r.label).join(', ')}`,
  (accDocs11.data || []).length >= 1 && accCos.length === 1 && accCos[0] === ronir.id && (accAsk.data.rows || []).every((r) => r.label === 'רוניר'))

// phones: the overview and the tab bar
const ph = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'he-IL', hasTouch: true, isMobile: true })
const pp = await ph.newPage()
await pp.goto(APP); await pp.fill('input[type=email]', 'admin@kurkoos.test'); await pp.fill('input[type=password]', 'Passw0rd!x'); await pp.click('button[type=submit]')
await pp.waitForSelector('.fin-x-big', { timeout: 20000 }).catch(() => {}); await pp.waitForTimeout(800)
const phOv = await pp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
const tabs = await pp.locator('.fin-tabbar > *').count()
const tabVisible = await pp.locator('.fin-tabbar').isVisible()
const phShot = await shot('95-phone-overview', pp)
await pp.locator('.fin-tabbar').getByRole('link', { name: 'מסמכים' }).click(); await pp.waitForTimeout(1000)
const phDocs = pp.url().endsWith('/documents')
const lastRowCovered = await pp.evaluate(() => { const bar = document.querySelector('.fin-tabbar')?.getBoundingClientRect(); window.scrollTo(0, document.body.scrollHeight); const main11 = document.querySelector('.fin__content'); const pad = parseFloat(getComputedStyle(main11).paddingBottom); return { pad, bar: bar?.height } })
await pp.locator('.fin-tabbar__add').click(); await pp.waitForTimeout(500)
const capOpen = await pp.locator('.fin-modal').isVisible().catch(() => false)
const phShot2 = await shot('96-phone-capture', pp)
await ph.close()
record('MOBILE11', 'טלפון: סקירה וסרגל ניווט תחתון', 'אין גלילה אופקית; סרגל תחתון עם סקירה, מסמכים, צילום, דוחות, עוד; התוכן לא מוסתר מאחוריו; כפתור המצלמה פותח צילום קבלה',
  `גלילה: ${phOv}px; פריטים: ${tabs}; מסמכים: ${phDocs}; ריווח תחתון ${lastRowCovered.pad}px מול סרגל ${Math.round(lastRowCovered.bar)}px; צילום: ${capOpen}`,
  phOv <= 0 && tabVisible && tabs === 5 && phDocs && lastRowCovered.pad >= lastRowCovered.bar && capOpen, [phShot, phShot2])

// =================== analytics never sees the finance system ===================
{
  const ga = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'he-IL' })
  const gp = await ga.newPage()
  const hits = []
  await gp.route(/google-analytics\.com|googletagmanager\.com|facebook\.net|connect\.facebook|doubleclick/, (route) => { hits.push({ url: route.request().url(), at: gp.url() }); route.fulfill({ status: 204, body: '' }) })
  await gp.goto('http://127.0.0.1:5180/'); await gp.waitForTimeout(1500)
  const onPublic = hits.length
  // into the finance system without a page load, as a person clicking a link would
  await gp.evaluate(() => { history.pushState({}, '', '/admin/finance'); dispatchEvent(new PopStateEvent('popstate')) }); await gp.waitForTimeout(1200)
  await gp.fill('input[type=email]', 'admin@kurkoos.test').catch(() => {}); await gp.fill('input[type=password]', 'Passw0rd!x').catch(() => {}); await gp.click('button[type=submit]').catch(() => {})
  await gp.waitForTimeout(2500)
  const flag = await gp.evaluate(() => Object.keys(window).filter((k) => k.startsWith('ga-disable-')).map((k) => window[k]))
  const robots = await gp.evaluate(() => document.querySelector('meta[name="robots"]')?.content || '')
  const inFinance = hits.filter((h) => /\/admin/.test(h.at) && /collect|\/g\/|tr\?/.test(h.url))
  const vj = JSON.parse(fs.readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8'))
  const adminHeaders = Object.fromEntries((vj.headers.find((h) => h.source === '/admin(.*)')?.headers || []).map((h) => [h.key, h.value]))
  const robotsTxt = fs.readFileSync(new URL('../../public/robots.txt', import.meta.url), 'utf8')
  await ga.close()
  record('GA-SEP', 'הפרדת אנליטיקה: מערכת הכספים לא נמדדת', 'מעבר מעמוד ציבורי למערכת הכספים בלי טעינת עמוד: הדגל ga-disable דולק, אף בקשת מדידה לא יוצאת ממערכת הכספים, meta robots=noindex, השרת שולח X-Robots-Tag ו-Referrer-Policy: no-referrer, ו-robots.txt חוסם /admin',
    `בקשות מדידה בעמוד הציבורי: ${onPublic}; ממערכת הכספים: ${inFinance.length}; דגל: ${JSON.stringify(flag)}; meta: "${robots}"; כותרות: ${JSON.stringify(adminHeaders)}`,
    inFinance.length === 0 && flag.length > 0 && flag.every((x) => x === true) && /noindex/.test(robots) && /noindex/.test(adminHeaders['X-Robots-Tag'] || '') && adminHeaders['Referrer-Policy'] === 'no-referrer' && /Disallow: \/admin/.test(robotsTxt))
}

// =================== v12: sign-in security ===================
{
  const totp = (secret) => execSync(`python3 -c "import hmac,hashlib,base64,struct,time,sys;s=sys.argv[1];k=base64.b32decode(s.upper()+'='*(-len(s)%8));c=int(time.time()//30);h=hmac.new(k,struct.pack('>Q',c),hashlib.sha1).digest();o=h[-1]&15;print(str((struct.unpack('>I',h[o:o+4])[0]&0x7fffffff)%1000000).zfill(6))" ${secret}`, { encoding: 'utf8' }).trim()
  // 1. a failed sign-in is recorded (email and time only), the screen explains, and the password can be shown
  const sx = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'he-IL' }); const sp = await sx.newPage()
  await sp.goto(APP); await sp.fill('input[type=email]', 'admin@kurkoos.test'); await sp.fill('input[type=password]', 'wrong-password')
  await sp.getByRole('button', { name: 'הצגת הסיסמה' }).click(); const shownType = await sp.locator('input[autocomplete="current-password"]').getAttribute('type')
  await sp.click('button[type=submit]'); await sp.waitForTimeout(1200)
  const failMsg = await sp.locator('.fin-login [role=alert]').innerText().catch(() => '')
  const failRow = sql("select count(*) from fin_login_events where kind='failed' and email='admin@kurkoos.test'")
  const loginShot = await shot('97-login')
  // 2. MFA becomes mandatory for admins: the admin is stopped at the second step, the database refuses data, the UI enrols
  sql(`update fin_settings set value='["admin","finance_manager"]' where key='mfa_required_roles'`)
  await sp.fill('input[autocomplete="current-password"]', 'Passw0rd!x'); await sp.click('button[type=submit]')
  await sp.waitForSelector('text=אימות דו-שלבי', { timeout: 15000 }); await sp.waitForTimeout(400)
  const aal1Token = await sp.evaluate(() => { const k = Object.keys(localStorage).find((x) => x.startsWith('sb-') && x.endsWith('-auth-token')); return k ? JSON.parse(localStorage.getItem(k)).access_token : null })
  const refusedDb = await rest('fin_documents?select=id&limit=1', aal1Token)
  const refusedApi = await api(aal1Token, { action: 'status' }).then(() => api(aal1Token, { action: 'members-meta' }))
  const mfaShot = await shot('98-mfa-required')
  await sp.getByRole('button', { name: 'הגדרת אפליקציית אימות' }).click(); await sp.waitForSelector('.fin-login__qr', { timeout: 15000 })
  await sp.locator('summary', { hasText: 'אי אפשר לסרוק' }).click(); const secret = (await sp.locator('.fin-login__secret').innerText()).trim()
  await sp.fill('.fin-login__code', '000000'); await sp.click('button[type=submit]'); await sp.waitForTimeout(800)
  const badCode = await sp.locator('.fin-login [role=alert]').innerText().catch(() => '')
  await sp.fill('.fin-login__code', totp(secret)); await sp.click('button[type=submit]')
  await sp.waitForSelector('.fin-x-big, .fin__nav', { timeout: 30000 }); await sp.waitForTimeout(800)
  const aal2Token = await sp.evaluate(() => { const k = Object.keys(localStorage).find((x) => x.startsWith('sb-') && x.endsWith('-auth-token')); return k ? JSON.parse(localStorage.getItem(k)).access_token : null })
  const aal = JSON.parse(Buffer.from(aal2Token.split('.')[1], 'base64url').toString()).aal
  const okDb = await rest('fin_documents?select=id&limit=1', aal2Token)
  const enrolled = sql("select count(*) from auth.mfa_factors f join auth.users u on u.id=f.user_id where u.email='admin@kurkoos.test' and f.status='verified'")
  const events = sql("select string_agg(kind, ',' order by at) from fin_login_events where email='admin@kurkoos.test' and kind in ('mfa_failed','mfa_enrolled','signed_in')")
  record('MFA', 'אימות דו-שלבי חובה למנהלים', 'ניסיון כושל נרשם ומוסבר; כשהתפקיד דורש, אחרי הסיסמה המסד וה-API מסרבים (aal1) עד שהאפליקציה מוגדרת; קוד שגוי נדחה; אחרי קוד נכון הטוקן aal2 והנתונים נפתחים; הכול ביומן הכניסות',
    `סיסמה גלויה: ${shownType}; כשלון: "${failMsg}" (${failRow} ביומן); לפני: מסד ${refusedDb.status}/${Array.isArray(refusedDb.data) ? refusedDb.data.length : '-'}, API ${refusedApi.status} ${refusedApi.data.code || ''}; קוד שגוי: "${badCode.slice(0, 40)}"; אחרי: aal=${aal}, מסד ${okDb.status}/${okDb.data.length}, גורמים ${enrolled}; אירועים: ${events}`,
    shownType === 'text' && /שגויים/.test(failMsg) && Number(failRow) >= 1 && Array.isArray(refusedDb.data) && refusedDb.data.length === 0 && refusedApi.status === 403 && refusedApi.data.code === 'MFA_REQUIRED' && /שגוי/.test(badCode) && aal === 'aal2' && okDb.data.length === 1 && enrolled === '1' && /mfa_failed/.test(events) && /mfa_enrolled/.test(events),
    [loginShot, mfaShot])

  // 3. blocking ends the sessions now; the blocked person cannot sign in; an employee cannot block; unblocking restores
  const wx = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'he-IL' }); const wp = await wx.newPage()
  await wp.goto(APP); await wp.fill('input[type=email]', 'worker@kurkoos.test'); await wp.fill('input[type=password]', 'W0rker!xx'); await wp.click('button[type=submit]'); await wp.waitForSelector('.fin__nav', { timeout: 20000 })
  const workerId = sql("select user_id from fin_members where email='worker@kurkoos.test'")
  const sessBefore = Number(sql(`select count(*) from auth.sessions where user_id='${workerId}'`))
  const empBlock = await api(empToken, { action: 'member-block', user_id: workerId, blocked: true })
  const adminBlock = await api(aal2Token, { action: 'member-block', user_id: workerId, blocked: true })
  const sessAfter = Number(sql(`select count(*) from auth.sessions where user_id='${workerId}'`))
  await wp.reload(); await wp.waitForTimeout(2500)
  const kicked = await wp.locator('.fin-login input[type=email]').count()
  await wp.fill('input[type=email]', 'worker@kurkoos.test').catch(() => {}); await wp.fill('input[type=password]', 'W0rker!xx').catch(() => {}); await wp.click('button[type=submit]').catch(() => {}); await wp.waitForTimeout(1200)
  const blockedMsg = await wp.locator('.fin-login [role=alert]').innerText().catch(() => '')
  const unblock = await api(aal2Token, { action: 'member-block', user_id: workerId, blocked: false })
  const selfBlock = await api(aal2Token, { action: 'member-block', user_id: sql("select user_id from fin_members where email='admin@kurkoos.test'"), blocked: true })
  await wx.close()
  record('BLOCK', 'חסימת משתמש וניתוק מכל המכשירים', 'מנהל חוסם עובד: כל החיבורים שלו נמחקים מיד, הדף שלו חוזר למסך הכניסה והכניסה נדחית כחסומה; עובד לא יכול לחסום; מנהל לא חוסם את עצמו; ביטול החסימה מחזיר',
    `חיבורים: ${sessBefore} → ${sessAfter} (נותקו ${adminBlock.data.sessions_ended}); עובד מנסה: ${empBlock.status}; נזרק למסך כניסה: ${kicked === 1}; הודעה: "${blockedMsg}"; ביטול: ${unblock.status}; עצמי: ${selfBlock.status}`,
    sessBefore >= 1 && sessAfter === 0 && adminBlock.data.sessions_ended >= 1 && empBlock.status === 403 && kicked === 1 && /חסום/.test(blockedMsg) && unblock.status === 200 && selfBlock.status === 400)

  // 4. the users screen: sign-ins and security tab, "sign out everywhere", the my-security card, the idle sign-out
  await sp.goto(`${APP}/users?tab=security`); await sp.waitForTimeout(1500)
  const secTab = await sp.locator('.fin-org-stats').innerText().catch(() => '')
  const secRows = await sp.locator('.fin-table--log tbody tr').count()
  const secShot = await shot('99-security-tab', sp)
  await sp.goto(`${APP}/settings`); await sp.waitForTimeout(1200)
  const mine = await sp.locator('.fin-mysec').innerText().catch(() => '')
  const mineShot = await shot('99b-my-security', sp)
  sql("update fin_settings set value='1' where key='idle_minutes'")
  await sp.reload(); await sp.waitForTimeout(1500)
  const t0 = Date.now(); let idleBar = false; let signedOut = false
  while (Date.now() - t0 < 90_000) { await sp.waitForTimeout(3000); if (!idleBar && await sp.locator('.fin-idlebar').count()) idleBar = true; if (await sp.locator('.fin-login input[type=email]').count()) { signedOut = true; break } }
  const idleEv = sql("select count(*) from fin_login_events where kind='idle_timeout' and email='admin@kurkoos.test'")
  sql("update fin_settings set value='30' where key='idle_minutes'"); sql(`update fin_settings set value='[]' where key='mfa_required_roles'`)
  await sx.close()
  record('IDLE', 'מסך האבטחה, האבטחה שלי וניתוק אחרי חוסר פעילות', 'לשונית "כניסות ואבטחה" עם מספרים ויומן; כרטיס "האבטחה שלי" עם אימות דו-שלבי פעיל; אחרי זמן ההגדרה בלי פעילות מופיעה אזהרה ואז המערכת מתנתקת, והניתוק נרשם',
    `לשונית: ${secTab.replace(/\s+/g, ' ').slice(0, 120)}, ${secRows} שורות; שלי: ${/אימות דו-שלבי פעיל/.test(mine)}; אזהרה: ${idleBar}; נותק אחרי ${Math.round((Date.now() - t0) / 1000)} שניות: ${signedOut}; ביומן: ${idleEv}`,
    /כניסות ב-24 שעות/.test(secTab) && secRows >= 3 && /אימות דו-שלבי פעיל/.test(mine) && idleBar && signedOut && Number(idleEv) >= 1, [secShot, mineShot])
}

// =================== v13: welcome, company settings, numbers to check, WhatsApp, attachments, profile menu ===================
{
  // 1. a new member sees the two-step welcome once: name and phone, then the inbox
  sql("update fin_settings set value='true' where key='onboarding_enabled'")
  const newEmail = 'newcomer@kurkoos.test'
  await admin('admin/users', { email: newEmail, password: 'N3wcomer!xx', email_confirm: true })
  const newId = sql(`select id from auth.users where email='${newEmail}'`)
  sql(`insert into fin_members (user_id, email, full_name, role, active) values ('${newId}', '${newEmail}', 'נועה כהן', 'employee', true) on conflict (user_id) do update set onboarded_at = null`)
  const ox = await browser.newContext({ viewport: { width: 1280, height: 860 }, locale: 'he-IL' }); const op = await ox.newPage()
  await op.goto(APP); await op.fill('input[type=email]', newEmail); await op.fill('input[autocomplete="current-password"]', 'N3wcomer!xx'); await op.click('button[type=submit]')
  await op.waitForSelector('.fin-onb', { timeout: 20000 }).catch(() => {})
  const step1 = await op.locator('.fin-onb h1').innerText().catch(() => '')
  const onbShot1 = await shot('101-welcome-1', op)
  await op.locator('.fin-onb input[type=tel]').fill('050-7777123'); await op.locator('.fin-onb button[type=submit]').click(); await op.waitForTimeout(900)
  const step2 = await op.locator('.fin-onb h1').innerText().catch(() => '')
  const onbShot2 = await shot('102-welcome-2', op)
  await op.getByRole('button', { name: 'לא עכשיו' }).click(); await op.waitForSelector('.fin__nav', { timeout: 20000 }).catch(() => {})
  const inApp = await op.locator('.fin__nav').count()
  const phoneRow = sql(`select phone||'|'||(user_id='${newId}') from fin_whatsapp_senders where phone='972507777123'`)
  const onboarded = sql(`select (onboarded_at is not null) from fin_members where user_id='${newId}'`)
  await op.reload(); await op.waitForTimeout(1500); const again = await op.locator('.fin-onb').count()
  await ox.close(); sql("update fin_settings set value='false' where key='onboarding_enabled'")
  record('ONBOARD', 'ברוכים הבאים: שני שלבים בכניסה הראשונה', 'שלב 1 עם השם והטלפון ל-WhatsApp (נרשם כמספר מחובר), שלב 2 חיבור תיבת המייל או "לא עכשיו"; אחרי הסיום נכנסים למערכת והמסך לא חוזר',
    `שלב 1: "${step1}"; שלב 2: "${step2}"; טלפון: ${phoneRow}; סומן: ${onboarded}; במערכת: ${inApp}; חוזר אחרי רענון: ${again}`,
    /נעים להכיר, נועה/.test(step1) && /לאסוף חשבוניות מהמייל/.test(step2) && phoneRow === '972507777123|true' && onboarded === 't' && inApp === 1 && again === 0, [onbShot1, onbShot2])

  // 2. company settings: tabs per company, saved and used by the VAT report
  await go('/settings?tab=companies'); await page.waitForTimeout(800)
  // the security steps above may have ended this window's session (the app then returns to the sign-in screen): sign in again
  if (await page.locator('.fin-auth input[type=email]').count()) {
    await page.fill('input[type=email]', 'admin@kurkoos.test'); await page.fill('input[type=password]', 'Passw0rd!x'); await page.click('button[type=submit]')
    await page.waitForSelector('.fin__main', { timeout: 20000 }).catch(() => {}); await go('/settings?tab=companies'); await page.waitForTimeout(800)
  }
  if (!(await page.locator('.fin-cset__pick').count())) { await shot('103-cset-missing'); console.log('CSET page:', page.url(), (await page.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 300)) }
  await page.locator('.fin-cset__pick button', { hasText: 'רוניר' }).click(); await page.waitForTimeout(300)
  await page.locator('.fin-cset__tabs button', { hasText: 'דיווח ומע״מ' }).click(); await page.waitForTimeout(200)
  await page.locator('.fin-cset select').nth(1).selectOption('bimonthly'); await page.waitForTimeout(200)
  await page.locator('.fin-cset__tabs button', { hasText: 'רואה החשבון' }).click()
  await page.locator('.fin-cset input[type=email]').first().fill('ronir-cpa@accountants.test')
  const csetShot = await shot('103-company-settings')
  await page.getByRole('button', { name: 'שמירת השינויים' }).click(); await page.waitForTimeout(1000)
  const saved = sql(`select report_settings->>'vat_period'||'|'||coalesce(accountant_email,'') from fin_businesses where name='רוניר'`)
  await go(`/reports?company=${sql("select id from fin_businesses where name='רוניר'")}`); await page.waitForTimeout(600)
  await page.getByRole('tab', { name: 'סיכום מע״מ' }).click(); await page.waitForTimeout(500)
  const vatHead = await page.locator('.fin-table thead').first().innerText().catch(() => '')
  const vatRow = await page.locator('.fin-table tbody tr').first().innerText().catch(() => '')
  record('CSET', 'הגדרות לכל חברה ודוח מע״מ לפי תקופת הדיווח', 'לשוניות פרטים / דיווח ומע״מ / רואה החשבון / מקורות; שמירה למסד; דוח המע״מ של חברה שמדווחת דו-חודשי מקובץ בזוגות חודשים',
    `נשמר: ${saved}; כותרת: ${vatHead.replace(/\s+/g, ' ').slice(0, 60)}; שורה: ${vatRow.replace(/\s+/g, ' ').slice(0, 40)}`,
    saved === 'bimonthly|ronir-cpa@accountants.test' && /דו-חודשי/.test(vatHead) && /–/.test(vatRow), [csetShot])

  // 3. numbers to check: a document whose sums do not add up is listed, and the home screen points at it
  const numId = sql("select id from fin_documents where status='review' and file_path is not null order by created_at limit 1")
  sql(`update fin_documents set issues = coalesce(issues,'[]'::jsonb) || '[{"level":"error","code":"sum","field":"total_amount","message":"לפני מע״מ ועוד מע״מ אינם שווים לסה״כ"}]'::jsonb where id='${numId}'`)
  await go('/documents?status=numbers'); await page.waitForTimeout(800)
  const numRows = await page.locator('.fin-table tbody tr, .fin-doccard, .fin-dlist__row').count()
  const numShot = await shot('104-numbers-to-check')
  await go('/today'); await page.waitForTimeout(600)
  const homeNums = await page.locator('.fin-alertrow--warn').innerText().catch(() => '')
  record('NUMS', 'מסמכים שהמערכת לא בטוחה בסכומים שלהם', 'לשונית "מספרים לבדיקה" מראה מסמך שהסכומים בו לא מסתדרים; מרכז הבקרה מפנה אליה', `שורות: ${numRows}; בבית: "${homeNums}"`, numRows >= 1 && /אשרו את המספרים/.test(homeNums), [numShot])

  // 4. the WhatsApp screen: office number, stats, an unknown sender can be added in one tap; the top-bar chip
  await go('/scanners'); await page.waitForTimeout(1200)
  const waOffice = await page.locator('.fin-wa__office').innerText().catch(() => '')
  const waStats = await page.locator('.fin-wa__stats').innerText().catch(() => '')
  const waUnknown = await page.locator('.fin-wa__unknown').count()
  const waShot = await shot('105-whatsapp-numbers')
  await page.locator('.fin-wachip__btn').click(); await page.waitForTimeout(300)
  const chipPop = await page.locator('.fin-wachip__pop').innerText().catch(() => '')
  const chipShot = await shot('106-whatsapp-chip')
  await page.keyboard.press('Escape')
  record('WA2', 'מספרים מחוברים ב-WhatsApp', 'מספר המשרד עם העתקה ופתיחת שיחה, מספרים מסכמים, מספר לא רשום שניסה לשלוח מוצג עם "הוספה"; בפס העליון המספר עם הסבר וקישור לניהול',
    `משרד: ${waOffice.replace(/\s+/g, ' ').slice(0, 70)}; סיכום: ${waStats.replace(/\s+/g, ' ')}; לא רשומים: ${waUnknown}; חלונית: ${chipPop.replace(/\s+/g, ' ').slice(0, 60)}`,
    /972 50-123-4567|\+972/.test(waOffice) && /מספרים פעילים/.test(waStats) && waUnknown === 1 && /ניהול מספרים מחוברים/.test(chipPop), [waShot, chipShot])

  // 5. a document: attachment file and a linked document, paid state, open in a new window, delete for a finance manager
  const ronirInv = sql("select id from fin_documents where file_name='ronir-inv.pdf'")
  await go(`/documents/${ronirInv}`); await page.waitForTimeout(1500)
  const paidPill = await page.locator('.fin-panel__meta').innerText().catch(() => '')
  await page.locator('[data-testid=attach-input]').setInputFiles(`${FIX}/brochure.pdf`); await page.waitForTimeout(1500)
  await page.getByRole('button', { name: 'קישור מסמך קיים' }).click(); await page.waitForTimeout(200)
  await page.locator('.fin-attach__link select').selectOption(sql("select id from fin_documents where file_name='ronir-receipt.pdf'")); await page.getByRole('button', { name: 'קישור', exact: true }).click(); await page.waitForTimeout(1000)
  const attRows = await page.locator('.fin-attach__list li').allInnerTexts()
  const attShot = await shot('107-attachments')
  // the window opens with the file's own address; whether the browser can draw a PDF there is the browser's part
  // (headless Chromium has no PDF viewer and leaves the window blank), so the link itself is checked: it is the file, and it loads
  const openLink = page.locator('.fin-viewer__bar a[aria-label="פתיחה בחלון חדש"]')
  const linkFile = await openLink.evaluate(async (a) => { try { const r = await fetch(a.href); const b = await r.blob(); return a.target === '_blank' && r.ok && b.size > 0 ? a.href : '' } catch { return '' } }).catch(() => '')
  const [popup] = await Promise.all([page.waitForEvent('popup', { timeout: 8000 }).catch(() => null), openLink.click()])
  const popupUrl = popup ? linkFile : ''
  if (popup) await popup.close()
  const attAudit = sql(`select count(*) from fin_audit where entity_id='${ronirInv}' and action='attachment_added'`)
  const empAtt = await rest(`fin_document_attachments?document_id=eq.${ronirInv}&select=id`, empToken)
  await page.keyboard.press('Escape')
  record('ATTACH', 'מסמך: נספחים, סטטוס תשלום, פתיחה בחלון גדול', 'סטטוס "שולם" כשיש קבלה מתאימה; נספח קובץ וקישור למסמך אחר נשמרים ונרשמים בהיסטוריה; פתיחה בחלון חדש של הדפדפן; עובד שלא רואה את המסמך לא רואה את הנספחים',
    `סטטוס: ${paidPill.replace(/\s+/g, ' ').slice(0, 60)}; נספחים: ${attRows.map((r) => r.split('\n')[0]).join(' | ')}; חלון: ${popupUrl.slice(0, 30)}; בהיסטוריה: ${attAudit}; עובד: ${Array.isArray(empAtt.data) ? empAtt.data.length : empAtt.status}`,
    /שולם/.test(paidPill) && attRows.length === 2 && attRows.some((r) => /brochure\.pdf/.test(r)) && attRows.some((r) => /מתכת הצפון/.test(r)) && /^blob:/.test(popupUrl) && attAudit === '2' && Array.isArray(empAtt.data) && empAtt.data.length === 0, [attShot])

  // 6. the profile menu and the upload window
  await go(''); await page.waitForTimeout(800)
  await page.locator('.fin-profile__btn').click(); await page.waitForTimeout(300)
  const menu = await page.locator('.fin-profile__pop').innerText().catch(() => '')
  const menuShot = await shot('108-profile-menu')
  await page.keyboard.press('Escape')
  await page.locator('.fin__upload').click(); await page.waitForTimeout(400)
  const upModal = await page.locator('.fin-modal').innerText().catch(() => '')
  const upShot = await shot('109-upload-window')
  await page.keyboard.press('Escape')
  const xActs = await page.locator('.fin-x-acts').innerText().catch(() => '')
  const xFeed = await page.locator('.fin-x-feed li').count()
  const xShot = await shot('110-overview-v13')
  record('PROFILE', 'תפריט פרופיל, חלון העלאה וסקירה משופרת', 'התפריט: הפרופיל שלי, הגדרות, חברות ודיווח, משתמשים, חיבורים, מראה בהיר/כהה, התנתקות, בלי חיובים; כפתור "העלאת מסמכים" פותח חלון; בסקירה שלושה כרטיסי פעולה ופעילות אחרונה',
    `תפריט: ${menu.replace(/\s+/g, ' ')}; חלון: ${upModal.replace(/\s+/g, ' ').slice(0, 50)}; כרטיסים: ${xActs.replace(/\s+/g, ' ').slice(0, 80)}; פעילות: ${xFeed}`,
    /הפרופיל שלי/.test(menu) && /חברות ודיווח/.test(menu) && /התנתקות/.test(menu) && /כהה/.test(menu) && !/חיוב|מנוי/.test(menu) && /העלאת מסמכים/.test(upModal) && /מוכן לרו״ח/.test(xActs) && /לבדיקה/.test(xActs) && xFeed >= 3, [menuShot, upShot, xShot])

  // 7. the sign-in screen
  const lx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'he-IL' }); const lp = await lx.newPage()
  await lp.goto(APP); await lp.waitForSelector('.fin-auth', { timeout: 20000 }).catch(() => {})
  const authTxt = await lp.locator('.fin-auth').innerText().catch(() => '')
  const authShot = await shot('111-sign-in', lp)
  await lp.setViewportSize({ width: 390, height: 844 }); await lp.waitForTimeout(300)
  const authOv = await lp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  const authShotM = await shot('112-sign-in-phone', lp)
  await lx.close()
  record('AUTHUI', 'מסך הכניסה', 'שני חלקים: הטופס והסיפור של המערכת; שכחתי סיסמה; בטלפון טור אחד בלי גלילה אופקית', `${authTxt.replace(/\s+/g, ' ').slice(0, 120)}; גלילה בטלפון: ${authOv}`,
    /ברוכים הבאים ל-Kurkoos Finance/.test(authTxt) && /שכחתי את הסיסמה/.test(authTxt) && /מפסיקים לרדוף אחרי חשבוניות/.test(authTxt) && authOv <= 0, [authShot, authShotM])

  // 8. moments: an upload flies into the inbox, a download drops into the tray, each ends with a toast; reduced motion keeps only the toast
  const pdfOf = (tag) => ({ name: `moment-${tag}.pdf`, mimeType: 'application/pdf', buffer: Buffer.from(`%PDF-1.4\n% moment ${tag} ${Date.now()}\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[]/Count 0>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n`) })
  await go(''); await page.waitForTimeout(800)
  await page.locator('.fin__upload').click(); await page.waitForTimeout(400)
  await page.locator('.fin-modal [data-testid=upload-input]').setInputFiles(pdfOf('a'))
  let chips = 0
  for (let i = 0; i < 40 && !chips; i++) { chips = await page.locator('.fin-moment__chip').count(); if (!chips) await page.waitForTimeout(50) }
  const flyShot = await shot('113-moment-upload')
  await page.waitForTimeout(900)
  const upToast = await page.locator('#fin-toasts').innerText().catch(() => '')
  const leftover = await page.locator('.fin-moment__chip').count()
  await page.keyboard.press('Escape'); await page.waitForTimeout(300)
  await go(`/documents/${ronirInv}`); await page.waitForTimeout(1500)
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 8000 }).catch(() => null), page.locator('.fin-viewer__bar a[aria-label="הורדה"]').click()])
  await page.waitForTimeout(250)
  const dlToast = await page.locator('#fin-toasts').innerText().catch(() => '')
  const dlShot = await shot('114-moment-download')
  await page.keyboard.press('Escape')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await go(''); await page.waitForTimeout(800)
  await page.locator('.fin__upload').click(); await page.waitForTimeout(400)
  await page.locator('.fin-modal [data-testid=upload-input]').setInputFiles(pdfOf('b'))
  let calmChips = 0; let calmToast = ''
  for (let i = 0; i < 40 && !/התקבל/.test(calmToast); i++) { calmChips += await page.locator('.fin-moment__chip').count(); calmToast = await page.locator('#fin-toasts').innerText().catch(() => ''); await page.waitForTimeout(50) }
  await page.keyboard.press('Escape'); await page.emulateMedia({ reducedMotion: null })
  record('MOMENTS', 'רגעים: העלאה, הורדה ושליחה', 'בהעלאה המסמך עף אל "חשבוניות חדשות" ונעלם בסוף; בהורדה הקובץ יורד והודעה אומרת מה ירד; כל רגע נגמר בהודעה כתובה; במצב "הפחתת תנועה" רק ההודעה, בלי תנועה',
    `עף: ${chips} ונשארו ${leftover}; הודעה: ${upToast.replace(/\s+/g, ' ').slice(0, 70)}; הורדה: ${dl ? dl.suggestedFilename() : 'לא ירד'}, ${dlToast.replace(/\s+/g, ' ').slice(0, 50)}; הפחתת תנועה: ${calmChips} תנועות, ${calmToast.replace(/\s+/g, ' ').slice(0, 40)}`,
    chips > 0 && leftover === 0 && /המסמך התקבל/.test(upToast) && /moment-a\.pdf/.test(upToast) && !!dl && /הקובץ הורד/.test(dlToast) && calmChips === 0 && /התקבל/.test(calmToast), [flyShot, dlShot])
}

// FORMATS: an email with a ZIP (an invoice and a newsletter inside), a Word invoice, an Excel payment demand and a scanned
// TIFF sent as octet-stream. Added to the fake mailbox here, at the end, so no earlier count changes.
{
  const { zipOf, docxOf, xlsxOf, tiffOf } = await import('./formats.mjs')
  await page.setContent('<div dir="rtl" style="font:16px sans-serif;padding:40px"><h1>זיפ מים בע״מ</h1><p>חשבונית מס 9901</p><p>מים לאתר, אוקטובר</p><p>סה״כ לתשלום 472.00</p></div>')
  const zipPdf = await page.pdf({ format: 'A4' })
  await page.setContent('<div style="font:16px sans-serif;padding:40px"><h1>Autumn newsletter</h1><p>New products</p></div>')
  const newsPdf = await page.pdf({ format: 'A4' })
  fs.writeFileSync(`${FIX}/bundle.zip`, zipOf([{ name: 'docs/zip-inv.pdf', data: zipPdf }, { name: 'newsletter.pdf', data: newsPdf }]))
  fs.writeFileSync(`${FIX}/scan_0099.docx`, docxOf(['דוקס הנדסה בע״מ', 'חשבונית מס 5512', 'תכנון קונסטרוקציה', 'סה״כ 1,180.00']))
  fs.writeFileSync(`${FIX}/bill.xlsx`, xlsxOf([['דרישת תשלום', 'אקסל שירותים'], ['מספר', 'DT-77'], ['סה״כ', 2360]]))
  fs.writeFileSync(`${FIX}/fax-0012.tif`, tiffOf(400, 560))
  const hashOf = (b) => crypto.createHash('sha256').update(b).digest('hex')
  const fx = JSON.parse(fs.readFileSync(`${FIX}/fixtures.json`, 'utf8'))
  const saved = JSON.stringify(fx)
  const base = fx.answers[Object.keys(fx.answers)[0]]
  const ans = (o) => ({ ...base, supplier_vat_id: '', customer_name: '', customer_vat_id: '', category: 'אחר', vat_rate: 18, ...o })
  fx.answers[hashOf(zipPdf)] = ans({ supplier_name: 'זיפ מים בע״מ', doc_number: '9901', issue_date: new Date().toISOString().slice(0, 10), amount_before_vat: 400, vat_amount: 72, total_amount: 472, description: 'מים לאתר' })
  fx.textAnswers['דוקס הנדסה'] = ans({ supplier_name: 'דוקס הנדסה בע״מ', doc_number: '5512', issue_date: new Date().toISOString().slice(0, 10), amount_before_vat: 1000, vat_amount: 180, total_amount: 1180, description: 'תכנון קונסטרוקציה' })
  fx.textAnswers['אקסל שירותים'] = ans({ doc_type: 'supplier_bill', document_class: 'payment_demand', supplier_name: 'אקסל שירותים', doc_number: 'DT-77', issue_date: new Date().toISOString().slice(0, 10), amount_before_vat: 2000, vat_amount: 360, total_amount: 2360, description: 'דרישת תשלום' })
  fx.dimAnswers['400x560'] = ans({ supplier_name: 'פקס הדפסות', doc_number: 'FX-12', issue_date: new Date().toISOString().slice(0, 10), amount_before_vat: 100, vat_amount: 18, total_amount: 118, description: 'הדפסות' })
  fx.mailboxes['invoices@kurkoos.test'].messages.push({ id: 'm20', date: new Date(Date.now() - 3600_000).toISOString(), subject: 'מסמכים', from: 'משרד <office@formats.test>', text: 'מצורפים', files: ['bundle.zip', 'scan_0099.docx', 'bill.xlsx', 'fax-0012.tif'] })
  fs.writeFileSync(`${FIX}/fixtures.json`, JSON.stringify(fx, null, 1))
  await fetch(`${FAKES}/__reset`).catch(() => {})
  const boxId = sql("select id from fin_mailboxes where email='invoices@kurkoos.test'")
  const sync = await api(await login('admin@kurkoos.test', 'Passw0rd!x'), { action: 'sync', mailbox_id: boxId })   // a fresh token: the first one has expired by now
  const got = sql("select string_agg(file_name||'='||coalesce(supplier_name,'-')||'='||split_part(file_mime,'/',2), ' | ' order by file_name) from fin_documents where email_message_id='m20'")
  const skipped = sql("select string_agg(file_name, ' | ') from fin_skipped where email_subject='מסמכים'")
  const flog = await fetch(`${FAKES}/__log`).then((r) => r.json())
  const cost = sql("select coalesce(max((details->>'cost_usd')::numeric), 0) from fin_agent_runs where agent='ocr' and started_at > now() - interval '5 minutes'")
  fs.writeFileSync(`${FIX}/fixtures.json`, saved)
  await go('/documents'); await page.waitForTimeout(900)
  const fmtShot = await shot('118-formats')
  record('FORMATS', 'ZIP, Word, Excel ו-TIFF מהמייל', 'בתוך ZIP: החשבונית נקלטת והניוזלטר מדולג בלי קריאה; Word ו-Excel נקראים כטקסט; TIFF שהגיע כ-octet-stream מזוהה לפי השם והופך לתמונה; כל קריאה של תוכן ממייל מסומנת כ"מידע ולא הוראות"; העלות נרשמת',
    `נקלטו: ${got || '—'}; דולגו: ${skipped || '—'}; עם הגנה: ${flog.guarded || 0}, בלי: ${flog.unguarded || 0}; עלות: $${cost}; סנכרון: ${JSON.stringify(sync).slice(0, 80)}`,
    /bundle\.zip › zip-inv\.pdf=זיפ מים/.test(got || '') && /scan_0099\.docx=דוקס הנדסה בע״מ=vnd\.openxmlformats-officedocument\.wordprocessingml\.document/.test(got || '') && /bill\.xlsx=אקסל שירותים/.test(got || '') && /fax-0012\.tif=פקס הדפסות=tiff/.test(got || '') && /newsletter\.pdf/.test(skipped || '') && (flog.guarded || 0) >= 4 && !(flog.unguarded || 0) && Number(cost) > 0,
    [fmtShot])
}

// SCAN: the scan engine on a big mailbox and on invoices@ side by side. 1,502 messages (1,200 of them in one week, i.e.
// three pages of 500), a 503 on listing, a message that fails once and then works, a damaged TIFF, the same invoice that
// already came to invoices@, stop and resume, a message the first pass "missed", and the completeness rule: done only
// when nothing is left; a person can mark a message that cannot be read as checked.
{
  const fx = JSON.parse(fs.readFileSync(`${FIX}/fixtures.json`, 'utf8')); const saved = JSON.stringify(fx)
  const now = Date.now(); const DAYMS = 86400_000; const iso = (t) => new Date(t).toISOString()
  fs.writeFileSync(`${FIX}/broken-scan.tif`, Buffer.concat([Buffer.from([0x49, 0x49, 0x2a, 0x00, 0xff, 0xff, 0xff, 0x7f]), crypto.randomBytes(30000)]))
  fx.mailboxes['big@kurkoos.test'] = {
    failListOnce: true,
    failGet: { 'syn-a-17': 4 },
    synthetic: { count: 300, from: iso(now - 100 * DAYMS), to: iso(now - 30 * DAYMS), dense: { count: 1200, from: iso(now - 18 * DAYMS), to: iso(now - 14 * DAYMS) } },
    messages: [
      { id: 'b1', date: iso(now - 40 * DAYMS), subject: 'חשבונית מס 4521 - טמבור', from: 'טמבור <billing@tambour.test>', text: 'מצורפת', files: ['tambour-4521.pdf'] },
      { id: 'b2', date: iso(now - 25 * DAYMS), subject: 'סריקה', from: 'סורק <scanner@kurkoos.test>', text: 'מסמך', files: ['broken-scan.tif'] },
    ],
  }
  fs.writeFileSync(`${FIX}/fixtures.json`, JSON.stringify(fx, null, 1))
  await fetch(`${FAKES}/__reset`).catch(() => {})
  sql("insert into fin_mailboxes (provider, email, status, connected_by) values ('gmail', 'big@kurkoos.test', 'active', (select user_id from fin_members where email = 'admin@kurkoos.test')) on conflict do nothing")
  sql("insert into fin_mailbox_secrets (mailbox_id, refresh_token) select id, 'rt-big@kurkoos.test' from fin_mailboxes where email = 'big@kurkoos.test' on conflict do nothing")
  const tok = await login('admin@kurkoos.test', 'Passw0rd!x')
  const bigId = sql("select id from fin_mailboxes where email = 'big@kurkoos.test'")
  const invId = sql("select id from fin_mailboxes where email = 'invoices@kurkoos.test'")
  const tambourBefore = sql("select count(*) from fin_documents where file_hash = (select file_hash from fin_documents where file_name = 'tambour-4521.pdf' limit 1)")
  // weeks are counted from this day: the edges nearest the dense days fall 19 and 12 days back, at midnight, so the
  // dense days (18 to 14 back) are inside one week whatever hour the suite runs at
  const fromDay = iso(now - 110 * DAYMS).slice(0, 10)
  const st1 = await api(tok, { action: 'scan-start', mailbox_id: bigId, from: fromDay })
  const st2 = await api(tok, { action: 'scan-start', mailbox_id: invId, from: fromDay })
  const twice = await api(tok, { action: 'scan-start', mailbox_id: bigId, from: fromDay })
  const bigJob = st1.data?.job?.id
  // one small step serves both mailboxes
  const r1 = await api(tok, { action: 'scan-run', max_segments: 2, max_messages: 40 })
  const served = new Set((r1.data?.segments || []).map((x) => x.mailbox)).size
  // stop: a run moves nothing of this mailbox; resume goes on from the same point
  await api(tok, { action: 'scan-control', job_id: bigJob, op: 'pause' })
  const itemsAtPause = sql(`select count(*) from fin_scan_items where mailbox_id = '${bigId}'`)
  await api(tok, { action: 'scan-run', max_segments: 4 })
  const itemsAfterPausedRun = sql(`select count(*) from fin_scan_items where mailbox_id = '${bigId}'`)
  const resumed = await api(tok, { action: 'scan-control', job_id: bigJob, op: 'resume' })
  if (r1.status !== 200 || resumed.status !== 200) throw new Error(`SCAN: scan-run answered ${r1.status}, resume answered ${resumed.status} ${JSON.stringify(resumed.data).slice(0, 200)}`)
  // steps of at most 450 messages: the dense week (3 pages) stops inside a page and resumes from its checkpoint
  let missedPlanted = false; let midPage = 0; let steps = 0
  for (; steps < 60; steps++) {
    const job = sql(`select status || '|' || phase from fin_scan_jobs where id = '${bigJob}'`)
    if (/^(done|incomplete)/.test(job)) break
    if (job.endsWith('|verify') && !missedPlanted) {
      // a message the first pass "did not see": the completeness pass must find it and check it
      sql(`delete from fin_scan_items where mailbox_id = '${bigId}' and message_id = 'syn-d-10'`); sql(`delete from fin_mail_seen where mailbox_id = '${bigId}' and message_id = 'syn-d-10'`)
      missedPlanted = true
    }
    const r = await api(tok, { action: 'scan-run', max_segments: 3, max_messages: 450 })
    if (sql(`select count(*) from fin_scan_segments where job_id = '${bigJob}' and page_token is not null and last_message_id is not null`) !== '0') midPage++
    if (!(r.data?.segments || []).length) sql("update fin_scan_segments set next_try_at = now() where status = 'retry'")   // the retry waits 15 minutes; the test does not
  }
  const jobBefore = sql(`select status || '|' || coalesce(report::text, '') from fin_scan_jobs where id = '${bigJob}'`)
  const dense = sql(`select pages || '|' || listed || '|' || (processed + already) from fin_scan_segments where job_id = '${bigJob}' and phase = 'scan' order by listed desc limit 1`)
  const retried = sql(`select status || '|' || attempts from fin_scan_items where mailbox_id = '${bigId}' and message_id = 'syn-a-17'`)
  const items = sql(`select string_agg(status || ':' || n, ' ') from (select status, count(*) n from fin_scan_items where mailbox_id = '${bigId}' group by 1 order by 1) x`)
  const tambourAfter = sql("select count(*) from fin_documents where file_hash = (select file_hash from fin_documents where file_name = 'tambour-4521.pdf' limit 1)")
  const flog = await fetch(`${FAKES}/__log`).then((r) => r.json())
  // the screen: the scan is not complete until the unreadable file is decided by a person
  await go('/scans'); await page.waitForTimeout(1500)
  const card = page.locator('.fin-scan', { hasText: 'big@kurkoos.test' })
  const pillBefore = await card.locator('.fin-pill').first().innerText().catch(() => '')
  await card.getByRole('button', { name: /הודעות שלא עובדו/ }).click(); await page.waitForTimeout(400)
  const scanShot = await shot('119-scan-incomplete')
  await card.getByRole('button', { name: 'סימון כנבדק' }).first().click(); await page.waitForTimeout(1500)
  const pillAfter = await page.locator('.fin-scan', { hasText: 'big@kurkoos.test' }).locator('.fin-pill').first().innerText().catch(() => '')
  const jobAfter = sql(`select status from fin_scan_jobs where id = '${bigJob}'`)
  const invJob = sql(`select status from fin_scan_jobs where id = '${st2.data?.job?.id}'`)
  const scanDoneShot = await shot('120-scan-done')
  const rep = JSON.parse(sql(`select report::text from fin_scan_jobs where id = '${bigJob}'`) || '{}')
  fs.writeFileSync(`${FIX}/fixtures.json`, saved)
  record('SCAN', 'סריקה עם בקרת שלמות: עמודים, עצירה והמשך, שתי תיבות, ניסיון חוזר, השלמה',
    '1,502 הודעות נבדקות כולן (שבוע של יותר מ-1,000 בשלושה עמודים, עם עצירה באמצע עמוד והמשך מאותה נקודה); 503 ברשימה וכשל זמני בהודעה מטופלים בניסיון חוזר; סריקה שנייה לאותה תיבה נחסמת; עצירה עוצרת; שתי תיבות מתקדמות יחד; אותה חשבונית מתיבה שנייה לא נשמרת פעמיים; בקרת השלמות מוצאת הודעה שלא נבדקה; קובץ פגום משאיר "אינה מלאה" עד שאדם מחליט, ואז "הושלמה"',
    `שירת ${served} תיבות; כפולה: ${twice.status}; בעצירה: ${itemsAtPause}→${itemsAfterPausedRun}; צעדים: ${steps}, אמצע עמוד: ${midPage}; שבוע צפוף: ${dense}; ניסיון חוזר: ${retried}; פריטים: ${items}; 503: ${flog.gmail503 || 0}; טמבור: ${tambourBefore}→${tambourAfter}; לפני: ${jobBefore.split('|')[0]} (${pillBefore}); אחרי: ${jobAfter} (${pillAfter}); invoices@: ${invJob}; דוח: נמצאו ${rep.listed}, נבדקו ${rep.checked}, נמצאו בהשלמה ${rep.missed_found}`,
    st1.status === 200 && st2.status === 200 && twice.status === 409 && served === 2 && itemsAtPause === itemsAfterPausedRun && midPage > 0 && /^3\|(\d+)\|\1$/.test(dense) && Number(dense.split('|')[1]) > 1000 && retried === 'done|2'
      && /done:1501/.test(items || '') && (flog.gmail503 || 0) >= 1 && tambourBefore === tambourAfter && /^incomplete/.test(jobBefore) && /אינה מלאה/.test(pillBefore)
      && jobAfter === 'done' && /הושלמה/.test(pillAfter) && invJob === 'done' && rep.listed === 1502 && rep.checked === 1502 && rep.missed_found >= 1,
    [scanShot, scanDoneShot])
}

// dark mode screenshot
await page.goto(`${APP}/documents`); await page.waitForTimeout(500)
await page.getByRole('button', { name: 'מצב כהה' }).click(); await page.waitForTimeout(500)
await shot('27-dark')
await page.getByRole('button', { name: 'מצב בהיר' }).click()

record('UI', 'אין שגיאות JavaScript בדפדפן', '0 שגיאות', consoleErrors.length ? consoleErrors.slice(0, 5).join(' || ') : '0', consoleErrors.length === 0)
fs.writeFileSync(`${OUT}/results.json`, JSON.stringify({ at: new Date().toISOString(), results, extra: { companiesShot, projectsShot, agentsShot, autoShot, dataShot, settingsShot } }, null, 1))
console.log(`\n${results.filter((r) => r.pass).length}/${results.length} passed`)
await browser.close()
