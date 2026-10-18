# קריאת שרטוט: ריל לקבוצת קורקוס

ריל 9:16 של כ-55 שניות, בצבעי המותג ובפונט Almoni, עם דיבוב בעברית, כתוביות זהות לקול, מעבר מהיר בכל משפט ומוזיקה מקורית.
הטקסט מבוסס על הפוסט "סנטימטר אחד בשרטוט הוא חצי מטר בשטח", עם תוספות ערך: תוכנית הגשה 1:100, מדידה של חדר, מידות בסנטימטרים ומפלס 0.00 בחתך.

## הפקה

```bash
python3 video/studio/sirtut/tts.py        # קול אחד רציף מ-Gemini, חיתוך בהפסקות, voice/voice.wav ו-voice/timings.js
python3 video/studio/sirtut/music.py      # music.wav, מתוזמן לחיתוכים מתוך timings.js
node video/engine/anim_render.cjs video/studio/sirtut/index.html --check    # בדיקת כתוביות על כל פריים
node video/engine/anim_render.cjs video/studio/sirtut/index.html -o out/sirtut_video.mp4
ffmpeg -y -i out/sirtut_video.mp4 -i video/studio/sirtut/music.wav -i video/studio/sirtut/voice/voice.wav -filter_complex \
 "[1:a]volume=0.5[m];[2:a]asplit[v1][v2];[m][v1]sidechaincompress=threshold=0.03:ratio=8:attack=20:release=350[md];[md][v2]amix=inputs=2:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11[a]" \
 -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart kurkoos-sirtut.mp4
```

- `lines.py`: הטקסט המדובר (מספרים במילים) והכתובית (~ מסמן מילה באדום, | מפצל כתובית לשני חלקים).
- `tts.py`: קריאה אחת רציפה, חיתוך לפי ההפסקות הארוכות (בין משפטים כשנייה, בפסיק כשליש שנייה), הפסקות מקוצרות ל-0.32 שנייה, קצב x1.10.
- `index.html`: סצנה לכל משפט, חיתוך מאחורי מגב אדום, הכתוביות נקראות מ-timings.js.
