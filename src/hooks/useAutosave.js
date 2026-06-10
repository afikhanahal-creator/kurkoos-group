import { useEffect, useRef, useState, useCallback } from 'react'

/* ============================================================
   useAutosave — שמירה אוטומטית עם debounce + מעקב מצב (dirty)
   + אזהרת יציאה כשיש שינויים שלא נשמרו.
   החזרה: { status, isDirty, saveNow }
     status: 'idle' | 'saving' | 'saved' | 'error'
   ============================================================ */
export default function useAutosave(value, onSave, { delay = 1500, enabled = true } = {}) {
  const [status, setStatus] = useState('idle')
  const [isDirty, setIsDirty] = useState(false)
  const firstRender = useRef(true)
  const timer = useRef(null)
  const onSaveRef = useRef(onSave)
  onSaveRef.current = onSave

  const run = useCallback(async (val) => {
    setStatus('saving')
    try {
      await onSaveRef.current(val)
      setStatus('saved')
      setIsDirty(false)
      setTimeout(() => setStatus((s) => (s === 'saved' ? 'idle' : s)), 2000)
    } catch {
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return }
    if (!enabled) return
    setIsDirty(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => run(value), delay)
    return () => clearTimeout(timer.current)
  }, [value, delay, enabled, run])

  // אזהרת יציאה עם שינויים שלא נשמרו
  useEffect(() => {
    const handler = (e) => { if (isDirty) { e.preventDefault(); e.returnValue = '' } }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  const saveNow = useCallback(() => { clearTimeout(timer.current); return run(value) }, [run, value])

  return { status, isDirty, saveNow }
}
