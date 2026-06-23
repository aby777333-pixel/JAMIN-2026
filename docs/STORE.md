# JAMIN Properties — Launch & Store Guide

Everything needed to take the app from this repo to the App Store / Play Store.

## 1. Build (EAS)

```bash
npm i -g eas-cli
eas login
eas init                 # creates the Expo project + writes extra.eas.projectId (also enables real push tokens)
eas build --profile preview --platform android   # internal APK
eas build --profile production --platform all     # store builds
eas submit --profile production --platform ios|android
```

Profiles live in `eas.json` (development / preview / production). `runtimeVersion`
is `appVersion`-policy. Bundle IDs: `co.jaminproperties.app` (iOS + Android).

## 2. Required dashboard configuration

| What | Where | Why |
|------|-------|-----|
| **Email OTP template** must include `{{ .Token }}` | Supabase → Auth → Email Templates | so sign-in sends a 6-digit code, not a magic link |
| **`ANTHROPIC_API_KEY`** secret (optional `AI_MODEL`) | Supabase → Edge Functions → `ai-generate` → Secrets | enables all AI features (defaults to `claude-opus-4-8`) |
| **EAS `projectId`** | `eas init` | real Expo push tokens (`NotificationsBridge` registers once present) |
| **First admin** | run once in SQL editor | bootstrap an admin who can then manage roles in-app |

```sql
-- bootstrap the first Super Admin (replace the email)
update public.profiles set role_id = (select id from public.roles where slug='super_admin')
where email = 'you@example.com';
```

## 3. Store listing copy

- **Name:** JAMIN Properties
- **Subtitle:** Signature for Fortune
- **Short:** Discover property, calculate, book — and build a real-estate business.
- **Description:** JAMIN Properties is a complete real-estate sales ecosystem. Buyers
  search dynamic inventory, calculate EMI & ROI, compare and wishlist, enquire and book
  site visits. Partners build a team across an unlimited hierarchy, earn transparent
  commissions, generate branded business cards, brochures and on-site photo ads, score
  leads with AI, and track everything — leaderboards, badges and live notifications
  included. Fully configurable by admins; nothing hardcoded.
- **Keywords:** real estate, property, plots, villas, commission, MLM, brochure, EMI,
  ROI, leads, India
- **Primary color:** `#FD0001` · **Category:** Business / Real Estate

## 4. Optional — closed-app auto push

In-app + foreground notifications work today (Realtime + local banners). For push to a
**closed** app, fire the deployed `push-send` function whenever a notification row is
created. Set a shared secret, redeploy `push-send` with `verify_jwt:false` + a header
check, then add a `pg_net` trigger:

```sql
-- requires the pg_net extension + a vault secret 'push_secret'
create or replace function public.on_notification_push()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform net.http_post(
    url := 'https://oaqwnjgaypmuafvnfhxv.functions.supabase.co/push-send',
    headers := jsonb_build_object('Content-Type','application/json',
      'x-push-secret', (select decrypted_secret from vault.decrypted_secrets where name='push_secret')),
    body := jsonb_build_object('user_id', new.user_id, 'title', new.title, 'body', new.body, 'data', new.data)
  );
  return null;
end $$;
create trigger trg_notification_push after insert on public.notifications
  for each row execute function public.on_notification_push();
```

## 5. Pre-launch checklist

- [ ] `eas init` done (projectId set) — push tokens register
- [ ] `ANTHROPIC_API_KEY` set — AI live
- [ ] Email OTP template carries `{{ .Token }}`
- [ ] First admin bootstrapped
- [ ] Seed catalog reviewed (`supabase/seed.sql`) or real inventory loaded
- [ ] App icons / splash reviewed (generated from the logo in `assets/`)
- [ ] Localisation reviewed (en + hi/ta/te/kn/mr/bn/gu)
