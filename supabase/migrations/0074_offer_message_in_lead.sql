-- 0074: show the buyer's typed message on offer-sourced lead timelines.
-- The app stores offers.message (make_offer RPC), but lead_from_offer (0072)
-- built the timeline summary from the amount only, so the CRM showed
-- "Made an offer of ₹X" and silently dropped what the client wrote.

-- 1) Trigger fn: append the message to the summary + keep it in event data.
--    (The trigger itself already points at this function name — no re-create.)
create or replace function public.lead_from_offer() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.capture_lead(new.buyer_id, null, null, 'offer', new.property_id,
    'Made an offer of ₹' || to_char(new.amount, 'FM99,99,99,999')
      || case when nullif(btrim(coalesce(new.message, '')), '') is null then ''
              else ' — "' || left(btrim(new.message), 300) || '"' end,
    jsonb_strip_nulls(jsonb_build_object(
      'offer_id', new.id, 'amount', new.amount,
      'message', nullif(btrim(coalesce(new.message, '')), ''))),
    'qualified');
  return new;
exception when others then return new;
end $$;

-- 2) Backfill: existing offer events captured without the message get it
--    appended (idempotent — skips events that already carry one).
update public.lead_events e
set summary = e.summary || ' — "' || left(btrim(o.message), 300) || '"',
    data    = e.data || jsonb_build_object('message', btrim(o.message))
from public.offers o
where (e.data->>'offer_id') = o.id::text
  and nullif(btrim(coalesce(o.message, '')), '') is not null
  and not (e.data ? 'message');
