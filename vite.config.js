import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
  },
  build: {
    rollupOptions: {
      output: {
        /* קוד-ספליטינג מפורש:
           - ספריות-ליבה משותפות (React/Router, framer-motion, Supabase) יוצאות
             לצ'אנקים ייעודיים עם caching ארוך-טווח. בלעדיהם Rollup עלול לקבע
             מודולים משותפים בתוך צ'אנק האדמין — מה שגרם ל-entry הציבורי לייבא
             סטטית את האדמין (modulepreload + CSS חוסם-רינדור בכל ביקור!).
           - כל קוד האדמין (כולל עורך התמונות הכבד) בצ'אנק נפרד שנטען רק לפי
             דרישה. שאר ה-node_modules (כמו @imgly) נשארים בברירת המחדל של
             Rollup כדי שמודולים שנטענים דינמית לא ייגררו לטעינה מוקדמת. */
        manualChunks(id) {
          /* מודולים וירטואליים של Vite (כמו ה-preload-helper) משותפים לכל הצ'אנקים —
             חייבים להיות ב'shared', אחרת ה-entry ייבא סטטית את צ'אנק האדמין. */
          if (id.startsWith('\0') || id.includes('vite/preload-helper')) return 'shared'
          if (id.includes('node_modules')) {
            if (id.includes('framer-motion')) return 'vendor-motion'
            if (id.includes('@supabase/')) return 'vendor-supabase'
            if (/[\\/]node_modules[\\/](react|react-dom|scheduler|react-router|react-router-dom)[\\/]/.test(id)) return 'vendor-react'
            return undefined
          }
          /* מודולים משותפים לאתר ולאדמין (מילוני i18n, lib) מקובעים לצ'אנק 'shared' —
             אחרת Rollup עלול לשבץ אותם בתוך צ'אנק האדמין ולגרור אותו לכל ביקור. */
          if (id.includes('/src/lib/') || id.includes('/src/i18n/')) return 'shared'
          if (id.includes('/src/pages/admin/') || id.includes('/src/components/admin/')) return 'admin'
        },
      },
    },
  },
})
