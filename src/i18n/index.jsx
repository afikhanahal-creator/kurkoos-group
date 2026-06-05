import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import he from './he.js'
import en from './en.js'

const dictionaries = { he, en }
const I18nContext = createContext(null)

const STORAGE_KEY = 'kurkoos-lang'

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(() => {
    if (typeof window === 'undefined') return 'he'
    return localStorage.getItem(STORAGE_KEY) || 'he'
  })

  const dict = dictionaries[lang]

  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = dict.dir
    localStorage.setItem(STORAGE_KEY, lang)
  }, [lang, dict.dir])

  const toggleLang = useCallback(() => {
    setLang((prev) => (prev === 'he' ? 'en' : 'he'))
  }, [])

  // t('hero.title') -> nested lookup
  const t = useCallback(
    (path) => {
      const value = path.split('.').reduce((acc, key) => (acc ? acc[key] : undefined), dict)
      return value ?? path
    },
    [dict]
  )

  return (
    <I18nContext.Provider value={{ lang, dict, t, toggleLang, isRTL: dict.dir === 'rtl' }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}

// Helper to pick a bilingual value from data objects: { he: '...', en: '...' }
export function useLocalized() {
  const { lang } = useI18n()
  return useCallback((obj) => (obj && typeof obj === 'object' ? obj[lang] ?? obj.he : obj), [lang])
}
