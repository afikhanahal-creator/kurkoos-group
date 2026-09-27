import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import { createLinker } from './autoLink.jsx'

/* ============================================================
   רנדרר Markdown מינימלי לגוף הכתבות (בלי תלות חיצונית).
   תומך: ## / ### כותרות, פסקאות, **מודגש**, ציטוט "> ", רשימות "- ",
   וקישורים [טקסט](/נתיב). בלי תמיכה בקישורים הקורא ראה סוגריים וכתובות
   באנגלית באמצע משפט בעברית.
   ============================================================ */

const LINK_RE = /(\[[^\]]+\]\([^)\s]+\))/g

function renderLink(label, href, key, contactHref) {
  // קישור לטופס מקבל את ייחוס הטור, כדי שבאדמין יראו מאיזו כתבה הגיע הליד
  if (contactHref && /^\/contact\/?$/.test(href)) href = contactHref
  if (/^https?:\/\//.test(href)) {
    return <a key={key} className="mdx__auto-link" href={href} target="_blank" rel="noopener noreferrer">{label}</a>
  }
  if (href.startsWith('/')) return <Link key={key} className="mdx__auto-link" to={href}>{label}</Link>
  return <Fragment key={key}>{label}</Fragment>
}

function renderText(text, keyBase, linkify, contactHref) {
  return text.split(LINK_RE).map((p, i) => {
    const key = `${keyBase}-${i}`
    const m = p.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/)
    if (m) return renderLink(m[1], m[2], key, contactHref)
    // קישור אוטומטי למילון/למחשבונים, רק בטקסט רגיל ורק אם יש התאמה
    const linked = linkify && p ? linkify(p, key) : null
    if (linked) return linked
    return <Fragment key={key}>{p}</Fragment>
  })
}

function renderInline(text, keyBase, linkify, contactHref) {
  // **מודגש**
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) {
      return <strong key={`${keyBase}-b${i}`}>{renderText(p.slice(2, -2), `${keyBase}-b${i}`, null, contactHref)}</strong>
    }
    return <Fragment key={`${keyBase}-t${i}`}>{renderText(p, `${keyBase}-t${i}`, linkify, contactHref)}</Fragment>
  })
}

export default function MiniMarkdown({ source = '', className = '', autoLink = false, contactHref = '' }) {
  /* מקשר מונחים למילון ולמחשבונים. פעיל רק כשמבקשים, כדי שטקסט קצר
     במקומות אחרים באתר לא יקבל קישורים שלא במקומם. */
  const linkify = autoLink ? createLinker() : null
  const lines = String(source).replace(/\r\n/g, '\n').split('\n')
  const blocks = []
  let para = []
  let list = []

  const flushPara = () => {
    if (para.length) {
      const text = para.join(' ').trim()
      if (text) blocks.push({ type: 'p', text })
      para = []
    }
  }
  const flushList = () => {
    if (list.length) {
      blocks.push({ type: 'ul', items: list.slice() })
      list = []
    }
  }

  lines.forEach((raw) => {
    const line = raw.trim()
    if (!line) { flushPara(); flushList(); return }
    if (line.startsWith('### ')) { flushPara(); flushList(); blocks.push({ type: 'h3', text: line.slice(4) }); return }
    if (line.startsWith('## ')) { flushPara(); flushList(); blocks.push({ type: 'h2', text: line.slice(3) }); return }
    if (line.startsWith('> ')) { flushPara(); flushList(); blocks.push({ type: 'quote', text: line.slice(2) }); return }
    if (line.startsWith('- ')) { flushPara(); list.push(line.slice(2)); return }
    flushList()
    para.push(line)
  })
  flushPara()
  flushList()

  return (
    <div className={`mdx ${className}`}>
      {blocks.map((b, i) => {
        if (b.type === 'h2') return <h2 key={i}>{renderInline(b.text, i, null, contactHref)}</h2>
        if (b.type === 'h3') return <h3 key={i}>{renderInline(b.text, i, null, contactHref)}</h3>
        if (b.type === 'quote') return <blockquote key={i}>{renderInline(b.text, i, null, contactHref)}</blockquote>
        if (b.type === 'ul') return <ul key={i}>{b.items.map((it, j) => <li key={j}>{renderInline(it, `${i}-${j}`, linkify, contactHref)}</li>)}</ul>
        return <p key={i}>{renderInline(b.text, i, linkify, contactHref)}</p>
      })}
    </div>
  )
}
