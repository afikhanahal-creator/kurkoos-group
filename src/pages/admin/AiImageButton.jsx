import { useState } from 'react'
import { uploadMedia } from '../../lib/cms.js'
import { toast } from '../../lib/toast.js'

/* כפתור "ייצר תמונה ב-AI": שולח prompt ל-/api/generate-image (OpenAI),
   מקבל PNG ב-base64, מעלה ל-Supabase Storage דרך uploadMedia, ומחזיר את
   הכתובת ל-onImage כדי לשמור אותה ככריכת הכתבה. */
export default function AiImageButton({ promptText, folder = 'ai', onImage }) {
  const [busy, setBusy] = useState(false)

  const run = async () => {
    if (!promptText) { toast.error('הוסיפו כותרת/תיאור לכתבה לפני יצירת תמונה'); return }
    setBusy(true)
    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptText }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.b64) throw new Error(data.error || 'יצירת התמונה נכשלה')

      // base64 -> File
      const bin = atob(data.b64)
      const arr = new Uint8Array(bin.length)
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
      const file = new File([arr], `ai-${Date.now()}.png`, { type: 'image/png' })

      const url = await uploadMedia(file, folder)
      onImage(url)
      toast.success('התמונה נוצרה והועלתה ככריכה')
    } catch (e) {
      toast.error('AI: ' + (e.message || e))
    } finally { setBusy(false) }
  }

  return (
    <button type="button" className="yzt-btn yzt-btn--ai" onClick={run} disabled={busy}>
      {busy ? '⏳ מייצר תמונה…' : '✨ ייצר תמונה ב-AI'}
    </button>
  )
}
