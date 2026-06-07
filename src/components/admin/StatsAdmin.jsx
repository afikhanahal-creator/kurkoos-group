import { useState, useEffect } from 'react'
import { useI18n } from '../../i18n/index.jsx'
import { fetchStats, upsertStat, clearCmsCache } from '../../lib/cms.js'

/* עריכת המונים (count-up). שמירה כל שורה בנפרד. */
export default function StatsAdmin() {
  const { lang } = useI18n()
  const he = lang === 'he'
  const [rows, setRows] = useState([])
  const [saving, setSaving] = useState(null)
  const [saved, setSaved] = useState(null)

  useEffect(() => { clearCmsCache(); fetchStats().then(setRows) }, [])

  const update = (id, patch) => setRows((r) => r.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  const setLabel = (id, key, val) => setRows((r) => r.map((s) => (s.id === id ? { ...s, label: { ...s.label, [key]: val } } : s)))

  const save = async (row) => {
    setSaving(row.id)
    try {
      await upsertStat({
        id: row.id,
        value: Number(row.value),
        suffix: row.suffix || '',
        label: { he: row.label?.he || '', en: row.label?.he || '' },
        sort_order: row.sort_order ?? 0,
      })
      setSaved(row.id)
      setTimeout(() => setSaved(null), 1500)
    } catch (e) {
      alert((he ? 'שגיאה בשמירה: ' : 'Save error: ') + e.message)
    }
    setSaving(null)
  }

  return (
    <div className="adm">
      <p className="adm__hint">{he ? 'ערכו את המספרים והתוויות, ולחצו "שמירה" בכל שורה.' : 'Edit the numbers and labels, then click “Save” on each row.'}</p>
      {rows.map((s) => (
        <div className="adm__row adm__row--stat" key={s.id}>
          <div className="adm__field adm__field--sm">
            <label>{he ? 'ערך' : 'Value'}</label>
            <input type="number" value={s.value} onChange={(e) => update(s.id, { value: e.target.value })} />
          </div>
          <div className="adm__field adm__field--xs">
            <label>{he ? 'סיומת' : 'Suffix'}</label>
            <input value={s.suffix || ''} onChange={(e) => update(s.id, { suffix: e.target.value })} placeholder="+ / K" />
          </div>
          <div className="adm__field">
            <label>תווית</label>
            <input dir="rtl" value={s.label?.he || ''} onChange={(e) => setLabel(s.id, 'he', e.target.value)} />
          </div>
          <button type="button" className="btn btn--primary adm__save" onClick={() => save(s)} disabled={saving === s.id}>
            {saved === s.id ? (he ? 'נשמר ✓' : 'Saved ✓') : saving === s.id ? '…' : (he ? 'שמירה' : 'Save')}
          </button>
        </div>
      ))}
    </div>
  )
}
