/**
 * Living Nexus Lessons Log
 * =========================
 * Every refinement pass that fixes something writes a lesson.
 * Future agents read this FIRST before making any change.
 * The lessons log is the platform's institutional memory.
 *
 * Format: dated entries, problem → solution → files → score delta
 */

import * as fs from "fs";
import * as path from "path";
import type { Lesson, LessonsLog as LessonsLogType } from "./types.js";

const LOG_PATH = path.join(
  import.meta.dirname ?? __dirname,
  "lessons/lessons-log.json"
);

// ─── Seed Lessons ─────────────────────────────────────────────────────────
// Encoded from the actual refinement history of this platform.

const SEED_LESSONS: Lesson[] = [
  {
    id: "LESSON-001",
    date: "2026-08-01",
    checkpointVersion: "cc6ed77f",
    category: "performance",
    problem:
      "Clicking 'Edit Work' on SongDetailPage caused a 1–3 second UI freeze. The CreativeDrawer (1408 lines, multiple tRPC queries) was statically imported and mounted synchronously on the already-heavy SongDetailPage.",
    solution:
      "Replaced static import with React.lazy() to code-split the CreativeDrawer into its own 78KB chunk. Wrapped setEditingSong() in startTransition() so React yields to the browser during mount. Added Suspense boundary with a gold spinner fallback.",
    files: [
      "client/src/contexts/WorkEditorContext.tsx",
    ],
    score: 35,
    tags: ["react.lazy", "startTransition", "code-splitting", "freeze", "CreativeDrawer"],
  },
  {
    id: "LESSON-002",
    date: "2026-08-01",
    checkpointVersion: "21a243be",
    category: "accessibility",
    problem:
      "No prefers-reduced-motion support. All canvas animations, constellation effects, and CSS transitions fired for users who had explicitly requested stillness. Accessibility violation.",
    solution:
      "Added global @media (prefers-reduced-motion: reduce) rule to index.css collapsing all transitions to 0.01ms. Created useReducedMotion() hook for JS-based animations. Wired hook into constellation switch canvas and harmonic-resonance animation.",
    files: [
      "client/src/index.css",
      "client/src/hooks/useReducedMotion.ts",
      "client/src/pages/ExplorePage.tsx",
      "client/src/pages/SongDetailPage.tsx",
    ],
    score: 20,
    tags: ["prefers-reduced-motion", "accessibility", "canvas", "animation"],
  },
  {
    id: "LESSON-003",
    date: "2026-08-01",
    checkpointVersion: "21a243be",
    category: "accessibility",
    problem:
      "Custom buttons in PlayerBar, WorkListRow, and SupportCreatorDrawer had no keyboard focus ring. Keyboard navigation was broken for the entire player. Mouse/touch users never noticed but keyboard users were completely blocked.",
    solution:
      "Added global focus-visible rule to index.css: gold (#C49A28) outline with 2px offset on all :focus-visible elements. Suppressed for mouse/touch via :focus:not(:focus-visible). Added aria-label to all WorkListRow action buttons.",
    files: [
      "client/src/index.css",
      "client/src/components/WorkListRow.tsx",
    ],
    score: 15,
    tags: ["focus-visible", "keyboard", "accessibility", "aria-label"],
  },
  {
    id: "LESSON-004",
    date: "2026-08-01",
    checkpointVersion: "91a11fdb",
    category: "doctrine",
    problem:
      "VerifyPage — the highest-intent screen (QR scan destination) — had zero creator information, zero support action, and zero link to the creator's profile. The page proved the work existed but said nothing about the person who made it. Violated doctrine questions: attribution, support, discoverability.",
    solution:
      "Added CreatorPanel component to VerifyPage: avatar with gold border, creator name, handle, bio/origin statement, work origin story in gold pull quote, Support Creator button (opens SupportCreatorDrawer), View Profile link. Extended getSongByWitnessId to return bio, originStatement, stripeAccountStatus.",
    files: [
      "client/src/pages/VerifyPage.tsx",
      "server/db/songs.ts",
      "server/routers/songs.ts",
    ],
    score: 45,
    tags: ["doctrine", "VerifyPage", "creator-panel", "attribution", "support", "QR"],
  },
  {
    id: "LESSON-005",
    date: "2026-08-01",
    checkpointVersion: "91a11fdb",
    category: "creator_experience",
    problem:
      "CreatorProfilePage had a 'Send a Gift' button that only opened a tip amount input. No way to access monthly patronage, licensing, or follow from the profile header. Supporting a creator required navigating to individual works.",
    solution:
      "Replaced 'Send a Gift' with 'Support Creator' button on both desktop and mobile profile headers. Button opens SupportCreatorDrawer with all 6 options: one-time support, monthly patronage, purchase, license, follow, view provenance.",
    files: [
      "client/src/pages/CreatorProfilePage.tsx",
    ],
    score: 20,
    tags: ["support", "CreatorProfilePage", "SupportCreatorDrawer", "patronage"],
  },
  {
    id: "LESSON-006",
    date: "2026-08-01",
    checkpointVersion: "44c53c92",
    category: "design_language",
    problem:
      "Feed/social language detected in multiple places: 'Activity Feed' in DashboardPage, 'Unsubscribed from creator feed' in CreatorProfilePage. These phrases position Living Nexus as a social media platform rather than a registry and archive.",
    solution:
      "Replaced all feed/social language with cathedral doctrine language: 'Activity Feed' → 'Witness Activity', 'creator feed' → 'witness subscription'. Added DesignDriftScanner to detect future language drift automatically.",
    files: [
      "client/src/pages/DashboardPage.tsx",
      "client/src/pages/CreatorProfilePage.tsx",
      "refinement/drift.ts",
    ],
    score: 10,
    tags: ["design-language", "doctrine", "feed", "social", "cathedral"],
  },
  {
    id: "LESSON-007",
    date: "2026-08-01",
    checkpointVersion: "44c53c92",
    category: "typography",
    problem:
      "CathedralDivider section headers used font-serif (generic) and text-2xl (Tailwind default) instead of the cathedral type system. The most prominent visual element on the Explore page was not using Cinzel or Cormorant Garamond.",
    solution:
      "Updated CathedralDivider to use font-heading (Cinzel) for section title and font-editorial (Cormorant Garamond) for subtitle. Added global semantic type classes to index.css: .ln-page-title, .ln-section-header, .ln-body-copy, .ln-caption, .ln-overline, .ln-mono.",
    files: [
      "client/src/pages/ExplorePage.tsx",
      "client/src/index.css",
    ],
    score: 15,
    tags: ["typography", "Cinzel", "Cormorant", "CathedralDivider", "design-tokens"],
  },
  {
    id: "LESSON-008",
    date: "2026-08-01",
    checkpointVersion: "0c664466",
    category: "creator_experience",
    problem:
      "WorkListRow action buttons (Save, Add to Collection, Support) used opacity-0 group-hover:opacity-100 — completely invisible to keyboard users and screen readers. Touch users on mobile never saw them because hover doesn't exist on touch.",
    solution:
      "Changed to sm:opacity-0 sm:group-hover:opacity-100 — always visible on mobile (no hover), hover-reveal only on desktop (sm: breakpoint). Added aria-label to all three buttons.",
    files: [
      "client/src/components/WorkListRow.tsx",
    ],
    score: 12,
    tags: ["mobile", "accessibility", "hover", "touch", "WorkListRow"],
  },
  {
    id: "LESSON-009",
    date: "2026-08-01",
    checkpointVersion: "bc3d5f29",
    category: "performance",
    problem:
      "The Edit Work button on SongDetailPage caused a UI freeze because the CreativeDrawer was synchronously imported and mounted. The issue was not the context split (which was correct) but the synchronous mount of a 1408-line component on an already-heavy page.",
    solution:
      "Root cause: static import at the top of WorkEditorContext.tsx. Fix: React.lazy() + startTransition(). The drawer is now a separate 78KB chunk that loads asynchronously. The Suspense boundary shows a gold spinner during the first load, then the chunk is cached.",
    files: [
      "client/src/contexts/WorkEditorContext.tsx",
    ],
    score: 35,
    tags: ["performance", "react.lazy", "startTransition", "CreativeDrawer", "freeze"],
  },
];

// ─── LessonsLog class ──────────────────────────────────────────────────────

export class LessonsLog {
  private log: LessonsLogType;

  constructor() {
    this.log = this.load();
  }

  private load(): LessonsLogType {
    // Ensure lessons directory exists
    const dir = path.dirname(LOG_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (fs.existsSync(LOG_PATH)) {
      try {
        return JSON.parse(fs.readFileSync(LOG_PATH, "utf-8"));
      } catch {
        // Fall through to initialize
      }
    }

    const log: LessonsLogType = {
      version: "1.0.0",
      lastUpdated: new Date().toISOString(),
      totalLessons: SEED_LESSONS.length,
      lessons: SEED_LESSONS,
    };
    this.save(log);
    return log;
  }

  private save(log: LessonsLogType): void {
    log.lastUpdated = new Date().toISOString();
    log.totalLessons = log.lessons.length;
    fs.writeFileSync(LOG_PATH, JSON.stringify(log, null, 2));
  }

  /** Add a new lesson */
  add(lesson: Omit<Lesson, "id">): Lesson {
    const newLesson: Lesson = {
      ...lesson,
      id: `LESSON-${String(this.log.lessons.length + 1).padStart(3, "0")}`,
    };
    this.log.lessons.push(newLesson);
    this.save(this.log);
    return newLesson;
  }

  /** Get lessons by category */
  getByCategory(category: Lesson["category"]): Lesson[] {
    return this.log.lessons.filter((l) => l.category === category);
  }

  /** Get the most recent N lessons */
  getRecent(n = 5): Lesson[] {
    return [...this.log.lessons]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, n);
  }

  /** Format a human-readable lessons summary */
  formatSummary(n = 10): string {
    const recent = this.getRecent(n);
    const lines: string[] = [
      "═══════════════════════════════════════════════════════════",
      "  LIVING NEXUS — LESSONS LOG (read before making changes)",
      `  Total Lessons: ${this.log.totalLessons}  |  Last Updated: ${this.log.lastUpdated}`,
      "═══════════════════════════════════════════════════════════",
      "",
    ];

    for (const lesson of recent) {
      lines.push(
        `${lesson.id}  [${lesson.category.toUpperCase()}]  ${lesson.date}  +${lesson.score} score`
      );
      if (lesson.checkpointVersion) {
        lines.push(`  Checkpoint: ${lesson.checkpointVersion}`);
      }
      lines.push(`  Problem:  ${lesson.problem.substring(0, 120)}...`);
      lines.push(`  Solution: ${lesson.solution.substring(0, 120)}...`);
      lines.push(`  Files: ${lesson.files.join(", ")}`);
      lines.push(`  Tags: ${lesson.tags.join(", ")}`);
      lines.push("");
    }

    lines.push("═══════════════════════════════════════════════════════════");
    return lines.join("\n");
  }
}
