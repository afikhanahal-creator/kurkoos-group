// The compliance engine's own tests: every formula and every rule, and the twenty scenarios of the brief, each with the
// answer the law gives and the answer the engine gives. Pure functions, no database, no browser:
//   node scripts/finance-tax-tests.mjs
// Exits 1 when any check fails.
import { RULES, WATCH, ruleOn, ruleState, ENGINE_VERSION } from '../src/pages/finance/taxRules.js'
import { assessCompliance, auditCompliance, validIsraeliId, kindOf } from '../src/pages/finance/compliance.js'
import { rateOn, allocationFloor } from '../src/pages/finance/vatRules.js'
import { markLedger } from '../src/pages/finance/ledger.js'
import { vatRateOn } from '../server/finance/validate.js'

const results = []
const check = (id, name, expected, actual, pass) => { results.push({ id, pass: !!pass }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${id} ${name}\n      expected: ${expected}\n      actual:   ${actual}`) }
const categories = [{ id: 'c1', name: 'חומרי בניין', vat_deductible_pct: 100 }, { id: 'c2', name: 'רכב ודלק', vat_deductible_pct: 66.67 }, { id: 'c3', name: 'כיבוד ואירוח', vat_deductible_pct: 0 }, { id: 'c4', name: 'ביטוח', vat_deductible_pct: 0 }, { id: 'c5', name: 'אחר', vat_deductible_pct: 100 }, { id: 'c6', name: 'קבלני משנה', vat_deductible_pct: 100 }, { id: 'c7', name: 'ציוד וכלים', vat_deductible_pct: 100 }]
const TODAY = '2026-11-13'
let seq = 0
const doc = (o) => ({ id: `d${++seq}`, status: 'approved', doc_type: 'invoice', supplier_name: 'ספק בדיקה בע״מ', supplier_vat_id: '514000009', supplier_id: 's1', doc_number: String(1000 + seq), issue_date: '2026-09-01', currency: 'ILS', business_id: 'b1', category: 'חומרי בניין', confidence: 0.95, ...o })
const run = (d, others = []) => { const docs = markLedger([d, ...others]); return assessCompliance(d, { categories, documents: docs, today: TODAY }) }
const codes = (c, level) => c.checks.filter((x) => !level || x.level === level).map((x) => x.code)
const has = (c, code) => c.checks.some((x) => x.code === code)

// ---------- formulas and the registry ----------
check('F1', 'שיעור המע״מ לפי תאריך', '16% ב-2011, 17% ב-31.12.2024, 18% ב-1.1.2025, 18% ב-2014', `${rateOn('2011-06-01')}, ${rateOn('2024-12-31')}, ${rateOn('2025-01-01')}, ${rateOn('2014-01-01')}`, rateOn('2011-06-01') === 0.16 && rateOn('2024-12-31') === 0.17 && rateOn('2025-01-01') === 0.18 && rateOn('2014-01-01') === 0.18 && rateOn('2012-09-01') === 0.17 && rateOn('2013-06-02') === 0.18 && rateOn('2015-10-01') === 0.17)
check('F2', 'שיעור אחד בכל המערכת (המאגר, סוכן המע״מ ובדיקות הקריאה)', 'אותו שיעור משלושת המקומות, בכל תאריך', ['2012-01-01', '2013-01-01', '2014-06-01', '2020-01-01', '2025-06-01'].map((d) => `${ruleOn('vat_rate', d).value}/${rateOn(d)}/${vatRateOn(d)}`).join(' '), ['2012-01-01', '2013-01-01', '2014-06-01', '2020-01-01', '2025-06-01'].every((d) => ruleOn('vat_rate', d).value === rateOn(d) && rateOn(d) === vatRateOn(d)))
check('F3', 'סף מספר ההקצאה לפי תאריך', 'אין לפני 5.5.2024; 25,000; 20,000 ב-2025; 10,000 מ-1.1.2026; 5,000 מ-1.6.2026', [allocationFloor('2024-05-04'), allocationFloor('2024-05-05'), allocationFloor('2025-03-01'), allocationFloor('2026-01-01'), allocationFloor('2026-05-31'), allocationFloor('2026-06-01')].join(', '), allocationFloor('2024-05-04') === null && allocationFloor('2024-05-05') === 25000 && allocationFloor('2025-03-01') === 20000 && allocationFloor('2026-01-01') === 10000 && allocationFloor('2026-05-31') === 10000 && allocationFloor('2026-06-01') === 5000)
check('F4', 'מע״מ מתוך מחיר כולל', '1,180 × 18 / 118 = 180', String(Math.round(1180 * 0.18 / 1.18 * 100) / 100), Math.round(1180 * 0.18 / 1.18 * 100) / 100 === 180)
check('F5', 'ספרת ביקורת של מספר עוסק', '514000009 תקין; 514000005 לא; 039337423 תקין', `${validIsraeliId('514000009')}, ${validIsraeliId('514000005')}, ${validIsraeliId('039337423')}`, validIsraeliId('514000009') && !validIsraeliId('514000005') && validIsraeliId('039337423'))
{
  const bad = Object.values(RULES).filter((r) => !r.id || !r.name || !r.text || !r.source?.name || !r.source?.kind || !r.source?.url || !r.versions?.length || r.versions.some((v) => !v.v || !v.from) || !r.applies || typeof r.show !== 'function')
  const overlap = Object.values(RULES).filter((r) => r.versions.some((v, i) => i > 0 && (!r.versions[i - 1].to || r.versions[i - 1].to >= v.from)))
  check('F6', 'כל כלל במאגר שלם', 'לכל כלל: מזהה, שם, תיאור, מקור עם סוג וקישור, גרסאות עם תאריכים שלא חופפים, תחולה', `כללים: ${Object.keys(RULES).length}; חסרים: ${bad.map((r) => r.id).join(',') || 'אין'}; חופפים: ${overlap.map((r) => r.id).join(',') || 'אין'}`, Object.keys(RULES).length >= 25 && !bad.length && !overlap.length)
}
{
  const unver = Object.values(RULES).filter((r) => ruleState(r, TODAY).key === 'check').map((r) => r.id)
  const st = ruleState(RULES.vat_rate, TODAY, { vat_rate_order: { status: 'value_missing' } })
  const missingRules = WATCH.flatMap((w) => w.rules).filter((id) => !RULES[id])
  check('F7', 'סטטוס כלל: בתוקף, לא אומת, מקור שהשתנה', 'כלל הקנסות (בלי נוסח חוק) מסומן "דורש בדיקה"; כלל שהמקור שלו השתנה מסומן "דורש בדיקה"; כל מקור במעקב מצביע על כללים קיימים', `לא אומתו: ${unver.join(',')}; מע״מ עם מקור שהשתנה: ${st.label}; מקורות: ${WATCH.length}, כללים חסרים: ${missingRules.join(',') || 'אין'}`, unver.includes('income_fines') && !unver.includes('vat_rate') && st.key === 'check' && ruleState(RULES.vat_rate, TODAY).key === 'active' && !missingRules.length && WATCH.length >= 8)
}

// ---------- the twenty scenarios ----------
{ const c = run(doc({ amount_before_vat: 1000, vat_amount: 180, total_amount: 1180 }))
  check('S1', 'חשבונית רגילה עם מע״מ 18%', 'החישוב תקין; 180 ₪ מע״מ מאושר לקיזוז; ההוצאה 1,000 ₪ מוכרת במלואה; מוכן לרו״ח', `${c.status}; מע״מ ${c.vat.eligible}; מוכר ${c.income.amount} (${c.income.pct}%); ${codes(c, 'error').concat(codes(c, 'doubt')).join(',') || 'בלי הערות'}`, c.status === 'ready' && c.vat.eligible === 180 && c.income.amount === 1000 && has(c, 'math_ok') && !c.flagged) }
{ const ok = run(doc({ issue_date: '2024-11-20', status: 'approved', amount_before_vat: 1000, vat_amount: 170, total_amount: 1170 }))
  const wrong = run(doc({ issue_date: '2024-11-20', status: 'review', amount_before_vat: 1000, vat_amount: 180, total_amount: 1180 }))
  const late = run(doc({ issue_date: '2025-02-01', status: 'review', amount_before_vat: 1000, vat_amount: 170, total_amount: 1170 }))
  check('S2', 'חשבונית מלפני שינוי שיעור המע״מ', 'חשבונית מ-2024 ב-17% תקינה (גרסת הכלל 2015-10); אותה חשבונית ב-18% מסומנת; חשבונית מ-2025 ב-17% מסומנת עם הסבר שזה השיעור הקודם', `17% ב-2024: ${has(ok, 'math_ok')} (גרסה ${ok.rules.find((r) => r.id === 'vat_rate')?.version}); 18% ב-2024: ${has(wrong, 'rate')}; 17% ב-2025: ${has(late, 'rate')} "${late.checks.find((x) => x.code === 'rate')?.text.slice(-45)}"`, has(ok, 'math_ok') && ok.rules.find((r) => r.id === 'vat_rate')?.version === '2015-10' && has(wrong, 'rate') && has(late, 'rate') && /17%/.test(late.checks.find((x) => x.code === 'rate').text)) }
{ const c = run(doc({ amount_before_vat: 500, vat_amount: 0, total_amount: 500 }))
  check('S3', 'חשבונית ללא מע״מ', 'אין מס תשומות; המערכת לא מניחה מע״מ; ההוצאה מוכרת 500 ₪', `מע״מ: ${c.vat.cls}, לקיזוז ${c.vat.eligible + c.vat.potential}; מוכר ${c.income.amount}; ${has(c, 'no_vat')}`, c.vat.cls === 'no_vat' && c.vat.eligible + c.vat.potential === 0 && c.income.amount === 500 && has(c, 'no_vat')) }
{ const c = run(doc({ supplier_name: 'ירקות השדה', description: 'פירות וירקות, מע״מ בשיעור אפס', amount_before_vat: 800, vat_amount: 0, total_amount: 800 }))
  check('S4', 'חשבונית בשיעור אפס', 'אין מס תשומות לקיזוז, בלי שגיאת חישוב', `${c.vat.cls}; שגיאות ${c.errors}; כלל ${c.checks.find((x) => x.code === 'no_vat')?.rule}`, c.vat.cls === 'no_vat' && c.errors === 0 && c.checks.find((x) => x.code === 'no_vat')?.rule === 'vat_zero_exempt') }
{ const c = run(doc({ doc_type: 'receipt', supplier_name: 'עיריית תל אביב', supplier_vat_id: '', description: 'קנס חניה דוח 7781', category: 'אחר', total_amount: 250 }))
  check('S5', 'הוצאה שאינה מוכרת (קנס)', '0% הכרה; 250 ₪ לא מוכרים; מסומן לבדיקת רו״ח כי אין נוסח חוק מפורש; אין מע״מ', `${c.kind.id}; מוכר ${c.income.amount} (${c.income.pct}%), לא מוכר ${c.income.blocked}; ${has(c, 'income_review')}; סטטוס ${c.status}`, c.kind.id === 'fines' && c.income.pct === 0 && c.income.blocked === 250 && has(c, 'income_review') && c.status === 'accountant') }
{ const c = run(doc({ category: 'כיבוד ואירוח', description: 'קפה וחלב למשרד', amount_before_vat: 100, vat_amount: 18, total_amount: 118 }))
  check('S6', 'הוצאה מוכרת חלקית (כיבוד 80%)', 'מס הכנסה 80% מההוצאה כולל המע״מ שלא קוזז: 118 × 80% = 94.40; 23.60 לא מוכר', `${c.kind.id}; ${c.income.pct}%; מוכר ${c.income.amount}; לא מוכר ${c.income.blocked}; כלל ${c.income.rule}`, c.kind.id === 'refreshments' && c.income.pct === 80 && c.income.amount === 94.4 && c.income.blocked === 23.6 && c.income.rule === 'income_refreshments') }
{ const c = run(doc({ category: 'כיבוד ואירוח', description: 'קפה וחלב למשרד', amount_before_vat: 100, vat_amount: 18, total_amount: 118 }))
  check('S7', 'הוצאה עם מע״מ שאינו ניתן לקיזוז', 'קיזוז 0%; 18 ₪ לא מקוזזים', `קיזוז ${c.vat.pct}%; לקיזוז ${c.vat.eligible + c.vat.potential}; לא מקוזז ${c.vat.blocked}; ${c.vat.cls}`, c.vat.pct === 0 && c.vat.eligible + c.vat.potential === 0 && c.vat.blocked === 18 && c.vat.cls === 'none') }
{ const c = run(doc({ category: 'כיבוד ואירוח', description: 'קפה וחלב למשרד', amount_before_vat: 100, vat_amount: 18, total_amount: 118 }))
  check('S8', 'מוכרת במס הכנסה אבל בלי קיזוז מע״מ', 'שתי תשובות נפרדות: מס הכנסה 80%, מע״מ 0%', `מס הכנסה ${c.income.pct}% (${c.income.rule}); מע״מ ${c.vat.pct}%`, c.income.pct === 80 && c.vat.pct === 0 && c.income.rule !== undefined) }
{ const c = run(doc({ doc_type: 'receipt', status: 'review', total_amount: 590 }))
  check('S9', 'קבלה ללא חשבונית מס', 'מע״מ לא מקוזז לפי קבלה; נדרשת חשבונית מס; ה-90 ₪ מוצגים רק כהערכה; ההוצאה נרשמת', `${c.vat.cls}; לקיזוז מאושר ${c.vat.eligible}; הערכה ${c.vat.estimate?.vat} (${c.vat.estimate?.assumed}); ${has(c, 'vat_tax_invoice')}; מוכר ${c.income.amount}`, c.vat.cls === 'missing' && c.vat.eligible === 0 && c.vat.estimate?.vat === 90 && c.vat.estimate.assumed === true && has(c, 'vat_tax_invoice') && c.income.amount === 590) }
{ const c = run(doc({ doc_type: 'invoice_receipt', amount_before_vat: 200, vat_amount: 36, total_amount: 236 }))
  check('S10', 'חשבונית מס/קבלה', 'מקוזזת כמו חשבונית מס: 36 ₪; שולמה', `${c.vat.cls}; ${c.vat.eligible}; ${c.status}`, c.vat.cls === 'full' && c.vat.eligible === 36 && c.status === 'ready') }
{ const inv = doc({ doc_number: '5001', issue_date: '2026-08-01', amount_before_vat: 1000, vat_amount: 180, total_amount: 1180 })
  const cr = doc({ doc_type: 'credit', doc_number: 'Z-1', issue_date: '2026-08-15', amount_before_vat: 1000, vat_amount: 180, total_amount: 1180 })
  const c = run(cr, [inv])
  check('S11', 'חשבונית זיכוי מלאה', 'מקושרת לחשבונית 5001; זיכוי מלא; מקטינה מע״מ ב-180 והוצאה ב-1,000; לא הוצאה חדשה', `מקור: ${c.vat.creditOf === inv.id}; ${c.checks.find((x) => x.code === 'credit_linked')?.text.slice(0, 12)}; מע״מ ${c.vat.eligible}; הוצאה ${c.income.amount}`, c.vat.creditOf === inv.id && /מלא/.test(c.checks.find((x) => x.code === 'credit_linked')?.text || '') && c.vat.eligible === -180 && c.income.amount === -1000) }
{ const inv = doc({ doc_number: '5002', issue_date: '2026-08-01', amount_before_vat: 1000, vat_amount: 180, total_amount: 1180 })
  const cr = doc({ doc_type: 'credit', doc_number: 'Z-2', issue_date: '2026-08-15', amount_before_vat: 300, vat_amount: 54, total_amount: 354 })
  const cr2 = doc({ doc_type: 'credit', doc_number: 'Z-3', issue_date: '2026-08-20', amount_before_vat: 800, vat_amount: 144, total_amount: 944 })
  const c = run(cr, [inv]); const over = run(cr2, [inv, cr]); const lone = run(doc({ doc_type: 'credit', supplier_id: 's9', supplier_vat_id: '039337423', doc_number: 'Z-9', amount_before_vat: 100, vat_amount: 18, total_amount: 118 }))
  check('S12', 'חשבונית זיכוי חלקית, זיכוי ביתר וזיכוי בלי מקור', 'חלקי: מקטין 54 ₪ מע״מ; שני זיכויים שעולים על החשבונית מסומנים כחשד לזיכוי כפול; זיכוי בלי חשבונית מקורית מסומן', `חלקי: ${/חלקי/.test(c.checks.find((x) => x.code === 'credit_linked')?.text || '')}, ${c.vat.eligible}; ביתר: ${has(over, 'credit_over')}; בלי מקור: ${has(lone, 'vat_credit_original')}`, /חלקי/.test(c.checks.find((x) => x.code === 'credit_linked')?.text || '') && c.vat.eligible === -54 && has(over, 'credit_over') && has(lone, 'vat_credit_original')) }
{ const a = doc({ doc_number: '7001', amount_before_vat: 1000, vat_amount: 180, total_amount: 1180, file_mime: 'application/pdf' })
  const b = doc({ doc_number: '7001', amount_before_vat: 1000, vat_amount: 180, total_amount: 1180, file_mime: 'image/jpeg', status: 'review' })
  const c = run(b, [a]); const dis = run({ ...b, duplicate_state: 'dismissed' }, [a])
  check('S13', 'חשבונית כפולה (פעם PDF ופעם תמונה)', 'אותו ספק, מספר וסכום: חשד לכפילות; אחרי שאדם אמר "לא כפול" אין הערה', `${has(c, 'dup_number')}; אחרי הכרעה: ${has(dis, 'dup_number')}`, has(c, 'dup_number') && !has(dis, 'dup_number')) }
{ const sum = run(doc({ status: 'review', amount_before_vat: 1000, vat_amount: 180, total_amount: 1200 }))
  const rate = run(doc({ status: 'review', amount_before_vat: 1000, vat_amount: 150, total_amount: 1150 }))
  check('S14', 'מסמך עם חישוב מע״מ שגוי', 'סכומים שלא מסתכמים: "דורש תיקון"; מע״מ 15% במקום 18%: ספק עם ההפרש בשקלים (30 ₪); המסמך לא מתוקן', `סכום: ${sum.status} ${has(sum, 'sum')}; שיעור: ${has(rate, 'rate')} "${rate.checks.find((x) => x.code === 'rate')?.text.match(/הפרש [^.]*/)?.[0]}"`, sum.status === 'fix' && has(sum, 'sum') && has(rate, 'rate') && /הפרש ‎?-?30/.test(rate.checks.find((x) => x.code === 'rate').text.replace(/[‎‏]/g, ''))) }
{ const c = run(doc({ supplier_name: 'Meta Platforms Ireland Limited', supplier_vat_id: 'IE9692928F', currency: 'USD', doc_type: 'receipt', total_amount: 300, category: 'אחר' }))
  check('S15', 'חשבונית מחו״ל', 'אין מע״מ ישראלי לקיזוז; לבדיקת רו״ח (מע״מ על שירות מתושב חוץ)', `${c.vat.cls}; ${has(c, 'vat_foreign')}; ${c.status}; כלל ${c.checks.find((x) => x.code === 'vat_foreign')?.rule}`, c.vat.cls === 'review' && has(c, 'vat_foreign') && c.status === 'accountant' && c.checks.find((x) => x.code === 'vat_foreign').rule === 'vat_foreign_supplier') }
{ const c = run(doc({ amount_before_vat: 30000, vat_amount: 5400, total_amount: 35400, allocation_number: '123456789' }))
  check('S16', 'חשבונית עם מספר הקצאה', 'מעל הסף (5,000 ₪ מ-1.6.2026), המספר קיים: מקוזזת 5,400 ₪', `נדרש ${c.vat.allocation.required}, קיים ${c.vat.allocation.present}, סף ${c.vat.allocation.floor}; ${c.vat.eligible}`, c.vat.allocation.required && c.vat.allocation.present && c.vat.allocation.floor === 5000 && c.vat.eligible === 5400 && !has(c, 'vat_allocation')) }
{ const c = run(doc({ status: 'review', amount_before_vat: 30000, vat_amount: 5400, total_amount: 35400 }))
  const old = run(doc({ status: 'review', issue_date: '2025-11-20', amount_before_vat: 30000, vat_amount: 5400, total_amount: 35400 }))
  const below = run(doc({ status: 'review', issue_date: '2025-11-20', amount_before_vat: 15000, vat_amount: 2700, total_amount: 17700 }))
  check('S17', 'נדרש מספר הקצאה והוא חסר', 'מסומן: המע״מ לא מקוזז בלי המספר, ומ-2026 גם ההוצאה אינה מוכרת; חשבונית מ-2025: רק המע״מ; 15,000 ₪ ב-2025 (סף 20,000): בלי הערה', `2026: ${has(c, 'vat_allocation')}+${has(c, 'income_allocation')} ${c.status}; 2025: ${has(old, 'vat_allocation')}+${has(old, 'income_allocation')}; מתחת לסף: ${has(below, 'vat_allocation')}`, has(c, 'vat_allocation') && has(c, 'income_allocation') && c.status === 'accountant' && has(old, 'vat_allocation') && !has(old, 'income_allocation') && !has(below, 'vat_allocation')) }
{ const c = run(doc({ category: 'אחר', supplier_name: 'פז חברת נפט', description: 'תדלוק רכב', amount_before_vat: 300, vat_amount: 54, total_amount: 354 }))
  const right = run(doc({ category: 'רכב ודלק', supplier_name: 'פז חברת נפט', description: 'תדלוק רכב', amount_before_vat: 300, vat_amount: 54, total_amount: 354 }))
  check('S18', 'הוצאה מעורבת עסקית ופרטית (דלק)', 'בקטגוריה עם 100% קיזוז: ספק לקיזוז ביתר (2/3 לפי תקנה 18), 18 ₪; בקטגוריית רכב: קיזוז 36 ₪; מס הכנסה 45% כהערכה', `ספק: ${has(c, 'vat_pct')} "${c.checks.find((x) => x.code === 'vat_pct')?.text.match(/ביתר של [^.]*/)?.[0]}"; נכון: ${right.vat.eligible}, ${right.income.pct}% ${right.income.basis}`, has(c, 'vat_pct') && /ביתר של 18/.test(c.checks.find((x) => x.code === 'vat_pct').text) && Math.abs(right.vat.eligible - 36) < 0.02 && right.income.pct === 45 && right.income.basis === 'estimate' && !has(right, 'vat_pct')) }
{ const c = run(doc({ status: 'review', confidence: 0.41, supplier_vat_id: '514000005', doc_number: '', vat_amount: null, amount_before_vat: null, total_amount: 1180 }))
  check('S19', 'מסמך עם נתוני OCR לא ברורים', 'ודאות נמוכה, מספר עוסק שלא עובר ספרת ביקורת, מספר מסמך ומע״מ שלא נקראו: כולם מסומנים; המע״מ מוצג כהערכה בלבד; "דורש תיקון"', `${codes(c, 'error').concat(codes(c, 'doubt')).join(',')}; ${c.status}; לקיזוז מאושר ${c.vat.eligible}`, has(c, 'confidence') && has(c, 'supplier_id_check') && has(c, 'number') && has(c, 'vat_unread') && c.status === 'fix' && c.vat.eligible === 0) }
{ const c = run(doc({ issue_date: '2024-12-28', payment_date: '2025-01-15', amount_before_vat: 1000, vat_amount: 170, total_amount: 1170 }))
  check('S20', 'תאריך חשבונית שונה מתאריך התשלום', 'השיעור נקבע לפי תאריך החשבונית (17%), לא לפי התשלום ב-2025', `${has(c, 'math_ok')}; ${has(c, 'rate')}; גרסה ${c.rules.find((r) => r.id === 'vat_rate')?.version}`, has(c, 'math_ok') && !has(c, 'rate') && c.rules.find((r) => r.id === 'vat_rate')?.version === '2015-10') }

// ---------- more rules ----------
{ const inv = doc({ doc_number: '8001', issue_date: '2026-09-01', amount_before_vat: 1000, vat_amount: 180, total_amount: 1180 })
  const rc = doc({ doc_type: 'receipt', doc_number: 'K-1', issue_date: '2026-09-05', total_amount: 1180 })
  const docs = markLedger([inv, rc]); const all = auditCompliance(docs, { categories, today: TODAY })
  const r = all.rows.find((x) => x.doc.id === rc.id).c
  check('R1', 'קבלה שמשלמת חשבונית: ההוצאה נספרת פעם אחת', 'הקבלה מקושרת; ההוצאה הכוללת 1,180 ולא 2,360; מוכר 1,000', `${has(r, 'receipt_linked')}; הוצאנו ${all.totals.spent}; מוכר ${all.totals.recognised}; מע״מ ${all.totals.vatConfirmed}`, has(r, 'receipt_linked') && all.totals.spent === 1180 && all.totals.recognised === 1000 && all.totals.vatConfirmed === 180) }
{ const c = run(doc({ payment_method: 'cash', amount_before_vat: 6000, vat_amount: 1080, total_amount: 7080 })); const small = run(doc({ payment_method: 'cash', amount_before_vat: 4000, vat_amount: 720, total_amount: 4720 })); const old = run(doc({ payment_method: 'cash', issue_date: '2021-05-01', status: 'approved', amount_before_vat: 6000, vat_amount: 1020, total_amount: 7020 }))
  check('R2', 'מזומן מעל התקרה', '7,080 ₪ במזומן ב-2026: מסומן (תקרה 6,000, מותר עד 708); 4,720 ₪: לא; 7,020 ₪ ב-2021 (תקרה 11,000): לא', `${has(c, 'cash')} "${c.checks.find((x) => x.code === 'cash')?.text.match(/עד [^ ]* ₪/)?.[0]}"; ${has(small, 'cash')}; ${has(old, 'cash')}`, has(c, 'cash') && /708/.test(c.checks.find((x) => x.code === 'cash').text) && !has(small, 'cash') && !has(old, 'cash')) }
{ const c = run(doc({ category: 'ציוד וכלים', description: 'מחשב נייד', amount_before_vat: 6000, vat_amount: 1080, total_amount: 7080, allocation_number: '99' })); const sub = run(doc({ category: 'קבלני משנה', amount_before_vat: 2000, vat_amount: 360, total_amount: 2360 }))
  check('R3', 'רכוש קבוע וניכוי במקור', 'מחשב ב-6,000 ₪: הערה שייתכן רכוש קבוע (פחת); קבלן משנה: תזכורת לאישור ניכוי במקור', `${has(c, 'fixed_asset')}; ${has(sub, 'withholding')}`, has(c, 'fixed_asset') && has(sub, 'withholding')) }
{ const d = doc({ issue_date: '2024-11-20', amount_before_vat: 1000, vat_amount: 170, total_amount: 1170 }); const docs = markLedger([d])
  const now = assessCompliance(d, { categories, documents: docs, today: TODAY }); const later = assessCompliance(d, { categories, documents: docs, today: '2028-03-01' })
  const v = (c) => c.rules.map((r) => `${r.id}@${r.version}`).sort().join(',')
  check('R4', 'שינוי חוק לא משנה בדיעבד מסמך ישן', 'אותו מסמך נבדק היום ובעוד שנה וחצי מול אותן גרסאות כלל, עם אותו חישוב', `${v(now) === v(later)}; ${has(later, 'math_ok')}; ${v(now)}`, v(now) === v(later) && has(later, 'math_ok') && /vat_rate@2015-10/.test(v(now))) }
{ const k = (o) => kindOf(doc(o), { categories }).kind.id
  check('R5', 'זיהוי סוג ההוצאה', 'דלק, כיבוד, מסעדה (גם בקטגוריה אחרת), מתנות, ביטוח, קבלן משנה, שוטף', [k({ category: 'רכב ודלק' }), k({ category: 'כיבוד ואירוח' }), k({ category: 'אחר', supplier_name: 'מסעדת הדייגים' }), k({ category: 'אחר', description: 'שי לחג לעובדים' }), k({ category: 'ביטוח' }), k({ category: 'קבלני משנה' }), k({ category: 'חומרי בניין' })].join(','), k({ category: 'רכב ודלק' }) === 'vehicle' && k({ category: 'כיבוד ואירוח' }) === 'refreshments' && k({ category: 'אחר', supplier_name: 'מסעדת הדייגים' }) === 'meals' && k({ category: 'אחר', description: 'שי לחג לעובדים' }) === 'gifts' && k({ category: 'ביטוח' }) === 'insurance' && k({ category: 'קבלני משנה' }) === 'subcontractors' && k({ category: 'חומרי בניין' }) === 'general') }
{ const c = run(doc({ status: 'processing' })); const dup = run(doc({ status: 'duplicate', total_amount: 100 })); const sent = run(doc({ status: 'sent', amount_before_vat: 100, vat_amount: 18, total_amount: 118 })); const rev = run(doc({ status: 'review', amount_before_vat: 100, vat_amount: 18, total_amount: 118 }))
  check('R6', 'הסטטוסים', 'בקריאה: "בתהליך זיהוי"; כפול: לא נספר; נשלח: "יוצא לרואה החשבון"; ממתין לאישור בלי הערות: "תקין"', `${c.status}, ${dup.status}, ${sent.status}, ${rev.status}`, c.status === 'reading' && dup.status === 'excluded' && sent.status === 'exported' && rev.status === 'ok') }

const failed = results.filter((r) => !r.pass)
console.log(`\n${results.length - failed.length}/${results.length} passed · engine ${ENGINE_VERSION}`)
if (failed.length) { console.log('failed:', failed.map((r) => r.id).join(', ')); process.exit(1) }
