# Google Drive import (October 2026)

How the Drive media reached the content engine's library, so it can be repeated for new folders.

1. Inventory: a background agent paged the Drive MCP (`search_files`, images and videos, all folders) and
   resolved full folder paths → `drive_inventory.json` (130 folders, 473 images, 84 videos, 2.4 GB).
2. Plan: `drive_prep.py` keeps project and property folders, maps folder names to project keys
   (חנקין, הנרייטה, מוהליבר, בן גוריון, זרובבל, רמחל, יורדי הים, השקמים, החומש), kinds render/site/ad, drops
   "ישנים", "לא רלוונטי", "נמכר/הושכר", campaign creatives, logos, guide icons, duplicates by title and size,
   images over 2.6 MB and videos over 15.5 MB → `drive_plan.json` (157 images, 14 videos).
3. Download: `download_file_content` per file (base64, persisted to a tool-result file when large);
   `drive_decall.py` decodes every persisted result into `drive/<id>.<ext>`. Files under about 60 KB come
   back inline and were skipped. Two videos were over the 10 MB download limit.
4. Pack: `drive_pack.py` downscales images to 2000 px JPEG under 1.2 MB and transcodes videos to H.264 mp4
   with the ffmpeg bundled in imageio-ffmpeg → `drive_up/`, `drive_docs.json`.
5. Upload: artifact asset uploads (25 files per call) → `drive_assets.txt` (drive id → asset id).
6. Register: one document `batches/drive1` holds all 141 items ({id, meta}); V114 in the page registers each
   item in the library on load and V112 builds posts from the new batch. Videos are 10 documents in
   `videos` (status queued, source drive) so the videos room can send them to the editor.

Result: 141 photos (general 47, henrietta 28, bengurion 15, hankin 14, ramhal 12, zrubavel 8, shikmim 6,
yordei 5, mohaliver 4, humash 2) and 10 videos. In the test the batch produced 282 new posts.
