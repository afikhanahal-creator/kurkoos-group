// The site's Vite config, plus a proxy that sends /api to the local API server of the e2e stack.
import { mergeConfig } from 'vite'
import base from '../../vite.config.js'
export default mergeConfig(base, { server: { port: 5180, strictPort: true, open: false, host: '127.0.0.1', proxy: { '/api': 'http://127.0.0.1:54322' } } })
