/**
 * Living Nexus Design Drift Scanner
 * ===================================
 * Scans the codebase for deviations from the cathedral design system.
 * If drift is detected → automatically schedules the appropriate refinement pass.
 *
 * Drift domains: typography, spacing, colors, cards, buttons,
 *                animations, loadingStates, icons, language
 */

import * as fs from "fs";
import * as path from "path";
import { glob } from "glob";
import type { DriftDomain, DriftFinding, DriftReport } from "./types.js";

// ─── Drift Rules ───────────────────────────────────────────────────────────

interface DriftRule {
  domain: DriftDomain;
  pattern: RegExp;
  description: string;
  expected: string;
  severity: "critical" | "high" | "medium" | "low";
  schedulesPass?: string;
}

const DRIFT_RULES: DriftRule[] = [
  // Typography drift
  {
    domain: "typography",
    pattern: /text-\[\d+px\]/g,
    description: "Hardcoded pixel font size instead of design token",
    expected: "Use ln-* semantic classes or Tailwind scale (text-sm, text-lg, etc.)",
    severity: "medium",
    schedulesPass: "typography",
  },
  {
    domain: "typography",
    pattern: /font-family:\s*['"](?!Cinzel|Cormorant|EB Garamond|Oswald|JetBrains)/g,
    description: "Non-cathedral font family used",
    expected: "Use Cinzel (headings), Cormorant Garamond (editorial), EB Garamond (body), Oswald (labels), JetBrains Mono (code)",
    severity: "high",
    schedulesPass: "typography",
  },
  {
    domain: "typography",
    pattern: /font-sans(?!\s*\/\*\s*intentional)/g,
    description: "Generic sans-serif font used instead of cathedral typography",
    expected: "Use font-heading (Cinzel), font-editorial (Cormorant), or font-body (EB Garamond)",
    severity: "low",
    schedulesPass: "typography",
  },

  // Color drift
  {
    domain: "colors",
    pattern: /#(?!C49A28|C3AB7D|D4AF37|F5E6C8|E8D5A3|1A1A0F|111009|353E43|2A2A1A|8B7355|6B5B3E)[0-9A-Fa-f]{6}(?![0-9A-Fa-f])/g,
    description: "Non-cathedral hex color used",
    expected: "Use var(--ln-gold), var(--ln-parchment), var(--ln-coal), var(--ln-smoke) etc.",
    severity: "medium",
    schedulesPass: "design_language",
  },
  {
    domain: "colors",
    pattern: /bg-blue-|bg-red-|bg-green-|bg-purple-|bg-pink-/g,
    description: "Generic Tailwind color class used instead of cathedral palette",
    expected: "Use cathedral color tokens via CSS variables",
    severity: "medium",
    schedulesPass: "design_language",
  },

  // Language drift (feed/clone patterns)
  {
    domain: "language",
    pattern: /Activity Feed|activity feed/g,
    description: "Social feed language detected",
    expected: "Use 'Witness Activity' or 'Registry Activity'",
    severity: "high",
    schedulesPass: "design_language",
  },
  {
    domain: "language",
    pattern: /Like|♡ Like|click to like/gi,
    description: "Social 'like' language detected",
    expected: "Use 'Support', 'Witness', or 'Honor'",
    severity: "high",
    schedulesPass: "design_language",
  },
  {
    domain: "language",
    pattern: /infinite scroll|Infinite Scroll/g,
    description: "Infinite scroll pattern detected — feed anti-pattern",
    expected: "Use paginated sections with cathedral dividers",
    severity: "critical",
    schedulesPass: "design_language",
  },
  {
    domain: "language",
    pattern: /followers|following count|follower count/gi,
    description: "Social follower count language detected",
    expected: "Use 'Witnesses' or 'Stewards'",
    severity: "medium",
    schedulesPass: "design_language",
  },
  {
    domain: "language",
    pattern: /trending|viral|algorithm/gi,
    description: "Algorithmic/feed language detected",
    expected: "Use 'Recently Witnessed', 'Newly Registered', or 'Discovered'",
    severity: "medium",
    schedulesPass: "design_language",
  },

  // Loading state drift
  {
    domain: "loadingStates",
    pattern: /isLoading\s*&&\s*<div[^>]*>\s*<\/div>/g,
    description: "Empty div used as loading state — no skeleton",
    expected: "Use a content-shaped skeleton that matches the page layout",
    severity: "medium",
    schedulesPass: "accessibility",
  },
  {
    domain: "loadingStates",
    pattern: /Loading\.\.\.|loading\.\.\./g,
    description: "Raw 'Loading...' text used instead of skeleton",
    expected: "Use animated skeleton components",
    severity: "low",
    schedulesPass: "accessibility",
  },

  // Button drift
  {
    domain: "buttons",
    pattern: /className="[^"]*bg-blue-[^"]*"/g,
    description: "Blue button used — not cathedral",
    expected: "Use gold (var(--ln-gold)) for primary actions",
    severity: "medium",
    schedulesPass: "design_language",
  },

  // Animation drift
  {
    domain: "animations",
    pattern: /animate-bounce|animate-ping/g,
    description: "Playful animation used — not cathedral",
    expected: "Use animate-pulse (subtle) or custom cathedral transitions",
    severity: "low",
    schedulesPass: "animation",
  },

  // Error message drift
  {
    domain: "language",
    pattern: /INTERNAL_SERVER_ERROR|UNAUTHORIZED|BAD_REQUEST|NOT_FOUND/g,
    description: "Raw tRPC error code exposed to user",
    expected: "Map tRPC error codes to human-readable messages",
    severity: "high",
    schedulesPass: "creator_experience",
  },
];

// ─── DesignDriftScanner ────────────────────────────────────────────────────

export class DesignDriftScanner {
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  async scan(): Promise<DriftReport> {
    const clientSrc = path.join(this.projectRoot, "client/src");
    const files = await glob("**/*.{tsx,ts,css}", {
      cwd: clientSrc,
      ignore: ["**/*.test.*", "**/node_modules/**", "**/_core/**"],
    });

    const byDomain: Record<DriftDomain, DriftFinding[]> = {
      typography: [],
      spacing: [],
      colors: [],
      cards: [],
      buttons: [],
      animations: [],
      loadingStates: [],
      icons: [],
      language: [],
    };

    const scheduledPassSet = new Set<string>();

    for (const file of files) {
      const absolutePath = path.join(clientSrc, file);
      let content: string;
      try {
        content = fs.readFileSync(absolutePath, "utf-8");
      } catch {
        continue;
      }

      const lines = content.split("\n");

      for (const rule of DRIFT_RULES) {
        // Reset regex lastIndex
        rule.pattern.lastIndex = 0;

        let match: RegExpExecArray | null;
        const pattern = new RegExp(rule.pattern.source, rule.pattern.flags);

        while ((match = pattern.exec(content)) !== null) {
          // Find line number
          const upToMatch = content.substring(0, match.index);
          const lineNum = upToMatch.split("\n").length;

          byDomain[rule.domain].push({
            domain: rule.domain,
            file: `client/src/${file}`,
            line: lineNum,
            expected: rule.expected,
            found: match[0].substring(0, 60),
            severity: rule.severity,
          });

          if (rule.schedulesPass) {
            scheduledPassSet.add(rule.schedulesPass);
          }
        }
      }
    }

    const totalFindings = Object.values(byDomain).reduce(
      (sum, arr) => sum + arr.length,
      0
    );

    // Drift score: 0 = pure cathedral, higher = more drift
    // Cap at 100
    const driftScore = Math.min(100, totalFindings * 2);

    return {
      timestamp: new Date().toISOString(),
      totalFindings,
      byDomain,
      driftScore,
      scheduledPasses: Array.from(scheduledPassSet),
    };
  }

  formatReport(report: DriftReport): string {
    const lines: string[] = [
      "═══════════════════════════════════════════════════════════",
      "  LIVING NEXUS — DESIGN DRIFT SCAN REPORT",
      `  Generated: ${report.timestamp}`,
      `  Drift Score: ${report.driftScore}/100 (0 = pure cathedral)`,
      "═══════════════════════════════════════════════════════════",
      "",
    ];

    for (const [domain, findings] of Object.entries(report.byDomain)) {
      if (findings.length === 0) continue;
      lines.push(`[${domain.toUpperCase()}] — ${findings.length} finding(s)`);
      for (const f of findings.slice(0, 5)) {
        // Show top 5 per domain
        lines.push(`  ${f.severity.toUpperCase()}  ${f.file}:${f.line ?? "?"}`);
        lines.push(`    Found:    ${f.found}`);
        lines.push(`    Expected: ${f.expected}`);
      }
      if (findings.length > 5) {
        lines.push(`  ... and ${findings.length - 5} more`);
      }
      lines.push("");
    }

    if (report.scheduledPasses.length > 0) {
      lines.push(
        `Scheduled refinement passes: ${report.scheduledPasses.join(", ")}`
      );
    }

    lines.push("═══════════════════════════════════════════════════════════");
    return lines.join("\n");
  }
}
