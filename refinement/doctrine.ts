/**
 * Living Nexus Doctrine Validator
 * ================================
 * No component ships until all seven doctrine questions pass.
 *
 * The Seven Questions:
 * 1. Does this increase trust?
 * 2. Does authorship feel visible?
 * 3. Does provenance feel tangible?
 * 4. Can the creator's story be understood in seconds?
 * 5. Can someone support the creator with one obvious action?
 * 6. Does this screen preserve context instead of hiding it?
 * 7. Is the work treated like a living artifact rather than just a file?
 */

import * as fs from "fs";
import * as path from "path";
import type {
  DoctrineQuestion,
  DoctrineEvaluation,
  DoctrineResult,
} from "./types.js";

// ─── Doctrine Rules ────────────────────────────────────────────────────────

interface DoctrineRule {
  question: DoctrineQuestion;
  label: string;
  description: string;
  // Signals that indicate a PASS (patterns to look for in the component code)
  passSignals: string[];
  // Signals that indicate a FAIL (anti-patterns)
  failSignals: string[];
  weight: number; // 1–3, how critical this question is
}

const DOCTRINE_RULES: DoctrineRule[] = [
  {
    question: "trust",
    label: "Does this increase trust?",
    description:
      "The component should display verifiable information, WID badges, timestamps, or provenance signals that build user confidence.",
    passSignals: [
      "WID",
      "witnessId",
      "provenanceChain",
      "verified",
      "timestamp",
      "registeredAt",
      "shield",
      "Shield",
      "certificate",
    ],
    failSignals: [
      "unverified",
      "TODO",
      "FIXME",
      "mock",
      "fake",
    ],
    weight: 3,
  },
  {
    question: "attribution",
    label: "Does authorship feel visible?",
    description:
      "Creator name, handle, and avatar must be prominently displayed. The creator should be the first thing a viewer sees.",
    passSignals: [
      "artistName",
      "creatorName",
      "artistHandle",
      "profilePhotoUrl",
      "creator",
      "author",
      "CreatorPanel",
      "avatar",
    ],
    failSignals: ["anonymous", "Unknown Creator", "unknown creator"],
    weight: 3,
  },
  {
    question: "provenance",
    label: "Does provenance feel tangible?",
    description:
      "The provenance chain, WID, registration date, and custody path should be visible or one click away.",
    passSignals: [
      "provenanceChain",
      "witnessId",
      "WID-",
      "registeredAt",
      "verifyWid",
      "ProvenanceChain",
      "custody",
      "lineage",
    ],
    failSignals: [],
    weight: 2,
  },
  {
    question: "discoverability",
    label: "Can the creator's story be understood in seconds?",
    description:
      "Bio, origin story, and artist statement should be above the fold or immediately accessible.",
    passSignals: [
      "bio",
      "originStory",
      "haaiOriginStory",
      "artistStatement",
      "originStatement",
      "story",
    ],
    failSignals: ["collapsed", "sr-only", "hidden truncate"],
    weight: 2,
  },
  {
    question: "support",
    label: "Can someone support the creator with one obvious action?",
    description:
      "A Support Creator button or equivalent must be visible without scrolling on any creator-facing page.",
    passSignals: [
      "SupportCreatorDrawer",
      "supportTarget",
      "Support Creator",
      "tipOpen",
      "TipModal",
      "patronage",
      "createTipCheckout",
    ],
    failSignals: [],
    weight: 3,
  },
  {
    question: "stewardship",
    label: "Does this screen preserve context instead of hiding it?",
    description:
      "Navigation, breadcrumbs, and back buttons must always give the user a way out. Context should never be lost.",
    passSignals: [
      "navigate(-1)",
      "router.back",
      "Link href",
      "breadcrumb",
      "back",
      "Back",
      "ArrowLeft",
    ],
    failSignals: ["dead end", "no navigation", "no back"],
    weight: 1,
  },
  {
    question: "permanence",
    label: "Is the work treated like a living artifact rather than just a file?",
    description:
      "Works should display their WID, registration date, content type, and provenance — not just a title and audio player.",
    passSignals: [
      "witnessId",
      "registeredAt",
      "contentType",
      "WID",
      "certificate",
      "provenanceChain",
      "haaiOriginStory",
    ],
    failSignals: ["just a file", "audio only", "no metadata"],
    weight: 2,
  },
];

// ─── DoctrineValidator ─────────────────────────────────────────────────────

export class DoctrineValidator {
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  /**
   * Evaluate a single component file against all 7 doctrine questions.
   */
  async evaluateFile(filePath: string): Promise<DoctrineResult> {
    const absolutePath = path.resolve(this.projectRoot, filePath);
    let content = "";

    try {
      content = fs.readFileSync(absolutePath, "utf-8");
    } catch {
      return {
        component: filePath,
        evaluations: [],
        overallScore: 0,
        passes: false,
        violations: DOCTRINE_RULES.map((r) => r.question),
      };
    }

    const evaluations: DoctrineEvaluation[] = DOCTRINE_RULES.map((rule) => {
      const passCount = rule.passSignals.filter((sig) =>
        content.includes(sig)
      ).length;
      const failCount = rule.failSignals.filter((sig) =>
        content.includes(sig)
      ).length;

      // Score: pass signals increase score, fail signals decrease it
      const rawScore = Math.min(
        100,
        Math.max(
          0,
          passCount > 0
            ? 60 + Math.min(40, passCount * 10) - failCount * 20
            : failCount > 0
              ? 20
              : 50 // neutral — no signals either way
        )
      );

      const passes = rawScore >= 70 && failCount === 0;

      return {
        question: rule.question,
        passes,
        score: rawScore,
        evidence:
          passCount > 0
            ? `Found ${passCount} pass signal(s): ${rule.passSignals.filter((s) => content.includes(s)).join(", ")}`
            : failCount > 0
              ? `Found ${failCount} fail signal(s): ${rule.failSignals.filter((s) => content.includes(s)).join(", ")}`
              : "No signals detected — manual review recommended",
        recommendation: passes
          ? undefined
          : `Ensure ${rule.description}`,
      };
    });

    const weightedScore =
      evaluations.reduce((sum, ev, i) => {
        return sum + ev.score * DOCTRINE_RULES[i].weight;
      }, 0) / DOCTRINE_RULES.reduce((sum, r) => sum + r.weight, 0);

    const violations = evaluations
      .filter((ev) => !ev.passes)
      .map((ev) => ev.question);

    return {
      component: filePath,
      evaluations,
      overallScore: Math.round(weightedScore),
      passes: violations.length === 0,
      violations,
    };
  }

  /**
   * Evaluate all key pages against the doctrine.
   */
  async evaluateAllPages(): Promise<DoctrineResult[]> {
    const keyPages = [
      "client/src/pages/SongDetailPage.tsx",
      "client/src/pages/VerifyPage.tsx",
      "client/src/pages/CreatorProfilePage.tsx",
      "client/src/pages/ExplorePage.tsx",
      "client/src/pages/ArchivePage.tsx",
      "client/src/pages/HomePage.tsx",
      "client/src/pages/DashboardPage.tsx",
      "client/src/components/WorkListRow.tsx",
      "client/src/components/SupportCreatorDrawer.tsx",
    ];

    const results: DoctrineResult[] = [];
    for (const page of keyPages) {
      const result = await this.evaluateFile(page);
      results.push(result);
    }
    return results;
  }

  /**
   * Print a human-readable doctrine report.
   */
  formatReport(results: DoctrineResult[]): string {
    const lines: string[] = [
      "═══════════════════════════════════════════════════════════",
      "  LIVING NEXUS — DOCTRINE VALIDATION REPORT",
      `  Generated: ${new Date().toISOString()}`,
      "═══════════════════════════════════════════════════════════",
      "",
    ];

    for (const result of results) {
      const status = result.passes ? "✓ PASSES" : "✗ VIOLATIONS";
      lines.push(`${status}  ${result.component}  [${result.overallScore}/100]`);

      if (!result.passes) {
        for (const violation of result.violations) {
          const ev = result.evaluations.find((e) => e.question === violation)!;
          lines.push(`  ↳ [${violation.toUpperCase()}] ${ev.recommendation}`);
        }
      }
      lines.push("");
    }

    const passing = results.filter((r) => r.passes).length;
    const avgScore =
      results.reduce((s, r) => s + r.overallScore, 0) / results.length;

    lines.push("─────────────────────────────────────────────────────────");
    lines.push(
      `  ${passing}/${results.length} components pass all doctrine questions`
    );
    lines.push(`  Platform Doctrine Score: ${Math.round(avgScore)}/100`);
    lines.push("═══════════════════════════════════════════════════════════");

    return lines.join("\n");
  }
}
