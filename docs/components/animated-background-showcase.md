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
| `intensity` | `'subtle' \| 'balanced' \| 'expressive'` | `balanced` | Speed per screen 13 s, 10 s or 7 s. Tilt 5°, 8° or 12°. |
| `height` | number | `560` | Desktop card height in px. Mobile uses its own 300 px media band (380 px from 600 px). |
| `onCta` | function | none | Click handler, for example analytics |

Colors come from `tokens.css` (`--color-primary-*` and `--color-accent-500`).

## Behaviour

- **Seamless rows:** each row is filled to at least 4 screens, duplicated once, and moved by exactly half its length.
- **Seamless clips:** the default clips crossfade their tail into their head.
- **Off-screen:** videos load only when the card is near the screen (`preload="none"` until then). They pause, and the rows stop, when it leaves.
- **`prefers-reduced-motion`:** the rows stand still and the videos show their poster.
- **Background:** `aria-hidden` and `pointer-events: none`. Only the text and the button are interactive.
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

Uploads go to Cloudinary when `VITE_CLOUDINARY_*` is set, otherwise to Supabase Storage. At the time of writing, Cloudinary was not set and storage was at about 880 MB of 1 GB. Prefer short 720p clips.
