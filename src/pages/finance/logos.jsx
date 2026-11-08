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
  return <span className="fin-logo-tile" aria-hidden="true">{mark}</span>
}

/* accounting software: a neutral monogram, not the vendor's trademark */
export function Monogram({ text, tone = 'ink', size = 46 }) {
  return <span className={`fin-logo-tile fin-mono fin-mono--${tone}`} style={{ width: size, height: size }} aria-hidden="true">{text}</span>
}
