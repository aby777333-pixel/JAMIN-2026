-- JAMIN Properties — 0048 hardening for the 0043–0047 additions.
-- (1) Pin search_path on the pure band helper (linter: function_search_path_mutable).
-- (2) Revoke anon/public execute on trigger + internal helper functions so they
--     are not reachable via PostgREST RPC. Triggers still fire (they run as the
--     table owner) and internal PERFORM calls still work (owner has execute).
-- Pure hardening — no behavioural change.

create or replace function public.lead_score_band(p_score int)
returns text language sql immutable set search_path = pg_catalog, public as $$
  select case
    when p_score is null then null
    when p_score >= 70 then 'hot'
    when p_score >= 40 then 'warm'
    else 'cold'
  end;
$$;

revoke execute on function public.log_lead_stage_change()                  from public, anon, authenticated;
revoke execute on function public.sync_lead_score_band()                   from public, anon, authenticated;
revoke execute on function public.notify_matching_buyers()                 from public, anon, authenticated;
revoke execute on function public.notify_price_drop()                      from public, anon, authenticated;
revoke execute on function public.radar_notify(uuid, text)                 from public, anon, authenticated;
