export const COOKIE_NAME = "app_session_id";
export const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;
export const AXIOS_TIMEOUT_MS = 30_000;
export const UNAUTHED_ERR_MSG = 'Please login (10001)';
export const NOT_ADMIN_ERR_MSG = 'You do not have required permission (10002)';

/**
 * Encode special characters in a CDN/S3 URL path so the browser can load it.
 * Only encodes the path segments — leaves protocol, host, and query string intact.
 * Handles filenames with spaces, commas, exclamation marks, emoji, etc.
 */
export function safeAudioUrl(url: string | null | undefined): string {
  if (!url) return "";
  try {
    const u = new URL(url);
    // Re-encode each path segment individually, preserving slashes
    u.pathname = u.pathname
      .split("/")
      .map((seg) => encodeURIComponent(decodeURIComponent(seg)))
      .join("/");
    return u.toString();
  } catch {
    return url;
  }
}
