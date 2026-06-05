import { useI18n, useLocalized } from '../../i18n/index.jsx'
import stats from '../../data/stats.js'
import useCountUp from '../../hooks/useCountUp.js'
import InfiniteGrid from '../ui/InfiniteGrid.jsx'
import './Stats.css'

function StatItem({ stat }) {
  const L = useLocalized()
  const [value, ref] = useCountUp(stat.value)
  return (
    <div className="stat" ref={ref}>
      <span className="stat__value">
        {value.toLocaleString('en-US')}
        <span className="stat__suffix">{stat.suffix}</span>
      </span>
      <span className="stat__label">{L(stat.label)}</span>
    </div>
  )
}

export default function Stats() {
  const { t } = useI18n()
  return (
    <section className="section stats">
      <InfiniteGrid color="rgba(16,85,114,1)" baseOpacity={0.05} revealOpacity={0.14} />
      <div className="container">
        <div className="stats__head">
          <span className="eyebrow">{t('stats.eyebrow')}</span>
          <h2 className="section-title">{t('stats.title')}</h2>
        </div>
        <div className="stats__grid">
          {stats.map((s) => (
            <StatItem key={s.id} stat={s} />
          ))}
        </div>
      </div>
    </section>
  )
}
