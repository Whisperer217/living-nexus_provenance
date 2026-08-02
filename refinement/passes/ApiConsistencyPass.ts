/**
 * API Consistency Pass
 * =====================
 * Verifies all tRPC procedures return consistent, human-readable error messages.
 * No raw TRPC error codes exposed to users.
 */

import * as fs from "fs";
import * as path from "path";
import { glob } from "glob";
import type { RefinementPass, PassResult } from "../types.js";

export class ApiConsistencyPass implements RefinementPass {
  name = "API Consistency Pass";
  description =
    "Verifies tRPC procedures return human-readable errors. No raw INTERNAL_SERVER_ERROR, UNAUTHORIZED, BAD_REQUEST codes exposed to users.";

  async run(projectRoot: string): Promise<PassResult> {
    const serverDir = path.join(projectRoot, "server");
    const files = await glob("**/*.ts", {
      cwd: serverDir,
      ignore: ["**/*.test.*", "**/node_modules/**", "**/_core/**"],
    });

    const findings: string[] = [];
    const filesAffected: string[] = [];

    const rawErrorPattern =
      /message:\s*['"`](INTERNAL_SERVER_ERROR|UNAUTHORIZED|BAD_REQUEST|NOT_FOUND|FORBIDDEN|CONFLICT|PRECONDITION_FAILED)['"`]/g;

    for (const file of files) {
      const absolutePath = path.join(serverDir, file);
      let content: string;
      try {
        content = fs.readFileSync(absolutePath, "utf-8");
      } catch {
        continue;
      }

      const matches = content.match(rawErrorPattern) || [];
      if (matches.length > 0) {
        findings.push(
          `server/${file}: ${matches.length} raw tRPC error code(s) exposed — ${matches.slice(0, 3).join(", ")}`
        );
        filesAffected.push(`server/${file}`);
      }
    }

    // Check for consistent staleTime on high-traffic queries
    const routerFiles = await glob("routers/**/*.ts", {
      cwd: serverDir,
      ignore: ["**/*.test.*"],
    });

    let missingStaleTime = 0;
    for (const file of routerFiles) {
      const absolutePath = path.join(serverDir, file);
      let content: string;
      try {
        content = fs.readFileSync(absolutePath, "utf-8");
      } catch {
        continue;
      }
      // High-traffic public procedures without staleTime hint
      if (
        content.includes("publicProcedure") &&
        content.includes(".query(") &&
        !content.includes("staleTime")
      ) {
        missingStaleTime++;
      }
    }

    const recommendations: string[] = [];
    if (findings.length > 0) {
      recommendations.push(
        `Replace ${findings.length} raw tRPC error code(s) with human-readable messages from shared/errors.ts`
      );
    }
    if (missingStaleTime > 0) {
      recommendations.push(
        `Add staleTime hints to ${missingStaleTime} public query procedure(s) to prevent refetch storms`
      );
    }

    const status =
      findings.length === 0 && missingStaleTime === 0
        ? "passed"
        : findings.length > 0
          ? "warning"
          : "passed";

    return {
      passName: this.name,
      status,
      findings,
      recommendations,
      scoreImpact: findings.length * 3,
      filesAffected,
    };
  }
}
