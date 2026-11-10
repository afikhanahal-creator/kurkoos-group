// Test files in the formats Claude does not read directly: a ZIP (an invoice and a newsletter inside), a Word invoice,
// an Excel payment demand and a scanned TIFF. Built here, in memory, with no library: a stored ZIP (DOCX and XLSX are
// ZIPs of XML) and an uncompressed RGB TIFF.
import zlib from 'node:zlib'

/* a ZIP with stored (uncompressed) entries: [{ name, data }] */
export function zipOf(entries) {
  const locals = []; const centrals = []; let off = 0
  for (const e of entries) {
    const name = Buffer.from(e.name, 'utf8'); const data = Buffer.isBuffer(e.data) ? e.data : Buffer.from(e.data, 'utf8'); const crc = zlib.crc32(data)
    const lh = Buffer.alloc(30); lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0x800, 6); lh.writeUInt16LE(0, 8); lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(data.length, 18); lh.writeUInt32LE(data.length, 22); lh.writeUInt16LE(name.length, 26)
    const ch = Buffer.alloc(46); ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(0x800, 8); ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(data.length, 20); ch.writeUInt32LE(data.length, 24); ch.writeUInt16LE(name.length, 28); ch.writeUInt32LE(off, 42)
    locals.push(lh, name, data); centrals.push(ch, name); off += 30 + name.length + data.length
  }
  const cd = Buffer.concat(centrals)
  const end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10); end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(off, 16)
  return Buffer.concat([...locals, cd, end])
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
/* a Word document with these paragraphs */
export const docxOf = (paragraphs) => zipOf([
  { name: '[Content_Types].xml', data: '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>' },
  { name: 'word/document.xml', data: `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraphs.map((p) => `<w:p><w:r><w:t>${esc(p)}</w:t></w:r></w:p>`).join('')}</w:body></w:document>` },
])
/* an Excel workbook with one sheet of these rows (text cells as shared strings, numbers as numbers) */
export function xlsxOf(rows) {
  const strings = []; const idx = (s) => { let i = strings.indexOf(s); if (i < 0) { strings.push(s); i = strings.length - 1 } return i }
  const col = (i) => String.fromCharCode(65 + i)
  const sheet = rows.map((r, y) => `<row r="${y + 1}">${r.map((c, x) => (typeof c === 'number' ? `<c r="${col(x)}${y + 1}"><v>${c}</v></c>` : `<c r="${col(x)}${y + 1}" t="s"><v>${idx(c)}</v></c>`)).join('')}</row>`).join('')
  return zipOf([
    { name: '[Content_Types].xml', data: '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>' },
    { name: 'xl/worksheets/sheet1.xml', data: `<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheet}</sheetData></worksheet>` },
    { name: 'xl/sharedStrings.xml', data: `<?xml version="1.0"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${strings.map((s) => `<si><t>${esc(s)}</t></si>`).join('')}</sst>` },
  ])
}
/* an uncompressed RGB TIFF, w × h, white with dark stripes (a "scan") */
export function tiffOf(w, h) {
  const px = Buffer.alloc(w * h * 3, 255)
  for (let y = 40; y < h - 40; y += 24) for (let x = 30; x < w - 30; x++) for (let k = 0; k < 6; k++) { const i = ((y + k) * w + x) * 3; px[i] = px[i + 1] = px[i + 2] = 40 }
  const tags = [[256, 3, 1, w], [257, 3, 1, h], [258, 3, 3, 0], [259, 3, 1, 1], [262, 3, 1, 2], [273, 4, 1, 0], [277, 3, 1, 3], [278, 3, 1, h], [279, 4, 1, px.length]]
  const ifdOff = 8; const ifdLen = 2 + tags.length * 12 + 4; const bpsOff = ifdOff + ifdLen; const dataOff = bpsOff + 6
  const head = Buffer.alloc(dataOff)
  head.write('II', 0, 'ascii'); head.writeUInt16LE(42, 2); head.writeUInt32LE(ifdOff, 4); head.writeUInt16LE(tags.length, ifdOff)
  tags.forEach(([tag, type, count, value], i) => {
    const o = ifdOff + 2 + i * 12; head.writeUInt16LE(tag, o); head.writeUInt16LE(type, o + 2); head.writeUInt32LE(count, o + 4)
    const v = tag === 258 ? bpsOff : tag === 273 ? dataOff : value
    if (type === 3 && count === 1) head.writeUInt16LE(v, o + 8); else head.writeUInt32LE(v, o + 8)
  })
  head.writeUInt16LE(8, bpsOff); head.writeUInt16LE(8, bpsOff + 2); head.writeUInt16LE(8, bpsOff + 4)
  return Buffer.concat([head, px])
}
