import { useState } from 'react'
/* Provider marks, drawn small inside a neutral tile. Used only to identify the connected service. */
export function ProviderLogo({ name, size = 26 }) {
  const s = { width: size, height: size }
  let mark = null
  if (name === 'gmail') mark = (
    <svg viewBox="0 0 48 48" style={s} aria-hidden="true"><path fill="#4285F4" d="M6 40h7V22L4 15v22c0 1.7 1.3 3 2 3z" /><path fill="#34A853" d="M35 40h7c.7 0 2-1.3 2-3V15l-9 7z" /><path fill="#FBBC04" d="M35 10v12l9-7v-3c0-3.6-4.1-5.6-6.9-3.4z" /><path fill="#EA4335" d="M13 22V10l11 8.3L35 10v12l-11 8.3z" /><path fill="#C5221F" d="M4 12v3l9 7V10l-2.1-1.4C8.1 6.4 4 8.4 4 12z" /></svg>
  )
  else if (name === 'outlook') mark = (
    <svg viewBox="0 0 48 48" style={s} aria-hidden="true"><rect x="5" y="5" width="18" height="18" fill="#F25022" /><rect x="25" y="5" width="18" height="18" fill="#7FBA00" /><rect x="5" y="25" width="18" height="18" fill="#00A4EF" /><rect x="25" y="25" width="18" height="18" fill="#FFB900" /></svg>
  )
  else if (name === 'gdrive') mark = (
    <svg viewBox="0 0 48 48" style={s} aria-hidden="true"><path fill="#0F9D58" d="M16.5 6h15l13 22.5h-15z" /><path fill="#4285F4" d="M44.5 28.5L37 42H11l7.5-13.5z" /><path fill="#FBBC04" d="M3.5 28.5L16.5 6l7.5 13-13 23z" /></svg>
  )
  else if (name === 'dropbox') mark = (
    <svg viewBox="0 0 48 48" style={s} aria-hidden="true"><path fill="#0061FF" d="M14 6L4 12.5l10 6.5 10-6.5zM34 6l-10 6.5 10 6.5 10-6.5zM4 25.5L14 32l10-6.5-10-6.5zM34 19l-10 6.5 10 6.5 10-6.5zM14 34.5l10 6.5 10-6.5-10-6.5z" /></svg>
  )
  else if (name === 'whatsapp') mark = (
    <svg viewBox="0 0 48 48" style={s} aria-hidden="true"><path fill="#25D366" d="M24 4a20 20 0 0 0-17.3 30L4 44l10.3-2.7A20 20 0 1 0 24 4z" /><path fill="#fff" d="M34.5 29.3c-.5-.3-3-1.5-3.4-1.6s-.8-.3-1.1.3-1.3 1.6-1.6 1.9-.6.4-1.1.1a13.6 13.6 0 0 1-6.8-5.9c-.5-.9.5-.8 1.5-2.7a1 1 0 0 0 0-.9c-.1-.3-1.1-2.7-1.5-3.6s-.8-.8-1.1-.8h-.9a1.8 1.8 0 0 0-1.3.6 5.5 5.5 0 0 0-1.7 4.1 9.6 9.6 0 0 0 2 5.1 22 22 0 0 0 8.4 7.4c3.1 1.3 4.4 1.4 5.9 1.2a5 5 0 0 0 3.3-2.3 4.1 4.1 0 0 0 .3-2.3c-.1-.2-.4-.3-.9-.6z" /></svg>
  )
  // WhatsApp: small, it is the mark alone (a 46px white tile around a 16px mark looked cut); large, a tile in its own green wash
  if (name === 'whatsapp') return size <= 24 ? <span className="fin-wamark" style={s} aria-hidden="true">{mark}</span> : <span className="fin-logo-tile fin-logo-tile--wa" style={{ width: Math.round(size * 1.6), height: Math.round(size * 1.6) }} aria-hidden="true">{mark}</span>
  return <span className="fin-logo-tile" aria-hidden="true">{mark}</span>
}

/* accounting software: a neutral monogram, not the vendor's trademark */
export function Monogram({ text, tone = 'ink', size = 46 }) {
  return <span className={`fin-logo-tile fin-mono fin-mono--${tone}`} style={{ width: size, height: size }} aria-hidden="true">{text}</span>
}

/* accounting software: the vendor's own icon, as published on its website (public/finance/logos), only to name the
   service the documents are sent to. A vendor without a published icon keeps a neutral monogram. */
const VENDOR = { morning: 'morning.webp', icount: 'icount.svg', rivhit: 'rivhit.webp', sumit: 'sumit.webp', priority: 'priority.webp', hashavshevet: 'hashavshevet.webp', ezcount: 'ezcount.webp', invoice4u: 'invoice4u.webp', accountit: 'accountit.webp', costapp: 'costapp.webp', dokka: 'dokka.webp', smartbee: 'smartbee.webp', finbot: 'finbot.svg' }
/* file formats and plain email: a drawn mark, so no card is left with bare letters */
const DRAWN = {
  file: <svg viewBox="0 0 32 32" width="60%" height="60%" aria-hidden="true"><path d="M8 3h11l6 6v18a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" fill="#eef3f7" stroke="#07293a" strokeWidth="1.6" /><path d="M19 3v6h6" fill="none" stroke="#07293a" strokeWidth="1.6" /><path d="M15 12h2v2h-2zm0 4h2v2h-2zm0 4h2v4h-2z" fill="#16688c" /></svg>,
  accountant_email: <svg viewBox="0 0 32 32" width="60%" height="60%" aria-hidden="true"><rect x="4" y="7" width="24" height="18" rx="3" fill="#eef3f7" stroke="#07293a" strokeWidth="1.6" /><path d="m5 9 11 9 11-9" fill="none" stroke="#16688c" strokeWidth="1.8" strokeLinecap="round" /></svg>,
}
export function VendorLogo({ id, mono, tone = 'ink', size = 52, label }) {
  const file = VENDOR[id]
  const [broken, setBroken] = useState(false)
  if (DRAWN[id]) return <span className="fin-logo-tile fin-logo-tile--vendor" style={{ width: size, height: size }} title={label} aria-hidden="true">{DRAWN[id]}</span>
  // no published icon, or it failed to load: a neutral monogram, never an empty box
  if (!file || broken) return <span title={label}><Monogram text={mono} tone={tone} size={size} /></span>
  const inner = Math.round(size * 0.66)
  return (
    <span className="fin-logo-tile fin-logo-tile--vendor" style={{ width: size, height: size }} title={label} aria-hidden="true">
      <img src={`/finance/logos/${file}`} alt="" width={inner} height={inner} loading="lazy" decoding="async" onError={() => setBroken(true)} />
    </span>
  )
}
