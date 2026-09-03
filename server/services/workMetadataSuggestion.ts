import { invokeLLM } from "../_core/llm";
import {
  cathedralEvidencePacketSchema,
  cathedralSuggestionResultSchema,
  type CathedralEvidencePacket,
  type CathedralSuggestionResult,
} from "../../shared/creativeCathedral";

const MODEL_ID = "gpt-5-mini";

export function normalizeWorkMetadataSuggestion(
  rawInput: unknown,
  evidenceInput: CathedralEvidencePacket,
): CathedralSuggestionResult {
  const evidencePacket = cathedralEvidencePacketSchema.parse(evidenceInput);
  const raw = (rawInput && typeof rawInput === "object" ? rawInput : {}) as Record<string, unknown> & { patch?: Record<string, unknown> };
  const permittedFields = new Set([
    "title", "genre", "bpm", "keySignature", "moodTags", "caption",
    "creationDate", "originalReleaseDate", "participationMusic", "participationLyrics", "participationVoice",
  ]);
  const participationEvidence = [
    ...evidencePacket.audio.productionHints,
    ...evidencePacket.audio.comments,
  ].join(" ").toLowerCase();
  const hasParticipationDeclaration = /(human|ai|suno|udio|synthetic|generated|assisted|performed|written)/i.test(participationEvidence);
  const participationSupport = {
    music: hasParticipationDeclaration && /(music|composition|instrument|production|beat|suno|udio)/i.test(participationEvidence),
    lyrics: hasParticipationDeclaration && /(lyric|written|songwriter|lyricist)/i.test(participationEvidence),
    voice: hasParticipationDeclaration && /(voice|vocal|singer|performed)/i.test(participationEvidence),
  };
  const trimText = (value: unknown, max: number) => String(value ?? "").trim().slice(0, max);
  const patch = Object.fromEntries(
    Object.entries(raw.patch ?? {}).filter(([field, value]) => permittedFields.has(field) && value !== null),
  );
  delete patch.creationDate;
  if (!evidencePacket.audio.originalReleaseDate) delete patch.originalReleaseDate;
  if (!participationSupport.music) delete patch.participationMusic;
  if (!participationSupport.lyrics) delete patch.participationLyrics;
  if (!participationSupport.voice) delete patch.participationVoice;
  const evidence = (Array.isArray(raw.evidence) ? raw.evidence : [])
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .filter((item) => permittedFields.has(String(item.field ?? "")))
    .map((item) => ({
      field: String(item.field),
      note: trimText(item.note, 400) || "Review this proposal against the listed evidence.",
      confidence: ["high", "medium", "low"].includes(String(item.confidence)) ? String(item.confidence) : "low",
    }))
    .filter((item) => Object.prototype.hasOwnProperty.call(patch, item.field))
    .slice(0, 12);
  const cautions = (Array.isArray(raw.cautions) ? raw.cautions : [])
    .map((item) => trimText(item, 280))
    .filter(Boolean)
    .slice(0, 8);
  const fieldLabels: Record<string, string> = {
    title: "title",
    genre: "genres",
    bpm: "BPM",
    keySignature: "key",
    moodTags: "moods",
    caption: "caption",
    creationDate: "Creation Date",
    originalReleaseDate: "Original Release Date",
    participationMusic: "music participation",
    participationLyrics: "lyrics participation",
    participationVoice: "voice participation",
  };
  const proposedFields = Object.keys(patch).map((field) => fieldLabels[field] ?? field);
  const summary = proposedFields.length > 0
    ? `The review returned non-binding proposals for: ${proposedFields.join(", ")}. Select only the fields you want to copy into the local form.`
    : "The review returned no evidence-supported field proposals.";
  return cathedralSuggestionResultSchema.parse({
    summary,
    patch,
    evidence,
    cautions,
  });
}

export async function suggestWorkMetadataFromApprovedContext(input: {
  evidencePacket: CathedralEvidencePacket;
}): Promise<{ modelRef: string; suggestion: CathedralSuggestionResult }> {
  const evidencePacket = cathedralEvidencePacketSchema.parse(input.evidencePacket);
  const response = await invokeLLM({
    model: MODEL_ID,
    messages: [
      {
        role: "system",
        content: `You are the Creative Cathedral media-facts reviewer for Living Nexus.
Return a conservative, structured proposal based only on the creator-approved evidence packet in the request.
Never invent provenance, authorship, dates, credits, ownership, WIDs, publication state, or legal conclusions.
Do not infer Creation Date from file modification time. Propose Original Release Date only when an embedded date supports it.
Propose participationMusic, participationLyrics, or participationVoice only when an embedded production hint or creator field explicitly supports Human, AI, or Both. Never invent contributor names or ownership.
Omit unsupported fields from patch. Explain every proposed field in evidence with high, medium, or low confidence. Keep each caution under 240 characters.
Your response is non-binding and will not be saved to a Work unless the creator separately acts.`,
      },
      {
        role: "user",
        content: `CREATOR-APPROVED EVIDENCE PACKET:\n${JSON.stringify(evidencePacket)}`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "creative_cathedral_media_fact_suggestion",
        strict: true,
        schema: {
          type: "object",
          properties: {
            summary: { type: "string" },
            patch: {
              type: "object",
              properties: {
                title: { type: ["string", "null"] },
                genre: { type: ["string", "null"] },
                bpm: { type: ["integer", "null"] },
                keySignature: { type: ["string", "null"] },
                moodTags: { type: ["array", "null"], items: { type: "string" } },
                caption: { type: ["string", "null"] },
                creationDate: { type: ["string", "null"] },
                originalReleaseDate: { type: ["string", "null"] },
                participationMusic: { type: ["string", "null"], enum: ["Human", "AI", "Both", null] },
                participationLyrics: { type: ["string", "null"], enum: ["Human", "AI", "Both", null] },
                participationVoice: { type: ["string", "null"], enum: ["Human", "AI", "Both", null] },
              },
              required: ["title", "genre", "bpm", "keySignature", "moodTags", "caption", "creationDate", "originalReleaseDate", "participationMusic", "participationLyrics", "participationVoice"],
              additionalProperties: false,
            },
            evidence: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  field: { type: "string", enum: ["title", "genre", "bpm", "keySignature", "moodTags", "caption", "creationDate", "originalReleaseDate", "participationMusic", "participationLyrics", "participationVoice"] },
                  note: { type: "string" },
                  confidence: { type: "string", enum: ["high", "medium", "low"] },
                },
                required: ["field", "note", "confidence"],
                additionalProperties: false,
              },
            },
            cautions: { type: "array", items: { type: "string" } },
          },
          required: ["summary", "patch", "evidence", "cautions"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response?.choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new Error("Creative Cathedral returned no structured suggestion.");
  const raw = JSON.parse(content);
  return {
    modelRef: MODEL_ID,
    suggestion: normalizeWorkMetadataSuggestion(raw, evidencePacket),
  };
}
