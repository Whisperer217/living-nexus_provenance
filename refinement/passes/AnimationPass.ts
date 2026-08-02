/**
 * Animation Pass
 * ===============
 * Verifies all animations respect prefers-reduced-motion.
 * No playful animations (bounce, ping).
 * Cathedral transitions only (fade, slide, subtle pulse).
 */

import * as fs from "fs";
import * as path from "path";
import { glob } from "glob";
import type { RefinementPass, PassResult } from "../types.js";

const FORBIDDEN_ANIMATIONS = [
  "animate-bounce",
  "animate-ping",
  "animate-spin", // unless in loading states
  "transition-all duration-75", // too fast — jarring
];

const REQUIRED_MOTION_GUARDS = [
  "useReducedMotion",
  "prefers-reduced-motion",
];

export class AnimationPass implements RefinementPass {
  name = "Animation Pass";
  description =
    "Verifies all animations respect prefers-reduced-motion. No playful animations (bounce, ping). Cathedral transitions only.";

  async run(projectRoot: string): Promise<PassResult> {
    const clientSrc = path.join(projectRoot, "client/src");
    const files = await glob("**/*.{tsx,ts,css}", {
      cwd: clientSrc,
      ignore: ["**/*.test.*", "**/node_modules/**", "**/_core/**"],
    });

    const findings: string[] = [];
    const recommendations: string[] = [];
    const filesAffected: string[] = [];

    for (const file of files) {
      const absolutePath = path.join(clientSrc, file);
      let content: string;
      try {
        content = fs.readFileSync(absolutePath, "utf-8");
      } catch {
        continue;
      }

      // Check for forbidden animations
      for (const pattern of FORBIDDEN_ANIMATIONS) {
        if (content.includes(pattern)) {
          findings.push(
            `client/src/${file}: Forbidden animation "${pattern}" — not cathedral`
          );
          recommendations.push(
            `Replace "${pattern}" with animate-pulse (subtle) or a custom cathedral transition`
          );
          if (!filesAffected.includes(`client/src/${file}`)) {
            filesAffected.push(`client/src/${file}`);
          }
        }
      }

      // Check that canvas animations use motion guards
      if (
        content.includes("requestAnimationFrame") ||
        content.includes("canvas")
      ) {
        const hasMotionGuard = REQUIRED_MOTION_GUARDS.some((guard) =>
          content.includes(guard)
        );
        if (!hasMotionGuard) {
          findings.push(
            `client/src/${file}: Canvas/RAF animation without prefers-reduced-motion guard — see LESSON-002`
          );
          recommendations.push(
            `Add useReducedMotion() guard to canvas animation in ${file}`
          );
          if (!filesAffected.includes(`client/src/${file}`)) {
            filesAffected.push(`client/src/${file}`);
          }
        }
      }
    }

    const status = findings.length === 0 ? "passed" : "warning";

    return {
      passName: this.name,
      status,
      findings,
      recommendations,
      scoreImpact: findings.length * 3,
      filesAffected: Array.from(new Set(filesAffected)),
    };
  }
}
