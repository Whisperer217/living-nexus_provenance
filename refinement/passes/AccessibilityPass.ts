/**
 * Accessibility Pass
 * ===================
 * Verifies:
 * - prefers-reduced-motion in index.css
 * - focus-visible rings on all interactive elements
 * - aria-labels on all interactive buttons
 * - Mobile action button visibility (sm:opacity-0 not opacity-0)
 * - useReducedMotion hook used in JS animations
 */

import * as fs from "fs";
import * as path from "path";
import { glob } from "glob";
import type { RefinementPass, PassResult } from "../types.js";

export class AccessibilityPass implements RefinementPass {
  name = "Accessibility Pass";
  description =
    "Verifies prefers-reduced-motion, focus-visible rings, aria-labels, and mobile action button visibility.";

  async run(projectRoot: string): Promise<PassResult> {
    const findings: string[] = [];
    const recommendations: string[] = [];
    const filesAffected: string[] = [];

    // Check index.css for global accessibility rules
    const cssPath = path.join(projectRoot, "client/src/index.css");
    if (fs.existsSync(cssPath)) {
      const css = fs.readFileSync(cssPath, "utf-8");

      if (!css.includes("prefers-reduced-motion")) {
        findings.push(
          "index.css: Missing @media (prefers-reduced-motion: reduce) rule — see LESSON-002"
        );
        recommendations.push(
          "Add global prefers-reduced-motion CSS rule to index.css"
        );
        filesAffected.push("client/src/index.css");
      }

      if (!css.includes("focus-visible")) {
        findings.push(
          "index.css: Missing :focus-visible ring rule — keyboard navigation is broken"
        );
        recommendations.push(
          "Add global :focus-visible gold ring rule to index.css — see LESSON-003"
        );
        filesAffected.push("client/src/index.css");
      }
    }

    // Check useReducedMotion hook exists
    const hookPath = path.join(
      projectRoot,
      "client/src/hooks/useReducedMotion.ts"
    );
    if (!fs.existsSync(hookPath)) {
      findings.push(
        "hooks/useReducedMotion.ts: Hook not found — JS animations cannot respect prefers-reduced-motion"
      );
      recommendations.push(
        "Create useReducedMotion hook — see LESSON-002"
      );
      filesAffected.push("client/src/hooks/useReducedMotion.ts");
    }

    // Scan for buttons without aria-label
    const clientSrc = path.join(projectRoot, "client/src");
    const files = await glob("**/*.tsx", {
      cwd: clientSrc,
      ignore: ["**/*.test.*", "**/node_modules/**", "**/_core/**"],
    });

    let missingAriaCount = 0;
    for (const file of files) {
      const absolutePath = path.join(clientSrc, file);
      let content: string;
      try {
        content = fs.readFileSync(absolutePath, "utf-8");
      } catch {
        continue;
      }

      // Count icon-only buttons without aria-label
      const iconButtonPattern = /<button[^>]*>[\s\n]*<[A-Z][a-zA-Z]+[^/]*\/>/g;
      const iconButtons = content.match(iconButtonPattern) || [];
      const withoutAriaLabel = iconButtons.filter(
        (b) => !b.includes("aria-label")
      );

      if (withoutAriaLabel.length > 0) {
        missingAriaCount += withoutAriaLabel.length;
        if (!filesAffected.includes(`client/src/${file}`)) {
          filesAffected.push(`client/src/${file}`);
        }
      }

      // Check for opacity-0 on action buttons (mobile invisible)
      if (
        content.includes("opacity-0") &&
        !content.includes("sm:opacity-0") &&
        content.includes("group-hover:opacity-100")
      ) {
        findings.push(
          `client/src/${file}: opacity-0 on action buttons — invisible on mobile touch. Use sm:opacity-0 instead — see LESSON-008`
        );
        recommendations.push(
          `Change opacity-0 to sm:opacity-0 in ${file} so buttons are always visible on mobile`
        );
        if (!filesAffected.includes(`client/src/${file}`)) {
          filesAffected.push(`client/src/${file}`);
        }
      }
    }

    if (missingAriaCount > 0) {
      findings.push(
        `${missingAriaCount} icon-only button(s) missing aria-label across the codebase`
      );
      recommendations.push(
        `Add aria-label to all icon-only buttons — see LESSON-003 and LESSON-008`
      );
    }

    const status = findings.length === 0 ? "passed" : "warning";

    return {
      passName: this.name,
      status,
      findings,
      recommendations,
      scoreImpact: findings.length * 5,
      filesAffected: Array.from(new Set(filesAffected)),
    };
  }
}
