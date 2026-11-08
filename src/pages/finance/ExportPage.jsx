import { useMemo, useState } from 'react'
import { useFinance } from './FinanceApp.jsx'
import * as api from './api.js'
import { DOC_TYPE, claimableVat, counts, docDate, money, monthKey, monthLabel, signedTotal } from './format.js'
import { makeZip, saveBlob } from './zip.js'
import { Empty, Icon, StatusPill } from './ui.jsx'

const lastMonth = () => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1); return d.toISOString().slice(0, 7) }
const safe = (s) => String(s || '').replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, ' ').trim().slice(0, 60)
const csvCell = (v) => { const s = v === null || v === undefined ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }

/* the monthly package for the accountant: a spreadsheet plus every file */
export default function ExportPage() {
  const { documents, businesses, categories, reload } = useFinance()
  const [month, setMonth] = useState(lastMonth())
  const [biz, setBiz] = useState(businesses.length === 1 ? businesses[0].id : '')
  const [withReview, setWithReview] = useState(false)
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState('')

  const months = useMemo(() => [...new Set([lastMonth(), ...documents.map((d) => monthKey(docDate(d))).filter(Boolean)])].sort().reverse(), [documents])
  const rows = useMemo(() => documents.filter((d) => counts(d) && monthKey(docDate(d)) === month && (!biz || d.business_id === biz)
    && (d.status === 'approved' || d.status === 'sent' || (withReview && d.status === 'review')))
    .sort((a, b) => String(docDate(a)).localeCompare(String(docDate(b)))), [documents, month, biz, withReview])
  const waiting = documents.filter((d) => counts(d) && monthKey(docDate(d)) === month && (!biz || d.business_id === biz) && ['review', 'processing'].includes(d.status)).length

  const bizName = (id) => businesses.find((b) => b.id === id)?.name || ''
  const fileNameOf = (d, i) => {
    const ext = d.file_mime === 'application/pdf' ? 'pdf' : (d.file_mime || '').startsWith('text/') ? 'html' : (d.file_mime || 'image/jpeg').split('/')[1]
    return `${String(i + 1).padStart(3, '0')}_${docDate(d)}_${safe(d.supplier_name) || 'מסמך'}${d.doc_number ? `_${safe(d.doc_number)}` : ''}.${ext}`
  }
  const csv = () => {
    const head = ['#', 'תאריך', 'ספק', 'ח.פ ספק', 'סוג', 'מספר', 'קטגוריה', 'חברה', 'לפני מע״מ', 'מע״מ', 'מע״מ לקיזוז', 'סה״כ', 'מטבע', 'אמצעי תשלום', 'שולם', 'תיאור', 'קובץ']
    const lines = rows.map((d, i) => [i + 1, docDate(d), d.supplier_name, d.supplier_vat_id, DOC_TYPE[d.doc_type], d.doc_number, d.category, bizName(d.business_id), d.amount_before_vat, d.vat_amount, claimableVat(d, categories).toFixed(2), d.total_amount, d.currency, d.payment_method, d.paid ? 'כן' : 'לא', d.description, fileNameOf(d, i)])
    return '﻿' + [head, ...lines].map((l) => l.map(csvCell).join(',')).join('\r\n')
  }
  const base = `קורקוס_הוצאות_${month}${biz ? `_${safe(bizName(biz))}` : ''}`

  const downloadCsv = () => saveBlob(new Blob([csv()], { type: 'text/csv;charset=utf-8' }), `${base}.csv`)
  const downloadZip = async () => {
    setBusy('zip'); setMsg('')
    try {
      const files = [{ name: `${base}.csv`, data: new TextEncoder().encode(csv()) }]
      for (const [i, d] of rows.entries()) if (d.file_path) files.push({ name: fileNameOf(d, i), data: await api.fileBlob(d) })
      saveBlob(await makeZip(files), `${base}.zip`)
    } catch (e) { setMsg(e.message) } finally { setBusy('') }
  }
  const markSent = async () => {
    setBusy('sent')
    try { await api.updateDocuments(rows.filter((d) => d.status !== 'sent').map((d) => d.id), { status: 'sent', sent_at: new Date().toISOString() }); await reload(); setMsg('המסמכים סומנו כנשלחו לרו״ח.') } catch (e) { setMsg(e.message) } finally { setBusy('') }
  }

  const byCat = {}
  for (const d of rows) byCat[d.category || 'ללא קטגוריה'] = (byCat[d.category || 'ללא קטגוריה'] || 0) + signedTotal(d)
  const total = rows.reduce((s, d) => s + signedTotal(d), 0)
  const net = rows.reduce((s, d) => s + (d.doc_type === 'credit' ? -1 : 1) * (Number(d.amount_before_vat) || 0), 0)
  const vat = rows.reduce((s, d) => s + claimableVat(d, categories), 0)
  const accountant = businesses.find((b) => b.id === biz)?.accountant_email

  return (
    <div className="fin-stack">
      <div className="fin-filters">
        <select className="fin-select" value={month} onChange={(e) => setMonth(e.target.value)} aria-label="חודש">{months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}</select>
        {businesses.length > 1 && (
          <select className="fin-select" value={biz} onChange={(e) => setBiz(e.target.value)} aria-label="חברה">
            <option value="">כל החברות</option>
            {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        )}
        <label className="fin-check"><input type="checkbox" checked={withReview} onChange={(e) => setWithReview(e.target.checked)} /> לכלול גם מסמכים שעוד לא אושרו</label>
      </div>

      {waiting > 0 && !withReview && <p className="fin-note fin-note--warn">{waiting} מסמכים מהחודש עוד מחכים לבדיקה ולא נכללים בחבילה.</p>}

      <div className="fin-kpis">
        <div className="fin-kpi"><span className="fin-kpi__label">מסמכים בחבילה</span><strong className="fin-kpi__value">{rows.length}</strong></div>
        <div className="fin-kpi"><span className="fin-kpi__label">לפני מע״מ</span><strong className="fin-kpi__value">{money(net)}</strong></div>
        <div className="fin-kpi fin-kpi--brand"><span className="fin-kpi__label">מע״מ תשומות לקיזוז</span><strong className="fin-kpi__value">{money(vat)}</strong></div>
        <div className="fin-kpi"><span className="fin-kpi__label">סה״כ</span><strong className="fin-kpi__value">{money(total)}</strong></div>
      </div>

      {!rows.length ? <Empty title="אין מסמכים מאושרים לחודש הזה">אשרו מסמכים בעמוד המסמכים, או סמנו למעלה לכלול גם את אלה שעוד לא אושרו.</Empty> : (
        <>
          <div className="fin-card fin-export-actions">
            <button type="button" className="fin-btn fin-btn--primary" onClick={downloadZip} disabled={!!busy}><Icon name="export" size={18} /> {busy === 'zip' ? 'מכין…' : 'הורדת חבילה (ZIP: אקסל + קבצים)'}</button>
            <button type="button" className="fin-btn" onClick={downloadCsv}>הורדת אקסל בלבד (CSV)</button>
            {accountant && <a className="fin-btn" href={`mailto:${accountant}?subject=${encodeURIComponent(`חומר להנהלת חשבונות ${monthLabel(month)} · ${bizName(biz)}`)}&body=${encodeURIComponent(`שלום,\nמצורפת חבילת המסמכים לחודש ${monthLabel(month)}: ${rows.length} מסמכים, סה״כ ${money(total)}.\n`)}`}><Icon name="mail" size={18} /> מייל לרו״ח</a>}
            <button type="button" className="fin-btn" onClick={markSent} disabled={!!busy || rows.every((d) => d.status === 'sent')}><Icon name="check" size={18} /> סימון כנשלח</button>
            {msg && <p className="fin-muted" role="status">{msg}</p>}
          </div>
          <div className="fin-grid">
            <section className="fin-card">
              <h2 className="fin-card__title">לפי קטגוריה</h2>
              <table className="fin-table fin-table--plain"><tbody>{Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([k, v]) => <tr key={k}><td>{k}</td><td className="fin-num">{money(v)}</td></tr>)}</tbody></table>
            </section>
            <section className="fin-card">
              <h2 className="fin-card__title">המסמכים</h2>
              <ul className="fin-list">{rows.map((d) => <li key={d.id} className="fin-list__row fin-list__row--static"><span><strong>{d.supplier_name}</strong><small>{docDate(d)} · {DOC_TYPE[d.doc_type]} {d.doc_number}</small></span><span className="fin-list__end">{money(d.total_amount, d.currency)}<StatusPill status={d.status} /></span></li>)}</ul>
            </section>
          </div>
        </>
      )}
    </div>
  )
}
