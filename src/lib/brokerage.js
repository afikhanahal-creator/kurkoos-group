/* ============================================================
   המדריך לרוכש ולמוכר (תיווך ועסקאות) — טעינת כתבות + שכבת CMS.
   זהה במבנה לשאר הטורים. seed מקבצי הקוד + עריכות CMS (brokerage_articles).
   ============================================================ */
import { useMemo } from 'react'
import { useSettings } from './cms.js'

const modules = import.meta.glob('../content/brokerage/*.js', { eager: true })
const seed = Object.values(modules).map((m) => m.default).filter(Boolean)

export function getSeedBrokerage() {
  return seed.map((a) => ({ ...a }))
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
  seed.forEach((a) => map.set(a.slug, { ...a }))
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
  const settings = useSettings()
  return useMemo(() => publishedSorted(mergeBrokerage(settings.brokerage_articles)), [settings.brokerage_articles])
}

export function useBrokerageArticle(slug) {
  const settings = useSettings()
  return useMemo(() => {
    const a = mergeBrokerage(settings.brokerage_articles).find((x) => x.slug === slug)
    return a && !a.deleted ? a : null
  }, [settings.brokerage_articles, slug])
}

export function getCategoriesFrom(list) {
  return [...new Set((list || []).map((a) => a.category).filter(Boolean))]
}
