/**
 * Provenance keypair utilities for Living Nexus.
 * Generates Ed25519 keypairs using the Node.js Web Crypto API (no external deps).
 */

/**
 * Generate a new Ed25519 keypair.
 * Returns hex-encoded private and public keys.
 * The private key is returned ONCE — it is never stored server-side.
 */
export async function generateKeypair(): Promise<{
  privateKeyHex: string;
  publicKeyHex: string;
}> {
  const { subtle } = globalThis.crypto;

  const keypair = await subtle.generateKey(
    { name: "Ed25519" },
    true, // extractable
    ["sign", "verify"],
  );

  const privateKeyBuffer = await subtle.exportKey("pkcs8", keypair.privateKey);
  const publicKeyBuffer = await subtle.exportKey("spki", keypair.publicKey);

  const privateKeyHex = Buffer.from(privateKeyBuffer).toString("hex");
  const publicKeyHex = Buffer.from(publicKeyBuffer).toString("hex");

  return { privateKeyHex, publicKeyHex };
}

/**
 * Sign a canonical payload string with an Ed25519 private key (hex-encoded pkcs8).
 */
export async function signPayload(
  privateKeyHex: string,
  payload: string,
): Promise<string> {
  const { subtle } = globalThis.crypto;

  const privateKeyBuffer = Buffer.from(privateKeyHex, "hex");
  const privateKey = await subtle.importKey(
    "pkcs8",
    privateKeyBuffer,
    { name: "Ed25519" },
    false,
    ["sign"],
  );

  const data = new TextEncoder().encode(payload);
  const signature = await subtle.sign("Ed25519", privateKey, data);
  return Buffer.from(signature).toString("hex");
}

/**
 * Verify a signature against a public key (hex-encoded spki) and payload.
 */
export async function verifySignature(
  publicKeyHex: string,
  payload: string,
  signatureHex: string,
): Promise<boolean> {
  const { subtle } = globalThis.crypto;

  try {
    const publicKeyBuffer = Buffer.from(publicKeyHex, "hex");
    const publicKey = await subtle.importKey(
      "spki",
      publicKeyBuffer,
      { name: "Ed25519" },
      false,
      ["verify"],
    );

    const data = new TextEncoder().encode(payload);
    const signature = Buffer.from(signatureHex, "hex");
    return await subtle.verify("Ed25519", publicKey, signature, data);
  } catch {
    return false;
  }
}
