export type PlaybackDiagnosticEvent = {
  at: string;
  event: string;
  pathname: string;
  visibility: DocumentVisibilityState | "unknown";
  details?: Record<string, unknown>;
};

declare global {
  interface Window {
    __LN_PLAYBACK_LOG?: PlaybackDiagnosticEvent[];
    __LN_PLAYBACK_AUDIO?: HTMLAudioElement | null;
  }
}

const ENABLED_KEY = "LN_DIAG_PLAYBACK";
const MAX_EVENTS = 160;

/**
 * Development-only, listener-enabled lifecycle evidence. It is deliberately
 * inert unless the developer flag is enabled, and it never sends data away.
 */
export function playbackDiag(event: string, details?: Record<string, unknown>) {
  if (!import.meta.env.DEV || typeof window === "undefined") return;
  if (localStorage.getItem(ENABLED_KEY) !== "1") return;

  const entry: PlaybackDiagnosticEvent = {
    at: new Date().toISOString(),
    event,
    pathname: window.location.pathname,
    visibility: document.visibilityState ?? "unknown",
    details,
  };
  const log = window.__LN_PLAYBACK_LOG ?? (window.__LN_PLAYBACK_LOG = []);
  log.push(entry);
  if (log.length > MAX_EVENTS) log.splice(0, log.length - MAX_EVENTS);
  console.info("[LN-PLAYBACK]", entry);
}

export function audioDiagnosticDetails(audio: HTMLAudioElement | null) {
  return {
    currentTime: audio?.currentTime ?? null,
    duration: Number.isFinite(audio?.duration) ? audio?.duration : null,
    paused: audio?.paused ?? null,
    readyState: audio?.readyState ?? null,
    networkState: audio?.networkState ?? null,
    src: audio?.currentSrc || audio?.src || null,
    errorCode: audio?.error?.code ?? null,
  };
}

/** Development-only access to the existing singleton for local lifecycle probes. */
export function exposePlaybackAudioForDiagnostics(audio: HTMLAudioElement | null) {
  if (!import.meta.env.DEV || typeof window === "undefined") return;
  if (localStorage.getItem(ENABLED_KEY) !== "1") return;
  window.__LN_PLAYBACK_AUDIO = audio;
}
