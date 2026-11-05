---
name: kurkoos-social-design
description: The permanent design rules for every Kurkoos Group social post, ad, carousel or story (קבוצת קורקוס, ראיתה, שכינתא, אפיק הנחל). Use it for any Kurkoos design request: a new post, an ad, a redesign of an existing post, a carousel, a story, a design review, or work on the creative department in the content engine (public/engine/studio). Triggers: עיצוב פוסט, מודעה, קרוסלה, סטורי, עיצוב מחדש, קריאייטיב, גרפיקה לקורקוס, design a post, redesign.
---

# Kurkoos social design

The brand values are not written here. They live in one place, and this skill points to it:

| What | Source of truth |
|---|---|
| colours, approved pairs | `design-system/kurkoos/brand-colors.json` |
| families, weights, 1080 type scale, Hebrew rules | `design-system/kurkoos/typography.json` |
| logos, division logos, usage | `design-system/kurkoos/logos.json` |
| margins, safe areas, grid | `design-system/kurkoos/spacing.json` |
| the 12 creative directions | `design-system/kurkoos/layouts.json` |
| photo treatments and honesty rules | `design-system/kurkoos/image-treatments.json` |
| the allowed elements | `design-system/kurkoos/design-components.json` |
| export sizes | `design-system/kurkoos/social-formats.json` |

Read the relevant file before you design. Never type a hex value, a weight or a size from memory. After editing any of these files, run `node scripts/build-design-system.mjs`, which `npm run build` also runs.

## The tool

Build designs with the creative department in the content engine, `public/engine/studio/`. Do not hand-draw a new canvas:
- `directions.js` holds the 12 directions.
- `engine.js` produces the three concepts, the variations, the combinations and the redesign analysis.
- `qa.js` runs the review.
- To render at export size from a script, follow `scripts/studio-examples.mjs` (`render.html` exposes `studio.one`, `studio.three` and `studio.redesign`).

## Process for every design

1. **Message first.** Write one sentence saying what this post must make someone think or do. Keep the original message when redesigning.
2. **Facts.** Use only numbers, stages, prices, dates, names and claims the user gave you, the site data holds (`src/data/*.js`) or the original post holds. If you are missing one, leave it out or ask. Never put a "?" placeholder on a design.
3. **Photo.** Use a real photo of the company's own project from the `photos` collection.
   - Construction work belongs with Ra'ita, a finished home with development or brokerage, a render with a launch.
   - An illustration or mood photo is never presented as a company project.
   - Never change what a property looks like.
4. **Three concepts from different families:** image-led, structured information, and editorial or typographic.
   - They must differ in composition, photo treatment and type placement, not only in colour.
   - At least one is light. Today the feed is 96% dark, and that is half of why it looks like one template.
5. **Review.** Score 8.5 or higher, with no blocking failure. Then look at the PNG at 1080 width yourself: the score does not replace your eyes. Check that the Hebrew reads right to left, no line breaks between a number and its unit, nothing is clipped, the logo is not distorted, and the text has enough contrast over the photo.
6. **Divisions.** The master logo is always Kurkoos Group. The division appears in the signature, by name and role.
   - Never put Afik Hanahal (brokerage) on a construction post, or Ra'ita (construction) on a brokerage post.
   - Supervision is Shchinta.

## Copy rules for text on the design

- Headline: at most 8 words. Sub line: at most 14 words. No body paragraphs on a photo.
- No dashes as punctuation in Hebrew; use a period or a comma.
- Do not use these phrases: הכי טוב, מוביל, איכות ללא פשרות, בית החלומות, הזדמנות שלא תחזור, !!!
- Do not name employees in posts.
- Never publish to a social network without being asked. Metricool posts are drafts only.

## Rejection list (fix, do not ship)

Reject a design that has any of these:
- a colour outside the palette;
- a font other than Heebo or Almoni;
- a distorted or tiny logo;
- broken Hebrew;
- overlapping elements;
- more than about 48 words;
- a photo enlarged more than 1.8 times;
- the same direction three posts in a row;
- decoration that does no job, meaning it does not anchor, separate, count, measure or sign.

## Learning

Approved and rejected designs are stored in the `creative_refs` collection, along with their direction, tone, type and the owner's note. Read the rejected ones before proposing. Take quality and consistency from the approved ones, never their exact layout.
