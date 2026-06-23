-- JAMIN Properties — 0010 partner wallet: balance-checked withdrawal request (§5.05).
-- A withdrawal is recorded as 'requested'; admin approval -> 'paid' appends the debit
-- (handle_withdrawal_paid), which is what actually moves the derived balance.

create or replace function public.request_withdrawal(p_amount numeric, p_rail text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_self uuid := auth.uid();
  v_bal  numeric(18,2);
  v_id   uuid;
begin
  if v_self is null then raise exception 'not authenticated'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'invalid amount'; end if;

  select coalesce(balance, 0) into v_bal from public.wallets where user_id = v_self;
  if coalesce(v_bal, 0) < p_amount then
    raise exception 'insufficient balance';
  end if;

  insert into public.withdrawals (user_id, amount, rail, status)
  values (v_self, p_amount, p_rail, 'requested')
  returning id into v_id;
  return v_id;
end $$;

revoke execute on function public.request_withdrawal(numeric, text) from public, anon;
grant execute on function public.request_withdrawal(numeric, text) to authenticated;
