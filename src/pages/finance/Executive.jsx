import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useFinance } from './FinanceApp.jsx'
import { arrivedAt, byArrival, ago, date, money, DOC_TYPE } from './format.js'
import { overview, periodOf, monthName } from './insights.js'
import { exportSheet } from './exportPackage.js'
import DateRange from './DateRange.jsx'
import Select from './Select.jsx'
import { Empty, Icon, InfoTip, Pill } from './ui.jsx'
import { payState } from './ledger.js'
import { unsureNumbers } from './Documents.jsx'
import { useSession } from './session.js'
import { ProviderLogo } from './logos.jsx'
import { docDate, signedTotal } from './format.js'
import { openDocs } from './links.js'

/* The group's financial picture in one screen: what was spent, where it went, which project costs most, who the main
   suppliers are, and what needs the CEO's attention. Every figure comes from stored documents (insights.js), follows
   the bookkeeping rules (ledger.js: a receipt that pays an invoice is not counted again), and opens the documents behind it. */
const SPANS = [['3', '3 חודשים'], ['6', '6 חודשים'], ['12', '12 חודשים'], ['year', 'השנה']]
const PERIODS = [['month', 'החודש'], ['last_month', 'החודש שעבר'], ['quarter', 'הרבעון'], ['ytd', 'מתחילת השנה'], ['12m', '12 חודשים'], ['year_last', 'השנה שעברה'], ['custom', 'טווח תאריכים…']]
const short = (v) => { const a = Math.abs(v); return a >= 1e6 ? `${(v / 1e6).toFixed(a >= 1e7 ? 1 : 2)}M ₪` : a >= 1e5 ? `${Math.round(v / 1e3)}K ₪` : `${Math.round(v).toLocaleString('he-IL')} ₪` }

function Delta({ value, invert = false, label = 'מהתקופה הקודמת' }) {
  if (value === null || value === undefined || !Number.isFinite(value)) return <span className="fin-x-delta is-none">אין בסיס להשוואה</span>
  const up = value > 0.5; const down = value < -0.5
  // for spending, up is the direction to watch; the colour says "look", not "good" or "bad"
  return <span className={`fin-x-delta ${up ? (invert ? 'is-good' : 'is-watch') : down ? (invert ? 'is-watch' : 'is-good') : ''}`}>{up ? '▲' : down ? '▼' : '•'} {Math.abs(Math.round(value))}% {label}</span>
}

export default function Executive() {
  const { documents, businesses, projects, categories, allocations, members, go, can } = useFinance()
  const me = useSession()
  const firstName = (members.find((m) => m.user_id === me?.id)?.full_name || '').split(' ')[0]
  const hour = new Date().getHours()
  const hello = hour < 12 ? 'בוקר טוב' : hour < 17 ? 'צהריים טובים' : 'ערב טוב'
  const [feed, setFeed] = useState('all')
  const [pk, setPk] = useState(() => { try { return sessionStorage.getItem('fin-x-period') || 'month' } catch { return 'month' } })
  const [custom, setCustom] = useState({ from: '', to: '' })
  // the company in view lives in the address (?company=<id>), so a company picture can be bookmarked or shared
  const [params, setParams] = useSearchParams()
  const biz = businesses.some((b) => b.id === params.get('company')) ? params.get('company') : ''
  const setBiz = (id) => { const p = new URLSearchParams(params); if (id) p.set('company', id); else p.delete('company'); setParams(p, { replace: true }); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const [hover, setHover] = useState(null)
  const pickPeriod = (v) => { setPk(v); try { sessionStorage.setItem('fin-x-period', v) } catch { /* noop */ } }
  const period = useMemo(() => periodOf(pk === 'custom' && !(custom.from && custom.to) ? 'month' : pk, new Date(), custom), [pk, custom])
  const o = useMemo(() => overview(documents, { businesses, projects, categories, allocations }, period, { businessId: biz || null }), [documents, businesses, projects, categories, allocations, period, biz])
  // the whole group for the same period: the amount on every company tab and this company's share of the group
  const group = useMemo(() => (biz ? overview(documents, { businesses, projects, categories, allocations }, period) : o), [biz, o, documents, businesses, projects, categories, allocations, period])
  const k = o.kpi
  // recent activity, newest first, grouped by day (today, yesterday, then the date)
  const feedRows = useMemo(() => documents.filter((d) => (!biz || d.business_id === biz) && d.status !== 'archived' && (feed === 'all' || (feed === 'open' ? payState(d) === 'open' : d.status === 'review')))
    .sort(byArrival).slice(0, 14), [documents, biz, feed])
  const feedDays = useMemo(() => {
    const dayOf = (t) => new Date(t).toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' })
    const today = dayOf(Date.now()); const yday = dayOf(Date.now() - 86400000)
    const m = new Map()
    for (const d of feedRows) { const k = dayOf(arrivedAt(d)); const label = k === today ? 'היום' : k === yday ? 'אתמול' : date(k); if (!m.has(label)) m.set(label, []); m.get(label).push(d) }
    return [...m.entries()]
  }, [feedRows])
  const weekNew = documents.filter((d) => (!biz || d.business_id === biz) && Date.now() - new Date(d.created_at).getTime() < 7 * 86400000).length
  const last = documents.map((d) => d.updated_at || d.created_at).filter(Boolean).sort().pop()
  // the monthly chart is anchored at this month, whatever period is in view; a month picked on it becomes the period
  const nowPeriod = useMemo(() => periodOf('month', new Date()), [])
  const nowKey = nowPeriod.from.slice(0, 7)
  const base = useMemo(() => (period.to.slice(0, 7) === nowKey && period.key === 'month' ? o : overview(documents, { businesses, projects, categories, allocations }, nowPeriod, { businessId: biz || null })), [o, period, nowKey, nowPeriod, documents, businesses, projects, categories, allocations, biz])
  const [span, setSpan] = useState(() => { const d = typeof window !== 'undefined' && window.matchMedia('(max-width: 560px)').matches ? '6' : '12'; try { return sessionStorage.getItem('fin-x-span') || d } catch { return d } })
  const pickSpan = (v) => { setSpan(v); try { sessionStorage.setItem('fin-x-span', v) } catch { /* noop */ } }
  const months = span === 'year' ? base.trend.filter((t) => t.key.slice(0, 4) === nowKey.slice(0, 4)) : base.trend.slice(-Number(span))
  const full = months.filter((t) => t.key !== nowKey)
  const avg = full.length ? full.reduce((a, t) => a + t.total, 0) / full.length : 0
  const maxTrend = Math.max(1, ...months.map((t) => Math.max(t.total, t.lastYear)))
  const step = 10 ** Math.floor(Math.log10(maxTrend)); const unit = [1, 2, 2.5, 5, 10].map((m) => m * step).find((u) => maxTrend / u <= 4) || step * 10
  const top = Math.ceil(maxTrend / unit) * unit
  const ticks = Array.from({ length: Math.round(top / unit) + 1 }, (_, n) => n * unit)
  const lastOf = (key) => `${key}-${String(new Date(Date.UTC(+key.slice(0, 4), +key.slice(5), 0)).getUTCDate()).padStart(2, '0')}`
  const picked = pk === 'custom' && custom.from && custom.from.endsWith('-01') && custom.to === lastOf(custom.from.slice(0, 7)) ? custom.from.slice(0, 7) : null
  const pickMonth = (key) => { setCustom({ from: `${key}-01`, to: lastOf(key) }); pickPeriod('custom') }
  const keyAt = (n) => { const i = base.trend.findIndex((t) => t.key === picked); return i < 0 ? null : base.trend[i + n]?.key || null }
  const canStep = (n) => !!keyAt(n)
  const stepMonth = (n) => { const k2 = keyAt(n); if (k2) pickMonth(k2) }
  const focus = hover || picked || nowKey
  const maxCo = Math.max(1, ...o.byCompany.map((c) => c.total))
  const company = businesses.find((b) => b.id === biz)
  const open = (ids, title) => { try { sessionStorage.setItem('fin-x-ids', JSON.stringify({ ids, title })) } catch { /* noop */ } go(`/documents?ids=1&from=${period.from}&to=${period.to}`) }
  const report = () => exportSheet(documents.filter((d) => o.ids.spend.includes(d.id)), 'excel', { businesses, projects }, {}, `הוצאות ${period.label}${company ? ` ${company.name}` : ''}`)

  if (!documents.length) return <Empty title="עוד אין נתונים" icon="reports">הסקירה נבנית מהמסמכים שנאספים. חברו תיבת מייל או העלו חשבוניות.</Empty>

  return (
    <div className="fin-x">
      <header className="fin-x__head">
        <div>
          <h2 className="fin-x__title">{hello}{firstName ? `, ${firstName}` : ''}</h2>
          <p className="fin-x__sub">סקירה פיננסית · {new Date().toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })} · {company ? company.name : 'כל החברות בקבוצה'} · {period.label} · עודכן {ago(last)}</p>
        </div>
        <div className="fin-x__controls">
          <Select value={pk} onChange={(e) => pickPeriod(e.target.value)} aria-label="תקופה">{PERIODS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>
          {pk === 'custom' && <DateRange from={custom.from} to={custom.to} label="טווח" onChange={(from, to) => setCustom({ from, to })} />}
          <button type="button" className="fin-btn" onClick={report} disabled={!o.ids.spend.length}><Icon name="table" size={17} /> דוח Excel</button>
        </div>
      </header>

      {businesses.length > 1 && (
        <nav className="fin-x-cos" aria-label="בחירת חברה">
          <button type="button" className={!biz ? 'is-on' : ''} aria-pressed={!biz} onClick={() => setBiz('')}><span>כל הקבוצה</span><b>{short(group.kpi.spend)}</b></button>
          {businesses.filter((b) => b.active !== false).map((b) => {
            const row = group.byCompany.find((c) => c.key === b.id)
            return <button key={b.id} type="button" className={biz === b.id ? 'is-on' : ''} aria-pressed={biz === b.id} onClick={() => setBiz(b.id)}><span>{b.name}</span><b>{short(row?.total || 0)}</b></button>
          })}
        </nav>
      )}

      {company && (() => {
        const mine = group.byCompany.find((c) => c.key === company.id)
        const share = group.kpi.spend ? (mine?.total || 0) / group.kpi.spend : 0
        const active = projects.filter((p) => p.business_id === company.id && ['active', 'planning'].includes(p.status) && !p.archived_at).length
        const docs = documents.filter((d) => d.business_id === company.id && !['rejected', 'archived'].includes(d.status)).length
        return (
          <section className="fin-x-company" aria-label={`תמונת מצב: ${company.name}`}>
            <div className="fin-x-company__id">
              <span className="fin-x-company__mark" aria-hidden="true">{company.name.trim().slice(0, 1)}</span>
              <span><strong>{company.name}</strong><small>{[company.vat_id && `ח.פ ${company.vat_id}`, company.address].filter(Boolean).join(' · ') || 'פרטי החברה לא הושלמו'}</small></span>
            </div>
            <dl>
              <div><dt>מהוצאות הקבוצה</dt><dd>{Math.round(share * 100)}%</dd></div>
              <div><dt>פרויקטים פעילים</dt><dd>{active}</dd></div>
              <div><dt>מסמכים במערכת</dt><dd>{docs.toLocaleString('he-IL')}</dd></div>
            </dl>
            <div className="fin-x-company__go">
              <button type="button" className="fin-btn fin-btn--sm" onClick={() => go(`/documents?company=${company.id}`)}><Icon name="docs" size={15} /> המסמכים של החברה</button>
              <button type="button" className="fin-btn fin-btn--sm" onClick={() => go(`/companies/${company.id}`)}>פרטי החברה</button>
              <button type="button" className="fin-link" onClick={() => setBiz('')}>חזרה לכל הקבוצה</button>
            </div>
          </section>
        )
      })()}

      {/* the headline: one number, then the five that explain it */}
      <section className="fin-x-hero" aria-label="מדדים מרכזיים">
        <button type="button" className="fin-x-hero__main" onClick={() => open(o.ids.spend, `הוצאות ${period.label}`)}>
          <span className="fin-x-label">הוצאות {period.label}{company ? ` · ${company.name}` : ''}</span>
          <strong className="fin-x-big">{money(k.spend)}</strong>
          <Delta value={k.spendChange} />
          <span className="fin-x-hero__foot">מתחילת השנה {money(k.ytd)} · <Delta value={k.ytdChange} label="מהשנה שעברה" /></span>
        </button>
        <div className="fin-x-kpis">
          <button type="button" onClick={() => go(`/documents?from=${period.from}&to=${period.to}${biz ? `&company=${biz}` : ''}`)}><span className="fin-x-label">מסמכים שנאספו</span><strong className="fin-x-kpi">{o.quality.total}</strong><small>{o.quality.total ? `${Math.round((o.quality.read / o.quality.total) * 100)}% נקראו בהצלחה` : 'בתקופה'}</small></button>
          <div><span className="fin-x-label">חשבוניות</span><strong className="fin-x-kpi">{k.invoices}</strong><Delta value={k.invoicesPrev ? ((k.invoices - k.invoicesPrev) / k.invoicesPrev) * 100 : null} invert label="" /></div>
          <div><span className="fin-x-label">קבלות</span><strong className="fin-x-kpi">{k.receipts}</strong><small>{k.receiptsAsProof ? `${k.receiptsAsProof} מהן אישור לחשבונית` : 'נקלטו בתקופה'}</small></div>
          <div><span className="fin-x-label">מע״מ תשומות</span><strong className="fin-x-kpi">{money(k.vat)}</strong><small>{k.vatClaimable !== k.vat ? `לקיזוז לפי הקטגוריות ${money(k.vatClaimable)}` : 'מהמסמכים שזוהו'}</small></div>
          <button type="button" onClick={() => open(o.ids.open, 'חשבוניות בלי אישור תשלום')}><span className="fin-x-label">בלי אישור תשלום</span><strong className="fin-x-kpi">{money(k.openNoProof)}</strong><small>{k.openCount} חשבוניות, לפי מסמכים בלבד</small></button>
          <button type="button" onClick={() => go('/pending')}><span className="fin-x-label">ממתינים לבדיקה</span><strong className={`fin-x-kpi ${k.reviewing ? 'is-attn' : ''}`}>{k.reviewing}</strong><small>{k.processing ? `${k.processing} עוד בקריאה או לא נקראו` : 'כל השאר נקראו'}</small></button>
        </div>
      </section>


      <div className="fin-x-grid">
        <div className="fin-x-main">
          <section className="fin-x-card fin-x-months" aria-label="הוצאות לפי חודש">
            <header>
              <h3>הוצאות לפי חודש</h3>
              {picked && (
                <span className="fin-x-monthchip">
                  <button type="button" onClick={() => stepMonth(-1)} disabled={!canStep(-1)} aria-label="החודש הקודם"><Icon name="chev" size={15} style={{ transform: 'rotate(-90deg)' }} /></button>
                  <strong>{monthName(picked)}</strong>
                  <button type="button" onClick={() => stepMonth(1)} disabled={!canStep(1)} aria-label="החודש הבא"><Icon name="chev" size={15} style={{ transform: 'rotate(90deg)' }} /></button>
                  <button type="button" className="fin-x-monthchip__x" onClick={() => pickPeriod('month')} aria-label="ביטול בחירת החודש">×</button>
                </span>
              )}
              <div className="fin-seg fin-x-span" role="group" aria-label="טווח הגרף">
                {SPANS.map(([v, l]) => <button key={v} type="button" className={span === v ? 'is-on' : ''} aria-pressed={span === v} onClick={() => pickSpan(v)}>{l}</button>)}
              </div>
            </header>
            {(() => {
              const f = months.find((t) => t.key === focus) || months[months.length - 1]
              const i = base.trend.findIndex((t) => t.key === f.key); const before = i > 0 ? base.trend[i - 1] : null
              const change = before && before.total ? ((f.total - before.total) / Math.abs(before.total)) * 100 : null
              return (
                <div className="fin-x-monthsum" aria-live="polite">
                  <div>
                    <span className="fin-x-label">{monthName(f.key)}{f.key === nowKey ? ' · עד היום' : ''}</span>
                    <strong className="fin-x-monthsum__total">{money(f.total)}</strong>
                    <Delta value={change} label={before ? `מ${monthName(before.key).split(' ')[0]}` : ''} />
                  </div>
                  <dl>
                    <div><dt>מסמכים</dt><dd>{f.count ? <button type="button" className="fin-x-monthsum__docs" onClick={() => openDocs(go, (f.ids || []).map((id) => ({ id })), `מסמכים של ${monthName(f.key)}`)} aria-label={`${f.count} מסמכים ב${monthName(f.key)}: פתיחת הרשימה`}>{f.count}</button> : 0}</dd></div>
                    <div><dt>שנה קודמת</dt><dd>{f.lastYear ? short(f.lastYear) : '—'}</dd></div>
                    <div><dt>ממוצע חודשי</dt><dd>{avg ? short(avg) : '—'}</dd></div>
                  </dl>
                </div>
              )
            })()}
            <div className="fin-x-chart">
              <div className="fin-x-axis" aria-hidden="true">{ticks.map((v) => <span key={v} style={{ bottom: `${(v / top) * 100}%` }}><em>{v ? short(v).replace(' ₪', '') : '0'}</em></span>)}</div>
              <div className="fin-x-scroll fin-scroll-x" ref={(el) => { if (el && el.scrollWidth > el.clientWidth && el.dataset.placed !== String(months.length)) { el.dataset.placed = String(months.length); el.scrollLeft = getComputedStyle(el).direction === 'rtl' ? -el.scrollWidth : el.scrollWidth } }}>
              <div className="fin-x-trend" style={{ '--n': months.length }} onPointerLeave={() => setHover(null)}>
                <div className="fin-x-plot" aria-hidden="true">
                  {ticks.map((v) => <i key={v} style={{ bottom: `${(v / top) * 100}%` }} />)}
                  {avg > 0 && <div className="fin-x-avg" style={{ bottom: `${(avg / top) * 100}%` }}><em>ממוצע {short(avg)}</em></div>}
                </div>
                {months.map((t, idx) => {
                  const on = t.key === picked; const isNow = t.key === nowKey
                  const showYear = idx === 0 || t.key.endsWith('-01')
                  return (
                    <button key={t.key} type="button" aria-pressed={on} aria-label={`${monthName(t.key)}: ${money(t.total)}, ${t.count} מסמכים`}
                      className={`fin-x-trend__col ${hover === t.key ? 'is-hover' : ''} ${on ? 'is-on' : ''} ${picked && !on ? 'is-dim' : ''} ${isNow ? 'is-now-month' : ''}`}
                      onPointerEnter={(e) => { if (e.pointerType === 'mouse') setHover(t.key) }} onFocus={(e) => { if (e.target.matches(':focus-visible')) setHover(t.key) }} onBlur={() => setHover(null)} onClick={() => (on ? pickPeriod('month') : pickMonth(t.key))}>
                      <span className="fin-x-trend__bars">
                        {t.total !== 0 && hover !== t.key && <b className="fin-x-val" aria-hidden="true" style={{ bottom: `calc(${Math.max(2, (t.total / top) * 100)}% + 3px)` }}>{short(t.total).replace(' ₪', '')}</b>}
                        <i className="is-ly" style={{ height: `${(t.lastYear / top) * 100}%` }} />
                        <i className="is-now" style={{ height: `${Math.max(t.total ? 2 : 0, (t.total / top) * 100)}%` }}>{hover === t.key && <span className="fin-x-tip" role="tooltip">{money(t.total)} · {t.count === 1 ? 'מסמך אחד' : `${t.count} מסמכים`}</span>}</i>
                      </span>
                      <em>{monthName(t.key).split(' ')[0].slice(0, 3)}{isNow ? <small>עד היום</small> : showYear ? <small>{t.key.slice(0, 4)}</small> : null}</em>
                    </button>
                  )
                })}
              </div>
              </div>
            </div>
            <p className="fin-x-hint">לחיצה על חודש מציגה את כל הסקירה לאותו חודש. <span className="fin-x-legend"><i className="is-now" /> בפועל <i className="is-ly" /> שנה קודמת</span></p>
          </section>

      {(() => {
        const scope = documents.filter((d) => !biz || d.business_id === biz)
        const toCheck = scope.filter((d) => d.status === 'review')
        const nums = scope.filter(unsureNumbers)
        const ready = scope.filter((d) => d.status === 'approved' && !d.exported_at)
        return (
          <section className="fin-x-acts" aria-label="מה לעשות עכשיו">
            <button type="button" onClick={() => go('/reports')} className="fin-x-act">
              <span className="fin-x-act__icon"><Icon name="tag" size={18} /></span>
              <span className="fin-x-act__label">מע״מ תשומות {period.label}</span>
              <strong>{money(k.vatClaimable)}</strong>
              <small>{k.vatPrev ? `${money(k.vatPrev)} בתקופה הקודמת` : 'לקיזוז לפי הקטגוריות; ההחלטה הסופית של רו״ח'}</small>
            </button>
            <button type="button" onClick={() => go(nums.length ? '/documents?status=numbers' : '/pending')} className={`fin-x-act ${toCheck.length ? 'is-attn' : ''}`}>
              <span className="fin-x-act__icon"><Icon name="alert" size={18} /></span>
              <span className="fin-x-act__label">לבדיקה</span>
              <strong>{toCheck.length}</strong>
              <small>{nums.length ? `${nums.length} מהם עם סכומים לא ודאיים` : toCheck.length ? `${money(toCheck.reduce((a, d) => a + signedTotal(d), 0))} ממתינים לאישור` : 'הכול נבדק'}</small>
            </button>
            <button type="button" onClick={() => go('/send')} className="fin-x-act">
              <span className="fin-x-act__icon"><Icon name="send" size={18} /></span>
              <span className="fin-x-act__label">מוכן לרו״ח</span>
              <strong>{money(ready.reduce((a, d) => a + signedTotal(d), 0))}</strong>
              <small>{ready.length ? `${ready.length === 1 ? 'מסמך אחד מאושר' : `${ready.length} מסמכים מאושרים`} שעוד לא נשלחו` : 'אין מסמכים מאושרים שממתינים'}</small>
            </button>
          </section>
        )
      })()}

          {!biz && (
            <section className="fin-x-card" aria-label="השוואת חברות">
              <header><h3>השוואת חברות</h3><InfoTip label="על ההשוואה">סכום ההוצאות של כל חברה בתקופה, מול התקופה הקודמת באותו אורך. לחיצה על חברה מציגה את כל הסקירה רק שלה.</InfoTip></header>
              <ul className="fin-x-rows">
                {o.byCompany.map((c) => (
                  <li key={c.key || 'none'}>
                    <button type="button" onClick={() => (c.key ? setBiz(c.key) : go('/documents?status=unassigned'))} className={!c.key ? 'is-attn' : ''}>
                      <span className="fin-x-rows__name"><strong>{c.name}</strong><small>{c.count} מסמכים{c.key ? ` · ${c.projects} פרויקטים פעילים` : ''}</small></span>
                      <span className="fin-x-rows__bar"><i style={{ width: `${(c.total / maxCo) * 100}%` }} /></span>
                      <span className="fin-x-rows__num"><strong>{short(c.total)}</strong><Delta value={c.prev ? c.change : null} label="" /></span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="fin-x-pair">
            <section className="fin-x-card" aria-label="לאן הכסף הולך">
              <header><h3>לאן הכסף הולך</h3><small className="fin-muted">לפי קטגוריה</small></header>
              <div className="fin-x-stack" aria-hidden="true">{o.byCategory.slice(0, 6).map((c, i) => <i key={c.key} style={{ flexGrow: c.share, '--n': i }} title={`${c.name} ${Math.round(c.share * 100)}%`} />)}</div>
              <ul className="fin-x-list">
                {o.byCategory.slice(0, 7).map((c, i) => (
                  <li key={c.key}><button type="button" onClick={() => (c.id ? go(`/categories/${c.id}`) : open(c.ids, c.name))}><i style={{ '--n': i }} /><span>{c.name}</span><b>{Math.round(c.share * 100)}%</b><strong>{short(c.total)}</strong></button></li>
                ))}
                {!o.byCategory.length && <li className="fin-muted">אין הוצאות בתקופה.</li>}
              </ul>
            </section>
            <section className="fin-x-card" aria-label="ספקים מרכזיים">
              <header><h3>ספקים מרכזיים</h3><small className="fin-muted">לפי סכום · {period.label}</small></header>
              {!o.bySupplier.length ? <p className="fin-muted">אין הוצאות בתקופה.</p> : (
                <ul className="fin-x-bars">
                  {o.bySupplier.slice(0, 6).map((s2) => (
                    <li key={s2.key}><button type="button" onClick={() => (s2.id ? go(`/suppliers/${s2.id}`) : open(s2.ids, s2.name))}>
                      <span className="fin-x-bars__name">{s2.name}</span><strong>{short(s2.total)}</strong>
                      <span className="fin-x-bars__bar"><i style={{ width: `${Math.max(2, (s2.total / Math.max(1, o.bySupplier[0].total)) * 100)}%` }} /></span>
                    </button></li>
                  ))}
                </ul>
              )}
              {o.bySupplier.length > 6 && <small className="fin-muted">ועוד {o.bySupplier.length - 6} ספקים</small>}
            </section>
          </div>

          <section className="fin-x-card" aria-label="פרויקטים">
            <header><h3>פרויקטים: תקציב מול ביצוע</h3><small className="fin-muted">ביצוע מצטבר מכל המסמכים</small></header>
            {!o.projects.length ? <p className="fin-muted">אין פרויקטים{biz ? ' לחברה הזו' : ''}. <button type="button" className="fin-link" onClick={() => go('/projects')}>הוספת פרויקט</button></p> : (
              <div className="fin-table-wrap">
                <table className="fin-table fin-x-proj">
                  <thead><tr><th>פרויקט</th>{!biz && <th className="fin-col-md">חברה</th>}<th className="fin-num fin-col-md">תקציב</th><th className="fin-num">בפועל</th><th className="fin-num fin-col-lg">בתקופה</th><th>ניצול</th></tr></thead>
                  <tbody>
                    {o.projects.slice(0, 12).map((p) => (
                      <tr key={p.id} onClick={() => go(`/projects/${p.id}`)} className={p.over ? 'is-over' : ''}>
                        <td className="fin-td-main" data-label="פרויקט"><button type="button" className="fin-cell-btn fin-cell-main" onClick={(e) => { e.stopPropagation(); go(`/projects/${p.id}`) }}>{p.name}</button></td>
                        {!biz && <td className="fin-col-md" data-label="חברה">{p.business || '—'}</td>}
                        <td className="fin-num fin-col-md" data-label="תקציב">{p.budget ? money(p.budget) : <span className="fin-muted">לא הוגדר</span>}</td>
                        <td className="fin-num" data-label="בפועל"><strong>{money(p.spent)}</strong></td>
                        <td className="fin-num fin-col-lg" data-label="בתקופה">{money(p.inPeriod)}</td>
                        <td data-label="ניצול">{p.used === null ? <span className="fin-muted">—</span> : <span className={`fin-x-use ${p.over ? 'is-over' : p.near ? 'is-near' : ''}`}><span><i style={{ width: `${Math.min(100, p.used * 100)}%` }} /></span><b>{Math.round(p.used * 100)}%</b></span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <aside className="fin-x-side">
          <section className="fin-x-card fin-x-feed" aria-label="פעילות אחרונה">
            <header className="fin-x-feed__head">
              <div><h3>פעילות אחרונה</h3><small className="fin-muted">{weekNew === 1 ? 'מסמך חדש אחד השבוע' : `${weekNew} מסמכים חדשים השבוע`}</small></div>
            </header>
            <div className="fin-seg fin-x-feed__filter" role="group" aria-label="סינון">{[['all', 'הכול'], ['open', 'לא שולם'], ['review', 'לבדיקה']].map(([k, l]) => <button key={k} type="button" className={feed === k ? 'is-on' : ''} aria-pressed={feed === k} onClick={() => setFeed(k)}>{l}</button>)}</div>
            {!feedRows.length ? <p className="fin-muted fin-small">אין מסמכים שמתאימים לסינון.</p> : feedDays.map(([day, rows]) => (
              <div key={day} className="fin-x-feed__day">
                <span className="fin-x-feed__daylabel">{day}</span>
                <ul>
                  {rows.map((d) => {
                    const ps = payState(d)
                    return (
                      <li key={d.id}><button type="button" onClick={() => go(`/documents/${d.id}`)}>
                        <span className="fin-x-feed__src">{d.source === 'whatsapp' ? <ProviderLogo name="whatsapp" size={15} /> : <Icon name={d.mailbox_id ? 'mail' : 'upload'} size={15} />}</span>
                        <span className="fin-x-feed__main"><strong>{d.supplier_name || d.file_name || 'מסמך'}</strong><small>{[DOC_TYPE[d.doc_type] || 'מסמך', d.mailbox_id ? 'מהמייל' : d.source === 'whatsapp' ? 'מ-WhatsApp' : 'הועלה', new Date(d.created_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })].join(' · ')}</small></span>
                        <span className="fin-x-feed__side"><b>{d.total_amount != null ? money(d.total_amount, d.currency) : '—'}</b>{d.status === 'failed' ? <Pill tone="attn">לא נקרא</Pill> : d.status === 'review' ? <Pill tone="warn">לבדיקה</Pill> : ps === 'proof' || ps === 'manual' ? <Pill tone="ok">שולם</Pill> : ps === 'open' ? <Pill tone="attn">לא שולם</Pill> : null}</span>
                      </button></li>
                    )
                  })}
                </ul>
              </div>
            ))}
            <button type="button" className="fin-link" onClick={() => go('/documents')}>לכל המסמכים ←</button>
          </section>
          <section className="fin-x-card fin-x-attn" aria-label="דורש תשומת לב">
            <header><h3>דורש תשומת לב</h3>{o.alerts.length > 0 && <span className="fin-x-count">{o.alerts.length}</span>}</header>
            {!o.alerts.length ? <p className="fin-x-calm"><Icon name="check" size={16} /> אין חריגות. כל המסמכים משויכים, אין חריגות תקציב ואין כפילויות פתוחות.</p> : (
              <ul>
                {o.alerts.slice(0, 8).map((a) => (
                  <li key={a.key} className={`is-${a.tone}`}><button type="button" onClick={() => go(a.to)}><strong>{a.title}</strong><small>{a.sub}</small></button></li>
                ))}
              </ul>
            )}
          </section>
          <section className="fin-x-card" aria-label="אמינות הנתונים">
            <header><h3>אמינות הנתונים</h3><InfoTip label="על אמינות הנתונים">כמה ממסמכי התקופה נקראו, כמה אדם בדק ואישר, וכמה עוד דורשים בדיקה. הסכומים כוללים גם מסמכים שעוד לא אושרו.</InfoTip></header>
            <div className="fin-x-quality" role="img" aria-label={`${o.quality.checked} אושרו, ${o.quality.read - o.quality.checked} נקראו וממתינים, ${o.quality.total - o.quality.read} לא נקראו`}>
              <i className="is-ok" style={{ flexGrow: o.quality.checked }} /><i className="is-read" style={{ flexGrow: Math.max(0, o.quality.read - o.quality.checked) }} /><i className="is-none" style={{ flexGrow: Math.max(0, o.quality.total - o.quality.read) }} />
            </div>
            <dl className="fin-x-qlist">
              <div><dt><i className="is-ok" /> אושרו ע״י אדם</dt><dd>{o.quality.total ? Math.round((o.quality.checked / o.quality.total) * 100) : 0}%</dd></div>
              <div><dt><i className="is-read" /> חולצו, ממתינים לבדיקה</dt><dd>{o.quality.total ? Math.round(((o.quality.read - o.quality.checked) / o.quality.total) * 100) : 0}%</dd></div>
              <div><dt><i className="is-none" /> עוד לא נקראו</dt><dd>{o.quality.total ? Math.round(((o.quality.total - o.quality.read) / o.quality.total) * 100) : 0}%</dd></div>
            </dl>
            {k.otherCurrencyCount > 0 && <p className="fin-muted fin-small">{k.otherCurrencyCount} מסמכים במטבע זר לא נכללים בסכומים בש״ח.</p>}
          </section>
          {can('operate') && <button type="button" className="fin-x-ask" onClick={() => go('/assistant')}><Icon name="sparkle" size={18} /><span><strong>לשאול על הנתונים</strong><small>"כמה הוצאנו על חומרי בניין מתחילת השנה?"</small></span></button>}
        </aside>
      </div>
      <p className="fin-x-note">כל הסכומים בש״ח, לפי התאריך שעל המסמך, ממסמכים שנקלטו במערכת. קבלה שמשלמת חשבונית שכבר במערכת לא נספרת פעמיים. "בלי אישור תשלום" מבוסס על מסמכים בלבד, לא על דפי בנק. זו תמונת ניהול, לא דיווח לרשויות.</p>
    </div>
  )
}
