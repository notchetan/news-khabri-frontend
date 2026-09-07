/* eslint-disable no-console */
// Verifies that every `{placeholder}` token in en.ts survives into all nine
// other locale files.
//
// tsc already guards locale *keys* in both directions - each locale is
// annotated `Record<TranslationKey, string>` (see i18n/translations.ts), so a
// missing key is a TS2741 and a stale one a TS2353. What it can't see is the
// string *contents*: `t()` does a plain `{var}` substitution, so a translator
// dropping `{count}` or typing `{cont}` yields a literal brace in the UI, or a
// silently missing number, with a green build.
//
//   node scripts/check-i18n-placeholders.js

const fs = require("fs");
const path = require("path");

const LOCALES_DIR = path.join(__dirname, "..", "src", "i18n", "locales");
// Matches `  someKey: "…"` - the one-key-per-line shape every locale uses.
const ENTRY = /^\s{2}([a-zA-Z0-9_]+):\s*"(.*)",?\s*$/;
const PLACEHOLDER = /\{[a-zA-Z0-9_]+\}/g;

function placeholdersByKey(file) {
  const out = new Map();
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(ENTRY);
    if (!m) continue;
    out.set(m[1], new Set(m[2].match(PLACEHOLDER) || []));
  }
  return out;
}

const base = placeholdersByKey(path.join(LOCALES_DIR, "en.ts"));
const problems = [];

for (const file of fs.readdirSync(LOCALES_DIR).sort()) {
  if (file === "en.ts" || !file.endsWith(".ts")) continue;
  const locale = placeholdersByKey(path.join(LOCALES_DIR, file));

  for (const [key, expected] of base) {
    // Key coverage itself is tsc's job; only compare keys present in both.
    if (expected.size === 0 || !locale.has(key)) continue;
    const actual = locale.get(key);
    const missing = [...expected].filter((p) => !actual.has(p));
    const unexpected = [...actual].filter((p) => !expected.has(p));
    if (missing.length || unexpected.length) {
      problems.push(
        `${file} -> ${key}: ` +
          [
            missing.length ? `missing ${missing.join(", ")}` : "",
            unexpected.length ? `unexpected ${unexpected.join(", ")}` : "",
          ]
            .filter(Boolean)
            .join("; ")
      );
    }
  }
}

if (problems.length) {
  console.error("i18n placeholder mismatch:");
  for (const p of problems) console.error("  " + p);
  process.exit(1);
}

const templated = [...base.values()].filter((s) => s.size > 0).length;
console.log(`i18n placeholders OK (${templated} templated keys x 9 locales)`);
