# Design agent brief · Kurkoos WORLD layouts

You are a senior designer who also writes canvas code. Build new post layouts for the Kurkoos content engine (Hebrew, RTL, 1080×1350 canvas) at the level of the best brand social work in the world (Apple, Nike, IKEA, Airbnb, Pentagram, Collins). Not generic. Each layout must have one clear visual idea, perfect typographic hierarchy, generous space, and feel unmistakably Kurkoos.

## Files
- Helpers to copy at the top of your file: `design/helpers.js` (it starts with `(function(G){` and ends with `const L={};`). It gives you: W, H, M (72 margin), colors NAVY TEAL MIST MIST1 PAPER RED SLATE WHITE LINE, fonts HE(weight,size) Heebo 100-900, SE(weight,size) Frank Ruhl Libre serif, AL(weight,size) Almoni; T(c,text,x,y,{w,size,color,align,f,track,ltr}), fit(c,text,maxW,{max,min,lines,w,f}) + head(c,F,x,y,color,{align}), para(c,text,x,y,{size,maxW,lines,color,f,w,align}), rr (round rect), mark (towers logo), items(p) → [{v,l}], index(c,label,dark) (red index square + label top right), foot(c,dark) (brand footer, mandatory at the bottom of every layout), photo(c,p,I,x,y,w,h) (draws the post photo with crop, returns false if none), grid(), shade(), srcLine(c,p,y,dark), rnd(seed).
- Each layout: `L.x_w_<kind>=(c,p,I)=>{...}`. p has: head (headline, may contain \n), sub, label (eyebrow), cta, items (array of {v,l} or {big,label}), source, shot (photo), seed.
- End your file with: `G.FX.L=G.FX.L||{};Object.assign(G.FX.L,L);\n})(window);` and wrap the whole file in `/*FX14x:START*/ ... /*FX14x:END*/` comments (x = your letter).

## Rules (strict)
- Palette only: #07293a navy, #105572 teal, #8fb6c8 mist, #e7eef1, #f7f8fa paper, #a90b0c red (the only accent), white, #3d4b58 slate. No other hues.
- Type floor on 1080 wide: headline ≥ 72px, body and items ≥ 34px, the smallest line ≥ 26px. Max three weights per layout.
- RTL Hebrew, right aligned by default. Numbers are wrapped by the helpers so they read correctly.
- Every layout ends with foot(c, dark).
- Never draw fake data: the layout only shows what p contains. Handle missing fields gracefully (no "undefined", no empty boxes).
- Text must never overflow the canvas or overlap other text: use fit() for headlines and para() with maxW and lines for body.
- Photo layouts must still look good when the photo is missing (photo() fills teal with a grid).

## Test loop (do it, look at the images, fix, repeat until it is excellent)
1. `python3 design/build_page.py design/fx14X.js t_X.html` (X = your letter)
2. Write sample posts as JSON (array of {id, layout, visual:{headline,sub,eyebrow,cta,items:[],slides:[]}, hook, fx:{items:[{v,l}], shot:{k:'n09',r:[0,0,1,1]}, source}, _file:'name.jpg'}). Photo keys that exist locally: n01..n16, w01, w02, w04, w05, w07, site1, site2, site6, v1..v6, aerial, house, execbg.
3. `PAGE=t_X.html node render_page.cjs design/samples_X.json design/out_X` (the local server on port 8765 is running).
4. Make a contact sheet with Python PIL and Read it. Check at thumbnail size and at full size. Fix spacing, hierarchy, overflow. Test long and short text for each layout.
5. Save the final sheet as design/sheet_X.png.

Report: the layout names, one sentence on the idea of each, and anything you could not solve.
