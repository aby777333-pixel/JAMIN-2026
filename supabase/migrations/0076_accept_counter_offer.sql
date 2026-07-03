-- 0076: buyer can accept a seller's counter-offer (completes the negotiation
-- loop — seller counters via respond_offer, buyer accepts here or withdraws).

create or replace function public.accept_counter_offer(p_offer uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_self uuid := auth.uid(); v_seller uuid; v_prop uuid; v_amount numeric;
begin
  if v_self is null then raise exception 'not authenticated'; end if;
  select property_id, counter_amount into v_prop, v_amount
    from public.offers where id = p_offer and buyer_id = v_self and status = 'countered';
  if v_prop is null then raise exception 'no counter-offer to accept'; end if;

  update public.offers
    set status = 'accepted',
        amount = coalesce(v_amount, amount) -- the agreed figure becomes the offer amount
    where id = p_offer;

  select seller_id into v_seller from public.properties where id = v_prop;
  if v_seller is not null then
    insert into public.notifications(user_id, type, title, body, data)
    values (v_seller, 'offer', 'Counter-offer accepted',
            'The buyer accepted your counter-offer.',
            jsonb_build_object('offer_id', p_offer, 'property_id', v_prop));
  end if;
  perform public.app_audit('offer.counter_accepted', 'offer', p_offer, '{}'::jsonb);
end $$;
revoke execute on function public.accept_counter_offer(uuid) from public, anon;
grant  execute on function public.accept_counter_offer(uuid) to authenticated;
