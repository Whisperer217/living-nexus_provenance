/** Product permissions are separate from public submission consent. */
export const PLAYER_DISPLAY_TERMS_VERSION = "player-display-v1";
export const PLAYER_DISPLAY_CONSENT =
  "I submit this work for consideration and agree that its title, creator credit, artwork, and existing public preview will appear in the Player Collections submission list. Submission does not authorize physical distribution or promise selection or payment.";
export const PLAYER_TARGET_TRACKS = 50;
export function canExportPlayerSubmission(row: {
  status: string;
  publicConsent: boolean;
  terms: string | null;
  acceptedTerms: string | null;
  sourceHash: string | null;
  currentHash: string | null;
}) {
  return (
    row.status === "selected" &&
    row.publicConsent &&
    Boolean(row.terms?.trim()) &&
    row.acceptedTerms === row.terms &&
    Boolean(row.sourceHash) &&
    row.sourceHash === row.currentHash
  );
}
export function estimateMusicBytes(count: number, seconds = 240, kbps = 320) {
  return Math.ceil((Math.max(0, count) * seconds * kbps * 1000) / 8);
}
