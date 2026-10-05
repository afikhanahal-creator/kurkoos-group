# Template authoring, round 2: brand language first

Round 1 failed the client: every template used the client's own navy and red, so "monday style" and "TikTok style" looked identical and generic. This round each agent owns ONE brand and must make templates that are unmistakably in that brand's visual language. The client explicitly asked for this: use the BRAND's palette, not the Kurkoos palette. The Kurkoos logo and footer are added automatically by the `chrome` element, that is the only brand element.

Work directory for all commands: /tmp/claude-0/-home-user-kurkoos-group/b616de33-7a66-539b-90c4-315bd9ec44de/scratchpad (a web server is already running on port 8765; do not start or stop servers; never use pkill).

## Read first
1. `canva/brands.json`: find your brand key (given in your prompt). It holds the palette (hex), the look, 8 to 10 signature motifs and things to avoid. Use the palette hex values directly in `col`, `bg`, `fg`, `from`, `to` fields (the engine accepts any hex or rgba string).
2. `canva/examples.json`: ten real specs from the library, to learn the JSON shape.
3. The engine in `ce15.html` between `/*TPL:START*/` (about line 5868) and `/*TPL:END*/`: read the `EL` element table and the `draw` function to learn every element and its properties (photo supports `mono:true`, `fade:[a,b]`, `rgb:'r,g,b'` for the fade colour, `dim`, `r`; text supports `track`, `lh`, `maxW`, `max`, `min`, `w` weight, `align`, `kind:'small'`; caption boxes take `bg`/`fg` and `hiAt`/`hiBg` word highlights; pill, tag, sticker, stamp, marker, frame, line, grad, dots, tiles, bars, stat, ring, list, steps, timeline, counter, progress, arrow, play, swipe, poll, vtext, otext and more). Read only that region with Grep and targeted Read calls, the file is huge.

## Canvas rules
- 1080x1350. Margins 72 (brands with tight grids may use 48). Content stays above y=1262 (the chrome footer). End every spec with `{"t":"chrome","o":{"noIndex":true}}`. The logo sits top left (x<340, y<150): keep text out of that corner, labels go top right.
- Exactly one text with `f:"head"` (the post headline: up to 7 words, 1 to 3 lines, size 64 to 170, weight 700 to 900). One optional `f:"sub"` (size 28 to 44, max 12 words) and one optional `f:"label"` with `kind:"small"` (22 to 30). For `align:"right"` x is the right edge; `align:"center"` x=540. Set `maxW`, `max`, `lh`.
- Photos: `{"t":"photo","x","y","w","h","s":0..2}` plus `r`, `mono`, `fade`, `dim`. Text over a photo needs a scrim (`grad`, or the photo's `fade`/`dim`) and light text.
- Draw order: background rect, photos, blocks, grads, text, chrome. Text contrast at least 4.5:1 against what is under it.
- Hebrew: right aligned (or centred when the brand centres), bold headlines, generous line height, numbers read left to right, no all caps, no thin weights for Hebrew body.
- Never a competitor's name, logo, slogan or real copy. The brand language only: palette, composition, shapes, rhythm.

## Variety is the brief
Produce the count in your assignment (30). Every template must be a different composition: use every motif in your brand file at least once, then invent more in the same language. Vary: photo placement and count (0 to 3), block structure, alignment, scale contrast, label and chip treatments, number treatments, splits and grids. If two of your templates would look alike as thumbnails, change one. Do not reuse the compositions of round 1 (`canva/author/*.json`).

## Deliver
Write `canva/author2/<brand>.json`: a JSON array, each item
`{"id":"x_t_b2_<brand>_<nn>","name":"3 to 5 Hebrew words naming the composition","theme":"light"|"dark","el":[...],"desc":"one Hebrew sentence","ct":["project","construction","news","tip","data","quote","faq"],"st":["photo"|"clean","bold"|"modern"|"clean"]}`
`theme` is "dark" when the page background is dark.
- Lint: `python3 canva/lint.py canva/author2/<brand>.json`. Fix every FAIL. Fix warnings unless intentional.
- Render and LOOK: `node canva/preview2.cjs canva/author2/<batch>.json canva/author2/<batch>.jpg` renders each spec with three different demo posts (different photos and headlines). Use batches of at most 5 specs per render. Read the jpg with the Read tool. Ask yourself for each one: would a designer at this brand recognise it as theirs? Is it different from the others? Is anything overlapping, cut off, unreadable or empty? Fix or delete.
- Elements that depend on a number (stat, ring, progress, counter with a number) must not invent a number: if a post has none they draw nothing, so only use them where the composition still works without the number, and never add a `fallback`.
- Final reply, at most 5 lines: file path, how many templates pass lint and your visual check, and anything you could not solve.
