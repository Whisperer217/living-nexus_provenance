/**
 * sessionFlags.ts
 *
 * Lightweight session-state flags stored in sessionStorage.
 * These flags persist for the lifetime of a browser tab and are used
 * to distinguish "fresh guest visitor" from "user whose session expired".
 *
 * Extracted into its own module to avoid circular imports between
 * main.tsx (which sets up the global redirect handler) and
 * useAuth.ts (which calls markHadSession when auth.me resolves).
 */

const SESSION_FLAG = 'ln-had-session';

/**
 * Mark that this browser tab had an authenticated session.
 * Called by useAuth when auth.me resolves with a real user.
 * The global redirect handler in main.tsx reads this flag to decide
 * whether a 401 means "session expired" (redirect) or "guest visit" (ignore).
 */
export function markHadSession(): void {
  try { sessionStorage.setItem(SESSION_FLAG, '1'); } catch { /* ignore */ }
}

/**
 * True if this browser tab previously had an authenticated session.
 * Returns false for fresh guest visitors who have never logged in.
 */
export function hadSession(): boolean {
  try { return sessionStorage.getItem(SESSION_FLAG) === '1'; } catch { return false; }
}
