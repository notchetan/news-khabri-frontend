/* eslint-disable no-console */
// PostToolUse hook: when an edit leaves a `docs/whatever.md` pointer in a
// source file or a doc, check that the file it points at exists.
//
// AGENTS.md's comment convention pushes every long explanation out of the
// code and into `docs/`, leaving a one-line pointer behind - which makes a
// pointer to a doc that was renamed, or never written, a silent dead end.
// Commit 5899e5b ("Fix comments and docs that point at code that no longer
// exists") was an entire cleanup pass over this rot; nothing prevents the
// next one.
//
// A pointer counts as live if the doc exists in EITHER repo. Plenty of
// pointers here mean the backend's copy ("see the backend's
// docs/personalization.md"), and there is no reliable marker for them: the
// phrase that names the backend wraps onto the line above the pointer as
// often as not, and docs/store-submission.md refers to a backend doc with no
// nearby marker at all. Resolving against both repos gets every one of those
// right. The cost is a pointer that means this repo but only exists in the
// backend's - a miss worth taking for zero false alarms.
//
// Advisory, never blocking (exit 0): a pointer written moments before the
// doc it names is a normal order of work, not an error.
//
// Reads the hook payload as JSON on stdin. No jq on this machine - node only.

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..", "..");
const backendRoot = path.join(root, "..", "news-khabri-backend");

const POINTER = /docs\/[a-z0-9-]+\.md/g;

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

  // Payloads arrive with Windows separators here; compare in one shape.
  const unix = file.split(path.sep).join("/").replace(/\\/g, "/");

  // Code comments and doc cross-references only. The root markdown
  // (AGENTS.md, README.md) *describes* the convention - its
  // `// See docs/whatever.md.` is an example, not a pointer.
  if (!/\/(src|docs)\/.*\.(ts|tsx|js|md)$/.test(unix)) process.exit(0);

  let src;
  try {
    src = fs.readFileSync(file, "utf8");
  } catch {
    process.exit(0);
  }

  const pointers = [...new Set(src.match(POINTER) || [])];
  const dead = pointers.filter(
    (p) =>
      !fs.existsSync(path.join(root, p)) &&
      !fs.existsSync(path.join(backendRoot, p))
  );
  if (dead.length === 0) process.exit(0);

  console.log(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PostToolUse",
        additionalContext:
          `${path.basename(file)} points at ${dead.length} doc(s) that ` +
          `exist in neither this repo nor the backend's: ${dead.join(", ")}. ` +
          "Write the doc, fix the name, or drop the pointer - a comment that " +
          "sends the next reader nowhere is worse than no comment.",
      },
      suppressOutput: true,
    })
  );
  process.exit(0);
});
