export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Production domain — always use this for OAuth so the redirect URI is
// consistent regardless of which preview URL the browser is currently on.
const PRODUCTION_ORIGIN = "https://www.livingnexus.org";

// Generate login URL at runtime so redirect URI always points to the
// canonical production domain, not a sandbox preview subdomain.
export const getLoginUrl = (returnPath?: string) => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;
  const redirectUri = `${PRODUCTION_ORIGIN}/api/oauth/callback`;
  // Default to current route so every sign-in preserves where the user was.
  // This fixes the 404-after-OAuth bug (Slimdoggy report, 2026-07-21):
  // previously, callsites that didn't pass returnPath lost the originating route.
  const effectiveReturnPath =
    returnPath ??
    (typeof window !== "undefined"
      ? window.location.pathname + window.location.search
      : "/");

  // Always encode as JSON so the server can reliably extract returnPath
  const statePayload = btoa(
    JSON.stringify({ redirectUri, returnPath: effectiveReturnPath })
  );

  const url = new URL(`${oauthPortalUrl}/app-auth`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", statePayload);
  url.searchParams.set("type", "signIn");

  return url.toString();
};
