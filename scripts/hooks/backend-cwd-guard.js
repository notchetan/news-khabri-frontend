/* eslint-disable no-console */
// PreToolUse hook on Bash: this project is a pair of sibling repos
// (news-khabri and news-khabri-backend), and the Bash tool's working
// directory PERSISTS between calls. A command using repo-relative paths with
// no leading `cd` therefore runs wherever the previous call left the shell -
// which has silently produced wrong answers here (a backend `npm test`
// reported as the frontend's, and vice versa).
//
// This does not block; it attaches a reminder to ambiguous commands.

// Commands that resolve paths relative to the repo root - the ones that go
// wrong silently rather than erroring out.
const REPO_RELATIVE =
  /(^|[\s;&|])(npx|npm|jest|tsc|node\s+scripts|find\s+src|cat\s+package\.json|git\s+(status|diff|log|ls-files))\b|(^|[\s;&|(])(src|scripts|docs)\//;

let raw = "";
process.stdin.on("data", (d) => (raw += d));
process.stdin.on("end", () => {
  let cmd = "";
  try {
    cmd = (JSON.parse(raw).tool_input || {}).command || "";
  } catch {
    process.exit(0);
  }

  const startsWithCd = /^\s*cd\s/.test(cmd);
  const namesBackend = /news-khabri-backend/.test(cmd);

  // An explicit `cd` already pins the directory - nothing to warn about.
  if (startsWithCd) process.exit(0);
  if (!namesBackend && !REPO_RELATIVE.test(cmd)) process.exit(0);

  const detail = namesBackend
    ? "This command names news-khabri-backend but does not start with `cd`."
    : "This command uses repo-relative paths but does not start with `cd`.";

  console.log(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        additionalContext:
          `${detail} The Bash working directory persists between calls and ` +
          "may be the sibling repo. Prefix the command with an explicit " +
          "`cd /d/code/news-khabri` or `cd /d/code/news-khabri-backend` so the " +
          "result is unambiguous.",
      },
      suppressOutput: true,
    })
  );
  process.exit(0);
});
