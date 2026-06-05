import { useI18n } from '../i18n/index.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import Reveal from '../components/ui/Reveal.jsx'
import './InfoPage.css'

/* דף משפטי גנרי. kind = 'accessibility' | 'privacy' | 'terms' */
export default function Legal({ kind }) {
  const { t, lang } = useI18n()
  const title = t(`pages.legal.${kind}`)

  const body = {
    he: {
      accessibility: 'אתר קורקוס גרופ שואף לאפשר גלישה נוחה ונגישה לכלל המשתמשים, לרבות אנשים עם מוגבלות. האתר נבנה בהתאם להנחיות הנגישות (WCAG) וכולל תמיכה בניווט מקלדת, ניגודיות צבעים וטקסט חלופי לתמונות. נתקלתם בבעיה? נשמח לשמוע בכתובת info@kurkoos-group.co.il.',
      privacy: 'אנו מכבדים את פרטיותכם. מידע שתמסרו באתר (כגון בטופס יצירת קשר או הרשמה לדיוור) ישמש אך ורק למטרה שלשמה נמסר, לא יועבר לצדדים שלישיים ללא הסכמתכם, ותוכלו לבקש את הסרתו בכל עת.',
      terms: 'השימוש באתר כפוף לתנאים אלה. התכנים באתר מוצגים למטרות מידע כללי בלבד ואינם מהווים התחייבות או הצעה מחייבת. קורקוס גרופ שומרת על זכותה לעדכן את התכנים והתנאים בכל עת.',
    },
    en: {
      accessibility: 'The Kurkoos Group website strives to provide a comfortable and accessible experience for all users, including people with disabilities. The site is built per WCAG accessibility guidelines and supports keyboard navigation, color contrast and alternative text for images. Found an issue? We would love to hear at info@kurkoos-group.co.il.',
      privacy: 'We respect your privacy. Information you provide on the site (such as via the contact form or newsletter signup) is used only for the purpose for which it was given, is not shared with third parties without your consent, and may be removed upon request at any time.',
      terms: 'Use of this website is subject to these terms. Content is provided for general information only and does not constitute a binding commitment or offer. Kurkoos Group reserves the right to update content and terms at any time.',
    },
  }

  return (
    <>
      <PageHeader title={title} crumbs={[{ label: title }]} />
      <section className="section">
        <Reveal className="container legal-prose">
          <p>{body[lang][kind]}</p>
        </Reveal>
      </section>
    </>
  )
}
