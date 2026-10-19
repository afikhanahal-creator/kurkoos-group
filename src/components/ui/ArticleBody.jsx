import MiniMarkdown from '../../lib/miniMarkdown.jsx'
import SmartImage from './SmartImage.jsx'
import './ArticleBody.css'

/* ============================================================
   גוף הכתבה. בלי תמונות נוספות: בדיוק כמו קודם, MiniMarkdown אחד.
   עם תמונות (שהועלו ב"כל הכתבות" בניהול): הגוף מתחלק לפי כותרות
   המשנה (##), והתמונות משתלבות ביניהן במרווחים שווים, כמו בכתבת
   מגזין. תמונה ראשונה ברוחב מלא, ואחריה לסירוגין לצד הטקסט.
   ============================================================ */
export default function ArticleBody({ article, contactHref }) {
  const images = (Array.isArray(article.images) ? article.images : []).filter((x) => x && x.url)
  if (!images.length) return <MiniMarkdown source={article.body} autoLink contactHref={contactHref} />

  // מחלקים לפני כל כותרת ##, כך שכל חלק מתחיל בכותרת שלו
  const parts = String(article.body || '').split(/\n(?=## )/)
  // מיקום כל תמונה: אחרי איזה חלק, בפיזור שווה (לא אחרי החלק האחרון)
  const slots = Math.max(1, parts.length - 1)
  const at = images.map((_, i) => Math.min(slots, Math.round(((i + 1) * (slots + 1)) / (images.length + 1))))
  return (
    <>
      {parts.map((src, i) => (
        <div key={i} className="artb__part">
          <MiniMarkdown source={src} autoLink={i === 0} contactHref={contactHref} />
          {images.map((im, j) => (at[j] === i + 1 && i < parts.length - 1) || (parts.length === 1 && i === 0) ? (
            <figure key={im.url} className={`artb__fig${j % 3 === 0 ? ' artb__fig--wide' : ''}`}>
              <SmartImage src={im.url} alt={im.alt || ''} label={im.alt || article.title} w={1400} sizes="(max-width: 760px) 100vw, 760px" />
              {im.alt ? <figcaption>{im.alt}</figcaption> : null}
            </figure>
          ) : null)}
        </div>
      ))}
    </>
  )
}
