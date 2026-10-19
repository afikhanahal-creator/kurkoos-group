/* עמוד השארת פרטים: כותרת, והטופס עם דרכי הקשר הישירות והמפה */
export default {
  route: '/contact',
  group: 'main',
  label: 'צור קשר',
  sections: [
    ['header', 'כותרת העמוד', 'heading'],
    ['form', 'טופס ופרטי קשר', 'form', [
      { key: 'contactExtra.choose', label: 'הנחיה מעל הנושאים', multiline: true },
      { key: 'contactExtra.required', label: 'הערת שדות חובה' },
    ]],
  ],
}
