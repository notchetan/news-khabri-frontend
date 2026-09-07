/* eslint-disable no-console */
// Stop hook: runs the two checks AGENTS.md requires after every change
// (`tsc --noEmit`, then the full jest suite) - but only when something under
// src/ actually differs from HEAD, so answering a question or editing a doc
// doesn't trigger a ~100s run.
//
// Reports through systemMessage rather than blocking: a red suite is
// information for the user, and a Stop hook that refuses to stop can loop.

const { execSync, spawnSync } = require("child_process");
const path = require("path");

const root = path.join(__dirname, "..", "..");

// jest writes its summary to stderr, so every caller must read both streams.
function run(cmd) {
  const res = spawnSync(cmd, { cwd: root, encoding: "utf8", shell: true });
  return { ok: res.status === 0, out: (res.stdout || "") + (res.stderr || "") };
}

function say(message) {
  console.log(JSON.stringify({ systemMessage: message, suppressOutput: true }));
  process.exit(0);
}

try {
  // No src/ changes vs HEAD -> nothing worth verifying.
  execSync("git diff --quiet HEAD -- src/", { cwd: root, stdio: "pipe" });
  process.exit(0);
} catch {
  // differences present (or not a git repo) - fall through and verify
}

const tsc = run("npx tsc --noEmit");
if (!tsc.ok) {
  say(`Typecheck FAILED:\n${tsc.out.trim().split("\n").slice(0, 5).join("\n")}`);
}

const jest = run("npx jest --ci --silent");
const summary = (
  jest.out.match(/Tests:.*/) || [jest.ok ? "tests passed" : "jest failed"]
)[0].trim();
say(jest.ok ? `Verify OK - tsc clean, ${summary}` : `Tests FAILED - ${summary}`);
