-- JAMIN Properties — 0087 bank-transfer payments (no gateway for now).
-- Online gateways (Razorpay/UPI) are OFF; buyers pay by NEFT/RTGS/IMPS to the
-- company account and upload a proof (screenshot/photo + UTR). Admin verifies
-- in the Payments tab. ADDITIVE ONLY: the gateway code paths stay untouched.

-- Bank details are DYNAMIC (admin-editable in the Payments tab; app reads live).
insert into public.system_config (key, value) values ('bank_details', jsonb_build_object(
  'beneficiary', 'JAMIN PROPERTY DEVELOPERS I PVT LTD',
  'account',     '120028974517',
  'ifsc',        'CNRB0000941',
  'bank',        'CANARA BANK',
  'branch',      'THOUSAND LIGHTS',
  'note',        'Transfer via NEFT / RTGS / IMPS from any bank app, then upload your proof below. Our team verifies within 24 hours.'
)) on conflict (key) do nothing;

create table if not exists public.bank_transfers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete set null,
  property_id uuid references public.properties(id) on delete set null,
  amount numeric not null check (amount > 0),
  txn_ref text,                         -- UTR / bank reference number
  transfer_date date,
  proof_url text,                       -- uploaded screenshot / photo / receipt
  proof_path text,
  note text,
  status text not null default 'pending' check (status in ('pending', 'verified', 'rejected')),
  review_note text,
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists bank_transfers_status_idx on public.bank_transfers (status, created_at desc);
create index if not exists bank_transfers_user_idx on public.bank_transfers (user_id, created_at desc);

alter table public.bank_transfers enable row level security;
create policy bank_transfers_read on public.bank_transfers
  for select using (user_id = auth.uid() or public.auth_is_admin());
create policy bank_transfers_insert on public.bank_transfers
  for insert with check (user_id = auth.uid() and status = 'pending');
grant select, insert on public.bank_transfers to authenticated;

-- Every submission lands in the admin Audit log.
create or replace function public.bank_transfer_audit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.audit_logs (actor_id, action, entity, entity_id, payload)
  values (new.user_id, 'bank_transfer_submitted', 'bank_transfers', new.id,
          jsonb_build_object('amount', new.amount, 'txn_ref', new.txn_ref,
                             'booking_id', new.booking_id, 'has_proof', new.proof_url is not null));
  return new;
end $$;
drop trigger if exists trg_bank_transfer_audit on public.bank_transfers;
create trigger trg_bank_transfer_audit
  after insert on public.bank_transfers
  for each row execute function public.bank_transfer_audit();

-- Verify / reject — decisions only via this RPC (atomic, audited, notifies the
-- buyer; a verified transfer with a booking also writes the payments row so
-- the existing "Paid ✓" logic lights up with zero changes elsewhere).
create or replace function public.review_bank_transfer(
  p_id uuid, p_approve boolean, p_note text default null
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_t public.bank_transfers%rowtype;
begin
  if not public.auth_is_admin() then raise exception 'admin only'; end if;
  select * into v_t from public.bank_transfers where id = p_id for update;
  if not found then raise exception 'transfer not found'; end if;
  if v_t.status <> 'pending' then raise exception 'already reviewed'; end if;

  update public.bank_transfers
     set status = case when p_approve then 'verified' else 'rejected' end,
         review_note = nullif(trim(coalesce(p_note, '')), ''),
         reviewed_by = auth.uid(), reviewed_at = now()
   where id = p_id;

  if p_approve and v_t.booking_id is not null then
    insert into public.payments (booking_id, amount, status, method, txn_ref, purpose)
    values (v_t.booking_id, v_t.amount, 'paid', 'bank_transfer', v_t.txn_ref, 'booking');
  end if;

  insert into public.notifications (user_id, type, title, body, data)
  values (v_t.user_id, 'payment',
          case when p_approve then 'Payment verified ✓' else 'Payment proof needs attention' end,
          case when p_approve
               then 'Your bank transfer of ₹' || trim(to_char(v_t.amount, 'FM999999999990')) || ' has been verified. Thank you!'
               else coalesce(nullif(trim(coalesce(p_note, '')), ''),
                             'We could not verify this transfer — please check the details and submit again.') end,
          jsonb_build_object('bank_transfer_id', p_id,
                             'status', case when p_approve then 'verified' else 'rejected' end));

  perform public.app_audit(
    case when p_approve then 'bank_transfer.verified' else 'bank_transfer.rejected' end,
    'bank_transfers', p_id,
    jsonb_build_object('amount', v_t.amount, 'booking_id', v_t.booking_id, 'note', p_note));
end $$;
revoke execute on function public.review_bank_transfer(uuid, boolean, text) from public, anon;
grant execute on function public.review_bank_transfer(uuid, boolean, text) to authenticated;

-- Admin activity radar: blink + toast on new proofs (Payments tab).
do $$
begin
  begin
    alter publication supabase_realtime add table public.bank_transfers;
  exception when duplicate_object then null;
  end;
end $$;
