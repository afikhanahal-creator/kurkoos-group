/* ערכת אייקונים SVG אחידה (viewBox 24x24). אין אמוג'י. */

/* אייקוני SVG ייעודיים נטענים inline מקבצים שבתיקייה (src/assets/icons/)
   דרך ?raw, כדי שיירשו currentColor (אפקט ה-hover) ואת גודל/עובי-הקו מה-props.
   מקור: Tabler Icons (MIT). */
import developmentSvg from '../../assets/icons/development.svg?raw'
import executionSvg from '../../assets/icons/execution.svg?raw'
import supervisionSvg from '../../assets/icons/supervision.svg?raw'
import brokerageSvg from '../../assets/icons/brokerage.svg?raw'

const rawIcons = {
  development: developmentSvg,
  execution: executionSvg,
  supervision: supervisionSvg,
  brokerage: brokerageSvg,
}

// מחלץ את תוכן ה-<svg> (ה-<path>-ים) כדי להזריקו ל-<svg> של הרכיב עם ה-props שלנו
const innerOf = (raw) => raw.replace(/<svg[\s\S]*?>/i, '').replace(/<\/svg>\s*$/i, '').trim()

const paths = {
  // building + crane: אייקוני Tabler (line-icons מקצועיים, סגנון תדהר)
  building: ['M3 21l18 0', 'M5 21v-14l8 -4v18', 'M19 21v-10l-6 -4', 'M9 9l0 .01', 'M9 12l0 .01', 'M9 15l0 .01', 'M9 18l0 .01'],
  crane: ['M6 21h6', 'M9 21v-18l-6 6h18', 'M9 3l10 6', 'M17 9v4a2 2 0 1 1 -2 2'],
  shield: 'M12 3l8 3v6c0 4.5-3.5 7.5-8 9-4.5-1.5-8-4.5-8-9V6l8-3zM9 12l2 2 4-4',
  handshake: 'M11 17l2 2a1 1 0 1 0 3-3M14 14l2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4M21 3l1 11h-2M3 3L2 14l6.5 6.5a1 1 0 1 0 3-3M3 4h8',
  facebook: 'M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z',
  instagram: 'M2 2m4 0h12a4 4 0 0 1 4 4v12a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V6a4 4 0 0 1 4-4zM16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37zM17.5 6.5h0',
  linkedin: 'M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6zM6 9H2v12h4zM4 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  youtube: 'M22.5 6.4a3 3 0 0 0-2.1-2.1C18.5 3.8 12 3.8 12 3.8s-6.5 0-8.4.5A3 3 0 0 0 1.5 6.4 31 31 0 0 0 1 12a31 31 0 0 0 .5 5.6 3 3 0 0 0 2.1 2.1c1.9.5 8.4.5 8.4.5s6.5 0 8.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 23 12a31 31 0 0 0-.5-5.6zM10 15.5v-7l6 3.5z',
  phone: 'M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z',
  mail: 'M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM22 6l-10 7L2 6',
  location: 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0zM12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  whatsapp: 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.885-9.885 9.885M20.52 3.449C18.24 1.245 15.24 0 12.045 0 5.463 0 .104 5.359.101 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.582 0 11.94-5.359 11.944-11.893A11.821 11.821 0 0 0 20.52 3.449',
  arrow: 'M5 12h14M13 5l7 7-7 7',
  arrowLeft: 'M19 12H5M11 19l-7-7 7-7',
  menu: 'M3 6h18M3 12h18M3 18h18',
  close: 'M18 6L6 18M6 6l12 12',
  chevron: 'M6 9l6 6 6-6',
  play: 'M5 3l14 9-14 9z',
  pause: 'M7 4v16M17 4v16',
  check: 'M20 6L9 17l-5-5',
  external: 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35',
  arrowUp: 'M12 19V5M5 12l7-7 7 7',
  leaf: 'M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10zM2 21c0-3 1.85-5.36 5.08-6',
  bulb: 'M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1V18h6v-1.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2z',
  briefcase: 'M20 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2',
  quote: 'M7 7h4v6c0 2-1 4-4 4M15 7h4v6c0 2-1 4-4 4',
  box3d: 'M21 7.5 12 2 3 7.5v9L12 22l9-5.5v-9zM12 22V12M21 7.5 12 12 3 7.5',
  house: 'M3 11.5 12 4l9 7.5M5 10v10h14V10M10 20v-6h4v6',
  accessibility: 'M12 4a1.7 1.7 0 1 0 0 3.4 1.7 1.7 0 0 0 0-3.4zM5 9l7 1.3L19 9M12 10.3V15l-2.6 5M12 15l2.6 5',
  textSize: 'M4 7V5h10v2M9 5v14M7 19h4M15 13v-1h6v1M18 12v7M16.5 19h3',
  contrast: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 3v18',
  minus: 'M5 12h14',
  plus: 'M12 5v14M5 12h14',
}

export default function Icon({ name, size = 24, stroke = 2, fill = false, className = '', style }) {
  const raw = rawIcons[name]
  const d = paths[name]
  if (!raw && !d) return null

  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    className,
    style,
    'aria-hidden': true,
    focusable: 'false',
  }

  // אייקון מקובץ (Tabler) — מזריק את ה-<path>-ים פנימה, יורש currentColor + size/stroke
  if (raw) {
    return (
      <svg
        {...common}
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        dangerouslySetInnerHTML={{ __html: innerOf(raw) }}
      />
    )
  }

  const filledIcons = ['facebook', 'instagram', 'youtube', 'play', 'whatsapp']
  const isFilled = fill || filledIcons.includes(name)
  const subPaths = Array.isArray(d) ? d : [d] // תמיכה באייקונים רב-נתיביים (Tabler וכו')
  return (
    <svg
      {...common}
      fill={isFilled ? 'currentColor' : 'none'}
      stroke={isFilled ? 'none' : 'currentColor'}
      strokeWidth={stroke}
    >
      {subPaths.map((p, i) => <path key={i} d={p} />)}
    </svg>
  )
}
