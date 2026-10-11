import { Link } from 'react-router-dom'
import Seo from '../components/ui/Seo.jsx'
import Breadcrumbs from '../components/ui/Breadcrumbs.jsx'
import ArticleCover from '../components/ui/ArticleCover.jsx'
import Reveal from '../components/ui/Reveal.jsx'
import ArticleLeadCard from '../components/ui/ArticleLeadCard.jsx'
import { FAQ_HUB_PATH, FAQ_HUB_TITLE, FAQ_HUB_INTRO, FAQ_HUB_GROUPS } from '../data/faqHub.js'
import { faqHubLd } from '../lib/seo.js'
import './Yazamut.css'

/* ============================================================
   מרכז שאלות ותשובות. אותה תבנית עיצוב של עמוד כתבה (yz-article),
   כדי שהעמוד ייראה כחלק מהמדריכים ולא כעמוד חדש בעיצוב אחר.
   השאלות והתשובות מגיעות מ-data/faqHub.js, אותו מקור שה-prerender
   משתמש בו, וה-FAQPage נבנה רק מהשאלות שמוצגות כאן בעמוד.
   ============================================================ */

const COVER = { title: FAQ_HUB_TITLE, category: 'בקרת איכות', coverAlt: 'שאלות ותשובות על בנייה, פיקוח ויזמות נדל"ן' }

export default function FaqHub() {
  return (
    <article className="yz-article">
      <Seo
        title={FAQ_HUB_TITLE}
        description={FAQ_HUB_INTRO}
        jsonLd={faqHubLd(FAQ_HUB_GROUPS)}
      />

      <header className="yz-hero">
        <div className="yz-hero__bg">
          <ArticleCover article={COVER} variant="hero" />
        </div>
        <div className="yz-hero__overlay" />
        <div className="container yz-hero__content">
          <Breadcrumbs items={[{ label: 'שאלות ותשובות', to: FAQ_HUB_PATH }]} />
          <span className="yz-hero__cat">שאלות ותשובות</span>
          <h1 className="yz-hero__title">{FAQ_HUB_TITLE}</h1>
        </div>
      </header>

      <section className="section">
        <Reveal className="container yz-body">
          <p className="yz-lead">{FAQ_HUB_INTRO}</p>
          <div className="mdx">
            <ul>
              {FAQ_HUB_GROUPS.map((g) => (
                <li key={g.id}><a className="mdx__auto-link" href={`#${g.id}`}>{g.title}</a></li>
              ))}
            </ul>
            {FAQ_HUB_GROUPS.map((g) => (
              <section key={g.id} id={g.id} aria-labelledby={`${g.id}-h`}>
                <h2 id={`${g.id}-h`}>{g.title}</h2>
                {g.items.map((f) => (
                  <div key={f.q}>
                    <h3>{f.q}</h3>
                    <p>
                      {f.a}{' '}
                      <Link className="mdx__auto-link" to={f.to}>לתשובה המלאה: {f.more}</Link>
                    </p>
                  </div>
                ))}
              </section>
            ))}
          </div>

          <ArticleLeadCard
            column="faq"
            topic="construction"
            title="לא מצאתם את השאלה שלכם?"
            text="השאירו פרטים או התקשרו ל-055-981-1814, ונחזור אליכם עם תשובה שמתאימה לפרויקט שלכם."
            serviceTo="/divisions/supervision"
            serviceLabel="לשירותי הפיקוח"
          />
        </Reveal>
      </section>
    </article>
  )
}
