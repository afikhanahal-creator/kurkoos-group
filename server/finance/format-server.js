export const money = (v) => `₪${Number(v).toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
