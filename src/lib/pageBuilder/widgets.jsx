import { lazy, Suspense } from 'react'
import Hero from '../../components/sections/Hero.jsx'
import Activities from '../../components/sections/Activities.jsx'
import Story from '../../components/sections/Story.jsx'
import Stats from '../../components/sections/Stats.jsx'
import ProjectsGallery from '../../components/sections/ProjectsGallery.jsx'
import ValueChain from '../../components/sections/ValueChain.jsx'
import Testimonials from '../../components/sections/Testimonials.jsx'
import Partners from '../../components/sections/Partners.jsx'
import Contact from '../../components/sections/Contact.jsx'
import HomeFaq from '../../components/sections/HomeFaq.jsx'
import { HeadingW, TextW, ImageW, ButtonW, SpacerW, DividerW, VideoW, ChecklistW, ColumnsW, GalleryW } from './blocks.jsx'

const WarrantyBanner = lazy(() => import('../../components/sections/WarrantyBanner.jsx'))
const LeadFormW = lazy(() => import('./LeadFormW.jsx'))
const BookingW = lazy(() => import('./BookingW.jsx'))
const MapW = lazy(() => import('./MapW.jsx'))

const lazyW = (C) => function LazyWidget(props) {
  return <Suspense fallback={<div style={{ minHeight: 240 }} />}><C {...props} /></Suspense>
}

/* ============================================================
   ספריית הרכיבים של עורך העמודים. רק רכיבים שכבר קיימים באתר.
   site: סקשן קיים. התוכן שלו נשאר בלשונית שמנהלת אותו (manage),
         והטקסטים שלו (texts) נערכים בעורך ונכתבים לכותרות האתר.
   fields: שדות התוכן של רכיב בסיס.
   ============================================================ */

const T = (key, label, multiline = false) => ({ key, label, multiline })

export const GROUPS = [
  { id: 'site', label: 'סקשנים של האתר' },
  { id: 'basic', label: 'בסיס' },
  { id: 'layout', label: 'פריסה' },
  { id: 'biz', label: 'עסקיים' },
]

export const WIDGETS = {
  /* ---- סקשנים של האתר ---- */
  hero: { group: 'site', label: 'פתיחה (Hero)', icon: 'hero', C: Hero, once: true,
    texts: [T('hero.subtitle', 'תת כותרת', true), T('hero.ctaPrimary', 'כפתור ראשי'), T('hero.watchFilm', 'כפתור סרטון')],
    manage: { tab: 'covers', label: 'תמונות קאבר' } },
  activities: { group: 'site', label: 'תחומי פעילות', icon: 'grid', C: Activities,
    texts: [T('activities.eyebrow', 'תווית עליונה'), T('activities.title', 'כותרת'), T('activities.lead', 'טקסט מוביל', true)],
    manage: { tab: 'activities', label: 'תחומי הפעילות' } },
  valueChain: { group: 'site', label: 'שרשרת ערך', icon: 'chain', C: ValueChain,
    texts: [T('valueChain.eyebrow', 'תווית עליונה'), T('valueChain.title', 'כותרת'), T('valueChain.lead', 'טקסט מוביל', true)] },
  story: { group: 'site', label: 'הסיפור שלנו', icon: 'book', C: Story,
    texts: [T('story.eyebrow', 'תווית עליונה'), T('story.title', 'כותרת'), T('story.short', 'פסקה ראשונה', true)] },
  stats: { group: 'site', label: 'מספרים', icon: 'chart', C: Stats,
    texts: [T('stats.eyebrow', 'תווית עליונה'), T('stats.title', 'כותרת')],
    manage: { tab: 'counters', label: 'מונים ומספרים' } },
  projects: { group: 'site', label: 'פרויקטים', icon: 'building', C: ProjectsGallery,
    texts: [T('projects.eyebrow', 'תווית עליונה'), T('projects.title', 'כותרת'), T('projects.lead', 'טקסט מוביל', true)],
    manage: { tab: 'home_featured', label: 'פרויקטים נבחרים' } },
  partners: { group: 'site', label: 'שותפים', icon: 'logos', C: Partners,
    texts: [T('partners.title', 'כותרת')],
    manage: { tab: 'logos', label: 'לוגואים' } },
  testimonials: { group: 'site', label: 'המלצות', icon: 'quote', C: Testimonials,
    texts: [T('testimonials.eyebrow', 'תווית עליונה'), T('testimonials.title', 'כותרת'), T('testimonials.lead', 'טקסט מוביל', true)],
    manage: { tab: 'testimonials', label: 'המלצות לקוחות' } },
  faq: { group: 'site', label: 'שאלות ותשובות', icon: 'faq', C: HomeFaq,
    note: 'השאלות של עמוד הבית נשמרות בקוד, כי הן גם הנתונים המובנים לגוגל.' },
  contact: { group: 'site', label: 'צור קשר', icon: 'mail', C: Contact,
    texts: [T('contact.eyebrow', 'תווית עליונה'), T('contact.title', 'כותרת'), T('contact.lead', 'טקסט מוביל', true)] },
  warranty: { group: 'site', label: 'באנר אחריות', icon: 'shield', C: lazyW(WarrantyBanner),
    texts: [T('warranty.eyebrow', 'תווית עליונה'), T('warranty.title', 'כותרת'), T('warranty.lead', 'טקסט מוביל', true)] },

  /* ---- בסיס ---- */
  heading: { group: 'basic', label: 'כותרת', icon: 'heading', C: HeadingW, basic: true,
    defaults: { eyebrow: '', text: 'כותרת חדשה', size: 'h2', tag: 'h2', align: 'center', bg: 'paper' },
    fields: [
      { key: 'eyebrow', label: 'תווית עליונה', type: 'text' },
      { key: 'text', label: 'כותרת', type: 'textarea', inline: true },
      { key: 'tag', label: 'רמה לגוגל', type: 'select', options: [['h1', 'H1'], ['h2', 'H2'], ['h3', 'H3']] },
    ] },
  text: { group: 'basic', label: 'פסקה', icon: 'text', C: TextW, basic: true,
    defaults: { text: 'כתבו כאן את הטקסט.', lead: false, align: 'center', bg: 'paper' },
    fields: [
      { key: 'text', label: 'טקסט', type: 'textarea', inline: true },
      { key: 'lead', label: 'טקסט מוביל (גדול ורך)', type: 'toggle' },
    ] },
  image: { group: 'basic', label: 'תמונה', icon: 'image', C: ImageW, basic: true,
    defaults: { src: '', alt: '', ratio: 'auto', caption: '', bg: 'paper' },
    fields: [
      { key: 'src', label: 'תמונה', type: 'image' },
      { key: 'alt', label: 'תיאור התמונה (לנגישות ולגוגל)', type: 'text' },
      { key: 'ratio', label: 'יחס', type: 'select', options: [['auto', 'מקורי'], ['16/9', '16:9'], ['4/3', '4:3'], ['1/1', 'ריבוע']] },
      { key: 'caption', label: 'כיתוב', type: 'text' },
    ] },
  button: { group: 'basic', label: 'כפתור', icon: 'cursor', C: ButtonW, basic: true,
    defaults: { label: 'דברו איתנו', href: '/contact', style: 'primary', align: 'center', bg: 'paper' },
    fields: [
      { key: 'label', label: 'טקסט הכפתור', type: 'text', inline: true },
      { key: 'href', label: 'קישור', type: 'text' },
      { key: 'style', label: 'סגנון', type: 'select', options: [['primary', 'אדום ראשי'], ['dark', 'כחול כהה'], ['outline', 'משני בהיר']] },
    ] },
  spacer: { group: 'basic', label: 'רווח', icon: 'space', C: SpacerW, basic: true,
    defaults: { h: 48, bg: 'paper' },
    fields: [{ key: 'h', label: 'גובה', type: 'space' }] },
  divider: { group: 'basic', label: 'קו מפריד', icon: 'line', C: DividerW, basic: true,
    defaults: { bg: 'paper' }, fields: [] },
  video: { group: 'basic', label: 'וידאו', icon: 'play', C: VideoW, basic: true,
    defaults: { url: '', title: '', bg: 'paper' },
    fields: [
      { key: 'url', label: 'קישור (YouTube או קובץ MP4)', type: 'text' },
      { key: 'title', label: 'כותרת הסרטון (לנגישות)', type: 'text' },
    ] },
  checklist: { group: 'basic', label: 'רשימה עם וי', icon: 'check', C: ChecklistW, basic: true,
    defaults: { items: ['פריט ראשון', 'פריט שני', 'פריט שלישי'], align: 'center', bg: 'paper' },
    fields: [{ key: 'items', label: 'פריטים (שורה לכל פריט)', type: 'lines' }] },

  /* ---- פריסה ---- */
  columns: { group: 'layout', label: 'שורה עם עמודות', icon: 'cols', C: ColumnsW, basic: true,
    defaults: { cols: 3, variant: 'plain', align: 'center', bg: 'paper', items: [
      { title: 'כותרת', text: 'טקסט קצר', image: '', link: '', linkLabel: '' },
      { title: 'כותרת', text: 'טקסט קצר', image: '', link: '', linkLabel: '' },
      { title: 'כותרת', text: 'טקסט קצר', image: '', link: '', linkLabel: '' },
    ] },
    fields: [{ key: 'items', label: 'עמודות', type: 'items' }] },
  cards: { group: 'layout', label: 'גריד כרטיסים', icon: 'cards', C: ColumnsW, basic: true,
    defaults: { cols: 3, variant: 'cards', align: 'start', bg: 'soft', items: [
      { title: 'כותרת', text: 'טקסט קצר', image: '', link: '', linkLabel: '' },
      { title: 'כותרת', text: 'טקסט קצר', image: '', link: '', linkLabel: '' },
      { title: 'כותרת', text: 'טקסט קצר', image: '', link: '', linkLabel: '' },
    ] },
    fields: [{ key: 'items', label: 'כרטיסים', type: 'items' }] },

  /* ---- עסקיים ---- */
  leadForm: { group: 'biz', label: 'טופס ליד', icon: 'form', C: lazyW(LeadFormW), basic: true,
    defaults: { title: 'רוצים שנחזור אליכם?', text: '', bg: 'soft' },
    fields: [
      { key: 'title', label: 'כותרת', type: 'text', inline: true },
      { key: 'text', label: 'טקסט', type: 'textarea' },
    ] },
  booking: { group: 'biz', label: 'יומן פגישות', icon: 'calendar', C: lazyW(BookingW), basic: true,
    defaults: { title: 'קבעו פגישה', bg: 'paper' },
    fields: [{ key: 'title', label: 'כותרת', type: 'text' }] },
  map: { group: 'biz', label: 'מפה (המשרד)', icon: 'pin', C: lazyW(MapW), basic: true,
    defaults: { bg: 'paper' }, fields: [] },
  gallery: { group: 'biz', label: 'גלריה', icon: 'images', C: GalleryW, basic: true,
    defaults: { cols: 3, images: [], bg: 'paper' },
    fields: [{ key: 'images', label: 'תמונות', type: 'images' }] },
}

export const BG = [['paper', 'לבן'], ['soft', 'ערפל'], ['dark', 'כחול לילה']]
