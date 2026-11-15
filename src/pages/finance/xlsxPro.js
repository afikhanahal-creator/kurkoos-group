// A styled .xlsx (Office Open XML) without a library, for the browser and the server: the accountant's report.
// On top of xlsx.js (plain tables) this one gives every cell its own look (fill, font colour, bold, border, alignment,
// number format), right-to-left sheets, frozen header rows, filters, merged title cells, drop-down lists, formulas with
// their value kept beside them, and links to the original documents. Text is UTF-8, so Hebrew is stored as it is.
import { zipBytes } from './xlsx.js'

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
export const colName = (i) => { let s = ''; i += 1; while (i) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26) } return s }
const serial = (iso) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || '')); if (!m) return null; return Math.round((Date.UTC(+m[1], +m[2] - 1, +m[3]) - Date.UTC(1899, 11, 30)) / 86400000) }
const argb = (hex) => `FF${String(hex).replace('#', '').toUpperCase().padStart(6, '0')}`

export const FMT = { money: '#,##0.00', date: 'dd/mm/yyyy', pct: '0.##%', int: '#,##0', rate: '0.0000' }
// money with its currency sign after the number (the sign follows the digits in a right-to-left sheet)
export const moneyFmt = (cur) => ({ ILS: '#,##0.00 "₪"', USD: '#,##0.00 "$"', EUR: '#,##0.00 "€"', GBP: '#,##0.00 "£"' })[cur || 'ILS'] || `#,##0.00 "${String(cur).replace(/[^A-Za-z]/g, '').slice(0, 3)}"`

/* one style table for the workbook: equal looks share an id */
function styleBook() {
  const fonts = ['<font><sz val="11"/><name val="Arial"/><family val="2"/></font>']; const fills = ['<fill><patternFill patternType="none"/></fill>', '<fill><patternFill patternType="gray125"/></fill>']
  const borders = ['<border><left/><right/><top/><bottom/><diagonal/></border>']; const fmts = []; const xfs = []; const key = new Map()
  const idx = (list, xml) => { let i = list.indexOf(xml); if (i < 0) { list.push(xml); i = list.length - 1 } return i }
  const id = (c) => {
    const k = [c.fmt || '', c.bold ? 1 : 0, c.italic ? 1 : 0, c.underline ? 1 : 0, c.color || '', c.size || '', c.fill || '', c.border || '', c.align || '', c.wrap ? 1 : 0, c.valign || ''].join('|')
    if (key.has(k)) return key.get(k)
    const font = idx(fonts, `<font>${c.bold ? '<b/>' : ''}${c.italic ? '<i/>' : ''}${c.underline ? '<u/>' : ''}<sz val="${c.size || 11}"/>${c.color ? `<color rgb="${argb(c.color)}"/>` : ''}<name val="Arial"/><family val="2"/></font>`)
    const fill = c.fill ? idx(fills, `<fill><patternFill patternType="solid"><fgColor rgb="${argb(c.fill)}"/><bgColor indexed="64"/></patternFill></fill>`) : 0
    const side = (n) => `<${n} style="thin"><color rgb="${argb(c.border)}"/></${n}>`
    const border = c.border ? idx(borders, `<border>${side('left')}${side('right')}${side('top')}${side('bottom')}<diagonal/></border>`) : 0
    let numFmt = 0
    if (c.fmt) { let i = fmts.indexOf(c.fmt); if (i < 0) { fmts.push(c.fmt); i = fmts.length - 1 } numFmt = 164 + i }
    const xml = `<xf numFmtId="${numFmt}" fontId="${font}" fillId="${fill}" borderId="${border}" xfId="0"${numFmt ? ' applyNumberFormat="1"' : ''} applyFont="1"${fill ? ' applyFill="1"' : ''}${border ? ' applyBorder="1"' : ''} applyAlignment="1"><alignment horizontal="${c.align || 'right'}" vertical="${c.valign || 'center'}"${c.wrap ? ' wrapText="1"' : ''} readingOrder="2"/></xf>`
    xfs.push(xml); key.set(k, xfs.length - 1)
    return xfs.length - 1
  }
  id({})   // style 0: plain, right-aligned, right-to-left reading order
  const xml = () => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
${fmts.length ? `<numFmts count="${fmts.length}">${fmts.map((f, i) => `<numFmt numFmtId="${164 + i}" formatCode="${esc(f)}"/>`).join('')}</numFmts>` : ''}
<fonts count="${fonts.length}">${fonts.join('')}</fonts><fills count="${fills.length}">${fills.join('')}</fills><borders count="${borders.length}">${borders.join('')}</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="${xfs.length}">${xfs.join('')}</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`
  return { id, xml }
}

/* cell: null | { v, t: 'text'|'num'|'date', f (formula, v is its value), href, + the look: fmt, bold, italic, underline,
   color, size, fill, border, align, wrap, valign } */
function cellXml(ref, c, styles, links) {
  if (!c) return ''
  const s = styles.id(c)
  if (c.href && c.v !== null && c.v !== undefined && c.v !== '') links.push({ ref, href: c.href })
  if (c.f) return `<c r="${ref}" s="${s}"${typeof c.v === 'string' ? ' t="str"' : ''}><f>${esc(c.f)}</f>${c.v === null || c.v === undefined ? '' : `<v>${esc(c.v)}</v>`}</c>`
  if (c.v === null || c.v === undefined || c.v === '') return `<c r="${ref}" s="${s}"/>`
  if (c.t === 'date') { const d = serial(c.v); if (d !== null) return `<c r="${ref}" s="${s}"><v>${d}</v></c>` }
  if (c.t === 'num' && Number.isFinite(Number(c.v))) return `<c r="${ref}" s="${s}"><v>${Number(c.v)}</v></c>`
  return `<c r="${ref}" s="${s}" t="inlineStr"><is><t xml:space="preserve">${esc(c.v)}</t></is></c>`
}

/* sheet: { name, cols: [width], rows: [{ height, cells: [cell|null] }], freeze (rows kept on top), filter ('A3:Z40'),
   merges: ['A1:F1'], lists: [{ ref: 'D4:D40', source: "'רשימות'!$A$1:$A$6" }], hidden, tab (colour), landscape } */
function sheetXml(sh, styles) {
  const links = []
  const width = Math.max(1, ...sh.rows.map((r) => r.cells.length), sh.cols.length)
  const rows = sh.rows.map((r, ri) => `<row r="${ri + 1}"${r.height ? ` ht="${r.height}" customHeight="1"` : ''}>${r.cells.map((c, ci) => cellXml(`${colName(ci)}${ri + 1}`, c, styles, links)).join('')}</row>`).join('')
  const rels = links.map((l, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="${esc(l.href)}" TargetMode="External"/>`).join('')
  const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheetPr>${sh.tab ? `<tabColor rgb="${argb(sh.tab)}"/>` : ''}<pageSetUpPr fitToPage="1"/></sheetPr>
<dimension ref="A1:${colName(width - 1)}${Math.max(1, sh.rows.length)}"/>
<sheetViews><sheetView rightToLeft="1" showGridLines="0" workbookViewId="0">${sh.freeze ? `<pane ySplit="${sh.freeze}" topLeftCell="A${sh.freeze + 1}" activePane="bottomLeft" state="frozen"/>` : ''}</sheetView></sheetViews>
<sheetFormatPr defaultRowHeight="20"/>
<cols>${sh.cols.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w || 14}" customWidth="1"/>`).join('')}</cols>
<sheetData>${rows}</sheetData>
${sh.filter ? `<autoFilter ref="${sh.filter}"/>` : ''}${sh.merges?.length ? `<mergeCells count="${sh.merges.length}">${sh.merges.map((m) => `<mergeCell ref="${m}"/>`).join('')}</mergeCells>` : ''}${sh.lists?.length ? `<dataValidations count="${sh.lists.length}">${sh.lists.map((l) => `<dataValidation type="list" allowBlank="1" showInputMessage="1" showErrorMessage="0" sqref="${l.ref}"><formula1>${esc(l.source)}</formula1></dataValidation>`).join('')}</dataValidations>` : ''}${links.length ? `<hyperlinks>${links.map((l, i) => `<hyperlink ref="${l.ref}" r:id="rId${i + 1}"/>`).join('')}</hyperlinks>` : ''}
<pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.3" footer="0.3"/><pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/>
</worksheet>`
  return { xml, rels: rels ? `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels}</Relationships>` : '' }
}

export function buildStyledXlsx(sheets, { title = 'Kurkoos Finance' } = {}) {
  const styles = styleBook()
  const names = sheets.map((s, i) => String(s.name || `גיליון ${i + 1}`).replace(/[\\/?*[\]:]/g, ' ').slice(0, 31))
  const built = sheets.map((s) => sheetXml(s, styles))
  const named = sheets.flatMap((s, i) => (s.filter ? [`<definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">'${names[i].replace(/'/g, "''")}'!${s.filter.replace(/([A-Z]+)(\d+)/g, '$$$1$$$2')}</definedName>`] : []))
  const files = [
    { name: '[Content_Types].xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>` },
    { name: '_rels/.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>` },
    { name: 'docProps/core.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${esc(title)}</dc:title><dc:creator>Kurkoos Finance</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString().slice(0, 19)}Z</dcterms:created></cp:coreProperties>` },
    { name: 'xl/workbook.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView activeTab="0"/></bookViews><sheets>${names.map((n, i) => `<sheet name="${esc(n)}" sheetId="${i + 1}"${sheets[i].hidden ? ' state="hidden"' : ''} r:id="rId${i + 1}"/>`).join('')}</sheets>${named.length ? `<definedNames>${named.join('')}</definedNames>` : ''}<calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>` },
    { name: 'xl/_rels/workbook.xml.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
    ...built.flatMap((b, i) => [{ name: `xl/worksheets/sheet${i + 1}.xml`, data: b.xml }, ...(b.rels ? [{ name: `xl/worksheets/_rels/sheet${i + 1}.xml.rels`, data: b.rels }] : [])]),
    { name: 'xl/styles.xml', data: styles.xml() },
  ]
  return zipBytes(files)
}
