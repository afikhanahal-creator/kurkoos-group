# מחבר את שני הרינדורים מלמעלה לתמונה אחת עם שמות החדרים, שטחים, חץ צפון וקנה מידה.
# הרצה: python compose.py <תיקיית הרינדורים> <קובץ גופן עברי>
import json
import sys
import os
from PIL import Image, ImageDraw, ImageFont

D, FONT = sys.argv[1], sys.argv[2]
views = json.load(open(os.path.join(D, 'views.json')))


def vis(s):
    """Pillow עם raqm מסדר עברית מימין לשמאל בעצמו, לכן הטקסט עובר כמו שהוא."""
    return s


def f(size, bold=False):
    return ImageFont.truetype(FONT.replace('400', '700') if bold else FONT, size)


GROUND = [  # שם, x, z, שטח
    ('חדר שינה הורים', 4.3, 4.6, 19.5), ('רחצה הורים', 1.25, 4.9, 5.4), ('חדר ארונות', 2.3, 6.2, 6.9),
    ('שירותי אורחים', 3.97, 8.4, 2.6), ('מסדרון', 5.9, 7.5, 6.6), ('ממ"ד', 8.4, 5.4, 11.7),
    ('חדר רחצה', 8.85, 7.95, 7.5), ('חדר שינה', 8.6, 9.6, 12.2), ('מבואה', 3.6, 10.6, 11.4),
    ('מטבח', 1.3, 12.6, None), ('פינת אוכל', 4.55, 13.0, None), ('סלון', 8.3, 13.3, 47.4),
    ('מדרגות למרתף', 1.6, 7.8, None), ('לובי', 0.55, 10.3, None), ('דק', 6.0, 17.4, 29.2),
    ('גינה פרטית', 7.0, 21.2, 122.4), ('חצר אנגלית', 8.45, 0.9, 18.7),
]
BASE = [
    ('חדר משחקים', 4.3, 2.7, 12.2), ('מיני בר', 1.2, 1.0 + 0.5, None), ('מרחב משפחה', 3.0, 3.75, 26.9),
    ('רחצה', 7.05, 5.7, 4.5), ('רחצה', 9.66, 3.6, 4.5), ('סטודיו', 8.0, 9.5, 17.3), ('מבואה', 4.4, 8.7, 4.5),
    ('חדר שירות', 4.1, 10.1, 6.1), ('מחסן', 1.3, 9.9, 6.0), ('מדרגות', 1.7, 8.85, None), ('חצר אנגלית', 7.6, 2.6, 18.7),
]


def label(img, v, items):
    dr = ImageDraw.Draw(img, 'RGBA')
    for name, x, z, area in items:
        px = (x - v['x1']) * v['ppm']
        py = (z - v['z1']) * v['ppm']
        t1 = vis(name)
        t2 = vis(f'{area:.1f} מ״ר') if area else None
        f1, f2 = f(26, True), f(22)
        w1 = dr.textlength(t1, font=f1)
        w2 = dr.textlength(t2, font=f2) if t2 else 0
        w = max(w1, w2) + 22
        h = 40 + (28 if t2 else 0)
        dr.rounded_rectangle([px - w / 2, py - h / 2, px + w / 2, py + h / 2], 10, fill=(255, 255, 255, 215), outline=(30, 30, 30, 60))
        dr.text((px - w1 / 2, py - h / 2 + 5), t1, font=f1, fill=(25, 28, 32))
        if t2:
            dr.text((px - w2 / 2, py - h / 2 + 38), t2, font=f2, fill=(31, 79, 70))


def scalebar(img, v, x0, y0):
    dr = ImageDraw.Draw(img)
    m = v['ppm']
    for i in range(5):
        dr.rectangle([x0 + i * m, y0, x0 + (i + 1) * m, y0 + 10], fill=(20, 20, 20) if i % 2 == 0 else (245, 245, 245), outline=(20, 20, 20))
    dr.text((x0, y0 + 14), '0', font=f(20), fill=(20, 20, 20))
    t = vis('5 מ׳')
    dr.text((x0 + 5 * m - dr.textlength(t, font=f(20)) / 2, y0 + 14), t, font=f(20), fill=(20, 20, 20))


g = Image.open(os.path.join(D, views['ground']['file'])).convert('RGB')
b = Image.open(os.path.join(D, views['basement']['file'])).convert('RGB')
label(g, views['ground'], GROUND)
label(b, views['basement'], BASE)
pad, head = 40, 120
W = g.width + b.width + pad * 3
H = max(g.height, b.height) + head + pad
canvas = Image.new('RGB', (W, H), (246, 245, 242))
canvas.paste(g, (W - pad - g.width, head))                  # קומת הכניסה מימין (סדר קריאה בעברית)
canvas.paste(b, (pad, head))
dr = ImageDraw.Draw(canvas)
for img_x, img, title in ((W - pad - g.width, g, 'קומת כניסה · 151 מ״ר + גינה 122 מ״ר'), (pad, b, 'קומת מרתף · 99 מ״ר')):
    t = vis(title)
    dr.text((img_x + img.width - dr.textlength(t, font=f(40, True)), 50), t, font=f(40, True), fill=(25, 28, 32))
t = vis('דירת גן 250 מ״ר · מבט מלמעלה בלי תקרה · מידות לפי התוכנית')
dr.text((W - pad - dr.textlength(t, font=f(24)), 8), t, font=f(24), fill=(90, 95, 100))
# חץ צפון וקנה מידה מתחת לרינדור המרתף
cx, cy = pad + 70, head + b.height + 120
dr.ellipse([cx - 50, cy - 50, cx + 50, cy + 50], fill=(255, 255, 255), outline=(40, 40, 40), width=2)
dr.polygon([(cx, cy - 42), (cx + 14, cy + 8), (cx, cy - 2), (cx - 14, cy + 8)], fill=(192, 57, 43))
tn = vis('צפון')
dr.text((cx - dr.textlength(tn, font=f(22, True)) / 2, cy + 12), tn, font=f(22, True), fill=(192, 57, 43))
scalebar(canvas, views['basement'], pad + 160, cy - 10)
notes = [
    'גובה תקרה 3.80, ו-3.40 מתחת להנמכות הגבס בשתי הקומות',
    'ריצוף פורצלן 120×120 בכל הקומות',
    'ויטרינות הזזה עד 3.40: 5.20 בדרום, ופינתית בדרום-מזרח',
    'מדרגות U עם מדרגות פנייה: 22 רומים של 18.6 ס״מ',
]
for i, n in enumerate(notes):
    t = vis(n)
    dr.text((pad + b.width - dr.textlength(t, font=f(24)), head + b.height + 230 + i * 38), t, font=f(24), fill=(60, 64, 70))
canvas.save(os.path.join(D, 'top_view_labeled.png'))
print('saved', canvas.size)
