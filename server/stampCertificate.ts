/**
 * Sovereign Stamp — Certificate Generator
 * Phase 2 — server/stampCertificate.ts
 *
 * Issued by: BDDT Publishing / Command Domains LLC
 * Platform: Living Nexus — livingnexus.org
 *
 * Generates a plain-text provenance certificate documenting the
 * Sovereign Stamp creation event. The certificate is uploaded to
 * storage at: certificates/{userId}/SS-{stampId}.txt
 *
 * Legal basis: 17 U.S.C. § 102(a) — the deliberate act of selecting,
 * claiming, and cryptographically marking a work at a specific moment
 * in time constitutes a human-authored expressive element.
 */

import { storagePut } from "./storage";
import { deriveToneFrequency } from "./sovereignStamp";
import type { Song } from "../drizzle/schema";

export interface CertificateInput {
  stampId: string;
  song: Pick<
    Song,
    | "id"
    | "userId"
    | "title"
    | "witnessId"
    | "fileHash"
    | "aiDisclosure"
    | "haaiVisualConcept"
    | "haaiStyleLanguage"
    | "haaiInstrumentation"
    | "haaiVocalConveyance"
    | "haaiLyricalInspiration"
    | "haaiEmotionalTone"
    | "haaiDeclaredAt"
  >;
  stampedFileHash: string;
  stampedAt: Date;
}

export interface CertificateResult {
  certificateUrl: string;
  certificateKey: string;
  certificateText: string;
}

/**
 * Generate and upload a Sovereign Stamp provenance certificate.
 */
export async function generateCertificate(
  input: CertificateInput
): Promise<CertificateResult> {
  const { stampId, song, stampedFileHash, stampedAt } = input;
  const toneFrequency = deriveToneFrequency(stampId);

  const lines: string[] = [
    "═══════════════════════════════════════════════════════════════",
    "  SOVEREIGN STAMP — PROVENANCE CERTIFICATE",
    "  Issued by: BDDT Publishing / Command Domains LLC",
    "  Platform:  Living Nexus — livingnexus.org",
    "═══════════════════════════════════════════════════════════════",
    "",
    `STAMP_ID:            ${stampId}`,
    `WITNESS_ID:          ${song.witnessId ?? "N/A"}`,
    `CREATOR_ID:          ${song.userId}`,
    `SONG_ID:             ${song.id}`,
    `SONG_TITLE:          ${song.title ?? "Untitled"}`,
    "",
    `ORIGINAL_HASH:       ${song.fileHash ?? "N/A"}`,
    `STAMPED_HASH:        ${stampedFileHash}`,
    `TONE_FREQUENCY_HZ:   ${toneFrequency}`,
    `STAMP_TIMESTAMP:     ${stampedAt.toISOString()}`,
    "",
    `AI_DISCLOSURE:       ${song.aiDisclosure ?? "N/A"}`,
  ];

  // Include HAAI declaration fields if applicable
  if (song.aiDisclosure === "human_authored_ai_instrument") {
    lines.push("");
    lines.push("HAAI DECLARATION:");
    if (song.haaiVisualConcept)
      lines.push(`  VISUAL_CONCEPT:      ${song.haaiVisualConcept}`);
    if (song.haaiStyleLanguage)
      lines.push(`  STYLE_LANGUAGE:      ${song.haaiStyleLanguage}`);
    if (song.haaiInstrumentation)
      lines.push(`  INSTRUMENTATION:     ${song.haaiInstrumentation}`);
    if (song.haaiVocalConveyance)
      lines.push(`  VOCAL_CONVEYANCE:    ${song.haaiVocalConveyance}`);
    if (song.haaiLyricalInspiration)
      lines.push(`  LYRICAL_INSPIRATION: ${song.haaiLyricalInspiration}`);
    if (song.haaiEmotionalTone)
      lines.push(`  EMOTIONAL_TONE:      ${song.haaiEmotionalTone}`);
    if (song.haaiDeclaredAt)
      lines.push(
        `  HAAI_DECLARED_AT:    ${song.haaiDeclaredAt.toISOString()}`
      );
  }

  lines.push("");
  lines.push("───────────────────────────────────────────────────────────────");
  lines.push("ISSUER:   BDDT Publishing / Command Domains LLC");
  lines.push("PLATFORM: Living Nexus — livingnexus.org");
  lines.push("");
  lines.push(
    "LEGAL_NOTE: This certificate documents a deliberate human creative"
  );
  lines.push(
    "decision made at the timestamp above. The Sovereign Stamp tone"
  );
  lines.push(
    "embedded in this audio file constitutes a human-authored expressive"
  );
  lines.push("element under 17 U.S.C. § 102(a).");
  lines.push("───────────────────────────────────────────────────────────────");
  lines.push("");

  const certificateText = lines.join("\n");
  const certKey = `certificates/${song.userId}/SS-${stampId}.txt`;

  const { url: certificateUrl, key: certificateKey } = await storagePut(
    certKey,
    Buffer.from(certificateText, "utf-8"),
    "text/plain"
  );

  return { certificateUrl, certificateKey, certificateText };
}
