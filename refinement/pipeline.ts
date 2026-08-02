/**
 * Living Nexus Refinement Pipeline
 * ==================================
 * 14-step pipeline from Commit → Deploy.
 * Matches the MASTER_REFINEMENT_LOOP.md standing operational order.
 *
 * Every checkpoint runs through this pipeline.
 * If any blocking step fails, deployment is halted.
 */

import type { PipelineStep, PipelineRun } from "./types.js";

// ─── Pipeline Definition ──────────────────────────────────────────────────

export const PIPELINE_STEPS: Array<{
  id: number;
  name: string;
  description: string;
  blocksDeployment: boolean;
  requiredPasses?: string[];
}> = [
  {
    id: 1,
    name: "Read Lessons Log",
    description:
      "Read the lessons log before making any change. Institutional memory prevents repeating past mistakes.",
    blocksDeployment: false,
  },
  {
    id: 2,
    name: "Doctrine Validation",
    description:
      "Evaluate all key pages against the 7 doctrine questions. Any component that fails all 7 must be redesigned before shipping.",
    blocksDeployment: true,
    requiredPasses: ["doctrine"],
  },
  {
    id: 3,
    name: "Design Drift Scan",
    description:
      "Scan for typography, color, language, and animation drift from the cathedral design system.",
    blocksDeployment: false,
    requiredPasses: ["drift"],
  },
  {
    id: 4,
    name: "Typography Pass",
    description:
      "Ensure Cinzel (headings), Cormorant Garamond (editorial), EB Garamond (body), Oswald (labels), JetBrains Mono (code). No generic sans-serif.",
    blocksDeployment: false,
    requiredPasses: ["typography"],
  },
  {
    id: 5,
    name: "Creator Experience Pass",
    description:
      "Verify every creator-facing page: avatar visible, bio above fold, origin story present, Support Creator button accessible.",
    blocksDeployment: true,
    requiredPasses: ["creator_experience"],
  },
  {
    id: 6,
    name: "API Consistency Pass",
    description:
      "Verify all tRPC procedures return consistent error messages. No raw TRPC error codes exposed to users.",
    blocksDeployment: false,
    requiredPasses: ["api"],
  },
  {
    id: 7,
    name: "Performance Pass",
    description:
      "Verify React.lazy + startTransition for heavy components. Check for unstable query inputs. Verify staleTime on high-traffic queries.",
    blocksDeployment: false,
    requiredPasses: ["performance"],
  },
  {
    id: 8,
    name: "Explore Pass",
    description:
      "Verify the Explore page: 11 sections present, CathedralDividers in place, randomize switch works, Support Creator accessible from list view.",
    blocksDeployment: false,
    requiredPasses: ["explore"],
  },
  {
    id: 9,
    name: "Accessibility Pass",
    description:
      "Verify prefers-reduced-motion, focus-visible rings, aria-labels on all interactive elements, mobile action button visibility.",
    blocksDeployment: false,
    requiredPasses: ["accessibility"],
  },
  {
    id: 10,
    name: "Animation Pass",
    description:
      "Verify all animations respect prefers-reduced-motion. No playful animations (bounce, ping). Cathedral transitions only.",
    blocksDeployment: false,
    requiredPasses: ["animation"],
  },
  {
    id: 11,
    name: "Regression Tests",
    description:
      "Run the full Vitest suite. All 398+ tests must pass. No new test failures allowed.",
    blocksDeployment: true,
  },
  {
    id: 12,
    name: "Documentation Update",
    description:
      "Update ARCHITECTURE.md, MASTER_REFINEMENT_LOOP.md, and REFINEMENT_PROMPT.md with any new patterns or decisions.",
    blocksDeployment: false,
  },
  {
    id: 13,
    name: "Lessons Learned",
    description:
      "Write a new lesson for every non-trivial fix. The lesson must include: problem, solution, files, score delta, tags.",
    blocksDeployment: false,
  },
  {
    id: 14,
    name: "Checkpoint & Deploy",
    description:
      "Save checkpoint with descriptive message. Auto-publish to production. Update debt ledger with resolved items.",
    blocksDeployment: false,
  },
];

// ─── Pipeline Runner ──────────────────────────────────────────────────────

export function createPipelineRun(checkpointVersion?: string): PipelineRun {
  return {
    id: `run-${Date.now()}`,
    startedAt: new Date().toISOString(),
    steps: PIPELINE_STEPS.map((step) => ({
      step: step.name as PipelineStep,
      status: "pending",
    })),
    overallScore: 0,
    passed: false,
    checkpointVersion,
  };
}

/**
 * Print the pipeline as a visual checklist.
 */
export function formatPipelineChecklist(run?: PipelineRun): string {
  const lines: string[] = [
    "═══════════════════════════════════════════════════════════",
    "  LIVING NEXUS — REFINEMENT PIPELINE (14 Steps)",
    "═══════════════════════════════════════════════════════════",
    "",
  ];

  for (const step of PIPELINE_STEPS) {
    const runStep = run?.steps[step.id - 1];
    let statusIcon = "○"; // pending
    if (runStep) {
      statusIcon =
        runStep.status === "passed"
          ? "✓"
          : runStep.status === "failed"
            ? "✗"
            : runStep.status === "skipped"
              ? "—"
              : "○";
    }

    const blockMark = step.blocksDeployment ? " [BLOCKS DEPLOY]" : "";
    lines.push(
      `  ${statusIcon}  Step ${String(step.id).padStart(2, "0")}: ${step.name}${blockMark}`
    );
    lines.push(`           ${step.description.substring(0, 80)}`);
    lines.push("");
  }

  lines.push("═══════════════════════════════════════════════════════════");
  return lines.join("\n");
}
