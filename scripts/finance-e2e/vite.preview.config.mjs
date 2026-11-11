// A preview of the local finance stack that a person can open from outside this machine (a remote preview pane, a
// tunnel). The e2e config points the browser at http://127.0.0.1:54321, which exists only on this machine; here the
// page talks to its own origin and Vite forwards Supabase (auth, rest, storage) and /api to the local stack.
// Port 5181, so it never disturbs a test run on 5180.  scripts/finance-e2e/preview.sh
import { mergeConfig } from 'vite'
import base from '../../vite.config.js'

const STACK = 'http://127.0.0.1:54321'
export default mergeConfig(base, {
  // the Supabase client gets the page's own address at runtime instead of a fixed one
  define: { 'import.meta.env.VITE_SUPABASE_URL': 'window.location.origin' },
  server: {
    port: 5181, strictPort: true, open: false, host: '0.0.0.0',
    // the preview pane reaches this server under a host name Vite does not know in advance
    allowedHosts: true,
    proxy: {
      '/auth/v1': { target: STACK, changeOrigin: true },
      '/rest/v1': { target: STACK, changeOrigin: true },
      '/storage/v1': { target: STACK, changeOrigin: true },
      '/functions/v1': { target: STACK, changeOrigin: true },
      '/api': { target: 'http://127.0.0.1:54322', changeOrigin: true },
    },
  },
})
