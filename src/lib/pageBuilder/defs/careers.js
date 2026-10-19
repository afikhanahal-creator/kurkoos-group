/* עמוד הקריירה: כותרת ורשימת המשרות הפתוחות */
export default {
  route: '/careers',
  group: 'main',
  label: 'קריירה',
  sections: [
    ['header', 'כותרת העמוד', 'heading', [
      { key: 'pages.careers.eyebrow', label: 'תווית עליונה' },
      { key: 'pages.careers.title', label: 'כותרת' },
      { key: 'pages.careers.lead', label: 'טקסט מוביל', multiline: true },
    ]],
    ['jobs', 'משרות פתוחות', 'cards', [
      { key: 'pages.careers.openings', label: 'כותרת' },
      { key: 'pages.careers.apply', label: 'כפתור' },
    ]],
  ],
}
