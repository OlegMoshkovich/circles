# Push notifications — setup & TestFlight testing

On-device push for ValMia. Every in-app `notifications` row (circle/event invites,
join requests, approvals) is mirrored to the recipient's devices via Expo Push.

**Push only works in a real build (TestFlight / production / EAS dev build) on a
physical device — never in Expo Go (SDK 53+ removed remote push) or simulators.**

## What's already in the code

- `expo-notifications` + `expo-device` installed; `expo-notifications` plugin and
  iOS `aps-environment` entitlement added to `app.json`.
- `lib/pushNotifications.ts` — requests permission, gets the Expo push token,
  upserts it to `device_tokens`.
- `App.tsx` `PushRegistrar` — registers the token after sign-in and routes a
  notification tap to the in-app inbox (`MyProfile`).
- `supabase/add_device_tokens.sql` — `device_tokens` table + Clerk-scoped RLS.
- `supabase/functions/send-push/` — webhook-triggered Expo Push sender.

## One-time setup

### 1. Database
Run both SQL files against the project (Supabase SQL editor or CLI):
- `supabase/add_device_tokens.sql`
- (already required) `supabase/fix_clerk_insert_rls.sql` — defines
  `public.requesting_user_id()` used by the new RLS policies.

### 2. APNs / FCM credentials (so Expo can deliver)
- iOS: `eas credentials` → iOS → set up a **Push Notifications key (APNs)**.
  (Uses your Apple Team `Q8RCPVAZM5`.)
- Android: `eas credentials` → Android → upload the **FCM** server credential.

### 3. Deploy the sender function
```bash
supabase functions deploy send-push
```
Set its secrets (Dashboard → Edge Functions → Secrets, or `supabase secrets set`):
- `PUSH_WEBHOOK_SECRET` — a long random string.
- `EXPO_ACCESS_TOKEN` — only if you turned on Expo "enhanced push security".

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically.

### 4. Create the database webhook
Dashboard → Database → Webhooks → Create:
- Table: `public.notifications`, Events: **INSERT**
- URL: `https://<PROJECT_REF>.supabase.co/functions/v1/send-push`
- HTTP header: `x-webhook-secret` = the same value as `PUSH_WEBHOOK_SECRET`

## Build & test on TestFlight

```bash
eas build --platform ios --profile production
eas submit --platform ios --latest
```
Then in TestFlight:
1. Install on a physical iPhone, sign in — accept the notification permission prompt.
2. Confirm a row landed in `device_tokens` for your user.
3. From a second account, invite your test user to a circle or event.
4. Background/close the app → the push should appear; tapping it opens the inbox.

### Quick manual check (no second account)
Grab your `expo_push_token` from `device_tokens` and:
```bash
curl -X POST https://exp.host/--/api/v2/push/send \
  -H 'Content-Type: application/json' \
  -d '{"to":"ExponentPushToken[...]","title":"Test","body":"Hello from ValMia","sound":"default"}'
```
A direct push confirms credentials + device registration independently of the webhook.

## Troubleshooting
- **No token in `device_tokens`**: must be a physical device on a real build, with
  permission granted. Check the EAS `projectId` resolves in `lib/pushNotifications.ts`.
- **Token but no push**: APNs/FCM credentials not set in `eas credentials`, or the
  webhook secret/header mismatch. Check the function logs (Dashboard → Edge Functions).
- **`DeviceNotRegistered`**: expected after uninstall — the function prunes those tokens.
