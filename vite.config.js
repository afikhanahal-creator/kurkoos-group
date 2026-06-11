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
          /* מודולים וירטואליים של Vite (preload-helper, commonjs-helpers) משותפים
             לכל הצ'אנקים — מוצמדים ל-vendor-react (הצ'אנק העמוק ביותר שכולם
             מייבאים) כדי שלא ייווצר מעגל-ייבוא בין צ'אנקים (shared⇄vendor-react),
             שגורם לשגיאת אתחול (TDZ) ולמסך לבן. */
          if (id.startsWith('\0') || id.includes('vite/preload-helper')) return 'vendor-react'
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
