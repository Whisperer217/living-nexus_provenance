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

import { storagePut } from "../utils/storage";
import { deriveToneFrequency } from "../services/sovereignStamp";
import type { Song } from "../../drizzle/schema";

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
    | "contentType"
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

/** Domain-specific HAAI field label sets keyed by contentType */
const HAAI_LABELS: Record<string, [string, string, string, string, string, string]> = {
  manuscript: [
    "STRUCTURAL_CONCEPT",
    "NARRATIVE_VOICE",
    "THEMATIC_ELEMENTS",
    "PACING_AND_FLOW",
    "CORE_SUBJECT_THESIS",
    "EMOTIONAL_RESONANCE",
  ],
  lyrics: [
    "IMAGERY_METAPHOR",
    "POETIC_FORM_STYLE",
    "RHYTHMIC_MECHANICS",
    "INTENDED_DELIVERY",
    "FOUNDATIONAL_CONCEPT",
    "EMOTIONAL_TONE",
  ],
  comic: [
    "COMPOSITION_FRAMING",
    "AESTHETIC_MEDIUM",
    "COLOR_PALETTE_LIGHTING",
    "ACTION_MOVEMENT",
    "SUBJECT_CHARACTER",
    "ATMOSPHERE_MOOD",
  ],
  // audio / default
  audio: [
    "VISUAL_CONCEPT",
    "STYLE_LANGUAGE",
    "INSTRUMENTATION",
    "VOCAL_CONVEYANCE",
    "LYRICAL_INSPIRATION",
    "EMOTIONAL_TONE",
  ],
};

/**
 * Generate and upload a Sovereign Stamp provenance certificate.
 */
export async function generateCertificate(
  input: CertificateInput
): Promise<CertificateResult> {
  const { stampId, song, stampedFileHash, stampedAt } = input;
  const toneFrequency = deriveToneFrequency(stampId);
  const workType = song.contentType ?? "audio";

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
    `WORK_ID:             ${song.id}`,
    `WORK_TITLE:          ${song.title ?? "Untitled"}`,
    `WORK_TYPE:           ${workType}`,
    "",
    `ORIGINAL_HASH:       ${song.fileHash ?? "N/A"}`,
    `STAMPED_HASH:        ${stampedFileHash}`,
    `TONE_FREQUENCY_HZ:   ${toneFrequency}`,
    `STAMP_TIMESTAMP:     ${stampedAt.toISOString()}`,
    "",
    `AI_DISCLOSURE:       ${song.aiDisclosure ?? "N/A"}`,
  ];

  // Include HAAI declaration fields if applicable, using domain-aware labels
  if (song.aiDisclosure === "human_authored_ai_instrument") {
    const [l1, l2, l3, l4, l5, l6] =
      HAAI_LABELS[workType] ?? HAAI_LABELS["audio"];

    lines.push("");
    lines.push(`HAAI DECLARATION (${workType.toUpperCase()}):`);
    if (song.haaiVisualConcept)
      lines.push(`  ${l1.padEnd(24)} ${song.haaiVisualConcept}`);
    if (song.haaiStyleLanguage)
      lines.push(`  ${l2.padEnd(24)} ${song.haaiStyleLanguage}`);
    if (song.haaiInstrumentation)
      lines.push(`  ${l3.padEnd(24)} ${song.haaiInstrumentation}`);
    if (song.haaiVocalConveyance)
      lines.push(`  ${l4.padEnd(24)} ${song.haaiVocalConveyance}`);
    if (song.haaiLyricalInspiration)
      lines.push(`  ${l5.padEnd(24)} ${song.haaiLyricalInspiration}`);
    if (song.haaiEmotionalTone)
      lines.push(`  ${l6.padEnd(24)} ${song.haaiEmotionalTone}`);
    if (song.haaiDeclaredAt)
      lines.push(
        `  HAAI_DECLARED_AT:        ${song.haaiDeclaredAt.toISOString()}`
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
    "embedded in this work constitutes a human-authored expressive"
  );
  lines.push("element under 17 U.S.C. § 102(a).");
  lines.push("───────────────────────────────────────────────────────────────");
  lines.push("");

  const certificateText = lines.join("\n");
  const certKey = `certificates/${song.userId}/${stampId}.txt`;

  const { url: certificateUrl, key: certificateKey } = await storagePut(
    certKey,
    Buffer.from(certificateText, "utf-8"),
    "text/plain"
  );

  return { certificateUrl, certificateKey, certificateText };
}
