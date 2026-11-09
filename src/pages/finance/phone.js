/* Israeli mobile: 05X-XXXXXXX in any format → 9725XXXXXXXX; foreign numbers keep their country code */
export function normalizePhone(raw) {
  let d = String(raw || '').replace(/\D/g, '')
  if (d.startsWith('00')) d = d.slice(2)
  if (d.startsWith('0')) d = `972${d.slice(1)}`
  return d
}
export const validMobile = (p) => /^9725\d{8}$/.test(p) || (/^[1-9]\d{9,14}$/.test(p) && !p.startsWith('972'))
export const prettyPhone = (p) => (!p ? '' : p.startsWith('972') ? `+972 ${p.slice(3, 5)}-${p.slice(5, 8)}-${p.slice(8)}` : `+${p}`)
export const localPhone = (p) => (p && p.startsWith('972') ? `0${p.slice(3, 5)}-${p.slice(5)}` : prettyPhone(p))
