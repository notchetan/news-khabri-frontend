# Store submission

What the config already covers, and the checklist of what still has to
happen by hand in App Store Connect / Play Console (or needs a decision).

## Already in the repo

### `app.json`

- **`ios.infoPlist.ITSAppUsesNonExemptEncryption: false`** — the app only
  uses HTTPS/TLS (exempt), so this skips the export-compliance question on
  every TestFlight/App Store upload. Leave it unless a non-exempt crypto
  dependency is ever added.
- **`ios.privacyManifests`** — declares the four required-reason API
  categories the app's stack touches: `UserDefaults` (`CA92.1`, from
  AsyncStorage), `FileTimestamp` (`C617.1`), `SystemBootTime` (`35F9.1`),
  `DiskSpace` (`E174.1`). `NSPrivacyTracking: false` — no ATT prompt, no
  IDFA, no ad SDKs. Expo SDK 54 auto-generates a baseline
  `PrivacyInfo.xcprivacy`; `@expo/config-plugins`' `mergePrivacyInfo`
  dedupes by API type and unions the reason codes, so these entries merge
  cleanly rather than clobbering the autogen. **Verify on a Mac** with
  `npx expo prebuild --platform ios` and open the generated file — that's
  the only way to see the full merged result (iOS prebuild can't run on
  Windows).
- **`android.blockedPermissions`** — strips
  `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE` (legacy, scoped
  storage since API 33; the app has no file/gallery picker) and
  `SYSTEM_ALERT_WINDOW` (RN template default for the old floating dev
  button; not used by the modern dev menu). Confirmed via
  `npx expo prebuild --platform android` — the three come out
  `tools:node="remove"`. `INTERNET` and `VIBRATE` stay; `POST_NOTIFICATIONS`
  et al. still merge in from `expo-notifications`' AAR.
  - If a dev build's menu ever misbehaves, `SYSTEM_ALERT_WINDOW` is the
    first thing to un-block.

### `eas.json`

- `cli.appVersionSource: "remote"` + `build.production.autoIncrement: true`
  — EAS owns the iOS build number / Android versionCode; don't set them in
  `app.json`.
- Each build profile has a `channel` (`development` / `preview` /
  `production`) matching `app.json`'s `runtimeVersion` policy `appVersion`,
  so `eas update` can target them.
- `submit.production.android.track: "internal"` — first upload lands on
  the internal track; promote in Play Console.

### `targetSdkVersion`

React Native 0.81 / Expo SDK 54 default to **`targetSdk = 36`,
`compileSdk = 36`** (`react-native/gradle/libs.versions.toml`, read by
Expo's root-project gradle plugin). Play's floor for new apps is 35, so
this is already satisfied — no `expo-build-properties` override needed.

## Still to do by hand

### Blocked on decisions / infrastructure

- [ ] **Deployed HTTPS backend** + `build.preview.env.EXPO_PUBLIC_API_URL`
      and `build.production.env.EXPO_PUBLIC_API_URL` set to it (see the
      README's `.env` note). iOS ATS blocks plaintext HTTP in release.
- [ ] **Privacy policy at a public URL** — the in-app copy
      (`preferences/privacy.tsx`) was rewritten to match reality (PR #14)
      but still needs a hosted URL for both store listings and a lawyer
      pass.
- [ ] **Universal links** — needs a real domain hosting
      `/.well-known/apple-app-site-association` and `assetlinks.json`
      before `ios.associatedDomains` / `android.intentFilters` (autoVerify)
      can be added. Deliberately not configured yet; a placeholder domain
      would break the entitlement.
- [ ] **Sentry** — create the project, set `EXPO_PUBLIC_SENTRY_DSN` per
      env and `SENTRY_ORG` / `SENTRY_PROJECT` / `SENTRY_AUTH_TOKEN` as EAS
      secrets (see `src/observability/sentry.ts`).
- [ ] **Google iOS OAuth client** — create it (bundle ID
      `com.newskhabri.app`) and set `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` in
      `.env`; `app.config.js` refuses an iOS EAS build without it. See
      `docs/google-sign-in.md`.
- [ ] **Google Android SHA-1s** — register the Play App Signing key's and
      the EAS upload key's SHA-1 on the Android OAuth client, or sign-in
      fails with `DEVELOPER_ERROR` on every Play install.
- [ ] **Sign in with Apple key** — create a key with Sign in with Apple
      enabled and set `APPLE_TEAM_ID` / `APPLE_KEY_ID` / `APPLE_PRIVATE_KEY`
      on the backend, so account deletion revokes Apple tokens (Guideline
      5.1.1(v)). See the backend's `docs/apple-sign-in.md`.
- [ ] **Account-deletion web page** — Play requires a URL where users can
      request deletion without reinstalling the app.

### App Store Connect

- [ ] App record: bundle ID `com.newskhabri.app`, SKU, primary language.
- [ ] `submit.production.ios`: `appleId`, `ascAppId`, `appleTeamId` (or let
      `eas submit` prompt).
- [ ] **Privacy nutrition labels** — declare: account (email, name),
      identifiers (Google / Apple `sub`), user content (bookmarks), usage
      data (reading history for ranking), the Expo push token, and crash
      data + diagnostics (Sentry) once it's on. Nothing is used for
      tracking.
- [ ] Age rating — news / user-generated-adjacent content, likely 17+.
- [ ] Screenshots: 6.9" and 6.5" iPhone (required), 13" iPad if the app is
      offered on iPad.
- [ ] App description, keywords, support URL, marketing URL.
- [x] **Sign in with Apple** (Guideline 4.8) — built: `POST /auth/apple`
      (JWKS verification; token revocation on account deletion needs the
      key above), `expo-apple-authentication` +
      the native button on both sign-in surfaces (iOS only), `users`
      schema takes a second provider id. See `docs/apple-sign-in.md`.
      **Left to do on your Apple Developer account**: enable the "Sign In
      with Apple" capability on the `com.newskhabri.app` App ID, then an
      EAS build carries the entitlement (the config plugin already adds
      it) and the flow can be tested on a device.

### Play Console

- [ ] App record: package `com.newskhabri.app`.
- [ ] `submit.production.android.serviceAccountKeyPath` — a service-account
      JSON with release-manager access.
- [ ] **Data safety form** — same disclosures as the Apple labels above;
      mark data encrypted in transit, and that users can request deletion
      (the in-app "Delete account" flow, PR #8 + #14).
- [ ] Content rating questionnaire (IARC).
- [ ] Screenshots (phone + 7"/10" tablet if targeted), feature graphic,
      short + full description.
- [ ] Verify the `POST_NOTIFICATIONS` runtime-denied path is graceful
      (Android 13+): denying the prompt should silently disable
      notifications, not error.

### Both

- [ ] Run VoiceOver / TalkBack and the largest Dynamic Type / font-scale
      setting end to end.
- [ ] Test with the network off and on a brand-new account — every screen
      needs a real empty / error state, not a blank list.
