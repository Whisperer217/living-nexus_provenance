import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildCreatorBusinessProfileUrl,
  CANONICAL_PAYOUT_PATH,
  DEFAULT_PAYOUT_ORIGIN,
  resolvePayoutCallbackUrl,
  resolveTrustedPayoutOrigin,
} from "../utils/stripeConnect";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("canonical Creator Payouts contract", () => {
  it("registers one protected payout center and keeps Stripe Connect controls there", () => {
    const app = read("client/src/App.tsx");
    const page = read("client/src/pages/PayoutsPage.tsx");

    expect(app).toContain('const PayoutsPage = lazy(() => import("./pages/PayoutsPage"));');
    expect(app).toContain('path="/settings/payouts" component={PayoutsPage}');
    expect(page).toContain("trpc.tips.connectStatus.useQuery");
    expect(page).toContain("trpc.tips.connectOnboarding.useMutation");
    expect(page).toContain('connectMutation.mutate({ origin: window.location.origin })');
    expect(page).toContain('getLoginUrl("/settings/payouts")');
    expect(page).toContain("Stripe hosts identity, tax, and bank-detail collection");
    expect(page).toContain("Payouts ready");
    expect(page).toContain("disabled={isBusy || isEnabled}");
  });

  it("keeps payout navigation owner-scoped in both active creator-domain settings surfaces", () => {
    const loopCreator = read("client/src/pages/loop/LoopCreatorPage.tsx");
    const domainShell = read("client/src/pages/CreatorDomainShell.tsx");
    const profile = read("client/src/pages/ProfilePage.tsx");
    const contextDrawer = read("client/src/components/layout/ContextDrawer.tsx");

    expect(loopCreator).toContain('href="/settings/payouts"');
    expect(loopCreator).toContain("Creator payouts");
    expect(domainShell).toContain('href: "/settings/payouts"');
    expect(domainShell).toContain("Creator Payouts");
    expect(profile).toContain('href="/settings/payouts"');
    expect(profile).not.toContain("trpc.tips.connectOnboarding.useMutation");
    expect(contextDrawer).toContain('path: "/settings/payouts"');
    expect(contextDrawer).toContain("Connect Stripe and receive gifts");
  });

  it("keeps manual Stripe account identifiers out of generic payment-method settings", () => {
    const paymentMethods = read("client/src/pages/PaymentMethodsPage.tsx");

    expect(paymentMethods).toContain('href="/settings/payouts"');
    expect(paymentMethods).toContain("Stripe Connect payouts");
    expect(paymentMethods).not.toContain("Stripe Connected Account ID");
    expect(paymentMethods).not.toContain('id: "stripe"');
  });

  it("routes historical Dashboard and creator-profile shortcuts into the canonical payout center", () => {
    const dashboard = read("client/src/pages/DashboardPage.tsx");
    const legacyCreatorProfile = read("client/src/pages/CreatorProfilePage.tsx");
    const guideUpload = read("client/src/pages/GuideUploadWizard.tsx");

    expect(dashboard).toContain('window.location.assign("/settings/payouts")');
    expect(dashboard).not.toContain("trpc.tips.connectOnboarding.useMutation");
    expect(legacyCreatorProfile).toContain('href="/settings/payouts"');
    expect(legacyCreatorProfile).not.toContain("trpc.tips.connectOnboarding.useMutation");
    expect(guideUpload).toContain('window.location.assign("/settings/payouts")');
    expect(guideUpload).not.toContain('toast.success("Stripe account connected")');
  });

  it("uses an exact trusted origin and server-owned payout callbacks for hosted onboarding", () => {
    const tips = read("server/routers/tips.ts");

    expect(resolveTrustedPayoutOrigin("https://www.livingnexus.org")).toBe("https://www.livingnexus.org");
    expect(resolveTrustedPayoutOrigin("https://www.livingnexus.org/profile?next=https://evil.example")).toBe(DEFAULT_PAYOUT_ORIGIN);
    expect(resolveTrustedPayoutOrigin("https://evil.example")).toBe(DEFAULT_PAYOUT_ORIGIN);
    expect(resolveTrustedPayoutOrigin("http://www.livingnexus.org")).toBe(DEFAULT_PAYOUT_ORIGIN);
    expect(resolvePayoutCallbackUrl("https://www.livingnexus.org")).toBe(`https://www.livingnexus.org${CANONICAL_PAYOUT_PATH}`);
    expect(buildCreatorBusinessProfileUrl("https://www.livingnexus.org", "A Creator/One", 12)).toBe("https://www.livingnexus.org/creator/A%20Creator%2FOne");

    expect(tips).toContain("resolvePayoutCallbackUrl(input.origin)");
    expect(tips).toContain("refresh_url: payoutCallbackUrl");
    expect(tips).toContain("return_url: payoutCallbackUrl");
    expect(tips).toContain("buildCreatorBusinessProfileUrl");
    expect(tips).not.toContain("input.returnUrl");
  });

  it("keeps the fan-side support gate tied to Stripe live charges readiness", () => {
    const tips = read("server/routers/tips.ts");
    expect(tips).toContain("if (!acct.charges_enabled)");
  });
});
