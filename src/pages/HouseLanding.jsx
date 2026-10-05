import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import Seo from '../components/ui/Seo.jsx'
import Icon from '../components/ui/Icon.jsx'
import SmartImage from '../components/ui/SmartImage.jsx'
import Breadcrumbs from '../components/ui/Breadcrumbs.jsx'
import { LeadFields, LeadSubmit, LeadSuccess, LeadFailure } from '../components/ui/LeadForm.jsx'
import heDict from '../i18n/he.js'
import enDict from '../i18n/en.js'
import { useLeadForm } from '../lib/leadForm.js'
import { getLastProject, trailSummary } from '../lib/visitTrail.js'
import { openContactPopup, telHref, waHref, CONTACT_PHONE_DISPLAY } from '../lib/contact.js'
import { listProjectCards, cmsRowToCard, useSettings } from '../lib/cms.js'
import { srcOfResponsive } from '../lib/responsiveImage.js'
import { orderedVillasProjects, parseVillasSettings, matchVillaCard } from '../data/villasPage.js'
import {
  HOUSE_PAGES, HOUSE_STEPS, HOUSE_PROOF, HOUSE_ARMS, HOUSE_GUIDES, getHousePage, houseJsonLd,
} from '../data/houseLanding.js'
import { track } from '../lib/track.js'
import NotFound from './NotFound.jsx'
import './HouseLanding.css'

/* ============================================================
   עמודי נחיתה לבניית בית פרטי: /kablan-bniya-bayit-prati,
   /bniyat-vila-sharon ו-/bniyat-bayit-prati/<עיר>.
   התוכן כולו ב-data/houseLanding.js, משותף עם ה-prerender.
   ============================================================ */

/* איפה כל פרויקט נמצא. מתוך התיאורים ב-villasPage.js */
const PROJECT_PLACE = {
  'yordei-hayam': 'הוד השרון, שכונת גרינברג',
  'henrietta-szold': 'מערב הוד השרון',
  'hankin-41': 'הוד השרון, שכונת מגדיאל',
}

const TOPIC = 'construction'

export default function HouseLanding() {
  const { pathname } = useLocation()
  const page = getHousePage(pathname)
  if (!page) return <NotFound />
  return <HouseLandingPage key={page.path} page={page} />
}

function HouseLandingPage({ page }) {
  const jsonLd = useMemo(() => houseJsonLd(page), [page])
  const placement = `house_${page.key}`
  const estimate = (where) => () => {
    track('cta_click', { placement: `${placement}_${where}` })
    openContactPopup(TOPIC)
  }
  const call = (where) => () => track('phone_click', { placement: `${placement}_${where}` })

  const siblings = HOUSE_PAGES.filter((p) => p.path !== page.path)

  return (
    <article className="hl">
      <Seo title={page.title} description={page.description} image={page.heroImage} jsonLd={jsonLd} />

      {/* ---------- כותרת ---------- */}
      <header className="hl-hero">
        <img
          className="hl-hero__img"
          src={page.heroImage}
          alt={page.heroAlt}
          width="1600"
          height="900"
          fetchpriority="high"
          decoding="async"
        />
        <div className="hl-hero__shade" aria-hidden="true" />
        <div className="container hl-hero__inner">
          <Breadcrumbs items={page.crumbs} />
          <div className="hl-hero__copy">
            <h1 className="hl-hero__title">{page.h1}</h1>
            <p className="hl-hero__lead">{page.lead}</p>
            <div className="hl-hero__actions">
              <button type="button" className="btn btn--primary btn--lg" onClick={estimate('hero')}>
                קבלו הערכת עלות לבית שלכם
                <Icon name="arrowLeft" size={20} />
              </button>
              <a href={telHref()} className="btn btn--lg hl-btn-ghost" onClick={call('hero')}>
                <Icon name="phone" size={18} />
                <span dir="ltr">{CONTACT_PHONE_DISPLAY}</span>
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* ---------- הוכחות ---------- */}
      <div className="container hl-proof-wrap">
        <ul className="hl-proof" aria-label="בקצרה">
          {HOUSE_PROOF.map((f) => (
            <li key={f.v}><b>{f.v}</b><span>{f.u}</span></li>
          ))}
        </ul>
      </div>

      {/* ---------- תשובה ישירה + שתי הזרועות ---------- */}
      <section className="hl-section hl-intro">
        <div className="container hl-intro__grid">
          <div className="hl-intro__text">
            <h2 className="hl-h2">{page.intro.q}</h2>
            <p className="hl-intro__answer">{page.intro.a}</p>
            <Link to="/villas-sharon" className="hl-textlink">
              הווילות והבתים הפרטיים שאנחנו מקימים בהוד השרון
              <Icon name="arrowLeft" size={16} />
            </Link>
          </div>
          <div className="hl-arms">
            {HOUSE_ARMS.map((a) => (
              <Link key={a.name} to={a.to} className="hl-arm">
                <img src={a.logo} alt="" className="hl-arm__logo" loading="lazy" width="72" height="72" />
                <span className="hl-arm__body">
                  <b>{a.name}</b>
                  <span>{a.d}</span>
                </span>
              </Link>
            ))}
            <p className="hl-arms__note">מי שבודק אינו מי שבונה. שתי הזרועות באותה קבוצה, בידיים נפרדות.</p>
          </div>
        </div>
      </section>

      {/* ---------- התהליך ---------- */}
      <section className="hl-section hl-steps" aria-labelledby="hl-steps-title">
        <div className="container">
          <div className="hl-head">
            <h2 className="hl-h2" id="hl-steps-title">{page.stepsTitle}</h2>
            <p className="hl-head__lead">חמישה שלבים, וכתובת אחת לאורך כולם.</p>
          </div>
          <ol className="hl-timeline">
            {HOUSE_STEPS.map((s, i) => (
              <li key={s.t} className="hl-stage">
                <span className="hl-stage__num" aria-hidden="true">{i + 1}</span>
                <div className="hl-stage__body">
                  <h3 className="hl-stage__title">{s.t}</h3>
                  <span className="hl-stage__who">{s.who}</span>
                  <p>{s.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------- קריאה לפעולה באמצע העמוד ---------- */}
      <section className="hl-band-wrap" aria-labelledby="hl-band-title">
        <div className="container">
          <div className="hl-band">
            <div className="hl-band__text">
              <h2 id="hl-band-title">{page.ctaTitle}</h2>
              <p>נעבור יחד על המגרש והתוכנית, ונראה ממה בנוי המחיר של הבית שלכם.</p>
            </div>
            <div className="hl-band__actions">
              <button type="button" className="btn btn--primary btn--lg" onClick={estimate('band')}>
                קבלו הערכת עלות לבית שלכם
              </button>
              <a
                href={waHref('שלום, אשמח לקבל הערכת עלות לבניית בית פרטי')}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn--lg hl-btn-ghost"
                onClick={() => track('whatsapp_click', { placement: `${placement}_band` })}
              >
                <Icon name="whatsapp" size={18} /> וואטסאפ
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- פרויקטים ---------- */}
      <HouseProjects title={page.projectsTitle} lead={page.projectsLead} />

      {/* ---------- רשימת בדיקות ---------- */}
      <section className="hl-section hl-check" aria-labelledby="hl-check-title">
        <div className="container hl-check__grid">
          <div className="hl-check__head">
            <h2 className="hl-h2" id="hl-check-title">{page.check.title}</h2>
            <p>{page.check.lead}</p>
          </div>
          <ul className="hl-check__list">
            {page.check.items.map(([t, d]) => (
              <li key={t}>
                <span className="hl-check__ic" aria-hidden="true"><Icon name="check" size={16} /></span>
                <span><b>{t}</b> {d}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------- שאלות נפוצות ---------- */}
      <section className="hl-section hl-faq" aria-labelledby="hl-faq-title">
        <div className="container hl-faq__inner">
          <h2 className="hl-h2" id="hl-faq-title">{page.faqTitle}</h2>
          <div className="hl-faq__list">
            {page.faqs.map((f) => (
              <details key={f.q} className="hl-faq__item">
                <summary>
                  <span>{f.q}</span>
                  <span className="hl-faq__sign" aria-hidden="true" />
                </summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- קישורים פנימיים ---------- */}
      <nav className="hl-section hl-links" aria-label="עוד בנושא">
        <div className="container hl-links__grid">
          <div>
            <h2 className="hl-links__title">מדריכים שכדאי לקרוא לפני שמחליטים</h2>
            <ul>
              {HOUSE_GUIDES.map((g) => (
                <li key={g.to}><Link to={g.to}>{g.label}<Icon name="arrowLeft" size={15} /></Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="hl-links__title">בונים בית פרטי באזור</h2>
            <ul>
              {siblings.map((p) => (
                <li key={p.path}><Link to={p.path}>{p.navLabel}<Icon name="arrowLeft" size={15} /></Link></li>
              ))}
              <li><Link to="/villas-sharon">הווילות שאנחנו מקימים בהוד השרון<Icon name="arrowLeft" size={15} /></Link></li>
            </ul>
          </div>
        </div>
      </nav>

      {/* ---------- טופס ---------- */}
      <HouseLead placement={placement} />
    </article>
  )
}

/* ---------- כרטיסי הפרויקטים ----------
   הפרויקטים והמפרט מ-villasPage.js, התמונות מאותה מערכת ניהול שעמוד
   הווילות משתמש בה (כולל ההדמיה שנבחרה שם באדמין). בלי תמונה, הכרטיס
   מוצג כשרטוט בצבעי המותג ולא כתמונה שאינה של הפרויקט. */
function HouseProjects({ title, lead }) {
  const settings = useSettings()
  const villas = useMemo(() => parseVillasSettings(settings.villas_page), [settings.villas_page])
  const projects = useMemo(() => orderedVillasProjects(settings.villas_page), [settings.villas_page])
  const [cards, setCards] = useState([])

  useEffect(() => {
    let on = true
    listProjectCards()
      .then((rows) => { if (on) setCards((rows || []).map(cmsRowToCard)) })
      .catch(() => {})
    return () => { on = false }
  }, [])

  return (
    <section className="hl-section hl-projects" aria-labelledby="hl-projects-title">
      <div className="container">
        <div className="hl-head">
          <h2 className="hl-h2" id="hl-projects-title">{title}</h2>
          <p className="hl-head__lead">{lead}</p>
        </div>
        <ul className="hl-projects__grid">
          {projects.map((p) => {
            const card = matchVillaCard(cards, p.slug, villas.projects[p.slug]?.cms || '')
            const cover = srcOfResponsive(villas.projects[p.slug]?.hero) || card?.cover || ''
            const to = card?.slug ? `/projects/${card.slug}` : '/villas-sharon'
            return (
              <li key={p.slug}>
                <Link to={to} className="hl-project">
                  <span className={`hl-project__media${cover ? '' : ' is-plan'}`}>
                    {cover ? (
                      <SmartImage src={cover} alt={`${p.name}, ${p.kind}`} label={p.name} w={900} sizes="(max-width: 760px) 100vw, 420px" />
                    ) : (
                      <span className="hl-project__plan" aria-hidden="true">{p.name}</span>
                    )}
                    <span className={`hl-project__status${p.status === 'בבנייה' ? ' is-building' : ''}`}>{p.status}</span>
                  </span>
                  <span className="hl-project__cap">
                    <b className="hl-project__name">{p.name}</b>
                    <span className="hl-project__place"><Icon name="location" size={14} /> {PROJECT_PLACE[p.slug]}</span>
                    <span className="hl-project__kind">{p.kind}</span>
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}

/* ---------- הטופס בסוף העמוד ----------
   אותם רכיבי טופס ואותה שורת ליד כמו בסקשן צור קשר (Contact.jsx),
   עם נושא קבוע של ביצוע, ולצידם עמודת אמון: שלומי קורקוס והקשר הישיר. */
function HouseLead({ placement }) {
  const lf = useLeadForm({ form: 'house_landing', idPrefix: 'hl' })

  const handleSubmit = (e) => {
    e.preventDefault()
    lf.submit((v) => ({
      ...v,
      project: (() => {
        const interest = getLastProject()
        const he = heDict.contactExtra.topics[TOPIC] + (interest ? ` · התעניין ב: ${interest.name}` : '')
        const en = enDict.contactExtra.topics[TOPIC] + (interest ? ` · Interested in: ${interest.name}` : '')
        return interest ? { he, en, slug: interest.slug || '' } : { he, en }
      })(),
      notes: trailSummary() ? `מסע באתר: ${trailSummary()}` : undefined,
      source: 'contact',
      status: 'new',
    }), { topic: TOPIC })
  }

  return (
    <section className="hl-section hl-lead" id="contact" aria-labelledby="hl-lead-title">
      <div className="container hl-lead__grid">
        <aside className="hl-trust">
          <img src="/shlomi-office.webp" alt="שלומי קורקוס" className="hl-trust__photo" width="800" height="1200" loading="lazy" />
          <div className="hl-trust__body">
            <b className="hl-trust__name">שלומי קורקוס</b>
            <span className="hl-trust__role">מנכ"ל ומייסד קורקוס גרופ</span>
            <p>איש מקצוע בעל מעל 30 שנות ניסיון בעולם הבנייה, שמוביל את הקבוצה מאז הקמתה.</p>
            <div className="hl-trust__actions">
              <a href={telHref()} className="hl-trust__link" onClick={() => track('phone_click', { placement: `${placement}_trust` })}>
                <Icon name="phone" size={18} /> <span dir="ltr">{CONTACT_PHONE_DISPLAY}</span>
              </a>
              <a
                href={waHref('שלום שלומי, אשמח לדבר על בניית בית פרטי')}
                target="_blank"
                rel="noopener noreferrer"
                className="hl-trust__link"
                onClick={() => track('whatsapp_click', { placement: `${placement}_trust` })}
              >
                <Icon name="whatsapp" size={18} /> וואטסאפ
              </a>
            </div>
            <span className="hl-trust__addr"><Icon name="location" size={15} /> רחוב הנגר 24, מגדלי Amy, הוד השרון</span>
          </div>
        </aside>

        <div className="hl-form">
          <h2 className="hl-form__title" id="hl-lead-title">קבלו הערכת עלות לבית שלכם</h2>
          <p className="hl-form__lead">השאירו פרטים, ונחזור אליכם כדי לעבור יחד על המגרש והתוכנית.</p>
          {lf.sent ? (
            <LeadSuccess form="house_landing" tone="dark" />
          ) : (
            <form className="hl-form__fields lf-dark" onSubmit={handleSubmit} onInput={lf.onStart} noValidate>
              <LeadFields lf={lf} messagePlaceholder="איפה המגרש, ובאיזה שלב אתם?" />
              <LeadFailure lf={lf} topicLabel={heDict.contactExtra.topics[TOPIC]} tone="dark" />
              <LeadSubmit lf={lf} className="btn btn--primary btn--lg hl-form__submit" />
            </form>
          )}
        </div>
      </div>
    </section>
  )
}
