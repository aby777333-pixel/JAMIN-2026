# JAMIN Properties — Architecture

A fully-dynamic real-estate sales ecosystem. 16 core systems (227+ features) per the
Platform Blueprint, delivered across phases P0–P10 (see CLAUDE.md / SuperPrompt §15).

## Layers

```
Expo Router (src/app)                file-based screens, role-aware (tabs)
  └─ features/*                       module logic (auth, inventory, buyer, …)
       └─ api (TanStack Query) + stores (Zustand)
            └─ lib/supabase           typed Supabase client (RLS-enforced)
                 └─ Postgres + RLS    the source of truth (dynamic config + entities)
                      └─ Edge Functions (Deno)   AI, payouts, referral attribution
```

- **Server state** → TanStack Query. **Local/session/UI state** → Zustand. Never mix.
- **Money** → `lib/money.ts` (decimal.js) on the client; `NUMERIC` + append-only
  ledger in the DB. The two never disagree because rounding is centralised.

## The 16 modules → where they live

| # | Module | Status | Home |
|---|--------|--------|------|
| 1 | User hierarchy & commission network | DB ✓ | `profiles` ltree, `auth_*` helpers, Network tab |
| 2 | Registration & onboarding | ✓ | `(auth)`, `complete_onboarding` RPC |
| 3 | Inventory management | DB ✓ | `properties`, plot codes, auto-replacement trigger |
| 4 | Buyer app | P3 | Properties tab |
| 5 | Agent portal | P4 | features/agent |
| 6 | Promoter portal | P4 | features/promoter |
| 7 | Smart brochure system | P6 | features/brochure |
| 8 | Viral referral engine | DB ✓ / P5 | `referral_events`, Card funnel |
| 9 | Property photo ad creator | P6 | features/photo-ad (camera + GPS) |
| 10 | Dynamic commission engine | DB ✓ / P5 | `commission_rules` + `commission_ledger` |
| 11 | Dynamic form builder | P7 | `form_definitions` |
| 12 | Admin portal | P7 | features/admin |
| 13 | Backend services | ongoing | Edge Functions |
| 14 | AI features | P8 | Edge Function (Claude) |
| 15 | Gamification | P9 | `gamification_rules` |
| 16 | Core platform rule | enforced | RLS + dynamic config |

## Inventory auto-replacement engine (§3)

`UPDATE properties SET status='sold'` fires `handle_plot_sold()` which: (1) audits a
`sold` event, (2) emits a `commission_due` event for the engine to consume (P5), and
(3) promotes the next available plot in the same project/plan/type (`attrs.featured`).
Plot codes (`PREFIX-0001`) are assigned by a race-safe per-prefix counter.

## Money flow (§14)

`sale → commission_due event → (P5) engine resolves commission_rules → append credit to
commission_ledger → wallet trigger updates derived balance`. Withdrawals append a debit
when marked paid. The ledger and audit_logs are immutable (mutation raises).

## Digital Business Card (§6) — the referral entry point

Auto-filled from the profile, rendered with `react-native-view-shot`, carries the
user's referral QR/link (`/r/<code>`). Scans/shares are tracked (`card_scans`,
`card_shares`) and attribute every downstream signup back to the sharer.
