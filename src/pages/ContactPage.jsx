import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useI18n, useLocalized } from '../i18n/index.jsx'
import heDict from '../i18n/he.js'
import enDict from '../i18n/en.js'
import site from '../data/site.js'
import { createLead, useSettings } from '../lib/cms.js'
import { track } from '../lib/track.js'
import { getLastProject, trailSummary } from '../lib/visitTrail.js'
import Seo from '../components/ui/Seo.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import Icon from '../components/ui/Icon.jsx'
import OfficeMap from '../components/ui/OfficeMap.jsx'
import './ContactPage.css'

/* ============================================================
   עמוד "השארת פרטים" עצמאי, בכתובת /contact.

   הוא קיים כדי שיהיה לנו קישור אחד שאפשר להדביק בכל מקום מחוץ
   לאתר: כפתור "בקשת הצעת מחיר" בפרופיל העסק בגוגל, הביוגרפיה
   באינסטגרם, חתימת מייל, מודעה ממומנת או הודעת וואטסאפ. עד היום
   הטופס היחיד ישב באמצע עמוד הבית, וקישור אליו הפיל את הגולש
   לעמוד ארוך שבו הוא צריך לחפש את הטופס.

   מאיפה הגיע הפונה: פרמטר src בכתובת, למשל /contact?src=google.
   הוא נשמר בתיוג הליד, כך שבאדמין רואים בדיוק איזה ערוץ ייצר את
   הפנייה. בלי הפרמטר הליד עדיין נשמר, פשוט בלי ייחוס.
   ============================================================ */

const TOPICS = ['development', 'construction', 'supervision', 'brokerage', 'mentorship', 'other']

/* ערוצים מוכרים מקבלים שם קריא בעברית. ערך אחר נשמר כפי שהוא,
   מנוקה מתווים חריגים, כדי שנוכל לייצר קישורים חדשים בלי לגעת בקוד. */
const SOURCES = {
  google: { he: 'פרופיל העסק בגוגל', en: 'Google Business Profile' },
  gbp: { he: 'פרופיל העסק בגוגל', en: 'Google Business Profile' },
  maps: { he: 'גוגל מפות', en: 'Google Maps' },
  facebook: { he: 'פייסבוק', en: 'Facebook' },
  instagram: { he: 'אינסטגרם', en: 'Instagram' },
  whatsapp: { he: 'וואטסאפ', en: 'WhatsApp' },
  email: { he: 'חתימת מייל', en: 'Email signature' },
  qr: { he: 'קוד QR', en: 'QR code' },
  ads: { he: 'קמפיין ממומן', en: 'Paid campaign' },
}

/* ערוץ לא מוכר נשמר כפי שהוא, מנוקה מתווים חריגים ובאותו נוסח לשתי
   השפות, כדי שאפשר יהיה לייצר קישורים חדשים בלי לגעת בקוד. */
function originLabel(raw) {
  if (!raw) return null
  const key = String(raw).trim().toLowerCase()
  if (SOURCES[key]) return SOURCES[key]
  const clean = String(raw).replace(/[^\w֐-׿ .-]/g, '').slice(0, 40)
  return clean ? { he: clean, en: clean } : null
}

export default function ContactPage() {
  const { t } = useI18n()
  const L = useLocalized()
  const s = useSettings()
  const [params] = useSearchParams()

  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [topic, setTopic] = useState(TOPICS.includes(params.get('topic')) ? params.get('topic') : 'development')

  const origin = originLabel(params.get('src'))
  const phone = s.contact_phone || site.contact.phone
  const phoneDisplay = s.contact_phone || site.contact.phoneDisplay
  const waLink = `https://wa.me/${site.contact.whatsapp}`

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (busy) return
    setBusy(true); setError('')
    const fd = new FormData(e.currentTarget)
    const interest = getLastProject()
    // הערוץ נכתב ראשון בתיוג, כדי שבלוח הלידים רואים מיד מאיפה הגיעה
    // הפנייה בלי לפתוח את הכרטיס.
    const tag = (dict) => {
      const he = dict === heDict
      let v = ''
      if (origin) v += `${he ? 'הגיע מ' : 'From'}: ${he ? origin.he : origin.en} · `
      v += dict.contactExtra.topics[topic]
      if (interest) v += ` · ${he ? 'התעניין ב' : 'Interested in'}: ${interest.name}`
      return v
    }
    const lead = {
      name: String(fd.get('name') || '').trim(),
      phone: String(fd.get('phone') || '').trim(),
      email: String(fd.get('email') || '').trim(),
      message: String(fd.get('message') || '').trim(),
      project: interest
        ? { he: tag(heDict), en: tag(enDict), slug: interest.slug || '' }
        : { he: tag(heDict), en: tag(enDict) },
      notes: trailSummary() ? `מסע באתר: ${trailSummary()}` : undefined,
      // 'contact' ולא ערך חדש כמו 'landing': מדיניות ה-RLS בסופאבייס
      // (supabase/security_hardening.sql) מאשרת רק project/contact/home/manual,
      // וכל ערך אחר היה נדחה בהכנסה והליד היה הולך לאיבוד. הערוץ שממנו הגיע
      // הפונה נשמר בתיוג שלמעלה, כך שאין שום מידע שאובד כאן.
      source: 'contact',
      status: 'new',
    }
    try {
      await createLead(lead, { read: false })
      // ב-GA שומרים את המפתח הגולמי (google / facebook), לא את התווית בעברית
      track('generate_lead', { form: 'contact_page', topic, src: params.get('src') || 'direct' })
      setSent(true)
    } catch (err) {
      setError(L({
        he: 'אירעה שגיאה בשליחה. נסו שוב, או חייגו אלינו ישירות.',
        en: 'Something went wrong. Please try again or call us directly.',
      }))
      if (typeof console !== 'undefined') console.error('createLead failed:', err?.message || err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Seo
        title={L({ he: 'השארת פרטים ויצירת קשר', en: 'Leave your details' })}
        description={L({
          he: 'השאירו פרטים וניצור קשר: יזמות נדל"ן, ביצוע ובנייה, ניהול ופיקוח פרויקטים ותיווך. המשרד ברחוב הנגר 24 בהוד השרון, ופעילות בהוד השרון ובאזור המרכז.',
          en: 'Leave your details and we will get back to you: development, construction, project supervision and brokerage.',
        })}
      />
      <PageHeader
        eyebrow={L({ he: 'דברו איתנו', en: 'Talk to us' })}
        title={L({ he: 'השאירו פרטים ונחזור אליכם', en: 'Leave your details' })}
        lead={L({
          he: 'מלאו את הטופס ונחזור אליכם בהקדם. אפשר גם להתקשר או לכתוב בוואטסאפ, מה שנוח לכם.',
          en: 'Fill in the form and we will get back to you shortly. You can also call or send a WhatsApp message.',
        })}
        crumbs={[{ label: L({ he: 'השארת פרטים', en: 'Contact' }) }]}
      />

      <section className="section cpage">
        <div className="container cpage__inner">
          <div className="cpage__form-card">
            {sent ? (
              <div className="cpage__success">
                <span className="cpage__success-icon"><Icon name="check" size={40} /></span>
                <p>{t('contact.sent')}</p>
              </div>
            ) : (
              <>
                <p className="cpage__choose">{t('contactExtra.choose')}</p>
                <div className="cpage__topics">
                  {TOPICS.map((tp) => (
                    <button
                      key={tp}
                      type="button"
                      className={`cpage__topic ${topic === tp ? 'is-active' : ''}`}
                      onClick={() => setTopic(tp)}
                    >
                      {t(`contactExtra.topics.${tp}`)}
                    </button>
                  ))}
                </div>

                <form className="cpage__form" onSubmit={handleSubmit}>
                  <p className="cpage__required">{t('contactExtra.required')}</p>
                  <div className="field">
                    <input name="name" type="text" required placeholder={`${t('contact.name')}*`} autoComplete="name" />
                  </div>
                  <div className="field">
                    <input name="phone" type="tel" required placeholder={`${t('contact.phone')}*`} autoComplete="tel" />
                  </div>
                  <div className="field">
                    <input name="email" type="email" required placeholder={`${t('contact.email')}*`} autoComplete="email" />
                  </div>
                  <div className="field">
                    <textarea name="message" rows={4} placeholder={t('contact.message')} />
                  </div>
                  {error && <p className="cpage__error" role="alert">{error}</p>}
                  <button type="submit" className="btn btn--primary btn--block btn--lg" disabled={busy}>
                    {busy ? L({ he: 'שולח…', en: 'Sending…' }) : t('contact.submit')}
                  </button>
                </form>
              </>
            )}
          </div>

          <aside className="cpage__side">
            <h2 className="cpage__side-title">{L({ he: 'או ישירות', en: 'Or reach us directly' })}</h2>
            <div className="cpage__direct">
              <a
                className="btn btn--dark btn--block"
                href={`tel:${String(phone).replace(/[^+\d]/g, '')}`}
                onClick={() => track('phone_click', { placement: 'contact_page' })}
              >
                <Icon name="phone" size={18} /> {phoneDisplay}
              </a>
              <a
                className="btn btn--ghost btn--block"
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => track('whatsapp_click', { placement: 'contact_page' })}
              >
                <Icon name="whatsapp" size={18} /> {L({ he: 'וואטסאפ', en: 'WhatsApp' })}
              </a>
            </div>
            <OfficeMap />
          </aside>
        </div>
      </section>
    </>
  )
}
