-- Temporary write access for the Meta capture run (publishable key). Run before up.cjs, and run policies_off.sql after.
create policy "meta capture upload" on storage.objects for insert to anon with check (bucket_id = 'engine-media' and name like 'blob/meta/%');
create policy "meta capture replace" on storage.objects for update to anon using (bucket_id = 'engine-media' and name like 'blob/meta/%') with check (bucket_id = 'engine-media' and name like 'blob/meta/%');
create policy "meta capture rows insert" on public.engine_docs for insert to anon with check (collection = 'comp_shots' and id like 'meta\_%');
create policy "meta capture rows update" on public.engine_docs for update to anon using (collection = 'comp_shots' and id like 'meta\_%') with check (collection = 'comp_shots' and id like 'meta\_%');
create policy "meta capture rows read" on public.engine_docs for select to anon using (collection = 'comp_shots' and id like 'meta\_%');
