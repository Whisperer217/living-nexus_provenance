/**
 * Living Nexus Page Scorer
 * =========================
 * Every page gets scored across 7 dimensions.
 * The AI always knows what to improve next.
 *
 * Song Page
 * Trust ............96
 * Typography .......91
 * Performance ......88
 * Creator Honor.....100
 * Support ..........95
 * Accessibility.....92
 * Overall ..........94
 */

import * as fs from "fs";
import * as path from "path";
import type { PageScore } from "./types.js";

// ─── Scoring Signals ───────────────────────────────────────────────────────

interface ScoringDimension {
  key: keyof PageScore["scores"];
  label: string;
  passSignals: string[];
  failSignals: string[];
  baseScore: number;
  passBonus: number;
  failPenalty: number;
}

const SCORING_DIMENSIONS: ScoringDimension[] = [
  {
    key: "trust",
    label: "Trust",
    passSignals: [
      "WID",
      "witnessId",
      "Shield",
      "verified",
      "certificate",
      "provenanceChain",
      "registeredAt",
      "timestamp",
    ],
    failSignals: ["TODO", "FIXME", "mock", "placeholder", "INTERNAL_SERVER_ERROR"],
    baseScore: 70,
    passBonus: 5,
    failPenalty: 15,
  },
  {
    key: "typography",
    label: "Typography",
    passSignals: [
      "font-heading",
      "font-editorial",
      "font-body",
      "ln-page-title",
      "ln-section-header",
      "ln-body-copy",
      "Cinzel",
      "Cormorant",
    ],
    failSignals: [
      "text-[12px]",
      "text-[13px]",
      "text-[14px]",
      "text-[16px]",
      "text-[18px]",
      "text-[20px]",
      "text-[24px]",
      "font-sans",
    ],
    baseScore: 60,
    passBonus: 8,
    failPenalty: 3,
  },
  {
    key: "performance",
    label: "Performance",
    passSignals: [
      "React.lazy",
      "lazy(",
      "Suspense",
      "useMemo",
      "useCallback",
      "staleTime",
      "startTransition",
    ],
    failSignals: [
      "new Date()",
      "Math.random()",
      "useEffect.*\\[\\].*fetch",
    ],
    baseScore: 75,
    passBonus: 5,
    failPenalty: 10,
  },
  {
    key: "creatorHonor",
    label: "Creator Honor",
    passSignals: [
      "artistName",
      "creatorName",
      "artistHandle",
      "profilePhotoUrl",
      "bio",
      "originStory",
      "haaiOriginStory",
      "artistStatement",
      "CreatorPanel",
    ],
    failSignals: ["Anonymous", "unknown creator", "Unknown Creator"],
    baseScore: 65,
    passBonus: 7,
    failPenalty: 20,
  },
  {
    key: "support",
    label: "Support",
    passSignals: [
      "SupportCreatorDrawer",
      "supportTarget",
      "Support Creator",
      "TipModal",
      "tipOpen",
      "createTipCheckout",
      "patronage",
      "witnessSubscription",
    ],
    failSignals: [],
    baseScore: 60,
    passBonus: 10,
    failPenalty: 0,
  },
  {
    key: "accessibility",
    label: "Accessibility",
    passSignals: [
      "aria-label",
      "aria-describedby",
      "role=",
      "alt=",
      "focus-visible",
      "sr-only",
      "useReducedMotion",
      "prefers-reduced-motion",
    ],
    failSignals: [
      "onClick.*div",
      "cursor-pointer.*div",
    ],
    baseScore: 65,
    passBonus: 5,
    failPenalty: 8,
  },
  {
    key: "provenance",
    label: "Provenance",
    passSignals: [
      "provenanceChain",
      "witnessId",
      "WID-",
      "registeredAt",
      "verifyWid",
      "lineage",
      "custody",
    ],
    failSignals: [],
    baseScore: 60,
    passBonus: 8,
    failPenalty: 0,
  },
];

function gradeFromScore(score: number): PageScore["grade"] {
  if (score >= 95) return "S";
  if (score >= 85) return "A";
  if (score >= 75) return "B";
  if (score >= 65) return "C";
  if (score >= 50) return "D";
  return "F";
}

// ─── PageScorer ────────────────────────────────────────────────────────────

export class PageScorer {
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  async scorePage(
    filePath: string,
    route: string
  ): Promise<PageScore> {
    const absolutePath = path.resolve(this.projectRoot, filePath);
    let content = "";

    try {
      content = fs.readFileSync(absolutePath, "utf-8");
    } catch {
      // File not found — return minimum scores
      const scores = Object.fromEntries(
        SCORING_DIMENSIONS.map((d) => [d.key, 0])
      ) as PageScore["scores"];
      return {
        page: filePath,
        route,
        scores,
        overall: 0,
        grade: "F",
        topIssue: "File not found",
        timestamp: new Date().toISOString(),
      };
    }

    const scores: PageScore["scores"] = {
      trust: 0,
      typography: 0,
      performance: 0,
      creatorHonor: 0,
      support: 0,
      accessibility: 0,
      provenance: 0,
    };

    let topIssue: string | undefined;
    let lowestScore = 101;

    for (const dim of SCORING_DIMENSIONS) {
      const passCount = dim.passSignals.filter((sig) =>
        content.includes(sig)
      ).length;
      const failCount = dim.failSignals.filter((sig) => {
        try {
          return new RegExp(sig).test(content);
        } catch {
          return content.includes(sig);
        }
      }).length;

      const score = Math.min(
        100,
        Math.max(
          0,
          dim.baseScore +
            Math.min(30, passCount * dim.passBonus) -
            failCount * dim.failPenalty
        )
      );

      scores[dim.key] = score;

      if (score < lowestScore) {
        lowestScore = score;
        topIssue = `${dim.label} needs improvement (${score}/100)`;
      }
    }

    const overall = Math.round(
      Object.values(scores).reduce((s, v) => s + v, 0) /
        Object.values(scores).length
    );

    return {
      page: filePath,
      route,
      scores,
      overall,
      grade: gradeFromScore(overall),
      topIssue: lowestScore < 75 ? topIssue : undefined,
      timestamp: new Date().toISOString(),
    };
  }

  async scoreAllPages(): Promise<PageScore[]> {
    const pages: Array<{ file: string; route: string }> = [
      { file: "client/src/pages/HomePage.tsx", route: "/" },
      { file: "client/src/pages/ExplorePage.tsx", route: "/explore" },
      { file: "client/src/pages/SongDetailPage.tsx", route: "/song/:id" },
      { file: "client/src/pages/VerifyPage.tsx", route: "/verify/:wid" },
      { file: "client/src/pages/CreatorProfilePage.tsx", route: "/creator/:id" },
      { file: "client/src/pages/ArchivePage.tsx", route: "/archive" },
      { file: "client/src/pages/DashboardPage.tsx", route: "/dashboard" },
      { file: "client/src/pages/UploadPage.tsx", route: "/upload" },
      { file: "client/src/components/WorkListRow.tsx", route: "(component)" },
      { file: "client/src/components/SupportCreatorDrawer.tsx", route: "(component)" },
    ];

    const results: PageScore[] = [];
    for (const p of pages) {
      results.push(await this.scorePage(p.file, p.route));
    }
    return results;
  }

  formatScoreCard(scores: PageScore[]): string {
    const lines: string[] = [
      "═══════════════════════════════════════════════════════════",
      "  LIVING NEXUS — PLATFORM SELF-SCORE REPORT",
      `  Generated: ${new Date().toISOString()}`,
      "═══════════════════════════════════════════════════════════",
      "",
    ];

    for (const page of scores) {
      const name = path.basename(page.page, ".tsx").padEnd(28);
      lines.push(`${name}  Grade: ${page.grade}  Overall: ${page.overall}/100`);
      lines.push(
        `  Trust: ${String(page.scores.trust).padStart(3)}  Typography: ${String(page.scores.typography).padStart(3)}  Performance: ${String(page.scores.performance).padStart(3)}`
      );
      lines.push(
        `  Creator Honor: ${String(page.scores.creatorHonor).padStart(3)}  Support: ${String(page.scores.support).padStart(3)}  Accessibility: ${String(page.scores.accessibility).padStart(3)}  Provenance: ${String(page.scores.provenance).padStart(3)}`
      );
      if (page.topIssue) {
        lines.push(`  ↳ Top Issue: ${page.topIssue}`);
      }
      lines.push("");
    }

    const avgOverall =
      scores.reduce((s, p) => s + p.overall, 0) / scores.length;
    const platformGrade = gradeFromScore(avgOverall);

    lines.push("─────────────────────────────────────────────────────────");
    lines.push(
      `  Platform Overall Score: ${Math.round(avgOverall)}/100  Grade: ${platformGrade}`
    );
    lines.push("═══════════════════════════════════════════════════════════");

    return lines.join("\n");
  }
}
