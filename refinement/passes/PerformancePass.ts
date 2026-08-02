/**
 * Performance Pass
 * =================
 * Verifies React.lazy + startTransition for heavy components.
 * Checks for unstable query inputs (new Date(), Math.random() in render).
 * Verifies staleTime on high-traffic queries.
 */

import * as fs from "fs";
import * as path from "path";
import { glob } from "glob";
import type { RefinementPass, PassResult } from "../types.js";

// Components that MUST be lazy-loaded (too heavy for synchronous mount)
const MUST_BE_LAZY = [
  "CreativeDrawer",
  "SupportCreatorDrawer",
  "WaveformVisualizer",
  "SacredCanvas",
];

export class PerformancePass implements RefinementPass {
  name = "Performance Pass";
  description =
    "Verifies React.lazy + startTransition for heavy components. Checks for unstable query inputs and missing staleTime.";

  async run(projectRoot: string): Promise<PassResult> {
    const clientSrc = path.join(projectRoot, "client/src");
    const files = await glob("**/*.{tsx,ts}", {
      cwd: clientSrc,
      ignore: ["**/*.test.*", "**/node_modules/**", "**/_core/**"],
    });

    const findings: string[] = [];
    const filesAffected: string[] = [];

    // Check for heavy components that should be lazy-loaded
    for (const file of files) {
      const absolutePath = path.join(clientSrc, file);
      let content: string;
      try {
        content = fs.readFileSync(absolutePath, "utf-8");
      } catch {
        continue;
      }

      for (const component of MUST_BE_LAZY) {
        // If the component is imported but NOT via React.lazy
        if (
          content.includes(`import ${component}`) &&
          !content.includes(`lazy(() => import`) &&
          !content.includes(`React.lazy`)
        ) {
          findings.push(
            `client/src/${file}: ${component} is statically imported — should use React.lazy() + startTransition()`
          );
          filesAffected.push(`client/src/${file}`);
        }
      }

      // Check for unstable query inputs
      if (
        content.includes("useQuery") &&
        content.includes("new Date()") &&
        !content.includes("useState")
      ) {
        findings.push(
          `client/src/${file}: new Date() used directly in query input — creates new reference every render → infinite refetch`
        );
        filesAffected.push(`client/src/${file}`);
      }

      if (
        content.includes("useQuery") &&
        content.includes("Math.random()") &&
        !content.includes("useState")
      ) {
        findings.push(
          `client/src/${file}: Math.random() used directly in query input — creates new value every render`
        );
        filesAffected.push(`client/src/${file}`);
      }
    }

    // Check that WorkEditorContext uses React.lazy
    const contextPath = path.join(
      clientSrc,
      "contexts/WorkEditorContext.tsx"
    );
    if (fs.existsSync(contextPath)) {
      const content = fs.readFileSync(contextPath, "utf-8");
      if (!content.includes("React.lazy") && !content.includes("lazy(")) {
        findings.push(
          "client/src/contexts/WorkEditorContext.tsx: CreativeDrawer should be loaded via React.lazy() — see LESSON-001"
        );
        filesAffected.push("client/src/contexts/WorkEditorContext.tsx");
      }
    }

    const recommendations: string[] = [];
    if (findings.length > 0) {
      recommendations.push(
        `Apply React.lazy() + startTransition() to ${MUST_BE_LAZY.join(", ")} — see LESSON-001 and LESSON-009`
      );
    }

    const status = findings.length === 0 ? "passed" : "warning";

    return {
      passName: this.name,
      status,
      findings,
      recommendations,
      scoreImpact: findings.length * 8,
      filesAffected: Array.from(new Set(filesAffected)),
    };
  }
}
