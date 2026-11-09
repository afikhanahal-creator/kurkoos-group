import { useRef, useState } from 'react'
import { useFinance } from './FinanceApp.jsx'
import * as api from './api.js'
import { DOC_TYPE, date, money, nameOf } from './format.js'
import Select from './Select.jsx'
import { Field, Icon, Modal } from './ui.jsx'

const STEPS = [['prepare', 'מכינים את התמונה'], ['upload', 'מעלים'], ['read', 'קוראים את הקבלה (OCR)'], ['match', 'מזהים ספק, חברה ופרויקט']]
const QUALITY = { blurry: 'הצילום מטושטש', cropped: 'חלק מהקבלה חתוך', rotated: 'הקבלה הפוכה או על הצד', missing_pages: 'חסר עמוד', handwritten: 'חלק בכתב יד' }

/* Photograph (or pick) one receipt: it is prepared on the device, uploaded, read by the agents, and shown here with
   what was extracted. The person can attach it to a company, project and category right away, or open it in full. */
export default function CaptureReceipt({ onClose, onDone }) {
  const { businesses, projects, categories, reload, go, patchDoc } = useFinance()
  const cam = useRef(null)
  const pick = useRef(null)
  const [step, setStep] = useState('')
  const [doc, setDoc] = useState(null)
  const [err, setErr] = useState('')
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)

  const run = async (file) => {
    if (!file) return
    setErr(''); setDoc(null)
    try {
      setStep('prepare')
      const ready = await api.prepareImage(file)
      setStep('upload')
      const t = setTimeout(() => setStep('read'), 900)
      const t2 = setTimeout(() => setStep('match'), 6000)
      const row = await api.uploadFile(ready, { source: file.type.startsWith('image/') ? 'camera' : 'upload', wait: true, prepared: true })
      clearTimeout(t); clearTimeout(t2)
      if (row.duplicate) { setStep(''); setErr(`הקבלה הזו כבר במערכת${row.of?.supplier_name ? ` (${row.of.supplier_name}${row.of.doc_number ? ` ${row.of.doc_number}` : ''})` : ''}.`); return }
      setDoc(row); setStep('done')
      setForm({ business_id: row.business_id || '', project_id: row.project_id || row.suggestions?.project_id?.value || '', category_id: row.category_id || categories.find((c) => c.name === (row.category || row.suggestions?.category?.value))?.id || '' })
      reload()
    } catch (e) { setStep(''); setErr(e.message) }
  }
  const save = async (open) => {
    setSaving(true); setErr('')
    try {
      const patch = { business_id: form.business_id || null, project_id: form.project_id || null, category_id: form.category_id || null }
      const row = await api.updateDocument(doc.id, patch)
      patchDoc?.(row); await reload(); onDone?.(row)
      if (open) go(`/documents/${doc.id}`); else onClose()
    } catch (e) { setErr(e.message) } finally { setSaving(false) }
  }

  const reading = step && step !== 'done'
  const failed = doc?.status === 'failed'
  const q = Object.entries(doc?.quality || {}).filter(([k, v]) => v && QUALITY[k]).map(([k]) => QUALITY[k])
  const errs = (doc?.issues || []).filter((i) => i.level === 'error')
  const projList = projects.filter((p) => !p.archived_at && (!form.business_id || !p.business_id || p.business_id === form.business_id))

  return (
    <Modal title="צילום קבלה" onClose={onClose} footer={doc ? <>
      <button type="button" className="fin-btn fin-btn--primary" onClick={() => save(false)} disabled={saving}><Icon name="check" size={17} /> {saving ? 'שומר…' : 'שמירה'}</button>
      <button type="button" className="fin-btn" onClick={() => save(true)} disabled={saving}>פתיחה ובדיקה</button>
      <button type="button" className="fin-btn fin-btn--ghost" onClick={() => { setDoc(null); setStep(''); cam.current?.click() }}><Icon name="camera" size={17} /> קבלה נוספת</button>
    </> : null}>
      <input ref={cam} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { run(e.target.files?.[0]); e.target.value = '' }} data-testid="capture-camera" />
      <input ref={pick} type="file" accept="application/pdf,image/*" hidden onChange={(e) => { run(e.target.files?.[0]); e.target.value = '' }} data-testid="capture-file" />

      {!step && !doc && (
        <div className="fin-capture__start">
          <button type="button" className="fin-capture__big" onClick={() => cam.current?.click()}>
            <span><Icon name="camera" size={30} /></span><strong>צילום הקבלה</strong><small>הניחו את הקבלה על משטח, בתאורה טובה, כך שכל הסכומים בתמונה</small>
          </button>
          <button type="button" className="fin-btn fin-btn--block" onClick={() => pick.current?.click()}><Icon name="file" size={18} /> בחירת קובץ או תמונה מהגלריה</button>
          {err && <p className="fin-error fin-error--block" role="alert">{err}</p>}
        </div>
      )}

      {reading && (
        <ol className="fin-capture__steps" aria-live="polite">
          {STEPS.map(([k, label], i) => {
            const at = STEPS.findIndex((s) => s[0] === step)
            return <li key={k} className={i < at ? 'is-done' : i === at ? 'is-now' : ''}><span>{i < at ? <Icon name="check" size={14} /> : i + 1}</span>{label}</li>
          })}
        </ol>
      )}

      {doc && (
        <div className="fin-capture__result">
          {doc.pending || doc.status === 'processing' ? (
            <p className="fin-note"><Icon name="clock" size={16} /> הקבלה נשמרה. הקריאה לוקחת יותר זמן מהרגיל, והסוכנים ימשיכו ברקע. היא תופיע ב"חשבוניות חדשות" בעוד רגע.</p>
          ) : failed ? (
            <p className="fin-note fin-note--warn"><Icon name="alert" size={16} /> לא הצלחנו לקרוא את הקבלה. היא נשמרה, והסוכנים ינסו שוב אוטומטית. אפשר גם לפתוח ולמלא ידנית.</p>
          ) : (
            <>
              <div className="fin-capture__head">
                <strong>{doc.supplier_name || 'ספק לא זוהה'}</strong>
                <span className="fin-capture__total">{doc.total_amount != null ? money(doc.total_amount, doc.currency) : '—'}</span>
              </div>
              <dl className="fin-capture__facts">
                <div><dt>תאריך</dt><dd>{doc.issue_date ? date(doc.issue_date) : '—'}</dd></div>
                <div><dt>מספר</dt><dd>{doc.doc_number || '—'}</dd></div>
                <div><dt>מע״מ</dt><dd>{doc.vat_amount != null ? money(doc.vat_amount, doc.currency) : '—'}</dd></div>
                <div><dt>סוג</dt><dd>{DOC_TYPE[doc.doc_type] || '—'}</dd></div>
                <div><dt>ח.פ ספק</dt><dd>{doc.supplier_vat_id || '—'}</dd></div>
                <div><dt>לפני מע״מ</dt><dd>{doc.amount_before_vat != null ? money(doc.amount_before_vat, doc.currency) : '—'}</dd></div>
              </dl>
              {doc.extraction?.verification?.disagree && <p className="fin-capture__check"><Icon name={doc.extraction.verification.disagree.length ? 'alert' : 'shield'} size={15} /> {doc.extraction.verification.disagree.length ? 'קריאה שנייה לא הסכימה על חלק מהערכים. בדקו אותם מול הקבלה.' : 'הסכומים נבדקו בקריאה שנייה ותואמים.'}</p>}
              {(q.length > 0 || errs.length > 0) && <ul className="fin-capture__warn">{[...q, ...errs.map((i) => i.message)].slice(0, 4).map((t) => <li key={t}><Icon name="alert" size={14} /> {t}</li>)}</ul>}
            </>
          )}
          <div className="fin-form__grid">
            <Field label="חברה"><Select value={form.business_id} onChange={(e) => setForm({ ...form, business_id: e.target.value })}><option value="">לפי הקבלה</option>{businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</Select></Field>
            <Field label="פרויקט" hint={doc.suggestions?.project_id?.value && !doc.project_id ? `הצעה: ${nameOf(projects, doc.suggestions.project_id.value)}` : undefined}><Select value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })}><option value="">ללא פרויקט</option>{projList.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
            <Field label="קטגוריה" wide hint={!doc.category_id && doc.suggestions?.category?.value ? `הצעת הסוכן: ${doc.suggestions.category.value}` : undefined}><Select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}><option value="">ללא</option>{categories.filter((c) => c.active !== false).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
          </div>
          {err && <p className="fin-error fin-error--block" role="alert">{err}</p>}
          <p className="fin-muted fin-small">ההוצאה נשמרה וממתינה לבדיקה. שום דבר לא מאושר בלי אדם.</p>
        </div>
      )}
    </Modal>
  )
}
