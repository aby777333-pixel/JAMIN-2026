-- 0078: put the admin-relevant activity tables on the Realtime publication so
-- the web admin can blink/notify live on new rows. Guarded per table (skips
-- missing tables and existing members) — safe to re-run. RLS still applies to
-- subscribers, so only admins (who can SELECT these rows) receive events.
do $$
declare t text;
begin
  foreach t in array array[
    'ad_messages','offers','site_visits','buyer_requirements','nri_requests',
    'form_submissions','property_media_submissions','leads','web_signups',
    'payments','withdrawals','reviews','user_media','ai_generations',
    'call_logs','shared_ads','disputes','bookings','shortlists'
  ] loop
    if exists (select 1 from information_schema.tables
               where table_schema = 'public' and table_name = t)
       and not exists (select 1 from pg_publication_tables
                       where pubname = 'supabase_realtime'
                         and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
