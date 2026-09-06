---
name: add-translation-key
description: Add a new UI string across all ten locale files, or change an existing one, keeping placeholders and key ordering consistent.
disable-model-invocation: true
---

# Add a translation key

One user-facing string means editing ten files under `src/i18n/locales/`.
This skill keeps that mechanical and consistent.

## The ten locales

`en` (source of truth) plus `hi`, `gu`, `bn`, `kn`, `mr`, `ml`, `ta`, `te`,
`or`. `TranslationKey` is derived from `en.ts` (`keyof typeof en`), and every
other locale is annotated `Record<TranslationKey, string>` - so `tsc` fails on
a missing key (TS2741) *and* on a stale one (TS2353). You do not need a
separate key-parity check; you do need `npx tsc --noEmit` to pass.

## Steps

1. **Add to `en.ts` first**, in a position that groups it with related keys -
   the file is loosely ordered by screen/feature, not alphabetically. Follow
   the existing naming: `...Template` suffix for any string with a placeholder,
   `...Error` for failure copy.

2. **Add the same key to all nine others.** Translate genuinely - do not paste
   the English through. Proper nouns stay untranslated by convention (`appName`
   is "News Khabri" in every locale, same rule as publisher names).

3. **Preserve every `{placeholder}` exactly.** `t()` does a literal `{var}`
   substitution, so a dropped or misspelled token renders a stray brace or
   silently omits a number. Word order around the token should follow the
   target language's grammar - only the token itself is fixed.

4. **Mind the script.** Tamil sandhi, Devanagari matras, and Malayalam
   conjuncts have all been corrected after the fact here (see commit #60). If
   a string sits in a fixed-size control, check
   `docs/cross-script-text-rendering.md` - tall scripts need a generous
   `lineHeight`, and `numberOfLines={1}` truncating to "X…" is a sign the
   container is too narrow, not that the text is wrong.

5. **Verify:**
   ```bash
   node scripts/check-i18n-placeholders.js
   npx tsc --noEmit
   npx jest
   ```

## Removing or renaming

Delete or rename in all ten at once. `tsc` will point at every call site of a
removed key, so let it drive the cleanup rather than grepping by hand.
