#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = path.resolve(import.meta.dirname, "..");
const INFRASTRUCTURE_EXCEPTIONS = new Set([
  "client/src/main.tsx",
  "package.json",
  "client/src/visual-dev/VisualLabPage.tsx",
  "client/src/visual-dev/VisualControlsPanel.tsx",
  "client/src/visual-dev/VisualSpecimens.tsx",
  "client/src/visual-dev/visualLab.css",
  "client/src/visual-dev/visualSpecimens.css",
  "scripts/verify-visual-boundary.mjs",
  "scripts/verify-visual-boundary.test.mjs",
  "scripts/visual-vitest.config.ts",
  "docs/VISUAL_ARCHITECTURE.md",
  "docs/VISUAL_CHANGE_POLICY.md",
  "docs/lnls/design/VISUAL_CHANGELOG.md",
  "docs/lnls/architecture/ADR-NEXUS-ICON-KIT-SEMANTICS.md",
]);

function isLocked(pathname) {
  return [
    "server/", "shared/", "drizzle/", "refinement/", "integrations/jellyfin/", "client/public/",
    "client/src/_core/", "client/src/contexts/", "client/src/hooks/", "client/src/components/player/",
    "client/src/App.tsx", "client/src/main.tsx", "client/index.html", "package.json", "pnpm-lock.yaml",
    "vite.config.ts", "vitest.config.ts", "tsconfig.json", "drizzle.config.ts", "Dockerfile",
  ].some((prefix) => pathname === prefix || pathname.startsWith(prefix));
}

export function classifyPath(pathname) {
  if (pathname.startsWith("client/src/visual-safe/")) return "visual-safe";
  if (pathname === "docs/lnls/design/VISUAL_CHANGELOG.md") return "visual-safe";
  if (isLocked(pathname)) return "locked";
  if (pathname.startsWith("client/src/visual-dev/") || pathname.startsWith("scripts/verify-visual-boundary") || pathname === "scripts/visual-vitest.config.ts" || pathname === "docs/VISUAL_ARCHITECTURE.md" || pathname === "docs/VISUAL_CHANGE_POLICY.md" || pathname === "docs/lnls/architecture/ADR-NEXUS-ICON-KIT-SEMANTICS.md") return "infrastructure";
  if (pathname === "client/src/index.css" || pathname.startsWith("client/src/pages/") || pathname.startsWith("client/src/components/") || pathname.startsWith("client/src/design-system/")) return "controlled";
  return "unknown";
}

export function parseArguments(argv) {
  const parsed = { scope: null, base: null, head: "HEAD", working: false, allowControlled: new Set() };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const next = argv[index + 1];
    if (argument.startsWith("--scope=")) parsed.scope = argument.slice(8);
    else if (argument === "--scope") parsed.scope = next, index += 1;
    else if (argument.startsWith("--base=")) parsed.base = argument.slice(7);
    else if (argument === "--base") parsed.base = next, index += 1;
    else if (argument.startsWith("--head=")) parsed.head = argument.slice(7);
    else if (argument === "--head") parsed.head = next, index += 1;
    else if (argument === "--working") parsed.working = true;
    else if (argument.startsWith("--allow-controlled=")) parsed.allowControlled.add(argument.slice(19));
    else if (argument === "--allow-controlled") parsed.allowControlled.add(next), index += 1;
  }
  return parsed;
}

function git(args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" });
}

function refExists(ref) {
  try {
    git(["rev-parse", "--verify", "--quiet", ref]);
    return true;
  } catch {
    return false;
  }
}

function defaultBase() {
  return ["origin/main", "main"].find(refExists) ?? null;
}

function parseNameStatus(output) {
  const fields = output.split("\0").filter(Boolean);
  const changes = [];
  for (let index = 0; index < fields.length;) {
    const status = fields[index++];
    const code = status[0];
    if (code === "R" || code === "C") {
      changes.push({ status, paths: [fields[index++], fields[index++]] });
    } else {
      changes.push({ status, paths: [fields[index++]] });
    }
  }
  return changes;
}

function diffChanges(args) {
  return parseNameStatus(git(["diff", "--name-status", "-z", "--find-renames", ...args]));
}

function collectChanges(base, head, working) {
  const changes = diffChanges([`${base}...${head}`]);
  if (!working) return changes;
  changes.push(...diffChanges([]), ...diffChanges(["--cached"]));
  const untracked = git(["ls-files", "--others", "--exclude-standard", "-z"]).split("\0").filter(Boolean);
  changes.push(...untracked.map((pathname) => ({ status: "A", paths: [pathname] })));
  return changes;
}

export function evaluateChanges(changes, scope, allowControlled) {
  const results = [];
  for (const change of changes) {
    for (const pathname of change.paths) {
      const category = classifyPath(pathname);
      let outcome = "pass";
      if (change.status.startsWith("D")) {
        outcome = "fail";
      } else if (category === "locked") {
        outcome = scope === "visual-infrastructure" && INFRASTRUCTURE_EXCEPTIONS.has(pathname) ? "review" : "fail";
      } else if (category === "controlled") {
        outcome = allowControlled.has(pathname) ? "review" : "fail";
      } else if (category === "infrastructure") {
        outcome = scope === "visual-infrastructure" ? "review" : "fail";
      } else if (category === "unknown") {
        outcome = "fail";
      }
      results.push({ status: change.status, pathname, category, outcome });
    }
  }
  return results;
}

export function main(argv = process.argv.slice(2)) {
  const options = parseArguments(argv);
  if (!options.scope) {
    console.error("FAIL: declare --scope=visual or --scope=visual-infrastructure.");
    return 2;
  }
  if (options.scope !== "visual" && options.scope !== "visual-infrastructure") {
    console.error("FAIL: --scope must be visual or visual-infrastructure");
    return 2;
  }
  const base = options.base ?? defaultBase();
  if (!base || !refExists(base) || !refExists(options.head)) {
    console.error("FAIL: resolve --base and --head explicitly; the verifier will not guess a commit baseline.");
    return 2;
  }

  const results = evaluateChanges(collectChanges(base, options.head, options.working), options.scope, options.allowControlled);
  console.log(`Visual boundary scope=${options.scope} base=${base} head=${options.head} working=${options.working}`);
  if (!results.length) console.log("PASS: no changed files.");
  for (const result of results) {
    console.log(`${result.outcome.toUpperCase()} ${result.status}\t${result.category}\t${result.pathname}`);
  }
  return results.some((result) => result.outcome === "fail") ? 1 : 0;
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  process.exitCode = main();
}
