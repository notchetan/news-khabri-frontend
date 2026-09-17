/* eslint-disable no-console */
// Stop hook: runs the two checks AGENTS.md requires after every change
// (`tsc --noEmit`, then the full jest suite) - but only when something under
// src/ actually differs from HEAD, so answering a question or editing a doc
// doesn't trigger a ~100s run.
//
// Also runs the sibling backend's own Stop hook: sessions start here, and a
// project's hooks only load from the directory Claude was launched in.
//
// Reports through systemMessage rather than blocking: a red suite is
// information for the user, and a Stop hook that refuses to stop can loop.

const { execSync, spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..", "..");
const backendHook = path.join(
  root, "..", "news-khabri-backend", "scripts", "hooks", "verify-on-stop.js"
);

// jest writes its summary to stderr, so every caller must read both streams.
function run(cmd) {
  const res = spawnSync(cmd, { cwd: root, encoding: "utf8", shell: true });
  return { ok: res.status === 0, out: (res.stdout || "") + (res.stderr || "") };
}

function verifyFrontend() {
  try {
    // No src/ changes vs HEAD -> nothing worth verifying.
    execSync("git diff --quiet HEAD -- src/", { cwd: root, stdio: "pipe" });
    return null;
  } catch {
    // differences present (or not a git repo) - fall through and verify
  }

  const tsc = run("npx tsc --noEmit");
  if (!tsc.ok) {
    return `Typecheck FAILED:\n${tsc.out.trim().split("\n").slice(0, 5).join("\n")}`;
  }

  const jest = run("npx jest --ci --silent");
  const summary = (
    jest.out.match(/Tests:.*/) || [jest.ok ? "tests passed" : "jest failed"]
  )[0].trim();
  return jest.ok ? `Verify OK - tsc clean, ${summary}` : `Tests FAILED - ${summary}`;
}

// The backend hook gates on its own diff and prints nothing when clean.
function verifyBackend() {
  if (!fs.existsSync(backendHook)) return null;
  const out = spawnSync(process.execPath, [backendHook], { encoding: "utf8" }).stdout;
  try {
    return JSON.parse(out).systemMessage;
  } catch {
    return null;
  }
}

const messages = [verifyFrontend(), verifyBackend()].filter(Boolean);
if (messages.length) {
  console.log(JSON.stringify({ systemMessage: messages.join("\n"), suppressOutput: true }));
}
