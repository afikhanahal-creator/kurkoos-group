/* The privacy policy section on Instagram and Facebook messages (Kurkoos DM), and how to delete that data.
   Meta's app settings point "User data deletion" at /privacy#data-deletion. Shared by the page (Legal.jsx) and
   the static HTML (scripts/prerender-static.mjs), so a crawler that doesn't run scripts sees it too. */
export function privacyDm(lang, EMAIL) {
  return lang === 'en' ? { id: 'data-deletion', h: 'Instagram and Facebook Messages, and Deleting Your Data', p: [
      'When you comment on a post, reply to a story or send a message to the Company\'s Instagram accounts or Facebook pages, Meta sends us your username, the ID Meta gives you for our account, and the text of your comment or message.',
      'We use it only to answer you: to send the message you asked for, such as details or a link, and to let our team continue the conversation. We never message people who did not contact us first, and we do not sell this information.',
      'The log of automated messages is deleted after 90 days. Conversations are kept for as long as they are needed to handle your request.',
      `To delete your data, email ${EMAIL} with your Instagram username or your Facebook name. We delete the conversations, comments and messages we hold within 2 business days. You can also remove access from your Instagram or Facebook settings.`,
    ] } : { id: 'data-deletion', h: 'הודעות ותגובות באינסטגרם ובפייסבוק, ומחיקת המידע', p: [
      'כשאתה מגיב על פוסט, עונה לסטורי או שולח הודעה לחשבונות האינסטגרם או לעמודי הפייסבוק של החברה, אנו מקבלים ממטא את שם המשתמש שלך, את המזהה שמטא נותנת לך מול החשבון שלנו ואת תוכן התגובה או ההודעה.',
      'המידע משמש רק כדי לענות לך: לשלוח לך את ההודעה שביקשת, למשל פרטים או קישור, ולאפשר לצוות להמשיך את השיחה. איננו שולחים הודעות למי שלא פנה אלינו קודם, ואיננו מוכרים את המידע.',
      'יומן ההודעות האוטומטיות נמחק אחרי 90 יום. השיחות עצמן נשמרות כל עוד הן נדרשות לטיפול בפנייה שלך.',
      `למחיקת המידע: שלח בקשה לכתובת ${EMAIL} וציין את שם המשתמש שלך באינסטגרם או את שמך בפייסבוק. נמחק את השיחות, התגובות וההודעות שנשמרו אצלנו לא יאוחר מ-2 ימי עסקים. אפשר גם להסיר את הגישה מתוך הגדרות האינסטגרם או הפייסבוק שלך.`,
    ] }
}
