// Renders the test invoices (real PDF and PNG files) and the table of what Claude "reads" from each.
import { createRequire } from 'node:module'
import crypto from 'node:crypto'
import fs from 'node:fs'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright')

const OUT = process.env.FIN_FIXTURES || '/var/tmp/finfix'
fs.mkdirSync(OUT, { recursive: true })
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(`${OUT}/${f}`)).digest('hex')

/* a valid Israeli company number: 8 digits + check digit */
export function validId(prefix8) {
  for (let d = 0; d < 10; d++) {
    const s = `${prefix8}${d}`; let sum = 0
    for (let i = 0; i < 9; i++) { let x = Number(s[i]) * ((i % 2) + 1); if (x > 9) x -= 9; sum += x }
    if (sum % 10 === 0) return s
  }
}
export const IDS = { granite: validId('51377777'), hasharon: validId('51366666'), iec: validId('52000046'), cafe: validId('51333333'), meta: validId('51577777'), office: validId('51488888'), soleh: validId('52000121'), henrietta: validId('51699999'), tambour: validId('52003187'), bezeq: validId('52003193'), paz: validId('51021605'), electra: validId('51345678'), ace: validId('52003841'), kurkoos: validId('51500000'), execution: validId('51500001') }

const today = new Date()
const iso = (daysAgo) => { const d = new Date(today); d.setDate(d.getDate() - daysAgo); return d.toISOString().slice(0, 10) }
const D = { photo: iso(0), old: iso(150), wa: iso(1), tambour: iso(6), bezeq: iso(5), paz: iso(4), electra: iso(3), ace: iso(2), meta: iso(2), office: iso(1), bg: iso(1), soleh: iso(1) }

const invoice = ({ supplier, id, title, number, date, lines, before, vat, total, customer, customerId, note = '' }) => `<!doctype html><html dir="rtl" lang="he"><head><meta charset="utf-8"><style>
body{font-family:'DejaVu Sans',Arial,sans-serif;margin:48px;color:#222}h1{color:#a00;margin:0}table{width:100%;border-collapse:collapse;margin:20px 0}td,th{border:1px solid #999;padding:8px;text-align:right}.t{font-size:22px;font-weight:bold}</style></head><body>
<h1>${supplier}</h1><p>ע.מ ${id}</p><h2>${title} ${number}</h2><p>תאריך: ${date}</p><p>לכבוד: ${customer} · ח.פ ${customerId}</p>
<table><tr><th>פריט</th><th>סכום</th></tr>${lines.map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join('')}</table>
<p>סה״כ לפני מע״מ: ${before}</p><p>מע״מ 18%: ${vat}</p><p class="t">סה״כ לתשלום: ₪${total}</p><p>${note}</p></body></html>`

const answer = (o) => ({
  is_financial_document: true, doc_type: 'invoice', supplier_name: '', supplier_vat_id: '', customer_name: 'קורקוס גרופ', customer_vat_id: IDS.kurkoos,
  doc_number: '', issue_date: '', due_date: '', payment_date: '', currency: 'ILS', amount_before_vat: null, vat_amount: null, total_amount: null, vat_rate: 18,
  description: '', category: 'אחר', payment_method: '', project_hint: '', notes: '', supplier_trading_name: '', discount_amount: null, extra_charges: null, page_count: 1, totals_text: '',
  quality: { readable: true, blurry: false, cropped: false, rotated: false, missing_pages: false, handwritten: false },
  field_confidence: { supplier_name: 0.98, supplier_vat_id: 0.97, doc_type: 0.95, doc_number: 0.97, issue_date: 0.96, payment_date: 0.9, amount_before_vat: 0.95, vat_amount: 0.95, total_amount: 0.97, currency: 0.99, category: 0.85, description: 0.9, customer: 0.95 },
  ...o,
})

const browser = await chromium.launch()
const page = await browser.newPage()
async function pdf(name, html) { await page.setContent(html); await page.pdf({ path: `${OUT}/${name}`, format: 'A4' }) }
async function png(name, html) { await page.setViewportSize({ width: 700, height: 900 }); await page.setContent(html); await page.screenshot({ path: `${OUT}/${name}` }) }

await pdf('tambour-4521.pdf', invoice({ supplier: 'טמבור בע״מ', id: IDS.tambour, title: 'חשבונית מס', number: '4521', date: D.tambour, lines: [['צבע אקרילי 18 ל׳ ×12, אתר מוהליבר 17', '3,050.85']], before: '3,050.85', vat: '549.15', total: '3,600.00', customer: 'קורקוס גרופ', customerId: IDS.kurkoos }))
await pdf('tambour-4521-copy.pdf', invoice({ supplier: 'טמבור בע״מ', id: IDS.tambour, title: 'חשבונית מס (העתק)', number: '4521', date: D.tambour, lines: [['צבע אקרילי 18 ל׳ ×12, אתר מוהליבר 17', '3,050.85']], before: '3,050.85', vat: '549.15', total: '3,600.00', customer: 'קורקוס גרופ', customerId: IDS.kurkoos, note: 'העתק נאמן למקור' }))
await pdf('bezeq-oct.pdf', invoice({ supplier: 'בזק החברה הישראלית לתקשורת', id: IDS.bezeq, title: 'חשבונית מס/קבלה', number: '88-120394', date: D.bezeq, lines: [['קו אינטרנט עסקי', '500.00']], before: '500.00', vat: '90.00', total: '590.00', customer: 'קורקוס גרופ', customerId: IDS.kurkoos }))
await pdf('brochure.pdf', '<html dir="rtl"><body style="font-family:sans-serif;padding:60px"><h1>קטלוג סתיו 2026</h1><p>מבצעים על ריהוט גן!</p></body></html>')
await pdf('electra-778.pdf', invoice({ supplier: 'אלקטרה בנייה בע״מ', id: IDS.electra, title: 'חשבונית מס', number: '778', date: D.electra, lines: [['עבודות חשמל, שלב ב׳', '50,000.00']], before: '50,000.00', vat: '9,000.00', total: '59,000.00', customer: 'קורקוס ביצוע', customerId: IDS.execution }))
await png('ace-receipt.png', invoice({ supplier: 'ACE', id: IDS.ace, title: 'קבלה', number: '5501', date: D.ace, lines: [['מקדחה', '200.00']], before: '200.00', vat: '36.00', total: '236.00', customer: '', customerId: '' }))
await pdf('meta-ads.pdf', invoice({ supplier: 'Meta Platforms Ireland Ltd', id: IDS.meta, title: 'חשבונית מס', number: 'FBADS-90211', date: D.meta, lines: [['Facebook & Instagram ads, campaign "וילות השרון"', '4,000.00']], before: '4,000.00', vat: '720.00', total: '4,720.00', customer: 'קורקוס גרופ', customerId: IDS.kurkoos }))
await pdf('office-depot.pdf', invoice({ supplier: 'אופיס דיפו ישראל', id: IDS.office, title: 'חשבונית מס/קבלה', number: '330178', date: D.office, lines: [['כסאות משרד ×4, נייר, טונר', '2,500.00']], before: '2,500.00', vat: '450.00', total: '2,950.00', customer: 'קורקוס גרופ', customerId: IDS.kurkoos }))
await pdf('benguryon-blocks.pdf', invoice({ supplier: 'טמבור בע״מ', id: IDS.tambour, title: 'חשבונית מס', number: '4602', date: D.bg, lines: [['בלוקים ומלט לפרויקט BG-17 בן גוריון 17 יהוד', '10,000.00']], before: '10,000.00', vat: '1,800.00', total: '11,800.00', customer: 'קורקוס גרופ', customerId: IDS.kurkoos }))
await pdf('soleh-boneh.pdf', invoice({ supplier: 'סולל בונה תשתיות', id: IDS.soleh, title: 'חשבונית מס', number: 'SB-5521', date: D.soleh, lines: [['ייעוץ הנדסי, פרויקט HS-22', '20,000.00']], before: '20,000.00', vat: '3,600.00', total: '23,600.00', customer: 'הנרייטה סולד 22 בע״מ', customerId: IDS.henrietta }))
await pdf('old-invoice.pdf', invoice({ supplier: 'חברת החשמל לישראל', id: IDS.iec, title: 'חשבונית מס/קבלה', number: 'IEC-20419', date: D.old, lines: [['חשמל משרד, חודשיים', '1,200.00']], before: '1,200.00', vat: '216.00', total: '1,416.00', customer: 'קורקוס גרופ', customerId: IDS.kurkoos }))
await png('wa-receipt.png', invoice({ supplier: 'קפה לנדוור', id: IDS.cafe, title: 'חשבונית מס/קבלה', number: '88123', date: D.wa, lines: [['ארוחת עבודה, פגישת יזמים', '250.00']], before: '250.00', vat: '45.00', total: '295.00', customer: 'קורקוס גרופ', customerId: IDS.kurkoos }))
// the WhatsApp café receipt arriving again by email: once with its number (a certain duplicate), once without (suspected)
await pdf('cafe-dup-exact.pdf', invoice({ supplier: 'קפה לנדוור', id: IDS.cafe, title: 'חשבונית מס/קבלה (נשלח במייל)', number: '88123', date: D.wa, lines: [['ארוחת עבודה, פגישת יזמים', '250.00']], before: '250.00', vat: '45.00', total: '295.00', customer: 'קורקוס גרופ', customerId: IDS.kurkoos }))
await pdf('cafe-dup-fuzzy.pdf', invoice({ supplier: 'קפה לנדוור', id: IDS.cafe, title: 'קבלה', number: '', date: D.wa, lines: [['ארוחת עבודה', '250.00']], before: '250.00', vat: '45.00', total: '295.00', customer: 'קורקוס גרופ', customerId: IDS.kurkoos }))
await pdf('cafe-second.pdf', invoice({ supplier: 'קפה לנדוור', id: IDS.cafe, title: 'חשבונית מס/קבלה', number: '88124', date: D.wa, lines: [['ארוחת עבודה, פגישה שנייה', '250.00']], before: '250.00', vat: '45.00', total: '295.00', customer: 'קורקוס גרופ', customerId: IDS.kurkoos }))
// a file whose reading fails three times in a row (one full failed attempt), then works
await pdf('flaky.pdf', invoice({ supplier: 'גרניט הנדסה', id: IDS.granite, title: 'חשבונית מס', number: 'GR-12', date: D.office, lines: [['שיש למטבח, דירה 4', '3,000.00']], before: '3,000.00', vat: '540.00', total: '3,540.00', customer: 'קורקוס גרופ', customerId: IDS.kurkoos }))
async function photo(name, html) { const p2 = await browser.newPage({ viewport: { width: 1200, height: 1600 }, deviceScaleFactor: 2 }); await p2.setContent(`<div style="background:#c9c4b8;padding:60px;min-height:1600px;box-sizing:border-box"><div style="background:#fff;box-shadow:0 8px 30px rgba(0,0,0,.25);transform:rotate(-1.2deg)">${html}</div></div>`); await p2.screenshot({ path: `${OUT}/${name}`, type: 'jpeg', quality: 92 }); await p2.close() }
await photo('receipt-photo.jpg', invoice({ supplier: 'חומרי בניין השרון', id: IDS.hasharon, title: 'חשבונית מס/קבלה', number: '24-7781', date: D.photo, lines: [['ברגים, דיבלים ומקדחים לאתר מוהליבר 17', '640.00']], before: '640.00', vat: '115.20', total: '755.20', customer: 'קורקוס גרופ', customerId: IDS.kurkoos }))
await browser.close()

const H = { second: sha('cafe-second.pdf'), dupExact: sha('cafe-dup-exact.pdf'), dupFuzzy: sha('cafe-dup-fuzzy.pdf'), flaky: sha('flaky.pdf'), old: sha('old-invoice.pdf'), wa: sha('wa-receipt.png'), meta: sha('meta-ads.pdf'), office: sha('office-depot.pdf'), bg: sha('benguryon-blocks.pdf'), soleh: sha('soleh-boneh.pdf'), tambour: sha('tambour-4521.pdf'), copy: sha('tambour-4521-copy.pdf'), bezeq: sha('bezeq-oct.pdf'), brochure: sha('brochure.pdf'), electra: sha('electra-778.pdf'), ace: sha('ace-receipt.png') }
const at = (d, h = 9) => `${d}T0${h}:15:00Z`
const fixtures = {
  answers: {
    [H.second]: answer({ doc_type: 'invoice_receipt', supplier_name: 'קפה לנדוור', supplier_vat_id: IDS.cafe, doc_number: '88124', issue_date: D.wa, amount_before_vat: 250, vat_amount: 45, total_amount: 295, description: 'ארוחת עבודה', category: 'אחר' }),
    [H.dupExact]: answer({ doc_type: 'invoice_receipt', supplier_name: 'קפה לנדוור', supplier_vat_id: IDS.cafe, doc_number: '88123', issue_date: D.wa, amount_before_vat: 250, vat_amount: 45, total_amount: 295, description: 'ארוחת עבודה', category: 'אחר' }),
    [H.dupFuzzy]: answer({ doc_type: 'receipt', supplier_name: 'קפה לנדוור', supplier_vat_id: IDS.cafe, doc_number: '', issue_date: D.wa, amount_before_vat: 250, vat_amount: 45, total_amount: 295, description: 'ארוחת עבודה', category: 'אחר' }),
    [H.flaky]: answer({ supplier_name: 'גרניט הנדסה', supplier_vat_id: IDS.granite, doc_number: 'GR-12', issue_date: D.office, amount_before_vat: 3000, vat_amount: 540, total_amount: 3540, description: 'שיש למטבח', category: 'חומרי בניין' }),
    [H.old]: answer({ doc_type: 'invoice_receipt', supplier_name: 'חברת החשמל לישראל', supplier_vat_id: IDS.iec, doc_number: 'IEC-20419', issue_date: D.old, amount_before_vat: 1200, vat_amount: 216, total_amount: 1416, description: 'חשמל משרד', category: 'חשמל, מים וארנונה' }),
    [H.wa]: answer({ doc_type: 'invoice_receipt', supplier_name: 'קפה לנדוור', supplier_vat_id: IDS.cafe, doc_number: '88123', issue_date: D.wa, amount_before_vat: 250, vat_amount: 45, total_amount: 295, description: 'ארוחת עבודה', category: 'כיבוד ואירוח', payment_method: 'אשראי' }),
    [H.meta]: answer({ supplier_name: 'Meta Platforms Ireland Ltd', supplier_vat_id: IDS.meta, doc_number: 'FBADS-90211', issue_date: D.meta, amount_before_vat: 4000, vat_amount: 720, total_amount: 4720, description: 'פרסום בפייסבוק ואינסטגרם', category: 'פרסום ושיווק', supplier_website: 'www.facebook.com', field_confidence: { supplier_name: 0.99, supplier_vat_id: 0.97, doc_type: 0.95, doc_number: 0.98, issue_date: 0.97, payment_date: 0.9, amount_before_vat: 0.96, vat_amount: 0.96, total_amount: 0.98, currency: 0.99, category: 0.91, description: 0.9, customer: 0.95 } }),
    [H.office]: answer({ doc_type: 'invoice_receipt', supplier_name: 'אופיס דיפו ישראל', supplier_vat_id: IDS.office, doc_number: '330178', issue_date: D.office, amount_before_vat: 2500, vat_amount: 450, total_amount: 2950, description: 'כסאות משרד וציוד', category: 'ציוד משרדי', supplier_email: 'billing@officedepot.test', supplier_phone: '03-5551234', supplier_address: 'הברזל 3, תל אביב', field_confidence: { supplier_name: 0.97, supplier_vat_id: 0.95, doc_type: 0.95, doc_number: 0.97, issue_date: 0.96, payment_date: 0.9, amount_before_vat: 0.95, vat_amount: 0.95, total_amount: 0.97, currency: 0.99, category: 0.88, description: 0.9, customer: 0.95 } }),
    [H.bg]: answer({ supplier_name: 'טמבור בע״מ', supplier_vat_id: IDS.tambour, doc_number: '4602', issue_date: D.bg, amount_before_vat: 10000, vat_amount: 1800, total_amount: 11800, description: 'בלוקים ומלט', category: 'חומרי בניין', project_hint: 'BG-17 בן גוריון 17 יהוד', field_confidence: { supplier_name: 0.98, supplier_vat_id: 0.97, doc_type: 0.95, doc_number: 0.97, issue_date: 0.96, payment_date: 0.9, amount_before_vat: 0.95, vat_amount: 0.95, total_amount: 0.97, currency: 0.99, category: 0.86, description: 0.9, customer: 0.95 } }),
    [H.soleh]: answer({ supplier_name: 'סולל בונה תשתיות', supplier_vat_id: IDS.soleh, customer_name: 'הנרייטה סולד 22 בע״מ', customer_vat_id: IDS.henrietta, doc_number: 'SB-5521', issue_date: D.soleh, amount_before_vat: 20000, vat_amount: 3600, total_amount: 23600, description: 'ייעוץ הנדסי', category: 'שירותים מקצועיים', project_hint: 'HS-22' }),
    [H.tambour]: answer({ supplier_name: 'טמבור בע״מ', supplier_vat_id: IDS.tambour, doc_number: '4521', issue_date: D.tambour, amount_before_vat: 3050.85, vat_amount: 549.15, total_amount: 3600, description: 'צבע אקרילי לאתר', category: 'חומרי בניין', project_hint: 'מוהליבר 17' }),
    [H.copy]: answer({ supplier_name: 'טמבור בע״מ', supplier_vat_id: IDS.tambour, doc_number: '4521', issue_date: D.tambour, amount_before_vat: 3050.85, vat_amount: 549.15, total_amount: 3600, description: 'צבע אקרילי לאתר (העתק)', category: 'חומרי בניין' }),
    [H.bezeq]: answer({ doc_type: 'invoice_receipt', supplier_name: 'בזק', supplier_vat_id: IDS.bezeq, doc_number: '88-120394', issue_date: D.bezeq, amount_before_vat: 500, vat_amount: 90, total_amount: 590, description: 'אינטרנט עסקי', category: 'תקשורת ואינטרנט', payment_method: 'הוראת קבע' }),
    [H.electra]: answer({ supplier_name: 'אלקטרה בנייה', supplier_vat_id: IDS.electra, customer_name: 'קורקוס ביצוע', customer_vat_id: IDS.execution, doc_number: '778', issue_date: D.electra, amount_before_vat: 50000, vat_amount: 9000, total_amount: 59000, description: 'עבודות חשמל שלב ב׳', category: 'קבלני משנה' }),
    [H.ace]: answer({ doc_type: 'receipt', supplier_name: 'ACE', supplier_vat_id: IDS.ace, customer_name: '', customer_vat_id: '', doc_number: '5501', issue_date: D.ace, amount_before_vat: 200, vat_amount: 36, total_amount: 263, description: 'מקדחה', category: 'ציוד וכלים', field_confidence: { supplier_name: 0.99, supplier_vat_id: 0.9, doc_type: 0.9, doc_number: 0.93, issue_date: 0.92, payment_date: 0.5, amount_before_vat: 0.88, vat_amount: 0.86, total_amount: 0.58, currency: 0.99, category: 0.8, description: 0.9, customer: 0.4 } }),
  },
  // a resized phone photo has new bytes: the stand-in recognises it by its pixel size (1650 x 2200 after preparing)
  dimAnswers: {
    '1650x2200': answer({ doc_type: 'invoice_receipt', supplier_name: 'חומרי בניין השרון', supplier_trading_name: 'השרון', supplier_vat_id: IDS.hasharon, doc_number: '24-7781', issue_date: D.photo, amount_before_vat: 640, vat_amount: 115.2, total_amount: 755.2, description: 'ברגים ודיבלים', category: 'חומרי בניין', project_hint: 'מוהליבר 17', quality: { readable: true, blurry: true, cropped: false, rotated: false, missing_pages: false, handwritten: false }, field_confidence: { supplier_name: 0.95, supplier_vat_id: 0.9, doc_type: 0.92, doc_number: 0.8, issue_date: 0.9, payment_date: 0.5, amount_before_vat: 0.88, vat_amount: 0.86, total_amount: 0.8, currency: 0.99, category: 0.8, description: 0.8, customer: 0.9 } }),
  },
  // the second, focused reading (validation layer 3): what is really printed
  verifyAnswers: {
    [H.ace]: { supplier_vat_id: IDS.ace, doc_number: '5501', issue_date: D.ace, amount_before_vat: 200, vat_amount: 36, total_amount: 236 },
    'dims:1650x2200': { supplier_vat_id: IDS.hasharon, doc_number: '24-7781', issue_date: D.photo, amount_before_vat: 640, vat_amount: 115.2, total_amount: 755.2 },
  },
  textAnswers: {
    'פז חברת נפט': answer({ doc_type: 'invoice_receipt', supplier_name: 'פז חברת נפט', supplier_vat_id: IDS.paz, doc_number: '7731-22', issue_date: D.paz, amount_before_vat: 349.41, vat_amount: 62.89, total_amount: 412.3, description: 'דלק 95', category: 'רכב ודלק', payment_method: 'אשראי' }),
  },
  notFinancial: answer({ is_financial_document: false, doc_type: 'other', customer_name: '', customer_vat_id: '', category: 'אחר', vat_rate: null }),
  claudeFail: { [H.electra]: 3, [H.flaky]: 3 },   // three overloads in a row: the document fails once, the retry recovers it
  mailboxes: {
    'invoices@kurkoos.test': {
      messages: [
        { id: 'm1', date: at(D.tambour), subject: 'חשבונית מס 4521 - טמבור', from: 'טמבור <billing@tambour.test>', text: 'מצורפת חשבונית', files: ['tambour-4521.pdf'] },
        { id: 'm2', date: at(D.bezeq), subject: 'Your October statement is ready', from: 'Bezeq Business <noreply@bezeq.test>', text: 'Your statement is attached.', files: ['bezeq-oct.pdf'] },
        { id: 'm3', date: at(D.bezeq, 8), subject: 'קטלוג סתיו - מבצעים', from: 'Garden Shop <news@garden.test>', text: 'ניוזלטר', files: ['brochure.pdf'] },
        { id: 'm4', date: at(D.paz), subject: 'קבלה על תדלוק', from: 'פז <receipts@paz.test>', html: '<div dir="rtl"><h2>פז חברת נפט בע״מ</h2><p>חשבונית מס/קבלה 7731-22</p><p>דלק 95, 52.4 ליטר</p><p>סה״כ לפני מע״מ 349.41, מע״מ 62.89</p><p><b>סה״כ 412.30 ₪</b>, שולם באשראי</p></div>' },
        { id: 'm5', date: at(D.paz, 7), subject: 'Fwd: חשבונית מס 4521', from: 'יוסי <yossi@kurkoos.test>', text: 'שוב החשבונית', files: ['tambour-4521.pdf'] },
        { id: 'm6', date: at(D.electra, 6), subject: 'העתק חשבונית 4521', from: 'טמבור <billing@tambour.test>', text: 'העתק', files: ['tambour-4521-copy.pdf'] },
        { id: 'm0', date: at(D.old), subject: 'חשבונית חשמל', from: 'חברת החשמל <bills@iec.test>', text: 'מצורפת', files: ['old-invoice.pdf'] },
        { id: 'm7', date: at(D.electra), subject: 'חשבון 778 עבודות חשמל', from: 'אלקטרה <office@electra.test>', text: 'מצורף', files: ['electra-778.pdf'] },
      ],
    },
    'broken@kurkoos.test': { failing: true, messages: [] },
  },
}
fs.writeFileSync(`${OUT}/fixtures.json`, JSON.stringify(fixtures, null, 1))
fs.writeFileSync(`${OUT}/meta.json`, JSON.stringify({ IDS, D, H }, null, 1))
console.log('fixtures ready', Object.keys(H).length)
