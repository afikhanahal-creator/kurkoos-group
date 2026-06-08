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

/* סגנון מפה מותג — מאוזן "כחול + חום": בלוקים עירוניים בכחול-אפרפר (יותר כחול),
   שטחים טבעיים בחול חם, מים וכבישים מהירים בכחול עמוק, פארקים בטורקיז-ירקרק. */
const MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#e4e9ec' }] },                 /* בסיס — אפור-תכלת קריר */
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#3f566a' }] },         /* כיתוב — כחול-צפחה */
  { elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }, { weight: 3 }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.land_parcel', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.neighborhood', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#bfdcd6' }] }, /* פארקים — טורקיז-ירקרק */
  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#e7ddc8' }] }, /* טבע — חול חם (נגיעת החום) */
  { featureType: 'landscape.man_made', elementType: 'geometry.fill', stylers: [{ color: '#dde6ec' }] },   /* בלוקים עירוניים — כחול-אפרפר */
  { featureType: 'landscape.man_made', elementType: 'geometry.stroke', stylers: [{ color: '#c8d6e0' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#d3dfe7' }] },
  { featureType: 'road', elementType: 'labels', stylers: [{ visibility: 'off' }] },        /* רחובות קטנים — בלי שמות */
  /* רחובות ראשיים — שמות גלויים בכחול-צפחה */
  { featureType: 'road.arterial', elementType: 'labels', stylers: [{ visibility: 'on' }] },
  { featureType: 'road.arterial', elementType: 'labels.text.fill', stylers: [{ color: '#3f566a' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#cfe0ea' }] },  /* כבישים מהירים — כחול */
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#aacbdb' }] },
  { featureType: 'road.highway', elementType: 'labels', stylers: [{ visibility: 'on' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#2f4f63' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#5fa3c2' }] },      /* מים — כחול מותג חזק */
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
