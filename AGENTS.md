# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v54.0.0/ before writing any code.

# News Khabri (frontend) — notes for AI agents

This file is for Claude and any other model working in this repo. It
covers what isn't obvious from reading the code cold: established
conventions, and non-obvious platform behavior that has already caused
real bugs in this app. Read it before making UI/layout changes,
especially anything involving `Animated`, `onLayout`, or keyboard/tab-bar
insets — those have burned real time here more than once.

The backend that this app talks to lives in a sibling repo,
`news-khabri-backend` (Node/Express + better-sqlite3 + node-cron). It has
its own `AGENTS.md` with backend-specific notes. See that repo's README
for the API surface (`src/routes/`).

## Comment convention

Keep inline comments short - a line or two of "why", right next to the
code it explains. A comment that would run 5+ lines (a bug's full
backstory, a design tradeoff with real alternatives considered, a
calibration/investigation narrative) belongs in its own file under
`docs/` instead, with a one-line pointer left in the code
(`// See docs/whatever.md.`). Skip comments that only restate what a past
bug was and that it's fixed now - that belongs in the PR/commit history,
not the code. `docs/` is organized by topic, not 1:1 with source files -
check whether an existing doc already covers the area before creating a
new one.

## Architecture at a glance

- Expo SDK 54, `expo-router` (file-based routing under `src/app/`),
  React 19, RN 0.81.
- Data fetching: `@tanstack/react-query` over a thin `fetch`-based client
  in `src/api/` (`articles.ts`, `stories.ts`). No client-side caching
  logic of our own — react-query owns that. Every `api/` module goes
  through `apiFetch(path, { method?, body?, token?, errorMessage,
  parseJson? })` in `src/api/client.ts` — it prefixes
  `config.ts`'s base URL, JSON-encodes the body, adds the bearer header,
  throws `errorMessage` on `!res.ok`, and applies a 15s `AbortController`
  timeout so a dead socket surfaces as an error instead of an infinite
  spinner. Don't hand-roll a raw `fetch` + `if (!res.ok) throw` in an
  `api/` module again, and don't hardcode a host (the base URL is
  `EXPO_PUBLIC_API_URL`, default `http://localhost:3000`). Every query-backed screen
  renders `components/error-state.tsx` (message + optional "Try again"
  wired to react-query's `refetch`) for its failure state — don't
  hand-roll a bare `<Text>` error again.
- `src/app/_layout.tsx` exports an `ErrorBoundary` (expo-router picks it
  up). It renders *outside* every provider, so it's deliberately
  self-contained: react-native's own `useColorScheme` + raw `Colors`
  tokens + English copy, no `useTheme`/`useTranslation`. `src/app/+not-found.tsx`
  handles unmatched routes and *is* inside the tree, so it uses the normal
  hooks.
- OTA updates via `expo-updates` (`runtimeVersion` policy `appVersion`,
  channel URL in `app.json`). Inert until `eas update` is actually
  pushing; no runtime code of ours touches it.
- Crash/error reporting via `@sentry/react-native`, wired through
  `src/observability/sentry.ts` (`initSentry()` called at the top of
  `_layout.tsx`, `wrap()` around its default export, `captureException()`
  from the root `ErrorBoundary`). Same "inert until configured" shape as
  `expo-updates`: **no-op unless `EXPO_PUBLIC_SENTRY_DSN` is set AND not
  `__DEV__`** — `Sentry.init` is never called otherwise, so there's no
  transport. Turning it on also needs `SENTRY_ORG` / `SENTRY_PROJECT` /
  `SENTRY_AUTH_TOKEN` as EAS build secrets (source-map upload; the config
  plugin `warnOnce`s without them but doesn't fail) and a native rebuild.
  `jest.setup.js` mocks the native module. A `metro.config.js` wrapping
  `getSentryExpoConfig` (for EAS Update / OTA source-map debug-ids) was
  left out on purpose for now — it broke the metro config loader on
  Node 26 + Windows, and OTA itself is still inert; add it alongside
  turning OTA on.
- Preferences (theme, language, font size, sources, notifications, debug
  mode) each have their own React Context + `useXxxPreference()` hook
  under `src/contexts/`, one provider per concern rather than one big
  settings context. The load / persist / re-read-on-server-pull /
  broadcast plumbing is shared: `createPersistedPreference({ storageKey,
  defaultValue, codec })` returns a `{ Context, Provider }`, and each
  concern's file adds only its own bits — `codec.parse` returning
  `undefined` keeps the default (invalid/missing key), any defined value
  applies; `theme` layers `resolvedScheme` + the `Appearance` sync,
  `notifications` layers push registration, `sources` slices its
  per-language record by the active language. Add a new preference by
  calling the factory, not by copying a context. `src/hooks/use-theme.ts`
  and `useTranslation()` (`src/i18n/translations.ts`) are the two you'll
  reach for constantly.
- i18n: 10 languages, each a plain `Record<string, string>` file under
  `src/i18n/locales/`, keyed by the same `TranslationKey` union (derived
  from `en.ts`). Adding a language = adding a locale file + registering
  it in `translations.ts`'s `translations` map — see that file's own
  comment.
- Design tokens live in `src/constants/theme.ts` (`Colors`, `Spacing`,
  `Radius`, type scale). Prefer these over ad hoc numbers for anything
  that repeats, but plenty of one-off small values (`gap: 6`, `gap: 4`)
  exist directly in component styles too — this codebase doesn't insist
  every number trace back to a token, just the ones that matter for
  consistency (spacing that needs to visually match elsewhere, edge
  padding meant to line up with something below it, etc).
- Full directory layout is in `README.md` — not repeated here since it's
  easy for the two to drift; check the README first for "where does X
  live".
- **Web is not a target.** `react-native-web`/`react-dom`, the `web`
  block in `app.json`, the `.web.tsx`/`.web.ts` variants, and `global.css`
  were removed — the app ships iOS + Android only. The inline
  `Platform.select({ web: … })` / `Platform.OS === "web"` branches that
  remain are harmless dead paths on native; leave them unless you're
  touching that code for another reason. Don't re-add a web build without
  a real reason to ship one.

## Testing & verification discipline

- `npx jest` (whole suite) and `npx tsc --noEmit` after *every* change,
  not just a targeted test file — this repo has caught real regressions
  in files nowhere near the one being edited. Report exact pass/fail
  counts; don't round up or hand-wave.
- **Live Android device testing is available on this machine** (Android
  Studio, SDK, and a `Pixel_10_Pro_XL` AVD are installed here) - use it
  for real UI/layout verification rather than reasoning-only whenever a
  change is visual, animated, or measurement-dependent; several bugs
  this session (missing tab bar icons, wrong tab-bar height, a
  since-removed related-article swipe swallowing the system back gesture)
  were only found this way, not through code review. **iOS has no local device or simulator access
  at all** (no Mac in this environment) - verification there depends
  entirely on the user's own device, coordinated via screen recordings
  or Remote Control; say so plainly when reporting an iOS-only fix, and
  expect it may still turn out wrong until actually seen on a real
  device. When a visual fix turns out wrong, prefer changing approach
  over re-guessing the same fragile structure with a different number.
- `Animated`-interpolated style props (opacity, etc.) resolve to real
  numeric values under `@testing-library/react-native` — confirmed
  empirically, not assumed. `fireEvent.scroll(view, { nativeEvent: {
  contentOffset: { x } } })` and `fireEvent(view, "layout", {
  nativeEvent: { layout: { width, height } } })` are the two events
  worth knowing for testing scroll-driven and onLayout-driven UI.
- Give every node you intend to assert on or fire events on an explicit
  `testID` up front. `getByText` throws on duplicate matches, and
  duplicate text is common by design here (an animated overlay pair
  mid-cross-fade, an invisible measurement probe rendering the same
  label as what's visible) — don't discover this after the fact.
- A `useEffect` cleanup that stops a running `Animated.timing`/
  `Animated.CompositeAnimation` on unmount isn't optional polish — a
  test that triggers one and doesn't let it finish will leak a timer
  past Jest's teardown and print `ReferenceError: ... torn down` noise
  (harmless to the exit code, but real signal that something isn't
  cleaned up). Don't reach for `jest.useFakeTimers()` to paper over this
  in one test — it bled into unrelated tests the one time it was tried
  here; fix the leak at the source instead.
- `react-native-render-html` was removed along with its `patch-package`
  patch: the article-detail screen no longer renders a scraped HTML body,
  it shows the RSS `description` snippet (flattened by
  `utils/strip-html.ts`) plus a "Read on <source>" link. The backend
  stopped serving `content` at the same time.
- `patches/react-native-screens+4.16.0.patch` (same `patch-package` /
  `postinstall` mechanism) extends an upstream `formSheet`-only
  background-color workaround to `push` too - see
  `docs/navigation-white-flash.md`'s third layer for why this was needed
  even after both JS-level fixes (the React Navigation `Theme` override
  and the `expo-system-ui` root-view sync) were already in place. A newer
  `react-native-screens` (bundled by Expo SDK 55+) fixes an iOS-26-only
  remaining artifact this patch alone doesn't reach - see that doc's
  sixth layer for why the SDK bump itself isn't currently worth it.
- `plugins/with-android-root-view-background.js`, a local Expo config
  plugin registered in `app.json`, sets Android's static
  `android:windowBackground` theme attribute (light/dark split via
  `values`/`values-night` colors.xml) - the layer Android's edge-to-edge
  rounded-corner mask actually samples, and none of the
  navigation-white-flash layers above reach it since it's static, not
  JS-driven. See `docs/navigation-white-flash.md`'s fourth layer.
- `require("@/assets/...")` (image assets, not source) needs its own
  entry in `package.json`'s `jest.moduleNameMapper`
  (`"^@/assets/(.*)$": "<rootDir>/assets/$1"`) - jest-expo auto-derives a
  mapping for `@/*` from `tsconfig.json`'s `paths`, but only picks up the
  general `@/*` -> `src/*` entry, not the more specific `@/assets/*` ->
  `assets/*` one also declared there. `app-tabs.tsx` had been
  `require()`-ing an asset this way for a while with no test ever
  exercising it, so this only surfaced once a *tested* component
  (`app-header.tsx`) needed the same asset - if a new component that
  `require()`s something under `assets/` suddenly fails jest with
  "Could not locate module... mapped as .../src/$1", this is why.

## Hard-won `Animated` / `onLayout` / layout lessons

These are all things that took multiple failed attempts to get right in
this exact codebase. Read this before touching anything similar.

- **`KeyboardAvoidingView`'s `"padding"` behavior overwrites your own
  `paddingBottom`.** Its render internally does
  `StyleSheet.compose(style, { paddingBottom: bottomHeight })` — RN style
  arrays are last-write-wins on a shared key, so any custom
  `paddingBottom` passed in `style` gets silently replaced by the
  keyboard-driven value (0 when the keyboard is closed). If you need to
  reserve space for something else (a tab bar, etc.) *underneath* a
  `KeyboardAvoidingView`, put that padding on a separate outer `View`
  wrapping it — never on the `KeyboardAvoidingView`'s own `style`.
- **`useSafeAreaInsets().bottom` does not include the native tab bar's
  own height.** `expo-router/unstable-native-tabs`' `NativeTabs` exposes
  no JS API to measure itself. Use `useTabBarInset()`
  (`src/hooks/use-tab-bar-inset.ts`) - it returns `insets.bottom +
  NATIVE_TAB_BAR_HEIGHT` (web -> 0) and is the only caller of
  `NATIVE_TAB_BAR_HEIGHT` (`src/constants/theme.ts` - see
  `docs/android-tab-bar.md` for why the Android value is 80, not the more
  commonly assumed 56). Add its result on top of your own base gap; don't
  replace the inset with it. The hook centralizes the formula but not the
  application - every screen that scrolls content behind the tab bar
  still calls it and adds the reservation itself, and a screen that goes
  without one is easy to miss until tested live (see
  `docs/android-tab-bar.md` again).
- **A `ScrollView` needs an explicit `style={{ flex: 1 }}`, not just
  `contentContainerStyle`, to actually be constrained by its parent.**
  Without it, `onLayout` measurements on the ScrollView itself are
  unreliable.
- **Measuring invisible content via a hidden `onLayout` probe works, but
  where you put it matters more than it looks.** The pattern: render an
  off-screen clone wrapped in `{ height: 0, overflow: "hidden" }` (clipping
  is paint-time, not layout-time, so `onLayout` still reports the true
  un-clipped size). Real pitfalls hit doing this in practice:
  - Two probes sharing one column-direction wrapper get silently
    stretched to the **same** resolved width by that wrapper's default
    `alignItems: "stretch"` — give each probe its own `alignSelf:
    "flex-start"`, or better, don't share a wrapper at all.
  - Never nest a measurement probe inside an ancestor whose own size is
    itself animated/changing (e.g. a shrinking `Animated.View`). It may
    measure correctly on first mount and silently go wrong after the
    ancestor's size changes once. Lift the measurement state and probes
    up and out to a sibling of whatever's animating, not a descendant of
    it — this was worth doing even though it wasn't provably the bug
    without a real device, because it removes the entire class of
    interaction rather than one hypothesized cause of it.
  - `position: "absolute"` *does* still self-measure via `onLayout` in
    principle, but prefer `opacity: 0` over `height: 0 +
    overflow: "hidden"` for an absolutely-positioned probe — the latter
    can constrain what it's measuring; the former is purely paint-time.
- **RN's default `flexShrink` is `0`, not `1` like web CSS.** Don't
  assume a child will compress to fit a shrinking parent — it won't,
  unless it (or something in its chain) explicitly opts in.
- **Animating `width` (or any layout property) requires
  `useNativeDriver: false`.** The native driver can't touch layout
  props; everything still runs once per frame on the JS thread via
  `scrollEventThrottle`, which is fine for this.
- **Native `onScroll` events are not guaranteed to keep firing during a
  *programmatic* animated `scrollTo()`** on every platform. If some
  other `Animated.Value` (or plain state) is meant to track scroll
  position and you trigger a scroll yourself (e.g. a "scroll to top"
  button), drive that value explicitly (`Animated.timing`) alongside the
  `scrollTo` call — don't assume the real scroll event will do it for
  you.
- **Cross-script text vertical-centering** (Devanagari/Tamil/Telugu/etc.
  vs. Latin): a fixed-size circular button correctly centered via
  flexbox can still show visibly off-center glyphs, because different
  scripts' line-box metrics differ. A generous custom `lineHeight`
  (noticeably larger than `fontSize`, not equal to it — equal clips tall
  scripts' ascenders/matras) plus, on Android only,
  `includeFontPadding: false` + `textAlignVertical: "center"` is the
  fix that's held up here. `numberOfLines={1}` truncating to `"X…"` is a
  good diagnostic sign the container is narrower than intended, not
  necessarily that the text itself is wrong.
- **Density-specific image assets matter.** A plain unsuffixed image is
  resolved as `@1x`, so its raw pixel dimensions become its reported
  *point* size — a 260×260 PNG with no `@2x`/`@3x` siblings reports as
  260pt, roughly 10x a typical ~25pt tab-icon convention, and can look
  stretched/distorted independent of whether the source art itself is
  correct. Generate real `@1x`/`@2x`/`@3x` variants at the actual target
  point size.
- **`LayoutAnimation` needs an explicit opt-in on Android**
  (`UIManager.setLayoutAnimationEnabledExperimental(true)`) — iOS has it
  enabled by default. Do this once at module load, not per-call.

## Claude Code automation in this repo

Configured in `.claude/` and `.mcp.json`; the hook scripts live in
`scripts/hooks/` (plain node - **there is no `jq` on this machine**, so a
hook that shells out to it silently does nothing).

- **PreToolUse / Bash -> `backend-cwd-guard.js`.** The Bash tool's working
  directory persists between calls, and this repo has a sibling
  (`news-khabri-backend`), so a repo-relative command with no leading `cd`
  runs wherever the last one left the shell. This has produced
  confidently-wrong results (a backend suite reported as the frontend's).
  The hook attaches a reminder; it does not block. Prefix commands with an
  explicit `cd`.
- **PostToolUse / Edit|Write -> `i18n-locale-check.js`.** Runs
  `scripts/check-i18n-placeholders.js` when a locale file is edited, and
  blocks (exit 2) on a mismatch. tsc already guards locale *keys* in both
  directions - each locale is annotated `Record<TranslationKey, string>`, so a
  missing key is TS2741 and a stale one TS2353. What it cannot see is a
  translator dropping or misspelling a `{placeholder}` inside the string.
- **Stop -> `verify-on-stop.js`.** Runs `tsc --noEmit` then the full jest
  suite, but only when `git diff HEAD -- src/` is non-empty, so a
  question-answering turn doesn't trigger a ~100s run. Reports via
  `systemMessage`; deliberately non-blocking, since a Stop hook that refuses
  to stop can loop.
- **Subagents:** `rn-layout-reviewer` (this file's Animated/onLayout lessons
  turned into a review checklist) and `test-writer`.
- **Skills:** `/verify-android` (Pixel_10_Pro_XL emulator loop) and
  `/add-translation-key`. Both are user-invocable only.
- **MCP:** `context7` for version-pinned Expo/RN docs (this file's opening
  rule, automated) and `sentry`. Both need approving via `/mcp` once.

## Repo state

- Hosted at `github.com/notchetan/news-khabri-frontend`, public, `main`
  branch-protected (PR-only, no direct pushes, even for the repo
  owner). Work on a feature/fix branch and open a PR - a direct push to
  `main` will be rejected. CI (`.github/workflows/ci.yml`) runs `npx
  tsc --noEmit` and `npx jest --ci` on every PR push - keep both green;
  don't introduce a devDependency or ambient type that only happens to
  resolve locally (see `@types/node` in `package.json`/`tsconfig.json`
  for a real instance of this: it worked locally as an undeclared
  transitive dependency for a long time, then failed in CI the moment a
  clean `npm ci` didn't hoist it the same way local `npm install` had).
