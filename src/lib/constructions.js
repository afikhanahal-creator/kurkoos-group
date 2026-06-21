/* ============================================================
   טור ביצוע ובנייה ("המדריך לתהליך הבנייה") — טעינת כתבות + שכבת CMS.
   זהה במבנה ל-yazamut.js: seed מקבצי הקוד + עריכות CMS (constructions_articles).
   ============================================================ */
import { useMemo } from 'react'
import { useSettings } from './cms.js'

const modules = import.meta.glob('../content/constructions/*.js', { eager: true })
const seed = Object.values(modules).map((m) => m.default).filter(Boolean)

export function getSeedConstructions() {
  return seed.map((a) => ({ ...a }))
}

function parseOverrides(raw) {
  if (!raw) return []
  try {
    const v = typeof raw === 'string' ? JSON.parse(raw) : raw
    return Array.isArray(v) ? v : []
  } catch { return [] }
}

export function mergeConstructions(overridesRaw) {
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

export function useConstructions() {
  const settings = useSettings()
  return useMemo(() => publishedSorted(mergeConstructions(settings.constructions_articles)), [settings.constructions_articles])
}

export function useConstruction(slug) {
  const settings = useSettings()
  return useMemo(() => {
    const a = mergeConstructions(settings.constructions_articles).find((x) => x.slug === slug)
    return a && !a.deleted ? a : null
  }, [settings.constructions_articles, slug])
}

export function getCategoriesFrom(list) {
  return [...new Set((list || []).map((a) => a.category).filter(Boolean))]
}
