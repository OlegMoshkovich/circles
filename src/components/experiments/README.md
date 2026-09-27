# Experiment: native SwiftUI settings via `@expo/ui`

A proof-of-concept that renders the Profile **Settings** controls with **real
SwiftUI** on iOS (and can render Jetpack Compose on Android) using
[`@expo/ui`](https://docs.expo.dev/versions/latest/sdk/ui/), instead of the
hand-built React Native rows.

## What's here

- `NativeSettingsForm.ios.tsx` — the SwiftUI implementation: a native `Form`
  with `Section`s, `Picker`s (Theme, Language) and `Button`s (Mission, Replay),
  driven by the same `BackgroundContext` / `LanguageContext` state as the rest
  of the app. Only the rendering is native; all logic stays in JS.
- `NativeSettingsForm.tsx` — no-op fallback for Android/web (Metro picks the
  `.ios` file on iOS automatically). Android keeps the existing RN rows.

## How to try it

Native views don't appear in Expo Go — you need a **development build**:

```bash
# one-time, per native-dependency change
eas build --profile development --platform ios
# then
npx expo start --dev-client
```

Open **Profile → Settings** on iOS. To compare against the original RN UI, flip
`USE_NATIVE_SETTINGS` in `screens/MyProfileScreen.tsx` to `false`.

## Notes / caveats

- `@expo/ui` is **`0.2.0-beta.9`** (the version bundled with Expo SDK 54) — the
  API is still alpha and will change between SDK releases.
- Requires the **New Architecture** (default in SDK 54).
- The native primitives cover lists/forms/controls well, but can't express the
  app's fully custom layouts (glass cards, bespoke theming) — so this is a good
  fit for settings-style screens, not a wholesale replacement.
- Scope is intentionally one screen. If the direction feels right, the next
  candidates are other form/list screens (create/edit modals).
