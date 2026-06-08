import { useEffect, useRef, useState } from 'react'
import './PropertyMap.css'

/* ============================================================
   PropertyMap — מפת Google מעוצבת (Maps JavaScript API) בצבעי
   המותג: גווני כחול/טורקיז במקום ירוק, כבישים לבנים, מינימום
   תוויות, וסמן הנכס. דורש VITE_GOOGLE_MAPS_KEY + coords {lat,lng}.
   ============================================================ */

let mapsPromise
function loadGoogleMaps(key) {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'))
  if (window.google?.maps) return Promise.resolve(window.google.maps)
  if (mapsPromise) return mapsPromise
  mapsPromise = new Promise((resolve, reject) => {
    const cb = '__kgMapsReady'
    window[cb] = () => resolve(window.google.maps)
    const s = document.createElement('script')
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&callback=${cb}&language=he&region=IL`
    s.async = true
    s.defer = true
    s.onerror = reject
    document.head.appendChild(s)
  })
  return mapsPromise
}

/* סגנון מפה מותג — "חום + כחול" שניהם בולטים יחד: יבשה ובלוקים בגוון חול חם,
   מים וכבישים מהירים בכחול חזק, פארקים בטורקיז — כך ששני הצבעים נראים במפה. */
const MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#eadfca' }] },                 /* בסיס — חול חם (החום) */
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#5a5240' }] },         /* כיתוב — חום כהה */
  { elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }, { weight: 3 }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.land_parcel', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.neighborhood', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#a9d2cc' }] }, /* פארקים — טורקיז (כחול-ירקרק) */
  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#e6dcc6' }] }, /* טבע — חול חם */
  { featureType: 'landscape.man_made', elementType: 'geometry.fill', stylers: [{ color: '#ecd9bd' }] },   /* בלוקים — חום */
  { featureType: 'landscape.man_made', elementType: 'geometry.stroke', stylers: [{ color: '#dcc7a3' }] },
  /* כבישים בכחול רך — כך הכחול מופיע בכל זום, על היבשה החומה (שילוב שני הצבעים) */
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#d2e6f2' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#aacde0' }] },
  { featureType: 'road', elementType: 'labels', stylers: [{ visibility: 'off' }] },        /* רחובות קטנים — בלי שמות */
  /* רחובות ראשיים — שמות גלויים */
  { featureType: 'road.arterial', elementType: 'labels', stylers: [{ visibility: 'on' }] },
  { featureType: 'road.arterial', elementType: 'labels.text.fill', stylers: [{ color: '#2f5366' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#a9cfe2' }] },  /* כבישים מהירים — כחול עמוק יותר */
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#84b4d0' }] },
  { featureType: 'road.highway', elementType: 'labels', stylers: [{ visibility: 'on' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#2f5366' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#4f9fc2' }] },      /* מים — כחול חזק (הכחול הבולט) */
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#07293a' }] },
]

/* סמן הנכס — pin אדום מותג */
const PIN = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="52" viewBox="0 0 40 52">' +
  '<path d="M20 0C9 0 0 9 0 20c0 14 20 32 20 32s20-18 20-32C40 9 31 0 20 0z" fill="#a90b0c"/>' +
  '<circle cx="20" cy="20" r="7" fill="#ffffff"/></svg>'
)

export default function PropertyMap({ lat, lng, label = '', zoom = 15 }) {
  const ref = useRef(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const key = import.meta.env.VITE_GOOGLE_MAPS_KEY
    if (!key || lat == null || lng == null) { setFailed(true); return }
    let cancelled = false
    loadGoogleMaps(key)
      .then((maps) => {
        if (cancelled || !ref.current) return
        const center = { lat, lng }
        const map = new maps.Map(ref.current, {
          center,
          zoom,
          styles: MAP_STYLE,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: 'cooperative',
          clickableIcons: false,
          backgroundColor: '#e9f1f5',
        })
        const marker = new maps.Marker({
          position: center,
          map,
          title: label,
          icon: { url: PIN, scaledSize: new maps.Size(40, 52), anchor: new maps.Point(20, 52) },
        })
        // חלונית מותג — לוגו קורקוס + שם הפרויקט, בריחוף/לחיצה על הפין
        const info = new maps.InfoWindow({
          disableAutoPan: true,
          content:
            '<div class="pm-info" dir="rtl">' +
            '<span class="pm-info__name">' + label + '</span>' +
            '<span class="pm-info__sep"></span>' +
            '<img class="pm-info__logo" src="/kurkoos-logo-h.svg" alt="Kurkoos Group" />' +
            '</div>',
        })
        const openInfo = () => info.open({ anchor: marker, map })
        marker.addListener('mouseover', openInfo)
        marker.addListener('mouseout', () => info.close())
        marker.addListener('click', openInfo)
      })
      .catch(() => { if (!cancelled) setFailed(true) })
    return () => { cancelled = true }
  }, [lat, lng, zoom, label])

  // נפילה-לאחור: אם ה-Maps JS API לא זמין/מאופשר — embed רגיל (לא ריק)
  if (failed) {
    const src = `https://www.google.com/maps?q=${lat},${lng}&z=${zoom}&output=embed`
    return <iframe className="property-map" title={label} src={src} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
  }
  return <div ref={ref} className="property-map" role="img" aria-label={label} />
}
