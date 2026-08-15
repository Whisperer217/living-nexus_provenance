/**
 * Provenance Working State — versioned facts the agent may read.
 * Display-only. Never invents a WID, lineage, remix history, or legal claim.
 * Companion to docs/ADR-027-PROVENANCE-WORKING-STATE.md
 */

export const PROVENANCE_PLAYBACK_STATES = ["idle", "unsealed", "sealed"] as const;
export type ProvenancePlaybackState = (typeof PROVENANCE_PLAYBACK_STATES)[number];

export const LOOP_NAV_MODES = ["home", "explore", "upload", "manage", "archive"] as const;
export type LoopNavMode = (typeof LOOP_NAV_MODES)[number];

export interface ProvenancePlaybackFacts {
  playing: boolean;
  title: string | null;
  artist: string | null;
  trackId: string | null;
  wid: string | null;
  provenance: ProvenancePlaybackState;
}

export interface ProvenanceWorkingState {
  version: 1;
  route: string;
  navMode: LoopNavMode | null;
  pnaMode?: string | null;
  playback: ProvenancePlaybackFacts;
}

export function provenanceFromWid(wid: string | null | undefined): ProvenancePlaybackState {
  return wid && wid.trim() ? "sealed" : "unsealed";
}

export function collectProvenanceWorkingState(input: {
  route: string;
  navMode?: LoopNavMode | null;
  pnaMode?: string | null;
  track?: {
    title?: string | null;
    artist?: string | null;
    id?: string | number | null;
    wid?: string | null;
    witnessId?: string | null;
  } | null;
  playing?: boolean;
}): ProvenanceWorkingState {
  const track = input.track ?? null;
  const wid = (track?.wid ?? track?.witnessId ?? "").trim() || null;
  const title = track?.title?.trim() || null;
  const idle = !title;

  return {
    version: 1,
    route: input.route || "/",
    navMode: input.navMode ?? null,
    pnaMode: input.pnaMode ?? null,
    playback: {
      playing: Boolean(input.playing && title),
      title,
      artist: track?.artist?.trim() || null,
      trackId: track?.id != null ? String(track.id) : null,
      wid: idle ? null : wid,
      provenance: idle ? "idle" : provenanceFromWid(wid),
    },
  };
}

/** LLM block. Facts only. Explicit ban on invented registry claims. */
export function formatWorkingStateForAgent(state: ProvenanceWorkingState): string {
  const { playback } = state;
  const hearing = playback.title
    ? `${playback.playing ? "Playing" : "Paused"}: ${playback.title}${playback.artist ? ` · ${playback.artist}` : ""}`
    : "Nothing bound to the player.";
  const provenanceLine =
    playback.provenance === "sealed" && playback.wid
      ? `Provenance: sealed · ${playback.wid}`
      : playback.provenance === "unsealed"
        ? "Provenance: unsealed — this hearing has no WID. Do not invent one, a lineage, or a remix history."
        : "Provenance: idle — no work is bound.";

  return `--- WORKING STATE (display facts only; never invent provenance) ---
Route: ${state.route}
Loop nav: ${state.navMode ?? "none"}
PNA mode: ${state.pnaMode ?? "none"}
${hearing}
${provenanceLine}
You may speak to what is playing as hearing context.
You may not seal, publish, rewrite a WID, or treat an inference as a registry fact.
--- END WORKING STATE ---`;
}
