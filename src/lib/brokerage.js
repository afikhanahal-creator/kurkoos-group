/* ============================================================
   המדריך לרוכש ולמוכר (תיווך ועסקאות) — טעינת כתבות + שכבת CMS.
   זהה במבנה לשאר הטורים. seed מקבצי הקוד + עריכות CMS (brokerage_articles).
   ============================================================ */
import { useMemo, useState, useEffect } from 'react'
import { useSettingKey } from './cms.js'

/* הכתבות נטענות עצלה (chunk נפרד) — התוכן לא נכלל ב-JS הראשי שכל
   גולש מוריד. נטען רק בעמודי הטור, ונשמר במטמון מודול לכל החיים. */
const modules = import.meta.glob('../content/brokerage/*.js')
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

export function getSeedBrokerage() {
  return seed().map((a) => ({ ...a }))
}

function parseOverrides(raw) {
  if (!raw) return []
  try {
    const v = typeof raw === 'string' ? JSON.parse(raw) : raw
    return Array.isArray(v) ? v : []
  } catch { return [] }
}

export function mergeBrokerage(overridesRaw) {
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

export function useBrokerage() {
  const overrides = useSettingKey('brokerage_articles')
  const seedList = useSeed()
  return useMemo(() => publishedSorted(mergeBrokerage(overrides)), [overrides])
}

export function useBrokerageArticle(slug) {
  const overrides = useSettingKey('brokerage_articles')
  const seedList = useSeed()
  return useMemo(() => {
    const a = mergeBrokerage(overrides).find((x) => x.slug === slug)
    return a && !a.deleted ? a : null
  }, [overrides, seedList, slug])
}

export function getCategoriesFrom(list) {
  return [...new Set((list || []).map((a) => a.category).filter(Boolean))]
}
