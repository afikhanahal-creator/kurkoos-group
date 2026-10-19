import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import Seo from '../components/ui/Seo.jsx'
import Icon from '../components/ui/Icon.jsx'
import Breadcrumbs from '../components/ui/Breadcrumbs.jsx'
import InfiniteGrid from '../components/ui/InfiniteGrid.jsx'
import { openContactPopup, telHref, waHref, CONTACT_PHONE_DISPLAY } from '../lib/contact.js'
import { track } from '../lib/track.js'
import {
  HH_TITLE, HH_DESCRIPTION, HH_H1, HH_ANSWER, HH_UPDATED, HH_UPDATED_HE, HH_LEGAL_NAME,
  HH_SERVICES, HH_PROJECTS, HH_CHECKLIST, HH_TABLE, HH_FAQS, HH_CONTACT, HH_CRUMBS, hhJsonLd,
} from '../data/hodHasharonAnswer.js'
import DEF from '../lib/pageBuilder/defs/hodAnswer.js'
import { PageSections } from '../lib/pageBuilder/PageRenderer.jsx'
import './HouseLanding.css'
import './HodHasharonAnswer.css'

/* ============================================================
   חברת בנייה ופיקוח בהוד השרון: עמוד שעונה ישירות על השאלה
   "איזו חברת בנייה ופיקוח יש בהוד השרון", מי אנחנו, מה כל זרוע
   עושה, איך בוחרים, ופרטי קשר. התוכן ב-data/hodHasharonAnswer.js,
   משותף עם ה-prerender. העיצוב נשען על מחלקות hl של עמודי הנחיתה.
   ============================================================ */

const PLACEMENT = 'hh_answer'

/* הסקשנים של העמוד, לפי הסדר. פעולות המעקב מוגדרות פעם אחת בעמוד ומגיעות ב-ctx */
const LOCAL = {
  /* ---------- כותרת ותשובה ישירה ---------- */
  hero: ({ ctx: { call, lead } }) => (
    <header className="hl-hero hh-hero">
      <InfiniteGrid color="rgba(143,182,200,1)" baseOpacity={0.14} revealOpacity={0.42} size={48} speed={0.25} />
      <div className="hl-hero__glow" aria-hidden="true" />
      <div className="container hl-hero__inner">
        <Breadcrumbs items={HH_CRUMBS} />
        <div className="hl-hero__grid hh-hero__grid">
          <div className="hl-hero__copy">
            <h1 className="hl-hero__title">{HH_H1}</h1>
            <p className="hl-hero__lead hh-answer">{HH_ANSWER}</p>
            <p className="hh-updated">עודכן לאחרונה: <time dateTime={HH_UPDATED}>{HH_UPDATED_HE}</time></p>
            <div className="hl-hero__actions">
              <button type="button" className="btn btn--primary btn--lg" onClick={lead('hero')}>
                השאירו פרטים
                <Icon name="arrowLeft" size={20} />
              </button>
              <a href={telHref()} className="btn btn--lg hl-btn-ghost" onClick={call('hero')}>
                <Icon name="phone" size={18} />
                <span dir="ltr">{CONTACT_PHONE_DISPLAY}</span>
              </a>
            </div>
          </div>
          <div className="hl-sign hh-sign" role="note" aria-label="בקצרה">
            <span className="hl-sign__band">קבוצת קורקוס</span>
            <dl className="hl-sign__rows">
              <div><dt>בנייה</dt><dd>ראיתה, זרוע הביצוע</dd></div>
              <div><dt>פיקוח מטעמכם</dt><dd>שכינתא, זרוע נפרדת</dd></div>
              <div><dt>המשרד</dt><dd>הנגר 24, הוד השרון</dd></div>
              <div><dt>שעות</dt><dd>{HH_CONTACT.hours}</dd></div>
              <div>
                <dt>טלפון</dt>
                <dd><a href={telHref()} onClick={call('sign')} dir="ltr">{CONTACT_PHONE_DISPLAY}</a></dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </header>
  ),
  /* ---------- בעמוד הזה ---------- */
  jump: () => (
    <nav className="container hl-jump hh-jump" aria-label="בעמוד הזה">
      <span className="hl-jump__label">בעמוד הזה</span>
      <ul>
        <li><a href="#hh-services">מה אנחנו עושים</a></li>
        <li><a href="#hh-projects">פרויקטים</a></li>
        <li><a href="#hh-choose">איך בוחרים</a></li>
        <li><a href="#hh-table">קבלן מול מפקח</a></li>
        <li><a href="#hh-faq">שאלות</a></li>
        <li><a href="#hh-contact">פרטי קשר</a></li>
      </ul>
    </nav>
  ),
  /* ---------- מה אנחנו עושים ---------- */
  services: () => (
    <section className="hl-section" aria-labelledby="hh-services">
      <div className="container">
        <div className="hl-head">
          <h2 className="hl-h2" id="hh-services">מה אנחנו עושים בהוד השרון</h2>
          <p className="hl-head__lead">ארבע זרועות תחת קבוצה אחת. כל אחת עם תפקיד ואחריות משלה.</p>
        </div>
        <ul className="hh-services">
          {HH_SERVICES.map((s) => (
            <li key={s.key} className="hh-service">
              <h3 className="hh-service__title">{s.title}</h3>
              <p>{s.text}</p>
              <Link to={s.to} className="hl-textlink">
                {s.link}
                <Icon name="arrowLeft" size={16} />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  ),
  /* ---------- פרויקטים ---------- */
  projects: () => (
    <section className="hl-section hl-check" aria-labelledby="hh-projects">
      <div className="container">
        <div className="hl-head">
          <h2 className="hl-h2" id="hh-projects">פרויקטים בהוד השרון ובסביבה</h2>
          <p className="hl-head__lead">אפשר לתאם סיור באתר ולראות את הביצוע מקרוב.</p>
        </div>
        <ul className="hh-projects">
          {HH_PROJECTS.map((p) => (
            <li key={p.name}>
              <Link to={p.to} className="hh-project">
                <span className="hh-project__top">
                  <b className="hl-project__name">{p.name}</b>
                  {p.status && <span className={`hh-project__status${p.status === 'בבנייה' ? ' is-building' : ''}`}>{p.status}</span>}
                </span>
                <span className="hl-project__place"><Icon name="location" size={14} /> {p.place}</span>
                <span className="hl-project__kind">{p.text}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  ),
  /* ---------- איך בוחרים ---------- */
  choose: () => (
    <section className="hl-section" aria-labelledby="hh-choose">
      <div className="container hl-check__grid">
        <div className="hl-check__head">
          <h2 className="hl-h2" id="hh-choose">איך בוחרים חברת בנייה ומפקח בהוד השרון</h2>
          <p>את חברת הבנייה ואת המפקח בוחרים פעם אחת, ואת הבית הם משאירים לכם לשנים. אלה הבדיקות שכדאי לעשות לפני שחותמים.</p>
        </div>
        <ol className="hh-steps">
          {HH_CHECKLIST.map(([t, d], i) => (
            <li key={t}>
              <span className="hh-steps__num" aria-hidden="true">{i + 1}</span>
              <span><b>{t}.</b> {d}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  ),
  /* ---------- טבלה ---------- */
  table: () => (
    <section className="hl-section hl-check" aria-labelledby="hh-table">
      <div className="container">
        <div className="hl-head">
          <h2 className="hl-h2" id="hh-table">קבלן מבצע מול מפקח מטעם המזמין</h2>
          <p className="hl-head__lead">שני תפקידים, שני הסכמים, ואינטרס אחד שלכם: בית שנבנה לפי התוכנית.</p>
        </div>
        <div className="hh-table-wrap" role="region" aria-label="טבלת ההשוואה, אפשר לגלול לצדדים" tabIndex={0}>
          <table className="hh-table">
            <thead>
              <tr>{HH_TABLE.cols.map((c, i) => (i === 0 ? <td key="corner" /> : <th key={c} scope="col">{c}</th>))}</tr>
            </thead>
            <tbody>
              {HH_TABLE.rows.map(([h, a, b]) => (
                <tr key={h}>
                  <th scope="row">{h}</th>
                  <td data-label={HH_TABLE.cols[1]}>{a}</td>
                  <td data-label={HH_TABLE.cols[2]}>{b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  ),
  /* ---------- שאלות ---------- */
  faq: () => (
    <section className="hl-section hl-faq" aria-labelledby="hh-faq">
      <div className="container hl-faq__inner">
        <h2 className="hl-h2" id="hh-faq">שאלות על בנייה ופיקוח בהוד השרון</h2>
        <div className="hl-faq__list">
          {HH_FAQS.map((f) => (
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
  ),
  /* ---------- פרטי קשר ---------- */
  contact: ({ ctx: { call, lead } }) => (
    <section className="hl-section hl-check" aria-labelledby="hh-contact" id="contact">
      <div className="container hh-contact">
        <div>
          <h2 className="hl-h2" id="hh-contact">פרטי קשר</h2>
          <p className="hh-contact__legal">{HH_LEGAL_NAME}</p>
          <dl className="hh-contact__rows">
            <div><dt>כתובת</dt><dd>{HH_CONTACT.address}</dd></div>
            <div><dt>טלפון</dt><dd><a href={telHref()} onClick={call('contact')} dir="ltr">{HH_CONTACT.phone}</a></dd></div>
            <div><dt>אימייל</dt><dd><a href={`mailto:${HH_CONTACT.email}`}>{HH_CONTACT.email}</a></dd></div>
            <div><dt>שעות פעילות</dt><dd>{HH_CONTACT.hours}</dd></div>
            <div><dt>בגוגל</dt><dd><a href={HH_CONTACT.gbp} target="_blank" rel="noopener noreferrer">הפרופיל העסקי של הקבוצה</a></dd></div>
          </dl>
          <p className="hh-updated hh-updated--dark">עודכן לאחרונה: <time dateTime={HH_UPDATED}>{HH_UPDATED_HE}</time></p>
        </div>
        <div className="hh-contact__actions">
          <button type="button" className="btn btn--primary btn--lg" onClick={lead('contact')}>השאירו פרטים</button>
          <a
            href={waHref('שלום, אשמח לדבר על בנייה ופיקוח בהוד השרון')}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn--lg btn--ghost"
            onClick={() => track('whatsapp_click', { placement: `${PLACEMENT}_contact` })}
          >
            <Icon name="whatsapp" size={18} /> וואטסאפ
          </a>
          <ul className="hh-contact__links">
            <li><Link to="/bniyat-bayit-prati/hod-hasharon">בניית בית פרטי בהוד השרון</Link></li>
            <li><Link to="/villas-sharon">הווילות שאנחנו מקימים בהוד השרון</Link></li>
            <li><Link to="/construction-supervision/mefakeach-bniya-bayit-prati">מה בודק מפקח בנייה בבית פרטי</Link></li>
            <li><Link to="/constructions/livchor-chevrat-bniya-bayit-prati">איך בוחרים חברת בנייה לבית פרטי</Link></li>
          </ul>
        </div>
      </div>
    </section>
  ),
}

export default function HodHasharonAnswer() {
  const jsonLd = useMemo(() => hhJsonLd(), [])
  const call = (where) => () => track('phone_click', { placement: `${PLACEMENT}_${where}` })
  const lead = (where) => () => {
    track('cta_click', { placement: `${PLACEMENT}_${where}` })
    openContactPopup('construction')
  }

  return (
    <article className="hl hh">
      <Seo title={HH_TITLE} description={HH_DESCRIPTION} jsonLd={jsonLd} />
      <PageSections def={DEF} local={LOCAL} ctx={{ call, lead }} />
    </article>
  )
}
