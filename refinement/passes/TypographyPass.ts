/**
 * Typography Pass
 * ================
 * Ensures cathedral typography is used throughout the platform.
 * Cinzel (headings), Cormorant Garamond (editorial), EB Garamond (body),
 * Oswald (labels), JetBrains Mono (code).
 */

import * as fs from "fs";
import * as path from "path";
import { glob } from "glob";
import type { RefinementPass, PassResult } from "../types.js";

export class TypographyPass implements RefinementPass {
  name = "Typography Pass";
  description =
    "Ensures cathedral typography: Cinzel (headings), Cormorant Garamond (editorial), EB Garamond (body). No generic sans-serif.";

  async run(projectRoot: string): Promise<PassResult> {
    const clientSrc = path.join(projectRoot, "client/src");
    const files = await glob("**/*.{tsx,ts}", {
      cwd: clientSrc,
      ignore: ["**/*.test.*", "**/node_modules/**", "**/_core/**"],
    });

    const findings: string[] = [];
    const filesAffected: string[] = [];

    // Count hardcoded pixel font sizes
    let hardcodedSizeCount = 0;
    const hardcodedSizePattern = /text-\[(\d+)px\]/g;

    // Count non-cathedral font usage
    let genericFontCount = 0;

    for (const file of files) {
      const absolutePath = path.join(clientSrc, file);
      let content: string;
      try {
        content = fs.readFileSync(absolutePath, "utf-8");
      } catch {
        continue;
      }

      const matches = content.match(hardcodedSizePattern) || [];
      if (matches.length > 0) {
        hardcodedSizeCount += matches.length;
        filesAffected.push(`client/src/${file}`);
        if (matches.length > 10) {
          findings.push(
            `${file}: ${matches.length} hardcoded pixel font sizes (e.g. ${matches.slice(0, 3).join(", ")})`
          );
        }
      }

      if (content.includes("font-sans") && !content.includes("/* intentional */")) {
        genericFontCount++;
        if (!filesAffected.includes(`client/src/${file}`)) {
          filesAffected.push(`client/src/${file}`);
        }
      }
    }

    const totalIssues = hardcodedSizeCount + genericFontCount;
    const status =
      totalIssues === 0 ? "passed" : totalIssues < 20 ? "warning" : "failed";

    const recommendations: string[] = [];
    if (hardcodedSizeCount > 0) {
      recommendations.push(
        `Replace ${hardcodedSizeCount} hardcoded pixel font sizes with ln-* semantic classes (ln-page-title, ln-section-header, ln-body-copy, ln-caption)`
      );
    }
    if (genericFontCount > 0) {
      recommendations.push(
        `Replace ${genericFontCount} font-sans usages with font-heading (Cinzel), font-editorial (Cormorant), or font-body (EB Garamond)`
      );
    }

    return {
      passName: this.name,
      status,
      findings,
      recommendations,
      scoreImpact: Math.min(15, Math.floor(totalIssues / 10)),
      filesAffected: Array.from(new Set(filesAffected)),
    };
  }
}
