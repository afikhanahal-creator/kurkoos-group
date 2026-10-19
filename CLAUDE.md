# Kurkoos Group website

## Every page lives in the page editor

The owner edits the site pages in the admin tab "עמודים", the visual page editor. **Every new page must be added to the editor in the same change that adds the page.** No exceptions without the owner's approval.

When you add a route to `src/App.jsx`:
1. Build the page from sections, following `docs/agents/page-editor-conversion.md`.
2. Add a definition at `src/lib/pageBuilder/defs/<page>.js` whose `route` matches the route in `App.jsx`, then import it in `defs/index.js`.
3. Only if the page truly cannot be edited (an article, a legal page, a tool), add it to `EXCLUDED` in `defs/index.js` with a reason.

`scripts/check-pages.mjs` runs as part of `npm run build`, and it fails when a route is neither covered nor excluded.
