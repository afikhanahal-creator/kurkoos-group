# Converting a page for the page editor

Every page on the site is built from sections that the page editor (admin tab "עמודים") can reorder, hide, duplicate and space per device. This guide explains how to convert an existing page. The conversion is a **pure refactor**: the page must look and behave exactly as before, on desktop and phone.

## The pieces

- `src/lib/pageBuilder/defs/<page>.js` holds the page definition. Fields:
  - `route`: exactly as in `App.jsx`, for example `'/about'` or `'/divisions/:slug'`.
  - `group`: one of `main`, `div`, `land`, `city`, `other`.
  - `label`: the Hebrew name shown on the board.
  - `pages` (optional): `[[path, label, group], ...]` for dynamic routes, one entry per real page. Without it, the page is `[route, label]`.
  - `sections`: the default order, the same order the page renders today. Each entry is one of:
    - a string: a shared widget from `src/lib/pageBuilder/widgets.jsx`, for example `'stats'`, `'valueChain'`, `'partners'`, `'contact'`. Use it only when the page renders that component with **no props**.
    - an array `[id, label, icon, texts]`: a section of this page.
      - `id` is a short latin id.
      - `label` is a Hebrew name.
      - `icon` is one of `hero grid chain book chart building logos quote faq mail shield heading text image cursor play check cols cards form calendar pin images page`.
      - `texts` is optional: the i18n keys the section shows through `t()`, as `{ key, label, multiline }` objects. The editor lets the owner edit those texts. List only keys that the section really renders through `t()`.
- The page component keeps all hooks, data loading, `<Seo>`, early returns (`Navigate`, `NotFound`) and wrapper elements. It moves each top level visual block into a function in a `LOCAL` object, and renders:

```jsx
import DEF from '../lib/pageBuilder/defs/about.js'
import { PageSections } from '../lib/pageBuilder/PageRenderer.jsx'

const LOCAL = {
  header: ({ ctx }) => <PageHeader eyebrow={ctx.t('pages.about.eyebrow')} ... />,
  vision: ({ ctx }) => (<section className="section about-vision">...</section>),
}

export default function About() {
  const { t, lang } = useI18n()
  const vision = ...
  return <PageSections def={DEF} local={LOCAL} ctx={{ t, lang, vision }} />
}
```

- For dynamic routes, pass the real path: `<PageSections def={DEF} slug={pathname} ... />`.
- Each section renders inside a `display: contents` wrapper, so CSS, layout and order stay identical. If the page wraps its sections in an element (for example `<article className="hl">`), keep that element and put `<PageSections>` inside it.
- State that more than one section uses (refs, form state, selected tab) stays in the page component and is passed in `ctx`. A section may keep its own hooks only if nothing else uses that state.
- Section ids in the published layout are `l-<id>_d` for page sections. Never rename an id after the page ships.

## Rules

- Do not change any visible text, markup, class name, order, link or behaviour.
- Do not change shared files: `PageRenderer.jsx`, `layout.js`, `widgets.jsx`, `defs/index.js`, the admin editor. Touch only your page files and their def files.
- No hyphens or dashes as punctuation in Hebrew copy or comments.

## Verify parity

1. Build the version before your change and the version after it, each with `VITE_SUPABASE_URL=https://filnzlnvujnlazwcxbuq.supabase.co VITE_SUPABASE_ANON_KEY=test-anon-key npx vite build --outDir <dir>`.
2. Serve each build with `node <scratchpad>/pe/serve.cjs <dir> <port>`.
3. Take full page screenshots at 1440x900 and 390x844, using the Supabase mock in `<scratchpad>/pe/mock.cjs`. `<scratchpad>/pe/parity.cjs` is a working example for the home page.
4. The page height must be identical, and the pixel differences must be explained, for example by animations only.
5. Open `<path>?kc-edit=1` inside an iframe of the admin, or simply check that `document.querySelectorAll('.pb-sec').length` equals the number of sections.

`node scripts/check-pages.mjs` must list no missing route for your pages.
