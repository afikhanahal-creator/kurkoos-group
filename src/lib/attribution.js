/* ============================================================
   Lead attribution: where a visitor came from, so every lead carries it.

   On every page load capture() reads the UTM parameters, the ad click ids
   (only whether one was present, never the id itself) and the referring
   site, and turns them into one marketing channel. Two touches are kept in
   localStorage for 90 days:
     first: the first time this browser reached the site
     last:  the most recent visit that came from somewhere (a direct visit
            never overwrites a campaign, so "clicked the ad on Sunday, came
            back by typing the address on Tuesday" still counts as the ad).
   forLead() returns the columns saved with a lead. Nothing personal is
   stored: no IP, no click id, no full referring URL (host only).
   ============================================================ */

const KEY = 'kc_attr'
const TTL = 90 * 86400000
const OWN = /(^|\.)kurkoos-group\.co\.il$|^localhost$|^127\.0\.0\.1$/

const cut = (v, n) => (v == null || v === '' ? null : String(v).trim().slice(0, n) || null)
const low = (v) => String(v || '').trim().toLowerCase()

/* The channels the admin groups by. The label is what the owner sees. */
export const CHANNELS = {
  google_ads:     { label: 'Google Ads (ממומן)', color: '#1a73e8' },
  meta_ads:       { label: 'Meta (מודעה ממומנת)', color: '#0866ff' },
  google_organic: { label: 'חיפוש בגוגל', color: '#34a853' },
  bing:           { label: 'חיפוש ב-Bing', color: '#008373' },
  ai:             { label: 'ChatGPT / Gemini / AI', color: '#7b4fd6' },
  facebook:       { label: 'פייסבוק (אורגני)', color: '#3b5998' },
  instagram:      { label: 'אינסטגרם (אורגני)', color: '#c13584' },
  whatsapp:       { label: 'וואטסאפ', color: '#25d366' },
  youtube:        { label: 'יוטיוב', color: '#ff0000' },
  linkedin:       { label: 'לינקדאין', color: '#0a66c2' },
  email:          { label: 'מייל / ניוזלטר', color: '#8c6d1f' },
  sms:            { label: 'SMS', color: '#6b6b6b' },
  qr:             { label: 'QR / שילוט', color: '#a90b0c' },
  campaign:       { label: 'קמפיין אחר (UTM)', color: '#105572' },
  referral:       { label: 'אתר מפנה', color: '#5b7380' },
  direct:         { label: 'ישיר / לא ידוע', color: '#9aa5ab' },
}
export const channelLabel = (c) => (CHANNELS[c] ? CHANNELS[c].label : c || 'לא ידוע')
export const channelColor = (c) => (CHANNELS[c] ? CHANNELS[c].color : '#9aa5ab')

const PAID = /^(cpc|ppc|paid|paid_?social|paidsocial|display|cpm|ads?|sponsored|retargeting|remarketing)$/
const SOCIAL_HOSTS = [
  [/(^|\.)(facebook\.com|fb\.com|fb\.me|messenger\.com)$/, 'facebook'],
  [/(^|\.)instagram\.com$/, 'instagram'],
  [/(^|\.)(whatsapp\.com|wa\.me)$/, 'whatsapp'],
  [/(^|\.)(youtube\.com|youtu\.be)$/, 'youtube'],
  [/(^|\.)(linkedin\.com|lnkd\.in)$/, 'linkedin'],
]
const AI_HOSTS = /(^|\.)(chatgpt\.com|chat\.openai\.com|openai\.com|perplexity\.ai|gemini\.google\.com|bard\.google\.com|copilot\.microsoft\.com|claude\.ai|you\.com)$/

/* utm_source / utm_medium → channel */
function fromUtm(src, med) {
  const paid = PAID.test(med)
  if (/^(google|adwords|googleads|google_ads)$/.test(src)) return paid ? 'google_ads' : 'google_organic'
  if (/^(facebook|fb|instagram|ig|meta|messenger|msg|an|audience_network)$/.test(src)) return paid ? 'meta_ads' : (/^(instagram|ig)$/.test(src) ? 'instagram' : 'facebook')
  if (/^(whatsapp|wa)$/.test(src) || med === 'whatsapp') return 'whatsapp'
  if (/^(bing|microsoft)$/.test(src)) return 'bing'
  if (/^(chatgpt|openai|gemini|perplexity|copilot|ai)$/.test(src)) return 'ai'
  if (/^(youtube|yt)$/.test(src)) return 'youtube'
  if (/^(linkedin|li)$/.test(src)) return 'linkedin'
  if (med === 'email' || /^(newsletter|email|mail)$/.test(src)) return 'email'
  if (med === 'sms' || src === 'sms') return 'sms'
  if (med === 'qr' || /^(qr|sign|shilut)$/.test(src)) return 'qr'
  return 'campaign'
}

/* referring host → channel */
function fromReferrer(host) {
  if (!host) return null
  if (AI_HOSTS.test(host)) return 'ai'
  if (/(^|\.)google\.[a-z.]+$/.test(host)) return 'google_organic'
  if (/(^|\.)bing\.com$/.test(host) || /(^|\.)duckduckgo\.com$/.test(host)) return 'bing'
  for (const [re, ch] of SOCIAL_HOSTS) if (re.test(host)) return ch
  return 'referral'
}

/* The touch for the page being loaded now, or null for a plain direct visit. */
export function readTouch(href, referrer) {
  let url
  try { url = new URL(href) } catch { return null }
  const p = url.searchParams
  const utm = {
    utm_source: cut(p.get('utm_source'), 100),
    utm_medium: cut(p.get('utm_medium'), 100),
    utm_campaign: cut(p.get('utm_campaign'), 150),
    utm_content: cut(p.get('utm_content'), 150),
    utm_term: cut(p.get('utm_term'), 150),
  }
  let refHost = null
  try { refHost = referrer ? new URL(referrer).hostname.replace(/^www\./, '').toLowerCase() : null } catch { refHost = null }
  if (refHost && OWN.test(refHost)) refHost = null

  const gclick = p.has('gclid') || p.has('gbraid') || p.has('wbraid') || p.has('gad_source')
  const fbclick = p.has('fbclid')
  let channel = null
  if (utm.utm_source || utm.utm_medium || utm.utm_campaign) {
    channel = fromUtm(low(utm.utm_source), low(utm.utm_medium))
    // an ad click id is stronger evidence than a hand-typed medium
    if (gclick && channel !== 'meta_ads') channel = 'google_ads'
    if (fbclick && /^(facebook|instagram)$/.test(channel) && PAID.test(low(utm.utm_medium))) channel = 'meta_ads'
  } else if (gclick) {
    channel = 'google_ads'
  } else if (fbclick) {
    // Meta adds fbclid to every outbound link, paid or not; without a UTM we cannot tell an ad apart
    channel = refHost && /instagram/.test(refHost) ? 'instagram' : 'facebook'
  } else {
    channel = fromReferrer(refHost)
  }
  if (!channel) return null
  return {
    channel,
    ...utm,
    referrer: cut(refHost, 120),
    landing_page: cut(url.pathname, 200),
    ts: Date.now(),
  }
}

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null')
    if (!s || typeof s !== 'object') return {}
    const fresh = (t) => (t && Date.now() - (t.ts || 0) < TTL ? t : null)
    return { first: fresh(s.first), last: fresh(s.last) }
  } catch { return {} }
}

/* Called once on every page load (main.jsx). */
export function capture() {
  if (typeof window === 'undefined') return
  try {
    const touch = readTouch(window.location.href, document.referrer)
    const s = load()
    const directLanding = { channel: 'direct', landing_page: cut(window.location.pathname, 200), ts: Date.now() }
    if (!s.first) s.first = touch || directLanding
    if (touch) s.last = touch
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch { /* private mode or storage blocked: the lead is saved without a source */ }
}

function device() {
  try {
    const ua = navigator.userAgent || ''
    const os = /iPhone|iPod/.test(ua) ? 'iPhone' : /iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) ? 'iPad'
      : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : /Macintosh/.test(ua) ? 'Mac' : /Linux/.test(ua) ? 'Linux' : 'אחר'
    const kind = /iPhone|iPod/.test(ua) || (/Android/.test(ua) && /Mobile/.test(ua)) ? 'נייד' : os === 'iPad' || /Android/.test(ua) ? 'טאבלט' : 'מחשב'
    const app = /FBAN|FBAV|FB_IAB/.test(ua) ? ' · אפליקציית פייסבוק' : /Instagram/.test(ua) ? ' · אפליקציית אינסטגרם'
      : /GSA\//.test(ua) ? ' · אפליקציית Google' : /WhatsApp/.test(ua) ? ' · וואטסאפ' : ''
    return `${kind} · ${os}${app}`.slice(0, 80)
  } catch { return null }
}

/* The attribution columns for a lead row. */
export function forLead() {
  if (typeof window === 'undefined') return {}
  const s = load()
  const t = s.last || s.first || null
  const row = {
    channel: t?.channel || 'direct',
    first_channel: s.first?.channel || null,
    utm_source: t?.utm_source || null,
    utm_medium: t?.utm_medium || null,
    utm_campaign: t?.utm_campaign || null,
    utm_content: t?.utm_content || null,
    utm_term: t?.utm_term || null,
    referrer: t?.referrer || null,
    landing_page: t?.landing_page || null,
    lead_page: cut(window.location.pathname, 200),
    device: device(),
  }
  return Object.fromEntries(Object.entries(row).filter(([, v]) => v != null && v !== ''))
}

/* The attribution columns and their limits, shared with the server and the database policy. */
export const ATTR_MAX = {
  channel: 40, first_channel: 40, utm_source: 100, utm_medium: 100, utm_campaign: 150, utm_content: 150,
  utm_term: 150, referrer: 120, landing_page: 200, lead_page: 200, device: 80,
}
