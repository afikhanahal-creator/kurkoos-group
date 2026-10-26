# הריסה ובנייה מחדש: מהבית הישן לבית החדש

A one minute Hebrew film (about 50 s), 9:16 1080×1920 at 30 fps, plus a 16:9 1920×1080 version. It is built from the article
https://www.kurkoos-group.co.il/constructions/harisa-uvniya-mechadash with the reel engine in `video/engine/kreel` (the same
effects as the supervision reel v5).

## What is real and what is illustrative
| Scene | Picture | Status |
| --- | --- | --- |
| 1, 3, 5 | The old house and the cleared side of the same plot (`_media/hr_house`, a photo from the engine library) | Real photo, slow camera push. Not video |
| 2 | Inspection pictures from the engine library (`ph_pikuach`, `ph_mgr`, `ph_helmetplans`) | Library images |
| 3 | Permit stamp (`il_stamp`) | Illustration |
| 4 | Fencing and demolition (`hr_il_fence`, `hr_il_dig`) | Illustrations, marked "איור להמחשה" on screen |
| 5 | Plot marking (`hr_il_plot`) | Illustration |
| 6 | Piles, foundations, frame, slab rebar | Real Kurkoos site footage |
| 7 | Pour, waterproofing, safe room, finished interior | Library photos |
| 8 | Finished houses (`v4_ph77..80`) | Kurkoos villas, marked "מבתים שבנינו". Not the house on this plot |
| 9 | End card with the logo and phone | Brand |

No video generation engine is connected to this environment, so nothing here is AI video. Stills move by camera push,
crossfades and overlays, and the film never presents a still as real motion.

## The scenes
| # | Time | Voice over (Gemini TTS, voice Charon) | On screen | Transition |
| --- | --- | --- | --- | --- |
| 1 | 0.0 to 5.3 | בית ישן, על מגרש טוב. לשפץ אותו, או להרוס ולבנות מחדש? | לשפץ? / או לבנות מחדש? · 01 הבית הישן | punch cut |
| 2 | 5.3 to 11.7 | לפני שמחליטים, בודקים. את מצב השלד, את הקרקע, ואת זכויות הבנייה במגרש. | 3 chips · 02 בדיקות | quick cuts |
| 3 | 11.7 to 16.9 | מתכננים את הבית החדש, ומגישים להיתר. בלי היתר ביד, לא מתחילים. | blueprint over the house, stamp "היתר בנייה" · 03 | crossfade |
| 4 | 16.9 to 22.9 | מגדרים את האתר, מנתקים תשתיות, ורק אז הריסה מבוקרת, עם בטיחות מלאה. | הריסה מבוקרת · איור להמחשה · 04 | cut |
| 5 | 22.9 to 26.7 | המגרש מתפנה, ומסמנים בשטח את קווי הבית החדש. | red plot outline drawn on the empty plot · 05 | crossfade |
| 6 | 26.7 to 32.1 | כלונסאות, יסודות ושלד. כל שלב נבדק, לפני שיוצקים. | big word שלד · 06 | fast cuts, 1.2 to 1.35× speed |
| 7 | 32.1 to 37.2 | מערכות, איטום וגמר. עם פיקוח צמוד, עד המסירה. | 4 chips · 07 גמר | quick cuts |
| 8 | 37.2 to 42.4 | ובסוף, בית חדש. בנוי לפי מה שתכננתם, מהיסוד. | בית חדש / מהיסוד · מבתים שבנינו · 08 | crossfade |
| 9 | 42.4 to 49.7 | קבוצת קורקוס. מקרקע ועד מסירת מפתח. דברו איתנו, לפני שמחליטים. | logo, 055-981-1814, kurkoos-group.co.il, red pill | end card |

Music: 112 bpm cinematic, quiet under the voice, drums from scene 4 (the demolition). Mix at −14 LUFS.

## Prompts for a video engine (when one is connected)
Environment bible: one Israeli single storey house from the 1960s, plastered white walls, terracotta tile roof, a solar water
heater on the roof, a low block wall and a metal gate at the street, a citrus tree on the left, a wide dry plot on the right
with a low concrete wall at the back and trees beyond it. Midday light, clear sky. Main camera: eye level from the gate, as
in `_media/hr_house`. The new house stands on the same plot, set back from the same gate.

Character bible: engineer (helmet, reflective vest, tablet), architect (rolled plans, white helmet), site manager (navy
jacket with the Kurkoos logo, white helmet), home owners (a couple in their forties, casual). Every worker wears a helmet,
vest and boots.

Negative prompt for every scene: distorted hands, extra fingers, warped Hebrew letters, invented logos, unsafe work without
protective gear, a different house or plot, people standing under a working machine, text in the picture.

| # | Main prompt | First frame | Camera |
| --- | --- | --- | --- |
| 1 | The old house on its plot, quiet midday, leaves moving slightly | `hr_house` | slow push in from the gate |
| 2 | Engineer, architect and owners walk around the house and point at cracks and the roof | the same view, people at the door | handheld follow, eye level |
| 3 | Plans on a table at the plot, a tablet shows the new house drawn on the same plot | plans over the house | top down, then tilt up to the house |
| 4 | Fence and signs go up, a utility crew disconnects, then a small excavator takes the house down section by section, water spray for dust | fenced plot | locked wide, then time lapse |
| 5 | The cleared plot, a surveyor marks corners with stakes and string | empty plot from the gate | slow crane up |
| 6 | Pile rig, foundations, concrete frame rising, steel for the slab | rig on the plot | time lapse, match cuts |
| 7 | Plumbing, electrical, waterproofing on the roof, plaster and floors, a supervisor inspects | interior in progress | gimbal walk |
| 8 | The finished house on the same plot, evening light, the same gate and back wall | the house from the gate | slow push in, then pull back |

## Re-running and making versions
```
python3 video/engine/kreel/tts_gemini.py video/projects/harisa-60/script.json   # voice (edit script.json first)
python3 video/projects/harisa-60/build.py                                       # timeline: scenes, shots, effects
python3 video/engine/kreel/render.py video/projects/harisa-60/project.json --preview   # key frames only
python3 video/engine/kreel/render.py video/projects/harisa-60/project.json
python3 video/engine/kreel/music.py   video/projects/harisa-60/project.json
python3 video/engine/kreel/mix.py     video/projects/harisa-60/project.json
bash    video/projects/harisa-60/wide.sh
```
Change a scene's length, order, pictures, words or effects in `build.py`. The other scenes stay as they are.
Outputs: `out/harisa-60.mp4` (9:16), `out/harisa-60_16x9.mp4`, `out/captions.srt`, `out/cover.jpg`, `vo/*.wav`.
