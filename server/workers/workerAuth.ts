/**
 * workerAuth.ts
 * HMAC-SHA256 signing and verification for worker ↔ backend communication.
 *
 * Pattern:
 *   Worker signs outgoing requests with: HMAC-SHA256(secret, timestamp + "." + body)
 *   Backend verifies the signature and rejects requests older than 5 minutes.
 *
 * Headers used:
 *   X-LN-Timestamp  — Unix seconds (string)
 *   X-LN-Signature  — hex HMAC-SHA256 digest
 */

import crypto from "crypto";
import { ENV } from "../_core/env";
import type { Request, Response, NextFunction } from "express";

const MAX_AGE_SECONDS = 300; // 5 minutes

/**
 * Sign a request body. Called by the cloud worker before sending callbacks.
 */
export function signPayload(body: string): {
  timestamp: string;
  signature: string;
} {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const message = `${timestamp}.${body}`;
  const signature = crypto
    .createHmac("sha256", ENV.workerSecret)
    .update(message)
    .digest("hex");
  return { timestamp, signature };
}

/**
 * Express middleware that verifies incoming worker callback requests.
 * Attach to any route that should only be callable by the cloud worker.
 */
export function requireWorkerAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const timestamp = req.headers["x-ln-timestamp"] as string | undefined;
  const signature = req.headers["x-ln-signature"] as string | undefined;

  if (!timestamp || !signature) {
    res.status(401).json({ error: "Missing worker auth headers" });
    return;
  }

  const now = Math.floor(Date.now() / 1000);
  const ts = parseInt(timestamp, 10);
  if (isNaN(ts) || Math.abs(now - ts) > MAX_AGE_SECONDS) {
    res.status(401).json({ error: "Request timestamp expired" });
    return;
  }

  const rawBody = (req as Request & { rawBody?: string }).rawBody ?? "";
  const message = `${timestamp}.${rawBody}`;
  const expected = crypto
    .createHmac("sha256", ENV.workerSecret)
    .update(message)
    .digest("hex");

  const sigBuf = Buffer.from(signature, "hex");
  const expBuf = Buffer.from(expected, "hex");

  if (
    sigBuf.length !== expBuf.length ||
    !crypto.timingSafeEqual(sigBuf, expBuf)
  ) {
    res.status(401).json({ error: "Invalid worker signature" });
    return;
  }

  next();
}

/**
 * Helper to dispatch a job to the cloud worker from the backend.
 * Returns the worker's response JSON or throws on failure.
 */
export async function dispatchWorkerJob<T = unknown>(
  path: string,
  payload: object
): Promise<T> {
  if (!ENV.cloudWorkerUrl) {
    throw new Error("CLOUD_WORKER_URL is not configured");
  }

  const body = JSON.stringify(payload);
  const { timestamp, signature } = signPayload(body);

  const response = await fetch(`${ENV.cloudWorkerUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-LN-Timestamp": timestamp,
      "X-LN-Signature": signature,
    },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Worker job failed (${response.status}): ${text}`);
  }

  return response.json() as Promise<T>;
}
