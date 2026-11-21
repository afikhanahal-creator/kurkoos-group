# The explainer video

One minute (62 seconds, no sound, subtitles on the screen) that shows a new user what the system does:
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
node video/studio/finance-explainer/shots.mjs              # the six screenshots
cd video && npm install
node engine/anim_render.cjs studio/finance-explainer/index.html --stills -o out/finance-explainer.mp4   # one frame per stage
node engine/anim_render.cjs studio/finance-explainer/index.html --check                                 # 0 issues
node engine/anim_render.cjs studio/finance-explainer/index.html --fps 30 --sub 2 -o out/finance-explainer.mp4   # about 7 minutes
ffmpeg -i out/finance-explainer.mp4 -vf "scale=1280:720:flags=lanczos,fps=24" -c:v libx264 -preset veryslow -crf 30 \
  -pix_fmt yuv420p -movflags +faststart -an ../public/finance/explainer.mp4
```
A screen that changed: take its screenshot again and adjust the camera and ring numbers of its scene in `SCENES`
(they are in the screenshot's own 1440x900 pixels).

## How a screen scene works
Each scene has a headline and three lines. Every line has its own place on the screen (`items` in `SCENES`): while
the line is the active one the camera moves there, the rest of the screen dims, a red frame marks the place, the
pointer travels to it and clicks, the line turns white and bold, and the subtitle says the narrator's sentence.
The five numbered dots above the headline show which step is on.

## Narration
The subtitles are the narration script, one sentence per line of every scene (`say` in `items`, and `SAY` for the
opening). A voice track is not in the file yet: no text-to-speech key exists in the cloud session, and the owner
declined to add one there. To add a voice:
1. Record (or generate) one audio file that follows the subtitle times. `node engine/anim_render.cjs ... --stills`
   prints the stage times; the sentences and their windows are in the page (`SAY`).
2. Render with `--audio voice.wav`, and encode the web copy with `-c:a aac -b:a 96k` instead of `-an`.
3. In `Explainer.jsx` the video is muted so that it may start by itself; with a voice, start it unmuted after the
   sign-in click and keep the mute button of the controls.

## Not done
- No voice track yet (see Narration).

- One 16:9 version. On a phone held upright the screens inside it are small; a 9:16 version would need its own layout.
