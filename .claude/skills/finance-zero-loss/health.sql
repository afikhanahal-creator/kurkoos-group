-- Finance zero-loss health check (read-only). Run against production with the Supabase tool; see SKILL.md for how to read it.
select json_build_object(
  'scan', json_build_object(
    'jobs', (select json_agg(x) from (select m.email, j.status, j.phase, j.date_from, j.date_to, j.error,
              (select count(*) from fin_scan_segments s where s.job_id = j.id and s.status <> 'done') segments_left,
              (select max(updated_at) from fin_scan_segments s where s.job_id = j.id) last_progress,
              (select count(*) from fin_scan_items i where i.mailbox_id = j.mailbox_id and i.status in ('failed', 'unreadable')) problems,
              j.report
            from fin_scan_jobs j join fin_mailboxes m on m.id = j.mailbox_id order by j.created_at desc limit 10) x),
    'coverage', (select json_agg(x) from (select m.email, m.status,
              (select min(date_from) from fin_scan_jobs j where j.mailbox_id = m.id and j.status in ('queued', 'running', 'paused', 'done', 'incomplete')) covered_from
            from fin_mailboxes m) x)),
  'pipeline', json_build_object(
    'by_status', (select json_agg(x) from (select status, count(*) n from fin_documents group by 1) x),
    'stuck', (select count(*) from fin_documents where status = 'processing' and created_at < now() - interval '1 hour'),
    'skipped_by_class', (select json_agg(x) from (select document_class, count(*) n from fin_skipped group by 1 order by 2 desc limit 12) x)),
  'drive', json_build_object(
    'connection', (select json_agg(json_build_object('email', account_email, 'status', status, 'enabled', enabled, 'auto', auto, 'error', last_error, 'last_sync', last_sync_at, 'last_check', last_reconcile_at, 'last_report', last_reconcile)) from fin_cloud_targets where provider = 'gdrive' and status <> 'revoked'),
    'eligible_docs', (select count(*) from fin_documents d where public.fin_drive_eligible(d.status, d.doc_type, d.file_mime, d.file_path) and d.status <> 'duplicate'),
    'rows', (select json_agg(x) from (select status, count(*) n, count(*) filter (where excluded) excluded, max(attempts) max_attempts from fin_drive_files group by 1) x),
    'gap_without_row', (select json_agg(x) from (select d.id, d.supplier_name, d.doc_type, d.status, d.created_at from fin_documents d, fin_cloud_targets t
              where t.provider = 'gdrive' and t.status = 'active' and t.enabled and t.auto and public.fin_drive_eligible(d.status, d.doc_type, d.file_mime, d.file_path)
                and (t.business_id is null or d.business_id = t.business_id)
                and not exists (select 1 from fin_drive_files f where f.target_id = t.id and f.document_id = d.id)
                and d.created_at < now() - interval '10 minutes' limit 20) x),
    'problems', (select json_agg(x) from (select f.status, f.attempts, left(f.error, 140) error, f.organized_name, f.updated_at from fin_drive_files f where f.status in ('failed', 'needs_review') order by f.updated_at desc limit 20) x),
    'checks', (select json_agg(x) from (select trigger, status, phase, started_at, finished_at, error, report from fin_drive_reconciles order by started_at desc limit 5) x)),
  'cron', json_build_object(
    'job', (select json_agg(json_build_object('name', jobname, 'schedule', schedule, 'active', active)) from cron.job where jobname = 'finance-scan-tick'),
    'last_runs', (select json_agg(x) from (select d.status, d.start_time from cron.job_run_details d join cron.job j on j.jobid = d.jobid where j.jobname = 'finance-scan-tick' order by d.start_time desc limit 3) x),
    'last_answers', (select json_agg(x) from (select status_code, left(content, 160) body, created from net._http_response where content like '%segments%' order by created desc limit 3) x))
) as health;
