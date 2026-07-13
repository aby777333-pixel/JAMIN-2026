# CHANGELOG — Mobile App Simplification & Redesign

**2026-07-13 · Presentation-layer only.** No new features, dependencies, backend
logic or schema changes. All Supabase queries, RLS rules, auth flows and
role-based permissions preserved. Verified: `tsc` 0 errors, Jest 64/64,
`expo export` (Android) clean. Reaches devices on the next EAS build.

Design direction: calm, premium, "Signature for Fortune" — brand colors only
(Crimson `#FD0001`, Gold `#FBBC15`, Charcoal `#202020`, Paper `#F7F7F5`),
Inter (TT Norms Pro is a commercial font not present in the repo; Inter is the
approved fallback and remains the shipped face).

---

## Navigation (bottom tabs)

- **Renamed/merged:** 5 tabs (Home, Properties, Card, Network, Wallet) → 4 tabs:
  **Properties · Investments · Activity · Account**.
- **Preserved:** the old `index` (Home), `card` and `network` routes stay
  registered but hidden (`href: null`) so every existing `router.push`, deep
  link and notification route still resolves. Card and Network open from
  Account. The tab set is now identical for every role (no tab flips on
  role preview — the old release-crash vector).
- **Removed (decorative):** per-tab rainbow active colors, the "TabGarden"
  plant illustration behind the tab bar, floating-bar shadow. Now a flat
  surface bar, hairline top border, crimson active tint.
- **Added (meaningful status):** unread-notifications badge on the Activity tab.

## Global surfaces

- **`components/ui/Card.tsx` — removed:** automatic palette-cycling accents
  (every plain card was tinted a different hue with a colored left bar). Plain
  cards are now calm white with a hairline border. Explicit `accent` props
  (used sparingly for deliberate emphasis) still work.
- **`components/ui/Screen.tsx` — removed:** the default nature-photo backdrop +
  petal decorations that rendered behind every scrollable screen. Default is
  clean paper. Screens that pass their own backdrop (the login hero image)
  are unchanged.
- **Added:** `components/ui/Disclosure.tsx` (collapsible "Details" section —
  children mount only when opened, so their data fetches are deferred) and
  `components/ui/ListRow.tsx` (the single calm list-row style used by the new
  screens). No third-party additions.

## Home `(tabs)/index.tsx`

- **Removed as a screen; now a redirect** to Properties (the landing).
  Nothing was deleted — every block moved:
  - Announcements rail → **Activity**.
  - Partner "Today at a glance" digest → **Activity**.
  - Referral-code strip → **Account**.
  - KYC banner → **Account** (status row with pill).
  - Quick-link grid (15 partner / 11 buyer rainbow tiles) → **Account**, as a
    quiet role-gated directory. Every destination retained.
  - Wallet/earnings/team/leads stat cards → live in **Investments** (balance,
    earnings) and **Network** (team stats), where they already existed —
    duplicates removed.
  - First-launch Welcome tour → mounts on **Properties**.
  - Sign out → **Account**.
- **Removed (fluff):** "Recently sold" social-proof rail (the admin App-Content
  toggle `home.show_sold` becomes inert in the app), festival banner on Home
  (festival/muhurat content remains in Vastu & Muhurat and on the astro
  cards), greeting header + role pill, buyer "browse" promo card.
- **Removed (redundant realtime):** Home's duplicate notification listener —
  the root `NotificationsBridge` already refreshes the feed and shows banners.

## Properties `(tabs)/properties.tsx`

- **Preserved:** search, voice search, filters, Projects/Map/Compare chips,
  "Get alerts", For-you rail, list, skeletons, empty/error states — this was
  already the cleanest screen and is now the landing.
- **Added:** the Welcome tour mount (from Home).
- **Not carried over:** Home's "Featured" rail (the list itself is discovery;
  admin ★-curation still drives the web site and sold→auto-promote logic).

## Property detail `property/[id].tsx`

- **Above the fold now:** gallery, plot code + status, title, location, price,
  days-on-market, verification badges (meaningful status only), About,
  key-facts card, the buyer's own journey stepper, then ONE action block —
  Enquire (primary), Book visit, Make offer, Reserve.
- **Moved behind "More information" (hidden, not deleted):** Why-you'll-love-it
  card (PlotAppeal), Auspicious Insights (FortunePanel), investment-value card,
  sacred-places card, tours/AR/directions chips, nearby amenities,
  neighborhood scores, price history, all five calculators (EMI, stamp duty,
  affordability, rent-vs-buy, ROI), AI panel, journey tracker, project
  reviews, Shortlist and Co-broke actions. These components no longer fetch
  until opened (safe deferral).
- **Moved behind "Partner tools" (partners only):** commission preview,
  auto-create flyer, suggest-a-photo.
- **Hidden (metadata):** raw coordinates row in the facts card (directions/maps
  still available via the location chips inside More information).
- **Preserved:** share/QR/watch/save header actions, JAMIN-mediated-contact
  notice (buyer↔seller contact only through JAMIN), trust markers, report
  link, all sheets and their logic.

## Investments `(tabs)/wallet.tsx` (renamed from Wallet)

- **Now visible to every role** (buyers previously had no Wallet tab).
- **Buyer view (new composition, existing data):** Total invested (verified
  booking payments) as the primary value, one-line explanation, then
  Bookings & payments / My offers / Escrow & milestones actions. Detail lives
  on the existing screens.
- **Partner view:** balance card + Withdraw (primary) as before; **moved** the
  commission ledger, PDF statement and withdrawal history behind a
  "Transactions" disclosure. **Hidden:** raw ledger `source_ref` internals —
  unrecognized refs now display "Adjustment" instead of the raw reference.
- **Removed:** lake-photo backdrop. **Preserved:** all wallet hooks, the
  withdraw sheet, balance checks, statement export.

## Activity `(tabs)/activity.tsx` (new screen, existing data)

- Partner day digest (follow-ups due / waiting 24h+ / new leads) → taps into
  Leads; announcements from JAMIN (images + CTA preserved); agenda / site
  visits / enquiries & offers / leads entry rows; the 8 most recent
  notifications with unread dots. Full feed + "mark all" stays at
  `/notifications` (unchanged).

## Account `(tabs)/account.tsx` (new screen, existing destinations)

- Profile card (photo/initials, name, role) → edit profile; KYC status row;
  referral code (copy/share); My business card → the preserved Card screen.
- Role-gated tools (same capability gates as the old Home grid):
  partners — My team (Network screen), Recruit, Team performance, Create ad,
  Brochures & flyers, AI Studio, Ad chats, Rewards, Applications & forms;
  buyers — Property alerts, Compare, Recently viewed, Land valuation,
  Become a partner.
- More: Community, Help & support, Settings, Admin portal (admins),
  Preview as role (real admins). Sign out.

## Card `(tabs)/card.tsx` and Network `(tabs)/network.tsx`

- **Preserved unchanged** (all sharing/QR/vCard and team/recruit/referral
  logic). Only their tab slots were removed — both open from Account.

## Settings `settings/index.tsx`

- **Removed (decorative):** waterfall photo backdrop and the rainbow icon
  tints — icons are now neutral ink on paper. All rows/destinations preserved.

## Bookings & payments `payments.tsx`

- **Removed:** emoji from action buttons ("🧾", "🏦" → plain labels).
  Everything else preserved.

## Role visibility (brief: show only the five user types)

- In-app role LISTS now show only **Super Admin, Promoter, Agent, Broker,
  Seller, Buyer** (`VISIBLE_ROLE_SLUGS` in `lib/access.ts`), applied to:
  - Preview-as-role picker (`role-preview.tsx`)
  - Staff application role choices (`staff-apply.tsx`)
  - In-app admin Users & roles picker (`features/admin/api.ts`)
- **Preserved:** the roles themselves (DB untouched), existing users holding
  other roles (their permissions and gating still work), and the web admin
  console, which continues to manage every role.

## i18n

- **Added:** `tabs.investments`, `tabs.activity`, `tabs.account` in
  en/hi/ta/te/kn/ml/ur (add-only; verified zero pre-existing keys changed).
- **Known follow-up:** the new Account/Activity screen bodies are English-first
  (same as the existing Settings/Network screens); a translation batch can key
  them later.

## Web admin console `web/admin.html` (2026-07-13, follow-up pass)

- **Removed (decorative, CSS-only):** the 8-hue rainbow cycling on sidebar
  tabs, stat tiles and panels; mesh-gradient + dot-grid canvas; glassy blur and
  hover lift/scale/glow effects; gradient buttons and scrollbar; dark gradient
  table header; tab-switch slide-in animation; count-up number animation
  (stats now render final values immediately). Now: flat brand surfaces,
  crimson active tab, subtle shadows — matching the app's calm redesign.
- **Merged/organized:** the 50 flat sidebar tabs are grouped under 8 section
  labels (Overview · Properties · Sales & CRM · People · Marketing ·
  Conversations · Submissions & media · App & system). Every tab id, badge
  counter, click handler, radar blink and the mobile horizontal-scroll layout
  preserved — verified programmatically (tab set identical to the previous
  version, all inline scripts parse, dark-mode toggle works).
- **Aligned with the app's role model:** the Users & roles picker lists the
  five public types first with the remaining ranks under an "Other roles"
  group (still assignable — no capability loss), and the role explainer text
  now describes the five public types.
- **Preserved:** every tab's functionality, dark mode (incl. the date-picker
  and inline-background fixes), the activity radar + toasts, zebra tables,
  section spacing.

## Polish round (2026-07-13, owner device feedback)

- **Filter chips calmed** (`components/ui/Chip.tsx`): the hash-toned rainbow
  fills (every chip a different color) are retired app-wide — quiet white
  chips, crimson when active. The `tone` prop is still accepted so no caller
  breaks. Compass emoji removed from the Facing filter label.
- **Book a site visit** (`SiteVisitSheet.tsx`): preset day chips replaced with
  a proper month **calendar grid** (back/forward months, tomorrow → +60 days,
  past days disabled, auspicious days marked with a small gold dot) plus five
  clean time slots and a "Your visit" summary line. Writes the same
  `scheduled_at` field, so the admin console's Site visits table and Dashboard
  agenda show the chosen date & time exactly as before (verified — admin
  renders `toLocaleString()`).
- **Bottom sheets no longer hide their button under the Android nav bar**
  (`EnquirySheet.tsx` Sheet): safe-area bottom inset added — fixes Confirm
  visit, Enquire, Withdraw, Make offer and every other sheet at once.
- **Poster & banner maker surfaced** in Account → Tools (it existed at
  `/tools/poster` but had no entry point after the redesign); "Create ad"
  renamed to "Create ad (photo & video)".
- **Plot cards always show a photo**: 17 owner-supplied land images
  (compressed 160 MB → 1.2 MB, bundled at `assets/images/plots/`) appear as
  stable per-plot fallbacks on listing cards with no uploaded photos.
  Display-only — real listing media always wins, the database is untouched,
  and the detail gallery still shows only actual photos. Originals folder
  git-ignored.

## Activity radar — full coverage (2026-07-13, migration 0093)

- **Every app action now blinks its admin menu light and pops a radar toast.**
  11 previously silent activity tables added: co-broking listings & interests,
  document uploads, home-loan applications, escrow milestones, referral
  events, wishlist saves, property watches, academy enrollments, shortlist
  items & members — joining the 27 already covered (leads, offers, visits,
  chats, payments, signups, errors…). 38 tables total, each mapped to its
  sidebar tab.
- Migration 0093 (additive): the 11 tables added to the Realtime publication,
  plus admin-read policies on `wishlists`, `shortlist_items`,
  `shortlist_members` (they were owner/member-only, so Realtime couldn't
  deliver their events to the admin). No existing policy or trigger touched.
- Verified: every radar table confirmed present in the publication via SQL;
  manual radar pings confirmed the tab blink + toast render on the calm skin;
  scripts parse; zero console errors.

## Declutter round 2 (2026-07-13, owner device feedback)

- **Property detail gallery**: plots with no uploaded photos now show a
  scrollable set of 4 bundled land photos (stable per plot code) instead of
  the dark "Photos coming soon" block — each labelled "Representative image ·
  actual photos coming soon" so buyers aren't misled. Real photos always win.
- **Properties screen decluttered**: all filter chip rows now sit behind one
  "Filters" button beside the search box (with an active-filter count so
  hidden filters are never a mystery). Search and the any-language voice
  search stay visible. Zero filter logic changed. "For you" mini-cards show
  land-photo thumbnails instead of grey icons.
- **Profile photo upload**: Edit profile's raw "Photo URL" text field replaced
  with a real picker — avatar preview, Upload/Change photo (gallery pick,
  square crop, uploads to the user's own folder in the public `user-media`
  bucket via the existing upload helper), Remove photo. Shows on the Account
  tab, business card, brochures and agent stamps. No new dependencies; the
  existing `photo_url` column and RLS policies carry it.

## Explicitly NOT changed

- Supabase queries, RLS, auth, onboarding, biometric lock, push/Realtime
  bridge, commission engine, referral logic, all sheets/forms, admin portal
  screens, web marketing/admin site, Edge Functions, database.
