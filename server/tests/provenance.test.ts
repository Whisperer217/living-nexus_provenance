import { describe, it, expect } from "vitest";
import {
  canonicalize,
  sha256hex,
  generateKeypair,
  signHex,
  verifySignature,
  buildAnchorPayload,
} from "../services/provenance";

describe("canonicalize", () => {
  it("normalizes CRLF line endings to LF", () => {
    const input = "line1\r\nline2\r\nline3";
    const result = canonicalize(input);
    expect(result).toBe("line1\nline2\nline3");
  });

  it("collapses multiple consecutive blank lines", () => {
    const input = "line1\n\n\n\nline2";
    const result = canonicalize(input);
    expect(result).toBe("line1\n\nline2");
  });

  it("trims trailing whitespace per line", () => {
    const input = "hello   \nworld   ";
    const result = canonicalize(input);
    expect(result).toBe("hello\nworld");
  });

  it("produces identical output for equivalent text", () => {
    const a = "  hello\r\n\r\n  world  ";
    const b = "  hello\n\n  world  ";
    expect(canonicalize(a)).toBe(canonicalize(b));
  });

  it("sorts JSON keys deterministically", () => {
    const a = JSON.stringify({ z: 1, a: 2, m: 3 });
    const b = JSON.stringify({ a: 2, m: 3, z: 1 });
    expect(canonicalize(a)).toBe(canonicalize(b));
  });

  it("handles nested JSON key sorting", () => {
    const a = JSON.stringify({ b: { y: 1, x: 2 }, a: 0 });
    const b = JSON.stringify({ a: 0, b: { x: 2, y: 1 } });
    expect(canonicalize(a)).toBe(canonicalize(b));
  });
});

describe("sha256hex", () => {
  it("returns a 64-character hex string", () => {
    const hash = sha256hex("test");
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]+$/);
  });

  it("is deterministic", () => {
    expect(sha256hex("hello")).toBe(sha256hex("hello"));
  });

  it("produces different hashes for different inputs", () => {
    expect(sha256hex("hello")).not.toBe(sha256hex("world"));
  });

  it("matches known SHA-256 value for empty string", () => {
    // SHA-256("") = e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
    expect(sha256hex("")).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  });
});

describe("Ed25519 keypair", () => {
  it("generates a valid keypair", async () => {
    const { privateKeyHex, publicKeyHex } = await generateKeypair();
    expect(privateKeyHex).toHaveLength(64);
    expect(publicKeyHex).toHaveLength(64);
    expect(privateKeyHex).toMatch(/^[0-9a-f]+$/);
    expect(publicKeyHex).toMatch(/^[0-9a-f]+$/);
  });

  it("generates unique keypairs each time", async () => {
    const kp1 = await generateKeypair();
    const kp2 = await generateKeypair();
    expect(kp1.privateKeyHex).not.toBe(kp2.privateKeyHex);
    expect(kp1.publicKeyHex).not.toBe(kp2.publicKeyHex);
  });
});

describe("sign and verify", () => {
  it("signs and verifies a message correctly", async () => {
    const { privateKeyHex, publicKeyHex } = await generateKeypair();
    const message = "test event id 1234";
    const sig = await signHex(message, privateKeyHex);
    expect(sig).toBeTruthy();
    const valid = await verifySignature(message, sig, publicKeyHex);
    expect(valid).toBe(true);
  });

  it("rejects a tampered message", async () => {
    const { privateKeyHex, publicKeyHex } = await generateKeypair();
    const sig = await signHex("original message", privateKeyHex);
    const valid = await verifySignature("tampered message", sig, publicKeyHex);
    expect(valid).toBe(false);
  });

  it("rejects a signature from a different keypair", async () => {
    const kp1 = await generateKeypair();
    const kp2 = await generateKeypair();
    const sig = await signHex("message", kp1.privateKeyHex);
    const valid = await verifySignature("message", sig, kp2.publicKeyHex);
    expect(valid).toBe(false);
  });
});

describe("buildAnchorPayload", () => {
  it("returns all required fields", async () => {
    const { privateKeyHex, publicKeyHex } = await generateKeypair();
    const result = await buildAnchorPayload(
      "Some lyric text here",
      privateKeyHex,
      1,
      null,
      null,
      "test-session"
    );
    expect(result.payloadCanonical).toBeTruthy();
    expect(result.eventId).toHaveLength(64);
    expect(result.contentHash).toHaveLength(64);
    expect(result.signature).toBeTruthy();
    expect(result.wid).toBe(result.contentHash);
  });

  it("produces deterministic content hash for same input", async () => {
    const { privateKeyHex } = await generateKeypair();
    const r1 = await buildAnchorPayload("Same text", privateKeyHex, 1, null, null, null);
    const r2 = await buildAnchorPayload("Same text", privateKeyHex, 1, null, null, null);
    expect(r1.contentHash).toBe(r2.contentHash);
    expect(r1.payloadCanonical).toBe(r2.payloadCanonical);
  });

  it("produces different event IDs for same input (timestamp-based)", async () => {
    const { privateKeyHex } = await generateKeypair();
    const r1 = await buildAnchorPayload("Same text", privateKeyHex, 1, null, null, null);
    await new Promise(r => setTimeout(r, 5));
    const r2 = await buildAnchorPayload("Same text", privateKeyHex, 1, null, null, null);
    // eventId includes timestamp so should differ
    expect(r1.eventId).not.toBe(r2.eventId);
  });

  it("signature is verifiable with the public key", async () => {
    const { privateKeyHex, publicKeyHex } = await generateKeypair();
    const result = await buildAnchorPayload("Lyric line", privateKeyHex, 1, null, null, null);
    const valid = await verifySignature(result.eventId, result.signature, publicKeyHex);
    expect(valid).toBe(true);
  });
});
