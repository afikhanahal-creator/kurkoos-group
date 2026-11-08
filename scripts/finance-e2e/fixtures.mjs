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
export const IDS = { tambour: validId('52003187'), bezeq: validId('52003193'), paz: validId('51021605'), electra: validId('51345678'), ace: validId('52003841'), kurkoos: validId('51500000'), execution: validId('51500001') }

const today = new Date()
const iso = (daysAgo) => { const d = new Date(today); d.setDate(d.getDate() - daysAgo); return d.toISOString().slice(0, 10) }
const D = { tambour: iso(6), bezeq: iso(5), paz: iso(4), electra: iso(3), ace: iso(2) }

const invoice = ({ supplier, id, title, number, date, lines, before, vat, total, customer, customerId, note = '' }) => `<!doctype html><html dir="rtl" lang="he"><head><meta charset="utf-8"><style>
body{font-family:'DejaVu Sans',Arial,sans-serif;margin:48px;color:#222}h1{color:#a00;margin:0}table{width:100%;border-collapse:collapse;margin:20px 0}td,th{border:1px solid #999;padding:8px;text-align:right}.t{font-size:22px;font-weight:bold}</style></head><body>
<h1>${supplier}</h1><p>ע.מ ${id}</p><h2>${title} ${number}</h2><p>תאריך: ${date}</p><p>לכבוד: ${customer} · ח.פ ${customerId}</p>
<table><tr><th>פריט</th><th>סכום</th></tr>${lines.map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join('')}</table>
<p>סה״כ לפני מע״מ: ${before}</p><p>מע״מ 18%: ${vat}</p><p class="t">סה״כ לתשלום: ₪${total}</p><p>${note}</p></body></html>`

const answer = (o) => ({
  is_financial_document: true, doc_type: 'invoice', supplier_name: '', supplier_vat_id: '', customer_name: 'קורקוס גרופ', customer_vat_id: IDS.kurkoos,
  doc_number: '', issue_date: '', due_date: '', payment_date: '', currency: 'ILS', amount_before_vat: null, vat_amount: null, total_amount: null, vat_rate: 18,
  description: '', category: 'אחר', payment_method: '', project_hint: '', notes: '',
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
await browser.close()

const H = { tambour: sha('tambour-4521.pdf'), copy: sha('tambour-4521-copy.pdf'), bezeq: sha('bezeq-oct.pdf'), brochure: sha('brochure.pdf'), electra: sha('electra-778.pdf'), ace: sha('ace-receipt.png') }
const at = (d, h = 9) => `${d}T0${h}:15:00Z`
const fixtures = {
  answers: {
    [H.tambour]: answer({ supplier_name: 'טמבור בע״מ', supplier_vat_id: IDS.tambour, doc_number: '4521', issue_date: D.tambour, amount_before_vat: 3050.85, vat_amount: 549.15, total_amount: 3600, description: 'צבע אקרילי לאתר', category: 'חומרי בניין', project_hint: 'מוהליבר 17' }),
    [H.copy]: answer({ supplier_name: 'טמבור בע״מ', supplier_vat_id: IDS.tambour, doc_number: '4521', issue_date: D.tambour, amount_before_vat: 3050.85, vat_amount: 549.15, total_amount: 3600, description: 'צבע אקרילי לאתר (העתק)', category: 'חומרי בניין' }),
    [H.bezeq]: answer({ doc_type: 'invoice_receipt', supplier_name: 'בזק', supplier_vat_id: IDS.bezeq, doc_number: '88-120394', issue_date: D.bezeq, amount_before_vat: 500, vat_amount: 90, total_amount: 590, description: 'אינטרנט עסקי', category: 'תקשורת ואינטרנט', payment_method: 'הוראת קבע' }),
    [H.electra]: answer({ supplier_name: 'אלקטרה בנייה', supplier_vat_id: IDS.electra, customer_name: 'קורקוס ביצוע', customer_vat_id: IDS.execution, doc_number: '778', issue_date: D.electra, amount_before_vat: 50000, vat_amount: 9000, total_amount: 59000, description: 'עבודות חשמל שלב ב׳', category: 'קבלני משנה' }),
    [H.ace]: answer({ doc_type: 'receipt', supplier_name: 'ACE', supplier_vat_id: IDS.ace, customer_name: '', customer_vat_id: '', doc_number: '5501', issue_date: D.ace, amount_before_vat: 200, vat_amount: 36, total_amount: 263, description: 'מקדחה', category: 'ציוד וכלים', field_confidence: { supplier_name: 0.99, supplier_vat_id: 0.9, doc_type: 0.9, doc_number: 0.93, issue_date: 0.92, payment_date: 0.5, amount_before_vat: 0.88, vat_amount: 0.86, total_amount: 0.58, currency: 0.99, category: 0.8, description: 0.9, customer: 0.4 } }),
  },
  textAnswers: {
    'פז חברת נפט': answer({ doc_type: 'invoice_receipt', supplier_name: 'פז חברת נפט', supplier_vat_id: IDS.paz, doc_number: '7731-22', issue_date: D.paz, amount_before_vat: 349.41, vat_amount: 62.89, total_amount: 412.3, description: 'דלק 95', category: 'רכב ודלק', payment_method: 'אשראי' }),
  },
  notFinancial: answer({ is_financial_document: false, doc_type: 'other', customer_name: '', customer_vat_id: '', category: 'אחר', vat_rate: null }),
  claudeFail: { [H.electra]: 3 },   // three overloads in a row: the document fails once, the retry recovers it
  mailboxes: {
    'invoices@kurkoos.test': {
      messages: [
        { id: 'm1', date: at(D.tambour), subject: 'חשבונית מס 4521 - טמבור', from: 'טמבור <billing@tambour.test>', text: 'מצורפת חשבונית', files: ['tambour-4521.pdf'] },
        { id: 'm2', date: at(D.bezeq), subject: 'Your October statement is ready', from: 'Bezeq Business <noreply@bezeq.test>', text: 'Your statement is attached.', files: ['bezeq-oct.pdf'] },
        { id: 'm3', date: at(D.bezeq, 8), subject: 'קטלוג סתיו - מבצעים', from: 'Garden Shop <news@garden.test>', text: 'ניוזלטר', files: ['brochure.pdf'] },
        { id: 'm4', date: at(D.paz), subject: 'קבלה על תדלוק', from: 'פז <receipts@paz.test>', html: '<div dir="rtl"><h2>פז חברת נפט בע״מ</h2><p>חשבונית מס/קבלה 7731-22</p><p>דלק 95, 52.4 ליטר</p><p>סה״כ לפני מע״מ 349.41, מע״מ 62.89</p><p><b>סה״כ 412.30 ₪</b>, שולם באשראי</p></div>' },
        { id: 'm5', date: at(D.paz, 7), subject: 'Fwd: חשבונית מס 4521', from: 'יוסי <yossi@kurkoos.test>', text: 'שוב החשבונית', files: ['tambour-4521.pdf'] },
        { id: 'm6', date: at(D.electra, 6), subject: 'העתק חשבונית 4521', from: 'טמבור <billing@tambour.test>', text: 'העתק', files: ['tambour-4521-copy.pdf'] },
        { id: 'm7', date: at(D.electra), subject: 'חשבון 778 עבודות חשמל', from: 'אלקטרה <office@electra.test>', text: 'מצורף', files: ['electra-778.pdf'] },
      ],
    },
    'broken@kurkoos.test': { failing: true, messages: [] },
  },
}
fs.writeFileSync(`${OUT}/fixtures.json`, JSON.stringify(fixtures, null, 1))
fs.writeFileSync(`${OUT}/meta.json`, JSON.stringify({ IDS, D, H }, null, 1))
console.log('fixtures ready', Object.keys(H).length)
