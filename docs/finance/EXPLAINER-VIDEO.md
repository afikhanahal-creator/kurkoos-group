# The explainer video

A minute and a half (88 seconds, no sound, the text is on the screen) that shows a new user what the system does:
where invoices come from, how they are collected and read, checking and approving, the overview for the CEO, the
report to the accountant, the archive in Google Drive and the phone.

## Where it shows
`src/pages/finance/Explainer.jsx`, opened by `FinanceApp.jsx`:
- after a sign-in made on this page, over the system;
- after a sign-out, over the sign-in screen.
A page that opens already signed in (a refresh, a second tab) shows nothing. "דילוג", Escape or a click outside close it.
Automated browsers do not get it unless a test sets `window.__finExplainer = true` (scenario EXPLAINER in the suite).

## The files
| File | What |
|---|---|
| `public/finance/explainer.mp4` | the web copy: 1280x720, 24 fps, H.264, no audio, about 1.7 MB |
| `public/finance/explainer-poster.jpg` | the frame shown before it plays |
| `video/studio/finance-explainer/index.html` | the composition (animation studio contract: everything from `seek(t)`) |
| `video/studio/finance-explainer/shots/` | the screenshots |
| `video/studio/finance-explainer/demo-data.py` | the demo documents the screenshots were taken with |

The deploy size budget (`scripts/check-deploy-size.mjs`) was raised from 30 to 32 MB for the web copy. If the video
moves to Cloudinary, like the site's other videos, the budget can go back.

## The screens are demo data
The screenshots come from the local test system (docs/finance/TESTING.md), never from production: the company names
are the group's, every supplier, amount and document is made up by `demo-data.py`. The video says so on every screen
scene ("המספרים במסכים להדגמה בלבד"), and the window in the app repeats it.

## Making it again
```
bash scripts/finance-e2e/services.sh                       # the local system
python3 video/studio/finance-explainer/demo-data.py        # writes demo-data.sql
psql -h 127.0.0.1 -p 54329 -U postgres -f demo-data.sql    # only on the local test database
# screenshots: 1440x900 at 2x of /admin/finance, /today, /documents, /report, /drive, and 390x844 at 3x of /admin/finance,
# saved as shots/home.jpg, today.jpg, documents.jpg, report.jpg, drive.jpg (2400 px wide) and phone.jpg (780 px wide)
cd video && npm install
node engine/anim_render.cjs studio/finance-explainer/index.html --stills -o out/finance-explainer.mp4   # one frame per stage
node engine/anim_render.cjs studio/finance-explainer/index.html --check                                 # 0 issues
node engine/anim_render.cjs studio/finance-explainer/index.html --fps 30 --sub 2 -o out/finance-explainer.mp4   # about 9 minutes
ffmpeg -i out/finance-explainer.mp4 -vf "scale=1280:720:flags=lanczos,fps=24" -c:v libx264 -preset veryslow -crf 30 \
  -pix_fmt yuv420p -movflags +faststart -an ../public/finance/explainer.mp4
```
A screen that changed: take its screenshot again and adjust the camera and ring numbers of its scene in `SCENES`
(they are in the screenshot's own 1440x900 pixels).

## Not done
- No narration. The site's text-to-speech needs the OpenAI key, which exists only in Vercel.
- One 16:9 version. On a phone held upright the screens inside it are small; a 9:16 version would need its own layout.
