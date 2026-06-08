import BackgroundMedia from '../ui/bg-media.jsx'
import './BgMediaDemo.css'

/* ============================================================
   BgMediaDemo — באנר וידאו רקע (סרטון התקדמות הבנייה של קורקוס).
   רספונסיבי: ממולא לרוחב המכל, יחס 16:9, מתכווץ יפה במובייל.
   ============================================================ */
export default function BgMediaDemo() {
  return (
    <div className="bg-media-demo">
      <div className="bg-media-demo__frame">
        <BackgroundMedia
          type="video"
          variant="light"
          src="/divisions/kurkoos-showcase.mp4"
          poster="/divisions/kurkoos-showcase-poster.jpg"
          alt="זרוע הביצוע של קורקוס — סרטון התקדמות בנייה"
        />
      </div>
    </div>
  )
}
