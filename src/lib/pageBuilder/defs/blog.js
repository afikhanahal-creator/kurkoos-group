/* הבלוג: כותרת ורשת הכתבות */
export default {
  route: '/blog',
  group: 'guides',
  label: 'בלוג',
  sections: [
    ['header', 'כותרת העמוד', 'heading', [
      { key: 'pages.blog.eyebrow', label: 'תווית עליונה' },
      { key: 'pages.blog.title', label: 'כותרת' },
      { key: 'pages.blog.lead', label: 'טקסט מוביל', multiline: true },
    ]],
    ['grid', 'הכתבות', 'cards', [
      { key: 'pages.blog.read', label: 'קישור לכתבה' },
    ]],
  ],
}
