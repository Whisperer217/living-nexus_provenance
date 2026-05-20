/**
 * Living Nexus — Simple Auth Const Patch
 * ──────────────────────────────────────
 * Drop-in replacement for client/src/const.ts
 * Changes the login URL to point to our local React route instead of Manus OAuth.
 *
 * DEPLOYMENT INSTRUCTIONS:
 *   1. cp deploy/const.simple-auth.ts client/src/const.ts
 *   2. Rebuild: pnpm build
 */

export const APP_ID = import.meta.env.VITE_APP_ID;

export function getLoginUrl() {
  // Redirects to the local React login page instead of Manus OAuth
  return "/login";
}
