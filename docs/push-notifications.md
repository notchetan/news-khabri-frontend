# Trending-story push notifications

Frontend half of the feature - the backend's own
`docs/push-notifications.md` (in `news-khabri-backend`) covers why this is
server-driven push rather than on-device scheduled local notifications
(short answer: iOS can't guarantee a background wake-up on a 5-minute
cadence, a real push notification isn't subject to that limit) and the
cron/ranking side of sending them.

## Registration is silent-fail by design

`registerForPushNotifications()` (`contexts/notification-preference.tsx`)
requests permission (a no-op if the user already decided), obtains this
device's Expo push token, and registers it with the backend - wrapped in
one try/catch, silently doing nothing on any failure. Real failure modes
that land here: no physical device (`getExpoPushTokenAsync` needs one -
most simulators/emulators don't have it), the user denying permission,
the backend being unreachable, and the native module itself not being
available at all (Expo Go, or a build that hasn't been rebuilt since
`expo-notifications` was added - see "Why `expo-notifications` is
required lazily" below for why that specific one needs more than just
this try/catch). None of these should ever crash the app over what's an
optional preference - the interval choice
itself is already persisted to `AsyncStorage` regardless of whether
registration actually succeeded, matching this app's established
graceful-degradation pattern for other optional preferences.

## Why the push token is cached locally

Once obtained, the Expo push token is cached in `AsyncStorage`
(`notificationPushToken`, separate from the interval preference itself) so
that turning notifications back off can still tell the backend
`intervalMinutes: 0` for that exact token, without re-requesting
permission (already a no-op once decided) just to get it again. Without
this, a device that turns notifications off would leave its last-known
"on" registration sitting in the backend's `push_subscriptions` table
forever, since the client-side toggle alone means nothing to a server
that's never told about it.

## Tapping a notification

`AppContent` (`_layout.tsx`) registers a `Notifications.addNotificationResponseReceivedListener`,
only while `interval !== 0`, that reads the `storyId` out of the
notification's `data` payload (set server-side - see the backend's
`services/push-notifications.js`) and pushes straight to `/story/[id]`,
the same destination `StoryList` itself navigates to for a real
(non-singleton) story. A tap that *cold-launches* the app fires before
that listener exists, so the same effect also reads
`getLastNotificationResponse()` once and navigates to it, then calls
`clearLastNotificationResponse()` so the effect re-running (an interval
change) can't open it again. The effect waits for
`hasCompletedOnboarding === true`, so the Stack is mounted before it
navigates. `Notifications.setNotificationHandler` (so a
notification that arrives while the app is already open actually shows,
not just when backgrounded) is configured the first time
`registerForPushNotifications` successfully loads the module, not at
`_layout.tsx`'s own module scope - see the next section for why that
matters.

## Why `expo-notifications` is required lazily, not imported

Importing `expo-notifications` at all - `import * as Notifications from
"expo-notifications"` at the top of a file, regardless of whether
anything in that file actually calls it yet - runs the package's own
internal auto-registration side effect (it listens for native
push-token-refresh events immediately on load). If the native module it
needs (`ExpoPushTokenManager`) isn't actually present - either because
the app hasn't been rebuilt since `expo-notifications` was added (a
Fast Refresh/Metro-cache-clear alone can never link new native code), or
because it's running in Expo Go at all, which dropped remote push support
in SDK 53 - that side effect throws immediately at import time, before
any of this app's own code (including its own try/catch blocks) ever
runs. Since `contexts/notification-preference.tsx` and `_layout.tsx` are
both always loaded (the provider wraps the whole app; the layout *is* the
whole app), a top-level import there crashed on every single boot,
notifications on or off.

The fix: neither file imports `expo-notifications` at the top anymore.
Both instead call `require("expo-notifications")` *inside* the specific
try/catch-guarded function that needs it (`registerForPushNotifications`,
and the tap-listener effect, itself also gated on `interval !== 0` so it
never runs at all for a device that hasn't turned notifications on). A
`require()` call is a real runtime statement, not a hoisted import, so
the try/catch around it actually catches a failure here - including the
original failure mode this was written to fix, Metro being unable to
resolve the module under Expo Go at all.
