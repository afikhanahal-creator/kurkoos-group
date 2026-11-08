-- wipes the test data between e2e runs (local stack only)
truncate public.fin_audit, public.fin_exports, public.fin_integration_secrets, public.fin_integrations, public.fin_summaries, public.fin_sync_runs,
  public.fin_agent_runs, public.fin_rules, public.fin_mail_seen, public.fin_mailbox_secrets, public.fin_documents, public.fin_mailboxes,
  public.fin_suppliers, public.fin_projects, public.fin_members restart identity cascade;
delete from public.fin_businesses;
insert into public.fin_businesses (name, sort) values ('קורקוס גרופ', 0);
update public.fin_automations set last_run_at = null, last_status = null, last_error = null, next_run_at = null, enabled = true;
delete from storage.objects where bucket_id = 'finance-docs';
delete from auth.users;
