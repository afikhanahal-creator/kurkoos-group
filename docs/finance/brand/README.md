# Kurkoos logo entrance

`kurkoos-logo-intro.json` is a Lottie animation of the group's logo: the base line is drawn, the four towers are built
on it one after another, the name arrives letter by letter and the two O's slide into their overlap, then GROUP.
2.8 seconds at 60 fps, 1200×400, transparent background, all vector, no image assets (33 KB).

- `kurkoos-logo-intro.mp4`, `kurkoos-logo-intro.gif`: the same animation on white, with the last frame held.
- `make-logo-intro.py`: builds the JSON (`python3 make-logo-intro.py Gelasio.ttf kurkoos-logo-intro.json`, needs `fonttools`).

The lettering is the outlines of Gelasio (open licence), a typeface drawn to Georgia's metrics. The logo file itself
(`public/kurkoos-logo-h.svg`) names Georgia, which cannot be embedded in a file; the two are close, not identical.
The colours are the logo's own: #14202b, #a90b0c, #105572. On a dark background the dark letters need a light variant.
