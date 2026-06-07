import { useState, useEffect } from 'react'
import { useI18n, useLocalized } from '../../i18n/index.jsx'
import statsData from '../../data/stats.js'
import useCountUp from '../../hooks/useCountUp.js'
import InfiniteGrid from '../ui/InfiniteGrid.jsx'
import { supabase } from '../../lib/supabase.js'
import { listCounters } from '../../lib/cms.js'
import './Stats.css'

function StatItem({ value, suffix, label }) {
  const num = typeof value === 'number' ? value : Number(String(value ?? '').replace(/[^\d.]/g, ''))
  const isNum = !Number.isNaN(num) && String(value ?? '').trim() !== ''
  const [counted, ref] = useCountUp(isNum ? num : 0)
  return (
    <div className="stat" ref={ref}>
      <span className="stat__value">
        {isNum ? counted.toLocaleString('en-US') : value}
        <span className="stat__suffix">{suffix}</span>
      </span>
      <span className="stat__label">{label}</span>
    </div>
  )
}

export default function Stats() {
  const { t } = useI18n()
  const L = useLocalized()
  const [items, setItems] = useState(() =>
    statsData.map((s) => ({ id: s.id, value: s.value, suffix: s.suffix, label: L(s.label) }))
  )

  useEffect(() => {
    if (!supabase) return
    listCounters({ activeOnly: true })
      .then((rows) => {
        if (rows && rows.length) setItems(rows.map((c) => ({ id: c.id, value: c.value, suffix: c.suffix, label: c.label_he })))
      })
      .catch(() => {})
  }, [])

  return (
    <section className="section stats">
      <InfiniteGrid color="rgba(16,85,114,1)" baseOpacity={0.05} revealOpacity={0.14} />
      <div className="container">
        <div className="stats__head">
          <span className="eyebrow">{t('stats.eyebrow')}</span>
          <h2 className="section-title">{t('stats.title')}</h2>
        </div>
        <div className="stats__grid">
          {items.map((s) => (
            <StatItem key={s.id} value={s.value} suffix={s.suffix} label={s.label} />
          ))}
        </div>
      </div>
    </section>
  )
}
