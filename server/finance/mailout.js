// "Send to the accountant": the documents a person filtered (by date, company, status…) go out in one email,
// with the original files attached, a CSV summary for the accounting software, and a short table in the body.
// Attachments stop at ~25MB (Resend takes 40MB after base64); the rest go as links valid for 7 days.
import { env } from './env.js'
import { sb, download, audit, insert, rpc } from './db.js'
import { signedUrl, emailOk } from './outbound.js'
import { money } from './format-server.js'

const MAX_DOCS = 300
const MAX_ATTACH = 25 * 1024 * 1024
const TYPE = { tax_invoice: 'חשבונית מס', receipt: 'קבלה', tax_invoice_receipt: 'חשבונית מס קבלה', credit_note: 'זיכוי', proforma: 'חשבון עסקה', quote: 'הצעת מחיר', other: 'אחר' }
const STATUS = { review: 'ממתין לאישור', approved: 'מאושר', sent: 'יוצא לרו״ח', failed: 'שגיאה', processing: 'בעיבוד' }
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
const csvCell = (v) => { const s = String(v ?? ''); return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }
const safeName = (s) => String(s || '').replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, ' ').trim().slice(0, 60)

export async function sendToAccountant({ ids, to, note, subject, ccMe, user, period, mark }) {
  const list = [...new Set((Array.isArray(ids) ? ids : []).map(String))].filter((x) => /^[0-9a-f-]{36}$/i.test(x))
  if (!list.length) throw Object.assign(new Error('לא נבחרו מסמכים'), { status: 400 })
  if (list.length > MAX_DOCS) throw Object.assign(new Error(`אפשר לשלוח עד ${MAX_DOCS} מסמכים במייל אחד. צמצמו את הטווח.`), { status: 400 })
  const rcpt = [...new Set((Array.isArray(to) ? to : String(to || '').split(/[,;\s]+/)).map((x) => String(x).trim().toLowerCase()).filter(Boolean))]
  if (!rcpt.length || rcpt.length > 5 || !rcpt.every(emailOk)) throw Object.assign(new Error('כתובת מייל לא תקינה (עד 5 כתובות)'), { status: 400 })
  if (!process.env.RESEND_API_KEY) throw Object.assign(new Error('שליחת מיילים לא הוגדרה בשרת (RESEND_API_KEY)'), { status: 503 })

  // only documents this person may see: their companies, and never rejected or duplicate ones
  let docs = (await sb(`fin_documents?id=in.(${list.join(',')})&status=not.in.(rejected,duplicate,archived)&select=*&order=issue_date.asc.nullslast`)) || []
  if (user.business_ids?.length) docs = docs.filter((d) => d.business_id && user.business_ids.includes(d.business_id))
  if (!docs.length) throw Object.assign(new Error('אין מסמכים שאפשר לשלוח מהבחירה הזו'), { status: 400 })
  const names = {
    b: Object.fromEntries(((await sb('fin_businesses?select=id,name')) || []).map((x) => [x.id, x.name])),
    p: Object.fromEntries(((await sb('fin_projects?select=id,name')) || []).map((x) => [x.id, x.name])),
  }

  // files: attach until the size cap, link the rest
  const attachments = []; const linked = []; let size = 0
  for (let i = 0; i < docs.length; i += 6) {
    const batch = docs.slice(i, i + 6)
    const bufs = await Promise.all(batch.map(async (d) => {
      if (!d.file_path) return null
      if (size + (d.file_size || 0) > MAX_ATTACH) return 'link'
      try { return await download(d.file_path) } catch { return 'link' }
    }))
    batch.forEach((d, j) => {
      const b = bufs[j]
      if (!b) return
      if (b === 'link' || size + b.length > MAX_ATTACH) { linked.push(d); return }
      size += b.length
      const ext = (d.file_name || '').match(/\.[a-z0-9]{2,5}$/i)?.[0] || (d.file_mime === 'application/pdf' ? '.pdf' : '')
      attachments.push({ filename: `${d.issue_date || String(d.created_at).slice(0, 10)}_${safeName(d.supplier_name) || 'מסמך'}${d.doc_number ? `_${safeName(d.doc_number)}` : ''}${ext}`, content: b.toString('base64') })
    })
  }
  const links = await Promise.all(linked.map(async (d) => ({ d, url: await signedUrl(d.file_path, 7 * 86400) })))

  const head = ['תאריך', 'ספק', 'ח.פ ספק', 'סוג', 'מספר', 'חברה', 'פרויקט', 'לפני מע״מ', 'מע״מ', 'סה״כ', 'מטבע', 'סטטוס']
  const rows = docs.map((d) => [d.issue_date || '', d.supplier_name || '', d.supplier_vat_id || '', TYPE[d.doc_type] || d.doc_type || '', d.doc_number || '', names.b[d.business_id] || '', names.p[d.project_id] || '', d.amount_before_vat ?? '', d.vat_amount ?? '', d.total_amount ?? '', d.currency || 'ILS', STATUS[d.status] || d.status])
  const csv = `﻿${[head, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n')}`
  attachments.unshift({ filename: `סיכום-מסמכים${period ? `-${period}` : ''}.csv`, content: Buffer.from(csv, 'utf8').toString('base64') })

  const total = docs.reduce((s, d) => s + (Number(d.total_amount) || 0) * (d.doc_type === 'credit_note' ? -1 : 1), 0)
  const vat = docs.reduce((s, d) => s + (Number(d.vat_amount) || 0) * (d.doc_type === 'credit_note' ? -1 : 1), 0)
  const notApproved = docs.filter((d) => !['approved', 'sent'].includes(d.status)).length
  const title = subject || `מסמכים לרו״ח${period ? ` · ${period}` : ''} · ${docs.length} מסמכים`
  const html = `<div dir="rtl" style="font-family:Arial,sans-serif;color:#1f2a33;line-height:1.5">
${note ? `<p>${esc(note).replace(/\n/g, '<br>')}</p>` : '<p>שלום,<br>מצורפים המסמכים.</p>'}
<p><b>${docs.length} מסמכים</b>${period ? ` · ${esc(period)}` : ''} · סה״כ <b>${esc(money(total))}</b> · מע״מ ${esc(money(vat))}${notApproved ? `<br><span style="color:#8a5a00">${notApproved} מהמסמכים עוד לא אושרו אצלנו.</span>` : ''}</p>
<table cellpadding="6" style="border-collapse:collapse;font-size:13px">
<tr style="background:#f0f1f0;text-align:right"><th>תאריך</th><th>ספק</th><th>מספר</th><th>חברה</th><th style="text-align:left">סה״כ</th></tr>
${docs.slice(0, 120).map((d) => `<tr style="border-top:1px solid #e4e6e8"><td>${esc(d.issue_date || '')}</td><td>${esc(d.supplier_name || '')}</td><td>${esc(d.doc_number || '')}</td><td>${esc(names.b[d.business_id] || '')}</td><td style="text-align:left;direction:ltr">${esc(money(d.total_amount || 0))}</td></tr>`).join('')}
</table>
${docs.length > 120 ? `<p>ועוד ${docs.length - 120} מסמכים, כולם בקובץ הסיכום.</p>` : ''}
${links.length ? `<p>קבצים שלא נכנסו למייל (גדולים מדי), בקישורים בתוקף 7 ימים:</p><ul>${links.map(({ d, url }) => `<li>${url ? `<a href="${esc(url)}">${esc(d.supplier_name || d.file_name)} ${esc(d.doc_number || '')}</a>` : esc(d.file_name)}</li>`).join('')}</ul>` : ''}
<p style="color:#6b7680;font-size:12px">נשלח ע״י ${esc(user.email)} ממערכת הנהלת החשבונות של קבוצת קורקוס. קובץ CSV מצורף לקליטה בתוכנה.</p></div>`

  const r = await fetch(`${env.resendApi()}/emails`, {
    method: 'POST', signal: AbortSignal.timeout(50_000),
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: process.env.FINANCE_FROM || process.env.NOTIFY_FROM || 'Kurkoos Finance <onboarding@resend.dev>', to: rcpt, ...(ccMe && emailOk(user.email) ? { cc: [user.email] } : {}), reply_to: emailOk(user.email) ? user.email : undefined, subject: title, html, attachments }),
  })
  const body = await r.text()
  let providerId = null
  try { providerId = JSON.parse(body).id || null } catch { /* not json */ }
  const base = { channel: 'email', recipients: rcpt, document_ids: docs.map((d) => d.id), documents_count: docs.length, total, period: period || null, attached: attachments.length - 1, linked: links.length, created_by: user.id, created_by_email: user.email }
  // "sent" only when the mail provider accepted the message and gave it an id; otherwise it is a failed delivery
  if (!r.ok || !providerId) {
    const error = `שליחת המייל נכשלה (${r.status}): ${body.slice(0, 160)}`
    await insert('fin_deliveries', { ...base, status: 'failed', error }, 'return=minimal').catch(() => {})
    throw Object.assign(new Error(error), { status: 502 })
  }
  const delivery = await insert('fin_deliveries', { ...base, status: 'sent', provider_id: providerId }).catch(() => null)
  // approved documents become "sent to the accountant" through the same audited export function the screens use
  let marked = 0
  const approved = docs.filter((d) => d.status === 'approved' && !d.exported_at).map((d) => d.id)
  if (mark && approved.length) {
    try { await rpc('fin_record_export', { p_ids: approved, p_business_id: null, p_period: period || null, p_format: 'email', p_destination: `email:${rcpt.join(',')}`, p_integration_id: null, p_allow_reexport: false }, user.token); marked = approved.length } catch { marked = 0 }
  }
  await audit('mail', delivery?.id || null, 'sent_to_accountant', { to: rcpt, documents: docs.map((d) => d.id), attached: attachments.length - 1, linked: links.length, total, provider_id: providerId, marked }, user)
  return { sent: docs.length, attached: attachments.length - 1, linked: links.length, total, notApproved, to: rcpt, marked, delivery: delivery?.id || null }
}
