# AnimatedBackgroundShowcase

A dark card with two rows of video screens that move slowly in opposite directions, at a slight 3D angle. The screens fade into a brand glow behind the text. Built from the owner's reference recording, in the Kurkoos palette.

- Component: `src/components/sections/AnimatedBackgroundShowcase.jsx` and `.css`
- Used on: `/divisions/execution`, section `reels`, under the "הופכים תוכניות לביצוע" gallery and above "פרויקטים נבחרים"
- Defaults: `src/data/executionShowcase.js`
- Saved content: `site_settings.execution_showcase` (JSON). It overrides the defaults field by field.

## Editing (owner)

עמודים › ביצוע › select "סרטונים מהשטח" › הגדרות.

- Upload several videos at once. Mp4, webm or mov, up to 40 MB each. Photos work too.
- Per video: caption, move up or down, replace, remove.
- Edit the texts: badge, word next to the badge, title, paragraph, bold ending, highlight line, button text.
- Layout: באנטו or מסכים נעים.
- Motion: עדין, מאוזן or בולט.

Every change saves immediately and shows on the site without publishing. The editor preview refreshes after each save.

Order rule: videos alternate between the rows (1st on the top row, 2nd on the bottom row, and so on).

## Props

| prop | type | default | meaning |
| --- | --- | --- | --- |
| `items` | `[{ src, poster?, label?, type? }]` | `[]` | Videos or images. `type` is inferred from the extension. |
| `badge` | string | none | Red chip |
| `badgeWord` | string | none | White word next to the chip |
| `title` | string | none | `h2` of the card |
| `text` | string | none | Paragraph |
| `bold` | string | none | Bold ending of the paragraph |
| `note` | string | none | Highlight line with an icon |
| `cta` | `{ label, to }` | none | Internal `to` uses `Link`. An `http` link opens in a new tab. |
| `intensity` | `'subtle' \| 'balanced' \| 'expressive'` | `balanced` | Speed per screen 14 s, 11 s or 8 s. Tilt 9°, 14° or 20°. |
| `height` | number | none | Desktop card height in px. Without it: `clamp(520px, 34vw, 640px)`. Mobile uses its own 300 px media band (380 px from 600 px). |
| `wide` | boolean | `false` | Desktop only: the card leaves the content column and spans the screen, `min(100vw - 160px, 1560px)`. The execution page uses it. |
| `layout` | `'bento' \| 'marquee'` | `marquee` | `bento`: a MagicBento grid of the first 4 videos (cursor spotlight, glowing edges, click wave, sparkles; tilt and magnetism at `expressive`). `marquee`: two rows of moving screens. The execution page default is `marquee`, switchable in the editor (תצוגה). |
| `onCta` | function | none | Click handler, for example analytics |

Colors come from `tokens.css` (`--color-primary-*` and `--color-accent-500`).

## Behaviour

- **Seamless rows:** each row is filled to at least 4 screens, duplicated once, and moved by exactly half its length.
- **Seamless clips:** the default clips crossfade their tail into their head.
- **Off-screen:** videos load only when the card is near the screen (`preload="none"` until then). They pause, and the rows stop, when it leaves.
- **`prefers-reduced-motion`:** the rows stand still and the videos show their poster.
- **Background:** `aria-hidden` and `pointer-events: none`. Only the text and the button are interactive.
- **3D wall (desktop):** as in the reference recording. The wall is near at the far edge of the card and recedes toward the text: `rotateY(tilt)`, a small `rotateX`/`rotateZ`, transform origin at the far edge. The two rows fill the full height, a little past the card's edges, and fade out under the text. With `wide`, the wall is 86% of the card.
- **Red hover (desktop with a mouse only):** the screens take the pointer, only for hover, with no click and no focus. The hovered screen grows a little and gets a red ring and an outer glow (`--color-accent-500`). A red light follows the pointer inside the screen: `--mx` and `--my` are written straight to the style, with no React render. Entering takes 0.2 s and leaving takes about 0.7 s, so a sweep from right to left leaves a fading trail of lit screens. Reduced motion: no growth and no fades.
- **Layout:**

  | Width | Layout |
  | --- | --- |
  | Above 1100 px | Text on the right, screens on the left |
  | 961 to 1100 px | Same, with denser spacing |
  | 960 px and below | Screens on top, text below |

## Assets

Default loops in `public/divisions/showcase/`: 7 clips, 640×400, 24 fps, no audio, about 3 MB in total, plus WebP posters. They are cut from:

- the site piles video
- `kurkoos-showcase.mp4`
- the Szold iPhone clips

The deploy size budget in `scripts/check-deploy-size.mjs` was raised from 30 to 33 MB for these clips.

Uploads go to the Kurkoos Cloudinary account (cloud `hb7875r8`, unsigned preset `kurkoos_site`, folder `kurkoos/<section>`). `VITE_CLOUDINARY_*` overrides both. If Cloudinary fails, the upload falls back to Supabase Storage. Uploaded videos are served through `cloudVideo()` (`src/lib/cms.js`) as `q_auto,vc_auto,c_limit,w_720` mp4, so an iPhone mov plays everywhere and stays light.

## MagicBento

`src/components/ui/MagicBento.jsx` and `.css` are adapted from React Bits:
- Kept: the light engine, the border glow, the click wave, the sparkles, tilt and magnetism.
- Removed: the built-in illustrations, so the `@hugeicons` dependency is not needed.
- Added:
  - `video` and `poster` per item. Videos load near the screen and pause off screen.
  - `playMedia`
  - `minCell` and `minPair`, so phones keep two columns.
  - A navy dark theme.

With `wide`, the card spans `min(100vw - 160px, 1560px)` on desktop.

## Hover (desktop, marquee)

- The row under the pointer stops. The other row keeps moving.
- The hovered screen lifts. It gets a red ring and a red glow that follows the pointer, and its caption turns red.
- The other screens dim to 55%.
- The lights fade out slowly after the pointer moves on, so a sweep leaves a trail.
