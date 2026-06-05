import { useI18n } from '../../i18n/index.jsx'
import Modal from './Modal.jsx'
import './VideoModal.css'

/* מודאל וידאו — YouTube או קובץ. */
export default function VideoModal({ open, onClose, video, title = '' }) {
  const { lang } = useI18n()
  const hasYoutube = video?.type === 'youtube' && video.id
  const hasFile = video?.type === 'file' && video.src

  return (
    <Modal open={open} onClose={onClose} className="modal__panel--video" label={title}>
      <div className="video-modal">
        {hasYoutube ? (
          <iframe
            src={`https://www.youtube.com/embed/${video.id}?autoplay=1`}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : hasFile ? (
          <video src={video.src} controls autoPlay />
        ) : (
          <div className="video-modal__empty">
            {lang === 'he'
              ? 'סרטון החברה יתווסף כאן. הדבק מזהה YouTube ב-src/data/hero.js'
              : 'Company film goes here. Add a YouTube id in src/data/hero.js'}
          </div>
        )}
      </div>
    </Modal>
  )
}
