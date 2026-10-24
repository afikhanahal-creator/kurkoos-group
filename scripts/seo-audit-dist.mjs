/* Audit of the prerendered HTML in dist/: the same HTML Google receives before JS.
   Usage: node seo-audit-dist.mjs <distDir> <outJson> */
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const [,, dist, out] = process.argv
const pages = []
function walk(dir, rel = '') {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f)
    if (statSync(p).isDirectory()) { if (!['assets', 'engine', 'admin', 'fonts', 'logos', 'execution-gallery'].includes(f)) walk(p, rel + '/' + f) }
    else if (f === 'index.html' && rel !== '') pages.push([rel, p])
    else if (f === 'index.html' && rel === '') pages.push(['/', p])
  }
}
walk(dist)
const pick = (html, re) => (html.match(re) || [])[1] || ''
const dec = (s) => s.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
const rows = []
for (const [path, file] of pages) {
  if (path === '/app-shell') continue
  const html = readFileSync(file, 'utf8')
  const title = dec(pick(html, /<title>([^<]*)<\/title>/))
  const description = dec(pick(html, /<meta name="description" content="([^"]*)"/))
  const canonical = pick(html, /<link rel="canonical" href="([^"]*)"/)
  const robots = pick(html, /<meta name="robots" content="([^"]*)"/)
  const h1s = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/g)].map((m) => dec(m[1].replace(/<[^>]+>/g, '').trim()))
  const h2 = (html.match(/<h2[^>]*>/g) || []).length
  const types = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].flatMap((m) => {
    try { const j = JSON.parse(m[1]); return [].concat(j).flatMap((x) => [].concat(x['@type'] || [])) } catch { return ['INVALID'] }
  })
  const body = pick(html, /<div id="root">([\s\S]*?)<\/div>\s*<script/) || pick(html, /<div id="root">([\s\S]*)$/)
  const text = body.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  const words = text ? text.split(' ').length : 0
  const links = [...body.matchAll(/href="(\/[^"#?]*)/g)].map((m) => m[1])
  const og = pick(html, /<meta property="og:image" content="([^"]*)"/)
  rows.push({ url: 'https://www.kurkoos-group.co.il' + path, path, title, titleLen: title.length, description, descLen: description.length, canonical, robots, h1: h1s, h2, schema: [...new Set(types)], words, internalLinks: [...new Set(links)].length, og })
}
rows.sort((a, b) => a.path.localeCompare(b.path))
writeFileSync(out, JSON.stringify(rows, null, 1))
const bad = (label, f) => { const r = rows.filter(f); if (r.length) console.log(`${label}: ${r.length}\n  ` + r.map((x) => `${x.path} (${x.titleLen}/${x.descLen}/${x.words}w)`).join('\n  ')) }
console.log('pages:', rows.length)
bad('title > 60', (r) => r.titleLen > 60)
bad('title duplicate', (r) => rows.filter((x) => x.title === r.title).length > 1)
bad('desc < 110 or > 160', (r) => r.descLen < 110 || r.descLen > 160)
bad('desc duplicate', (r) => rows.filter((x) => x.description === r.description).length > 1)
bad('no canonical or mismatched', (r) => r.canonical !== r.url)
bad('h1 count != 1', (r) => r.h1.length !== 1)
bad('words < 300', (r) => r.words < 300)
bad('invalid json-ld', (r) => r.schema.includes('INVALID'))
bad('no breadcrumb schema', (r) => !r.schema.includes('BreadcrumbList') && r.path !== '/')
bad('internal links < 5', (r) => r.internalLinks < 5)
