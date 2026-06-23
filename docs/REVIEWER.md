# Reviewer access — App Store & Play Console

JAMIN uses **passwordless email-OTP** sign-in, so a reviewer can't log in without
receiving the 6-digit code. Both stores require a working demo account. Pick **one**
of the approaches below (the dedicated-inbox one needs no code changes and works for
both stores).

> **Prerequisite either way:** the Supabase **email OTP template must include
> `{{ .Token }}`** (Auth → Email Templates), and email must actually deliver. The
> built-in Supabase mailer is heavily rate-limited — for production + review, set a
> **custom SMTP** (Auth → SMTP Settings) so OTP emails arrive reliably.

## Option A (recommended) — dedicated reviewer inbox, no code change

1. Create a review email you control, e.g. `jaminreview@gmail.com`.
2. Open the app once with that email and complete onboarding so a profile exists
   (optionally elevate it: `update profiles set role_id=(select id from roles where
   slug='agent') where email='jaminreview@gmail.com';` so the reviewer sees partner
   features).
3. In **App Store Connect → App Review Information** and **Play Console → App access**,
   provide the demo credentials and the inbox password so the reviewer can read the OTP:

   ```
   Sign-in is passwordless (email one-time code).
   Demo account email: jaminreview@gmail.com
   To receive the 6-digit code, sign in to that inbox: <inbox password>
   Steps: open the app → enter the email → tap Send code → read the code from the
   inbox → enter it → you're in.
   ```

## Option B — Supabase test OTP (phone flow only)

Supabase **Auth → Providers → Phone → Test OTP** lets you register a fixed phone +
fixed code that always succeeds (no SMS sent). This only helps if you expose phone
login; the current app logs in by **email**, so Option A is the fit unless you add a
phone-login path for review.

## Android — easiest of all

Distribute the **APK / internal-testing build** straight to the reviewer's device and
add their Google account to a **Closed/Internal testing** track in Play Console. They
can still sign in via Option A.

## Checklist before submitting for review

- [ ] Email OTP template contains `{{ .Token }}`
- [ ] Custom SMTP configured (so OTP emails deliver)
- [ ] Demo account created (and elevated if you want partner features visible)
- [ ] Review notes pasted with the demo email + how to get the code
- [ ] `ANTHROPIC_API_KEY` set (AI screens work) — or they degrade gracefully
- [ ] First Super Admin bootstrapped (see docs/STORE.md)
