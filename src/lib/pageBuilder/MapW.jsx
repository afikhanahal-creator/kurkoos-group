import OfficeMap from '../../components/ui/OfficeMap.jsx'

/* המפה של המשרד, אותו כרטיס שמופיע מתחת לטופס יצירת הקשר */
export default function MapW({ props: p }) {
  return (
    <section className={`section pb-w pb-w--map pb-bg--${p.bg || 'paper'}`}>
      <div className="container pb-in"><OfficeMap /></div>
    </section>
  )
}
