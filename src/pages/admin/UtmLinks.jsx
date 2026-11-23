import { useMemo, useState } from 'react'

/* ============================================================
   Ready-made tracking links (UTM). Every link built here brings
   its channel and campaign into the lead card, so the owner can
   see which ad, post or sign actually brings leads.
   src/lib/attribution.js turns utm_source / utm_medium into the
   channel names used in the leads summary.
   ============================================================ */

const SITE = 'https://www.kurkoos-group.co.il'

const PAGES = [
  { path: '/', label: 'דף הבית' },
  { path: '/projects/henrietta-sald-22-24', label: 'הנרייטה סאלד 22-24' },
  { path: '/projects/project-zrubavel-15', label: 'זרובבל 15' },
  { path: '/projects/project-hankin-41', label: 'חנקין 41' },
  { path: '/projects/ben-gurion-17', label: 'בן גוריון 17' },
  { path: '/kablan-bniya-bayit-prati', label: 'קבלן לבית פרטי' },
  { path: '/contact', label: 'צור קשר' },
]

/* where the link is published → source / medium */
const PLACES = [
  { id: 'fb_ad', label: 'מודעה ממומנת בפייסבוק', source: 'facebook', medium: 'paid_social' },
  { id: 'ig_ad', label: 'מודעה ממומנת באינסטגרם', source: 'instagram', medium: 'paid_social' },
  { id: 'fb_post', label: 'פוסט בפייסבוק (לא ממומן)', source: 'facebook', medium: 'social' },
  { id: 'ig_bio', label: 'קישור בביו / סטורי באינסטגרם', source: 'instagram', medium: 'social' },
  { id: 'google_ads', label: 'Google Ads', source: 'google', medium: 'cpc' },
  { id: 'whatsapp', label: 'הודעת וואטסאפ / סטטוס', source: 'whatsapp', medium: 'message' },
  { id: 'newsletter', label: 'ניוזלטר / מייל', source: 'newsletter', medium: 'email' },
  { id: 'sms', label: 'הודעת SMS', source: 'sms', medium: 'sms' },
  { id: 'qr', label: 'QR על שלט באתר בנייה', source: 'qr', medium: 'qr' },
  { id: 'yad2', label: 'מודעה ביד2 / אתר נדל"ן', source: 'yad2', medium: 'listing' },
]

// campaign names: lowercase latin, digits and dashes, so they group cleanly in the summary
const slug = (s) => String(s || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)

export function buildUtm({ path, source, medium, campaign, content }) {
  const u = new URL(path, SITE)
  u.searchParams.set('utm_source', source)
  u.searchParams.set('utm_medium', medium)
  if (campaign) u.searchParams.set('utm_campaign', campaign)
  if (content) u.searchParams.set('utm_content', content)
  return u.toString()
}

function Copy({ text }) {
  const [done, setDone] = useState(false)
  return (
    <button type="button" className="utm__copy" onClick={async () => {
      try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1600) } catch { /* noop */ }
    }}>{done ? 'הועתק ✓' : 'העתקה'}</button>
  )
}

export default function UtmLinks() {
  const [path, setPath] = useState('/projects/henrietta-sald-22-24')
  const [place, setPlace] = useState('fb_ad')
  const [campaign, setCampaign] = useState('henrietta-szold')
  const [content, setContent] = useState('')
  const p = PLACES.find((x) => x.id === place) || PLACES[0]
  const url = useMemo(() => buildUtm({ path, source: p.source, medium: p.medium, campaign: slug(campaign), content: slug(content) }), [path, p, campaign, content])

  // the campaign-level templates: set once in the ads manager and every ad tags itself
  const META_TEMPLATE = 'utm_source={{site_source_name}}&utm_medium=paid_social&utm_campaign={{campaign.name}}&utm_content={{ad.name}}'
  const GOOGLE_TEMPLATE = '{lpurl}?utm_source=google&utm_medium=cpc&utm_campaign={campaignid}&utm_content={creative}&utm_term={keyword}'

  return (
    <div className="utm" dir="rtl">
      <p className="utm__intro">
        כל קישור שיוצא מכאן מסמן את הליד: מאיפה הגיע ומאיזה קמפיין. הנתון מופיע בכרטיס הליד ובניתוח המקורות.
        קישור אחד לכל מקום פרסום, ושם קמפיין קבוע לאותו מבצע.
      </p>
      <div className="utm__form">
        <label>עמוד יעד
          <select value={path} onChange={(e) => setPath(e.target.value)}>
            {PAGES.map((x) => <option key={x.path} value={x.path}>{x.label}</option>)}
          </select>
        </label>
        <label>איפה מפרסמים
          <select value={place} onChange={(e) => setPlace(e.target.value)}>
            {PLACES.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
          </select>
        </label>
        <label>שם הקמפיין (באנגלית)
          <input dir="ltr" value={campaign} onChange={(e) => setCampaign(e.target.value)} placeholder="henrietta-szold"/>
        </label>
        <label>גרסת מודעה (רשות)
          <input dir="ltr" value={content} onChange={(e) => setContent(e.target.value)} placeholder="video-9x16"/>
        </label>
      </div>
      <div className="utm__out">
        <code dir="ltr">{url}</code>
        <Copy text={url}/>
      </div>

      <div className="utm__tpl">
        <b>מנהל המודעות של Meta</b>
        <span>במודעה: Tracking ← URL parameters. מדביקים פעם אחת, וכל מודעה מסמנת את עצמה עם שם הקמפיין והמודעה.</span>
        <div className="utm__out"><code dir="ltr">{META_TEMPLATE}</code><Copy text={META_TEMPLATE}/></div>
      </div>
      <div className="utm__tpl">
        <b>Google Ads</b>
        <span>בהגדרות החשבון: Tracking template. Auto-tagging (gclid) נשאר דלוק, ושני הסימונים עובדים יחד.</span>
        <div className="utm__out"><code dir="ltr">{GOOGLE_TEMPLATE}</code><Copy text={GOOGLE_TEMPLATE}/></div>
      </div>
    </div>
  )
}
