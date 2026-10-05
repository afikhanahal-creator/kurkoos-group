# Template authoring brief: Kurkoos content engine

You design post templates for a Hebrew (right to left) real estate and construction brand. A template is a JSON "spec": a list of elements drawn on a 1080x1350 canvas (4:5). The engine fills it with the post's own headline, sub line, label and photos. You write many specs in one assigned design direction, check them visually, and deliver only the good ones.

Work directory for all commands: /tmp/claude-0/-home-user-kurkoos-group/b616de33-7a66-539b-90c4-315bd9ec44de/scratchpad (a web server for the app is already running on port 8765; do not start or stop servers; never use pkill).

## Learn the format first (read before writing)
1. `canva/examples.json`: ten real specs from the existing library.
2. The drawing code in `ce15.html` between the lines `/*TPL:START*/` (about line 5868) and `/*TPL:END*/`: read the `draw` function and ~15 existing templates (search for `S('` and `RV('`) to learn every element's properties. Do not read the whole file; it is huge. Use Grep with context and read only that region.
3. Existing families (do not repeat them, add new compositions): tiktok, monday, apple, tidhar, africa, israelcanada, dimri, amram, kedar, yanuv, altneu, gabay, prash, electra, milerson, editorial, swiss, brutal, luxury, archmag, tech, catalog, fashion, infographic, poster, listing, typo, drafting.

## Canvas rules
- Margins 72px. Brand footer is drawn by `{"t":"chrome","o":{"noIndex":true}}` at the bottom: keep all content above y=1262. Always end the list with that chrome element.
- The logo sits at the top left (roughly x<340, y<150): keep text and busy shapes out of that corner. In Hebrew layouts the label/eyebrow goes top right.
- Text roles: `f:"head"` (exactly one per template; the headline, at most 7 words, 1 to 3 lines, size 64 to 170, weight 800 or 900), `f:"sub"` (one supporting line, 12 words, size 28 to 44), `f:"label"` with `kind:"small"` (eyebrow or tag, 22 to 30). Set `maxW`, `max` (max lines), `lh` (1.0 to 1.3), `align` ("right" for Hebrew, "center" for centered designs; for align right the x is the RIGHT edge, for center x=540).
- Photos: `{"t":"photo","x","y","w","h","s":0}` with `s` as the slot index 0 to 2 (use 1 to 3 photos, or none for typographic designs), optional `r` corner radius, `fade`, `dim`. Text over a photo needs a scrim (`grad` or the photo's `fade`/`dim`) and white text.
- Colours: brand palette only: navy #07293a, red #a90b0c, teal #105572, mist #8fb6c8, white #ffffff, paper #f4f6f8, pale blue #dbe8ee, ink #0b1f2a, slate #5b6472 (named colours navy, red, teal, mist, white, slate, ink are also accepted). Text contrast against its background at least 4.5:1.
- Hebrew typography: right aligned, large bold headlines, generous line height, no all caps, short lines, no thin weights. Numbers read left to right.
- Draw order matters: background rect first, then photos, shapes, grads, then text, then chrome.
- Never include a competitor's name, logo or real copy. "In the style of" means the general visual language only.

## What to deliver
Your assignment file (given in your prompt) gives a design direction and a count. Write the specs as one JSON array to `canva/author/<direction>.json`. Each item:
`{"id":"x_t_au_<direction>_<nn>","name":"3 to 5 Hebrew words","theme":"light"|"dark","el":[...],"desc":"one Hebrew sentence on the layout","ct":["project","construction","news","tip","data","quote","faq"],"st":["photo"|"clean","bold"|"modern"|"clean"]}`
- Every template must be structurally different from the others in your file (photo placement, grid, alignment, blocks, rules, shapes, stat/number treatments, scale contrast). Maximum variety is the goal. Use the richer element types (stat, ring, list, steps, timeline, bars, tag, stamp, frame, marker, dots, line, pill, arrow, counter, progress...) where they fit the direction.
- Lint with `python3 canva/lint.py canva/author/<direction>.json`. Fix every FAIL. Warnings about the logo corner or margins should be fixed too unless intentional.
- Render and LOOK at each batch: `node canva/preview.cjs canva/author/<batch>.json canva/author/<batch>.jpg` renders each spec with two demo posts side by side (use batches of at most 6 specs per render so the image stays readable), then read the jpg with the Read tool. Fix anything that overlaps, is cut off, is unreadable, looks empty, or looks generic. Delete templates you cannot make good. Quality over count, but aim for the full count.
- When done, reply in at most 5 lines: file path, number of templates that pass lint and your visual check.
