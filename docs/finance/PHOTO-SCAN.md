# A photographed receipt, made to look scanned

Code: `src/pages/finance/docscan.js` (the same code in the browser and on the server), `api.prepareImage` (an upload or a
photo taken in the system), `whatsapp.js` `straightenJpeg` (a photo that came by WhatsApp).

What it does: the paper is found (the largest light shape in the picture), everything around it (the table) is cut away,
the angle is straightened as if the paper lay flat under a scanner, and the paper is whitened a little. No AI and no
network, so it costs nothing and takes a fraction of a second.

What is kept: the straightened picture becomes the document's file (the thumbnail, the reading, the accountant's report,
Google Drive). The photo as it was taken is kept with the document as an attachment ("הצילום המקורי, לפני חיתוך ויישור").
The document's fingerprint is that of the photo as sent, so the same photo sent twice is still one document.

When it does nothing: a picture that is already a sheet (a scan, a screenshot, a PDF), a sheet on a white table, a light
shape that is not a believable sheet (it must fill its four-sided outline by 85%, cover 12%–93% of the picture, be convex
and not a sliver). Then the picture is kept exactly as it was, and there is no extra attachment.

Not covered: e-mail attachments (they are almost always digital files), a crumpled or folded receipt (the corners are
found, the folds stay), a receipt held in a hand over a light background.

Tests: scenarios `SCANCROP` (WhatsApp: a real receipt on a dark table, a made-up one at an angle on wood, a screenshot)
and `CAP` (a photo taken in the system) in `scripts/finance-e2e/run.mjs`.

## Cropping by hand (the crop button)

In the document viewer, a photo (JPEG, PNG, WebP) has a crop button (`CropEditor.jsx`), like the document scanner in
iPhone Notes:

1. **Corners.** The photo with four corners, placed on the paper by the same detection (or on the frame when none is
   found). A corner is dragged by mouse or finger, with a magnifier that shows the spot under the finger; Tab reaches each
   corner and the arrows move it (Shift: five times as far). "זיהוי אוטומטי" puts the corners back on the paper, "כל
   התמונה" on the frame. Corners that cross are marked red and "המשך" waits.
2. **Result.** The flat page in a look: colour (whiter paper), grey, black and white (each pixel against the mean of its
   neighbourhood, so a shadow does not turn black), or as photographed; and a quarter turn.
3. **Save** (`crop-save` on the server): the new picture becomes the document's file. The photo as it was taken is kept
   as an attachment, once; every later edit starts again from it. An earlier crop that nothing else uses is deleted
   (storage). Google Drive gets the new picture on the archive's next run. The change is in the document's history
   (`file_cropped`). Admins and finance managers may crop any document; an employee only their own, before approval.

While the editor is open it owns the keyboard (the document panel's arrows do not move to the next document).

Test: scenario `CROPEDIT`.
