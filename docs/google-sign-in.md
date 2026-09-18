# Sign-in and account-linked preferences

The backend's own `docs/google-sign-in.md` + `docs/apple-sign-in.md` (in
`news-khabri-backend`) cover the server side - session tokens,
`/auth/google`, `/auth/apple`, `/me`, `/me/preferences`. This covers the
frontend half. Google sign-in works on Android + iOS; Sign in with Apple
is iOS-only (App Store Guideline 4.8 requires offering it once Google is
offered) and both sign-in surfaces (`onboarding/sign-in.tsx`,
`profile.tsx`) show the Apple button above the Google one on iOS.

## Why the sign-in native modules are required lazily, not imported

`@react-native-google-signin/google-signin`, `expo-secure-store` and
`expo-apple-authentication` are native modules added to this app but not
necessarily linked into whatever build is currently installed on a device
- the same situation `expo-notifications` was in (see that feature's own
`docs/push-notifications.md`'s "Why expo-notifications is required
lazily"). Merely *importing* an unlinked native module can crash the
whole app on boot, not just the feature that needed it - and
`expo-secure-store` in particular is touched on **every single app
launch** (`AuthProvider`'s own session-restore check), which is exactly
the always-run code path that caused that earlier crash. None of them is
imported at `contexts/auth-context.tsx`'s module scope; each is
`require()`'d inside the specific function that needs it, wrapped in
try/catch. `AppleSignInButton` (`components/apple-sign-in-button.tsx`)
`require()`s `expo-apple-authentication` too, but only after an
`if (Platform.OS !== "ios") return null` guard, so the require never runs
on Android at all.

## The preference sync bus (`utils/preference-sync.ts`)

Six independent preference contexts already existed before this feature
(theme, font size, debug mode, language, sources, notification interval),
each owning its own `AsyncStorage` key and React state. Making them
account-linked needed two things `AuthProvider` has to do regardless of
where it sits in `_layout.tsx`'s own provider tree:

- **Push**: read every preference's current value and `PUT` it to the
  server whenever any one of them changes.
- **Pull**: write a server-fetched preference bundle back into those same
  six `AsyncStorage` keys, and get each already-mounted context to notice.

A plain React Context can only flow one direction (parent to child). If
`AuthProvider` sat *above* the six preference providers, it could pull
(children re-reading a value it provides) but not push (it can't call
`useThemePreference()` etc. on its own ancestors' behalf). If it sat
*below* them, push works (it's a descendant, calling their hooks
normally) but pull doesn't. `AuthProvider` actually ended up nested
*inside* the six others in `_layout.tsx` - but the sync mechanism doesn't
rely on that ordering at all, so it isn't fragile if that ever changes.

The fix is a plain module-scope event emitter, not React Context: every
preference context's own `setXxx` calls `notifyPreferenceChanged()` right
after its own `AsyncStorage.setItem` (this is the push trigger -
`AuthProvider` subscribes and, if signed in, reads all six keys fresh and
`PUT`s them). Every preference context's own load effect also subscribes
to `onPreferenceChanged` and re-runs itself (this is what makes a
server-pulled write actually reach an already-initialized context -
`AuthProvider` calls the same `notifyPreferenceChanged()` after writing a
pulled bundle into `AsyncStorage`). Both directions share one primitive,
so nesting order genuinely doesn't matter.

One consequence worth knowing: a local preference change triggers a
harmless extra "reload from storage" in its own context too (it's also
subscribed). A server-pulled write also pings the push subscriber, but
that's now a no-op diff (the baseline is set to the pulled values first -
see "Surviving an offline edit across a relaunch" below), not a
full-bundle PUT. Re-reading an unchanged value is a no-op, not a loop -
nothing re-triggers `notifyPreferenceChanged()` from inside a load
effect.

## New account vs. existing account on sign-in

`AuthProvider.signIn()` branches on whether `/auth/google` returns
`preferences: null` (a brand new account) or a real object (returning
user). A new account is seeded with whatever this device's *own* current
preferences already are (`PUT`, not left empty) - a returning user's
saved preferences instead become this device's source of truth (applied
locally, overwriting whatever was there). This is a deliberate asymmetry,
not an oversight: the alternative (always overwrite local with server, even
for a device that just created the account and has nothing server-side
yet) would silently reset a brand new sign-in back to app defaults.

## Surviving an offline edit across a relaunch

The push side only fires the field(s) that differ from a *baseline* -
"the bundle this device last confirmed in sync with the server". That
baseline used to live only in a `useRef` (`lastSyncedBundleRef`), so it
was gone after an app restart, and the restore-on-launch path just
overwrote every local key with the server's values unconditionally. That
lost a real edit: change a preference while offline, the `PUT` fails, the
app is killed before the retry - on the next launch the server (which
never got the change) wins and the edit is gone, not even re-queued.

The baseline is now also persisted, to `AsyncStorage` under
`preferencesSyncBaseline` (`PREFERENCES_BASELINE_KEY`), written every time
`lastSyncedBundleRef` is set (after a successful `PUT`, on sign-in, and
after the launch reconcile) and cleared on sign-out. On launch,
`reconcileOnRestore` compares each field three ways:

- local value **==** persisted baseline -> in sync, take the **server**
  value (picks up another device's change).
- local value **!=** persisted baseline -> an edit this device made but
  never synced -> **keep the local value** and re-`PUT` it now.

`lastSyncedBundleRef` is set to the *server* bundle before the merged
result is written to storage, so the existing diff-and-push machinery
sees exactly the still-unsynced field(s) and nothing else - no
full-bundle PUT on every launch anymore. A device with no persisted
baseline yet (first sync, or an older build) falls back to the old
server-wins behaviour.

Same-field conflicts between two devices are still last-writer-wins -
there are no per-field wall-clock timestamps, and cross-device clocks
aren't trustworthy enough to want them. What's fixed is the
single-device offline-edit-then-relaunch case, which was a guaranteed
data loss, not a race.

## Testing components that render under `AuthProvider`

`AuthProvider`'s own mount effect (the SecureStore read, then `fetchMe`)
adds extra microtask ticks that `await act(async () => {...})` flushes as
part of exiting. Against a mock resolved with `mockResolvedValue`, those
extra ticks were enough for the mock's promise to also settle and commit
before a "still loading" assertion ever ran, so the loading state was
never actually observed - a manually-resolved promise (`new Promise((r) =>
{ resolveDetail = r; })`, resolved explicitly after asserting the loading
state) avoids the race instead of relying on timing.

## `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`

Committed in a plain `.env` (not `.env.local`) - `EXPO_PUBLIC_*` values
are inlined into the client bundle at build time and Expo's own
`.gitignore` convention (only `.env*.local` is ignored) already treats
them as public, unlike the backend's `JWT_SECRET`. This must be the exact
same Google Cloud Console "Web application" OAuth client ID as the
backend's own `GOOGLE_WEB_CLIENT_ID` - see the backend doc for why the web
client (not an Android-specific one) is used even for an Android sign-in.

## `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`

iOS additionally needs an **iOS** OAuth client (Google Cloud Console ->
Credentials -> Create OAuth client -> iOS, bundle ID `com.newskhabri.app`).
Without it the native Google SDK has no client id and no URL scheme to
return to, so the Google button fails on iPhone - an App Review rejection,
since the button is shown there. Set its client id (the full
`...apps.googleusercontent.com` string) in `.env` and it's used twice:

- `GoogleSignin.configure({ iosClientId })` in `contexts/auth-context.tsx`;
- `app.config.js` derives the plugin's `iosUrlScheme` (the reversed id)
  from it - the reason that file exists, since static `app.json` can't read
  env. With no value the plugin is registered bare, which is harmless on
  Android.

`app.config.js` throws when `EAS_BUILD_PLATFORM=ios` and the id is unset,
so an iOS build can't go out without it. The token's `aud` is still the
*web* client id (because `webClientId` is passed too), so the backend needs
no change.

Android release builds need the reverse kind of setup: the **SHA-1** of
both the Play App Signing key (Play Console -> App integrity) and the EAS
upload key (`eas credentials`) registered on an Android OAuth client for
`com.newskhabri.app`, or every Play install fails with `DEVELOPER_ERROR`.
