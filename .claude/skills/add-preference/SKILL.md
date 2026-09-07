---
name: add-preference
description: Add a persisted user preference through createPersistedPreference, wiring its context, hook, provider registration, settings row, test, and (if it syncs) the account bundle.
disable-model-invocation: true
---

# Add a preference

AGENTS.md's rule is "add a new preference by calling the factory, not by
copying a context" - a rule that exists because copying happened. The factory
owns load / persist / re-read-on-server-pull / broadcast; each concern's file
should add only its own bits.

There are two levels to this, and picking the wrong one is the usual mistake:

- **Device-local** (like `debugEnabled` before it was synced): the factory
  plus a hook. Steps 1-5.
- **Account-synced**: everything above *and* a field in the preference
  bundle, plus a matching column in the backend's `/me/preferences`. Step 6.
  Skipping this ships a preference that silently resets on the user's other
  device.

## 1. The context file

`src/contexts/<name>-preference.tsx`. Model it on
`debug-preference.tsx` (boolean, simplest) or `font-size-preference.tsx`
(union type with a lookup table).

```tsx
import { useContext } from "react";

import { createPersistedPreference } from "@/contexts/create-persisted-preference";

export type CompactModePreference = "off" | "on";

export const COMPACT_MODE_STORAGE_KEY = "compactModePreference";
export const DEFAULT_COMPACT_MODE: CompactModePreference = "off";

const base = createPersistedPreference<CompactModePreference>({
  storageKey: COMPACT_MODE_STORAGE_KEY,
  defaultValue: DEFAULT_COMPACT_MODE,
  codec: {
    parse: (raw) => (raw === "off" || raw === "on" ? raw : undefined),
    serialize: (v) => v,
  },
});

export const CompactModePreferenceProvider = base.Provider;

export function useCompactModePreference() {
  const ctx = useContext(base.Context);
  if (!ctx) {
    throw new Error(
      "useCompactModePreference must be used within a CompactModePreferenceProvider"
    );
  }
  return { preference: ctx.value, setPreference: ctx.setValue };
}
```

Export the storage key and the default as named constants - `auth-context.tsx`
imports the defaults directly when it folds server values into a bundle, and
the tests import the key.

## 2. Get the codec right

`parse` returning `null`/`undefined` means *keep the current value*; any
defined value applies. That distinction is the whole reason the factory takes
a codec rather than `JSON.parse`:

- A **union type** must reject unknown strings with `undefined`, or a stale
  value from an older build silently becomes the live value.
- A **boolean** usually wants `raw === "true"` with no rejection branch, so a
  reload can turn the preference *off* as well as on. `debug-preference.tsx`
  says exactly this in a comment - read it before deciding.

## 3. Register the provider

In `src/app/_layout.tsx`, inside the existing preference stack. Order matters
in one direction: **every preference provider sits above `AuthProvider`**,
because a server pull inside `AuthProvider` writes to AsyncStorage and then
broadcasts on the preference-sync bus, which each provider is listening to.
A provider mounted below it will not be there to hear the first pull.

## 4. Consider a non-throwing reader

If a leaf primitive will read this (the way `ThemedText` reads the font
scale), add a second, non-throwing hook next to the throwing one - see
`useFontScale`'s comment on why a text primitive that crashes on a missing
provider is a footgun. If only settings screens read it, skip this.

## 5. Surface and test it

- A row in `src/app/(tabs)/preferences/index.tsx`, with its label added
  through `/add-translation-key` (all ten locales).
- A test in `src/contexts/__tests__/<name>-preference.test.tsx`. Follow
  `font-size-preference.test.tsx`: mount the provider, assert the default,
  set a value, assert the AsyncStorage write, and assert that a bad stored
  value leaves the default alone. That last case is the one that catches a
  wrong codec.

```bash
npx tsc --noEmit
npx jest
```

## 6. If it syncs to the account

The bundle is not optional plumbing - it is what makes the preference follow
the user to another device.

- Add the field to `PreferenceBundle` and to `serverPreferencesToBundle` in
  `src/contexts/auth-context.tsx`, defaulting to the constant exported in
  step 1.
- `putPreferences` sends a *partial* patch on purpose, so two signed-in
  devices editing different preferences don't clobber each other. Send only
  the changed field.
- **The backend needs four matching edits**, all in `news-khabri-backend`'s
  `src/routes/auth.js`: the field in the zod `preferencesBody` schema, an
  entry in the `PREF_FIELDS` allowlist, a column in the upsert, and the
  row-to-response mapping in `toPreferencesResponse`. `PREF_FIELDS` is the
  one that bites - a field that passes validation but isn't listed there is
  dropped on merge, so the request succeeds, the app shows it saved, and the
  value is gone on the next pull. Do that side in the backend repo with an
  explicit `cd`.
