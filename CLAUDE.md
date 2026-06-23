# JAMIN Properties — Mobile App (governance)

Cross-platform mobile app (iOS + Android) for the JAMIN Properties real-estate sales
ecosystem: a fully-dynamic property platform with a 7-level hierarchy, commission
network, inventory, buyer & partner apps, viral referrals, a Digital Business Card,
AI and gamification. Brand line: **"Signature for Fortune."**

## The three non-negotiable rules

1. **Everything is dynamic (§13).** Roles, hierarchies, projects, plans, property
   types, commission models, forms, referral rules and gamification are **DB rows**,
   never hardcoded enums. Adding a new role/type/rule at runtime must require **zero**
   code change. If you reach for a hardcoded list of business values, stop.
2. **Money is exact (§14).** Every monetary / commission / EMI / ROI value goes
   through `src/lib/money.ts` (decimal.js). **No IEEE-754 floats for money, ever.**
   DB amounts are `NUMERIC`; the commission ledger is **append-only**; the wallet
   balance is **derived** from the ledger and never hand-edited. Currency = INR.
3. **Ask before adding dependencies.** The stack below is locked. Do not add a
   library outside it without asking first.

## Brand tokens (on every screen)

| token | hex | use |
|-------|-----|-----|
| red | `#FD0001` | primary brand |
| red.deep | `#C70000` | gradients, pressed |
| gold | `#FBBC15` | accent, secondary CTA |
| gold.deep | `#C8911E` | fine rules, "signature" text |
| ink | `#1A1A1A` | primary text |
| charcoal | `#202020` | headings, dark surfaces |
| muted | `#74746E` | secondary text |
| line | `#E6E7E2` | hairlines |
| paper | `#F7F7F5` | app background |
| surface | `#FFFFFF` | cards |

Canonical source: `src/theme/tokens.ts` (app) and `tailwind.config.js` (NativeWind) —
keep them in sync. Typography: **Inter** (TT Norms Pro fallback) for text,
**JetBrains Mono** (tabular) for all numbers/money/codes. Mobile-first: everything
stays inside the screen — wrap toolbars, use `min-w-0`, never assume a desktop width.

## Tech stack (locked — §2)

Expo SDK 56 + Expo Router (file routes, strict TS) · NativeWind (Tailwind) ·
TanStack Query (server state) + Zustand (local/UI state) · Supabase (Postgres, Auth/OTP,
Storage, Realtime, Edge Functions) · **decimal.js** (money) · react-hook-form + zod ·
expo-camera / expo-location / expo-media-library · react-native-qrcode-svg + react-native-svg ·
react-native-view-shot (card/brochure render) · expo-sharing + RN Share · expo-notifications ·
expo-secure-store + expo-local-authentication · i18next (en default; hi, ta, te, kn, mr, bn, gu) ·
Jest + React Native Testing Library.
Additions made (first-party Expo / the named fonts): `@expo-google-fonts/inter`,
`@expo-google-fonts/jetbrains-mono`, `expo-clipboard`.
AI (§10): Anthropic Claude **only** via a Supabase Edge Function — never call Anthropic
directly from the app; the key lives only in Edge Function env.

## Project structure

```
src/app/            Expo Router routes — (auth), (tabs), onboarding, index gate
src/components/      ui/ primitives + brand/ logo
src/features/        one folder per module (auth, …)
src/lib/             supabase, money, i18n, query, cn, env
src/stores/          Zustand (auth)
src/theme/           tokens
src/types/           generated database types + domain types
src/locales/         i18n json
supabase/migrations/ SQL (every table + RLS); supabase/seed.sql demo data
```

## Database & security

- Supabase project `oaqwnjgaypmuafvnfhxv` ("JAMIN 2026"). Migrations 0001–0008 applied.
- **RLS everywhere, default deny.** Policies scope by `auth.uid()`, by role
  (`auth_is_admin()`), and by subtree (`hierarchy_path <@ auth_hierarchy_path()`).
  Helper functions are `SECURITY DEFINER` to avoid the classic profiles-policy
  recursion. Full matrix in `docs/RLS.md`.
- Hierarchy uses `ltree`; labels are hyphen-stripped UUID hex.
- Regenerate types after any schema change → `src/types/database.ts`.

## Auth (§4, D1–D3)

Email OTP is mandatory (D2); phone collected at onboarding, verified lazily before
first withdrawal. Wallet is ledger-first (D3) — a real UPI/PSP rail plugs in behind
an adapter later. **Dashboard setup:** the Supabase email OTP template must include
`{{ .Token }}` so users receive a 6-digit code.

## Commands

```
npm start            # expo dev server
npm run android|ios  # run on device/emulator
npm run typecheck    # tsc --noEmit
npm test             # jest
```

## Build sequence (§15)

P0 Foundation ✓ · P1 Auth & Onboarding ✓ · P2 Dynamic config & inventory (DB ✓) ·
P3 Buyer App ✓ (discovery, filters, detail, EMI/ROI calculators, dynamic enquiry,
site-visit booking, reserve, wishlist; map view deferred pending Maps API key) ·
P4 Partner portals ✓ (team/downline, recruit-share, leads + follow-up scheduler,
referral-attributed sharing, wallet/earnings/ledger + balance-checked withdrawals,
partner Home dashboard; partner UI requires role ≥ agent — elevate via admin/SQL) ·
P5 Commission engine ✓ (deterministic Postgres engine: resolve commission_rules on a
closed sale → credit agent (direct) + hierarchy (team overrides) into the ledger,
idempotent + audited; close_sale admin RPC; referral attribution event; mirrored by a
Jest-tested pure-TS engine + in-app partner earning preview) · P6 Business Card + Smart
Brochure + Photo Ad ✓ (vCard + multi-channel ShareChannels on the card; brochure
library from brochure_templates → personalized view-shot poster + share; Photo Ad
Creator = camera/upload + GPS reverse-geocode + timestamp → branded auto-ad, format
selector, save-to-gallery + share; referral-attributed artifact logging) · P7 Form
Builder + Admin · P8 AI · P9 Gamification + Notifications + Analytics · P10 Hardening
& store prep.

Marketing deps added (first-party Expo): expo-image-picker, expo-file-system.
