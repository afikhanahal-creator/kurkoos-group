import { Fragment } from 'react'

/* ============================================================
   רנדרר Markdown מינימלי לגוף הכתבות (בלי תלות חיצונית).
   תומך: ## / ### כותרות, פסקאות, **מודגש**, ציטוט "> ", רשימות "- ".
   מספיק לפורמט שהסוכן מייצר; שומר RTL ופשטות.
   ============================================================ */

function renderInline(text, keyBase) {
  // **מודגש**
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) {
      return <strong key={`${keyBase}-b${i}`}>{p.slice(2, -2)}</strong>
    }
    return <Fragment key={`${keyBase}-t${i}`}>{p}</Fragment>
  })
}

export default function MiniMarkdown({ source = '', className = '' }) {
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
        if (b.type === 'h2') return <h2 key={i}>{renderInline(b.text, i)}</h2>
        if (b.type === 'h3') return <h3 key={i}>{renderInline(b.text, i)}</h3>
        if (b.type === 'quote') return <blockquote key={i}>{renderInline(b.text, i)}</blockquote>
        if (b.type === 'ul') return <ul key={i}>{b.items.map((it, j) => <li key={j}>{renderInline(it, `${i}-${j}`)}</li>)}</ul>
        return <p key={i}>{renderInline(b.text, i)}</p>
      })}
    </div>
  )
}
