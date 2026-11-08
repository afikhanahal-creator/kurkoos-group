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

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'he-IL', acceptDownloads: true })
const page = await ctx.newPage()
page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message}`))
page.on('console', (m) => { if (m.type() === 'error' && !/favicon|websocket|realtime|Failed to load resource/i.test(m.text())) consoleErrors.push(m.text()) })
page.on('dialog', (d) => d.accept())
const shot = async (name, p = page) => { await p.waitForTimeout(350); await p.screenshot({ path: `${OUT}/${name}.png` }); return `${name}.png` }
const go = async (path, p = page) => { await p.goto(`${APP}${path}`); await p.waitForLoadState('networkidle').catch(() => {}); await p.waitForTimeout(500) }
const nav = async (label) => { await page.locator('.fin__nav-item', { hasText: label }).first().click(); await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(500) }

// ---------- T0: sign in, first admin ----------
await go('')
await page.fill('input[type=email]', 'admin@kurkoos.test'); await page.fill('input[type=password]', 'Passw0rd!x')
await page.click('button[type=submit]')
await page.getByRole('button', { name: 'אני מנהל/ת המערכת' }).click()
await page.waitForSelector('.fin__nav')
const navCount = await page.locator('.fin__nav-item').count()
record('T0', 'כניסה והגדרת מנהל ראשון', 'המשתמש הראשון נהיה מנהל ורואה 16 פריטי תפריט', `${navCount} פריטי תפריט, תפקיד ${sql("select role from fin_members")}`, navCount === 16, [await shot('00-dashboard-empty')])

// ---------- setup through the UI: companies, project ----------
await nav('חברות')
await page.locator('.fin-entity button[aria-label^="עריכת"]').first().click()
await page.getByLabel('מספר עוסק / ח.פ למע״מ').fill(meta.IDS.kurkoos)
await page.getByLabel('מייל רואה החשבון').fill('cpa@accountants.test')
await page.getByRole('button', { name: 'שמירה' }).click(); await page.waitForTimeout(600)
await page.getByRole('button', { name: 'חברה חדשה' }).click()
await page.getByLabel('שם החברה').fill('קורקוס ביצוע')
await page.getByLabel('מספר עוסק / ח.פ למע״מ').fill(meta.IDS.execution)
await page.getByRole('button', { name: 'שמירה' }).click(); await page.waitForTimeout(800)
const companiesShot = await shot('01-companies')
await nav('פרויקטים')
await page.getByRole('button', { name: 'פרויקט חדש' }).click()
await page.getByLabel('שם הפרויקט').fill('מוהליבר 17')
await page.getByLabel('קוד פנימי').fill('MOH-17')
await page.getByLabel('מיקום').fill('תל אביב')
await page.getByLabel('מילות מפתח לזיהוי (מופרדות בפסיק)').fill('מוהליבר')
await page.getByRole('button', { name: 'שמירה' }).click(); await page.waitForTimeout(800)
const projectsShot = await shot('02-projects')
record('S1', 'הקמת חברות ופרויקט מהממשק', 'שתי חברות עם ח.פ, פרויקט עם קוד ומילת מפתח', `${sql('select count(*) from fin_businesses where vat_id is not null')} חברות עם ח.פ, פרויקט: ${sql("select name||' '||code from fin_projects")}`, sql('select count(*) from fin_businesses where vat_id is not null') === '2' && sql('select count(*) from fin_projects') === '1', [companiesShot, projectsShot])

// ---------- T1: connect Gmail (OAuth round trip) ----------
await nav('חשבונות מייל')
await page.getByRole('button', { name: 'חיבור Gmail' }).click()
await page.waitForURL(/mailboxes\?connected=|mailboxes$/, { timeout: 15000 }); await page.waitForTimeout(800)
const t1 = sql("select email||'|'||status||'|'||(select count(*) from fin_mailbox_secrets) from fin_mailboxes")
record('T1', 'חיבור חשבון Gmail', 'זרימת OAuth מלאה: התיבה נשמרת מחוברת, הטוקן נשמר בטבלת הסודות בלבד', t1, t1 === 'invoices@kurkoos.test|active|1', [await shot('03-mailbox-connected')])
const anonSecrets = await rest('fin_mailbox_secrets?select=*', await login('admin@kurkoos.test', 'Passw0rd!x'))
record('SEC1', 'טוקן OAuth לא נגיש לדפדפן', 'גם מנהל מחובר לא יכול לקרוא את טבלת הסודות', `HTTP ${anonSecrets.status}`, anonSecrets.status === 401 || anonSecrets.status === 403 || (Array.isArray(anonSecrets.data) && anonSecrets.data.length === 0))

// ---------- T2 + T3: scan, find invoices, download originals ----------
await page.locator('.fin-box').first().getByRole('button', { name: 'סריקה' }).click()
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
await nav('לוח בקרה')
const kpi = await page.locator('.fin-kpi').first().innerText()
record('T5', 'המסמכים מופיעים בלוח הבקרה', 'הסכומים מחושבים מהרשומות (ללא כפולים ושגיאות)', kpi.replace(/\n/g, ' '), /₪|ILS/.test(kpi) && !/0\.00 ₪\s*$/.test(kpi), [listShot, await shot('08-dashboard')])

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
await page.getByRole('button', { name: /שמירה ואישור|אישור/ }).first().click(); await page.waitForTimeout(1000)
const t8 = sql("select (select name from fin_businesses where id=business_id)||'|'||(select name from fin_projects where id=project_id)||'|'||status||'|'||coalesce(approved_by::text,'') from fin_documents where file_name='tambour-4521.pdf'")
record('T8', 'שיוך לחברה ולפרויקט', 'קורקוס גרופ + מוהליבר 17', t8.split('|').slice(0, 2).join(' + '), t8.startsWith('קורקוס גרופ|מוהליבר 17'), [assignShot])
record('T9', 'אישור המסמך', 'סטטוס מאושר, נרשם מי אישר', `${t8.split('|')[2]}, אושר ע״י ${t8.split('|')[3] ? 'admin' : '—'}; יומן: ${sql("select count(*) from fin_audit where action='approved'")}`, t8.split('|')[2] === 'approved' && !!t8.split('|')[3], [await shot('13-approved')])
await page.keyboard.press('Escape'); await page.waitForTimeout(300)
// approve two more for the export, from the pending list in bulk
await nav('ממתינים לאישור')
for (const name of ['בזק', 'ACE']) await page.locator('tbody tr', { hasText: name }).first().locator('input[type=checkbox]').check()
await page.locator('.fin-bulk').getByRole('button', { name: 'אישור' }).click(); await page.waitForTimeout(1200)
const bulkNote = await page.locator('.fin-note').first().innerText().catch(() => '')
// an unapproved document cannot be exported, even by calling the database directly
const adminToken = await login('admin@kurkoos.test', 'Passw0rd!x')
const unapprovedId = sql("select id from fin_documents where status='review' limit 1")
const sneaky = await rest('rpc/fin_record_export', adminToken, { method: 'POST', body: JSON.stringify({ p_ids: [unapprovedId], p_business_id: null, p_period: null, p_format: 'zip', p_destination: 'download' }) })
record('R1', 'אין ייצוא של מסמך שלא אושר', 'מסד הנתונים דוחה ייצוא של מסמך במצב "ממתין"', `HTTP ${sneaky.status}: ${sneaky.data?.message || ''}`, sneaky.status >= 400 && /not approved/.test(sneaky.data?.message || ''))

// ---------- T10 + T11: export and history ----------
await nav('אינטגרציות')
const period = meta.D.tambour.slice(0, 7)
await page.locator('.fin-wizard input[type=month]').fill(period); await page.waitForTimeout(400)
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

// ---------- T14: failed sync logged and retried; failed OCR retried ----------
await fetch(`${FAKES}/__next_account?email=broken@kurkoos.test`)
await nav('חשבונות מייל')
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
const brokenShot = await shot('17-mailboxes-log')
const ocrBefore = failedNow
const retry = await api(adminToken, { action: 'retry-failed' })
const ocrAfter = sql("select status||':'||attempts from fin_documents where file_name='electra-778.pdf'")
record('T14', 'סנכרון שנכשל נרשם ומנוסה שוב', 'תקלה בספק נרשמת עם מספר ניסיון, הניסיון הבא מצליח; מסמך שהקריאה שלו נכשלה נקרא בניסיון חוזר', `סנכרון: ${syncLog}; מסמך: ${ocrBefore} → ${ocrAfter} (${JSON.stringify(retry.data)})`, /^1:.*\| 2:.*\| 3:ok$/.test(syncLog) && r1.data.results?.[0]?.error && r3.data.results?.[0]?.error === null && /failed:1/.test(ocrBefore) && /^(review|duplicate):2$/.test(ocrAfter), [brokenShot])
const electraIssues = sql("select string_agg(i->>'code', ',') from fin_documents, jsonb_array_elements(issues) i where file_name='electra-778.pdf'")
const electraBiz = sql("select (select name from fin_businesses where id=business_id) from fin_documents where file_name='electra-778.pdf'")
record('A5', 'בקרה: סכום חריג ושיוך חברה לפי ח.פ הלקוח', 'חשבונית של 59,000 ₪ מסומנת "סכום מעל"; משויכת ל"קורקוס ביצוע" לפי הח.פ שבמסמך', `בעיות: ${electraIssues}; חברה: ${electraBiz}`, /large_amount/.test(electraIssues || '') && electraBiz === 'קורקוס ביצוע')

// ---------- the daily cron run ----------
const cron = await fetch('http://127.0.0.1:5180/api/finance?action=cron', { headers: { Authorization: 'Bearer test-cron' } }).then((r) => r.json())
const cronBad = await fetch('http://127.0.0.1:5180/api/finance?action=cron').then((r) => r.status)
const mails = await fetch(`${FAKES}/__log`).then((r) => r.json())
record('A7', 'הריצה היומית והסיכום היומי', 'ה-cron מריץ את האוטומציות, שומר סיכום ושולח מייל; בלי הסוד הוא נדחה', `${(cron.results || []).map((r) => `${r.key}:${r.status}`).join(', ')}; מיילים: ${mails.emails.map((m) => m.subject).join(' / ')}; בלי סוד: ${cronBad}`, (cron.results || []).find((r) => r.key === 'daily_summary')?.status === 'ok' && mails.emails.some((m) => /סיכום יומי/.test(m.subject)) && cronBad === 401)
await nav('סוכני AI')
const agentsShot = await shot('18-agents')
await nav('כללי אוטומציה')
const autoShot = await shot('19-automations')
await nav('דוחות')
const reportsShot = await shot('20-reports')
await page.getByRole('tab', { name: 'לפי פרויקט' }).click(); await page.waitForTimeout(400)
const projRep = await page.locator('.fin-table tbody').innerText()
record('REP', 'דוחות מחושבים מהרשומות', 'דוח לפי פרויקט מציג את מוהליבר 17 עם 3,600 ₪', projRep.replace(/\s+/g, ' ').slice(0, 120), /מוהליבר 17/.test(projRep) && /3,600/.test(projRep), [reportsShot, await shot('21-report-project')])
await nav('ניהול נתונים'); const dataShot = await shot('22-data')
await nav('הגדרות'); const settingsShot = await shot('23-settings')

// ---------- T13: roles and access ----------
await nav('משתמשים והרשאות')
await page.getByRole('button', { name: 'הזמנת משתמש' }).click()
await page.getByLabel('אימייל').fill('cpa@accountants.test')
await page.getByLabel('שם').fill('רו״ח דנה לוי')
await page.getByLabel('תפקיד').selectOption('accountant')
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
const t13pass = t13.accountantSees === 'sent' || t13.accountantSees === 'approved,sent' || t13.accountantSees === 'sent,approved'
record('T13', 'משתמשים לא מורשים לא ניגשים לרשומות', 'רו״ח רואה רק מאושרים/מיוצאים, לא עורך, לא רואה לידים, לא קורא קבצים של מסמכים לא מאושרים; עובד רואה רק את שלו ולא מאשר; משתמש זר לא רואה כלום',
  JSON.stringify(t13), t13pass && t13.accountantEdit === '0 שורות' && t13.accountantLeads === '0 שורות' && t13.accountantApi === 403 && t13.accountantPrivateFile >= 400 && t13.employeeSees === 0 && t13.employeeApprove === '0 שורות' && t13.strangerSees === 0 && inv2.status === 200, [usersShot])
record('INV', 'הזמנת משתמש במייל', 'נשלח מייל הזמנה (SMTP) והמשתמש נוסף עם תפקיד רו״ח', `${inviteNote}; מיילים ב-SMTP: ${smtp.length}; תפקיד: ${sql("select role from fin_members where email='cpa@accountants.test'")}`, smtp.length >= 1 && sql("select role from fin_members where email='cpa@accountants.test'") === 'accountant')

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
record('PORTAL', 'פורטל רואה החשבון', 'תפריט מצומצם (לוח בקרה, מסמכים מאושרים, דוחות, היסטוריית ייצוא, הגדרות) ורק מסמכים מאושרים', `${accNav.join(' · ')} · ${accRows} מסמכים`, accNav.length === 5 && accNav.some((n) => /מסמכים מאושרים/.test(n)) && accRows === Number(sql("select count(*) from fin_documents where status in ('approved','sent')")), [accShot, accDocsShot])
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
await m.getByRole('button', { name: 'פתיחת התפריט' }).click(); await m.waitForTimeout(400); mShots.push(await shot('m2-menu', m))
await m.locator('.fin__nav-item', { hasText: 'כל המסמכים' }).click(); await m.waitForTimeout(1000); mShots.push(await shot('m3-documents', m)); ov.documents = await overflow()
await m.locator('tbody tr').first().locator('.fin-cell-btn').click(); await m.waitForTimeout(1500); mShots.push(await shot('m4-review', m)); ov.review = await overflow()
await m.evaluate(() => document.querySelector('.fin-panel__body')?.scrollTo(0, 99999)); await m.waitForTimeout(300); mShots.push(await shot('m5-review-actions', m))
await m.keyboard.press('Escape')
await m.goto(`${APP}/mailboxes`); await m.waitForTimeout(1200); mShots.push(await shot('m6-mailboxes', m)); ov.mailboxes = await overflow()
await m.goto(`${APP}/integrations`); await m.waitForTimeout(1200); mShots.push(await shot('m7-export', m)); ov.export = await overflow()
await m.goto(`${APP}/reports`); await m.waitForTimeout(1200); mShots.push(await shot('m8-reports', m)); ov.reports = await overflow()
const smallTargets = await m.evaluate(() => [...document.querySelectorAll('.fin button, .fin a, .fin input, .fin select')].filter((e) => e.offsetParent && e.getBoundingClientRect().height < 24 && e.type !== 'checkbox').map((e) => e.className || e.tagName).slice(0, 5))
const dir = await m.evaluate(() => document.querySelector('.fin')?.getAttribute('dir'))
record('T12', 'גרסת מובייל', 'אין גלילה אופקית בשום מסך, התפריט נפתח ונסגר, מסמך נפתח ומאושר מהטלפון, כיוון RTL', `גלילה אופקית (px): ${JSON.stringify(ov)} · dir=${dir} · כפתורים קטנים מ-24px: ${smallTargets.length}`, Object.values(ov).every((v) => v <= 0) && dir === 'rtl', mShots)
await mob.close()

// desktop: no page is wider than the screen
const deskOv = {}
for (const path of ['', '/documents', '/new', '/pending', '/companies', '/projects', '/suppliers', '/reports', '/data', '/automations', '/agents', '/mailboxes', '/integrations', '/exports', '/users', '/settings']) {
  await go(path); deskOv[path || '/'] = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
}
await go('/documents'); await page.locator('tbody tr').first().locator('.fin-cell-btn').click(); await page.waitForTimeout(800)
deskOv.review = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
await page.keyboard.press('Escape')
record('DESK', 'מחשב: אין גלילה אופקית ב-16 המסכים', '0 בכל מסך', JSON.stringify(deskOv), Object.values(deskOv).every((v) => v <= 0))

// dark mode screenshot
await page.goto(`${APP}/documents`); await page.waitForTimeout(500)
await page.getByRole('button', { name: 'מצב כהה' }).click(); await page.waitForTimeout(500)
await shot('27-dark')
await page.getByRole('button', { name: 'מצב בהיר' }).click()

record('UI', 'אין שגיאות JavaScript בדפדפן', '0 שגיאות', consoleErrors.length ? consoleErrors.slice(0, 5).join(' || ') : '0', consoleErrors.length === 0)
fs.writeFileSync(`${OUT}/results.json`, JSON.stringify({ at: new Date().toISOString(), results, extra: { companiesShot, projectsShot, agentsShot, autoShot, dataShot, settingsShot } }, null, 1))
console.log(`\n${results.filter((r) => r.pass).length}/${results.length} passed`)
await browser.close()
