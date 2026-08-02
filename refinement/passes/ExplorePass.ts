/**
 * Explore Pass
 * =============
 * Verifies the Explore page is a cathedral discovery experience:
 * - 11 sections present
 * - CathedralDividers in place
 * - Randomize switch works
 * - Support Creator accessible from list view
 * - No feed/social language
 */

import * as fs from "fs";
import * as path from "path";
import type { RefinementPass, PassResult } from "../types.js";

const REQUIRED_SECTIONS = [
  "Featured Collections",
  "New Manifestations",
  "Music",
  "Books",
  "Research",
  "Visual Works",
  "Film",
  "Doctrine",
  "Recently Witnessed",
  "Hidden Gems",
  "Community Collections",
];

const REQUIRED_COMPONENTS = [
  "CathedralDivider",
  "WorkListRow",
  "SupportCreatorDrawer",
  "randomize",
];

const FORBIDDEN_PATTERNS = [
  "Activity Feed",
  "infinite scroll",
  "trending",
  "viral",
  "algorithm",
  "♡ Like",
];

export class ExplorePass implements RefinementPass {
  name = "Explore Pass";
  description =
    "Verifies the Explore page is a cathedral discovery experience with 11 sections, CathedralDividers, and no feed/social language.";

  async run(projectRoot: string): Promise<PassResult> {
    const explorePath = path.join(
      projectRoot,
      "client/src/pages/ExplorePage.tsx"
    );

    const findings: string[] = [];
    const recommendations: string[] = [];
    const filesAffected: string[] = [];

    let content: string;
    try {
      content = fs.readFileSync(explorePath, "utf-8");
    } catch {
      return {
        passName: this.name,
        status: "failed",
        findings: ["ExplorePage.tsx not found"],
        recommendations: ["Create ExplorePage.tsx with cathedral architecture"],
        scoreImpact: 30,
        filesAffected: ["client/src/pages/ExplorePage.tsx"],
      };
    }

    // Check for required sections
    const missingSections = REQUIRED_SECTIONS.filter(
      (section) => !content.includes(section)
    );
    if (missingSections.length > 0) {
      findings.push(
        `ExplorePage.tsx: Missing ${missingSections.length} section(s): ${missingSections.join(", ")}`
      );
      recommendations.push(
        `Add missing sections to ExplorePage: ${missingSections.join(", ")}`
      );
      filesAffected.push("client/src/pages/ExplorePage.tsx");
    }

    // Check for required components
    const missingComponents = REQUIRED_COMPONENTS.filter(
      (comp) => !content.includes(comp)
    );
    if (missingComponents.length > 0) {
      findings.push(
        `ExplorePage.tsx: Missing required component(s): ${missingComponents.join(", ")}`
      );
      recommendations.push(
        `Add ${missingComponents.join(", ")} to ExplorePage`
      );
      if (!filesAffected.includes("client/src/pages/ExplorePage.tsx")) {
        filesAffected.push("client/src/pages/ExplorePage.tsx");
      }
    }

    // Check for forbidden patterns
    const foundForbidden = FORBIDDEN_PATTERNS.filter((pattern) =>
      content.includes(pattern)
    );
    if (foundForbidden.length > 0) {
      findings.push(
        `ExplorePage.tsx: Feed/social language detected: ${foundForbidden.join(", ")}`
      );
      recommendations.push(
        `Replace feed/social language: ${foundForbidden.join(", ")} — see LESSON-006`
      );
    }

    const status =
      findings.length === 0
        ? "passed"
        : missingSections.length > 5
          ? "failed"
          : "warning";

    return {
      passName: this.name,
      status,
      findings,
      recommendations,
      scoreImpact: findings.length * 4,
      filesAffected,
    };
  }
}
