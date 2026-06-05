import { useI18n } from '../../i18n/index.jsx'

export default function LanguageSwitcher({ className = '' }) {
  const { dict, toggleLang, lang } = useI18n()
  return (
    <button
      type="button"
      className={`lang-switch ${className}`}
      onClick={toggleLang}
      aria-label={lang === 'he' ? 'Switch to English' : 'החלף לעברית'}
    >
      {dict.langLabel}
    </button>
  )
}
