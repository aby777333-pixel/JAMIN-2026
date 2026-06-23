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

## What's in this build

- **P0 Foundation** — Expo Router shell, NativeWind + brand tokens, Inter + JetBrains
  Mono fonts, Supabase client, decimal.js money layer, i18n (8 languages), branded
  splash & icons.
- **P1 (start)** — email-OTP login → verify → onboarding (referral binding); role-aware
  bottom tabs; live **Digital Business Card** with referral QR + share.
- **P2 DB** — the full dynamic schema (roles, hierarchy via `ltree`, projects/plans/
  property types, auto-coded plots with an auto-replacement engine, commission rules,
  append-only ledger, derived wallets, referral/CRM/booking/card tables) with **RLS
  everywhere** — migrations `supabase/migrations/0001`–`0008`, applied live.

See [`CLAUDE.md`](CLAUDE.md) for governance, [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
for the module map, and [`docs/RLS.md`](docs/RLS.md) for the security matrix.

## Setup notes

- **Email OTP:** in the Supabase dashboard, the magic-link/OTP email template must
  include `{{ .Token }}` so users receive a 6-digit code.
- **AI:** Anthropic Claude is called only from a Supabase Edge Function (never the app).

## Roadmap

P3 Buyer App · P4 Partner portals · P5 Commission engine · P6 Brochure + Photo Ad
Creator · P7 Form Builder + Admin · P8 AI · P9 Gamification + Notifications · P10
Hardening & store prep.
