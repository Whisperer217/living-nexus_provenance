/**
 * Living Nexus Refinement Engine — Core Types
 * ============================================
 * Every refinement pass implements the RefinementPass contract.
 * Every checkpoint runs through the PlatformSteward pipeline.
 * No component ships until all doctrine passes.
 *
 * Prime Directive: Every design decision, database schema, API endpoint,
 * and user interaction must increase the permanence, discoverability,
 * attribution, and supportability of human creative contribution.
 */

// ─── Doctrine ──────────────────────────────────────────────────────────────

export type DoctrineQuestion =
  | "trust"
  | "attribution"
  | "provenance"
  | "discoverability"
  | "stewardship"
  | "permanence"
  | "support";

export interface DoctrineEvaluation {
  question: DoctrineQuestion;
  passes: boolean;
  score: number; // 0–100
  evidence: string;
  recommendation?: string;
}

export interface DoctrineResult {
  component: string;
  evaluations: DoctrineEvaluation[];
  overallScore: number;
  passes: boolean; // all 7 must pass
  violations: DoctrineQuestion[];
}

// ─── Audit ─────────────────────────────────────────────────────────────────

export interface AuditFinding {
  severity: "critical" | "high" | "medium" | "low";
  file: string;
  line?: number;
  description: string;
  doctrineViolation?: DoctrineQuestion;
  suggestedFix: string;
}

export interface AuditResult {
  passId: string;
  timestamp: string;
  findings: AuditFinding[];
  score: number; // 0–100, 100 = no findings
  summary: string;
}

// ─── Refinement Pass ───────────────────────────────────────────────────────

export interface RefinementPass {
  name: string;
  description: string;

  /** Run the pass against the project root and return a PassResult */
  run(projectRoot: string): Promise<PassResult>;
}

// ─── Page Scoring ──────────────────────────────────────────────────────────

export interface PageScore {
  page: string;
  route: string;
  scores: {
    trust: number;
    typography: number;
    performance: number;
    creatorHonor: number;
    support: number;
    accessibility: number;
    provenance: number;
  };
  overall: number;
  grade: "S" | "A" | "B" | "C" | "D" | "F";
  topIssue?: string;
  timestamp: string;
}

// ─── Design Drift ──────────────────────────────────────────────────────────

export type DriftDomain =
  | "typography"
  | "spacing"
  | "colors"
  | "cards"
  | "buttons"
  | "animations"
  | "loadingStates"
  | "icons"
  | "language";

export interface DriftFinding {
  domain: DriftDomain;
  file: string;
  line?: number;
  expected: string;
  found: string;
  severity: "critical" | "high" | "medium" | "low";
}

export interface DriftReport {
  timestamp: string;
  totalFindings: number;
  byDomain: Record<DriftDomain, DriftFinding[]>;
  driftScore: number; // 0 = pure cathedral, 100 = complete drift
  scheduledPasses: string[]; // pass IDs to run to fix drift
}

// ─── Architectural Debt ────────────────────────────────────────────────────

export interface ArchitecturalDebt {
  id: string;
  timestamp: string;
  file: string;
  description: string;
  severity: number; // 1–10
  doctrineViolation: boolean;
  doctrineQuestion?: DoctrineQuestion;
  layer: 1 | 2 | 3 | 4 | 5 | 6; // which platform layer is affected
  suggestedRefactor: string;
  estimatedBenefit: number; // 1–10
  status: "open" | "in_progress" | "resolved" | "accepted";
  resolvedIn?: string; // checkpoint version
}

export interface DebtLedger {
  version: string;
  lastUpdated: string;
  totalDebt: number; // sum of severity * (1 - estimatedBenefit/10)
  items: ArchitecturalDebt[];
  resolvedCount: number;
  openCount: number;
}

// ─── Lessons ───────────────────────────────────────────────────────────────

export interface Lesson {
  id: string;
  date: string; // YYYY-MM-DD
  checkpointVersion?: string;
  category:
    | "typography"
    | "performance"
    | "accessibility"
    | "doctrine"
    | "api"
    | "creator_experience"
    | "design_language"
    | "architecture"
    | "security";
  problem: string;
  solution: string;
  files: string[];
  score: number; // improvement delta (0–100)
  tags: string[];
}

export interface LessonsLog {
  version: string;
  lastUpdated: string;
  totalLessons: number;
  lessons: Lesson[];
}

// ─── Pipeline ──────────────────────────────────────────────────────────────

// ─── Pass Result ──────────────────────────────────────────────────────────

export interface PassResult {
  passName: string;
  status: "passed" | "failed" | "skipped" | "warning";
  findings: string[];
  recommendations: string[];
  scoreImpact: number; // estimated score delta if recommendations are applied
  filesAffected: string[];
}

// ─── Steward Report ────────────────────────────────────────────────────────

export interface StewardReport {
  timestamp: string;
  checkpointVersion?: string;
  doctrineResults: DoctrineResult[];
  driftReport: DriftReport;
  debtLedger: DebtLedger;
  pageScores: PageScore[];
  passResults: PassResult[];
  platformScore: number; // 0–100 composite
  platformGrade: "S" | "A" | "B" | "C" | "D" | "F";
  topPriorities: string[]; // top 5 actions to take next
  lessonsAdded: number;
}

export type PipelineStep =
  | "commit"
  | "audit"
  | "doctrine_validation"
  | "typography_pass"
  | "performance_pass"
  | "creator_pass"
  | "api_pass"
  | "accessibility_pass"
  | "animation_pass"
  | "regression_tests"
  | "documentation_update"
  | "lessons_learned"
  | "checkpoint"
  | "deploy";

export interface PipelineRun {
  id: string;
  startedAt: string;
  completedAt?: string;
  steps: Array<{
    step: PipelineStep;
    status: "pending" | "running" | "passed" | "failed" | "skipped";
    startedAt?: string;
    completedAt?: string;
    output?: string;
  }>;
  overallScore: number;
  passed: boolean;
  checkpointVersion?: string;
}
