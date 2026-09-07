---
name: release
description: Ship a release - decide between an OTA update and a store build, run the pre-flight checks, bump the version only when it should move, and draft release notes from merged PRs.
disable-model-invocation: true
---

# Release

Two things can be shipped from this repo, and picking the wrong one is the
mistake this skill exists to prevent.

## First: OTA update or store build?

`app.json` sets `runtimeVersion: { policy: "appVersion" }`. The runtime
version *is* `expo.version`. That single fact decides everything:

| | `eas update` (OTA) | `eas build` + submit |
|---|---|---|
| Ships | JS, TS, assets | anything native |
| Needs a version bump | **no - a bump orphans it** | yes |
| Reaches | installs on the same `version` | new installs/updates |

- **JS-only change** (a screen, a string, a fix in `src/`): `eas update`, and
  **do not touch `expo.version`**. Bumping it changes the runtime version, so
  the update no longer matches the build users have and silently reaches
  nobody.
- **Native change** - a new native module, an `app.json` plugin, anything in
  `plugins/`, a `patches/` change, an SDK bump: store build. Bump
  `expo.version`.

Note that OTA is inert until `eas update` is actually pushing (AGENTS.md).
If this is the first push, turning it on is its own task - including the
`metro.config.js` / `getSentryExpoConfig` wrapper that was deliberately left
out, which belongs with it.

## Do not set versionCode or buildNumber

`eas.json` has `cli.appVersionSource: "remote"` and
`build.production.autoIncrement: true` - EAS owns the iOS build number and
the Android versionCode, and `docs/store-submission.md` says so directly.
Adding either to `app.json` takes that away from EAS. `expo.version` is the
only version field this repo sets by hand.

## Pre-flight

Run from the frontend repo with an explicit `cd` - the working directory
persists and the backend is a sibling.

```bash
cd /d/code/news-khabri
npx tsc --noEmit
npx jest --ci
```

Both must be green; CI enforces the same two on the PR. Then:

- **Verify on a device.** AGENTS.md is explicit that reasoning alone has been
  wrong here repeatedly. `/verify-android` covers Android. **iOS cannot be
  verified in this environment at all** - no Mac, no simulator. Say so plainly
  rather than implying an iOS release was checked.
- **`EXPO_PUBLIC_API_URL` must point at the deployed HTTPS backend** for the
  profile being built. iOS ATS blocks plaintext HTTP in release, and the
  default is `http://localhost:3000` - a build that ships with it looks fine
  until every request fails on a real phone.
- **Sentry** only initializes when `EXPO_PUBLIC_SENTRY_DSN` is set and not
  `__DEV__`. Source-map upload additionally needs `SENTRY_ORG`,
  `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` as EAS build secrets; without them
  the config plugin `warnOnce`s and the build still succeeds, so a missing
  secret shows up later as unsymbolicated stack traces, not as a failure.

## Release notes

Merged PR titles are the source - they are written as complete sentences
here, so they read as notes with little editing.

```bash
cd /d/code/news-khabri
git log --oneline --first-parent <last-release-tag>..main
```

Group into user-visible changes and internal ones, and drop the internal
group from anything store-facing. Translation and layout fixes are
user-visible; hook and CI changes are not.

## Build and submit

```bash
eas build --platform android --profile production
eas build --platform ios --profile production
eas submit --platform android --profile production   # lands on the internal track
```

`docs/store-submission.md` carries the rest - what `app.json` already covers
(privacy manifests, blocked permissions, export compliance) and the checklist
of what still has to be done by hand in App Store Connect / Play Console.
Read it before the first submission of any release; do not duplicate it here.

## After

Tag the release so the next run has a range to diff from:

```bash
git tag v<version> && git push origin v<version>
```
