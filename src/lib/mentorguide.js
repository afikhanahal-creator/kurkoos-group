/* ============================================================
   המדריך ליזמי נדל"ן צעירים — טעינת כתבות + שכבת CMS.
   מקור 1 (seed): קבצי קוד תחת src/content/mentorguide/*.js.
   מקור 2 (CMS): הגדרה 'mentorguide_articles' (מערך JSON ב-site_settings).
   עריכה גוברת על ה-seed לפי slug, ואפשר גם להוסיף כתבה חדשה.
   כלל פרסום: published !== false, לא archived, לא deleted, ותאריך <= היום.
   ============================================================ */
import { useMemo } from 'react'
import { useSettings } from './cms.js'

const modules = import.meta.glob('../content/mentorguide/*.js', { eager: true })
const seed = Object.values(modules).map((m) => m.default).filter(Boolean)

export function getSeedArticles() {
  return seed.map((a) => ({ ...a }))
}

function parseOverrides(raw) {
  if (!raw) return []
  try {
    const v = typeof raw === 'string' ? JSON.parse(raw) : raw
    return Array.isArray(v) ? v : []
  } catch { return [] }
}

export function mergeArticles(overridesRaw) {
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

export function useMentorGuideArticles() {
  const settings = useSettings()
  return useMemo(() => publishedSorted(mergeArticles(settings.mentorguide_articles)), [settings.mentorguide_articles])
}

export function useMentorGuideArticle(slug) {
  const settings = useSettings()
  return useMemo(() => {
    const a = mergeArticles(settings.mentorguide_articles).find((x) => x.slug === slug)
    return a && !a.deleted ? a : null
  }, [settings.mentorguide_articles, slug])
}

export function getCategoriesFrom(list) {
  return [...new Set((list || []).map((a) => a.category).filter(Boolean))]
}
