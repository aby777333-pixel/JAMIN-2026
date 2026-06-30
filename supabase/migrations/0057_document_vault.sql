-- JAMIN Properties — 0057 per-deal document vault.
-- Users keep agreements / IDs / KYC docs in one place, optionally tied to a lead,
-- booking or property. e-Signature is scaffolded as a status field (none →
-- requested → signed) for a provider to fulfil later. Files live in user-media.
-- Fully additive.

create table if not exists public.deal_documents (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references public.profiles(id) on delete cascade,
  lead_id     uuid references public.leads(id) on delete set null,
  booking_id  uuid references public.bookings(id) on delete set null,
  property_id uuid references public.properties(id) on delete set null,
  title       text not null,
  kind        text not null default 'document',
  doc_url     text not null,
  doc_path    text,
  sign_status text not null default 'none' check (sign_status in ('none','requested','signed')),
  created_at  timestamptz not null default now()
);
create index if not exists idx_deal_docs_owner on public.deal_documents(owner_id);

alter table public.deal_documents enable row level security;
drop policy if exists deal_docs_own on public.deal_documents;
create policy deal_docs_own on public.deal_documents for all to authenticated
  using (owner_id = auth.uid() or public.auth_is_admin())
  with check (owner_id = auth.uid() or public.auth_is_admin());
grant select, insert, update, delete on public.deal_documents to authenticated;
