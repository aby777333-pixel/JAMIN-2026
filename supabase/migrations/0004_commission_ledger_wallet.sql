-- JAMIN Properties — 0004 money: append-only ledger, derived wallet, withdrawals.
-- §14: every monetary value is NUMERIC; the ledger is immutable (append-only);
-- the wallet balance is DERIVED from the ledger and never hand-edited.

create table public.commission_ledger (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  source_ref text not null,                    -- e.g. 'sale:<property_id>', 'withdrawal:<id>'
  role_id    uuid references public.roles(id),
  amount     numeric(18,2) not null check (amount >= 0),
  direction  text not null check (direction in ('credit','debit')),
  status     text not null default 'posted',
  created_at timestamptz not null default now()
);
create index idx_ledger_user on public.commission_ledger(user_id);

-- Append-only guard.
create or replace function public.prevent_ledger_mutation()
returns trigger language plpgsql as $$
begin
  raise exception 'commission_ledger is append-only';
end $$;
create trigger trg_ledger_immutable
  before update or delete on public.commission_ledger
  for each row execute function public.prevent_ledger_mutation();

create table public.wallets (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid unique not null references public.profiles(id) on delete cascade,
  balance    numeric(18,2) not null default 0,
  updated_at timestamptz not null default now()
);

-- Derive wallet balance from each ledger row.
create or replace function public.apply_ledger_to_wallet()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_delta numeric(18,2) := case when new.direction = 'credit' then new.amount else -new.amount end;
begin
  insert into public.wallets (user_id, balance) values (new.user_id, v_delta)
  on conflict (user_id) do update
    set balance = public.wallets.balance + v_delta, updated_at = now();
  return new;
end $$;
create trigger trg_ledger_to_wallet
  after insert on public.commission_ledger
  for each row execute function public.apply_ledger_to_wallet();

create table public.withdrawals (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  amount       numeric(18,2) not null check (amount > 0),
  status       text not null default 'requested'
                 check (status in ('requested','approved','paid','rejected')),
  rail         text,                           -- 'upi' | 'bank' | ... (pluggable PSP, D3)
  reference    text,
  requested_at timestamptz not null default now(),
  settled_at   timestamptz
);
create index idx_withdrawals_user on public.withdrawals(user_id);

-- Paying a withdrawal appends a debit; the wallet trigger reduces the balance.
create or replace function public.handle_withdrawal_paid()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'paid' and coalesce(old.status,'') <> 'paid' then
    new.settled_at := now();
    insert into public.commission_ledger (user_id, source_ref, amount, direction, status)
    values (new.user_id, 'withdrawal:' || new.id, new.amount, 'debit', 'posted');
  end if;
  return new;
end $$;
create trigger trg_withdrawal_paid
  before update of status on public.withdrawals
  for each row execute function public.handle_withdrawal_paid();
