/**
 * LIVING NEXUS — Server Error Hardening
 * ─────────────────────────────────────────────────────────────────────────────
 * Provides:
 *   1. generateRef()        — short reference code for error tracing (e.g. UPL-4A2F)
 *   2. safeErrorResponse()  — logs full error internally, returns clean client payload
 *   3. globalErrorHandler   — Express 4-arg error middleware, catches all unhandled throws
 *
 * RULE: Full error details (stack, message, ORM output, S3 response) MUST NEVER
 * reach the client. The client receives only a friendly message + reference code.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { Request, Response, NextFunction } from "express";

/** Generate a short alphanumeric reference code for error tracing. */
export function generateRef(prefix = "ERR"): string {
  const hex = Math.floor(Math.random() * 0xFFFF).toString(16).toUpperCase().padStart(4, "0");
  return `${prefix}-${hex}`;
}

/**
 * Log the full error internally and return a safe client payload.
 * @param context  — log prefix, e.g. "[upload-file]"
 * @param err      — the raw error
 * @param ref      — reference code (generate one if not provided)
 */
export function safeErrorResponse(
  context: string,
  err: unknown,
  ref?: string
): { ref: string; payload: { error: string; code: string; ref: string } } {
  const errorRef = ref ?? generateRef("ERR");
  // Full details go to server logs ONLY
  console.error(`${context} [${errorRef}]`, err instanceof Error ? err.stack ?? err.message : err);
  return {
    ref: errorRef,
    payload: {
      error: "Something went wrong. Please try again.",
      code: "ERR_INTERNAL",
      ref: errorRef,
    },
  };
}

/**
 * Express global error handler — must be registered LAST, after all routes.
 * Catches any error passed to next(err) or thrown synchronously in a route.
 */
export function globalErrorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const ref = generateRef("ERR");
  console.error(`[global-error-handler] [${ref}] ${req.method} ${req.path}`, err instanceof Error ? err.stack ?? err.message : err);

  // Never send stack traces, ORM messages, or internal paths to the client
  if (res.headersSent) return;

  res.status(500).json({
    error: "Something went wrong. Please try again.",
    code: "ERR_INTERNAL",
    ref,
  });
}
