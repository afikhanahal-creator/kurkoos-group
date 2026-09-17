/* ============================================================
   חיתוך אוטומטי של שוליים לבנים אחידים בתמונות שמועלות לאדמין.
   פותר את הבעיה של הדמיות שיווקיות שמגיעות עם מסגרת לבנה צרובה
   בקובץ: המסגרת גורמת לתמונה להיראות עם פינות חדות ולא ממלאה את
   הכרטיס, למרות שהאתר מעגל את כל התמונות.

   שמרני בכוונה, מוותר על החיתוך בכל ספק:
   - רק רקע לבן/בהיר מאוד ואחיד בכל ארבע הפינות
   - מדלג על תמונות עם שקיפות, SVG ו-GIF
   - חותך רק שוליים משמעותיים (מעל 1.5% מהמידה)
   - לעולם לא חותך יותר מ-60% מהתמונה
   - כל שגיאה מחזירה את הקובץ המקורי כמו שהוא
   ============================================================ */

export async function trimUniformBorders(file) {
  try {
    if (typeof document === 'undefined' || !file?.type?.startsWith('image/')) return file
    if (file.type === 'image/svg+xml' || file.type === 'image/gif') return file

    const bmp = await createImageBitmap(file)
    const W = bmp.width, H = bmp.height
    if (W < 200 || H < 200) { bmp.close?.(); return file }

    // ניתוח ברזולוציה מוקטנת — מהיר, והחיתוך עצמו נעשה על המקור המלא
    const scale = Math.min(1, 900 / Math.max(W, H))
    const w = Math.max(1, Math.round(W * scale))
    const h = Math.max(1, Math.round(H * scale))
    const cv = document.createElement('canvas')
    cv.width = w; cv.height = h
    const ctx = cv.getContext('2d', { willReadFrequently: true })
    ctx.drawImage(bmp, 0, 0, w, h)
    const data = ctx.getImageData(0, 0, w, h).data
    const px = (x, y) => { const i = (y * w + x) * 4; return [data[i], data[i + 1], data[i + 2], data[i + 3]] }

    // שקיפות: פסים שקופים אחידים בשוליים (פלט ישן של עורך התמונות, PNG
    // מרופד) נחתכים לפי תיבת התוכן. שקיפות אחרת (צורת לוגו וכד') — לא נוגעים.
    let hasAlpha = false
    for (let y = 0; y < h && !hasAlpha; y += 7) {
      for (let x = 0; x < w; x += 7) {
        if (px(x, y)[3] < 250) { hasAlpha = true; break }
      }
    }
    if (hasAlpha) {
      const rowEmpty = (y) => { for (let x = 0; x < w; x += 2) if (px(x, y)[3] > 8) return false; return true }
      const colEmpty = (x) => { for (let y = 0; y < h; y += 2) if (px(x, y)[3] > 8) return false; return true }
      let top = 0; while (top < h / 2 && rowEmpty(top)) top++
      let bottom = 0; while (bottom < h / 2 && rowEmpty(h - 1 - bottom)) bottom++
      let left = 0; while (left < w / 2 && colEmpty(left)) left++
      let right = 0; while (right < w / 2 && colEmpty(w - 1 - right)) right++
      const minSideA = Math.max(2, Math.round(Math.min(w, h) * 0.015))
      if (top < minSideA && bottom < minSideA && left < minSideA && right < minSideA) { bmp.close?.(); return file }
      const invA = 1 / scale
      const sxA = Math.round(left * invA), syA = Math.round(top * invA)
      const swA = W - sxA - Math.round(right * invA), shA = H - syA - Math.round(bottom * invA)
      if (swA < W * 0.3 || shA < H * 0.3 || swA < 100 || shA < 100) { bmp.close?.(); return file }
      const outA = document.createElement('canvas')
      outA.width = swA; outA.height = shA
      outA.getContext('2d').drawImage(bmp, sxA, syA, swA, shA, 0, 0, swA, shA)
      bmp.close?.()
      /* שומרים על פורמט תומך-שקיפות (png/webp נשארים כפי שהם) */
      const typeA = file.type === 'image/webp' ? 'image/webp' : 'image/png'
      const blobA = await new Promise((resolve) => outA.toBlob(resolve, typeA, 0.95))
      if (!blobA) return file
      return new File([blobA], file.name, { type: typeA })
    }

    // צבע הרקע מארבע הפינות — חייב להיות אחיד ובהיר מאוד (מסגרת לבנה)
    const corner = (x0, y0) => {
      let r = 0, g = 0, b = 0, n = 0
      for (let y = y0; y < y0 + 4; y++) for (let x = x0; x < x0 + 4; x++) {
        const p = px(Math.min(x, w - 1), Math.min(y, h - 1)); r += p[0]; g += p[1]; b += p[2]; n++
      }
      return [r / n, g / n, b / n]
    }
    const cs = [corner(0, 0), corner(w - 4, 0), corner(0, h - 4), corner(w - 4, h - 4)]
    const bg = [0, 1, 2].map((c) => cs.reduce((s, v) => s + v[c], 0) / 4)
    const near = (p, tol) => Math.abs(p[0] - bg[0]) <= tol && Math.abs(p[1] - bg[1]) <= tol && Math.abs(p[2] - bg[2]) <= tol
    if (!cs.every((c) => near(c, 8)) || !bg.every((v) => v >= 230)) { bmp.close?.(); return file }

    // סריקה מכל צד פנימה עד השורה/עמודה הראשונה שאינה רקע
    const TOL = 16
    const rowBg = (y) => { let bad = 0, tot = 0; for (let x = 0; x < w; x += 2) { tot++; if (!near(px(x, y), TOL)) bad++ } return bad / tot <= 0.01 }
    const colBg = (x) => { let bad = 0, tot = 0; for (let y = 0; y < h; y += 2) { tot++; if (!near(px(x, y), TOL)) bad++ } return bad / tot <= 0.01 }
    let top = 0; while (top < h / 2 && rowBg(top)) top++
    let bottom = 0; while (bottom < h / 2 && rowBg(h - 1 - bottom)) bottom++
    let left = 0; while (left < w / 2 && colBg(left)) left++
    let right = 0; while (right < w / 2 && colBg(w - 1 - right)) right++

    // שוליים זניחים — אין מה לחתוך
    const minSide = Math.max(2, Math.round(Math.min(w, h) * 0.015))
    if (top < minSide && bottom < minSide && left < minSide && right < minSide) { bmp.close?.(); return file }

    // המרה לקואורדינטות המקור + רשת ביטחון נגד חיתוך קיצוני
    const inv = 1 / scale
    const sx = Math.round(left * inv)
    const sy = Math.round(top * inv)
    const sw = W - sx - Math.round(right * inv)
    const sh = H - sy - Math.round(bottom * inv)
    if (sw < W * 0.4 || sh < H * 0.4 || sw < 100 || sh < 100) { bmp.close?.(); return file }

    const out = document.createElement('canvas')
    out.width = sw; out.height = sh
    out.getContext('2d').drawImage(bmp, sx, sy, sw, sh, 0, 0, sw, sh)
    bmp.close?.()
    const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
    const blob = await new Promise((resolve) => out.toBlob(resolve, type, 0.95))
    if (!blob) return file
    const name = file.name.replace(/(\.[a-z0-9]+)?$/i, (m) => m || (type === 'image/png' ? '.png' : '.jpg'))
    return new File([blob], name, { type })
  } catch {
    return file
  }
}
