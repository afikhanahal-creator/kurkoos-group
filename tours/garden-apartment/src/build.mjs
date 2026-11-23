// בונה קובץ index.html אחד: Three.js + הסיור + הממשק, בלי תלות ברשת.
// הרצה: npm install && npm run build (בתיקייה tours/garden-apartment)
import { build } from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const res = await build({
  entryPoints: [join(here, 'tour.js')], bundle: true, format: 'iife', minify: true, write: false, loader: { '.jpg': 'dataurl' },
  target: 'es2020', legalComments: 'none',
});
let js = res.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const html = readFileSync(join(here, 'template.html'), 'utf8').replace('/*__BUNDLE__*/', () => js);
const out = join(here, '..', 'index.html');
writeFileSync(out, html);
console.log('wrote', out, (html.length / 1024).toFixed(0), 'KB');
