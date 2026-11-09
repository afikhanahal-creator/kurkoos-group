import { useEffect, useState } from 'react'
import { useFinance } from './FinanceApp.jsx'
import * as api from './api.js'
import { DOC_TYPE, FIELD_LABEL, SOURCE, date, dateTime, issuesOf, money, nameOf } from './format.js'
import { saveBlob } from './zip.js'
import { Confidence, Icon, Pill, StatusPill, useAsync, Skeleton, askConfirm } from './ui.jsx'
import Attachments from './Attachments.jsx'
import { PAY_LABEL, payState } from './ledger.js'
import Select from './Select.jsx'
import Viewer from './Viewer.jsx'
import { moments } from './moments.js'

const VAT = 0.18
const FIELDS = ['supplier_name', 'supplier_vat_id', 'doc_type', 'doc_number', 'issue_date', 'due_date', 'payment_date', 'currency', 'amount_before_vat', 'vat_amount', 'total_amount', 'category_id', 'business_id', 'project_id', 'description', 'payment_method', 'paid', 'notes']
const blank = (k) => (k === 'paid' ? false : '')
const SOURCE_LABEL = { rule: 'כלל אוטומציה', supplier: 'ברירת מחדל של הספק', history: 'היסטוריית אישורים', document: 'מופיע במסמך', mailbox: 'לפי תיבת המייל', ai: 'הצעת AI' }

function Preview({ doc }) {
  const [src, setSrc] = useState(null)
  const [html, setHtml] = useState(null)
  const [err, setErr] = useState('')
  useEffect(() => {
    let alive = true
    let url = null
    setSrc(null); setHtml(null); setErr('')
    if (!doc.file_path) return undefined
    ;(async () => {
      try {
        const b = await api.fileBlob(doc)
        if ((doc.file_mime || '').startsWith('text/')) { if (alive) setHtml(await b.text()) } else { url = URL.createObjectURL(b); if (alive) setSrc(url) }
      } catch (e) { if (alive) setErr(e.message) }
    })()
    return () => { alive = false; if (url) URL.revokeObjectURL(url) }
  }, [doc.file_path, doc.file_mime])
  if (!doc.file_path) return <div className="fin-msg">אין קובץ</div>
  if (err) return <p className="fin-error fin-error--block" role="alert">הקובץ לא נטען: {err}</p>
  if (html !== null) return <iframe className="fin-preview__frame" title="המייל המקורי" sandbox="" srcDoc={html} />
  if (!src) return <div className="fin-viewer"><div className="fin-viewer__scroll"><div className="fin-viewer__page fin-viewer__page--skel" aria-busy="true" aria-label="טוען את המסמך" /></div></div>
  return <Viewer blobUrl={src} mime={doc.file_mime} name={doc.file_name} doc={doc} />
}

export default function DocumentPanel({ doc, onClose, onSaved, onDeleted, onPrev, onNext }) {
  const { businesses, projects, categories, mailboxes, suppliers, allocations, can, go, reload } = useFinance()
  const supplierRow = suppliers.find((x) => x.id === doc.supplier_id)
  const myAlloc = allocations.filter((a) => a.document_id === doc.id)
  const [split, setSplit] = useState(() => (myAlloc.length ? myAlloc.map((a) => ({ project_id: a.project_id, amount: String(a.amount) })) : null))
  const [splitMsg, setSplitMsg] = useState('')
  const editable = can('edit') || (can('upload') && ['processing', 'review', 'failed'].includes(doc.status))
  const [form, setForm] = useState(() => Object.fromEntries(FIELDS.map((k) => [k, doc[k] ?? blank(k)])))
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')
  const [tab, setTab] = useState('fields')
  const history = useAsync(() => api.loadAudit({ entity: 'document', entityId: doc.id, limit: 50 }), [doc.updated_at])
  const dirty = FIELDS.some((k) => String(form[k] ?? '') !== String(doc[k] ?? blank(k)))
  const fc = doc.field_confidence || {}
  // the raw reading is not in the list (it is heavy): fetched with the document when the panel opens
  const full = useAsync(() => (doc.extraction !== undefined ? Promise.resolve(doc) : api.loadDocumentFull(doc.id).catch(() => doc)), [doc.id, doc.updated_at])
  const issues = issuesOf(doc)
  const issueFor = (k) => issues.filter((i) => i.field === k)
  const sug = doc.suggestions || {}
  const mailbox = mailboxes.find((m) => m.id === doc.mailbox_id)
  const { documents } = useFinance()
  const original = doc.duplicate_of ? documents.find((d) => d.id === doc.duplicate_of) : null
  const decideDuplicate = async (decision) => {
    setBusy(`dup-${decision}`); setErr('')
    try { const r = await api.callServer('duplicate-decide', { document_id: doc.id, decision }); onSaved(r.document) } catch (e) { setErr(e.message) } finally { setBusy('') }
  }

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest('input, select, textarea')) return
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft' && onNext) onNext()
      if (e.key === 'ArrowRight' && onPrev) onPrev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, onNext, onPrev])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))
  const clean = () => {
    const out = {}
    for (const k of FIELDS) {
      let v = form[k]
      if (['amount_before_vat', 'vat_amount', 'total_amount'].includes(k)) v = v === '' || v === null ? null : Number(v)
      else if (['issue_date', 'due_date', 'payment_date', 'business_id', 'project_id', 'category_id'].includes(k)) v = v || null
      out[k] = v
    }
    // a split document's projects live in its allocations: the single project field is not sent back
    if (myAlloc.length > 1 || (split && split.length > 1)) delete out.project_id
    return out
  }
  const save = async (extra = {}) => {
    setBusy(extra.status || 'save'); setErr('')
    try {
      let saved = await api.updateDocument(doc.id, { ...clean(), ...extra })
      // the rules run again on what the person typed (sums, VAT, duplicates); confidence of edited fields becomes 100%
      if (dirty) { const r = await api.callServer('revalidate', { document_id: doc.id }).catch(() => null); if (r?.document) saved = r.document }
      onSaved(saved)
      return saved
      if (extra.status === 'approved' && saved.status !== 'approved' && saved.first_approved_by) setErr('נרשמה חתימה ראשונה. מסמך מעל סף האישור הכפול מחכה למאשר נוסף.')
    } catch (e) { setErr(/SECOND_APPROVAL/.test(e.message) ? 'המסמך דורש מאשר שני, שונה ממי שאישר ראשון' : /PROJECT_COMPANY/.test(e.message) ? 'הפרויקט שייך לחברה אחרת. בחרו פרויקט של אותה חברה' : e.message) } finally { setBusy('') }
  }
  const approve = async () => {
    const errors = issues.filter((i) => i.level === 'error' && i.code !== 'ai_note')
    if (!form.business_id) { setErr('לפני אישור צריך לשייך את המסמך לחברה'); return }
    if (errors.length && !(await askConfirm({ title: 'לאשר למרות הבעיות?', text: `יש במסמך ${errors.length === 1 ? 'בעיה אחת' : `${errors.length} בעיות`}:`, lines: errors.map((i) => `${FIELD_LABEL[i.field] || ''} ${i.message}`.trim()), ok: 'אישור בכל זאת', danger: true }))) return
    const btn = document.activeElement
    const s = await save({ status: 'approved' })
    if (s?.status === 'approved') moments.approve({ from: btn, title: 'המסמך אושר', sub: doc.supplier_name || '' })
  }
  const reread = async () => {
    setBusy('extract'); setErr('')
    try {
      const { document } = await api.callServer('extract', { document_id: doc.id })
      if (document) { onSaved(document); setForm(Object.fromEntries(FIELDS.map((k) => [k, document[k] ?? blank(k)]))) }
    } catch (e) { setErr(e.message) } finally { setBusy('') }
  }
  const remove = async () => {
    if (!(await askConfirm({ title: 'מחיקת המסמך', text: 'מסמך לא רלוונטי (לא חשבונית, נשלח בטעות, כפול לגמרי) נמחק יחד עם הקובץ והנספחים שלו. אי אפשר לבטל, והמחיקה נרשמת ביומן. מסמך שאולי עוד יידרש עדיף לדחות.', ok: 'מחיקה', danger: true }))) return
    setBusy('delete')
    try { await api.deleteDocument(doc); onDeleted() } catch (e) { setErr(e.message); setBusy('') }
  }
  const calc = () => {
    const t = Number(form.total_amount); const b = Number(form.amount_before_vat); const v = Number(form.vat_amount)
    if (t && !b && !v) setForm((f) => ({ ...f, amount_before_vat: (t / (1 + VAT)).toFixed(2), vat_amount: (t - t / (1 + VAT)).toFixed(2) }))
    else if (b && !t && !v) setForm((f) => ({ ...f, vat_amount: (b * VAT).toFixed(2), total_amount: (b * (1 + VAT)).toFixed(2) }))
    else if (t && b && !v) setForm((f) => ({ ...f, vat_amount: (t - b).toFixed(2) }))
  }

  /* one input, marked by its confidence and its issues */
  const F = ({ k, label, type = 'text', wide, children, conf = k }) => {  // called as a function, not a component (keeps input focus)
    const c = fc[conf]
    const its = issueFor(k)
    const tone = its.some((i) => i.level === 'error') ? 'error' : its.length || (typeof c === 'number' && c < 0.7) ? 'warn' : (doc[k] === null || doc[k] === '' || doc[k] === undefined) && ['supplier_name', 'doc_number', 'issue_date', 'total_amount'].includes(k) ? 'error' : ''
    return (
      <label className={`fin-field ${wide ? 'fin-field--wide' : ''} ${tone ? `fin-field--${tone}` : ''}`}>
        <span className="fin-field__label">{label || FIELD_LABEL[k]}{typeof c === 'number' && <Confidence value={c} />}</span>
        {children || <input type={type} value={form[k] ?? ''} onChange={set(k)} disabled={!editable} step={type === 'number' ? '0.01' : undefined} inputMode={type === 'number' ? 'decimal' : undefined} onBlur={type === 'number' ? calc : undefined} dir={['doc_number', 'supplier_vat_id'].includes(k) ? 'ltr' : undefined} />}
        {its.map((i) => <span key={i.code} className={`fin-field__hint fin-field__hint--${i.level}`}>{i.message}</span>)}
      </label>
    )
  }
  const Suggest = ({ k, list }) => {  // called as a function
    const s = sug[k]
    if (!s || !s.value || (k === 'category' ? categories.find((c) => c.id === form.category_id)?.name === s.value : String(form[k] || '') === String(s.value))) return null
    const name = list ? nameOf(list, s.value) : s.value
    if (!name) return null
    return (
      <p className="fin-suggest">
        <Icon name="sparkle" size={15} /> הצעה: <strong>{name}</strong> <span className="fin-muted">({SOURCE_LABEL[s.source] || s.source}{s.reason ? `: ${s.reason}` : ''})</span>
        {editable && <button type="button" className="fin-link" onClick={() => setForm((f) => (k === 'category' ? { ...f, category_id: categories.find((c) => c.name === s.value)?.id || f.category_id } : { ...f, [k]: s.value }))}>החלה</button>}{typeof s.confidence === 'number' && <span className="fin-muted"> {Math.round(s.confidence * 100)}%</span>}
      </p>
    )
  }

  return (
    <div className="fin-panel" role="dialog" aria-modal="true" aria-label={`מסמך: ${doc.supplier_name || doc.file_name}`}>
      <button type="button" className="fin-panel__scrim" aria-label="סגירה" tabIndex={-1} onClick={onClose} />
      <div className="fin-panel__body">
        <header className="fin-panel__head">
          <div className="fin-panel__title">
            <h2>{doc.supplier_name || doc.file_name || 'מסמך'}</h2>
            <p className="fin-muted fin-panel__meta"><StatusPill status={doc.status} /> {payState(doc) !== 'na' && <Pill tone={payState(doc) === 'proof' ? 'ok' : payState(doc) === 'manual' ? 'info' : 'warn'}><Icon name={payState(doc) === 'proof' ? 'check' : payState(doc) === 'manual' ? 'edit' : 'clock'} size={12} /> {payState(doc) === 'open' ? 'לא שולם' : PAY_LABEL[payState(doc)]}</Pill>} <span>{DOC_TYPE[doc.doc_type]}{doc.doc_number ? ` ${doc.doc_number}` : ''}</span> <span>{money(doc.total_amount, doc.currency)}</span> <span className="fin-nowrap">ודאות <Confidence value={doc.confidence} /></span></p>
          </div>
          <div className="fin-panel__nav">
            {doc.file_path && <button type="button" className="fin-icon-btn" onClick={async () => saveBlob(await api.fileBlob(doc), doc.file_name || 'document')} aria-label="הורדת הקובץ המקורי" title="הורדת הקובץ המקורי"><Icon name="download" /></button>}
            <button type="button" className="fin-icon-btn" onClick={onPrev} disabled={!onPrev} aria-label="המסמך הקודם" title="הקודם"><Icon name="back" /></button>
            <button type="button" className="fin-icon-btn" onClick={onNext} disabled={!onNext} aria-label="המסמך הבא" title="הבא"><Icon name="next" /></button>
            <button type="button" className="fin-icon-btn" onClick={onClose} aria-label="סגירה"><Icon name="close" /></button>
          </div>
        </header>

        {doc.status === 'processing' && <p className="fin-panel__banner is-info" role="status"><Icon name="sparkle" size={16} /> {({ ocr: 'הסוכנים קוראים את המסמך…', validating: 'בודקים את הסכומים…', matching: 'מזהים ספק, חברה ופרויקט…' })[doc.stage] || 'המסמך בעיבוד…'}</p>}
        {doc.status === 'failed' && <p className="fin-panel__banner is-attn" role="status"><Icon name="alert" size={16} /> <span>{doc.next_retry_at ? 'הקריאה נכשלה. הסוכנים ינסו שוב בסריקת הלילה, או שאפשר לנסות עכשיו.' : 'הקריאה נכשלה כמה פעמים. אפשר לנסות שוב או למלא את הפרטים ידנית.'}</span>{editable && <button type="button" className="fin-btn fin-btn--sm" onClick={reread} disabled={!!busy}>{busy === 'extract' ? 'קורא…' : 'קריאה מחדש עכשיו'}</button>}</p>}
        {doc.duplicate_state === 'suspected' && doc.status === 'review' && (
          <div className="fin-panel__banner is-warn" role="status">
            <Icon name="copy" size={16} />
            <span>ייתכן שזה כפול של {original ? <button type="button" className="fin-link" onClick={() => go(`/documents/${original.id}`)}>{original.supplier_name || original.file_name}{original.doc_number ? ` ${original.doc_number}` : ''} ({money(original.total_amount, original.currency)})</button> : 'מסמך אחר'}: אותו ספק, אותו סכום ותאריך קרוב.</span>
            {can('edit') && <span className="fin-panel__banner-actions"><button type="button" className="fin-btn fin-btn--sm" onClick={() => decideDuplicate('duplicate')} disabled={!!busy}>זה כפול</button><button type="button" className="fin-btn fin-btn--sm fin-btn--ghost" onClick={() => decideDuplicate('not')} disabled={!!busy}>לא כפול</button></span>}
          </div>
        )}
        {doc.status === 'duplicate' && original && <p className="fin-panel__banner" role="status"><Icon name="copy" size={16} /> סומן ככפול של <button type="button" className="fin-link" onClick={() => go(`/documents/${original.id}`)}>{original.supplier_name || original.file_name}{original.doc_number ? ` ${original.doc_number}` : ''}</button></p>}

        <div className="fin-panel__split">
          <div className="fin-preview"><Preview doc={doc} /></div>

          <div className="fin-panel__side">
            <div className="fin-tabs fin-tabs--small" role="tablist" aria-label="פרטי המסמך">
              {[['fields', 'פרטים'], ['checks', `בקרה${issues.length ? ` (${issues.length})` : ''}`], ['source', 'מקור'], ['history', 'היסטוריה']].map(([id, label]) => (
                <button key={id} type="button" role="tab" aria-selected={tab === id} className={`fin-tab ${tab === id ? 'is-active' : ''}`} onClick={() => setTab(id)}>{label}</button>
              ))}
            </div>

            {tab === 'fields' && (
              <form className="fin-form" onSubmit={(e) => { e.preventDefault(); save() }}>
                {doc.status === 'processing' && <p className="fin-note"><Icon name="sparkle" size={16} /> הסוכנים קוראים את המסמך…</p>}
                {doc.status === 'duplicate' && <p className="fin-note fin-note--warn"><Icon name="copy" size={16} /> זוהה ככפילות של מסמך קיים.</p>}
                {['approved', 'sent'].includes(doc.status) && editable && <p className="fin-note"><Icon name="shield" size={16} /> מסמך מאושר. שינוי בסכומים, בספק או בשיוך יחזיר אותו לאישור.</p>}
                {/* the three numbers that matter, read at a glance before the fields: net, VAT with its rate, and the total */}
                {(() => {
                  const net = Number(form.amount_before_vat); const vat = Number(form.vat_amount); const tot = Number(form.total_amount)
                  if (![net, vat, tot].some((v) => Number.isFinite(v) && v !== 0)) return null
                  const rate = Number.isFinite(net) && net && Number.isFinite(vat) ? Math.round((vat / net) * 100) : null
                  const cur = form.currency || 'ILS'
                  return (
                    <dl className="fin-amounts" aria-label="סכומי המסמך">
                      <div><dt>סכום נטו</dt><dd>{Number.isFinite(net) && form.amount_before_vat !== '' && form.amount_before_vat != null ? money(net, cur) : '—'}</dd></div>
                      <div><dt>מע״מ{rate !== null ? ` (${rate}%)` : ''}</dt><dd>{Number.isFinite(vat) && form.vat_amount !== '' && form.vat_amount != null ? money(vat, cur) : '—'}</dd></div>
                      <div className="is-total"><dt>סכום כולל</dt><dd>{Number.isFinite(tot) && form.total_amount !== '' && form.total_amount != null ? money(tot, cur) : '—'}</dd></div>
                    </dl>
                  )
                })()}
                <div className="fin-form__grid">
                  {F({ k: 'supplier_name', wide: true })}
                  {(supplierRow || doc.suggestions?.supplier) && (
                    <div className="fin-field--wide fin-supplier-link">
                      {supplierRow ? <>
                        <span>רשומת ספק: <button type="button" className="fin-link" onClick={() => go(`/suppliers/${supplierRow.id}`)}>{supplierRow.name}</button></span>
                        {supplierRow.status === 'pending' ? <><Pill tone="attn">ספק חדש, ממתין לאישור</Pill>{can('edit') && <button type="button" className="fin-btn fin-btn--sm" onClick={async () => { try { await api.saveRow('fin_suppliers', { id: supplierRow.id, status: 'active' }); await api.callServer('revalidate', { document_id: doc.id }).then((r) => r?.document && onSaved(r.document)).catch(() => {}); reload() } catch (e) { setErr(e.message) } }}>אישור הספק</button>}</>
                          : <Pill tone="ok">{doc.suggestions?.supplier?.match === 'id' ? 'זוהה לפי ח.פ' : doc.suggestions?.supplier?.match === 'name' ? 'זוהה לפי שם' : doc.suggestions?.supplier?.match === 'new' ? 'נוצר מהחשבונית' : 'מקושר'}</Pill>}
                      </> : <span className="fin-muted">לא נמצא ספק תואם</span>}
                    </div>
                  )}
                  {F({ k: 'supplier_vat_id' })}
                  {F({ k: 'doc_type', children: <><Select value={form.doc_type || ''} onChange={set('doc_type')} disabled={!editable}>{Object.entries(DOC_TYPE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></> })}
                  {F({ k: 'doc_number' })}
                  {F({ k: 'issue_date', type: 'date' })}
                  {F({ k: 'payment_date', type: 'date' })}
                  {F({ k: 'due_date', type: 'date' })}
                  {F({ k: 'currency', children: <><Select value={form.currency || 'ILS'} onChange={set('currency')} disabled={!editable}>{['ILS', 'USD', 'EUR', 'GBP'].map((c) => <option key={c} value={c}>{c}</option>)}</Select></> })}
                  {F({ k: 'amount_before_vat', type: 'number' })}
                  {F({ k: 'vat_amount', type: 'number' })}
                  {F({ k: 'total_amount', type: 'number' })}
                  {F({ k: 'category_id', conf: 'category', label: 'קטגוריה', children: <><Select value={form.category_id || ''} onChange={set('category_id')} disabled={!editable}><option value="">בחרו…</option>{categories.filter((c) => c.active !== false || c.id === form.category_id).map((c) => <option key={c.id} value={c.id}>{c.parent_id ? '— ' : ''}{c.name}</option>)}</Select></> })}
                  <div className="fin-field--wide">{Suggest({ k: 'category' })}</div>
                  {F({ k: 'business_id', children: <><Select value={form.business_id || ''} onChange={set('business_id')} disabled={!editable}><option value="">בחרו…</option>{businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</Select></> })}
                  {F({ k: 'project_id', children: <><Select value={form.project_id || ''} onChange={set('project_id')} disabled={!editable || !!split}><option value="">{split ? 'מפוצל בין פרויקטים' : 'ללא פרויקט'}</option>{projects.filter((p) => !form.business_id || !p.business_id || p.business_id === form.business_id).map((p) => <option key={p.id} value={p.id}>{p.name}{p.code ? ` (${p.code})` : ''}</option>)}</Select></> })}
                  <div className="fin-field--wide">{Suggest({ k: 'business_id', list: businesses })}{Suggest({ k: 'project_id', list: projects })}</div>
                  {can('edit') && (
                    <div className="fin-field--wide fin-splitbox">
                      {!split ? <button type="button" className="fin-link" onClick={() => setSplit([{ project_id: form.project_id || '', amount: String(doc.total_amount ?? '') }, { project_id: '', amount: '' }])}>פיצול החשבונית בין כמה פרויקטים</button> : (() => {
                        const total = Number(doc.total_amount) || 0
                        const used = split.reduce((a, r) => a + (Number(r.amount) || 0), 0)
                        const left = Math.round((total - used) * 100) / 100
                        return (
                          <>
                            <strong>פיצול בין פרויקטים</strong>
                            {split.map((r, n) => (
                              <div key={n} className="fin-splitbox__row">
                                <Select value={r.project_id} onChange={(e) => setSplit(split.map((x, m) => (m === n ? { ...x, project_id: e.target.value } : x)))} aria-label={`פרויקט ${n + 1}`}><option value="">פרויקט…</option>{projects.filter((p) => !form.business_id || p.business_id === form.business_id).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select>
                                <input type="number" step="0.01" inputMode="decimal" value={r.amount} onChange={(e) => setSplit(split.map((x, m) => (m === n ? { ...x, amount: e.target.value } : x)))} aria-label={`סכום ${n + 1}`} />
                                <button type="button" className="fin-icon-btn" onClick={() => setSplit(split.filter((_, m) => m !== n))} aria-label="הסרת שורה"><Icon name="x" size={16} /></button>
                              </div>
                            ))}
                            <div className="fin-splitbox__foot">
                              <button type="button" className="fin-link" onClick={() => setSplit([...split, { project_id: '', amount: left > 0 ? String(left) : '' }])}>הוספת פרויקט</button>
                              <span className={Math.abs(left) > 0.01 ? 'fin-attn-text' : 'fin-ok-text'}>{Math.abs(left) > 0.01 ? `נותרו ${money(left)} לחלוקה` : 'מתאזן לסה״כ החשבונית'}</span>
                              <button type="button" className="fin-btn fin-btn--sm fin-btn--primary" disabled={Math.abs(left) > 0.01 || split.some((r) => !r.project_id)} onClick={async () => { setSplitMsg(''); try { await api.setAllocations(doc.id, split.map((r) => ({ project_id: r.project_id, amount: Number(r.amount) }))); setSplitMsg('הפיצול נשמר'); reload() } catch (e) { setSplitMsg(/SPLIT_TOTAL/.test(e.message) ? 'הסכומים לא מתאזנים לסה״כ החשבונית' : e.message) } }}>שמירת הפיצול</button>
                              {myAlloc.length > 0 && <button type="button" className="fin-link" onClick={async () => { await api.setAllocations(doc.id, []); setSplit(null); reload() }}>ביטול הפיצול</button>}
                            </div>
                            {splitMsg && <span className="fin-field__hint">{splitMsg}</span>}
                          </>
                        )
                      })()}
                    </div>
                  )}
                  {doc.requires_second_approval && <p className="fin-field--wide fin-callout fin-callout--warn">מסמך מעל סף האישור הכפול: צריך שני מאשרים שונים.{doc.first_approved_at ? ` חתימה ראשונה נרשמה (${dateTime(doc.first_approved_at)}).` : ''}</p>}
                  {F({ k: 'payment_method', children: <><input value={form.payment_method || ''} onChange={set('payment_method')} list="fin-pay" disabled={!editable} /></> })}
                  <label className="fin-field fin-field--check"><input type="checkbox" checked={!!form.paid} onChange={set('paid')} disabled={!editable} /> שולם</label>
                  {F({ k: 'description', wide: true })}
                  {F({ k: 'notes', wide: true, children: <><textarea rows={2} value={form.notes || ''} onChange={set('notes')} disabled={!editable} /></> })}
                </div>
                <datalist id="fin-pay">{['אשראי', 'העברה בנקאית', 'מזומן', 'צ׳ק', 'הוראת קבע'].map((p) => <option key={p} value={p} />)}</datalist>
                {err && <p className="fin-error fin-error--block" role="alert">{err}</p>}
                {editable && (
                  <div className="fin-form__actions">
                    {can('approve') && !['approved', 'sent'].includes(doc.status) && <button type="button" className="fin-btn fin-btn--primary" disabled={!!busy || doc.status === 'processing'} onClick={approve}><Icon name="check" size={18} /> {dirty ? 'שמירה ואישור' : 'אישור'}</button>}
                    <button type="submit" className={`fin-btn ${can('approve') && !['approved', 'sent'].includes(doc.status) ? '' : 'fin-btn--primary'}`} disabled={!!busy || !dirty}>שמירה</button>
                    {!['approved', 'sent'].includes(doc.status) && <button type="button" className="fin-btn" disabled={!!busy || !doc.file_path} onClick={reread}><Icon name="sparkle" size={18} /> {busy === 'extract' ? 'קורא…' : 'קריאה מחדש'}</button>}
                    {can('edit') && !['approved', 'sent', 'rejected'].includes(doc.status) && <button type="button" className="fin-btn" disabled={!!busy} onClick={() => save({ status: 'rejected' })}><Icon name="x" size={18} /> דחייה</button>}
                    {can('edit') && !['approved', 'sent', 'duplicate'].includes(doc.status) && <button type="button" className="fin-btn" disabled={!!busy} onClick={() => save({ status: 'duplicate' })}><Icon name="copy" size={18} /> כפול</button>}
                    {can('edit') && ['rejected', 'duplicate', 'approved'].includes(doc.status) && <button type="button" className="fin-btn" disabled={!!busy} onClick={() => save({ status: 'review' })}>החזרה לבדיקה</button>}
                    {(can('manage') || (can('operate') && !['approved', 'sent'].includes(doc.status))) && <button type="button" className="fin-btn fin-btn--danger" disabled={!!busy} onClick={remove} aria-label="מחיקה (מסמך לא רלוונטי)" title="מחיקה: מסמך לא רלוונטי"><Icon name="trash" size={18} /> מחיקה</button>}
                  </div>
                )}
                {/* attachments scroll with the details, under the actions, instead of a strip pinned to the bottom */}
                <Attachments doc={doc} />
              </form>
            )}

            {tab === 'checks' && (
              <div className="fin-checks">
                {issues.length === 0 ? <p className="fin-note"><Icon name="check" size={16} /> כל הבדיקות עברו: הסכומים מסתדרים, המע״מ תקין ואין כפילות.</p> : (
                  <ul className="fin-issues">
                    {issues.map((i, n) => <li key={n} className={`fin-issue fin-issue--${i.level}`}><Pill tone={i.level === 'error' ? 'bad' : i.level === 'warn' ? 'warn' : 'info'}>{i.level === 'error' ? 'שגיאה' : i.level === 'warn' ? 'אזהרה' : 'הערה'}</Pill><span>{i.field ? <strong>{FIELD_LABEL[i.field] || i.field}: </strong> : null}{i.message}</span></li>)}
                  </ul>
                )}
                <h4>ודאות לכל שדה</h4>
                <table className="fin-table fin-table--plain">
                  <tbody>{Object.entries(fc).map(([k, v]) => <tr key={k}><td>{FIELD_LABEL[k] || k}</td><td>{String(full.data?.extraction?.[k] ?? doc[k] ?? '—')}</td><td><Confidence value={v} /></td></tr>)}</tbody>
                </table>
                {!Object.keys(fc).length && <p className="fin-muted">אין עדיין קריאה של AI.</p>}
              </div>
            )}

            {tab === 'source' && (
              <dl className="fin-dl">
                <dt>מקור</dt><dd>{SOURCE[doc.source]}{mailbox ? <> · <span dir="ltr">{mailbox.email}</span></> : ''}</dd>
                {doc.email_from && <><dt>שולח</dt><dd dir="ltr">{doc.email_from}</dd></>}
                {doc.email_subject && <><dt>נושא המייל</dt><dd>{doc.email_subject}</dd></>}
                {doc.email_date && <><dt>תאריך המייל</dt><dd>{dateTime(doc.email_date)}</dd></>}
                <dt>נאסף</dt><dd>{dateTime(doc.created_at)}</dd>
                <dt>עובד ע״י AI</dt><dd>{doc.processed_at ? `${dateTime(doc.processed_at)} · ניסיון ${doc.attempts || 1}` : 'עוד לא'}</dd>
                <dt>אושר</dt><dd>{doc.approved_at ? dateTime(doc.approved_at) : '—'}</dd>
                <dt>יוצא</dt><dd>{doc.exported_at ? dateTime(doc.exported_at) : '—'}</dd>
                <dt>קובץ</dt><dd>{doc.file_name} · {doc.file_size ? `${Math.round(doc.file_size / 1024)}KB` : ''}</dd>
                <dt>תקופה חשבונאית</dt><dd>{doc.accounting_period || '—'}</dd>
                <dt>תאריך מסמך</dt><dd>{date(doc.issue_date)}</dd>
              </dl>
            )}

            {tab === 'history' && (
              <div className="fin-history">
                {history.loading ? <Skeleton /> : (history.data || []).length === 0 ? <p className="fin-muted">אין היסטוריה.</p> : (
                  <ol className="fin-audit">
                    {history.data.map((a) => (
                      <li key={a.id}>
                        <strong>{({ created: 'נוצר', updated: 'תיקון ידני', approved: 'אושר', rejected: 'נדחה', exported: 'יוצא לרו״ח', marked_duplicate: 'סומן ככפול', ai_processed: 'נקרא ע״י AI', deleted: 'נמחק' })[a.action] || a.action}</strong>
                        <span className="fin-muted"> · {a.user_email === 'agent' || !a.user_email ? 'סוכן AI' : a.user_email} · {dateTime(a.at)}</span>
                        {a.changes && a.action !== 'created' && (
                          <ul>{Object.entries(a.changes).filter(([k]) => FIELD_LABEL[k]).map(([k, v]) => <li key={k}>{FIELD_LABEL[k]}: <s>{fmt(v?.from, k, businesses, projects)}</s> ← {fmt(v?.to, k, businesses, projects)}</li>)}</ul>
                        )}
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function fmt(v, k, businesses, projects) {
  if (v === null || v === undefined || v === '') return '—'
  if (k === 'business_id') return nameOf(businesses, v) || v
  if (k === 'project_id') return nameOf(projects, v) || v
  if (k === 'doc_type') return DOC_TYPE[v] || v
  if (k === 'status') return ({ review: 'לבדיקה', approved: 'מוכן לרו״ח', sent: 'נשלח לרו״ח', rejected: 'נדחה', duplicate: 'כפול', failed: 'שגיאה', processing: 'בעיבוד' })[v] || v
  return String(v)
}
