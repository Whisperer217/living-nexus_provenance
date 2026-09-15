import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const profilePageSource = readFileSync(
  resolve(process.cwd(), "client/src/pages/ProfilePage.tsx"),
  "utf8"
);

describe("Profile Stripe shortcut contract", () => {
  it("keeps the existing protected Stripe status and onboarding procedures as the sole flow", () => {
    expect(profilePageSource).toContain("trpc.tips.connectStatus.useQuery");
    expect(profilePageSource).toContain("trpc.tips.connectOnboarding.useMutation");
    expect(profilePageSource).toContain("returnUrl: `${window.location.origin}/profile`");
  });

  it("surfaces status-aware owner actions in the profile header", () => {
    expect(profilePageSource).toContain("Get paid · Connect Stripe");
    expect(profilePageSource).toContain("Finish payout setup");
    expect(profilePageSource).toContain("Payouts ready");
    expect(profilePageSource).toContain("Open Stripe Connect setup");
  });

  it("does not add a public payment route or a new Stripe backend surface", () => {
    expect(profilePageSource).not.toContain('href="/stripe"');
    expect(profilePageSource).not.toContain("trpc.stripe.");
    expect(profilePageSource).not.toContain("fetch(\"/api/stripe");
  });
});
