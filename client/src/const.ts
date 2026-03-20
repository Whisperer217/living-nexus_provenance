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
  // Encode returnPath into state so the server can redirect back after login
  const statePayload = returnPath
    ? btoa(JSON.stringify({ redirectUri, returnPath }))
    : btoa(redirectUri);

  const url = new URL(`${oauthPortalUrl}/app-auth`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", statePayload);
  url.searchParams.set("type", "signIn");

  return url.toString();
};
