/**
 * Living Nexus Platform Steward
 * ==============================
 * The PlatformSteward is the top-level orchestrator of the Refinement Engine.
 * It runs all passes in sequence, aggregates results, and produces a
 * combined StewardReport that becomes the platform's institutional memory.
 *
 * Usage:
 *   pnpm refine
 *   → Runs all passes, writes report to refinement/reports/YYYY-MM-DD.json
 *   → Prints human-readable summary to stdout
 */

import * as fs from "fs";
import * as path from "path";
import { DoctrineValidator } from "./doctrine.js";
import { DesignDriftScanner } from "./drift.js";
import { ArchitecturalDebtLedger } from "./debt.js";
import { PageScorer } from "./scorer.js";
import { LessonsLog } from "./lessons.js";
import type {
  StewardReport,
  PassResult,
  DoctrineResult,
  DriftReport,
  DebtLedger,
  PageScore,
} from "./types.js";

// ─── Pass imports ──────────────────────────────────────────────────────────

import { TypographyPass } from "./passes/TypographyPass.js";
import { CreatorExperiencePass } from "./passes/CreatorExperiencePass.js";
import { ApiConsistencyPass } from "./passes/ApiConsistencyPass.js";
import { PerformancePass } from "./passes/PerformancePass.js";
import { ExplorePass } from "./passes/ExplorePass.js";
import { AccessibilityPass } from "./passes/AccessibilityPass.js";
import { AnimationPass } from "./passes/AnimationPass.js";

// ─── Report storage ────────────────────────────────────────────────────────

const REPORTS_DIR = path.join(
  import.meta.dirname ?? __dirname,
  "reports"
);

function gradeFromScore(score: number): StewardReport["platformGrade"] {
  if (score >= 95) return "S";
  if (score >= 85) return "A";
  if (score >= 75) return "B";
  if (score >= 65) return "C";
  if (score >= 50) return "D";
  return "F";
}

// ─── PlatformSteward ──────────────────────────────────────────────────────

export class PlatformSteward {
  private projectRoot: string;
  private doctrine: DoctrineValidator;
  private drift: DesignDriftScanner;
  private debt: ArchitecturalDebtLedger;
  private scorer: PageScorer;
  private lessons: LessonsLog;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.doctrine = new DoctrineValidator(projectRoot);
    this.drift = new DesignDriftScanner(projectRoot);
    this.debt = new ArchitecturalDebtLedger();
    this.scorer = new PageScorer(projectRoot);
    this.lessons = new LessonsLog();
  }

  async run(checkpointVersion?: string): Promise<StewardReport> {
    console.log("\n═══════════════════════════════════════════════════════════");
    console.log("  LIVING NEXUS — PLATFORM STEWARD");
    console.log(`  ${new Date().toISOString()}`);
    if (checkpointVersion) {
      console.log(`  Checkpoint: ${checkpointVersion}`);
    }
    console.log("═══════════════════════════════════════════════════════════\n");

    // ── Step 1: Read lessons first (institutional memory) ──────────────────
    console.log("📖  Reading lessons log (institutional memory)...");
    const lessonsSummary = this.lessons.formatSummary(5);
    console.log(lessonsSummary);

    // ── Step 2: Doctrine validation ────────────────────────────────────────
    console.log("\n📜  Running doctrine validation...");
    const doctrineResults: DoctrineResult[] = await this.doctrine.evaluateAllPages();
    const doctrineReport = this.doctrine.formatReport(doctrineResults);
    console.log(doctrineReport);

    // ── Step 3: Design drift scan ──────────────────────────────────────────
    console.log("\n🔍  Scanning for design drift...");
    const driftReport: DriftReport = await this.drift.scan();
    const driftFormatted = this.drift.formatReport(driftReport);
    console.log(driftFormatted);

    // ── Step 4: Page scoring ───────────────────────────────────────────────
    console.log("\n📊  Scoring all pages...");
    const pageScores: PageScore[] = await this.scorer.scoreAllPages();
    const scoreCard = this.scorer.formatScoreCard(pageScores);
    console.log(scoreCard);

    // ── Step 5: Debt ledger ────────────────────────────────────────────────
    console.log("\n🏗️   Reading architectural debt ledger...");
    const debtLedger: DebtLedger = this.debt.getLedger();
    const debtReport = this.debt.formatReport();
    console.log(debtReport);

    // ── Step 6: Run all passes ─────────────────────────────────────────────
    console.log("\n⚙️   Running refinement passes...");
    const passes = [
      new TypographyPass(),
      new CreatorExperiencePass(),
      new ApiConsistencyPass(),
      new PerformancePass(),
      new ExplorePass(),
      new AccessibilityPass(),
      new AnimationPass(),
    ];

    const passResults: PassResult[] = [];
    for (const pass of passes) {
      console.log(`  → ${pass.name}...`);
      try {
        const result = await pass.run(this.projectRoot);
        passResults.push(result);
        const icon =
          result.status === "passed"
            ? "✓"
            : result.status === "warning"
              ? "⚠"
              : "✗";
        console.log(
          `    ${icon} ${result.status.toUpperCase()}  (${result.findings.length} findings, +${result.scoreImpact} potential score)`
        );
      } catch (err) {
        passResults.push({
          passName: pass.name,
          status: "failed",
          findings: [`Error running pass: ${String(err)}`],
          recommendations: [],
          scoreImpact: 0,
          filesAffected: [],
        });
        console.log(`    ✗ ERROR: ${String(err)}`);
      }
    }

    // ── Step 7: Compute composite platform score ───────────────────────────
    const avgDoctrineScore =
      doctrineResults.length > 0
        ? doctrineResults.reduce((s, r) => s + r.overallScore, 0) /
          doctrineResults.length
        : 70;

    const avgPageScore =
      pageScores.length > 0
        ? pageScores.reduce((s, p) => s + p.overall, 0) / pageScores.length
        : 70;

    const driftPenalty = Math.min(20, driftReport.driftScore / 5);
    const debtPenalty = Math.min(10, debtLedger.openCount * 0.5);

    const platformScore = Math.round(
      avgDoctrineScore * 0.35 +
        avgPageScore * 0.45 +
        (100 - driftPenalty * 5) * 0.1 +
        (100 - debtPenalty * 5) * 0.1
    );

    const platformGrade = gradeFromScore(platformScore);

    // ── Step 8: Derive top priorities ──────────────────────────────────────
    const topPriorities = this.deriveTopPriorities(
      doctrineResults,
      driftReport,
      debtLedger,
      pageScores,
      passResults
    );

    // ── Step 9: Assemble report ────────────────────────────────────────────
    const report: StewardReport = {
      timestamp: new Date().toISOString(),
      checkpointVersion,
      doctrineResults,
      driftReport,
      debtLedger,
      pageScores,
      passResults,
      platformScore,
      platformGrade,
      topPriorities,
      lessonsAdded: 0,
    };

    // ── Step 10: Save report ───────────────────────────────────────────────
    this.saveReport(report);

    // ── Step 11: Print summary ─────────────────────────────────────────────
    this.printSummary(report);

    return report;
  }

  private deriveTopPriorities(
    doctrine: DoctrineResult[],
    drift: DriftReport,
    debt: DebtLedger,
    pages: PageScore[],
    passes: PassResult[]
  ): string[] {
    const priorities: Array<{ priority: string; urgency: number }> = [];

    // Doctrine violations are highest priority
    for (const result of doctrine) {
      if (!result.passes) {
        priorities.push({
          priority: `Fix doctrine violations in ${result.component}: ${result.violations.join(", ")}`,
          urgency: 10,
        });
      }
    }

    // Critical drift findings
    const criticalDrift = Object.values(drift.byDomain)
      .flat()
      .filter((f) => f.severity === "critical");
    if (criticalDrift.length > 0) {
      priorities.push({
        priority: `Fix ${criticalDrift.length} critical design drift finding(s) — ${drift.scheduledPasses.join(", ")} passes needed`,
        urgency: 9,
      });
    }

    // Top debt items (doctrine violations first)
    const topDebt = debt.items
      .filter((i) => i.status === "open" && i.doctrineViolation)
      .sort((a, b) => b.severity * b.estimatedBenefit - a.severity * a.estimatedBenefit)
      .slice(0, 2);
    for (const item of topDebt) {
      priorities.push({
        priority: `Resolve ${item.id} (doctrine violation — ${item.doctrineQuestion}): ${item.description.substring(0, 80)}`,
        urgency: 8,
      });
    }

    // Lowest-scoring pages
    const lowestPages = [...pages]
      .sort((a, b) => a.overall - b.overall)
      .slice(0, 2);
    for (const page of lowestPages) {
      if (page.overall < 75) {
        priorities.push({
          priority: `Improve ${page.page} (${page.grade} grade, ${page.overall}/100): ${page.topIssue}`,
          urgency: 7,
        });
      }
    }

    // Pass recommendations
    for (const pass of passes) {
      if (pass.status === "failed" || pass.status === "warning") {
        if (pass.recommendations.length > 0) {
          priorities.push({
            priority: `${pass.passName}: ${pass.recommendations[0]}`,
            urgency: 6,
          });
        }
      }
    }

    return priorities
      .sort((a, b) => b.urgency - a.urgency)
      .slice(0, 5)
      .map((p) => p.priority);
  }

  private saveReport(report: StewardReport): void {
    if (!fs.existsSync(REPORTS_DIR)) {
      fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }

    const dateStr = new Date().toISOString().split("T")[0];
    const filename = `${dateStr}-steward-report.json`;
    const filepath = path.join(REPORTS_DIR, filename);

    fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
    console.log(`\n💾  Report saved to: refinement/reports/${filename}`);
  }

  private printSummary(report: StewardReport): void {
    console.log("\n═══════════════════════════════════════════════════════════");
    console.log("  PLATFORM STEWARD — FINAL SUMMARY");
    console.log("═══════════════════════════════════════════════════════════");
    console.log(
      `  Platform Score: ${report.platformScore}/100  Grade: ${report.platformGrade}`
    );
    console.log(
      `  Doctrine: ${report.doctrineResults.filter((r) => r.passes).length}/${report.doctrineResults.length} components pass`
    );
    console.log(
      `  Drift Score: ${report.driftReport.driftScore} (${report.driftReport.totalFindings} findings)`
    );
    console.log(
      `  Open Debt: ${report.debtLedger.openCount} items (${report.debtLedger.totalDebt.toFixed(1)} debt units)`
    );
    console.log(
      `  Passes: ${report.passResults.filter((p) => p.status === "passed").length}/${report.passResults.length} passed`
    );
    console.log("");
    console.log("  TOP PRIORITIES:");
    report.topPriorities.forEach((p, i) => {
      console.log(`  ${i + 1}. ${p}`);
    });
    console.log("═══════════════════════════════════════════════════════════\n");
  }
}

// ─── CLI entry point ───────────────────────────────────────────────────────

if (import.meta.url === `file://${process.argv[1]}`) {
  const projectRoot = path.resolve(import.meta.dirname ?? __dirname, "..");
  const checkpointVersion = process.argv[2];
  const steward = new PlatformSteward(projectRoot);
  steward.run(checkpointVersion).catch((err) => {
    console.error("Steward run failed:", err);
    process.exit(1);
  });
}
