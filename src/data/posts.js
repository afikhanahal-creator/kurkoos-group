/* פוסטים לבלוג. תמונות ב-public/blog/. */
// תמונות דמו (Unsplash). החלף בנתיב מקומי /blog/1.jpg כשיהיו תמונות שלך.
const img = (id) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=900&q=80`

export const posts = [
  {
    slug: 'green-building-2026',
    title: { he: 'בנייה ירוקה: למה זה כבר לא מותרות', en: 'Green building: no longer a luxury' },
    date: '2026-05-20',
    cover: img('1518005020951-eccb494ad742'),
    excerpt: {
      he: 'תקני הבנייה הירוקה משנים את האופן שבו אנחנו מתכננים ובונים. הנה מה שחשוב לדעת.',
      en: 'Green building standards are changing how we plan and build. Here is what matters.',
    },
  },
  {
    slug: 'urban-renewal-guide',
    title: { he: 'מדריך להתחדשות עירונית לדיירים', en: "Resident's guide to urban renewal" },
    date: '2026-04-11',
    cover: img('1460317442991-0ec209397118'),
    excerpt: {
      he: 'פינוי-בינוי או תמ"א? כל מה שצריך לדעת לפני שמתחילים בתהליך.',
      en: 'Evacuation-reconstruction or TAMA? Everything to know before you start.',
    },
  },
  {
    slug: 'choosing-apartment',
    title: { he: '5 שאלות לשאול לפני שקונים דירה על הנייר', en: '5 questions before buying off-plan' },
    date: '2026-03-02',
    cover: img('1512453979798-5ea266f8880c'),
    excerpt: {
      he: 'רכישת דירה על הנייר היא החלטה גדולה. השאלות שיעזרו לכם לבחור נכון.',
      en: 'Buying off-plan is a big decision. The questions that help you choose well.',
    },
  },
]

export default posts
