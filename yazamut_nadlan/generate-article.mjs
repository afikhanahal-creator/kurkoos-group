// scripts/generate-article.mjs
// מייצר את כתבת יום ראשון: קורא את הפרומפט, מונע חזרה על נושאים אחרונים,
// קורא ל-Claude עם web search, שומר MDX + מייצר תמונת SVG תואמת-מותג.
// ENV נדרש: ANTHROPIC_API_KEY (מגיע מ-GitHub Secrets — לעולם לא בקוד)

import Anthropic from "@anthropic-ai/sdk";
import matter from "gray-matter";
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

// ===== נתיבים — התאם למבנה האמיתי של אתר קורקוס אם שונה =====
const PROMPT_PATH   = "agents/columnist-prompt.md";
const ARTICLES_DIR  = "content/blog";
const IMAGES_DIR    = "public/images/blog";
const MODEL         = "claude-opus-4-8";   // לזול יותר: "claude-sonnet-4-6"

// ===== מותג (זהה לתמונות הקיימות) =====
const C = { ink:"#16202E", paper:"#F5F2EC", brass:"#C9A24B", stone:"#9A9486", line:"#2C3A4D" };

// ---------- שעון ישראל: רץ רק בראשון 08:00 (מטפל בקיץ/חורף לבד) ----------
const force = process.env.FORCE_RUN === "1";   // הרצה ידנית עוקפת את השמירה
const now = new Date();
const il = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Jerusalem", weekday: "short", hour: "2-digit", hour12: false,
}).formatToParts(now);
const wday = il.find(p => p.type === "weekday").value;   // Sun, Mon...
const hour = parseInt(il.find(p => p.type === "hour").value, 10);
const todayIL = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(now); // YYYY-MM-DD

if (!force && (wday !== "Sun" || hour !== 8)) {
  console.log(`לא 08:00 בראשון בישראל (${wday} ${hour}:00) — מדלג.`);
  process.exit(0);
}

// ---------- נושאים שכבר פורסמו ב-6 השבועות האחרונים ----------
function recentArticles() {
  try {
    const files = readdirSync(ARTICLES_DIR).filter(f => f.endsWith(".mdx")).sort().reverse().slice(0, 6);
    return files.map(f => {
      try { return matter(readFileSync(join(ARTICLES_DIR, f), "utf8")).data.title; }
      catch { return f; }
    }).filter(Boolean);
  } catch { return []; }
}
const avoid = recentArticles();

// ---------- קריאה ל-Claude ----------
const system = readFileSync(PROMPT_PATH, "utf8");
const client = new Anthropic(); // קורא ANTHROPIC_API_KEY מהסביבה

const userMsg =
  `כתוב את כתבת יום ראשון. התאריך: ${todayIL}.` +
  (avoid.length ? `\nאל תחזור על הנושאים האלה מהשבועות האחרונים: ${avoid.join(" | ")}.` : "") +
  `\nהחזר אך ורק את בלוק ה-MDX, בלי טקסט מסביב.`;

const res = await client.messages.create({
  model: MODEL,
  max_tokens: 3500,
  system,
  messages: [{ role: "user", content: userMsg }],
  tools: [{ type: "web_search_20250305", name: "web_search" }],
});

const raw = res.content.filter(b => b.type === "text").map(b => b.text).join("\n").trim();
const mdx = raw.replace(/^```(?:mdx|markdown)?\s*/i, "").replace(/```$/i, "").trim();

// ---------- פרסור + שמירה ----------
const { data } = matter(mdx);
const slug = (data.slug || todayIL).toString().trim();
const title = (data.title || "טור יזמות נדל\"ן").toString();
const category = (data.category || "מגמות שוק").toString();

mkdirSync(ARTICLES_DIR, { recursive: true });
mkdirSync(IMAGES_DIR, { recursive: true });

const mdxPath = join(ARTICLES_DIR, `${todayIL}-${slug}.mdx`);
writeFileSync(mdxPath, mdx, "utf8");

writeFileSync(join(IMAGES_DIR, `${slug}.svg`), coverSVG(title, category), "utf8");

console.log(`✓ נכתבה כתבה: ${title}`);
console.log(`  MDX:   ${mdxPath}`);
console.log(`  תמונה: ${join(IMAGES_DIR, slug + ".svg")}`);

// ---------- מחולל תמונת כותרת (קו עיצובי קורקוס) ----------
function coverSVG(title, category) {
  const lines = wrap(title, 22).slice(0, 3);
  const startY = 470 - (lines.length - 1) * 36;
  const tspans = lines.map((l, i) =>
    `<text x="1480" y="${startY + i * 78}" text-anchor="end" direction="rtl" fill="${C.paper}" `
    + `font-family="Heebo,Assistant,Segoe UI,sans-serif" font-weight="800" font-size="60">${esc(l)}</text>`
  ).join("\n");
  return `<svg viewBox="0 0 1600 900" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(title)}">
<!-- KURKOOS PALETTE: ink ${C.ink} | paper ${C.paper} | brass ${C.brass} | stone ${C.stone} | line ${C.line} -->
<rect width="1600" height="900" fill="${C.ink}"/>
<g stroke="${C.line}" stroke-width="1" opacity="0.16">
${gridLines()}
</g>
<line x1="0" y1="760" x2="1600" y2="760" stroke="${C.brass}" stroke-width="3"/>
<!-- מוטיב ארכיטקטוני -->
<rect x="120" y="300" width="170" height="460" fill="${C.paper}" opacity="0.06"/>
<rect x="120" y="560" width="170" height="200" fill="${C.brass}" opacity="0.9"/>
<g stroke="${C.paper}" stroke-width="2" opacity="0.3">
<line x1="120" y1="380" x2="290" y2="380"/><line x1="120" y1="460" x2="290" y2="460"/><line x1="120" y1="540" x2="290" y2="540"/>
</g>
<line x1="1500" y1="60" x2="1500" y2="120" stroke="${C.brass}" stroke-width="4"/>
<text x="1480" y="105" text-anchor="end" direction="rtl" fill="${C.brass}" font-family="Heebo,Assistant,Segoe UI,sans-serif" font-weight="700" letter-spacing="2" font-size="26">${esc(category)} · ${todayIL.slice(0,4)}</text>
${tspans}
<text x="1480" y="850" text-anchor="end" fill="${C.paper}" font-family="Heebo,Assistant,Segoe UI,sans-serif" font-weight="800" letter-spacing="6" font-size="30">KURKOOS</text>
</svg>`;
}
function gridLines() {
  const out = [];
  for (let y = 150; y < 900; y += 150) out.push(`<line x1="0" y1="${y}" x2="1600" y2="${y}"/>`);
  for (let x = 200; x < 1600; x += 200) out.push(`<line x1="${x}" y1="0" x2="${x}" y2="900"/>`);
  return out.join("\n");
}
function wrap(s, max) {
  const words = s.split(/\s+/); const lines = []; let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > max) { if (cur) lines.push(cur); cur = w; }
    else cur = (cur + " " + w).trim();
  }
  if (cur) lines.push(cur);
  return lines;
}
function esc(s){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}
