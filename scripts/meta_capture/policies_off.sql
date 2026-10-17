-- Close the temporary write access again. Always run after up.cjs.
drop policy if exists "meta capture upload" on storage.objects;
drop policy if exists "meta capture replace" on storage.objects;
drop policy if exists "meta capture rows insert" on public.engine_docs;
drop policy if exists "meta capture rows update" on public.engine_docs;
drop policy if exists "meta capture rows read" on public.engine_docs;
