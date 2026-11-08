// The four master-data entities: their fields, list columns, validation and duplicate rules.
// One definition drives the list, the form, import/export and the overview page (MasterData.jsx, EntityOverview.jsx).
import { PROJECT_STATUS } from './format.js'

export function validIsraeliId(id) {
  const s = String(id || '').replace(/\D/g, '')
  if (s.length < 5 || s.length > 9) return false
  const p = s.padStart(9, '0')
  let sum = 0
  for (let i = 0; i < 9; i++) { let d = Number(p[i]) * ((i % 2) + 1); if (d > 9) d -= 9; sum += d }
  return sum % 10 === 0
}
export const normName = (t) => String(t || '').toLowerCase().replace(/(בע"מ|בע״מ|בעמ|ltd\.?|inc\.?|llc|limited|ושות׳|ושות'|ושות)/g, '').replace(/[^\p{L}\p{N}]+/gu, '')
const host = (u) => String(u || '').toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]

export const SUPPLIER_TYPES = ['ספק חומרים', 'קבלן משנה', 'נותן שירות', 'יועץ', 'תוכנה ומנויים', 'רשות או מוסד', 'אחר']
export const PROJECT_TYPES = ['מגורים', 'וילות פרטיות', 'מסחרי', 'תמ״א 38', 'התחדשות עירונית', 'פיקוח', 'אחר']
export const SUPPLIER_STATUS = { active: 'פעיל', pending: 'ממתין לאישור', archived: 'בארכיון' }

/* field types: text, email, tel, url, number, date, textarea, id (Israeli company number), select, multi, ref, toggle, tags */
export const ENTITIES = {
  suppliers: {
    table: 'fin_suppliers', path: '/suppliers', title: 'ספקים', one: 'ספק', add: 'הוסף ספק', icon: 'suppliers', write: 'edit',
    sub: 'כל ספק מחובר למסמכים שלו. ספקים חדשים מזוהים לבד מהחשבוניות, ובמצב מבוקר מחכים כאן לאישור.',
    relation: 'supplier_id',
    fields: [
      { key: 'name', label: 'שם משפטי', type: 'text', required: true, wide: true },
      { key: 'trading_name', label: 'שם מסחרי', type: 'text' },
      { key: 'supplier_type', label: 'סוג ספק', type: 'select', options: SUPPLIER_TYPES },
      { key: 'vat_id', label: 'ח.פ / ע.מ', type: 'id' },
      { key: 'vat_number', label: 'מספר עוסק במע״מ (אם שונה)', type: 'id' },
      { key: 'contact_person', label: 'איש קשר', type: 'text' },
      { key: 'phone', label: 'טלפון', type: 'tel' },
      { key: 'email', label: 'אימייל', type: 'email' },
      { key: 'website', label: 'אתר', type: 'url' },
      { key: 'address', label: 'כתובת', type: 'text', wide: true },
      { key: 'default_category', label: 'קטגוריה קבועה', type: 'ref', ref: 'categories', by: 'name' },
      { key: 'default_business_id', label: 'חברה קבועה', type: 'ref', ref: 'businesses' },
      { key: 'default_project_id', label: 'פרויקט קבוע', type: 'ref', ref: 'projects', hint: 'רק אם הספק עובד בפרויקט אחד. ספק של כמה פרויקטים לא משויך לפי שם' },
      { key: 'email_domain', label: 'דומיין מייל לזיהוי', type: 'text', ltr: true },
      { key: 'status', label: 'סטטוס', type: 'select', options: Object.entries(SUPPLIER_STATUS).map(([value, label]) => ({ value, label })) },
      { key: 'notes', label: 'הערות', type: 'textarea', wide: true },
    ],
    blank: { status: 'active' },
    filters: [{ key: 'status', label: 'סטטוס', options: SUPPLIER_STATUS }, { key: 'supplier_type', label: 'סוג', options: Object.fromEntries(SUPPLIER_TYPES.map((t) => [t, t])) }, { key: '_missing', label: 'פרטים חסרים', options: { id: 'בלי ח.פ', contact: 'בלי פרטי קשר' } }],
    archived: (r) => r.status === 'archived',
    archive: { status: 'archived', archived_at: () => new Date().toISOString() },
    restore: { status: 'active', archived_at: null },
    duplicates(row, all) {
      const out = []
      for (const s of all) {
        if (s.id === row.id) continue
        const why = []
        if (row.vat_id && (s.vat_id === row.vat_id || s.vat_number === row.vat_id)) why.push('אותו ח.פ')
        if (row.vat_number && (s.vat_id === row.vat_number || s.vat_number === row.vat_number)) why.push('אותו מספר עוסק')
        if (normName(row.name) && normName(row.name) === normName(s.name)) why.push('אותו שם')
        if (row.email && s.email && row.email.toLowerCase() === s.email.toLowerCase()) why.push('אותו אימייל')
        if (row.website && s.website && host(row.website) === host(s.website)) why.push('אותו אתר')
        if (why.length) out.push({ row: s, why })
      }
      return out
    },
  },
  categories: {
    table: 'fin_categories', path: '/categories', title: 'קטגוריות', one: 'קטגוריה', add: 'הוסף קטגוריה', icon: 'tag', write: 'edit',
    sub: 'הקטגוריות של ההוצאות, עם קוד חשבונאי, אחוז קיזוז מע״מ ותתי-קטגוריות. קטגוריה שיש לה מסמכים עוברת לארכיון ולא נמחקת.',
    relation: 'category_id',
    fields: [
      { key: 'name', label: 'שם בעברית', type: 'text', required: true },
      { key: 'name_en', label: 'שם באנגלית', type: 'text', ltr: true },
      { key: 'parent_id', label: 'קטגוריית אב', type: 'ref', ref: 'categories', self: true },
      { key: 'accounting_code', label: 'קוד חשבונאי (כרטיס)', type: 'text', ltr: true },
      { key: 'vat_deductible_pct', label: '% קיזוז מע״מ', type: 'number', min: 0, max: 100, hint: 'ברירת מחדל מקובלת, לאישור מול רו״ח' },
      { key: 'vat_treatment', label: 'טיפול מע״מ (הערת רו״ח)', type: 'text' },
      { key: 'business_ids', label: 'חברות', type: 'multi', ref: 'businesses', hint: 'ריק = כל החברות', wide: true },
      { key: 'keywords', label: 'מילות זיהוי (מופרדות בפסיק)', type: 'tags', wide: true, hint: 'מילים שמופיעות בחשבונית ומרמזות על הקטגוריה' },
      { key: 'description', label: 'תיאור', type: 'textarea', wide: true },
      { key: 'active', label: 'פעילה', type: 'toggle' },
    ],
    blank: { active: true, vat_deductible_pct: 100, keywords: [] },
    filters: [{ key: 'active', label: 'סטטוס', options: { true: 'פעילות', false: 'בארכיון' } }],
    archived: (r) => r.active === false,
    archive: { active: false },
    restore: { active: true },
    duplicates: (row, all) => all.filter((c) => c.id !== row.id && normName(c.name) === normName(row.name)).map((c) => ({ row: c, why: ['אותו שם'] })),
  },
  projects: {
    table: 'fin_projects', path: '/projects', title: 'פרויקטים', one: 'פרויקט', add: 'הוסף פרויקט', icon: 'project', write: 'edit',
    sub: 'כל פרויקט שייך לחברה משפטית אחת. הוצאה יכולה להתחלק בין כמה פרויקטים, והסכומים תמיד מתאזנים לחשבונית.',
    relation: 'project_id',
    fields: [
      { key: 'name', label: 'שם הפרויקט', type: 'text', required: true, wide: true },
      { key: 'code', label: 'קוד פנימי', type: 'text', ltr: true, hint: 'כשהקוד מופיע בחשבונית, הפרויקט משויך' },
      { key: 'business_id', label: 'חברה משפטית', type: 'ref', ref: 'businesses', required: true },
      { key: 'location', label: 'כתובת הפרויקט', type: 'text', wide: true },
      { key: 'project_type', label: 'סוג פרויקט', type: 'select', options: PROJECT_TYPES },
      { key: 'status', label: 'סטטוס', type: 'select', options: Object.entries(PROJECT_STATUS).map(([value, label]) => ({ value, label })) },
      { key: 'manager_name', label: 'מנהל הפרויקט', type: 'text' },
      { key: 'budget', label: 'תקציב (₪)', type: 'number', min: 0 },
      { key: 'start_date', label: 'תאריך התחלה', type: 'date' },
      { key: 'expected_end', label: 'סיום צפוי', type: 'date' },
      { key: 'keywords', label: 'מילות זיהוי (מופרדות בפסיק)', type: 'tags', wide: true, hint: 'שם הרחוב, שם האתר. מופיעות במסמך = הצעה לשיוך' },
      { key: 'notes', label: 'הערות', type: 'textarea', wide: true },
    ],
    blank: { status: 'active', keywords: [] },
    filters: [{ key: 'status', label: 'סטטוס', options: PROJECT_STATUS }, { key: 'business_id', label: 'חברה', ref: 'businesses' }],
    archived: (r) => !!r.archived_at,
    archive: { archived_at: () => new Date().toISOString(), status: 'done' },
    restore: { archived_at: null, status: 'active' },
    duplicates: (row, all) => all.filter((p) => p.id !== row.id && (normName(p.name) === normName(row.name) || (row.code && p.code && p.code.toLowerCase() === row.code.toLowerCase()))).map((p) => ({ row: p, why: [p.code && row.code && p.code.toLowerCase() === row.code.toLowerCase() ? 'אותו קוד' : 'אותו שם'] })),
  },
  businesses: {
    table: 'fin_businesses', path: '/companies', title: 'חברות', one: 'חברה', add: 'הוסף חברה', icon: 'company', write: 'manage',
    sub: 'הישויות המשפטיות של הקבוצה. ארגון ← חברה ← פרויקט ← מסמכים. מספר הרישום של חברה הוא הסימן החזק ביותר לשיוך חשבונית.',
    relation: 'business_id',
    fields: [
      { key: 'name', label: 'שם משפטי', type: 'text', required: true, wide: true },
      { key: 'commercial_name', label: 'שם מסחרי', type: 'text' },
      { key: 'name_en', label: 'שם באנגלית', type: 'text', ltr: true },
      { key: 'reg_number', label: 'מספר רישום (ח.פ)', type: 'id' },
      { key: 'vat_id', label: 'מספר עוסק במע״מ', type: 'id', required: true, hint: 'משמש לזיהוי החברה בחשבוניות' },
      { key: 'address', label: 'כתובת', type: 'text', wide: true },
      { key: 'phone', label: 'טלפון', type: 'tel' },
      { key: 'email', label: 'אימייל', type: 'email' },
      { key: 'accounting_system_id', label: 'מזהה בתוכנת הנה״ח', type: 'text', ltr: true },
      { key: 'accountant_name', label: 'רואה החשבון', type: 'text' },
      { key: 'accountant_email', label: 'מייל רו״ח', type: 'email' },
      { key: 'color', label: 'צבע', type: 'color' },
      { key: 'active', label: 'פעילה', type: 'toggle' },
      { key: 'notes', label: 'הערות', type: 'textarea', wide: true },
    ],
    blank: { active: true, color: '#105572' },
    filters: [{ key: 'active', label: 'סטטוס', options: { true: 'פעילות', false: 'לא פעילות' } }],
    archived: (r) => !!r.archived_at,
    archive: { archived_at: () => new Date().toISOString(), active: false },
    restore: { archived_at: null, active: true },
    duplicates: (row, all) => all.filter((b) => b.id !== row.id && ((row.vat_id && b.vat_id === row.vat_id) || (row.reg_number && b.reg_number === row.reg_number) || normName(b.name) === normName(row.name))).map((b) => ({ row: b, why: [row.vat_id && b.vat_id === row.vat_id ? 'אותו מספר עוסק' : 'אותו שם'] })),
  },
}

export function validate(def, row) {
  const errs = {}
  for (const f of def.fields) {
    const v = row[f.key]
    if (f.required && (v === null || v === undefined || String(v).trim() === '')) errs[f.key] = 'שדה חובה'
    else if (f.type === 'id' && v && !validIsraeliId(v)) errs[f.key] = 'מספר לא תקין (ספרת ביקורת)'
    else if (f.type === 'email' && v && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) errs[f.key] = 'כתובת מייל לא תקינה'
    else if (f.type === 'url' && v && !/^(https?:\/\/)?[\w-]+(\.[\w-]+)+/.test(v)) errs[f.key] = 'כתובת אתר לא תקינה'
    else if (f.type === 'number' && v !== '' && v !== null && v !== undefined && (Number.isNaN(Number(v)) || (f.min !== undefined && Number(v) < f.min) || (f.max !== undefined && Number(v) > f.max))) errs[f.key] = `מספר בין ${f.min ?? ''} ל-${f.max ?? ''}`
  }
  return errs
}

/* form values → database row */
export function toRow(def, form) {
  const row = {}
  for (const f of def.fields) {
    let v = form[f.key]
    if (f.type === 'id') v = String(v || '').replace(/\D/g, '') || null
    else if (f.type === 'number') v = v === '' || v === null || v === undefined ? null : Number(v)
    else if (f.type === 'tags') v = (Array.isArray(v) ? v : String(v || '').split(',')).map((t) => String(t).trim()).filter(Boolean)
    else if (f.type === 'multi') v = Array.isArray(v) && v.length ? v : null
    else if (f.type === 'toggle') v = !!v
    else if (['ref', 'date', 'select', 'email', 'url', 'tel', 'text', 'textarea'].includes(f.type)) v = v === '' || v === undefined ? null : v
    row[f.key] = v
  }
  if (form.id) row.id = form.id
  return row
}
