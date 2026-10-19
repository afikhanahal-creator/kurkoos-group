import BookingCalendar from '../../components/ui/BookingCalendar.jsx'

/* יומן הפגישות של האתר. בחירת שעה מקפיצה לטופס יצירת הקשר כשהוא בעמוד */
export default function BookingW({ props: p }) {
  return (
    <section className={`section pb-w pb-w--booking pb-bg--${p.bg || 'paper'}`}>
      <div className="container pb-in pb-in--narrow">
        <BookingCalendar title={p.title || 'קבעו פגישה'} ctaTargetId="cf-name" />
      </div>
    </section>
  )
}
