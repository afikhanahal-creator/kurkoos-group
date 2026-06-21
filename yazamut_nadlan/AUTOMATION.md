# ⚙️ פרסום אוטומטי כל יום ראשון ב-8:00 — איך זה באמת עובד

## נקודת אמת קודם

אני (Claude בצ'אט) **לא יכול לרוץ לבד כל יום ראשון ב-8:00**. אין לי טיימר, אין לי גישה ישירה ל-repo או ל-CMS שלך, ואני לא מריץ משימות מתוזמנות ברקע. מי שמבטיח לך "אני אעלה כתבה כל ראשון אוטומטית" — מוכר לך משהו שלא קיים.

מה **כן** קיים: סיפקתי לך את כל החלקים — הסוכן (הפרומפט), 3 כתבות מוכנות, 3 תמונות, ולוח נושאים. נשאר רק לחבר "טיימר" אמיתי שיריץ את הסוכן וידחוף את הקובץ לאתר. יש לזה שתי דרכים מעשיות. בחר אחת.

---

## אפשרות א' — הכי פשוטה: תזמון פרסום ב-CMS (ידני פעם בשבוע, פרסום אוטומטי)

אם יש לך CMS (גם ה-CMS שאנחנו בונים לקורקוס): פעם בשבוע אתה מריץ את הסוכן, מקבל קובץ MDX, מדביק, **מתזמן** את הפרסום ל-ראשון 8:00.

**איפה:** בצ'אט עם Claude / Claude Code, פעם בשבוע (נניח חמישי).
**מה לכתוב:**
```
כתוב את כתבת יום ראשון הקרוב. התאריך היום: [DATE].
אל תחזור על הנושאים מ-6 השבועות האחרונים: [רשימה].
```
**אחר כך:** מדביק את ה-MDX ל-CMS → שדה תאריך = ראשון 08:00 → "תזמן פרסום".
האתר מציג כתבות רק כש-`date <= now`, אז היא תופיע לבד בזמן.

✅ יתרון: שליטה מלאה, אתה רואה כל כתבה לפני שעולה.
⚠️ חיסרון: דורש 10 דק' ממך פעם בשבוע.

---

## אפשרות ב' — אוטומציה מלאה: GitHub Action + cron (אפס מגע)

ה-repo שלך כבר על Vercel. אפשר להוסיף Action שרץ כל ראשון 8:00, קורא ל-API של Claude עם הפרומפט של הסוכן, שומר קובץ MDX חדש, ו-commit. Vercel מזהה את ה-commit ו-deploy אוטומטית.

> **בטיחות git:** ה-Action עושה `commit` ל-branch ייעודי או ל-main דרך PR — **בלי force-push**, בלי לגעת בהיסטוריה. תואם לעבודה הבטוחה שלך על דיפלוי חי.

**איפה:** קובץ חדש ב-repo בנתיב `.github/workflows/weekly-article.yml`
**מה לכתוב בו:**
```yaml
name: כתבת יום ראשון
on:
  schedule:
    - cron: '0 5 * * 0'   # 05:00 UTC = 08:00 בישראל (קיץ). בחורף: '0 6 * * 0'
  workflow_dispatch: {}    # מאפשר גם הרצה ידנית מהכפתור

permissions:
  contents: write          # רק כתיבה ל-repo, בלי הרשאות מיותרות

jobs:
  write:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm install @anthropic-ai/sdk gray-matter
      - name: ייצר כתבה
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: node scripts/generate-article.mjs
      - name: commit
        run: |
          git config user.name  "Kurkoos Bot"
          git config user.email "bot@kurkoos-group.co.il"
          git add content/blog/
          git commit -m "טור יזמות נדל\"ן — כתבה שבועית" || echo "אין שינוי"
          git push                       # push רגיל ל-branch הנוכחי, ללא --force
```

**ואז צריך סקריפט** `scripts/generate-article.mjs` שקורא ל-API. השלד:
```js
import Anthropic from "@anthropic-ai/sdk";
import { writeFileSync } from "node:fs";

const SYSTEM = `...כאן מדביקים את כל הפרומפט מ-agents/real-estate-development-columnist.md...`;
const client = new Anthropic();              // לוקח ANTHROPIC_API_KEY מהסביבה

const today = new Date().toISOString().slice(0, 10);
const msg = await client.messages.create({
  model: "claude-opus-4-8",                  // או claude-sonnet-4-6 לזול יותר
  max_tokens: 3000,
  system: SYSTEM,
  messages: [{ role: "user",
    content: `כתוב את כתבת יום ראשון. התאריך: ${today}. החזר רק את בלוק ה-MDX.` }],
});

const mdx = msg.content.find(b => b.type === "text").text
            .replace(/^```mdx\n?/, "").replace(/```$/, "").trim();
// חילוץ slug מה-frontmatter לשם הקובץ:
const slug = (mdx.match(/slug:\s*"([^"]+)"/) || [])[1] || today;
writeFileSync(`content/blog/${today}-${slug}.mdx`, mdx);
console.log("נכתב:", slug);
```

**מה שצריך ממך פעם אחת:**
1. ב-GitHub: **Settings → Secrets and variables → Actions → New secret** בשם `ANTHROPIC_API_KEY`.
   🔐 **חשוב:** את מפתח ה-API מדביקים **רק** במסך הזה של GitHub — אף פעם לא בתוך קוד, לא ב-commit, ולא בצ'אט. (זה בדיוק המקום שבו מפתחות נחשפים בטעות.)
2. להחליף בסקריפט את `SYSTEM` בתוכן הפרומפט של הסוכן.
3. להתאים את הנתיב `content/blog/` ושמות שדות ה-frontmatter למבנה האמיתי של האתר.

✅ יתרון: אפס מגע שבועי.
⚠️ חיסרון: לא רואה כתבה לפני שעולה. **המלצה:** הפעל קודם במצב PR (לא push ישיר) כמה שבועות, אשר ידנית, ורק כשאתה בוטח — עבור ל-push אוטומטי.

---

## ההמלצה שלי
התחל ב-**אפשרות א'** (תזמון ב-CMS). היא נותנת לך את הריטם של "כל ראשון 8:00" כבר השבוע, בלי קוד, ועם עין אנושית על כל כתבה — חשוב בהתחלה, כשמכיילים את הקול של הסוכן. אחרי 4–5 שבועות שאתה מרוצה מהאיכות — שדרג ל-**אפשרות ב'** לאוטומציה מלאה.
