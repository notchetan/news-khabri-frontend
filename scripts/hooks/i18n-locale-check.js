/* eslint-disable no-console */
// PostToolUse hook: when an edit touches a locale file, verify every
// `{placeholder}` still matches en.ts. Exits 2 (blocking) on mismatch so the
// problem is reported at the edit, not at the next full verify.
//
// Reads the hook payload as JSON on stdin. No jq on this machine - node only.

const { execFileSync } = require("child_process");
const path = require("path");

let raw = "";
process.stdin.on("data", (d) => (raw += d));
process.stdin.on("end", () => {
  let file = "";
  try {
    const p = JSON.parse(raw);
    file = (p.tool_input && p.tool_input.file_path) || "";
  } catch {
    process.exit(0); // unparseable payload is not this hook's problem
  }

  if (!/src[\/]i18n[\/]locales[\/]/.test(file)) process.exit(0);

  try {
    execFileSync(
      process.execPath,
      [path.join(__dirname, "..", "check-i18n-placeholders.js")],
      { stdio: "pipe" }
    );
    process.exit(0);
  } catch (err) {
    const out = (err.stderr || err.stdout || "").toString().trim();
    console.error(out || "i18n placeholder check failed");
    process.exit(2); // blocking: feeds the message back to Claude
  }
});
