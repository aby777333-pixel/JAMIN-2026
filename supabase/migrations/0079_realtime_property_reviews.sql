-- 0079: 0078 listed a non-existent table name ('reviews') — the real one is
-- property_reviews. One unknown table in a Realtime subscription fails the
-- WHOLE channel, which silenced the admin activity radar entirely.
do $$
begin
  if not exists (select 1 from pg_publication_tables
                 where pubname='supabase_realtime' and schemaname='public'
                   and tablename='property_reviews') then
    alter publication supabase_realtime add table public.property_reviews;
  end if;
end $$;
