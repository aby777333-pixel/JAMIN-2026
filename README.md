# JAMIN Properties — Mobile App

> **Signature for Fortune.**

Cross-platform (iOS + Android) mobile app for the JAMIN Properties real-estate sales
ecosystem — a fully-dynamic property platform with a 7-level hierarchy & commission
network, inventory, buyer & partner apps, viral referrals, a Digital Business Card,
AI and gamification. Built with **Expo + Expo Router + Supabase**.

## Quick start

```bash
npm install
cp .env.example .env     # fill EXPO_PUBLIC_SUPABASE_URL / _ANON_KEY (already set for this project)
npm start                # then press i / a, or scan the QR in Expo Go
```

Other scripts:

```bash
npm run android   # build & run on Android
npm run ios       # build & run on iOS (macOS)
npm run typecheck # tsc --noEmit
npm test          # jest (money math, …)
```

## What's in this build — **all 16 modules, complete**

- **Foundation** — Expo Router, NativeWind + brand tokens, Inter + JetBrains Mono,
  Supabase, decimal.js money layer, i18n (English + 7 Indian languages), branded splash/icons.
- **Auth & onboarding** — email-OTP → profile → referral binding → hierarchy placement; KYC.
- **Buyer app** — discovery (search/filters), property detail, EMI & ROI calculators,
  dynamic enquiry, site-visit booking, reserve, wishlist.
- **Partner portals** — team/downline, recruit-share, leads + follow-up scheduler,
  wallet/earnings/ledger + balance-checked withdrawals, partner dashboard.
- **Commission engine** — deterministic Postgres engine credits the agent + the whole
  hierarchy on a closed sale; append-only ledger → derived wallets (verified e2e).
- **Marketing** — Digital Business Card (QR + vCard + channels), Smart Brochures, and a
  live-camera + GPS **Photo Ad Creator**; referral-attributed sharing.
- **Dynamic Form Builder + Admin Portal** — render any form schema; manage users/roles,
  KYC, approvals (incl. Close-Sale firing the engine), rules, analytics & audit.
- **AI** — Claude via a single Edge Function (8 features incl. lead scoring + assistant).
- **Gamification + notifications** — badges, leaderboards, Realtime in-app notifications,
  push, preferences.
- **Hardening** — biometric app-lock, 8-language UI, EAS build config, store metadata.

The full schema (migrations `0001`–`0018`) + two Edge Functions are applied/deployed live.
See [`CLAUDE.md`](CLAUDE.md) for governance, [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
for the module map, [`docs/RLS.md`](docs/RLS.md) for the security matrix, and
[`docs/STORE.md`](docs/STORE.md) to build & ship.

## Setup notes

- **Email OTP:** the Supabase magic-link/OTP email template must include `{{ .Token }}`.
- **AI:** set `ANTHROPIC_API_KEY` in the `ai-generate` Edge Function secrets.
- **Push & first admin:** run `eas init`; bootstrap the first admin — see `docs/STORE.md`.

## Build & ship

See [`docs/STORE.md`](docs/STORE.md). Earlier roadmap (now done):

P3 Buyer App · P4 Partner portals · P5 Commission engine · P6 Brochure + Photo Ad
Creator · P7 Form Builder + Admin · P8 AI · P9 Gamification + Notifications · P10
Hardening & store prep.
