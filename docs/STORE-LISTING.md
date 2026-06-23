# Store listing — paste-ready

Copy these straight into App Store Connect / Play Console. URLs:
- **Privacy policy:** https://wonderful-cupcake-0d3074.netlify.app/privacy.html
- **Support / marketing site:** https://wonderful-cupcake-0d3074.netlify.app/

---

## Names & text

- **App name:** JAMIN Properties
- **Subtitle (iOS, 30 chars):** Signature for Fortune
- **Short description (Play, 80 chars):** Discover property, calculate, book — and build a real-estate business.
- **Promo text (iOS, 170 chars):** Search property, calculate EMI & ROI, book visits. Partners: build a team, earn commissions, create AI marketing, and track everything in one app.

### Full description
```
JAMIN Properties is a complete real-estate sales ecosystem in one app.

FOR BUYERS
• Search dynamic inventory with smart filters
• Property details, photo galleries and live plot codes
• EMI and ROI calculators with exact figures
• Enquire, book a site visit, reserve and wishlist

FOR PARTNERS (agents & promoters)
• Build an unlimited team and recruit with referral links
• Transparent commissions credited automatically up your hierarchy
• Wallet, earnings and withdrawals
• Leads with follow-up scheduler
• Digital Business Card, Smart Brochures and a live, geo-verified Photo Ad Creator
• AI tools: generate listings, social posts and campaigns, score leads, and get a sales assistant
• Badges, leaderboards and real-time notifications

Everything is fully configurable by administrators — nothing is hardcoded.

Signature for Fortune.
```

- **Keywords (iOS, 100 chars):** real estate,property,plots,villa,commission,broker,EMI,ROI,leads,brochure,India,agent
- **Category:** Business (primary) · Finance (secondary, optional)
- **Content rating:** 17+ / PEGI 3 — business app, no objectionable content (declare "Unrestricted Web Access" = No)
- **Copyright:** © JAMIN Properties
- **Contact:** privacy@jaminproperties.co

---

## Screenshots — what to capture

Capture on an emulator/simulator or device, then upload per store.

Required device sizes:
- **iOS:** 6.7" (1290×2796) and 6.5" (1242×2688) — and 12.9" iPad if you mark iPad supported (`supportsTablet: true` is set).
- **Android:** phone screenshots, min 2 (1080×1920 or device-native). A 1024×500 feature graphic is also required for Play.

Suggested 6–8 shots (the app's best surfaces):
1. **Login** — branded splash/login ("Welcome to JAMIN")
2. **Properties** — discovery list with filter chips
3. **Property detail** — price + EMI/ROI calculators
4. **Digital Business Card** — QR + share
5. **Wallet** — balance, earnings, ledger
6. **Network** — team/hierarchy
7. **AI Studio** — generated marketing copy
8. **Rewards** — badges + leaderboard

How to capture:
- Android emulator: run the app, use the emulator camera/screenshot button.
- iOS simulator: `Cmd+S`.
- Or a real device with a build installed.

Tip: a 1024×500 Play **feature graphic** can reuse the brand (red `#FD0001`, gold
`#FBBC15`, the logo, tagline).

---

## Google Play — Data safety answers

Data collected & linked to the user:
| Data | Collected | Purpose | Shared | Encrypted in transit | Deletable |
|------|-----------|---------|--------|----------------------|-----------|
| Email address | Yes | Account, comms | No | Yes | Yes (on request) |
| Phone number | Yes | Account, comms | No | Yes | Yes |
| Name | Yes | Account | No | Yes | Yes |
| Photos | Yes | Ads/brochures (user-initiated) | No | Yes | Yes |
| Location (approx/precise) | Yes | Geo-verify on-site photos & visits | No | Yes | Yes |
| Financial info (commissions/wallet) | Yes | App function | No | Yes | Retained for audit |
| App activity | Yes | App function | No | Yes | Yes |

- **Data is encrypted in transit:** Yes (HTTPS/Supabase).
- **Users can request deletion:** Yes — via privacy@jaminproperties.co.
- **A privacy policy URL is provided:** Yes (above).

## Apple — privacy "nutrition" labels

Declare these data types (all **linked to the user**, used for **App Functionality**;
none used for tracking/advertising):
Contact Info (email, phone, name), User Content (photos), Location, Financial Info,
Identifiers (account/push token), Usage Data.

---

## Build & submit (recap — full details in docs/STORE.md)

```bash
eas login && eas init
eas build --platform android --profile production   # .aab for Play
eas build --platform ios     --profile production   # for App Store
eas submit --platform android --profile production
eas submit --platform ios     --profile production
```

For an installable test **APK** (not the store bundle):
```bash
eas build --platform android --profile preview      # → downloadable .apk URL
```
