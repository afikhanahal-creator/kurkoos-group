# my-reel: ריל אנכי בשכבות עם 14 אפקטים (HyperFrames)

- `style.md`: השפה העיצובית האחת. כל אפקט חייב לציית לה.
- `effects/catalog.json`: 14 האפקטים, כל אחד עם שם, שכבה, משך, פרמטרים והפרומפט בעברית.
- `effects/fx.js`, `effects/fx.css`: המימוש (GSAP על טיימליין אחד מושהה).
- `build.mjs`: `plan.json` -> `index.html` (5 שכבות: מקור, מאחור, קאט-אאוט, מלפנים, כותרות).
- `plan.json`: השכבות בלבד עם `debug:true` (הוכחת סנכרון). `plan.demo.json`: כל 14 האפקטים על הקליפ החלופי.
- `assets/`: `video.mp4` (המקור), `cutout.webm` (מ-`npx hyperframes remove-background`), `fonts/Heebo.ttf`.
- `vendor/gsap.min.js`: עותק מקומי, כדי שהבדיקה והרינדור לא יתלו ברשת.

```bash
node build.mjs plan.demo.json && npm run check && npx hyperframes@0.8.193 snapshot --at 0.9,1.8,2.8
```

התמלול (`transcript.json`, מילים עם זמנים) לא נוצר בענן של Claude Code: whisper חסום שם. ראו
`.claude/skills/kurkoos-video-pro/references/30-reel-14-effects.md`.
