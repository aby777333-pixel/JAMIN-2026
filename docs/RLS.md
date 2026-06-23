# JAMIN Properties — RLS policy matrix

**Default deny.** RLS is enabled on every public table (migration 0006). Access is
scoped three ways:

- **self** — `id = auth.uid()` / `user_id = auth.uid()`
- **admin** — `auth_is_admin()` (role's `is_admin` flag; Super Admin)
- **subtree** — `hierarchy_path <@ auth_hierarchy_path()` (a manager sees their downline)

The `auth_role_slug()`, `auth_is_admin()`, `auth_hierarchy_path()` helpers are
`SECURITY DEFINER` so reading the caller's own profile inside a policy does **not**
recursively re-trigger `profiles` RLS (the classic recursion bug). Trigger-only writer
functions are `SECURITY DEFINER` too and have had RPC `EXECUTE` revoked (migration 0008).

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| roles, territories, projects, plans, property_types, commission_rules, form_definitions, gamification_rules, referral_rules, system_config, card_templates | any authenticated | admin | admin | admin |
| profiles | self ∪ admin ∪ subtree | (trigger only) | self ∪ admin | admin |
| properties | any authenticated | admin | admin | admin |
| inventory_events | admin ∪ actor | (definer triggers) | — | — |
| commission_ledger | self ∪ admin | (definer triggers / service) | append-only | append-only |
| wallets | self ∪ admin | (definer trigger) | (definer trigger) | — |
| withdrawals | self ∪ admin | self (request) | admin (approve/pay) | — |
| referral_events | sharer ∪ admin | sharer = self | — | — |
| leads | owner ∪ admin ∪ subtree | owner = self ∪ admin | owner ∪ admin | owner ∪ admin |
| follow_ups | via lead owner ∪ admin | via lead | via lead | via lead |
| bookings | buyer ∪ agent ∪ admin | buyer ∪ agent | admin ∪ agent | — |
| payments | admin ∪ booking party | (admin/service) | — | — |
| business_cards | self ∪ admin | self ∪ admin | self ∪ admin | self ∪ admin |
| card_shares | card owner ∪ admin | card owner ∪ admin | — | — |
| card_scans | card owner ∪ admin | scanner = self | — | — |
| notifications | self ∪ admin | admin | self | — |
| audit_logs | admin | (definer/service) | append-only | append-only |
| plot_counters | (none — internal) | via definer fn | via definer fn | — |

## Invariants

- The commission **ledger** and **audit_logs** are append-only (UPDATE/DELETE raise).
- Wallet balance is never written directly — only via the `apply_ledger_to_wallet`
  trigger, so it always equals the signed ledger sum.
- New users land as `buyer`, self-rooted; `complete_onboarding` binds them into a
  referrer's subtree. Role elevation is an admin action.
