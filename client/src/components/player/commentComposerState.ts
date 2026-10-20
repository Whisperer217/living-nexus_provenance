export type PlayerCommentTarget = {
  songId: number;
  title: string;
  creator: string;
  artUrl: string | null;
};

export type PlayerCommentComposerState = {
  target: PlayerCommentTarget | null;
  drafts: Record<number, string>;
};

export const initialPlayerCommentComposerState: PlayerCommentComposerState = {
  target: null,
  drafts: {},
};

/**
 * Captures the listener's intended Work when opening the composer. Playback may
 * move later, but only an explicit switch may replace this target.
 */
export function openPlayerCommentComposer(
  state: PlayerCommentComposerState,
  currentTarget: PlayerCommentTarget,
): PlayerCommentComposerState {
  const hasBoundDraft = state.target && Boolean(state.drafts[state.target.songId]?.trim());
  return hasBoundDraft ? state : { ...state, target: currentTarget };
}

export function setPlayerCommentDraft(
  state: PlayerCommentComposerState,
  text: string,
): PlayerCommentComposerState {
  if (!state.target) return state;
  return {
    ...state,
    drafts: { ...state.drafts, [state.target.songId]: text },
  };
}

/**
 * An explicit listener action moves the composer to the currently playing Work.
 * The previous Work's draft is intentionally retained in the per-Work draft map.
 */
export function switchPlayerCommentTarget(
  state: PlayerCommentComposerState,
  nextTarget: PlayerCommentTarget,
): PlayerCommentComposerState {
  return { ...state, target: nextTarget };
}

export function clearPlayerCommentDraft(
  state: PlayerCommentComposerState,
  songId: number,
): PlayerCommentComposerState {
  const { [songId]: _cleared, ...drafts } = state.drafts;
  return {
    target: state.target?.songId === songId ? null : state.target,
    drafts,
  };
}

export function currentPlayerCommentDraft(state: PlayerCommentComposerState): string {
  return state.target ? state.drafts[state.target.songId] ?? "" : "";
}
