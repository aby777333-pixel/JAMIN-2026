-- JAMIN Properties — 0022 payment-gateway columns (ADDITIVE; MOD04 booking payments + tracking, MOD10 payouts).
-- The `payments` table + buyer/admin RLS already exist (0005). We only add gateway tracking fields.
-- All writes go through the `payments` Edge Function (service role); buyers READ their own via existing RLS.

alter table public.payments
  add column if not exists gateway            text,           -- 'razorpay' (pluggable)
  add column if not exists gateway_ref        text,           -- payment-link / order id
  add column if not exists gateway_payment_id text,           -- settled payment id
  add column if not exists short_url          text,           -- hosted checkout URL to open
  add column if not exists purpose            text default 'booking';

create index if not exists payments_gateway_ref_idx on public.payments (gateway_ref);
create index if not exists payments_booking_idx on public.payments (booking_id);
