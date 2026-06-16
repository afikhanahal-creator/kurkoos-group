import { PROJECT_STATUS } from './schema.js'
import { srcOfResponsive } from '../../lib/responsiveImage.js'

/* תצוגה מקדימה קומפקטית של עמוד הפרויקט — נבנית מאותם שדות שעמוד
   הפרויקט הציבורי (ProjectDetail) משתמש בהם, כדי שהמנהל יראה איך ייראה
   בערך הדף בזמן עריכה. לא משכפלת את העמוד המלא — מציגה את עיקרי החלקים. */

const statusLabel = (v) => PROJECT_STATUS.find((s) => s.value === v)?.label || ''

// קוביות נתונים — מותאמות אם הוגדרו, אחרת נגזרות מהשדות הבסיסיים
function buildCubes(form) {
  if (Array.isArray(form.stat_cubes) && form.stat_cubes.length) {
    return form.stat_cubes
      .map((c) => ({ value: c.value, label: typeof c.label === 'object' ? c.label.he : c.label }))
      .filter((c) => (c.value != null && c.value !== '') || (c.label != null && c.label !== ''))
  }
  const cubes = []
  if (form.towers > 0) cubes.push({ value: form.towers, label: 'בניינים' })
  if (form.units > 0) cubes.push({ value: form.units, label: 'יחידות דיור' })
  if (form.floors) cubes.push({ value: form.floors, label: 'קומות' })
  if (form.architects) cubes.push({ value: form.architects, label: 'אדריכלים' })
  if (form.status) cubes.push({ value: statusLabel(form.status), label: 'סטטוס' })
  return cubes
}

export default function ProjectPreview({ form }) {
  const cover = srcOfResponsive(form.hero_image_url) || srcOfResponsive(form.gallery && form.gallery[0]) || ''
  const cubes = buildCubes(form)
  const amenities = Array.isArray(form.amenities) ? form.amenities.filter(Boolean) : []
  const gallery = Array.isArray(form.gallery) ? form.gallery : []

  return (
    <div className="edpv" dir="rtl">
      {/* באנר */}
      <div className="edpv__banner">
        <div className="edpv__content">
          {form.location && <span className="edpv__loc">{form.location}</span>}
          <span className="edpv__rule" aria-hidden="true" />
          <h4 className="edpv__name">{form.name || 'שם הפרויקט'}</h4>
          {form.subtitle && <p className="edpv__sub">{form.subtitle}</p>}
          {cubes.length > 0 && (
            <div className="edpv__cubes">
              {cubes.map((c, i) => (
                <div className="edpv__cube" key={i}>
                  <span className="edpv__cube-val" dir="auto">{c.value}</span>
                  <span className="edpv__cube-label">{c.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="edpv__media">
          {cover ? <img src={cover} alt="" /> : <span className="edpv__media-empty">אין תמונת שער</span>}
        </div>
      </div>

      {/* על הפרויקט */}
      {(form.description || amenities.length > 0) && (
        <div className="edpv__about">
          <span className="edpv__eyebrow">על הפרויקט</span>
          <h5 className="edpv__h">{form.name || ''}</h5>
          {form.description && <p className="edpv__prose">{form.description}</p>}
          {amenities.length > 0 && (
            <ul className="edpv__features">
              {amenities.map((a, i) => (
                <li key={i}>✓ {typeof a === 'object' ? a.he : a}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* גלריה */}
      {gallery.length > 0 && (
        <div className="edpv__gallery">
          <span className="edpv__eyebrow">מבט מקרוב</span>
          <div className="edpv__thumbs">
            {gallery.slice(0, 6).map((src, i) => <img key={i} src={src} alt="" />)}
          </div>
        </div>
      )}
    </div>
  )
}
