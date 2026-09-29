"""Kurkoos Canva templates. Each template is a 1080x1350 static HTML page imported into Canva."""
import os
B = "https://filnzlnvujnlazwcxbuq.supabase.co/storage/v1/object/public/media/"
LOGO = os.environ.get('LOGO_BASE', '')  # jsDelivr base for logos
NAVY, TEAL, MIST, PAPER, RED, SOFT, INK = '#07293a', '#105572', '#8fb6c8', '#f7f8fa', '#a90b0c', '#e7eef1', '#1a1f2b'
P = {
 'rm1': 'projects/ramhal-6-8/1a460beb-e64e-4ca6-b987-e6c3d3fe7501.webp',
 'rm7': 'projects/ramhal-6-8/cab756c1-8dfc-4d90-862b-a320cb45c7b5.jpeg',
 'hm4': 'projects/hahumash-22-24/dc559abb-5011-4c3f-883d-5fad383c9569.webp',
 'hm1': 'projects/hahumash-22-24/fd1a3d3e-06d0-4ff2-b0a7-040bdfce5ad8.webp',
 'sk2': 'projects/hashikmim_24/e4ab02a7-490e-4f1c-a58d-3070e066859f.webp',
 'hv1': 'projects/henrietta-sald-24/48685226-ad08-4343-bca3-9d0c8f45ab81.jpeg',
 'hv5': 'projects/henrietta-sald-24/caf4124c-6237-4ef6-9003-6ca64735fb10.jpeg',
 'hn1': 'projects/henrietta-sald-22-24/fceff412-8268-4a27-8a38-d7c1396e9aab.webp',
 'kv2': 'projects/project-hankin-41/5f4ee02b-d87e-42e1-82f5-8a00a26ca507.jpeg',
 'bv3': 'projects/ben-gurion-17/48b2ea4d-bab7-4812-bfbf-3906f19307e6.jpeg',
}
W, H, M = 1080, 1350, 72

def head(title, bg):
    return f"""<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><title>{title}</title><style>
@font-face{{font-family:'Almoni';src:url(https://www.kurkoos-group.co.il/fonts/almoni-700.woff2) format('woff2');font-weight:700}}
@font-face{{font-family:'Almoni';src:url(https://www.kurkoos-group.co.il/fonts/almoni-400.woff2) format('woff2');font-weight:400}}
@font-face{{font-family:'Almoni';src:url(https://www.kurkoos-group.co.il/fonts/almoni-300.woff2) format('woff2');font-weight:300}}
body{{margin:0}}.page{{position:relative;width:{W}px;height:{H}px;overflow:hidden;background:{bg};font-family:'Almoni',sans-serif;direction:rtl}}
.page *{{box-sizing:border-box}}
</style></head><body>"""

def box(x, y, w, h, bg, op=1, r=0):
    return f'<div style="position:absolute;left:{x}px;top:{y}px;width:{w}px;height:{h}px;background:{bg};opacity:{op};border-radius:{r}px"></div>'

def txt(x, y, w, t, size, weight=400, color=INK, lh=1.2, align='right', ls=0):
    return (f'<div style="position:absolute;left:{x}px;top:{y}px;width:{w}px;font-size:{size}px;font-weight:{weight};'
            f'color:{color};line-height:{lh};text-align:{align};letter-spacing:{ls}px">{t}</div>')

def img(x, y, w, h, k, alt):
    return f'<img src="{B}{P[k]}" alt="{alt}" style="position:absolute;left:{x}px;top:{y}px;width:{w}px;height:{h}px;object-fit:cover">'

def logo(x, y, h, white=True):
    w = round(h * 1045 / 285)
    return f'<img src="{LOGO}logo-{"h-white" if white else "h"}.png" alt="קבוצת קורקוס" style="position:absolute;left:{x}px;top:{y}px;width:{w}px;height:{h}px">'

def foot(dark=True, y=1252):
    c = MIST if dark else TEAL
    return (logo(M, y, 44, white=dark) + txt(W - M - 520, y + 8, 520, 'kurkoos-group.co.il', 24, 400, c, 1.2, 'right', 1))

def page(label, body, bg, title):
    return head(title, bg) + f'<div class="page" data-document-role="page" data-label="{label}">' + body + '</div></body></html>'

T = {}

# 01 · Project cover: full-bleed real photo, navy panel, pill with project
T['t01'] = ('פרויקט · שער', page('פרויקט · שער',
    img(0, 0, W, 900, 'rm1', 'תמונת הפרויקט') + box(0, 860, W, 490, NAVY) + box(W - M - 120, 860, 120, 8, RED)
    + box(W - M - 420, 72, 420, 64, NAVY, .82, 32) + txt(W - M - 420, 85, 420, 'רמח"ל 6-8 · הוד השרון', 30, 700, '#ffffff', 1.2, 'center')
    + txt(M, 930, W - 2 * M, 'בנוי. לא הדמיה.', 32, 700, MIST, 1.2)
    + txt(M, 985, W - 2 * M, 'ככה נראה בית שמסרנו.', 92, 700, '#ffffff', 1.05)
    + txt(M, 1108, W - 2 * M, 'צילום אמיתי מהפרויקט. מקרקע ועד מסירת מפתח.', 34, 400, SOFT, 1.35)
    + foot(True), NAVY, 'קורקוס · פרויקט שער'))

# 02 · Article: paper, category, title, 3 numbered points, photo band, CTA
pts = ['איפה בדיוק נשבר הלוח בשטח', 'איך בונים לוח זמנים שבאמת מחזיק', 'כמה זמן באמת לוקח לבנות בית']
b = txt(M, 88, W - 2 * M, 'מהכתבות באתר · ניהול אתר', 28, 700, RED, 1.2, 'right', 1)
b += txt(M, 140, W - 2 * M, 'למה לוח הזמנים של בית פרטי כמעט תמיד גולש.', 78, 700, NAVY, 1.08)
y = 470
for i, p in enumerate(pts):
    b += box(M, y - 22, W - 2 * M, 2, '#cbd2db') + txt(W - M - 70, y, 70, f'0{i + 1}', 40, 700, TEAL, 1.1)
    b += txt(M, y + 2, W - 2 * M - 100, p, 40, 400, INK, 1.25)
    y += 112
b += img(0, 820, W, 340, 'kv2', 'תמונה מהאתר') + box(0, 1160, W, 190, NAVY)
b += box(W - M - 330, 1080, 330, 72, RED, 1, 36) + txt(W - M - 330, 1097, 330, 'לכתבה המלאה באתר', 30, 700, '#ffffff', 1.2, 'center')
b += foot(True, 1236)
T['t02'] = ('כתבה מהאתר', page('כתבה מהאתר', b, PAPER, 'קורקוס · כתבה'))

# 03 · Numbers: photo strip, 2x2 stats on navy
b = img(0, 0, W, 470, 'hv1', 'תמונה מהאתר') + box(0, 470, W, 880, NAVY)
b += txt(M, 520, W - 2 * M, 'הנרייטה סאלד 22-24 · הוד השרון', 30, 700, MIST, 1.2)
b += txt(M, 570, W - 2 * M, 'הבית במספרים.', 80, 700, '#ffffff', 1.05)
stats = [('380', 'מ"ר מגרש בטאבו'), ('300', 'מ"ר בנוי, שלושה מפלסים'), ('7', 'חדרים, 4 חדרי רחצה'), ('3x6', 'בריכת שחייה, מטר')]
for i, (n, l) in enumerate(stats):
    cx = W - M - (i % 2) * 480 - 420
    cy = 720 + (i // 2) * 230
    b += box(cx, cy, 420, 2, TEAL) + txt(cx, cy + 22, 420, n, 96, 700, '#ffffff', 1) + txt(cx, cy + 132, 420, l, 30, 400, MIST, 1.3)
b += foot(True)
T['t03'] = ('במספרים', page('במספרים', b, NAVY, 'קורקוס · במספרים'))

# 04 · Statement: red, huge type
b = box(W - M - 90, 150, 90, 10, '#ffffff') + txt(M, 200, W - 2 * M, 'קודם קו.<br>אחר כך בית.', 150, 700, '#ffffff', 1.0)
b += txt(M, 580, W - 2 * M - 120, 'כל בית שלנו מתחיל בשרטוט שנבדק פעמיים, ורק אז יוצא לשטח.', 44, 400, '#f7e5e5', 1.35)
b += box(0, 1190, W, 160, NAVY) + foot(True)
T['t04'] = ('אמירה', page('אמירה', b, RED, 'קורקוס · אמירה'))

# 05 · Progress split: two photos, labels
b = img(0, 0, W, 560, 'hv5', 'לפני') + img(0, 580, W, 560, 'hv1', 'אחרי') + box(0, 560, W, 20, PAPER)
b += box(W - M - 260, 470, 260, 64, NAVY, 1, 32) + txt(W - M - 260, 484, 260, 'עבודות עפר', 30, 700, '#ffffff', 1.2, 'center')
b += box(W - M - 260, 1050, 260, 64, RED, 1, 32) + txt(W - M - 260, 1064, 260, 'שלד', 30, 700, '#ffffff', 1.2, 'center')
b += box(0, 1140, W, 210, NAVY) + txt(M, 1162, W - 2 * M, 'הנרייטה סאלד. אותו מגרש, כמה חודשים אחרי.', 40, 700, '#ffffff', 1.2) + foot(True, 1262)
T['t05'] = ('מהמגרש לשלד', page('מהמגרש לשלד', b, PAPER, 'קורקוס · לפני ואחרי'))

# 06 · Checklist
items = ['מה נכנס לתקופת הבדק', 'כמה זמן יש לקבלן לתקן', 'למה פניות לבדק לא נענות', 'מה עושים ביום המסירה', 'שורה תחתונה מהשטח']
b = box(0, 0, W, 16, RED) + txt(M, 96, W - 2 * M, 'צ\'קליסט · שמרו את הפוסט', 28, 700, RED, 1.2, 'right', 1)
b += txt(M, 148, W - 2 * M, 'שירות אחרי מסירה. מה הקבלן חייב לתקן.', 76, 700, NAVY, 1.08)
y = 470
for it in items:
    b += box(W - M - 56, y, 56, 56, TEAL, 1, 12) + txt(W - M - 56, y + 6, 56, '✓', 36, 700, '#ffffff', 1.2, 'center')
    b += txt(M, y + 6, W - 2 * M - 90, it, 42, 400, INK, 1.2)
    y += 112
b += box(0, 1150, W, 200, NAVY) + txt(M, 1170, W - 2 * M, 'כל הפירוט בכתבה המלאה באתר', 34, 700, '#ffffff', 1.2) + foot(True, 1244)
T['t06'] = ('צ\'קליסט', page('צ\'קליסט', b, PAPER, 'קורקוס · צקליסט'))

# 07 · Render: full-bleed render with the mandatory "הדמיה" tag and spec card
b = img(0, 0, W, H, 'hn1', 'הדמיה') + box(0, 0, W, H, NAVY, .18)
b += box(M, 72, 150, 56, '#ffffff', .92, 28) + txt(M, 83, 150, 'הדמיה', 28, 700, NAVY, 1.2, 'center')
b += box(M, 820, W - 2 * M, 440, NAVY, .94, 22)
b += txt(M + 48, 860, W - 2 * M - 96, 'הנרייטה סאלד 22-24 · מערב הוד השרון', 30, 700, MIST, 1.2)
b += txt(M + 48, 910, W - 2 * M - 96, 'מיני שכונה פרטית. ארבעה בתים.', 64, 700, '#ffffff', 1.1)
specs = ['380 מ"ר בטאבו', 'כ-300 מ"ר בנוי', 'בריכה 3x6']
for i, s in enumerate(specs):
    x = W - M - 48 - (i + 1) * 290 + 20
    b += box(x, 1080, 270, 2, TEAL) + txt(x, 1098, 270, s, 32, 700, '#ffffff', 1.2)
b += logo(M + 48, 1176, 40, True)
T['t07'] = ('הדמיה · פרויקט', page('הדמיה · פרויקט', b, NAVY, 'קורקוס · הדמיה'))

# 08 · Site log: photo with date stamp and three log lines on paper
b = img(M, M, W - 2 * M, 640, 'kv2', 'יומן אתר') + box(W - M - 300, M + 560, 300, 80, RED)
b += txt(W - M - 300, M + 580, 300, 'יומן אתר', 36, 700, '#ffffff', 1.2, 'center')
b += txt(M, 770, W - 2 * M, 'חנקין 41 · מגדיאל, הוד השרון', 30, 700, TEAL, 1.2)
b += txt(M, 820, W - 2 * M, 'מה קורה השבוע באתר.', 72, 700, NAVY, 1.08)
logs = ['שלד · מרתף ותבניות', 'בניין בוטיק · שש דירות', 'חניון תת קרקעי · שתי חניות לדירה']
y = 950
for l in logs:
    b += box(W - M - 14, y + 16, 14, 14, RED, 1, 7) + txt(M, y, W - 2 * M - 40, l, 36, 400, INK, 1.3)
    y += 70
b += box(0, 1210, W, 140, NAVY) + foot(True, 1256)
T['t08'] = ('יומן אתר', page('יומן אתר', b, PAPER, 'קורקוס · יומן אתר'))

# Brand board (guidelines page)
sw = [(NAVY, 'Navy', '#07293a', '#fff'), (TEAL, 'Teal', '#105572', '#fff'), (MIST, 'Mist', '#8fb6c8', NAVY), (PAPER, 'Paper', '#f7f8fa', NAVY), (RED, 'Kurkoos Red', '#a90b0c', '#fff')]
b = txt(M, 80, W - 2 * M, 'מדריך מותג · קבוצת קורקוס', 30, 700, RED, 1.2) + txt(M, 130, W - 2 * M, 'מקרקע ועד מסירת מפתח.', 76, 700, NAVY, 1.05)
b += logo(M, 260, 110, False)
for i, (c, n, h, fc) in enumerate(sw):
    x = W - M - (i + 1) * 184 + 8
    b += box(x - 2, 438, 180, 224, '#cbd2db', 1, 16) + box(x, 440, 176, 220, c, 1, 14) + txt(x + 16, 590, 150, n, 24, 700, fc, 1.1) + txt(x + 16, 620, 150, h, 22, 400, fc, 1.1)
b += box(x, 440, 0, 0, PAPER)
b += txt(M, 710, W - 2 * M, 'אלמוני Almoni · פונט אחד לכל המותג', 30, 700, TEAL, 1.2)
b += txt(M, 760, W - 2 * M, 'כותרת 700', 84, 700, NAVY, 1.05) + txt(M, 860, W - 2 * M, 'טקסט גוף 400. משפטים קצרים, גוף ראשון רבים, פרט קונקרטי אחד בכל פוסט.', 34, 400, INK, 1.35)
rules = ['צילום אמיתי קודם להדמיה. הדמיה תמיד מסומנת "הדמיה".', 'בלי מקפים כסימן פיסוק, בלי שמות עובדים, בלי פורטרטים.', 'אדום רק להדגשה אחת בפוסט: תגית, פס או כפתור.']
y = 990
for r in rules:
    b += box(W - M - 12, y + 14, 12, 12, RED, 1, 6) + txt(M, y, W - 2 * M - 36, r, 30, 400, INK, 1.3)
    y += 62
b += box(0, 1210, W, 140, NAVY) + foot(True, 1256)
T['b00'] = ('מדריך מותג', page('מדריך מותג', b, PAPER, 'קורקוס · מדריך מותג'))

if __name__ == '__main__':
    import sys
    out = sys.argv[1]
    os.makedirs(out, exist_ok=True)
    for k, (label, html) in T.items():
        open(os.path.join(out, k + '.html'), 'w', encoding='utf-8').write(html)
    print(list(T))
