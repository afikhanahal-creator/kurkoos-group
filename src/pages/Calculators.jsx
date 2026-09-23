import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/ui/PageHeader.jsx'
import Reveal from '../components/ui/Reveal.jsx'
import Seo from '../components/ui/Seo.jsx'
import Icon from '../components/ui/Icon.jsx'
import Contact from '../components/sections/Contact.jsx'
import { track } from '../lib/track.js'
import './Calculators.css'

/* ============================================================
   מחשבוני נדל"ן, כלים שימושיים בפני עצמם (SEO Tools):
   מחשבון החזר חודשי (לוח שפיצר) ומחשבון תשואת שכירות.
   חישוב מקומי בלבד, ללא שליחת נתונים. כולל הסברים, FAQ ו-CTA.
   ============================================================ */

const fmtNis = (n) => (Number.isFinite(n) ? '₪ ' + Math.round(n).toLocaleString('he-IL') : '·')
const fmtPct = (n) => (Number.isFinite(n) ? n.toLocaleString('he-IL', { maximumFractionDigits: 2 }) + '%' : '·')

const FAQS = [
  { q: 'מה זה לוח שפיצר?', a: 'לוח שפיצר הוא שיטת ההחזר הנפוצה ביותר למשכנתאות בישראל: ההחזר החודשי קבוע לאורך התקופה (כל עוד הריבית לא משתנה), כאשר בתחילת הדרך רובו ריבית ומעט קרן, והיחס מתהפך בהדרגה עם השנים. המחשבון בעמוד זה מחשב החזר חודשי לפי לוח שפיצר.' },
  { q: 'איך מחשבים תשואה משכירות?', a: 'תשואה שנתית ברוטו היא סך שכר הדירה השנתי חלקי מחיר הנכס, כפול 100. לחישוב תשואה נטו מפחיתים מההכנסה השנתית את ההוצאות השוטפות: תחזוקה, ביטוח, ועד בית, תקופות ללא שוכר ומסים רלוונטיים. תשואה נטו היא המספר שמעניין משקיע באמת.' },
  { q: 'כמה הון עצמי צריך כדי לקנות דירה?', a: 'לפי הוראות בנק ישראל, לרוכשי דירה יחידה הבנק יכול לממן עד 75% משווי הנכס, כלומר נדרש הון עצמי של 25% לפחות. למשפרי דיור המימון המרבי הוא 70%, ולמשקיעים המחזיקים דירה נוספת עד 50%. מעבר להון העצמי יש לתקצב גם מס רכישה, עורך דין, תיווך ושיפוצים.' },
  { q: 'האם התוצאות במחשבונים מדויקות?', a: 'המחשבונים נותנים הערכה ראשונית לפי הנתונים שהוזנו, והם אינם ייעוץ פיננסי, שיווק השקעות או תחליף לייעוץ משכנתאות מוסמך. ריבית בפועל, תמהיל מסלולים, הצמדה למדד ועלויות נלוות ישנו את התוצאה, לפני החלטה חשוב לקבל הצעות מסודרות ולהתייעץ עם גורם מוסמך.' },
]

function useTrackOnce(name) {
  const fired = useRef(false)
  return () => { if (!fired.current) { fired.current = true; track('calculator_use', { calculator: name }) } }
}

function MortgageCalc() {
  const [amount, setAmount] = useState('1,000,000')
  const [rate, setRate] = useState('5')
  const [years, setYears] = useState('25')
  const mark = useTrackOnce('mortgage')

  const res = useMemo(() => {
    const P = Number(String(amount).replace(/[^\d.]/g, ''))
    const annual = Number(String(rate).replace(/[^\d.]/g, ''))
    const n = Number(String(years).replace(/[^\d.]/g, '')) * 12
    if (!P || !n || annual < 0) return null
    const r = annual / 100 / 12
    const monthly = r === 0 ? P / n : (P * r) / (1 - Math.pow(1 + r, -n))
    return { monthly, total: monthly * n, interest: monthly * n - P }
  }, [amount, rate, years])

  const onAmount = (e) => {
    mark()
    const digits = e.target.value.replace(/[^\d]/g, '')
    setAmount(digits ? Number(digits).toLocaleString('en-US') : '')
  }

  return (
    <div className="calc">
      <div className="calc__fields">
        <label>סכום ההלוואה (₪)
          <input inputMode="numeric" dir="ltr" value={amount} onChange={onAmount} />
        </label>
        <label>ריבית שנתית (%)
          <input inputMode="decimal" dir="ltr" value={rate} onChange={(e) => { mark(); setRate(e.target.value) }} />
        </label>
        <label>תקופה (שנים)
          <input inputMode="numeric" dir="ltr" value={years} onChange={(e) => { mark(); setYears(e.target.value) }} />
        </label>
      </div>
      <div className="calc__results">
        <div className="calc__result calc__result--main">
          <span>החזר חודשי משוער</span>
          <b>{fmtNis(res?.monthly)}</b>
        </div>
        <div className="calc__result">
          <span>סך ההחזר לאורך התקופה</span>
          <b>{fmtNis(res?.total)}</b>
        </div>
        <div className="calc__result">
          <span>מתוכו ריבית</span>
          <b>{fmtNis(res?.interest)}</b>
        </div>
      </div>
      <p className="calc__how">החישוב לפי לוח שפיצר בריבית קבועה, ללא הצמדה למדד וללא עמלות. בפועל תמהיל משכנתא מורכב מכמה מסלולים והתוצאה תשתנה בהתאם.</p>
    </div>
  )
}

function YieldCalc() {
  const [price, setPrice] = useState('2,000,000')
  const [rent, setRent] = useState('6,000')
  const [expenses, setExpenses] = useState('')
  const mark = useTrackOnce('yield')

  const num = (v) => Number(String(v).replace(/[^\d.]/g, ''))
  const res = useMemo(() => {
    const P = num(price), R = num(rent), E = num(expenses) || 0
    if (!P || !R) return null
    const grossYear = R * 12
    return { gross: (grossYear / P) * 100, net: ((grossYear - E) / P) * 100, grossYear }
  }, [price, rent, expenses])

  const money = (setter) => (e) => {
    mark()
    const digits = e.target.value.replace(/[^\d]/g, '')
    setter(digits ? Number(digits).toLocaleString('en-US') : '')
  }

  return (
    <div className="calc">
      <div className="calc__fields">
        <label>מחיר הנכס (₪)
          <input inputMode="numeric" dir="ltr" value={price} onChange={money(setPrice)} />
        </label>
        <label>שכר דירה חודשי (₪)
          <input inputMode="numeric" dir="ltr" value={rent} onChange={money(setRent)} />
        </label>
        <label>הוצאות שנתיות (₪, לא חובה)
          <input inputMode="numeric" dir="ltr" value={expenses} onChange={money(setExpenses)} placeholder="תחזוקה, ביטוח, ועד…" />
        </label>
      </div>
      <div className="calc__results">
        <div className="calc__result calc__result--main">
          <span>תשואה שנתית ברוטו</span>
          <b>{fmtPct(res?.gross)}</b>
        </div>
        <div className="calc__result">
          <span>תשואה שנתית נטו</span>
          <b>{fmtPct(res?.net)}</b>
        </div>
        <div className="calc__result">
          <span>הכנסה שנתית משכירות</span>
          <b>{fmtNis(res?.grossYear)}</b>
        </div>
      </div>
      <p className="calc__how">תשואה ברוטו = שכר דירה שנתי חלקי מחיר הנכס. בנטו מופחתות ההוצאות שהוזנו; מסים ותקופות ללא שוכר משפיעים גם הם על התשואה בפועל.</p>
    </div>
  )
}

export default function Calculators() {
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

  return (
    <>
      <Seo
        title='מחשבון משכנתא ומחשבון תשואה לנדל"ן'
        description='מחשבון החזר חודשי למשכנתא לפי לוח שפיצר ומחשבון תשואת שכירות לנכס להשקעה, כלים חינמיים עם הסברים ברורים, מבית קורקוס גרופ.'
        jsonLd={jsonLd}
      />
      <PageHeader
        noSeo   /* ה-SEO של העמוד מוגדר ב-Seo שמעליו, מקור אחד בלבד */
        eyebrow="כלים שימושיים"
        title='מחשבוני נדל"ן'
        lead='שני כלים פשוטים לקבלת תמונה ראשונית: מחשבון החזר חודשי למשכנתא לפי לוח שפיצר, ומחשבון תשואת שכירות למשקיעים. החישוב מתבצע אצלכם בדפדפן ואינו נשלח לשום מקום.'
        crumbs={[{ label: 'מחשבוני נדל"ן' }]}
        seoTitle='מחשבון משכנתא ומחשבון תשואה לנדל"ן'
        seoDescription='מחשבון החזר חודשי למשכנתא לפי לוח שפיצר ומחשבון תשואת שכירות לנכס להשקעה, כלים חינמיים עם הסברים ברורים, מבית קורקוס גרופ. להערכה ראשונית בלבד, אינו ייעוץ פיננסי.'
      />

      <section className="section calcs">
        <div className="container">
          <Reveal className="calcs__block">
            <h2 className="calcs__title"><Icon name="building" size={22} /> מחשבון החזר חודשי למשכנתא</h2>
            <MortgageCalc />
          </Reveal>

          <Reveal className="calcs__block">
            <h2 className="calcs__title"><Icon name="check" size={22} /> מחשבון תשואת שכירות</h2>
            <YieldCalc />
          </Reveal>

          <Reveal className="calcs__block calcs__faq">
            <h2 className="calcs__title">שאלות נפוצות</h2>
            <div className="calcs__faq-list">
              {FAQS.map((f, i) => (
                <details key={i} className="calcs__faq-item">
                  <summary><span>{f.q}</span><Icon name="chevron" size={18} className="calcs__chev" /></summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </Reveal>

          <Reveal className="calcs__links">
            <p>להעמיק עוד: <Link to="/real-estate-glossary">מילון מונחי נדל"ן</Link> · <Link to="/real-estate-guide">המדריך לרוכש ולמוכר</Link> · <Link to="/yazamut-nadlan">המדריך ליזמות נדל"ן</Link></p>
          </Reveal>
        </div>
      </section>

      <Contact />
    </>
  )
}
