/**
 * Provenance utilities for ln-provenance
 * Anchor pipeline: canonicalize → hash → sign → create Event + WID
 * Events are APPEND-ONLY — never mutate.
 */

import * as ed from "@noble/ed25519";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils.js";

// ─── Canonicalization ─────────────────────────────────────────────────────────

/**
 * Deterministically normalize text for hashing.
 * Rules:
 *   - UTF-8 encoding (JS strings are already UTF-16; we encode to UTF-8 at hash time)
 *   - Normalize line endings to \n
 *   - Trim leading/trailing whitespace per line
 *   - Collapse multiple consecutive blank lines → single blank line
 *   - If input is JSON, sort keys recursively
 *   - No transient fields (caller must strip timestamps before calling)
 */
export function canonicalize(input: string): string {
  // Try JSON path first
  try {
    const parsed = JSON.parse(input);
    if (typeof parsed === "object" && parsed !== null) {
      return JSON.stringify(sortKeysDeep(parsed));
    }
  } catch {
    // Not JSON — treat as plain text
  }

  // Plain text path
  const normalized = input
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");

  const lines = normalized.split("\n").map(l => l.trimEnd());
  const collapsed: string[] = [];
  let prevBlank = false;
  for (const line of lines) {
    const isBlank = line.trim() === "";
    if (isBlank && prevBlank) continue; // collapse consecutive blanks
    collapsed.push(line);
    prevBlank = isBlank;
  }

  return collapsed.join("\n").trim();
}

function sortKeysDeep(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(sortKeysDeep);
  if (obj !== null && typeof obj === "object") {
    return Object.fromEntries(
      Object.keys(obj as Record<string, unknown>)
        .sort()
        .map(k => [k, sortKeysDeep((obj as Record<string, unknown>)[k])])
    );
  }
  return obj;
}

// ─── Hashing ──────────────────────────────────────────────────────────────────

/** SHA-256 of a string (UTF-8 encoded), returned as lowercase hex. */
export function sha256hex(input: string): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(input);
  return bytesToHex(sha256(bytes));
}

// ─── Ed25519 key management ───────────────────────────────────────────────────

/** Generate a new Ed25519 keypair. Returns hex-encoded private and public keys. */
export async function generateKeypair(): Promise<{ privateKeyHex: string; publicKeyHex: string }> {
  const privateKeyBytes = ed.utils.randomSecretKey();
  const publicKeyBytes = await ed.getPublicKeyAsync(privateKeyBytes);
  return {
    privateKeyHex: bytesToHex(privateKeyBytes),
    publicKeyHex: bytesToHex(publicKeyBytes),
  };
}

/** Sign a message (string) with an Ed25519 private key (hex). Returns base64 signature. */
export async function signHex(message: string, privateKeyHex: string): Promise<string> {
  const encoder = new TextEncoder();
  const msgBytes = encoder.encode(message);
  const privBytes = hexToBytes(privateKeyHex);
  const sigBytes = await ed.signAsync(msgBytes, privBytes);
  return Buffer.from(sigBytes).toString("base64");
}

/** Verify an Ed25519 signature. Returns true if valid. */
export async function verifySignature(
  message: string,
  signatureBase64: string,
  publicKeyHex: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const msgBytes = encoder.encode(message);
    const sigBytes = Buffer.from(signatureBase64, "base64");
    const pubBytes = hexToBytes(publicKeyHex);
    return await ed.verifyAsync(sigBytes, msgBytes, pubBytes);
  } catch {
    return false;
  }
}

// ─── Anchor pipeline ──────────────────────────────────────────────────────────

/**
 * Full anchor pipeline: canonicalize → hash → sign → return event fields.
 * Caller is responsible for persisting the event and WID records.
 */
export async function buildAnchorPayload(
  rawText: string,
  privateKeyHex: string,
  creatorId: number,
  agentId: number | null,
  parentEventId: string | null,
  sessionLabel: string | null
): Promise<{
  payloadCanonical: string;
  eventId: string;
  contentHash: string;
  signature: string;
  wid: string;
}> {
  const payloadCanonical = canonicalize(rawText);
  const contentHash = sha256hex(payloadCanonical);
  const eventId = sha256hex(`${contentHash}:${creatorId}:${Date.now()}`);
  const signature = await signHex(eventId, privateKeyHex);
  const wid = contentHash; // WID = content hash for MVP

  return { payloadCanonical, eventId, contentHash, signature, wid };
}
