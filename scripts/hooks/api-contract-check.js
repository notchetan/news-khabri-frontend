/* eslint-disable no-console */
// PostToolUse hook: when an edit touches an `src/api/` module, check every
// path it passes to `apiFetch` against the routes the sibling backend
// actually defines.
//
// Nothing else catches this. Each api module's tests mock `fetch`, so a path
// that no longer exists server-side still passes jest and tsc; the failure
// only shows up as a 404 on a real device, against a real backend, on a
// screen nobody thought to re-open. Renaming a route in news-khabri-backend
// is exactly the kind of change that leaves this drift behind.
//
// Advisory, never blocking (exit 0): the sibling repo may be absent, on a
// different branch, or mid-change - none of which should stop an edit here.
//
// Paths only, not methods. `apiFetch`'s method lives in an options object
// that is often several lines below the path, and matching on a guess at it
// produced more noise than signal; a renamed or deleted route is the drift
// that actually happens.
//
// Reads the hook payload as JSON on stdin. No jq on this machine - node only.

const fs = require("fs");
const path = require("path");

const BACKEND_ROUTES = path.join(
  __dirname,
  "..",
  "..",
  "..",
  "news-khabri-backend",
  "src",
  "routes"
);

// `${id}` and `:articleId` are the same thing to this check - both stand for
// one path segment - so both sides normalize to `:param` before comparing.
function normalize(p) {
  return p
    .replace(/\?.*$/, "") // query strings are not part of the route
    .replace(/\$\{[^}]*\}/g, ":param")
    .replace(/:[A-Za-z0-9_]+/g, ":param")
    .replace(/\/$/, "");
}

function stripLineComments(src) {
  return src.replace(/^\s*\/\/.*$/gm, "");
}

function frontendPaths(file) {
  const src = stripLineComments(fs.readFileSync(file, "utf8"));
  const found = new Set();
  // First argument of apiFetch: a plain string or a template literal, always
  // starting at the route root.
  const re = /apiFetch\(\s*["'`](\/[^"'`]*)["'`]/g;
  let m;
  while ((m = re.exec(src))) found.add(normalize(m[1]));
  return [...found];
}

function backendPaths() {
  let files;
  try {
    files = fs
      .readdirSync(BACKEND_ROUTES)
      .filter((f) => f.endsWith(".js"))
      .map((f) => path.join(BACKEND_ROUTES, f));
  } catch {
    return null; // sibling repo not checked out next to this one
  }

  const found = new Set();
  for (const f of files) {
    const src = stripLineComments(fs.readFileSync(f, "utf8"));
    // `\s*` spans newlines on purpose - bookmarks.js declares at least one
    // route with its path on the line below `router.delete(`.
    const re =
      /router\.(?:get|post|put|delete|patch)\(\s*["'`](\/[^"'`]*)["'`]/g;
    let m;
    while ((m = re.exec(src))) found.add(normalize(m[1]));
  }
  return [...found];
}

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

  // api modules only - their tests mock fetch and so prove nothing here.
  if (!/src\/api\/[^/]+\.ts$/.test(unix)) process.exit(0);
  if (/__tests__/.test(unix)) process.exit(0);

  let called, served;
  try {
    called = frontendPaths(file);
    served = backendPaths();
  } catch {
    process.exit(0); // a file mid-write is not a contract problem
  }
  if (!served || served.length === 0) process.exit(0);

  const missing = called.filter((p) => !served.includes(p));
  if (missing.length === 0) process.exit(0);

  console.log(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PostToolUse",
        additionalContext:
          `${path.basename(file)} calls ${missing.length} path(s) with no ` +
          "matching route in news-khabri-backend/src/routes: " +
          `${missing.join(", ")}. Either the backend route was renamed or ` +
          "removed, or this path is new and the backend side is still to be " +
          "written - either way, jest passing here does not mean it works.",
      },
      suppressOutput: true,
    })
  );
  process.exit(0);
});
