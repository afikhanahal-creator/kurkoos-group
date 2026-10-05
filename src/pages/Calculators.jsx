import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Seo from '../components/ui/Seo.jsx'
import Icon from '../components/ui/Icon.jsx'
import Breadcrumbs from '../components/ui/Breadcrumbs.jsx'
import { LeadFields, LeadSubmit, LeadSuccess, LeadFailure } from '../components/ui/LeadForm.jsx'
import heDict from '../i18n/he.js'
import enDict from '../i18n/en.js'
import { useLeadForm } from '../lib/leadForm.js'
import { trailSummary } from '../lib/visitTrail.js'
import { openContactPopup, telHref, waHref, CONTACT_PHONE_DISPLAY } from '../lib/contact.js'
import { track } from '../lib/track.js'
import './Calculators.css'

/* ============================================================
   מחשבוני נדל"ן, כלים שימושיים בפני עצמם (SEO Tools):
   מחשבון החזר חודשי (לוח שפיצר) ומחשבון תשואת שכירות.
   חישוב מקומי בלבד, ללא שליחת נתונים, והתוצאה לא חסומה בטופס.
   מתחת לכל תוצאה כרטיס "נבדוק איתכם את המספרים", ובסוף העמוד
   טופס ליד עם שלומי, באותה שפה של עמודי הנחיתה (HouseLanding).
   ============================================================ */

const fmtNis = (n) => (Number.isFinite(n) ? '₪ ' + Math.round(n).toLocaleString('he-IL') : '·')
const fmtPct = (n) => (Number.isFinite(n) ? n.toLocaleString('he-IL', { maximumFractionDigits: 2 }) + '%' : '·')
const share = (part, whole) => (whole > 0 ? Math.max(0, Math.min(100, (part / whole) * 100)) : 0)

/* נושא הפנייה בחלון ובטופס: המחשבונים משרתים קונים ומשקיעים, כלומר תיווך ועסקאות */
const TOPIC = 'brokerage'

const FAQS = [
  { q: 'מה זה לוח שפיצר?', a: 'לוח שפיצר הוא שיטת ההחזר הנפוצה ביותר למשכנתאות בישראל: ההחזר החודשי קבוע לאורך התקופה (כל עוד הריבית לא משתנה), כאשר בתחילת הדרך רובו ריבית ומעט קרן, והיחס מתהפך בהדרגה עם השנים. המחשבון בעמוד זה מחשב החזר חודשי לפי לוח שפיצר.' },
  { q: 'איך מחשבים תשואה משכירות?', a: 'תשואה שנתית ברוטו היא סך שכר הדירה השנתי חלקי מחיר הנכס, כפול 100. לחישוב תשואה נטו מפחיתים מההכנסה השנתית את ההוצאות השוטפות: תחזוקה, ביטוח, ועד בית, תקופות ללא שוכר ומסים רלוונטיים. תשואה נטו היא המספר שמעניין משקיע באמת.' },
  { q: 'כמה הון עצמי צריך כדי לקנות דירה?', a: 'לפי הוראות בנק ישראל, לרוכשי דירה יחידה הבנק יכול לממן עד 75% משווי הנכס, כלומר נדרש הון עצמי של 25% לפחות. למשפרי דיור המימון המרבי הוא 70%, ולמשקיעים המחזיקים דירה נוספת עד 50%. מעבר להון העצמי יש לתקצב גם מס רכישה, עורך דין, תיווך ושיפוצים.' },
  { q: 'האם התוצאות במחשבונים מדויקות?', a: 'המחשבונים נותנים הערכה ראשונית לפי הנתונים שהוזנו, והם אינם ייעוץ פיננסי, שיווק השקעות או תחליף לייעוץ משכנתאות מוסמך. ריבית בפועל, תמהיל מסלולים, הצמדה למדד ועלויות נלוות ישנו את התוצאה, לפני החלטה חשוב לקבל הצעות מסודרות ולהתייעץ עם גורם מוסמך.' },
]

const GUIDES = [
  { to: '/real-estate-guide/hon-atzmi-mashkanta-rechisha', label: 'הון עצמי לרכישת דירה: כמה באמת צריך לפני שיוצאים לדרך' },
  { to: '/real-estate-guide/real-return-real-estate-investment', label: 'תשואה אמיתית בהשקעת נדל"ן: ברוטו, נטו וההוצאות ששוכחים' },
  { to: '/real-estate-guide/mas-rechisha-madregot', label: 'מס רכישה 2026: המדרגות, הפטורים והמלכודות' },
  { to: '/real-estate-guide/kniya-mekablan-mul-yad-shniya', label: 'קנייה מקבלן מול יד שנייה: מה באמת שונה בתהליך' },
  { to: '/real-estate-glossary', label: 'מילון מונחי נדל"ן' },
]

const BUILD_LINKS = [
  { to: '/constructions/kama-ole-livnot-bayit-prati', label: 'כמה עולה לבנות בית פרטי בשרון, וממה בנוי המחיר' },
  { to: '/kablan-bniya-bayit-prati', label: 'קבלן בנייה לבית פרטי, מהמגרש ועד המפתח' },
  { to: '/bniyat-vila-sharon', label: 'בניית וילה בשרון' },
  { to: '/real-estate-guide', label: 'המדריך לרוכש ולמוכר' },
  { to: '/yazamut-nadlan', label: 'המדריך ליזמות נדל"ן' },
]

function useTrackOnce(name) {
  const fired = useRef(false)
  return () => { if (!fired.current) { fired.current = true; track('calculator_use', { calculator: name }) } }
}

const digitsOf = (v) => Number(String(v).replace(/[^\d.]/g, ''))
const withCommas = (raw) => {
  const digits = String(raw).replace(/[^\d]/g, '')
  return digits ? Number(digits).toLocaleString('en-US') : ''
}

/* ---------- שדה: שם, שדה מספר, ומתחתיו סליידר ----------
   שדה המספר הוא מקור האמת: הסליידר רק כותב אליו את אותו ערך.
   ערך מחוץ לטווח הסליידר עדיין נכנס לחישוב, הסליידר פשוט נעצר בקצה. */
function Field({ id, label, unit, hint, value, onText, inputMode = 'numeric', placeholder, slider }) {
  const n = digitsOf(value)
  const pos = slider ? share(Math.min(Math.max(n || 0, slider.min), slider.max) - slider.min, slider.max - slider.min) : 0
  return (
    <div className="cf">
      <div className="cf__row">
        <label className="cf__label" htmlFor={id}>
          {label}
          {hint && <span className="cf__hint">{hint}</span>}
        </label>
        <div className={`cf__box${unit === '%' ? ' cf__box--suffix' : ''}`}>
          <input
            id={id}
            className="cf__input"
            inputMode={inputMode}
            dir="ltr"
            value={value}
            placeholder={placeholder}
            onChange={(e) => onText(e.target.value)}
            autoComplete="off"
          />
          <span className="cf__unit" aria-hidden="true">{unit}</span>
        </div>
      </div>
      {slider && (
        <>
          <input
            type="range"
            className="cf__range"
            min={slider.min}
            max={slider.max}
            step={slider.step}
            value={Number.isFinite(n) ? Math.min(Math.max(n, slider.min), slider.max) : slider.min}
            onChange={(e) => slider.onSlide(e.target.value)}
            aria-label={`${label}, סליידר`}
            aria-valuetext={`${value || 0} ${unit}`}
            style={{ '--p': `${pos}%` }}
          />
          <div className="cf__scale" aria-hidden="true">
            <span>{slider.minLabel}</span>
            <span>{slider.maxLabel}</span>
          </div>
        </>
      )}
    </div>
  )
}

/* ---------- כרטיס "נבדוק איתכם את המספרים" מתחת לכל תוצאה ---------- */
function ResultCta({ calc, title, text, waText }) {
  return (
    <div className="calc-cta">
      <p className="calc-cta__title">{title}</p>
      <p className="calc-cta__text">{text}</p>
      <div className="calc-cta__actions">
        <button
          type="button"
          className="btn btn--primary calc-cta__btn"
          onClick={() => { track('cta_click', { placement: `calc_${calc}_result` }); openContactPopup(TOPIC) }}
        >
          קבלו שיחה ממומחה
          <Icon name="arrowLeft" size={18} />
        </button>
        <a
          href={waHref(waText)}
          target="_blank"
          rel="noopener noreferrer"
          className="calc-cta__wa"
          onClick={() => track('whatsapp_click', { placement: `calc_${calc}_result` })}
        >
          <Icon name="whatsapp" size={18} /> שלחו את המספרים בוואטסאפ
        </a>
      </div>
    </div>
  )
}

function MortgageCalc({ onSummary }) {
  const [amount, setAmount] = useState('1,000,000')
  const [rate, setRate] = useState('5')
  const [years, setYears] = useState('25')
  const mark = useTrackOnce('mortgage')

  /* החישוב המקורי, ללא שינוי: לוח שפיצר בריבית קבועה */
  const res = useMemo(() => {
    const P = Number(String(amount).replace(/[^\d.]/g, ''))
    const annual = Number(String(rate).replace(/[^\d.]/g, ''))
    const n = Number(String(years).replace(/[^\d.]/g, '')) * 12
    if (!P || !n || annual < 0) return null
    const r = annual / 100 / 12
    const monthly = r === 0 ? P / n : (P * r) / (1 - Math.pow(1 + r, -n))
    return { monthly, total: monthly * n, interest: monthly * n - P, P, r }
  }, [amount, rate, years])

  const ok = res && Number.isFinite(res.monthly)
  const pShare = ok ? share(res.P, res.total) : 0
  const iShare = ok ? 100 - pShare : 0
  /* החודש הראשון בלוח שפיצר: הריבית היא יתרת הקרן כפול הריבית החודשית, השאר קרן */
  const firstInterest = ok && res.r > 0 ? res.P * res.r : null
  const firstPrincipal = firstInterest !== null ? res.monthly - firstInterest : null

  const summary = ok
    ? `מחשבון משכנתא: הלוואה ${fmtNis(res.P)}, ריבית ${rate}%, ${years} שנים, החזר חודשי משוער ${fmtNis(res.monthly)}`
    : ''
  onSummary?.('mortgage', summary)

  return (
    <div className="calc">
      <div className="calc__inputs">
        {/* במובייל הפאנל יושב מתחת לשדות, לכן המספר המרכזי צמוד לראש המסך בזמן ההזזה */}
        <div className="calc__peek" aria-hidden="true">
          <span>החזר חודשי משוער</span>
          <b dir="ltr">{fmtNis(res?.monthly)}</b>
        </div>
        <Field
          id="mc-amount" label="סכום ההלוואה" unit="₪" value={amount}
          onText={(v) => { mark(); setAmount(withCommas(v)) }}
          slider={{ min: 100000, max: 5000000, step: 10000, minLabel: '100 אלף', maxLabel: '5 מיליון', onSlide: (v) => { mark(); setAmount(withCommas(v)) } }}
        />
        <Field
          id="mc-rate" label="ריבית שנתית" unit="%" inputMode="decimal" value={rate}
          onText={(v) => { mark(); setRate(v) }}
          slider={{ min: 0, max: 10, step: 0.05, minLabel: '0%', maxLabel: '10%', onSlide: (v) => { mark(); setRate(String(Number(v))) } }}
        />
        <Field
          id="mc-years" label="תקופה" unit="שנים" value={years}
          onText={(v) => { mark(); setYears(v) }}
          slider={{ min: 4, max: 30, step: 1, minLabel: '4 שנים', maxLabel: '30 שנים', onSlide: (v) => { mark(); setYears(v) } }}
        />
        <p className="calc__how">החישוב לפי לוח שפיצר בריבית קבועה, ללא הצמדה למדד וללא עמלות. בפועל תמהיל משכנתא מורכב מכמה מסלולים והתוצאה תשתנה בהתאם.</p>
      </div>

      <div className="calc__panel">
        <div className="calc__out">
          <div className="calc__main">
            <span className="calc__main-label">החזר חודשי משוער</span>
            <b className="calc__main-num" dir="ltr">{fmtNis(res?.monthly)}</b>
          </div>

          {ok && (
            <div className="calc__split">
              <div
                className="calc__bar"
                role="img"
                aria-label={`חלוקת סך ההחזר: קרן ${Math.round(pShare)}%, ריבית ${Math.round(iShare)}%`}
              >
                <span className="calc__bar-a" style={{ width: `${pShare}%` }} />
                <span className="calc__bar-b" style={{ width: `${iShare}%` }} />
              </div>
              <ul className="calc__legend">
                <li><i className="calc__dot calc__dot--a" aria-hidden="true" />קרן <b dir="ltr">{fmtNis(res.P)}</b> <span>{Math.round(pShare)}%</span></li>
                <li><i className="calc__dot calc__dot--b" aria-hidden="true" />ריבית <b dir="ltr">{fmtNis(res.interest)}</b> <span>{Math.round(iShare)}%</span></li>
              </ul>
            </div>
          )}

          <dl className="calc__facts">
            <div><dt>סך ההחזר לאורך התקופה</dt><dd dir="ltr">{fmtNis(res?.total)}</dd></div>
            <div><dt>מתוכו ריבית</dt><dd dir="ltr">{fmtNis(res?.interest)}</dd></div>
          </dl>
          {!ok && <p className="calc__note">הזינו סכום הלוואה ותקופה כדי לראות את ההחזר החודשי.</p>}
          {firstInterest !== null && Number.isFinite(firstPrincipal) && (
            <p className="calc__note">
              בחודש הראשון <b dir="ltr">{fmtNis(firstInterest)}</b> מההחזר הם ריבית, ורק <b dir="ltr">{fmtNis(firstPrincipal)}</b> מקטינים את הקרן. היחס מתהפך עם השנים.
            </p>
          )}
        </div>

        <ResultCta
          calc="mortgage"
          title="רוצים שנבדוק איתכם את המספרים?"
          text="קבלו שיחה ממומחה, ונעבור יחד על ההחזר, ההון העצמי והעלויות שמסביב לעסקה."
          waText={summary ? `שלום, ${summary}. אשמח לבדוק את המספרים עם מומחה.` : 'שלום, אשמח לבדוק איתכם את המספרים של המשכנתא.'}
        />
      </div>
    </div>
  )
}

function YieldCalc({ onSummary }) {
  const [price, setPrice] = useState('2,000,000')
  const [rent, setRent] = useState('6,000')
  const [expenses, setExpenses] = useState('')
  const mark = useTrackOnce('yield')

  /* החישוב המקורי, ללא שינוי */
  const num = (v) => Number(String(v).replace(/[^\d.]/g, ''))
  const res = useMemo(() => {
    const P = num(price), R = num(rent), E = num(expenses) || 0
    if (!P || !R) return null
    const grossYear = R * 12
    return { gross: (grossYear / P) * 100, net: ((grossYear - E) / P) * 100, grossYear, E }
  }, [price, rent, expenses])

  const money = (setter) => (v) => { mark(); setter(withCommas(v)) }

  const ok = res && Number.isFinite(res.gross)
  const eShare = ok ? share(res.E, res.grossYear) : 0
  const keepShare = 100 - eShare

  const summary = ok
    ? `מחשבון תשואה: נכס ${fmtNis(num(price))}, שכר דירה ${fmtNis(num(rent))} לחודש, תשואה ברוטו ${fmtPct(res.gross)}, נטו ${fmtPct(res.net)}`
    : ''
  onSummary?.('yield', summary)

  return (
    <div className="calc">
      <div className="calc__inputs">
        <div className="calc__peek" aria-hidden="true">
          <span>תשואה ברוטו</span>
          <b dir="ltr">{fmtPct(res?.gross)}</b>
          <span>נטו</span>
          <b dir="ltr">{fmtPct(res?.net)}</b>
        </div>
        <Field
          id="yc-price" label="מחיר הנכס" unit="₪" value={price} onText={money(setPrice)}
          slider={{ min: 300000, max: 10000000, step: 10000, minLabel: '300 אלף', maxLabel: '10 מיליון', onSlide: money(setPrice) }}
        />
        <Field
          id="yc-rent" label="שכר דירה חודשי" unit="₪" value={rent} onText={money(setRent)}
          slider={{ min: 1000, max: 30000, step: 100, minLabel: '1,000', maxLabel: '30,000', onSlide: money(setRent) }}
        />
        <Field
          id="yc-exp" label="הוצאות שנתיות" hint="לא חובה" unit="₪" value={expenses} onText={money(setExpenses)}
          placeholder="0"
          slider={{ min: 0, max: 100000, step: 500, minLabel: '0', maxLabel: '100,000', onSlide: money(setExpenses) }}
        />
        <p className="calc__how">תשואה ברוטו = שכר דירה שנתי חלקי מחיר הנכס. בנטו מופחתות ההוצאות שהוזנו: תחזוקה, ביטוח, ועד בית. מסים ותקופות ללא שוכר משפיעים גם הם על התשואה בפועל.</p>
      </div>

      <div className="calc__panel">
        <div className="calc__out">
          <div className="calc__pair">
            <div className="calc__main">
              <span className="calc__main-label">תשואה שנתית ברוטו</span>
              <b className="calc__main-num" dir="ltr">{fmtPct(res?.gross)}</b>
            </div>
            <div className="calc__main calc__main--second">
              <span className="calc__main-label">תשואה שנתית נטו</span>
              <b className="calc__main-num" dir="ltr">{fmtPct(res?.net)}</b>
            </div>
          </div>

          {ok && (
            <div className="calc__split">
              <div
                className="calc__bar"
                role="img"
                aria-label={res.E > 0
                  ? `חלוקת שכר הדירה השנתי: נשאר אחרי הוצאות ${Math.round(keepShare)}%, הוצאות ${Math.round(eShare)}%`
                  : 'לא הוזנו הוצאות, כל שכר הדירה השנתי נספר כהכנסה'}
              >
                <span className="calc__bar-a" style={{ width: `${keepShare}%` }} />
                <span className="calc__bar-b calc__bar-b--exp" style={{ width: `${eShare}%` }} />
              </div>
              <ul className="calc__legend">
                <li><i className="calc__dot calc__dot--a" aria-hidden="true" />נשאר אחרי הוצאות <b dir="ltr">{fmtNis(res.grossYear - res.E)}</b></li>
                <li><i className="calc__dot calc__dot--exp" aria-hidden="true" />הוצאות <b dir="ltr">{fmtNis(res.E)}</b></li>
              </ul>
            </div>
          )}

          <dl className="calc__facts">
            <div><dt>הכנסה שנתית משכירות</dt><dd dir="ltr">{fmtNis(res?.grossYear)}</dd></div>
          </dl>
          {!ok && <p className="calc__note">הזינו מחיר נכס ושכר דירה חודשי כדי לראות את התשואה.</p>}
          {ok && !res.E && (
            <p className="calc__note">הזינו הוצאות שנתיות כדי לראות כמה באמת נשאר בסוף השנה. בלי הוצאות, נטו שווה לברוטו.</p>
          )}
          {ok && res.E > res.grossYear && (
            <p className="calc__note">ההוצאות שהוזנו גבוהות משכר הדירה השנתי, ולכן התשואה נטו שלילית.</p>
          )}
        </div>

        <ResultCta
          calc="yield"
          title="שוקלים נכס להשקעה?"
          text="קבלו שיחה ממומחה, ונעבור יחד על המחיר, שכר הדירה וההוצאות שכדאי לקחת בחשבון."
          waText={summary ? `שלום, ${summary}. אשמח לבדוק את המספרים עם מומחה.` : 'שלום, אשמח לבדוק איתכם את התשואה של נכס להשקעה.'}
        />
      </div>
    </div>
  )
}

export default function Calculators() {
  /* סיכום החישוב האחרון בכל מחשבון. נשמר ב-ref (לא state) כדי שהקלדה
     לא תרנדר את כל העמוד, ומצורף להערות הליד בטופס שבסוף העמוד. */
  const summaries = useRef({ mortgage: '', yield: '' })
  const onSummary = (key, text) => { summaries.current[key] = text }

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQS.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'קורקוס גרופ', item: 'https://www.kurkoos-group.co.il/' },
        { '@type': 'ListItem', position: 2, name: 'מחשבוני נדל"ן', item: 'https://www.kurkoos-group.co.il/real-estate-calculators' },
      ],
    },
  ]

  const jump = (id) => () => track('cta_click', { placement: `calc_hero_${id}` })

  return (
    <article className="cx">
      <Seo
        title='מחשבון משכנתא ומחשבון תשואה לנדל"ן'
        description='מחשבון החזר חודשי למשכנתא לפי לוח שפיצר ומחשבון תשואת שכירות לנכס להשקעה, כלים חינמיים עם הסברים ברורים, מבית קורקוס גרופ.'
        jsonLd={jsonLd}
      />

      {/* ---------- כותרת ---------- */}
      <header className="cx-hero">
        <img className="cx-hero__drawing" src="/divisions/humash-22-24-sketch.webp" alt="" width="1400" height="693" decoding="async" aria-hidden="true" />
        <div className="container cx-hero__inner">
          <Breadcrumbs items={[{ label: 'מחשבוני נדל"ן' }]} />
          <div className="cx-hero__copy">
            <h1 className="cx-hero__title">מחשבון משכנתא ומחשבון תשואה לנדל"ן</h1>
            <p className="cx-hero__lead">כמה תחזירו כל חודש, וכמה הנכס באמת מכניס. תשובה ראשונית בתוך דקה, בלי להשאיר פרטים.</p>
          </div>
          <nav className="cx-jump" aria-label="מעבר למחשבון">
            <a href="#mortgage" className="cx-jump__item" onClick={jump('mortgage')}>
              <span className="cx-jump__ic" aria-hidden="true"><Icon name="house" size={24} /></span>
              <span className="cx-jump__body">
                <b>מחשבון משכנתא</b>
                <span>החזר חודשי, סך ההחזר והריבית</span>
              </span>
              <Icon name="chevron" size={20} className="cx-jump__chev" />
            </a>
            <a href="#yield" className="cx-jump__item" onClick={jump('yield')}>
              <span className="cx-jump__ic" aria-hidden="true"><Icon name="building" size={24} /></span>
              <span className="cx-jump__body">
                <b>מחשבון תשואת שכירות</b>
                <span>תשואה ברוטו ונטו לנכס להשקעה</span>
              </span>
              <Icon name="chevron" size={20} className="cx-jump__chev" />
            </a>
          </nav>
          <p className="cx-hero__fine"><Icon name="shield" size={16} /> החישוב מתבצע אצלכם בדפדפן ואינו נשלח לשום מקום.</p>
        </div>
      </header>

      {/* ---------- המחשבונים ---------- */}
      <section className="cx-section cx-tool" id="mortgage" aria-labelledby="cx-mortgage-title">
        <div className="container">
          <div className="cx-head">
            <h2 className="cx-h2" id="cx-mortgage-title">מחשבון החזר חודשי למשכנתא</h2>
            <p className="cx-head__lead">הזיזו את הסליידרים או הקלידו מספר. ההחזר מתעדכן מיד.</p>
          </div>
          <MortgageCalc onSummary={onSummary} />
        </div>
      </section>

      <section className="cx-section cx-tool cx-tool--alt" id="yield" aria-labelledby="cx-yield-title">
        <div className="container">
          <div className="cx-head">
            <h2 className="cx-h2" id="cx-yield-title">מחשבון תשואת שכירות</h2>
            <p className="cx-head__lead">מחיר הנכס ושכר הדירה מספיקים לתשואה ברוטו. הוסיפו הוצאות כדי לראות נטו.</p>
          </div>
          <YieldCalc onSummary={onSummary} />
        </div>
      </section>

      {/* ---------- שאלות נפוצות ---------- */}
      <section className="cx-section cx-faq" aria-labelledby="cx-faq-title">
        <div className="container cx-faq__inner">
          <h2 className="cx-h2" id="cx-faq-title">שאלות נפוצות</h2>
          <div className="cx-faq__list">
            {FAQS.map((f) => (
              <details key={f.q} className="cx-faq__item">
                <summary>
                  <span>{f.q}</span>
                  <span className="cx-faq__sign" aria-hidden="true" />
                </summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- המשך קריאה ---------- */}
      <nav className="cx-section cx-links" aria-label="עוד בנושא">
        <div className="container cx-links__grid">
          <div>
            <h2 className="cx-links__title">מדריכים שכדאי לקרוא לפני שמחליטים</h2>
            <ul>
              {GUIDES.map((g) => (
                <li key={g.to}><Link to={g.to}>{g.label}<Icon name="arrowLeft" size={15} /></Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="cx-links__title">בונים בית במקום לקנות?</h2>
            <ul>
              {BUILD_LINKS.map((g) => (
                <li key={g.to}><Link to={g.to}>{g.label}<Icon name="arrowLeft" size={15} /></Link></li>
              ))}
            </ul>
          </div>
        </div>
      </nav>

      {/* ---------- טופס ---------- */}
      <CalcLead summaries={summaries} />
    </article>
  )
}

/* ---------- הטופס בסוף העמוד ----------
   אותם רכיבי טופס כמו בעמודי הנחיתה, עם נושא קבוע של תיווך ועסקאות.
   החישובים האחרונים מצורפים להערות, כדי שמי שחוזר ללקוח יראה את המספרים. */
function CalcLead({ summaries }) {
  const lf = useLeadForm({ form: 'calculators', idPrefix: 'cx' })
  const placement = 'calculators'

  const handleSubmit = (e) => {
    e.preventDefault()
    const calc = [summaries.current.mortgage, summaries.current.yield].filter(Boolean).join('\n')
    const trail = trailSummary()
    const notes = [calc, trail && `מסע באתר: ${trail}`].filter(Boolean).join('\n') || undefined
    lf.submit((v) => ({
      ...v,
      project: { he: heDict.contactExtra.topics[TOPIC], en: enDict.contactExtra.topics[TOPIC] },
      notes,
      source: 'contact',
      status: 'new',
    }), { topic: TOPIC })
  }

  return (
    <section className="cx-section cx-lead" id="contact" aria-labelledby="cx-lead-title">
      <div className="container cx-lead__grid">
        <aside className="cx-trust">
          <img src="/shlomi-office.webp" alt="שלומי קורקוס" className="cx-trust__photo" width="800" height="1200" loading="lazy" />
          <div className="cx-trust__body">
            <b className="cx-trust__name">שלומי קורקוס</b>
            <span className="cx-trust__role">מנכ"ל ומייסד קורקוס גרופ</span>
            <p>איש מקצוע בעל מעל 30 שנות ניסיון בעולם הבנייה, שמוביל את הקבוצה מאז הקמתה.</p>
            <div className="cx-trust__actions">
              <a href={telHref()} className="cx-trust__link" onClick={() => track('phone_click', { placement: `${placement}_trust` })}>
                <Icon name="phone" size={18} /> <span dir="ltr">{CONTACT_PHONE_DISPLAY}</span>
              </a>
              <a
                href={waHref('שלום, הגעתי מהמחשבונים באתר ואשמח לבדוק איתכם את המספרים')}
                target="_blank"
                rel="noopener noreferrer"
                className="cx-trust__link"
                onClick={() => track('whatsapp_click', { placement: `${placement}_trust` })}
              >
                <Icon name="whatsapp" size={18} /> וואטסאפ
              </a>
            </div>
            <span className="cx-trust__addr"><Icon name="location" size={15} /> רחוב הנגר 24, מגדלי Amy, הוד השרון</span>
          </div>
        </aside>

        <div className="cx-form">
          <h2 className="cx-form__title" id="cx-lead-title">נבדוק איתכם את המספרים</h2>
          <p className="cx-form__lead">השאירו פרטים, ונחזור אליכם כדי לעבור יחד על העסקה שאתם בודקים. המספרים מהמחשבון יגיעו אלינו יחד עם הפנייה.</p>
          {lf.sent ? (
            <LeadSuccess form="calculators" tone="dark" />
          ) : (
            <form className="cx-form__fields lf-dark" onSubmit={handleSubmit} onInput={lf.onStart} noValidate>
              <LeadFields lf={lf} messagePlaceholder="איזה נכס אתם בודקים, ובאיזה שלב אתם?" />
              <LeadFailure lf={lf} topicLabel={heDict.contactExtra.topics[TOPIC]} tone="dark" />
              <LeadSubmit lf={lf} className="btn btn--primary btn--lg cx-form__submit" />
            </form>
          )}
        </div>
      </div>
    </section>
  )
}
