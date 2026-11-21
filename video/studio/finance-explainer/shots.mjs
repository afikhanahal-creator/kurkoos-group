// Takes the screenshots of the explainer from the local test system (after demo-data.py was applied).
//   node video/studio/finance-explainer/shots.mjs          (needs the suite's local stack: scripts/finance-e2e/services.sh)
import { createRequire } from 'node:module'
import { execSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const here = path.dirname(fileURLToPath(import.meta.url))
let pw; try { pw = createRequire(import.meta.url)('playwright') } catch { pw = createRequire('/opt/node22/lib/node_modules/')('playwright') }
const APP = 'http://127.0.0.1:5180/admin/finance'
const browser = await pw.chromium.launch({ env: { ...process.env, LANG: 'C.UTF-8' } })
async function session(viewport, scale, phone, shots) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: scale, locale: 'he-IL', isMobile: phone, hasTouch: phone })
  const page = await ctx.newPage()
  await page.goto(APP); await page.waitForSelector('input[type=email]')
  await page.fill('input[type=email]', 'admin@kurkoos.test'); await page.fill('input[type=password]', 'Passw0rd!x'); await page.keyboard.press('Enter')
  await page.waitForSelector('input[type=email]', { state: 'detached', timeout: 20000 }); await page.waitForTimeout(3500)
  for (const [route, name, width] of shots) {
    await page.goto(APP + route); await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(2200)
    const png = path.join(here, 'shots', name + '.png'); await page.screenshot({ path: png })
    execSync(`ffmpeg -loglevel error -y -i "${png}" -vf scale=${width}:-1 -q:v 3 "${path.join(here, 'shots', name + '.jpg')}" && rm "${png}"`)
    console.log(name)
  }
  await ctx.close()
}
await session({ width: 1440, height: 900 }, 2, false, [['', 'home', 2400], ['/today', 'today', 2400], ['/documents', 'documents', 2400], ['/report', 'report', 2400], ['/drive', 'drive', 2400]])
await session({ width: 390, height: 844 }, 3, true, [['', 'phone', 780]])
await browser.close()
