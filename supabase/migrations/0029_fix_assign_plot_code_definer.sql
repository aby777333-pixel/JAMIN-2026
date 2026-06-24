-- JAMIN Properties — 0029 fix: admin "Add property" failed with
-- "permission denied for function next_plot_code".
--
-- Root cause: the BEFORE INSERT trigger fn public.assign_plot_code() was SECURITY
-- INVOKER, so on an authenticated insert it executed as that user — whose EXECUTE on
-- public.next_plot_code(uuid) was revoked in migration 0008 (hardening). The call was
-- therefore denied. next_plot_code is already SECURITY DEFINER; making the trigger fn
-- SECURITY DEFINER too lets the plot-code assignment chain run as the owner, keeping
-- next_plot_code revoked from the public API. Behaviour is otherwise identical.
create or replace function public.assign_plot_code()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.plot_code is null or length(new.plot_code) = 0 then
    new.plot_code := public.next_plot_code(new.property_type_id);
  end if;
  return new;
end $$;

-- Trigger fn — never called directly via the API.
revoke execute on function public.assign_plot_code() from public, anon, authenticated;
