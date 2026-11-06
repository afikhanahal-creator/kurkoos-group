-- Close the temporary write access of recompress-videos.cjs again.
drop policy if exists "video recompress read" on storage.objects;
drop policy if exists "video recompress replace" on storage.objects;
