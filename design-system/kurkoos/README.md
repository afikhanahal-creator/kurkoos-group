# Kurkoos design system for social posts

Single source of truth for every post, ad and carousel the content engine produces.

| File | What it holds |
|---|---|
| `brand-colors.json` | every color allowed in a design, with the site token it comes from |
| `typography.json` | families, installed weights, the 1080 type scale, Hebrew rules |
| `logos.json` | master and division logos, file paths, sizes, usage rules |
| `spacing.json` | 8px scale, margins, safe areas, grid |
| `layouts.json` | the 12 creative directions (ids used by the studio engine) |
| `image-treatments.json` | allowed photo treatments and the honesty rules |
| `design-components.json` | the small set of elements a design may use |
| `social-formats.json` | export sizes and file settings |

All values come from the live site's code (`src/styles/tokens.css`, `src/styles/fonts.css`, `public/`).

`node scripts/build-design-system.mjs` bundles these files into `public/engine/studio/brand.gen.json`, which the studio reads at runtime. It runs inside `npm run build`, so the bundle can not drift from the source. Edit here, never the generated file.
