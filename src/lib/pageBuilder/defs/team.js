import { factSection } from '../../../data/pageFacts.js'

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
    /* סקשני עובדות מ-data/pageFacts.js, כל הטקסטים והקישורים נערכים בעורך (TEAM_FACTS) */
    factSection('team', 'process', 'chain'),
    factSection('team', 'meet', 'pin'),
  ],
}
