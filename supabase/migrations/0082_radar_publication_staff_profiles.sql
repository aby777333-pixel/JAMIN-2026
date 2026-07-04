-- JAMIN Properties — 0082 admin activity-radar coverage for the newest tables.
-- Adds staff_applications (new role applications) and profiles (new user
-- signups) to the supabase_realtime publication so the web-admin radar blinks
-- and pops a toast the moment they happen. Publication-only: RLS still governs
-- who receives the events (admin session passes auth_is_admin), and no table,
-- policy or function changes — nothing can regress.
do $$
begin
  begin
    alter publication supabase_realtime add table public.staff_applications;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.profiles;
  exception when duplicate_object then null;
  end;
end $$;
