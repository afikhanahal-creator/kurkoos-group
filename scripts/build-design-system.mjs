// Bundles design-system/kurkoos/*.json into public/engine/studio/brand.gen.json.
// The studio in the content engine reads that bundle. Run by `npm run build`.
// With --check it only verifies the bundle is current (exit 1 if not).
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs'
import { join, basename } from 'node:path'

const SRC = 'design-system/kurkoos'
const OUT = 'public/engine/studio/brand.gen.json'
const out = { $generated: 'from design-system/kurkoos by scripts/build-design-system.mjs. Do not edit.' }
for (const f of readdirSync(SRC).filter((f) => f.endsWith('.json')).sort()) {
  out[basename(f, '.json').replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = JSON.parse(readFileSync(join(SRC, f), 'utf8'))
}
// flat hex map, so the engine never needs to know which group a color is in
out.hex = {}
for (const g of ['brand', 'neutral']) for (const [k, v] of Object.entries(out.brandColors[g])) out.hex[k] = v.hex
const text = JSON.stringify(out, null, 1) + '\n'
if (process.argv.includes('--check')) {
  const cur = existsSync(OUT) ? readFileSync(OUT, 'utf8') : ''
  if (cur !== text) { console.error(`✗ ${OUT} is stale. Run: node scripts/build-design-system.mjs`); process.exit(1) }
  console.log('✓ design system bundle is current')
} else {
  writeFileSync(OUT, text)
  console.log(`✓ wrote ${OUT}`)
}
