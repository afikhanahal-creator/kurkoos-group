/* The Kurkoos mark, alive: four towers that rise from their base, and the name beside them. Drawn inline (not as an
   image) so each tower can move on its own. `loop` keeps the towers building, for a loading screen. Everything stands
   still under "reduce motion". The same drawing sits in finance-app.html for the moment before the app's code arrives. */
const TOWERS = [[23, 32, 5, 44], [34, 12, 8, 64], [46, 22, 6, 54], [56, 42, 4, 34]]

export function BrandMark({ size = 46, loop = false, className = '' }) {
  return (
    <svg className={`fin-brand ${loop ? 'is-loop' : 'is-in'} ${className}`} viewBox="16 6 52 76" width={Math.round(size * 52 / 76)} height={size} aria-hidden="true" focusable="false">
      {TOWERS.map(([x, y, w, h], i) => <rect key={x} x={x} y={y} width={w} height={h} rx="0.6" style={{ '--i': i }} />)}
    </svg>
  )
}

/* the full logo: the mark and the name. The picture has an accessible name; the moving parts are decoration. */
export function BrandLogo({ height = 56, className = '' }) {
  return (
    <svg className={`fin-brand fin-brand--logo is-in ${className}`} viewBox="14 0 300 96" height={height} width={Math.round(height * 300 / 96)} role="img" aria-label="קבוצת קורקוס">
      <g className="fin-brand__towers">{TOWERS.map(([x, y, w, h], i) => <rect key={x} x={x} y={y} width={w} height={h} rx="0.6" style={{ '--i': i }} />)}</g>
      <g className="fin-brand__name">
        <text x="86" y="56" fontFamily="Georgia, 'Times New Roman', 'Noto Serif', serif" fontSize="40" letterSpacing="2">KURK<tspan className="fin-brand__o1">O</tspan><tspan className="fin-brand__o2" dx="-15">O</tspan><tspan dx="2">S</tspan></text>
        <text className="fin-brand__group" x="88" y="83" fontFamily="Georgia, 'Times New Roman', 'Noto Serif', serif" fontSize="15" letterSpacing="9">GROUP</text>
      </g>
      <rect className="fin-brand__base" x="20" y="77.5" width="44" height="1.5" rx="0.75" />
    </svg>
  )
}

/* the loading screen: the towers keep building, with one quiet line under them */
export function BrandLoader({ label = 'טוען את המערכת' }) {
  return (
    <div className="fin-boot fin-boot--brand" role="status" aria-label={label}>
      <BrandMark size={64} loop />
      <span className="fin-boot__bar" aria-hidden="true" />
      <p className="fin-boot__label">{label}</p>
    </div>
  )
}
