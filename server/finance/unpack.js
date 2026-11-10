// Attachment processor: the formats Claude does not read directly become something it does, without losing the original.
//   ZIP   → the files inside (a ZIP inside a ZIP once more), with limits against a "zip bomb"
//   DOCX  → the text of the document (paragraphs and table cells)
//   XLSX  → the cells of every sheet, one row per line
//   TIFF  → the first pages as PNG (scanners and faxes send TIFF; Claude reads PNG)
// Only Node's own zlib for ZIP/DOCX/XLSX; TIFF decoding uses utif (MIT, pure JS).
import zlib from 'node:zlib'
import UTIF from 'utif'

export const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
export const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
export const ZIP = 'application/zip'
export const TIFF = 'image/tiff'
const LIMITS = { entries: 50, total: 30 * 1024 * 1024, depth: 2 }

/* the entries of a ZIP: [{ name, data }]. Stored and deflated entries; encrypted ones and folders are left out. */
export function unzip(buf, { maxEntries = LIMITS.entries, maxTotal = LIMITS.total } = {}) {
  // the end-of-central-directory record is in the last 64 KB
  let eocd = -1
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65_557); i--) if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break }
  if (eocd < 0) throw new Error('not a zip')
  const count = buf.readUInt16LE(eocd + 10)
  let p = buf.readUInt32LE(eocd + 16)
  const out = []; let total = 0
  for (let n = 0; n < count && out.length < maxEntries; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) break
    const flags = buf.readUInt16LE(p + 8); const method = buf.readUInt16LE(p + 10)
    const csize = buf.readUInt32LE(p + 20); const usize = buf.readUInt32LE(p + 24)
    const nlen = buf.readUInt16LE(p + 28); const xlen = buf.readUInt16LE(p + 30); const clen = buf.readUInt16LE(p + 32)
    const local = buf.readUInt32LE(p + 42)
    const name = buf.slice(p + 46, p + 46 + nlen).toString(flags & 0x800 ? 'utf8' : 'latin1')
    p += 46 + nlen + xlen + clen
    if (name.endsWith('/') || flags & 0x1 || name.startsWith('__MACOSX/')) continue
    if (total + usize > maxTotal) break
    const lnlen = buf.readUInt16LE(local + 26); const lxlen = buf.readUInt16LE(local + 28)
    const raw = buf.slice(local + 30 + lnlen + lxlen, local + 30 + lnlen + lxlen + csize)
    let data
    try { data = method === 0 ? Buffer.from(raw) : method === 8 ? zlib.inflateRawSync(raw, { maxOutputLength: Math.max(1, maxTotal - total) }) : null } catch { data = null }
    if (!data) continue
    total += data.length
    out.push({ name, data })
  }
  return out
}

const decode = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/&amp;/g, '&')

/* the words of a Word document, paragraph by paragraph */
export function docxText(buf) {
  const xml = unzip(buf).find((e) => e.name === 'word/document.xml')?.data.toString('utf8') || ''
  return decode(xml.replace(/<w:tab\/>/g, '\t').replace(/<\/w:p>/g, '\n').replace(/<\/w:tc>/g, '\t').replace(/<[^>]+>/g, '')).replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
}

/* every sheet of an Excel file, one row per line, cells separated by a tab */
export function xlsxText(buf) {
  const files = unzip(buf)
  const get = (n) => files.find((e) => e.name === n)?.data.toString('utf8') || ''
  const shared = [...get('xl/sharedStrings.xml').matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => decode(m[1].replace(/<[^>]+>/g, '')))
  const out = []
  for (const f of files.filter((e) => /^xl\/worksheets\/sheet\d+\.xml$/.test(e.name)).sort((a, b) => a.name.localeCompare(b.name, 'en', { numeric: true }))) {
    out.push(`--- ${f.name.replace(/^.*\//, '').replace('.xml', '')} ---`)
    for (const row of f.data.toString('utf8').matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
      const cells = [...row[1].matchAll(/<c([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)].map((c) => {
        const attrs = c[1]; const body = c[2] || ''
        const v = body.match(/<v>([\s\S]*?)<\/v>/)?.[1]; const inline = body.match(/<t[^>]*>([\s\S]*?)<\/t>/)?.[1]
        if (/t="s"/.test(attrs) && v != null) return shared[Number(v)] ?? ''
        return decode(inline ?? v ?? '')
      })
      if (cells.some((c) => c !== '')) out.push(cells.join('\t'))
    }
  }
  return out.join('\n').trim()
}

// ---------- TIFF → PNG ----------
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0 } return t })()
const crc32 = (b) => { let c = 0xffffffff; for (const x of b) c = CRC[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0 }
const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type, 'ascii'), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, c]) }
function pngOf(rgba, w, h) {
  const raw = Buffer.alloc((w * 3 + 1) * h)   // RGB, no alpha: a scan is opaque
  for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; for (let x = 0; x < w; x++) { const s = (y * w + x) * 4; const d = y * (w * 3 + 1) + 1 + x * 3; raw[d] = rgba[s]; raw[d + 1] = rgba[s + 1]; raw[d + 2] = rgba[s + 2] } }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 6 })), chunk('IEND', Buffer.alloc(0))])
}
/* the first page of a TIFF as a PNG, scaled down to at most 2000 px on the long side (Claude's useful resolution) */
export function tiffToPng(buf) {
  const ifds = UTIF.decode(buf)
  const page = ifds[0]
  UTIF.decodeImage(buf, page)
  let w = page.width; let h = page.height
  let rgba = UTIF.toRGBA8(page)
  const scale = Math.min(1, 2000 / Math.max(w, h))
  if (scale < 1) {
    const nw = Math.round(w * scale); const nh = Math.round(h * scale); const out = new Uint8Array(nw * nh * 4)
    for (let y = 0; y < nh; y++) for (let x = 0; x < nw; x++) { const s = (Math.floor(y / scale) * w + Math.floor(x / scale)) * 4; const d = (y * nw + x) * 4; out[d] = rgba[s]; out[d + 1] = rgba[s + 1]; out[d + 2] = rgba[s + 2]; out[d + 3] = 255 }
    rgba = out; w = nw; h = nh
  }
  return { png: pngOf(rgba, w, h), pages: ifds.length }
}

const EXT = { pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', tif: TIFF, tiff: TIFF, zip: ZIP, docx: DOCX, xlsx: XLSX }
export const mimeByName = (name) => EXT[String(name).toLowerCase().split('.').pop()] || null

/* an attachment as the files to consider: a ZIP opens into its files (once more for a ZIP inside), everything else
   stays one file. Each file: { name, mime, data } */
export function expand(name, mime, data, depth = 0) {
  if (mime !== ZIP) return [{ name, mime, data }]
  if (depth >= LIMITS.depth) return []
  let entries = []
  try { entries = unzip(data) } catch { return [] }
  return entries.flatMap((e) => { const m = mimeByName(e.name); return m ? expand(`${name} › ${e.name.split('/').pop()}`, m, e.data, depth + 1) : [] })
}

/* what Claude reads for a stored file: the file itself (PDF, image), a PNG of a TIFF, or the text of Word / Excel */
export function readable(mime, data) {
  if (mime === TIFF) { const { png, pages } = tiffToPng(data); return { buf: png, mime: 'image/png', note: pages > 1 ? `TIFF with ${pages} pages; the first page is shown` : '' } }
  if (mime === DOCX) return { text: docxText(data).slice(0, 40_000) }
  if (mime === XLSX) return { text: xlsxText(data).slice(0, 40_000) }
  return { buf: data, mime }
}
