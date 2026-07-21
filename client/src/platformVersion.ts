/**
 * Living Nexus — Platform Version
 * ================================
 * Single source of truth for the platform version string.
 *
 * ONLY edit this file when bumping the version.
 * Both the sidebar "What's New" badge (ContextDrawer) and the
 * What's New modal (WhatsNewModal) import from here — they will
 * never drift out of sync again.
 *
 * When releasing a new version:
 *   1. Bump PLATFORM_VERSION below.
 *   2. Add a new entry at the top of the UPDATES array in WhatsNewModal.tsx.
 *   3. That's it — the badge updates automatically.
 */

export const PLATFORM_VERSION = "v2.51.0";
