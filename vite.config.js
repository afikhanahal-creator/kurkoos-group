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
        // קוד-ספליטינג מפורש: כל קוד האדמין (כולל עורך התמונות הכבד) נכנס
        // לצ'אנק נפרד שנטען רק לפי דרישה — האתר הציבורי קל ומהיר יותר במובייל.
        manualChunks(id) {
          if (id.includes('/src/pages/admin/') || id.includes('/src/components/admin/')) return 'admin'
        },
      },
    },
  },
})
