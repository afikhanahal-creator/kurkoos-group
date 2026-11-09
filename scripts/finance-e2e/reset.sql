-- wipes the test data between e2e runs (local stack only)
truncate public.fin_audit, public.fin_exports, public.fin_integration_secrets, public.fin_integrations, public.fin_summaries, public.fin_sync_runs,
  public.fin_agent_runs, public.fin_rules, public.fin_mail_seen, public.fin_mailbox_secrets, public.fin_documents, public.fin_mailboxes,
  public.fin_suppliers, public.fin_projects, public.fin_members restart identity cascade;
delete from public.fin_businesses;
insert into public.fin_businesses (name, sort) values ('קורקוס גרופ', 0);
update public.fin_automations set last_run_at = null, last_status = null, last_error = null, next_run_at = null, enabled = true;
delete from storage.objects where bucket_id = 'finance-docs';
delete from auth.users;
delete from public.fin_rule_hits; delete from public.fin_document_allocations;
delete from public.fin_categories where name in ('פרסום ושיווק', 'ייעוץ הנדסי');
update public.fin_settings set value = '"controlled"' where key = 'supplier_mode';
update public.fin_settings set value = '50000' where key = 'second_approval_amount';
truncate public.fin_whatsapp_inbox, public.fin_whatsapp_senders, public.fin_cloud_synced, public.fin_cloud_secrets, public.fin_cloud_targets cascade;
truncate public.fin_outbound_queue, public.fin_outbound_secrets, public.fin_outbound, public.fin_oauth_used, public.fin_deliveries cascade;
truncate public.fin_skipped;
update public.fin_settings set value = '""' where key = 'accountant_email';
update public.fin_settings set value = '[]' where key = 'mfa_required_roles';
truncate public.fin_login_events;
update public.fin_settings set value = 'false' where key = 'onboarding_enabled';
