# The product film

About one minute. It shows a new user what the system does for them, the way a product film does: the promise, the
problem, the answer, five things the system does, the name. It replaced the first two versions, which read like a
tutorial (2026-11-21, the owner's brief: marketing messages, a clear story, clean screens, soft transitions, no noise).

## The story and the words
| Part | On the screen | The narrator |
|---|---|---|
| The promise | כל ההוצאות של הקבוצה · במקום אחד · בכל רגע | כל ההוצאות של הקבוצה. במקום אחד. בכל רגע. |
| The problem | חשבוניות מגיעות מכל כיוון, papers drifting, חיפושים · הקלדות · מעקב | היום, חשבוניות מגיעות מכל כיוון. במייל, בוואטסאפ, בנייר. ושעות הולכות על חיפושים, הקלדות ומעקב. |
| The answer | מערכת אחת, שעובדת בשבילכם; the papers gather into the screen | קורקוס פיננס מרכזת הכול במערכת אחת, שעובדת בשבילכם. |
| 1 | הכול נאסף לבד | המסמכים נאספים לבד. המערכת קוראת כל חשבונית, וממלאת את הפרטים במקומכם. |
| 2 | אתם רק מאשרים | אתם רק מאשרים. מה שדורש תשומת לב מסומן, וכל השאר כבר מסודר. |
| 3 | תמונת מצב בכל רגע | ובכל רגע, תמונת מצב מלאה. כמה הוצאנו החודש, באיזו חברה, ומה השתנה. |
| 4 | הדוח מוכן. בלחיצה אחת | בסוף החודש, הדוח לרואה החשבון כבר מוכן. לחיצה אחת, והוא בדרך. |
| 5 | כל מסמך במקומו | וכל מסמך נשמר במקומו, וזמין מכל מקום. גם מהטלפון. |
| The name | Kurkoos Finance · פחות ניירת, יותר שליטה | קורקוס פיננס. פחות ניירת, יותר שליטה. |

The words on the screen are a title and one line of value, never the whole sentence, and there are no subtitles.

## The rules of the film
- One screen per feature, already framed on its clean part (no menus), one calm camera move, one place lit while the
  sentence is about it. No pointer, no numbered steps.
- The screen is one object for the whole film: it is born in the middle as the answer, moves aside, and the screens
  cross-fade inside it. Nothing cuts.
- Sound: the narrator (Gemini TTS, voice Charon, the group's voice) over a quiet bed of pure tones (`bed.py`). No sound
  effects. **No white noise** (CLAUDE.md, video/README.md): `mix.cjs` fails if `vo_noise.py` finds any.
- Every time comes from the narration (`timeline.js`); the page and the mix read the same clock.

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
node engine/anim_render.cjs studio/finance-explainer/index.html --config out/finance-explainer-config.json --fps 30 --sub 2 -o out/finance-explainer-picture.mp4
ffmpeg -i out/finance-explainer-picture.mp4 -i out/finance-explainer-sound.wav -vf "scale=1280:720:flags=lanczos,fps=24" \
  -c:v libx264 -preset veryslow -crf 30 -pix_fmt yuv420p -c:a aac -b:a 80k -movflags +faststart ../public/finance/explainer.mp4
```
The Gemini key lives in the cloud environment "Kurkoos Group - Social Media Posts" (a network secret), not in this
repository and not in the finance environment. It is on the free tier: a handful of lines a day per model.
Screens that changed: `bash scripts/finance-e2e/services.sh`, `python3 demo-data.py` + psql on the local database only,
`node video/studio/finance-explainer/shots.mjs`, then adjust `cam` and `glow` of that feature.

## Open
- A 9:16 version for phones held upright.
