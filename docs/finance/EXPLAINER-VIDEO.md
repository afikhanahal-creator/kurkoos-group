# The product film

About fifty seconds. It shows a new user what the system does for them, the way a product film does: the promise, the
problem, the answer, five things the system does, the name. Version 3 replaced two that read like a tutorial (2026-11-21,
the owner's brief: marketing messages, a clear story, clean screens, no noise). Version 4 (the same day, the owner's
notes on v3): faster and more rhythmic, sharp transitions, subtitles, the narrator to the very end, and upbeat music
"that makes you want to use the system".

## The story and the words
| Part | On the screen | The narrator |
|---|---|---|
| The promise | כל ההוצאות של הקבוצה · במקום אחד · בכל רגע (each line as it is said) | כל ההוצאות של הקבוצה. במקום אחד. בכל רגע. |
| The problem | חשבוניות מכל כיוון; papers fly in from every side (במייל, בוואטסאפ, בנייר on their words); חיפושים · הקלדות · מעקב on theirs | היום, חשבוניות מגיעות מכל כיוון. במייל, בוואטסאפ, בנייר. ושעות הולכות על חיפושים, הקלדות ומעקב. |
| The answer | מערכת אחת; the papers fly into the middle and the screen cuts in there | קורקוס פיננס מרכזת הכול במערכת אחת, שעובדת בשבילכם. |
| 1 | הכול נאסף לבד · בלי להקליד דבר; the latest documents drop into the list one by one, a line reads the newest and its name, date and sum appear | המסמכים נאספים לבד. המערכת קוראת כל חשבונית, וממלאת את הפרטים במקומכם. |
| 2 | אתם רק מאשרים · כל השאר כבר מסודר; a "לבדיקה" chip is pressed and turns into "מוכן לרו״ח", the two still waiting are marked | אתם רק מאשרים. מה שדורש תשומת לב מסומן, וכל השאר כבר מסודר. |
| 3 | תמונת מצב בכל רגע · לפי חברה ולפי חודש; the month counts up to the 216,880.52 printed on the screen, the lit area moves to the companies, then the monthly bars rise | ובכל רגע, תמונת מצב מלאה. כמה הוצאנו החודש, באיזו חברה, ומה השתנה. |
| 4 | הדוח מוכן. בלחיצה אחת · לרואה החשבון, בכל חודש; the summary cells appear, "שליחה במייל לרו״ח" is pressed and its paper plane flies off | בסוף החודש, הדוח לרואה החשבון כבר מוכן. לחיצה אחת, והוא בדרך. |
| 5 | כל מסמך במקומו · זמין גם מהטלפון; the Drive archive's folders appear, the phone slides in on "גם מהטלפון" | וכל מסמך נשמר במקומו, וזמין מכל מקום. גם מהטלפון. |
| The name | Kurkoos Finance · פחות ניירת, יותר שליטה (each part as it is said) | קורקוס פיננס. פחות ניירת, יותר שליטה. |

Next to the screen: a title and one short line of value. Under it, **subtitles** for v02 to v08: one chunk of 2 to 5
whole words at a time (`CHUNKS` in the page; joined, they are the sentence), bottom centre on a dark pill, 52 px, the
word being said and the ones before it in white, the rest in mist. Only a line's start and end are known, so its words
share the line by their letters, and a comma or a full stop adds the narrator's pause (`WT` in the page). A chunk
changes in one frame, without animation. The promise (v01) and the name (v09) are spoken word for word by the big type
itself, which arrives with the same timing, so they have no second copy at the bottom. `check(t)` fails a frame where a
subtitle leaves the frame, wraps to two lines, shows together with another, or touches a title, the screen or the phone.

## The rules of the film
- Pace: the narrator runs at `TEMPO` 1.1 (`atempo` in the mix; the page divides each line's length by it), 0.25 to 0.45 s
  between lines, and every scene starts on a beat of the music (120 BPM, `onBeat` in `timeline.js`).
- Three transitions, nothing else: **CUT** (a scene on the navy background leaves in 0.12 s, ending exactly on the cut,
  and the next arrives at once and settles from a slightly larger size in 0.3 s), **PUSH** (inside the screen, the next
  screenshot slides in from the left in 0.32 s behind a thin red edge; Hebrew reads right to left) and **SNAP** (every
  word arrives whole, rising 22 px in 0.3 s, and leaves in 0.12 s). Motion is expo or cubic out: fast attack, clean stop.
- One screen per feature, framed on its clean part, one place lit while the sentence is about it (in the overview it
  travels from the month to the companies to the bars). The camera holds, moves on a word in 0.8 s, and under it a slow
  push-in never stops.
- The overlays that make a screen live (rows, the chip, the count, the bars, the summary cells, the button, the
  folders) are cut from the same screenshot and sit on the element they dramatise, inside the screenshot's layer, so
  they move with the camera. Before they play, a patch of the screen's own background (or, under the bars, the chart's
  empty column stretched) hides the element. No number, name or claim that is not in the screenshot; the count ends on
  the screenshot's own figure. No pointer.
- The screen is one object for the whole film: it cuts in where the papers gather, moves aside, the screens are pushed
  in inside it, and it cuts out before the name.
- Flashes: the renderer's limit is 3 brightness jumps a second; the preview of v4 had 8 in the whole film (the cuts and
  the pushes), at most 2 in any second.
- Sound: the narrator (Gemini TTS, voice Charon, the group's voice) over an upbeat track of pure tones (`bed.py`, below).
  No sound effects. **No white noise** (CLAUDE.md, video/README.md): `mix.cjs` fails if `vo_noise.py` finds any. The
  music ducks under the voice, and the final fade starts only after the last word.
- Every time comes from the narration (`timeline.js`); the page, the mix and the music read the same clock.

## The music (`bed.py`)
D major, I V vi IV, 120 BPM, every sound a sum of sines (the owner's rule: no noise source at all, so no noise hi-hat,
snare, riser or whoosh). A kick that is a sine dropping from 150 to 48 Hz, an off-beat bass, a bright plucked arpeggio
(the motif: six harmonics that die away fast), a short chord on beats two and four where a clap would be, a 'tick' of
two very high sines on the off-beats. The promise is light (motif and pad), the problem adds the kick on one and three
and the bass, the bar before the answer has a sine glide up an octave and a fill of falling sine toms, and the answer
opens the full groove (four on the floor, sixteenth notes, backbeat). A bright chord marks the answer and every new
feature (each starts on a beat). On the closing line the drums step back to one kick a bar, and one full chord lands on
the first beat after the last word and rings out. `mix.cjs` writes the cues (`out/finance-explainer-cues.json`).

## Where it shows
`src/pages/finance/Explainer.jsx`, opened by `FinanceApp.jsx`: after a sign-in made on the page, and after a sign-out
over the sign-in screen. A page that opens already signed in shows nothing. "דילוג", Escape or a click outside close it.
It starts with sound; a browser that refuses starts it silent and the window shows "הפעלת קול". Automated browsers do
not get it unless a test sets `window.__finExplainer = true` (scenario EXPLAINER).

## The files
| File | What |
|---|---|
| `public/finance/explainer.mp4`, `explainer-poster.jpg` | the web copy (1280x720, H.264 + AAC) and its first frame |
| `video/studio/finance-explainer/index.html` | the picture (animation studio contract: everything from `seek(t)`) |
| `video/studio/finance-explainer/timeline.js` | the clock |
| `video/studio/finance-explainer/mix.cjs`, `bed.py` | the sound |
| `video/studio/finance-explainer/shots.mjs`, `demo-data.py`, `shots/` | the screenshots and the demo data behind them |
| `video/projects/finance-explainer/script.json` | the narrator's lines, with spellings for words the voice reads wrong |

The screens come from the local test system with made-up suppliers and amounts, never from production; the screen's
top bar says "המספרים במסכים להדגמה בלבד" and the window repeats it. The deploy size budget is 32 MB for the web copy.

## Making it again
```
python3 video/engine/kreel/tts_gemini.py video/projects/finance-explainer/script.json   # needs the Gemini key (below)
node video/studio/finance-explainer/mix.cjs                                              # sound + the clock (config)
cd video && node engine/anim_render.cjs studio/finance-explainer/index.html --config out/finance-explainer-config.json --check
node engine/anim_render.cjs studio/finance-explainer/index.html --config out/finance-explainer-config.json --stills -o out/finance-explainer.mp4   # look at the stills
node engine/anim_render.cjs studio/finance-explainer/index.html --config out/finance-explainer-config.json --fps 30 --sub 2 -o out/finance-explainer-picture.mp4
ffmpeg -i out/finance-explainer-picture.mp4 -i out/finance-explainer-sound.wav -vf "scale=1280:720:flags=lanczos,fps=24" \
  -c:v libx264 -preset veryslow -crf 30 -pix_fmt yuv420p -c:a aac -b:a 80k -movflags +faststart ../public/finance/explainer.mp4
```
The Gemini key lives in the cloud environment "Kurkoos Group - Social Media Posts" (a network secret), not in this
repository and not in the finance environment. It is on the free tier: a handful of lines a day per model.
Screens that changed: `bash scripts/finance-e2e/services.sh`, `python3 demo-data.py` + psql on the local database only,
`node video/studio/finance-explainer/shots.mjs`, then check every overlay of that feature: its rectangles are in the
screenshot's 1440 x 900 pixels (`build()` and `PLAY` in the page), and a moved element leaves its overlay behind.

## Open
- A 9:16 version for phones held upright.
- v06 to v09 are timed from estimates until their voice files exist; after `tts_gemini.py` makes them, run `mix.cjs`
  again and look at the stills of features 3 to 5 and the name (word timing follows the real lengths by itself).
- The count in feature 3 is set in Almoni, the screenshot's digits in the app's font; at the end of the count the
  screenshot's own figure takes over in one frame.
