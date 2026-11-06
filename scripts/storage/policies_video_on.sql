-- Temporary write access for recompress-videos.cjs (publishable key): replace video files in place. Run policies_video_off.sql after.
create policy "video recompress read" on storage.objects for select to anon using (bucket_id in ('engine-media','media') and metadata->>'mimetype' like 'video/%');
create policy "video recompress replace" on storage.objects for update to anon using (bucket_id in ('engine-media','media') and metadata->>'mimetype' like 'video/%') with check (bucket_id in ('engine-media','media'));
