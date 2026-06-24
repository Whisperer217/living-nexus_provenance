/**
 * Self-Improvement Worker
 *
 * A background service that periodically audits the Living Nexus codebase,
 * identifies issues using the LLM, applies safe automated fixes, runs tests
 * to verify correctness, and logs all findings and changes to the database.
 *
 * Safety model:
 *   - "Auto-fixable" issues (button types, console.logs, missing dep arrays,
 *     dead imports, etc.) are applied immediately and verified by the test suite.
 *   - "Review required" issues (logic changes, schema changes, security refactors)
 *     are logged as fixStatus="pending" for human review in the admin UI.
 *   - If tests fail after a fix, the change is reverted and fixStatus="failed".
 *
 * Schedule: runs nightly at 2am server time (configurable via SELF_IMPROVE_CRON_HOUR).
 * Can also be triggered manually from the admin UI via the tRPC worker.triggerRun procedure.
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import { eq, desc } from "drizzle-orm";
import { getDb } from "../utils/db";
import { selfImprovementRuns, selfImprovementFindings } from "../../drizzle/schema";
import { invokeLLM } from "../_core/llm";

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Constants ────────────────────────────────────────────────────────────────

// Project root is 2 levels up from server/ (server/selfImprovementWorker.ts → project root)
const PROJECT_ROOT = path.resolve(__dirname, "..");
const WORKER_CRON_HOUR = parseInt(process.env.SELF_IMPROVE_CRON_HOUR ?? "2", 10);
const MAX_FILES_PER_BATCH = 5;       // Files sent to LLM per analysis batch
const MAX_FILE_SIZE_BYTES = 80_000;  // Skip files larger than 80KB (too large for context)
const MAX_LINES_PER_FILE = 1500;     // Truncate very long files for LLM analysis

// File patterns to scan
const SCAN_PATTERNS = [
  "client/src/pages",
  "client/src/components",
  "client/src/hooks",
  "server",
];

// File patterns to always skip
const SKIP_PATTERNS = [
  "_core",
  "node_modules",
  "dist",
  ".test.",
  ".spec.",
  "selfImprovementWorker", // Don't audit ourselves
  "visualQueue",           // Complex async worker — skip for safety
];

// Categories that can be auto-fixed vs require human review
const AUTO_FIXABLE_CATEGORIES = new Set([
  "dead_code",
  "maintainability",
  "accessibility",
]);

// ─── Types ────────────────────────────────────────────────────────────────────

interface LLMFinding {
  severity: "critical" | "high" | "medium" | "low" | "info";
  category: "security" | "performance" | "correctness" | "maintainability" | "accessibility" | "dead_code" | "type_safety" | "error_handling";
  filePath: string;
  lineStart?: number;
  lineEnd?: number;
  title: string;
  description: string;
  autoFixable: boolean;
  fixInstructions?: string;  // Plain-English instructions for applying the fix
  originalSnippet?: string;  // Exact text to find
  replacementSnippet?: string; // Exact text to replace with
}

interface WorkerRunResult {
  runId: number;
  filesScanned: number;
  findingsCount: number;
  fixesApplied: number;
  fixesFailed: number;
  testsPassedBefore: number;
  testsPassedAfter: number;
  analysisSummary: string;
}

// ─── File Collection ──────────────────────────────────────────────────────────

function collectSourceFiles(): string[] {
  const files: string[] = [];

  for (const pattern of SCAN_PATTERNS) {
    const dir = path.join(PROJECT_ROOT, pattern);
    if (!fs.existsSync(dir)) continue;

    const walk = (d: string) => {
      const entries = fs.readdirSync(d, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(d, entry.name);
        const relPath = path.relative(PROJECT_ROOT, fullPath);

        if (SKIP_PATTERNS.some(p => relPath.includes(p))) continue;

        if (entry.isDirectory()) {
          walk(fullPath);
        } else if (entry.isFile() && (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))) {
          const stat = fs.statSync(fullPath);
          if (stat.size <= MAX_FILE_SIZE_BYTES) {
            files.push(relPath);
          }
        }
      }
    };

    walk(dir);
  }

  return files;
}

function readFileForAnalysis(relPath: string): string {
  const fullPath = path.join(PROJECT_ROOT, relPath);
  const content = fs.readFileSync(fullPath, "utf-8");
  const lines = content.split("\n");
  if (lines.length > MAX_LINES_PER_FILE) {
    return lines.slice(0, MAX_LINES_PER_FILE).join("\n") + `\n\n// [TRUNCATED — ${lines.length - MAX_LINES_PER_FILE} more lines]`;
  }
  return content;
}

// ─── LLM Analysis ─────────────────────────────────────────────────────────────

async function analyzeFileBatch(files: Array<{ path: string; content: string }>): Promise<LLMFinding[]> {
  const fileBlocks = files.map(f =>
    `=== FILE: ${f.path} ===\n${f.content}\n`
  ).join("\n");

  const systemPrompt = `You are a senior TypeScript/React code reviewer for the Living Nexus audio provenance platform.
Your job is to identify real, actionable code quality issues in the provided files.

Focus on these issue types (in priority order):
1. SECURITY: unprotected mutations, missing input validation, XSS risks, exposed secrets
2. PERFORMANCE: missing React.memo, unnecessary re-renders, N+1 queries, missing indexes
3. CORRECTNESS: wrong hook dependency arrays, missing null checks, type errors, race conditions
4. ERROR_HANDLING: missing try/catch on async operations, unhandled promise rejections
5. MAINTAINABILITY: dead code, unused imports, overly complex functions (>100 lines), magic numbers
6. ACCESSIBILITY: missing alt text, missing aria labels, non-keyboard-accessible interactive elements
7. DEAD_CODE: unused variables, unreachable code, commented-out code blocks >10 lines
8. TYPE_SAFETY: unsafe 'as any' casts, missing type annotations on exported functions

For each finding, determine if it is AUTO-FIXABLE:
- Auto-fixable: simple text substitutions (add type="button", remove console.log, fix import, add alt="")
- NOT auto-fixable: logic changes, architectural changes, anything requiring understanding of business context

Return a JSON array of findings. Each finding must have ALL required fields.
Be precise with originalSnippet and replacementSnippet — they must be exact text that exists in the file.
Only report real issues. Do not report style preferences or subjective opinions.
Maximum 8 findings per batch.`;

  const userPrompt = `Analyze these ${files.length} file(s) for code quality issues:\n\n${fileBlocks}`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "code_findings",
          strict: true,
          schema: {
            type: "object",
            properties: {
              findings: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    severity: { type: "string", enum: ["critical", "high", "medium", "low", "info"] },
                    category: { type: "string", enum: ["security", "performance", "correctness", "maintainability", "accessibility", "dead_code", "type_safety", "error_handling"] },
                    filePath: { type: "string" },
                    lineStart: { type: "number" },
                    lineEnd: { type: "number" },
                    title: { type: "string" },
                    description: { type: "string" },
                    autoFixable: { type: "boolean" },
                    fixInstructions: { type: "string" },
                    originalSnippet: { type: "string" },
                    replacementSnippet: { type: "string" },
                  },
                  required: ["severity", "category", "filePath", "title", "description", "autoFixable", "fixInstructions", "originalSnippet", "replacementSnippet"],
                  additionalProperties: false,
                },
              },
              batchSummary: { type: "string" },
            },
            required: ["findings", "batchSummary"],
            additionalProperties: false,
          },
        },
      },
    });

    const rawContent = response.choices?.[0]?.message?.content;
    if (!rawContent) return [];
    const content = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);

    const parsed = JSON.parse(content);
    return parsed.findings ?? [];
  } catch (err) {
    console.error("[SelfImprove] LLM analysis error:", err);
    return [];
  }
}

// ─── Fix Application ──────────────────────────────────────────────────────────

function applyFix(finding: LLMFinding): { success: boolean; diff: string; originalContent: string; error?: string } {
  if (!finding.originalSnippet || !finding.replacementSnippet) {
    return { success: false, diff: "", originalContent: "", error: "No snippet provided" };
  }

  const fullPath = path.join(PROJECT_ROOT, finding.filePath);
  if (!fs.existsSync(fullPath)) {
    return { success: false, diff: "", originalContent: "", error: `File not found: ${finding.filePath}` };
  }

  const originalContent = fs.readFileSync(fullPath, "utf-8");

  if (!originalContent.includes(finding.originalSnippet)) {
    return {
      success: false,
      diff: "",
      originalContent: finding.originalSnippet,
      error: `Snippet not found in file — may have already been fixed or file changed`,
    };
  }

  // Only replace the first occurrence (safer than global replace)
  const newContent = originalContent.replace(finding.originalSnippet, finding.replacementSnippet);

  // Generate a simple unified diff
  const diff = generateSimpleDiff(finding.filePath, finding.originalSnippet, finding.replacementSnippet);

  try {
    fs.writeFileSync(fullPath, newContent, "utf-8");
    return { success: true, diff, originalContent: finding.originalSnippet };
  } catch (err) {
    return { success: false, diff: "", originalContent: finding.originalSnippet, error: String(err) };
  }
}

function revertFix(filePath: string, originalSnippet: string, replacementSnippet: string): boolean {
  const fullPath = path.join(PROJECT_ROOT, filePath);
  if (!fs.existsSync(fullPath)) return false;

  const content = fs.readFileSync(fullPath, "utf-8");
  if (!content.includes(replacementSnippet)) return false;

  const reverted = content.replace(replacementSnippet, originalSnippet);
  fs.writeFileSync(fullPath, reverted, "utf-8");
  return true;
}

function generateSimpleDiff(filePath: string, original: string, replacement: string): string {
  const origLines = original.split("\n").map(l => `- ${l}`).join("\n");
  const replLines = replacement.split("\n").map(l => `+ ${l}`).join("\n");
  return `--- ${filePath}\n+++ ${filePath}\n${origLines}\n${replLines}`;
}

// ─── Test Runner ──────────────────────────────────────────────────────────────

function runTests(): number {
  try {
    const result = execSync("pnpm test --reporter=verbose 2>&1", {
      cwd: PROJECT_ROOT,
      timeout: 120_000,
      encoding: "utf-8",
    });
    // Count passed tests from output
    const match = result.match(/Tests\s+(\d+) passed/);
    return match ? parseInt(match[1], 10) : 0;
  } catch (err: any) {
    // execSync throws on non-zero exit — parse output for pass count
    const output = err.stdout ?? err.message ?? "";
    const match = output.match(/Tests\s+(\d+) passed/);
    return match ? parseInt(match[1], 10) : 0;
  }
}

function runTypeCheck(): boolean {
  try {
    execSync("npx tsc --noEmit 2>&1", {
      cwd: PROJECT_ROOT,
      timeout: 60_000,
      encoding: "utf-8",
    });
    return true;
  } catch {
    return false;
  }
}

// ─── DB Helpers ───────────────────────────────────────────────────────────────

async function createRun(triggeredBy: "schedule" | "manual", triggeredByUserId?: number): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const result = await db.insert(selfImprovementRuns).values({
    triggeredBy,
    triggeredByUserId: triggeredByUserId ?? null,
    status: "running",
    startedAt: new Date(),
  });

  return (result as any).insertId;
}

async function updateRun(runId: number, data: Partial<{
  status: "running" | "completed" | "failed";
  filesScanned: number;
  findingsCount: number;
  fixesApplied: number;
  fixesFailed: number;
  testsPassedBefore: number;
  testsPassedAfter: number;
  analysisSummary: string;
  errorMessage: string;
  completedAt: Date;
}>) {
  const db = await getDb();
  if (!db) return;
  await db.update(selfImprovementRuns).set(data).where(eq(selfImprovementRuns.id, runId));
}

async function saveFinding(runId: number, finding: LLMFinding, fixStatus: "pending" | "applied" | "failed" | "skipped", opts?: {
  fixDiff?: string;
  fixError?: string;
  originalContent?: string;
  fixedAt?: Date;
}) {
  const db = await getDb();
  if (!db) return;

  await db.insert(selfImprovementFindings).values({
    runId,
    severity: finding.severity,
    category: finding.category,
    filePath: finding.filePath,
    lineStart: finding.lineStart ?? null,
    lineEnd: finding.lineEnd ?? null,
    title: finding.title,
    description: finding.description,
    fixStatus,
    fixDiff: opts?.fixDiff ?? null,
    fixError: opts?.fixError ?? null,
    originalContent: opts?.originalContent ?? null,
    fixedAt: opts?.fixedAt ?? null,
  });
}

// ─── Main Worker Logic ────────────────────────────────────────────────────────

export async function runSelfImprovementCycle(
  triggeredBy: "schedule" | "manual" = "schedule",
  triggeredByUserId?: number
): Promise<WorkerRunResult> {
  console.log(`[SelfImprove] Starting run (triggeredBy=${triggeredBy})`);

  const runId = await createRun(triggeredBy, triggeredByUserId);
  let filesScanned = 0;
  let findingsCount = 0;
  let fixesApplied = 0;
  let fixesFailed = 0;
  const summaryParts: string[] = [];

  try {
    // Step 1: Run tests before any changes
    console.log("[SelfImprove] Running baseline tests...");
    const testsPassedBefore = runTests();
    console.log(`[SelfImprove] Baseline: ${testsPassedBefore} tests passing`);

    await updateRun(runId, { testsPassedBefore });

    // Step 2: Collect source files
    const allFiles = collectSourceFiles();
    console.log(`[SelfImprove] Found ${allFiles.length} files to scan`);

    // Step 3: Analyze files in batches
    const allFindings: LLMFinding[] = [];

    for (let i = 0; i < allFiles.length; i += MAX_FILES_PER_BATCH) {
      const batch = allFiles.slice(i, i + MAX_FILES_PER_BATCH);
      const batchFiles = batch.map(p => ({
        path: p,
        content: readFileForAnalysis(p),
      }));

      console.log(`[SelfImprove] Analyzing batch ${Math.floor(i / MAX_FILES_PER_BATCH) + 1}/${Math.ceil(allFiles.length / MAX_FILES_PER_BATCH)}: ${batch.join(", ")}`);

      const batchFindings = await analyzeFileBatch(batchFiles);
      allFindings.push(...batchFindings);
      filesScanned += batch.length;

      // Brief pause between batches to avoid rate limiting
      await new Promise(r => setTimeout(r, 500));
    }

    console.log(`[SelfImprove] Analysis complete. ${allFindings.length} findings across ${filesScanned} files`);
    findingsCount = allFindings.length;

    // Step 4: Apply auto-fixable findings
    const autoFixable = allFindings.filter(f => f.autoFixable && f.originalSnippet && f.replacementSnippet);
    const needsReview = allFindings.filter(f => !f.autoFixable);

    // Save "needs review" findings immediately
    for (const finding of needsReview) {
      await saveFinding(runId, finding, "pending");
    }

    // Apply auto-fixable findings one at a time, running type check after each
    const appliedFixes: Array<{ finding: LLMFinding; originalContent: string; replacementSnippet: string }> = [];

    for (const finding of autoFixable) {
      console.log(`[SelfImprove] Applying fix: ${finding.title} in ${finding.filePath}`);
      const result = applyFix(finding);

      if (!result.success) {
        console.warn(`[SelfImprove] Fix failed: ${result.error}`);
        await saveFinding(runId, finding, "failed", { fixError: result.error });
        fixesFailed++;
        continue;
      }

      // Quick type check after each fix
      const typeCheckOk = runTypeCheck();
      if (!typeCheckOk) {
        console.warn(`[SelfImprove] Type check failed after fix — reverting: ${finding.title}`);
        revertFix(finding.filePath, result.originalContent, finding.replacementSnippet!);
        await saveFinding(runId, finding, "failed", {
          fixDiff: result.diff,
          fixError: "TypeScript type check failed after applying fix — reverted",
          originalContent: result.originalContent,
        });
        fixesFailed++;
        continue;
      }

      appliedFixes.push({
        finding,
        originalContent: result.originalContent,
        replacementSnippet: finding.replacementSnippet!,
      });

      await saveFinding(runId, finding, "applied", {
        fixDiff: result.diff,
        originalContent: result.originalContent,
        fixedAt: new Date(),
      });

      fixesApplied++;
    }

    // Step 5: Run tests after all fixes to verify nothing broke
    console.log("[SelfImprove] Running post-fix tests...");
    const testsPassedAfter = runTests();
    console.log(`[SelfImprove] Post-fix: ${testsPassedAfter} tests passing`);

    // If tests regressed, revert ALL applied fixes
    if (testsPassedAfter < testsPassedBefore) {
      console.error(`[SelfImprove] Test regression detected (${testsPassedBefore} → ${testsPassedAfter}). Reverting all fixes.`);

      for (const { finding, originalContent, replacementSnippet } of appliedFixes) {
        revertFix(finding.filePath, originalContent, replacementSnippet);
      }

      // Update all applied findings to "failed"
      const db = await getDb();
      if (db) {
        await db.update(selfImprovementFindings)
          .set({ fixStatus: "failed", fixError: "Test regression detected — all fixes in this run reverted" })
          .where(eq(selfImprovementFindings.runId, runId));
      }

      fixesFailed += fixesApplied;
      fixesApplied = 0;

      summaryParts.push(`⚠️ Test regression detected after applying ${appliedFixes.length} fixes. All changes reverted.`);
    } else {
      summaryParts.push(`✅ ${fixesApplied} fixes applied successfully. Tests: ${testsPassedBefore} → ${testsPassedAfter} passing.`);
    }

    // Step 6: Build summary
    const bySeverity = allFindings.reduce((acc, f) => {
      acc[f.severity] = (acc[f.severity] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const severitySummary = Object.entries(bySeverity)
      .sort(([a], [b]) => ["critical", "high", "medium", "low", "info"].indexOf(a) - ["critical", "high", "medium", "low", "info"].indexOf(b))
      .map(([s, c]) => `${s}: ${c}`)
      .join(", ");

    summaryParts.push(`📊 ${findingsCount} findings (${severitySummary})`);
    summaryParts.push(`🔧 ${fixesApplied} auto-fixed, ${needsReview.length} pending review, ${fixesFailed} failed`);
    summaryParts.push(`📁 ${filesScanned} files scanned`);

    const analysisSummary = summaryParts.join("\n");

    await updateRun(runId, {
      status: "completed",
      filesScanned,
      findingsCount,
      fixesApplied,
      fixesFailed,
      testsPassedAfter,
      analysisSummary,
      completedAt: new Date(),
    });

    console.log(`[SelfImprove] Run ${runId} completed. ${analysisSummary}`);

    return {
      runId,
      filesScanned,
      findingsCount,
      fixesApplied,
      fixesFailed,
      testsPassedBefore,
      testsPassedAfter,
      analysisSummary,
    };

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(`[SelfImprove] Run ${runId} failed:`, err);

    await updateRun(runId, {
      status: "failed",
      filesScanned,
      findingsCount,
      fixesApplied,
      fixesFailed,
      errorMessage,
      completedAt: new Date(),
    });

    throw err;
  }
}

// ─── Revert a specific finding ────────────────────────────────────────────────

export async function revertFinding(findingId: number): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();
  if (!db) return { success: false, error: "Database unavailable" };

  const [finding] = await db.select().from(selfImprovementFindings).where(eq(selfImprovementFindings.id, findingId)).limit(1);
  if (!finding) return { success: false, error: "Finding not found" };
  if (finding.fixStatus !== "applied") return { success: false, error: `Cannot revert — status is ${finding.fixStatus}` };
  if (!finding.originalContent || !finding.fixDiff) return { success: false, error: "No original content stored for revert" };

  // Extract replacement from diff (lines starting with +)
  const replacementLines = finding.fixDiff.split("\n")
    .filter((l: string) => l.startsWith("+ "))
    .map((l: string) => l.slice(2))
    .join("\n");

  const reverted = revertFix(finding.filePath, finding.originalContent, replacementLines);
  if (!reverted) return { success: false, error: "Could not find replacement text in file — may have been modified" };

  await db.update(selfImprovementFindings)
    .set({ fixStatus: "reverted" })
    .where(eq(selfImprovementFindings.id, findingId));

  return { success: true };
}

// ─── DB Query Helpers ─────────────────────────────────────────────────────────

export async function getSelfImprovementRuns(limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(selfImprovementRuns).orderBy(desc(selfImprovementRuns.startedAt)).limit(limit);
}

export async function getSelfImprovementRunById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const [run] = await db.select().from(selfImprovementRuns).where(eq(selfImprovementRuns.id, id)).limit(1);
  return run ?? null;
}

export async function getFindingsByRun(runId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(selfImprovementFindings)
    .where(eq(selfImprovementFindings.runId, runId))
    .orderBy(desc(selfImprovementFindings.createdAt))
    .limit(200);
}

// ─── Scheduler ────────────────────────────────────────────────────────────────

let workerScheduled = false;

export function startSelfImprovementWorker(): void {
  if (workerScheduled) return;
  workerScheduled = true;

  console.log(`[SelfImprove] Worker scheduled (nightly at ${WORKER_CRON_HOUR}:00 server time)`);

  // Check every hour if it's time to run
  const checkAndRun = () => {
    const now = new Date();
    const hour = now.getHours();

    if (hour === WORKER_CRON_HOUR) {
      console.log("[SelfImprove] Scheduled run starting...");
      runSelfImprovementCycle("schedule").catch(err =>
        console.error("[SelfImprove] Scheduled run error:", err)
      );
    }
  };

  // Run check every hour
  setInterval(checkAndRun, 60 * 60 * 1000);
}
