import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { classifyPath, evaluateChanges, parseArguments } from "./verify-visual-boundary.mjs";

assert.equal(classifyPath("client/src/visual-safe/visualLabGate.ts"), "visual-safe");
assert.equal(classifyPath("server/routers/songs.ts"), "locked");
assert.equal(classifyPath("client/src/main.tsx"), "locked");
assert.equal(classifyPath("client/src/index.css"), "controlled");
assert.equal(classifyPath("client/src/new-runtime.ts"), "unknown");
assert.equal(classifyPath("docs/lnls/architecture/ADR-NEXUS-ICON-KIT-SEMANTICS.md"), "infrastructure");

const parsed = parseArguments(["--scope=visual", "--base=origin/main", "--working", "--allow-controlled=client/src/index.css"]);
assert.equal(parsed.scope, "visual");
assert.equal(parsed.base, "origin/main");
assert.equal(parsed.working, true);
assert.equal(parsed.allowControlled.has("client/src/index.css"), true);

const ordinaryVisual = evaluateChanges([{ status: "M", paths: ["client/src/main.tsx"] }], "visual", new Set());
assert.equal(ordinaryVisual[0].outcome, "fail");
const infrastructureVisual = evaluateChanges([{ status: "M", paths: ["client/src/main.tsx"] }], "visual-infrastructure", new Set());
assert.equal(infrastructureVisual[0].outcome, "review");
const protectedRename = evaluateChanges([{ status: "R100", paths: ["server/routes/a.ts", "client/src/visual-safe/a.ts"] }], "visual", new Set());
assert.equal(protectedRename.some((result) => result.outcome === "fail"), true);
const deletedSafeFile = evaluateChanges([{ status: "D", paths: ["client/src/visual-safe/visualLabGate.ts"] }], "visual", new Set());
assert.equal(deletedSafeFile[0].outcome, "fail");

const visualDevDirectory = path.resolve(import.meta.dirname, "../client/src/visual-dev");
for (const entry of fs.readdirSync(visualDevDirectory).filter((name) => /\.(ts|tsx)$/.test(name))) {
  const source = fs.readFileSync(path.join(visualDevDirectory, entry), "utf8");
  for (const forbidden of [
    /\btrpc\b/, /useAuth\s*\(/, /usePlayer\s*\(/, /useQuery\s*\(/, /useInfiniteQuery\s*\(/, /useMutation/,
    /\bfetch\s*\(/, /\baxios\b/, /XMLHttpRequest/, /WebSocket/, /EventSource/, /sendBeacon/,
    /new Audio/, /<audio/i, /localStorage\.clear/, /sessionStorage/, /indexedDB/, /document\.cookie/,
    /from\s+["'][^"']*\/contexts\//, /from\s+["'][^"']*\/components\/player\//, /\bwouter\b/, /WID-[A-Z0-9-]+/,
  ]) {
    assert.equal(forbidden.test(source), false, `${entry} must not include ${forbidden}`);
  }
}

console.log("Visual boundary checks passed.");
