import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/ui/PageHeader.jsx'
import Reveal from '../components/ui/Reveal.jsx'
import Seo from '../components/ui/Seo.jsx'
import Icon from '../components/ui/Icon.jsx'
import { glossaryGroups, allTerms } from '../data/glossary.js'
import './Glossary.css'

/* ============================================================
   מילון מונחי נדל"ן — עמוד ידע: הגדרות ברורות לכל מונחי המפתח,
   עם עוגן לכל מונח (קישור ישיר), חיפוש, מונחים קשורים וקישורים
   פנימיים למדריכים ולשירותי הקבוצה. מוזן ל-DefinedTermSet schema.
   ============================================================ */

const GUIDE_LINKS = [
  { to: '/yazamut-nadlan', label: 'המדריך ליזמות נדל"ן' },
  { to: '/constructions', label: 'המדריך לתהליך הבנייה' },
  { to: '/construction-supervision', label: 'המדריך לפיקוח בנייה' },
  { to: '/real-estate-guide', label: 'המדריך לרוכש ולמוכר' },
  { to: '/madrich-yazamim', label: 'המדריך ליזמי נדל"ן צעירים' },
]

export default function Glossary() {
  const [query, setQuery] = useState('')

  const termIndex = useMemo(() => new Map(allTerms().map((t) => [t.id, t])), [])

  const groups = useMemo(() => {
    const q = query.trim()
    if (!q) return glossaryGroups
    return glossaryGroups
      .map((g) => ({ ...g, terms: g.terms.filter((t) => t.term.includes(q) || t.def.includes(q)) }))
      .filter((g) => g.terms.length > 0)
  }, [query])

  const total = useMemo(() => allTerms().length, [])

  /* DefinedTermSet — כל המונחים כישויות מוגדרות */
  const jsonLd = useMemo(() => ({
    '@context': 'https://schema.org',
    '@type': 'DefinedTermSet',
    name: 'מילון מונחי נדל"ן',
    description: 'הגדרות ברורות למונחי המפתח בעולם הנדל"ן, התכנון והבנייה בישראל.',
    url: 'https://www.kurkoos-group.co.il/real-estate-glossary',
    hasDefinedTerm: allTerms().map((t) => ({
      '@type': 'DefinedTerm',
      name: t.term,
      description: t.def,
      url: `https://www.kurkoos-group.co.il/real-estate-glossary#${t.id}`,
    })),
  }), [])

  return (
    <>
      <Seo jsonLd={jsonLd} />
      <PageHeader
        eyebrow="מאגר ידע"
        title='מילון מונחי נדל"ן'
        lead='הגדרות ברורות וענייניות לכל מונחי המפתח בעולם הנדל"ן, התכנון והבנייה בישראל — מתב"ע ועד טופס 4. נכתב מהניסיון המעשי של צוות קורקוס גרופ.'
        crumbs={[{ label: 'מילון מונחי נדל"ן' }]}
        seoTitle='מילון מונחי נדל"ן'
        seoDescription='מה זה תב"ע? מה ההבדל בין מס רכישה למס שבח? מה כוללת ערבות חוק המכר? מילון מונחי הנדל"ן של קורקוס גרופ — הגדרות ברורות לכל מונחי המפתח בתכנון, עסקאות, מימון ובנייה.'
      />

      <section className="section glossary">
        <div className="container">
          {/* חיפוש */}
          <Reveal className="glossary__search-wrap">
            <input
              type="search"
              className="glossary__search"
              placeholder={`חיפוש מבין ${total} מונחים…`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="חיפוש מונח"
            />
          </Reveal>

          {/* ניווט קטגוריות */}
          {!query && (
            <nav className="glossary__nav" aria-label="קטגוריות המילון">
              {glossaryGroups.map((g) => (
                <a key={g.id} href={`#cat-${g.id}`} className="glossary__nav-link">{g.title}</a>
              ))}
            </nav>
          )}

          {groups.length === 0 && (
            <p className="glossary__empty">לא נמצאו מונחים התואמים את החיפוש.</p>
          )}

          {groups.map((g) => (
            <div key={g.id} className="glossary__group" id={`cat-${g.id}`}>
              <Reveal><h2 className="glossary__group-title">{g.title}</h2></Reveal>
              <div className="glossary__list">
                {g.terms.map((t) => (
                  <Reveal key={t.id}>
                    <article className="glossary__term" id={t.id}>
                      <h3 className="glossary__term-name">
                        <a href={`#${t.id}`} className="glossary__anchor" aria-label={`קישור ישיר: ${t.term}`}>#</a>
                        {t.term}
                      </h3>
                      <p className="glossary__term-def">{t.def}</p>
                      {t.related?.length > 0 && (
                        <p className="glossary__related">
                          <span>מונחים קשורים:</span>
                          {t.related.map((rid) => termIndex.get(rid)).filter(Boolean).map((rt) => (
                            <a key={rt.id} href={`#${rt.id}`}>{rt.term}</a>
                          ))}
                        </p>
                      )}
                    </article>
                  </Reveal>
                ))}
              </div>
            </div>
          ))}

          {/* קישורים פנימיים — המשך קריאה במדריכים */}
          <Reveal className="glossary__more">
            <h2 className="glossary__group-title">להעמיק עוד</h2>
            <p className="glossary__more-lead">המילון הוא נקודת פתיחה. במדריכים המקצועיים שלנו תמצאו כתבות מעמיקות על כל תחום:</p>
            <div className="glossary__more-links">
              {GUIDE_LINKS.map((l) => (
                <Link key={l.to} to={l.to} className="glossary__more-link">
                  {l.label}
                  <Icon name="arrow" size={16} />
                </Link>
              ))}
            </div>
          </Reveal>
        </div>
      </section>
    </>
  )
}
