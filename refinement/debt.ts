/**
 * Living Nexus Architectural Debt Ledger
 * ========================================
 * Every time the codebase is touched, this ledger is updated.
 * Debt is never deleted — only resolved or accepted.
 * The ledger is the permanent record of architectural decisions.
 *
 * Every entry includes:
 * - severity (1–10)
 * - doctrineViolation (boolean)
 * - suggestedRefactor (string)
 * - estimatedBenefit (1–10)
 * - platform layer affected (1–6)
 */

import * as fs from "fs";
import * as path from "path";
import type { ArchitecturalDebt, DebtLedger } from "./types.js";

const LEDGER_PATH = path.join(
  import.meta.dirname ?? __dirname,
  "debt-ledger.json"
);

// ─── Initial Known Debt ────────────────────────────────────────────────────
// Seeded from the Experience Audit and refinement passes already completed.

const INITIAL_DEBT: ArchitecturalDebt[] = [
  {
    id: "DEBT-001",
    timestamp: "2026-08-02T00:00:00.000Z",
    file: "client/src/pages/SongDetailPage.tsx",
    description:
      "41 hardcoded text-[Npx] font sizes instead of cathedral type tokens. Typography is inconsistent with the design system.",
    severity: 5,
    doctrineViolation: false,
    layer: 2,
    suggestedRefactor:
      "Replace hardcoded pixel sizes with ln-* semantic classes or Tailwind scale tokens. Use font-heading (Cinzel) for titles, font-editorial (Cormorant) for captions.",
    estimatedBenefit: 7,
    status: "open",
  },
  {
    id: "DEBT-002",
    timestamp: "2026-08-02T00:00:00.000Z",
    file: "client/src/pages/CreatorProfilePage.tsx",
    description:
      "92 hardcoded font sizes — the highest count of any page. Typography is entirely inline rather than token-driven.",
    severity: 6,
    doctrineViolation: false,
    layer: 1,
    suggestedRefactor:
      "Systematic replacement of all text-[Npx] with ln-* classes. This is a large file (2800+ lines) — approach in sections.",
    estimatedBenefit: 8,
    status: "open",
  },
  {
    id: "DEBT-003",
    timestamp: "2026-08-02T00:00:00.000Z",
    file: "client/src/pages/ExplorePage.tsx",
    description:
      "42 hardcoded font sizes in the highest-traffic discovery page.",
    severity: 4,
    doctrineViolation: false,
    layer: 2,
    suggestedRefactor:
      "CathedralDivider already upgraded to Cinzel/Cormorant. Remaining hardcoded sizes in grid cards and filter chips.",
    estimatedBenefit: 6,
    status: "open",
  },
  {
    id: "DEBT-004",
    timestamp: "2026-08-02T00:00:00.000Z",
    file: "client/src/pages/VerifyPage.tsx",
    description:
      "25 hardcoded font sizes on the highest-intent page (QR scan destination).",
    severity: 5,
    doctrineViolation: true,
    doctrineQuestion: "trust",
    layer: 4,
    suggestedRefactor:
      "VerifyPage is the trust anchor of the platform. Typography should be cathedral-grade. Replace all hardcoded sizes with ln-page-title, ln-section-header, ln-body-copy.",
    estimatedBenefit: 9,
    status: "open",
  },
  {
    id: "DEBT-005",
    timestamp: "2026-08-02T00:00:00.000Z",
    file: "server/routers/songs.ts",
    description:
      "exploreIndex procedure runs 11 parallel queries but has no result caching. Every page refresh hits the database 11 times.",
    severity: 6,
    doctrineViolation: false,
    layer: 4,
    suggestedRefactor:
      "Add a 5-minute stale cache on the exploreIndex result using tRPC's staleTime or a Redis/in-memory cache layer. The randomization seed can be refreshed on a timer rather than per-request.",
    estimatedBenefit: 8,
    status: "open",
  },
  {
    id: "DEBT-006",
    timestamp: "2026-08-02T00:00:00.000Z",
    file: "client/src/pages/DashboardPage.tsx",
    description:
      "DashboardPage is 1691 lines — a monolith. Tab content (songs, activity, collections, analytics, widcache) should be split into separate lazy-loaded components.",
    severity: 7,
    doctrineViolation: false,
    layer: 1,
    suggestedRefactor:
      "Extract each tab into DashboardSongsTab.tsx, DashboardActivityTab.tsx, DashboardCollectionsTab.tsx, DashboardAnalyticsTab.tsx. Lazy-load with React.lazy + Suspense.",
    estimatedBenefit: 8,
    status: "open",
  },
  {
    id: "DEBT-007",
    timestamp: "2026-08-02T00:00:00.000Z",
    file: "client/src/pages/CreatorProfilePage.tsx",
    description:
      "CreatorProfilePage is 2800+ lines — the largest file in the codebase. Extremely high risk of regression on any change.",
    severity: 8,
    doctrineViolation: false,
    layer: 1,
    suggestedRefactor:
      "Extract CreatorProfileHeader, CreatorProfileWorks, CreatorProfileCollections, CreatorProfileWitnesses into separate components. The profile page should be a composition of these components.",
    estimatedBenefit: 9,
    status: "open",
  },
  {
    id: "DEBT-008",
    timestamp: "2026-08-02T00:00:00.000Z",
    file: "client/src/pages/SongDetailPage.tsx",
    description:
      "SongDetailPage is 2058 lines. The waveform visualizer, SacredCanvas SVG, and player controls are all in one file.",
    severity: 7,
    doctrineViolation: false,
    layer: 2,
    suggestedRefactor:
      "Extract SongHero, SongProvenancePanel, SongTestimonySection, SongRelatedWorks into separate components. The waveform and canvas should be their own lazy-loaded components.",
    estimatedBenefit: 8,
    status: "open",
  },
  {
    id: "DEBT-009",
    timestamp: "2026-08-02T00:00:00.000Z",
    file: "server/routers/",
    description:
      "Error messages across tRPC procedures are inconsistent — some return raw tRPC error codes, others return human-readable messages. No centralized error vocabulary.",
    severity: 5,
    doctrineViolation: true,
    doctrineQuestion: "trust",
    layer: 4,
    suggestedRefactor:
      "Create shared/errors.ts with a catalog of user-facing error messages. All procedures should throw TRPCError with messages from this catalog.",
    estimatedBenefit: 7,
    status: "open",
  },
  {
    id: "DEBT-010",
    timestamp: "2026-08-02T00:00:00.000Z",
    file: "client/src/pages/HomePage.tsx",
    description:
      "HomePage has no Featured Artifact spotlight — no single creator/work/WID/Support combination that demonstrates the platform's value proposition in one screen.",
    severity: 6,
    doctrineViolation: true,
    doctrineQuestion: "support",
    layer: 2,
    suggestedRefactor:
      "Add a Featured Artifact section to the HomePage: one creator, one work, one WID badge, one Support Creator button. Rotate daily or weekly. This is the most important trust-building element on the public face of the platform.",
    estimatedBenefit: 9,
    status: "open",
  },
];

// ─── DebtLedger class ──────────────────────────────────────────────────────

export class ArchitecturalDebtLedger {
  private ledger: DebtLedger;

  constructor() {
    this.ledger = this.load();
  }

  private load(): DebtLedger {
    if (fs.existsSync(LEDGER_PATH)) {
      try {
        return JSON.parse(fs.readFileSync(LEDGER_PATH, "utf-8"));
      } catch {
        // Fall through to initialize
      }
    }

    // Initialize with known debt
    const ledger: DebtLedger = {
      version: "1.0.0",
      lastUpdated: new Date().toISOString(),
      totalDebt: 0,
      items: INITIAL_DEBT,
      resolvedCount: 0,
      openCount: INITIAL_DEBT.length,
    };
    ledger.totalDebt = this.calculateTotalDebt(ledger.items);
    return ledger;
  }

  private save(): void {
    this.ledger.lastUpdated = new Date().toISOString();
    this.ledger.totalDebt = this.calculateTotalDebt(this.ledger.items);
    this.ledger.openCount = this.ledger.items.filter(
      (i) => i.status === "open" || i.status === "in_progress"
    ).length;
    this.ledger.resolvedCount = this.ledger.items.filter(
      (i) => i.status === "resolved"
    ).length;
    fs.writeFileSync(LEDGER_PATH, JSON.stringify(this.ledger, null, 2));
  }

  private calculateTotalDebt(items: ArchitecturalDebt[]): number {
    return items
      .filter((i) => i.status === "open" || i.status === "in_progress")
      .reduce((sum, item) => {
        // Debt = severity * (1 - benefit/10) * doctrine multiplier
        const doctrineMult = item.doctrineViolation ? 1.5 : 1.0;
        return sum + item.severity * (1 - item.estimatedBenefit / 10) * doctrineMult;
      }, 0);
  }

  /** Add a new debt item */
  add(item: Omit<ArchitecturalDebt, "id" | "timestamp" | "status">): ArchitecturalDebt {
    const newItem: ArchitecturalDebt = {
      ...item,
      id: `DEBT-${String(this.ledger.items.length + 1).padStart(3, "0")}`,
      timestamp: new Date().toISOString(),
      status: "open",
    };
    this.ledger.items.push(newItem);
    this.save();
    return newItem;
  }

  /** Mark a debt item as resolved */
  resolve(id: string, checkpointVersion: string): void {
    const item = this.ledger.items.find((i) => i.id === id);
    if (item) {
      item.status = "resolved";
      item.resolvedIn = checkpointVersion;
      this.save();
    }
  }

  /** Get all open items sorted by priority (severity * doctrine multiplier) */
  getOpenByPriority(): ArchitecturalDebt[] {
    return this.ledger.items
      .filter((i) => i.status === "open")
      .sort((a, b) => {
        const scoreA =
          a.severity * (a.doctrineViolation ? 1.5 : 1.0) * a.estimatedBenefit;
        const scoreB =
          b.severity * (b.doctrineViolation ? 1.5 : 1.0) * b.estimatedBenefit;
        return scoreB - scoreA;
      });
  }

  /** Get the current ledger state */
  getLedger(): DebtLedger {
    return this.ledger;
  }

  /** Format a human-readable debt report */
  formatReport(): string {
    const open = this.getOpenByPriority();
    const lines: string[] = [
      "═══════════════════════════════════════════════════════════",
      "  LIVING NEXUS — ARCHITECTURAL DEBT LEDGER",
      `  Generated: ${new Date().toISOString()}`,
      `  Total Debt Score: ${this.ledger.totalDebt.toFixed(1)}`,
      `  Open: ${this.ledger.openCount}  |  Resolved: ${this.ledger.resolvedCount}`,
      "═══════════════════════════════════════════════════════════",
      "",
      "OPEN ITEMS (by priority):",
      "",
    ];

    for (const item of open) {
      const doctrineMark = item.doctrineViolation
        ? ` ⚠ DOCTRINE VIOLATION [${item.doctrineQuestion}]`
        : "";
      lines.push(
        `${item.id}  Severity: ${item.severity}/10  Benefit: ${item.estimatedBenefit}/10  Layer: ${item.layer}${doctrineMark}`
      );
      lines.push(`  File: ${item.file}`);
      lines.push(`  Issue: ${item.description}`);
      lines.push(`  Fix:   ${item.suggestedRefactor}`);
      lines.push("");
    }

    lines.push("═══════════════════════════════════════════════════════════");
    return lines.join("\n");
  }
}
