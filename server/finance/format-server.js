export const money = (v) => `₪${Number(v).toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
/* the same, for a figure that may be missing: an empty value reads as zero */
export const nis = (v) => money(v || 0)
