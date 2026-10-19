/* עמוד הצוות: כותרת וגריד אנשי הצוות */
export default {
  route: '/team',
  group: 'main',
  label: 'צוות',
  sections: [
    ['header', 'כותרת העמוד', 'heading', [
      { key: 'pages.team.eyebrow', label: 'תווית עליונה' },
      { key: 'pages.team.title', label: 'כותרת' },
      { key: 'pages.team.lead', label: 'טקסט מוביל', multiline: true },
    ]],
    ['members', 'אנשי הצוות', 'cards'],
  ],
}
