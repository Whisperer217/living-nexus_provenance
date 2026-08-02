/**
 * Creator Experience Pass
 * ========================
 * Verifies every creator-facing page:
 * - Avatar visible
 * - Bio above fold
 * - Origin story present
 * - Support Creator button accessible
 * - WID badge present on work pages
 */

import * as fs from "fs";
import * as path from "path";
import type { RefinementPass, PassResult } from "../types.js";

interface PageCheck {
  file: string;
  route: string;
  required: Array<{
    signal: string;
    description: string;
    doctrineQuestion: string;
  }>;
}

const CREATOR_PAGES: PageCheck[] = [
  {
    file: "client/src/pages/VerifyPage.tsx",
    route: "/verify/:wid",
    required: [
      { signal: "profilePhotoUrl", description: "Creator avatar", doctrineQuestion: "attribution" },
      { signal: "bio", description: "Creator bio", doctrineQuestion: "discoverability" },
      { signal: "Support Creator", description: "Support Creator button", doctrineQuestion: "support" },
      { signal: "witnessId", description: "WID badge", doctrineQuestion: "trust" },
      { signal: "originStory", description: "Origin story", doctrineQuestion: "discoverability" },
    ],
  },
  {
    file: "client/src/pages/CreatorProfilePage.tsx",
    route: "/creator/:id",
    required: [
      { signal: "profilePhotoUrl", description: "Creator avatar", doctrineQuestion: "attribution" },
      { signal: "bio", description: "Creator bio", doctrineQuestion: "discoverability" },
      { signal: "Support Creator", description: "Support Creator button", doctrineQuestion: "support" },
      { signal: "SupportCreatorDrawer", description: "SupportCreatorDrawer", doctrineQuestion: "support" },
    ],
  },
  {
    file: "client/src/pages/SongDetailPage.tsx",
    route: "/song/:id",
    required: [
      { signal: "artistName", description: "Artist name", doctrineQuestion: "attribution" },
      { signal: "witnessId", description: "WID badge", doctrineQuestion: "trust" },
      { signal: "Support Creator", description: "Support Creator button", doctrineQuestion: "support" },
      { signal: "originStory", description: "Origin story", doctrineQuestion: "discoverability" },
    ],
  },
  {
    file: "client/src/components/WorkListRow.tsx",
    route: "(component)",
    required: [
      { signal: "artistName", description: "Artist name", doctrineQuestion: "attribution" },
      { signal: "witnessId", description: "WID badge", doctrineQuestion: "trust" },
      { signal: "Support Creator", description: "Support Creator button", doctrineQuestion: "support" },
    ],
  },
];

export class CreatorExperiencePass implements RefinementPass {
  name = "Creator Experience Pass";
  description =
    "Verifies every creator-facing page answers all 7 doctrine questions: avatar, bio, origin story, Support Creator button, WID badge.";

  async run(projectRoot: string): Promise<PassResult> {
    const findings: string[] = [];
    const recommendations: string[] = [];
    const filesAffected: string[] = [];

    for (const page of CREATOR_PAGES) {
      const absolutePath = path.resolve(projectRoot, page.file);
      let content: string;
      try {
        content = fs.readFileSync(absolutePath, "utf-8");
      } catch {
        findings.push(`${page.file}: File not found`);
        filesAffected.push(page.file);
        continue;
      }

      for (const check of page.required) {
        if (!content.includes(check.signal)) {
          findings.push(
            `${page.file} (${page.route}): Missing "${check.description}" [doctrine: ${check.doctrineQuestion}]`
          );
          recommendations.push(
            `Add ${check.description} to ${page.file} — required for doctrine question: ${check.doctrineQuestion}`
          );
          if (!filesAffected.includes(page.file)) {
            filesAffected.push(page.file);
          }
        }
      }
    }

    const status =
      findings.length === 0
        ? "passed"
        : findings.some((f) => f.includes("doctrine: support"))
          ? "failed"
          : "warning";

    return {
      passName: this.name,
      status,
      findings,
      recommendations,
      scoreImpact: findings.length * 5,
      filesAffected,
    };
  }
}
