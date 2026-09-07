/* ============================================================
   פיקוח פרויקטים — טעינת כתבות + שכבת CMS.
   זהה במבנה ל-yazamut.js / constructions.js. seed מקבצי הקוד + עריכות
   CMS (supervision_articles).
   ============================================================ */
import { useMemo, useState, useEffect } from 'react'
import { useSettingKey } from './cms.js'

/* הכתבות נטענות עצלה (chunk נפרד) — התוכן לא נכלל ב-JS הראשי שכל
   גולש מוריד. נטען רק בעמודי הטור, ונשמר במטמון מודול לכל החיים. */
const modules = import.meta.glob('../content/supervision/*.js')
let seedCache = null
let seedPromise = null
export function loadSeed() {
  if (!seedPromise) {
    seedPromise = Promise.all(Object.values(modules).map((f) => f()))
      .then((ms) => { seedCache = ms.map((m) => m.default).filter(Boolean); return seedCache })
      .catch(() => { seedPromise = null; return seedCache || [] })
  }
  return seedPromise
}
const seed = () => seedCache || []

function useSeed() {
  const [, bump] = useState(0)
  useEffect(() => {
    let on = true
    if (!seedCache) loadSeed().then(() => { if (on) bump((x) => x + 1) })
    return () => { on = false }
  }, [])
  return seed()
}

export function getSeedSupervision() {
  return seed().map((a) => ({ ...a }))
}

function parseOverrides(raw) {
  if (!raw) return []
  try {
    const v = typeof raw === 'string' ? JSON.parse(raw) : raw
    return Array.isArray(v) ? v : []
  } catch { return [] }
}

export function mergeSupervision(overridesRaw) {
  const map = new Map()
  seed().forEach((a) => map.set(a.slug, { ...a }))
  parseOverrides(overridesRaw).forEach((a) => {
    if (a && a.slug) map.set(a.slug, { ...(map.get(a.slug) || {}), ...a })
  })
  return [...map.values()]
}

function publishedSorted(list) {
  const now = Date.now()
  return list
    .filter((a) => a.published !== false && !a.archived && !a.deleted && new Date(a.date).getTime() <= now)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
}

export function useSupervision() {
  const overrides = useSettingKey('supervision_articles')
  const seedList = useSeed()
  return useMemo(() => publishedSorted(mergeSupervision(overrides)), [overrides, seedList])
}

export function useSupervisionArticle(slug) {
  const overrides = useSettingKey('supervision_articles')
  const seedList = useSeed()
  return useMemo(() => {
    const a = mergeSupervision(overrides).find((x) => x.slug === slug)
    return a && !a.deleted ? a : null
  }, [overrides, seedList, slug])
}

export function getCategoriesFrom(list) {
  return [...new Set((list || []).map((a) => a.category).filter(Boolean))]
}
