-- Close the temporary write access of recompress-images.cjs again.
drop policy if exists "image recompress read" on storage.objects;
drop policy if exists "image recompress insert" on storage.objects;
drop policy if exists "image recompress replace" on storage.objects;
